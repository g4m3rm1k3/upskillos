---
title: "Coupling and Cohesion: Measuring a God File"
runtime: none
---

Blockfall's `Game` class is the heart of the game. It holds the board, the falling piece, the hold slot, the undo history and the score, and its own methods are the only way any of them change. Blockfall has 33 tests. Not one of them makes a `Game`. Every rule `Game` relies on is tested, in `rules.js`, `save.js` and `states.js`, but the object that puts them together has been tried only by playing.

That isn't an oversight anyone made on purpose. `Game` lives in `game.js`, and `game.js` also draws on the canvas, reads the keyboard, runs a timer and reads the browser's storage, the moment it loads. A test page can't have one without the rest. This lesson measures that: how big each file is, which files depend on which, and how many different jobs one file does. Two words name what you'll measure. **Coupling** is how much one part must know about another to work. **Cohesion** is how much the things inside one part belong together. Then you'll move `Game` into a file that never touches the page, and prove it by testing `Game` on a page with no board to draw on.

The examples are in JavaScript, because the problem is easiest to see where nothing enforces a boundary. Blockfall's classic scripts share one global scope, so every file can use every other file's names without saying so.

## A class nobody can test

From the course folder, go into Blockfall and check that everything is committed:

```
cd blockfall
git status
```

It should say `nothing to commit, working tree clean`. Now try the obvious way to test `Game`: load `game.js` on the tests page. Open `tests.html` in your editor and add one line after the line that loads `states.js`, so the scripts read:

```
  <script src="rules.js"></script>
  <script src="save.js"></script>
  <script src="states.js"></script>
  <script src="game.js"></script>
  <script src="contracts.js"></script>
  <script src="tests.js"></script>
```

Save it, and open the tests page (`start tests.html` on Windows, `open tests.html` on macOS, `xdg-open tests.html` on Linux), or reload it if it's open. Open the developer console (F12).

```predict
question: The tests page has no canvas. What does it show now?
choice: Nothing: the page fails to load
choice: The tests run, with some failing
choice: 33 passed, 0 failed, and an error in the console
answer: 33 passed, 0 failed, and an error in the console
explain: A classic script that throws stops only itself. The other scripts load and the tests run. game.js gets as far as line 210, asks the missing canvas for its drawing context, and dies there.
```

The page still says `33 passed, 0 failed`. The console has a red error:

```
Uncaught TypeError: Cannot read properties of null (reading 'getContext')
```

It points at `game.js` line 210, `const context = canvas.getContext("2d");`. The tests page has no element with the id `board`, so `canvas` is `null`. Read the evidence further. Ask the console:

```
typeof Game
game
```

`typeof Game` is `'function'`, and `game` is a `Game`. Before it died, `game.js` ran its first 209 lines. Line 183 called `startingGame()`, which read the browser's storage looking for a saved game. Compare the storage on both pages. In the tests page's console:

```
localStorage.getItem("blockfall.best")
```

Then open `index.html`, open its console, and ask the same. Both answers are the same: your best score, or `null` on both if you've never cleared a row. In Chrome and Edge, where this was tested, every page opened from disk shares one storage. So the test page read the player's real data, and a test that called `saveBest` would overwrite the player's record.

That's the diagnosis. The logic isn't hard to test. It's tied, by sitting in the same file, to a canvas, a timer and storage, and loading one means loading all of them. Take the line back out of `tests.html`, save it, and reload the tests page. It shows `33 passed, 0 failed` and the console is clear.

```check
lacks blockfall/tests.html "game.js" -- Take game.js back out of tests.html.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [33,0] errors=none -- The tests page should load cleanly, with all 33 tests passing.
```

## Measuring size and hidden imports

How bad is it? Measure, before you change anything. A Python script can count what matters: each file's length, the names it declares at the top level, and its longest function or class. It can also find the **import graph**, which files use which. With classic scripts that graph is written down nowhere. A file uses another file's names with no `import` line, so the only way to find the dependencies is to look for the names.

This is a tool, so it belongs in Kit. Create `kit/jsdeps.py`:

