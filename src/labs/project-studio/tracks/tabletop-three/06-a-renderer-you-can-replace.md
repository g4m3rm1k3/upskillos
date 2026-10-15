---
title: 9.6 — Add 3D without losing the game
runtime: none
---

### The story so far

The renderer exposes show and dispose. Keep the HTML controls as the accessible input path.

### What this lesson builds

Load 3D on demand and recover to SVG if graphics is unavailable.

## Expose a view choice

Add a labeled checkbox to the existing panel heading. Its checked DOM property is a Boolean indicating the user's preference. A native checkbox supplies keyboard operation; an arbitrary styled span would require rebuilding that behavior. The host is initially hidden so the regular SVG dice remain the default. This step only adds the control; the next step adds its change handler. Predict what clicking it does before that handler exists: its checkmark changes, but no canvas appears.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#163e34">
  <title>Tabletop — a little room for play</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <header class="masthead"><a class="brand" href="#main"><span class="brand-mark">✦</span> TABLETOP <small>THE PLAY WORKSHOP</small></a><span class="edition">NO. 01 / DICE & DECISIONS</span></header>
  <main id="main">
    <div class="intro"><div><p class="eyebrow">GOOD GAMES. THOUGHTFUL MOVES.</p><h1>A little room<br>for <em>play.</em></h1><p>Roll the dice. Learn the odds. Meet an opponent you taught.</p></div><div class="intro-note"><span>01</span><p>Made by hand.<br>Understood by you.</p></div></div>
    <nav class="game-tabs" aria-label="Choose a game"><button id="yahtzee-tab" aria-pressed="true">01 &nbsp; Yahtzee <small>A classic, beautifully counted</small></button><button id="pig-tab" aria-pressed="false">02 &nbsp; Pig <small>One more roll, or walk away?</small></button></nav>
    <div class="game-layout">
      <section class="table-panel" aria-labelledby="game-title">
        <div class="panel-heading"><div><p class="eyebrow" id="game-kicker">FIVE DICE / ENDLESS POSSIBILITIES</p><h2 id="game-title">Your seat at the table</h2></div><label class="view-toggle"><input id="view3d" type="checkbox"> 3D table</label></div>
        <p id="rules" class="rule-note"></p>
        <div class="players"><div><span>YOU</span><strong id="you-total">0</strong></div><span class="versus">vs</span><div><span id="opponent-label">HEURISTIC</span><strong id="bot-total">0</strong></div></div>
        <div class="felt"><div class="tray-caption"><span id="turn-caption">YOUR TURN</span><span id="roll-caption">READY TO ROLL</span></div><div id="canvas-host" hidden></div><div id="dice" class="dice-row" role="group" aria-label="Dice"></div><p id="hold-help">Roll to begin. Select dice to keep them.</p></div>
        <div class="action-row"><button id="roll" class="primary">Roll the dice <span>↗</span></button><button id="bank" class="secondary" hidden>Bank points</button><button id="reset" class="quiet">New match</button></div>
        <p id="status" class="status" role="status" aria-live="polite"></p>
        <details class="learn-note"><summary>What is the opponent thinking?</summary><p id="thinking"></p><p>Yahtzee uses a readable scoring heuristic. Pig currently uses a hold-at-10 baseline. Animation displays the rule engine's result; it never changes the score.</p></details>
      </section>
      <aside class="score-panel"><p class="eyebrow">EVERY CHOICE COUNTS</p><h2 id="score-title">The score sheet</h2><div id="scorecard"></div></aside>
    </div>
    <footer>TABLETOP WORKSHOP <span>Built slowly. Played often.</span></footer>
  </main>
  <script type="module" src="./app.mjs"></script>
