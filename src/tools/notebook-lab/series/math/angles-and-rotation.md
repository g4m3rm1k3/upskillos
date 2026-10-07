# Angles, radians and rotation

Spindles, wheels, motors, robot joints and rotary tables all turn, and a turning thing is described by an angle that changes with time. Engineers quote angles in degrees and speeds in revolutions per minute, while every formula in mathematics and physics wants **radians**. Mixing the two is one of the most common bugs in engineering code. This lesson makes the radian natural, connects angles to arc lengths and surface speeds, and handles the awkward fact that angles **wrap around**: 359° and 1° are 2° apart, not 358°, and an encoder's reading jumps from 359 back to 0 every turn.

This lesson covers:

- degrees, revolutions and radians, and why radians are the natural unit;
- arc length and sector area;
- angular speed in rpm and rad/s, and surface speed v = ωr;
- gears and belts as ratios of angular speeds;
- wrapping angles, shortest turns, and unwrapping an encoder log.

## Radians

::: math
\[ \theta_\text{rad} = \theta_\text{deg} \times \frac{\pi}{180}, \qquad s = r\,\theta, \qquad A = \tfrac{1}{2} r^2 \theta \]
- one radian cuts an arc as long as the radius, so a full turn is $2\pi$ rad
- $s$: arc length; $A$: sector area; both need $\theta$ in radians
In code: `math.radians(deg)` converts, then `r * th` is the arc length
:::


A full turn is 360 degrees by convention, a number chosen thousands of years ago because it divides evenly in many ways. The **radian** is not a convention: an angle of one radian at the centre of a circle cuts off an arc exactly as long as the radius. Since the circumference is 2πr, a full turn is 2π radians, so 180° = π rad and 1 rad ≈ 57.3°.

Measured in radians, an angle θ cuts an arc of length s = rθ, and a sector has area ½r²θ, with no conversion factors. That simplicity is why calculus, physics and Python's `math` functions all work in radians. `math.radians` and `math.degrees` convert. Predict before running: what does `math.sin(90)` return, and why?

```python type
import math
import numpy as np

print("1 rad =", math.degrees(1), "degrees;  90° =", math.radians(90), "rad = π/2:", math.radians(90) == math.pi / 2)
print("math.sin(90) =", math.sin(90), "  math.sin(math.radians(90)) =", math.sin(math.radians(90)))

r = 0.25
for deg in [1, 30, 90, 360]:
    theta = math.radians(deg)
    print(f"{deg:>4}°: {theta:.4f} rad, arc {r * theta * 1000:7.2f} mm, sector area {0.5 * r ** 2 * theta * 1e4:7.2f} cm²")
```

```output
1 rad = 57.29577951308232 degrees;  90° = 1.5707963267948966 rad = π/2: True
math.sin(90) = 0.8939966636005579   math.sin(math.radians(90)) = 1.0
   1°: 0.0175 rad, arc    4.36 mm, sector area    5.45 cm²
  30°: 0.5236 rad, arc  130.90 mm, sector area  163.62 cm²
  90°: 1.5708 rad, arc  392.70 mm, sector area  490.87 cm²
 360°: 6.2832 rad, arc 1570.80 mm, sector area 1963.50 cm²
```

The arc and area columns use a radius of 0.25 m, converted to millimetres and square centimetres.

`math.sin(90)` takes its argument as 90 **radians** (about 14 turns plus a bit) and returns 0.894, not 1. Nothing warns you. Every trigonometric function in Python, NumPy and nearly every other language uses radians. The habit that prevents the bug: convert at the edges, when reading input or printing output, and keep radians everywhere inside.

## Angular speed and surface speed

::: math
\[ \omega = \text{rpm} \times \frac{2\pi}{60}, \qquad v = \omega\, r \]
- $\omega$: angular speed in rad/s; $r$: radius in metres; $v$: surface speed in m/s
- same rpm, larger radius: faster surface speed
In code: `rpm * 2 * math.pi / 60`, then `omega * (d_mm / 2000)` (diameter in mm to radius in m)
:::


