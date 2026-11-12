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

## Chapter 4: JavaScript for Python developers

Open your pywebview window's **Console** (Chapter 3, Step 3), or any browser's console, and **type everything here**. Each snippet is one-liner-friendly. The console prints the value of the last expression, like a Python REPL.

### 4.1 Variables and the basics

```js
let count = 3;            // a variable you can reassign
const name = 'Ada';       // can't be reassigned (the object it holds CAN still change)
count = count + 1;        // fine
// name = 'Bob';          // TypeError: Assignment to constant variable.
```

- Prefer **`const`** by default, `let` when you need to reassign. **Never use `var`** in new code (old scoping rules; you'll see it in old apps).
- Statements end with `;` (technically optional, but use them).
- Blocks use `{ }`, not indentation.
- Comments: `// like this` and `/* like this */`.
- There is no `self`/`cls`. A function's context is called `this` (section 4.9).

### 4.2 Types

| Python | JavaScript | Notes |
|---|---|---|
| `int`, `float` | `number` | **Only one number type**: always a 64-bit float. `0.1 + 0.2` gives `0.30000000000000004`, same as Python floats. |
| `str` | `string` | Immutable; single or double quotes are identical; backticks make template strings. |
| `bool` (`True`/`False`) | `boolean` (`true`/`false`) | Lowercase! |
| `None` | **`null`** *and* **`undefined`** | Two "nothing" values (see below). |
| `list` | `Array` | |
| `dict` | `Object` (or `Map`) | |
| `set` | `Set` | |
| `tuple` | no equivalent | Use an array. |

`typeof` tells you the type (like `type()`):

```js
typeof 5           // 'number'
typeof 'x'         // 'string'
typeof [1,2]       // 'object'      (arrays are objects; use Array.isArray(x))
typeof null        // 'object'      (a historical bug in the language; null is NOT an object)
typeof undefined   // 'undefined'
```

**`null` vs `undefined`:** `undefined` means "nothing was ever set": a missing object key, a function with no `return`, a variable declared without a value. `null` means "deliberately empty". JSON from Python's `None` arrives as `null`. In practice: *a missing dict key gives `undefined`, not an error.*

```js
const tool = { name: 'Drill' };
tool.diameter            // undefined   (Python would raise KeyError)
tool.diameter.toFixed(2) // TypeError: Cannot read properties of undefined (reading 'toFixed')
```

That last error message is the **most common JavaScript error you will ever see**. Read it as *"you asked for something on a value that doesn't exist."* The Python equivalent is `AttributeError: 'NoneType' object has no attribute ...`. The fix is almost always optional chaining (4.8) or a default.

### 4.3 Truthiness: different from Python (this one bites)

| Value | Python | JavaScript |
|---|---|---|
| `0`, `0.0` | falsy | falsy |
| `''` (empty string) | falsy | falsy |
| `None` / `null`, `undefined` | falsy | falsy |
| `NaN` | (truthy) | falsy |
| **`[]` (empty list)** | **falsy** | **truthy** |
| **`{}` (empty dict)** | **falsy** | **truthy** |
| `'0'`, `'false'` | truthy | truthy |

So Python's `if items:` becomes **`if (items.length)`** in JavaScript, and `if (!obj)` will never be true for an empty object. For "is this object empty": `Object.keys(obj).length === 0`.

### 4.4 Equality: always `===`

```js
1 === 1        // true
'1' === 1      // false   (different types)
'1' == 1       // true    (loose equality converts types: avoid!)
0 == ''        // true    (!)
null == undefined   // true
null === undefined  // false
```

Use **`===`** and **`!==`** always. (`==` does implicit conversions that nobody remembers.) Objects and arrays compare by **identity**, like Python's `is`: `[1] === [1]` is `false`.

### 4.5 Strings

```js
const who = 'Ada', n = 3;
`Hello ${who}, you have ${n + 1} tools`     // template string: like f"Hello {who}, ..."

'End Mill'.toLowerCase()                    // 'end mill'
'End Mill'.includes('Mill')                 // true          (Python: 'Mill' in s)
'End Mill'.startsWith('End')                // true
'  x '.trim()                               // 'x'
'a,b,c'.split(',')                          // ['a','b','c']
['a','b'].join('-')                         // 'a-b'          (note: array.join(sep), the reverse of Python)
'abc'.at(-1)                                // 'c'            (s[-1] does NOT work; it's undefined)
'5'.padStart(3, '0')                        // '005'
'a-b-c'.replaceAll('-', '+')                // 'a+b+c'
'a-b-c'.replace('-', '+')                   // 'a+b-c'        (replace() only does the FIRST match)
'b'.localeCompare('a')                      // 1              (use this for sorting strings)
```

Strings have `.length` (a property, not `len()`): `'abc'.length` is `3`.

### 4.6 Numbers

```js
Number('12.5')      // 12.5
Number('')          // 0       ← trap: an empty string becomes ZERO
Number(null)        // 0       ← trap
Number(undefined)   // NaN
Number('12abc')     // NaN     (parseInt('12abc') gives 12)
Number.isFinite(x)  // true only for real numbers (not NaN, not Infinity)
(12.3456).toFixed(2)         // '12.35'   ← returns a STRING
(1234567.5).toLocaleString() // '1,234,567.5'   (formats for the user's locale)
Math.round(2.5)     // 3       (JS rounds .5 up; Python's round() rounds half to even)
```

`NaN` ("not a number") is a value that **isn't equal to itself** (`NaN === NaN` is `false`). Test with `Number.isNaN(x)` or `Number.isFinite(x)`.

The two traps (`Number('')` and `Number(null)` are `0`) are why the project has a `toNumber()` helper, and why numeric filters check "does this value even exist?" *before* converting:

```js
function toNumber(text) {
  if (text == null || String(text).trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
```

**Every `<input>` gives you a string**, even `type="number"`. `input.value` is `"10"`, never `10`. Compare the strings `'10' < '9'` and you get `true`.

### 4.7 Arrays: where your list comprehensions go

```js
const nums = [5, 3, 8];
nums.push(1);                    // append
nums.pop();                      // remove & return last
nums.length                      // len(nums)
nums.includes(3)                 // 3 in nums
nums.indexOf(8)                  // nums.index(8)  (-1 if missing; no exception)
nums.slice(1, 3)                 // nums[1:3]
const [first, ...rest] = nums;   // unpacking: first=5, rest=[3,8]
const copy = [...nums, 99];      // [*nums, 99]
```

**The methods you'll use constantly** (they return new arrays; they don't change the original):

| Python | JavaScript |
|---|---|
| `[x*2 for x in nums]` | `nums.map(x => x * 2)` |
| `[x for x in nums if x > 3]` | `nums.filter(x => x > 3)` |
| `next((x for x in nums if x > 3), None)` | `nums.find(x => x > 3)` (gives `undefined` if none) |
| `any(x > 3 for x in nums)` | `nums.some(x => x > 3)` |
| `all(x > 3 for x in nums)` | `nums.every(x => x > 3)` |
| `sum(nums)` | `nums.reduce((total, x) => total + x, 0)` |
| `len([x for x in nums if x > 3])` | `nums.filter(x => x > 3).length` |
| `[y for x in xs for y in x]` | `xs.flat()` or `xs.flatMap(x => x)` |
| `list(set(xs))` | `[...new Set(xs)]` |
| `for i, x in enumerate(xs)` | `xs.forEach((x, i) => ...)` or `for (const [i, x] of xs.entries())` |
| `dict(zip(keys, vals))` | `Object.fromEntries(keys.map((k, i) => [k, vals[i]]))` |

`x => x * 2` is a **lambda** (an *arrow function*): `lambda x: x * 2`. With braces it can have several statements, but then you need an explicit `return`:

```js
nums.map(x => x * 2)              // one expression: implicit return
nums.map(x => { return x * 2; })  // block body: explicit return
```

**The sort trap.** `sort()` **sorts as strings by default** and **changes the array in place**:

```js
[10, 9, 1].sort()                 // [1, 10, 9]   !!!
[10, 9, 1].sort((a, b) => a - b)  // [1, 9, 10]   pass a comparison function
['b','a'].sort((a, b) => a.localeCompare(b))    // strings
[...nums].sort((a, b) => a - b)   // sorted COPY (Python's sorted())
```

The comparison function returns a negative number, zero, or positive number (like the old Python 2 `cmp`).

### 4.8 Objects: your dict

```js
const tool = { name: 'Drill', diameter: 0.25, 'tool-type': 'Drill' };   // keys needn't be quoted unless odd
tool.name                         // dot access
tool['tool-type']                 // bracket access (for odd keys or variable keys)
const key = 'diameter'; tool[key] // 0.25
tool.flutes = 2;                  // add
delete tool.flutes;               // remove
'name' in tool                    // true
Object.keys(tool)                 // d.keys()
Object.values(tool)               // d.values()
Object.entries(tool)              // d.items()  -> [['name','Drill'], ...]
Object.fromEntries(pairs)         // dict(pairs)
const merged = { ...a, ...b };    // {**a, **b}
const { name, diameter } = tool;  // destructuring: name = tool['name'] ...
```

- **Keys are always strings** (numbers get converted). Use `Map` if you need other key types.
- **Missing keys give `undefined`** (4.2). Use **optional chaining** and **nullish coalescing**:

```js
row.attrs?.helix_angle            // undefined if attrs is missing, instead of crashing
row.attrs.helix_angle ?? 'n/a'    // use 'n/a' if the value is null or undefined
```

- **`??` versus `||`:** `value || 'x'` replaces *every falsy* value (including `0` and `''`!). `value ?? 'x'` only replaces `null`/`undefined`. For a diameter of `0`, `||` would be a bug. Use `??` for defaults.
- Printing an object in the console shows it **live** (expand it later and you see its *current* contents, not what it was when logged). Use `JSON.stringify(obj)` or `console.table(arrayOfObjects)` for a snapshot or a nice grid.
- **JSON** is built in: `JSON.stringify(obj)` is `json.dumps`, `JSON.parse(text)` is `json.loads`.

### 4.9 Functions, closures, and `this`

```js
function area(w, h = 1) { return w * h; }       // default parameter
const area2 = (w, h = 1) => w * h;              // arrow function
function total(...nums) { return nums.length; } // *args:  total(1,2,3)
total(...[1, 2, 3]);                            // unpack when CALLING, like f(*list)
```

Functions are values: pass them, store them, return them (Python can too). A function remembers the variables around where it was **created** (a *closure*), exactly like Python closures:

```js
function counter() { let n = 0; return () => ++n; }
const next = counter(); next(); next();         // 1, 2
```

**`this`:** inside a *regular* `function`, `this` is "whatever object called me" (often the DOM element for event handlers). Inside an **arrow function**, `this` is whatever it was *outside*, with no rebinding. You'll mostly avoid the topic by using arrow functions and the event argument (`e.target`), but jQuery handlers rely on `function` + `this` (Chapter 5).

### 4.10 Control flow

```js
if (x > 3) { ... } else if (x === 3) { ... } else { ... }
const label = x > 3 ? 'big' : 'small';          // ternary (Python: 'big' if x > 3 else 'small')
for (const item of items) { ... }               // for item in items
for (let i = 0; i < 10; i++) { ... }            // classic counted loop
while (cond) { ... }
```

**`for...of` vs `for...in`:** `for (const x of array)` gives you the **values** (what you want). `for (const k in thing)` gives you the **keys as strings**, and for arrays that means the indexes `'0','1','2'`. Use `for...of`. To loop over an object: `for (const [key, value] of Object.entries(obj))`.

`array.forEach(...)` can't be stopped with `break`. Use `for...of` if you need `break`/`continue`/`return` from inside.

`switch` exists but needs `break;` at the end of each `case` or execution **falls through** to the next one.

### 4.11 Errors

```js
try {
  const re = new RegExp(userText, 'i');           // throws SyntaxError if userText is not valid
} catch (e) {
  console.log(e.message);                         // e.g. "Invalid regular expression: /(/: Unterminated group"
} finally {
  // always runs
}
throw new Error('something is wrong');            // raise Exception('...')
```

Read errors by **type and message**:

| Error | Meaning | Python cousin |
|---|---|---|
| `TypeError: Cannot read properties of undefined (reading 'x')` | you used `.x` on something that doesn't exist | `AttributeError` on `None` |
| `ReferenceError: foo is not defined` | the variable doesn't exist in scope (typo, or defined later/elsewhere) | `NameError` |
| `SyntaxError` | the code (or a regex/JSON text) isn't valid | `SyntaxError` / `json.JSONDecodeError` |
| `Uncaught (in promise) ...` | an `async` function threw and nobody caught it | an unawaited task's exception |

The **stack trace** lists the call chain, newest first; click the file:line link in the console to jump to the code.

### 4.12 Async: Promises and `await`

JavaScript runs your code on **one thread**, with an **event loop**: it runs your code to completion, then picks the next waiting event (a click, a finished timer, an arrived bridge response). There is no `sleep()` that waits: anything slow must be *asynchronous* and you `await` it.

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demo() {
  console.log('start');
  await sleep(1000);              // pauses THIS function only; the page stays alive
  console.log('one second later');
  return 42;
}

const result = await demo();      // top-level await works in the console
```

| Python `asyncio` | JavaScript |
|---|---|
| `async def f():` | `async function f() {}` / `async () => {}` |
| `await f()` | `await f()` |
| coroutine object | `Promise` |
| `asyncio.run(main())` | not needed: the event loop is always running |
| `asyncio.gather(a(), b())` | `await Promise.all([a(), b()])` |
| `asyncio.sleep(1)` | `await sleep(1000)` (helper above) |
| `try/except` around `await` | `try/catch` around `await` |

Gotchas:

- **Forgetting `await`** gives you a Promise object instead of the value, so `"[object Promise]"` appears on the page. If something prints that, you forgot an `await`.
- `await` only works inside an `async` function. (Event handlers can be `async`; the browser doesn't care that they return a Promise.)
- **A long synchronous loop freezes the whole page** (the same thread draws the screen). Chunk the work or keep it in Python.
- A thrown error in an `async` function becomes a **rejected Promise**. If nobody `await`s it in a `try/catch`, you get `Uncaught (in promise)` in the console.

### 4.13 Scope, and why this project avoids `import`

JavaScript files loaded with plain `<script src="...">` all share **one global scope**. That means two files defining `const h = ...` would collide. The project uses a tiny pattern to avoid that:

```js
(function (App) {
  'use strict';
  // everything here is private to this file...
  function helper() {}

  App.util = { helper };          // ...except what we deliberately publish on the shared App object
})(window.App = window.App || {});
```

- `(function (App) { ... })(window.App = window.App || {})` defines a function and **calls it immediately** (an *IIFE*). Inside, variables are private.
- `window.App = window.App || {}` creates one shared object `App` the first time and reuses it afterwards.
- `'use strict'` turns silent mistakes (like assigning to an undeclared variable) into errors.

**Why not modern ES modules** (`import ... from`)? Because of the `file://` rule in Chapter 1: Chromium blocks module scripts loaded from files ("CORS policy ... origin 'null'"; I verified it). pywebview does have an `http_server=True` option for `webview.start()` that serves your folder over a local web server, which should allow modules. I did not test that route. Classic scripts + the `App` namespace work everywhere, so that's what the project uses.

### 4.14 Regular expressions: Python vs JavaScript

You'll write regex for the filter feature, so it matters.

```js
/^Drill|Tap/i.test('drill 3')              // true   (a regex LITERAL: /pattern/flags)
new RegExp('^Drill|Tap', 'i').test(text)   // build from a string (what the filter box does)
'a1b22'.match(/\d+/g)                      // ['1', '22']
[...'a1b22'.matchAll(/(\d)(\d)?/g)]        // iterate matches with groups
'a1b2'.replace(/\d/g, '#')                 // 'a#b#'   (needs the g flag to replace ALL)
```

| Python `re` | JavaScript |
|---|---|
| `re.search(p, s)` | `new RegExp(p).test(s)` (yes/no) or `s.match(re)` (match object) |
| `re.match(p, s)` (anchored at start) | JS has no equivalent: **`.test()` finds a match ANYWHERE**; add `^` yourself |
| `re.fullmatch` | `^...$` |
| `re.findall(p, s)` | `s.match(/p/g)` |
| `re.sub(p, r, s)` | `s.replace(/p/g, r)` |
| `re.IGNORECASE` | flag `i` |
| `re.MULTILINE` | flag `m` |
| `re.DOTALL` | flag `s` |
| `re.VERBOSE` | none |
| `(?P<name>...)` named group | **`(?<name>...)`** (no `P`) |
| `\d`, `\w`, `\s`, `\b` | same (JS `\w` is ASCII only unless you use the `u` flag with `\p{L}`) |
| raw strings `r'\d'` | in a **regex literal** `/\d/` you write one backslash; in a **string** `'\\d'` you need two |

Traps:

