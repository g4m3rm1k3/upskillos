# Arrays: computing on many values

A temperature sensor logging once a second produces 86,400 readings a day. A vibration probe at 10 kHz produces that many in under ten seconds. Mathematics on data means applying the same formula to every value, summarising thousands of numbers into a few, selecting the ones that matter and comparing neighbours. Python lists can do all of this with loops, but slowly and verbosely. **NumPy arrays** do it in one expression per idea, at the speed of compiled code. Nearly all scientific Python, including everything later in this series, is built on them, and they are also how mathematics writes it: a formula applied to a whole vector at once.

This lesson covers:

- creating arrays and applying formulas to every element at once;
- summarising data: mean, extremes, spread and where they occur;
- selecting with boolean masks, and handling missing values;
- differences and running totals: rates from positions, totals from rates;
- two-dimensional arrays, the axis argument, and the dtype trap.

## Formulas on whole arrays

::: math
\[ \mathbf{T} = 20 + 70\, e^{-0.05\,\mathbf{t}}, \qquad (\mathbf{a} + \mathbf{b})_i = a_i + b_i, \qquad (c\,\mathbf{a})_i = c\,a_i \]
- $\mathbf{t} = (t_0, t_1, \ldots)$: a whole array of times; the formula applies to each element
- a single number combined with an array applies to every element (broadcasting)
In code: `20 + 70 * np.exp(-0.05 * t)` with `t = np.linspace(0, 60, 7)`
:::


An array holds many numbers of one type. Arithmetic on arrays works **element by element**: `a + b` adds matching elements, `a * 2` doubles every element, and `np.exp(a)` takes the exponential of each. Combining an array with a single number applies the number to every element (this is called **broadcasting**). No loop is written, yet every value is computed.

`np.linspace(start, stop, n)` makes n evenly spaced values with both ends included, the array version of the previous lesson's `sample`. Predict before running: how much faster is NumPy than a Python loop over a million values?

```python type
import math
import time
import numpy as np

t = np.linspace(0, 60, 7)
T = 20 + 70 * np.exp(-0.05 * t)
print("t:", t)
print("T:", np.round(T, 1))

many = np.linspace(0, 60, 1_000_000)
start = time.perf_counter()
loop = [20 + 70 * math.exp(-0.05 * x) for x in many.tolist()]
loop_time = time.perf_counter() - start
start = time.perf_counter()
vector = 20 + 70 * np.exp(-0.05 * many)
vector_time = time.perf_counter() - start
print("same answers:", np.allclose(loop, vector), f"  NumPy faster by a factor of about {loop_time / vector_time:.0f}" if loop_time > 10 * vector_time else "")
```

`np.round(T, 1)` rounds every element; `np.allclose` checks that two sequences agree to within floating-point tolerance.

The cooling formula from the previous lesson is written exactly as in mathematics, `20 + 70 * np.exp(-0.05 * t)`, and returns all seven temperatures. On a million values NumPy is typically tens of times faster than the loop (the exact factor depends on the machine), because the looping happens inside compiled code instead of the Python interpreter. Note `np.exp`, not `math.exp`: the `math` functions accept only single numbers.

## Summarising a log

::: math
\[ \bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i, \qquad \sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n} (x_i - \bar{x})^2} \]
- $\bar{x}$: the mean; $\sigma$: the standard deviation (spread)
- $\arg\max_i x_i$: the position $i$ of the largest value
In code: `log.mean()`, `log.std()`, `log.argmax()`
:::


A sensor log is summarised by a few numbers: the **mean** (the average level), the **minimum** and **maximum**, and the **standard deviation**, a measure of spread covered properly in the statistics block. `argmax` and `argmin` give the **position** of the extreme, which is often the more useful fact: not just "the peak was 81 °C" but "the peak was at 14:02".

To have realistic data, the demo simulates a bearing's temperature: a slow warm-up plus random sensor noise from a seeded random generator, so every run gives the same numbers. Predict before running: is the mean of the noisy log close to the mean of the smooth trend?

```python type
rng = np.random.default_rng(7)
seconds = np.arange(0, 600)
trend = 25 + 40 * (1 - np.exp(-seconds / 200))
log = trend + rng.normal(0, 0.8, size=seconds.size)

print(f"{log.size} readings, mean {log.mean():.2f} °C (trend mean {trend.mean():.2f})")
print(f"min {log.min():.2f} °C at {log.argmin()} s, max {log.max():.2f} °C at {log.argmax()} s")
print(f"standard deviation of the noise: {(log - trend).std():.3f} °C")
```

