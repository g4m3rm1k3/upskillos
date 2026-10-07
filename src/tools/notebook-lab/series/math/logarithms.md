# Logarithms and log scales

The faintest sound a person can hear and a jet engine close up differ in sound power by a factor of about a hundred trillion. Lemon juice is a hundred thousand times more acidic than tap water. The 2011 Tōhoku earthquake released about a thousand times the energy of a typical "strong" magnitude-7 quake. Ranges this vast are unmanageable as plain numbers, so science measures them on **logarithmic scales**: decibels, pH, earthquake magnitude, octaves. The logarithm turns multiplication into addition and huge ranges into small ones. It is also the inverse of the exponential, which makes it the tool for solving every "how long until..." question of the previous lesson. This lesson builds the logarithm, its laws, and the log scales engineers use every day.

This lesson covers:

- the logarithm as the inverse of a power, and the bases 10, e and 2;
- the laws of logarithms, and why they turn multiplication into addition;
- decibels, and adding sound levels;
- pH and earthquake magnitude;
- log axes that straighten exponentials and power laws;
- numerically careful logarithms for small changes.

## Undoing a power

::: math
\[ \log_b x = y \;\Longleftrightarrow\; b^y = x, \qquad \log_b x = \frac{\ln x}{\ln b} \]
- defined only for $x > 0$; $\log_b 1 = 0$ for every base
- halvings from 1 m to below 1 mm: $\lceil \log_2 1000 \rceil = 10$
In code: `math.log10`, `math.log2`, `math.log` (natural log, base $e$)
:::


The logarithm answers the question "what power?": log_b(x) is the exponent y such that b^y = x. So log₁₀(1000) = 3 because 10³ = 1000, and log₂(8) = 3 because 2³ = 8. Three bases dominate:

- base 10, `math.log10`: orders of magnitude, decibels, pH;
- base e, the **natural logarithm** ln, `math.log`: calculus and continuous growth, since ln is the inverse of eˣ;
- base 2, `math.log2`: doublings, bits and binary search.

Logarithms are only defined for positive x, and log_b(1) = 0 for every base. Any base converts to any other by the **change of base** rule: log_b(x) = ln(x)/ln(b). Predict before running: how many times must a 1-metre bar be halved to get below 1 millimetre?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

print("log10(1000) =", math.log10(1000), "  log2(8) =", math.log2(8), "  ln(e) =", math.log(math.e))
print("change of base: log2(1000) =", math.log2(1000), "= ln(1000)/ln(2) =", math.log(1000) / math.log(2))
print("halvings from 1 m to under 1 mm:", math.ceil(math.log2(1000)))
print("10 ** log10(x) gives back x:", 10 ** math.log10(37.5), "  exp(ln(x)):", math.exp(math.log(37.5)))
try:
    math.log(0)
except ValueError as err:
    print("log(0):", err)
```

```output
log10(1000) = 3.0   log2(8) = 3.0   ln(e) = 1.0
change of base: log2(1000) = 9.965784284662087 = ln(1000)/ln(2) = 9.965784284662087
halvings from 1 m to under 1 mm: 10
10 ** log10(x) gives back x: 37.5   exp(ln(x)): 37.5
log(0): math domain error
```

`math.ceil` rounds up to the next whole number, since a whole number of halvings is needed.

Ten halvings take a metre below a millimetre, because 2¹⁰ = 1024 is just over 1000. That is the logarithm counting multiplications: log₂ of a ratio is the number of doublings in it. Taking 10 to the power log₁₀(x) returns x (up to rounding), as an inverse should, and the logarithm of 0 does not exist.

## The laws of logarithms

::: math
\[ \log(xy) = \log x + \log y, \qquad \log\frac{x}{y} = \log x - \log y, \qquad \log(x^p) = p\log x \]
- products become sums, so tiny probabilities can be combined without underflow
- $\log_{10}(0.1^{400}) = -400$, though $0.1^{400}$ itself rounds to 0
In code: `math.isclose(math.log10(x * y), math.log10(x) + math.log10(y))`, and summing `math.log10(p)`
:::


Because exponents add when powers multiply (bᵐ bⁿ = bᵐ⁺ⁿ), logarithms turn products into sums:

\[ \log(xy) = \log x + \log y, \qquad \log\frac{x}{y} = \log x - \log y, \qquad \log(x^p) = p \log x \]

Before electronic calculators this was how engineers multiplied: look up the logarithms in a table (or slide two log scales along each other on a slide rule), add, and convert back. The same property makes logarithms indispensable in computation today: multiplying a thousand probabilities underflows to 0, but adding their logarithms does not. Predict before running: what happens to the product of 400 probabilities of 0.1?

```python type
x, y = 3.7, 52.0
print("log(xy) = log x + log y:", math.isclose(math.log10(x * y), math.log10(x) + math.log10(y)))
print("log(x^5) = 5 log x:", math.isclose(math.log(x ** 5), 5 * math.log(x)))

