# Plotting a relationship

A formula tells you a value at one point. A graph shows you its whole behaviour at once: where it rises, where it levels off, where it crosses a limit, and how fast it changes. Engineers look at graphs before they trust a model, because a curve with the wrong shape is obvious on a plot and invisible in a table of twelve-digit numbers. This lesson builds plots from formulas and from data: what a plot really is (a set of sampled points joined by lines), how to read values off one, how sampling too coarsely can hide the truth, and how logarithmic axes turn power laws into straight lines.

This lesson covers:

- sampling a function and plotting it with matplotlib;
- labelling axes with quantities and units;
- reading values from a graph and confirming them numerically;
- how coarse sampling misleads, and how to choose a step;
- comparing families of relationships, and log–log axes for power laws.

## From formula to curve

::: math
\[ T(t) = T_\text{room} + (T_0 - T_\text{room})\, e^{-k t} \]
- $T_0$: starting temperature; $T_\text{room}$: room temperature; $k$: cooling rate (per minute)
- a plot samples $t_0, t_1, \ldots, t_{n-1}$ evenly and joins the points $(t_i, T(t_i))$ with straight lines
In code: `sample(f, start, stop, n)` builds the points, and `ax.plot(ts, temps)` joins them
:::


A plot is a list of points joined by straight lines. To draw a function, **sample** it: choose many inputs across a range, compute each output, and hand both lists to `plt.plot`. The more samples, the smoother the curve looks, though the computer only ever draws straight segments.

A hot part left to cool in a workshop follows **Newton's law of cooling**: its temperature T approaches the room temperature T_room exponentially,

\[ T(t) = T_\text{room} + (T_0 - T_\text{room}) \, e^{-k t} \]

where T₀ is the starting temperature and k a cooling rate that depends on the part's size and the air flow. The exponential gets its own lesson later; here it is simply a formula to draw. Every axis gets a label with its quantity and unit, written "quantity (unit)": an unlabelled graph is a picture, not information. Predict before running: does the part cool at a steady rate, or faster at the start?

```python type
import math
import matplotlib.pyplot as plt

def part_temperature(t, T0=90.0, T_room=20.0, k=0.05):
    """Temperature (°C) of a cooling part after t minutes."""
    return T_room + (T0 - T_room) * math.exp(-k * t)

def sample(f, start, stop, n):
    step = (stop - start) / (n - 1)
    xs = [start + i * step for i in range(n)]
    return xs, [f(x) for x in xs]

ts, temps = sample(part_temperature, 0, 60, 121)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(ts, temps, label="part")
ax.axhline(20, color="grey", linestyle="--", label="room")
ax.set_xlabel("time (min)")
ax.set_ylabel("temperature (°C)")
ax.set_title("A part cooling in still air")
ax.legend()
ax.grid(True)
plt.show()
print(f"drop in the first 10 min: {temps[0] - temps[20]:.1f} °C, in the last 10 min: {temps[100] - temps[120]:.1f} °C")
```

```output
drop in the first 10 min: 27.5 °C, in the last 10 min: 2.3 °C
```

`sample` returns n evenly spaced inputs from `start` to `stop`, both included, and the function's value at each. With 121 points over 60 minutes the step is half a minute.

The curve is steep at the start and flattens as it nears the dashed room line, which it never quite reaches. The part loses 27.5 °C in the first ten minutes but only 2.3 °C in the last ten: cooling is fastest when the temperature difference is largest. The shape alone, without any numbers, already says what kind of process this is.

## Reading values off a graph

::: math
\[ t = t_1 + \frac{\text{level} - y_1}{y_2 - y_1}\,(t_2 - t_1), \qquad t_\text{exact} = \frac{1}{k}\ln\frac{T_0 - T_\text{room}}{\text{level} - T_\text{room}} \]
- $(t_1, y_1)$, $(t_2, y_2)$: the samples either side of the level
- linear interpolation assumes a straight line between the two samples
In code: find the first sample at or below the level with `next(...)`, then interpolate
:::


