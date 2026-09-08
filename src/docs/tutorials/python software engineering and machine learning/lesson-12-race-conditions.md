# Lesson 12 — Race Conditions: When Two Writers Lose Each Other's Work

## What you'll learn
- What a "lost update" race condition actually looks like, with real measured numbers, not a diagram
- Why reading a value, changing it in Python, then writing it back is unsafe the moment more than one thread can do it at the same time
- How a single atomic SQL statement closes the exact gap that causes the bug
- A remaining trap that atomicity alone doesn't fix: check-then-act across two statements

## The question
Four threads each subtract $1 from Pixar's budget, 50 times each — 200 total decrements from a starting budget of 1000. What should the final budget be? What do you think it actually will be, if each decrement is done as "read the current value, subtract 1, write it back"?

## 1. Predict
Write your prediction down before reading further: 800 exactly, or something else? If something else, higher or lower than 800?

## 2. Try it
```python
import sqlite3, threading, time, os

db_path = "race_demo.db"
if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
conn.execute("CREATE TABLE studios (name TEXT, budget INTEGER)")
conn.execute("INSERT INTO studios VALUES ('Pixar', 1000)")
conn.commit()
conn.close()

def naive_decrement(n):
    conn = sqlite3.connect(db_path, timeout=30)
    for _ in range(n):
        row = conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        current = row[0]
        time.sleep(0.0001)  # exaggerates the gap so the race actually shows up
        conn.execute("UPDATE studios SET budget = ? WHERE name=?", (current - 1, "Pixar"))
        conn.commit()
    conn.close()

threads = [threading.Thread(target=naive_decrement, args=(50,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

conn = sqlite3.connect(db_path)
final = conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()[0]
print("expected: 1000 - 200 = 800, actual final budget:", final)
```

### What this code does
- `threading.Thread(target=naive_decrement, args=(50,))` — creates a thread that will run `naive_decrement(50)` concurrently with the others, once started. Four threads means up to four of these decrement sequences genuinely running at (approximately) the same time, not one after another.
- Each thread opens its **own** connection (`sqlite3.connect(db_path, ...)` inside the function) — a real, necessary detail: a single `sqlite3` connection object is not safe to share across threads by default, so each thread getting its own connection to the same underlying file is the correct setup, not an oversight.
- `row = conn.execute("SELECT ...").fetchone()` then `current = row[0]` — reads the current budget into a plain Python variable. At this exact moment, `current` is a snapshot — it has no ongoing connection to the database; if the real value changes a microsecond later, `current` doesn't know.
- `time.sleep(0.0001)` — a deliberately inserted pause between the read and the write. This isn't cheating to force a bug that wouldn't otherwise exist — it's exaggerating a gap that's *always present*, even without a sleep, just usually too microscopically brief to reliably observe. The bug is real either way; the sleep just makes it show up reliably instead of only occasionally.
- `conn.execute("UPDATE ... SET budget = ?", (current - 1, ...))` — writes back `current - 1`, based entirely on the value read earlier, regardless of what the budget might have become in the meantime due to another thread's write.

### What happens
This is real, actually-measured output:
```
expected: 1000 - 200 = 800, actual final budget: 950
```
Not 800 — **950**. Somewhere in the process, 150 of the 200 intended decrements simply vanished. If your prediction was "something other than 800, and higher," that's exactly right, and worth sitting with why "higher" specifically makes sense here (a lost decrement means a subtraction that should have happened, didn't — always pushing the result up, never down, for this particular bug).

## 3. Why?
### Code mechanics — the actual race
Picture two threads, A and B, both hitting the gap between read and write at close to the same moment:
```
Thread A: reads budget = 1000
Thread B: reads budget = 1000        ← B reads the SAME value, before A has written anything back
Thread A: writes budget = 999
Thread B: writes budget = 999        ← B overwrites with its own stale calculation
```
Two decrements happened — two `UPDATE` statements genuinely ran — but the final value only reflects *one* of them, because B's write was computed from a value that was already about to be out of date. This is the textbook "lost update": not a corrupted value, not a crash, just a completely valid-looking number that's quietly wrong because it doesn't account for work that legitimately happened.

### Runtime behavior
This isn't a SQLite bug or a Python bug — SQLite executed every individual `SELECT` and `UPDATE` correctly, exactly as asked. The race lives entirely in the *gap between two separate statements* in your own code — a gap during which the world can change without your code knowing.

