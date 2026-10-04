# Sequences, arithmetic and geometric

A machine loses value every year. A cutting tool is reground again and again, a little smaller each time. A dropped ball bounces lower and lower. A vibration dies away cycle by cycle. Each of these produces a **sequence**: a list of numbers, one per step. Two kinds dominate. In an **arithmetic** sequence each step adds the same amount; in a **geometric** sequence each step multiplies by the same factor. This lesson recognises the two from data, derives their sums (including the infinite sum that tells how far a bouncing ball travels before it stops), compares straight-line and declining-balance depreciation, and asks when a sequence settles to a limit, and when an endless sum stays finite.

This lesson covers:

- arithmetic and geometric sequences, and telling them apart from data;
- the sums of both, and the infinite geometric sum;
- depreciation: straight-line against declining balance;
- regrinding tools and decaying vibrations as sequences;
- limits and convergence, and a sum that grows without bound however slowly.

## Two basic kinds

::: math
\[ \text{arithmetic: } a_n = a_0 + n\,d \;\;(a_{n+1} - a_n = d), \qquad \text{geometric: } a_n = a_0\,r^n \;\;(a_{n+1} / a_n = r) \]
- $a_n$: the term at step $n$, counting from $n = 0$; $d$: the common difference; $r$: the common ratio
- constant differences mean arithmetic, constant ratios mean geometric; a geometric sequence is arithmetic in its logarithms
In code: `np.diff` and ratios of consecutive terms for three logged sequences
:::

A sequence is a function of a whole number n: a₀, a₁, a₂, .... The two simplest kinds are named by what stays the same from step to step. If the **difference** aₙ₊₁ − aₙ is constant, the sequence is **arithmetic**: linear growth or decline, a straight line of points. If the **ratio** aₙ₊₁/aₙ is constant, it is **geometric**: exponential growth or decay in steps, the exponential lesson's compound interest. Taking logarithms turns a geometric sequence into an arithmetic one, with log r as the step.

Predict before running: three logs from a workshop. Which is arithmetic, which geometric, and which neither?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
from fractions import Fraction

logs = {
    "regrind diameter (mm)": np.array([25.0, 24.6, 24.2, 23.8, 23.4, 23.0]),
    "vibration amplitude (µm)": np.array([80.0, 60.0, 45.0, 33.75, 25.3125, 18.984375]),
    "spare parts on hand": np.array([40.0, 34.0, 29.0, 25.0, 22.0, 20.0]),
}
for name, seq in logs.items():
    diffs, ratios = np.diff(seq), seq[1:] / seq[:-1]
    kind = "arithmetic" if np.allclose(diffs, diffs[0]) else "geometric" if np.allclose(ratios, ratios[0]) else "neither"
    print(f"{name:<26} differences {np.round(diffs, 4)}  ratios {np.round(ratios, 4)}  -> {kind}")