```output
600 readings, mean 52.19 °C (trend mean 52.30)
min 24.88 °C at 3 s, max 64.21 °C at 581 s
standard deviation of the noise: 0.737 °C
```

`np.arange(0, 600)` is the integers 0 to 599, like `range`. `rng.normal(0, 0.8, size=n)` draws n random values centred on 0 with spread 0.8.

The noisy mean, 52.19 °C, is within about 0.1 °C of the trend's 52.30, although single readings scatter by about 0.7 °C: averaging 600 readings cancels most of the noise. The maximum, 64.21 °C at 581 s, falls near the end of the log, where the bearing is hottest, but not at the last second. The noise picks which sample is highest, which is why a single extreme reading says less than the mean.

## Selecting with masks

::: math
\[ \text{count} = \sum_i [x_i > c], \qquad \text{fraction} = \frac{1}{n}\sum_i [x_i > c] \]
- $[x_i > c]$ is 1 when the condition holds and 0 otherwise: a mask
- gaps ($\text{nan}$) are excluded from the mean: $\bar{x} = \text{mean of the non-nan } x_i$
In code: `(log > 60).sum()`, `(log > 60).mean()` and `np.nanmean(gappy)`
:::


Comparing an array with a value gives an array of `True` and `False`, a **boolean mask**. Using a mask as an index selects the elements where it is `True`. Because `True` counts as 1, `mask.sum()` counts them and `mask.mean()` gives the fraction. This one idea replaces most filtering loops.

Real logs have gaps: a sensor that drops out records `nan`, "not a number". Any arithmetic with `nan` gives `nan`, so a plain `mean()` of a log with one gap is `nan`. `np.isnan` builds a mask of the gaps, and `np.nanmean` and friends ignore them. Predict before running: for how many seconds was the bearing above 60 °C, and what is the mean after two dropouts?

```python type
hot = log > 60
print("above 60 °C:", hot.sum(), "s, which is", f"{hot.mean():.1%}", "of the log; first at", np.argmax(hot), "s")
print("readings between 40 and 41 °C:", log[(log >= 40) & (log < 41)].round(2))

gappy = log.copy()
gappy[[100, 350]] = np.nan
print("plain mean:", gappy.mean(), "  nanmean:", round(np.nanmean(gappy), 2), "  gaps:", np.isnan(gappy).sum())
```

```output
above 60 °C: 176 s, which is 29.3% of the log; first at 375 s
readings between 40 and 41 °C: [40.17 40.16 40.72 40.59 40.65 40.5  40.14 40.55 40.84]
plain mean: nan   nanmean: 52.2   gaps: 2
```

Combine masks with `&` (and), `|` (or) and `~` (not), with parentheses around each comparison. `np.argmax` of a mask gives the first `True`. `log.copy()` makes an independent array: without it, `gappy = log` would be a second name for the same array, and writing `nan` into it would change `log` too.

The bearing was above 60 °C for 176 seconds, 29.3% of the log, first at 375 s. Two `nan` gaps turn the plain mean into `nan`, while `nanmean` still gives 52.2. In real data analysis, counting the gaps (`np.isnan(x).sum()`) before averaging is a basic check.

## Differences and running totals

::: math
\[ v_i = \frac{x_{i+1} - x_i}{t_{i+1} - t_i}, \qquad E_k = \sum_{i=0}^{k} P_i\,\Delta t \]
- differences turn positions into speeds; running totals turn power into energy
- the two undo each other: $x_0 + \sum_{i<k} (x_{i+1} - x_i) = x_k$
In code: `np.diff(position) / np.diff(times)` and `np.cumsum(power_kw * 0.5)`
:::


Two operations connect a log to rates and totals, and they are the computational heart of calculus, which arrives in a few lessons. `np.diff(x)` gives the differences between neighbours, x[1] − x[0], x[2] − x[1], and so on, an array one shorter. Dividing the differences of position by the differences of time gives speed. `np.cumsum(x)` gives the **running total**: adding up a power reading each second gives the energy used so far. The two undo each other, as subtraction undoes addition.

A conveyor's encoder logs its position every half second. Predict before running: what was the top speed, and how far did the belt travel?