**Angular speed** ω is the rate of change of angle. Machines quote it in revolutions per minute (rpm); formulas need radians per second. One revolution is 2π rad and one minute is 60 s, so ω [rad/s] = rpm × 2π / 60.

A point at radius r on a turning object travels an arc rΔθ in time Δt, so its speed along the circle, the **surface speed**, is

\[ v = \omega r \]

with ω in rad/s. This is the cutting speed from the quantities lesson, π D n, rewritten: with D = 2r and ω = 2πn, v = ωr = πDn. Predict before running: a 6 mm drill and a 50 mm face mill both turn at 3,000 rpm. How do their cutting speeds compare?

```python type
def rpm_to_rad_s(rpm):
    return rpm * 2 * math.pi / 60

for name, d_mm in [("6 mm drill", 6), ("50 mm face mill", 50), ("250 mm grinding wheel", 250)]:
    omega = rpm_to_rad_s(3000)
    v = omega * (d_mm / 2000)
    print(f"{name:<22} ω = {omega:.1f} rad/s, surface speed {v:5.2f} m/s = {v * 60:6.1f} m/min")
```

```output
6 mm drill             ω = 314.2 rad/s, surface speed  0.94 m/s =   56.5 m/min
50 mm face mill        ω = 314.2 rad/s, surface speed  7.85 m/s =  471.2 m/min
250 mm grinding wheel  ω = 314.2 rad/s, surface speed 39.27 m/s = 2356.2 m/min
```

Dividing the diameter in millimetres by 2000 gives the radius in metres.

At the same 3,000 rpm, the face mill's edge moves about 8.3 times faster than the drill's (50/6), and the grinding wheel's at over 39 m/s. Surface speed is proportional to radius, which is why small tools need high spindle speeds and why large grinding wheels have strict maximum rpm ratings: the rim must not exceed the speed at which it would burst.

## Gears and belts

::: math
\[ \omega_1 r_1 = \omega_2 r_2, \qquad \omega_1 N_1 = \omega_2 N_2, \qquad P = T\omega = \text{constant} \]
- $N$: tooth count; speed falls by the ratio $\dfrac{r_2}{r_1}$ while torque $T$ rises by it
- a chain of stages multiplies the ratios: $3 \times 4 = 12$
In code: `rpm * driver / driven` and `torque * driven / driver` for each stage
:::


When two pulleys are joined by a belt, the belt cannot stretch or slip (ideally), so both rims have the same surface speed: ω₁r₁ = ω₂r₂. The angular speeds are **inversely** proportional to the radii, the inverse proportion from the ratios lesson. Meshing gears behave the same way with tooth counts in place of radii, since teeth are spaced equally around each rim: ω₁N₁ = ω₂N₂.

A gearbox chains stages, and the overall ratio is the product of the stage ratios. Torque goes the other way: ignoring losses, power P = Tω is the same on both sides, so slowing a shaft down multiplies its torque. Predict before running: a motor at 1,450 rpm with 12 N·m of torque drives a 100 mm pulley belted to a 300 mm pulley, then a 15-tooth gear driving a 60-tooth gear. What speed and torque come out?

```python type
motor_rpm, motor_torque = 1450, 12.0
stages = [("belt", 100, 300), ("gears", 15, 60)]
rpm, torque = motor_rpm, motor_torque
for name, driver, driven in stages:
    rpm = rpm * driver / driven
    torque = torque * driven / driver
    print(f"after the {name}: {rpm:7.2f} rpm, {torque:5.1f} N·m")
print("power in:", round(motor_torque * rpm_to_rad_s(motor_rpm)), "W   power out:", round(torque * rpm_to_rad_s(rpm)), "W")
```

```output
after the belt:  483.33 rpm,  36.0 N·m
after the gears:  120.83 rpm, 144.0 N·m
power in: 1822 W   power out: 1822 W
```

