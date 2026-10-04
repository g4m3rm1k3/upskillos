# Inverse trigonometry and atan2

Sensors rarely measure angles directly. An accelerometer measures the components of gravity, an encoder's quadrature channels give a sine and a cosine, and a GPS track gives east and north displacements. To get an angle you run the trigonometric functions backwards. That is where the trouble starts. A sine of 0.5 belongs to 30° and to 150°, a slope y/x cannot tell north-east from south-west, and an angle that steps from 179° to −179° has moved by 2°, not 358°. This lesson handles each of these problems: principal values, the two-argument arctangent, wrapping and unwrapping, averaging angles, and choosing the inverse function that is least sensitive to noise.

This lesson covers:

- principal values of arcsin, arccos and arctan, and finding every solution;
- atan2, the arctangent that knows the quadrant;
- wrapping angle differences and averaging angles correctly;
- unwrapping a wrapped angle signal to count revolutions;
- tilt from an accelerometer, and why atan2 beats arcsin there.

## Principal values and all solutions

::: math
\[ \arcsin s \in [-\tfrac{\pi}{2}, \tfrac{\pi}{2}], \quad \arccos c \in [0, \pi], \quad \arctan t \in (-\tfrac{\pi}{2}, \tfrac{\pi}{2}) \]
\[ \sin\theta = s:\; \theta = \arcsin s \;\text{ or }\; \pi - \arcsin s, \qquad \cos\theta = c:\; \theta = \pm\arccos c, \qquad \tan\theta = t:\; \theta = \arctan t + k\pi \]
- each inverse returns one **principal value**; the others come from the symmetries of the circle, plus any multiple of $2\pi$
- in code, `math.asin`, `math.acos` and `math.atan` return radians in these ranges; arcsin and arccos raise an error outside $[-1, 1]$
In code: the principal values for sine 0.5, cosine −0.5 and tangent −1, and every solution in [0°, 360°)
:::

Sine, cosine and tangent are not one-to-one: each value is taken twice per turn (or, for the tangent, every half turn). An inverse function must pick one answer, the **principal value**, from a fixed range. The others follow from the circle's symmetry. Sine is symmetric about 90°, so sin θ = s also at 180° − arcsin s. Cosine is symmetric about 0°, so cos θ = c also at −arccos c. Tangent repeats every 180°. Which solution is physically right depends on information the inverse function never sees. That is the main lesson of this section.

Predict before running: which angles in [0°, 360°) have sine 0.5, cosine −0.5, tangent −1? Which one does each inverse function return?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def all_solutions(kind, v):
    if kind == "sin":
        p = math.degrees(math.asin(v)); cands = [p, 180 - p]
    elif kind == "cos":
        p = math.degrees(math.acos(v)); cands = [p, -p]
    else:
        p = math.degrees(math.atan(v)); cands = [p, p + 180]
    return p, sorted({round(c % 360, 9) for c in cands})

for kind, v in [("sin", 0.5), ("cos", -0.5), ("tan", -1.0), ("sin", 1.0)]:
    p, sols = all_solutions(kind, v)
    print(f"{kind} θ = {v:+.1f}: principal value {p:7.2f}°, all solutions in [0, 360): {sols}")
try:
    math.asin(1.0000001)
except ValueError as e:
    print("asin(1.0000001):", e)
```

Sine 0.5 belongs to 30° and 150°, and arcsin returns 30°. Cosine −0.5 belongs to 120° and 240°, and arccos returns 120°. Tangent −1 belongs to 135° and 315°, and arctan returns −45° (which is 315°). Sine 1 has the single solution 90°, because the two candidates coincide. And arcsin of a value just above 1, which floating-point rounding can easily produce from a measured ratio, raises a "math domain error". Code that computes asin(a/b) from measurements should clip the ratio to [−1, 1] first.

## atan2: the arctangent that knows the quadrant

::: math
\[ \theta = \operatorname{atan2}(y, x) \in (-\pi, \pi], \qquad x = r\cos\theta,\; y = r\sin\theta \]
- $\arctan(y/x)$ cannot tell $(x, y)$ from $(-x, -y)$, because the ratio is the same; atan2 takes the two numbers separately and keeps their signs
- atan2 also works when $x = 0$, where $y/x$ is undefined
- note the argument order: $y$ first
In code: four points, one per quadrant, through arctan(y/x) and through atan2
:::

The tangent alone loses information. The point (1, 1) and the point (−1, −1) have the same ratio y/x = 1 but point in opposite directions. **atan2(y, x)** takes the two components separately and uses their signs to choose the right quadrant, returning the full angle in (−180°, 180°]. It also handles x = 0 without dividing by zero. Every bearing from displacements, every phase from an I/Q pair, every heading from a magnetometer should use atan2. The previous lessons used it already; this section shows what happens without it.

Predict before running: what do arctan(y/x) and atan2(y, x) give for (1, 1), (−1, 1), (−1, −1), (1, −1) and (0, 2)?

```python
for x, y in [(1, 1), (-1, 1), (-1, -1), (1, -1), (0, 2)]:
    naive = math.degrees(math.atan(y / x)) if x != 0 else float("nan")
    full = math.degrees(math.atan2(y, x))
    print(f"({x:+d}, {y:+d}): arctan(y/x) {naive:7.1f}°   atan2 {full:7.1f}°   bearing from north {(90 - full) % 360:6.1f}°")
