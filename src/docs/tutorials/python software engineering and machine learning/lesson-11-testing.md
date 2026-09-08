# Lesson 11 — Testing: How You Actually Know It Works

## What you'll learn
- Why "I ran it and it looked right" doesn't scale past a few functions, and stops working entirely once you change old code
- The mechanics of `unittest`: test discovery, assertions, pass/fail reporting
- A real, captured bug caused by tests sharing state — and why it's specifically dangerous because individual tests can look completely reasonable in isolation
- How to isolate tests properly so each one starts from a known, fresh state

## The question
Lesson 10's `transfer_budget` has a real correctness property worth guaranteeing forever: a failed transfer must leave both budgets completely unchanged. You verified this once, by eye, in Lesson 10. What happens six months from now when you refactor `transfer_budget` and don't remember to check that property again by hand?

## 1. Predict
```python
import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(2 + 2, 4)

unittest.main()
```
Before running: how does `unittest` know `test_addition` is a test to run, given that nothing here explicitly registers it anywhere?

## 2. Try it
```python
import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(2 + 2, 4)

    def test_addition_wrong_on_purpose(self):
        self.assertEqual(2 + 2, 5)

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

### What this code does
- `class TestMath(unittest.TestCase):` — inheriting from `TestCase` is what makes a class "a set of tests" to `unittest` — it provides the `assertEqual` method and everything needed for discovery and reporting.
- **Test discovery by naming convention**: `unittest` finds test methods by looking for names starting with `test_` inside any `TestCase` subclass — no manual registration list anywhere. This is why the method name matters, not just its content; a method named `check_addition` would be silently ignored entirely, run zero times, with no warning that it exists.
- `self.assertEqual(2 + 2, 4)` — compares the two values; if they're equal, nothing visible happens and the test is recorded as passed. If they're *not* equal, `assertEqual` raises a special exception internally that `unittest` catches and reports as a failure, along with both values, so you can see exactly what didn't match.
- `unittest.main(verbosity=2)` — runs every discovered test in the file and prints a report; `verbosity=2` prints each test's name and result individually, rather than just a final summary.

### What happens
```
test_addition (__main__.TestMath.test_addition) ... ok
test_addition_wrong_on_purpose (__main__.TestMath.test_addition_wrong_on_purpose) ... FAIL

======================================================================
FAIL: test_addition_wrong_on_purpose (__main__.TestMath.test_addition_wrong_on_purpose)
----------------------------------------------------------------------
AssertionError: 4 != 5

----------------------------------------------------------------------
Ran 2 tests in 0.000s

FAILED (failures=1)
```
One passed, one failed, and the failure report tells you exactly what was expected versus what was found — `4 != 5` — without you writing any print statements to inspect that yourself.

## 3. Why?
### Code mechanics
A test function is genuinely just a function — `unittest` runs it like any other call, and `assertEqual` is just a method that raises an exception on mismatch. There's no special magic beyond: discover methods named `test_*`, run each one inside a `try`, catch any raised assertion (or any other exception at all — a genuine bug in the code under test, not just a wrong assertion, also shows up as a failed test), and report the results.

### Mental model
```
unittest.main()
   ↓ scans TestCase subclasses for methods starting with "test_"
   ↓ for each: run it
        assertion holds  → recorded as PASS
        assertion fails  → recorded as FAIL, with expected vs actual
        any other exception → recorded as ERROR
   ↓ prints a summary of all results
```

## 4. Change one thing — testing the real function
```python
import sqlite3
import unittest

def transfer_budget(conn, from_studio, to_studio, amount):
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE studios SET budget = budget - ? WHERE name = ?", (amount, from_studio))
        cursor.execute("UPDATE studios SET budget = budget + ? WHERE name = ?", (amount, to_studio))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False

# a shared connection, created once, reused by every test below
shared_conn = sqlite3.connect(":memory:")
shared_conn.execute("CREATE TABLE studios (name TEXT, budget INTEGER)")
shared_conn.execute("INSERT INTO studios VALUES ('Pixar', 1000)")
shared_conn.execute("INSERT INTO studios VALUES ('Ghibli', 500)")
shared_conn.commit()

class TestTransfer(unittest.TestCase):
    def test_transfer_success(self):
        transfer_budget(shared_conn, "Pixar", "Ghibli", 200)
        row = shared_conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        self.assertEqual(row[0], 800)

    def test_transfer_again_from_fresh_assumption(self):
        transfer_budget(shared_conn, "Pixar", "Ghibli", 100)
        row = shared_conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        self.assertEqual(row[0], 900)

if __name__ == "__main__":
    unittest.main(verbosity=2)
```
Both tests look individually correct: start with Pixar at 1000, transfer some amount, check the resulting balance matches. Run it and see what actually happens — this is real, captured output, not a hypothetical:
```
test_transfer_again_from_fresh_assumption ... Pixar budget is actually: 900
ok
test_transfer_success ... FAIL

