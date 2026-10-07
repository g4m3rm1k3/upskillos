# Systems of nonlinear equations

Where does a circular cut cross a parabolic profile? Where is a receiver, given its distances to three beacons? At what angle does the output link of a mechanism sit when the input crank is at 40°? Each question asks for numbers that satisfy several equations at once, and the equations involve squares, square roots and trigonometric functions. These are **systems of nonlinear equations**. Unlike the linear systems of the matrices lesson, they can have no solution, one, several or infinitely many, and there is no general formula. This lesson solves them by every route that works: reading intersections off a plot, eliminating variables exactly, subtracting equations to make them linear, and Newton's method, whose answer depends on where it starts. It finishes with the four-bar linkage, the mechanism inside car wipers, pumps and excavators.

This lesson covers:

- solutions as intersections of curves, and counting them from a plot;
- exact elimination with SymPy, and discarding complex solutions;
- trilateration: subtracting equations to get a linear system;
- Newton's method for systems, and the basins of its solutions;
- loop-closure equations of a four-bar linkage, and its two assembly modes.

## Solutions are intersections

::: math
\[ f(x, y) = 0, \;\; g(x, y) = 0 \qquad \text{e.g.} \qquad x^2 + y^2 = 25, \;\; y = x^2 - 6 \]
- each equation in two unknowns is a curve in the plane (its zero contour); the solutions are where the curves cross
- a plot of both zero contours shows how many solutions there are and roughly where, before any solving
In code: `ax.contour(X, Y, F, levels=[0])` for each equation; a sign scan along the parabola to count crossings
:::

Each equation in two unknowns describes a curve: the points where it holds. A system of two such equations asks for the points on **both** curves, their intersections. The linear case had straight lines, crossing once, never or everywhere. Curves can cross many times. So the first step with any nonlinear system is to plot the zero contour of each equation, the contour lesson's picture at level 0, and count the crossings. That tells you how many solutions to look for, and gives starting guesses for numerical methods.

Predict before running: the parabola y = x² − 6 has its lowest point at (0, −6), outside the circle x² + y² = 25. How many times does it cross the circle? And y = x² − 4, whose lowest point is inside?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp
from scipy.optimize import fsolve

gx = np.linspace(-6.5, 6.5, 651)
X, Y = np.meshgrid(gx, gx)
fig, ax = plt.subplots(figsize=(4.5, 4.5))
ax.contour(X, Y, X ** 2 + Y ** 2 - 25, levels=[0], colors="tab:blue")
ax.contour(X, Y, Y - (X ** 2 - 6), levels=[0], colors="tab:orange")
ax.contour(X, Y, Y - (X ** 2 - 4), levels=[0], colors="tab:green", linestyles="dashed")
ax.set_aspect("equal")
ax.set_title("circle, y = x² - 6 (solid), y = x² - 4 (dashed)", fontsize=9)
plt.show()

xs = np.linspace(-4, 4, 80001)
for shift in [6, 4]:
    along = xs ** 2 + (xs ** 2 - shift) ** 2 - 25
    crossings = xs[1:][np.diff(np.sign(along)) != 0]
    print(f"y = x² - {shift}: the circle equation changes sign along the parabola at x ≈ {np.round(crossings, 4)}")
