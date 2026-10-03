# Solving equations numerically

A belt of known length must wrap two pulleys: how far apart must the shafts be? A cam follower's position is known: what angle is the cam at? A projectile must hit a target: at what angle should it launch? Each is an equation in one unknown, and most such equations have no algebraic solution. They must be solved **numerically**, by an iteration that homes in on the answer. Earlier lessons used bisection and Newton's method in passing. This lesson studies root-finding properly: how fast each method converges (one more correct bit per step, or twice the digits per step), why, when each fails, and how professional solvers combine speed with safety. The running example is the belt drive.

This lesson covers:

- bisection: guaranteed, but one bit of accuracy per step;
- Newton's method: tangent lines and quadratic convergence;
- the secant method: Newton without derivatives;
- fixed-point iteration, and when it converges;
- how methods fail, and robust hybrid solvers;
- measuring the order of convergence from the errors.

## The belt-drive equation

::: math
\[ L(C) = 2C\cos\varphi + \pi(R + r) + 2\varphi(R - r), \qquad \varphi = \arcsin\frac{R - r}{C}, \qquad f(C) = L(C) - L_\text{belt} = 0 \]
- $C$: centre distance; $R$ and $r$: pulley radii
- $\varphi$: the angle at which the belt leaves each pulley; $L_\text{belt}$: the stock belt length
- the arcsine prevents solving for $C$ by algebra
In code: `belt_length(C)` and `f(C)`, plotted to find a bracket
:::


An open belt around pulleys of radii R and r with shaft centres C apart leaves each pulley at an angle φ, where sin φ = (R − r)/C. Its length is the two straight runs plus the arcs wrapped round each pulley:

\[ L(C) = 2C\cos\varphi + \pi(R + r) + 2\varphi(R - r), \qquad \varphi = \arcsin\frac{R - r}{C} \]

Given a stock belt of length L, finding C means solving L(C) − L_belt = 0 for C, and the arcsine makes that impossible by algebra. The equation f(C) = L(C) − L_belt has a root, and the job is to find it. Predict before running: with pulleys of radius 120 mm and 45 mm and a 1,500 mm belt, is the centre distance more or less than half the belt length?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy import optimize

R, r, L_belt = 120.0, 45.0, 1500.0

def belt_length(C):
    phi = math.asin((R - r) / C)
    return 2 * C * math.cos(phi) + math.pi * (R + r) + 2 * phi * (R - r)

def f(C):
    return belt_length(C) - L_belt

Cs = np.linspace(80, 750, 400)
fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(Cs, [f(c) for c in Cs])
ax.axhline(0, color="grey")
ax.set_xlabel("centre distance C (mm)")
ax.set_ylabel("L(C) − L_belt (mm)")
plt.show()
print(f"f(200) = {f(200):.1f} mm, f(700) = {f(700):.1f} mm: the root lies between")
```

f is defined only for C > R − r, where the arcsine exists; the plot starts just above that.

The curve rises steadily and crosses zero between 200 and 700 mm, a single clean root. The centre distance is less than half the belt length, because part of the belt wraps the pulleys: about π(R + r) = 518 mm of it.

## Bisection

::: math
\[ m = \frac{a + b}{2}, \qquad \text{keep } [a, m] \text{ if } f(a)f(m) \le 0, \text{ else } [m, b], \qquad \text{steps} = \left\lceil \log_2\frac{b - a}{\text{tol}} \right\rceil \]
- the bracket halves each step: one more correct bit per iteration
- needs only a sign change; cannot fail once bracketed
In code: `bisect(f, a, b, tol=1e-9)`
:::


**Bisection** needs only a bracket [a, b] where f changes sign. Halve it, keep the half that still changes sign, repeat. The bracket width halves each step, so the error shrinks by a factor of 2: one more correct **bit** per iteration, about one decimal digit every 3.3 steps. It cannot fail once a sign change is found, which makes it the safe fallback. Predict before running: how many bisection steps does it take to pin the centre distance to 10⁻⁹ mm?

```python
def bisect(f, a, b, tol=1e-9):
    fa = f(a)
    steps = 0
    while b - a > tol:
        m = (a + b) / 2
        fm = f(m)
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b = m
        steps += 1
    return (a + b) / 2, steps

