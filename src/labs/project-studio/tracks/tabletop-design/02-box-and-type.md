---
title: 4.2 — Give the game breathing room
runtime: none
---

### The story so far

The single-file Sixes game works. Change its appearance while preserving its rules.

### What this lesson builds

Explain a visual change through the CSS declaration that causes it.

## Make one visual decision

The box model has content, padding inside the border, a border, and margin outside it. box-sizing:border-box includes padding and border in specified widths. px is a CSS pixel; rem is relative to the root font size. max-width limits line length while width can shrink. font-family tries fonts left to right; the generic fallback always remains. line-height controls space between text lines.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
<style>
body { color: #183e34; background: #f7f3e9; font-family: system-ui, sans-serif; line-height: 1.6; }
* { box-sizing: border-box; }
main { max-width: 48rem; margin: 3rem auto; padding: 2rem; }
h1 { font-family: Georgia, serif; font-size: 3rem; line-height: 1.1; }
button { color: #183e34; background: #fff3d9; padding: 0.8rem 1rem; border: 1px solid #b8c4b2; border-radius: 0.5rem; }
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
choice: Padding enlarges the area inside the border
choice: Padding moves the entire border outward without growing the box
answer: Padding enlarges the area inside the border
explain: Margin is outside; padding is inside.
```

## Try it — Inspect the missing feedback

Set main padding to zero and compare the content against its background. Restore it. Explain why spaces typed in HTML cannot substitute for layout spacing.



## Your turn — Make a deliberate variation

Independently style a rules paragraph with readable line height and space separating it from controls. Measure padding and margin in DevTools. Use a main region and two button elements, with aria-pressed="true" on the kept choice. Write a short comment explaining one spacing or color decision.

Write practice/02-box-and-type.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-box-and-type.html "document.querySelectorAll('button').length" "2"
page practice/02-box-and-type.html "document.querySelector('button[aria-pressed=true]') !== null" "true"
```

```hints
nudge: Keep the element semantics while changing appearance.
concept: One property change is easier to explain than a pasted stylesheet.
shape: Start from your working styles, change one visual role and verify keyboard feedback manually.
```
