---
title: 4.2 — Controlled Inputs and Feedback
runtime: none
support: Web/tests/rules.test.mjs
reference: optional
---

Outcome: build a form in small changes, explain where typed text lives, and independently decide whether a submission succeeds. Start from lesson 4.1. This is a browser-only preview; the later message lessons connect it to C#.

## Create the field checks

Use **Create provided** to copy these executable examples and this lesson’s support files. Read the input/result pairs; they are test infrastructure rather than a function to type. The built-in Node test runner exits with a failure when an assertion disagrees.

```javascript file=Web/tests/rules.test.mjs provided
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/validateDraft.js';
test('basic fields', () => {
  assert.equal(validateDraft('Ada', '2'), '');
  assert.equal(validateDraft('   ', '2'), 'Enter a name.');
  assert.equal(validateDraft('x'.repeat(41), '2'), 'Use 40 characters or fewer.');
  for (const quantity of ['0', '101', 'oops']) assert.notEqual(validateDraft('Ada', quantity), '');
  for (const quantity of ['1', '100']) assert.equal(validateDraft('Ada', quantity), '');
});
test('integer and blank quantities', () => {
  for (const quantity of ['1.5', '', ' ']) assert.notEqual(validateDraft('Ada', quantity), '');
  assert.equal(validateDraft(' Ada ', '3'), '');
});
test('submission decision', async () => {
  const { previewDraft } = await import('../src/previewDraft.js');
  assert.deepEqual(previewDraft(' Ada ', '2'), { ok: true, message: 'Locally valid: Ada × 2' });
  assert.deepEqual(previewDraft('', '2'), { ok: false, message: 'Enter a name.' });
  assert.deepEqual(previewDraft('Ada', '1.5'), { ok: false, message: 'Use a quantity from 1 to 100.' });
  assert.deepEqual(previewDraft('x'.repeat(41), '2'), { ok: false, message: 'Use 40 characters or fewer.' });
});
```

## Separate validation from the screen

A browser input’s value is text, even for `type="number"`. Keep `quantityText` as a string so an empty field is representable. Call `Number` only when validating or constructing a request. `trim()` removes edge spaces; `===` compares values without converting types; `!` means not; `||` means or. A finite number excludes `NaN` (not a number) and infinity. `if (condition) return value;` is the same early exit you used in C#. An empty string means no error. This first version checks the range; our independent task will add the whole-number rule.

```javascript file=Web/src/validateDraft.js
export function validateDraft(name, quantityText) {
  if (name.trim() === '') return 'Enter a name.';
  if (name.trim().length > 40) return 'Use 40 characters or fewer.';
  if (quantityText.trim() === '') return 'Enter a whole quantity.';
  const quantity = Number(quantityText);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
    return 'Use a quantity from 1 to 100.';
  }
  return '';
}
```

```powershell
node --test --test-name-pattern=basic Web/tests/rules.test.mjs
```

```check
run "node --test --test-name-pattern=basic Web/tests/rules.test.mjs" stdout="pass 1" timeout=60 label="Names and quantity range are validated" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Give one field a state value {#one-controlled-field}

Replace the counter screen with just a name field. An input is **controlled** when React supplies its `value`, and a handler updates that value's state. The `event` argument contains details of this edit; `event.target` is the input, and `.value` is its current text. The short function `(event) => ...` receives that event when React calls it. A surrounding label gives the input its visible and accessible name. [React's input reference](https://react.dev/reference/react-dom/components/input) explains this value/handler pair.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';

export default function App() {
  const [name, setName] = useState('');
  return (
    <main>
      <h1>FormDesk</h1>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <p>You typed: {name}</p>
    </main>
  );
}
```

Start `npm.cmd --prefix Web run dev`. Type `Ada`, select all its letters and delete them. Observe that the paragraph follows every edit, including the empty string. Temporarily remove `onChange`: typing cannot update a value which React keeps supplying. Restore it. This is the same relationship as a WinForms field and its event handler, but React redraws from state. Leave Vite open while doing the next small change.

## Keep quantity text separate from a number {#quantity-text}

Add a second state value and a second input. Its initial value is the string `'1'`. JavaScript's `typeof value` reports a value's type. This paragraph deliberately shows that `'2'` in the field is still text; the validator will later convert it. `type="number"` supplies a numeric input control but does not replace parsing and validation.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';

