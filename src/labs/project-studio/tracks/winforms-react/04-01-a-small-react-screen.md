---
title: 4.1 — A Small React Screen
track: WinForms to React — A Local React Interface
trackOrder: 47.03
runtime: none
support: Web/tests/count.test.mjs
reference: optional
---

Prerequisites: finish the C# and WinForms chapters in this series. Your existing `Core/` owns the name and quantity rules; `FormDesk/` remains runnable for comparison. Work from the same project root in **Windows PowerShell**. This chapter changes the interface while keeping those C# rules. No external application or SDK is involved.

Outcome: trace a click from a callback through a state update to a new paragraph, then change a decision without copying its implementation. JavaScript runs in a browser; C# still runs in .NET. JSX is JavaScript with markup expressions, compiled before the browser loads it. This lesson introduces one button; text fields come next.

## Prepare the web tools

Install the current Node.js LTS from [Node.js](https://nodejs.org/en/download) if needed. Close and reopen the PowerShell terminal, then run `node --version` and `npm.cmd --version`. Use npm.cmd in Windows PowerShell to select npm’s command launcher without requiring a PowerShell script policy change. Vite 8 requires Node 20.19+ or 22.12+; this material was checked with Node 24.12.0. Node runs the build tools; npm downloads the exact packages named below. `private` prevents accidental npm publication; `type: module` permits `import` and `export`. These versions are fixed for this project, rather than a command that changes its template over time.

```json file=Web/package.json
{
  "name": "formdesk-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": { "dev": "vite --host 127.0.0.1", "build": "vite build", "test": "node --test tests/*.test.mjs" },
  "dependencies": { "react": "18.3.1", "react-dom": "18.3.1" },
  "devDependencies": { "vite": "8.3.4" }
}
```

[Official Vite setup requirements](https://vite.dev/guide/).

## Give React a place to draw

`index.html` is the page. Its `root` element is an empty container, and its module script starts our program. The content policy limits scripts and frames; the websocket exception permits Vite’s local development reload.

```html file=Web/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:*; img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'" />
    <title>FormDesk</title>
  </head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
```

## Add readable presentation

CSS applies presentation rules to HTML elements. Here `main` names an element; `[role="status"]` selects the element with that attribute. These styles affect appearance rather than validation.

```css file=Web/src/style.css
body { font: 18px system-ui, sans-serif; background: #edf2f7; color: #182b40; margin: 0; }
main { max-width: 36rem; margin: 2rem auto; padding: 2rem; background: white; border-radius: 1rem; }
label { display: block; margin-top: 1rem; }
input, button { font: inherit; padding: .6rem; }
input { display: block; width: 90%; border: 1px solid #718096; }
button { margin-top: 1rem; cursor: pointer; }
button:disabled { cursor: wait; }
[role="status"] { min-height: 3rem; }
small { display: block; margin-top: .5rem; }
```

## Make one small formatting function

`export` makes a function available to another file, like a Python module function. JavaScript uses braces around a function body and `const` for a name that will not be reassigned. `+` joins these strings; count is converted to text during that join.

```javascript file=Web/src/formatCount.js
export function formatCount(count) {
  return 'Previewed ' + count + ' requests';
}
```

## Run JavaScript before JSX {#javascript-first}

Use a tiny Node program to see what the formatting function actually returns. `import { formatCount }` selects a named export, like `from module import formatCount` in Python. The `.mjs` extension makes this a JavaScript module. `let` permits reassignment; `const` does not. A JavaScript function uses braces instead of Python indentation, and `console.log` prints a value. The function below is a callback: a function stored for another piece of code to call later. We call it ourselves before giving this job to React.

```javascript file=Web/experiments/click.mjs
import { formatCount } from '../src/formatCount.js';

let count = 0;
function click() {
  count = count + 1;
}
console.log(formatCount(count));
click();
click();
console.log(formatCount(count));
```

```predict
question: What does the last line print after both calls to click?
choice: Previewed 2 requests
choice: Previewed 0 requests
answer: Previewed 2 requests
explain: Defining click did not increment anything; each later click() call executed the assignment once.
```

Run `node Web/experiments/click.mjs`. Temporarily replace the second `click()` with just `click` and rerun: the final count becomes 1 because referring to a function does not call it. Restore `click()`. Keep that distinction in mind when reading `onClick` next. These console variables persist during this script; React component variables are recreated during a render, so React needs its state hook to remember the count.

```check
run "node Web/experiments/click.mjs" stdout="Previewed 2 requests" timeout=60 label="A callback changes the count only when called" -- Check the calls and assignments, then run the experiment again.
```

## Draw a component with state

A component is a function returning the screen’s markup. JSX uses `className` where HTML uses `class`, and braces insert JavaScript values or functions. Our example needs no class attribute. `useState(0)` returns the current value and its setter; the square brackets unpack the pair. Calling the setter requests a new render. `() => expression` is a short function with no arguments. Pass that function to `onClick` so React calls it when the event occurs; calling `setCount` during rendering would keep asking for another render.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';
import { formatCount } from './formatCount.js';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>FormDesk</h1>
      <p>{formatCount(count)}</p>
      <button onClick={() => setCount(count + 1)}>Preview</button>
    </main>
  );
}
```

`<main>`, `<h1>`, `<p>` and `<button>` are normal HTML elements. The component returns one outer element containing the others. Unlike C#, JavaScript normally infers a variable’s type from its value.

## Start React and run the screen

`import` names code from another module. A path starting `./` means a file beside this one; `react` names an installed package. `createRoot(...).render(<App />)` asks React to draw our component inside the HTML container.

```jsx file=Web/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(<App />);
```

Run from the project root:

```powershell
npm.cmd --prefix Web install
npm.cmd --prefix Web run build
npm.cmd --prefix Web run dev
```

Open the exact local URL printed by Vite. The `--prefix Web` option runs npm using that folder without changing your terminal’s working folder. Keep the terminal open while observing the page.

```predict
question: After clicking Preview twice, what does the paragraph say?
choice: Previewed 2 requests
choice: The previous result stays visible
answer: Previewed 2 requests
explain: Each click calls the setter with the current count plus one, and React redraws the paragraph.
```

Observe `0`, `1`, then `2`. Diagnostic experiment: change the button handler from `setCount(count + 1)` to `setCount(count)`. Predict, click, and explain why it no longer increments. Restore `count + 1`. Stop Vite with **Ctrl+C**. Building compiles JSX and creates `Web/dist`; it does not test clicking or screen-reader behavior.

```check
run "npm.cmd --prefix Web run build" stdout="built in" timeout=120 label="Frontend compiles" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Create the label checks

