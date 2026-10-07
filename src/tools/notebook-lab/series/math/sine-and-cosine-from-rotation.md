# Sine and cosine from rotation

Follow a point on a turning wheel and watch only its height: it rises, falls and rises again in a smooth, endlessly repeating wave. That wave is the **sine** function, and its sideways shadow is the **cosine**. Defined this way, through rotation rather than through triangles, sine and cosine describe every circular and periodic thing an engineer meets: hole positions on a bolt circle, the motion of a piston driven by a crank, alternating current, vibration, sound. This lesson builds sine and cosine from the unit circle, connects them to right triangles, uses `atan2` to recover angles, and models a real mechanism, the crank and slider at the heart of every piston engine and pump.

This lesson covers:

- sine and cosine as the coordinates of a rotating point;
- their graphs: period, amplitude and phase, and sin²θ + cos²θ = 1;
- right-triangle trigonometry and the inverse functions;
- `atan2`: the angle of any point, in the right quadrant;
- polar coordinates and bolt circles;
- the crank–slider mechanism, and averaging directions.

## The unit circle

::: math
\[ P(\theta) = (\cos\theta,\; \sin\theta), \qquad \cos^2\theta + \sin^2\theta = 1 \]
- $\cos\theta$ is the x coordinate, $\sin\theta$ the y coordinate of the point at angle $\theta$ on the unit circle
- the signs follow the quadrant; adding $360°$ gives the same point
In code: `math.cos(th), math.sin(th)` with `th = math.radians(deg)`
:::


Take a circle of radius 1 centred at the origin, the **unit circle**. Start at the point (1, 0) and rotate anticlockwise through an angle θ. The point you reach has coordinates

\[ (\cos\theta, \; \sin\theta) \]

That is the definition: cos θ is the x coordinate and sin θ the y coordinate of the point at angle θ. It works for any angle, including angles over 90°, negative angles and multiple turns, which triangle definitions cannot handle. On a circle of radius r the point is (r cos θ, r sin θ).

Because the point is on the unit circle, Pythagoras gives cos²θ + sin²θ = 1 for every θ. Predict before running: which angles have a negative cosine and a positive sine?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

for deg in [0, 30, 45, 90, 135, 180, 270, -60, 420]:
    th = math.radians(deg)
    c, s = math.cos(th), math.sin(th)
    print(f"{deg:>5}°: cos {c:+.4f}  sin {s:+.4f}   cos² + sin² = {c * c + s * s:.12f}")
```

```output
    0°: cos +1.0000  sin +0.0000   cos² + sin² = 1.000000000000
   30°: cos +0.8660  sin +0.5000   cos² + sin² = 1.000000000000
   45°: cos +0.7071  sin +0.7071   cos² + sin² = 1.000000000000
   90°: cos +0.0000  sin +1.0000   cos² + sin² = 1.000000000000
  135°: cos -0.7071  sin +0.7071   cos² + sin² = 1.000000000000
  180°: cos -1.0000  sin +0.0000   cos² + sin² = 1.000000000000
  270°: cos -0.0000  sin -1.0000   cos² + sin² = 1.000000000000
  -60°: cos +0.5000  sin -0.8660   cos² + sin² = 1.000000000000
  420°: cos +0.5000  sin +0.8660   cos² + sin² = 1.000000000000
