# Quadratics in depth

Quadratics have turned up all through the series: the projectile's parabola, the aiming equation, the stopping distance, the stable quadratic formula. This lesson studies the quadratic itself. It comes in three forms, standard, vertex and factored, and each answers a different question at a glance. Completing the square turns one into another and produces the quadratic formula. The coefficients carry the sum and product of the roots. A quadratic fitted to braking tests separates a driver's reaction time from a car's brakes, and one describes the bending moment along a loaded beam. Squaring both sides of an equation can also invent solutions that are not there.

This lesson covers:

- the standard, vertex and factored forms, and converting between them;
- completing the square, the quadratic formula and the discriminant;
- Vieta's formulas: the roots' sum and product from the coefficients;
- fitting a quadratic to braking data, and the bending moment of a beam;
- equations that become quadratics, and the extraneous roots that squaring creates.

## Three forms

::: math
\[ y = ax^2 + bx + c \;=\; a(x - h)^2 + k \;=\; a(x - r_1)(x - r_2), \qquad h = -\frac{b}{2a}, \quad k = c - \frac{b^2}{4a} \]
- standard form: $c$ is where the graph crosses the y axis
- vertex form: $(h, k)$ is the turning point, a minimum if $a > 0$ and a maximum if $a < 0$
- factored form: $r_1$ and $r_2$ are the roots, where $y = 0$ (only when they are real)
In code: `sp.factor`, the vertex `h, k = sp.Rational(-b, 2 * a), c - sp.Rational(b ** 2, 4 * a)`, and `sp.expand` of the vertex form
:::

The same quadratic can be written three ways. The **standard form** ax² + bx + c is the one formulas usually produce. The **vertex form** a(x − h)² + k shows the turning point (h, k) directly: (x − h)² is never negative, so the graph has its lowest point (if a > 0) or highest (if a < 0) at x = h. It is the transformations lesson's shifted and stretched x². The **factored form** a(x − r₁)(x − r₂) shows the roots: the product is zero exactly when one factor is. The parabola is symmetric about the vertical line through its vertex, so the vertex sits exactly halfway between the roots.

Predict before running: for y = 2x² − 8x + 6, where are the vertex and the roots, and is the vertex halfway between the roots?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

x = sp.symbols("x")
a, b, c = 2, -8, 6
standard = a * x ** 2 + b * x + c
h, k = sp.Rational(-b, 2 * a), c - sp.Rational(b ** 2, 4 * a)
print("standard:", standard, "   factored:", sp.factor(standard))
print(f"vertex form: {a}(x - {h})² + ({k})   expands back to:", sp.expand(a * (x - h) ** 2 + k))
roots = sp.solve(standard, x)
print("roots:", roots, "  midpoint of the roots:", sum(roots) / 2, "= h")