```python type
times = np.arange(0, 6.5, 0.5)
position = np.array([0.00, 0.05, 0.20, 0.45, 0.80, 1.20, 1.60, 2.00, 2.40, 2.75, 3.00, 3.15, 3.20])
speed = np.diff(position) / np.diff(times)
print("speed (m/s):", speed.round(3))
print("top speed", round(speed.max(), 3), "m/s, held from", times[:-1][np.isclose(speed, speed.max())].min(), "s")

power_kw = np.array([0.5, 2.0, 2.0, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.6, 1.2, 0.6, 0.0])
energy_kj = np.cumsum(power_kw * 0.5)
print("energy used so far (kJ):", energy_kj)
print("cumsum undoes diff:", np.allclose(position[0] + np.cumsum(np.diff(position)), position[1:]))
```

```output
speed (m/s): [0.1 0.3 0.5 0.7 0.8 0.8 0.8 0.8 0.7 0.5 0.3 0.1]
top speed 0.8 m/s, held from 2.0 s
energy used so far (kJ): [0.25 1.25 2.25 3.15 4.05 4.95 5.85 6.75 7.65 8.45 9.05 9.35 9.35]
cumsum undoes diff: True
```

`np.arange(0, 6.5, 0.5)` gives 0, 0.5, ..., 6.0; the stop is excluded, so 6.5 ensures 6.0 is included. Each power sample lasts 0.5 s, so it contributes power × 0.5 kJ.

The speed rises to 0.8 m/s, holds it from 2.0 to 4.0 s (four equal values), and falls back to 0.1 m/s at the end. The rounding matters: the computed differences carry tiny floating-point errors, so the four 0.8s are not all exactly equal, which is why the demo finds the top speed with `np.isclose` rather than `==`. `times[:-1]` is the start time of each interval. The belt's total travel is the last position minus the first, 3.2 m. The energy total climbs to 9.35 kJ. Putting the running total of the differences back on the starting value recovers every position exactly, the discrete version of the fundamental theorem of calculus.

## Tables of readings, and the dtype trap

::: math
\[ \bar{x}_j = \frac{1}{n}\sum_{i} X_{ij} \;(\text{axis}=0), \qquad 200 + 100 \equiv 300 - 256 = 44 \pmod{256} \]
- $X_{ij}$: row $i$ (time), column $j$ (sensor); `axis=0` averages down each column
- an 8-bit unsigned integer stores results modulo 256, so large sums wrap around
In code: `three.mean(axis=0)`; convert with `.astype(int)` before arithmetic that may overflow
:::


Several sensors logged together form a **two-dimensional array**: one row per time, one column per sensor. `data[:, 2]` is the third sensor's column, `data[10]` is the eleventh row. Summaries take an **axis**: `axis=0` collapses the rows, giving one value per sensor (per column); `axis=1` collapses the columns, giving one value per time.

Every array has a **dtype**, the type of all its elements. Integer dtypes have fixed sizes, and they **wrap around** silently when a result is too big: an 8-bit unsigned integer holds 0 to 255, so 200 + 100 is stored as 44. Image pixels are usually 8-bit, so brightening a photo with plain addition produces dark speckles. Predict before running: which sensor has the highest mean, and what is 200 + 100 in uint8?

```python type
three = np.column_stack([log, log - 5 + rng.normal(0, 0.5, log.size), 30 + 0.01 * seconds])
print("shape:", three.shape, " means per sensor:", three.mean(axis=0).round(2))
print("hottest sensor at t = 300 s:", three[300].argmax(), "  spread across sensors at t = 300 s:", round(np.ptp(three[300]), 2))

pixels = np.array([200, 120, 250], dtype=np.uint8)
print("uint8 + 100:", pixels + np.uint8(100), "  safe:", np.clip(pixels.astype(int) + 100, 0, 255))
```

```output
shape: (600, 3)  means per sensor: [52.19 47.19 32.99]
hottest sensor at t = 300 s: 0   spread across sensors at t = 300 s: 24.28
uint8 + 100: [ 44 220  94]   safe: [255 220 255]
```

`np.column_stack` places one-dimensional arrays side by side as columns. `np.ptp` is the range, max − min ("peak to peak"). `astype(int)` converts to a wide integer type before the arithmetic; `np.clip` then limits values to the valid range.