A common question is when a curve crosses a level: when is the part cool enough to handle, at 60 °C? On the plot it is roughly where the curve crosses the 60 line, a little after 10 minutes. A graph gives a quick estimate; a calculation confirms it.

With data rather than a formula, there is no equation to solve. The usual method is **linear interpolation**: find the two samples on either side of the level and assume a straight line between them. If the samples at times t₁ and t₂ have values y₁ and y₂, the crossing is at

\[ t = t_1 + \frac{\text{level} - y_1}{y_2 - y_1} (t_2 - t_1) \]

Here the exact answer is available for comparison, because the formula can be solved: e^(−kt) = (60 − 20)/(90 − 20), so t = ln(70/40) / k. Predict before running: if the temperature is logged only every 5 minutes, will interpolation be early or late?

```python type
exact = math.log(70 / 40) / 0.05
log_t = list(range(0, 31, 5))
log_T = [part_temperature(t) for t in log_t]
for t, T in zip(log_t, log_T):
    print(f"{t:>3} min {T:6.1f} °C")
i = next(i for i, T in enumerate(log_T) if T <= 60)
t1, t2, y1, y2 = log_t[i - 1], log_t[i], log_T[i - 1], log_T[i]
estimate = t1 + (60 - y1) / (y2 - y1) * (t2 - t1)
print(f"interpolated {estimate:.2f} min, exact {exact:.2f} min")
```

```output
  0 min   90.0 °C
  5 min   74.5 °C
 10 min   62.5 °C
 15 min   53.1 °C
 20 min   45.8 °C
 25 min   40.1 °C
 30 min   35.6 °C
interpolated 11.31 min, exact 11.19 min
```

`next(...)` returns the first index whose temperature is at or below 60 °C; the crossing lies between that sample and the one before it.

The interpolated time, 11.31 minutes, is a little later than the exact 11.19. The true curve is **convex**: it falls ever more slowly, so between two samples it sags below the straight line joining them. The line therefore reaches 60 °C later than the curve does. Interpolation error shrinks quickly as samples get closer, which is why logging interval matters.

## When sampling lies

::: math
\[ y(t) = \sin(2\pi f t), \qquad t_n = \frac{n}{f_s} \;\Rightarrow\; y(t_n) = \sin\!\left(2\pi n \frac{f}{f_s}\right) \]
- $f$: the signal's frequency (50 Hz); $f_s$: samples per second
- when $f_s = f$, every sample is $\sin(2\pi n) = 0$: the vibration vanishes from the record
In code: `sample(vibration, 0, 0.1, 6)` samples 0.1 s at 50 per second
:::


Joining samples with straight lines assumes nothing interesting happens between them. If the step is too large, a plot can show a completely wrong shape. A motor shaft carries a vibration at 50 cycles per second (50 Hz): its displacement is y = sin(2π · 50 t). Predict before running: what does a data logger sampling exactly 50 times a second record?

```python type
vibration = lambda t: math.sin(2 * math.pi * 50 * t)
fine_t, fine_y = sample(vibration, 0, 0.1, 1001)
coarse_t, coarse_y = sample(vibration, 0, 0.1, 6)
odd_t, odd_y = sample(vibration, 0, 0.1, 5)

fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(fine_t, fine_y, color="lightgrey", label="true signal, 10 kHz")
ax.plot(coarse_t, coarse_y, "o-", label="sampled at 50 Hz")
ax.plot(odd_t, odd_y, "s-", label="sampled at 40 Hz")
ax.set_xlabel("time (s)")
ax.set_ylabel("displacement (relative)")
ax.legend(loc="upper right")
plt.show()
print("50 Hz samples:", [round(y, 6) + 0.0 for y in coarse_y])
print("40 Hz samples:", [round(y, 3) + 0.0 for y in odd_y])
```

```output
50 Hz samples: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
40 Hz samples: [0.0, 1.0, 0.0, -1.0, 0.0]
```

Adding `0.0` to a rounded value turns a `-0.0` into `0.0`, which keeps the printed list tidy.

