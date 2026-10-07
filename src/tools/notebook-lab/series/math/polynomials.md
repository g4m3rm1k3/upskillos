# Polynomials: roots, factors and multiplicity

The deflection of a loaded beam, the calibration curve of a thermocouple, the path of a cam follower and the shape of a font's curves are all **polynomials**: sums of powers of x with constant coefficients. They are the functions computers evaluate most cheaply and fit most easily, and their roots carry meaning. A root where a curve merely touches zero, rather than crossing it, is a **repeated** root, and a beam's clamped end is exactly such a point. This lesson treats polynomials as arrays of coefficients, evaluates them efficiently, finds and divides out their roots, explains what multiplicity means and why repeated roots are numerically fragile, and uses all of it on beam deflection curves and on polynomials through given points.

This lesson covers:

- polynomials as coefficient arrays; Horner's method; products as convolutions;
- the factor theorem, synthetic division, and roots from the companion matrix;
- multiplicity: crossing versus touching, and the fragility of repeated roots;
- beam deflection polynomials, where boundary conditions become roots;
- the unique polynomial through n + 1 points.

## Coefficients, Horner and products

::: math
\[ p(x) = a_n x^n + a_{n-1} x^{n-1} + \cdots + a_1 x + a_0 = \Big(\big((a_n x + a_{n-1})\,x + a_{n-2}\big)\,x + \cdots\Big)\,x + a_0 \]
\[ (p\,q)_k = \sum_{i + j = k} p_i\,q_j \quad\text{(the coefficients of a product are a convolution)} \]
- **Horner's method** (the nested form) evaluates a degree-$n$ polynomial with $n$ multiplications and $n$ additions
- NumPy stores coefficients highest power first: $[a_n, \ldots, a_0]$
In code: a Horner loop against `np.polyval`; `np.convolve` against `np.polymul`
:::

A polynomial is determined by its list of coefficients, so a computer stores it as an array. NumPy's polynomial functions put the highest power first. Evaluating it naively, power by power, wastes multiplications. **Horner's method** rewrites p(x) as nested brackets, so each step is one multiplication and one addition. That is the minimum possible, and it is usually at least as accurate. Multiplying two polynomials multiplies every term of one by every term of the other and collects equal powers. The resulting coefficients are a **convolution** of the two coefficient lists, a close relative of the cross-correlation in the transformations lesson: convolution reverses one list before sliding it past the other.

Predict before running: does Horner's method agree with `np.polyval` for 2x³ − 3x² + 4x − 5 at x = 1.5? And what is (x² + 2x + 3)(x − 1)?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

def horner(coeffs, x):
    value = 0.0
    for a in coeffs:
        value = value * x + a
    return value

