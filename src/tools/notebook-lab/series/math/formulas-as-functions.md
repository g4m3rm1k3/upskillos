# Formulas as functions

Every engineering handbook is a list of formulas: stress is force over area, a cantilever's tip deflects by FL³/(3EI), electrical power is V²/R. On paper a formula is a relationship between letters. In a program it becomes a **function**: named inputs go in and a result comes out, and the function can be tested, reused, combined with others and run over thousands of cases. This lesson turns formulas into functions and covers the habits that keep them trustworthy: clear names and units, building big formulas from small ones, rearranging for a different unknown, and testing a formula against cases where you already know the answer.

This lesson covers:

- writing a formula as a Python function with named, unit-labelled inputs;
- composing formulas from smaller ones;
- rearranging a formula to solve for a different variable;
- testing formulas with known values, limiting cases, scaling and round trips;
- passing formulas to other functions as values.

## A formula is a function

::: math
\[ \delta = \frac{F L^3}{3 E I}, \qquad I = \frac{b h^3}{12} \]
- $\delta$: tip deflection (m); $F$: load (N); $L$: length (m)
- $E$: Young's modulus (Pa), about $200 \times 10^9$ for steel; $I$: second moment of area (m⁴)
- $b$ and $h$: the rectangle's width and height
In code: `def cantilever_deflection(F, L, E, I): return F * L ** 3 / (3 * E * I)`
:::


A steel bar clamped at one end and loaded at the other bends. Its tip deflection is

\[ \delta = \frac{F L^3}{3 E I} \]

where F is the load, L the length, E the material's stiffness (Young's modulus, about 200 GPa for steel) and I the **second moment of area** of the cross-section, which measures how well the shape resists bending. For a rectangle b wide and h tall, I = bh³/12.

As code, each letter becomes a parameter. Single letters match the handbook, so they are fine here as long as the docstring says what each one means and in which units. Working in SI base units throughout (N, m, Pa) means no conversion factors hide inside the formula. Predict before running: what is the tip deflection of a 20 × 40 mm steel bar, 0.5 m long, carrying 500 N?

```python type
def rect_I(b, h):
    """Second moment of area of a b-wide, h-tall rectangle (m^4), for bending about its width."""
    return b * h ** 3 / 12

def cantilever_deflection(F, L, E, I):
    """Tip deflection (m) of a cantilever: load F (N), length L (m), modulus E (Pa), second moment I (m^4)."""
    return F * L ** 3 / (3 * E * I)

STEEL_E = 200e9
I = rect_I(0.020, 0.040)
delta = cantilever_deflection(F=500, L=0.5, E=STEEL_E, I=I)
print(f"I = {I:.4e} m^4, tip deflection = {delta * 1000:.3f} mm")
```

```output
I = 1.0667e-07 m^4, tip deflection = 0.977 mm
```

The tip moves just under 1 mm. Calling with keyword arguments (`F=500, L=0.5`) makes the call read like the formula and protects against swapping two numbers of similar size, a classic and silent mistake.

## Building formulas from formulas

::: math
\[ \delta(b, h) = \frac{F L^3}{3 E \cdot b h^3 / 12} = \frac{4 F L^3}{E\, b\, h^3} \]
- $\delta \propto \dfrac{1}{h^3}$: doubling the height divides the deflection by 8
- $\delta \propto \dfrac{1}{b}$: doubling the width only halves it
In code: `bar_deflection` calls `cantilever_deflection` with `rect_I(b, h)`: one formula built from another
:::


`cantilever_deflection` takes I as an input rather than b and h, so the same function serves rectangles, tubes and I-beams: each shape needs only its own small `I` function. Small formulas that each do one thing, composed together, are easier to check than one long expression.

Composition also makes the formula's structure easy to explore. Because I contains h³, doubling the bar's height should cut the deflection by 2³ = 8, while doubling its width only halves it. Predict before running: which orientation of the same 20 × 40 bar is stiffer, and by how much?