probs = [0.1] * 400
product = 1.0
for p in probs:
    product *= p
print("product of 400 probabilities of 0.1:", product)
print("sum of their log10:", sum(math.log10(p) for p in probs), "-> the product is 10 to that power")
```

```output
log(xy) = log x + log y: True
log(x^5) = 5 log x: True
product of 400 probabilities of 0.1: 0.0
sum of their log10: -400.0 -> the product is 10 to that power
```

Floats cannot represent numbers below about 10⁻³⁰⁸ (about 10⁻³²⁴ with reduced precision), so the product **underflows** to exactly 0.0, losing all information. The logarithm, −400, is perfectly representable: the product is 10⁻⁴⁰⁰. Statistics and machine learning work with log-probabilities for exactly this reason.

## Decibels

::: math
\[ L = 20\log_{10}\frac{p}{p_0}, \qquad L_\text{total} = 10\log_{10}\sum_i 10^{L_i/10} \]
- $p_0 = 20\ \mu\text{Pa}$; doubling the power adds $10\log_{10} 2 \approx 3$ dB
- levels do not add; their powers do
In code: `level_from_pressure(p_pa)` and `combine(levels_db)`
:::


The **decibel** (dB) expresses a ratio of powers as 10 log₁₀(P/P₀). Every factor of 10 in power adds 10 dB; doubling adds about 3 dB, since 10 log₁₀ 2 ≈ 3.01. Sound pressure level uses pressure p rather than power, and power goes as pressure squared, so L = 20 log₁₀(p/p₀) with p₀ = 20 µPa, the threshold of hearing.

Because decibels are logarithms, gains in a chain of amplifiers or losses along a cable simply add. Levels from separate noise sources do **not** add, however: their powers add, so convert back from dB, add, and take the logarithm again. Predict before running: two machines each produce 80 dB at the operator's position. What is the combined level, and what about ten machines?

```python type
def level_from_pressure(p_pa):
    return 20 * math.log10(p_pa / 20e-6)

def combine(levels_db):
    return 10 * math.log10(sum(10 ** (L / 10) for L in levels_db))

