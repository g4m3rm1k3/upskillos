# Lesson 10 — Transactions: What Happens When Half a Write Fails

## What you'll learn
- Why two related writes can end up in an inconsistent state if something fails between them
- What `COMMIT` and `ROLLBACK` actually do, and why "the crash happened, so nothing was saved" is a dangerous assumption
- How to wrap related writes so they either all succeed or all fail together
- A real, measured example of exactly this going wrong, not a hypothetical

## The question
Move $200 from Pixar's budget to Ghibli's — two separate `UPDATE` statements, one subtracting, one adding. What happens to the data if your program crashes, or an exception is raised, after the first `UPDATE` runs but before the second one does?

## 1. Predict
Before reading further: if an exception happens between the two updates, and you never explicitly call anything afterward, do you think Pixar's balance is still reduced by $200, or does it revert back automatically because nothing was ever "saved"?

## 2. Try it
```python
import sqlite3

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()
cursor.execute("CREATE TABLE studios (name TEXT, budget INTEGER)")
cursor.execute("INSERT INTO studios VALUES ('Pixar', 1000)")
cursor.execute("INSERT INTO studios VALUES ('Ghibli', 500)")
conn.commit()

try:
    cursor.execute("UPDATE studios SET budget = budget - 200 WHERE name = 'Pixar'")
    raise Exception("simulated crash before the second update")
    cursor.execute("UPDATE studios SET budget = budget + 200 WHERE name = 'Ghibli'")
except Exception as e:
    print("caught:", e)

cursor.execute("SELECT * FROM studios")
print(cursor.fetchall())
```

### What this code does
- `conn.commit()` after the two `INSERT`s — makes the starting data durable, a clean checkpoint before the risky part begins.
- `cursor.execute("UPDATE ... WHERE name = 'Pixar'")` — subtracts 200 from Pixar's budget. This change exists **now**, inside the current connection, immediately — it doesn't wait for `commit()` to take effect locally.
- `raise Exception(...)` — deliberately simulates a crash at the worst possible moment: after the first update, before the second. The second `UPDATE` line is never reached at all.
- `except Exception as e: print(...)` — catches the simulated crash so the script keeps running long enough to inspect what state the data is actually in afterward. Nothing here calls `conn.rollback()` — that omission is the entire point.

### What happens
This is real, actually-run output:
```
caught: simulated crash before the second update
[('Pixar', 800), ('Ghibli', 500)]
```
Pixar's budget is **800** — the first `UPDATE` genuinely took effect — while Ghibli is still **500**, untouched. $200 has effectively vanished: not with Pixar, not with Ghibli. If you predicted the change would "revert automatically" because nothing was explicitly saved, that's the natural but incorrect guess — a change taking effect and a change being made *durable* (via `commit`) are two separate things, and this in-between state is exactly what a transaction is meant to prevent.

## 3. Why?
### Code mechanics
By default, Python's `sqlite3` module starts an implicit transaction the moment you run an `INSERT`, `UPDATE`, or `DELETE` — every write from that point is provisionally applied and visible to your own connection immediately, but not made permanent (and not guaranteed to survive a real crash or be visible to other connections) until `conn.commit()` runs. `conn.rollback()` is the other side of that same mechanism: it discards every uncommitted change back to the last commit point, as if they'd never happened.

The bug here isn't that SQLite failed to protect the data — it's that **nothing asked it to**. The exception was caught, the program kept running, and neither `commit()` nor `rollback()` was ever called — so the provisional, half-finished state just sits there, live, until something eventually does one or the other.

### Runtime behavior
This is a purely runtime concern — there's nothing about this code that a type checker or the Python interpreter itself could flag as wrong ahead of time. The two `UPDATE` statements are individually completely valid SQL; the bug only exists in the *relationship* between them — that they were meant to happen together, and nothing in the code enforced that.

### Mental model
```
INSERT, INSERT → commit()  ← durable checkpoint: Pixar=1000, Ghibli=500
UPDATE Pixar -200          ← provisional: Pixar=800 (visible now, not yet durable)
   [exception here]
UPDATE Ghibli +200         ← never runs
   ↓ no rollback() called
state left dangling: Pixar=800, Ghibli=500  ← inconsistent, $200 unaccounted for
```

## 4. Change one thing
```diff
 try:
     cursor.execute("UPDATE studios SET budget = budget - 200 WHERE name = 'Pixar'")
     raise Exception("simulated crash before the second update")
     cursor.execute("UPDATE studios SET budget = budget + 200 WHERE name = 'Ghibli'")
 except Exception as e:
     print("caught:", e)
+    conn.rollback()
```

### What changed
Added an explicit `conn.rollback()` inside the `except` block.

### What did not change
The simulated crash point, the two `UPDATE` statements, everything else — identical.

### Behavioral consequence
```
caught: simulated crash before the second update
[('Pixar', 1000), ('Ghibli', 500)]
```
Pixar's budget is back to **1000** — the provisional `UPDATE` was discarded entirely, restoring the last committed state. Neither budget changed at all, which is the correct outcome: a transfer that didn't fully complete should leave the world exactly as if it had never started, not partially completed.

