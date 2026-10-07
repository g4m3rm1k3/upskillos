# Random variables and distributions

Measure the same shaft ten times with a micrometer and you get ten slightly different readings. Count defective parts in boxes of 50 and the count changes from box to box. Neither number can be predicted exactly, but both follow patterns: readings cluster around the true diameter, counts of 0, 1 and 2 are common while 6 is rare. A quantity whose value comes from a random process is a **random variable**, and the pattern of its values is its **distribution**. This lesson describes distributions by their probabilities, their mean and their spread, builds the binomial and normal distributions from simulation and formula, and shows why the bell curve appears whenever many small errors add up, which is the reason engineers can design tolerances statistically.

This lesson covers:

- random variables, discrete and continuous, and their distributions;
- the binomial distribution for counts of defectives;
- expected value and variance, and how they combine;
- continuous distributions, densities, and the normal curve;
- why sums of many small errors are approximately normal;
- tolerance stacking: worst case against statistics.

## Counting defectives: the binomial distribution

::: math
\[ P(K = k) = \binom{n}{k}\,p^k\,(1 - p)^{n - k}, \qquad k = 0, 1, \dots, n \]
- $K$: number of defectives in a box of $n$, each defective with probability $p$
- $\binom{n}{k}$ counts the ways to choose which $k$ parts are bad
In code: `binom_pmf(k, n, p)` against `rng.binomial(n, p, size=...)`
:::


The number of defective parts K in a box of n, each independently defective with probability p, is a **discrete** random variable: it takes whole-number values. Its distribution lists P(K = k) for each k. Choosing which k of the n parts are defective can be done in C(n, k) ways, each with probability pᵏ(1 − p)ⁿ⁻ᵏ, so

\[ P(K = k) = \binom{n}{k} p^k (1-p)^{n-k} \]

the **binomial distribution**. Predict before running: in boxes of 50 at a 2% defect rate, which count is most likely, 0 or 1?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(27)
n, p = 50, 0.02

def binom_pmf(k, n, p):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

counts = rng.binomial(n, p, size=100_000)
for k in range(6):
    print(f"k = {k}: formula {binom_pmf(k, n, p):.4f}, simulated {(counts == k).mean():.4f}")

ks = np.arange(0, 7)
fig, ax = plt.subplots(figsize=(6, 3))
ax.bar(ks - 0.2, [(counts == k).mean() for k in ks], width=0.4, label="simulated")
ax.bar(ks + 0.2, [binom_pmf(k, n, p) for k in ks], width=0.4, label="binomial formula")
ax.set_xlabel("defectives in a box of 50")
ax.set_ylabel("probability")
ax.legend()
plt.show()
```

```output
k = 0: formula 0.3642, simulated 0.3626
k = 1: formula 0.3716, simulated 0.3710
k = 2: formula 0.1858, simulated 0.1868
k = 3: formula 0.0607, simulated 0.0615
k = 4: formula 0.0145, simulated 0.0148
k = 5: formula 0.0027, simulated 0.0028
```

`rng.binomial(n, p, size=...)` simulates many boxes at once, returning the number of defectives in each.

Counts of 0 and 1 are almost equally likely (0.364 and 0.372), with 1 just ahead; 2 defectives happen in about 19% of boxes, and 5 or more are rare. Simulation and formula agree to about three decimal places, as the 1/√n rule predicts for 100,000 boxes.

## Expected value and variance

::: math
\[ E[X] = \sum_x x\,P(X = x), \qquad \text{Var}(X) = \sum_x (x - \mu)^2\,P(X = x), \qquad \sigma = \sqrt{\text{Var}(X)} \]
- binomial: $E[K] = np$ and $\text{Var}(K) = np(1 - p)$
- expected values always add; variances add for independent variables
In code: `mean_and_sd(values, probs)` computes `(values * probs).sum()` and the weighted squared deviations
:::


The **expected value** (mean) of a random variable is the probability-weighted average of its values, E[X] = Σ x P(X = x): the long-run average over many repetitions. The **variance** measures spread, the expected squared distance from the mean: Var(X) = E[(X − μ)²]. Its square root, the **standard deviation** σ, has the same units as X.

For the binomial, E[K] = np and Var(K) = np(1 − p). These follow from a powerful rule: **expected values add**, always, E[X + Y] = E[X] + E[Y], and **variances add for independent variables**. K is a sum of n independent 0/1 variables, each with mean p and variance p(1 − p). Predict before running: what are the mean and standard deviation of the defective count?

```python type
def mean_and_sd(values, probs):
    values, probs = np.asarray(values, dtype=float), np.asarray(probs, dtype=float)
    mu = (values * probs).sum()
    var = ((values - mu) ** 2 * probs).sum()
    return mu, math.sqrt(var)

