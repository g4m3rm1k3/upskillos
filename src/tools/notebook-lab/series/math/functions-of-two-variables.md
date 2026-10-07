# Functions of two variables

A steel plate is heated by a torch at one spot. Its temperature is not one number but a number at every point: T depends on both x and y. The pressure on a dam wall depends on depth and position along it, a terrain's height on easting and northing, a machine's power use on speed and load. These are **functions of two variables**, f(x, y), and they are the gateway to multivariable calculus. The gradient-descent lesson already met one as a landscape. This lesson treats them properly: evaluating them on grids, drawing them as heat maps, contours and surfaces, slicing them along lines, reading values between measured points by interpolation, and adding them up over an area.

This lesson covers:

- functions of two variables, evaluated on grids with NumPy;
- heat maps, contour plots and 3D surfaces;
- slices: one-variable functions cut from a surface;
- level sets, and the region above or below a value;
- bilinear interpolation between measured grid points;
- adding up over an area: a first double sum.

## Evaluating on a grid

::: math
\[ T(x, y) = 20 + 160\,e^{-\left((x - 300)^2 + (y - 200)^2\right)/(2 \cdot 90^2)}, \qquad T_{ji} = T(x_i, y_j) \]
- a grid evaluates $T$ at every pair $(x_i, y_j)$
- row $j$ follows $y$, column $i$ follows $x$, like an image
In code: `X, Y = np.meshgrid(xs, ys)`, then `T = plate_temp(X, Y)` and `T[j, i]`
:::


A function of two variables takes a point (x, y) and returns a number. To see it, evaluate it at every point of a **grid**. `np.meshgrid(xs, ys)` turns two 1D coordinate arrays into two 2D arrays X and Y holding the x and y coordinate of every grid point; any formula written with NumPy operations then evaluates at all of them at once. Row j, column i of the result is the value at (xs[i], ys[j]), so rows run along y and columns along x, the same layout as an image.

A 600 × 400 mm plate in a 20 °C room is heated at the point (300, 200) mm; its steady temperature is modelled as a bell-shaped hot spot. Predict before running: how hot is the plate's corner?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def plate_temp(x, y):
    return 20 + 160 * np.exp(-((x - 300) ** 2 + (y - 200) ** 2) / (2 * 90 ** 2))

xs = np.linspace(0, 600, 121)
ys = np.linspace(0, 400, 81)
X, Y = np.meshgrid(xs, ys)
T = plate_temp(X, Y)
print("grid shape (rows = y, columns = x):", T.shape)
print(f"centre {T[40, 60]:.1f} °C, corner (0, 0) {T[0, 0]:.2f} °C, edge midpoint (600, 200) {T[40, -1]:.2f} °C")
j, i = np.unravel_index(np.argmax(T), T.shape)
print(f"hottest grid point: x = {xs[i]:.0f} mm, y = {ys[j]:.0f} mm, {T[j, i]:.1f} °C")
```

```output
grid shape (rows = y, columns = x): (81, 121)
centre 180.0 °C, corner (0, 0) 20.05 °C, edge midpoint (600, 200) 20.62 °C
hottest grid point: x = 300 mm, y = 200 mm, 180.0 °C
```

`np.unravel_index` converts the position of the maximum in the flattened array back to a (row, column) pair, as in the coordinates lesson.

The grid has 81 rows (y) and 121 columns (x). The centre is at 180 °C, the far corner barely above room temperature at 20.05 °C, and the midpoint of the right-hand edge, 300 mm from the torch, at 20.6 °C. Index carefully: `T[j, i]` is row j (the y index) and column i (the x index), the opposite order to (x, y).

## Seeing a surface

::: math
\[ \{(x, y) : T(x, y) = c\} \quad \text{for } c = 30, 60, 90, \dots \]
- each contour (isotherm) is the set of points at one temperature
- crowded contours mean the function changes fast there
In code: `ax1.pcolormesh(X, Y, T)`, a `contour` plot, and `plot_surface` on 3D axes
:::


Three standard pictures show a function of two variables, each with its strengths:

- a **heat map** colours each point by its value: good for seeing where things happen;
- a **contour plot** draws curves of constant value (the isotherms here), like a map's height contours: good for reading values and seeing gradients, since contours crowd together where the function changes fast;
- a **3D surface** plots the value as height: intuitive, but values are hard to read and some regions hide others.

Predict before running: where are the isotherms closest together?

```python type
fig = plt.figure(figsize=(13, 3.6))
ax1 = fig.add_subplot(1, 3, 1)
im = ax1.pcolormesh(X, Y, T, shading="auto", cmap="inferno")
fig.colorbar(im, ax=ax1, label="°C")
ax1.set_title("heat map")
ax2 = fig.add_subplot(1, 3, 2)
cs = ax2.contour(X, Y, T, levels=[30, 60, 90, 120, 150])
ax2.clabel(cs, fontsize=7)
ax2.set_title("isotherms")
ax3 = fig.add_subplot(1, 3, 3, projection="3d")
ax3.plot_surface(X, Y, T, cmap="inferno", linewidth=0)
ax3.set_title("surface")
for ax in (ax1, ax2):
    ax.set_aspect("equal")
    ax.set_xlabel("x (mm)")
    ax.set_ylabel("y (mm)")
