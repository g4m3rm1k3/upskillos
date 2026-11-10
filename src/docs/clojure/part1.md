# pywebview + DataTables for the Python Developer

### Rebuild your hacked-together tool viewer properly: live data, real filters, regex, and a structure you can maintain

You can already make Python do anything: parse files, build databases, juggle dicts. What's missing is the *other half*: how a browser page works, why JavaScript behaves differently in the DOM than "normal" JavaScript, how DataTables really works, and how to organize an app so it doesn't turn into a pile of hacks again.

This tutorial builds **Tool Viewer**, a rebuild of the app you described:

- A folder of tool databases is parsed and combined into **one cache database**.
- The window opens **instantly** with the cached data, then checks for changed files **in the background** and tells you what it's doing.
- A **DataTables** grid with real filters: search with **regex**, **multi-select dropdowns**, **numeric ranges**, and **rules on the flexible attribute dictionaries** you invented.
- The data is **live**: no more writing JSON into the HTML.

The domain is yours, but the *skeleton* is the point. Chapter 18 shows how to reuse it for your other apps.

---

## Chapter 0: How to use this document

- **Type the code; run it after each step.** Each step ends with a checkpoint saying what you should see.
- **Open the DevTools console (Chapter 3) and use it like a Python REPL.** It is the single best way to learn JavaScript and the DOM.
- Every big idea comes with a Python comparison, and a "what goes wrong" section, because *knowing the failure symptoms* is what lets you maintain code you didn't write.
- At the end of most chapters there is a complete, tested listing to compare against when your version doesn't work.

### What was tested, and what was not (please read)

I built the whole reference project and tested it before writing this. Being specific about what that means:

| Part | How it was tested |
|---|---|
| Python core (parser, manifest, cache, service, API logic) | 13 `pytest` tests, passing |
| JavaScript filter logic (text, regex, dropdowns, ranges, attribute rules) | 25 assertions in plain Node, passing |
| The whole frontend (DataTables grid, filters, column menu, detail panel, export, data reload) | Driven by a script in headless Chromium against **real parsed data** (2,400 rows, and also ~50,000 rows) with a *mocked* `window.pywebview`, on three library combinations: **DataTables 3.1.5**, **DataTables 3.1.5 + jQuery 4.0.0**, and **DataTables 2.3.8 + jQuery 3.7.1**. All passed. At 50,400 rows the first render took about 1.75 s and a text filter responded in about 0.1 s. |
| **The real pywebview window itself** (GUI, devtools, file dialogs, packaging) | **Not run.** The machine I used has no display. I checked the pywebview facts below against its **source code** (version 6.2.1), but I could not open an actual window. |

So: the logic is verified; the glue to the native window follows pywebview's documented behavior and its source, but you are the first to run it for real. Chapter 16 tells you exactly what to check first if something in the window behaves differently from the headless tests. (On Windows pywebview uses Microsoft's Edge **WebView2**, which is Chromium, the same engine family as my test browser.)

### Versions

- **Python 3.10+** (the code uses `X | None` type syntax and `slots=True` dataclasses). Tested on 3.13.
- **pywebview 6.x** (tested against the source of 6.2.1).
- **DataTables 2.x or 3.x.** As of this writing (Nov 2026) the newest is 3.1.5. You probably have **1.x** in your old apps; Chapter 13 has a translation table.
- **jQuery is optional** with DataTables 2+/3. The new code is plain JavaScript, but Chapter 5 teaches jQuery too, because you will meet it in your existing apps.

### Your repo is public

- Never commit real tool databases, company paths, server names, or the generated cache. The project's `.gitignore` already excludes `*.db`, `config.json`, `sample_data/`, and logs.
- Develop against the **generated sample data** (Chapter 7), not the real databases.

---

## Chapter 1: The big picture

### 1.1 What pywebview actually is

A pywebview app is **two programs glued together**:

