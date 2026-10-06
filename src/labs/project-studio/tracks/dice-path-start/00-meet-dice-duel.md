---
title: A00 — Play the game you will build
track: C++ Games — Start Here
trackOrder: 4
runtime: cpp
console: true
---

You can write a Python script. You do not need to know C++, classes, tests, graphics or machine learning. Start by playing the game: the reason for every compiler command and class later is to build something you can understand, change and run yourself.

## A decision worth building a game around

You have 4 points. Your opponent has 7. There are 5 more points in your unbanked pot. Would you keep them, or risk another roll?

```figure
name: dice-start/DiceDuelPreview
caption: A playable browser rule preview, with repeatable teaching dice and a fixed bank-at-4 opponent. No trained model is running here.
```

**Start with the game, not setup.** Try a match. Use New match to start from zero, or Reset decision to return to the difficult choice. The comparison buttons isolate your move before the opponent responds.



## Explain the rules with one position

Two players race to **12**. Your permanent score is separate from this turn's **pot**, the points you have not banked.

- Roll 2–6: add the face to the pot and choose again.
- Roll 1: lose the pot and pass the turn; your permanent score survives.
- Bank: add a positive pot to your score, empty it and pass. Banking zero is unavailable.
- If score plus pot reaches 12 after a roll, you win immediately. You need not bank first.

```predict
question: At score 4 and pot 5, rolling 1 leaves which permanent score?
choice: 4
choice: 0
answer: 4
explain: Only the unbanked pot is lost. The previously banked four points remain.
```

Use the comparison controls in the previous step after committing to your prediction. Explain the difference between losing the pot and losing the whole match.



## What you will build, and why finish

Your first project is a **terminal game**: text and commands, like a Python script you can run yourself. You will write its rules, separate them into real files, protect state with classes, and write tests that catch mistakes.

First the opponent follows a rule: bank once the pot reaches four. Later you will implement **Q-learning**, an algorithm that adjusts estimates of which actions lead to useful outcomes. You will train on many games, evaluate against a baseline, save the learned numbers, and play against the saved model. A model is not automatically good just because training finished.

After that come SDL3 windows and input, graphics and shaders, then Vulkan. Those later chapters are still being authored. This first chapter teaches the C++ vocabulary that makes their code understandable.

**Your finish line:** choose one feature you personally want—an alternative display, match history, or an opponent comparison. Write it in your own notes with a sentence explaining who it helps. Revisit that choice when the project supports it.



## Your turn — Trace without code

**Hide the rules and reason first.** From score 4, opponent 7, pot 5, record the new score, pot and next player for banking, rolling 1 and rolling 3. Then use the comparison buttons to check.

```hints
nudge: Treat permanent score and unbanked pot as two different places.
concept: Banking moves the pot; a bust discards it; an ordinary roll adds to it.
shape: Check whether score plus the new pot reaches twelve before passing a turn.
```

**Explain:** why should drawing a score on a screen never decide whether banking is legal? The rules should work whether input comes from a human, an automated test or a learning agent. This is a reasoning task, not a machine-graded programming task.