1. **The `g` (global) flag makes a regex stateful.** A regex with `g` remembers `lastIndex` between calls, so calling `.test()` twice on the same string can give `true` then `false`. For *filtering* never use `g` (the project doesn't).
2. **Invalid user regex throws** at construction time (`new RegExp('(')` is a `SyntaxError`). Always wrap it in `try/catch` and show a message. The filter does.
3. To search for **literal text** the user typed (not a pattern), escape it first:

```js
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

### 4.15 Dates, briefly

```js
new Date('2026-11-09T10:31:42+00:00')    // parse ISO-8601 (what Python's isoformat() gives)
.toLocaleString()                         // show in the user's local format
new Date(2026, 0, 15)                     // MONTHS ARE 0-BASED: this is January 15
```

Avoid building dates by hand. Have Python send ISO strings and format them with `toLocaleString()` for display.

### 4.16 Practice in the console

1. Make an array of 6 numbers. Get the squares of the even ones, sorted descending. (`filter`, `map`, `sort` with a comparator.)
2. `[10, 9, 1].sort()`: predict the result before you run it.
3. Create an object `{a: 1, b: 2}` and print its entries as `a=1` lines using `Object.entries` and a template string.
4. Predict, then run: `Number('')`, `Number(null)`, `Number(undefined)`, `'5' + 3`, `'5' - 3`, `[] == false`.
5. `new RegExp('(')`. Read the message. Wrap it in `try/catch` and print only `e.message`.
6. Write `async function slow() {...}` that returns after one second. Call it *without* `await` and print the result. What do you see?

---

## Chapter 5: The DOM, events, and jQuery: why browser JavaScript "behaves differently"

You said you often don't know why things work differently in the DOM than in normal JavaScript. There's a real answer, and once you see it, a whole class of mysteries disappears.

### 5.1 Two layers called "JavaScript"

| Layer | What it is | Examples |
|---|---|---|
| **The language** (ECMAScript) | The same everywhere | `let`, functions, `Array`, `Object`, `Promise`, `JSON`, `Math`, `Date`, `RegExp`, `Map`, `Set` |
| **The host environment** (browser) | Provided by the browser around the language | `window`, `document`, `console`, `setTimeout`, `fetch`, `localStorage`, `addEventListener`, every DOM element |

So `console.log` and `setTimeout` are *not* part of the language: they're browser (or Node) features. In **Node.js** you have the language but **no `document`** at all. In the **browser** you have the DOM. In pywebview you have the browser **plus** `window.pywebview` (injected by pywebview).

Most "it works here but not there" confusion is: *this part is the language (behaves the same everywhere)* vs *this part is the host (only exists here, with host-specific rules).*

Python parallel: `list`, `dict`, `re` are the language/stdlib; `sqlite3` and `os` talk to the *outside* (the host). JS's host is the web page.

### 5.2 The DOM is a live tree of objects, not text

When the browser reads your HTML it builds the **DOM** (Document Object Model): a tree of objects, one per tag.

```html
<ul id="list">
  <li>Drill</li>
  <li>Tap</li>
</ul>
```

becomes

```
document
└─ html
   └─ body
      └─ ul#list
         ├─ li  → text "Drill"
         └─ li  → text "Tap"
```

JavaScript reads and changes this tree; the browser redraws whatever changed. Two consequences:

- **View Source ≠ what's on screen.** The *Elements* tab in DevTools shows the live DOM after JavaScript ran. Use that, not the original file.
- Everything you do to the page is "find an element object, then change its properties or children."

### 5.3 Finding elements

```js
const list = document.getElementById('list');            // one element, or null
const first = document.querySelector('#list li');        // first match of a CSS selector, or null
const all = document.querySelectorAll('#list li');       // a NodeList of every match
const owner = someElement.closest('tr');                 // nearest ancestor (or itself) that matches
```

- **CSS selectors** are what you already know from CSS: `#id`, `.class`, `tag`, `parent child`, `a > b`, `[attr="x"]`.
- **When nothing matches you get `null`**, and the next line crashes with `TypeError: Cannot read properties of null (reading 'textContent')`. When you see that error, the element **wasn't found** (wrong id, typo) or **doesn't exist yet** (5.4).
- `querySelectorAll` returns a **NodeList**, which is array-*like*: it has `forEach` and `length` but not `map`/`filter`. Convert: `Array.from(all)` or `[...all]`.

### 5.4 Timing: the #1 DOM surprise

The browser runs your `<script>` the moment it meets it, **before it has read the HTML below it**.

```html
<head>
  <script>
    document.getElementById('out').textContent = 'hi';   // ✗ out doesn't exist yet → null → TypeError
  </script>
</head>
<body>
  <p id="out"></p>
</body>
```

Fixes (pick one):

1. **Put scripts at the end of `<body>`** (what Tool Viewer does). Every element above already exists.
2. `<script defer src="...">` in the head: downloads in parallel, runs after the page is parsed.
3. `document.addEventListener('DOMContentLoaded', () => { ... })`: run when the DOM is ready.

In pywebview there is a **second readiness moment**: the DOM can be ready *before* `window.pywebview.api` exists. Hence `whenReady()` in `bridge.js` (Chapter 3, Step 5). **Three different "ready"s**: *the element exists*, *the page loaded*, *the Python bridge is ready*, and bugs live in the gaps.

### 5.5 Reading and changing content

```js
el.textContent = 'Drill & Tap';        // sets PLAIN TEXT: safe
el.innerHTML = '<b>Drill</b>';         // parses the string as HTML: powerful, dangerous
el.value                               // an <input>'s current text (always a STRING)
checkbox.checked                       // true/false
select.value                           // the selected option's value (a string)
el.classList.add('shown'); el.classList.toggle('shown', true); el.classList.contains('x');
el.hidden = true;                      // the `hidden` attribute
el.dataset.id = '5';                   // data-id="5"  (values are strings)
el.setAttribute('title', 'x'); el.getAttribute('title');
el.style.color = 'red';                // inline style; prefer toggling a class
```

**`innerHTML` and untrusted text.** Suppose a tool's comment is `<img src=x onerror="doEvil()">`. If you do `cell.innerHTML = comment`, the browser *parses it as HTML* and runs it. (This is called **XSS**, cross-site scripting; in a desktop viewer reading company data it's less dramatic, but data with `<` or `&` in it will also simply *render wrongly*.) With `textContent` the text is shown literally. **Rule: use `textContent` (or the `h()` helper) for any data from files or users. Use `innerHTML` only for HTML you wrote yourself.**

**Attributes vs properties:** the HTML attribute `value="x"` is the *initial* value; the `.value` **property** is the *current* value as the user types. Read/write the property for live state.

**`hidden` and CSS:** the `hidden` attribute is overridden by any CSS `display:` rule. (An element with `display: flex` and `hidden` stays visible.) The project's CSS includes `[hidden] { display: none !important; }` so `hidden` always works.

### 5.6 Creating elements: the `h()` helper

```js
const li = document.createElement('li');
li.textContent = 'Drill';
document.getElementById('list').append(li);        // add at the end
list.replaceChildren(li1, li2, li3);               // replace ALL children
list.replaceChildren();                            // empty it
```

Building DOM by hand is verbose, so the project has a small helper (`util.js`):

```js
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'value') el.value = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;   // append(null) would add the text "null"
    el.append(child);                                  // strings become safe text nodes
  }
  return el;
}

// use:
h('label', {}, h('input', { type: 'checkbox', onchange: handler }), 'Carbide')
```

Read it: `...children` collects extra arguments into an array (like `*children`); the first loop applies properties; keys starting with `on` become event listeners (`onclick` → `'click'`); the second loop appends children, flattening nested arrays. Because strings go through `append` as **text nodes**, user data can never become markup.

Two real bugs I hit while testing this project; both are classic:

