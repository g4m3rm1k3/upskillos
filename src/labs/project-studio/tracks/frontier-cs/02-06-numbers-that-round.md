---
title: 2.6 — Numbers That Round
runtime: python
support: tests/conftest.py
---

Every structure in this chapter so far held exact things: words, counts, positions in a list. The numbers inside a model aren't exact. Every weight, every score and every probability is a **float**, and a float is a number squeezed into 64 bits. Most of the time the squeeze doesn't show. This lesson is about the times it does: a sum that comes out slightly wrong, a digit that vanishes, and a number too big to store at all.

The last of those breaks **softmax**, the function that turns a model's scores into probabilities. You'll see the textbook version crash, then fix it with one subtraction. Every real model uses that fix.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_floats.py**:

```python file=tests/test_floats.py provided
# Tests for frontier.floats (lesson 2.6): comparing floats, and a softmax that can't overflow.
import math


def test_close_enough():
    from frontier.floats import close
    assert close(0.1 + 0.2, 0.3)
    assert close(1e20, 1e20 + 1e5)      # 1e5 is tiny next to 1e20
    assert not close(1e-20, 2e-20)      # tiny numbers, but one is twice the other
    assert not close(1.0, 1.001)
    assert close(0.0, 0.0)


def test_textbook_adds_up_to_one():
    from frontier.floats import softmax_naive
    p = softmax_naive([1.0, 2.0, 3.0])
    assert math.isclose(sum(p), 1.0)
    assert p[0] < p[1] < p[2]


def test_stable_agrees_on_small_scores():
    from frontier.floats import softmax, softmax_naive
    for scores in ([1.0, 2.0, 3.0], [0.5, -2.0, 0.0, 4.0]):
        for a, b in zip(softmax(scores), softmax_naive(scores)):
            assert math.isclose(a, b)


def test_stable_survives_huge_and_tiny_scores():
    from frontier.floats import softmax
    assert softmax([1000.0, 1000.0]) == [0.5, 0.5]
    assert softmax([1000.0, 1.0]) == [1.0, 0.0]
    assert softmax([-1000.0, -1000.0]) == [0.5, 0.5]
```

- **`close(a, b)`** says whether two floats are equal *enough*. The second and third lines show it can't use one fixed gap: a difference of 100,000 is nothing next to 1e20, while 1e-20 and 2e-20 are far apart even though they differ by almost nothing.
- **`softmax_naive`** is softmax as textbooks write it. It must give probabilities that add up to 1, in the same order as the scores.
- **`softmax`** is your Your turn. On ordinary scores it must agree with the textbook version. On huge and tiny ones, where the textbook version breaks, it must still give exact answers.

`1e20` is how Python writes 1 × 10²⁰, and `1e-20` is 1 × 10⁻²⁰. The tests compare floats with `math.isclose`, never with `==`, except where the answer is exact. The next step shows why.

```check
file tests/test_floats.py -- Click "Create provided tests/test_floats.py" above.
```

## What 0.1 really is

Start with the most famous surprise in programming.

```predict
question: What does Python print for `0.1 + 0.2 == 0.3`?
choice: True
choice: False
answer: False
explain: Neither 0.1 nor 0.2 nor 0.3 can be stored exactly. The float nearest 0.1 plus the float nearest 0.2 lands on a float just above the one nearest 0.3, so the two sides differ in the last digit.
verify: script point_three.py
```

Try it, and print the sum too:

```powershell
.venv\Scripts\python -c "print(0.1 + 0.2 == 0.3, 0.1 + 0.2)"
```

It prints `False 0.30000000000000004`. Nothing is broken: this is how floats work in every language, on every computer.

A float stores a number in **binary**, as a whole number of bits times a power of two. In decimal, 1/3 never ends: 0.3333… goes on for ever, so writing it down means stopping somewhere and rounding. In binary, 1/10 is the same: 0.000110011001100… repeats for ever. So the float called `0.1` is the nearest number that fits in 64 bits, not 0.1 itself. Python's `decimal` module can show the exact value stored:

```powershell
.venv\Scripts\python -c "import decimal; print(decimal.Decimal(0.1))"
```

It prints `0.1000000000000000055511151231257827021181583404541015625`. When you write `0.1`, Python stores that, and when it prints a float it shows the *shortest* decimal that would be stored the same way, which is why you normally see `0.1`.