Sampled at exactly its own frequency, the vibration catches every cycle at the same phase, every value is zero, and the plot shows a perfectly still shaft. At 40 Hz the samples run 0, 1, 0, −1, 0: a clean 10 Hz wave, which is not there at all. This effect, **aliasing**, returns in the signals block. The practical rule: sample at least several times per feature you care about, and when a plot looks surprising, resample more finely before believing it.

## Comparing relationships, and log scales

::: math
\[ y = c\,x^p \;\Longrightarrow\; \log y = \log c + p \log x \]
- on log–log axes a power law is a straight line with slope $p$
- the log–log slope between two points is $\dfrac{\log(y_2/y_1)}{\log(x_2/x_1)}$
In code: `ax.loglog(xs, ys)` and `math.log(y2 / y1) / math.log(x2 / x1)`
:::


Different relationships have characteristic shapes. A straight line (y = ax + b) changes at a constant rate. A power law (y = xᵖ) curves up when p > 1 and bends over, growing ever more slowly, when 0 < p < 1. An exponential eventually outgrows any power. Plotting candidates on one set of axes is a quick way to see which one data resembles.

On ordinary axes, a power law y = c xᵖ is a curve. Take logarithms of both sides: log y = log c + p log x. So on **log–log axes**, where both scales are logarithmic, it becomes a straight line whose slope is the exponent p. This is one of the most useful tricks in experimental science: plot measured data on log–log axes, and a straight line reveals a power law and its exponent. Predict before running: on log–log axes, what does the exponential look like?

```python type
xs, _ = sample(lambda x: x, 1, 20, 200)
families = {
    "linear 2x": [2 * x for x in xs],
    "square x²": [x ** 2 for x in xs],
    "root 10√x": [10 * math.sqrt(x) for x in xs],
    "exponential 2^x": [2 ** x for x in xs],
}
fig, (left, right) = plt.subplots(1, 2, figsize=(10, 3.8))
for name, ys in families.items():
    left.plot(xs, ys, label=name)
    right.loglog(xs, ys, label=name)
left.set_ylim(0, 400)
left.set_title("ordinary axes")
right.set_title("log–log axes")
for ax in (left, right):
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.legend(fontsize=8)
plt.show()

def log_slope(x1, y1, x2, y2):
    return math.log(y2 / y1) / math.log(x2 / x1)

for name, ys in families.items():
    print(f"{name:<16} log-log slope at the start {log_slope(xs[0], ys[0], xs[1], ys[1]):5.2f}, at the end {log_slope(xs[-2], ys[-2], xs[-1], ys[-1]):5.2f}")
```

```output
linear 2x        log-log slope at the start  1.00, at the end  1.00
square x²        log-log slope at the start  2.00, at the end  2.00
root 10√x        log-log slope at the start  0.50, at the end  0.50
exponential 2^x  log-log slope at the start  0.73, at the end 13.83
```

`loglog` plots with both axes logarithmic. `log_slope` measures the slope between two points in log–log space, which is the exponent if the relationship is a power law.

The three power laws become straight lines with constant slopes 1, 2 and 0.5, the exponents. The exponential curves upward: its log–log slope grows from 0.7 to 13.8 across the range, because no single power describes it. On a log–log plot, a constant slope means a power law. On a plot with only the y-axis logarithmic, an exponential becomes the straight line, a fact the logarithms lesson puts to work.

::: challenge A labelled plot [easy]
Write `plot_motion(times, positions, title)` that draws position against time on a new figure (`fig, ax = plt.subplots()`) and **returns the Axes**. Label the x axis exactly `"time (s)"` and the y axis exactly `"position (m)"`, set the given title, plot exactly one line with markers (`"o-"`), and turn the grid on. Raise `ValueError` if the two lists differ in length or have fewer than 2 points. Then call it to plot a conveyor that moves 0.4 m every second for 10 seconds, starting at 0.

```python starter
def plot_motion(times, positions, title):
    fig, ax = plt.subplots()
    ax.plot(times, positions)
    return ax

plot_motion([0, 1], [0, 0.4], "conveyor")
plt.show()
```

