---
title: "Debugging as Science: Reproduce, Hypothesise, Test, Narrow"
runtime: none
---

A player writes: "Sometimes a piece falls through the floor. It just sinks off the bottom of the board. Not always, maybe one game in five." This is the kind of report that wastes days. It's vague ("sometimes"), and the obvious response is to start changing code that looks suspicious until the problem seems to go away. That isn't debugging, it's guessing, and it often "fixes" the bug without understanding it, or moves it somewhere else. Debugging works best as an experiment: make the failure happen on demand, list the explanations that fit, design a test that could prove each one wrong, run them, and narrow the search until one explanation is left. This lesson does that, on a bug planted in a patch from Sam, and ends with a test that keeps it fixed.

**By the end you can:**

- Turn a vague report into a **reproduction**: exact steps that make the failure happen every time, then shrink them to a **minimal** reproduction.
- Write down **hypotheses** and design an **experiment** for each that could prove it wrong.
- Narrow a search by halving it, in the steps that reproduce a bug and in the history (`git bisect` by hand).
- Capture the minimal reproduction as a test, red before the fix and green after.

**You need:** 01-09-04 (Blockfall's `rules.js`, `tests.html`, red-green), 01-08-04 (bisect, `git am`), 01-05-04 (the browser's console and debugger). Work inside `blockfall`.

## A bug report

Sam's patch has three commits for Blockfall. Create it with the button, beside `blockfall`, and apply it:

```diff file=blockfall.patch provided
From a2e1176d375b9590056371d16c0a7323d6b85fe7 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Tue, 17 Nov 2026 10:00:00 +0000
Subject: [PATCH 1/3] Show the controls under the board

New players didn't know about x or z.
---
 index.html | 1 +
 1 file changed, 1 insertion(+)

diff --git a/index.html b/index.html
index 66a5eda..b376ae3 100644
--- a/index.html
+++ b/index.html
@@ -11,6 +11,7 @@
 <body>
   <h1>Blockfall</h1>
   <canvas id="board" width="300" height="600"></canvas>
+  <p>Arrows move, Up drops, x turns, Space locks, z undoes, p pauses.</p>
   <script src="rules.js"></script>
   <script src="game.js"></script>
 </body>

From 8302d77df9b110640008e00be4f9ba92c686d119 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Tue, 17 Nov 2026 11:00:00 +0000
Subject: [PATCH 2/3] Tidy isFree's bounds

Write both bounds with <= so they read the same way. No behaviour change.
---
 rules.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/rules.js b/rules.js
index 5c491c6..7e52c7a 100644
--- a/rules.js
+++ b/rules.js
@@ -62,7 +62,7 @@ function lock(board, cells) {
 
 // Is the square at (row, col) on the board and empty?
 function isFree(board, row, col) {
-  return row >= 0 && row < ROWS && col >= 0 && col < COLS && (board[row] & (1 << col)) === 0;
+  return row >= 0 && row <= ROWS && col >= 0 && col <= COLS - 1 && (board[row] & (1 << col)) === 0;
 }
 
 // The piece's squares after a move of dRow rows down and dCol columns right.

From 579ce8a38542a1066130d1471a6c099a7fd21619 Mon Sep 17 00:00:00 2001
From: Sam Teammate <sam@example.com>
Date: Tue, 17 Nov 2026 12:00:00 +0000
Subject: [PATCH 3/3] Count the rows cleared, and show the count

Players asked how many rows they'd cleared.
---
 game.js | 9 +++++++++
 1 file changed, 9 insertions(+)

diff --git a/game.js b/game.js
index 41a2ba7..e98fb6b 100644
--- a/game.js
+++ b/game.js
@@ -7,11 +7,13 @@ class Game {
   #board;
   #piece;
   #history;
+  #cleared;
 
   constructor() {
     this.#board = newBoard();
     this.#piece = newPiece();
     this.#history = [];
+    this.#cleared = 0;
   }
 
   // A copy of the board, so that nobody outside can change the real one.
@@ -51,6 +53,7 @@ class Game {
       this.#history.push({ board: this.#board.slice(), piece: this.#piece });
       lock(this.#board, this.#piece);
       this.#board = clearFullRows(this.#board).board;
+      this.#cleared += clearFullRows(this.#board).cleared;
       this.#piece = newPiece();
     }
     this.#check();
@@ -62,6 +65,11 @@ class Game {
     return this.#history.length;
   }
 
+  // How many full rows have been cleared since the game began.
+  clearedCount() {
+    return this.#cleared;
+  }
+
   // Go back to before the last lock, if there was one.
   undo() {
     if (this.#history.length > 0) {
@@ -97,6 +105,7 @@ function draw() {
   context.fillRect(0, 0, canvas.width, canvas.height);
   context.fillStyle = "#eee";
   context.fillText("Pieces: " + game.pieceCount(), 8, 16);
+  context.fillText("Rows: " + game.clearedCount(), 8, 32);
   for (let row = 0; row < ROWS; row++) {
     let shade = "#888";
     if (isRowFull(board, row)) {

```

