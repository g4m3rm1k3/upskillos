---
title: "Invariants and Contracts: Rules That Must Always Hold"
runtime: none
---

Since 01-04-04, Blockfall has checked its rules after every change and, if one breaks, written `Broken rules: …` in the console. Then it carries on. In 01-10-02 a planted bug sent a piece through the floor, the console said so, and the game kept drawing a board with a piece below its bottom row, accepting keys, locking and scoring, while every later step built on the broken state. A check that only reports is a check nobody acts on in time. This lesson treats rules that must *always* hold as what they are: **invariants**, and the promises each function makes about them, **contracts**. They're the most precise thing you can tell a builder, person or agent, about a program: not "here's an example of right" but "this is never false". Blockfall gets contracts that stop the program at the first function that breaks one, and a sharp lesson about which checks can be trusted to catch which bugs.

**By the end you can:**

- Name the kinds of invariant (data, class, loop, system) and find examples of each in a program.
- Write preconditions and postconditions, and say who's at fault when each breaks.
- Apply design by contract: wrap functions so their promises are checked on every call.
- Choose between an assertion and a validation, and say why each is right where it is.

**You need:** 01-04-04 (Blockfall's `Game` and `invariantProblems`), 01-10-02 (the floor bug), 02-04-03 (`save.js`'s validation). Blockfall is opened from disk and reloaded after each change.

## Rules that must always hold

An **invariant** is a statement that's true at every moment the program could be looked at. Four kinds, by what they're about:

