"""Part 4 of Data Science Studio: the maths behind a chart. Scales (linear, log, square root) and
their inverses, readable tick steps, bins and the rules for their width, a kernel density estimate,
colours mixed along a scale, and the lie factor of a misleading chart. Plain Python: D3 does all of
this in the page, and the lessons hold its answers to these.
"""
import math

from summary import quantile, std


def linear_scale(d0, d1, r0, r1, x):
    """Where x lands on the screen: the domain d0 to d1 stretched onto the range r0 to r1 (pixels).
    x is the same fraction t of the way along both."""
    t = (x - d0) / (d1 - d0)
    return r0 + t * (r1 - r0)


def invert(d0, d1, r0, r1, y):
    """The value at pixel y: the same scale run backwards, from the range to the domain."""
    t = (y - r0) / (r1 - r0)
    return d0 + t * (d1 - d0)


def log_scale(d0, d1, r0, r1, x):
    """A log scale: a linear scale on the logarithms, so each tenfold step takes the same room."""
    return linear_scale(math.log10(d0), math.log10(d1), r0, r1, math.log10(x))


def radius_for(value, largest, max_radius):
    """The radius of a circle whose area stands for value: the largest value gets max_radius, and
    the area, not the radius, grows in proportion to the value."""
    return max_radius * math.sqrt(value / largest)


def js_round(x):
    """Rounding as JavaScript does it, halves upwards. Python rounds halves to the even number."""
    return math.floor(x + 0.5)


def step_size(lo, hi, count):
    """The power of ten and the factor (1, 2, 5 or 10) of the step D3 chooses for about count ticks
    from lo to hi: whichever is nearest to (hi - lo) / count on a log scale. The lines between
    them, the square roots of 2, 10 and 50, are halfway on a log scale between 1, 2, 5 and 10."""
    raw = (hi - lo) / count
    power = math.floor(math.log10(raw))
    error = raw / 10 ** power
    if error >= math.sqrt(50):
        return power, 10
    if error >= math.sqrt(10):
        return power, 5
    if error >= math.sqrt(2):
        return power, 2
    return power, 1


def nice_ticks(lo, hi, count):
    """The ticks D3 draws: every multiple of the step from lo to hi. They are counted as whole
    numbers of steps and multiplied (or divided) at the end, so 0.1 + 0.2 never creeps in."""
    power, factor = step_size(lo, hi, count)
    if power < 0:
        per_unit = 10 ** -power / factor
        first, last = js_round(lo * per_unit), js_round(hi * per_unit)
        if first / per_unit < lo:
            first += 1
        if last / per_unit > hi:
            last -= 1
        return [k / per_unit for k in range(first, last + 1)]
    step = 10 ** power * factor
    first, last = js_round(lo / step), js_round(hi / step)
    if first * step < lo:
        first += 1
    if last * step > hi:
        last -= 1
    return [k * step for k in range(first, last + 1)]


def histogram(values, start, width, count):
    """How many values fall in each of count bins of the given width from start. Bin k holds
    start + k * width <= x < start + (k + 1) * width; the right edge of the last bin goes in it.
    Give whole numbers (pence) and the division is exact."""
    counts = [0] * count
    for x in values:
        k = (x - start) // width
        if k == count and x == start + count * width:
            k = count - 1
        if 0 <= k < count:
            counts[k] += 1
    return counts


def sturges(n):
    """Sturges: how many bins for n values, log2(n) + 1 rounded up."""
    return math.ceil(math.log2(n)) + 1


def scott_width(values):
    """Scott: the bin width 3.5 standard deviations over the cube root of n."""
    return 3.5 * std(values) / len(values) ** (1 / 3)


def freedman_diaconis_width(values):
    """Freedman and Diaconis: twice the interquartile range over the cube root of n. Quartiles
    ignore how far out the largest values are, so one outlier does not widen every bin."""
    iqr = quantile(values, 0.75) - quantile(values, 0.25)
    return 2 * iqr / len(values) ** (1 / 3)


def kde(values, h, x):
    """A kernel density estimate at x: a bell curve of width h on every value, added up and
    scaled so the whole curve has area 1."""
    total = 0.0
    for v in values:
        u = (x - v) / h
        total += math.exp(-u * u / 2) / math.sqrt(2 * math.pi)
    return total / (len(values) * h)


def silverman(values):
    """A bandwidth for kde from the values: 1.06 standard deviations times n to the power -1/5."""
    return 1.06 * std(values) * len(values) ** -0.2


def mix(c0, c1, t):
    """The colour t of the way from c0 to c1, both [red, green, blue] from 0 to 255: each channel
    moved the same fraction t, then rounded to a whole number."""
    return [js_round(a + t * (b - a)) for a, b in zip(c0, c1)]


def lie_factor(data_a, data_b, shown_a, shown_b):
    """Tufte's lie factor: how much bigger the change looks on the chart than it is in the data.
    Each change is the second over the first, minus 1. A factor of 1 is honest."""
    return (shown_b / shown_a - 1) / (data_b / data_a - 1)
