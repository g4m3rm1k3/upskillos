"""Chance and data: probability by counting, expectation, variance, Bayes, the bell curve, likelihood, covariance and PCA."""
import math
import random
from linalg import eigen2, eigenvector2
from symbols import mean


def two_dice():
    """Every outcome of rolling two dice, all 36 equally likely, as the totals they give."""
    totals = []
    for a in range(1, 7):
        for b in range(1, 7):
            totals.append(a + b)
    return totals


def probability(event, outcomes):
    """P(event) when every outcome is equally likely: the outcomes where it happens, over all of them."""
    hits = 0
    for o in outcomes:
        if event(o):
            hits += 1
    return hits / len(outcomes)


def distribution(outcomes):
    """p(x) for every value x: how often each value turns up, as a fraction."""
    p = {}
    for o in outcomes:
        p[o] = p.get(o, 0) + 1 / len(outcomes)
    return p


def expectation(p):
    """E[X] = Σ x p(x): every value weighted by its chance."""
    total = 0.0
    for x, px in p.items():
        total += x * px
    return total


def variance(p):
    """Var(X) = E[(X − μ)²]: the expected squared distance from the mean."""
    mu = expectation(p)
    total = 0.0
    for x, px in p.items():
        total += (x - mu) ** 2 * px
    return total


def bayes(prior, hit_rate, false_alarm):
    """P(ill | positive) = P(positive | ill) P(ill) / P(positive), with P(positive) added up over both cases."""
    positive = hit_rate * prior + false_alarm * (1 - prior)
    return hit_rate * prior / positive


def normal_pdf(x, mu=0.0, sigma=1.0):
    """The bell curve: 1/(σ√(2π)) e^(−(x − μ)²/(2σ²))."""
    z = (x - mu) / sigma
    return math.exp(-z * z / 2) / (sigma * math.sqrt(2 * math.pi))


def sample_means(n, trials=200, seed=0):
    """The average of n dice, worked out `trials` times: how much does an average wobble?"""
    rng = random.Random(seed)
    means = []
    for _ in range(trials):
        rolls = [rng.randint(1, 6) for _ in range(n)]
        means.append(mean(rolls))
    return means


def likelihood(p, flips):
    """L(p) = Π p^(heads) (1 − p)^(tails): the chance of these exact flips if the coin lands heads with chance p."""
    L = 1.0
    for f in flips:
        L *= p if f == 1 else 1 - p
    return L


def log_likelihood(p, flips):
    """log L(p) = Σ log of each flip's chance: the same peak, as a sum instead of a product."""
    total = 0.0
    for f in flips:
        total += math.log(p if f == 1 else 1 - p)
    return total


def covariance(xs, ys):
    """Cov(X, Y) = average of (x − x̄)(y − ȳ): positive when x and y rise together."""
    mx, my = mean(xs), mean(ys)
    total = 0.0
    for x, y in zip(xs, ys):
        total += (x - mx) * (y - my)
    return total / len(xs)


def correlation(xs, ys):
    """ρ = Cov(X, Y) / (σ_x σ_y): covariance with the units taken out, from −1 to 1."""
    return covariance(xs, ys) / math.sqrt(covariance(xs, xs) * covariance(ys, ys))


def pca2(xs, ys):
    """The direction the points spread out most: the eigenvector of the covariance matrix with the bigger eigenvalue."""
    C = [[covariance(xs, xs), covariance(xs, ys)], [covariance(xs, ys), covariance(ys, ys)]]
    big, small = eigen2(C)
    return eigenvector2(C, big), big, small


def show_stats():
    """Part 4's quantities on small examples."""
    p = distribution(two_dice())
    print("P(total = 7):", probability(lambda t: t == 7, two_dice()), " E[X]:", expectation(p), " Var:", variance(p))
    print("P(ill | positive):", bayes(0.01, 0.9, 0.05))
    flips = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1]
    print("likelihood at 0.5 and 0.7:", likelihood(0.5, flips), likelihood(0.7, flips))
    print("first principal direction:", pca2([1, 2, 3, 4, 5], [2, 3, 5, 4, 6]))
