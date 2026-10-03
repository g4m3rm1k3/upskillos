# Percentages, relative change and relative error

A price rises 25% and then falls 20%. Is it back where it started? A pressure gauge is "accurate to 0.25%". Is a reading of 1 bar on it good to 0.25%? A pay rise of 4% during a year of 9% inflation: up or down? Questions like these are about **relative** size: a change or an error compared with the thing it changes. Relative quantities are everywhere in engineering and economics, and they are easy to get wrong, because percentages do not add, do not undo symmetrically, and depend on what they are a percentage of. This lesson puts them on a firm footing.

This lesson covers:

- relative change, and why a rise and an equal-sized fall do not cancel;
- chaining changes by multiplying, and the geometric mean as the average growth rate;
- logarithmic change, which is symmetric and adds up;
- inflation: nominal and real values, and compound annual growth rates;
- absolute and relative error, and instrument accuracy quoted against reading or full scale.

## Relative change and chaining

::: math
\[ \text{relative change} = \frac{x_\text{new} - x_\text{old}}{x_\text{old}}, \qquad x_n = x_0 \prod_{i=1}^{n} (1 + c_i), \qquad \bar{c}_\text{geo} = \Big(\prod_{i=1}^{n} (1 + c_i)\Big)^{1/n} - 1 \]
- each change $c_i$ is relative to the value just before it, so changes multiply, not add
- undoing a change $c$ needs $\dfrac{1}{1 + c} - 1$: +25% is undone by −20%
- $\bar{c}_\text{geo}$: the steady rate that gives the same overall change (the geometric mean growth rate)
In code: `np.prod([1 + c for c in changes])` against `sum(changes)`
:::

A relative change divides the change by the **starting** value. That makes it asymmetric. Going from 100 to 125 is +25%, but going back from 125 to 100 is −20%, because the second change is measured against 125. Equal-sized percentage rises and falls therefore do not cancel: +10% then −10% leaves 99% of the start, and +50% then −50% only 75%.

A sequence of changes compounds, each acting on the result of the last, so the factors (1 + c) multiply. The steady rate that would produce the same overall change is the **geometric mean** rate, which is always at most the arithmetic mean of the rates. A fund that gains 50% and loses 50% has an arithmetic average return of 0% and has lost a quarter of its value.

Note also the difference between **percent** and **percentage points**. An interest rate going from 2% to 3% has risen by 1 percentage point, but by 50%.

Predict before running: a machine's output changes by +12%, −8%, +5%, −15% and +20% over five years. The changes add up to +14%. What is the real overall change?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

print("100 -> +25% -> -20%:", 100 * 1.25 * 0.80, "   +10% then -10%:", round(1.10 * 0.90, 4), "   +50% then -50%:", 1.5 * 0.5)
changes = [0.12, -0.08, 0.05, -0.15, 0.20]
factor = np.prod([1 + c for c in changes])
print(f"sum of the changes {sum(changes):+.1%}, actual overall change {factor - 1:+.2%}")
print(f"average change: arithmetic {np.mean(changes):+.2%} per year, geometric {factor ** (1 / len(changes)) - 1:+.2%} per year")
print(f"check: (1 + geometric rate)^5 = {(factor ** (1 / 5)) ** 5:.6f} = overall factor {factor:.6f}")
```

The overall change is +10.36%, not +14%. The geometric mean rate is 1.99% a year; the arithmetic mean of the rates, 2.80%, overstates it. Five years at a steady 1.99% reproduce the overall factor exactly, which is what an "average growth rate" should mean. The gap between the two averages grows with the volatility of the changes: up-and-down sequences lose ground compared with steady ones.

## Logarithmic change

::: math
\[ \ell = \ln\frac{x_\text{new}}{x_\text{old}}, \qquad \ln\frac{x_n}{x_0} = \sum_{i=1}^{n} \ln\frac{x_i}{x_{i-1}}, \qquad \ln(1 + c) \approx c - \frac{c^2}{2} \;\text{ for small } c \]
- going up and coming back give log changes of equal size and opposite sign
- log changes add along a chain, so ordinary averages of them are meaningful
In code: `(b - a) / a` against `math.log(b / a)` for several pairs
:::

The logarithms lesson turned products into sums. Applied to changes, it gives the **log change** ln(new/old). It repairs both problems of percentages. A rise and a fall back have the same size with opposite signs. And a chain of changes is just the sum of the log changes, so their ordinary average is the steady rate. For small changes the log change and the relative change nearly agree: 1% is a log change of 0.00995. That is why economists happily write "log points" for percentages.

Predict before running: what are the log changes for 100 → 125 and 125 → 100, and how far is the log change from the relative change for 100 → 200?

```python
for a, b in [(100, 125), (125, 100), (100, 101), (100, 200)]:
    print(f"{a:>3} -> {b:>3}: relative change {(b - a) / a:+.4f}, log change {math.log(b / a):+.4f}")
