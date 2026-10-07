# Inequalities and tolerances

No manufactured part is exactly its nominal size. A drawing says 25 mm, but the real requirement is an **inequality**: between 25.000 and 25.021 mm. Whether a shaft slides into a hole, presses in tight or sometimes does one and sometimes the other depends on how two such ranges overlap. Speed limits, safety margins and production capacities are inequalities too. This lesson treats them as mathematical objects. It covers the rules for manipulating inequalities, ranges handled with interval arithmetic, quadratic inequalities, and systems of linear inequalities whose solution is a region, the starting point of linear programming.

This lesson covers:

- the rules of inequalities, and why multiplying by a negative number flips them;
- tolerances as intervals, and shaft–hole fits;
- interval arithmetic, and the dependency problem that makes it pessimistic;
- quadratic inequalities: the highest safe speed;
- systems of linear inequalities: a feasible region and its best corner.

## Rules of inequalities

::: math
\[ a < b \;\Longrightarrow\; a + c < b + c, \qquad a < b,\; c > 0 \;\Longrightarrow\; ca < cb, \qquad a < b,\; c < 0 \;\Longrightarrow\; ca > cb \]
- adding the same amount to both sides, or multiplying by a positive number, keeps the direction
- multiplying or dividing by a negative number reverses it; so does taking reciprocals of positive numbers: $0 < a < b \Rightarrow 1/a > 1/b$
- a solution set is usually an **interval**, such as $[2, 5)$: from 2 inclusive to 5 exclusive
In code: a grid of $x$ values tested against $3 - 2x \le 7$ and $-1 < 4 - x \le 2$
:::

An inequality can be manipulated almost like an equation: add or subtract anything on both sides, multiply or divide by a positive number. The exception is multiplying or dividing by a **negative** number, which reverses the direction, because negation mirrors the number line: 2 < 3 but −2 > −3. Solving 3 − 2x ≤ 7 therefore gives −2x ≤ 4 and then x ≥ −2, with the sign flipped. Sets of solutions are **intervals**, written with square brackets for included ends and round ones for excluded ends. Python's chained comparisons, `a < x <= b`, test interval membership directly.

Predict before running: solve 3 − 2x ≤ 7 and −1 < 4 − x ≤ 2 by hand, then check the answers against a brute-force grid.

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

