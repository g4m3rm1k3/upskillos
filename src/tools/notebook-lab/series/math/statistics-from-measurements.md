# Statistics from measurements

The previous lesson started from a known distribution and asked what data it would produce. Real work runs the other way: you have ten readings from a gauge and need to say what the true value is, and how sure you are. That is **statistics**: estimating a distribution's properties from a sample, and attaching an honest uncertainty. This lesson computes the sample mean and standard deviation (and finds why the standard deviation divides by n − 1), shows how averaging shrinks uncertainty, builds a confidence interval, handles outliers robustly, and reports a measurement the way a calibration certificate would.

This lesson covers:

- sample mean and sample standard deviation, and the n − 1 correction;
- the standard error: how averaging reduces uncertainty;
- confidence intervals with the t distribution;
- the median and robust statistics for data with outliers;
- checking a gauge against a reference standard, and reporting results.

## Sample mean and spread

::: math
\[ \bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i, \qquad s = \sqrt{\frac{\sum_i (x_i - \bar{x})^2}{n - 1}} \]
- dividing by $n$ underestimates the variance by the factor $\dfrac{n - 1}{n}$; $n - 1$ is Bessel's correction
- $s$: sample standard deviation, an estimate of the true $\sigma$
In code: `readings.mean()` and `readings.std(ddof=1)`; plain `std()` divides by $n$
:::


Ten readings x₁, ..., x_n of the same quantity estimate its true mean μ by the **sample mean** x̄ = Σxᵢ/n. The spread is estimated by the **sample standard deviation**

\[ s = \sqrt{\frac{\sum (x_i - \bar{x})^2}{n - 1}} \]

