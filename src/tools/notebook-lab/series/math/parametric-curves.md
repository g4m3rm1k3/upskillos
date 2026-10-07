# Parametric curves

A CNC toolpath is not a function y = f(x). It loops, doubles back and crosses itself. What the controller actually needs is where the tool should be at each moment: x(t) and y(t), two functions of a single parameter. That is a **parametric curve**, the natural description of anything that moves along a path. The parameter can be time, an angle, or just a counter running from 0 to 1. This lesson describes curves this way and computes with them: velocity along the path, arc length (how far the tool actually travels), the trochoidal paths of modern high-speed milling, curvature and the feed rate a corner allows, and the Bézier curves of every CAD program.

This lesson covers:

- curves as (x(t), y(t)), and the same curve traced at different speeds;
- the velocity vector, speed and arc length;
- cycloids and trochoidal milling paths;
- curvature, and the speed limit it sets in a corner;
- Bézier curves and de Casteljau's algorithm.

## Curves from a parameter

::: math
\[ \mathbf{r}(t) = \big(x(t),\, y(t)\big), \qquad \text{circle: } (R\cos t,\; R\sin t), \qquad \text{ellipse: } (a\cos t,\; b\sin t), \quad 0 \le t < 2\pi \]
- the parameter $t$ labels the points; the set of points is the curve, and the parametrisation is one way of walking along it
- the same circle can be traced at constant speed ($t$) or unevenly ($t^2$ in place of $t$): the curve is identical, the motion is not
In code: three parametrisations of a circle, compared by their points and the spacing between them
:::

A **parametric curve** gives each coordinate as a function of a parameter t: r(t) = (x(t), y(t)). As t runs through its range the point traces the curve. Unlike y = f(x), a parametric curve can go back on itself, form closed loops and cross itself, and it carries more information than its shape: **how** the curve is traversed. The circle (R cos t, R sin t) is traced at constant speed. Replacing t by t²/(2π) traces exactly the same circle, but slowly at first and fast at the end. For a machine the shape is the part, and the parametrisation is the motion, so both matter.

Predict before running: do (cos t, sin t), (cos t², sin t²) suitably scaled, and (cos(−t), sin(−t)) trace the same set of points? Which one moves at a steady pace?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 2 * np.pi, 13)
paths = {
    "steady (cos t, sin t)": (np.cos(t), np.sin(t)),
    "accelerating t²/2π": (np.cos(t ** 2 / (2 * np.pi)), np.sin(t ** 2 / (2 * np.pi))),
    "backwards (cos(-t), sin(-t))": (np.cos(-t), np.sin(-t)),
}
for name, (px, py) in paths.items():
    radius = np.hypot(px, py)
    steps = np.hypot(np.diff(px), np.diff(py))
    print(f"{name:<30} all on the unit circle: {np.allclose(radius, 1)}; step lengths from {steps.min():.3f} to {steps.max():.3f}")

fig, axes = plt.subplots(1, 3, figsize=(10, 3.2))
for ax, (name, (px, py)) in zip(axes, paths.items()):
    ax.plot(px, py, "o-", markersize=4)
    ax.plot(px[1], py[1], "rs")
    ax.set_title(name, fontsize=8)
    ax.set_aspect("equal")