```python type
def bar_deflection(F, L, E, b, h):
    return cantilever_deflection(F, L, E, rect_I(b, h))

tall = bar_deflection(500, 0.5, STEEL_E, b=0.020, h=0.040)
flat = bar_deflection(500, 0.5, STEEL_E, b=0.040, h=0.020)
print(f"standing on edge: {tall * 1000:.3f} mm, lying flat: {flat * 1000:.3f} mm, ratio {flat / tall:.1f}")
print("double the height ->", round(tall / bar_deflection(500, 0.5, STEEL_E, 0.020, 0.080), 6), "times stiffer")
print("double the width  ->", round(tall / bar_deflection(500, 0.5, STEEL_E, 0.040, 0.040), 6), "times stiffer")
```

```output
standing on edge: 0.977 mm, lying flat: 3.906 mm, ratio 4.0
double the height -> 8.0 times stiffer
double the width  -> 2.0 times stiffer
```

The same steel deflects 4 times as much lying flat as standing on edge. That is why joists and beams are deep and narrow: depth is cubed, width is not.

## Rearranging for a different unknown

::: math
\[ \delta = \frac{4 F L^3}{E b h^3} \quad\Longrightarrow\quad h = \left(\frac{4 F L^3}{E\, b\, \delta}\right)^{1/3} \]
- rearranging solves the same relationship for a different unknown
- a round trip, $\delta(h(\delta)) = \delta$, checks the algebra
In code: `(4 * F * L ** 3 / (E * b * max_deflection)) ** (1 / 3)`
:::


The handbook formula gives deflection from the dimensions. A designer usually needs the reverse: the allowable deflection is given (say 0.4 mm), so what height must the bar be? Substitute I = bh³/12 and solve for h:

\[ \delta = \frac{F L^3}{3 E \, b h^3 / 12} = \frac{4 F L^3}{E b h^3} \quad\Longrightarrow\quad h = \left( \frac{4 F L^3}{E b \, \delta} \right)^{1/3} \]

Each rearrangement is a new function. The algebra can go wrong, so check it with a **round trip**: feed the computed h back into the forward formula and confirm that it returns the δ you asked for. Predict before running: if the bar must deflect no more than 0.4 mm, how tall must it be, and how much heavier is it than the 40 mm bar?

```python type
def required_height(F, L, E, b, max_deflection):
    """Bar height (m) so that a b-wide cantilever deflects exactly max_deflection (m)."""
    return (4 * F * L ** 3 / (E * b * max_deflection)) ** (1 / 3)

h = required_height(500, 0.5, STEEL_E, b=0.020, max_deflection=0.0004)
back = bar_deflection(500, 0.5, STEEL_E, 0.020, h)
print(f"required height {h * 1000:.2f} mm, round trip gives {back * 1000:.6f} mm")
print(f"mass ratio vs the 40 mm bar: {h / 0.040:.3f}")
```

```output
required height 53.86 mm, round trip gives 0.400000 mm
mass ratio vs the 40 mm bar: 1.347
```

Cutting the deflection from 0.98 mm to 0.4 mm, by a factor of about 2.4, needs a bar only about 35% taller, and so about 35% heavier, because deflection depends on the cube of the height: 1.35³ ≈ 2.4. The round trip returns 0.4 mm to six decimal places, which confirms the algebra.

## Testing a formula

::: math
\[ \delta \propto F, \qquad \delta \propto L^3, \qquad \delta \propto \frac{1}{E}, \qquad F = 0 \Rightarrow \delta = 0 \]
- scaling tests: doubling $L$ must multiply $\delta$ by $2^3 = 8$
- a formula with $L^2$ instead of $L^3$ fails that test (it gives 4)
In code: compare `checked_deflection(…, 2 * L, …) / base` with 8
:::


A wrong formula still returns a plausible number, so formulas need tests just like algorithms. Four kinds of test catch almost every mistake:

