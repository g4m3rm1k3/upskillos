# Piecewise functions

A servo axis on a CNC machine moves from one position to another in three phases: speed up at a constant acceleration, cruise at the top speed, slow down. No single formula describes that motion, but three simple ones do, each valid on its own stretch of time. Functions built from pieces are everywhere in engineering. Tax bands, tariffs, springs that hit a stop, lookup tables, the curves of a font: each piece is easy, and the interesting mathematics happens at the joins. Is the function continuous there? Is its slope? This lesson builds piecewise functions in NumPy, designs trapezoidal and jerk-limited motion profiles, measures smoothness at the joins, and ends with cubic splines, the piecewise polynomials that replace the wild high-degree fits of the polynomials lesson.

This lesson covers:

- defining and evaluating piecewise functions, and continuity at the joins;
- the trapezoidal velocity profile, and the triangular case of short moves;
- smoothness orders C⁰, C¹, C², jerk, and S-curve profiles;
- piecewise-linear lookup tables;
- cubic splines: smooth curves through points without wild oscillation.

## Pieces and joins

::: math
\[ F(x) = \begin{cases} k_1 x & |x| \le g \\ k_1 x + k_2\,(x - g) & x > g \\ k_1 x + k_2\,(x + g) & x < -g \end{cases}, \qquad \lim_{x \to g^-} F(x) = \lim_{x \to g^+} F(x) = F(g) \]
- $F$: force; $x$: deflection; $k_1$: stiffness of the soft spring; $k_2$: extra stiffness of the stop; $g$: the gap before the stop engages
- each piece is used on its own interval; `np.where` or `np.piecewise` chooses the piece for each input
- **continuous** at a join: the two one-sided limits agree with the value there
In code: `stop_spring(x)` built with `np.where`, and the jump at each join measured from both sides
:::

A machine mount often has a soft spring for normal motion and a stiff rubber stop that engages after a gap g. Its force is k₁x while |x| ≤ g; beyond the gap the stop adds k₂ times the extra compression. That is a **piecewise** definition: different formulas on different intervals. In NumPy, `np.where(condition, a, b)` picks between two expressions element by element, and nesting it handles more pieces.

At each join, the important question is whether the pieces meet. A function is **continuous** at a point if approaching from the left and from the right gives the same value as the point itself. A force that jumped at the gap would mean an instantaneous change of force, a shock. Here the extra stop term starts at zero at x = ±g, so the pieces meet.

Predict before running: with k₁ = 20 N/mm, k₂ = 400 N/mm and a 2 mm gap, what is the force at 1, 2, 2.5 and −3 mm, and is there a jump at the gap?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import CubicSpline

k1, k2, gap = 20.0, 400.0, 2.0

def stop_spring(x):
    x = np.asarray(x, dtype=float)
    extra = np.where(x > gap, x - gap, np.where(x < -gap, x + gap, 0.0))
    return k1 * x + k2 * extra

print("forces (N) at 1, 2, 2.5, -3 mm:", stop_spring([1.0, 2.0, 2.5, -3.0]))
for join in [gap, -gap]:
    left, right = stop_spring(join - 1e-9), stop_spring(join + 1e-9)
    print(f"at x = {join:+.0f}: from the left {left:.6f}, from the right {right:.6f}, jump {right - left:.1e}")
