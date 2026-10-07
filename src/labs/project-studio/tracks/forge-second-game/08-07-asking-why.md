---
reference: optional
title: 8.7 — Asking Why
runtime: python
run: shooter/__main__.py
---

The chapter has collected symptoms: a fix made twice, a fix made once that needed making twice, a number that reached fifteen tests, a shortcut that would have shared a dictionary between two games, a teammate's module that reached for everything. Treating symptoms one at a time is how a project ends up as a ball of mud. This lesson does what lesson 0.3's debugging method does for a single bug, for the whole design: it stops fixing and asks **why**. You'll measure how much of the shooter is still Breakout, sort every piece of both games into "this game" and "any game", review the backlog, and write down the list that Chapter 9 turns into an engine.

## The coupling tool so far

**Build:** make sure `coupling.py` matches the end of lesson 8.6, the reference answer to its Your turn.

```python file=coupling.py
"""Who imports whom: a package's import graph, read from its code without running it.

usage: python coupling.py PACKAGE...
"""

import ast
import sys
from pathlib import Path

type Graph = dict[str, set[str]]


def imports_in(source: str) -> set[str]:
    """Every name a piece of code imports that could be a module.

    from breakout import draw could be importing the module breakout.draw, or a name defined in breakout:
    only the files can say which, so both are returned, and import_graph keeps the ones that are modules.
    """
    found: set[str] = set()
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module is not None:
            found.add(node.module)
            found.update(f"{node.module}.{alias.name}" for alias in node.names)
    return found


def module_name(path: Path) -> str:
    """breakout/model.py is breakout.model; a package's own breakout/__init__.py is breakout."""
    if path.name == "__init__.py":
        return path.parent.name
    return f"{path.parent.name}.{path.stem}"


def import_graph(packages: list[Path]) -> Graph:
    """Each module in the packages, and the modules from the same packages it imports."""
    files = {module_name(path): path for package in packages for path in sorted(package.glob("*.py"))}
    graph: Graph = {}
    for name, path in files.items():
        graph[name] = imports_in(path.read_text(encoding="utf-8")) & files.keys()
    return graph


def imported_by(graph: Graph) -> Graph:
    """The same graph, turned around: each module, and the modules that import it."""
    reverse: Graph = {name: set() for name in graph}
    for name, imports in graph.items():
        for module in imports:
            reverse.setdefault(module, set()).add(name)
    return reverse


def main(args: list[str]) -> None:
    graph = import_graph([Path(arg) for arg in args])
    users = imported_by(graph)
    for name in sorted(graph):
        print(f"{name:<20} imports {len(graph[name])}, imported by {len(users[name])}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

```check
run ".venv/Scripts/python -m pytest -q" stdout="176 passed"
run ".venv/Scripts/python coupling.py breakout" stdout="imports 0, imported by 3"
```

## How alike are the copies?

**Build:** nothing in the project. Measure how much of each shooter module is still Breakout's.

Python's standard library can compare texts: **`difflib`**, the same idea `git diff` is built on. `SequenceMatcher(None, a, b)` takes two sequences (here, two lists of lines) and finds the longest runs they share; `get_matching_blocks()` lists those runs, each with a `size`, the number of lines in it. Make `scratch/alike.py`:

```python
"""How much of each shooter module is still Breakout's, line for line."""

import difflib
from pathlib import Path

for shooter_file in sorted(Path("shooter").glob("*.py")):
    breakout_file = Path("breakout") / shooter_file.name
    if not breakout_file.exists():
        continue
    ours = shooter_file.read_text(encoding="utf-8").replace("shooter", "breakout").splitlines()
    theirs = breakout_file.read_text(encoding="utf-8").splitlines()
    matcher = difflib.SequenceMatcher(None, ours, theirs)
    same = sum(block.size for block in matcher.get_matching_blocks())
    print(f"{shooter_file.name:<12} {same:>4} of {len(ours):>4} lines the same as Breakout's")