```
git am ../blockfall.patch
```

```
Applying: Show the controls under the board
Applying: Tidy isFree's bounds
Applying: Count the rows cleared, and show the count
```

Reload `tests.html`: `11 passed, 0 failed`. Open `index.html` and play a few pieces. There's a new line of controls under the board and a `Rows:` count at the top. Most pieces land as they always did, and then, now and again, one sinks.

The tests passing tells you something too. Whatever is wrong, no test covers it. That's normal for a real bug: if a test had covered it, the bug wouldn't have got in.

```check
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); print(subprocess.run(['git', 'log', '--format=%an', '-3'], capture_output=True, text=True).stdout.split().count('Sam'))\"" stdout="3" -- Apply Sam's three commits (git am ../blockfall.patch, inside blockfall).
page blockfall/tests.html "[testResults.passed, testResults.failed]" [11,0] -- Blockfall's tests should all still pass: no test covers the bug.
```

## Reproduce it

"Sometimes" means "under conditions I haven't identified". The first job is to find them, until the failure happens **every time**. Play with a question in mind: what's different about the pieces that sink? The starting board has a two-square gap at the bottom, columns 4 and 5 of rows 18 and 19. Try sending different shapes into it. The T as it arrives, and the T turned once, land normally. Now try the T turned three times, stem down column 4 with its nub on the right, over the gap. From the start:

1. Press Down once (a turn right at the top would go off the board, 01-09-04).
2. Press `x` three times.
3. Press Up to drop it.

The stem's bottom square vanishes below the board, and the console (01-02-03) says:

```
Broken rules: square 20,4 is off the board
```

That's a **reproduction**: steps that make the failure happen every time. The invariant check from 01-04-04 has just paid for itself: it says exactly what's wrong with the state, in words, the moment it happens. Without it you'd be looking at a picture.

Now make the reproduction **minimal**. Remove a step and see whether the failure survives. Pressing Down 25 times instead of Up still sinks the piece, so it isn't the hard drop. Dropping a T without turning it doesn't, and neither does turning it once. Every part that survives removal was irrelevant, and every part that doesn't is a clue. The smallest version here is five keys: Down, `x`, `x`, `x`, Up. This shrinking is itself a search, and halving makes it fast: with a long list of steps, remove half; if it still fails, the cause is in the other half.

```predict
question: The T as it arrives, and turned once, land normally; turned three times over the gap, it sinks. What does the sinking shape have that the others don't?
choice: It's taller than the others
choice: Its lowest square has nothing under it all the way down to the bottom row, in a column the floor doesn't block
choice: It was turned, and turning is broken
answer: Its lowest square has nothing under it all the way down to the bottom row, in a column the floor doesn't block
explain: The T as it arrives rests its arms on row 19's filled squares; turned once, its nub rests on row 19 at column 3. Turned three times, the stem is in column 4 and the nub in column 5, both columns empty to the bottom, so the only thing that can stop it is the floor itself. The turning isn't the cause: it's how the piece gets into the one place where only the floor holds it.
```

```check
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'x', 'x', 'ArrowUp']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.piece().map((cell) => [cell.row, cell.col]); })()" [[20,4],[19,4],[18,4],[19,5]] -- The reproduction: Down, x, x, x, Up sinks the stem's bottom square to row 20, below the board.
```

## Hypotheses, and experiments that could refute them

Now explain it, without touching the code yet. Write down every explanation that fits what you've seen, and for each, an experiment whose result would prove it **wrong**. An experiment that can only agree with you isn't one (01-07-03).

| Hypothesis | Experiment that could refute it | Result |
|---|---|---|
| H1: turning makes a square off the board | Before Up, look at `game.piece()` in the console | All four squares are on the board (rows 0 to 2): refuted |
| H2: the hard drop overshoots | Press Down repeatedly instead of Up | It still sinks: refuted |
| H3: drawing is wrong, and the piece is really fine | Read the invariant error, which checks the state, not the picture | The state itself has a square at row 20: refuted |
| H4: the move check lets a square below the floor | In the console, ask `isFree(game.board(), 20, 4)` | `true`: not refuted |

Run them yourself, in the console on `index.html`: after Down, `x`, `x`, `x`, type `game.piece()`. Then reload and type:

```
isFree(game.board(), 19, 4)
isFree(game.board(), 20, 4)
isFree(game.board(), 21, 4)
```

```
true
true
false
```