print(f"1 Pa (a loud machine): {level_from_pressure(1.0):.1f} dB;  20 µPa: {level_from_pressure(20e-6):.1f} dB")
print(f"two 80 dB machines: {combine([80, 80]):.2f} dB;  ten: {combine([80] * 10):.2f} dB")
print(f"80 dB plus a 70 dB machine: {combine([80, 70]):.2f} dB")
print(f"gain chain +20 dB, -6 dB, +14 dB = {20 - 6 + 14} dB = power factor {10 ** (28 / 10):.0f}")
```

```output
1 Pa (a loud machine): 94.0 dB;  20 µPa: 0.0 dB
two 80 dB machines: 83.01 dB;  ten: 90.00 dB
80 dB plus a 70 dB machine: 80.41 dB
gain chain +20 dB, -6 dB, +14 dB = 28 dB = power factor 631
```

Two equal sources give +3 dB, not double the decibels: 83.01 dB. Ten give +10 dB, 90 dB. A source 10 dB quieter adds only 0.41 dB, which is why removing the quieter of two machines barely helps, while removing the louder helps a lot. The ear perceives roughly a 10 dB increase as "twice as loud", itself a logarithmic response.

## pH and earthquake magnitude

::: math
\[ \text{pH} = -\log_{10}[\text{H}^+], \qquad E \propto 10^{1.5M}, \qquad \frac{E_2}{E_1} = 10^{1.5(M_2 - M_1)} \]
- each pH unit is a factor of 10 in acidity
- two magnitude units: $10^3 = 1000$ times the energy
In code: `-math.log10(h_conc)` and `10 ** (1.5 * (m2 - m1))`
:::


**pH** is −log₁₀ of the hydrogen-ion concentration in moles per litre: pure water at 25 °C has 10⁻⁷ mol/L, pH 7. Each unit of pH is a factor of 10 in acidity, so diluting an acid tenfold raises its pH by one unit (for strong acids at moderate concentrations).

The **moment magnitude** of an earthquake is designed so that each unit is a factor of about 31.6 (10^1.5) in released energy: E ∝ 10^(1.5 M). Two units is a factor of 1000. Predict before running: how much more energy does a magnitude 9.0 earthquake release than a magnitude 7.0?

```python type
def ph(h_conc):
    return -math.log10(h_conc)

for name, conc in [("lemon juice", 10 ** -2.0), ("coolant concentrate", 10 ** -8.6), ("pure water", 1e-7)]:
    print(f"{name:<20} [H+] = {conc:.2e} mol/L, pH {ph(conc):.1f}")
print("diluting 0.01 mol/L acid tenfold: pH", ph(0.01), "->", ph(0.001))

for m1, m2 in [(7.0, 9.0), (6.0, 6.3), (5.0, 8.0)]:
    print(f"magnitude {m2} vs {m1}: {10 ** (1.5 * (m2 - m1)):,.1f} times the energy")
```

```output
lemon juice          [H+] = 1.00e-02 mol/L, pH 2.0
coolant concentrate  [H+] = 2.51e-09 mol/L, pH 8.6
pure water           [H+] = 1.00e-07 mol/L, pH 7.0
diluting 0.01 mol/L acid tenfold: pH 2.0 -> 3.0
magnitude 9.0 vs 7.0: 1,000.0 times the energy
magnitude 6.3 vs 6.0: 2.8 times the energy
magnitude 8.0 vs 5.0: 31,622.8 times the energy
```

Magnitude 9.0 releases 1,000 times the energy of 7.0. Even 0.3 units, a difference that sounds small, is a factor of 2.8. Log scales compress huge ranges into small numbers, but each step on them is a large multiplicative jump, which is easy to forget when reading the news.

## Log axes

::: math
\[ y = N_0 e^{kt} \;\Rightarrow\; \ln y = \ln N_0 + k\,t, \qquad y = c\,t^p \;\Rightarrow\; \log y = \log c + p\log t \]
- semi-log axes straighten exponentials; log–log axes straighten power laws
- the slope of the straight line is the rate $k$ or the exponent $p$
In code: `ax.set_yscale("log")` (and `ax.set_xscale("log")` for log–log)
:::


The plotting lesson used log–log axes to turn a power law into a straight line. A **semi-log** plot, with only the y axis logarithmic, does the same for exponentials: log y = log N₀ + k t log e is linear in t. On semi-log axes an exponential is a straight line, its slope set by the growth rate, so exponential behaviour in data is spotted at a glance. Predict before running: on semi-log axes, which of the three curves is straight?

```python type
t = np.linspace(0.5, 10, 100)
curves = {"exponential 5·1.6^t": 5 * 1.6 ** t, "power 3·t^3": 3 * t ** 3, "linear 40t": 40 * t}
fig, axes = plt.subplots(1, 3, figsize=(12, 3.2))
for ax, (title, scale) in zip(axes, [("linear axes", "linear"), ("semi-log (y)", "semilog"), ("log-log", "loglog")]):
    for name, ys in curves.items():
        ax.plot(t, ys, label=name)
    if scale in ("semilog", "loglog"):
        ax.set_yscale("log")
    if scale == "loglog":
        ax.set_xscale("log")
    ax.set_title(title)
    ax.set_xlabel("t")
