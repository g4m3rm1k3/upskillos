---
title: 5.2 — Slopes by Rule
runtime: python
support: tests/conftest.py
---

Lesson 5.1 measured slopes by nudging. That works for any function, but it costs two calls of the function per slope, and it's never exact. For most functions there's a better way: a handful of rules give the slope exactly, as a formula. That's what calculus is, and this lesson finds the rules from your own measurements instead of taking them on trust.

Then you put them to work. You build a checker that compares a slope worked out by rule against `central_slope`, which is how every hand-built gradient in this series gets tested. And you use the rules to work out the guessing loss's slope exactly, which proves lesson 5.1's surprise: for mean squared error, the best guess is always the average.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_rules.py**:

```python file=tests/test_rules.py provided
# Tests for slope_error and guess_slope (lesson 5.2): slopes worked out by rule, checked by nudging.
import math

DATA = [2.0, 3.0, 7.0]


def test_error_is_tiny_for_a_right_rule():
    from frontier.slopes import slope_error
    assert slope_error(lambda x: x ** 3, lambda x: 3 * x ** 2, [-2.0, 0.0, 1.5, 3.0]) < 1e-6


def test_error_is_large_for_a_wrong_rule():
    from frontier.slopes import slope_error
    assert slope_error(lambda x: x ** 3, lambda x: 3 * x, [-2.0, 0.0, 1.5, 3.0]) > 1.0


def test_error_is_the_largest_gap():
    from frontier.slopes import slope_error
    # The slope of 5x is 5 everywhere, so claiming 5 + x is wrong by 1, 4 and 2 at these points.
    assert math.isclose(slope_error(lambda x: 5 * x, lambda x: 5 + x, [1.0, -4.0, 2.0]), 4.0)


def test_guess_slope_is_zero_at_the_average():
    from frontier.guessing import guess_slope
    assert guess_slope(4.0, DATA) == 0.0


def test_guess_slope_matches_the_measured_slopes():
    from frontier.guessing import guess_slope
    assert guess_slope(1.0, DATA) == -6.0
    assert guess_slope(6.0, DATA) == 4.0


def test_guess_slope_agrees_with_nudging():
    from frontier.guessing import guess_loss, guess_slope
    from frontier.slopes import slope_error
    data = [1.5, -2.0, 4.0, 10.0]
    error = slope_error(lambda w: guess_loss(w, data), lambda w: guess_slope(w, data), [-3.0, 0.0, 2.5, 8.0])
    assert error < 1e-6
```

- **`slope_error(f, df, xs)`** takes a function `f`, a second function `df` that claims to give `f`'s slope at any point, and a list of points. It measures `f`'s slope at each point with `central_slope` and returns the largest gap between the claim and the measurement. A right rule gives a tiny number; a wrong one, a big one.
- **`guess_slope`**, your Your turn, is the guessing loss's slope as a formula. It must give lesson 5.1's measured slopes exactly (−6 at 1, 0 at 4, 4 at 6) and agree with nudging on data it has never seen.

```check
file tests/test_rules.py -- Click "Create provided tests/test_rules.py" above.
```

## The slope as a function

`central_slope` gives the slope at one point. Ask it at every point and you get a new function: for each *x*, the slope there. That function is called the **derivative**. The derivative of *f* is written *f*′ ("f prime"), so *f*′(3) is *f*'s slope at 3. You'll also see it written d*f*/d*x*, read "how much *f* changes per change in *x*". The guessing loss's derivative is what lesson 5.1 measured at three guesses: −6, 0 and 4.

To find a rule, measure the slopes of a few simple functions and look for a pattern. This experiment measures x², x³ and x⁴ at *x* = 1, 2 and 3. The `lambda` builds each power in turn. `" ".join(...)` puts the three slopes on one line, each formatted to 7 characters with 3 decimals so the columns line up. Create `experiments/slope_table.py`:

```python file=experiments/slope_table.py
"""The measured slopes of x², x³ and x⁴ at x = 1, 2 and 3."""
from frontier.slopes import central_slope

for n in [2, 3, 4]:
    slopes = [central_slope(lambda x: x ** n, x) for x in [1.0, 2.0, 3.0]]
    print(f"x**{n}:", " ".join(f"{s:7.3f}" for s in slopes))
```

