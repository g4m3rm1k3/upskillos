# Quantities and units

In 1999 NASA lost the Mars Climate Orbiter. One team's software reported thruster impulse in pound-force seconds; the other team's software read the numbers as newton seconds. Every calculation was arithmetically perfect, and the spacecraft flew too low into the Martian atmosphere. Closer to the workshop, a feed rate of "0.15" means very different things in millimetres per revolution and millimetres per minute: one cuts metal, and the other barely moves. A number from the real world is not just a number. It is a **quantity**, a number times a **unit**, and the unit carries half the meaning.

This lesson builds a small units system in Python, enough to make the computer catch the mistakes that sank the orbiter.

This lesson covers:

- quantities as a number times a unit, and **dimensions** as the kind of quantity (length, time, mass);
- representing a dimension as exponents of base units, so that multiplying and dividing quantities works automatically;
- a `Quantity` class that refuses to add metres to seconds;
- converting between units and prefixes, applied to machining feeds and speeds.

## Dimensions are exponents

::: math
\[ [\text{force}] = \mathrm{M}^{1}\mathrm{L}^{1}\mathrm{T}^{-2}, \qquad [a \times b] = [a][b] \Rightarrow \text{exponents add} \]
- $\mathrm{L}$, $\mathrm{M}$, $\mathrm{T}$: the base dimensions length, mass, time
- multiplying quantities adds exponents; dividing subtracts them
- power $=$ energy per second: $\mathrm{M}^1\mathrm{L}^2\mathrm{T}^{-2} \div \mathrm{T}^1 = \mathrm{M}^1\mathrm{L}^2\mathrm{T}^{-3}$
In code: a dimension is a dict of exponents, and `combine(a, b, -1)` subtracts them
:::


Every quantity in mechanics can be built from a few **base dimensions**: length (L), mass (M) and time (T), plus a few others for electricity, temperature and amount of substance. A speed is a length divided by a time, L¹T⁻¹. A force is mass times acceleration, M¹L¹T⁻². An energy is a force times a distance, M¹L²T⁻².

So a dimension is just a set of **exponents**, and the rules for combining quantities become rules for exponents:

- multiplying quantities **adds** their exponents (a force times a length: M¹L¹T⁻² × L¹ = M¹L²T⁻²);
- dividing **subtracts** them;
- adding or subtracting is only allowed between quantities with **identical** exponents: you cannot add a length to a time.

A dictionary from base dimension to exponent represents this well. Predict before running: what are the exponents of power, energy per second?

```python type
def combine(a, b, sign=1):
    result = dict(a)
    for base, power in b.items():
        result[base] = result.get(base, 0) + sign * power
    return {base: p for base, p in result.items() if p != 0}

LENGTH, MASS, TIME = {"L": 1}, {"M": 1}, {"T": 1}
speed = combine(LENGTH, TIME, -1)
acceleration = combine(speed, TIME, -1)
force = combine(MASS, acceleration)
energy = combine(force, LENGTH)
power = combine(energy, TIME, -1)
for name, dims in [("speed", speed), ("acceleration", acceleration), ("force", force), ("energy", energy), ("power", power)]:
    print(f"{name:<13} {dims}")
```

```output
speed         {'L': 1, 'T': -1}
acceleration  {'L': 1, 'T': -2}
force         {'M': 1, 'L': 1, 'T': -2}
energy        {'M': 1, 'L': 2, 'T': -2}
power         {'M': 1, 'L': 2, 'T': -3}
```

`combine(a, b, -1)` subtracts b's exponents, which is division; the final comprehension drops exponents that cancel to zero.

Power comes out as M¹L²T⁻³. The same arithmetic shows why torque (a force times a lever arm) has the same dimensions as energy, though they are different kinds of quantity: dimensions catch many mistakes, but not all.

## A quantity that checks itself

::: math
\[ (v_1\,u_1)(v_2\,u_2) = (v_1 v_2)\,(u_1 u_2), \qquad v_1 u + v_2 u = (v_1 + v_2)\,u \]
- a quantity is a value $v$ times a unit $u$
- products combine units; sums are only defined when the units match
In code: `__mul__` multiplies values and combines dimensions; `__add__` raises an error on a mismatch
:::


A `Quantity` holds a value in SI base units (metres, kilograms, seconds) and its dimension. Its special methods make it behave like a number that respects physics: `*` and `/` combine dimensions, and `+` and `-` refuse mismatched ones, raising an error instead of silently producing nonsense. Predict before running: which of the last three lines fails?

