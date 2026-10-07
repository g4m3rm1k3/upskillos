# Two equations, two unknowns

Two cable tensions held a load in equilibrium; two coolant concentrates must blend into a tank of the right strength; two loop currents flow in a circuit with two batteries. Each problem has two unknowns, and each gives exactly two independent facts about them. Two linear equations in two unknowns is the smallest **system of equations**, and everything about large systems, which run every structural analysis, circuit simulator and machine-learning model, is already visible in it: there may be one solution, none or infinitely many, and a system can be **ill-conditioned**, so that tiny errors in the data cause large errors in the answer. This lesson solves 2 × 2 systems by hand and in code, sees what each case means geometrically, and applies them to mixtures and circuits.

This lesson covers:

- a linear equation in two unknowns as a line, and a system as an intersection;
- solving by elimination, and by the determinant formula (Cramer's rule);
- the three cases: one solution, none, infinitely many;
- mixture problems and two-loop circuits;
- ill-conditioning: when nearly parallel lines make answers unreliable.

## Equations as lines

::: math
\[ a_1 x + b_1 y = c_1, \qquad a_2 x + b_2 y = c_2 \]
- each equation is a line; the solution is the point on both
- one crossing: one solution; parallel lines: none; the same line: infinitely many
In code: each equation is a tuple `(a, b, c)`, plotted as $y = (c - a x)/b$
:::


An equation a x + b y = c, with a and b not both zero, holds for every point on a straight line, the general form from the lines lesson. A **system** of two such equations asks for the points on both lines, so the solution is where the lines cross. Three things can happen:

- the lines cross at one point: exactly **one solution**;
- the lines are parallel and distinct: **no solution** (the equations contradict each other);
- the lines are the same line: **infinitely many** solutions (the equations say the same thing twice).

Predict before running: which of the three systems below has no solution?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

systems = {
    "one solution": [(1, 1, 10), (2, -1, 2)],
    "no solution": [(1, 2, 4), (2, 4, 12)],
    "infinitely many": [(1, -1, 1), (3, -3, 3)],
}
xs = np.linspace(-2, 10, 2)
fig, axes = plt.subplots(1, 3, figsize=(11, 3.2))
for ax, (name, eqs) in zip(axes, systems.items()):
    for (a, b, c), style in zip(eqs, ["-", "--"]):
        ax.plot(xs, (c - a * xs) / b, style, label=f"{a}x + {b}y = {c}")
    ax.set_title(name)
    ax.set_ylim(-4, 12)
    ax.legend(fontsize=8)
plt.show()
for name, ((a1, b1, c1), (a2, b2, c2)) in systems.items():
    print(f"{name:<16} a1·b2 − a2·b1 = {a1 * b2 - a2 * b1}")
```

```output
one solution     a1·b2 − a2·b1 = -3
no solution      a1·b2 − a2·b1 = 0
infinitely many  a1·b2 − a2·b1 = 0
```

Each line is drawn by solving its equation for y; that works here because every b is non-zero.

The middle system has no solution: 2x + 4y = 12 is the same as x + 2y = 6, parallel to x + 2y = 4. In the third, the second equation is just three times the first. In both special cases the number a₁b₂ − a₂b₁ is zero, which says the lines have the same direction. That number is the **determinant**, and it decides everything.

## Elimination and Cramer's rule

::: math
\[ D = a_1 b_2 - a_2 b_1, \qquad x = \frac{c_1 b_2 - c_2 b_1}{D}, \qquad y = \frac{a_1 c_2 - a_2 c_1}{D} \]
- $D$: the determinant; $D = 0$ means the lines are parallel and there is no unique solution
- check any answer by substituting it back into both equations
In code: `cramer(a1, b1, c1, a2, b2, c2)` raises `ValueError` when `D == 0`
:::


The hand method is **elimination**: multiply the equations so that one unknown has matching coefficients, then subtract to remove it. For x + y = 10 and 2x − y = 2, adding the equations eliminates y: 3x = 12, so x = 4, and then y = 6.

Doing elimination once with letters in place of numbers gives a formula for every 2 × 2 system. For a₁x + b₁y = c₁ and a₂x + b₂y = c₂, with determinant D = a₁b₂ − a₂b₁:

\[ x = \frac{c_1 b_2 - c_2 b_1}{D}, \qquad y = \frac{a_1 c_2 - a_2 c_1}{D} \]

This is **Cramer's rule**, used for the cable tensions and in the lines lesson. It fails exactly when D = 0, the parallel cases. Predict before running: does the formula agree with NumPy's solver?

```python type
def cramer(a1, b1, c1, a2, b2, c2):
    D = a1 * b2 - a2 * b1
    if D == 0:
        raise ValueError("the determinant is zero: no unique solution")
    return (c1 * b2 - c2 * b1) / D, (a1 * c2 - a2 * c1) / D

x, y = cramer(1, 1, 10, 2, -1, 2)
print("Cramer:", (x, y), "  NumPy:", np.linalg.solve([[1, 1], [2, -1]], [10, 2]))
print("check both equations:", x + y, "and", 2 * x - y)
try:
    cramer(1, 2, 4, 2, 4, 12)
except ValueError as err:
    print("parallel lines:", err)
```

```output
Cramer: (4.0, 6.0)   NumPy: [4. 6.]
check both equations: 10.0 and 2.0
parallel lines: the determinant is zero: no unique solution
```

Both give x = 4, y = 6. Always substitute a solution back into the original equations: it costs one line and catches sign slips in the setup, which no solver can detect.

## Mixtures

::: math
\[ p + q = V, \qquad c_1\,p + c_2\,q = c_\text{target}\,V \]
- $p$ and $q$: litres of each stock; $V$: total volume; $c_1$ and $c_2$: their concentrations
- a negative $p$ or $q$ means the target cannot be blended from these stocks
In code: `blend(c1, c2, target, total)` calls `cramer(1, 1, total, c1, c2, target * total)`
:::


A machine shop keeps two coolant concentrates in stock, one at 8% and one at 2%, and needs 50 litres at 5%. Two unknowns, the litres of each (call them p and q), and two facts:

- total volume: p + q = 50;
- total concentrate: 0.08 p + 0.02 q = 0.05 × 50.

This is a 2 × 2 system. The same structure fits alloys (mass and composition), blending fuels (volume and energy content) and feed mixes (mass and protein). The answer must also make physical sense: a negative quantity means the target cannot be made from these two stocks. Predict before running: how much of each concentrate is needed, and what happens if 10% is requested?

```python type
def blend(c1, c2, target, total):
    return cramer(1, 1, total, c1, c2, target * total)

p, q = blend(0.08, 0.02, 0.05, 50)
print(f"5%: {p:.2f} L of 8% and {q:.2f} L of 2%")
p, q = blend(0.08, 0.02, 0.10, 50)
print(f"10%: {p:.2f} L of 8% and {q:.2f} L of 2%  <- a negative amount: impossible")
```

```output
5%: 25.00 L of 8% and 25.00 L of 2%
10%: 66.67 L of 8% and -16.67 L of 2%  <- a negative amount: impossible
```

5% sits exactly halfway between 2% and 8%, so the blend is 25 litres of each. Asking for 10% gives 66.67 L of the 8% stock and −16.67 L of the 2%: the algebra is fine, but no mixture of 2% and 8% can be stronger than 8%. A computed answer still needs checking against what is physically possible.

## A two-loop circuit

::: math
\[ (R_1 + R_3)\,I_1 - R_3\,I_2 = V_1, \qquad -R_3\,I_1 + (R_2 + R_3)\,I_2 = -V_2 \]
- $I_1$ and $I_2$: loop currents; the shared resistor $R_3$ carries $I_1 - I_2$
- power check: $\sum I^2 R = V_1 I_1 - V_2 I_2$
In code: `cramer(R1 + R3, -R3, V1, -R3, R2 + R3, -V2)`
:::


Circuits give systems directly. Two batteries share a resistor: battery 1 (V₁ = 12 V) drives a loop through R₁ = 4 Ω and the shared R₃ = 6 Ω; battery 2 (V₂ = 6 V) drives a second loop through R₂ = 2 Ω and the same R₃. Assign a **loop current** to each loop, I₁ and I₂, both taken clockwise. The shared resistor carries their difference, I₁ − I₂. **Kirchhoff's voltage law** says the voltage changes around any loop sum to zero:

\[ (R_1 + R_3) I_1 - R_3 I_2 = V_1, \qquad -R_3 I_1 + (R_2 + R_3) I_2 = -V_2 \]

with battery 2 placed so that it pushes current anticlockwise round loop 2, against the chosen direction. Predict before running: is battery 2 delivering power or being charged?

```python type
V1, V2, R1, R2, R3 = 12, 6, 4, 2, 6
I1, I2 = cramer(R1 + R3, -R3, V1, -R3, R2 + R3, -V2)
print(f"I1 = {I1:.4f} A, I2 = {I2:.4f} A, shared resistor carries {I1 - I2:.4f} A")
dissipated = I1 ** 2 * R1 + I2 ** 2 * R2 + (I1 - I2) ** 2 * R3
supplied = V1 * I1 - V2 * I2
print(f"power dissipated {dissipated:.4f} W, power supplied {supplied:.4f} W")
```

```output
I1 = 1.3636 A, I2 = 0.2727 A, shared resistor carries 1.0909 A
power dissipated 14.7273 W, power supplied 14.7273 W
```

A resistor carrying current I dissipates I²R watts; a battery delivers V × I when the current leaves its positive terminal, and absorbs power when the current is forced through it the other way.

The loop currents are 1.3636 A and 0.2727 A, both clockwise. In loop 2 that is against battery 2's own push, so the stronger battery 1 is forcing current backwards through battery 2: it is being charged, absorbing 6 × 0.2727 = 1.64 W of the 16.36 W battery 1 delivers. The shared resistor carries the difference, 1.0909 A. Power balances: the net 14.73 W supplied equals the 14.73 W the resistors turn into heat. A balance check like this tests the whole model, signs included.

## Ill-conditioning

::: math
\[ x + y = 2, \qquad x + 1.001\,y = 2.001, \qquad D = 0.001 \]
- a determinant small compared with the coefficients means nearly parallel lines
- then a tiny change in the right-hand side moves $(x, y)$ a long way: the system is **ill-conditioned**
In code: `cramer(1, 1, 2, 1, 1.001, 2.001)` against the same with `2.002`
:::


When two lines are nearly parallel, their crossing point is very sensitive: tilt either line slightly and the crossing slides a long way. Measured coefficients always carry some error, so a nearly singular system can give answers that are mathematically correct and practically meaningless. The determinant hints at this: it is small compared with the coefficients. Predict before running: two nearly parallel lines, and a change of 0.001 in one right-hand side. How far does the solution move?

```python type
base = cramer(1, 1, 2, 1, 1.001, 2.001)
nudged = cramer(1, 1, 2, 1, 1.001, 2.002)
print("solution:", np.round(base, 6), "  after changing 2.001 to 2.002:", np.round(nudged, 6))
print("determinant:", round(1 * 1.001 - 1 * 1, 12))
well = cramer(1, 1, 2, 1, -1, 0), cramer(1, 1, 2, 1, -1, 0.001)
print("well-conditioned, same nudge:", np.round(well[0], 6), "->", np.round(well[1], 6))
print("condition numbers:", round(np.linalg.cond([[1, 1], [1, 1.001]])), "and", round(np.linalg.cond([[1, 1], [1, -1]]), 3))
```

```output
solution: [1. 1.]   after changing 2.001 to 2.002: [0. 2.]
determinant: 0.001
well-conditioned, same nudge: [1. 1.] -> [1.0005 0.9995]
condition numbers: 4002 and 1.0
```

`np.linalg.cond` gives the **condition number**: roughly, the factor by which relative errors in the data can be magnified in the solution. The linear algebra block derives it.

A change of 0.001 in one number moves the solution from (1, 1) to (0, 2): a thousand times the change. The same nudge to a well-conditioned system (perpendicular lines) moves the answer by 0.0005. The condition number, about 4,000 against 1, measures the difference. When a system's condition number is large, its answer is only as trustworthy as its data's least significant digits.

::: challenge Classify and solve [easy]
Write `classify(a1, b1, c1, a2, b2, c2)` that returns `"one"`, `"none"` or `"infinite"` for the system a₁x + b₁y = c₁, a₂x + b₂y = c₂. When D = a₁b₂ − a₂b₁ is zero, the lines are the same exactly when also a₁c₂ − a₂c₁ = 0 and b₁c₂ − b₂c₁ = 0. Raise `ValueError` if either equation has a = b = 0. Then write `solve2(a1, b1, c1, a2, b2, c2)` returning `(x, y)` by Cramer's rule, each rounded to 9 decimal places with `0.0` added (so `-0.0` becomes `0.0`), raising `ValueError` unless the system has exactly one solution. The tests use whole numbers, so `D == 0` is an exact test.

```python starter
def classify(a1, b1, c1, a2, b2, c2):
    return "one"

def solve2(a1, b1, c1, a2, b2, c2):
    return (0.0, 0.0)

print(classify(1, 2, 4, 2, 4, 12), solve2(1, 1, 10, 2, -1, 2))
```

```python solution
def classify(a1, b1, c1, a2, b2, c2):
    if (a1 == 0 and b1 == 0) or (a2 == 0 and b2 == 0):
        raise ValueError("each equation needs a non-zero coefficient")
    if a1 * b2 - a2 * b1 != 0:
        return "one"
    if a1 * c2 - a2 * c1 == 0 and b1 * c2 - b2 * c1 == 0:
        return "infinite"
    return "none"

def solve2(a1, b1, c1, a2, b2, c2):
    if classify(a1, b1, c1, a2, b2, c2) != "one":
        raise ValueError("the system does not have exactly one solution")
    D = a1 * b2 - a2 * b1
    return (round((c1 * b2 - c2 * b1) / D, 9) + 0.0, round((a1 * c2 - a2 * c1) / D, 9) + 0.0)

print(classify(1, 2, 4, 2, 4, 12), solve2(1, 1, 10, 2, -1, 2))
```

```python test
for _n in ["classify", "solve2"]:
    assert _n in dir(), f"Define {_n}."
assert classify(1, 1, 10, 2, -1, 2) == "one" and classify(1, 2, 4, 2, 4, 12) == "none" and classify(1, -1, 1, 3, -3, 3) == "infinite", "The lesson's three systems."
assert classify(0, 2, 6, 0, 5, 15) == "infinite" and classify(0, 2, 6, 0, 5, 14) == "none" and classify(3, 0, 6, 0, 2, 8) == "one", "Horizontal and vertical lines."
assert classify(2, 0, 6, 5, 0, 14) == "none" and classify(2, 0, 6, 5, 0, 15) == "infinite", "Two vertical lines."
assert classify(2, 4, 0, 1, 2, 0) == "infinite", "Two equations through the origin with the same direction."
for _bad in [(0, 0, 1, 1, 1, 1), (1, 1, 1, 0, 0, 0)]:
    try:
        classify(*_bad)
        assert False, f"classify{_bad} should raise ValueError."
    except ValueError:
        pass
assert solve2(1, 1, 10, 2, -1, 2) == (4.0, 6.0) and solve2(3, 0, 6, 0, 2, 8) == (2.0, 4.0), "Solutions."
assert solve2(1, 3, 0, 2, -1, 0) == (0.0, 0.0) and str(solve2(1, 3, 0, 2, -1, 0)[0]) == "0.0", "Through the origin, with no -0.0."
assert solve2(3, 7, 1, 2, 5, 1) == (-2.0, 1.0), "Negative values."
for _bad in [(1, 2, 4, 2, 4, 12), (1, -1, 1, 3, -3, 3)]:
    try:
        solve2(*_bad)
        assert False, f"solve2{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The determinant decides: non-zero gives one crossing; zero gives parallel lines, which either never meet or coincide."
```

Hint: In `classify`, check the determinant first; only when it is zero, check whether the right-hand sides are in the same proportion. `solve2` can call `classify` and then apply Cramer's rule.
:::

::: challenge Blending two ingredients [medium]
An animal-feed mill blends two ingredients. Each kilogram of ingredient A contains `a = (protein, fat)` kilograms of protein and fat, and each kilogram of B contains `b = (protein, fat)`. Write `blend_for(a, b, target)` that returns the kilograms of A and B `(mass_a, mass_b)` so that the blend contains exactly `target = (protein, fat)` kilograms, each rounded to 3 decimal places. Raise `ValueError` if the two ingredients have proportional compositions (no unique blend) or if either computed mass is negative by more than 1e-9 (that target cannot be made from these two). Then write `blend_cost(a, b, target, price_a, price_b)` returning the cost of that blend rounded to 2 decimal places.

```python starter
def blend_for(a, b, target):
    return (0.0, 0.0)

def blend_cost(a, b, target, price_a, price_b):
    return 0.0

print(blend_for((0.44, 0.02), (0.09, 0.04), (18, 2)))
```

```python solution
def blend_for(a, b, target):
    (pa, fa), (pb, fb), (P, F) = a, b, target
    D = pa * fb - fa * pb
    if abs(D) < 1e-15:
        raise ValueError("the ingredients have proportional compositions")
    ma = (P * fb - F * pb) / D
    mb = (pa * F - fa * P) / D
    if ma < -1e-9 or mb < -1e-9:
        raise ValueError("this target cannot be made from these two ingredients")
    return (round(ma, 3) + 0.0, round(mb, 3) + 0.0)

def blend_cost(a, b, target, price_a, price_b):
    ma, mb = blend_for(a, b, target)
    return round(ma * price_a + mb * price_b, 2)

print(blend_for((0.44, 0.02), (0.09, 0.04), (18, 2)))
```

```python test
for _n in ["blend_for", "blend_cost"]:
    assert _n in dir(), f"Define {_n}."
assert blend_for((0.44, 0.02), (0.09, 0.04), (18, 2)) == (34.177, 32.911), f"Soya meal and maize; got {blend_for((0.44, 0.02), (0.09, 0.04), (18, 2))}."
_ma, _mb = blend_for((0.3, 0.1), (0.1, 0.2), (7, 4))
assert (_ma, _mb) == (20.0, 10.0) and abs(0.3 * _ma + 0.1 * _mb - 7) < 1e-9 and abs(0.1 * _ma + 0.2 * _mb - 4) < 1e-9, "Both targets met exactly."
assert blend_for((0.3, 0.1), (0.1, 0.2), (3, 1)) == (10.0, 0.0), "All of A is allowed."
for _bad in [((0.3, 0.1), (0.6, 0.2), (3, 1)), ((0.3, 0.1), (0.1, 0.2), (1, 3)), ((0.3, 0.1), (0.1, 0.2), (8, 1))]:
    try:
        blend_for(*_bad)
        assert False, f"blend_for{_bad} should raise ValueError."
    except ValueError:
        pass
assert blend_cost((0.3, 0.1), (0.1, 0.2), (7, 4), 0.45, 0.22) == 11.2, "20 kg at 0.45 plus 10 kg at 0.22."
"SUCCESS: Two nutrients, two ingredients: a 2 × 2 system, plus the physical check that no amount is negative."
```

Hint: The unknowns are the two masses: protein gives pa·ma + pb·mb = P and fat gives fa·ma + fb·mb = F. Apply Cramer's rule, then check the signs of the results.
:::

::: challenge Two batteries, three resistors [hard]
Write `mesh_currents(V1, V2, R1, R2, R3)` for the lesson's two-loop circuit, returning `(I1, I2, I_shared)` with I_shared = I1 − I2, each rounded to 6 decimal places with `0.0` added. Solve the two loop equations from the lesson yourself, **without** `np.linalg` (no `solve`, `inv` or `lstsq`). Raise `ValueError` if any resistance is not positive. Then write `power_balance(V1, V2, R1, R2, R3)` returning `(supplied, dissipated)` in watts, both rounded to 6 decimal places, where supplied = V1·I1 − V2·I2 and dissipated is the sum of I²R over the three resistors (use the unrounded currents). Finally write `battery2_charging(V1, V2, R1, R2, R3)`: True when battery 2 is being charged, which with the lesson's sign convention means I2 > 0 (current forced clockwise through battery 2, against its push), returned as a plain `bool`.

```python starter
def mesh_currents(V1, V2, R1, R2, R3):
    return (V1 / R1, V2 / R2, 0.0)

def power_balance(V1, V2, R1, R2, R3):
    return (0.0, 0.0)

def battery2_charging(V1, V2, R1, R2, R3):
    return False

print(mesh_currents(12, 6, 4, 2, 6))
```

```python solution
def _currents(V1, V2, R1, R2, R3):
    if min(R1, R2, R3) <= 0:
        raise ValueError("resistances must be positive")
    a1, b1, c1 = R1 + R3, -R3, V1
    a2, b2, c2 = -R3, R2 + R3, -V2
    D = a1 * b2 - a2 * b1
    return (c1 * b2 - c2 * b1) / D, (a1 * c2 - a2 * c1) / D

def mesh_currents(V1, V2, R1, R2, R3):
    I1, I2 = _currents(V1, V2, R1, R2, R3)
    return (round(I1, 6) + 0.0, round(I2, 6) + 0.0, round(I1 - I2, 6) + 0.0)

def power_balance(V1, V2, R1, R2, R3):
    I1, I2 = _currents(V1, V2, R1, R2, R3)
    supplied = V1 * I1 - V2 * I2
    dissipated = I1 ** 2 * R1 + I2 ** 2 * R2 + (I1 - I2) ** 2 * R3
    return (round(supplied, 6), round(dissipated, 6))

def battery2_charging(V1, V2, R1, R2, R3):
    return bool(_currents(V1, V2, R1, R2, R3)[1] > 0)

print(mesh_currents(12, 6, 4, 2, 6))
```

```python test
import ast as _ast
for _n in ["mesh_currents", "power_balance", "battery2_charging"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert not (_attrs & {"linalg", "solve", "lstsq", "inv"}), "Solve the loop equations yourself."
assert mesh_currents(12, 6, 4, 2, 6) == (1.363636, 0.272727, 1.090909), f"The lesson's circuit; got {mesh_currents(12, 6, 4, 2, 6)}."
assert mesh_currents(10, 0, 5, 5, 5) == (1.333333, 0.666667, 0.666667), "One battery: the current splits."
assert mesh_currents(0, 0, 1, 2, 3) == (0.0, 0.0, 0.0), "No batteries, no current."
_s, _d = power_balance(12, 6, 4, 2, 6)
assert _s == _d == 14.727273, f"Power balances at 14.73 W; got {(_s, _d)}."
for _args in [(9, 3, 1, 7, 2), (24, 12, 3, 3, 10), (5, 20, 2, 1, 4)]:
    _s, _d = power_balance(*_args)
    assert abs(_s - _d) < 1e-5, f"Supplied must equal dissipated for {_args}; got {(_s, _d)}."
assert battery2_charging(12, 6, 4, 2, 6) is True and battery2_charging(5, 20, 2, 1, 4) is False, "Charging when I2 > 0."
for _bad in [(12, 6, 0, 2, 6), (12, 6, 4, -2, 6), (12, 6, 4, 2, 0)]:
    try:
        mesh_currents(*_bad)
        assert False, f"mesh_currents{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Two loop equations give both currents, and the power balance proves the signs are right."
```

Hint: The coefficients are a₁ = R1 + R3, b₁ = −R3, c₁ = V1 and a₂ = −R3, b₂ = R2 + R3, c₂ = −V2; apply Cramer's rule. Keep the unrounded currents for the power calculation.
:::

## What you learned

- A linear equation in two unknowns is a line; a 2 × 2 system's solution is where two lines meet: one point, none (parallel) or infinitely many (the same line).
- Elimination solves systems by hand; done with letters it gives Cramer's rule, x = (c₁b₂ − c₂b₁)/D and y = (a₁c₂ − a₂c₁)/D, with determinant D = a₁b₂ − a₂b₁.
- D = 0 means parallel lines. Substitute every solution back to check it.
- Mixtures and circuits produce 2 × 2 systems directly. A solution must also be physically possible: no negative quantities, and power must balance.
- Nearly parallel lines make an ill-conditioned system whose answer swings wildly with small data changes; the condition number measures this.

The next lesson writes systems as a single matrix equation, A x = b, ready for any number of unknowns.