- **known values**: a worked example from a handbook or a hand calculation;
- **limiting cases**: zero load must give zero deflection, and an infinitely stiff material must give none;
- **scaling**: the formula must change with each input the way the physics says (deflection proportional to F, to L³, and to 1/E);
- **round trips**: a rearranged formula, fed back into the original, returns its input.

Bad inputs deserve an error rather than a nonsense answer: a negative length is a typo, not a design. Predict before running: which of these checks would catch a formula that had L² instead of L³?

```python type
def checked_deflection(F, L, E, I):
    if L <= 0 or E <= 0 or I <= 0:
        raise ValueError("length, modulus and second moment must be positive")
    return cantilever_deflection(F, L, E, I)

base = checked_deflection(500, 0.5, STEEL_E, I)
print("zero load gives", checked_deflection(0, 0.5, STEEL_E, I))
print("double F ->", checked_deflection(1000, 0.5, STEEL_E, I) / base)
print("double L ->", checked_deflection(500, 1.0, STEEL_E, I) / base)
print("double E ->", checked_deflection(500, 0.5, 2 * STEEL_E, I) / base)

def wrong_deflection(F, L, E, I):
    return F * L ** 2 / (3 * E * I)

print("the L-squared typo: double L ->", wrong_deflection(500, 1.0, STEEL_E, I) / wrong_deflection(500, 0.5, STEEL_E, I))
try:
    checked_deflection(500, -0.5, STEEL_E, I)
except ValueError as err:
    print("rejected:", err)
```

```output
zero load gives 0.0
double F -> 2.0
double L -> 8.0
double E -> 0.5
the L-squared typo: double L -> 4.0
rejected: length, modulus and second moment must be positive
```

The scaling test catches the typo at once: doubling L gives 4 rather than 8. A single known-value test would also catch it here, but scaling tests need no reference answer at all, only knowledge of how the physics behaves.

## Formulas as values

::: math
\[ \text{sweep: } h_1, h_2, \ldots \;\mapsto\; \delta(h_1), \delta(h_2), \ldots \quad \text{with } F, L, E, b \text{ held fixed} \]
- a formula is a function $f(x_1, \ldots, x_n)$; a sweep varies one input
- the design rule: the smallest $h$ with $\delta(h) \le 0.4$ mm
In code: `formula(**{name: v}, **fixed)` evaluates the formula with one input changed
:::


In Python a function is a value like any other: it can be stored in a dictionary, passed to another function or returned from one. That makes it possible to write general tools that work for any formula, such as a sweep that evaluates a formula over a range of one input while holding the others fixed. Predict before running: in steps of 10 mm, what is the shortest standard bar height that meets the 0.4 mm limit?

```python type
def sweep(formula, name, values, **fixed):
    return [(v, formula(**{name: v}, **fixed)) for v in values]

heights = [0.030, 0.040, 0.050, 0.060]
for h_value, d in sweep(bar_deflection, "h", heights, F=500, L=0.5, E=STEEL_E, b=0.020):
    print(f"h = {h_value * 1000:.0f} mm -> {d * 1000:.3f} mm", "ok" if d <= 0.0004 else "too flexible")
```

```output
h = 30 mm -> 2.315 mm too flexible
h = 40 mm -> 0.977 mm too flexible
h = 50 mm -> 0.500 mm too flexible
h = 60 mm -> 0.289 mm ok
```

`**fixed` gathers the held inputs into a dictionary, and `formula(**{name: v}, **fixed)` unpacks them back into keyword arguments together with the swept one.

The first standard height that passes is 60 mm, because the exact answer, about 53.9 mm, falls between 50 and 60 mm. The `sweep` function knows nothing about beams. It works for any formula with keyword parameters, which is the payoff of treating formulas as functions.

::: challenge Electrical heating [easy]
A resistive heater on a voltage V draws a current I = V / R and dissipates power P = V² / R. Write `heater(voltage, resistance)` returning the tuple `(current, power)` in amperes and watts. Write the rearrangement `resistance_for_power(voltage, power)`, the resistance (Ω) that gives the required power at that voltage. Both must raise `ValueError` if any input is zero or negative.