axes[0].legend(fontsize=8)
plt.show()

def straightness(xs, ys):
    slopes = np.diff(ys) / np.diff(xs)
    return slopes.min() / slopes.max()

for name, ys in curves.items():
    print(f"{name:<20} straight on semi-log: {straightness(t, np.log10(ys)):.3f}   on log-log: {straightness(np.log10(t), np.log10(ys)):.3f}")
```

```output
exponential 5·1.6^t  straight on semi-log: 1.000   on log-log: 0.055
power 3·t^3          straight on semi-log: 0.055   on log-log: 1.000
linear 40t           straight on semi-log: 0.055   on log-log: 1.000
```

`straightness` compares the smallest and largest slope between neighbouring points: 1.000 means a perfectly straight line.

The exponential is straight on semi-log axes (straightness 1.000) and the power law on log-log axes (1.000). The linear function is curved on semi-log axes but straight on log-log, since t¹ is a power law with exponent 1. Choosing axes so that the expected model becomes a straight line is one of the most useful habits in data analysis.

## Logarithms of small changes

::: math
\[ \ln(1 + \delta) \approx \delta - \frac{\delta^2}{2}, \qquad e^x - 1 \approx x + \frac{x^2}{2} \qquad (\text{small } \delta, x) \]
- forming $1 + \delta$ in floating point already rounds $\delta$
- the special functions never form that sum
In code: `math.log1p(delta)` and `math.expm1(x)` against `math.log(1 + delta)`
:::


For x very close to 1, ln(x) is a tiny number computed from a number whose information is in its last few digits. Writing x = 1 + δ and computing `math.log(1 + delta)` loses accuracy once δ approaches the float precision: forming 1 + δ already rounds δ. The functions `math.log1p(δ)`, which computes ln(1 + δ), and `math.expm1(x)`, which computes eˣ − 1, avoid forming the rounded sum at all. They matter in finance (tiny daily interest rates), in statistics and in physics. Predict before running: for δ = 10⁻¹⁰, how many correct digits does `log(1 + δ)` give?

```python type
for delta in [1e-4, 1e-10, 1e-15]:
    naive = math.log(1 + delta)
    careful = math.log1p(delta)
    print(f"δ = {delta:.0e}: log(1+δ) = {naive:.15e}   log1p(δ) = {careful:.15e}   relative error of naive: {abs(naive / careful - 1):.1e}")
daily = 0.035 / 365
print(f"daily rate {daily:.3e}: one year of daily compounding grows by {math.expm1(365 * math.log1p(daily)):.10f}")
```

```output
δ = 1e-04: log(1+δ) = 9.999500033329732e-05   log1p(δ) = 9.999500033330834e-05   relative error of naive: 1.1e-13
δ = 1e-10: log(1+δ) = 1.000000082690371e-10   log1p(δ) = 9.999999999500001e-11   relative error of naive: 8.3e-08
δ = 1e-15: log(1+δ) = 1.110223024625156e-15   log1p(δ) = 9.999999999999995e-16   relative error of naive: 1.1e-01
daily rate 9.589e-05: one year of daily compounding grows by 0.0356179711
```

ln(1 + δ) is very close to δ itself for small δ, so `log1p(δ)` is essentially δ here.

At δ = 10⁻¹⁰ the naive version has a relative error around 10⁻⁷, only about seven correct digits out of sixteen; at 10⁻¹⁵ it is wrong by about 11%. `log1p` is accurate to full precision throughout. The last line computes a year of daily compounding at 3.5%, 1.0356 in growth factor, without ever forming a number like 1.0000958904.

::: challenge Combining noise sources [easy]
Write `db_from_power_ratio(ratio)`, 10 log₁₀(ratio), raising `ValueError` if the ratio is not positive. Write `power_ratio_from_db(db)`. Write `combine_levels(levels)`, the combined sound level in dB of independent sources (add the powers, as in the lesson), rounded to 2 decimal places; raise `ValueError` for an empty list. Then write `remove_source(total, removed)`: the level remaining after switching off a source of level `removed` from a measured total, rounded to 2 decimal places. Raise `ValueError` if `removed` is not less than `total` (the remaining level would be undefined).

```python starter
def db_from_power_ratio(ratio):
    return 0.0

