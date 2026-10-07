# Motion in one dimension

A conveyor carries a pallet along a track, a lift car rises and stops, a machine axis rapids to a position and halts within a hundredth of a millimetre. Each is motion along a single line, described by one number that changes with time: the position. This lesson develops the language of motion: position, displacement and distance; velocity as the rate of change of position; acceleration as the rate of change of velocity; and the equations of constant acceleration. It also shows the computer's way of handling motion, small time steps added up, which is the idea underneath all of calculus and every physics simulation in this series.

This lesson covers:

- position, displacement and distance travelled, and why they differ;
- velocity from a position log, and the velocity–time graph;
- constant velocity and constant acceleration, and the equations linking them;
- stopping distances;
- stepping a motion forward in time, and displacement as the area under a velocity graph.

## Position, displacement and distance

::: math
\[ \text{displacement} = x_n - x_0, \qquad \text{distance travelled} = \sum_{i=0}^{n-1} |x_{i+1} - x_i| \]
- displacement can be negative or zero; distance travelled never is
- the two differ whenever the motion reverses
In code: `x[-1] - x[0]` and `np.abs(np.diff(x)).sum()`
:::


Choose a line, an origin on it and a positive direction. **Position** x is a signed number: where the object is. **Displacement** is the change in position, x_end − x_start, which can be negative. **Distance travelled** is the total length of path covered, always positive. They differ whenever the motion reverses: a shuttle that goes 3 m forward and 3 m back has displacement 0 but has travelled 6 m.

A transfer shuttle logs its position every second as it moves parts between stations. Predict before running: what are its displacement and distance travelled over the log?

```python type
import numpy as np
import matplotlib.pyplot as plt

t = np.arange(0, 13)
x = np.array([0.0, 0.2, 0.8, 1.6, 2.4, 2.9, 3.0, 2.8, 2.2, 1.5, 1.0, 0.8, 0.8])

steps = np.diff(x)
print("displacement:", round(x[-1] - x[0], 3), "m")
print("distance travelled:", round(np.abs(steps).sum(), 3), "m")
print("furthest from the start:", x.max(), "m at t =", t[x.argmax()], "s")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(t, x, "o-")
ax.set_xlabel("time (s)")
ax.set_ylabel("position (m)")
ax.set_title("Shuttle position log")
ax.grid(True)
plt.show()
```

```output
displacement: 0.8 m
distance travelled: 5.2 m
furthest from the start: 3.0 m at t = 6 s
```

The shuttle ends 0.8 m from where it started, but it travelled 5.2 m: 3.0 m out to the far station and 2.2 m back. Distance travelled sums the sizes of the steps (`np.abs`); displacement only cares about the ends. Wear on a mechanism follows distance travelled, not displacement.

## Velocity

::: math
\[ \bar{v}_i = \frac{x_{i+1} - x_i}{t_{i+1} - t_i}, \qquad \text{placed at } t = \frac{t_i + t_{i+1}}{2} \]
- $\bar{v}_i$: average velocity over each interval, the slope of the position graph there
- velocity changes sign where position reaches a maximum or minimum
In code: `np.diff(x) / np.diff(t)` and `(t[:-1] + t[1:]) / 2`
:::


**Velocity** is the rate of change of position: positive when moving in the positive direction, negative when moving back. **Speed** is its size. Between two log entries the **average velocity** is Δx/Δt, the slope of the line joining the two points on the position graph. A steep graph means fast motion; a flat stretch means the object is stopped; a downward slope means it is moving backwards.

Plotting velocity against time shows the motion from a different angle. Each average velocity belongs to an interval, so it is natural to place it at the interval's midpoint. Predict before running: when is the shuttle moving fastest, and when does it reverse?

```python type
v = np.diff(x) / np.diff(t)
t_mid = (t[:-1] + t[1:]) / 2
for tm, vel in zip(t_mid, v):
    print(f"t = {tm:4.1f} s   v = {vel:+.1f} m/s")

fig, ax = plt.subplots(figsize=(6, 3))
ax.step(t_mid, v, where="mid")
ax.axhline(0, color="grey")
ax.set_xlabel("time (s)")
ax.set_ylabel("velocity (m/s)")
plt.show()
```

