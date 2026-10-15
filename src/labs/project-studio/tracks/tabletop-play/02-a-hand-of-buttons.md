---
title: 3.2 — Five controls from one loop
runtime: none
---

### The story so far

A button can roll one die. You know arrays can store a hand.

### What this lesson builds

Create a button for each die and let a click toggle that die's held state.

## Create elements rather than HTML strings

We need five independent controls. For each array slot, create a button, fill its text, set its state, attach its click handler, then append it to the tray. `createElement` makes an unattached DOM object; `append` gives it a visible parent. `replaceChildren()` with no arguments removes old children first, preventing duplicate rows on each render. `div` is a neutral container; its id lets us find this particular tray.

`setAttribute` writes text attributes; String converts the held Boolean to "true" or "false" for aria-pressed. The DOM disabled property uses an actual Boolean. `||` is true when either guard is true. `!` flips a Boolean. The anonymous callback remembers this iteration's `let i` after the render call ends: that remembered environment is a **closure**. Clicking the third button uses i=2. It changes held[2], then calls render to display that new state.

Predict the number of buttons after calling render twice: five, not ten. At this checkpoint the action buttons are not yet connected. We temporarily enable the dice for an experiment below, then restore the initial state.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
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
render();
</script>
</body>
</html>
```

Only rendering works at this checkpoint; the roll/score buttons are wired in the next lesson. For this experiment temporarily set state.rolls to 1 so the dice buttons can be used. Click the third, inspect aria-pressed=true in DevTools, then restore rolls to 0. Rebuilding controls can lose focus; the final renderer will retain existing buttons.

```check
page index.html "document.querySelectorAll('#dice button').length" "5"
```

```predict
question: Why does the loop use let i instead of one shared counter outside it?
choice: Each handler remembers its iteration’s position
choice: It makes loops faster
answer: Each handler remembers its iteration’s position
explain: A handler runs later; it needs the index belonging to its own button.
```


**Explore, then restore:** Change the initial rolls field to 1 and click the third die twice. Expect its aria-pressed attribute to go false → true → false without affecting its neighbours. Remove tray.replaceChildren for one rerender and observe duplication. Restore both changes. Note that rebuilding the focused button loses its identity; the later renderer will preserve it.

## Try it — Read state versus appearance

Temporarily replace !state.held[i] with true. The first click appears correct, but a second click never releases the die. Restore negation. This is why one happy-path click is not sufficient testing.



## Your turn — Toggle a choice

Define toggle(flags, index) to invert that Boolean element in place. A second call must restore it.

Write practice/02-a-hand-of-buttons.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-a-hand-of-buttons.html "(() => { const a=[false,false]; toggle(a,1); const first=a[1]; toggle(a,1); return JSON.stringify([a[0],first,a[1]]); })()" "[false,true,false]"
```

```hints
nudge: What does logical not do?
concept: Read the current value before writing.
shape: Assign !flags[index] back to the same indexed element.
```