| Kind | About | In Blockfall | In Ledger |
|---|---|---|---|
| **Data** | One value, always | Every board row is a number from 0 to 1023 | Every amount is a whole number of cents |
| **Class** | One object's fields together | The falling piece is on the board and overlaps no filled square | A `BankRow`'s date is a real date (it's frozen, so it stays one) |
| **Loop** | What's true each time a loop goes round | In `clearFullRows`, `kept` holds exactly the rows seen so far that aren't full | In `new_rows`, `found` plus what's left in `extra` is the statement's surplus |
| **System** | Several parts together | The best score saved is at least every score shown since | Every transaction's `category_id` is a category's id (`check_data.py`) |

A **contract** is the same idea, attached to a function. A **precondition** is what must be true when it's called: the caller's promise. A **postcondition** is what will be true when it returns: the function's promise. **Design by contract**, a term from Bertrand Meyer's Eiffel language in the 1980s, is writing these promises down for every function that matters and checking them, so that when one breaks, you know whose bug it is: a broken precondition is the caller's, a broken postcondition the function's own.

```predict
question: clearFullRows(board) returns { board, cleared }. Which of these is a postcondition it should promise?
choice: The board it's given has 20 rows
choice: The returned board has no full row, and exactly 10 squares fewer for each row cleared
choice: It runs in under a millisecond
answer: The returned board has no full row, and exactly 10 squares fewer for each row cleared
explain: A postcondition is about the result and its relation to the input. "No full row is left" says the clearing finished; "10 fewer squares per row cleared" says nothing appeared, vanished or moved between rows. "The board given has 20 rows" is a precondition, the caller's promise; "under a millisecond" is a performance requirement, not something the function's result can show.
```

## Promises, checked

Write the contracts in a file of their own, so they can be switched on for development without changing the code they check. Create `contracts.js`:

```js file=blockfall/contracts.js
// Contracts: what Blockfall's functions promise, checked on every call while
// Blockfall is being developed. A broken contract is a bug in Blockfall, not
// bad data from outside, so it throws a ContractError and nothing catches it.
// (Data from outside, such as a save, is validated instead: save.js.)
// Loaded last, it wraps the functions of rules.js and game.js in place.

class ContractError extends Error {}

// fn, checked. pre is called with fn's arguments, and post with its result
// and then its arguments; each returns a sentence saying what's wrong, or
// null when all is well. Both are called with the same this as fn.
function withContract(name, fn, contract) {
  return function (...args) {
    const before = contract.pre ? contract.pre.apply(this, args) : null;
    if (before) {
      throw new ContractError(`${name}: precondition broken: ${before}`);
    }
    const result = fn.apply(this, args);
    const after = contract.post ? contract.post.call(this, result, ...args) : null;
    if (after) {
      throw new ContractError(`${name}: postcondition broken: ${after}`);
    }
    return result;
  };
}

// How many squares of a board are filled.
function filledSquares(board) {
  return board.reduce((sum, bits) => sum + countBits(bits), 0);
}

const CONTRACTS = {
  // Clearing keeps the board 20 rows tall, leaves no full row, and loses
  // exactly ten squares for each row it clears.
  clearFullRows: {
    post: (result, board) => {
      if (result.board.length !== ROWS) {
        return `the board has ${result.board.length} rows, not ${ROWS}`;
      }
      if (result.board.some((bits) => bits === FULL)) {
        return "a full row is left";
      }
      if (filledSquares(result.board) + result.cleared * COLS !== filledSquares(board)) {
        return "squares appeared or vanished";
      }
      return null;
    },
  },
  // A piece that fits drops straight down, to where it has landed.
  dropped: {
    pre: (board, cells) => (cells.every((cell) => isFree(board, cell.row, cell.col)) ? null : "the piece doesn't fit where it is"),
    post: (result, board, cells) => {
      if (!result.every((cell) => isFree(board, cell.row, cell.col))) {
        return "the dropped piece overlaps the board";
      }
      if (!isLanded(board, result)) {
        return "the dropped piece hasn't landed";
      }
      if (result.some((cell, i) => cell.col !== cells[i].col)) {
        return "the piece moved sideways";
      }
      return null;
    },
  },
};

for (const [name, contract] of Object.entries(CONTRACTS)) {
  globalThis[name] = withContract(name, globalThis[name], contract);
}

// The Game's class invariant: after any of these methods, the game obeys the
// rules (rules.js's invariantProblems). Only where game.js is loaded.
if (typeof Game !== "undefined") {
  for (const method of ["move", "drop", "rotate", "hold", "lockPiece", "undo"]) {
    Game.prototype[method] = withContract("Game." + method, Game.prototype[method], {
      post: function () {
        const problems = invariantProblems({ board: this.board(), piece: this.piece() });
        return problems.length > 0 ? problems.join("; ") : null;
      },
    });
  }
}
```

`withContract` takes a function and its contract, and returns a new function that checks the precondition, calls the original, and checks the postcondition: a **wrapper**, built from functions as values (01-05-03). Each condition returns `null` for "fine" or a sentence saying what's wrong, the same convention as `invariantProblems`, so a failure explains itself. `.apply(this, args)` passes the arguments and `this` through unchanged, so the wrapper works for methods too.

`CONTRACTS` holds the promises. `clearFullRows` promises 20 rows, no full row left, and **conservation**: every square accounted for, ten per cleared row, which catches squares lost or duplicated in ways no example test happened to try. `dropped` requires the piece to fit where it is, and promises it still fits, has landed, and hasn't moved sideways. Then the loop replaces each function with its checked version: in a classic script a top-level `function` is a property of the global object, so `globalThis.clearFullRows = …` changes what every caller gets, including `game.js`. Last, the `Game`'s **class invariant** goes on every method that changes the game: after each one, `invariantProblems` must find nothing. Save it.

## Switching them on

The contracts must load after everything they wrap. In `index.html`, add a line after `<script src="game.js"></script>`:

```
  <script src="contracts.js"></script>
```

In `tests.html`, add the same line after `<script src="save.js"></script>`, so the tests run with contracts on. Save both, and reload `tests.html`: still `26 passed, 0 failed`. Correct code keeps its promises, so turning contracts on changes nothing, which is exactly what should happen. Reload `index.html` and play: nothing is different either.

```check
contains blockfall/index.html "contracts.js" -- index.html should load contracts.js, after game.js.
contains blockfall/tests.html "contracts.js" -- tests.html should load contracts.js, after save.js.
page blockfall/tests.html "[testResults.passed, testResults.failed, typeof ContractError === 'function']" [26,0,true] errors=none -- With contracts on, all 26 tests should still pass.
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'ArrowUp', ' ', 'ArrowDown', 'ArrowDown', 'x', 'ArrowRight', 'ArrowUp', ' ']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.score(); })()" 100 errors=none -- With contracts on, play should go on as before: clearing a row scores 100, and nothing is broken.
```

## A bug the contracts catch

Put 01-10-02's bug back, for a moment. In `rules.js`, in `isFree`, change `row < ROWS` to `row <= ROWS`, so the row below the bottom counts as free. Save, reload `index.html`, and do 01-10-02's reproduction: Down, x, x, x, Up. The turned T falls into the gap and through the floor.

```predict
question: The T falls through. Contracts are on for dropped (its result must fit and have landed) and for Game.drop (the game must obey the rules afterwards). Which contract breaks?
choice: dropped's
choice: Game.drop's
choice: Both
answer: Game.drop's
explain: dropped's postcondition checks "fits" with isFree, and isFree is exactly what's broken: it says row 20 is free, so the result "fits", and "landed" (row 21 isn't free) holds too. Game.drop's class invariant uses invariantProblems, which checks the board's bounds with its own comparison, cell.row < ROWS, so it sees square 20,4 off the board.
```

The console shows the old message and a new one:

```
Broken rules: square 20,4 is off the board
Game.drop: postcondition broken: square 20,4 is off the board
```

Read the evidence. The first line is `#check`, reporting as it always has. The second is the contract, and it's an error that stops the key's handler: the board isn't redrawn with the piece below the floor, and the console names the method that broke the rules, `Game.drop`, rather than leaving you to work back from a strange picture. (In a visible browser it's shown as an uncaught `ContractError`.)

