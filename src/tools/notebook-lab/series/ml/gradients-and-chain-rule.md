# Gradients and the chain rule

The last lesson walked downhill on a curve with one variable, `x`. A real model has many adjustable numbers, called its **parameters**: a straight line has two (a slope and an intercept), a small neural network has thousands, a large language model has billions. Its error depends on all of them at once. To walk downhill you need to know, for every parameter, which way to nudge it, and all at the same time.

This lesson extends derivatives to functions of many variables. **Partial derivatives** measure the rate of change with respect to one variable at a time; collected into a vector, they form the **gradient**, which points straight uphill. Then comes the **chain rule**, which says how rates of change combine when one function feeds into another. The chain rule is what makes it possible to compute the gradient of a neural network, where the input passes through layer after layer. The lesson ends by deriving the gradient of a real model's error, and checking it numerically.

## Functions of two variables

A function of two variables takes two numbers and returns one, like the height of a landscape at each map position. You can picture it as a surface over a flat plane, or, more usefully on a flat screen, as a **contour plot**: a map with lines joining points of equal height, like the contour lines on a hiking map.

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x, y):
    return x ** 2 + 3 * y ** 2

xs = np.linspace(-3, 3, 200)
ys = np.linspace(-2, 2, 200)
X, Y = np.meshgrid(xs, ys)
Z = f(X, Y)

fig, ax = plt.subplots(figsize=(6, 4))
contours = ax.contour(X, Y, Z, levels=15)
ax.clabel(contours, fontsize=7)
ax.set_xlabel("x")
ax.set_ylabel("y")
ax.set_aspect("equal")
ax.set_title("f(x, y) = x² + 3y²: a bowl, seen from above")
plt.show()
```

`np.meshgrid` turns the list of x values and the list of y values into two 2D arrays holding the x and y coordinate of every point on a grid, so that `f(X, Y)` computes the height at all 40,000 points at once. `ax.contour` draws the contour lines and `ax.clabel` labels them with their heights. This function is a bowl whose lowest point is at `(0, 0)`, stretched into ellipses because `y` counts three times as much as `x`. The error of a model, as a function of its parameters, often looks like a bowl like this near its best values.

## Partial derivatives

How fast does `f` change as `x` changes? With two variables, the question needs one more detail: while `x` changes, what happens to `y`? The **partial derivative** with respect to `x` answers it by holding `y` **fixed** and treating it as a constant, so that `f` becomes an ordinary one-variable function of `x`. It is written with a curly ∂:

\[
\frac{\partial f}{\partial x}
\]

For `f(x, y) = x² + 3y²`, holding `y` fixed makes `3y²` a constant with derivative 0, so ∂f/∂x = 2x. Likewise, holding `x` fixed, ∂f/∂y = 6y. Numerically, it is the same central difference as before, nudging only one variable:

```python type
def f(x, y):
    return x ** 2 + 3 * y ** 2

x, y, h = 1.0, 2.0, 1e-5
df_dx = (f(x + h, y) - f(x - h, y)) / (2 * h)
df_dy = (f(x, y + h) - f(x, y - h)) / (2 * h)
print(df_dx, "rule: 2x =", 2 * x)
print(df_dy, "rule: 6y =", 6 * y)
```

```output
2.0000000000131024 rule: 2x = 2.0
12.000000000078613 rule: 6y = 12.0
```

At the point `(1, 2)`, moving in the x direction the height changes at rate 2, and in the y direction at rate 12. The surface is six times steeper in y there.

## The gradient

Collect the partial derivatives into a vector, and you have the **gradient**, written ∇f ("nabla f", or "grad f"):

\[
\nabla f = \left( \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right)
\]

For a function of a thousand variables, the gradient has a thousand components, one per variable. It has a remarkable geometric meaning: **the gradient points in the direction in which the function increases fastest**, and its length is that steepest rate of increase.

Here is why. Near a point, a smooth surface is almost a flat tilted plane, so moving a tiny step in the direction of a unit vector `u` changes the height at the rate `∇f · u`: each coordinate's rate times how much of that coordinate the step contains. From the vectors lesson, that dot product is ‖∇f‖ cos θ, where θ is the angle between `u` and the gradient. It is largest when cos θ = 1, that is, when `u` points exactly along the gradient. You can check by trying every direction:

```python type
import numpy as np

