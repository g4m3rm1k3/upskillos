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

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. This is the same getElementById/textContent operation traced in Values and names: find the element by its exact id, then replace its displayed text. This display operation does not affect the calculation.



```predict
question: What happens when face is 2?
choice: points stays zero
choice: points becomes two
answer: points stays zero
explain: The assignment in the if body is skipped.
```

## Trace the running example

Trace both paths before typing: face 6 makes face === 6 true, so points changes from 0 to 6; face 2 makes it false, so points remains 0. Equality produces a Boolean, not a score. The initial zero covers the nonmatching case. An if statement is not a repeated check: it runs when execution reaches it. Changing face later does not automatically rerun this statement.

Keep the familiar HTML shell and output element. Type only the changed script lines shown in the diff; read the existing lines as context.

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


**Explore, then restore:** Try face 6, 2 and the string "6" separately, saving and refreshing each time. Record 6, 0 and 0. Restore numeric 6. Explain the difference between assigning a value and comparing it.

## Try it — Explain and repair a fault

Replace === with = in the condition: you are attempting assignment, not comparison, and a const assignment throws. Restore === and check faces 2 and 6.



## Make an input callable {#callable-input}

The practice checker needs to try several inputs without editing your page each time. Give a calculation a name. `function echo(value)` defines a function with one input name, value. Braces contain its statements. `return value` sends that input back to the caller and ends the call. The definition alone runs nothing. `echo(5)` calls it with 5; `echo(2)` calls it with 2. This small wrapper is the only new syntax needed for the next task; the next lesson traces function calls in depth.

Run this scratch page, then change the call to echo(2) and predict 2. Restore 5. Your next function will make a decision inside the same braced body rather than simply returning the input.

```html file=scratch/callable-input.html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>One input</title></head><body>
<p id="result"></p>
<script>
function echo(value) {
  return value;
}
document.getElementById("result").textContent = echo(5);
</script>
</body></html>
```

```check
page scratch/callable-input.html "echo(2)" "2"
```

## Your turn — Score Fives

Define fives(face) returning 5 for a five, zero otherwise. Use the function syntax from the small worked wrapper here: function fives(face) { /* statements; return result; */ }. A function names a calculation and runs only when called; face is its input. The next lesson traces calls fully.

Write practice/02-decisions.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-decisions.html "JSON.stringify([fives(5),fives(2),fives(1)])" "[5,0,0]"
```

```hints
nudge: Start from zero.
concept: Only the matching branch changes the result.
shape: Inside fives(face), compare face strictly with 5; return the matching score or zero.
```
