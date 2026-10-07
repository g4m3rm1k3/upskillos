# Worked lesson specification — Why a class protects a score

**Status: authoring specimen implemented by A10 in `dice-path-state`.** The live lesson follows the Score sequence and ends with a bounded RoundCounter transfer challenge; compiler walkthroughs exercise both. Read the [course contract](../../cpp-games-learning-path.md) and [terminal map](01-terminal.md). This example fixes the expected depth before the full lessons are authored.

## The learner's starting point

They can write a function, trace a reference, use a struct and write a simple assertion. They do not know `class`, `private`, methods, encapsulation or invariants. A11 will teach constructors; this lesson uses member initialization already encountered with a struct.

They have seen a scoreboard increase during the [course showcase](course-openings.md#a00--can-you-beat-an-opponent-that-learned-to-play). Begin this lesson by showing the exact bug: a negative “bank” action makes the displayed score decrease. The visible goal is a score that rejects that request and remains unchanged.

By the end they can implement a small score class, explain why callers cannot directly overwrite its value, and test two independent objects. This is a focused exercise, not the final `Game` class.

## Contract before code

For this exercise only, a score begins at zero. A bank request accepts an amount from 1 through 12 while the score is below 12. Accepted requests add the amount. A rejected request returns false and changes nothing. Once the accumulated score is at least 12, further requests are rejected. Overshooting 12 is allowed. The largest possible stored value is 23, so this exercise does not risk overflowing an `int`.

This simplified object does not decide whose turn it is or whether a pot is empty. The full game will own those rules. A positive bank request here is a narrow interface exercise, not authorization to bypass game legality later.

## Step 1 — Observe the problem before fixing it

In the existing tiny struct experiment, change a public score to -3. Run and observe it printing -3. Ask: did the compiler know this was against the rules? No: the field is an integer, and -3 is a valid integer. A domain rule is more specific than a language type.

Do not introduce all object-oriented vocabulary here. Name only **invariant**: a condition the object promises will remain true whenever callers can observe it. Our first invariant is that banked points never become negative through this interface.

Prediction before the next edit: if outside code is prevented from assigning to the stored number, can the object decide which changes to accept?

## Step 2 — A public query and private storage

Learner file: `explore/score_class.cpp`. The real lesson uses a normal `cpp file=...` full-file target so Project Studio displays its live comparison. The excerpt below is the small teaching change, not a substitute for that target.

```diff
+class Score {
+private:
+    int points_ = 0;
+public:
+    int points() const { return points_; }
+};
```

Explain the edit before asking them to type it:

- A **class** defines a type: what data one object stores and which operations callers may use.
- `private:` prevents ordinary callers from directly naming `points_`. The trailing underscore is our naming convention, not special C++ syntax.
- `public:` exposes the operations below it. `points()` is a **method**, a function called on an object.
- The method returns a copy of the integer. `const` after its parameter list promises not to modify this object's ordinary members through the method.
- The class definition ends in `;`. The method body uses braces just like the functions the learner already wrote.

Add a short `main` in a separate step: construct two ordinary objects with default member values and print their queries. Expected output is `0 0`. Then temporarily attempt direct assignment to `first.points_`; build and read the access error. Remove the experiment and rebuild. Call this a compile-time access restriction, not security against a malicious program.

Explain `struct` versus `class`: either can have data and methods; their default member access differs. Spelling a type `class` does not automatically protect a rule. Our explicit access labels and controlled method are what matter.

## Step 3 — One method owns the change

Add an accepting path first, with a temporary stated precondition that the input is positive and in range:

```diff
 public:
     int points() const { return points_; }
+    bool bank(int amount) {
+        points_ += amount;
+        return true;
+    }
```

Explain the implicit receiver: in `first.bank(4)`, `amount` starts as 4 and `points_` means the stored number in `first`. There is no second shared score hiding inside the class definition. Return true communicates that the request was accepted; it is not the new total.

Before running, ask what `second.points()` will report after `first.bank(4)`. Then type the caller, run and trace:

| Statement | First score | Second score | Returned result |
|---|---|---|---|
| Create both | 0 | 0 | — |
| `first.bank(4)` | 4 | 0 | true |
| `first.bank(3)` | 7 | 0 | true |
| `second.bank(2)` | 7 | 2 | true |

This intermediate method does not yet meet the full contract. Say so plainly. A check of the normal path cannot certify validation. A purposeful invalid-input experiment motivates the next edit.

## Step 4 — Reject before changing anything

Add a guard before addition:

```diff
     bool bank(int amount) {
+        if (amount < 1 || amount > 12 || points_ >= 12) {
+            return false;
+        }
         points_ += amount;
         return true;
     }
```

An early return ends the call before the addition. `||` means any disqualifying condition is enough. Work each boundary separately: amount 0 fails, amount 1 succeeds, amount 12 succeeds, amount 13 fails, and a score already at 12 rejects a later otherwise-valid amount.

Trace a rejection with score 7 and amount -3: the first condition is true; control returns false; the addition is not reached; score remains 7. Trace acceptance with score 11 and amount 6: all guard conditions are false, score becomes 17, and later requests fail because 17 is at least 12.

Ask why putting the addition before the guard breaks the invariant even when the function returns false. This is the worked debugging example, not just a warning to be careful.

## Step 5 — Tests specify behavior

The learner writes tests in small groups: initial state, two accepted amounts, rejection preserves state, independent objects, and terminal score. Each assertion is explained as a statement about the contract. Use the earlier taught build command and assertion setup; do not introduce a test framework here.

The author-side walkthrough must try these wrong implementations:

| Wrong implementation | Case that exposes it |
|---|---|
| Replace the score with the amount | Bank 4 then 3; expected 7 |
| Mutate before checking | Bank 4 then -2; rejection must leave 4 |
| Reject amount 12 | Bank 12 from zero; expected accepted |
| Allow more banking after a win | Bank 12 then 1; second request rejected |
| Share one static stored score | Change one object; another must remain zero |
| Print example output instead of storing values | Call methods in another order with different amounts |

These are behavioral tests against calls into the learner's class. Searching for the word `private` cannot establish the full contract. A negative compile check can establish the intended access restriction, but must be isolated from the normal build so an unrelated compile failure cannot earn a pass.

## Try it — Change one assumption

Make the storage public temporarily. Show that `first.points_ = -3` bypasses every method check. Restore private access and explain **encapsulation** as maintaining a controlled boundary around representation, not hiding code from readers.

Next copy the first score into a new object, bank into the copy and predict which totals change. Contrast with a reference alias from A06. Restore the guided baseline before the independent task, keeping the experiment in the small exploration file.

## Your turn — A limited round counter

No solution or target implementation is shown. Create `RoundCounter` in a separate practice file using the syntax learned here. Its count begins at zero. `advance()` accepts up to five successful advances and reports success as a boolean; further calls report failure without changing the count. `count()` reports the value without modifying it. `reset()` sets it back to zero. Separate objects remain independent.

The learner writes their own tests, then runs reviewer checks covering the first advance, exactly the fifth, the sixth, reset after a full counter, two independent objects and a copied object. The runner calls methods and inspects results; it does not accept memorized console output. Mutants include allowing a sixth advance and resetting the wrong/shared object.

Hint ladder:

1. Which piece of data must callers be unable to overwrite directly?
2. Before an advance, ask whether the counter has already reached its limit. Reject before mutating.
3. Use a private integer, a read-only query and two public operations. Compare before incrementing; reset assigns the starting value.

The final hint names a design shape without revealing the complete implementation. The learner may choose different private names and equivalent valid code.

## Exit evidence and next connection

Ask the learner to explain why `count()` returns a value rather than a mutable reference, to identify the invariant, and to point to the line that prevents a sixth advance. Then ask how a limit chosen at creation would change the design. Do not give constructor syntax yet: that need introduces A11.

Behavioral success, explanation and transfer are recorded separately. This specimen's code is intentionally only an excerpt; before publication it needs complete incremental targets, runnable commands, graded cases, wrong-answer walkthroughs and a browser check of the actual lesson presentation. No compilation or test pass is claimed by this document.