export default function App() {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  return (
    <main>
      <h1>FormDesk</h1>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Quantity<input type="number" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} /></label>
      <p>You typed: {name} / {quantityText} ({typeof quantityText})</p>
    </main>
  );
}
```

Delete the entire quantity. Predict `Number('')` before running `node -p "Number('')"`: it returns 0. That is why the validator checks blank text before conversion. Restore `2` in the field. Explain why converting on every keystroke would lose the distinction between an empty draft and a number.

## Handle the form submission first {#submit-event}

Wrap the fields in a `form` and move feedback into its own state. A form supplies Enter-key submission as well as a button. `onSubmit={preview}` passes our named function; `event.preventDefault()` keeps submission on this page. `noValidate` disables native validation bubbles so we can observe our own rules. This first handler deliberately reports the draft without judging it. `role="status"` gives changing feedback a status region.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';

export default function App() {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [message, setMessage] = useState('Enter a request.');

  function preview(event) {
    event.preventDefault();
    setMessage('Draft: ' + name + ' × ' + quantityText);
  }

  return (
    <main>
      <h1>FormDesk</h1>
      <form onSubmit={preview} noValidate>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Quantity<input type="number" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} /></label>
        <button type="submit">Preview</button>
      </form>
      <p role="status">{message}</p>
    </main>
  );
}
```

Type a request and press Enter while focused in a field. The message should change without a page reload. Diagnostic: temporarily remove `preventDefault()`, submit and observe the reload/state loss; restore it. Do this before adding validation so a submit-event bug cannot be mistaken for a validation bug.

## Control the fields and show feedback

Add the validator import and restore the preview counter from 4.1. The handler now asks for an error before reporting success. When it gets an error it sets feedback and returns immediately; the success message and count update are below that return. Trace those two paths before running them. Everything else in the form stays the same as the previous small step.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';
import { formatCount } from './formatCount.js';
import { validateDraft } from './validateDraft.js';

export default function App() {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [message, setMessage] = useState('Enter a request.');
  const [count, setCount] = useState(0);

  function preview(event) {
    event.preventDefault();
    const error = validateDraft(name, quantityText);
    if (error !== '') { setMessage(error); return; }
    setMessage('Locally valid: ' + name.trim() + ' × ' + Number(quantityText));
    setCount(count + 1);
  }

  return (
    <main>
      <h1>FormDesk</h1>
      <form onSubmit={preview} noValidate>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Quantity<input type="number" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} /></label>
        <button type="submit">Preview</button>
      </form>
      <p role="status">{message}</p>
      <small>{formatCount(count)}</small>
    </main>
  );
}
```

Run `npm.cmd --prefix Web run dev`. Try a blank name, `Ada` with quantity `2`, and quantity `101`. Stop it with Ctrl+C afterward.

```predict
question: With name Ada and quantity 101, what appears after Preview?
choice: Use a quantity from 1 to 100.
choice: The previous result stays visible
answer: Use a quantity from 1 to 100.
explain: The validator returns its first error, so the handler returns before incrementing the count.
```

Diagnostic experiment: temporarily remove only the `return` after `setMessage(error)`. Submit a blank name and observe the error being replaced by a success message and the count increasing. Restore the return. Explain why this was a control-flow error even though the validator returned the right answer. The build checks JSX syntax, and the pure function tests cover selected rules. Neither proves keyboard interaction. Stop Vite with Ctrl+C after this check.

```check
run "npm.cmd --prefix Web run build" stdout="built in" timeout=120 label="Controlled form compiles" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Your turn: require a whole quantity

Reject quantity `1.5` while preserving `1` and `100` as valid. Keep the existing range error message. Do this in `validateDraft`, so every caller gets the same rule. JavaScript’s `Number.isInteger(value)` returns true only for a finite whole number; choose where it belongs. Also make sure empty text is rejected. Write `evidence/react-4-2.md` with an observation, the cause of the read-only diagnostic, and your own additional valid and invalid input pair. Manually use Tab and Enter to submit the form after restoring it.

```hints
nudge: A fractional value passes the range checks; which numeric question was never asked?
concept: The validator already converts the string to a number. Test that number, not the original text.
shape: Replace the finite-number condition with an integer condition while preserving the lower and upper bounds.
```