1. **`replaceChildren(...)` does not flatten arrays.** `container.replaceChildren(a, b, [c, d])` appends the text `"[object HTMLDivElement],..."` for the array. My `h()` flattens arrays (that's the `.flat()`), but `replaceChildren` doesn't, so you spread them yourself: `container.replaceChildren(a, b, ...list)`. The symptom was "the dropdown filters silently never appear."
2. **A `<select>`'s `value` can't be set before its `<option>`s exist.** In `h('select', {value: 'x'}, options)` the props run first, so the value is lost. Mark the right option with `selected: true` instead.

### 5.7 Events

```js
button.addEventListener('click', (e) => {
  console.log(e.target);          // the element that was actually clicked
});
```

| Event | Fires | Use for |
|---|---|---|
| `click` | clicked | buttons, rows |
| `input` | on **every keystroke** in a text box/slider | live filtering |
| `change` | when a control **commits** (checkbox toggled, select changed, text box loses focus) | checkboxes, selects |
| `submit` | a `<form>` submitted | (avoid forms; call `e.preventDefault()` if you use them) |
| `DOMContentLoaded`, `pywebviewready` | page/bridge ready | startup |

**Bubbling and delegation.** Events travel **up** from the clicked element through its ancestors. So instead of attaching a listener to every row (and again each time the table redraws), attach **one** listener to a stable ancestor and ask what was clicked:

```js
document.getElementById('tools').addEventListener('click', (e) => {
  const tr = e.target.closest('tbody tr');        // which row (if any) contains the click?
  if (!tr) return;
  // ...handle the row
});
```

- `e.target` = the deepest element clicked. `e.currentTarget` = the element the listener is attached to.
- This is called **event delegation**, and it is **mandatory with DataTables**: the table creates and destroys `<tr>`s as you page, sort and filter, so listeners attached to rows are lost.

**`this` inside handlers:** with `addEventListener('click', function () { ... })` `this` is the element; with an arrow function `() => {}` it isn't. Prefer arrows + `e.target`.

**Debouncing.** `input` fires on every keystroke. Filtering 50,000 rows each time is wasteful, so wait until the user pauses:

```js
function debounce(fn, ms = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);                     // cancel the previous pending call
    timer = setTimeout(() => fn(...args), ms);
  };
}
const filterSoon = debounce(applyFilters, 200);
input.addEventListener('input', filterSoon);
```

### 5.8 Rendering without losing the user's place

A very common beginner approach: on every change, rebuild the whole sidebar with `innerHTML = ...`. It "works" but:

- the text box **loses focus** mid-typing (it's a brand-new element),
- scroll positions and open dropdowns reset,
- every listener you attached is destroyed.

The project's rule: **keep the controls; update only what changed.** While typing, only the result table, the chips, and the error text update. The controls are rebuilt only for deliberate actions like "Clear all", where the state changed from outside the controls.

This is the core of UI architecture: **state** (plain data) → **render** (draw from state) → **events** (change state, call render). The filter module is built exactly that way (Chapter 14).

### 5.9 One thread, so don't block

Recall 4.12: while your JavaScript runs, **nothing is drawn and no click is handled**. Loop over 500,000 rows synchronously and the window "hangs". Rules: filter/sort in one pass, debounce inputs, and ask Python to do heavy work (Python calls run on separate threads and don't freeze the page).

### 5.10 Where to remember user settings

Browsers offer `localStorage`. **But pywebview's default is `private_mode=True`, which means nothing in `localStorage` survives a restart.** (I checked the signature: `webview.start(..., private_mode: bool = True, storage_path: str | None = None)`.) You can pass `private_mode=False` and a `storage_path`, but the simpler and more robust design is: **keep settings in Python** (the project saves `config.json` through the bridge). Then they work the same whatever the browser does.

### 5.11 jQuery: reading the code in your existing apps

jQuery is a 2006-era library that made the DOM bearable. Modern browsers now have most of it built in, which is why this project doesn't need it. But your existing apps use it, so you must be able to read it.

**`$` is just a function.** `$('#tools')` is shorthand for `jQuery('#tools')`. It finds elements (CSS selector) and returns a **jQuery object**: a wrapper holding the matching elements with lots of handy methods. It is **not** a DOM element:

```js
const el  = document.getElementById('tools');   // a raw DOM element:   el.value, el.textContent
const $el = $('#tools');                         // a jQuery wrapper:    $el.val(),  $el.text()
$el[0]   // or  $el.get(0)  → the raw DOM element inside the wrapper
```

Mixing the two up is the classic jQuery error: `$el.value` is `undefined` (use `.val()`), and `el.val()` is `TypeError: el.val is not a function` (it's a raw element, not a wrapper).

| Vanilla JavaScript | jQuery |
|---|---|
| `document.querySelectorAll('.x')` | `$('.x')` |
| `el.textContent` / `el.textContent = t` | `$el.text()` / `$el.text(t)` |
| `el.innerHTML = h` | `$el.html(h)` (same XSS caveat) |
| `input.value` / `input.value = v` | `$input.val()` / `$input.val(v)` |
| `el.getAttribute('a')` | `$el.attr('a')` |
| `checkbox.checked` | `$cb.prop('checked')` |
| `el.classList.add('x')` | `$el.addClass('x')` |
| `el.hidden = true` | `$el.hide()` / `.show()` / `.toggle()` |
| `el.addEventListener('click', fn)` | `$el.on('click', fn)` |
| `parent.addEventListener('click', e => { if (e.target.closest('tr')) ... })` | `$parent.on('click', 'tr', function () {...})` (delegation) |
| `NodeList.forEach(fn)` | `$els.each(function (i, el) {...})` |
| `document.addEventListener('DOMContentLoaded', fn)` | `$(function () {...})` or `$(document).ready(fn)` |
| `fetch(url).then(r => r.json())` | `$.ajax(...)` / `$.getJSON(url)` (not used with pywebview) |

A jQuery handler:

```js
$('#tools tbody').on('click', 'tr', function () {   // `function`, NOT an arrow
  const $row = $(this);                              // `this` = the clicked <tr> (raw element); wrap it
  $row.toggleClass('shown');
});
```

It must be a regular `function` because jQuery sets `this` to the element, and arrow functions ignore that (4.9). `$(this)` re-wraps the raw element into a jQuery object.

Chaining: `$('.x').addClass('on').text('hi').show()` (each method returns the wrapper so you can chain).

jQuery has major versions (3.x and a new 4.x); old plugins sometimes break on newer majors. If an old app works, don't upgrade it casually.

### 5.12 DataTables objects: three different things with confusingly similar names

This confuses nearly everyone in your position:

```js
$('#tools')                      // 1. a jQuery object wrapping the <table> element
$('#tools').DataTable({...})     // 2. (capital D) returns the DataTables **API** object: the modern API
$('#tools').dataTable({...})     // 3. (lowercase d) returns a *jQuery object* with the OLD (v1.9-style) API
new DataTable('#tools', {...})   // 2 again, without jQuery (DataTables 2+/3)
```

Use #2. If you see `.dataTable()`, `fnDraw()`, `fnGetData()`, `aoColumns`, `bPaginate`, `sDom` in old code: that's the legacy API from DataTables 1.9 and earlier. It maps to the modern one:

| Legacy | Modern |
|---|---|
| `aoColumns` / `bPaginate` / `sDom` options | `columns` / `paging` / `dom` (or `layout` in 2+) |
| `table.fnDraw()` | `table.draw()` |
| `table.fnAddData(obj)` | `table.row.add(obj).draw()` |
| `table.fnClearTable()` | `table.clear().draw()` |
| `table.fnFilter('x')` | `table.search('x').draw()` |

**And the biggest trap, which sits between the DOM and DataTables:**

> **DataTables only keeps the rows of the *current page* in the DOM.**

A table with 50,000 rows and `pageLength: 50` has **50** `<tr>` elements. So `document.querySelectorAll('#tools tbody tr')` finds 50, *not* 50,000, and anything you do to those rows is thrown away when the page changes. **Ask the data, not the DOM:**

```js
table.rows().data()                         // ALL rows' data (the original objects)
table.rows({ search: 'applied' }).data()    // only rows passing the current filters
table.rows({ search: 'applied' }).count()   // how many pass
table.row(trElement).data()                 // data for one DOM row
```

### 5.13 When the DOM misbehaves: symptom → cause

| Symptom | Likely cause |
|---|---|
| `Cannot read properties of null (reading ...)` | `getElementById`/`querySelector` found nothing: typo, or script ran before the element existed (5.4) |
| `x is not a function` | calling something that isn't one: a jQuery method on a raw element (or vice versa), an `await` missing so you hold a Promise, or a typo |
| Page text shows `[object Promise]` / `[object Object]` | missing `await` / putting an object where text was expected |
| Click handler runs for new rows only (or never) | listener attached to rows that were later re-created: use delegation (5.7) |
| Nothing happens and no error | the script file didn't load (404 in the Network tab), or an earlier error stopped the script: check the Console |
| Input loses focus while typing | you rebuilt the input (5.8) |
| Number comparisons are wrong (`'10' < '9'`) | `input.value` is a string: convert with `Number()`/`toNumber()` |
| `0` or `''` treated as "missing" | you used `||` instead of `??`, or `if (value)` |
| `NaN` showing up | `Number('abc')`, or arithmetic on `undefined` |
| Works the first time, fails after reload | state kept in a variable that reset, or `private_mode` wiped `localStorage` |
| The element is there but invisible/not where expected | a CSS problem, not JS: Chapter 6 |
| Count of rows is only 50 | you queried the DOM, not DataTables (5.12) |

### Exercises (Chapter 5)

1. In the console, run `document.body.innerHTML = '<ul id="l"></ul>'`, then add three `<li>`s with `createElement` and `append`.
2. Do the same with `h('li', {}, 'text')` after pasting the `h` function in the console.
3. Set `el.innerHTML = '<b>bold</b>'` and `el.textContent = '<b>bold</b>'` on the same element and compare.
4. Add one click listener to the `<ul>` that logs the text of whichever `<li>` was clicked (`e.target.closest('li')`). Then add more `<li>`s afterwards and confirm they work without new listeners.
5. Open an old jQuery page of yours and translate five `$(...)` lines into vanilla JS using the table in 5.11.

---

## Chapter 6: HTML and CSS survival kit (for people who "suck at styling")

Good news: styling is mostly **rules, not talent**. A handful of conventions (a spacing scale, one font, two colors, consistent corners) makes anything look intentional. The project's stylesheet bakes these in. This chapter explains how it works so you can change it, and how to debug the "why does it look wrong?" moments with DevTools.

### 6.1 HTML in one page

HTML describes **structure**; CSS describes **appearance**. Use elements for what they *mean*:

```html
<header>  <aside>  <main>  <footer>        <!-- page regions -->
<h1>…<h3>  <p>  <ul><li>  <table>          <!-- text and lists -->
<button>  <input type="text|number|checkbox">  <select><option>  <label>  <details><summary>
<div>  <span>                              <!-- generic boxes: div = block, span = inline -->
```

- **block** elements (`div`, `p`, `h1`) stack vertically and fill the width. **inline** elements (`span`, `a`, `strong`) flow within text.
- `class="a b"` attaches reusable style names; `id="x"` names exactly one element (for JavaScript).
- `<label>` wrapping an `<input>` makes the text clickable. Always do it.
- `<details><summary>` is a **free expand/collapse widget** with no JavaScript. The project's dropdown menus are built from it.

### 6.2 CSS in one page

```css
.chip {                       /* selector: elements with class="chip" */
  padding: 4px 8px;           /* property: value; */
  background: #e4ecfb;
}
```

Selectors: `p` (tag), `.chip` (class), `#tools` (id), `.filters input` (descendant), `.a > .b` (direct child), `button:hover` (state), `input[type="text"]` (attribute), `.a, .b` (either).

**Specificity** decides conflicts: id beats class beats tag; later beats earlier when equal. If your rule "isn't working", something more specific (often DataTables' own CSS) is overriding it. DevTools shows overridden rules **struck through** (6.8).

### 6.3 The box model: the one concept that explains most layout

Every element is a box:

```
┌───────────────── margin (space OUTSIDE) ─────────────────┐
│  ┌──────────────── border ───────────────────────────┐   │
│  │  ┌───────────── padding (space INSIDE) ────────┐  │   │
│  │  │             content (text, children)         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Padding** pushes content away from the edge *inside*. **Margin** pushes neighbors away *outside*. `padding: 8px 12px` means vertical 8, horizontal 12; `padding: 1px 2px 3px 4px` is top, right, bottom, left (clockwise).

The first line of the project CSS fixes the most annoying default:

```css
*, *::before, *::after { box-sizing: border-box; }
```

Without it, `width: 100%` plus `padding` is **wider than 100%** (padding is added *outside* the width), which is why inputs overflow their containers. With `border-box`, width includes padding and border. Put this in every stylesheet you ever write.

### 6.4 Flexbox: "put things in a row"

```css
.row { display: flex; gap: 8px; align-items: center; }
```

- `display: flex` lays the children out **in a row**.
- `gap` is the space between them (better than margins).
- `align-items: center` centers them vertically; `justify-content: space-between` pushes the first/last to the ends.
- A child with `flex: 1` (or `.spacer { flex: 1 }`) **grows to absorb the leftover space**. The toolbar uses an empty spacer to push the buttons to the right.
- `flex-wrap: wrap` lets children wrap to a new line (the chips use it).

### 6.5 Grid: the page layout

The whole app is one grid with **named areas**, readable like a drawing:

```css
.app {
  display: grid;
  grid-template-columns: 280px 1fr;         /* fixed sidebar, content takes the rest ("1 fraction") */
  grid-template-rows: auto 1fr auto;        /* header as tall as it needs, middle fills, footer as needed */
  grid-template-areas:
    "top     top"
    "filters content"
    "status  status";
  height: 100vh;                            /* 100% of the window height ("viewport height") */
}
.topbar  { grid-area: top; }
.filters { grid-area: filters; }
```

Three lines make it behave:

```css
.filters { overflow-y: auto; }      /* scroll INSIDE the sidebar, not the whole page */
.content { overflow: auto; min-width: 0; }   /* see below */
```

**The `min-width: 0` secret.** Grid and flex children refuse to shrink smaller than their content by default. A wide table inside the content area would then force the **whole grid** wider than the window. `min-width: 0` says "you may shrink", and `overflow: auto` adds scrollbars where needed. When a layout "explodes" past the window, this is nearly always the fix (and `min-height: 0` for the vertical equivalent).

`fr`, `px`, `%`, `vh`: `px` = fixed pixels, `%` = of the parent, `vh` = percent of window height, `fr` = a share of leftover space in a grid, `rem`/`em` = relative to font size.

### 6.5b Positioning (rarely)

`position: relative` on a parent plus `position: absolute` on a child lets the child sit at exact offsets within the parent. The "Columns" dropdown uses it so its panel floats over the table instead of pushing it down. `z-index` decides what's in front.

### 6.6 Design tokens: how to be consistent without being a designer

The stylesheet starts with variables:

```css
:root {
  --bg: #f4f6f8;      --panel: #ffffff;   --text: #1c2630;   --muted: #66727f;
  --border: #d5dbe2;  --accent: #2459d6;
  --radius: 6px;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px;     /* spacing scale */
}
body { background: var(--bg); color: var(--text); }
.btn { padding: var(--s1) var(--s3); border: 1px solid var(--border); border-radius: var(--radius); }
```

`--name` defines a **CSS variable**; `var(--name)` uses it. Why this makes things look professional:

- **A spacing scale** (4, 8, 12, 16, 24). Only ever use those numbers. Inconsistent spacing is the #1 reason amateur UIs look "off."
- **A few colors with jobs**: background, panel, text, muted text, border, one accent. Don't add more.
- **One corner radius** everywhere.
- **Change the whole look by changing the variables**: swap `--accent` and every button updates.

Design rules of thumb for non-designers:

1. Align things to a left edge. Don't center body text.
2. Use **weight and size** (not color) for hierarchy: bold labels, normal values.
3. Muted gray for secondary information, normal text for primary.
4. Plenty of space around groups, less within them (proximity = grouping).
5. System fonts (`system-ui`) look native and need no files.
6. One accent color for the main action only.
7. Copy a layout you like (Windows apps, Excel, VS Code) rather than inventing one.

### 6.7 Dark mode in four lines

```css
@media (prefers-color-scheme: dark) {
  :root { --bg: #12171c; --panel: #1b2229; --text: #e5e9ed; /* ...redefine the same variables */ }
}
```

Because every color goes through a variable, redefining them in a media query re-themes the whole app. The query follows the Windows light/dark setting.

> Honest limit: I tested the **light** theme in the browser run. DataTables' own table styling needs its own dark-mode support (check the DataTables documentation for the current way to enable it, which differs between versions), so treat dark mode as an exercise.

### 6.8 Debugging CSS with DevTools (do this instead of guessing)

1. Right-click the thing that looks wrong → **Inspect**. The *Elements* tab highlights it.
2. In the **Styles** panel on the right you see every rule that applies. **Struck-through** rules are being overridden (by something more specific or later). You can edit values, add properties, and untick checkboxes **live** to experiment; nothing is saved, so copy what works into your file.
3. The **Computed** tab has the **box-model diagram** (margin, border, padding, content with real numbers). It instantly answers "where is this space coming from?"
4. **Hover** over an element in the tree and the page shades its box.
5. Right-click an element in the tree → *Force state* → `:hover` / `:focus` to style states.

Common problems:

| Symptom | Cause / fix |
|---|---|
| Input sticks out of its container | missing `box-sizing: border-box` (6.3) |
| Whole page scrolls sideways | a child is wider than the grid: add `min-width: 0; overflow: auto` on that grid area (6.5) |
| Content doesn't fill the height / list won't scroll | the parent chain needs a height: `html, body { height: 100% }` and the grid `height: 100vh`; the scrolling box needs `overflow: auto` and `min-height: 0` |
| `hidden` element still shows | a `display:` rule beat it: add `[hidden] { display: none !important }` |
| My rule has no effect | struck through in Styles? something more specific wins, or your selector doesn't match (typo, wrong class), or your CSS file loaded **before** the library's (order matters; ours loads last) |
| Changes don't show after editing the CSS | cached: reload with Ctrl+R (or Ctrl+Shift+R) in the window |
| Two elements in a row won't sit side by side | they're `block`: put them in a `display: flex` parent |
| Text is cramped | add `padding` to the container, not `margin` on every child |
| Table columns misaligned after resize or showing/hiding columns | call `table.columns.adjust()` (Chapter 13) |

### 6.9 The page skeleton: `index.html`

Open the project's `index.html` (full listing at the end of this chapter). Read it top to bottom:

- `<meta charset="utf-8">`: always include, or non-ASCII characters (like `×` or `…`) turn into garbage.
- The **CSS links**: the library's first, **ours last**, so on equal specificity our rules win.
- The page is one `<div class="app">` containing `<header>`, `<aside id="filters">`, `<main>`, `<footer>`: exactly the four grid areas.
- The empty-state block (`<div id="empty" hidden>`) is shown by JavaScript only when no folder is configured. `hidden` hides it until then.
- The `<table id="tools">` is **empty**: DataTables builds its header and rows.
- **All scripts at the very end of `<body>`**, in dependency order: `datatables.min.js`, then `util.js` (everything uses it), `bridge.js`, `filters.js`, `table.js`, and finally `main.js`, which starts the app. The order matters because they share the global `App`.

### 6.10 Complete listings: `frontend/index.html` and `frontend/css/app.css`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tool Viewer</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Third-party CSS first, ours last so OUR rules win when specificity ties -->
  <link rel="stylesheet" href="vendor/datatables.min.css">
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <div class="app">

    <header class="topbar">
      <h1>Tool Viewer</h1>
      <div class="spacer"></div>
      <span id="busy" class="busy" hidden>Checking for changes…</span>
      <details class="menu" id="colmenu">
        <summary class="btn">Columns</summary>
        <div class="menu-body" id="colmenu-body"></div>
      </details>
      <button class="btn" id="btn-export">Export CSV</button>
      <button class="btn" id="btn-rescan" title="Re-check the folder for changes">Rescan</button>
      <button class="btn" id="btn-folder">Choose folder…</button>
    </header>

    <aside class="filters" id="filters"></aside>

    <main class="content">
      <div id="empty" class="empty" hidden>
        <h2>No tool folder selected</h2>
        <p>Pick the folder that contains your tool databases.</p>
        <button class="btn primary" id="btn-folder-empty">Choose folder…</button>
      </div>
      <table id="tools" class="display" style="width:100%"></table>
    </main>

    <footer class="statusbar">
      <span id="status">Starting…</span>
    </footer>
  </div>

  <!-- Scripts at the END of body: every element above already exists when they run. -->
  <script src="vendor/datatables.min.js"></script>
  <script src="js/util.js"></script>
  <script src="js/bridge.js"></script>
  <script src="js/filters.js"></script>
  <script src="js/table.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

```css
/* ---------- 1. Design tokens: change a look by changing these ---------- */
:root {
  --bg: #f4f6f8;
  --panel: #ffffff;
  --text: #1c2630;
  --muted: #66727f;
  --border: #d5dbe2;
  --accent: #2459d6;
  --accent-text: #ffffff;
  --danger: #b3261e;
  --chip: #e4ecfb;

  --radius: 6px;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px;     /* spacing scale */
  --font: system-ui, "Segoe UI", Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12171c; --panel: #1b2229; --text: #e5e9ed; --muted: #9aa6b2;
    --border: #2f3a45; --accent: #6d9bff; --accent-text: #0b1220;
    --danger: #ff8a80; --chip: #26364f;
  }
}

/* ---------- 2. Reset: make sizing predictable ---------- */
*, *::before, *::after { box-sizing: border-box; }   /* width includes padding+border */
html, body { height: 100%; margin: 0; }
body { font: 14px/1.4 var(--font); color: var(--text); background: var(--bg); }

/* ---------- 3. Page layout: a named-area grid ---------- */
.app {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "top     top"
    "filters content"
    "status  status";
  height: 100vh;
}
.topbar    { grid-area: top; }
.filters   { grid-area: filters; }
.content   { grid-area: content; }
.statusbar { grid-area: status; }

.topbar {
  display: flex; align-items: center; gap: var(--s2);
  padding: var(--s2) var(--s4);
  background: var(--panel); border-bottom: 1px solid var(--border);
}
.topbar h1 { font-size: 16px; margin: 0; }
.spacer { flex: 1; }

.filters {
  overflow-y: auto;                  /* scroll inside the sidebar, not the whole page */
  padding: var(--s4);
  background: var(--panel); border-right: 1px solid var(--border);
}
.content {
  overflow: auto;
  min-width: 0;                      /* lets a wide table scroll instead of stretching the grid */
  padding: var(--s4);
}
.statusbar {
  padding: var(--s1) var(--s4);
  color: var(--muted); border-top: 1px solid var(--border); background: var(--panel);
}

/* ---------- 4. Controls ---------- */
.btn, input[type="text"], input[type="number"], select {
  font: inherit; color: inherit;
  padding: var(--s1) var(--s3);
  background: var(--panel);
  border: 1px solid var(--border); border-radius: var(--radius);
}
.btn { cursor: pointer; }
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
input:focus, select:focus, .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
input.invalid { border-color: var(--danger); }
.error-text { color: var(--danger); font-size: 12px; margin-top: var(--s1); }

.field { margin-bottom: var(--s4); }
.field > label, .field > .label { display: block; font-weight: 600; margin-bottom: var(--s1); }
.field input[type="text"], .field select { width: 100%; }
.row { display: flex; gap: var(--s2); align-items: center; }
.row > * { min-width: 0; }
.checks { display: flex; gap: var(--s3); margin-top: var(--s1); color: var(--muted); }
.checks label { display: flex; gap: var(--s1); align-items: center; }

/* ---------- 5. Dropdown menus built from <details> ---------- */
details.menu { position: relative; }
details.menu > summary { list-style: none; }
details.menu > summary::-webkit-details-marker { display: none; }
.menu-body {
  max-height: 260px; overflow: auto;
  padding: var(--s2); margin-top: var(--s1);
  background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
}
.menu-body label { display: flex; gap: var(--s2); padding: 2px 0; align-items: center; }
.menu-body .count { margin-left: auto; color: var(--muted); }
.topbar details.menu .menu-body { position: absolute; right: 0; z-index: 10; min-width: 240px; }

/* ---------- 6. Chips (active filter summary) ---------- */
.chips { display: flex; flex-wrap: wrap; gap: var(--s1); margin-bottom: var(--s4); }
.chip {
  display: inline-flex; align-items: center; gap: var(--s1);
  padding: 2px var(--s2); background: var(--chip); border-radius: 999px; font-size: 12px;
}
.chip button { border: 0; background: none; cursor: pointer; color: inherit; padding: 0 2px; }

/* ---------- 7. Attribute rules ---------- */
.rule { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s1); margin-bottom: var(--s2); }
.rule input, .rule select { width: 100%; }

/* ---------- 8. Row detail panel, empty state, busy indicator ---------- */
tr.shown > td { background: var(--chip); }
.detail { padding: var(--s2) var(--s4); }
.detail dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px var(--s4); margin: 0; }
.detail dt { color: var(--muted); }
.detail dd { margin: 0; }
.empty { text-align: center; padding: var(--s5); }
.busy { color: var(--muted); }
.busy::before {
  content: ""; display: inline-block; width: 10px; height: 10px; margin-right: 6px;
  border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
[hidden] { display: none !important; }   /* make the hidden attribute beat any display: rule */

/* ---------- 9. DataTables touch-ups (only what we need) ---------- */
#tools td.num { text-align: right; font-variant-numeric: tabular-nums; }
```

**Checkpoint:** create these two files (leave `js/` for later; the page will show empty chrome and a few console errors about missing scripts, which is expected). Put DataTables in `vendor/` and open `index.html` in a normal browser to see the layout. In DevTools toggle the *device/theme emulation* or change your OS theme to see dark mode.

### Exercises (Chapter 6)

1. Change `--accent` to another color and watch the buttons, checkboxes and focus rings follow.
2. Change the sidebar width from `280px` to `340px`. Where is the number? (Only one place.)
3. In DevTools, click the **Filters** sidebar and untick `overflow-y: auto`. What happens when there are many filters? Put it back.
4. Make the `.chip` background use a second accent color via a new variable.
5. Add a `.btn.danger` style (red border and text using `--danger`).

---

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
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Tool:
    """One cutting tool, in the shape the REST of the app understands.

    Common fields are real attributes. Everything that only some tools have
    goes in `attrs` (a dict), so a new attribute never needs a code change.
    """

    source: str                      # database file name, e.g. "Mills_Carbide.tooldb"
    tool_id: str
    name: str
    tool_type: str = ""
    diameter: float | None = None
    flutes: int | None = None
    material: str = ""
    vendor: str = ""
    attrs: dict[str, Any] = field(default_factory=dict)
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
"""Create fake tool databases so you can develop without the real ones.

    python tools/make_sample_data.py sample_data 6 400
                                     ^folder    ^files ^tools per file
"""
import random
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

TYPES = ["Flat End Mill", "Ball End Mill", "Bull Nose", "Drill", "Tap", "Chamfer Mill", "Face Mill"]
MATERIALS = ["Carbide", "HSS", "Cobalt", "Ceramic"]
VENDORS = ["Harvey", "Kennametal", "Sandvik", "OSG", "Helical"]
COATINGS = ["TiN", "TiAlN", "AlTiN", "Uncoated", "ZrN"]


def make_db(path: Path, count: int, rng: random.Random, file_no: int) -> None:
    if path.exists():
        path.unlink()
    with closing(sqlite3.connect(path)) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE tools (tool_id TEXT PRIMARY KEY, name TEXT, tool_type TEXT,
                                diameter REAL, flutes INTEGER, material TEXT, vendor TEXT);
            CREATE TABLE tool_attributes (tool_id TEXT, key TEXT, value TEXT);
            """
        )
        for n in range(1, count + 1):
            tid = f"{file_no}{n:04d}"
            ttype = rng.choice(TYPES)
            dia = round(rng.choice([0.0625, 0.125, 0.1875, 0.25, 0.375, 0.5, 0.75, 1.0]), 4)
            flutes = rng.choice([2, 3, 4, 5, 6]) if ttype != "Drill" else 2
            conn.execute(
                "INSERT INTO tools VALUES (?,?,?,?,?,?,?)",
                (tid, f'{dia:g}" {ttype} {n}', ttype, dia, flutes,
                 rng.choice(MATERIALS), rng.choice(VENDORS)),
            )
            attrs = {"coating": rng.choice(COATINGS), "overall_length": round(dia * rng.uniform(4, 8), 3)}
            if "Mill" in ttype or ttype == "Bull Nose":
                attrs["flute_length"] = round(dia * rng.uniform(1, 3), 3)
                attrs["helix_angle"] = rng.choice([30, 35, 38, 45])
            if ttype == "Bull Nose":
                attrs["corner_radius"] = rng.choice([0.01, 0.015, 0.03, 0.06])
            if ttype == "Drill":
                attrs["point_angle"] = rng.choice([118, 135, 140])
            if ttype == "Tap":
                attrs["thread_pitch"] = rng.choice(["1/4-20", "3/8-16", "M6x1.0", "M8x1.25"])
            if rng.random() < 0.15:
                attrs["comment"] = "Check wear before use"
            conn.executemany(
                "INSERT INTO tool_attributes VALUES (?,?,?)", [(tid, k, str(v)) for k, v in attrs.items()]
            )


if __name__ == "__main__":
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "sample_data")
    files = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    per_file = int(sys.argv[3]) if len(sys.argv) > 3 else 400
    folder.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42)                      # fixed seed: same data every run
    for i in range(1, files + 1):
        make_db(folder / f"Library_{i:02d}.tooldb", per_file, rng, i)
    print(f"Wrote {files} databases x {per_file} tools to {folder}")
```

Run it:

```
python tools/make_sample_data.py sample_data 6 400
```

That makes 6 files of 400 tools each in `sample_data/`. Open one with any SQLite viewer (DB Browser for SQLite is free) and look at the two tables.

### Step 6: `config.py`: where settings and the cache live

Your old app probably kept things next to the script. A *program* should keep per-user data in the user's app-data folder (`%APPDATA%\ToolViewer` on Windows), because the install folder may be read-only, and a packaged `.exe` unpacks into a temp folder that disappears.

```python
from __future__ import annotations

import json
import logging
import logging.handlers
import os
from dataclasses import asdict, dataclass
from pathlib import Path


def app_data_dir() -> Path:
    """Per-user folder for the cache, config and log. Created if missing."""
    base = os.environ.get("APPDATA") or str(Path.home() / ".local" / "share")
    path = Path(base) / "ToolViewer"
    path.mkdir(parents=True, exist_ok=True)
    return path


@dataclass
class Config:
    tools_folder: str = ""
    pattern: str = "*.tooldb"

    @classmethod
    def load(cls, path: Path) -> "Config":
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
            return cls(**known)
        except (FileNotFoundError, json.JSONDecodeError):
            return cls()

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(asdict(self), indent=2), encoding="utf-8")


def setup_logging(data_dir: Path) -> None:
    handler = logging.handlers.RotatingFileHandler(
        data_dir / "toolviewer.log", maxBytes=500_000, backupCount=3, encoding="utf-8"
    )
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(handler)
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
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from toolviewer.models import Tool


class ToolDbParser(Protocol):
    """The ONLY thing the rest of the app knows about reading a tool database."""

    def parse(self, path: Path) -> list[Tool]: ...
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
"""Stand-in parser for the sample databases made by tools/make_sample_data.py.

YOUR real Mastercam parser goes in a file like this one. As long as it has a
`parse(path) -> list[Tool]` method, nothing else in the app has to change.
"""
from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from toolviewer.models import Tool


def coerce(value: Any) -> Any:
    """Turn '12.5' into 12.5 and '3' into 3; leave real text alone."""
    if not isinstance(value, str):
        return value
    text = value.strip()
    try:
        return int(text)
    except ValueError:
        pass
    try:
        return float(text)
    except ValueError:
        return text


class SampleSqliteParser:
    def parse(self, path: Path) -> list[Tool]:
        uri = f"{path.resolve().as_uri()}?mode=ro"          # read-only: never modify the source
        with closing(sqlite3.connect(uri, uri=True)) as conn:
            conn.row_factory = sqlite3.Row

            attrs_by_tool: dict[str, dict[str, Any]] = {}
            for row in conn.execute("SELECT tool_id, key, value FROM tool_attributes"):
                attrs_by_tool.setdefault(row["tool_id"], {})[row["key"]] = coerce(row["value"])

            tools = []
            for row in conn.execute(
                "SELECT tool_id, name, tool_type, diameter, flutes, material, vendor FROM tools"
            ):
                tools.append(
                    Tool(
                        source=path.name,
                        tool_id=str(row["tool_id"]),
                        name=row["name"] or "",
                        tool_type=row["tool_type"] or "",
                        diameter=row["diameter"],
                        flutes=row["flutes"],
                        material=row["material"] or "",
                        vendor=row["vendor"] or "",
                        attrs=attrs_by_tool.get(str(row["tool_id"]), {}),
                    )
                )
            return tools
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
"""Change detection: which files are new, changed or gone?

Everything here is a pure function over plain data, so it is easy to test.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True, slots=True)
class FileStamp:
    path: str          # full path, used as the identity of the file
    mtime_ns: int      # last-modified time, in nanoseconds
    size: int


@dataclass
class Diff:
    added: list[str] = field(default_factory=list)
    changed: list[str] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not (self.added or self.changed or self.removed)


def scan(folder: Path, pattern: str) -> dict[str, FileStamp]:
    """Stat every matching file in the folder (cheap: it does not open them)."""
    stamps: dict[str, FileStamp] = {}
    for p in sorted(folder.glob(pattern)):
        if p.is_file():
            st = p.stat()
            stamps[str(p)] = FileStamp(str(p), st.st_mtime_ns, st.st_size)
    return stamps


def diff(old: dict[str, FileStamp], new: dict[str, FileStamp]) -> Diff:
    result = Diff()
    for path, stamp in new.items():
        if path not in old:
            result.added.append(path)
        elif old[path] != stamp:           # dataclass equality compares all fields
            result.changed.append(path)
    result.removed = [path for path in old if path not in new]
    return result
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
"""The cache: one SQLite file holding every tool from every source database."""
from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from toolviewer.manifest import FileStamp
from toolviewer.models import Tool

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    path       TEXT PRIMARY KEY,
    mtime_ns   INTEGER NOT NULL,
    size       INTEGER NOT NULL,
    parsed_at  TEXT NOT NULL,
    tool_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tools (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path TEXT NOT NULL,
    source      TEXT NOT NULL,
    tool_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    tool_type   TEXT NOT NULL DEFAULT '',
    diameter    REAL,
    flutes      INTEGER,
    material    TEXT NOT NULL DEFAULT '',
    vendor      TEXT NOT NULL DEFAULT '',
    attrs       TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_tools_source ON tools(source_path);
"""


class ToolStore:
    def __init__(self, db_path: Path):
        self._path = db_path

    def _connect(self) -> sqlite3.Connection:
        # A NEW connection per call: sqlite connections must stay on the thread that made them,
        # and pywebview calls our API from different threads.
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def initialize(self) -> None:
        with closing(self._connect()) as conn, conn:
            conn.executescript(SCHEMA)

    def get_manifest(self) -> dict[str, FileStamp]:
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT path, mtime_ns, size FROM sources")
            return {r["path"]: FileStamp(r["path"], r["mtime_ns"], r["size"]) for r in rows}

    def replace_source(self, stamp: FileStamp, tools: list[Tool]) -> None:
        """Swap ALL tools from one file in a single transaction (all-or-nothing)."""
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with closing(self._connect()) as conn, conn:        # `with conn` = commit or rollback
            conn.execute("DELETE FROM tools WHERE source_path = ?", (stamp.path,))
            conn.executemany(
                "INSERT INTO tools (source_path, source, tool_id, name, tool_type, diameter,"
                " flutes, material, vendor, attrs) VALUES (?,?,?,?,?,?,?,?,?,?)",
                [
                    (stamp.path, t.source, t.tool_id, t.name, t.tool_type, t.diameter,
                     t.flutes, t.material, t.vendor, json.dumps(t.attrs))
                    for t in tools
                ],
            )
            conn.execute(
                "INSERT INTO sources (path, mtime_ns, size, parsed_at, tool_count)"
                " VALUES (?,?,?,?,?)"
                " ON CONFLICT(path) DO UPDATE SET mtime_ns=excluded.mtime_ns,"
                " size=excluded.size, parsed_at=excluded.parsed_at, tool_count=excluded.tool_count",
                (stamp.path, stamp.mtime_ns, stamp.size, now, len(tools)),
            )

    def remove_source(self, path: str) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute("DELETE FROM tools WHERE source_path = ?", (path,))
            conn.execute("DELETE FROM sources WHERE path = ?", (path,))

    def all_tools(self) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT id, source, tool_id, name, tool_type, diameter, flutes, material,"
                " vendor, attrs FROM tools ORDER BY name"
            ).fetchall()
        result = []
        for r in rows:
            d = dict(r)                       # sqlite3.Row -> plain dict
            d["attrs"] = json.loads(d["attrs"])
            result.append(d)
        return result

    def summary(self) -> dict[str, Any]:
        with closing(self._connect()) as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS sources, COALESCE(SUM(tool_count),0) AS tools,"
                " MAX(parsed_at) AS last_parsed FROM sources"
            ).fetchone()
            return dict(row)
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
"""The use-cases of the app: scan the folder, refresh the cache, hand back data."""
from __future__ import annotations

import logging
import threading
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

from toolviewer import manifest
from toolviewer.config import Config
from toolviewer.parsing.base import ToolDbParser
from toolviewer.store import ToolStore

log = logging.getLogger(__name__)

ProgressFn = Callable[[int, int, str], None]       # (done, total, current file name)


class RefreshBusy(Exception):
    """A refresh is already running."""


@dataclass
class RefreshResult:
    added: int = 0
    changed: int = 0
    removed: int = 0
    failed: list[str] = field(default_factory=list)
    tool_count: int = 0

    @property
    def data_changed(self) -> bool:
        return bool(self.added or self.changed or self.removed)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["data_changed"] = self.data_changed
        return d


class ToolService:
    def __init__(self, store: ToolStore, parser: ToolDbParser, config: Config):
        self._store = store
        self._parser = parser
        self.config = config
        self._lock = threading.Lock()

    def refresh(self, on_progress: ProgressFn | None = None, force: bool = False) -> RefreshResult:
        if not self._lock.acquire(blocking=False):      # don't queue up; just say "busy"
            raise RefreshBusy()
        try:
            return self._refresh(on_progress, force)
        finally:
            self._lock.release()

    def _refresh(self, on_progress: ProgressFn | None, force: bool) -> RefreshResult:
        folder = Path(self.config.tools_folder)
        if not self.config.tools_folder or not folder.is_dir():
            raise FileNotFoundError(f"Tool folder not found: {self.config.tools_folder!r}")

        current = manifest.scan(folder, self.config.pattern)
        stored = self._store.get_manifest()
        d = manifest.diff({} if force else stored, current)   # force = pretend nothing is cached
        d.removed = [p for p in stored if p not in current]    # ...but still notice deleted files

        result = RefreshResult()
        todo = d.added + d.changed
        for i, path in enumerate(todo, start=1):
            if on_progress:
                on_progress(i, len(todo), Path(path).name)
            try:
                tools = self._parser.parse(Path(path))
                self._store.replace_source(current[path], tools)
                if path in d.added:
                    result.added += 1
                else:
                    result.changed += 1
            except Exception:                           # one bad file must not stop the rest
                log.exception("Failed to parse %s", path)
                result.failed.append(Path(path).name)

        for path in d.removed:
            self._store.remove_source(path)
            result.removed += 1

        result.tool_count = self._store.summary()["tools"]
        log.info("Refresh done: %s", result)
        return result

    def all_tools(self) -> list[dict]:
        return self._store.all_tools()

    def summary(self) -> dict:
        return self._store.summary()
```

### 10.5 Tests: how you know it works (and how you'll know after the next change)

Here is how the tests exercise this. Read them as examples of "test the behavior, not the implementation":

```python
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from toolviewer import manifest
from toolviewer.api import Api
from toolviewer.config import Config
from toolviewer.manifest import FileStamp
from toolviewer.models import Tool
from toolviewer.parsing.sample import SampleSqliteParser, coerce
from toolviewer.service import RefreshBusy, ToolService
from toolviewer.store import ToolStore
from tools.make_sample_data import make_db
import random


# ---------- manifest (pure functions: no files needed) ----------
def stamp(path, mtime=1, size=10):
    return FileStamp(path, mtime, size)


def test_diff_detects_added_changed_removed():
    old = {"a": stamp("a"), "b": stamp("b"), "c": stamp("c")}
    new = {"a": stamp("a"), "b": stamp("b", mtime=2), "d": stamp("d")}
    d = manifest.diff(old, new)
    assert d.added == ["d"] and d.changed == ["b"] and d.removed == ["c"]


def test_diff_empty_when_nothing_changed():
    same = {"a": stamp("a")}
    assert manifest.diff(same, dict(same)).is_empty


def test_scan_finds_only_matching_files(tmp_path):
    (tmp_path / "x.tooldb").write_bytes(b"1")
    (tmp_path / "y.txt").write_bytes(b"1")
    assert [Path(p).name for p in manifest.scan(tmp_path, "*.tooldb")] == ["x.tooldb"]


def test_coerce():
    assert coerce("3") == 3 and coerce("2.5") == 2.5 and coerce("TiN") == "TiN"


# ---------- fixtures ----------
@pytest.fixture
def lib(tmp_path):
    folder = tmp_path / "libs"
    folder.mkdir()
    rng = random.Random(1)
    make_db(folder / "A.tooldb", 20, rng, 1)
    make_db(folder / "B.tooldb", 10, rng, 2)
    return folder


@pytest.fixture
def service(tmp_path, lib):
    store = ToolStore(tmp_path / "cache.db")
    store.initialize()
    cfg = Config(tools_folder=str(lib))
    return ToolService(store, SampleSqliteParser(), cfg)


def test_parser_reads_attributes(lib):
    tools = SampleSqliteParser().parse(lib / "A.tooldb")
    assert len(tools) == 20
    assert all("coating" in t.attrs for t in tools)


def test_first_refresh_loads_everything(service):
    r = service.refresh()
    assert (r.added, r.changed, r.removed, r.tool_count) == (2, 0, 0, 30)
    assert len(service.all_tools()) == 30


def test_second_refresh_is_a_noop(service):
    service.refresh()
    r = service.refresh()
    assert not r.data_changed


def test_changed_and_removed_files(service, lib):
    service.refresh()
    make_db(lib / "A.tooldb", 5, random.Random(2), 1)
    st = (lib / "A.tooldb").stat()
    os.utime(lib / "A.tooldb", ns=(st.st_atime_ns, st.st_mtime_ns + 5_000_000_000))
    (lib / "B.tooldb").unlink()
    r = service.refresh()
    assert (r.changed, r.removed) == (1, 1)
    assert len(service.all_tools()) == 5


def test_force_rebuilds_but_still_removes(service, lib):
    service.refresh()
    (lib / "B.tooldb").unlink()
    r = service.refresh(force=True)
    assert r.added == 1 and r.removed == 1


def test_bad_file_is_reported_not_fatal(service, lib):
    (lib / "C.tooldb").write_bytes(b"not a database")
    r = service.refresh()
    assert r.failed == ["C.tooldb"] and r.added == 2


def test_busy_refresh_raises(service):
    service._lock.acquire()
    with pytest.raises(RefreshBusy):
        service.refresh()


def test_missing_folder_raises(tmp_path):
    store = ToolStore(tmp_path / "c.db")
    store.initialize()
    svc = ToolService(store, SampleSqliteParser(), Config(tools_folder=str(tmp_path / "nope")))
    with pytest.raises(FileNotFoundError):
        svc.refresh()


# ---------- api envelope ----------
def test_api_wraps_success_and_errors(service, tmp_path):
    events = []
    api = Api(service, tmp_path / "config.json", emit=lambda n, p: events.append((n, p)))
    assert api.get_tools() == {"ok": True, "data": []}
    api._run_refresh(False)
    names = [n for n, _ in events]
    assert names[0] == "refresh-started" and names[-1] == "refresh-done"
    assert len(api.get_tools()["data"]) == 30
    service.config.tools_folder = str(tmp_path / "missing")
    res = api.get_status()
    assert res["ok"] is True
    api._run_refresh(False)
    assert events[-1][0] == "refresh-error"
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
"""The bridge: the ONLY object JavaScript can call. Keep it thin.

Rules:
  * every public method (no leading underscore) becomes window.pywebview.api.<name>()
  * arguments and return values must be JSON-serializable (dict, list, str, int, float, bool, None)
  * private state starts with "_" so pywebview does not try to expose/inspect it
  * every method returns {"ok": True, "data": ...} or {"ok": False, "error": "..."}
"""
from __future__ import annotations

import csv
import json
import logging
import threading
from pathlib import Path
from typing import Any, Callable

from toolviewer.config import Config
from toolviewer.service import RefreshBusy, ToolService

log = logging.getLogger(__name__)


def _emit_to_window(name: str, payload: Any) -> None:
    """Push an event to JavaScript: calls App.onEvent(name, payload) in the page."""
    import webview                                   # imported late so tests don't need a GUI

    if not webview.windows:
        return
    script = f"App.onEvent({json.dumps(name)}, {json.dumps(payload)})"
    try:
        webview.windows[0].evaluate_js(script)
    except Exception:
        log.exception("Could not push event %s to the page", name)


class Api:
    def __init__(
        self,
        service: ToolService,
        config_path: Path,
        emit: Callable[[str, Any], None] = _emit_to_window,
    ):
        self._service = service
        self._config_path = config_path
        self._emit = emit

    # ---------- helpers ----------
    @staticmethod
    def _ok(data: Any = None) -> dict:
        return {"ok": True, "data": data}

    @staticmethod
    def _guard(fn: Callable[..., Any], *args: Any) -> dict:
        try:
            return {"ok": True, "data": fn(*args)}
        except Exception as exc:
            log.exception("API call failed: %s", getattr(fn, "__name__", fn))
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    # ---------- public API (callable from JavaScript) ----------
    def get_status(self) -> dict:
        def build():
            cfg = self._service.config
            return {"folder": cfg.tools_folder, "pattern": cfg.pattern, **self._service.summary()}

        return self._guard(build)

    def get_tools(self) -> dict:
        return self._guard(self._service.all_tools)

    def refresh(self, force: bool = False) -> dict:
        """Start a refresh in the background and return immediately."""
        def start():
            threading.Thread(target=self._run_refresh, args=(force,), daemon=True).start()
            return {"started": True}

        return self._guard(start)

    def choose_folder(self) -> dict:
        def pick():
            import webview

            picked = webview.windows[0].create_file_dialog(webview.FileDialog.FOLDER)
            if not picked:
                return {"changed": False}
            self._service.config.tools_folder = picked[0]
            self._service.config.save(self._config_path)
            return {"changed": True, "folder": picked[0]}

        return self._guard(pick)

    def export_csv(self, header: list, rows: list) -> dict:
        def write():
            import webview

            target = webview.windows[0].create_file_dialog(
                webview.FileDialog.SAVE, save_filename="tools.csv"
            )
            if not target:
                return {"saved": False}
            path = target if isinstance(target, str) else target[0]
            with open(path, "w", newline="", encoding="utf-8-sig") as f:   # utf-8-sig: Excel-friendly
                writer = csv.writer(f)
                writer.writerow(header)
                writer.writerows(rows)
            return {"saved": True, "path": str(path), "count": len(rows)}

        return self._guard(write)

    # ---------- private ----------
    def _run_refresh(self, force: bool) -> None:
        self._emit("refresh-started", {})
        try:
            result = self._service.refresh(
                on_progress=lambda done, total, name: self._emit(
                    "refresh-progress", {"done": done, "total": total, "name": name}
                ),
                force=force,
            )
            self._emit("refresh-done", result.to_dict())
        except RefreshBusy:
            self._emit("refresh-busy", {})
        except Exception as exc:
            log.exception("Refresh failed")
            self._emit("refresh-error", {"error": f"{type(exc).__name__}: {exc}"})
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
"""Entry point + composition root: the one place that decides which concrete classes to use."""
from __future__ import annotations

import sys
from pathlib import Path

import webview

from toolviewer.api import Api
from toolviewer.config import Config, app_data_dir, setup_logging
from toolviewer.parsing.sample import SampleSqliteParser      # <- swap in YOUR parser here
from toolviewer.service import ToolService
from toolviewer.store import ToolStore

DEBUG = True      # opens the browser dev tools (right-click -> Inspect). Set False for release.


def resource_path(relative: str) -> str:
    """Works both from source and from a PyInstaller bundle."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return str(base / relative)


def main() -> None:
    data_dir = app_data_dir()
    setup_logging(data_dir)

    config_path = data_dir / "config.json"
    config = Config.load(config_path)

    store = ToolStore(data_dir / "cache.db")
    store.initialize()

    service = ToolService(store, SampleSqliteParser(), config)
    api = Api(service, config_path)

    webview.create_window(
        "Tool Viewer",
        resource_path("frontend/index.html"),
        js_api=api,
        width=1400,
        height=850,
        min_size=(900, 600),
        text_select=True,          # pywebview disables text selection by default!
    )
    webview.start(debug=DEBUG)


if __name__ == "__main__":
    main()
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

## Chapter 12: Frontend foundation: `util.js` and `bridge.js`

You now have a working Python half. Time to build the page, from the bottom up: first the two small files everything else depends on.

### 12.1 `util.js`: four helpers

You met `h()` and `debounce()` in Chapters 4 and 5. Here is the whole file, with the one helper not yet explained:

```js
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
plural(1, 'tool', 'tools')      // '1 tool'
plural(2400, 'tool', 'tools')   // '2,400 tools'
```

Full listing:

```js
/* Small helpers shared by everything. Loaded first. */
(function (App) {
  'use strict';

  /**
   * h('div', {class: 'x', onclick: fn}, 'text', childElement)
   * Builds DOM elements WITHOUT innerHTML, so user text can never become markup.
   */
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === false || value == null) continue;
      if (key === 'class') el.className = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value') el.value = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;   // append(null) would add the text "null"
      el.append(child);                                  // strings become safe text nodes
    }
    return el;
  }

  /** Run fn at most once per `ms` of quiet. Stops us filtering 50k rows on every keystroke. */
  function debounce(fn, ms = 200) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  /** '' / '  ' / 'abc' -> null, otherwise a number. (Number('') is 0 in JS: a classic trap.) */
  function toNumber(text) {
    if (text == null || String(text).trim() === '') return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

  App.util = { h, debounce, toNumber, plural };
})(window.App = window.App || {});
```

Look at the last two lines: `App.util = { h, debounce, toNumber, plural }` *publishes* these four functions on the shared namespace; everything else in the file is private (Chapter 4.13). Other files then pull what they need with **destructuring**: `const { h } = App.util;`.

**Checkpoint:** with `util.js` loaded in a page, open the console and run `App.util.h('b', {}, 'hi')`; you get a `<b>` element. `App.util.toNumber('')` gives `null`, `App.util.toNumber('12.5')` gives `12.5`.

### 12.2 `bridge.js`: the only file that knows about Python

**Rule:** nothing else in the front end may touch `window.pywebview`. Why? When you someday run this front end in a plain browser for development (with a fake backend), or change how you talk to Python, there is **one** file to change.

Build it in three steps.

**Step 1: wait for the bridge.** (Chapter 3, Step 5.) `window.pywebview.api` doesn't exist until pywebview fires `pywebviewready`.

```js
function whenReady() {
  return new Promise((resolve) => {
    if (window.pywebview && window.pywebview.api) resolve();            // already there
    else window.addEventListener('pywebviewready', () => resolve(), { once: true });
  });
}
```

Both branches matter: if the bridge became ready *before* this code ran, the event already fired and would never fire again, so we check first. `{ once: true }` removes the listener after it fires.

**Step 2: one function for every call, which unwraps the envelope.**

```js
async function call(method, ...args) {
  await whenReady();
  const res = await window.pywebview.api[method](...args);
  if (!res.ok) throw new Error(res.error || 'Unknown error from Python');
  return res.data;
}
```

- `api[method]` is dynamic access: `call('get_tools')` runs `pywebview.api.get_tools()`.
- `...args` collects arguments; `(...args)` spreads them into the real call.
- Everything that uses `call` just `await`s the data and uses `try/catch` for errors. No one else has to remember the envelope.

**Step 3: an event hub for pushes from Python.**

```js
const listeners = {};
function on(name, fn) { (listeners[name] ||= []).push(fn); }
function onEvent(name, payload) { (listeners[name] || []).forEach((fn) => fn(payload)); }
App.onEvent = onEvent;
```

- `listeners` is `{ 'refresh-done': [fn, fn], ... }`, a dict of lists.
- `x ||= []` means "if `x` is falsy, set it to `[]`" (Python's `setdefault`).
- `App.onEvent` is what Python's `evaluate_js("App.onEvent(...)")` calls. It has to be reachable by name from global scope, which `App.onEvent` is.

```js
/* The ONLY file that knows how to talk to Python. */
(function (App) {
  'use strict';

  /** Resolves once window.pywebview.api exists (it appears slightly after the page loads). */
  function whenReady() {
    return new Promise((resolve) => {
      if (window.pywebview && window.pywebview.api) resolve();
      else window.addEventListener('pywebviewready', () => resolve(), { once: true });
    });
  }

  /** call('get_tools') -> data, or throws an Error with Python's message. */
  async function call(method, ...args) {
    await whenReady();
    const res = await window.pywebview.api[method](...args);
    if (!res.ok) throw new Error(res.error || 'Unknown error from Python');
    return res.data;
  }

  // Tiny event hub: Python pushes events with App.onEvent(name, payload).
  const listeners = {};
  function on(name, fn) {
    (listeners[name] ||= []).push(fn);
  }
  function onEvent(name, payload) {
    (listeners[name] || []).forEach((fn) => fn(payload));
  }

  App.bridge = { call, on };
  App.onEvent = onEvent;      // Python calls this by name, so it must be global
})(window.App = window.App || {});
```

### 12.3 Develop without Python: a fake bridge (optional but great)

Because only `bridge.js` knows about pywebview, you can open `index.html` in an ordinary browser with a stub that fakes `window.pywebview.api`, and iterate on CSS and layout with instant reload. A minimal stub:

```js
// dev-stub.js (load BEFORE the other scripts, development only)
window.pywebview = { api: {
  get_status: async () => ({ ok: true, data: { folder: 'demo', pattern: '*', sources: 2, tools: 3, last_parsed: null } }),
  get_tools:  async () => ({ ok: true, data: [
    { id: 1, source: 'A', tool_id: 'T1', name: 'Flat 1/4', tool_type: 'Flat End Mill', diameter: 0.25, flutes: 4, material: 'Carbide', vendor: 'Harvey', attrs: { coating: 'TiN' } },
  ] }),
  refresh: async () => ({ ok: true, data: { started: true } }),
} };
```

This is how my headless test drove the real front end (it loads `index.html` in Chromium with a mock like this).

---

## Chapter 13: DataTables, one idea at a time

### 13.1 What DataTables is (and isn't)

DataTables takes an `<table>` and gives it **paging, sorting, searching, column visibility, and row detail panels**. It works on your **data** (an array of objects); the HTML rows it shows are *generated from that data and are disposable.*

Versions: you probably have **1.x** in your old apps. This project uses **2.x or 3.x** (tested 2.3.8 and 3.1.5). The big changes: `new DataTable(...)` without jQuery; the `layout` option replaced `dom`; and a few internals were renamed. Appendix A has the 1.x → 2/3 table.

### 13.2 Step 1: a table from an array of objects

Make a throwaway page (`dt1.html`) next to the `vendor/` folder:

```html
<link rel="stylesheet" href="frontend/vendor/datatables.min.css">
<table id="t"></table>
<script src="frontend/vendor/datatables.min.js"></script>
<script>
  const rows = [
    { name: 'Flat 1/4', dia: 0.25, flutes: 4 },
    { name: 'Drill 1/2', dia: 0.5, flutes: 2 },
  ];
  new DataTable('#t', {
    data: rows,
    columns: [
      { title: 'Name',   data: 'name' },
      { title: 'Dia',    data: 'dia' },
      { title: 'Flutes', data: 'flutes' },
    ],
  });
</script>
```

You get a table with search, paging and sorting. Read the pieces:

- `data`: the array of row objects.
- `columns`: one entry per column. **`title`** is the header text; **`data`** says *where in each row object to find the value*.

### 13.3 Step 2: `data` can be a *function*

```js
{ title: 'Helix', data: (row) => row.attrs.helix_angle ?? '' }
```

Why does Tool Viewer use a function for every column? Because attribute names come from your databases and can contain **dots or spaces** (`"Corner Radius"`, `"a.b"`). With a string `data: 'attrs.Corner Radius'`, DataTables treats the dot as a path separator and the name as a property path; weird names silently fail. A function always works: it takes the row, returns the value.

Returning `''` for missing values (`?? ''`) matters: if `data` returns `undefined`/`null`, DataTables shows a **warning dialog** ("Requested unknown parameter"). (`defaultContent` is another way to cover this.)

### 13.4 Step 3: **orthogonal data**: the value you sort isn't the text you show

```js
{ title: 'Dia', data: (r) => r.diameter ?? '', type: 'num',
  render: (value, type) => (type === 'display' && typeof value === 'number' ? value.toFixed(4) : value) }
```

DataTables asks the `render` function for the same cell *in several modes*: `'display'` (what to show), `'sort'`, `'filter'` (search text), `'type'`. In `display` mode we format to 4 decimals (`0.2500`), but sorting and filtering get the **raw number**. This is the cure for the classic "my numbers sort as text" and "my formatted values won't sort right."

`type: 'num'` tells DataTables to sort the column numerically (and treats empty strings sensibly); without it, it guesses from the first rows, which goes wrong when the first rows are blank.

### 13.5 Step 4: layout, paging, order

```js
new DataTable('#tools', {
  pageLength: 50,
  scrollX: true,
  order: [[1, 'asc']],
  layout: { topStart: 'pageLength', topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
});
```

- `pageLength: 50`: rows per page (with the page-size dropdown at `topStart`).
- `scrollX: true`: lets the table be wider than its container and scroll sideways (essential with many attribute columns).
- `order: [[1, 'asc']]`: sort by column **index** 1 initially. (Indexes shift when columns are added; if you reorder columns, revisit this.)
- `layout`: **where the controls go.** `topEnd: null` removes the built-in search box, since we have our own filter sidebar. (In DataTables 1.x this was `dom: 'lfrtip'`.)

### 13.6 Step 5: `rowId`, and getting data back out

```js
const table = new DataTable('#tools', { data: rows, rowId: 'id', ... });
table.rows().count()                         // all rows
table.rows({ search: 'applied' }).count()    // rows passing the current filters
table.rows({ search: 'applied', order: 'applied' }).data().toArray()  // in the displayed order
table.row(trElement).data()                  // the object behind a clicked <tr>
```

Remember Chapter 5.12: **ask the table's data, not the DOM**; only the current page has `<tr>`s.

### 13.7 Step 6: custom filtering: the key to the whole project

DataTables has its own search box, which finds text in visible cells. We want regex, multi-select dropdowns, ranges, and attribute rules, so we add a **custom search function**: DataTables calls it **once per row on every redraw**, and keeps the row if it returns `true`.

```js
dt.search.fixed('toolFilters', (searchText, rowData) => App.filters.test(rowData));
dt.draw(false);
```

- `search.fixed(name, fn)` registers a function **for this table only** (DataTables 2.x/3.x). `fn(searchText, rowData)` receives the **original row object**, our full row including `attrs`, not just the displayed strings. That's what makes filtering on hidden attribute columns possible.
- `draw(false)` re-applies everything. The `false` means "stay on the current page" (the default `true` jumps back to page 1).

> **The legacy way**, which you'll see in old code: `$.fn.dataTable.ext.search.push(function (settings, searchData, dataIndex, rowData, counter) { ... return true/false })`. It's *global* (affects every table on the page, so you must check `settings.nTable.id`) and **the internals changed between versions**: in DataTables 3 `settings.nTable` was renamed `settings.table`, which crashed my first version when I ran it on DT3. `search.fixed` works the same on 2.x and 3.x and has no such trap, which is why the project uses it. Appendix A covers both.

### 13.8 Step 7: replace the data without rebuilding

New data arrives (a refresh found changes). The cheap path:

```js
dt.clear();
dt.rows.add(rows);
dt.draw(false);       // keep the page the user is on
```

The expensive path is `destroy()` and rebuild, needed **only when the columns change** (a new attribute key appeared). The project keeps a `signature` string of the attribute keys and compares:

```js
function setData(rows, attrKeys) {
  if (!dt || attrKeys.join('|') !== signature) build(rows, attrKeys);
  else { dt.clear(); dt.rows.add(rows); dt.draw(false); }
  renderColumnMenu();
}
```

**Rebuild gotcha:** `dt.destroy()` restores the original `<table>` but **leaves the `<thead>` that DataTables generated**, and building again can duplicate or mix up headers. So: `dt.destroy(); tableEl().replaceChildren();` (empty the table element). Without it, rebuilding can leave stale header markup behind; the code comment in `build()` records why the line is there.

### 13.9 Step 8: dynamic columns (one per attribute key)

Your databases define attributes per tool type, so the *set of columns* depends on the data. The project builds a **column definition list** (`defs`) = the 8 fixed columns + one per attribute key found in the data, sorted by how many tools have it. Each def has:

```js
{ id: 'attr:coating', title: 'coating', get: (r) => r.attrs.coating, visible: false, type: 'string' }
```

- `get` is how to read the value (used by the table **and** by CSV export, so the export always matches what you see).
- Attribute columns start **hidden** (`visible: false`); a "Columns" menu toggles them. 100 columns shown at once is useless.
- `isNumericAttr(key, rows)` samples up to 200 rows: if every non-empty value is a number, the column is typed `'num'` so it right-aligns and sorts numerically. (Don't scan all 50,000 rows to decide a column type.)
- `visibility`, a `Map` from column id → visible, **survives rebuilds**, so toggling a column on doesn't reset when a refresh adds a new attribute.

### 13.10 Step 9: row detail panels (and event delegation)

Click a row, see **all** its attributes below it. DataTables calls these *child rows*:

```js
const row = dt.row(tr);
row.child(detailNode(row.data())).show();    // open
row.child.hide();                            // close
row.child.isShown();                         // boolean
```

The click handler is attached **once, on the `<table>` element** (delegation, Chapter 5.7), because rows are constantly created and destroyed:

```js
tableEl().addEventListener('click', (e) => {
  if (e.target.closest('.detail')) return;     // ignore clicks INSIDE an open detail panel
  const tr = e.target.closest('tbody tr');
  ...
});
```

Two bugs found while testing, so you can recognize them:

1. Clicking *inside* an open panel closed it (the click bubbled up to the table's handler). Fix: the `.detail` check on the first line.
2. The row's highlight class stayed after closing. Fix: `row.node().classList.toggle('shown', open)`, setting it from the state we just computed rather than assuming.

`detailNode()` builds the panel with `h()` (so attribute **values are inserted as text**, safe even if a value contains `<`).

### 13.11 Step 10: column visibility

```js
dt.column(i).visible(true, false);     // show column i; `false` = don't redraw yet
dt.columns.adjust().draw(false);       // re-measure widths, then redraw once
```

Skipping `columns.adjust()` is the classic "header is misaligned with body after I show a column" bug with `scrollX`. (Table of symptoms is in Chapter 16.)

### Complete listing: `frontend/js/table.js`

```js
/* Everything DataTables lives here. The rest of the app never touches it directly. */
(function (App) {
  'use strict';
  const { h } = App.util;

  const numFormat = (digits) => (value, type) =>
    type === 'display' && typeof value === 'number' ? value.toFixed(digits) : value;

  // Fixed columns. `get` pulls the value out of a row object; the table AND export use it.
  const FIXED = [
    { id: 'tool_id',   title: 'Tool #',   get: (r) => r.tool_id,   visible: true },
    { id: 'name',      title: 'Name',     get: (r) => r.name,      visible: true },
    { id: 'tool_type', title: 'Type',     get: (r) => r.tool_type, visible: true },
    { id: 'diameter',  title: 'Dia',      get: (r) => r.diameter,  visible: true, type: 'num', render: numFormat(4) },
    { id: 'flutes',    title: 'Flutes',   get: (r) => r.flutes,    visible: true, type: 'num' },
    { id: 'material',  title: 'Material', get: (r) => r.material,  visible: true },
    { id: 'vendor',    title: 'Vendor',   get: (r) => r.vendor,    visible: true },
    { id: 'source',    title: 'Database', get: (r) => r.source,    visible: true },
  ];

  let dt = null;                    // the DataTables API object
  let defs = [];                    // our column definitions (fixed + one per attribute key)
  let signature = '';               // changes when the set of attribute keys changes
  const visibility = new Map();     // column id -> visible? (survives rebuilds)
  let drawCallback = () => {};
  const tableEl = () => document.getElementById('tools');

  function isNumericAttr(key, rows) {
    let seen = 0;
    for (const r of rows) {
      const v = r.attrs[key];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v !== 'number') return false;
      if (++seen >= 200) break;              // sampling is enough
    }
    return seen > 0;
  }

  function buildDefs(rows, attrKeys) {
    const attrDefs = attrKeys.map((key) => ({
      id: `attr:${key}`, title: key, get: (r) => r.attrs[key],
      visible: false, type: isNumericAttr(key, rows) ? 'num' : 'string',
    }));
    return [...FIXED, ...attrDefs].map((d) => ({ ...d, visible: visibility.get(d.id) ?? d.visible }));
  }

  function build(rows, attrKeys) {
    if (dt) {
      dt.destroy();
      tableEl().replaceChildren();           // DataTables leaves the thead it generated behind
    }
    defs = buildDefs(rows, attrKeys);
    signature = attrKeys.join('|');

    dt = new DataTable('#tools', {
      data: rows,
      columns: defs.map((d) => ({
        title: d.title,
        data: (row) => d.get(row) ?? '',      // a function, so attribute names with dots/spaces are safe
        type: d.type === 'num' ? 'num' : 'string',
        render: d.render,
        visible: d.visible,
        className: d.type === 'num' ? 'num' : '',
      })),
      rowId: 'id',
      pageLength: 50,
      scrollX: true,
      order: [[1, 'asc']],
      layout: { topStart: 'pageLength', topEnd: null, bottomStart: 'info', bottomEnd: 'paging' },
      language: { zeroRecords: 'No tools match the current filters', emptyTable: 'No tools loaded yet' },
    });
    dt.on('draw', () => drawCallback());

    // A named search function attached to THIS table: it runs for every row on every draw().
    // The 2nd argument is our original row object.
    dt.search.fixed('toolFilters', (searchText, rowData) => App.filters.test(rowData));
    dt.draw(false);                           // apply it now (filters may already be active)
  }

  /** Replace the table's data. Rebuild only if the attribute columns changed. */
  function setData(rows, attrKeys) {
    if (!dt || attrKeys.join('|') !== signature) {
      build(rows, attrKeys);
    } else {
      dt.clear();
      dt.rows.add(rows);
      dt.draw(false);                         // false = keep the current page
    }
    renderColumnMenu();
  }

  function detailNode(row) {
    const entries = Object.entries(row.attrs);
    return h('div', { class: 'detail' },
      entries.length
        ? h('dl', {}, entries.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))
        : 'No extra attributes.');
  }

  function renderColumnMenu() {
    const body = document.getElementById('colmenu-body');
    body.replaceChildren(
      ...defs.map((d, i) =>
        h('label', {},
          h('input', {
            type: 'checkbox', checked: d.visible,
            onchange: (e) => {
              d.visible = e.target.checked;
              visibility.set(d.id, d.visible);
              dt.column(i).visible(d.visible, false);
              dt.columns.adjust().draw(false);
            },
          }),
          d.title)),
    );
  }

  function init({ onDraw }) {
    drawCallback = onDraw;

    // Event delegation: listen on the stable <table>, not on rows (rows are created/destroyed).
    tableEl().addEventListener('click', (e) => {
      if (e.target.closest('.detail')) return;   // clicks inside an open panel do nothing
      const tr = e.target.closest('tbody tr');
      if (!tr || !dt) return;
      const row = dt.row(tr);
      if (!row.any()) return;
      const open = !row.child.isShown();
      if (open) row.child(detailNode(row.data())).show();
      else row.child.hide();
      row.node().classList.toggle('shown', open);
    });
  }

  App.table = {
    init, setData,
    redraw: () => dt && dt.draw(),
    counts: () => (dt ? { shown: dt.rows({ search: 'applied' }).count(), total: dt.rows().count() } : { shown: 0, total: 0 }),
    exportData() {
      const visible = defs.filter((d) => d.visible);
      const rows = dt.rows({ search: 'applied', order: 'applied' }).data().toArray();
      return { header: visible.map((d) => d.title), rows: rows.map((r) => visible.map((d) => d.get(r) ?? '')) };
    },
  };
})(window.App = window.App || {});
```

Public surface (the *only* things the rest of the app may use): `init`, `setData`, `redraw`, `counts`, `exportData`. **No other file touches `DataTable`.** When you upgrade DataTables someday, this is the one file to fix.

**Checkpoint:** with all scripts in place (after Chapter 15) you can already test the table from the console: `App.table.counts()`.

### Exercises (Chapter 13)

1. Add a column "Dia (mm)" computed as `diameter * 25.4`, rendered with 3 decimals. (A new entry in `FIXED`, with `get` doing the math.)
2. Make rows whose `flutes` is `null` show a `—` (em dash) via `render`.
3. Use `createdRow: (tr, data) => ...` to add a CSS class `row-hss` to HSS tools and style it in `app.css`.
4. Change the page-length options to `[25, 50, 100, -1]` (-1 = all) using `lengthMenu`.
5. Save and restore the user's column choices through Python: add `save_prefs`/`load_prefs` API methods writing JSON in the data folder. (Remember Chapter 5.10: don't use `localStorage` here.)

---

## Chapter 14: The filter engine

This is the part of the app your old version couldn't do: regex, multi-select dropdowns, ranges, and rules on attribute dictionaries. It's also the best example in the project of *good JavaScript architecture*, so go slowly.

### 14.1 The design in one sentence

> **One plain-data `state` object → compiled once into a `predicate(row) → true/false` → the table asks the predicate about each row.**

Three layers:

| Layer | Knows about | Doesn't know about |
|---|---|---|
| **State** (`emptyState`) | what the user chose, as plain data | the DOM, the table |
| **Compiler** (`buildPredicate`) | turning state into functions | the DOM, the table |
| **UI** (`mount`, `render*`) | building controls and changing state | how filtering works |

Because the state and compiler know nothing about the DOM, **the whole engine is unit-testable in Node** with no browser (see 14.9).

### 14.2 Step 1: configuration, not code

```js
const DROPDOWNS = [
  { field: 'tool_type', label: 'Tool type' },
  { field: 'material',  label: 'Material' },
  ...
];
const RANGES = [ { field: 'diameter', label: 'Diameter' }, { field: 'flutes', label: 'Flutes' } ];
```

To add a dropdown filter for `vendor`, you add **one line** here. The state, the compiler, the UI and the chips all loop over these arrays. This is the "data-driven" approach: describe *what* you want in a table, write the generic machinery *once*.

### 14.3 Step 2: the state

```js
function emptyState() {
  return {
    text: '', regex: false, matchCase: false, scope: 'all',
    select: { tool_type: new Set(), material: new Set(), ... },   // built from DROPDOWNS
    range:  { diameter: {min: null, max: null}, ... },            // built from RANGES
    rules:  [],                                                    // [{key, op, value}]
  };
}
```

`Set` for the selected dropdown values: O(1) "is this selected?" and no duplicates (like Python's `set`). `null` (not `0`, not `''`) means "no bound". That distinction is the entire reason `toNumber` exists.

"Clear all" is then `state = emptyState()`. Resetting becomes one line because the state is one object.

### 14.4 Step 3: compile text search (with optional regex)

```js
function compileText(state) {
  const text = state.text.trim();
  if (!text) return null;                      // nothing typed: no test needed
  const get = state.scope === 'all' ? (r) => r._hay : (r) => String(r[state.scope] ?? '');
  if (state.regex) {
    const re = new RegExp(text, state.matchCase ? '' : 'i');   // throws if invalid
    return (r) => re.test(get(r));
  }
  const needle = state.matchCase ? text : text.toLowerCase();
  return (r) => (state.matchCase ? get(r) : get(r).toLowerCase()).includes(needle);
}
```

Ideas to absorb:

- **Compile once, run 50,000 times.** `new RegExp(...)` happens *once* when the state changes, not per row. A function that *returns a function* (a closure) is how you precompute.
- **`_hay`**: for "search everything" we precompute, per row, one string of all its searchable values (done once in `main.js`, `prepare()`). Then "everything" is one `.test()` or `.includes()` per row, instead of looping over 30 attributes per row per keystroke.
- **No `g` flag**, ever (Chapter 4.14, the stateful `lastIndex` trap). With `g`, the same row could match on one redraw and fail the next.
- **Invalid regex**: `new RegExp('(')` throws `SyntaxError`. `compileText` lets it propagate, and the *caller* catches it (next step). The user types `(` on the way to `(a|b)`, so this happens constantly while typing!

### 14.5 Step 4: compile attribute rules

A rule is `{key: 'helix_angle', op: 'gt', value: '30'}`: "attribute helix_angle greater than 30".

```js
const hasValue = (v) => v !== undefined && v !== null && v !== '';
```

Every operator starts with "does this tool even *have* the attribute?", because attributes are sparse (a drill has no helix angle). Then:

| op | meaning |
|---|---|
| `exists` / `missing` | has / doesn't have a value |
| `eq` / `ne` | equal (numbers compare as numbers, text case-insensitively) / not equal |
| `contains` | substring, case-insensitive |
| `regex` | regular expression |
| `gt` / `lt` | numeric comparison; rows without a numeric value never match |

The trap lives in `gt`/`lt`:

```js
if (!hasValue(v) || !Number.isFinite(Number(v))) return false;   // check FIRST
return rule.op === 'gt' ? Number(v) > num : Number(v) < num;
```

`Number(null)` is `0` and `Number('')` is `0` (Chapter 4.6). Without the `hasValue` check, a tool with *no* helix angle would count as helix `0`, and `helix < 30` would wrongly include every tool that lacks the attribute. (Test: `numeric < ignores missing (null is not 0)`.)

`switch (rule.op)` picks the right compiled function. A rule that can't be compiled (like `gt` with non-numeric text) returns `null`, meaning "ignore this rule", rather than "match nothing".

### 14.6 Step 5: combine into one predicate

```js
function buildPredicate(state) {
  const tests = [];  const errors = [];
  try { const t = compileText(state); if (t) tests.push(t); }
  catch (e) { errors.push(`Invalid regex: ${e.message}`); }       // ignore just this filter
  for (const d of DROPDOWNS) { const chosen = state.select[d.field]; if (chosen.size) tests.push((r) => chosen.has(r[d.field] ?? '')); }
  for (const g of RANGES) { ... }
  for (const rule of state.rules) { ... try { compileRule(rule) } catch ... }
  return { test: (row) => tests.every((t) => t(row)), active: tests.length > 0, error: errors.join('  ') || null };
}
```

- Only the filters the user actually set become tests. **No filters → `tests` is empty → `every` of nothing is `true` → all rows pass.** (Python's `all([])` is also `True`.)
- The test is an **AND** of everything: row must pass *all* filters. Within a multi-select it's an **OR** (any of the chosen values), which is `chosen.has(value)`.
- **Errors never stop the others.** A half-typed regex produces an error *message* and drops only that test; the dropdowns still work. The UI shows the message in red under the box.

### 14.7 Step 6: the UI pieces

**State flows one way:** controls → `state` → `change()` → recompile → redraw.

```js
function change() {
  compiled = buildPredicate(state);
  renderError();
  renderChips();
  changeListeners.forEach((fn) => fn());     // tells main.js, which redraws the table
}
const changeSoon = debounce(change, 200);    // for typing
```

Which events call which: **typing** (`input`) → `changeSoon()` (debounced); **checkbox/select** (`change`) → `change()` (immediately, because they're discrete choices).

**The multi-select dropdown** is a `<details>` element (free open/close, no JS) containing a list of checkbox labels with counts:

```js
function multiSelect(def) {
  const summary = h('summary', { class: 'btn' });
  const body = h('div', { class: 'menu-body' });
  const root = h('details', { class: 'menu' }, summary, body);
  ...
  function render() { /* counts per value from the CURRENT rows, checkboxes reflect state */ }
  return { root, render };
}
```

Notes:

- The *options come from the data* (`countBy(rows, field)`), so a new material appears automatically. `value || '(blank)'` labels empty strings.
- `render()` is called again when new data arrives (`setRows`), so counts and options stay current **without recreating the controls**.
- **A checked box that survives a refresh:** the `checked` property is set from `chosen().has(value)` on every `render()`, so the selection (which lives in `state`, not in the DOM) is the single source of truth.

**Range fields** convert with `toNumber` so an empty box is `null` rather than `0` (this is exactly the bug the helper prevents). **Attribute rules** are a list of rows each with `<select>` attribute, `<select>` operator, `<input>` value, Remove button. `renderRules()` rebuilds that list when rules are added/removed or an operator changes (some operators don't need a value input).

**Chips** (the little "Material: HSS ×" tags at the top) come from a `describe()` function that turns the state back into a list of `{label, clear}`; `clear` is a function that undoes that piece. Clicking × calls `clear()`, then `renderControls()` (so the checkbox unticks), then `change()`.

**Why not just rebuild everything with each change?** Chapter 5.8: you'd lose focus while typing. So controls are built **once** in `mount()`, updated by `render*()` calls, and `renderControls()` (rebuild-from-state) is used **only** for "Clear all" and chip removal.

### 14.8 Step 7: the public surface

```js
App.filters = {
  mount, setRows,
  test: (row) => compiled.test(row),       // what the table calls for each row
  isActive: () => compiled.active,
  onChange: (fn) => changeListeners.push(fn),
  _buildPredicate: buildPredicate, _emptyState: emptyState,   // underscore = "for tests only"
};
```

### Complete listing: `frontend/js/filters.js`

```js
/* Filters: one state object -> one predicate function -> the table asks it "does this row pass?" */
(function (App) {
  'use strict';
  const { h, debounce, toNumber } = App.util;

  // ---------- 1. Configuration: add a filter by adding a line here ----------
  const DROPDOWNS = [
    { field: 'tool_type', label: 'Tool type' },
    { field: 'material',  label: 'Material' },
    { field: 'vendor',    label: 'Vendor' },
    { field: 'source',    label: 'Database' },
  ];
  const RANGES = [
    { field: 'diameter', label: 'Diameter' },
    { field: 'flutes',   label: 'Flutes' },
  ];
  const SCOPES = [
    ['all', 'Everything'], ['name', 'Name'], ['tool_id', 'Tool #'],
    ['tool_type', 'Type'], ['material', 'Material'], ['vendor', 'Vendor'],
  ];
  const OPS = [
    ['eq', 'equals'], ['ne', 'not equal'], ['contains', 'contains'], ['regex', 'matches regex'],
    ['gt', '>'], ['lt', '<'], ['exists', 'has a value'], ['missing', 'is empty'],
  ];
  const OPS_WITHOUT_VALUE = new Set(['exists', 'missing']);

  // ---------- 2. State: plain data, nothing about the DOM ----------
  function emptyState() {
    return {
      text: '', regex: false, matchCase: false, scope: 'all',
      select: Object.fromEntries(DROPDOWNS.map((d) => [d.field, new Set()])),
      range: Object.fromEntries(RANGES.map((r) => [r.field, { min: null, max: null }])),
      rules: [],                                   // [{key, op, value}]
    };
  }

  // ---------- 3. Compile state -> predicate (PURE: easy to test, no DOM) ----------
  const hasValue = (v) => v !== undefined && v !== null && v !== '';

  function compileText(state) {
    const text = state.text.trim();
    if (!text) return null;
    const get = state.scope === 'all' ? (r) => r._hay : (r) => String(r[state.scope] ?? '');
    if (state.regex) {
      const re = new RegExp(text, state.matchCase ? '' : 'i');   // throws if invalid; caller catches
      return (r) => re.test(get(r));                              // never add the 'g' flag here!
    }
    const needle = state.matchCase ? text : text.toLowerCase();
    return (r) => {
      const hay = get(r);
      return (state.matchCase ? hay : hay.toLowerCase()).includes(needle);
    };
  }

  function compileRule(rule) {
    const val = (r) => r.attrs[rule.key];
    const text = String(rule.value ?? '').trim();
    const lower = text.toLowerCase();
    const num = toNumber(text);
    const equals = (v) =>
      hasValue(v) && (num !== null && typeof v === 'number' ? v === num : String(v).toLowerCase() === lower);

    switch (rule.op) {
      case 'exists':   return (r) => hasValue(val(r));
      case 'missing':  return (r) => !hasValue(val(r));
      case 'eq':       return (r) => equals(val(r));
      case 'ne':       return (r) => !equals(val(r));
      case 'contains': return (r) => hasValue(val(r)) && String(val(r)).toLowerCase().includes(lower);
      case 'regex': {
        const re = new RegExp(text, 'i');
        return (r) => hasValue(val(r)) && re.test(String(val(r)));
      }
      case 'gt':
      case 'lt': {
        if (num === null) return null;
        return (r) => {
          const v = val(r);
          // Number(null) is 0 and Number('') is 0 -> check for "no value" FIRST.
          if (!hasValue(v) || !Number.isFinite(Number(v))) return false;
          return rule.op === 'gt' ? Number(v) > num : Number(v) < num;
        };
      }
      default: return null;
    }
  }

  function buildPredicate(state) {
    const tests = [];
    const errors = [];

    try {
      const t = compileText(state);
      if (t) tests.push(t);
    } catch (e) {
      errors.push(`Invalid regex: ${e.message}`);           // keep going: ignore just this part
    }

    for (const d of DROPDOWNS) {
      const chosen = state.select[d.field];
      if (chosen.size) tests.push((r) => chosen.has(r[d.field] ?? ''));
    }

    for (const g of RANGES) {
      const { min, max } = state.range[g.field];
      if (min === null && max === null) continue;
      tests.push((r) => {
        const v = r[g.field];
        if (v === null || v === undefined) return false;
        return (min === null || v >= min) && (max === null || v <= max);
      });
    }

    for (const rule of state.rules) {
      if (!rule.key) continue;
      if (!OPS_WITHOUT_VALUE.has(rule.op) && String(rule.value ?? '').trim() === '') continue;
      try {
        const t = compileRule(rule);
        if (t) tests.push(t);
      } catch (e) {
        errors.push(`Rule "${rule.key}": ${e.message}`);
      }
    }

    return {
      test: (row) => tests.every((t) => t(row)),
      active: tests.length > 0,
      error: errors.join('  ') || null,
    };
  }

  // ---------- 4. Module state ----------
  let state = emptyState();
  let compiled = buildPredicate(state);
  let rows = [];
  let attrKeys = [];
  const changeListeners = [];
  const el = {};                       // cached DOM references, filled in by mount()

  function change() {
    compiled = buildPredicate(state);
    renderError();
    renderChips();
    changeListeners.forEach((fn) => fn());
  }
  const changeSoon = debounce(change, 200);

  // ---------- 5. UI pieces ----------
  function countBy(list, field) {
    const counts = new Map();
    for (const r of list) {
      const v = r[field] ?? '';
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return counts;
  }

  function multiSelect(def) {
    const summary = h('summary', { class: 'btn' });
    const body = h('div', { class: 'menu-body' });
    const root = h('details', { class: 'menu' }, summary, body);
    const chosen = () => state.select[def.field];

    function updateSummary() {
      const n = chosen().size;
      summary.textContent = n ? `${def.label} (${n} selected)` : `${def.label}: all`;
    }

    function render() {
      const counts = countBy(rows, def.field);
      const values = [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b)));
      body.replaceChildren(
        ...values.map((value) =>
          h('label', {},
            h('input', {
              type: 'checkbox',
              checked: chosen().has(value),
              onchange: (e) => {
                if (e.target.checked) chosen().add(value);
                else chosen().delete(value);
                updateSummary();
                change();
              },
            }),
            value || '(blank)',
            h('span', { class: 'count' }, String(counts.get(value))),
          ),
        ),
      );
      updateSummary();
    }
    return { root, render };
  }

  function rangeField(def) {
    const bound = (which) =>
      h('input', {
        type: 'number', step: 'any', placeholder: which,
        value: state.range[def.field][which] ?? '',
        oninput: (e) => {
          state.range[def.field][which] = toNumber(e.target.value);   // '' -> null, not 0
          changeSoon();
        },
      });
    return h('div', { class: 'field' },
      h('div', { class: 'label' }, def.label),
      h('div', { class: 'row' }, bound('min'), bound('max')));
  }

  let dropdowns = [];                  // created in mount(), because they are DOM

  function renderRules() {
    const keys = attrKeys;
    el.rules.replaceChildren(
      ...state.rules.map((rule, i) =>
        h('div', { class: 'rule' },
          h('select', { onchange: (e) => { rule.key = e.target.value; change(); } },
            h('option', { value: '' }, '(attribute)'),
            keys.map((k) => h('option', { value: k, selected: k === rule.key }, k))),
          h('select', { onchange: (e) => { rule.op = e.target.value; renderRules(); change(); } },
            OPS.map(([id, label]) => h('option', { value: id, selected: id === rule.op }, label))),
          OPS_WITHOUT_VALUE.has(rule.op)
            ? h('span')
            : h('input', {
                type: 'text', placeholder: 'value', value: rule.value,
                oninput: (e) => { rule.value = e.target.value; changeSoon(); },
              }),
          h('button', { class: 'btn', onclick: () => { state.rules.splice(i, 1); renderRules(); change(); } }, 'Remove'),
        ),
      ),
    );
  }

  function describe() {
    const out = [];
    if (state.text.trim()) {
      const t = state.text.trim();
      out.push({ label: state.regex ? `/${t}/` : `“${t}”`, clear: () => { state.text = ''; } });
    }
    for (const d of DROPDOWNS) {
      for (const v of state.select[d.field]) {
        out.push({ label: `${d.label}: ${v || '(blank)'}`, clear: () => state.select[d.field].delete(v) });
      }
    }
    for (const g of RANGES) {
      const r = state.range[g.field];
      if (r.min !== null || r.max !== null) {
        out.push({
          label: `${g.label}: ${r.min ?? '…'} – ${r.max ?? '…'}`,
          clear: () => { r.min = null; r.max = null; },
        });
      }
    }
    for (const rule of state.rules) {
      if (rule.key) {
        out.push({ label: `${rule.key} ${rule.op} ${rule.value ?? ''}`.trim(), clear: () => { state.rules = state.rules.filter((x) => x !== rule); } });
      }
    }
    return out;
  }

  function renderChips() {
    el.chips.replaceChildren(
      ...describe().map((c) =>
        h('span', { class: 'chip' }, c.label,
          h('button', { title: 'Remove', onclick: () => { c.clear(); renderControls(); change(); } }, '×'))),
    );
  }

  function renderError() {
    el.text.classList.toggle('invalid', Boolean(compiled.error));
    el.error.textContent = compiled.error || '';
  }

  /** Rebuild every control from `state` (used after "clear" actions). Not used while typing. */
  function renderControls() {
    el.text.value = state.text;
    el.regex.checked = state.regex;
    el.case.checked = state.matchCase;
    el.scope.value = state.scope;
    dropdowns.forEach((d) => d.render());
    el.ranges.replaceChildren(...RANGES.map(rangeField));
    renderRules();
  }

  // ---------- 6. Public API ----------
  function mount(container) {
    dropdowns = DROPDOWNS.map(multiSelect);
    el.text = h('input', {
      type: 'text', placeholder: 'Search…',
      oninput: (e) => { state.text = e.target.value; changeSoon(); },
    });
    el.regex = h('input', { type: 'checkbox', onchange: (e) => { state.regex = e.target.checked; change(); } });
    el.case = h('input', { type: 'checkbox', onchange: (e) => { state.matchCase = e.target.checked; change(); } });
    el.scope = h('select', { onchange: (e) => { state.scope = e.target.value; change(); } },
      SCOPES.map(([id, label]) => h('option', { value: id }, label)));
    el.error = h('div', { class: 'error-text' });
    el.chips = h('div', { class: 'chips' });
    el.ranges = h('div');
    el.rules = h('div');

    container.replaceChildren(
      h('div', { class: 'row', style: 'justify-content: space-between; margin-bottom: 8px' },
        h('strong', {}, 'Filters'),
        h('button', { class: 'btn', onclick: () => { state = emptyState(); renderControls(); change(); } }, 'Clear all')),
      el.chips,
      h('div', { class: 'field' },
        h('label', {}, 'Search'),
        el.text,
        h('div', { class: 'checks' },
          h('label', {}, el.regex, 'Regex'),
          h('label', {}, el.case, 'Match case')),
        h('div', { style: 'margin-top: 8px' }, el.scope),
        el.error),
      ...dropdowns.map((d, i) => h('div', { class: 'field' }, h('div', { class: 'label' }, DROPDOWNS[i].label), d.root)),
      el.ranges,
      h('div', { class: 'field' },
        h('div', { class: 'label' }, 'Attribute rules'),
        el.rules,
        h('button', { class: 'btn', onclick: () => { state.rules.push({ key: '', op: 'eq', value: '' }); renderRules(); } }, '+ Add rule')),
    );
    renderControls();
  }

  function setRows(newRows, newAttrKeys) {
    rows = newRows;
    attrKeys = newAttrKeys;
    if (el.rules) {
      dropdowns.forEach((d) => d.render());
      renderRules();
    }
  }

  App.filters = {
    mount, setRows,
    test: (row) => compiled.test(row),
    isActive: () => compiled.active,
    onChange: (fn) => changeListeners.push(fn),
    // exposed for tests:
    _buildPredicate: buildPredicate, _emptyState: emptyState,
  };
})(window.App = window.App || {});
```

### 14.9 Testing it in Node with no browser

Because `buildPredicate` is pure, the test loads `util.js` and `filters.js` into a Node **`vm`** sandbox with a fake `window`, builds tiny row arrays, and asserts which ids pass. No DOM needed (the filters file creates DOM *only* inside `mount()`; an earlier draft built DOM at load time, which broke the Node test, and the failing test told me the design was wrong).

```js
// Run with: node tests/filters.test.js     (no libraries needed)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['util.js', 'filters.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', f), 'utf8'), ctx);
}
const { _buildPredicate: build, _emptyState: empty } = ctx.window.App.filters;