```python type
class Quantity:
    def __init__(self, value, dims):
        self.value, self.dims = value, {b: p for b, p in dims.items() if p != 0}

    def __mul__(self, other):
        if not isinstance(other, Quantity):
            return Quantity(self.value * other, self.dims)
        return Quantity(self.value * other.value, combine(self.dims, other.dims))

    __rmul__ = __mul__

    def __truediv__(self, other):
        if not isinstance(other, Quantity):
            return Quantity(self.value / other, self.dims)
        return Quantity(self.value / other.value, combine(self.dims, other.dims, -1))

    def __add__(self, other):
        if not isinstance(other, Quantity) or other.dims != self.dims:
            raise TypeError(f"cannot add {self.dims} and {getattr(other, 'dims', 'a plain number')}")
        return Quantity(self.value + other.value, self.dims)

    def __sub__(self, other):
        return self + (-1 * other)

    def __repr__(self):
        units = " ".join(f"{b}^{p:g}" if p != 1 else b for b, p in sorted(self.dims.items()))
        return f"{self.value:g} [{units}]"

m, kg, s = Quantity(1, LENGTH), Quantity(1, MASS), Quantity(1, TIME)
distance = 120 * m
duration = 8 * s
print("speed:", distance / duration)
print("force on 2 kg at 3 m/s^2:", 2 * kg * (3 * m / s / s))
print("distance + distance:", distance + 30 * m)
try:
    print(distance + duration)
except TypeError as error:
    print("TypeError:", error)
```

```output
speed: 15 [L T^-1]
force on 2 kg at 3 m/s^2: 6 [L M T^-2]
distance + distance: 150 [L]
TypeError: cannot add {'L': 1} and {'T': 1}
```

`__rmul__ = __mul__` lets a plain number appear on the left (`120 * m`), as the polymorphism lesson in the design series explained.

`120 * m` reads like physics and builds a length. Dividing by a time gives a speed, and mass times acceleration gives a force, with dimensions worked out automatically. Adding a length to a time raises an error at the exact line where the mistake is made. That is the whole point: a units bug becomes a loud error instead of a silently wrong answer.

## Units, prefixes and conversion

::: math
\[ x\,[\text{to}] = x\,[\text{from}] \times \frac{f_\text{from}}{f_\text{to}}, \qquad v_c = \pi D n \]
- $f$: a unit's factor in SI base units, e.g. $f_\text{mm} = 10^{-3}$, $f_\text{min} = 60$
- $v_c$: cutting speed; $D$: cutter diameter; $n$: rotation rate (rev per unit time)
In code: `q(value, unit)` multiplies by the factor; `to(quantity, unit)` divides by the target's factor
:::


People do not work in SI base units. A machinist works in millimetres, minutes and revolutions per minute; a US drawing may use inches. Each unit is a **factor** times SI base units, with a dimension: 1 mm is 0.001 m, 1 min is 60 s, 1 inch is exactly 0.0254 m. **Prefixes** scale units by powers of ten (kilo 10³, milli 10⁻³, micro 10⁻⁶).

Converting a value means multiplying by the "from" unit's factor (to reach SI) and dividing by the "to" unit's factor. It is only allowed between units of the same dimension. Revolutions count as dimensionless (a revolution is a pure number of turns), so rpm is just T⁻¹. Predict before running: what cutting speed does a 50 mm cutter at 1,200 rpm give, in metres per minute?

```python type
import math

UNITS = {
    "m": (1.0, LENGTH), "mm": (1e-3, LENGTH), "um": (1e-6, LENGTH), "inch": (0.0254, LENGTH),
    "s": (1.0, TIME), "min": (60.0, TIME), "h": (3600.0, TIME),
    "kg": (1.0, MASS), "g": (1e-3, MASS), "lb": (0.45359237, MASS),
    "rpm": (1 / 60, {"T": -1}), "m/min": (1 / 60, speed), "mm/min": (1e-3 / 60, speed),
}

def q(value, unit):
    factor, dims = UNITS[unit]
    return Quantity(value * factor, dims)

def to(quantity, unit):
    factor, dims = UNITS[unit]
    if quantity.dims != dims:
        raise ValueError(f"cannot express {quantity.dims} in {unit}")
    return quantity.value / factor

diameter = q(50, "mm")
spindle = q(1200, "rpm")
cutting_speed = math.pi * diameter * spindle
print(f"cutting speed: {to(cutting_speed, 'm/min'):.1f} m/min  = {to(cutting_speed, 'mm/min'):,.0f} mm/min")
print(f"0.5 inch = {to(q(0.5, 'inch'), 'mm')} mm,  2.2 lb = {to(q(2.2, 'lb'), 'kg'):.3f} kg")
try:
    to(spindle, "mm")
except ValueError as error:
    print("ValueError:", error)
```

