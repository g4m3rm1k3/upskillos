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
@@INCLUDE:frontend/js/util.js@@
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
@@INCLUDE:frontend/js/bridge.js@@
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

**Rebuild gotcha:** `dt.destroy()` restores the original `<table>` but **leaves the `<thead>` that DataTables generated**, and building again duplicates headers. So: `dt.destroy(); tableEl().replaceChildren();` (empty the table element). That line was found by testing: without it the second build had doubled header rows.

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
@@INCLUDE:frontend/js/table.js@@
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

`Number(null)` is `0` and `Number('')` is `0` (Chapter 4.6). Without the `hasValue` check, a tool with *no* helix angle would count as helix `0`, and `helix < 30` would wrongly include every tool that lacks the attribute. (Test: `'lt' excludes missing values`.)

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
@@INCLUDE:frontend/js/filters.js@@
```

### 14.9 Testing it in Node with no browser

Because `buildPredicate` is pure, the test loads `util.js` and `filters.js` into a Node **`vm`** sandbox with a fake `window`, builds tiny row arrays, and asserts which ids pass. No DOM needed (the filters file creates DOM *only* inside `mount()`; an earlier draft built DOM at load time, which broke the Node test, and the failing test told me the design was wrong).

```js
@@INCLUDE:tests/filters.test.js@@
```

Run with `node tests/filters.test.js`. It prints `OK` when all assertions pass. (If you don't have Node at work, the same assertions can be run in the browser console.)

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
@@INCLUDE:frontend/js/main.js@@
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