```

```output
y = x² - 6: the circle equation changes sign along the parabola at x ≈ [-3.1444 -1.0547  1.0548  3.1445]
y = x² - 4: the circle equation changes sign along the parabola at x ≈ [-2.8477  2.8478]
```

The parabola y = x² − 6 starts below the circle, enters it, and leaves again on each side: four crossings, at x ≈ ±1.055 and ±3.144. The parabola y = x² − 4 starts **inside** the circle and only leaves it, once on each side: two crossings, at x ≈ ±2.848. Walking along each parabola and watching the sign of x² + y² − 25 counts the crossings without solving anything.

## Exact elimination

::: math
\[ x^2 + (x^2 - 6)^2 = 25 \;\Longrightarrow\; x^4 - 11x^2 + 11 = 0 \;\Longrightarrow\; x^2 = \frac{11 \pm \sqrt{77}}{2} \]
- **elimination**: substitute one equation into the other, leaving a single equation in one unknown
- here the result is a quadratic in $x^2$ (the quadratics lesson's biquadratic); each positive value of $x^2$ gives two real $x$
- for $y = x^2 - 4$ the same step gives $x^4 - 7x^2 - 9 = 0$, with one positive and one negative value of $x^2$: only two real solutions, two complex ones
In code: `sp.solve([eq1, eq2], [x, y])` for both systems; the real solutions kept
:::

When one equation gives a variable directly, substituting it into the other **eliminates** that variable. Here y = x² − 6 turns the circle into x⁴ − 11x² + 11 = 0, a quadratic in x² with two positive roots, so there are four real x. With y = x² − 4 the same step gives x⁴ − 7x² − 9 = 0. One root for x² is negative, and its x values are imaginary. SymPy's `solve` does elimination for polynomial systems automatically and returns every solution, real and complex. Applications then keep the real ones.

Predict before running: for each system, how many solutions does SymPy return, and how many are real?

```python type
x, y = sp.symbols("x y")

def real_solutions(eqs):
    out, total = [], 0
    for sx, sy in sp.solve(eqs, [x, y]):
        total += 1
        zx, zy = complex(sp.N(sx)), complex(sp.N(sy))
        if abs(zx.imag) < 1e-12 and abs(zy.imag) < 1e-12:
            out.append((round(zx.real, 4), round(zy.real, 4)))
    return total, sorted(out)

for shift in [6, 4]:
    total, real = real_solutions([x ** 2 + y ** 2 - 25, y - (x ** 2 - shift)])
    print(f"y = x² - {shift}: {total} solutions in all, {len(real)} real: {real}")
print("x² values for the second system:", np.roots([1, -7, -9]).round(4))
```

```output
y = x² - 6: 4 solutions in all, 4 real: [(-3.1444, 3.8875), (-1.0548, -4.8875), (1.0548, -4.8875), (3.1444, 3.8875)]
y = x² - 4: 4 solutions in all, 2 real: [(-2.8478, 4.1098), (2.8478, 4.1098)]
x² values for the second system: [ 8.1098 -1.1098]
```

For y = x² − 6 SymPy finds four solutions, all real, at (±1.0548, −4.8875) and (±3.1444, 3.8875), matching the plot. For y = x² − 4 it also finds four, but only two are real, (±2.8478, 4.1098). The other two have x = ±1.0535i, from x² = −1.1098. Algebra always delivers the full count of solutions a polynomial system has; geometry shows which of them are real.

## Trilateration: making it linear

::: math
\[ (x - x_i)^2 + (y - y_i)^2 = d_i^2 \;\;(i = 1, 2, 3) \;\Longrightarrow\; 2(x_i - x_1)\,x + 2(y_i - y_1)\,y = d_1^2 - d_i^2 + x_i^2 - x_1^2 + y_i^2 - y_1^2 \]
- $(x_i, y_i)$: beacon positions; $d_i$: measured distances to the unknown point $(x, y)$
- subtracting the first circle's equation from the others cancels $x^2 + y^2$, leaving **linear** equations
- with more beacons than needed and noisy distances, least squares solves the linear system (the fitting-a-line lesson's tool)
In code: four beacons in a workshop, exact and noisy distances, `np.linalg.lstsq` on the subtracted equations
:::

Finding a position from measured distances, **trilateration**, is how GPS, ultra-wideband indoor tracking and laser trackers locate things. Each distance puts the point on a circle (a sphere in 3D) around a beacon, so the position is the intersection of several circles. That is a nonlinear system. But every circle equation contains the same x² + y², so subtracting one from the others cancels the squares. What is left is a set of **linear** equations in x and y. With more beacons than unknowns and noisy distances, least squares finds the best compromise. This is a common trick: find a combination of the equations in which the nonlinearity cancels.

Predict before running: a tag sits at (12.0, 7.5) m among four beacons. With distances measured to ±5 cm, how close is the trilaterated position?

```python type
beacons = np.array([[0.0, 0.0], [30.0, 0.0], [30.0, 20.0], [0.0, 20.0]])
true_pos = np.array([12.0, 7.5])
rng = np.random.default_rng(75)

