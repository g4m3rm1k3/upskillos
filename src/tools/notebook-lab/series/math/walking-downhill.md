# Walking downhill: gradient descent

The previous lesson optimised one variable with a derivative or a golden-section search. Real problems have many variables: the two coefficients of a fitted line, the dozen dimensions of a bracket, the millions of weights in a neural network. Grids are hopeless in many dimensions (ten values per variable for a million variables is not a computation, it is a joke), and golden section works in one dimension only. The method that scales is almost childishly simple: stand somewhere on the landscape of the objective, find which way is downhill, take a step that way, repeat. That is **gradient descent**, and it trains essentially every machine-learning model in use today. This lesson builds it from the gradient, shows how the step size makes or breaks it, and fixes its classic weakness, long narrow valleys.

This lesson covers:

- an objective of two variables as a landscape, drawn with contours;
- the gradient: the vector of partial derivatives, pointing uphill;
- the gradient descent loop and the learning rate;
- why narrow valleys make descent zigzag, and how rescaling the data fixes it;
- momentum, a cheap and powerful improvement.

## A landscape of two variables

::: math
\[ \text{SSE}(c_0, c_1) = \sum_{i=1}^{n} \big(y_i - c_0 - c_1 x_i\big)^2 \]
- one number for every pair $(c_0, c_1)$: a surface over the plane
- contours join points of equal SSE; the minimum is inside the innermost ring
In code: `sse(c0, c1)`; the grid `Z` of SSE values is drawn with `ax.contour(C0, C1, Z, ...)`
:::


Fitting a line y ≈ c₀ + c₁x means choosing two numbers to minimise the sum of squared errors, SSE(c₀, c₁). For every pair (c₀, c₁) there is one SSE value, so SSE is a **function of two variables**, a surface over the (c₀, c₁) plane. A **contour plot** draws it like a map: each curve joins points of equal SSE, and the minimum sits in the middle of the innermost ring. Predict before running: for the load-cell calibration, what shape are the contours?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

x = np.array([0, 5, 10, 15, 20, 25, 30, 35], dtype=float)
y = np.array([0.41, 1.24, 2.06, 2.88, 3.71, 4.53, 5.36, 6.18])

def sse(c0, c1):
    return ((y - c0 - c1 * x) ** 2).sum()

best, *_ = np.linalg.lstsq(np.column_stack([np.ones_like(x), x]), y, rcond=None)
print(f"least-squares answer: c0 = {best[0]:.4f}, c1 = {best[1]:.5f}, SSE = {sse(*best):.6f}")

C0, C1 = np.meshgrid(np.linspace(-1, 2, 200), np.linspace(0.10, 0.25, 200))
Z = ((y[None, None, :] - C0[..., None] - C1[..., None] * x[None, None, :]) ** 2).sum(axis=2)
fig, ax = plt.subplots(figsize=(6, 4))
ax.contour(C0, C1, Z, levels=np.geomspace(0.01, 50, 15))
ax.plot(*best, "r*", markersize=12)
ax.set_xlabel("intercept c0")
ax.set_ylabel("slope c1")
plt.show()
```

```output
least-squares answer: c0 = 0.4117, c1 = 0.16483, SSE = 0.000058
```

`np.meshgrid` builds every (c₀, c₁) pair on a 200 × 200 grid; the broadcast sum evaluates SSE at all of them at once. `np.geomspace` spaces the contour levels evenly on a log scale, so both the deep valley and the high slopes show.

The contours are long, thin ellipses, tilted, with the least-squares answer (c₀ ≈ 0.412, c₁ ≈ 0.1648) at their centre. The landscape is a long narrow valley: changing the slope a little changes SSE enormously (every x up to 35 multiplies it), while the intercept can drift much further for the same cost. That shape will matter shortly.

## The gradient

::: math
\[ \nabla f = \left(\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \dots\right), \qquad \frac{\partial\,\text{SSE}}{\partial c_0} = -2\sum_i r_i, \quad \frac{\partial\,\text{SSE}}{\partial c_1} = -2\sum_i x_i r_i \]
- $r_i = y_i - c_0 - c_1 x_i$: the residuals
- $\nabla f$ points uphill fastest; $-\nabla f$ points downhill; $\nabla f = \mathbf{0}$ at a minimum
In code: `grad_sse(c)` against `numeric_grad(f, c)` (central differences, one input at a time)
:::


On a surface f(x₁, x₂, ...), the **partial derivative** ∂f/∂xᵢ is the ordinary derivative with respect to xᵢ, holding the others fixed: the slope of the surface in the xᵢ direction. Collected into a vector they form the **gradient**

\[ \nabla f = \left( \frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \dots \right) \]

which points in the direction of steepest **increase**, with a length equal to that steepest slope. So −∇f points straight downhill, and at a minimum ∇f = 0. For SSE, the chain rule gives ∂SSE/∂c₀ = −2Σrᵢ and ∂SSE/∂c₁ = −2Σxᵢrᵢ, where rᵢ = yᵢ − c₀ − c₁xᵢ are the residuals. Predict before running: do the formula and central differences agree, and what is the gradient at the least-squares answer?

```python type
def grad_sse(c):
    r = y - c[0] - c[1] * x
    return np.array([-2 * r.sum(), -2 * (x * r).sum()])