`axis=0` gives three means, one per sensor: 52.19, 47.19 and 32.99. At 300 s the first sensor reads highest. In 8-bit arithmetic 200 + 100 becomes 44 and 250 + 100 becomes 94, without any error or warning. Converting to a wider type first and clipping gives the intended 255. When an integer array produces strange values, check its dtype first.

::: challenge Cleaning and summarising a log [easy]
Write `clean(readings, low, high)` that takes a NumPy array and returns a new array with every `nan` and every reading outside `low` to `high` (inclusive) removed, in their original order. Then write `summary(readings, low, high)`, which cleans the readings and returns a dict with keys `"count"` (a plain Python `int`), `"mean"`, `"min"`, `"max"` (plain Python `float`s, rounded to 2 decimal places; convert NumPy numbers with `float(...)`) and `"rejected"`, the number of readings removed (an `int`). If nothing survives, raise `ValueError`. Use array operations only: no `for` or `while` loops and no comprehensions.

```python starter
def clean(readings, low, high):
    return readings

def summary(readings, low, high):
    good = clean(readings, low, high)
    return {"count": len(good)}

print(summary(np.array([20.5, np.nan, 21.0, 999.0, 20.0]), -40, 150))
```

```python solution
def clean(readings, low, high):
    readings = np.asarray(readings, dtype=float)
    keep = ~np.isnan(readings) & (readings >= low) & (readings <= high)
    return readings[keep]

def summary(readings, low, high):
    good = clean(readings, low, high)
    if good.size == 0:
        raise ValueError("no valid readings")
    return {
        "count": int(good.size),
        "mean": round(float(good.mean()), 2),
        "min": round(float(good.min()), 2),
        "max": round(float(good.max()), 2),
        "rejected": int(len(readings) - good.size),
    }

print(summary(np.array([20.5, np.nan, 21.0, 999.0, 20.0]), -40, 150))
```

```python test
import ast as _ast
for _n in ["clean", "summary"]:
    assert _n in dir(), f"Define {_n}."
_bad_nodes = (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp, _ast.SetComp, _ast.DictComp)
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, (_ast.FunctionDef)) and _node.name in ("clean", "summary"):
        assert not any(isinstance(_x, _bad_nodes) for _x in _ast.walk(_node)), f"{_node.name} should use array operations, not loops or comprehensions."
_r = np.array([20.5, np.nan, 21.0, 999.0, 20.0, -60.0, 150.0])
assert list(clean(_r, -40, 150)) == [20.5, 21.0, 20.0, 150.0], f"Remove nan and out-of-range values, keep the order; got {clean(_r, -40, 150)}."
assert summary(_r, -40, 150) == {"count": 4, "mean": 52.88, "min": 20.0, "max": 150.0, "rejected": 3}, f"Got {summary(_r, -40, 150)}."
_s = summary(_r, -40, 150)
assert type(_s["count"]) is int and type(_s["rejected"]) is int and type(_s["mean"]) is float, "count and rejected must be plain int and the others plain float: convert NumPy numbers with int(...) and float(...)."
assert summary(np.array([5.0]), 0, 10)["rejected"] == 0, "Nothing rejected."
try:
    summary(np.array([np.nan, 500.0]), 0, 100)
    assert False, "No valid readings should raise ValueError."
except ValueError:
    pass
"SUCCESS: One mask built from three conditions cleans a log of any length, with no loop in sight."
```

Hint: Build one mask: `~np.isnan(r) & (r >= low) & (r <= high)` and index with it. Convert NumPy results with `int(...)` and `float(...)` before rounding.
:::

::: challenge Smoothing and rates [medium]
Write `moving_average(x, window)`, returning an array whose element i is the mean of `x[i : i + window]`, for every complete window (so the result has `len(x) - window + 1` elements). Use the running-total trick: with `c = np.cumsum` of x with a 0 put in front, the sum of a window is a difference of two entries of c. Raise `ValueError` if `window` is less than 1 or greater than `len(x)`. Then write `rates(t, x)`, the rate of change between consecutive samples, `diff(x) / diff(t)`, raising `ValueError` if the arrays differ in length, have fewer than 2 elements, or the times are not strictly increasing. `x` and `t` may be lists or arrays (convert with `np.asarray`). No `for` or `while` loops and no comprehensions; `moving_average` must handle 2 million values in well under a second.

```python starter
def moving_average(x, window):
    return np.array([x[i:i + window].mean() for i in range(len(x) - window + 1)])

def rates(t, x):
    return x

print(moving_average(np.array([1.0, 2, 3, 4, 5]), 2))
```

