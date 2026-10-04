# Polar curves

Some shapes are naturally described by how far they are from a centre at each angle. A cam's outline is a radius that changes as it turns. A spiral toolpath winds outwards by a fixed step per revolution. A radar trace, an antenna's pattern and a flower's petals all live around a centre. **Polar curves** give r as a function of the angle θ, and many shapes that are awkward as y = f(x) become one-line formulas. This lesson draws them and computes with them: Archimedean and logarithmic spirals, cam profiles and their follower motion, areas swept out from the centre, and the constant-angle property that makes the logarithmic spiral special.

This lesson covers:

- polar curves r(θ) and their conversion to x and y;
- the Archimedean spiral: constant pitch, turns and length;
- cams: rise–dwell–return profiles, and the follower's velocity and acceleration;
- areas in polar coordinates, A = ½∫r²dθ;
- the logarithmic spiral and its constant angle.

## Curves around a centre

::: math
\[ r = f(\theta), \qquad x = f(\theta)\cos\theta, \quad y = f(\theta)\sin\theta \]
- rose $r = \cos(k\theta)$: $k$ petals for odd $k$, $2k$ for even $k$; cardioid $r = a(1 + \cos\theta)$; Archimedean spiral $r = a + b\theta$; logarithmic spiral $r = a\,e^{b\theta}$
- a polar curve is a parametric curve with the angle as the parameter
In code: `polar_xy(f, theta)` draws four classic curves
:::

A **polar curve** gives the distance from a centre as a function of direction: r = f(θ). Each point is converted with the polar coordinates of the sine and cosine lesson, x = r cos θ and y = r sin θ, so a polar curve is just a parametric curve whose parameter happens to be the angle. Simple formulas give striking shapes. Roses r = cos(kθ) have k or 2k petals. The heart-shaped **cardioid** is the curve traced by a point on a circle rolling round another of the same size. Spirals wind outwards as θ grows.

Predict before running: how many petals does r = cos(3θ) have, and r = cos(2θ)?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def polar_xy(f, theta):
    r = f(theta)
    return r * np.cos(theta), r * np.sin(theta)

th = np.linspace(0, 2 * np.pi, 2001)
curves = {
    "rose cos 3θ": (lambda t: np.cos(3 * t), th),
    "rose cos 2θ": (lambda t: np.cos(2 * t), th),
    "cardioid 1 + cos θ": (lambda t: 1 + np.cos(t), th),
    "spiral 0.1θ (3 turns)": (lambda t: 0.1 * t, np.linspace(0, 6 * np.pi, 3001)),
}
fig, axes = plt.subplots(1, 4, figsize=(13, 3.2))
for ax, (name, (f, tt)) in zip(axes, curves.items()):
    ax.plot(*polar_xy(f, tt))
    ax.set_aspect("equal")
    ax.set_title(name, fontsize=9)
plt.show()
for k in [3, 2]:
    r = np.cos(k * th)
    neg = np.sum((r[:-1] >= 0) & (r[1:] < 0))
    print(f"cos {k}θ: {neg} stretches of positive r and {neg} of negative r over a full turn")
