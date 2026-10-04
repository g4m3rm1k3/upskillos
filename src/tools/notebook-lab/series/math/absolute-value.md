# Absolute value and error bands

"Within 0.05 mm of nominal" does not care whether a part is too big or too small, only by how much. That "how much, regardless of direction" is the **absolute value**. It turns signed deviations into distances, so it appears whenever a specification, an alarm limit or an error bound is stated as a band around a target. This lesson treats the absolute value as a tool. It covers solving inequalities with it, bounding sums of errors with the triangle inequality, and summarising deviations in a data log three different ways. Absolute values instead of squares make fitting robust to outliers. And the sharp corner of |x| at zero has consequences for control systems and optimisers.

This lesson covers:

- |x| as distance, and bands |x − c| ≤ r as intervals;
- the triangle inequality and worst-case error bounds;
- three measures of deviation: mean absolute, root mean square and maximum;
- least absolute deviations: the median, and lines that ignore outliers;
- dead bands, hysteresis, and the corner at zero.

## Distance and bands

::: math
\[ |x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}, \qquad |x - c| \le r \;\Longleftrightarrow\; c - r \le x \le c + r, \qquad |x - c| \ge r \;\Longleftrightarrow\; x \le c - r \;\text{ or }\; x \ge c + r \]
- $|a - b|$ is the distance between $a$ and $b$ on the number line
- "within $r$ of $c$" is one interval; "at least $r$ from $c$" is two rays
In code: brute-force grids for $|2x - 3| < 5$ and $|x + 1| \ge 4$
:::

The absolute value strips the sign: |−3| = |3| = 3. Its most useful reading is as a distance: |a − b| is how far apart a and b are, whichever is bigger. So |x − c| ≤ r says "x is within r of c", which is the interval [c − r, c + r]: a **band** around c of half-width r. The opposite statement, |x − c| ≥ r, says x is at least r away, so it is outside the band, on either side.

To solve |2x − 3| < 5, write it as −5 < 2x − 3 < 5 and solve both sides at once: −1 < x < 4. To solve |x + 1| ≥ 4, split it: x + 1 ≤ −4 or x + 1 ≥ 4, so x ≤ −5 or x ≥ 3.

Predict before running: do brute-force grids agree with these two answers?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(62)
xs = np.linspace(-10, 10, 20001)
inside = xs[np.abs(2 * xs - 3) < 5]
print(f"|2x - 3| < 5 holds from {inside.min():.3f} to {inside.max():.3f}  ->  -1 < x < 4")
outside = xs[np.abs(xs + 1) >= 4]
print(f"|x + 1| >= 4 holds up to {outside[outside < 0].max():.3f} and from {outside[outside > 0].min():.3f}  ->  x <= -5 or x >= 3")
nominal, tol = 50.00, 0.05
for reading in [49.96, 50.05, 50.07, 49.94]:
    print(f"reading {reading}: deviation {reading - nominal:+.2f}, |deviation| {abs(reading - nominal):.2f}, in band: {abs(reading - nominal) <= tol + 1e-12}")
