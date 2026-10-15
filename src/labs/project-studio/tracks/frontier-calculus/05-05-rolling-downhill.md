---
title: 5.5 — Rolling Downhill
runtime: python
support: tests/conftest.py
---

Lesson 5.2 found the best guess by solving "slope = 0". That only works because the guessing loss is simple enough to solve. A real model's loss has thousands or billions of parameters and no formula for its bottom. But you can always ask the gradient which way is downhill from where you are, take a small step that way, and ask again. That's **gradient descent**, and it's how every model in this series is trained, from Chapter 8's line to the GPT in Part 8.

This lesson builds it twice. First for one number, where you watch a guess roll down to the average and see what the size of each step does, from creeping, to landing in one step, to bouncing forever, to flying off. Then for a vector, where a point rolls down a bowl, and you draw its path on a map of the surface.

## Read the tests first

**This step: create the supplied file and read it. No code yet.**

Click **Create provided tests/test_walking.py**:

```python file=tests/test_walking.py provided
# Tests for frontier.descent (lesson 5.5): gradient descent, on one number and then on a vector.
import numpy as np

DATA = [2.0, 3.0, 7.0]


def test_downhill_takes_one_step():
    from frontier.descent import downhill
    from frontier.guessing import guess_slope
    assert downhill(lambda w: guess_slope(w, DATA), 0.0, 0.1, 1) == [0.0, 0.8]


def test_downhill_keeps_every_guess():
    from frontier.descent import downhill
    from frontier.guessing import guess_slope
    path = downhill(lambda w: guess_slope(w, DATA), 0.0, 0.1, 30)
    assert len(path) == 31
    assert abs(path[-1] - 4.0) < 0.01


def test_downhill_lands_in_one_step_at_rate_one_half():
    from frontier.descent import downhill
    from frontier.guessing import guess_slope
    assert downhill(lambda w: guess_slope(w, DATA), 10.0, 0.5, 1) == [10.0, 4.0]


def test_descend_halves_the_distance_each_step():
    from frontier.descent import descend
    path = descend(lambda p: 2 * p, np.array([3.0, 1.0]), 0.25, 2)
    assert [p.tolist() for p in path] == [[3.0, 1.0], [1.5, 0.5], [0.75, 0.25]]


def test_descend_leaves_the_start_alone():
    from frontier.descent import descend
    start = np.array([3.0, 1.0])
    path = descend(lambda p: 2 * p, start, 0.25, 3)
    assert start.tolist() == [3.0, 1.0]
    assert path[0].tolist() == [3.0, 1.0]


def test_descend_reaches_the_bottom_of_a_bowl():
    from frontier.descent import descend
    from frontier.gradients import gradient

    def bowl(p):
        return float(p[0] ** 2 + 10 * p[1] ** 2)

    path = descend(lambda p: gradient(bowl, p), np.array([-4.0, 1.0]), 0.09, 100)
    assert np.allclose(path[-1], [0.0, 0.0], atol=1e-6)
```

- **`downhill(slope, start, rate, steps)`** walks one number downhill: it takes a slope function, a starting guess, a step size and a number of steps, and returns every guess along the way, the start included. On the guessing loss for 2, 3 and 7 it must head for 4, their average.
- **`descend`**, your Your turn, does the same for a vector, using a gradient function instead of a slope. On the function whose gradient is `2 * p`, each step must halve the distance to the bottom. It must not change the starting vector. And on lesson 5.4's bowl, with `gradient` measuring the slopes, it must end at the bottom, (0, 0), to within `atol=1e-6`, `np.allclose`'s allowed absolute difference.

```check
file tests/test_walking.py -- Click "Create provided tests/test_walking.py" above.
```

## Downhill, one step at a time

The rule is one line. Stand at a guess *w*, work out the slope there, and step **against** it:

new *w* = *w* − rate × slope at *w*

The minus sign does the steering. Where the slope is negative (the loss falls as *w* grows), subtracting it makes *w* bigger; where it's positive, smaller. Either way the step goes downhill. And because the step is proportional to the slope, it's big where the curve is steep and shrinks as the bottom flattens out, so the guess slows down as it arrives. The **rate**, usually called the **learning rate**, sets how big a step is for a given slope. Choosing it well is a large part of training anything, as the next steps show.

`downhill` repeats the rule `steps` times and keeps every guess, so you can look at the whole path. Create `src/frontier/descent.py`:

```python file=src/frontier/descent.py
"""Gradient descent: walking downhill, one step at a time."""
from collections.abc import Callable

from frontier.arrays import Vector
from frontier.slopes import Function


def downhill(slope: Function, start: float, rate: float, steps: int) -> list[float]:
    """Every guess walking downhill from start: each step moves rate times the slope, against it."""
    path = [start]
    for _ in range(steps):
        w = path[-1]
        path.append(w - rate * slope(w))
    return path
```

