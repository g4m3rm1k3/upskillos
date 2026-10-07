---
title: 0.7 — Testing the Window, End to End
track: Build Your Own Game Studio
runtime: none
concepts: e2e-testing, playwright, async-await, try-finally
problem: Vitest tests greet, but not whether the app starts, whether the page's script loads, or whether the heading shows the greeting. Lesson 0.6 showed all three can fail with no error anywhere. How do you test the whole program, the way a person would use it?
---

The tests so far are **unit tests**: each one calls one function and checks what it returns. An **end-to-end test** starts the whole app, as a user would, and checks what's on screen. It's slower (a second or two instead of a millisecond), so a project has many unit tests and a few end-to-end ones, for the things only the whole app can show.

**Playwright** is a library that drives a browser from a program: it opens pages, clicks, types and reads what's shown. It can also drive an Electron app. Vitest runs the test; Playwright works the app.

## Install Playwright

```powershell
npm install --save-dev --save-exact playwright@1.63.0
```

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc",
    "test": "vitest run src"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

- Playwright can download its own browsers (`npx playwright install`). This project doesn't need them: it drives the Electron you installed in lesson 0.6.

```check
contains package.json "\"playwright\": \"1.63.0\"" -- npm install --save-dev --save-exact playwright@1.63.0
run "npx playwright --version" stdout="Version 1.63.0"
```

## The end-to-end test

End-to-end tests live in their own folder, `e2e`, next to `src`, so `npm test` keeps running only the fast ones. Create `e2e/app.test.ts`:

```ts file=e2e/app.test.ts
import { expect, test } from 'vitest';
import { _electron as electron } from 'playwright';

test('the app opens a window that greets the studio', async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const page = await app.firstWindow();
    await expect.poll(() => page.textContent('#title')).toBe('Hello, Studio!');
    expect(await page.title()).toBe('Studio');
  } finally {
    await app.close();
  }
}, 30000);
```

- `import { _electron as electron }`: Playwright exports its Electron driver as `_electron`. (The `_` marks it as experimental.) `as` gives the import a different name in this file.
- `async () => { … }` is an **async function**. Inside it, `await` waits for a promise to resolve and gives back its value. Code after an `await` runs only once the value has arrived. Without `await`, you'd chain `.then(…)` calls, as in lesson 0.2. An async function itself returns a promise, and Vitest waits for it before it reports the test.
- `electron.launch({ args: ['.'] })` starts Electron the way `electron .` does, so `"main"` in `package.json` decides what runs. `app` is an object that controls the running app.
- `app.firstWindow()` waits for the app's first window and gives back a `page`: an object that reads and controls what's in that window.
- `page.textContent('#title')` finds the element by the same selector as `main.ts` and gives back a promise of its text.
- `expect.poll(fn)` calls `fn` repeatedly, every 50 milliseconds, until the value passes `.toBe(…)` or a second has gone by. The window shows the HTML before `main.ts` has run, so reading the heading only once could catch it still empty.
- `page.title()` is the text of `<title>`, the window's title bar.
- `try { … } finally { … }`: the `finally` block runs however the `try` block ends, even when an `expect` throws. So the app is closed every time, and a failed test never leaves a window open.
- `30000` is the test's **timeout** in milliseconds. Vitest's default is 5 seconds, and starting Electron can take longer the first time.

Run it. It tests the built page, so build first:

```powershell
npx vite build
npx vitest run e2e
```

A window flashes open and closes, and Vitest reports `1 passed`.

```check
run "npx vite build" stdout="built in"
run "npx vitest run e2e" stdout="1 passed" label="the end-to-end test passes"
```

## Type-checking the test too

`tsconfig.json` checks only `src`. Add `e2e`:

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src", "e2e"]
}
```

- The test is code too, and a test with a type error can pass or fail for the wrong reason. Playwright ships its own types, so `npx tsc` knows what `app` and `page` are.

```check
contains tsconfig.json "\"include\": [\"src\", \"e2e\"]"
run "npx tsc" label="the end-to-end test type-checks"
```

## A script that builds first

The test reads `dist`, not `src`. Run it after changing `main.ts` without building, and it tests the old page. Make a script that always builds first:

```json file=package.json
{
  "name": "studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite build && electron .",
    "typecheck": "tsc",
    "test": "vitest run src",
    "e2e": "vite build && vitest run e2e"
  },
  "devDependencies": {
    "electron": "44.6.0",
    "playwright": "1.63.0",
    "typescript": "7.0.2",
    "vite": "8.3.3",
    "vitest": "5.0.3"
  }
}
```

```check
run "npm run e2e" stdout="1 passed"
```

## Red, on purpose

Lesson 0.5 showed that a misspelled selector empties the heading without any error. Now there's a test that should catch it. Misspell it in `src/main.ts`:

```ts file=src/main.ts
import { greet } from './greet';

const title = document.querySelector('#titel');
if (title) title.textContent = greet('Studio');
```

```predict
question: What does npm run e2e report?
choice: 1 passed: the page still loads, and the title is still Studio
choice: 1 failed: the heading's text is '' instead of Hello, Studio!
choice: An error before the test runs: #titel doesn't exist
answer: 1 failed: the heading's text is '' instead of Hello, Studio!
explain: The app starts, the window opens, and the h1 is there, but nothing set its text. expect.poll keeps reading '' for a second and then fails with expected '' to be 'Hello, Studio!'. The finally block still closes the app.
```

```text
 FAIL  e2e/app.test.ts > the app opens a window that greets the studio
AssertionError: expected '' to be 'Hello, Studio!' // Object.is equality
 ❯ e2e/app.test.ts:8:57
Caused by: Error: Matcher did not succeed in time.
```

- *Matcher did not succeed in time*: `expect.poll` kept trying for its whole second, and the last value it read was `''`.
- `e2e/app.test.ts:8:57` points at the line in the test that failed. The mistake is in `main.ts`. A test says *what* is wrong; finding *why* is still your job.

```check
run "npm run e2e" exit=1 stderr="expected '' to be 'Hello, Studio!'" label="the test catches the empty heading"
```

## Green again

Put the selector back:

```ts file=src/main.ts
import { greet } from './greet';

const title = document.querySelector('#title');
if (title) title.textContent = greet('Studio');
```

```check
run "npm run e2e" stdout="1 passed"
```

## Commit, and tick the story

The window story is done: it's committed, its test passes, and the app starts. Tick the fourth story in `BACKLOG.md` (*the studio to open in its own window*), then:

```powershell
git add .
git commit -m "An end-to-end test: the window greets the studio"
```

```check
contains BACKLOG.md "- [x] As a user, I want the studio to open in its own window"
git-clean
git-tracked e2e/app.test.ts
```

## Challenge: test the window's size

**Optional, ★★.** Add a second test to `e2e/app.test.ts` that checks the window opens 1000 by 700. A page can't see its own window's size, but the main process can. `app.evaluate(fn)` runs a function inside the main process and gives back what it returns. Watch the test fail first by changing the size in `main.ts`.

```hints
nudge: The function you pass to app.evaluate receives the electron module as its argument, so it can use BrowserWindow.
concept: BrowserWindow.getAllWindows() is a list of every open window; a window's getSize() returns [width, height]. toEqual compares lists item by item, where toBe would compare whether they're the same list.
shape: const size = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getSize()); expect(size).toEqual([1000, 700]);
```