```output
t =  0.5 s   v = +0.2 m/s
t =  1.5 s   v = +0.6 m/s
t =  2.5 s   v = +0.8 m/s
t =  3.5 s   v = +0.8 m/s
t =  4.5 s   v = +0.5 m/s
t =  5.5 s   v = +0.1 m/s
t =  6.5 s   v = -0.2 m/s
t =  7.5 s   v = -0.6 m/s
t =  8.5 s   v = -0.7 m/s
t =  9.5 s   v = -0.5 m/s
t = 10.5 s   v = -0.2 m/s
t = 11.5 s   v = +0.0 m/s
```

`ax.step` draws each value as a flat segment, matching the idea of a constant average over each interval.

The shuttle reaches +0.8 m/s around t = 2 to 4 s, slows, stops near t = 6 s, then moves back at up to −0.7 m/s and stops again at the end. The velocity changes sign between the intervals centred on 5.5 s and 6.5 s, which matches the peak of the position graph: a maximum of position is where velocity passes through zero, an idea that returns when calculus finds maxima.

## Constant velocity and constant acceleration

::: math
\[ v = v_0 + a t, \qquad x = x_0 + v_0 t + \tfrac{1}{2} a t^2, \qquad v^2 = v_0^2 + 2a(x - x_0) \]
- $a$: constant acceleration; $v_0$: starting velocity; $x_0$: starting position
- from rest, reaching $v$ takes $t = v/a$ and covers $x = \dfrac{v^2}{2a}$
In code: `t_accel = v_target / a` and `0.5 * a * t_accel ** 2`
:::


At **constant velocity** v, position grows linearly: x = x₀ + v t, a straight line on the position graph with slope v.

**Acceleration** a is the rate of change of velocity. At constant acceleration, velocity grows linearly, v = v₀ + a t, and position follows a parabola:

\[ x = x_0 + v_0 t + \tfrac{1}{2} a t^2 \]

The ½at² term comes from the average velocity over the interval, which is (v₀ + v)/2 when v changes steadily, times the time. Eliminating t gives a third relation, often the most useful because it needs no time at all:

\[ v^2 = v_0^2 + 2 a \, (x - x_0) \]

These are the **equations of constant acceleration**. Predict before running: a lift accelerates at 1.2 m/s² from rest. How far has it risen when it reaches its rated 2.5 m/s, and how long did that take?

```python type
a, v_target = 1.2, 2.5
t_accel = v_target / a
x_accel = 0.5 * a * t_accel ** 2
print(f"time to reach {v_target} m/s: {t_accel:.3f} s, distance {x_accel:.3f} m")
print(f"check with v² = 2 a x: x = {v_target ** 2 / (2 * a):.3f} m")
```

```output
time to reach 2.5 m/s: 2.083 s, distance 2.604 m
check with v² = 2 a x: x = 2.604 m
```

The lift needs about 2.08 s and 2.60 m to reach full speed. Both routes give the same distance, a useful cross-check: when two independent formulas agree, the algebra is probably right.

## Stopping distances

::: math
\[ s = v\,t_r + \frac{v^2}{2d} \]
- $s$: stopping distance; $v$: speed (m/s); $t_r$: reaction time; $d$: braking deceleration
- the braking term grows with $v^2$: double the speed, four times the braking distance
In code: `v * reaction_s + v ** 2 / (2 * decel)`, with `v = speed_kmh / 3.6`
:::


A vehicle's stopping distance has two parts. During the **reaction time**, before the brakes act, it continues at full speed: distance v t_r. Then it decelerates at a rate d (a positive number, the size of the negative acceleration) until it stops: from v² = v₀² + 2ax with v = 0 and a = −d, the braking distance is v₀²/(2d). So

\[ s = v t_r + \frac{v^2}{2 d} \]

