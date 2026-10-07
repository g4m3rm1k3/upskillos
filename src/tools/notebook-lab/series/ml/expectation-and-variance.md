# Expectation and variance

A distribution says everything about a random variable, but often you want it boiled down to a couple of numbers: where is it centred, and how spread out is it? Those two numbers are the **expectation** (the mean) and the **variance** (with its square root, the **standard deviation**). You have been computing them with `.mean()` and `.std()` since the first lesson; this lesson says exactly what they are, how they behave, and why they matter so much.

It then extends the idea to two variables at once, with **covariance** and **correlation**, which measure whether two quantities move together. That is the first step towards finding patterns in data. And it ends with the **central limit theorem**, which explains why averages behave so predictably, and why the normal distribution turns up everywhere.

## Expected value

The **expected value** of a random variable, written E[X], is the average value you would get over a very large number of repetitions. For a discrete variable it is a **weighted average**: each possible value multiplied by its probability, all added up:

\[
E[X] = \sum_x x \, P(x)
\]

For a fair die, each face has probability 1/6:

\[
E[X] = 1 \cdot \tfrac16 + 2 \cdot \tfrac16 + \dots + 6 \cdot \tfrac16 = 3.5
\]

The expected value need not be a value the variable can actually take: no die ever shows 3.5. It is the long-run average, and simulation agrees:

```python type
import numpy as np

values = np.arange(1, 7)
probs = np.full(6, 1 / 6)
print("formula:  ", (values * probs).sum())
rolls = np.random.default_rng(0).integers(1, 7, size=1_000_000)
print("simulated:", rolls.mean())
```

```output
formula:   3.5
simulated: 3.502232
```

The expected value is how you judge whether a gamble, or a decision, is worth it. A game costs 1 to play; you roll a die and win 5 if it shows a six, otherwise nothing. Your expected winnings are 5 × 1/6 = 0.83, less than the cost of 1, so on average you lose about 0.17 per game. A casino is built on exactly this arithmetic, and so is every decision a model makes about which action has the best expected outcome.

Expectation has one very convenient property: it adds up. The expected value of a sum is the sum of the expected values, `E[X + Y] = E[X] + E[Y]`, whether or not `X` and `Y` are independent. And scaling or shifting a variable does the same to its expectation: `E[aX + b] = a E[X] + b`. So the expected total of two dice is 3.5 + 3.5 = 7, with no need to work out the distribution of the total at all.

## Variance and standard deviation

Two variables can have the same mean but behave very differently. Both of these have mean 50:

```python type
import numpy as np

rng = np.random.default_rng(1)
steady = rng.normal(50, 2, size=10_000)
wild = rng.normal(50, 20, size=10_000)
print("means:", steady.mean().round(2), wild.mean().round(2))
print("typical distance from the mean:", np.abs(steady - 50).mean().round(2), np.abs(wild - 50).mean().round(2))
```

```output
means: 49.98 49.77
typical distance from the mean: 1.6 15.82
```

The **variance** measures spread: it is the expected **squared** distance from the mean.

\[
\text{Var}(X) = E\big[(X - \mu)^2\big]
\]

Squaring makes every distance positive, so distances above and below the mean cannot cancel out, and it makes large distances count heavily. The trouble with variance is its units: for heights in centimetres, it is in square centimetres. So the usual measure of spread is its square root, the **standard deviation** σ, which is back in the original units:

\[
\sigma = \sqrt{\text{Var}(X)}
\]

For the die, each face is some distance from 3.5, and averaging the squared distances gives the variance:

```python type
import numpy as np

values = np.arange(1, 7)
probs = np.full(6, 1 / 6)
mean = (values * probs).sum()
variance = ((values - mean) ** 2 * probs).sum()
print("variance:", variance, " standard deviation:", np.sqrt(variance).round(4))
rolls = np.random.default_rng(0).integers(1, 7, size=1_000_000)
print("simulated:", rolls.var().round(4), rolls.std().round(4))
```

```output
variance: 2.9166666666666665  standard deviation: 1.7078
simulated: 2.9175 1.7081
```

The variance of a die is 35/12 ≈ 2.92, and its standard deviation about 1.71.

