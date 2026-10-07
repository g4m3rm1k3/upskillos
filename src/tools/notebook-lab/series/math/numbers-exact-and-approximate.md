# Numbers, exact and approximate

A drawing says a shaft is 25.00 mm in diameter, give or take 0.02 mm. A gearbox has a ratio of exactly 37 : 12. The speed of light is exactly 299,792,458 m/s by definition, while the gravitational constant is known to only about five significant figures. Engineering and science run on numbers, but not all numbers are the same kind of thing: some are exact, some are measured, and some can only be stored approximately by a computer. Mistaking one kind for another is a classic source of bugs: a part rejected because 0.1 + 0.2 is not 0.3, a gear ratio that drifts after a long calculation, a bridge sum that loses the small loads beside the big ones.

This first lesson uses Python as a precise instrument for numbers. It is the foundation the whole series stands on: how much a computed number can be trusted.

This lesson covers:

- whole numbers, which Python stores exactly however large they get;
- floating-point numbers, which are approximations, and how to compare them safely;
- exact alternatives: fractions for ratios and decimals for money;
- rounding, significant figures and formatting results honestly;
- the limits of floating point: its precision, its range, and adding many numbers accurately.

## Whole numbers are exact

::: math
\[ a = q\,d + r, \qquad 0 \le r < d \]
- $q = \lfloor a / d \rfloor$: the whole-number quotient; $r$: the remainder
- $n! = n \times (n-1) \times \cdots \times 2 \times 1$
- integers are exact: every digit of $50!$ is correct
In code: `a // d` is $q$, `a % d` is $r$, and `a / d` is a float approximation of $a/d$
:::


Python's integers (`int`) have no size limit: they grow to as many digits as needed, and arithmetic on them is exact. That makes them right for anything you count: teeth on a gear, parts in a batch, steps in a simulation. Division is the one place to take care. `/` always gives a floating-point result, `//` gives the whole-number quotient (rounded down), and `%` gives the remainder. Predict before running: how many digits does 50! have, and how many full boxes of 48 do 1,000 bolts fill?

```python type
import math

print("2 ** 100 =", 2 ** 100)
print("50! has", len(str(math.factorial(50))), "digits")
bolts, per_box = 1000, 48
print(f"{bolts} bolts: {bolts // per_box} full boxes, {bolts % per_box} left over, {bolts / per_box} boxes as a float")
print("exact check:", (bolts // per_box) * per_box + bolts % per_box == bolts)
```

```output
2 ** 100 = 1267650600228229401496703205376
50! has 65 digits
1000 bolts: 20 full boxes, 40 left over, 20.833333333333332 boxes as a float
exact check: True
```

`math.factorial(50)` is 50 × 49 × ... × 1. `str(...)` turns a number into its digits so `len` can count them.

50! has 65 digits, every one of them correct. 1,000 bolts make 20 full boxes with 40 left over, and the check confirms that quotient times divisor plus remainder rebuilds the original exactly. `bolts / per_box` gives 20.833333333333332, a floating-point number, which is the subject of the next section.

## Floating point: close, not exact

::: math
\[ \text{fl}(x) = x\,(1 + \delta), \qquad |\delta| \le \varepsilon \approx 1.1 \times 10^{-16} \]
- $\text{fl}(x)$: the float actually stored for the real number $x$
- $\delta$: the relative rounding error, at most about $10^{-16}$
- so compare with a tolerance: $|a - b| \le \text{tol}$, never $a = b$
In code: `math.isclose(a, b)` or `abs(a - b) <= tol` instead of `a == b`
:::


Measurements and most calculations use **floating-point** numbers (`float`), which store about 15–17 significant decimal digits in binary. Many simple decimal fractions, such as 0.1, have no exact binary form, just as 1/3 has no exact decimal form, so they are stored as the nearest binary fraction. The difference is tiny, but it is there, and it can surface in a comparison. Predict before running: is `0.1 + 0.2 == 0.3`, and does adding a 0.1 mm shim ten times give exactly 1.0 mm?

```python type
from decimal import Decimal

print("0.1 + 0.2 =", 0.1 + 0.2, "| equal to 0.3?", 0.1 + 0.2 == 0.3)
print("the float 0.1 is really", Decimal(0.1))

stack = 0.0
for _ in range(10):
    stack += 0.1
print("ten 0.1 mm shims:", stack, "| equal to 1.0?", stack == 1.0)
print("close enough?", math.isclose(stack, 1.0), "| difference:", stack - 1.0)
```