xs = np.linspace(-0.5, 4.5, 200)
fig, ax = plt.subplots(figsize=(5, 3.5))
ax.plot(xs, a * xs ** 2 + b * xs + c)
ax.plot([float(h)], [float(k)], "ro", label=f"vertex ({h}, {k})")
ax.plot([float(r) for r in roots], [0, 0], "ks", label="roots")
ax.axhline(0, color="grey", lw=0.8)
ax.legend(fontsize=8)
plt.show()
```

y = 2x² − 8x + 6 factors as 2(x − 1)(x − 3), so the roots are 1 and 3. The vertex form is 2(x − 2)² − 2: the minimum is −2 at x = 2, exactly halfway between the roots. Expanding the vertex form returns the standard form, the check that nothing was lost.

## Completing the square and the discriminant

::: math
\[ ax^2 + bx + c = a\Big(x + \frac{b}{2a}\Big)^2 - \frac{b^2 - 4ac}{4a} \;\Longrightarrow\; x = \frac{-b \pm \sqrt{\Delta}}{2a}, \qquad \Delta = b^2 - 4ac \]
- **completing the square**: $x^2 + px = (x + p/2)^2 - p^2/4$, adding and subtracting what makes a perfect square
- $\Delta > 0$: two real roots; $\Delta = 0$: one repeated root (the vertex touches the axis); $\Delta < 0$: no real roots (complex ones)
In code: `sp.solve` on the general quadratic, and the discriminant's sign for three examples
:::

The vertex form comes from **completing the square**. x² + px is almost a perfect square: (x + p/2)² = x² + px + p²/4, so x² + px = (x + p/2)² − p²/4. Doing this to ax² + bx + c gives the identity above. Setting it to zero and solving for the squared term gives the quadratic formula; it is not a separate fact to memorise. The quantity under the square root, the **discriminant** Δ = b² − 4ac, decides how many real roots there are. Geometrically, it tells whether the vertex lies below the axis, on it, or above it (for a > 0).

Predict before running: how many real roots do x² − 4x + 3, x² − 4x + 4 and x² − 4x + 5 have?

```python
A, B, C = sp.symbols("a b c", nonzero=True)
print("general solution:", sp.solve(A * x ** 2 + B * x + C, x))
for cc in [3, 4, 5]:
    disc = (-4) ** 2 - 4 * 1 * cc
    kind = "two real roots" if disc > 0 else "one repeated root" if disc == 0 else "no real roots"
    print(f"x² - 4x + {cc}: discriminant {disc:>2} -> {kind}: {sp.solve(x ** 2 - 4 * x + cc, x)}")
```

SymPy's general solution is the quadratic formula. The three examples have the same vertex x-position, 2, and only the height changes. With discriminant 4 there are two roots (1 and 3). With 0 the vertex touches the axis, a single repeated root 2. With −4 the parabola floats above the axis and the roots are the complex pair 2 ± i, which the complex-numbers block will make sense of.

## Vieta's formulas

::: math
\[ r_1 + r_2 = -\frac{b}{a}, \qquad r_1 r_2 = \frac{c}{a} \]
- expanding $a(x - r_1)(x - r_2) = a x^2 - a(r_1 + r_2)x + a r_1 r_2$ and matching coefficients gives both
- the product rule is what the stable quadratic formula used: compute the larger root safely, then the smaller as $c/(a\,r_1)$
In code: random quadratics with known roots, rebuilt and checked; a quadratic with a tiny root solved both ways
:::

Expanding the factored form and matching coefficients shows that the roots' sum and product sit in the coefficients: sum −b/a, product c/a. These are **Vieta's formulas**. They check computed roots with no further solving. They build a quadratic with chosen roots. And they give the numerically safe route of the when-numbers-betray-you lesson: compute the root that involves no cancellation, then get the other from the product.

Predict before running: for x² − 10⁸x + 1 = 0, what does the plain formula give for the small root, and what does Vieta's product give?

```python
rng = np.random.default_rng(66)
for _ in range(3):
    r1, r2 = rng.uniform(-5, 5, 2).round(2)
    aa = rng.choice([-3, 2, 5])
    bb, cc = -aa * (r1 + r2), aa * r1 * r2
    print(f"roots {r1:+.2f}, {r2:+.2f}: sum {-bb / aa:+.4f}, product {cc / aa:+.4f}")