slope_left = (stop_spring(gap) - stop_spring(gap - 1e-6)) / 1e-6
slope_right = (stop_spring(gap + 1e-6) - stop_spring(gap)) / 1e-6
print(f"stiffness just below the gap {slope_left:.1f} N/mm, just above {slope_right:.1f} N/mm")
```

The force is 20 N at 1 mm and 40 N at 2 mm. At 2.5 mm it jumps to 250 N as the stop engages, and at −3 mm it is −460 N. Approaching the gap from either side gives the same 40 N: the function is continuous. Its slope is not: the stiffness changes abruptly from 20 to 420 N/mm. That kind of corner is what the next sections examine.

## The trapezoidal velocity profile

::: math
\[ v(t) = \begin{cases} a t & 0 \le t < t_a \\ v_\text{max} & t_a \le t < t_a + t_c \\ v_\text{max} - a\,(t - t_a - t_c) & t_a + t_c \le t \le T \end{cases}, \qquad t_a = \frac{v_\text{max}}{a}, \quad t_c = \frac{D}{v_\text{max}} - \frac{v_\text{max}}{a} \]
- $D$: move distance; $a$: acceleration limit; $v_\text{max}$: speed limit; $t_a$: acceleration (and deceleration) time; $t_c$: cruise time; $T = 2t_a + t_c$
- if $D < v_\text{max}^2/a$ there is no cruise: the profile is a triangle with peak speed $\sqrt{aD}$ and $T = 2\sqrt{D/a}$
In code: `trapezoid(D, vmax, a)` returns the phase times; `profile(t, ...)` gives position, velocity and acceleration piece by piece
:::

The standard point-to-point move of a servo axis respects two limits: the motor's top speed v_max and the acceleration a the mechanics can take. The fastest move under those limits accelerates as hard as allowed, cruises at v_max, and brakes as hard as allowed. The velocity graph is a **trapezoid**. Its area is the distance moved. Acceleration and deceleration each take t_a = v_max/a and cover v_max²/(2a), and the cruise covers the rest. A short move never reaches v_max: the trapezoid collapses to a **triangle**, with peak speed √(aD).

Position is the running integral of velocity (the accumulation lesson), so it is piecewise too: quadratic while accelerating, linear while cruising, quadratic again while braking.

Predict before running: an axis may reach 0.5 m/s at 2 m/s². How long does a 400 mm move take? And a 50 mm move?

```python
def trapezoid(D, vmax, a):
    if D >= vmax ** 2 / a:
        ta = vmax / a
        tc = D / vmax - vmax / a
        return ta, tc, vmax
    vp = math.sqrt(a * D)
    return vp / a, 0.0, vp

def profile(t, D, vmax, a):
    ta, tc, vp = trapezoid(D, vmax, a)
    t = np.asarray(t, dtype=float)
    t1, t2, T = ta, ta + tc, 2 * ta + tc
    acc = np.where(t < t1, a, np.where(t < t2, 0.0, np.where(t <= T, -a, 0.0)))
    vel = np.where(t < t1, a * t, np.where(t < t2, vp, np.clip(vp - a * (t - t2), 0, None)))
    pos = np.where(t < t1, 0.5 * a * t ** 2,
          np.where(t < t2, 0.5 * a * t1 ** 2 + vp * (t - t1),
                   D - 0.5 * a * np.clip(T - t, 0, None) ** 2))
    return pos, vel, acc

for D in [0.400, 0.050]:
    ta, tc, vp = trapezoid(D, 0.5, 2.0)
    print(f"{D * 1000:.0f} mm: accelerate {ta:.3f} s, cruise {tc:.3f} s, total {2 * ta + tc:.3f} s, peak speed {vp:.3f} m/s")

ts = np.linspace(0, 1.2, 1201)
pos, vel, acc = profile(ts, 0.400, 0.5, 2.0)
print("position at the end:", round(float(pos[-1]), 6), "m; largest jump in position between samples:", round(float(np.abs(np.diff(pos)).max()), 6))
fig, axes = plt.subplots(1, 3, figsize=(12, 3))
for ax, data, title in zip(axes, [pos, vel, acc], ["position (m)", "velocity (m/s)", "acceleration (m/s²)"]):
    ax.plot(ts, data)
    ax.set_title(title)
    ax.set_xlabel("time (s)")
