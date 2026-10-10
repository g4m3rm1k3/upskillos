---
title: 5.3 — Types in the Workflow, and Their Limits
runtime: none
experiments: What it catches; What it doesn't catch
teaches: type checking in the build, limits of types
uses: npm scripts, typescript
---

A checker you have to remember to run gets forgotten. This lesson makes type checking part of the project's commands, so a build can't happen with type errors, and then looks honestly at what types can't catch.

## A check script, and a build that checks first

Edit the `scripts` in `package.json`. Keep your own version numbers in `devDependencies`.

```json file=package.json
{
  "name": "spreadsheet",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "check": "tsc",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "vite": "^8.3.2"
  }
}
```

- **`"check": "tsc"`**: `npm run check` type-checks the project.
- **`"build": "tsc && vite build"`**: **`&&`** runs the second command only if the first succeeded (exit code 0, lesson 0.4). If `tsc` finds an error, there's no build.

```powershell
npm run check
npm run build
```

```text
PS C:\Users\you\Documents\spreadsheet> npm run check

> spreadsheet@0.1.0 check
> tsc

PS C:\Users\you\Documents\spreadsheet> npm run build

> spreadsheet@0.1.0 build
> tsc && vite build

vite v8.3.2 building client environment for production...
✓ 6 modules transformed.
computing gzip size...
dist/index.html                 0.46 kB │ gzip: 0.28 kB
dist/assets/index-BZf2s2lK.css  0.58 kB │ gzip: 0.33 kB
dist/assets/index-Dxs5rdyn.js   1.85 kB │ gzip: 0.86 kB

✓ built in 37ms
```

```check
contains package.json "\"check\": \"tsc\"" -- Add "check": "tsc" to the scripts.
contains package.json "\"build\": \"tsc && vite build\"" -- Make the build script "tsc && vite build".
run "npm run build" stdout="built in" label="`npm run build` type-checks and builds"
```

## What it catches

Make the typo from lesson 3.1 again, in `grid.ts`: change `r < rows` in the body loop to `r < rws`. Then:

```powershell
npm run build
```

```text
PS C:\Users\you\Documents\spreadsheet> npm run build

> spreadsheet@0.1.0 build
> tsc && vite build

grid.ts:28:21 - error TS2552: Cannot find name 'rws'. Did you mean 'rows'?

28 for (let r = 0; r < rws; r++) {
                       ~~~

  grid.ts:4:7 - 'rows' is declared here.
    4 const rows = 100;
            ~~~~


Found 1 error in grid.ts:28
```

In sprint 3 this was a red line in the browser's Console, found only after a refresh. Now it's found before anything runs, with a suggested fix, and the build refuses to go ahead, so a typo can't reach anyone using the app.

Fix the typo, and run `npm run check` to see it pass.

```check
run "npm run check" label="the project type-checks" -- Fix the typo (rws → rows).
```

## What it doesn't catch

Now swap the arguments again, as in lesson 3.4: change the click listener to `() => select(r, c)`, and run `npm run check`. Predict first:

```predict
question: The click listener now calls `select(r, c)`, row and column swapped. Does `npm run check` report an error?
choice: Yes: the arguments are in the wrong order
choice: No: both are numbers, which is what select asks for
answer: No: both are numbers, which is what select asks for
explain: TypeScript checks the *kinds* of values, not what they mean. `select` takes two numbers and gets two numbers, so as far as types go, nothing is wrong.
```

It passes. No errors.

`select` wants two numbers, and it got two numbers. TypeScript checks **kinds** of values, not **meanings**: it has no idea that the first number was meant to be a column. The page outlines the wrong cell, exactly as in sprint 3. The same goes for `"B" + 2 + 1`: adding a number to a string is allowed, so `"B21"` gets through too.

So types are one safety net, not the only one:

- Types catch the wrong **kind** of value: typos, missing elements, a string where a number belongs, a value that might be missing.
- They can't catch the wrong **answer**: `columnName(26)` returning `"BA"` instead of `"AA"` would type-check perfectly.

Wrong answers are caught by **tests**: code that runs your code and checks the results. They're next sprint. And for swapped arguments, sprint 6 also gives a cell's position a type of its own, `{ column, row }`, so the two numbers have names and the mistake is hard to make.

Put the arguments back to `select(c, r)`.

```check
page index.html "(() => { document.querySelectorAll('tbody tr')[2].querySelectorAll('td')[1].click(); return document.querySelector('#name-box').textContent; })()" B3 server=vite label="clicking B3 shows B3" -- Put the arguments back: select(c, r)
run "npm run check" label="the project type-checks"
```

## Merge the sprint and push

```powershell
git commit -am "Type-check before every build"
git switch main
git merge typescript
git push
git branch -d typescript
```

```check
git-branch main
git-no-branch typescript -- After merging, delete the branch.
git-tracked tsconfig.json label="main has the TypeScript setup"
git-pushed
git-clean
```

Sprint 5 is done. The code says what kinds of values it works with, and the build refuses code that doesn't fit. Next sprint: tests, so wrong answers are caught as reliably as wrong types.

## Your turn: make the swap impossible to miss

Click **Create provided playground/ts/swap.ts**: the swapped-arguments bug, in a few lines. It prints `C2`, though it means column B, row 3:

```typescript file=playground/ts/swap.ts provided
function cellName(column: number, row: number): string {
  return String.fromCharCode(65 + column) + (row + 1);
}

const row = 2;
const column = 1;
console.log(cellName(row, column));
```

Change `cellName` so that it takes **one object**, `{ column, row }`, instead of two numbers, and update the call. Then a swap would have to be written out as `{ column: row, row: column }`, where anyone reading it would see it. The program should print `B3`, and pass `npx tsc --noEmit --strict --ignoreConfig playground/ts/swap.ts`. Commit it.

```check
run "node playground/ts/swap.ts" stdout="B3" label="it prints B3"
run "npx tsc --noEmit --strict --ignoreConfig playground/ts/swap.ts" label="it type-checks with --strict"
matches playground/ts/swap.ts "cellName\\(\\s*\\{" label="cellName is called with an object" -- Call it as cellName({ column: ..., row: ... }).
git-clean -- Commit it: git add playground, then git commit.
```

```hints
nudge: An object's parts have names; a list of arguments only has positions.
concept: A parameter can be an object with a type written inline: `(cell: { column: number; row: number })`. Inside, `cell.column` and `cell.row` read its parts. At the call, `{ column: 1, row: 2 }` names each value, and since `column` and `row` are already variables here, `{ column, row }` is short for `{ column: column, row: row }`.
shape: `function cellName(cell: { column: number; row: number }): string`, using `cell.column` and `cell.row`; the call becomes `cellName({ column, row })`.
answer: ~~~typescript
function cellName(cell: { column: number; row: number }): string {
  return String.fromCharCode(65 + cell.column) + (cell.row + 1);
}

const row = 2;
const column = 1;
console.log(cellName({ column, row }));
~~~
```