</body>
</html>
```



```check
file index.html
```


**Explore, then restore:** Tab to the checkbox and press Space. Confirm the checked state changes with a keyboard. Restore it to off before connecting the behavior.

## Load and release a view

A module import may finish later. Dynamic import(path) returns a Promise representing a future success value or failure. async allows a function to await that promise; awaiting pauses this function, not the browser's entire event loop. On success the resolved module object contains makeTable. try/catch catches loading or construction failure and keeps the SVG controls usable.

Walk a race on paper: turn on creates generation 1; turn off increments to 2; the first import completes. generation!==viewGeneration rejects that old completion, so it cannot create an unwanted canvas. Prefix ++ increments before returning the new number. Dispose any previous table before starting the replacement. hidden follows the current checkbox; early return handles off without importing.

The renderDice change forwards the model's faces and holds to table.show when a table exists. The new change listener calls toggle3D; pagehide disposes the last view. These are the only new responsibilities in this snapshot. The controller connects resources owned by makeTable to rules owned by the game. A returned object with closures is enough; classes are optional architecture, not a prerequisite for composition.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;
let table = null;
let viewGeneration = 0;

function say(message) { byId('status').textContent = message; }
function isOver() { return game === 'yahtzee' ? yahtzee.done : pig.winner !== null; }
function currentPlayer() { return game === 'yahtzee' ? yahtzee.player : pig.player; }

function renderDice(animate) {
  const faces = game === 'yahtzee' ? yahtzee.dice : [pig.face];
  const held = game === 'yahtzee' ? yahtzee.held : [false];
  const container = byId('dice');
  // Retain focused controls across updates instead of replacing the entire row.
  while (container.children.length > faces.length) container.lastElementChild.remove();
  for (let i = 0; i < faces.length; i += 1) {
    let button = container.children[i];
    if (!button) {
      button = document.createElement('button');
      button.className = 'die';
      button.addEventListener('click', function () { pick(i); });
      container.append(button);
    }
    button.innerHTML = dieSVG(faces[i]) + (held[i] ? '<span class="held-label">HELD</span>' : '');
    button.setAttribute('aria-label', `Die ${i + 1}: ${faces[i]}, ${held[i] ? 'held' : 'not held'}`);
    button.setAttribute('aria-pressed', String(held[i]));
    button.disabled = game !== 'yahtzee' || yahtzee.rolls === 0 || yahtzee.rolls === 3 || currentPlayer() !== 0 || isOver();
  }
  if (table) table.show(faces, held, animate);
}

function renderScores() {
  const host = byId('scorecard');
  host.replaceChildren();
  if (game === 'pig') {
    host.innerHTML = `<div class="pig-guide"><p>UNBANKED THIS TURN</p><strong>${pig.turn}</strong><p>Roll a 1 and lose these points.<br>Hold to bank them safely.</p><p>First to ${TARGET} banked points wins.<br>This workshop uses a short Pig match so you can train and compare quickly.</p></div>`;
    return;
  }
  const sheet = document.createElement('table');
  sheet.innerHTML = '<caption>Select a preview to use that category. A dash is an empty box.</caption><thead><tr><th scope="col">Category</th><th scope="col">You</th><th scope="col">Opponent</th></tr></thead>';
  const body = document.createElement('tbody');
  for (let i = 0; i < categories.length; i += 1) {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = categories[i];
    row.append(heading);
    for (let player = 0; player < 2; player += 1) {
      const cell = document.createElement('td');
      const saved = yahtzee.cards[player].scores[i];
      const possible = preview(yahtzee.cards[player], yahtzee.dice, i);
      if (player === 0 && yahtzee.player === 0 && yahtzee.rolls > 0 && saved === null && possible !== null && !yahtzee.done) {
        const button = document.createElement('button');
        button.className = 'score-choice';
        button.textContent = String(possible);
        button.setAttribute('aria-label', `Score ${possible} in ${categories[i]}`);
        button.addEventListener('click', function () {
          if (scoreTurn(yahtzee, i)) { say(`${categories[i]} recorded. Opponent's turn.`); render(); queueOpponent(); byId('reset').focus(); }
        });
        cell.append(button);
      } else cell.textContent = saved === null ? '—' : String(saved);
      row.append(cell);
    }
    body.append(row);
  }
  for (const [label, key] of [['Upper bonus', 'upper'], ['Extra Yahtzees', 'extra'], ['Total', 'all']]) {
    const row = document.createElement('tr');
    if (key === 'all') row.className = 'total-row';
    row.innerHTML = `<th scope="row">${label}</th><td>${total(yahtzee.cards[0])[key]}</td><td>${total(yahtzee.cards[1])[key]}</td>`;
    body.append(row);
  }
  sheet.append(body);
  host.append(sheet);
}