logs = [math.log(1 + c) for c in changes]
print(f"sum of the five log changes {sum(logs):.6f} = log of the overall factor {math.log(factor):.6f}")
```

100 → 125 and 125 → 100 give log changes of +0.2231 and −0.2231: perfectly symmetric. At 1% the two measures differ in the fifth decimal place; at a doubling they differ a lot (1.0 against 0.693). The five yearly log changes add up to the log of the overall factor exactly. Log changes are the natural unit whenever changes compound: growth, decay, returns, inflation.

## Inflation: nominal and real

::: math
\[ \text{real value}_t = \text{nominal}_t \times \frac{I_\text{base}}{I_t}, \qquad 1 + c_\text{real} = \frac{1 + c_\text{nominal}}{1 + \pi}, \qquad \text{CAGR} = \Big(\frac{x_\text{end}}{x_\text{start}}\Big)^{1/n} - 1 \]
- $I_t$: a price index (for example consumer prices) in year $t$; $\pi$: the inflation rate that year
- real values express every year's money in the prices of one base year
- CAGR: compound annual growth rate over $n$ years
In code: `wage * cpi[0] / cpi` for real wages; `(end / start) ** (1 / n) - 1`
:::

A **price index** tracks the cost of a fixed basket of goods, set to 100 in a base year. Dividing a money amount by the index (and multiplying by the base value) removes the effect of prices rising, turning **nominal** values into **real** ones. Because both are rates, they combine by division, not subtraction: a 4% raise in a year of 9% inflation is a real change of 1.04/1.09 − 1 ≈ −4.6%. That is close to 4% − 9% when rates are small, but not equal.

Predict before running: an index rises at the yearly rates below from 2015 to 2024, and a salary goes from 28,000 to 37,400. Did its buying power rise over the decade?

```python
years = np.arange(2015, 2025)
inflation = [0.000, 0.007, 0.027, 0.025, 0.018, 0.009, 0.026, 0.091, 0.073, 0.025]
cpi = 100 * np.cumprod([1 + r for r in inflation])
wage = np.array([28000, 28600, 29300, 30000, 30900, 31500, 32200, 33600, 35800, 37400.0])
real = wage * cpi[0] / cpi
print("price index:", cpi.round(1))
print("real wage in 2015 money:", real.round(0))
print(f"over the decade: nominal {wage[-1] / wage[0] - 1:+.1%}, prices {cpi[-1] / cpi[0] - 1:+.1%}, real {real[-1] / real[0] - 1:+.2%}")
print(f"CAGR: nominal {(wage[-1] / wage[0]) ** (1 / 9) - 1:.2%} a year, prices {(cpi[-1] / cpi[0]) ** (1 / 9) - 1:.2%} a year")
print(f"2022: raise {wage[7] / wage[6] - 1:+.2%}, inflation {inflation[7]:.1%}, real change {real[7] / real[6] - 1:+.2%}")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(years, wage, "o-", label="nominal")
ax.plot(years, real, "s-", label="real (2015 prices)")
ax.legend(fontsize=8)
ax.set_ylabel("salary")
plt.show()
```

The salary rose 33.6% in money terms, while prices rose 34.0%. In real terms it fell slightly, by 0.36%: a decade of raises bought nothing. The compound annual growth rates, 3.27% for the salary and 3.31% for prices, tell the same story in one pair of numbers. In 2022 alone, a 4.35% raise met 9.1% inflation, a real cut of 4.36%. The plot shows the real wage drifting up gently until the inflation spike knocks it back below its starting level.

## Absolute and relative error

::: math
\[ e_\text{abs} = |x_\text{meas} - x_\text{true}|, \qquad e_\text{rel} = \frac{|x_\text{meas} - x_\text{true}|}{|x_\text{true}|}, \qquad \text{float rounding: } e_\text{rel} \le \frac{\varepsilon}{2} \approx 1.1 \times 10^{-16} \]
- the same absolute error can be negligible or disastrous depending on the size of the quantity
- relative error is undefined when the true value is 0; then only an absolute error makes sense
In code: `meas - true` and `(meas - true) / true` for three parts; `np.finfo(float).eps`
:::

An error of 0.05 mm means nothing on its own. On a 1 m shaft it is 0.005%, far below anything that matters. On a 10 mm pin it is 0.5%, enough to spoil a fit. On a 0.5 mm wire it is 10%. **Relative error** expresses this. Significant figures are a rough relative-error statement: a value written to 3 significant figures has a relative error of up to about 0.05% to 0.5%. Floating-point numbers also have a relative precision: every arithmetic result is correctly rounded to within half the machine epsilon, about 1.1 × 10⁻¹⁶ of its size, whatever that size is.

Predict before running: a 0.05 error on parts of nominal size 10, 1000 and 0.5. What are the relative errors?

```python
for true, measured in [(10.0, 10.05), (1000.0, 1000.05), (0.5, 0.55)]:
    print(f"true {true:>7}: measured {measured:>8}, absolute error {measured - true:.3f}, relative error {(measured - true) / true:.4%}")