```python starter
def heater(voltage, resistance):
    return (0, 0)

def resistance_for_power(voltage, power):
    return 0

print(heater(230, 26.45), resistance_for_power(230, 2000))
```

```python solution
def heater(voltage, resistance):
    if voltage <= 0 or resistance <= 0:
        raise ValueError("voltage and resistance must be positive")
    return voltage / resistance, voltage ** 2 / resistance

def resistance_for_power(voltage, power):
    if voltage <= 0 or power <= 0:
        raise ValueError("voltage and power must be positive")
    return voltage ** 2 / power

print(heater(230, 26.45), resistance_for_power(230, 2000))
```

```python test
import math as _math
for _n in ["heater", "resistance_for_power"]:
    assert _n in dir(), f"Define {_n}."
_i, _p = heater(230, 26.45)
assert _math.isclose(_i, 230 / 26.45) and _math.isclose(_p, 2000), f"heater(230, 26.45) should draw about 8.70 A and give 2000 W; got {(_i, _p)}."
assert _math.isclose(resistance_for_power(230, 2000), 26.45), "R = V² / P."
assert _math.isclose(resistance_for_power(12, 36), 4), "R = V² / P at 12 V."
for _v, _w in [(110, 1500), (12, 50), (400, 9000)]:
    assert _math.isclose(heater(_v, resistance_for_power(_v, _w))[1], _w), "Round trip: the computed resistance must give back the power."
for _f, _args in [(heater, (0, 10)), (heater, (230, -1)), (resistance_for_power, (230, 0)), (resistance_for_power, (-5, 100))]:
    try:
        _f(*_args)
        assert False, f"{_f.__name__}{_args} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A formula, its rearrangement, and a round trip proving the algebra: the core habit of this lesson."
```

Hint: The current is `voltage / resistance` and the power `voltage ** 2 / resistance`. Rearranging P = V²/R for R gives R = V²/P. Check the inputs before computing.
:::

::: challenge Choosing a standard size [medium]
Write `first_passing(formula, name, values, limit, **fixed)`: evaluate `formula` with keyword argument `name` set to each of `values` in order (the other arguments come from `fixed`), and return the first value whose result is **at most** `limit`. Return `None` if none passes. Then write `tube_I(width, height, wall)`, the second moment of a rectangular hollow tube: the outer rectangle's bh³/12 minus the inner one's, where the inner rectangle is `width - 2*wall` by `height - 2*wall`. Raise `ValueError` if the wall is not positive or the tube would have no hole (`2 * wall >= width` or `2 * wall >= height`). Then `tube_deflection(F, L, E, width, height, wall)` is the cantilever deflection with `tube_I`.

```python starter
def first_passing(formula, name, values, limit, **fixed):
    return values[0]

def tube_I(width, height, wall):
    return width * height ** 3 / 12

def tube_deflection(F, L, E, width, height, wall):
    return cantilever_deflection(F, L, E, tube_I(width, height, wall))

print(first_passing(bar_deflection, "h", [0.03, 0.04, 0.05, 0.06], 0.0004, F=500, L=0.5, E=STEEL_E, b=0.02))
```

```python solution
def first_passing(formula, name, values, limit, **fixed):
    for v in values:
        if formula(**{name: v}, **fixed) <= limit:
            return v
    return None

def tube_I(width, height, wall):
    if wall <= 0 or 2 * wall >= width or 2 * wall >= height:
        raise ValueError("the wall must be positive and leave a hole")
    inner_w, inner_h = width - 2 * wall, height - 2 * wall
    return (width * height ** 3 - inner_w * inner_h ** 3) / 12

def tube_deflection(F, L, E, width, height, wall):
    return cantilever_deflection(F, L, E, tube_I(width, height, wall))

print(first_passing(bar_deflection, "h", [0.03, 0.04, 0.05, 0.06], 0.0004, F=500, L=0.5, E=STEEL_E, b=0.02))
```