```

The strict inequality |2x − 3| < 5 holds just inside −1 and 4 (the grid shows −0.999 and 3.999), and the other holds up to −5 and from 3, both ends included. Each reading's tolerance check is just "is the size of the deviation at most 0.05?". Note the small allowance added to the tolerance. Here 50.05 − 50.00 happens to round to 0.0499999999999972, just inside, but 1.10 − 1.00 comes out as 0.10000000000000009, just outside a 0.1 band. The floating-point lesson explains why, and it is the reason real inspection software compares with a tiny margin or in integer micrometres.

## The triangle inequality and worst cases

::: math
\[ |a + b| \le |a| + |b|, \qquad \Big|\sum_i e_i\Big| \le \sum_i |e_i|, \qquad \big|\,|a| - |b|\,\big| \le |a - b| \]
- the size of a sum is at most the sum of the sizes: errors can only partly cancel, never more than fully
- $\sum |e_i|$ is the worst-case bound; when the $e_i$ are independent standard uncertainties, the total is typically about $\sqrt{\sum e_i^2}$
- the reverse form: two numbers that are close have sizes that are close
In code: six fixed errors of mixed sign: `abs(sum(e))`, `sum(abs(e))` and the root-sum-square
:::

Adding numbers can only shrink their combined size through cancellation, never grow it beyond the sum of the sizes. That is the **triangle inequality**, named after its 2D version: one side of a triangle is never longer than the other two together. For errors it gives a guaranteed **worst-case bound**. Six stacked parts whose errors are each at most 0.01 mm can be off by at most 0.06 mm in total, whatever happens. The error-propagation lesson compared this with the statistical root-sum-square estimate. The triangle inequality is the reason the worst case is a true upper limit.

Predict before running: six errors in micrometres of mixed sign. How do the actual total error, the worst-case bound and the root-sum-square compare?

```python
e = np.array([8.0, -5.0, 11.0, -3.0, 6.0, -9.0])
print(f"actual total {e.sum():+.1f} µm, |total| {abs(e.sum()):.1f}, worst-case bound sum |e| = {np.abs(e).sum():.1f}, root-sum-square {math.sqrt((e ** 2).sum()):.1f}")
a, b = 7.3, -2.1
print(f"|a + b| = {abs(a + b):.1f} <= |a| + |b| = {abs(a) + abs(b):.1f};  ||a| - |b|| = {abs(abs(a) - abs(b)):.1f} <= |a - b| = {abs(a - b):.1f}")
```

The six errors add to +8 µm, while the worst-case bound allows 42 µm and the root-sum-square suggests about 18.3 µm. Mixed signs cancel a lot here; the bound would only be reached if every error had the same sign. Both forms of the inequality hold for a = 7.3 and b = −2.1: 5.2 ≤ 9.4, and 5.2 ≤ 9.4 again (for these two numbers the reverse form happens to give the same pair).

## Three ways to measure deviation

::: math
\[ \text{MAE} = \frac{1}{n}\sum_i |d_i|, \qquad \text{RMS} = \sqrt{\frac{1}{n}\sum_i d_i^2}, \qquad \text{MAX} = \max_i |d_i|, \qquad \text{MAE} \le \text{RMS} \le \text{MAX} \]
- $d_i = x_i - \text{nominal}$: each reading's deviation
- they are the $L^1$, $L^2$ and $L^\infty$ norms of the deviation vector, normalised: $\|d\|_1/n$, $\|d\|_2/\sqrt{n}$, $\|d\|_\infty$; each weighs large deviations more than the last
In code: `np.abs(dev).mean()`, `math.sqrt((dev ** 2).mean())` and `np.abs(dev).max()`, with and without one spike
:::

A process log of 400 diameters is supposed to sit at 50.00 mm. Three numbers summarise how far it strays, and they answer different questions:

- **mean absolute error** (MAE, the mean of |d|; not the *median* absolute deviation of the statistics lesson): the typical size of a deviation;
- **root mean square** (RMS): like MAE, but squaring gives large deviations more weight, and it connects to the standard deviation;
- **maximum**: the single worst reading, the one a customer complaint will be about.

They always come in this order: MAE ≤ RMS ≤ MAX. They are the 1-, 2- and ∞-norms of the deviation vector, scaled to per-reading sizes. They react very differently to a single bad reading.

Predict before running: the log contains one 0.2 mm spike. Which of the three measures changes most when it is removed?

```python
n = 400
x = 50.0 + 0.02 * rng.standard_normal(n)
x[150:158] += 0.07
x[300] += 0.2
dev = x - 50.0
for label, d in [("with the spike", dev), ("spike removed", np.where(np.arange(n) == 300, dev - 0.2, dev))]:
    print(f"{label:<15}: MAE {np.abs(d).mean():.4f}, RMS {math.sqrt((d ** 2).mean()):.4f}, MAX {np.abs(d).max():.4f} mm")
