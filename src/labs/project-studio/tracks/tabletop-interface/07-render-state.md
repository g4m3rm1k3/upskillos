---
title: 8.7 — Render the state without changing it
runtime: none
---

### The story so far

The pure game modules and styled shell are ready. Wire their boundaries in small function additions.

### What this lesson builds

Explain the route from one user action through the model to a refreshed view.

## Read the imports and ownership

The controller imports model operations and SVG presentation. let binds replaceable session state; const byId is a function value. A variable at module scope belongs to this module, not to window. Timers are handles the controller owns and cancels.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;
```



```check
run "node --check app.mjs"
```

## Connect say

byId is a small lookup helper returning an element by id. say changes only the live status text. Using textContent avoids treating a message as executable markup.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

function say(message) { byId('status').textContent = message; }
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect isOver

The conditional expression selects the relevant game's terminal condition. Yahtzee has done; Pig has winner=null until someone wins. The controller adapts both to one UI question without rewriting either rule module.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

function say(message) { byId('status').textContent = message; }
function isOver() { return game === 'yahtzee' ? yahtzee.done : pig.winner !== null; }
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect currentPlayer

Both models identify the current player as 0 or 1. This is a genuine shared concept, so the controller can ask one question. Future games need not share every action.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

function say(message) { byId('status').textContent = message; }
function isOver() { return game === 'yahtzee' ? yahtzee.done : pig.winner !== null; }
function currentPlayer() { return game === 'yahtzee' ? yahtzee.player : pig.player; }
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect renderDice

while repeats until its condition is false. children is the element's live collection of child elements; lastElementChild.remove removes excess buttons when Pig needs only one. Existing buttons are reused to preserve keyboard focus. A newly created button closes over its index. innerHTML is used only for trusted generated die markup; labels use setAttribute. The disabled condition combines current player, phase and game-specific rules.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

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
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect renderScores

The score table is rebuilt from the model. createElement creates rows/cells; scope links headers to data. preview returns a possible score or null; saved scores remain numbers including zero. Only legal human choices become buttons. The callback records once and queues the opponent. A removed score button cannot retain focus, so focus moves to an existing control. The final loop uses destructured [label,key] pairs and bracket access total(card)[key] to display the bonus breakdown.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect render

This is an adapter from model state to visible text, control availability and selected tabs. It calls rendering helpers, never rolls or scores. The Boolean y keeps the two-game condition readable. hidden toggles the Pig-only bank button. A completed match compares final totals and announces win, loss or draw.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let thinkingTimer = null;

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

```predict
question: Should a render call ever choose a new random face?
choice: No
choice: Yes
answer: No
explain: A display refresh must not change the underlying game.
```

## Try it — Interrupt a pending action

After the controller is fully wired, score a Yahtzee turn and immediately switch to Pig. The cancelled timer must not make an old Yahtzee move in the new match. Also reset during a Pig opponent turn. The syntax check cannot establish this interaction; perform it in the browser.



## Your turn — Adapt without aliasing

Define solve(game) returning a display record {score: game.score, label: game.name}. It must be a new object, so changing the display record cannot alter game. Export the function as solve.

Write practice/07-render-state.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/07-render-state.mjs'; if (!((() => {const a={score:9,name:\\\"Ada\\\"};const b=solve(a);b.score=0;return a.score===9 && b.label===\\\"Ada\\\";})())) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: A display record is a projection, not the model itself.
concept: Return only the fields needed by the view.
shape: Create a fresh object using property values from the input.
```