Why n − 1 rather than n? The deviations are measured from x̄, which is itself fitted to the same data, and the data are always closer to their own mean than to the true μ. Dividing by n therefore underestimates the variance on average; dividing by n − 1 (**Bessel's correction**) removes that bias exactly. NumPy's `np.std` divides by n unless told `ddof=1`. Predict before running: for samples of 5 from a distribution with variance 1, what is the average of each variance estimate?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

readings = np.array([25.0042, 25.0031, 25.0018, 25.0037, 25.0025, 25.0049, 25.0029, 25.0033, 25.0021, 25.0040])
print(f"mean {readings.mean():.5f} mm, sd (n-1) {readings.std(ddof=1):.5f} mm, sd (n) {readings.std():.5f} mm")

rng = np.random.default_rng(28)
samples = rng.normal(0, 1, size=(200_000, 5))
print(f"average variance estimate over 200,000 samples of 5: divide by n {samples.var(axis=1).mean():.4f}, divide by n-1 {samples.var(axis=1, ddof=1).mean():.4f}  (true 1)")
```

```output
mean 25.00325 mm, sd (n-1) 0.00097 mm, sd (n) 0.00092 mm
average variance estimate over 200,000 samples of 5: divide by n 0.7989, divide by n-1 0.9987  (true 1)
```

`ddof=1` ("delta degrees of freedom") makes NumPy divide by n − 1.

The gauge readings average 25.00325 mm with a sample standard deviation of 0.00097 mm. Dividing by n gives the smaller 0.00092 mm. The simulation shows the bias plainly: dividing by n averages 0.80 for samples of 5, which is (n − 1)/n of the truth, while n − 1 averages 1.00. With small samples the difference matters; with thousands it does not.

## Averaging and the standard error

::: math
\[ \text{Var}(\bar{x}) = \frac{\sigma^2}{n}, \qquad \text{SE} = \frac{\sigma}{\sqrt{n}} \approx \frac{s}{\sqrt{n}} \]
- the mean of $n$ readings scatters $\sqrt{n}$ times less than one reading
- averaging cannot remove a systematic error
In code: `readings.std(ddof=1) / math.sqrt(len(readings))`
:::


Individual readings scatter with standard deviation σ, but their **mean** scatters much less. Variances of independent readings add, so the sum of n readings has variance nσ², and the mean (the sum divided by n) has variance σ²/n. Its standard deviation, the **standard error**

\[ \text{SE} = \frac{\sigma}{\sqrt{n}} \approx \frac{s}{\sqrt{n}} \]

shrinks like 1/√n, the same law as for simulated frequencies. Four times the readings halve the uncertainty. Predict before running: how many readings make the mean ten times more precise than a single reading?

```python type
sigma = 0.001
for n in [1, 4, 10, 100]:
    means = rng.normal(25.0, sigma, size=(50_000, n)).mean(axis=1)
    print(f"n = {n:>3}: sd of the mean {means.std():.6f} mm, σ/√n = {sigma / math.sqrt(n):.6f} mm")
print(f"standard error of the gauge readings: {readings.std(ddof=1) / math.sqrt(len(readings)):.6f} mm")
```

```output
n =   1: sd of the mean 0.000993 mm, σ/√n = 0.001000 mm
n =   4: sd of the mean 0.000502 mm, σ/√n = 0.000500 mm
n =  10: sd of the mean 0.000316 mm, σ/√n = 0.000316 mm
n = 100: sd of the mean 0.000100 mm, σ/√n = 0.000100 mm
standard error of the gauge readings: 0.000308 mm
```

Each row simulates 50,000 sets of n readings and measures how much their means scatter.

The scatter of the mean follows σ/√n exactly: a hundred readings make the mean ten times more precise than one. For the ten gauge readings the standard error is 0.00031 mm. Note what averaging cannot fix: a gauge that reads 0.002 mm high reads high in every reading, and averaging keeps that **systematic error** intact. Only calibration against a reference removes it.

## Confidence intervals

::: math
\[ \bar{x} \pm t_{n-1}\,\frac{s}{\sqrt{n}}, \qquad t_{n-1} \approx 2.26 \;(n = 10), \quad 2.78 \;(n = 5) \]
- the $t$ multiplier allows for estimating $\sigma$ by $s$; for large $n$ it approaches 1.96
- a 95% interval contains the true mean in 95% of repeated experiments
In code: `t_interval(x)` uses `stats.t.ppf(0.5 + level / 2, n - 1)`
:::


A **confidence interval** puts the standard error to work: an interval computed from the data that, over many repetitions of the measurement, contains the true mean a chosen fraction of the time (say 95%). For large samples it is x̄ ± 1.96 SE. For small samples, using s in place of the unknown σ adds uncertainty, and the multiplier comes from the **t distribution** with n − 1 degrees of freedom, which is wider than the normal: about 2.26 for n = 10, 2.78 for n = 5. Predict before running: do 95% intervals really contain the true value 95% of the time?

```python type
def t_interval(x, level=0.95):
    n = len(x)
    se = x.std(ddof=1) / math.sqrt(n)
    t = stats.t.ppf(0.5 + level / 2, n - 1)
    return x.mean() - t * se, x.mean() + t * se

lo, hi = t_interval(readings)
print(f"95% interval for the shaft: {lo:.5f} to {hi:.5f} mm")
print(f"t multipliers: n=5 {stats.t.ppf(0.975, 4):.3f}, n=10 {stats.t.ppf(0.975, 9):.3f}, n=100 {stats.t.ppf(0.975, 99):.3f}, normal {stats.norm.ppf(0.975):.3f}")

true_mu, hits, z_hits = 25.0, 0, 0
for _ in range(20_000):
    x = rng.normal(true_mu, 0.001, size=5)
    lo, hi = t_interval(x)
    hits += lo <= true_mu <= hi
    se = x.std(ddof=1) / math.sqrt(5)
    z_hits += abs(x.mean() - true_mu) <= 1.96 * se
print(f"samples of 5: t intervals cover the truth {hits / 20_000:.1%} of the time; ±1.96 SE covers it {z_hits / 20_000:.1%}")
```

```output
95% interval for the shaft: 25.00255 to 25.00395 mm
t multipliers: n=5 2.776, n=10 2.262, n=100 1.984, normal 1.960
samples of 5: t intervals cover the truth 95.0% of the time; ±1.96 SE covers it 88.0%
```

`stats.t.ppf(0.975, n - 1)` is the point below which 97.5% of the t distribution lies, leaving 2.5% in each tail for a 95% interval.

The shaft's 95% interval is 25.00255 to 25.00395 mm. With samples of 5, the t interval covers the true value 95% of the time, as promised, while the normal multiplier 1.96 covers it only about 88%: too confident, because it ignores the uncertainty in s itself. With 100 readings the t multiplier is 1.98, almost the normal value.

## Outliers and robust statistics

::: math
\[ \text{MAD} = \operatorname{median}_i |x_i - \tilde{x}|, \qquad z_i = \frac{0.6745\,(x_i - \tilde{x})}{\text{MAD}} \]
- $\tilde{x}$: the median, robust to a wild value; $\sigma \approx \text{MAD}/0.6745$ for normal data
- $|z_i| > 3.5$ flags a likely outlier
In code: `mad = np.median(np.abs(bad - np.median(bad)))`, then `z = 0.6745 * (bad - np.median(bad)) / mad`
:::


One mistyped reading can wreck a mean: 25.0035 typed as 25.035 shifts the average of ten readings by 0.003 mm, more than the whole spread. The **median**, the middle value of the sorted data, barely moves, and so is called **robust**. A robust spread measure is the **median absolute deviation** (MAD): the median of |xᵢ − median|. For normal data σ ≈ MAD/0.6745, so a reading whose **modified z-score**, 0.6745 (x − median)/MAD, exceeds about 3.5 in size is a likely outlier. Predict before running: with one typing error, how far off are the mean and the median?

```python type
bad = readings.copy()
bad[3] = 25.037
mad = np.median(np.abs(bad - np.median(bad)))
z = 0.6745 * (bad - np.median(bad)) / mad
print(f"mean {bad.mean():.5f} (was {readings.mean():.5f}), median {np.median(bad):.5f} (was {np.median(readings):.5f})")
print(f"sd {bad.std(ddof=1):.5f} (was {readings.std(ddof=1):.5f}), MAD-based sd {mad / 0.6745:.5f}")
print("modified z-scores:", np.round(z, 1))
print("flagged as outliers:", bad[np.abs(z) > 3.5])
```

```output
mean 25.00658 (was 25.00325), median 25.00320 (was 25.00320)
sd 0.01073 (was 0.00097), MAD-based sd 0.00133
modified z-scores: [ 0.7 -0.1 -1.  25.3 -0.5  1.3 -0.2  0.1 -0.8  0.6]
flagged as outliers: [25.037]
```

The modified z-score is like a standard score, but built from the median and MAD, so the outlier cannot hide itself by inflating the spread it is judged against.

One bad value moves the mean by 0.0033 mm and inflates the standard deviation more than tenfold, to 0.0107 mm, while the median does not move at all (the changed reading was already above the middle) and the MAD-based spread, 0.00133 mm, stays the same order as the clean data's 0.00097 mm, while the standard deviation grows elevenfold. The typing error scores a modified z of about 25, far beyond 3.5, and is flagged immediately. The right response is to investigate and correct it, not to delete inconvenient data silently.

## Checking a gauge and reporting

::: math
\[ \text{bias} = \bar{x} - x_\text{ref}, \qquad \text{significant if } x_\text{ref} \notin \left[\bar{x} - t\,\text{SE},\; \bar{x} + t\,\text{SE}\right] \]
- report value ± uncertainty, the uncertainty to one or two significant figures
- round the value to the same decimal place as the uncertainty
In code: `t_interval(block)`, then `lo <= 25.0 <= hi`
:::


To check a gauge for **bias**, measure a reference standard of known size several times. If the confidence interval for the mean reading excludes the reference value, the gauge is biased by more than chance would explain. Results are then reported as value ± uncertainty, with the uncertainty rounded to one or two significant figures and the value rounded to the same decimal place: more digits would claim precision the data do not have. Predict before running: a 25.0000 mm gauge block reads as below. Is the gauge biased?

```python type
block = np.array([25.0021, 25.0012, 25.0018, 25.0025, 25.0016, 25.0019, 25.0023, 25.0014])
lo, hi = t_interval(block)
bias = block.mean() - 25.0
print(f"mean reading {block.mean():.5f}, 95% interval {lo:.5f} to {hi:.5f}")
print(f"bias {bias * 1000:+.2f} µm:", "significant (the interval excludes 25.0000)" if not lo <= 25.0 <= hi else "not significant")

half = (hi - lo) / 2
decimals = -int(math.floor(math.log10(half))) + 1
print(f"report: {round(block.mean(), decimals):.{decimals}f} ± {round(half, decimals):.{decimals}f} mm (95%)")
```

```output
mean reading 25.00185, 95% interval 25.00148 to 25.00222
bias +1.85 µm: significant (the interval excludes 25.0000)
report: 25.00185 ± 0.00037 mm (95%)
```

The reported uncertainty is the interval's half-width rounded to two significant figures; `decimals` is the number of decimal places that keeps two significant figures of it.

The gauge reads 1.85 µm high, and the interval, 25.0015 to 25.0022 mm, excludes the true 25.0000 mm: a real bias, to be corrected by recalibration (or subtracted from future readings). The report reads 25.00185 ± 0.00037 mm: the mean is given to the same decimal place as the uncertainty, and no further.

::: challenge Sample statistics [easy]
Write `sample_stats(xs)` returning a dict with `"n"` (an int), `"mean"`, `"sd"` (sample standard deviation, dividing by n − 1) and `"se"` (standard error, sd/√n), the last three as plain floats rounded to 6 decimal places. Raise `ValueError` for fewer than 2 values. Inputs may be lists or arrays. Then write `readings_for_se(sd, target_se)`, the smallest whole number of readings whose standard error sd/√n is at most `target_se`, raising `ValueError` if either is not positive.

```python starter
def sample_stats(xs):
    return {"n": len(xs), "mean": 0.0, "sd": 0.0, "se": 0.0}

def readings_for_se(sd, target_se):
    return 1

print(sample_stats([25.0042, 25.0031, 25.0018, 25.0037]))
```

```python solution
def sample_stats(xs):
    x = np.asarray(xs, dtype=float)
    if len(x) < 2:
        raise ValueError("need at least 2 values")
    sd = float(x.std(ddof=1))
    return {"n": int(len(x)), "mean": round(float(x.mean()), 6), "sd": round(sd, 6), "se": round(sd / math.sqrt(len(x)), 6)}

def readings_for_se(sd, target_se):
    if sd <= 0 or target_se <= 0:
        raise ValueError("sd and target must be positive")
    n = max(1, math.ceil((sd / target_se) ** 2))
    while n > 1 and sd / math.sqrt(n - 1) <= target_se:
        n -= 1
    while sd / math.sqrt(n) > target_se:
        n += 1
    return n

print(sample_stats([25.0042, 25.0031, 25.0018, 25.0037]))
```

```python test
for _n in ["sample_stats", "readings_for_se"]:
    assert _n in dir(), f"Define {_n}."
_s = sample_stats([2, 4, 4, 4, 5, 5, 7, 9])
assert _s == {"n": 8, "mean": 5.0, "sd": 2.13809, "se": 0.755929}, f"Got {_s}."
assert type(_s["n"]) is int and all(type(_s[_k]) is float for _k in ("mean", "sd", "se")), "n is an int; the rest are plain floats."
assert sample_stats(np.array([1.0, 1.0])) == {"n": 2, "mean": 1.0, "sd": 0.0, "se": 0.0}, "Identical readings have no spread."
try:
    sample_stats([3.0])
    assert False, "One value should raise ValueError."
except ValueError:
    pass
assert readings_for_se(0.001, 0.0005) == 4 and readings_for_se(0.001, 0.0001) == 100 and readings_for_se(1, 0.3) == 12, "n ≥ (sd / target)²."
assert readings_for_se(1, 2) == 1, "One reading already beats a loose target."
assert readings_for_se(0.001, 0.001 / math.sqrt(2)) == 2, "Two readings exactly meet this target: check the neighbouring n, since (sd / target)² comes out as 2.0000000000000004."
for _bad in [(0, 1), (1, 0)]:
    try:
        readings_for_se(*_bad)
        assert False, f"readings_for_se{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Divide by n − 1 for an unbiased variance, and by √n for the mean's uncertainty: precision costs readings squared."
```

Hint: `np.std(x, ddof=1)` divides by n − 1. For the number of readings, sd/√n ≤ target means n ≥ (sd/target)²; round up, then check neighbouring values against floating-point rounding.
:::

::: challenge Intervals and reports [medium]
Write `t_interval(xs, level=0.95)` returning `(low, high)` as plain floats, using `scipy.stats.t.ppf` with n − 1 degrees of freedom; raise `ValueError` for fewer than 2 values or a level outside (0, 1). Then write `report(xs, unit, level=0.95)` returning a string like `"25.00325 ± 0.00070 mm"`: the uncertainty is the interval's half-width rounded to **2 significant figures**, and the mean is rounded to the same number of decimal places; both are printed with exactly that many decimal places (and no decimal point if that number is 0 or less, in which case round both to the corresponding power of ten, for example 1234 ± 46 or 12300 ± 4500). If the half-width is 0 (identical values), report the mean with 6 decimal places and `± 0`; note that `scipy.stats.t.interval` returns nan in that case, so compute mean ± t × SE yourself.

```python starter
def t_interval(xs, level=0.95):
    x = np.asarray(xs, dtype=float)
    return (float(x.min()), float(x.max()))

def report(xs, unit, level=0.95):
    return f"{np.mean(xs)} {unit}"

r = [25.0042, 25.0031, 25.0018, 25.0037, 25.0025, 25.0049, 25.0029, 25.0033, 25.0021, 25.0040]
print(t_interval(r), report(r, "mm"))
```

```python solution
def t_interval(xs, level=0.95):
    x = np.asarray(xs, dtype=float)
    if len(x) < 2 or not 0 < level < 1:
        raise ValueError("need at least 2 values and 0 < level < 1")
    se = x.std(ddof=1) / math.sqrt(len(x))
    t = stats.t.ppf(0.5 + level / 2, len(x) - 1)
    return (float(x.mean() - t * se), float(x.mean() + t * se))

def report(xs, unit, level=0.95):
    lo, hi = t_interval(xs, level)
    mean, half = (lo + hi) / 2, (hi - lo) / 2
    if half == 0:
        return f"{mean:.6f} ± 0 {unit}"
    decimals = -int(math.floor(math.log10(half))) + 1
    if decimals > 0:
        return f"{round(mean, decimals):.{decimals}f} ± {round(half, decimals):.{decimals}f} {unit}"
    return f"{int(round(mean, decimals))} ± {int(round(half, decimals))} {unit}"

r = [25.0042, 25.0031, 25.0018, 25.0037, 25.0025, 25.0049, 25.0029, 25.0033, 25.0021, 25.0040]
print(t_interval(r), report(r, "mm"))
```

```python test
for _n in ["t_interval", "report"]:
    assert _n in dir(), f"Define {_n}."
_r = [25.0042, 25.0031, 25.0018, 25.0037, 25.0025, 25.0049, 25.0029, 25.0033, 25.0021, 25.0040]
_lo, _hi = t_interval(_r)
assert abs(_lo - 25.0025538) < 1e-6 and abs(_hi - 25.0039462) < 1e-6 and type(_lo) is float, f"Got {(_lo, _hi)}."
_lo9, _hi9 = t_interval(_r, 0.99)
assert _lo9 < _lo and _hi9 > _hi, "A 99% interval is wider."
for _bad in [([1.0], 0.95), (_r, 1.0), (_r, 0)]:
    try:
        t_interval(*_bad)
        assert False, f"t_interval with {_bad[1]} and {len(_bad[0])} values should raise ValueError."
    except ValueError:
        pass
assert report(_r, "mm") == "25.00325 ± 0.00070 mm", f"Got {report(_r, 'mm')!r}."
assert report([1200, 1250, 1210, 1270, 1240], "N") == "1234 ± 36 N", f"Got {report([1200, 1250, 1210, 1270, 1240], 'N')!r}."
assert report([10000, 15000, 12000, 14100], "Pa") == "12800 ± 3600 Pa", f"Large numbers round to hundreds here; got {report([10000, 15000, 12000, 14100], 'Pa')!r}."
assert report([5.0, 5.0, 5.0], "V") == "5.000000 ± 0 V", "No spread."
"SUCCESS: A t interval for honest uncertainty, and a report that quotes the value only as precisely as the uncertainty allows."
```

Hint: The number of decimal places that gives two significant figures of the half-width h is 1 − floor(log₁₀ h). Round both numbers to it, and format with that many places.
:::

::: challenge Robust checks [hard]
Write `modified_z(xs)` returning a NumPy array of modified z-scores, 0.6745 (x − median)/MAD; raise `ValueError` if the MAD is 0 (more than half the values identical). Write `clean_mean(xs, threshold=3.5)`: remove values whose |modified z| exceeds the threshold (once, not repeatedly) and return `(mean, removed)`, the mean of the rest as a plain float rounded to 6 decimal places and the list of removed values in their original order. Then write `bias_check(xs, reference, level=0.95)` returning `(bias, significant)`: the bias is the mean minus the reference, rounded to 6 decimal places, and `significant` (a plain `bool`) is True when the t interval at that level excludes the reference. Use your `t_interval` logic or `scipy.stats` (the test does not depend on the previous challenge).

```python starter
def modified_z(xs):
    x = np.asarray(xs, dtype=float)
    return np.zeros(len(x))

def clean_mean(xs, threshold=3.5):
    return (float(np.mean(xs)), [])

def bias_check(xs, reference, level=0.95):
    return (0.0, False)

print(clean_mean([25.0042, 25.0031, 25.037, 25.0025]))
```

```python solution
def modified_z(xs):
    x = np.asarray(xs, dtype=float)
    med = np.median(x)
    mad = np.median(np.abs(x - med))
    if mad == 0:
        raise ValueError("the MAD is zero: modified z-scores are undefined")
    return 0.6745 * (x - med) / mad

def clean_mean(xs, threshold=3.5):
    x = np.asarray(xs, dtype=float)
    z = modified_z(x)
    keep = np.abs(z) <= threshold
    return (round(float(x[keep].mean()), 6), [float(v) for v in x[~keep]])

def bias_check(xs, reference, level=0.95):
    x = np.asarray(xs, dtype=float)
    if len(x) < 2:
        raise ValueError("need at least 2 values")
    se = x.std(ddof=1) / math.sqrt(len(x))
    t = stats.t.ppf(0.5 + level / 2, len(x) - 1)
    lo, hi = x.mean() - t * se, x.mean() + t * se
    return (round(float(x.mean() - reference), 6), bool(not lo <= reference <= hi))

print(clean_mean([25.0042, 25.0031, 25.037, 25.0025]))
```

```python test
for _n in ["modified_z", "clean_mean", "bias_check"]:
    assert _n in dir(), f"Define {_n}."
_r = [25.0042, 25.0031, 25.0018, 25.0037, 25.0025, 25.0049, 25.0029, 25.0033, 25.0021, 25.0040]
_bad = list(_r); _bad[3] = 25.037
_z = modified_z(_bad)
assert isinstance(_z, np.ndarray) and abs(_z[3]) > 20 and np.abs(np.delete(_z, 3)).max() < 2.5, "The typing error stands out."
assert np.allclose(modified_z([1, 2, 3, 4, 100]), 0.6745 * (np.array([1, 2, 3, 4, 100]) - 3) / 1), "Median 3, MAD 1."
try:
    modified_z([5, 5, 5, 6])
    assert False, "A zero MAD should raise ValueError."
except ValueError:
    pass
_m, _rem = clean_mean(_bad)
assert _rem == [25.037] and abs(_m - round(float(np.mean(np.delete(np.array(_bad), 3))), 6)) < 1e-12 and type(_m) is float, f"Got {(_m, _rem)}."
assert clean_mean(_r) == (round(float(np.mean(_r)), 6), []), "Clean data: nothing removed."
assert clean_mean([1, 2, 3, 4, 100, -90])[1] == [100.0, -90.0], "Removed values in their original order."
_block = [25.0021, 25.0012, 25.0018, 25.0025, 25.0016, 25.0019, 25.0023, 25.0014]
assert bias_check(_block, 25.0) == (0.00185, True), f"The gauge block; got {bias_check(_block, 25.0)}."
assert bias_check(_block, 25.0018)[1] is False, "A reference inside the interval: no significant bias."
assert bias_check([10.1, 9.9, 10.0, 10.2, 9.8], 10.0) == (0.0, False), "Unbiased."
"SUCCESS: The median and MAD expose outliers that a mean and standard deviation would hide, and a t interval decides whether a gauge's bias is real."
```

Hint: Compute the median, then the MAD as the median of absolute deviations from it. Keep values with |z| ≤ threshold. For the bias, build the t interval and test whether the reference lies inside it.
:::

## What you learned

- The sample mean estimates μ; the sample variance divides by n − 1 because data sit closer to their own mean than to the true one (this makes the variance unbiased; its square root s still slightly underestimates σ for small samples).
- The standard error s/√n is the uncertainty of the mean; averaging four times as many readings halves it, but never removes systematic error.
- Confidence intervals use the t distribution for small samples; ±1.96 SE is too narrow when s is estimated from a handful of readings.
- The median and MAD are robust to outliers; modified z-scores above about 3.5 flag readings worth investigating.
- A gauge is biased when the interval for its readings of a reference excludes the reference. Report value ± uncertainty, with the uncertainty to two significant figures and the value to match.

The next lesson fits a line to measurements by least squares, with uncertainties for its slope and intercept.