### Mental model
```
read → [gap: anything can happen here] → write
                    ↑
     another thread's entire read-modify-write cycle
     can fit inside this gap, and its result gets silently discarded
```

## 4. Fix — collapse the gap with one atomic statement
```python
def atomic_decrement(n):
    conn = sqlite3.connect(db_path, timeout=30)
    for _ in range(n):
        conn.execute("UPDATE studios SET budget = budget - 1 WHERE name='Pixar'")
        conn.commit()
    conn.close()
```
```
expected: 1000 - 200 = 800, actual final budget: 800
```
Exactly 800, every time. `UPDATE studios SET budget = budget - 1` performs the read, the subtraction, and the write **as a single statement handled entirely by the database engine** — there is no gap in your own code for another thread's write to sneak into, because the arithmetic never leaves the database to sit in a Python variable at all. The database serializes these single-statement writes against each other, so each one sees the genuinely current value at the instant it runs.

### What changed vs. what did not
The table, the threads, the number of decrements, the starting budget — identical. The only change is *where the arithmetic happens*: in Python (with a gap) versus inside the single SQL statement (with no gap). That's the entire fix.

## 5. Trap
**Normal rule:** a single atomic `UPDATE ... SET x = x - 1` statement has no race condition.
**Apparently equivalent code:** extending the logic to "don't let the budget go negative" by adding a check first:
```python
row = conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
if row[0] >= 1:
    conn.execute("UPDATE studios SET budget = budget - 1 WHERE name='Pixar'")
    conn.commit()
```
**Surprising result:** this reintroduces the exact same race, even though the actual decrement is once again a single atomic statement.
**Exact reason:** the *check* (`SELECT ... if row[0] >= 1`) and the *act* (the `UPDATE`) are still two separate steps with a gap between them — this is called a "check-then-act" or "time-of-check to time-of-use" (TOCTOU) race. Two threads can both check and see `budget = 1`, both conclude "yes, safe to decrement," and both proceed — resulting in a budget of `-1`, the exact outcome the check was meant to prevent.
**Project consequence:** atomicity has to cover the *entire* decision, not just the arithmetic. The genuinely safe version keeps the whole check-and-act inside one statement: `UPDATE studios SET budget = budget - 1 WHERE name='Pixar' AND budget >= 1` — now the condition and the write happen together, atomically, and you check `cursor.rowcount` afterward to see whether a row actually matched and got updated (if `budget` was already 0, zero rows match, the `UPDATE` does nothing, and `rowcount` is 0 — a clean, race-free way to detect "the decrement didn't happen because it wasn't allowed").

## Exercise
- **Predict:** Using the safe combined-condition `UPDATE ... WHERE budget >= 1` from the trap fix, if two threads race to decrement a budget currently at exactly 1, how many of them actually succeed (have `rowcount == 1`), and how many get `rowcount == 0`?
- **Modify:** Rerun the original naive race demo with only 1 thread instead of 4. Does the lost-update bug still occur? Reason about why the number of concurrent threads matters here at all.
- **Break:** In the safe version, remove `AND budget >= 1` but keep checking `cursor.rowcount` afterward. Does removing the condition bring back the negative-budget problem, the lost-update problem, both, or neither?
- **Repair:** Put the condition back, and explain in one sentence why checking `rowcount` after the fact is meaningfully different from checking the budget value beforehand.
- **Trace:** Walk through the naive race demo's exact interleaving that would produce a final budget of 950 rather than 800 — how many "lost" decrements does that number imply, and does that match roughly what you'd expect from 4 threads each hitting a small timing window repeatedly?

## What to remember
- A "lost update" happens when a read-modify-write cycle spans multiple statements with a gap another writer can use — the individual operations aren't wrong, the gap between them is the bug.
- Collapsing read-modify-write into one atomic statement (`SET x = x - 1`, not "read x, compute, write back") removes the gap entirely.
- Atomicity of the *write* doesn't protect a separate *check* performed beforehand — check-then-act needs the condition folded into the same atomic statement, not just the arithmetic.
- `cursor.rowcount` after a conditional `UPDATE` tells you, race-free, whether the condition actually held at the moment the update ran.

## Next lesson
This closes out the systems/database arc that started back at Lesson 7 — parsing through querying through transactions through concurrency is a genuinely complete slice of what "working with data as a real engineer" means. From here, the ML track is wide open, and it starts with a dataset shaped exactly like the one you've been building this whole time — say the word whenever you're ready to switch.
