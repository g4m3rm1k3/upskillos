# Distributions

The last lesson asked yes-or-no questions: did the event happen or not? Most quantities in data are numbers instead: how many customers arrive in an hour, how tall a person is, how long until a machine fails. When a number comes out of a random process, it is called a **random variable**, and the full description of how likely each of its values is, is its **distribution**.

A handful of distributions turn up again and again, because they describe common situations: counting successes, measuring something affected by many small causes, waiting for an event. This lesson introduces the ones machine learning uses most, shows each by simulation and by formula, and uses `scipy.stats`, the library that knows them all. Understanding them lets you describe data compactly, spot when data does not look the way you assumed, and understand what a model means when it assumes "normally distributed errors".

## A random variable and its distribution

Roll two dice and add them. The total is a random variable: its value is uncertain, but some values are more likely than others. Its distribution lists each possible value with its probability. Simulate it and compare with the exact counts:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(0)
totals = rng.integers(1, 7, size=100_000) + rng.integers(1, 7, size=100_000)

values = np.arange(2, 13)
simulated = np.array([(totals == v).mean() for v in values])
exact = np.array([6 - abs(v - 7) for v in values]) / 36

fig, ax = plt.subplots()
ax.bar(values, simulated, alpha=0.6, label="simulated")
ax.plot(values, exact, "ko", label="exact")
ax.set_xlabel("total of two dice")
ax.set_ylabel("probability")
ax.set_xticks(values)
ax.legend()
plt.show()
```

The exact formula `6 − |v − 7|` counts the ways to make each total: one way to make 2, two ways to make 3, up to six ways to make 7, then back down. The simulated bars sit right on the exact dots. A distribution like this, which gives a probability to each separate value, is called a **discrete** distribution, and the list of probabilities is its **probability mass function**. The probabilities always add up to 1, because some value must happen.

## Counting successes: the binomial distribution

A single trial that succeeds with probability `p` (a coin landing heads, a customer clicking an advert, a part being faulty) is called a **Bernoulli trial**. Repeat it `n` times independently and count the successes. That count has a **binomial distribution**, with two settings, `n` and `p`. Numbers that set up a distribution like this are called its **parameters**.

If 30% of visitors click an advert, how many of 10 visitors will click? Guess the most likely count before reading on. The probability of exactly `k` successes is

\[
P(k) = \binom{n}{k} p^k (1-p)^{n-k}
\]

Read it piece by piece. `pᵏ (1 − p)ⁿ⁻ᵏ` is the probability of one **particular** sequence with `k` successes and `n − k` failures, such as "click, no click, click, ...", multiplying because the trials are independent. The binomial coefficient, written `(n k)` stacked in brackets and read "n choose k", counts **how many** such sequences there are: the number of ways to choose which `k` of the `n` trials are the successes. Python's `math.comb(n, k)` computes it.

```python type
import math
import numpy as np
from scipy import stats

n, p = 10, 0.3
rng = np.random.default_rng(1)
clicks = rng.binomial(n, p, size=100_000)

for k in range(6):
    formula = math.comb(n, k) * p ** k * (1 - p) ** (n - k)
    print(f"k={k}: simulated {(clicks == k).mean():.4f}  formula {formula:.4f}  scipy {stats.binom.pmf(k, n, p):.4f}")
