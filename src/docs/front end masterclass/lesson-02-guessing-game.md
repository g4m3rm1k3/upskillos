# Lesson 2 — The Number Guessing Game

## What you'll learn
- How conditionals (`if`/`else if`/`else`) drive *different* DOM outcomes from the same event
- Why pulling repeated logic into a named function is a real improvement, not just style
- A first taste of "game state" — more than one variable that together describe what's going on
- `parseInt` and why user input is never trustworthy as-is

## What you'll build
A page where the player types a guess (1–100), and the game tells them
higher/lower/correct, tracking how many attempts they've used.

## The question
Lesson 1 had one event → one outcome (increment). What changes in your code
when the *same* click needs to produce three different possible outcomes
depending on data?

## 1. Predict

You'll need to compare the player's guess against a secret number. Before
writing anything: what JavaScript feature lets a program choose between
several different actions based on a comparison? You already know this from
Python/JS basics — name it, and predict roughly how many branches (distinct
outcomes) this game needs.

## 2. Try it

Create `src/lesson-02-guessing-game/index.html`, `style.css`, `script.js`.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Guess the Number</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Guess a number between 1 and 100</h1>
  <input type="number" id="guess-input" min="1" max="100">
  <button id="guess-btn">Guess</button>
  <p id="feedback"></p>
  <p id="attempts">Attempts: 0</p>
</body>
<script src="script.js"></script>
</html>
```

**`script.js`**
```js
const secretNumber = Math.floor(Math.random() * 100) + 1;
let attempts = 0;

const input = document.getElementById("guess-input");
const guessBtn = document.getElementById("guess-btn");
const feedback = document.getElementById("feedback");
const attemptsDisplay = document.getElementById("attempts");

function handleGuess() {
  const guess = parseInt(input.value);
  attempts = attempts + 1;
  attemptsDisplay.textContent = "Attempts: " + attempts;

  if (guess === secretNumber) {
    feedback.textContent = "Correct! It was " + secretNumber + ".";
    guessBtn.disabled = true;
  } else if (guess < secretNumber) {
    feedback.textContent = "Too low.";
  } else {
    feedback.textContent = "Too high.";
  }
}

guessBtn.addEventListener("click", handleGuess);
```

### What this code does

**`Math.floor(Math.random() * 100) + 1`**
- `Math` is a built-in global object holding math-related functions and
  constants — it's not something you construct, just a namespace of tools.
- `Math.random()` returns a floating-point number in the range `[0, 1)` — 0
  inclusive, 1 exclusive. Every call gives a new pseudo-random value.
- `* 100` scales that range to `[0, 100)`.
- `Math.floor(...)` rounds *down* to the nearest whole number, giving you an
  integer in `[0, 99]`.
- `+ 1` shifts the range to `[1, 100]` — matching what the HTML tells the
  player ("between 1 and 100").
- **Why this exact formula and not, say, `Math.round`?** `Math.round` on a
  `[0,100)` range would make `0` and `100` roughly half as likely as every
  other number (edge rounding), quietly breaking fairness. `floor` + `+1` is
  the standard, evenly-distributed pattern — worth memorizing as-is.

**`const secretNumber = ...`**
- Declared once, at the top, outside any function. It's computed exactly once
  when the script first runs (page load), and never reassigned — hence
  `const`. Every click of the guess button compares against this same fixed
  value.

**`function handleGuess() { ... }`**
- This is a **named function declaration** — contrast with Lesson 1, where
  the callback was an anonymous `function () {...}` written directly inline
  inside `addEventListener`.
- **Why name it separately this time?** Two reasons, both real: (1) the logic
  is longer and more complex than Lesson 1's one-liner, and giving it a name
  documents *what it does* at the call site; (2) it makes the function
  reusable/testable independent of the specific event that triggers it — you
  could call `handleGuess()` from a different trigger (e.g. pressing Enter)
  without duplicating logic.
- **What if changed back to inline?** It would still work — JavaScript
  doesn't require named functions here. But you'd have a much longer
  anonymous block, and no name to read when skimming the file.

**`parseInt(input.value)`**
- `input.value` — a property on the `<input>` element holding whatever the
  user typed, **always as a string**, even though the input has
  `type="number"`. This surprises people — the browser restricts *what
  characters* can be typed, but the JS-visible value is still text.
- `parseInt(...)` converts that string to an integer. It reads digits from
  the start of the string until it hits something that isn't a digit, then
  stops. `parseInt("42abc")` is `42`; `parseInt("abc")` is `NaN` ("Not a
  Number" — a special value signaling a failed conversion).
- **Why not just compare the string directly?** `"9" < "80"` using string
  comparison compares character-by-character alphabetically, not
  numerically — `"9" < "80"` is actually `false` as strings, because `"9"`
  sorts after `"8"`. Skipping `parseInt` here would silently produce wrong
  results for two-digit numbers. This is exactly the kind of bug that hides
  until you test the right input.
- **What if the user types nothing or letters?** `guess` becomes `NaN`. Every
  comparison against `NaN` (`===`, `<`, `>`) evaluates to `false`, so the code
  falls through to the `else` branch ("Too high") — technically wrong
  behavior, worth noting as an open edge case rather than silently ignoring
  it (see Exercise below).

**`if (guess === secretNumber) { ... } else if (guess < secretNumber) { ... } else { ... }`**
- `if`/`else if`/`else` is a **chain**: the engine tests conditions top to
  bottom and runs the first branch whose condition is `true`, skipping the
  rest entirely. Only one branch's body ever executes per call.
- `===` (strict equality) checks both value *and* type without converting
  either side. This matters here because `parseInt` already guaranteed
  `guess` is a number — using `===` instead of `==` is a habit that avoids
  bugs elsewhere where type coercion sneaks in.
- `guess < secretNumber` — a plain numeric comparison, now safe because both
  operands are actual numbers thanks to `parseInt`.
- The final `else` needs no condition — it's "everything not already
  matched," which here means `guess > secretNumber` by elimination.

**`guessBtn.disabled = true;`**
- `.disabled` is a boolean property every form control (`button`, `input`,
  etc.) has. Setting it `true` makes the browser gray out the button and stop
  firing click events on it. This is a DOM property directly controlling
  built-in browser behavior — not just visual, but functional.

### What happens

Type a guess, click "Guess." The engine picks exactly one branch based on the
comparison, updates `feedback.textContent` accordingly, and increments
`attempts` — every single call, regardless of which branch runs, because the
attempts-counting line sits *above* the `if` chain and isn't part of it.

## 3. Why?

### Mental model

```
Click
  ↓
