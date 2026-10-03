---
title: 2.4 — Rolling Downhill: Gradients
track: Mathematics Through Computation
runtime: none
concepts: gradients, gradient-descent
revisits: derivatives, vectors, mathematical-functions
notebook: ml-gradients-and-chain-rule, ml-gradient-descent
lab: 1
problem: A real model has many weights, not one. How do you find the downhill direction when you can change several numbers at once?
---

A house-price model has at least two numbers to learn: a price per square foot and a base price. Its loss is a function of both, $L(w, b)$, and you can picture it as a **landscape**: a position on the ground is a choice of $(w, b)$, and the height there is the loss. Training means finding the lowest point.

Last lesson, with one weight, the derivative said "uphill is to the right" or "to the left". On a landscape, "downhill" could be any compass direction. This lesson finds it, with a vector called the **gradient**, and then rolls a ball down a landscape you can watch in the terminal.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_gradients.py provided
# Tests for gradients.py and landscape.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_gradients.py
from pytest import approx

import gradients


def bowl(point):
    x, y = point
    return (x - 3) ** 2 + 2 * (y + 1) ** 2


def test_partial_changes_one_coordinate_at_a_time():
    assert gradients.partial(bowl, [0.0, 0.0], 0) == approx(-6)
    assert gradients.partial(bowl, [0.0, 0.0], 1) == approx(4)


def test_partial_leaves_the_point_alone():
    point = [0.0, 0.0]
    gradients.partial(bowl, point, 0)
    assert point == [0.0, 0.0]


def test_gradient_collects_one_slope_per_direction():
    assert gradients.gradient(bowl, [0.0, 0.0]) == approx([-6, 4])
    assert gradients.gradient(bowl, [3.0, -1.0]) == approx([0, 0], abs=1e-6), "flat at the bottom"
    assert gradients.gradient(lambda p: p[0] * p[1] + p[2] ** 2, [1.0, 2.0, 3.0]) == approx([2, 1, 6])


def test_descend_records_the_whole_path():
    path = gradients.descend(bowl, [0.0, 2.0], rate=0.1, steps=30)
    assert len(path) == 31, "the start, then one point per step"
    assert path[0] == [0.0, 2.0]
    assert path[1] == approx([0.6, 0.8])


def test_descend_rolls_to_the_bottom():
    path = gradients.descend(bowl, [0.0, 2.0], rate=0.1, steps=100)
    assert path[-1] == approx([3, -1], abs=1e-4)
    heights = [bowl(p) for p in path]
    assert all(later <= earlier for earlier, later in zip(heights, heights[1:])), "never uphill"


def test_descend_diverges_when_the_rate_is_too_large():
    path = gradients.descend(bowl, [0.0, 2.0], rate=0.6, steps=50)
    assert abs(path[-1][1]) > 1000


def test_landscape_marks_the_path_and_the_bottom():
    import landscape
    rows = landscape.render(bowl, [[0.0, 2.0], [3.0, -1.0]])
    assert len(rows) == 15 and all(len(row) == 29 for row in rows)
    assert rows[2][4] == "o", "the start (0, 2) is drawn in row 2, column 4"
    assert rows[8][16] == "X", "the bottom (3, -1) is drawn in row 8, column 16"
```

`bowl` is the landscape for this lesson: a valley whose lowest point is at $x = 3, y = -1$, where both squared terms are 0. It's steeper in the $y$ direction (the 2 in front) than in $x$, and that difference will matter.

```check
file tests/test_gradients.py -- Click "Create provided tests/test_gradients.py" above.
```

## One direction at a time

Stand at $(0, 0)$ on the bowl. Ask one question at a time: if I move a tiny bit in the $x$ direction only, keeping $y$ fixed, how fast does the height change? That's the **partial derivative** with respect to $x$, written $\frac{\partial f}{\partial x}$ (the curly $\partial$ means "only this variable changes"). With $y$ held at 0, the bowl is just $(x-3)^2 + 2$, a one-variable function, and last lesson's `derivative` can measure its slope.

*Picture it as* standing on a hillside with a map. "How steep is it if I walk due east?" and "how steep is it if I walk due north?" are separate questions with separate answers. Each is a partial derivative: the slope in one compass direction, with the other held still.

So a partial derivative is an ordinary derivative of a **slice** through the landscape. Create `gradients.py`:

```python file=gradients.py
import calculus