Row 19, column 4 is an empty square on the board, so `true` is right. Row 20 is *below* the board, and `true` is wrong. Row 21 is `false` again, which is why the piece sinks one row and stops instead of falling forever. Three hypotheses are refuted, and the one left points at one function. Read it in `rules.js`:

```
  return row >= 0 && row <= ROWS && col >= 0 && col <= COLS - 1 && (board[row] & (1 << col)) === 0;
```

`row <= ROWS` lets `row` be 20, and `board[20]` is `undefined`. `undefined & (1 << col)` is 0 in JavaScript, so that "square" reads as empty. The column test, `col <= COLS - 1`, is right. The row test should be `row <= ROWS - 1`, or `row < ROWS` as it used to be.

Notice the order. The code was read *last*, after the experiments had narrowed the search to one line. Reading code first, looking for something suspicious, finds a dozen candidates, and most of them are fine.

```check
page blockfall/index.html "[isFree(game.board(), 19, 4), isFree(game.board(), 20, 4), isFree(game.board(), 21, 4)]" [true,true,false] -- The experiment that survives: isFree calls row 20, below the board, free.
```

## The reproduction, as a test

A reproduction you have to perform by hand will be forgotten. Make it a test, as 01-09-02 did with Kit's bug report, and make it as small as the cause: not five keys on a game, but one question to `isFree`. Add these to the end of `tests.js`:

```js edit=blockfall/tests.js mode=append
// The floor. Written from the report "a piece sometimes falls through the floor".
test("nothing below the bottom row is free", () => {
  assertEqual([isFree(newBoard(), 20, 4), isFree(newBoard(), 21, 4)], [false, false]);
});

test("an empty square in the bottom row is free", () => {
  assertEqual(isFree(newBoard(), 19, 4), true);
});
```

Reload `tests.html`:

```
FAIL nothing below the bottom row is free: expected [false,false], got [true,false]
12 passed, 1 failed
```

Red, for exactly the reason found. The second test passes: it's there so that a careless fix (say, making row 19 unavailable too) would be caught as well.

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [12,1] -- The new test should fail on Sam's isFree (red), and the bottom-row test pass.
```

## Which change, and why

You know *what* is wrong. Knowing *which change* did it tells you why, and whether anything else came with it. There are only three new commits, but bisect them anyway: it's the same halving, through history. Bisect works with your edited `tests.js` in place, because Sam's commits don't touch that file, so Git carries the change along as it checks commits out. Reload `tests.html` at each step:

```
git bisect start HEAD HEAD~3
```

`HEAD~3` is your last commit before the patch (good), and `HEAD` is the newest (bad). Bisect checks out a commit in between. Reload `tests.html`. If "nothing below the bottom row is free" fails, type `git bisect bad`, otherwise `git bisect good`. Two answers name it:

```
… is the first bad commit
…
    Tidy isFree's bounds

    Write both bounds with <= so they read the same way. No behaviour change.
