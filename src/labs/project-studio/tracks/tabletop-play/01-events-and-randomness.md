---
title: 3.1 — A button that does something
runtime: none
---

### The story so far

You can trace values, conditions, functions, arrays and objects. The browser page has a button but no behavior.

### What this lesson builds

Connect a named event handler and map a random number to a die face.

## The browser calls you later

First separate two moments: loading the page registers a listener; clicking later calls it. `addEventListener('click', roll)` passes the function itself. Writing roll() there would call it during setup and pass its result instead. A **callback** is a function given to other code to call later. The browser creates the click event and invokes our callback.

Math.random() returns a number at least 0 and less than 1. Multiply by 6 to get [0,6); Math.floor rounds downward to an integer 0–5; adding 1 gives 1–6. Trace inputs 0 → 1, 0.5 → 4 and 0.999 → 6. The right endpoint is excluded, so this mapping cannot produce 7. Randomness does not promise each face appears once in every six clicks. The callback updates a DOM property, so the new text becomes visible after it returns.

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


**Explore, then restore:** Temporarily replace Math.random() with 0, then 0.999. Click and verify the two endpoints. Restore randomness. Move the +1 inside Math.floor without changing its value and explain why it still works here; remove +1 entirely and explain the invalid zero face.

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