def f(x, y):
    return x ** 2 + 3 * y ** 2

point = np.array([1.0, 1.0])
h = 1e-5
angles = np.radians(np.arange(0, 360, 10))
rates = []
for angle in angles:
    u = np.array([np.cos(angle), np.sin(angle)])
    rates.append((f(*(point + h * u)) - f(*(point - h * u))) / (2 * h))
best = angles[np.argmax(rates)]
gradient = np.array([2 * point[0], 6 * point[1]])
print("steepest direction found:", np.degrees(best), "degrees")
print("gradient direction:      ", np.degrees(np.arctan2(gradient[1], gradient[0])).round(1), "degrees")
print("steepest rate:", round(max(rates), 3), " length of gradient:", np.linalg.norm(gradient).round(3))
```

```output
steepest direction found: 70.0 degrees
gradient direction:       71.6 degrees
steepest rate: 6.322  length of gradient: 6.325
```

Of 36 directions tried, the steepest is the one closest to the gradient's direction (`np.arctan2(y, x)` gives the angle of a vector), and the steepest rate matches the gradient's length. So minus the gradient points straight **downhill**. At every point, it is also perpendicular to the contour line through that point, which makes sense: walking along a contour line keeps the height the same, so it is the direction of no change at all. Before running the next cell, predict: in this stretched bowl, will the downhill arrows point straight at the centre?

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x, y):
    return x ** 2 + 3 * y ** 2

def gradient(x, y):
    return np.array([2 * x, 6 * y])

X, Y = np.meshgrid(np.linspace(-3, 3, 200), np.linspace(-2, 2, 200))
fig, ax = plt.subplots(figsize=(6, 4))
ax.contour(X, Y, f(X, Y), levels=12, colors="lightgray")
for px, py in [(2, 1), (-2.5, -0.5), (1, -1.5), (-1, 1.2)]:
    g = gradient(px, py)
    ax.annotate("", xy=(px - 0.15 * g[0], py - 0.15 * g[1]), xytext=(px, py),
                arrowprops=dict(arrowstyle="->", color="tab:red", lw=2))
ax.set_aspect("equal")
ax.set_title("Minus the gradient points straight downhill")
plt.show()
```

Each red arrow is minus the gradient (scaled down to fit), and each crosses its contour line at a right angle, heading down towards the bottom of the bowl. Notice the arrows do not point straight at the centre: in this stretched bowl, "steepest downhill" and "towards the minimum" are different directions, which is one reason gradient descent can take a curving path.

## Gradient descent in two dimensions

Gradient descent works exactly as in one dimension, updating every variable at once:

\[
(x, y) \leftarrow (x, y) - \text{step size} \times \nabla f(x, y)
\]

The arrow `←` means "is replaced by", like assignment in Python. Predict the shape of the path from `(2.5, 1.5)`: a straight line to the centre, or something else?

```python type
import numpy as np
import matplotlib.pyplot as plt

def f(x, y):
    return x ** 2 + 3 * y ** 2

def gradient(p):
    return np.array([2 * p[0], 6 * p[1]])

point = np.array([2.5, 1.5])
path = [point]
for _ in range(30):
    point = point - 0.1 * gradient(point)
    path.append(point)
path = np.array(path)
print("finished at", path[-1].round(4))

X, Y = np.meshgrid(np.linspace(-3, 3, 200), np.linspace(-2, 2, 200))
fig, ax = plt.subplots(figsize=(6, 4))
ax.contour(X, Y, f(X, Y), levels=12, colors="lightgray")
ax.plot(path[:, 0], path[:, 1], "o-", color="tab:red", markersize=3)
ax.set_aspect("equal")
plt.show()
```