The overall reduction is 3 × 4 = 12, so the output turns at about 120.8 rpm with 144 N·m, twelve times the motor's torque. The power, about 1,822 W, is the same on both sides, as it must be for an ideal (lossless) drive; real gearboxes lose a few percent per stage.

## Angles that wrap around

::: math
\[ \text{normalise}(\theta) \in (-180°, 180°], \qquad \text{shortest turn from } a \text{ to } b = \text{normalise}(b - a) \]
- $\theta$ and $\theta + 360°k$ point the same way for any whole number $k$
- the remainder $\theta \bmod 360$ lands in $[0, 360)$; above 180 subtract 360
In code: `a = angle % 360`, then `a - 360 if a > 180 else a`
:::


An angle and the same angle plus any whole number of turns describe the same direction. Code that compares or subtracts angles must account for this. Two operations do most of the work:

- **normalising**: reduce any angle to a standard range, usually [0, 360) or (−180, 180]. Python's `%` returns a result with the sign of the divisor, so `a % 360` lands in [0, 360) (for a tiny negative float such as −10⁻¹⁵ it can round up to exactly 360.0, a corner case worth knowing);
- **shortest difference**: the signed turn from heading a to heading b, normalised to (−180, 180], so a robot turns 20° anticlockwise rather than 340° clockwise.

Averaging is a trap: the mean of 350° and 10° is 0°, but the arithmetic mean says 180°, exactly the wrong direction. Predict before running: what is the shortest turn from 350° to 10°?

```python type
def normalise(angle):
    a = angle % 360
    return a - 360 if a > 180 else a

def shortest_turn(a, b):
    return normalise(b - a)

for a in [370, -30, 180, 540, -180]:
    print(f"{a:>5}° -> [0, 360): {a % 360:>5}°   (-180, 180]: {normalise(a):>5}°")
print("shortest turn 350° -> 10°:", shortest_turn(350, 10), "   10° -> 350°:", shortest_turn(10, 350))
print("naive mean of 350° and 10°:", (350 + 10) / 2, "   mean of the offsets from 350°:", normalise(350 + shortest_turn(350, 10) / 2))
```

```output
  370° -> [0, 360):    10°   (-180, 180]:    10°
  -30° -> [0, 360):   330°   (-180, 180]:   -30°
  180° -> [0, 360):   180°   (-180, 180]:   180°
  540° -> [0, 360):   180°   (-180, 180]:   180°
 -180° -> [0, 360):   180°   (-180, 180]:   180°
shortest turn 350° -> 10°: 20    10° -> 350°: -20
naive mean of 350° and 10°: 180.0    mean of the offsets from 350°: 0.0
```

The mean is taken by stepping half the shortest turn from the first angle, which works for two angles; the sine and cosine lesson gives the general method.

Shortest turns are +20° one way and −20° the other: positive means anticlockwise here. Stepping half the shortest turn from 350° gives the true mean, 0°. The edge case is a half turn: 180° and −180° are the same direction, and the convention (−180, 180] chooses +180.

## Unwrapping an encoder

::: math
\[ \Delta_i = \big((r_{i+1} - r_i + 180) \bmod 360\big) - 180, \qquad u_k = r_0 + \sum_{i<k} \Delta_i \]
- $r_i$: raw readings in $[0, 360)$; $\Delta_i$: each step taken the short way round
- $u_k$: the unwrapped angle; valid only if the shaft turns less than half a turn per sample
In code: `(np.diff(readings) + 180) % 360 - 180`, then `np.cumsum`
:::


An absolute rotary encoder reports the shaft's angle within one turn, 0 to 359.9°. To track total rotation, or speed, the log must be **unwrapped**: whenever a reading jumps by more than half a turn, assume the shaft actually went the short way across the 0/360 boundary, and add or subtract 360 from that point on. This only works if the shaft turns less than half a turn between samples; otherwise the direction is ambiguous, the aliasing of the plotting lesson in another form. Predict before running: how many turns does this log record?