On the guessing loss from 0 with rate 0.1: the slope at 0 is 2 × (0 − 4) = −8, so the first step goes to 0 − 0.1 × (−8) = 0.8, the first test's case. `Callable` and `Vector` are imported now for your Your turn, the vector version.

```check
run ".venv/Scripts/python -m pytest -q tests/test_walking.py -k downhill" label="downhill steps against the slope, and keeps every guess" -- path = [start]; then steps times, w = path[-1] and path.append(w - rate * slope(w)).
run ".venv/Scripts/python -m mypy --strict src/frontier/descent.py" stdout="Success" label="mypy --strict passes" -- downhill takes a Function, a float, a float and an int, and returns list[float].
```

## The guess rolls to the average

Now let it go. This experiment starts the guess at 0 and takes 30 steps at rate 0.1, using lesson 5.2's `guess_slope` for the slopes, with the data fixed by a `lambda` as in lesson 5.1. It prints every fifth guess: `range(0, 31, 5)` counts from 0 up to 30 in fives (a third argument to `range` is the step). Create `experiments/roll_to_average.py`:

```python file=experiments/roll_to_average.py
"""Gradient descent on the guessing loss for 2, 3 and 7, from a guess of 0."""
from frontier.descent import downhill
from frontier.guessing import guess_slope

DATA = [2.0, 3.0, 7.0]
path = downhill(lambda w: guess_slope(w, DATA), 0.0, 0.1, 30)
for step in range(0, 31, 5):
    print(f"step {step:>2}: w = {path[step]:.4f}")
```

The first step goes from 0 to 0.8. The distance to the bottom, 4, went from 4 to 3.2. Every step changes that distance the same way, because the slope is 2 × (*w* − 4): the step is 0.1 × 2 = 0.2 of the distance, so what's left is the rest.

```predict
question: Each step multiplies the distance to 4 by the same number. What is it, at rate 0.1?
choice: 0.2
choice: 0.8
choice: 0.9
answer: 0.8
explain: Each step covers rate × 2 = 0.2 of the distance (the slope is twice the distance), so 1 − 0.2 = 0.8 of it is left: 4, then 3.2, then 2.56. In general the distance is multiplied by 1 − 2 × rate.
verify: script distance_factor.py
```

```powershell
.venv\Scripts\python experiments/roll_to_average.py
```

```text
step  0: w = 0.0000
step  5: w = 2.6893
step 10: w = 3.5705
step 15: w = 3.8593
step 20: w = 3.9539
step 25: w = 3.9849
step 30: w = 3.9950
```

The guess rolls to the average without anyone solving anything: fast at first, where the loss is steep, then slower and slower as the slope flattens near the bottom. After 30 steps it's within 0.005 of 4, because 0.8 multiplied by itself 30 times is about 0.001, and 0.001 of the first distance, 4, is 0.005.

```check
run ".venv/Scripts/python experiments/roll_to_average.py" stdout="step 30: w = 3.9950" label="the guess rolls towards the average" -- path = downhill(lambda w: guess_slope(w, DATA), 0.0, 0.1, 30), then print path[step] for step in range(0, 31, 5).
```

## How big a step?

The distance to the bottom is multiplied by 1 − 2 × rate at every step. That one number explains everything the learning rate can do. Try it in the figure first: drag the learning rate, and step the guess down the curve.

```figure
name: frontier/DescentSteps
caption: Gradient descent on the guessing loss for 2, 3 and 7, from a guess of 0. Each step moves the learning rate times the slope, against it.
props: {"data": [2, 3, 7], "start": 0, "rate": 0.1, "steps": 20}
```

This experiment runs 6 steps at four learning rates and prints every guess on one line, each 6 characters wide with 2 decimals. Create `experiments/learning_rates.py`:

```python file=experiments/learning_rates.py
"""Six steps of gradient descent on the guessing loss, at four learning rates."""
from frontier.descent import downhill
from frontier.guessing import guess_slope

DATA = [2.0, 3.0, 7.0]
for rate in [0.1, 0.5, 1.0, 1.1]:
    path = downhill(lambda w: guess_slope(w, DATA), 0.0, rate, 6)
    print(f"rate {rate}:", " ".join(f"{w:6.2f}" for w in path))
```

Work out 1 − 2 × rate for each rate before you run it. At 0.1 it's 0.8, as before. At 0.5 it's 0.

