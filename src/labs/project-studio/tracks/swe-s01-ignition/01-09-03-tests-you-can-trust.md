---
title: "Tests You Can Trust: Determinism, Isolation and Fixtures"
runtime: python
---

Kit has 78 tests, and they all pass. Run them from the course folder instead of from inside `kit`, and they don't even start: two test files can't import the code they test. Fix that, and two more fail because they can't find `count.py`. Nothing about Kit changed. Only the folder you stood in did. A test that passes or fails depending on *where* it runs, *when*, or *what ran before it* tells you about those things instead of about the code. This lesson removes the hidden inputs from Kit's tests. It covers the working folder, the import path, files shared between tests, the order tests run in, and a source of randomness Python adds by itself. It also teaches **fixtures**, `pytest`'s way of giving each test exactly what it needs, fresh every time.

**By the end you can:**

- Find a test's hidden inputs by changing them on purpose: the folder it runs from, the order, the run itself.
- Write a fixture, share it in `conftest.py`, and use `pytest`'s `tmp_path` for files a test makes.
- Recognise the common sources of nondeterminism in tests, and remove them.
- Keep test inputs as fixture files in the repository, found from the test's own location.

**You need:** 01-09-01 and 01-09-02 (Kit's tests), 01-01-02 (hidden inputs and determinism), 01-06-05 (Kit installed with `pip install -e .`). Commands run inside `kit` unless a step says otherwise.

## Run it from somewhere else

Go up to the course folder, and run Kit's tests from there:

| Windows (PowerShell) | macOS or Linux |
|---|---|
| `cd ..; kit/.venv/Scripts/python -m pytest kit` | `cd ..; kit/.venv/bin/python -m pytest kit` |

```
ERROR kit\tests\test_bases.py
ERROR kit\tests\test_pack.py
!!!!!!!!!!!!!!!!!!! Interrupted: 2 errors during collection !!!!!!!!!!!!!!!!!!!
2 errors in 0.42s
```

Above the summary: `ModuleNotFoundError: No module named 'bases'`, and the same for `pack`. Read the evidence closely, because it's odd. `test_count.py` imports `count` and works. `test_bases.py` imports `bases` and fails. The difference is 01-06-05: `count`, `filter`, `csvtool`, `hexdump`, `kitargs` and `tree` are in `pyproject.toml`'s `py-modules`, so `pip install -e .` made them importable from anywhere. `bases` and `pack` aren't. Inside `kit`, `python -m pytest` adds the current folder to the import path, so everything was found. That was a hidden input too.

Say where the code is, once, in `pyproject.toml`. Add this table at the end of the file:

```
[tool.pytest.ini_options]
# Tests import Kit's modules from this folder, wherever pytest is started.
pythonpath = ["."]
```

`pytest` reads its settings from `pyproject.toml` (its header says `configfile: pyproject.toml`). `pythonpath` paths are relative to that file, so `"."` means `kit`, wherever you start. Save it and run the same command again, from the course folder:

```
FAILED kit\tests\test_cli.py::test_json_flag_anywhere[args0] - AssertionError...
FAILED kit\tests\test_cli.py::test_json_flag_anywhere[args1] - AssertionError...
2 failed, 76 passed in 1.13s
```

The imports work. 01-09-02 promised one test that passes only inside `kit`, and here it is. Its failure message is `count.py`'s error output:

```
can't open file 'C:\\Users\\you\\swe\\count.py': [Errno 2] No such file or directory
```

`test_cli.py` runs `count.py samples/hello.txt`, two paths relative to the **working folder**, which is wherever you started `pytest`. The test had a third input besides its arguments, the folder, and no one had written it down. Go back into `kit` (`cd kit`). The next two steps fix it.

```check
contains kit/pyproject.toml "pythonpath = [\".\"]" -- Add [tool.pytest.ini_options] with pythonpath = ["."] to pyproject.toml.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; os.chdir('..'); out = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--collect-only', 'kit'], capture_output=True, text=True).stdout; print('ModuleNotFoundError' in out, 'during collection' in out)\"" stdout="False False" -- From the course folder, every test file should now be collected without import errors.
```

## Fixtures

The fix is to make the test say which folder it runs `count.py` in. Several tests will need to run Kit's programs, so write the know-how once, as a **fixture**. A fixture is a function marked `@pytest.fixture`. When a test lists a parameter with the fixture's name, `pytest` calls the fixture and passes in what it returns. A file called **`conftest.py`** in the tests folder holds fixtures that every test file there can use, without importing anything:

```python file=kit/tests/conftest.py
import subprocess
import sys
from pathlib import Path

import pytest

# The kit folder: the one this file's folder (tests) is in, wherever pytest
# was started from.
KIT = Path(__file__).resolve().parent.parent


# A fixture: a test that names run_kit as a parameter gets this function,
# which runs one of Kit's programs from inside the kit folder.
@pytest.fixture
def run_kit():
    def run(*args):
        command = [sys.executable, *[str(arg) for arg in args]]
        return subprocess.run(command, cwd=KIT, capture_output=True, text=True, check=False)

    return run
```

Two ideas carry it. **`Path(__file__)`** is the path of the file the code is in, so `KIT` comes from where the *test* is, not from where `pytest` was started: `tests/conftest.py`, then its folder `tests`, then *that* folder's folder, `kit`. And **`cwd=KIT`** runs the program with `kit` as its working folder, so its own relative paths (`samples/hello.txt`) mean what they always did. The fixture returns a function, a closure over `KIT` (01-05-03). `str(arg)` lets a test pass `Path` objects as well as text.

```check
run "cd kit; git status --porcelain tests/conftest.py" stdout="conftest.py" -- Create tests/conftest.py with the run_kit fixture.
run "cd kit; .venv/Scripts/python -m pytest -q --fixtures tests" stdout="run_kit" -- pytest should list run_kit among the fixtures available to Kit's tests.
```

## Using the fixture

Now `test_cli.py` asks for `run_kit` instead of building the command itself:

```python file=kit/tests/test_cli.py
import json

import pytest


# A regression test for 01-08-04's bug report: count crashed when --json came
# after the file name. It runs count.py the way the user did, both ways round.
@pytest.mark.parametrize("args", [["--json", "samples/hello.txt"], ["samples/hello.txt", "--json"]])
def test_json_flag_anywhere(run_kit, args):
    result = run_kit("count.py", *args)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["bytes"] == 7
```

The test lists `run_kit` beside `args`. `pytest` sees that `run_kit` is a fixture and `args` a parameter, and supplies both. Save it, and run the tests from both places: `.venv/bin/python -m pytest -q` inside `kit` (`78 passed`), and the course-folder command from the first step (`78 passed`).

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_cli.py" stdout="2 passed" -- test_cli.py should pass from inside kit.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; os.chdir('..'); r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'kit'], capture_output=True, text=True); print(r.returncode == 0)\"" stdout="True" -- Every test should pass when pytest is started from the course folder.
```

## A fresh folder for each test

Some tests need files of their own. Writing them into `kit` leaves them behind, where `git status` lists them and the next run finds them already there. Two tests writing the same name then interfere with each other. `pytest` has a built-in fixture for this, **`tmp_path`**: a new, empty folder for each test, somewhere outside the project, as a `Path`. Test `ips.py` (01-06-03) both ways, as a function and as a program reading a file:

```python file=kit/tests/test_ips.py
from ips import addresses

LOG = "from 10.0.0.2 to 10.0.0.1, then 10.0.0.2 again, and 192.168.1.9 (version 1.4.2)\n"


# Each address once, in the order it first appears; a version number isn't one.
def test_addresses_in_order_of_first_appearance():
    assert addresses(LOG) == ["10.0.0.2", "10.0.0.1", "192.168.1.9"]


# tmp_path is a fixture pytest provides: a new, empty folder for each test.
def test_ips_reads_a_file(tmp_path, run_kit):
    log = tmp_path / "server.log"
    log.write_text(LOG, encoding="utf-8")
    result = run_kit("ips.py", log)
    assert result.stdout.split() == ["10.0.0.2", "10.0.0.1", "192.168.1.9"]
```

The second test uses two fixtures, one built in and one of Kit's. It writes its log into its own folder and passes the full path, so `ips.py` finds it from `kit`. Save it, run `.venv/bin/python -m pytest -q` (`80 passed`), then `git status`. The only new files are the test files themselves. `pytest` keeps the last few runs' temporary folders for you to inspect after a failure, and deletes older ones.

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_ips.py" stdout="2 passed" -- tests/test_ips.py should test addresses directly and through ips.py on a file in tmp_path.
run "cd kit; git status --porcelain" without="server.log" -- No test should leave files in kit.
```

## The same result every time

A **deterministic** test gives the same result every time it runs on the same code (01-01-02). Here's a way to lose that without noticing. `addresses` keeps each address once with `dotted not in found`, which checks the whole list each time. A tempting shortcut is to collect them and remove duplicates at the end with a set. In `ips.py`, change the last line of `addresses`, `return found`, to:

```
    return list(set(found))
```

Run `.venv/bin/python -m pytest -q tests/test_ips.py` four or five times.

```predict
question: What will the repeated runs show?
choice: Both tests fail every time
choice: Both tests pass every time
choice: The results change from run to run
answer: The results change from run to run
explain: A set has no order of its own; list(set(...)) gives the items in an order that depends on their hashes. For text, Python salts the hash with a random value chosen when each Python process starts, so the order changes between runs. The second test runs ips.py in a separate process, with its own salt, so the two tests can fail independently.
```

On this lesson's machine, 12 runs gave `2 failed` 8 times and `1 failed, 1 passed` 4 times. Try it in Python directly. Run this three times:

```
.venv/bin/python -c "print(list({'10.0.0.2', '10.0.0.1', '192.168.1.9'}))"
```

```
['192.168.1.9', '10.0.0.2', '10.0.0.1']
['10.0.0.2', '192.168.1.9', '10.0.0.1']
['10.0.0.1', '10.0.0.2', '192.168.1.9']
```

This is **hash randomisation**. Python's documentation (`object.__hash__`) says `str` and `bytes` hashes are "salted with an unpredictable random value", which stays constant within one process and changes between processes. It's a security measure. Here the test is right and the code is wrong: "in the order they first appear" is the specification, and a set doesn't keep it. A test that fails only *sometimes* is called **flaky**. It's the most expensive kind, because people learn to rerun it until it passes, and then it can't warn anyone. Put `ips.py` back with `git restore ips.py`.

The usual sources of nondeterminism, and the fix for each:

| Source | Example | Make it deterministic |
|---|---|---|
| Set and hash order | `list(set(...))`, iterating a set | Sort, or keep an ordered list (dicts keep insertion order, 01-07-03) |
| File system order | `os.listdir` (arbitrary order, 01-07-03) | `sorted(os.listdir(...))`, as `tree` does |
| Randomness | `random.choice` | Pass in a `random.Random(seed)`, or the values |
| The clock | `datetime.now()` | Pass the time in as an argument; tests give a fixed one |
| Other programs and the network | A server that's slow or down | Test the logic without them (01-09-04, module 2) |
| Timing | Two things that race (module 7) | Don't let tests depend on what finishes first |

```check
contains kit/ips.py "    return found" -- Put addresses back (git restore ips.py).
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_ips.py" stdout="2 passed" -- With the order-keeping version back, the ips tests should pass every time.
```

## Tests that don't need each other

A test should pass alone, in any order, in any company. This file breaks that rule. Add it, as an experiment:

```python file=kit/tests/test_order.py
from ips import addresses

# Two tests that share a list, which the first one fills in.
FOUND = []


def test_collect():
    FOUND.extend(addresses("10.0.0.1 and 10.0.0.2"))
    assert len(FOUND) == 2


def test_first_is_ten_zero_zero_one():
    assert FOUND[0] == "10.0.0.1"
```

Run the whole file, `.venv/bin/python -m pytest -q tests/test_order.py`: `2 passed`. Now run only the second test. A test's id, `FILE::NAME`, selects it:

```
.venv/bin/python -m pytest -q "tests/test_order.py::test_first_is_ten_zero_zero_one"
```

```
E       IndexError: list index out of range
FAILED tests/test_order.py::test_first_is_ten_zero_zero_one - IndexError: lis...
1 failed in 0.17s
```

The second test depended on the first having run, through a list that both can reach. This is **shared state**, the 01-04 problem met again in tests. It passed only because `pytest` runs a file's tests from top to bottom. Run them alone, in another order (plugins such as `pytest-randomly` shuffle on purpose), or in parallel, and it breaks. The cure is **isolation**: each test makes what it needs, or gets it from a fixture, which runs again for every test that asks for it (and `tmp_path` is new each time). Then no test can see another's leftovers. Delete `tests/test_order.py`.

Then commit the test changes, run from any folder:

```
git add pyproject.toml tests
git commit -m "Make Kit's tests pass from any folder, with fixtures"
git push
```

**What else, and why not.**

| Way to give a test what it needs | Cost |
|---|---|
| Build it inside each test | Simple and isolated; repeated in every test that needs the same thing |
| A module-level variable shared by tests | Written once; tests can change it and affect each other |
| A fixture (`@pytest.fixture`, `conftest.py`) | Written once, made fresh for each test; one more thing to look up when reading a test |
| Fixture files in the repository (`tests/data/`) | Exact, reviewable inputs; must be found from the test's location, and kept byte for byte if bytes matter (01-08-01's `.gitattributes`) |