p = [2, -3, 4, -5]
print("Horner:", horner(p, 1.5), "  np.polyval:", np.polyval(p, 1.5))
print("(x² + 2x + 3)(x - 1) coefficients:", np.convolve([1, 2, 3], [1, -1]), " np.polymul:", np.polymul([1, 2, 3], [1, -1]))
print("check with SymPy:", sp.expand((sp.symbols("x") ** 2 + 2 * sp.symbols("x") + 3) * (sp.symbols("x") - 1)))
```

```output
Horner: 1.0   np.polyval: 1.0
(x² + 2x + 3)(x - 1) coefficients: [ 1  1  1 -3]  np.polymul: [ 1  1  1 -3]
check with SymPy: x**3 + x**2 + x - 3
```

Both evaluations give 1.0 (2 × 3.375 − 3 × 2.25 + 6 − 5). The product (x² + 2x + 3)(x − 1) has coefficients [1, 1, 1, −3], that is x³ + x² + x − 3, the convolution of [1, 2, 3] and [1, −1], as SymPy's expansion confirms. Numerical libraries evaluate the polynomial approximations behind sin, exp and log with Horner's method, so it runs billions of times a second on any computer.

## Roots and factors

::: math
\[ p(r) = 0 \;\Longleftrightarrow\; p(x) = (x - r)\,q(x), \qquad p(x) = (x - r)\,q(x) + p(r) \]
- the **factor theorem**: $r$ is a root exactly when $x - r$ divides $p$; the remainder on dividing by $x - r$ is $p(r)$
- a degree-$n$ polynomial has at most $n$ real roots, and exactly $n$ complex roots counted with multiplicity; complex roots of real polynomials come in conjugate pairs
- `np.roots` finds them as the eigenvalues of the **companion matrix**, whose characteristic polynomial is $p$
In code: `synthetic(coeffs, r)` divides by $x - r$; `np.roots`; the companion matrix's eigenvalues
:::

Dividing by x − r leaves a remainder equal to p(r), so r is a root exactly when the division is exact. That is the **factor theorem**. Each root found can be divided out (**deflation**), leaving a polynomial of one lower degree, so a degree-n polynomial has at most n roots. Over the complex numbers it has exactly n, counting repeats (the fundamental theorem of algebra). For polynomials with real coefficients the non-real ones come in conjugate pairs a ± bi.

**Synthetic division** is Horner's method with the intermediate values kept: they are the quotient's coefficients. `np.roots` takes a different route. It builds the **companion matrix**, whose eigenvalues are exactly the polynomial's roots, and uses the eigenvalue solver of the linear-algebra lessons.

Predict before running: x³ − 6x² + 11x − 6 has the root 1 (its coefficients add to zero). What is left after dividing out x − 1, and what are all the roots of x³ − x² + x − 1?

```python type
def synthetic(coeffs, r):
    out = [coeffs[0]]
    for a in coeffs[1:]:
        out.append(out[-1] * r + a)
    return out[:-1], out[-1]

q, rem = synthetic([1, -6, 11, -6], 1)
print("x³ - 6x² + 11x - 6 divided by (x - 1): quotient", q, "remainder", rem)
print("roots of the quotient:", np.roots(q))
c = [1, -1, 1, -1]
print("roots of x³ - x² + x - 1:", np.round(np.roots(c), 6))
companion = np.diag(np.ones(len(c) - 2), -1)
companion[0, :] = -np.array(c[1:], dtype=float) / c[0]
print("companion matrix eigenvalues:", np.round(np.sort_complex(np.linalg.eigvals(companion)), 6))
```

```output
x³ - 6x² + 11x - 6 divided by (x - 1): quotient [1, -5, 6] remainder 0
roots of the quotient: [3. 2.]
roots of x³ - x² + x - 1: [ 1.+0.j -0.+1.j -0.-1.j]
companion matrix eigenvalues: [-0.-1.j -0.+1.j  1.+0.j]
```

Dividing x³ − 6x² + 11x − 6 by x − 1 leaves x² − 5x + 6 with remainder 0, whose roots are 3 and 2: the cubic is (x − 1)(x − 2)(x − 3). x³ − x² + x − 1 = (x − 1)(x² + 1) has one real root, 1, and the conjugate pair ±i. The companion matrix's eigenvalues are the same three numbers, which is how `np.roots` computes them.

## Multiplicity: touching and crossing

::: math
\[ p(x) = (x - r)^m\,q(x), \;\; q(r) \ne 0 \;\Longrightarrow\; p(r) = p'(r) = \cdots = p^{(m-1)}(r) = 0 \]
- $m$: the **multiplicity** of the root $r$; odd $m$: the graph crosses the axis; even $m$: it touches and turns back
- a repeated root is fragile: changing a coefficient by $\varepsilon$ moves a root of multiplicity $m$ by about $\varepsilon^{1/m}$
In code: the derivatives of $(x - 1)^3(x + 2)$ at $x = 1$; the roots of $(x - 1)^4$ after a perturbation of $10^{-10}$
:::

A root can be repeated: in (x − 1)³(x + 2), the root 1 has **multiplicity** 3. The power controls the shape near the root. An odd power changes sign, so the graph crosses the axis, flattening more for higher powers. An even power keeps its sign, so the graph touches the axis and turns back. At a root of multiplicity m the polynomial and its first m − 1 derivatives all vanish: the graph is flat there to that order.

Repeated roots are where numerical root finding struggles. Nudging (x − 1)⁴ down by 10⁻¹⁰ does not move its root by 10⁻¹⁰. It splits it into four roots about (10⁻¹⁰)^(1/4) ≈ 0.003 away, because near the root the polynomial is so flat that a tiny vertical shift moves the crossing a long way. Rounding errors in the coefficients act like such nudges, so computed multiple roots are only accurate to about the m-th root of machine precision.

Predict before running: which derivatives of (x − 1)³(x + 2) vanish at x = 1, and how far do the roots of (x − 1)⁴ move when its constant term changes by 10⁻¹⁰?

```python type
X = sp.symbols("x")
f = (X - 1) ** 3 * (X + 2)
print("derivatives at x = 1:", [sp.diff(f, X, k).subs(X, 1) for k in range(5)])
quartic = np.poly([1, 1, 1, 1])
print("(x - 1)⁴ coefficients:", quartic)
perturbed = quartic.copy()
perturbed[-1] -= 1e-10
print("roots after changing the constant by 1e-10:", np.round(np.roots(perturbed), 6))
print("predicted spread (1e-10)^(1/4):", round(1e-10 ** 0.25, 6))
print("even the unperturbed roots, computed:", np.round(np.roots(quartic), 6))