print("average number of clicks:", clicks.mean(), " n × p =", n * p)
```

```output
k=0: simulated 0.0280  formula 0.0282  scipy 0.0282
k=1: simulated 0.1213  formula 0.1211  scipy 0.1211
k=2: simulated 0.2351  formula 0.2335  scipy 0.2335
k=3: simulated 0.2646  formula 0.2668  scipy 0.2668
k=4: simulated 0.1999  formula 0.2001  scipy 0.2001
k=5: simulated 0.1046  formula 0.1029  scipy 0.1029
average number of clicks: 2.99872  n × p = 3.0
```

`rng.binomial(n, p, size)` simulates the whole experiment directly. `scipy.stats` has an object for each common distribution; `stats.binom.pmf(k, n, p)` gives the probability mass function. The most likely count is 3, and the average number of clicks is `n × p = 3`, as you would hope.

## Continuous distributions and densities

Some quantities can take any value in a range, not just whole numbers: a height, a time, a temperature. These have **continuous** distributions, and they need a different idea, because the probability of any **exact** value is zero. The chance that someone is exactly 170.000000... cm tall, to infinitely many decimal places, is nothing.

Instead, a continuous distribution has a **probability density function** (pdf): a curve whose **area** over an interval is the probability of landing in that interval. The total area under the whole curve is 1. The simplest is the **uniform** distribution, equally likely anywhere between two limits, whose density is flat. For values spread evenly from 0 to 4, predict the probability of landing between 1 and 2 before running the cell:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2)
samples = rng.uniform(0, 4, size=100_000)

fig, ax = plt.subplots()
ax.hist(samples, bins=40, density=True, alpha=0.6, label="simulated")
ax.plot([0, 4], [0.25, 0.25], "k-", lw=2, label="density 1/4")
ax.set_xlabel("value")
ax.set_ylabel("density")
ax.legend()
plt.show()
print("P(1 < X < 2): simulated", ((samples > 1) & (samples < 2)).mean(), " area = width × height =", 1 * 0.25)
```

```output
P(1 < X < 2): simulated 0.24968  area = width × height = 0.25
```

`density=True` scales the histogram so that the total area of its bars is 1, which makes it directly comparable with a density curve. The density is 0.25 across the range from 0 to 4, so that the rectangle has area 4 × 0.25 = 1. The probability of landing between 1 and 2 is the area of that slice: width 1 × height 0.25 = 0.25. Note that a density is not a probability, and it can even be larger than 1 when the range is narrow; only areas under it are probabilities.

## The normal distribution

The single most important distribution is the **normal** distribution, also called the **Gaussian** after the mathematician Carl Friedrich Gauss, and famous for its bell-shaped curve. It has two parameters: the **mean** μ ("mu"), where the bell is centred, and the **standard deviation** σ ("sigma"), how wide it is. Its density is

\[
f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
\]

You will not need to use that formula directly, but notice its shape: the exponential of minus a square. It is largest at `x = μ` and falls away quickly and symmetrically on both sides, and the `σ` inside controls how quickly.

Heights of adults are close to normally distributed. Suppose they have mean 170 cm and standard deviation 8 cm:

```python type
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

mu, sigma = 170, 8
rng = np.random.default_rng(3)
heights = rng.normal(mu, sigma, size=100_000)

x = np.linspace(135, 205, 300)
fig, ax = plt.subplots()
ax.hist(heights, bins=60, density=True, alpha=0.5, label="simulated heights")
ax.plot(x, stats.norm.pdf(x, mu, sigma), "k-", lw=2, label="normal density")
for k in [1, 2]:
    ax.axvline(mu - k * sigma, color="gray", ls=":")
    ax.axvline(mu + k * sigma, color="gray", ls=":")
ax.set_xlabel("height (cm)")
ax.legend()
plt.show()
```

`stats.norm.pdf(x, mu, sigma)` evaluates the density curve. The dotted lines mark one and two standard deviations either side of the mean. Before running the next cell, predict roughly what fraction of heights lies within one standard deviation of the mean (between 162 and 178 cm).

```python type
import numpy as np

rng = np.random.default_rng(3)
heights = rng.normal(170, 8, size=100_000)
for k in [1, 2, 3]:
    inside = np.abs(heights - 170) < k * 8
    print(f"within {k} standard deviation(s): {inside.mean():.3f}")
```

```output
within 1 standard deviation(s): 0.681
within 2 standard deviation(s): 0.955
within 3 standard deviation(s): 0.997
```

About 68%, 95% and 99.7%. This **68–95–99.7 rule** holds for every normal distribution, whatever its mean and standard deviation, and it gives a quick sense of scale: in normally distributed data, a value more than 2 standard deviations from the mean happens only about 1 time in 20, and more than 3 only about 3 times in 1,000.

## Standardising: z-scores

