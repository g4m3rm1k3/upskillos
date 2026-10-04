# Volumes and mass properties

A bracket can fit inside its allowed space and still be too heavy or badly balanced. Geometry tells us how much material it contains; density turns that volume into mass; the material's positions determine its balance point and resistance to rotation. Those are different questions, so they need different calculations.

You will calculate volume from simple shapes and slices, assemble the mass and centre of mass of a part with a hole, and explain why moving mass outward changes rotational behaviour. This notebook uses metres, kilograms and seconds. Convert dimensions supplied in millimetres before calculating with a density in kilograms per cubic metre.

Prerequisites: [areas of polygons](#/notebook-lab?lesson=math-areas-of-polygons), [ratios and scaling](#/notebook-lab?lesson=math-ratios-rates-and-scaling), and ordinary Python loops. Run demonstrations in order for imports and helper functions. The reference section gives the reusable procedure.

## 1. A constant cross-section turns area into volume

A rectangular plate is 0.20 m long, 0.10 m wide and 0.01 m thick. One square metre covered by a layer 0.01 m thick contains 0.01 cubic metres. Our plate covers 0.02 square metres, so its volume is 0.0002 cubic metres. This is an **extrusion**: the same cross-section continues through a specified thickness.

Name the cross-sectional area A and the thickness t. Their product is volume V. A cylinder works the same way: its cross-section is a circle of area pi times radius squared, so cylinder volume is that area times length. A tapered part does not have a constant cross-section and needs a different method.

::: math
\[ V=At, \qquad A=(0.20)(0.10)=0.02\ \mathrm{m}^2, \qquad V=0.0002\ \mathrm{m}^3 \]
- $V$: volume, in cubic metres; $A$: area, in square metres; $t$: thickness, in metres.
- For a cylinder of radius r and length L, replace A with $\pi r^2$ and t with L.
In code: convert millimetres by dividing by 1000, then multiply the converted dimensions.
:::

Predict before running: if every length doubles, does volume double, quadruple or increase eightfold?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

length = 200 / 1000
width = 100 / 1000
thickness = 10 / 1000
area = length * width
volume = area * thickness
scaled_volume = (2 * length) * (2 * width) * (2 * thickness)
print("Plate area (m^2):", area)
print("Plate volume (m^3):", volume)
print("Volume ratio after doubling all lengths:", scaled_volume / volume)
```

The ratio is eight because there are three factors of two. Converting cubic millimetres to cubic metres similarly involves three factors of 1000: divide by a billion. Converting each input length first is often easier to audit than converting the final cubic quantity.

## 2. Changing cross-sections can be added as thin slices

Imagine cutting a sphere into thin horizontal disks. Near its equator the disks are broad; near its poles they shrink. Approximate each slice by a short cylinder with the cross-sectional area measured at the slice's midpoint. Add the slice volumes. More, thinner slices improve this approximation for a smooth shape.

Let the sphere radius be R. A slice midpoint is at height z relative to the centre. Pythagoras in a vertical cross-section says the disk's radius squared is R² - z², so its area is pi times that quantity. Let dz be one slice's thickness. In notation, $\Delta z$ means “change in z”; it corresponds to `dz` in code.

::: math
\[ A(z)=\pi(R^2-z^2), \qquad V_{\mathrm{slice}}\approx A(z)\Delta z \]
\[ V\approx\sum_{i=0}^{n-1} A(z_i)\Delta z, \qquad \Delta z=\frac{2R}{n} \]
- $A(z)$ means area evaluated at height z; parentheses indicate a function input.
- $n$: number of slices; $i$: slice index; $z_i$: height of slice i's midpoint.
- Sigma means add every slice volume. The approximation sign $\approx$ means “approximately equal.”
In code: compute each midpoint in a loop, calculate its disk area, multiply by `dz`, then add to `total`.
:::

Predict before running: will this estimate get closer to the known sphere volume as the number of slices increases? The exact comparison value is four thirds of pi times R cubed.

```python
def sphere_by_slices(radius, slices):
    dz = 2 * radius / slices
    total = 0.0
    for i in range(slices):
        z = -radius + (i + 0.5) * dz
        disk_area = math.pi * (radius * radius - z * z)
        slice_volume = disk_area * dz
        total += slice_volume
    return total

radius = 0.05
exact_volume = (4 / 3) * math.pi * radius**3
for slices in [4, 10, 40, 100]:
    estimate = sphere_by_slices(radius, slices)
    error_percent = 100 * (estimate - exact_volume) / exact_volume
    print(f"{slices:3d} slices: {estimate:.9f} m^3, error {error_percent:+.4f}%")
```

`i + 0.5` selects the middle of slice i rather than its lower edge. The loop starts at the bottom, z = -R, and advances by dz. `total += slice_volume` is precisely the finite summation in the formula. The estimates approach the exact volume from above for this particular midpoint construction. That direction of error is not a promise for arbitrary shapes.

This is a first numerical volume method. It makes the operation visible before introducing a general integration library. To evaluate an unfamiliar shape, supply its cross-sectional area rather than pretending its outer dimensions describe a solid box.

::: challenge Fill a conical tank by slices [medium]
A cone has its tip at height zero, height `height`, and top radius `top_radius`. At height z its radius is `top_radius * z / height`, by similar triangles. Write `cone_by_slices(top_radius, height, slices)` using midpoint slices and a running total. Require positive dimensions and a positive integer count, excluding booleans; raise `ValueError` otherwise. Inputs are finite. Do not substitute the exact cone-volume formula: the goal is to implement the slices.
```python starter
def cone_by_slices(top_radius, height, slices):
    return math.pi * top_radius**2 * height
```
```python solution
def cone_by_slices(top_radius, height, slices):
    if top_radius <= 0 or height <= 0 or type(slices) is not int or slices <= 0:
        raise ValueError("Need positive dimensions and a positive integer slice count")
    dz = height / slices
    total = 0.0
    for i in range(slices):
        z = (i + 0.5) * dz
        radius = top_radius * z / height
        total += math.pi * radius**2 * dz
    return total
```
```python test
assert math.isclose(cone_by_slices(2, 3, 1), 3 * math.pi), "One midpoint disk has radius 1 and thickness 3; this tests the approximation, not the exact cone formula."
_exact = math.pi * 2**2 * 3 / 3
_coarse = cone_by_slices(2, 3, 5)
_fine = cone_by_slices(2, 3, 100)
assert 0 < _coarse < _fine < _exact, "Midpoint slices for this expanding cone should approach the exact volume from below."
assert math.isclose(_fine, _exact, rel_tol=3e-5), "Check the midpoint radius and multiplication by slice thickness."
assert math.isclose(cone_by_slices(4, 6, 5), 8 * _coarse), "Doubling all dimensions multiplies volume by eight."
for _args in [(0, 3, 10), (2, -3, 10), (2, 3, 0), (2, 3, 2.5), (2, 3, True)]:
    try:
        cone_by_slices(*_args)
    except ValueError:
        pass
    else:
        assert False, "Reject invalid dimensions and slice counts."
"SUCCESS: A loop over midpoint disks approximates the changing cross-section."
```
Hint: Each step computes z, then the radius at z, then pi times radius squared times dz. The familiar exact result, one third of the enclosing cylinder, is a check on convergence.
:::

## 3. Density converts volume into mass

Suppose every cubic metre of a model material has mass 2700 kg. A volume of 0.0002 m³ then has mass 0.54 kg. **Density** is mass per volume. We write it with the Greek letter rho, $\rho$, pronounced “row,” and use the name `density` in Python.

Uniform density is an assumption, not a consequence of the part's shape. A hollow structure, a mixture of materials, or porosity can invalidate a solid, uniform-material calculation. Also distinguish mass, measured in kilograms, from weight, a force that depends on gravitational acceleration.

::: math
\[ m=\rho V, \qquad (2700\ \mathrm{kg/m}^3)(0.0002\ \mathrm{m}^3)=0.54\ \mathrm{kg} \]
- $m$: mass; $\rho$: density; $V$: material volume after removing voids.
- The volume units cancel, leaving kilograms.
In code: multiply material volume by density; subtract a bore's cylinder volume before multiplying.
:::

Predict before running: if a 20 mm diameter through-hole is drilled through our plate, what fraction of the original mass is removed? Diameter is twice radius, so convert diameter to radius before squaring.

```python
density = 2700.0
hole_radius = (20 / 1000) / 2
hole_volume = math.pi * hole_radius**2 * thickness
remaining_volume = volume - hole_volume
solid_mass = density * volume
remaining_mass = density * remaining_volume
print(f"Solid plate: {solid_mass:.6f} kg")
print(f"Drilled plate: {remaining_mass:.6f} kg")
print(f"Removed fraction: {100 * hole_volume / volume:.3f}%")
```

The removed fraction is about 1.571%, assuming the circular bore lies fully inside the plate. `hole_volume / volume` is dimensionless because both quantities have the same unit. We use a nominal example density rather than claiming a precise value for every alloy or temperature.

## 4. The balance point is a mass-weighted average

Place a 2 kg mass at horizontal position 0 m and a 1 kg mass at 3 m. The balance point is 1 m. About that point, the first mass has twice the mass but half the lever arm: 2 times 1 equals 1 times 2. This is a **centre of mass**: the position of a single mass that represents the assembly's first moments.

A **first moment** here means mass times coordinate. Add the moments, then divide by total mass. Apply the same procedure independently to horizontal, vertical and depth coordinates. A shape's geometric centre is also its centre of mass only when its density is uniform or the distribution has the required symmetry.

::: math
\[ \bar{x}=\frac{(2)(0)+(1)(3)}{2+1}=1\ \mathrm{m}, \qquad \bar{x}=\frac{\sum_i m_i x_i}{\sum_i m_i} \]
- A bar over x means the weighted-average coordinate, not a new operation to perform on each x.
- $m_i,x_i$: mass and horizontal coordinate of component i. Each sigma adds over the same components.
- A removed region can be represented by a negative mass contribution when subtracting it from a solid model.
In code: keep one running total for mass and another for mass times position, then divide once at the end.
:::

Predict before running: drilling a hole on the right side of a uniform plate should move its balance point left or right?

```python
plate_centre_x = length / 2
hole_centre_x = 0.15
removed_mass = density * hole_volume
components = [(solid_mass, plate_centre_x), (-removed_mass, hole_centre_x)]
mass_total = 0.0
moment_total = 0.0
for mass, x in components:
    mass_total += mass
    moment_total += mass * x
centre_x = moment_total / mass_total
print("Original centre x (m):", plate_centre_x)
print("Drilled centre x (m):", centre_x)
print("Centre shift (mm):", 1000 * (centre_x - plate_centre_x))
fig, ax = plt.subplots(figsize=(8, 3))
ax.fill([0, length, length, 0], [0, 0, width, width], alpha=0.2, label="Original plate")
hole_outline = plt.Circle((hole_centre_x, width / 2), hole_radius, facecolor="white", edgecolor="black")
ax.add_patch(hole_outline)
ax.scatter([plate_centre_x], [width / 2], marker="+", s=100, label="Original centre")
ax.scatter([centre_x], [width / 2], marker="x", s=60, label="Centre after drilling")
ax.set(xlabel="x (m)", ylabel="y (m)", title="Removing material on the right shifts the balance point left")
ax.set_aspect("equal", adjustable="box")
ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1))
fig.tight_layout()
plt.show()
```

The centre moves left by about 0.798 mm. The markers nearly overlap at the part's true scale: the printed displacement resolves the small shift. `plt.Circle` draws the removed cross-section; its centre is halfway up the plate, so only the horizontal balance changes. A negative component is bookkeeping for removed positive material; it is not a claim that negative physical mass exists. Its position must be the centre of the removed region. The volume subtraction and moment subtraction must describe the same hole.

::: challenge Combine component mass and position [medium]
Write `mass_and_centre(components)`, where each component is `(mass, (x, y, z))`. Return `(total_mass, (cx, cy, cz))`. Components are a valid additive/subtractive decomposition of a real part; negative masses represent removed regions, and the total must be positive. Raise `ValueError` when total mass is zero or negative, including an empty list. All supplied numbers are finite.
```python starter
def mass_and_centre(components):
    return 0.0, (0.0, 0.0, 0.0)