ks = np.arange(0, n + 1)
mu, sd = mean_and_sd(ks, [binom_pmf(k, n, p) for k in ks])
print(f"from the distribution: mean {mu:.4f}, sd {sd:.4f}")
print(f"formulas: np = {n * p}, sqrt(np(1-p)) = {math.sqrt(n * p * (1 - p)):.4f}")
print(f"simulated: mean {counts.mean():.4f}, sd {counts.std():.4f}")
```

```output
from the distribution: mean 1.0000, sd 0.9899
formulas: np = 1.0, sqrt(np(1-p)) = 0.9899
simulated: mean 1.0050, sd 0.9924
```

The distribution, the formulas and the simulation all give a mean of 1 defective per box and a standard deviation of about 0.99. A standard deviation as large as the mean is typical of rare counts, and it means the count in a single box says little about the defect rate.

## Continuous distributions and the normal curve

::: math
\[ f(x) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-(x - \mu)^2/(2\sigma^2)}, \qquad P(X < x) = \tfrac{1}{2}\left(1 + \operatorname{erf}\frac{x - \mu}{\sigma\sqrt{2}}\right) \]
- probability is area under the density: $P(a < X < b) = \int_a^b f(x)\,dx$
- within $1\sigma$, $2\sigma$, $3\sigma$: about 68%, 95%, 99.7%
In code: `normal_pdf(x, mu, sigma)` and `normal_cdf(x, mu, sigma)` using `math.erf`
:::


A measurement error is **continuous**: it can take any value in a range, and the chance of any single exact value is zero. Its distribution is described by a **probability density** f(x): probabilities are **areas** under it, P(a < X < b) = ∫ₐᵇ f(x) dx, and the total area is 1. The density is the limit of a histogram whose bar areas are probabilities.

The most important density is the **normal** (Gaussian) distribution with mean μ and standard deviation σ:

\[ f(x) = \frac{1}{\sigma\sqrt{2\pi}} \, e^{-(x-\mu)^2 / (2\sigma^2)} \]

the bell curve. About 68% of its area lies within 1σ of the mean, 95% within 2σ and 99.7% within 3σ. Its cumulative probability uses the **error function**: P(X < x) = ½(1 + erf((x − μ)/(σ√2))), available as `math.erf`. Predict before running: micrometer readings of a 25.000 mm shaft have σ = 0.004 mm. What fraction of readings fall outside ±0.010 mm?

```python type
mu, sigma = 25.000, 0.004
readings = rng.normal(mu, sigma, size=200_000)

def normal_pdf(x, mu, sigma):
    return np.exp(-(x - mu) ** 2 / (2 * sigma ** 2)) / (sigma * math.sqrt(2 * math.pi))

def normal_cdf(x, mu, sigma):
    return 0.5 * (1 + math.erf((x - mu) / (sigma * math.sqrt(2))))

for k in [1, 2, 3]:
    inside = normal_cdf(mu + k * sigma, mu, sigma) - normal_cdf(mu - k * sigma, mu, sigma)
    print(f"within {k}σ: formula {inside:.4f}, simulated {(abs(readings - mu) < k * sigma).mean():.4f}")
outside = 2 * normal_cdf(mu - 0.010, mu, sigma)
print(f"outside ±0.010 mm: formula {outside:.4%}, simulated {(abs(readings - mu) > 0.010).mean():.4%}")