xs = np.linspace(-10, 10, 2001)
first = xs[3 - 2 * xs <= 7]
print(f"3 - 2x <= 7 holds on the grid from {first.min()} to {first.max()}  ->  x >= -2")
second = xs[(-1 < 4 - xs) & (4 - xs <= 2)]
print(f"-1 < 4 - x <= 2 holds from {second.min()} to {second.max():.2f}  ->  2 <= x < 5, the interval [2, 5)")
print("check the ends: x = 2 ->", -1 < 4 - 2 <= 2, "  x = 5 ->", -1 < 4 - 5 <= 2)
print("reciprocals flip too: 2 < 4 but 1/2 > 1/4:", 1 / 2 > 1 / 4)
```

```output
3 - 2x <= 7 holds on the grid from -2.0 to 10.0  ->  x >= -2
-1 < 4 - x <= 2 holds from 2.0 to 4.99  ->  2 <= x < 5, the interval [2, 5)
check the ends: x = 2 -> True   x = 5 -> False
reciprocals flip too: 2 < 4 but 1/2 > 1/4: True
```

The grid confirms x ≥ −2 for the first inequality. For the double inequality, subtracting 4 gives −5 < −x ≤ −2, and multiplying by −1 flips both signs: 2 ≤ x < 5. The grid's largest point, 4.99, sits just inside the excluded end at 5. Checking the end points directly shows which ends belong to the interval.

## Tolerances and fits

::: math
\[ c_\text{min} = H_\text{min} - S_\text{max}, \qquad c_\text{max} = H_\text{max} - S_\text{min} \]
\[ c_\text{min} > 0: \text{clearance}, \qquad c_\text{max} < 0: \text{interference}, \qquad \text{otherwise: transition} \]
- $[H_\text{min}, H_\text{max}]$: the hole's allowed diameters; $[S_\text{min}, S_\text{max}]$: the shaft's; $c$: clearance (hole minus shaft)
- the smallest clearance pairs the smallest hole with the largest shaft
In code: `fit_report(hole, shaft)` for 25 mm H7 holes with g6, k6 and p6 shafts
:::

A shaft in a hole is described by the **clearance**, hole diameter minus shaft diameter. Positive means a gap, negative means the shaft is larger and must be pressed in (interference). With both sizes inside tolerance intervals, the clearance lies in an interval too. The smallest clearance comes from the smallest hole with the largest shaft, the largest from the largest hole with the smallest shaft.

ISO 286 standardises these intervals as letter–number codes. **H7** is the common hole tolerance: for a 25 mm hole, 25.000 to 25.021 mm. Shaft codes then select the kind of fit. **g6** (24.980 to 24.993) always leaves a gap, a sliding fit. **p6** (25.022 to 25.035) always interferes, a press fit. **k6** (25.002 to 25.015) can do either, a transition fit for locating parts.

Predict before running: which of the three shafts gives a clearance fit in an H7 hole, and what is the largest gap?

```python type
def fit_report(hole, shaft):
    c_min = hole[0] - shaft[1]
    c_max = hole[1] - shaft[0]
    kind = "clearance" if c_min > 0 else "interference" if c_max < 0 else "transition"
    return c_min, c_max, kind

hole_H7 = (25.000, 25.021)
for code, shaft in [("g6", (24.980, 24.993)), ("k6", (25.002, 25.015)), ("p6", (25.022, 25.035))]:
    c_min, c_max, kind = fit_report(hole_H7, shaft)
    print(f"H7/{code}: clearance from {c_min * 1000:+.0f} to {c_max * 1000:+.0f} µm  ->  {kind} fit")
```

```output
H7/g6: clearance from +7 to +41 µm  ->  clearance fit
H7/k6: clearance from -15 to +19 µm  ->  transition fit
H7/p6: clearance from -35 to -1 µm  ->  interference fit
```

H7/g6 gives clearances of 7 to 41 µm, a sliding fit, for parts that must move and turn freely yet locate accurately, such as a sliding gear or a pivot pin. H7/p6 gives −35 to −1 µm: every pair interferes, so the parts are pressed together, a light press fit that locates rigidly. Fits that must carry torque by friction alone use tighter shafts, such as s6. H7/k6 runs from −15 to +19 µm: depending on the actual parts, they slide or press, which suits bearings and locating pins that must be positioned accurately but can still be taken apart. Designers choose fits from these intervals, never from the nominal 25 mm.

## Interval arithmetic and its trap

::: math
\[ [a, b] + [c, d] = [a + c,\; b + d], \qquad [a, b] - [c, d] = [a - d,\; b - c], \qquad [a, b] \times [c, d] = [\min P,\; \max P], \;\; P = \{ac, ad, bc, bd\} \]
- each operation returns the tightest interval containing every possible result
- the **dependency problem**: $x - x$ with $x \in [a, b]$ gives $[a - b, b - a]$, not zero, because each occurrence is treated as independent
In code: `add_iv`, `sub_iv` and `mul_iv` on a plate's dimensions, then `sub_iv(x, x)`
:::

The fit calculation is one case of **interval arithmetic**: computing with ranges instead of numbers, so that the answer is guaranteed to contain the true result. Each operation has a formula. Addition adds the lower ends and the upper ends. Subtraction pairs the lower end of one with the upper end of the other. Multiplication takes the extremes of the four end products, which handles negative numbers correctly.

Interval arithmetic is guaranteed, but it can be very pessimistic. If a variable appears more than once, the method does not know the occurrences are the same number. It lets one take its lowest value while the other takes its highest. The classic symptom: x − x comes out as an interval around 0, not 0.

Predict before running: a plate is 200 ± 0.5 by 100 ± 0.3 mm. What range of areas is possible? And what does interval arithmetic say about x − x for x in [9.9, 10.1]?

```python type
def add_iv(p, q):
    return (p[0] + q[0], p[1] + q[1])