```

The plots show three petals for cos 3θ and four for cos 2θ. Over a full turn, cos 3θ has 3 stretches of positive r and 3 of negative r, and cos 2θ has 2 of each. A negative r plots the point on the opposite side of the centre. For odd k those points land exactly on the positive petals again, so only k petals appear. For even k they fill new directions, giving 2k. The cardioid has a cusp at the origin, and the Archimedean spiral's turns are evenly spaced.

## The Archimedean spiral

::: math
\[ r = a + b\,\theta, \qquad \text{pitch } p = 2\pi b, \qquad \text{turns } = \frac{r_\text{end} - r_\text{start}}{p}, \qquad L = \int \sqrt{r^2 + \Big(\frac{dr}{d\theta}\Big)^2}\,d\theta \]
- the distance between successive turns is the same everywhere: the **pitch**
- the arc length element in polar coordinates is $\sqrt{r^2 + r'^2}\,d\theta$; for many turns $L \approx \pi\,(r_\text{start} + r_\text{end}) \times \text{turns}$
In code: a spiral pocketing path from 5 mm to 40 mm radius with a 4 mm stepover: turns, length and the average-circle estimate
:::

An **Archimedean spiral** grows its radius by the same amount for each radian, so successive turns are a constant distance apart: the **pitch** 2πb. That makes it the ideal path for clearing a circular pocket. The cutter spirals outwards with a constant stepover and never has to lift or reverse. The same curve is the groove of a vinyl record, the shape of scroll compressors and clock springs, and the path of a reading head on old disc drives. Its length follows from the polar arc-length formula, but for many turns a simple estimate works well: each turn is about a circle at the average radius.

Predict before running: clearing a pocket from 5 mm to 40 mm radius with a 4 mm stepover. How many turns, and how long is the path?

```python
r0, r1, pitch = 5.0, 40.0, 4.0
b = pitch / (2 * np.pi)
turns = (r1 - r0) / pitch
theta_end = 2 * np.pi * turns
tt = np.linspace(0, theta_end, 200001)
r = r0 + b * tt
length_formula = np.trapezoid(np.sqrt(r ** 2 + b ** 2), tt)
length_chords = np.hypot(np.diff(r * np.cos(tt)), np.diff(r * np.sin(tt))).sum()
estimate = np.pi * (r0 + r1) * turns
print(f"{turns:.2f} turns; path length {length_formula:.2f} mm by the polar formula, {length_chords:.2f} mm by chords; average-circle estimate {estimate:.2f} mm")
print(f"radius after exactly 3 turns: {r0 + b * 6 * np.pi:.1f} mm")
```

The spiral makes 8.75 turns and is about 1,237 mm long. The polar integral and the chord sum agree, and the average-circle estimate π(5 + 40) × 8.75 = 1,237 mm is within a fraction of a millimetre, because the √(r² + r′²) correction is tiny when the pitch is small compared with the radius. After exactly three turns the radius is 17 mm: 5 plus 3 pitches.

## Cams

::: math
\[ s(\theta) = h\left(\frac{\theta}{\beta} - \frac{1}{2\pi}\sin\frac{2\pi\theta}{\beta}\right) \;(0 \le \theta \le \beta), \qquad r(\theta) = r_b + s(\theta), \qquad v = \omega\,\frac{ds}{d\theta}, \quad a = \omega^2\,\frac{d^2 s}{d\theta^2} \]
- $s$: follower lift; $h$: total lift; $\beta$: the rise angle; $r_b$: base-circle radius; $\omega$: cam speed in rad/s
- the **cycloidal** rise starts and ends with zero velocity and zero acceleration, so it joins the dwells without a jump in acceleration
- the simpler **harmonic** rise $s = \tfrac{h}{2}(1 - \cos(\pi\theta/\beta))$ has zero velocity at the ends but a jump in acceleration
In code: rise–dwell–return–dwell profiles for both laws; the follower's peak velocity and acceleration, and the acceleration jump
:::

A **cam** turns rotation into a prescribed back-and-forth motion. A follower rests on its edge, and the cam's radius at each angle sets the follower's position. Designers describe the motion by its **lift** s(θ) over the base circle: rise, dwell (hold still), return, dwell. The polar profile is just r = r_b + s(θ). The choice of rise curve matters as much as for the motion profiles of the piecewise lesson. With the cam turning at ω, the follower's velocity is ω ds/dθ and its acceleration ω² d²s/dθ². A **harmonic** (cosine) rise is smooth in position and velocity, but its acceleration jumps at the start and end of the rise, a hammer blow at every cycle. The **cycloidal** rise also brings the acceleration to zero at both ends, and is the standard choice for fast cams.

Predict before running: a cam lifts 10 mm over 120°, dwells 60°, returns over 120° and dwells 60°, at 600 rpm. Which law has the larger peak acceleration, and how big are the jumps?

```python
def lift(theta_deg, law, h=10.0, rise=120.0, dwell1=60.0, ret=120.0):
    t = np.mod(theta_deg, 360.0)
    def up(u):
        u = np.clip(u, 0, 1)
        return h * (u - np.sin(2 * np.pi * u) / (2 * np.pi)) if law == "cycloidal" else h / 2 * (1 - np.cos(np.pi * u))
    return np.where(t < rise, up(t / rise),
           np.where(t < rise + dwell1, h,
           np.where(t < rise + dwell1 + ret, h - up((t - rise - dwell1) / ret), 0.0)))