```output
cutting speed: 188.5 m/min  = 188,496 mm/min
0.5 inch = 12.7 mm,  2.2 lb = 0.998 kg
ValueError: cannot express {'T': -1} in mm
```

The cutting speed of a rotating tool is its circumference times its rotation rate, π × D × n. Multiplying a length by a rate (T⁻¹) gives a speed automatically.

The cutter's edge moves at 188.5 m/min, which `to` can also express in mm/min. Conversions between same-dimension units just work, and asking for a rotation rate in millimetres is refused. Real libraries such as `pint` (not in the browser here) do exactly this, with thousands of units. The idea is small, as this lesson shows; the payoff is large.

## Checking formulas by their dimensions

::: math
\[ T = 2\pi\sqrt{\frac{L}{g}}, \qquad \left[\sqrt{\frac{L}{g}}\right] = \sqrt{\frac{\mathrm{L}}{\mathrm{L}\,\mathrm{T}^{-2}}} = \mathrm{T} \]
- $L$: pendulum length; $g$: gravitational acceleration ($\mathrm{L}\mathrm{T}^{-2}$)
- a valid formula has the same dimension on both sides of every equals sign
In code: a square root halves every exponent: `{b: p / 2 for b, p in dims.items()}`
:::


Dimensions also check **formulas** before any numbers are involved. A formula is dimensionally consistent only if both sides have the same exponents, and every term added together has the same exponents. This catches typos and misremembered formulas. Is a pendulum's period √(L/g) or √(g/L)? Only one is a time. Predict before running: which candidate formula for a pendulum's period has the dimension of time?

```python type
g = Quantity(9.81, acceleration)
L = q(0.75, "m")
for name, expr in [("sqrt(L / g)", (L / g)), ("sqrt(g / L)", (g / L)), ("L * g", L * g)]:
    root = Quantity(math.sqrt(expr.value), {b: p / 2 for b, p in expr.dims.items()}) if "sqrt" in name else expr
    verdict = "is a time" if root.dims == TIME else "is not a time"
    print(f"{name:<12} -> {root}  {verdict}")
print("period of a 0.75 m pendulum: 2π sqrt(L/g) =", round(2 * math.pi * math.sqrt(L.value / g.value), 3), "s")
```

```output
sqrt(L / g)  -> 0.276501 [T]  is a time
sqrt(g / L)  -> 3.61663 [T^-1]  is not a time
L * g        -> 7.3575 [L^2 T^-2]  is not a time
period of a 0.75 m pendulum: 2π sqrt(L/g) = 1.737 s
```

A square root halves every exponent, which is why the comprehension divides each power by 2.

Only √(L/g) is a time, so the period must be built from it; the 2π comes from a full derivation, which dimensions cannot supply. Dimensional analysis tells you **which** combinations are possible, often up to a constant, and a later lesson uses it to discover relationships from scratch.

::: challenge Unit conversion with checks [easy]
Write `convert(value, from_unit, to_unit)` using the lesson's `UNITS` table: return the value expressed in the new unit. Raise `KeyError` for a unit not in the table, and `ValueError` if the two units have different dimensions. Then add a unit to the table: `"ft"`, the foot, exactly 0.3048 m.

```python starter
def convert(value, from_unit, to_unit):
    return value

print(convert(2, "inch", "mm"))
```

```python solution
UNITS["ft"] = (0.3048, LENGTH)

def convert(value, from_unit, to_unit):
    f_factor, f_dims = UNITS[from_unit]
    t_factor, t_dims = UNITS[to_unit]
    if f_dims != t_dims:
        raise ValueError(f"cannot convert {from_unit} to {to_unit}: different dimensions")
    return value * f_factor / t_factor

print(convert(2, "inch", "mm"), convert(10, "ft", "m"))
```