```check
missing kit/tests/test_order.py -- Delete the order-dependent experiment.
run "cd kit; git cat-file -e HEAD:tests/conftest.py" -- Commit tests/conftest.py.
run "cd kit; git cat-file -e HEAD:tests/test_ips.py" -- Commit tests/test_ips.py.
run "cd kit; git show HEAD:pyproject.toml" stdout="pythonpath" -- Commit the pythonpath setting.
run "cd kit; .venv/Scripts/python -c \"import subprocess; git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True); r = git('status', '--porcelain'); print('clean' if r.returncode == 0 and not r.stdout.strip() else r.stdout, git('rev-parse', 'main').stdout == git('rev-parse', 'origin/main').stdout)\"" stdout="clean True" -- Commit and push.
```

## Your turn: top words, from a fixture file

`check_top.py` (01-04-05) compares `dense.top_words(lines, n)` with `plain.plain_top_words`, the readable version, on combinations of five short lines, and, like its cousins, never fails. Write `tests/test_top.py` with:

1. A **fixture file**, `tests/data/story.txt`, holding exactly these three lines:

   ```
   The cat sat on the mat.
   The dog sat on the log, and the cat ran.
   A cat, a dog, 2 birds.
   ```

2. A fixture, `story`, that reads that file's lines, found from the test file's own location (so the test passes from any folder), and a test that `top_words(story, 3)` is the top three you count **by hand** from the definition in `plain.py`.
3. The sweep from `check_top.py`, as a test, with `plain_top_words` as the oracle.

