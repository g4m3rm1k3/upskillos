---
title: 2.4 — A hand is a sequence
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

An array groups values in order. Square brackets create an array and also select one element. The first index is 0; five elements occupy indices 0–4. length is a property containing the element count. A dot reads a property by name. Reading a missing index returns undefined. const prevents rebinding the array name, but its elements remain mutable.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. This is the same getElementById/textContent operation traced in Values and names: find the element by its exact id, then replace its displayed text. This display operation does not affect the calculation.



```predict
question: Does dice[1] read the first or second element?
choice: The second
choice: The first
answer: The second
explain: Index zero selects the first position.
```

## Trace the running example

Draw five numbered slots starting at 0. In an array [6,2,6,1,4], index 1 holds 2 and length is 5. The expression dice[1] = 6 changes the second slot, not the first. The array itself is one object: a const binding may still refer to an object whose contents change. A missing slot returns undefined, a special absence value, rather than automatically wrapping around.

Keep the familiar HTML shell and output element. Type only the changed script lines shown in the diff; read the existing lines as context.

```html file=scratch/04-arrays.html
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
const dice = [2, 6, 1, 6, 3];
dice[0] = 4;
document.getElementById("result").textContent = dice[1];
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/04-arrays.html "document.getElementById('result').textContent" "6"
```


**Explore, then restore:** Read dice[0], dice[dice.length - 1] and dice[dice.length] in the Console. Explain the last result. Temporarily append a sixth element in the literal and check that the last-index expression still works; restore the five-element example.

## Try it — Explain and repair a fault

Read dice[5]. Observe undefined, then restore index 1. Assign dice = [1]; observe a const reassignment error and remove it. Compare changing one element with replacing the binding.



## Your turn — Find the last die

Define lastFace(dice) that returns the last element of a nonempty array, including lengths other than five.

Write practice/04-arrays.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/04-arrays.html "JSON.stringify([lastFace([2,6]),lastFace([4])])" "[6,4]"
```

```hints
nudge: Count versus final index differs by one.
concept: length is the number of elements.
shape: Select the element whose index is length minus one.
```