```

arctan(y/x) gives 45° for both (1, 1) and (−1, −1), and −45° for both (−1, 1) and (1, −1): two of the four answers are 180° wrong. It fails outright at (0, 2). atan2 gives 45°, 135°, −135° and −45°, and 90° for (0, 2). The last column converts the mathematical angle (counter-clockwise from east) to a compass **bearing** (clockwise from north): bearing = 90° − θ, wrapped to [0°, 360°). Mixing the two conventions is a classic navigation bug.

## Wrapping and averaging angles

::: math
\[ \operatorname{wrap}(\Delta) = \big((\Delta + 180°) \bmod 360°\big) - 180° \in [-180°, 180°), \qquad \bar\theta = \operatorname{atan2}\Big(\sum \sin\theta_i, \sum \cos\theta_i\Big) \]
- the difference between two headings must be wrapped, or 350° to 10° looks like −340° instead of +20°
- the **circular mean** $\bar\theta$ averages unit vectors, not numbers; the length of their mean, $R \in [0, 1]$, measures how concentrated the angles are
In code: the naive and circular mean of headings scattered around north
:::

Angles live on a circle, and arithmetic on them as plain numbers breaks at the seam. Turning from 350° to 10° is a 20° turn clockwise, but subtraction says −340°. The fix is to **wrap** the difference into [−180°, 180°). Averaging is worse. The naive mean of 350° and 10° is 180°, due south, when both headings point nearly north. The correct average, the **circular mean**, turns each angle into a unit vector (cos θ, sin θ), averages the vectors, and takes atan2 of the result. The length R of the mean vector is a bonus: 1 when all the angles agree, near 0 when they are spread around the circle.

Predict before running: a compass reports 200 headings scattered by about 8° around true north. What do the naive mean and the circular mean give?

```python
def wrap180(d):
    return (d + 180) % 360 - 180

print(f"turn from 350° to 10°: plain difference {10 - 350}°, wrapped {wrap180(10 - 350)}°")
rng = np.random.default_rng(78)
headings = (rng.normal(0, 8, 200)) % 360
naive_mean = headings.mean()
rad = np.radians(headings)
C, S = np.cos(rad).mean(), np.sin(rad).mean()
circ_mean = math.degrees(math.atan2(S, C))
R = math.hypot(C, S)
print(f"naive mean {naive_mean:.1f}°, circular mean {circ_mean:+.2f}°, concentration R = {R:.4f}")
print(f"spread from R: about {math.degrees(math.sqrt(-2 * math.log(R))):.1f}° (true scatter 8°)")
```

Wrapping turns −340° into the actual +20° turn. With headings scattered around north, half of them read near 0° and half near 360°, and the naive mean is about 180°: exactly the wrong direction. The circular mean is within a degree of north, and R ≈ 0.99 says the readings are tightly grouped. The circular standard deviation, √(−2 ln R), recovers the 8° scatter. Wind direction, vehicle heading, phase of a vibration and time of day (a circle of 24 hours) all need circular statistics.

## Unwrapping: counting revolutions

::: math
\[ \theta_{k}^{\text{unwrapped}} = \theta_{k-1}^{\text{unwrapped}} + \operatorname{wrap}(\theta_k - \theta_{k-1}) \]
- a sensor that reports the angle in $(-180°, 180°]$ jumps by about $360°$ at each revolution; unwrapping adds back the lost turns
- it works only if the true angle changes by less than $180°$ between samples (the sampling must be fast enough)
In code: a shaft accelerating from rest, read by an encoder that reports a wrapped angle; unwrap it to get the revolutions and the speed
:::

An absolute encoder, or atan2 of a sine/cosine pair, reports the shaft angle within one turn. A shaft that spins many turns produces a sawtooth. To recover the total angle, **unwrap** it: whenever consecutive samples differ by more than 180°, assume the shaft crossed the seam and add or subtract a full turn. NumPy's `np.unwrap` does this. The assumption fails if the shaft can move more than half a turn between samples. At that point the samples are too slow, an angular version of aliasing from the sampling lesson.

Predict before running: a shaft accelerates uniformly from rest to 1,500 rpm in 2 s. Sampled at 1 kHz, how many revolutions does it make, and can the unwrapped angle recover them? What about at 100 Hz?

```python
def shaft_angle(t):
    alpha = 1500 / 60 * 2 * math.pi / 2.0
    return 0.5 * alpha * t ** 2