def power_ratio_from_db(db):
    return 1.0

def combine_levels(levels):
    return max(levels)

def remove_source(total, removed):
    return total

print(combine_levels([80, 80]))
```

```python solution
def db_from_power_ratio(ratio):
    if ratio <= 0:
        raise ValueError("a power ratio must be positive")
    return 10 * math.log10(ratio)

def power_ratio_from_db(db):
    return 10 ** (db / 10)

def combine_levels(levels):
    if not levels:
        raise ValueError("no levels to combine")
    return round(db_from_power_ratio(sum(power_ratio_from_db(L) for L in levels)), 2)

def remove_source(total, removed):
    if removed >= total:
        raise ValueError("the removed source must be quieter than the total")
    return round(db_from_power_ratio(power_ratio_from_db(total) - power_ratio_from_db(removed)), 2)

print(combine_levels([80, 80]))
```

```python test
for _n in ["db_from_power_ratio", "power_ratio_from_db", "combine_levels", "remove_source"]:
    assert _n in dir(), f"Define {_n}."
assert db_from_power_ratio(100) == 20.0 and abs(db_from_power_ratio(2) - 3.0103) < 1e-4, "10 log10 of the ratio."
assert abs(power_ratio_from_db(30) - 1000) < 1e-9 and abs(power_ratio_from_db(-3) - 0.501187) < 1e-6, "The inverse."
for _bad in [0, -1]:
    try:
        db_from_power_ratio(_bad)
        assert False, f"ratio {_bad} should raise ValueError."
    except ValueError:
        pass
assert combine_levels([80, 80]) == 83.01 and combine_levels([80] * 10) == 90.0 and combine_levels([80, 70]) == 80.41, "The lesson's machines."
assert combine_levels([65]) == 65.0 and combine_levels([85, 82, 79, 60]) == 87.44, f"Got {combine_levels([85, 82, 79, 60])}."
try:
    combine_levels([])
    assert False, "No levels should raise ValueError."
except ValueError:
    pass
assert remove_source(83.01, 80) == 80.0 and remove_source(90, 89) == 83.13, f"Removing sources; got {remove_source(90, 89)}."
for _bad in [(80, 80), (80, 85)]:
    try:
        remove_source(*_bad)
        assert False, f"remove_source{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Decibels add for gains, but levels from separate sources combine through their powers: two equal machines make only 3 dB more."
```

Hint: Convert each level to a power ratio with 10^(L/10), add or subtract the ratios, and convert back with 10 log₁₀.
:::

::: challenge A day's noise exposure [medium]
Workplace noise rules limit the daily **dose**. With a criterion of 85 dB for 8 hours and an **exchange rate** of 3 dB (every 3 dB louder halves the allowed time), the allowed time at level L is T(L) = 8 × 2^((85 − L)/3) hours. Write `allowed_hours(level, criterion=85, exchange=3)`, rounded to 3 decimal places. Write `daily_dose(segments)` for a list of `(level, hours)` pairs: the dose as a percentage, 100 × Σ hours / T(level), rounded to 1 decimal place. Then write `equivalent_level(segments)`, the steady level over the same total time that gives the same energy, L_eq = 10 log₁₀(Σ tᵢ 10^(Lᵢ/10) / Σ tᵢ), rounded to 1 decimal place. Raise `ValueError` from both if the segment list is empty, any duration is negative, or the total time is 0. Use unrounded allowed times inside `daily_dose`.

```python starter
def allowed_hours(level, criterion=85, exchange=3):
    return 8.0

def daily_dose(segments):
    return 0.0

def equivalent_level(segments):
    return 0.0

