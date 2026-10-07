# Power laws and log–log plots

A mouse's heart beats about 600 times a minute and an elephant's about 30. A cutting tool lasts an hour at one speed and ten minutes at a speed only 1.6 times higher. Pressure losses in a pipe grow faster than the flow. Behind each of these is a **power law**, y = c·xᵖ: double the input and the output is multiplied by the same factor 2ᵖ, whatever the starting size. The plotting lesson showed that power laws become straight lines on log–log axes. This lesson works with them seriously. It covers what scale invariance means, how to fit an exponent and its uncertainty, when the log–log fit is right and when it misleads, the tool-life law that sets cutting speeds in every machine shop, and power-law **tails**, where rare large events are far more common than a bell curve predicts.

This lesson covers:

- scale invariance: y = c·xᵖ, f(kx) = kᵖ·f(x), and straight lines on log–log axes;
- fitting an exponent by regression on logarithms, with its uncertainty;
- multiplicative versus additive noise, and when the log–log fit is biased;
- Taylor's tool-life equation: fitting and using it;
- power-law tails, and estimating their exponent.

## Scale invariance

::: math
\[ y = c\,x^p \;\Longrightarrow\; \frac{y(kx)}{y(x)} = k^p, \qquad \log y = \log c + p \log x \]
- $p$: the exponent; $c$: the prefactor; $k$: any scale factor
- multiplying the input by $k$ multiplies the output by $k^p$, at every size: there is no special scale
- on log–log axes a power law is a straight line of slope $p$
In code: the ratio $y(2x)/y(x)$ for a power law and for an exponential at several $x$
:::

Exponentials and power laws are easily confused, and they behave very differently. For an exponential y = e^(ax), doubling x does very different things depending on where you start. For a power law y = c·xᵖ, doubling x always multiplies y by 2ᵖ. Nothing in the law singles out a particular size: it is **scale invariant**. That is why power laws describe phenomena that span many orders of magnitude, from mice to whales, small motors to large ones, small faults to large. Taking logarithms gives log y = log c + p log x, a straight line on log–log axes with slope equal to the exponent, the plotting lesson's observation.

Predict before running: for y = 3x^0.75 and y = e^(0.5x), what is y(2x)/y(x) at x = 1, 10 and 100?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
from scipy import stats

power = lambda x: 3 * x ** 0.75
expo = lambda x: np.exp(0.5 * x)
for x in [1.0, 10.0, 100.0]:
    print(f"x = {x:>5}: power law y(2x)/y(x) = {power(2 * x) / power(x):.4f},  exponential y(2x)/y(x) = {expo(2 * x) / expo(x):.4g}")
print("2^0.75 =", round(2 ** 0.75, 4))
```

```output
x =   1.0: power law y(2x)/y(x) = 1.6818,  exponential y(2x)/y(x) = 1.649
x =  10.0: power law y(2x)/y(x) = 1.6818,  exponential y(2x)/y(x) = 148.4
x = 100.0: power law y(2x)/y(x) = 1.6818,  exponential y(2x)/y(x) = 5.185e+21
2^0.75 = 1.6818
```

The power law's ratio is always 2^0.75 = 1.6818, whatever the starting x. The exponential's ratio is 1.65 at x = 1, 148 at x = 10 and 5 × 10²¹ at x = 100: the bigger it is, the faster it grows. A ratio that stays fixed under scaling is the signature of a power law.

## Fitting an exponent

::: math
\[ \log y_i = \log c + p\,\log x_i + \varepsilon_i, \qquad \hat{p} \pm t\,\mathrm{SE}(\hat{p}), \qquad \hat{c} = 10^{\,\widehat{\log c}} \]
- a straight-line fit to $(\log x_i, \log y_i)$ gives the exponent as the slope and $\log c$ as the intercept
- the slope's standard error and the $t$ distribution give a confidence interval, as in the fitting-a-line lesson
In code: `stats.linregress(np.log10(mass), np.log10(rate))` on metabolic-rate data spanning over five orders of magnitude
:::

To measure an exponent, fit a straight line to the logarithms. The slope estimates p, the intercept log c, and the standard error of the slope gives a confidence interval, exactly as in the fitting-a-line lesson. Biology's most famous power law, **Kleiber's law**, says an animal's resting metabolic rate grows like its mass to the power ¾, not to the power 1 that simple proportion suggests. A 10,000-fold heavier animal burns only 1,000 times the energy. Machines have scaling laws of their own, with their own exponents.

Predict before running: 40 simulated species from 20 g to 4 tonnes. What exponent does the fit find, and how precisely?

```python type
rng = np.random.default_rng(70)
survey = np.random.default_rng(72)
mass = 10 ** survey.uniform(np.log10(0.02), np.log10(4000), 40)
rate = 3.4 * mass ** 0.75 * np.exp(survey.normal(0, 0.15, mass.size))
fit = stats.linregress(np.log10(mass), np.log10(rate))
t95 = stats.t.ppf(0.975, mass.size - 2)
print(f"exponent {fit.slope:.4f} ± {t95 * fit.stderr:.4f} (95%), prefactor {10 ** fit.intercept:.3f} W/kg^p, R² {fit.rvalue ** 2:.4f}")
print(f"predicted rate for a 70 kg animal: {10 ** fit.intercept * 70 ** fit.slope:.0f} W")

