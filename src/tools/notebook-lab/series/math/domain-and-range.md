# Functions: domain, range and mapping

A temperature input on a controller turns an ADC count into degrees. Feed it a count of 1 and a naive formula happily reports −90 °C, when the real meaning is "the sensor wire has broken". Every function has inputs it can meaningfully accept, its **domain**, and outputs it can actually produce, its **range**. Code that ignores either produces confident nonsense. This lesson makes these ideas precise. It covers domains read from a formula and ranges found over an interval, functions as mappings between sets (including finite tables), the properties that decide whether a function can be undone, and a complete sensor input chain whose valid domain is designed deliberately.

This lesson covers:

- the natural domain of a formula, and what NumPy does outside it;
- the range (image) of a function over an interval;
- functions as mappings between finite sets: image and preimage;
- one-to-one, onto and invertible functions, and information loss;
- a thermistor input with a deliberately restricted domain.

## The natural domain

::: math
\[ f(x) = \frac{\sqrt{x - 2}}{x - 5}: \;\; \operatorname{dom} f = \{x : x \ge 2,\; x \ne 5\} = [2, 5) \cup (5, \infty), \qquad g(x) = \ln(9 - x^2): \;\; \operatorname{dom} g = (-3, 3) \]
- the **domain** is the set of inputs for which the formula is defined: square roots need a non-negative argument, logarithms a positive one, and denominators must not be zero
- outside the domain, `math` raises an error, while NumPy returns `nan` or `inf`
In code: `f_defined` tests `x >= 2` and `x != 5`; `math.sqrt` raising `ValueError`; NumPy producing `nan`
:::

A function is a rule that assigns to each input exactly one output. A formula comes with a **natural domain**: the inputs for which every operation in it makes sense. Square roots of negative numbers, logarithms of non-positive numbers and division by zero are the usual exclusions. The domain is found by writing each restriction as an inequality and combining them, the interval reasoning of the inequalities lesson.

Python reports a violation in two different ways. The `math` module raises an exception immediately. NumPy, built to process whole arrays, returns `nan` ("not a number") or `inf` and carries on. That is convenient for arrays but dangerous, because the nonsense flows silently into later results.

Predict before running: what happens to √(x − 2)/(x − 5) at x = 1, 5 and 6 in `math` and in NumPy?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def f_defined(x):
    return x >= 2 and x != 5

for x in [1.0, 5.0, 6.0]:
    try:
        value = math.sqrt(x - 2) / (x - 5)
    except (ValueError, ZeroDivisionError) as err:
        value = f"{type(err).__name__}: {err}"
    with np.errstate(all="ignore"):
        numpy_value = np.sqrt(np.float64(x) - 2) / (np.float64(x) - 5)
    print(f"x = {x}: in domain {f_defined(x)};  math gives {value};  NumPy gives {numpy_value}")
xs = np.linspace(-4, 4, 9)
with np.errstate(all="ignore"):
    print("ln(9 - x²) on", xs, "->", np.round(np.log(9 - xs ** 2), 3))