```python solution
def plot_motion(times, positions, title):
    if len(times) != len(positions) or len(times) < 2:
        raise ValueError("need two equal-length lists of at least 2 points")
    fig, ax = plt.subplots()
    ax.plot(times, positions, "o-")
    ax.set_xlabel("time (s)")
    ax.set_ylabel("position (m)")
    ax.set_title(title)
    ax.grid(True)
    return ax

secs = list(range(11))
plot_motion(secs, [0.4 * t for t in secs], "conveyor")
plt.show()
```

```python test
assert "plot_motion" in dir(), "Keep the function's name as plot_motion."
_ax = plot_motion([0, 1, 2], [0, 0.5, 1.5], "test run")
assert _ax is not None and hasattr(_ax, "get_lines"), "Return the Axes object from plt.subplots()."
assert _ax.get_xlabel() == "time (s)" and _ax.get_ylabel() == "position (m)", f"Labels must be exactly 'time (s)' and 'position (m)'; got {_ax.get_xlabel()!r}, {_ax.get_ylabel()!r}."
assert _ax.get_title() == "test run", "Use the given title."
assert len(_ax.get_lines()) == 1, f"Plot exactly one line; found {len(_ax.get_lines())}."
_line = _ax.get_lines()[0]
assert list(_line.get_xdata()) == [0, 1, 2] and list(_line.get_ydata()) == [0, 0.5, 1.5], "Plot the given data."
assert _line.get_marker() == "o" and _line.get_linestyle() == "-", "Use the 'o-' style: markers joined by lines."
assert any(_g.get_visible() for _g in _ax.get_xgridlines()), "Turn the grid on."
for _bad in [([0, 1], [0]), ([0], [0])]:
    try:
        plot_motion(*_bad, "bad")
        assert False, f"plot_motion{_bad} should raise ValueError."
    except ValueError:
        pass
plt.close("all")
"SUCCESS: Labels with units, a title, markers showing where the samples really are: a plot someone else can read."
```

Hint: Check the lengths first. Then `ax.plot(times, positions, "o-")`, `ax.set_xlabel(...)`, `ax.set_ylabel(...)`, `ax.set_title(title)`, `ax.grid(True)`, and `return ax`.
:::

::: challenge Finding crossings in logged data [medium]
Write `crossings(times, values, level)` that returns a list of **every** time at which the sampled data crosses `level`, found by linear interpolation between consecutive samples, in time order. A crossing happens between samples i and i + 1 when one value is below the level and the other above. A sample exactly equal to the level counts as one crossing at that sample's time if the data passes through it (the neighbours on either side are on opposite sides of the level); if the data only touches the level and turns back, or if it is the first or last sample, it is not a crossing. Round each time to 6 decimal places. Then write `first_below(times, values, level)`, the first time at which the data is at or below the level, interpolated as in the lesson (if the first sample is already at or below it, return the first time), or `None` if it never gets there.

```python starter
def crossings(times, values, level):
    return []

def first_below(times, values, level):
    return None

print(crossings([0, 1, 2], [0, 2, 0], 1), first_below([0, 5, 10, 15], [90, 74.6, 62.5, 53.6], 60))
```

```python solution
def crossings(times, values, level):
    found = []
    for i in range(len(values) - 1):
        a, b = values[i] - level, values[i + 1] - level
        if a == 0:
            continue
        if b == 0:
            if i + 2 < len(values) and (values[i + 2] - level) * a < 0:
                found.append(round(times[i + 1], 6))
            continue
        if (a < 0) != (b < 0):
            t = times[i] + (level - values[i]) / (values[i + 1] - values[i]) * (times[i + 1] - times[i])
            found.append(round(t, 6))
    return found

def first_below(times, values, level):
    if not values:
        return None
    if values[0] <= level:
        return times[0]
    for i in range(1, len(values)):
        if values[i] <= level:
            y1, y2 = values[i - 1], values[i]
            return times[i - 1] + (level - y1) / (y2 - y1) * (times[i] - times[i - 1])
    return None

print(crossings([0, 1, 2], [0, 2, 0], 1), first_below([0, 5, 10, 15], [90, 74.6, 62.5, 53.6], 60))
```

