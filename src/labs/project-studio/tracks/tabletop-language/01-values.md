---
title: 2.1 — Values and names
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

A program follows statements in order. A value is a piece of data; an expression calculates a value. Numbers such as 6 support arithmetic. Quoted strings such as "6" are text. console.log prints to DevTools Console, opened from the browser menu → Developer tools. A script element runs JavaScript when the browser reaches it. A semicolon ends a statement. let creates a name whose stored value can later be reassigned. const creates a name that cannot be reassigned. = assigns; it does not ask a question.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. `document` is the browser-provided object representing the page: an object groups named values and operations. A dot selects a member of that object. `getElementById` is an operation (a method); parentheses call it, passing the string `"result"` as its input. It returns the matching element object. The next dot selects that element’s `textContent` property, and `= total` replaces the visible text with the calculated value. Thus 8 appears inside the paragraph. The id must match exactly: a missing element returns `null`, and trying to set its text produces an error. `console.log(total)` similarly calls the Console object’s logging method with total as its input. These display operations do not change total. The functions and objects lessons will give you practice creating your own operations and objects.



```predict
question: Why does total stay 8 after first becomes 3?
choice: It was calculated before the assignment
choice: It is a live formula
answer: It was calculated before the assignment
explain: total stores a result, not a spreadsheet formula.
```

## Trace the running example

Type this self-contained page. Open it directly in the browser, save and refresh after edits. Open the Console to see errors.

```html file=scratch/01-values.html
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
let first = 6;
const second = 2;
let total = first + second;
first = 3;
console.log(total);
document.getElementById("result").textContent = total;
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/01-values.html "document.getElementById('result').textContent" "8"
```

## Try it — Explain and repair a fault

Change second to 4, save and refresh: total becomes 10. Restore 2. Try assigning second = 5; the browser reports a TypeError because second is const; remove that assignment.



## Your turn — Calculate remaining points

Set result to target minus score using score=8 and target=30; compute it, do not write 22 directly.

Write practice/01-values.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/01-values.html "document.getElementById('result').textContent" "22"
```

```hints
nudge: Which operation reverses addition?
concept: Read the values on the right before assigning the result.
shape: Create the two names, subtract score from target and display the result.
```
