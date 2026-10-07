# Exponential growth and decay

Some quantities change by a fixed **amount** each step: a conveyor moves 0.4 m every second. Many more change by a fixed **fraction**: a hot part loses a fixed fraction of its excess temperature each minute, a radioactive sample loses half its atoms every half-life, money in a savings account grows by a fixed percentage a year, a capacitor discharges by a fixed fraction every millisecond. Change in proportion to the current size produces **exponential** growth or decay, the most important non-linear pattern in science and engineering. This lesson builds it from repeated multiplication, meets e again as the natural base for continuous change, and uses half-lives, time constants and two measurements to predict the future of a cooling part.

This lesson covers:

- growth by a constant factor per step, and doubling times;
- continuous change: dN/dt = kN and its solution N₀e^(kt);
- decay, half-life and time constant;
- Newton's law of cooling as exponential decay of a temperature difference;
- how exponentials compare with powers, and simulating them.

## Constant factor per step

::: math
\[ N_n = N_0\,r^n, \qquad r = 1 + p, \qquad n_\text{double} = \frac{\ln 2}{\ln r} \approx \frac{0.693}{p} \]
- $p$: growth rate per step; $r$: the factor per step
- linear growth adds the same amount each step: $N_0 + c\,n$
In code: `1000 * 1.05 ** years` against `1000 + 100 * years`
:::


If a quantity is multiplied by the same factor r every step, after n steps it is N₀ rⁿ. A growth rate of p per step means r = 1 + p: 5% interest gives r = 1.05; a 3% loss gives r = 0.97. The **doubling time** is the number of steps for rⁿ = 2, n = ln 2 / ln r, which for small p is about 0.693/p, giving the "rule of 70": at p percent per year, money doubles in about 70/p years.

The striking thing about exponentials is how they compare with steady, linear change. Predict before running: £1,000 earning 5% a year, against £1,000 plus a fixed £100 a year. Which is ahead after 10 years, and after 40?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

years = np.arange(0, 41)
compound = 1000 * 1.05 ** years
linear = 1000 + 100 * years
for y in [10, 14, 15, 20, 40]:
    print(f"year {y:>2}: compound £{compound[y]:8,.0f}   linear £{linear[y]:6,.0f}")
print(f"doubling time at 5%: exact {math.log(2) / math.log(1.05):.2f} years, rule of 70: {70 / 5:.0f} years")
crossover = years[np.argmax(compound > linear)]
print("compound first ahead in year", crossover)
```

```output
year 10: compound £   1,629   linear £ 2,000
year 14: compound £   1,980   linear £ 2,400
year 15: compound £   2,079   linear £ 2,500
year 20: compound £   2,653   linear £ 3,000
year 40: compound £   7,040   linear £ 5,000
doubling time at 5%: exact 14.21 years, rule of 70: 14 years
compound first ahead in year 27
```

The linear account is ahead for years: at 10 years it has £2,000 against £1,629. The compound account catches up only in year 27, and then pulls away: by year 40 it is £2,040 ahead. Exponential growth is slow at first and relentless later, which is why it is so often underestimated, in debt, in populations, and in the spread of faults through a network.

## Continuous change and e

::: math
\[ \lim_{n\to\infty}\left(1 + \frac{k}{n}\right)^n = e^k, \qquad \frac{dN}{dt} = kN \;\;\Longrightarrow\;\; N(t) = N_0\,e^{kt} \]
- compounding $n$ times a year approaches the continuous limit $e^k$
- $k > 0$: growth; $k < 0$: decay
In code: `(1 + k / n) ** n` against `math.exp(k)`; an Euler loop multiplies `N` by 1.03 per step
:::


Interest paid more often grows slightly faster: 5% a year paid monthly is 0.05/12 per month, giving (1 + 0.05/12)¹² ≈ 1.0512 per year. Paying ever more often approaches a limit,

\[ \lim_{n\to\infty} \left(1 + \frac{k}{n}\right)^n = e^k \]

the same e that the derivative lesson found as the base whose exponential is its own derivative. That is no coincidence. **Continuous** change in proportion to size means dN/dt = k N, and the function whose derivative is k times itself is

\[ N(t) = N_0 \, e^{kt} \]

with k > 0 for growth and k < 0 for decay. Predict before running: how close does daily compounding get to the continuous limit?

```python type
k = 0.05
for name, n in [("yearly", 1), ("monthly", 12), ("daily", 365), ("every second", 365 * 24 * 3600)]:
    print(f"{name:<13} factor per year {(1 + k / n) ** n:.10f}")
print(f"continuous    factor per year {math.exp(k):.10f}")

