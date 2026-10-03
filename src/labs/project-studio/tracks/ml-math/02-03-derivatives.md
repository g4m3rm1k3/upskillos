---
title: 2.3 — Which Way Is Downhill? Derivatives
track: Mathematics Through Computation
runtime: none
concepts: mathematical-functions, derivatives, loss
revisits: descriptive-statistics, testing
notebook: ml-rates-of-change, ml-loss-functions
lab: 1
problem: The hand-picked weights are 31,000 off. Should each weight go up or down, and by how much? A model needs a number that says which way to change.
---

At the end of the last lesson the weights were guesses. Imagine adjusting one of them, the price per square foot, by hand: try 140, look at the error; try 141, look again. If the error went down, keep going up; if it went up, turn round. You'd be measuring **how much the error changes when the weight changes**. That quantity has a name, the **derivative**, and it's the single idea from calculus that machine learning can't do without. This lesson builds it numerically first, then exactly.

## Read the tests first

**This step: create the supplied test file and read it. No code yet.**

```python file=tests/test_calculus.py provided
# Tests for calculus.py and one_weight.py. Run them with:
#   .venv\Scripts\python -m pytest -q tests/test_calculus.py
import math

from pytest import approx

import calculus


def square(x):
    return x * x


def test_table_pairs_each_x_with_f_of_x():
    assert calculus.table(square, [0, 1, 2, 3]) == [(0, 0), (1, 1), (2, 4), (3, 9)]


def test_slope_of_a_line_is_the_same_everywhere():
    line = lambda x: 3 * x + 1
    assert calculus.slope(line, 0, 10) == 3
    assert calculus.slope(line, -5, 2) == 3


def test_slope_of_a_curve_depends_on_where_you_measure():
    assert calculus.slope(square, 1, 2) == 3
    assert calculus.slope(square, 2, 3) == 5


def test_forward_difference_is_close_but_biased():
    assert calculus.forward_difference(square, 3, h=0.1) == approx(6.1)


def test_central_difference_cancels_that_bias():
    assert calculus.derivative(square, 3, h=0.1) == approx(6, abs=1e-9)


def test_central_difference_on_known_derivatives():
    assert calculus.derivative(math.sin, 0) == approx(1, abs=1e-8), "d/dx sin x = cos x"
    assert calculus.derivative(lambda x: x ** 3, 2) == approx(12, abs=1e-6), "d/dx x³ = 3x²"
    assert calculus.derivative(math.exp, 1) == approx(math.e, abs=1e-6), "d/dx eˣ = eˣ"


def test_weight_loss_is_smallest_at_the_best_weight():
    import one_weight
    best = 1970 / 14
    assert one_weight.loss(best) < one_weight.loss(best - 1)
    assert one_weight.loss(best) < one_weight.loss(best + 1)


def test_weight_slope_formula_matches_the_numerical_derivative():
    import one_weight
    for w in [0, 100, 140, 200]:
        assert one_weight.loss_slope(w) == approx(calculus.derivative(one_weight.loss, w), rel=1e-6)
    assert one_weight.loss_slope(100) == approx(-380)


def test_weight_step_moves_downhill():
    import one_weight
    assert one_weight.step(100, rate=0.01) == approx(103.8)
    assert one_weight.loss(one_weight.step(100, rate=0.01)) < one_weight.loss(100)
```

The tests for derivatives compare against functions whose derivatives are known from calculus tables: $x^3$ has derivative $3x^2$, $\sin x$ has $\cos x$. You don't need those rules to follow this lesson; they're there as checks the code can't fake.

```check
file tests/test_calculus.py -- Click "Create provided tests/test_calculus.py" above.
```

## A function is a machine

In mathematics a **function** takes an input and gives exactly one output: $x \to f(x)$. $f(x) = x^2$ takes 3 and gives 9. A Python function that takes a number and returns a number, with no side effects, is the same thing, and that's how this lesson will treat both.

A **table** of a function, its inputs paired with outputs, is the oldest way to see what it does. Create `calculus.py`:

```python file=calculus.py
def table(f, xs: list[float]) -> list[tuple[float, float]]:
    return [(x, f(x)) for x in xs]
```

`f` is a parameter that holds a **function**. Python functions are values: you can pass `square` (without calling it, no parentheses) and `table` calls it for each `x`. You've done this before without naming it: `sorted(…, key=lambda pair: …)` passed a function to `sorted`.

```powershell
.venv\Scripts\python -c "import calculus; print(calculus.table(lambda x: x * x, [0, 1, 2, 3, 4]))"
```

```text
[(0, 0), (1, 1), (2, 4), (3, 9), (4, 16)]
```

Read the outputs: from 0 to 1 the output rises by 1, from 1 to 2 by 3, from 2 to 3 by 5, from 3 to 4 by 7. The function gets **steeper** as $x$ grows. "How steep is it, here?" is the question the rest of the lesson answers.

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py -k table" label="table pairs each x with f(x)"
```

## Slope between two points

The steepness between two points is the **slope**: how much the output changed, divided by how much the input changed.

$$\text{slope} = \frac{\Delta y}{\Delta x} = \frac{f(x_2) - f(x_1)}{x_2 - x_1}$$

($\Delta$, "delta", means "change in".) Add it:

```python file=calculus.py
def table(f, xs: list[float]) -> list[tuple[float, float]]:
    return [(x, f(x)) for x in xs]