Your tests must fail if `top_words` forgets to sort ties alphabetically, and if it forgets to skip words with digits or punctuation. Remove `check_top.py`, check from the course folder, and commit.

```hints
nudge: Count by the rule in plain.py's comment: a word is a run of letters between spaces, case doesn't matter, and anything with a digit or punctuation in it isn't a word. "mat." has a full stop, so it isn't one. Then the ties: equal counts go alphabetically.
concept: DATA = Path(__file__).resolve().parent / "data" finds tests/data from the test file, like KIT in conftest.py. A fixture returns (DATA / "story.txt").read_text(encoding="utf-8").splitlines(). The words: the 5, then a, cat, on, sat 2 each (alphabetical: a, cat, on, sat), then dog and and 1 each. The top three are the, a, cat.
shape: @pytest.fixture def story(): return the lines. def test_top_three_in_the_story(story): assert top_words(story, 3) == ["the", "a", "cat"]. Then SAMPLES and @pytest.mark.parametrize("n", range(5)) over a test that loops itertools.product(SAMPLES, repeat=count) for count in range(4) and asserts top_words(lines, n) == plain_top_words(lines, n).
answer: tests/data/story.txt holds the three lines. tests/test_top.py:
~~~python
import itertools
from pathlib import Path

import pytest

from dense import top_words
from plain import plain_top_words

DATA = Path(__file__).resolve().parent / "data"


# A fixture: the lines of a small story kept as a fixture file in tests/data.
@pytest.fixture
def story():
    return (DATA / "story.txt").read_text(encoding="utf-8").splitlines()


# Counted by hand: "the" 5 times; "a", "cat", "on" and "sat" twice each, so
# alphabetical among themselves. "mat." and "log," have punctuation: not words.
def test_top_three_in_the_story(story):
    assert top_words(story, 3) == ["the", "a", "cat"]


SAMPLES = ["", "a b a", "B b", "x1 y", "c, c"]


# The dense version against the plain one (01-04-05) as the oracle.
@pytest.mark.parametrize("n", range(5))
def test_dense_agrees_with_plain(n):
    for count in range(4):
        for lines in itertools.product(SAMPLES, repeat=count):
            assert top_words(lines, n) == plain_top_words(lines, n), lines
~~~
6 tests; 86 in all. Then git rm check_top.py, git add tests, git commit, git push. run_checks.py reports 3 of 3 (check_can_match, Ruff, pytest). The tempting slip in the hand count is "the" 4 times (forgetting that "The" and "the" are one word) or counting "mat." as "mat"; another is opening "tests/data/story.txt" by a relative path, which works only from inside kit, the problem this lesson started with.
```