The braking term grows with the **square** of speed. Predict before running: a forklift with reaction time 1.0 s braking at 2.5 m/s² stops from 10 km/h in some distance. What happens at 20 km/h?

```python type
def stopping_distance(speed_kmh, reaction_s, decel):
    v = speed_kmh / 3.6
    return v * reaction_s + v ** 2 / (2 * decel)

for kmh in [5, 10, 20, 30]:
    v = kmh / 3.6
    print(f"{kmh:>3} km/h: reaction {v * 1.0:5.2f} m + braking {v ** 2 / 5:5.2f} m = {stopping_distance(kmh, 1.0, 2.5):5.2f} m")
```

```output
  5 km/h: reaction  1.39 m + braking  0.39 m =  1.77 m
 10 km/h: reaction  2.78 m + braking  1.54 m =  4.32 m
 20 km/h: reaction  5.56 m + braking  6.17 m = 11.73 m
 30 km/h: reaction  8.33 m + braking 13.89 m = 22.22 m
```

Dividing km/h by 3.6 converts to m/s, since 1 km/h is 1000 m per 3600 s.

Doubling the speed from 10 to 20 km/h doubles the reaction distance but quadruples the braking distance, so the total grows from about 4.3 m to 11.7 m. This square law is why speed limits in warehouses and near pedestrians are set so low.

## Stepping through time

::: math
\[ x_{k+1} = x_k + v_k\,\Delta t, \qquad v_{k+1} = v_k + a(t_k)\,\Delta t \]
- Euler's method: hold the rates constant over each small step $\Delta t$
- the error is proportional to $\Delta t$ (first order); the exact height here is $4.8\,(1 - \cos(t/2))$
In code: `pos += vel * dt` then `vel += accel(k * dt) * dt`, repeated
:::


