# Components and resultants

A wall bracket holds a sign, a crane hook carries a load on two slings, a pallet rests on a ramp. In each case several forces act at once, in different directions, and the questions are always the same: what is their combined effect, and is the object in balance? Vectors answer both. Split every force into components along two perpendicular axes, add the components separately, and the hard geometry becomes two easy sums. This lesson applies that method to forces: resolving a force into components, choosing tilted axes when they help, finding the resultant of several forces, and using equilibrium to find unknown forces, such as the tension in each of two cables.

This lesson covers:

- resolving a force into perpendicular components, on ordinary and tilted axes;
- the resultant of several forces, by adding components;
- equilibrium: when forces balance, and the equilibrant that balances them;
- finding two unknown forces from the two equilibrium equations;
- the same calculation in OpenMAT's MATLAB-style notation.

## Resolving a force

::: math
\[ F_x = F\cos\theta, \qquad F_y = F\sin\theta \]
- $F$: the size of the force (N); $\theta$: its angle from the x axis
- on a slope at angle $\alpha$, a weight $W$ splits into $W\sin\alpha$ along the slope and $W\cos\alpha$ into it
In code: `W * math.sin(math.radians(alpha))`, converting degrees to radians first
:::

A force F at angle θ from the x axis has these components, the vector-from-polar formula of the previous lesson. Each component is the part of the force acting along one axis; together they have exactly the same effect as F.

The axes need not be horizontal and vertical. For an object on a slope inclined at α, the natural axes run **along** the slope and **perpendicular** to it. The weight W = mg points straight down, at angle α from the perpendicular axis, so it splits into W sin α pulling down the slope and W cos α pressing into it. Predict before running: for a 120 kg pallet on a 15° ramp, which component is larger?

```python type
import math
import numpy as np

g = 9.81
m, alpha = 120, 15
W = m * g
along = W * math.sin(math.radians(alpha))
normal = W * math.cos(math.radians(alpha))
print(f"weight {W:.1f} N: down the slope {along:.1f} N, into the slope {normal:.1f} N")
print("components rebuild the weight:", math.isclose(math.hypot(along, normal), W))
for a in [0, 5, 15, 30, 45, 60, 90]:
    print(f"{a:>3}° ramp: {math.sin(math.radians(a)):.3f} of the weight pulls down the slope")
```

```output
weight 1177.2 N: down the slope 304.7 N, into the slope 1137.1 N
components rebuild the weight: True
  0° ramp: 0.000 of the weight pulls down the slope
  5° ramp: 0.087 of the weight pulls down the slope
 15° ramp: 0.259 of the weight pulls down the slope
 30° ramp: 0.500 of the weight pulls down the slope
 45° ramp: 0.707 of the weight pulls down the slope
 60° ramp: 0.866 of the weight pulls down the slope
 90° ramp: 1.000 of the weight pulls down the slope
```

On a 15° ramp only about a quarter of the weight, 304.7 N, pulls the pallet down the slope; the rest, 1137.1 N, presses it into the surface, and that normal force is what friction works with. The fraction down the slope is sin α, from 0 on the flat to the whole weight on a vertical face. At 45° the two components are equal.

## The resultant of several forces

The **resultant** of several forces is their vector sum: the single force with the same effect. Adding arrows head to tail by drawing is slow and imprecise; adding components is exact. Resolve every force, sum the x components and the y components separately, then convert back to a magnitude and direction.

::: math
\[ R_x = \sum F_x, \quad R_y = \sum F_y, \quad |R| = \sqrt{R_x^2 + R_y^2}, \quad \theta_R = \operatorname{atan2}(R_y, R_x) \]
- $R_x, R_y$: the resultant's components, each a plain sum
- $|R|$: its magnitude, by Pythagoras; $\theta_R$: its direction
- the **equilibrant** $-R$ is the force that would balance them
In code: one row of `[Fx, Fy]` per force, then `comps.sum(axis=0)`
:::

A bracket bolted to a wall carries three forces: 400 N horizontally (0°) from a tie, 250 N at 120° from a strut, and 300 N at 225° from a hanging load's cable. Predict before running: is the resultant large or small compared with the individual forces?

