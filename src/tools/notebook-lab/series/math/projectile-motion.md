# Projectile motion

A ball thrown across a yard, water from a hose, sparks from a grinding wheel, gravel flung off a conveyor's end: once launched, each follows a curved path under gravity alone. That curve looks complicated, but vectors make it simple. Split the motion into horizontal and vertical components and each one is a motion from the earlier lessons: constant velocity sideways, constant acceleration up and down. This lesson builds the projectile model from that idea, derives range, height and flight time, finds the angles that hit a given target, and finally adds air resistance by stepping through time, where the neat formulas stop working and the computer takes over.

This lesson covers:

- splitting a launch velocity into components, and the two independent motions;
- the parabolic path, time of flight, range and maximum height;
- why 45° gives the longest range on level ground, and how a launch height changes that;
- finding the launch angles that hit a target;
- adding air resistance with time stepping.

## Two independent motions

::: math
\[ x(t) = v\cos\theta\; t, \qquad y(t) = h + v\sin\theta\; t - \tfrac{1}{2} g t^2 \]
- horizontal: constant velocity; vertical: constant acceleration $-g$
- $v$: launch speed; $\theta$: launch angle; $h$: launch height; the two motions share only $t$
In code: `x = v * math.cos(th) * t`, with `t` running from 0 to the flight time
:::


A projectile launched at speed v and angle θ above the horizontal starts with velocity components v cos θ sideways and v sin θ upwards. With air resistance ignored, the only force is gravity, straight down. So horizontally nothing changes: constant velocity. Vertically, the acceleration is the constant −g. Each component follows its own one-dimensional equation from the motion lesson:

\[ x(t) = v\cos\theta \; t, \qquad y(t) = h + v\sin\theta \; t - \tfrac{1}{2} g t^2 \]

where h is the launch height. The two are linked only by the shared time t. Eliminating t gives y as a quadratic in x, so the path is a **parabola**. Predict before running: launched at 20 m/s, which angle goes farthest, and which goes highest?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

g = 9.81
v = 20.0

fig, ax = plt.subplots(figsize=(8, 4))
for deg in [15, 30, 45, 60, 75]:
    th = math.radians(deg)
    t_flight = 2 * v * math.sin(th) / g
    t = np.linspace(0, t_flight, 200)
    x = v * math.cos(th) * t
    y = v * math.sin(th) * t - 0.5 * g * t ** 2
    ax.plot(x, y, label=f"{deg}°: range {x[-1]:.1f} m, peak {y.max():.1f} m")
ax.set_aspect("equal")
ax.set_xlabel("horizontal distance (m)")
ax.set_ylabel("height (m)")
ax.legend(fontsize=8)
plt.show()
```

The flight time comes from setting y = 0: t (v sin θ − ½ g t) = 0, so besides t = 0 the projectile lands at t = 2v sin θ / g.

45° goes farthest, 40.8 m; 75° goes highest but lands only 20.4 m away. The pairs 15° and 75°, and 30° and 60°, land at the same spot: complementary angles share a range, one path flat and fast, the other high and slow.

## Range, height and flight time

::: math
\[ T = \frac{2v\sin\theta}{g}, \qquad R = \frac{v^2 \sin 2\theta}{g}, \qquad H = \frac{(v\sin\theta)^2}{2g} \]
- $T$: flight time; $R$: range; $H$: maximum height (level ground)
- $\sin 2\theta$ peaks at $\theta = 45°$; $\theta$ and $90° - \theta$ give equal ranges
In code: `level_flight(v, deg)` returns `T, R, H`
:::


The plotted results have formulas. On level ground (h = 0):

\[ T = \frac{2v\sin\theta}{g}, \qquad R = v\cos\theta \cdot T = \frac{v^2 \sin 2\theta}{g}, \qquad H = \frac{(v\sin\theta)^2}{2g} \]

The range uses the double-angle identity 2 sin θ cos θ = sin 2θ, which explains both observations: sin 2θ is largest when 2θ = 90°, so θ = 45°, and sin 2θ = sin(180° − 2θ), so θ and 90° − θ give the same range. The maximum height comes from v² = v₀² + 2a(y − y₀) with the vertical speed reaching zero at the top. Predict before running: if the launch speed doubles, what happens to the range?

```python type
def level_flight(v, deg, g=9.81):
    th = math.radians(deg)
    T = 2 * v * math.sin(th) / g
    R = v ** 2 * math.sin(2 * th) / g
    H = (v * math.sin(th)) ** 2 / (2 * g)
    return T, R, H

