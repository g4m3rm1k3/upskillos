# Lesson 14 — Testing the Data Model with `pytest`, and Why the GUI Isn't Unit-Tested

## What you'll learn
- pytest's core mechanics: plain `assert`, test discovery, fixtures, and `tmp_path` for file-based tests
- A genuinely surprising fact about `assert` in pytest specifically, versus `assert` everywhere else in Python
- A real, common trap: a test that runs without error isn't the same as a test that actually verified anything
- An explicit, reasoned decision about *why* Forge's Qt widgets and pygame rendering are deliberately left out of the automated test suite — argued, not assumed

## What you'll build
A real `tests/` directory covering `GameObject`/`Transform` (Lesson 3),
project save/load (Lesson 13), and undo commands (Lessons 8 and 11) —
plus a written rationale for what's intentionally *not* covered here.

## The question
Every lesson so far has verified its own code by running a script and
reading printed output by eye — `print(a == b)`, watching a window
animate. That doesn't scale, and it doesn't protect you from a future
change accidentally breaking Lesson 3's round trip while you're busy
working on Lesson 12's selection logic. What does automating that
checking actually look like, and — just as importantly — what parts of
this project *can't* be checked this way at all?

---

## 1. Predict

```python
def test_nothing_useful():
    result = 2 + 2
```

If this function is placed in a file named `test_math.py` and you run
`pytest`, do you expect this test to be reported as passing, failing, or
neither? There's no `assert` anywhere in it — form your guess based on
what you think pytest actually checks to decide pass/fail.

---

## 2. Try it

```
pip install pytest
```

```python
# test_model.py
from forge.model import GameObject, Transform


def test_transform_defaults():
    t = Transform()
    assert t.x == 0.0
    assert t.y == 0.0
    assert t.scale == 1.0


def test_game_object_equality():
    a = GameObject(name="Player", transform=Transform(x=1, y=2))
    b = GameObject(name="Player", transform=Transform(x=1, y=2))
    assert a == b


def test_nothing_useful():
    result = 2 + 2
```

Run `pytest test_model.py -v` from the terminal.

### What this code does (mechanical explanation)

**`def test_transform_defaults():`**
pytest discovers tests by **naming convention**, not by registration or a
decorator: any function whose name starts with `test_`, inside a file
whose name starts with `test_` (or ends with `_test.py`), is collected
and run automatically as a test — this is why nothing here is decorated
or imports a base "TestCase" class the way some other testing approaches
require.

**`assert t.x == 0.0`**
A **plain Python `assert` statement** — not a special pytest function.
This is deliberate and is the answer to something you may already be
wondering if you've seen other languages' testing frameworks: pytest
does not need `self.assertEqual(t.x, 0.0)`-style methods; ordinary
`assert expr` is the entire mechanism. If `expr` is falsy, Python raises
`AssertionError`, and pytest treats any test function that raises
*any* exception (including `AssertionError`) during its run as **failed**.

**`assert a == b`**
Directly exercises Lesson 3's generated `__eq__` — this test is, in a
real sense, a permanent, automated version of the very first `print(a ==
b)` from Lesson 3's opening prediction, except now it fails loudly and
specifically if that behavior is ever accidentally broken by a future
change, rather than requiring you to notice a wrong `print` output by eye.

**`def test_nothing_useful():` with no `assert` at all**
This directly answers Section 1's prediction. Run it and see for
yourself: **pytest reports this as `PASSED`.**

---

## 3. Why?

### The mechanism, precisely: pytest defines "pass" as "no exception was raised"

```
pytest's actual rule:
  a test function runs to completion → PASSED (regardless of whether
    it checked anything at all)
  a test function raises AssertionError (or any other exception) →
    FAILED
```

`test_nothing_useful` computes `2 + 2`, assigns it to a local variable,
and returns — nothing about that can possibly raise an exception, so
pytest has genuinely nothing to disagree with. **A test with no assertion
in it is not a weak test — it is not a test at all**, even though pytest
will happily, correctly, report it as passing every single time,
regardless of what the code being "tested" actually does. This is
Section 6's trap waiting to happen the moment a real assertion gets
accidentally deleted, commented out, or simply never written in the first
place — worth internalizing now, before it costs you a real bug slipping
through unnoticed.

### The genuinely surprising part — pytest rewrites your `assert` statements

