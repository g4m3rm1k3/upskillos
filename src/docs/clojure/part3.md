## Chapter 7: The data model and sample data

Start with the **shape of your data**, because every other layer depends on it. Your old app invented a good idea: *common columns are fixed, odd attributes live in a dict.* We keep it and name it.

### Step 1: A `Tool` dataclass

In Python you'd pass dicts everywhere. That works until you misspell a key at 3 PM and get a `KeyError` three layers away. A **dataclass** is a dict with a *fixed list of field names*, so mistakes show up immediately and your editor autocompletes.

```python
# toolviewer/models.py  (first draft)
from dataclasses import dataclass

@dataclass
class Tool:
    source: str
    tool_id: str
    name: str
```

Try it in a Python prompt:

```python
>>> t = Tool(source="A.tooldb", tool_id="1", name="Drill")
>>> t.name
'Drill'
>>> Tool(source="A", tool_id="1", nme="oops")      # TypeError: unexpected keyword 'nme'
```

### Step 2: Optional fields and defaults

Not every tool has a diameter (a probe, say). `float | None` means "a float, or `None`". Fields with defaults must come after fields without.

```python
    tool_type: str = ""
    diameter: float | None = None
    flutes: int | None = None
```

### Step 3: The flexible part: `attrs`

Different tool types have different attributes (a tap has a thread pitch, a mill has a helix angle). We don't want 80 mostly-empty columns, and we don't want a code change whenever Mastercam adds one. So:

```python
from dataclasses import field
    attrs: dict[str, Any] = field(default_factory=dict)
```

**Why `field(default_factory=dict)` and not `= {}`?** A default `{}` would be *one dict shared by every Tool* (the same mutable-default trap as a Python function argument `def f(x={})`). `default_factory` makes a fresh dict per object. (Dataclasses actually refuse `= {}` with an error to protect you.)

### Step 4: Freeze it

`@dataclass(frozen=True, slots=True)`:

- `frozen=True`: fields can't be reassigned after creation. A parsed tool is a *fact*; nothing downstream should quietly edit it.
- `slots=True`: slightly less memory, and typos like `t.diamter = 1` raise instead of creating a new attribute. (Needs Python 3.10+.)

### Complete listing: `toolviewer/models.py`

```python
@@INCLUDE:toolviewer/models.py@@
```

`from __future__ import annotations` just lets the type hints be evaluated lazily (so `float | None` is fine in older annotation contexts).

**Checkpoint:** `python -c "from toolviewer.models import Tool; print(Tool('a','1','x'))"` prints `Tool(source='a', tool_id='1', name='x', tool_type='', diameter=None, ...)`.

### Step 5: Fake databases to develop against

Your repo is public and the real databases are not. A **sample-data generator** lets you (and anyone) run the app, and gives you the repeatable test data every real project needs. It writes small SQLite files with two tables: `tools` (fixed columns) and `tool_attributes` (key/value rows, one per attribute). That key/value layout mimics "different tools have different attributes."

Key ideas in the script (listing below):

- `random.Random(seed)`: a *seeded* generator, so the same seed gives the same data. Reproducible data makes bugs reproducible.
- Each tool gets a random subset of attributes depending on its type.
- Values are written as **text** (`'35'`, `'TiN'`), like real-world messy files. The parser must turn `'35'` back into the number `35` (Chapter 8).

```python
@@INCLUDE:tools/make_sample_data.py@@
```

Run it:

```
python tools/make_sample_data.py sample_data 6 400
```

That makes 6 files of 400 tools each in `sample_data/`. Open one with any SQLite viewer (DB Browser for SQLite is free) and look at the two tables.

### Step 6: `config.py`: where settings and the cache live

Your old app probably kept things next to the script. A *program* should keep per-user data in the user's app-data folder (`%APPDATA%\ToolViewer` on Windows), because the install folder may be read-only, and a packaged `.exe` unpacks into a temp folder that disappears.

```python
@@INCLUDE:toolviewer/config.py@@
```

