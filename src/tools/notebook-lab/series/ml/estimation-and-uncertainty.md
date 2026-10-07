# Estimation and uncertainty

You almost never get to measure everything. A poll asks a thousand voters, not the whole country. A medical trial treats a few hundred patients, not everyone who will ever take the drug. A machine learning model is tested on a few thousand examples, not every example it will ever see. In each case, a number computed from the **sample** is used as an estimate of the number you really want, which describes the whole **population**.

An estimate on its own is only half an answer. "The model is 85% accurate" means something very different if it was measured on 20 examples or on 20,000. This lesson shows how to say **how uncertain** an estimate is: the standard error, the confidence interval, and the bootstrap, a simulation method that works for almost any quantity. These are the tools for deciding whether a difference you see in data is real or just luck, which every data scientist needs, every day.

## Population, sample and estimate

The **population** is everything you want to know about: all voters, all patients, all future emails a spam filter will see. A number describing the population, such as the true average height of all adults, is a **parameter**. You usually cannot measure it directly. Instead you take a **sample**, and compute a **statistic** from it, such as the sample mean, to **estimate** the parameter.

Different samples give different estimates. Simulate a population, where the truth is known, and draw several samples from it:

```python type
import numpy as np

rng = np.random.default_rng(0)
population = rng.normal(170, 8, size=1_000_000)
print("true population mean:", population.mean().round(3))
for i in range(5):
    sample = rng.choice(population, size=50)
    print(f"sample {i + 1} mean: {sample.mean():.3f}")
```

```output
true population mean: 170.008
sample 1 mean: 169.318
sample 2 mean: 171.491
sample 3 mean: 169.562
sample 4 mean: 170.034
sample 5 mean: 170.877
```

`rng.choice(population, size=50)` picks 50 people at random. (Strictly it can pick the same person twice, but from a population of a million that almost never happens, and it makes no practical difference.) Each sample mean lands near the true mean, but none exactly on it, and they all differ. Which value did your one real sample happen to give? You cannot know. What you **can** know is how far estimates like it typically stray from the truth.

## The sampling distribution and the standard error

Imagine repeating the sampling thousands of times and collecting every sample mean. Their distribution is called the **sampling distribution** of the mean. Two things from the last lesson tell you what it looks like: the central limit theorem says it is approximately normal, and the σ/√n rule says its standard deviation is the population's standard deviation divided by the square root of the sample size.

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
population = rng.normal(170, 8, size=1_000_000)
means = np.array([rng.choice(population, size=50).mean() for _ in range(5000)])

fig, ax = plt.subplots()
ax.hist(means, bins=50)
ax.axvline(population.mean(), color="black", ls="--", label="true mean")
ax.set_xlabel("sample mean (samples of 50)")
ax.legend()
plt.show()
print("spread of the sample means:", means.std().round(3), " formula σ/√n:", (8 / np.sqrt(50)).round(3))
```

```output
spread of the sample means: 1.137  formula σ/√n: 1.131
```

The standard deviation of an estimate's sampling distribution has its own name: the **standard error** (SE). It is the typical size of the estimate's error. For the mean:

\[
\text{SE} = \frac{\sigma}{\sqrt{n}}
\]

In practice you do not know the population's σ either, so you use the sample's own standard deviation `s` in its place (with `ddof=1`, from the last lesson), giving the estimated standard error `s / √n`. Everything you need comes from the one sample you have.

## Confidence intervals

A **confidence interval** turns the standard error into a range of plausible values. Because the sampling distribution is approximately normal, the sample mean lands within 1.96 standard errors of the true mean about 95% of the time (the 95% rule from the distributions lesson, made precise). Turning that round:

\[
\bar{x} \pm 1.96 \times \frac{s}{\sqrt{n}}
\]

is a **95% confidence interval** for the true mean, where `x̄` ("x bar") is the sample mean. The 1.96 is `stats.norm.ppf(0.975)`: the value with 2.5% of the normal distribution above it, leaving 95% between −1.96 and 1.96.

```python type
import numpy as np
from scipy import stats