def numeric_grad(f, c, h=1e-6):
    g = np.zeros_like(c)
    for i in range(len(c)):
        step = np.zeros_like(c)
        step[i] = h
        g[i] = (f(c + step) - f(c - step)) / (2 * h)
    return g

point = np.array([1.0, 0.12])
print("formula:  ", grad_sse(point))
print("numerical:", numeric_grad(lambda c: sse(*c), point))
print("at the least-squares answer:", np.round(grad_sse(best), 10))
```

```output
formula:   [  -3.14 -149.1 ]
numerical: [  -3.14 -149.1 ]
at the least-squares answer: [0. 0.]
```

The numerical gradient nudges one variable at a time, exactly as the definition of a partial derivative says.

The two agree to many digits: at (1.0, 0.12) the gradient is about (−3.1, −149), far steeper in the slope direction, matching the thin contours. At the least-squares answer the gradient is zero to rounding, as it must be at a minimum. Setting the gradient to zero by algebra gives the normal equations of the line-fitting lesson; gradient descent reaches the same point without solving anything.

## Gradient descent

::: math
\[ \mathbf{c}_{k+1} = \mathbf{c}_k - \eta\,\nabla f(\mathbf{c}_k) \]
- $\eta$: the learning rate (step size)
- too small: slow; too large: each step overshoots and the iteration diverges
In code: `descend(grad, start, lr, steps)` repeats `c = c - lr * grad(c)`
:::


The algorithm: start somewhere, then repeat x ← x − η ∇f(x). The **learning rate** (step size) η decides everything. Too small, and progress is glacial. Too large, and each step overshoots the valley floor and lands higher up the opposite wall, so the iteration **diverges**. Between the two the method converges, but on a narrow valley the safe step is set by the steep direction, which makes progress along the gentle direction painfully slow. Predict before running: which of four learning rates reaches the answer within 2,000 steps?

```python type
def descend(grad, start, lr, steps):
    c = np.array(start, dtype=float)
    path = [c.copy()]
    for _ in range(steps):
        c = c - lr * grad(c)
        path.append(c.copy())
        if not np.all(np.isfinite(c)) or np.abs(c).max() > 1e6:
            break
    return c, np.array(path)

for lr in [1e-5, 1e-4, 2.5e-4, 3e-4]:
    c, path = descend(grad_sse, [1.0, 0.12], lr, 2000)
    print(f"lr = {lr:.1e}: after {len(path) - 1} steps c = {np.round(c, 4)}, SSE {sse(*c):.4g}")
