---
title: 5.1 — TypeScript: Checking the Code Before It Runs
runtime: none
experiments: Run the compiler
teaches: typescript, tsconfig, strict mode, tsc, npx, git mv
uses: modules, npm, vite
---

Remember sprint 3's bugs: a typo that only showed up as a red line in the Console after a refresh; `select(r, c)` quietly outlining the wrong cell; the last row crashing when Enter tried to move below it. JavaScript finds out about mistakes **while the program runs**, and only if that line happens to run.

**TypeScript** is JavaScript with **types** added: you say what kind of value each variable and parameter holds (a number, a string, a table cell), and a program called the **TypeScript compiler** reads your code, without running it, and reports every place where the kinds don't fit. Many mistakes are found in seconds, before the page is even opened.

This sprint converts the project to TypeScript. You'll see what it catches, and also what it doesn't.

## A branch

```powershell
git switch -c typescript
```

```check
git-branch typescript -- Run git switch -c typescript
```

## Install TypeScript

```powershell
npm install --save-dev typescript
npx tsc --version
```

```text
PS C:\Users\you\Documents\spreadsheet> npm install --save-dev typescript

added 2 packages, and audited 18 packages in 1s

8 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
PS C:\Users\you\Documents\spreadsheet> npx tsc --version
Version 7.0.2
```

**`tsc`** is the TypeScript compiler. **`npx`** runs a program installed in this project's `node_modules` (lesson 4.2), so every project uses its own version of each tool.

```check
dir node_modules/typescript -- Run npm install --save-dev typescript
contains package.json "\"typescript\"" label="package.json lists typescript"
```

## tsconfig.json