def sub_iv(p, q):
    return (p[0] - q[1], p[1] - q[0])

def mul_iv(p, q):
    products = [p[0] * q[0], p[0] * q[1], p[1] * q[0], p[1] * q[1]]
    return (min(products), max(products))

length, width = (199.5, 200.5), (99.7, 100.3)
area = mul_iv(length, width)
print(f"area between {area[0]:.2f} and {area[1]:.2f} mm² (nominal 20,000)")
print("perimeter:", tuple(round(v, 2) for v in mul_iv((2, 2), add_iv(length, width))))
x = (9.9, 10.1)
print("x - x by interval arithmetic:", tuple(round(v, 2) for v in sub_iv(x, x)), " but x - x is exactly 0 for every x")
z = (0.4, 0.6)
print("z * (1 - z) for z in [0.4, 0.6], evaluated as written:", tuple(round(v, 3) for v in mul_iv(z, sub_iv((1, 1), z))),
      " true range: (0.24, 0.25)")
```

```output
area between 19890.15 and 20110.15 mm² (nominal 20,000)
perimeter: (598.4, 601.6)
x - x by interval arithmetic: (-0.2, 0.2)  but x - x is exactly 0 for every x
z * (1 - z) for z in [0.4, 0.6], evaluated as written: (0.16, 0.36)  true range: (0.24, 0.25)
```

The plate's area lies between 19,890.15 and 20,110.15 mm², and its perimeter between 598.4 and 601.6 mm. But x − x, which is exactly zero, comes out as [−0.2, 0.2]. For z(1 − z) with z in [0.4, 0.6] the interval answer is [0.16, 0.36], while the true values only run from 0.24 to 0.25: z appears twice, and each occurrence is allowed to take a different value. The cure is to rewrite formulas so each uncertain variable appears once (z(1 − z) = ¼ − (z − ½)², evaluated with a tight square, gives exactly [0.24, 0.25]), or to split the input interval into small pieces and combine the results. Interval arithmetic is used where guarantees matter more than tightness: verified computing, collision checks, and worst-case tolerance stacks.

## Quadratic inequalities: the highest safe speed

::: math
\[ v\,t_r + \frac{v^2}{2a} \le D \;\Longleftrightarrow\; v^2 + 2a t_r\, v - 2aD \le 0 \;\Longleftrightarrow\; v_1 \le v \le v_2, \qquad v_2 = -a t_r + \sqrt{(a t_r)^2 + 2aD} \]
- a quadratic with positive leading coefficient is negative only between its two roots
- $t_r$: reaction time; $a$: braking deceleration (the motion lesson's $d$); $D$: the distance available; the physical answer is $0 \le v \le v_2$
- $v_1 = -a t_r - \sqrt{(a t_r)^2 + 2aD} < 0$ is the other root, with no physical meaning
In code: `np.roots([1, 2 * a * tr, -2 * a * D])` and a check at speeds just below and above the limit
:::

The stopping distance from the motion lesson, s = v t_r + v²/(2a), must not exceed the distance D that can be seen ahead. That is a **quadratic inequality** in v. Move everything to one side and multiply by 2a (positive, so no flip). The left side is then an upward-opening parabola, negative only between its two roots. The negative root has no physical meaning here, so the allowed speeds run from 0 up to the positive root.

Predict before running: with a 1.5 s reaction time, 6 m/s² braking and 50 m of visibility (fog, or a blind bend), what is the highest safe speed?

```python type
tr, a, D = 1.5, 6.0, 50.0
roots = np.roots([1, 2 * a * tr, -2 * a * D])
v_max = roots.max()
print(f"roots {np.sort(roots).round(3)} m/s; allowed: 0 <= v <= {v_max:.2f} m/s = {v_max * 3.6:.1f} km/h")
for v in [v_max - 0.5, v_max, v_max + 0.5]:
    print(f"  at {v * 3.6:5.1f} km/h the car needs {v * tr + v ** 2 / (2 * a):.2f} m")
