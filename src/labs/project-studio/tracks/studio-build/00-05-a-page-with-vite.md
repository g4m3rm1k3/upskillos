---
title: 0.5 — A Page, with Vite
track: Build Your Own Game Studio
runtime: none
concepts: html, dom, vite, bundling
problem: The studio's window will show a web page, built from many TypeScript files. A browser runs neither TypeScript nor files that import each other by short names. What turns the project into something a browser can show, and how do you see each change at once?
---

An Electron app's window is a web page: HTML for its structure, CSS for its look, and JavaScript for what it does. So before the window, this lesson makes the page. **Vite** is the tool that serves it while you work, turning TypeScript into JavaScript as the browser asks for each file, and that **builds** it when you're done: every file joined into a few small ones the browser loads quickly.

## Install Vite

```powershell
npm install --save-dev --save-exact vite@8.3.3
```

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- npm keeps `"devDependencies"` in alphabetical order, so `vite` lands before `vitest`.

```check
contains package.json "\"vite\": \"8.3.3\"" -- npm install --save-dev --save-exact vite@8.3.3
run "npx vite --version" stdout="vite/8.3.3"
```

## The page

Create `index.html` in the project's top folder:

```html file=index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Studio</title>
  </head>
  <body>
    <h1 id="title"></h1>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- `<!doctype html>` is the first line of every web page. It tells the browser the file is modern HTML, so it uses today's rules for drawing it rather than old ones kept for very old pages.
- HTML is made of **elements**: a start tag like `<h1>`, content, and an end tag `</h1>`. Elements nest inside each other: `<html>` holds the whole page, which is `<head>` and `<body>`.
- `<head>` holds information about the page: `<meta charset="utf-8" />` says how its text is encoded (UTF-8, which can store every character), and `<title>` is the text the window's title bar shows.
- `<body>` holds what's shown. `<h1>` is a top-level heading, empty for now; `id="title"` is an **attribute** giving it a name that code can find it by. An id must be unique in the page.
- `<script type="module" src="/src/main.ts">` loads and runs a file as an ES module. A browser can't run `.ts`; Vite turns it into JavaScript as the browser asks for it.

```check
contains index.html "id=\"title\""
contains index.html "src=\"/src/main.ts\""
```

## Code for the page

Create `src/main.ts`:

```ts file=src/main.ts
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');
```

- The browser turns the HTML into a tree of objects in memory, the **DOM** (Document Object Model): one object per element, each holding its children. `document` is the root of that tree.
- `const title = …` makes a **variable**, a name for a value, here whatever `querySelector` returns. `const` means the name can't be given a different value later. (`let`, met in lesson 1.2, can.) Use `const` unless the value must change.
- `document.querySelector('#title')` searches the tree for the first element matching the **selector** `#title` (`#` means "id is"). Its type is `Element | null`: an element, or `null` if nothing matched. The `|` makes a **union type**, one of either.
- `if (title)` checks it's not `null`. Inside the `if`, TypeScript knows `title` is an `Element` (it **narrows** the type), so setting `title.textContent` type-checks. Without the `if`, `npx tsc` reports *'title' is possibly 'null'*: strict mode at work.
- `textContent` is the element's text. Setting it replaces whatever was there with the string `greet` returns.

```check
run "npx tsc" label="main.ts type-checks"
contains src/main.ts "querySelector('#title')"
```

## The dev server

Type:

```powershell
npx vite
```

```text
  VITE v8.3.3  ready in 120 ms

  ➜  Local:   http://localhost:5173/
```

- Vite starts a **web server**: a program that waits for requests and answers with files. `localhost` means this computer; `5173` is the **port**, the number that tells this server's requests apart from other servers'.
- Open `http://localhost:5173/` in a browser (Ctrl+click the link in the terminal): the page says **Hello, Studio!**.
- When the browser asks for `/src/main.ts`, Vite reads the file, removes the types, and sends JavaScript. It does the same for `./greet` when `main.ts` imports it.
- The server keeps running, so the terminal is busy. Leave it running for the next experiment.

```check
page index.html "document.querySelector('#title').textContent" "\"Hello, Studio!\"" server=vite label="the page shows Hello, Studio!" -- Save index.html and src/main.ts; npx vite, then open http://localhost:5173/
```

## Changes, as you save

With the server still running and the page open, change `'Studio'` to `'Studio!'` in `src/main.ts` and save. The page changes by itself, without reloading. Change it back.

- Vite watches the project's files. When one changes, it tells the page over an open connection, and the page loads the new version of that module. This is called **hot module replacement**. It's why the studio's window can update the moment you save.

Now misspell the selector: `'#titel'`, save, and look at the page.

```predict
question: What happens?
choice: An error in the terminal: there is no #titel
choice: The heading is empty, with no error anywhere
choice: TypeScript refuses to build the page
answer: The heading is empty, with no error anywhere
explain: querySelector found no element called titel, so it returned null; the if skipped the assignment, and the h1 stayed empty. Nothing went wrong as far as the program knows. The if made the code safe, and also made the mistake silent: that's what tests are for, and lesson 0.7 tests the window's text.
```

Put `'#title'` back and save. Stop the server: click in the terminal and press **Ctrl+C**.

```check
contains src/main.ts "querySelector('#title')" -- Put '#title' back.
```

## Building the page

The dev server is for working. A finished app ships **built** files:

```powershell
npx vite build
```

```text
dist/index.html                0.30 kB │ gzip: 0.23 kB
dist/assets/index-nkJyPwJj.js  0.76 kB │ gzip: 0.43 kB
✓ built in 25ms
```

- Vite starts at `index.html`, follows every `import` from `main.ts` onwards, and joins all the code into one JavaScript file: **bundling**. A real studio has hundreds of modules; one file loads far faster than hundreds.
- It also **minifies** the code: removes spaces and shortens names, so the file is smaller.
- `index-nkJyPwJj.js`: the part after `index-` is a **hash** of the file's contents. Change the code and the name changes, so a browser that kept an old copy can never use it by mistake.
- The result goes in `dist` ("distribution"), which `.gitignore` already ignores: it's made again from the source each time.

```check
run "npx vite build" stdout="built in" label="the page builds"
file dist/index.html
```

## Scripts, and commit

Add the two commands as scripts:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- `"dev": "vite"`: `npm run dev` starts the dev server, the same as `npx vite`. Inside a script, npm finds `vite` in `node_modules` by itself (lesson 0.3).
- `"build": "vite build"`: `npm run build` builds the page into `dist`.
- The scripts are listed in the order you use them: work (`dev`), build, then check (`typecheck`, `test`).

```powershell
git add .
git commit -m "Vite: a page that greets the studio"
```

```check
run "npm run build" stdout="built in"
git-clean
git-tracked index.html
git-ignored dist/index.html
```

## Challenge: a second line on the page

**Optional, ★.** Add a paragraph under the heading, `<p id="version"></p>`, and make `main.ts` put the text `Version 0.1.0` in it. Then misspell its id in one place on purpose, and find the mistake without being told where it is.

```hints
nudge: It's the same two lines as the title: find the element, then set its text if it was found.
concept: querySelector returns null for an id that isn't in the page, and the if hides that. The browser's developer tools (F12, then Elements) show the page's real elements and their ids.
shape: const version = document.querySelector('#version'); if (version) version.textContent = 'Version 0.1.0';
```