```
┌───────────────────────── your app (one process) ─────────────────────────┐
│                                                                          │
│   PYTHON WORLD                           BROWSER WORLD                   │
│   (files, SQLite, regex, threads)        (a native window with a         │
│                                           Chromium-based page inside)    │
│   class Api:                                                             │
│       def get_tools(self): ...  ◄── JSON ──►  HTML + CSS + JavaScript    │
│                                           (DOM, DataTables, events)      │
└──────────────────────────────────────────────────────────────────────────┘
```

- On Windows the "browser" is **WebView2** (Edge/Chromium). You write a normal web page.
- Python **cannot touch the DOM** and JavaScript **cannot touch your files or databases**. They can only pass **JSON-shaped data** (dicts, lists, strings, numbers, booleans, null) across a thin bridge.
- JavaScript calls Python like `await window.pywebview.api.get_tools()`. Python pushes into the page with `window.evaluate_js("...")`.

This is why the tutorial treats the bridge as the most important design decision: **keep it thin**.

### 1.2 Why your current approach exists (and why it hurts)

You write the data as JSON and replace a placeholder inside the HTML text. That wasn't a silly idea; it is a workaround for a real browser rule:

> A page opened from disk (`file://...`) is not allowed to `fetch()` other local files, and its `<script type="module">` imports are blocked too.

I verified both in Chromium:

```
Fetch API cannot load file:///.../data.json. URL scheme "file" is not supported.
Access to script at 'file:///.../m.js' from origin 'null' has been blocked by CORS policy
```

So the only way to get data into the page was to bake it into the HTML. The costs: the data is stale the moment it's written, startup waits for a rebuild, and you can't update a page that's already open.

**The fix:** don't send data *with* the page. Let the page **ask Python for it** through the bridge whenever it wants. Then data can be live, and updates can be pushed.

### 1.3 The architecture, in layers

Every file in the project has exactly one job:

```
        BROWSER WORLD                            PYTHON WORLD
┌───────────────────────────┐        ┌────────────────────────────────────────┐
│ index.html, css/app.css   │        │ api.py        thin bridge, JSON only   │
│ js/main.js    wiring      │◄──────►│ service.py    the use-cases ("refresh")│
│ js/filters.js filter logic│  JSON  │ ├─ manifest.py  which files changed?   │
│ js/table.js   DataTables  │        │ ├─ store.py     SQLite cache           │
│ js/bridge.js  talk Python │        │ └─ parsing/     reads YOUR file format │
└───────────────────────────┘        │ models.py     the Tool data class      │
                                     └────────────────────────────────────────┘
```

The rules that keep it maintainable (all of them show up in the code):

| Rule | What it means here |
|---|---|
| **One reason to change per file** | If Mastercam's format changes, only `parsing/` changes. If you want a new filter, only `filters.js` changes. |
| **Pure functions at the core** | `manifest.diff()` and the JS filter predicate take data in and return data out: no files, no DOM. They're the easiest things to test and debug. |
| **The bridge is thin** | `api.py` does no work. It calls the service and wraps the result. |
| **Cache, then refresh** | Show the last known data instantly; check for changes in the background; update when done. (The pattern is called *stale-while-revalidate*.) |
| **One source of truth** | The filters are a single state object. The UI is drawn *from* it; the table asks *it*. |

### 1.4 Your attribute-dictionary idea was good, keep it

You said different tools have different attributes, so you used dicts. That's exactly the right shape:

```python
@dataclass(frozen=True, slots=True)
class Tool:
    tool_id: str
    name: str
    diameter: float | None    # fields EVERY tool has are real attributes
    ...
    attrs: dict[str, Any]     # everything that only SOME tools have lives here
```

- New attributes never require a code change.
- In the cache they're stored as a JSON text column; in the browser they're a plain object (`row.attrs.helix_angle`).
- The UI discovers attribute names from the data itself, so it can offer them as optional columns and as filter rules automatically.

### 1.5 What happens when the app starts

