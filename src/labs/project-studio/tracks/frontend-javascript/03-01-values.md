---
title: 3.1 — JavaScript values, names and decisions
track: Frontend Developer Bootcamp — JavaScript and a Budget Calculator
trackOrder: 50.03
runtime: none
---

Outcome: predict and run a small calculation. JavaScript runs in browsers and, through Node, in a terminal. A value is data; a variable is a name for data. const prevents assigning a new value to that name; let allows reassignment. Numbers calculate, strings represent text, and booleans are true or false.

### The story so far

So far the browser has interpreted descriptions: HTML describes structure and CSS describes presentation. JavaScript adds a sequence of instructions. We begin away from the screen so one calculation is easy to see before event handling adds more moving parts.

You already installed Node. Running `node budget/values.mjs` asks Node to execute that file from top to bottom. Nothing here modifies the café. The new budget folder is another app inside the same portfolio.

## Calculate an order

### A name is a label, not algebraic equality

`const price = 7` gives the value 7 the name price. JavaScript evaluates the right side and binds the name on the left. Unlike an equation in algebra, it does not continuously solve both sides. When another line calculates subtotal, it uses the values available at that moment.

A useful analogy is a labeled note on a workbench. A const binding says you will not replace the value attached to that name. Later you will see objects whose contents can change despite a const binding; the label is fixed, not necessarily everything inside the object.

### Trace every intermediate value

| Line | Calculation | Value afterward |
|---|---|---|
| `price = 7` | Bind a number | price is 7 |
| `quantity = 3` | Bind another number | quantity is 3 |
| `subtotal = price * quantity` | 7 × 3 | subtotal is 21 |
| `subtotal >= 20` | Is 21 at least 20? | true |
| `true ? 0 : 4` | Choose the first branch | delivery is 0 |
| `subtotal + delivery` | 21 + 0 | 21 is printed |

Do the same trace for quantity 2 before running it. Prediction is useful because a mismatch reveals exactly which rule you misunderstood.

Create the file and run node budget/values.mjs. The .mjs extension marks an ES module. = assigns, * multiplies, >= compares. The conditional expression condition ? yes : no chooses one value. console.log prints a value for inspection. Statements run in order. Quotes distinguish "3" from 3; "3" + 2 gives "32", because + also joins strings.

```predict
question: With price 7 and quantity 3, what does the program print?
choice: 21
choice: 25
choice: 18
answer: 21
explain: The subtotal is 21, so the delivery branch chooses 0. The printed total is 21, not the delivery fee alone.
verify: node budget/values.mjs
```

```javascript file=budget/values.mjs
const price = 7;
const quantity = 3;
const subtotal = price * quantity;
const delivery = subtotal >= 20 ? 0 : 4;
console.log(subtotal + delivery);
```

### Three symbols that look related but do different jobs

`=` assigns. `===` compares two values without coercing their types. `>=` compares their ordering. Accidentally assigning when you meant to compare can produce a program that runs and still makes the wrong decision.

JavaScript has several types of value. Numbers support arithmetic; strings are text between quotes; booleans are true/false. `null` is an explicit empty value; `undefined` often means no value was supplied or returned. Do not treat all of these as interchangeable “nothing.”

The `+` operator is especially worth inspecting: `7 + 3` is 10, while `"7" + 3` is the text "73". Form fields usually begin as strings. We will convert at that boundary rather than scattering conversions through every calculation.

### Make the decision readable before making it compact

The conditional expression can be read as an if/else:

```javascript
let delivery;
if (subtotal >= 20) {
  delivery = 0;
} else {
  delivery = 4;
}
```

Both forms choose one result. Use the form you can explain most clearly. **Rule of thumb:** a short ternary is good for choosing between two simple values. Nested ternaries that require rereading should become named intermediate values or an if/else.

A rule can be implemented correctly yet be the wrong product rule. Charging delivery on an empty order is an example. Debugging asks whether the code matches the rule; product design also asks whether the rule makes sense.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain, without running it first, why `"20" + 4` differs from `20 + 4`. Then describe the free-delivery boundary using below, equal to and above the threshold. If your prediction was wrong, identify the exact intermediate value where your trace diverged.