def locate(beacons, d):
    x1, y1 = beacons[0]
    A = 2 * (beacons[1:] - beacons[0])
    b = d[0] ** 2 - d[1:] ** 2 + (beacons[1:] ** 2).sum(axis=1) - x1 ** 2 - y1 ** 2
    pos, *_ = np.linalg.lstsq(A, b, rcond=None)
    return pos

exact_d = np.linalg.norm(beacons - true_pos, axis=1)
print("exact distances:", exact_d.round(4), "-> position", locate(beacons, exact_d).round(10))
errors = []
for _ in range(2000):
    noisy = exact_d + rng.normal(0, 0.05, exact_d.size)
    errors.append(np.linalg.norm(locate(beacons, noisy) - true_pos))
print(f"with ±5 cm distance noise: typical position error {np.median(errors) * 100:.1f} cm, 95% within {np.percentile(errors, 95) * 100:.1f} cm")
```

```output
exact distances: [14.151  19.5    21.9146 17.3277] -> position [12.   7.5]
with ±5 cm distance noise: typical position error 4.5 cm, 95% within 9.4 cm
```

With exact distances the subtracted linear system returns (12.0, 7.5) exactly. With 5 cm of noise on each distance, the position is typically within about 4.5 cm and 95% of the time within about 9 cm. Four beacons spread around the room give good geometry; beacons nearly in a line would make the linear system ill-conditioned (the two-equation lesson's warning), and the errors would grow sharply in one direction.

## Newton's method for systems

::: math
\[ J(\mathbf{x}_k)\,\Delta\mathbf{x} = -\mathbf{F}(\mathbf{x}_k), \qquad \mathbf{x}_{k+1} = \mathbf{x}_k + \Delta\mathbf{x}, \qquad J_{ij} = \frac{\partial F_i}{\partial x_j} \]
- each step replaces the curves by their tangent lines (planes) and solves that linear system: the Jacobian lesson's inverse kinematics, in general form
- near a solution it converges quadratically; which solution it finds depends on the start: each solution has a **basin** of starting points
- `scipy.optimize.fsolve` implements a robust version (with a numerical Jacobian when none is given)
In code: `fsolve` from many starting points on the circle–parabola system; the share of starts reaching each of the four solutions
:::

The general tool is Newton's method in several variables, already met in the Jacobian lesson for a robot arm. Replace each equation by its linear approximation at the current guess, solve the resulting linear system with the Jacobian, and step. It converges very fast near a solution. A system with several solutions, though, raises a question a single equation hardly does: **which** solution? Each solution attracts a **basin** of starting points, and the boundaries between basins can be intricate. SciPy's `fsolve` wraps a robust Newton-type method and needs only the function.

Predict before running: starting `fsolve` from a grid of 2,500 points around the circle–parabola system (y = x² − 6), how are the starts shared among the four solutions?

```python type
def F(v):
    return [v[0] ** 2 + v[1] ** 2 - 25, v[1] - (v[0] ** 2 - 6)]

xa, xb = math.sqrt((11 + math.sqrt(77)) / 2), math.sqrt((11 - math.sqrt(77)) / 2)
targets = np.array([[-xa, xa ** 2 - 6], [-xb, xb ** 2 - 6], [xb, xb ** 2 - 6], [xa, xa ** 2 - 6]])
counts = np.zeros(5, dtype=int)
starts = np.linspace(-6, 6, 50)
for sx in starts:
    for sy in starts:
        sol, info, ier, _ = fsolve(F, [sx, sy], full_output=True)
        if ier == 1:
            dist = np.linalg.norm(targets - sol, axis=1)
            counts[int(np.argmin(dist)) if dist.min() < 1e-3 else 4] += 1
        else:
            counts[4] += 1
for (tx, ty), c in zip(targets, counts[:4]):
    print(f"solution ({tx:+.4f}, {ty:+.4f}): {c} starts ({c / 25:.0f}%)")
