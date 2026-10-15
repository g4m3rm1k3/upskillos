---
title: 2.6 — State has named parts
runtime: none
---

### The story so far

Continue in the same folder after the first-page lessons. Each scratch page isolates one idea before it joins the game.

### What this lesson builds

Explain and change the calculation on this page, then solve the independent task.

## Read the new idea

An object groups named properties: { face: 6, held: false }. The colon separates a property name and its value; commas separate properties. die.face reads one property. Objects are shared by identity: assigning another name copies access to the same object, not its contents. A method is a function stored on an object. document is a browser-provided object; getElementById is its method. It returns the element with that id, or null when none exists. Setting the element's textContent replaces its visible text. These are the browser APIs used by the earlier display line.

The page below includes a p element with id="result". The final display line asks the browser for that element and sets its text. This is the same getElementById/textContent operation traced in Values and names: find the element by its exact id, then replace its displayed text. This display operation does not affect the calculation.



```predict
question: Does changing alias.held change die.held?
choice: Yes
choice: No
answer: Yes
explain: Both names designate the same object.
```

## Trace the running example

An object gives related values names instead of positions. Read state.rolls as “the rolls property of this particular state object.” A second variable assigned state receives a reference to the same object; it does not duplicate the properties. Draw two arrows pointing at one box. const stops rebinding an arrow, not changing a field in the box. A new object literal creates another box; nested arrays still need their own copies if they must be independent.

Keep the familiar HTML shell and output element. Type only the changed script lines shown in the diff; read the existing lines as context.

```html file=scratch/06-objects.html
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
const die = { face: 6, held: false };
const alias = die;
alias.held = true;
document.getElementById("result").textContent = die.held;
</script>
</body>
</html>
```

Write a trace listing each assignment and the values read on its right. **Engineer:** an observed result and an explanation are different evidence. The check observes this example; it does not prove all inputs.

```check
page scratch/06-objects.html "document.getElementById('result').textContent" "true"
```


**Explore, then restore:** Change a property through the alias used in the example, then read it through the original name. Predict that both views agree. Replace the alias with a separately written object and repeat. Restore the original example and explain which assignment created an object.

## Try it — Explain and repair a fault

Change the HTML id to missing while leaving getElementById unchanged. null has no textContent property, so the console reports an error. Restore result. Read the first error and identify the lookup that failed.



## Your turn — Copy one die

Define copyDie(die) returning a NEW object with the same face and held values. Changing the copy must not change the original.

Write practice/06-objects.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/06-objects.html "(() => { const a={face:2,held:false}; const b=copyDie(a); b.face=6; return JSON.stringify([a.face,b.face,b.held]); })()" "[2,6,false]"
```

```hints
nudge: Does returning die create anything?
concept: An object literal creates a new object.
shape: Read both properties and use them as values in a new object literal.
```
