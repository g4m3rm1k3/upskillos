# Powers and orders of magnitude

A machined bore is held to a few micrometres, 10⁻⁶ m. The factory it sits in is a few hundred metres long, 10² m. The Earth's mass is about 6 × 10²⁴ kg, and an electron's 9 × 10⁻³¹ kg. Quantities in science and engineering span more than fifty powers of ten, and the only sane way to write, compare and estimate them is with **powers**. This lesson makes powers a working tool: the rules that combine them, scientific and engineering notation, and estimating the size of an answer before computing it, the habit that catches the bad computations a calculator happily produces.

This lesson covers:

- integer, negative and fractional powers, and roots;
- scientific notation, SI prefixes and engineering notation;
- orders of magnitude: comparing quantities by their power of ten;
- estimating answers with Fermi problems.

## The rules of powers

::: math
\[ x^a x^b = x^{a+b}, \qquad (x^a)^b = x^{ab}, \qquad x^0 = 1, \quad x^{-n} = \frac{1}{x^n}, \quad x^{1/n} = \sqrt[n]{x} \]
- every rule follows from the first: exponents add when powers multiply
- a fractional power of a negative number has no real value in general, so Python returns a complex number
In code: `x ** a`; `math.cbrt(x)` gives the real cube root
:::


xⁿ means n copies of x multiplied together. Three rules follow, and every other rule comes from them:

- xᵃ · xᵇ = xᵃ⁺ᵇ (multiplying adds the exponents);
- (xᵃ)ᵇ = xᵃᵇ (a power of a power multiplies them);
- (xy)ᵃ = xᵃyᵃ.

Keeping the first rule true for every exponent forces the meaning of the others. x⁰ must be 1, because x⁰ · xᵃ = xᵃ. x⁻ⁿ must be 1/xⁿ, because x⁻ⁿ · xⁿ = x⁰ = 1. And x^(1/n) must be the n-th root, because (x^(1/n))ⁿ = x¹. So the square root of x is x^0.5 and a cube root is x^(1/3). Predict before running: what is the cube root of −27 in Python, and why?

```python type
import math

print("2**10 =", 2 ** 10, "  2**-3 =", 2 ** -3, "  5**0 =", 5 ** 0)
print("rule check 3**4 * 3**5 == 3**9:", 3 ** 4 * 3 ** 5 == 3 ** 9, "  (2**3)**4 == 2**12:", (2 ** 3) ** 4 == 2 ** 12)
print("square root of 2:", 2 ** 0.5, "=", math.sqrt(2))
print("cube root of 1000:", 1000 ** (1 / 3), "  rounding error:", 1000 ** (1 / 3) - 10)
print("(-27) ** (1/3) =", (-27) ** (1 / 3))
print("math.cbrt(-27) =", math.cbrt(-27))
```

```output
2**10 = 1024   2**-3 = 0.125   5**0 = 1
rule check 3**4 * 3**5 == 3**9: True   (2**3)**4 == 2**12: True
square root of 2: 1.4142135623730951 = 1.4142135623730951
cube root of 1000: 9.999999999999998   rounding error: -1.7763568394002505e-15
(-27) ** (1/3) = (1.5000000000000004+2.598076211353316j)
math.cbrt(-27) = -3.0
```

`math.cbrt` (Python 3.11 and later) computes the real cube root directly.

`1000 ** (1/3)` gives 9.999999999999998, not 10: 1/3 is not exact in binary, so the power is very slightly off. `(-27) ** (1/3)` gives a **complex** number, about 1.5 + 2.6j, because for a fractional power of a negative number Python returns the principal complex root. A later lesson explains the complex roots. For the real cube root, use `math.cbrt`. Fractional powers of negative numbers are a common source of surprises in formulas.

## Scientific and engineering notation

::: math
\[ x = m \times 10^{e}, \qquad 1 \le |m| < 10 \;\;(\text{scientific}), \qquad e \in \{\ldots, -3, 0, 3, 6, \ldots\} \;\;(\text{engineering}) \]
- $e = \lfloor \log_{10} |x| \rfloor$ for scientific notation
- for engineering notation round $e$ down to a multiple of 3, to match the SI prefixes
In code: `3 * math.floor(math.log10(abs(value)) / 3)` is the engineering exponent
:::


