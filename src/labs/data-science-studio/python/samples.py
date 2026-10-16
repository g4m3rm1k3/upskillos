"""Part 6 of Data Science Studio: samples and uncertainty. Drawing samples (with and without
replacement, from a stream, within groups), the binomial and Poisson distributions, the standard
error, the bell curve, confidence intervals and how often they are right, and the bootstrap. Every
random choice comes from the generator of data.py, with one generator for all the repeats of an
experiment, so the page and Python draw exactly the same samples.
"""
import math

from data import MONTH_DAYS, Rng
from summary import group_by, mean, median, quantile, std, total


def sample_without(values, k, seed):
    """k of the values chosen at random, none twice: the first k steps of a shuffle. Step i swaps
    place i with a random place from i to the end, so each value is equally likely to land in each
    of the first k places, whatever came before."""
    rng = Rng(seed)
    items = list(values)
    for i in range(k):
        j = i + rng.below(len(items) - i)
        items[i], items[j] = items[j], items[i]
    return items[:k]


def sample_with(values, k, seed):
    """k values chosen at random, each time from all of them: the same value can come up twice."""
    rng = Rng(seed)
    return [values[rng.below(len(values))] for _ in range(k)]


def comb(n, k):
    """How many ways there are to choose k things from n. Multiplying (n - k + i) / i for i from 1
    to k keeps a whole number after every step: after step i it is the count for choosing i from
    n - k + i."""
    result = 1
    for i in range(1, k + 1):
        result = result * (n - k + i) // i
    return result


def binomial_pmf(k, n, p):
    """The chance of exactly k successes in n independent tries, each a success with chance p:
    the number of ways to place the k successes, times the chance of any one such way."""
    return comb(n, k) * p ** k * (1 - p) ** (n - k)


def poisson_pmf(k, lam):
    """The chance of exactly k events when they happen at random at lam per period on average:
    e to the -lam, then multiplied by lam / i for i from 1 to k, which builds lam**k / k!."""
    p = math.exp(-lam)
    for i in range(1, k + 1):
        p *= lam / i
    return p


def day_of_year(date):
    """Day 0 to 364 of 2025 from a date written YYYY-MM-DD: the days of the months before, plus
    the day of the month."""
    month, day = int(date[5:7]), int(date[8:10])
    return sum(MONTH_DAYS[:month - 1]) + day - 1


def tally(counts):
    """How many times each count occurs: tally[c] is the number of entries equal to c."""
    out = [0] * (max(counts) + 1)
    for c in counts:
        out[c] += 1
    return out


def orders_per_day(dates):
    """The number of orders on each of the 365 days, from their dates."""
    counts = [0] * 365
    for date in dates:
        counts[day_of_year(date)] += 1
    return counts


def sample_means(values, n, repeats, seed):
    """The mean of each of `repeats` samples of n values, drawn with replacement, one generator for
    all of them: the sampling distribution of the mean, drawn by experiment."""
    rng = Rng(seed)
    means = []
    for _ in range(repeats):
        t = 0.0
        for _ in range(n):
            t += values[rng.below(len(values))]
        means.append(t / n)
    return means


def standard_error(values):
    """How far the mean of a sample like this one typically is from the mean of everything it was
    drawn from: the standard deviation over the square root of n."""
    return std(values) / math.sqrt(len(values))


def normal_pdf(x, mu, sigma):
    """The height of the bell curve with mean mu and standard deviation sigma at x."""
    u = (x - mu) / sigma
    return math.exp(-u * u / 2) / (sigma * math.sqrt(2 * math.pi))


def skewness(values):
    """How lopsided the values are: the mean cubed z-score, with the small-sample factor that SKEW
    in a spreadsheet uses. 0 for a symmetric spread, positive with a long tail to the right."""
    n, m, s = len(values), mean(values), std(values)
    cubes = total([((x - m) / s) ** 3 for x in values])
    return n / ((n - 1) * (n - 2)) * cubes


def heavy_tailed(n, seed):
    """n values 1 / u, with u uniform between 0 and 1: half of them are below 2, but one in a
    million is above a million. Their mean is infinite, so the mean of a sample never settles. The
    generator gives 0 up to just below 1, so u is taken as 1 minus a draw, which is never 0."""
    rng = Rng(seed)
    return [1 / (1 - rng.random()) for _ in range(n)]


def mean_interval(values, z=1.96):
    """A confidence interval for the mean of everything the values were drawn from: the sample's
    mean, give or take z standard errors."""
    m, se = mean(values), standard_error(values)
    return [m - z * se, m + z * se]


def coverage(values, n, repeats, seed, z=1.96):
    """How often the interval works: draw `repeats` samples of n from the values (with
    replacement), and count the share of their intervals that hold the mean of all the values."""
    rng = Rng(seed)
    truth = mean(values)
    hits = 0
    for _ in range(repeats):
        sample = [values[rng.below(len(values))] for _ in range(n)]
        low, high = mean_interval(sample, z)
        if low <= truth <= high:
            hits += 1
    return hits / repeats


STATS = {"mean": mean, "median": median}


def bootstrap(values, stat, repeats, seed):
    """The statistic (a name from STATS) of `repeats` resamples, each as big as values and drawn from
    them with replacement: how much the statistic would vary from sample to sample, found by using
    the sample as a stand-in for everything."""
    rng = Rng(seed)
    summary = STATS[stat]
    out = []
    for _ in range(repeats):
        out.append(summary([values[rng.below(len(values))] for _ in range(len(values))]))
    return out


def percentile_interval(stats, level=0.95):
    """The middle `level` of the bootstrapped statistics: from their quantile (1 - level) / 2 to
    their quantile (1 + level) / 2."""
    return [quantile(stats, (1 - level) / 2), quantile(stats, (1 + level) / 2)]


def bootstrap_difference(a, b, repeats, seed):
    """The difference of two means, mean(a) - mean(b), over `repeats` resamples of each group,
    each group resampled from itself."""
    rng = Rng(seed)
    out = []
    for _ in range(repeats):
        ra = [a[rng.below(len(a))] for _ in range(len(a))]
        rb = [b[rng.below(len(b))] for _ in range(len(b))]
        out.append(mean(ra) - mean(rb))
    return out


def reservoir(stream, k, seed):
    """k items chosen evenly from a stream that is read once and whose length is not known: keep the
    first k; after that, item number i (counting from 1) takes the place of a random kept item with
    chance k / i."""
    rng = Rng(seed)
    kept = []
    for i, item in enumerate(stream, start=1):
        if i <= k:
            kept.append(item)
        else:
            j = rng.below(i)
            if j < k:
                kept[j] = item
    return kept


def stratified_sample(rows, key, k, seed):
    """About k rows, drawn within each group of key in proportion to its size (rounded, halves up),
    one generator for all: every group appears in the sample as it does in the table."""
    rng = Rng(seed)
    out = []
    for members in group_by(rows, key).values():
        take = math.floor(k * len(members) / len(rows) + 0.5)
        items = list(members)
        for i in range(take):
            j = i + rng.below(len(items) - i)
            items[i], items[j] = items[j], items[i]
        out.extend(items[:take])
    return out