```

Each shooter file's text has `shooter` replaced with `breakout` before comparing, so an import that differs only in the package's name counts as the same line: the question is what's the same **apart from** the name.

```predict
question: Which shooter module is most like its Breakout original, line for line?
choice: model.py
choice: app.py
choice: scores.py
choice: draw.py
answer: scores.py
explain: Every one of its 157 lines. Nothing about scores was ever Breakout's, so nothing needed changing: lesson 8.1's prediction, measured. It's the clearest case of code that belongs to neither game.
```

```powershell
.venv\Scripts\python scratch\alike.py
```

```text
__init__.py     0 of    1 lines the same as Breakout's
__main__.py     3 of    3 lines the same as Breakout's
app.py        103 of  135 lines the same as Breakout's
config.py      81 of   83 lines the same as Breakout's
draw.py        21 of   34 lines the same as Breakout's
model.py       57 of  187 lines the same as Breakout's
scores.py     157 of  157 lines the same as Breakout's
settings.py    74 of   75 lines the same as Breakout's
```

Add them up: 496 of the shooter's 675 lines, about three in four, are still Breakout's lines. Four of the eight modules are copies with a word or two changed. Even `model.py`, rewritten over three lessons, shares 57 lines with Breakout's: the imports, `clamp`, the four game states, `start`, `toggle_pause`, and the outline of `Game`. Each of those lines now has two owners, and the comparison only works while they're still identical: the day someone edits one copy, it turns into one of `model.py`'s 130 "different" lines, and nothing will say they used to be the same.

## A game, or any game?

**Build:** nothing in the project. Sort every piece of both games by what it's about.

Lesson 8.1 asked "what in the copy is really Breakout?" one module at a time, and found most modules were a mixture. Ask it now one **piece** at a time, across both games:

| Piece | In | About |
|---|---|---|
| the loop: events, update, draw, flip, tick | both `app.py` | any game |
| frame timing: `dt`, a test run's fixed frames, `--lag-at` | both `app.py` | any game |
| a test run: `--test-run`, `--seed`, the summary line | `settings.py`, `app.py` | any game (what the summary prints is each game's) |
| keys a player chooses, checked, in a settings file | `config.py` | any game (which **actions** exist is each game's) |
| players, sessions and scores in SQLite, with migrations | `scores.py` | any game |
| the game states: title, playing, paused, over | `model.py` | any game (`WON` is Breakout's) |
| `clamp`, `toward`, `touching`, `direction_from` | `model.py` | any game: geometry |
| something with a position and a velocity, moved by `dt` | `Ball`, `Bullet`, `Zombie` | any game |
| things created and removed while running | bricks, bullets, zombies | any game |
| timers counted down by `dt` | cooldown, spawner, safety | any game |
| a status line and a centred message | both `draw.py` | any game (the words are each game's) |
| bounces, bricks, walls of levels | `breakout` | Breakout |
| chasing, shooting, biting, the arena | `shooter` | the shooter |

```predict
question: Look down the last column. What do the "any game" pieces have in common?
choice: They're all short
choice: They're machinery: how a game runs, gets input, keeps time and keeps data, not what happens in it
choice: They're the parts with tests
answer: They're machinery: how a game runs, gets input, keeps time and keeps data, not what happens in it
explain: The loop, timing, input, settings, saving, states, geometry, things that move and come and go, timers: none of them says what the game **is**. The rules (bricks break, zombies chase) and the content (walls, the arena) are what make each game itself. That's exactly the line Godot draws: the engine runs the loop, reads input, keeps time and moves things; a game is scenes and scripts built on it.
```

Now look at **where** the pieces are. Every module holds both kinds. `model.py` has the game states (any game) next to the ball (Breakout). `app.py` has the loop (any game) wrapped around loading Breakout's levels. `config.py` has the key table and its checking (any game) together with Breakout's four actions. That's the root cause of the whole chapter:

**The machinery any game needs and the rules of one game were written in the same files.** A copy can only copy files, so the machinery travelled to the shooter inside Breakout's files, and from that moment it had two owners. Lesson 8.5's borrowing didn't help, because borrowing a Breakout file means borrowing Breakout's rules and global state along with the machinery.

Programmers call this a missing **separation of concerns**: one module, two jobs that change for different reasons. The usual phrase is Robert C. Martin's: a module should have **one reason to change**. `model.py` changes when Breakout's rules change, and also whenever the way any game keeps its states changes. Code with two reasons to change, in two copies, changes four ways.

## The fix, in one sentence

**Build:** nothing. Say what the fix has to be, before Chapter 9 builds it.

From the sorting, the shape of the fix follows almost by itself:

1. **The machinery moves into a package of its own**, which knows nothing about any particular game: no bricks, no zombies, no `Breakout` in any name. Call it what Godot is to its games: an **engine**.
2. **Both games import the engine; the engine imports neither game.** Dependencies point one way, from the specific to the general, so a change to a game can never break the engine, and the engine can be tested with no game at all. Lesson 4.2's architecture test, `test_the_model_depends_on_nothing_else_in_the_game`, is the same rule inside one game; `coupling.py` can check it across packages.
3. **The engine is given what it needs**, never reaches for it, as lesson 8.6's review asked of the HUD: no module-level state shared by accident, no reading the command line from deep inside.

Each lesson of this chapter ran into one of these. The copies drifted (8.5) because there was no point 1. Borrowing would have shared state (8.5) because Breakout's files break point 3. The HUD reached for `app` (8.6) against point 2. Chapter 9 is where it's done: an `engine` package, both games rebuilt on it, the direction of every import checked by a test, and **Protocols**, Python's way to write the promise a game makes to the engine.

## The backlog, reviewed

**Build:** `BACKLOG.md` says what this chapter built, and what it cost.

Your retrospective for 0.1.0 (lesson 7.8) probably said something like "review the backlog at the end of every chapter". This is the end of a chapter. Two things changed that the backlog doesn't know about: a whole second game, built without a story, and the debt that came with it.

Under `# Done`, before the first story there, add the shooter:

```markdown
### An arena shooter (unreleased)
As a player, I want a second game where I fight off zombies, so that Forge has more than one game.
- [x] Eight-way movement at one speed, aiming at the mouse, firing with the left button at most every 0.15 s.
- [x] Zombies walk in from the edges and chase the player; a bullet stops one for 10 points; a bite costs a life, with a moment of safety.
- [x] Scores are kept in the shooter's own folder.
```

Under `# Technical debt`, before the first line there, add what lessons 8.1 to 8.6 found:

```markdown
- `breakout` and `shooter` are copies: `settings.py`, `config.py`, `scores.py` and most of `app.py` exist twice, and every fix is made twice (lessons 8.1 and 8.5).
- The shooter accepts `--level` and ignores it, and `--hold auto` means something different in each game (lesson 8.2).
- The project is called `breakout` but installs two games (lesson 8.1).
- The fixtures in `tests/conftest.py` are all Breakout's; the shooter's tests make their own games and databases (lesson 8.5).
```

The second line is worth checking for yourself: `.venv\Scripts\shooter --test-run 5 --level nowhere.json` plays, silently, with no complaint that the file doesn't exist. The copied option outlived the code that used it, and nothing told the player.

```check
contains BACKLOG.md "### An arena shooter (unreleased)"
contains BACKLOG.md "every fix is made twice"
contains BACKLOG.md "accepts `--level` and ignores it"
```

## Your turn: any game, or one game

**Build, on your own:** `docs/any-game.md`, the list Chapter 9 starts from.

Write down, in your own words, what belongs to any game and what belongs to each game, from the table above and from your own reading of the code. It's a design document: short, specific, and written for the person who'll build the engine, which is you, next chapter.

| File | Holds |
|---|---|
| `docs/any-game.md` | three sections, headed `## Any game`, `## Only Breakout` and `## Only the shooter`, each with at least three points, one per line, starting `- ` |

Be specific. "Input" is too vague to build; "keys a player can choose in a settings file, checked, with a clear message for a key that's wrong or used twice" is a piece someone can make. Where a piece is a mixture, like the summary of a test run, say which part is which.

When the checks are clean, commit everything, the backlog and the document, with a message that mentions **any game**.

```hints
nudge: Go down the table in "A game, or any game?" and rewrite each row as a point under one of the three headings. Then open each module of both games and look for anything the table missed.
concept: The test for each piece is: if a third game, say Pong, were made tomorrow, would it need this exactly as it is? The loop, yes. Saving scores, yes. Bricks, no. The game states, yes, all except `WON`, which Pong doesn't have but a puzzle game would: so "states" are any game's, and **which** states a game has is the game's own. That last kind of answer, "the mechanism is shared, the details are each game's", is the most useful thing the document can say, because it's where the engine will need a way for a game to tell it its details.
shape: A title, a sentence saying what the document is for, then the three `##` sections with five to ten points each under "Any game", and three to six under each game.
answer: Yours will differ, and should. An example:

~~~markdown
# Any game, or one game?

What every Forge game needs, and what belongs to one game, from the two copies (lesson 8.7). Chapter 9 builds the first section as an engine.

## Any game

- The loop: events, update, draw, flip, and frame timing with dt; a slow frame never breaks it.
- A test run: a fixed number of frames of 1/60 s, a seed, no window, and a summary line; what the summary says is each game's.
- Keys a player chooses in a settings file, checked, with clear messages; which actions exist is each game's.
- Players, sessions and scores, kept in SQLite with migrations, in a folder named after the game.
- Game states: title, playing, paused and over, with the keys to move between them; extra states are each game's.
- Geometry: clamp, normalised directions, the direction from one point to another, circles touching.
- Things with a position and a velocity, created and removed while the game runs, safely.
- Timers counted down by dt: periodic (keeps the leftover) and cooldowns (throws it away).
- A status line and a centred message.

## Only Breakout

- The ball, its serve and its bounces.
- The paddle and the autopilot that steers it.
- Bricks, tough bricks, and walls of them loaded from level files.
- Winning by clearing the wall.

