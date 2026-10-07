# Vectors: size and direction

"The robot moved 2 metres" is half a statement: 2 metres which way? Displacements, velocities, forces and accelerations all have a size **and** a direction, and the two cannot be separated without losing information. A quantity with both is a **vector**. A temperature or a mass, which has only a size, is a **scalar**. Vectors add in a way numbers do not: a 3 N force and a 4 N force can combine to anything from 1 N to 7 N depending on their directions. This lesson makes vectors concrete: arrows, components, adding and scaling, length and direction, and the way velocities combine when a drone flies through moving air.

This lesson covers:

- vectors as arrows and as lists of components;
- adding, subtracting and scaling vectors, and what each means;
- magnitude, unit vectors and direction angles;
- converting between components and magnitude-and-direction;
- relative velocity: motion through a moving medium.

## Arrows and components

::: math
\[ \mathbf{a} = (a_x, a_y), \qquad \mathbf{a} + \mathbf{b} = (a_x + b_x,\; a_y + b_y) = \mathbf{b} + \mathbf{a} \]
- a vector is its components; adding vectors adds matching components
- $(3, 4) + (-2, 1) = (1, 5)$: the diagonal of the parallelogram
In code: `a = np.array([3.0, 4.0])`, then `a + b`
:::


Draw a vector as an arrow: its length is the **magnitude**, its orientation the **direction**. Where the arrow is drawn does not matter; two arrows with the same length and direction are the same vector. A displacement of "3 m east and 4 m north" is the same vector whether it starts at the door or at the window.

In a coordinate system a vector is given by its **components**, its extent along each axis: v = (3, 4) means 3 units in x and 4 in y. A NumPy array is the natural representation, because arithmetic on arrays is already component by component. Predict before running: how are the arrows for (3, 4), (−2, 1) and their sum related on the plot?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

a = np.array([3.0, 4.0])
b = np.array([-2.0, 1.0])
s = a + b

fig, ax = plt.subplots(figsize=(5, 5))
ax.quiver(0, 0, *a, angles="xy", scale_units="xy", scale=1, color="C0", label="a")
ax.quiver(*a, *b, angles="xy", scale_units="xy", scale=1, color="C1", label="b, drawn from the tip of a")
ax.quiver(0, 0, *s, angles="xy", scale_units="xy", scale=1, color="C2", label="a + b")
ax.quiver(0, 0, *b, angles="xy", scale_units="xy", scale=1, color="C1", alpha=0.3)
ax.quiver(*b, *a, angles="xy", scale_units="xy", scale=1, color="C0", alpha=0.3)
ax.set_xlim(-3, 5)
ax.set_ylim(-1, 6)
ax.set_aspect("equal")
ax.grid(True)
ax.legend(loc="lower right", fontsize=8)
plt.show()
print("a + b =", s, "  b + a =", b + a)
```

```output
a + b = [1. 5.]   b + a = [1. 5.]
```

`ax.quiver(x, y, dx, dy, ...)` draws an arrow from (x, y) with components (dx, dy). The settings `angles="xy", scale_units="xy", scale=1` make the arrows use the axes' own units.

To add vectors, place them **tip to tail**: draw b starting where a ends, and the sum runs from the start of a to the end of b. Doing it in the other order (the faded arrows) reaches the same point, so a + b = b + a: the two routes form the sides of a **parallelogram** whose diagonal is the sum. In components, addition is just adding matching components: (3, 4) + (−2, 1) = (1, 5).

## Subtracting and scaling

::: math
\[ k\,\mathbf{a} = (k a_x,\; k a_y), \qquad \overrightarrow{PQ} = \mathbf{q} - \mathbf{p}, \qquad \mathbf{p} + t\,(\mathbf{q} - \mathbf{p}) \]
- $k$: a scalar; it scales the length by $|k|$ and reverses the direction if negative
- $\mathbf{q} - \mathbf{p}$: the displacement from $P$ to $Q$
In code: `d = q - p`, then `p + 0.25 * d`
:::


Multiplying a vector by a number k, a **scalar**, scales its length by |k|; a negative k also reverses its direction. So 2a is twice as long as a, and −a points the opposite way.

Subtraction is adding the negative: a − b = a + (−b). Its most useful meaning is "the vector **from** B **to** A": if points P and Q have position vectors p and q (arrows from the origin), the displacement from P to Q is q − p. That is how the coordinates lesson computed Δx and Δy. Predict before running: a robot at (2, 1) must reach (7, 13). What displacement does it need, and where is it after 25% of the way?

```python type
p, q = np.array([2.0, 1.0]), np.array([7.0, 13.0])
d = q - p
print("displacement P -> Q:", d, "  length", np.linalg.norm(d))
print("25% of the way:", p + 0.25 * d)
print("2a =", 2 * a, "  -a =", -a, "  a - b =", a - b, " = a + (-b):", np.array_equal(a - b, a + (-b)))
```

```output
displacement P -> Q: [ 5. 12.]   length 13.0
25% of the way: [3.25 4.  ]
2a = [6. 8.]   -a = [-3. -4.]   a - b = [5. 3.]  = a + (-b): True
```

`np.linalg.norm(v)` is the length of a vector, √(v₁² + v₂² + ...).

The displacement is (5, 12), of length 13, the 5-12-13 triangle. A quarter of the way is p + 0.25 d = (3.25, 4), the "P + t(Q − P)" formula of the coordinates lesson, now read as vector arithmetic: start at p and add a scaled displacement.

## Magnitude, direction and unit vectors

::: math
\[ |\mathbf{v}| = \sqrt{v_x^2 + v_y^2}, \qquad \hat{\mathbf{u}} = \frac{\mathbf{v}}{|\mathbf{v}|}, \qquad \mathbf{v} = m\,(\cos\theta,\; \sin\theta) \]
- $|\mathbf{v}|$: magnitude; $\hat{\mathbf{u}}$: unit vector, length 1, same direction
- direction angle $\theta = \operatorname{atan2}(v_y, v_x)$
In code: `np.linalg.norm(v)`, `v / mag`, and `from_polar(magnitude, angle_deg)`
:::


The **magnitude** |v| of v = (v_x, v_y) is √(v_x² + v_y²), Pythagoras once more, and in 3D a third squared term joins. Its **direction angle**, measured anticlockwise from the positive x axis, is atan2(v_y, v_x), as in the sine and cosine lesson.

Dividing a vector by its magnitude gives a **unit vector**, of length 1, pointing the same way: û = v / |v|. A unit vector is a pure direction. Any vector is its magnitude times its unit vector, and going the other way, a vector of magnitude m at angle θ has components

\[ \mathbf{v} = m(\cos\theta, \; \sin\theta) \]

A zero vector has no direction, so it has no unit vector. Predict before running: what are the components of a 250 N force at 30° above the horizontal?

```python type
v = np.array([3.0, 4.0])
mag = np.linalg.norm(v)
u = v / mag
print(f"|v| = {mag}, direction {math.degrees(math.atan2(v[1], v[0])):.2f}°, unit vector {u}, its length {np.linalg.norm(u)}")

