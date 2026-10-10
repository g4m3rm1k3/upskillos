Copy everything below the line into the browser agent. Fill in the three lines under **What to build**. To pick up in a new chat, paste it again and fill in **Already written**.

---

You are writing lessons for **Project Studio**, part of a learning app. A learner builds a real project in a real folder on their own computer, one lesson at a time. The app shows the lesson beside a code editor and a terminal. For each step it compares the learner's file with the step's file and highlights only the lines that differ. **Check my work** runs the step's checks against the learner's real files.

## What to build

- **Project and topic:** {{e.g. a command-line chess engine in Python}}
- **Learner starts from:** {{e.g. can write Python functions and loops; has never written tests}}
- **Series folder name:** {{e.g. Chess Engine}}

**Already written** (leave empty in the first chat): {{paths of files already done, and where to continue}}

## How to reply

1. First, a **plan**: the chapters (folders) and lessons (files), each with one line on what it builds. Then write the files in order without waiting for me.
2. Write **every file in full**, one per block: a line with its path, then the whole file inside a **four**-backtick fence, so the lesson's own three-backtick fences survive:

   `Chess Engine/01 The Board/01-squares.md`
   ````markdown
   ---
   title: 1.1 — Squares on a Board
   ...
   ````

3. Paths are `<series folder>/<NN chapter name>/<NN-slug>.md`. Number chapters and files (`01`, `02` …): they sort by name. Files the learner is given (starter data, test helpers) go in `<chapter folder>/support/<path>`.
4. If you're running out of room, stop at the end of a file and write `CONTINUE FROM: <next path>`. Never stop in the middle of a file.
5. Never change a path once you've written it: the path is the learner's progress key.

## A lesson file

````markdown
---
title: 1.1 — A Greeting Program
track: The Board
runtime: python
support: tests/conftest.py
---

The introduction: what this lesson builds and why it matters.

## Write the greeting

Text explaining what to do and why, then at most one file, then text explaining it.

```python file=greet.py
import sys

print(f"Hello, {sys.argv[1]}!")
```

What each line does, and the types of the values involved.

```check
run "python greet.py Ada" stdout="Hello, Ada!" label="greet.py greets by name" -- Save the file, then run it.
```
````

### Front matter

| Key | Meaning |
|---|---|
| `title` | Shown in the lesson list. Number it `<chapter>.<lesson> — …`. |
| `track` | Only on a chapter's **first** lesson: the chapter's title in the drop-down. |
| `runtime` | What the **Run** button does: `python`, `cpp`, `java`, `dotnet`, or `none`. |
| `run` | Optional: the file Run runs. Without it, Run runs the current step's file. |
| `support` | Optional: comma-separated paths inside the chapter's `support/` folder, created in the learner's project by a button. |

Front matter is one `key: value` per line. No lists, no nesting.

### Steps

- Each `##` heading is a step. Text before the first `##` is the introduction.
- **A step shows at most one file**, as a fence with `file=<path>`: ` ```python file=src/board.py `.
- That fence holds the **whole file as it should be after the step**, never a fragment or a diff. The app works out the changed lines itself, so a step that adds 3 lines to a 200-line file still shows all 200, and highlights the 3.
- A small change to a second file (a line in `.gitignore`) is described in the text, not shown as a second `file=` fence. Ordinary code fences without `file=` are fine for showing terminal commands or output.
- A file handed to the learner to read rather than type is marked `provided`: ` ```python file=tests/test_board.py provided `.
- A step with no file is fine: a reading, a terminal command, a prediction.
- The project carries on from lesson to lesson and chapter to chapter, so each step's file must start from exactly what the previous step left.

### Checks

A ```` ```check ```` fence holds one check per line. After ` -- ` comes the hint shown when it fails. `label="…"` replaces the generated description. Text in double quotes may use `\"`, `\n` and `\t`.

| Check | Passes when |
|---|---|
| `file <path>` / `dir <path>` / `missing <path>` | The file or folder exists, or doesn't. |
| `contains <path> "<text>"` / `lacks <path> "<text>"` | The file has, or doesn't have, the text. |
| `matches <path> "<regex>"` | The file matches the regular expression. |
| `run "<command>" [stdout="…"] [without="…"] [stderr="…"] [stdin="…"] [exit=N] [timeout=S]` | The command exits 0 (or `exit=N`) and, if given, prints the `stdout` text, doesn't print the `without` text, shows the `stderr` text. `stdin` is typed into it. It runs in the project folder; 60-second limit unless `timeout=S`. |
| `tests "<program>" [require="…"]` | A GoogleTest-style C++ test program passes. |
| `git-repo`, `git-commits <n>`, `git-clean`, `git-tracked <path>`, `git-untracked <path>`, `git-ignored <path>` | The project's Git repository is in that state. |
| `git-branch <name>`, `git-has-branch <name>`, `git-no-branch <name>`, `git-merged <branch> [into]` | Branches. |
| `git-remote [name]`, `git-pushed`, `git-config <key>`, `git-message "<text>"`, `git-tag <name>` | Remotes, pushing, settings, commit messages, tags. |
| `page <html file> "<JavaScript expression>" <expected>` | The page, loaded in a browser, gives that value. |