```

Then `git bisect reset`. The commit's message claims "no behaviour change", the claim 01-08-02 taught you to test, and nothing tested it: no test asked what `isFree` says about the row below the board. Undo just that commit, then run the tests:

```
git log --oneline -3
git revert --no-edit HEAD~1
```

`HEAD~1` is "Tidy isFree's bounds" (the newest commit, the row counter, is `HEAD`). Reload `tests.html`: `13 passed, 0 failed`. Replay the reproduction on `index.html`: the T stops on the floor, with no error. Commit the tests, which now guard the floor:

```
git add tests.js
git commit -m "Test that nothing below the floor is free"
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [13,0] errors=none -- With the bad commit reverted, all 13 tests should pass.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'x', 'x', 'ArrowUp']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.piece().map((cell) => [cell.row, cell.col]); })()" [[19,4],[18,4],[17,4],[18,5]] errors=none -- The reproduction should now leave the T on the floor, with no broken rules.
missing blockfall/.git/BISECT_LOG -- Finish bisecting (git bisect reset).
run "cd blockfall; git log --format=%s -3" stdout="Revert \"Tidy isFree's bounds\"" -- Undo the bad commit with git revert.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Commit the new tests.
```

**What else, and why not.**

| Way to find a bug | Cost |
|---|---|
| Change suspicious code until it seems to work | Feels fast; often fixes a symptom, or nothing, and you never learn the cause |
| Add prints or `console.log` everywhere | Shows values, not causes; a flood of output with no question behind it |
| Step through with the debugger (01-05-04) | Exact; slow over many steps, and you need to know where to stop |
| Reproduce, hypothesise, refute, narrow | Takes discipline and writing things down; converges, and leaves a test behind |
| `git bisect` alone | Finds the change, not the reason; needs a good commit and a reliable test |

## Your turn: the Rows counter

A second report: "The Rows counter never goes up, even when a row clears." Investigate it the same way, and write down your steps as you go (in a notes file of your own, or on paper):

1. **Reproduce** it. 01-09-04's recipe clears row 19 with two pieces: Down, `x`, Up, Space, then Down, `x`, `x`, `x`, Right, Up, Space.
2. **Hypotheses** and an experiment for each. Is it the drawing, the counting, or the clearing? `game.clearedCount()` in the console separates the drawing from the counting.
3. **Find** the line, explain why it gives what it gives, and **fix** it with the least change.
4. **Check**: after the recipe, `game.clearedCount()` is 1, the board is the same as before the fix (`[0, 0, 0, 48, 889]` for rows 15 to 19), and all the tests pass. Commit.

```hints
nudge: After the recipe, the board shows the row did clear, so clearing works. game.clearedCount() is 0, so it's not the drawing. That leaves the counting: read lockPiece where it adds to #cleared.
concept: lockPiece calls clearFullRows twice: once to get the new board, and again, on that new board, for the count. The second call sees a board with no full rows left (the first call removed them), so it always returns cleared: 0. Each call is correct; calling it twice on different boards isn't.
shape: Call clearFullRows once, keep the result, and use both parts: const result = clearFullRows(this.#board); this.#board = result.board; this.#cleared += result.cleared;
answer: In game.js's lockPiece, replace the two lines
~~~js
      this.#board = clearFullRows(this.#board).board;
      this.#cleared += clearFullRows(this.#board).cleared;
~~~
with
~~~js
      const result = clearFullRows(this.#board);
      this.#board = result.board;
      this.#cleared += result.cleared;
~~~
After the recipe, game.clearedCount() is 1 and the board's rows 15 to 19 are [0, 0, 0, 48, 889], as in 01-09-04. Then git commit -am "Count cleared rows from one call of clearFullRows". The experiments: the board after the recipe refutes "clearing is broken"; clearedCount() refutes "drawing is broken"; reading lockPiece then finds two calls. The tempting fix is this.#cleared += 1 whenever a piece locks, which passes this recipe (one row, one lock) and is wrong for a lock that clears none or two.
```

```check
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'x', 'x', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.board().slice(15), game.pieceCount(), game.clearedCount()]; })()" [[0,0,0,48,889],2,1] errors=none -- After the two-piece recipe, one row is cleared and counted.
page blockfall/index.html "(() => { for (const key of ['ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return [game.pieceCount(), game.clearedCount()]; })()" [1,0] errors=none -- A lock that clears no row shouldn't count one.
run "cd kit; .venv/Scripts/python -c \"import pathlib; print(pathlib.Path('../blockfall/game.js').read_text(encoding='utf-8').count('clearFullRows('))\"" stdout="1" -- lockPiece should call clearFullRows once.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [13,0] errors=none -- All the tests should still pass.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); r = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout)\"" stdout="clean" -- Commit the fix.
```

**What these checks establish, and what they don't.** They check the end of each investigation: the reproduction once happened and now doesn't, `isFree` is right at the floor and tested there, the bad commit is reverted, and the counter counts one cleared row and no phantom ones. They can't check the method, the part this lesson is about. A guess that happened to land on the right line passes the same checks as a careful investigation. The difference shows up on the next bug, the one that a guess doesn't find. Notice also what the `Rows:` bug still lacks: a test. `Game` lives in `game.js` with the screen, so the counter can only be checked end to end. Moving the counting into a pure function in `rules.js` would let a unit test guard it, and that's the boundary from 01-09-04 asking to be extended.

## What you can do now

- A **reproduction** makes a failure happen every time; a **minimal** one keeps only what's needed. Shrink by removing steps, half at a time.
- List **hypotheses** before reading code, and for each an **experiment that could refute it**; the one that survives tells you where to look.
- **Narrow by halving**, in steps (delta debugging), in code, and in history (`git bisect`, by hand when the test is a page you reload).
- **Invariant checks** turn "it looks wrong" into "this rule broke, here": they're debugging tools you write in advance.
- Capture the cause as the **smallest test** that shows it, red before the fix and green after, and keep it.

```predict
question: A colleague says "I fixed the crash: I wrapped the call in try/catch and it doesn't happen any more." What questions would you ask before accepting that?
explain: Can you reproduce the crash on the old code, and what exactly was the exception (01-10-01: read it)? What was the cause, and does the try/catch remove it or hide it? Is there a test that fails on the old code and passes now? A try/catch around a symptom is the debugging version of except Exception: the crash is gone and so is the evidence, and the wrong state that caused it is still there, waiting to surface somewhere harder to trace.
```

**Next:** 01-10-03 is about the tools for failures: print versus a logger versus a debugger, breakpoints and watches, looking at a program after it has crashed, whether to retry or to crash, and what to do about a bug that won't reproduce. Kit gets a logger instead of its debugging prints.