```python file=kit/jsdeps.py
"""Measure a folder of classic scripts: their sizes, and who uses whose names.

Classic scripts share one global scope. A name declared at the top level of
one file can be used by every file loaded after it, with no import line, so
the dependencies between the files are written down nowhere. This finds
them, roughly: a file uses another when it mentions a name the other
declares. Comments are skipped; a name in a string or a local variable with
the same spelling still counts, so read what it reports before you trust it.
"""

import pathlib
import re
import sys

# A top-level declaration: class, function, const or let at the start of a line.
DECLARATION = re.compile(r"^(?:class|function|const|let)\s+([A-Za-z_$][\w$]*)", re.MULTILINE)
WORD = re.compile(r"[A-Za-z_$][\w$]*")


def code_of(text):
    """The text without its // comments."""
    return re.sub(r"//.*", "", text)


def blocks(lines):
    """Each top-level function or class, with its length in lines: from its
    first line to the line where its braces balance again."""
    sizes = {}
    name = None
    for number, line in enumerate(lines):
        found = re.match(r"(?:class|function)\s+([A-Za-z_$][\w$]*)", line)
        if found and name is None:
            name, start, depth = found.group(1), number, 0
        if name is not None:
            depth += line.count("{") - line.count("}")
            if depth == 0 and "{" in "".join(lines[start:number + 1]):
                sizes[name] = number - start + 1
                name = None
    return sizes


def main(folder):
    files = sorted(pathlib.Path(folder).glob("*.js"))
    texts = {path.name: code_of(path.read_text(encoding="utf-8")) for path in files}
    declares = {name: DECLARATION.findall(text) for name, text in texts.items()}

    print(f"{'file':<14}{'lines':>6}{'names':>7}  longest block")
    for path in files:
        lines = path.read_text(encoding="utf-8").splitlines()
        sizes = blocks(lines)
        longest = max(sizes, key=sizes.get) if sizes else None
        shown = f"{longest} ({sizes[longest]} lines)" if longest else "-"
        print(f"{path.name:<14}{len(lines):>6}{len(declares[path.name]):>7}  {shown}")

    print()
    used = set()
    for name, text in texts.items():
        words = set(WORD.findall(text))
        for other, names in declares.items():
            if other != name:
                uses = sorted(n for n in names if n in words)
                used.update(uses)
                if uses:
                    print(f"{name} uses {other}: {', '.join(uses)}")

    print()
    for name, names in declares.items():
        unused = [n for n in names if n not in used]
        if unused:
            print(f"used by no other file, from {name}: {', '.join(unused)}")
        # Mentioned once in its own file, at its declaration, and nowhere else.
        nowhere = [n for n in unused if WORD.findall(texts[name]).count(n) == 1]
        if nowhere:
            print(f"  used nowhere at all: {', '.join(nowhere)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: jsdeps.py FOLDER")
    main(sys.argv[1])
```

How it works:

- `DECLARATION` finds a top-level name: `class`, `function`, `const` or `let` at the very start of a line. Blockfall indents everything inside a function, so a line that starts with `const` is top level. `re.MULTILINE` makes `^` match at the start of every line, not just the first.
- `blocks` measures each top-level function or class by counting braces. It adds each line's `{`s and subtracts its `}`s, and the block ends where the count is back to zero. The second condition makes sure a block has opened at all, so a declaration whose `{` comes on a later line isn't ended early.
- `main` reads every `.js` file in the folder, strips the comments, and lists each file's declarations. Then, for each pair of files, it looks for the other file's names among this file's words.

Its docstring says what it gets wrong, and that's part of the tool. It matches spellings, not meanings. A local variable that happens to share a global's name counts as a use. Save it, go back to the course folder and into `kit`, and run it on Blockfall:

```
cd ../kit
.venv/Scripts/python jsdeps.py ../blockfall
```

(`.venv/bin/python` on macOS and Linux.) The table comes first:

```
file           lines  names  longest block
contracts.js      88      4  withContract (14 lines)
game.js          375     22  Game (152 lines)
rules.js         184     23  invariantProblems (24 lines)
save.js          101      7  checkedState (25 lines)
shapes.js          8      0  -
states.js         50      5  lockFacts (13 lines)
tests.js         210      2  refusal (8 lines)
```

`game.js` is the biggest file by far, and its longest block, `Game`, is 152 lines, six times the longest block anywhere else. (`shapes.js` is 01-06-05's module experiment. Its one name is `export const`, which this tool doesn't look for.) Then the graph:

```
contracts.js uses game.js: Game
contracts.js uses rules.js: COLS, FULL, ROWS, clearFullRows, countBits, dropped, invariantProblems, isFree, isLanded, lock, moved, scoreFor
game.js uses rules.js: COLS, ROWS, SIZE, canMove, clearFullRows, dropped, fallDistance, invariantProblems, isFree, isLanded, isRowFull, lock, moved, newBoard, newPiece, nextShape, rotated, scoreFor
game.js uses save.js: SaveError, decodeSave, encodeSave
game.js uses states.js: INITIAL_STATE, lockFacts, nextState
save.js uses game.js: game, state
save.js uses rules.js: COLS, FULL, ROWS, SHAPES, invariantProblems
states.js uses game.js: state
states.js uses rules.js: clearFullRows, isFree, isLanded, lock, newPiece, nextShape
tests.js uses contracts.js: CONTRACTS, ContractError, withContract
tests.js uses game.js: game, state
tests.js uses rules.js: FULL, clearFullRows, dropped, isFree, isRowFull, lock, moved, newBoard, newPiece, nextShape, rotated, scoreFor
tests.js uses save.js: SaveError, decodeSave, encodeSave
tests.js uses states.js: lockFacts, nextState
```

```predict
question: The graph says save.js uses game.js's game and state. Does save.js depend on game.js?
choice: Yes: save.js reads the global game and state
choice: No: those are save.js's own local names, spelled the same
answer: No: those are save.js's own local names, spelled the same
explain: encodeSave(state) takes a parameter called state, and game is a word inside one of save.js's error messages ("the saved game breaks the rules"). The tool can't tell a parameter or a word in a string from a global with the same spelling. The tests page loads save.js without game.js and its save tests pass, which a real dependency wouldn't allow. states.js's nextState(state, …) is the same false lead, and so is tests.js's.
```