```check
run "cd kit; .venv/Scripts/python -m pytest -q tests/test_top.py" stdout="passed" without="failed" -- tests/test_top.py should pass.
run "cd kit; .venv/Scripts/python -c \"import pathlib; print(pathlib.Path('tests/data/story.txt').read_text(encoding='utf-8').split())\"" stdout="'The', 'cat', 'sat', 'on', 'the', 'mat.', 'The', 'dog', 'sat', 'on', 'the', 'log,', 'and', 'the', 'cat', 'ran.', 'A', 'cat,', 'a', 'dog,', '2', 'birds.'" -- tests/data/story.txt should hold the three lines of the story.
run "cd kit; .venv/Scripts/python -c \"import pathlib, shutil, subprocess, sys, tempfile; src = pathlib.Path('dense.py').read_text(encoding='utf-8'); muts = [('key=lambda p: (-p[1], p[0]),', 'key=lambda p: -p[1],'), ('if w.isalpha()', 'if True')]; run = lambda code: (lambda t: (shutil.copytree('tests', pathlib.Path(t.name, 'tests')), shutil.copy('plain.py', t.name), pathlib.Path(t.name, 'dense.py').write_text(code, encoding='utf-8'), subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'tests/test_top.py'], cwd=t.name, capture_output=True).returncode, t.cleanup())[3])(tempfile.TemporaryDirectory()); print(run(src) == 0, [run(src.replace(o, n, 1)) != 0 if o in src else 'cannot mutate' for o, n in muts])\"" stdout="True [True, True]" -- Your tests should pass on dense.py, and fail when ties aren't alphabetical or when words with digits and punctuation count.
run "cd kit; .venv/Scripts/python -c \"import os, subprocess, sys; os.chdir('..'); r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'kit/tests/test_top.py'], capture_output=True, text=True); print(r.returncode)\"" stdout="0" -- tests/test_top.py should pass when pytest starts from the course folder (find story.txt from the test file).
run "cd kit; git cat-file -e HEAD:check_top.py" exit=128 -- check_top.py should be removed in a commit.
run "cd kit; git cat-file -e HEAD:tests/data/story.txt" -- Commit the fixture file.
run "cd kit; .venv/Scripts/python run_checks.py" stdout="3 of 3 passed" -- run_checks.py should run check_can_match.py, Ruff and pytest.
```