print(f"with 100 m of visibility: {(-a * tr + math.sqrt((a * tr) ** 2 + 2 * a * 100)) * 3.6:.1f} km/h")
```

```output
roots [-35.096  17.096] m/s; allowed: 0 <= v <= 17.10 m/s = 61.5 km/h
  at  59.7 km/h the car needs 47.85 m
  at  61.5 km/h the car needs 50.00 m
  at  63.3 km/h the car needs 52.20 m
with 100 m of visibility: 96.4 km/h
```

The roots are −35.10 and 17.10 m/s. The highest safe speed is 17.10 m/s, about 61.5 km/h: just below it the car stops within 50 m, just above it does not. Doubling the visibility to 100 m allows only about 96.4 km/h, not twice the speed, because braking distance grows with v². This is the reasoning behind fog speed limits, and behind the "stop within the distance you can see" rule of driving.

## Systems of linear inequalities

::: math
\[ \max\; 30x + 40y \quad\text{subject to}\quad 2x + y \le 100, \quad x + 3y \le 90, \quad x \ge 0, \quad y \ge 0 \]
- each inequality keeps one side of a line; together they keep a convex polygon, the **feasible region**
- a linear objective is largest at a corner (vertex) of the region: **linear programming**
In code: the vertices from intersecting pairs of boundary lines with `np.linalg.solve`, then `scipy.optimize.linprog`
:::

A workshop makes two parts. Part X needs 2 lathe hours and 1 mill hour, part Y 1 lathe hour and 3 mill hours. This week there are 100 lathe hours and 90 mill hours, and the profits are 30 and 40 per part. Each resource gives a linear inequality. Together with x, y ≥ 0 they cut out a polygon of possible production plans, the **feasible region**. Every inequality keeps a half-plane, and the intersection of half-planes is convex.

The profit is a linear function, so its contour lines are parallel straight lines. Sliding them outwards, the last point of the region they touch is a corner. So the best plan is at a **vertex**, and checking the vertices is enough. This is linear programming, which the optimisation block develops into the simplex method. SciPy's `linprog` solves such problems directly. It minimises, so maximising profit means minimising its negative.

Predict before running: is the best plan to make only X, only Y, or a mix?

```python type
from scipy.optimize import linprog

A = np.array([[2.0, 1.0], [1.0, 3.0], [-1.0, 0.0], [0.0, -1.0]])
b = np.array([100.0, 90.0, 0.0, 0.0])
profit = np.array([30.0, 40.0])
vertices = []
for i in range(len(A)):
    for j in range(i + 1, len(A)):
        M = A[[i, j]]
        if abs(np.linalg.det(M)) < 1e-12:
            continue
        p = np.linalg.solve(M, b[[i, j]])
        if np.all(A @ p <= b + 1e-9):
            vertices.append(p)
for p in sorted(vertices, key=lambda q: profit @ q):
    print(f"vertex ({p[0]:5.1f}, {p[1]:5.1f}): profit {profit @ p:6.0f}")
res = linprog(-profit, A_ub=A[:2], b_ub=b[:2], bounds=[(0, None), (0, None)])
print("linprog:", res.x.round(3), "profit", round(-res.fun, 3))