print(f"fraction within ±0.05 mm: {np.mean(np.abs(dev) <= 0.05):.3f}")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(dev, ".", markersize=3)
ax.axhline(0.05, color="red", linestyle="--")
ax.axhline(-0.05, color="red", linestyle="--")
ax.set_xlabel("reading")
ax.set_ylabel("deviation (mm)")
plt.show()
```

With the spike, MAE is 0.0170 mm, RMS 0.0236 mm and MAX 0.203 mm. Removing that one reading barely moves MAE (to 0.0165) and changes RMS by 9% (to 0.0214). The maximum falls by a factor of 2.4, to 0.084 mm, now set by the shifted stretch of readings around 150. 97.8% of readings are inside the ±0.05 band. Which measure to report depends on the question. "How good is the process?" calls for MAE or RMS. "Will any part fail?" calls for MAX, or the fraction outside the band.

## Least absolute deviations

::: math
\[ \arg\min_c \sum_i |x_i - c| = \operatorname{median}(x), \qquad \arg\min_c \sum_i (x_i - c)^2 = \bar{x}, \qquad \text{L1 line: } \min_{m, b} \sum_i |y_i - m x_i - b| \]
- each term $|x_i - c|$ pulls $c$ towards $x_i$ with the same force whatever the distance, so outliers cannot drag the answer far
- squares pull harder the further away a point is, so one outlier moves the mean and the least-squares line a lot
- an optimal L1 line passes through at least two of the data points
In code: scans of both sums over a grid of $c$; every line through two points tried as an L1 line, against `np.polyfit`
:::

The mean minimises the sum of **squared** deviations; the fitting lessons were built on that. Minimising the sum of **absolute** deviations instead gives the **median**. Moving c past a data point changes the sum's slope by 2, so the minimum sits where half the points are on each side. With an even number of points the whole interval between the middle two is a minimum. A far-away outlier only counts as "one more point on that side", whatever its distance. That makes the median, and absolute-deviation fitting in general, **robust**: the statistics lesson used the median because outliers barely move it, and this is why.

The same idea fits lines. Least squares minimises the sum of squared residuals; **least absolute deviations** (LAD) minimises the sum of their sizes. There is always a minimising line through two of the data points, so for small data sets trying every pair finds it.

Predict before running: six gauge readings, one of them a misread 15.8. Where do the two criteria put the "centre"? And how does an L1 line compare with least squares when one point is 3 units off?

```python
readings = np.array([12.1, 12.3, 11.9, 12.0, 12.2, 15.8])
cs = np.linspace(11, 16, 50001)
abs_sum = np.array([np.abs(readings - c).sum() for c in cs])
sq_sum = np.array([((readings - c) ** 2).sum() for c in cs])
flat = cs[abs_sum <= abs_sum.min() + 1e-9]
print(f"sum |x - c| is smallest for c from {flat.min():.2f} to {flat.max():.2f} (median {np.median(readings):.2f}); sum (x - c)² at {cs[np.argmin(sq_sum)]:.4f} (mean {readings.mean():.4f})")

xl = np.arange(10.0)
yl = 2.0 + 0.5 * xl + rng.normal(0, 0.1, 10)
yl[7] += 3.0
best = None
for i in range(10):
    for j in range(i + 1, 10):
        m = (yl[j] - yl[i]) / (xl[j] - xl[i])
        b = yl[i] - m * xl[i]
        total = np.abs(yl - m * xl - b).sum()
        if best is None or total < best[0]:
            best = (total, m, b)
