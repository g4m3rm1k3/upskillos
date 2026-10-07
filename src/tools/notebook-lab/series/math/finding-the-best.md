# Finding the best: optimisation

A food company fills a billion cans a year. If each can used 1% less steel, the savings would run to millions. What shape of can holds a given volume with the least metal? Questions of "best" are everywhere in engineering: the lightest bracket that is still strong enough, the cheapest blend that meets a specification, the fastest move a motor can make. This is **optimisation**: choose the variables that minimise (or maximise) an **objective**, subject to **constraints**. This lesson solves single-variable problems four ways: by search on a grid, by setting the derivative to zero, by golden-section search that homes in efficiently, and with SciPy, and it shows how constraints and boundaries change the answer. The optimisation block later handles many variables.

This lesson covers:

- turning a design problem into an objective in one variable, using a constraint;
- grid search, and the derivative test for a minimum;
- the cheapest can, exactly and numerically;
- golden-section search for one-variable problems;
- optima on the boundary, and SciPy's optimisers.

## Setting up the problem

::: math
\[ V = \pi r^2 h, \qquad h = \frac{V}{\pi r^2}, \qquad A(r) = 2\pi r^2 + \frac{2V}{r} \]
- objective: sheet area $A$; constraint: fixed volume $V$
- solving the constraint for $h$ leaves an objective in $r$ alone
In code: `area(r)` evaluated on `np.linspace(1.5, 8, 1301)`, then the smallest value
:::


A closed cylindrical can of radius r and height h holds V = πr²h and uses sheet area A = 2πr² (two ends) + 2πrh (the side). The objective is A; the constraint is that V is fixed, say 330 ml. A constraint that can be solved for one variable removes it: h = V/(πr²), so

\[ A(r) = 2\pi r^2 + \frac{2V}{r} \]

an objective in r alone. Small r means a tall thin can with a large side; large r means a flat can with huge ends; somewhere between lies the minimum. Predict before running: is the best 330 ml can taller than it is wide?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp
from scipy import optimize

V = 330.0

def area(r):
    return 2 * math.pi * r ** 2 + 2 * V / r