No other check names exist. `matches` uses a **JavaScript** regular expression with the `m` flag, so inline flags such as `(?s)` are errors: to match across lines use `[\s\S]*` instead of `.*`. `tests` does **not** compile anything: its argument is a command that runs an already-built test program, so a `run` check that builds that program must come before it. Prefer checks of **behaviour** (`run`, tests) over checks of **text** (`contains`): code can contain the right text and still not work. With a test file, check one part at a time with `pytest -k <word>`, where the word starts the names of the tests it means and appears in no other test name. Commands must work on Windows, macOS and Linux: `python`, `pytest`, `git`, not `ls`, `cat` or `python3`.

### Predictions

Before running something, ask the learner to commit to an answer:

````markdown
```predict
question: What does `python greet.py` print with no name?
choice: Hello, !
choice: An IndexError
answer: An IndexError
explain: sys.argv holds only the script's name, so sys.argv[1] doesn't exist.
```
````

`answer:` repeats the right choice's text exactly. With no `choice:` lines and a number for `answer:`, it's a number question (`tolerance:` optional). Ask only about results that come out the same on every computer.

### Hints

````markdown
```hints
nudge: What does the failing check expect the program to print?
concept: sys.argv is a list; the first item is the script's own name.
shape: Check the list's length first; print a usage line and stop if it's too short.
answer: The full answer, with code in ~~~ fences:
~~~python
if len(sys.argv) < 2:
    print("usage: python greet.py NAME")
    sys.exit(1)
~~~
```
````

Rungs in that order, any left out, at least one. Code inside a rung uses `~~~` fences, because ``` would end the hints fence.

### Your turn

Every lesson ends with at least one step whose title starts **Your turn**. The learner builds something on their own, using only what the lesson has taught. It has checks and a `hints` fence, and **shows no code**: no `file=` fence, except a `provided` test file. Its `answer:` hint holds the full solution.

### C++ projects

- Use `runtime: none` and teach the build in the terminal: `g++ -std=c++17 main.cpp game.cpp -o game`, then `./game`. The **Run** button compiles only one file, so it can't build a project of several `.cpp` files.
- Keep the C++ checks that launch the program: `./game` works in the terminal on Windows (PowerShell), macOS and Linux.
- Check behaviour by building and then running: `run "g++ -std=c++17 main.cpp game.cpp -o game"` then `run "./game" stdout="…"`.
- A program that reads the keyboard waits forever unless the check types for it: give every `run "./game"` check a `stdin="…"` that ends by quitting, such as `run "./game" stdin="d\nq\n" stdout="#.@......#"`. Then the check sees what the game printed after those keys.
- A `stdout=` check passes if the text appears **anywhere** in the output, so choose text that only appears when the step was done right: never text that is already on the screen before the keys are pressed.
- For tests, don't use GoogleTest (the learner won't have it installed). The project has `tests/minitest.h`, which gives `TEST(Group, Name)`, `EXPECT_EQ(actual, expected)`, `EXPECT_NE(actual, unwanted)`, `EXPECT_TRUE(condition)`, `EXPECT_FALSE(condition)` and its own `main`. It can compare `enum class` values: a failure shows each one as its number in the list. Nothing else from GoogleTest exists in it. A test file starts `#include "minitest.h"` and `#include "../player.h"`. Build a test program from the test file plus the project's `.cpp` files **except** `main.cpp`, then run it:

  ```check
  run "g++ -std=c++17 tests/test_map.cpp map.cpp player.cpp -o test_map" label="the map tests build"
  tests "./test_map" label="the map tests pass"
  ```

  `tests/minitest.h` is already in the learner's project after chapter 01, so later chapters only supply their own new test files in `support/`.

### Don't use

`figure` fences, `{#key}` on headings, `trackOrder`, or more than one `file=` fence per step. None of them help here.

## What a good lesson does

- **One real project.** Each lesson leaves the project working and a little bigger.
- **Smallest runnable steps.** A step changes a few lines, and the learner can run something after it.
- **Explain everything shown.** Every line of code is explained: what it does, the exact types and shapes of the data, and why it's written that way. Analogies only as a supplement to the exact explanation.
- **Teach before asking.** Every idea a Your turn needs is taught in an earlier step.
- **Predict, then run.** A prediction before a surprising result.
- **Checks catch wrong answers.** For each check, think of a likely mistake and make sure the check fails on it.
- **Plain language.** Short sentences. Define a term the first time it's used.