```

```output
lr = 1.0e-05: after 2000 steps c = [0.947  0.1434], SSE 0.6879
lr = 1.0e-04: after 2000 steps c = [0.6376 0.1558], SSE 0.1225
lr = 2.5e-04: after 2000 steps c = [0.4652 0.1627], SSE 0.006948
lr = 3.0e-04: after 180 steps c = [  -41588.1241 -1039012.8025], SSE 3.791e+15
```

The loop stops early if the values blow up, which is what divergence looks like in practice.

With 10⁻⁵ the descent quickly drops onto the valley floor but then crawls along it, still at 0.947 after 2,000 steps against the true 0.412. With 10⁻⁴ it gets closer, and with 2.5 × 10⁻⁴ closer still (0.465), but none has finished. At 3 × 10⁻⁴ the steps overshoot in the steep slope direction and the values explode: the largest stable rate here is about 2.85 × 10⁻⁴, set by the steepest direction, and even at that rate the gentle direction takes thousands of steps. The narrow valley is the whole problem.

## Rescaling turns valleys into bowls

::: math
\[ z_i = \frac{x_i - \bar{x}}{s_x}, \qquad y \approx c_0' + c_1' z \;\;\Longrightarrow\;\; c_1 = \frac{c_1'}{s_x}, \quad c_0 = c_0' - c_1\,\bar{x} \]
- standardising makes the contours nearly circular, so one learning rate suits every direction
- the fitted line is the same; only its parameters change
In code: `z = (x - x.mean()) / x.std()`, then `descend(grad_z, [0.0, 0.0], 0.05, 200)`
:::


The valley is narrow because x runs from 0 to 35: the slope coefficient multiplies large numbers, the intercept multiplies 1. **Standardising** the input, z = (x − x̄)/s_x, puts both on the same scale and centres x, which also makes the two coefficients independent (the valley's tilt disappears). The contours become nearly circular, one learning rate suits every direction, and descent heads straight for the bottom. The fitted line is the same; only its parameterisation changes, and the original coefficients are recovered afterwards. Predict before running: how many steps does descent need after standardising?

```python type
z = (x - x.mean()) / x.std()

def grad_z(c):
    r = y - c[0] - c[1] * z
    return np.array([-2 * r.sum(), -2 * (z * r).sum()])

c, path = descend(grad_z, [0.0, 0.0], 0.05, 200)
steps_needed = next(i for i, p in enumerate(path) if np.abs(grad_z(p)).max() < 1e-8)
c1 = c[1] / x.std()
c0 = c[0] - c1 * x.mean()
print(f"standardised: gradient below 1e-8 after {steps_needed} steps")
print(f"back in the original units: c0 = {c0:.4f}, c1 = {c1:.5f}  (least squares {best[0]:.4f}, {best[1]:.5f})")
```

```output
standardised: gradient below 1e-8 after 14 steps
back in the original units: c0 = 0.4117, c1 = 0.16483  (least squares 0.4117, 0.16483)
```

Undoing the standardisation: y ≈ a + b z with z = (x − x̄)/s_x means y ≈ (a − b x̄/s_x) + (b/s_x) x.

After standardising, descent converges to the least-squares answer in about a dozen steps instead of thousands. Rescaling inputs before gradient descent is standard practice in machine learning for exactly this reason. The general lesson: the speed of gradient methods depends on the shape of the landscape, measured by the ratio of steepest to gentlest curvature, the **condition number** met in the two-equation lesson.

## Momentum

::: math
\[ \mathbf{v}_{k+1} = \beta\,\mathbf{v}_k - \eta\,\nabla f(\mathbf{c}_k), \qquad \mathbf{c}_{k+1} = \mathbf{c}_k + \mathbf{v}_{k+1} \]
- $\beta \approx 0.9$: the velocity remembers past gradients
- steady gradients build speed; zigzag components cancel
In code: `v = beta * v - lr * grad(c)` then `c = c + v`, in `descend_momentum`
:::


When rescaling is not possible, **momentum** helps. Instead of stepping along the current gradient alone, keep a running velocity that accumulates past gradients: v ← βv − η∇f, then x ← x + v, with β around 0.9 to 0.95. In a narrow valley the gradient keeps pointing the same way along the gentle direction, so v builds up speed there, like a ball rolling down a gutter; and when the step is large enough to make plain descent zigzag across the valley, the alternating cross-valley components cancel out in v. It costs nothing extra per step. Predict before running: on the original, unscaled problem, how much does momentum help?

```python type
def descend_momentum(grad, start, lr, beta, steps, tol=1e-6):
    c = np.array(start, dtype=float)
    v = np.zeros_like(c)
    for k in range(1, steps + 1):
        v = beta * v - lr * grad(c)
        c = c + v
        if np.abs(c - best).max() < tol:
            return c, k
    return c, steps

def descend_plain(grad, start, lr, steps, tol=1e-6):
    c = np.array(start, dtype=float)
    for k in range(1, steps + 1):
        c = c - lr * grad(c)
        if np.abs(c - best).max() < tol:
            return c, k
    return c, steps