plt.show()
```

```output
steady (cos t, sin t)          all on the unit circle: True; step lengths from 0.518 to 0.518
accelerating t²/2π             all on the unit circle: True; step lengths from 0.044 to 0.962
backwards (cos(-t), sin(-t))   all on the unit circle: True; step lengths from 0.518 to 0.518
```

All three lie exactly on the unit circle. The steady one moves in equal steps of 0.518. The accelerating one starts with tiny steps (0.044) and ends with large ones (0.962). The backwards one has equal steps but goes clockwise: the red square, the second point, is on the other side. Same curve, three different motions.

## Velocity, speed and arc length

::: math
\[ \mathbf{v}(t) = \mathbf{r}'(t) = \big(x'(t),\, y'(t)\big), \qquad |\mathbf{v}| = \sqrt{x'^2 + y'^2}, \qquad s = \int_{t_0}^{t_1} \sqrt{x'(t)^2 + y'(t)^2}\;dt \]
- the velocity vector is tangent to the curve; its length is the speed along the path
- the arc length $s$ adds up speed × time: numerically, the sum of the lengths of many short chords
- the ellipse's perimeter has no elementary formula; Ramanujan's approximation $\pi\big(3(a+b) - \sqrt{(3a+b)(a+3b)}\big)$ is extremely close
In code: `chord_length(n)` for an ellipse with increasing $n$, against a million chords and Ramanujan
:::

Differentiating each coordinate gives the **velocity vector** r′(t), which points along the curve (tangent to it), and its length is the speed. The **arc length**, the distance actually travelled along the path, is the integral of the speed, the accumulation lesson's integral applied to a curve. Numerically it is simplest to sample many points and add the lengths of the straight chords between them. That is exactly what a CNC controller does, since it moves in many tiny straight steps. Even simple curves can have awkward lengths. The perimeter of an ellipse has no formula in elementary functions, but Ramanujan found an approximation accurate to many digits.

Predict before running: how many chords does it take to get an ellipse with semi-axes 50 and 30 mm right to 0.01 mm?

```python type
a_ax, b_ax = 50.0, 30.0
ramanujan = math.pi * (3 * (a_ax + b_ax) - math.sqrt((3 * a_ax + b_ax) * (a_ax + 3 * b_ax)))
def chord_length(n):
    tt = np.linspace(0, 2 * np.pi, n + 1)
    return np.hypot(np.diff(a_ax * np.cos(tt)), np.diff(b_ax * np.sin(tt))).sum()

reference = chord_length(1_000_000)
for n in [10, 100, 1000, 10000]:
    print(f"{n:>6} chords: perimeter {chord_length(n):.6f} mm (error {chord_length(n) - reference:+.2e})")
print(f"a million chords: {reference:.6f} mm; Ramanujan's formula: {ramanujan:.6f} mm (off by {ramanujan - reference:+.1e})")
print(f"a circle of the same 'average radius' 40 mm: {2 * math.pi * 40:.3f} mm")
```

```output
    10 chords: perimeter 251.104523 mm (error -4.17e+00)
   100 chords: perimeter 255.228000 mm (error -4.20e-02)
  1000 chords: perimeter 255.269569 mm (error -4.20e-04)
 10000 chords: perimeter 255.269984 mm (error -4.20e-06)
a million chords: 255.269989 mm; Ramanujan's formula: 255.269864 mm (off by -1.2e-04)
a circle of the same 'average radius' 40 mm: 251.327 mm
```

With 10 chords the length is about 4.2 mm short. With 100 it is within 0.04 mm, and with 1,000 within 0.0004 mm of the million-chord value, 255.26999 mm. The error shrinks by a factor of 100 for every factor of 10 in the number of chords: second-order convergence again. Ramanujan's formula, 255.26986 mm, is off by only about 0.0001 mm, a remarkable formula but not exact. A circle of radius 40 mm, the average of the semi-axes, would be 251.3 mm: a 1.6% underestimate, the kind of shortcut that makes a toolpath's cycle-time estimate wrong.

## Cycloids and trochoidal milling

::: math
\[ \text{cycloid: } \big(R(t - \sin t),\; R(1 - \cos t)\big), \qquad \text{trochoid: } \big(r\cos(\omega t) + v t,\; r\sin(\omega t)\big) \]
- a cycloid is traced by a point on the rim of a wheel rolling along a line; its arches are $2\pi R$ long and touch the line with a cusp
- a trochoidal milling path circles with radius $r$ while advancing at speed $v$: the cutter takes small bites instead of full-width cuts
- the advance per loop is $2\pi v / \omega$
In code: one cycloid arch's length (exactly $8R$); a trochoidal path's length compared with the straight slot it cuts
:::

Rolling motion produces some of the most useful parametric curves. A point on the rim of a wheel rolling along a line traces a **cycloid**. At the bottom of each arch the point is momentarily at rest, which makes a sharp **cusp**, and each arch has length exactly 8R, four times the wheel's diameter. In milling, a related curve has become standard. Rather than plunging straight down a slot with the full cutter engaged, **trochoidal milling** moves the cutter in small circles while it creeps forward. Each pass takes only a thin bite, so the tool runs cooler and faster and lasts far longer, at the price of a much longer path.

Predict before running: how long is one arch of a cycloid with R = 10 mm? And how much farther does the cutter travel on a trochoidal path than along a 100 mm straight slot?

```python type
R = 10.0
tc = np.linspace(0, 2 * np.pi, 20001)
arch = np.hypot(np.diff(R * (tc - np.sin(tc))), np.diff(R * (1 - np.cos(tc)))).sum()
print(f"one cycloid arch: {arch:.4f} mm (8R = {8 * R} mm)")