plt.show()
```

The 400 mm move accelerates for 0.25 s, cruises for 0.55 s and decelerates for 0.25 s: 1.05 s in total, with velocity reaching the 0.5 m/s limit. The 50 mm move is shorter than v_max²/a = 125 mm, so it never cruises. It accelerates for 0.158 s to a peak of 0.316 m/s and brakes at once, 0.316 s in total. The plots show a smooth S-shaped position, a trapezoidal velocity, and an acceleration that **jumps** between +2, 0 and −2 m/s².

## Smoothness, jerk and S-curves

::: math
\[ C^0: f \text{ continuous}, \quad C^1: f' \text{ continuous}, \quad C^2: f'' \text{ continuous}, \qquad j(t) = \frac{da}{dt} \]
- the trapezoidal profile's position is $C^1$ (smooth velocity) but not $C^2$: acceleration jumps, so the **jerk** $j$ is infinite at the joins
- an **S-curve** profile limits the jerk, ramping the acceleration linearly; it costs a little time but excites far less vibration
In code: the acceleration's jumps measured numerically; an S-curve built by averaging the velocity over a window $t_j$ (which turns each acceleration step into a ramp), compared on time and peak jerk
:::

Smoothness at the joins comes in orders. A function is **C⁰** if it is continuous, **C¹** if its slope is also continuous, **C²** if its curvature is too. The trapezoidal profile's position is C¹, since velocity never jumps. But acceleration jumps instantly at every phase change, so the **jerk**, the rate of change of acceleration, is infinite there. Physically, a step in acceleration is a step in force, a hammer blow to the machine. It sets the frame vibrating at its natural frequency, the spring–mass lesson's tap test. That vibration shows up as ripples in the machined surface.

**S-curve** (jerk-limited) profiles ramp the acceleration up and down linearly over a time t_j, so the acceleration is continuous and the position becomes C². The velocity curve's corners are rounded into S-shapes. The cost is time: the move is slower by about t_j.

Predict before running: how big are the acceleration jumps in the trapezoidal profile, how long does an S-curve with 50 ms jerk ramps take, and what is its peak jerk?

```python
dt = ts[1] - ts[0]
jumps = np.abs(np.diff(acc))
print(f"trapezoid: acceleration jumps of up to {jumps.max():.1f} m/s² between samples {dt * 1000:.0f} ms apart (jerk ~ {jumps.max() / dt:.0f} m/s³, growing as the sampling gets finer)")

tj, step = 0.05, 1e-4
fine = np.arange(0, 1.4, step)
_, vel_trap, _ = profile(fine, 0.400, 0.5, 2.0)
width = int(round(tj / step))
vel_s = np.convolve(vel_trap, np.ones(width) / width)[: fine.size]
pos_s = np.concatenate(([0.0], np.cumsum((vel_s[1:] + vel_s[:-1]) / 2 * step)))
acc_s = np.gradient(vel_s, step)
jerk_s = np.abs(np.diff(acc_s)).max() / step
done = fine[np.argmax(pos_s >= 0.400 - 1e-6)]
print(f"S-curve with {tj * 1000:.0f} ms ramps: peak acceleration {acc_s.max():.2f} m/s², peak jerk {jerk_s:.0f} m/s³ (= a / t_j = {2.0 / tj:.0f}), "
      f"reaches 400 mm at {done:.3f} s, travel {pos_s[-1] * 1000:.2f} mm")