Open `save.js` and search for `state` to confirm it. Measurement gives you leads, and you check each lead against the code. Cross out the three false edges and the real graph is plain. `rules.js` uses nothing. `save.js` and `states.js` use only `rules.js`. `game.js` uses 18 of `rules.js`'s 23 names, and everything else besides. And one edge points the other way, into `game.js`: `contracts.js` uses `Game`. The last part of the output lists the names no other file uses:

```
used by no other file, from contracts.js: filledSquares
used by no other file, from game.js: SAVE_KEY, loadProblem, startingGame, CLEAR_MS, BEST_KEY, loadBest, saveBest, best, canvas, context, drawSquare, draw, ACTIONS, MOVES, FALL_MS, startFalling, ONCE_PER_PRESS, eventFor, handle
used by no other file, from rules.js: parity, isBlocked
  used nowhere at all: parity
used by no other file, from save.js: SAVE_VERSION, rowText, rowNumber, checkedState
used by no other file, from states.js: STATES, TRANSITIONS
  used nowhere at all: STATES
used by no other file, from tests.js: refusal, caught
```

A name only its own file uses is fine, even good: it's a private helper, like `isBlocked`. A name used nowhere at all is dead. `parity` has been dead since 01-03-02, where it was written as an exercise. Commit the tool, in Kit:

```
git add jsdeps.py
git commit -m "Add jsdeps, which measures a folder of scripts and who uses whose names"
```

Kit's pre-commit hook (01-08-04) runs its checks and the linter first, and prints a `pass` line for each.

```check
run "cd kit; .venv/Scripts/python jsdeps.py ../blockfall" stdout="game.js          375     22  Game (152 lines)" -- jsdeps.py should measure game.js: 375 lines, 22 names, Game 152 lines long.
run "cd kit; .venv/Scripts/python jsdeps.py ../blockfall" stdout="contracts.js uses game.js: Game" -- jsdeps.py should find that contracts.js uses game.js's Game.
run "cd kit; .venv/Scripts/python jsdeps.py ../blockfall" stdout="used nowhere at all: parity" -- jsdeps.py should find that parity is used nowhere.
run "cd kit; git log -1 --format=%s" stdout="Add jsdeps" -- Commit jsdeps.py in Kit.
```

## How many reasons to change

Size alone doesn't make a file bad. A 375-line file that does one thing is fine. What matters is **cohesion**: do the things in it belong together? A practical test is to ask what would make each part change. Here are `game.js`'s 22 names, sorted by that:

| What would make it change | Names in `game.js` |
|---|---|
| The rules of play (holding, undo, scoring) | `Game` |
| How games and records are kept | `SAVE_KEY`, `loadProblem`, `startingGame`, `BEST_KEY`, `loadBest`, `saveBest`, `best` |
| How the board looks | `canvas`, `context`, `drawSquare`, `draw` |
| Which keys do what | `ACTIONS`, `MOVES`, `ONCE_PER_PRESS`, `eventFor` |
| How fast things happen | `CLEAR_MS`, `FALL_MS`, `startFalling` |
| How the parts are run together | `game`, `state`, `handle` |

Six reasons to change, in one file. A file like that is a **god file**: it knows about everything, so every feature touches it, and every change to it risks the other five jobs. The same thing in one class is a **god object**. `Game` isn't one. Its eight fields all describe one game, and every method works on them. If `Game` drew itself, saved itself and read the keyboard, it would be. The trouble here is the file, not the class.

**Coupling** is the other side. `game.js` uses 18 of `rules.js`'s names, and that's the right direction. The screen should depend on the rules. What hurts is coupling nobody can see. Search Blockfall for the expression that asks whether a square is filled. From `blockfall`, on Windows:

```
Select-String -Path *.js -Pattern "1 << "
```

On macOS or Linux: `grep -n "1 << " *.js`. Among the matches are `isFree` and `invariantProblems` in `rules.js`, `draw` in `game.js` and `rowText` in `save.js`. All four ask whether a square is filled the same way: they pick out one bit of a row with `& (1 << col)` and compare it with 0. `lock` in `rules.js` and `rowNumber` in `save.js` set bits the same way.

```predict
question: Suppose the board changed from one number per row to ten true-or-false values per row. Which files would have to change?
choice: Only rules.js, which owns the board
choice: rules.js and save.js
choice: rules.js, save.js and game.js
answer: rules.js, save.js and game.js
explain: All three know how a row is stored, because each tests the bits itself. None of them calls a shared function for it. That's coupling to a representation, spread out by duplication, and no import graph shows it, since each copy uses only the language. One place that answers "is this square filled?" would make it a one-file change. That's 03-02-02's subject, single source of truth.
```

The table also shows a quieter problem, in `rules.js`. `countBits` and `parity` are general bit tricks, not rules of Blockfall. They sit in `rules.js` because it was the nearest file when they were written. The usual next step is to move such things into a file called `utils.js` or `helpers.js`. That file then becomes a **dumping ground**. Its name gives no reason to say no, so anything that doesn't obviously belong elsewhere goes in. Everything ends up depending on it, and nobody can say what it's for. A helper is better kept next to the code that uses it. `countBits` serves `contracts.js`'s `filledSquares`, and `parity` serves nothing.