```

```output
x = 1.0: in domain False;  math gives ValueError: math domain error;  NumPy gives nan
x = 5.0: in domain False;  math gives ZeroDivisionError: float division by zero;  NumPy gives inf
x = 6.0: in domain True;  math gives 2.0;  NumPy gives 2.0
ln(9 - x²) on [-4. -3. -2. -1.  0.  1.  2.  3.  4.] -> [  nan  -inf 1.609 2.079 2.197 2.079 1.609  -inf   nan]
```

At x = 1 `math` raises "math domain error" while NumPy returns `nan`. At x = 5 `math` raises a `ZeroDivisionError` while NumPy returns `inf`. At x = 6 both give 2.0. For ln(9 − x²), NumPy fills the inputs outside (−3, 3) with `nan` and gives −∞ at exactly ±3. The safe habit is to check the domain explicitly at the boundary of your code, where data come in, and reject or flag bad inputs there. Don't let `nan`s spread silently.

## The range over an interval

::: math
\[ f([a, b]) = \{\, f(x) : a \le x \le b \,\} = \Big[\min_{[a,b]} f,\; \max_{[a,b]} f\Big] \quad \text{for continuous } f \]
- the **range** (or image) is the set of outputs actually produced; the **codomain** is the set they are declared to lie in
- a continuous function on a closed interval attains a minimum and a maximum, and every value between them (the extreme and intermediate value theorems)
- the extremes occur at the ends of the interval, where $f' = 0$, or where $f'$ does not exist (a corner)
In code: dense sampling of $x^2$ on $[-1, 3]$ and of a thermistor's resistance over −40 to 125 °C
:::

The **range** of a function over a set of inputs is the set of outputs it produces. For a continuous function on a closed interval the range is itself a closed interval, from the minimum to the maximum. Those extremes sit at an end, at a stationary point (the optimisation lessons' f′ = 0), or at a corner where f′ does not exist, like the bottom of |x|. So x² on [−1, 3] has range [0, 9], with the minimum 0 at the stationary point inside the interval, not at an end. That is exactly the tight interval power of the inequalities lesson.

Sensors are specified this way. A 10 kΩ NTC thermistor's resistance follows the beta model R(T) = R₀ e^(B(1/T − 1/T₀)), with T in kelvin, R₀ = 10 kΩ at T₀ = 298.15 K (25 °C), and B = 3950 K. Over its rated −40 to 125 °C the range of resistances is what the input circuit must handle.

Predict before running: what range of resistances does the thermistor produce from −40 °C to 125 °C?

```python type
xs = np.linspace(-1, 3, 4001)
print(f"x² on [-1, 3]: range [{(xs ** 2).min()}, {(xs ** 2).max()}]")

R0, T0, B = 10e3, 298.15, 3950.0

def thermistor_R(t_c):
    return R0 * np.exp(B * (1 / (t_c + 273.15) - 1 / T0))

temps = np.linspace(-40, 125, 1651)
Rs = thermistor_R(temps)
print(f"thermistor over -40..125 °C: R from {Rs.min():,.0f} Ω (at {temps[np.argmin(Rs)]:.0f} °C) to {Rs.max():,.0f} Ω (at {temps[np.argmax(Rs)]:.0f} °C)")
print(f"ratio of largest to smallest: {Rs.max() / Rs.min():,.0f}")
```

```output
x² on [-1, 3]: range [0.0, 9.0]
thermistor over -40..125 °C: R from 359 Ω (at 125 °C) to 401,860 Ω (at -40 °C)
ratio of largest to smallest: 1,120
```

x² on [−1, 3] has range [0, 9], with 0 coming from inside the interval. The thermistor's resistance falls from about 401,900 Ω at −40 °C to 359 Ω at 125 °C, a range of more than 1,000 to 1. The extremes are at the ends because the function is monotonic. An input circuit and ADC must turn that huge range into useful counts, which the last section designs.

## Functions between finite sets

::: math
\[ f: A \to B, \qquad f(S) = \{ f(a) : a \in S \}, \qquad f^{-1}(T) = \{ a \in A : f(a) \in T \} \]
- $A$: the domain; $B$: the codomain; $f(S)$: the **image** of a subset $S \subseteq A$; $f^{-1}(T)$: the **preimage** of $T \subseteq B$
- the preimage is defined for every function, invertible or not: it is the set of inputs that land in $T$
In code: a dictionary from fault codes to subsystems; `image_of` and `preimage_of` as set comprehensions
:::

Functions need not involve formulas or numbers. A machine's fault-code table assigns each code to a subsystem: a function from the finite set of codes to the set of subsystems. A Python dictionary is exactly such a function. Its keys are the domain, its values lie in the codomain, and each key has exactly one value. Two operations go with any function:

- the **image** of a set of inputs is the set of outputs they produce;
- the **preimage** of a set of outputs is the set of inputs that produce one of them.

The preimage answers questions like "which fault codes point to the hydraulics?". It exists for every function, even when several inputs share an output, and does not need an inverse.

Predict before running: what is the image of the codes {E1, E2, E5}, and which codes point to the spindle?

```python type
faults = {"E1": "spindle", "E2": "coolant", "E3": "spindle", "E4": "axes", "E5": "coolant", "E6": "hydraulics", "E7": "spindle"}
subsystems = {"spindle", "coolant", "axes", "hydraulics", "electrical"}