The 64 bits are split three ways: 1 bit for the **sign**, 11 bits for the **exponent** (which power of two), and 52 bits for the **fraction** (the binary digits). Pick a value and look at its bits, and the exact number they hold:

```figure
name: frontier/FloatBits
caption: A float's 64 bits: sign, exponent and fraction, and the exact number they store. 0.1 + 0.2 and 0.3 differ in the last bit.
props: {"values": ["0.1", "0.2", "0.3", "0.1 + 0.2", "0.5"]}
```

`0.5` is exact, since it's a power of two. Compare `0.3` with `0.1 + 0.2`: their bits are the same except at the very end.

52 fraction bits, plus a leading 1 that isn't stored, give 53 binary digits: about 16 decimal digits. A number with more digits than that has to lose some.

```predict
question: What does Python print for `1e16 + 1 - 1e16`?
choice: 1.0
choice: 0.0
choice: 2.0
answer: 0.0
explain: Near 1e16, 53 binary digits can only count in steps of 2, so the float after 1e16 is 1e16 + 2. 1e16 + 1 sits exactly halfway, and the tie rounds back to 1e16. The 1 is lost before the subtraction happens.
verify: script sixteen_digits.py
```

```powershell
.venv\Scripts\python -c "print(1e16 + 1 - 1e16)"
```

This is why adding a tiny number to a huge one can do nothing at all. Training adds tiny updates to weights millions of times, which is one reason the size of a model's numbers matters so much.

## Close enough

Since floats round, `==` is the wrong question for two results that were computed differently. The right one is "are they within a small gap of each other?" The gap can't be one fixed number, as the tests showed, because rounding errors grow with the size of the number: floats keep about 16 *significant* digits, whatever their size. So measure the difference against the bigger of the two.

`abs(a - b)` is the size of the difference, whichever is bigger. `close` allows it to be at most `tolerance` times the bigger value's size. With the default `1e-9`, the two must agree in their first 9 digits or so. Create `src/frontier/floats.py`:

```python file=src/frontier/floats.py
"""Floats: comparing them, and a softmax that survives huge and tiny scores."""


def close(a: float, b: float, tolerance: float = 1e-9) -> bool:
    """Whether a and b differ by at most tolerance, as a fraction of the bigger one."""
    return abs(a - b) <= tolerance * max(abs(a), abs(b))
```

For `0.1 + 0.2` and `0.3`, the difference is about 5.6e-17, far below 1e-9 × 0.3. For `1e-20` and `2e-20`, the difference is 1e-20, which is half the bigger number, so they're not close. Python has this built in as `math.isclose(a, b)`, whose default tolerance is also 1e-9, and that's what the tests use.

```check
run ".venv/Scripts/python -m pytest -q tests/test_floats.py -k close" label="close compares by relative size" -- Return abs(a - b) <= tolerance * max(abs(a), abs(b)).
run ".venv/Scripts/python -m mypy --strict src/frontier/floats.py" stdout="Success" label="mypy --strict passes" -- close takes three floats and returns bool.
```

## The textbook softmax

A model that chooses between options, such as which word comes next, gives each option a **score**. Scores can be any size, negative or positive. Softmax turns them into probabilities in two moves: raise *e* to the power of each score, which makes every one positive and keeps their order, then divide each by the total, so they add up to 1. In Python, *e* to a power is `math.exp`, from the `math` module.

Add `import math` at the top of `src/frontier/floats.py`, and `softmax_naive` below `close`:

```python file=src/frontier/floats.py
"""Floats: comparing them, and a softmax that survives huge and tiny scores."""
import math


def close(a: float, b: float, tolerance: float = 1e-9) -> bool:
    """Whether a and b differ by at most tolerance, as a fraction of the bigger one."""
    return abs(a - b) <= tolerance * max(abs(a), abs(b))


def softmax_naive(scores: list[float]) -> list[float]:
    """Turn scores into probabilities that add up to 1, the textbook way."""
    exps = [math.exp(score) for score in scores]
    total = sum(exps)
    return [e / total for e in exps]
```

For scores 1, 2 and 3 it gives about 0.09, 0.24 and 0.67. Each step up of 1 in score multiplies the share by *e*, about 2.7. That's the test passing. Now try a big score.

```check
run ".venv/Scripts/python -m pytest -q tests/test_floats.py -k textbook" label="softmax_naive gives probabilities" -- Take math.exp of each score, then divide each by their sum.
run ".venv/Scripts/python -m mypy --strict src/frontier/floats.py" stdout="Success" label="mypy --strict still passes" -- softmax_naive takes list[float] and returns list[float].
```

