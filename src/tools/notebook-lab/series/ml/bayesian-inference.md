# Bayesian inference

Every model in this series has produced **one** set of parameters: the weights that minimise a loss. But a model fitted to 12 data points and the same model fitted to 12,000 come out as one set of numbers each, with no record of how much more certain the second is. **Bayesian inference** keeps that information. It treats the parameters themselves as uncertain, describes them by a probability **distribution**, and uses Bayes' rule to update that distribution as data arrives. The answer is not "the slope is 0.89" but "the slope is probably between 0.68 and 1.10".

You met Bayes' rule in the probability and Naive Bayes lessons, applied to events. This lesson applies it to parameters. It covers priors and posteriors, computed on a grid and in closed form; how the posterior sharpens with data; the connection between the priors and the regularisation penalties you already know (MAP estimation); Bayesian linear regression, whose predictions come with honest error bars; and **Markov chain Monte Carlo**, the sampling method that makes Bayesian inference possible for complicated models.

## Prior, likelihood, posterior

For a parameter θ and data D, Bayes' rule reads:

\[
p(\theta \mid D) = \frac{p(D \mid \theta)\, p(\theta)}{p(D)} \quad \propto \quad \text{likelihood} \times \text{prior}
\]

- The **prior** p(θ) says what you believed about θ before seeing the data.
- The **likelihood** p(D | θ) says how probable the observed data is for each value of θ: the same quantity maximum likelihood maximises.
- The **posterior** p(θ | D) is what you should believe afterwards.
- p(D) is just the number that makes the posterior add up to 1, so "∝" (proportional to) is enough: compute likelihood × prior for every θ and rescale.

For one parameter, this can be done literally: lay down a fine **grid** of θ values, multiply, normalise. A coin gives 7 heads in 10 flips. What is its probability θ of heads? The likelihood of 7 heads and 3 tails is θ⁷(1 − θ)³. Compare a flat prior (every θ equally plausible) with a sceptical one that believes coins are usually close to fair. Before running, predict: where will each posterior's mean be?

```python type
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import beta

theta = np.linspace(0, 1, 1001)
likelihood = theta ** 7 * (1 - theta) ** 3
priors = {"flat prior": np.ones_like(theta), "sceptical prior": beta.pdf(theta, 20, 20)}

fig, ax = plt.subplots(figsize=(6.5, 3.5))
for name, prior in priors.items():
    posterior = prior * likelihood
    posterior /= posterior.sum()
    mean = (theta * posterior).sum()
    cumulative = np.cumsum(posterior)
    low, high = theta[np.searchsorted(cumulative, 0.025)], theta[np.searchsorted(cumulative, 0.975)]
    print(f"{name:<16} posterior mean {mean:.3f}, most probable value {theta[posterior.argmax()]:.3f}, 95% interval {low:.3f} to {high:.3f}")
    ax.plot(theta, posterior / (theta[1] - theta[0]), label=f"posterior, {name}")
    ax.plot(theta, prior / prior.sum() / (theta[1] - theta[0]), "--", linewidth=0.8, label=name)
ax.set_xlabel("probability of heads θ")
ax.legend(fontsize=8)
plt.show()
```

```output
flat prior       posterior mean 0.667, most probable value 0.700, 95% interval 0.390 to 0.891
sceptical prior  posterior mean 0.540, most probable value 0.542, 95% interval 0.402 to 0.675
```

`beta.pdf(theta, 20, 20)` is a **Beta distribution**, a standard family of distributions on 0 to 1; Beta(20, 20) is centred on 0.5 and fairly narrow, like the belief of someone who has seen many coins. `np.searchsorted(cumulative, 0.025)` finds where the cumulative probability passes 2.5%, so the two ends enclose the middle 95% of the posterior: a **credible interval**. Unlike a confidence interval, it means exactly what it says: given the prior and the data, θ lies in it with probability 0.95.

With the flat prior, the most probable value is 0.7, the maximum likelihood answer, and the mean 0.667; the 95% interval is wide, 0.39 to 0.89, because 10 flips is not much. The sceptical prior pulls the estimate to 0.54, with a narrower interval of 0.40 to 0.68: seven heads in ten is not enough to overturn a strong belief in fairness. Neither is "right": the posterior honestly combines what you assumed with what you saw, and says how much each contributed.

## Conjugate priors and updating