def image_of(f, S):
    return {f[a] for a in S}

def preimage_of(f, T):
    return {a for a in f if f[a] in T}

print("image of {E1, E2, E5}:", sorted(image_of(faults, {"E1", "E2", "E5"})))
print("preimage of {spindle}:", sorted(preimage_of(faults, {"spindle"})))
print("range of the whole table:", sorted(image_of(faults, faults)), " codomain:", sorted(subsystems))
print("preimage of {electrical}:", preimage_of(faults, {"electrical"}), " (empty: no code points there)")
```

```output
image of {E1, E2, E5}: ['coolant', 'spindle']
preimage of {spindle}: ['E1', 'E3', 'E7']
range of the whole table: ['axes', 'coolant', 'hydraulics', 'spindle']  codomain: ['axes', 'coolant', 'electrical', 'hydraulics', 'spindle']
preimage of {electrical}: set()  (empty: no code points there)
```

The image of {E1, E2, E5} is {coolant, spindle}: three inputs, two outputs, because E2 and E5 share one. The spindle's preimage is {E1, E3, E7}. The range of the whole table misses "electrical", which is in the codomain but is never produced. The difference between range and codomain is real: here it might mean the table is missing codes for electrical faults.

## One-to-one, onto, invertible

::: math
\[ \text{injective: } f(a_1) = f(a_2) \Rightarrow a_1 = a_2, \qquad \text{surjective: } f(A) = B, \qquad \text{bijective} = \text{both} \;\Longleftrightarrow\; f^{-1}: B \to A \text{ exists} \]
- injective (one-to-one): no two inputs share an output, so the output determines the input
- surjective (onto): every element of the codomain is produced
- a strictly increasing or decreasing function on an interval is injective, so it can be inverted on its range
In code: `is_injective` compares the number of keys with the number of distinct values; a monotonicity test with `np.diff`
:::

A function can be undone exactly when no two inputs share an output. That property is **injectivity**, or "one-to-one". The fault table is not injective: knowing that the fault is in the spindle does not tell you which code fired. If every element of the codomain is also hit, the function is **surjective** ("onto"). A function that is both is a **bijection**, and only bijections have inverses defined on the whole codomain. An injective function that is not surjective can still be inverted on its range, which is usually what engineering needs.

For functions of a real variable, a quick sufficient test is **strict monotonicity**: if f always increases (or always decreases), no two inputs can share an output. The thermistor's resistance strictly decreases with temperature, so a resistance identifies the temperature. A speed sensor that measures |v| is not injective on velocities: +3 m/s and −3 m/s give the same reading, and the direction is lost for good. An ADC is not injective either: thousands of slightly different voltages round to the same count.

Predict before running: which of the fault table, the thermistor curve, |v| and a 12-bit ADC can be inverted?

```python type
def is_injective(f):
    return len(set(f.values())) == len(f)

