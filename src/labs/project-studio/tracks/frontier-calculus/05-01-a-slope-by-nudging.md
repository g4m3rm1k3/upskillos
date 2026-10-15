---
title: 5.1 — A Slope by Nudging
track: Frontier — Slopes and Gradients
trackOrder: 15.05
runtime: python
support: tests/conftest.py
---

Every model in this series learns the same way. It has numbers inside it, its **parameters**. A **loss** is one number that says how wrong the model is. Training nudges each parameter a little in whichever direction makes the loss smaller, and repeats that, millions of times. To do that, the program has to know, for each parameter, *which way is downhill and how steep it is*. That's a **slope**, and this chapter is about slopes.

This lesson starts with the smallest possible model, a single number, and a loss for it. You draw the loss as a curve, with the part of Matplotlib that draws lines. Then you measure its slope the simplest way there is: nudge the number and watch how much the loss moves. That measurement is also how professionals check their gradients, so you'll use it in every chapter that follows. Chapter 4 compared things; this chapter is about how things change.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_slopes.py**:

```python file=tests/test_slopes.py provided
# Tests for frontier.guessing and frontier.slopes (lesson 5.1): a first loss, and slopes measured by nudging.
import math

DATA = [2.0, 3.0, 7.0]


def square(x):
    return x * x


def cube(x):
    return x * x * x


def test_loss_of_a_perfect_guess_is_zero():
    from frontier.guessing import guess_loss
    assert guess_loss(5.0, [5.0, 5.0]) == 0.0


def test_loss_is_the_mean_squared_error():
    from frontier.guessing import guess_loss
    assert guess_loss(0.0, DATA) == 62 / 3
    assert math.isclose(guess_loss(4.0, DATA), 14 / 3)


def test_nudge_slope_of_a_line_is_its_steepness():
    from frontier.slopes import nudge_slope
    assert math.isclose(nudge_slope(lambda x: 2 * x + 1, 3.0), 2.0, rel_tol=1e-6)


def test_nudge_slope_of_x_squared_at_3_is_about_6():
    from frontier.slopes import nudge_slope
    assert math.isclose(nudge_slope(square, 3.0), 6.0, rel_tol=1e-5)


def test_nudge_slope_uses_the_nudge_it_is_given():
    from frontier.slopes import nudge_slope
    assert nudge_slope(square, 3.0, h=0.5) == 6.5


def test_central_slope_is_exact_for_a_parabola():
    from frontier.slopes import central_slope
    assert central_slope(square, 3.0, h=0.5) == 6.0


def test_central_slope_beats_one_sided():
    from frontier.slopes import central_slope, nudge_slope
    one_way = abs(nudge_slope(cube, 2.0, h=1e-3) - 12.0)
    both_ways = abs(central_slope(cube, 2.0, h=1e-3) - 12.0)
    assert both_ways < one_way / 100


def test_central_slope_is_accurate_by_default():
    from frontier.slopes import central_slope
    assert math.isclose(central_slope(cube, 2.0), 12.0, rel_tol=1e-8)
```

The tests pass functions around as values, as lesson 2.1's `best_of` did: `square` and `cube` are defined at the top, and `lambda x: 2 * x + 1` is a straight line written in place.

- **`guess_loss`** is the loss for guessing one number to stand for a list of numbers. It's 0 for a perfect guess, and the second test gives its exact value for two guesses about `[2, 3, 7]`.
- **`nudge_slope`** measures a function's slope at a point. The slope of a straight line is the same everywhere (2 for `2x + 1`); for x², whose steepness keeps changing, it's about 6 at x = 3. It takes the size of the nudge as an option, `h`.
- **`central_slope`**, your Your turn, is a better way to measure the same thing: the tests demand it be far more accurate than `nudge_slope`.

```check
file tests/test_slopes.py -- Click "Create provided tests/test_slopes.py" above.
```

## A first loss

Say you have to pick one number to stand for the numbers 2, 3 and 7: a single forecast for three days of sales, or one setting that suits three people. Call your guess *w*. For each number *d* the guess is wrong by *w* − *d*. Some errors are negative and some positive, so adding them up would let them cancel out. Instead, square each error, which makes every one positive and makes a big miss cost much more than a small one, and take the average of the squares.

That average is the **mean squared error**, and it's your first loss: one number that says how wrong the guess is, 0 only when every number equals the guess. Chapter 8 uses the same loss to fit a line through points. In Python, `**` raises to a power, so `(w - d) ** 2` is the error squared. Create `src/frontier/guessing.py`:

