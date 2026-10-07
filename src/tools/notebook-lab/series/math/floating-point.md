# How computers store numbers

The first lesson of the series met the symptoms: 0.1 + 0.2 is not 0.3, and 10¹⁶ + 1 is 10¹⁶. This lesson explains the machinery that causes them. A floating-point number is a binary fraction with a fixed number of bits, scaled by a power of two: scientific notation in base 2. Once you can read the 64 bits of a double, every quirk follows. Decimals like 0.1 have no exact binary form. The gaps between floats grow with their size, so integers stop being exact at 2⁵³. Rounding a "half" can go down. And a clock counting tenths of a second in single precision drifts by many seconds within hours.

This lesson covers:

- binary fractions, and which decimals they can represent exactly;
- the IEEE 754 double: sign, exponent and fraction bits;
- the spacing between floats (the ulp), and the 2⁵³ limit for integers;
- correct rounding and round-half-to-even;
- single versus double precision, and a clock that drifts.

## Binary fractions

::: math
\[ 0.1_{10} = 0.0\overline{0011}_2 = \frac{1}{16} + \frac{1}{32} + \frac{1}{256} + \frac{1}{512} + \cdots, \qquad d_{i} = \lfloor 2 r_{i-1} \rfloor, \quad r_i = 2 r_{i-1} - d_i \]
- each binary digit after the point is worth half the one before: $\tfrac{1}{2}, \tfrac{1}{4}, \tfrac{1}{8}, \ldots$
- doubling the fraction and taking the whole part gives the next digit (long division in base 2)
- a fraction $p/q$ in lowest terms has a finite binary expansion only when $q$ is a power of 2
In code: `doubling_digits(p, q, n)` doubles the remainder and records each digit
:::

In decimal, the digits after the point are worth tenths, hundredths and so on. In binary they are worth halves, quarters, eighths. A computer's float is a binary number, so a fraction is exact only if it is a finite sum of such powers of ½. By the long-division argument of the fractions lesson, p/q terminates in base 2 exactly when q's only prime factor is 2. So 0.5, 0.25 and 0.375 are exact. But 0.1 = 1/10 has the factor 5 in its denominator, so its binary expansion repeats for ever: 0.000110011001100... Only 53 significant bits are kept, and the rest is rounded off. This is the single root of most floating-point surprises.

Predict before running: which of 0.5, 0.1, 0.375, 0.2 and 0.75 are stored exactly?

```python type
import math
import struct
from fractions import Fraction
from decimal import Decimal
import numpy as np

def doubling_digits(p, q, n):
    digits = ""
    for _ in range(n):
        p *= 2
        digits += str(p // q)
        p %= q
    return digits

print("0.1 in binary: 0." + doubling_digits(1, 10, 32) + "...")
for x, (p, q) in [(0.5, (1, 2)), (0.1, (1, 10)), (0.375, (3, 8)), (0.2, (1, 5)), (0.75, (3, 4))]:
    print(f"{x}: stored exactly? {Fraction(x) == Fraction(p, q)}   the float is {Decimal(x)}")
```

```output
0.1 in binary: 0.00011001100110011001100110011001...
0.5: stored exactly? True   the float is 0.5
0.1: stored exactly? False   the float is 0.1000000000000000055511151231257827021181583404541015625
0.375: stored exactly? True   the float is 0.375
0.2: stored exactly? False   the float is 0.200000000000000011102230246251565404236316680908203125
0.75: stored exactly? True   the float is 0.75
```

0.5, 0.375 and 0.75 have denominators 2, 8 and 4 and are stored exactly. 0.1 and 0.2 are not: the stored 0.1 is 0.1000000000000000055511..., slightly more than a tenth, and 0.2 likewise. `Fraction(x)` and `Decimal(x)` both reveal the exact value of the float, because every float is itself an exact binary fraction; it just may not be the number you typed.

## The 64 bits of a double

::: math
\[ x = (-1)^{s} \times \Big(1 + \frac{f}{2^{52}}\Big) \times 2^{\,e - 1023}, \qquad s \in \{0, 1\}, \quad 1 \le e \le 2046, \quad 0 \le f < 2^{52} \]
- $s$: sign bit; $e$: 11-bit biased exponent; $f$: 52-bit fraction (the leading 1 of the significand is implied, not stored)
- $e = 0$ holds zero and the **subnormal** numbers; $e = 2047$ holds infinity and NaN
In code: `struct.pack(">d", x)` gives the bytes; shifts and masks pull out `s`, `e` and `f`
:::