```

At 135° the point is up and to the left: cosine negative, sine positive. Signs follow the quadrant. 420° is 60° plus a full turn, so it gives the same point as 60°. The identity cos² + sin² = 1 holds at every angle, up to rounding in the last digit.

## Waves from rotation

::: math
\[ y(t) = A\sin(\omega t + \varphi), \qquad T = \frac{2\pi}{\omega}, \qquad f = \frac{1}{T} \]
- $A$: amplitude; $\omega$: angular frequency; $\varphi$: phase; $T$: period; $f$: frequency in Hz
- $\cos\theta = \sin(\theta + 90°)$: cosine is sine shifted a quarter turn
In code: `np.sin(theta)` and `np.cos(theta)` over `np.linspace(0, 4 * np.pi, 400)`
:::


Rotate at a steady angular speed ω and the angle is θ = ωt. The height of the point, sin(ωt), traces a wave against time. It repeats every full turn: the **period** is T = 2π/ω and the **frequency** f = 1/T cycles per second (hertz). A general sinusoid is

\[ y(t) = A \sin(\omega t + \varphi) \]

with **amplitude** A (the radius of the circle), angular frequency ω, and **phase** φ (the starting angle). Cosine is sine shifted by a quarter turn: cos θ = sin(θ + 90°). Predict before running: at a point where the sine wave crosses zero going up, what is the cosine doing?

```python type
theta = np.linspace(0, 4 * np.pi, 400)
fig, (circ, wave) = plt.subplots(1, 2, figsize=(10, 3.5), gridspec_kw={"width_ratios": [1, 2.5]})
circ.plot(np.cos(theta), np.sin(theta), color="grey")
for deg in range(0, 360, 45):
    th = math.radians(deg)
    circ.plot([0, math.cos(th)], [0, math.sin(th)], color="lightgrey")
    circ.plot(math.cos(th), math.sin(th), "o", color="C0")
circ.set_aspect("equal")
circ.set_title("unit circle")
wave.plot(theta, np.sin(theta), label="sin θ (height)")
wave.plot(theta, np.cos(theta), label="cos θ (sideways)")
wave.set_xticks(np.arange(0, 4 * np.pi + 0.1, np.pi / 2))
wave.set_xticklabels(["0", "π/2", "π", "3π/2", "2π", "5π/2", "3π", "7π/2", "4π"])
wave.axhline(0, color="grey", linewidth=0.5)
wave.set_xlabel("angle θ (rad)")
wave.legend(loc="upper right")
plt.show()
print("cos θ = sin(θ + π/2) everywhere:", np.allclose(np.cos(theta), np.sin(theta + np.pi / 2)))
```

```output
cos θ = sin(θ + π/2) everywhere: True
```

`gridspec_kw` sets the relative widths of the two panels, and `set_xticks` with `set_xticklabels` labels the axis in multiples of π/2.

Where the sine crosses zero going up (θ = 0, 2π), the cosine is at its maximum of 1. Where the sine peaks, the cosine is zero. They are the same wave, a quarter period apart: a point moving round a circle is moving fastest vertically exactly when it is level with the centre.

## Triangles and inverse functions

::: math
\[ \sin\theta = \frac{\text{opp}}{\text{hyp}}, \quad \cos\theta = \frac{\text{adj}}{\text{hyp}}, \quad \tan\theta = \frac{\text{opp}}{\text{adj}}, \qquad \theta = \operatorname{atan2}(y, x) \in (-180°, 180°] \]
- $\arctan(y/x)$ cannot tell $(1, 1)$ from $(-1, -1)$; $\operatorname{atan2}$ sees both signs
- $\arcsin$ turns a ratio back into an angle (principal value)
In code: `math.atan2(y, x)` for a direction; `math.asin(rise / length)` for the ramp
:::


In a right triangle with an angle θ, put θ at the centre of a circle whose radius is the hypotenuse. The side opposite θ is then the y coordinate and the adjacent side the x coordinate, so

\[ \sin\theta = \frac{\text{opposite}}{\text{hypotenuse}}, \quad \cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}, \quad \tan\theta = \frac{\sin\theta}{\cos\theta} = \frac{\text{opposite}}{\text{adjacent}} \]

The **inverse functions** go from a ratio back to an angle: `math.asin`, `math.acos` and `math.atan`. Each can return only one angle, but many angles share each ratio, so each returns its **principal value**: asin and atan in [−90°, 90°], acos in [0°, 180°].

That is a problem for finding the direction of a point (x, y): atan(y/x) cannot tell (1, 1) from (−1, −1), which have the same ratio but opposite directions, and it fails when x = 0. `math.atan2(y, x)` takes the two coordinates separately, so it knows the quadrant, and returns the angle in (−180°, 180°]. Predict before running: what do `atan` and `atan2` say about the point (−1, −1)?

```python type
for x, y in [(1, 1), (-1, -1), (-1, 1), (0, 2), (-3, 0)]:
    naive = math.degrees(math.atan(y / x)) if x != 0 else float("nan")
    print(f"({x:>2}, {y:>2}): atan(y/x) = {naive:7.1f}°   atan2(y, x) = {math.degrees(math.atan2(y, x)):7.1f}°")