Because every normal distribution has the same shape, any value can be described by **how many standard deviations it is from the mean**. That number is its **z-score**:

\[
z = \frac{x - \mu}{\sigma}
\]

A person 186 cm tall has z = (186 − 170) / 8 = 2: two standard deviations above average, taller than about 97.7% of people. Converting to z-scores is exactly the standardising you did to the columns of a dataset in the indexing lesson: subtract the mean, divide by the standard deviation. For a normal variable, the result always has the **standard normal** distribution, with mean 0 and standard deviation 1.

## Cumulative probabilities and percentiles

The probability that a value is **at most** `x` is given by the **cumulative distribution function** (cdf): the area under the density to the left of `x`. It rises from 0 to 1. For a probability between two values, subtract two cdf values:

```python type
from scipy import stats

mu, sigma = 170, 8
print("P(height ≤ 186):      ", stats.norm.cdf(186, mu, sigma).round(4))
print("P(160 < height < 180):", (stats.norm.cdf(180, mu, sigma) - stats.norm.cdf(160, mu, sigma)).round(4))
print("height above which the tallest 5% lie:", stats.norm.ppf(0.95, mu, sigma).round(1))
```

```output
P(height ≤ 186):       0.9772
P(160 < height < 180): 0.7887
height above which the tallest 5% lie: 183.2
```

The last line runs the question the other way round: which height has 95% of people below it? That is the 95th **percentile**, found with `ppf`, the "percent point function", the inverse of the cdf. For data rather than a formula, `np.percentile(data, 95)` finds the same thing by sorting. The 50th percentile is the **median**, the middle value.

## Two more distributions worth knowing

A few other distributions describe common situations:

- The **Poisson** distribution counts events in a fixed interval when they happen independently at a steady average rate: emails per hour, typing errors per page, customers arriving per minute. Its single parameter is the average count, λ.
- The **exponential** distribution describes the **waiting time** until the next such event. Short waits are common and long waits rare.

```python type
import numpy as np

rng = np.random.default_rng(4)
emails_per_hour = rng.poisson(lam=6, size=100_000)
print("average emails per hour:", emails_per_hour.mean().round(3))
print("P(no emails in an hour):", (emails_per_hour == 0).mean().round(4))

waits = rng.exponential(scale=10, size=100_000)
print("average wait between emails (minutes):", waits.mean().round(2))
print("P(wait more than 30 minutes):", (waits > 30).mean().round(4))
print("P(wait more than 60 minutes):", (waits > 60).mean().round(4))
```

```output
average emails per hour: 6.001
P(no emails in an hour): 0.0025
average wait between emails (minutes): 10.0
P(wait more than 30 minutes): 0.0488
P(wait more than 60 minutes): 0.0023
```

With 6 emails an hour on average, the average wait between them is 60 / 6 = 10 minutes, which is the `scale` of the exponential. The two are two views of the same random process, and the last line shows it: "no emails in an hour" and "waiting more than 60 minutes for the next one" are the same event, and the two simulations give it the same probability, about 0.0025.

## Why the normal distribution is everywhere

Why should heights, measurement errors and exam scores all look roughly normal? Because each is the **sum of many small, independent effects**: many genes and nutritional factors for height, many tiny disturbances for a measurement error. Add up many independent random pieces, whatever their own distributions, and the total tends towards a normal distribution. This is the **central limit theorem**, and the next lesson shows it happening. It is also why many machine learning methods assume their errors are normally distributed.

Not everything is normal, though. Incomes, city sizes and website visits are **skewed**, with a long tail of a few very large values, and assuming normality there gives badly wrong answers. Always look at a histogram of the data before assuming a distribution.

::: challenge The binomial formula [easy]
Write a function `binomial_pmf(k, n, p)` that returns the probability of exactly `k` successes in `n` independent trials with success probability `p`, using the formula from the lesson and `math.comb`. Do not use `scipy`; the check compares with it.

Then use it: a quiz has 10 multiple-choice questions with 4 options each. A student guesses every answer at random. Store the probability that they get **at least 7** right in `lucky_pass`.