bb, cc = -1e8, 1.0
d = math.sqrt(bb * bb - 4 * cc)
big = (-bb + d) / 2
print(f"x² - 1e8 x + 1: plain formula small root {(-bb - d) / 2:.6e}; Vieta c / (a × big root) = {cc / big:.6e}")
```

Each pair's sum and product come back exactly from −b/a and c/a. For x² − 10⁸x + 1 the plain formula subtracts two nearly equal numbers and gives 7.45 × 10⁻⁹ for the small root, 25% wrong. Vieta's product gives 1.000000 × 10⁻⁸, correct, because the large root, 10⁸, involves no cancellation, and the product of the roots must be 1.

## Fitting and using quadratics

::: math
\[ s = t_r\,v + \frac{1}{2d}\,v^2, \qquad M(x) = \frac{w\,x\,(L - x)}{2}, \quad M_\text{max} = M\Big(\frac{L}{2}\Big) = \frac{w L^2}{8} \]
- stopping distance is a quadratic in speed with no constant term: the linear coefficient is the reaction time $t_r$ and the square's coefficient is $1/(2d)$, with $d$ the braking deceleration
- a beam of span $L$ on simple supports with a uniform load $w$ per metre has a quadratic bending moment, largest at mid-span
In code: least squares on the columns $[v, v^2]$ for test-track data; the beam's moment and its vertex
:::

Many physical laws are quadratic, and fitting a quadratic to data then measures the physics. A car's stopping distance is the reaction distance t_r·v plus the braking distance v²/(2d). That is a quadratic in v with no constant term, since at zero speed the car needs no distance. Fitting s against the columns v and v² by least squares separates the two effects: the linear coefficient is the reaction time, and the square's coefficient gives the deceleration.

Structural engineering supplies a second case. A beam resting on two supports and carrying a uniform load w (newtons per metre) has bending moment M(x) = wx(L − x)/2 at distance x from one end. This quadratic has roots at both supports and its vertex at mid-span. So the beam is most stressed in the middle, with moment wL²/8, the formula every structures course starts with.

Predict before running: from test-track data at speeds from 30 to 130 km/h, what reaction time and deceleration does the fit find? And where is a 6 m beam carrying 4 kN/m most heavily loaded?

```python
v_kmh = np.arange(30, 131, 10, dtype=float)
v = v_kmh / 3.6
s_meas = 0.9 * v + v ** 2 / (2 * 7.5) + rng.normal(0, 1.5, v.size)
X = np.column_stack([v, v ** 2])
(lin, quad), *_ = np.linalg.lstsq(X, s_meas, rcond=None)
print(f"fitted reaction time {lin:.2f} s (true 0.9), deceleration {1 / (2 * quad):.2f} m/s² (true 7.5)")
print(f"predicted stopping distance at 100 km/h: {lin * 100 / 3.6 + quad * (100 / 3.6) ** 2:.1f} m")

w, L = 4, 6
xb = sp.symbols("x")
M = w * xb * (L - xb) / 2
x_star = sp.solve(sp.diff(M, xb), xb)[0]
print(f"beam: moment {sp.expand(M)} kN·m, largest at x = {x_star} m: {M.subs(xb, x_star)} kN·m = wL²/8 = {w * L ** 2 / 8}")
```

From eleven noisy runs (1.5 m of scatter each) the fit gives a reaction time of 1.01 s and a deceleration of 7.97 m/s², against the true 0.9 s and 7.5 m/s²: the right size, with the uncertainty that eleven scattered points allow. The two coefficients trade off against each other, a longer reaction time with a harder stop fitting almost as well, so more runs, or runs at very different speeds, sharpen them. It predicts 76.5 m to stop from 100 km/h, more than a third of it covered before the brakes even act. The beam's moment, 12x − 2x², peaks at the mid-span x = 3 m at 18 kN·m, exactly wL²/8. Its vertex is where to check the beam's strength, and the factored form w x (L − x)/2 shows why the moment vanishes at the supports.

## Equations in disguise, and extraneous roots

::: math
\[ x^4 - 5x^2 + 4 = 0 \;\xrightarrow{\;u = x^2\;}\; u^2 - 5u + 4 = 0, \qquad \sqrt{x + 2} = x \;\xrightarrow{\text{square}}\; x + 2 = x^2 \]
- a substitution can turn an equation into a quadratic; each solution $u$ must then be turned back ($x = \pm\sqrt{u}$, only for $u \ge 0$)
- squaring both sides keeps every true solution but can add false ones (**extraneous roots**), because $a^2 = b^2$ also holds when $a = -b$; check each candidate in the original equation
In code: the biquadratic through $u$; the square-root equation solved by squaring, then filtered by substitution
:::

Some equations are quadratics in disguise. x⁴ − 5x² + 4 = 0 involves only x², so the substitution u = x² turns it into u² − 5u + 4 = 0, with u = 1 or 4. Each u then gives x = ±√u, provided u ≥ 0. Equations with a square root are cleared by squaring both sides, a step that needs care. Squaring is not reversible: a² = b² holds when a = b **or** a = −b, so solving the squared equation can produce candidates that satisfy only the second possibility. These **extraneous roots** must be removed by checking every candidate in the original equation.

Predict before running: solve √(x + 2) = x. Squaring gives x² − x − 2 = 0 with roots 2 and −1. Are both solutions?

```python
u = sp.symbols("u")
u_roots = sp.solve(u ** 2 - 5 * u + 4, u)
x_roots = sorted(r for ur in u_roots if ur >= 0 for r in (sp.sqrt(ur), -sp.sqrt(ur)))
print("x⁴ - 5x² + 4 = 0: u =", u_roots, "-> x =", x_roots, "  check:", [r ** 4 - 5 * r ** 2 + 4 for r in x_roots])
candidates = sp.solve(xb ** 2 - xb - 2, xb)
for cand in candidates:
    lhs, rhs = sp.sqrt(cand + 2), cand
    print(f"x = {cand}: sqrt(x + 2) = {lhs}, x = {rhs}  ->  {'solution' if lhs == rhs else 'EXTRANEOUS'}")