## Only the shooter

- Eight-way movement and aiming at the mouse.
- Bullets and the gun's cooldown.
- Zombies: where they appear, how they chase, and biting.
- The autopilot that aims at the nearest zombie.
~~~
```

```check
contains docs/any-game.md "## Any game"
contains docs/any-game.md "## Only Breakout"
contains docs/any-game.md "## Only the shooter"
run ".venv/Scripts/python -c \"import re, pathlib; text = pathlib.Path('docs/any-game.md').read_text(encoding='utf-8'); sections = re.split('^## ', text, flags=re.M)[1:]; print('three or more in every section:', min(sum(line.startswith('- ') for line in s.splitlines()) for s in sections) >= 3)\"" stdout="three or more in every section: True" label="each section has at least three points" -- Each of the three sections needs at least three points, one per line, starting with "- ".
run ".venv/Scripts/python -m pytest -q" stdout="176 passed"
git-message "any game"
git-clean
```

## Challenge: a third game, priced

**Optional, ★.** Without writing it, estimate what a third game made by copying would cost: Pong, say. Which modules would you copy, how many lines would arrive as copies (use `scratch/alike.py`'s numbers), and which of this chapter's two bug fixes would you have to remember to carry across? Write the estimate in `scratch/pong-estimate.md`. Keep it: compare it with Chapter 9's real numbers.

## Challenge: the engine's first draft, on paper

**Optional, ★★.** For each point under "Any game", write the function or class signature the engine would offer, with types, and nothing inside: `def run(game: ???, settings: Settings) -> None`. Each time you write `???`, you've found a place where the engine needs to know something about a game without knowing which game. Count them. That count is what Chapter 9's Protocols are for.

## Challenge: Godot's names for your list

**Optional, ★★.** Open Godot's documentation for `SceneTree`, `Node`, `Input`, `InputMap`, `Timer` and `ConfigFile`, and match each to points in your "Any game" list. Which of your points does Godot have no class for, and why might that be? (Think about who saves scores, and where.)

## What did we actually learn?

- **Measure before you redesign**: `difflib` turned "the copies are mostly the same" into 496 lines of 675.
- **Sort by what code is about**, not where it is: machinery any game needs, rules and content one game needs.
- **Separation of concerns** and **one reason to change**: when two concerns share a file, copying the file copies both, and changes come from two directions.
- **Dependencies should point from the specific to the general**: games import an engine; an engine imports no game.
- **Ask why before fixing**: five symptoms in this chapter, one cause.

## Chapter 8, zoomed out: the cost of a copy

The chapter made a second game the quickest way there is, and it worked: a playable shooter in four lessons, with movement in two dimensions, aiming, bullets that come and go, zombies that chase, and an autopilot. Along the way it taught the mathematics games run on: vectors and their length, normalising, `atan2` and rotation, circles touching, timers that keep or drop their leftover time, and the list-changed-while-looping bug every engine has to design around.

Then it paid for the shortcut, and paid attention to the bill:

- **Copies drift.** A fix reaches one copy and not the other, a type that looks shared is two types, and the copies quietly become different programs (8.5).
- **Small changes travel.** One number reached fifteen tests and two places no test checks (8.5): **change amplification**.
- **Sharing mutable state is worse than copying.** A module imported by two games makes their coupling invisible (8.5).
- **Coupling can be measured.** An import graph read with `ast`, fan-out and fan-in, and a review that names what a module reaches for (8.6).
- **The cause was a missing boundary**: machinery and rules in the same files (8.7).

None of this is about games. Every team that has copied a service to start a new one, forked a library to add a feature, or pasted a helper function into a second project has met every item on that list, and **the same cure applies**: find what's general, give it a home of its own with its own tests, and make the specific code depend on it, never the other way round. In a web company it's called a shared library or a platform; in an operating system, a kernel; here, an engine.

**Chapter 8's challenges**, to come back to (on branches): imports that travel ★, two games one database ★★, a copying script ★★ (8.1); a crosshair ★, aiming with the keyboard ★★, speeding up and slowing down ★★ (8.2); a pool of bullets ★, bullets that run out ★★, a dictionary changed during the loop ★★ (8.3); waves ★, zombies that keep apart ★★, the autopilot dodges ★★ (8.4); the order-dependent test ★, what every file has in common ★★, the window everywhere ★★ (8.5); instability ★, a picture of the graph ★★, find the cycles ★★★ (8.6); a third game priced ★, the engine's first draft on paper ★★, Godot's names for your list ★★ (this lesson).

Chapter 9 draws the boundary. It begins with the list you just wrote.
