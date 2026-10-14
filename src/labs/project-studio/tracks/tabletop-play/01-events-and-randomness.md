---
title: 3.1 — A button that does something
runtime: none
---

### The story so far

You can trace values, conditions, functions, arrays and objects. The browser page has a button but no behavior.

### What this lesson builds

Connect a named event handler and map a random number to a die face.

## The browser calls you later

addEventListener registers a function to run when an event happens. The first argument names the event: click also covers keyboard activation of a native button. The second argument is the function itself. roll passes the function; roll() would call it immediately and pass its result. JavaScript finishes the current work, then handles later events. This is event-driven execution.

Math is a standard object. Math.random() produces a number from zero inclusive to one exclusive. Multiply by 6 to get [0,6), use Math.floor to round downward to 0–5, and add 1 for 1–6. For random input 0.5, the trace is 0.5 → 3 → 3 → 4. It is suitable for a local game, not a security protocol.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<main><h1>Sixes practice</h1><p id="result">1</p><button id="roll">Roll</button></main>
<script>
let face = 1;
function render() {
  document.getElementById('result').textContent = face;
}
function roll() {
  face = 1 + Math.floor(Math.random() * 6);
  render();
}
document.getElementById('roll').addEventListener('click', roll);
render();
</script>
</body>
</html>
```

render reads state and updates the page; roll changes state and calls render. Keeping those jobs separate prevents a display refresh from rolling again. document is the browser document object; getElementById returns the element matching an id, and addEventListener is a method on that element.

```check
page index.html "document.getElementById('result').textContent" "1"
```

```predict
question: If you pass roll() instead of roll to addEventListener, when does the roll happen?
choice: During setup
choice: Only on the click
answer: During setup
explain: The parentheses call the function immediately; the return value is not your intended handler.
```

## Try it — Remove chance from a test

Temporarily replace Math.random() with 0, then 0.999. Refresh and click to see faces 1 and 6. Restore Math.random(). This tests the endpoints of the mapping without waiting for lucky random rolls. The page check only confirms initialization; manually click and use Enter on the focused button too.



## Your turn — Map a controlled roll

Define faceFrom(unit) for a unit input at least 0 and less than 1. Return an integer face 1–6.

Write practice/01-events-and-randomness.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/01-events-and-randomness.html "JSON.stringify([faceFrom(0),faceFrom(0.5),faceFrom(0.999)])" "[1,4,6]"
```

```hints
nudge: What is the largest possible floor?
concept: Rounding down keeps the result below six before adding one.
shape: Multiply by six, floor, then shift the range by one.
```