```output
finished at [0.0031 0.    ]
```

The path heads mostly downhill in `y` first, where the bowl is steepest, then curves round to finish at the minimum `(0, 0)`. Training a model is this exact loop, with the point replaced by the model's parameters and `f` by its error on the data.

## The chain rule

Many functions are built by feeding one function into another. The temperature you feel on a mountain walk depends on your altitude, and your altitude depends on how long you have been walking. How fast does the temperature change per minute?

Suppose altitude rises 50 metres per minute, and temperature falls 0.0065 degrees per metre. Then temperature changes at 50 × (−0.0065) = −0.325 degrees per minute. **Rates of change multiply along a chain.** That is the **chain rule**. If `y` depends on `u`, and `u` depends on `x`:

\[
\frac{dy}{dx} = \frac{dy}{du} \cdot \frac{du}{dx}
\]

Written with the prime notation, for `y = f(g(x))`, the derivative is `f′(g(x)) × g′(x)`: the derivative of the outer function, evaluated at the inner value, times the derivative of the inner function.

A worked example: `y = (3x + 1)²`. Call the inside `u = 3x + 1`, so `y = u²`. Then `dy/du = 2u` and `du/dx = 3`, so

\[
\frac{dy}{dx} = 2u \cdot 3 = 6(3x + 1)
\]

Check it numerically:

```python type
def y(x):
    return (3 * x + 1) ** 2

x, h = 2.0, 1e-5
print("numerical:", (y(x + h) - y(x - h)) / (2 * h))
print("chain rule:", 6 * (3 * x + 1))
```

```output
numerical: 42.000000000896875
chain rule: 42.0
```

Both give 42. The chain rule extends to longer chains in the obvious way: multiply the rate of every link. If `x` affects `a`, `a` affects `b`, and `b` affects the output, then the output's rate with respect to `x` is the product of three rates.

## Following derivatives backwards through a chain

A neural network is a long chain of simple steps, and the chain rule is how its gradient is computed. Here is the idea on a three-step chain. Compute the output **forwards**, storing each step's value, then multiply local rates **backwards**:

```python type
import numpy as np

x = 0.5
a = 3 * x + 2          # step 1
b = a ** 2             # step 2
out = np.exp(-b / 10)  # step 3
print("forward values:", a, b, round(out, 5))

d_out_d_b = np.exp(-b / 10) * (-1 / 10)   # derivative of step 3
d_b_d_a = 2 * a                           # derivative of step 2
d_a_d_x = 3                               # derivative of step 1

d_out_d_a = d_out_d_b * d_b_d_a
d_out_d_x = d_out_d_a * d_a_d_x
print("chain rule:", round(d_out_d_x, 6))

f = lambda t: np.exp(-((3 * t + 2) ** 2) / 10)
print("numerical: ", round((f(x + 1e-5) - f(x - 1e-5)) / 2e-5, 6))
```

```output
forward values: 3.5 12.25 0.29376
chain rule: -0.616891
numerical:  -0.616891
```

Each step's **local** derivative only needs its own input and output, and the total derivative is their product, accumulated from the output back to the input. (The derivative of `e` to a power uses the chain rule too: the derivative of `exp(−b/10)` is `exp(−b/10)` times the derivative of `−b/10`, which is `−1/10`.) Working backwards like this, reusing each partial product, is exactly the algorithm called **backpropagation**, which you will build from scratch later in the series. Everything a neural network library does when it trains is this, on a chain with millions of links.

## The gradient of a model's error

Now a real example, the one linear regression needs. A line `ŷ = m x + c` predicts `ŷ` ("y hat", the usual symbol for a prediction) from `x`. Its error on a dataset of `n` points is measured by the **mean squared error**, the average of the squared gaps between predictions and true values:

\[
L(m, c) = \frac{1}{n} \sum_{i=1}^{n} (m x_i + c - y_i)^2
\]

The Σ (capital sigma) means "add up, for `i` from 1 to `n`". `L` is a function of the two parameters, `m` and `c`; the data is fixed. For gradient descent you need ∂L/∂m and ∂L/∂c. Apply the chain rule to one term: the outer function is squaring, with derivative `2 × (inside)`, and the inside `m xᵢ + c − yᵢ` has derivative `xᵢ` with respect to `m` and `1` with respect to `c`. Averaging over the points:

\[
\frac{\partial L}{\partial m} = \frac{2}{n} \sum_{i} (m x_i + c - y_i)\, x_i
\qquad
\frac{\partial L}{\partial c} = \frac{2}{n} \sum_{i} (m x_i + c - y_i)
\]

Every time you derive a gradient by hand, check it numerically. This comparison is called **gradient checking**, and it catches the sign slips and missing factors of two that are otherwise very hard to find. The data below comes from the line with slope 2 and intercept 1; at the guess `m = 0.5, c = 0`, predict the sign of each gradient component before running it.

```python type
import numpy as np

rng = np.random.default_rng(0)
x = rng.uniform(0, 5, 20)
y = 2 * x + 1 + rng.normal(0, 0.5, 20)

def loss(m, c):
    return np.mean((m * x + c - y) ** 2)

def gradient(m, c):
    error = m * x + c - y
    return np.array([2 * np.mean(error * x), 2 * np.mean(error)])

m, c, h = 0.5, 0.0, 1e-5
numerical = np.array([(loss(m + h, c) - loss(m - h, c)) / (2 * h),
                      (loss(m, c + h) - loss(m, c - h)) / (2 * h)])
print("formula:  ", gradient(m, c).round(6))
print("numerical:", numerical.round(6))
```

```output
formula:   [-32.418974  -9.747568]
numerical: [-32.418974  -9.747568]
```

They agree, so the formula is right. Both components are negative at `(0.5, 0)`: increasing `m` and increasing `c` would both reduce the error, which makes sense, since the true line has slope 2 and intercept 1.

::: challenge A numerical gradient [easy]
Write a function `numerical_gradient(f, point, h=1e-5)` where `f` takes a NumPy array of any length and returns a number, and `point` is such an array. Return an array of the partial derivatives of `f` at `point`, one per component, each computed with the central difference by nudging only that component. A loop over the components is fine here.

```python starter
import numpy as np

def numerical_gradient(f, point, h=1e-5):
    return np.zeros(len(point))

f = lambda p: p[0] ** 2 + 3 * p[1] ** 2
print(numerical_gradient(f, np.array([1.0, 2.0])))
```

```python solution
import numpy as np

def numerical_gradient(f, point, h=1e-5):
    grad = np.zeros(len(point))
    for i in range(len(point)):
        step = np.zeros(len(point))
        step[i] = h
        grad[i] = (f(point + step) - f(point - step)) / (2 * h)
    return grad

f = lambda p: p[0] ** 2 + 3 * p[1] ** 2
print(numerical_gradient(f, np.array([1.0, 2.0])))
```

```python test
import numpy as _np
assert "numerical_gradient" in dir(), "Keep the function's name as numerical_gradient."
_f = lambda p: p[0] ** 2 + 3 * p[1] ** 2
assert _np.allclose(numerical_gradient(_f, _np.array([1.0, 2.0])), [2, 12], atol=1e-5), f"The gradient of x² + 3y² at (1, 2) is (2, 12), but got {numerical_gradient(_f, _np.array([1.0, 2.0]))}."
_g = lambda p: _np.sin(p[0]) * p[1] + p[2] ** 3
_p = _np.array([0.3, 2.0, -1.0])
_want = _np.array([_np.cos(0.3) * 2.0, _np.sin(0.3), 3.0])
assert _np.allclose(numerical_gradient(_g, _p), _want, atol=1e-5), f"For sin(x)·y + z³ at (0.3, 2, −1) the gradient is {_want.round(4)}, but got {_np.round(numerical_gradient(_g, _p), 4)}."
_orig = _p.copy()
numerical_gradient(_g, _p)
assert _np.array_equal(_p, _orig), "numerical_gradient must not change the point it was given."
"SUCCESS: A gradient for any function of any number of variables."
```

