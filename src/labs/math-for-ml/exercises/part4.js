// Part 4 exercises: probability by counting (exact Fractions where counting allows), then statistics.
import { checks, py } from './checks.js'

const PAIRS = py`from fractions import Fraction

# All 36 equally likely rolls of two dice, as (first, second).
PAIRS = [(a, b) for a in range(1, 7) for b in range(1, 7)]
`

export const EXERCISES = {
  probability: {
    prompt: py`Write \`prob(event, outcomes)\`, returning an exact \`Fraction\`: the outcomes where \`event(o)\` is true, over all of them. Then compute \`at_least_one_six\` for two dice **twice**: by counting, and by the complement rule, $1 - P(\text{no six})$, where $P(\text{no six}) = \frac56\cdot\frac56$. Store the second in \`by_complement\`. Finally write \`p_or(A, B, outcomes)\` using the "or" rule $P(A) + P(B) - P(A \text{ and } B)$, not by counting "A or B" directly.`,
    starter: PAIRS + py`
def prob(event, outcomes):
    ...

at_least_one_six = None
by_complement = None

def p_or(A, B, outcomes):
    ...
`,
    solution: PAIRS + py`
def prob(event, outcomes):
    return Fraction(sum(1 for o in outcomes if event(o)), len(outcomes))

at_least_one_six = prob(lambda o: 6 in o, PAIRS)
by_complement = 1 - Fraction(5, 6) * Fraction(5, 6)

def p_or(A, B, outcomes):
    return prob(A, outcomes) + prob(B, outcomes) - prob(lambda o: A(o) and B(o), outcomes)
`,
    checks: checks(py`
expect(prob(lambda o: o[0] + o[1] == 7, PAIRS), Fraction(1, 6), "P(total is 7)")
expect(at_least_one_six, Fraction(11, 36), "at_least_one_six")
expect(by_complement, Fraction(11, 36), "by_complement")
doubles = lambda o: o[0] == o[1]
big = lambda o: o[0] + o[1] >= 10
expect(p_or(doubles, big, PAIRS), prob(lambda o: doubles(o) or big(o), PAIRS), "p_or(doubles, total ≥ 10)")
`),
    hints: ['`Fraction(hits, total)` keeps the answer exact.', 'The "and" event is a new function: `lambda o: A(o) and B(o)`.'],
  },

  distributions: {
    prompt: py`Write \`distribution(values)\`: a dict from each value to its exact probability (a \`Fraction\`), for a list of equally likely outcomes. Use it to find the distribution of the **larger** of two dice, \`max_dist\`. The checks confirm the pattern you can derive by counting: $P(\max = k) = \frac{2k - 1}{36}$.`,
    starter: PAIRS + py`
def distribution(values):
    ...

max_dist = None
`,
    solution: PAIRS + py`
def distribution(values):
    p = {}
    for v in values:
        p[v] = p.get(v, 0) + Fraction(1, len(values))
    return p

max_dist = distribution([max(a, b) for a, b in PAIRS])
`,
    checks: checks(py`
d = distribution([a + b for a, b in PAIRS])
expect(d[7], Fraction(6, 36), "P(total = 7)")
expect(d[2], Fraction(1, 36), "P(total = 2)")
expect(sum(d.values()), Fraction(1), "the total probability")
for k in range(1, 7):
    expect(max_dist[k], Fraction(2 * k - 1, 36), f"P(max = {k})")
`),
    hints: ['Each outcome adds `Fraction(1, len(values))` to its value\'s entry.', 'The larger die is `max(a, b)`.'],
  },

  expectation: {
    prompt: py`Write \`expect_of(p, f)\` $= \mathbb E[f(X)] = \sum_x f(x)\,p(x)$ for a distribution dict \`p\`. (With \`f = lambda x: x\` it is the mean.) For one fair die, compute $\mathbb E[X]$ and $\mathbb E[X^2]$ as \`mean_die\` and \`mean_square\`. The checks then confirm linearity, $\mathbb E[2X + 3] = 2\,\mathbb E[X] + 3$, and that $\mathbb E[X^2] \ne (\mathbb E[X])^2$.`,
    starter: py`from fractions import Fraction

die = {k: Fraction(1, 6) for k in range(1, 7)}

def expect_of(p, f):
    ...

mean_die = None
mean_square = None
`,
    solution: py`from fractions import Fraction

die = {k: Fraction(1, 6) for k in range(1, 7)}

def expect_of(p, f):
    return sum(f(x) * px for x, px in p.items())

mean_die = expect_of(die, lambda x: x)
mean_square = expect_of(die, lambda x: x * x)
`,
    checks: checks(py`
expect(mean_die, Fraction(7, 2), "mean_die")
expect(mean_square, Fraction(91, 6), "mean_square")
expect(expect_of(die, lambda x: 2 * x + 3), 2 * mean_die + 3, "E[2X + 3]")
assert mean_square != mean_die ** 2, "E[X²] and (E[X])² should differ: the gap is the variance"
coin = {0: Fraction(1, 2), 1: Fraction(1, 2)}
expect(expect_of(coin, lambda x: 10 * x), 5, "E[10X] for a fair coin")
`),
    hints: ['Loop over `p.items()`: each value `x` with its probability `px`.'],
  },

  variance: {
    prompt: py`Write \`variance(p)\` from the definition $\mathbb E[(X - \mu)^2]$, and \`variance_shortcut(p)\` $= \mathbb E[X^2] - \mu^2$. Expand $(X - \mu)^2 = X^2 - 2\mu X + \mu^2$ and use linearity to see why they agree; the checks confirm it. Then confirm, on the die, that $\mathrm{Var}(aX + b) = a^2\,\mathrm{Var}(X)$: write \`scaled(p, a, b)\`, the distribution of $aX + b$.`,
    starter: py`from fractions import Fraction

die = {k: Fraction(1, 6) for k in range(1, 7)}

def mean(p):
    return sum(x * px for x, px in p.items())

def variance(p):
    ...

def variance_shortcut(p):
    ...

def scaled(p, a, b):
    ...
`,
    solution: py`from fractions import Fraction

die = {k: Fraction(1, 6) for k in range(1, 7)}

def mean(p):
    return sum(x * px for x, px in p.items())

def variance(p):
    mu = mean(p)
    return sum((x - mu) ** 2 * px for x, px in p.items())

def variance_shortcut(p):
    return sum(x * x * px for x, px in p.items()) - mean(p) ** 2

def scaled(p, a, b):
    return {a * x + b: px for x, px in p.items()}
`,
    checks: checks(py`
expect(variance(die), Fraction(35, 12), "variance(die)")
expect(variance_shortcut(die), Fraction(35, 12), "variance_shortcut(die)")
two = {}
for a in range(1, 7):
    for b in range(1, 7):
        two[a + b] = two.get(a + b, 0) + Fraction(1, 36)
expect(variance(two), Fraction(35, 6), "variance of two dice (double one die's: independent variances add)")
expect(variance(scaled(die, 3, -1)), 9 * variance(die), "Var(3X − 1)")
expect(variance(scaled(die, 1, 100)), variance(die), "Var(X + 100) (shifting doesn't change spread)")
`),
    hints: ['$\\mu$ first, then average $(x - \\mu)^2$ with weights $p(x)$.', '`scaled` relabels each value: `{a * x + b: px ...}`.'],
  },

  conditional: {
    prompt: py`Write \`given(A, B, outcomes)\` $= P(A \mid B)$ as an exact \`Fraction\`: keep only the outcomes where $B$ happened, then count $A$ among them. The checks compare $P(\text{total} = 8 \mid \text{first} = 3)$ with $P(\text{first} = 3 \mid \text{total} = 8)$: conditional probability is not symmetric. They also confirm the product rule $P(A \cap B) = P(A \mid B)\,P(B)$.`,
    starter: PAIRS + py`
def given(A, B, outcomes):
    ...
`,
    solution: PAIRS + py`
def given(A, B, outcomes):
    kept = [o for o in outcomes if B(o)]
    return Fraction(sum(1 for o in kept if A(o)), len(kept))
`,
    checks: checks(py`
eight = lambda o: o[0] + o[1] == 8
first3 = lambda o: o[0] == 3
expect(given(eight, first3, PAIRS), Fraction(1, 6), "P(total 8 | first 3)")
expect(given(first3, eight, PAIRS), Fraction(1, 5), "P(first 3 | total 8)")
both = Fraction(sum(1 for o in PAIRS if eight(o) and first3(o)), 36)
expect(given(eight, first3, PAIRS) * Fraction(1, 6), both, "P(A | B) P(B) compared with P(A and B)")
`),
    hints: ['Narrow the outcomes to those where `B(o)` is true; the new total is how many are left.'],
  },

  bayes: {
    prompt: py`Write \`posterior(prior, hit, false_alarm)\`: $P(\text{ill} \mid +)$ for a test that is positive with probability \`hit\` if ill and \`false_alarm\` if well. Then write \`after_tests(prior, hit, false_alarm, k)\`: the probability of illness after $k$ independent positive tests, feeding each posterior in as the next prior. The checks compare with doing all $k$ at once, $\frac{h^k\pi}{h^k\pi + f^k(1 - \pi)}$.`,
    starter: py`def posterior(prior, hit, false_alarm):
    ...

def after_tests(prior, hit, false_alarm, k):
    ...
`,
    solution: py`def posterior(prior, hit, false_alarm):
    positive = hit * prior + false_alarm * (1 - prior)
    return hit * prior / positive

def after_tests(prior, hit, false_alarm, k):
    p = prior
    for _ in range(k):
        p = posterior(p, hit, false_alarm)
    return p
`,
    checks: checks(py`
expect(posterior(0.01, 0.9, 0.05), 0.009 / (0.009 + 0.0495), "posterior(0.01, 0.9, 0.05)")
assert posterior(0.01, 0.9, 0.05) < 0.2, "one positive test on a rare illness should still leave it unlikely"
for k in [1, 2, 3]:
    direct = 0.9 ** k * 0.01 / (0.9 ** k * 0.01 + 0.05 ** k * 0.99)
    expect(after_tests(0.01, 0.9, 0.05, k), direct, f"after_tests(…, k = {k})")
expect(after_tests(0.3, 0.8, 0.1, 0), 0.3, "after zero tests the belief is the prior")
`),
    hints: ['$P(+)$ adds up both ways to test positive: ill and caught, or well and a false alarm.', 'Loop $k$ times, replacing `p` with `posterior(p, …)`.'],
  },

  densities: {
    prompt: py`Write \`prob_between(pdf, a, b)\`: the area under a density from $a$ to $b$, by 10,000 midpoint rectangles. Then write \`triangle(x)\`, the density on $[0, 2]$ that rises in a straight line from 0 at $x = 0$ to its peak at $x = 1$ and falls back to 0 at $x = 2$ (zero elsewhere). Choose the peak's height so the total area is 1.`,
    starter: py`def prob_between(pdf, a, b, n=10000):
    ...

def triangle(x):
    ...
`,
    solution: py`def prob_between(pdf, a, b, n=10000):
    w = (b - a) / n
    return sum(pdf(a + (i + 0.5) * w) for i in range(n)) * w

def triangle(x):
    if 0 <= x <= 1:
        return x
    if 1 < x <= 2:
        return 2 - x
    return 0.0
`,
    checks: checks(py`
uniform = lambda x: 0.5 if 0 <= x <= 2 else 0.0
expect(prob_between(uniform, 0, 0.5), 0.25, "P(0 ≤ X ≤ 0.5) for a uniform density on [0, 2]", tol=1e-9)
expect(prob_between(triangle, -1, 3), 1, "the total area under triangle", tol=1e-6)
expect(prob_between(triangle, 0, 0.5), 0.125, "P(X ≤ 0.5) for the triangle", tol=1e-6)
expect(triangle(1), 1, "the triangle's peak height")
expect(triangle(2.5), 0, "triangle outside [0, 2]")
`),
    hints: ['The area of a triangle is ½ × base × height; the base is 2.', 'Midpoints: $a + (i + 0.5)w$.'],
  },

  normal: {
    prompt: py`Write \`normal_pdf(x, mu, sigma)\` $= \frac{1}{\sigma\sqrt{2\pi}}e^{-(x-\mu)^2/(2\sigma^2)}$, building it in steps (standardise, square, halve, negate, exponentiate, divide). Then write \`within(k)\`: the probability of landing within $k$ standard deviations of the mean, as an area under the standard curve (midpoint rectangles). The checks confirm the 68–95–99.7 rule and compare with Python's \`math.erf\`.`,
    starter: py`import math

def normal_pdf(x, mu=0.0, sigma=1.0):
    ...

def within(k, n=20000):
    ...
`,
    solution: py`import math

def normal_pdf(x, mu=0.0, sigma=1.0):
    z = (x - mu) / sigma
    return math.exp(-z * z / 2) / (sigma * math.sqrt(2 * math.pi))

def within(k, n=20000):
    w = 2 * k / n
    return sum(normal_pdf(-k + (i + 0.5) * w) for i in range(n)) * w
`,
    checks: checks(py`
expect(normal_pdf(0), 1 / math.sqrt(2 * math.pi), "normal_pdf(0)")
expect(normal_pdf(5, 5, 2), 1 / (2 * math.sqrt(2 * math.pi)), "normal_pdf(5, 5, 2)")
expect(normal_pdf(1, 0, 1), normal_pdf(-1, 0, 1), "normal_pdf(1) compared with normal_pdf(-1)")
for k, rounded in [(1, 0.683), (2, 0.954), (3, 0.997)]:
    expect(round(within(k), 3), rounded, f"within({k}) to 3 places")
    expect(within(k), math.erf(k / math.sqrt(2)), f"within({k}) compared with erf", tol=1e-8)
`),
    hints: ['Standardise first: $z = (x - \\mu)/\\sigma$.', 'Integrate from $-k$ to $k$; each rectangle is $2k/n$ wide.'],
  },

  sampling: {
    prompt: py`Write \`spread(values)\`, the standard deviation of a list (divide by $n$). Then write \`wobble(n, trials, seed)\`: roll $n$ dice, take their average, do that \`trials\` times with \`random.Random(seed)\`, and return the spread of those averages. The checks confirm the standard-error law: the wobble is close to $\sigma/\sqrt n$, where $\sigma = \sqrt{35/12}$ for one die.`,
    starter: py`import math, random

def spread(values):
    ...

def wobble(n, trials=2000, seed=0):
    ...
`,
    solution: py`import math, random

def spread(values):
    m = sum(values) / len(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / len(values))

def wobble(n, trials=2000, seed=0):
    rng = random.Random(seed)
    means = [sum(rng.randint(1, 6) for _ in range(n)) / n for _ in range(trials)]
    return spread(means)
`,
    checks: checks(py`
expect(spread([2, 4, 4, 4, 5, 5, 7, 9]), 2, "spread([2, 4, 4, 4, 5, 5, 7, 9])")
sigma = math.sqrt(35 / 12)
for n in [1, 4, 25]:
    w = wobble(n)
    assert abs(w - sigma / math.sqrt(n)) < 0.08 * sigma / math.sqrt(n), f"wobble({n}) = {w:.4f}; σ/√n = {sigma / math.sqrt(n):.4f}"
assert wobble(100) < wobble(25) < wobble(4), "averages of more dice should wobble less"
`),
    hints: ['A new generator with `random.Random(seed)` makes the run repeatable; use its `randint(1, 6)`.', 'Quadrupling $n$ should halve the wobble.'],
  },

  likelihood: {
    prompt: py`Write \`likelihood(p, flips)\` $= \prod_i P(\text{flip}_i \mid p)$ for a list of 1s (heads) and 0s (tails). Then write \`best_p(flips)\`: the $p$ on the grid $0.01, 0.02, \dots, 0.99$ with the highest likelihood. The checks confirm it lands on the fraction of heads, and that the likelihoods over the grid do **not** add to 1: likelihood is not a probability distribution over $p$.`,
    starter: py`def likelihood(p, flips):
    ...

def best_p(flips):
    ...
`,
    solution: py`def likelihood(p, flips):
    L = 1.0
    for f in flips:
        L *= p if f == 1 else 1 - p
    return L

def best_p(flips):
    grid = [k / 100 for k in range(1, 100)]
    return max(grid, key=lambda p: likelihood(p, flips))
`,
    checks: checks(py`
expect(likelihood(0.5, [1, 0, 1]), 0.125, "likelihood(0.5, [1, 0, 1])")
expect(likelihood(0.7, [1, 1, 0]), 0.7 * 0.7 * 0.3, "likelihood(0.7, [1, 1, 0])")
flips = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]
expect(best_p(flips), 0.7, "best_p(7 heads in 10)")
expect(best_p([1, 0, 0, 0]), 0.25, "best_p(1 head in 4)")
total = sum(likelihood(k / 100, flips) for k in range(1, 100))
assert abs(total - 1) > 0.5, f"the likelihoods add to {total:.4f}, nowhere near 1"
`),
    hints: ['Multiply in $p$ for each head and $1 - p$ for each tail.', '`max(grid, key=…)`.'],
  },

  mle: {
    prompt: py`Two maximum-likelihood results, checked numerically. (1) Write \`nll(c, ys, sigma)\`: the negative log-likelihood of data \`ys\` if each is drawn from $\mathcal N(c, \sigma^2)$, $-\sum_i \ln \mathcal N(y_i; c, \sigma^2)$. (2) Write \`best_c(ys)\`: the $c$ that minimises it, which the lesson's algebra says is the mean. The checks confirm the slope of \`nll\` is zero there, and that \`nll\` is the squared error divided by $2\sigma^2$ plus a constant.`,
    starter: py`import math

def nll(c, ys, sigma=1.0):
    ...

def best_c(ys):
    ...
`,
    solution: py`import math

def nll(c, ys, sigma=1.0):
    total = 0.0
    for y in ys:
        total += (y - c) ** 2 / (2 * sigma ** 2) + math.log(sigma * math.sqrt(2 * math.pi))
    return total

def best_c(ys):
    return sum(ys) / len(ys)
`,
    checks: checks(py`
ys = [52, 55, 61, 64, 70, 71]
c = best_c(ys)
expect(c, 62.1666666667, "best_c(ys)", tol=1e-9)
slope = (nll(c + 1e-5, ys, 3) - nll(c - 1e-5, ys, 3)) / 2e-5
expect(slope, 0, "the slope of nll at best_c", tol=1e-5)
for a, b in [(50, 60), (58, 66)]:
    lhs = nll(a, ys, 3) - nll(b, ys, 3)
    rhs = (sum((y - a) ** 2 for y in ys) - sum((y - b) ** 2 for y in ys)) / (2 * 9)
    expect(lhs, rhs, f"nll({a}) − nll({b}) compared with the difference of squared errors / 2σ²", tol=1e-9)
`),
    hints: ['$-\\ln\\mathcal N(y; c, \\sigma^2) = \\frac{(y - c)^2}{2\\sigma^2} + \\ln(\\sigma\\sqrt{2\\pi})$.', 'The constant term doesn\'t depend on $c$, which is why it cancels in a difference.'],
  },

  covariance: {
    prompt: py`Write \`covariance(xs, ys)\` (dividing by $n$), \`correlation(xs, ys)\`, and \`cov_matrix(columns)\`: for a list of $k$ variables (each a list of $n$ values), the $k\times k$ matrix with entry $(i, j) = \mathrm{Cov}(\text{column}_i, \text{column}_j)$. The checks confirm it is symmetric, its diagonal holds the variances, and correlation ignores units: $\rho(2x + 3, y) = \rho(x, y)$.`,
    starter: py`import math

def covariance(xs, ys):
    ...

def correlation(xs, ys):
    ...

def cov_matrix(columns):
    ...
`,
    solution: py`import math

def covariance(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)

def correlation(xs, ys):
    return covariance(xs, ys) / math.sqrt(covariance(xs, xs) * covariance(ys, ys))

def cov_matrix(columns):
    return [[covariance(a, b) for b in columns] for a in columns]
`,
    checks: checks(py`
xs, ys = [1, 2, 3, 4, 5], [1, 2, 4, 3, 5]
expect(covariance(xs, ys), 1.8, "covariance(xs, ys)")
expect(correlation(xs, xs), 1, "correlation of a list with itself")
expect(correlation(xs, [-x for x in xs]), -1, "correlation with its negative")
expect(correlation([2 * x + 3 for x in xs], ys), correlation(xs, ys), "ρ(2x + 3, y)")
zs = [5, 3, 4, 1, 2]
C = cov_matrix([xs, ys, zs])
expect(len(C), 3, "the size of the covariance matrix")
for i in range(3):
    for j in range(3):
        expect(C[i][j], C[j][i], f"C[{i}][{j}] compared with C[{j}][{i}]")
expect(C[2][2], covariance(zs, zs), "C[2][2] (the variance of zs)")
`),
    hints: ['Subtract each list\'s mean, multiply matching deviations, average.', '$\\rho = \\mathrm{Cov}(X, Y)/(\\sigma_X\\sigma_Y)$, and $\\sigma_X = \\sqrt{\\mathrm{Cov}(X, X)}$.'],
  },

  pca: {
    prompt: py`Write \`first_component(points)\` for 2D points: build the covariance matrix, then find its top eigenvector by power iteration (Part 3's exercise), returned as a unit vector. Write \`projected_variance(points, d)\`: the variance of the points' coordinates along unit direction \`d\` (centre, then dot with \`d\`). The checks confirm no other direction captures more variance than the first component, and that the variance it captures equals the top eigenvalue.`,
    starter: py`import math

def covariance(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)

def first_component(points, steps=200):
    ...

def projected_variance(points, d):
    ...
`,
    solution: py`import math

def covariance(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)

def first_component(points, steps=200):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    C = [[covariance(xs, xs), covariance(xs, ys)], [covariance(xs, ys), covariance(ys, ys)]]
    v = [1.0, 0.0]
    for _ in range(steps):
        v = [C[0][0] * v[0] + C[0][1] * v[1], C[1][0] * v[0] + C[1][1] * v[1]]
        n = math.hypot(v[0], v[1])
        v = [v[0] / n, v[1] / n]
    return v

def projected_variance(points, d):
    mx = sum(p[0] for p in points) / len(points)
    my = sum(p[1] for p in points) / len(points)
    coords = [(p[0] - mx) * d[0] + (p[1] - my) * d[1] for p in points]
    return sum(c * c for c in coords) / len(coords)
`,
    checks: checks(py`
pts = [(2.5, 2.4), (0.5, 0.7), (2.2, 2.9), (1.9, 2.2), (3.1, 3.0), (2.3, 2.7), (2.0, 1.6), (1.0, 1.1), (1.5, 1.6), (1.1, 0.9)]
v = first_component(pts)
expect(math.hypot(*v), 1, "the length of the first component")
best = projected_variance(pts, v)
for k in range(36):
    t = math.pi * k / 36
    assert projected_variance(pts, (math.cos(t), math.sin(t))) <= best + 1e-12, f"the direction at {5 * k}° captures more variance than your component"
xs, ys = [p[0] for p in pts], [p[1] for p in pts]
a, b, d = covariance(xs, xs), covariance(xs, ys), covariance(ys, ys)
top = (a + d) / 2 + math.sqrt(((a - d) / 2) ** 2 + b * b)
expect(best, top, "the variance along the first component compared with the top eigenvalue", tol=1e-9)
`),
    hints: ['The covariance matrix is $\\begin{pmatrix}\\mathrm{Var}(x) & \\mathrm{Cov}(x,y)\\\\ \\mathrm{Cov}(x,y) & \\mathrm{Var}(y)\\end{pmatrix}$.', 'A coordinate along `d` is the centred point dotted with `d`.'],
  },
}