Ordinary Python's `assert x == y` , if it fails, raises
`AssertionError` with **no details** about what `x` or `y` actually were
— just the bare fact that the condition was false. Pytest's failure
output, by contrast, shows you the actual values on both sides
(`assert 5 == 4` failing shows you `5 != 4` explicitly, sometimes even
diffing structured objects). Python's own `assert` statement doesn't do
this by itself — **pytest's import mechanism rewrites the bytecode of
your test files at import time**, inserting extra instrumentation around
every `assert` so it can capture and report the intermediate values,
before executing them. This is why plain `assert` inside a pytest test
gives you far richer failure output than the exact same `assert`
statement run outside of pytest's test-collection machinery — the
statement in your source file is identical either way; what runs is not.

```
behavior:
  compile_time:
    - "pytest's import hook rewrites test-file bytecode when the file is imported for collection, adding instrumentation around each assert"
  runtime:
    - "plain Python `assert` outside pytest's rewriting only reports that the condition was False, with none of the operand values"
```

---

## 4. Change one thing — parametrizing instead of copy-pasting

```diff
+import pytest
 from forge.model import GameObject, Transform

-def test_transform_defaults():
-    t = Transform()
-    assert t.x == 0.0
-    assert t.y == 0.0
-    assert t.scale == 1.0
-
-def test_game_object_equality():
-    a = GameObject(name="Player", transform=Transform(x=1, y=2))
-    b = GameObject(name="Player", transform=Transform(x=1, y=2))
-    assert a == b
+@pytest.mark.parametrize("x, y", [
+    (0.0, 0.0),
+    (1.0, -1.0),
+    (999.5, -999.5),
+])
+def test_game_object_equality_across_positions(x, y):
+    a = GameObject(name="Player", transform=Transform(x=x, y=y))
+    b = GameObject(name="Player", transform=Transform(x=x, y=y))
+    assert a == b
```

Run `pytest -v` — pytest reports **three separate test results**, one per
`(x, y)` pair, each individually named and individually pass/fail.

### What changed
One test function, decorated with `@pytest.mark.parametrize`, replaces
what would otherwise require three nearly-identical, copy-pasted test
functions differing only in their literal values.

### What did not change
The actual assertion logic (`assert a == b`) — identical to before,
just now run once per parameter set instead of hardcoded to one.

```
change_analysis:
  changed: "one parametrized test function replaces what would be several copy-pasted near-duplicates"
  unchanged:
    - "the equality assertion being checked"
  behavioral_difference:
    - "pytest runs and reports the function three times, once per parameter tuple, each as its own independently pass/fail result"
  compiler_difference:
    - "none"
  runtime_difference:
    - "pytest's collection phase expands one decorated function into N separate test invocations before any of them actually run"
```

**Why this matters for a growing project:** as `GameObject`/`Transform`
gain more fields and more edge cases worth checking (negative values,
zero, very large values), parametrize keeps the *logic* being tested in
exactly one place — a bug in the assertion itself only needs fixing once,
rather than in however many copy-pasted variants have accumulated.

---

## 5. Put it in the project

```python
# tests/test_model.py
from forge.model import GameObject, Transform


def test_transform_defaults():
    t = Transform()
    assert t.x == 0.0
    assert t.scale == 1.0


def test_children_default_factory_is_independent():
    a = GameObject(name="A")
    b = GameObject(name="B")
    a.children.append(GameObject(name="Child"))
    assert len(a.children) == 1
    assert len(b.children) == 0   # regression test for Lesson 3's trap
```

```python
# tests/test_project_file.py
import pytest
from forge.model import GameObject, Transform
from forge.project_file import save_project, load_project, ProjectLoadError


def test_round_trip(tmp_path):
    roots = [GameObject(name="Player", transform=Transform(x=5, y=5))]
    path = tmp_path / "test.forge"

    save_project(path, roots)
    loaded = load_project(path)

    assert loaded == roots


def test_missing_file_raises(tmp_path):
    missing_path = tmp_path / "does_not_exist.forge"
    with pytest.raises(ProjectLoadError):
        load_project(missing_path)


def test_bad_version_raises(tmp_path):
    path = tmp_path / "bad.forge"
    path.write_text('{"version": 999, "roots": []}')
    with pytest.raises(ProjectLoadError):
        load_project(path)
```

```python
# tests/test_commands.py
from PySide6.QtGui import QUndoStack
from forge.model import GameObject, Transform
from forge.commands import SetAttrCommand


def test_set_attr_undo_redo():
    obj = GameObject(name="Player", transform=Transform(x=0.0))
    stack = QUndoStack()

    stack.push(SetAttrCommand(obj.transform, "x", 100.0))
    assert obj.transform.x == 100.0

    stack.undo()
    assert obj.transform.x == 0.0   # regression test for Lesson 8's aliasing trap

    stack.redo()
    assert obj.transform.x == 100.0
```