omega = 600 * 2 * np.pi / 60
deg = np.linspace(0, 360, 36001)
rad = np.radians(deg)
for law in ["harmonic", "cycloidal"]:
    s = lift(deg, law)
    v = omega * np.gradient(s, rad) / 1000
    acc = omega * np.gradient(v, rad)
    jump = np.abs(np.diff(acc)).max()
    print(f"{law:<9}: peak velocity {np.abs(v).max():.3f} m/s, peak acceleration {np.abs(acc).max():.0f} m/s², largest acceleration jump between samples {jump:.0f} m/s²")

profile_r = 30 + lift(deg, "cycloidal")
fig, ax = plt.subplots(figsize=(4, 4))
ax.plot(profile_r * np.cos(rad), profile_r * np.sin(rad))
ax.plot(30 * np.cos(rad), 30 * np.sin(rad), ":", color="grey")
ax.set_aspect("equal")
ax.set_title("cycloidal cam on a 30 mm base circle", fontsize=9)
plt.show()
```

At 600 rpm the harmonic rise peaks at 0.47 m/s and 44 m/s². The cycloidal rise needs a higher peak velocity (0.60 m/s) and peak acceleration (57 m/s²) to cover the same lift. But the harmonic law's acceleration jumps from 0 to about 44 m/s² at each transition (the sampled derivative spreads the jump over a few samples, so neighbouring samples differ by up to 17 m/s²), while the cycloidal law's changes by well under 1 m/s² between samples. Higher but smooth acceleration is gentler on the follower spring and bearings than lower acceleration that jumps. That is why high-speed cams use cycloidal or polynomial laws.

## Areas from the centre

::: math
\[ A = \frac{1}{2}\int_{\theta_1}^{\theta_2} r(\theta)^2\,d\theta, \qquad \text{cardioid } r = a(1 + \cos\theta): \; A = \frac{3\pi a^2}{2} \]
- a thin wedge of angle $d\theta$ and radius $r$ is nearly a triangle of area $\tfrac{1}{2}r^2\,d\theta$
- adding the wedges sweeps out the area enclosed by the curve
In code: `polar_area` by the trapezoid rule for a circle, a cardioid, a rose and the cam profile
:::

The area enclosed by a polar curve is swept out by thin wedges from the centre. A wedge of angle dθ is nearly an isosceles triangle with two sides of length r, so its area is ½r²dθ. Adding them, the integral A = ½∫r²dθ, gives the area. It is the accumulation lesson's integral, with wedges instead of strips. For a full circle it gives πR². For the cardioid it gives 3πa²/2, one and a half times the area of the circle that generates it. For a cam, the area times the thickness and density gives its mass.

Predict before running: what are the areas of a unit circle, a cardioid with a = 1, the rose cos 3θ, and the cycloidal cam on its 30 mm base circle?

```python
def polar_area(f, a, b, n=200001):
    tt = np.linspace(a, b, n)
    return 0.5 * np.trapezoid(f(tt) ** 2, tt)

print(f"unit circle: {polar_area(lambda t: np.ones_like(t), 0, 2 * np.pi):.6f} (π = {np.pi:.6f})")
print(f"cardioid a = 1: {polar_area(lambda t: 1 + np.cos(t), 0, 2 * np.pi):.6f} (3π/2 = {1.5 * np.pi:.6f})")
print(f"rose cos 3θ over θ from 0 to π: {polar_area(lambda t: np.cos(3 * t), 0, np.pi):.6f} (π/4 = {np.pi / 4:.6f})")
cam_area = polar_area(lambda t: 30 + lift(np.degrees(t), "cycloidal"), 0, 2 * np.pi)
print(f"cam: {cam_area:.1f} mm² against the base circle's {np.pi * 30 ** 2:.1f} mm²; a 12 mm thick steel cam weighs {cam_area * 12 * 7.85e-3:.0f} g")
```

The unit circle gives π, the cardioid 3π/2 and the three-petal rose π/4, all to six decimals. The rose needs care: integrating over the full 2π would trace each petal twice and double the area, so the range is θ from 0 to π. The cam encloses about 3,905 mm², about 38% more than its 2,827 mm² base circle. A 12 mm thick steel cam would weigh about 368 g.

## The logarithmic spiral

::: math
\[ r = a\,e^{b\theta}, \qquad \tan\psi = \frac{r}{dr/d\theta} = \frac{1}{b}, \qquad \frac{r(\theta + 2\pi)}{r(\theta)} = e^{2\pi b} \]
- $\psi$: the angle between the curve's tangent and the radius; for a logarithmic spiral it is the same at every point (**equiangular**)
- each turn multiplies the radius by the same factor: scaling the spiral is the same as rotating it
- the Archimedean spiral's angle is not constant: it tends to 90° as the spiral grows
In code: the tangent–radius angle along both spirals, from the curve's velocity vector
:::

The **logarithmic spiral** r = a e^(bθ) grows by the same **factor** per turn, where the Archimedean spiral grows by the same **amount**. It has a striking property. The angle between its tangent and the radius is the same everywhere, which is why it is also called the **equiangular spiral**. Nature uses it in nautilus shells, the arms of hurricanes and galaxies, and the paths of insects flying at a fixed angle to a light. Engineers use it where a constant angle matters: in some cutting-tool clearance curves, cam followers, and the spiral bevel gear's tooth line. Its constant angle makes it self-similar, so a magnified copy is the same spiral, rotated.

Predict before running: for r = e^(0.2θ), what is the angle between tangent and radius at several points? And for the Archimedean spiral r = 0.5θ?

```python
def tangent_radius_angle(f, theta, h=1e-6):
    pts = lambda t: np.array([f(t) * math.cos(t), f(t) * math.sin(t)])
    velocity = (pts(theta + h) - pts(theta - h)) / (2 * h)
    radial = pts(theta) / np.linalg.norm(pts(theta))
    cos_psi = abs(velocity @ radial) / np.linalg.norm(velocity)
    return math.degrees(math.acos(min(1.0, cos_psi)))