rng = np.random.default_rng(2)
sample = rng.normal(170, 8, size=50)
mean = sample.mean()
se = sample.std(ddof=1) / np.sqrt(len(sample))
z = stats.norm.ppf(0.975)
print(f"estimate {mean:.2f}, standard error {se:.2f}")
print(f"95% confidence interval: {mean - z * se:.2f} to {mean + z * se:.2f}")
```

```output
estimate 170.18, standard error 1.12
95% confidence interval: 167.98 to 172.37
```

What exactly does "95% confidence" mean? The true mean is a fixed number; it is either in this interval or not. The 95% describes the **procedure**: if you repeated the whole thing many times, taking a new sample and building a new interval each time, 95% of those intervals would contain the true mean. Predict: out of 100 intervals, how many will miss?

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(3)
true_mean, z = 170, 1.96
fig, ax = plt.subplots(figsize=(6, 6))
misses = 0
for i in range(100):
    sample = rng.normal(true_mean, 8, size=50)
    m = sample.mean()
    half = z * sample.std(ddof=1) / np.sqrt(50)
    hit = m - half <= true_mean <= m + half
    misses += not hit
    ax.plot([m - half, m + half], [i, i], color="tab:blue" if hit else "tab:red")
ax.axvline(true_mean, color="black", ls="--")
ax.set_xlabel("height (cm)")
ax.set_ylabel("repeat")
ax.set_title(f"{misses} of 100 intervals miss the true mean")
plt.show()
```

Each horizontal line is one interval from one sample. Most cross the true mean; a few, shown in red, miss it by bad luck. On average, 5 in 100 miss.

For small samples, the interval is a little too narrow, because `s` is itself uncertain. The fix is to replace 1.96 by a slightly larger number from the **t distribution**: `stats.t.ppf(0.975, df=n - 1)`. For `n = 10` that is 2.26; for `n = 50`, 2.01; for large `n`, it approaches 1.96. Statistics packages use the t version automatically.

## Proportions: margins of error and model accuracy

Many estimates are proportions: the fraction of voters supporting a candidate, the fraction of test examples a model gets right. A proportion is the mean of 0s and 1s, so the same reasoning applies. A single 0-or-1 value that is 1 with probability `p` has mean `p`, and by the definition of variance from the last lesson its variance is (1 − p)² × p + (0 − p)² × (1 − p), which simplifies to p(1 − p). The σ/√n rule then gives the standard error:

\[
\text{SE} = \sqrt{\frac{\hat{p}(1 - \hat{p})}{n}}
\]

where `p̂` ("p hat") is the sample proportion. The ± 1.96 SE that goes with it is what polls report as the **margin of error**.

This is directly relevant to machine learning. Suppose a model gets 170 of 200 test examples right. Before running the cell, guess how wide the interval is if it had got 17 of 20 right instead:

```python type
import numpy as np

for correct, total in [(17, 20), (170, 200), (1700, 2000)]:
    p = correct / total
    se = np.sqrt(p * (1 - p) / total)
    print(f"{correct}/{total}: accuracy {p:.3f} ± {1.96 * se:.3f}  ({p - 1.96 * se:.3f} to {p + 1.96 * se:.3f})")
```

```output
17/20: accuracy 0.850 ± 0.156  (0.694 to 1.006)
170/200: accuracy 0.850 ± 0.049  (0.801 to 0.899)
1700/2000: accuracy 0.850 ± 0.016  (0.834 to 0.866)
```

All three show 85% accuracy, but on 20 examples the true accuracy could plausibly be anywhere from about 69% to 100%, while on 2,000 it is pinned down to within about 1.6 percentage points. When someone reports that a new model beats an old one by one percentage point on a small test set, this calculation tells you whether to believe it. Notice the 17/20 interval runs to 1.006: an accuracy above 100% is impossible, which is the visible sign that this simple formula breaks down for small samples and proportions near 0 or 1. Better formulas exist for those cases, and the bootstrap below also works.

## Is a difference real?

