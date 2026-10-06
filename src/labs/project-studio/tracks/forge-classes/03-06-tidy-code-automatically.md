---
title: 3.6 — Tidy Code, Automatically
runtime: python
run: breakout.py
---

Two people editing the same file will disagree about where line breaks go, whether there are two blank lines between functions or three, and how imports are ordered. None of it matters to the computer, and all of it wastes time in reviews and makes diffs noisy. The professional answer is to stop deciding by hand: a **formatter** lays code out by fixed rules, and a **linter** reads it for likely mistakes and needless complication. This lesson adds **ruff**, which does both, and ends Chapter 3.

## The game tests so far

**Build:** make sure `tests/test_game.py` matches the end of lesson 3.5, the reference answer to its Your turn.

```python file=tests/test_game.py
import random

import pygame
from pygame import Vector2

import breakout


def autopilot_game(seed: int, frames: int) -> breakout.Game:
    game = breakout.Game(random.Random(seed))
    for _ in range(frames):
        game.update(breakout.autopilot(game.ball, game.paddle), 1 / 60)
    return game


def test_a_new_game():
    game = breakout.Game(random.Random(0))
    assert (game.score, game.lives, len(game.bricks)) == (0, 3, 40)
    assert game.playing()


def test_ten_seconds_of_autopilot_matches_the_test_run():
    game = autopilot_game(0, 600)
    assert (game.paddle.rect().x, game.score, game.lives, len(game.bricks)) == (435, 70, 3, 33)


def test_a_missed_ball_costs_a_life_and_a_new_ball_is_served():
    game = breakout.Game(random.Random(0))
    game.ball = breakout.Ball(Vector2(100, breakout.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 2
    assert game.ball.position == Vector2(320, 240)


def test_a_ball_that_hits_a_brick_breaks_it_and_bounces():
    game = breakout.Game(random.Random(0))
    game.bricks = [breakout.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = breakout.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert (game.score, len(game.bricks)) == (10, 0)
    assert game.ball.velocity.y == 240


def test_losing_the_last_life_ends_the_game():
    game = breakout.Game(random.Random(0))
    game.lives = 1
    game.ball = breakout.Ball(Vector2(100, breakout.HEIGHT + 20), Vector2(0, 300))
    game.update(0, 1 / 60)
    assert game.lives == 0
    assert not game.playing()
    before = (game.score, game.lives, len(game.bricks))
    game.update(0, 1 / 60)
    assert (game.score, game.lives, len(game.bricks)) == before


def test_breaking_the_last_brick_wins():
    game = breakout.Game(random.Random(0))
    game.bricks = [breakout.Brick(pygame.Rect(300, 200, 70, 20), (34, 197, 94))]
    game.ball = breakout.Ball(Vector2(330, 225), Vector2(0, -240))
    game.update(0, 1 / 60)
    assert game.bricks == []
    assert game.score == 10
    assert not game.playing()
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
```

## Install ruff

**Build:** add ruff to the project's packages.

```text file=requirements.txt
pygame-ce==2.5.8
pytest==9.1.1
pyright[nodejs]==1.1.414
ruff==0.16.10
```

```powershell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m ruff --version
```

```text
ruff 0.16.10
```