t = np.linspace(0, 10, 101)
N = np.empty_like(t)
N[0] = 100.0
dt = t[1] - t[0]
for i in range(1, len(t)):
    N[i] = N[i - 1] + 0.3 * N[i - 1] * dt
print(f"Euler for dN/dt = 0.3 N to t = 10: {N[-1]:.1f}, exact 100 e^3 = {100 * math.exp(3):.1f}")
```

```output
yearly        factor per year 1.0500000000
monthly       factor per year 1.0511618979
daily         factor per year 1.0512674965
every second  factor per year 1.0512710936
continuous    factor per year 1.0512710964
Euler for dN/dt = 0.3 N to t = 10: 1921.9, exact 100 e^3 = 2008.6
```

The Euler loop steps dN/dt = 0.3N with Δt = 0.1; each step multiplies N by 1.03, so the simulation is itself a compound-interest calculation.

Daily compounding gives 1.0512675 against the continuous 1.0512711: the limit is reached for practical purposes. The Euler simulation undershoots, reaching 1,922 instead of 2,009, because it compounds only once per step, exactly like yearly interest compared with continuous: Euler's method on exponential growth is compound interest with too few payments.

## Decay, half-life and time constant

::: math
\[ V(t) = V_0\,e^{-t/\tau}, \qquad \tau = RC, \qquad t_{1/2} = \tau\ln 2, \qquad t = \tau\ln\frac{V_0}{V} \]
- after one $\tau$, $1/e \approx 36.8\%$ remains; after $5\tau$, under 1%
- the fraction lost in any window depends only on its length
In code: `tau = R * C`, `V0 * math.exp(-n_tau)` and `tau * math.log(V0 / 1.0)`
:::


For decay, N = N₀ e^(−t/τ), where τ (tau) is the **time constant**: after one τ, 1/e ≈ 36.8% remains; after 3τ, 5%; after 5τ, under 1%. The **half-life** is the time for half to remain: e^(−t½/τ) = ½, so t½ = τ ln 2 ≈ 0.693τ. Radioactive isotopes are described by half-lives; electrical circuits by time constants (τ = RC for a capacitor discharging through a resistor). Either one determines the other.

A useful property: the fraction remaining after a time t depends only on t, not on when you start. A sample does not remember its age. Predict before running: a 100 µF capacitor charged to 24 V discharges through a 47 kΩ resistor. When is it below 1 V?

```python type
R, C, V0 = 47e3, 100e-6, 24.0
tau = R * C
print(f"time constant RC = {tau:.2f} s, half-life {tau * math.log(2):.2f} s")
for n_tau in [1, 2, 3, 5]:
    print(f"after {n_tau} τ ({n_tau * tau:5.2f} s): {V0 * math.exp(-n_tau):6.3f} V ({100 * math.exp(-n_tau):5.1f}%)")
t_safe = tau * math.log(V0 / 1.0)
print(f"below 1 V after {t_safe:.2f} s, which is {t_safe / tau:.2f} time constants")
print("same fraction lost in any 2 s window:", round(math.exp(-2 / tau), 6), round(V0 * math.exp(-7 / tau) / (V0 * math.exp(-5 / tau)), 6))
```

```output
time constant RC = 4.70 s, half-life 3.26 s
after 1 τ ( 4.70 s):  8.829 V ( 36.8%)
after 2 τ ( 9.40 s):  3.248 V ( 13.5%)
after 3 τ (14.10 s):  1.195 V (  5.0%)
after 5 τ (23.50 s):  0.162 V (  0.7%)
below 1 V after 14.94 s, which is 3.18 time constants
same fraction lost in any 2 s window: 0.653422 0.653422
```

The time to fall from V₀ to V comes from solving V₀ e^(−t/τ) = V: t = τ ln(V₀/V).

The time constant is 4.7 s and the half-life 3.26 s. The voltage is below 1 V after 14.94 s, about 3.2 time constants. Any 2-second window loses the same fraction (keeping 65.3%), whether it starts at 0 s or at 5 s. That memoryless property is what makes exponential decay the natural model for radioactive atoms, which have no internal clock.

## Cooling as exponential decay

::: math
\[ T(t) - T_\text{room} = (T_0 - T_\text{room})\,e^{-kt}, \qquad k = \frac{\ln(D_1/D_2)}{t_2 - t_1} \]
- the **gap** $D = T - T_\text{room}$ decays exponentially, not the temperature
- two measurements of the gap fix $k$
In code: `k = math.log((T0 - T_room) / (T4 - T_room)) / 4`
:::


Newton's law of cooling, plotted in an earlier lesson, says the **difference** between an object's temperature and its surroundings decays exponentially: T(t) − T_room = (T₀ − T_room) e^(−kt). The temperature itself is not exponential; the gap is. With two measurements, k follows from taking logarithms: k = ln(D₁/D₂)/(t₂ − t₁), where D is the gap at each time.

A heat-treated shaft is at 180 °C when it leaves the furnace and 132 °C four minutes later, in a 22 °C workshop. Predict before running: when will it be cool enough to handle, at 45 °C?

```python type
T_room, T0, T4 = 22.0, 180.0, 132.0
k = math.log((T0 - T_room) / (T4 - T_room)) / 4
t_handle = math.log((T0 - T_room) / (45 - T_room)) / k
print(f"cooling rate k = {k:.4f} per minute (time constant {1 / k:.1f} min)")
print(f"safe to handle after {t_handle:.1f} min")