To compare two groups, such as a model's accuracy before and after a change, or the average spend of customers who did or did not see an advert, estimate the **difference**, and its standard error. For independent groups, variances add (last lesson), so

\[
\text{SE}_{\text{difference}} = \sqrt{\text{SE}_1^2 + \text{SE}_2^2}
\]

If the 95% interval for the difference excludes zero, the data gives good evidence of a real difference; if it includes zero, the difference could plausibly be luck.

The data below is simulated so that the advert really does raise average spending, by 2. Predict: will the interval exclude zero?

```python type
import numpy as np

rng = np.random.default_rng(4)
for n in [400, 1600]:
    control = rng.normal(50, 12, size=n)
    with_advert = rng.normal(52, 12, size=n)
    diff = with_advert.mean() - control.mean()
    se = np.sqrt(control.var(ddof=1) / n + with_advert.var(ddof=1) / n)
    print(f"{n} per group: difference {diff:.2f}, 95% interval {diff - 1.96 * se:.2f} to {diff + 1.96 * se:.2f}")
```

```output
400 per group: difference 1.18, 95% interval -0.51 to 2.87
1600 per group: difference 2.04, 95% interval 1.22 to 2.87
```

With 400 customers per group, the interval includes zero, even though the true effect is 2: the test is not yet big enough to detect it. That does not show the advert has no effect; **absence of evidence is not evidence of absence**. With 1,600 per group, the standard error halves (four times the data), the interval narrows, and it excludes zero.

This comparison of two randomly assigned groups is called an **A/B test**, and it is how companies decide whether a change actually helps. (Formal "hypothesis tests" and "p-values" are another way of phrasing exactly this question; a later lesson on experiments returns to them.)

## The bootstrap

The standard error formulas above work for means and proportions. What about the uncertainty in a **median**, a correlation, or a model's accuracy on a rare class, where no simple formula exists? The **bootstrap** answers all of them with one idea.

You cannot draw new samples from the population. But your sample is your best picture of the population, so draw new samples from **the sample itself**: pick `n` values from it at random **with replacement**, meaning the same value can be picked more than once. Each such **resample** is a slightly different version of your data. Compute the statistic on thousands of resamples, and their spread shows how much the statistic would vary from sample to sample.

```python type
import numpy as np

rng = np.random.default_rng(5)
incomes = rng.lognormal(mean=10, sigma=0.8, size=60)
print("sample median:", np.median(incomes).round(0))

n_boot = 5000
indexes = rng.integers(0, len(incomes), size=(n_boot, len(incomes)))
resamples = incomes[indexes]
medians = np.median(resamples, axis=1)
low, high = np.percentile(medians, [2.5, 97.5])
print(f"bootstrap 95% interval for the median: {low:.0f} to {high:.0f}")
```

```output
sample median: 18004.0
bootstrap 95% interval for the median: 13951 to 22601
```

`rng.lognormal` produces skewed, income-like data, where the median is the right summary and has no simple standard error formula. `rng.integers(0, n, size=(n_boot, n))` makes 5,000 rows of random positions, with repeats allowed, and indexing the data with them builds all the resamples at once. The middle 95% of the resampled medians, from the 2.5th to the 97.5th percentile, is the **percentile bootstrap interval**.

The bootstrap needs no formula and no normality assumption, which is why it is so widely used, including for putting error bars on machine learning results. Its one requirement is that the sample is a fair, random picture of the population, which is also the requirement for everything else in this lesson.

::: challenge A confidence interval for a mean [easy]
Write a function `mean_ci(sample)` that returns a tuple `(low, high)`: the 95% confidence interval for the population mean, using the sample mean, the standard error `s / √n` with `ddof=1`, and `z = scipy.stats.norm.ppf(0.975)`.

```python starter
import numpy as np
from scipy import stats

def mean_ci(sample):
    return 0.0, 0.0

print(mean_ci(np.array([12.1, 11.8, 12.6, 12.0, 11.5, 12.3, 12.9, 11.7])))
```