_, plain_steps = descend_plain(grad_sse, [1.0, 0.12], 1e-4, 200_000)
_, mom_steps = descend_momentum(grad_sse, [1.0, 0.12], 1e-4, 0.95, 200_000)
print(f"steps to get within 1e-6 of the answer: plain {plain_steps}, momentum {mom_steps}")
```

```output
steps to get within 1e-6 of the answer: plain 27718, momentum 1073
```

Both runs use the same learning rate; momentum adds a single parameter β.

With the same learning rate (and β = 0.95), plain descent needs about 27,700 steps to pin down both coefficients to 10⁻⁶ and momentum about 1,070, some 26 times fewer. The comparison is deliberately at the same rate; even plain descent at its best stable rate needs nearly 10,000 steps, still about nine times more than momentum. Momentum, and refinements of it such as Adam, are what deep-learning frameworks actually use. The optimisation block analyses why, and meets Newton-type methods that use second derivatives to take the valley's shape into account directly.

::: challenge A numerical gradient [easy]
Write `numerical_gradient(f, x, h=1e-6)` returning the central-difference gradient of a function of a vector, as a NumPy array of floats the same length as x (x may be a list or an array; f takes a NumPy array). Raise `ValueError` if h is not positive. Then write `directional_slope(f, x, direction, h=1e-6)`: the rate of change of f at x along the given direction, which is the gradient dotted with the **unit** vector of the direction, as a plain float; raise `ValueError` for a zero direction.

```python starter
def numerical_gradient(f, x, h=1e-6):
    return np.zeros(len(x))

def directional_slope(f, x, direction, h=1e-6):
    return 0.0

print(numerical_gradient(lambda v: v[0] ** 2 + 3 * v[1], [1.0, 2.0]))
```

```python solution
def numerical_gradient(f, x, h=1e-6):
    if h <= 0:
        raise ValueError("h must be positive")
    x = np.asarray(x, dtype=float)
    g = np.zeros_like(x)
    for i in range(len(x)):
        e = np.zeros_like(x)
        e[i] = h
        g[i] = (f(x + e) - f(x - e)) / (2 * h)
    return g

def directional_slope(f, x, direction, h=1e-6):
    d = np.asarray(direction, dtype=float)
    norm = np.linalg.norm(d)
    if norm == 0:
        raise ValueError("the direction must be non-zero")
    return float(numerical_gradient(f, x, h) @ (d / norm))

print(numerical_gradient(lambda v: v[0] ** 2 + 3 * v[1], [1.0, 2.0]))
```

```python test
for _n in ["numerical_gradient", "directional_slope"]:
    assert _n in dir(), f"Define {_n}."
_g = numerical_gradient(lambda v: v[0] ** 2 + 3 * v[1], [1.0, 2.0])
assert isinstance(_g, np.ndarray) and np.allclose(_g, [2, 3]), f"Got {_g}."
_f = lambda v: math.sin(v[0]) * v[1] ** 2 + v[2]
assert np.allclose(numerical_gradient(_f, np.array([0.5, 2.0, -1.0])), [math.cos(0.5) * 4, 2 * 2 * math.sin(0.5), 1.0], atol=1e-6), "Three variables."
try:
    numerical_gradient(_f, [0, 0, 0], h=0)
    assert False, "h = 0 should raise ValueError."
except ValueError:
    pass
_bowl = lambda v: v[0] ** 2 + v[1] ** 2
assert abs(directional_slope(_bowl, [3, 4], [3, 4]) - 10) < 1e-6 and abs(directional_slope(_bowl, [3, 4], [-4, 3])) < 1e-6, "Steepest straight out, zero along the contour."
assert abs(directional_slope(_bowl, [3, 4], [30, 40]) - 10) < 1e-6 and type(directional_slope(_bowl, [3, 4], [1, 0])) is float, "Use the unit vector; return a float."
try:
    directional_slope(_bowl, [1, 1], [0, 0])
    assert False, "A zero direction should raise ValueError."
except ValueError:
    pass