Python's `float` is the IEEE 754 **double precision** format, the same in essentially every language and processor. It is scientific notation in base 2. A sign, an **exponent** that picks a power of two, and a **significand** 1.f with 52 fraction bits, the binary digits after the point. Normal numbers always start "1.", so that 1 is not stored: 53 significant bits for the price of 52. The exponent is stored with a **bias** of 1023, so that the 11 bits can hold both negative and positive powers. The extreme exponent patterns are reserved for zero, the tiny subnormal numbers, infinity and "not a number".

Predict before running: what exponent does 0.1 have, and what is special about the bits of 2⁵³?

```python type
def fields(x):
    b = struct.unpack(">Q", struct.pack(">d", x))[0]
    return b >> 63, (b >> 52) & 0x7FF, b & ((1 << 52) - 1)

for x in [1.0, 0.1, -2.5, 2.0 ** 53, 1e-310]:
    s, e, f = fields(x)
    if 0 < e < 2047:
        rebuilt = (-1) ** s * (1 + Fraction(f, 2 ** 52)) * Fraction(2) ** (e - 1023)
        note = f"exponent {e - 1023:>4}, rebuilt exactly: {rebuilt == Fraction(x)}"
    else:
        note = "exponent field 0: a subnormal number"
    print(f"{x!r:>22}: sign {s}, exponent field {e:>4}, fraction 0x{f:013x}  ({note})")
```

```output
                   1.0: sign 0, exponent field 1023, fraction 0x0000000000000  (exponent    0, rebuilt exactly: True)
                   0.1: sign 0, exponent field 1019, fraction 0x999999999999a  (exponent   -4, rebuilt exactly: True)
                  -2.5: sign 1, exponent field 1024, fraction 0x4000000000000  (exponent    1, rebuilt exactly: True)
    9007199254740992.0: sign 0, exponent field 1076, fraction 0x0000000000000  (exponent   53, rebuilt exactly: True)
                1e-310: sign 0, exponent field    0, fraction 0x012688b70e62b  (exponent field 0: a subnormal number)
```

1.0 is (1 + 0) × 2⁰, with an exponent field of 1023 (the bias) and an empty fraction. 0.1 is 1.6 × 2⁻⁴: its fraction is the hexadecimal pattern 999...9a, the repeating binary 1001 cut off and rounded up at the end. −2.5 is −1.25 × 2¹: its fraction holds the single bit for .25, and it differs from 1.25 only in the sign bit and an exponent one higher. 2⁵³ has an empty fraction, as every power of two does. Rebuilding each value from its three fields with exact fractions gives the float back exactly. The tiny 10⁻³¹⁰ is below the smallest normal number, about 2.2 × 10⁻³⁰⁸. It is stored as a subnormal, with exponent field 0 and no implied leading 1, which lets numbers fade gradually towards zero instead of falling off a cliff.

## Gaps between floats

::: math
\[ \operatorname{ulp}(x) = 2^{\,E - 52} \quad\text{for } 2^{E} \le |x| < 2^{E+1}, \qquad \operatorname{ulp}(1) = 2^{-52} = \varepsilon \approx 2.2 \times 10^{-16}, \qquad 2^{53} + 1 \mapsto 2^{53} \]
- ulp ("unit in the last place"): the gap between $x$ and the next float; it doubles at every power of two
- relative spacing stays near $\varepsilon$, but absolute spacing grows with $|x|$
- every integer up to $2^{53} \approx 9.0 \times 10^{15}$ is exact; above that, odd integers are skipped
In code: `math.ulp(x)` for numbers from 1e-5 to 1e300; `float(2 ** 53 + 1)`
:::