ts = np.linspace(0, 60, 241)
fig, ax = plt.subplots(figsize=(6, 3.2))
ax.plot(ts, T_room + (T0 - T_room) * np.exp(-k * ts))
ax.plot([0, 4], [T0, T4], "o", label="measurements")
ax.axhline(45, color="red", linestyle=":", label="safe to handle")
ax.axhline(T_room, color="grey", linestyle="--", label="workshop")
ax.set_xlabel("time (min)")
ax.set_ylabel("temperature (°C)")
ax.legend()
plt.show()
```

```output
cooling rate k = 0.0905 per minute (time constant 11.0 min)
safe to handle after 21.3 min
```

The gap falls from 158 °C to 110 °C in 4 minutes, which fixes k. The same formula, solved for t, gives the waiting time.

k is about 0.091 per minute, a time constant of 11 minutes, and the shaft is safe to handle after about 21 minutes. Two measurements were enough to predict the whole curve, but only because the model's form was known. Real cooling deviates when radiation matters (very hot parts) or the air flow changes, so a third measurement is a good check.

::: challenge Half-lives [easy]
Write `rate_from_half_life(half_life)`, the decay constant k = ln 2 / t½ (raise `ValueError` if t½ is not positive). Write `remaining(N0, half_life, t)`, the amount left after time t, N₀ (½)^(t / t½). Then write `time_to_fraction(half_life, fraction)`, the time until the given fraction remains, rounded to 4 decimal places, raising `ValueError` unless 0 < fraction ≤ 1 and the half-life is positive. Finally write `doubling_time(rate_percent)`, the exact number of periods to double at a growth rate of `rate_percent` percent per period, rounded to 2 decimal places (raise `ValueError` if the rate is not positive).

```python starter
def rate_from_half_life(half_life):
    return 0.0

def remaining(N0, half_life, t):
    return N0

def time_to_fraction(half_life, fraction):
    return 0.0

def doubling_time(rate_percent):
    return 70 / rate_percent

print(remaining(1000, 5730, 11460))
```

```python solution
def rate_from_half_life(half_life):
    if half_life <= 0:
        raise ValueError("the half-life must be positive")
    return math.log(2) / half_life

def remaining(N0, half_life, t):
    rate_from_half_life(half_life)
    return N0 * 0.5 ** (t / half_life)

def time_to_fraction(half_life, fraction):
    if not 0 < fraction <= 1:
        raise ValueError("the fraction must be in (0, 1]")
    return round(math.log(1 / fraction) / rate_from_half_life(half_life), 4) + 0.0

def doubling_time(rate_percent):
    if rate_percent <= 0:
        raise ValueError("the rate must be positive")
    return round(math.log(2) / math.log(1 + rate_percent / 100), 2)

print(remaining(1000, 5730, 11460))
```

```python test
for _n in ["rate_from_half_life", "remaining", "time_to_fraction", "doubling_time"]:
    assert _n in dir(), f"Define {_n}."
assert abs(rate_from_half_life(5730) - 1.2097e-4) < 1e-8, "Carbon-14: k = ln 2 / 5730 per year."
assert abs(remaining(1000, 5730, 11460) - 250) < 1e-9 and abs(remaining(80, 8, 4) - 80 / math.sqrt(2)) < 1e-9, "Two half-lives leave a quarter; half a half-life leaves 1/√2."
assert time_to_fraction(5730, 0.5) == 5730.0 and time_to_fraction(10, 0.1) == 33.2193 and time_to_fraction(3, 1) == 0.0, "Times to a fraction."
for _bad in [(0, 0.5), (10, 0), (10, 1.5)]:
    try:
        time_to_fraction(*_bad)
        assert False, f"time_to_fraction{_bad} should raise ValueError."
    except ValueError:
        pass