def from_polar(magnitude, angle_deg):
    th = math.radians(angle_deg)
    return magnitude * np.array([math.cos(th), math.sin(th)])

F = from_polar(250, 30)
print(f"250 N at 30°: components ({F[0]:.2f}, {F[1]:.2f}) N, back to magnitude {np.linalg.norm(F):.6f} N")
```

```output
|v| = 5.0, direction 53.13°, unit vector [0.6 0.8], its length 1.0
250 N at 30°: components (216.51, 125.00) N, back to magnitude 250.000000 N
```

The unit vector along (3, 4) is (0.6, 0.8), of length 1. The 250 N force splits into 216.51 N horizontally and 125.00 N vertically: the vertical part is exactly half, since sin 30° = 0.5. Splitting forces into components like this is the subject of the next lesson.

## Relative velocity

::: math
\[ \mathbf{v}_\text{ground} = \mathbf{v}_\text{air} + \mathbf{w} \]
- $\mathbf{v}_\text{air}$: the drone's velocity relative to the air; $\mathbf{w}$: the wind's velocity
- the ground track angle is $\operatorname{atan2}(v_y, v_x)$ of the sum
In code: `ground = air + wind`, with each built by `from_polar`
:::


Velocities are vectors and add like displacements. A drone flies through air; the air itself moves (the wind). The drone's velocity over the ground is its velocity **relative to the air** plus the **wind's** velocity:

\[ \mathbf{v}_\text{ground} = \mathbf{v}_\text{air} + \mathbf{w} \]

So a drone pointed east does not go east in a crosswind: it drifts. Pilots, ships and drones all solve the same triangle, choosing a heading so that the sum points where they want to go. Predict before running: a drone flies at 12 m/s pointing due east (0°) in a 5 m/s wind from the south (blowing towards 90°). Where does it actually go, and how far off course is it after 2 km of eastward progress?

```python type
air = from_polar(12, 0)
wind = from_polar(5, 90)
ground = air + wind
speed = np.linalg.norm(ground)
track = math.degrees(math.atan2(ground[1], ground[0]))
print(f"ground velocity {ground} m/s: speed {speed:.2f} m/s, track {track:.2f}° (north of east)")
t_east = 2000 / ground[0]
print(f"after 2 km east ({t_east:.0f} s), it has drifted {ground[1] * t_east:.0f} m north")