plt.show()
r_at = {T_level: 90 * math.sqrt(2 * math.log(160 / (T_level - 20))) for T_level in [150, 120, 90, 60, 30]}
print("radius of each isotherm (mm):", {k: round(v, 1) for k, v in r_at.items()})
```

```output
radius of each isotherm (mm): {150: 58.0, 120: 87.3, 90: 115.7, 60: 149.9, 30: 211.9}
```

`pcolormesh` draws the heat map, `contour` the labelled isotherms, and `projection="3d"` makes a 3D axes for `plot_surface`. Here each isotherm is a circle; solving 20 + 160 e^(−r²/(2·90²)) = T for r gives its radius.

The isotherms are circles around the torch. Each 30 °C step moves the radius out by 29 mm (150 to 120 °C), 28 mm (120 to 90 °C), 34 mm (90 to 60 °C) and then 62 mm (60 to 30 °C): the contours are most crowded part-way out, around 90 to 115 mm from the centre, where the temperature falls fastest, and they spread out far away, where the surface levels off (and also very near the peak, which is flat-topped). Crowded contours mean steep change, the idea the next lesson makes precise with partial derivatives.

## Slices

::: math
\[ g(x) = T(x, 200), \qquad h(t) = T\big(P + t\,(Q - P)\big), \quad 0 \le t \le 1 \]
- fixing one variable, or following a line, leaves a function of one variable
- every one-variable tool then applies
In code: `plate_temp(x_line, 200.0)` and `path = P + t[:, None] * (Q - P)`
:::


Fixing one variable turns a function of two variables into an ordinary function of one: a **slice** or cross-section. Fixing y = 200 gives the temperature along the plate's centre line, T(x, 200), a curve that can be plotted, differentiated or searched with every tool from earlier lessons. Slicing along any straight path works the same way: parametrise the path as P + t(Q − P) and evaluate along it. Predict before running: along the diagonal from corner to corner, where is the temperature highest?

```python type
x_line = np.linspace(0, 600, 601)
centre_slice = plate_temp(x_line, 200.0)
t = np.linspace(0, 1, 1001)
P, Q = np.array([0.0, 0.0]), np.array([600.0, 400.0])
path = P + t[:, None] * (Q - P)
diag = plate_temp(path[:, 0], path[:, 1])
k = np.argmax(diag)
print(f"centre line: max {centre_slice.max():.1f} °C at x = {x_line[np.argmax(centre_slice)]:.0f} mm")
print(f"diagonal: max {diag[k]:.1f} °C at ({path[k, 0]:.0f}, {path[k, 1]:.0f}) mm, t = {t[k]:.3f}")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(x_line, centre_slice, label="along y = 200")
ax.plot(t * np.hypot(*(Q - P)), diag, label="along the diagonal (distance)")
ax.set_xlabel("distance along the slice (mm)")
ax.set_ylabel("temperature (°C)")
ax.legend()
plt.show()
```

```output
centre line: max 180.0 °C at x = 300 mm
diagonal: max 180.0 °C at (300, 200) mm, t = 0.500
```

`t[:, None] * (Q - P)` makes one row per point along the path, the vector form of interpolation from the coordinates lesson.

The diagonal from (0, 0) to (600, 400) passes exactly through the torch point at its midpoint, so it peaks at 180 °C at t = 0.5, (300, 200). A slice along a line that misses the centre would peak lower. Slices are how engineers usually report 2D results: a temperature profile along a weld, a stress profile across a section.

## Interpolating measured data

::: math
\[ f(x, y) \approx (1 - u)(1 - v)\,f_{00} + u(1 - v)\,f_{10} + (1 - u)\,v\,f_{01} + u\,v\,f_{11}, \qquad u = \frac{x - x_0}{x_1 - x_0}, \; v = \frac{y - y_0}{y_1 - y_0} \]
- $f_{00}, f_{10}, f_{01}, f_{11}$: the four corner readings of the cell
- linear along $x$ on two edges, then linear along $y$ between them
In code: `bilinear(xs, ys, Z, x, y)`
:::


A model gives values everywhere; measurements give values only at sensor positions. With sensors on a regular grid, **bilinear interpolation** estimates values in between: inside a grid cell, interpolate linearly along x on the cell's bottom and top edges, then linearly along y between those two results. It reproduces the measurements exactly at the grid points and is continuous across cells. Predict before running: a 4 × 3 array of thermocouples on the plate. How close is the interpolated temperature at (250, 170) mm to the model's?

```python type
sx = np.array([0.0, 200, 400, 600])
sy = np.array([0.0, 200, 400])
SX, SY = np.meshgrid(sx, sy)
readings = np.round(plate_temp(SX, SY), 1)
print("sensor readings (rows = y):\n", readings)