```output
0.1 + 0.2 = 0.30000000000000004 | equal to 0.3? False
the float 0.1 is really 0.1000000000000000055511151231257827021181583404541015625
ten 0.1 mm shims: 0.9999999999999999 | equal to 1.0? False
close enough? True | difference: -1.1102230246251565e-16
```

`Decimal(0.1)` shows the exact value of the float that Python stores for 0.1: the closest binary fraction, which is slightly more than one tenth.

Neither comparison is true. The stored 0.1 is 0.1000000000000000055511151231257827..., and the tiny errors add up to a stack that is 1.1 × 10⁻¹⁶ mm short of 1.0. That is far below anything a machine could measure, but `==` sees it. The rule that follows is one of the most important in numerical work: **never compare floats with `==`; compare them with a tolerance**. `math.isclose(a, b)` does that, with a relative tolerance of 10⁻⁹ by default, and `abs(a - b) <= tol` does it with a tolerance you choose from the problem.

## Exact alternatives: fractions and decimals

::: math
\[ \left(\frac{37}{12}\right)^3 = \frac{37^3}{12^3} = \frac{50653}{1728} \]
- a fraction $p/q$ of whole numbers is stored exactly, so products and powers stay exact
- a decimal such as 0.10 is exact in base 10 but not in base 2
In code: `Fraction(37, 12) ** 3` stays exact; `Decimal("0.10")` keeps decimal digits exactly
:::


When a number is exact by nature, store it exactly. Python's standard library has two exact types:

- `fractions.Fraction` stores a ratio of two integers, always in lowest terms. It is ideal for gear trains, scale factors and probabilities, where values are ratios and must stay exact through many steps.
- `decimal.Decimal` stores decimal digits exactly, to a chosen precision. It is right for money and for any rule written in decimal ("round to the nearest cent").

Both are slower than floats, so use them where exactness matters, not everywhere. Predict before running: after three 37 : 12 gear stages, is the float result exactly the fraction's value?

```python type
from fractions import Fraction

stage = Fraction(37, 12)
total = stage ** 3
as_float = (37 / 12) ** 3
print("exact ratio:", total, "=", float(total))
print("float ratio:", as_float, "| same?", as_float == float(total))
print("input 1450 rpm -> output", 1450 / total, "rpm =", float(1450 / total))

prices = [Decimal("0.10"), Decimal("0.20")]
float_total = 0.10 + 0.20
print("decimal total:", sum(prices), "| float total:", float_total)
```

```output
exact ratio: 50653/1728 = 29.313078703703702
float ratio: 29.31307870370371 | same? False
input 1450 rpm -> output 2505600/50653 rpm = 49.46597437466685
decimal total: 0.30 | float total: 0.30000000000000004
```

`Fraction(37, 12)` is exactly thirty-seven twelfths. Raising it to the third power multiplies numerators and denominators exactly. `Decimal("0.10")` must be made from a **string**: `Decimal(0.10)` would capture the float's binary error.

The fraction keeps the ratio as exactly 50653/1728. The float version has already drifted in its last digits after only three multiplications (29.31307870370371 against the exact 29.313078703703702), and long chains drift further. The output speed is also an exact fraction, converted to a float only for display. The decimal prices add to exactly 0.30, while the floats give 0.30000000000000004: harmless in a measurement, and wrong on an invoice.

## Rounding and significant figures

::: math
\[ 2.675 \;\to\; \text{stored as } 2.67499999\ldots \;\to\; \text{rounds to } 2.67 \]
- round half to even: $2.5 \to 2$, $3.5 \to 4$, $0.125 \to 0.12$
- significant figures report a value only as precisely as it is known
In code: `round(x, 2)` rounds the stored value; `f"{x:.3g}"` shows 3 significant figures
:::


A result should be reported to the precision it deserves. A diameter measured with a 0.01 mm micrometer is not known to 15 digits, however many the computer prints. Python offers:

- `round(x, n)`, rounding to n decimal places. It rounds exact halves to the **even** neighbour ("banker's rounding"), so `round(2.5)` is 2, which avoids a bias when many values are rounded;
- format codes in f-strings: `:.3f` for 3 decimal places, `:.3g` for 3 significant figures, `:.3e` for scientific notation.

Predict before running: how does `round` treat 0.125 and 0.375 to two places?