```python test
import math as _math
assert "convert" in dir(), "Keep the function's name as convert."
assert _math.isclose(convert(2, "inch", "mm"), 50.8) and _math.isclose(convert(90, "min", "h"), 1.5), "Same-dimension conversions."
assert "ft" in UNITS and _math.isclose(convert(10, "ft", "m"), 3.048) and _math.isclose(convert(1, "ft", "inch"), 12), "The foot is 0.3048 m, so 12 inches."
assert _math.isclose(convert(3000, "rpm", "rpm"), 3000), "Converting to the same unit changes nothing."
for _a, _b in [("mm", "kg"), ("rpm", "s"), ("m/min", "m")]:
    try:
        convert(1, _a, _b)
        assert False, f"Converting {_a} to {_b} should raise ValueError."
    except ValueError:
        pass
try:
    convert(1, "furlong", "m")
    assert False, "An unknown unit should raise KeyError."
except KeyError:
    pass
"SUCCESS: Conversion goes through SI and back, and only between units that measure the same kind of thing."
```

Hint: Look both units up in `UNITS` (which raises `KeyError` by itself for an unknown name), compare their dimension dicts, and return `value * from_factor / to_factor`. Add the foot with `UNITS["ft"] = (0.3048, LENGTH)`.
:::

::: challenge Feeds and speeds [medium]
A milling cutter of diameter D (mm) spins at n rpm with z teeth, each tooth taking a chip of thickness f_z (mm per tooth). Write `milling(diameter_mm, rpm, teeth, chip_mm)` returning a dict with:

- `"cutting_speed_m_min"`: π × D × n, in metres per minute;
- `"feed_mm_min"`: the table feed, n × z × f_z, in millimetres per minute;
- `"feed_per_rev_mm"`: z × f_z, in millimetres per revolution.

Compute with the lesson's `q` and `to` functions, so the dimensions are checked, and round each value to 2 decimal places. Then write `spindle_speed(cutting_speed_m_min, diameter_mm)`, the rpm needed for a target cutting speed, rounded to the nearest whole rpm.

```python starter
def milling(diameter_mm, rpm, teeth, chip_mm):
    return {}

print(milling(50, 1200, 4, 0.08))
```

```python solution
def milling(diameter_mm, rpm, teeth, chip_mm):
    D, n = q(diameter_mm, "mm"), q(rpm, "rpm")
    cutting = math.pi * D * n
    feed = n * (teeth * q(chip_mm, "mm"))
    return {
        "cutting_speed_m_min": round(to(cutting, "m/min"), 2),
        "feed_mm_min": round(to(feed, "mm/min"), 2),
        "feed_per_rev_mm": round(teeth * chip_mm, 2),
    }

def spindle_speed(cutting_speed_m_min, diameter_mm):
    rate = q(cutting_speed_m_min, "m/min") / (math.pi * q(diameter_mm, "mm"))
    return round(to(rate, "rpm"))

print(milling(50, 1200, 4, 0.08), spindle_speed(180, 50))
```

```python test
for _n in ["milling", "spindle_speed"]:
    assert _n in dir(), f"Define {_n}."
_r = milling(50, 1200, 4, 0.08)
assert _r == {"cutting_speed_m_min": 188.5, "feed_mm_min": 384.0, "feed_per_rev_mm": 0.32}, f"Got {_r}."
assert milling(10, 8000, 2, 0.03) == {"cutting_speed_m_min": 251.33, "feed_mm_min": 480.0, "feed_per_rev_mm": 0.06}, f"Got {milling(10, 8000, 2, 0.03)}."
assert spindle_speed(180, 50) == 1146 and spindle_speed(250, 10) == 7958, f"Got {spindle_speed(180, 50)} and {spindle_speed(250, 10)}."
assert abs(milling(20, spindle_speed(200, 20), 3, 0.05)["cutting_speed_m_min"] - 200) < 0.1, "spindle_speed and milling should agree."
"SUCCESS: Feeds and speeds come out of dimension-checked arithmetic, so a mixed-up unit raises an error instead of breaking a cutter."
```

Hint: Build `q(diameter_mm, "mm")` and `q(rpm, "rpm")`; the cutting speed is `math.pi * D * n`, expressed with `to(..., "m/min")`. The feed rate is `n * (teeth * q(chip_mm, "mm"))`, a length times a rate. For the spindle speed, divide a speed by a length and express the result in `"rpm"`.
:::

::: challenge Reading compound units [hard]
Write `parse_unit(text)`, which reads a compound unit such as `"kg*m/s^2"`, `"N*m"` or `"mm/min"` and returns `(factor, dims)`: the factor to SI base units and the dimension dict. The grammar is simple: units joined by `*` or `/`, read left to right (everything after a `/` divides, until the next `*` or `/`), and each unit may have an integer power `^n` (possibly negative). Use the lesson's `UNITS` table, plus these derived units, which you should add to your own dictionary: `"N"` (newton, 1 kg·m/s²), `"J"` (joule, 1 N·m) and `"W"` (watt, 1 J/s). Then write `same_dimensions(a, b)`, which says whether two unit strings measure the same kind of quantity. Raise `KeyError` for an unknown unit and `ValueError` for malformed text (such as an empty part between operators).