```python type
forces = [(400, 0), (250, 120), (300, 225)]
comps = np.array([[F * math.cos(math.radians(a)), F * math.sin(math.radians(a))] for F, a in forces])
for (F, a), (fx, fy) in zip(forces, comps):
    print(f"{F:>4} N at {a:>3}°: Fx = {fx:8.2f}, Fy = {fy:8.2f}")
R = comps.sum(axis=0)
print(f"resultant: Rx = {R[0]:.2f}, Ry = {R[1]:.2f}  ->  {np.linalg.norm(R):.2f} N at {math.degrees(math.atan2(R[1], R[0])):.2f}°")
print("equilibrant (the force that balances them):", np.round(-R, 2))
```

```output
 400 N at   0°: Fx =   400.00, Fy =     0.00
 250 N at 120°: Fx =  -125.00, Fy =   216.51
 300 N at 225°: Fx =  -212.13, Fy =  -212.13
resultant: Rx = 62.87, Ry = 4.37  ->  63.02 N at 3.98°
equilibrant (the force that balances them): [-62.87  -4.37]
```

Each row of `comps` is one force's (Fx, Fy); summing down the columns (`axis=0`) adds the components.

The three forces, each hundreds of newtons, nearly cancel: the resultant is only 63.02 N, pointing just above horizontal (3.98°). Large forces with a small resultant are typical of structures, where members push and pull against each other. The **equilibrant**, −R, is the extra force that would bring the bracket exactly into balance; the bolts must supply it.

## Equilibrium

::: math
\[ \sum F_x = 0, \qquad \sum F_y = 0 \]
\[ -T_1\cos 40° + T_2 \cos 60° = 0, \qquad T_1 \sin 40° + T_2 \sin 60° = 2000 \]
- $T_1, T_2$: the unknown cable tensions (N)
- two equations, two unknowns: a linear system $A\mathbf{t} = \mathbf{b}$
In code: `np.linalg.solve(A, b)` with the cosines and sines as the rows of `A`
:::

An object at rest, or moving at constant velocity, has zero resultant force: by Newton's first law, any non-zero resultant would accelerate it. In two dimensions that is two equations, one per axis, so they can determine two unknowns. A classic case is a load hung from two cables. A 2,000 N load hangs from a ring held by cable 1, pulling up and to the left at 40° above the horizontal, and cable 2, pulling up and to the right at 60° above the horizontal; the box above writes the two balance equations for the tensions T₁ and T₂.

The first equation gives T₁ in terms of T₂; substituting into the second leaves one unknown. A computer solves such systems directly: written as a matrix equation A t = b, `np.linalg.solve` finds t. The next block of lessons explains how. Predict before running: which cable carries more tension, the shallower one or the steeper one?

```python type
a1, a2, load = math.radians(40), math.radians(60), 2000
A = np.array([[-math.cos(a1), math.cos(a2)],
              [ math.sin(a1), math.sin(a2)]])
b = np.array([0, load])
T1, T2 = np.linalg.solve(A, b)
print(f"T1 = {T1:.1f} N (at 40°), T2 = {T2:.1f} N (at 60°)")
print("check, sum of forces:", np.round(A @ np.array([T1, T2]) - b, 9) + 0.0)
for angle in [30, 15, 5, 1]:
    s = math.radians(angle)
    sym = load / (2 * math.sin(s))
    print(f"both cables at {angle:>2}° above horizontal: each carries {sym:9.1f} N")
```

```output
T1 = 1015.4 N (at 40°), T2 = 1555.7 N (at 60°)
check, sum of forces: [0. 0.]
both cables at 30° above horizontal: each carries    2000.0 N
both cables at 15° above horizontal: each carries    3863.7 N
both cables at  5° above horizontal: each carries   11473.7 N
both cables at  1° above horizontal: each carries   57298.7 N
```

`A @ t` multiplies the matrix by the vector, recomputing the left-hand sides of both equations; a zero result confirms the solution.