for speed in [10, 20, 40]:
    T, R, H = level_flight(speed, 45)
    print(f"v = {speed:>2} m/s at 45°: flight {T:.2f} s, range {R:6.2f} m, peak {H:5.2f} m")
print("sin(2 × 30°) = sin(2 × 60°):", math.isclose(math.sin(math.radians(60)), math.sin(math.radians(120))))
```

```output
v = 10 m/s at 45°: flight 1.44 s, range  10.19 m, peak  2.55 m
v = 20 m/s at 45°: flight 2.88 s, range  40.77 m, peak 10.19 m
v = 40 m/s at 45°: flight 5.77 s, range 163.10 m, peak 40.77 m
sin(2 × 30°) = sin(2 × 60°): True
```

Doubling the speed quadruples the range and the height (they grow with v²) and doubles the flight time. This square law is the reason grinding sparks or flung debris can travel surprisingly far: a fragment leaving a wheel at 40 m/s could, in a vacuum, land 163 m away. Air resistance shortens that a lot, as the last section shows.

## Launching from a height

::: math
\[ h + v\sin\theta\; t - \tfrac{1}{2} g t^2 = 0 \quad\Longrightarrow\quad t = \frac{v\sin\theta + \sqrt{(v\sin\theta)^2 + 2gh}}{g} \]
- the positive root of the quadratic is the landing time
- landing distance $= v\cos\theta \cdot t$; search $\theta$ for the largest
In code: `landing_distance(v, deg, h)` evaluated over `np.arange(0, 90.01, 0.1)`
:::


From a height h the landing time solves h + v sin θ t − ½ g t² = 0, a quadratic in t. Its positive root is

\[ t = \frac{v\sin\theta + \sqrt{(v\sin\theta)^2 + 2 g h}}{g} \]

The extra height buys extra flight time, and it changes the best angle: a flatter launch keeps more horizontal speed, and the drop gives it time to fly. The best angle from height h turns out to be below 45°. Predict before running: material leaves the end of a conveyor 3 m up at 6 m/s. Which discharge angle throws it farthest?

```python type
def landing_distance(v, deg, h, g=9.81):
    th = math.radians(deg)
    vy = v * math.sin(th)
    t = (vy + math.sqrt(vy ** 2 + 2 * g * h)) / g
    return v * math.cos(th) * t

angles = np.arange(0, 90.01, 0.1)
dists = np.array([landing_distance(6, a, 3) for a in angles])
best = angles[dists.argmax()]
print(f"from 3 m at 6 m/s: best angle {best:.1f}°, landing {dists.max():.3f} m (at 45°: {landing_distance(6, 45, 3):.3f} m, horizontal: {landing_distance(6, 0, 3):.3f} m)")
print(f"formula atan(v / sqrt(v² + 2gh)): {math.degrees(math.atan(6 / math.sqrt(36 + 2 * 9.81 * 3))):.1f}°")
```

```output
from 3 m at 6 m/s: best angle 31.6°, landing 5.957 m (at 45°: 5.626 m, horizontal: 4.692 m)
formula atan(v / sqrt(v² + 2gh)): 31.6°
```

The search tries every angle in steps of 0.1° and keeps the best, a brute-force method that needs no algebra; calculus later finds the formula printed on the second line.

The best angle is 31.6°, not 45°, landing 5.96 m out, compared with 5.63 m at 45° and 4.69 m thrown horizontally. The search and the formula agree. When a formula is unknown, a fine search is a trustworthy way to find an optimum of a single variable, and the result checks the formula when one is found.

## Hitting a target

::: math
\[ \frac{gX^2}{2v^2}\,u^2 - X\,u + \left(Y + \frac{gX^2}{2v^2}\right) = 0, \qquad u = \tan\theta \]
- discriminant $b^2 - 4ac$: positive gives two angles, zero gives one, negative gives none
- $u = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, then $\theta = \arctan u$
In code: `a = g * X ** 2 / (2 * v ** 2)`, `b = -X`, `c = Y + a`, `disc = b * b - 4 * a * c`
:::


To hit a point (X, Y), substitute t = X/(v cos θ) into the y equation. Using 1/cos²θ = 1 + tan²θ gives a quadratic in u = tan θ:

\[ \frac{g X^2}{2v^2} u^2 - X u + \left( Y + \frac{g X^2}{2v^2} \right) = 0 \]

A quadratic has two, one or no real roots, depending on its **discriminant**: two angles (a flat shot and a lob) when the target is within reach, exactly one at the edge of reach, none beyond it. Predict before running: from 25 m/s, can a target 40 m away and 10 m up be hit, and at what angles?

```python type
def angles_to_hit(v, X, Y, g=9.81):
    a = g * X ** 2 / (2 * v ** 2)
    b = -X
    c = Y + a
    disc = b * b - 4 * a * c
    if disc < 0:
        return []
    roots = {(-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)}
    return sorted(math.degrees(math.atan(u)) for u in roots)

