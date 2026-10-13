---
title: 3.1 — Finding a Bug
track: Frontier — Debugging and Speed
trackOrder: 15.03
runtime: python
support: tests/conftest.py
---

Every program you write in this series will have bugs. That isn't a failure: it's what writing code is like, for everyone. What separates a beginner from a professional is how they find them. A beginner changes things until the problem goes away. A professional follows a **method**:

1. **Reproduce** it: find the smallest run that shows the bug, every time.
2. **Narrow it down**: find where the program first does something you didn't expect.
3. **Make a guess** about the cause, one you could be wrong about.
4. **Test the guess**: predict what the program will do if you're right, and check.

Only then fix it, and keep the reproduction as a test so the bug can't come back. This lesson does all four on a real bug, with a tool made for step 2: the **debugger**, which pauses a running program so you can look inside it. When a model later in the series trains to nonsense, these are the steps you'll follow.

## Someone else's code

**This step: create the supplied file and read it. No code yet.**

A colleague has written a function you need. It counts **pairs** of neighbouring words: in "the cat sat", the pairs are ("the", "cat") and ("cat", "sat"). Counting which word follows which is the start of a language model, and Chapter 28's tokenizer counts pairs too. Click **Create provided src/frontier/pairs.py**:

```python file=src/frontier/pairs.py provided
"""Counting which word follows which: the pairs of neighbouring words in a text."""

PairCounts = dict[tuple[str, str], int]


def count_pairs(words: list[str], counts: PairCounts = {}) -> PairCounts:
    """How often each pair of neighbouring words occurs, added to counts if it's given."""
    for i in range(len(words) - 2):
        pair = (words[i], words[i + 1])
        counts[pair] = counts.get(pair, 0) + 1
    return counts
```

- **`PairCounts`** is a name for a long type, so it can be written once. A dictionary from a pair of words to how often it occurs.
- **`counts`** lets a caller add pairs to a tally they already have, a chapter at a time. Leave it out and the function is meant to start from an empty dictionary.
- The loop visits each position `i` and counts the pair that starts there, using `get` with a default of 0, like `tally` in Chapter 1.

It looks fine, and its author says it works. It has two bugs. If you spot one by reading, good, but most bugs can't be seen by reading, so follow the method anyway.

```check
file src/frontier/pairs.py -- Click "Create provided src/frontier/pairs.py" above.
```

## Reproduce it

The bug report says: "the counts are wrong the second time". The first job is a run that shows it, as small as possible, so it can be repeated in a second. Three words are enough. Create `experiments/pairs_bug.py`, which calls `count_pairs` twice with the same words and prints both results:

```python file=experiments/pairs_bug.py
"""The smallest run that shows count_pairs going wrong."""
from frontier.pairs import count_pairs

words = ["the", "cat", "sat"]
print("first: ", count_pairs(words))
print("second:", count_pairs(words))
```

Run it:

```powershell
.venv\Scripts\python experiments/pairs_bug.py
```

```text
first:  {('the', 'cat'): 1}
second: {('the', 'cat'): 2}
```

That's the report, reproduced: the same words, two different answers. Notice something else, too. Neither line has `('cat', 'sat')`, which is the second pair in "the cat sat". That's the other bug. Write it down and leave it alone: one bug at a time, or you won't know which change fixed what.

```check
run ".venv/Scripts/python experiments/pairs_bug.py" stdout="second:" label="the reproduction runs" -- Import count_pairs from frontier.pairs, and print two calls with the same words.
```

## Make it a test

A reproduction that only you know how to run is easily lost. A test is a reproduction that runs every time anyone runs the tests. Write it now, while it fails, so you see it fail before you trust it.

The test calls `count_pairs` once and throws the answer away, then checks that a second call counts ("the", "cat") once. Create `tests/test_pairs.py`:

```python file=tests/test_pairs.py
# Tests for frontier.pairs (lesson 3.1): every bug found gets a test, so it can't come back.
from frontier.pairs import count_pairs


def test_calls_start_from_nothing():
    count_pairs(["the", "cat", "sat"])
    assert count_pairs(["the", "cat", "sat"])[("the", "cat")] == 1
```

Why not simply `assert count_pairs(words) == count_pairs(words)`? Because it would pass. Both calls return the very same dictionary, as you're about to find out, and a dictionary always equals itself. A test has to check a value you know is right.

Run it, and watch it fail with `assert 2 == 1`:

```powershell
.venv\Scripts\python -m pytest -q tests/test_pairs.py
```

```check
contains tests/test_pairs.py "def test_calls_start_from_nothing" label="the test is written" -- Create tests/test_pairs.py as shown above.
```

## Narrow it down: the debugger

Where does the second call go wrong? You could add `print` lines everywhere, run, read, remove them, and repeat. The debugger is quicker. Python has one built in, and the built-in function `breakpoint()` starts it: when the program reaches that line, it pauses and gives you a `(Pdb)` prompt (pdb is the Python debugger). There you type commands:

| Command | What it does |
|---|---|
| `p counts` | **p**rints the value of any expression, here `counts` |
| `n` | runs the **n**ext line, then pauses again |
| `c` | **c**ontinues until the next `breakpoint()`, or the end |
| `w` | shows **w**here you are: the call stack, from your script down to this line |
| `q` | **q**uits the program |

Add `breakpoint()` as the first line inside `count_pairs`, so it pauses at the start of every call:

```python file=src/frontier/pairs.py
"""Counting which word follows which: the pairs of neighbouring words in a text."""

PairCounts = dict[tuple[str, str], int]


def count_pairs(words: list[str], counts: PairCounts = {}) -> PairCounts:
    """How often each pair of neighbouring words occurs, added to counts if it's given."""
    breakpoint()
    for i in range(len(words) - 2):
        pair = (words[i], words[i + 1])
        counts[pair] = counts.get(pair, 0) + 1
    return counts
```

Now run the reproduction again. It pauses at once, inside the first call, with the `breakpoint()` line shown after `->`:

```powershell
.venv\Scripts\python experiments/pairs_bug.py
```

At the `(Pdb)` prompt, type these one at a time, pressing Enter after each:

1. `p counts` prints `{}`. The first call starts empty, as it should.
2. `c` continues. The first call finishes, `first:` is printed, and the second call pauses at the same line.
3. `p counts` prints `{('the', 'cat'): 1}`. **That's the moment it goes wrong.** The second call hasn't counted anything yet, and its `counts` already holds the first call's pair.
4. `w` shows the call stack: `pairs_bug.py`'s line calling `count_pairs(words)` with no `counts` at all, then this line inside it.
5. `c` lets it finish.

You've narrowed the bug to one fact: a call that passes no `counts` doesn't get an empty dictionary.

```check
contains src/frontier/pairs.py "breakpoint()" label="the breakpoint is in place" -- Add breakpoint() as the first line of count_pairs's body, indented like the for.
run ".venv/Scripts/python experiments/pairs_bug.py" stdin="p counts\nc\np counts\nc\n" stdout="(Pdb) {('the', 'cat'): 1}" label="the second call starts with the first call's pair" -- breakpoint() goes inside count_pairs, before the loop, so it pauses at the start of each call.
```

## A guess, and a test of it

Here's a guess that fits. Lesson 2.2 said that a default value is worked out when the `def` line runs. So `counts: PairCounts = {}` makes **one** dictionary, once, when Python reads the function. Every call that leaves `counts` out gets that same dictionary, and adds to whatever earlier calls left in it. It's the shared-list trap from lessons 2.2 and 2.4, in a function's default this time.

A good guess predicts something you haven't seen yet. If it's right, a third call will find the first two calls' pairs waiting for it.

First take the `breakpoint()` line out of `src/frontier/pairs.py`: it has done its job, and a forgotten one pauses whatever runs the code next, the tests included. Then add a third call to `experiments/pairs_bug.py`:

```python file=experiments/pairs_bug.py
"""The smallest run that shows count_pairs going wrong."""
from frontier.pairs import count_pairs

words = ["the", "cat", "sat"]
print("first: ", count_pairs(words))
print("second:", count_pairs(words))
print("third: ", count_pairs(words))
```

```predict
question: If the guess is right, what does the third line print?
choice: {('the', 'cat'): 1}
choice: {('the', 'cat'): 2}
choice: {('the', 'cat'): 3}
answer: {('the', 'cat'): 3}
explain: All three calls share the one dictionary made when `def` ran. The first call counts the pair once, the second makes it 2, and the third makes it 3. If you'd seen 1, the guess would be wrong, and you'd be back to narrowing it down.
verify: script third_call.py
```

```powershell
.venv\Scripts\python experiments/pairs_bug.py
```

The third line says 3. The guess predicted something new and it came true, so now it's worth fixing.

```check
lacks src/frontier/pairs.py "breakpoint()" label="the breakpoint is gone" -- Delete the breakpoint() line from count_pairs.
run ".venv/Scripts/python experiments/pairs_bug.py" stdout="third:  {('the', 'cat'): 3}" label="the third call shows the guess was right" -- Add print("third: ", count_pairs(words)) after the second print.
```

## The fix

The usual fix is a default of `None`, which means "not given", and a fresh dictionary made inside the function, so each call makes its own. `counts is None` asks whether `counts` is the `None` value. `is` checks for the very same object, and since there's only one `None`, `is None` is the standard way to test for it. The hint becomes `PairCounts | None`, as `winner`'s return type was `str | None`. Change `src/frontier/pairs.py`:

```python file=src/frontier/pairs.py
"""Counting which word follows which: the pairs of neighbouring words in a text."""

PairCounts = dict[tuple[str, str], int]


def count_pairs(words: list[str], counts: PairCounts | None = None) -> PairCounts:
    """How often each pair of neighbouring words occurs, added to counts if it's given."""
    if counts is None:
        counts = {}
    for i in range(len(words) - 2):
        pair = (words[i], words[i + 1])
        counts[pair] = counts.get(pair, 0) + 1
    return counts
```

`{}` now runs on every call that leaves `counts` out, so each one starts from nothing. A caller who passes their own tally still gets it added to. Run the reproduction again: all three lines are the same. Then run the test you wrote while the bug was there:

```powershell
.venv\Scripts\python -m pytest -q tests/test_pairs.py
```

It passes. It failed before the fix and passes after it, so it really does test this bug, and if anyone ever puts the shared default back, it fails again.

```check
run ".venv/Scripts/python -m pytest -q tests/test_pairs.py -k calls" label="each call starts from nothing" -- Default counts to None, and make a new {} inside the function when it is None.
run ".venv/Scripts/python -m mypy --strict src/frontier/pairs.py" stdout="Success" label="mypy --strict passes" -- counts's hint is PairCounts | None.
```

## Your turn: the missing pair

**Build, on your own:** the second bug, by the same method. `count_pairs(["the", "cat", "sat"])` should count both ("the", "cat") and ("cat", "sat"), but it leaves the last pair out.

1. Reproduce it as a test: add `test_last_pair_is_counted` to `tests/test_pairs.py`. It checks that `count_pairs(["the", "cat", "sat"])` equals the whole dictionary it should be, both pairs with a count of 1.
2. Run it and see it fail.
3. Narrow it down. A `breakpoint()` before the loop and `p` on the loop's range is one way; `p list(range(len(words) - 2))` shows every `i` the loop will take. Which positions should it take?
4. Fix `count_pairs`, take out any `breakpoint()`, and run the tests again.

```hints
nudge: Three words have two pairs, starting at positions 0 and 1. How many values of i does the loop give for three words?
concept: range(n) gives 0 up to n - 1. The last pair starts at the second-last word, position len(words) - 2, so the loop needs range(len(words) - 1). The - 2 cuts off the last pair.
answer: In `tests/test_pairs.py`, below the first test:
~~~python
def test_last_pair_is_counted():
    assert count_pairs(["the", "cat", "sat"]) == {("the", "cat"): 1, ("cat", "sat"): 1}
~~~
and in `count_pairs`, the loop becomes `for i in range(len(words) - 1):`.
```

```check
contains tests/test_pairs.py "def test_last_pair_is_counted" label="the bug has a test" -- Add def test_last_pair_is_counted(): to tests/test_pairs.py, checking the whole dictionary for ["the", "cat", "sat"].
run ".venv/Scripts/python -m pytest -q tests/test_pairs.py -k last" label="the last pair is counted" -- The loop should give every position that starts a pair: range(len(words) - 1).
run ".venv/Scripts/python -c \"from frontier.pairs import count_pairs; print(count_pairs(['a', 'b', 'c', 'd']))\"" stdout="('c', 'd'): 1" label="the fix works on other words too" -- Fix count_pairs itself, not just the test: the last pair of any list must be counted.
lacks src/frontier/pairs.py "breakpoint()" label="no breakpoint left behind" -- Delete any breakpoint() line from count_pairs.
run ".venv/Scripts/python -m pytest -q tests/test_pairs.py" label="both tests pass" -- Keep the first fix (the None default) while making the second.
```

## Debuggers everywhere, and onto GitHub

`breakpoint()` works anywhere Python runs: on a server with only a terminal, inside a test (pytest stops at it too), in code you didn't write. Editors put buttons on the same debugger. In VS Code, clicking left of a line number sets a breakpoint, **F5** runs the file under the debugger, a panel shows every variable at once instead of one `p` at a time, and the buttons along the top are `c`, `n` and their friends. Use whichever you like. The method doesn't change.

Your reproduction script has done its job, and the tests now hold both reproductions, so delete it. Lesson 1.5 removed the old script with `git rm`, but that only works on a file Git already has, and `pairs_bug.py` was never committed: `git rm` would stop with "did not match any files". A file Git has never seen is deleted like any other, with PowerShell's `Remove-Item`:

```powershell
Remove-Item experiments/pairs_bug.py
git add .
git commit -m "Find and fix two bugs in count_pairs, with a test for each"
git push
```

```check
missing experiments/pairs_bug.py label="the reproduction script is gone" -- Remove-Item experiments/pairs_bug.py deletes it.
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  pairs.py               count_pairs, with both bugs fixed
tests/
  test_pairs.py          one test per bug: -k calls, last
```

Next lesson: a program that runs for minutes, like a model training, needs to tell you what it's doing without a debugger pausing it. That's **logging**.
