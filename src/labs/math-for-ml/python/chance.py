"""More probability and statistics, each as a short program: inclusion–exclusion, independence,
the common distributions and how to sample them, joint and marginal tables, sums of random
variables, the law of large numbers, the central limit theorem, the multivariate normal, change of
variables, Monte Carlo and importance sampling, Jensen's gap, information in bits, Markov chains,
the bootstrap, permutation tests, and Beta–binomial updating."""
import math
import random
from fractions import Fraction
from itertools import combinations


def prob(event, outcomes):
    """P(event) by counting equally likely outcomes, as an exact fraction."""
    return Fraction(sum(1 for o in outcomes if event(o)), len(outcomes))


def inclusion_exclusion(events, outcomes):
    """P(at least one event) = Σ P(singles) − Σ P(pairs) + Σ P(triples) − …"""
    total = Fraction(0)
    for size in range(1, len(events) + 1):
        sign = 1 if size % 2 else -1
        for group in combinations(events, size):
            total += sign * prob(lambda o: all(e(o) for e in group), outcomes)
    return total


def independent(A, B, outcomes):
    """A and B are independent when P(A and B) = P(A) P(B)."""
    return prob(lambda o: A(o) and B(o), outcomes) == prob(A, outcomes) * prob(B, outcomes)


def poisson_pmf(k, lam):
    """P(k events) when they happen independently at an average rate lam: e^(−λ) λᵏ / k!."""
    return math.exp(-lam) * lam ** k / math.factorial(k)


def exponential_pdf(x, rate):
    """The waiting time between Poisson events: rate · e^(−rate x) for x ≥ 0."""
    return rate * math.exp(-rate * x) if x >= 0 else 0.0


def sample_exponential(rate, rng):
    """Inverse-transform sampling: if U is uniform on (0, 1], then −ln(U)/rate is exponential."""
    u = 1.0 - rng.random()
    return -math.log(u) / rate


def sample_categorical(ps, rng):
    """Pick index i with probability ps[i]: walk along the cumulative sums until passing a uniform draw."""
    u = rng.random()
    total = 0.0
    for i, p in enumerate(ps):
        total += p
        if u < total:
            return i
    return len(ps) - 1


def marginal(joint, axis):
    """Sum a joint table {(x, y): p} over the other variable: p(x) = Σ_y p(x, y)."""
    out = {}
    for xy, p in joint.items():
        out[xy[axis]] = out.get(xy[axis], 0) + p
    return out


def conditional_given_y(joint, y):
    """p(x | y) = p(x, y) / p(y): the slice at y, rescaled to add up to 1."""
    py = sum(p for (a, b), p in joint.items() if b == y)
    return {a: p / py for (a, b), p in joint.items() if b == y}


def mean(xs):
    """The average."""
    return sum(xs) / len(xs)


def variance(xs):
    """The average squared distance from the mean (dividing by n)."""
    m = mean(xs)
    return sum((x - m) ** 2 for x in xs) / len(xs)


def covariance(xs, ys):
    """The average product of deviations from the means."""
    mx, my = mean(xs), mean(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / len(xs)


def chebyshev_bound(sigma, n, eps):
    """P(|average of n − μ| ≥ ε) ≤ σ² / (n ε²): Chebyshev's inequality for an average."""
    return sigma * sigma / (n * eps * eps)


def running_means(n, seed=0):
    """The average of the first 1, 2, …, n die rolls."""
    rng = random.Random(seed)
    total = 0
    out = []
    for i in range(1, n + 1):
        total += rng.randint(1, 6)
        out.append(total / i)
    return out


def standardized_sums(n, trials, seed=0):
    """Sums of n uniform(0, 1) draws, shifted and scaled to mean 0 and variance 1: the central limit theorem's raw material."""
    rng = random.Random(seed)
    mu, sd = n / 2, math.sqrt(n / 12)
    return [(sum(rng.random() for _ in range(n)) - mu) / sd for _ in range(trials)]


def mvn_pdf(x, mu, S):
    """The two-dimensional normal density: exp(−½ (x − μ)ᵀ S⁻¹ (x − μ)) / (2π √det S)."""
    det = S[0][0] * S[1][1] - S[0][1] * S[1][0]
    inv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]]
    d = [x[0] - mu[0], x[1] - mu[1]]
    q = d[0] * (inv[0][0] * d[0] + inv[0][1] * d[1]) + d[1] * (inv[1][0] * d[0] + inv[1][1] * d[1])
    return math.exp(-q / 2) / (2 * math.pi * math.sqrt(det))


