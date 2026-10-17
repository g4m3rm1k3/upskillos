"""Part 7 of Data Science Studio: is the difference real? The permutation test, then tests from a
formula: the normal, the t and the chi-squared distributions, each p-value an area worked out by
hand with the rule named after Simpson. Then what the errors cost: power, the sample size, many
tests at once, and peeking. Every random draw comes from the generator of data.py.
"""
import math

from data import Rng, noise
from summary import mean, total, variance


def permutation_diffs(a, b, repeats, seed):
    """What the difference of means looks like when the labels mean nothing (the null hypothesis):
    pool the values, and after each of `repeats` shuffles take the mean of the first len(a) minus
    the mean of the rest. Only the first len(a) places need shuffling, as in sample_without, and
    one generator makes every shuffle."""
    rng = Rng(seed)
    pooled = list(a) + list(b)
    k = len(a)
    out = []
    for _ in range(repeats):
        for i in range(k):
            j = i + rng.below(len(pooled) - i)
            pooled[i], pooled[j] = pooled[j], pooled[i]
        out.append(mean(pooled[:k]) - mean(pooled[k:]))
    return out


def permutation_p(diffs, observed):
    """The two-sided p-value: the share of shuffled differences at least as far from 0 as the one
    observed, counting the observed split as one of the shuffles, so it is never 0. A difference
    equal to the observed one counts, though its float may differ in the last digit: hence 1e-12."""
    hits = 1
    for d in diffs:
        if abs(d) >= abs(observed) - 1e-12:
            hits += 1
    return hits / (len(diffs) + 1)


def simpson(f, a, b, n=1000):
    """The area under f from a to b by the rule named after Simpson: n strips (n even), each pair
    of strips under a parabola through three points, so the heights are weighted 1, 4, 2, 4, ...,
    2, 4, 1, times h / 3."""
    h = (b - a) / n
    s = f(a) + f(b)
    for k in range(1, n):
        s += (4 if k % 2 else 2) * f(a + k * h)
    return s * h / 3


def normal_cdf(z):
    """The chance that a standard normal value is below z: one half, plus or minus the area under
    the bell curve between 0 and z."""
    half = simpson(lambda u: math.exp(-u * u / 2), 0, abs(z)) / math.sqrt(2 * math.pi)
    return 0.5 + half if z >= 0 else 0.5 - half


def normal_quantile(p):
    """The z with normal_cdf(z) = p, found by halving: start from -10 to 10 and keep the half that
    holds the answer, 60 times, until the interval is about 2e-17 wide."""
    lo, hi = -10.0, 10.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def two_proportion_z(hits_a, n_a, hits_b, n_b):
    """The z statistic for the rate of B minus the rate of A: the difference over its standard error
    if the null is true, so that both groups share one rate, the pooled rate. 0 when every visitor
    did the same, since then nothing tells the groups apart."""
    pooled = (hits_a + hits_b) / (n_a + n_b)
    se = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))
    if se == 0:
        return 0.0
    return (hits_b / n_b - hits_a / n_a) / se


def z_p_value(z):
    """The two-sided p-value of a z statistic: the normal area beyond it, on both sides."""
    return 2 * (1 - normal_cdf(abs(z)))


def simulated_pvalues(n, rate_a, rate_b, repeats, seed):
    """The p-values of `repeats` simulated tests: n visitors on each page, each clicking with chance
    rate_a on A and rate_b on B. With equal rates the null is true every time."""
    rng = Rng(seed)
    out = []
    for _ in range(repeats):
        a = b = 0
        for _ in range(n):
            if rng.random() < rate_a:
                a += 1
        for _ in range(n):
            if rng.random() < rate_b:
                b += 1
        out.append(z_p_value(two_proportion_z(a, n, b, n)))
    return out


def welch_t(a, b):
    """The t statistic named after Welch for mean(a) - mean(b), and its degrees of freedom: the
    difference over its standard error, with each group keeping its own variance."""
    va, vb = variance(a) / len(a), variance(b) / len(b)
    t = (mean(a) - mean(b)) / math.sqrt(va + vb)
    df = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))
    return [t, df]


def t_two_sided(t, df):
    """The chance that a t value with df degrees of freedom is at least as far from 0 as t. Put
    t = sqrt(df) tan u: the area under the t curve from 0 to t becomes the area under cos u to the
    power df - 1 from 0 to atan(t / sqrt(df)), and the whole half curve becomes its area to pi / 2."""
    top = math.atan(abs(t) / math.sqrt(df))
    curve = lambda u: math.cos(u) ** (df - 1)
    return 1 - simpson(curve, 0, top, 2000) / simpson(curve, 0, math.pi / 2, 2000)


def t_critical(df, level=0.95):
    """The t value that leaves 1 - level in the two tails together, found by halving between 0 and
    1000: the number of standard errors on each side of a t interval."""
    lo, hi = 0.0, 1000.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if t_two_sided(mid, df) > 1 - level:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def cohens_d(a, b):
    """The difference of means in units of the spread within the groups, the pooled standard
    deviation: an effect size, which does not grow with the sample as a t statistic does."""
    na, nb = len(a), len(b)
    pooled = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2)
    return (mean(a) - mean(b)) / math.sqrt(pooled)