## Shared state, and an order nobody wrote down

`game.js` has four top-level `let`s: `loadProblem`, `game`, `state` and `best`. Each is **global state**, a variable that any script on the page can read and write. Find who uses them. `handle` writes `state`, `game` and `best`. `startingGame` writes `loadProblem`. `draw` reads all four. The timer in `startFalling` reads `state` and `game`. So do the key actions, every page check in this course, and you in the console.

That's **shared mutable state**. Every function that reads `state` depends on every function that writes it, and none of their parameter lists says so. To know whether `draw` shows the right message, you need to know every place `state` changes, in any file. Compare `Game`'s fields. `#board` and `#piece` are private, so only `Game`'s own code can touch them, and each method checks the rules afterwards. They change in exactly eight places, all inside the class: the constructor, `hold`, `move`, `drop`, `rotate`, `lockPiece`, `undo` and `fromSnapshot`. A bug in a `Game` field has eight places it could come from. A bug in `state` could come from anywhere.

Globals also couple *when* files load. `contracts.js` wraps functions by replacing them in `globalThis`, the global scope, and it wraps `Game`'s methods only `if (typeof Game !== "undefined")`. So it has to load after both `rules.js` and `game.js`. Nothing says so except the order of the `<script>` lines. Try breaking it. In `index.html`, move the `contracts.js` line above the `game.js` line, save, and reload the game. Play a little. Nothing looks different. Now ask the console:

```
Game.prototype.move.name
```

```predict
question: With contracts.js loaded before game.js, what does Game.prototype.move.name give?
choice: 'move'
choice: '' (an empty string)
choice: An error
answer: 'move'
explain: When contracts.js ran, Game didn't exist yet, so the if skipped the wrapping and Game's methods are the originals, named move. In the right order, move is the function withContract returns, which has no name. Nothing broke and no error appeared: the game's invariant just stopped being checked, silently.
```

Put the line back below `game.js`, save, reload, and ask again. It gives `''`, the wrapped method. A dependency that lives in load order fails silently. That's the most expensive way for anything to fail.

```check
page blockfall/index.html "Game.prototype.move.name === ''" true errors=none -- contracts.js should load after game.js again, so that Game's methods are checked.
```

## Game moves out

Now the change. `Game` goes into a file of its own, `play.js`, which uses only `rules.js`. It's the rules applied over time. `rules.js` stays as it is: pure functions and constants, with no state of their own. Create `blockfall/play.js`. Everything below its first four lines is `game.js`'s `Game` class, unchanged, so you can cut it from `game.js` and paste it here:

```js file=blockfall/play.js
// One game being played: its board, its falling piece, the hold slot, the
// undo history and the score. It follows rules.js, loaded first. Like
// rules.js, nothing here draws, reads keys, keeps time or saves, so the
// tests page can make a Game and try it.

// One game: its board, its falling piece and its undo history. Only the
// game's own methods can change them, and each one checks the rules after.
class Game {
  #board;
  #piece;
  #shape;
  #held;
  #canHold;
  #history;
  #cleared;
  #score;

  constructor() {
    this.#board = newBoard();
    this.#shape = "T";
    this.#piece = newPiece(this.#shape);
    this.#held = null;
    this.#canHold = true;
    this.#history = [];
    this.#cleared = 0;
    this.#score = 0;
  }

  // A copy of the board, so that nobody outside can change the real one.
  board() {
    return this.#board.slice();
  }

  // The falling piece's squares.
  piece() {
    return this.#piece;
  }

  // The falling piece's shape: "T" or "I".
  shape() {
    return this.#shape;
  }

  // The shape in the hold slot, or null when it's empty.
  held() {
    return this.#held;
  }

  // Put the falling piece in the hold slot, and bring in the held shape (or,
  // with the slot empty, the next shape in turn) new at the top. Once per
  // piece: after holding, c does nothing until the piece locks.
  hold() {
    if (this.#canHold) {
      const incoming = this.#held ?? nextShape(this.#shape);
      this.#held = this.#shape;
      this.#shape = incoming;
      this.#piece = newPiece(incoming);
      this.#canHold = false;
    }
    this.#check();
  }

  move(dRow, dCol) {
    if (canMove(this.#board, this.#piece, dRow, dCol)) {
      this.#piece = moved(this.#piece, dRow, dCol);
    }
    this.#check();
  }

  drop() {
    this.#piece = dropped(this.#board, this.#piece);
    this.#check();
  }

  // Turn the piece a quarter clockwise, if it fits where it would go.
  rotate() {
    const turned = rotated(this.#piece);
    if (turned.every((cell) => isFree(this.#board, cell.row, cell.col))) {
      this.#piece = turned;
    }
    this.#check();
  }

  // Lock a landed piece into the board and start a new one.
  lockPiece() {
    if (isLanded(this.#board, this.#piece)) {
      this.#history.push({ board: this.#board.slice(), piece: this.#piece, cleared: this.#cleared, score: this.#score });
      lock(this.#board, this.#piece);
      const result = clearFullRows(this.#board);
      this.#board = result.board;
      this.#cleared += result.cleared;
      this.#score += scoreFor(result.cleared);
      this.#shape = nextShape(this.#shape);
      this.#piece = newPiece(this.#shape);
      this.#canHold = true;
    }
    this.#check();
  }

  // How many pieces are locked in the board: one for each lock that undo
  // could take back.
  pieceCount() {
    return this.#history.length;
  }

  // How many full rows have been cleared since the game began.
  clearedCount() {
    return this.#cleared;
  }

  // The points scored since the game began (SCORING.md).
  score() {
    return this.#score;
  }

  // The game's state as plain values, to be saved. The undo history isn't
  // part of it: a resumed game starts with nothing to undo.
  snapshot() {
    return {
      board: this.#board.slice(),
      shape: this.#shape,
      piece: this.#piece,
      held: this.#held,
      cleared: this.#cleared,
    };
  }

  // A game that carries on from a saved state (decodeSave has checked it).
  // A static method belongs to the class, and can set a new game's fields.
  static fromSnapshot(state) {
    const resumed = new Game();
    resumed.#board = state.board.slice();
    resumed.#shape = state.shape;
    resumed.#piece = state.piece;
    resumed.#held = state.held;
    resumed.#cleared = state.cleared;
    resumed.#check();
    return resumed;
  }

  // Go back to before the last lock, if there was one.
  undo() {
    if (this.#history.length > 0) {
      const saved = this.#history.pop();
      this.#board = saved.board;
      this.#piece = saved.piece;
      this.#cleared = saved.cleared;
      this.#score = saved.score;
    }
    this.#check();
  }

  #check() {
    const problems = invariantProblems({ board: this.#board, piece: this.#piece });
    if (problems.length > 0) {
      console.error("Broken rules: " + problems.join("; "));
    }
  }
}
```