## Rules for variance

Variance does not add up as simply as expectation, and the rules are worth knowing because they explain a great deal:

- **Shifting** a variable does not change its spread: `Var(X + b) = Var(X)`.
- **Scaling** by `a` scales the variance by `a²`, and the standard deviation by `|a|`: `Var(aX) = a² Var(X)`. Measure in millimetres instead of centimetres and the standard deviation becomes 10 times larger, the variance 100 times.
- For **independent** variables, variances add: `Var(X + Y) = Var(X) + Var(Y)`. (Standard deviations do **not** add; their squares do.)

A quick check of all three with dice, where one die's variance is 35/12 ≈ 2.92:

```python type
import numpy as np

rng = np.random.default_rng(7)
X = rng.integers(1, 7, size=200_000)
Y = rng.integers(1, 7, size=200_000)
print("Var(X + 10):", (X + 10).var().round(3), "  Var(X):", X.var().round(3))
print("Var(2X):    ", (2 * X).var().round(3), "  4 Var(X):", (4 * X.var()).round(3))
print("Var(X + Y): ", (X + Y).var().round(3), "  Var(X) + Var(Y):", (X.var() + Y.var()).round(3))
print("Var(X + X): ", (X + X).var().round(3), "  (not independent!)")
```

```output
Var(X + 10): 2.918   Var(X): 2.918
Var(2X):     11.674   4 Var(X): 11.674
Var(X + Y):  5.834   Var(X) + Var(Y): 5.823
Var(X + X):  11.674   (not independent!)
```

Two separate dice add their variances. But `X + X` is not two independent dice: it is the same die counted twice, which is `2X`, with four times the variance, not two. Independence is what makes the adding rule work.

The last rule has a remarkable consequence for averages. Average `n` independent values, each with standard deviation σ. The sum has variance `n σ²`, and dividing by `n` divides the variance by `n²`, leaving `σ² / n`. So the standard deviation of the average is

\[
\frac{\sigma}{\sqrt{n}}
\]

Predict what happens to the spread of an average when you use 4 times as many values:

```python type
import numpy as np

rng = np.random.default_rng(2)
for n in [1, 4, 16, 64]:
    averages = rng.integers(1, 7, size=(20_000, n)).mean(axis=1)
    print(f"average of {n:>2} dice: standard deviation {averages.std():.3f}   formula {1.708 / np.sqrt(n):.3f}")
```

```output
average of  1 dice: standard deviation 1.718   formula 1.708
average of  4 dice: standard deviation 0.860   formula 0.854
average of 16 dice: standard deviation 0.426   formula 0.427
average of 64 dice: standard deviation 0.212   formula 0.213
```

Averaging 4 times as many values halves the spread. This is why averages of many measurements are so much more reliable than single measurements, and why more data makes estimates more precise, but with diminishing returns: to halve your uncertainty, you need four times the data.

## Sample variance and the n − 1

Everything so far describes a variable whose distribution you know. With real data, you only have a **sample**, and you estimate the mean and variance from it. The sample mean is the obvious estimate of the true mean. For the variance, there is a subtlety. The obvious estimate, the average squared distance from the **sample** mean, comes out slightly too small on average, because the sample mean is itself fitted to the sample, so the data looks a little closer to it than to the true mean.

The fix is to divide by `n − 1` instead of `n`, which is called the **sample variance**. NumPy's `var` and `std` divide by `n` by default; pass `ddof=1` ("delta degrees of freedom") to divide by `n − 1`. You can see the difference by drawing many small samples from a distribution whose variance is known to be 1. Predict: will dividing by `n` come out too big or too small on average?

```python type
import numpy as np

rng = np.random.default_rng(3)
samples = rng.normal(0, 1, size=(100_000, 5))
print("dividing by n,     average estimate:", samples.var(axis=1).mean().round(4))
print("dividing by n - 1, average estimate:", samples.var(axis=1, ddof=1).mean().round(4))
```

```output
dividing by n,     average estimate: 0.8008
dividing by n - 1, average estimate: 1.0009
```