**Scientific notation** writes a number as a mantissa between 1 and 10 times a power of ten: 0.0000124 m is 1.24 × 10⁻⁵ m. **Engineering notation** restricts the power to multiples of 3, matching the SI prefixes, so the same length reads 12.4 × 10⁻⁶ m, which is 12.4 µm. That is why engineers say "12 microns", not "1.24 × 10⁻⁵ metres".

The SI prefixes step by factors of 1,000: kilo (k, 10³), mega (M, 10⁶), giga (G, 10⁹), and milli (m, 10⁻³), micro (µ, 10⁻⁶), nano (n, 10⁻⁹). Predict before running: how are a bore tolerance and a motor's power shown in each notation?

```python type
PREFIXES = {-12: "p", -9: "n", -6: "µ", -3: "m", 0: "", 3: "k", 6: "M", 9: "G", 12: "T"}

def engineering(value, unit):
    if value == 0:
        return f"0 {unit}"
    exponent = 3 * math.floor(math.log10(abs(value)) / 3)
    exponent = max(-12, min(12, exponent))
    return f"{value / 10 ** exponent:.3g} {PREFIXES[exponent]}{unit}"

for value, unit in [(0.0000124, "m"), (7_500, "W"), (2.2e9, "Hz"), (0.047, "s"), (6e15, "J")]:
    print(f"{value:<12g} scientific {value:.2e}   engineering {engineering(value, unit)}")
```

```output
1.24e-05     scientific 1.24e-05   engineering 12.4 µm
7500         scientific 7.50e+03   engineering 7.5 kW
2.2e+09      scientific 2.20e+09   engineering 2.2 GHz
0.047        scientific 4.70e-02   engineering 47 ms
6e+15        scientific 6.00e+15   engineering 6e+03 TJ
```

`math.log10(x)` is the power of ten that gives x, so its floor is the exponent in scientific notation. Rounding it down to a multiple of 3 gives the engineering exponent.

12.4 µm, 7.5 kW, 2.2 GHz and 47 ms are all instantly readable. SI has prefixes up to quetta (10³⁰), but this table stops at tera (10¹²), so the function caps the exponent and shows 6 × 10¹⁵ J as 6e+03 TJ: correct, but no longer easy to read. Engineering notation is for everyday measurement ranges; scientific notation covers everything.

## Orders of magnitude

::: math
\[ \text{order}(x) = \lfloor \log_{10} x \rfloor, \qquad \frac{a}{b} \approx 10^{n} \;\Rightarrow\; n \text{ orders of magnitude apart} \]
- $\lfloor \cdot \rfloor$: round down to a whole number
- $5 \times 10^{-6}$ m has order $-6$; 300 m has order 2
In code: `math.floor(math.log10(abs(x)))`
:::


The **order of magnitude** of a positive number is its power of ten, the floor of log₁₀ of it: 340 has order 2, 0.004 has order −3. Two quantities differ by n orders of magnitude when their ratio is about 10ⁿ. Thinking in orders of magnitude answers questions like "does this matter?": a 1 µm thermal expansion in a 10 m frame is a ratio of 10⁻⁷, irrelevant for a building and decisive for a precision stage. It is also how to read a log-scale chart. Predict before running: how many orders of magnitude separate a micrometre tolerance from the length of a factory?

```python type
def order(x):
    return math.floor(math.log10(abs(x)))

scales = {"atom": 1e-10, "machining tolerance": 5e-6, "bolt": 0.03, "machine": 2.5, "factory": 300, "Earth's radius": 6.371e6}
for name, metres in scales.items():
    print(f"{name:<20} {metres:>10.3g} m   order {order(metres):>3}")
print("factory / tolerance spans", order(scales["factory"]) - order(scales["machining tolerance"]), "orders of magnitude")
```

```output
atom                      1e-10 m   order -10
machining tolerance       5e-06 m   order  -6
bolt                       0.03 m   order  -2
machine                     2.5 m   order   0
factory                     300 m   order   2
Earth's radius         6.37e+06 m   order   6
factory / tolerance spans 8 orders of magnitude
```

From a 5 µm tolerance (order −6) to a 300 m factory (order 2) is 8 orders of magnitude, and from an atom to the Earth is 16. A single plot with a linear axis cannot show such ranges; a logarithmic one can, as the logarithms lesson shows.