const rows = [
  { id: 1, name: 'Flat 1', tool_id: 'T1', tool_type: 'Flat End Mill', material: 'Carbide', vendor: 'Harvey', source: 'A', diameter: 0.25, flutes: 4, attrs: { coating: 'TiN', helix_angle: 35, comment: 'Check wear' } },
  { id: 2, name: 'Drill 2', tool_id: 'T2', tool_type: 'Drill', material: 'HSS', vendor: 'OSG', source: 'B', diameter: 0.5, flutes: 2, attrs: { coating: 'Uncoated', point_angle: 118 } },
  { id: 3, name: 'Tap 3', tool_id: 'T3', tool_type: 'Tap', material: 'HSS', vendor: 'OSG', source: 'B', diameter: null, flutes: null, attrs: { thread_pitch: '1/4-20' } },
].map((r) => ({ ...r, _hay: [r.tool_id, r.name, r.tool_type, r.material, r.vendor, r.source, ...Object.values(r.attrs)].join(' ') }));

const ids = (state) => rows.filter(build(state).test).map((r) => r.id);
const S = (patch) => Object.assign(empty(), patch);

assert.deepStrictEqual(ids(empty()), [1, 2, 3], 'no filters = everything');
assert.deepStrictEqual(ids(S({ text: 'tin' })), [1], 'text is case-insensitive by default');
assert.deepStrictEqual(ids(S({ text: 'tin', matchCase: true })), [], 'match case');
assert.deepStrictEqual(ids(S({ text: '^T[12]\\b', regex: true })), [1, 2], 'regex');
assert.deepStrictEqual(ids(S({ text: 'carb', scope: 'material' })), [1], 'scoped text');
let p = build(S({ text: '(', regex: true }));
assert.ok(p.error && p.error.startsWith('Invalid regex'), 'invalid regex is reported');
assert.strictEqual(rows.filter(p.test).length, 3, 'invalid regex ignores that filter, does not crash');