And notice what *didn't* catch it: `dropped`'s own contract, which uses `isFree` to check `dropped`, and so shares `isFree`'s bug. A check built from the same logic as the code it checks will agree with that code's mistakes. The class invariant caught it because `invariantProblems` checks the board's edges independently. The checks worth most are the ones that reach the answer a different way: conservation of squares, a bound checked directly, an oracle (01-09-02).

Put `rules.js` back as it was:

```
git restore rules.js
```

```check
page blockfall/index.html "(() => { for (const key of ['ArrowDown', 'x', 'x', 'x', 'ArrowUp']) document.dispatchEvent(new KeyboardEvent('keydown', { key: key })); return game.piece().map((cell) => cell.row); })()" [19,18,17,18] errors=none -- With rules.js restored (git restore rules.js), the turned T should stop on the floor, and no contract should break.
```

## Assert or validate

Blockfall now has two kinds of check, and they're different on purpose.

- `decodeSave` (02-04-03) **validates**. A save comes from outside the program: an older version, a person's edit. A bad one is expected sooner or later, so it's handled: a `SaveError` with a reason, caught by `startingGame`, and the game carries on.
- `contracts.js` **asserts**. A broken contract can only mean Blockfall's own code is wrong: no outside data reaches `clearFullRows` unchecked. There's no sensible way to carry on, so it throws, and nothing catches it.

The rule: **validate what comes in from outside; assert what your own code promises.** Validating your own logic hides bugs behind graceful messages; asserting on outside data crashes on input you should have expected. Languages blur this, so check what yours does: Python's `assert` statements are removed entirely when Python runs with `-O`, so they must never be the only check on outside data; JavaScript's `console.assert` only logs, and doesn't stop anything. Whether to keep assertions in the finished product depends on cost: cheap ones, like these, usually should stay, because a bug that's stopped is cheaper than one that silently corrupts a save; expensive ones (re-checking a whole database on every call) belong in development and tests.