```python test
for _n in ["crossings", "first_below"]:
    assert _n in dir(), f"Define {_n}."
assert crossings([0, 1, 2], [0, 2, 0], 1) == [0.5, 1.5], "Up through the level, then down through it."
assert crossings([0, 1, 2, 3], [5, 5, 5, 5], 1) == [], "Never crosses."
assert crossings([0, 2], [10, 0], 4) == [1.2], "Interpolate: 10 to 0 over 2 s crosses 4 at 1.2 s."
assert crossings([0, 1, 2], [0, 1, 2], 1) == [1], "Passing exactly through a sample counts once, at that sample."
assert crossings([0, 1, 2], [0, 1, 0], 1) == [], "Touching the level and turning back is not a crossing."
assert crossings([0, 1, 2], [1, 3, 0], 1) == [1.666667], "A first sample on the level is not a crossing; the later one is."
_ts = [i * 0.5 for i in range(41)]
_ys = [math.sin(t) for t in _ts]
_c = crossings(_ts, _ys, 0.5)
assert len(_c) == 7 and abs(_c[0] - math.asin(0.5)) < 0.02, f"sin(t) = 0.5 is crossed 7 times on 0..20 s; got {_c}."
assert abs(first_below([0, 5, 10, 15], [90, 74.5, 62.5, 53.1], 60) - (10 + 2.5 / 9.4 * 5)) < 1e-9, "The lesson's interpolation."
assert first_below([0, 1], [3, 4], 5) == 0 and first_below([0, 1, 2], [9, 8, 7], 5) is None and first_below([], [], 1) is None, "Already below, never below, no data."
"SUCCESS: Every crossing found by interpolation, with the edge cases of samples exactly on the level handled deliberately."
```

Hint: For each consecutive pair, compare `values[i] - level` and `values[i + 1] - level`. Opposite signs mean a crossing; interpolate. When the next value equals the level exactly, look one sample further to see whether the data passes through.
:::

::: challenge Detecting a power law [hard]
Experimental data often follows a power law y = c xᵖ, and log–log slopes reveal it. Write `power_law_fit(xs, ys)` that estimates `(c, p)` from positive data: p is the log–log slope between the **first and last** points, and c = y₀ / x₀ᵖ from the first point; round both to 4 significant figures (`float(f"{v:.4g}")`). Raise `ValueError` if there are fewer than 2 points, the lists differ in length, any value is not positive, or the first and last x are equal. Then write `is_power_law(xs, ys, tolerance=0.02)`: True when every consecutive pair's log–log slope is within `tolerance` of the first-to-last slope. Finally write `plot_loglog(xs, ys)` that draws the data on log–log axes on a new figure with `ax.loglog(xs, ys, "o")` (one line object of `"o"` markers, not `scatter`) and returns the Axes; label the axes `"x"` and `"y"`. Use it on a pendulum's measured periods.

```python starter
def power_law_fit(xs, ys):
    return (1, 1)

def is_power_law(xs, ys, tolerance=0.02):
    return True

def plot_loglog(xs, ys):
    fig, ax = plt.subplots()
    ax.plot(xs, ys, "o")
    return ax

lengths = [0.25, 0.5, 1.0, 2.0, 4.0]
periods = [1.003, 1.418, 2.006, 2.837, 4.012]
print(power_law_fit(lengths, periods), is_power_law(lengths, periods))
```