For some pairs of likelihood and prior, the posterior has the same form as the prior, with updated numbers. A Beta(α, β) prior with a coin's likelihood gives a Beta(α + heads, β + tails) posterior. The prior's α and β act like imaginary flips already seen: a flat prior is Beta(1, 1), and the sceptical prior above is like having seen 19 heads and 19 tails. Such a prior is called **conjugate**, and it turns updating into addition.

It also makes clear how belief sharpens. Here a coin with true θ = 0.7 is flipped repeatedly, starting from a flat prior:

```python type
import numpy as np
from scipy.stats import beta

rng = np.random.default_rng(0)
flips = rng.random(1000) < 0.7
for n in [0, 1, 10, 100, 1000]:
    heads = int(flips[:n].sum())
    posterior = beta(1 + heads, 1 + n - heads)
    low, high = posterior.interval(0.95)
    print(f"after {n:>4} flips ({heads:>3} heads): mean {posterior.mean():.3f}, 95% interval {low:.3f} to {high:.3f}")
```

```output
after    0 flips (  0 heads): mean 0.500, 95% interval 0.025 to 0.975
after    1 flips (  1 heads): mean 0.667, 95% interval 0.158 to 0.987
after   10 flips (  6 heads): mean 0.583, 95% interval 0.308 to 0.833
after  100 flips ( 63 heads): mean 0.627, 95% interval 0.532 to 0.718
after 1000 flips (678 heads): mean 0.678, 95% interval 0.648 to 0.706
```

`beta(a, b)` creates the distribution, with `.mean()` and `.interval(0.95)` for the central 95%. After one head, the mean jumps to 0.667 but the interval spans almost everything; after 10 flips it covers 0.31 to 0.83; after 1,000, 0.65 to 0.71, with the truth inside. The width shrinks roughly like 1/√n, as the standard error did in the estimation lesson. With enough data, any reasonable prior is overwhelmed and the posterior concentrates near the truth.

## MAP estimation and regularisation

The single most probable parameter value under the posterior is the **MAP** (maximum a posteriori) estimate. Taking logs, it maximises log likelihood + log prior, or equivalently minimises

\[
-\log p(D \mid \theta) - \log p(\theta)
\]

The first term is the ordinary loss: for squared error with normal noise, the negative log likelihood is the sum of squared errors divided by 2σ² (plus a constant). The second is a **penalty**. A normal prior on the weights, with mean 0 and variance τ², has −log p(w) = Σ w²/(2τ²) + constant: exactly a ridge penalty. Multiplying the whole objective by 2σ² (which does not move its minimum) turns it into the sum of squared errors + (σ²/τ²) Σ w². So **ridge regression is MAP estimation with a normal prior**, with regularisation strength σ²/τ²: a tight prior (small τ) means strong regularisation. A **Laplace** prior, whose density is proportional to e^(−|w|/b), has a sharp peak at zero; its −log is |w|/b, which gives the lasso's absolute-value penalty. Regularisation, which looked like a practical trick in the regularisation lesson, is a statement of prior belief that weights are probably small.

## Bayesian linear regression

With a normal prior on the weights and normal noise, the full posterior over the weights is itself normal, with a formula. For data matrix A (with a column of ones), targets y, noise variance σ² and prior variance τ²:

\[
\Sigma = \left(\frac{A^{\mathsf T} A}{\sigma^2} + \frac{I}{\tau^2}\right)^{-1}, \qquad m = \Sigma \frac{A^{\mathsf T} y}{\sigma^2}
\]

m is the posterior mean, which is also the MAP and the ridge solution, and Σ the posterior covariance, which says how uncertain each weight is and how the uncertainties are linked. The prediction at a new point a = [1, x] is then a normal distribution too, with mean a · m and variance a Σ aᵀ + σ²: uncertainty about the line, plus the noise around it. Predict before running: will the uncertainty about the line be the same everywhere?