print("fault table injective?", is_injective(faults), "  onto the subsystems?", image_of(faults, faults) == subsystems)
print("thermistor strictly decreasing?", bool(np.all(np.diff(Rs) < 0)))
v = np.linspace(-5, 5, 11)
print("|v| strictly monotone?", bool(np.all(np.diff(np.abs(v)) > 0) or np.all(np.diff(np.abs(v)) < 0)), "  |3| = |-3|:", abs(3) == abs(-3))
volts = np.linspace(0, 3.3, 1_000_001)
counts = np.round(volts / 3.3 * 4095).astype(int)
print(f"ADC: {volts.size:,} different voltages give only {np.unique(counts).size} different counts; one count covers about {3.3 / 4095 * 1000:.2f} mV")
```

```output
fault table injective? False   onto the subsystems? False
thermistor strictly decreasing? True
|v| strictly monotone? False   |3| = |-3|: True
ADC: 1,000,001 different voltages give only 4096 different counts; one count covers about 0.81 mV
```

The fault table has neither property: the fault table repeats subsystems (not injective) and never produces "electrical" (not onto). The thermistor's resistance is strictly decreasing, so it can be inverted, the basis of every thermistor thermometer. |v| is not monotone and loses the sign. The ADC maps a million voltages onto 4,096 counts, each covering about 0.81 mV: a deliberate, bounded loss of information called **quantisation**. Its "inverse" can only return the centre of each count's voltage band.

## A sensor input with a designed domain

::: math
\[ V = V_{cc}\,\frac{R_f}{R(T) + R_f}, \qquad n = \operatorname{round}\Big(4095\,\frac{V}{V_{cc}}\Big), \qquad R = R_f\Big(\frac{4095}{n} - 1\Big), \qquad T = \Big(\frac{1}{T_0} + \frac{1}{B}\ln\frac{R}{R_0}\Big)^{-1} \]
- the thermistor sits above a fixed $R_f = 10$ kΩ in a divider; the ADC count $n$ is ratiometric (independent of $V_{cc}$)
- the conversion is defined for $1 \le n \le 4094$, but only counts produced by real temperatures, $n(-40\ °\text{C})$ to $n(125\ °\text{C})$, are valid; others mean a fault
In code: `adc_count(t)` and `adc_temperature(n)`, the valid window, and the resolution per count across the range
:::

The input chain is a composition of functions. Temperature goes to resistance, resistance to divider voltage, voltage to ADC count. The firmware runs it backwards: count to resistance, resistance to temperature. Each step is strictly monotonic, so the whole chain is invertible on its range. But the inverse formula accepts counts that no real temperature produces. An open-circuit thermistor leaves the input pulled to 0 counts; a shorted thermistor gives nearly full scale. Plugging those into the formula yields temperatures like −90 °C or +500 °C, which a controller might act on.

The fix is to design the domain of the conversion function deliberately. Allow only counts inside the window that −40 to 125 °C can produce, and treat anything else as a sensor fault. The resolution also varies across the range, because the chain is far from linear: the change in temperature per count is the derivative of the inverse.

Predict before running: which counts do −40 °C and 125 °C produce, what does the raw formula say for counts of 1 and 4094, and where is the input most precise?

```python type
Rf = 10e3

def adc_count(t_c):
    R = thermistor_R(t_c)
    return int(np.round(4095 * Rf / (R + Rf)))

def adc_temperature(n):
    R = Rf * (4095 / n - 1)
    return 1 / (1 / T0 + math.log(R / R0) / B) - 273.15

lo, hi = adc_count(-40), adc_count(125)
print(f"valid count window: {lo} (-40 °C) to {hi} (125 °C)")
for n in [1, 50, lo, 2048, hi, 4094]:
    status = "valid" if lo <= n <= hi else "FAULT"
    print(f"count {n:>4}: formula says {adc_temperature(n):8.2f} °C  -> {status}")
for n in [lo, 2048, 3700, hi]:
    print(f"near {adc_temperature(n):6.1f} °C one count is {adc_temperature(n + 1) - adc_temperature(n):.3f} °C")