function render(animate = false) {
  const y = game === 'yahtzee';
  byId('yahtzee-tab').setAttribute('aria-pressed', String(y));
  byId('pig-tab').setAttribute('aria-pressed', String(!y));
  byId('game-title').textContent = y ? 'Your seat at the table' : 'Know when to walk away';
  byId('game-kicker').textContent = y ? 'FIVE DICE / ENDLESS POSSIBILITIES' : 'ONE DIE / A LITTLE COURAGE';
  byId('rules').textContent = y ? 'Roll up to three times. Select dice to hold. Choose one score category to finish your turn.' : `Roll to collect points. A 1 loses the turn total. Hold to bank it. First to ${TARGET} wins.`;
  byId('opponent-label').textContent = y ? 'HEURISTIC' : 'HOLD-AT-10';
  byId('you-total').textContent = y ? total(yahtzee.cards[0]).all : pig.scores[0];
  byId('bot-total').textContent = y ? total(yahtzee.cards[1]).all : pig.scores[1];
  byId('turn-caption').textContent = isOver() ? 'MATCH COMPLETE' : currentPlayer() === 0 ? 'YOUR TURN' : 'OPPONENT’S TURN';
  byId('roll-caption').textContent = y ? `${yahtzee.rolls} / 3 ROLLS` : `${pig.turn} AT RISK`;
  byId('hold-help').textContent = y ? 'Select a die to hold it. Held dice have a gold outline.' : 'Keep rolling, or take what you have.';
  byId('roll').disabled = isOver() || currentPlayer() !== 0 || (y && yahtzee.rolls >= 3);
  byId('bank').hidden = y;
  byId('bank').disabled = isOver() || currentPlayer() !== 0 || pig.turn === 0;
  renderDice(animate);
  renderScores();
  if (isOver()) {
    const a = y ? total(yahtzee.cards[0]).all : pig.scores[0];
    const b = y ? total(yahtzee.cards[1]).all : pig.scores[1];
    say(a === b ? 'A draw. A good reason for another round.' : a > b ? 'You won. Beautifully played.' : 'The opponent won. Another round?');
  }
}
function pick(index) {
  if (game === 'yahtzee' && currentPlayer() === 0 && holdDie(yahtzee, index)) render();
}
function humanRoll() {
  if (isOver() || currentPlayer() !== 0) return;
  if (game === 'yahtzee') { rollHand(yahtzee); say('Choose dice to hold, roll again, or take a score.'); }
  else { move(pig, 'roll'); say(pig.face === 1 ? 'A 1. Turn points lost.' : `${pig.turn} unbanked. Roll or hold?`); }
  render(true);
  queueOpponent();
}
function queueOpponent() {
  clearTimeout(thinkingTimer);
  if (currentPlayer() !== 1 || isOver()) return;
  thinkingTimer = setTimeout(function () {
    if (game === 'yahtzee') {
      rollHand(yahtzee);
      const choice = greedyCategory(yahtzee.cards[1], yahtzee.dice);
      const value = preview(yahtzee.cards[1], yahtzee.dice, choice);
      scoreTurn(yahtzee, choice);
      byId('thinking').textContent = `The simple baseline takes the highest immediate legal score: ${value} in ${categories[choice]}. It rolls once and does not plan ahead.`;
    } else {
      const action = baseline(pig);
      byId('thinking').textContent = `The baseline holds at 10 unbanked points, or as soon as banking wins. It chose ${action}.`;
      move(pig, action);
    }
    say(currentPlayer() === 0 ? 'Your turn.' : 'The opponent is considering another roll.');
    render(true);
    queueOpponent();
  }, 450);
}
function reset(next = game) {
  clearTimeout(thinkingTimer);
  game = next;
  yahtzee = newYahtzee();
  pig = newPig();
  say('A fresh match. You go first.');
  render();
}

async function toggle3D() {
  const generation = ++viewGeneration;
  if (table) { table.dispose(); table = null; }
  byId('canvas-host').hidden = !byId('view3d').checked;
  if (!byId('view3d').checked) return;
  try {
    const module = await import('./table3d.mjs');
    if (generation !== viewGeneration) return;
    table = module.makeTable(byId('canvas-host'), pick);
    render();
  } catch {
    if (generation !== viewGeneration) return;
    byId('view3d').checked = false;
    byId('canvas-host').hidden = true;
    say('3D is unavailable here. The SVG dice and all game controls still work.');
  }
}

byId('view3d').addEventListener('change', toggle3D);
byId('roll').addEventListener('click', humanRoll);
byId('bank').addEventListener('click', function () { if (currentPlayer() === 0 && move(pig, 'hold')) { render(); queueOpponent(); } });
byId('reset').addEventListener('click', function () { reset(); });
byId('yahtzee-tab').addEventListener('click', function () { reset('yahtzee'); });
byId('pig-tab').addEventListener('click', function () { reset('pig'); });
window.addEventListener('pagehide', function () { clearTimeout(thinkingTimer); if (table) table.dispose(); });
render();
```

This is composition: the game owns rules, the renderer owns drawing resources, and the controller connects them. A class is not required for the returned object; its methods close over scene resources. Explain this ownership before considering an equivalent class with constructor and dispose methods.

The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

```predict
question: If an old import finishes after the player turns 3D off, should it create a canvas?
choice: No
choice: Yes
answer: No
explain: The generation check rejects a stale completion.
```


**Explore, then restore:** Open the game through the dev server, toggle 3D on and off quickly, then inspect the host: after off it should contain no canvas. Repeat on/off and verify only one canvas when enabled. Play using keyboard SVG buttons with 3D enabled to confirm both views use the same holds.

## Try it — Keep the fallback playable

Toggle 3D quickly during loading and inspect the final checkbox/canvas state. Disable graphics support in a test environment if available: the SVG controls must still work. This is a manual interaction check beyond syntax. Do not claim this fallback works solely because the build passes.



## Your turn — Reject a stale completion

Define solve(requestGeneration,currentGeneration,enabled) returning true only when generations match and the view is enabled. Export the function as solve.

Write practice/06-a-renderer-you-can-replace.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/06-a-renderer-you-can-replace.mjs'; if (!(solve(2,2,true) && !solve(1,2,true) && !solve(2,2,false))) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Two conditions define a current request.
concept: A successful old request can still be unwanted.
shape: Require matching generations and the enabled flag.
```
