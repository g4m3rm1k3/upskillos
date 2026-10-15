---
title: 4.3 — Layout and feedback
runtime: none
---

### The story so far

The single-file Sixes game works. Change its appearance while preserving its rules.

### What this lesson builds

Explain a visual change through the CSS declaration that causes it.

## Make one visual decision

Flex lays direct children along a main axis; justify-content distributes space on that axis and align-items on the cross axis. gap creates space between items; flex-wrap permits a new line. An attribute selector such as button[aria-pressed="true"] matches a state in the HTML, while :disabled and :focus-visible are pseudo-classes supplied by the browser. The script changes state; selectors turn it into visual feedback. A transition needs a property, duration and optional timing curve: it does not alter the score or roll budget.

Keep the working HTML and script. This target adds only the next CSS layer; use the diff to locate that layer before typing.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
<style>
body { color: #183e34; background: #f7f3e9; font-family: system-ui, sans-serif; }
* { box-sizing: border-box; }
main { max-width: 48rem; margin: 2rem auto; padding: 2rem; }
#dice { display: flex; flex-wrap: wrap; gap: 0.8rem; padding: 2rem; background: #194c3f; border-radius: 1rem; margin-bottom: 1rem; }
button { background: #fff3d9; color: #183e34; padding: 1rem; border: 2px solid transparent; border-radius: 0.6rem; transition: transform 150ms; }
button[aria-pressed="true"] { border-color: #b08535; transform: translateY(-4px); }
button:focus-visible { outline: 3px solid #b08535; outline-offset: 3px; }
button:disabled { opacity: 0.5; }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
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
choice: A held outline follows aria-pressed
choice: The outline decides whether a die is held
answer: A held outline follows aria-pressed
explain: State drives appearance, not the other way around.
```


**Explore, then restore:** Narrow the browser until the buttons need another row. Tab through every control: focus must be distinguishable from a held outline. Disable a button in DevTools and compare it with a held button. Restore all edits; explain why reduced motion must preserve those state differences.

## Try it — Inspect the missing feedback

Remove the focus-visible rule and Tab through the controls. Browser defaults may still help, but your custom contrast disappears. Restore it. Emulate reduced motion and confirm state feedback remains without transition.



## Your turn — Make a deliberate variation

Create a separate practice card with two real buttons, visible keyboard focus and a held-state outline. Tab through it. Explain why hover alone does not support keyboard players. Use a main region and two button elements, with aria-pressed="true" on the kept choice. Write a short comment explaining one spacing or color decision.

Write practice/03-layout-and-state.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



Give the held button a 3px solid border through its aria-pressed selector. Give both buttons a visible :focus-visible outline. The automated border check does not establish keyboard focus: Tab and Shift+Tab through both buttons yourself.

The added computed-style checks establish these specified properties, not aesthetic quality, responsive fit or keyboard focus. Inspect those manually as described.

```check
page practice/03-layout-and-state.html "document.querySelectorAll('button').length" "2"
page practice/03-layout-and-state.html "document.querySelector('button[aria-pressed=true]') !== null" "true"
page practice/03-layout-and-state.html "window.getComputedStyle(document.querySelector('button[aria-pressed=true]')).borderTopWidth" "3px"
page practice/03-layout-and-state.html "window.getComputedStyle(document.querySelector('button[aria-pressed=true]')).borderTopStyle" "solid"
```

```hints
nudge: Keep the element semantics while changing appearance.
concept: One property change is easier to explain than a pasted stylesheet.
shape: Start from your working styles, change one visual role and verify keyboard feedback manually.
```