C_bis, n_bis = bisect(f, 200, 700)
print(f"bisection: C = {C_bis:.9f} mm after {n_bis} steps (predicted log2(500 / 1e-9) = {math.log2(500 / 1e-9):.1f})")
print(f"check: belt length at that C = {belt_length(C_bis):.9f} mm")
```

The number of steps to shrink a bracket of width W below a tolerance ε is log₂(W/ε), whatever the function.

Bisection needs 39 steps, exactly log₂(500/10⁻⁹) rounded up, and the belt length at the answer is 1,500 mm to within about 10⁻⁹ mm. It is reliable but slow, and needs a bracket to start.

## Newton's method

::: math
\[ x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}, \qquad e_{k+1} \approx K\,e_k^2 \]
- the tangent line's zero becomes the next guess
- $e_k$: the error at step $k$; $K$: a constant depending on $f$ near the root
- quadratic convergence: correct digits roughly double each step
In code: `step = f(C) / fprime(C)`, then `C -= step`
:::


**Newton's method** replaces f near the current guess by its tangent line and jumps to where the tangent crosses zero:

\[ x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)} \]

the one-variable version of the Jacobian lesson's Newton steps. Near a simple root its error is roughly squared each step, **quadratic convergence**: the number of correct digits about doubles every iteration. The price is a derivative, and a reasonable starting guess. The derivative of the belt length can be found by hand or numerically. Predict before running: from a starting guess of 500 mm, how many Newton steps reach full precision? And on a more curved equation, a cam's angle θ from its follower position, θ − 0.8 sin θ = 1, how does the error shrink step by step?

```python
def fprime(C, h=1e-6):
    return (f(C + h) - f(C - h)) / (2 * h)

C = 500.0
for k in range(1, 8):
    step = f(C) / fprime(C)
    C -= step
    print(f"belt, step {k}: C = {C:.12f}, step size {abs(step):.2e}")
    if abs(step) < 1e-9:
        break

cam = lambda th: th - 0.8 * math.sin(th) - 1
cam_d = lambda th: 1 - 0.8 * math.cos(th)
exact = optimize.brentq(cam, 0, 3, xtol=1e-15)
th = 1.0
for k in range(1, 7):
    th -= cam(th) / cam_d(th)
    print(f"cam, step {k}: θ = {th:.15f}, error {abs(th - exact):.2e}")
```

The belt's derivative here is a central difference; the cam's is exact. Its reference root comes from `brentq`, introduced below, at full precision.

On the belt, Newton lands within about 0.005 mm (0.0053) in one step and is essentially exact after two (the third step only confirms it): near the root the belt length is almost a straight line in C, and Newton is exact for straight lines. The curved cam equation shows the general pattern: errors of about 0.4, 0.04, 5 × 10⁻⁴, 8 × 10⁻⁸ and 3 × 10⁻¹⁵ (the limit of floating point), the exponent roughly doubling each step, the signature of **quadratic convergence**. Either way Newton needs a handful of steps against bisection's 39.

## Secant and fixed-point iteration

::: math
\[ \text{secant: } x_{k+1} = x_k - f(x_k)\frac{x_k - x_{k-1}}{f(x_k) - f(x_{k-1})}, \qquad \text{fixed point: } x_{k+1} = g(x_k), \;\; |g'(x^*)| < 1 \]
- secant: order about 1.618, one new evaluation per step
- fixed point: error multiplied by about $|g'(x^*)|$ each step
In code: `secant(f, x0, x1)`, `g(C)` repeated, and `optimize.brentq(f, 200, 700)`
:::


When the derivative is unavailable, the **secant method** uses the line through the last two points instead of the tangent: x_{k+1} = x_k − f(x_k)(x_k − x_{k−1})/(f(x_k) − f(x_{k−1})). It converges with order about 1.618 (the golden ratio), slower than Newton per step but needing only one new function evaluation per step (the demo recomputes both values each step, for clarity).

**Fixed-point iteration** rewrites the equation as x = g(x) and repeats x ← g(x). It converges to a fixed point x* when |g′(x*)| < 1, with error multiplied by roughly |g′(x*)| each step, so the smaller that number the faster. For the belt, the length equation rearranges to C = (L_belt − π(R + r) − 2φ(R − r))/(2 cos φ), with φ depending on C. Predict before running: rank the three methods by steps to 10⁻¹² accuracy.

```python
def secant(f, x0, x1, tol=1e-12, max_iter=50):
    for k in range(1, max_iter + 1):
        f0, f1 = f(x0), f(x1)
        x2 = x1 - f1 * (x1 - x0) / (f1 - f0)
        if abs(x2 - x1) < tol:
            return x2, k
        x0, x1 = x1, x2
    raise RuntimeError("no convergence")