eps = np.finfo(float).eps
print(f"machine epsilon {eps:.3e}; 0.1 is stored with relative error {abs(0.1 - 3602879701896397 / 2 ** 55) / 0.1:.1e}")
```

The same 0.05 is a relative error of 0.5%, 0.005% and 10%. The printed absolute errors also show floating point at work: 0.05 on 1000 comes out as 0.049999999999954525, because 1000.05 is stored with a relative error near 10⁻¹⁷, which on a number of size 1000 is an absolute error near 10⁻¹³. Rounding error is relative, so it is largest in absolute terms for large numbers, and subtracting two large numbers exposes it.

## Instrument accuracy: of reading, or of full scale?

::: math
\[ u = \frac{a_\text{rd}}{100}\,|x| + \frac{a_\text{fs}}{100}\,R + \frac{\delta}{2}, \qquad u_\text{rel} = \frac{u}{|x|} \]
- $x$: the reading; $R$: the full-scale range; $a_\text{rd}$ and $a_\text{fs}$: accuracy in % of reading and % of full scale; $\delta$: display resolution
- the full-scale term is a fixed amount, so it dominates small readings: read near the top of the range
In code: `uncertainty(reading, rng, 0.25, 0.25, res)` for three gauge ranges and three readings
:::

Instrument specifications state accuracy in two ways. A "% of reading" term scales with the value shown. A "% of full scale" (FS) term is the same absolute amount everywhere on the range. Many gauges, transmitters and meters quote both, plus the display resolution. The FS term is the trap: a gauge "accurate to 0.25% FS" on a 0 to 100 bar range is uncertain by 0.25 bar at every reading, which is 25% of a 1 bar reading.

Predict before running: three gauges, ranges 10, 25 and 100 bar, each 0.25% of reading plus 0.25% FS, with resolutions 0.01, 0.01 and 0.1 bar. What is the relative uncertainty of a 1 bar reading on each?

```python
def uncertainty(reading, rng, pct_reading, pct_fs, resolution):
    return pct_reading / 100 * abs(reading) + pct_fs / 100 * rng + resolution / 2

for rng, res in [(10, 0.01), (25, 0.01), (100, 0.1)]:
    row = []
    for reading in [1.0, 5.0, 9.0]:
        u = uncertainty(reading, rng, 0.25, 0.25, res)
        row.append(f"{reading:>4} bar ± {u:.4f} ({100 * u / reading:5.2f}%)")
    print(f"{rng:>3} bar gauge: " + ";  ".join(row))
```

On the 10 bar gauge, 1 bar is known to ±0.0325 bar (3.25%), while 9 bar is known to ±0.58%. The 100 bar gauge gives the same 1 bar reading ±0.30 bar, 30%. The fixed FS term and the coarser resolution swamp a small reading. The practical rules follow directly: choose the smallest range that covers the expected values (with margin for overloads), and treat readings in the bottom tenth of a range with suspicion. Stating an uncertainty as "± so much" or "± so many percent" only means something when you also say "of what".

::: challenge Percentages that compound [easy]
Write `relative_change(old, new)`: (new − old)/old as a plain float; raise `ValueError` if old is 0. Write `undo(pct)`: the percentage change that exactly reverses a change of `pct` percent (for example `undo(25)` is −20.0); raise `ValueError` if pct ≤ −100. Then write `chain(pcts)`: the overall percentage change produced by applying the percentage changes in the list one after another (an empty list gives 0.0). All results are plain floats, in percent except `relative_change`, which is a fraction.

```python starter
def relative_change(old, new):
    return 0.0