## Estimating before computing

::: math
\[ \text{estimate} = \prod_i f_i, \qquad \text{middle of } [a, b] \text{ on a log scale} = \sqrt{a\,b} \]
- $f_i$: the guessable factors; their errors partly cancel in the product
- the geometric mean $\sqrt{ab}$ is halfway between $a$ and $b$ in orders of magnitude
In code: `math.sqrt(low * high)` for each range, then multiply the factors
:::


A **Fermi estimate**, named after the physicist Enrico Fermi, gets an answer to within an order of magnitude by breaking a question into factors you can guess, then multiplying them. It is the best defence against a computation that is wrong by a factor of 1,000 because of a units slip: if the estimate says "about 10⁴" and the computer says 10⁷, something is wrong.

Errors in the factors tend to partly cancel, some too high and some too low, so the product is usually much closer than the worst case in which every error points the same way. When you can only bound a factor, between a low and a high guess, the **geometric mean** √(low × high) is the natural middle on a multiplicative scale: halfway between 10 and 1,000 in orders of magnitude is 100, not 505. Predict before running: about how many bolts are there in all the cars in a country of 60 million people?

```python type
def geometric_mean(low, high):
    return math.sqrt(low * high)

people = 60e6
cars_per_person = geometric_mean(0.3, 0.7)
bolts_per_car = geometric_mean(1_000, 5_000)
estimate = people * cars_per_person * bolts_per_car
print(f"cars per person ~ {cars_per_person:.2f}, bolts per car ~ {bolts_per_car:,.0f}")
print(f"bolts in all the cars ~ {estimate:.1e} (order {order(estimate)})")
print("arithmetic middle of 10 and 1000:", (10 + 1000) / 2, "  geometric middle:", geometric_mean(10, 1000))
```

```output
cars per person ~ 0.46, bolts per car ~ 2,236
bolts in all the cars ~ 6.1e+10 (order 10)
arithmetic middle of 10 and 1000: 505.0   geometric middle: 100.0
```

Each factor is a range turned into one number by its geometric mean.

The estimate is about 6 × 10¹⁰ bolts: tens of billions. The individual guesses could each be out by a factor of two, but the answer is very likely within a factor of three or so of the truth, which is enough to decide whether a bolt recall is a big problem. The habit matters more than this answer: before trusting any computed number, ask what order of magnitude it should be.

::: challenge Engineering notation with prefixes [easy]
Write `si_format(value, unit, digits=3)` that formats a number in engineering notation with an SI prefix, using `digits` significant figures, for example `si_format(0.0000124, "m")` gives `"12.4 µm"` and `si_format(7500, "W")` gives `"7.5 kW"`. Use the prefixes from pico (10⁻¹²) to tera (10¹²) in the lesson's `PREFIXES` table. Values outside that range use the nearest end (so 3e15 W is `"3e+03 TW"`). Negative values keep their sign. Zero gives `f"0 {unit}"`. A subtle case: rounding can push a mantissa up to 1000 (999.96 µm at 3 digits rounds to 1000 µm), which must be shown as `"1 mm"` instead.

```python starter
def si_format(value, unit, digits=3):
    return f"{value} {unit}"

print(si_format(0.0000124, "m"))
```

```python solution
def si_format(value, unit, digits=3):
    if value == 0:
        return f"0 {unit}"
    exponent = 3 * math.floor(math.log10(abs(value)) / 3)
    exponent = max(-12, min(12, exponent))
    mantissa = float(f"{value / 10 ** exponent:.{digits}g}")
    if abs(mantissa) >= 1000 and exponent < 12:
        exponent += 3
        mantissa = float(f"{value / 10 ** exponent:.{digits}g}")
    return f"{mantissa:.{digits}g} {PREFIXES[exponent]}{unit}"

print(si_format(0.0000124, "m"), si_format(7500, "W"), si_format(0.00099996, "m"))
```

