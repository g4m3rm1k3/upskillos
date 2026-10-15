---
title: 3.3 — A turn with boundaries
runtime: none
---

### The story so far

The tray displays five dice and represents holds. Now connect rolling, scoring and reset.

### What this lesson builds

Play a full Sixes turn and prevent a fourth roll or a second score.

## Connect only rolling first {#roll-first}

Use the existing renderer. Add roll and only its click listener. An early return is a **guard**: at rolls===3 or done===true it refuses the action before consuming randomness. Otherwise loop over the hand; only an unheld position receives a new face. Increment the roll counter once per click, outside the loop, then redraw.

Predict which positions may change when only the second die is held. Run the page, roll once, hold that die, and roll twice more. Its value must remain unchanged. The fourth call must leave rolls at 3. Scoring and New turn deliberately remain unconnected at this intermediate checkpoint.

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
function roll() {
  if (state.rolls === 3 || state.done) return;
  for (let i = 0; i < state.dice.length; i += 1) {
    if (!state.held[i]) state.dice[i] = 1 + Math.floor(Math.random() * 6);
  }
  state.rolls += 1;
  render();
}
document.getElementById('roll').addEventListener('click', roll);
render();
</script>
</body>
</html>
```

```check
page index.html "(() => { roll(); roll(); roll(); roll(); return state.rolls; })()" "3"
```

## Let state decide what is legal

Now add score and reset, keeping roll as tested. In score, the first guard forbids scoring before the first roll and after a score already ended the turn. The accumulator begins at 0 and adds 6 for each matching die. Set done before rendering so the controls reflect the ended turn. `role="status"` on the result paragraph lets assistive technology announce updates.

Reset restores rolls, done and each held flag. It clears result text with the empty string, then renders. It leaves the old face pictures as placeholders until the first new roll; they are not already-scored dice. Attach each listener once at setup, not inside render. Clicks should cause state changes; render should only display state.

Predict the sequence: score before roll does nothing; roll then score ends the turn; a second score does nothing; reset allows rolling again. Test that sequence before trying the independent task.

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

Trace roll counts 0 → 1 → 2 → 3. The next call returns at its guard. On a score, total starts at zero and grows only for sixes, then done becomes true. The string concatenations in render convert numbers to text. This first game stays in one file so you can see the complete flow.

**Engineer:** three state transitions (roll, hold, score) are easier to reason about when rendering itself changes none of them. The tests verify boundaries, not keyboard focus or visual clarity; play manually too.

```check
page index.html "(() => { roll(); roll(); roll(); roll(); return state.rolls; })()" "3"
page index.html "(() => { reset(); return JSON.stringify([state.rolls,state.done,state.held]); })()" "[0,false,[false,false,false,false,false]]"
```

```predict
question: Should clicking a score twice add its points twice?
choice: No
choice: Yes
answer: No
explain: Scoring ends a turn. Repeated input should be rejected by the rule guard.
```


**Explore, then restore:** After a reset, hold controls must be unavailable until you roll. Temporarily omit done=false in reset and explain why a completed turn stays locked. Restore it and retest score → reset → roll.

## Try it — Leave one field stale

Temporarily remove the loop clearing holds in reset. Hold a die, finish a turn, then start another: the old hold survives. Restore the reset loop. Explain why resetting the roll counter alone did not reset the game.



## Your turn — Guard the roll budget

Define canRoll(rolls, done) returning true exactly when done is false and rolls is below 3. Use && for “both”: it evaluates the right side only when the left is true.

Write practice/03-complete-a-turn.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/03-complete-a-turn.html "JSON.stringify([canRoll(0,false),canRoll(2,false),canRoll(3,false),canRoll(0,true)])" "[true,true,false,false]"
```

```hints
nudge: There are two independent reasons to refuse.
concept: && requires both conditions.
shape: Combine not done with rolls less than three.
```