ls_slope, ls_icept = np.polyfit(xl, yl, 1)
print(f"true line: slope 0.5, intercept 2.0;  L1 line: slope {best[1]:.3f}, intercept {best[2]:.3f};  least squares: slope {ls_slope:.3f}, intercept {ls_icept:.3f}")
```

The absolute-deviation sum is flat between 12.1 and 12.2, the two middle readings, and the median is the middle of that flat bottom, 12.15. The misread 15.8 drags the mean up to 12.72, above every genuine reading. The L1 line recovers slope 0.497 and intercept 2.059, close to the true 0.5 and 2.0. Least squares is pulled to slope 0.578 and intercept 1.975 by the single bad point. LAD fitting is used when data contain occasional gross errors. Its price is that the solution can be non-unique and needs other algorithms (linear programming) for large problems.

## Dead bands and the corner at zero

::: math
\[ \text{action} = \begin{cases} \text{heat} & T < T_\text{set} - d \\ \text{off} & T > T_\text{set} + d \\ \text{no change} & |T - T_\text{set}| \le d \end{cases}, \qquad |x| \approx \sqrt{x^2 + \varepsilon^2} \]
- a **dead band** of half-width $d$ ignores small errors; keeping the previous state inside it is **hysteresis**
- $|x|$ has a corner at 0 (no derivative), which troubles gradient methods; $\sqrt{x^2 + \varepsilon^2}$ is a smooth stand-in, within $\varepsilon$ of $|x|$
In code: `thermostat(d)` counts heater switchings over 10 hours; the smooth approximation's worst error
:::

Control systems use absolute values constantly, and their corner causes real problems. A thermostat that switches the heater on whenever T < T_set and off whenever T > T_set switches constantly near the set point, because noise flips the sign of the error back and forth. This wears out relays and compressors. The cure is a **dead band**: act only when |T − T_set| exceeds a small d, and otherwise keep doing what you were doing. The memory of the last state is called **hysteresis**.

Optimisers meet the corner in another form. |x| has no derivative at 0, so gradient descent on a sum of absolute values zig-zags around the minimum. A common trick replaces |x| by the smooth √(x² + ε²), which is never more than ε away.

Predict before running: a room drifts and is heated around 20 °C with sensor noise. How many times does the heater switch in 10 hours with no dead band, and with a ±0.3 °C band?

```python
def thermostat(d, minutes=600, seed=1):
    gen = np.random.default_rng(seed)
    T, heating, switches = 19.5, True, 0
    for _ in range(minutes):
        T += (0.08 if heating else 0.0) - 0.04 + gen.normal(0, 0.02)
        measured = T + gen.normal(0, 0.05)
        error = measured - 20.0
        new_state = heating
        if error < -d:
            new_state = True
        elif error > d:
            new_state = False
        switches += new_state != heating
        heating = new_state
    return switches

for d in [0.0, 0.1, 0.3]:
    print(f"dead band ±{d} °C: {thermostat(d)} heater switchings in 10 hours")
grid = np.linspace(-1, 1, 2001)
for eps in [0.1, 0.01]:
    print(f"sqrt(x² + {eps}²): largest gap from |x| is {np.max(np.sqrt(grid ** 2 + eps ** 2) - np.abs(grid)):.3f}")
```

Without a dead band the heater switches 345 times in 10 hours, about every 1.7 minutes, because sensor noise keeps crossing zero. A ±0.1 °C band cuts that to 112, and ±0.3 °C to 37, at the price of letting the temperature swing a little further. The smooth approximation is worst exactly at the corner, x = 0, where it equals ε. Smaller ε means closer to |x| but a sharper bend, so it is a trade-off between accuracy and how easily an optimiser can follow it.

::: challenge Bands and absolute inequalities [easy]
Write `band(nominal, tol)`: the interval `(nominal - tol, nominal + tol)` as plain floats; raise `ValueError` if tol < 0. Write `in_band(x, nominal, tol, eps=1e-9)`: True (a plain bool) if |x − nominal| ≤ tol + eps. Then write `solve_abs(a, b, c)`: the solution set of |ax + b| ≤ c, as a tuple `(lo, hi)` of plain floats, or `None` when there is no solution; raise `ValueError` if a = 0.

```python starter
def band(nominal, tol):
    return (nominal, nominal)

def in_band(x, nominal, tol, eps=1e-9):
    return False

def solve_abs(a, b, c):
    return None

print(band(50, 0.05), in_band(50.05, 50, 0.05), solve_abs(2, -3, 5))
```

```python solution
def band(nominal, tol):
    if tol < 0:
        raise ValueError("tolerance must not be negative")
    return (float(nominal - tol), float(nominal + tol))

def in_band(x, nominal, tol, eps=1e-9):
    return bool(abs(x - nominal) <= tol + eps)

def solve_abs(a, b, c):
    if a == 0:
        raise ValueError("a must not be zero")
    if c < 0:
        return None
    lo, hi = (-c - b) / a, (c - b) / a
    return (float(min(lo, hi)), float(max(lo, hi)))