## 5. Put it in the project
```python
def transfer_budget(conn, from_studio, to_studio, amount):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE studios SET budget = budget - ? WHERE name = ?",
            (amount, from_studio),
        )
        cursor.execute(
            "UPDATE studios SET budget = budget + ? WHERE name = ?",
            (amount, to_studio),
        )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Transfer failed, rolled back: {e}")
        return False


transfer_budget(conn, "Pixar", "Ghibli", 200)
cursor.execute("SELECT * FROM studios")
print(cursor.fetchall())
```

### Code walkthrough
- Both `UPDATE`s and the `commit()` live inside the same `try` block — this is deliberate: it means *any* failure anywhere between the first change and the final commit takes the same rollback path, not just the specific exception from step 2's demo.
- `conn.commit()` is the very last thing that happens in the success path — only reached if both updates ran without raising. This ordering is what makes the whole function "all or nothing": there is no point in this function's normal execution where one update is durable and the other isn't.
- `except Exception as e: conn.rollback()` — catches *any* failure (a deliberately broad catch here, unlike Lesson 2's advice to narrow exceptions — because at this level, "something, anything, went wrong during the transfer" genuinely does warrant the same response: undo everything) and explicitly discards whatever provisional changes existed.
- `return True` / `return False` — the function reports success or failure explicitly rather than leaving the caller to guess from the database state afterward, echoing Lesson 6's pattern of every code path returning a consistent, checkable shape.
- Using `?` placeholders for `amount` and the studio names — Lesson 7's rule, still non-negotiable here: nothing about handling money makes it more acceptable to format values into SQL text.

### Why this design?
Wrapping exactly the operations that must succeed or fail *together* inside one `try`/`commit`/`except`/`rollback` block is the actual shape of a transaction in application code — the database provides the primitive (`commit`/`rollback`), your code decides which operations are logically one unit.

## 6. Trap
**Normal rule:** an uncaught exception stops your program, so it feels like nothing could have been "saved."
**Apparently equivalent code:** the original step 2 demo, minus the `try`/`except` — letting the exception propagate all the way up and crash the script outright.
**Surprising result:** if you re-run step 2's scenario *without* catching the exception at all, letting it kill the process, and then reconnect to the *same underlying database file* (not `:memory:`, which vanishes on exit — imagine this against a real file), Pixar's budget is still reduced by 200, permanently, because the provisional change was already applied to the database's on-disk state the moment the first `UPDATE` ran; it only needed a `commit()` to become durable across connections, not to exist at all in the meantime.
**Exact reason:** "the program crashed" and "nothing was written" are not the same claim. A provisional, uncommitted change can still be sitting in the database's write-ahead state when a crash happens — what actually happens to it at that point depends on the specific database engine's crash-recovery behavior, but the assumption "a crash equals a clean slate" is not something you can rely on in general.
**Project consequence:** this is exactly why `transfer_budget` above puts the rollback in the `except` block explicitly, rather than assuming an uncaught exception is somehow safer — an explicit `rollback()` is a guarantee; an uncaught crash's effect on unsaved data is not something you should be reasoning about from first principles when you don't have to.

## 7. Exercise
- **Predict:** If `transfer_budget` is called with a `from_studio` name that doesn't exist in the table, does the first `UPDATE` raise an error, or does it just silently affect zero rows? What does the function return in that case, and is that actually correct behavior?
- **Modify:** Add a check before the transfer: if `from_studio`'s budget would go negative, don't perform the transfer at all — raise an exception yourself inside the `try` block so the existing rollback logic handles it for free.
- **Break:** Remove the `conn.commit()` call entirely from `transfer_budget`'s success path (keep the `try`/`except`/`rollback`). Call the function successfully, then check the studios table. Does the transfer appear to have worked?
- **Repair:** Explain, in one sentence, why the broken version above can look correct within the same running program but still be wrong — think about what a *second*, separate connection to the same database would see.
- **Trace:** Walk through `transfer_budget(conn, "Ghibli", "Pixar", 9999)` — an amount larger than Ghibli's actual budget. SQLite won't stop this by default (no built-in "budget can't go negative" rule). What state do the studios end up in, and is that a bug in `transfer_budget` or a missing validation the exercise above was meant to add?

## What to remember
- A write taking effect and a write being durable/committed are two separate events — don't conflate "it ran" with "it's saved."
- `conn.rollback()` discards uncommitted changes back to the last commit point — call it explicitly on failure; don't assume a crash does this for you.
- Group operations that must succeed or fail together inside one `try`/`commit`/`except`/`rollback` block — that grouping *is* the transaction, expressed in your code, not just a database feature you get automatically.
- A broad `except Exception:` is appropriate here specifically because the response (roll back everything) is correct regardless of *which* failure occurred — this is a deliberate exception to Lesson 2's "catch narrowly" rule, not a contradiction of it.

## Next lesson
Still open: formal testing of everything built across these ten lessons (this transaction code is an excellent first thing to actually write real tests for, given how easy the failure mode is to miss by eye), deeper concurrency (what happens when *two separate connections* try to transfer money involving the same studio at the same time), or starting the ML track. Say which whenever you're ready.
