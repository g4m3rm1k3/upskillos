---
title: 6.6 — Tidy Up: a src Folder
runtime: none
experiments: Remove the practice files
teaches: project layout, src folders, git rm, readme files
uses: git mv, tsconfig, markdown
---

List the project folder (`ls`) and look at the mix: the spreadsheet's source files and their tests, configuration files (`package.json`, `tsconfig.json`, `.gitignore`), generated folders (`node_modules`, `dist`), and four practice files from sprint 0 that have nothing to do with the spreadsheet. It's getting hard to see what the app actually is.

Projects settle this the same way almost everywhere: the source code goes in a folder called **`src`** (*source*), and the top level keeps only the files that describe the project as a whole. Now is the moment, because the problem is real, not because a template said so.

## Remove the practice files

```powershell
git rm hello.py hello.js greet.py exit-code.js
```

```text
PS C:\Users\you\Documents\spreadsheet> git rm hello.py hello.js greet.py exit-code.js
rm 'exit-code.js'
rm 'greet.py'
rm 'hello.js'
rm 'hello.py'
```

**`git rm`** deletes files and stages the deletion in one step. They're gone from your folder, but not from history: any earlier commit still has them. Predict, then try it:

```predict
question: You've just run `git rm hello.py`. What does `git show HEAD:hello.py` print?
choice: An error: the file is gone
choice: The file's old content
answer: The file's old content
explain: `HEAD:hello.py` means "hello.py as it was in the last commit", and the last commit still has it. Deleting a file never deletes its past: every commit that had it still does, which is also why a secret, once committed, has to be treated as leaked.
verify: if (git show HEAD:hello.py) { 'The file''s old content' }
```

```check
missing hello.py
missing hello.js
missing greet.py
missing exit-code.js
```

## Move the source into src

```powershell
mkdir src
git mv address.ts address.test.ts columns.ts columns.test.ts grid.ts sheet.ts sheet.test.ts style.css src
git status
```

`git mv` accepts several files, then the folder to move them into. `git status` shows what you've done:

```text
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        deleted:    exit-code.js
        deleted:    greet.py
        deleted:    hello.js
        deleted:    hello.py
        renamed:    address.test.ts -> src/address.test.ts
        renamed:    address.ts -> src/address.ts
        renamed:    columns.test.ts -> src/columns.test.ts
        renamed:    columns.ts -> src/columns.ts
        renamed:    grid.ts -> src/grid.ts
        renamed:    sheet.test.ts -> src/sheet.test.ts
        renamed:    sheet.ts -> src/sheet.ts
        renamed:    style.css -> src/style.css
```

The `import` lines between these files don't change: they all moved together, so `./columns.ts` still means "next to me".

```check
file src/grid.ts -- Move the files with git mv ... src
file src/style.css
missing grid.ts
```

## Point the page and the compiler at src

`index.html` stays at the top level: it's the front door Vite serves. Its two links change:

```html file=index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spreadsheet</title>
    <link rel="stylesheet" href="/src/style.css">
  </head>
  <body>
    <h1>Spreadsheet</h1>
    <div id="toolbar">
      <div id="name-box"></div>
      <input id="formula-bar" autocomplete="off">
    </div>
    <table id="grid"></table>
    <script type="module" src="/src/grid.ts"></script>
  </body>
</html>
```

The leading **`/`** means "from the top of the site": `/src/grid.ts` is the same file whatever page asks for it. (That's a web address, served by Vite, not a path on your disk.)

```check
contains index.html "src=\"/src/grid.ts\"" -- Point the script at /src/grid.ts
contains index.html "href=\"/src/style.css\"" -- Point the stylesheet at /src/style.css
```

## And the compiler

Change the last line of `tsconfig.json`, so `tsc` checks everything in `src`:

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
  "include": ["src"]
}
```

Then make sure everything still works: types, tests, the build, and the page.

```powershell
npm run check
npm test
npm run build
```

```check
contains tsconfig.json "\"include\": [\"src\"]"
run "npm run check" label="the project type-checks"
run "npm test" stdout="16 passed" label="all 16 tests pass from src"
run "npm run build" stdout="built in" label="the build works"
page index.html "(() => { document.querySelectorAll('tbody tr')[2].querySelectorAll('td')[1].click(); return document.querySelector('#name-box').textContent + ' ' + getComputedStyle(document.querySelector('table')).borderCollapse; })()" "B3 collapse" server=vite errors=none label="the page works and is styled, from src"
```

## Merge the sprint and push

```powershell
git commit -am "Move the source into src; remove the sprint 0 practice files"
git switch main
git merge tests-and-model
git push
git branch -d tests-and-model
```

```check
git-branch main
git-no-branch tests-and-model -- After merging, delete the branch.
git-tracked src/sheet.ts label="main has the Sheet, in src"
git-pushed
git-clean
```

## Sprint 6 is done, and so is phase 1's groundwork

Look at what you have:

- The **data** lives in a tested `Sheet`, and the **page** only draws it.
- Positions are `Address` objects, written and read by tested functions.
- `npm test` checks sixteen behaviours in a fraction of a second; `npm run check` checks the types; `npm run build` refuses to build with type errors.
- Everything is in Git, on GitHub, organised the way most real projects are.

That's the foundation the rest is built on. Sprint 7 starts the part that makes a spreadsheet a spreadsheet: type `=B2*C2` into a cell, and see `7`.

## Your turn: a README for the project

Every real project opens with a `README.md` at the top: what it is, and how to work on it. Someone cloning yours should be able to start from it alone. Write one, in Markdown (lesson 1.2), with:

- a heading with the project's name, and a sentence saying what it is;
- how to **install** what it needs, **run** it while developing, **test** it and **build** it: the exact commands, each in a code block (three backticks on the line before and after the commands);
- what's in `src`, in a sentence or two.

Then look at it on GitHub after pushing: GitHub shows a repository's README on its front page.

```check
matches README.md "^# \\S" label="it has a heading" -- Start with # and the project's name.
contains README.md "npm install" label="it says how to install" -- Someone cloning the project needs npm install first.
contains README.md "npm run dev" label="it says how to run it"
contains README.md "npm test" label="it says how to test it"
contains README.md "npm run build" label="it says how to build it"
git-tracked README.md -- Commit it: git add README.md, then git commit.
git-pushed -- Push it: git push
```

The checks look for the commands. Whether a newcomer could follow it is the real test: read it as if you'd never seen the project.

```hints
nudge: Write down the commands you've typed in sprints 4 to 6, in the order a newcomer would need them.
concept: A Markdown code block is three backticks on a line, the commands, then three backticks again. GitHub shows it in a box, ready to copy.
shape: `# Spreadsheet`, a sentence, `## Getting started` with a code block of `npm install`, `npm run dev`; `## Testing and building` with `npm test`, `npm run check`, `npm run build`; `## The code`, a sentence about `src`.
```