fig, ax = plt.subplots(figsize=(5, 4))
gx = np.linspace(0, 60, 300)
ax.plot(gx, 100 - 2 * gx, label="lathe: 2x + y = 100")
ax.plot(gx, (90 - gx) / 3, label="mill: x + 3y = 90")
hull = np.array(sorted(vertices, key=lambda q: math.atan2(q[1] - 10, q[0] - 20)))
ax.fill(hull[:, 0], hull[:, 1], alpha=0.25, label="feasible")
ax.set_xlim(0, 60)
ax.set_ylim(0, 40)
ax.set_xlabel("parts X")
ax.set_ylabel("parts Y")
ax.legend(fontsize=8)
plt.show()
```

```output
vertex (  0.0,   0.0): profit      0
vertex (  0.0,  30.0): profit   1200
vertex ( 50.0,   0.0): profit   1500
vertex ( 42.0,  16.0): profit   1900
linprog: [42. 16.] profit 1900.0
```

The feasible region has four corners: (0, 0), (50, 0), (0, 30) and (42, 16). Making only X earns 1,500 and only Y 1,200. The mix of 42 X and 16 Y, where both machines are fully booked, earns 1,900, and `linprog` finds the same plan. The best plan uses every lathe hour and every mill hour, which is typical: at the optimum, the binding constraints are the bottlenecks, and they show which machine to buy more time on.

::: challenge Fits [easy]
Write `fit(hole, shaft)`: `hole` and `shaft` are (min, max) diameter pairs. Return `(c_min, c_max, kind)`: the smallest and largest clearance (hole minus shaft) as plain floats rounded to 6 decimal places, and `kind`, the string "clearance" if c_min > 0, "interference" if c_max < 0, otherwise "transition". Raise `ValueError` if either pair has min > max. Then write `iso_interval(nominal, upper_dev_um, lower_dev_um)`: the (min, max) diameters in mm from a nominal size in mm and the upper and lower deviations in micrometres (for example H7 at 25 mm is `iso_interval(25, 21, 0)`), rounded to 6 decimal places.

```python starter
def fit(hole, shaft):
    return (0.0, 0.0, "transition")

def iso_interval(nominal, upper_dev_um, lower_dev_um):
    return (nominal, nominal)

print(fit((25.000, 25.021), (24.980, 24.993)))
```

```python solution
def fit(hole, shaft):
    if hole[0] > hole[1] or shaft[0] > shaft[1]:
        raise ValueError("each interval needs min <= max")
    c_min = round(float(hole[0] - shaft[1]), 6)
    c_max = round(float(hole[1] - shaft[0]), 6)
    kind = "clearance" if c_min > 0 else "interference" if c_max < 0 else "transition"
    return c_min, c_max, kind

def iso_interval(nominal, upper_dev_um, lower_dev_um):
    return (round(nominal + lower_dev_um / 1000, 6), round(nominal + upper_dev_um / 1000, 6))

print(fit((25.000, 25.021), (24.980, 24.993)))
```

```python test
for _n in ["fit", "iso_interval"]:
    assert _n in dir(), f"Define {_n}."
_H7 = (25.000, 25.021)
assert fit(_H7, (24.980, 24.993)) == (0.007, 0.041, "clearance"), f"H7/g6; got {fit(_H7, (24.980, 24.993))}."
assert fit(_H7, (25.002, 25.015)) == (-0.015, 0.019, "transition"), "H7/k6 is a transition fit."
assert fit(_H7, (25.022, 25.035)) == (-0.035, -0.001, "interference"), "H7/p6 always interferes."
_r = fit((10.0, 10.015), (9.985, 10.0))
assert _r == (0.0, 0.03, "transition") and all(type(_v) is float for _v in _r[:2]), "Zero smallest clearance counts as transition; plain floats."
for _bad in [((25.021, 25.0), (24.98, 24.99)), (_H7, (24.99, 24.98))]:
    try:
        fit(*_bad)
        assert False, f"fit{_bad} should raise ValueError."
    except ValueError:
        pass
