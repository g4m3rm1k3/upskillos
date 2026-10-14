---
title: 2.3 — Name a calculation
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

A function groups statements you can call again. In function sixPoints(face), face is a parameter: a local name for the input. sixPoints(6) calls it with argument 6. return sends a value back and ends that call. A function definition does not execute its body until called. The local name is not accessible outside.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. Read it as “show this answer here”; the objects lesson will explain the browser object in depth. This display operation does not affect the calculation.



```predict
question: Does defining sixPoints roll any dice?
choice: No; it only defines a calculation
choice: Yes; each definition rolls
answer: No; it only defines a calculation
explain: There is no randomness or function call in the definition itself.
```

## Trace the running example

Type this self-contained page. Open it directly in the browser, save and refresh after edits. Open the Console to see errors.

```html file=scratch/03-functions.html
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
function sixPoints(face) {
  if (face === 6) return 6;
  return 0;
}
const answer = sixPoints(6) + sixPoints(2);
document.getElementById("result").textContent = answer;
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/03-functions.html "document.getElementById('result').textContent" "6"
```

## Try it — Explain and repair a fault

Remove return before 6. That path now falls through to return 0. Restore it. Explain why a function that reaches its end without returning produces undefined.



## Your turn — Generalize one face

Define function facePoints(face, wanted), returning wanted for a match and zero otherwise. Do not edit the input arguments.

Write practice/03-functions.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/03-functions.html "JSON.stringify([facePoints(5,5),facePoints(2,5),facePoints(3,3)])" "[5,0,3]"
```

```hints
nudge: What value distinguishes a match?
concept: The return value depends on both inputs.
shape: Use an if branch to return wanted for a match and return zero after it.
```