```predict
question: What happens at rate 1.0?
choice: it creeps towards 4
choice: it lands on 4 in one step
choice: it bounces between 0 and 8 forever
choice: it flies off, further away every step
answer: it bounces between 0 and 8 forever
explain: At 1.0 the distance is multiplied by 1 − 2 = −1: the same size, other side. From 0 (4 below the bottom) the guess jumps to 8 (4 above), then back to 0, forever. Rate 0.5 is the one that lands in one step (the factor is 0), and above 1.0 the factor is bigger than 1 in size, so it flies off.
verify: script rate_one.py
```

```powershell
.venv\Scripts\python experiments/learning_rates.py
```

```text
rate 0.1:   0.00   0.80   1.44   1.95   2.36   2.69   2.95
rate 0.5:   0.00   4.00   4.00   4.00   4.00   4.00   4.00
rate 1.0:   0.00   8.00   0.00   8.00   0.00   8.00   0.00
rate 1.1:   0.00   8.80  -1.76  10.91  -4.29  13.95  -7.94
```

Four rates, four behaviours. Too small, and it creeps. Exactly right, and it lands at once (only because this loss is a perfect parabola; a real loss doesn't allow that). At 1.0, it bounces forever. Above that, every step overshoots by more than the last, and the guess runs off: it **diverges**. When a real training run's loss suddenly shoots up to `inf` or `nan`, a learning rate that's too big is the first suspect. Chapter 18 builds the optimisers that choose steps more cleverly.

```check
run ".venv/Scripts/python experiments/learning_rates.py" stdout="rate 1.0:   0.00   8.00   0.00   8.00" label="rate 1.0 bounces between 0 and 8" -- path = downhill(lambda w: guess_slope(w, DATA), 0.0, rate, 6) for each rate, printed with :6.2f.
run ".venv/Scripts/python experiments/learning_rates.py" stdout="rate 1.1:   0.00   8.80  -1.76" label="rate 1.1 runs off" -- Include 1.1 in the list of rates.
```

## Your turn: descend on a vector

With many parameters, the rule is the same, with the gradient in place of the slope:

new point = point − rate × gradient at point

Every parameter moves against its own partial slope, all in the same step. In NumPy that's one line of arithmetic on arrays, since a number times a vector multiplies every entry (lesson 4.4's broadcasting).

**Build, on your own:** `descend(grad, start, rate, steps)` at the end of `src/frontier/descent.py`. `grad` is a function from a `Vector` to a `Vector`, its type `Callable[[Vector], Vector]`; `start` is a `Vector`, `rate` a `float` and `steps` an `int`. Return a `list[Vector]`: every point along the way, the start included, exactly as `downhill` does for one number.