assert doubling_time(5) == 14.21 and doubling_time(100) == 1.0 and doubling_time(1) == 69.66, "Exact doubling times."
for _bad in [0, -3]:
    try:
        doubling_time(_bad)
        assert False, f"doubling_time({_bad}) should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Half-life and decay constant are two descriptions of one exponential: k = ln 2 / t½."
```

Hint: Solve (½)^(t/t½) = fraction for t: t = t½ × ln(1/fraction) / ln 2, which is ln(1/fraction)/k. For doubling, solve (1 + p)ⁿ = 2.
:::

::: challenge Predicting a cooling part [medium]
Write `cooling_constant(T_room, T1, t1, T2, t2)`, the k in Newton's law from two readings (temperature T1 at time t1 and T2 at a later t2). Raise `ValueError` if t2 ≤ t1, if either reading is not on the same side of room temperature, or if the gap does not shrink (the part is not cooling towards the room). Write `temperature_at(T_room, T0, k, t)`. Then write `time_to_reach(T_room, T0, k, T_target)`, rounded to 2 decimal places, raising `ValueError` if the target is not strictly between T0 and T_room (it would never be reached, or has already been passed). The model works for objects warming up towards room temperature too.

```python starter
def cooling_constant(T_room, T1, t1, T2, t2):
    return 0.1

def temperature_at(T_room, T0, k, t):
    return T0

def time_to_reach(T_room, T0, k, T_target):
    return 0.0

print(cooling_constant(22, 180, 0, 132, 4))
```

```python solution
def cooling_constant(T_room, T1, t1, T2, t2):
    if t2 <= t1:
        raise ValueError("the second reading must be later")
    d1, d2 = T1 - T_room, T2 - T_room
    if d1 == 0 or d2 == 0 or (d1 > 0) != (d2 > 0):
        raise ValueError("both readings must be on the same side of room temperature")
    if abs(d2) >= abs(d1):
        raise ValueError("the temperature gap must shrink")
    return math.log(d1 / d2) / (t2 - t1)

def temperature_at(T_room, T0, k, t):
    return T_room + (T0 - T_room) * math.exp(-k * t)

def time_to_reach(T_room, T0, k, T_target):
    if not (min(T0, T_room) < T_target < max(T0, T_room)):
        raise ValueError("the target must lie strictly between the start and room temperature")
    return round(math.log((T0 - T_room) / (T_target - T_room)) / k, 2)

print(cooling_constant(22, 180, 0, 132, 4))
```

```python test
for _n in ["cooling_constant", "temperature_at", "time_to_reach"]:
    assert _n in dir(), f"Define {_n}."
_k = cooling_constant(22, 180, 0, 132, 4)
assert abs(_k - math.log(158 / 110) / 4) < 1e-12, "The lesson's shaft."
assert abs(cooling_constant(22, 132, 4, 100, 9) - math.log(110 / 78) / 5) < 1e-12, "Readings need not start at t = 0."
assert abs(temperature_at(22, 180, _k, 4) - 132) < 1e-9, "The fitted curve passes through the reading."
assert time_to_reach(22, 180, _k, 45) == 21.29, f"Got {time_to_reach(22, 180, _k, 45)}."
_kw = cooling_constant(20, 4, 0, 10, 15)
assert _kw > 0 and time_to_reach(20, 4, _kw, 15) > 15, "A cold drink warming towards the room."
for _bad in [(22, 180, 4, 132, 4), (22, 180, 0, 15, 4), (22, 100, 0, 150, 4), (22, 22, 0, 30, 4)]:
    try:
        cooling_constant(*_bad)
        assert False, f"cooling_constant{_bad} should raise ValueError."
    except ValueError:
        pass
for _target in [22, 15, 200, 180]:
    try:
        time_to_reach(22, 180, _k, _target)
        assert False, f"target {_target} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Two readings fix the decay constant of the temperature gap, and the same logarithm predicts when any target is reached."