print(f"did not converge: {counts[4]}")
print("one run from (2, 2):", np.round(fsolve(F, [2, 2]), 6))
```

```output
solution (-3.1444, +3.8875): 709 starts (28%)
solution (-1.0548, -4.8875): 537 starts (21%)
solution (+1.0548, -4.8875): 537 starts (21%)
solution (+3.1444, +3.8875): 709 starts (28%)
did not converge: 8
one run from (2, 2): [3.144437 3.887482]
```

All but 8 of the 2,500 starts converge (`fsolve` gives up on a few that land where the Jacobian is nearly singular), and the four solutions share the grid unevenly: 28% each for the two upper solutions and 21% each for the lower pair, split symmetrically left and right. A start at (2, 2) goes to (3.1444, 3.8875). To find **all** solutions numerically, start from many points, as here, or use the plot to place one start near each crossing. A single run finds one solution and says nothing about the others.

## A four-bar linkage

::: math
\[ \mathbf{B} = a\,(\cos\theta_2, \sin\theta_2), \qquad |\mathbf{C} - \mathbf{B}| = b, \qquad |\mathbf{C} - \mathbf{O}_4| = c, \qquad \mathbf{O}_4 = (d, 0) \]
- $a$: input crank; $b$: coupler; $c$: output rocker; $d$: fixed ground link between the two pivots; $\theta_2$: crank angle
- the joint $\mathbf{C}$ is an intersection of two circles: two solutions, the linkage's two **assembly modes** (open and crossed)
- the output angle $\theta_4$ follows from $\mathbf{C}$; Grashof's condition $s + l \le p + q$ (shortest plus longest at most the other two) decides whether the crank can turn fully
In code: `rocker_angle(theta2, branch)` intersecting the circles; the output swing over a full turn of the crank
:::

A **four-bar linkage** has four rigid links joined in a loop: the fixed ground, an input crank, a coupler and an output rocker. Turning the crank swings the rocker back and forth, and the shape of that motion is set by the four lengths. Windscreen wipers, pump jacks, bicycle suspensions and excavator arms are all four-bars. For a given crank angle the crank's tip B is known, and the joint C must be a distance b from B and c from the rocker's pivot: the intersection of two circles, the same calculation as trilateration with two beacons. Two circles meet in two points, giving the two ways the linkage can be assembled. If they do not meet, the linkage cannot reach that crank angle at all.

**Grashof's condition** says when the crank can turn a full circle. The shortest link plus the longest must not exceed the other two together, and the shortest must be the crank.

Predict before running: with a = 20, b = 70, c = 50 and d = 60 mm, can the crank turn fully, and through what angle does the rocker swing?

```python type
a, b, c, d = 20.0, 70.0, 50.0, 60.0
lengths = sorted([a, b, c, d])
print(f"Grashof: shortest + longest = {lengths[0] + lengths[3]:.0f} <= other two = {lengths[1] + lengths[2]:.0f}: {lengths[0] + lengths[3] <= lengths[1] + lengths[2]}; the crank is the shortest link")

def rocker_angle(theta2, branch=1):
    B = np.array([a * math.cos(theta2), a * math.sin(theta2)])
    O4 = np.array([d, 0.0])
    gap = np.linalg.norm(O4 - B)
    if gap > b + c or gap < abs(b - c):
        return None
    along = (b ** 2 - c ** 2 + gap ** 2) / (2 * gap)
    h = math.sqrt(max(b ** 2 - along ** 2, 0.0))
    u = (O4 - B) / gap
    C = B + along * u + branch * h * np.array([-u[1], u[0]])
    return math.atan2(C[1] - O4[1], C[0] - O4[0])

crank = np.radians(np.arange(0, 360, 1.0))
open_mode = np.array([rocker_angle(t, 1) for t in crank])
crossed = np.array([rocker_angle(t, -1) for t in crank])
swing = np.degrees(open_mode.max() - open_mode.min())
print(f"open assembly: rocker swings between {np.degrees(open_mode.min()):.1f}° and {np.degrees(open_mode.max()):.1f}°, a swing of {swing:.1f}°")
print(f"crossed assembly at a crank angle of 40°: rocker at {np.degrees(crossed[40]):.1f}° (open: {np.degrees(open_mode[40]):.1f}°)")

