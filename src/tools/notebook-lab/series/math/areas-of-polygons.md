# Areas of polygons

A sheet-metal profile is described by points around its boundary. To estimate material use, you need its area. Multiplying its overall width and height counts empty space in notches, while adding triangle areas by eye becomes inconvenient as the profile grows more complicated.

This notebook turns an ordered boundary into an area calculation. You will build the calculation as a loop, learn the compact summation notation for that same operation, and subtract holes without depending on their drawing direction. You will also distinguish a mathematically valid formula from a valid input boundary.

Prerequisites: [coordinates and distance](#/notebook-lab?lesson=math-coordinates-and-distance), [triangles and similarity](#/notebook-lab?lesson=math-triangles-and-similarity), and Python lists, indexing and loops. Only ordinary arithmetic is needed for the area algorithm. The demos share their imports and helper functions; run them in order.

## 1. A boundary is an ordered list, not a bag of points

Consider an L-shaped plate with corners (0, 0), (6, 0), (6, 2), (2, 2), (2, 5), (0, 5), measured in centimetres. Trace them in that order, then return to the first point. Its enclosing rectangle is 6 by 5, but a 4 by 3 rectangle is missing at the top right. Its area is therefore 30 - 12 = 18 square centimetres.

The outline is a **polygon**: a closed path made of straight edges. This one is **concave**, meaning it has an inward corner. A **simple polygon** has no crossing edges except for adjacent edges meeting at their shared endpoint. Our area method accepts simple concave polygons as well as convex ones, but it does not turn a crossed outline into a meaningful material boundary.

::: math
\[ A_{\mathrm{plate}}=(6)(5)-(4)(3)=18\ \mathrm{cm}^2 \]
- $A_{\mathrm{plate}}$: plate area; the subscript is a descriptive label.
- Multiplying lengths gives square units: cm times cm is cm².
In code: store perimeter points in order and append the first point only when plotting the closing edge.
:::

Predict before running: does reversing the order change the plate's physical shape? Does shuffling the same points necessarily preserve it?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

plate = [(0, 0), (6, 0), (6, 2), (2, 2), (2, 5), (0, 5)]
closed = plate + [plate[0]]
x_coordinates = [point[0] for point in closed]
y_coordinates = [point[1] for point in closed]
fig, ax = plt.subplots(figsize=(6, 4))
ax.fill(x_coordinates, y_coordinates, alpha=0.2)
ax.plot(x_coordinates, y_coordinates, "o-")
for index, (x, y) in enumerate(plate):
    ax.annotate(str(index), (x, y), xytext=(5, 5), textcoords="offset points")
ax.set(xlabel="x (cm)", ylabel="y (cm)", title="Follow the boundary, including the inward corner")
ax.set_aspect("equal", adjustable="box")
ax.margins(0.15)
fig.tight_layout()
plt.show()
print("Area from rectangle subtraction:", 6 * 5 - 4 * 3, "cm^2")
```

```output
Area from rectangle subtraction: 18 cm^2
```

`plate[0]` selects the first point because Python indexes lists from zero. `plate + [plate[0]]` makes a new list ending where it started; it leaves `plate` unchanged. The comprehensions collect the first and second coordinate of each point for plotting. `enumerate` supplies each point's index for its label. None of these operations sorts the points: sorting by x would destroy the boundary order.

## 2. One edge contributes an oriented triangle

Take the origin and two consecutive points P = (4, 1) and Q = (1, 3). The triangle they form has area one half of 4 times 3 minus 1 times 1, or 5.5 square units. The product difference measures the area of the parallelogram built from the two origin-to-point displacements; the triangle is half of it. It can also be derived by subtracting the surrounding right triangles from their coordinate-aligned bounding rectangle.

The subtraction order carries direction. Visiting Q then P negates the result. We call this **signed area**: positive for a counter-clockwise turn about the origin and negative for the reversed turn. The physical triangle still occupies 5.5 square units either way.

::: math
\[ A_{OPQ}=\frac{x_Py_Q-y_Px_Q}{2}=\frac{(4)(3)-(1)(1)}{2}=5.5 \]
- O is the origin; P and Q are consecutive vertices, or corner points.
- $x_P,y_P$ mean P's horizontal and vertical coordinates. In code they become `px, py`.
In code: unpack each point into its two coordinates, multiply crosswise, subtract, and divide by two.
:::

Predict before running: what happens if both points lie on the same line through the origin? There is no enclosed triangle, so the two products cancel.

```python type
def triangle_contribution(p, q):
    px, py = p
    qx, qy = q
    return (px * qy - py * qx) / 2

print("O-P-Q:", triangle_contribution((4, 1), (1, 3)))
print("O-Q-P:", triangle_contribution((1, 3), (4, 1)))
print("Collinear points:", triangle_contribution((2, 1), (6, 3)))
```

```output
O-P-Q: 5.5
O-Q-P: -5.5
Collinear points: 0.0
```

The outputs are 5.5, -5.5 and zero. When this signed contribution is accumulated around a simple polygon, triangles outside the desired region cancel and triangles inside remain. An internal edge traversed in opposite directions contributes opposite signs. This cancellation is what lets the method work for a concave shape without manually choosing a triangulation.

## 3. The shoelace formula is a running total

For the L-shaped plate, the doubled contributions around the boundary are 0, 12, 8, 6, 10 and 0. Add them to get 36, then divide by two to get 18. The last contribution uses the last point and the first point. Forgetting it opens the boundary and can change the answer when the shape is moved.

The procedure is a loop: start a total at zero; visit each edge; calculate its signed contribution; add it to the total. The **shoelace formula** is the compact mathematical way to write those instructions. It gets its name from the crossing multiplications between neighbouring coordinate pairs.

::: math
\[ A_{\mathrm{signed}}=\frac{0+12+8+6+10+0}{2}=18 \]
\[ A_{\mathrm{signed}}=\frac12\sum_{i=0}^{n-1}(x_i y_{i+1}-y_i x_{i+1}), \qquad (x_n,y_n)=(x_0,y_0) \]
- $\sum$, pronounced “sigma,” instructs us to add the following expression repeatedly.
- $i$: the changing point index; start at 0 and finish at n - 1, where n is the number of points.
- $x_i,y_i$: coordinates of point i. For the final edge, the next point wraps back to point zero.
In code: `for i in range(n)` visits those indices; `% n` wraps `i + 1` back to zero; `total += term` adds one contribution.
:::

Predict before running: will the signs of all contributions reverse if you reverse the boundary? Should the magnitude of the final area change?

```python type
def signed_area(points):
    if len(points) < 3:
        raise ValueError("An area boundary needs at least three points")
    origin_x, origin_y = points[0]
    local_points = []
    for x, y in points:
        local_points.append((x - origin_x, y - origin_y))
    n = len(local_points)
    doubled_terms = []
    for i in range(n):
        next_i = (i + 1) % n
        x, y = local_points[i]
        next_x, next_y = local_points[next_i]
        term = x * next_y - y * next_x
        doubled_terms.append(term)
    return math.fsum(doubled_terms) / 2

print("Forward area:", signed_area(plate), "cm^2")
print("Reversed area:", signed_area(list(reversed(plate))), "cm^2")
moved = [(x + 1000, y - 700) for x, y in plate]
print("Translated area:", signed_area(moved), "cm^2")
```

```output
Forward area: 18.0 cm^2
Reversed area: -18.0 cm^2
Translated area: 18.0 cm^2
```

The results are 18, -18 and 18. `range(n)` stops before n, so it visits precisely 0 through n - 1, matching the inclusive bounds of the sigma. Python's `% n` gives the remainder after division by n: when `i + 1` reaches n, that remainder is zero.

The implementation subtracts the first point from every point before multiplying. This changes the coordinate origin, not the physical shape, and reduces cancellation when a small part has large global coordinates. It cannot restore detail already lost when the inputs were rounded. `math.fsum` adds the term list with better control of rounding than a plain floating-point running total. Conceptually it performs the same addition we first did by hand.

::: challenge Write the area loop [medium]
Implement `area_by_loop(points)` yourself, returning the nonnegative area of a simple polygon. Inputs are an ordered list of finite coordinate pairs; no repeated final point is required. Raise `ValueError` for fewer than three points. Use an explicit running total and include the closing edge. Do not call `signed_area` or `triangle_contribution`; the purpose is to implement their arithmetic. Collinear points may return zero. You do not need to detect crossing edges.
```python starter
def area_by_loop(points):
    return 0.0
```
```python solution
def area_by_loop(points):
    if len(points) < 3:
        raise ValueError("Need at least three points")
    origin_x, origin_y = points[0]
    total = 0.0
    for i in range(len(points)):
        j = (i + 1) % len(points)
        x = points[i][0] - origin_x
        y = points[i][1] - origin_y
        next_x = points[j][0] - origin_x
        next_y = points[j][1] - origin_y
        total += x * next_y - y * next_x
    return abs(total) / 2
```
```python test
_cases = [([(0, 0), (4, 0), (0, 3)], 6), ([(2, 3), (6, 3), (6, 6), (2, 6)], 12), ([(0, 0), (6, 0), (6, 2), (2, 2), (2, 5), (0, 5)], 18), ([(0, 0), (1, 1), (2, 2)], 0)]
for _points, _expected in _cases:
    assert math.isclose(area_by_loop(_points), _expected, abs_tol=1e-10), "Add every edge, including last-to-first, then halve the magnitude."
    assert math.isclose(area_by_loop(list(reversed(_points))), _expected, abs_tol=1e-10), "Physical area must not depend on boundary direction."
assert math.isclose(area_by_loop([(2*x, 2*y) for x, y in _cases[0][0]]), 24), "Doubling every length multiplies area by four."
for _points in [[], [(0, 0)], [(0, 0), (1, 0)]]:
    try:
        area_by_loop(_points)
    except ValueError:
        pass
    else:
        assert False, "Require at least three boundary points."
"SUCCESS: Your running total implements the finite sum, including closure and orientation handling."
```
Hint: Save the first point as a local origin. For each index i, wrap the next index with `(i + 1) % len(points)`. The absolute value belongs around the final total, not around each term.
:::

## 4. Holes remove area; orientation does not identify a hole

A 10 by 8 cm sheet has area 80 cm². A rectangular 2 by 3 cm cutout removes 6 cm², leaving 74 cm². The cutout's area must be subtracted whether its points were drawn clockwise or counter-clockwise. We should represent “this is a hole” explicitly rather than infer material meaning from a sign alone.

This subtraction assumes every hole lies inside the outer boundary and holes do not overlap or touch one another. If two holes overlap, subtracting both full areas removes their shared region twice. Establishing those geometric relationships requires additional intersection and containment algorithms; an area formula alone does not validate them.

::: math
\[ A_{\mathrm{material}}=|A_{\mathrm{outer}}|-\sum_{j=0}^{m-1}|A_{\mathrm{hole},j}| \]
- $m$: number of holes; $j$: index of the current hole. The sigma means “add the hole areas.”
- Vertical bars mean absolute value, implemented by `abs`; each loop's drawing direction is ignored independently.
In code: start with the outer loop's area, then subtract `abs(signed_area(hole))` for each hole.
:::

Predict before running: will reversing only the hole change the amount of material? What happens to the result if every coordinate is changed from centimetres to millimetres?

```python type
outer = [(0, 0), (10, 0), (10, 8), (0, 8)]
hole = [(2, 2), (4, 2), (4, 5), (2, 5)]
material = abs(signed_area(outer)) - abs(signed_area(hole))
reversed_hole = abs(signed_area(outer)) - abs(signed_area(list(reversed(hole))))
outer_mm = [(10 * x, 10 * y) for x, y in outer]
hole_mm = [(10 * x, 10 * y) for x, y in hole]
print("Material area (cm^2):", material)
print("After reversing hole:", reversed_hole)
print("Material area (mm^2):", abs(signed_area(outer_mm)) - abs(signed_area(hole_mm)))
```

```output
Material area (cm^2): 74.0
After reversing hole: 74.0
Material area (mm^2): 7400.0
```

The material remains 74 cm², which is 7400 mm². Length conversion multiplies each coordinate by ten; area conversion multiplies by one hundred. Keeping the units in the output label makes this otherwise plausible factor-of-ten error easier to catch.

::: challenge Area available for material [medium]
Write `material_area(outer, holes)` using the demonstrated `signed_area`. Return outer area minus all hole areas, regardless of each boundary's orientation. The caller guarantees simple loops, holes strictly inside the outer loop, and no overlap. `holes` may be empty. Your function need not validate those geometric assumptions.
```python starter
def material_area(outer, holes):
    return abs(signed_area(outer))
```
```python solution
def material_area(outer, holes):
    remaining = abs(signed_area(outer))
    for hole in holes:
        remaining -= abs(signed_area(hole))
    return remaining
```
```python test
_outer = [(0, 0), (10, 0), (10, 8), (0, 8)]
_h1 = [(1, 1), (3, 1), (3, 4), (1, 4)]
_h2 = [(6, 1), (7, 1), (7, 3), (6, 3)]
assert math.isclose(material_area(_outer, []), 80), "An empty hole list removes nothing."
assert math.isclose(material_area(_outer, [_h1]), 74), "Subtract the area of the hole."
assert math.isclose(material_area(_outer, [_h1, list(reversed(_h2))]), 72), "Subtract every hole's magnitude independently of its orientation."
assert math.isclose(material_area(list(reversed(_outer)), [_h1, _h2]), 72), "Reversing the outer loop must not change material area."
"SUCCESS: Material meaning comes from outer-versus-hole roles, not drawing direction."
```
Hint: Initialise the remaining area from the outer boundary. Then use an ordinary `for hole in holes` loop to remove each hole's nonnegative area.
:::

## 5. Know what the number does not tell you

Connecting (0, 0), (4, 4), (0, 4), (4, 0) makes a bow-tie with crossing edges. One lobe contributes positively and the other negatively. The signed area is zero even though a filled drawing might display two visible lobes. There is no contradiction: the algorithm computes oriented area, and the input violated our simple-polygon assumption.

::: math
\[ A_{\mathrm{bowtie,signed}}=A_{\mathrm{one\ lobe}}-A_{\mathrm{other\ lobe}}=0 \]
- Signed cancellation is meaningful algebra, but it is not automatically the physical union area of a crossed boundary.
- Taking the absolute value after cancellation does not repair an invalid outline.
In code: compare a correctly ordered square with a crossed ordering of the same corners.
:::

Predict before running: can an area of zero alone tell you whether the input was a line, a crossed outline, or a real shape too small for its coordinate precision?

```python type
square = [(0, 0), (4, 0), (4, 4), (0, 4)]
bowtie = [(0, 0), (4, 4), (0, 4), (4, 0)]
print("Square signed area:", signed_area(square))
print("Crossed ordering signed area:", signed_area(bowtie))
fig, axes = plt.subplots(1, 2, figsize=(8, 3.5))
for ax, points, title in [(axes[0], square, "Simple boundary"), (axes[1], bowtie, "Crossed boundary")]:
    closed = points + [points[0]]
    ax.plot([p[0] for p in closed], [p[1] for p in closed], "o-")
    ax.set(title=title, xlabel="x", ylabel="y")
    ax.set_aspect("equal", adjustable="box")
fig.tight_layout()
plt.show()
```

```output
Square signed area: 16.0
Crossed ordering signed area: 0.0
```

The square gives 16 and the bow-tie gives zero. A production geometry pipeline must validate its boundary before attaching physical meaning to the area. Likewise, our coordinates describe a flat two-dimensional shape. A three-dimensional surface cannot generally be measured by discarding its height coordinate; that computes a projection.

## Reference: area from a perimeter

1. Establish a simple, ordered, flat boundary and a consistent length unit.
2. Translate to a nearby origin to reduce cancellation from large coordinate offsets.
3. For each edge, multiply x of the current point by y of the next, then subtract y of the current times x of the next.
4. Add those terms, including the closing edge, and divide by two. This is the signed area; `abs` gives ordinary area for a simple polygon.
5. Subtract the magnitudes of non-overlapping interior hole areas. Keep the hole roles explicit.
6. Report square units and check against a bounding rectangle or a known decomposition.

The summation symbol abbreviates step 3 repeated inside step 4. You can always expand that finite sum back into a loop to inspect each contribution. For a transfer check, scale the L-shaped plate by three and predict its area before running the algorithm. Then translate it: translation should leave the area unchanged. The next notebook adds thickness and density to turn geometry into volume and mass.