```
```python solution
def mass_and_centre(components):
    total = 0.0
    mx = my = mz = 0.0
    for mass, (x, y, z) in components:
        total += mass
        mx += mass * x
        my += mass * y
        mz += mass * z
    if total <= 0:
        raise ValueError("Total mass must be positive")
    return total, (mx / total, my / total, mz / total)
```
```python test
_mass, _centre = mass_and_centre([(2, (0, 0, 0)), (1, (3, 6, -3))])
assert _mass == 3 and np.allclose(_centre, (1, 2, -1)), "Weight each coordinate by mass; do not average the positions equally."
_mass, _centre = mass_and_centre([(10, (2, 3, 4)), (-2, (4, 3, 4))])
assert _mass == 8 and np.allclose(_centre, (1.5, 3, 4)), "Subtract removed material from moments as well as total mass."
_mass, _centre = mass_and_centre([(5, (7, -2, 9))])
assert _mass == 5 and np.allclose(_centre, (7, -2, 9)), "A single component retains its own centre."
for _components in [[], [(1, (0, 0, 0)), (-1, (1, 0, 0))], [(-2, (0, 0, 0))]]:
    try:
        mass_and_centre(_components)
    except ValueError:
        pass
    else:
        assert False, "A nonpositive total cannot define this part's centre of mass."