```python file=src/frontier/guessing.py
"""A first loss: how wrong a single guess is about a list of numbers."""


def guess_loss(w: float, data: list[float]) -> float:
    """The mean squared error of guessing w for every number in data."""
    return sum((w - d) ** 2 for d in data) / len(data)
```

The generator expression squares each error, `sum` adds the squares, and dividing by `len(data)` makes it an average. For a guess of 4, the errors are 2, 1 and −3, their squares 4, 1 and 9, and the loss is 14 / 3, about 4.667. A guess of 0 is much worse: 4 + 9 + 49 = 62, over 3.

```check
run ".venv/Scripts/python -m pytest -q tests/test_slopes.py -k loss" label="guess_loss is the mean squared error" -- sum((w - d) ** 2 for d in data) / len(data): every error squared, then averaged.
run ".venv/Scripts/python -m mypy --strict src/frontier/guessing.py" stdout="Success" label="mypy --strict passes" -- guess_loss takes a float and a list[float], and returns a float.
```

## The loss as a curve

Every guess has a loss, so the loss is a function of *w*, and a function of one number can be drawn as a curve. This experiment works out the loss for 81 guesses from 0 to 8 and draws them, using three things Matplotlib and NumPy haven't shown you yet:

- `np.linspace(0.0, 8.0, 81)` is an array of 81 evenly spaced numbers from 0 to 8, both ends included: 0.0, 0.1, 0.2 and so on.
- `ax.plot(xs, ys)` draws a line through the points (`xs[0]`, `ys[0]`), (`xs[1]`, `ys[1]`) and so on. With points this close together, the straight pieces between them look like one smooth curve.
- `ax.set_xlabel` and `ax.set_ylabel` name what the axes measure.

The figure is made the way lesson 4.5's `heatmap` made one. To find the lowest point, `min(zip(losses, ws))` pairs each loss with its guess. Pairs compare item by item (lesson 2.3), so the smallest loss wins and brings its guess with it. Create `experiments/draw_loss.py`:

```python file=experiments/draw_loss.py
"""The guessing loss for 2, 3 and 7, drawn as a curve."""
from pathlib import Path

import numpy as np
from matplotlib.figure import Figure

from frontier.guessing import guess_loss

DATA = [2.0, 3.0, 7.0]
ws = np.linspace(0.0, 8.0, 81)
losses = [guess_loss(w, DATA) for w in ws]
fig = Figure(figsize=(6, 4), layout="constrained")
ax = fig.add_subplot()
ax.plot(ws, losses)
ax.set_xlabel("guess w")
ax.set_ylabel("loss")
Path("pictures").mkdir(exist_ok=True)
fig.savefig("pictures/loss.png")
best_loss, best_w = min(zip(losses, ws))
print(f"lowest loss {best_loss:.3f} at w = {best_w:.1f}")
```

The list comprehension works out the loss at every guess in `ws`, one at a time. The rest draws the 81 points as a curve, labels it, saves it to `pictures/loss.png` (the folder `.gitignore` already leaves out), and prints the lowest point.

```predict
question: Of the guesses 0.0, 0.1, … 8.0, which has the lowest loss for 2, 3 and 7?
choice: 3.0
choice: 4.0
choice: 4.5
answer: 4.0
explain: 4 is the average of 2, 3 and 7. 3, the middle number, would be best if the loss added up plain distances, but squaring makes the 7's big error count extra and pulls the best guess towards it. 4.5, halfway between 2 and 7, ignores the 3. Lesson 5.2 proves that for mean squared error the best guess is always the average.
verify: script best_guess.py
```

```powershell
.venv\Scripts\python experiments/draw_loss.py
Invoke-Item pictures\loss.png
```

```text
lowest loss 4.667 at w = 4.0
```

The picture is a U-shaped curve, a **parabola**, high at both ends and lowest at 4. That shape is what training is looking for: the bottom of a curve. Here you found it by trying 81 guesses. A model with a million parameters can't try every combination, so it needs another way down. It needs to know which way the curve slopes where it stands.

```check
run ".venv/Scripts/python experiments/draw_loss.py" stdout="lowest loss 4.667 at w = 4.0" label="the curve is drawn, and its lowest point found" -- losses = [guess_loss(w, DATA) for w in ws], then best_loss, best_w = min(zip(losses, ws)).
file pictures/loss.png -- Run .venv\Scripts\python experiments/draw_loss.py
```

