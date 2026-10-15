---
title: 8.8 — Events, turns and a shared host
runtime: none
---

### The story so far

The pure game modules and styled shell are ready. Wire their boundaries in small function additions.

### What this lesson builds

Explain the route from one user action through the model to a refreshed view.

## Connect pick

pick receives an index from either an SVG button or, later, a 3D hit. && short-circuits left to right: only human Yahtzee can call holdDie. Only a successful hold causes render. Rule validation remains authoritative even if a stale UI control fires.

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
function pick(index) {
  if (game === 'yahtzee' && currentPlayer() === 0 && holdDie(yahtzee, index)) render();
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```


**Explore, then restore:** Trace a Pig pick: the first condition fails, so no Yahtzee hold changes. Trace an opponent-turn Yahtzee pick: the second fails. Test both after wiring.

## Connect humanRoll

Guard finished matches and opponent turns before doing anything. Dispatch to rollHand for Yahtzee or move(...,'roll') for Pig. Choose status text from the resulting state, then render(true) to request visual motion later. queueOpponent runs after rendering but only schedules work if the resulting player is the bot. A Pig non-bust keeps the human turn, so the queue helper will return immediately.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```


**Explore, then restore:** Trace Pig roll 6 versus roll 1. For 6 the human still decides; for 1 the opponent is queued. Explain why scheduling on every click without checking the resulting player would let the opponent act too early.

## Connect queueOpponent

setTimeout(callback,450) schedules future work after at least roughly 450ms; it does not pause this function. Its return is a timer handle stored in thinkingTimer. clearTimeout cancels a previously scheduled callback. Check player and completion before scheduling. This avoids multiple queued bot moves from repeated UI updates.

The callback executes one decision: Yahtzee rolls once and records its greedy category; Pig chooses its baseline action and moves. It writes an explanation, redraws, then calls queueOpponent again. This is scheduling another future callback, not immediate recursive game play. If Pig still owns the turn it can roll again; if play passed or ended, the guard stops scheduling. Never put an unbounded while loop with DOM work here: it would block input.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```


**Explore, then restore:** Once wired, start the opponent and immediately press New match. Wait longer than the delay: the fresh game must still be on your turn. Remove clearTimeout only in a scratch copy to observe the stale-action problem; restore it.

## Connect reset

reset defaults next to the currently selected game. Cancel the old delayed bot action before replacing session objects. Assign the selected game, create fresh states for both rule models, announce the reset and render. A reset is a deliberate state replacement; render alone is not. Keeping both game objects fresh avoids returning to a half-finished hidden match unexpectedly.

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
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```


**Explore, then restore:** Switch games during an opponent delay and check the new game’s turn and score. Explain why cancelling the timer after replacing state is harder to reason about than doing it first.

## Attach handlers once

Attach listeners after definitions exist. Passing humanRoll supplies a callback without calling it. Wrappers such as function(){reset('pig');} pass a specific argument when clicked. Bank requests a hold and queues the bot only after an accepted move. The pagehide handler cancels remaining timers on departure. The final render() initializes the interface once.

This is now a runnable integrated milestone. Use npm run dev, open the root page, play a Yahtzee turn and a Pig turn, and inspect status and disabled controls. Do not attach these listeners inside render: one button would accumulate multiple callbacks after repeated redraws.

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

byId('roll').addEventListener('click', humanRoll);
byId('bank').addEventListener('click', function () { if (currentPlayer() === 0 && move(pig, 'hold')) { render(); queueOpponent(); } });
byId('reset').addEventListener('click', function () { reset(); });
byId('yahtzee-tab').addEventListener('click', function () { reset('yahtzee'); });
byId('pig-tab').addEventListener('click', function () { reset('pig'); });
window.addEventListener('pagehide', function () { clearTimeout(thinkingTimer); });
render();
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
run "node --test tests/rules.check.mjs"
```

```predict
question: Should a render call ever choose a new random face?
choice: No
choice: Yes
answer: No
explain: A display refresh must not change the underlying game.
```


**Explore, then restore:** Click Roll once and verify the budget increments once. Tab to a die, toggle it with the keyboard and verify focus remains on that same die. Score zero deliberately in an unused category and verify it becomes recorded rather than remaining empty.

## Try it — Interrupt a pending action

After the controller is fully wired, score a Yahtzee turn and immediately switch to Pig. The cancelled timer must not make an old Yahtzee move in the new match. Also reset during a Pig opponent turn. The syntax check cannot establish this interaction; perform it in the browser.



## Your turn — Decide whether to schedule

Define solve(player, finished, pending) returning true only for opponent seat 1 in an unfinished match with no pending callback. This exercise chooses whether work is needed; it must not start a real timer. Export solve from practice/08-wire-actions.mjs. Explain why two independent reasons to refuse work should not be combined with &&.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {solve} from './practice/08-wire-actions.mjs';assert.equal(solve(1,false,false),true);assert.equal(solve(0,false,false),false);assert.equal(solve(1,true,false),false);assert.equal(solve(1,false,true),false);\""
```

```hints
nudge: List the only acceptable combination first.
concept: All three requirements must hold together.
shape: Combine opponent equality with not-finished and not-pending.
```