```

The trapezoid's acceleration jumps by 2 m/s² between neighbouring samples, a "jerk" of about 2,000 m/s³ at 1 ms sampling that would grow without limit at finer sampling: it is really infinite. Averaging the velocity over a 50 ms window turns every acceleration step into a 50 ms ramp, which caps the jerk at a/t_j = 40 m/s³ and leaves the peak acceleration at 2 m/s². The move then reaches 400 mm at 1.095 s instead of 1.05 s, about t_j later, and covers exactly the same 400 mm, because averaging the velocity does not change its area. A moving average (the convolution of the polynomials lesson) is a simple way to build the S-curve, and motion controllers do essentially this. A 4% slower move that does not ring the machine usually finishes the part sooner.

## Lookup tables: piecewise-linear functions

::: math
\[ f(x) = y_i + (x - x_i)\,\frac{y_{i+1} - y_i}{x_{i+1} - x_i}, \qquad x_i \le x \le x_{i+1} \]
- a table of points joined by straight lines is a continuous ($C^0$) piecewise-linear function with corners at the table points
- between points the error is at most $\tfrac{1}{8}h^2 \max|f''|$ for spacing $h$: halving the spacing quarters the error
In code: a motor's torque–speed curve as a table, read with `np.interp`; the interpolation error against the true curve for two table spacings
:::

Controllers store curves that are too complicated for a formula as **lookup tables**: torque against speed for a motor, efficiency against load for a pump, gain schedules for a controller. Reading between the points with straight lines gives a continuous piecewise-linear function, the composition lesson's `np.interp`. The error depends on curvature: on a stretch of length h where the true curve bends with second derivative f″, the chord misses the curve by at most h²|f″|/8. So halving the table spacing quarters the error, the second-order behaviour of the trapezoid rule.

Predict before running: a motor's torque falls with speed as T(n) = 12 e^(−n/3000) N·m. How accurate is a table every 500 rpm, and every 250 rpm?

```python
true_torque = lambda n: 12 * np.exp(-n / 3000)
n_fine = np.linspace(0, 6000, 6001)
for step in [500, 250]:
    table_n = np.arange(0, 6001, step, dtype=float)
    est = np.interp(n_fine, table_n, true_torque(table_n))
    bound = step ** 2 / 8 * 12 / 3000 ** 2
    print(f"table every {step} rpm ({table_n.size} points): largest error {np.abs(est - true_torque(n_fine)).max():.4f} N·m (bound h²|f''|/8 = {bound:.4f})")
```

A table every 500 rpm (13 points) is within 0.038 N·m of the true curve, about 0.3% of the 12 N·m peak, and halving the spacing cuts the error by a factor of about four, to 0.010 N·m. Both stay below the h²|f″|/8 bound, which is tightest where the curve bends most, at low speed. Lookup tables are piecewise-linear functions whose accuracy you choose with the spacing.

## Cubic splines

::: math
\[ S(x) = a_i + b_i(x - x_i) + c_i(x - x_i)^2 + d_i(x - x_i)^3 \;\text{ on } [x_i, x_{i+1}], \qquad S, S', S'' \text{ continuous at every } x_i \]
- a **cubic spline** uses one cubic per interval, joined so that position, slope and curvature all match: a $C^2$ curve through every point
- the matching conditions give a tridiagonal linear system for the curvatures (the heat-flow lesson's kind of system); a **natural** spline sets $S'' = 0$ at the ends
- unlike one high-degree polynomial, a spline does not oscillate wildly between the points
In code: `CubicSpline(xs, ys, bc_type="natural")` against a degree-10 polynomial through the same 11 points of Runge's function
:::

The polynomials lesson warned that one high-degree polynomial through many points swings wildly between them. The classic example, **Runge's function** 1/(1 + 25x²) sampled at 11 equally spaced points, produces an interpolating polynomial that overshoots badly near the ends. **Cubic splines** solve this. They use a separate cubic on each interval and join neighbours so that the value, the slope and the curvature all match: a C² curve, the same smoothness as a draughtsman's bent strip of wood ("spline"), which is where the name comes from. Matching curvatures at every interior point gives a tridiagonal linear system, the kind the heat-flow lesson solved with the Thomas algorithm, so splines are cheap even for thousands of points.

Predict before running: through 11 points of Runge's function, how far does the degree-10 polynomial stray from the true curve, and how far does a natural cubic spline?

```python
runge = lambda x: 1 / (1 + 25 * x ** 2)
xp = np.linspace(-1, 1, 11)
dense = np.linspace(-1, 1, 2001)
poly = np.polyfit(xp, runge(xp), 10)
spline = CubicSpline(xp, runge(xp), bc_type="natural")
print(f"degree-10 polynomial: largest error {np.abs(np.polyval(poly, dense) - runge(dense)).max():.3f}")
print(f"natural cubic spline: largest error {np.abs(spline(dense) - runge(dense)).max():.4f}")
inner = xp[1:-1]
for k, name in [(0, "value"), (1, "slope"), (2, "curvature")]:
    mismatch = np.max(np.abs(spline(inner - 1e-9, k) - spline(inner + 1e-9, k)))
    print(f"spline {name:<9} jump at the joins: {mismatch:.1e}")

