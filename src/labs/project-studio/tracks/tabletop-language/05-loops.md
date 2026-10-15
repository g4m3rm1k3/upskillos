---
title: 2.5 — Repeat and accumulate
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

for has three parts separated by semicolons: initialize a counter once; check a condition before every iteration; advance after each body. i += 1 means i = i + 1. total is an accumulator: it retains the sum between iterations. The braces mark which statements repeat.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. This is the same getElementById/textContent operation traced in Values and names: find the element by its exact id, then replace its displayed text. This display operation does not affect the calculation.



```predict
question: At the start of iteration i=2, what is total?
choice: 6
choice: 12
answer: 6
explain: Only indices 0 and 1 have been processed; index 2 adds the second six.
```

## Trace the running example

For [6,2,6,1,4], write a trace with columns i, face, total before, total after. The rows are 0/6/0/6, 1/2/6/6, 2/6/6/12, 3/1/12/12, 4/4/12/12. At i=5 the condition i < dice.length fails before the body runs. Starting total inside the loop would discard previous work; advancing i before reading would skip the first slot.

Keep the familiar HTML shell and output element. Type only the changed script lines shown in the diff; read the existing lines as context.

```html file=scratch/05-loops.html
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
const dice = [6, 2, 6, 1, 4];
let total = 0;
for (let i = 0; i < dice.length; i += 1) {
  if (dice[i] === 6) total += 6;
}
document.getElementById("result").textContent = total;
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/05-loops.html "document.getElementById('result').textContent" "12"
```


**Explore, then restore:** Use an empty array: the initial condition fails and the total should stay 0. Use [6] and expect 6. Restore the original hand. Explain why neither case needs a special branch outside the loop.

## Try it — Explain and repair a fault

Move let total = 0 inside the loop. It resets every iteration and is not in scope after the loop. Restore its position. Then try <= dice.length and explain the extra undefined read.



## Your turn — Count matches

Define countFace(dice, wanted) returning the number of matching faces, not their point sum. Empty input returns zero.

Write practice/05-loops.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/05-loops.html "JSON.stringify([countFace([6,2,6],6),countFace([],6),countFace([1],6)])" "[2,0,0]"
```

```hints
nudge: Which value should start at zero?
concept: Count grows by one for a match.
shape: Keep the accumulator outside the loop; compare each element, then return the accumulator.
```