r_loop, advance = 4.0, 1.0
omega = 2 * np.pi
loops = 100.0 / advance
tt = np.linspace(0, loops, int(loops * 2000) + 1)
xs = r_loop * np.cos(omega * tt) + advance * tt
ys = r_loop * np.sin(omega * tt)
path = np.hypot(np.diff(xs), np.diff(ys)).sum()
print(f"trochoidal path: {loops:.0f} loops of radius {r_loop} mm advancing {advance} mm each: {path:.0f} mm of travel for a 100 mm slot ({path / 100:.1f}×)")

fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 2.8))
a1.plot(R * (tc - np.sin(tc)), R * (1 - np.cos(tc)))
a1.set_aspect("equal")
a1.set_title("cycloid arch")
keep = tt <= 6
a2.plot(xs[keep], ys[keep])
a2.set_aspect("equal")
a2.set_title("trochoidal milling path (first 6 loops)")
plt.show()
```

```output
one cycloid arch: 80.0000 mm (8R = 80.0 mm)
trochoidal path: 100 loops of radius 4.0 mm advancing 1.0 mm each: 2514 mm of travel for a 100 mm slot (25.1×)
```

The arch measures 80.0000 mm, exactly 8R, a result Christopher Wren proved in 1658 without calculus. The trochoidal path makes 100 loops of 4 mm radius to cut a 100 mm slot and travels about 2,514 mm, 25 times the straight distance. It is still often faster overall: the light cuts allow much higher feed rates and depths, and the tool survives far longer.

## Curvature and the speed limit in a corner

::: math
\[ \kappa = \frac{|x'y'' - y'x''|}{\big(x'^2 + y'^2\big)^{3/2}}, \qquad \rho = \frac{1}{\kappa}, \qquad a_n = v^2\kappa \le a_\text{max} \;\Longrightarrow\; v \le \sqrt{\frac{a_\text{max}}{\kappa}} \]
- curvature $\kappa$ measures how sharply the path turns; its reciprocal $\rho$ is the radius of the best-fitting circle
- moving at speed $v$ along a path of curvature $\kappa$ needs a sideways (centripetal) acceleration $v^2\kappa$
- an axis limited to $a_\text{max}$ must therefore slow down where the curvature is high
In code: `np.gradient` derivatives of a sampled ellipse; the curvature at the ends of each axis; the feed limit along the path
:::

How sharply a path bends is its **curvature** κ. It is the reciprocal of the radius of the circle that best fits the curve at that point, and it is computed from the first and second derivatives of the parametrisation. Curvature turns geometry into a dynamics problem. Following a curve at speed v needs a sideways acceleration v²κ, the centripetal acceleration of uniform circular motion. Machine axes can only accelerate so hard, so a controller must slow down wherever the curvature is high: in sharp corners, small arcs, and the narrow ends of an ellipse. Look-ahead in CNC controllers is mostly this calculation, done ahead of the tool along the whole path.

Predict before running: an elliptical pocket with semi-axes 50 and 30 mm, an axis acceleration limit of 2 m/s² and a programmed feed of 0.5 m/s. Where must the tool slow down, and to what speed?

```python type
n = 4000
tt = np.linspace(0, 2 * np.pi, n, endpoint=False)
ex, ey = 0.050 * np.cos(tt), 0.030 * np.sin(tt)
dt = tt[1] - tt[0]
dx, dy = np.gradient(ex, dt), np.gradient(ey, dt)
ddx, ddy = np.gradient(dx, dt), np.gradient(dy, dt)
kappa = np.abs(dx * ddy - dy * ddx) / (dx ** 2 + dy ** 2) ** 1.5
end = n // 2
print(f"curvature at the end of the long axis {kappa[end]:.2f} 1/m (radius {1000 / kappa[end]:.1f} mm; exact a/b² = {0.050 / 0.030 ** 2:.2f})")
print(f"curvature at the end of the short axis {kappa[n // 4]:.2f} 1/m (radius {1000 / kappa[n // 4]:.1f} mm; exact b/a² = {0.030 / 0.050 ** 2:.2f})")
v_limit = np.minimum(0.5, np.sqrt(2.0 / kappa[1:-1]))
print(f"feed limit: {v_limit.min():.3f} m/s at the sharp ends, {v_limit.max():.3f} m/s on the flat sides (programmed 0.5)")
print(f"fraction of the path below the programmed feed: {np.mean(v_limit < 0.5):.0%}")
```

```output
curvature at the end of the long axis 55.56 1/m (radius 18.0 mm; exact a/b² = 55.56)
curvature at the end of the short axis 12.00 1/m (radius 83.3 mm; exact b/a² = 12.00)
feed limit: 0.190 m/s at the sharp ends, 0.408 m/s on the flat sides (programmed 0.5)
fraction of the path below the programmed feed: 100%
```

At the sharp ends of the long axis the curvature is 55.6 per metre, a radius of only 18 mm (exactly a/b²). At the flat sides it is 12 per metre, a radius of 83.3 mm. With a 2 m/s² axis the tool must slow to 0.19 m/s at the sharp ends, and even on the flats √(2/12) = 0.41 m/s is the limit: the whole pocket runs below the programmed 0.5 m/s. That is why real cycle times exceed "length divided by feed". (The first and last samples are left out: there `np.gradient` can only use one-sided differences, which are much less accurate.)

## Bézier curves

::: math
\[ \mathbf{B}(t) = \sum_{k=0}^{n} \binom{n}{k}(1 - t)^{n-k} t^k\,\mathbf{P}_k, \qquad \text{de Casteljau: } \mathbf{P}_k^{(j)} = (1 - t)\,\mathbf{P}_k^{(j-1)} + t\,\mathbf{P}_{k+1}^{(j-1)} \]
- $\mathbf{P}_0, \ldots, \mathbf{P}_n$: control points; the curve starts at $\mathbf{P}_0$, ends at $\mathbf{P}_n$, and leaves along the direction towards $\mathbf{P}_1$
- **de Casteljau's algorithm** finds $\mathbf{B}(t)$ by repeated linear interpolation between neighbouring points, the coordinates lesson's $\mathbf{P} + t(\mathbf{Q} - \mathbf{P})$
- the curve stays inside the convex hull of its control points, so it never strays far from them
In code: a cubic Bézier evaluated by de Casteljau and by the Bernstein formula; its start and end tangents
:::

Every CAD system, font and vector-drawing program describes smooth shapes with **Bézier curves**, developed in the 1960s at Renault and Citroën for car-body design. A Bézier curve is defined by a few **control points**. It starts at the first, ends at the last, and is pulled towards the ones in between without passing through them. Dragging a control point reshapes the curve smoothly and predictably, which is why designers like them. **De Casteljau's algorithm** evaluates the curve by nothing but repeated linear interpolation. Interpolate between each pair of neighbouring control points at fraction t, then between the new points, and so on, until one point remains: that is B(t). The same numbers come from the Bernstein polynomial formula, built from binomial coefficients.

Predict before running: a cubic with control points (0, 0), (20, 40), (60, 40) and (80, 0) mm. Where is the curve at t = 0.5, and in which directions does it leave the start and arrive at the end?

```python type
from math import comb