Hint: For component `i`, make an array of zeros with `h` in position `i`, and compute the central difference of `f` at `point + step` and `point − step`. Build new arrays rather than changing `point` itself.
:::

::: challenge Gradient descent for any function [medium]
Write a function `descend(grad, start, step_size, steps)` that runs gradient descent: starting from the array `start`, repeatedly replace the point by `point − step_size × grad(point)`, `steps` times, and return the final point. `grad` is a function returning the gradient at a point.

Then use it, with the gradient formula from the lesson, to fit a line to the starter's data by minimising the mean squared error over `(m, c)`, starting from `(0, 0)` with step size 0.02 for 2000 steps. Store the result in `fitted`.

```python starter
import numpy as np

def descend(grad, start, step_size, steps):
    return start

rng = np.random.default_rng(1)
x = rng.uniform(0, 5, 30)
y = -1.5 * x + 4 + rng.normal(0, 0.3, 30)

def mse_gradient(params):
    m, c = params
    error = m * x + c - y
    return np.array([2 * np.mean(error * x), 2 * np.mean(error)])

fitted = None
print(fitted)
```

```python solution
import numpy as np

def descend(grad, start, step_size, steps):
    point = np.array(start, dtype=float)
    for _ in range(steps):
        point = point - step_size * grad(point)
    return point

rng = np.random.default_rng(1)
x = rng.uniform(0, 5, 30)
y = -1.5 * x + 4 + rng.normal(0, 0.3, 30)

def mse_gradient(params):
    m, c = params
    error = m * x + c - y
    return np.array([2 * np.mean(error * x), 2 * np.mean(error)])

fitted = descend(mse_gradient, np.array([0.0, 0.0]), 0.02, 2000)
print(fitted)
```

```python test
import numpy as _np
assert "descend" in dir(), "Keep the function's name as descend."
_bowl = lambda p: _np.array([2 * p[0], 6 * p[1]])
assert _np.allclose(descend(_bowl, _np.array([2.5, 1.5]), 0.1, 200), [0, 0], atol=1e-6), "descend should find the minimum (0, 0) of the bowl x² + 3y²."
_one = descend(lambda p: 2 * (p - 3), _np.array([0.0]), 0.1, 100)
assert _np.allclose(_one, [3], atol=1e-6), "descend should work in one dimension too: the minimum of (x − 3)² is at 3."
assert fitted is not None and _np.shape(fitted) == (2,), "Store the fitted (m, c) in fitted."
_best = _np.polyfit(x, y, 1)
assert _np.allclose(fitted, _best, atol=1e-3), f"The best line has m = {_best[0]:.4f}, c = {_best[1]:.4f}, but gradient descent gave {_np.round(fitted, 4)}."
"SUCCESS: You trained a model: gradient descent found the least squares line."
```

Hint: This is the two-dimensional loop from the lesson, with `grad` passed in. Convert `start` to a float array first, so the updates are not rounded to integers.
:::

::: challenge Check a gradient by hand [medium]
A model predicts `ŷ = w x²` (one parameter, `w`), and its loss on a dataset is the mean squared error `L(w) = mean((w xᵢ² − yᵢ)²)`.

1. Use the chain rule to derive `dL/dw`, and write it as a function `loss_gradient(w, x, y)` returning a number.
2. Write `gradient_check(w, x, y)` that returns the **absolute difference** between your formula and a central-difference numerical derivative of `L` at `w`.

For a correct formula, the difference should be tiny (well below 1e-6).