grid = np.linspace(-2.5, 2.5, 400)
fig, ax = plt.subplots(figsize=(6, 3))
for label, roots in [("(x-1)(x+1)", [1, -1]), ("(x-1)²(x+1)", [1, 1, -1]), ("(x-1)³(x+1)", [1, 1, 1, -1])]:
    ax.plot(grid, np.polyval(np.poly(roots), grid), label=label)
ax.axhline(0, color="grey", lw=0.8)
ax.set_ylim(-3, 3)
ax.legend(fontsize=8)
plt.show()
```

```output
derivatives at x = 1: [0, 0, 0, 18, 24]
(x - 1)⁴ coefficients: [ 1. -4.  6. -4.  1.]
roots after changing the constant by 1e-10: [1.003162+0.j       1.      +0.003162j 1.      -0.003162j
 0.996838+0.j      ]
predicted spread (1e-10)^(1/4): 0.003162
even the unperturbed roots, computed: [1.000217+0.j       1.      +0.000217j 1.      -0.000217j
 0.999783+0.j      ]
```

At x = 1 the polynomial and its first two derivatives are 0 and the third is 18: multiplicity 3, as built. Lowering (x − 1)⁴ by 10⁻¹⁰ turns its root 1 into 1 ± 0.0032 and 1 ± 0.0032i, a spread of exactly (10⁻¹⁰)^(1/4) ≈ 0.0032, thirty million times the size of the change. Even the unperturbed coefficients, computed in floating point, come back with roots wobbling around 1 in the fourth or fifth decimal place. The plot shows the shapes: a simple root crosses, a double root touches and turns back, a triple root crosses with a flat shoulder.

## Beam deflection: boundary conditions as roots

::: math
\[ \text{simply supported, uniform load: } y(x) = \frac{w\,x\,(L^3 - 2Lx^2 + x^3)}{24EI}, \qquad y_\text{max} = y\Big(\frac{L}{2}\Big) = \frac{5wL^4}{384EI} \]
\[ \text{cantilever, end load: } y(x) = \frac{P\,x^2\,(3L - x)}{6EI}, \qquad y(L) = \frac{PL^3}{3EI} \]
- $w$: load per metre; $P$: point load; $L$: length; $E$: Young's modulus; $I$: the section's second moment of area; $EI$: bending stiffness
- a support (zero deflection) is a root; a clamped end (zero deflection **and** zero slope) is a double root
In code: the deflection polynomials in SymPy, factored, with their maxima from the derivative's roots
:::

Beam theory gives deflection curves as polynomials, and their roots are the physics. A beam resting on supports at both ends has zero deflection at each support, so 0 and L must be roots. Factoring confirms it: x³ − 2Lx² + L³ = (x − L)(x² − Lx − L²). A cantilever is clamped at x = 0, so it cannot move **or** tilt there. Zero deflection and zero slope at the same point means a root of multiplicity 2: the factor x² in its formula. The largest deflection is where the slope is zero, at a root of the derivative inside the beam.

Predict before running: a 4 m steel beam (EI = 1.6 × 10⁶ N·m²) carries 2 kN/m. Where is its largest deflection, and how big? A 2 m cantilever with the same EI carries 1 kN at its tip: how far does the tip drop?

```python type
x, w, L, EI, P = sp.symbols("x w L EI P", positive=True)
simple = w * x * (L ** 3 - 2 * L * x ** 2 + x ** 3) / (24 * EI)
cant = P * x ** 2 * (3 * L - x) / (6 * EI)
print("simply supported, factored:", sp.factor(simple))
print("cantilever, factored:      ", sp.factor(cant), "  -> the x² is the clamped end's double root")
vals = {w: 2000, L: 4, EI: 1.6e6}
crit = [r for r in sp.solve(sp.diff(simple.subs(vals), x), x) if r.is_real and 0 < r < 4]
print(f"simply supported: slope zero at x = {[float(r) for r in crit]} m, deflection {float(simple.subs(vals).subs(x, crit[0])) * 1000:.3f} mm "
      f"(5wL⁴/384EI = {5 * 2000 * 4 ** 4 / (384 * 1.6e6) * 1000:.3f} mm)")
