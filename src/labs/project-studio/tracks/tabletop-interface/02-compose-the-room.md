---
title: 8.2 — Design the room around the game
runtime: none
---

### The story so far

You have a small visual language and SVG dice. The larger interface needs a clear hierarchy.

### What this lesson builds

Build a semantic page shell for both games and explain the visual role of each region.

## Draw the layout before styling

Sketch a masthead, a short introduction, game selectors, a main dice panel and a score panel. Mark the primary action, supporting actions and status message. The scorecard is data, so it remains a table. nav labels the game selector; section groups a named region; aside holds supporting scores. aria-labelledby points to a heading id. aria-live="polite" asks assistive technology to announce status updates without interrupting current speech. details/summary gives a disclosure without custom JavaScript. hidden removes inactive content. The module script imports names in its own scope.

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
        <div class="panel-heading"><div><p class="eyebrow" id="game-kicker">FIVE DICE / ENDLESS POSSIBILITIES</p><h2 id="game-title">Your seat at the table</h2></div></div>
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

This is a shell checkpoint: the imported app.mjs will be built in the following lessons, so a missing-module message is expected until then. Keep your working Sixes page as scratch/sixes.html before replacing index.html. Do not treat a blank scorecard in this intermediate shell as a completed game. Read the id on every future control; the controller will connect to those exact names.

```check
file index.html
```

```predict
question: Which region should receive the strongest visual emphasis?
choice: The current game and primary action
choice: Every label equally
answer: The current game and primary action
explain: Hierarchy helps a player find the next decision.
```

## Try it — Remove a landmark label

Temporarily remove aria-label from the game selector nav and inspect the Accessibility pane. Its purpose is less clear to a screen reader. Restore it. This cannot be established by a screenshot alone.



## Your turn — Design an empty-state card

Create a main region with a heading, an explanatory paragraph and a button reading Start a match. The paragraph must tell the player what happens next.

Write practice/02-compose-the-room.html independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
page practice/02-compose-the-room.html "document.querySelector('button')?.textContent" "Start a match"
```

```hints
nudge: What is the next useful action?
concept: An empty state explains both absence and the way forward.
shape: Use a heading, one sentence and a real button; make the button the clear action.
```