ramp_rise, ramp_length = 1.2, 8.0
print(f"a ramp rising {ramp_rise} m over a {ramp_length} m slope is inclined at {math.degrees(math.asin(ramp_rise / ramp_length)):.2f}°")
```

```output
( 1,  1): atan(y/x) =    45.0°   atan2(y, x) =    45.0°
(-1, -1): atan(y/x) =    45.0°   atan2(y, x) =  -135.0°
(-1,  1): atan(y/x) =   -45.0°   atan2(y, x) =   135.0°
( 0,  2): atan(y/x) =     nan°   atan2(y, x) =    90.0°
(-3,  0): atan(y/x) =    -0.0°   atan2(y, x) =   180.0°
a ramp rising 1.2 m over a 8.0 m slope is inclined at 8.63°
```

`math.atan(y / x)` gives 45° for both (1, 1) and (−1, −1), pointing the wrong way for the second, and cannot handle x = 0 at all. `atan2` gives −135° for (−1, −1), 90° for (0, 2) and 180° for (−3, 0). For a point's direction, always use `atan2`. The ramp's 1.2 m rise along an 8 m slope is the opposite side over the hypotenuse, an incline of about 8.6°.

## Polar coordinates and bolt circles

::: math
\[ x = r\cos\theta,\; y = r\sin\theta \qquad\Longleftrightarrow\qquad r = \sqrt{x^2 + y^2},\; \theta = \operatorname{atan2}(y, x) \]
- hole $k$ of $n$ on a bolt circle sits at $\theta_k = \dfrac{2\pi k}{n}$, radius $r = \text{PCD}/2$
- neighbouring holes are a chord $2r\sin(\pi/n)$ apart
In code: `pcd / 2 * math.cos(2 * math.pi * k / n)`, and back with `math.hypot`, `math.atan2`
:::


A point can be described by its distance from the origin and its direction: **polar coordinates** (r, θ). Converting is exactly what this lesson has built: x = r cos θ, y = r sin θ one way, and r = √(x² + y²), θ = atan2(y, x) the other.

Flanges, wheel hubs and pipe joints carry holes equally spaced on a **bolt circle** (its diameter is called the pitch circle diameter, PCD). The hole positions are polar coordinates converted to x and y for the CNC program. Predict before running: on a 100 mm PCD with six holes, how far apart are neighbouring holes in a straight line?

```python type
pcd, n = 100, 6
holes = [(pcd / 2 * math.cos(2 * math.pi * k / n), pcd / 2 * math.sin(2 * math.pi * k / n)) for k in range(n)]
for k, (x, y) in enumerate(holes):
    r, th = math.hypot(x, y), math.degrees(math.atan2(y, x))
    print(f"hole {k}: x = {x:8.3f}, y = {y:8.3f}   back to polar: r = {r:.1f}, θ = {th:6.1f}°")