tip = float(cant.subs({P: 1000, L: 2, EI: 1.6e6, x: 2}))
print(f"cantilever: tip deflection {tip * 1000:.3f} mm (PL³/3EI = {1000 * 8 / (3 * 1.6e6) * 1000:.3f} mm); slope at the wall: {sp.diff(cant, x).subs(x, 0)}")
```

```output
simply supported, factored: w*x*(-L + x)*(-L**2 - L*x + x**2)/(24*EI)
cantilever, factored:       -P*x**2*(-3*L + x)/(6*EI)   -> the x² is the clamped end's double root
simply supported: slope zero at x = [2.0] m, deflection 4.167 mm (5wL⁴/384EI = 4.167 mm)
cantilever: tip deflection 1.667 mm (PL³/3EI = 1.667 mm); slope at the wall: 0
```

The simply supported curve factors as w x (x − L)(x² − Lx − L²)/(24EI): roots at both supports, plus two outside the beam with no physical meaning. The derivative vanishes at mid-span, x = 2 m, where the beam sags 4.167 mm, matching the textbook 5wL⁴/(384EI). The cantilever's factor x² is the clamped end: deflection and slope both zero at the wall. Its tip drops 1.667 mm, matching PL³/(3EI). Engineers check these formulas against exactly this kind of factorisation: a missing root means a boundary condition is violated.

## The polynomial through given points

::: math
\[ p(x) = \sum_{i=0}^{n} y_i\,\ell_i(x), \qquad \ell_i(x) = \prod_{j \ne i} \frac{x - x_j}{x_i - x_j} \]
- through $n + 1$ points with different $x$ values there is exactly one polynomial of degree at most $n$
- uniqueness: two such polynomials would differ by a polynomial of degree at most $n$ with $n + 1$ roots, which must be zero
- each Lagrange basis polynomial $\ell_i$ is 1 at $x_i$ and 0 at every other $x_j$
In code: the Lagrange form built with `np.poly1d`, checked against `np.polyfit` with degree $n$
:::

Through two points there is one line; through three, one parabola. In general, through n + 1 points with distinct x values passes exactly one polynomial of degree at most n. Uniqueness follows from the factor theorem. If two such polynomials existed, their difference would have degree at most n but n + 1 roots (all the xᵢ), which only the zero polynomial has. Lagrange's formula constructs the polynomial directly. Each basis polynomial ℓᵢ is built to be 1 at its own point and 0 at all the others, so Σ yᵢℓᵢ passes through every point. This is the exact-fit end of the fitting lessons: least squares with as many coefficients as points.

Predict before running: a cam's follower must be at lifts 0, 2, 7 and 9 mm at angles 0°, 60°, 120° and 180°. What cubic passes through these, and does `np.polyfit` agree?

```python type
xp = np.array([0.0, 60.0, 120.0, 180.0])
yp = np.array([0.0, 2.0, 7.0, 9.0])
poly = np.poly1d([0.0])
for i in range(len(xp)):
    basis = np.poly1d([1.0])
    for j in range(len(xp)):
        if j != i:
            basis *= np.poly1d([1.0, -xp[j]]) / (xp[i] - xp[j])
    poly += yp[i] * basis