for fs in [1000, 100]:
    t = np.arange(0, 2.0 + 1e-12, 1 / fs)
    true = shaft_angle(t)
    wrapped = np.angle(np.exp(1j * true))
    unwrapped = np.unwrap(wrapped)
    speed_rpm = np.diff(unwrapped)[-1] * fs / (2 * math.pi) * 60
    print(f"fs = {fs:>4} Hz: true {true[-1] / (2 * math.pi):.2f} rev, unwrapped {unwrapped[-1] / (2 * math.pi):.2f} rev, "
          f"final speed estimate {speed_rpm:7.1f} rpm, max step {np.degrees(np.diff(true)).max():.0f}°")

t = np.arange(0, 0.6, 1 / 1000)
fig, ax = plt.subplots(figsize=(8, 3.2))
ax.plot(t, np.degrees(np.angle(np.exp(1j * shaft_angle(t)))), lw=1, label="wrapped (sensor)")
ax.plot(t, np.degrees(np.unwrap(np.angle(np.exp(1j * shaft_angle(t))))), lw=2, label="unwrapped")
ax.set_xlabel("time (s)"); ax.set_ylabel("angle (°)"); ax.legend(); ax.grid(alpha=0.3)
plt.show()
```

The shaft turns 25 revolutions in 2 s. At 1 kHz the largest step between samples is 9°, far below 180°, and unwrapping recovers all 25 revolutions and a final speed of about 1,500 rpm. At 100 Hz the shaft moves up to 900° between samples at the end, more than two full turns. Unwrapping cannot know how many turns it missed, so it reports far fewer revolutions and a meaningless speed. The rule is the Nyquist idea again: the sensor must be read at least twice per revolution, and in practice much faster.

## Tilt from an accelerometer

::: math
\[ \text{pitch} = \arcsin\!\Big(\frac{-a_x}{g}\Big) \qquad\text{vs}\qquad \text{pitch} = \operatorname{atan2}\!\Big(-a_x, \sqrt{a_y^2 + a_z^2}\Big) \]
- a stationary accelerometer measures gravity, $(a_x, a_y, a_z)$; tilt is the angle of that vector
- arcsin uses one axis and assumes the magnitude is exactly $g$; its slope $1/\sqrt{1-s^2}$ blows up near $\pm 90°$
- atan2 uses all three axes, so a scale error (calibration, vibration) cancels, and its sensitivity is even in all directions
In code: noisy, slightly mis-scaled accelerometer readings at several pitch angles, through both formulas
:::

A phone's level app, a drone's attitude estimate and a crane's tilt alarm all read gravity from a three-axis accelerometer. Pitch can be computed from one axis with arcsin, or from all three with atan2. The arcsin version has two weaknesses. It assumes the measured vector has length exactly g, so a 2% gain error shows up as a tilt error. And near ±90° its derivative blows up, so a little noise becomes a large angle error and readings above g crash it. The atan2 version divides the gain error out, since scaling both arguments does not change the angle, and stays well-conditioned at every angle.

Predict before running: an accelerometer reads 2% high with noise of 0.01 g on each axis. At 10°, 60° and 85° pitch, how large are the errors of the two formulas?

```python
g = 9.81
rng = np.random.default_rng(780)
for pitch in [10.0, 60.0, 85.0]:
    p = math.radians(pitch)
    true_vec = g * np.array([-math.sin(p), 0.0, math.cos(p)])
    reads = 1.02 * true_vec + rng.normal(0, 0.01 * g, (2000, 3))
    asin_est = np.degrees(np.arcsin(np.clip(-reads[:, 0] / g, -1, 1)))
    atan_est = np.degrees(np.arctan2(-reads[:, 0], np.hypot(reads[:, 1], reads[:, 2])))
    rms = lambda e: math.sqrt(np.mean((e - pitch) ** 2))
    print(f"pitch {pitch:4.0f}°: arcsin RMS error {rms(asin_est):5.2f}°   atan2 RMS error {rms(atan_est):5.2f}°")