log_sp = lambda t: math.exp(0.2 * t)
arch_sp = lambda t: 0.5 * t
for th_ in [0.5, 3.0, 10.0, 30.0]:
    print(f"θ = {th_:>4}: logarithmic {tangent_radius_angle(log_sp, th_):.4f}°, Archimedean {tangent_radius_angle(arch_sp, th_):.4f}°")
print(f"formula for the logarithmic spiral: atan(1/b) = {math.degrees(math.atan(1 / 0.2)):.4f}°; growth per turn e^(2πb) = {math.exp(2 * math.pi * 0.2):.3f}")
```

The logarithmic spiral's tangent meets the radius at 78.69° at every point, exactly atan(1/0.2). The Archimedean spiral's angle grows from 45° at θ = 0.5 towards 90° as it winds out, approaching a circle locally. Each turn of the logarithmic spiral multiplies the radius by e^(2π × 0.2) ≈ 3.51. Constant angle and constant growth factor are the same fact, seen two ways.

::: challenge Spirals [easy]
Write `polar_to_xy(r, theta)`: the coordinates (r cos θ, r sin θ) for numbers or NumPy arrays, as a tuple `(x, y)`. Write `spiral_turns(r_start, r_end, pitch)`: the number of turns of an Archimedean spiral with that pitch between the two radii, as a plain float (raise `ValueError` unless pitch > 0 and r_end ≥ r_start ≥ 0). Then write `spiral_length(r_start, r_end, pitch, n=100000)`: the arc length of that spiral, r = r_start + bθ with b = pitch/(2π), by summing n chords, as a plain float.

```python starter
import math
import numpy as np

def polar_to_xy(r, theta):
    return (r, theta)

def spiral_turns(r_start, r_end, pitch):
    return 0.0

def spiral_length(r_start, r_end, pitch, n=100000):
    return 0.0

print(spiral_turns(5, 40, 4), spiral_length(5, 40, 4))
```

```python solution
import math
import numpy as np

def polar_to_xy(r, theta):
    return r * np.cos(theta), r * np.sin(theta)

def spiral_turns(r_start, r_end, pitch):
    if pitch <= 0 or not 0 <= r_start <= r_end:
        raise ValueError("need pitch > 0 and 0 <= r_start <= r_end")
    return float((r_end - r_start) / pitch)

def spiral_length(r_start, r_end, pitch, n=100000):
    turns = spiral_turns(r_start, r_end, pitch)
    b = pitch / (2 * math.pi)
    t = np.linspace(0, 2 * math.pi * turns, n + 1)
    r = r_start + b * t
    return float(np.hypot(np.diff(r * np.cos(t)), np.diff(r * np.sin(t))).sum())

print(spiral_turns(5, 40, 4), spiral_length(5, 40, 4))
```

```python test
import math
import numpy as np
for _n in ["polar_to_xy", "spiral_turns", "spiral_length"]:
    assert _n in dir(), f"Define {_n}."