## Too big, and too small

The largest float is about 1.8e308. *e* to the power 709 is about 8.2e307, which fits. *e* to the power 710 doesn't.

```predict
question: What happens when you run `softmax_naive([1000.0, 1.0])`?
choice: it returns [1.0, 0.0]
choice: it returns [inf, 0.0]
choice: an OverflowError
answer: an OverflowError
explain: `math.exp(1000.0)` is far beyond the largest float. Rather than return a wrong number, `math.exp` raises an OverflowError, so softmax_naive never gets as far as dividing.
verify: script softmax_overflow.py
```

```powershell
.venv\Scripts\python -c "from frontier.floats import softmax_naive; print(softmax_naive([1000.0, 1.0]))"
```

The traceback ends with `OverflowError: math range error`. NumPy, which you'll use for models from Chapter 4 on, is worse: its `exp` quietly returns infinity, infinity divided by infinity is `nan` ("not a number"), and the `nan` spreads through every calculation it touches, with nothing but a warning.

The other end breaks too. The smallest positive float is about 5e-324, and *e* to the power -1000 is smaller, so it **underflows** to exactly 0.0:

```powershell
.venv\Scripts\python -c "from frontier.floats import softmax_naive; print(softmax_naive([-1000.0, -1000.0]))"
```

Both exps are 0.0, so the total is 0.0, and the division raises `ZeroDivisionError`. Yet the right answer is obvious: two equal scores share the probability, 0.5 each.

Scores of 1000 may look far-fetched, but models often store numbers in 16 bits instead of 64 to save memory, and the largest 16-bit float is 65,504. There, *e* to the power 12 already overflows (Chapter 41 measures those formats).

## Your turn: a softmax that can't overflow

The fix rests on one fact about powers: *e* to the power (s − m) is *e* to the power s divided by *e* to the power m. So subtracting the same number m from **every** score divides every exp by the same amount. Softmax then divides each exp by their total, and that common factor cancels out: the probabilities don't change at all.

So pick an m that makes the exps safe: the largest score, `max(scores)`. After subtracting it, the largest score is 0, whose exp is exactly 1, so nothing can overflow. Every other score is now negative or 0, so its exp is between 0 and 1. And because one exp is exactly 1, the total is at least 1, so it can never be 0.

**Build, on your own:** `softmax(scores)` in `src/frontier/floats.py`. It works like `softmax_naive`, but subtracts the largest score from each score before taking the exp.

```hints
nudge: Compute max(scores) once, before the list comprehension, and subtract it inside the call to math.exp.
concept: math.exp(score - biggest) instead of math.exp(score). The total and the division stay exactly as they are in softmax_naive.
answer: In `src/frontier/floats.py`, below `softmax_naive`:
~~~python
def softmax(scores: list[float]) -> list[float]:
    """The same probabilities, with the largest score subtracted first so exp can't overflow."""
    biggest = max(scores)
    exps = [math.exp(score - biggest) for score in scores]
    total = sum(exps)
    return [e / total for e in exps]
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_floats.py -k stable" label="softmax agrees, and survives huge and tiny scores" -- Subtract max(scores) from every score before math.exp; divide by the total as before.
run ".venv/Scripts/python -m pytest -q tests/test_floats.py" label="every float test passes" -- Leave close and softmax_naive as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/floats.py" stdout="Success" label="mypy --strict still passes" -- softmax takes list[float] and returns list[float].
```

`softmax([1000.0, 1.0])` now gives `[1.0, 0.0]`. The second one isn't really 0: it's about *e* to the power -999, too small to store, and 0.0 is the closest float. That's harmless here, but taking the log of that 0.0 gives minus infinity, and the log of softmax is exactly what training needs. Chapter 13 fixes that with the same trick, under the name log-sum-exp.

## Chapter 2 done, and onto GitHub

Commit and push:

```powershell
git add .
git commit -m "Compare floats, and a softmax that can't overflow"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  floats.py              close, softmax_naive, and softmax with the largest score subtracted
tests/
  test_floats.py
```

That's Chapter 2. You can now measure how a program's time grows, and you've built the structures the rest of the series relies on: a hash table (every dictionary), a heap (tokenizer merges and search), recursion over a tree (game search), a topological order (gradients), and now a softmax that floats can't break. Chapter 3 is about the tools for when code goes wrong or runs slow: the debugger, the profiler, and making a loop a hundred times faster.