fig, ax = plt.subplots(figsize=(5, 3.5))
ax.loglog(mass, rate, "o", markersize=4)
mm = np.logspace(-2, 4, 50)
ax.loglog(mm, 10 ** fit.intercept * mm ** fit.slope, label=f"slope {fit.slope:.3f}")
ax.set_xlabel("body mass (kg)")
ax.set_ylabel("metabolic rate (W)")
ax.legend(fontsize=8)
plt.show()
```

```output
exponent 0.7477 ± 0.0120 (95%), prefactor 3.316 W/kg^p, R² 0.9976
predicted rate for a 70 kg animal: 79 W
```

The fit gives an exponent of 0.748 with a 95% interval of ±0.012 from 40 points, covering the true 0.75. On this simulated data that rules out both 2/3 (surface-area scaling) and 1 (simple proportion). Real measurements are messier: estimates for mammals range from about 0.67 to 0.75 depending on the species and how body temperature and activity are controlled, and the debate continues. The predicted rate for a 70 kg animal is about 79 W, in line with a resting human. On log–log axes the data scatter evenly around a straight line, because the scatter here is multiplicative, the same percentage at every size.

## Multiplicative or additive noise?

::: math
\[ y = c\,x^p\,e^{\varepsilon} \;\Rightarrow\; \text{fit on logs}, \qquad y = c\,x^p + \varepsilon \;\Rightarrow\; \min_{c, p} \sum_i \big(y_i - c\,x_i^p\big)^2 \]
- multiplicative errors (the same percentage at every size) become additive on the log scale: the log–log fit is the right one
- additive errors (the same absolute size everywhere) blow up on the log scale for small $y$: fit the power law directly by non-linear least squares
In code: data with additive noise fitted both ways, `curve_fit` for the direct fit
:::

Taking logarithms changes the noise as well as the curve. If measurement errors are a fixed **percentage** (multiplicative), they become a fixed **size** on the log scale, and the log–log line fit is exactly right. But many instruments have a fixed **absolute** error, such as a scale that reads ±0.5 g whatever is on it. Then small values have huge relative errors, which on the log scale become huge errors. They distort the log fit, and for values near zero the logarithm may not even exist. The cure is to fit y = c·xᵖ directly by **non-linear least squares**, minimising the squared errors in y itself. `scipy.optimize.curve_fit` does this, starting from a guess, such as the log–log answer.

Predict before running: data from y = 2x^1.5 with additive noise of fixed size. Which fit recovers the exponent better?

```python type
x_add = np.linspace(0.2, 10, 40)
y_add = 2 * x_add ** 1.5 + rng.normal(0, 1.0, x_add.size)
keep = y_add > 0
log_fit = stats.linregress(np.log10(x_add[keep]), np.log10(y_add[keep]))
(c_nl, p_nl), cov = curve_fit(lambda x, c, p: c * x ** p, x_add, y_add, p0=[10 ** log_fit.intercept, log_fit.slope])
print(f"{(~keep).sum()} non-positive values had to be dropped for the log fit")
print(f"log–log fit:        p = {log_fit.slope:.3f}, c = {10 ** log_fit.intercept:.3f}")
print(f"direct (curve_fit): p = {p_nl:.3f} ± {1.96 * math.sqrt(cov[1, 1]):.3f}, c = {c_nl:.3f}   (true p = 1.5, c = 2)")
```

```output
1 non-positive values had to be dropped for the log fit
log–log fit:        p = 1.546, c = 1.871
direct (curve_fit): p = 1.491 ± 0.035, c = 2.049   (true p = 1.5, c = 2)
```

With additive noise of size 1 the smallest values are mostly noise; on the log scale they have outsized influence, and the log–log fit's exponent (1.55) and prefactor (1.87) are both pulled away from the truth. The direct fit recovers p close to 1.5, with an interval that covers it, and c close to 2. The lesson is to look at the residuals on the log scale before trusting a log–log fit. They should have the same spread everywhere, as Kleiber's data did. If they fan out at the small end, the noise is additive, and the direct fit is the right one.

## Taylor's tool-life equation

::: math
\[ v\,T^{\,n} = C \;\Longleftrightarrow\; T = \left(\frac{C}{v}\right)^{1/n}, \qquad \log v = \log C - n \log T \]
- $v$: cutting speed (m/min); $T$: tool life (min) until the edge is worn out; $n$: Taylor exponent (about 0.1 for high-speed steel, 0.2–0.3 for carbide, more for ceramics); $C$: the speed that gives a 1-minute life
- tool life is a power law in speed with the steep exponent $-1/n$: a modest increase in speed costs a lot of life
In code: four cutting tests fitted on log–log axes; the life at a new speed, and the speed for a target life
:::

In 1907 F. W. Taylor published the result of tens of thousands of cutting experiments. A tool's life T and its cutting speed v satisfy v·Tⁿ = C, a power law. For carbide tools n is about 0.25, so tool life goes like v⁻⁴: cutting 20% faster cuts the life by more than half. Every machine shop's speed choices are trade-offs on this curve. Faster cutting finishes parts sooner but costs more tool changes. Taking logarithms gives a straight line, log v = log C − n log T, so a few tests at different speeds determine n and C.

Predict before running: tests at 150, 200, 250 and 300 m/min give lives of 58, 18, 7.8 and 3.6 minutes. What are n and C, how long will the tool last at 180 m/min, and what speed gives a 30-minute life?

```python type
v_test = np.array([150.0, 200.0, 250.0, 300.0])
T_test = np.array([58.0, 18.0, 7.8, 3.6])
tf = stats.linregress(np.log10(T_test), np.log10(v_test))
n_taylor, C_taylor = -tf.slope, 10 ** tf.intercept
print(f"Taylor exponent n = {n_taylor:.3f}, C = {C_taylor:.0f} m/min (R² {tf.rvalue ** 2:.4f})")
print(f"tool life at 180 m/min: {(C_taylor / 180) ** (1 / n_taylor):.1f} min")
print(f"speed for a 30-minute life: {C_taylor / 30 ** n_taylor:.0f} m/min")
for v in [150, 180, 200]:
    print(f"  at {v} m/min: life {(C_taylor / v) ** (1 / n_taylor):5.1f} min")