"SUCCESS: Mass-weighted coordinate sums correctly account for additions and removed material."
```
Hint: Use four totals: mass, mass*x, mass*y, mass*z. Divide the last three by mass only after the loop and the positive-total check.
:::

## 5. Equal mass does not mean equal resistance to rotation

Two assemblies can have equal total mass and the same centre of mass yet respond differently to a turning force. Put two 1 kg point masses at horizontal positions -0.1 m and +0.1 m. Then move them to -0.2 m and +0.2 m. Both assemblies remain balanced at the origin, but the second places each mass twice as far from the rotation axis.

The **mass moment of inertia** about an axis adds each mass multiplied by its perpendicular distance from the axis squared. It measures how mass is distributed for rotation about that specified axis. Squaring the distance makes outward mass especially influential. This is not the area moment used in beam bending; its units include mass.

::: math
\[ I=\sum_i m_i r_i^2, \qquad r_i^2=x_i^2+y_i^2 \quad\text{for the z-axis through the origin} \]
- $I$: mass moment of inertia, in kg m²; $r_i$: perpendicular distance of mass i from the chosen axis.
- A point's z coordinate does not change its distance from the z-axis. The axis, not just the origin, must be specified.
In code: multiply each mass by `x*x + y*y`, then add the contributions in a loop.
:::

Predict before running: after doubling each radius, will inertia double or quadruple?

```python
def inertia_about_z(point_masses):
    total = 0.0
    for mass, (x, y, z) in point_masses:
        distance_squared = x * x + y * y
        total += mass * distance_squared
    return total