xs = np.linspace(24.985, 25.015, 300)
fig, ax = plt.subplots(figsize=(6, 3))
ax.hist(readings, bins=80, density=True, alpha=0.5, label="simulated readings")
ax.plot(xs, normal_pdf(xs, mu, sigma), label="normal density")
ax.set_xlabel("reading (mm)")
ax.set_ylabel("density (per mm)")
ax.legend()
plt.show()
```

```output
within 1σ: formula 0.6827, simulated 0.6830
within 2σ: formula 0.9545, simulated 0.9540
within 3σ: formula 0.9973, simulated 0.9973
outside ±0.010 mm: formula 1.2419%, simulated 1.2610%
```

`density=True` scales the histogram so that bar areas, not heights, are probabilities, making it comparable with the density curve. The density's units are "per mm": it is probability per unit of length.

The 68–95–99.7 pattern appears in both the formula and the simulation. ±0.010 mm is 2.5σ, so about 1.24% of readings fall outside it. The histogram follows the bell curve closely; the density's peak of about 100 per mm is not a probability, only area is.

## Why errors are normal

::: math
\[ S = X_1 + X_2 + \dots + X_n, \qquad E[S] = \sum_i \mu_i, \qquad \text{Var}(S) = \sum_i \sigma_i^2 \]
- central limit theorem: $S$ is approximately normal for many independent small terms
- uniform on $[-0.5, 0.5]$ has variance $1/12$, so 12 of them give $\sigma = 1$
In code: `rng.uniform(-0.5, 0.5, size=(200_000, 12)).sum(axis=1)`
:::


Why should measurement errors be normal at all? Because an error is usually the **sum** of many small independent effects: temperature, vibration, the operator's grip, electrical noise. The **central limit theorem**, proved in the statistics block, says that a sum of many independent random variables of finite variance, none of which dominates the total, is approximately normal, whatever their individual distributions. Predict before running: each of 12 small error sources is uniform on [−0.5, 0.5] µm, as flat as a distribution can be. What does their total look like?

```python type
sources = rng.uniform(-0.5, 0.5, size=(200_000, 12))
total = sources.sum(axis=1)
print(f"total error: mean {total.mean():+.4f} µm, sd {total.std():.4f} µm (theory: sqrt(12 × 1/12) = 1)")
print(f"within 1σ: {(abs(total) < 1).mean():.4f}, within 2σ: {(abs(total) < 2).mean():.4f}, within 3σ: {(abs(total) < 3).mean():.4f}")