The equations above need constant acceleration. Real motion rarely has it, but a computer can handle any acceleration by **stepping**: over a short time step Δt, assume the acceleration is constant, update the velocity by a Δt and the position by v Δt, and repeat. This is the simplest **numerical integration** method (Euler's method), and the ODE block refines it. Adding up the v Δt pieces is exactly adding the areas of thin rectangles under the velocity graph: displacement is the **area under the velocity–time graph**.

Suppose a smoother lift drive eases its acceleration in and out: a(t) = 1.2 cos(t/2) m/s², starting from rest. No constant-acceleration formula applies, but calculus (later in the series) gives the exact height, 4.8(1 − cos(t/2)) metres, to compare against. Predict before running: how close does the stepped height after 6 s come to the exact value, and what happens to the error when Δt is ten times smaller?

```python type
import math

def smooth_accel(time):
    return 1.2 * math.cos(time / 2)

def simulate(accel, dt, duration):
    pos, vel = 0.0, 0.0
    for k in range(round(duration / dt)):
        pos += vel * dt
        vel += accel(k * dt) * dt
    return pos, vel

exact = 4.8 * (1 - math.cos(6 / 2))
print(f"exact height after 6 s: {exact:.4f} m")
for dt in [0.1, 0.01, 0.001]:
    pos, vel = simulate(smooth_accel, dt, 6.0)
    print(f"dt = {dt:<6} stepped height {pos:.4f} m, error {pos - exact:+.4f} m")
```

```output
exact height after 6 s: 9.5520 m
dt = 0.1    stepped height 9.8682 m, error +0.3162 m
dt = 0.01   stepped height 9.5845 m, error +0.0325 m
dt = 0.001  stepped height 9.5552 m, error +0.0033 m
```

Each step updates the position with the old velocity, then the velocity with the acceleration at the start of the step.

The exact height is 9.55 m. With Δt = 0.1 s the stepped answer is 32 cm too high, at 0.01 s 3.3 cm, and at 0.001 s 3.3 mm: each tenfold reduction in Δt cuts the error tenfold. An error proportional to the step size marks a **first-order** method; the ODE block meets methods whose errors shrink far faster. Smaller steps cost more computation. With stepping, the acceleration can be any function at all, including one measured from a sensor, which is how real motion is simulated.

::: challenge Distance and displacement [easy]
Write `travel(positions)` that takes a sequence of logged positions and returns a tuple `(displacement, distance)`, both rounded to 6 decimal places. Then write `reversals(positions)`, the number of times the direction of motion changes. Ignore steps of zero (a pause): a sequence that moves forward, pauses, then moves forward again has no reversal. Raise `ValueError` from both for fewer than 2 positions.

```python starter
def travel(positions):
    return (0.0, 0.0)

def reversals(positions):
    return 0

print(travel(x), reversals(x))
```

```python solution
def travel(positions):
    p = np.asarray(positions, dtype=float)
    if len(p) < 2:
        raise ValueError("need at least 2 positions")
    steps = np.diff(p)
    return (round(float(p[-1] - p[0]), 6), round(float(np.abs(steps).sum()), 6))

def reversals(positions):
    p = np.asarray(positions, dtype=float)
    if len(p) < 2:
        raise ValueError("need at least 2 positions")
    signs = np.sign(np.diff(p))
    signs = signs[signs != 0]
    return int((signs[1:] != signs[:-1]).sum())

print(travel(x), reversals(x))
```

```python test
for _n in ["travel", "reversals"]:
    assert _n in dir(), f"Define {_n}."
_x = [0.0, 0.2, 0.8, 1.6, 2.4, 2.9, 3.0, 2.8, 2.2, 1.5, 1.0, 0.8, 0.8]
assert travel(_x) == (0.8, 5.2), f"The shuttle log; got {travel(_x)}."
assert travel([5, 2, 7]) == (2.0, 8.0) and travel([1, 1]) == (0.0, 0.0), "Back 3 then forward 5; no motion."
assert reversals(_x) == 1, "The shuttle reverses once."
assert reversals([0, 1, 1, 2, 2, 3]) == 0, "Pauses are not reversals."
assert reversals([0, 1, 0, 1, 0]) == 3 and reversals([0, 2, 2, 1, 1, 3]) == 2, "Each change of direction counts, even across a pause."
for _f in [travel, reversals]:
    try:
        _f([1.0])
        assert False, f"{_f.__name__} with one position should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Displacement looks only at the ends; distance and reversals look at every step."
```

Hint: `np.diff` gives the steps. Distance sums their absolute values. For reversals, take the signs of the steps, drop the zeros, and count how many neighbouring signs differ.
:::

::: challenge The fastest safe speed [medium]
Write `stopping_distance(speed_kmh, reaction_s, decel)` as in the lesson (metres; raise `ValueError` if the speed is negative, or the reaction time negative, or the deceleration not positive). Then write the reverse, `max_safe_speed(gap_m, reaction_s, decel)`: the highest speed in km/h at which the vehicle can stop within `gap_m` metres, rounded to 2 decimal places. Setting the stopping distance equal to the gap gives a quadratic in v (in m/s): v²/(2d) + t_r v − gap = 0, whose positive root is

\[ v = d \left( -t_r + \sqrt{t_r^2 + 2\,\text{gap}/d} \right) \]

Raise `ValueError` for a negative gap. A gap of 0 gives speed 0.

```python starter
def stopping_distance(speed_kmh, reaction_s, decel):
    v = speed_kmh / 3.6
    return v * reaction_s + v ** 2 / (2 * decel)

def max_safe_speed(gap_m, reaction_s, decel):
    return 0.0

print(max_safe_speed(10, 1.0, 2.5))
```

```python solution
import math

def stopping_distance(speed_kmh, reaction_s, decel):
    if speed_kmh < 0 or reaction_s < 0 or decel <= 0:
        raise ValueError("speed and reaction time must be non-negative and deceleration positive")
    v = speed_kmh / 3.6
    return v * reaction_s + v ** 2 / (2 * decel)

def max_safe_speed(gap_m, reaction_s, decel):
    if gap_m < 0 or reaction_s < 0 or decel <= 0:
        raise ValueError("gap and reaction time must be non-negative and deceleration positive")
    v = decel * (-reaction_s + math.sqrt(reaction_s ** 2 + 2 * gap_m / decel))
    return round(v * 3.6, 2)

print(max_safe_speed(10, 1.0, 2.5))
```

```python test
import math as _math
for _n in ["stopping_distance", "max_safe_speed"]:
    assert _n in dir(), f"Define {_n}."
assert _math.isclose(stopping_distance(36, 1.0, 2.5), 10 + 100 / 5), "36 km/h is 10 m/s: 10 m reaction + 20 m braking."
for _bad in [(-1, 1, 2), (10, -1, 2), (10, 1, 0)]:
    try:
        stopping_distance(*_bad)
        assert False, f"stopping_distance{_bad} should raise ValueError."
    except ValueError:
        pass
assert max_safe_speed(30, 1.0, 2.5) == 36.0, f"The reverse of the 36 km/h case; got {max_safe_speed(30, 1.0, 2.5)}."
assert max_safe_speed(0, 1.0, 2.5) == 0.0, "No gap, no speed."
assert max_safe_speed(20, 0, 5) == 50.91, "No reaction time: v = sqrt(2 d gap)."
for _gap in [3, 8.5, 25, 60]:
    _v = max_safe_speed(_gap, 0.8, 3.0)
    assert abs(stopping_distance(_v, 0.8, 3.0) - _gap) < 0.02, "At the safe speed, the stopping distance equals the gap."
try:
    max_safe_speed(-1, 1, 2)
    assert False, "A negative gap should raise ValueError."
except ValueError:
    pass
"SUCCESS: Inverting the stopping-distance formula needs the quadratic formula; the positive root is the only physical one."
```

Hint: Convert inside the function: work in m/s with the formula, then multiply by 3.6 for km/h. `math.sqrt` gives the square root.
:::

::: challenge A trapezoidal move profile [hard]
Machine axes and conveyors move between positions with a **trapezoidal velocity profile**: accelerate at `amax` to `vmax`, cruise, then decelerate at `amax` to stop exactly at the target. If the move is too short to reach `vmax`, the profile is **triangular**: accelerate to a peak below `vmax` and immediately decelerate. Write `move_profile(distance, vmax, amax)` returning `(total_time, peak_speed)`, both rounded to 6 decimal places. Accelerating from rest to vmax takes vmax/amax seconds and covers vmax²/(2 amax) metres, and the deceleration takes the same. If twice that is more than the distance, the profile is triangular with peak speed √(distance × amax). Then write `position_at(time, distance, vmax, amax)`: the position (from 0) at a given time, using the constant-acceleration equations in each phase; it is 0 before time 0 and `distance` after the move ends. Raise `ValueError` if the distance is negative, or `vmax` or `amax` is not positive. A distance of 0 takes time 0.

```python starter
def move_profile(distance, vmax, amax):
    return (distance / vmax, vmax)

def position_at(time, distance, vmax, amax):
    return 0.0

print(move_profile(0.5, 0.25, 0.5))
```

```python solution
import math

def _phases(distance, vmax, amax):
    if distance < 0 or vmax <= 0 or amax <= 0:
        raise ValueError("distance must be non-negative, vmax and amax positive")
    ramp_dist = vmax ** 2 / (2 * amax)
    if 2 * ramp_dist >= distance:
        peak = math.sqrt(distance * amax)
        t_ramp = peak / amax
        return peak, t_ramp, 0.0
    t_ramp = vmax / amax
    t_cruise = (distance - 2 * ramp_dist) / vmax
    return vmax, t_ramp, t_cruise

def move_profile(distance, vmax, amax):
    peak, t_ramp, t_cruise = _phases(distance, vmax, amax)
    return (round(2 * t_ramp + t_cruise, 6), round(peak, 6))

def position_at(time, distance, vmax, amax):
    peak, t_ramp, t_cruise = _phases(distance, vmax, amax)
    total = 2 * t_ramp + t_cruise
    if time <= 0:
        return 0.0
    if time >= total:
        return float(distance)
    if time < t_ramp:
        return 0.5 * amax * time ** 2
    ramp = 0.5 * amax * t_ramp ** 2
    if time < t_ramp + t_cruise:
        return ramp + peak * (time - t_ramp)
    remaining = total - time
    return distance - 0.5 * amax * remaining ** 2

print(move_profile(0.5, 0.25, 0.5))
```

```python test
import math as _math
for _n in ["move_profile", "position_at"]:
    assert _n in dir(), f"Define {_n}."
assert move_profile(0.5, 0.25, 0.5) == (2.5, 0.25), f"Trapezoid: 0.5 s ramps of 0.0625 m, 1.5 s cruise; got {move_profile(0.5, 0.25, 0.5)}."
assert move_profile(0.08, 0.25, 0.5) == (0.8, 0.2), f"Triangle: peak sqrt(0.08 × 0.5) = 0.2 m/s; got {move_profile(0.08, 0.25, 0.5)}."
assert move_profile(0.125, 0.25, 0.5) == (1.0, 0.25), "Exactly reaching vmax with no cruise."
assert move_profile(0, 1, 1) == (0.0, 0.0), "A zero-length move."
for _bad in [(-1, 1, 1), (1, 0, 1), (1, 1, -2)]:
    try:
        move_profile(*_bad)
        assert False, f"move_profile{_bad} should raise ValueError."
    except ValueError:
        pass
assert position_at(-1, 0.5, 0.25, 0.5) == 0 and position_at(99, 0.5, 0.25, 0.5) == 0.5, "Before and after the move."
assert _math.isclose(position_at(0.5, 0.5, 0.25, 0.5), 0.0625) and _math.isclose(position_at(1.25, 0.5, 0.25, 0.5), 0.25), "End of the ramp, and halfway in time is halfway in distance."
assert _math.isclose(position_at(2.25, 0.5, 0.25, 0.5), 0.5 - 0.5 * 0.5 * 0.25 ** 2), "During deceleration."
assert _math.isclose(position_at(0.4, 0.08, 0.25, 0.5), 0.04), "The triangle's midpoint is halfway."
for _d, _v, _a in [(0.5, 0.25, 0.5), (0.08, 0.25, 0.5), (3.0, 1.2, 0.8)]:
    _T = move_profile(_d, _v, _a)[0]
    _ts = np.linspace(0, _T, 401)
    _xs = np.array([position_at(_t, _d, _v, _a) for _t in _ts])
    _vel = np.diff(_xs) / np.diff(_ts)
    assert np.all(np.diff(_xs) >= -1e-12), "Position never goes backwards."
    assert _vel.max() <= _v + 1e-6, "Speed never exceeds vmax."
    assert np.abs(np.diff(_vel) / np.diff(_ts)[1:]).max() <= _a * 1.01, "Acceleration never exceeds amax."
"SUCCESS: Accelerate, cruise, decelerate: the profile every motion controller uses, built from the constant-acceleration equations."
```

Hint: First decide the shape: compare twice the ramp distance `vmax**2 / (2 * amax)` with the distance. In `position_at`, use ½at² during the ramp up, constant speed during the cruise, and for the ramp down use the time remaining: `distance - 0.5 * amax * remaining**2`.
:::

## What you learned

- Position is signed; displacement is the change in position; distance travelled sums the sizes of every step and is never smaller than the displacement.
- Velocity is the rate of change of position (the slope of the position graph); acceleration is the rate of change of velocity. A maximum of position is where velocity crosses zero.
- Under constant acceleration: v = v₀ + at, x = x₀ + v₀t + ½at², and v² = v₀² + 2a(x − x₀).
- Stopping distance is v t_r + v²/(2d); the braking part grows with the square of speed.
- Stepping in small time steps handles any acceleration, and summing v Δt is the area under the velocity graph.

The next lesson looks closely at average rates of change, and what happens as the interval shrinks.