def partial(f, point: list[float], i: int, h: float = 1e-5) -> float:
    def along(t: float) -> float:
        moved = list(point)
        moved[i] = t
        return f(moved)

    return calculus.derivative(along, point[i], h)
```

`along` is a function defined **inside** `partial`. It takes one number, `t`, puts it in position `i` of a *copy* of the point, and returns the height there. That's exactly the one-variable slice: every coordinate fixed except number `i`. Then `calculus.derivative` measures the slope of the slice at the point's own coordinate.

`along` can read `point` and `i` even though they aren't its parameters: an inner function sees the variables of the function around it. (A function that carries variables from where it was made is called a **closure**. *Picture it as* a worker sent off with a clipboard: the clipboard holds the details of the job, `point` and `i`, so the worker doesn't need to be told them again on each call.)

`list(point)` copies the point, so the caller's list is never changed: the second test checks that.

At $(0, 0)$: along $x$, the slope is $2(x - 3) = -6$ (going right goes downhill, steeply); along $y$, it's $4(y + 1) = 4$ (going up the $y$ axis goes uphill).

```check
run ".venv/Scripts/python -m pytest -q tests/test_gradients.py -k partial" label="partial measures the slope in one direction and leaves the point unchanged" -- moved = list(point) copies the point before changing coordinate i.
```

## The gradient

Put every partial derivative into one vector, and you have the **gradient**, written $\nabla f$ ("nabla f" or "grad f"):

> **Gradient**: the vector of a function's partial derivatives, one per input. It points in the direction in which the function increases fastest, and its length says how fast.
>
> *Picture it as* an arrow painted on the ground at every spot on the hillside, pointing straight up the steepest way, longer where the slope is steeper. Gradient descent ignores where the arrows point and walks the opposite way. **Where the picture stops working:** a hillside has two directions; a model with a thousand weights has a "hillside" in a thousand directions, and the gradient has a thousand entries. The arithmetic doesn't change.


$$\nabla f = \left[\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n}\right]$$

Add it:

```python file=gradients.py
import calculus


def partial(f, point: list[float], i: int, h: float = 1e-5) -> float:
    def along(t: float) -> float:
        moved = list(point)
        moved[i] = t
        return f(moved)

    return calculus.derivative(along, point[i], h)


def gradient(f, point: list[float]) -> list[float]:
    return [partial(f, point, i) for i in range(len(point))]
```

At $(0, 0)$ on the bowl, $\nabla f = [-6, 4]$. This vector has a remarkable property: **it points in the direction of steepest ascent**, and its length is how steep that is. Of all the directions you could step from $(0, 0)$, the one that climbs fastest is $[-6, 4]$ (normalised to unit length). So the one that **descends** fastest is the opposite: $-\nabla f = [6, -4]$, right and down.

Why the gradient, of all vectors? A small step $\mathbf{d}$ changes the height by about $\nabla f \cdot \mathbf{d}$: each partial derivative times how far you moved in its direction, added up. That's a **dot product** (lesson 2.1 again). For steps of a fixed length, a dot product is largest when the two vectors point the same way, cosine 1, and most negative when they point opposite ways, cosine −1.

At the bottom, $(3, -1)$, the gradient is $[0, 0]$: no direction goes downhill. That's how an algorithm knows it has arrived.

```check
run ".venv/Scripts/python -m pytest -q tests/test_gradients.py -k gradient_collects" label="gradient collects every partial derivative" -- One partial per coordinate: [partial(f, point, i) for i in range(len(point))]
```

## Roll downhill

Now gradient descent in any number of dimensions. It's last lesson's step, applied to every coordinate at once:

*Picture it as* walking downhill in thick fog. You can't see the valley floor, but you can feel which way the ground slopes under your feet. Take a step that way, feel again, step again. The learning rate is your stride length: too short and you take all day; too long and you stride straight across the valley and up the other side.

$$\mathbf{p}_{\text{new}} = \mathbf{p} - \eta \, \nabla f(\mathbf{p})$$

Add `descend`, which records every point the ball visits:

```python file=gradients.py
import calculus


