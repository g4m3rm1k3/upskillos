---
title: 3.3 — A calculator with accessible forms and DOM events
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
---

Outcome: turn the pure budget rule into a working browser app. The **DOM** is the browser’s object tree representing HTML. querySelector finds an element by a CSS selector. An event listener runs a callback when an event occurs. A form’s submit event supports both a click and Enter.

### The story so far

The model can now calculate and reject invalid input independently. We will connect that trusted operation to the browser. You already know semantic HTML, selectors, function calls and errors; the new concepts are DOM objects and events.

The form is an adapter: it reads the browser’s representation of input, calls the model, and translates the result back into useful text. Keeping those jobs separate makes defects easier to locate.

## Label every input

Before trying this step, make a prediction.

```predict
question: Will an empty required field normally reach the submit handler?
choice: No
choice: Yes
answer: No
explain: Native form validation prevents submission before the handler runs.
```

Each label for matches an input id. name exposes that input through form.elements. Native type, min, step and required attributes provide basic validation. Place instructions before mistakes happen; placeholder text is not a label. This is a teaching budget, not an accounting system: floating-point numbers are unsuitable for exact money ledgers; production money usually uses integer minor units.

```html file=budget/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pocket Budget</title>
  <link rel="stylesheet" href="../cafe/styles.css">
</head>
<body>
  <main>
    <h1>Pocket Budget</h1>
    <form id="budget">
      <p><label for="income">Monthly income ($)</label><input id="income" name="income" type="number" min="0" step="0.01" required></p>
      <p><label for="expenses">Monthly expenses ($)</label><input id="expenses" name="expenses" type="number" min="0" step="0.01" required></p>
      <button>Calculate remaining</button>
    </form>
    <p id="result" role="status">Enter your monthly amounts.</p>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

### Why labels and native validation come first

A label is a programmatic relationship, not just nearby text. Clicking it focuses the associated control, and assistive tools use it as the control’s name. The input id identifies the element; name identifies its value to form APIs. They can match, but they are separate attributes with different jobs.

`required` rejects an empty value. `min="0"` rejects negative amounts. `step="0.01"` describes allowed increments. Those improve the user’s path through the form, while the model still guards its own callers. An invalid native form normally prevents the submit event before your handler runs.

**Rule of thumb:** use a native control that already expresses the task, then enhance only what the task needs. A custom number widget, checkbox or select also inherits responsibility for keyboard behavior, naming, focus and error communication.

```check
page budget/index.html "document.querySelector('#income').labels[0].textContent" "Monthly income ($)" server=static
```

## Connect submit to the calculation

### An event listener is a standing instruction

A doorbell analogy helps: attaching a listener does not ring the bell; it tells the system what to do when the bell rings. `addEventListener('submit', callback)` stores a function for later. The browser supplies an event object when submission happens.

The analogy stops at event mechanics. A browser event has defaults and propagation rules; pressing Enter in a form can submit it even without a mouse click. That is why we listen to submit on the form instead of only click on the button.

### Follow one interaction across representations

```text
person types 100 and 25
  → inputs hold text and browser validity information
  → submit event occurs
  → preventDefault keeps this document in place
  → valueAsNumber reads 100 and 25 as numbers
  → remaining returns 75
  → toFixed(2) formats "75.00"
  → textContent displays the result
```

At each arrow, ask whether data, representation or control flow changed. This question is more useful for debugging than repeatedly clicking the button.

The browser normally submits a form by navigating; preventDefault keeps this app on the page. valueAsNumber converts a number input; empty input would produce NaN. The try/catch handles our model errors. textContent writes plain text safely, while HTML insertion could interpret untrusted markup. role="status" announces a changing result without stealing keyboard focus. Serve with npm run dev and open /budget/index.html.

```javascript file=budget/app.js
import { remaining } from './model.mjs';
const form = document.querySelector('#budget');
const result = document.querySelector('#result');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const income = form.elements.income.valueAsNumber;
    const expenses = form.elements.expenses.valueAsNumber;
    result.textContent = `Remaining: $${remaining(income, expenses).toFixed(2)}`;
  } catch (error) {
    result.textContent = error.message;
  }
});
```

### Read the callback from top to bottom

`const form = document.querySelector('#budget')` asks for one matching DOM element. It returns null if no element matches. A later `.addEventListener` on null means you must inspect the selector and loading order, not the budget arithmetic.

`event.preventDefault()` cancels the browser’s normal form navigation for this event. It does not cancel your own JavaScript statements. The try block can still run and update the page.

A template literal uses backticks and `${...}` to insert an expression into text. `toFixed(2)` returns a formatted string; it does not improve the numerical precision of the earlier calculation. Display formatting and arithmetic representation are different concerns.

`textContent` treats the result as text. This matters because anything a user or API supplies may contain angle brackets. Plain text should stay plain text; it should not become an instruction to create HTML elements.

The live status tells assistive tools that the result changed. It does not require moving focus away from the input. After an error, a person should still know what happened and how to continue.

```check
page budget/index.html "(() => { const f = document.querySelector('form'); f.elements.income.value = '100'; f.elements.expenses.value = '25'; f.requestSubmit(); return document.querySelector('#result').textContent; })()" "Remaining: $75.00" server=static
```

## Your turn: make deficits understandable

If remaining is negative, show Over budget: $ followed by the positive deficit with two decimal places; otherwise keep Remaining: $. Use the existing validated function once and store its result in a const. Test income 20 and expenses 30 as well as equal amounts.

```check
page budget/index.html "(() => { const f = document.querySelector('form'); f.elements.income.value = '20'; f.elements.expenses.value = '30'; f.requestSubmit(); return document.querySelector('#result').textContent; })()" "Over budget: $10.00" server=static
```

```hints
nudge: Distinguish a valid negative result from invalid negative input.
concept: Math.abs gives magnitude; a conditional chooses wording.
shape: Compute once, branch on balance < 0, and preserve the nonnegative message.
```

## Diagnose, explain and review

Temporarily remove preventDefault and submit. Observe navigation/reload, then restore it. Submit an empty form: native validation prevents the handler. Use keyboard only and click each label to ensure it focuses its input. Explain why checking only that a submit button exists would miss a broken calculator.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

A form appears correctly but pressing Enter reloads the page. Identify the layer you would inspect first and why. Then explain why a model test can pass while the form is broken, and why setting textContent is a safer choice than parsing untrusted input as HTML.
