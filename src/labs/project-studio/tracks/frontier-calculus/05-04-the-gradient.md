---
title: 5.4 — The Gradient
runtime: python
support: tests/conftest.py
---

The guessing loss had one parameter, so its slope was one number. A real model has many parameters, and its loss depends on all of them at once: change any one and the loss changes. So instead of one slope there's one per parameter, each saying how the loss changes along that parameter alone. Put them together and you get a vector, the **gradient**, the thing every training step in this series computes.

This lesson measures slopes along one input at a time, sees what happens when one input is used twice (lesson 2.5's example, finally with numbers), builds the gradient, and checks the fact that makes it useful: it points the steepest way uphill. Lesson 5.5 walks the other way.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_many_inputs.py**:

```python file=tests/test_many_inputs.py provided
# Tests for frontier.gradients (lesson 5.4): slopes along each input of a function of several numbers.
import math

import numpy as np


def used_twice(p):
    # Lesson 2.5's (a + b) * b, with a = p[0] and b = p[1].
    return float((p[0] + p[1]) * p[1])


def bowl(p):
    return float(p[0] ** 2 + 10 * p[1] ** 2)


def test_partial_along_a():
    from frontier.gradients import partial
    assert math.isclose(partial(used_twice, np.array([1.0, 2.0]), 0), 2.0)


def test_partial_along_b():
    from frontier.gradients import partial
    assert math.isclose(partial(used_twice, np.array([1.0, 2.0]), 1), 5.0)


def test_partial_leaves_the_point_alone():
    from frontier.gradients import partial
    point = np.array([1.0, 2.0])
    partial(used_twice, point, 1)
    assert point.tolist() == [1.0, 2.0]


def test_gradient_has_one_slope_per_input():
    from frontier.gradients import gradient
    g = gradient(bowl, np.array([3.0, -1.0]))
    assert g.shape == (2,)
    assert np.allclose(g, [6.0, -20.0])


def test_gradient_of_three_inputs():
    from frontier.gradients import gradient

    def product(p):
        return float(p[0] * p[1] * p[2])

    assert np.allclose(gradient(product, np.array([1.0, 2.0, 3.0])), [6.0, 3.0, 2.0])
```

The functions under test take one argument, a vector `p`, and return a float: `used_twice` is (*a* + *b*) × *b* with *a* in `p[0]` and *b* in `p[1]`, and `bowl` is *x*² + 10*y*². `float(...)` turns NumPy's number into a plain one, as in lesson 4.2.

- **`partial(f, point, i)`** measures `f`'s slope along input `i` alone, at `point`. It must not change the `point` it was given.
- **`gradient`**, your Your turn, returns every input's slope as one vector, with one number per input.

```check
file tests/test_many_inputs.py -- Click "Create provided tests/test_many_inputs.py" above.
```

## One input at a time

A function of several numbers takes a point, a vector such as (*a*, *b*). To measure how it changes along *a*, nudge *a* and leave *b* exactly where it is. That slope is a **partial derivative**, written ∂*f*/∂*a* ("the partial of *f* with respect to *a*"); the curly ∂ says the other inputs were held still. There's one for each input.

Measuring one is lesson 5.1's `central_slope` with one change: nudge only position `i` of the point. That needs care, because of lesson 4.2's views. `up = point` would make `up` a second name for the caller's array, and `up[i] += h` would change the caller's point. So each nudged point starts as a `.copy()`, and the caller's point is never touched. `Surface` is a type alias for a function from a vector to a float: with two inputs, its values form a landscape over the (*a*, *b*) plane. Create `src/frontier/gradients.py`:

```python file=src/frontier/gradients.py
"""Gradients: the slope along every input of a function of several numbers."""
from collections.abc import Callable

import numpy as np

from frontier.arrays import Vector

Surface = Callable[[Vector], float]


def partial(f: Surface, point: Vector, i: int, h: float = 1e-5) -> float:
    """f's slope along input i at point, every other input held still: a nudge both ways."""
    up = point.copy()
    up[i] += h
    down = point.copy()
    down[i] -= h
    return (f(up) - f(down)) / (2 * h)
```

`up` is the point with input `i` nudged up by `h`, and `down` with it nudged down; everything else in them is the point's own numbers. Then it's lesson 5.1's central difference: the rise from `down` to `up`, over the run 2`h`. `numpy` is imported now for the next function, the gradient.

```check
run ".venv/Scripts/python -m pytest -q tests/test_many_inputs.py -k partial" label="partial nudges one input, on copies of the point" -- up = point.copy(), then up[i] += h; the same for down with -= h; return (f(up) - f(down)) / (2 * h).
run ".venv/Scripts/python -m mypy --strict src/frontier/gradients.py" stdout="Success" label="mypy --strict passes" -- Surface = Callable[[Vector], float], with Vector from frontier.arrays.
```

## A value used twice

Lesson 2.5 drew (*a* + *b*) × *b* as a graph: *c* = *a* + *b*, then *e* = *c* × *b*. It said *b*'s gradient has two parts, because *b* is used twice. Now you can measure it. This experiment takes *a* = 1, *b* = 2 (so *c* = 3 and *e* = 6) and measures the partial along each input. Create `experiments/two_uses.py`:

```python file=experiments/two_uses.py
"""Lesson 2.5's (a + b) * b: its slope along a and along b, at a = 1, b = 2."""
import numpy as np

from frontier.arrays import Vector
from frontier.gradients import partial


def e(p: Vector) -> float:
    return float((p[0] + p[1]) * p[1])


point = np.array([1.0, 2.0])
print(f"along a: {partial(e, point, 0):.3f}")
print(f"along b: {partial(e, point, 1):.3f}")
```

Along *a* is the easier one: *a* is used once, inside *c*, and *e* = *c* × *b* changes *b* = 2 times as fast as *c*, so the slope along *a* is 2. Before you run it, work out the other.

```predict
question: What does the experiment print for the slope along b?
choice: 2.000
choice: 3.000
choice: 5.000
answer: 5.000
explain: Nudge b and it moves e two ways at once. Through c: c moves with b, and e changes b = 2 times as fast as c, which gives 2. Directly, as the second factor: e changes c = 3 times as fast as b, which gives 3. The two add up: 2 + 3 = 5. Multiplied out, (a + b) × b is ab + b², whose slope along b is a + 2b = 5.
verify: script along_b.py
```

```powershell
.venv\Scripts\python experiments/two_uses.py
```

```text
along a: 2.000
along b: 5.000
```

That's the chain rule with more than one path. Along each path from *b* to *e*, multiply the slopes, as lesson 5.3 did. Where a value reaches the result by several paths, **add** the paths together. Lesson 2.5's backward order made sure *b*'s gradient wasn't used until both parts had arrived. Forgetting to add, so that the second path overwrites the first, is a classic autograd bug, and Chapter 12 makes you meet it on purpose.

```check
run ".venv/Scripts/python experiments/two_uses.py" stdout="along b: 5.000" label="the slope along b adds its two uses" -- print partial(e, point, 1), the slope along input 1, b, with :.3f.
```

## Your turn: the gradient

One partial per input, gathered into a vector, is the **gradient**, written ∇*f* ("grad *f*"). For the bowl *x*² + 10*y*² at the point (3, −1), the partial along *x* is 2*x* = 6 and along *y* is 20*y* = −20 (lesson 5.2's rules, with the other input treated as a constant), so the gradient is (6, −20). The tests check exactly that.

**Build, on your own:** `gradient(f, point, h=1e-5)` at the end of `src/frontier/gradients.py`. It takes a `Surface`, a `Vector` and a nudge, and returns a `Vector`: `partial(f, point, i, h)` for every position `i` of the point, in order, made into an array with `np.array`, as 4.3's `times_vector` made its list of answers into one. `len(point)` is how many inputs there are.

```hints
nudge: A list comprehension over range(len(point)), one partial per position, inside np.array(...).
concept: return np.array([partial(f, point, i, h) for i in range(len(point))]). Pass h along, so a caller's nudge reaches every partial. Without np.array it's a list, which has no shape and isn't a Vector.
answer: At the end of `src/frontier/gradients.py`:
~~~python
def gradient(f: Surface, point: Vector, h: float = 1e-5) -> Vector:
    """Every partial slope of f at point, as one vector: the direction of steepest climb."""
    return np.array([partial(f, point, i, h) for i in range(len(point))])
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_many_inputs.py -k gradient" label="gradient is one partial per input, as a vector" -- np.array([partial(f, point, i, h) for i in range(len(point))])
run ".venv/Scripts/python -m pytest -q tests/test_many_inputs.py tests/test_chain.py tests/test_rules.py tests/test_slopes.py" label="every slope test passes" -- Leave partial as it was.
run ".venv/Scripts/python -m mypy --strict src/frontier/gradients.py" stdout="Success" label="mypy --strict still passes" -- gradient takes a Surface, a Vector and a float, and returns a Vector.
```

## Steepest uphill, and onto GitHub

Why gather the partials into a vector? Because the vector means something. At any point, the gradient points in the direction in which the function climbs fastest, and its length is how fast. So minus the gradient is the way straight downhill. That's what lesson 5.5 needs.

You don't have to take that on trust. This experiment stands at (2, 1) on the bowl, takes a step of length 0.01 in three directions, and prints how much the bowl rises for each. Each direction is a unit vector, a vector of length 1, so the steps are the same length and only their directions differ. The third is the gradient's own direction, made a unit vector with lesson 4.2's `unit`. Create `experiments/steepest.py`:

```python file=experiments/steepest.py
"""Which way is steepest uphill on the bowl x² + 10y², from the point (2, 1)?"""
import numpy as np

from frontier.arrays import Vector, unit
from frontier.gradients import gradient


def bowl(p: Vector) -> float:
    return float(p[0] ** 2 + 10 * p[1] ** 2)


point = np.array([2.0, 1.0])
g = gradient(bowl, point)
print("gradient:", np.round(g, 3))
directions = [
    ("along x", np.array([1.0, 0.0])),
    ("along y", np.array([0.0, 1.0])),
    ("gradient's", unit(g)),
]
for name, d in directions:
    print(f"{name:>10}: rises {bowl(point + 0.01 * d) - bowl(point):.4f}")
```

`directions` is a list of (name, direction) pairs, and the loop unpacks each one. `point + 0.01 * d` is the point moved 0.01 along `d` (broadcasting from lesson 4.4, a number times a vector), and the printed rise is how much higher the bowl is there.

```predict
question: The gradient at (2, 1) is (4, 20). Of the three directions, which rises most?
choice: along x
choice: along y
choice: gradient's
answer: gradient's
explain: The gradient's direction is the steepest way up, by definition of what the gradient is. It's mostly along y, because the bowl is 10 times steeper in y, so straight along y comes close (0.2010 against 0.2049) but loses, because ignoring x gives up a little climb.
verify: script steepest_way.py
```

```powershell
.venv\Scripts\python experiments/steepest.py
```

```text
gradient: [ 4. 20.]
   along x: rises 0.0401
   along y: rises 0.2010
gradient's: rises 0.2049
```

The gradient's direction wins, and so it would against any other direction you tried. Its rise, 0.2049, is about 0.01 times the gradient's length: √(4² + 20²) ≈ 20.4. So the gradient tells you both which way is steepest and how steep it is, for any number of inputs.

There's one problem with the way you measured it. `gradient` calls `f` twice **per input**. A model with a million parameters would need two million runs of the model for every training step. Lesson 5.3's backward trip gets every slope from one forward run and one backward run, however many inputs there are, and Chapter 12 builds exactly that. Nudging stays as what it's best at: checking the backward trip's answers.

```check
run ".venv/Scripts/python experiments/steepest.py" stdout="gradient's: rises 0.2049" label="the gradient's direction rises most" -- For each (name, d) pair, print bowl(point + 0.01 * d) - bowl(point) with :.4f; the last direction is unit(g).
```

Commit and push:

```powershell
git add .
git commit -m "Partial slopes and the gradient"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  gradients.py           Surface, partial (one input nudged, on copies), gradient (every partial, as a vector)
experiments/
  two_uses.py            (a + b) * b: the slope along b adds its two uses
  steepest.py            four directions on a bowl: the gradient's climbs fastest
tests/
  test_many_inputs.py    -k partial, gradient
```

Next lesson: walking downhill. Step against the gradient, over and over, and a guess rolls to the bottom of the loss by itself. That's gradient descent, the way every model in this series is trained.