fig, axes = plt.subplots(1, 2, figsize=(10, 3))
axes[0].hist(sources[:, 0], bins=60, density=True)
axes[0].set_title("one source: uniform")
axes[1].hist(total, bins=80, density=True, alpha=0.6)
xs = np.linspace(-4, 4, 200)
axes[1].plot(xs, normal_pdf(xs, 0, 1))
axes[1].set_title("sum of 12: nearly normal")
plt.show()
```

```output
total error: mean -0.0005 µm, sd 0.9992 µm (theory: sqrt(12 × 1/12) = 1)
within 1σ: 0.6779, within 2σ: 0.9557, within 3σ: 0.9981
```

A uniform distribution on an interval of width 1 has variance 1/12, so twelve independent ones have variance 1 and standard deviation 1 µm: variances add.

The sum of twelve flat distributions is already almost indistinguishable from the normal curve, with 67.8%, 95.6% and 99.8% within 1, 2 and 3σ against the normal's 68.3%, 95.4% and 99.7%; the small differences remain because a sum of twelve values between −0.5 and 0.5 can never go beyond ±6, while a true normal has (very thin) tails beyond any limit. This is why the normal distribution is everywhere in measurement and manufacturing, and why it is a reasonable default model when a quantity is the net result of many small influences.

## Tolerance stacking

::: math
\[ \text{worst case: } \sum_i 3\sigma_i, \qquad \text{statistical (RSS): } 3\sqrt{\sum_i \sigma_i^2} \]
- standard deviations of independent errors add in quadrature
- five parts: worst case $5 \times 0.06$, RSS $3\sqrt{5} \times 0.02$
In code: `(3 * sigmas).sum()` against `3 * math.sqrt((sigmas ** 2).sum())`
:::


An assembly of several parts has a total length that is the sum of the parts' lengths, so its errors add. The **worst-case** approach assumes every part is at the extreme of its tolerance at once, so tolerances add: very safe and very expensive. The **statistical** approach uses the fact that independent errors rarely all go the same way: standard deviations add **in quadrature** (σ_total = √(σ₁² + σ₂² + ...)), because variances add. This root-sum-square (**RSS**) stack lets each part have a much wider tolerance for the same assembly quality.

Five spacers, each nominally 10 mm with a process standard deviation of 0.02 mm, are stacked. Predict before running: with tolerance taken as ±3σ per part, what is the worst-case stack, the statistical stack, and how often does a real stack exceed ±0.15 mm?

```python type
sigmas = np.array([0.02] * 5)
worst = (3 * sigmas).sum()
rss = 3 * math.sqrt((sigmas ** 2).sum())
stacks = rng.normal(10.0, 0.02, size=(200_000, 5)).sum(axis=1)
print(f"worst-case ±{worst:.3f} mm, statistical (3σ) ±{rss:.3f} mm")
print(f"simulated stack sd {stacks.std():.4f} mm (theory {math.sqrt((sigmas ** 2).sum()):.4f})")
print(f"stacks outside ±0.15 mm: {(abs(stacks - 50) > 0.15).mean():.4%}")
```

```output
worst-case ±0.300 mm, statistical (3σ) ±0.134 mm
simulated stack sd 0.0448 mm (theory 0.0447)
stacks outside ±0.15 mm: 0.0730%
```

The worst-case stack is ±0.30 mm, but the statistical stack, at the same 3σ confidence, is only ±0.134 mm, less than half. The simulation confirms the stack's standard deviation of 0.0447 mm, and only about 0.07% of stacks exceed ±0.15 mm (the exact normal value is 0.080%; a simulation of this size counts rare events only roughly). The assumption that matters is independence: parts from one batch, cut by one worn tool, can all be long together, and then the worst case is closer to the truth.

::: challenge Binomial probabilities [easy]
Write `binom_pmf(k, n, p)` returning P(K = k), with 0 for k outside 0..n. Write `binom_cdf(k, n, p)`, the probability P(K ≤ k), summing the pmf. Raise `ValueError` from both unless n is a non-negative integer and 0 ≤ p ≤ 1. Then write `mean_sd(values, probs)` returning `(mean, sd)` of a discrete distribution as plain floats; raise `ValueError` if the lengths differ, any probability is negative, or the probabilities do not sum to 1 within 1e-9.

```python starter
def binom_pmf(k, n, p):
    return 0.0

def binom_cdf(k, n, p):
    return 0.0

def mean_sd(values, probs):
    return (0.0, 0.0)

print(binom_pmf(1, 50, 0.02))
```

```python solution
def _check_binom(n, p):
    if not isinstance(n, int) or n < 0 or not 0 <= p <= 1:
        raise ValueError("need a whole number n >= 0 and 0 <= p <= 1")

def binom_pmf(k, n, p):
    _check_binom(n, p)
    if k < 0 or k > n:
        return 0.0
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

def binom_cdf(k, n, p):
    _check_binom(n, p)
    return min(1.0, sum(binom_pmf(j, n, p) for j in range(0, min(k, n) + 1)))

def mean_sd(values, probs):
    if len(values) != len(probs) or any(q < 0 for q in probs) or abs(sum(probs) - 1) > 1e-9:
        raise ValueError("need matching lengths and non-negative probabilities summing to 1")
    mu = sum(v * q for v, q in zip(values, probs))
    var = sum((v - mu) ** 2 * q for v, q in zip(values, probs))
    return float(mu), float(math.sqrt(var))

print(binom_pmf(1, 50, 0.02))
```

```python test
for _n in ["binom_pmf", "binom_cdf", "mean_sd"]:
    assert _n in dir(), f"Define {_n}."