rs = np.linspace(1.5, 8, 1301)
areas = 2 * np.pi * rs ** 2 + 2 * V / rs
i = np.argmin(areas)
print(f"grid search: r = {rs[i]:.3f} cm, h = {V / (math.pi * rs[i] ** 2):.3f} cm, area {areas[i]:.2f} cm²")
print(f"a standard 330 ml can (r = 3.3 cm): h = {V / (math.pi * 3.3 ** 2):.2f} cm, area {area(3.3):.2f} cm²")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(rs, areas)
ax.plot(rs[i], areas[i], "ro")
ax.set_xlabel("radius (cm)")
ax.set_ylabel("sheet area (cm²)")
ax.set_ylim(200, 500)
plt.show()
```

```output
grid search: r = 3.745 cm, h = 7.490 cm, area 264.36 cm²
a standard 330 ml can (r = 3.3 cm): h = 9.65 cm, area 268.42 cm²
```

Volumes in millilitres are cubic centimetres, so lengths come out in centimetres and areas in cm².

The best can has r ≈ 3.74 cm and h ≈ 7.49 cm: its height equals its diameter. A real drinks can (r = 3.3 cm, h = 9.65 cm) uses about 1.5% more sheet. Real cans are taller for good reasons the model ignores: grip, stacking, thicker ends, and the cost of the seams. A model is only as good as its objective.

## The derivative test

::: math
\[ A'(r) = 4\pi r - \frac{2V}{r^2} = 0 \;\Longrightarrow\; r^3 = \frac{V}{2\pi}, \qquad h = 2r, \qquad A''(r) = 4\pi + \frac{4V}{r^3} > 0 \]
- a smooth interior minimum has zero derivative
- a positive second derivative confirms a minimum
In code: `sp.solve(sp.diff(A_expr, r), r)`
:::


At a smooth interior minimum the graph is momentarily level, so the derivative is zero: the stationary points of the derivative lesson. For the can, A′(r) = 4πr − 2V/r² = 0 gives r³ = V/(2π), and then h = V/(πr²) = 2r exactly: height equals diameter, for any volume. The **second derivative** confirms a minimum: A″(r) = 4π + 4V/r³ > 0, so the curve bends upward (it is convex). SymPy does the algebra. Predict before running: does the formula match the grid search?

```python type
r, Vs = sp.symbols("r V", positive=True)
A_expr = 2 * sp.pi * r ** 2 + 2 * Vs / r
r_star = sp.solve(sp.diff(A_expr, r), r)
print("A'(r) =", sp.diff(A_expr, r), "  zero at r =", r_star)
r_opt = float(r_star[0].subs(Vs, V))
print(f"r* = {r_opt:.4f} cm, h* = {V / (math.pi * r_opt ** 2):.4f} cm (h/r = {V / (math.pi * r_opt ** 3):.4f}), area {area(r_opt):.3f} cm²")
print("second derivative at r*:", float(sp.diff(A_expr, r, 2).subs({r: r_opt, Vs: V})), "> 0, so a minimum")
```

```output
A'(r) = -2*V/r**2 + 4*pi*r   zero at r = [2**(2/3)*V**(1/3)/(2*pi**(1/3))]
r* = 3.7449 cm, h* = 7.4899 cm (h/r = 2.0000), area 264.357 cm²
second derivative at r*: 37.69911184307753 > 0, so a minimum
```

`positive=True` tells SymPy that r and V are positive, so it discards complex and negative cube roots.

SymPy finds r* = (V/2π)^(1/3) = 3.7449 cm, matching the grid's 3.745, with h/r exactly 2. The second derivative is positive, so it is a minimum. The derivative method gives exact, general answers when the algebra is manageable; the grid search needed no algebra but cost 1,301 evaluations for three decimal places.

## Golden-section search

::: math
\[ c = b - g\,(b - a), \quad d = a + g\,(b - a), \qquad g = \frac{\sqrt{5} - 1}{2} \approx 0.618 \]
- if $f(c) < f(d)$ the minimum lies in $[a, d]$, otherwise in $[c, b]$
- each step reuses one old point and shrinks the interval by the factor $g$
In code: `golden(f, a, b, tol)` loops `while b - a > tol`
:::


When the objective comes from a simulation rather than a formula, there is no derivative to solve, and a fine grid is expensive. If the function has a single minimum on an interval (it is **unimodal**), the interval can be shrunk systematically: evaluate two interior points; the minimum cannot lie beyond the higher one, so discard that part. **Golden-section search** places the two points at the golden-ratio fractions of the interval, 0.382 and 0.618, so that one old point is reused at every step: each step costs one new evaluation and shrinks the interval by a factor of 0.618. Predict before running: how many evaluations does golden section need to match the grid's precision?

```python type
def golden(f, a, b, tol=1e-6):
    g = (math.sqrt(5) - 1) / 2
    c, d = b - g * (b - a), a + g * (b - a)
    fc, fd = f(c), f(d)
    evals = 2
    while b - a > tol:
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - g * (b - a)
            fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + g * (b - a)
            fd = f(d)
        evals += 1
    return (a + b) / 2, evals

for tol in [1e-3, 1e-6, 1e-9]:
    x, n = golden(area, 1.5, 8, tol)
    print(f"tolerance {tol:.0e}: r = {x:.10f} cm with {n} evaluations")