**Understand.** ruff is written in **Rust**, a compiled language, and installed from a wheel that contains the finished program for your operating system (lesson 0.2's `win_amd64` wheels). That's why it's fast: checking this whole project takes a fraction of a second.

```check
contains requirements.txt "ruff==0.16.10"
run ".venv/Scripts/python -m ruff --version" stdout="ruff 0.16.10" label="ruff 0.16.10 is installed" -- Run .venv\Scripts\python -m pip install -r requirements.txt.
```

## Choose a line length

**Build:** a settings file for ruff, with the project's one formatting decision.

Create `ruff.toml` in the project folder:

```toml file=ruff.toml
line-length = 120
```

**Understand.** ruff's default maximum line length is 88 characters, inherited from **Black**, the Python formatter that made automatic formatting the norm. Most of this project's lines fit in 88, but a good number of its function signatures and test assertions run a little past it, and 88 would wrap them all. 120 keeps those on one line. (The longest lines, the recorded game lines in the characterisation tests, are about 130 characters, so they get split either way, and you'll see that below: that's fine.) There's no right number; what matters is that the project makes one decision and writes it down, once, where the tool reads it. That's the only formatting choice anyone in the project will make by hand.

**TOML** (Tom's Obvious Minimal Language) is a settings format of `name = value` lines, with `[sections]` when needed: lesson 2.3's INI format, made precise. Chapter 4 moves this setting into `pyproject.toml`, alongside pytest's.

```check
contains ruff.toml "line-length = 120"
```

## Format everything

**Build:** let ruff lay out every Python file in the project.

```powershell
.venv\Scripts\python -m ruff format .
```

```text
4 files reformatted, 12 files left unchanged
```

(Your counts may differ slightly, depending on whether you did lesson 0.2's challenge, and kept any other files of your own.) Look at what changed:

```powershell
git diff --stat
```

```text
 breakout.py                    |  1 -
 replay.py                      |  1 +
 tests/test_arguments.py        |  4 +++-
 tests/test_characterisation.py | 39 +++++++++++++++++++++++++++++++--------
 4 files changed, ...
```

`--stat` shows only a summary: each changed file, with how many lines changed, as `+` for added and `-` for removed. Run plain `git diff` to read the changes themselves. Read the diffs: a stray blank line removed from `breakout.py` (three blank lines between definitions instead of two), one added to `replay.py`, and the long recorded-line assertions split so that each fits in 120 characters.

**Understand: what a formatter guarantees.** ruff reads each file into the same structure Python itself builds when it compiles code, the **syntax tree**, then writes the code out again from that tree by its own fixed rules. Because it works from the structure, it only ever changes layout: spacing, line breaks, quotes, blank lines. It never changes what the code does. You can see the tree it works from, with Python's own `ast` module (**abstract syntax tree**):

```powershell
.venv\Scripts\python -c "import ast; print(ast.dump(ast.parse('x = 1 +   2')))"
.venv\Scripts\python -c "import ast; print(ast.dump(ast.parse('x=1+2')))"
```

Both print the same tree, `Module(body=[Assign(targets=[Name(id='x', ...)], value=BinOp(left=Constant(value=1), op=Add(), right=Constant(value=2)))])`: the spaces were never part of the program, only of the text. A formatter rewrites the text from the tree, so it can't change the program. Run the tests to see that for yourself, then commit the formatting **on its own**:

```powershell
.venv\Scripts\python -m pytest -q
git add .
git commit -m "Format the code with ruff"
```

A formatting commit that changes nothing else is easy to review ("it's only layout"), and keeps formatting noise out of the diffs of commits that change behaviour.

> **Engineer:** formatting is a decision a team makes **once**, by choosing a tool and a configuration, and then never discusses again. Running the formatter before every commit means every file in the project always looks the way the tool says, so a diff shows only what someone actually changed. Remembering to is the weak point, so it's usually made automatic: editors can format a file every time it's saved (VS Code's *Format on Save*, with ruff as the formatter), and a git **hook** can run the check before every commit (a challenge below); Chapter 17's continuous integration runs it on every push.

```check
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted" label="every file is formatted" -- Run .venv\Scripts\python -m ruff format .
run ".venv/Scripts/python -m pytest -q" stdout="51 passed" label="formatting changed nothing the tests can see"
git-message "format"
git-clean
```

## What the linter finds

**Build:** ask ruff what else it notices, and apply the fixes it can make safely.

First, see a linter on mistakes you made on purpose. Create `scratch/lint_me.py`:

```python
import os


def f(x):
    y = 1
    if x == None:
        return 0
```

```powershell
.venv\Scripts\python -m ruff check scratch\lint_me.py
```

```text
scratch\lint_me.py:1:8: F401 [*] `os` imported but unused
scratch\lint_me.py:5:5: F841 Local variable `y` is assigned to but never used
Found 2 errors.
```

(ruff prints each finding with the line shown and marked; the lines above are the gist.) Each finding has a **rule code** and says what it saw: an import nothing uses (it runs, and misleads the reader), and a variable given a value nobody reads (often a typo for one that is read). `.venv\Scripts\python -m ruff rule F841` prints the rule's full explanation. And notice what it **didn't** report: `x == None`, which should be `x is None` (lesson 0.3). There's a rule for that, `E711`, but it isn't in the set the pinned version runs by default: a linter only finds what its rules look for. Now the project:

```powershell
.venv\Scripts\python -m ruff check .
```

```text
breakout.py:254:13: SIM114 [*] Combine `if` branches using logical `or` operator
check_setup.py:16:1: I001 [*] Import block is un-sorted or un-formatted
tests\test_characterisation.py:11:12: PLW1510 `subprocess.run` without explicit `check` argument
Found 3 errors.
[*] 2 fixable with the `--fix` option.
```

(ruff prints each finding with the code around it; here they're shortened to one line each, which you can get with `--output-format concise`. If you didn't do lesson 0.2's challenge, there's no `check_setup.py` finding.)

**Understand: rules and their families.** Each finding has a **rule code**. The letters say which family of rules it comes from, most of them collected from older Python tools that ruff reimplements:

| Code | Family | What this one says |
|---|---|---|
| `SIM114` | simplify (from flake8-simplify) | two `if` branches do the same thing, `running = False`, so one condition joined with `or` says it once |
| `I001` | imports (from isort) | the imports aren't in the standard order: standard library first, then other packages, each group alphabetical |
| `PLW1510` | pylint warnings | `subprocess.run` was called without saying what should happen if the program fails (`check=`) |

Which rules run without being asked for depends on the ruff version: the version pinned in `requirements.txt` turns these families on by default, among others. To read the full explanation of any rule, with examples, run `.venv\Scripts\python -m ruff rule SIM114`.

`[*]` marks a finding ruff can fix by itself, safely. Apply those:

```powershell
.venv\Scripts\python -m ruff check --fix .
```

```text
Found 3 errors (2 fixed, 1 remaining).
```

The fix to `breakout.py`:

```text
-            if event.type == pygame.QUIT:
-                running = False
-            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
+            if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                 running = False
```

```predict
question: With `A = False`, `B = True` and `C = False`, what is `A or B and C`?
choice: True
choice: False
answer: False
explain: `and` is worked out before `or`, so it's `A or (B and C)`: `B and C` is `True and False`, which is `False`, and then `False or False` is `False`. Read left to right instead, `(A or B) and C`, it would be `True and False`, also `False` here, but not always: with `A = True` and `C = False`, `A or (B and C)` is `True` while `(A or B) and C` is `False`. The game's condition is `QUIT or (KEYDOWN and ESCAPE)`, the right one.
verify: .venv/Scripts/python -c "print(False or True and False)"
```

**Understand: why the combined condition is right.** It reads as `A or B and C`, which looks ambiguous, but Python has a rule: `and` is evaluated before `or` (it has higher **precedence**, the same way `×` comes before `+`). So it means `A or (B and C)`: quit, or Escape pressed, exactly the two old branches. Many people would add the brackets anyway for readers who don't remember the rule; that's allowed, and the formatter leaves them alone.

A linter's suggestion is a **question**, not an order. `SIM114` is right here, because the two branches really are one rule ("these events end the game"). If two branches only happened to do the same thing today, but stood for different rules that might change separately, keeping them apart would be the better design, and you'd tell ruff so for that line with a comment: `# noqa: SIM114`. (`noqa` is conventionally read as "no quality assurance": ruff skips that rule on that one line.)

Run the tests, then commit:

```powershell
.venv\Scripts\python -m pytest -q
git add .
git commit -m "Apply ruff's automatic fixes"
```

```check
lacks breakout.py "elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:" -- Run .venv\Scripts\python -m ruff check --fix .
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
git-message "automatic fixes"
git-clean
```

## Your turn: the last finding

**Build, on your own:** make ruff fully satisfied, and add it to the definition of done.

One finding is left, and ruff can't fix it, because fixing it needs a decision:

```text
tests\test_characterisation.py:11:12: PLW1510 `subprocess.run` without explicit `check` argument
```

`subprocess.run` has a parameter `check`. With `check=True`, it raises an exception if the program it ran exits with a non-zero code; with `check=False` (the default), it just returns the result, exit code included. The rule asks you to **say which you mean**, because forgetting that a failing program doesn't raise is a common bug.

1. Decide which this helper needs. (Look at `test_a_bad_frame_count_is_a_usage_error`: what does it expect the program's exit code to be?)
2. Make the choice explicit in `play`, so that `ruff check .` prints `All checks passed!`.
3. In `BACKLOG.md`, add to the definition of done that `ruff format --check .` and `ruff check .` both pass.
4. Commit with a message that mentions **lint**.

```hints
nudge: What exit code does the usage-error test expect from `breakout.py --test-run ten`? What would `check=True` do when the game exits with that code?
concept: With `check=True`, `subprocess.run` raises `CalledProcessError` whenever the program's exit code isn't 0. The usage-error test *wants* the game to exit with 2, and then inspects `result.returncode` itself. So the helper must not raise: `check=False`. Writing it explicitly, even though it's the default, records that the choice was deliberate.
shape: Add `check=False` as one more keyword argument in `play`'s call to `subprocess.run`. Then run `ruff check .` and `ruff format --check .`, update the definition of done, and commit.
answer: ~~~python
def play(*args):
    return subprocess.run([sys.executable, str(GAME), *args], capture_output=True, text=True, check=False)
~~~

and the definition of done in `BACKLOG.md`, for example:

~~~text
A story is done when every acceptance check under it is ticked, `.venv\Scripts\python -m pytest` passes, `.venv\Scripts\python -m pyright breakout.py` reports no errors, `.venv\Scripts\python -m ruff format --check .` and `.venv\Scripts\python -m ruff check .` pass, and the work is committed.
~~~

With `check=True`, every test that expects a non-zero exit code would fail with `CalledProcessError` before reaching its own `assert`. Default values that are easy to forget are exactly where explicit is better than implicit, which is one of the lines of *The Zen of Python* (run `python -c "import this"` to read the rest).
```

```check
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!" label="ruff finds nothing" -- Make the check argument of subprocess.run explicit in tests/test_characterisation.py.
run ".venv/Scripts/python -m ruff format --check ." stdout="already formatted"
contains tests/test_characterisation.py "check=False"
run ".venv/Scripts/python -m pytest -q" stdout="51 passed"
contains BACKLOG.md "ruff check" -- Add ruff format --check and ruff check to the definition of done.
git-message "lint"
git-clean
```

## Challenge: read three rules

**Optional, ★.** Run `ruff rule` on `F401`, `B006` and `UP006`. Write, in your own words in a scratch file, what each one catches and why it matters, and add a few lines that trigger each (`ruff check --select F401,B006,UP006 scratch\yourfile.py` runs just those). Reading a tool's documentation is a skill of its own.

## Challenge: a pre-commit hook

**Optional, ★★.** Git runs the file `.git\hooks\pre-commit`, if it exists, before every commit, and refuses the commit if it fails. Write one (a short shell script, starting `#!/bin/sh`, which Git for Windows can run) that runs `.venv/Scripts/python -m ruff format --check .` and `.venv/Scripts/python -m ruff check .`. Prove it by trying to commit a badly formatted file. The definition of done, enforced by a tool instead of memory.

## Challenge: a stricter family

**Optional, ★★.** Add a `[lint]` section to `ruff.toml` with `extend-select = ["B"]` (the **flake8-bugbear** rules, likely bugs and design problems), run `ruff check .`, and for each finding decide: fix it, or keep it with `# noqa: CODE` and a comment saying why. A linter's suggestion is a question, not an order. In a copy.

## What did we actually learn? (Chapter 3)

This chapter turned loose variables and tuples into objects with names, rules and responsibilities, and changed how features get built:

- **Classes and objects**: data with the methods that understand it. `__init__`, `self`, and what a method call really is.
- **Names refer to objects**: assignment and arguments never copy, so shared mutable objects are shared changes. One source of truth, everything else derived.
- **Dataclasses** for data-holding classes; **frozen** ones for values that mustn't change; **vectors** for quantities that move together.
- **Test-driven development**: red, green, refactor, with a commit at every green; spikes for what can only be decided by trying.
- **Enums** for fixed choices; **invariants** kept by the object itself, with private attributes and read-only properties; **fail fast** with exceptions.
- **Composition** builds the `Game` model, which runs without a window: tests, replays and (later) agents can drive it.
- **Reading code** you didn't write, with a method.
- **Git**: small commits, `git restore`, and `git stash` for "was it me?".
- **Tools decide what humans shouldn't argue about**: the formatter for layout, the linter for common mistakes, both in the definition of done.

The technical debt list is much shorter. Look at what's left: `main` still mixes the game loop with test-run machinery (`settings.test_frames` decides three different things), arguments are still parsed by hand, and the game can only be in one state, *playing*, with "won" and "lost" detected by checking numbers. And everything is still in one file, `breakout.py`, nearly 300 lines long. **Chapter 4** makes it a real project: a package with modules, a proper command-line interface, game states (title, playing, paused, game over) as a state machine, and your first git branches.

**Chapter 3's challenges**, to come back to: a ball that knows its speed ★, two balls ★★, an aliasing bug on purpose ★★ (3.1); a paddle made of vectors ★, a Colour type ★★, dataclass, by hand ★★★ (3.2); strong bricks ★, a spike, then tests ★★, find the fake ★★ (3.3); bricks that can't be made wrong ★, a paddle you can set ★★, no forgotten cases ★★ (3.4); replay the cracks ★, a second client for the model ★★, the game owns the paddle bounce ★★★ (3.5); read three rules ★, a pre-commit hook ★★, a stricter family ★★ (this lesson).

None of these ideas is about games. A web service's request and response are dataclasses (or pydantic models, Chapter 5); HTTP status codes are an enum; a shopping basket keeps an invariant (the total is the sum of its lines) the way the paddle does; and every serious application separates its model from its screens, as `Game` is separated from `draw`.

In C# and Java, formatting and linting are just as standard: `dotnet format` and analyzers (with rule codes like `CA1822`) for C#, and Checkstyle, SpotBugs or the Google Java Format tool for Java, usually run automatically before code is accepted. The idea is identical: decide once, enforce by tool.
