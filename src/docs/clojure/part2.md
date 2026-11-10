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
@@INCLUDE:frontend/index.html@@
```

```css
@@INCLUDE:frontend/css/app.css@@
```

**Checkpoint:** create these two files (leave `js/` for later; the page will show empty chrome and a few console errors about missing scripts, which is expected). Put DataTables in `vendor/` and open `index.html` in a normal browser to see the layout. In DevTools toggle the *device/theme emulation* or change your OS theme to see dark mode.

### Exercises (Chapter 6)

1. Change `--accent` to another color and watch the buttons, checkboxes and focus rings follow.
2. Change the sidebar width from `280px` to `340px`. Where is the number? (Only one place.)
3. In DevTools, click the **Filters** sidebar and untick `overflow-y: auto`. What happens when there are many filters? Put it back.
4. Make the `.chip` background use a second accent color via a new variable.
5. Add a `.btn.danger` style (red border and text using `--danger`).

---