```python test
import math as _math
for _n in ["first_passing", "tube_I", "tube_deflection"]:
    assert _n in dir(), f"Define {_n}."
assert first_passing(bar_deflection, "h", [0.03, 0.04, 0.05, 0.06], 0.0004, F=500, L=0.5, E=200e9, b=0.02) == 0.06, "The first bar height meeting 0.4 mm is 60 mm."
assert first_passing(lambda x, k: k * x, "x", [5, 4, 3, 2], 6, k=2) == 3, "The first value in the given order whose result is at most the limit."
assert first_passing(lambda x: x, "x", [7, 8], 7) == 7, "At most: equal to the limit passes."
assert first_passing(lambda x: x, "x", [9, 10], 1) is None, "None when nothing passes."
assert _math.isclose(tube_I(0.04, 0.06, 0.003), (0.04 * 0.06 ** 3 - 0.034 * 0.054 ** 3) / 12), "Outer minus inner."
assert tube_I(0.05, 0.05, 0.004) < rect_I(0.05, 0.05), "A tube is less stiff than the solid bar of the same outline."
for _bad in [(0.04, 0.06, 0), (0.04, 0.06, 0.02), (0.04, 0.03, 0.016), (0.04, 0.06, -0.001)]:
    try:
        tube_I(*_bad)
        assert False, f"tube_I{_bad} should raise ValueError."
    except ValueError:
        pass
_d = tube_deflection(500, 0.5, 200e9, 0.04, 0.06, 0.003)
assert _math.isclose(_d, 500 * 0.125 / (3 * 200e9 * tube_I(0.04, 0.06, 0.003))), "tube_deflection is the cantilever formula with tube_I."
_walls = [0.002, 0.003, 0.004, 0.005]
assert first_passing(tube_deflection, "wall", _walls, 0.0005, F=500, L=0.5, E=200e9, width=0.04, height=0.06) == 0.003, "The thinnest standard wall for 0.5 mm."
"SUCCESS: A general search over any formula, and a tube that keeps 38% of the solid bar's stiffness with under a quarter of its steel: the first passing wall is just 3 mm."
```

Hint: In `first_passing`, loop over `values` and call `formula(**{name: v}, **fixed)`. A tube's I is `(width * height**3 - inner_w * inner_h**3) / 12`.
:::

::: challenge Solving any formula numerically [hard]
Rearranging works only when the algebra can be done. Some formulas cannot be solved for one of their inputs at all. The liquid volume in a horizontal cylindrical tank of radius r and length L, filled to depth d, is

\[ V = L \left( r^2 \cos^{-1}\!\frac{r - d}{r} - (r - d)\sqrt{2 r d - d^2} \right) \]

and there is no formula for d in terms of V. Write `tank_volume(r, L, d)` (cubic metres; raise `ValueError` unless 0 ≤ d ≤ 2r). Then write `solve_for(formula, name, target, low, high, **fixed)`, which finds the value of input `name` between `low` and `high` where `formula` equals `target`, by **bisection**: the formula is assumed monotonic (increasing or decreasing) on the interval, so repeatedly halve the interval, keeping the half in which the result crosses the target. Raise `ValueError` if the target is not between the formula's values at `low` and `high`; if the formula already equals the target exactly at `low` or `high`, return that end. Stop when the interval is narrower than `1e-12 * max(1, abs(low), abs(high))`, or after 200 halvings, and return the midpoint.

```python starter
import math

def tank_volume(r, L, d):
    return 0.0

def solve_for(formula, name, target, low, high, **fixed):
    return (low + high) / 2

print(solve_for(lambda x: x ** 3, "x", 27, 0, 10))
```