def transformed_density(p, g_inverse, g_inverse_slope, y):
    """If Y = g(X), its density is p(g⁻¹(y)) |d g⁻¹/dy|: the old density, times how much g squeezes or stretches."""
    return p(g_inverse(y)) * abs(g_inverse_slope(y))


def monte_carlo(f, sampler, n, seed=0):
    """E[f(X)] ≈ the average of f over n samples of X."""
    rng = random.Random(seed)
    return sum(f(sampler(rng)) for _ in range(n)) / n


def importance(f, p, q, q_sampler, n, seed=0):
    """E_p[f(X)] estimated with samples from q, each weighted by p(x)/q(x)."""
    rng = random.Random(seed)
    total = 0.0
    for _ in range(n):
        x = q_sampler(rng)
        total += f(x) * p(x) / q(x)
    return total / n


def jensen_gap(f, xs):
    """E[f(X)] − f(E[X]) over a list of equally likely values: never negative when f curves upward."""
    return mean([f(x) for x in xs]) - f(mean(xs))


def entropy_bits(ps):
    """H = −Σ p log₂ p: the average number of yes/no questions needed to pin down the outcome."""
    return -sum(p * math.log2(p) for p in ps if p > 0)


def mutual_information(joint):
    """I(X; Y) = Σ p(x, y) log₂ [p(x, y) / (p(x) p(y))]: how many bits knowing one tells you about the other."""
    px, py = marginal(joint, 0), marginal(joint, 1)
    return sum(p * math.log2(p / (px[x] * py[y])) for (x, y), p in joint.items() if p > 0)


def markov_step(P, dist):
    """One step of a Markov chain: the new probability of each state, π′ⱼ = Σᵢ πᵢ Pᵢⱼ."""
    return [sum(dist[i] * P[i][j] for i in range(len(dist))) for j in range(len(dist))]


def stationary(P, steps=200):
    """Run the chain's distribution forward from uniform until it stops changing: the stationary distribution."""
    dist = [1.0 / len(P)] * len(P)
    for _ in range(steps):
        dist = markov_step(P, dist)
    return dist


def bootstrap_interval(xs, stat, B=2000, seed=0):
    """A 95% interval for a statistic: recompute it on B resamples (with replacement) and take the middle 95%."""
    rng = random.Random(seed)
    values = sorted(stat([rng.choice(xs) for _ in xs]) for _ in range(B))
    return values[int(0.025 * B)], values[int(0.975 * B) - 1]


def permutation_p_value(a, b, trials=5000, seed=0):
    """How often shuffling the labels gives a difference in means at least as large as the real one."""
    rng = random.Random(seed)
    observed = abs(mean(a) - mean(b))
    pooled = list(a) + list(b)
    hits = 0
    for _ in range(trials):
        rng.shuffle(pooled)
        if abs(mean(pooled[:len(a)]) - mean(pooled[len(a):])) >= observed:
            hits += 1
    return hits / trials


def beta_binomial(a, b, heads, tails):
    """A Beta(a, b) prior on a coin's p, updated by the flips: the posterior is Beta(a + heads, b + tails)."""
    a2, b2 = a + heads, b + tails
    return a2, b2, (a2 - 1) / (a2 + b2 - 2), a2 / (a2 + b2)


def show_chance():
    """Each tool of the probability additions, once."""
    dice = [(x, y) for x in range(1, 7) for y in range(1, 7)]
    print("P(a six on either die), by inclusion–exclusion:", inclusion_exclusion([lambda o: o[0] == 6, lambda o: o[1] == 6], dice))
    print("first die even, total 7: independent?", independent(lambda o: o[0] % 2 == 0, lambda o: o[0] + o[1] == 7, dice))
    print("Poisson(3): P(0), P(3) =", poisson_pmf(0, 3.0), poisson_pmf(3, 3.0))
    print("Chebyshev bound for 100 dice, ε = 0.5:", chebyshev_bound(math.sqrt(35 / 12), 100, 0.5))
    print("stationary distribution:", stationary([[0.9, 0.1], [0.5, 0.5]]))
    print("entropy of a fair coin and a fair die, in bits:", entropy_bits([0.5, 0.5]), entropy_bits([1 / 6] * 6))
    print("Beta(1, 1) after 7 heads, 3 tails (a, b, MAP, mean):", beta_binomial(1, 1, 7, 3))
