---
title: 4.7 — When Branches Disagree
runtime: python
run: breakout/__main__.py
---

Lesson 4.6's merge was a **fast-forward**: nothing had changed on `main` while the branch was being built, so Git only had to move a name. On a real project that's rare. While you work on a branch, `main` moves on: other people's branches are merged into it, or you fix something urgent there yourself. Then merging means **combining** two lines of changes, and sometimes they change the same line in different ways. That's a **merge conflict**, and this lesson creates one on purpose, so that the first one you meet for real is your second.

## The state tests so far

**Build:** make sure `tests/test_states.py` matches the end of lesson 4.6, the reference answer to its Your turn.

```python file=tests/test_states.py
import random

from pygame import Vector2

from breakout import model


def started_game() -> model.Game:
    game = model.Game(random.Random(0))
    game.start()
    return game


def test_starting_from_the_title_begins_play():
    assert started_game().state == model.GameState.PLAYING


def test_p_pauses_and_p_again_resumes():
    game = started_game()
    game.toggle_pause()
    assert game.state == model.GameState.PAUSED
    game.toggle_pause()
    assert game.state == model.GameState.PLAYING


def test_a_paused_game_does_not_move():
    game = started_game()
    game.toggle_pause()
    before = Vector2(game.ball.position)
    game.update(0, 1 / 60)
    assert game.ball.position == before


def test_pausing_on_the_title_screen_does_nothing():
    game = model.Game(random.Random(0))
    game.toggle_pause()
    assert game.state == model.GameState.TITLE
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="63 passed"
git-branch main
git-clean
```

## Two lines of work

**Build:** a branch that changes the title message.

```powershell
git switch -c title-text
```

In `breakout/draw.py`, change the title message from `"Breakout: press Space to start"` to `"Press Space to play Breakout"`, and commit on the branch:

```powershell
git commit -am "Friendlier title text"
```

`-a` stages every change to files Git already tracks before committing, so a change to an existing file doesn't need a separate `git add`. (New files still do, which is why the series has used `git add .` until now.)

```check
git-branch title-text -- Run git switch -c title-text.
git-message "Friendlier title text"
```

## Meanwhile, on main

**Build:** a different change to the same line, on `main`.

Switch back, and you'll see `draw.py` as it was: the branch's change lives only on the branch. `git switch main` rewrites every tracked file in the folder to match the commit `main` points at, so the editor shows `main`'s version of `draw.py`. (Git refuses to switch if that would overwrite changes you haven't committed.)

```powershell
git switch main
```

Now someone decides, on `main`, that the title should shout the game's name. Change the same title message to `"BREAKOUT - press Space"`, and commit:

```powershell
git commit -am "Shout the game name on the title"
git log --oneline --graph --all
```

```text
* c7b0416 Shout the game name on the title
| * 6e1f14b Friendlier title text
|/
* 6a93d9c Test the state machine
```

(Your hashes will be different: a commit's hash is worked out from its contents, its author and the time it was made, so the same commit made on another computer, or a minute later, gets a different one.)

**Understand.** `--graph` draws the history as lines, and `--all` includes every branch. The two commits share a parent, `Test the state machine`, and then **diverge**: each line has a commit the other doesn't. No fast-forward is possible now: neither branch is simply ahead of the other.

```check
git-branch main
git-message "Shout the game name on the title"
```

## Merge, and a conflict

**Build:** try to merge the branch into `main`.

```predict
question: Both branches changed the same line of `draw.py`, differently. What will `git merge title-text` do?
choice: Fast-forward, as in lesson 4.6
choice: Merge automatically, keeping the newer change
choice: Stop, and ask you to decide
answer: Stop, and ask you to decide
explain: A fast-forward is only possible when `main` hasn't moved since the branch began, and here it has. Git doesn't judge which change is better, or newer: when both sides changed the same lines differently, it can't know what you meant, so it stops with a **conflict** and writes both versions into the file for you to decide. The explanation below shows exactly when it can merge on its own.
```

```powershell
git merge title-text
```

```text
Auto-merging breakout/draw.py
CONFLICT (content): Merge conflict in breakout/draw.py
Automatic merge failed; fix conflicts and then commit the result.
```

`git status --short` (lesson 1.2) shows one line per file, with two letters for its state. During a merge, the letters change meaning: they describe the two sides, and `U` means **unmerged**.

```powershell
git status --short
```

```text
UU breakout/draw.py
```

Open `breakout/draw.py`:

```text
<<<<<<< HEAD
    GameState.TITLE: "BREAKOUT - press Space",
=======
    GameState.TITLE: "Press Space to play Breakout",
>>>>>>> title-text
```

**Understand: how Git merges.** This is a **three-way merge**: it compares **three** versions of each file:

1. the **merge base**, the last commit both branches share (`Test the state machine`);
2. `main`'s latest version (`HEAD`, since you're on `main`);
3. `title-text`'s latest version.