print("Lagrange coefficients:", poly.coeffs)
print("np.polyfit, degree 3: ", np.polyfit(xp, yp, 3))
print("values at the points:", poly(xp).round(12), "  at 90°:", round(poly(90.0), 4), "mm")
```

```output
Lagrange coefficients: [-4.62962963e-06  1.25000000e-03 -2.50000000e-02  0.00000000e+00]
np.polyfit, degree 3:  [-4.62962963e-06  1.25000000e-03 -2.50000000e-02  0.00000000e+00]
values at the points: [0. 2. 7. 9.]   at 90°: 4.5 mm
```

The Lagrange construction and `np.polyfit` with degree 3 give the same coefficients, as uniqueness demands, and the cubic passes exactly through all four points. At 90° it predicts a lift of 4.5 mm. Between 0° and about 22° it dips below zero, to −0.13 mm near 11°, a lift the follower cannot have: one more reason cams use piecewise curves. Exact interpolation has a cost the fitting lesson showed: with many points or noisy data, high-degree polynomials swing wildly between the points. That is why cams and fonts use **piecewise** low-degree polynomials (splines) instead, the subject of the piecewise-functions lesson.

::: challenge Horner with a slope, and products [easy]
Write `horner_with_slope(coeffs, x)`: evaluate the polynomial (coefficients highest power first, a list or array) **and its derivative** at the number x in a single pass, with the two-row Horner scheme: start with p = 0 and d = 0, and for each coefficient a set d = d·x + p, then p = p·x + a. Return `(p, d)` as plain floats; do not use `np.polyval` or `np.polyder`. Write `poly_mul(p, q)`: the coefficient list (highest power first) of the product, as plain floats, with your own double loop (no `np.convolve` or `np.polymul`). Raise `ValueError` in both for an empty coefficient list.

```python starter
def horner_with_slope(coeffs, x):
    return (0.0, 0.0)

def poly_mul(p, q):
    return []

print(horner_with_slope([2, -3, 4, -5], 1.5), poly_mul([1, 2, 3], [1, -1]))
```

```python solution
def horner_with_slope(coeffs, x):
    coeffs = list(coeffs)
    if not coeffs:
        raise ValueError("empty polynomial")
    p, d = 0.0, 0.0
    for a in coeffs:
        d = d * x + p
        p = p * x + a
    return float(p), float(d)

def poly_mul(p, q):
    p, q = list(p), list(q)
    if not p or not q:
        raise ValueError("empty polynomial")
    out = [0.0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            out[i + j] += a * b
    return [float(v) for v in out]

print(horner_with_slope([2, -3, 4, -5], 1.5), poly_mul([1, 2, 3], [1, -1]))
```

```python test
import ast
import inspect
import numpy as np
for _n in ["horner_with_slope", "poly_mul"]:
    assert _n in dir(), f"Define {_n}."
try:
    _src = inspect.getsource(horner_with_slope) + inspect.getsource(poly_mul)
    _attrs = {_node.attr for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Attribute)}
    assert not (_attrs & {"polyval", "polyder", "convolve", "polymul"}), "Write the loops yourself."
except (OSError, TypeError):
    pass