The steeper cable, T₂ at 60°, carries more: 1,555.7 N against T₁'s 1,015.4 N, because it is closer to vertical and so better placed to hold the load up. Both tensions together exceed the 2,000 N load, since their horizontal components fight each other. The symmetric table shows the danger of shallow cables: at 5° each carries more than 11 kN, and at 1° over 57 kN, for the same 2,000 N load. A cable can never be pulled perfectly straight under a load, which is why riggers keep sling angles well above 30°.

## The same system in OpenMAT

::: math
\[ A\mathbf{t} = \mathbf{b}, \qquad A = \begin{pmatrix} -\cos 40° & \cos 60° \\ \sin 40° & \sin 60° \end{pmatrix}, \quad \mathbf{b} = \begin{pmatrix} 0 \\ 2000 \end{pmatrix} \]
In code: `A = [-cosd(40) cosd(60); sind(40) sind(60)]` and `T = A \ b`
:::

Linear systems like this one are where MATLAB-style notation shines, and OpenMAT, the in-browser MATLAB-like environment, runs it here. Matrices are written row by row in square brackets with rows separated by `;`, `cosd` and `sind` take degrees directly, and `A \ b` solves A t = b. The cell runs on its own: it shares no variables with the Python cells. Predict before running: do the tensions match the Python result?

```openmat
load = 2000;
A = [-cosd(40) cosd(60); sind(40) sind(60)];
b = [0; load];
T = A \ b
fprintf('T1 = %.1f N, T2 = %.1f N\n', T(1), T(2));
residual = A * T - b
```

`A \ b` reads as "A divides into b": it solves the system without forming an inverse. `T(1)` is the first element: MATLAB-style indexing starts at 1, not 0.

The tensions agree with Python's: 1,015.4 N and 1,555.7 N, and the residual is zero to rounding (about 10⁻¹³ N). Python with NumPy and MATLAB-style tools are two notations for the same mathematics; the lessons do the work in Python and show OpenMAT where its compact matrix notation helps, as it will throughout the linear algebra lessons.

::: challenge Adding forces [easy]
Write `resolve(magnitude, angle_deg)` returning the tuple `(Fx, Fy)` of a force, each rounded to 6 decimal places with `0.0` added (so `-0.0` becomes `0.0`). Then write `resultant(forces)`, where `forces` is a list of `(magnitude, angle_deg)` pairs: return `(magnitude, angle_deg)` of the resultant, the magnitude rounded to 3 decimal places and the angle in [0, 360) rounded to 2 decimal places. If the resultant has magnitude below 1e-9 (the forces balance), return `(0.0, 0.0)`. An empty list also gives `(0.0, 0.0)`.

```python starter
def resolve(magnitude, angle_deg):
    return (magnitude, 0.0)

def resultant(forces):
    return (sum(F for F, _ in forces), 0.0)

print(resultant([(400, 0), (250, 120), (300, 225)]))
```

```python solution
def resolve(magnitude, angle_deg):
    th = math.radians(angle_deg)
    return (round(magnitude * math.cos(th), 6) + 0.0, round(magnitude * math.sin(th), 6) + 0.0)

def resultant(forces):
    rx = sum(F * math.cos(math.radians(a)) for F, a in forces)
    ry = sum(F * math.sin(math.radians(a)) for F, a in forces)
    mag = math.hypot(rx, ry)
    if mag < 1e-9:
        return (0.0, 0.0)
    return (round(mag, 3), round(math.degrees(math.atan2(ry, rx)) % 360, 2))

print(resultant([(400, 0), (250, 120), (300, 225)]))
```

```python test
for _n in ["resolve", "resultant"]:
    assert _n in dir(), f"Define {_n}."
assert resolve(250, 30) == (216.506351, 125.0) and resolve(10, 90) == (0.0, 10.0) and resolve(10, 180) == (-10.0, 0.0), f"Got {resolve(250, 30)}, {resolve(10, 90)}, {resolve(10, 180)}."
assert str(resolve(10, 270)[0]) == "0.0", "No -0.0."
assert resultant([(400, 0), (250, 120), (300, 225)]) == (63.02, 3.98), f"The bracket; got {resultant([(400, 0), (250, 120), (300, 225)])}."
assert resultant([(3, 0), (4, 90)]) == (5.0, 53.13) and resultant([(5, 180), (5, 270)]) == (7.071, 225.0), "Angles in [0, 360)."
assert resultant([(10, 0), (10, 120), (10, 240)]) == (0.0, 0.0) and resultant([]) == (0.0, 0.0), "Balanced forces and no forces."
"SUCCESS: Resolve, sum the components, convert back: the resultant of any number of forces."
```