needed = -math.degrees(math.asin(5 / 12))
air2 = from_polar(12, needed)
print(f"heading {needed:.2f}° (south of east) cancels the drift: ground velocity {np.round(air2 + wind, 10)} m/s")
```

```output
ground velocity [12.  5.] m/s: speed 13.00 m/s, track 22.62° (north of east)
after 2 km east (167 s), it has drifted 833 m north
heading -24.62° (south of east) cancels the drift: ground velocity [10.90871211  0.        ] m/s
```

The final heading points the drone partly into the wind, so that its northward component, 12 sin(heading), exactly cancels the wind's 5 m/s; `np.round(..., 10)` hides a rounding residue of about 10⁻¹⁶.

The drone's ground speed is 13 m/s (a 5-12-13 triangle again) along a track 22.62° north of east, and by the time it has gone 2 km east it is 833 m off course. Turning 24.62° into the wind cancels the drift, but the ground speed falls to about 10.9 m/s, because part of the drone's effort now goes into fighting the crosswind. The headwind and crosswind trade-off, and the case where the wind is stronger than the drone, are in the hard challenge.

::: challenge Vector basics [easy]
Write `magnitude(v)`, the length of a vector of any dimension (a list, tuple or array), as a plain float. Write `unit(v)`, the unit vector in the direction of v as a NumPy array, raising `ValueError` for the zero vector. Write `direction_deg(v)` for 2D vectors, the angle anticlockwise from the positive x axis in [0, 360), raising `ValueError` for the zero vector. Finally `components(magnitude, angle_deg)`, the 2D vector as a NumPy array rounded to 9 decimal places (use `np.round` and add `0.0` to tidy `-0.0`).

```python starter
def magnitude(v):
    return sum(v)

def unit(v):
    return np.asarray(v, dtype=float)

def direction_deg(v):
    return 0.0

def components(magnitude, angle_deg):
    return np.array([magnitude, 0.0])

print(magnitude([3, 4]), unit([3, 4]))
```

```python solution
def magnitude(v):
    return float(np.linalg.norm(np.asarray(v, dtype=float)))

def unit(v):
    m = magnitude(v)
    if m == 0:
        raise ValueError("the zero vector has no direction")
    return np.asarray(v, dtype=float) / m

def direction_deg(v):
    if magnitude(v) == 0:
        raise ValueError("the zero vector has no direction")
    return math.degrees(math.atan2(v[1], v[0])) % 360

def components(magnitude, angle_deg):
    th = math.radians(angle_deg)
    return np.round(magnitude * np.array([math.cos(th), math.sin(th)]), 9) + 0.0

print(magnitude([3, 4]), unit([3, 4]))
```

```python test
for _n in ["magnitude", "unit", "direction_deg", "components"]:
    assert _n in dir(), f"Define {_n}."
assert magnitude([3, 4]) == 5.0 and magnitude((1, 2, 2)) == 3.0 and magnitude(np.array([0.0, 0.0])) == 0.0, "Lengths in 2D and 3D."
assert type(magnitude([3, 4])) is float, "Return a plain float (convert with float(...))."
assert np.allclose(unit([3, 4]), [0.6, 0.8]) and np.allclose(unit((0, 0, -7)), [0, 0, -1]), "Unit vectors."
assert isinstance(unit([3, 4]), np.ndarray), "unit returns a NumPy array."
for _f in (unit, direction_deg):
    try:
        _f([0, 0])
        assert False, f"{_f.__name__}([0, 0]) should raise ValueError."
    except ValueError:
        pass