```

```output
valid count window: 99 (-40 °C) to 3953 (125 °C)
count    1: formula says   -89.99 °C  -> FAULT
count   50: formula says   -49.25 °C  -> FAULT
count   99: formula says   -40.06 °C  -> valid
count 2048: formula says    25.01 °C  -> valid
count 3953: formula says   124.96 °C  -> valid
count 4094: formula says   527.89 °C  -> FAULT
near  -40.1 °C one count is 0.142 °C
near   25.0 °C one count is 0.022 °C
near   85.6 °C one count is 0.091 °C
near  125.0 °C one count is 0.294 °C
```

−40 °C gives a count of 99 and 125 °C gives 3953. A count of 1 would read −90 °C and 4094 would read +528 °C, both impossible for this sensor, so they are flagged as faults. Even 50 counts, −49 °C, lies outside the rated range. Inside the window the precision varies more than tenfold: about 0.022 °C per count at 25 °C, 0.09 °C at 85 °C and 0.29 °C at 125 °C (and 0.14 °C at the cold end). Industrial current loops use the same idea with their "live zero": under NAMUR NE43 a 4–20 mA signal saturates at 3.8 and 20.5 mA, and a current at or below 3.6 mA or at or above 21 mA signals a fault, not a measurement.

::: challenge Domains and ranges [easy]
Write `in_domain(x)`: True (a plain bool) if h(x) = ln(9 − x²) + 1/(x − 1) is defined at the real number x. Write `h(x)`: h(x) as a plain float, raising `ValueError` if x is outside the domain. Then write `sampled_range(f, a, b, n=100001)`: estimate the range of f over [a, b] by evaluating f at n equally spaced points (both ends included), returning `(min, max)` as plain floats; f takes a NumPy array. Raise `ValueError` if a > b or n < 2.

```python starter
import math
import numpy as np

def in_domain(x):
    return True

def h(x):
    return 0.0

def sampled_range(f, a, b, n=100001):
    return (0.0, 0.0)

print(in_domain(2.0), sampled_range(lambda x: x ** 2, -1, 3))
```

```python solution
import math
import numpy as np

def in_domain(x):
    return bool(-3 < x < 3 and x != 1)

def h(x):
    if not in_domain(x):
        raise ValueError("x is outside the domain of h")
    return float(math.log(9 - x * x) + 1 / (x - 1))

def sampled_range(f, a, b, n=100001):
    if a > b or n < 2:
        raise ValueError("need a <= b and n >= 2")
    ys = np.asarray(f(np.linspace(a, b, n)), dtype=float)
    return float(ys.min()), float(ys.max())

print(in_domain(2.0), sampled_range(lambda x: x ** 2, -1, 3))
```

```python test
import math
import numpy as np
for _n in ["in_domain", "h", "sampled_range"]:
    assert _n in dir(), f"Define {_n}."
assert in_domain(0.0) is True and in_domain(2.0) is True and in_domain(-2.9) is True, "Inside (-3, 3) and not 1."
assert in_domain(1.0) is False and in_domain(3.0) is False and in_domain(-3.0) is False and in_domain(4.5) is False, "1 divides by zero; ±3 and beyond break the logarithm."
assert abs(h(2.0) - (math.log(5) + 1)) < 1e-12 and type(h(0.0)) is float, "h(2) = ln 5 + 1; plain floats."
for _bad in [1.0, 3.0, -5.0]:
    try:
        h(_bad)
        assert False, f"h({_bad}) should raise ValueError."
    except ValueError:
        pass
_r = sampled_range(lambda x: x ** 2, -1, 3)
assert _r == (0.0, 9.0) and all(type(_v) is float for _v in _r), f"x² on [-1, 3] gives (0, 9); got {_r}."
_s = sampled_range(np.sin, 0, math.pi)
assert abs(_s[0]) < 1e-12 and abs(_s[1] - 1.0) < 1e-9, "sin on [0, π]: (0, 1), the maximum inside."
assert sampled_range(lambda x: 3 * x + 1, 2, 2, n=5) == (7.0, 7.0), "A single point."
for _bad in [(lambda x: x, 3, 2), (lambda x: x, 0, 1, 1)]:
    try:
        sampled_range(*_bad)
        assert False, "Bad interval or n should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The domain collects every restriction in a formula, and over an interval a continuous function's range runs from its minimum to its maximum."
```

Hint: ln(9 − x²) needs 9 − x² > 0, so −3 < x < 3; 1/(x − 1) needs x ≠ 1. For the range, evaluate f on `np.linspace(a, b, n)` and take the min and max.
:::

::: challenge Finite functions [medium]
A finite function is a dictionary. Write `image(f, S)`: the set of values f takes on the keys in S; raise `KeyError` if S contains a key not in f. Write `preimage(f, T)`: the set of keys whose value is in T. Write `classify(f, codomain)`: a dictionary `{"injective": ..., "surjective": ...}` of plain bools, where surjective means every element of `codomain` is a value of f; raise `ValueError` if some value of f is not in `codomain`. Finally write `inverse(f)`: the inverse dictionary (value → key); raise `ValueError` if f is not injective.

```python starter
def image(f, S):
    return set()