Hint: Sum `F * cos(θ)` and `F * sin(θ)` over all the forces, then use `math.hypot` for the magnitude and `math.atan2` with `% 360` for the direction.
:::

::: challenge Will it slide? [medium]
An object of mass `m` (kg) rests on a ramp at `alpha` degrees. Friction can supply at most μ times the normal force, where μ is the coefficient of friction. Write `ramp(m, alpha, mu, g=9.81)` returning a dict with keys `"along"` (the weight component down the slope), `"normal"` (the component into the slope), `"friction_max"` (μ × normal) and `"slides"` (True if the down-slope component exceeds the maximum friction). Round the three forces to 2 decimal places, and make `"slides"` a plain `bool`. Raise `ValueError` if `m` is not positive, `alpha` is outside 0 to 90 inclusive, or `mu` is negative. Then write `critical_angle(mu)`, the steepest angle in degrees at which the object does not slide, rounded to 2 decimal places: along equals friction_max exactly when tan α = μ.

```python starter
def ramp(m, alpha, mu, g=9.81):
    return {"along": 0, "normal": 0, "friction_max": 0, "slides": False}

def critical_angle(mu):
    return 45.0

print(ramp(120, 15, 0.3))
```

```python solution
def ramp(m, alpha, mu, g=9.81):
    if m <= 0 or not 0 <= alpha <= 90 or mu < 0:
        raise ValueError("need m > 0, 0 <= alpha <= 90 and mu >= 0")
    W = m * g
    along = W * math.sin(math.radians(alpha))
    normal = W * math.cos(math.radians(alpha))
    friction = mu * normal
    return {"along": round(along, 2), "normal": round(normal, 2), "friction_max": round(friction, 2), "slides": bool(along > friction)}

def critical_angle(mu):
    return round(math.degrees(math.atan(mu)), 2)

print(ramp(120, 15, 0.3))
```

```python test
for _n in ["ramp", "critical_angle"]:
    assert _n in dir(), f"Define {_n}."
assert ramp(120, 15, 0.3) == {"along": 304.68, "normal": 1137.09, "friction_max": 341.13, "slides": False}, f"Got {ramp(120, 15, 0.3)}."
assert ramp(120, 20, 0.3)["slides"] is True and ramp(50, 0, 0)["slides"] is False, "Steeper than the critical angle slides; flat ground with no friction does not."
assert type(ramp(10, 10, 0.1)["slides"]) is bool, "slides must be a plain bool."
assert ramp(10, 90, 0.5)["normal"] == 0.0 and ramp(10, 90, 0.5)["along"] == 98.1, "A vertical face."
for _bad in [(0, 10, 0.2), (10, -1, 0.2), (10, 91, 0.2), (10, 10, -0.1)]:
    try:
        ramp(*_bad)
        assert False, f"ramp{_bad} should raise ValueError."
    except ValueError:
        pass
assert critical_angle(0.3) == 16.7 and critical_angle(1) == 45.0 and critical_angle(0) == 0.0, "tan α = μ."
assert ramp(10, 16.6, 0.3)["slides"] is False and ramp(10, 16.8, 0.3)["slides"] is True, "Either side of the critical angle."
"SUCCESS: The slope splits the weight; friction scales with the normal part; sliding starts where tan α = μ, whatever the mass."
```

Hint: The weight is `m * g`; down the slope is `W sin α`, into it `W cos α`. Slides when along > μ × normal, which simplifies to tan α > μ.
:::