```

```output
tolerance 1e-03: r = 3.7449584745 cm with 21 evaluations
tolerance 1e-06: r = 3.7449386893 cm with 35 evaluations
tolerance 1e-09: r = 3.7449385465 cm with 49 evaluations
```

When f(c) < f(d) the minimum lies in [a, d], and the old c becomes the new d; otherwise it lies in [c, b], and the old d becomes the new c. Either way only one new point is evaluated.

Golden section reaches the grid's precision (10⁻³ cm) with about 20 evaluations instead of 1,301, and shrinks the interval below 10⁻⁹ with 49. The true accuracy then is only about 10⁻⁸, though: near a minimum the function is so flat that nearly equal values cannot be told apart in floating point, which limits any comparison-based search to about the square root of machine precision. Each evaluation multiplies the interval by 0.618, so the cost grows only with the logarithm of the required precision, the bisection idea again. Its one requirement is unimodality: with several valleys it finds one of them, not necessarily the lowest.

## Constraints and boundaries

::: math
\[ \min_{a \le r \le b} A(r): \text{ compare } A \text{ at the stationary points inside and at } r = a,\; r = b \]
- the best point may lie on the boundary, where $A'(r) \ne 0$
- with $r \le 3.2$ the area is still falling at the limit
In code: `optimize.minimize_scalar(area, bounds=(1.5, 3.2), method="bounded")`
:::


Constraints often limit the variables to a range, and then the best point may be on the **boundary**, where the derivative need not be zero. Suppose the can must fit a pallet layout that allows a radius of at most 3.2 cm. The unconstrained optimum, 3.74 cm, is not allowed; since the area falls all the way up to 3.74, the best allowed radius is the boundary 3.2 cm. The rule for one variable on [a, b]: check the stationary points inside and both ends, and take the best.

SciPy provides robust one-variable and many-variable optimisers. `optimize.minimize_scalar` with `method="bounded"` searches an interval. Predict before running: what radius does SciPy choose with and without the pallet limit?

```python type
free = optimize.minimize_scalar(area, bounds=(1.5, 8), method="bounded")
limited = optimize.minimize_scalar(area, bounds=(1.5, 3.2), method="bounded")
print(f"no limit: r = {free.x:.4f} cm, area {free.fun:.3f} cm², {free.nfev} evaluations")
print(f"r ≤ 3.2 cm: r = {limited.x:.4f} cm, area {limited.fun:.3f} cm², derivative there {4 * math.pi * limited.x - 2 * V / limited.x ** 2:.2f} (not zero)")
print(f"cost of the limit: {100 * (limited.fun / free.fun - 1):.2f}% more sheet")
```

```output
no limit: r = 3.7449 cm, area 264.357 cm², 10 evaluations
r ≤ 3.2 cm: r = 3.2000 cm, area 270.590 cm², derivative there -24.24 (not zero)
cost of the limit: 2.36% more sheet
```

`result.x` is the best point, `result.fun` the objective there and `result.nfev` the number of function evaluations used.

Without the limit SciPy finds r = 3.7449 cm in only 10 evaluations (it combines golden section with fitting parabolas through recent points). With the limit it stops at (very nearly) 3.2 cm, where the derivative is about −24, not zero: the area would keep falling if the boundary allowed. The pallet constraint costs 2.4% more sheet. Knowing that cost is valuable in itself: it tells the designer what relaxing the constraint would be worth.

::: challenge The cheapest can [easy]
Write `can_area(r, V)`, the sheet area of a closed can of radius r holding volume V, raising `ValueError` if r or V is not positive. Write `best_can(V)` returning `(r, h, area)` of the minimum-area can, from the exact formula r = (V/2π)^(1/3), each rounded to 4 decimal places. Then write `open_top_best(V)`: the same for a can **without a lid** (one end only), deriving the optimum yourself (set the derivative of πr² + 2V/r to zero), rounded to 4 decimal places.

```python starter
def can_area(r, V):
    return 0.0

def best_can(V):
    return (1.0, 1.0, 1.0)

def open_top_best(V):
    return (1.0, 1.0, 1.0)

print(best_can(330))
```

```python solution
def can_area(r, V):
    if r <= 0 or V <= 0:
        raise ValueError("r and V must be positive")
    return 2 * math.pi * r ** 2 + 2 * V / r

def best_can(V):
    r = (V / (2 * math.pi)) ** (1 / 3)
    h = V / (math.pi * r ** 2)
    return (round(r, 4), round(h, 4), round(can_area(r, V), 4))

def open_top_best(V):
    r = (V / math.pi) ** (1 / 3)
    h = V / (math.pi * r ** 2)
    return (round(r, 4), round(h, 4), round(math.pi * r ** 2 + 2 * V / r, 4))

print(best_can(330))
```

```python test
for _n in ["can_area", "best_can", "open_top_best"]:
    assert _n in dir(), f"Define {_n}."
assert abs(can_area(3.3, 330) - (2 * math.pi * 3.3 ** 2 + 660 / 3.3)) < 1e-9, "Two ends plus the side."
for _bad in [(0, 330), (3, -1)]:
    try:
        can_area(*_bad)
        assert False, f"can_area{_bad} should raise ValueError."
    except ValueError:
        pass
_r, _h, _a = best_can(330)
assert _r == 3.7449 and abs(_h - 7.4899) <= 1.5e-4 and abs(_a - can_area(3.7449, 330)) < 1e-3, f"Got {best_can(330)}."
assert abs(best_can(1000)[1] - 2 * best_can(1000)[0]) < 1e-3, "Height equals diameter for any volume."
_ro, _ho, _ao = open_top_best(330)
assert abs(_ro - 4.7183) < 1e-4 and abs(_ho - 4.7183) < 2e-4, f"An open-top can's best height equals its radius; got {open_top_best(330)}."
assert abs(_ao - (math.pi * _ro ** 2 + 660 / _ro)) < 1e-2, "The open-top area."
"SUCCESS: Calculus gives the shape directly: a closed can is as tall as it is wide, an open one only half as tall."
```

Hint: Set the derivative of 2πr² + 2V/r to zero: 4πr = 2V/r², so r³ = V/(2π). For the open can, the derivative of πr² + 2V/r gives r³ = V/π, and then h = r.
:::

::: challenge Golden-section search [medium]
Write `golden_section(f, a, b, tol=1e-8)` that returns `(x, evaluations)`: the approximate minimiser of a unimodal f on [a, b], found by golden-section search until the interval is narrower than `tol`, and the number of times f was called. Reuse one interior point per step, so each iteration costs exactly one new evaluation. Raise `ValueError` if a ≥ b or tol ≤ 0. Then write `evaluations_needed(width, tol)`: the number of evaluations golden section needs to shrink an interval of `width` below `tol`, which is 2 + the smallest k with width × 0.618034ᵏ < tol (use the exact ratio (√5 − 1)/2).

```python starter
def golden_section(f, a, b, tol=1e-8):
    xs = np.linspace(a, b, 10001)
    ys = [f(x) for x in xs]
    return (float(xs[int(np.argmin(ys))]), len(xs))

