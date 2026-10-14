// Exercises for the probability additions: build each tool, then check it by counting or simulation.
import { checks, py } from './checks.js'

const DICE = py`from fractions import Fraction
from itertools import combinations

DICE = [(a, b) for a in range(1, 7) for b in range(1, 7)]

def prob(event, outcomes):
    return Fraction(sum(1 for o in outcomes if event(o)), len(outcomes))
`

export const EXERCISES = {
  axioms: {
    prompt: py`Write \`inclusion_exclusion(events, outcomes)\` using \`combinations\` (singles added, pairs subtracted, triples added, …). The checks compare it with direct counting on two dice for several sets of events, and confirm the complement rule.`,
    starter: DICE + py`
def inclusion_exclusion(events, outcomes):
    ...
`,
    solution: DICE + py`
def inclusion_exclusion(events, outcomes):
    total = Fraction(0)
    for size in range(1, len(events) + 1):
        sign = 1 if size % 2 else -1
        for group in combinations(events, size):
            total += sign * prob(lambda o: all(e(o) for e in group), outcomes)
    return total
`,
    checks: checks(py`
evs = [lambda o: o[0] == 6, lambda o: o[1] == 6, lambda o: o[0] + o[1] == 7, lambda o: o[0] == o[1]]
for k in range(1, 5):
    group = evs[:k]
    expect(inclusion_exclusion(group, DICE), prob(lambda o: any(e(o) for e in group), DICE), f"inclusion–exclusion with {k} events")
A = lambda o: o[0] + o[1] >= 9
expect(prob(lambda o: not A(o), DICE), 1 - prob(A, DICE), "P(not A) = 1 − P(A)")
`),
    hints: ['Odd-sized groups add, even-sized groups subtract.'],
  },

  independence: {
    prompt: py`Write \`independent(A, B, outcomes)\` and \`mutually_independent(events, outcomes)\`: true only if **every** group of two or more events multiplies, $P(\bigcap) = \prod P$. The checks build the two-coins example (first heads, second heads, they match): pairwise independent but not mutually.`,
    starter: DICE + py`
def independent(A, B, outcomes):
    ...

def mutually_independent(events, outcomes):
    ...
`,
    solution: DICE + py`
def independent(A, B, outcomes):
    return prob(lambda o: A(o) and B(o), outcomes) == prob(A, outcomes) * prob(B, outcomes)

def mutually_independent(events, outcomes):
    for size in range(2, len(events) + 1):
        for group in combinations(events, size):
            together = prob(lambda o: all(e(o) for e in group), outcomes)
            product = Fraction(1)
            for e in group:
                product *= prob(e, outcomes)
            if together != product:
                return False
    return True
`,
    checks: checks(py`
expect(independent(lambda o: o[0] % 2 == 0, lambda o: o[0] + o[1] == 7, DICE), True, "first even, total 7")
expect(independent(lambda o: o[0] == 6, lambda o: o[0] + o[1] == 12, DICE), False, "first 6, total 12")
coins = [(a, b) for a in "HT" for b in "HT"]
A, B, C = (lambda o: o[0] == "H"), (lambda o: o[1] == "H"), (lambda o: o[0] == o[1])
expect([independent(A, B, coins), independent(A, C, coins), independent(B, C, coins)], [True, True, True], "every pair of the three coin events")
expect(mutually_independent([A, B, C], coins), False, "all three together")
expect(mutually_independent([lambda o: o[0] == 1, lambda o: o[1] <= 2], DICE), True, "events about different dice")
`),
    hints: ['Loop over group sizes from 2 up and every group of that size; one failure is enough to return False.'],
  },

  'common-distributions': {
    prompt: py`Write \`poisson_pmf(k, lam)\`, \`sample_exponential(rate, rng)\` by the inverse transform, and \`sample_poisson(lam, rng)\` **from exponentials**: count how many exponential waiting times fit before total time 1. The checks compare the counts' frequencies with the formula, and show Binomial($n$, $\lambda/n$) approaching Poisson as $n$ grows.`,
    starter: py`import math, random

def poisson_pmf(k, lam):
    ...

def sample_exponential(rate, rng):
    ...

def sample_poisson(lam, rng):
    ...
`,
    solution: py`import math, random

def poisson_pmf(k, lam):
    return math.exp(-lam) * lam ** k / math.factorial(k)

def sample_exponential(rate, rng):
    return -math.log(1.0 - rng.random()) / rate

def sample_poisson(lam, rng):
    k, t = 0, sample_exponential(lam, rng)
    while t < 1:
        k += 1
        t += sample_exponential(lam, rng)
    return k
`,
    checks: checks(py`
expect(sum(poisson_pmf(k, 3.0) for k in range(60)), 1, "the Poisson probabilities' total")
expect(sum(k * poisson_pmf(k, 3.0) for k in range(60)), 3, "the Poisson mean")
rng = random.Random(0)
waits = [sample_exponential(2.0, rng) for _ in range(20000)]
expect(sum(waits) / len(waits), 0.5, "the mean of exponential(2) draws", tol=0.02)
rng = random.Random(1)
counts = [sample_poisson(3.0, rng) for _ in range(20000)]
for k in range(6):
    expect(counts.count(k) / len(counts), poisson_pmf(k, 3.0), f"the frequency of {k} events", tol=0.012)
binom = lambda k, n, p: math.comb(n, k) * p ** k * (1 - p) ** (n - k)
gaps = [abs(binom(2, n, 3.0 / n) - poisson_pmf(2, 3.0)) for n in (10, 100, 1000)]
assert gaps[0] > gaps[1] > gaps[2], f"Binomial(n, 3/n) should approach Poisson(3): gaps {gaps}"
`),
    hints: ['$1 - U$ is uniform on $(0, 1]$, so its log is safe.', 'Keep adding waiting times; the number of events before time 1 is the count.'],
  },

  'joint-marginal': {
    prompt: py`A joint table is a dict \`{(x, y): p}\`. Write \`marginal(joint, axis)\`, \`conditional(joint, y)\` ($p(x \mid y)$ as a dict), and \`sequence_prob(model, words)\`: the chain-rule probability $\prod_t p(w_t \mid w_{t-1})$ of a word list under a bigram model \`model[prev][word]\`, with \`"<s>"\` as the start.`,
    starter: py`def marginal(joint, axis):
    ...

def conditional(joint, y):
    ...

def sequence_prob(model, words):
    ...
`,
    solution: py`def marginal(joint, axis):
    out = {}
    for xy, p in joint.items():
        out[xy[axis]] = out.get(xy[axis], 0) + p
    return out

def conditional(joint, y):
    py = sum(p for (a, b), p in joint.items() if b == y)
    return {a: p / py for (a, b), p in joint.items() if b == y}

def sequence_prob(model, words):
    p, prev = 1.0, "<s>"
    for w in words:
        p *= model[prev][w]
        prev = w
    return p
`,
    checks: checks(py`
J = {("sun", "walk"): 0.4, ("sun", "bus"): 0.1, ("rain", "walk"): 0.1, ("rain", "bus"): 0.4}
expect(marginal(J, 0)["sun"], 0.5, "P(sun)")
expect(marginal(J, 1)["bus"], 0.5, "P(bus)")
expect(conditional(J, "walk")["sun"], 0.8, "P(sun | walk)")
expect(sum(conditional(J, "bus").values()), 1, "a conditional distribution's total")
model = {"<s>": {"the": 0.6, "a": 0.4}, "the": {"cat": 0.5, "dog": 0.5}, "a": {"cat": 0.3, "dog": 0.7}, "cat": {"sat": 1.0}, "dog": {"sat": 1.0}}
expect(sequence_prob(model, ["the", "cat", "sat"]), 0.6 * 0.5 * 1.0, "P(the cat sat)")
expect(sequence_prob(model, ["a", "dog", "sat"]), 0.4 * 0.7, "P(a dog sat)")
`),
    hints: ['A conditional is the slice where $Y = y$, divided by the slice\'s total.'],
  },

  'sums-of-variables': {
    prompt: py`Write \`convolve(p, q)\`: the distribution of $X + Y$ for independent $X$, $Y$ given as lists of probabilities of $0, 1, 2, \dots$. Then \`dice_total(n)\`: the distribution of the total of $n$ dice (index $k$ = total $k$). The checks confirm the mean $3.5n$ and variance $\frac{35}{12}n$, and that **dependent** variables break the variance rule.`,
    starter: py`def convolve(p, q):
    ...

def dice_total(n):
    ...
`,
    solution: py`def convolve(p, q):
    out = [0.0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            out[i + j] += a * b
    return out

def dice_total(n):
    die = [0.0] + [1 / 6] * 6
    dist = [1.0]
    for _ in range(n):
        dist = convolve(dist, die)
    return dist
`,
    checks: checks(py`
two = dice_total(2)
expect(two[7], 6 / 36, "P(total 7) with two dice")
expect(two[2], 1 / 36, "P(total 2)")
for n in (1, 3, 10):
    d = dice_total(n)
    m = sum(k * p for k, p in enumerate(d))
    v = sum((k - m) ** 2 * p for k, p in enumerate(d))
    expect(m, 3.5 * n, f"the mean total of {n} dice")
    expect(v, 35 / 12 * n, f"the variance of the total of {n} dice")
xs = [1, 2, 3, 4, 5, 6]
ys = xs
var = lambda v: sum((a - sum(v) / len(v)) ** 2 for a in v) / len(v)
expect(var([a + b for a, b in zip(xs, ys)]), 4 * var(xs), "Var(X + X) (fully dependent: 4 Var X, not 2)")
`),
    hints: ['Every pair $(i, j)$ contributes $p_iq_j$ to the total $i + j$.', 'Pad the die with a zero at index 0 so index = face value.'],
  },

  'law-large-numbers': {
    prompt: py`Check Markov and Chebyshev by simulation. Write \`markov_bound(mean, a)\` and \`chebyshev_bound(var, eps)\`, then \`miss_rate(n, eps, trials, seed)\`: the fraction of trials in which the average of $n$ dice misses 3.5 by at least \`eps\`. The checks confirm the measured rates never exceed the bounds, and shrink as $n$ grows.`,
    starter: py`import random

def markov_bound(mean, a):
    ...

def chebyshev_bound(var, eps):
    ...

def miss_rate(n, eps, trials=2000, seed=0):
    ...
`,
    solution: py`import random

def markov_bound(mean, a):
    return mean / a

def chebyshev_bound(var, eps):
    return var / eps ** 2

def miss_rate(n, eps, trials=2000, seed=0):
    rng = random.Random(seed)
    misses = 0
    for _ in range(trials):
        avg = sum(rng.randint(1, 6) for _ in range(n)) / n
        if abs(avg - 3.5) >= eps:
            misses += 1
    return misses / trials
`,
    checks: checks(py`
rng = random.Random(3)
xs = [rng.expovariate(1.0) for _ in range(50000)]
for a in (2, 4, 8):
    assert sum(1 for x in xs if x >= a) / len(xs) <= markov_bound(1.0, a), f"Markov's bound failed at a = {a}"
var_die = 35 / 12
rates = []
for n in (5, 20, 80):
    r = miss_rate(n, 0.5)
    assert r <= chebyshev_bound(var_die / n, 0.5) + 0.02, f"the miss rate {r} exceeds Chebyshev's bound for n = {n}"
    rates.append(r)
assert rates[0] > rates[1] > rates[2], f"the miss rate should fall with n: {rates}"
`),
    hints: ['For an average of $n$ samples, use variance $\\sigma^2/n$ in Chebyshev.'],
  },

  clt: {
    prompt: py`Write \`standardized_sums(draw, mu, sigma, n, trials, seed)\` for **any** source: each trial adds $n$ draws from \`draw(rng)\`, subtracts $n\mu$ and divides by $\sigma\sqrt n$. Then \`fraction_within(zs, k)\`. The checks feed it a lopsided source (exponential) and confirm the fraction within $\pm1$ moves toward the normal's 0.683 as $n$ grows.`,
    starter: py`import math, random

def standardized_sums(draw, mu, sigma, n, trials=4000, seed=0):
    ...

def fraction_within(zs, k):
    ...
`,
    solution: py`import math, random

def standardized_sums(draw, mu, sigma, n, trials=4000, seed=0):
    rng = random.Random(seed)
    out = []
    for _ in range(trials):
        s = sum(draw(rng) for _ in range(n))
        out.append((s - n * mu) / (sigma * math.sqrt(n)))
    return out

def fraction_within(zs, k):
    return sum(1 for z in zs if abs(z) <= k) / len(zs)
`,
    checks: checks(py`
expo = lambda r: r.expovariate(1.0)
gaps = []
for n in (1, 4, 30):
    zs = standardized_sums(expo, 1.0, 1.0, n)
    expect(sum(zs) / len(zs), 0, f"the mean of standardised sums, n = {n}", tol=0.06)
    gaps.append(abs(fraction_within(zs, 1) - 0.6827))
assert gaps[2] < gaps[0], f"the ±1 fraction should approach 0.683 as n grows: gaps {gaps}"
assert gaps[2] < 0.02, f"by n = 30 it should be close: gap {gaps[2]:.3f}"
`),
    hints: ['A standardised sum has mean 0 and variance 1 whatever $n$; only its shape changes.'],
  },

  'change-of-variables': {
    prompt: py`Write \`transformed_density(p, g_inv, g_inv_slope, y)\`. Then check it on two transforms of a uniform $U$ on $(0, 1)$, by comparing with histograms of samples: $Y = U^2$ (so $g^{-1}(y) = \sqrt y$) and $Y = -\ln U$ (an exponential). Store the densities at $y = 0.25$ in \`density_square\` and at $y = 1$ in \`density_neglog\`.`,
    starter: py`import math, random

def transformed_density(p, g_inv, g_inv_slope, y):
    ...

uniform = lambda u: 1.0 if 0 < u < 1 else 0.0
density_square = None
density_neglog = None
`,
    solution: py`import math, random

def transformed_density(p, g_inv, g_inv_slope, y):
    return p(g_inv(y)) * abs(g_inv_slope(y))

uniform = lambda u: 1.0 if 0 < u < 1 else 0.0
density_square = transformed_density(uniform, math.sqrt, lambda y: 0.5 / math.sqrt(y), 0.25)
density_neglog = transformed_density(uniform, lambda y: math.exp(-y), lambda y: -math.exp(-y), 1.0)
`,
    checks: checks(py`
expect(density_square, 1.0, "the density of U² at 0.25")
expect(density_neglog, math.exp(-1), "the density of −ln U at 1")
rng = random.Random(2)
sq = [rng.random() ** 2 for _ in range(100000)]
measured = sum(1 for y in sq if 0.24 <= y < 0.26) / len(sq) / 0.02
expect(measured, density_square, "the histogram of U² around 0.25", tol=0.06)
nl = [-math.log(1 - rng.random()) for _ in range(100000)]
measured = sum(1 for y in nl if 0.95 <= y < 1.05) / len(nl) / 0.1
expect(measured, density_neglog, "the histogram of −ln U around 1", tol=0.03)
`),
    hints: ['$U^2$: the inverse is $\\sqrt y$ with slope $\\frac{1}{2\\sqrt y}$.', '$-\\ln U$: the inverse is $e^{-y}$, with slope $-e^{-y}$; the absolute value fixes the sign.'],
  },

  'multivariate-gaussian': {
    prompt: py`Write \`mvn_pdf(x, mu, S)\` for 2D, and \`sample_mvn(mu, S, n, seed)\` via $\boldsymbol\mu + L\mathbf z$ with the $2\times2$ Cholesky factor written out by hand ($L_{11} = \sqrt{S_{11}}$, $L_{21} = S_{21}/L_{11}$, $L_{22} = \sqrt{S_{22} - L_{21}^2}$). The checks confirm the density integrates to 1 on a grid and the samples have covariance $S$.`,
    starter: py`import math, random

def mvn_pdf(x, mu, S):
    ...

def sample_mvn(mu, S, n=20000, seed=0):
    ...
`,
    solution: py`import math, random

def mvn_pdf(x, mu, S):
    det = S[0][0] * S[1][1] - S[0][1] * S[1][0]
    inv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]]
    d = [x[0] - mu[0], x[1] - mu[1]]
    q = sum(d[i] * inv[i][j] * d[j] for i in range(2) for j in range(2))
    return math.exp(-q / 2) / (2 * math.pi * math.sqrt(det))

def sample_mvn(mu, S, n=20000, seed=0):
    rng = random.Random(seed)
    l11 = math.sqrt(S[0][0])
    l21 = S[1][0] / l11
    l22 = math.sqrt(S[1][1] - l21 * l21)
    out = []
    for _ in range(n):
        z1, z2 = rng.gauss(0, 1), rng.gauss(0, 1)
        out.append([mu[0] + l11 * z1, mu[1] + l21 * z1 + l22 * z2])
    return out
`,
    checks: checks(py`
S = [[2.0, 0.8], [0.8, 1.0]]
expect(mvn_pdf([0, 0], [0, 0], [[1, 0], [0, 1]]), 1 / (2 * math.pi), "the standard 2D normal's peak")
h = 0.1
total = sum(mvn_pdf([-8 + (i + 0.5) * h, -8 + (j + 0.5) * h], [0, 0], S) * h * h for i in range(160) for j in range(160))
expect(total, 1, "the total volume under the density", tol=1e-6)
xs = sample_mvn([1.0, -1.0], S)
m = [sum(x[k] for x in xs) / len(xs) for k in range(2)]
cov = [[sum((x[a] - m[a]) * (x[b] - m[b]) for x in xs) / len(xs) for b in range(2)] for a in range(2)]
expect(m, [1, -1], "the sample mean", tol=0.03)
expect(cov, S, "the sample covariance", tol=0.05)
`),
    hints: ['The exponent is $\\mathbf d^\\top\\Sigma^{-1}\\mathbf d$ with $\\mathbf d = \\mathbf x - \\boldsymbol\\mu$.', 'Check: $LL^\\top$ should give back $S$.'],
  },

  map: {
    prompt: py`Write \`posterior(a, b, flips)\` returning the Beta posterior's \`(a2, b2)\` for a list of 1s and 0s, then \`map_estimate(a, b, flips)\` and \`posterior_mean(a, b, flips)\`. Also write \`grid_posterior_mean(a, b, flips)\`: compute the posterior mean **numerically** on a grid of 10,000 values of $p$ (prior × likelihood, normalised), so the checks can confirm the formula $\frac{a'}{a' + b'}$ the lesson took on trust.`,
    starter: py`def posterior(a, b, flips):
    ...

def map_estimate(a, b, flips):
    ...

def posterior_mean(a, b, flips):
    ...

def grid_posterior_mean(a, b, flips, n=10000):
    ...
`,
    solution: py`def posterior(a, b, flips):
    heads = sum(flips)
    return a + heads, b + len(flips) - heads

def map_estimate(a, b, flips):
    a2, b2 = posterior(a, b, flips)
    return (a2 - 1) / (a2 + b2 - 2)

def posterior_mean(a, b, flips):
    a2, b2 = posterior(a, b, flips)
    return a2 / (a2 + b2)

def grid_posterior_mean(a, b, flips, n=10000):
    heads = sum(flips)
    tails = len(flips) - heads
    ps = [(i + 0.5) / n for i in range(n)]
    weights = [p ** (a - 1 + heads) * (1 - p) ** (b - 1 + tails) for p in ps]
    return sum(p * w for p, w in zip(ps, weights)) / sum(weights)
`,
    checks: checks(py`
expect(posterior(2, 2, [1, 1, 1]), (5, 2), "posterior(2, 2, three heads)")
expect(map_estimate(2, 2, [1, 1, 1]), 0.8, "MAP after three heads with Beta(2, 2)")
expect(map_estimate(1, 1, [1, 0, 1, 1]), 0.75, "MAP with a flat prior equals the MLE")
for a, b, flips in [(2, 2, [1, 1, 1]), (5, 1, [0, 0, 1, 0]), (1, 1, [1] * 7 + [0] * 3)]:
    expect(grid_posterior_mean(a, b, flips), posterior_mean(a, b, flips), f"the posterior mean for Beta({a}, {b}) and {flips}", tol=1e-6)
`),
    hints: ['Posterior: add the number of heads to $a$ and the number of tails to $b$.', 'On the grid, the weight of each $p$ is $p^{a-1+h}(1-p)^{b-1+t}$; the normalising constant cancels in the ratio.'],
  },

  estimation: {
    prompt: py`Demonstrate Bessel's correction and the bootstrap. Write \`sample_variance(xs, ddof)\` (divide by $n -$ \`ddof\`), \`average_estimate(ddof, n, trials, seed)\`: the average of \`sample_variance\` over many samples of size $n$ from $\mathcal N(0, 2^2)$, and \`bootstrap_interval(xs, stat, B, seed)\`. The checks confirm dividing by $n$ is biased by $\frac{n-1}{n}$ and $n - 1$ is not.`,
    starter: py`import random

def sample_variance(xs, ddof=0):
    ...

def average_estimate(ddof, n=5, trials=20000, seed=0):
    ...

def bootstrap_interval(xs, stat, B=2000, seed=0):
    ...
`,
    solution: py`import random

def sample_variance(xs, ddof=0):
    m = sum(xs) / len(xs)
    return sum((x - m) ** 2 for x in xs) / (len(xs) - ddof)

def average_estimate(ddof, n=5, trials=20000, seed=0):
    rng = random.Random(seed)
    total = 0.0
    for _ in range(trials):
        total += sample_variance([rng.gauss(0, 2) for _ in range(n)], ddof)
    return total / trials

def bootstrap_interval(xs, stat, B=2000, seed=0):
    rng = random.Random(seed)
    values = sorted(stat([rng.choice(xs) for _ in xs]) for _ in range(B))
    return values[int(0.025 * B)], values[int(0.975 * B) - 1]
`,
    checks: checks(py`
expect(sample_variance([1, 2, 3, 4], 0), 1.25, "sample_variance with ddof 0")
expect(sample_variance([1, 2, 3, 4], 1), 5 / 3, "sample_variance with ddof 1")
expect(average_estimate(0), 4 * 4 / 5, "the average of the ÷n estimate (true variance 4, n = 5)", tol=0.03)
expect(average_estimate(1), 4, "the average of the ÷(n − 1) estimate", tol=0.03)
lo, hi = bootstrap_interval([3, 7, 1, 9, 4, 6, 2, 8], lambda v: sum(v) / len(v), 2000, 1)
assert lo < 5 < hi and 3 < lo and hi < 7, f"the bootstrap interval ({lo}, {hi}) should surround 5 with a sensible width"
`),
    hints: ['`random.Random(seed).gauss(0, 2)` draws from $\\mathcal N(0, 2^2)$.'],
  },

  'hypothesis-tests': {
    prompt: py`Write \`permutation_p_value(a, b, trials, seed)\` (two-sided, difference in means). Then show why multiple comparisons matter: \`false_alarm_rate(tests, alpha, experiments, seed)\` runs many experiments; in each, it compares \`tests\` pairs of groups drawn from the **same** distribution and records whether **any** test gave $p <$ \`alpha\` (use a cheap z-test: $|\bar a - \bar b| / \sqrt{2/m} > z$ where $z$ is 1.96 for $\alpha = 0.05$; groups have size $m = 30$ of standard normals).`,
    starter: py`import math, random

def permutation_p_value(a, b, trials=2000, seed=0):
    ...

def false_alarm_rate(tests, alpha=0.05, experiments=2000, seed=0):
    z = {0.05: 1.959964, 0.0025: 3.023341}[alpha]
    ...
`,
    solution: py`import math, random

def permutation_p_value(a, b, trials=2000, seed=0):
    rng = random.Random(seed)
    mean = lambda v: sum(v) / len(v)
    observed = abs(mean(a) - mean(b))
    pooled = list(a) + list(b)
    hits = 0
    for _ in range(trials):
        rng.shuffle(pooled)
        if abs(mean(pooled[:len(a)]) - mean(pooled[len(a):])) >= observed:
            hits += 1
    return hits / trials

def false_alarm_rate(tests, alpha=0.05, experiments=2000, seed=0):
    z = {0.05: 1.959964, 0.0025: 3.023341}[alpha]
    rng = random.Random(seed)
    m = 30
    alarms = 0
    for _ in range(experiments):
        for _ in range(tests):
            a = sum(rng.gauss(0, 1) for _ in range(m)) / m
            b = sum(rng.gauss(0, 1) for _ in range(m)) / m
            if abs(a - b) / math.sqrt(2 / m) > z:
                alarms += 1
                break
    return alarms / experiments
`,
    checks: checks(py`
p = permutation_p_value([1, 2, 3, 4, 2, 3], [5, 6, 7, 8, 6, 7])
assert p < 0.01, f"clearly different groups should give a tiny p-value, got {p}"
p = permutation_p_value([1, 2, 3, 4], [2, 3, 1, 4])
assert p > 0.5, f"identical-looking groups should give a large p-value, got {p}"
one = false_alarm_rate(1)
expect(one, 0.05, "the false-alarm rate of a single test", tol=0.015)
twenty = false_alarm_rate(20, experiments=400)
expect(twenty, 1 - 0.95 ** 20, "the chance of any false alarm in 20 tests", tol=0.06)
bonf = false_alarm_rate(20, alpha=0.0025, experiments=400)
assert bonf < 0.08, f"Bonferroni should keep it near 0.05, got {bonf}"
`),
    hints: ['Stop each experiment at its first alarm with `break`, and count the experiment once.', 'Under the null each group mean has variance $1/m$, so their difference has variance $2/m$.'],
  },

  'monte-carlo': {
    prompt: py`Write \`estimate_pi(n, seed)\` (points in the unit square, fraction inside the quarter circle, times 4), then use **importance sampling** for a rare event: $P(Z > 4)$ for a standard normal $Z$ (about $3.2 \times 10^{-5}$). \`naive(n, seed)\` counts how often $Z > 4$ among $n$ normal draws; \`importance_tail(n, seed)\` samples $X \sim \mathcal N(4, 1)$ instead and averages $\mathbb 1[X > 4]\,\frac{\varphi(X)}{\varphi(X - 4)}$.`,
    starter: py`import math, random

def phi(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def estimate_pi(n, seed=0):
    ...

def naive(n, seed=0):
    ...

def importance_tail(n, seed=0):
    ...
`,
    solution: py`import math, random

def phi(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def estimate_pi(n, seed=0):
    rng = random.Random(seed)
    inside = 0
    for _ in range(n):
        x, y = rng.random(), rng.random()
        if x * x + y * y <= 1:
            inside += 1
    return 4 * inside / n

def naive(n, seed=0):
    rng = random.Random(seed)
    return sum(1 for _ in range(n) if rng.gauss(0, 1) > 4) / n

def importance_tail(n, seed=0):
    rng = random.Random(seed)
    total = 0.0
    for _ in range(n):
        x = rng.gauss(4, 1)
        if x > 4:
            total += phi(x) / phi(x - 4)
    return total / n
`,
    checks: checks(py`
expect(estimate_pi(40000), math.pi, "estimate_pi(40000)", tol=0.01)
true_tail = 0.5 * math.erfc(4 / math.sqrt(2))
expect(importance_tail(20000), true_tail, "the importance-sampled tail", tol=true_tail * 0.05)
n = naive(20000)
assert n < true_tail * 3, f"the naive estimate {n} from 20,000 draws mostly sees nothing"
`),
    hints: ['The weight is $p(x)/q(x)$ with $p = \\varphi(x)$ and $q = \\varphi(x - 4)$, the density of $\\mathcal N(4, 1)$.', 'Half of the draws from $\\mathcal N(4, 1)$ land beyond 4, so the rare event is seen all the time.'],
  },

  jensen: {
    prompt: py`Write \`jensen_gap(f, xs)\` $= \frac1n\sum f(x_i) - f(\bar x)$. Check Jensen on random lists for convex functions ($x^2$, $e^x$, $|x|$) and see it fail for a concave one. Then write \`elbo_gap(ws)\`: for positive weights $w_i$ (equally likely), $\ln\mathbb E[w] - \mathbb E[\ln w]$, which must be $\ge 0$.`,
    starter: py`import math, random

def jensen_gap(f, xs):
    ...

def elbo_gap(ws):
    ...
`,
    solution: py`import math, random

def jensen_gap(f, xs):
    return sum(f(x) for x in xs) / len(xs) - f(sum(xs) / len(xs))

def elbo_gap(ws):
    return math.log(sum(ws) / len(ws)) - sum(math.log(w) for w in ws) / len(ws)
`,
    checks: checks(py`
expect(jensen_gap(lambda x: x * x, [1, 2, 6]), 14 / 3, "the gap for x² on 1, 2, 6")
rng = random.Random(7)
for _ in range(200):
    xs = [rng.uniform(-3, 3) for _ in range(rng.randint(2, 8))]
    for f in (lambda x: x * x, math.exp, abs):
        assert jensen_gap(f, xs) >= -1e-12, "Jensen failed for a convex function"
    ws = [rng.uniform(0.1, 5) for _ in range(5)]
    assert elbo_gap(ws) >= -1e-12, "ln E[w] should never be below E[ln w]"
assert jensen_gap(lambda x: -x * x, [1, 2, 6]) < 0, "for a concave function the gap is negative"
`),
    hints: ['$\\ln$ is concave, so $\\ln$ of the average beats the average of $\\ln$.'],
  },

  information: {
    prompt: py`Write \`entropy_bits(ps)\`, \`mutual_information(joint)\` (a dict \`{(x, y): p}\`, in bits) and \`huffman_lengths(ps)\`: codeword lengths of a Huffman code (repeatedly merge the two least likely groups; every merge adds one bit to all symbols in both groups). The checks confirm $H \le \text{average length} < H + 1$, and that mutual information is 0 for an independent table.`,
    starter: py`import math

def entropy_bits(ps):
    ...

def mutual_information(joint):
    ...

def huffman_lengths(ps):
    ...
`,
    solution: py`import math

def entropy_bits(ps):
    return -sum(p * math.log2(p) for p in ps if p > 0)

def mutual_information(joint):
    px, py = {}, {}
    for (x, y), p in joint.items():
        px[x] = px.get(x, 0) + p
        py[y] = py.get(y, 0) + p
    return sum(p * math.log2(p / (px[x] * py[y])) for (x, y), p in joint.items() if p > 0)

def huffman_lengths(ps):
    lengths = [0] * len(ps)
    groups = [(p, [i]) for i, p in enumerate(ps)]
    while len(groups) > 1:
        groups.sort(key=lambda g: g[0])
        (p1, a), (p2, b) = groups[0], groups[1]
        for i in a + b:
            lengths[i] += 1
        groups = groups[2:] + [(p1 + p2, a + b)]
    return lengths
`,
    checks: checks(py`
expect(entropy_bits([0.5, 0.5]), 1, "entropy of a fair coin")
expect(entropy_bits([0.25] * 4), 2, "entropy of 4 equal outcomes")
expect(mutual_information({(0, 0): 0.25, (0, 1): 0.25, (1, 0): 0.25, (1, 1): 0.25}), 0, "mutual information of an independent table")
expect(mutual_information({(0, 0): 0.5, (1, 1): 0.5}), 1, "mutual information when Y copies X")
for ps in ([0.5, 0.25, 0.125, 0.125], [0.4, 0.3, 0.2, 0.1], [0.9, 0.05, 0.05]):
    L = huffman_lengths(ps)
    avg = sum(p * l for p, l in zip(ps, L))
    H = entropy_bits(ps)
    assert H - 1e-12 <= avg < H + 1, f"average length {avg} should lie in [H, H + 1) with H = {H}"
expect(huffman_lengths([0.5, 0.25, 0.125, 0.125]), [1, 2, 3, 3], "Huffman lengths for halving probabilities (exactly −log₂ p)")
`),
    hints: ['Keep a list of (probability, symbols) groups; sort, merge the two smallest, repeat.'],
  },

  'markov-chains': {
    prompt: py`Write \`step(P, dist)\` ($\boldsymbol\pi P$), \`stationary_exact(P)\` for a **2-state** chain by solving $\boldsymbol\pi = \boldsymbol\pi P$ with $\pi_1 + \pi_2 = 1$ by hand, and \`simulate(P, start, steps, seed)\`: a random walk (choose the next state with probabilities \`P[current]\`), returning the fraction of time spent in each state. The checks confirm the long-run fractions match the stationary distribution.`,
    starter: py`import random

def step(P, dist):
    ...

def stationary_exact(P):
    ...

def simulate(P, start, steps, seed=0):
    ...
`,
    solution: py`import random

def step(P, dist):
    return [sum(dist[i] * P[i][j] for i in range(len(dist))) for j in range(len(dist))]

def stationary_exact(P):
    a, b = P[0][1], P[1][0]
    return [b / (a + b), a / (a + b)]

def simulate(P, start, steps, seed=0):
    rng = random.Random(seed)
    counts = [0] * len(P)
    state = start
    for _ in range(steps):
        counts[state] += 1
        u, total = rng.random(), 0.0
        for j, p in enumerate(P[state]):
            total += p
            if u < total:
                state = j
                break
    return [c / steps for c in counts]
`,
    checks: checks(py`
P = [[0.9, 0.1], [0.5, 0.5]]
expect(step(P, [0, 1]), [0.5, 0.5], "one step from rain")
pi = stationary_exact(P)
expect(pi, [5 / 6, 1 / 6], "the stationary distribution")
expect(step(P, pi), pi, "π P compared with π (unchanged)")
expect(simulate(P, 1, 50000), pi, "the long-run share of time", tol=0.02)
Q = [[0.6, 0.3, 0.1], [0.2, 0.6, 0.2], [0.3, 0.3, 0.4]]
d = [1.0, 0.0, 0.0]
for _ in range(200):
    d = step(Q, d)
expect(simulate(Q, 0, 60000, 1), d, "a three-state chain's time shares compared with its stationary distribution", tol=0.02)
`),
    hints: ['For two states, balance the flows: $\\pi_1 P_{12} = \\pi_2 P_{21}$.'],
  },
}