print(band(50, 0.05), in_band(50.05, 50, 0.05), solve_abs(2, -3, 5))
```

```python test
for _n in ["band", "in_band", "solve_abs"]:
    assert _n in dir(), f"Define {_n}."
_b = band(50, 0.05)
assert all(type(_v) is float for _v in _b) and abs(_b[0] - 49.95) < 1e-12 and abs(_b[1] - 50.05) < 1e-12, f"band(50, 0.05); got {_b}."
assert band(10, 0) == (10.0, 10.0), "Zero tolerance is a single point."
try:
    band(10, -1)
    assert False, "A negative tolerance should raise ValueError."
except ValueError:
    pass
assert in_band(50.05, 50.0, 0.05) is True and in_band(49.95, 50.0, 0.05) is True, "The edges are in the band."
assert in_band(1.1, 1.0, 0.1) is True, "1.1 - 1.0 is slightly more than 0.1 in floating point: the eps margin keeps it in the band."
assert in_band(50.07, 50.0, 0.05) is False and in_band(49.9, 50.0, 0.05) is False, "Outside on either side."
assert solve_abs(2, -3, 5) == (-1.0, 4.0), f"|2x - 3| <= 5 gives [-1, 4]; got {solve_abs(2, -3, 5)}."
assert solve_abs(-2, 3, 5) == (-1.0, 4.0), "A negative a flips the ends: still (-1, 4)."
assert solve_abs(1, 1, 0) == (-1.0, -1.0) and solve_abs(3, 0, 6) == (-2.0, 2.0), "c = 0 is a single point."
assert solve_abs(1, 0, -1) is None, "|x| <= -1 has no solution."
try:
    solve_abs(0, 1, 2)
    assert False, "a = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: |x - c| <= r is the band [c - r, c + r], and |ax + b| <= c unwraps into one double inequality."
```

Hint: |ax + b| ≤ c means −c ≤ ax + b ≤ c. Subtract b and divide by a; if a is negative the two ends swap, so take the min and max. With c < 0 there is nothing to find.
:::

::: challenge Summarising deviations [medium]
Write `deviation_stats(values, nominal)`: return a dictionary with keys `"mae"`, `"rms"` and `"max"`: the mean absolute (mean of |deviation|), root-mean-square and largest absolute deviation from `nominal`, as plain floats. `values` may be a list or a NumPy array; raise `ValueError` if it is empty. Then write `out_of_band_runs(values, nominal, tol)`: the list of `(start, end)` index pairs (plain ints, both inclusive) of each run of consecutive readings with |x − nominal| > tol, in order.

```python starter
import numpy as np

def deviation_stats(values, nominal):
    return {"mae": 0.0, "rms": 0.0, "max": 0.0}

def out_of_band_runs(values, nominal, tol):
    return []

print(deviation_stats([50.01, 49.98, 50.03], 50.0), out_of_band_runs([50.0, 50.1, 50.2, 50.0, 49.8], 50.0, 0.05))
```

```python solution
import math
import numpy as np

def deviation_stats(values, nominal):
    d = np.asarray(values, dtype=float) - nominal
    if d.size == 0:
        raise ValueError("no values")
    return {"mae": float(np.abs(d).mean()), "rms": float(math.sqrt((d ** 2).mean())), "max": float(np.abs(d).max())}

def out_of_band_runs(values, nominal, tol):
    runs, start = [], None
    for i, v in enumerate(values):
        out = abs(v - nominal) > tol
        if out and start is None:
            start = i
        elif not out and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(values) - 1))
    return runs

print(deviation_stats([50.01, 49.98, 50.03], 50.0), out_of_band_runs([50.0, 50.1, 50.2, 50.0, 49.8], 50.0, 0.05))
```

```python test
import math
import numpy as np
for _n in ["deviation_stats", "out_of_band_runs"]:
    assert _n in dir(), f"Define {_n}."