```python test
assert "si_format" in dir(), "Keep the function's name as si_format."
assert si_format(0.0000124, "m") == "12.4 µm" and si_format(7500, "W") == "7.5 kW", f"The examples; got {si_format(0.0000124, 'm')!r} and {si_format(7500, 'W')!r} (reuse the lesson's PREFIXES table for the µ sign)."
assert si_format(2.2e9, "Hz") == "2.2 GHz" and si_format(0.047, "s") == "47 ms" and si_format(1, "V") == "1 V", "Other prefixes and no prefix."
assert si_format(-0.0032, "A") == "-3.2 mA", "Negative values keep their sign."
assert si_format(0, "N") == "0 N", "Zero."
assert si_format(0.00099996, "m") == "1 mm", f"Rounding to 1000 µm should become 1 mm; got {si_format(0.00099996, 'm')!r}."
assert si_format(999.96, "Hz") == "1 kHz" and si_format(123456, "Pa", digits=4) == "123.5 kPa", "Rounding and the digits setting."
assert si_format(3e15, "W") == "3e+03 TW" and si_format(4e-14, "F") == "0.04 pF", "Beyond the table, use the nearest prefix."
"SUCCESS: Exponents in steps of three, the matching prefix, and a check for mantissas that round up to 1000: numbers read the way engineers say them."
```

Hint: The exponent is `3 * floor(log10(|value|) / 3)`, clamped to −12 to 12. Round the mantissa to `digits` significant figures with a `:.{digits}g` format; if it reaches 1000 (and the exponent can still go up), move to the next prefix and round again.
:::

::: challenge A Fermi estimator [medium]
A Fermi estimate multiplies factors, some known exactly and some given only as ranges. Write `fermi(factors)`, where `factors` is a list of either single numbers (exact) or `(low, high)` tuples (ranges). Return a tuple `(estimate, low_bound, high_bound)`: the estimate multiplies the numbers and the **geometric means** of the ranges; the bounds multiply all the lows and all the highs. Round each to 3 significant figures (`float(f"{x:.3g}")`). Raise `ValueError` for a range with low > high or any value that is not positive. Then write `orders_apart(a, b)`, the number of orders of magnitude between two positive numbers, `log10(b / a)`, rounded to 1 decimal place.

```python starter
def fermi(factors):
    return (1, 1, 1)

print(fermi([60e6, (0.3, 0.7), (1000, 5000)]))
```

```python solution
def fermi(factors):
    estimate = low = high = 1.0
    for f in factors:
        lo, hi = f if isinstance(f, tuple) else (f, f)
        if lo <= 0 or hi <= 0 or lo > hi:
            raise ValueError(f"bad factor {f!r}")
        estimate *= math.sqrt(lo * hi)
        low *= lo
        high *= hi
    sig = lambda x: float(f"{x:.3g}")
    return sig(estimate), sig(low), sig(high)

def orders_apart(a, b):
    return round(math.log10(b / a), 1)

print(fermi([60e6, (0.3, 0.7), (1000, 5000)]), orders_apart(5e-6, 300))
```

```python test
for _n in ["fermi", "orders_apart"]:
    assert _n in dir(), f"Define {_n}."
assert fermi([60e6, (0.3, 0.7), (1000, 5000)]) == (6.15e10, 1.8e10, 2.1e11), f"Got {fermi([60e6, (0.3, 0.7), (1000, 5000)])}."
assert fermi([2, 3, 4]) == (24.0, 24.0, 24.0), "Exact factors only: estimate and bounds agree."
assert fermi([(10, 1000)]) == (100.0, 10.0, 1000.0), "A range's estimate is its geometric mean."
assert fermi([]) == (1.0, 1.0, 1.0), "No factors: an empty product is 1."
for _bad in [[(5, 2)], [0], [(-1, 3)], [-4]]:
    try:
        fermi(_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
assert orders_apart(5e-6, 300) == 7.8 and orders_apart(100, 1) == -2.0 and orders_apart(3, 3) == 0.0, "log10(b / a), rounded."
"SUCCESS: Ranges become geometric means for the estimate, and their ends give bounds, so a Fermi estimate comes with an honest spread."
```

Hint: Treat a plain number `f` as the range `(f, f)`. Multiply the geometric means `sqrt(lo * hi)` for the estimate, and the lows and highs for the bounds, checking each range as you go.
:::