Write each new point as `point - rate * grad(point)`, which makes a **new** array. `point -= ...` would change the array in place (lesson 4.4's `center` warned about the same thing): every entry in the list would be the same array, so the whole path would show only the last point, and the caller's `start` would be changed too.

```hints
nudge: It's downhill with a vector: path = [start], then steps times, take the last point and append point - rate * grad(point).
concept: The type of grad is Callable[[Vector], Vector], and descend returns list[Vector]. Use point - rate * grad(point), never point -= ..., so every point in the path is an array of its own and start is left alone.
answer: At the end of `src/frontier/descent.py`:
~~~python
def descend(grad: Callable[[Vector], Vector], start: Vector, rate: float, steps: int) -> list[Vector]:
    """downhill for a vector: each step moves rate times the gradient, against it."""
    path = [start]
    for _ in range(steps):
        point = path[-1]
        path.append(point - rate * grad(point))
    return path
~~~
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_walking.py -k descend" label="descend steps against the gradient, on new arrays" -- path = [start]; steps times, point = path[-1], then path.append(point - rate * grad(point)).
run ".venv/Scripts/python -m pytest -q tests/test_walking.py tests/test_many_inputs.py tests/test_chain.py tests/test_rules.py tests/test_slopes.py" label="every Chapter 5 test passes" -- Leave downhill as it was.
run ".venv/Scripts/python -m mypy --strict src/frontier/descent.py" stdout="Success" label="mypy --strict still passes" -- descend takes a Callable[[Vector], Vector], a Vector, a float and an int, and returns list[Vector].
```

## A ball on a surface, and Chapter 5 done

Last, the picture the plan for this chapter promised: a ball rolling down a surface. The surface is lesson 5.4's bowl, *x*² + 10*y*², and the ball starts at (−4, 1). `gradient` measures the slopes at each point, so `descend` gets `lambda p: gradient(bowl, p)`, and takes 30 steps at rate 0.09.

To draw a surface on flat paper, draw its **contour lines**, as a hiking map does: each line joins points of equal height. `ax.contour(xs, ys, heights)` draws them. `heights` must be a table with one row per number in `ys` and one column per number in `xs`. Broadcasting builds it: `ys.reshape(len(ys), 1)` makes `ys` a column, shape `(41, 1)`, and adding it to `xs`, shape `(61,)`, gives every combination, `(41, 61)` (lesson 4.4's rules). `np.array(path)` stacks the path's points as rows, so its column 0 is every *x* and column 1 every *y*. Then `ax.plot(..., marker="o")` draws the path with a dot at each step. Create `experiments/draw_descent.py`:

```python file=experiments/draw_descent.py
"""A ball rolling down the bowl x² + 10y²: gradient descent drawn on a contour map."""
from pathlib import Path

import numpy as np
from matplotlib.figure import Figure

from frontier.arrays import Vector
from frontier.descent import descend
from frontier.gradients import gradient


def bowl(p: Vector) -> float:
    return float(p[0] ** 2 + 10 * p[1] ** 2)


path = descend(lambda p: gradient(bowl, p), np.array([-4.0, 1.0]), 0.09, 30)
points = np.array(path)
xs = np.linspace(-5.0, 5.0, 61)
ys = np.linspace(-2.0, 2.0, 41)
heights = xs ** 2 + 10 * ys.reshape(len(ys), 1) ** 2
fig = Figure(figsize=(6, 4), layout="constrained")
ax = fig.add_subplot()
ax.contour(xs, ys, heights)
ax.plot(points[:, 0], points[:, 1], marker="o")
ax.set_xlabel("x")
ax.set_ylabel("y")
Path("pictures").mkdir(exist_ok=True)
fig.savefig("pictures/descent.png")
print("after 30 steps:", np.round(path[-1], 4), f"height {bowl(path[-1]):.6f}")
```

The bowl is 10 times steeper along *y* than along *x*. At rate 0.09, each step multiplies the distance along *x* by 1 − 0.09 × 2 = 0.82, and along *y* by 1 − 0.09 × 20 = −0.8: the same arithmetic as the guessing loss, once per direction.

```predict
question: What does the path do along y on its way down?
choice: creeps down to 0 from above, like x
choice: zigzags from one side of 0 to the other, shrinking
choice: grows further from 0 every step
answer: zigzags from one side of 0 to the other, shrinking
explain: Along y each step multiplies the distance by −0.8: the minus flips it to the other side of 0, and 0.8 shrinks it. So y goes 1, −0.8, 0.64, −0.51 … while x, multiplied by 0.82, creeps from −4 towards 0 without crossing.
verify: script zigzag.py
```

```powershell
.venv\Scripts\python experiments/draw_descent.py
Invoke-Item pictures\descent.png
```

```text
after 30 steps: [-0.0104  0.0012] height 0.000123
```

The picture shows ovals around the bottom, wider along *x* than along *y*, because the bowl rises faster along *y*. The path zigzags across the valley while it creeps along it. The steep direction sets a speed limit: above rate 0.1, the factor along *y*, 1 − 20 × rate, is bigger than 1 in size, and the ball would fly out of the bowl along *y* even though *x* is still crawling. (At 0.11, *y* is over 200 after 30 steps.) Real losses have millions of directions with very different steepnesses, and that's exactly the problem momentum and Adam, in Chapter 18, were invented for.

```check
run ".venv/Scripts/python experiments/draw_descent.py" stdout="height 0.000123" label="the ball rolls down the bowl" -- path = descend(lambda p: gradient(bowl, p), np.array([-4.0, 1.0]), 0.09, 30).
file pictures/descent.png -- Run .venv\Scripts\python experiments/draw_descent.py
```

Commit and push:

```powershell
git add .
git commit -m "Gradient descent, on one number and on a surface"
git push
```

```check
git-clean -- Something isn't committed yet. Run git status to see what.
git-pushed -- Run git push
```

### What you have

```text
src/frontier/
  descent.py             downhill (one number) and descend (a vector): steps against the slope or gradient
experiments/
  roll_to_average.py     the guess rolls from 0 to the average, 4
  learning_rates.py      four learning rates: creeping, landing, bouncing, running off
  draw_descent.py        a ball rolling down a bowl, drawn on a contour map: pictures/descent.png
tests/
  test_walking.py        -k downhill, descend
```

That's Chapter 5. A slope says which way is downhill and how steep it is; you can measure it by nudging, or get it exactly by rule. The chain rule multiplies slopes along a chain, going backwards, and adds them where paths join. The gradient gathers the slope along every input into one vector pointing steepest uphill, and gradient descent walks the other way, at a learning rate that has to be chosen with care. Chapter 8 uses all of this to fit a line to data. Before that, Chapter 6 is about chance: probability, measured by simulation, which every model's predictions and every experiment's error bars rest on.