### Code walkthrough — what's new versus Section 4

**`tmp_path`, as a test function parameter**
This is a **pytest fixture** — a value pytest automatically provides to
any test function that declares a parameter with a matching name, without
you constructing or importing it explicitly. `tmp_path` specifically
provides a fresh, unique, temporary directory (a real `pathlib.Path`,
exactly the type Lesson 5/13 have used throughout) that pytest creates
before the test runs and cleans up afterward — this is precisely what
Lesson 13's file-based save/load tests need: real file I/O, without
littering the actual project directory with test artifacts, and without
tests interfering with each other by writing to the same path.

**`with pytest.raises(ProjectLoadError):`**
A **context manager** provided by pytest specifically for asserting that
a block of code raises a particular exception — the test *passes* if
`load_project(missing_path)` raises `ProjectLoadError` inside this block,
and **fails** if it raises nothing, or raises some *other* exception
instead. This is the correct way to test Lesson 13's error-handling code
directly — asserting on the *presence* of an expected failure, not just
on successful, happy-path behavior.

**`test_children_default_factory_is_independent`**
Notice the comment: `# regression test for Lesson 3's trap`. This test
exists specifically because Lesson 3 demonstrated a real bug class
(shared mutable defaults) and fixed it with `default_factory` — writing a
test that would have **failed** under the old, broken version (a bare
`= []` default) and **passes** under the fixed version is exactly what a
"regression test" means: a permanent, automated guard against a
specific, previously-real bug ever silently coming back, e.g. if someone
refactors `GameObject` later and accidentally reintroduces a shared
default.

**`test_set_attr_undo_redo`**
Similarly a regression test for Lesson 8's trap — `assert obj.transform.x
== 0.0` after `stack.undo()` is precisely the check that would have
**failed** under `BrokenMoveCommand`'s broken aliasing (Lesson 8), since
that version's `undo()` silently did nothing. Writing tests that
specifically target *previously identified, real* traps — rather than
only testing "the obvious happy path" — is a deliberate, valuable testing
habit, not an accident of what happened to get written down.

---

## 6. Trap

**Normal rule (Section 3):** pytest considers a test "passed" purely
because it ran without raising an exception — it has no independent way
to know whether the test actually checked the thing it was meant to.

**Apparently equivalent code** — a test written while in a hurry,
intending to verify that saving and reloading preserves an object's name:

```python
def test_name_preserved(tmp_path):
    roots = [GameObject(name="Player")]
    path = tmp_path / "test.forge"
    save_project(path, roots)
    loaded = load_project(path)
    loaded[0].name == "Player"   # <-- missing `assert`!
```

**Surprising result:** this test passes, every single time, **regardless
of whether `load_project` actually preserves the name correctly or not**
— even if `load_project` were rewritten to always return `GameObject(name="WRONG")`,
this exact test would keep reporting `PASSED`.

**Exact reason:** `loaded[0].name == "Player"` on its own is a complete,
valid Python expression — it computes a boolean value (`True` or `False`)
and then **immediately discards it**, since nothing consumes the result.
No `assert` keyword means no `AssertionError` can ever be raised by this
line, no matter what that boolean value actually is. The test function
runs to completion in every case, and Section 3's rule ("no exception
raised → passed") applies exactly the same way it did to
`test_nothing_useful` in Section 1 — pytest genuinely cannot distinguish
"this checked something and it was true" from "this computed something
and threw the answer away."

**Project consequence:** **every test in this project's suite must
contain at least one `assert` (or `pytest.raises(...)` block) that is
actually reachable during normal execution** — a test file with a typo'd,
accidentally-removed, or forgotten `assert` provides **zero** protection
while looking, at a glance, exactly like every other passing test in the
suite. A useful habit: the first time you write a new test, **temporarily
break the code it's testing on purpose** (comment out the real fix,
reintroduce the old bug) and confirm the test actually turns red — if it
doesn't, the test isn't testing what you think it is, exactly the
technique already implicitly used by this lesson's regression tests
for Lessons 3 and 8's traps.

---

## 7. Why the GUI and pygame rendering are *not* unit-tested here

This is a deliberate scope decision, argued explicitly, not an oversight:

```
design_decision:
  problem: "should ViewportWidget, EditorWindow, and other Qt/pygame-rendering code have automated tests the way the data model does?"
  available_choices:
    - "write automated tests for the GUI layer too, using something like the pytest-qt plugin's qtbot fixture to simulate clicks/drags"
    - "leave GUI/rendering code manually tested (running the app and looking at it) and reserve pytest for the data model and serialization layer only"
  selected_choice: "manual testing for GUI/rendering; pytest for data + serialization + commands"
  reason: "the data model, serialization, and undo commands have precise, checkable correct answers (does a == b, does the file round-trip, does undo restore the old value) — exactly the kind of thing assert is built for. Whether a circle is drawn in the right place, at the right color, at a smooth frame rate is a VISUAL judgment; an automated assert can confirm 'blit was called' or 'the surface is not None,' but cannot confirm 'this looks correct' without image-diffing infrastructure this project doesn't have"
  benefit: "the test suite that does exist is fast, reliable, and catches exactly the class of bug (Lessons 3's and 8's traps, both now permanently regression-tested) most likely to silently reappear during a refactor"
  cost: "a real category of bug — visual/rendering regressions, like Lesson 7's colored-pixel format trap or misaligned frames from Lesson 9's rounding trap — has NO automated safety net and depends entirely on a human noticing something looks wrong"
  future_revisit_condition: "pytest-qt (for simulating widget interaction) or a pixel-diffing visual-regression tool would be the correct next step if this project grows contributors other than yourself, or if rendering bugs start recurring often enough that manual testing alone isn't catching them reliably"
