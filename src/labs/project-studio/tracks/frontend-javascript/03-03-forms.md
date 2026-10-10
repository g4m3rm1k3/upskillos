---
title: 3.3 — A calculator with accessible forms and DOM events
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
reference: optional
---

Outcome: turn the pure budget rule into a working browser app. The **DOM** is the browser’s object tree representing HTML. querySelector finds an element by a CSS selector. An event listener runs a callback when an event occurs. A form’s submit event supports both a click and Enter.

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

```check
page budget/index.html "document.querySelector('#income').labels[0].textContent" "Monthly income ($)" server=static
```

## Connect submit to the calculation

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