Floats are not spread evenly. Between 1 and 2 there are 2⁵² of them, spaced 2⁻⁵² apart. Between 2 and 4 the same number of floats covers twice the range, so they are twice as far apart, and so on. The gap next to x, its **ulp**, is about x × 2.2 × 10⁻¹⁶. The relative precision is the same everywhere, but the absolute precision is not. Near 10¹⁶ the gap is 2, which is why 10¹⁶ + 1 vanished. Once the gap exceeds 1, at 2⁵³, floats can no longer represent every integer. This matters for large counters, timestamps in nanoseconds, and identifiers stored as floats (JavaScript's ordinary numbers, for example, are all doubles).

Predict before running: how big is the gap between neighbouring floats near 1000, near 10¹⁶ and near 10³⁰⁰?

```python type
for x in [1e-5, 1.0, 1000.0, 1e16, 2.0 ** 53, 1e300]:
    print(f"x = {x!r:<22} ulp = {math.ulp(x):.6g}   relative {math.ulp(x) / x:.2e}")
print("next float after 1.0:", math.nextafter(1.0, 2.0), "  before:", math.nextafter(1.0, 0.0))
print("2**53 + 1 as a float:", int(float(2 ** 53 + 1)), "  2**53:", 2 ** 53)
print("smallest normal:", np.finfo(float).tiny, "  smallest subnormal:", 5e-324, "  half of it:", 5e-324 / 2)
```

```output
x = 1e-05                  ulp = 1.69407e-21   relative 1.69e-16
x = 1.0                    ulp = 2.22045e-16   relative 2.22e-16
x = 1000.0                 ulp = 1.13687e-13   relative 1.14e-16
x = 1e+16                  ulp = 2   relative 2.00e-16
x = 9007199254740992.0     ulp = 2   relative 2.22e-16
x = 1e+300                 ulp = 1.48702e+284   relative 1.49e-16
next float after 1.0: 1.0000000000000002   before: 0.9999999999999999
2**53 + 1 as a float: 9007199254740992   2**53: 9007199254740992
smallest normal: 2.2250738585072014e-308   smallest subnormal: 5e-324   half of it: 0.0
```

The gap near 1000 is about 1.1 × 10⁻¹³, near 10¹⁶ it is exactly 2, and near 10³⁰⁰ it is about 1.5 × 10²⁸⁴. The relative spacing stays between 1.1 and 2.2 × 10⁻¹⁶ throughout. Below 1.0 the floats are twice as dense as above it, so the step down is half the step up. 2⁵³ + 1 rounds to 2⁵³. The smallest subnormal, 5 × 10⁻³²⁴, has nothing below it except zero: halving it underflows to 0.0.

## Correct rounding, and halves that go down

::: math
\[ \text{fl}(a \circ b) = \text{round}(a \circ b), \qquad \text{ties go to the neighbour with an even last digit}, \qquad 2.675 \mapsto 2.67499999999999982\ldots \]
- IEEE 754 requires $+$, $-$, $\times$, $\div$ and $\sqrt{\ }$ to return the float nearest the exact result
- round-half-to-even (banker's rounding) avoids a systematic upward bias when many halves are rounded
In code: the exact sum `Fraction(0.1) + Fraction(0.2)`, its distance to the two nearest floats, and divisions checked against exact fractions
:::

IEEE 754 makes one strong promise: each basic operation gives the float **nearest** to the exact mathematical result. Errors come from storing inputs and results, never from sloppy arithmetic. When the exact result lies exactly halfway between two floats, the rule is **round half to even**: pick the one whose last bit is 0. Python's `round` follows the same rule for decimal places, which surprises people who learned "round halves up". Over many values, always rounding halves up biases totals upwards, and rounding to even does not.

The first lesson showed the symptoms: round(2.5) is 2, and round(2.675, 2) is 2.67 because the float written 2.675 is really slightly below it. Now the cause of 0.1 + 0.2 can be checked exactly.

Predict before running: is the exact sum of the stored 0.1 and stored 0.2 closer to 0.3's float or to the float just above it?

```python type
exact_sum = Fraction(0.1) + Fraction(0.2)
below, above = Fraction(0.3), Fraction(math.nextafter(0.3, 1.0))
print("distance from the exact sum to 0.3's float:", exact_sum - below, "  to the next float up:", above - exact_sum)
print("last fraction bit: 0.3's float", fields(0.3)[2] & 1, "  next float up", fields(math.nextafter(0.3, 1.0))[2] & 1, "  result:", 0.1 + 0.2)
for a, b in [(1.0, 3.0), (2.0, 7.0), (0.7, 0.1), (1e10, 3.0)]:
    exact = Fraction(a) / Fraction(b)
    q = a / b
    print(f"{a} / {b}: within half an ulp of the exact quotient? {abs(Fraction(q) - exact) <= Fraction(math.ulp(q)) / 2}")
```

```output
distance from the exact sum to 0.3's float: 1/36028797018963968   to the next float up: 1/36028797018963968
last fraction bit: 0.3's float 1   next float up 0   result: 0.30000000000000004
1.0 / 3.0: within half an ulp of the exact quotient? True
2.0 / 7.0: within half an ulp of the exact quotient? True
0.7 / 0.1: within half an ulp of the exact quotient? True
10000000000.0 / 3.0: within half an ulp of the exact quotient? True
```

The exact sum of the stored 0.1 and 0.2 lies exactly halfway between 0.3's float and the next float up, 2⁻⁵⁵ from each. It is a tie, and round-half-to-even picks the neighbour whose last bit is 0, the one above, so 0.1 + 0.2 gives 0.30000000000000004. Nothing went wrong in the addition; the surprise was already in the inputs, and the tie rule decided the rest. Each division, checked against the exact quotient of its stored inputs, lands within half an ulp: correctly rounded, as the standard promises.

## Single precision and a drifting clock

::: math
\[ \varepsilon_{32} = 2^{-23} \approx 1.2 \times 10^{-7}, \qquad \varepsilon_{64} = 2^{-52} \approx 2.2 \times 10^{-16}, \qquad t_{k+1} = \text{fl}(t_k + 0.1) \]
- single precision (float32): 24 significant bits, about 7 decimal digits; double (float64): 53 bits, about 16 digits
- adding a small fixed tick to a growing total rounds every step, and the rounding errors do not average out
In code: 360,000 additions of `np.float32(0.1)` and of `np.float64(0.1)`; `np.spacing(np.float32(36000))`
:::

Graphics cards, sensors, embedded controllers and machine-learning models often use **single precision**, 32 bits with a 24-bit significand: half the memory and often twice the speed, but only about 7 significant digits. That is plenty for one measurement. It can be badly wrong for a quantity that accumulates. In 1991 a Patriot missile battery counted time as an integer number of tenths of a second, then multiplied the count by 0.1 stored in a 24-bit fixed-point register. The stored 0.1 was short by about 10⁻⁷; after about 100 hours, multiplied by 3.6 million ticks, that had grown to about 0.34 s, enough to miss an incoming missile. A float32 clock that adds 0.1 every tick goes wrong in a related way, and faster, because every addition is rounded.

Predict before running: a controller adds 0.1 s to a float32 clock every tick for 10 hours (360,000 ticks). How far off is it?

```python type
for dtype in [np.float32, np.float64]:
    clock = dtype(0)
    tick = dtype(0.1)
    for _ in range(360_000):
        clock = clock + tick
    print(f"{dtype.__name__}: clock reads {float(clock):.6f} s after 36,000 s, error {float(clock) - 36000:+.6g} s")
print("float32 spacing near 36,000:", np.spacing(np.float32(36000)), " epsilon:", np.finfo(np.float32).eps)
print("counting ticks as an integer instead:", 360_000 * Fraction(1, 10), "s exactly")
```

```output
float32: clock reads 35958.347656 s after 36,000 s, error -41.6523 s
float64: clock reads 36000.000000 s after 36,000 s, error -2.43374e-07 s
float32 spacing near 36,000: 0.00390625  epsilon: 1.1920929e-07
counting ticks as an integer instead: 36000 s exactly
```

The float32 clock reads 35,958.35 s: it has lost 41.65 seconds in 10 hours. Near 36,000 the gap between float32 values is about 0.004 s, so each 0.1 s tick is rounded to a multiple of that gap, and the rounding always goes the same way over long stretches. The float64 clock is off by only 2.4 × 10⁻⁷ s. The robust fix is not more bits but a better design: count ticks as an integer, and keep the tick length exact too (as `Fraction(1, 10)`, or by counting in whole milliseconds), converting to seconds only when a time is needed.

::: challenge Binary fractions [easy]
Write `binary_digits(p, q, n)`: the first n binary digits after the point of p/q (with 0 ≤ p < q and q > 0), as a string, computed by repeated doubling. Raise `ValueError` if not 0 ≤ p < q, or n < 0. Then write `exact_in_binary(p, q)`: True (a plain bool) when p/q (q > 0) has a finite binary expansion, that is when q divided by gcd(p, q) is a power of 2. Raise `ValueError` if q ≤ 0.

```python starter
def binary_digits(p, q, n):
    return ""

def exact_in_binary(p, q):
    return False

print(binary_digits(1, 10, 12), exact_in_binary(3, 8))
```

```python solution
import math

def binary_digits(p, q, n):
    if not (0 <= p < q) or n < 0:
        raise ValueError("need 0 <= p < q and n >= 0")
    digits = []
    for _ in range(n):
        p *= 2
        digits.append(str(p // q))
        p %= q
    return "".join(digits)

def exact_in_binary(p, q):
    if q <= 0:
        raise ValueError("q must be positive")
    q //= math.gcd(p, q)
    return q & (q - 1) == 0

print(binary_digits(1, 10, 12), exact_in_binary(3, 8))
```

```python test
for _n in ["binary_digits", "exact_in_binary"]:
    assert _n in dir(), f"Define {_n}."
assert binary_digits(1, 10, 12) == "000110011001", f"0.1 = 0.000110011001...; got {binary_digits(1, 10, 12)!r}."
assert binary_digits(3, 8, 6) == "011000" and binary_digits(1, 2, 1) == "1", "0.375 = 0.011; 0.5 = 0.1."
assert binary_digits(1, 3, 8) == "01010101" and binary_digits(0, 7, 3) == "000", "1/3 = 0.0101...; zero is all zeros."
assert binary_digits(5, 7, 0) == "" and isinstance(binary_digits(5, 7, 4), str), "n = 0 gives an empty string."
for _bad in [(10, 10, 4), (-1, 3, 4), (1, 3, -1)]:
    try:
        binary_digits(*_bad)
        assert False, f"binary_digits{_bad} should raise ValueError."
    except ValueError:
        pass
assert exact_in_binary(3, 8) is True and exact_in_binary(1, 10) is False and exact_in_binary(1, 5) is False, "Only powers of 2 below."
assert exact_in_binary(6, 12) is True and exact_in_binary(5, 10) is True and exact_in_binary(7, 1) is True, "Reduce first: 6/12 = 1/2."
assert exact_in_binary(0, 3) is True and exact_in_binary(3, 1024) is True and exact_in_binary(1, 96) is False, "0 is exact; 1/96 has a factor 3."
try:
    exact_in_binary(1, 0)
    assert False, "q = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: Doubling peels off binary digits, and only denominators that are powers of 2 ever finish: 0.1 never does."
```

Hint: Each step doubles p; the digit is p // q and the new p is p % q. A positive integer q is a power of 2 exactly when `q & (q - 1) == 0`.
:::

::: challenge Inside a double [medium]
Write `decode(x)`: the three fields of the IEEE 754 double x as a tuple of plain ints `(sign, exponent_field, fraction)` (use `struct`). Write `encode(sign, exponent_field, fraction)`: the float with those fields; raise `ValueError` if sign is not 0 or 1, the exponent field is outside 0 to 2047, or the fraction is outside 0 to 2⁵² − 1. Then write `my_ulp(x)`: the gap between the finite, positive float x and the next larger float, computed from the fields alone, as a plain float (do not call `math.ulp` or `math.nextafter`). For a normal number with exponent field e it is 2^(e − 1075); for a subnormal (field 0) it is 2⁻¹⁰⁷⁴. Raise `ValueError` if x is not finite or not positive.

```python starter
import struct

def decode(x):
    return (0, 0, 0)

def encode(sign, exponent_field, fraction):
    return 0.0

def my_ulp(x):
    return 0.0

print(decode(0.1), encode(0, 1023, 0), my_ulp(1.0))
```

```python solution
import math
import struct

def decode(x):
    b = struct.unpack(">Q", struct.pack(">d", x))[0]
    return int(b >> 63), int((b >> 52) & 0x7FF), int(b & ((1 << 52) - 1))

def encode(sign, exponent_field, fraction):
    if sign not in (0, 1) or not 0 <= exponent_field <= 2047 or not 0 <= fraction < 2 ** 52:
        raise ValueError("fields out of range")
    b = (sign << 63) | (exponent_field << 52) | fraction
    return struct.unpack(">d", struct.pack(">Q", b))[0]

def my_ulp(x):
    if not math.isfinite(x) or x <= 0:
        raise ValueError("x must be finite and positive")
    e = decode(x)[1]
    return math.ldexp(1.0, (e if e > 0 else 1) - 1075)

print(decode(0.1), encode(0, 1023, 0), my_ulp(1.0))
```

```python test
import ast
import inspect
import math
for _n in ["decode", "encode", "my_ulp"]:
    assert _n in dir(), f"Define {_n}."
assert decode(1.0) == (0, 1023, 0) and decode(-2.5) == (1, 1024, 2 ** 50), f"1.0 and -2.5; got {decode(1.0)}, {decode(-2.5)}."
assert decode(0.1) == (0, 1019, 0x999999999999A) and all(type(_v) is int for _v in decode(0.1)), "0.1 = 1.6 × 2^-4, plain ints."
assert decode(0.0) == (0, 0, 0) and decode(-0.0) == (1, 0, 0) and decode(math.inf) == (0, 2047, 0), "Zero, negative zero and infinity."
assert decode(5e-324) == (0, 0, 1), "The smallest subnormal has fraction 1."
for _x in [1.0, 0.1, -2.5, 1e300, -7.25e-200, 5e-324, 123456.789]:
    assert encode(*decode(_x)) == _x, f"encode(decode(x)) must give x back for {_x}."
assert encode(0, 1023, 2 ** 51) == 1.5 and encode(1, 1025, 0) == -4.0, "1.5 and -4."
assert math.isnan(encode(0, 2047, 1)), "Exponent 2047 with a non-zero fraction is NaN."
for _bad in [(2, 1023, 0), (0, 2048, 0), (0, 1023, 2 ** 52), (0, -1, 0)]:
    try:
        encode(*_bad)
        assert False, f"encode{_bad} should raise ValueError."
    except ValueError:
        pass
try:
    _src = inspect.getsource(my_ulp)
    _attrs = {_node.attr for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Attribute)}
    assert not (_attrs & {"ulp", "nextafter", "spacing"}), "Compute the gap from the exponent field, not with math.ulp or nextafter."
except (OSError, TypeError):
    pass
for _x in [1.0, 1000.0, 1e16, 0.1, 2.0 ** 53, 1e-310, 5e-324, 1.7e308]:
    assert my_ulp(_x) == math.ulp(_x), f"my_ulp({_x}) should be {math.ulp(_x)}; got {my_ulp(_x)}."
assert type(my_ulp(3.0)) is float, "A plain float."
for _bad in [0.0, -1.0, math.inf, math.nan]:
    try:
        my_ulp(_bad)
        assert False, f"my_ulp({_bad}) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A double is a sign, a biased exponent and a 52-bit fraction, and the exponent alone fixes the gap to the next float."
```

Hint: `struct.unpack(">Q", struct.pack(">d", x))[0]` turns a float into a 64-bit integer; shift right by 63 for the sign, by 52 and mask with 0x7FF for the exponent, and mask the low 52 bits for the fraction. `encode` reverses it. For the ulp, `math.ldexp(1.0, k)` is 2ᵏ exactly.
:::

::: challenge Clocks that drift [hard]
Write `accumulate(tick, n, dtype)`: start a clock at `dtype(0)` and add `dtype(tick)` to it n times, in that dtype (`np.float32` or `np.float64`), returning the final value as a plain float. Write `drift(tick, n, dtype)`: the clock's error after n ticks, the accumulated value minus the exact time n × tick computed with `Fraction(str(tick))` (so a tick of 0.1 means exactly one tenth), subtracted exactly as Fractions and only then converted to a plain float. Raise `ValueError` in both if n < 0 or tick ≤ 0. Then write `first_bad_tick(tick, tolerance, dtype, limit=10**6)`: the first tick count k (1 ≤ k ≤ limit) at which |drift| exceeds `tolerance` seconds, found in a single pass of accumulation (do not restart the clock for each k), or `None` if it never does within `limit` ticks.

```python starter
from fractions import Fraction
import numpy as np

def accumulate(tick, n, dtype):
    return 0.0

def drift(tick, n, dtype):
    return 0.0

def first_bad_tick(tick, tolerance, dtype, limit=10**6):
    return None

print(drift(0.1, 360_000, np.float32))
```

```python solution
from fractions import Fraction
import numpy as np

def accumulate(tick, n, dtype):
    if n < 0 or tick <= 0:
        raise ValueError("need n >= 0 and a positive tick")
    clock = dtype(0)
    step = dtype(tick)
    for _ in range(n):
        clock = clock + step
    return float(clock)

def drift(tick, n, dtype):
    value = accumulate(tick, n, dtype)
    return float(Fraction(value) - n * Fraction(str(tick)))

def first_bad_tick(tick, tolerance, dtype, limit=10**6):
    clock = dtype(0)
    step = dtype(tick)
    exact = Fraction(str(tick))
    for k in range(1, limit + 1):
        clock = clock + step
        if abs(Fraction(float(clock)) - k * exact) > tolerance:
            return k
    return None

print(drift(0.1, 360_000, np.float32))
```

```python test
from fractions import Fraction
import numpy as np
for _n in ["accumulate", "drift", "first_bad_tick"]:
    assert _n in dir(), f"Define {_n}."
_d32 = drift(0.1, 360_000, np.float32)
assert type(_d32) is float and abs(_d32 - (-41.65234375)) < 1e-6, f"Ten hours of 0.1 s in float32 lose 41.65 s; got {_d32}."
_d64 = drift(0.1, 360_000, np.float64)
assert abs(_d64) < 1e-6 and _d64 != 0, f"float64 drifts by about 2.4e-7 s; got {_d64}."
assert drift(0.125, 100_000, np.float32) == 0.0 and drift(0.5, 1000, np.float64) == 0.0, "Ticks that are exact binary fractions do not drift (while the total stays exact)."
assert accumulate(0.1, 0, np.float32) == 0.0 and type(accumulate(0.1, 10, np.float32)) is float, "Zero ticks give 0.0; plain floats."
assert abs(accumulate(0.1, 10, np.float32) - 1.0000001192092896) < 1e-12, "Ten float32 tenths."
assert drift(0.1, 3, np.float64) == float(Fraction(0.30000000000000004) - Fraction(3, 10)), "Subtract exactly: Fraction(clock) − 3 × Fraction('0.1'), then convert."
for _bad in [(0.1, -1, np.float32), (0.0, 10, np.float32)]:
    try:
        drift(*_bad)
        assert False, f"drift{_bad} should raise ValueError."
    except ValueError:
        pass
_k = first_bad_tick(0.1, 0.01, np.float32)
_slow = None
_c, _s = np.float32(0), np.float32(0.1)
for _i in range(1, 200_001):
    _c = _c + _s
    if abs(Fraction(float(_c)) - _i * Fraction(1, 10)) > 0.01:
        _slow = _i
        break
assert _k == _slow and _k is not None, f"First tick with |drift| > 0.01 s in float32 is {_slow}; got {_k}."
assert first_bad_tick(0.1, 0.01, np.float64, limit=100_000) is None, "float64 stays within 0.01 s for 100,000 ticks."
assert first_bad_tick(0.125, 1e-9, np.float32, limit=1000) is None, "Exact binary ticks never drift."
"SUCCESS: Rounding every addition to a growing total makes a float32 clock lose seconds in hours; counting ticks as integers with an exact tick length never drifts."
```

Hint: Convert the tick once with `dtype(tick)` and add it in a loop. The exact time is `n * Fraction(str(tick))`; `Fraction(value)` turns the clock's float into its exact value, so the difference is exact before you convert it to a float. For the first bad tick, keep one running clock and check the drift after every addition.
:::

## What you learned

- Binary fractions are sums of halves, quarters and eighths; p/q has a finite binary form only when q is a power of 2, so 0.1 is always rounded.
- A double is (−1)ˢ × (1 + f/2⁵²) × 2^(e − 1023): one sign bit, an 11-bit biased exponent and a 52-bit fraction, with special patterns for zero, subnormals, infinity and NaN.
- The gap to the next float (the ulp) is about 2.2 × 10⁻¹⁶ of the number's size: the same relative precision everywhere, but larger absolute gaps for larger numbers, so integers are exact only up to 2⁵³.
- Every basic operation is correctly rounded, with halves going to the even neighbour; surprises like round(2.675, 2) = 2.67 come from the stored input, not the arithmetic.
- Single precision keeps about 7 digits; accumulating a small tick in float32 drifts by seconds within hours. Counting ticks as integers with an exact tick length avoids drift altogether.

The next lesson follows measurement errors through calculations: how uncertain is a volume computed from three measured lengths?