def g(C):
    phi = math.asin((R - r) / C)
    return (L_belt - math.pi * (R + r) - 2 * phi * (R - r)) / (2 * math.cos(phi))

C_sec, n_sec = secant(f, 400.0, 500.0)
C_fp, n_fp = 500.0, 0
while True:
    nxt = g(C_fp)
    n_fp += 1
    if abs(nxt - C_fp) < 1e-12:
        break
    C_fp = nxt
gp = (g(C_bis + 1e-6) - g(C_bis - 1e-6)) / 2e-6
print(f"secant:      C = {C_sec:.10f} in {n_sec} steps")
print(f"fixed point: C = {nxt:.10f} in {n_fp} steps, |g'(C*)| = {abs(gp):.4f}")
print(f"bisection:   {n_bis} steps;  scipy brentq: {optimize.brentq(f, 200, 700, xtol=1e-12):.10f}")
```

`optimize.brentq` is **Brent's method**: it keeps a bracket like bisection for safety but takes secant and parabola steps when they behave, the standard robust root-finder.

The secant method needs 5 steps, with no derivative. Fixed-point iteration converges in only 4, because here g′(C*) is exactly zero (at the root C sin φ = R − r, which makes the rearranged formula's slope vanish), so the iteration converges as fast as Newton. That is a lucky property of this rearrangement; with |g′| near 1 fixed-point iteration crawls, and above 1 it diverges. Brent's method agrees to all digits shown. In practice, `brentq` with a bracket is the default for one-variable equations: it is as safe as bisection and nearly as fast as Newton.

## When methods fail

::: math
\[ x^3 - 2x + 2 = 0 \text{ from } x_0 = 0: \quad 0 \to 1 \to 0 \to 1 \to \cdots \]
- Newton can cycle, overshoot, or leave the domain
- at a double root it converges only linearly
In code: `newton(f, df, x, steps)` returns the whole path of guesses
:::


Fast methods have conditions. Newton can overshoot wildly where f′ is small, cycle between two points, or jump outside the region where f is defined; fixed-point iteration diverges if |g′| > 1; secant can divide by a near-zero difference. Multiple roots slow everything down: at a double root, Newton converges only linearly. Bisection never fails once bracketed, which is why hybrid methods keep a bracket as a safety net. Predict before running: what happens to Newton on x³ − 2x + 2 from x = 0, and on (x − 1)² from x = 2?

```python
def newton(f, df, x, steps):
    path = [x]
    for _ in range(steps):
        x = x - f(x) / df(x)
        path.append(x)
    return path

print("x³ - 2x + 2 from 0:", np.round(newton(lambda x: x ** 3 - 2 * x + 2, lambda x: 3 * x ** 2 - 2, 0.0, 6), 4))
dbl = newton(lambda x: (x - 1) ** 2, lambda x: 2 * (x - 1), 2.0, 8)
print("(x - 1)² from 2:", np.round(dbl, 6), "-> error halves each step")
print("brentq on x³ - 2x + 2 with the bracket [-3, 0]:", round(optimize.brentq(lambda x: x ** 3 - 2 * x + 2, -3, 0), 6))
```

The double-root case shows the error dividing by 2 each step: linear convergence, as slow as bisection.

From x = 0, Newton on x³ − 2x + 2 bounces between 0 and 1 forever, never approaching the real root near −1.77: the tangent at each point aims at the other. On the double root of (x − 1)², the error halves each step instead of squaring. A bracketing method finds the root of the cubic without trouble. The lesson: use fast methods with a fallback, and plot the function first when in doubt.

::: challenge Bisection with a guarantee [easy]
Write `bisect(f, a, b, tol=1e-10, max_iter=200)` returning `(root, iterations)`. Raise `ValueError` if a ≥ b or f(a) and f(b) have the same sign (if either is exactly 0, return that end with 0 iterations). Halve until the bracket width is at most `tol` or `max_iter` steps are used, and return the midpoint. Then write `steps_needed(width, tol)`: the number of halvings needed to bring a bracket of that width down to `tol` or less, ceil(log₂(width / tol)), as an int (0 if the width is already at most tol).

```python starter
def bisect(f, a, b, tol=1e-10, max_iter=200):
    return ((a + b) / 2, 0)