assert horner_with_slope([2, -3, 4, -5], 1.5) == (1.0, 8.5), f"p(1.5) = 1 and p'(1.5) = 6(2.25) - 6(1.5) + 4 = 8.5; got {horner_with_slope([2, -3, 4, -5], 1.5)}."
assert all(type(_v) is float for _v in horner_with_slope([1, 0], 3)), "Plain floats."
assert horner_with_slope([7], 100) == (7.0, 0.0) and horner_with_slope(np.array([1.0, 0, 0, 0, 1]), 2) == (17.0, 32.0), "A constant; x⁴ + 1 at 2."
_g = np.random.default_rng(67)
_c = _g.normal(size=8)
_pv, _dv = horner_with_slope(_c, 0.7)
assert abs(_pv - np.polyval(_c, 0.7)) < 1e-12 and abs(_dv - np.polyval(np.polyder(_c), 0.7)) < 1e-12, "Agrees with np.polyval and np.polyder."
assert poly_mul([1, 2, 3], [1, -1]) == [1.0, 1.0, 1.0, -3.0], "(x² + 2x + 3)(x - 1)."
assert poly_mul([2], [3, 4]) == [6.0, 8.0] and poly_mul([1, 1], [1, 1]) == [1.0, 2.0, 1.0], "Constants and (x + 1)²."
_a, _b = _g.normal(size=5), _g.normal(size=3)
assert np.allclose(poly_mul(list(_a), _b), np.polymul(_a, _b)), "Random products."
for _bad in [lambda: horner_with_slope([], 1), lambda: poly_mul([], [1])]:
    try:
        _bad()
        assert False, "An empty polynomial should raise ValueError."
    except ValueError:
        pass
"SUCCESS: One Horner pass carrying a second row gives the value and the slope together, exactly what Newton's method needs."
```

Hint: Update the derivative row first, from the old value: d = d·x + p, then p = p·x + a. Each row is a Horner evaluation, and the second one evaluates the quotient q(x) of p(x) by (x − x₀), whose value at x₀ is p′(x₀).
:::

::: challenge Long division and multiplicity [medium]
Write `poly_divide(p, d)`: polynomial long division of p by d (coefficients highest power first, d's leading coefficient non-zero), returning `(quotient, remainder)` as lists of plain floats. The quotient has len(p) − len(d) + 1 coefficients (or is `[0.0]` if p has lower degree than d), and the remainder has len(d) − 1 coefficients (or `[0.0]` when d is a constant). Raise `ValueError` if d is empty or its leading coefficient is 0. Then write `multiplicity(coeffs, r, tol=1e-9)`: the number of times x − r divides the polynomial, found by dividing by [1, −r] with your `poly_divide` while the remainder's size is at most tol times the largest coefficient size of the polynomial being divided (a relative test, because rounding leaves tiny remainders), as a plain int.

```python starter
def poly_divide(p, d):
    return ([0.0], [0.0])

def multiplicity(coeffs, r, tol=1e-9):
    return 0

print(poly_divide([1, -6, 11, -6], [1, -1]), multiplicity([1, -1, -3, 5, -2], 1))
```

```python solution
def poly_divide(p, d):
    p = [float(a) for a in p]
    d = [float(a) for a in d]
    if not d or d[0] == 0:
        raise ValueError("divisor must have a non-zero leading coefficient")
    if len(p) < len(d):
        return [0.0], p[-(len(d) - 1):] if len(d) > 1 else [0.0]
    rem = p[:]
    quo = []
    for i in range(len(p) - len(d) + 1):
        factor = rem[i] / d[0]
        quo.append(factor)
        for j in range(len(d)):
            rem[i + j] -= factor * d[j]
    tail = rem[len(p) - len(d) + 1:]
    return quo, (tail if tail else [0.0])

def multiplicity(coeffs, r, tol=1e-9):
    p = [float(a) for a in coeffs]
    m = 0
    while len(p) >= 2:
        q, rem = poly_divide(p, [1.0, -r])
        if abs(rem[0]) > tol * max(abs(a) for a in p):
            break
        p, m = q, m + 1
    return m

print(poly_divide([1, -6, 11, -6], [1, -1]), multiplicity([1, -1, -3, 5, -2], 1))
```

```python test
import numpy as np
for _n in ["poly_divide", "multiplicity"]:
    assert _n in dir(), f"Define {_n}."
_quo, _rem = poly_divide([1, -6, 11, -6], [1, -1])
assert _quo == [1.0, -5.0, 6.0] and _rem == [0.0] and all(type(_v) is float for _v in _quo), f"(x³ - 6x² + 11x - 6)/(x - 1) = x² - 5x + 6; got {(_quo, _rem)}."
_g = np.random.default_rng(7)
for _ in range(5):
    _p, _d = _g.normal(size=7), _g.normal(size=3)
    _q1, _r1 = poly_divide(list(_p), _d)
    _q2, _r2 = np.polydiv(_p, _d)
    assert np.allclose(_q1, _q2) and np.allclose(_r1, _r2[-2:] if len(_r2) >= 2 else np.concatenate([[0.0], _r2])), "Matches np.polydiv."