```
window opens
   │
   ├─ JS: ask Python for the status          ──►  Python: folder, how many tools cached
   ├─ JS: ask Python for the cached tools    ──►  Python: read SQLite cache  (fast!)
   ├─ JS: draw the table immediately  ← the user sees data in about a second
   │
   └─ JS: ask Python to "refresh" (returns at once)
              │
              Python (background thread):
                 scan folder  →  compare to manifest  →  re-parse ONLY changed files
                 push "progress" events to the page ("Updating 2/5: Library_03.tooldb")
                 push "done" event
              │
   JS: if something changed, reload from the cache and redraw (filters stay applied)
```

The "you are just sitting there wondering if it's working" problem disappears because the user sees data right away *and* a status line that says what's happening.

### 1.6 The project layout

```
toolviewer/                      (project root)
├─ app.py                        entry point + "composition root" (wires everything together)
├─ requirements.txt
├─ toolviewer/                   the Python package
│  ├─ models.py                  Tool dataclass
│  ├─ config.py                  settings file, logging, data folder
│  ├─ manifest.py                scan folder, diff old vs new
│  ├─ store.py                   SQLite cache
│  ├─ service.py                 refresh logic
│  ├─ api.py                     the bridge to JavaScript
│  └─ parsing/
│     ├─ base.py                 the parser "contract"
│     └─ sample.py               stand-in parser (YOUR real one replaces this)
├─ frontend/
│  ├─ index.html
│  ├─ css/app.css
│  ├─ js/ util.js bridge.js filters.js table.js main.js
│  └─ vendor/                    DataTables files (downloaded, not committed)
├─ tools/make_sample_data.py     makes fake tool databases to develop against
└─ tests/                        test_core.py (pytest), filters.test.js (node)
```

---

## Chapter 2: Setup

### 2.1 Python environment

```bash
mkdir toolviewer && cd toolviewer
python -m venv .venv
.venv\Scripts\activate              # Windows   (macOS/Linux: source .venv/bin/activate)
pip install pywebview pytest
pip show pywebview                  # check the version (6.x)
```

A **virtual environment** (`.venv`) is a private copy of site-packages for this project. Create one per project so versions can't collide. Add `requirements.txt`:

```
pywebview
pytest
```

(Later, `pip freeze` shows exact versions if you want to pin them.)

### 2.2 The WebView2 runtime (Windows)

pywebview on Windows renders with **Edge WebView2**. Windows 11 has it built in. On Windows 10 you may need Microsoft's free *WebView2 Evergreen Runtime*. If the window never appears or you get an error mentioning the web view/edge runtime, that's the first thing to check.

### 2.3 DataTables files

You need two files in `frontend/vendor/`, named **`datatables.min.js`** and **`datatables.min.css`**. Two ways to get them:

**Option A: the download builder** at `datatables.net/download`. Pick the default styling and the latest 2.x/3.x. You don't need any extensions yet. If it offers jQuery, tick it only if you want jQuery for other code. Download the zip, and rename/copy the bundled `.js` and `.css` to the names above.

**Option B: npm** (if you have Node):

```bash
npm install datatables.net datatables.net-dt
copy node_modules\datatables.net\js\dataTables.min.js          frontend\vendor\datatables.min.js
copy node_modules\datatables.net-dt\css\dataTables.dataTables.min.css  frontend\vendor\datatables.min.css
```

(Those are the exact paths in the current packages. They worked for the tests.)

**Why local files instead of a CDN link?** A CDN needs internet at startup; a locally bundled file always works, is fast, and doesn't change under you.

If you want jQuery too (for legacy code), load it **before** DataTables:

```html
<script src="vendor/jquery.min.js"></script>
<script src="vendor/datatables.min.js"></script>
```

### 2.3 `.gitignore`

```
__pycache__/
.venv/
.pytest_cache/
sample_data/
*.db
*.db-wal
*.db-shm
config.json
*.log
dist/
build/
*.spec
node_modules/
frontend/vendor/*.js
frontend/vendor/*.css
```

The last two lines keep third-party files out of your repo (you download them). If you'd rather commit them so a fresh checkout just works, delete those two lines.

---