```

At 10° the two formulas are close, but the arcsin version already carries a 0.2° bias from the 2% gain error. At 60° the arcsin error grows to about 2°, because the gain error is amplified by 1/cos(60°). At 85° the arcsin version is badly wrong: the readings exceed g, clipping pins them at 90°, and the error reaches several degrees. The atan2 version stays at roughly half a degree everywhere, set only by the noise. The same idea applies whenever a ratio of measured components gives an angle: give atan2 both components rather than dividing first.

::: challenge Every solution [easy]
Write `solutions_deg(kind, v)` returning every angle in [0°, 360°) whose `kind` ("sin", "cos" or "tan") equals v, as a sorted list of plain floats rounded to 6 decimal places with no duplicates. Raise `ValueError` for an unknown kind, or for |v| > 1 with sine or cosine. Then write `bearing(dx_east, dy_north)`: the compass bearing (clockwise from north) of a displacement, as a plain float in [0, 360); raise `ValueError` for a zero displacement.

```python starter
import math

def solutions_deg(kind, v):
    return []

def bearing(dx_east, dy_north):
    return 0.0

print(solutions_deg("sin", 0.5), bearing(-1, -1))
```

```python solution
import math

def solutions_deg(kind, v):
    if kind == "sin":
        if abs(v) > 1:
            raise ValueError("|v| > 1")
        p = math.degrees(math.asin(v)); cands = [p, 180 - p]
    elif kind == "cos":
        if abs(v) > 1:
            raise ValueError("|v| > 1")
        p = math.degrees(math.acos(v)); cands = [p, -p]
    elif kind == "tan":
        p = math.degrees(math.atan(v)); cands = [p, p + 180]
    else:
        raise ValueError("kind must be sin, cos or tan")
    out = set()
    for c in cands:
        r = round(c % 360, 6)
        out.add(0.0 if r == 360.0 else float(r))
    return sorted(out)

def bearing(dx_east, dy_north):
    if dx_east == 0 and dy_north == 0:
        raise ValueError("zero displacement")
    return float(math.degrees(math.atan2(dx_east, dy_north)) % 360)

print(solutions_deg("sin", 0.5), bearing(-1, -1))
```

```python test
import math
for _n in ["solutions_deg", "bearing"]:
    assert _n in dir(), f"Define {_n}."
assert solutions_deg("sin", 0.5) == [30.0, 150.0], f"Sine 0.5: 30° and 150°; got {solutions_deg('sin', 0.5)}."
assert solutions_deg("cos", -0.5) == [120.0, 240.0] and solutions_deg("tan", -1) == [135.0, 315.0], "Cosine −0.5; tangent −1."
assert solutions_deg("sin", 1) == [90.0] and solutions_deg("cos", 1) == [0.0] and solutions_deg("sin", 0) == [0.0, 180.0], "Coinciding candidates appear once; 360° is 0°."
assert all(type(_v) is float for _v in solutions_deg("tan", 2.5)), "Plain floats."
for _bad in [("sin", 1.2), ("cos", -1.01), ("sec", 2)]:
    try:
        solutions_deg(*_bad)
        assert False, f"solutions_deg{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(bearing(0, 1)) < 1e-12 and abs(bearing(1, 0) - 90) < 1e-12 and abs(bearing(0, -3) - 180) < 1e-12 and abs(bearing(-1, -1) - 225) < 1e-12, "N 0°, E 90°, S 180°, SW 225°."
assert abs(bearing(-1, 1) - 315) < 1e-12 and type(bearing(2, 5)) is float, "NW 315°."
try:
    bearing(0, 0)
    assert False, "Zero displacement has no bearing: ValueError."
except ValueError:
    pass