assert abs(binom_pmf(1, 50, 0.02) - 0.371602) < 1e-6 and abs(binom_pmf(0, 50, 0.02) - 0.98 ** 50) < 1e-12, "The lesson's box."
assert binom_pmf(-1, 5, 0.3) == 0.0 and binom_pmf(6, 5, 0.3) == 0.0 and binom_pmf(3, 3, 1.0) == 1.0, "Outside the range, and a certain outcome."
assert abs(sum(binom_pmf(k, 20, 0.37) for k in range(21)) - 1) < 1e-12, "Probabilities sum to 1."
assert abs(binom_cdf(2, 50, 0.02) - sum(binom_pmf(k, 50, 0.02) for k in range(3))) < 1e-12 and binom_cdf(10, 5, 0.4) == 1.0 and binom_cdf(-1, 5, 0.4) == 0.0, "Cumulative probabilities."
for _bad in [(1, 5.5, 0.2), (1, -1, 0.2), (1, 5, 1.2)]:
    try:
        binom_pmf(*_bad)
        assert False, f"binom_pmf{_bad} should raise ValueError."
    except ValueError:
        pass
    except TypeError:
        assert False, f"binom_pmf{_bad} should check its inputs and raise ValueError (not crash with a TypeError)."
_m, _s = mean_sd(list(range(51)), [binom_pmf(k, 50, 0.02) for k in range(51)])
assert abs(_m - 1) < 1e-9 and abs(_s - math.sqrt(0.98)) < 1e-9 and type(_m) is float, "Binomial mean np and sd sqrt(np(1-p))."
assert mean_sd([1, 2, 3, 4, 5, 6], [1 / 6] * 6) == (3.5, math.sqrt(35 / 12)) or abs(mean_sd([1, 2, 3, 4, 5, 6], [1 / 6] * 6)[1] - math.sqrt(35 / 12)) < 1e-12, "A die."
for _bad in [([1, 2], [0.5]), ([1, 2], [0.7, 0.7]), ([1, 2], [1.5, -0.5])]:
    try:
        mean_sd(*_bad)
        assert False, f"mean_sd{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Counting arrangements times their probability gives the binomial; weighting values by probability gives the mean and spread."
```

Hint: C(n, k) is `math.comb(n, k)`. For the mean, sum value × probability; for the variance, sum (value − mean)² × probability.
:::

::: challenge Process capability [medium]
A machined diameter is normal with mean μ and standard deviation σ, and the drawing allows `lower` to `upper`. Write `normal_cdf(x, mu, sigma)` using `math.erf` (raise `ValueError` if σ ≤ 0). Write `out_of_tolerance(mu, sigma, lower, upper)`: the fraction of parts outside the limits, as parts per million (ppm), rounded to 1 decimal place. Write `cpk(mu, sigma, lower, upper)`, the **process capability index**, min(upper − μ, μ − lower) / (3σ), rounded to 3 decimal places. Then write `sigma_for_ppm(mu, lower, upper, ppm)`: the largest σ for which `out_of_tolerance` (unrounded) is at most `ppm`, found by bisection between 0 and the tolerance width (60 iterations), rounded to 6 significant figures; raise `ValueError` unless lower < μ < upper and ppm > 0.

```python starter
def normal_cdf(x, mu, sigma):
    return 0.5

def out_of_tolerance(mu, sigma, lower, upper):
    return 0.0

def cpk(mu, sigma, lower, upper):
    return 1.0

def sigma_for_ppm(mu, lower, upper, ppm):
    return 0.001

print(out_of_tolerance(25.0, 0.004, 24.99, 25.01))
```

```python solution
def normal_cdf(x, mu, sigma):
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    return 0.5 * (1 + math.erf((x - mu) / (sigma * math.sqrt(2))))

def _out(mu, sigma, lower, upper):
    return normal_cdf(lower, mu, sigma) + (1 - normal_cdf(upper, mu, sigma))

def out_of_tolerance(mu, sigma, lower, upper):
    return round(_out(mu, sigma, lower, upper) * 1e6, 1)