```check
run "node --test --test-name-pattern=\"basic|integer\" Web/tests/rules.test.mjs" stdout="pass 2" timeout=60 label="Blank, fractional and out-of-range quantities are rejected" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Return two related values {#result-object}

The next task needs both a yes/no decision and text. A JavaScript **object** groups named values, much like a small Python dictionary. `{ ok: false, message: 'Enter a name.' }` creates one; `result.ok` reads its boolean field. Object braces create data, whereas a function's braces enclose statements. Run this small experiment before writing your own function:

```javascript file=Web/experiments/result.mjs
const result = { ok: false, message: 'Enter a name.' };
if (result.ok) {
  console.log('Count this preview');
} else {
  console.log(result.message);
}
```

Run `node Web/experiments/result.mjs`, predict its output, then change only `false` to `true` and run again. Notice that `'false'` with quotes is a nonempty string and would also take the true branch; restore the boolean `false`. This object is ordinary JavaScript data, not React state, a C# object, or a message to another program.

## Your turn: decide whether a preview counts {#preview-decision}

Create `Web/src/previewDraft.js` and export `previewDraft(name, quantityText)`. Reuse `validateDraft`; do not repeat its rules. Return an object with exactly `ok` and `message`. For an error, `ok` must be false and `message` must be that error unchanged. Otherwise return true with `Locally valid: Ada × 2` for the inputs `' Ada '` and `'2'`. Use the trimmed name and the converted number in that success message. You choose the decision and early-return structure. This is the decision our event handler will trust before it increases the counter.

```hints
nudge: Work out the two complete objects for a blank name and for Ada before opening the editor.
concept: Import validateDraft, call it once, then inspect the returned string. The error branch must finish before you construct success feedback.
shape: Start with an exported function, store the error in a const, return an object in the error branch, and return the different object at the end. Object property names go before colons.
```

```check
run "node --test Web/tests/rules.test.mjs" stdout="pass 3" timeout=60 label="Submission results distinguish errors from accepted drafts" -- Inspect the failed input/result pair and trace the branch that produced it.
```

Add your own invalid case to the submission test and predict the whole result object before executing it. Record that result, your explanation of the missing-return diagnostic, and the independent test in `evidence/react-4-2.md`. These tests execute your decision function; the next browser check establishes that the screen actually uses it.

## Use the decision in the event handler {#use-preview-decision}

Replace only the validator import and the middle of `preview`: the function you just built now owns the two outcomes. The screen copies its message and counts only `ok` results. `if (result.ok)` means "if that boolean is true". Add a Reset button too: its `type="button"` avoids submitting the surrounding form, and the handler resets the draft while leaving the session's count intact. React updates these controlled fields when their state setters run; a native HTML reset alone would not reset our React state.

```jsx file=Web/src/App.jsx
import React, { useState } from 'react';
import { formatCount } from './formatCount.js';
import { previewDraft } from './previewDraft.js';

export default function App() {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [message, setMessage] = useState('Enter a request.');
  const [count, setCount] = useState(0);

  function preview(event) {
    event.preventDefault();
    const result = previewDraft(name, quantityText);
    setMessage(result.message);
    if (result.ok) setCount(count + 1);
  }

  function reset() {
    setName('');
    setQuantityText('1');
    setMessage('Enter a request.');
  }

  return (
    <main>
      <h1>FormDesk</h1>
      <form onSubmit={preview} noValidate>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Quantity<input type="number" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} /></label>
        <button type="submit">Preview</button>
        <button type="button" onClick={reset}>Reset</button>
      </form>
      <p role="status">{message}</p>
      <small>{formatCount(count)}</small>
    </main>
  );
}
```

Run Vite again. Using only Tab, typing, Enter and Space: submit Ada/2, submit a blank name, then reset after that error. The count must go 0 → 1 → 1 → 1; Reset must restore an empty name, quantity 1 and the original message. Independently choose a second sequence, write its expected states first, then compare the observed states. A green build cannot establish these interactions. Stop Vite afterward.

```check
run "npm.cmd --prefix Web run build" stdout="built in" timeout=120 label="The form imports the independently built decision" -- Resolve the first module or JSX error, then perform the keyboard sequence yourself.
```