print("neighbour spacing:", round(math.dist(holes[0], holes[1]), 3), "mm  (chord formula", round(pcd * math.sin(math.pi / n), 3), "mm)")
print("hole 3 unrounded:", holes[3])
```

```output
hole 0: x =   50.000, y =    0.000   back to polar: r = 50.0, θ =    0.0°
hole 1: x =   25.000, y =   43.301   back to polar: r = 50.0, θ =   60.0°
hole 2: x =  -25.000, y =   43.301   back to polar: r = 50.0, θ =  120.0°
hole 3: x =  -50.000, y =    0.000   back to polar: r = 50.0, θ =  180.0°
hole 4: x =  -25.000, y =  -43.301   back to polar: r = 50.0, θ = -120.0°
hole 5: x =   25.000, y =  -43.301   back to polar: r = 50.0, θ =  -60.0°
neighbour spacing: 50.0 mm  (chord formula 50.0 mm)
hole 3 unrounded: (-50.0, 6.123233995736766e-15)
```

The straight-line distance between neighbouring holes is a **chord** of the circle. Bisecting the angle 2π/n between two holes splits it into two right triangles, giving chord = PCD × sin(π/n).

With six holes the spacing equals the radius, 50 mm, because six equal chords form a regular hexagon. Converting back to polar recovers r = 50 and angles in steps of 60° (shown in (−180°, 180°], so 240° appears as −120°). The last line shows hole 3 unrounded: its y coordinate is 6.12e-15, not 0, because π is not exact in floating point. Round coordinates for display and for a machine program.

## A crank and a piston

::: math
\[ x(\theta) = r\cos\theta + \sqrt{l^2 - r^2\sin^2\theta} \]
- $r$: crank radius; $l$: connecting-rod length; $x$: piston distance from the shaft
- stroke $= x(0) - x(\pi) = 2r$; mid-stroke is $\tfrac{1}{2}\big(x_{\max} + x_{\min}\big)$
In code: `r * np.cos(theta) + np.sqrt(l ** 2 - (r * np.sin(theta)) ** 2)`
:::


A **crank–slider** turns rotation into back-and-forth motion: a crank of radius r turns about a shaft, and a connecting rod of length l joins the crank pin to a piston sliding along a line. With the crank at angle θ from the line, the pin is at (r cos θ, r sin θ), and the piston, which stays on the line, is at the distance

\[ x(\theta) = r\cos\theta + \sqrt{l^2 - r^2 \sin^2\theta} \]

from the shaft, by Pythagoras on the rod. The stroke is 2r. If the rod were infinitely long the motion would be a pure cosine. With a real rod it is not quite: the piston spends longer near the bottom of its stroke than near the top. Predict before running: with r = 40 mm and l = 120 mm, is the piston at mid-stroke when the crank is at 90°?

```python type
def piston(theta, r, l):
    return r * np.cos(theta) + np.sqrt(l ** 2 - (r * np.sin(theta)) ** 2)

r, l = 40.0, 120.0
th = np.linspace(0, 2 * np.pi, 721)
x = piston(th, r, l)
mid = (x.max() + x.min()) / 2
print(f"stroke {x.max() - x.min():.1f} mm, from {x.min():.1f} to {x.max():.1f} mm from the shaft")
print(f"at 90°: {piston(np.pi / 2, r, l):.2f} mm, mid-stroke is {mid:.2f} mm")
print(f"crank angle at mid-stroke: {math.degrees(th[np.argmin(np.abs(x[:361] - mid))]):.1f}°")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(np.degrees(th), x - mid, label="piston (l = 120 mm)")
ax.plot(np.degrees(th), r * np.cos(th), "--", label="pure cosine (infinite rod)")
ax.set_xlabel("crank angle (degrees)")
ax.set_ylabel("displacement from mid-stroke (mm)")
ax.legend()
plt.show()
```

```output
stroke 80.0 mm, from 80.0 to 160.0 mm from the shaft
at 90°: 113.14 mm, mid-stroke is 120.00 mm
crank angle at mid-stroke: 80.5°
```

`x[:361]` restricts the search to the first half turn (0° to 180°), where the piston goes from top to bottom once.

The stroke is 80 mm, twice the crank radius. At 90° of crank the piston is at 113.14 mm, 6.86 mm short of mid-stroke at 120 mm; it reaches mid-stroke only at about 80.5° (to the half degree of the sampling). The dashed cosine shows the difference: the real piston moves faster near the top and lingers near the bottom. That asymmetry shapes the vibration of every single-cylinder engine and pump.

::: challenge Bolt circle coordinates [easy]
Write `bolt_circle(n, pcd, start_deg=0, centre=(0, 0))` returning a list of n `(x, y)` tuples: the hole centres equally spaced on a circle of diameter `pcd` around `centre`, the first at angle `start_deg` (measured anticlockwise from the positive x axis), going anticlockwise. Round each coordinate to 3 decimal places and add `0.0` so that `-0.0` becomes `0.0`. Raise `ValueError` if n < 1 or pcd ≤ 0. Then write `hole_spacing(n, pcd)`, the straight-line distance between neighbouring holes, rounded to 3 decimal places (for n = 1 return 0.0).

```python starter
def bolt_circle(n, pcd, start_deg=0, centre=(0, 0)):
    return [(pcd / 2, 0)] * n