"SUCCESS: The inverse gives one angle; the circle's symmetry gives the rest, and atan2 picks the right one from two components."
```

Hint: For sine the second solution is 180° − p; for cosine, −p; for tangent, p + 180°. Wrap with `% 360` and use a set to drop duplicates. A bearing is atan2(east, north): the arguments are swapped compared with the math angle.
:::

::: challenge Angles on a circle [medium]
Write `wrap180(d)`: d wrapped into [−180, 180), as a plain float. Write `turn(from_deg, to_deg)`: the shortest signed turn from one heading to another (positive is counter-clockwise in the math convention, i.e. increasing angle), a plain float in [−180, 180). Then write `circular_stats(angles_deg)`: for a list or array of angles in degrees, return `(mean_deg, R)` where mean_deg is the circular mean in [0, 360) and R the length of the mean unit vector, both plain floats; raise `ValueError` for an empty input or if R < 1e-9 (no defined mean).

```python starter
import math
import numpy as np

def wrap180(d):
    return 0.0

def turn(from_deg, to_deg):
    return 0.0

def circular_stats(angles_deg):
    return (0.0, 0.0)

print(turn(350, 10), circular_stats([350, 10]))
```

```python solution
import math
import numpy as np

def wrap180(d):
    return float((d + 180) % 360 - 180)

def turn(from_deg, to_deg):
    return wrap180(to_deg - from_deg)

def circular_stats(angles_deg):
    a = np.radians(np.asarray(angles_deg, dtype=float))
    if a.size == 0:
        raise ValueError("no angles")
    C, S = np.cos(a).mean(), np.sin(a).mean()
    R = math.hypot(C, S)
    if R < 1e-9:
        raise ValueError("angles cancel: no defined mean")
    return float(math.degrees(math.atan2(S, C)) % 360), float(R)

print(turn(350, 10), circular_stats([350, 10]))
```

```python test
import math
import numpy as np
for _n in ["wrap180", "turn", "circular_stats"]:
    assert _n in dir(), f"Define {_n}."
assert wrap180(190) == -170.0 and wrap180(-190) == 170.0 and wrap180(180) == -180.0 and wrap180(725) == 5.0, "Wrap into [−180, 180)."
assert type(wrap180(10)) is float and turn(350, 10) == 20.0 and turn(10, 350) == -20.0 and turn(90, 90) == 0.0, "Shortest turns."
_m, _R = circular_stats([350, 10])
assert type(_m) is float and (abs(_m) < 1e-9 or abs(_m - 360) < 1e-9) and abs(_R - math.cos(math.radians(10))) < 1e-12, f"350° and 10° average to 0°; got {(_m, _R)}."
_m2, _ = circular_stats(np.array([80.0, 100.0, 90.0]))
assert abs(_m2 - 90) < 1e-9, "Array input; mean 90°."
_m3, _ = circular_stats([300, 330])
assert abs(_m3 - 315) < 1e-9 and 0 <= _m3 < 360, "Result in [0, 360)."
_rng78 = np.random.default_rng(7)
_spread = (_rng78.normal(0, 5, 500) + 180) % 360
_m4, _R4 = circular_stats(_spread)
assert abs(_m4 - 180) < 1.5 and _R4 > 0.98, "Tight cluster around south."
for _bad in [[], [0, 180], [0, 120, 240]]:
    try:
        circular_stats(_bad)
        assert False, f"circular_stats({_bad}) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Differences wrap, and means average unit vectors: arithmetic on a circle respects the seam."
```

Hint: Wrap with ((d + 180) % 360) − 180. The circular mean is atan2 of the mean sine and mean cosine; R is the hypotenuse of those two means.
:::

::: challenge Unwrap and tilt [hard]
Write `unwrap_deg(angles)`: unwrap a list or array of angles in degrees (each in [−180, 180)) by adding a wrapped difference each step; return a NumPy float array of the same length that starts at the first angle. Do not use `np.unwrap`. Write `revolutions(angles)`: the net revolutions (unwrapped last minus first, divided by 360) as a plain float. Then write `pitch_roll(ax, ay, az)`: from one stationary accelerometer reading, return `(pitch_deg, roll_deg)` as plain floats with pitch = atan2(−ax, √(ay² + az²)) and roll = atan2(ay, az); raise `ValueError` if all three are zero.

```python starter
import math
import numpy as np

def unwrap_deg(angles):
    return np.array(angles, dtype=float)

