"""Part 5 of Data Science Studio: looking for patterns between two columns. Covariance and
correlation (and correlation as the cosine of an angle), ranks and Spearman's correlation, the line
that follows from the correlation, jitter for crowded charts, a matrix of correlations, rates within
groups, where the paradox named after Simpson lives, and the simulations that show why correlation
is not causation. Plain Python, every sum a loop.
"""
import math

from data import Rng, noise
from summary import mean, std, total


def covariance(xs, ys):
    """How two columns move together: the mean product of their distances from their own means,
    divided by n - 1 like the sample variance. Positive when big goes with big, negative when big
    goes with small."""
    mx, my = mean(xs), mean(ys)
    products = total([(x - mx) * (y - my) for x, y in zip(xs, ys)])
    return products / (len(xs) - 1)


def correlation(xs, ys):
    """Pearson's correlation r: the covariance divided by both standard deviations, so the units
    cancel and r runs from -1 to 1."""
    return covariance(xs, ys) / (std(xs) * std(ys))


def centred(values):
    """The values minus their mean: the same column moved so that it averages 0."""
    m = mean(values)
    return [x - m for x in values]


def cosine(a, b):
    """The cosine of the angle between two lists read as arrows: their dot product over the
    product of their lengths."""
    dot = total([x * y for x, y in zip(a, b)])
    return dot / (math.sqrt(total([x * x for x in a])) * math.sqrt(total([y * y for y in b])))


def rank(values):
    """Each value's place in sorted order, from 1. Tied values share the mean of the places they
    take up: the two smallest of [5, 1, 1] take places 1 and 2, so both get 1.5. RANK.AVG does the
    same with order 1."""
    order = sorted(range(len(values)), key=lambda k: values[k])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        shared = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = shared
        i = j + 1
    return ranks


def spearman(xs, ys):
    """Spearman's correlation: Pearson's correlation of the ranks. It measures whether y rises
    whenever x rises, by any amount, and one far-off value can move it only one place."""
    return correlation(rank(xs), rank(ys))


def fit_line(xs, ys):
    """The line through the cloud that predicts y from x best in squared error: slope r times
    sd(y) over sd(x), through the point of the two means. Returns [slope, intercept]."""
    slope = correlation(xs, ys) * std(ys) / std(xs)
    return [slope, mean(ys) - slope * mean(xs)]


def residuals(xs, ys):
    """What the line leaves over: each y minus the line's prediction for its x."""
    slope, intercept = fit_line(xs, ys)
    return [y - (intercept + slope * x) for x, y in zip(xs, ys)]


# The quartet Anscombe published in 1973: four sets of eleven points, the first three sharing their x values.
ANSCOMBE = {
    "I": [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
          [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]],
    "II": [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
           [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
    "III": [[10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
            [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]],
    "IV": [[8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8],
           [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]],
}


def describe_pair(xs, ys):
    """The usual summary of two columns: both means, both sample variances, the correlation, and
    the line's slope and intercept."""
    slope, intercept = fit_line(xs, ys)
    return [mean(xs), mean(ys), std(xs) ** 2, std(ys) ** 2, correlation(xs, ys), slope, intercept]


def growth_per_unit(xs, ys):
    """For y that is multiplied by the same factor for each step of x: the line through x and
    log y has slope b, and each step multiplies y by e to the b. Returned as the change, e**b - 1:
    0.05 means 5% more for each step."""
    slope, _ = fit_line(xs, [math.log(y) for y in ys])
    return math.exp(slope) - 1


def jitter(values, amount, seed):
    """Each value moved by a random amount from -amount to +amount, so points that land on the
    same spot spread out. Seeded, so the same chart is drawn every time."""
    rng = Rng(seed)
    return [x + amount * (2 * rng.random() - 1) for x in values]


def correlation_matrix(columns):
    """The correlation of every column with every other: a square table, 1 on the diagonal and the
    same on either side of it. columns is a list of lists of numbers."""
    return [[correlation(a, b) for b in columns] for a in columns]


def rate_by(rows, key, column, yes):
    """For each value of key: how many rows have column equal to yes, and how many rows there are,
    as [hits, rows]. A rate is hits / rows; kept as two counts so groups can be added up again."""
    counts = {}
    for row in rows:
        hits, n = counts.get(row[key], [0, 0])
        counts[row[key]] = [hits + (1 if row[column] == yes else 0), n + 1]
    return counts


def simulate(kind, n, seed):
    """n rows of [x, y, z] in which x does not cause y, made three ways:
    - "confounder": z causes both x and y, so x and y move together;
    - "collider": x and y are unrelated and both cause z;
    - "independent": nothing is related to anything."""
    rng = Rng(seed)
    rows = []
    for _ in range(n):
        if kind == "confounder":
            z = noise(rng)
            x, y = z + noise(rng), z + noise(rng)
        elif kind == "collider":
            x, y = noise(rng), noise(rng)
            z = x + y + 0.5 * noise(rng)
        else:
            x, y, z = noise(rng), noise(rng), noise(rng)
        rows.append([x, y, z])
    return rows


def partial_correlation(xs, ys, zs):
    """The correlation of x and y with z held fixed: take out of each what a line in z predicts,
    then correlate what is left."""
    return correlation(residuals(zs, xs), residuals(zs, ys))