def casteljau(points, t):
    pts = [np.asarray(p, dtype=float) for p in points]
    while len(pts) > 1:
        pts = [(1 - t) * pts[i] + t * pts[i + 1] for i in range(len(pts) - 1)]
    return pts[0]

ctrl = [(0, 0), (20, 40), (60, 40), (80, 0)]
mid = casteljau(ctrl, 0.5)
n_deg = len(ctrl) - 1
bern = sum(comb(n_deg, k) * 0.5 ** (n_deg - k) * 0.5 ** k * np.array(ctrl[k], dtype=float) for k in range(n_deg + 1))
print("B(0.5) by de Casteljau:", mid, "  by the Bernstein formula:", bern)
h = 1e-6
start_dir = (casteljau(ctrl, h) - casteljau(ctrl, 0)) / h
end_dir = (casteljau(ctrl, 1) - casteljau(ctrl, 1 - h)) / h
print("start tangent:", np.round(start_dir, 3), "= 3(P1 - P0):", 3 * (np.array(ctrl[1]) - np.array(ctrl[0])))
print("end tangent:", np.round(end_dir, 3), "= 3(P3 - P2):", 3 * (np.array(ctrl[3]) - np.array(ctrl[2])))

curve = np.array([casteljau(ctrl, s) for s in np.linspace(0, 1, 101)])
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(*np.array(ctrl).T, "o--", color="grey", label="control polygon")
ax.plot(curve[:, 0], curve[:, 1], label="cubic Bézier")
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

