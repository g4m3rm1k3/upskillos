---
title: 8.7 — Render the state without changing it
runtime: none
---

### The story so far

The pure game modules and styled shell are ready. Wire their boundaries in small function additions.

### What this lesson builds

Explain the route from one user action through the model to a refreshed view.

## Read the imports and ownership

Imports name the rule operations already tested, plus dieSVG. byId is a small function value returning document.getElementById(id); const protects that helper binding. let is used for game and session objects because New match will replace them. The module owns a current Yahtzee state and Pig state, not a DOM-derived score. thinkingTimer starts null because no opponent delay is scheduled yet. Module names are not properties on window, so typing yahtzee in DevTools does not automatically inspect this private binding.

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


**Explore, then restore:** Draw the ownership diagram: controller → game states and timer; rules → mutations; renderer → DOM. Temporarily add console.log(yahtzee.player,pig.player) at the end and expect 0,0; remove that probe.

## Connect say

say is a command with one string argument. byId('status') finds the live status paragraph, and textContent replaces its text. There is no return value to use as a score. textContent treats angle brackets as visible text, unlike innerHTML. This keeps a status message from becoming markup.

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


**Explore, then restore:** Temporarily append say("Ready <now>") to app.mjs and refresh: angle brackets should appear as text. Remove the temporary call before the next step.

## Connect isOver

Adapt two game-specific completion representations to one Boolean question. If game==='yahtzee', return yahtzee.done. Otherwise test pig.winner!==null. A winner value of 0 must still mean the game is over, so returning pig.winner directly would be wrong. This helper reads but never changes the models.

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


**Explore, then restore:** Temporarily log isOver() on fresh states: false. In a scratch copy set pig.winner=0 and game="pig" before logging: true. Undo these fixtures so the game starts normally.

## Connect currentPlayer

Both models use seat indices, so this adapter can return yahtzee.player or pig.player. It is a read operation; switching the selected game does not convert one model into the other. Future games can offer an adapter without inheriting every rule from either dice game.

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


**Explore, then restore:** Trace game="pig", pig.player=1, yahtzee.player=0: the result must be 1. Explain why always reading yahtzee.player would appear to work initially but fail after a Pig turn.

## Connect renderDice

Choose the displayed arrays first: Yahtzee has five dice and held flags; Pig wraps its one face in an array and has no holds. The while loop removes extra existing buttons when switching from five dice to one. children is a live collection: after removing lastElementChild, its length immediately decreases. This prevents a five-to-one switch from leaving four stale controls.

For each needed index, reuse the existing button if present; create and attach a listener only if missing. Reuse preserves DOM identity and keyboard focus. Each newly created callback closes over its let i. The click will call pick, defined in the next lesson; do not interact with this partial renderer yet. innerHTML inserts only our trusted SVG string and optional held label. Template literals build an accessible name containing position, face and held state.

The disabled expression joins reasons to refuse a hold: Pig, no roll, final roll, opponent turn or finished match. String converts the Boolean held flag for aria-pressed. Rendering does not roll or toggle anything. Temporarily call renderDice(false) after this definition to inspect five disabled die buttons, then remove that probe.

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


**Explore, then restore:** Refresh twice with the temporary renderDice call: the page should contain five buttons. In a scratch copy switch game to pig before the call and expect one disabled die. Restore the game and remove the probe before adding later functions.

## Read a score before offering a choice {#read-only-scorecard}

Build the scorecard as data first. replaceChildren clears the old host. A table gets a caption, column headers and a tbody. Each category creates a tr and th with scope=row; an inner two-player loop creates the two td values. Use an em dash for null and String(saved) for a number, including zero. append assembles children in reading order. The summary rows use the total breakdown already tested.

Temporarily call renderScores() after this definition and inspect the table. Set only one scratch card slot to 0, then render again: that cell should show 0 while empty cells show dashes. Restore the card and remove the temporary call. No score buttons exist at this stage; the next step adds actions on top of a verified reading view.

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
      cell.textContent = saved === null ? '—' : String(saved);
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

```check
run "node --check app.mjs"
```

## Connect renderScores

The read-only version below has already established rows and saved values. Now a legal unused human category becomes a button. It requires player 0, human turn, at least one roll, saved===null, possible!==null and an unfinished match. A possible score of 0 must still become a button; null alone means illegal. Nested loops enumerate categories outside and players inside, so each row keeps the same meaning.

The click callback captures its category index. scoreTurn validates and records it. Only on success do we announce, redraw, schedule the opponent and move focus to New match. Replacing the score table removes the clicked button; deliberately moving focus avoids losing the user's location. queueOpponent is defined next lesson and this action is not usable until then.

The final loop destructures [label,key] pairs for summary rows. total(card)[key] uses a dynamic property name, unlike total(card).all. A total-row class distinguishes the final sum. The Pig branch uses validated numeric state in a compact guide, then returns before creating a Yahtzee table. replaceChildren removes the previous game's score content.

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


**Explore, then restore:** Explain why a saved 0 and an unfilled null render differently. Temporarily replace possible!==null with a truthiness check and predict which valid previews disappear; restore the explicit null check. Verify those zero-score buttons once the actions lesson connects the game.

## Connect render

render coordinates the smaller drawing functions. Cache whether the game is Yahtzee in y; use it to select labels, rule text and totals. setAttribute updates pressed-state text, while disabled and hidden are Boolean DOM properties. hidden removes the Pig-only Bank control from Yahtzee layout; disabled explains when a visible action cannot be used.

The roll button is disabled for finished matches, opponent turns or an exhausted Yahtzee roll budget. The bank button additionally requires positive Pig turn points. renderDice and renderScores update the detailed views. At match end compare totals: equal is a draw, greater human total a win, otherwise an opponent win. Nested conditional expressions here are ordinary if/else choices; rewrite one on paper before accepting the compact spelling. No part of render may sample randomness or award points.

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


**Explore, then restore:** Temporarily append render() after its definition and inspect the initial complete static UI. Refresh repeatedly: totals must remain 0. Remove the temporary call; the next lesson adds the permanent setup call after the handlers.

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