Each row is one function, and each column one point. Lesson 5.1 already found the first row's last number: the slope of x² at 3 is 6.

```predict
question: The slope of x² is 2, 4 and 6 at x = 1, 2 and 3: always 2x. What is the slope of x³ at x = 3?
choice: 9.000
choice: 18.000
choice: 27.000
answer: 27.000
explain: The slope of x³ is 3x²: 3, 12 and 27 at x = 1, 2 and 3. The power comes down in front and goes down by one, as 2x did for x². 18 would be 2x², the x² pattern stretched too far.
verify: script cube_slope.py
```

```powershell
.venv\Scripts\python experiments/slope_table.py
```

```text
x**2:   2.000   4.000   6.000
x**3:   3.000  12.000  27.000
x**4:   4.000  32.000 108.000
```

Read the rows as formulas. x² gives 2, 4, 6: that's 2*x*. x³ gives 3, 12, 27: that's 3*x*², and 3 × 2² = 12 is lesson 5.1's slope of x³ at 2. x⁴ gives 4, 32, 108: 4*x*³. Each time, the power comes down in front and drops by one. That's the **power rule**:

the slope of *x*ⁿ is *n* × *x*ⁿ⁻¹

```check
run ".venv/Scripts/python experiments/slope_table.py" stdout="x**4:   4.000  32.000 108.000" label="the slopes of x², x³ and x⁴" -- slopes = [central_slope(lambda x: x ** n, x) for x in [1.0, 2.0, 3.0]], printed with :7.3f.
```

## Rules instead of nudges

Measurement found the power rule; algebra shows why it's true. Take x² and a nudge *h*: (*x* + *h*)² − *x*² = 2*xh* + *h*², and dividing by *h* gives 2*x* + *h*. As *h* shrinks to nothing, that's 2*x*. The leftover *h* is exactly the error of lesson 5.1's one-way nudge: at *w* = 4, where the true slope is 0, `nudge_slope` gives 0.000001, the size of its nudge (`loss_slopes.py` rounded it to 0.000).

Four more rules cover everything this chapter needs:

- **A constant** has slope 0: a flat line doesn't change.
- **A constant times a function**: the slope of 3*x*² is 3 times the slope of *x*², so 6*x*.
- **A sum**: the slope of *f* + *g* is *f*′ + *g*′. So the slope of 3*x*² + 2*x* + 1 is 6*x* + 2 + 0.
- ***e* to the *x***: *e* is a number, about 2.718, and `math.exp(x)` (lesson 2.6) is *e* to the power *x*. Its slope is itself: wherever you are on the curve of *e*ˣ, it's exactly as steep as it is high. That's why *e* is the number behind softmax and, in Chapter 7, logarithms.