```

The biquadratic has four real roots, −2, −1, 1 and 2, and all of them check. For √(x + 2) = x, the candidate 2 works (√4 = 2). The candidate −1 does not: √1 = 1, not −1. It solves √(x + 2) = −x instead, which is what squaring smuggled in. A square root returns only non-negative values, so any candidate making the other side negative is automatically extraneous. Checking by substitution, as in the rearranging lesson, is not optional after squaring.

::: challenge Vertex, roots and Vieta [easy]
Write `vertex(a, b, c)`: the turning point `(h, k)` of ax² + bx + c as plain floats; raise `ValueError` if a = 0. Write `from_roots(r1, r2, a=1.0)`: the standard-form coefficients `(a, b, c)` of a(x − r1)(x − r2) as plain floats. Then write `rectangle(perimeter, area)`: the side lengths of a rectangle with that perimeter and area. They are the roots of x² − (P/2)x + A = 0 (Vieta: their sum is P/2 and their product A); return them as a sorted list of plain floats, a single value for a square, and raise `ValueError` when no such rectangle exists (the discriminant is negative: the area exceeds the square's (P/4)², the vertex of the area function) or an input is not positive.

```python starter
import math

def vertex(a, b, c):
    return (0.0, 0.0)

def from_roots(r1, r2, a=1.0):
    return (a, 0.0, 0.0)

def rectangle(perimeter, area):
    return []

print(vertex(2, -8, 6), from_roots(1, 3, 2), rectangle(20, 21))
```

```python solution
import math

def vertex(a, b, c):
    if a == 0:
        raise ValueError("not a quadratic")
    return float(-b / (2 * a)), float(c - b * b / (4 * a))

def from_roots(r1, r2, a=1.0):
    return float(a), float(-a * (r1 + r2)), float(a * r1 * r2)

def rectangle(perimeter, area):
    if perimeter <= 0 or area <= 0:
        raise ValueError("perimeter and area must be positive")
    half = perimeter / 2
    disc = half * half - 4 * area
    if disc < 0:
        raise ValueError("no rectangle has this perimeter and area")
    if disc == 0:
        return [float(half / 2)]
    r = math.sqrt(disc)
    return sorted([float((half - r) / 2), float((half + r) / 2)])

print(vertex(2, -8, 6), from_roots(1, 3, 2), rectangle(20, 21))
```

```python test
import math
for _n in ["vertex", "from_roots", "rectangle"]:
    assert _n in dir(), f"Define {_n}."
