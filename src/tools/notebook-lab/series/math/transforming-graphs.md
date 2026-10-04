# Shifting, stretching and reflecting graphs

Two accelerometers on the same machine record the same knock. The second sits farther away, so its trace arrives later. It has a different sensitivity, so it is taller. And its amplifier adds an offset, so it is lifted. The shapes are the same; the graphs are moved and stretched copies of each other. Comparing them, or using one to calibrate the other, means undoing those moves. This lesson studies the basic transformations of a graph: shifts, stretches, reflections and their combinations. It then uses them to align real signals: finding a time delay by cross-correlation to a fraction of a sample, recovering a gain and an offset, and detecting a recording that runs at the wrong speed.

This lesson covers:

- the family a·f(b(x − c)) + d: what each parameter does to the graph;
- reflections, and splitting a function into even and odd parts;
- finding the delay between two signals by cross-correlation;
- recovering gain and offset once the signals are aligned;
- time stretching, and estimating it by search.

## Four moves

::: math
\[ y = a\,f\big(b\,(x - c)\big) + d \]
- $c$: shift right by $c$; $d$: shift up by $d$
- $a$: stretch vertically by $a$ (a negative $a$ also reflects in the x axis)
- $b$: squeeze horizontally by $b$, so the graph becomes $1/|b|$ times as wide (a negative $b$ also reflects in the y axis)
In code: `moved(f, a, b, c, d)` builds the transformed function; the peak of a bump is tracked through each move
:::

Every combination of moving and resizing a graph without bending it fits the form a·f(b(x − c)) + d. Changes **outside** f act on the output and behave as expected: + d lifts the graph by d, and the factor a stretches it vertically. Changes **inside** f act on the input and behave the opposite way to how they look. Replacing x by x − c moves the graph **right** by c, because the new function reaches each value c later. Replacing x by bx **squeezes** the graph by b, because the new function reaches each value sooner. The order inside matters: f(b(x − c)) shifts by c, but f(bx − c) shifts by c/b.

Predict before running: a bump peaks at x = 0 with height 1. Where is the peak, and how tall and wide is it, after each move?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def bump(x):
    return np.exp(-x ** 2)

def moved(f, a=1.0, b=1.0, c=0.0, d=0.0):
    return lambda x: a * f(b * (x - c)) + d

xs = np.linspace(-6, 6, 12001)
def describe(label, g):
    ys = g(xs)
    top = xs[np.argmax(ys)]
    half = ys.min() + (ys.max() - ys.min()) / 2
    above = xs[ys >= half]
    print(f"{label:<28} peak at x = {top:+.2f}, height {ys.max():.2f}, width at half height {above.max() - above.min():.2f}")