def undo(pct):
    return -pct

def chain(pcts):
    return sum(pcts)

print(relative_change(100, 125), undo(25), chain([12, -8, 5, -15, 20]))
```

```python solution
def relative_change(old, new):
    if old == 0:
        raise ValueError("relative change from zero is undefined")
    return float((new - old) / old)

def undo(pct):
    if pct <= -100:
        raise ValueError("a change of -100% or less cannot be undone")
    return float(100 * (1 / (1 + pct / 100) - 1))

def chain(pcts):
    factor = 1.0
    for p in pcts:
        factor *= 1 + p / 100
    return float(100 * (factor - 1))

print(relative_change(100, 125), undo(25), chain([12, -8, 5, -15, 20]))
```

```python test
for _n in ["relative_change", "undo", "chain"]:
    assert _n in dir(), f"Define {_n}."
assert relative_change(100, 125) == 0.25 and relative_change(125, 100) == -0.2, "The base is the old value."
assert type(relative_change(3, 4)) is float and abs(relative_change(-50, -40) - (-0.2)) < 1e-12, "Plain float; (new - old)/old even for negatives."
try:
    relative_change(0, 5)
    assert False, "relative_change from 0 should raise ValueError."
except ValueError:
    pass
assert abs(undo(25) - (-20.0)) < 1e-9 and abs(undo(-20) - 25.0) < 1e-9 and abs(undo(-50) - 100.0) < 1e-9, "+25% is undone by -20%; -50% needs +100%."
assert abs(undo(0)) < 1e-12 and type(undo(10)) is float, "No change needs no undoing."
for _bad in [-100, -150]:
    try:
        undo(_bad)
        assert False, f"undo({_bad}) should raise ValueError."
    except ValueError:
        pass
assert abs(chain([12, -8, 5, -15, 20]) - 10.3558) < 1e-3, f"The five changes compound to +10.36%; got {chain([12, -8, 5, -15, 20])}."
assert abs(chain([10, -10]) - (-1.0)) < 1e-9 and abs(chain([50, -50]) - (-25.0)) < 1e-9, "Equal rises and falls do not cancel."
assert chain([]) == 0.0 and type(chain([5])) is float, "An empty chain is no change."
assert abs(chain([25, undo(25)])) < 1e-9, "A change followed by its undo is no change."
"SUCCESS: Percentage changes multiply as factors (1 + c), so they neither add nor undo symmetrically."
```

Hint: Convert each percentage to a factor 1 + p/100, multiply the factors, and convert back with 100 × (factor − 1). The change that undoes factor f has factor 1/f.
:::

::: challenge Growth and inflation [medium]
Write `cagr(start, end, years)`: the compound annual growth rate (end/start)^(1/years) − 1 as a plain float fraction; raise `ValueError` if start or end is not positive or years is not positive. Write `real_series(nominal, index, base=0)`: given lists of nominal values and of a price index for the same years, return a list of plain floats with each value expressed in the prices of position `base` (value × index[base]/index[t]); raise `ValueError` if the lists differ in length or any index value is not positive. Then write `mean_growth(pcts)`: the geometric mean growth rate, in percent, of a list of yearly percentage changes (the steady yearly change giving the same overall result), as a plain float; raise `ValueError` for an empty list or any change ≤ −100.

```python starter
def cagr(start, end, years):
    return 0.0

def real_series(nominal, index, base=0):
    return list(nominal)

def mean_growth(pcts):
    return sum(pcts) / len(pcts)

print(cagr(28000, 37400, 9), mean_growth([12, -8, 5, -15, 20]))
```

```python solution
def cagr(start, end, years):
    if start <= 0 or end <= 0 or years <= 0:
        raise ValueError("start, end and years must be positive")
    return float((end / start) ** (1 / years) - 1)

def real_series(nominal, index, base=0):
    if len(nominal) != len(index):
        raise ValueError("one index value per year")
    if any(i <= 0 for i in index):
        raise ValueError("index values must be positive")
    return [float(v * index[base] / i) for v, i in zip(nominal, index)]

def mean_growth(pcts):
    if not pcts or any(p <= -100 for p in pcts):
        raise ValueError("need changes greater than -100%")
    factor = 1.0
    for p in pcts:
        factor *= 1 + p / 100
    return float(100 * (factor ** (1 / len(pcts)) - 1))