def cpk(mu, sigma, lower, upper):
    return round(min(upper - mu, mu - lower) / (3 * sigma), 3)

def sigma_for_ppm(mu, lower, upper, ppm):
    if not lower < mu < upper or ppm <= 0:
        raise ValueError("need lower < mu < upper and ppm > 0")
    lo, hi = 0.0, upper - lower
    for _ in range(60):
        mid = (lo + hi) / 2
        if mid > 0 and _out(mu, mid, lower, upper) * 1e6 <= ppm:
            lo = mid
        else:
            hi = mid
    return float(f"{lo:.6g}")

print(out_of_tolerance(25.0, 0.004, 24.99, 25.01))
```

```python test
for _n in ["normal_cdf", "out_of_tolerance", "cpk", "sigma_for_ppm"]:
    assert _n in dir(), f"Define {_n}."
assert normal_cdf(25, 25, 0.004) == 0.5 and abs(normal_cdf(1.96, 0, 1) - 0.975) < 1e-4, "The normal CDF."
try:
    normal_cdf(0, 0, 0)
    assert False, "sigma = 0 should raise ValueError."
except ValueError:
    pass
assert out_of_tolerance(25.0, 0.004, 24.99, 25.01) == 12419.3, f"±2.5σ: about 1.24%; got {out_of_tolerance(25.0, 0.004, 24.99, 25.01)}."
assert out_of_tolerance(25.003, 0.004, 24.99, 25.01) == round((normal_cdf(24.99, 25.003, 0.004) + 1 - normal_cdf(25.01, 25.003, 0.004)) * 1e6, 1), "An off-centre process."
assert cpk(25.0, 0.004, 24.99, 25.01) == 0.833 and cpk(25.003, 0.002, 24.99, 25.01) == 1.167, "Cpk uses the nearer limit."
_s = sigma_for_ppm(25.0, 24.99, 25.01, 63.3)
assert abs(_s - 0.0025) < 2e-6, f"63.3 ppm is about ±4σ: σ ≈ 0.0025; got {_s}."
assert out_of_tolerance(25.0, _s, 24.99, 25.01) <= 63.4, "At that sigma the defect rate meets the target."
for _bad in [(25.0, 25.0, 25.01, 10), (25.0, 24.99, 25.01, 0)]:
    try:
        sigma_for_ppm(*_bad)
        assert False, f"sigma_for_ppm{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The normal CDF turns a process's mean and spread into parts per million out of tolerance, and bisection runs it backwards to set the spread a target needs."
```

Hint: The fraction below `lower` is the CDF there; above `upper` is 1 minus the CDF. For the bisection, a smaller σ means fewer parts out, so keep the larger end while the target is still met.
:::

::: challenge Tolerance stacks [hard]
Parts are stacked end to end; part i has nominal length `nominal[i]` and standard deviation `sigma[i]`, independent and normal. Write `worst_case(tolerances)`, the sum of the ± tolerances, and `rss(tolerances)`, their root-sum-square, both rounded to 4 decimal places. Write `simulate_stack(nominal, sigma, trials, seed)` that draws all part lengths at once with `np.random.default_rng(seed).normal(nominal, sigma, size=(trials, len(nominal)))`, sums each row, and returns `(mean, sd)` of the totals as plain floats rounded to 4 decimal places (use the population sd, `np.std` default). Then write `fraction_outside(nominal, sigma, limit)`, the exact probability that the total deviates from the sum of nominals by more than `limit` in either direction, using the normal distribution with σ_total = √Σσᵢ², rounded to 6 decimal places. Raise `ValueError` from `simulate_stack` and `fraction_outside` if the lists differ in length or are empty, or any σ is negative (σ may be 0 for a precise part, but not all of them).

```python starter
def worst_case(tolerances):
    return 0.0

def rss(tolerances):
    return 0.0

def simulate_stack(nominal, sigma, trials, seed):
    return (float(sum(nominal)), 0.0)

def fraction_outside(nominal, sigma, limit):
    return 0.0