def bilinear(xs, ys, Z, x, y):
    i = np.searchsorted(xs, x) - 1
    j = np.searchsorted(ys, y) - 1
    i, j = min(max(i, 0), len(xs) - 2), min(max(j, 0), len(ys) - 2)
    tx = (x - xs[i]) / (xs[i + 1] - xs[i])
    ty = (y - ys[j]) / (ys[j + 1] - ys[j])
    bottom = Z[j, i] * (1 - tx) + Z[j, i + 1] * tx
    top = Z[j + 1, i] * (1 - tx) + Z[j + 1, i + 1] * tx
    return bottom * (1 - ty) + top * ty

est = bilinear(sx, sy, readings, 250, 170)
print(f"at (250, 170): interpolated {est:.1f} °C, model {plate_temp(250, 170):.1f} °C")
```

```output
sensor readings (rows = y):
 [[ 20.1  27.3  27.3  20.1]
 [ 20.6 106.3 106.3  20.6]
 [ 20.1  27.3  27.3  20.1]]
at (250, 170): interpolated 94.4 °C, model 149.7 °C
```

`np.searchsorted(xs, x)` finds where x would be inserted in the sorted array, so subtracting 1 gives the index of the grid line just below it; the clamps keep points on the outer edges inside the last cell.

The interpolated value, about 94 °C, is far below the model's 150 °C. With sensors 200 mm apart and a hot spot only about 90 mm wide, straight-line interpolation cannot follow the peak: it flattens it. Interpolation is only as good as the sensor spacing relative to the features being measured, the same lesson as sampling in time, now in space.

## Adding up over an area

::: math
\[ \iint_R f\,dA \approx \sum_{i,j} f(x_i, y_j)\,\Delta x\,\Delta y, \qquad \bar{f} = \frac{1}{\text{area}}\iint_R f\,dA \]
- evaluate at each cell centre, multiply by the cell area $\Delta x\,\Delta y$, add
- area where a condition holds: count those cells times $\Delta x\,\Delta y$
In code: `(TT * cell).sum() / (600 * 400)` with `cell = dx * dy`, and `(TT > 45).sum() * cell`
:::


Integrating over an area extends the Riemann sums of the accumulation lesson to two dimensions: split the region into small cells of area ΔA, evaluate the function at each cell's centre, multiply and add. This **double sum** approximates the **double integral** ∬ f dA, which the multivariable block develops. Averages over an area are the integral divided by the area; the area of a region where a condition holds is the sum of the cell areas where it holds. Predict before running: what is the plate's average temperature, and how much of it is too hot to touch (above 45 °C)?

```python type
n = 300
dx, dy = 600 / n, 400 / n
cx = (np.arange(n) + 0.5) * dx
cy = (np.arange(n) + 0.5) * dy
CX, CY = np.meshgrid(cx, cy)
TT = plate_temp(CX, CY)
cell = dx * dy
print(f"average temperature: {(TT * cell).sum() / (600 * 400):.2f} °C")
hot_area = (TT > 45).sum() * cell
print(f"area above 45 °C: {hot_area / 100:.0f} cm², which is {hot_area / (600 * 400):.1%} of the plate")
exact_r = 90 * math.sqrt(2 * math.log(160 / 25))
print(f"exact: a disc of radius {exact_r:.1f} mm, area {math.pi * exact_r ** 2 / 100:.0f} cm²")
```

```output
average temperature: 53.01 °C
area above 45 °C: 945 cm², which is 39.4% of the plate
exact: a disc of radius 173.4 mm, area 945 cm²
```

The cells are 2 × 1.33 mm, evaluated at their centres (the midpoint rule in two dimensions).

The plate averages about 53 °C. The region above 45 °C is a disc of about 945 cm², roughly 39% of the plate, matching the exact disc from the isotherm formula to the nearest square centimetre. Double sums handle any shape of region and any function, including measured ones, which is why they underlie finite-element and image-processing computations.

::: challenge Grids and their maximum [easy]
Write `evaluate_grid(f, xs, ys)` that returns the 2D NumPy array Z with `Z[j, i] = f(xs[i], ys[j])` (rows follow y), for a function f written with NumPy operations so it can take whole arrays. Then write `grid_max(Z, xs, ys)` returning `(x, y, value)` of the largest entry as plain floats (if several tie, the first in row-major order, which `np.argmax` gives). Raise `ValueError` from `grid_max` if Z's shape is not `(len(ys), len(xs))`.

```python starter
def evaluate_grid(f, xs, ys):
    return np.zeros((len(xs), len(ys)))