```python solution
import math

def tank_volume(r, L, d):
    if not 0 <= d <= 2 * r:
        raise ValueError("depth must be between 0 and the diameter")
    return L * (r ** 2 * math.acos((r - d) / r) - (r - d) * math.sqrt(2 * r * d - d * d))

def solve_for(formula, name, target, low, high, **fixed):
    f = lambda v: formula(**{name: v}, **fixed) - target
    f_low, f_high = f(low), f(high)
    if f_low == 0:
        return low
    if f_high == 0:
        return high
    if (f_low > 0) == (f_high > 0):
        raise ValueError("the target is not between the values at low and high")
    width = 1e-12 * max(1, abs(low), abs(high))
    for _ in range(200):
        if high - low < width:
            break
        mid = (low + high) / 2
        f_mid = f(mid)
        if f_mid == 0:
            return mid
        if (f_mid > 0) == (f_low > 0):
            low, f_low = mid, f_mid
        else:
            high = mid
    return (low + high) / 2

print(solve_for(lambda x: x ** 3, "x", 27, 0, 10))
```

```python test
import math as _math
for _n in ["tank_volume", "solve_for"]:
    assert _n in dir(), f"Define {_n}."
assert tank_volume(1, 2, 0) == 0 and _math.isclose(tank_volume(1, 2, 2), 2 * _math.pi), "Empty and full."
assert _math.isclose(tank_volume(1, 2, 1), _math.pi), "Half full is half the volume."
assert _math.isclose(tank_volume(0.5, 3, 0.25), 3 * (0.25 * _math.acos(0.5) - 0.25 * _math.sqrt(0.1875))), "A quarter-depth case."
for _bad in [-0.1, 2.5, 2 + 1e-9]:
    try:
        tank_volume(1, 2, _bad)
        assert False, f"Depth {_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(solve_for(lambda x: x ** 3, "x", 27, 0, 10) - 3) < 1e-9, "An increasing formula."
assert abs(solve_for(lambda x, k: k / x, "x", 4, 0.5, 100, k=10) - 2.5) < 1e-9, "A decreasing formula, with a fixed input."
_d = solve_for(tank_volume, "d", 1.0, 0, 1.6, r=0.8, L=1.5)
assert abs(tank_volume(0.8, 1.5, _d) - 1.0) < 1e-9, f"The depth for 1 m³ should give back 1 m³; got depth {_d}."
_h = solve_for(bar_deflection, "h", 0.0005, 0.01, 0.2, F=500, L=0.5, E=200e9, b=0.02)
assert abs(_h - required_height(500, 0.5, 200e9, 0.02, 0.0005)) < 1e-12, "Bisection must agree with the algebraic rearrangement."
assert solve_for(lambda x: x, "x", 5, 5, 9) == 5 and solve_for(lambda x: x, "x", 9, 5, 9) == 9, "A target exactly at an end returns that end."
for _bad in [(lambda x: x * x, "x", 200, 0, 10), (lambda x: -x, "x", 3, 0, 10)]:
    try:
        solve_for(*_bad)
        assert False, "A target outside the formula's range on the interval should raise ValueError."
    except ValueError:
        pass
_calls = [0]
def _counted(x):
    _calls[0] += 1
    return x ** 3
solve_for(_counted, "x", 2, 0, 2)
assert _calls[0] <= 210, f"Bisection took {_calls[0]} evaluations; it should stop after at most 200 halvings."
"SUCCESS: Bisection inverts any monotonic formula, even one with no algebraic rearrangement, such as a tank's depth from its volume."
```

Hint: Work with `g(v) = formula(**{name: v}, **fixed) - target`. If g is exactly 0 at an end, return that end; if it has the same sign at both ends, raise. Otherwise, at each step evaluate the midpoint and keep the half whose ends have opposite signs of g.
:::

## What you learned

- A formula becomes a function whose named parameters carry the letters, and whose docstring records their meaning and units. Calling with keyword arguments prevents swapped inputs.
- Small formulas compose into large ones; a deflection formula that takes I works for any cross-section.
- Rearranging a formula for a different unknown gives a new function. A round trip through the original checks the algebra.
- Known values, limiting cases, scaling and round trips test formulas; scaling tests need no reference answer.
- Functions are values: general tools such as sweeps and bisection work with any formula, and bisection inverts formulas that algebra cannot.

The next lesson draws a formula as a graph, the fastest way to see how a relationship behaves.
