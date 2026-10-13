---
title: Start here — Your route to a finished game
track: Start here — one file before classes
runtime: none
---

You will first make a small dice game in one C++ file. You will learn what each line means, make predictions, break a small example deliberately, and repair it. Only then will you split code into files and protect data with classes. You need basic familiarity with variables, loops and functions; you do not need previous C++ experience.

## Choose the starting point

Choose a project folder in Project Studio. C++ checks run in the desktop app with a compiler installed. In a browser you can read the lessons, but run their commands in your own terminal. Try `g++ --version`; if that command is missing, install your platform's C++ toolchain before continuing. On macOS, `clang++` can replace `g++`; on Windows, use a GCC toolchain and run the resulting `.exe`.

All chapters share your chosen folder. The opening uses `main.cpp`; memory experiments use `scratch/` so they cannot break the game. Save the single-file milestone as `single_file.cpp` before continuing into chapter 1. Build only the named source files, never `*.cpp`, because two files defining `main` cannot form one executable.

## Follow the concepts in order

| Stage | What you can do afterward |
|---|---|
| Start here | Compile, trace values, read input, run a small game in one file; explain copies, const, references and pointers; split a function into a header and source; write a class in one file |
| One Die / Several Dice | Rebuild the prototype around a die with valid state, then manage and display a hand |
| Counting and Scoring / The Turn | Score every category, validate input, hold dice and finish a scorecard |
| Cleaner C++ / Players | Use named categories, compare copies with moves, compile separately, play multiplayer and handle ties/replay |
| Finish and Explain | Add repeated-Yahtzee and Joker rules, test the completed program and demonstrate independent C++ understanding |

A **module** here means a part of the program with one responsibility, usually a `.h` / `.cpp` pair. C++20 also has a language feature called modules using `import`; this C++17 course teaches separate compilation with headers first. They are different mechanisms.

## Learn by leaving evidence

Before running an example, write down its output. After running, explain any mismatch. For each independent task, keep your code and one new test case. Green checks establish the listed behavior, not that you understand every line. Continue reading when stuck, then return to finish the task.

Your final explanation should follow one roll from input, through dice state and scoring, to a recorded result. You should be able to justify which parameters copy, which borrow, which can change their caller, and who owns every object.

```predict
question: Should you create Die.h before you understand the one-file version?
choice: No — first make and explain the one-file version
choice: Yes — every C++ class needs a header
answer: No — first make and explain the one-file version
explain: Classes and headers solve separate problems. Both are legal to postpone.
```

## Your turn — Explain and change it

Write a learning log with three questions you want the finished game to answer. Include one about memory and one about program structure.

```hints
nudge: Start from a line of C++ you cannot yet explain.
concept: A learning goal names an observable action, such as tracing a mutation.
shape: Keep the log outside compiled source files; revisit it in the final chapter.
```