assert vertex(2, -8, 6) == (2.0, -2.0) and vertex(-1, 0, 5) == (0.0, 5.0), "Vertices of 2x² - 8x + 6 and -x² + 5."
assert all(type(_v) is float for _v in vertex(1, 3, 1)), "Plain floats."
try:
    vertex(0, 2, 1)
    assert False, "a = 0 should raise ValueError."
except ValueError:
    pass
assert from_roots(1, 3, 2) == (2.0, -8.0, 6.0) and from_roots(-2, 2) == (1.0, 0.0, -4.0), "Vieta: b = -a(r1 + r2), c = a r1 r2."
assert rectangle(20, 21) == [3.0, 7.0] and all(type(_v) is float for _v in rectangle(20, 21)), "Perimeter 20, area 21: 3 by 7."
assert rectangle(20, 25) == [5.0], "Area (P/4)² exactly: a square, one side length."
_sides = rectangle(30, 50)
assert abs(sum(_sides) - 15) < 1e-12 and abs(_sides[0] * _sides[1] - 50) < 1e-9, "Sum P/2 and product A."
for _bad in [(20, 26), (0, 5), (20, -1)]:
    try:
        rectangle(*_bad)
        assert False, f"rectangle{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The vertex is the square's area, the largest any rectangle with that perimeter can have; Vieta turns perimeter and area into a quadratic."
```

Hint: h = −b/(2a) and k = c − b²/(4a). The rectangle's sides x and y satisfy x + y = P/2 and xy = A, so they are the roots of t² − (P/2)t + A = 0; its discriminant (P/2)² − 4A is negative exactly when A > (P/4)².
:::

::: challenge Fitting quadratics [medium]
Write `fit_stopping(speeds_kmh, distances_m)`: fit s = t_r·v + v²/(2d) (v in m/s, **no constant term**) by least squares on exactly the columns v and v², and return `(t_r, d)`, the reaction time in seconds and the deceleration in m/s², as plain floats. Raise `ValueError` if there are fewer than 2 points, the lengths differ, or the fitted square coefficient is not positive. Inputs may be lists or arrays. Then write `best_operating_point(xs, ys)`: fit a full quadratic y ≈ ax² + bx + c by least squares (for example fuel use against speed) and return its vertex `(x_best, y_best)` as plain floats; raise `ValueError` if the fitted a is not positive (no minimum) or there are fewer than 3 points.

```python starter
import numpy as np

def fit_stopping(speeds_kmh, distances_m):
    return (1.0, 7.0)

def best_operating_point(xs, ys):
    return (0.0, 0.0)

print(best_operating_point([50, 70, 90, 110, 130], [6.9, 5.8, 5.6, 6.2, 7.6]))
```

```python solution
import numpy as np

def fit_stopping(speeds_kmh, distances_m):
    v = np.asarray(speeds_kmh, dtype=float) / 3.6
    s = np.asarray(distances_m, dtype=float)
    if v.size != s.size or v.size < 2:
        raise ValueError("need at least two matching points")
    (lin, quad), *_ = np.linalg.lstsq(np.column_stack([v, v ** 2]), s, rcond=None)
    if quad <= 0:
        raise ValueError("the fitted braking term is not positive")
    return float(lin), float(1 / (2 * quad))

def best_operating_point(xs, ys):
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    if x.size < 3 or x.size != y.size:
        raise ValueError("need at least three matching points")
    a, b, c = np.polyfit(x, y, 2)
    if a <= 0:
        raise ValueError("the fitted parabola opens downwards: no minimum")
    h = -b / (2 * a)
    return float(h), float(c - b * b / (4 * a))

print(best_operating_point([50, 70, 90, 110, 130], [6.9, 5.8, 5.6, 6.2, 7.6]))
```

```python test
import numpy as np
for _n in ["fit_stopping", "best_operating_point"]:
    assert _n in dir(), f"Define {_n}."