def grid_max(Z, xs, ys):
    return (0.0, 0.0, float(np.max(Z)))

print(evaluate_grid(lambda x, y: x + 10 * y, [0, 1, 2], [0, 1]))
```

```python solution
def evaluate_grid(f, xs, ys):
    X, Y = np.meshgrid(np.asarray(xs, dtype=float), np.asarray(ys, dtype=float))
    return np.asarray(f(X, Y), dtype=float)

def grid_max(Z, xs, ys):
    Z = np.asarray(Z)
    if Z.shape != (len(ys), len(xs)):
        raise ValueError("Z must have shape (len(ys), len(xs))")
    j, i = np.unravel_index(np.argmax(Z), Z.shape)
    return (float(xs[i]), float(ys[j]), float(Z[j, i]))

print(evaluate_grid(lambda x, y: x + 10 * y, [0, 1, 2], [0, 1]))
```

```python test
for _n in ["evaluate_grid", "grid_max"]:
    assert _n in dir(), f"Define {_n}."
_Z = evaluate_grid(lambda x, y: x + 10 * y, [0, 1, 2], [0, 1])
assert isinstance(_Z, np.ndarray) and _Z.shape == (2, 3) and np.array_equal(_Z, [[0, 1, 2], [10, 11, 12]]), f"Rows follow y; got {_Z}."
_xs, _ys = np.linspace(-1, 2, 31), np.linspace(0, 1, 11)
_Zb = evaluate_grid(lambda x, y: -((x - 0.5) ** 2) - (y - 0.3) ** 2, _xs, _ys)
assert grid_max(_Zb, _xs, _ys) == (0.5, 0.3, 0.0) or (abs(grid_max(_Zb, _xs, _ys)[0] - 0.5) < 1e-12 and abs(grid_max(_Zb, _xs, _ys)[1] - 0.3) < 1e-12), f"Got {grid_max(_Zb, _xs, _ys)}."
assert all(type(_v) is float for _v in grid_max(_Zb, _xs, _ys)), "Plain floats."
assert grid_max(np.array([[1, 5], [5, 2]]), [10, 20], [100, 200]) == (20.0, 100.0, 5.0), "Ties go to the first in row-major order."
try:
    grid_max(np.zeros((3, 2)), [0, 1, 2], [0, 1])
    assert False, "A transposed grid should raise ValueError."
except ValueError:
    pass
"SUCCESS: meshgrid turns a formula into a whole field of values, indexed [y, x] like an image."
```

Hint: `X, Y = np.meshgrid(xs, ys)` gives arrays of shape (len(ys), len(xs)); call `f(X, Y)`. For the maximum, `np.unravel_index(np.argmax(Z), Z.shape)` gives (row, column) = (j, i).
:::

::: challenge Bilinear interpolation [medium]
Write `bilinear(xs, ys, Z, x, y)` that interpolates a value from a regular grid of measurements, with `Z[j, i]` measured at `(xs[i], ys[j])` and both coordinate lists strictly increasing. Return a plain float. Points exactly on the outer edges are allowed; raise `ValueError` for points outside the grid, coordinate lists with fewer than 2 entries or not strictly increasing, or a Z of the wrong shape. Then write `interpolate_many(xs, ys, Z, points)`, a NumPy array of interpolated values for a list of `(x, y)` points.

```python starter
def bilinear(xs, ys, Z, x, y):
    return float(np.mean(Z))