_x, _y = polar_to_xy(2.0, math.pi / 2)
assert abs(_x) < 1e-12 and abs(_y - 2) < 1e-12, "r = 2 at 90° is (0, 2)."
_xa, _ya = polar_to_xy(np.array([1.0, 2.0]), np.array([0.0, math.pi]))
assert np.allclose(_xa, [1, -2]) and np.allclose(_ya, [0, 0]), "Arrays work."
assert spiral_turns(5, 40, 4) == 8.75 and type(spiral_turns(0, 10, 2)) is float, "35 mm at 4 mm per turn: 8.75 turns."
for _bad in [(5, 40, 0), (40, 5, 4), (-1, 5, 2)]:
    try:
        spiral_turns(*_bad)
        assert False, f"spiral_turns{_bad} should raise ValueError."
    except ValueError:
        pass
_L = spiral_length(5, 40, 4)
assert type(_L) is float and abs(_L - 1236.8) < 1.0, f"The pocketing spiral is about 1,237 mm long; got {_L}."
assert abs(spiral_length(10, 10.0001, 0.0001, n=1000) - 2 * math.pi * 10) < 1e-3, "One turn of a tiny pitch is nearly a circle."
_exact = (lambda th: 0.5 * th * math.sqrt(1 + th * th) + 0.5 * math.asinh(th))(4 * math.pi)
assert abs(spiral_length(0, 4 * math.pi, 2 * math.pi) - _exact) < 1e-4, "From the centre with b = 1: matches the exact Archimedean arc length."
"SUCCESS: An Archimedean spiral keeps a constant pitch, and its length is close to circles at the average radius."
```

Hint: The number of turns is the radius gained divided by the pitch. Sample θ from 0 to 2π × turns, compute r = r_start + bθ, convert to x and y, and add the chord lengths.
:::

::: challenge Cam lift [medium]
Write `cycloidal_rise(u)`: the normalised cycloidal rise u − sin(2πu)/(2π) for u in [0, 1] (a number or NumPy array; values of u outside [0, 1] are clipped). Then write `cam_lift(theta_deg, h, rise_deg, dwell_deg, return_deg)`: the lift of a rise–dwell–return–dwell cam (the last dwell fills the rest of 360°) using the cycloidal law for both rise and return, for a number or NumPy array of angles (taken modulo 360); raise `ValueError` if the three angles add up to more than 360 or any is negative, or h ≤ 0. Finally write `follower_peaks(h, rise_deg, rpm)`: the peak follower velocity (m/s) and acceleration (m/s²) during a cycloidal rise of h mm over rise_deg at that cam speed, from the exact formulas v_max = 2hω/β and a_max = 2πhω²/β² (β in radians, h converted to metres), as plain floats.

```python starter
import math
import numpy as np

def cycloidal_rise(u):
    return u

def cam_lift(theta_deg, h, rise_deg, dwell_deg, return_deg):
    return 0.0

def follower_peaks(h, rise_deg, rpm):
    return (0.0, 0.0)

print(cam_lift(60, 10, 120, 60, 120), follower_peaks(10, 120, 600))
```

```python solution
import math
import numpy as np

def cycloidal_rise(u):
    u = np.clip(np.asarray(u, dtype=float), 0, 1)
    out = u - np.sin(2 * np.pi * u) / (2 * np.pi)
    return float(out) if out.ndim == 0 else out

def cam_lift(theta_deg, h, rise_deg, dwell_deg, return_deg):
    if h <= 0 or min(rise_deg, dwell_deg, return_deg) < 0 or rise_deg + dwell_deg + return_deg > 360:
        raise ValueError("bad cam definition")
    t = np.mod(np.asarray(theta_deg, dtype=float), 360.0)
    up = h * np.asarray(cycloidal_rise(t / rise_deg)) if rise_deg > 0 else np.full(t.shape, float(h))
    down = h - h * np.asarray(cycloidal_rise((t - rise_deg - dwell_deg) / return_deg)) if return_deg > 0 else np.zeros(t.shape)
    s = np.where(t < rise_deg, up, np.where(t < rise_deg + dwell_deg, h, np.where(t < rise_deg + dwell_deg + return_deg, down, 0.0)))
    return float(s) if s.ndim == 0 else s

def follower_peaks(h, rise_deg, rpm):
    w = rpm * 2 * math.pi / 60
    beta = math.radians(rise_deg)
    hm = h / 1000
    return float(2 * hm * w / beta), float(2 * math.pi * hm * w * w / beta ** 2)