```python type
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import Ridge

rng = np.random.default_rng(0)
x = rng.uniform(0, 4, 12)
y = 1.0 + 0.8 * x + rng.normal(0, 0.5, 12)
A = np.column_stack([np.ones(len(x)), x])
noise_var, prior_var = 0.25, 4.0

cov = np.linalg.inv(A.T @ A / noise_var + np.eye(2) / prior_var)
mean = cov @ A.T @ y / noise_var
print("posterior mean (intercept, slope):", mean.round(3), " standard deviations:", np.sqrt(np.diag(cov)).round(3))
print("ridge with alpha = noise_var / prior_var:", Ridge(alpha=noise_var / prior_var, fit_intercept=False).fit(A, y).coef_.round(3))

grid = np.linspace(-2, 8, 200)
G = np.column_stack([np.ones_like(grid), grid])
line_sd = np.sqrt(np.einsum("ij,jk,ik->i", G, cov, G))
for xs in [2.0, 8.0]:
    a = np.array([1.0, xs])
    print(f"at x = {xs}: prediction {a @ mean:.2f}, uncertainty about the line ±{np.sqrt(a @ cov @ a):.2f}")

fig, ax = plt.subplots(figsize=(6.5, 3.6))
ax.scatter(x, y, color="black", s=15, label="12 data points")
ax.plot(grid, G @ mean, label="posterior mean")
ax.fill_between(grid, G @ mean - 2 * line_sd, G @ mean + 2 * line_sd, alpha=0.3, label="±2 sd for the line")
for w in rng.multivariate_normal(mean, cov, 5):
    ax.plot(grid, G @ w, color="grey", linewidth=0.6)
ax.legend(fontsize=8)
plt.show()
```

```output
posterior mean (intercept, slope): [0.691 0.886]  standard deviations: [0.264 0.106]
ridge with alpha = noise_var / prior_var: [0.691 0.886]
at x = 2.0: prediction 2.46, uncertainty about the line ±0.14
at x = 8.0: prediction 7.78, uncertainty about the line ±0.64
```

`np.einsum("ij,jk,ik->i", G, cov, G)` computes aΣaᵀ for every row a of the grid at once. (The prior here covers the intercept as well as the slope, which is why the ridge comparison uses `fit_intercept=False` with the column of ones inside A.) `rng.multivariate_normal(mean, cov, 5)` draws five plausible (intercept, slope) pairs from the posterior; the grey lines are those five possible lines.

The posterior mean equals ridge's answer to the last digit, confirming the MAP connection. And the uncertainty is not the same everywhere: within the data (x = 2) the line is pinned down to about ±0.14, but out at x = 8, twice the largest x in the data, it is ±0.64, more than four times as much, and the shaded band flares out. The sampled lines agree closely where there is data and fan out where there is none. A single fitted line, used as a point forecast, gives no hint of this (classical statistics can also produce widening prediction intervals, but they have to be asked for); the Bayesian answer carries its uncertainty with it, and says plainly that at x = 8 it is largely guessing.

## Sampling the posterior: MCMC

Grids work for one or two parameters; formulas exist only for conjugate pairs. A real model with dozens or millions of parameters needs another way. **Markov chain Monte Carlo** (MCMC) methods produce **samples** from the posterior instead of the posterior itself: many parameter values, drawn so that their histogram matches the posterior. Any question (mean, interval, probability that θ > 0.5) is then answered by counting samples.

The simplest is the **Metropolis algorithm**. It needs only the posterior up to a constant: log likelihood + log prior.

