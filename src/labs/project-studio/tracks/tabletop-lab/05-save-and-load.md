---
title: 11.5 — Keep a model, not a screenshot
runtime: none
---

### The story so far

The lab controls exist. Connect one behavior at a time to the already tested learning module.

### What this lesson builds

Explain ownership of the model and asynchronous work, then verify the associated user action.

## Read the new boundary

JSON.stringify turns the model into text. Blob wraps bytes with a MIME type. URL.createObjectURL supplies a temporary browser URL, and an anchor with download requests a file save; revokeObjectURL releases that temporary URL. File.text returns a Promise of its text, so await waits before JSON.parse. Validate the candidate before assigning model, and cap file size before reading it. A catch block reports failure while preserving the previous model. This operation reads a user-selected local file; it does not upload it.



## Connect saveModel

Add this function. Read each new API against the explanation above, then identify the exact line where state can be replaced.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { choose, validateModel } from './learning.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let model = null;
let worker = null;
let table = null;
let thinkingTimer = null;
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
  byId('opponent-label').textContent = !y && model ? 'YOUR Q-MODEL' : y ? 'HEURISTIC' : 'HOLD-AT-10';
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
      const action = model ? choose(model.table, pig, 0, Math.random) : baseline(pig);
      byId('thinking').textContent = model ? `State ${stateKey(pig)}: the frozen Q-table chose ${action}. Unvisited or tied states use the baseline.` : `The baseline holds at 10 unbanked points, or as soon as banking wins. It chose ${action}.`;
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