def steps_needed(width, tol):
    return 0

print(bisect(lambda x: x * x - 2, 0, 2))
```

```python solution
def bisect(f, a, b, tol=1e-10, max_iter=200):
    if a >= b:
        raise ValueError("need a < b")
    fa, fb = f(a), f(b)
    if fa == 0:
        return (a, 0)
    if fb == 0:
        return (b, 0)
    if (fa > 0) == (fb > 0):
        raise ValueError("f(a) and f(b) must have opposite signs")
    it = 0
    while b - a > tol and it < max_iter:
        m = (a + b) / 2
        fm = f(m)
        if fm == 0:
            return (m, it + 1)
        if (fm > 0) == (fa > 0):
            a, fa = m, fm
        else:
            b = m
        it += 1
    return ((a + b) / 2, it)

def steps_needed(width, tol):
    if width < tol:
        return 0
    return int(math.ceil(math.log2(width / tol)))

print(bisect(lambda x: x * x - 2, 0, 2))
```

```python test
for _n in ["bisect", "steps_needed"]:
    assert _n in dir(), f"Define {_n}."
_r, _k = bisect(lambda x: x * x - 2, 0, 2)
assert abs(_r - math.sqrt(2)) < 1e-10 and 30 <= _k <= 36, f"√2 in about log2(2/1e-10) ≈ 34 steps; got {(_r, _k)}."
assert bisect(lambda x: x - 3, 3, 5) == (3, 0) and bisect(lambda x: x - 5, 3, 5) == (5, 0), "An exact root at an end."
for _bad in [(lambda x: x * x + 1, 0, 2), (lambda x: x, 2, 1), (lambda x: x - 1.5, 2, 1)]:
    try:
        bisect(*_bad)
        assert False, "No sign change, or a > b, should raise ValueError."
    except ValueError:
        pass
_r2, _k2 = bisect(lambda c: math.cos(c) - c, 0, 1, tol=1e-6, max_iter=5)
assert _k2 == 5, "Stops after max_iter steps."
assert steps_needed(500, 1e-9) == 39 and steps_needed(1, 0.25) == 2 and steps_needed(0.1, 1) == 0 and type(steps_needed(8, 1)) is int, "ceil(log2(width / tol))."
"SUCCESS: Halving a sign-change bracket can never fail, and its cost is known in advance: one bit per step."
```

Hint: Keep the sign of f at the left end; at each midpoint, move whichever end has the same sign. The step count is the base-2 logarithm of width/tol, rounded up.
:::

::: challenge Newton and secant [medium]
Write `newton(f, df, x0, tol=1e-12, max_iter=50)` returning `(root, iterations)`: stop when a step is smaller than `tol` in size; raise `RuntimeError` if a derivative is exactly 0 or `max_iter` steps do not converge. Write `secant(f, x0, x1, tol=1e-12, max_iter=50)` with the same conventions (raise `RuntimeError` if f(x₁) = f(x₀) at a step). Then write `convergence_order(errors)`: given a list of positive errors from successive iterations, estimate the order p from the last three as log(e₃/e₂)/log(e₂/e₁), rounded to 1 decimal place (raise `ValueError` for fewer than 3 errors).

```python starter
def newton(f, df, x0, tol=1e-12, max_iter=50):
    return (x0, 0)

def secant(f, x0, x1, tol=1e-12, max_iter=50):
    return (x1, 0)

def convergence_order(errors):
    return 1.0

print(newton(lambda x: x * x - 2, lambda x: 2 * x, 1.0))
```

```python solution
def newton(f, df, x0, tol=1e-12, max_iter=50):
    x = x0
    for k in range(1, max_iter + 1):
        d = df(x)
        if d == 0:
            raise RuntimeError("zero derivative")
        step = f(x) / d
        x -= step
        if abs(step) < tol:
            return (x, k)
    raise RuntimeError("Newton's method did not converge")