======================================================================
FAIL: test_transfer_success
----------------------------------------------------------------------
AssertionError: 700 != 800
```
`test_transfer_success` — the test that looks obviously correct on its own — fails. Reading top to bottom in the file doesn't explain this at all; the tests ran in a *different order* than they're written (`unittest` runs test methods alphabetically by name: `test_transfer_again_...` sorts before `test_transfer_success`). The "again" test ran first, transferring 100 and leaving Pixar at 900 — then "success" ran second, transferring 200 from an already-reduced 900, landing on 700, not the 800 it expected based on assuming a fresh starting balance of 1000.

## 5. Why this is dangerous specifically
### Code mechanics
`unittest`'s alphabetical test ordering isn't documented as something you should rely on avoiding — it's simply not something most people think to check, because each *individual* test method, read on its own, contains nothing wrong. The bug isn't in either test's logic — it's in the assumption, invisible in the code, that `shared_conn` starts fresh for every test. That assumption was true by coincidence when there was only one test, and silently stopped being true the moment a second one was added.

### Why it's worse than a normal bug
A wrong assertion or a genuine code bug tends to fail loudly and consistently — every time you run it, same result. A shared-state bug like this can pass or fail depending on execution order, which test framework version you're using, whether you ran one test file alone versus the whole suite, or even just how many other tests happen to run first. That non-determinism is exactly what makes these bugs notorious for wasting hours: "it passed when I ran it alone" is real, and also not evidence of correctness.

## 6. Repair — isolating tests properly
```python
import sqlite3
import unittest

class TestTransfer(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.execute("CREATE TABLE studios (name TEXT, budget INTEGER)")
        self.conn.execute("INSERT INTO studios VALUES ('Pixar', 1000)")
        self.conn.execute("INSERT INTO studios VALUES ('Ghibli', 500)")
        self.conn.commit()

    def test_transfer_success(self):
        transfer_budget(self.conn, "Pixar", "Ghibli", 200)
        row = self.conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        self.assertEqual(row[0], 800)

    def test_transfer_again_from_fresh_assumption(self):
        transfer_budget(self.conn, "Pixar", "Ghibli", 100)
        row = self.conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        self.assertEqual(row[0], 900)

    def test_failed_transfer_leaves_state_unchanged(self):
        transfer_budget(self.conn, "Nonexistent Studio", "Ghibli", 200)
        pixar = self.conn.execute("SELECT budget FROM studios WHERE name='Pixar'").fetchone()
        ghibli = self.conn.execute("SELECT budget FROM studios WHERE name='Ghibli'").fetchone()
        self.assertEqual(pixar[0], 1000)
        self.assertEqual(ghibli[0], 500)

if __name__ == "__main__":
    unittest.main(verbosity=2)
```

### Code walkthrough
- `def setUp(self):` — a special method name `unittest` calls automatically **before every single test method**, not just once for the whole class. This is the actual fix: each test now gets a brand-new `self.conn`, freshly created and seeded, with no memory of any other test having run.
- `self.conn` instead of a module-level `shared_conn` — attaching the connection to `self` (the specific test instance) rather than a shared global means two tests can never see each other's leftover data, because they're never touching the same object at all.
- `test_failed_transfer_leaves_state_unchanged` — this is the actual correctness property from Lesson 10 finally written down as a real, permanent, automatically-checked test: transferring from a studio that doesn't exist should fail cleanly and leave *both* balances exactly where they started. This test will now catch it immediately, automatically, forever, if a future change to `transfer_budget` ever breaks that guarantee — without you needing to remember to check it by hand again.

### Why this design?
`setUp`'s per-test isolation trades a small amount of repeated setup work (recreating the table for every single test) for the guarantee that no test's result depends on which other tests happened to run, or in what order — turning the exact bug from step 4 into something structurally impossible to reintroduce.

## 7. Trap
**Normal rule:** each test method is independent and can be reasoned about on its own.
**Apparently equivalent code:** step 4's version, using a shared connection created once at module scope, "for efficiency" or simply out of not thinking about it.
**Surprising result:** correct-looking tests fail or pass depending on file-scan order, a detail nothing in either test's own code reveals.
**Exact reason:** shared mutable state (the connection, and the data inside it) turns test *order* into a hidden input that both tests silently depend on without declaring it anywhere.
**Project consequence:** this is one of the most common real causes of "flaky tests" — tests that pass sometimes and fail other times with no code changes at all — and the fix is essentially always the same: give each test its own isolated state via `setUp` (or equivalent fixtures in other frameworks), never assume execution order, and never let one test's side effects be visible to another.

## Exercise
- **Predict:** If `setUp` creates a fresh `self.conn` per test, and you add a 4th test that also calls `transfer_budget`, does its result depend at all on what order it runs relative to the other three?
- **Modify:** Add a test verifying that `transfer_budget` returns `False` (not just that the state is unchanged) when given a nonexistent studio.
- **Break:** Remove `setUp` and put the connection creation back at module scope, but keep the three current tests. Run them multiple times, in different orders (unittest lets you specify: `python -m unittest test_module.TestTransfer.test_transfer_success test_module.TestTransfer.test_transfer_again_from_fresh_assumption`). Do you get consistent results?
- **Repair:** Put `setUp` back, and explain in one sentence why "just run the tests in the right order" is not an acceptable alternative fix to isolating them properly.
- **Trace:** Walk through exactly what `self.conn` refers to across all three tests in the fixed version — is it the same object for `test_transfer_success` and `test_transfer_again_from_fresh_assumption`, or two entirely separate ones?

## What to remember
- `unittest` discovers tests purely by method name (`test_*`) inside a `TestCase` subclass — no manual registration.
- A failing assertion and a genuine code exception are both reported as test failures, but tracked as distinct outcomes (`FAIL` vs `ERROR`).
- Shared mutable state between tests creates order-dependent, non-deterministic bugs — individually reasonable-looking tests can still fail because of what ran before them.
- `setUp` runs fresh before every test method — use it to guarantee isolation, not just to avoid repeating setup code.

## Next lesson
Still open: deeper concurrency (what real race conditions look like when two separate processes touch the same data at once — a natural next step after seeing how even *sequential* shared state caused bugs here), or starting the ML track using everything built so far. Your call whenever you're ready.