```

The regrind diameters fall by a constant 0.4 mm, so they are arithmetic. The vibration amplitudes keep a constant ratio of 0.75, so they are geometric. The spare-parts count has neither constant differences (−6, −5, −4, −3, −2) nor constant ratios. Its differences themselves form an arithmetic sequence, which makes the parts count a quadratic in n. Checking differences and ratios is the first step in modelling any stepwise data.

## Sums

::: math
\[ \sum_{k=0}^{n-1} (a_0 + k d) = \frac{n\,(a_0 + a_{n-1})}{2}, \qquad \sum_{k=0}^{n-1} a_0 r^k = a_0\,\frac{1 - r^n}{1 - r} \;(r \ne 1), \qquad \sum_{k=0}^{\infty} a_0 r^k = \frac{a_0}{1 - r} \;(|r| < 1) \]
- the arithmetic sum is the number of terms times the average of the first and last (Gauss's pairing trick)
- the geometric sum follows from subtracting $r$ times the sum from itself: every middle term cancels
- for $|r| < 1$ the terms shrink fast enough that the infinite sum is finite
In code: the formulas against `sum` for both kinds; the partial sums of $\tfrac{1}{2} + \tfrac{1}{4} + \cdots$
:::

Adding up the terms of a sequence gives a **series**. Both basic kinds have closed formulas. For an arithmetic sequence, pair the first term with the last, the second with the second-to-last, and so on: each pair has the same sum, so the total is the number of terms times the average of the ends. For a geometric sequence, call the sum S and subtract rS from it. All the middle terms cancel, leaving S(1 − r) = a₀(1 − rⁿ). When |r| < 1, rⁿ shrinks to zero as n grows, so even an infinite geometric series has a finite sum, a₀/(1 − r). Zeno's paradox of halving the distance forever is the sum ½ + ¼ + ⅛ + ... = 1.

Predict before running: the sum 1 + 2 + ... + 100, the sum of 20 terms 80 × 0.75ᵏ, and the partial sums of ½ + ¼ + ⅛ + ...?

```python
n = 100
print("1 + 2 + ... + 100:", sum(range(1, n + 1)), " formula n(first + last)/2:", n * (1 + n) // 2)
a0, r, terms = 80.0, 0.75, 20
direct = sum(a0 * r ** k for k in range(terms))
print(f"geometric, 20 terms: {direct:.6f}  formula {a0 * (1 - r ** terms) / (1 - r):.6f}  infinite sum {a0 / (1 - r):.1f}")
partial = np.cumsum([Fraction(1, 2 ** k) for k in range(1, 11)])
print("partial sums of 1/2 + 1/4 + ...:", [str(p) for p in partial[:5]], "...", partial[-1], "=", float(partial[-1]))
```

1 + 2 + ... + 100 = 5050, the story told about the young Gauss. Twenty terms of the vibration amplitudes add to 318.99, already close to the infinite sum of 320. The partial sums of ½ + ¼ + ... are 1/2, 3/4, 7/8, 15/16, ..., each 1 − 1/2ⁿ, reaching 1023/1024 after ten terms and approaching 1 without ever exceeding it.

## Depreciation: straight-line or declining balance

::: math
\[ \text{straight line: } B_n = C - n\,\frac{C - S}{L}, \qquad \text{declining balance: } B_n = \max\!\big(C\,(1 - \rho)^n,\; S\big), \quad \rho = \frac{2}{L} \;\text{(double declining)} \]
- $B_n$: book value after $n$ years; $C$: purchase cost; $S$: salvage value; $L$: useful life in years; $\rho$: the yearly rate
- straight-line depreciation is an arithmetic sequence; declining balance is geometric, front-loading the write-off
In code: both schedules for a 120,000 machine with a 10-year life and 15,000 salvage; the year in which they cross
:::

Accountants spread a machine's cost over its useful life by depreciating its **book value** each year. **Straight-line** depreciation removes the same amount every year: (cost − salvage)/life. That is an arithmetic sequence ending exactly at the salvage value. **Declining-balance** depreciation removes the same **fraction** of the remaining value each year: a geometric sequence. The common "double declining" rate is 2/L per year. It writes off much more in the early years, when a machine also loses most of its market value, and is usually stopped at the salvage value.

Predict before running: a 120,000 machine, 10-year life, 15,000 salvage. After 3 years, what is it worth on each schedule, and when does the declining balance stop falling?

```python
C, S, L = 120_000.0, 15_000.0, 10
years = np.arange(L + 1)
straight = C - years * (C - S) / L
declining = np.maximum(C * (1 - 2 / L) ** years, S)
for yr in [1, 3, 5, 8, 10]:
    print(f"year {yr:>2}: straight line {straight[yr]:>9,.0f}   double declining {declining[yr]:>9,.0f}")
first_floor = int(np.argmax(declining <= S + 1e-9))
print(f"declining balance reaches the salvage floor in year {first_floor}; first-year write-off {C - declining[1]:,.0f} vs {C - straight[1]:,.0f}")

fig, ax = plt.subplots(figsize=(5, 3.2))
ax.plot(years, straight, "o-", label="straight line (arithmetic)")
ax.plot(years, declining, "s-", label="double declining (geometric)")
ax.set_xlabel("year")
ax.set_ylabel("book value")
ax.legend(fontsize=8)
plt.show()
```

After 3 years the machine is worth 88,500 on the straight-line schedule but 61,440 on double declining balance, which writes off 24,000 in the first year against 10,500. The declining balance hits the 15,000 floor in year 10, as 120,000 × 0.8¹⁰ ≈ 12,885 would fall below salvage. The plot shows a straight line against a curve that drops steeply and then flattens: arithmetic against geometric.

## Regrinding and decaying vibration

::: math
\[ D_k = D_0 - k\,\delta, \quad k_\text{max} = \Big\lfloor \frac{D_0 - D_\text{min}}{\delta} \Big\rfloor, \qquad A_k = A_0\,e^{-k\delta_\text{log}} = A_0\,q^{\,k}, \quad k_\text{small} = \Big\lceil \frac{\ln(A_0 / A_\text{lim})}{\delta_\text{log}} \Big\rceil \]
- each regrind removes the same depth $\delta$: an arithmetic sequence of diameters, stopping at a minimum $D_\text{min}$
- each vibration cycle multiplies the amplitude by the same $q = e^{-\delta_\text{log}}$: geometric, with the spring–mass lesson's logarithmic decrement $\delta_\text{log}$
In code: the number of regrinds a drill allows; the cycles until a vibration falls below a limit
:::

Sequences answer "how many steps until..." questions. A carbide drill starts at 25.0 mm, loses 0.4 mm of diameter per regrind, and is scrapped below 22.0 mm. Its diameters form an arithmetic sequence, so the number of regrinds is the gap divided by the step, rounded down. A machine tapped and left to ring loses the same fraction of amplitude every cycle: a geometric sequence whose logarithm falls by the logarithmic decrement each cycle (the spring–mass lesson). The number of cycles to fall below a limit comes from a logarithm, rounded up.

Predict before running: how many regrinds does the drill allow? And a vibration starting at 80 µm with decrement 0.2877 (amplitude ratio 0.75 per cycle): after how many cycles is it below 1 µm?

```python
D0, delta, Dmin = 25.0, 0.4, 22.0
k_max = math.floor((D0 - Dmin) / delta + 1e-9)
print(f"regrinds allowed: {k_max}, final diameter {D0 - k_max * delta:.1f} mm (one more would give {D0 - (k_max + 1) * delta:.1f} mm)")
A0, q, A_lim = 80.0, 0.75, 1.0
dlog = -math.log(q)
k_small = math.ceil(math.log(A0 / A_lim) / dlog)
print(f"logarithmic decrement {dlog:.4f}; below {A_lim} µm after {k_small} cycles: {A0 * q ** (k_small - 1):.3f} -> {A0 * q ** k_small:.3f} µm")
print(f"at 25 Hz that is {k_small / 25:.2f} s of ringing")
```

The drill allows 7 regrinds, ending at 22.2 mm; an eighth would take it to 21.8 mm, below the limit. The 1e-9 added before rounding down guards against a quotient that should be a whole number coming out just below it: with a 21.8 mm limit, (25 − 21.8)/0.4 evaluates to 7.999999999999998, which would round down to 7 instead of 8. The vibration needs 16 cycles to fall below 1 µm: after 15 it is still 1.069 µm, after 16 it is 0.802 µm. At 25 Hz the machine rings for about two thirds of a second after each knock.

## Limits and convergence

::: math
\[ \lim_{n \to \infty} a_n = L \;\Longleftrightarrow\; |a_n - L| \text{ becomes and stays as small as you like}, \qquad H_n = \sum_{k=1}^{n} \frac{1}{k} \approx \ln n + \gamma \to \infty \]
- $H_n$: the $n$-th harmonic number; $\gamma \approx 0.5772$: the Euler–Mascheroni constant
- a sequence **converges** if its terms settle towards a single value; $r^n \to 0$ for $|r| < 1$, and grows without bound for $|r| > 1$
- terms that shrink to zero do **not** guarantee a finite sum: the harmonic series $1 + \tfrac{1}{2} + \tfrac{1}{3} + \cdots$ grows like $\ln n$, forever
In code: $r^n$ for several $r$; harmonic partial sums against $\ln n + \gamma$; the number of terms needed to pass 10
:::

A sequence **converges** to a limit L if its terms eventually get, and stay, as close to L as anyone demands. Geometric sequences show the possible behaviours: rⁿ shrinks to 0 when |r| < 1, stays put at r = 1, flips between ±1 forever at r = −1, and runs off when |r| > 1. For series the crucial fact is subtle. The terms must shrink to zero for the sum to be finite, but that is not enough. The **harmonic series** 1 + ½ + ⅓ + ... has terms shrinking to zero, yet its partial sums grow without limit. They grow only like ln n, so slowly that a computer adding a term every nanosecond would need about 90,000 years to pass 50. The fractions lesson met these partial sums as exact fractions; here they are seen as a sequence heading to infinity.

Predict before running: how many terms of the harmonic series are needed for the sum to pass 10? And how close is ln n + 0.5772 to the partial sums?

```python
for rr in [0.5, 0.9, 1.0, 1.1, -0.9]:
    print(f"r = {rr:>4}: r^10 = {rr ** 10:9.4f}, r^100 = {rr ** 100:.3e}")
H = np.cumsum(1 / np.arange(1, 1_000_001))
for nn in [10, 1000, 1_000_000]:
    print(f"H_{nn} = {H[nn - 1]:.6f}, ln n + 0.5772 = {math.log(nn) + 0.5772156649:.6f}")
passes_10 = int(np.argmax(H > 10)) + 1
print(f"the partial sums first exceed 10 at n = {passes_10:,}; passing 50 would need about e^(50 - 0.5772) ≈ {math.exp(50 - 0.5772):.1e} terms")
```

0.5¹⁰⁰ and 0.9¹⁰⁰ are tiny, 1¹⁰⁰ is 1 and 1.1¹⁰⁰ is about 13,781. −0.9 alternates in sign while shrinking (its odd powers are negative). The harmonic partial sums track ln n + 0.5772 (the Euler–Mascheroni constant) closely: within 0.05 at n = 10 and within 10⁻⁶ at a million. The sum first exceeds 10 after 12,367 terms, and reaching 50 would take about 3 × 10²¹ terms. Divergence can be extraordinarily slow, so no finite computation can show a series converges. That needs the reasoning the calculus block develops.

::: challenge Recognising sequences [easy]
Write `classify(terms, tol=1e-9)`: given at least three numbers (list or array), return `("arithmetic", d)` if all consecutive differences equal the first within tol, otherwise `("geometric", r)` if no term is zero and all consecutive ratios equal the first within tol, otherwise `("neither", None)`; d and r are plain floats. Raise `ValueError` for fewer than three terms. A constant non-zero sequence counts as arithmetic (d = 0). Then write `nth_term(kind, a0, step, n)`: term n (counting from 0) of an arithmetic (step = d) or geometric (step = r) sequence, as a plain float; raise `ValueError` for any other kind.

```python starter
def classify(terms, tol=1e-9):
    return ("neither", None)

def nth_term(kind, a0, step, n):
    return 0.0

print(classify([25.0, 24.6, 24.2, 23.8]), classify([80, 60, 45, 33.75]))
```

```python solution
def classify(terms, tol=1e-9):
    t = [float(v) for v in terms]
    if len(t) < 3:
        raise ValueError("need at least three terms")
    diffs = [b - a for a, b in zip(t, t[1:])]
    if all(abs(d - diffs[0]) <= tol for d in diffs):
        return ("arithmetic", float(diffs[0]))
    if all(v != 0 for v in t):
        ratios = [b / a for a, b in zip(t, t[1:])]
        if all(abs(q - ratios[0]) <= tol for q in ratios):
            return ("geometric", float(ratios[0]))
    return ("neither", None)

def nth_term(kind, a0, step, n):
    if kind == "arithmetic":
        return float(a0 + n * step)
    if kind == "geometric":
        return float(a0 * step ** n)
    raise ValueError("kind must be 'arithmetic' or 'geometric'")

print(classify([25.0, 24.6, 24.2, 23.8]), classify([80, 60, 45, 33.75]))
```

```python test
import numpy as np
for _n in ["classify", "nth_term"]:
    assert _n in dir(), f"Define {_n}."
_k, _d = classify([25.0, 24.6, 24.2, 23.8, 23.4])
assert _k == "arithmetic" and abs(_d + 0.4) < 1e-9 and type(_d) is float, f"Diameters: arithmetic, d = -0.4; got {(_k, _d)}."
assert classify(np.array([80.0, 60.0, 45.0, 33.75])) == ("geometric", 0.75), "Amplitudes: geometric, r = 0.75; arrays work."
assert classify([40, 34, 29, 25, 22]) == ("neither", None), "Neither."
assert classify([5, 5, 5]) == ("arithmetic", 0.0), "Constant: arithmetic with d = 0."
assert classify([0, 0, 1]) == ("neither", None) and classify([3, -6, 12, -24]) == ("geometric", -2.0), "Zeros rule out ratios; negative ratios are fine."
assert classify([1.0, 1.1, 1.21000001], tol=1e-6)[0] == "geometric", "tol applies to the ratios too."
try:
    classify([1, 2])
    assert False, "Two terms are not enough: ValueError."
except ValueError:
    pass
assert abs(nth_term("arithmetic", 25.0, -0.4, 7) - 22.2) < 1e-9 and abs(nth_term("geometric", 80, 0.75, 2) - 45.0) < 1e-9, "Terms 7 and 2."
assert type(nth_term("geometric", 1, 2, 10)) is float and nth_term("geometric", 1, 2, 10) == 1024.0, "Plain float."
try:
    nth_term("harmonic", 1, 1, 3)
    assert False, "Unknown kind: ValueError."
except ValueError:
    pass
"SUCCESS: Constant differences mean arithmetic, constant ratios mean geometric: two checks that classify most stepwise data."
```

Hint: Compute the list of differences and compare each with the first; if that fails and there are no zeros, do the same with the ratios. Term n is a₀ + nd or a₀rⁿ.
:::

::: challenge Depreciation schedules [medium]
Write `book_values(cost, salvage, life, method)`: the list of life + 1 book values (year 0 to year `life`) as plain floats. For `method="straight"` subtract (cost − salvage)/life each year. For `method="declining"` multiply by (1 − 2/life) each year but never go below salvage (once the value would fall below it, it stays at salvage). Raise `ValueError` if life < 1, salvage < 0, salvage > cost, or the method is unknown. Then write `switch_year(cost, life)`: with zero salvage, the double-declining charge each year is 2/life of the book value at the start of that year, and many companies switch to straight-line depreciation of the remaining value over the remaining years as soon as that is at least as large. Return the first year n (1 to life) in which (book value at the start of year n)/(life − n + 1) is at least 2/life × (that book value), using the declining-balance values (allow a relative tolerance of 1e-9 for the comparison), or `None` if it never happens.

```python starter
def book_values(cost, salvage, life, method):
    return [float(cost)] * (life + 1)

def switch_year(cost, life):
    return None

print(book_values(120000, 15000, 10, "straight")[:4], book_values(120000, 15000, 10, "declining")[:4])
```

```python solution
def book_values(cost, salvage, life, method):
    if life < 1 or salvage < 0 or salvage > cost:
        raise ValueError("need life >= 1 and 0 <= salvage <= cost")
    if method == "straight":
        step = (cost - salvage) / life
        return [float(cost - n * step) for n in range(life + 1)]
    if method == "declining":
        values, v = [float(cost)], float(cost)
        for _ in range(life):
            v = max(v * (1 - 2 / life), salvage)
            values.append(float(v))
        return values
    raise ValueError("method must be 'straight' or 'declining'")

def switch_year(cost, life):
    values = book_values(cost, 0.0, life, "declining")
    for n in range(1, life + 1):
        start = values[n - 1]
        straight_charge = start / (life - n + 1)
        declining_charge = start * 2 / life
        if straight_charge >= declining_charge * (1 - 1e-9):
            return n
    return None

print(book_values(120000, 15000, 10, "straight")[:4], book_values(120000, 15000, 10, "declining")[:4])
```

```python test
for _n in ["book_values", "switch_year"]:
    assert _n in dir(), f"Define {_n}."
_s = book_values(120000, 15000, 10, "straight")
assert len(_s) == 11 and _s[0] == 120000.0 and abs(_s[3] - 88500) < 1e-6 and abs(_s[10] - 15000) < 1e-6, "Straight line: 88,500 after 3 years, salvage at the end."
assert all(type(_v) is float for _v in _s), "Plain floats."
_d = book_values(120000, 15000, 10, "declining")
assert abs(_d[1] - 96000) < 1e-6 and abs(_d[3] - 61440) < 1e-6, "Double declining: 96,000 then 61,440 after 3 years."
assert min(_d) >= 15000 and abs(_d[10] - 15000) < 1e-6, "Never below salvage."
_d2 = book_values(10000, 3000, 4, "declining")
assert _d2 == [10000.0, 5000.0, 3000.0, 3000.0, 3000.0], f"Rate 2/4 = 0.5, floored at 3,000; got {_d2}."
for _bad in [(100, 10, 0, "straight"), (100, -1, 5, "straight"), (100, 200, 5, "straight"), (100, 10, 5, "sum-of-digits")]:
    try:
        book_values(*_bad)
        assert False, f"book_values{_bad} should raise ValueError."
    except ValueError:
        pass
assert switch_year(120000, 10) == 6, "Ten-year life: the straight-line charge on what remains catches up in year 6."
assert switch_year(50000, 5) == 4, "Five-year life: switch in year 4."
assert switch_year(1000, 3) == 3, "Three-year life: switch in the last year."
"SUCCESS: Straight-line depreciation is arithmetic, declining balance geometric; the floor at salvage makes them meet again."
```

Hint: The straight-line step is (cost − salvage)/life. For declining balance, multiply by (1 − 2/life) each year and take the max with the salvage value. For the switch, compare start/(years left) with start × 2/life each year.
:::

::: challenge Geometric sums [hard]
Write `geometric_sum(a0, r, n)`: the sum of the first n terms a₀ + a₀r + ... + a₀rⁿ⁻¹ as a plain float, using the closed form (handle r = 1 separately); raise `ValueError` if n < 0. Write `infinite_sum(a0, r)`: a₀/(1 − r), raising `ValueError` unless |r| < 1. Then write `bounce_distance(h0, e, bounces=None)`: the total distance travelled by a ball dropped from height h0 whose rebound **speed** is e times the impact speed each time (so each rebound height is e² times the previous). It falls h0, then rises and falls 2h0e², 2h0e⁴, .... With `bounces` given, count that many rebounds; with None, the infinite total. Raise `ValueError` unless 0 ≤ e < 1 and h0 > 0. Finally write `terms_for_tail(a0, r, tol)`: the smallest n such that the infinite sum minus the sum of the first n terms is at most tol in size (0 < |r| < 1, tol > 0), as a plain int.

```python starter
def geometric_sum(a0, r, n):
    return 0.0

def infinite_sum(a0, r):
    return 0.0

def bounce_distance(h0, e, bounces=None):
    return 0.0

def terms_for_tail(a0, r, tol):
    return 0

print(geometric_sum(80, 0.75, 20), infinite_sum(80, 0.75), bounce_distance(2.0, 0.8))
```

```python solution
import math

def geometric_sum(a0, r, n):
    if n < 0:
        raise ValueError("n must not be negative")
    if r == 1:
        return float(a0 * n)
    return float(a0 * (1 - r ** n) / (1 - r))

def infinite_sum(a0, r):
    if not abs(r) < 1:
        raise ValueError("the sum converges only for |r| < 1")
    return float(a0 / (1 - r))

def bounce_distance(h0, e, bounces=None):
    if h0 <= 0 or not 0 <= e < 1:
        raise ValueError("need h0 > 0 and 0 <= e < 1")
    q = e * e
    if bounces is None:
        return float(h0 + 2 * h0 * q / (1 - q))
    return float(h0 + 2 * h0 * q * geometric_sum(1.0, q, bounces))

def terms_for_tail(a0, r, tol):
    if not 0 < abs(r) < 1 or tol <= 0:
        raise ValueError("need 0 < |r| < 1 and tol > 0")
    n = 0
    while abs(a0 * r ** n / (1 - r)) > tol:
        n += 1
    return n

print(geometric_sum(80, 0.75, 20), infinite_sum(80, 0.75), bounce_distance(2.0, 0.8))
```

```python test
import math
for _n in ["geometric_sum", "infinite_sum", "bounce_distance", "terms_for_tail"]:
    assert _n in dir(), f"Define {_n}."
assert abs(geometric_sum(80, 0.75, 20) - sum(80 * 0.75 ** _k for _k in range(20))) < 1e-9 and type(geometric_sum(1, 2, 3)) is float, "20 terms of the amplitudes."
assert geometric_sum(5, 1, 7) == 35.0 and geometric_sum(3, 2, 0) == 0.0 and geometric_sum(1, 2, 10) == 1023.0, "r = 1, no terms, and 1 + 2 + ... + 512."
assert abs(geometric_sum(1, -1, 5) - 1.0) < 1e-12, "Alternating signs."
try:
    geometric_sum(1, 0.5, -1)
    assert False, "Negative n: ValueError."
except ValueError:
    pass
assert infinite_sum(80, 0.75) == 320.0 and abs(infinite_sum(0.5, 0.5) - 1.0) < 1e-15 and abs(infinite_sum(1, -0.5) - 2 / 3) < 1e-15, "Infinite sums."
for _bad in [1.0, -1.0, 1.5]:
    try:
        infinite_sum(1, _bad)
        assert False, f"r = {_bad} diverges: ValueError."
    except ValueError:
        pass
_inf = bounce_distance(2.0, 0.8)
assert abs(_inf - (2 + 2 * 2 * 0.64 / 0.36)) < 1e-12, f"Infinite bouncing: about 9.11 m; got {_inf}."
assert bounce_distance(2.0, 0.8, 0) == 2.0 and abs(bounce_distance(2.0, 0.8, 1) - (2 + 2 * 2 * 0.64)) < 1e-12, "No rebounds; one rebound."
assert abs(bounce_distance(2.0, 0.8, 200) - _inf) < 1e-9 and bounce_distance(1.0, 0.0) == 1.0, "Many rebounds approach the infinite total; e = 0 just falls."
for _bad in [(0, 0.5), (1, 1.0), (1, -0.1)]:
    try:
        bounce_distance(*_bad)
        assert False, f"bounce_distance{_bad} should raise ValueError."
    except ValueError:
        pass
_n = terms_for_tail(1.0, 0.5, 1e-3)
assert type(_n) is int and _n == 11 and 2 * 0.5 ** 11 <= 1e-3 < 2 * 0.5 ** 10, f"Tail of 1/2^k below 0.001 after 11 terms; got {_n}."
assert terms_for_tail(80, 0.75, 1.0) == 21, "The amplitude tail 320 × 0.75^n drops to 1 or below after 21 terms."
"SUCCESS: A geometric series sums in closed form, converges for |r| < 1, and a bouncing ball travels a finite distance in infinitely many bounces."
```

Hint: Σ a₀rᵏ for k < n is a₀(1 − rⁿ)/(1 − r). The ball's distance is h0 plus 2h0 times the geometric series in q = e² starting at q. The tail after n terms is a₀rⁿ/(1 − r); increase n until it is small enough.
:::

## What you learned

- Arithmetic sequences have constant differences (aₙ = a₀ + nd), geometric ones constant ratios (aₙ = a₀rⁿ); checking both classifies stepwise data, and a geometric sequence is arithmetic in its logarithms.
- Arithmetic sums are the number of terms times the average of the ends; geometric sums are a₀(1 − rⁿ)/(1 − r), and for |r| < 1 the infinite sum is a₀/(1 − r).
- Straight-line depreciation is arithmetic and declining balance geometric; a geometric schedule never reaches zero on its own, which is why companies floor it at salvage or switch to straight line part-way.
- "How many steps until..." questions are answered by dividing (arithmetic) or by logarithms (geometric), with careful rounding.
- Sequences converge when their terms settle to a limit; shrinking terms do not guarantee a finite sum, as the harmonic series grows like ln n without bound.

The next lesson generalises: sequences defined by rules that refer to previous terms, recurrences, from loans to populations.