def slope(f, x1: float, x2: float) -> float:
    return (f(x2) - f(x1)) / (x2 - x1)
```

For a straight line, $3x + 1$, the slope is 3 wherever you measure: that's what makes it straight. For $x^2$, the slope from 1 to 2 is 3, from 2 to 3 is 5. It depends where you measure, and also *how far apart* the two points are: from 2 to 3 it's 5, from 2 to 2.5 it's 4.5, from 2 to 2.1 it's 4.1.

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py -k slope_of" label="slope is change in output over change in input"
```

## The slope at one point

Shrink the gap. The slope of $x^2$ from 2 to $2 + h$:

| $h$ | slope from 2 to $2+h$ |
|---|---|
| 1 | 5 |
| 0.5 | 4.5 |
| 0.1 | 4.1 |
| 0.01 | 4.01 |
| 0.001 | 4.001 |

As $h$ shrinks, the slope approaches 4, and the slope it approaches is the **derivative** of $f$ at 2, written $f'(2)$:

$$f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}$$

"lim" says: the value this fraction gets as close to as you like, by making $h$ small enough. A computer can't take a limit, but it can use a small $h$. That's the **forward difference**:

```python file=calculus.py
def table(f, xs: list[float]) -> list[tuple[float, float]]:
    return [(x, f(x)) for x in xs]


def slope(f, x1: float, x2: float) -> float:
    return (f(x2) - f(x1)) / (x2 - x1)


def forward_difference(f, x: float, h: float = 1e-5) -> float:
    return (f(x + h) - f(x)) / h
```

For $x^2$ at 3 with $h = 0.1$, it gives 6.1, not 6. The table above shows why: the forward difference of $x^2$ is always exactly $2x + h$, so it's always off by $h$, in the same direction. That's a **bias**.

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py -k forward" label="the forward difference is h away from the true slope of x²"
```

## A better estimate: the central difference

Measure from **both sides** instead: from $x - h$ to $x + h$.

$$f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}$$

For $x^2$: $(x+h)^2 - (x-h)^2 = 4xh$, divided by $2h$ is exactly $2x$. The error the forward difference made on the right is cancelled by the opposite error on the left. For other functions it doesn't cancel completely, but what's left is proportional to $h^2$ instead of $h$: for $x^3$ at 2 with $h = 0.001$, the forward difference is off by 0.006 and the central difference by 0.000001. Add it as the derivative to use from now on:

```python file=calculus.py
def table(f, xs: list[float]) -> list[tuple[float, float]]:
    return [(x, f(x)) for x in xs]


def slope(f, x1: float, x2: float) -> float:
    return (f(x2) - f(x1)) / (x2 - x1)


def forward_difference(f, x: float, h: float = 1e-5) -> float:
    return (f(x + h) - f(x)) / h


def derivative(f, x: float, h: float = 1e-5) -> float:
    return (f(x + h) - f(x - h)) / (2 * h)
```

So a smaller $h$ is always better? Try it:

```powershell
.venv\Scripts\python -c "import calculus; print(calculus.derivative(lambda x: x * x, 3, h=1e-15))"
```

```predict
question: The true derivative of x² at 3 is 6. What does derivative(square, 3, h=1e-15) print?
choice: 6.0, exactly
choice: Something like 6.0000000001: a tiny error
choice: About 5.33: badly wrong
answer: About 5.33: badly wrong
explain: It prints 5.329070518200751. A Python float stores about 16 significant digits. f(3 + 1e-15) is 9.000000000000006 and change; f(3 − 1e-15) is 8.99999999999999 and change. Subtracting two nearly equal numbers keeps only the few digits where they differ, and those last digits are mostly **rounding error** from storing each value in the first place. Then dividing by 2e-15 magnifies that rounding error enormously.

So a numerical derivative has two errors pulling in opposite directions: a large h gives a bad approximation of the limit; a tiny h drowns in rounding. Somewhere around h = 1e-5 to 1e-8 the total is smallest for most functions, which is why that's the default here. This is one reason libraries don't compute derivatives numerically when they can avoid it: the next step shows the alternative.
```

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py -k central" label="the central difference matches known derivatives"
```

## A loss with one weight

Now apply this to a model. Take three houses, with floor area in thousands of square feet and price in thousands of dollars:

| area $x$ | price $y$ |
|---|---|
| 1.0 | 150 |
| 2.0 | 280 |
| 3.0 | 420 |

and the simplest possible model: price is a weight times area, $\hat{y} = wx$. How wrong is a given $w$? Use the **mean squared error**, the variance formula from lesson 1.2 with "the mean" replaced by "the prediction":

$$L(w) = \frac{1}{n}\sum_{i=1}^{n}(wx_i - y_i)^2$$

$L$ is the **loss**: a single number that says how bad the weight is. It's a function of $w$, so it has a derivative, and the derivative says how the loss changes when $w$ changes.