```

```output
Taylor exponent n = 0.251, C = 415 m/min (R² 0.9996)
tool life at 180 m/min: 28.0 min
speed for a 30-minute life: 177 m/min
  at 150 m/min: life  57.8 min
  at 180 m/min: life  28.0 min
  at 200 m/min: life  18.4 min
```

The fit gives n ≈ 0.25, typical of carbide, and C ≈ 415 m/min, the speed at which the edge would last a single minute. At 180 m/min the tool lasts about 28 minutes, and a 30-minute life needs about 177 m/min. The table shows the steepness: from 150 to 200 m/min, a third faster, the life falls from about 58 to 18 minutes. Economic cutting-speed calculations balance this falling life against the rising cutting rate, using exactly this power law.

## Power-law tails

::: math
\[ P(X > x) = \left(\frac{x}{x_\text{min}}\right)^{-\alpha} \;(x \ge x_\text{min}), \qquad \hat{\alpha} = \frac{n}{\sum_i \ln(x_i / x_\text{min})}, \qquad X = x_\text{min}\,U^{-1/\alpha} \]
- a Pareto distribution: the chance of exceeding $x$ falls as a power of $x$, far more slowly than a normal or exponential tail
- $n$: the number of values; $x_i$: the values; $\alpha$: the tail exponent; $x_\text{min}$: where the power-law tail starts
- the **Hill estimator** $\hat{\alpha}$ is the maximum-likelihood exponent; fitting a straight line to a histogram on log–log axes is biased
- $U$ uniform on (0, 1]: inverse-transform sampling generates Pareto data
In code: Pareto samples with $\alpha = 1.5$; the Hill estimate; the empirical survival function on log–log axes
:::

Some quantities have **heavy tails**: rare enormous values are far more common than a bell curve allows. Earthquake energies, the sizes of power-grid blackouts, insurance claims, file sizes and the lengths of machine downtime often follow a power law in their tail. The probability of exceeding x falls as x^(−α), so a 10-times-larger event is only 10^α times rarer. For α near 1 the mean barely exists and averages are dominated by the largest events. Estimating α well matters for designing reserves and margins.

The obvious method, a straight line through a histogram on log–log axes, is unreliable: the sparse bins in the tail are noisy and the bin choice changes the answer. The maximum-likelihood **Hill estimator** uses every value directly. The empirical **survival function**, the fraction of values above each x, is the honest way to look at a tail on log–log axes.

Predict before running: 2,000 values drawn from a Pareto law with α = 1.5. How close is the Hill estimate, and what fraction of the total do the largest 1% of values make up?

```python type
alpha_true, xmin = 1.5, 1.0
u = 1 - rng.random(2000)
sample = xmin * u ** (-1 / alpha_true)
alpha_hat = sample.size / np.log(sample / xmin).sum()
print(f"Hill estimate α = {alpha_hat:.3f} (true {alpha_true}); standard error about {alpha_hat / math.sqrt(sample.size):.3f}")
sorted_desc = np.sort(sample)[::-1]
print(f"largest value {sorted_desc[0]:.0f}; the top 1% of values hold {sorted_desc[:20].sum() / sample.sum():.0%} of the total")
print(f"for comparison, normal data with the same mean: largest {rng.normal(sample.mean(), sample.std(), 2000).max():.1f}")