_q3, _r3 = poly_divide([2, -3, 4, -5], [1, -1.5])
assert _r3 == [1.0], "Dividing by (x - r) leaves p(r) as the remainder."
assert poly_divide([1, 2, 3], [2]) == ([0.5, 1.0, 1.5], [0.0]) and poly_divide([1, 2], [1, 0, 1]) == ([0.0], [1.0, 2.0]), "A constant divisor; a lower-degree numerator."
for _bad in [([1, 2], []), ([1, 2], [0, 1])]:
    try:
        poly_divide(*_bad)
        assert False, f"poly_divide{_bad} should raise ValueError."
    except ValueError:
        pass
assert multiplicity([1, -1, -3, 5, -2], 1) == 3 and multiplicity([1, -1, -3, 5, -2], -2) == 1 and multiplicity([1, -1, -3, 5, -2], 2) == 0, "(x - 1)³(x + 2)."
assert multiplicity(list(np.poly([3, 3, 3, 3, 3])), 3) == 5 and type(multiplicity([1, 0], 0)) is int, "(x - 3)⁵; plain int."
assert multiplicity(list(np.poly([0.3, 0.3, -2.0])), 0.3) == 2, "Rounded coefficients leave a remainder near 1e-17, not exactly 0: compare it with the tolerance."
assert multiplicity(list(np.poly([1000.1, 1000.1, 3.0])), 1000.1) == 2, "Large coefficients: the tolerance is relative to the largest coefficient."
"SUCCESS: Long division divides out any factor, and repeated division by (x - r), judged with a relative tolerance, counts a root's multiplicity."
```

Hint: Long division: for each leading position, divide the current leading coefficient by d's, record it, and subtract that multiple of d shifted into place; what is left after the last step is the remainder. For the multiplicity, keep dividing by [1, −r] while the remainder is tiny compared with the coefficients.
:::

::: challenge Interpolation and beams [hard]
Write `interpolate(xs, ys)`: the coefficients (highest power first) of the unique polynomial of degree at most n through the n + 1 points, as exact `Fraction`s (build the Lagrange basis with exact `Fraction` arithmetic from the inputs, which may be ints or Fractions); strip leading zero coefficients but keep at least one; raise `ValueError` if the xs are not distinct or the lengths differ. Then write `simple_beam_max(w, L, EI)`: the largest deflection (metres, plain float) and its position of a simply supported beam with uniform load, y(x) = w x (L³ − 2Lx² + x³)/(24EI), found from the real root of y′(x) inside (0, L) (use `np.roots` on the derivative's coefficients); return `(x_max, y_max)`.

```python starter
from fractions import Fraction
import numpy as np

def interpolate(xs, ys):
    return [Fraction(0)]

def simple_beam_max(w, L, EI):
    return (0.0, 0.0)

print(interpolate([0, 60, 120, 180], [0, 2, 7, 9]), simple_beam_max(2000, 4, 1.6e6))
```

```python solution
from fractions import Fraction
import numpy as np

def _mul(p, q):
    out = [Fraction(0)] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            out[i + j] += a * b
    return out

def interpolate(xs, ys):
    xs = [Fraction(v) for v in xs]
    ys = [Fraction(v) for v in ys]
    if len(xs) != len(ys) or len(set(xs)) != len(xs) or not xs:
        raise ValueError("need matching, distinct x values")
    n = len(xs)
    total = [Fraction(0)] * n
    for i in range(n):
        basis = [Fraction(1)]
        for j in range(n):
            if j != i:
                basis = _mul(basis, [Fraction(1), -xs[j]])
                basis = [c / (xs[i] - xs[j]) for c in basis]
        total = [t + ys[i] * c for t, c in zip(total, basis)]
    while len(total) > 1 and total[0] == 0:
        total = total[1:]
    return total