assert iso_interval(25, 21, 0) == (25.0, 25.021) and iso_interval(25, -7, -20) == (24.98, 24.993), "H7 and g6 at 25 mm."
assert fit(iso_interval(25, 21, 0), iso_interval(25, 35, 22)) == (-0.035, -0.001, "interference"), "H7/p6 from deviations."
"SUCCESS: A fit is an interval of clearances, from the smallest hole on the largest shaft to the largest hole on the smallest shaft."
```

Hint: The smallest clearance is hole minimum minus shaft maximum; the largest is hole maximum minus shaft minimum. Deviations in µm are divided by 1000 and added to the nominal size.
:::

::: challenge Interval arithmetic [medium]
Represent an interval as a tuple `(lo, hi)` with lo ≤ hi. Write `iadd(p, q)`, `isub(p, q)`, `imul(p, q)` and `idiv(p, q)`, each returning the tightest interval tuple containing every possible result. `idiv` divides by every value of q, which must not contain 0: raise `ValueError` if lo ≤ 0 ≤ hi for q. Then write `ipow(p, n)` for a whole number n ≥ 0, the interval of xⁿ for x in p. It must be **tight**: for example, x² for x in [−2, 3] is [0, 9], not the [−6, 9] that `imul(p, p)` gives. Raise `ValueError` in every function if an input has lo > hi.

```python starter
def iadd(p, q):
    return p

def isub(p, q):
    return p

def imul(p, q):
    return p

def idiv(p, q):
    return p

def ipow(p, n):
    return p

print(imul((199.5, 200.5), (99.7, 100.3)), ipow((-2, 3), 2))
```

```python solution
def _ok(*intervals):
    for lo, hi in intervals:
        if lo > hi:
            raise ValueError("interval needs lo <= hi")

def iadd(p, q):
    _ok(p, q)
    return (p[0] + q[0], p[1] + q[1])

def isub(p, q):
    _ok(p, q)
    return (p[0] - q[1], p[1] - q[0])

def imul(p, q):
    _ok(p, q)
    products = [p[0] * q[0], p[0] * q[1], p[1] * q[0], p[1] * q[1]]
    return (min(products), max(products))

def idiv(p, q):
    _ok(p, q)
    if q[0] <= 0 <= q[1]:
        raise ValueError("cannot divide by an interval containing 0")
    return imul(p, (1 / q[1], 1 / q[0]))

def ipow(p, n):
    _ok(p)
    lo, hi = p
    a, b = lo ** n, hi ** n
    if n % 2 == 0 and lo <= 0 <= hi:
        return (0 if n > 0 else 1, max(a, b))
    return (min(a, b), max(a, b))

print(imul((199.5, 200.5), (99.7, 100.3)), ipow((-2, 3), 2))
```

```python test
for _n in ["iadd", "isub", "imul", "idiv", "ipow"]:
    assert _n in dir(), f"Define {_n}."
assert iadd((1, 2), (10, 20)) == (11, 22) and isub((1, 2), (10, 20)) == (-19, -8), "Sums and differences."
assert isub((9.9, 10.1), (9.9, 10.1)) == (9.9 - 10.1, 10.1 - 9.9), "x - x is not 0 in interval arithmetic."
_a = imul((199.5, 200.5), (99.7, 100.3))
assert abs(_a[0] - 19890.15) < 1e-6 and abs(_a[1] - 20110.15) < 1e-6, f"The plate's area; got {_a}."
assert imul((-2, 3), (-1, 4)) == (-8, 12) and imul((-3, -1), (2, 5)) == (-15, -2), "Signs: take the extremes of the four products."
assert idiv((1, 2), (4, 8)) == (0.125, 0.5) and idiv((-6, 3), (-3, -1)) == (-3.0, 6.0), "Division by intervals that exclude 0."
for _bad in [((1, 2), (-1, 1)), ((1, 2), (0, 3)), ((1, 2), (-2, 0))]:
    try:
        idiv(*_bad)
        assert False, f"idiv{_bad} should raise ValueError: the divisor contains 0."
    except ValueError:
        pass