_spd = lambda _kmh, _tr, _dec: (_kmh / 3.6) * _tr + (_kmh / 3.6) ** 2 / (2 * _dec)
_v = np.arange(30, 131, 10, dtype=float)
_tr, _d = fit_stopping(list(_v), [_spd(_x, 0.9, 7.5) for _x in _v])
assert type(_tr) is float and abs(_tr - 0.9) < 1e-9 and abs(_d - 7.5) < 1e-9, f"Exact data: (0.9, 7.5); got {(_tr, _d)}."
_vv = np.array([40.0, 80.0, 120.0])
_ss = np.array([_spd(_x, 1.0, 7.0) for _x in _vv]) + np.array([3.0, -2.0, 1.0])
_X = np.column_stack([_vv / 3.6, (_vv / 3.6) ** 2])
(_l, _qq), *_ = np.linalg.lstsq(_X, _ss, rcond=None)
_fit = fit_stopping(_vv, _ss)
assert abs(_fit[0] - _l) < 1e-9 and abs(_fit[1] - 1 / (2 * _qq)) < 1e-9, f"No constant term: least squares on exactly the columns v and v²; got {_fit}."
for _bad in [([50], [30]), ([50, 60], [30]), ([30, 60, 90], [40, 30, 20])]:
    try:
        fit_stopping(*_bad)
        assert False, f"fit_stopping{_bad} should raise ValueError."
    except ValueError:
        pass
_xb, _yb = best_operating_point([1, 2, 3, 4, 5], [9, 4, 1, 0, 1])
assert type(_xb) is float and abs(_xb - 4.0) < 1e-9 and abs(_yb) < 1e-9, "(x - 4)² exactly: vertex (4, 0)."
_g = np.random.default_rng(66)
_sp = np.linspace(50, 130, 17)
_fuel = 0.0012 * (_sp - 85) ** 2 + 5.4 + _g.normal(0, 0.05, _sp.size)
_bx, _by = best_operating_point(_sp, _fuel)
assert abs(_bx - 85) < 3 and abs(_by - 5.4) < 0.1, f"Fuel use: best near 85 km/h at about 5.4; got {(_bx, _by)}."
for _bad in [([1, 2, 3], [1, 2, 1]), ([1, 2], [1, 2])]:
    try:
        best_operating_point(*_bad)
        assert False, f"best_operating_point{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The right columns separate reaction time from braking, and a fitted parabola's vertex is the best operating point."
```

Hint: For the stopping fit use `np.linalg.lstsq(np.column_stack([v, v ** 2]), s, rcond=None)` (no column of ones). For the operating point, `np.polyfit(xs, ys, 2)` gives a, b, c, and the vertex is (−b/(2a), c − b²/(4a)).
:::

::: challenge Disguised quadratics [hard]
Write `solve_biquadratic(a, b, c)`: all real solutions of ax⁴ + bx² + c = 0 via u = x², as a sorted list of plain floats without duplicates (u = 0 gives the single solution 0); raise `ValueError` if a = 0. Then write `solve_sqrt_eq(p, q, m, n)`: all real solutions of √(px + q) = mx + n, found by squaring to px + q = (mx + n)², solving that quadratic (or linear equation, if m = 0), and keeping only candidates that satisfy the original equation to within 1e-9 (the square root must be defined and equal the right side). Return a sorted list of plain floats without duplicates.

```python starter
import math

def solve_biquadratic(a, b, c):
    return []

def solve_sqrt_eq(p, q, m, n):
    return []

print(solve_biquadratic(1, -5, 4), solve_sqrt_eq(1, 2, 1, 0))
```

```python solution
import math

def _quad_roots(a, b, c):
    if a == 0:
        return [] if b == 0 else [-c / b]
    disc = b * b - 4 * a * c
    if disc < 0:
        return []
    r = math.sqrt(disc)
    return [(-b - r) / (2 * a), (-b + r) / (2 * a)]