let st = empty(); st.select.material.add('HSS');
assert.deepStrictEqual(ids(st), [2, 3], 'dropdown');
st.select.vendor.add('Harvey');
assert.deepStrictEqual(ids(st), [], 'dropdowns AND together');

st = empty(); st.range.diameter.min = 0.3;
assert.deepStrictEqual(ids(st), [2], 'range excludes null values');
st = empty(); st.range.diameter.min = 0.25; st.range.diameter.max = 0.25;
assert.deepStrictEqual(ids(st), [1], 'range is inclusive');

const rule = (key, op, value) => S({ rules: [{ key, op, value }] });
assert.deepStrictEqual(ids(rule('helix_angle', 'gt', '30')), [1], 'numeric >');
assert.deepStrictEqual(ids(rule('helix_angle', 'lt', '30')), [], 'numeric < ignores missing (null is not 0)');
assert.deepStrictEqual(ids(rule('coating', 'eq', 'tin')), [1], 'eq is case-insensitive');
assert.deepStrictEqual(ids(rule('helix_angle', 'eq', '35')), [1], 'eq compares numbers as numbers');
assert.deepStrictEqual(ids(rule('coating', 'ne', 'TiN')), [2, 3], 'ne includes rows without the attribute');
assert.deepStrictEqual(ids(rule('coating', 'exists', '')), [1, 2], 'exists');
assert.deepStrictEqual(ids(rule('coating', 'missing', '')), [3], 'missing');
assert.deepStrictEqual(ids(rule('thread_pitch', 'regex', '^1/4')), [3], 'regex rule');
assert.deepStrictEqual(ids(rule('coating', 'contains', '')), [1, 2, 3], 'incomplete rule is ignored');
assert.ok(build(rule('coating', 'regex', '[')).error, 'bad regex in a rule is reported');