xs_sorted = np.sort(sample)
surv_frac = 1 - np.arange(xs_sorted.size) / xs_sorted.size
fig, ax = plt.subplots(figsize=(5, 3.5))
ax.loglog(xs_sorted, surv_frac, ".", markersize=3, label="data: P(X > x)")
ax.loglog(xs_sorted, (xs_sorted / xmin) ** -alpha_hat, label=f"Hill fit, slope -{alpha_hat:.2f}")
ax.set_xlabel("x")
ax.legend(fontsize=8)
plt.show()
```

```output
Hill estimate α = 1.506 (true 1.5); standard error about 0.034
largest value 459; the top 1% of values hold 25% of the total
for comparison, normal data with the same mean: largest 48.4
```

The Hill estimate comes out close to 1.5, with a standard error of about α/√n ≈ 0.03. The largest of 2,000 values is in the hundreds, and the top 1% of values hold about a quarter of the total. Normal data with the same mean and spread never stray more than a few standard deviations. On log–log axes the survival function is a straight line of slope −α over two orders of magnitude, getting ragged only at the extreme where there are a handful of points. Designing for "the largest event seen so far" is dangerous for heavy-tailed quantities: the next one may be much larger.

::: challenge Fitting power laws [easy]
Write `fit_power_law(x, y)`: fit y = c·xᵖ by a straight-line least-squares fit of log₁₀ y on log₁₀ x, returning `(c, p)` as plain floats; x and y may be lists or arrays; raise `ValueError` if any value is not positive, the lengths differ, or there are fewer than 2 points. Write `scale_ratio(p, k)`: the factor by which y changes when x is multiplied by k, as a plain float. Then write `doubling_exponent(y1, y2)`: the exponent p implied when doubling x changes y from y1 to y2 (both positive), as a plain float.

```python starter
import numpy as np

def fit_power_law(x, y):
    return (1.0, 1.0)

def scale_ratio(p, k):
    return 1.0

def doubling_exponent(y1, y2):
    return 1.0

print(fit_power_law([1, 2, 4, 8], [3, 5.045, 8.485, 14.27]))
```

```python solution
import math
import numpy as np