```output
B(0.5) by de Casteljau: [40. 30.]   by the Bernstein formula: [40. 30.]
start tangent: [ 60. 120.] = 3(P1 - P0): [ 60 120]
end tangent: [  60. -120.] = 3(P3 - P2): [  60 -120]
```

Both methods put the curve at (40, 30) at t = 0.5, below the control polygon's top edge at 40 mm: the curve is pulled towards the inner control points, not through them. It leaves (0, 0) heading towards (20, 40), with tangent 3(P₁ − P₀) = (60, 120), and arrives at (80, 0) from the direction of (60, 40). Matching these tangents is how CAD joins Bézier pieces smoothly, the parametric version of the spline lesson's matched slopes.

::: challenge Lengths along curves [easy]
Write `curve_length(fx, fy, t0, t1, n=10000)`: the arc length of the parametric curve (fx(t), fy(t)) for t from t0 to t1, as the sum of the lengths of n chords between equally spaced parameter values (fx and fy take NumPy arrays); return a plain float; raise `ValueError` if n < 1 or t1 < t0. Then write `ellipse_perimeter(a, b)`: Ramanujan's approximation π(3(a + b) − √((3a + b)(a + 3b))) as a plain float (raise `ValueError` unless a, b > 0), and `cycloid_arch(R)`: the length of one arch of the cycloid (R(t − sin t), R(1 − cos t)), computed with your `curve_length`.

```python starter
import math
import numpy as np

def curve_length(fx, fy, t0, t1, n=10000):
    return 0.0

def ellipse_perimeter(a, b):
    return 0.0

def cycloid_arch(R):
    return 0.0

print(ellipse_perimeter(50, 30), cycloid_arch(10))
```

```python solution
import math
import numpy as np

def curve_length(fx, fy, t0, t1, n=10000):
    if n < 1 or t1 < t0:
        raise ValueError("need n >= 1 and t1 >= t0")
    t = np.linspace(t0, t1, n + 1)
    return float(np.hypot(np.diff(fx(t)), np.diff(fy(t))).sum())

def ellipse_perimeter(a, b):
    if a <= 0 or b <= 0:
        raise ValueError("semi-axes must be positive")
    return float(math.pi * (3 * (a + b) - math.sqrt((3 * a + b) * (a + 3 * b))))

def cycloid_arch(R):
    return curve_length(lambda t: R * (t - np.sin(t)), lambda t: R * (1 - np.cos(t)), 0.0, 2 * math.pi)

print(ellipse_perimeter(50, 30), cycloid_arch(10))
```