```python solution
import numpy as np
from scipy import stats

def mean_ci(sample):
    mean = sample.mean()
    se = sample.std(ddof=1) / np.sqrt(len(sample))
    z = stats.norm.ppf(0.975)
    return float(mean - z * se), float(mean + z * se)

print(mean_ci(np.array([12.1, 11.8, 12.6, 12.0, 11.5, 12.3, 12.9, 11.7])))
```

```python test
import numpy as _np
from scipy import stats as _st
assert "mean_ci" in dir(), "Keep the function's name as mean_ci."
_rng = _np.random.default_rng(9)
for _n in [8, 50, 400]:
    _s = _rng.normal(20, 5, _n)
    _se = _s.std(ddof=1) / _np.sqrt(_n)
    _want = (_s.mean() - 1.959964 * _se, _s.mean() + 1.959964 * _se)
    _got = mean_ci(_s)
    assert _np.allclose(_got, _want, atol=1e-4), f"For a sample of {_n} the interval should be about ({_want[0]:.3f}, {_want[1]:.3f}), but got {_got}. Did you use ddof=1?"
"SUCCESS: An estimate, with its uncertainty."
```

Hint: The standard error is `sample.std(ddof=1) / np.sqrt(len(sample))`. The interval is the mean minus and plus `z` standard errors.
:::

::: challenge Is model B really better? [medium]
Two models were each scored on their **own** separate test set of 200 examples (separate sets, so the two results are independent). Model A got 176 right; model B got 182.

1. Write a function `accuracy_se(correct, total)` returning the standard error of an accuracy, `√(p̂(1 − p̂)/n)`.
2. Write `difference_interval(correct_a, total_a, correct_b, total_b)` returning `(low, high)`, the 95% interval (z = 1.96) for model B's accuracy **minus** model A's, using the standard error of a difference from the lesson.
3. Use it on the two models, and set `b_really_better` to `True` if the interval lies entirely above zero, and `False` if it includes zero.

```python starter
import numpy as np

def accuracy_se(correct, total):
    return 0.0

def difference_interval(correct_a, total_a, correct_b, total_b):
    return 0.0, 0.0

b_really_better = True
print(difference_interval(176, 200, 182, 200), b_really_better)
```

```python solution
import numpy as np

def accuracy_se(correct, total):
    p = correct / total
    return float(np.sqrt(p * (1 - p) / total))

def difference_interval(correct_a, total_a, correct_b, total_b):
    diff = correct_b / total_b - correct_a / total_a
    se = np.sqrt(accuracy_se(correct_a, total_a) ** 2 + accuracy_se(correct_b, total_b) ** 2)
    return float(diff - 1.96 * se), float(diff + 1.96 * se)

low, high = difference_interval(176, 200, 182, 200)
b_really_better = low > 0
print((round(low, 3), round(high, 3)), b_really_better)
```

```python test
import numpy as _np
assert "accuracy_se" in dir() and "difference_interval" in dir(), "Keep both function names."
def _se(c, t):
    p = c / t
    return _np.sqrt(p * (1 - p) / t)
for _c, _t in [(176, 200), (17, 20), (1700, 2000)]:
    assert _np.isclose(accuracy_se(_c, _t), _se(_c, _t)), f"accuracy_se({_c}, {_t}) should be about {_se(_c, _t):.5f}, but got {accuracy_se(_c, _t)}."
def _di(ca, ta, cb, tb):
    d = cb / tb - ca / ta
    s = _np.sqrt(_se(ca, ta) ** 2 + _se(cb, tb) ** 2)
    return d - 1.96 * s, d + 1.96 * s
for _args in [(176, 200, 182, 200), (800, 1000, 850, 1000), (90, 100, 80, 100)]:
    assert _np.allclose(difference_interval(*_args), _di(*_args)), f"difference_interval{_args} should be about {tuple(round(v, 4) for v in _di(*_args))}, but got {difference_interval(*_args)}. Is it B minus A, with the SEs combined as √(SE_A² + SE_B²)?"
assert b_really_better is False or b_really_better == False, "The interval for B minus A includes zero, so b_really_better should be False."
"SUCCESS: B scored 3 points higher, but on 200 examples each, that could easily be luck."
```