assert ipow((-2, 3), 2) == (0, 9) and ipow((-3, -2), 2) == (4, 9) and ipow((-2, 3), 3) == (-8, 27), "Tight powers: even powers of an interval through 0 start at 0."
assert ipow((-5, 2), 4) == (0, 625) and ipow((2, 3), 0) == (1, 1) and ipow((-1, 1), 0) == (1, 1), "x^4 and x^0."
for _f in [lambda: iadd((2, 1), (0, 1)), lambda: imul((0, 1), (3, 2)), lambda: ipow((1, 0), 2)]:
    try:
        _f()
        assert False, "An interval with lo > hi should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Interval arithmetic bounds every possible result; tight formulas like the even power avoid the dependency trap."
```

Hint: Subtraction pairs p's low end with q's high end. For multiplication take the min and max of the four end products. Division is multiplication by (1/q_hi, 1/q_lo). For an even power of an interval containing 0, the minimum is 0 and the maximum is the larger of the end powers.
:::

::: challenge Safe speed and the best plan [hard]
Write `max_safe_speed(reaction, decel, distance)`: the largest speed v ≥ 0 (m/s, plain float) with v·reaction + v²/(2·decel) ≤ distance; raise `ValueError` if decel ≤ 0, reaction < 0 or distance < 0. Then write `best_plan(profit, A, b)` for two products: maximise profit·(x, y) subject to A·(x, y) ≤ b (each row of A and entry of b is one constraint) and x, y ≥ 0. Find it by computing every vertex of the feasible region (intersections of pairs of boundary lines, including the axes, that satisfy every constraint to within 1e-9), and return `(x, y, value, binding)` for the vertex with the largest profit: x, y and the profit as plain floats rounded to 6 decimal places, and `binding`, the sorted list of indices of the rows of A (the bottlenecks) that hold with equality at that vertex, |A_i·(x, y) − b_i| < 1e-9. Raise `ValueError` if the feasible region is empty. Do not use `scipy.optimize`. Assume the region is bounded.

```python starter
import math
import numpy as np

def max_safe_speed(reaction, decel, distance):
    return 0.0

def best_plan(profit, A, b):
    return (0.0, 0.0, 0.0)

print(max_safe_speed(1.5, 6.0, 50.0), best_plan([30, 40], [[2, 1], [1, 3]], [100, 90]))
```

```python solution
import math
import numpy as np

def max_safe_speed(reaction, decel, distance):
    if decel <= 0 or reaction < 0 or distance < 0:
        raise ValueError("need decel > 0 and non-negative reaction and distance")
    at = decel * reaction
    return float(-at + math.sqrt(at * at + 2 * decel * distance))

def best_plan(profit, A, b):
    A = np.vstack([np.asarray(A, dtype=float), [[-1.0, 0.0], [0.0, -1.0]]])
    b = np.concatenate([np.asarray(b, dtype=float), [0.0, 0.0]])
    c = np.asarray(profit, dtype=float)
    best = None
    for i in range(len(A)):
        for j in range(i + 1, len(A)):
            M = A[[i, j]]
            if abs(np.linalg.det(M)) < 1e-12:
                continue
            p = np.linalg.solve(M, b[[i, j]])
            if np.all(A @ p <= b + 1e-9):
                value = float(c @ p)
                if best is None or value > best[2]:
                    best = (float(p[0]), float(p[1]), value)
    if best is None:
        raise ValueError("no feasible plan")
    p = np.array(best[:2])
    k = len(b) - 2
    binding = [i for i in range(k) if abs(A[i] @ p - b[i]) < 1e-9]
    return tuple(round(v, 6) + 0.0 for v in best) + (binding,)