You can work it out exactly. For one house, the loss term is $(wx - y)^2$. If $u = wx - y$, the term is $u^2$, whose derivative with respect to $u$ is $2u$; and $u$ changes $x$ times as fast as $w$ does. Multiply the two rates (this is the **chain rule**, and you'll see it in full in Part XXIV, where it becomes backpropagation):

$$\frac{d}{dw}(wx - y)^2 = 2(wx - y)\,x \qquad\Rightarrow\qquad L'(w) = \frac{1}{n}\sum_{i=1}^{n} 2(wx_i - y_i)\,x_i$$

Create `one_weight.py`:

```python file=one_weight.py
AREA = [1.0, 2.0, 3.0]          # thousands of square feet
PRICE = [150.0, 280.0, 420.0]   # thousands of dollars


def loss(w: float) -> float:
    return sum((w * x - y) ** 2 for x, y in zip(AREA, PRICE)) / len(AREA)


def loss_slope(w: float) -> float:
    return sum(2 * (w * x - y) * x for x, y in zip(AREA, PRICE)) / len(AREA)
```

`loss_slope` is the formula; `calculus.derivative(loss, w)` measures the same thing numerically. The test checks that they agree at four different weights, to six significant figures. When an exact formula and a numerical measurement agree, you can trust the formula. This **gradient check** is how ML engineers test hand-derived gradients, and you'll use it again in Chapter 3.

At $w = 100$: the predictions are 100, 200, 300 against 150, 280, 420: all too low. $L'(100) = \frac{1}{3}[2(-50)(1) + 2(-80)(2) + 2(-120)(3)] = \frac{-100 - 320 - 720}{3} = -380$. **Negative**: increasing $w$ *decreases* the loss. The derivative has answered the question this lesson started with: which way should the weight move? Up.

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py -k \"weight_loss or weight_slope\"" label="the slope formula agrees with the numerical derivative" -- loss_slope: the mean of 2 * (w * x - y) * x.
```

## One step downhill

A derivative says which way is uphill and how steep. To make the loss smaller, step the other way, by an amount proportional to the steepness:

$$w_{\text{new}} = w - \eta \, L'(w)$$

$\eta$ ("eta") is the **learning rate**: how big a step to take. Add it:

```python file=one_weight.py
AREA = [1.0, 2.0, 3.0]          # thousands of square feet
PRICE = [150.0, 280.0, 420.0]   # thousands of dollars


def loss(w: float) -> float:
    return sum((w * x - y) ** 2 for x, y in zip(AREA, PRICE)) / len(AREA)


def loss_slope(w: float) -> float:
    return sum(2 * (w * x - y) * x for x, y in zip(AREA, PRICE)) / len(AREA)


def step(w: float, rate: float) -> float:
    return w - rate * loss_slope(w)
```

From $w = 100$ with $\eta = 0.01$: $100 - 0.01 \times (-380) = 103.8$, and the loss drops from 7,767 to about 6,390. Do it again from 103.8, and again. Watch:

```powershell
.venv\Scripts\python -c "import one_weight as m; w = 100.0; exec('for i in range(8):\n    w = m.step(w, 0.01)\n    print(round(w, 2), round(m.loss(w), 1))')"
```

The weight climbs towards about 140.7 and the loss falls towards about 31, each step smaller than the last, because the slope flattens near the bottom. 140.7 is $\frac{\sum xy}{\sum x^2} = \frac{1970}{14}$, the weight with the smallest possible loss. (Setting $L'(w) = 0$ and solving gives that formula, for this one-weight model.)

```predict
question: Starting from w = 100, what happens with learning rate 0.25 instead of 0.01?
choice: It reaches 140.7 twenty-five times faster
choice: It overshoots, and every step lands further from 140.7
choice: It stops at 100: the step is too big to take
answer: It overshoots, and every step lands further from 140.7
explain: The first step is 100 − 0.25 × (−380) = 195: past 140.7 by 54, further than it started (41 below). Then 68, then 237: the weight swings from side to side, each swing bigger, and flies off to infinity.

Why? For this loss, every step multiplies the distance from the best weight by (1 − η × 9.33), where 9.33 = 2 × (1 + 4 + 9) ÷ 3 is how fast the slope itself changes (the **curvature** of the loss). With η = 0.01 the factor is 0.91: a slow, steady approach. With 0.1 it's 0.07: almost there in one step. With 0.2 it's −0.87: overshooting, but each overshoot smaller. With 0.25 it's −1.33: each overshoot **bigger**. Run the loop above with 0.25 to watch it explode.

Too small a learning rate wastes thousands of steps; too large diverges. Choosing it is the first thing that goes wrong when training any model, and Chapter 3 shows how to choose it.
```

Repeating that step until the loss stops falling is **gradient descent**, the algorithm that trains almost every model in this series, including every neural network. With one weight, it's a ball rolling along a curve. Next lesson: two weights, a surface, and a gradient.

```check
run ".venv/Scripts/python -m pytest -q tests/test_calculus.py" label="every calculus test passes" -- step returns w - rate * loss_slope(w).
```
