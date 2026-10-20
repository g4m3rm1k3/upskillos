"""Part 9 of Data Science Studio: time and forecasting. Dates as numbers and resampling; moving
averages, slow and with a running sum; trend and seasonality pulled apart; autocorrelation; the
naive forecasts and the ways to score a forecast; exponential smoothing, Holt's trend and the
weekly season of Holt and Winters; and walk-forward validation, which never lets a forecast see
the future. Plain Python, every sum a loop.
"""
import math

from models import weekday
from samples import day_of_year
from summary import mean, total


def week_of(date):
    """The week of 2025 a date falls in, weeks starting on a Monday: 1 January 2025 was a
    Wednesday, so week 0 holds only its first five days, and week 1 starts on Monday 6 January."""
    return (day_of_year(date) + 2) // 7


def resample(dates, values, by):
    """Add the values up by month ("month": the YYYY-MM at the front of the date) or by week
    ("week": week_of). Returns [key, total, days] for each period, in time order."""
    out = []
    for date, v in zip(dates, values):
        key = date[:7] if by == "month" else week_of(date)
        if out and out[-1][0] == key:
            out[-1][1] += v
            out[-1][2] += 1
        else:
            out.append([key, v, 1])
    return out


def moving_average_slow(ys, k):
    """The average of each run of k days in a row, ending on day k - 1, then k, and so on: every
    window added up from the start, k additions each time."""
    out = []
    for end in range(k - 1, len(ys)):
        s = 0
        for i in range(end - k + 1, end + 1):
            s += ys[i]
        out.append(s / k)
    return out


def moving_average(ys, k):
    """The same averages with a running sum: when the window moves one day on, add the day that
    comes in and take away the day that drops out. Two steps per day, whatever k is."""
    s = 0
    for i in range(k):
        s += ys[i]
    out = [s / k]
    for end in range(k, len(ys)):
        s += ys[end] - ys[end - k]
        out.append(s / k)
    return out


def centred_average(ys, k):
    """The average of the k days centred on each day (k odd: (k - 1) / 2 before it and as many
    after). None at the two ends, where the window does not fit."""
    h = (k - 1) // 2
    out = [None] * len(ys)
    for t, m in enumerate(moving_average(ys, k)):
        out[t + h] = m
    return out


def seasonal_indices(ys, trend, period):
    """How far each position in the cycle sits above or below the trend, on average: the mean of
    y - trend over the days at that position (day t is at position t % period), then shifted so
    the indices add up to 0."""
    gaps = [[] for _ in range(period)]
    for t, (y, m) in enumerate(zip(ys, trend)):
        if m is not None:
            gaps[t % period].append(y - m)
    raw = [mean(g) for g in gaps]
    shift = mean(raw)
    return [r - shift for r in raw]


def decompose(ys, period):
    """Classical additive decomposition, y = trend + season + rest: the trend is the centred
    average over one whole period, the season the seasonal indices, the rest what is left."""
    trend = centred_average(ys, period)
    season = seasonal_indices(ys, trend, period)
    rest = [None if m is None else y - m - season[t % period] for t, (y, m) in enumerate(zip(ys, trend))]
    return [trend, season, rest]


def difference(ys, lag):
    """The change from lag days before: y[t] - y[t - lag], for every t from lag on."""
    return [ys[t] - ys[t - lag] for t in range(lag, len(ys))]


def autocorrelation(ys, lag):
    """How much the series resembles itself lag days later: the sum of (y[t] - mean)(y[t + lag] -
    mean) over the sum of (y[t] - mean) squared. Both use the one mean of the whole series."""
    m = mean(ys)
    top = total([(ys[t] - m) * (ys[t + lag] - m) for t in range(len(ys) - lag)])
    bottom = total([(y - m) ** 2 for y in ys])
    return top / bottom


def acf(ys, max_lag):
    """The autocorrelations at lags 1 to max_lag."""
    return [autocorrelation(ys, k) for k in range(1, max_lag + 1)]


def naive_forecasts(ys):
    """Tomorrow will be like today: the forecast for day t is y[t - 1]. None for day 0."""
    return [None] + ys[:-1]


def seasonal_naive(ys, period):
    """This day will be like the same day one period ago: the forecast for day t is y[t - period]."""
    return [None] * period + ys[:-period]


def mean_forecasts(ys):
    """Tomorrow will be like the average so far: the mean of every day before t."""
    out, s = [None], 0
    for t in range(1, len(ys)):
        s += ys[t - 1]
        out.append(s / t)
    return out