Use **Create provided** to copy these executable examples and this lesson’s support files. Read the input/result pairs; they are test infrastructure rather than a function to type. The built-in Node test runner exits with a failure when an assertion disagrees.

```javascript file=Web/tests/count.test.mjs provided
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCount } from '../src/formatCount.js';
test('count labels', () => {
  assert.equal(formatCount(0), 'Previewed 0 requests');
  assert.equal(formatCount(1), 'Previewed 1 request');
  assert.equal(formatCount(2), 'Previewed 2 requests');
});
```

## Your turn: one request or many

Change only `formatCount` so count 1 says `Previewed 1 request`, while 0 and 2 say `requests`. First write the input/output pairs on paper and decide how to choose the word. Use the `if` and `return` shape you learned in C#, or the conditional expression in the hints. Do not edit the tests to accept the old wording. The preceding provided-test step creates the test file; run it after your change. Retain three notes in `evidence/react-4-1.md`: an observed result, an explanation of the setter experiment, and one additional count you chose and tested. The function tests cover labels; reopen the screen and use Tab then Space to check that the button updates it. Stop the server afterward.

```hints
nudge: Which part of the sentence changes for exactly one?
concept: Use === for equality. A conditional expression is condition ? valueIfTrue : valueIfFalse; it chooses a value.
shape: Choose a noun in one local variable, then concatenate the prefix, count, space and noun.
```

```check
run "node --test Web/tests/count.test.mjs" stdout="pass 1" timeout=60 label="Singular and plural labels work" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```