def partial(f, point: list[float], i: int, h: float = 1e-5) -> float:
    def along(t: float) -> float:
        moved = list(point)
        moved[i] = t
        return f(moved)

    return calculus.derivative(along, point[i], h)


def gradient(f, point: list[float]) -> list[float]:
    return [partial(f, point, i) for i in range(len(point))]


def descend(f, start: list[float], rate: float, steps: int) -> list[list[float]]:
    point = list(start)
    path = [point]
    for _ in range(steps):
        point = [p - rate * g for p, g in zip(point, gradient(f, point))]
        path.append(point)
    return path
```

Each step builds a **new** list for `point` instead of changing the old one, so every point in `path` stays as it was. If the loop changed `point` in place, `path` would end up holding thirty-one references to the same list, all showing the final position. (The Notebook Lab lesson *Names and references* explains why.)

Trace the first step from $(0, 2)$ with $\eta = 0.1$: the gradient there is $[2(0 - 3), 4(2 + 1)] = [-6, 12]$, so the new point is $(0 + 0.6, 2 - 1.2) = (0.6, 0.8)$. The third test checks exactly that.

```check
run ".venv/Scripts/python -m pytest -q tests/test_gradients.py -k descend" label="descend rolls to the bottom with a small rate, and flies off with a large one" -- Each step: point = [p - rate * g for p, g in zip(point, gradient(f, point))]
```

## Watch the ball

Numbers in a list are hard to picture. Draw the landscape in the terminal: darker characters for higher ground, `o` for each point the ball visits, `X` for the bottom. Create `landscape.py`:

```python file=landscape.py
import sys

import gradients

SHADES = " .:-=+*#%@"                          # low to high
XS = [-1 + 0.25 * i for i in range(29)]     # left to right: -1 to 6
YS = [3 - 0.5 * j for j in range(15)]       # top to bottom: 3 to -4


def bowl(point: list[float]) -> float:
    x, y = point
    return (x - 3) ** 2 + 2 * (y + 1) ** 2


def cell(value: float, step: float) -> int:
    return round(value / step)


def render(f, path: list[list[float]]) -> list[str]:
    heights = [[f([x, y]) for x in XS] for y in YS]
    top = max(max(row) for row in heights)
    grid = [[SHADES[min(int(h / top * len(SHADES)), len(SHADES) - 1)] for h in row] for row in heights]
    for x, y in path:
        col, row = cell(x - XS[0], 0.25), cell(YS[0] - y, 0.5)
        if 0 <= row < len(YS) and 0 <= col < len(XS):
            grid[row][col] = "o"
    grid[cell(YS[0] - (-1), 0.5)][cell(3 - XS[0], 0.25)] = "X"
    return ["".join(row) for row in grid]