def hole_spacing(n, pcd):
    return 0.0

print(bolt_circle(4, 80, start_deg=45))
```

```python solution
def bolt_circle(n, pcd, start_deg=0, centre=(0, 0)):
    if n < 1 or pcd <= 0:
        raise ValueError("need at least one hole and a positive diameter")
    cx, cy = centre
    points = []
    for k in range(n):
        th = math.radians(start_deg) + 2 * math.pi * k / n
        points.append((round(cx + pcd / 2 * math.cos(th), 3) + 0.0, round(cy + pcd / 2 * math.sin(th), 3) + 0.0))
    return points

def hole_spacing(n, pcd):
    if n == 1:
        return 0.0
    return round(pcd * math.sin(math.pi / n), 3)

print(bolt_circle(4, 80, start_deg=45))
```

```python test
for _n in ["bolt_circle", "hole_spacing"]:
    assert _n in dir(), f"Define {_n}."
assert bolt_circle(4, 80) == [(40.0, 0.0), (0.0, 40.0), (-40.0, 0.0), (0.0, -40.0)], f"Got {bolt_circle(4, 80)}."
assert bolt_circle(4, 80, start_deg=45) == [(28.284, 28.284), (-28.284, 28.284), (-28.284, -28.284), (28.284, -28.284)], "Starting at 45°."
assert bolt_circle(3, 60, start_deg=90, centre=(100, 50)) == [(100.0, 80.0), (74.019, 35.0), (125.981, 35.0)], f"Offset centre; got {bolt_circle(3, 60, start_deg=90, centre=(100, 50))}."
assert all(str(_v) != "-0.0" for _p in bolt_circle(8, 50) for _v in _p), "Replace -0.0 with 0.0."
for _bad in [(0, 50), (4, 0), (4, -10)]:
    try:
        bolt_circle(*_bad)
        assert False, f"bolt_circle{_bad} should raise ValueError."
    except ValueError:
        pass
assert hole_spacing(6, 100) == 50.0 and hole_spacing(4, 80) == 56.569 and hole_spacing(1, 80) == 0.0, "Chord = PCD × sin(π/n)."
assert hole_spacing(5, 120) == round(math.dist(bolt_circle(5, 120)[0], bolt_circle(5, 120)[1]), 3), "Spacing matches the coordinates."
"SUCCESS: Polar to Cartesian, n times: x = cx + R cos θ, y = cy + R sin θ."
```

Hint: Hole k is at angle `radians(start_deg) + 2π k / n`; its coordinates are `cx + R cos θ` and `cy + R sin θ` with R = pcd / 2.
:::

::: challenge Averaging directions [medium]
The angles lesson showed that averaging angles numerically fails across 0°. The correct method treats each direction as a point on the unit circle, averages the points, and takes the direction of the average. Write `to_polar(x, y)` returning `(r, angle_deg)` with the angle in [0, 360). Careful: for a tiny negative angle, `% 360` rounds up to exactly 360.0, so map a result of 360 back to 0, and do the same after rounding. Write `circular_mean(angles_deg)`: average the cosines and the sines of the angles, then return the direction of the resulting point (via `atan2`) in [0, 360), rounded to 6 decimal places. Also return how concentrated the directions are: the distance of the average point from the origin, rounded to 6 decimal places (1 means all the same, near 0 means spread evenly), as a tuple `(mean, concentration)`. Raise `ValueError` for an empty list, and also when the concentration is below 1e-9, because then there is no meaningful mean direction (for example 0° and 180°).

```python starter
def to_polar(x, y):
    return (0.0, 0.0)