assert direction_deg([1, 1]) == 45.0 and direction_deg([-1, -1]) == 225.0 and direction_deg([0, -2]) == 270.0 and direction_deg([5, 0]) == 0.0, "Angles in [0, 360)."
assert np.array_equal(components(250, 30), np.round([250 * math.cos(math.pi / 6), 125.0], 9)), "250 N at 30°."
assert np.array_equal(components(10, 90), [0.0, 10.0]) and str(components(10, 270)[0]) == "0.0", "Exact axes, with no -0.0."
"SUCCESS: Magnitude, unit vector, direction, and back to components: the four conversions every vector calculation uses."
```

Hint: `np.linalg.norm` gives the length; divide by it for the unit vector. `math.atan2(y, x)` gives the direction in (−180°, 180°], and `% 360` moves it into [0, 360).
:::

::: challenge Where did the robot end up? [medium]
A mobile robot logs its moves as `(distance, angle_deg)` pairs, each angle measured anticlockwise from the positive x axis, starting from `start` (default `(0, 0)`). Write `final_position(moves, start=(0, 0))` returning the end point as a NumPy array rounded to 6 decimal places. Write `return_trip(moves, start=(0, 0))`, returning `(distance, angle_deg)` for the straight move that takes the robot back to its start: the distance rounded to 6 decimal places and the angle in [0, 360) rounded to 3 decimal places; if that distance rounds to 0 (at 6 decimal places), the robot is back at the start, so return `(0.0, 0.0)`. Building `return_trip` on your rounded `final_position` handles this naturally. Finally write `path_length(moves)`, the total distance driven, and `efficiency(moves)`, the straight-line distance from start to finish divided by the path length, rounded to 4 decimal places (raise `ValueError` if the path length is 0).

```python starter
def final_position(moves, start=(0, 0)):
    return np.array(start, dtype=float)

def return_trip(moves, start=(0, 0)):
    return (0.0, 0.0)

def path_length(moves):
    return 0.0

def efficiency(moves):
    return 1.0

print(final_position([(3, 0), (4, 90)]))
```

```python solution
def final_position(moves, start=(0, 0)):
    pos = np.array(start, dtype=float)
    for dist, ang in moves:
        th = math.radians(ang)
        pos = pos + dist * np.array([math.cos(th), math.sin(th)])
    return np.round(pos, 6) + 0.0

def return_trip(moves, start=(0, 0)):
    back = np.array(start, dtype=float) - final_position(moves, start)
    d = float(np.hypot(*back))
    if round(d, 6) == 0:
        return (0.0, 0.0)
    return (round(d, 6), round(math.degrees(math.atan2(back[1], back[0])) % 360, 3))

def path_length(moves):
    return float(sum(dist for dist, _ in moves))

def efficiency(moves):
    total = path_length(moves)
    if total == 0:
        raise ValueError("the robot did not move")
    straight = float(np.hypot(*final_position(moves)))
    return round(straight / total, 4)

print(final_position([(3, 0), (4, 90)]))
```

```python test
for _n in ["final_position", "return_trip", "path_length", "efficiency"]:
    assert _n in dir(), f"Define {_n}."
assert np.array_equal(final_position([(3, 0), (4, 90)]), [3.0, 4.0]), "East 3, then north 4."
assert np.array_equal(final_position([(3, 0), (4, 90)], start=(10, -2)), [13.0, 2.0]), "From a different start."
assert np.array_equal(final_position([]), [0.0, 0.0]), "No moves."
assert return_trip([(3, 0), (4, 90)]) == (5.0, 233.13), f"Back 5 m at 233.13°; got {return_trip([(3, 0), (4, 90)])}."
assert return_trip([(2, 0), (2, 90), (2, 180), (2, 270)]) == (0.0, 0.0), "A closed square returns (0.0, 0.0)."
assert return_trip([(5, 45)], start=(1, 1)) == (5.0, 225.0), "Straight back the way it came."
assert path_length([(3, 0), (4, 90)]) == 7.0, "Total distance driven."
assert efficiency([(3, 0), (4, 90)]) == 0.7143 and efficiency([(6, 30), (4, 30)]) == 1.0, "Straight-line over path length."
try:
    efficiency([])
    assert False, "No movement should raise ValueError."
except ValueError:
    pass
"SUCCESS: Each move is a vector; the trip home is the negative of their sum."
```

Hint: Each move is the vector `dist * (cos θ, sin θ)`; add them all to the start. The way back is `start - end`; its length is `np.hypot`, and its direction comes from `atan2`.
:::

::: challenge Flying a track in wind [hard]
A drone flies at `airspeed` (m/s) relative to the air, and the wind is a vector `wind` (m/s, the direction it blows towards). To travel over the ground along a **track** angle `track_deg`, it must choose a **heading** so that the ground velocity, air velocity plus wind, points along the track. Split the wind into its components along the track and across it, with t = (cos track, sin track) and n = (−sin track, cos track): `w_along = wind · t` and `w_cross = wind · n` (here a · b means a₁b₁ + a₂b₂). The air velocity's cross-track component must cancel the wind's: airspeed × sin(heading − track) = −w_cross. Then the ground speed is airspeed × cos(heading − track) + w_along.

Write `heading_for_track(airspeed, wind, track_deg)` returning `(heading_deg, ground_speed)`, the heading in [0, 360) rounded to 3 decimal places and the ground speed rounded to 3 decimal places. Raise `ValueError` if the crosswind is stronger than the airspeed (|w_cross| > airspeed, no heading works) or if the resulting ground speed is not positive (the drone would be blown backwards). Then write `flight_time(airspeed, wind, start, end)`, the time in seconds to fly in a straight line from point `start` to point `end`, rounded to 1 decimal place (`0.0` if the two points are the same).

```python starter
def heading_for_track(airspeed, wind, track_deg):
    return (track_deg, airspeed)