## Nudge it

A straight line's **slope** is its steepness: how far it rises for each step across, rise divided by run. The line `2x + 1` rises 2 for every 1 across, everywhere. A curve's steepness changes from point to point, but look at a small enough piece of it and it's almost straight. So to measure the slope of a curve at *x*, nudge *x* by a small amount *h*, see how much the function's value changes, and divide by *h*:

slope at *x* ≈ (f(*x* + *h*) − f(*x*)) / *h*

A positive slope means the function goes up as *x* goes up; a negative one, down; zero means flat. Drag the sliders: the dashed line through the two points is the measured slope, and as *h* shrinks it settles onto the curve's own steepness at that point.

```figure
name: frontier/SlopeNudge
caption: The guessing loss for 2, 3 and 7. The measured slope is the rise between w and w + h, divided by h.
props: {"data": [2, 3, 7], "x": 1, "h": 2}
```

`nudge_slope` does exactly that for any function of one number. `Function` is a type alias for `Callable[[float], float]`, "a function that takes a float and returns a float", with `Callable` from `collections.abc` as in lesson 2.1. The nudge `h` has a default, `1e-6`, a millionth: small enough that the curve is nearly straight over it. Create `src/frontier/slopes.py`:

```python file=src/frontier/slopes.py
"""Slopes measured by nudging: how fast a function's output changes as its input changes."""
from collections.abc import Callable

Function = Callable[[float], float]


def nudge_slope(f: Function, x: float, h: float = 1e-6) -> float:
    """f's slope at x, measured by nudging x up by h: the rise, divided by the run h."""
    return (f(x + h) - f(x)) / h
```

For `square` at 3 with `h=0.5`, the third test's case, the rise is 3.5² − 3² = 12.25 − 9 = 3.25, and 3.25 / 0.5 = 6.5. That's a little more than the true slope of 6, because x² gets steeper as *x* grows, and a nudge to the right picks up some of that extra steepness. With the default `h`, the gap is a millionth.

```check
run ".venv/Scripts/python -m pytest -q tests/test_slopes.py -k nudge" label="nudge_slope measures rise over run" -- (f(x + h) - f(x)) / h, with h defaulting to 1e-6.
run ".venv/Scripts/python -m mypy --strict src/frontier/slopes.py" stdout="Success" label="mypy --strict passes" -- Function = Callable[[float], float], with from collections.abc import Callable.
```

## Which way is downhill?

Now measure the loss's slope at three guesses: one too small, the best one, and one too big. `nudge_slope` needs a function of one number, but `guess_loss` takes two. The `lambda` turns it into one, with the data fixed: `lambda w: guess_loss(w, DATA)`. Create `experiments/loss_slopes.py`:

```python file=experiments/loss_slopes.py
"""The guessing loss's slope at a guess that's too small, the best one, and one too big."""
from frontier.guessing import guess_loss
from frontier.slopes import nudge_slope

DATA = [2.0, 3.0, 7.0]
for w in [1.0, 4.0, 6.0]:
    slope = nudge_slope(lambda v: guess_loss(v, DATA), w)
    print(f"slope at w = {w}: {slope:.3f}")
```

Each pass measures the slope of the same curve at a different guess, rounded to 3 places. Before you run it, think about the picture: at *w* = 1 the curve is high on its left side, heading down towards 4.

```predict
question: What does the experiment print for the slope at w = 1.0?
choice: -6.000
choice: 0.000
choice: 6.000
answer: -6.000
explain: At w = 1 the curve is going downhill as w grows, so the slope is negative, and steep: the loss falls about 6 for each step to the right. At 4, the bottom, it's flat, 0.000. At 6, past the bottom, it's uphill: 4.000.
verify: script slope_at_one.py
```

```powershell
.venv\Scripts\python experiments/loss_slopes.py
```

```text
slope at w = 1.0: -6.000
slope at w = 4.0: 0.000
slope at w = 6.0: 4.000
```

The slope tells you everything you need to improve the guess. Its **sign** says which way to move: at 1 it's negative, so the loss falls as *w* grows, and the guess should go up; at 6 it's positive, so the guess should go down. Its **size** says how far you are from flat: −6 is steep, 4 less so. At the bottom it's 0, and there's nowhere better to go. Lesson 5.5 turns that into a rule that walks down to 4 by itself.

