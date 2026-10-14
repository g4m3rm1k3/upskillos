// Exercises for the learning-theory part: measure generalisation honestly, check the bounds against
// simulation, count labellings, and find the minimum-norm fit two ways.
import { checks, py } from './checks.js'

const FIT_POLY = py`def solve(A, b):
    """Gaussian elimination with partial pivoting."""
    n = len(A)
    M = [list(row) + [bi] for row, bi in zip(A, b)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            M[r] = [a - f * q for a, q in zip(M[r], M[c])]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x

def fit_poly(xs, ys, degree):
    X = [[x ** p for p in range(degree + 1)] for x in xs]
    XtX = [[sum(r[i] * r[j] for r in X) for j in range(degree + 1)] for i in range(degree + 1)]
    return solve(XtX, [sum(r[i] * y for r, y in zip(X, ys)) for i in range(degree + 1)])

def poly_value(coeffs, x):
    return sum(c * x ** p for p, c in enumerate(coeffs))
`

const SOLVE = FIT_POLY.split('\ndef fit_poly')[0] + '\n'

export const EXERCISES = {
  generalisation: {
    prompt: py`\`solve\`, \`fit_poly\` and \`poly_value\` are given. Write \`folds(n, k)\`: a list of \`k\` lists of indices, fold \`j\` holding every index \`i\` with \`i % k == j\`. Then \`cv_error(xs, ys, degree, k)\` (fit on the other folds, average the held-out mean squared errors) and \`choose_degree(xs, ys, degrees, k)\`: the degree with the lowest cross-validation error. The checks confirm the folds partition the data, that cross-validation error is never below training error here, and that it picks a sensible degree where training error would pick the largest.`,
    starter: FIT_POLY + py`
import math, random

def folds(n, k):
    ...

def cv_error(xs, ys, degree, k):
    ...

def choose_degree(xs, ys, degrees, k=5):
    ...
`,
    solution: FIT_POLY + py`
import math, random

def folds(n, k):
    return [[i for i in range(n) if i % k == j] for j in range(k)]

def mse(coeffs, xs, ys):
    return sum((poly_value(coeffs, x) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)

def cv_error(xs, ys, degree, k):
    total = 0.0
    for held in folds(len(xs), k):
        keep = [i for i in range(len(xs)) if i not in held]
        coeffs = fit_poly([xs[i] for i in keep], [ys[i] for i in keep], degree)
        total += mse(coeffs, [xs[i] for i in held], [ys[i] for i in held])
    return total / k

def choose_degree(xs, ys, degrees, k=5):
    return min(degrees, key=lambda d: cv_error(xs, ys, d, k))
`,
    checks: checks(py`
F = folds(23, 5)
expect(sorted(i for f in F for i in f), list(range(23)), "the folds together cover every index once")
assert all(len(f) in (4, 5) for f in F), "folds should be (nearly) equal in size"
rng = random.Random(1)
xs = [rng.uniform(-1, 1) for _ in range(30)]
ys = [math.sin(3 * x) + rng.gauss(0, 0.2) for x in xs]
train_err = lambda d: sum((poly_value(fit_poly(xs, ys, d), x) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)
for d in (1, 3, 6):
    assert cv_error(xs, ys, d, 5) >= train_err(d), f"held-out error should exceed training error at degree {d}"
best = choose_degree(xs, ys, list(range(0, 11)))
assert 3 <= best <= 7, f"cross-validation should pick a moderate degree, got {best}"
assert min(range(0, 11), key=train_err) == 10, "training error alone would pick the largest degree"
`),
    hints: ['A point is held out in fold `i % k`; train on every index not in the held-out fold.', '`min(degrees, key=...)` returns the degree whose key is smallest.'],
  },

  concentration: {
    prompt: py`Hoeffding for values in $[a, b]$: $P(|\bar X - \mu| \ge \varepsilon) \le 2e^{-2n\varepsilon^2/(b-a)^2}$. Write \`hoeffding(n, eps, width)\`, \`dice_tail(n, eps, trials, seed)\` (how often the mean of \`n\` fair dice rolls lands \`eps\` or more from 3.5; compare totals, not means, to avoid rounding trouble) and \`dice_samples(eps, delta)\` (the smallest \`n\` with Hoeffding's bound $\le \delta$ for dice). The checks confirm the bound holds and how the sample size scales.`,
    starter: py`import math, random

def hoeffding(n, eps, width=1.0):
    ...

def dice_tail(n, eps, trials=3000, seed=0):
    ...

def dice_samples(eps, delta):
    ...
`,
    solution: py`import math, random

def hoeffding(n, eps, width=1.0):
    return min(1.0, 2 * math.exp(-2 * n * eps * eps / width ** 2))

def dice_tail(n, eps, trials=3000, seed=0):
    rng = random.Random(seed)
    hits = 0
    for _ in range(trials):
        total = sum(rng.randint(1, 6) for _ in range(n))
        if abs(total - 3.5 * n) >= eps * n:
            hits += 1
    return hits / trials

def dice_samples(eps, delta):
    return math.ceil(25 * math.log(2 / delta) / (2 * eps * eps))
`,
    checks: checks(py`
for n in (10, 40, 100):
    for eps in (0.5, 1.0):
        sim, bound = dice_tail(n, eps), hoeffding(n, eps, 5)
        assert sim <= bound + 0.01, f"n={n}, ε={eps}: measured {sim:.4f} should not exceed Hoeffding's {bound:.4f}"
expect(hoeffding(100, 0.1), 2 * math.exp(-2), "hoeffding(100, 0.1)")
expect(dice_samples(0.5, 0.05), 185, "dice rolls for ε = 0.5 at 95%")
assert dice_samples(0.25, 0.05) >= 4 * dice_samples(0.5, 0.05) - 4, "halving ε should roughly quadruple n"
assert dice_samples(0.5, 0.0001) < 3 * dice_samples(0.5, 0.05), "500 times more confidence should cost less than triple"
`),
    hints: ['Dice span $[1, 6]$, so the width is 5 and $n \\ge 25\\ln(2/\\delta)/(2\\varepsilon^2)$.', '`rng.randint(1, 6)` rolls one die.'],
  },

  'union-bound': {
    prompt: py`See the price of choosing on a test set. \`k\` models all have true accuracy exactly 0.7; each is scored on its own \`m\` test examples (each correct with probability 0.7). Write \`best_score(k, m, rng)\`: the highest of the \`k\` measured accuracies. Then \`optimism(k, m, trials, seed)\`: the average of \`best_score - 0.7\` over many trials. The checks confirm the optimism grows with \`k\`, shrinks with \`m\`, and stays below $\sqrt{\ln k/(2m)}$, the bound Hoeffding's lemma gives for the expected maximum.`,
    starter: py`import math, random

def best_score(k, m, rng):
    ...

def optimism(k, m, trials=300, seed=0):
    ...
`,
    solution: py`import math, random

def best_score(k, m, rng):
    return max(sum(1 for _ in range(m) if rng.random() < 0.7) / m for _ in range(k))

def optimism(k, m, trials=300, seed=0):
    rng = random.Random(seed)
    return sum(best_score(k, m, rng) - 0.7 for _ in range(trials)) / trials
`,
    checks: checks(py`
o1, o10, o100 = optimism(1, 100), optimism(10, 100), optimism(100, 100)
assert abs(o1) < 0.01, f"one model has no selection bias: got {o1:.4f}"
assert o1 < o10 < o100, f"more models, more optimism: {o1:.4f}, {o10:.4f}, {o100:.4f}"
for k in (10, 100):
    o = optimism(k, 100)
    assert o <= math.sqrt(math.log(k) / 200), f"k={k}: optimism {o:.4f} should be under the bound {math.sqrt(math.log(k) / 200):.4f}"
assert optimism(100, 400) < optimism(100, 100), "a bigger test set should shrink the optimism"
`),
    hints: ['Each model\'s measured accuracy is the fraction of `m` coin flips (heads with probability 0.7) that come up heads.'],
  },

  'pac-vc': {
    prompt: py`Write \`patterns(points, classifiers)\`: the set of label tuples a list of classifier functions produces. Then \`unions_of_two_intervals(xs)\`: all labellings "1 when $x$ is in $(l_1, u_1)$ or $(l_2, u_2)$", using cuts below, between and above the sorted points for every end. Then \`vc_on_line(pattern_fn, max_n)\`: the largest \`n\` such that \`pattern_fn([1, 2, …, n])\` has all $2^n$ labellings. The checks confirm unions of two intervals have VC dimension 4 and meet Sauer's bound.`,
    starter: py`import math

def patterns(points, classifiers):
    ...

def unions_of_two_intervals(xs):
    ...

def vc_on_line(pattern_fn, max_n=7):
    ...
`,
    solution: py`import math

def patterns(points, classifiers):
    return {tuple(h(p) for p in points) for h in classifiers}

def cuts_of(xs):
    s = sorted(xs)
    return [s[0] - 1] + [(a + b) / 2 for a, b in zip(s, s[1:])] + [s[-1] + 1]

def unions_of_two_intervals(xs):
    c = cuts_of(xs)
    out = set()
    for l1 in c:
        for u1 in c:
            for l2 in c:
                for u2 in c:
                    out.add(tuple(1 if (l1 < x < u1 or l2 < x < u2) else 0 for x in xs))
    return out

def vc_on_line(pattern_fn, max_n=7):
    best = 0
    for n in range(1, max_n + 1):
        if len(pattern_fn(list(range(1, n + 1)))) == 2 ** n:
            best = n
    return best
`,
    checks: checks(py`
ths = [lambda x, t=t: 1 if x > t else 0 for t in (0.5, 1.5, 2.5, 3.5)]
expect(len(patterns([1, 2, 3], ths)), 4, "thresholds on 3 points")
thresholds = lambda xs: patterns(xs, [lambda x, t=t: 1 if x > t else 0 for t in [min(xs) - 1] + [v + 0.5 for v in xs]])
expect(vc_on_line(thresholds), 1, "VC dimension of thresholds")
expect(vc_on_line(unions_of_two_intervals), 4, "VC dimension of unions of two intervals")
sauer = lambda n, d: sum(math.comb(n, i) for i in range(d + 1))
for n in (5, 6):
    expect(len(unions_of_two_intervals(list(range(1, n + 1)))), sauer(n, 4), f"unions of two intervals on {n} points compared with Sauer's bound")
`),
    hints: ['A labelling of $n$ points by two intervals has at most two runs of 1s; five points labelled 1,0,1,0,1 needs three.', 'Use `lambda x, t=t: …` inside a comprehension so each lambda keeps its own `t`.'],
  },

  'double-descent': {
    prompt: py`\`solve\` is given. Write \`min_norm(F, y)\` $= F^\top(FF^\top)^{-1}\mathbf y$ and \`gd(F, y, rate, steps, w0)\`: gradient descent on $\frac1n\|F\mathbf w - \mathbf y\|^2$ from the starting point \`w0\`. The checks confirm the minimum-norm fit is exact, is shorter than other exact fits (add any vector with $F\mathbf v = 0$), that gradient descent from zero finds it, and that from another start it finds a different, longer exact fit.`,
    starter: SOLVE + py`
import math, random

def min_norm(F, y):
    ...

def gd(F, y, rate, steps, w0):
    ...
`,
    solution: SOLVE + py`
import math, random

def min_norm(F, y):
    n = len(F)
    G = [[sum(a * b for a, b in zip(F[i], F[j])) for j in range(n)] for i in range(n)]
    alpha = solve(G, y)
    return [sum(alpha[i] * F[i][k] for i in range(n)) for k in range(len(F[0]))]

def gd(F, y, rate, steps, w0):
    n = len(F)
    w = list(w0)
    for _ in range(steps):
        r = [sum(a * b for a, b in zip(f, w)) - yi for f, yi in zip(F, y)]
        w = [wk - rate * 2 / n * sum(r[i] * F[i][k] for i in range(n)) for k, wk in enumerate(w)]
    return w
`,
    checks: checks(py`
rng = random.Random(3)
F = [[rng.gauss(0, 1) for _ in range(6)] for _ in range(3)]
y = [1.0, -0.5, 2.0]
w = min_norm(F, y)
norm = lambda v: math.sqrt(sum(a * a for a in v))
expect([sum(a * b for a, b in zip(f, w)) for f in F], y, "F w* = y", tol=1e-9)
# a vector with F v = 0: remove from a random vector its part along the rows
u = [rng.gauss(0, 1) for _ in range(6)]
v = [a - b for a, b in zip(u, min_norm(F, [sum(a * b for a, b in zip(f, u)) for f in F]))]
expect([sum(a * b for a, b in zip(f, v)) for f in F], [0, 0, 0], "F v = 0", tol=1e-9)
other = [a + b for a, b in zip(w, v)]
assert norm(other) > norm(w), "another exact fit should be longer"
g = gd(F, y, 0.05, 4000, [0.0] * 6)
expect(g, w, "gradient descent from zero compared with the minimum-norm fit", tol=1e-6)
g2 = gd(F, y, 0.05, 4000, u)
expect([sum(a * b for a, b in zip(f, g2)) for f in F], y, "gradient descent from u still fits exactly", tol=1e-6)
assert norm(g2) > norm(w) + 1e-3, "from a non-zero start it lands on a longer exact fit"
`),
    hints: ['The part of `u` that gradient descent can never change is the part perpendicular to every row of $F$.'],
  },
}