def evaluations_needed(width, tol):
    return 0

print(golden_section(lambda x: (x - 2) ** 2, 0, 5))
```

```python solution
def golden_section(f, a, b, tol=1e-8):
    if a >= b or tol <= 0:
        raise ValueError("need a < b and tol > 0")
    g = (math.sqrt(5) - 1) / 2
    c, d = b - g * (b - a), a + g * (b - a)
    fc, fd = f(c), f(d)
    evals = 2
    while b - a > tol:
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - g * (b - a)
            fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + g * (b - a)
            fd = f(d)
        evals += 1
    return ((a + b) / 2, evals)

def evaluations_needed(width, tol):
    g = (math.sqrt(5) - 1) / 2
    k = 0
    while width * g ** k >= tol:
        k += 1
    return 2 + k

print(golden_section(lambda x: (x - 2) ** 2, 0, 5))
```

```python test
for _n in ["golden_section", "evaluations_needed"]:
    assert _n in dir(), f"Define {_n}."
_calls = [0]
def _f(x):
    _calls[0] += 1
    return (x - 2.3456789) ** 2 + 1
_x, _n = golden_section(_f, 0, 5, 1e-8)
assert abs(_x - 2.3456789) < 1e-7, f"Got {_x}."
assert _n == _calls[0], f"Report the true number of calls: you said {_n}, f was called {_calls[0]} times."
assert _n <= evaluations_needed(5, 1e-8) + 1, f"{_n} evaluations: reuse one interior point per step (about {evaluations_needed(5, 1e-8)} are needed)."
_x2, _ = golden_section(lambda r: 2 * math.pi * r ** 2 + 660 / r, 1.5, 8, 1e-9)
assert abs(_x2 - (330 / (2 * math.pi)) ** (1 / 3)) < 1e-7, "The can's optimal radius."
_x3, _ = golden_section(lambda x: abs(x - 1), 0, 4, 1e-9)
assert abs(_x3 - 1) < 1e-8, "Works without a derivative (a V-shaped function)."
for _bad in [(3, 1, 1e-6), (0, 1, 0)]:
    try:
        golden_section(lambda x: x * x, *_bad)
        assert False, f"golden_section with {_bad} should raise ValueError."
    except ValueError:
        pass
assert evaluations_needed(5, 1e-8) == 44 and evaluations_needed(1, 0.5) == 4 and evaluations_needed(1, 2) == 2, f"Got {evaluations_needed(5, 1e-8)}."
"SUCCESS: One new evaluation per step, each shrinking the bracket by 0.618: precision for the price of a logarithm."
```

Hint: Keep a, b, the interior points c < d and their values. If f(c) < f(d), the new interval is [a, d] and the old c becomes the new d; otherwise the new interval is [c, b] and the old d becomes the new c. Compute only the one new point.
:::

::: challenge A can with real costs [hard]
Real cans cost more than sheet area suggests: the ends are made from thicker, dearer stock, and seams cost money per metre. For a can of radius r and height h (cm) holding V cm³, the cost in pence is `side_cost` × side area + `end_cost` × area of both ends + `seam_cost` × seam length, where the seam length is the vertical side seam h plus the two rim seams, 2 × 2πr. Write `can_cost(r, V, side_cost, end_cost, seam_cost)` (raise `ValueError` if r or V is not positive). Write `cheapest_can(V, side_cost, end_cost, seam_cost, r_min=0.5, r_max=20)` returning `(r, h, cost)` rounded to 4, 4 and 6 decimal places, minimising cost over r in [r_min, r_max] (the cost is unimodal there; use golden section or `scipy.optimize.minimize_scalar`). If the minimum lies within 1e-4 of a bound, return that bound exactly. Then write `exact_radius(V, side_cost, end_cost)`: with no seam cost, setting the derivative to zero gives r³ = side_cost × V / (2π × end_cost); return r rounded to 4 decimal places.

```python starter
def can_cost(r, V, side_cost, end_cost, seam_cost):
    return 0.0