for X, Y in [(40, 10), (60, 0), (60, 10)]:
    sols = angles_to_hit(25, X, Y)
    print(f"target ({X}, {Y}) at 25 m/s:", [f"{s:.2f}°" for s in sols] or "out of reach")
th = math.radians(angles_to_hit(25, 40, 10)[0])
t_hit = 40 / (25 * math.cos(th))
print("check the flat shot: height at x = 40 is", round(25 * math.sin(th) * t_hit - 0.5 * 9.81 * t_hit ** 2, 9), "m")
```

```output
target (40, 10) at 25 m/s: ['36.21°', '67.82°']
target (60, 0) at 25 m/s: ['35.17°', '54.83°']
target (60, 10) at 25 m/s: out of reach
check the flat shot: height at x = 40 is 10.0 m
```

The target at (40, 10) can be hit with a flat shot at about 36.2° or a lob at about 67.8°. (60, 0) is just inside the 63.7 m level range, so two angles again, one either side of 45°. (60, 10) is out of reach at 25 m/s. Substituting the flat-shot angle back into the equations confirms the projectile passes through the target.

## Air resistance

::: math
\[ \mathbf{a} = (0, -g) - k\,|\mathbf{v}|\,\mathbf{v}, \qquad \mathbf{v} \leftarrow \mathbf{v} + \mathbf{a}\,\Delta t, \qquad \mathbf{p} \leftarrow \mathbf{p} + \mathbf{v}\,\Delta t \]
- drag force $\tfrac{1}{2}\rho C_d A v^2$ opposes the velocity; $k$ is that constant divided by the mass
- no formula exists, so step through time until the ball lands
In code: `acc = np.array([0.0, -g]) - k * speed * vel`, then `pos + vel * dt` and `vel + acc * dt`
:::


Real projectiles feel **drag**, a force opposing the velocity whose size grows roughly with the square of the speed: F = ½ ρ C_d A v². With drag, the horizontal and vertical motions are no longer independent (the drag depends on the total speed), and no simple formula exists. Time stepping, from the motion lesson, handles it: at each small step, compute the acceleration (gravity plus drag, which points against the velocity vector), update the velocity, update the position.

Predict before running: a 45 g ball (about a golf ball) launched at 40 m/s. How much range does drag cost, and is 45° still the best angle?

```python type
def flight_with_drag(v, deg, k, dt=0.001, g=9.81):
    th = math.radians(deg)
    pos = np.array([0.0, 0.0])
    vel = v * np.array([math.cos(th), math.sin(th)])
    while True:
        speed = np.linalg.norm(vel)
        acc = np.array([0.0, -g]) - k * speed * vel
        new_pos = pos + vel * dt
        if new_pos[1] < 0:
            frac = pos[1] / (pos[1] - new_pos[1])
            return pos[0] + frac * (new_pos[0] - pos[0])
        pos, vel = new_pos, vel + acc * dt

rho, cd, area, mass = 1.2, 0.3, math.pi * 0.0215 ** 2, 0.045
k = 0.5 * rho * cd * area / mass
print(f"drag constant k = {k:.5f} per metre")
for deg in [25, 30, 35, 40, 45]:
    print(f"{deg}°: vacuum {level_flight(40, deg)[1]:6.1f} m, with drag {flight_with_drag(40, deg, k):6.1f} m")