::: challenge Exact integer roots [hard]
Floating-point roots fail for huge numbers: `(10**50) ** 0.5` is a float with only about 16 correct digits, and `(10**400) ** 0.5` raises `OverflowError`. Write `iroot(n, k)`, returning the largest **integer** r with rᵏ ≤ n, for any non-negative integer n (however large) and positive integer k, using only integer arithmetic. Use binary search on r: keep a low guess whose k-th power is at most n and a high guess whose power is above it, and halve the gap until they meet. Start the high guess at `2 ** (n.bit_length() // k + 1)`: starting higher wastes many halvings, and the test is timed. Then write `is_perfect_power(n, k)`, whether n is exactly some integer to the k-th power. Raise `ValueError` if n or k is not an `int`, n is negative or k is not positive.

```python starter
def iroot(n, k):
    return int(n ** (1 / k))

print(iroot(10 ** 50, 2))
```

```python solution
def iroot(n, k):
    if not isinstance(n, int) or not isinstance(k, int) or n < 0 or k <= 0:
        raise ValueError("n must be a non-negative integer and k a positive integer")
    if n < 2:
        return n
    low, high = 0, 2 ** (n.bit_length() // k + 1)
    while high - low > 1:
        mid = (low + high) // 2
        if mid ** k <= n:
            low = mid
        else:
            high = mid
    return low

def is_perfect_power(n, k):
    r = iroot(n, k)
    return r ** k == n

print(iroot(10 ** 50, 2), iroot(10 ** 400, 2) == 10 ** 200, is_perfect_power(3 ** 99, 3))
```

```python test
import random as _random, time as _time
for _n in ["iroot", "is_perfect_power"]:
    assert _n in dir(), f"Define {_n}."
assert iroot(10 ** 50, 2) == 10 ** 25 and iroot(10 ** 400, 2) == 10 ** 200, "Exact square roots of huge powers of ten."
assert iroot(26, 3) == 2 and iroot(27, 3) == 3 and iroot(28, 3) == 3, "The largest r with r³ ≤ n."
assert iroot(0, 5) == 0 and iroot(1, 7) == 1 and iroot(15, 1) == 15, "Small cases."
_rng = _random.Random(5)
for _ in range(300):
    _k = _rng.randint(1, 9)
    _n = _rng.randint(0, 10 ** _rng.randint(1, 120))
    _r = iroot(_n, _k)
    assert _r ** _k <= _n < (_r + 1) ** _k, f"iroot({_n}, {_k}) = {_r} is not the floor of the root."
_big = 12345678901234567890 ** 7
assert iroot(_big, 7) == 12345678901234567890 and is_perfect_power(_big, 7) and not is_perfect_power(_big + 1, 7), "Perfect powers are recognised exactly."
for _bad in [(-1, 2), (10, 0), (10, -2), (2.5, 2)]:
    try:
        iroot(*_bad)
        assert False, f"iroot{_bad} should raise ValueError."
    except ValueError:
        pass
_start = _time.perf_counter(); iroot(7 ** 1500, 3); _el = _time.perf_counter() - _start
assert _el < 2, f"A 1,300-digit number took {_el:.1f} s: binary search needs only about bit_length / k halvings."
"SUCCESS: Binary search on whole numbers finds exact roots of numbers far beyond floating point, in a few thousand steps at most."
```

Hint: Check the inputs first; 0 and 1 are their own roots. Keep `low` with `low ** k <= n` and `high` with `high ** k > n`; while they differ by more than 1, test the midpoint and move one end. The starting `high` works because a number with b bits has a k-th root of at most about b / k bits.
:::

## What you learned

- Exponent rules (xᵃxᵇ = xᵃ⁺ᵇ, (xᵃ)ᵇ = xᵃᵇ) force x⁰ = 1, x⁻ⁿ = 1/xⁿ and x^(1/n) = the n-th root. Fractional powers of negative numbers give complex results in Python; use `math.cbrt` for real cube roots.
- Scientific notation uses a mantissa from 1 to 10; engineering notation uses exponents in multiples of 3 to match SI prefixes (k, M, G, m, µ, n).
- The order of magnitude is the floor of log₁₀. Thinking in orders of magnitude tells you whether an effect matters.
- Fermi estimates multiply guessable factors; ranges combine by geometric mean. Estimate first, so a computation off by powers of ten is caught.
- Floats cannot hold huge integers exactly; integer algorithms such as binary search give exact roots of any size.

The next lesson turns formulas into Python functions: named, reusable, testable pieces of engineering knowledge.