"SUCCESS: One central difference per variable gives the gradient; dotting it with a unit direction gives the slope that way."
```

Hint: For each i, nudge only component i by ±h and take the central difference. The directional slope is `gradient @ (d / |d|)`.
:::

::: challenge A gradient descent routine [medium]
Write `gradient_descent(grad, x0, lr, max_steps=10000, tol=1e-8)` that repeats x ← x − lr × grad(x) and returns `(x, steps)`, where `steps` is the number of updates made. Stop as soon as the gradient's largest absolute component is below `tol` (checked **before** each update, so a start at the minimum returns 0 steps). Do not modify the caller's `x0` (work on a copy). Raise `ValueError` if lr ≤ 0, and raise `OverflowError` if x stops being finite or any component exceeds 1e12 in size (divergence). If `max_steps` updates are used without converging, return what you have. Then write `largest_stable_lr(curvatures)`: for a quadratic bowl f = ½ Σ aᵢ xᵢ² with curvatures aᵢ > 0, descent converges exactly when lr < 2 / max(aᵢ); return that bound.

```python starter
def gradient_descent(grad, x0, lr, max_steps=10000, tol=1e-8):
    return (np.asarray(x0, dtype=float), 0)

def largest_stable_lr(curvatures):
    return 1.0

print(gradient_descent(lambda v: 2 * (v - 3), [0.0], 0.1))
```

```python solution
def gradient_descent(grad, x0, lr, max_steps=10000, tol=1e-8):
    if lr <= 0:
        raise ValueError("the learning rate must be positive")
    x = np.asarray(x0, dtype=float).copy()
    for step in range(max_steps):
        g = np.asarray(grad(x), dtype=float)
        if np.abs(g).max() < tol:
            return x, step
        x = x - lr * g
        if not np.all(np.isfinite(x)) or np.abs(x).max() > 1e12:
            raise OverflowError("gradient descent diverged")
    return x, max_steps

def largest_stable_lr(curvatures):
    return 2 / max(curvatures)

print(gradient_descent(lambda v: 2 * (v - 3), [0.0], 0.1))
```

```python test
for _n in ["gradient_descent", "largest_stable_lr"]:
    assert _n in dir(), f"Define {_n}."
_x, _s = gradient_descent(lambda v: 2 * (v - 3), [0.0], 0.1)
assert abs(_x[0] - 3) < 1e-8 and 0 < _s < 200, f"Minimise (x - 3)²; got {(_x, _s)}."
assert gradient_descent(lambda v: 2 * (v - 3), [3.0], 0.1)[1] == 0, "Starting at the minimum: 0 steps."
_a = np.array([1.0, 50.0])
_grad = lambda v: _a * v
_x, _s = gradient_descent(_grad, [1.0, 1.0], 0.039)
assert np.abs(_x).max() < 1e-6, "Converges below the stability limit 2/50 = 0.04."
try:
    gradient_descent(_grad, [1.0, 1.0], 0.041)
    assert False, "Above 2/50 the steep direction diverges: raise OverflowError."
except OverflowError:
    pass
_x, _s = gradient_descent(_grad, [1.0, 1.0], 0.001, max_steps=50)
assert _s == 50 and abs(_x[0]) > 0.9, "Stops after max_steps without converging."
try:
    gradient_descent(_grad, [1.0], 0)
    assert False, "lr = 0 should raise ValueError."
except ValueError:
    pass
_x0 = np.array([5.0, 5.0])
gradient_descent(_grad, _x0, 0.01)
assert np.array_equal(_x0, [5, 5]), "Do not modify the caller's starting point."
assert largest_stable_lr([1, 50]) == 0.04 and largest_stable_lr([4]) == 0.5, "2 / the largest curvature."
"SUCCESS: The steepest direction sets the speed limit: one curvature of 50 caps the learning rate at 0.04 for every direction."
```

Hint: Copy x0 into a float array. In the loop, compute the gradient, return if it is small enough, otherwise step, then check for blow-up. Each update along a direction of curvature a multiplies the error by (1 − lr × a), which shrinks only when |1 − lr × a| < 1.
:::

::: challenge Momentum in a narrow valley [hard]
Write `momentum_descent(grad, x0, lr, beta=0.9, max_steps=100000, tol=1e-8)` using v ← βv − lr × grad(x), x ← x + v (v starts at zero), returning `(x, steps)` with the same stopping rule, errors and copying behaviour as plain descent: stop when the largest gradient component is below `tol` before an update, raise `ValueError` for lr ≤ 0 or β outside [0, 1), and `OverflowError` on divergence. Then write `speedup(curvatures, lr, beta=0.9)`: on the quadratic bowl with the given curvatures starting from all ones, return the ratio of plain gradient-descent steps to momentum steps (both to `tol=1e-8`, with plain descent using the same lr and β = 0), rounded to 1 decimal place. Implement plain descent as `momentum_descent` with β = 0; the test checks this gives ordinary gradient descent.

```python starter
def momentum_descent(grad, x0, lr, beta=0.9, max_steps=100000, tol=1e-8):
    return (np.asarray(x0, dtype=float), 0)