def loop(v, theta2):
    t3, t4 = v
    return [a * math.cos(theta2) + b * math.cos(t3) - d - c * math.cos(t4),
            a * math.sin(theta2) + b * math.sin(t3) - c * math.sin(t4)]
t3, t4 = fsolve(loop, [0.5, open_mode[40]], args=(math.radians(40),))
print(f"loop-closure equations solved with fsolve at 40°: rocker {math.degrees(t4):.1f}°, coupler {math.degrees(t3):.1f}°")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(np.degrees(crank), np.degrees(open_mode), label="open assembly")
ax.plot(np.degrees(crank), np.degrees(crossed), label="crossed assembly")
ax.set_xlabel("crank angle (°)")
ax.set_ylabel("rocker angle (°)")
ax.legend(fontsize=8)
plt.show()
```

```output
Grashof: shortest + longest = 90 <= other two = 110: True; the crank is the shortest link
open assembly: rocker swings between 70.5° and 126.9°, a swing of 56.3°
crossed assembly at a crank angle of 40°: rocker at -103.1° (open: 71.0°)
loop-closure equations solved with fsolve at 40°: rocker 71.0°, coupler 29.5°
```

The lengths 20, 50, 60 and 70 satisfy Grashof's condition (20 + 70 ≤ 50 + 60) with the crank shortest, so the crank turns fully and the rocker rocks back and forth. In the open assembly the rocker swings through about 56°, between 70.5° and 126.9°. The crossed assembly puts the rocker at a completely different angle for the same crank position: the same lengths, a different machine. Solving the loop-closure equations directly with `fsolve`, starting near the open solution, gives the same rocker angle as the circle intersection. A linkage cannot switch assembly mode while moving, so a simulation that follows the motion must keep choosing the solution nearest the previous one.

::: challenge Intersecting circles and lines [easy]
Write `circle_line(cx, cy, r, a, b, c)`: the intersection points of the circle (x − cx)² + (y − cy)² = r² with the line ax + by = c (a and b not both zero), as a list of `(x, y)` tuples of plain floats: two points, one (tangent, when the distance from the centre to the line equals r within 1e-12 × r), or none. Raise `ValueError` if r ≤ 0 or a = b = 0. Then write `circle_circle(c1, r1, c2, r2)`: the intersection points of two circles with centres c1, c2 (pairs) and radii r1, r2, as a list of 0, 1 or 2 tuples; raise `ValueError` for identical circles (infinitely many points) or non-positive radii.

```python starter
import math

def circle_line(cx, cy, r, a, b, c):
    return []

def circle_circle(c1, r1, c2, r2):
    return []

print(circle_line(0, 0, 5, 1, -1, 1), circle_circle((0, 0), 5, (8, 0), 5))
```

```python solution
import math

def circle_line(cx, cy, r, a, b, c):
    if r <= 0 or (a == 0 and b == 0):
        raise ValueError("need r > 0 and a line")
    norm = math.hypot(a, b)
    dist = (a * cx + b * cy - c) / norm
    if abs(dist) > r * (1 + 1e-12):
        return []
    fx, fy = cx - a * dist / norm, cy - b * dist / norm
    half = math.sqrt(max(r * r - dist * dist, 0.0))
    if half <= 1e-12 * r:
        return [(float(fx), float(fy))]
    tx, ty = -b / norm, a / norm
    return [(float(fx + half * tx), float(fy + half * ty)), (float(fx - half * tx), float(fy - half * ty))]

def circle_circle(c1, r1, c2, r2):
    if r1 <= 0 or r2 <= 0:
        raise ValueError("radii must be positive")
    (x1, y1), (x2, y2) = c1, c2
    gap = math.hypot(x2 - x1, y2 - y1)
    if gap == 0:
        if r1 == r2:
            raise ValueError("identical circles meet everywhere")
        return []
    a = 2 * (x2 - x1)
    b = 2 * (y2 - y1)
    c = r1 ** 2 - r2 ** 2 + x2 ** 2 - x1 ** 2 + y2 ** 2 - y1 ** 2
    return circle_line(x1, y1, r1, a, b, c)