A move like this changes where code lives, not what it does, so copy it exactly. Resist improving `Game` on the way. A move mixed with an edit is hard to review, and if something breaks you won't know which of the two broke it. Save it. Don't reload the game yet. `index.html` doesn't load `play.js` yet, and if you've already cut `Game` from `game.js`, the game is broken until the next step.

```check
contains blockfall/play.js "class Game" -- Create play.js with the Game class.
lacks blockfall/play.js "document" -- play.js should never touch the page's document.
lacks blockfall/play.js "localStorage" -- play.js should never touch the browser's storage.
lacks blockfall/play.js "setInterval" -- play.js should never keep time.
```

## The page without the game logic

Now `game.js` keeps everything except `Game`. Replace `blockfall/game.js`. Its first three lines are new, and the rest is what was below `Game`:

```js file=blockfall/game.js
// The game on the screen: one Game (play.js), drawn on the canvas, driven by
// the keyboard and a timer, and saved in the browser. The rules it follows
// are in rules.js; both are loaded first.

// The saved game, kept in the browser between visits, as text in save.js's
// format.
const SAVE_KEY = "blockfall.save";
let loadProblem = null;

// Carry on from the saved game if there is one. If it can't be read, say why
// and start a new game, leaving the save where it is.
function startingGame() {
  const text = localStorage.getItem(SAVE_KEY);
  if (text === null) {
    return new Game();
  }
  try {
    return Game.fromSnapshot(decodeSave(text));
  } catch (error) {
    if (!(error instanceof SaveError)) {
      throw error;
    }
    loadProblem = error.message;
    console.warn("The saved game wasn't loaded: " + error.message);
    return new Game();
  }
}

let game = startingGame();

// The game's state (states.js), and how long the board shows cleared rows.
let state = INITIAL_STATE;
const CLEAR_MS = 300;

// The best number of rows cleared, kept in the browser's storage between
// visits, as JSON. The Game itself never touches storage.
const BEST_KEY = "blockfall.best";

// The saved best, or 0 when nothing is saved or what is saved is unreadable.
function loadBest() {
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY));
    return Number.isInteger(saved?.rows) ? saved.rows : 0;
  } catch {
    return 0;
  }
}

function saveBest(rows) {
  localStorage.setItem(BEST_KEY, JSON.stringify({ rows: rows, saved: new Date().toISOString().slice(0, 10) }));
}

let best = loadBest();

const canvas = document.getElementById("board");
const context = canvas.getContext("2d");

function drawSquare(row, col, color) {
  context.fillStyle = color;
  context.fillRect(col * SIZE, row * SIZE, SIZE - 1, SIZE - 1);
}

function draw() {
  const board = game.board();
  const piece = game.piece();
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#eee";
  context.fillText("Pieces: " + game.pieceCount(), 8, 16);
  context.fillText("Rows: " + game.clearedCount(), 8, 32);
  context.fillText("Held: " + (game.held() ?? "-"), 8, 48);
  context.fillText("Best: " + best, 8, 64);
  context.fillText("Score: " + game.score(), 8, 96);
  if (loadProblem !== null) {
    context.fillText("Save not loaded (see the console)", 8, 80);
  }
  for (let row = 0; row < ROWS; row++) {
    let shade = "#888";
    if (isRowFull(board, row)) {
      shade = "#eee";
    }
    for (let col = 0; col < COLS; col++) {
      if ((board[row] & (1 << col)) !== 0) {
        drawSquare(row, col, shade);
      }
    }
  }
  // The ghost: an outline of where the piece will land.
  const ghost = moved(piece, fallDistance(board, piece), 0);
  context.strokeStyle = "#ccc";
  for (const cell of ghost) {
    context.strokeRect(cell.col * SIZE + 1, cell.row * SIZE + 1, SIZE - 3, SIZE - 3);
  }
  let color = "#4af";
  if (isLanded(board, piece)) {
    color = "#fa4";
  }
  for (const cell of piece) {
    drawSquare(cell.row, cell.col, color);
  }
  // What's shown depends only on the state: the Moore part of the machine.
  const MESSAGES = { menu: "Press Enter to start", paused: "Paused", clearing: "Cleared!", over: "Game over: Enter for a new game" };
  if (state in MESSAGES) {
    context.fillStyle = "#ff0";
    context.fillText(MESSAGES[state], 8, 300);
  }
}

// What each key does: a function to call for it. Up drops the piece; Space
// locks a landed piece and starts a new one; z undoes the last lock.
const ACTIONS = {
  ArrowUp: () => game.drop(),
  " ": () => game.lockPiece(),
  z: () => game.undo(),
  x: () => game.rotate(),
  c: () => game.hold(),
  s: () => localStorage.setItem(SAVE_KEY, encodeSave(game.snapshot())),
};

// The arrow keys move the piece, but only to where it fits: each key's name
// and the rows and columns it moves by.
const MOVES = [
  ["ArrowLeft", 0, -1],
  ["ArrowRight", 0, 1],
  ["ArrowDown", 1, 0],
];
for (let i = 0; i < MOVES.length; i++) {
  ACTIONS[MOVES[i][0]] = () => game.move(MOVES[i][1], MOVES[i][2]);
}

// How often the piece falls one row, in milliseconds.
const FALL_MS = 500; // milliseconds between steps down

// Start the piece falling one row every ms milliseconds. The timer keeps
// running; it moves the piece only while the game is playing. Returns a
// function that stops it.
function startFalling(ms) {
  const timer = setInterval(() => {
    if (state === "playing") {
      game.move(1, 0);
      draw();
    }
  }, ms);
  return () => clearInterval(timer);
}

startFalling(FALL_MS);

// With Shift or Caps Lock, a letter key's event.key is the capital letter
// (MDN: the B key gives "B" with Shift). The letters do the same either way.
ACTIONS.Z = ACTIONS.z;
ACTIONS.X = ACTIONS.x;
ACTIONS.C = ACTIONS.c;
ACTIONS.S = ACTIONS.s;

// Keys that do something once per press. Held down, a key repeats its
// keydown event, with event.repeat set to true (MDN, KeyboardEvent.repeat);
// moving should repeat, but locking, undoing and pausing shouldn't.
const ONCE_PER_PRESS = new Set([" ", "z", "Z", "p", "P", "x", "X", "c", "C", "s", "S"]);

// The event a key stands for: Enter starts, p pauses, Space locks, and every
// other key with an action moves the game along. Keys without one are null.
function eventFor(key) {
  if (key === "Enter") {
    return "start";
  }
  if (key === "p" || key === "P") {
    return "pause";
  }
  if (key === " ") {
    return "lock";
  }
  if (key === "Escape") {
    return "quit";
  }
  return ACTIONS[key] === undefined ? null : "move";
}

// An event: ask the machine where it leads; if anywhere, go there and do what
// that transition does (the Mealy part: actions belong to transitions).
function handle(event, key) {
  const facts = event === "lock" ? lockFacts(game.board(), game.piece(), game.shape()) : {};
  const from = state;
  const to = nextState(from, event, facts);
  if (to === null) {
    return;
  }
  state = to;
  if (event === "start" && from === "over") {
    game = new Game();
  } else if (event === "lock" && to !== "over") {
    game.lockPiece();
  } else if (event === "move") {
    ACTIONS[key]();
  }
  if (to === "clearing") {
    setTimeout(() => {
      handle("cleared");
      draw();
    }, CLEAR_MS);
  }
  if (game.clearedCount() > best) {
    best = game.clearedCount();
    saveBest(best);
  }
}

document.addEventListener("keydown", (event) => {
  const name = eventFor(event.key);
  if (name === null) {
    return;
  }
  event.preventDefault();
  if (event.repeat && ONCE_PER_PRESS.has(event.key)) {
    return;
  }
  handle(name, event.key);
  draw();
});

draw();
```