function inspectPolicy() {
  const own = Number(byId('inspect-own').value);
  const other = Number(byId('inspect-other').value);
  if (!Number.isInteger(own) || !Number.isInteger(other) || own < 0 || own >= TARGET || other < 0 || other >= TARGET) return;
  let bars = '';
  for (let turn = 1; turn <= 20; turn += 1) {
    const state = { scores: [own, other], turn, player: 0, winner: null };
    const key = stateKey(state);
    const row = model?.table[key];
    const hold = choose(model?.table ?? {}, state, 0, function () { return 0.5; }) === 'hold';
    const label = row ? `roll ${row[0].toFixed(2)}, hold ${row[1].toFixed(2)}` : 'unvisited: baseline';
    bars += `<g><title>Turn ${turn}: ${hold ? 'hold' : 'roll'}; ${label}</title><rect x="${(turn - 1) * 32}" y="10" width="25" height="55" rx="4" fill="${hold ? '#b08535' : '#245d48'}"/><text x="${(turn - 1) * 32 + 12}" y="88" text-anchor="middle" font-size="11" fill="#183e34">${turn}</text></g>`;
  }
  byId('policy-chart').innerHTML = `<svg viewBox="0 0 640 105" role="img" aria-label="Pig action choices: green roll, gold hold, unbanked totals 1 to 20">${bars}</svg>`;
}
function stopTraining() {
  if (worker) worker.terminate();
  worker = null;
  byId('train').disabled = false;
  byId('cancel').disabled = true;
}
function startTraining() {
  stopTraining();
  const active = new Worker(new URL('./trainer.mjs', import.meta.url), { type: 'module' });
  worker = active;
  byId('train').disabled = true;
  byId('cancel').disabled = false;
  byId('training-status').textContent = 'Training on seed 7; evaluation uses separate seeds and balanced starting seats.';
  byId('progress').value = 0;
  active.onmessage = function (event) {
    if (worker !== active) return;
    const data = event.data;
    if (data.type === 'progress') byId('progress').value = data.completed / data.count;
    if (data.type === 'error') { byId('training-status').textContent = data.message; stopTraining(); }
    if (data.type === 'done') {
      model = validateModel(data.model);
      const r = data.report;
      byId('progress').value = 1;
      byId('training-status').textContent = `${model.episodes.toLocaleString()} training games. Evaluation: ${r.wins} wins, ${r.losses} losses, ${r.truncated} truncated. Win rate ${(r.rate * 100).toFixed(1)}%; approximate 95% interval ${(r.low * 100).toFixed(1)}–${(r.high * 100).toFixed(1)}%. Baseline: ${(data.baseline.rate * 100).toFixed(1)}%. Evaluation does not update the table. Select Pig to play your model.`;
      byId('save').disabled = false;
      stopTraining();
      render();
      inspectPolicy();
    }
  };
  active.onerror = function () { if (worker === active) { byId('training-status').textContent = 'Worker failed. Run through the local server and retry.'; stopTraining(); } };
  active.postMessage({ episodes: Number(byId('episodes').value) });
}
function saveModel() {
  if (!model) return;
  const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pig-q-table.json';
  link.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
byId('roll').addEventListener('click', humanRoll);
byId('bank').addEventListener('click', function () { if (currentPlayer() === 0 && move(pig, 'hold')) { render(); queueOpponent(); } });
byId('reset').addEventListener('click', function () { reset(); });
byId('yahtzee-tab').addEventListener('click', function () { reset('yahtzee'); });
byId('pig-tab').addEventListener('click', function () { reset('pig'); });
byId('view3d').addEventListener('change', toggle3D);
render();
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

## Connect loadModel

Add this function. Read each new API against the explanation above, then identify the exact line where state can be replaced.

```javascript file=app.mjs
import { newYahtzee, rollHand, holdDie, scoreTurn, categories, preview, total, greedyCategory } from './rules.mjs';
import { newPig, move, baseline, TARGET, stateKey, actions } from './pig.mjs';
import { choose, validateModel } from './learning.mjs';
import { dieSVG } from './svg.mjs';

const byId = function (id) { return document.getElementById(id); };
let game = 'yahtzee';
let yahtzee = newYahtzee();
let pig = newPig();
let model = null;
let worker = null;
let table = null;
let thinkingTimer = null;
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
  byId('opponent-label').textContent = !y && model ? 'YOUR Q-MODEL' : y ? 'HEURISTIC' : 'HOLD-AT-10';
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
      const action = model ? choose(model.table, pig, 0, Math.random) : baseline(pig);
      byId('thinking').textContent = model ? `State ${stateKey(pig)}: the frozen Q-table chose ${action}. Unvisited or tied states use the baseline.` : `The baseline holds at 10 unbanked points, or as soon as banking wins. It chose ${action}.`;
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

function inspectPolicy() {
  const own = Number(byId('inspect-own').value);
  const other = Number(byId('inspect-other').value);
  if (!Number.isInteger(own) || !Number.isInteger(other) || own < 0 || own >= TARGET || other < 0 || other >= TARGET) return;
  let bars = '';
  for (let turn = 1; turn <= 20; turn += 1) {
    const state = { scores: [own, other], turn, player: 0, winner: null };
    const key = stateKey(state);
    const row = model?.table[key];
    const hold = choose(model?.table ?? {}, state, 0, function () { return 0.5; }) === 'hold';
    const label = row ? `roll ${row[0].toFixed(2)}, hold ${row[1].toFixed(2)}` : 'unvisited: baseline';
    bars += `<g><title>Turn ${turn}: ${hold ? 'hold' : 'roll'}; ${label}</title><rect x="${(turn - 1) * 32}" y="10" width="25" height="55" rx="4" fill="${hold ? '#b08535' : '#245d48'}"/><text x="${(turn - 1) * 32 + 12}" y="88" text-anchor="middle" font-size="11" fill="#183e34">${turn}</text></g>`;
  }
  byId('policy-chart').innerHTML = `<svg viewBox="0 0 640 105" role="img" aria-label="Pig action choices: green roll, gold hold, unbanked totals 1 to 20">${bars}</svg>`;
}
function stopTraining() {
  if (worker) worker.terminate();
  worker = null;
  byId('train').disabled = false;
  byId('cancel').disabled = true;
}
function startTraining() {
  stopTraining();
  const active = new Worker(new URL('./trainer.mjs', import.meta.url), { type: 'module' });
  worker = active;
  byId('train').disabled = true;
  byId('cancel').disabled = false;
  byId('training-status').textContent = 'Training on seed 7; evaluation uses separate seeds and balanced starting seats.';
  byId('progress').value = 0;
  active.onmessage = function (event) {
    if (worker !== active) return;
    const data = event.data;
    if (data.type === 'progress') byId('progress').value = data.completed / data.count;
    if (data.type === 'error') { byId('training-status').textContent = data.message; stopTraining(); }
    if (data.type === 'done') {
      model = validateModel(data.model);
      const r = data.report;
      byId('progress').value = 1;
      byId('training-status').textContent = `${model.episodes.toLocaleString()} training games. Evaluation: ${r.wins} wins, ${r.losses} losses, ${r.truncated} truncated. Win rate ${(r.rate * 100).toFixed(1)}%; approximate 95% interval ${(r.low * 100).toFixed(1)}–${(r.high * 100).toFixed(1)}%. Baseline: ${(data.baseline.rate * 100).toFixed(1)}%. Evaluation does not update the table. Select Pig to play your model.`;
      byId('save').disabled = false;
      stopTraining();
      render();
      inspectPolicy();
    }
  };
  active.onerror = function () { if (worker === active) { byId('training-status').textContent = 'Worker failed. Run through the local server and retry.'; stopTraining(); } };
  active.postMessage({ episodes: Number(byId('episodes').value) });
}
function saveModel() {
  if (!model) return;
  const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pig-q-table.json';
  link.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
async function loadModel(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5000000) throw new Error('Model file exceeds 5 MB');
    const next = validateModel(JSON.parse(await file.text()));
    stopTraining();
    model = next;
    byId('training-status').textContent = `Loaded ${model.episodes.toLocaleString()}-episode Pig model. Select Pig to play it. Loading does not retrain it.`;
    byId('save').disabled = false;
    render();
    inspectPolicy();
  } catch (error) { byId('training-status').textContent = `Model not loaded: ${error.message}. Your previous model is unchanged.`; }
}
byId('roll').addEventListener('click', humanRoll);
byId('bank').addEventListener('click', function () { if (currentPlayer() === 0 && move(pig, 'hold')) { render(); queueOpponent(); } });
byId('reset').addEventListener('click', function () { reset(); });
byId('yahtzee-tab').addEventListener('click', function () { reset('yahtzee'); });
byId('pig-tab').addEventListener('click', function () { reset('pig'); });
byId('view3d').addEventListener('change', toggle3D);
render();
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check app.mjs"
```

```predict
question: Does a failed load or cancelled run erase the previous complete model?
choice: No
choice: Yes
answer: No
explain: Only a validated completed result replaces it.
```

## Try it — Verify the failure path

Save a trained model, reload the page and load the file. The UI should identify the model and use it in Pig without retraining. Test a malformed JSON copy and an incompatible target copy; both must leave the prior model intact. These interactions are fully connected in the next final-wiring step; perform them there before considering the milestone complete.



## Your turn — Accept only a compatible version

Define solve(candidate) returning true for a non-null object with version 1 and target 30, false otherwise. This is a small part of the full validator, not a substitute for it. Export the function as solve.

Write practice/05-save-and-load.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/05-save-and-load.mjs'; if (!(solve({version:1,target:30}) && !solve({version:1,target:100}) && !solve(null))) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Check absence before reading properties.
concept: && short-circuits after a false condition.
shape: Require an object, matching version and matching target.
```