```python type
print("round(2.5) =", round(2.5), " round(3.5) =", round(3.5))
print("round(0.125, 2) =", round(0.125, 2), " round(0.375, 2) =", round(0.375, 2))
print("round(2.675, 2) =", round(2.675, 2), " because 2.675 is stored as", Decimal(2.675))

G = 6.67430e-11
c = 299_792_458
for name, value in [("gravitational constant", G), ("speed of light", c), ("shaft diameter", 24.98376)]:
    print(f"{name:<23} {value:.3g}   {value:.4e}   {value:,.2f}")
```

```output
round(2.5) = 2  round(3.5) = 4
round(0.125, 2) = 0.12  round(0.375, 2) = 0.38
round(2.675, 2) = 2.67  because 2.675 is stored as 2.67499999999999982236431605997495353221893310546875
gravitational constant  6.67e-11   6.6743e-11   0.00
speed of light          3e+08   2.9979e+08   299,792,458.00
shaft diameter          25   2.4984e+01   24.98
```

Underscores in `299_792_458` are ignored by Python; they make long numbers readable. The last column shows why a fixed number of decimal places suits money but not science: the gravitational constant prints as 0.00. Use significant figures (`:.3g`) or scientific notation (`:.3e`) for quantities that may be very small or very large.

0.125 and 0.375 are exact in binary, so they are true halves, and both round to the even digit: 0.12 and 0.38. But 2.675 rounds down to 2.67, because the stored value is just below 2.675. Banker's rounding only applies to exact halves, and most decimal halves are not exact in binary. When rounding rules matter legally, as with money, use `Decimal` with an explicit rounding mode. For reporting, choose significant figures to match what was measured.

## The limits of floating point

::: math
\[ 10^{16} + 1 = 10^{16} \ \text{in floating point}, \qquad \varepsilon = 2^{-52} \approx 2.2 \times 10^{-16} \]
- absorption: adding $b$ to $a$ is lost when $|b| < \tfrac{\varepsilon}{2}|a|$
- a running total of $10^6$ steps of 0.1 accumulates many small rounding errors
In code: `math.fsum(values)` gives the correctly rounded total; `sys.float_info.epsilon` is $\varepsilon$
:::


Floats have three limits worth knowing:

- **Precision**: the gap between 1.0 and the next float is about 2.2 × 10⁻¹⁶ (`sys.float_info.epsilon`), so about 16 significant digits survive;
- **Range**: up to about 1.8 × 10³⁰⁸; beyond that, results **overflow** to `inf`, and below about 5 × 10⁻³²⁴ they **underflow** to 0;
- **Absorption**: adding a small number to a huge one can lose it entirely, because the sum has no digits left to store it.

Absorption matters when adding many values of different sizes, as in a load total or a long simulation. `math.fsum` adds floats while tracking the lost digits, giving the correctly rounded total. Predict before running: what does a simple running total make of a million 0.1 mm steps?

```python type
import sys

print("epsilon:", sys.float_info.epsilon, " largest float:", sys.float_info.max)
print("1e308 * 10 =", 1e308 * 10, "  1e-320 / 1e10 =", 1e-320 / 1e10)
print("1e16 + 1 - 1e16 =", 1e16 + 1 - 1e16)

steps = [0.1] * 1_000_000
running = 0.0
for step in steps:
    running += step
print("loop:", running, "  sum:", sum(steps), "  fsum:", math.fsum(steps))
```

```output
epsilon: 2.220446049250313e-16  largest float: 1.7976931348623157e+308
1e308 * 10 = inf   1e-320 / 1e10 = 0.0
1e16 + 1 - 1e16 = 0.0
loop: 100000.00000133288   sum: 100000.0   fsum: 100000.0
```

`1e16 + 1` cannot be stored: floats near 10¹⁶ are 2 apart, so the 1 vanishes, and subtracting 10¹⁶ again gives 0.0.

The running total of a million 0.1s is 100000.00000133288, correct to only 11 significant figures, because each addition rounds slightly and the errors pile up in one direction. `math.fsum` returns 100000.0, and so does the built-in `sum`: since Python 3.12, `sum` of floats carries the rounding errors forward itself (compensated summation). A hand-written `total += x` loop, the same loop in most other languages, and many library routines do not. The hard challenge builds the compensated method so you can see how it works.

::: challenge Within tolerance [easy]
A quality check accepts a measured dimension if it is within `tol` of the nominal size, **including** exactly at the limit. Write `within_tolerance(measured, nominal, tol)`. Because the inputs are floats, a dimension exactly at the limit can compute as a hair over it (10.3 − 10.0 is 0.3000000000000007), so allow an extra slack of `1e-9` when comparing. Then write `inspect(measurements, nominal, tol)`, returning a list of `"pass"` or `"FAIL"`, one per measurement.