```python starter
import math

def binomial_pmf(k, n, p):
    return 0.0

lucky_pass = 0.0
print(binomial_pmf(3, 10, 0.3), lucky_pass)
```

```python solution
import math

def binomial_pmf(k, n, p):
    return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

lucky_pass = sum(binomial_pmf(k, 10, 0.25) for k in range(7, 11))
print(binomial_pmf(3, 10, 0.3), lucky_pass)
```

```python test
import numpy as _np
from scipy import stats as _st
assert "binomial_pmf" in dir(), "Keep the function's name as binomial_pmf."
assert "scipy" not in _source and "stats" not in _source, "Use the formula with math.comb rather than scipy."
for _k, _n, _p in [(3, 10, 0.3), (0, 5, 0.5), (5, 5, 0.9), (2, 20, 0.05)]:
    assert _np.isclose(binomial_pmf(_k, _n, _p), _st.binom.pmf(_k, _n, _p)), f"binomial_pmf({_k}, {_n}, {_p}) should be {_st.binom.pmf(_k, _n, _p):.5f}, but got {binomial_pmf(_k, _n, _p)}."
_want = _st.binom.sf(6, 10, 0.25)
assert _np.isclose(lucky_pass, _want), f"The chance of at least 7 right out of 10 by guessing (p = 0.25) is about {_want:.5f}, but lucky_pass is {lucky_pass}. Add the probabilities for 7, 8, 9 and 10."
"SUCCESS: About 0.35%: guessing your way to a pass is not a strategy."
```

Hint: The formula is `math.comb(n, k) * p ** k * (1 - p) ** (n - k)`. "At least 7" means 7, 8, 9 or 10 correct: add the four probabilities, each with `p = 0.25`.
:::

::: challenge Check the 68–95–99.7 rule [medium]
Write a function `fraction_within(data, k)` that returns the fraction of values in the array `data` lying strictly within `k` standard deviations of the data's **own** mean (use `data.mean()` and `data.std()`), without a loop.

Then apply it to two datasets from the starter, and store the fraction within **1** standard deviation for each in `normal_within_1` and `skewed_within_1`. For the normal data it should be close to 0.68. Predict before you run it: will the skewed data match?

```python starter
import numpy as np

def fraction_within(data, k):
    return 0.0

rng = np.random.default_rng(5)
normal_data = rng.normal(50, 10, size=50_000)
skewed_data = rng.exponential(scale=10, size=50_000)
normal_within_1 = 0.0
skewed_within_1 = 0.0
print(normal_within_1, skewed_within_1)
```

```python solution
import numpy as np

def fraction_within(data, k):
    return float((np.abs(data - data.mean()) < k * data.std()).mean())

rng = np.random.default_rng(5)
normal_data = rng.normal(50, 10, size=50_000)
skewed_data = rng.exponential(scale=10, size=50_000)
normal_within_1 = fraction_within(normal_data, 1)
skewed_within_1 = fraction_within(skewed_data, 1)
print(normal_within_1, skewed_within_1)
```

```python test
import numpy as _np
import ast as _ast
assert "fraction_within" in dir(), "Keep the function's name as fraction_within."
assert not any(isinstance(_n, (_ast.For, _ast.While, _ast.ListComp)) for _n in _ast.walk(_ast.parse(_source))), "Use array operations, without a loop."
_d = _np.array([1.0, 2.0, 3.0, 4.0, 100.0])
_want = (_np.abs(_d - _d.mean()) < 1 * _d.std()).mean()
assert _np.isclose(fraction_within(_d, 1), _want), f"For {_d} and k = 1 the fraction should be {_want}, but got {fraction_within(_d, 1)}."
_rng = _np.random.default_rng(5)
_nd = _rng.normal(50, 10, size=50_000)
_sd = _rng.exponential(scale=10, size=50_000)
assert _np.isclose(normal_within_1, (_np.abs(_nd - _nd.mean()) < 1 * _nd.std()).mean()), "normal_within_1 should be fraction_within(normal_data, 1)."
assert _np.isclose(skewed_within_1, (_np.abs(_sd - _sd.mean()) < 1 * _sd.std()).mean()), "skewed_within_1 should be fraction_within(skewed_data, 1)."
"SUCCESS: The normal data has about 68% within 1 standard deviation; the skewed data has about 86%. The rule only holds for normal data, which is why you check before assuming. (At 2 standard deviations the two happen to agree, which shows how misleading a single check can be.)"
```