day = [(82, 3), (91, 1.5), (78, 2), (95, 0.5)]
print(daily_dose(day), equivalent_level(day))
```

```python solution
def _allowed(level, criterion=85, exchange=3):
    return 8 * 2 ** ((criterion - level) / exchange)

def allowed_hours(level, criterion=85, exchange=3):
    return round(_allowed(level, criterion, exchange), 3)

def _check(segments):
    if not segments or any(h < 0 for _, h in segments) or sum(h for _, h in segments) == 0:
        raise ValueError("need segments with non-negative durations and some time")

def daily_dose(segments):
    _check(segments)
    return round(100 * sum(h / _allowed(L) for L, h in segments), 1)

def equivalent_level(segments):
    _check(segments)
    total = sum(h for _, h in segments)
    energy = sum(h * 10 ** (L / 10) for L, h in segments)
    return round(10 * math.log10(energy / total), 1)

day = [(82, 3), (91, 1.5), (78, 2), (95, 0.5)]
print(daily_dose(day), equivalent_level(day))
```

```python test
for _n in ["allowed_hours", "daily_dose", "equivalent_level"]:
    assert _n in dir(), f"Define {_n}."
assert allowed_hours(85) == 8.0 and allowed_hours(88) == 4.0 and allowed_hours(100) == 0.25 and allowed_hours(82) == 16.0, "Every 3 dB halves the time."
assert allowed_hours(90, exchange=5, criterion=90) == 8.0 and allowed_hours(95, criterion=90, exchange=5) == 4.0, "Other criteria and exchange rates."
_day = [(82, 3), (91, 1.5), (78, 2), (95, 0.5)]
assert daily_dose(_day) == 161.7, f"Got {daily_dose(_day)}."
assert daily_dose([(85, 8)]) == 100.0 and daily_dose([(94, 1)]) == 100.0, "Exactly the limit."
assert equivalent_level(_day) == 87.6, f"Got {equivalent_level(_day)}."
assert equivalent_level([(85, 8)]) == 85.0 and equivalent_level([(80, 1), (80, 3)]) == 80.0, "A steady level is its own equivalent."
for _bad in [[], [(85, -1)], [(85, 0), (90, 0)]]:
    for _f in (daily_dose, equivalent_level):
        try:
            _f(_bad)
            assert False, f"{_f.__name__}({_bad}) should raise ValueError."
        except ValueError:
            pass
"SUCCESS: Half an hour at 95 dB uses more of the day's allowance than three hours at 82: on a log scale, a few decibels are a big deal."
```

Hint: The dose adds each segment's hours divided by its allowed hours. For L_eq, convert each level to 10^(L/10), weight by time, average, and take 10 log₁₀.
:::

::: challenge Preferred values [hard]
Resistors and capacitors come in **E-series** values spaced evenly on a log scale, so the relative step between neighbours is roughly constant. The E12 series is 1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2 in each decade (times 1, 10, 100, ...). Write `nearest_e12(value)`: the E12 value nearest to `value` in **ratio** (the smallest |log(candidate / value)|), searching the decade of the value and its neighbours, rounded to 3 significant figures; on an exact tie of logarithmic distance, choose the smaller value. Raise `ValueError` for non-positive values. Write `e12_error(value)`, the percentage difference (nearest − value)/value × 100, rounded to 2 decimal places. Then write `best_divider(target, low=1e3, high=1e5)`: choose E12 resistors R1 and R2 (each between `low` and `high` inclusive) so that the voltage divider ratio R2/(R1 + R2) is closest to `target` (0 < target < 1), returning `(R1, R2, ratio)` with the ratio rounded to 5 decimal places; on a tie, the pair with the smaller R1 + R2 wins.

```python starter
E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]

def nearest_e12(value):
    return value

def e12_error(value):
    return 0.0

def best_divider(target, low=1e3, high=1e5):
    return (10000.0, 10000.0, 0.5)

print(nearest_e12(4300), e12_error(4300))
```

```python solution
E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]

def _sig3(v):
    return float(f"{v:.3g}")