def scored(ys, forecasts):
    """The pairs of an actual and its forecast, for the days that have a forecast."""
    return [[y, f] for y, f in zip(ys, forecasts) if f is not None]


def mae(pairs):
    """The mean absolute error: the average size of a miss, in the data's own units."""
    return mean([abs(y - f) for y, f in pairs])


def rmse_of(pairs):
    """The root mean squared error: square the misses, average, take the square root. A big miss
    counts for much more than two half-size ones."""
    return math.sqrt(mean([(y - f) ** 2 for y, f in pairs]))


def mape(pairs):
    """The mean absolute percentage error: each miss as a share of the actual value, averaged, in
    per cent. It cannot be computed when an actual value is 0."""
    return 100 * mean([abs(y - f) / abs(y) for y, f in pairs])


def exponential_smoothing(ys, alpha):
    """The level starts at the first value; each new value moves it a share alpha of the way
    towards that value. The forecast for day t is the level after day t - 1. None for day 0."""
    level = ys[0]
    out = [None]
    for t in range(1, len(ys)):
        out.append(level)
        level += alpha * (ys[t] - level)
    return out


def smoothing_weights(alpha, k):
    """The weight the forecast puts on the value 0, 1, ..., k - 1 days back: alpha times
    (1 - alpha) to that power."""
    return [alpha * (1 - alpha) ** j for j in range(k)]


def best_alpha(ys, alphas):
    """The alpha whose one-step forecasts have the smallest RMSE, with that RMSE: [alpha, rmse].
    Ties go to the first."""
    best = None
    for a in alphas:
        e = rmse_of(scored(ys, exponential_smoothing(ys, a)))
        if best is None or e < best[1]:
            best = [a, e]
    return best


def holt(ys, alpha, beta):
    """Holt's method: a level and a trend (the change per step). Each new value updates the level
    as smoothing does, from the level plus the trend; the trend moves a share beta towards the
    level's latest change. Starts from level y[1] and trend y[1] - y[0]; the forecast for t is
    level + trend after t - 1. None for days 0 and 1."""
    level, trend = ys[1], ys[1] - ys[0]
    out = [None, None]
    for t in range(2, len(ys)):
        out.append(level + trend)
        last = level
        level = alpha * ys[t] + (1 - alpha) * (level + trend)
        trend = beta * (level - last) + (1 - beta) * trend
    return out


def holt_ahead(ys, alpha, beta, h):
    """Holt's forecasts h steps past the end of ys: level + 1 x trend, level + 2 x trend, ..."""
    level, trend = ys[1], ys[1] - ys[0]
    for t in range(2, len(ys)):
        last = level
        level = alpha * ys[t] + (1 - alpha) * (level + trend)
        trend = beta * (level - last) + (1 - beta) * trend
    return [level + j * trend for j in range(1, h + 1)]


def holt_winters(ys, alpha, beta, gamma, period, h=1):
    """Holt and Winters' additive method: a level, a trend and one seasonal index per position in
    the cycle. The first period starts it (the level is its mean, the trend 0, each index that
    day's gap from the mean); from then on each value updates all three. The forecast for day t is
    made h days before it: level + h x trend + that day's index, from what was known on day
    t - h. None until a forecast can be made."""
    level = mean(ys[:period])
    trend = 0.0
    season = [y - level for y in ys[:period]]
    out = [None] * len(ys)
    for t in range(period, len(ys)):
        if t + h - 1 < len(ys):
            out[t + h - 1] = level + h * trend + season[(t + h - 1) % period]
        last = level
        level = alpha * (ys[t] - season[t % period]) + (1 - alpha) * (level + trend)
        trend = beta * (level - last) + (1 - beta) * trend
        season[t % period] = gamma * (ys[t] - level) + (1 - gamma) * season[t % period]
    return out


def walk_forward(n, start, horizon):
    """The splits of walk-forward validation: train on days 0 to end - 1, then forecast the day
    horizon - 1 days later, for end = start, start + 1, ... Returns [end, target] pairs: every
    target lies after every day trained on."""
    return [[end, end + horizon - 1] for end in range(start, n - horizon + 1)]


def weekday_profile(dates, ys):
    """The average of ys on each weekday, Monday first."""
    groups = [[] for _ in range(7)]
    for date, y in zip(dates, ys):
        groups[weekday(date)].append(y)
    return [mean(g) for g in groups]