```python starter
def within_tolerance(measured, nominal, tol):
    return measured - nominal <= tol

print(within_tolerance(10.3, 10.0, 0.3))
```

```python solution
def within_tolerance(measured, nominal, tol):
    return abs(measured - nominal) <= tol + 1e-9

def inspect(measurements, nominal, tol):
    return ["pass" if within_tolerance(m, nominal, tol) else "FAIL" for m in measurements]

print(within_tolerance(10.3, 10.0, 0.3), inspect([24.98, 25.03, 25.0], 25.0, 0.02))
```

```python test
for _n in ["within_tolerance", "inspect"]:
    assert _n in dir(), f"Define {_n}."
assert within_tolerance(10.3, 10.0, 0.3) and within_tolerance(9.7, 10.0, 0.3), "Exactly at either limit passes, even though 10.3 - 10.0 computes as slightly over 0.3."
assert not within_tolerance(10.31, 10.0, 0.3) and not within_tolerance(9.69, 10.0, 0.3), "Beyond either limit fails: use the absolute difference."
assert within_tolerance(25.0, 25.0, 0.0) and not within_tolerance(25.001, 25.0, 0.0), "A zero tolerance still accepts an exact match."
assert inspect([24.98, 25.03, 25.0, 25.02], 25.0, 0.02) == ["pass", "FAIL", "pass", "pass"], f"Got {inspect([24.98, 25.03, 25.0, 25.02], 25.0, 0.02)}."
assert inspect([], 5, 1) == [], "No measurements, no results."
"SUCCESS: Comparisons with a tolerance, plus a tiny slack for floating-point error, accept every part exactly at the limit and reject everything beyond it."
```

Hint: Use `abs(measured - nominal)` so both directions count, and compare it with `tol + 1e-9`. `inspect` can be a list comprehension calling `within_tolerance`.
:::

::: challenge Exact gear trains [medium]
A gear train is a list of stages, each a pair `(driver_teeth, driven_teeth)`. Each stage divides the speed by `driven / driver`. Write `train_ratio(stages)`, returning the overall ratio (input speed ÷ output speed) as an exact `Fraction`, and `output_speed(input_rpm, stages)`, returning the output speed as a `Fraction`. An empty train has ratio 1. Raise `ValueError` if any tooth count is not an `int` greater than 0 (so `12.0` and `"37"` raise too). Do not use floats anywhere.

```python starter
from fractions import Fraction

def train_ratio(stages):
    ratio = 1.0
    for driver, driven in stages:
        ratio *= driven / driver
    return ratio

print(train_ratio([(12, 37), (12, 37), (12, 37)]))
```

```python solution
from fractions import Fraction

def train_ratio(stages):
    ratio = Fraction(1)
    for driver, driven in stages:
        for teeth in (driver, driven):
            if not isinstance(teeth, int) or teeth <= 0:
                raise ValueError(f"tooth counts must be positive whole numbers, not {teeth!r}")
        ratio *= Fraction(driven, driver)
    return ratio

def output_speed(input_rpm, stages):
    return Fraction(input_rpm) / train_ratio(stages)

print(train_ratio([(12, 37), (12, 37), (12, 37)]), output_speed(1450, [(12, 37)]))
```

```python test
from fractions import Fraction as _F
for _n in ["train_ratio", "output_speed"]:
    assert _n in dir(), f"Define {_n}."
_r = train_ratio([(12, 37), (12, 37), (12, 37)])
assert isinstance(_r, _F) and _r == _F(50653, 1728), f"Three 12:37 stages give exactly 50653/1728; got {_r!r}."
assert train_ratio([]) == 1 and isinstance(train_ratio([]), _F), "An empty train has ratio 1, as a Fraction."
assert train_ratio([(20, 60), (15, 45)]) == 9, "60/20 × 45/15 = 9 exactly."
_s = output_speed(1450, [(12, 37)])
assert isinstance(_s, _F) and _s == _F(17400, 37), f"1450 rpm through 37/12 gives exactly 17400/37 rpm; got {_s!r}."
_long = [(17, 23), (23, 17)] * 50
assert train_ratio(_long) == 1, "A hundred stages that cancel must give exactly 1, which floats would not guarantee."
for _bad in [[(0, 10)], [(10, -5)], [(12.0, 37)], [(12, "37")]]:
    try:
        train_ratio(_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Fractions keep the gear ratio exact through any number of stages, so the speeds you compute are the speeds the gears will really give."
```