def main(argv: list[str]) -> None:
    rate = float(argv[0]) if argv else 0.1
    path = gradients.descend(bowl, [0.0, 2.0], rate, 30)
    print("\n".join(render(bowl, path)))
    for i in [0, 1, 2, 5, 10, 30]:
        x, y = path[i]
        print(f"step {i:>2}: ({x:7.3f}, {y:7.3f})  height {bowl(path[i]):9.4f}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

How `render` turns numbers into a picture:

1. `heights` evaluates the bowl at every point of a 15 × 29 grid: a **table** of a two-variable function, lesson 2.3's idea in two dimensions.
2. Each height becomes a character. `h / top` is between 0 and 1; times 10 and rounded down, it picks one of the 10 shades. `min(…, 9)` keeps the very highest point from indexing past the end.
3. Each point of the path is converted from coordinates to a grid cell (`cell` divides by the grid spacing and rounds) and drawn as `o`, if it's inside the picture.
4. The grid's rows run **top to bottom** while $y$ runs **bottom to top**, so the row is `YS[0] - y`, not `y - YS[0]`. Every program that draws a graph has to make this flip.

```powershell
.venv\Scripts\python landscape.py 0.1
```

```text
@@@%%%#####***********#####%%
%%##****+++++++++++++++++****
#**+o++=====---------=====+++
+++===-----:::::::::::-----==
+==---o::::...........:::::--
=---:::.......     .......:::
--:::...o.             .....:
--::....  oo             ....
-:::....    ooooX        ....
--::....                 ....
--:::.....             .....:
=---:::.......     .......:::
+==---:::::...........:::::--
+++===-----:::::::::::-----==
#**++++=====---------=====+++
step  0: (  0.000,   2.000)  height   27.0000
step  1: (  0.600,   0.800)  height   12.2400
step  2: (  1.080,   0.080)  height    6.0192
step  5: (  2.017,  -0.767)  height    1.0752
step 10: (  2.678,  -0.982)  height    0.1044
step 30: (  2.996,  -1.000)  height    0.0000
```

Look at the shape of the path. The ball doesn't head straight for `X`. It drops **steeply in $y$ first** (from 2 to −0.77 in five steps), then creeps along the valley floor in $x$. The steepest-descent direction points across the valley's steep walls more than along its gentle floor.

```check
run ".venv/Scripts/python -m pytest -q tests/test_gradients.py" label="every gradient test passes, including the landscape drawing" -- Rows run top to bottom: the row for y is cell(YS[0] - y, 0.5).
run ".venv/Scripts/python landscape.py 0.1" stdout="step 30: (  2.996,  -1.000)" label="with rate 0.1 the ball reaches the bottom in 30 steps"
```

## Break it: the learning rate

Now run it with bigger and smaller learning rates:

```powershell
.venv\Scripts\python landscape.py 0.5
```

```predict
question: With learning rate 0.5, where is the ball after 30 steps?
choice: At the bottom, faster than with 0.1
choice: At x = 3 exactly, but bouncing between y = 2 and y = −4 for ever
choice: Flown off to infinity in both directions
answer: At x = 3 exactly, but bouncing between y = 2 and y = −4 for ever
explain: Each step multiplies the distance from the bottom by (1 − η × curvature), separately in each direction. In x the curvature is 2: (1 − 0.5 × 2) = 0, so x jumps to 3 in one step and stays there. In y the curvature is 4: (1 − 0.5 × 4) = −1, so the y-distance flips sign every step and never shrinks: from 3 above the bottom to 3 below, and back, for ever. The height stays at 18.

Try 0.6: in y, (1 − 0.6 × 4) = −1.4, and each bounce is 40% bigger than the last. After 30 steps y is about 72,600.
```

```powershell
.venv\Scripts\python landscape.py 0.6
.venv\Scripts\python landscape.py 0.02
```

With 0.02 there's no danger, but after 30 steps the ball is still at $(2.12, -0.75)$, far from the bottom. The $y$ direction is fine; it's the gentle $x$ direction that crawls: its distance shrinks by a factor of only $1 - 0.02 \times 2 = 0.96$ per step.

That's the real problem, and it doesn't go away by choosing the rate cleverly. **The steepest direction limits the learning rate** (above 0.5 here, $y$ diverges), and **the gentlest direction sets how many steps you need**. The more different the two curvatures, the worse it gets. On this bowl they differ by a factor of 2. In Chapter 3, with prices in dollars and areas in square feet, they'll differ by a factor of millions, and plain gradient descent will either explode or take forever, until you fix the landscape itself with **feature scaling**.

### Chapter 2: what you know now

| Idea | What it is in code | Where it comes back |
|---|---|---|
| Vector | a list of numbers; a house | every dataset row, every weight vector |
| Dot product | `sum(a * b …)`; `w @ x` | every prediction of a linear model; neural network layers; similarity |
| Distance, cosine, correlation | lengths and angles of vectors | k-nearest neighbours; embeddings |
| Matrix, matrix multiplication | rows of vectors; every row dotted with every column | `X @ w`: all predictions at once |
| Derivative | the slope at a point; `(f(x+h) − f(x−h)) / 2h` | which way to move a weight |
| Gradient | every partial derivative in one vector | the direction gradient descent steps against |
| Learning rate | the step size | the first thing that breaks training |

Next chapter puts all of it together. You'll build a linear regression model from scratch, train it with gradient descent on the house prices, watch it fail exactly the way this lesson predicts, fix it, and then compare your model with scikit-learn's.
