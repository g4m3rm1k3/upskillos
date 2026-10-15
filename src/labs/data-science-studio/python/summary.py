"""Part 2 of Data Science Studio: summing a column up. The mean, the median and quantiles,
quickselect, the variance two ways and in one pass (Welford), outliers, group-by and pivot
tables. Plain Python with every sum written as a loop, so every line can be stepped through.
"""
import math


def total(values):
    """The values added one at a time, left to right. Python's own sum does something more
    careful with floats since version 3.12; this loop is what most languages do."""
    t = 0.0
    for x in values:
        t += x
    return t


def mean(values):
    """The sum divided by the count: the balance point of the values."""
    return total(values) / len(values)


def running_mean(values):
    """The mean after each value, updated without keeping a sum: m = m + (x - m) / k."""
    means, m = [], 0.0
    for k, x in enumerate(values, start=1):
        m += (x - m) / k
        means.append(m)
    return means


def squared_error(values, c):
    """How far c is from the values, as the sum of squared differences: the mean makes it smallest."""
    return total([(x - c) ** 2 for x in values])


def absolute_error(values, c):
    """The sum of the distances from c: the median makes it smallest."""
    return total([abs(x - c) for x in values])


def median(values):
    """The middle value once sorted; with an even count, the mean of the two middle ones."""
    s = sorted(values)
    middle = len(s) // 2
    if len(s) % 2 == 1:
        return s[middle]
    return (s[middle - 1] + s[middle]) / 2


def quantile(values, q):
    """The value q of the way through the sorted values (q from 0 to 1), with a straight line
    drawn between neighbours: the rule of PERCENTILE.INC in a spreadsheet, and of pandas."""
    s = sorted(values)
    position = q * (len(s) - 1)
    below = math.floor(position)
    above = min(below + 1, len(s) - 1)
    return s[below] + (position - below) * (s[above] - s[below])


def quickselect(values, k):
    """The k-th smallest value (k from 0) without sorting everything: split the values around a
    pivot, then carry on only in the part that holds position k. The pivot is the middle item of
    the current list, so every run takes the same steps."""
    items = list(values)
    while True:
        pivot = items[len(items) // 2]
        smaller = [x for x in items if x < pivot]
        equal = [x for x in items if x == pivot]
        if k < len(smaller):
            items = smaller
        elif k < len(smaller) + len(equal):
            return pivot
        else:
            k -= len(smaller) + len(equal)
            items = [x for x in items if x > pivot]


def variance(values, sample=True):
    """The mean squared distance from the mean. A sample divides by n - 1 instead of n, a fix
    named after Bessel: its own mean sits closer to its values than the true mean does."""
    m = mean(values)
    squares = total([(x - m) ** 2 for x in values])
    return squares / (len(values) - 1 if sample else len(values))


def std(values, sample=True):
    """The standard deviation: the square root of the variance, in the same units as the values."""
    return math.sqrt(variance(values, sample))


def shortcut_variance(values):
    """The textbook one-pass formula, (sum of squares - sum squared / n) / (n - 1). Exact on
    paper; but when the values are large and close together, two huge numbers are subtracted
    and only their rounding errors are left."""
    n, s, s2 = 0, 0.0, 0.0
    for x in values:
        n += 1
        s += x
        s2 += x * x
    return (s2 - s * s / n) / (n - 1)


def welford(values):
    """The mean and the sample variance in one pass, without the cancellation: keep the running
    mean and m2, the running sum of squared distances from it."""
    n, m, m2 = 0, 0.0, 0.0
    for x in values:
        n += 1
        delta = x - m
        m += delta / n
        m2 += delta * (x - m)
    return m, (m2 / (n - 1) if n > 1 else 0.0)


def z_scores(values):
    """How many standard deviations each value is from the mean."""
    m, s = mean(values), std(values)
    return [(x - m) / s for x in values]


def iqr_outliers(values, k=1.5):
    """The values outside the fences Q1 - k IQR and Q3 + k IQR, where IQR = Q3 - Q1: Tukey's
    rule, the one box plots use."""
    q1, q3 = quantile(values, 0.25), quantile(values, 0.75)
    low, high = q1 - k * (q3 - q1), q3 + k * (q3 - q1)
    return [x for x in values if x < low or x > high]


def mad(values):
    """The median absolute deviation: the median distance from the median. A few wild values
    barely move it."""
    m = median(values)
    return median([abs(x - m) for x in values])


def group_by(rows, key):
    """Split: a dictionary from each value of the key column to the list of its rows, in the
    order the values were first seen. Looking a key up in a dictionary takes about the same time
    however many keys it holds (hashing), so this is one pass over the rows."""
    groups = {}
    for row in rows:
        if row[key] not in groups:
            groups[row[key]] = []
        groups[row[key]].append(row)
    return groups


SUMMARIES = {"count": len, "sum": total, "mean": mean, "median": median, "min": min, "max": max}


def aggregate(groups, name, how):
    """Apply and combine: one number per group, summarising its values of column `name` with
    one of SUMMARIES."""
    summary = SUMMARIES[how]
    return {k: summary([row[name] for row in rows]) for k, rows in groups.items()}


def pivot(rows, row_key, col_key, name):
    """The total of column `name` for every pair of a row_key value and a col_key value: a
    dictionary of dictionaries, both in sorted order, with 0 where no row has the pair."""
    row_values = sorted({row[row_key] for row in rows})
    col_values = sorted({row[col_key] for row in rows})
    table = {r: {c: 0.0 for c in col_values} for r in row_values}
    for row in rows:
        table[row[row_key]][row[col_key]] += row[name]
    return table