```check
run ".venv/Scripts/python experiments/loss_slopes.py" stdout="slope at w = 1.0: -6.000" label="the slope is negative left of the bottom" -- nudge_slope(lambda v: guess_loss(v, DATA), w) for each w.
run ".venv/Scripts/python experiments/loss_slopes.py" stdout="slope at w = 6.0: 4.000" label="and positive right of it" -- Measure at all three guesses: [1.0, 4.0, 6.0].
```

## How small a nudge?

If a smaller nudge is more accurate, why not make `h` as small as possible? Lesson 2.6 is the reason. A float keeps about 16 significant digits. With a tiny `h`, f(*x* + *h*) and f(*x*) agree in nearly all of them, and subtracting the two throws the agreeing digits away, leaving only the last few, which are mostly rounding. Dividing by the tiny `h` then makes that rounding huge.

So there are two errors pulling opposite ways: a big nudge measures the slope a little way off to the side, and a tiny one magnifies rounding. This experiment measures both, using x³ at *x* = 2, whose slope is exactly 12 (lesson 5.2 shows why). `10.0 ** -power` is 10 to the power −`power`. In the format specs, `:<2` pads the number to 2 characters on the left, the mirror of lesson 2.1's `:>5`, and `:.1e` prints a number in the `1e-6` notation from lesson 2.6, with 1 digit after the point. Create `experiments/nudge_sizes.py`:

```python file=experiments/nudge_sizes.py
"""How the measured slope of x³ at 2 depends on the size of the nudge."""
from frontier.slopes import nudge_slope


def cube(x: float) -> float:
    return x * x * x


for power in range(1, 16):
    h = 10.0 ** -power
    error = abs(nudge_slope(cube, 2.0, h) - 12.0)
    print(f"h = 1e-{power:<2}  one way {error:.1e}")
```

For each `h` from 0.1 down to 1e-15, it measures the slope and prints how far it is from the true 12. Before you run it, decide which wins at the far end, where `h` is 1e-15.

```predict
question: Is the error at h = 1e-15 bigger or smaller than at h = 1e-8?
choice: smaller: a smaller nudge is always closer
choice: bigger: rounding takes over
answer: bigger: rounding takes over
explain: At h = 1e-15, 2 + h differs from 2 only in the last couple of the 16 digits, so the subtraction leaves almost nothing but rounding, and dividing by 1e-15 blows it up: the error is more than 1, against about 1e-7 at h = 1e-8.
verify: script tiny_nudge.py
```

```powershell
.venv\Scripts\python experiments/nudge_sizes.py
```

When this lesson was written it printed:

```text
h = 1e-1   one way 6.1e-01
h = 1e-2   one way 6.0e-02
h = 1e-3   one way 6.0e-03
h = 1e-4   one way 6.0e-04
h = 1e-5   one way 6.0e-05
h = 1e-6   one way 6.0e-06
h = 1e-7   one way 5.8e-07
h = 1e-8   one way 7.3e-08
h = 1e-9   one way 9.9e-07
h = 1e-10  one way 9.9e-07
h = 1e-11  one way 9.9e-07
h = 1e-12  one way 1.1e-03
h = 1e-13  one way 9.6e-03
h = 1e-14  one way 2.6e-01
h = 1e-15  one way 1.3e+00
```

From the top, the error shrinks in step with `h`, about 6 × `h` each time: the curve's bend, picked up by a one-sided nudge. Around `1e-8` that stops, and below it the error grows again, now from rounding, and jumps around. The best `h` sits where the two errors meet. The rows from `1e-9` down are rounding, so on your computer they may differ a little; the top rows won't.

```check
run ".venv/Scripts/python experiments/nudge_sizes.py" stdout="h = 1e-3   one way 6.0e-03" label="the error shrinks with h at first" -- h = 10.0 ** -power, then abs(nudge_slope(cube, 2.0, h) - 12.0), printed with :.1e.
```

## Your turn: nudge both ways

There's a better measurement, and it costs nothing extra. Instead of comparing *x* with *x* + *h*, compare *x* − *h* with *x* + *h*: a nudge to each side. The run is now 2*h*:

slope at *x* ≈ (f(*x* + *h*) − f(*x* − *h*)) / (2*h*)

