---
title: 4.1 — A selector and a declaration
runtime: none
---

### The story so far

The single-file Sixes game works. Change its appearance while preserving its rules.

### What this lesson builds

Explain a visual change through the CSS declaration that causes it.

## Make one visual decision

A CSS rule consists of a selector and declarations inside braces. In `button { color: #183e34; }`, button selects elements; color is the property; the colon separates its value and the semicolon ends the declaration. A six-digit hexadecimal color uses two digits each for red, green and blue. It is a color notation, not a JavaScript number. A style element contains CSS, not HTML. Body text color can be inherited, but an explicit button rule supplies its own color.

Keep the working HTML and script. This target adds only the next CSS layer; use the diff to locate that layer before typing.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
<style>
body { color: #183e34; background: #f7f3e9; }
button { color: #183e34; background: #fff3d9; }
</style>
</head>
<body>
<main>
<h1>Sixes practice</h1>
<p id="budget"></p>
<div id="dice"></div>
<button id="roll">Roll</button>
<button id="score">Score Sixes</button>
<button id="reset">New turn</button>
<p id="result" role="status"></p>
</main>
<script>
const state = { dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rolls: 0, done: false };
function render() {
  const tray = document.getElementById('dice');
  tray.replaceChildren();
  for (let i = 0; i < state.dice.length; i += 1) {
    const button = document.createElement('button');
    button.textContent = state.dice[i];
    button.setAttribute('aria-pressed', String(state.held[i]));
    button.disabled = state.rolls === 0 || state.done;
    button.addEventListener('click', function () {
      state.held[i] = !state.held[i];
      render();
    });
    tray.append(button);
  }
  document.getElementById('budget').textContent = 'Rolls used: ' + state.rolls + ' / 3';
  document.getElementById('roll').disabled = state.rolls === 3 || state.done;
  document.getElementById('score').disabled = state.rolls === 0 || state.done;
}
function roll() {
  if (state.rolls === 3 || state.done) return;
  for (let i = 0; i < state.dice.length; i += 1) {
    if (!state.held[i]) state.dice[i] = 1 + Math.floor(Math.random() * 6);
  }
  state.rolls += 1;
  render();
}
function score() {
  if (state.rolls === 0 || state.done) return;
  let total = 0;
  for (let i = 0; i < state.dice.length; i += 1) {
    if (state.dice[i] === 6) total += 6;
  }
  state.done = true;
  document.getElementById('result').textContent = 'Sixes: ' + total;
  render();
}
function reset() {
  state.rolls = 0;
  state.done = false;
  for (let i = 0; i < state.held.length; i += 1) state.held[i] = false;
  document.getElementById('result').textContent = '';
  render();
}
document.getElementById('roll').addEventListener('click', roll);
document.getElementById('score').addEventListener('click', score);
document.getElementById('reset').addEventListener('click', reset);
render();
</script>
</body>
</html>
```

Keep the script unchanged. The automated check only establishes that the game still creates its controls. Compare before/after in the browser and identify which declaration produced each difference. Beauty needs visual inspection, not a count of CSS rules.

```check
page index.html "document.querySelectorAll('#dice button').length" "5"
```

```predict
question: Which explanation fits this change?
choice: A later button color rule overrides an earlier one
choice: The browser picks randomly
answer: A later button color rule overrides an earlier one
explain: The cascade resolves competing declarations.
```


**Explore, then restore:** In DevTools select a button and find its computed color. Change only background, then only color. Record which change affects the area around the letters and which affects the letters. Keep enough contrast to read the label; restore the guided palette.

## Try it — Inspect the missing feedback

Remove a colon from color. The invalid declaration is ignored; other valid declarations still apply. Restore it.



## Your turn — Make a deliberate variation

Change only the button background to #183e34 and its text to #fff3d9. Explain why changing body color does not override the explicit button color. Use a main region and two button elements, with aria-pressed="true" on the kept choice. Write a short comment explaining one spacing or color decision.

Write practice/01-one-rule.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



The required variation reverses the guided button palette: background #183e34 and foreground #fff3d9. In DevTools compare computed color with the declaration that supplied it.

The added computed-style checks establish these specified properties, not aesthetic quality, responsive fit or keyboard focus. Inspect those manually as described.

```check
page practice/01-one-rule.html "document.querySelectorAll('button').length" "2"
page practice/01-one-rule.html "document.querySelector('button[aria-pressed=true]') !== null" "true"
page practice/01-one-rule.html "[\"#183e34\", \"rgb(24,62,52)\"].includes(window.getComputedStyle(document.querySelector('button')).backgroundColor.replace(/\\s/g,''))" "true"
page practice/01-one-rule.html "[\"#fff3d9\", \"rgb(255,243,217)\"].includes(window.getComputedStyle(document.querySelector('button')).color.replace(/\\s/g,''))" "true"
```

```hints
nudge: Keep the element semantics while changing appearance.
concept: One property change is easier to explain than a pasted stylesheet.
shape: Start from your working styles, change one visual role and verify keyboard feedback manually.
```
