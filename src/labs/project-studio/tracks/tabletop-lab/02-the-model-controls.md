---
title: 11.2 — Build the opponent laboratory
runtime: none
---

### The story so far

The training worker communicates by messages. Give the learner a visible way to start, stop and inspect it.

### What this lesson builds

Add labelled training controls without hiding their purpose behind a chart.

## Add the control panel

A training interface has a request, progress and a result. The budget select supplies the request; Train and Stop express actions; progress shows completed training; status reports training/evaluation facts; Save and Load handle a completed model. Keep those roles separate so a full bar is not mistaken for permission to save a partial result.

A containing label associates its text with a select or input. Each option has a human label and a machine value; the DOM value is a string, so the controller uses Number to convert it. progress with max=1 expects a fraction: 1000 completed out of 2000 is value .5. aria-label supplies its accessible name. disabled initially prevents Stop and Save when there is nothing to stop or save.

input type=file offers a user-selected File object, not an automatic read of the filesystem. accept="application/json" filters suggestions but does not validate bytes. The inspector's number inputs use min/max and step as browser hints; JavaScript must still reject invalid input. Their labels distinguish whose banked score is being held fixed. The policy chart's container is a future output, not the source of decisions.

This target adds the lab below the playable games. The styles were introduced in the interface chapter; no new rule code is needed. The following steps attach behavior. Until then select and file-picker controls work natively, but the Train/Save actions are not connected.

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
        <details class="learn-note"><summary>What is the opponent thinking?</summary><p id="thinking"></p><p>Yahtzee uses a readable scoring heuristic. Pig can use the Q-table you train below. Animation displays the rule engine's result; it never changes the score.</p></details>
      </section>
      <aside class="score-panel"><p class="eyebrow">EVERY CHOICE COUNTS</p><h2 id="score-title">The score sheet</h2><div id="scorecard"></div></aside>
    </div>
    <section class="learning-panel" aria-labelledby="learning-title"><div><p class="eyebrow">THE OPPONENT LAB</p><h2 id="learning-title">Teach it when to stop.</h2><p>Train a Pig policy from wins and losses. No neural network, no hidden moves: just a table of estimates you can inspect.</p></div><div class="training-controls"><label>Training games <select id="episodes"><option value="10000">10,000 · a first experiment</option><option value="40000" selected>40,000 · learn a policy</option><option value="100000">100,000 · compare evidence</option></select></label><div class="action-row"><button id="train" class="primary">Train opponent</button><button id="cancel" class="secondary" disabled>Stop</button><button id="save" class="quiet" disabled>Save model</button></div><progress id="progress" value="0" max="1" aria-label="Training progress"></progress><p id="training-status" role="status" aria-live="polite">No trained model yet. Pig uses the hold-at-10 baseline.</p><label>Load a model <input id="load" type="file" accept="application/json,.json"></label></div><div class="policy-inspector"><label>Your banked score <input id="inspect-own" type="number" min="0" max="29" value="0"></label><label>Their banked score <input id="inspect-other" type="number" min="0" max="29" value="0"></label><div id="policy-chart"></div><p>Each bar compares roll and hold for an unbanked total. Gold means hold. Unvisited states use the baseline; estimates are not guaranteed win probabilities.</p></div></section>
    <footer>TABLETOP WORKSHOP <span>Built slowly. Played often.</span></footer>
  </main>
  <script type="module" src="./app.mjs"></script>
</body>
</html>
```

These controls become active as the next controller steps connect them. Keep the games playable while building the lab; do not replace the model until a full training run or validated load succeeds.

```check
file index.html
```

```predict
question: Does accept="application/json" prove the selected file is a valid model?
choice: No
choice: Yes
answer: No
explain: It is a file-picker hint, not schema validation.
```


**Explore, then restore:** Tab through the panel and read each control name in the Accessibility pane. Change the select and inspect its value: it is text even when it looks numeric. Set the progress value to .5 in DevTools and observe half the bar, then restore 0.

## Try it — Read the form without sight

Use the Accessibility pane to inspect names for episodes, progress and file selection. Temporarily remove a label association and observe the loss of meaning, then restore it. A visual placeholder is not an equivalent label.



## Your turn — Label a training choice

Create a label containing a select with options whose values are 1000 and 2000. Name the label Training budget.

Write practice/02-the-model-controls.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-the-model-controls.html "document.querySelector('label select option[value=\"2000\"]') !== null" "true"
```

```hints
nudge: Keep the name next to the control.
concept: A containing label associates its text with the control.
shape: Put select inside label and give each option a machine-readable value.
```