def fit_power_law(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.size != y.size or x.size < 2 or np.any(x <= 0) or np.any(y <= 0):
        raise ValueError("need matching positive data, at least two points")
    p, logc = np.polyfit(np.log10(x), np.log10(y), 1)
    return float(10 ** logc), float(p)

def scale_ratio(p, k):
    return float(k ** p)

def doubling_exponent(y1, y2):
    if y1 <= 0 or y2 <= 0:
        raise ValueError("values must be positive")
    return float(math.log2(y2 / y1))

print(fit_power_law([1, 2, 4, 8], [3, 5.045, 8.485, 14.27]))
```

```python test
import math
import numpy as np
for _n in ["fit_power_law", "scale_ratio", "doubling_exponent"]:
    assert _n in dir(), f"Define {_n}."
_x = np.array([0.5, 1, 2, 5, 10, 30.0])
_c, _p = fit_power_law(_x, 3 * _x ** 0.75)
assert type(_c) is float and abs(_c - 3) < 1e-9 and abs(_p - 0.75) < 1e-12, f"Exact data: (3, 0.75); got {(_c, _p)}."
_c2, _p2 = fit_power_law(list(_x), list(0.2 * _x ** -1.3))
assert abs(_c2 - 0.2) < 1e-9 and abs(_p2 + 1.3) < 1e-12, "Negative exponents; lists work."
_xn = np.array([1, 2, 4, 8, 16.0])
_yn = 5 * _xn ** 0.5 * np.array([1.1, 0.9, 1.05, 0.97, 1.08])
_m, _bb = np.polyfit(np.log10(_xn), np.log10(_yn), 1)
_cn, _pn = fit_power_law(_xn, _yn)
assert abs(_pn - _m) < 1e-9 and abs(_cn - 10 ** _bb) < 1e-9, "A least-squares line through all the points, not just the ends."
for _bad in [([1, 2], [3, -1]), ([0, 2], [1, 2]), ([1, 2, 3], [1, 2]), ([1], [1])]:
    try:
        fit_power_law(*_bad)
        assert False, f"fit_power_law{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(scale_ratio(0.75, 2) - 2 ** 0.75) < 1e-12 and abs(scale_ratio(-4, 1.2) - 1.2 ** -4) < 1e-12 and type(scale_ratio(2, 3)) is float, "k^p."
assert abs(doubling_exponent(10, 80) - 3) < 1e-12 and abs(doubling_exponent(5, 5) - 0) < 1e-12 and abs(doubling_exponent(4, 2) + 1) < 1e-12, "log2 of the ratio."
"SUCCESS: A power law is a straight line on log–log axes, and its slope is the exponent that every doubling multiplies by."
```

Hint: `np.polyfit(np.log10(x), np.log10(y), 1)` returns [slope, intercept]: the slope is p and 10^intercept is c. Doubling x multiplies y by 2ᵖ, so p = log₂(y₂/y₁).
:::

::: challenge Tool life [medium]
Write `taylor_fit(speeds, lives)`: fit Taylor's equation v·Tⁿ = C to cutting tests (speeds in m/min, lives in minutes) by a least-squares line of log v against log T, returning `(n, C)` as plain floats; raise `ValueError` for fewer than 2 tests, mismatched lengths or non-positive values. Write `tool_life(v, n, C)` and `speed_for_life(T, n, C)`, both plain floats. Then write `cost_per_part(v, n, C, cut_length_m, tool_cost, change_time_min, rate_per_min)`: the cost of machining one part, where cutting takes cut_length_m / v minutes, each part uses up (cutting time)/T of a tool edge, and each tool change costs tool_cost plus change_time_min of machine time; cost = rate_per_min × (cutting time + change_time_min × cutting time/T) + tool_cost × cutting time/T.

```python starter
import numpy as np

def taylor_fit(speeds, lives):
    return (0.25, 400.0)

def tool_life(v, n, C):
    return 0.0

def speed_for_life(T, n, C):
    return 0.0

def cost_per_part(v, n, C, cut_length_m, tool_cost, change_time_min, rate_per_min):
    return 0.0

print(taylor_fit([150, 200, 250, 300], [58, 18, 7.8, 3.6]))
```

```python solution
import numpy as np

def taylor_fit(speeds, lives):
    v = np.asarray(speeds, dtype=float)
    T = np.asarray(lives, dtype=float)
    if v.size != T.size or v.size < 2 or np.any(v <= 0) or np.any(T <= 0):
        raise ValueError("need at least two matching positive tests")
    slope, intercept = np.polyfit(np.log10(T), np.log10(v), 1)
    return float(-slope), float(10 ** intercept)

def tool_life(v, n, C):
    return float((C / v) ** (1 / n))

def speed_for_life(T, n, C):
    return float(C / T ** n)

def cost_per_part(v, n, C, cut_length_m, tool_cost, change_time_min, rate_per_min):
    t_cut = cut_length_m / v
    share = t_cut / tool_life(v, n, C)
    return float(rate_per_min * (t_cut + change_time_min * share) + tool_cost * share)

print(taylor_fit([150, 200, 250, 300], [58, 18, 7.8, 3.6]))
```

```python test
import numpy as np
for _n in ["taylor_fit", "tool_life", "speed_for_life", "cost_per_part"]:
    assert _n in dir(), f"Define {_n}."
_v = np.array([120.0, 160.0, 220.0, 300.0])
_T = (400 / _v) ** (1 / 0.25)
_n_, _C = taylor_fit(_v, _T)
assert type(_n_) is float and abs(_n_ - 0.25) < 1e-9 and abs(_C - 400) < 1e-6, f"Exact data: (0.25, 400); got {(_n_, _C)}."
_n2, _C2 = taylor_fit([150, 200, 250, 300], [58, 18, 7.8, 3.6])
assert abs(_n2 - 0.25096) < 5e-4 and abs(_C2 - 415.25) < 1, f"The lesson's tests: n ≈ 0.251, C ≈ 415 (a least-squares fit through all four tests); got {(_n2, _C2)}."
for _bad in [([150], [10]), ([150, 200], [10]), ([150, -200], [10, 5])]:
    try:
        taylor_fit(*_bad)
        assert False, f"taylor_fit{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(tool_life(200, 0.25, 400) - 16.0) < 1e-9 and abs(speed_for_life(16, 0.25, 400) - 200) < 1e-9, "(400/200)^4 = 16 min, and back."
assert abs(tool_life(240, 0.25, 400) / tool_life(200, 0.25, 400) - (200 / 240) ** 4) < 1e-12, "20% faster: life × (1/1.2)^4 = 0.48."
_c = cost_per_part(200, 0.25, 400, 100, 15.0, 2.0, 1.5)
assert type(_c) is float and abs(_c - (1.5 * (0.5 + 2.0 * 0.5 / 16) + 15 * 0.5 / 16)) < 1e-12, f"Cost at 200 m/min; got {_c}."
_speeds = np.arange(80, 400, 1.0)
_costs = [cost_per_part(s, 0.25, 400, 100, 15.0, 2.0, 1.5) for s in _speeds]
_best = _speeds[int(np.argmin(_costs))]
assert 150 < _best < 260, f"The cheapest speed lies between the slow and fast extremes; got {_best}."
"SUCCESS: Tool life is a steep power law in speed, and the cheapest cutting speed balances machine time against tool wear."
```

Hint: Fit `np.polyfit(np.log10(T), np.log10(v), 1)`: the slope is −n and 10^intercept is C. Life is (C/v)^(1/n). Each part uses cutting time / life of an edge, and pays that fraction of a tool and of a tool change.
:::

::: challenge Heavy tails [hard]
Write `pareto_sample(alpha, xmin, n, seed=0)`: n values from the Pareto distribution P(X > x) = (x/xmin)^(−α), generated by inverse transform as xmin·U^(−1/α) with U = 1 − `np.random.default_rng(seed).random(n)`; return a NumPy array; raise `ValueError` unless alpha > 0, xmin > 0 and n ≥ 1. Write `hill_estimate(values, xmin)`: the maximum-likelihood exponent n / Σ ln(xᵢ/xmin) using only the values ≥ xmin, as a plain float; raise `ValueError` if fewer than 2 values are ≥ xmin. Then write `survival(values)`: two NumPy arrays `(xs, p)` with the values sorted ascending and p[i] = (N − i)/N (each value, ties included, takes its own step down).

```python starter
import numpy as np

def pareto_sample(alpha, xmin, n, seed=0):
    return np.full(n, float(xmin))

def hill_estimate(values, xmin):
    return 1.0

def survival(values):
    return np.sort(values), np.ones(len(values))

print(hill_estimate(pareto_sample(1.5, 1.0, 5000), 1.0))
```

```python solution
import numpy as np

def pareto_sample(alpha, xmin, n, seed=0):
    if alpha <= 0 or xmin <= 0 or n < 1:
        raise ValueError("need alpha > 0, xmin > 0, n >= 1")
    u = 1 - np.random.default_rng(seed).random(n)
    return xmin * u ** (-1 / alpha)

def hill_estimate(values, xmin):
    v = np.asarray(values, dtype=float)
    v = v[v >= xmin]
    if v.size < 2:
        raise ValueError("need at least two values above xmin")
    return float(v.size / np.log(v / xmin).sum())

def survival(values):
    xs = np.sort(np.asarray(values, dtype=float))
    N = xs.size
    return xs, (N - np.arange(N)) / N

print(hill_estimate(pareto_sample(1.5, 1.0, 5000), 1.0))
```

```python test
import math
import numpy as np
for _n in ["pareto_sample", "hill_estimate", "survival"]:
    assert _n in dir(), f"Define {_n}."
_s = pareto_sample(1.5, 2.0, 20000, seed=4)
assert isinstance(_s, np.ndarray) and _s.size == 20000 and _s.min() >= 2.0, "n values, none below xmin."
assert abs(np.mean(_s > 6.0) - 3.0 ** -1.5) < 0.01, "P(X > 3 xmin) = 3^-1.5 ≈ 0.19."
_u = 1 - np.random.default_rng(4).random(20000)
assert np.allclose(_s, 2.0 * _u ** (-1 / 1.5)), "Use the stated inverse transform and seed."
for _bad in [(0, 1, 10), (1.5, 0, 10), (1.5, 1, 0)]:
    try:
        pareto_sample(*_bad)
        assert False, f"pareto_sample{_bad} should raise ValueError."
    except ValueError:
        pass
_a = hill_estimate(_s, 2.0)
assert type(_a) is float and abs(_a - 1.5) < 0.05, f"Hill estimate near 1.5; got {_a}."
assert abs(hill_estimate(list(pareto_sample(3.0, 1.0, 20000, seed=9)), 1.0) - 3.0) < 0.1, "α = 3; lists work."
_mixed = np.concatenate([np.full(500, 0.5), pareto_sample(2.0, 1.0, 5000, seed=2)])
assert abs(hill_estimate(_mixed, 1.0) - hill_estimate(pareto_sample(2.0, 1.0, 5000, seed=2), 1.0)) < 1e-12, "Values below xmin are ignored."
try:
    hill_estimate([0.5, 0.7, 3.0], 1.0)
    assert False, "Only one value above xmin: ValueError."
except ValueError:
    pass
_xs, _p = survival([3.0, 1.0, 2.0, 2.0])
assert np.allclose(_xs, [1, 2, 2, 3]) and np.allclose(_p, [1.0, 0.75, 0.5, 0.25]), "Sorted values and the fraction at or above each."
"SUCCESS: Heavy tails are straight lines of slope -α on a log–log survival plot, and the Hill estimator measures α from every value."
```

Hint: Inverse transform: if U is uniform on (0, 1], then xmin·U^(−1/α) has the Pareto survival function. The Hill estimator is the count divided by the sum of ln(x/xmin) over the values at or above xmin. For the survival function, sort and use (N − i)/N.
:::

## What you learned

- A power law y = c·xᵖ is scale invariant: multiplying x by k multiplies y by kᵖ at every size, and it is a straight line of slope p on log–log axes.
- Exponents are fitted as slopes of log y against log x, with confidence intervals from the slope's standard error; Kleiber's ¾ law is the classic example.
- The log–log fit suits multiplicative (percentage) noise; with additive noise of fixed size, fit the power law directly by non-linear least squares.
- Taylor's tool-life law vTⁿ = C makes tool life a steep power law in speed; fitting it from a few tests sets economic cutting speeds.
- Heavy-tailed quantities have power-law survival functions; the Hill estimator measures the exponent, and the largest events dominate totals.

The next lesson studies lists of numbers generated step by step: arithmetic and geometric sequences, from depreciation to tool wear.