```

Hint: The gap D = T − T_room decays as D₀e^(−kt), so k = ln(D₁/D₂)/(t₂ − t₁). Solve T_room + D₀e^(−kt) = T_target for t.
:::

::: challenge Measuring a half-life [hard]
A detector counts decays from a short-lived sample: `ts` (minutes) and `counts` per minute, with noise. Taking logarithms turns N₀e^(−kt) into a straight line: ln N = ln N₀ − k t. Write `fit_decay(ts, counts)` that fits a least-squares line to (t, ln count) using the lesson formulas for slope and intercept (no `np.polyfit` or other fitting functions), and returns `(N0, k, half_life)`, each rounded to 4 significant figures (`float(f"{v:.4g}")`). Raise `ValueError` if any count is not positive, the lengths differ, there are fewer than 2 points, or the fitted k is not positive (no decay). Then write `predict_counts(N0, k, t)`, working on numbers or arrays, and `residual_ratio(ts, counts)`: the largest of |count / prediction − 1| over the data, using the unrounded fit, rounded to 4 decimal places, a quick check of how well the model fits.

```python starter
def fit_decay(ts, counts):
    return (counts[0], 0.1, math.log(2) / 0.1)

def predict_counts(N0, k, t):
    return N0

def residual_ratio(ts, counts):
    return 0.0

print(fit_decay([0, 10, 20], [800, 400, 200]))
```

```python solution
def _fit(ts, counts):
    t, c = np.asarray(ts, dtype=float), np.asarray(counts, dtype=float)
    if len(t) != len(c) or len(t) < 2:
        raise ValueError("need equal-length data with at least 2 points")
    if np.any(c <= 0):
        raise ValueError("counts must be positive")
    y = np.log(c)
    dt = t - t.mean()
    slope = (dt * (y - y.mean())).sum() / (dt ** 2).sum()
    intercept = y.mean() - slope * t.mean()
    k = -slope
    if k <= 0:
        raise ValueError("the data do not decay")
    return math.exp(intercept), k

def fit_decay(ts, counts):
    N0, k = _fit(ts, counts)
    sig = lambda v: float(f"{v:.4g}")
    return sig(N0), sig(k), sig(math.log(2) / k)

def predict_counts(N0, k, t):
    return N0 * np.exp(-k * np.asarray(t, dtype=float))

def residual_ratio(ts, counts):
    N0, k = _fit(ts, counts)
    pred = predict_counts(N0, k, ts)
    return round(float(np.abs(np.asarray(counts, dtype=float) / pred - 1).max()), 4)

print(fit_decay([0, 10, 20], [800, 400, 200]))
```

```python test
import ast as _ast
for _n in ["fit_decay", "predict_counts", "residual_ratio"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert not (_attrs & {"polyfit", "lstsq", "linregress", "curve_fit"}), "Use the least-squares formulas."
assert fit_decay([0, 10, 20], [800, 400, 200]) == (800.0, 0.06931, 10.0), f"Exact halving every 10 min; got {fit_decay([0, 10, 20], [800, 400, 200])}."
_rng = np.random.default_rng(61)
_t = np.arange(0, 60, 2.0)
_c = 5000 * np.exp(-0.035 * _t) * (1 + _rng.normal(0, 0.02, _t.size))
_N0, _k, _h = fit_decay(_t, _c)
assert abs(_k - 0.035) < 0.002 and abs(_h - math.log(2) / 0.035) < 1.5 and abs(_N0 - 5000) < 150, f"Noisy data: k ≈ 0.035, t½ ≈ 19.8 min; got {(_N0, _k, _h)}."
assert np.allclose(predict_counts(800, math.log(2) / 10, [0, 10, 30]), [800, 400, 100]), "Predictions on arrays."
assert residual_ratio([0, 10, 20], [800, 400, 200]) == 0.0 and 0 < residual_ratio(_t, _c) < 0.08, "Residual ratios."
for _bad in [([0, 1], [5, 0]), ([0, 1, 2], [5, 6]), ([0], [5]), ([0, 1, 2], [5, 6, 7])]:
    try:
        fit_decay(*_bad)
        assert False, f"fit_decay{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A logarithm straightens an exponential, and a straight-line fit through noisy counts measures the half-life."
```

Hint: Fit y = ln(count) against t with slope = Σ(t − t̄)(y − ȳ)/Σ(t − t̄)² and intercept ȳ − slope × t̄. Then k = −slope and N₀ = e^intercept.
:::

## What you learned

- A constant factor r per step gives N₀rⁿ; growth by a fraction p doubles in ln 2 / ln(1 + p) steps, about 70/p for p in percent. Exponential growth eventually overtakes any linear growth.
- Compounding ever more often tends to eᵏ; continuous proportional change dN/dt = kN gives N₀e^(kt).
- Decay has a time constant τ (36.8% left after τ) and a half-life t½ = τ ln 2; any equal time window loses the same fraction.
- In Newton's law of cooling the temperature gap decays exponentially; two readings fix k and predict every later temperature.
- Euler's method on exponential growth is compound interest with too few payments, so it lags the exact solution.

The next lesson studies the inverse of the exponential, the logarithm, and the log scales built on it.