## Chapter 3: Hello, pywebview (one idea at a time)

These are short experiments, separate from the project. Make a folder `hello/` for them.

> I verified every behavior below against pywebview's source, but I could not open a real window on my machine. If something differs on yours, trust your window and tell me.

### Step 1: A window from a string

```python
# hello/step1.py
import webview

webview.create_window("Hello", html="<h1>Hello from Python</h1>")
webview.start()
```

Run it: `python hello/step1.py`. A native window appears showing the heading. `create_window` *describes* a window; `start()` opens it and **blocks until all windows are closed**. (Anything after `start()` runs when the app quits.)

### Step 2: A window from a file

Create `hello/index.html`:

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Hello</title></head>
<body>
  <h1>Hello from a file</h1>
  <p id="out">waiting…</p>
</body>
</html>
```

and `hello/step2.py`:

```python
from pathlib import Path
import webview

index = Path(__file__).parent / "index.html"     # absolute path, no matter where you run from

webview.create_window("Hello", str(index), width=900, height=600, text_select=True)
webview.start(debug=True)
```

Two things to understand:

- **Use a path built from `__file__`.** A relative path like `"index.html"` depends on the *current working directory*, so it works when you run from one folder and breaks from another. `Path(__file__).parent` is "the folder this script lives in". (Python's `__file__`: the same thing you already know.)
- **`text_select=True`.** pywebview **disables text selection by default** (so the page feels like an app). In a data viewer you absolutely want users to select and copy text, so turn it on. I checked: the default really is `False`.

### Step 3: DevTools: your JavaScript REPL

`debug=True` enables the browser developer tools. Right-click anywhere in the window and choose **Inspect** (or try F12). A panel opens with tabs:

| Tab | Use |
|---|---|
| **Console** | Type JavaScript and run it live, like `python -i`. Errors from your code appear here. |
| **Elements** | The *live* page structure and the CSS applied to each element. |
| **Network** | Requests (mostly empty in our app, but handy for APIs later). |
| **Sources** | Your JS files; set breakpoints and step through, like `pdb`. |

Try in the **Console**:

```js
document.title                               // 'Hello'
document.getElementById('out').textContent = 'I changed this from the console'
document.body.style.background = 'lightyellow'
```

Watch the page change instantly. **Everything you learn in Chapters 4 and 5 can be tried here first.** When a layout looks wrong, the Elements tab shows why (Chapter 6).

Reloading the page (Ctrl+R) usually reloads your HTML/JS/CSS **without restarting Python**, which makes frontend work quick.

Set `debug=False` (or remove it) for the version you give to others.

### Step 4: JavaScript calls Python

```python
# hello/step4.py
from pathlib import Path
import webview


class Api:
    def greet(self, name):
        print(f"JS called greet({name!r})")       # appears in your terminal
        return f"Hello, {name}!"


index = Path(__file__).parent / "step4.html"
webview.create_window("Hello", str(index), js_api=Api())
webview.start(debug=True)
```

```html
<!-- hello/step4.html -->
<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
  <button id="go">Greet</button>
  <p id="out"></p>

  <script>
    document.getElementById('go').addEventListener('click', async () => {
      const text = await window.pywebview.api.greet('Michael');
      document.getElementById('out').textContent = text;
    });
  </script>