```

This is worth sitting with: **not every correct piece of software has
100% automated test coverage, and deciding what's worth automating is
itself an engineering judgment**, not a given. The data model's
correctness is a factual, checkable question (`assert a == b`); a
sprite's on-screen appearance being "correct" is, without additional
tooling this project doesn't currently have, a question only a human
looking at the screen can actually answer.

---

## 8. Exercise

**Predict:** If `Transform`'s `__eq__` (Lesson 3's generated method) were
somehow broken by a future refactor — say, someone adds `eq=False` to the
`@dataclass` decorator without realizing what that disables — which
specific test(s) written in this lesson would start failing, and which
would keep passing regardless? Reason from what each test actually
`assert`s, not just its name.

**Modify:** Add a parametrized test (Section 4's technique) covering
`SetAttrCommand`'s `mergeWith` from Lesson 11 — construct two commands
targeting the same object and attribute, call `mergeWith`, and assert the
first command's `new_value` was updated to the second's. Parametrize over
at least two different attribute names.

**Break:** Take `test_bad_version_raises` from Section 5, and change
`pytest.raises(ProjectLoadError)` to `pytest.raises(ValueError)` (a type
that does *not* match what `load_project` actually raises). Run it and
read pytest's failure output carefully — does it clearly explain that the
*wrong* exception type was raised, or that *no* exception was raised at
all? Which of those two very different failure explanations does this
particular change actually produce?

**Trace:** Using Section 6's `test_name_preserved` (with the missing
`assert`), rewrite it correctly, then deliberately reintroduce a bug in
`GameObject.from_dict` (e.g., hardcode `name="wrong"` instead of using
`data["name"]`). Confirm the corrected test now fails with a clear pytest
message showing the mismatch between expected and actual values — this is
the "break the code on purpose" verification technique from Section 6,
applied to a test you just wrote yourself.

---

## What to remember
1. pytest discovers tests by naming convention (`test_*.py`, `test_*` functions) and uses plain `assert` — no special assertion methods required.
2. pytest rewrites `assert` statements at import time to produce rich, value-showing failure messages — a genuine difference from how bare `assert` behaves outside of pytest.
3. A test that raises no exception is reported as "passed," **regardless of whether it actually asserted anything** — a missing `assert` produces a permanently, silently passing test with zero protective value.
4. `tmp_path` and `pytest.raises(...)` are the right tools for file-based tests and for asserting that expected errors actually occur.
5. Deciding what to automate-test is itself a real engineering decision — this project's data model, serialization, and undo logic have precise, checkable correctness; its visual rendering does not, without tooling beyond this project's current scope.

## Next lesson
Lesson 15 covers packaging Forge into a distributable build (with
`pyinstaller` or an equivalent), plus swapping `print`-based debugging for
proper `logging` — the last pieces of Phase 8 before Phase 9's export
runtime, which lets a separate, real pygame-ce game load and play back
scenes and animations authored in Forge.