print(worst_case([0.06] * 5), rss([0.06] * 5))
```

```python solution
def worst_case(tolerances):
    return round(float(sum(tolerances)), 4)

def rss(tolerances):
    return round(math.sqrt(sum(t * t for t in tolerances)), 4)

def _check_stack(nominal, sigma):
    if len(nominal) != len(sigma) or not nominal:
        raise ValueError("need matching, non-empty lists")
    if any(s < 0 for s in sigma) or all(s == 0 for s in sigma):
        raise ValueError("sigmas must be non-negative and not all zero")

def simulate_stack(nominal, sigma, trials, seed):
    _check_stack(nominal, sigma)
    parts = np.random.default_rng(seed).normal(nominal, sigma, size=(trials, len(nominal)))
    totals = parts.sum(axis=1)
    return (round(float(totals.mean()), 4), round(float(totals.std()), 4))

def fraction_outside(nominal, sigma, limit):
    _check_stack(nominal, sigma)
    s = math.sqrt(sum(x * x for x in sigma))
    inside = math.erf(limit / (s * math.sqrt(2)))
    return round(1 - inside, 6)

print(worst_case([0.06] * 5), rss([0.06] * 5))
```

```python test
for _n in ["worst_case", "rss", "simulate_stack", "fraction_outside"]:
    assert _n in dir(), f"Define {_n}."
assert worst_case([0.06] * 5) == 0.3 and rss([0.06] * 5) == 0.1342, f"Got {worst_case([0.06] * 5)}, {rss([0.06] * 5)}."
assert rss([0.03, 0.04]) == 0.05 and worst_case([]) == 0.0, "Quadrature: 3-4-5."
_m, _s = simulate_stack([10.0] * 5, [0.02] * 5, 200_000, 5)
assert abs(_m - 50) < 0.001 and abs(_s - 0.0447) < 0.001 and type(_m) is float, f"Got {(_m, _s)}."
_d = np.random.default_rng(9).normal([10.0, 20.0], [0.01, 0.02], size=(10, 2)).sum(axis=1)
assert simulate_stack([10.0, 20.0], [0.01, 0.02], 10, 9) == (round(float(_d.mean()), 4), round(float(_d.std()), 4)), "Draw with the given call so results are reproducible."
assert fraction_outside([10.0] * 5, [0.02] * 5, 0.15) == round(1 - math.erf(0.15 / (math.sqrt(0.002) * math.sqrt(2))), 6), "The lesson's spacers."
assert abs(fraction_outside([1, 2, 3], [0.03, 0.04, 0.0], 0.1) - 0.0455) < 1e-3, "2σ of a 0.05 stack: about 4.55% outside."
for _bad in [([1, 2], [0.1]), ([], []), ([1], [-0.1]), ([1, 2], [0, 0])]:
    for _f in (lambda a, b: simulate_stack(a, b, 10, 1), lambda a, b: fraction_outside(a, b, 0.1)):
        try:
            _f(*_bad)
            assert False, f"{_bad} should raise ValueError."
        except ValueError:
            pass
"SUCCESS: Independent errors add in quadrature, so a statistical stack is far tighter than the worst case, and the normal curve says how often it is exceeded."
```

Hint: Root-sum-square is √(Σtᵢ²). For the exact fraction, the total's deviation is normal with σ_total = √Σσᵢ², and the chance it stays within ±L is erf(L/(σ_total√2)).
:::

## What you learned

- A random variable's distribution gives the probability of each value (discrete) or a density whose areas are probabilities (continuous).
- The binomial distribution counts successes in n independent trials: P(K = k) = C(n, k)pᵏ(1 − p)ⁿ⁻ᵏ, with mean np and variance np(1 − p).
- Expected values always add; variances add for independent variables, so standard deviations add in quadrature.
- The normal distribution has 68%, 95% and 99.7% of its probability within 1, 2 and 3σ; its CDF uses the error function.
- Sums of many small independent errors are approximately normal (the central limit theorem), which justifies statistical tolerance stacking: much tighter than worst case, provided the errors really are independent.

The next lesson goes the other way: from measured data back to estimates of the mean and spread.