def simulated_power(n, rate_a, rate_b, repeats, seed, alpha=0.05):
    """How often a test with n visitors per page finds a difference that is really there: the share
    of simulated tests with a p-value below alpha."""
    pvalues = simulated_pvalues(n, rate_a, rate_b, repeats, seed)
    return len([p for p in pvalues if p < alpha]) / repeats


def sample_size(rate_a, rate_b, alpha=0.05, power=0.8):
    """Visitors needed on each page to find a true difference between the rates rate_a and rate_b
    with the given power, in a two-sided test at level alpha."""
    za, zb = normal_quantile(1 - alpha / 2), normal_quantile(power)
    spread = rate_a * (1 - rate_a) + rate_b * (1 - rate_b)
    return (za + zb) ** 2 * spread / (rate_b - rate_a) ** 2


def chi_squared(table):
    """The chi-squared statistic of a table of counts, and its degrees of freedom. A cell would
    expect its row total times its column total over the grand total if rows and columns had
    nothing to do with each other; each cell adds (observed - expected) squared over expected."""
    rows = [total(row) for row in table]
    cols = [total([row[j] for row in table]) for j in range(len(table[0]))]
    grand = total(rows)
    stat = 0.0
    for i in range(len(table)):
        for j in range(len(table[0])):
            expected = rows[i] * cols[j] / grand
            stat += (table[i][j] - expected) ** 2 / expected
    return [stat, (len(table) - 1) * (len(table[0]) - 1)]


def chi2_tail(x, df):
    """The chance that a chi-squared value with df degrees of freedom is above x. Two degrees of
    freedom have the tail e to the -x/2; one has the normal tail on both sides of sqrt(x). Each two
    more add a term, and each term is the one before times (x / 2) / (k / 2 + 1)."""
    if df % 2 == 0:
        q, term, k = 0.0, math.exp(-x / 2), 0
    else:
        q = 2 * (1 - normal_cdf(math.sqrt(x)))
        term, k = math.sqrt(x / 2) * math.exp(-x / 2) / (math.sqrt(math.pi) / 2), 1
    while k < df:
        q += term
        term *= (x / 2) / (k / 2 + 1)
        k += 2
    return q


def dispersion(counts):
    """Counts that are Poisson have their variance equal to their mean. The dispersion statistic
    adds (count - mean) squared over the mean; with n counts it is about chi-squared with n - 1
    degrees of freedom. Returns [statistic, degrees of freedom]."""
    m = mean(counts)
    return [total([(c - m) ** 2 for c in counts]) / m, len(counts) - 1]


def bonferroni(pvalues, alpha=0.05):
    """Which of m tests to call significant: each p-value against alpha / m, so that the chance of
    even one false alarm among them stays below alpha."""
    m = len(pvalues)
    return [p <= alpha / m for p in pvalues]


def benjamini_hochberg(pvalues, q=0.05):
    """Which tests to call discoveries, keeping the expected share of false ones among them below
    q: put the p-values in order, find the largest rank k whose p-value is at most q k / m, and call
    the k smallest discoveries."""
    m = len(pvalues)
    order = sorted(range(m), key=lambda i: pvalues[i])
    cutoff = 0
    for rank, i in enumerate(order, start=1):
        if pvalues[i] <= q * rank / m:
            cutoff = rank
    found = [False] * m
    for i in order[:cutoff]:
        found[i] = True
    return found


def many_tests(m, real, n, effect, seed):
    """The p-values of m tests of two groups of n noisy values each (the noise of data.py, sd 1);
    in the first `real` tests the second group is shifted by `effect`, in the rest nothing differs.
    Each test is the t test named after Welch."""
    rng = Rng(seed)
    out = []
    for i in range(m):
        a = [noise(rng) for _ in range(n)]
        b = [noise(rng) + (effect if i < real else 0) for _ in range(n)]
        t, df = welch_t(a, b)
        out.append(t_two_sided(t, df))
    return out


def aa_peeking(visitors, rate, repeats, seed):
    """How often a test with no real difference looks significant if you check every day: `repeats`
    A/A tests over days with the given numbers of visitors, each sent to A or B by a coin flip and
    clicking with chance rate on either. Returns [the share that showed |z| > 1.96 on some day, the
    share that showed it on the last day]."""
    rng = Rng(seed)
    ever = last = 0
    for _ in range(repeats):
        n, hits = [0, 0], [0, 0]
        crossed = False
        for today in visitors:
            for _ in range(today):
                page = rng.below(2)
                n[page] += 1
                if rng.random() < rate:
                    hits[page] += 1
            z = two_proportion_z(hits[0], n[0], hits[1], n[1])
            if abs(z) > 1.96:
                crossed = True
        if crossed:
            ever += 1
        if abs(z) > 1.96:
            last += 1
    return [ever / repeats, last / repeats]


def split_check(n_a, n_b):
    """Did the coin flip split the visitors fairly? The two-sided p-value of so uneven a split if
    each visitor had chance one half: the count on A is about normal, mean n / 2, sd sqrt(n) / 2."""
    n = n_a + n_b
    return z_p_value((n_a - n / 2) / (math.sqrt(n) / 2))


def lift_interval(hits_a, n_a, hits_b, n_b, z=1.96):
    """A confidence interval for the rate of B minus the rate of A: the difference, give or take z
    standard errors, each group with its own rate (no null is assumed here)."""
    pa, pb = hits_a / n_a, hits_b / n_b
    se = math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)
    return [pb - pa - z * se, pb - pa + z * se]