def interpolate_many(xs, ys, Z, points):
    return np.array([bilinear(xs, ys, Z, x, y) for x, y in points])

print(bilinear([0, 1], [0, 1], np.array([[0.0, 1.0], [2.0, 3.0]]), 0.5, 0.5))
```

```python solution
def bilinear(xs, ys, Z, x, y):
    xs, ys, Z = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float), np.asarray(Z, dtype=float)
    if len(xs) < 2 or len(ys) < 2 or np.any(np.diff(xs) <= 0) or np.any(np.diff(ys) <= 0):
        raise ValueError("coordinates need at least 2 strictly increasing values")
    if Z.shape != (len(ys), len(xs)):
        raise ValueError("Z must have shape (len(ys), len(xs))")
    if not (xs[0] <= x <= xs[-1] and ys[0] <= y <= ys[-1]):
        raise ValueError("the point is outside the grid")
    i = min(max(int(np.searchsorted(xs, x)) - 1, 0), len(xs) - 2)
    j = min(max(int(np.searchsorted(ys, y)) - 1, 0), len(ys) - 2)
    tx = (x - xs[i]) / (xs[i + 1] - xs[i])
    ty = (y - ys[j]) / (ys[j + 1] - ys[j])
    bottom = Z[j, i] * (1 - tx) + Z[j, i + 1] * tx
    top = Z[j + 1, i] * (1 - tx) + Z[j + 1, i + 1] * tx
    return float(bottom * (1 - ty) + top * ty)

def interpolate_many(xs, ys, Z, points):
    return np.array([bilinear(xs, ys, Z, x, y) for x, y in points])

print(bilinear([0, 1], [0, 1], np.array([[0.0, 1.0], [2.0, 3.0]]), 0.5, 0.5))
```

```python test
for _n in ["bilinear", "interpolate_many"]:
    assert _n in dir(), f"Define {_n}."
_xs, _ys = [0.0, 2.0, 5.0], [0.0, 1.0, 4.0, 6.0]
_X, _Y = np.meshgrid(_xs, _ys)
_Z = 3 + 2 * _X - _Y + 0.5 * _X * _Y
for _x, _y in [(1, 0.5), (4.2, 3.9), (0, 0), (5, 6), (2, 1), (3.3, 5.1)]:
    assert abs(bilinear(_xs, _ys, _Z, _x, _y) - (3 + 2 * _x - _y + 0.5 * _x * _y)) < 1e-12, f"Bilinear data must be reproduced exactly at {(_x, _y)}."
assert type(bilinear(_xs, _ys, _Z, 1, 1)) is float, "Return a plain float."
_W = np.array([[0.0, 10.0], [20.0, 40.0]])
assert bilinear([0, 1], [0, 1], _W, 0.5, 0.5) == 17.5 and bilinear([0, 1], [0, 1], _W, 1, 0) == 10.0, "Average of corners at the centre; exact at the corners."
for _args in [(_xs, _ys, _Z, -0.1, 1), (_xs, _ys, _Z, 1, 6.5), ([0, 1, 1], [0, 1], np.zeros((2, 3)), 0.5, 0.5), ([0], [0, 1], np.zeros((2, 1)), 0, 0), (_xs, _ys, _Z.T, 1, 1)]:
    try:
        bilinear(*_args)
        assert False, f"bilinear with point ({_args[3]}, {_args[4]}) or bad grid should raise ValueError."
    except ValueError:
        pass
_m = interpolate_many(_xs, _ys, _Z, [(1, 0.5), (2, 1)])
assert isinstance(_m, np.ndarray) and np.allclose(_m, [3 + 2 - 0.5 + 0.25, 3 + 4 - 1 + 1]), "Many points at once."
"SUCCESS: Two linear interpolations along x and one along y read any point between the sensors, exact on the grid and continuous across cells."
```

Hint: Find the cell with `np.searchsorted` (minus 1, clamped to the last cell for points on the far edge). Compute the fractions tx and ty across the cell, interpolate along the bottom and top edges, then between them.
:::

::: challenge Totals over an area [hard]
Write `area_average(f, width, height, n)`: the average of f over the rectangle [0, width] × [0, height], using the midpoint rule on an n × n grid of cells, as a plain float. Write `region_area(f, width, height, n, threshold)`: the area of the part of the rectangle where f > threshold, by the same n × n cell-centre sampling, as a plain float. Raise `ValueError` from both if n < 1 or the dimensions are not positive. Then write `region_centroid(f, width, height, n, threshold)`: the centroid (mean x, mean y) of the cells where f > threshold, as a tuple of plain floats, or `None` if no cell qualifies. f is written with NumPy operations. Use array operations only, no Python loops over cells; n = 1000 must run quickly.

```python starter
def area_average(f, width, height, n):
    return float(f(width / 2, height / 2))