def secant(f, x0, x1, tol=1e-12, max_iter=50):
    for k in range(1, max_iter + 1):
        f0, f1 = f(x0), f(x1)
        if f1 == f0:
            raise RuntimeError("flat secant")
        x2 = x1 - f1 * (x1 - x0) / (f1 - f0)
        if abs(x2 - x1) < tol:
            return (x2, k)
        x0, x1 = x1, x2
    raise RuntimeError("the secant method did not converge")

def convergence_order(errors):
    if len(errors) < 3:
        raise ValueError("need at least three errors")
    e1, e2, e3 = errors[-3:]
    return round(math.log(e3 / e2) / math.log(e2 / e1), 1)

print(newton(lambda x: x * x - 2, lambda x: 2 * x, 1.0))
```

```python test
for _n in ["newton", "secant", "convergence_order"]:
    assert _n in dir(), f"Define {_n}."
_r, _k = newton(lambda x: x * x - 2, lambda x: 2 * x, 1.0)
assert abs(_r - math.sqrt(2)) < 1e-14 and _k <= 7, f"Newton reaches √2 in a handful of steps; got {(_r, _k)}."
_rs, _ks = secant(lambda x: x * x - 2, 1.0, 2.0)
assert abs(_rs - math.sqrt(2)) < 1e-13 and _k < _ks <= 12, "Secant converges, a few steps slower than Newton."
for _call in [lambda: newton(lambda x: x * x + 1, lambda x: 2 * x, 0.0), lambda: newton(lambda x: x ** 3 - 2 * x + 2, lambda x: 3 * x * x - 2, 0.0, max_iter=30), lambda: secant(lambda x: 5.0, 0.0, 1.0)]:
    try:
        _call()
        assert False, "Zero derivative, cycling or a flat secant should raise RuntimeError."
    except RuntimeError:
        pass
assert convergence_order([1e-1, 1e-2, 1e-3]) == 1.0 and convergence_order([1e-2, 1e-4, 1e-8]) == 2.0, "Linear and quadratic."
assert convergence_order([0.3, 1e-1, 1e-2, 1e-4]) == 2.0, "Use the last three errors."
_x, _errs = 1.0, []
for _ in range(4):
    _x = _x - (_x * _x - 2) / (2 * _x)
    _errs.append(abs(_x - math.sqrt(2)))
assert convergence_order(_errs[:3]) == 2.0, f"Newton's errors show order 2; got {convergence_order(_errs[:3])}."
try:
    convergence_order([0.1, 0.01])
    assert False, "Two errors are not enough."
except ValueError:
    pass
"SUCCESS: Tangents double the digits each step, secants nearly so, and the errors themselves reveal the order."
```

Hint: Newton steps by f(x)/f′(x); the secant replaces f′ with the slope through the last two points. For the order, errors with e_{k+1} ≈ C e_kᵖ give p ≈ log(e₃/e₂)/log(e₂/e₁).
:::

::: challenge Sizing a belt drive [hard]
Write `belt_length(C, R, r)` for an open belt on pulleys of radii R ≥ r with centre distance C (raise `ValueError` unless C > R − r ≥ 0). Write `centre_distance(L, R, r)`: the centre distance for a belt of length L, found with a **safeguarded Newton method**: keep a bracket [lo, hi] (start with lo just above R − r and hi = L/2, checking the sign change), try a Newton step using a central-difference derivative, and fall back to the bracket's midpoint whenever the Newton step would leave the bracket; update the bracket with each new point's sign; stop when the bracket is narrower than 1e-10 or a step is below 1e-12. Return C rounded to 6 decimal places. Raise `ValueError` if no centre distance fits (the belt is shorter than the length at the smallest possible C, or longer than any C up to L/2 can take). Finally write `wrap_angle_deg(C, R, r)`: the angle the belt wraps round the **small** pulley, π − 2φ in degrees, rounded to 2 decimal places.

```python starter
def belt_length(C, R, r):
    return 2 * C + math.pi * (R + r)

def centre_distance(L, R, r):
    return (L - math.pi * (R + r)) / 2

def wrap_angle_deg(C, R, r):
    return 180.0