_s = deviation_stats([50.01, 49.98, 50.03], 50.0)
assert set(_s) == {"mae", "rms", "max"} and all(type(_v) is float for _v in _s.values()), "Keys mae, rms, max with plain floats."
assert abs(_s["mae"] - 0.02) < 1e-12 and abs(_s["rms"] - math.sqrt((0.0001 + 0.0004 + 0.0009) / 3)) < 1e-12 and abs(_s["max"] - 0.03) < 1e-12, f"Got {_s}."
_g = np.random.default_rng(3)
_v = 10 + _g.normal(0, 0.2, 500)
_t = deviation_stats(_v, 10)
assert _t["mae"] <= _t["rms"] <= _t["max"], "MAE <= RMS <= MAX always."
assert deviation_stats(np.array([7.0]), 5.0) == {"mae": 2.0, "rms": 2.0, "max": 2.0}, "One value: all three agree."
try:
    deviation_stats([], 5.0)
    assert False, "No values should raise ValueError."
except ValueError:
    pass
assert out_of_band_runs([50.0, 50.1, 50.2, 50.0, 49.8], 50.0, 0.05) == [(1, 2), (4, 4)], "Two runs, the second at the end."
assert out_of_band_runs(np.array([50.1, 50.0, 49.9, 49.9]), 50.0, 0.05) == [(0, 0), (2, 3)], "A run at the start; arrays work."
assert out_of_band_runs([50.0, 50.01], 50.0, 0.05) == [] and out_of_band_runs([], 50.0, 0.05) == [], "No runs."
_r = out_of_band_runs([1.0, 9.0], 5.0, 1.0)
assert _r == [(0, 1)] and all(type(_i) is int for _i in _r[0]), "Too low and too high in a row are one run; plain ints."
"SUCCESS: Absolute deviations give a typical size, a weighted size and a worst case, and runs show where a process left its band."
```

Hint: Convert with `np.asarray(values, dtype=float)` and subtract the nominal; then mean of abs, square root of the mean of squares, and max of abs. For runs, walk through the readings remembering where the current out-of-band stretch began.
:::

::: challenge Robust fitting [hard]
Write `l1_line(x, y)`: the least-absolute-deviations line through the data, found by trying every line through two points with different x values and keeping the one with the smallest Σ|yᵢ − m xᵢ − b| (ties go to the first pair found when looping i < j in index order). Return `(m, b)` as plain floats. Raise `ValueError` if there are fewer than 2 points, the lengths differ, or all x values are equal. Then write `smooth_abs(x, eps)`: √(x² + ε²) for a number or NumPy array (raise `ValueError` if eps ≤ 0), and `smooth_l1_line(x, y, eps=1e-3, lr=0.01, steps=20000)`: minimise Σ smooth_abs(yᵢ − m xᵢ − b, eps) by gradient descent from the least-squares line (`np.polyfit`): with residuals rᵢ and weights wᵢ = rᵢ/√(rᵢ² + ε²), each step adds lr × mean(w·x)/max|x| to m and lr × mean(w) to b (dividing by max|x| keeps the slope's step in proportion to the intercept's). Return `(m, b)` as plain floats.

```python starter
import numpy as np

def l1_line(x, y):
    return (0.0, 0.0)

def smooth_abs(x, eps):
    return abs(x)

def smooth_l1_line(x, y, eps=1e-3, lr=0.01, steps=20000):
    return (0.0, 0.0)

xs = np.arange(6.0)
print(l1_line(xs, [1, 2, 3, 4, 20, 6]))
```

```python solution
import numpy as np