```python test
import math
import numpy as np
for _n in ["curve_length", "ellipse_perimeter", "cycloid_arch"]:
    assert _n in dir(), f"Define {_n}."
_c = curve_length(np.cos, np.sin, 0, 2 * math.pi)
assert type(_c) is float and abs(_c - 2 * math.pi) < 1e-6, f"Unit circle: 2π; got {_c}."
assert abs(curve_length(lambda t: 3 * t, lambda t: 4 * t, 0, 2, n=1) - 10.0) < 1e-12, "A straight segment: one chord is exact."
assert abs(curve_length(lambda t: 50 * np.cos(t), lambda t: 30 * np.sin(t), 0, 2 * math.pi) - ellipse_perimeter(50, 30)) < 5e-4, "The ellipse agrees with Ramanujan to about 0.0001 mm."
assert curve_length(np.cos, np.sin, 1.0, 1.0) == 0.0, "No range, no length."
for _bad in [(np.cos, np.sin, 0, 1, 0), (np.cos, np.sin, 2, 1)]:
    try:
        curve_length(*_bad)
        assert False, f"curve_length{_bad[2:]} should raise ValueError."
    except ValueError:
        pass
assert abs(ellipse_perimeter(50, 30) - 255.2700) < 1e-3 and abs(ellipse_perimeter(10, 10) - 20 * math.pi) < 1e-9, "Ramanujan; a circle."
try:
    ellipse_perimeter(0, 5)
    assert False, "A zero semi-axis should raise ValueError."
except ValueError:
    pass
assert abs(cycloid_arch(10) - 80.0) < 1e-4 and abs(cycloid_arch(2.5) - 20.0) < 1e-4, "Wren's result: 8R."
"SUCCESS: Arc length adds up the chords; with enough of them it matches exact results like the cycloid's 8R."
```

Hint: Sample t with `np.linspace(t0, t1, n + 1)`, evaluate both coordinates, and add `np.hypot` of their differences. The cycloid's arch runs from t = 0 to 2π.
:::

::: challenge Curvature and feed [medium]
Write `curvature(x, y, t)`: for coordinates x and y sampled at parameter values t (NumPy arrays or lists of equal length, at least 3), estimate x′, y′, x″ and y″ with `np.gradient` (passing t, so uneven spacing works) and return the array κ = |x′y″ − y′x″|/(x′² + y′²)^(3/2). Raise `ValueError` for fewer than 3 samples or mismatched lengths. Then write `feed_limit(kappa, a_max, v_max)`: the array of allowed speeds min(v_max, √(a_max/κ)) (where κ = 0, v_max), and `cycle_time(x, y, speeds)`: the time to traverse the sampled path at those speeds, adding each chord's length divided by the average of the speeds at its two ends, as a plain float.

```python starter
import numpy as np

def curvature(x, y, t):
    return np.zeros(len(t))

def feed_limit(kappa, a_max, v_max):
    return np.full(len(kappa), float(v_max))

def cycle_time(x, y, speeds):
    return 0.0

tt = np.linspace(0, 2 * np.pi, 2001)
print(curvature(0.05 * np.cos(tt), 0.03 * np.sin(tt), tt)[0])
```

```python solution
import numpy as np

def curvature(x, y, t):
    x, y, t = (np.asarray(v, dtype=float) for v in (x, y, t))
    if x.size < 3 or not (x.size == y.size == t.size):
        raise ValueError("need at least 3 matching samples")
    dx, dy = np.gradient(x, t), np.gradient(y, t)
    ddx, ddy = np.gradient(dx, t), np.gradient(dy, t)
    return np.abs(dx * ddy - dy * ddx) / (dx ** 2 + dy ** 2) ** 1.5

def feed_limit(kappa, a_max, v_max):
    k = np.asarray(kappa, dtype=float)
    with np.errstate(divide="ignore"):
        limit = np.where(k > 0, np.sqrt(a_max / np.where(k > 0, k, 1.0)), np.inf)
    return np.minimum(v_max, limit)

def cycle_time(x, y, speeds):
    x, y, v = (np.asarray(q, dtype=float) for q in (x, y, speeds))
    chords = np.hypot(np.diff(x), np.diff(y))
    return float((chords / ((v[1:] + v[:-1]) / 2)).sum())

tt = np.linspace(0, 2 * np.pi, 2001)
print(curvature(0.05 * np.cos(tt), 0.03 * np.sin(tt), tt)[0])
```