print(centre_distance(1500, 120, 45))
```

```python solution
def belt_length(C, R, r):
    if not (R >= r >= 0 and C > R - r):
        raise ValueError("need R >= r >= 0 and C > R - r")
    phi = math.asin((R - r) / C)
    return 2 * C * math.cos(phi) + math.pi * (R + r) + 2 * phi * (R - r)

def centre_distance(L, R, r):
    g = lambda C: belt_length(C, R, r) - L
    lo, hi = (R - r) + 1e-9 + 1e-12 * max(1.0, R), L / 2
    if hi <= lo or g(lo) > 0 or g(hi) < 0:
        raise ValueError("no centre distance fits this belt")
    x = (lo + hi) / 2
    for _ in range(200):
        gx = g(x)
        if gx > 0:
            hi = x
        else:
            lo = x
        if hi - lo < 1e-10:
            break
        h = 1e-6 * max(1.0, x)
        d = (g(min(x + h, hi + h)) - g(max(x - h, lo))) / (min(x + h, hi + h) - max(x - h, lo))
        nxt = x - gx / d if d != 0 else (lo + hi) / 2
        if not lo < nxt < hi:
            nxt = (lo + hi) / 2
        if abs(nxt - x) < 1e-12:
            x = nxt
            break
        x = nxt
    return round(x, 6)

def wrap_angle_deg(C, R, r):
    phi = math.asin((R - r) / C)
    return round(math.degrees(math.pi - 2 * phi), 2)

print(centre_distance(1500, 120, 45))
```

```python test
for _n in ["belt_length", "centre_distance", "wrap_angle_deg"]:
    assert _n in dir(), f"Define {_n}."
assert abs(belt_length(500, 50, 50) - (1000 + math.pi * 100)) < 1e-9, "Equal pulleys: two straight runs plus a full circumference."
for _bad in [(70, 120, 45), (500, 40, 45)]:
    try:
        belt_length(*_bad)
        assert False, f"belt_length{_bad} should raise ValueError."
    except ValueError:
        pass
_C = centre_distance(1500, 120, 45)
assert abs(belt_length(_C, 120, 45) - 1500) < 1e-5, f"The centre distance must give the belt length; got C = {_C}."
assert 400 < _C < 520, f"About 480 mm; got {_C}."
assert abs(centre_distance(1000 + math.pi * 100, 50, 50) - 500) < 1e-6, "Equal pulleys have an exact answer."
for _L in (1200, 2500, 4000):
    assert abs(belt_length(centre_distance(_L, 150, 30), 150, 30) - _L) < 1e-5, f"Belt of {_L} mm."
for _bad in [(400, 120, 45), (200, 50, 50)]:
    try:
        centre_distance(*_bad)
        assert False, f"centre_distance{_bad}: no centre distance fits; raise ValueError."
    except ValueError:
        pass
assert wrap_angle_deg(_C, 120, 45) < 180 and wrap_angle_deg(500, 50, 50) == 180.0 and wrap_angle_deg(200, 150, 30) == round(math.degrees(math.pi - 2 * math.asin(120 / 200)), 2), "Wrap angle on the small pulley."
"SUCCESS: Newton for speed, a bracket for safety: the belt's centre distance to the micrometre, however awkward the equation."
```

Hint: Bracket the root between just above R − r and L/2 and check that f changes sign there. At each step, tighten the bracket with the current point's sign, compute a Newton step from a numerical derivative, and replace it by the bracket midpoint if it lands outside the bracket.
:::

## What you learned

- Equations without algebraic solutions are solved by iteration; plotting f first shows where the roots are.
- Bisection halves a sign-change bracket each step: guaranteed, one bit per step, log₂(width/tol) steps.
- Newton's method follows tangent lines and roughly doubles the correct digits per step near a simple root, but needs a derivative and a good start.
- The secant method avoids derivatives (order about 1.6); fixed-point iteration converges when |g′| < 1.
- Fast methods can cycle, overshoot or slow down at multiple roots; safeguarded hybrids like Brent's method keep a bracket for safety.
- The order of convergence can be read from successive errors: log(e₃/e₂)/log(e₂/e₁).

The next lesson looks at how floating-point arithmetic can betray a careful calculation, and how to avoid it.