```

```output
drag constant k = 0.00581 per metre
25°: vacuum  124.9 m, with drag   85.6 m
30°: vacuum  141.2 m, with drag   92.6 m
35°: vacuum  153.3 m, with drag   96.9 m
40°: vacuum  160.6 m, with drag   98.7 m
45°: vacuum  163.1 m, with drag   98.0 m
```

The drag acceleration is −k |v| v: proportional to the speed squared, pointing against the velocity. On the last step the landing point is found by linear interpolation between the positions above and below the ground.

Drag cuts the range at 45° from 163 m to about 98 m, and the best angle drops: at 40° the ball goes farther than at 45°. A projectile slowed by drag loses horizontal speed throughout its flight, so a flatter launch, which spends less time in the air, wastes less of it. Real golf balls also have spin, which adds lift, another force the stepping method could include with one more term.

::: challenge Flight on level ground [easy]
Write `flight(v, angle_deg, g=9.81)` returning a tuple `(time, range, height)` for a projectile launched from level ground, each rounded to 3 decimal places. Raise `ValueError` if `v` is negative or the angle is outside 0 to 90 inclusive. Then write `speed_for_range(R, angle_deg, g=9.81)`: the launch speed needed to land at distance R at the given angle, rounded to 3 decimal places. Raise `ValueError` if R is negative or the angle is not strictly between 0 and 90 (no range is possible at 0° or 90°).

```python starter
def flight(v, angle_deg, g=9.81):
    return (0.0, 0.0, 0.0)

def speed_for_range(R, angle_deg, g=9.81):
    return 0.0

print(flight(20, 45))
```

```python solution
def flight(v, angle_deg, g=9.81):
    if v < 0 or not 0 <= angle_deg <= 90:
        raise ValueError("need v >= 0 and an angle from 0 to 90 degrees")
    th = math.radians(angle_deg)
    T = 2 * v * math.sin(th) / g
    R = v ** 2 * math.sin(2 * th) / g
    H = (v * math.sin(th)) ** 2 / (2 * g)
    return (round(T, 3), round(R, 3) + 0.0, round(H, 3))

def speed_for_range(R, angle_deg, g=9.81):
    if R < 0 or not 0 < angle_deg < 90:
        raise ValueError("need R >= 0 and an angle strictly between 0 and 90 degrees")
    return round(math.sqrt(R * g / math.sin(2 * math.radians(angle_deg))), 3)

print(flight(20, 45))
```

```python test
for _n in ["flight", "speed_for_range"]:
    assert _n in dir(), f"Define {_n}."
assert flight(20, 45) == (2.883, 40.775, 10.194), f"Got {flight(20, 45)}."
assert flight(20, 30)[1] == flight(20, 60)[1], "Complementary angles share a range."
assert flight(10, 0) == (0.0, 0.0, 0.0) and flight(10, 90)[1] == 0.0 and flight(10, 90)[2] == 5.097, "Flat and vertical launches."
assert flight(0, 45) == (0.0, 0.0, 0.0), "No speed, no flight."
for _bad in [(-1, 45), (10, -5), (10, 91)]:
    try:
        flight(*_bad)
        assert False, f"flight{_bad} should raise ValueError."
    except ValueError:
        pass
assert speed_for_range(40.775, 45) == 20.0 and speed_for_range(100, 30) == 33.657, f"Got {speed_for_range(100, 30)}."
for _bad in [(-5, 45), (50, 0), (50, 90)]:
    try:
        speed_for_range(*_bad)
        assert False, f"speed_for_range{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: T = 2v sin θ / g, R = v² sin 2θ / g, H = (v sin θ)² / 2g, and the reverse: the speed a given range needs."
```

Hint: Use the three formulas from the lesson. For the reverse, solve R = v² sin 2θ / g for v: v = √(R g / sin 2θ).
:::

::: challenge Throwing from a height [medium]
Write `landing(v, angle_deg, h, g=9.81)` returning `(time, distance)` for a projectile launched from height `h` ≥ 0, at an angle between −90 and 90 degrees inclusive (negative angles throw downwards), each rounded to 3 decimal places. Use the positive root of the landing-time quadratic. Raise `ValueError` for a negative height, a negative speed or an angle outside the range; for `h = 0` and an angle ≤ 0, the projectile is already on the ground, so return `(0.0, 0.0)`. Then write `best_angle(v, h, g=9.81)` that returns the angle maximising the landing distance, found by **trying every angle from 0 to 90 in steps of 0.01°** and keeping the best (the first one if several tie), rounded to 2 decimal places. Compare the unrounded distances: reusing `landing`, which rounds to 3 decimal places, creates false ties. Use array operations so the 9,001 angles take well under a second.

```python starter
def landing(v, angle_deg, h, g=9.81):
    return (0.0, 0.0)