Hint: Start from `Fraction(1)` and multiply by `Fraction(driven, driver)` for each stage, checking each tooth count first with `isinstance(teeth, int)` and `teeth > 0`. The output speed is `Fraction(input_rpm) / train_ratio(stages)`.
:::

::: challenge Adding many measurements accurately [hard]
Write `compensated_sum(values)`, which adds a list of floats more accurately than a plain `total += x` loop by carrying the rounding error forward. This is the **Neumaier** variant of Kahan summation. Keep a running `total` and a running `compensation`, both starting at 0.0. For each value `x`, compute `t = total + x`. If `abs(total) >= abs(x)`, the low digits of `x` were lost, and they are `(total - t) + x`. Otherwise the low digits of `total` were lost, and they are `(x - t) + total`. Add the lost part to `compensation`, then set `total = t`. Return `total + compensation`. Do not use `math.fsum` or `sum`. The test compares your result with `math.fsum`, which is correctly rounded.

```python starter
def compensated_sum(values):
    total = 0.0
    for x in values:
        total += x
    return total

print(compensated_sum([0.1] * 10))
```

```python solution
def compensated_sum(values):
    total = 0.0
    compensation = 0.0
    for x in values:
        t = total + x
        if abs(total) >= abs(x):
            compensation += (total - t) + x
        else:
            compensation += (x - t) + total
        total = t
    return total + compensation

print(compensated_sum([0.1] * 10), compensated_sum([1e16, 1.0, -1e16]))
```

```python test
import ast as _ast, math as _math, random as _random
assert "compensated_sum" in dir(), "Keep the function's name as compensated_sum."
_calls = {_n.func.id if isinstance(_n.func, _ast.Name) else getattr(_n.func, "attr", "") for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.Call)}
assert not ({"fsum", "sum"} & _calls), "Write the summation yourself: no sum or math.fsum."
assert compensated_sum([0.1] * 10) == 1.0, "Ten 0.1s should come to exactly 1.0."
assert compensated_sum([1e16, 1.0, -1e16]) == 1.0, "The 1 that plain addition loses is recovered."
assert compensated_sum([]) == 0.0 and compensated_sum([2.5]) == 2.5, "Empty and single-value lists."
assert compensated_sum([0.1] * 1_000_000) == _math.fsum([0.1] * 1_000_000), "A million 0.1s should match math.fsum exactly."
_rng = _random.Random(1)
for _ in range(200):
    _vals = [_rng.uniform(-1, 1) * 10 ** _rng.randint(-8, 12) for _ in range(_rng.randint(1, 60))]
    _want = _math.fsum(_vals)
    _got = compensated_sum(_vals)
    _plain = 0.0
    for _v in _vals:
        _plain += _v
    _naive_err = abs(_plain - _want)
    assert abs(_got - _want) <= max(_naive_err, abs(_want) * 1e-15, 1e-300), f"For mixed magnitudes the compensated sum should be at least as accurate as a plain loop; error {abs(_got - _want):.3e} vs {_naive_err:.3e}."
"SUCCESS: Carrying each addition's rounding error forward recovers the digits a plain sum throws away, matching math.fsum on these sums."
```

Hint: Inside the loop, `t = total + x`; the branch on `abs(total) >= abs(x)` decides which operand's low digits fell off, and the expression in each branch recovers exactly those digits. Accumulate them in `compensation`, and return `total + compensation` at the end.
:::

## What you learned

- Python integers are exact at any size; use `//` and `%` for whole-number division and remainders.
- Floats are binary approximations with about 16 significant digits. Many decimal fractions are not stored exactly, so never compare floats with `==`; use `math.isclose` or a tolerance chosen from the problem.
- `Fraction` keeps ratios exact and `Decimal` keeps decimal digits exact; build decimals from strings. Use them where exactness matters.
- Report results to the precision they deserve, with `round` or format codes like `:.3g`. `round` sends exact halves to the even neighbour, but most decimal "halves" are not exact in binary.
- Floats have a precision limit (epsilon), a range (overflow and underflow) and absorption. Compensated summation, or `math.fsum`, adds many values accurately.

The next lesson attaches units to numbers, and shows how a unit checker catches mistakes that no amount of numerical precision can.