::: challenge Two-cable lift [hard]
A load hangs from a ring held by two cables: cable 1 pulls up and to the **left** at `angle1` degrees above the horizontal, cable 2 up and to the **right** at `angle2` degrees above the horizontal (both strictly between 0 and 90). Write `tensions(load, angle1, angle2)` returning `(T1, T2)` rounded to 1 decimal place, by solving the two equilibrium equations. Solve them yourself (substitution or Cramer's rule), **without** `np.linalg` (no `solve`, `inv` or `lstsq`). Raise `ValueError` if either angle is not strictly between 0 and 90, or the load is negative. Then write `max_load(angle1, angle2, cable_limit)`: the largest load (rounded down to a whole newton, an `int`) for which neither tension exceeds `cable_limit`. Because tensions are proportional to the load, compute the unrounded tension per newton of load (not by calling `tensions`, which rounds) and scale.

```python starter
def tensions(load, angle1, angle2):
    return (load / 2, load / 2)

def max_load(angle1, angle2, cable_limit):
    return cable_limit

print(tensions(2000, 40, 60))
```

```python solution
def _unit_tensions(angle1, angle2):
    if not (0 < angle1 < 90 and 0 < angle2 < 90):
        raise ValueError("cable angles must be strictly between 0 and 90 degrees")
    a1, a2 = math.radians(angle1), math.radians(angle2)
    det = math.cos(a1) * math.sin(a2) + math.sin(a1) * math.cos(a2)
    return math.cos(a2) / det, math.cos(a1) / det

def tensions(load, angle1, angle2):
    if load < 0:
        raise ValueError("the load cannot be negative")
    t1, t2 = _unit_tensions(angle1, angle2)
    return (round(load * t1, 1), round(load * t2, 1))

def max_load(angle1, angle2, cable_limit):
    t1, t2 = _unit_tensions(angle1, angle2)
    return int(math.floor(cable_limit / max(t1, t2)))

print(tensions(2000, 40, 60))
```

```python test
import ast as _ast
for _n in ["tensions", "max_load"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert not (_attrs & {"linalg", "solve", "lstsq", "inv"}), "Solve the two equations yourself."
assert tensions(2000, 40, 60) == (1015.4, 1555.7), f"The lesson's lift; got {tensions(2000, 40, 60)}."
assert tensions(1000, 30, 30) == (1000.0, 1000.0), "Symmetric at 30°: each carries the full load."
assert tensions(0, 45, 45) == (0.0, 0.0), "No load, no tension."
_t1, _t2 = tensions(1500, 25, 70)
assert abs(-_t1 * math.cos(math.radians(25)) + _t2 * math.cos(math.radians(70))) < 0.2 and abs(_t1 * math.sin(math.radians(25)) + _t2 * math.sin(math.radians(70)) - 1500) < 0.2, "The tensions must satisfy both equilibrium equations."
for _bad in [(100, 0, 45), (100, 45, 90), (100, -10, 45), (-5, 45, 45)]:
    try:
        tensions(*_bad)
        assert False, f"tensions{_bad} should raise ValueError."
    except ValueError:
        pass
assert max_load(40, 60, 5000) == 6427 and type(max_load(40, 60, 5000)) is int, f"The steeper cable reaches 5 kN first; got {max_load(40, 60, 5000)}."
assert max_load(45, 45, 1000) == 1414 and max_load(5, 5, 1000) == 174, "Shallow slings carry far less."
"SUCCESS: Two equilibrium equations, two unknown tensions; the shallower the slings, the less they can lift."
```

Hint: From the horizontal equation, T₁ cos a₁ = T₂ cos a₂. Substitute into the vertical one: with D = cos a₁ sin a₂ + sin a₁ cos a₂, T₁ = load × cos a₂ / D and T₂ = load × cos a₁ / D. For `max_load`, divide the limit by the larger tension per newton of load.
:::

## What you learned

- A force F at angle θ resolves into F cos θ and F sin θ. Tilted axes often help: on a slope at α, the weight splits into W sin α along and W cos α into the surface.
- The resultant of several forces comes from adding x and y components separately, then converting back with √ and atan2. Large forces can have a small resultant.
- Equilibrium means ΣFx = 0 and ΣFy = 0: two equations that can find two unknown forces. The equilibrant −R balances a resultant R.
- Shallow cables carry tensions far larger than the load they support.
- OpenMAT writes the same system as `A \ b`, with 1-based indexing and degree-based `cosd` and `sind`.

The next lesson launches a projectile, where components separate a curved path into two simple motions.