print(cagr(28000, 37400, 9), mean_growth([12, -8, 5, -15, 20]))
```

```python test
import numpy as np
for _n in ["cagr", "real_series", "mean_growth"]:
    assert _n in dir(), f"Define {_n}."
_c = cagr(28000, 37400, 9)
assert type(_c) is float and abs(_c - 0.0326857) < 1e-6, f"28,000 to 37,400 over 9 years: 3.27% a year; got {_c}."
assert abs(cagr(100, 200, 10) - (2 ** 0.1 - 1)) < 1e-12 and abs(cagr(100, 50, 1) + 0.5) < 1e-12, "Doubling in 10 years; halving in 1."
for _bad in [(0, 10, 1), (10, -1, 1), (10, 20, 0)]:
    try:
        cagr(*_bad)
        assert False, f"cagr{_bad} should raise ValueError."
    except ValueError:
        pass
_r = real_series([100, 110, 121], [100, 110, 121])
assert all(type(_v) is float for _v in _r) and np.allclose(_r, [100, 100, 100]), "Growth that only matches prices is flat in real terms."
assert np.allclose(real_series([100, 110, 121], [100, 110, 121], base=2), [121, 121, 121]), "In the prices of the last year."
assert np.allclose(real_series([50, 60], [80.0, 100.0]), [50, 48]), "60 at index 100 is 48 at index 80."
for _bad in [([1, 2], [100]), ([1, 2], [100, 0])]:
    try:
        real_series(*_bad)
        assert False, f"real_series{_bad} should raise ValueError."
    except ValueError:
        pass
_g = mean_growth([12, -8, 5, -15, 20])
assert type(_g) is float and abs(_g - 1.9903) < 1e-3, f"The geometric mean of the five changes is 1.99%; got {_g}."
assert abs(mean_growth([50, -50]) - (100 * (0.75 ** 0.5 - 1))) < 1e-9 and abs(mean_growth([7.0]) - 7.0) < 1e-12, "+50% then -50% averages about -13.4% a year."
for _bad in [[], [10, -100]]:
    try:
        mean_growth(_bad)
        assert False, f"mean_growth({_bad}) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Growth compounds, so its average is a geometric mean, and real values divide by the price index."
```

Hint: CAGR is the n-th root of the overall factor, minus 1. For real values multiply each by index[base]/index[t]. The geometric mean growth multiplies the factors 1 + p/100 and takes the n-th root.
:::

::: challenge Choosing a gauge range [hard]
A gauge's specification is a tuple `(full_scale, pct_reading, pct_fs, resolution)`. Write `uncertainty(reading, spec)`: the absolute uncertainty pct_reading% × |reading| + pct_fs% × full_scale + resolution/2, as a plain float. Write `relative_uncertainty(reading, spec)`: uncertainty/|reading| as a plain float; raise `ValueError` if the reading is 0 or its size exceeds the full scale. Then write `best_range(reading, specs, margin=1.0)`: the index in the list `specs` of the gauge with the smallest relative uncertainty among those whose full scale is at least margin × |reading| (ties go to the earlier gauge); raise `ValueError` if no gauge qualifies. Finally write `usable_range(spec, max_rel)`: the smallest reading (a positive plain float) at which the relative uncertainty is at most `max_rel` (a fraction, e.g. 0.01 for 1%), or `None` if even a full-scale reading is worse than that.

```python starter
def uncertainty(reading, spec):
    return 0.0

def relative_uncertainty(reading, spec):
    return 0.0

def best_range(reading, specs, margin=1.0):
    return 0

def usable_range(spec, max_rel):
    return None

specs = [(10, 0.25, 0.25, 0.01), (25, 0.25, 0.25, 0.01), (100, 0.25, 0.25, 0.1)]
print(best_range(1.0, specs), usable_range(specs[0], 0.01))
```

```python solution
def uncertainty(reading, spec):
    fs, a_rd, a_fs, res = spec
    return float(a_rd / 100 * abs(reading) + a_fs / 100 * fs + res / 2)

def relative_uncertainty(reading, spec):
    if reading == 0 or abs(reading) > spec[0]:
        raise ValueError("reading must be non-zero and within the range")
    return float(uncertainty(reading, spec) / abs(reading))