def best_angle(v, h, g=9.81):
    return 45.0

print(landing(6, 0, 3), best_angle(6, 3))
```

```python solution
def landing(v, angle_deg, h, g=9.81):
    if h < 0 or v < 0 or not -90 <= angle_deg <= 90:
        raise ValueError("need h >= 0, v >= 0 and an angle from -90 to 90 degrees")
    th = math.radians(angle_deg)
    vy = v * math.sin(th)
    if h == 0 and vy <= 0:
        return (0.0, 0.0)
    t = (vy + math.sqrt(vy ** 2 + 2 * g * h)) / g
    return (round(t, 3), round(v * math.cos(th) * t, 3) + 0.0)

def best_angle(v, h, g=9.81):
    angles = np.round(np.arange(0, 9001) * 0.01, 2)
    th = np.radians(angles)
    vy = v * np.sin(th)
    t = (vy + np.sqrt(vy ** 2 + 2 * g * h)) / g
    d = v * np.cos(th) * t
    return round(float(angles[int(np.argmax(d))]), 2)

print(landing(6, 0, 3), best_angle(6, 3))
```

```python test
import time as _time
for _n in ["landing", "best_angle"]:
    assert _n in dir(), f"Define {_n}."
assert landing(6, 0, 3) == (0.782, 4.692), f"Thrown horizontally from 3 m; got {landing(6, 0, 3)}."
assert landing(6, 45, 3) == (1.326, 5.626) and landing(20, 45, 0) == (2.883, 40.775), "From a height, and from the ground."
assert landing(5, -30, 10) == (1.196, 5.177), f"Thrown downwards; got {landing(5, -30, 10)}."
assert landing(10, -20, 0) == (0.0, 0.0) and landing(0, 0, 0) == (0.0, 0.0), "Already on the ground."
for _bad in [(5, 30, -1), (-5, 30, 1), (5, 95, 1), (5, -91, 1)]:
    try:
        landing(*_bad)
        assert False, f"landing{_bad} should raise ValueError."
    except ValueError:
        pass
_start = _time.perf_counter()
_b = best_angle(6, 3)
_el = _time.perf_counter() - _start
assert _b == 31.63, f"The best angle from 3 m at 6 m/s is 31.63°; got {_b}."
assert best_angle(20, 0) == 45.0, "From the ground, 45°."
_f = math.degrees(math.atan(30 / math.sqrt(30 ** 2 + 2 * 9.81 * 50)))
assert abs(best_angle(30, 50) - _f) <= 0.01, "Agrees with the formula atan(v / sqrt(v² + 2gh))."
assert _el < 1, f"The search took {_el:.2f} s; use array operations."
"SUCCESS: A fine search over one variable finds the optimum, and it agrees with the formula: below 45° whenever the launch is above the landing."
```

Hint: The landing time is `(vy + sqrt(vy**2 + 2*g*h)) / g` with `vy = v sin θ`. For the search, build the angles with `np.arange(0, 9001) * 0.01`, compute every distance at once with NumPy functions, and take `np.argmax`.
:::

::: challenge Aiming at a target [hard]
Write `aim(v, X, Y, g=9.81)` returning the sorted list of launch angles in degrees (rounded to 2 decimal places) that hit the point (X, Y) from the origin at speed v, by solving the quadratic in tan θ from the lesson. Return `[]` if the target is out of reach, and a single-element list when the discriminant is exactly 0 or the two angles round to the same value. Raise `ValueError` if X ≤ 0 or v ≤ 0. Then write `min_speed(X, Y, g=9.81)`: the smallest launch speed that can reach (X, Y), rounded to 3 decimal places. At that speed the discriminant is exactly zero; solving gives v² = g (Y + √(X² + Y²)). Finally write `flight_time_to(v, X, Y, g=9.81)`: for each angle from `aim` (unrounded), the time to reach the target, X / (v cos θ), as a sorted list rounded to 3 decimal places.

```python starter
def aim(v, X, Y, g=9.81):
    return [45.0]