def simple_beam_max(w, L, EI):
    coeffs = np.array([1.0, -2.0 * L, 0.0, L ** 3, 0.0]) * w / (24 * EI)
    deriv = np.polyder(coeffs)
    inside = [r.real for r in np.roots(deriv) if abs(r.imag) < 1e-9 and 0 < r.real < L]
    x_max = inside[0]
    return float(x_max), float(np.polyval(coeffs, x_max))

print(interpolate([0, 60, 120, 180], [0, 2, 7, 9]), simple_beam_max(2000, 4, 1.6e6))
```

```python test
from fractions import Fraction
import numpy as np
for _n in ["interpolate", "simple_beam_max"]:
    assert _n in dir(), f"Define {_n}."
_c = interpolate([0, 60, 120, 180], [0, 2, 7, 9])
assert all(isinstance(_v, Fraction) for _v in _c) and len(_c) == 4, "Four exact Fraction coefficients."
assert np.allclose([float(_v) for _v in _c], np.polyfit([0, 60, 120, 180], [0, 2, 7, 9], 3)), "Matches np.polyfit of degree 3."
assert sum(_v * Fraction(90) ** (3 - _k) for _k, _v in enumerate(_c)) == Fraction(9, 2), "At 90° the cam lift is exactly 9/2 mm."
assert interpolate([1, 2, 3], [2, 4, 6]) == [Fraction(2), Fraction(0)], "Collinear points give a line (leading zero stripped)."
assert interpolate([5], [7]) == [Fraction(7)] and interpolate([0, 1, 2], [4, 4, 4]) == [Fraction(4)], "A single point; a constant."
assert interpolate([Fraction(1, 2), 1, 2], [0, 0, 3]) == [Fraction(2), Fraction(-3), Fraction(1)], "Fractions in, exact out: 2x² - 3x + 1."
for _bad in [([1, 1, 2], [0, 1, 2]), ([1, 2], [1])]:
    try:
        interpolate(*_bad)
        assert False, f"interpolate{_bad} should raise ValueError."
    except ValueError:
        pass
_xm, _ym = simple_beam_max(2000, 4, 1.6e6)
assert type(_xm) is float and abs(_xm - 2.0) < 1e-9 and abs(_ym - 5 * 2000 * 4 ** 4 / (384 * 1.6e6)) < 1e-12, f"Mid-span, 5wL⁴/384EI; got {(_xm, _ym)}."
_xm2, _ym2 = simple_beam_max(500, 7.5, 3.0e5)
assert abs(_xm2 - 3.75) < 1e-9 and abs(_ym2 - 5 * 500 * 7.5 ** 4 / (384 * 3.0e5)) < 1e-12, "Another span."
"SUCCESS: The polynomial through n + 1 points is unique and Lagrange builds it exactly; a beam's worst deflection sits at a root of its slope."
```

Hint: The basis polynomial for point i is the product of (x − xⱼ)/(xᵢ − xⱼ) over j ≠ i; multiply coefficient lists as in `poly_mul`, but with `Fraction`s. For the beam, the deflection's coefficients are w/(24EI) × [1, −2L, 0, L³, 0] (expand x(L³ − 2Lx² + x³) = x⁴ − 2Lx³ + L³x); `np.polyder` differentiates and `np.roots` finds where the slope is zero.
:::

## What you learned

- A polynomial is its coefficient array; Horner's nested form evaluates it with one multiply-add per coefficient, and products are convolutions of coefficients.
- r is a root exactly when x − r divides the polynomial; synthetic division divides it out and leaves p(r) as remainder; a degree-n polynomial has n complex roots, found by `np.roots` as companion-matrix eigenvalues.
- A root of multiplicity m makes the polynomial and its first m − 1 derivatives vanish; odd multiplicities cross the axis and even ones touch it, and repeated roots shift by about ε^(1/m) under small perturbations.
- Beam deflection curves are polynomials whose roots are the boundary conditions: supports are simple roots, a clamped end is a double root, and the largest deflection is at a root of the slope.
- Exactly one polynomial of degree at most n passes through n + 1 points with distinct x values; Lagrange's basis builds it.

The next lesson divides one polynomial by another: rational functions, their poles and asymptotes, and the responses of lenses and filters.