print(circle_line(0, 0, 5, 1, -1, 1), circle_circle((0, 0), 5, (8, 0), 5))
```

```python test
import math
for _n in ["circle_line", "circle_circle"]:
    assert _n in dir(), f"Define {_n}."
_pts = circle_line(0, 0, 5, 1, -1, 1)
assert len(_pts) == 2 and all(type(_v) is float for _p in _pts for _v in _p), "Two crossings, as tuples of plain floats."
assert sorted((round(_p[0], 9), round(_p[1], 9)) for _p in _pts) == [(-3.0, -4.0), (4.0, 3.0)], f"x - y = 1 meets the circle at (4, 3) and (-3, -4); got {_pts}."
_t = circle_line(0, 0, 5, 0, 1, 5)
assert len(_t) == 1 and abs(_t[0][0]) < 1e-9 and abs(_t[0][1] - 5) < 1e-9, "y = 5 touches the top: one point."
assert circle_line(0, 0, 5, 0, 1, 6) == [] and circle_line(2, 3, 1, 1, 0, 2.5) != [], "A miss; an off-centre circle."
for _bad in [(0, 0, 0, 1, 1, 1), (0, 0, 5, 0, 0, 1)]:
    try:
        circle_line(*_bad)
        assert False, f"circle_line{_bad} should raise ValueError."
    except ValueError:
        pass
_cc = circle_circle((0, 0), 5, (8, 0), 5)
assert sorted((round(_p[0], 9), round(_p[1], 9)) for _p in _cc) == [(4.0, -3.0), (4.0, 3.0)], f"Two circles of radius 5, 8 apart: (4, ±3); got {_cc}."
assert len(circle_circle((0, 0), 3, (5, 0), 2)) == 1 and circle_circle((0, 0), 1, (5, 0), 1) == [] and circle_circle((0, 0), 5, (1, 0), 1) == [], "Touching; apart; one inside the other."
for _bad in [((0, 0), 2, (0, 0), 2), ((0, 0), -1, (3, 0), 2)]:
    try:
        circle_circle(*_bad)
        assert False, f"circle_circle{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Subtracting two circle equations leaves a line, so two circles meet where that line crosses either of them."
```

Hint: The foot of the perpendicular from the centre to the line is the centre minus (signed distance) × the unit normal (a, b)/|(a, b)|; the crossings are a further ±√(r² − distance²) along the line's direction (−b, a)/|(a, b)|. For two circles, subtracting their equations gives the line 2(x₂ − x₁)x + 2(y₂ − y₁)y = r₁² − r₂² + x₂² − x₁² + y₂² − y₁².
:::

::: challenge Trilateration [medium]
Write `trilaterate(beacons, distances)`: given n ≥ 3 beacon positions (a list or array of (x, y) pairs) and measured distances, subtract the first circle's equation from the others to get the linear system 2(xᵢ − x₁)x + 2(yᵢ − y₁)y = d₁² − dᵢ² + xᵢ² − x₁² + yᵢ² − y₁², solve it by least squares, and return the position as a tuple of plain floats. Raise `ValueError` for fewer than 3 beacons, mismatched lengths, or beacons all on one straight line (the linear system's matrix has rank below 2). Then write `residuals(beacons, distances, position)`: the array of differences between each beacon's distance to `position` and its measured distance.

```python starter
import numpy as np

def trilaterate(beacons, distances):
    return (0.0, 0.0)

def residuals(beacons, distances, position):
    return np.zeros(len(distances))

B = [(0, 0), (30, 0), (30, 20), (0, 20)]
print(trilaterate(B, [14.4, 19.5, 21.4, 16.3]))
```

```python solution
import numpy as np

def trilaterate(beacons, distances):
    P = np.asarray(beacons, dtype=float)
    d = np.asarray(distances, dtype=float)
    if P.shape[0] < 3 or P.shape[0] != d.size:
        raise ValueError("need at least three beacons with one distance each")
    A = 2 * (P[1:] - P[0])
    if np.linalg.matrix_rank(A) < 2:
        raise ValueError("beacons on one line cannot fix a position")
    b = d[0] ** 2 - d[1:] ** 2 + (P[1:] ** 2).sum(axis=1) - (P[0] ** 2).sum()
    pos, *_ = np.linalg.lstsq(A, b, rcond=None)
    return float(pos[0]), float(pos[1])