def preimage(f, T):
    return set()

def classify(f, codomain):
    return {"injective": False, "surjective": False}

def inverse(f):
    return {}

f = {"a": 1, "b": 2, "c": 1}
print(image(f, {"a", "c"}), preimage(f, {1}))
```

```python solution
def image(f, S):
    return {f[a] for a in S}

def preimage(f, T):
    return {a for a, v in f.items() if v in T}

def classify(f, codomain):
    values = set(f.values())
    if not values <= set(codomain):
        raise ValueError("f has values outside the codomain")
    return {"injective": len(values) == len(f), "surjective": values == set(codomain)}

def inverse(f):
    if len(set(f.values())) != len(f):
        raise ValueError("f is not injective, so it has no inverse")
    return {v: k for k, v in f.items()}

f = {"a": 1, "b": 2, "c": 1}
print(image(f, {"a", "c"}), preimage(f, {1}))
```

```python test
for _n in ["image", "preimage", "classify", "inverse"]:
    assert _n in dir(), f"Define {_n}."
_faults = {"E1": "spindle", "E2": "coolant", "E3": "spindle", "E4": "axes", "E5": "coolant", "E6": "hydraulics", "E7": "spindle"}
_subs = {"spindle", "coolant", "axes", "hydraulics", "electrical"}
assert image(_faults, {"E1", "E2", "E5"}) == {"spindle", "coolant"} and image(_faults, set()) == set(), "Images."
try:
    image(_faults, {"E9"})
    assert False, "An unknown key should raise KeyError."
except KeyError:
    pass
assert preimage(_faults, {"spindle"}) == {"E1", "E3", "E7"} and preimage(_faults, {"electrical"}) == set(), "Preimages, possibly empty."
assert preimage(_faults, {"axes", "hydraulics"}) == {"E4", "E6"}, "Preimage of a set of outputs."
assert classify(_faults, _subs) == {"injective": False, "surjective": False}, "The fault table is neither."
_ok = classify({1: "x", 2: "y", 3: "z"}, ["x", "y", "z"])
assert _ok == {"injective": True, "surjective": True} and all(type(_v) is bool for _v in _ok.values()), "A bijection; plain bools."
assert classify({1: "x", 2: "y"}, {"x", "y", "z"}) == {"injective": True, "surjective": False}, "One-to-one but not onto."
try:
    classify({1: "x", 2: "q"}, {"x", "y"})
    assert False, "A value outside the codomain should raise ValueError."
except ValueError:
    pass
assert inverse({"low": 0, "mid": 1, "high": 2}) == {0: "low", 1: "mid", 2: "high"} and inverse({}) == {}, "Inverting a bijection."
try:
    inverse(_faults)
    assert False, "A non-injective function has no inverse: ValueError."
except ValueError:
    pass
"SUCCESS: Image and preimage work for any function; only one-to-one functions can be turned around."
```

Hint: Use set comprehensions for the image and preimage. A finite function is injective when it has as many distinct values as keys, and surjective onto a codomain when its set of values equals the codomain.
:::

::: challenge A thermistor input [hard]
The thermistor follows R(T) = R₀ e^(B(1/T − 1/T₀)) (T in kelvin, R₀ = 10,000 Ω, T₀ = 298.15 K, B = 3950 K) and sits above a fixed 10 kΩ resistor in a divider read by a 12-bit ratiometric ADC: n = round(4095 × R_f/(R + R_f)). Write `count_for(t_c)`: the count (a plain int) for a temperature in °C. Write `valid_window(t_min=-40.0, t_max=125.0)`: the tuple `(n_min, n_max)` of counts for those temperatures. Write `read_temperature(n, t_min=-40.0, t_max=125.0)`: the temperature in °C (plain float) from R = R_f(4095/n − 1) and T = 1/(1/T₀ + ln(R/R₀)/B) − 273.15; raise `ValueError` (a sensor fault) if n is not an int or is outside the valid window. Finally write `resolution(n)`: the temperature step between counts n and n + 1, read_temperature(n + 1) − read_temperature(n), using the default window.

```python starter
import math