describe("bump", bump)
describe("shift right by 2", moved(bump, c=2))
describe("lift by 0.5", moved(bump, d=0.5))
describe("stretch up by 3", moved(bump, a=3))
describe("squeeze by b = 2", moved(bump, b=2))
describe("squeeze by 2, then shift 2", moved(bump, b=2, c=2))
describe("bump(2x - 2)", lambda x: bump(2 * x - 2))
```

The plain bump peaks at 0 with height 1 and width 1.66 at half height. Shifting by c = 2 moves the peak to +2, and lifting by 0.5 raises it to 1.5 without changing the width. Stretching by a = 3 triples the height. Squeezing by b = 2 halves the width to 0.83. With b = 2 and c = 2 the peak is at +2, but bump(2x − 2) peaks at +1: the shift inside the brackets is divided by b. Writing the form as b(x − c) keeps c meaning "the shift", which is why that is the standard way to write it.

## Reflections, even and odd

::: math
\[ f(-x): \text{reflect in the y axis}, \quad -f(x): \text{reflect in the x axis}, \qquad f(x) = \underbrace{\frac{f(x) + f(-x)}{2}}_{\text{even}} + \underbrace{\frac{f(x) - f(-x)}{2}}_{\text{odd}} \]
- even: $f(-x) = f(x)$ (mirror symmetry, like $\cos$ and $x^2$); odd: $f(-x) = -f(x)$ (point symmetry, like $\sin$ and $x^3$)
- every function splits uniquely into an even part and an odd part
In code: `even_part` and `odd_part` of $e^x$, checked against $\cosh$ and $\sinh$
:::

Negative stretches are reflections. f(−x) mirrors the graph left to right; −f(x) flips it upside down. Functions that equal their own mirror image are **even**: cos x, x², |x|. Functions that turn into their own negative are **odd**: sin x, x³. The building-signals lesson used this: a square wave that is an odd function contains only sine harmonics.

Any function splits into an even and an odd part, by averaging it with its mirror image and taking half the difference. For eˣ the parts are the hyperbolic functions cosh x and sinh x, met in the heat-flow lesson's shaft. In signal processing the split separates the part of a pulse that is symmetric about its centre from the part that is not.

Predict before running: what are the even and odd parts of eˣ, and do they add back up?

```python
even_part = lambda f: (lambda x: (f(x) + f(-x)) / 2)
odd_part = lambda f: (lambda x: (f(x) - f(-x)) / 2)
grid = np.linspace(-2, 2, 9)
E, O = even_part(np.exp)(grid), odd_part(np.exp)(grid)
print("even part = cosh:", np.allclose(E, np.cosh(grid)), "  odd part = sinh:", np.allclose(O, np.sinh(grid)))
print("parts add back to e^x:", np.allclose(E + O, np.exp(grid)))
print("x³ - 2x is odd:", np.allclose(grid ** 3 - 2 * grid, -((-grid) ** 3 - 2 * (-grid))), "  cos is even:", np.allclose(np.cos(-grid), np.cos(grid)))
```

The even part of eˣ is exactly cosh x and the odd part exactly sinh x, and they add back to eˣ. The checks confirm x³ − 2x is odd and cos is even.

## Finding a delay by cross-correlation

::: math
\[ R_{xy}[k] = \sum_n \big(x[n] - \bar{x}\big)\big(y[n + k] - \bar{y}\big), \qquad \hat{k} = \arg\max_k R_{xy}[k], \qquad \delta = \frac{1}{2}\,\frac{R[\hat{k} - 1] - R[\hat{k} + 1]}{R[\hat{k} - 1] - 2R[\hat{k}] + R[\hat{k} + 1]} \]
- slide one signal past the other and add up the products: the sum is largest when the shapes line up
- the peak lag $\hat{k}$ is a whole number of samples; a parabola through the peak and its two neighbours refines it by a fraction $\delta$
In code: `np.correlate(y - y.mean(), x - x.mean(), "full")`, its peak, and the parabolic refinement
:::

If y is a delayed copy of x, then y(t) = x(t − c), a horizontal shift, and the task is to find c. **Cross-correlation** slides one signal past the other. At each trial lag k it multiplies the overlapping samples and adds them up. When the shapes line up, peaks meet peaks and troughs meet troughs, so every product is positive and the sum is largest. Subtracting the means first stops a constant offset from dominating. A positive gain and an offset do not move the peak of the correlation, so the delay can be found before anything else is known.

The best whole-number lag is limited to one sample (1 ms here). Fitting a parabola through the correlation's highest point and its two neighbours, and taking the parabola's vertex, refines the estimate to a fraction of a sample.

Predict before running: the second sensor's trace is delayed by 37.4 ms, 2.5 times taller, offset by 0.8 and noisy. Does the correlation find the delay?

```python
rng = np.random.default_rng(65)
fs = 1000.0
t = np.arange(0, 2.0, 1 / fs)

def knock(tt):
    return np.exp(-((tt - 0.6) / 0.05) ** 2) * np.sin(2 * math.pi * 25 * (tt - 0.6)) + 0.4 * np.exp(-((tt - 1.1) / 0.1) ** 2)