print(cam_lift(60, 10, 120, 60, 120), follower_peaks(10, 120, 600))
```

```python test
import math
import numpy as np
for _n in ["cycloidal_rise", "cam_lift", "follower_peaks"]:
    assert _n in dir(), f"Define {_n}."
assert cycloidal_rise(0.0) == 0.0 and cycloidal_rise(1.0) == 1.0 and abs(cycloidal_rise(0.5) - 0.5) < 1e-15, "Rises from 0 to 1, halfway at the middle."
assert cycloidal_rise(-0.3) == 0.0 and cycloidal_rise(1.7) == 1.0 and type(cycloidal_rise(0.25)) is float, "Clipped outside [0, 1]; plain float."
_u = np.linspace(0, 1, 1001)
_d = np.gradient(np.asarray(cycloidal_rise(_u)), _u)
assert abs(_d[0]) < 1e-3 and abs(_d[-1]) < 1e-3 and abs(_d[500] - 2) < 1e-3, "Zero slope at both ends, slope 2 in the middle."
assert abs(cam_lift(60, 10, 120, 60, 120) - 5.0) < 1e-12 and cam_lift(150, 10, 120, 60, 120) == 10.0, "Half the lift at mid-rise; full lift in the dwell."
assert abs(cam_lift(240, 10, 120, 60, 120) - 5.0) < 1e-12 and cam_lift(330, 10, 120, 60, 120) == 0.0 and abs(cam_lift(420, 10, 120, 60, 120) - 5.0) < 1e-12, "Mid-return; final dwell; modulo 360."
_all = np.asarray(cam_lift(np.linspace(0, 360, 3601), 10, 120, 60, 120))
assert _all.shape == (3601,) and _all.min() >= -1e-12 and _all.max() <= 10 + 1e-12, "Arrays in, arrays out, between 0 and h."
for _bad in [(0, 10, 200, 100, 100), (0, 10, 120, -10, 120), (0, 0, 120, 60, 120)]:
    try:
        cam_lift(*_bad)
        assert False, f"cam_lift{_bad} should raise ValueError."
    except ValueError:
        pass
_v, _a = follower_peaks(10, 120, 600)
assert type(_v) is float and abs(_v - 0.6) < 1e-9 and abs(_a - 2 * math.pi * 0.01 * (20 * math.pi) ** 2 / (2 * math.pi / 3) ** 2) < 1e-6, f"0.60 m/s and about 56.5 m/s²; got {(_v, _a)}."
_v2, _a2 = follower_peaks(10, 120, 1200)
assert abs(_v2 / _v - 2) < 1e-12 and abs(_a2 / _a - 4) < 1e-12, "Twice the speed: twice the velocity, four times the acceleration."
"SUCCESS: A cam is a polar curve; cycloidal rises join the dwells smoothly, and doubling the speed quadruples the follower's acceleration."
```

Hint: Normalise the angle within each phase to u in [0, 1] and use h·cycloidal_rise(u) for the rise and h − h·cycloidal_rise(u) for the return; `np.where` chooses the phase. ω = rpm × 2π/60 and β = the rise angle in radians.
:::

::: challenge Polar area and the equiangular spiral [hard]
Write `polar_area(f, a, b, n=100001)`: ½∫ₐᵇ f(θ)² dθ by the trapezoid rule on n points, where f takes a NumPy array, as a plain float; raise `ValueError` if b < a or n < 2. Write `tangent_angle(f, theta, h=1e-6)`: the angle in degrees (between 0 and 90) between the tangent of the polar curve r = f(θ) and the radius at θ, from tan ψ = |r|/|dr/dθ| with a central-difference derivative (90 when dr/dθ = 0), as a plain float; f here takes a number. Then write `log_spiral_b(psi_deg)`: the growth constant b of the logarithmic spiral r = e^(bθ) whose tangent meets every radius at ψ (0 < ψ < 90), as a plain float; raise `ValueError` otherwise.

```python starter
import math
import numpy as np

def polar_area(f, a, b, n=100001):
    return 0.0

def tangent_angle(f, theta, h=1e-6):
    return 0.0

def log_spiral_b(psi_deg):
    return 0.0

print(polar_area(lambda t: 1 + np.cos(t), 0, 2 * np.pi))
```

```python solution
import math
import numpy as np