def l1_line(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.size < 2 or x.size != y.size or np.all(x == x[0]):
        raise ValueError("need at least two points with different x")
    best = None
    for i in range(x.size):
        for j in range(i + 1, x.size):
            if x[i] == x[j]:
                continue
            m = (y[j] - y[i]) / (x[j] - x[i])
            b = y[i] - m * x[i]
            total = np.abs(y - m * x - b).sum()
            if best is None or total < best[0]:
                best = (total, m, b)
    return float(best[1]), float(best[2])

def smooth_abs(x, eps):
    if eps <= 0:
        raise ValueError("eps must be positive")
    return np.sqrt(np.asarray(x, dtype=float) ** 2 + eps ** 2)

def smooth_l1_line(x, y, eps=1e-3, lr=0.01, steps=20000):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    m, b = np.polyfit(x, y, 1)
    for _ in range(steps):
        r = y - m * x - b
        w = r / smooth_abs(r, eps)
        m += lr * (w * x).mean() / np.abs(x).max()
        b += lr * w.mean()
    return float(m), float(b)

xs = np.arange(6.0)
print(l1_line(xs, [1, 2, 3, 4, 20, 6]))
```

```python test
import numpy as np
for _n in ["l1_line", "smooth_abs", "smooth_l1_line"]:
    assert _n in dir(), f"Define {_n}."
_x = np.arange(6.0)
_r = l1_line(_x, [1, 2, 3, 4, 20, 6])
assert all(type(_v) is float for _v in _r) and abs(_r[0] - 1.0) < 1e-12 and abs(_r[1] - 1.0) < 1e-12, f"The outlier at x = 4 is ignored: y = x + 1; got {_r}."
_g = np.random.default_rng(8)
_xx = np.arange(12.0)
_yy = 3.0 - 0.4 * _xx + _g.normal(0, 0.05, 12)
_yy[[3, 9]] += [4.0, -5.0]
_m, _b = l1_line(list(_xx), list(_yy))
assert abs(_m + 0.4) < 0.05 and abs(_b - 3.0) < 0.2, f"Two outliers: L1 stays near slope -0.4, intercept 3; got {(_m, _b)}."
_ls = np.polyfit(_xx, _yy, 1)
assert abs(_ls[0] + 0.4) > abs(_m + 0.4), "Least squares is pulled further by the outliers."
assert l1_line([0, 1], [5, 7]) == (2.0, 5.0), "Two points: the line through them."
for _bad in [([1.0], [2.0]), ([1, 2], [3]), ([2, 2, 2], [1, 2, 3])]:
    try:
        l1_line(*_bad)
        assert False, f"l1_line{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(float(smooth_abs(0.0, 0.01)) - 0.01) < 1e-15 and np.allclose(smooth_abs(np.array([-3.0, 4.0]), 1e-6), [3.0, 4.0]), "sqrt(x² + ε²)."
try:
    smooth_abs(1.0, 0.0)
    assert False, "eps must be positive."
except ValueError:
    pass
_sm = smooth_l1_line(_xx, _yy)
_obj = lambda _p: float(np.abs(_yy - _p[0] * _xx - _p[1]).sum())
assert all(type(_v) is float for _v in _sm) and _obj(_sm) <= 1.02 * _obj((_m, _b)), f"The smoothed fit's sum of |residuals| is within 2% of the exact L1 minimum {_obj((_m, _b)):.4f}; got {_obj(_sm):.4f}."
assert abs(_sm[0] + 0.4) < 0.06, "The smoothed fit also ignores the outliers."
"SUCCESS: Absolute residuals give outliers a fixed pull, so the L1 line ignores them; smoothing the corner lets gradient descent find it."
```

Hint: For each pair i < j with different x, the line is m = (yⱼ − yᵢ)/(xⱼ − xᵢ), b = yᵢ − m xᵢ; keep the smallest Σ|residual|. The gradient of Σ√(r² + ε²) with respect to m is −Σ xᵢ rᵢ/√(rᵢ² + ε²) (and without the xᵢ for b); step against it, using the means and the max|x| scaling from the task.
:::

## What you learned

- |a − b| is a distance; |x − c| ≤ r is the band [c − r, c + r], and |x − c| ≥ r is everything outside it.
- The triangle inequality |a + b| ≤ |a| + |b| makes Σ|eᵢ| a guaranteed worst-case bound on a total error; random errors usually stay far below it.
- Mean absolute error, RMS and maximum (scaled 1-, 2- and ∞-norms) answer different questions and react differently to a single spike; MAE ≤ RMS ≤ MAX.
- Minimising absolute deviations gives the median and the L1 line, which resist outliers that drag the mean and least squares.
- Dead bands with hysteresis stop controllers chattering around a set point; the corner of |x| at zero can be smoothed with √(x² + ε²) for gradient methods.

The next lesson steps back to functions themselves: which inputs they accept, which outputs they can produce, and how to describe valid sensor ranges.