Hint: The difference is B's proportion minus A's. Its standard error is the square root of the sum of the two squared standard errors. The interval is the difference ± 1.96 of those.
:::

::: challenge Bootstrap anything [medium]
Write a function `bootstrap_ci(sample, statistic, n_boot, seed)` that returns the 95% percentile bootstrap interval `(low, high)` for any statistic. `statistic` is a function taking an array and returning a number, such as `np.median`. Follow the procedure exactly, so results can be checked:

1. `rng = np.random.default_rng(seed)`;
2. `indexes = rng.integers(0, n, size=(n_boot, n))`, where `n` is the sample size;
3. compute the statistic on each row of `sample[indexes]`, giving `n_boot` values (a list comprehension over the rows is fine);
4. return the 2.5th and 97.5th percentiles of those values, with `np.percentile`.

```python starter
import numpy as np

def bootstrap_ci(sample, statistic, n_boot, seed):
    return 0.0, 0.0

data = np.array([3.1, 4.7, 2.2, 8.9, 5.5, 4.1, 6.3, 3.8, 5.0, 12.4])
print(bootstrap_ci(data, np.median, 2000, 0))
```

```python solution
import numpy as np

def bootstrap_ci(sample, statistic, n_boot, seed):
    rng = np.random.default_rng(seed)
    n = len(sample)
    indexes = rng.integers(0, n, size=(n_boot, n))
    values = np.array([statistic(row) for row in sample[indexes]])
    low, high = np.percentile(values, [2.5, 97.5])
    return float(low), float(high)

data = np.array([3.1, 4.7, 2.2, 8.9, 5.5, 4.1, 6.3, 3.8, 5.0, 12.4])
print(bootstrap_ci(data, np.median, 2000, 0))
```

```python test
import numpy as _np
assert "bootstrap_ci" in dir(), "Keep the function's name as bootstrap_ci."
def _ref(s, f, b, seed):
    r = _np.random.default_rng(seed)
    idx = r.integers(0, len(s), size=(b, len(s)))
    v = _np.array([f(row) for row in s[idx]])
    return tuple(_np.percentile(v, [2.5, 97.5]))
_d = _np.array([3.1, 4.7, 2.2, 8.9, 5.5, 4.1, 6.3, 3.8, 5.0, 12.4])
for _f, _b, _s in [(_np.median, 2000, 0), (_np.mean, 1000, 1), (_np.max, 500, 2)]:
    _want = _ref(_d, _f, _b, _s)
    _got = bootstrap_ci(_d, _f, _b, _s)
    assert _np.allclose(_got, _want), f"For {_f.__name__} with n_boot={_b}, seed={_s} the interval should be {tuple(round(v, 4) for v in _want)}, but got {_got}. Follow the steps exactly, drawing all indexes in one call."
"SUCCESS: One method that puts an interval on any statistic."
```

Hint: `sample[indexes]` is a 2D array with one resample per row. Loop over its rows, applying `statistic` to each, and collect the results in an array before taking the two percentiles.
:::

## What you learned

- A parameter describes the population; a statistic computed from a sample estimates it. Different samples give different estimates.
- The sampling distribution is the distribution of an estimate over repeated samples. Its standard deviation is the standard error; for a mean, SE = σ/√n, estimated by s/√n.
- A 95% confidence interval is estimate ± 1.96 SE. The 95% describes the procedure: 95% of intervals built this way contain the truth. For small samples, the t distribution replaces 1.96.
- A proportion has SE = √(p̂(1 − p̂)/n); 1.96 SE is the margin of error. A model's test accuracy is a proportion, so it has an interval too, and small test sets give wide ones.
- The SE of a difference between independent groups is √(SE₁² + SE₂²). If its interval excludes zero, the difference is probably real: the idea behind A/B tests.
- The bootstrap resamples the sample with replacement to estimate the uncertainty of any statistic; the middle 95% of the resampled values is the percentile interval.

That completes the mathematics toolkit. Next you will start working with real, messy, tabular data using pandas, the library that turns spreadsheets and CSV files into something you can analyse.