Read it piece by piece:

- `app_data_dir()` builds the folder path from the `APPDATA` environment variable (the fallback only matters if you develop on Linux/Mac) and creates it. `parents=True, exist_ok=True` = "mkdir -p".
- `Config` is a small dataclass of settings. `load()` reads JSON and **ignores unknown keys** (`known = {...}`) so an old settings file with extra keys, or a new version with fewer keys, never crashes the app. If the file is missing or broken, you get defaults.
- `save()` writes it back. `asdict(self)` turns a dataclass into a dict.
- `setup_logging()` sends log messages to a **rotating file** (max 500 KB, 3 old copies). When the app misbehaves on someone's machine, `toolviewer.log` is how you find out why. A GUI app has no console to `print` to, so **log, don't print**.

### Exercises (Chapter 7)

1. Add a `holder: str = ""` field to `Tool`. Which other files must change? (Run the tests; the failures tell you. Spoiler: the parser, the store schema, and the table columns. This list is the "cost of a new fixed column", and it's why odd attributes belong in `attrs`.)
2. Try to mutate a frozen tool: `t.name = "x"`. Read the error.
3. Change the sample generator to add a new attribute `"coolant_through": "yes"` to drills. Regenerate and see it in the app later with no code changes. That's the point of `attrs`.

---

## Chapter 8: Parsing behind a seam, and detecting changes

### 8.1 The seam: the app must not know your file format

Your real databases are Mastercam tool files. The *rest of the app* shouldn't care. It only needs "give me a list of `Tool` from this file." We state that contract with a `Protocol` (a promise about what methods an object has, with no inheritance needed):

```python
@@INCLUDE:toolviewer/parsing/base.py@@
```

Anything with a `parse(self, path) -> list[Tool]` method **is** a `ToolDbParser`. The service (Chapter 10) accepts a `ToolDbParser`, and doesn't care which one. That means:

- You develop and test with `SampleSqliteParser` today.
- You write `MastercamParser` in its own file, change **one line** in `app.py`, and nothing else is touched.
- Tests can pass a fake parser that returns three tools or raises an exception.

Python analogy: duck typing, but written down so your editor and future-you know the rule.

### 8.2 The sample parser, step by step

**Step 1: open the source database read-only.** The source files belong to somebody else (or to Mastercam). Never modify them.

```python
uri = f"{path.resolve().as_uri()}?mode=ro"
conn = sqlite3.connect(uri, uri=True)
```

`as_uri()` turns `C:\dbs\a.tooldb` into `file:///C:/dbs/a.tooldb`, which also handles spaces and odd characters. `?mode=ro` opens it read-only. `uri=True` tells sqlite to interpret the string that way.

**Step 2: close the connection for sure.** `sqlite3.connect()` used as `with conn:` does *not* close it (it only commits/rolls back), and an open handle on Windows can lock a file. So we wrap it in `contextlib.closing`:

```python
with closing(sqlite3.connect(uri, uri=True)) as conn:
    ...
```

**Step 3: read attributes first, into a dict of dicts.**

```python
attrs_by_tool: dict[str, dict[str, Any]] = {}
for row in conn.execute("SELECT tool_id, key, value FROM tool_attributes"):
    attrs_by_tool.setdefault(row["tool_id"], {})[row["key"]] = coerce(row["value"])
```

`setdefault(k, {})` returns the existing inner dict or inserts and returns a new one. This turns many key/value rows into `{"1": {"coating": "TiN", "helix_angle": 35}, ...}`. This is your "dicts for attributes" idea.

**Step 4: coerce text to numbers.** Source data stores everything as text. If `helix_angle` stays `'35'`, then sorting is alphabetical (`'100' < '35'`) and range filters misbehave. `coerce()` tries `int`, then `float`, else keeps the text.

```python
coerce("3")    # 3
coerce("2.5")  # 2.5
coerce("TiN")  # 'TiN'
```

(Limitation worth knowing: a part number like `"007"` would become `7`. If an attribute must stay text, special-case it by name.)

**Step 5: build `Tool` objects**, using `row["x"] or ""` to turn `NULL` into an empty string for text fields, and leaving numbers as `None` when missing.

```python
@@INCLUDE:toolviewer/parsing/sample.py@@
```

> **Where your real parser goes:** a new file `toolviewer/parsing/mastercam.py` with a class that has `parse(self, path) -> list[Tool]`. Put *all* knowledge of the Mastercam schema there: table names, which columns are fixed, which become `attrs`. If the file is XML or a proprietary format, same contract. Keep it **pure** (path in, tools out, no GUI, no global state), so you can test it with a small sample file and a normal `assert`.

### 8.3 Change detection: the manifest

Your old app kept "a list of all the databases and their times," built it in memory, compared, and rebuilt on change. Good instinct. Here it is as small pure functions, with the list stored in the cache so it survives restarts.

**The idea:** a file's identity is its **path**; its *version* is `(modified time, size)`. If either differs from last time, the file changed. We never open the files to decide that, so scanning 100 files takes milliseconds.

**Step 1: a stamp is a small immutable record.**

```python
@dataclass(frozen=True, slots=True)
class FileStamp:
    path: str
    mtime_ns: int      # modified time in nanoseconds (an integer: no float rounding issues)
    size: int
```

**Step 2: `scan()` stats each file.** `p.stat()` reads metadata only.

```python
for p in sorted(folder.glob(pattern)):
    if p.is_file():
        st = p.stat()
        stamps[str(p)] = FileStamp(str(p), st.st_mtime_ns, st.st_size)
```

**Step 3: `diff(old, new)` compares two dicts of stamps.** Dataclass equality compares every field, so `old[path] != stamp` is "mtime or size changed."

```python
@@INCLUDE:toolviewer/manifest.py@@
```

**Why pure functions matter:** `diff` takes two dicts and returns a result. No files, no database, no window. So the test is five lines with made-up stamps (see `tests/test_core.py`), and when change detection acts strangely you can reproduce it in a Python prompt in seconds.

Limitations, honestly:

- If a tool saves a file and then restores the *old* modified time with the *same* size, you won't notice. That's rare; `Shift + Rescan` (force) covers it.
- Network drives sometimes report timestamps at coarse resolution (like 2 seconds). Changes within that window and the same size can be missed.
- A file being written *while* you scan can be half-complete. The parser raises, the service records a failure for that file, and the next scan retries (Chapter 10).

### Exercises (Chapter 8)

1. Write the `MastercamParser` skeleton: a class with `parse()` that returns one hard-coded `Tool`. Swap it in `app.py` and confirm the app shows it.
2. In a Python prompt, `diff` two hand-made dicts where one file was *renamed*. What do you get? (One removed, one added, which is right.)
3. Add a content `hash` to `FileStamp` (hash only when mtime/size changed, to stay cheap). What new case does it catch, and what does it cost?
4. Make `coerce` keep any string with a leading zero as text.

---

## Chapter 9: The cache: one SQLite database for everything

### 9.1 Why a cache at all

Parsing 100 source databases on every launch is what made your old app "sit there wondering if it's working." The fix is the classic one:

> **Parse once, store the result, show the stored result immediately, and only re-parse what changed.**

The cache is *derived data*: you can delete it at any time and the app rebuilds it. That is a **good design test**: if deleting a file loses nothing irreplaceable, it's a cache; if it loses user work, it's a real database and needs backups and migrations.

### 9.2 The schema

Two tables:

```sql
CREATE TABLE sources (                 -- one row per source database file (this IS the manifest)
    path TEXT PRIMARY KEY, mtime_ns INTEGER NOT NULL, size INTEGER NOT NULL,
    parsed_at TEXT NOT NULL, tool_count INTEGER NOT NULL
);
CREATE TABLE tools (                   -- one row per tool, from every source
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL, source TEXT NOT NULL, tool_id TEXT NOT NULL, name TEXT NOT NULL,
    tool_type TEXT NOT NULL DEFAULT '', diameter REAL, flutes INTEGER,
    material TEXT NOT NULL DEFAULT '', vendor TEXT NOT NULL DEFAULT '',
    attrs TEXT NOT NULL DEFAULT '{}'    -- the attribute dict, stored as JSON text
);
```

Design decisions, explained:

- **`attrs` as a JSON text column** rather than a third key/value table. We never query *inside* it in SQL (the browser filters), so one JSON blob per tool is simplest and fastest to read back. If you someday need SQL queries on attributes, SQLite has JSON functions (`json_extract`) or you can add the key/value table then.
- **`id INTEGER PRIMARY KEY AUTOINCREMENT`** gives every row a unique number. DataTables uses it as `rowId`, and `tool_id` alone isn't unique across databases (two files can both contain tool `00001`).
- **`source_path`** (full path) vs **`source`** (file name): the path identifies the file for syncing; the name is what the user sees.
- **The index** on `source_path` makes "delete all tools from file X" fast.

### 9.3 Connections: a new one per call

```python
def _connect(self) -> sqlite3.Connection:
    conn = sqlite3.connect(self._path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn
```

- A sqlite3 connection **must be used on the thread that created it** (Python raises `ProgrammingError: SQLite objects created in a thread can only be used in that same thread`). pywebview calls your API from **different threads**, and the refresh runs on a background thread. So we open a short-lived connection each call. They're cheap.
- `row_factory = sqlite3.Row` lets you read `row["name"]` instead of `row[1]`.
- `WAL` (write-ahead logging) lets one connection **read while another writes**, which is exactly what happens when the UI loads tools while a refresh is storing new ones. (It's a persistent setting on the file; repeating it is harmless.)

### 9.4 Transactions: `with conn` and `closing`

```python
with closing(self._connect()) as conn, conn:
    conn.execute(...)
```

Two different context managers, two different jobs:

| | does |
|---|---|
| `closing(conn)` | **closes** the connection at the end |
| `conn` (used in `with`) | **commits** if the block succeeds, **rolls back** if it raises. It does *not* close. |

So this single line means: "do all this as one all-or-nothing transaction, then close." It is the sqlite3 idiom worth memorizing.

### 9.5 `replace_source`: the heart of incremental refresh

When one source file changes, we throw away *all* of its tools and insert the new ones, **in one transaction**:

```python
conn.execute("DELETE FROM tools WHERE source_path = ?", (stamp.path,))
conn.executemany("INSERT INTO tools (...) VALUES (?,?,...)", [ (...) for t in tools ])
conn.execute("INSERT INTO sources (...) VALUES (...) ON CONFLICT(path) DO UPDATE SET ...")
```

Why replace instead of diffing individual tools? It's simple and correct. A source file might be a few thousand rows; deleting and inserting that is milliseconds. (Complexity you don't need is a bug farm.)

Why a transaction? If the app is killed halfway, you'd otherwise have a source with *half* its tools but an *updated* timestamp, and the next scan would think it's current. With one transaction the cache shows either the old complete data or the new complete data, never a mix.

- `?` placeholders (**never** build SQL with f-strings; that's how SQL injection and quoting bugs happen). Values go in a tuple.
- `executemany` runs one statement for many rows: much faster than a Python loop of `execute`.
- `ON CONFLICT(path) DO UPDATE SET ...` is an **upsert**: insert, or update if the key exists.
- `json.dumps(t.attrs)` turns the dict into text. **Reading back** (`all_tools`) does `json.loads`.

### 9.6 Reading: returning plain data

`all_tools()` returns a **list of plain dicts**, because that's what crosses the bridge as JSON. Remember from Chapter 3: `sqlite3.Row` objects can't be serialized, so `dict(r)` converts. Then we turn the `attrs` text back into a dict.

### Complete listing: `toolviewer/store.py`

```python
@@INCLUDE:toolviewer/store.py@@
```

### Try it in a Python prompt

```python
>>> from pathlib import Path
>>> from toolviewer.store import ToolStore
>>> s = ToolStore(Path("scratch.db")); s.initialize()
>>> s.summary()
{'sources': 0, 'tools': 0, 'last_parsed': None}
```

Open `scratch.db` in DB Browser for SQLite and look at the tables.

### Exercises (Chapter 9)

1. Add a `ToolStore.get_tool(id)` returning one dict (or `None`).
2. Query the cache directly: "how many tools per source?" with `GROUP BY source`. Add it as `counts_by_source()`.
3. Add a `schema_version` using `PRAGMA user_version`; if it doesn't match your constant, drop the tables and recreate. (Because it's just a cache, "delete and rebuild" **is** your migration strategy. Compare with Entity Framework migrations in the C# tutorial. This is far simpler, and it's a legitimate benefit of cache-vs-database.)
4. Kill the app mid-refresh (`Ctrl+C` while it's updating). Reopen. Is the cache consistent? Why?

---

## Chapter 10: The service: the refresh algorithm

The **service** holds the *use-cases* of the app, the "things a user can do," written without any knowledge of windows or JavaScript. It combines the three layers you just built: scan (manifest), parse (parser), store.

### 10.1 Dependency injection, the Python way

```python
class ToolService:
    def __init__(self, store: ToolStore, parser: ToolDbParser, config: Config):
        self._store = store
        self._parser = parser
        self.config = config
        self._lock = threading.Lock()
```

The service **receives** its collaborators instead of creating them. That's "dependency injection": a fancy name for "pass things in through `__init__`." Result: a test passes a temp-folder store and a fake parser, and production passes the real ones. `app.py` is the only place that creates concrete objects (the *composition root*).

### 10.2 The algorithm, one decision at a time

```python
current = manifest.scan(folder, self.config.pattern)    # what is on disk now
stored  = self._store.get_manifest()                     # what the cache knows
d = manifest.diff({} if force else stored, current)      # what changed
d.removed = [p for p in stored if p not in current]      # ...and what is gone
```

- `force` means "pretend the cache is empty," so everything counts as *added* and is re-parsed. **But** a forced diff would never report files deleted from disk (they're not in `current` *and* not in the pretend-empty `{}`), so the next line recomputes `removed` against the *real* stored manifest. (This was a real bug I found while testing; there's a test for it: `test_force_rebuilds_but_still_removes`.)

```python
for i, path in enumerate(todo, start=1):
    if on_progress: on_progress(i, len(todo), Path(path).name)
    try:
        tools = self._parser.parse(Path(path))
        self._store.replace_source(current[path], tools)
    except Exception:
        log.exception("Failed to parse %s", path)
        result.failed.append(Path(path).name)
```

- **Per-file error isolation.** One corrupt or half-written database must not abort the other 99. A broad `except Exception` is normally a smell, but here it is the *boundary* where we decide "skip this file, record it, keep going." `log.exception` writes the full traceback to the log file.
- Because a failed file is **not** recorded in `sources`, the next scan sees it as new/changed again and retries automatically.
- **`on_progress`** is a callback: the service doesn't know what the progress is *for*. The API layer passes a function that pushes it to the window. The service stays testable and UI-free.

### 10.3 Don't run two refreshes at once

The user presses Rescan twice, or a refresh at startup overlaps with a manual one:

```python
if not self._lock.acquire(blocking=False):
    raise RefreshBusy()
try:
    return self._refresh(...)
finally:
    self._lock.release()
```

`acquire(blocking=False)` returns immediately with `False` if someone holds the lock, so we reject the second request instead of queueing it. `try/finally` guarantees release even when the refresh crashes. (Forgetting the `finally` is how you get a "Rescan does nothing, ever again" bug.)

### 10.4 The result object

`RefreshResult` is a small dataclass counting `added/changed/removed`, listing `failed`, and giving `tool_count`. `data_changed` is a *property*: the front-end uses it to decide whether it needs to reload the table at all. If nothing changed, **don't** redraw; that's the difference between a refresh the user notices and one they don't.

### Complete listing: `toolviewer/service.py`

```python
@@INCLUDE:toolviewer/service.py@@
```

### 10.5 Tests: how you know it works (and how you'll know after the next change)

Here is how the tests exercise this. Read them as examples of "test the behavior, not the implementation":

```python
@@INCLUDE:tests/test_core.py@@
```

Run them: `pytest -q`. A test that names a behavior (`test_second_refresh_is_a_noop`, `test_bad_file_is_reported_not_fatal`) is **documentation that can't go stale**. When you or an agent changes the code in six months, those names say what must still be true.

### Exercises (Chapter 10)

1. Add `ToolService.tools_for_source(name)` and a test for it.
2. Make the parse step run in a `ThreadPoolExecutor` (4 workers). What must you be careful about? (Each worker needs its own sqlite connection, which `_connect()` already guarantees; the `on_progress` counter and `result` counters need care. Measure whether it even helps: SQLite parsing is often disk-bound.)
3. Break the parser on purpose (make it raise for one file). Confirm the other files still load and `failed` names the bad one.
4. Add a `last_error` to `RefreshResult` for the failed files' messages. Show them in the UI later.

---

## Chapter 11: The API: the thin bridge to JavaScript

### 11.1 What "thin" means

`Api` is the **only** object JavaScript can call. Its job is *translation*, not logic:

- take JSON-ish arguments,
- call the service,
- wrap the result in an **envelope**,
- never leak an exception to the page raw,
- push events back.

All real decisions live in the service. If you find an `if` about *tools* in `api.py`, it belongs in the service.

### 11.2 The envelope: `{ok, data | error}`

Recall (Chapter 3): when a Python API method raises, the JavaScript promise **rejects** with a message that has lost most of the useful detail. A uniform envelope is friendlier:

```python
{"ok": True,  "data": ...}
{"ok": False, "error": "FileNotFoundError: Tool folder not found: 'D:\\x'"}
```

The single helper that makes this consistent:

```python
@staticmethod
def _guard(fn, *args):
    try:
        return {"ok": True, "data": fn(*args)}
    except Exception as exc:
        log.exception("API call failed: %s", getattr(fn, "__name__", fn))
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
```

`bridge.js` `call()` unwraps it and throws a normal JS `Error` for `ok:false`, so the JavaScript side can use plain `try/catch` (Chapter 12).

### 11.3 Return only JSON-friendly values

Allowed across the bridge: `dict`, `list`, `str`, `int`, `float`, `bool`, `None`. **Not** allowed: `set`, `tuple` (becomes a list, fine), `datetime`, `Path`, `Decimal`, dataclass instances, `sqlite3.Row`. That's why the store returns dicts, `RefreshResult.to_dict()` exists, and timestamps are stored as ISO strings.

### 11.4 Private state starts with `_`

pywebview walks your `Api` object and exposes public attributes, *recursing into nested objects*. It skips names starting with `_`. So `self._service` (an object with locks and SQLite paths) stays hidden. Without the underscores, pywebview can choke while trying to introspect internals.

### 11.5 Long jobs: return immediately, report by events

`refresh()` **starts a thread and returns at once**, so the page never waits, and then reports progress with events:

```python
def refresh(self, force: bool = False) -> dict:
    def start():
        threading.Thread(target=self._run_refresh, args=(force,), daemon=True).start()
        return {"started": True}
    return self._guard(start)
```

`daemon=True` means the thread won't keep the program alive if the window closes mid-refresh.

`_run_refresh` emits `refresh-started`, then `refresh-progress` for each file, then `refresh-done` (with the result dict) or `refresh-busy` / `refresh-error`. The page listens for those names (Chapter 12/15).

**The push mechanism:**

```python
script = f"App.onEvent({json.dumps(name)}, {json.dumps(payload)})"
webview.windows[0].evaluate_js(script)
```

`json.dumps` is not optional: it produces a *valid JavaScript literal* for the name and payload, quotes escaped. (`App.onEvent("refresh-progress", {"done": 3, "total": 12, "name": "Mills.tooldb"})`.) A name containing a quote can't break out of the string.

**Why `import webview` is *inside* the function:** so the module can be imported (and tested) on a machine with no GUI, and so the `emit` function can be swapped in tests:

```python
def __init__(self, service, config_path, emit=_emit_to_window):
```

The test passes `emit=lambda n, p: events.append((n, p))`, then asserts the event sequence, no window needed. That one trick (*a default argument that production uses and tests replace*) is the simplest dependency injection there is.

### 11.6 Native dialogs

`choose_folder` and `export_csv` call `create_file_dialog`. Facts verified in pywebview 6.2.1's source:

- Use **`webview.FileDialog.FOLDER`**, `.OPEN`, `.SAVE` (the older `webview.FOLDER_DIALOG` constants are deprecated).
- The folder/open dialog returns a **tuple/list of paths, or `None` if cancelled**. `picked[0]` is the folder.
- The save dialog's return type has varied by platform/version, so the code handles both a string and a sequence: `target if isinstance(target, str) else target[0]`.
- Writing the CSV with `encoding="utf-8-sig"` adds a byte-order mark so **Excel opens it with the right characters**; `newline=""` stops blank lines between rows on Windows.
- The *page* builds the CSV rows (it knows the visible columns, current filter and sort), and Python just writes them. That avoids re-implementing the filter logic in Python.

### Complete listing: `toolviewer/api.py`

```python
@@INCLUDE:toolviewer/api.py@@
```

### 11.7 `app.py`: the composition root

Finally the one file that knows everything. Read it as a recipe:

1. find/create the data folder, start logging,
2. load config,
3. create the **store** and initialize it,
4. create the **service** with the **sample parser** (`# swap in YOUR parser here`),
5. create the **API**,
6. open the window with `js_api=api`,
7. `webview.start()` (blocks until the window closes).

```python
@@INCLUDE:app.py@@
```

Notes:

- `resource_path()` is for later: a PyInstaller-built exe unpacks files into a temp dir held in `sys._MEIPASS`. Using this helper from day one means packaging doesn't force changes (Chapter 17).
- `DEBUG = True` makes pywebview allow DevTools (right-click → Inspect). Turn it off for releases.
- `text_select=True`: pywebview disables text selection by default (verified in the source). For a data viewer you want to copy cell text.
- The window is given a **file path** to `index.html`. In Chapter 1 you saw why that works for loading, but not for `fetch`.

**Checkpoint (the first full run!):**

```
python tools/make_sample_data.py sample_data 6 400
python app.py
```

You should see a window, a (so far unstyled/empty) page. Even before the frontend exists you can verify the Python half from the DevTools console:

```js
await pywebview.api.get_status()
await pywebview.api.choose_folder()     // pick sample_data
pywebview.api.refresh(false)            // returns immediately; events arrive later
await pywebview.api.get_status()        // sources: 6, tools: 2400
(await pywebview.api.get_tools()).data.length
```

> This is the **most valuable debugging habit** in the whole architecture: because the Python API is a plain object, you can exercise every feature from the console *without any UI*. If it works there and the page is wrong, the bug is in JavaScript; if it doesn't, the bug is in Python.

### Exercises (Chapter 11)

1. Add `get_log_tail(lines=50)` that returns the last lines of `toolviewer.log` through the envelope. Call it from the console.
2. Add a `get_sources()` API (path, tool_count, parsed_at) for a future "Databases" panel.
3. Raise an exception deliberately inside `get_status`. Compare the envelope result with what JS sees if you *don't* use `_guard`.
4. Emit an event from `get_tools` with a payload containing a `set`. What error do you get, and where? Fix with `list()`.

---