console.log('filters: all tests passed');
```

Run with `node tests/filters.test.js`. It prints `filters: all tests passed` when all assertions pass. (If you don't have Node at work, the same assertions can be run in the browser console.)

### Exercises (Chapter 14)

1. Add a dropdown filter for a new field. (One line in `DROPDOWNS`. What else must exist on the row? In `store.py`/the table.)
2. Add an `in` operator: `value` is `"TiN, TiAlN"`, rule matches if the attribute equals any of them.
3. Add a "starts with" operator for rules (extend `OPS` and `compileRule`; add a Node assertion first, *then* the code).
4. Add an **OR** group: "(type is Drill OR type is Tap)" already works with the multi-select. Now add the option to combine **rules** with OR instead of AND (a `rulesMode` field in state). Where does the change go?
5. Save the filter state to Python and restore it on startup. (`Set` isn't JSON: convert with `[...set]` and back. Where's the right place for those conversions?)
6. Put the regex box into "error" style *as you type* an invalid pattern. (Already done; find where. `compiled.error` and the `invalid` class.)

---

## Chapter 15: Wiring it together: `main.js` and the startup flow

### 15.1 What `main.js` is for

The other files each own **one thing** (the bridge, the table, the filters). `main.js` is the **conductor**: it connects them and owns the *startup sequence*. It should contain wiring and almost no logic. If you're writing real logic in `main.js`, it probably belongs in one of the modules.

### 15.2 Step 1: prepare the data once

```js
function prepare(list) {
  for (const r of list) {
    r._hay = [r.tool_id, r.name, r.tool_type, r.material, r.vendor, r.source, ...Object.values(r.attrs)].join(' ');
  }
  return list;
}
```

Adds the precomputed search string to each row (Chapter 14.4). Mutating the incoming objects is fine here: they were just created by `JSON.parse` for us.

```js
function attrKeysOf(list) {
  const counts = new Map();
  for (const r of list) for (const k of Object.keys(r.attrs)) counts.set(k, (counts.get(k) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
}
```

Counts how many tools have each attribute (a `Map` is a dict with any key type, and remembers insertion order). Then sorts **most common first, ties alphabetical**. `[...map.entries()]` is `list(d.items())`. Note the comparator `b[1] - a[1] || a[0].localeCompare(b[0])`: "if counts differ use that, else compare names."

### 15.3 Step 2: the status bar

`updateStatus()` assembles parts into one line: *Showing 312 of 2,400 tools · 6 databases · cache updated … · Up to date*. It runs after every table draw (the `onDraw` callback), so counts update as filters change.

### 15.4 Step 3: events from Python

```js
App.bridge.on('refresh-started', () => { busy.hidden = false; busy.textContent = 'Checking for changes…'; });
App.bridge.on('refresh-progress', (p) => { busy.textContent = `Updating ${p.done}/${p.total}: ${p.name}`; });
App.bridge.on('refresh-done', async (r) => {
  busy.hidden = true;
  message = r.data_changed ? `Updated: ${r.added} new, ${r.changed} changed, ${r.removed} removed` : 'Up to date';
  if (r.failed.length) message += `  ·  FAILED: ${r.failed.join(', ')}`;
  if (r.data_changed) await reloadFromCache();
  else updateStatus();
});
```

This answers your original complaint, *"you are just sitting there wondering if it's working"*: the banner shows **Checking for changes…**, then **Updating 3/12: Mills_Carbide.tooldb**, then disappears; the status bar says what happened. And only when `data_changed` is true do we reload, so a no-change refresh causes **no flicker** and keeps the user's page and filters.

**Why filters survive a reload:** the filter *state* lives in `App.filters`, not in the table. `setRows` re-renders the dropdown options and counts, and `table.setData` redraws with `draw(false)`, which re-runs the same predicate over the new data.

### 15.5 Step 4: buttons

- **Rescan**: `refresh(e.shiftKey)`: Shift-click forces a full rebuild.
- **Choose folder** (two buttons: toolbar and the empty-state one): the native dialog, then refresh.
- **Export CSV**: gets header and rows *from the table* (visible columns, current filter, current sort), sends them to Python to write.

### 15.6 Step 5: **the startup sequence** (the most important 10 lines)

```js
async function start() {
  App.filters.mount(byId('filters'));
  App.table.init({ onDraw: updateStatus });
  App.filters.onChange(() => App.table.redraw());
  wireEvents();
  wireButtons();

  try {
    summary = await App.bridge.call('get_status');
    if (!summary.folder) { showEmpty(true); return; }          // first run: ask for a folder
    loadRows(await App.bridge.call('get_tools'));              // 1. show what we already have, instantly
    await App.bridge.call('refresh');                          // 2. check for changes in the background
  } catch (err) {
    byId('status').textContent = `Error: ${err.message}`;
    console.error(err);
  }
}
start();
```

This is **stale-while-revalidate**: show the cache immediately (it may be slightly stale), then revalidate in the background and update if needed. Order matters: wiring is done *before* the first call so no event is missed.

### Complete listing: `frontend/js/main.js`

```js
/* Wiring: connects the bridge, filters and table. Contains the startup flow. */
(function (App) {
  'use strict';
  const { plural } = App.util;
  const byId = (id) => document.getElementById(id);      // our own tiny helper (not jQuery)

  let summary = {};
  let message = '';                                      // last refresh message, shown in the status bar

  // ---------- helpers ----------
  function prepare(list) {
    for (const r of list) {
      // One lowercase-friendly string per row so "search everything" is a single test.
      r._hay = [r.tool_id, r.name, r.tool_type, r.material, r.vendor, r.source, ...Object.values(r.attrs)].join(' ');
    }
    return list;
  }

  function attrKeysOf(list) {
    const counts = new Map();
    for (const r of list) for (const k of Object.keys(r.attrs)) counts.set(k, (counts.get(k) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  }

  function updateStatus() {
    const { shown, total } = App.table.counts();
    const parts = [`Showing ${shown.toLocaleString()} of ${plural(total, 'tool', 'tools')}`];
    if (summary.sources != null) parts.push(plural(summary.sources, 'database', 'databases'));
    if (summary.last_parsed) parts.push(`cache updated ${new Date(summary.last_parsed).toLocaleString()}`);
    if (message) parts.push(message);
    byId('status').textContent = parts.join('  ·  ');
  }

  function loadRows(list) {
    const keys = attrKeysOf(prepare(list));
    App.filters.setRows(list, keys);
    App.table.setData(list, keys);
    updateStatus();
  }

  async function reloadFromCache() {
    summary = await App.bridge.call('get_status');
    loadRows(await App.bridge.call('get_tools'));
  }

  function showEmpty(show) {
    byId('empty').hidden = !show;
    byId('tools').hidden = show;
  }

  // ---------- events pushed from Python ----------
  function wireEvents() {
    const busy = byId('busy');
    App.bridge.on('refresh-started', () => { busy.hidden = false; busy.textContent = 'Checking for changes…'; });
    App.bridge.on('refresh-progress', (p) => { busy.textContent = `Updating ${p.done}/${p.total}: ${p.name}`; });
    App.bridge.on('refresh-done', async (r) => {
      busy.hidden = true;
      message = r.data_changed ? `Updated: ${r.added} new, ${r.changed} changed, ${r.removed} removed` : 'Up to date';
      if (r.failed.length) message += `  ·  FAILED: ${r.failed.join(', ')}`;
      if (r.data_changed) await reloadFromCache();
      else updateStatus();
    });
    App.bridge.on('refresh-error', (e) => { busy.hidden = true; message = `Error: ${e.error}`; updateStatus(); });
  }

  function wireButtons() {
    byId('btn-rescan').addEventListener('click', (e) => App.bridge.call('refresh', e.shiftKey));  // Shift = full rebuild

    const chooseFolder = async () => {
      const res = await App.bridge.call('choose_folder');
      if (!res.changed) return;
      showEmpty(false);
      await App.bridge.call('refresh', false);
    };
    byId('btn-folder').addEventListener('click', chooseFolder);
    byId('btn-folder-empty').addEventListener('click', chooseFolder);

    byId('btn-export').addEventListener('click', async () => {
      const { header, rows } = App.table.exportData();
      const res = await App.bridge.call('export_csv', header, rows);
      message = res.saved ? `Exported ${rows.length} rows` : 'Export cancelled';
      updateStatus();
    });
  }

  // ---------- startup ----------
  async function start() {
    App.filters.mount(byId('filters'));
    App.table.init({ onDraw: updateStatus });
    App.filters.onChange(() => App.table.redraw());
    wireEvents();
    wireButtons();

    try {
      summary = await App.bridge.call('get_status');
      if (!summary.folder) {
        showEmpty(true);
        byId('status').textContent = 'No folder selected';
        return;
      }
      loadRows(await App.bridge.call('get_tools'));      // 1. show what we already have, instantly
      await App.bridge.call('refresh');                  // 2. check for changes in the background
    } catch (err) {
      byId('status').textContent = `Error: ${err.message}`;
      console.error(err);
    }
  }

  start();
})(window.App = window.App || {});
```

### 15.7 Run it

```
python app.py
```

1. First run: the empty-state screen. Click **Choose folder…**, pick `sample_data`.
2. Watch the banner count through the files. The table fills.
3. Close the app and reopen: data appears immediately; the banner says "Checking for changes…" then "Up to date".
4. In another terminal regenerate one file: `python tools/make_sample_data.py sample_data 6 400` (rewrites all with new random data; or edit one), reopen or press **Rescan**: "Updated: 0 new, 6 changed".
5. Delete one `.tooldb`, press Rescan: "1 removed".
6. Try the filters: type `^T[12]` with Regex checked; pick two materials; set diameter 0.25–0.5; add the rule `helix_angle > 30`.

If something is wrong, Chapter 16 is next.

### Exercises (Chapter 15)

1. Add a Refresh button that is disabled while `busy` is shown.
2. Show the list of failed files in a dialog-like panel instead of the status bar.
3. Poll for changes every 60 seconds with `setInterval(() => App.bridge.call('refresh'), 60000)`. What happens if a refresh is already running? (Follow the `RefreshBusy` path: `refresh-busy` event. Handle it quietly.)
4. Add a keyboard shortcut: `/` focuses the search box (`document.addEventListener('keydown', ...)`; don't steal the key when typing in an input).

---

## Chapter 16: Testing and debugging: what to check, in what order

### 16.1 Three kinds of tests in this project

| Test | Tool | Covers | Run |
|---|---|---|---|
| Python logic | `pytest` | manifest, parser, store, service, API envelope | `pytest -q` |
| Filter logic | Node `vm` script | `buildPredicate` (regex, ranges, rules, edge cases) | `node tests/filters.test.js` |
| Whole page | Playwright (dev only) | the real HTML/JS/DataTables in headless Chromium with a mocked `pywebview` | not shipped; see below |

The first two are in the project and need nothing fancy. The third is how I verified the front end on 2.4k and 50k rows against DataTables 2.3.8 and 3.1.5; it isn't included because it has machine-specific paths. Its idea is simple and reusable: *load `index.html` in a headless browser, define `window.pywebview = { api: {...fake...} }` before the scripts run, then click and assert.*

**What a test is for:** when you change code in six months, tests say "you broke this" in seconds. The most valuable habit: **when you find a bug, write the failing test first**, then fix it. The `force` refresh bug and the `Number(null)` range bug each became a test.

### 16.2 The debugging order (follow it every time)

1. **Is it Python or JavaScript?** In the DevTools console call the API directly: `await pywebview.api.get_tools()`.
   - Wrong/missing there → **Python** (look at `toolviewer.log` in `%APPDATA%\ToolViewer`, run `pytest`).
   - Right there but wrong on the page → **JavaScript** (Console errors, then Elements).
2. **Console first.** A red error at page load stops that script, and every file after it still loads but may depend on the broken one. Fix the *first* red error.
3. **Network tab:** a `404` on a `.js` or `.css` means a wrong path or filename (case matters when packaged).
4. **Inspect the data:** `App.table.counts()`, `console.table((await pywebview.api.get_tools()).data.slice(0, 5))`.
5. **Inspect the state:** `App.filters.isActive()`; add `console.log(state)` inside `change()`.
6. **Check the log file** for Python tracebacks; the API envelope shows only the one-line message.

### 16.3 Symptom table

| Symptom | Most likely cause | Check |
|---|---|---|
| Blank window, no errors | wrong path to `index.html`, or pywebview error in terminal | run from a terminal and read its output |
| `App is not defined` | a script failed to load, or order is wrong in `index.html` | Network tab; script order (Ch 6.9) |
| `DataTable is not a constructor` | `datatables.min.js` missing from `vendor/` or wrong version file | Network tab; Ch 2 |
| `Cannot read properties of undefined (reading 'api')` | called `pywebview.api` before ready | go through `bridge.call` (Ch 12) |
| Python method "not a function" in JS | method name has a leading `_`, or typo, or object not exposed | `Object.keys(pywebview.api)` |
| API call returns `null`/never resolves | Python raised before `_guard`, or returned a non-serializable value | terminal + log |
| Table empty but status says N tools | filter active (see chips) or all rows failed `test` | click Clear all |
| Dropdown filters missing | `replaceChildren` given an array not spread (Ch 5.6) | console error |
| Regex box turns red | invalid pattern, expected | read message under it |
| Header misaligned with body | column shown/hidden without `columns.adjust()` | Ch 13.11 |
| Duplicated header after refresh | rebuilding without emptying `<table>` | Ch 13.8 |
| Clicking a row does nothing | listener attached to rows not table (or click was inside `.detail`) | Ch 13.10 |
| Numbers sort wrong | column type not `num`, or values are strings | check `typeof` in console |
| Refresh never ends | refresh thread raised outside `try`, lock never released | log; `finally` in `refresh()` |
| "Rescan" says busy forever | a previous refresh crashed without `finally` | restart; fix the lock handling |
| Excel shows `Ã—` garbage | CSV not saved as `utf-8-sig` | `export_csv` |
| App slow with many rows | filtering in JS per keystroke without debounce, or giant `_hay` | Ch 14.4 |
| Works in `python app.py`, not in the exe | paths (`resource_path`), missing data files in the build | Ch 17 |

### 16.4 What to check first in the real window (things I could not test)

I had no display, so these are unverified in a real window; if something is off, check these in order:

1. **Does the window open and show the page?** (If blank: path.)
2. **Is `window.pywebview.api` listed in the console?** (If not: `js_api=api` and the `Api` class.)
3. **Does `choose_folder` open a native dialog?** (`webview.FileDialog.FOLDER` exists in 6.x.)
4. **Does Export write a CSV Excel can open?**
5. **Does text selection work?** (`text_select=True`.)
6. **Do events arrive?** (`App.onEvent` is called via `evaluate_js`; log in `onEvent` if not.) If your pywebview version complains about `evaluate_js` from a thread, wrap per its docs.
7. **Does it remember settings between launches?** (config.json, not localStorage.)

---

## Chapter 17: Packaging for work

You said you code at work. A few notes on delivery, with honesty about what I did not test.

- **Run from source:** `python -m venv .venv`, `pip install -r requirements.txt`, `python app.py`. Simple and what I tested the logic with.
- **Windows needs WebView2** (usually present on Windows 10/11 with Edge).
- **PyInstaller (untested by me):** `pyinstaller --noconsole --name ToolViewer --add-data "frontend;frontend" app.py`. On Windows the `--add-data` separator is `;`. `resource_path()` in `app.py` already points at `sys._MEIPASS` for bundled files. The DataTables files must be in `frontend/vendor/` **before** building. Expect to iterate; check the build's warnings first.
- **Don't commit** `dist/`, `build/`, `*.spec` outputs, `*.db`, `config.json`, `sample_data/`.
- **Vendor files:** the repo's `.gitignore` excludes them (license is fine to commit them if your policy allows; many teams do commit vendored libraries so the app builds offline). Decide once and write it in your README.
- **Logging stays on in release** (to `%APPDATA%`); `DEBUG = False`.

---

## Chapter 18: Reusing the skeleton for your *other* apps

Everything in this project falls into **reusable skeleton** or **domain-specific part**. Your other apps replace only the domain part.

| Reusable (copy as is) | Domain-specific (rewrite) |
|---|---|
| `app.py` (composition root) | which parser/service you create |
| `config.py` | settings fields |
| `manifest.py` | the file pattern |
| `store.py` pattern (cache with per-source replace) | table schema columns |
| `service.py` refresh algorithm | what a "record" is |
| `api.py` envelope, events, dialogs | the public methods |
| `bridge.js`, `util.js` | nothing |
| `table.js` pattern | `FIXED` column list |
| `filters.js` engine | `DROPDOWNS`, `RANGES`, `SCOPES` config |
| `app.css` | colors (variables) |

### The migration recipe for an existing hacked app

1. **Write down the record shape** (a dataclass; what's fixed, what's a flexible `attrs` dict).
2. **Move parsing into one function** `parse(path) -> list[Record]` with no side effects. Test it with one real file.
3. **Add the cache** (copy `store.py`, rename columns) and the manifest/service.
4. **Make the API thin** (copy `api.py`, rename methods). Check from the DevTools console that it works with no UI.
5. **Rebuild the page** from `index.html`/`app.css`; change `FIXED` columns and the filter config.
6. **Delete the HTML-injection step.** No more writing JSON into the HTML.
7. Write tests for what broke before.

### Design rules this project followed (and why)

1. **Dependencies point inward:** the UI depends on the API, which depends on the service, which depends on interfaces. The parser never imports the UI.
2. **One place per decision:** which parser (`app.py`), which filters (`DROPDOWNS`), which columns (`FIXED`).
3. **Pure functions for logic** (`diff`, `buildPredicate`, `coerce`), because they're testable.
4. **Boundaries convert:** Python↔JS uses only JSON; the parser converts text→numbers; the store converts dict↔JSON text.
5. **Errors are contained at boundaries** (per file, per API call, per filter), never swallowed silently (always logged or shown).
6. **State is data**; rendering is a function of state.
7. **Cache is disposable**; sources are read-only.

---

## Chapter 19: Quick reference sheets

### 19.1 pywebview

```python
webview.create_window(title, url_or_html, js_api=obj, width=, height=, min_size=(w,h), text_select=True)
webview.start(func=None, debug=False)          # blocks; func runs in a thread
window.evaluate_js("code")                     # build with json.dumps
window.create_file_dialog(webview.FileDialog.OPEN | SAVE | FOLDER, ...)
webview.windows[0]                             # the first window
```

JS side: `await pywebview.api.method(args)`, `window.addEventListener('pywebviewready', fn)`. Public methods only; `_names` are hidden; only JSON crosses.

### 19.2 DataTables (2.x/3.x)

```js
const dt = new DataTable('#t', { data, columns: [{title, data: fn|'key', render, type, visible, className}], rowId, pageLength, scrollX, order, layout });
dt.rows.add(rows); dt.clear(); dt.draw(false);
dt.rows({search:'applied'}).data().toArray();
dt.column(i).visible(bool, false); dt.columns.adjust();
dt.row(tr).child(node).show(); row.child.hide();
dt.search.fixed('name', (text, rowData) => bool);
dt.destroy();            // then empty the <table>
```

### 19.3 JS ↔ Python cheat sheet

| Python | JS |
|---|---|
| `d.get(k, default)` | `obj[k] ?? default` |
| `x in d` | `k in obj` / `set.has(x)` |
| `[f(x) for x in xs if p(x)]` | `xs.filter(p).map(f)` |
| `",".join(xs)` | `xs.join(",")` |
| `json.loads/dumps` | `JSON.parse/stringify` |
| `print()` | `console.log()` |
| `try/except` | `try/catch` |
| `f"{x}"` | `` `${x}` `` |
| `len(x)` | `x.length` |
| `sorted(xs, key=f)` | `[...xs].sort((a,b)=>...)` |
| `None` | `null`/`undefined` |
| `x is None` | `x == null` (catches both) |

### 19.4 CSS cheats

`box-sizing: border-box`; row: `display:flex; gap:8px; align-items:center`; sidebar+content: `display:grid; grid-template-columns: 280px 1fr`; scrolling pane: `overflow:auto; min-height:0`; shrinkable grid child: `min-width:0`; variables: `--accent` / `var(--accent)`; dark: `@media (prefers-color-scheme: dark)`.

---

## Chapter 20: Where to go from here

Roadmap, easiest first:

1. Replace `SampleSqliteParser` with your real Mastercam parser (Ch 8). **Test it on one real file and write a pytest for it.**
2. Add the filter fields your real data needs (Ch 14, config only).
3. Save/restore filter presets and column choices through Python (Ch 13 & 14 exercises).
4. Add a "Databases" panel listing sources with counts and parse errors.
5. Add a poll timer (Ch 15 exercise 3).
6. Package with PyInstaller (Ch 17).
7. Rebuild your next app using Chapter 18's recipe.

---

## Appendix A: DataTables 1.x → 2.x/3.x, and jQuery code you'll meet

| Old (1.x / jQuery) | New |
|---|---|
| `$('#t').DataTable({...})` | `new DataTable('#t', {...})` (jQuery version still works) |
| `$('#t').dataTable()` (lowercase d) | legacy API, avoid |
| `dom: 'lfrtip'` | `layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' }` |
| `aoColumns`, `bPaginate`, `sDom`, `fnDraw()` | `columns`, `paging`, `layout`, `draw()` |
| `$.fn.dataTable.ext.search.push(fn)` (global) | `dt.search.fixed('name', fn)` (per table) |
| `settings.nTable` | `settings.table` (DT3) |
| `table.fnFilter('x')` | `table.search('x').draw()` |
| `$.ajax` loading JSON | not needed: data comes from the Python bridge |
| `$('#t tbody').on('click','tr', function(){...})` | `table.addEventListener('click', e => e.target.closest('tbody tr'))` |
| `$(...).html(text)` with data | `textContent` / `h()` |

**Reading jQuery:** `$` is a function returning a wrapper; `.val()/.text()/.attr()/.addClass()/.on()` are methods; handlers use `function(){ $(this) }`. See Chapter 5.11.

## Appendix B: Glossary

- **DOM**: the live tree of page elements JavaScript changes.
- **Event loop**: the single thread that runs JS and handles events one at a time.
- **Delegation**: one listener on a stable parent instead of many on children.
- **Closure**: a function remembering variables from where it was created.
- **Promise / `await`**: a value that arrives later.
- **Bridge**: pywebview's connection between JS and a Python object.
- **Envelope**: `{ok, data|error}` wrapper on every API result.
- **Composition root**: the one place that creates the real objects (`app.py`).
- **Seam**: a boundary (like `ToolDbParser`) where you can swap implementations.
- **Manifest**: the list of source files with their mtime and size.
- **Stale-while-revalidate**: show cached data now, refresh in the background.
- **Predicate**: a function returning true/false for an item.
- **Orthogonal data**: DataTables rendering one cell differently for display/sort/filter.

## Appendix C: If you use an AI agent on this code later

Give it the architecture in Chapter 1 and 18 and the rule list in 18. Ask it to *write the failing test first*, keep changes inside one layer, and run `pytest` and `node tests/filters.test.js` before it says it is done. You now know enough to read what it produces: check that parsing stays in `parsing/`, logic stays out of `api.py`, DataTables stays in `table.js`, and no `innerHTML` is built from data.