handleGuess() runs
  ↓
read + convert input.value → guess (number)
  ↓
attempts always increments (outside any branch)
  ↓
exactly ONE of three branches runs, chosen by comparison
  ↓
that branch alone decides what feedback.textContent becomes
```

The key idea: **conditionals don't add extra events — they add extra
possible outcomes to the same event.** One click, one function call, one
branch chosen.

## 4. Change one thing

```diff
   if (guess === secretNumber) {
     feedback.textContent = "Correct! It was " + secretNumber + ".";
     guessBtn.disabled = true;
   } else if (guess < secretNumber) {
-    feedback.textContent = "Too low.";
+    feedback.textContent = "Too low. Try higher.";
   } else {
     feedback.textContent = "Too high.";
   }
```

**What changed:** only the string in the "too low" branch.
**What did not change:** which branch runs, when it runs, or the comparison
logic that chooses it. This is worth noticing because it isolates exactly
what a branch's *body* is responsible for (what happens) versus what the
`if`/`else if` *condition* is responsible for (whether it happens).

## 5. Put it in the project

This is your first function that reads user-provided data (as opposed to
Lesson 1, which only ever read its own internal `count`). Every remaining
lesson in Phase A builds on this: reading input, converting/validating it,
and branching on it is the core loop of almost any interactive app.

## 6. Trap

Predict, then test: what does the game do if you type `"7"` followed by
extra spaces, like `" 7 "`, into the input?

Run it. You'll find it still works — `parseInt` tolerates leading whitespace.
Now try typing `"07"` — also fine, still parses to `7`.

Now try leaving the input **empty** and clicking Guess.
`parseInt("")` returns `NaN`. As explained above, every comparison against
`NaN` is `false`, so the code silently falls into the "Too high" branch even
though no real guess was made. **The trap: a failed conversion doesn't throw
an error you'd notice — it silently produces a value (`NaN`) that flows
through the rest of your logic as if it were a normal number**, giving
misleading feedback instead of a crash you'd have to fix.

## 7. Exercise

Pick at least one:

- **Repair:** Fix the `NaN` trap above — add a check at the top of
  `handleGuess` that detects `Number.isNaN(guess)` and sets
  `feedback.textContent` to something like "Please enter a number" instead of
  running the rest of the function. (Hint: `return` early to skip the rest of
  the function body.)
- **Predict:** If you moved the `attempts = attempts + 1;` line to *inside*
  the `if (guess === secretNumber)` branch only, what would `attempts` mean
  after 3 wrong guesses and 1 correct one?
- **Modify:** Add a maximum of 5 attempts — after the 5th wrong guess,
  disable the button and reveal `secretNumber` in the feedback regardless of
  what was guessed.
- **Compare:** Rewrite the `if`/`else if`/`else` chain using a `switch`
  statement on the result of comparing `guess` and `secretNumber` (hint:
  `Math.sign(guess - secretNumber)` gives you `-1`, `0`, or `1`). Which
  version reads more clearly to you, and why?

## What to remember
- `if`/`else if`/`else` runs exactly one branch per evaluation — the rest are
  skipped entirely, not "also checked."
- Form input values are always strings; convert deliberately (`parseInt`)
  before doing numeric comparisons.
- A failed conversion (`NaN`) doesn't stop your program — it silently
  propagates through comparisons as `false`, which is a distinct kind of bug
  from a crash.
- Naming a function documents intent and decouples logic from the specific
  event that triggers it.

## Next lesson
Lesson 3 moves from a single piece of state (`attempts`, a number) to an
**array** of state (a list of todo items), and introduces the pattern of
completely re-rendering a list of DOM elements from data rather than editing
one line of text — the pattern React eventually automates for you entirely.