`index.html` must now load `play.js`, after `states.js` and before `game.js`, which uses `Game` as it loads. Make its scripts read:

```
  <script src="rules.js"></script>
  <script src="save.js"></script>
  <script src="states.js"></script>
  <script src="play.js"></script>
  <script src="game.js"></script>
  <script src="contracts.js"></script>
```

`contracts.js` has two comments that name `game.js` as `Game`'s home. Its fifth line says `Loaded last, it wraps the functions of rules.js and game.js in place.` Change it to `rules.js and play.js`. Near the end, `Only where game.js is loaded.` becomes `Only where play.js is loaded.` A comment that points at the wrong file sends the next reader to the wrong place. Save all three files and reload the game. Press Enter and play. It should behave exactly as before, and the console should stay clear. Ask `Game.prototype.move.name` once more: still `''`, still checked.

```check
lacks blockfall/game.js "class Game" -- Take the Game class out of game.js.
contains blockfall/index.html "play.js" -- index.html should load play.js.
contains blockfall/contracts.js "play.js" -- contracts.js's comments should name play.js as Game's home.
page blockfall/index.html "(() => { for (const key of ['Enter', 'ArrowDown']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [state === 'playing', game.piece()[0].row, Game.prototype.move.name === '']; })()" [true,1,true] errors=none -- The game should start and move as before, with Game's methods still checked.
```