With samples of 5, dividing by `n` gives about 0.8 on average instead of the true 1; dividing by `n − 1` gives about 1. For large samples the difference is negligible. Statistics tools (and pandas) use `n − 1` by default; NumPy uses `n`; standardising data for machine learning, as in the indexing lesson, conventionally uses NumPy's default. Know which one you are using when you compare numbers.

## Covariance: do two variables move together?

Now two variables at once. For each person you have a height and a weight; taller people tend to be heavier. **Covariance** measures that tendency. For each pair, multiply the two distances from their means. When both are above their means, or both below, the product is positive; when one is above and the other below, it is negative. The covariance is the average of those products:

\[
\text{Cov}(X, Y) = E\big[(X - \mu_X)(Y - \mu_Y)\big]
\]

Positive covariance means the variables tend to move together; negative means one tends to go up as the other goes down; near zero means no straight-line relationship.

Covariance depends on the units (centimetres times kilograms), so its size is hard to interpret. Dividing by both standard deviations gives the **correlation**, which always lies between −1 and 1:

\[
r = \frac{\text{Cov}(X, Y)}{\sigma_X \sigma_Y}
\]

A correlation of 1 means the points lie exactly on a rising straight line, −1 exactly on a falling one, and 0 means no straight-line relationship at all. Predict the correlation of each of these four datasets before you run the cell:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(4)
x = rng.normal(0, 1, 300)
datasets = {
    "strong positive": 2 * x + rng.normal(0, 0.5, 300),
    "weak negative": -0.5 * x + rng.normal(0, 1.2, 300),
    "none": rng.normal(0, 1, 300),
    "curved": x ** 2 + rng.normal(0, 0.3, 300),
}
fig, axes = plt.subplots(1, 4, figsize=(13, 3))
for ax, (name, y) in zip(axes, datasets.items()):
    r = np.corrcoef(x, y)[0, 1]
    ax.scatter(x, y, s=5, alpha=0.5)
    ax.set_title(f"{name}: r = {r:.2f}", fontsize=10)
plt.show()
```

`np.corrcoef(x, y)` returns a 2 by 2 matrix of correlations (each variable with itself, which is always 1, and with the other); `[0, 1]` picks out the one between `x` and `y`.

The last panel is an important warning: `y` depends **completely** on `x`, yet the correlation is near zero, because the relationship is a curve, not a line. Correlation only detects straight-line relationships. And a strong correlation does not mean that one variable **causes** the other: ice cream sales and drownings are correlated because both rise in hot weather. A later lesson returns to the difference.

With many variables, the covariances of every pair form the **covariance matrix**, computed by `np.cov`. It is symmetric (Cov(X, Y) = Cov(Y, X)), so from lesson 7 its eigenvectors are at right angles to each other; they point along the directions in which the data is most spread out, which is exactly what principal component analysis finds.

```python type
import numpy as np

rng = np.random.default_rng(5)
heights = rng.normal(170, 8, 500)
weights = 0.9 * heights - 85 + rng.normal(0, 6, 500)
print(np.cov(heights, weights).round(1))
print("correlation:", np.corrcoef(heights, weights)[0, 1].round(3))
```

```output
[[59.  53.7]
 [53.7 87. ]]
correlation: 0.75
```

The diagonal holds each variable's variance (`np.cov` divides by `n − 1`), and the off-diagonal entries the covariance.

## The central limit theorem

The last lesson claimed that sums of many independent random effects tend towards a normal distribution. Here it is happening. Waiting times are exponentially distributed, which is very skewed. Take averages of `n` waiting times at a time, for larger and larger `n`, and plot the averages. Predict what the histogram of averages of 50 will look like:

```python type
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(6)
fig, axes = plt.subplots(1, 4, figsize=(13, 3))
for ax, n in zip(axes, [1, 2, 10, 50]):
    averages = rng.exponential(scale=1, size=(20_000, n)).mean(axis=1)
    ax.hist(averages, bins=50, density=True)
    ax.set_title(f"average of {n}", fontsize=10)