```python starter
def parse_unit(text):
    return UNITS[text]

print(parse_unit("mm"))
```

```python solution
force_dims = combine(MASS, acceleration)
DERIVED = {"N": (1.0, force_dims), "J": (1.0, combine(force_dims, LENGTH)), "W": (1.0, combine(combine(force_dims, LENGTH), TIME, -1))}

def _lookup(name):
    if name in DERIVED:
        return DERIVED[name]
    return UNITS[name]

def parse_unit(text):
    factor, dims = 1.0, {}
    sign = 1
    token = ""
    def apply(token, sign):
        nonlocal factor, dims
        if not token:
            raise ValueError(f"malformed unit {text!r}")
        name, _, power = token.partition("^")
        p = int(power) if _ else 1
        f, d = _lookup(name)
        factor *= f ** (sign * p)
        dims = combine(dims, {b: e * p for b, e in d.items()}, sign)
    for ch in text.replace(" ", ""):
        if ch in "*/":
            apply(token, sign)
            sign = -1 if ch == "/" else 1
            token = ""
        else:
            token += ch
    apply(token, sign)
    return factor, dims

def same_dimensions(a, b):
    return parse_unit(a)[1] == parse_unit(b)[1]

print(parse_unit("kg*m/s^2"), same_dimensions("N*m", "J"), same_dimensions("W", "J/s"))
```

```python test
import math as _math
for _n in ["parse_unit", "same_dimensions"]:
    assert _n in dir(), f"Define {_n}."
_f, _d = parse_unit("kg*m/s^2")
assert _math.isclose(_f, 1) and _d == {"M": 1, "L": 1, "T": -2}, f"kg*m/s^2 is a force; got {(_f, _d)}."
_f, _d = parse_unit("mm/min")
assert _math.isclose(_f, 1e-3 / 60) and _d == {"L": 1, "T": -1}, f"mm/min is a speed; got {(_f, _d)}."
assert _math.isclose(parse_unit("mm^2")[0], 1e-6) and parse_unit("mm^2")[1] == {"L": 2}, "Powers apply to the factor and the dimension."
assert parse_unit("s^-1") [1] == {"T": -1} and _math.isclose(parse_unit("m/s/s")[0], 1), "Negative powers; repeated division."
assert same_dimensions("N*m", "J") and same_dimensions("W", "J/s") and same_dimensions("kg*m^2/s^2", "J"), "Derived units match their definitions."
assert not same_dimensions("N", "J") and same_dimensions("rpm", "s^-1"), "A force is not an energy; rpm is a rate."
assert _math.isclose(parse_unit("lb*inch")[0], 0.45359237 * 0.0254), "Non-SI units carry their factors."
for _bad in ["m//s", "*m", "kg*", "", "m^"]:
    try:
        parse_unit(_bad)
        assert False, f"{_bad!r} should raise ValueError."
    except ValueError:
        pass
try:
    parse_unit("parsec")
    assert False, "An unknown unit should raise KeyError."
except KeyError:
    pass
"SUCCESS: Compound units are parsed into a factor and exponents, so any two unit expressions can be compared or converted."
```

Hint: Walk the text one character at a time, collecting a unit name until you meet `*` or `/`. When a token ends, split off any `^power`, look it up (derived units first), raise its factor to `sign × power`, and add its exponents times the power with `combine(..., sign)`. A `/` makes the next token divide. An empty token means the text is malformed.
:::

## What you learned

- A physical quantity is a number times a unit; the unit carries meaning that arithmetic alone cannot check.
- Dimensions are exponents of base dimensions (L, M, T, ...). Multiplying adds exponents, dividing subtracts them, and only quantities with identical exponents can be added.
- A `Quantity` class with `__mul__`, `__truediv__` and `__add__` makes the computer enforce these rules, turning unit mistakes into immediate errors.
- Units are factors to SI with a dimension. Converting goes through SI, and only between units of the same dimension.
- Dimensional consistency checks formulas before any numbers are used, and shows which combinations of quantities are possible.

The next lesson works with ratios, rates and scaling: how quantities compare, and what happens to areas, volumes and masses when a design is scaled up.