def cheapest_can(V, side_cost, end_cost, seam_cost, r_min=0.5, r_max=20):
    return (1.0, 1.0, 0.0)

def exact_radius(V, side_cost, end_cost):
    return 1.0

print(cheapest_can(330, 0.010, 0.025, 0.05))
```

```python solution
def can_cost(r, V, side_cost, end_cost, seam_cost):
    if r <= 0 or V <= 0:
        raise ValueError("r and V must be positive")
    h = V / (math.pi * r ** 2)
    return side_cost * 2 * math.pi * r * h + end_cost * 2 * math.pi * r ** 2 + seam_cost * (h + 4 * math.pi * r)

def cheapest_can(V, side_cost, end_cost, seam_cost, r_min=0.5, r_max=20):
    res = optimize.minimize_scalar(lambda r: can_cost(r, V, side_cost, end_cost, seam_cost),
                                   bounds=(r_min, r_max), method="bounded", options={"xatol": 1e-10})
    r = float(res.x)
    if r - r_min < 1e-4:
        r = float(r_min)
    elif r_max - r < 1e-4:
        r = float(r_max)
    h = V / (math.pi * r ** 2)
    return (round(r, 4), round(h, 4), round(can_cost(r, V, side_cost, end_cost, seam_cost), 6))

def exact_radius(V, side_cost, end_cost):
    return round((side_cost * V / (2 * math.pi * end_cost)) ** (1 / 3), 4)

print(cheapest_can(330, 0.010, 0.025, 0.05))
```

```python test
for _n in ["can_cost", "cheapest_can", "exact_radius"]:
    assert _n in dir(), f"Define {_n}."
_h = 330 / (math.pi * 9)
assert abs(can_cost(3, 330, 0.01, 0.025, 0.05) - (0.01 * 2 * math.pi * 3 * _h + 0.025 * 2 * math.pi * 9 + 0.05 * (_h + 12 * math.pi))) < 1e-12, "Side, ends and seams."
try:
    can_cost(0, 330, 0.01, 0.02, 0)
    assert False, "r = 0 should raise ValueError."
except ValueError:
    pass
assert exact_radius(330, 0.01, 0.01) == 3.7449 and exact_radius(330, 0.010, 0.025) == round((0.01 * 330 / (2 * math.pi * 0.025)) ** (1 / 3), 4), "Equal costs give the area optimum; dearer ends shrink the radius."
_r0, _, _c0 = cheapest_can(330, 0.010, 0.025, 0.0)
assert abs(_r0 - exact_radius(330, 0.010, 0.025)) <= 1e-4, f"With no seam cost the search must match the formula; got {_r0}."
_r, _hh, _c = cheapest_can(330, 0.010, 0.025, 0.05)
_rs = np.linspace(0.5, 20, 200001)
_costs = 0.01 * 2 * 330 / _rs + 0.025 * 2 * np.pi * _rs ** 2 + 0.05 * (330 / (np.pi * _rs ** 2) + 4 * np.pi * _rs)
assert abs(_r - _rs[np.argmin(_costs)]) < 2e-4 and abs(_c - _costs.min()) < 1e-6, f"Got {(_r, _hh, _c)}; a fine grid says r ≈ {_rs[np.argmin(_costs)]:.4f}."
assert abs(_hh - 330 / (math.pi * _r ** 2)) < 1e-3, "h follows from the volume."
assert cheapest_can(330, 0.010, 0.025, 0.05, r_max=2.5)[0] == 2.5, "An optimum beyond the limit lands exactly on the bound."
"SUCCESS: Costs reshape the optimum: dear ends make cans slimmer, seams push back, and a size limit can override both."
```

Hint: Write h = V/(πr²) inside `can_cost`. For the search, `optimize.minimize_scalar(f, bounds=(r_min, r_max), method="bounded")` works, or reuse golden section; snap results within 1e-4 of a bound onto the bound.
:::

## What you learned

- An optimisation problem has an objective, variables and constraints; an equality constraint can often be solved to remove a variable.
- At a smooth interior optimum the derivative is zero; a positive second derivative confirms a minimum. A closed can of least area has height equal to its diameter.
- Grid search needs no algebra but many evaluations; golden-section search shrinks a unimodal bracket by 0.618 per evaluation.
- With bounds, check stationary points inside and the ends: the best point may sit on a boundary, where the derivative is not zero, and the gap measures what the constraint costs.
- SciPy's `minimize_scalar` (and, for many variables, `minimize`) does this robustly; the model's objective decides whether its answer means anything.

The next lesson finds the best point when there are many variables, by walking downhill along the gradient.