def circular_mean(angles_deg):
    return (sum(angles_deg) / len(angles_deg), 1.0)

print(circular_mean([350, 10]))
```

```python solution
def to_polar(x, y):
    a = math.degrees(math.atan2(y, x)) % 360
    return math.hypot(x, y), 0.0 if a >= 360 else a

def circular_mean(angles_deg):
    if not angles_deg:
        raise ValueError("no angles")
    c = sum(math.cos(math.radians(a)) for a in angles_deg) / len(angles_deg)
    s = sum(math.sin(math.radians(a)) for a in angles_deg) / len(angles_deg)
    r, direction = to_polar(c, s)
    if r < 1e-9:
        raise ValueError("the directions cancel out: no mean direction")
    mean = round(direction, 6)
    return (0.0 if mean >= 360 else mean), round(r, 6)

print(circular_mean([350, 10]))
```

```python test
for _n in ["to_polar", "circular_mean"]:
    assert _n in dir(), f"Define {_n}."
_r, _a = to_polar(-1, -1)
assert abs(_r - math.sqrt(2)) < 1e-12 and abs(_a - 225) < 1e-9, f"(-1, -1) is at 225°; got {(_r, _a)}."
assert to_polar(0, 2) == (2.0, 90.0) and to_polar(3, 0) == (3.0, 0.0), "On the axes."
assert 0 <= to_polar(1, -1e-17)[1] < 360 and 0 <= to_polar(1, -1e-12)[1] < 360, "Angles just below the x axis must stay in [0, 360), never 360.0."
assert circular_mean([350, 10]) == (0.0, 0.984808), f"Got {circular_mean([350, 10])}."
assert circular_mean([90]) == (90.0, 1.0) and circular_mean([80, 100, 90]) == (90.0, 0.989872), f"Single and symmetric cases; got {circular_mean([80, 100, 90])}."
assert circular_mean([300, 330, 0, 30]) == (345.0, 0.836516), f"Got {circular_mean([300, 330, 0, 30])}."
_m, _k = circular_mean([0, 120, 241])
assert _k < 0.02, "Directions spread round the circle have a small concentration."
for _bad in [[], [0, 180], [0, 90, 180, 270]]:
    try:
        circular_mean(_bad)
        assert False, f"circular_mean({_bad}) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Average the unit vectors, not the numbers: the mean of 350° and 10° is 0°, and the length of the average says how much the directions agree."
```

Hint: Average `cos(radians(a))` and `sin(radians(a))` separately. `to_polar` of that average point gives its length and its direction; `math.atan2(y, x)` with `% 360` puts the direction in [0, 360).
:::

::: challenge Piston speed [hard]
Write `piston_position(theta, r, l)` that works on single angles and NumPy arrays (radians), using the crank–slider formula, and raises `ValueError` unless 0 < r < l. Then write `piston_speed(rpm, r, l, samples=3600)`: turning the crank at constant `rpm`, return a tuple `(max_speed, crank_deg)`: the largest piston speed in metres per second (r and l are in millimetres) and the crank angle in degrees where it occurs, found by sampling `samples` equally spaced angles over one turn (from 0, excluding 360) and differentiating with **central differences** in time, wrapping around the turn (the sample before angle 0 is the last one). The motion is symmetric, so the same top speed occurs at θ and at 360° − θ: report the angle in the first half turn, searching only the samples from 0° to 180° inclusive (the first `samples // 2 + 1`). Round the speed to 3 decimal places and the angle to 1 decimal place. Use array operations. For an infinitely long rod the maximum is ωr at 90°, so with a finite rod expect a little more, a little before 90°.

