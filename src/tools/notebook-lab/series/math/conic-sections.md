# Conic sections

A circular profile has the same distance from one centre everywhere. A reflector or an orbital model may need a different distance rule. Some curves keep the sum of two distances constant; others keep a point-distance equal to a line-distance. Those rules produce ellipses, parabolas and hyperbolas, collectively called **conic sections** because suitable plane cuts through a cone produce them.

You will construct these curves from their distance definitions, connect those definitions to coordinate equations, and calculate useful dimensions without mixing up their parameters. The emphasis is on centred or axis-aligned examples; rotating and translating general conics comes later.

Prerequisites: [coordinates and distance](#/notebook-lab?lesson=math-coordinates-and-distance), [circles](#/notebook-lab?lesson=math-circles-arcs-and-tangents), and [quadratics](#/notebook-lab?lesson=math-quadratics). Run the demos in order for shared imports. All coordinates and length parameters use the same unit.

## 1. A parabola balances a point-distance and a line-distance

Put a point F at (0, 1) and draw a horizontal line at y = -1. The origin is one unit from each. So is every point on the curve y = x²/4: for example, (2, 1) is two units from F and two units above the line. This equal-distance rule defines a **parabola**.

The fixed point F is the **focus**. The fixed line is the **directrix**. The closest point of the curve to the directrix is its **vertex**, here the origin. Let p be the distance from vertex to focus. For this upward-opening form, p is positive, the focus is (0, p), and the directrix is y = -p.

Square the point-distance and the line-distance to avoid square roots. They are x² + (y - p)² and (y + p)². Expand both squares; the y² and p² terms cancel. What remains is x² = 4py. The familiar quadratic equation is therefore a compact form of the distance rule.

::: math
\[ x^2+(y-p)^2=(y+p)^2 \quad\Longrightarrow\quad y=\frac{x^2}{4p} \]
- $x,y$: coordinates of a point on the parabola; p is a positive length, not a slope.
- The arrow means “this implies”: simplifying the equality gives the equation on the right.
In code: choose horizontal positions, square them, divide by `4*p`, and compare focus distance with distance to the directrix.
:::

Predict before running: at x = 4 with p = 1, what is y, and what are the two distances? Increasing p spreads the curve outward at a fixed height.

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

p = 1.0
for x in [0, 2, 4]:
    y = x * x / (4 * p)
    focus_distance = math.hypot(x, y - p)
    line_distance = abs(y + p)
    print(f"({x}, {y}): focus distance={focus_distance:.6f}, line distance={line_distance:.6f}")
x_values = np.linspace(-4, 4, 200)
y_values = x_values**2 / (4 * p)
fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(x_values, y_values, label="Parabola")
ax.scatter([0], [p], label="Focus (0, p)")
ax.axhline(-p, color="gray", linestyle="--", label="Directrix y = −p")
ax.set(xlabel="x", ylabel="y", title="A parabola's equal-distance construction")
ax.set_aspect("equal", adjustable="box")
ax.legend()
fig.tight_layout()
plt.show()
```

```output
(0, 0.0): focus distance=1.000000, line distance=1.000000
(2, 1.0): focus distance=2.000000, line distance=2.000000
(4, 4.0): focus distance=5.000000, line distance=5.000000
```

The point (4, 4) is five units from both the focus and the line. `math.hypot(x, y-p)` uses horizontal and vertical displacements from F. `abs(y+p)` is distance to the horizontal line, independent of x. In the plot, NumPy applies the same squaring and division to every entry of `x_values`; it is a shorter form of looping over x values and appending each computed y.

## 2. Use a parabola's dimensions to locate its focus

A parabolic reflector has a 1.2 m opening and a depth of 0.15 m. In a cross-section with the vertex at (0, 0), the rim is at horizontal coordinate 0.6 m and vertical coordinate 0.15 m. Substitute that point into y = x²/(4p), then solve for p: the focal distance is 0.6 m.

The opening is the full **aperture**, not its radius. That factor of two gets squared, so confusing aperture with half-aperture makes the focal distance four times too large. Ideal parabolic reflectors direct rays parallel to their axis toward the focus. That optical property motivates the geometry here; surface accuracy and three-dimensional ray behaviour require further modelling.

::: math
\[ p=\frac{w^2}{16d} \]
- $w$: full aperture width; $d$: depth at the rim; p: vertex-to-focus distance.
- The 16 comes from squaring w/2 and dividing by the original factor of 4.
In code: compute half the width first, then `half_width**2 / (4*depth)` to keep the geometry visible.
:::

Predict before running: at fixed width, does doubling the depth move the focus nearer to or farther from the vertex?

```python type
width = 1.2
for depth in [0.15, 0.30]:
    half_width = width / 2
    focal_distance = half_width**2 / (4 * depth)
    recovered_depth = half_width**2 / (4 * focal_distance)
    print(f"Depth {depth:.2f} m: focus {focal_distance:.3f} m from vertex; rim check {recovered_depth:.3f} m")
```

```output
Depth 0.15 m: focus 0.600 m from vertex; rim check 0.150 m
Depth 0.30 m: focus 0.300 m from vertex; rim check 0.300 m
```

The deeper reflector has a nearer focus. Substituting the result back into the original equation is a useful check: it must recover the specified rim depth. This is more informative than trusting a formula solely because its output looks plausible.

::: challenge Design a parabolic profile [easy]
Write `parabola_profile(width, depth, x)` returning `(focal_distance, y)` at horizontal coordinate x. Width is the full aperture; depth is positive. Raise `ValueError` for a nonpositive width or depth. All inputs are finite scalars. The mathematical curve continues beyond the aperture, so x need not lie inside the physical rim.
```python starter
def parabola_profile(width, depth, x):
    return width, depth
```
```python solution
def parabola_profile(width, depth, x):
    if width <= 0 or depth <= 0:
        raise ValueError("Width and depth must be positive")
    half_width = width / 2
    focal_distance = half_width**2 / (4 * depth)
    y = x**2 / (4 * focal_distance)
    return focal_distance, y
```
```python test
assert np.allclose(parabola_profile(1.2, 0.15, 0.6), (0.6, 0.15)), "Use half the aperture at the rim; the rim height must equal depth."
assert np.allclose(parabola_profile(1.2, 0.15, 0), (0.6, 0)), "The vertex remains at the origin."
assert np.allclose(parabola_profile(1.2, 0.15, -0.3), (0.6, 0.0375)), "Squaring x makes the profile symmetric about its axis."
assert np.allclose(parabola_profile(2.4, 0.3, 1.2), (1.2, 0.3)), "Doubling all dimensions doubles the focal distance."
for _w, _d in [(0, 1), (1, 0), (-1, 1)]:
    try:
        parabola_profile(_w, _d, 0)
    except ValueError:
        pass
    else:
        assert False, "Require positive aperture and depth."
"SUCCESS: The profile satisfies its rim dimensions and yields a consistent focal distance."
```
Hint: Compute the focus from half-aperture and depth, then use the parabola equation to get y. Do not use width itself as the rim's x coordinate.
:::

## 3. An ellipse keeps a sum of distances constant

Place two pins at (-3, 0) and (3, 0), and use a string whose total distance from a tracing point to the two pins is 10 units. At the rightmost point (5, 0), the distances are 8 and 2. At the top point (0, 4), both are 5. The traced curve is an **ellipse**, and the pins are its two foci.

Let a be half the longest width, called the **semi-major axis**. Let b be half the shortest width, the **semi-minor axis**. Let c be the centre-to-focus distance. In this example a = 5, b = 4 and c = 3. These symbols describe ellipse geometry here; they are not triangle-side labels from the previous notebook.

At the top point, the two equal focus distances are each a. Pythagoras gives b² + c² = a², hence c = sqrt(a² - b²). The distance-sum definition can be rearranged into the standard coordinate equation below. We can construct points that satisfy it directly by scaling a unit circle horizontally by a and vertically by b.

::: math
\[ \frac{x^2}{a^2}+\frac{y^2}{b^2}=1, \qquad x=a\cos t,\quad y=b\sin t,\quad c=\sqrt{a^2-b^2} \]
- a is at least b, and both are positive. The foci are (-c, 0) and (c, 0).
- $t$: a parameter used to generate points, in radians. It is generally not the point's geometric direction from the centre.
- The distance sum is 2a for every generated point.
In code: scale cosine and sine independently, then use `hypot` to measure the distances to both foci.
:::

Predict before running: as a approaches b, what happens to the two foci? What familiar curve remains when a equals b?

```python type
a, b = 5.0, 4.0
c = math.sqrt(a * a - b * b)
t = np.linspace(0, 2 * np.pi, 301)
x = a * np.cos(t)
y = b * np.sin(t)
left_distance = np.hypot(x + c, y)
right_distance = np.hypot(x - c, y)
print("Largest error in distance sum:", np.max(np.abs(left_distance + right_distance - 2 * a)))
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(x, y, label="Ellipse: a = 5, b = 4")
ax.scatter([-c, c], [0, 0], label="Foci")
ax.set(xlabel="x", ylabel="y", title="The sum of distances to the foci is constant")
ax.set_aspect("equal", adjustable="box")
ax.legend()
fig.tight_layout()
plt.show()
```

```output
Largest error in distance sum: 1.7763568394002505e-15
```

The residual is near rounding size. This numerical agreement checks our implementation; it does not replace the geometric definition. When a = b, c = 0 and both foci coincide: the ellipse becomes a circle. The parameterisation also explains why its area is pi times a times b: scaling a unit disk by a horizontally and b vertically multiplies every area by ab.

## 4. A hyperbola keeps a difference of distances constant

Now put the foci at (-5, 0) and (5, 0). A point at (3, 0) has distances 8 and 2, differing by 6. Points maintaining that absolute distance difference form a **hyperbola**. There are two separate branches, one on either side of the centre. For example, (-3, 0) has the same difference with the nearer and farther foci exchanged.

Use a for the centre-to-vertex distance and c for the centre-to-focus distance. Here a = 3 and c = 5. Define a positive shape parameter b by b² = c² - a², giving b = 4. Unlike an ellipse, b is not an intercept on the vertical axis: this horizontal hyperbola never crosses that axis.

::: math
\[ \frac{x^2}{a^2}-\frac{y^2}{b^2}=1, \qquad x=\pm a\sqrt{1+\frac{y^2}{b^2}}, \qquad c=\sqrt{a^2+b^2} \]
- The absolute difference between the two focus distances is 2a.
- The plus-or-minus sign means generate a right branch with positive x and a left branch with negative x.
- Far from the centre, the branches approach the straight lines $y=\pm(b/a)x$, called asymptotes.
In code: choose y values, solve for positive x, then negate x for the second branch.
:::

Predict before running: why can we not generate a point on this hyperbola with x = 0? Substituting zero into the equation would require a nonpositive number to equal one.

```python type
a, b = 3.0, 4.0
c = math.hypot(a, b)
y = np.linspace(-12, 12, 301)
x = a * np.sqrt(1 + (y / b)**2)
difference = np.abs(np.hypot(x + c, y) - np.hypot(x - c, y))
print("Largest error in distance difference:", np.max(np.abs(difference - 2 * a)))
fig, ax = plt.subplots(figsize=(7, 5))
ax.plot(x, y, label="Right branch")
ax.plot(-x, y, label="Left branch")
ax.scatter([-c, c], [0, 0], label="Foci")
line_x = np.linspace(-10, 10, 100)
ax.plot(line_x, (b / a) * line_x, "--", color="gray", label="Asymptotes")
ax.plot(line_x, -(b / a) * line_x, "--", color="gray")
ax.set(xlabel="x", ylabel="y", title="A constant distance difference gives two branches")
ax.set_aspect("equal", adjustable="box")
ax.legend()
fig.tight_layout()
plt.show()
```

```output
Largest error in distance difference: 3.552713678800501e-15
```

Distance-difference measurements arise when a signal reaches two receivers at different times. If propagation speed is known, a time difference becomes a distance difference. One measurement then restricts a source to a hyperbola in a two-dimensional model; it does not uniquely locate the source. Additional receivers or other information are needed. This is a geometric interpretation, not a guarantee about noisy or reflected signals.

## 5. Eccentricity connects the families

The ratio of focus distance to semi-major parameter, c/a, is called **eccentricity** for the centred ellipse and hyperbola. It is written e. The ellipse has e less than one; a circle has e = 0. The hyperbola has e greater than one. A parabola has e = 1 under the more general focus/directrix definition: point-distance divided by directrix-distance.

For an ellipse with a = 5 and b = 4, e = 3/5 = 0.6. Its centre is not its focus. In an ideal two-body elliptical orbit, the attracting body occupies a focus, so the nearest and farthest distances are a - c and a + c, not a - b and a + b. This example uses orbital geometry without attempting to model the changing speed.

::: math
\[ e=c/a, \qquad r_{\mathrm{near}}=a-c=a(1-e), \qquad r_{\mathrm{far}}=a+c=a(1+e) \]
- e is a ratio with no length unit; the near and far distances retain the unit of a.
- These near/far formulas describe distance from a focus of an ellipse, with $0\leq e<1$.
In code: obtain c from the axes, divide by a, then subtract and add c to a.
:::

Predict before running: if both axes double, should eccentricity change? Should the near and far distances change?

```python type
for a, b in [(5.0, 4.0), (10.0, 8.0), (5.0, 5.0)]:
    c = math.sqrt((a - b) * (a + b))
    eccentricity = c / a
    print(f"a={a}, b={b}: e={eccentricity:.3f}, near={a-c:.3f}, far={a+c:.3f}")
```

```output
a=5.0, b=4.0: e=0.600, near=2.000, far=8.000
a=10.0, b=8.0: e=0.600, near=4.000, far=16.000
a=5.0, b=5.0: e=0.000, near=5.000, far=5.000
```

The similar ellipses share e = 0.6 while their distances scale. Factoring a² - b² as (a - b)(a + b) avoids subtracting two separately rounded squares when the axes are close. It does not eliminate every floating-point limitation, but it is a useful algebraic choice.

::: challenge Report ellipse geometry [medium]
Write `ellipse_geometry(a, b)` returning `(focus_distance, eccentricity, area)`. Require finite axes with `a >= b > 0`; otherwise raise `ValueError`. A circle is valid. Use the axis definitions from this notebook, not full widths.
```python starter
def ellipse_geometry(a, b):
    return a - b, 0.0, a * b
```
```python solution
def ellipse_geometry(a, b):
    if not a >= b > 0:
        raise ValueError("Require a >= b > 0")
    c = math.sqrt((a - b) * (a + b))
    return c, c / a, math.pi * a * b
```
```python test
assert np.allclose(ellipse_geometry(5, 4), (3, 0.6, 20 * math.pi)), "Use c squared = a squared minus b squared; ellipse area is pi*a*b."
assert np.allclose(ellipse_geometry(2, 2), (0, 0, 4 * math.pi)), "A circle has coincident foci and zero eccentricity."
_c, _e, _area = ellipse_geometry(10, 8)
assert math.isclose(_c, 6) and math.isclose(_e, 0.6) and math.isclose(_area, 80 * math.pi), "Under doubling, focus distance doubles, eccentricity stays fixed, and area quadruples."
for _axes in [(4, 5), (3, 0), (-1, -2)]:
    try:
        ellipse_geometry(*_axes)
    except ValueError:
        pass
    else:
        assert False, "Require a to be the longer positive semi-axis."
"SUCCESS: The returned quantities distinguish distance, dimensionless shape, and area."
```
Hint: Compute c first. Eccentricity divides that length by a; area multiplies both semi-axes and pi. Validate before taking a square root.
:::

## Reference: choose the curve by its distance rule

- Circle: fixed distance r from a centre. It is the equal-axis ellipse.
- Parabola: equal distances to a focus and a directrix. Vertex at the origin and upward axis give `y = x*x / (4*p)` with focus (0, p).
- Ellipse: distance sum to two foci is 2a. For a horizontal major axis, `x = a*cos(t)` and `y = b*sin(t)`, with `c = sqrt(a*a-b*b)`.
- Hyperbola: absolute distance difference is 2a. For horizontal branches, `x = ±a*sqrt(1+(y/b)**2)`, with `c = sqrt(a*a+b*b)`.
- Eccentricity: a dimensionless shape measure. Scaling all lengths leaves it unchanged; it does not specify the curve's size or location.

For reference calculations, first record whether dimensions are full widths or semi-axes, where the origin lies, and which direction the curve opens. Then generate a point and verify its defining distances. Do not infer a shape only from how a plot looks: unequal axis scaling can make a circle appear elliptical.

As a transfer task, choose a = 5 and b = 3, predict whether the foci move closer together or farther apart than in the earlier ellipse, and verify by changing the demo. The next lesson returns to vectors and turns component multiplication into a measure of alignment.