```python type
readings = np.array([300, 340, 20, 60, 100, 140, 180, 220, 260, 300, 340, 20, 60], dtype=float)
steps = np.diff(readings)
steps = (steps + 180) % 360 - 180
unwrapped = np.concatenate(([readings[0]], readings[0] + np.cumsum(steps)))
print("unwrapped:", unwrapped)
print("total rotation:", unwrapped[-1] - unwrapped[0], "degrees =", (unwrapped[-1] - unwrapped[0]) / 360, "turns")
print("matches np.unwrap:", np.allclose(unwrapped, np.degrees(np.unwrap(np.radians(readings)))))
```

```output
unwrapped: [300. 340. 380. 420. 460. 500. 540. 580. 620. 660. 700. 740. 780.]
total rotation: 480.0 degrees = 1.3333333333333333 turns
matches np.unwrap: True
```

`(steps + 180) % 360 - 180` maps every step into [−180, 180), the shortest version of each step; the running total then rebuilds the continuous angle. NumPy's `np.unwrap` does the same, in radians.

The raw readings jump from 340 to 20 twice, but the unwrapped angle climbs steadily by 40° per sample, 480° in all, 1⅓ turns. With the angle unwrapped, `np.diff` gives a speed without false spikes of −320°.

::: challenge Spindle speeds [easy]
Write `rpm_to_rad_s(rpm)` and `rad_s_to_rpm(omega)`. Then write `surface_speed(diameter_mm, rpm)`, the surface speed in metres per minute, and `spindle_rpm(diameter_mm, speed_m_min)`, the rpm that gives a required surface speed, rounded to the nearest whole rpm (an `int`). Raise `ValueError` in both if the diameter is not positive.

```python starter
def rpm_to_rad_s(rpm):
    return rpm * 2 * math.pi / 60

def rad_s_to_rpm(omega):
    return omega

def surface_speed(diameter_mm, rpm):
    return 0.0

def spindle_rpm(diameter_mm, speed_m_min):
    return 0

print(surface_speed(50, 3000), spindle_rpm(10, 120))
```

```python solution
def rpm_to_rad_s(rpm):
    return rpm * 2 * math.pi / 60

def rad_s_to_rpm(omega):
    return omega * 60 / (2 * math.pi)

def surface_speed(diameter_mm, rpm):
    if diameter_mm <= 0:
        raise ValueError("diameter must be positive")
    return rpm_to_rad_s(rpm) * (diameter_mm / 2000) * 60

def spindle_rpm(diameter_mm, speed_m_min):
    if diameter_mm <= 0:
        raise ValueError("diameter must be positive")
    omega = (speed_m_min / 60) / (diameter_mm / 2000)
    return round(rad_s_to_rpm(omega))

print(surface_speed(50, 3000), spindle_rpm(10, 120))
```

```python test
import math as _math
for _n in ["rpm_to_rad_s", "rad_s_to_rpm", "surface_speed", "spindle_rpm"]:
    assert _n in dir(), f"Define {_n}."
assert _math.isclose(rpm_to_rad_s(60), 2 * _math.pi) and _math.isclose(rad_s_to_rpm(_math.pi), 30), "60 rpm is 2π rad/s; π rad/s is 30 rpm."
assert _math.isclose(rad_s_to_rpm(rpm_to_rad_s(1234.5)), 1234.5), "The conversions are inverses."
assert _math.isclose(surface_speed(50, 3000), _math.pi * 50 * 3000 / 1000), "πDn with D in metres."
assert spindle_rpm(10, 120) == 3820 and spindle_rpm(80, 250) == 995, f"Got {spindle_rpm(10, 120)} and {spindle_rpm(80, 250)}."
assert type(spindle_rpm(10, 120)) is int, "Round to a whole number of rpm (an int)."
for _f in (surface_speed, spindle_rpm):
    try:
        _f(0, 100)
        assert False, f"{_f.__name__} with zero diameter should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Spindle speed and surface speed are linked by v = ωr, with the conversions done once, at the edges."
```