def best_range(reading, specs, margin=1.0):
    best = None
    for i, spec in enumerate(specs):
        if spec[0] >= margin * abs(reading):
            rel = relative_uncertainty(reading, spec)
            if best is None or rel < best[0]:
                best = (rel, i)
    if best is None:
        raise ValueError("no gauge covers this reading")
    return best[1]

def usable_range(spec, max_rel):
    fs, a_rd, a_fs, res = spec
    fixed = a_fs / 100 * fs + res / 2
    room = max_rel - a_rd / 100
    if room <= 0:
        return None
    x = fixed / room
    return float(x) if x <= fs else None

specs = [(10, 0.25, 0.25, 0.01), (25, 0.25, 0.25, 0.01), (100, 0.25, 0.25, 0.1)]
print(best_range(1.0, specs), usable_range(specs[0], 0.01))
```

```python test
for _n in ["uncertainty", "relative_uncertainty", "best_range", "usable_range"]:
    assert _n in dir(), f"Define {_n}."
_specs = [(10, 0.25, 0.25, 0.01), (25, 0.25, 0.25, 0.01), (100, 0.25, 0.25, 0.1)]
_u = uncertainty(1.0, _specs[0])
assert type(_u) is float and abs(_u - 0.0325) < 1e-12, f"1 bar on the 10 bar gauge: ±0.0325; got {_u}."
assert abs(uncertainty(-5.0, _specs[2]) - 0.3125) < 1e-12, "Use the size of the reading."
assert abs(relative_uncertainty(1.0, _specs[2]) - 0.3025) < 1e-12 and abs(relative_uncertainty(9.0, _specs[0]) - 0.0525 / 9) < 1e-12, "Relative uncertainties."
for _bad in [(0.0, _specs[0]), (12.0, _specs[0])]:
    try:
        relative_uncertainty(*_bad)
        assert False, f"relative_uncertainty{_bad} should raise ValueError."
    except ValueError:
        pass
assert best_range(1.0, _specs) == 0 and best_range(20.0, _specs) == 1 and best_range(60.0, _specs) == 2, "The smallest range that covers the reading wins here."
assert best_range(9.0, _specs, margin=1.25) == 1, "With a 25% overload margin, 9 bar needs the 25 bar gauge."
_mixed = [(100, 0.05, 0.0, 0.0), (10, 0.5, 0.5, 0.01)]
assert best_range(5.0, _mixed) == 0, "A precise %-of-reading gauge can beat a smaller but sloppier one."
assert best_range(2.0, [(10, 0.25, 0.25, 0.01), (10, 0.25, 0.25, 0.01)]) == 0, "Ties go to the earlier gauge."
try:
    best_range(150.0, _specs)
    assert False, "No gauge covers 150 bar: ValueError."
except ValueError:
    pass
_x = usable_range(_specs[0], 0.01)
assert type(_x) is float and abs(_x - 0.03 / 0.0075) < 1e-9, f"The 10 bar gauge reaches 1% at 4 bar; got {_x}."
assert abs(relative_uncertainty(_x, _specs[0]) - 0.01) < 1e-12, "At that reading the relative uncertainty is exactly the limit."
assert usable_range(_specs[2], 0.001) is None and usable_range((10, 1.0, 0.0, 0.0), 0.005) is None, "Too strict a limit: None."
assert abs(usable_range((10, 0.0, 0.1, 0.0), 0.05) - 0.2) < 1e-12, "Pure full-scale accuracy: 0.01 / 0.05 = 0.2."
"SUCCESS: A full-scale error is a fixed amount, so small readings on big ranges are poor: pick the range that keeps the relative uncertainty low."
```

Hint: The uncertainty is a fixed part (FS term plus half the resolution) plus a part proportional to the reading. Setting fixed/x + a_rd/100 = max_rel and solving for x gives the smallest usable reading, which must still be within the range.
:::

## What you learned

- A relative change divides by the starting value, so a rise and an equal percentage fall do not cancel, and the change that undoes c is 1/(1 + c) − 1.
- Successive changes multiply as factors; their honest average is the geometric mean rate, never more than the arithmetic mean.
- Log changes ln(new/old) are symmetric and add along a chain; for small changes they nearly equal relative changes.
- Real values divide by a price index; real and nominal rates combine as (1 + nominal)/(1 + inflation) − 1, and the compound annual growth rate summarises a period in one number.
- Relative error depends on the size of the quantity; instruments quoting accuracy in % of full scale are poor at small readings, so choose the range to fit the reading.

The next lesson checks formulas before computing anything, by their units: dimensional analysis.