## A Game on the tests page

The boundary is real only if something relies on it. Make the tests page load `play.js`, with no `game.js`. In `tests.html`, add a line after `states.js`, so its scripts read:

```
  <script src="rules.js"></script>
  <script src="save.js"></script>
  <script src="states.js"></script>
  <script src="play.js"></script>
  <script src="contracts.js"></script>
  <script src="tests.js"></script>
```

Then add three tests of `Game` to the end of `blockfall/tests.js`:

```js edit=blockfall/tests.js mode=append

// The Game, made and played on a page with no board to draw on. contracts.js
// checks the game's rules after each of its methods, here too.
test("a new game has a T falling, nothing held and nothing locked", () => {
  const game = new Game();
  assertEqual([game.shape(), game.held(), game.pieceCount()], ["T", null, 0]);
});

test("holding puts the T away and brings in an I, once per piece", () => {
  const game = new Game();
  game.hold();
  game.hold();
  assertEqual([game.held(), game.shape()], ["T", "I"]);
});

test("undo takes back a lock", () => {
  const game = new Game();
  game.drop();
  game.lockPiece();
  const locked = game.pieceCount();
  game.undo();
  assertEqual([locked, game.pieceCount(), game.board()], [1, 0, newBoard()]);
});
```

Each test makes its own `Game`. Its state is private to it, so tests can't disturb each other, and the player's game isn't involved. That's the opposite of the global `game`. Save both files and reload the tests page. It shows `36 passed, 0 failed` and the console is clear. In the console, `typeof draw` is `'undefined'`. The page that tests `Game` has no drawing code at all. Because `contracts.js` loads after `play.js` here too, `Game`'s invariant is checked in the tests as well, which it never was before.

Measure again. From `kit`:

```
.venv/Scripts/python jsdeps.py ../blockfall
```

The table now has `game.js` at 221 lines and `play.js` at 159. The graph gains these lines:

```
contracts.js uses play.js: Game
game.js uses play.js: Game
play.js uses game.js: state
play.js uses rules.js: canMove, clearFullRows, dropped, invariantProblems, isFree, isLanded, lock, moved, newBoard, newPiece, nextShape, rotated, scoreFor
```

`play.js uses game.js: state` is the tool's blind spot again: `fromSnapshot(state)` names its parameter `state`. You can check it without reading. The tests page loads `play.js` with no `game.js`, and `Game` works there, which a real dependency wouldn't allow. The test page is the proof, and the tool gives you leads. `game.js` now uses 7 of `rules.js`'s names, not 18. The tool lists 8, but one of them, `lock`, is the event name `"lock"` in a string in `handle`. The other 11 were used only by `Game`. Commit, from `blockfall`:

```
git add play.js game.js index.html tests.html tests.js contracts.js
git commit -m "Move Game into play.js, which never touches the page, and test it"
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [36,0] errors=none -- With play.js loaded and three Game tests, all 36 should pass.
page blockfall/tests.html "typeof Game === 'function' && typeof draw === 'undefined' && Game.prototype.move.name === ''" true errors=none -- The tests page should have a checked Game and no drawing code.
run "cd blockfall; git log -1 --format=%s" stdout="Move Game into play.js" -- Commit the move.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print(git('cat-file', '-e', 'HEAD:play.js').returncode == 0, 'class Game' in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True False True" -- The commit should hold play.js and a game.js without Game, with nothing left over.
```

**What else, and why not.** You could split all of `game.js` now, one file per row of the table. But with classic scripts every name stays global, and six files would mean six `<script>` lines whose order matters. The coupling would stay the same, just spread out. That split pays once each file can say what it exports and what it imports. That means ES modules, which 01-06-05 showed won't load from disk, so every page and every check would need a server. It's a move worth making, in its own lesson. You could put `Game` into `rules.js`, since both are logic. That keeps one fewer file, but `rules.js` is pure functions with no state, and a reader can trust every one of them to leave its arguments alone. One stateful class would end that promise for the whole file. You could add a `utils.js` for `countBits`. The section above says what that file becomes. Or you could leave `game.js` alone, since the game works. Then `Game` stays untested, and the next feature, say "show the next piece", lands in a 375-line file beside the drawing code.

## Your turn: a page detail in the rules