```predict
question: Ledger's importer receives a statement whose amount is "-4,50". Should that be an assertion or a validation?
choice: An assertion: it's a broken rule
choice: A validation: it's outside data, expected to be wrong sometimes
answer: A validation: it's outside data, expected to be wrong sometimes
explain: The statement comes from a bank and a person's download, so a bad amount is a normal event to handle: reject that row with a reason and carry on (02-04-02). An assertion would crash the import on the first bad row. But once bank.py has made a BankRow, code that receives one may assert that cents is an int: if it isn't, that's Ledger's bug.
```

## Tests for the contracts

The contracts are code, so they get tests: one that each kind of breach really throws, with the message a person would read. Add these to the end of `blockfall/tests.js`:

```js edit=blockfall/tests.js mode=append

// Contracts (contracts.js). caught() runs fn and returns the error it threw,
// or null if it threw nothing.
function caught(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}

test("a function that breaks its postcondition throws a ContractError", () => {
  const shrinking = withContract("shrinking", (board) => ({ board: board.slice(1), cleared: 1 }), CONTRACTS.clearFullRows);
  const error = caught(() => shrinking(newBoard()));
  assertEqual([error instanceof ContractError, error.message], [true, "shrinking: postcondition broken: the board has 19 rows, not 20"]);
});

test("dropping a piece that doesn't fit breaks dropped's precondition", () => {
  const error = caught(() => dropped(newBoard(), moved(newPiece("T"), 18, -3)));
  assertEqual(error.message, "dropped: precondition broken: the piece doesn't fit where it is");
});
```

`caught` turns "did this throw?" into a value to compare. The first test hands `withContract` a deliberately wrong function, one that loses a row, and checks the contract rejects it with its exact message; the second calls the real, wrapped `dropped` with a piece that overlaps the floor. Reload `tests.html`: `28 passed, 0 failed`. Commit, in `blockfall`:

```
git add contracts.js index.html tests.html tests.js
git commit -m "Check Blockfall's contracts and the game's invariant on every call"
```

```check
page blockfall/tests.html "[testResults.passed, testResults.failed]" [28,0] errors=none -- With the two contract tests, all 28 should pass.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('withContract' in git('show', 'HEAD:contracts.js').stdout, 'row < ROWS' in git('show', 'HEAD:rules.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True True" -- Commit contracts.js, the two pages and tests.js, with rules.js unchanged.
```

**What else, and why not.** You could put the checks inside each function, at its start and end: that's how many codebases do it, and it works, but it mixes the promise with the work and can't be switched off. You could rely on tests alone: tests check the examples you thought of; contracts check every call the program actually makes, including the ones in play you'd never write as a test. You could use a type system (Ledger's `BankRow`, and stage 3's TypeScript): types prove some invariants before the program even runs, which is better still where it's possible, and 02-06-02 does exactly that.

## Your turn: a contract for scoring

`scoreFor(cleared)` from 02-05-02 makes no promises yet. Add a contract for it to `CONTRACTS` in `contracts.js`:

- **Precondition:** `cleared` is a whole number from 0 to 4. A lock can't clear more than four rows, because a piece is at most four squares tall; anything else means the caller is wrong.
- **Postcondition:** the result is a whole number, and it's 0 exactly when `cleared` is 0.

Because `contracts.js` wraps everything in `CONTRACTS`, adding the entry is all it takes. Reload `tests.html` (still 28 passed), and try `scoreFor(5)` in its console: it should throw a `ContractError`. Commit `contracts.js`.