fig, ax = plt.subplots(figsize=(6, 3.2))
ax.plot(dense, runge(dense), "k", lw=1, label="Runge's function")
ax.plot(dense, np.polyval(poly, dense), label="degree-10 polynomial")
ax.plot(dense, spline(dense), "--", label="cubic spline")
ax.plot(xp, runge(xp), "o")
ax.set_ylim(-0.5, 2.0)
ax.legend(fontsize=8)
plt.show()
```

The degree-10 polynomial passes through all 11 points but strays by about 1.92 near the ends, nearly twice the height of the whole function. The natural cubic spline through the same points stays within about 0.022. At every interior join its value, slope and curvature match to rounding level: a C² curve. This is why CAD systems, font outlines, robot paths and CNC toolpaths are built from splines, not from single polynomials.

::: challenge Pieces and continuity [easy]
Write `stop_force(x, k1, k2, gap)`: the force of a spring with stiffness k1 that engages an extra stop of stiffness k2 beyond |x| = gap (F = k1·x, plus k2·(x − gap) for x > gap, plus k2·(x + gap) for x < −gap); x may be a number or a NumPy array, and the result is the same kind (a plain float for a number). Raise `ValueError` if gap < 0. Then write `jump(f, x0, h=1e-9)`: the difference f(x0 + h) − f(x0 − h) as a plain float, and `is_continuous(f, x0, tol=1e-6)`: True (a plain bool) when |jump(f, x0)| ≤ tol.

```python starter
import numpy as np

def stop_force(x, k1, k2, gap):
    return x

def jump(f, x0, h=1e-9):
    return 0.0

def is_continuous(f, x0, tol=1e-6):
    return True

print(stop_force(2.5, 20, 400, 2), stop_force(np.array([1.0, -3.0]), 20, 400, 2))
```

```python solution
import numpy as np

def stop_force(x, k1, k2, gap):
    if gap < 0:
        raise ValueError("gap must not be negative")
    xa = np.asarray(x, dtype=float)
    extra = np.where(xa > gap, xa - gap, np.where(xa < -gap, xa + gap, 0.0))
    force = k1 * xa + k2 * extra
    return float(force) if force.ndim == 0 else force

def jump(f, x0, h=1e-9):
    return float(f(x0 + h) - f(x0 - h))

def is_continuous(f, x0, tol=1e-6):
    return bool(abs(jump(f, x0)) <= tol)

print(stop_force(2.5, 20, 400, 2), stop_force(np.array([1.0, -3.0]), 20, 400, 2))
```

```python test
import numpy as np
for _n in ["stop_force", "jump", "is_continuous"]:
    assert _n in dir(), f"Define {_n}."
assert stop_force(1.0, 20, 400, 2) == 20.0 and stop_force(2.5, 20, 400, 2) == 250.0 and stop_force(-3.0, 20, 400, 2) == -460.0, "20 N, 250 N, -460 N."
assert type(stop_force(1.0, 20, 400, 2)) is float, "A plain float for a number."
_arr = stop_force(np.array([-3.0, 0.0, 2.0, 2.5]), 20, 400, 2)
assert isinstance(_arr, np.ndarray) and np.allclose(_arr, [-460.0, 0.0, 40.0, 250.0]), "Arrays in, arrays out."
assert stop_force(0.5, 10, 100, 0) == 55.0, "Zero gap: the stop engages immediately."
try:
    stop_force(1.0, 20, 400, -1)
    assert False, "A negative gap should raise ValueError."
except ValueError:
    pass