def min_speed(X, Y, g=9.81):
    return 0.0

def flight_time_to(v, X, Y, g=9.81):
    return []

print(aim(25, 40, 10), min_speed(40, 10))
```

```python solution
def _aim_radians(v, X, Y, g):
    if X <= 0 or v <= 0:
        raise ValueError("need X > 0 and v > 0")
    a = g * X ** 2 / (2 * v ** 2)
    b = -X
    c = Y + a
    disc = b * b - 4 * a * c
    if disc < 0:
        return []
    root = math.sqrt(disc)
    us = sorted({(-b - root) / (2 * a), (-b + root) / (2 * a)})
    return [math.atan(u) for u in us]

def aim(v, X, Y, g=9.81):
    out = []
    for th in _aim_radians(v, X, Y, g):
        d = round(math.degrees(th), 2)
        if d not in out:
            out.append(d)
    return out

def min_speed(X, Y, g=9.81):
    return round(math.sqrt(g * (Y + math.hypot(X, Y))), 3)

def flight_time_to(v, X, Y, g=9.81):
    return sorted(round(X / (v * math.cos(th)), 3) for th in _aim_radians(v, X, Y, g))

print(aim(25, 40, 10), min_speed(40, 10))
```

```python test
for _n in ["aim", "min_speed", "flight_time_to"]:
    assert _n in dir(), f"Define {_n}."
assert aim(25, 40, 10) == [36.21, 67.82], f"A flat shot and a lob; got {aim(25, 40, 10)}."
assert aim(25, 60, 10) == [] and aim(25, 60, 0) == [35.17, 54.83], "Out of reach, and two angles either side of 45°."
assert aim(10, 5, -3) == [-18.18, 77.21], f"A target below the launch can need a downward shot; got {aim(10, 5, -3)}."
_v = min_speed(40, 10)
assert _v == 22.418, f"Got {_v}."
_vt = math.sqrt(9.81 * (10 + math.hypot(40, 10)))
_near = aim(_vt * 1.000001, 40, 10)
assert len(_near) in (1, 2) and _near[-1] - _near[0] < 0.5, f"Just above the minimum speed the two solutions nearly merge; got {_near}."
assert aim(_vt * 0.999, 40, 10) == [], "Below the minimum speed, no angle works."
assert aim(_vt * 1.000000001, 40, 10) == [52.02], f"Two angles that round to the same value are reported once; got {aim(_vt * 1.000000001, 40, 10)}."
assert min_speed(30, 0) == round(math.sqrt(9.81 * 30), 3), "On level ground the minimum speed is sqrt(gR), at 45°."
for _bad in [(25, 0, 5), (25, -3, 5), (0, 10, 0)]:
    try:
        aim(*_bad)
        assert False, f"aim{_bad} should raise ValueError."
    except ValueError:
        pass
assert flight_time_to(25, 40, 10) == [1.983, 4.239], f"The lob takes far longer; got {flight_time_to(25, 40, 10)}."
assert flight_time_to(25, 60, 10) == [], "No angles, no times."
"SUCCESS: The target equation is a quadratic in tan θ: two angles, one at the edge of reach, none beyond it."
```

Hint: With a = gX²/(2v²), the quadratic in u = tan θ is a u² − X u + (Y + a) = 0. Check the discriminant X² − 4a(Y + a) before taking its square root, and convert each root with `math.atan`.
:::

## What you learned

- A projectile's motion splits into independent components: constant velocity sideways, constant acceleration −g vertically. The path is a parabola.
- On level ground T = 2v sin θ/g, R = v² sin 2θ/g and H = (v sin θ)²/(2g). Range peaks at 45°, complementary angles share a range, and range grows with v².
- From a height, the landing time is the positive root of a quadratic, and the best angle falls below 45°. A fine one-variable search finds optima without a formula.
- Hitting a target is a quadratic in tan θ: two angles, one, or none, decided by the discriminant.
- Air resistance couples the components; time stepping handles it, cutting the range and lowering the best angle.

The next lesson solves pairs of linear equations, the algebra behind the cable tensions and many design problems.