```hints
nudge: Each condition returns null when all is well, or a sentence. What would you write in that sentence for scoreFor(5), and for 0 points from 2 rows?
concept: The precondition is the caller's promise: Number.isInteger(cleared) && cleared >= 0 && cleared <= 4. The postcondition relates the result to the argument: Number.isInteger(points) && (points === 0) === (cleared === 0), which says both "nothing cleared scores nothing" and "something cleared scores something" at once.
shape: scoreFor: { pre: (cleared) => (… ? null : `a lock can't clear ${cleared} rows`), post: (points, cleared) => (… ? null : `${points} points for ${cleared} rows`) }, added inside CONTRACTS after dropped.
answer: In contracts.js, add to CONTRACTS, after dropped's entry:
~~~javascript
  // A lock clears at most four rows, since a piece is at most four squares
  // tall; and it scores nothing exactly when it clears nothing.
  scoreFor: {
    pre: (cleared) => (Number.isInteger(cleared) && cleared >= 0 && cleared <= 4 ? null : `a lock can't clear ${cleared} rows`),
    post: (points, cleared) => (Number.isInteger(points) && (points === 0) === (cleared === 0) ? null : `${points} points for ${cleared} rows`),
  },
~~~
Then, in blockfall, git add contracts.js and git commit -m "Give scoreFor a contract". The tempting slip is a postcondition that recomputes the score, such as points === 100 * cleared + 25 * cleared * (cleared - 1): it repeats scoreFor's logic, so it would share scoreFor's bugs, and adds nothing the tests don't already check.
```

```check
page blockfall/tests.html "[CONTRACTS.scoreFor.pre(2) === null, Boolean(CONTRACTS.scoreFor.pre(5)), Boolean(CONTRACTS.scoreFor.pre(1.5)), Boolean(CONTRACTS.scoreFor.pre(-1))]" [true,true,true,true] errors=none -- scoreFor's precondition should accept 2 and refuse 5, 1.5 and -1.
page blockfall/tests.html "[CONTRACTS.scoreFor.post(0, 0) === null, CONTRACTS.scoreFor.post(250, 2) === null, Boolean(CONTRACTS.scoreFor.post(0, 1)), Boolean(CONTRACTS.scoreFor.post(100, 0)), Boolean(CONTRACTS.scoreFor.post(2.5, 1))]" [true,true,true,true,true] errors=none -- scoreFor's postcondition should accept 0 for 0 and 250 for 2, and refuse 0 points for a row, points for nothing, and fractions.
page blockfall/tests.html "(() => { try { scoreFor(5); return false; } catch (error) { return error instanceof ContractError; } })()" true errors=none -- With the contract added, scoreFor(5) should throw a ContractError.
page blockfall/tests.html "[testResults.passed, testResults.failed]" [28,0] errors=none -- All 28 tests should still pass.
run "cd ledger; .venv/Scripts/python -c \"import os, subprocess; os.chdir('../blockfall'); git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); print('scoreFor: {' in git('show', 'HEAD:contracts.js').stdout, git('status', '--porcelain').stdout.strip() == '')\"" stdout="True True" -- Commit contracts.js in blockfall.
```

**What these checks establish, and what they don't.** They check that the contracts load on both pages and change nothing for correct code, that the restored game stops on the floor, that each kind of breach throws with a readable message, and that `scoreFor`'s contract accepts and refuses the right values. The experiment with `isFree` was shown, not checked: a check can't leave a bug in place. And no check can tell you that your contracts say everything that matters: a contract written from the same reasoning as the code will miss the same cases, as `dropped`'s did. The contracts worth writing are the ones that come at the answer from another direction.

## What you can do now

- An **invariant** is true at every moment: **data**, **class**, **loop** and **system** invariants differ in what they're about.
- A **precondition** is the caller's promise, a **postcondition** the function's; a broken one says whose bug it is. **Design by contract** writes and checks them.
- A **wrapper** (`withContract`) checks contracts on every call without changing the code it wraps, and can be switched on for development.
- **Validate** outside data and handle the failures; **assert** your own code's promises, and let a failure stop it. Python's `assert` vanishes under `-O`; `console.assert` only logs.
- A check that **shares the code's logic shares its bugs**. Conservation, independent bounds and oracles catch what echoes can't.

**Next:** 02-06-02 asks where an invariant should be enforced: by a type, a database constraint, a test or a runtime check. Ledger makes "a balance equals the sum of its transactions" and "money is never a float" hold by construction, with types and tests.