```python solution
def moving_average(x, window):
    x = np.asarray(x, dtype=float)
    if window < 1 or window > len(x):
        raise ValueError("window must be between 1 and the length of x")
    c = np.concatenate(([0.0], np.cumsum(x)))
    return (c[window:] - c[:-window]) / window

def rates(t, x):
    t, x = np.asarray(t, dtype=float), np.asarray(x, dtype=float)
    if len(t) != len(x) or len(t) < 2:
        raise ValueError("need two equal-length arrays of at least 2 samples")
    dt = np.diff(t)
    if np.any(dt <= 0):
        raise ValueError("times must be strictly increasing")
    return np.diff(x) / dt

print(moving_average(np.array([1.0, 2, 3, 4, 5]), 2))
```

```python test
import ast as _ast, time as _time
for _n in ["moving_average", "rates"]:
    assert _n in dir(), f"Define {_n}."
_bad_nodes = (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp, _ast.SetComp, _ast.DictComp)
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef) and _node.name in ("moving_average", "rates"):
        assert not any(isinstance(_x, _bad_nodes) for _x in _ast.walk(_node)), f"{_node.name} should use array operations, not loops or comprehensions."
assert np.allclose(moving_average(np.array([1.0, 2, 3, 4, 5]), 2), [1.5, 2.5, 3.5, 4.5]), "Windows of 2."
assert np.allclose(moving_average([4, 8, 6], 3), [6]) and np.allclose(moving_average([4, 8, 6], 1), [4, 8, 6]), "One full window, and windows of 1."
_x = np.random.default_rng(1).normal(size=1000)
assert np.allclose(moving_average(_x, 25), np.convolve(_x, np.ones(25) / 25, mode="valid")), "Agrees with a direct computation on random data."
for _w in [0, 4]:
    try:
        moving_average([1, 2, 3], _w)
        assert False, f"window {_w} should raise ValueError."
    except ValueError:
        pass
assert np.allclose(rates([0, 0.5, 1.5], [0, 1, 4]), [2, 3]), "Rate = change in x over change in t."
for _bad in [([0, 1], [0]), ([0], [0]), ([0, 1, 1], [0, 1, 2]), ([0, 2, 1], [0, 1, 2])]:
    try:
        rates(*_bad)
        assert False, f"rates{_bad} should raise ValueError."
    except ValueError:
        pass
_big = np.random.default_rng(2).normal(size=2_000_000)
_start = _time.perf_counter(); _m = moving_average(_big, 500); _el = _time.perf_counter() - _start
assert len(_m) == 2_000_000 - 499 and abs(_m[0] - _big[:500].mean()) < 1e-9, "Large input."
assert _el < 1.5, f"2 million values took {_el:.2f} s; use the running-total trick."
"SUCCESS: A window's sum is a difference of two running totals, so smoothing costs the same however wide the window."
```

Hint: `c = np.concatenate(([0.0], np.cumsum(x)))`. The sum of `x[i:i + w]` is `c[i + w] - c[i]`, so all window sums at once are `c[w:] - c[:-w]`.
:::

::: challenge Longest run above a limit [hard]
An alarm rule says a bearing is overheating if it stays above a limit for a long stretch, so the duration of the longest continuous run matters more than the count. Write `longest_run(mask)` that takes a boolean array and returns `(length, start)`: the length of the longest run of consecutive `True` values and the index where it starts (the earliest such run if several tie). Return `(0, -1)` if there are no `True` values. Then write `worst_sensor(data, limit)` for a 2-D array with one column per sensor: return the column index whose longest run above `limit` (strictly greater) is longest, with the earliest column winning ties, together with that run's `(length, start)`, as `(column, length, start)`. Use array operations only inside `longest_run`: no loops or comprehensions (`worst_sensor` may loop over the columns). It must handle 5 million samples quickly.

```python starter
def longest_run(mask):
    best, start = 0, -1
    return best, start

def worst_sensor(data, limit):
    return (0, 0, -1)

print(longest_run(np.array([0, 1, 1, 0, 1, 1, 1, 0], dtype=bool)))
```