assert is_continuous(lambda x: stop_force(x, 20, 400, 2), 2.0) is True, "The stop spring is continuous at the gap."
_step = lambda x: 0.0 if x < 1 else 5.0
assert abs(jump(_step, 1.0) - 5.0) < 1e-12 and is_continuous(_step, 1.0) is False, "A step jumps by 5."
assert abs(jump(abs, 0.0)) < 1e-8 and is_continuous(abs, 0.0) is True, "|x| has a corner but no jump."
"SUCCESS: Each piece is simple; continuity is checked at the joins, where the one-sided values must meet."
```

Hint: Build the extra compression with nested `np.where`: x − gap above the gap, x + gap below −gap, 0 in between. The jump compares the function just right and just left of the join.
:::

::: challenge Motion profiles [medium]
Write `move_times(D, vmax, a)`: for a move of distance D > 0 with speed limit vmax and acceleration limit a, return `(t_acc, t_cruise, t_total, v_peak)` as plain floats, using a trapezoid when D ≥ vmax²/a and a triangle (no cruise, v_peak = √(aD)) otherwise; raise `ValueError` if any input is not positive. Then write `position(t, D, vmax, a)`: the position at time t (a number; a plain float), 0 before the move starts and D after it ends. Finally write `fastest_vmax(D, a, T)`: the smallest speed limit with which the move of length D still completes within time T (a plain float), or `None` if even a triangle is too slow (T < 2√(D/a)).

```python starter
import math

def move_times(D, vmax, a):
    return (0.0, 0.0, 0.0, 0.0)

def position(t, D, vmax, a):
    return 0.0

def fastest_vmax(D, a, T):
    return None

print(move_times(0.4, 0.5, 2.0), move_times(0.05, 0.5, 2.0))
```

```python solution
import math

def move_times(D, vmax, a):
    if D <= 0 or vmax <= 0 or a <= 0:
        raise ValueError("D, vmax and a must be positive")
    if D >= vmax ** 2 / a:
        ta = vmax / a
        tc = D / vmax - vmax / a
        return float(ta), float(tc), float(2 * ta + tc), float(vmax)
    vp = math.sqrt(a * D)
    ta = vp / a
    return float(ta), 0.0, float(2 * ta), float(vp)

def position(t, D, vmax, a):
    ta, tc, T, vp = move_times(D, vmax, a)
    if t <= 0:
        return 0.0
    if t >= T:
        return float(D)
    if t < ta:
        return float(0.5 * a * t * t)
    if t < ta + tc:
        return float(0.5 * a * ta * ta + vp * (t - ta))
    return float(D - 0.5 * a * (T - t) ** 2)

def fastest_vmax(D, a, T):
    if T < 2 * math.sqrt(D / a):
        return None
    disc = (a * T) ** 2 - 4 * a * D
    return float((a * T - math.sqrt(max(disc, 0.0))) / 2)

print(move_times(0.4, 0.5, 2.0), move_times(0.05, 0.5, 2.0))
```

```python test
import math
for _n in ["move_times", "position", "fastest_vmax"]:
    assert _n in dir(), f"Define {_n}."
_m = move_times(0.4, 0.5, 2.0)
assert all(type(_v) is float for _v in _m) and all(abs(_x - _y) < 1e-12 for _x, _y in zip(_m, (0.25, 0.55, 1.05, 0.5))), f"400 mm: (0.25, 0.55, 1.05, 0.5); got {_m}."
_s = move_times(0.05, 0.5, 2.0)
assert _s[1] == 0.0 and abs(_s[3] - math.sqrt(0.1)) < 1e-12 and abs(_s[2] - 2 * math.sqrt(0.025)) < 1e-12, "50 mm: a triangle."
_e = move_times(0.125, 0.5, 2.0)
assert abs(_e[1]) < 1e-12 and abs(_e[3] - 0.5) < 1e-12, "Exactly vmax²/a: the trapezoid's cruise shrinks to zero."
for _bad in [(0, 0.5, 2), (0.4, 0, 2), (0.4, 0.5, -1)]:
    try:
        move_times(*_bad)
        assert False, f"move_times{_bad} should raise ValueError."
    except ValueError:
        pass