plt.show()
```

A single waiting time is heavily skewed. The average of 2 is less so; by 10 it is nearly symmetric; by 50 it is a clear bell curve, centred on the true mean with spread σ/√n. This is the **central limit theorem**: the average (or sum) of many independent values, from almost any distribution with a finite variance, is approximately normally distributed, and more closely so the more values are averaged.

It is why the normal distribution is everywhere, and it is the foundation of the next lesson: because a sample mean is an average, you know its distribution is approximately normal, which is exactly what you need to say how far it is likely to be from the truth.

::: challenge Expected value and variance [easy]
Write two functions for a discrete random variable, given as an array of its possible `values` and an array of their `probs`:

- `expected_value(values, probs)` returns E[X];
- `variance(values, probs)` returns Var(X), using the definition E[(X − μ)²].

Then use them on this game: you win 10 with probability 0.1, win 2 with probability 0.3, and win nothing otherwise. Store its expected winnings in `game_mean` and its standard deviation in `game_sd`.

```python starter
import numpy as np

def expected_value(values, probs):
    return 0.0

def variance(values, probs):
    return 0.0

game_mean = 0.0
game_sd = 0.0
print(game_mean, game_sd)
```

```python solution
import numpy as np

def expected_value(values, probs):
    return float((values * probs).sum())

def variance(values, probs):
    mu = expected_value(values, probs)
    return float(((values - mu) ** 2 * probs).sum())

wins = np.array([10, 2, 0])
chances = np.array([0.1, 0.3, 0.6])
game_mean = expected_value(wins, chances)
game_sd = np.sqrt(variance(wins, chances))
print(game_mean, game_sd)
```

```python test
import numpy as _np
assert "expected_value" in dir() and "variance" in dir(), "Keep both function names."
_v, _p = _np.arange(1, 7), _np.full(6, 1 / 6)
assert _np.isclose(expected_value(_v, _p), 3.5), "The expected value of a fair die is 3.5."
assert _np.isclose(variance(_v, _p), 35 / 12), "The variance of a fair die is 35/12."
assert _np.isclose(game_mean, 1.6), f"The game's expected winnings are 10 × 0.1 + 2 × 0.3 = 1.6, but game_mean is {game_mean}."
assert _np.isclose(game_sd, _np.sqrt(((_np.array([10, 2, 0]) - 1.6) ** 2 * _np.array([0.1, 0.3, 0.6])).sum())), f"game_sd should be the square root of the game's variance, about 2.905, but it is {game_sd}."
"SUCCESS: The long-run average and the typical spread, straight from the definitions."
```

Hint: Both are sums of arrays multiplied element by element. For the variance, first compute the mean, then weight the squared distances `(values − mean) ** 2` by the probabilities. The standard deviation is the square root.
:::

::: challenge Sample variance by hand [medium]
Write a function `sample_variance(data)` that returns the sample variance of a 1D array, dividing by `n − 1`, **without** using `np.var`, `np.std` or `statistics`. Then write `sample_correlation(x, y)` returning the correlation between two arrays of the same length, computed from the definition: the sample covariance (the sum of the products of the distances from each mean, divided by `n − 1`), divided by the product of the two sample standard deviations. Do not use `np.cov` or `np.corrcoef`; the check compares with them.

```python starter
import numpy as np

def sample_variance(data):
    return 0.0

def sample_correlation(x, y):
    return 0.0

x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
y = np.array([2.0, 4.1, 5.9, 8.2, 9.8])
print(sample_variance(x), sample_correlation(x, y))
```

```python solution
import numpy as np

def sample_variance(data):
    n = len(data)
    return float(((data - data.mean()) ** 2).sum() / (n - 1))

def sample_correlation(x, y):
    n = len(x)
    covariance = ((x - x.mean()) * (y - y.mean())).sum() / (n - 1)
    return float(covariance / np.sqrt(sample_variance(x) * sample_variance(y)))