def region_area(f, width, height, n, threshold):
    return 0.0

def region_centroid(f, width, height, n, threshold):
    return None

print(area_average(lambda x, y: x + y, 2, 1, 10))
```

```python solution
def _centres(width, height, n):
    if n < 1 or width <= 0 or height <= 0:
        raise ValueError("need n >= 1 and positive dimensions")
    cx = (np.arange(n) + 0.5) * width / n
    cy = (np.arange(n) + 0.5) * height / n
    return np.meshgrid(cx, cy)

def area_average(f, width, height, n):
    X, Y = _centres(width, height, n)
    return float(np.mean(f(X, Y)))

def region_area(f, width, height, n, threshold):
    X, Y = _centres(width, height, n)
    return float((f(X, Y) > threshold).sum() * (width / n) * (height / n))

def region_centroid(f, width, height, n, threshold):
    X, Y = _centres(width, height, n)
    mask = f(X, Y) > threshold
    if not mask.any():
        return None
    return (float(X[mask].mean()), float(Y[mask].mean()))

print(area_average(lambda x, y: x + y, 2, 1, 10))
```

```python test
import ast as _ast, time as _time
for _n in ["area_average", "region_area", "region_centroid"]:
    assert _n in dir(), f"Define {_n}."
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef) and _node.name in ("area_average", "region_area", "region_centroid"):
        assert not any(isinstance(_x, (_ast.For, _ast.While, _ast.ListComp)) for _x in _ast.walk(_node)), f"{_node.name}: use array operations, not loops."
assert abs(area_average(lambda x, y: x + y, 2, 1, 10) - 1.5) < 1e-12, "The average of x + y over [0, 2] × [0, 1] is 1.5."
assert abs(area_average(lambda x, y: x * y, 1, 1, 200) - 0.25) < 1e-9 and type(area_average(lambda x, y: x * y, 1, 1, 2)) is float, "Midpoint rule is exact for x y."
_disc = lambda x, y: -((x - 3) ** 2 + (y - 2) ** 2)
_a = region_area(_disc, 6, 4, 600, -1.0)
assert abs(_a - math.pi) < 0.01 and type(_a) is float, f"A unit disc has area π; got {_a}."
_c = region_centroid(_disc, 6, 4, 600, -1.0)
assert abs(_c[0] - 3) < 1e-6 and abs(_c[1] - 2) < 1e-6, f"The disc's centroid is (3, 2); got {_c}."
_half = region_centroid(lambda x, y: x, 4, 2, 400, 3.0)
assert abs(_half[0] - 3.5) < 0.01 and abs(_half[1] - 1) < 1e-9, "The strip x > 3 has centroid (3.5, 1)."
assert region_centroid(_disc, 6, 4, 50, 10) is None and region_area(_disc, 6, 4, 50, 10) == 0.0, "No region."
for _bad in [(0, 1, 5), (1, -1, 5), (1, 1, 0)]:
    try:
        area_average(lambda x, y: x, *_bad)
        assert False, f"area_average with {_bad} should raise ValueError."
    except ValueError:
        pass
_start = _time.perf_counter(); region_area(_disc, 6, 4, 1000, -1.0); _el = _time.perf_counter() - _start
assert _el < 2, f"n = 1000 took {_el:.2f} s."
"SUCCESS: Cell-centre sums give averages, areas and centroids of any region a condition defines: double integrals, computed."
```

Hint: Build the cell centres `(np.arange(n) + 0.5) * width / n` (and the same for y) and mesh them. The average is the mean of f at the centres; the area counts cells where `f > threshold` times one cell's area; the centroid averages the centres' coordinates over that mask.
:::

## What you learned

- A function of two variables assigns a value to every point; `np.meshgrid` evaluates it on a grid, indexed [row = y, column = x].
- Heat maps, contour plots and 3D surfaces each show a surface; crowded contours mean rapid change.
- Fixing one variable, or parametrising a straight path, gives a one-variable slice for profiles and searches.
- Bilinear interpolation reads values between grid measurements; it cannot recover features smaller than the sensor spacing.
- Midpoint double sums over small cells give averages, areas of regions defined by conditions, and their centroids.

The next lesson measures how fast a surface changes in each direction: partial derivatives and the gradient.