There are a few others (for products, quotients, and one function inside another, which is next lesson's), but these are enough to work out many slopes exactly. A worked-out slope can still be wrong, though: a dropped power or a sign error, and nothing complains. So you check it against a measurement. That's called **gradient checking**, and it's the first test written for any hand-built gradient. Add `slope_error` at the end of `src/frontier/slopes.py`:

```python file=src/frontier/slopes.py
"""Slopes measured by nudging: how fast a function's output changes as its input changes."""
from collections.abc import Callable

Function = Callable[[float], float]


def nudge_slope(f: Function, x: float, h: float = 1e-6) -> float:
    """f's slope at x, measured by nudging x up by h: the rise, divided by the run h."""
    return (f(x + h) - f(x)) / h


def central_slope(f: Function, x: float, h: float = 1e-5) -> float:
    """f's slope at x, measured from x - h to x + h: a nudge both ways."""
    return (f(x + h) - f(x - h)) / (2 * h)


def slope_error(f: Function, df: Function, xs: list[float]) -> float:
    """The largest gap between df, f's slope worked out by rule, and f's slope measured by nudging."""
    return max(abs(df(x) - central_slope(f, x)) for x in xs)
```

At each point in `xs`, the generator expression takes the rule's slope `df(x)`, subtracts the measured one, and keeps the size of the gap with `abs`. `max` returns the biggest. For the third test, the rule 5 + *x* is off by 1 at *x* = 1, by 4 at −4 and by 2 at 2, so `slope_error` is 4.

```check
run ".venv/Scripts/python -m pytest -q tests/test_rules.py -k error" label="slope_error finds the largest gap between rule and measurement" -- max(abs(df(x) - central_slope(f, x)) for x in xs)
run ".venv/Scripts/python -m mypy --strict src/frontier/slopes.py" stdout="Success" label="mypy --strict passes" -- slope_error takes two Functions and a list[float], and returns a float.
```

## Checked by nudging

Now check some rules. Each line of this experiment gives `slope_error` a function and the slope the rules say it has, and prints whether they agree. Three rules are right. The fourth is a classic slip: the power brought down in front, but not lowered, so x³ becomes 3*x* instead of 3*x*².

Why `1e-6` as the line between right and wrong? `central_slope` is accurate to about `1e-9` on numbers this size (lesson 5.1 measured `2.1e-10` for x³ at 2), and a mistaken rule is off by far more than `1e-6` somewhere among six points. As in lesson 4.2, the tolerance sits well above the rounding and well below any mistake. Create `experiments/check_rules.py`:

```python file=experiments/check_rules.py
"""Slopes worked out by rule, each checked against central_slope."""
import math

from frontier.slopes import Function, slope_error

XS = [-2.0, -1.0, 0.0, 0.5, 1.0, 2.0]


def check(name: str, f: Function, df: Function) -> None:
    error = slope_error(f, df, XS)
    print(f"{name}: {'agrees' if error < 1e-6 else 'WRONG'}, largest gap {error:.1e}")


check("x**5 by the power rule", lambda x: x ** 5, lambda x: 5 * x ** 4)
check("3x² + 2x + 1, rule by rule", lambda x: 3 * x ** 2 + 2 * x + 1, lambda x: 6 * x + 2)
check("e to the x, its own slope", math.exp, math.exp)
check("x**3 with the power not lowered", lambda x: x ** 3, lambda x: 3 * x)
```

`check` prints `agrees` or `WRONG` with a conditional expression (lesson 2.4), then the largest gap. `math.exp` is passed as it is, with no brackets: it's already a function of one number.

```predict
question: What largest gap does the last line, the wrong rule 3x for x³, report over the six points?
choice: 6.0
choice: 12.0
choice: 18.0
answer: 18.0
explain: The true slope is 3x². At x = 2 that's 12 against the rule's 6, a gap of 6. At x = −2 it's 12 against −6, a gap of 18, the largest. A wrong rule can look nearly right at some points (at x = 0 and x = 1 the two agree exactly), which is why the check uses several points, negatives included.
verify: script wrong_rule.py
```

```powershell
.venv\Scripts\python experiments/check_rules.py
```

When this lesson was written it printed:

```text
x**5 by the power rule: agrees, largest gap 4.6e-09
3x² + 2x + 1, rule by rule: agrees, largest gap 1.8e-10
e to the x, its own slope: agrees, largest gap 1.9e-10
x**3 with the power not lowered: WRONG, largest gap 1.8e+01
```

The right rules agree with nudging to within a few billionths. The gaps aren't 0 because `central_slope` isn't exact, and your digits may differ slightly. The wrong rule is off by 18, and no amount of rounding explains that.

```check
run ".venv/Scripts/python experiments/check_rules.py" stdout="e to the x, its own slope: agrees" label="the right rules agree with nudging" -- check(name, f, df) calls slope_error(f, df, XS) and prints agrees when the gap is under 1e-6.
run ".venv/Scripts/python experiments/check_rules.py" stdout="x**3 with the power not lowered: WRONG" label="the wrong rule is caught" -- The last line passes lambda x: 3 * x as the slope of lambda x: x ** 3.
```

## Your turn: the guessing loss's slope

Now the guessing loss itself. For one number *d*, the loss's piece is (*w* − *d*)². Multiply it out, school algebra:

(*w* − *d*)² = *w*² − 2*dw* + *d*²

Its slope, rule by rule: *w*² gives 2*w* (power rule); −2*d* × *w* gives −2*d* (a constant times *w*, whose slope is 1); *d*² is a constant, so 0. Altogether 2*w* − 2*d*, which is 2(*w* − *d*): twice the error.

The loss averages those pieces over all the data. By the sum and constant rules, the slope of an average is the average of the slopes. So the loss's slope is the average of 2(*w* − *d*) over every *d*, and that works out to 2 × (*w* − the average of the data). Check it against lesson 5.1: the average of 2, 3 and 7 is 4, and at *w* = 1 the formula gives 2 × (1 − 4) = −6.

**Build, on your own:** `guess_slope(w, data)` at the end of `src/frontier/guessing.py`, with the same argument types as `guess_loss`, returning the guessing loss's slope at `w` by that formula: no nudging.

```hints
nudge: The average of data is sum(data) / len(data). The slope is twice the gap between w and it.
concept: return 2 * (w - sum(data) / len(data)). Averaging 2 * (w - d) over every d with a generator expression gives the same answer: sum(2 * (w - d) for d in data) / len(data).
answer: At the end of `src/frontier/guessing.py`:
~~~python
def guess_slope(w: float, data: list[float]) -> float:
    """guess_loss's slope at w, by the rules: twice the gap between w and the average of data."""
    return 2 * (w - sum(data) / len(data))
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_rules.py -k guess" label="guess_slope gives the slope exactly, and agrees with nudging" -- 2 * (w - average), where the average is sum(data) / len(data).
run ".venv/Scripts/python -m pytest -q tests/test_rules.py tests/test_slopes.py" label="every slope test passes" -- Leave guess_loss and the functions in slopes.py as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/guessing.py" stdout="Success" label="mypy --strict still passes" -- guess_slope takes a float and a list[float], and returns a float.
```

## The bottom, found exactly, and onto GitHub

Put the rule next to the measurement. Import `guess_slope` into `experiments/loss_slopes.py` and print it after each measured slope:

```python file=experiments/loss_slopes.py
"""The guessing loss's slope at a guess that's too small, the best one, and one too big."""
from frontier.guessing import guess_loss, guess_slope
from frontier.slopes import nudge_slope

DATA = [2.0, 3.0, 7.0]
for w in [1.0, 4.0, 6.0]:
    slope = nudge_slope(lambda v: guess_loss(v, DATA), w)
    print(f"slope at w = {w}: {slope:.3f}  by rule {guess_slope(w, DATA):.3f}")
```

```powershell
.venv\Scripts\python experiments/loss_slopes.py
```

```text
slope at w = 1.0: -6.000  by rule -6.000
slope at w = 4.0: 0.000  by rule 0.000
slope at w = 6.0: 4.000  by rule 4.000
```

The formula also answers lesson 5.1's question for any data at all. The bottom of the curve is where the slope is 0, and 2 × (*w* − average) is 0 exactly when *w* is the average. Left of it the slope is negative and right of it positive, so it's a bottom, not a peak. So for mean squared error, the best single guess is always the average. Training a real model is the same search, but its loss has thousands of parameters and no such neat solution, so instead of solving "slope = 0" it walks downhill: lesson 5.5.

```check
run ".venv/Scripts/python experiments/loss_slopes.py" stdout="slope at w = 1.0: -6.000  by rule -6.000" label="the rule matches the measurement" -- Import guess_slope, and print guess_slope(w, DATA) with :.3f after each measured slope.
```

Commit and push:

```powershell
git add .
git commit -m "Slopes by rule, checked against nudging"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  slopes.py              also slope_error: a rule's slope against the measured one (gradient checking)
  guessing.py            also guess_slope: 2 × (w − the average)
experiments/
  slope_table.py         the slopes of x², x³ and x⁴: the power rule, found by measuring
  check_rules.py         three right rules and one wrong one, checked by nudging
  loss_slopes.py         now the rule's slope beside each measured one
tests/
  test_rules.py          -k error, guess
```

Next lesson: one function inside another, such as (3*x* + 1)², and the rule for its slope: the chain rule, the idea that makes training a deep network possible.