For each part of the file, if only one side changed it compared with the base, Git takes that side's change: that's what *Auto-merging* means, and it handles most of a typical merge silently. For example, if one branch had changed the title line and the other the game-over line:

```text
line        base                main                title-text          merged result
title       "Breakout: press.."  "Breakout: press.."  "Press Space to.."   "Press Space to.."   only the branch changed it
game over   "Game over: ..."    "GAME OVER: ..."    "Game over: ..."    "GAME OVER: ..."    only main changed it
```

Both changes are kept, with no questions asked. If **both** sides changed the same lines, differently, Git can't know which you want, so it stops and writes both into the file between **conflict markers**:

- `<<<<<<< HEAD` to `=======` is your side (`main`'s version);
- `=======` to `>>>>>>> title-text` is the other side (the branch's version).

You'll hear the two sides called **ours** (the branch you're on, `HEAD`: VS Code's *Current Change*) and **theirs** (the branch being merged in: *Incoming Change*). `git checkout --ours FILE` or `--theirs FILE` takes one side's whole file, when that's what you want.

`UU` in `git status` means "unmerged, changed on both sides". The merge is **in progress**: Git is waiting for you to decide, and nothing is committed yet. `git merge --abort` puts everything back as it was before the merge. Try it now, so a half-done merge never frightens you: run `git merge --abort`, then `git status --short` (nothing: back to normal), then `git merge title-text` again, to come back to the conflict.

Notice that the game can't even run in this state: a file full of `<<<<<<<` lines isn't valid Python. A conflict always needs resolving before anything else.

```check
contains breakout/draw.py "<<<<<<< HEAD" label="draw.py has a merge conflict, waiting for you (for now)" -- This step is meant to stop in a conflict: git merge title-text, from main.
```

## Your turn: resolve it

**Build, on your own:** decide what the title should say, finish the merge, and clean up.

Resolving a conflict is a **decision**, not a mechanical choice between the two sides. The commit messages say what each side wanted: one wanted the text friendlier ("press Space to play"), the other wanted the name to stand out ("BREAKOUT"). A good resolution often keeps the intent of both. Here:

1. Replace the five conflict lines with the single line you decide on, for example `GameState.TITLE: "BREAKOUT: press Space to play",`. Delete all three marker lines.
2. Check that no conflict is left anywhere, in any file: `git diff --check` reports any leftover conflict markers, and `git status` says `All conflicts fixed but you are still merging` once every file is staged. In a merge touching many files, that check is what stops a stray `<<<<<<<` reaching a commit. Then check that everything still works: tests, pyright, ruff, and run the game to see the title.
3. Tell Git the conflict is resolved by staging the file, then commit the merge, and delete the merged branch:

```powershell
git add breakout/draw.py
git commit -m "Merge title-text: keep the shout, and say what Space does"
git branch -d title-text
git log --oneline --graph
```

```hints
nudge: The file must end up as valid Python with exactly one `GameState.TITLE:` line. What should that line say, given what each side was trying to do?
concept: Everything between `<<<<<<< HEAD` and `>>>>>>> title-text` (inclusive) is replaced by your chosen line. `git add` on a conflicted file is how you tell Git "I've resolved this one"; `git status` then shows it as ready to commit. The commit that finishes a merge is a **merge commit**.
shape: Five lines become one. Then tests, `git add breakout/draw.py`, `git commit -m "..."`, `git branch -d title-text`.
answer: The resolved lines in `breakout/draw.py`:

~~~python
MESSAGES = {
    GameState.TITLE: "BREAKOUT: press Space to play",
    GameState.PAUSED: "Paused: press P to go on",
    ...
~~~

and the graph afterwards:

~~~text
*   84f206d Merge title-text: keep the shout, and say what Space does
|\
| * 6e1f14b Friendlier title text
* | c7b0416 Shout the game name on the title
|/
* 6a93d9c Test the state machine
~~~

A merge commit is a commit with **two parents**. `git cat-file -p HEAD` (lesson 1.2) shows it: two `parent` lines, one for each line of work it joins. Deleting `title-text` removes only the name: its commit is reachable from the merge commit, so it stays in the history.
```

```check
lacks breakout/draw.py "<<<<<<<" -- Remove all three conflict-marker lines, keeping one title line.
lacks breakout/draw.py ">>>>>>>"
run ".venv/Scripts/python -m pytest -q" stdout="63 passed"
run ".venv/Scripts/python -m ruff check ." stdout="All checks passed!"
git-message "Merge title-text" -- Stage the resolved file with git add, then git commit -m "Merge title-text: ..." to finish the merge.
git-no-branch title-text -- Delete the merged branch: git branch -d title-text.
git-clean
```

## Challenge: clean merges and conflicts, on purpose

**Optional, ★.** In a throwaway repository like lesson 4.6's, make two branches that change **different** lines of one file, and merge them: a clean three-way merge, with a merge commit. Then two branches that change the **same** line: a conflict. Then one where one branch deletes a line and the other edits it. Resolve each, and run `git merge --abort` once on purpose.

## Challenge: a merge that's clean but wrong

**Optional, ★★.** On two branches, change `PADDLE_SPEED` to different values, and on each add a test pinning its own value. Merge them: the conflict in `model.py` is easy, but then the tests disagree with the code. Resolve it so the code and the tests agree. A merge with no conflict markers left can still be wrong, which is why you run the tests after every merge.

## Challenge: a commit with two parents

**Optional, ★★.** After your merge, use `git log --oneline --graph`, `git cat-file -p HEAD` and `git show HEAD^2` to explain in one sentence each what `HEAD^1` and `HEAD^2` are.

## What did we actually learn? (Chapter 4)

This chapter turned a 290-line script into a project:

- **A package of modules**, each with one job, depending on each other in one direction only, with an **architecture test** to keep it that way. Circular imports are a sign of misplaced code.
- **`pyproject.toml`**: what the project is, what it needs, its commands, and every tool's settings, in one file. An **editable install** and an **entry point** make `breakout` a command.
- **`argparse`**, and **validating input where it enters**.
- **Strict types** for the whole project, tests included.
- **What to test**: behaviour, through the public interface; your code, not libraries; at the boundaries.
- **A state machine**: one current state, defined transitions, events from outside.
- **Branches**: a line of work kept apart until it's finished; **fast-forward** and **three-way** merges; **conflicts** as decisions.

Look at the technical-debt list from lesson 1.6 again. Almost everything is gone: duplication, magic numbers, global state, hidden coupling, untestable code, hand-checked arguments. What remains is the test-run machinery still woven through `app.py`, with `main`'s loop still four levels deep, and one big idea that this chapter only started: levels and settings are still **code**. Change the wall's layout and you edit Python. **Chapter 5** moves the levels into data files the game reads, which brings files, formats, validation with **pydantic**, and the question every program reading files must answer: *what if the file is wrong?*

**Chapter 4's challenges**, to come back to (on branches): the replay inside the package ★, a package inside a package ★★, a version number ★★ (4.1); a circle of three ★, the rule as data ★★, imports without running anything ★★★ (4.2); --version ★, a function that makes validators ★★, a real wheel ★★ (4.3); constants that stay constant ★, rules beyond strict ★★, three ways to handle None ★★ (4.4); the paddle's edges ★, a mutation tool ★★, review your own tests ★★ (4.5); a READY state ★, transitions as data ★★, the rule that escaped the model ★★ (4.6); clean merges and conflicts ★, a merge that's clean but wrong ★★, a commit with two parents ★★ (this lesson).

Every Git workflow in every language uses exactly this: short branches per change, merged into `main`, conflicts resolved by deciding what both sides meant. On a team, the merge usually happens through a **pull request** (Chapter 16), where someone else reads the branch's changes before they're merged.
