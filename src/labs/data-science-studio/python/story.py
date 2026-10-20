"""Part 12 of Data Science Studio: telling the story. Intervals for groups, drawn as error bars;
bands around a forecast from its own past errors, and how often they hold; absolute against
relative change; the counts behind a dashboard whose views filter each other; and a fingerprint
that says whether two people analysed the same data. Plain Python.
"""
import math

from ml_data import fnv1a
from summary import mean, quantile, std


def group_intervals(keys, values, z=1.96):
    """For each group (keys sorted): [key, n, mean, low, high], the interval being the mean plus or
    minus z standard errors, std / sqrt(n) (lesson 6.7)."""
    groups = {}
    for k, v in zip(keys, values):
        groups.setdefault(k, []).append(v)
    out = []
    for k in sorted(groups):
        g = groups[k]
        m, se = mean(g), std(g) / math.sqrt(len(g))
        out.append([k, len(g), m, m - z * se, m + z * se])
    return out


def error_band(errors, level):
    """The band that held a share level of past forecast errors: the quantiles (1 - level) / 2 and
    (1 + level) / 2 of the errors (actual minus forecast), by the rule of lesson 2.4."""
    return [quantile(errors, (1 - level) / 2), quantile(errors, (1 + level) / 2)]


def coverage(actuals, forecasts, band):
    """The share of actual values inside forecast + band: how often the band held."""
    lo, hi = band
    inside = 0
    for y, f in zip(actuals, forecasts):
        if f + lo <= y <= f + hi:
            inside += 1
    return inside / len(actuals)


def risk_summary(hits_a, n_a, hits_b, n_b):
    """The same change told four ways: the two rates, the absolute difference (in points), the
    relative change (as a share of the first rate), and how many people it takes for one more hit:
    1 over the absolute difference. Returns [rate_a, rate_b, difference, relative, per_extra]."""
    a, b = hits_a / n_a, hits_b / n_b
    diff = b - a
    return [a, b, diff, diff / a, 1 / diff if diff else None]


def passes(row, filters, skip=None):
    """Whether a row passes every filter but the one named skip. A filter is a column and either
    [low, high] for a number or a list of allowed values."""
    for column, rule in filters.items():
        if column == skip:
            continue
        value = row[column]
        if isinstance(rule, dict):
            if not rule["low"] <= value <= rule["high"]:
                return False
        elif value not in rule:
            return False
    return True


def linked_counts(rows, filters, key):
    """What one view of a dashboard shows: the count of each value of key among the rows that pass
    the other views' filters, not its own, so a view never filters itself away. Keys sorted."""
    counts = {}
    for row in rows:
        if passes(row, filters, skip=key):
            counts[row[key]] = counts.get(row[key], 0) + 1
    return [[k, counts[k]] for k in sorted(counts)]


def fingerprint(text):
    """A short fingerprint of a file's text, the FNV-1a hash as 8 hex digits: two people with the
    same fingerprint are looking at the same data, byte for byte."""
    return format(fnv1a(text), "08x")
