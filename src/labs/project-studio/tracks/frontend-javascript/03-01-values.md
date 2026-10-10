---
title: 3.1 — JavaScript values, names and decisions
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
reference: optional
---

Outcome: predict and run a small calculation. JavaScript runs in browsers and, through Node, in a terminal. A value is data; a variable is a name for data. const prevents assigning a new value to that name; let allows reassignment. Numbers calculate, strings represent text, and booleans are true or false.

## Calculate an order

Create the file and run node budget/values.mjs. The .mjs extension marks an ES module. = assigns, * multiplies, >= compares. The conditional expression condition ? yes : no chooses one value. console.log prints a value for inspection. Statements run in order. Quotes distinguish "3" from 3; "3" + 2 gives "32", because + also joins strings.

```predict
question: What delivery fee applies when the subtotal is 21?
choice: 0
choice: 4
answer: 0
explain: 21 is at least 20, so the true branch chooses zero.
```

```javascript file=budget/values.mjs
const price = 7;
const quantity = 3;
const subtotal = price * quantity;
const delivery = subtotal >= 20 ? 0 : 4;
console.log(subtotal + delivery);
```

```check
run "node budget/values.mjs" stdout="21"
```

## Your turn: test the boundary

Change quantity to 2, keeping the other rules. Predict the total, then run it. Also try quantity 0 and exactly enough items for free delivery; explain which result seems inappropriate for an empty order. We will learn explicit validation next.

```check
run "node budget/values.mjs" stdout="18"
```

```hints
nudge: Calculate subtotal before delivery.
concept: A subtotal below 20 adds four.
shape: Change only quantity; two items cost fourteen before delivery.
```

## Diagnose, explain and review

Remove the quotes from a temporary console.log("hello") call: JavaScript looks for a variable named hello and raises ReferenceError. Read the first relevant line and restore the string. Distinguish syntax errors (cannot parse), runtime errors (fails while running), and logic errors (runs with the wrong answer).

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