def nearest_e12(value):
    if value <= 0:
        raise ValueError("value must be positive")
    decade = math.floor(math.log10(value))
    candidates = sorted(_sig3(m * 10 ** d) for d in (decade - 1, decade, decade + 1) for m in E12)
    return min(candidates, key=lambda c: (abs(math.log(c / value)), c))

def e12_error(value):
    return round((nearest_e12(value) - value) / value * 100, 2)

def best_divider(target, low=1e3, high=1e5):
    if not 0 < target < 1:
        raise ValueError("target must be between 0 and 1")
    values = sorted({_sig3(m * 10 ** d) for d in range(math.floor(math.log10(low)) - 1, math.floor(math.log10(high)) + 2) for m in E12})
    values = [v for v in values if low <= v <= high]
    best = None
    for r1 in values:
        for r2 in values:
            ratio = r2 / (r1 + r2)
            key = (abs(ratio - target), r1 + r2)
            if best is None or key < best[0]:
                best = (key, r1, r2, ratio)
    return (best[1], best[2], round(best[3], 5))

print(nearest_e12(4300), e12_error(4300))
```

```python test
for _n in ["nearest_e12", "e12_error", "best_divider"]:
    assert _n in dir(), f"Define {_n}."
assert nearest_e12(4300) == 4700.0 and nearest_e12(4200) == 3900.0, f"Nearest in ratio; got {nearest_e12(4300)} and {nearest_e12(4200)}."
assert nearest_e12(9.5) == 10.0 and nearest_e12(0.00104) == 0.001 and nearest_e12(1.0) == 1.0, "Neighbouring decades count."
assert nearest_e12(math.sqrt(1.0 * 1.2)) == 1.0, "A tie in log distance goes to the smaller value."
assert nearest_e12(250) == 270.0 and nearest_e12(2.445) == 2.7, f"Ratio, not difference: 2.445 is nearer 2.2 by difference but nearer 2.7 by ratio; got {nearest_e12(2.445)}."
for _bad in [0, -5]:
    try:
        nearest_e12(_bad)
        assert False, f"nearest_e12({_bad}) should raise ValueError."
    except ValueError:
        pass
assert e12_error(4300) == 9.3 and e12_error(5600) == 0.0, "Percentage error."
_r1, _r2, _ratio = best_divider(0.25)
assert abs(_ratio - 0.25) < 0.002 and _r1 + _r2 <= 2e4, f"A 1:4 divider; got {(_r1, _r2, _ratio)}."
assert best_divider(0.5) == (1000.0, 1000.0, 0.5), "Equal resistors; the smallest pair wins the tie."
_r1, _r2, _ratio = best_divider(0.1234)
assert (_r1, _r2, _ratio) == (33000.0, 4700.0, 0.12467), f"The best E12 pair for 0.1234 is 33 k and 4.7 k (ratio 0.12467); got {(_r1, _r2, _ratio)}."
"SUCCESS: Preferred values are a log scale made physical: nearest means nearest in ratio, and two of them make almost any divider."
```

Hint: Compare candidates by |ln(candidate/value)| so that "near" means "near in ratio". Build candidates from the E12 multipliers times powers of ten for the decades around the value, rounding to 3 significant figures to remove float noise. For the divider, try every pair.
:::

## What you learned

- log_b(x) is the power of b that gives x; ln (base e), log₁₀ and log₂ are the common bases, and log_b x = ln x / ln b.
- Logarithms turn products into sums and powers into multiples, which is why log-probabilities avoid underflow.
- Decibels are 10 log₁₀ of a power ratio: gains add in dB, but independent sources combine through their powers (two equal sources give +3 dB).
- pH and earthquake magnitude are log scales: each unit is a fixed multiplicative factor (10 for pH, about 31.6 in energy per magnitude).
- Semi-log axes straighten exponentials; log–log axes straighten power laws.
- `log1p` and `expm1` keep full accuracy for small changes where log(1 + δ) loses digits.

The next lesson begins the probability thread: estimating chances by simulating random events.