x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
y = np.array([2.0, 4.1, 5.9, 8.2, 9.8])
print(sample_variance(x), sample_correlation(x, y))
```

```python test
import numpy as _np
import re as _re
assert "sample_variance" in dir() and "sample_correlation" in dir(), "Keep both function names."
assert not _re.search(r"\.var\(|\.std\(|np\.cov|corrcoef|statistics", _source), "Compute these from the definitions, without np.var, np.std, np.cov, np.corrcoef or statistics."
_rng = _np.random.default_rng(7)
for _ in range(3):
    _a = _rng.normal(10, 3, 40)
    _b = 0.5 * _a + _rng.normal(0, 2, 40)
    assert _np.isclose(sample_variance(_a), _np.var(_a, ddof=1)), f"sample_variance should divide by n − 1: expected {_np.var(_a, ddof=1):.4f}, got {sample_variance(_a)}."
    assert _np.isclose(sample_correlation(_a, _b), _np.corrcoef(_a, _b)[0, 1]), f"sample_correlation should be {_np.corrcoef(_a, _b)[0, 1]:.4f}, got {sample_correlation(_a, _b)}."
assert _np.isclose(sample_correlation(_np.array([1.0, 2, 3]), _np.array([6.0, 4, 2])), -1), "Points exactly on a falling line have correlation −1."
"SUCCESS: Variance, covariance and correlation, built from their definitions."
```

Hint: For the variance, sum the squared distances from the mean and divide by `len(data) - 1`. For the correlation, the covariance is the same idea with the product `(x − x̄)(y − ȳ)` instead of a square; then divide by the square root of the product of the two variances.
:::

::: challenge Watch the spread shrink [easy]
Write a function `spread_of_averages(n, trials, seed)` that simulates `trials` averages, each of `n` die rolls, and returns the standard deviation of those averages. Create a generator with `np.random.default_rng(seed)` and draw every roll in one call, `rng.integers(1, 7, size=(trials, n))`.

Then set `ratio` to `spread_of_averages(4, 50_000, 0) / spread_of_averages(16, 50_000, 0)`. By the σ/√n rule, four times as many rolls should halve the spread, so the ratio should be close to 2.

```python starter
import numpy as np

def spread_of_averages(n, trials, seed):
    return 1.0

ratio = 0.0
print(ratio)
```

```python solution
import numpy as np

def spread_of_averages(n, trials, seed):
    rng = np.random.default_rng(seed)
    rolls = rng.integers(1, 7, size=(trials, n))
    return float(rolls.mean(axis=1).std())

ratio = spread_of_averages(4, 50_000, 0) / spread_of_averages(16, 50_000, 0)
print(ratio)
```

```python test
import numpy as _np
assert "spread_of_averages" in dir(), "Keep the function's name as spread_of_averages."
for _n, _t, _s in [(4, 50_000, 0), (1, 20_000, 1), (25, 10_000, 2)]:
    _want = _np.random.default_rng(_s).integers(1, 7, size=(_t, _n)).mean(axis=1).std()
    assert _np.isclose(spread_of_averages(_n, _t, _s), _want), f"spread_of_averages({_n}, {_t}, {_s}) should be {_want:.4f}. Draw all rolls in one call, average each row, and take the standard deviation of the averages."
assert _np.isclose(ratio, 2, atol=0.05), f"ratio should be close to 2, but it is {ratio}."
"SUCCESS: Four times the data, half the uncertainty."
```

Hint: Average each row with `mean(axis=1)`, which gives one average per trial, then take the standard deviation of that array of averages.
:::

## What you learned

- The expected value E[X] = Σ x P(x) is the long-run average, a probability-weighted mean. Expectations add: E[X + Y] = E[X] + E[Y], and E[aX + b] = a E[X] + b.
- The variance Var(X) = E[(X − μ)²] measures spread; the standard deviation is its square root, in the original units.
- Var(aX + b) = a² Var(X); for independent variables, variances add. So the average of `n` independent values has standard deviation σ/√n: four times the data halves the uncertainty.
- The sample variance divides by `n − 1` to avoid underestimating. NumPy divides by `n` unless you pass `ddof=1`.
- Covariance measures whether two variables move together; correlation rescales it to lie between −1 and 1. Correlation only detects straight-line relationships, and does not imply causation.
- The covariance matrix (`np.cov`) is symmetric, and its eigenvectors are the directions of greatest spread.
- The central limit theorem: averages of many independent values are approximately normal, whatever the original distribution.

Next you will use these ideas to answer the most practical question in statistics: having measured a sample, how sure can you be about the whole population? That means standard errors, confidence intervals and the bootstrap.