```python test
import math
import numpy as np
for _n in ["curvature", "feed_limit", "cycle_time"]:
    assert _n in dir(), f"Define {_n}."
_t = np.linspace(0, 2 * math.pi, 4001)
_k = curvature(0.02 * np.cos(_t), 0.02 * np.sin(_t), _t)
assert isinstance(_k, np.ndarray) and np.allclose(_k[5:-5], 50.0, rtol=1e-4), "A 20 mm circle has curvature 50 per metre."
_ke = curvature(list(0.05 * np.cos(_t)), list(0.03 * np.sin(_t)), list(_t))
assert abs(_ke[1000] - 0.03 / 0.05 ** 2) < 0.05 and abs(_ke[2000] - 0.05 / 0.03 ** 2) < 0.2, "Ellipse: b/a² at the top, a/b² at the end of the long axis; lists work."
_tu = np.sort(np.concatenate([[0.0, 2.0], np.random.default_rng(3).uniform(0, 2, 400)]))
_ku = curvature(_tu, 0.5 * _tu ** 2, _tu)
assert np.allclose(_ku[20:-20], 1 / (1 + _tu[20:-20] ** 2) ** 1.5, rtol=1e-2), "Uneven parameter spacing: pass t to np.gradient."
for _bad in [([0, 1], [0, 1], [0, 1]), ([0, 1, 2], [0, 1], [0, 1, 2])]:
    try:
        curvature(*_bad)
        assert False, "Too few or mismatched samples: ValueError."
    except ValueError:
        pass
_f = feed_limit(np.array([0.0, 8.0, 50.0, 200.0]), 2.0, 0.5)
assert np.allclose(_f, [0.5, 0.5, 0.2, 0.1]), f"min(v_max, sqrt(a/κ)); straight parts run at v_max; got {_f}."
_x, _y = np.linspace(0, 1, 11), np.zeros(11)
assert abs(cycle_time(_x, _y, np.full(11, 0.5)) - 2.0) < 1e-12 and type(cycle_time(_x, _y, np.full(11, 0.5))) is float, "1 m at 0.5 m/s: 2 s."
_v = np.linspace(0.1, 0.5, 11)
assert abs(cycle_time(_x, _y, _v) - sum(0.1 / ((_v[_i] + _v[_i + 1]) / 2) for _i in range(10))) < 1e-12, "Average the two end speeds of each chord."
"SUCCESS: Curvature from the parametrisation sets a centripetal speed limit, and slower corners make real cycle times longer than length divided by feed."
```

Hint: `np.gradient(x, t)` differentiates with respect to the actual parameter values; apply it twice for second derivatives. For the feed, avoid dividing by zero where κ = 0. Each chord takes its length divided by the mean of its end speeds.
:::

::: challenge Bézier curves [hard]
Write `bezier_point(points, t)`: the point of the Bézier curve with the given control points (a list of 2D points, at least 2) at parameter t, by de Casteljau's algorithm, as a NumPy array; raise `ValueError` for fewer than 2 control points. Write `bezier_derivative_points(points)`: the control points of the derivative curve, n(Pₖ₊₁ − Pₖ) for k = 0 ... n − 1, as a list of NumPy arrays. Then write `split(points, t)`: the control points of the two halves of the curve split at t, `(left, right)`, each a list of NumPy arrays with the same number of points: the left half's points are the first point of each de Casteljau level, the right half's the last points in reverse order.

```python starter
import numpy as np

def bezier_point(points, t):
    return np.asarray(points[0], dtype=float)

def bezier_derivative_points(points):
    return []

def split(points, t):
    return (list(points), list(points))

ctrl = [(0, 0), (20, 40), (60, 40), (80, 0)]
print(bezier_point(ctrl, 0.5))
```