assert position(-1, 0.4, 0.5, 2.0) == 0.0 and position(5, 0.4, 0.5, 2.0) == 0.4, "Before and after the move."
assert abs(position(0.25, 0.4, 0.5, 2.0) - 0.0625) < 1e-12 and abs(position(0.525, 0.4, 0.5, 2.0) - 0.2) < 1e-12, "End of acceleration; half way."
_prev = -1.0
for _k in range(0, 1101):
    _p = position(_k / 1000, 0.4, 0.5, 2.0)
    assert _p >= _prev - 1e-12, "Position never decreases."
    _prev = _p
assert abs(position(0.8 - 1e-9, 0.4, 0.5, 2.0) - position(0.8 + 1e-9, 0.4, 0.5, 2.0)) < 1e-8, "Continuous at the start of braking."
_v = fastest_vmax(0.4, 2.0, 1.2)
assert _v is not None and abs(move_times(0.4, _v, 2.0)[2] - 1.2) < 1e-9, f"With vmax = {_v} the move takes exactly 1.2 s."
assert fastest_vmax(0.4, 2.0, 0.5) is None, "0.5 s is faster than even a triangle allows (0.894 s)."
assert abs(fastest_vmax(0.4, 2.0, 2 * math.sqrt(0.2) * (1 + 1e-9)) - math.sqrt(0.8)) < 1e-3, "Just above the triangle time: vmax ≈ sqrt(aD)."
_tri = move_times(0.1, 0.5, 2.0)
assert _tri[1] == 0.0 and abs(_tri[3] - math.sqrt(0.2)) < 1e-12, "100 mm < vmax²/a = 125 mm: still a triangle."
"SUCCESS: Three simple pieces make a fast, limit-respecting move; the joins keep position and velocity continuous."
```

Hint: The trapezoid needs D ≥ vmax²/a. Position is ½at² while accelerating, the distance at the end of acceleration plus vₚ(t − t_a) while cruising, and D − ½a(T − t)² while braking. For a given total time T, the trapezoid's T = D/v + v/a is a quadratic in v; take its smaller root.
:::

::: challenge A natural cubic spline [hard]
Write `natural_spline(xs, ys)`: return a function S that evaluates the natural cubic spline through the points (xs strictly increasing, at least 3 points) at a number (returning a plain float) or a NumPy array (returning an array), without using SciPy. On each interval h_i = x_{i+1} − x_i, the curvatures M_i = S″(x_i) satisfy M_0 = M_n = 0 and, for 1 ≤ i ≤ n − 1, h_{i−1}M_{i−1} + 2(h_{i−1} + h_i)M_i + h_iM_{i+1} = 6((y_{i+1} − y_i)/h_i − (y_i − y_{i−1})/h_{i−1}). Solve that tridiagonal system (any method except SciPy), then on [x_i, x_{i+1}] use S(x) = M_i(x_{i+1} − x)³/(6h_i) + M_{i+1}(x − x_i)³/(6h_i) + (y_i/h_i − M_ih_i/6)(x_{i+1} − x) + (y_{i+1}/h_i − M_{i+1}h_i/6)(x − x_i). Points outside [x_0, x_n] use the first or last cubic. Raise `ValueError` if there are fewer than 3 points, the lengths differ, or xs is not strictly increasing.

```python starter
import numpy as np

def natural_spline(xs, ys):
    return lambda x: np.interp(x, xs, ys)

xp = np.linspace(-1, 1, 11)
S = natural_spline(xp, 1 / (1 + 25 * xp ** 2))
print(S(0.05))
```

```python solution
import numpy as np