def count_for(t_c):
    return 0

def valid_window(t_min=-40.0, t_max=125.0):
    return (0, 4095)

def read_temperature(n, t_min=-40.0, t_max=125.0):
    return 0.0

def resolution(n):
    return 0.0

print(valid_window(), read_temperature(2048))
```

```python solution
import math

_R0, _T0, _B, _RF = 10e3, 298.15, 3950.0, 10e3

def count_for(t_c):
    R = _R0 * math.exp(_B * (1 / (t_c + 273.15) - 1 / _T0))
    return int(round(4095 * _RF / (R + _RF)))

def valid_window(t_min=-40.0, t_max=125.0):
    return count_for(t_min), count_for(t_max)

def read_temperature(n, t_min=-40.0, t_max=125.0):
    lo, hi = valid_window(t_min, t_max)
    if not isinstance(n, int) or isinstance(n, bool) or not lo <= n <= hi:
        raise ValueError(f"count {n} is outside the valid window {lo}..{hi}: sensor fault")
    R = _RF * (4095 / n - 1)
    return float(1 / (1 / _T0 + math.log(R / _R0) / _B) - 273.15)

def resolution(n):
    return read_temperature(n + 1) - read_temperature(n)

print(valid_window(), read_temperature(2048))
```

```python test
import math
for _n in ["count_for", "valid_window", "read_temperature", "resolution"]:
    assert _n in dir(), f"Define {_n}."
assert count_for(25.0) == 2048 and type(count_for(25.0)) is int, "At 25 °C R = R_f, half scale: 2048."
assert valid_window() == (99, 3953), f"-40 to 125 °C gives counts 99 to 3953; got {valid_window()}."
assert valid_window(0, 50) == (939, 3014), "A narrower window."
_t = read_temperature(2048)
assert type(_t) is float and abs(_t - 25.011) < 1e-3, f"Count 2048 reads about 25.01 °C; got {_t}."
for _c in [100, 1000, 3000, 3900]:
    assert abs(count_for(read_temperature(_c)) - _c) <= 1, f"Round trip at count {_c}."
for _bad in [1, 50, 98, 3954, 4094, 2048.0]:
    try:
        read_temperature(_bad)
        assert False, f"read_temperature({_bad!r}) should raise ValueError: outside the window or not an int."
    except ValueError:
        pass
assert abs(read_temperature(98, t_min=-45.0) - read_temperature(99, t_min=-45.0)) > 0, "A wider window accepts lower counts."
_r25, _r125 = resolution(2048), resolution(3952)
assert abs(_r25 - 0.022) < 0.002 and abs(_r125 - 0.29) < 0.03, f"About 0.022 °C per count at 25 °C and 0.29 °C near 125 °C; got {_r25:.4f}, {_r125:.4f}."
"SUCCESS: The conversion is invertible on its range, and restricting its domain to that range turns impossible counts into fault reports."
```

Hint: Compose the chain forwards for `count_for` and backwards for `read_temperature`. The window comes from `count_for` at the two limits; check `isinstance(n, int)` and the window before computing.
:::

## What you learned

- A formula's natural domain collects all its restrictions (square roots, logarithms, denominators); `math` raises errors outside it, NumPy returns `nan` or `inf`, so check inputs where they enter your code.
- The range of a continuous function on a closed interval runs from its minimum to its maximum, found at the ends or at stationary points.
- Any function, including a dictionary, has images of input sets and preimages of output sets; the range can be smaller than the codomain.
- Injective functions can be undone; strictly monotone functions are injective; |v| and ADC quantisation are not, and lose information for good.
- A real input chain is a composition of invertible steps, and its conversion function should accept only the counts real inputs can produce, reporting the rest as faults.

The next lesson builds functions out of other functions: chains of sensors and conversions, and the inverses that calibration needs.