```python starter
def piston_position(theta, r, l):
    return r * np.cos(theta) + l

def piston_speed(rpm, r, l, samples=3600):
    omega = rpm * 2 * math.pi / 60
    return (round(omega * r / 1000, 3), 90.0)

print(piston_speed(3000, 40, 120))
```

```python solution
def piston_position(theta, r, l):
    if not 0 < r < l:
        raise ValueError("need 0 < r < l")
    return r * np.cos(theta) + np.sqrt(l ** 2 - (r * np.sin(theta)) ** 2)

def piston_speed(rpm, r, l, samples=3600):
    omega = rpm * 2 * math.pi / 60
    th = np.arange(samples) * 2 * np.pi / samples
    x = piston_position(th, r, l) / 1000
    dt = (2 * np.pi / samples) / omega
    v = (np.roll(x, -1) - np.roll(x, 1)) / (2 * dt)
    i = int(np.argmax(np.abs(v[: samples // 2 + 1])))
    return round(float(abs(v[i])), 3), round(float(np.degrees(th[i])), 1)

print(piston_speed(3000, 40, 120))
```

```python test
for _n in ["piston_position", "piston_speed"]:
    assert _n in dir(), f"Define {_n}."
assert abs(piston_position(0, 40, 120) - 160) < 1e-12 and abs(piston_position(math.pi, 40, 120) - 80) < 1e-12, "Top (r + l) and bottom (l - r)."
assert abs(piston_position(math.pi / 2, 40, 120) - math.sqrt(120 ** 2 - 40 ** 2)) < 1e-12, "At 90°."
_arr = piston_position(np.array([0.0, np.pi]), 40, 120)
assert isinstance(_arr, np.ndarray) and np.allclose(_arr, [160, 80]), "Works on arrays."
for _bad in [(0, 120), (120, 120), (130, 120), (-5, 120)]:
    try:
        piston_position(0.3, *_bad)
        assert False, f"r, l = {_bad} should raise ValueError."
    except ValueError:
        pass
_v, _deg = piston_speed(3000, 40, 120)
assert _v == 13.253 and _deg == 73.2, f"Expected (13.253, 73.2) for 3000 rpm, r = 40, l = 120; got {(_v, _deg)}."
_w = 3000 * 2 * math.pi / 60
_vl, _dl = piston_speed(3000, 40, 40000)
assert abs(_vl - _w * 0.040) < 0.01 and abs(_dl - 90) < 0.5, "A very long rod gives ωr at 90°."
assert piston_speed(1500, 40, 120) == (6.626, 73.2), "Half the rpm, half the speed, at the same angle."
_v2, _ = piston_speed(3000, 40, 120, samples=36000)
assert abs(_v2 - _v) < 0.01, "More samples should change the answer very little."
"SUCCESS: The piston peaks about 5% faster than ωr, at 73° of crank rather than 90°: the short rod's signature."
```

Hint: Sample `th = np.arange(samples) * 2π / samples`, convert positions to metres, and use `np.roll(x, -1) - np.roll(x, 1)` for the wrap-around central difference, divided by twice the time step `(2π / samples) / ω`. `np.argmax(np.abs(v[:samples // 2 + 1]))` finds the fastest sample in the first half turn.
:::

## What you learned

- cos θ and sin θ are the coordinates of the point at angle θ on the unit circle, for any angle; cos²θ + sin²θ = 1.
- Rotation at speed ω gives the sinusoid A sin(ωt + φ) with period 2π/ω; cosine is sine shifted by a quarter period.
- In a right triangle, sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent. Inverse functions return principal values; `atan2(y, x)` gives a point's direction in the correct quadrant.
- Polar coordinates (r, θ) convert to x = r cos θ, y = r sin θ; bolt circles are polar positions, with neighbour spacing PCD × sin(π/n).
- A crank–slider's piston follows r cos θ + √(l² − r² sin²θ): close to a cosine, but faster near the top. Average directions by averaging unit vectors.

The next lesson turns arrows with size and direction into objects of their own: vectors.