def natural_spline(xs, ys):
    x = np.asarray(xs, dtype=float)
    y = np.asarray(ys, dtype=float)
    if x.size < 3 or x.size != y.size or np.any(np.diff(x) <= 0):
        raise ValueError("need 3+ points with strictly increasing x")
    n = x.size - 1
    h = np.diff(x)
    A = np.zeros((n - 1, n - 1))
    r = np.zeros(n - 1)
    for i in range(1, n):
        A[i - 1, i - 1] = 2 * (h[i - 1] + h[i])
        if i > 1:
            A[i - 1, i - 2] = h[i - 1]
        if i < n - 1:
            A[i - 1, i] = h[i]
        r[i - 1] = 6 * ((y[i + 1] - y[i]) / h[i] - (y[i] - y[i - 1]) / h[i - 1])
    M = np.zeros(n + 1)
    M[1:n] = np.linalg.solve(A, r)

    def S(xq):
        q = np.asarray(xq, dtype=float)
        i = np.clip(np.searchsorted(x, q, side="right") - 1, 0, n - 1)
        hi = h[i]
        a, b = x[i + 1] - q, q - x[i]
        val = (M[i] * a ** 3 + M[i + 1] * b ** 3) / (6 * hi) + (y[i] / hi - M[i] * hi / 6) * a + (y[i + 1] / hi - M[i + 1] * hi / 6) * b
        return float(val) if np.ndim(val) == 0 else val
    return S

xp = np.linspace(-1, 1, 11)
S = natural_spline(xp, 1 / (1 + 25 * xp ** 2))
print(S(0.05))
```

```python test
import numpy as np
from scipy.interpolate import CubicSpline as _CS
for _n in ["natural_spline"]:
    assert _n in dir(), f"Define {_n}."
_xp = np.linspace(-1, 1, 11)
_yp = 1 / (1 + 25 * _xp ** 2)
_S = natural_spline(_xp, _yp)
_d = np.linspace(-1, 1, 1001)
assert np.allclose(_S(_d), _CS(_xp, _yp, bc_type="natural")(_d), atol=1e-12), "Matches SciPy's natural spline on Runge's function."
assert type(_S(0.05)) is float and isinstance(_S(_d), np.ndarray), "A plain float for a number, an array for an array."
assert np.allclose(_S(_xp), _yp, atol=1e-14), "Passes through every point."
_xu = np.array([0.0, 0.5, 2.0, 2.2, 4.0, 7.5])
_yu = np.sin(_xu)
assert np.allclose(natural_spline(list(_xu), list(_yu))(np.linspace(-0.5, 8, 300)), _CS(_xu, _yu, bc_type="natural")(np.linspace(-0.5, 8, 300)), atol=1e-10), "Uneven spacing and extrapolation with the end cubics; lists work."
_lin = natural_spline([0, 1, 2, 3], [1, 3, 5, 7])
assert abs(_lin(1.7) - 4.4) < 1e-12, "Points on a line give that line."
_S3 = natural_spline([0.0, 1.0, 2.0], [0.0, 1.0, 0.0])
assert abs(_S3(0.5) - 0.6875) < 1e-12, "Three points: a single interior curvature."
for _bad in [([0, 1], [0, 1]), ([0, 1, 2], [0, 1]), ([0, 2, 1], [0, 1, 2]), ([0, 1, 1], [0, 1, 2])]:
    try:
        natural_spline(*_bad)
        assert False, f"natural_spline{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Matching curvature at every join gives a tridiagonal system, and its solution draws a smooth curve without the high-degree wiggles."
```

Hint: The unknowns are M₁ ... M_{n−1} (the ends are 0). Row i of the matrix has h_{i−1}, 2(h_{i−1} + hᵢ), hᵢ around the diagonal. To evaluate, find each query's interval with `np.searchsorted` (clipped to the first and last interval) and apply the formula.
:::

## What you learned

- A piecewise function uses different formulas on different intervals; `np.where` selects them, and continuity at a join means the one-sided values meet.
- The trapezoidal velocity profile accelerates, cruises and brakes at the limits; short moves become triangles with peak speed √(aD), and position is piecewise quadratic–linear–quadratic.
- Smoothness has orders C⁰, C¹, C²; the trapezoid's acceleration jumps, giving infinite jerk, and S-curve profiles limit jerk at a small cost in time.
- Lookup tables are piecewise-linear functions whose error, at most h²|f″|/8, falls fourfold when the spacing halves.
- Cubic splines join cubics with matching value, slope and curvature (C²), found from a tridiagonal system; they follow data without the oscillations of a single high-degree polynomial.

The next lesson looks at a family of functions that appears whenever things scale: power laws, and the log–log plots that reveal them.