The compiler reads its settings from `tsconfig.json`. (`npx tsc --init` writes one with dozens of options, set up for a Node library; this project is a web page, so you'll write a short one and know what every line does.) This step opens `tsconfig.json`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

- **`target`** and **`lib`**: which version of JavaScript the code can rely on (ES2022, a recent edition of the JavaScript standard), and that it runs in a browser, where `document` exists (`dom`).
- **`module`** and **`moduleResolution`**: the code uses `import`/`export`, and a **bundler** (Vite) finds the imported files.
- **`allowImportingTsExtensions`**: lets imports name `.ts` files, as in `"./columns.ts"`.
- **`noEmit`**: only check; don't write any JavaScript files. Turning TypeScript into JavaScript for the browser is Vite's job.
- **`strict`**: switch on all the important checks. Without it, TypeScript lets most mistakes through.
- **`noUncheckedIndexedAccess`**: reading from a list by position (`rows[150]`) might find nothing, so make the code deal with that. This is the check that would have caught lesson 3.5's crash on the last row.
- **`skipLibCheck`**: don't check the type descriptions that come with installed packages; that's their authors' job.
- **`include`**: which files to check: every `.ts` file in the project folder.

```check
contains tsconfig.json "\"strict\": true"
contains tsconfig.json "\"noUncheckedIndexedAccess\": true"
contains tsconfig.json "\"noEmit\": true"
```

## Rename the files to .ts

A TypeScript file ends in `.ts`. Rename both modules with Git:

```powershell
git mv columns.js columns.ts
git mv grid.js grid.ts
```

**`git mv`** renames a file and tells Git in the same move, so the history knows `grid.ts` *is* the old `grid.js` rather than a deletion and an unrelated new file. (It prints nothing when it works.)

Then change the import at the top of `grid.ts` to the new name. Nothing else changes yet:

```typescript file=grid.ts
import { columnName } from "./columns.ts";

const columns = 26;
const rows = 100;

const table = document.querySelector("#grid");

const head = document.createElement("thead");
const headerRow = document.createElement("tr");
headerRow.appendChild(document.createElement("th"));
for (let c = 0; c < columns; c++) {
  const th = document.createElement("th");
  th.textContent = columnName(c);
  headerRow.appendChild(th);
}
head.appendChild(headerRow);
table.appendChild(head);

const body = document.createElement("tbody");
for (let r = 0; r < rows; r++) {
  const tr = document.createElement("tr");
  const rowHeader = document.createElement("th");
  rowHeader.textContent = r + 1;
  tr.appendChild(rowHeader);
  for (let c = 0; c < columns; c++) {
    const td = document.createElement("td");
    td.addEventListener("click", () => select(c, r));
    tr.appendChild(td);
  }
  body.appendChild(tr);
}
table.appendChild(body);

const nameBox = document.querySelector("#name-box");
const formulaBar = document.querySelector("#formula-bar");
let selected = null;
let selectedColumn = 0;
let selectedRow = 0;

function cellAt(column, row) {
  return body.rows[row].cells[column + 1];
}

function select(column, row) {
  if (selected !== null) {
    selected.classList.remove("selected");
  }
  selected = cellAt(column, row);
  selectedColumn = column;
  selectedRow = row;
  selected.classList.add("selected");
  nameBox.textContent = columnName(column) + (row + 1);
  formulaBar.value = selected.textContent;
  formulaBar.focus();
}

formulaBar.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    selected.textContent = formulaBar.value;
    if (selectedRow + 1 < rows) {
      select(selectedColumn, selectedRow + 1);
    }
  }
});

select(0, 0);
```

```check
file grid.ts -- Run git mv grid.js grid.ts
file columns.ts -- Run git mv columns.js columns.ts
missing grid.js
contains grid.ts "from \"./columns.ts\"" -- Change the import to "./columns.ts".
```

## Point the page at grid.ts

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>Spreadsheet</h1>
    <div id="toolbar">
      <div id="name-box"></div>
      <input id="formula-bar" autocomplete="off">
    </div>
    <table id="grid"></table>
    <script type="module" src="grid.ts"></script>
  </body>
</html>
```

Browsers don't understand TypeScript. Vite does: when the page asks for `grid.ts`, Vite removes the type annotations on the fly and sends plain JavaScript. Start the dev server (`npm run dev`, in its own terminal) and open the page: it works exactly as before.

(If you forget this change, the page still works: when asked for a `grid.js` that doesn't exist, Vite tries `grid.ts`. Relying on that makes the page say one thing and do another, so name the file you mean.)

In the next step `tsc` will report 24 type errors in this code. Predict:

```predict
question: With 24 type errors in `grid.ts`, does the page still work through Vite?
choice: Yes: Vite strips the types without checking them
choice: No: Vite refuses to serve code with type errors
answer: Yes: Vite strips the types without checking them
explain: Vite removes the type annotations and sends plain JavaScript, as fast as it can; it never checks them. Checking is a separate job, done by `tsc`, and a separate command you choose when to run. The next lesson makes the build run it for you.
verify: page index.html "document.querySelectorAll('tbody td').length === 2600 ? 'Yes: Vite strips the types without checking them' : 'No: Vite refuses to serve code with type errors'" server=vite
```

```check
contains index.html "src=\"grid.ts\"" -- Change the script's src to grid.ts.
page index.html "document.querySelectorAll('tbody td').length" 2600 server=vite errors=none label="the page still works through Vite"
```

## Run the compiler

In your other terminal:

```powershell
npx tsc
```

```text
PS C:\Users\you\Documents\spreadsheet> npx tsc
columns.ts:1:28 - error TS7006: Parameter 'index' implicitly has an 'any' type.

1 export function columnName(index) {
                             ~~~~~

grid.ts:17:1 - error TS18047: 'table' is possibly 'null'.

17 table.appendChild(head);
   ~~~~~

grid.ts:23:3 - error TS2322: Type 'number' is not assignable to type 'string'.

23   rowHeader.textContent = r + 1;
     ~~~~~~~~~~~~~~~~~~~~~

grid.ts:32:1 - error TS18047: 'table' is possibly 'null'.

32 table.appendChild(body);
   ~~~~~
```

…and many more, ending with:

```text
Found 24 errors in 2 files.

Errors  Files
     1  columns.ts:1
    23  grid.ts:17
```

Twenty-four errors, in code that works. Don't be alarmed: that's normal when a project first switches to TypeScript, and most are the same few complaints repeated.

Each error reads the same way: **file:line:column**, an error code (`TS7006`, useful for searching), the message, then the line with `~~~` under the problem. Notice that the page ran fine through Vite all the same: **Vite doesn't check types**, it only strips them. Checking is `tsc`'s job, and you'll run it often.

The next lesson goes through the errors by kind and fixes them.

## Commit the conversion

Commit now, errors and all, so the next lesson's fixes form their own commit. (On a branch, as in lesson 4.1.)

```powershell
git add tsconfig.json
git commit -am "Convert to TypeScript (24 type errors to fix)"
```

```check
git-tracked tsconfig.json
git-tracked grid.ts
git-untracked grid.js label="grid.js is gone from the last commit (renamed)"
git-clean
```

## Your turn: types in the playground

Write `playground/ts/area.ts` with a function `area(width, height)` that returns width times height, **with types**: both parameters numbers, and the result a number. At the end, print `area(3, 4)`.

Then make a mistake on purpose: add a line `area("3", 4);`, run `npx tsc --noEmit --strict --ignoreConfig playground/ts/area.ts`, and read the error. (Giving `tsc` a file's name checks just that file. `--ignoreConfig` tells it to leave the project's `tsconfig.json` out: without it, TypeScript stops with error TS5112 rather than guess which settings you meant. So `--strict` is written on the command line.) Delete the mistake, check again, and run the file: Node runs a `.ts` file by removing its types, as Vite does. Commit when it's clean.

```check
run "node playground/ts/area.ts" stdout="12" label="area(3, 4) prints 12"
run "npx tsc --noEmit --strict --ignoreConfig playground/ts/area.ts" label="it type-checks with --strict" -- Annotate both parameters and the return type, and remove the mistake.
git-clean -- Commit it: git add playground, then git commit.
```

The type check fails if the parameters have no types at all: `--strict` refuses to guess them as `any`.

```hints
nudge: It's `columnName`'s shape from lesson 5.2: types after the parameters' names, and after the brackets for the result.
concept: `width: number` annotates a parameter; `): number {` annotates what the function returns. With `--strict`, a parameter without a type is an error, *implicitly has an 'any' type*.
shape: `function area(width: number, height: number): number { return …; }` and `console.log(area(3, 4));`.
answer: ~~~typescript
function area(width: number, height: number): number {
  return width * height;
}

console.log(area(3, 4));
~~~
```