```python solution
def longest_run(mask):
    m = np.asarray(mask, dtype=bool)
    if not m.any():
        return (0, -1)
    edges = np.diff(np.concatenate(([0], m.astype(np.int8), [0])))
    starts = np.flatnonzero(edges == 1)
    ends = np.flatnonzero(edges == -1)
    lengths = ends - starts
    i = int(lengths.argmax())
    return (int(lengths[i]), int(starts[i]))

def worst_sensor(data, limit):
    data = np.asarray(data)
    best = None
    for col in range(data.shape[1]):
        length, start = longest_run(data[:, col] > limit)
        if best is None or length > best[1]:
            best = (col, length, start)
    return best

print(longest_run(np.array([0, 1, 1, 0, 1, 1, 1, 0], dtype=bool)))
```

```python test
import ast as _ast, time as _time
for _n in ["longest_run", "worst_sensor"]:
    assert _n in dir(), f"Define {_n}."
_bad_nodes = (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp, _ast.SetComp, _ast.DictComp)
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef) and _node.name == "longest_run":
        assert not any(isinstance(_x, _bad_nodes) for _x in _ast.walk(_node)), "longest_run should use array operations, not loops or comprehensions."
_b = lambda s: np.array([c == "1" for c in s], dtype=bool)
assert longest_run(_b("01101110")) == (3, 4), f"Got {longest_run(_b('01101110'))}."
assert longest_run(_b("1100011")) == (2, 0), "Ties go to the earliest run."
assert longest_run(_b("0000")) == (0, -1) and longest_run(_b("")) == (0, -1), "No True values."
assert longest_run(_b("1111")) == (4, 0) and longest_run(_b("0001")) == (1, 3), "Runs touching either end."
_r, _l = longest_run(_b("1")), longest_run(_b("011"))
assert _r == (1, 0) and _l == (2, 1), "Single-element and end runs."
assert all(type(_v) is int for _v in longest_run(_b("0110"))), "Return plain ints."
_rng = np.random.default_rng(3)
for _ in range(200):
    _m = _rng.random(_rng.integers(1, 40)) < 0.6
    _bl, _bs, _cur = 0, -1, 0
    for _i, _v in enumerate(_m):
        _cur = _cur + 1 if _v else 0
        if _cur > _bl:
            _bl, _bs = _cur, _i - _cur + 1
    assert longest_run(_m) == (_bl, _bs), f"Wrong on {_m.astype(int)}: expected {(_bl, _bs)}, got {longest_run(_m)}."
_d = np.array([[50, 61, 70], [61, 62, 70], [62, 50, 59], [63, 63, 70], [50, 64, 70]], dtype=float)
assert worst_sensor(_d, 60) == (0, 3, 1), f"Sensor 0 is above 60 for 3 samples from index 1; got {worst_sensor(_d, 60)}."
assert worst_sensor(_d, 69) == (2, 2, 0), "Strictly above the limit; ties go to the earliest run."
assert worst_sensor(np.array([[61, 61], [61, 61], [50, 50]], dtype=float), 60) == (0, 2, 0), "Two columns tie: the earliest column wins."
assert worst_sensor(np.array([[61, 60], [50, 60], [50, 61]], dtype=float), 60) == (0, 1, 0), "A reading equal to the limit is not above it."
_big = _rng.random(5_000_000) < 0.7
_start = _time.perf_counter(); longest_run(_big); _el = _time.perf_counter() - _start
assert _el < 2, f"5 million samples took {_el:.2f} s."
"SUCCESS: Padding with False and differencing turns runs into pairs of edges: +1 where a run starts and -1 just after it ends."
```

Hint: Pad the mask with a `0` at each end and take `np.diff` of it as integers. The result is +1 exactly where a run starts and −1 just after one ends. `np.flatnonzero` finds those positions, and the run lengths are ends minus starts.
:::

## What you learned

- NumPy arrays apply formulas to every element at once, written exactly as the mathematics, and run tens of times faster than Python loops. Use `np.exp`, not `math.exp`, on arrays.
- `mean`, `min`, `max` and `std` summarise a log; `argmin` and `argmax` say where the extremes are.
- Boolean masks select, count (`sum`) and measure fractions (`mean`). `nan` marks gaps; `np.isnan` finds them and `np.nanmean` ignores them.
- `np.diff` turns positions into rates and `np.cumsum` turns rates into totals; each undoes the other.
- Two-dimensional arrays summarise along an `axis`. Integer dtypes wrap around silently, so convert to a wider type before arithmetic that may overflow.

The next lesson puts points on a plane: coordinates, and the distance between two points.