true_delay = 0.0374
x = knock(t) + rng.normal(0, 0.05, t.size)
y = 2.5 * knock(t - true_delay) + 0.8 + rng.normal(0, 0.05, t.size)
R = np.correlate(y - y.mean(), x - x.mean(), "full")
lags = np.arange(-len(x) + 1, len(x))
i = int(np.argmax(R))
frac = 0.5 * (R[i - 1] - R[i + 1]) / (R[i - 1] - 2 * R[i] + R[i + 1])
delay = (lags[i] + frac) / fs
print(f"correlation peak at lag {lags[i]} samples = {lags[i] / fs * 1000:.1f} ms; refined {delay * 1000:.2f} ms (true {true_delay * 1000:.1f} ms)")

fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 3))
a1.plot(t, x, label="sensor 1")
a1.plot(t, y, label="sensor 2")
a1.set_xlim(0.4, 1.4)
a1.legend(fontsize=8)
a2.plot(lags / fs * 1000, R)
a2.set_xlim(-200, 200)
a2.set_xlabel("lag (ms)")
plt.show()
```

The correlation peaks at a lag of 37 samples, 37.0 ms. The parabolic refinement gives 37.45 ms against the true 37.4 ms, an error of about a twentieth of a sample, despite the noise, the gain and the offset. The same method locates leaks from the delay between two microphones on a pipe, measures flow speed from the delay between two sensors along it, and synchronises data loggers that were started at slightly different times.

## Recovering gain and offset

::: math
\[ y(t) \approx a\,x(t - c) + d \;\Longrightarrow\; \min_{a, d} \sum_n \big(y[n] - a\,x_\text{shifted}[n] - d\big)^2 \]
- once the delay $c$ is known, the remaining model is linear in $a$ and $d$: a straight-line fit of $y$ against the shifted $x$
- shifting by a fraction of a sample needs interpolation; for a fast wiggle, a misalignment of a sizeable fraction of its period biases the gain low
- noise in the shifted $x$ also biases the fitted gain towards zero (regression dilution), by the factor $\operatorname{var}(\text{signal})/(\operatorname{var}(\text{signal}) + \sigma^2)$
In code: `np.interp(t - delay, t, x)` shifts sensor 1, then `np.linalg.lstsq` on columns `[x_shifted, 1]`
:::

With the delay found, the vertical moves remain: y ≈ a·x(t − c) + d. That is linear in a and d, so least squares fits them, as in the fitting-a-line lesson, with the shifted x as the input column. Shifting by a fraction of a sample means evaluating x between its samples, which `np.interp` does by linear interpolation. The precision of the delay matters for this step. A residual misalignment of even half a millisecond on a 25 Hz oscillation leaves the peaks slightly out of step, and the fit then underestimates the gain.

Predict before running: how close are the fitted gain and offset to 2.5 and 0.8, using the rounded and the refined delay?

```python
def fit_gain_offset(delay_s):
    shifted = np.interp(t - delay_s, t, x)
    keep = t >= delay_s
    A = np.column_stack([shifted[keep], np.ones(keep.sum())])
    (a, d), *_ = np.linalg.lstsq(A, y[keep], rcond=None)
    return a, d

for label, dl in [("rounded delay", lags[i] / fs), ("refined delay", delay)]:
    a, d = fit_gain_offset(dl)
    print(f"{label:<14} {dl * 1000:6.2f} ms: gain {a:.4f}, offset {d:.4f}")
