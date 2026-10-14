---
title: 2.2 — Ask a precise question
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

A comparison produces a Boolean: true or false. === compares values without converting a number to text. if (condition) runs its braced body when the condition is true; else runs the alternative. Braces group statements. >, <, >= and <= compare sizes. ! reverses a Boolean. Strings are not automatically numbers: "6" === 6 is false.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. Read it as “show this answer here”; the objects lesson will explain the browser object in depth. This display operation does not affect the calculation.



```predict
question: What happens when face is 2?
choice: points stays zero
choice: points becomes two
answer: points stays zero
explain: The assignment in the if body is skipped.
```

## Trace the running example

Type this self-contained page. Open it directly in the browser, save and refresh after edits. Open the Console to see errors.

```html file=scratch/02-decisions.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<p id="result"></p>
<script>
const face = 6;
let points = 0;
if (face === 6) { points = 6; }
document.getElementById("result").textContent = points;
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/02-decisions.html "document.getElementById('result').textContent" "6"
```

## Try it — Explain and repair a fault

Replace === with = in the condition: you are attempting assignment, not comparison, and a const assignment throws. Restore === and check faces 2 and 6.



## Your turn — Score Fives

Define fives(face) returning 5 for a five, zero otherwise. Use the function syntax from the small worked wrapper here: function fives(face) { /* statements; return result; */ }. A function names a calculation and runs only when called; face is its input. The next lesson traces calls fully.

Write practice/02-decisions.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-decisions.html "JSON.stringify([fives(5),fives(2),fives(1)])" "[5,0,0]"
```

```hints
nudge: Start from zero.
concept: Only the matching branch changes the result.
shape: Compare window.face strictly with 5, assign points, then display it.
```