Hint: ω in rad/s is rpm × 2π / 60; the radius in metres is diameter_mm / 2000; v = ωr is in m/s, so multiply by 60 for m/min. Reverse each step for `spindle_rpm`.
:::

::: challenge Indexing a rotary table [medium]
A rotary table turns a part to a list of angles in order, starting at 0°, taking the shortest turn each time. Write `normalise(angle)`, which returns an equivalent angle in (−180, 180], and `shortest_turn(a, b)`, the signed turn from a to b in (−180, 180]. Then write `plan_moves(angles)` that returns a tuple `(turns, total)`: the list of signed turns from 0° through each angle in order, and the total rotation (the sum of the turns' sizes). Finally `equal_positions(n, start=0)` returns the n equally spaced angles starting at `start`, each normalised into [0, 360) and rounded to 6 decimal places, in order. Raise `ValueError` if n < 1.

```python starter
def normalise(angle):
    return angle

def shortest_turn(a, b):
    return b - a

def plan_moves(angles):
    return ([], 0)

def equal_positions(n, start=0):
    return []

print(plan_moves([90, 350, 180]))
```

```python solution
def normalise(angle):
    a = angle % 360
    return a - 360 if a > 180 else a

def shortest_turn(a, b):
    return normalise(b - a)

def plan_moves(angles):
    turns, here = [], 0
    for target in angles:
        turns.append(shortest_turn(here, target))
        here = target
    return turns, sum(abs(t) for t in turns)

def equal_positions(n, start=0):
    if n < 1:
        raise ValueError("n must be at least 1")
    return [round((start + 360 * k / n) % 360, 6) for k in range(n)]

print(plan_moves([90, 350, 180]))
```

```python test
for _n in ["normalise", "shortest_turn", "plan_moves", "equal_positions"]:
    assert _n in dir(), f"Define {_n}."
assert [normalise(_a) for _a in [370, -30, 180, -180, 540, 0, 359, -721]] == [10, -30, 180, 180, 180, 0, -1, -1], f"Got {[normalise(_a) for _a in [370, -30, 180, -180, 540, 0, 359, -721]]}."
assert shortest_turn(350, 10) == 20 and shortest_turn(10, 350) == -20 and shortest_turn(0, 180) == 180 and shortest_turn(90, -90) == 180, "Shortest signed turns; a half turn is +180."
assert plan_moves([90, 350, 180]) == ([90, -100, -170], 360), f"Got {plan_moves([90, 350, 180])}."
assert plan_moves([]) == ([], 0) and plan_moves([0, 720]) == ([0, 0], 0), "No moves, and moves to the same direction."
assert equal_positions(4) == [0, 90, 180, 270] and equal_positions(3, start=-30) == [330, 90, 210], f"Got {equal_positions(3, start=-30)}."
assert equal_positions(7, start=10)[1] == 61.428571, "Rounded to 6 decimal places."
try:
    equal_positions(0)
    assert False, "n = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: Normalise, then subtract: the rotary table never goes the long way round."
```

Hint: `angle % 360` lands in [0, 360); subtract 360 if the result is over 180. The turn from a to b is the normalised difference `b - a`. Keep track of the current angle while planning moves.
:::

::: challenge Speed from an encoder [hard]
Write `unwrap_degrees(readings)` that unwraps a sequence of encoder angles (each in [0, 360)) into a continuous NumPy array, assuming the shaft turns less than half a turn between samples: each step is replaced by its equivalent in [−180, 180), and the first value is kept. An empty sequence gives an empty array. Do not use `np.unwrap`. Then write `rpm_from_encoder(times, readings)`, returning the average speed in rpm over the whole log (total unwrapped rotation over total time; negative for reverse rotation), rounded to 3 decimal places, and `max_safe_rpm(sample_interval_s)`, the highest speed (in rpm) at which unwrapping still works: the shaft must turn less than 180° per sample. Raise `ValueError` from `rpm_from_encoder` for fewer than 2 samples or mismatched lengths.

```python starter
def unwrap_degrees(readings):
    return np.asarray(readings, dtype=float)

def rpm_from_encoder(times, readings):
    return 0.0

def max_safe_rpm(sample_interval_s):
    return 0.0

print(unwrap_degrees([300, 340, 20, 60]))
```

```python solution
def unwrap_degrees(readings):
    r = np.asarray(readings, dtype=float)
    if r.size == 0:
        return r
    steps = (np.diff(r) + 180) % 360 - 180
    return np.concatenate(([r[0]], r[0] + np.cumsum(steps)))

def rpm_from_encoder(times, readings):
    if len(times) != len(readings) or len(times) < 2:
        raise ValueError("need equal-length logs of at least 2 samples")
    u = unwrap_degrees(readings)
    turns = (u[-1] - u[0]) / 360
    minutes = (times[-1] - times[0]) / 60
    return round(float(turns / minutes), 3)

def max_safe_rpm(sample_interval_s):
    return 0.5 / sample_interval_s * 60

print(unwrap_degrees([300, 340, 20, 60]))
```

```python test
import ast as _ast
for _n in ["unwrap_degrees", "rpm_from_encoder", "max_safe_rpm"]:
    assert _n in dir(), f"Define {_n}."
assert not any(isinstance(_x, _ast.Attribute) and _x.attr == "unwrap" for _x in _ast.walk(_ast.parse(_source))), "Unwrap with your own steps instead of np.unwrap."
assert np.allclose(unwrap_degrees([300, 340, 20, 60]), [300, 340, 380, 420]), "Forward across 0."
assert np.allclose(unwrap_degrees([30, 10, 350, 300, 250]), [30, 10, -10, -60, -110]), "Backward across 0."
assert np.allclose(unwrap_degrees([10, 10, 10]), [10, 10, 10]) and len(unwrap_degrees([])) == 0, "Stationary, and empty."
_rng = np.random.default_rng(31)
_true = np.cumsum(_rng.uniform(-170, 170, 500)) + 42
_r = _true % 360
assert np.allclose(unwrap_degrees(_r), _true - _true[0] + _r[0]), "Random motion with steps under half a turn must unwrap exactly."
_t = np.arange(0, 1.0001, 0.01)
_ang = (360 * 25 / 60 * _t) % 360
assert rpm_from_encoder(_t, _ang) == 25.0, f"25 rpm forward; got {rpm_from_encoder(_t, _ang)}."
assert rpm_from_encoder(_t, (-360 * 40 / 60 * _t) % 360) == -40.0, "40 rpm in reverse is negative."
for _bad in [([0], [10]), ([0, 1], [10])]:
    try:
        rpm_from_encoder(*_bad)
        assert False, f"rpm_from_encoder{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(max_safe_rpm(0.001) - 30000) < 1e-6 and abs(max_safe_rpm(0.01) - 3000) < 1e-6, "Half a turn per sample: 0.5 / dt turns per second, times 60."
"SUCCESS: Shortest steps plus a running total turn a wrapping encoder into a continuous angle, as long as the sampling is fast enough."
```

Hint: The steps are `np.diff(r)`; `(step + 180) % 360 - 180` turns each into its shortest equivalent; a running total (`np.cumsum`) added to the first reading rebuilds the angle. For the safe speed, half a turn per sample is `0.5 / dt` turns per second.
:::

## What you learned

- A radian is the angle whose arc equals the radius; a full turn is 2π rad. In radians, arc length is rθ and sector area ½r²θ. Python's trigonometric functions use radians, so convert at the edges.
- Angular speed converts as rad/s = rpm × 2π/60, and surface speed is v = ωr, proportional to radius.
- Belts and gears give inverse ratios of angular speed (ω₁r₁ = ω₂r₂); torque scales the other way, keeping power constant.
- Angles wrap: normalise with `%`, take shortest differences in (−180, 180], and never average angles naively.
- Unwrapping an encoder log rebuilds continuous rotation, provided the shaft turns less than half a turn per sample.

The next lesson follows a point around a circle, which is where sine and cosine come from.