near = [(1, (-0.1, 0, 0)), (1, (0.1, 0, 0))]
far = [(1, (-0.2, 0, 0)), (1, (0.2, 0, 0))]
print("Near-axis inertia (kg m^2):", inertia_about_z(near))
print("Farther-out inertia (kg m^2):", inertia_about_z(far))
print("Ratio:", inertia_about_z(far) / inertia_about_z(near))
```

The inertias are 0.02 and 0.08 kg m². A finite solid cannot generally be replaced by one point at its centre when calculating inertia: that loses the solid's internal spread. Divide it into small masses or use a derived solid-body formula. The centre-of-mass calculation, in contrast, can combine whole components at their individual centres. Knowing which property preserves which information prevents a convincing but wrong shortcut.

## Reference: from dimensions to mass properties

1. Convert all lengths to a common unit consistent with density.
2. Compute material volume: area times thickness for an extrusion; sum area times slice thickness for changing sections; subtract real voids.
3. Multiply each uniform-material volume by its density to obtain mass.
4. Add masses and their coordinate moments separately. Divide moment totals by a positive mass total to locate the centre of mass.
5. For rotational inertia, specify an axis and retain the distribution of mass around it. Add mass times squared perpendicular distance; do not collapse an extended body into its centre point.

Symbol-to-code reminders: V is `volume`; rho is `density`; a sigma is an addition loop; a coordinate bar denotes a weighted average; delta z is the finite slice thickness `dz`. These are descriptions of operations, not extra Python syntax.

For a transfer check, predict what happens if the plate's density doubles while its geometry stays fixed. Mass and inertia double, but the centre of mass stays put. Then move the hole to the opposite side and predict the sign of the centre shift. The next notebook explores curved profiles beyond the circle.