It's called the **central difference**. A one-sided nudge picks up the curve's bend on one side only, so it's always off in the same direction. Nudging both ways, the bend's effect on the right and on the left are equal and opposite, and they cancel. For a parabola they cancel exactly: whatever `h` is, the central difference of x² gives the true slope, which is what the test `central_slope(square, 3.0, h=0.5) == 6.0` checks. For other curves a small error is left, but it shrinks like `h` squared instead of like `h`.

**Build, on your own:** `central_slope(f, x, h=1e-5)` at the end of `src/frontier/slopes.py`, with the same argument types as `nudge_slope`, returning the central difference above. Its default nudge is `1e-5`, larger than `nudge_slope`'s, because a both-ways nudge can afford a bigger one, and a bigger one rounds less.

```hints
nudge: The rise is f(x + h) - f(x - h), and the run is 2 * h.
concept: Divide the rise by the run, with brackets around the run: (f(x + h) - f(x - h)) / (2 * h). Without them, / 2 * h divides by 2 and then multiplies by h.
answer: At the end of `src/frontier/slopes.py`:
~~~python
def central_slope(f: Function, x: float, h: float = 1e-5) -> float:
    """f's slope at x, measured from x - h to x + h: a nudge both ways."""
    return (f(x + h) - f(x - h)) / (2 * h)
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_slopes.py -k central" label="central_slope is exact for a parabola, and far more accurate" -- (f(x + h) - f(x - h)) / (2 * h), with h defaulting to 1e-5.
run ".venv/Scripts/python -m pytest -q tests/test_slopes.py" label="every slope test passes" -- Leave guess_loss and nudge_slope as they were.
run ".venv/Scripts/python -m mypy --strict src/frontier/slopes.py" stdout="Success" label="mypy --strict still passes" -- central_slope takes a Function and two floats, and returns a float.
```

## Both ways, measured, and onto GitHub

Add a column to the experiment: import `central_slope` as well, and print its error next to the one-way error. Change `experiments/nudge_sizes.py`:

```python file=experiments/nudge_sizes.py
"""How the measured slope of x³ at 2 depends on the size of the nudge."""
from frontier.slopes import central_slope, nudge_slope


def cube(x: float) -> float:
    return x * x * x


for power in range(1, 16):
    h = 10.0 ** -power
    error = abs(nudge_slope(cube, 2.0, h) - 12.0)
    both = abs(central_slope(cube, 2.0, h) - 12.0)
    print(f"h = 1e-{power:<2}  one way {error:.1e}  both ways {both:.1e}")
```

```powershell
.venv\Scripts\python experiments/nudge_sizes.py
```

The first rows, as printed when this lesson was written:

```text
h = 1e-1   one way 6.1e-01  both ways 1.0e-02
h = 1e-2   one way 6.0e-02  both ways 1.0e-04
h = 1e-3   one way 6.0e-03  both ways 1.0e-06
h = 1e-4   one way 6.0e-04  both ways 1.0e-08
h = 1e-5   one way 6.0e-05  both ways 2.1e-10
h = 1e-6   one way 6.0e-06  both ways 3.5e-10
```

Each time `h` shrinks 10 times, the one-way error shrinks 10 times, and the both-ways error 100 times, until rounding takes over around `1e-5`. That's why `central_slope` defaults to `1e-5`: there its error is about 2 in 10 billion, against 6 in a million for `nudge_slope`'s best. From now on, `central_slope` is the measurement you trust. Lesson 5.2 uses it to check slopes worked out by rule, without any nudging at all.

```check
run ".venv/Scripts/python experiments/nudge_sizes.py" stdout="h = 1e-3   one way 6.0e-03  both ways 1.0e-06" label="nudging both ways is far more accurate" -- both = abs(central_slope(cube, 2.0, h) - 12.0), printed after the one-way error.
```

Commit and push:

```powershell
git add .
git commit -m "A first loss, drawn, and slopes measured by nudging"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  guessing.py            guess_loss: the mean squared error of one guess
  slopes.py              Function, nudge_slope, central_slope
experiments/
  draw_loss.py           the loss for 2, 3 and 7 as a curve: pictures/loss.png, lowest at 4
  loss_slopes.py         its slope at 1, 4 and 6: -6, 0, 4
  nudge_sizes.py         the error of each measurement as the nudge shrinks
tests/
  test_slopes.py         -k loss, nudge, central
```

Next lesson: rules that give a slope exactly, without nudging, checked against `central_slope`. One of them proves that the best guess is always the average.