```python solution
def _check(xs, ys):
    if len(xs) != len(ys) or len(xs) < 2:
        raise ValueError("need two equal-length lists of at least 2 points")
    if any(v <= 0 for v in list(xs) + list(ys)):
        raise ValueError("all values must be positive")
    if xs[0] == xs[-1]:
        raise ValueError("the first and last x must differ")

def power_law_fit(xs, ys):
    _check(xs, ys)
    p = math.log(ys[-1] / ys[0]) / math.log(xs[-1] / xs[0])
    c = ys[0] / xs[0] ** p
    return float(f"{c:.4g}"), float(f"{p:.4g}")

def is_power_law(xs, ys, tolerance=0.02):
    _check(xs, ys)
    overall = math.log(ys[-1] / ys[0]) / math.log(xs[-1] / xs[0])
    for i in range(len(xs) - 1):
        if xs[i] == xs[i + 1]:
            return False
        local = math.log(ys[i + 1] / ys[i]) / math.log(xs[i + 1] / xs[i])
        if abs(local - overall) > tolerance:
            return False
    return True

def plot_loglog(xs, ys):
    fig, ax = plt.subplots()
    ax.loglog(xs, ys, "o")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    return ax

lengths = [0.25, 0.5, 1.0, 2.0, 4.0]
periods = [1.003, 1.418, 2.006, 2.837, 4.012]
print(power_law_fit(lengths, periods), is_power_law(lengths, periods))
plot_loglog(lengths, periods)
plt.show()
```

```python test
for _n in ["power_law_fit", "is_power_law", "plot_loglog"]:
    assert _n in dir(), f"Define {_n}."
assert power_law_fit([0.25, 0.5, 1.0, 2.0, 4.0], [1.003, 1.418, 2.006, 2.837, 4.012]) == (2.006, 0.5), f"The pendulum: T = 2.006 L^0.5; got {power_law_fit([0.25, 0.5, 1.0, 2.0, 4.0], [1.003, 1.418, 2.006, 2.837, 4.012])}."
assert power_law_fit([1, 2, 3], [3, 24, 81]) == (3.0, 3.0), "y = 3x³."
assert power_law_fit([2, 8], [5, 2.5]) == (7.071, -0.5), "Decreasing power laws have negative exponents."
assert is_power_law([0.25, 0.5, 1.0, 2.0, 4.0], [1.003, 1.418, 2.006, 2.837, 4.012]), "The pendulum data is a power law."
_xs = [1, 2, 3, 4, 5, 6]
assert not is_power_law(_xs, [2 ** x for x in _xs]), "An exponential is not a power law."
assert not is_power_law(_xs, [x + 10 for x in _xs]), "A line with an intercept is not a power law."
assert is_power_law(_xs, [7 * x ** 1.5 for x in _xs]) and is_power_law(_xs, [x ** 1.5 * (1.005 if x % 2 else 1) for x in _xs], tolerance=0.05), "Power laws, with a little noise allowed by the tolerance."
for _bad in [([1], [1]), ([1, 2], [1]), ([1, 2], [0, 3]), ([-1, 2], [1, 3]), ([3, 1, 3], [1, 2, 3])]:
    try:
        power_law_fit(*_bad)
        assert False, f"power_law_fit{_bad} should raise ValueError."
    except ValueError:
        pass
_ax = plot_loglog([1, 10, 100], [2, 20, 200])
assert _ax.get_xscale() == "log" and _ax.get_yscale() == "log", "Both axes must be logarithmic."
assert _ax.get_xlabel() == "x" and _ax.get_ylabel() == "y", "Label the axes 'x' and 'y'."
assert len(_ax.get_lines()) == 1 and _ax.get_lines()[0].get_marker() == "o", "Plot the data as one set of 'o' markers."
plt.close("all")
"SUCCESS: Log–log slopes reveal the exponent: the pendulum's period grows as the square root of its length, T ≈ 2.006 √L."
```

Hint: The exponent is `log(y_last / y_first) / log(x_last / x_first)`. For `is_power_law`, compute the same slope for each consecutive pair and compare. `ax.loglog(xs, ys, "o")` draws on log–log axes.
:::

## What you learned

- A plot is sampled points joined by straight lines. Sample enough points, label every axis with "quantity (unit)", and add a title and legend.
- The shape of a curve tells you what kind of process it is before any number does: cooling is fastest when the difference is largest.
- Linear interpolation reads crossings from data; its error depends on the sample spacing and on how much the curve bends.
- Coarse sampling can show a completely false picture (aliasing). Resample finely before believing a surprising plot.
- On log–log axes a power law y = c xᵖ is a straight line of slope p; a constant log–log slope identifies a power law and its exponent.

The next lesson introduces NumPy arrays, which compute on thousands of values at once and make sampling and plotting far more direct.