```python solution
import numpy as np

def bezier_point(points, t):
    pts = [np.asarray(p, dtype=float) for p in points]
    if len(pts) < 2:
        raise ValueError("need at least two control points")
    while len(pts) > 1:
        pts = [(1 - t) * pts[i] + t * pts[i + 1] for i in range(len(pts) - 1)]
    return pts[0]

def bezier_derivative_points(points):
    pts = [np.asarray(p, dtype=float) for p in points]
    n = len(pts) - 1
    return [n * (pts[k + 1] - pts[k]) for k in range(n)]

def split(points, t):
    level = [np.asarray(p, dtype=float) for p in points]
    left, right = [level[0]], [level[-1]]
    while len(level) > 1:
        level = [(1 - t) * level[i] + t * level[i + 1] for i in range(len(level) - 1)]
        left.append(level[0])
        right.append(level[-1])
    return left, right[::-1]

ctrl = [(0, 0), (20, 40), (60, 40), (80, 0)]
print(bezier_point(ctrl, 0.5))
```

```python test
from math import comb
import numpy as np
for _n in ["bezier_point", "bezier_derivative_points", "split"]:
    assert _n in dir(), f"Define {_n}."
_ctrl = [(0, 0), (20, 40), (60, 40), (80, 0)]
assert np.allclose(bezier_point(_ctrl, 0.5), [40, 30]) and np.allclose(bezier_point(_ctrl, 0), [0, 0]) and np.allclose(bezier_point(_ctrl, 1), [80, 0]), "Midpoint (40, 30); ends at the end control points."
_g = np.random.default_rng(73)
_P = _g.uniform(-10, 10, (6, 2))
for _tt in [0.1, 0.37, 0.9]:
    _bern = sum(comb(5, _k) * (1 - _tt) ** (5 - _k) * _tt ** _k * _P[_k] for _k in range(6))
    assert np.allclose(bezier_point(list(_P), _tt), _bern), "Agrees with the Bernstein formula for degree 5."
assert np.allclose(bezier_point([(1, 2), (5, 10)], 0.25), [2, 4]), "Two points: a straight line."
try:
    bezier_point([(1, 2)], 0.5)
    assert False, "One control point is not a curve: ValueError."
except ValueError:
    pass
_d = bezier_derivative_points(_ctrl)
assert len(_d) == 3 and np.allclose(_d[0], [60, 120]) and np.allclose(_d[-1], [60, -120]), "Derivative control points 3(P_{k+1} - P_k)."
_h = 1e-6
assert np.allclose(bezier_point(_d, 0.3), (bezier_point(_ctrl, 0.3 + _h) - bezier_point(_ctrl, 0.3 - _h)) / (2 * _h), atol=1e-4), "The derivative curve gives the tangent."
_L, _R = split(_ctrl, 0.4)
assert len(_L) == 4 and len(_R) == 4 and np.allclose(_L[0], [0, 0]) and np.allclose(_R[-1], [80, 0]) and np.allclose(_L[-1], _R[0]), "Halves share the split point."
for _s in [0.0, 0.3, 0.8, 1.0]:
    assert np.allclose(bezier_point(_L, _s), bezier_point(_ctrl, 0.4 * _s)) and np.allclose(bezier_point(_R, _s), bezier_point(_ctrl, 0.4 + 0.6 * _s)), "Each half retraces its part of the curve."
"SUCCESS: De Casteljau's repeated interpolation evaluates, differentiates and splits Bézier curves, the building blocks of CAD shapes."
```

Hint: Each de Casteljau level replaces the list with interpolations between neighbours. The derivative of a degree-n Bézier is a degree-(n − 1) Bézier whose control points are n times the differences. While running de Casteljau, keep the first and last point of every level: those are the two halves' control points.
:::

## What you learned

- A parametric curve (x(t), y(t)) separates the shape from the motion: the same set of points can be traversed at different speeds and directions.
- The velocity r′(t) is tangent to the curve; the arc length integrates the speed, and summing chord lengths converges at second order; the ellipse's perimeter needs such numerics (or Ramanujan).
- Rolling motion gives cycloids (arch length 8R), and trochoidal milling trades a much longer path for light, fast cuts.
- Curvature κ = |x′y″ − y′x″|/|r′|³ sets a centripetal speed limit v ≤ √(a_max/κ), so tools slow down in tight curves.
- Bézier curves are built from control points by de Casteljau's repeated interpolation, which also gives their tangents and lets them be split.

The next lesson uses a different pair of coordinates for curves that wind around a centre: polar curves, cams and spirals.