Hint: `np.abs(data - data.mean())` is each value's distance from the mean. Compare it with `k * data.std()`, and take the mean of the resulting booleans.
:::

::: challenge Normal probabilities [medium]
A factory fills bags of flour. The weights are normally distributed with mean 1002 g and standard deviation 4 g. Using `scipy.stats.norm`, set:

- `p_underweight`: the probability that a bag weighs less than 1000 g, the weight printed on the bag;
- `p_in_spec`: the probability that a bag weighs between 995 g and 1010 g;
- `new_mean`: the mean the factory would need, keeping the standard deviation at 4 g, so that only 1% of bags are underweight. (Think about which weight must be the 1st percentile.)

```python starter
from scipy import stats

p_underweight = 0.0
p_in_spec = 0.0
new_mean = 0.0
print(p_underweight, p_in_spec, new_mean)
```

```python solution
from scipy import stats

p_underweight = stats.norm.cdf(1000, 1002, 4)
p_in_spec = stats.norm.cdf(1010, 1002, 4) - stats.norm.cdf(995, 1002, 4)
new_mean = 1000 - stats.norm.ppf(0.01) * 4
print(p_underweight, p_in_spec, new_mean)
```

```python test
import numpy as _np
from scipy import stats as _st
assert _np.isclose(p_underweight, _st.norm.cdf(1000, 1002, 4)), f"p_underweight should be about {_st.norm.cdf(1000, 1002, 4):.4f}: the cdf at 1000."
assert _np.isclose(p_in_spec, _st.norm.cdf(1010, 1002, 4) - _st.norm.cdf(995, 1002, 4)), f"p_in_spec should be about {_st.norm.cdf(1010, 1002, 4) - _st.norm.cdf(995, 1002, 4):.4f}: the difference of two cdf values."
assert _np.isclose(_st.norm.cdf(1000, new_mean, 4), 0.01, atol=1e-6), f"With mean {new_mean}, the chance of a bag under 1000 g is {_st.norm.cdf(1000, new_mean, 4):.4f}, not 1%. 1000 g must be the 1st percentile: 1000 = mean + z × 4, where z is stats.norm.ppf(0.01)."
"SUCCESS: The cdf gives probabilities, and the ppf turns a target probability back into a value."
```

Hint: `stats.norm.cdf(x, mean, sd)` is the probability of being below `x`. For the new mean: 1000 g must sit at the 1st percentile, which is `stats.norm.ppf(0.01)` standard deviations from the mean (a negative number of them). Rearrange `1000 = new_mean + z × 4`.
:::

## What you learned

- A random variable is a number that comes out of a random process; its distribution says how likely each value is.
- Discrete distributions give a probability to each value (the probability mass function); the probabilities add up to 1.
- The binomial distribution counts successes in `n` independent trials with probability `p`: P(k) = C(n, k) pᵏ (1 − p)ⁿ⁻ᵏ, with mean `n p`.
- Continuous distributions have a density; probabilities are areas under it. `density=True` makes a histogram comparable with a density.
- The normal distribution is set by its mean μ and standard deviation σ. About 68%, 95% and 99.7% of values lie within 1, 2 and 3 standard deviations of the mean.
- A z-score, (x − μ)/σ, measures a value in standard deviations from the mean.
- The cdf gives P(X ≤ x); the ppf inverts it to find percentiles. `scipy.stats` has `pmf`, `pdf`, `cdf` and `ppf` for every common distribution.
- Poisson counts events at a steady rate; the exponential gives the waiting time between them.
- Sums of many independent effects tend to be normal, but skewed data is common too: look before you assume.

The mean and the standard deviation keep appearing. Next you will define them precisely as the expectation and the variance of a random variable, and watch the central limit theorem turn almost any distribution into a normal one.