def residuals(beacons, distances, position):
    P = np.asarray(beacons, dtype=float)
    return np.linalg.norm(P - np.asarray(position, dtype=float), axis=1) - np.asarray(distances, dtype=float)

B = [(0, 0), (30, 0), (30, 20), (0, 20)]
print(trilaterate(B, [14.4, 19.5, 21.4, 16.3]))
```

```python test
import numpy as np
for _n in ["trilaterate", "residuals"]:
    assert _n in dir(), f"Define {_n}."
_B = np.array([[0.0, 0.0], [30.0, 0.0], [30.0, 20.0], [0.0, 20.0]])
_true = np.array([12.0, 7.5])
_d = np.linalg.norm(_B - _true, axis=1)
_p = trilaterate(_B, _d)
assert all(type(_v) is float for _v in _p) and np.allclose(_p, _true, atol=1e-9), f"Exact distances recover (12, 7.5); got {_p}."
assert np.allclose(trilaterate([tuple(_b) for _b in _B[:3]], list(_d[:3])), _true, atol=1e-9), "Three beacons, as lists."
_g = np.random.default_rng(9)
_errs = [np.linalg.norm(np.array(trilaterate(_B, _d + _g.normal(0, 0.05, 4))) - _true) for _ in range(300)]
assert np.median(_errs) < 0.08, f"±5 cm noise: typical error a few centimetres; got {np.median(_errs):.3f} m."
_r = residuals(_B, _d, _true)
assert np.allclose(_r, 0) and residuals(_B, _d + 1, _true).round(9).tolist() == [-1.0] * 4, "Residuals: geometric distance minus measured."
for _bad in [(_B[:2], _d[:2]), (_B, _d[:3]), ([(0, 0), (10, 0), (20, 0), (35, 0)], [5, 5, 15, 30])]:
    try:
        trilaterate(*_bad)
        assert False, "Too few beacons, mismatched lengths or collinear beacons: ValueError."
    except ValueError:
        pass
"SUCCESS: Subtracting circle equations cancels the squares, turning trilateration into a linear least-squares problem."
```

Hint: Build A from 2 × (each beacon − the first) and the right-hand side from d₁² − dᵢ² + |Pᵢ|² − |P₁|². `np.linalg.matrix_rank(A) < 2` detects collinear beacons. Residuals are `np.linalg.norm(beacons − position, axis=1) − distances`.
:::

::: challenge Four-bar linkages [hard]
Write `grashof(a, b, c, d)`: True (a plain bool) if the shortest plus the longest of the four lengths is at most the sum of the other two. Write `output_angle(a, b, c, d, theta2, branch=1)`: for a four-bar with crank a pivoted at the origin at angle theta2 (radians), coupler b, rocker c pivoted at (d, 0), return the rocker's angle θ₄ = atan2(C_y, C_x − d) as a plain float, where C is the intersection of the circle of radius b around the crank tip with the circle of radius c around (d, 0), taking the point to the left of the direction from the crank tip to (d, 0) for branch = 1 and to the right for branch = −1; return `None` if the circles do not meet. Then write `rocker_swing(a, b, c, d, n=3600)`: the total angle (degrees, plain float) through which the rocker swings in the branch-1 assembly as the crank turns through n equally spaced angles; raise `ValueError` if the crank cannot turn fully (some angle has no assembly).

```python starter
import math
import numpy as np

def grashof(a, b, c, d):
    return True

def output_angle(a, b, c, d, theta2, branch=1):
    return 0.0

def rocker_swing(a, b, c, d, n=3600):
    return 0.0

print(grashof(20, 70, 50, 60), rocker_swing(20, 70, 50, 60))
```

```python solution
import math
import numpy as np

def grashof(a, b, c, d):
    s = sorted([a, b, c, d])
    return bool(s[0] + s[3] <= s[1] + s[2])