signal_var = knock(t).var()
print(f"noise in sensor 1 dilutes the slope by var(signal)/(var(signal) + σ²) = {signal_var / (signal_var + 0.05 ** 2):.4f}, predicting a gain of {2.5 * signal_var / (signal_var + 0.05 ** 2):.4f}")
clean = np.interp(t - delay, t, knock(t))
A = np.column_stack([clean[t >= delay], np.ones((t >= delay).sum())])
print("fit against the noise-free shape instead:", np.linalg.lstsq(A, y[t >= delay], rcond=None)[0].round(4))
```

With the delay rounded to 37 ms the fitted gain is 2.25, 10% low; with the refined 37.45 ms it is 2.37, offset 0.80. Alignment is not the main cause: against a noise-free shape both delays give 2.50, because 0.4 ms is only a sixtieth of a 25 Hz period. The shortfall is **regression dilution**: sensor 1 is noisy, and noise in the **input** column of a least-squares fit pulls the slope towards zero by the factor var(signal)/(var(signal) + σ²). That is predicted here as 0.907, a gain of 2.27, matching the rounded fit. The refined fit looks better only because interpolating 45% of the way between samples averages two noise values and roughly halves the noise variance. Fitting against a noise-free shape (in practice an average of many repeated events) recovers 2.50. Least squares assumes the x values are exact; when both signals are noisy, methods that allow for errors in both variables (errors-in-variables regression) are needed.

## Time stretching

::: math
\[ y(t) = x(b\,t), \qquad \hat{b} = \arg\max_b \operatorname{corr}\big(x(b\,t),\; y(t)\big) \]
- a recording made with a clock running at the wrong rate, or a motor run-up repeated at a different speed, is a horizontally stretched copy
- a stretch is not a shift, so it moves different parts of the signal by different amounts and cross-correlation cannot find it; a search over $b$ can
In code: a chirp and a slowed copy; the correlation coefficient `np.corrcoef` scanned over 401 values of $b$
:::

A horizontal stretch, y(t) = x(bt), arises when a logger's clock runs fast or slow, when a run-up is repeated with a different acceleration, or with a Doppler shift. It changes every time interval by the same factor, so the start of the signal barely moves while the end moves a lot. A single delay cannot describe that. When the shape of x is known, the stretch can be found by trying many values of b and measuring how well x(bt) matches y with the correlation coefficient of the PCA lesson. That coefficient ignores gain and offset, so only the shape is compared.

Predict before running: a chirp (a tone whose frequency rises) is recorded by a logger whose clock makes everything appear 8% slower. What value of b brings the template into line with the recording?

```python
tt = np.arange(0, 1.0, 1 / fs)
chirp = lambda u: np.sin(2 * math.pi * 3 * u ** 2)
recorded = chirp(tt / 1.08) + rng.normal(0, 0.05, tt.size)
bs = np.linspace(0.8, 1.2, 401)
scores = np.array([np.corrcoef(chirp(b * tt), recorded)[0, 1] for b in bs])
b_hat = bs[np.argmax(scores)]
print(f"best stretch b = {b_hat:.3f} (exact 1/1.08 = {1 / 1.08:.4f}), correlation {scores.max():.4f}; with b = 1 the correlation is only {scores[np.argmin(np.abs(bs - 1))]:.3f}")
```

The search finds b = 0.926, matching 1/1.08 = 0.9259 to the grid's resolution, with a correlation of almost 1. Without the stretch, b = 1, the correlation is much lower, because the template and the recording drift out of step as the chirp speeds up. Searching over a parameter and scoring the match is a general method. It works for stretches, rotations and any other transformation whose effect is too non-linear for a formula, at the cost of evaluating every candidate.

::: challenge Moving graphs [easy]
Write `transform(f, a=1.0, b=1.0, c=0.0, d=0.0)`: return the function x ↦ a·f(b(x − c)) + d; raise `ValueError` if a or b is 0. Write `even_odd(f)`: return a tuple `(even, odd)` of functions with even(x) = (f(x) + f(−x))/2 and odd(x) = (f(x) − f(−x))/2. Then write `peak_after(peak_x, peak_y, a, b, c, d)`: where the peak of f, at (peak_x, peak_y), lands on the graph of a·f(b(x − c)) + d, as a tuple of plain floats (assume a > 0, so it is still the peak).

```python starter
import numpy as np

def transform(f, a=1.0, b=1.0, c=0.0, d=0.0):
    return f

def even_odd(f):
    return (f, f)

def peak_after(peak_x, peak_y, a, b, c, d):
    return (peak_x, peak_y)

print(transform(lambda x: x ** 2, c=2)(3), peak_after(0, 1, 3, 2, 2, 0.5))
```

```python solution
import numpy as np

def transform(f, a=1.0, b=1.0, c=0.0, d=0.0):
    if a == 0 or b == 0:
        raise ValueError("a and b must be non-zero")
    return lambda x: a * f(b * (x - c)) + d