def polar_area(f, a, b, n=100001):
    if b < a or n < 2:
        raise ValueError("need b >= a and n >= 2")
    t = np.linspace(a, b, n)
    return float(0.5 * np.trapezoid(np.asarray(f(t), dtype=float) ** 2, t))

def tangent_angle(f, theta, h=1e-6):
    r = f(theta)
    dr = (f(theta + h) - f(theta - h)) / (2 * h)
    if dr == 0:
        return 90.0
    return float(math.degrees(math.atan(abs(r) / abs(dr))))

def log_spiral_b(psi_deg):
    if not 0 < psi_deg < 90:
        raise ValueError("psi must be strictly between 0 and 90 degrees")
    return float(1 / math.tan(math.radians(psi_deg)))

print(polar_area(lambda t: 1 + np.cos(t), 0, 2 * np.pi))
```

```python test
import math
import numpy as np
for _n in ["polar_area", "tangent_angle", "log_spiral_b"]:
    assert _n in dir(), f"Define {_n}."
assert abs(polar_area(lambda t: 2 * np.ones_like(t), 0, 2 * math.pi) - 4 * math.pi) < 1e-9, "Circle of radius 2: 4π."
_c = polar_area(lambda t: 1 + np.cos(t), 0, 2 * math.pi)
assert type(_c) is float and abs(_c - 1.5 * math.pi) < 1e-9, f"Cardioid: 3π/2; got {_c}."
assert abs(polar_area(lambda t: np.cos(3 * t), 0, math.pi) - math.pi / 4) < 1e-9, "Three-petal rose over [0, π]: π/4."
assert abs(polar_area(lambda t: t, 0, 2 * math.pi) - (2 * math.pi) ** 3 / 6) < 1e-6, "First turn of r = θ: (2π)³/6."
for _bad in [(lambda t: t, 1, 0), (lambda t: t, 0, 1, 1)]:
    try:
        polar_area(*_bad)
        assert False, "Bad range or n should raise ValueError."
    except ValueError:
        pass
for _th in [0.3, 2.0, 7.5]:
    assert abs(tangent_angle(lambda t: math.exp(0.2 * t), _th) - math.degrees(math.atan(5))) < 1e-5, "Logarithmic spiral: the same angle everywhere."
assert abs(tangent_angle(lambda t: 0.5 * t, 1.0) - 45.0) < 1e-6 and tangent_angle(lambda t: 3.0, 1.0) == 90.0, "Archimedean at θ = 1: 45°; a circle: 90°."
assert type(tangent_angle(lambda t: 0.5 * t, 4.0)) is float and tangent_angle(lambda t: 0.5 * t, 4.0) > 75, "The Archimedean angle grows towards 90°."
_b = log_spiral_b(78.69006752597979)
assert abs(_b - 0.2) < 1e-12 and type(_b) is float, "ψ = atan(5) gives b = 0.2."
assert abs(tangent_angle(lambda t: math.exp(log_spiral_b(60.0) * t), 1.0) - 60.0) < 1e-6, "Round trip: b from ψ, ψ from the spiral."
for _bad in [0, 90, 120]:
    try:
        log_spiral_b(_bad)
        assert False, f"psi = {_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Polar areas are swept out by wedges ½r²dθ, and a constant tangent angle is the logarithmic spiral's signature."
```

Hint: Area: `0.5 * np.trapezoid(f(t) ** 2, t)`. The tangent–radius angle satisfies tan ψ = r/(dr/dθ); use the absolute values and `math.atan`. For a logarithmic spiral dr/dθ = br, so tan ψ = 1/b and b = 1/tan ψ.
:::

## What you learned

- A polar curve r = f(θ) is a parametric curve with the angle as parameter; roses, cardioids and spirals have one-line polar formulas.
- The Archimedean spiral r = a + bθ has constant pitch 2πb, ideal for spiral pocketing; for many turns its length is close to circles at the average radius.
- A cam's profile is r = r_b + s(θ); the follower's velocity and acceleration are ω ds/dθ and ω² d²s/dθ², and cycloidal rises avoid the acceleration jumps of harmonic ones.
- Polar areas are A = ½∫r²dθ, swept out by thin wedges; care is needed with curves that retrace themselves.
- The logarithmic spiral r = ae^(bθ) meets every radius at the same angle, atan(1/b), and grows by the same factor each turn.

The next lesson closes Block A by solving several non-linear equations at once: where curves intersect and how mechanisms close.