def flight_time(airspeed, wind, start, end):
    return 0.0

print(heading_for_track(12, (0, 5), 0))
```

```python solution
def heading_for_track(airspeed, wind, track_deg):
    th = math.radians(track_deg)
    t = (math.cos(th), math.sin(th))
    n = (-math.sin(th), math.cos(th))
    w_along = wind[0] * t[0] + wind[1] * t[1]
    w_cross = wind[0] * n[0] + wind[1] * n[1]
    if abs(w_cross) > airspeed:
        raise ValueError("the crosswind is stronger than the airspeed")
    off = math.asin(-w_cross / airspeed)
    ground = airspeed * math.cos(off) + w_along
    if ground <= 0:
        raise ValueError("the drone cannot make progress along this track")
    return (round(math.degrees(th + off) % 360, 3), round(ground, 3))

def flight_time(airspeed, wind, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    dist = math.hypot(dx, dy)
    if dist == 0:
        return 0.0
    _, ground = heading_for_track(airspeed, wind, math.degrees(math.atan2(dy, dx)))
    return round(dist / ground, 1)

print(heading_for_track(12, (0, 5), 0))
```

```python test
for _n in ["heading_for_track", "flight_time"]:
    assert _n in dir(), f"Define {_n}."
assert heading_for_track(12, (0, 5), 0) == (335.376, 10.909), f"The lesson's drone; got {heading_for_track(12, (0, 5), 0)}."
assert heading_for_track(12, (0, 0), 73) == (73.0, 12.0), "No wind: fly the track at airspeed."
assert heading_for_track(10, (-4, 0), 0) == (0.0, 6.0) and heading_for_track(10, (4, 0), 180) == (180.0, 6.0), "A pure headwind slows the drone."
assert heading_for_track(10, (3, 0), 0) == (0.0, 13.0), "A tailwind speeds it up."
_h, _g = heading_for_track(15, (4, -3), 120)
_air = 15 * np.array([math.cos(math.radians(_h)), math.sin(math.radians(_h))])
_gv = _air + np.array([4, -3])
assert abs(math.degrees(math.atan2(_gv[1], _gv[0])) - 120) < 0.01 and abs(np.linalg.norm(_gv) - _g) < 0.01, "The ground velocity must point along the track at the returned speed."
for _args in [(4, (0, 5), 0), (5, (-6, 0), 0)]:
    try:
        heading_for_track(*_args)
        assert False, f"heading_for_track{_args} should raise ValueError."
    except ValueError:
        pass
assert flight_time(12, (0, 5), (0, 0), (2000, 0)) == round(2000 / 10.908712114635714, 1), "2 km east in the lesson's wind."
assert flight_time(10, (3, 4), (5, 5), (5, 5)) == 0.0, "No distance, no time."
assert flight_time(10, (-4, 0), (0, 0), (600, 0)) == 100.0 and flight_time(10, (-4, 0), (600, 0), (0, 0)) == 42.9, "Out against the wind and back with it."
"SUCCESS: Split the wind along and across the track, cancel the crosswind, and what is left sets the ground speed."
```

Hint: Compute `w_along` and `w_cross` from the formulas. The angle between heading and track is `asin(-w_cross / airspeed)` (impossible if that ratio exceeds 1 in size); add it to the track angle. For `flight_time`, the track is the direction from start to end.
:::

## What you learned

- A vector has magnitude and direction; in coordinates it is a list of components, naturally a NumPy array. Where an arrow is drawn does not matter.
- Vectors add tip to tail (component by component), and a + b = b + a. Scaling by k multiplies the length by |k|, reversing it if k < 0. The vector from P to Q is q − p.
- |v| = √(v_x² + v_y²); the direction is atan2(v_y, v_x); a unit vector is v/|v|; a vector of magnitude m at angle θ is m(cos θ, sin θ).
- Velocities add: ground velocity = air velocity + wind. Steering into a crosswind cancels drift at the cost of ground speed.

The next lesson resolves forces into components, adds them, and finds what holds a bracket in equilibrium.