def output_angle(a, b, c, d, theta2, branch=1):
    Bx, By = a * math.cos(theta2), a * math.sin(theta2)
    ux, uy = d - Bx, -By
    gap = math.hypot(ux, uy)
    if gap > b + c or gap < abs(b - c) or gap == 0:
        return None
    along = (b * b - c * c + gap * gap) / (2 * gap)
    h = math.sqrt(max(b * b - along * along, 0.0))
    ux, uy = ux / gap, uy / gap
    Cx = Bx + along * ux - branch * h * uy
    Cy = By + along * uy + branch * h * ux
    return float(math.atan2(Cy, Cx - d))

def rocker_swing(a, b, c, d, n=3600):
    angles = []
    for k in range(n):
        t4 = output_angle(a, b, c, d, 2 * math.pi * k / n, 1)
        if t4 is None:
            raise ValueError("the crank cannot turn fully")
        angles.append(t4)
    angles = np.unwrap(np.array(angles))
    return float(math.degrees(angles.max() - angles.min()))

print(grashof(20, 70, 50, 60), rocker_swing(20, 70, 50, 60))
```

```python test
import math
import numpy as np
for _n in ["grashof", "output_angle", "rocker_swing"]:
    assert _n in dir(), f"Define {_n}."
assert grashof(20, 70, 50, 60) is True and grashof(45, 80, 30, 40) is False and grashof(40, 70, 30, 60) is True, "Grashof: 90 <= 110; 110 > 85; equality (100 = 100) allowed."
_t4 = output_angle(20, 70, 50, 60, math.radians(40))
assert type(_t4) is float, "A plain float."
_B = np.array([20 * math.cos(math.radians(40)), 20 * math.sin(math.radians(40))])
_C = np.array([60 + 50 * math.cos(_t4), 50 * math.sin(_t4)])
assert abs(np.linalg.norm(_C - _B) - 70) < 1e-9, "The coupler length is respected."
_t4b = output_angle(20, 70, 50, 60, math.radians(40), branch=-1)
_Cb = np.array([60 + 50 * math.cos(_t4b), 50 * math.sin(_t4b)])
assert abs(np.linalg.norm(_Cb - _B) - 70) < 1e-9 and abs(_t4 - _t4b) > 0.5, "The other assembly mode also closes the loop, at a different angle."
_u = (np.array([60.0, 0.0]) - _B)
assert (_u[0] * (_C - _B)[1] - _u[1] * (_C - _B)[0]) > 0, "Branch 1 lies to the left of the direction from the crank tip to (d, 0)."
assert output_angle(20, 10, 10, 60, 0.0) is None, "Links too short to close: None."
_s = rocker_swing(20, 70, 50, 60)
assert type(_s) is float and abs(_s - 56.3) < 0.5, f"The lesson's linkage swings about 56.3°; got {_s}."
assert rocker_swing(10, 70, 50, 60) < _s, "A shorter crank gives a smaller swing."
try:
    rocker_swing(45, 80, 30, 40)
    assert False, "A non-Grashof crank cannot turn fully: ValueError."
except ValueError:
    pass
"SUCCESS: A four-bar's loop closes where two circles meet; Grashof's rule says whether the crank turns fully, and the branch picks the assembly."
```

Hint: B = (a cos θ₂, a sin θ₂). With u the unit vector from B to (d, 0) and gap their distance, C = B + along·u ± h·(perpendicular to u), along = (b² − c² + gap²)/(2·gap), h = √(b² − along²). The left perpendicular of (uₓ, u_y) is (−u_y, uₓ). Use `np.unwrap` before measuring the swing.
:::

## What you learned

- A system of two equations in two unknowns asks for the intersections of two curves; plotting the zero contours counts and locates the solutions.
- Elimination reduces a polynomial system to one equation; SymPy returns all solutions, including complex ones, which applications then discard.
- In trilateration, subtracting circle equations cancels the squares and leaves a linear least-squares problem.
- Newton's method for systems solves the linearised system at each step; each solution has its own basin of starting points, so finding all of them needs several starts.
- A four-bar linkage closes where two circles meet: two assembly modes, Grashof's condition for a fully turning crank, and continuity to stay in one mode during motion.

That completes Block A. The next block turns to geometry and trigonometry, beginning with triangles and similarity.
