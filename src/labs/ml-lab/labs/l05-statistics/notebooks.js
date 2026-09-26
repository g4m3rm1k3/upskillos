// Lab 05 runnable cells and math ↔ code tables, keyed by lesson id.
// A known synthetic population lets every cell compare an estimate with the truth.
const POP = `import numpy as np
rng = np.random.default_rng(0)
# A skewed "population" of build times: most near 30 s, a long right tail.
population = 20 + rng.gamma(shape=2.0, scale=5.0, size=1_000_000)
mu, median = population.mean(), np.median(population)
print(f"population mean {mu:.2f} s, median {median:.2f} s")`

export const extras = {
  'l05-sample': {
    mathCode: {
      rows: [
        ['$\\mu$', 'population.mean()', 'The parameter: fixed, normally unknown.'],
        ['$\\bar x = \\frac{1}{n}\\sum_i x_i$', 'sample.mean()', 'The estimator applied to one sample: an estimate.'],
        ['sampling distribution', '[rng.choice(population, n).mean() for _ in range(1000)]', 'The estimate across many repeated studies.'],
      ],
    },
    notebook: {
      title: 'Lab 05.1 · Parameters, estimators, estimates',
      intro: 'Draw one sample, then repeat the whole study a thousand times to see the sampling distribution — something real studies never get to see.',
      cells: [{
        title: 'One study',
        prose: '**Predict**: will your sample mean equal the population mean? **Then change** the seed.',
        code: POP + `
sample = rng.choice(population, size=20)
print("one sample of 20: mean", sample.mean().round(2))`,
      }, {
        title: 'A thousand studies',
        prose: '**Predict** where the sample **medians** centre: on the population mean or the population median?',
        code: `means = np.array([rng.choice(population, 20).mean() for _ in range(1000)])
medians = np.array([np.median(rng.choice(population, 20)) for _ in range(1000)])
print(f"sample means   centre {means.mean():.2f}, spread {means.std():.2f}")
print(f"sample medians centre {medians.mean():.2f}, spread {medians.std():.2f}")`,
      }],
    },
  },
  'l05-clt': {
    mathCode: {
      rows: [
        ['$s = \\sqrt{\\frac{1}{n-1}\\sum (x_i - \\bar x)^2}$', 'np.std(x, ddof=1)', 'Sample standard deviation (n − 1).'],
        ['$\\operatorname{SE} = s/\\sqrt n$', 'np.std(x, ddof=1) / np.sqrt(len(x))', 'Estimated standard error of the mean.'],
        ['$\\bar x \\pm 1.96\\,\\operatorname{SE}$', 'x.mean() + np.array([-1.96, 1.96]) * se', 'Approximate 95% interval.'],
      ],
    },
    notebook: {
      title: 'Lab 05.2 · The central limit theorem and the standard error',
      intro: 'Watch the skew of sample means fade as n grows, and check that s/√n from one sample predicts the spread across many.',
      cells: [{
        title: 'Skew fades, spread shrinks',
        prose: '**Predict** by what factor the spread shrinks from n = 20 to n = 200.',
        code: POP + `
def skew(v):
    return np.mean(((v - v.mean()) / v.std()) ** 3)

for n in [5, 20, 200]:
    m = rng.choice(population, size=(5000, n)).mean(axis=1)
    print(f"n = {n:>3}: spread of means {m.std():.3f}   skew {skew(m):+.2f}")`,
      }, {
        title: 'One sample predicts the spread',
        prose: 'From a single sample of 20, estimate the standard error and a 95% interval.',
        code: `x = rng.choice(population, 20)
se = np.std(x, ddof=1) / np.sqrt(len(x))
print(f"mean {x.mean():.2f}, SE {se:.2f}, 95% interval {x.mean() - 1.96 * se:.2f} to {x.mean() + 1.96 * se:.2f}  (true mean {mu:.2f})")`,
      }, {
        title: 'The same experiment as the statistics course’s simulator',
        prose: 'The simulator’s “right-skewed” population is Gamma(shape 2, scale 0.25): mean 0.5, σ = 0.25·√2. Draw 5,000 samples of n = 20 and keep only each sample’s mean. **Predict** the SD of those means from σ/√n before running.',
        code: `rng_sim = np.random.default_rng(0)                 # its own generator: the result does not depend on earlier cells
samples = rng_sim.gamma(shape=2.0, scale=0.25, size=(5000, 20))   # 5000 samples, 20 values each
means = samples.mean(axis=1)                          # one mean per sample: 5000 numbers
print(f"individual values drawn: {samples.size}, sample means kept: {means.size}")
print(f"sigma / sqrt(n)            = {0.25 * np.sqrt(2) / np.sqrt(20):.4f}")
print(f"mean of the sample means   = {means.mean():.4f}   (population mean 0.5)")
print(f"SD of the sample means     = {means.std(ddof=1):.4f}")`,
      }],
    },
  },
  'l05-bootstrap': {
    mathCode: {
      rows: [
        ['$x^{*(b)}$', 'x[rng.integers(0, n, size=(B, n))]', 'B resamples of size n, with replacement.'],
        ['$\\theta^{*(b)}$', 'boots = resamples.mean(axis=1)', 'The statistic on each resample.'],
        ['percentile interval', 'np.percentile(boots, [2.5, 97.5])', 'The middle 95% of the bootstrap values.'],
      ],
    },
    notebook: {
      title: 'Lab 05.3 · The bootstrap',
      intro: 'Bootstrap one sample’s mean and median, then compare the bootstrap’s estimate of the spread with the true spread from repeated studies.',
      cells: [{
        title: 'Resample what you have',
        prose: '**Predict**: will the bootstrap interval be symmetric around the mean, given skewed data?',
        code: POP + `
x = rng.choice(population, 20)
B, n = 2000, len(x)
resamples = x[rng.integers(0, n, size=(B, n))]
boots = resamples.mean(axis=1)
print("bootstrap SE:", boots.std().round(3))
print("95% percentile interval:", np.percentile(boots, [2.5, 97.5]).round(2), " sample mean", x.mean().round(2))`,
      }, {
        title: 'Is the bootstrap right?',
        prose: 'Only possible with a synthetic population: compare with the true spread. **Then change** n to 5 and 200.',
        code: `for n in [5, 20, 200]:
    x = rng.choice(population, n)
    boot_se = x[rng.integers(0, n, size=(2000, n))].mean(axis=1).std()
    true_se = rng.choice(population, size=(2000, n)).mean(axis=1).std()
    print(f"n = {n:>3}: bootstrap SE {boot_se:.3f}   true SE {true_se:.3f}")`,
      }],
    },
  },
  'l05-interval': {
    mathCode: {
      rows: [
        ['coverage', 'np.mean((lo <= mu) & (mu <= hi))', 'Fraction of intervals, across many studies, containing the truth.'],
        ['95% interval', 'np.percentile(boots, [2.5, 97.5])', 'One study’s interval.'],
      ],
    },
    notebook: {
      title: 'Lab 05.4 · Coverage: what 95% means',
      intro: 'Run many studies, build an interval in each, and count how many contain the true mean.',
      cells: [{
        title: 'Count the misses',
        prose: '**Predict** the coverage at n = 5 and at n = 200. **Then change** 1.96 to 1.28 (an 80% interval).',
        code: POP + `
def coverage(n, studies=2000, z=1.96):
    x = rng.choice(population, size=(studies, n))
    m, se = x.mean(axis=1), x.std(axis=1, ddof=1) / np.sqrt(n)
    return np.mean((m - z * se <= mu) & (mu <= m + z * se))

for n in [5, 20, 200]:
    print(f"n = {n:>3}: coverage {coverage(n):.3f}")`,
      }],
    },
  },
  'l05-likelihood': {
    mathCode: {
      rows: [
        ['$\\log L(p) = k\\log p + (n-k)\\log(1-p)$', 'k * np.log(p) + (n - k) * np.log(1 - p)', 'Bernoulli log-likelihood.'],
        ['$\\hat p = \\arg\\max_p \\log L(p)$', 'grid[np.argmax(loglik)]', 'The maximum-likelihood estimate.'],
        ['$-\\log L \\propto \\sum (y_i - \\hat y_i)^2$', 'np.sum((y - y_hat) ** 2) / (2 * sigma ** 2)', 'Under normal noise, maximum likelihood is least squares.'],
      ],
    },
    notebook: {
      title: 'Lab 05.5 · Likelihood',
      intro: 'Evaluate the log-likelihood on a grid, find its peak, and see how much more decisively 70 of 100 rules out p = 0.5 than 7 of 10.',
      cells: [{
        title: 'Find the peak',
        prose: '**Predict** the peak and how far below it p = 0.5 is, for 7 of 10 and for 70 of 100.',
        code: `import numpy as np
grid = np.linspace(0.01, 0.99, 981)
for k, n in [(7, 10), (70, 100)]:
    loglik = k * np.log(grid) + (n - k) * np.log(1 - grid)
    peak = grid[np.argmax(loglik)]
    at_half = k * np.log(0.5) + (n - k) * np.log(0.5)
    print(f"{k}/{n}: peak at p = {peak:.2f}; log L(0.5) is {loglik.max() - at_half:.2f} below the peak")`,
      }, {
        title: 'Normal noise turns likelihood into squared error',
        prose: 'Two candidate lines. **Predict**: does the one with the higher Gaussian log-likelihood also have the lower MSE?',
        code: `rng = np.random.default_rng(0)
x = rng.uniform(0, 5, 30); y = 2 * x + 1 + rng.normal(0, 1, 30)
sigma = 1.0
for w, b in [(2.0, 1.0), (1.6, 2.0)]:
    r = y - (w * x + b)
    loglik = np.sum(-0.5 * np.log(2 * np.pi * sigma ** 2) - r ** 2 / (2 * sigma ** 2))
    print(f"w={w}, b={b}: log-likelihood {loglik:.2f}, MSE {np.mean(r ** 2):.3f}")`,
      }],
    },
  },
  'l05-causation': {
    mathCode: {
      rows: [
        ['$r = \\frac{\\sum (x-\\bar x)(y - \\bar y)}{\\sqrt{\\sum (x-\\bar x)^2 \\sum (y-\\bar y)^2}}$', 'np.corrcoef(x, y)[0, 1]', 'Pearson correlation.'],
        ['pooled slope', 'np.polyfit(tests, bugs, 1)[0]', 'Mixes the effect with the confounder.'],
        ['within-group slope', 'np.polyfit(tests[g], bugs[g], 1)[0]', 'Compares like with like.'],
      ],
    },
    notebook: {
      title: 'Lab 05.6 · Correlation, confounding and Simpson’s paradox',
      intro: 'Compute r by hand, then simulate projects where size drives both tests and bugs, and compare pooled and within-group slopes.',
      cells: [{
        title: 'r by hand',
        prose: '**Predict** r for x = [1, 2, 3], y = [1, 3, 2].',
        code: `import numpy as np
x, y = np.array([1., 2., 3.]), np.array([1., 3., 2.])
dx, dy = x - x.mean(), y - y.mean()
print(np.sum(dx * dy) / np.sqrt(np.sum(dx ** 2) * np.sum(dy ** 2)), np.corrcoef(x, y)[0, 1])`,
      }, {
        title: 'A confounder',
        prose: 'Tests truly **reduce** bugs here (effect −0.3), but big projects have more of both. **Predict** the sign of the pooled slope.',
        code: `rng = np.random.default_rng(1)
size = rng.choice([1, 2, 3], 600)                     # small, medium, large projects
tests = 10 * size + rng.normal(0, 2, 600)
bugs = 8 * size - 0.3 * tests + rng.normal(0, 1, 600)
print("pooled slope:", np.polyfit(tests, bugs, 1)[0].round(3))
for s in [1, 2, 3]:
    g = size == s
    print(f"size {s}: within-group slope {np.polyfit(tests[g], bugs[g], 1)[0]:.3f}")`,
      }],
    },
  },
}
