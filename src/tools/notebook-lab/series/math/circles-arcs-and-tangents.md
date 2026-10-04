# Circles, arcs and tangents

A machine follows part of a circle to round a corner. Its endpoints alone do not specify the path: the tool could go the short way, the long way, clockwise or counter-clockwise. Meanwhile, drawing that arc as straight segments introduces an error between the displayed path and the true circle. We need a description that makes those choices explicit.

You will calculate circular positions and distances, distinguish arc length from endpoint distance, build a direction-aware arc sampler, and find straight lines that touch a circle without cutting across it. These are geometric models, not complete machine-control instructions.

Prerequisites: [angles and radians](#/notebook-lab?lesson=math-angles-and-rotation), [inverse trigonometry](#/notebook-lab?lesson=math-inverse-trig-and-atan2), and [trigonometric identities](#/notebook-lab?lesson=math-trig-identities). All functions here use radians. Run the demos in order for imports and helper functions. Coordinates and radii must use the same length unit.

## 1. Turn a radius and angle into a position

Draw a circle of radius 10 mm centred at (20, 30) mm. At angle zero, its point is 10 mm to the right of the centre: (30, 30). At a quarter turn it is 10 mm above the centre: (20, 40). At half a turn it is to the left: (10, 30).

Call the centre coordinates cx and cy. Call the radius r and the angle theta, written $\theta$. The horizontal offset is r times cosine; the vertical offset is r times sine. Adding the centre changes offsets into absolute coordinates. Angles increase counter-clockwise from the positive horizontal direction.

::: math
\[ x=c_x+r\cos\theta, \qquad y=c_y+r\sin\theta \]
- $c_x,c_y$: centre coordinates; subscripts are labels for horizontal and vertical components, not multiplication.
- $r$: positive radius; $\theta$: angle in radians. A full turn is $2\pi$ radians, where pi is the circle constant.
In code: multiply the cosine and sine by the radius, then add the corresponding centre coordinate.
:::

Predict before running: where is the point at three quarters of a turn? Should changing the centre change the point's distance from that centre?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def circle_point(cx, cy, radius, theta):
    horizontal_offset = radius * math.cos(theta)
    vertical_offset = radius * math.sin(theta)
    return cx + horizontal_offset, cy + vertical_offset

for theta in [0, math.pi / 2, math.pi, 3 * math.pi / 2]:
    x, y = circle_point(20, 30, 10, theta)
    distance = math.hypot(x - 20, y - 30)
    print(f"angle={theta:.3f} rad: ({x:.3f}, {y:.3f}) mm; radius check={distance:.3f} mm")
```

The last point is (20, 20) mm. `math.hypot(dx, dy)` computes the length of a displacement with horizontal component dx and vertical component dy. Subtracting the centre before calling it is essential: distance from the origin is a different quantity. Tiny residual coordinates at quarter turns are ordinary floating-point rounding.

## 2. An arc and a chord measure different journeys

A quarter turn around a 10 mm radius has length about 15.708 mm along the circle. The straight shortcut between its endpoints is about 14.142 mm. The curved route is an **arc**; the straight segment is a **chord**. Confusing them changes both path length and travel time.

Let the signed sweep be delta, written $\Delta\theta$. Here the capital Greek delta means “change in angle”: final angle minus initial angle along the chosen route. Arc length is radius times the magnitude of the sweep. Magnitude means ignoring the sign, written with vertical bars and computed by `abs`.

::: math
\[ s=r|\Delta\theta|, \qquad d=2r\sin(|\Delta\theta|/2) \quad (|\Delta\theta|\leq2\pi) \]
- $s$: distance travelled along a single-turn arc; $d$: chord length between its endpoints.
- Bisecting the triangle from the centre to the endpoints gives two right triangles, each with opposite side d/2 and hypotenuse r.
In code: use `radius * abs(sweep)` for travel, and the half-angle sine for the straight shortcut.
:::

Predict before running: for a full turn, what happens to the travel distance and to the chord? The endpoint returns to the start, but the tool has still travelled around the circle.

```python
radius = 10.0
for sweep in [math.pi / 2, math.pi, 2 * math.pi]:
    arc_length = radius * abs(sweep)
    chord_length = 2 * radius * math.sin(abs(sweep) / 2)
    print(f"sweep={math.degrees(sweep):.0f}°: arc={arc_length:.6f} mm; chord={chord_length:.6f} mm")
```

The full-turn chord is zero to rounding accuracy; the travel is about 62.832 mm. For sweeps exceeding a full turn, arc length still counts all travel, but endpoint separation repeats. We restrict the displayed chord formula to one turn so its sine is nonnegative.

## 3. Direction is part of the arc's data

From 350° to 10°, a counter-clockwise arc moves forward by 20°. Direct subtraction gives -340°, which describes the clockwise route instead. Both connect the same endpoints. A reliable function must take a direction argument rather than guess which route the caller wanted.

The modulo operator `%` returns a remainder. With a positive divisor of one full turn, it wraps a difference into the interval from zero up to, but not including, one turn. Compute the counter-clockwise sweep by wrapping end minus start; compute the clockwise sweep by wrapping start minus end and negating it.

::: math
\[ \Delta\theta_{\mathrm{ccw}}=(\theta_{\mathrm{end}}-\theta_{\mathrm{start}})\bmod 2\pi \]
\[ \Delta\theta_{\mathrm{cw}}=-((\theta_{\mathrm{start}}-\theta_{\mathrm{end}})\bmod 2\pi) \]
- ccw and cw mean counter-clockwise and clockwise.
- Equal start and end angles mean zero travel in this convention. A full turn must be requested separately.
In code: `% (2 * math.pi)` wraps the angular difference; the clockwise branch returns a negative sweep.
:::

Predict before running: starting at 350° and ending at 10°, will the clockwise sweep be -20° or -340°?

```python
def arc_sweep(start, end, clockwise=False):
    full_turn = 2 * math.pi
    if clockwise:
        return -((start - end) % full_turn)
    return (end - start) % full_turn

start, end = math.radians(350), math.radians(10)
for clockwise in [False, True]:
    sweep = arc_sweep(start, end, clockwise)
    print("clockwise:", clockwise, "sweep (degrees):", round(math.degrees(sweep), 6))
```

The clockwise route is -340°. Some applications instead require the shortest route regardless of direction; that is a different contract. Naming the convention prevents a quiet geometry error. None of these functions can infer whether a coincident endpoint was meant to specify no motion or a full revolution.

::: challenge Sample a directed arc [medium]
Write `sample_arc(cx, cy, radius, start, end, segments, clockwise=False)` returning a list of `(x, y)` points, including both endpoints. Use `arc_sweep` and `circle_point` from the demos. `segments` is the number of straight pieces, so there must be `segments + 1` points. Raise `ValueError` for a nonpositive radius or a segment count that is not a positive integer; reject booleans as counts. Other inputs are finite scalars. Equal angles use the zero-travel convention.

The loop visits integer step numbers from zero through segments inclusive. At each step, divide the step by segments to get the fraction of the route completed; multiply that fraction by the sweep and add the starting angle.
```python starter
def sample_arc(cx, cy, radius, start, end, segments, clockwise=False):
    return [circle_point(cx, cy, radius, start), circle_point(cx, cy, radius, end)]
```
```python solution
def sample_arc(cx, cy, radius, start, end, segments, clockwise=False):
    if radius <= 0 or type(segments) is not int or segments <= 0:
        raise ValueError("Need a positive radius and positive integer segment count")
    sweep = arc_sweep(start, end, clockwise)
    points = []
    for step in range(segments + 1):
        fraction = step / segments
        theta = start + fraction * sweep
        points.append(circle_point(cx, cy, radius, theta))
    return points
```
```python test
_p = sample_arc(2, -1, 3, 0, math.pi / 2, 2)
assert len(_p) == 3, "Two segments need three points, with both endpoints included."
assert np.allclose(_p, [(5, -1), (2 + 3 / math.sqrt(2), -1 + 3 / math.sqrt(2)), (2, 2)]), "Interpolate angle, then convert to a point relative to the centre."
for _cw, _middle in [(False, 360), (True, 180)]:
    _p = sample_arc(0, 0, 2, math.radians(350), math.radians(10), 2, _cw)
    assert np.allclose(_p[1], circle_point(0, 0, 2, math.radians(_middle))), "Check wraparound and direction: the midpoint distinguishes the long arc from the short one."
    assert all(math.isclose(math.hypot(_x, _y), 2) for _x, _y in _p), "All samples must remain on the circle."
assert np.allclose(sample_arc(0, 0, 1, 0, 0, 2), [(1, 0)] * 3), "Equal angles mean zero travel, not a full turn."
for _radius, _segments in [(0, 2), (1, 0), (1, -1), (1, 2.5), (1, True)]:
    try:
        sample_arc(0, 0, _radius, 0, 1, _segments)
    except ValueError:
        pass
    else:
        assert False, "Reject invalid radii and segment counts."
"SUCCESS: The point sequence records the chosen route, not merely the endpoints."
```
Hint: `range(segments + 1)` includes step number segments because Python excludes the stopping value. Use `step / segments`, not `step / (segments + 1)`.
:::

## 4. Bound the error between a chord and an arc

If a screen or export format uses straight segments, the chord lies inside the circle. Its largest gap from the arc occurs halfway along the segment. This gap is called the **sagitta**. Draw a radius to the chord's midpoint: its length along that direction is r cos(delta/2), so the gap is r minus that value.

For a very small segment angle, direct subtraction loses digits. The half-angle identity from the previous notebook gives the equivalent expression below without that cancellation. Here delta denotes the magnitude of one segment's angle, not the entire path's sweep.

::: math
\[ e=r(1-\cos(\delta/2))=2r\sin^2(\delta/4) \]
\[ \delta_{\max}=4\arcsin\sqrt{\frac{e_{\max}}{2r}} \]
- $e$: maximum chord-to-arc gap; $e_{\max}$: permitted gap, between zero and r.
- $\delta_{\max}$: largest permitted segment angle; the formula follows by solving the first equation for delta.
In code: calculate an allowed angle, divide the whole sweep by it, and round upward with `math.ceil`.
:::

Predict before running: for a quarter turn of radius 50 mm, will a tolerance of 0.01 mm require more segments than 0.1 mm? Halving the segment angle makes a small sagitta roughly four times smaller.

```python
def segment_count(radius, sweep, tolerance):
    if radius <= 0 or not 0 < tolerance < radius:
        raise ValueError("Need 0 < tolerance < radius")
    if sweep == 0:
        return 0
    allowed_angle = 4 * math.asin(math.sqrt(tolerance / (2 * radius)))
    return max(1, math.ceil(abs(sweep) / allowed_angle))

for tolerance in [0.1, 0.01]:
    count = segment_count(50, math.pi / 2, tolerance)
    actual_angle = (math.pi / 2) / count
    gap = 2 * 50 * math.sin(actual_angle / 4)**2
    print(f"Tolerance {tolerance} mm: {count} segments; maximum gap {gap:.6f} mm")
```

`math.ceil` returns the next integer at or above the requested count. Rounding downward could violate the gap bound. The calculation returns zero pieces for zero travel; the earlier sampler intentionally requires a positive count, so a caller should handle that no-motion case before invoking it. This tolerance describes geometric approximation only. It does not account for tool deflection, controller behaviour or measurement error.

## 5. A tangent is perpendicular to the contact radius

A **tangent** touches a circle at one point and follows the direction perpendicular to the radius there. At the circle's rightmost point the radius is horizontal, so the tangent is vertical. Rotate a vector (x, y) by a quarter turn and its components become (-y, x). Applying this to the unit-radius direction gives the tangent direction (-sin(theta), cos(theta)).

Now place an external point P a distance d from the centre O. A tangent contact T forms a right triangle OPT, with OT = r and OP = d. There are two tangent contacts when d is greater than r, one coincident contact when d equals r, and none when P lies inside the circle.

::: math
\[ \alpha=\arccos(r/d), \qquad \theta_{\mathrm{contact}}=\beta\pm\alpha \]
- $\beta$: direction from centre to external point, found using `atan2`.
- $\alpha$: angle between OP and either contact radius; its cosine is adjacent length r divided by hypotenuse d.
In code: find d and beta from the point's offsets, then evaluate the circle at beta minus alpha and beta plus alpha.
:::

Predict before running: for a radius-3 circle centred at the origin and external point (5, 0), should both contacts have positive horizontal coordinates? Will their heights have opposite signs?

```python
cx, cy, radius = 0.0, 0.0, 3.0
px, py = 5.0, 0.0
dx, dy = px - cx, py - cy
distance = math.hypot(dx, dy)
bearing = math.atan2(dy, dx)
offset = math.acos(radius / distance)
contacts = [circle_point(cx, cy, radius, bearing - offset),
            circle_point(cx, cy, radius, bearing + offset)]
print("Tangent contacts:", contacts)
angles = np.linspace(0, 2 * np.pi, 300)
fig, ax = plt.subplots(figsize=(6, 4))
ax.plot(cx + radius * np.cos(angles), cy + radius * np.sin(angles))
for tx, ty in contacts:
    ax.plot([px, tx], [py, ty], "o-")
    ax.plot([cx, tx], [cy, ty], ":", color="gray")
ax.set(xlabel="x", ylabel="y", title="Two tangent paths from one external point")
ax.set_aspect("equal", adjustable="box")
fig.tight_layout()
plt.show()
```

The contacts are (1.8, -2.4) and (1.8, 2.4). The two straight tangent paths have equal length, 4 units, by the 3-4-5 right triangle. This construction is a building block for belt paths and transitions between straight and curved motion; a complete belt model must account for both pulleys and choose the intended tangent pair.

::: challenge Locate the tangent contacts [medium]
Write `tangent_contacts(cx, cy, radius, px, py)` returning the two contact points for an external point, in either order. Require a positive radius and a point strictly outside the circle; raise `ValueError` otherwise. Inputs are finite. You can use `circle_point`. Subtract the centre before computing distance and bearing.
```python starter
def tangent_contacts(cx, cy, radius, px, py):
    return [(cx + radius, cy), (cx - radius, cy)]
```
```python solution
def tangent_contacts(cx, cy, radius, px, py):
    dx, dy = px - cx, py - cy
    distance = math.hypot(dx, dy)
    if radius <= 0 or distance <= radius:
        raise ValueError("Need a positive radius and a strictly external point")
    bearing = math.atan2(dy, dx)
    offset = math.acos(radius / distance)
    return [circle_point(cx, cy, radius, bearing - offset),
            circle_point(cx, cy, radius, bearing + offset)]
```
```python test
for _cx, _cy, _r, _px, _py in [(0, 0, 3, 5, 0), (10, -4, 2, 10, 1), (-2, 3, 1, -5, -1)]:
    _contacts = tangent_contacts(_cx, _cy, _r, _px, _py)
    assert len(_contacts) == 2 and not np.allclose(_contacts[0], _contacts[1]), "A strictly external point has two distinct contacts."
    _d = math.hypot(_px - _cx, _py - _cy)
    for _tx, _ty in _contacts:
        assert math.isclose(math.hypot(_tx - _cx, _ty - _cy), _r, abs_tol=1e-10), "Every contact must lie on the circle."
        _tangent_length = math.hypot(_px - _tx, _py - _ty)
        assert math.isclose(_tangent_length**2 + _r**2, _d**2, abs_tol=1e-9), "Centre, contact and external point must form a right triangle at contact."
for _args in [(0, 0, 0, 5, 0), (0, 0, 3, 1, 0), (0, 0, 3, 3, 0)]:
    try:
        tangent_contacts(*_args)
    except ValueError:
        pass
    else:
        assert False, "This function requires positive radius and a strictly external point."
"SUCCESS: Both contact points lie on the circle and make right triangles with the centre and external point."
```
Hint: `math.hypot` gives d, `math.atan2` gives beta, and `math.acos(radius / d)` gives the offset. Add and subtract that offset from beta.
:::

## Reference: describe the route, then approximate it

- Position: `centre + radius * (cos(theta), sin(theta))`, evaluated component by component. Theta is in radians.
- Sweep: choose clockwise or counter-clockwise explicitly. State whether equal endpoints mean zero travel or a full turn.
- Travel: radius times absolute sweep. Endpoint distance is a chord, not travel length.
- Sampling: loop over step numbers, convert each to a fraction of the sweep, then calculate its point. There is one more point than segment.
- Chord error: `2 * radius * sin(segment_angle / 4)**2`; choose a count that keeps it within the required tolerance.
- Tangency: the contact radius is perpendicular to the straight tangent. External-point construction gives two candidates; choose the one the application needs.

For a transfer experiment, move the external point upward and predict how both contacts move before rerunning the tangent demo. Then reduce the arc tolerance tenfold and compare the required segment count. The next lesson uses ordered boundary points to measure the area enclosed by a polygon.