1. Start somewhere.
2. Propose a small random move: θ' = θ + noise.
3. If the proposal has higher posterior probability, move there. If lower, move there anyway with probability p(θ')/p(θ); otherwise stay put (and record θ again).
4. Repeat thousands of times.

(This rule assumes the proposal is symmetric: moving from θ to θ' is as likely as moving back, as it is for normal noise.) The occasional downhill moves are essential: they make the chain wander through the posterior in proportion to its probability, instead of climbing to the peak and stopping. The early samples, before the chain has found the high-probability region, are discarded as **burn-in**.

```python type
import numpy as np
from scipy.stats import beta

def log_posterior(theta):
    if not 0 < theta < 1:
        return -np.inf
    return 7 * np.log(theta) + 3 * np.log(1 - theta)

rng = np.random.default_rng(1)
current, samples, accepted = 0.5, [], 0
for step in range(20000):
    proposal = current + rng.normal(0, 0.1)
    if np.log(rng.random()) < log_posterior(proposal) - log_posterior(current):
        current = proposal
        accepted += 1
    samples.append(current)
samples = np.array(samples[2000:])
print(f"MCMC:  mean {samples.mean():.3f}, sd {samples.std():.3f}, P(θ > 0.5) = {(samples > 0.5).mean():.3f}")
exact = beta(8, 4)
print(f"exact: mean {exact.mean():.3f}, sd {exact.std():.3f}, P(θ > 0.5) = {1 - exact.cdf(0.5):.3f}")
print(f"fraction of proposals accepted: {accepted / 20000:.2f}")
```

```output
MCMC:  mean 0.662, sd 0.133, P(θ > 0.5) = 0.880
exact: mean 0.667, sd 0.131, P(θ > 0.5) = 0.887
fraction of proposals accepted: 0.78
```

Working with logs avoids underflow, as in Naive Bayes; "move with probability p(θ')/p(θ)" becomes comparing log(random number) with the difference of log posteriors, and a proposal outside (0, 1) gets log probability −∞ and is always rejected. With a flat prior, the posterior is exactly Beta(8, 4), so the samples can be checked: their mean (0.662) and spread (0.133) match the exact 0.667 and 0.131, and the probability that the coin favours heads comes out the same both ways. Modern tools (Stan, PyMC) use cleverer proposals (Hamiltonian Monte Carlo, which follows the gradient of the log posterior), but the principle is this loop.

## When to be Bayesian

Bayesian methods shine when data is scarce, when prior knowledge is real and worth using, and when decisions depend on how uncertain the model is, as in medicine, A/B tests with few users, or deciding where to collect data next. Their costs are computation (MCMC is slow for big models) and the need to choose a prior and defend it. For large neural networks, full Bayesian inference is usually impractical, but its ideas survive in approximations: weight decay as a prior, dropout as a rough form of averaging over models, and ensembles of networks as samples from something like a posterior.

::: challenge Beta-binomial updating [easy]
Write `update_beta(a, b, heads, tails)` returning the posterior's parameters `(a + heads, b + tails)`, and `summarise(a, b)` returning a tuple `(mean, low, high)`: the mean of Beta(a, b), and its central 95% credible interval, using `scipy.stats.beta(a, b).interval(0.95)`.

A website's new button was clicked by 18 of 120 visitors. Starting from a prior of Beta(2, 20) (previous buttons got about a 10% click rate), store the posterior summary in `button`.

```python starter
from scipy.stats import beta

def update_beta(a, b, heads, tails):
    return a, b

def summarise(a, b):
    return 0.0, 0.0, 1.0

button = summarise(*update_beta(2, 20, 18, 102))
print(button)
```

```python solution
from scipy.stats import beta

def update_beta(a, b, heads, tails):
    return a + heads, b + tails

def summarise(a, b):
    low, high = beta(a, b).interval(0.95)
    return a / (a + b), float(low), float(high)

button = summarise(*update_beta(2, 20, 18, 102))
print(button)
```

```python test
import numpy as _np
from scipy.stats import beta as _beta
assert "update_beta" in dir() and "summarise" in dir(), "Keep both function names."
assert tuple(update_beta(1, 1, 7, 3)) == (8, 4), "A flat prior Beta(1, 1) with 7 heads and 3 tails should become Beta(8, 4)."
_m, _l, _h = summarise(8, 4)
assert _np.isclose(_m, 8 / 12), "The mean of Beta(a, b) is a / (a + b)."
assert _np.allclose([_l, _h], _beta(8, 4).interval(0.95)), "Use beta(a, b).interval(0.95) for the 95% interval."
_want = (20 / 142,) + tuple(_beta(20, 122).interval(0.95))
assert _np.allclose(button, _want), f"button should summarise Beta(20, 122): mean {_want[0]:.3f}, interval {_want[1]:.3f} to {_want[2]:.3f}."
f"SUCCESS: The button's click rate is probably {button[0]:.1%}, between {button[1]:.1%} and {button[2]:.1%}. The raw rate, 15%, is pulled slightly towards the prior's 10%."
```

Hint: The mean is `a / (a + b)`. `beta(a, b).interval(0.95)` returns the 2.5% and 97.5% points as a pair.
:::

::: challenge A grid posterior for a rate [medium]
A help desk records how many calls arrive in each of 8 hours. Counts like these are often modelled as **Poisson**: with rate λ calls per hour, the probability of k calls is λᵏe^(−λ)/k!, so the log likelihood of all the counts is Σ (k log λ − λ) plus terms not involving λ.

Write `grid_posterior(counts, grid, log_prior)` that returns the posterior on the grid (an array adding up to 1): compute log likelihood plus `log_prior(grid)` at every grid point, subtract the maximum before exponentiating (to avoid underflow), and normalise. Then, with `grid = np.linspace(0.01, 20, 2000)` and a prior that is exponential with mean 5 (log prior = −λ/5), store the posterior mean in `posterior_mean` and the MAP value in `posterior_map`.

```python starter
import numpy as np

def grid_posterior(counts, grid, log_prior):
    return np.full(len(grid), 1 / len(grid))

counts = np.array([7, 4, 9, 6, 8, 5, 10, 7])
grid = np.linspace(0.01, 20, 2000)
posterior_mean = 0.0
posterior_map = 0.0
print(posterior_mean, posterior_map)
```

```python solution
import numpy as np

def grid_posterior(counts, grid, log_prior):
    log_post = np.sum(counts) * np.log(grid) - len(counts) * grid + log_prior(grid)
    weights = np.exp(log_post - log_post.max())
    return weights / weights.sum()

counts = np.array([7, 4, 9, 6, 8, 5, 10, 7])
grid = np.linspace(0.01, 20, 2000)
posterior = grid_posterior(counts, grid, lambda lam: -lam / 5)
posterior_mean = float((grid * posterior).sum())
posterior_map = float(grid[posterior.argmax()])
print(posterior_mean, posterior_map)
```

```python test
import numpy as _np
from scipy.stats import gamma as _gamma
assert "grid_posterior" in dir(), "Keep the function's name as grid_posterior."
_c = _np.array([7, 4, 9, 6, 8, 5, 10, 7])
_g = _np.linspace(0.01, 20, 2000)
_p = grid_posterior(_c, _g, lambda lam: -lam / 5)
assert _np.isclose(_p.sum(), 1.0) and (_p >= 0).all(), "The posterior on the grid should be non-negative and add up to 1."
_exact = _gamma(a=_c.sum() + 1, scale=1 / (len(_c) + 0.2))
assert _np.isclose((_g * _p).sum(), _exact.mean(), atol=1e-3), "The posterior mean disagrees with the exact answer. The log likelihood is sum(k) × log λ − n × λ, plus the log prior."
_big = grid_posterior(_np.full(2000, 7), _g, lambda lam: _np.zeros_like(lam))
assert _np.isfinite(_big).all() and _np.isclose(_big.sum(), 1.0), "With many counts the log likelihood is huge: subtract its maximum before exponentiating."
assert _np.isclose(posterior_mean, _exact.mean(), atol=1e-3), "posterior_mean is wrong: the mean of the grid posterior, sum(grid × posterior)."
assert _np.isclose(posterior_map, _g[_p.argmax()]), "posterior_map should be the grid value with the highest posterior."
f"SUCCESS: The rate is about {posterior_mean:.2f} calls per hour (most probable {posterior_map:.2f}). With an exponential prior, the exact posterior is a Gamma distribution, and your grid matches it."
```

Hint: The log likelihood for all the counts is `np.sum(counts) * np.log(grid) - len(counts) * grid`. Add `log_prior(grid)`, subtract the maximum, exponentiate, and divide by the sum.
:::

::: challenge Sampling two parameters [medium]
Real posteriors have many parameters. Write `metropolis_nd(log_post, start, steps, step_size, seed)` for a parameter **vector**: from `start` (a NumPy array), propose `current + rng.normal(0, step_size, size=len(current))` (with `rng = np.random.default_rng(seed)`), accept when `np.log(rng.random()) < log_post(proposal) - log_post(current)`, and record a **copy** of the current vector after every step. Return the samples as an array of shape `(steps, len(start))`.

Then sample the posterior of the lesson's Bayesian regression (intercept and slope; the starter defines `log_post` from the same data, noise variance and prior) for 20,000 steps from `[0, 0]` with step size 0.15 and seed 0, drop the first 2,000 samples, and store the remaining samples' mean in `sample_mean` (length 2) and their covariance matrix (`np.cov(samples.T)`) in `sample_cov`. The test compares them with the exact posterior.

```python starter
import numpy as np

def metropolis_nd(log_post, start, steps, step_size, seed):
    return np.tile(start, (steps, 1))

rng = np.random.default_rng(0)
x = rng.uniform(0, 4, 12)
y = 1.0 + 0.8 * x + rng.normal(0, 0.5, 12)
A = np.column_stack([np.ones(len(x)), x])
noise_var, prior_var = 0.25, 4.0

def log_post(w):
    return -np.sum((y - A @ w) ** 2) / (2 * noise_var) - np.sum(w ** 2) / (2 * prior_var)

sample_mean = np.zeros(2)
sample_cov = np.eye(2)
print(sample_mean, sample_cov)
```

```python solution
import numpy as np

def metropolis_nd(log_post, start, steps, step_size, seed):
    rng = np.random.default_rng(seed)
    current = np.array(start, dtype=float)
    samples = []
    for _ in range(steps):
        proposal = current + rng.normal(0, step_size, size=len(current))
        if np.log(rng.random()) < log_post(proposal) - log_post(current):
            current = proposal
        samples.append(current.copy())
    return np.array(samples)

rng = np.random.default_rng(0)
x = rng.uniform(0, 4, 12)
y = 1.0 + 0.8 * x + rng.normal(0, 0.5, 12)
A = np.column_stack([np.ones(len(x)), x])
noise_var, prior_var = 0.25, 4.0

def log_post(w):
    return -np.sum((y - A @ w) ** 2) / (2 * noise_var) - np.sum(w ** 2) / (2 * prior_var)

samples = metropolis_nd(log_post, np.zeros(2), 20000, 0.15, 0)[2000:]
sample_mean = samples.mean(axis=0)
sample_cov = np.cov(samples.T)
print(sample_mean, sample_cov)
```

```python test
import numpy as _np
assert "metropolis_nd" in dir(), "Keep the function's name as metropolis_nd."
_t = lambda w: -_np.sum((w - _np.array([1.0, -2.0])) ** 2) / 2
_s = metropolis_nd(_t, _np.zeros(2), 300, 0.5, 7)
assert _np.shape(_s) == (300, 2), "Return one row per step, one column per parameter."
_g = _np.random.default_rng(7); _cur = _np.zeros(2); _ref = []
for _ in range(300):
    _prop = _cur + _g.normal(0, 0.5, size=2)
    if _np.log(_g.random()) < _t(_prop) - _t(_cur):
        _cur = _prop
    _ref.append(_cur.copy())
assert _np.allclose(_s, _ref), "Your chain differs from the expected one. Draw the whole proposal vector with one rng.normal(..., size=len(current)) call, then rng.random() for the test, and record a copy of current each step."
_rng = _np.random.default_rng(0)
_x = _rng.uniform(0, 4, 12); _y = 1.0 + 0.8 * _x + _rng.normal(0, 0.5, 12)
_A = _np.column_stack([_np.ones(12), _x])
_cov = _np.linalg.inv(_A.T @ _A / 0.25 + _np.eye(2) / 4.0)
_mean = _cov @ _A.T @ _y / 0.25
assert _np.allclose(sample_mean, _mean, atol=0.05), "sample_mean should be close to the exact posterior mean of the lesson's regression."
assert _np.allclose(sample_cov, _cov, atol=0.02), "sample_cov should be close to the exact posterior covariance. Did you drop the first 2,000 samples?"
f"SUCCESS: The sampler, using only the log posterior, recovers the exact posterior: means {sample_mean.round(2)}, and even the negative correlation between intercept and slope ({sample_cov[0, 1]:.3f})."
```

Hint: The loop is the lesson's, with vectors: propose with `rng.normal(0, step_size, size=len(current))`, and append `current.copy()` (appending the same array object each time would leave every row equal to the last value). `np.cov(samples.T)` treats each column as a variable.
:::

## What you learned

- Bayesian inference treats parameters as uncertain: posterior ∝ likelihood × prior. For one parameter, compute it on a grid and normalise.
- A credible interval contains the parameter with the stated probability, given the prior and data. A strong prior pulls estimates towards itself; enough data overwhelms any reasonable prior, and intervals shrink like 1/√n.
- Conjugate priors keep the posterior's form: Beta(α, β) with h heads and t tails becomes Beta(α + h, β + t).
- MAP estimation maximises log likelihood + log prior: a normal prior gives ridge regression, a Laplace prior the lasso.
- Bayesian linear regression has a closed-form normal posterior; its predictions carry uncertainty that grows away from the data (±0.14 inside, ±0.64 far outside).
- MCMC (the Metropolis algorithm) samples the posterior using only log likelihood + log prior: propose a move, accept with probability min(1, p(new)/p(old)), discard burn-in.

Data that arrives over time breaks a quiet assumption behind most of this series: that examples are independent. The next lesson deals with time series: honest validation when the future must not leak into the past, simple baselines that are surprisingly hard to beat, and autoregressive models.