def solve_biquadratic(a, b, c):
    if a == 0:
        raise ValueError("not a quartic")
    xs = set()
    for u in _quad_roots(a, b, c):
        if u > 0:
            xs.update({math.sqrt(u), -math.sqrt(u)})
        elif u == 0:
            xs.add(0.0)
    return sorted(float(x) for x in xs)

def solve_sqrt_eq(p, q, m, n):
    candidates = _quad_roots(m * m, 2 * m * n - p, n * n - q)
    good = set()
    for x in candidates:
        inside = p * x + q
        if inside < -1e-12:
            continue
        if abs(math.sqrt(max(inside, 0.0)) - (m * x + n)) <= 1e-9:
            good.add(round(float(x), 12))
    return sorted(good)

print(solve_biquadratic(1, -5, 4), solve_sqrt_eq(1, 2, 1, 0))
```

```python test
import math
for _n in ["solve_biquadratic", "solve_sqrt_eq"]:
    assert _n in dir(), f"Define {_n}."
assert solve_biquadratic(1, -5, 4) == [-2.0, -1.0, 1.0, 2.0], f"x⁴ - 5x² + 4: four roots; got {solve_biquadratic(1, -5, 4)}."
assert solve_biquadratic(1, 3, -4) == [-1.0, 1.0], "u = -4 gives no real x; u = 1 gives ±1."
assert solve_biquadratic(1, 0, 0) == [0.0] and solve_biquadratic(1, 2, 5) == [], "A repeated zero; and no real roots."
_r = solve_biquadratic(2, -10, 8)
assert all(type(_v) is float for _v in _r) and _r == [-2.0, -1.0, 1.0, 2.0], "Scaled coefficients; plain floats."
try:
    solve_biquadratic(0, 1, 1)
    assert False, "a = 0 should raise ValueError."
except ValueError:
    pass
assert solve_sqrt_eq(1, 2, 1, 0) == [2.0], f"√(x + 2) = x: 2 only (-1 is extraneous); got {solve_sqrt_eq(1, 2, 1, 0)}."
assert solve_sqrt_eq(1, 2, -1, 0) == [-1.0], "√(x + 2) = -x: now -1 is the solution and 2 is extraneous."
assert solve_sqrt_eq(2, 3, 0, 3) == [3.0], "m = 0: √(2x + 3) = 3 is linear after squaring."
assert solve_sqrt_eq(1, 0, 1, -2) == [4.0], "√x = x - 2: x = 4 (x = 1 is extraneous)."
assert solve_sqrt_eq(1, 1, 0, -1) == [], "√(x + 1) = -1 has no solution."
assert solve_sqrt_eq(4, 0, 1, 0) == [0.0, 4.0], "√(4x) = x: both 0 and 4."
"SUCCESS: Substitution reveals hidden quadratics, and every root of a squared equation must be checked in the original."
```

Hint: For the biquadratic, solve au² + bu + c = 0 and keep u ≥ 0, giving ±√u. For the square root, squaring gives m²x² + (2mn − p)x + (n² − q) = 0; then test each candidate in the original equation, rejecting it if px + q < 0 or √(px + q) differs from mx + n.
:::

## What you learned

- A quadratic has three forms: standard (y-intercept c), vertex a(x − h)² + k (turning point) and factored a(x − r₁)(x − r₂) (roots); the vertex lies halfway between the roots.
- Completing the square produces the vertex form and the quadratic formula; the discriminant b² − 4ac decides between two real roots, one repeated root and none.
- Vieta's formulas, sum −b/a and product c/a, check roots, give the numerically stable way to find a tiny root, and turn questions like a rectangle's sides from its perimeter and area into quadratics.
- Quadratics fitted to data measure physics: stopping distance splits into reaction time and deceleration; a uniformly loaded beam's moment peaks at mid-span at wL²/8.
- Substitutions expose hidden quadratics; squaring both sides can add extraneous roots, so every candidate must be checked in the original equation.

The next lesson goes beyond degree two: polynomials, their roots and factors, and what repeated roots mean for a beam's deflection curve.
