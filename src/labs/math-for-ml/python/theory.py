"""Learning theory, each result as a short program: training against test error and cross-validation,
Hoeffding's bound against Chebyshev's and against simulation, the finite-class (union) bound with
threshold classifiers, counting the labellings a model family can make, and double descent with
minimum-norm least squares."""
import math
import random

from learners import fit_poly, poly_value
from matrices import solve


def make_data(n, noise, rng):
    """n points from y = sin(3x) plus normal noise, with x uniform on [−1, 1]."""
    xs = [rng.uniform(-1, 1) for _ in range(n)]
    ys = [math.sin(3 * x) + rng.gauss(0, noise) for x in xs]
    return xs, ys


def mean_squared_error(coeffs, xs, ys):
    """The average squared miss of a polynomial on some points."""
    return sum((poly_value(coeffs, x) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)


def train_and_test(degree, n_train=20, n_test=200, noise=0.2, seed=1):
    """Fit a polynomial on a training set, then measure its error there and on fresh test data."""
    rng = random.Random(seed)
    xs, ys = make_data(n_train, noise, rng)
    tx, ty = make_data(n_test, noise, rng)
    coeffs = fit_poly(xs, ys, degree)
    return mean_squared_error(coeffs, xs, ys), mean_squared_error(coeffs, tx, ty)


def k_fold_error(xs, ys, degree, k):
    """Cross-validation: hold out every k-th point in turn, fit on the rest, average the held-out errors."""
    total = 0.0
    for fold in range(k):
        train = [(x, y) for i, (x, y) in enumerate(zip(xs, ys)) if i % k != fold]
        held = [(x, y) for i, (x, y) in enumerate(zip(xs, ys)) if i % k == fold]
        coeffs = fit_poly([x for x, _ in train], [y for _, y in train], degree)
        total += mean_squared_error(coeffs, [x for x, _ in held], [y for _, y in held])
    return total / k


def chebyshev_tail(n, eps):
    """Chebyshev's bound on P(|mean − μ| ≥ ε) for n independent samples in [0, 1] (variance at most ¼)."""
    return min(1.0, 1 / (4 * n * eps * eps))


def hoeffding_tail(n, eps):
    """Hoeffding's two-sided bound on the same probability: 2e^(−2nε²)."""
    return min(1.0, 2 * math.exp(-2 * n * eps * eps))


def simulated_tail(n, eps, p=0.5, trials=2000, seed=0):
    """How often the mean of n coin flips (heads with probability p) lands ε or more from p."""
    rng = random.Random(seed)
    hits = 0
    for _ in range(trials):
        heads = sum(1 for _ in range(n) if rng.random() < p)
        if abs(heads - n * p) >= n * eps:
            hits += 1
    return hits / trials


def samples_needed(eps, delta):
    """The smallest n with 2e^(−2nε²) ≤ δ: n ≥ ln(2/δ) / (2ε²)."""
    return math.ceil(math.log(2 / delta) / (2 * eps * eps))


def finite_class_gap(size, n, delta):
    """With probability at least 1 − δ, every one of `size` models has |true − training error| at most this."""
    return math.sqrt((math.log(size) + math.log(2 / delta)) / (2 * n))


def threshold_true_error(t, boundary=0.3, flip=0.1):
    """Exact error of 'predict 1 when x > t' for x uniform on [0, 1], labels 1 above the boundary, flipped with probability `flip`."""
    return flip + (1 - 2 * flip) * abs(t - boundary)


def threshold_train_error(t, xs, ys):
    """The fraction of training points that 'predict 1 when x > t' gets wrong."""
    return sum(1 for x, y in zip(xs, ys) if (1 if x > t else 0) != y) / len(xs)


def erm_thresholds(n, size, trials=200, seed=0):
    """Pick the lowest-training-error threshold of `size` on many training sets: its mean training and true error, and how often the union bound's ε was beaten."""
    rng = random.Random(seed)
    ts = [i / (size - 1) for i in range(size)]
    eps = finite_class_gap(size, n, 0.05)
    train_sum = true_sum = 0.0
    bad = 0
    for _ in range(trials):
        xs = [rng.random() for _ in range(n)]
        ys = [(1 if x > 0.3 else 0) ^ (1 if rng.random() < 0.1 else 0) for x in xs]
        errs = [threshold_train_error(t, xs, ys) for t in ts]
        best = 0
        for i in range(1, size):
            if errs[i] < errs[best]:
                best = i
        train_sum += errs[best]
        true_sum += threshold_true_error(ts[best])
        if max(abs(e - threshold_true_error(t)) for e, t in zip(errs, ts)) > eps:
            bad += 1
    return train_sum / trials, true_sum / trials, bad / trials


def threshold_patterns(xs):
    """Every labelling 'x > t' can give these numbers: a cut below them all, between each neighbouring pair, and above them all."""
    s = sorted(xs)
    cuts = [s[0] - 1] + [(a + b) / 2 for a, b in zip(s, s[1:])] + [s[-1] + 1]
    return {tuple(1 if x > t else 0 for x in xs) for t in cuts}


def interval_patterns(xs):
    """Every labelling 'lo < x < hi' can give these numbers: both ends chosen from the same cuts."""
    s = sorted(xs)
    cuts = [s[0] - 1] + [(a + b) / 2 for a, b in zip(s, s[1:])] + [s[-1] + 1]
    return {tuple(1 if lo < x < hi else 0 for x in xs) for lo in cuts for hi in cuts}


def halfplane_patterns(points, directions=360):
    """The labellings half-planes give points in the plane: project onto many directions, cut between neighbouring projections."""
    found = set()
    for k in range(directions):
        a = 2 * math.pi * k / directions
        proj = [x * math.cos(a) + y * math.sin(a) for x, y in points]
        s = sorted(proj)
        cuts = [s[0] - 1] + [(u + v) / 2 for u, v in zip(s, s[1:])] + [s[-1] + 1]
        for t in cuts:
            found.add(tuple(1 if v > t else 0 for v in proj))
    return found


def sauer_bound(n, d):
    """Sauer's lemma: a family of VC dimension d makes at most C(n,0) + C(n,1) + … + C(n,d) labellings of n points."""
    return sum(math.comb(n, i) for i in range(d + 1))


def fit_first_p(X, ys, p):
    """Least squares on the first p features: the usual solution when p < n, the smallest-norm exact fit Fᵀ(FFᵀ)⁻¹y when p ≥ n."""
    F = [row[:p] for row in X]
    n = len(F)
    if p < n:
        G = [[sum(f[i] * f[j] for f in F) for j in range(p)] for i in range(p)]
        return solve(G, [sum(f[i] * y for f, y in zip(F, ys)) for i in range(p)])
    G = [[sum(a * b for a, b in zip(F[i], F[j])) for j in range(n)] for i in range(n)]
    alpha = solve(G, ys)
    return [sum(alpha[i] * F[i][k] for i in range(n)) for k in range(p)]


def excess_risk(w, beta):
    """Expected squared error beyond the noise, for standard normal features: missed weight on the features used, plus all weight left out."""
    p = len(w)
    return sum((b - a) ** 2 for a, b in zip(w, beta[:p])) + sum(b * b for b in beta[p:])


def double_descent(D=60, n=20, noise=0.2, trials=20, seed=0):
    """Average excess risk of fit_first_p for p = 1 … D, with true weights 0.95ʲ (scaled to length 1)."""
    raw = [0.95 ** j for j in range(D)]
    size = math.sqrt(sum(b * b for b in raw))
    beta = [b / size for b in raw]
    rng = random.Random(seed)
    risks = [0.0] * D
    for _ in range(trials):
        X = [[rng.gauss(0, 1) for _ in range(D)] for _ in range(n)]
        ys = [sum(a * b for a, b in zip(row, beta)) + rng.gauss(0, noise) for row in X]
        for p in range(1, D + 1):
            risks[p - 1] += excess_risk(fit_first_p(X, ys, p), beta) / trials
    return risks


def gd_least_squares(F, ys, rate, steps):
    """Gradient descent on the mean squared error, starting from w = 0."""
    n, p = len(F), len(F[0])
    w = [0.0] * p
    for _ in range(steps):
        r = [sum(a * b for a, b in zip(f, w)) - y for f, y in zip(F, ys)]
        w = [wk - rate * 2 / n * sum(r[i] * F[i][k] for i in range(n)) for k, wk in enumerate(w)]
    return w


def show_theory():
    """Each result of the learning-theory part, once."""
    print("training and test error of a degree-9 fit:", train_and_test(9, 20, 50))
    print("Chebyshev and Hoeffding bounds, n = 200, ε = 0.1:", chebyshev_tail(200, 0.1), hoeffding_tail(200, 0.1))
    print("samples for ε = 0.05 with 95% confidence:", samples_needed(0.05, 0.05))
    print("union-bound ε for a million models, n = 10,000:", finite_class_gap(10 ** 6, 10000, 0.05))
    print("labellings of 4 points by thresholds, intervals:", len(threshold_patterns([1, 2, 3, 4])), len(interval_patterns([1, 2, 3, 4])))
    print("labellings of a square's corners by half-planes:", len(halfplane_patterns([(0, 0), (1, 0), (1, 1), (0, 1)], 72)), "of", 2 ** 4)
    print("Sauer's bound for n = 4, d = 3:", sauer_bound(4, 3))