def revolutions(angles):
    return 0.0

def pitch_roll(ax, ay, az):
    return (0.0, 0.0)

print(unwrap_deg([170, -170, -150]), pitch_roll(-4.905, 0, 8.496))
```

```python solution
import math
import numpy as np

def unwrap_deg(angles):
    a = np.asarray(angles, dtype=float)
    out = np.empty_like(a)
    if a.size == 0:
        return out
    out[0] = a[0]
    for k in range(1, a.size):
        d = (a[k] - a[k - 1] + 180) % 360 - 180
        out[k] = out[k - 1] + d
    return out

def revolutions(angles):
    u = unwrap_deg(angles)
    return float((u[-1] - u[0]) / 360) if u.size else 0.0

def pitch_roll(ax, ay, az):
    if ax == 0 and ay == 0 and az == 0:
        raise ValueError("no gravity reading")
    return float(math.degrees(math.atan2(-ax, math.hypot(ay, az)))), float(math.degrees(math.atan2(ay, az)))

print(unwrap_deg([170, -170, -150]), pitch_roll(-4.905, 0, 8.496))
```

```python test
import math
import numpy as np
for _n in ["unwrap_deg", "revolutions", "pitch_roll"]:
    assert _n in dir(), f"Define {_n}."
_u = unwrap_deg([170, -170, -150])
assert isinstance(_u, np.ndarray) and np.allclose(_u, [170, 190, 210]), f"Crossing the seam continues upward; got {_u}."
assert np.allclose(unwrap_deg(np.array([-170.0, 170.0, 150.0])), [-170, -190, -210]), "And downward."
_true78 = np.cumsum(np.full(400, 37.0))
_wr78 = (_true78 + 180) % 360 - 180
assert np.allclose(unwrap_deg(_wr78), _wr78[0] + (_true78 - _true78[0])), "Recover a steady rotation of 37° per sample."
assert abs(revolutions(_wr78) - 399 * 37 / 360) < 1e-9 and type(revolutions(_wr78)) is float, "Net revolutions."
_back78 = (-np.cumsum(np.full(100, 20.0)) + 180) % 360 - 180
assert abs(revolutions(_back78) + 99 * 20 / 360) < 1e-9, "Negative revolutions for backward rotation."
_p, _r = pitch_roll(-9.81 * math.sin(math.radians(30)), 0, 9.81 * math.cos(math.radians(30)))
assert type(_p) is float and abs(_p - 30) < 1e-9 and abs(_r) < 1e-9, f"30° pitch; got {(_p, _r)}."
_p2, _r2 = pitch_roll(0, 9.81 * math.sin(math.radians(-25)), 9.81 * math.cos(math.radians(-25)))
assert abs(_p2) < 1e-9 and abs(_r2 + 25) < 1e-9, "−25° roll."
_p3, _ = pitch_roll(-1.02 * 9.81 * math.sin(math.radians(80)), 0, 1.02 * 9.81 * math.cos(math.radians(80)))
assert abs(_p3 - 80) < 1e-9, "A 2% scale error must not change the angle."
assert abs(pitch_roll(-9.81, 0, 0)[0] - 90) < 1e-9, "Nose straight up: 90°."
try:
    pitch_roll(0, 0, 0)
    assert False, "No reading: ValueError."
except ValueError:
    pass
"SUCCESS: Unwrapping counts the turns a wrapped sensor hides, and atan2 reads tilt without trusting the magnitude."
```

Hint: Each unwrapped value is the previous one plus the wrapped difference of consecutive raw angles. For tilt, both formulas are atan2 of two components, so any common scale factor cancels.
:::

## What you learned

- arcsin, arccos and arctan return one principal value; the other solutions come from the circle's symmetries (180° − p, −p, p + 180°), and context must choose among them.
- atan2(y, x) keeps both signs and returns the full angle in (−180°, 180°]; arctan(y/x) is wrong by 180° in half the plane. Compass bearings are atan2(east, north).
- Angle differences must be wrapped into [−180°, 180°), and angles are averaged as unit vectors (the circular mean), with R measuring how concentrated they are.
- Unwrapping adds back the full turns a wrapped sensor hides; it needs less than half a turn between samples.
- Tilt from an accelerometer is better computed with atan2 than with arcsin: scale errors cancel and the sensitivity stays bounded near 90°.

The next lesson collects the trigonometric identities and checks them by computation, using them to simplify models.