print(max_safe_speed(1.5, 6.0, 50.0), best_plan([30, 40], [[2, 1], [1, 3]], [100, 90]))
```

```python test
import ast
import inspect
import math
for _n in ["max_safe_speed", "best_plan"]:
    assert _n in dir(), f"Define {_n}."
_v = max_safe_speed(1.5, 6.0, 50.0)
assert type(_v) is float and abs(_v - 17.0961) < 1e-3, f"50 m of visibility: about 17.10 m/s; got {_v}."
assert abs(_v * 1.5 + _v ** 2 / 12 - 50) < 1e-9, "At the limit the stopping distance equals the distance available."
assert abs(max_safe_speed(0.0, 5.0, 40.0) - 20.0) < 1e-12 and max_safe_speed(1.0, 5.0, 0.0) == 0.0, "No reaction time: sqrt(2aD); no distance: 0."
for _bad in [(1.0, 0.0, 10.0), (-1.0, 5.0, 10.0), (1.0, 5.0, -1.0)]:
    try:
        max_safe_speed(*_bad)
        assert False, f"max_safe_speed{_bad} should raise ValueError."
    except ValueError:
        pass
try:
    _src = inspect.getsource(best_plan)
    _mods = {_node.attr for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Attribute)} | {_node.id for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Name)}
    assert "linprog" not in _mods and "optimize" not in _mods, "Find the vertices yourself, without scipy.optimize."
except (OSError, TypeError):
    pass
_p = best_plan([30, 40], [[2, 1], [1, 3]], [100, 90])
assert _p == (42.0, 16.0, 1900.0, [0, 1]) and all(type(_v) is float for _v in _p[:3]), f"The workshop: (42, 16) earns 1900, both machines binding; got {_p}."
assert best_plan([30, 5], [[2, 1], [1, 3]], [100, 90]) == (50.0, 0.0, 1500.0, [0]), "A cheap Y: make only X; only the lathe is a bottleneck."
assert best_plan([1, 10], [[2, 1], [1, 3]], [100, 90]) == (0.0, 30.0, 300.0, [1]), "A valuable Y: make only Y; only the mill binds."
assert best_plan([3, 2], [[1, 1], [1, 0], [0, 1]], [4, 3, 3]) == (3.0, 1.0, 11.0, [0, 1]), "Three constraints, two binding."
try:
    best_plan([1, 1], [[1, 1], [-1, -1]], [2, -5])
    assert False, "x + y <= 2 and x + y >= 5 cannot both hold: ValueError."
except ValueError:
    pass
"SUCCESS: A quadratic inequality gives the safe speed between its roots, and a linear objective peaks at a corner of the feasible polygon."
```

Hint: The safe speed is the positive root of v² + 2a·t_r·v − 2aD = 0. For the plan, add the rows −x ≤ 0 and −y ≤ 0 to the constraints, solve every pair of rows as equations (skip parallel pairs), keep the points that satisfy all rows, and pick the one with the largest profit. Then test each original row of A at that point to find the binding ones.
:::

## What you learned

- Inequalities survive adding and multiplying by positive numbers; multiplying by a negative number (or taking reciprocals of positives) reverses them, and solutions are intervals.
- A fit's clearance is an interval from the smallest hole minus the largest shaft to the largest hole minus the smallest shaft; its sign pattern decides clearance, transition or interference fits such as H7/g6, H7/k6 and H7/p6.
- Interval arithmetic gives guaranteed bounds for sums, differences, products and quotients, but over-estimates when a variable appears more than once (the dependency problem).
- A quadratic inequality with positive leading coefficient holds between its roots: the highest safe speed is the positive root of the stopping-distance equation.
- Linear inequalities cut out a convex feasible region, and a linear objective is maximised at one of its vertices: the core idea of linear programming.

The next lesson looks at the absolute value, the mathematics of "how far from nominal", and the error bands built from it.