```python starter
import numpy as np

def loss(w, x, y):
    return np.mean((w * x ** 2 - y) ** 2)

def loss_gradient(w, x, y):
    return 0.0

def gradient_check(w, x, y):
    return 1.0

x = np.array([1.0, 2.0, 3.0])
y = np.array([2.0, 7.5, 18.0])
print(loss_gradient(1.0, x, y), gradient_check(1.0, x, y))
```

```python solution
import numpy as np

def loss(w, x, y):
    return np.mean((w * x ** 2 - y) ** 2)

def loss_gradient(w, x, y):
    return 2 * np.mean((w * x ** 2 - y) * x ** 2)

def gradient_check(w, x, y):
    h = 1e-5
    numerical = (loss(w + h, x, y) - loss(w - h, x, y)) / (2 * h)
    return abs(loss_gradient(w, x, y) - numerical)

x = np.array([1.0, 2.0, 3.0])
y = np.array([2.0, 7.5, 18.0])
print(loss_gradient(1.0, x, y), gradient_check(1.0, x, y))
```

```python test
import numpy as _np
assert "loss_gradient" in dir() and "gradient_check" in dir(), "Keep both function names."
_x = _np.array([1.0, 2.0, 3.0])
_y = _np.array([2.0, 7.5, 18.0])
_L = lambda w: _np.mean((w * _x ** 2 - _y) ** 2)
for _w in [1.0, 2.0, -0.5]:
    _num = (_L(_w + 1e-5) - _L(_w - 1e-5)) / 2e-5
    _got = loss_gradient(_w, _x, _y)
    assert _np.isclose(_got, _num, atol=1e-5), f"At w = {_w} the derivative of the loss is about {_num:.4f}, but loss_gradient returned {_got}. Check the chain rule: the inside, w·x² − y, has derivative x² with respect to w."
    _gc = gradient_check(_w, _x, _y)
    assert 0 <= _gc < 1e-5, f"gradient_check should return a tiny non-negative difference for a correct formula, but returned {_gc}."
_wrong = lambda w, x, y: _np.mean((w * x ** 2 - y) * x ** 2)
assert abs(_wrong(1.0, _x, _y) - loss_gradient(1.0, _x, _y)) > 1e-3, "The factor of 2 from differentiating the square must be included."
_saved = loss_gradient
loss_gradient = _wrong
try:
    _gc_wrong = gradient_check(1.0, _x, _y)
finally:
    loss_gradient = _saved
assert _gc_wrong > 1e-3, "gradient_check must actually compare loss_gradient with a numerical derivative: given a wrong formula, it should report a clear difference."
"SUCCESS: You derived a gradient with the chain rule and proved it with a numerical check."
```

Hint: Differentiate one term `(w xᵢ² − yᵢ)²` with the chain rule: the outer square gives `2 × (w xᵢ² − yᵢ)`, and the inside has derivative `xᵢ²` with respect to `w`. Then take the mean. For the check, compare with `(L(w + h) − L(w − h)) / (2h)`.
:::

## What you learned

- A function of several variables can be drawn as a contour plot; `np.meshgrid` builds the grid of points.
- A partial derivative ∂f/∂x is the rate of change with respect to one variable while the others are held fixed.
- The gradient ∇f collects all the partial derivatives into a vector. It points in the direction of steepest increase, perpendicular to the contour lines; minus the gradient points straight downhill.
- Gradient descent updates every parameter at once: point ← point − step size × gradient.
- The chain rule: rates multiply along a chain, `dy/dx = dy/du · du/dx`, and `f(g(x))` has derivative `f′(g(x)) · g′(x)`.
- Computing values forwards and multiplying local derivatives backwards is backpropagation.
- The mean squared error of a line has gradient (2/n)Σ(error·xᵢ) and (2/n)Σ(error). Always check a hand-derived gradient against a numerical one.

That is the calculus a model needs to learn. The next lessons turn to the other half of machine learning's mathematics: probability, the language for uncertainty and noise, starting with the simplest tool of all, simulation.