def even_odd(f):
    return (lambda x: (f(x) + f(-x)) / 2), (lambda x: (f(x) - f(-x)) / 2)

def peak_after(peak_x, peak_y, a, b, c, d):
    return float(peak_x / b + c), float(a * peak_y + d)

print(transform(lambda x: x ** 2, c=2)(3), peak_after(0, 1, 3, 2, 2, 0.5))
```

```python test
import numpy as np
for _n in ["transform", "even_odd", "peak_after"]:
    assert _n in dir(), f"Define {_n}."
_sq = lambda x: x ** 2
assert transform(_sq, c=2)(3) == 1 and transform(_sq, d=5)(0) == 5 and transform(_sq, a=3)(2) == 12, "Shift right, lift, stretch up."
assert transform(_sq, b=2)(1.5) == 9 and transform(_sq, b=2, c=1)(2) == 4, "b squeezes inside, after subtracting c."
_g = np.linspace(-3, 3, 13)
assert np.allclose(transform(np.sin, b=-1)(_g), -np.sin(_g)), "b = -1 reflects in the y axis (sin is odd)."
for _bad in [dict(a=0), dict(b=0)]:
    try:
        transform(_sq, **_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_e, _o = even_odd(np.exp)
assert np.allclose(_e(_g), np.cosh(_g)) and np.allclose(_o(_g), np.sinh(_g)), "e^x splits into cosh and sinh."
_pe, _po = even_odd(lambda x: x ** 3 + x ** 2 - 4)
assert np.allclose(_pe(_g), _g ** 2 - 4) and np.allclose(_po(_g), _g ** 3), "Even part keeps even powers, odd part odd powers."
_p = peak_after(0, 1, 3, 2, 2, 0.5)
assert _p == (2.0, 3.5) and all(type(_v) is float for _v in _p), f"Peak (0, 1) moves to (2, 3.5); got {_p}."
assert peak_after(1.0, 2.0, 1, 0.5, -1, 0) == (1.0, 2.0) and peak_after(4, 1, 2, 4, 0, -1) == (1.0, 1.0), "Horizontal: x/b + c; vertical: a·y + d."
"SUCCESS: Outside changes act on the output as they look; inside changes act on the input in reverse: shift by c, squeeze by b."
```

Hint: The new graph passes through (x, y) when b(x − c) is the old peak's x, so x = peak_x/b + c, and its height is a·peak_y + d.
:::

::: challenge Aligning two recordings [medium]
Write `best_lag(x, y)`: the whole number of samples by which y is delayed relative to x, found as the lag of the largest value of the cross-correlation of the mean-removed signals (`np.correlate(y - mean(y), x - mean(x), "full")`, whose index i corresponds to lag i − (len(x) − 1)); x and y have the same length and may be lists or arrays; return a plain int (negative if y leads). Then write `refined_lag(x, y)`: the lag refined by a parabola through the correlation peak and its two neighbours, as a plain float (return the whole-number lag if the peak is at either end of the correlation). Finally write `gain_offset(x, y, lag)`: shift x by `lag` samples (a float; use `np.interp` on the sample index, sample n of the shifted signal being x at index n − lag), keep only samples with n ≥ lag, and fit y ≈ a·shifted + d by least squares, returning `(a, d)` as plain floats.

```python starter
import numpy as np

def best_lag(x, y):
    return 0

def refined_lag(x, y):
    return 0.0

def gain_offset(x, y, lag):
    return (1.0, 0.0)

n = np.arange(200)
x = np.exp(-((n - 60) / 8.0) ** 2)
print(best_lag(x, np.roll(x, 15)))
```

```python solution
import numpy as np

def _corr(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    return np.correlate(y - y.mean(), x - x.mean(), "full"), len(x) - 1

def best_lag(x, y):
    R, off = _corr(x, y)
    return int(np.argmax(R)) - off

def refined_lag(x, y):
    R, off = _corr(x, y)
    i = int(np.argmax(R))
    if i == 0 or i == len(R) - 1:
        return float(i - off)
    den = R[i - 1] - 2 * R[i] + R[i + 1]
    frac = 0.0 if den == 0 else 0.5 * (R[i - 1] - R[i + 1]) / den
    return float(i - off + frac)

def gain_offset(x, y, lag):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    n = np.arange(len(x))
    shifted = np.interp(n - lag, n, x)
    keep = n >= lag
    A = np.column_stack([shifted[keep], np.ones(keep.sum())])
    (a, d), *_ = np.linalg.lstsq(A, y[keep], rcond=None)
    return float(a), float(d)

n = np.arange(200)
x = np.exp(-((n - 60) / 8.0) ** 2)
print(best_lag(x, np.roll(x, 15)))
```

```python test
import math
import numpy as np
for _n in ["best_lag", "refined_lag", "gain_offset"]:
    assert _n in dir(), f"Define {_n}."
_n = np.arange(400)
_x = np.exp(-((_n - 120) / 10.0) ** 2) * np.sin(_n / 3.0)
assert best_lag(_x, np.roll(_x, 25)) == 25 and type(best_lag(_x, _x)) is int, "A pure 25-sample delay; plain int."
assert best_lag(list(_x), list(np.roll(_x, -12))) == -12, "y leading gives a negative lag; lists work."
assert best_lag(_x, 3 * np.roll(_x, 7) + 5) == 7, "Gain and offset do not move the peak."
_true = 17.3
_y = np.interp(_n - _true, _n, _x)
_r = refined_lag(_x, _y)
assert type(_r) is float and abs(_r - _true) < 0.1, f"A 17.3-sample delay refined to within 0.1; got {_r}."
_g = np.random.default_rng(1)
_xn = _x + _g.normal(0, 0.01, _n.size)
_yn = 2.5 * np.interp(_n - _true, _n, _x) + 0.8 + _g.normal(0, 0.01, _n.size)
_lag = refined_lag(_xn, _yn)
_a, _d = gain_offset(_xn, _yn, _lag)
assert abs(_a - 2.5) < 0.05 and abs(_d - 0.8) < 0.02 and type(_a) is float, f"Gain 2.5 and offset 0.8 recovered; got {(_a, _d)}."
_a0, _ = gain_offset(_xn, _yn, float(best_lag(_xn, _yn)))
assert abs(_a0 - 2.5) > abs(_a - 2.5), "The refined lag gives a better gain than the rounded one."
"SUCCESS: Cross-correlation finds the delay whatever the gain and offset, and once aligned, a straight-line fit recovers them."
```

Hint: The "full" correlation has 2N − 1 entries, lag −(N − 1) first. The parabola's vertex is at ½(R₋ − R₊)/(R₋ − 2R₀ + R₊) from the peak. For the gain, interpolate x at the indices n − lag and fit the columns [shifted, 1].
:::

::: challenge Estimating a stretch [hard]
Write `estimate_stretch(template, t, y, bs)`: `template` is a function of time (taking arrays), `t` the sample times and `y` the recorded samples. For each candidate b in `bs` compute the correlation coefficient between template(b·t) and y, and return `(b, score)` for the best candidate as plain floats (ties go to the first). Raise `ValueError` if `bs` is empty or t and y differ in length. Then write `refine_stretch(template, t, y, lo, hi, tol=1e-6)`: assuming the correlation has a single peak on [lo, hi], find the best b by golden-section search (the finding-the-best lesson) to within `tol`, returning a plain float.

```python starter
import numpy as np

def estimate_stretch(template, t, y, bs):
    return (1.0, 0.0)

def refine_stretch(template, t, y, lo, hi, tol=1e-6):
    return 1.0

t = np.linspace(0, 1, 1000)
chirp = lambda u: np.sin(2 * np.pi * 3 * u ** 2)
print(estimate_stretch(chirp, t, chirp(t / 1.08), np.linspace(0.8, 1.2, 41)))
```

```python solution
import math
import numpy as np

def _score(template, t, y, b):
    return float(np.corrcoef(template(b * t), y)[0, 1])

def estimate_stretch(template, t, y, bs):
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    bs = list(bs)
    if not bs or t.size != y.size:
        raise ValueError("need candidates and matching t and y")
    best = None
    for b in bs:
        s = _score(template, t, y, b)
        if best is None or s > best[1]:
            best = (float(b), s)
    return best

def refine_stretch(template, t, y, lo, hi, tol=1e-6):
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    g = (math.sqrt(5) - 1) / 2
    c, d = hi - g * (hi - lo), lo + g * (hi - lo)
    fc, fd = _score(template, t, y, c), _score(template, t, y, d)
    while hi - lo > tol:
        if fc > fd:
            hi, d, fd = d, c, fc
            c = hi - g * (hi - lo)
            fc = _score(template, t, y, c)
        else:
            lo, c, fc = c, d, fd
            d = lo + g * (hi - lo)
            fd = _score(template, t, y, d)
    return float((lo + hi) / 2)

t = np.linspace(0, 1, 1000)
chirp = lambda u: np.sin(2 * np.pi * 3 * u ** 2)
print(estimate_stretch(chirp, t, chirp(t / 1.08), np.linspace(0.8, 1.2, 41)))
```

```python test
import math
import numpy as np
for _n in ["estimate_stretch", "refine_stretch"]:
    assert _n in dir(), f"Define {_n}."
_ts65 = np.linspace(0, 1, 1000)
_chirp65 = lambda u: np.sin(2 * np.pi * 3 * u ** 2)
_bst65, _sc65 = estimate_stretch(_chirp65, _ts65, _chirp65(_ts65 / 1.08), np.linspace(0.8, 1.2, 41))
assert type(_bst65) is float and type(_sc65) is float and abs(_bst65 - 0.93) < 1e-9 and _sc65 > 0.99, f"Grid of 0.01: b = 0.93 is closest to 1/1.08; got {(_bst65, _sc65)}."
_gen65 = np.random.default_rng(3)
_ys65 = 4 * _chirp65(_ts65 * 1.12) - 2 + _gen65.normal(0, 0.05, _ts65.size)
_bst2, _ = estimate_stretch(_chirp65, list(_ts65), list(_ys65), np.linspace(0.9, 1.3, 401))
assert abs(_bst2 - 1.12) < 0.002, f"Gain and offset do not matter: b ≈ 1.12; got {_bst2}."
for _bad in [(_chirp65, _ts65, _ys65, []), (_chirp65, _ts65[:-1], _ys65, [1.0])]:
    try:
        estimate_stretch(*_bad)
        assert False, "Empty candidates or mismatched lengths should raise ValueError."
    except ValueError:
        pass
_ref65 = refine_stretch(_chirp65, _ts65, _chirp65(_ts65 / 1.08), 0.88, 0.98)
assert type(_ref65) is float and abs(_ref65 - 1 / 1.08) < 1e-5, f"Golden section finds 1/1.08 = 0.925926; got {_ref65}."
assert abs(refine_stretch(_chirp65, _ts65, _ys65, 1.05, 1.2) - 1.12) < 0.002, "Refined on noisy data."
"SUCCESS: A stretch moves late events more than early ones, so it is found by scoring candidate stretches, then refined by golden-section search."
```

Hint: `np.corrcoef(a, b)[0, 1]` is the correlation coefficient, which ignores gain and offset. Golden section keeps two interior points at the golden-ratio fractions of [lo, hi]; maximise by keeping the side of the higher score.
:::

## What you learned

- a·f(b(x − c)) + d shifts right by c, lifts by d, stretches vertically by a and squeezes horizontally by b; changes inside f act on the input in the opposite way to how they look.
- f(−x) and −f(x) are reflections; every function splits into an even part and an odd part (for eˣ, cosh and sinh).
- Cross-correlation finds the delay between two signals regardless of gain and offset, and a parabola through the peak refines it to a fraction of a sample.
- With the delay known, gain and offset follow from a straight-line fit; noise in the reference signal biases the gain low (regression dilution), as can a misalignment that is large compared with the signal's wiggles.
- A time stretch moves late events more than early ones; it is estimated by scoring candidate stretches and refining the best.

The next lesson returns to one family of functions in depth: quadratics, their vertex form, and where they appear in motion and design.