def speedup(curvatures, lr, beta=0.9):
    return 1.0

print(speedup([1.0, 100.0], 0.0099))
```

```python solution
def momentum_descent(grad, x0, lr, beta=0.9, max_steps=100000, tol=1e-8):
    if lr <= 0 or not 0 <= beta < 1:
        raise ValueError("need lr > 0 and 0 <= beta < 1")
    x = np.asarray(x0, dtype=float).copy()
    v = np.zeros_like(x)
    for step in range(max_steps):
        g = np.asarray(grad(x), dtype=float)
        if np.abs(g).max() < tol:
            return x, step
        v = beta * v - lr * g
        x = x + v
        if not np.all(np.isfinite(x)) or np.abs(x).max() > 1e12:
            raise OverflowError("diverged")
    return x, max_steps

def speedup(curvatures, lr, beta=0.9):
    a = np.asarray(curvatures, dtype=float)
    grad = lambda x: a * x
    start = np.ones_like(a)
    _, plain = momentum_descent(grad, start, lr, beta=0.0)
    _, mom = momentum_descent(grad, start, lr, beta=beta)
    return round(plain / mom, 1)

print(speedup([1.0, 100.0], 0.0099))
```

```python test
for _n in ["momentum_descent", "speedup"]:
    assert _n in dir(), f"Define {_n}."
_a = np.array([1.0, 100.0])
_g = lambda v: _a * v
_x, _s = momentum_descent(_g, [1.0, 1.0], 0.0099, 0.9)
assert np.abs(_a * _x).max() < 1e-8 and _s > 0, "Momentum converges."
_x0, _s0 = momentum_descent(_g, [1.0, 1.0], 0.0099, 0.0)
_xp = np.array([1.0, 1.0]); _k = 0
while np.abs(_a * _xp).max() >= 1e-8:
    _xp = _xp - 0.0099 * _a * _xp; _k += 1
assert _s0 == _k and np.allclose(_x0, _xp), f"With beta = 0 it must be plain gradient descent ({_k} steps); got {_s0}."
assert momentum_descent(_g, [0.0, 0.0], 0.01)[1] == 0, "Already at the minimum."
for _bad in [dict(lr=0), dict(lr=0.01, beta=1.0), dict(lr=0.01, beta=-0.1)]:
    try:
        momentum_descent(_g, [1.0, 1.0], **_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
try:
    momentum_descent(_g, [1.0, 1.0], 0.05, 0.9)
    assert False, "Too large a step diverges: raise OverflowError."
except OverflowError:
    pass
_sp = speedup([1.0, 100.0], 0.0099)
assert _sp > 3 and speedup([1.0, 100.0], 0.0099, 0.8) > 5, f"Momentum should be several times faster in a narrow valley; got {_sp}."
assert speedup([1.0, 1.0], 0.5) < 1.5, "In a round bowl momentum does not help (it can even slow descent down)."
assert speedup([1.0, 100.0], 0.0099) == round(_s0 / momentum_descent(_g, [1.0, 1.0], 0.0099, 0.9)[1], 1), "The ratio of step counts."
"SUCCESS: Momentum lets consistent gradients build speed along the valley while the zigzag across it cancels out."
```

Hint: Keep a velocity array v, starting at zeros: `v = beta * v - lr * g`, then `x = x + v`. With beta = 0 this is exactly plain descent. For `speedup`, run both on the gradient `a * x` from `np.ones_like(a)` and divide the step counts.
:::

## What you learned

- A function of several variables is a landscape; contour plots map it, and the minimum sits inside the innermost contour.
- The gradient collects the partial derivatives, points uphill and is zero at a minimum; central differences compute it one variable at a time.
- Gradient descent steps along −∇f. The learning rate must stay below 2 divided by the steepest curvature, which makes narrow valleys slow.
- Standardising inputs turns a narrow tilted valley into a round bowl, so descent converges in a few steps.
- Momentum accumulates gradients, cancelling zigzags and speeding up progress along a valley at no extra cost.

The next lesson draws functions of two variables in their own right, starting with a plate's temperature.