**What these checks establish, and what they don't.** They check that Kit's tests now pass from the course folder as well as from inside `kit`, that the ips tests keep the first-appearance order, that no test leaves files in the project, and that your top-words tests read their fixture file from their own location and catch two specific breaks. They can't prove that the tests are free of hidden inputs: three were found here, and a fourth could be waiting, such as a test that passes only on Windows or only in one time zone. The habit that finds them is the one from this lesson: change the conditions on purpose, and see whether the result changes. Run a test alone, run them from another folder, and run them again.

## What you can do now

- A test's **hidden inputs** (the working folder, the import path, files left by other tests, the order, random values, the clock) make its result say something about them instead of the code. Change each on purpose to find them.
- **Fixtures** give a test what it needs by naming a parameter: `@pytest.fixture` functions, shared through `conftest.py`, made fresh for each test. `tmp_path` is a built-in one: a new folder for each test.
- Find files from the test's own location (`Path(__file__)`), and run programs with an explicit working folder (`cwd=`). Say where code is imported from (`pythonpath` in `pyproject.toml`).
- A **deterministic** test gives the same result every run. Set order, `os.listdir` order, randomness and the clock are the usual culprits. A **flaky** test fails only sometimes, and is worse than none.
- **Isolated** tests pass alone and in any order (`pytest FILE::NAME` runs one). Shared module-level state is the usual culprit.

```predict
question: A test passes on your machine and fails in a colleague's, with the same code. Name three things you'd compare, and how you'd test each guess.
explain: The hidden inputs: the folder they run pytest from (run it from theirs), their Python and package versions (python --version, pip freeze, 01-06-05), their operating system and its line endings or file order (01-08-01's autocrlf; os.listdir), their time zone or locale if dates or text are involved, files that exist on one machine and not the other (a gitignored file the test silently reads, like cases/), and the order or selection of tests they ran (run the test alone). Each guess is tested the same way: change that one condition on your machine and see whether the failure appears.
```

**Next:** 01-09-04 writes tests *before* the code: the red-green-refactor cycle, used to move Blockfall's rotation and line clearing into pure functions that can be tested without a screen, Blockfall's first tests. It also places these tests among the kinds of test there are (unit, integration, end to end), and shows what goes wrong when a test replaces too much of the real code with stand-ins.