`rules.js` promises, in its first lines, that nothing in it draws. But its ninth line is `const SIZE = 30; // pixels per square`: how big a square is drawn on the canvas, which is a page detail, not a rule. Only `game.js` uses it (`jsdeps.py` says so, and this time it's right). Move it:

- `SIZE` is declared in `game.js`, with a comment saying what it is, and no longer in `rules.js`.
- The game draws and plays as before, with a clear console.
- On the tests page, `SIZE` doesn't exist, and every test passes.
- Commit both files, leaving nothing uncommitted.

Predict before you reload: what goes wrong if you delete it from `rules.js` and forget to add it to `game.js`? And if you add it to `game.js` but forget to delete it from `rules.js`?

```hints
nudge: Where does SIZE have to be declared for draw to see it, and what happens when two classic scripts both declare the same const?
concept: Top-level const and let in classic scripts share one global scope, so a name can be declared only once across all the scripts on a page. Delete it from rules.js and forget game.js, and draw throws ReferenceError: SIZE is not defined the first time it runs, at load. Declare it in both, and the second declaration is a SyntaxError, so the browser refuses all of game.js and the canvas stays blank. Either way the console says which.
shape: rules.js loses one line. game.js gains, before const canvas, a comment and const SIZE = 30;. Then reload both pages, and commit rules.js and game.js.
answer: In rules.js, delete the line const SIZE = 30; // pixels per square. In game.js, just before const canvas = document.getElementById("board");, add:
~~~js
// Pixels per square on the canvas: how the board is drawn, not a rule.
const SIZE = 30;
~~~
Reload index.html (it plays, the console is clear) and tests.html (36 passed, 0 failed). Then git add rules.js game.js and git commit -m "Move SIZE, a page detail, out of the rules". The tempting slips are the two in the question. Deleting SIZE without adding it gives ReferenceError: SIZE is not defined, from draw. Adding it without deleting gives SyntaxError: Identifier 'SIZE' has already been declared, and none of game.js runs.
```

```check
lacks blockfall/rules.js "SIZE" -- rules.js shouldn't declare SIZE any more.
contains blockfall/game.js "SIZE = 30" -- game.js should declare SIZE.
page blockfall/index.html "(() => { for (const key of ['Enter', 'ArrowDown']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [SIZE === 30, state === 'playing', game.piece()[0].row]; })()" [true,true,1] errors=none -- The game should draw and play with SIZE declared in game.js.
page blockfall/tests.html "[typeof SIZE === 'undefined', testResults.passed, testResults.failed]" [true,36,0] errors=none -- The tests page should have no SIZE, and all 36 tests should pass.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('SIZE' in git('show', 'HEAD:rules.js').stdout, 'SIZE = 30' in git('show', 'HEAD:game.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="False True True" -- Commit rules.js without SIZE and game.js with it, with nothing left over.
```

**What these checks establish, and what they don't.** They check that `Game` lives in `play.js`, which mentions no `document`, `localStorage` or `setInterval`. They check that the tests page loads `play.js` without `game.js`, that three tests of `Game` pass there with its invariant checked, and that the game still plays. They check that `SIZE` moved to the page's side. They can't keep it that way. The tests page is a browser page too, with a `document` and storage of its own, so if tomorrow's change made `Game` read `localStorage`, every test here would still pass. The three `lacks` checks look for three words, and `sessionStorage`, `setTimeout` or `globalThis["local" + "Storage"]` would slip past them. A boundary nothing enforces lasts until somebody is in a hurry. 03-06-01 makes boundaries fail the build. Nor does a smaller `game.js` mean a better design. It still has five reasons to change, and its four global variables are as shared as before.

```predict
question: A teammate (or an agent) is asked to "show the best score next to the current one, and keep a top-five list between visits". Which file should each part go in, and what would you check in their change?
explain: The top-five list is kept in the browser's storage, so it belongs on the page's side, in game.js, beside loadBest and saveBest. The score comes from Game.score(), which needs no change. A change that touches play.js to read or write storage has crossed the boundary, even if every test passes. That's the thing to look for in the diff, and a reason to say where things go in the request itself: "storage stays in game.js; play.js and rules.js don't change".
```

## What you can do now

- **Measure before you restructure.** Each file's length and longest block, and which files use which names, show where the trouble is. `game.js` was the biggest file, with a 152-line class, and it used 18 of `rules.js`'s names. With classic scripts that graph is written nowhere, so a tool reconstructs it, and you check each edge it reports. A shared spelling isn't a dependency.
- **Cohesion: one reason to change.** Sort a file's parts by what would make them change. Six answers in one file make a god file. The same in one class makes a god object. `Game` isn't one: its fields all describe one game.
- **Coupling is what one part must know about another.** Depending on the rules is fine. What hurts is coupling nobody can see. Four functions in three files each know how a row is stored. `contracts.js` depends on load order, and in the wrong order it stops checking, silently.
- **Global, shared mutable state** couples every reader to every writer, whatever their parameters say. `Game`'s private fields can change in eight places, and `state` in any file.
- **A file named `utils` becomes a dumping ground.** Keep a helper beside its user, and notice when one has none, like `parity`.
- **A boundary is real when something relies on it.** The tests page loads `play.js` without the page's code, so `Game` is finally tested. Keeping the boundary needs a check that fails, which comes later in this stage.

**Next:** 03-02-02 puts layers into Ledger. Its domain, storage and interface become packages with a direction: the domain never imports tkinter, Ledger gets its first window, and a dependency cycle is found and broken.