</body></html>
```

Click the button: the page shows "Hello, Michael!" and your terminal shows the print.

How it works:

- `js_api=Api()` hands pywebview an object. **Every public method** (no leading underscore) becomes `window.pywebview.api.<method>(...)`.
- JS calls return a **Promise** (JS's version of an awaitable). `await` gives you the return value.
- Arguments and return values are converted to/from **JSON**.

### Step 5: Timing: when does `window.pywebview.api` exist?

Not immediately. pywebview injects it a moment after the page loads, then fires a `pywebviewready` event on `window`. If your script runs earlier, `window.pywebview` is `undefined`:

```js
window.addEventListener('pywebviewready', () => {
  console.log('api is ready:', Object.keys(window.pywebview.api));
});
```

The safe pattern, which the project's `bridge.js` uses, handles *both* orders (script ran before the event, or after):

```js
function whenReady() {
  return new Promise((resolve) => {
    if (window.pywebview && window.pywebview.api) resolve();        // already there
    else window.addEventListener('pywebviewready', () => resolve(), { once: true });
  });
}
```

### Step 6: What can cross the bridge

Pywebview converts return values with the standard `json.dumps`. I read the code: it's a plain `json.dumps(result)`, nothing fancy. So:

| Python value | Arrives in JS as | Notes |
|---|---|---|
| `dict`, `list`, `str`, `int`, `float`, `bool`, `None` | object, array, string, number, boolean, `null` | ✓ |
| `tuple` | array | ✓ (tuples become lists) |
| `set`, `datetime`, `Path`, `Decimal`, dataclass instance, `sqlite3.Row` | **error** | convert first: `sorted(s)`, `dt.isoformat()`, `str(path)`, `asdict(obj)`, `dict(row)` |

When Python raises (including "not JSON serializable"), pywebview logs the traceback in your terminal and the JavaScript `await` **throws** an error with the Python message. That's why every `await` on an API call should be inside a `try/catch` (the project does this in one place).

Also verified in the source: **each API call runs in its own thread**, so a slow call doesn't freeze the window, but two calls *can run at the same time*. That's why the project opens a **new SQLite connection per call** and uses a **lock** around refresh (Chapters 9 and 10).

### Step 7: Python calls JavaScript

```python
# hello/step7.py
import json
import time
from pathlib import Path
import webview

window = webview.create_window("Clock", str(Path(__file__).parent / "step7.html"))


def tick():
    while webview.windows:                            # stops when the window closes
        text = time.strftime("%H:%M:%S")
        window.evaluate_js(f"document.getElementById('clock').textContent = {json.dumps(text)}")
        time.sleep(1)


webview.start(tick, debug=True)       # tick runs in its own thread once the window is up
```

```html
<!-- hello/step7.html -->
<!doctype html><html><body><h1 id="clock">--:--:--</h1></body></html>
```

- `window.evaluate_js("...")` runs a JavaScript string in the page.
- **Always build the argument with `json.dumps`.** It turns a Python value into a valid JavaScript literal (quotes escaped), so text containing `'` or `"` can't break (or inject into) your script.
- `webview.start(func)` runs `func` in a separate thread after the window is ready. That is where background work starts.
- Use this pattern for **events**: the project pushes `refresh-progress` events this way (Chapter 11).

### Step 8: Why not just open a JSON file from JavaScript?

Try it. In `step4.html`'s script add `fetch('data.json')` and look at the console: it fails with *URL scheme "file" is not supported*, exactly as in Chapter 1. This is the reason for the bridge.

### Step 9: Keep private things private

Look at what pywebview does when you give it a `js_api` object. I read `webview/util.py`:

- It lists the object's attributes and **skips any starting with `_`**.
- For attributes that are objects (not functions), it **walks into them recursively** looking for methods to expose.

So a `self.connection = sqlite3.connect(...)` or `self.service = ToolService(...)` stored as a **public** attribute would get inspected too (slow, and a source of mystery errors). The rule used all through the project:

```python
class Api:
    def __init__(self, service):
        self._service = service          # leading underscore: pywebview ignores it
```

### Exercises (Chapter 3)

1. In `step4`, make `greet` take two arguments (`first`, `last`) and call it with both.
2. Make `greet` return `{"ok": True, "data": ...}` and have the JS show `.data`. (This is the "envelope" pattern from Chapter 11.)
3. Return `datetime.now()` from a method and read the error in your terminal *and* the JS console. Fix it with `.isoformat()`.
4. In the Console, type `window.pywebview.api` and expand it. What methods does it list? Add an underscore-prefixed method to `Api` and confirm it's not there.
5. Make the clock page also show a button that calls `Api.stop()`, which closes the window with `webview.windows[0].destroy()`.

---

