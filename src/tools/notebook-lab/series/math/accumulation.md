# Accumulation: from rate back to total

A speedometer shows speed, but a trip computer reports distance. A flow meter shows litres per minute, but the bill is for litres. A power meter shows kilowatts, but energy is charged in kilowatt-hours. Each time a total is rebuilt from a rate, the computation is the reverse of differentiation: **accumulation**, which calculus calls **integration**. Geometrically it is the area under the rate's graph. This lesson computes such areas with rectangles and trapezoids, measures how fast each method converges, builds the running total that turns a velocity log into a position log, and meets the fundamental theorem of calculus, which says that accumulating and differentiating undo each other.

This lesson covers:

- total change as the area under a rate graph;
- Riemann sums: left, right and midpoint rectangles;
- the trapezoid rule, and how quickly each rule's error shrinks;
- running totals, and position from a velocity log;
- antiderivatives, SymPy's `integrate`, and the fundamental theorem.

## Area under a rate

::: math
\[ \int_a^b v(t)\,dt \approx \sum_{i=0}^{n-1} v(t_i^*)\,\Delta t, \qquad \Delta t = \frac{b - a}{n} \]
- $t_i^*$: the sample point in strip $i$ (left end, right end or midpoint)
- for $v(t) = 0.3t^2$ the exact distance over 10 s is 100 m
In code: `riemann(f, a, b, n, rule)` with `rule` set to `"left"`, `"right"` or `"midpoint"`
:::


If a car travels at a constant 20 m/s for 30 s, it covers 20 × 30 = 600 m: the area of the rectangle under the flat speed graph. When the speed varies, cut time into short intervals, treat the speed as constant within each, and add up speed × time for every interval. Each term is the area of a thin rectangle, and their sum, a **Riemann sum**, approximates the area under the curve. As the intervals shrink, the sum approaches the exact total, the **definite integral**

\[ \int_a^b v(t)\,dt \]

The integral sign is a stretched S, for sum, and dt recalls the width Δt of the rectangles. Predict before running: a car accelerating as v(t) = 0.3t² m/s for 10 s. Do left rectangles over- or underestimate the distance?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def v(t):
    return 0.3 * t ** 2

def riemann(f, a, b, n, rule):
    h = (b - a) / n
    left = a + h * np.arange(n)
    points = {"left": left, "right": left + h, "midpoint": left + h / 2}[rule]
    return h * f(points).sum()

exact = 0.1 * 10 ** 3
for rule in ["left", "right", "midpoint"]:
    print(f"{rule:>8} with 10 rectangles: {riemann(v, 0, 10, 10, rule):7.2f} m   (exact {exact:.0f} m)")

fig, ax = plt.subplots(figsize=(6, 3.2))
ts = np.linspace(0, 10, 200)
ax.plot(ts, v(ts), color="black")
ax.bar(np.arange(10), v(np.arange(10)), width=1, align="edge", alpha=0.4, edgecolor="C0", label="left rectangles")
ax.set_xlabel("time (s)")
ax.set_ylabel("speed (m/s)")
ax.legend()
plt.show()
```

```output
    left with 10 rectangles:   85.50 m   (exact 100 m)
   right with 10 rectangles:  115.50 m   (exact 100 m)
midpoint with 10 rectangles:   99.75 m   (exact 100 m)
```

The exact distance, 100 m, comes from reversing the power rule, as shown later in the lesson.

The car speeds up throughout, so each left rectangle uses the slowest speed in its interval and the left sum underestimates (85.5 m); the right sum overestimates (115.5 m). The midpoint rule, which samples each interval in its centre, gives 99.75 m, far closer than either for the same ten function evaluations.

## Trapezoids and convergence

::: math
\[ \int_a^b f(x)\,dx \approx h\left(\frac{y_0 + y_n}{2} + y_1 + \dots + y_{n-1}\right), \qquad h = \frac{b - a}{n} \]
- trapezoid rule: straight lines between samples, error proportional to $h^2$
- left and right sums have error proportional to $h$
In code: `(b - a) / n * (ys.sum() - (ys[0] + ys[-1]) / 2)`, or `np.trapezoid(ys, xs)`
:::


Averaging the left and right sums gives the **trapezoid rule**: join neighbouring points with straight lines instead of flat tops, so each strip is a trapezoid of area h (y_i + y_{i+1})/2. It only needs the samples themselves, which makes it the standard tool for logged data. NumPy provides it as `np.trapezoid`.

How fast do the methods converge? Left and right sums have errors proportional to h, like forward differences. The midpoint and trapezoid rules have errors proportional to h², so doubling the number of strips quarters their error. Predict before running: integrating sin x from 0 to π (exactly 2), how many strips does each rule need for an error below 10⁻⁶?

```python type
def trapezoid(f, a, b, n):
    xs = np.linspace(a, b, n + 1)
    ys = f(xs)
    return (b - a) / n * (ys.sum() - (ys[0] + ys[-1]) / 2)

print(f"{'n':>6} {'left error':>12} {'midpoint error':>15} {'trapezoid error':>16}")
for n in [10, 20, 40, 80, 1000]:
    print(f"{n:>6} {riemann(np.sin, 0, math.pi, n, 'left') - 2:>12.2e} {riemann(np.sin, 0, math.pi, n, 'midpoint') - 2:>15.2e} {trapezoid(np.sin, 0, math.pi, n) - 2:>16.2e}")
print("np.trapezoid agrees:", math.isclose(np.trapezoid(np.sin(np.linspace(0, math.pi, 81)), np.linspace(0, math.pi, 81)), trapezoid(np.sin, 0, math.pi, 80)))
```

```output
     n   left error  midpoint error  trapezoid error
    10    -1.65e-02        8.25e-03        -1.65e-02
    20    -4.11e-03        2.06e-03        -4.11e-03
    40    -1.03e-03        5.14e-04        -1.03e-03
    80    -2.57e-04        1.29e-04        -2.57e-04
  1000    -1.64e-06        8.22e-07        -1.64e-06
np.trapezoid agrees: True
```

The trapezoid formula adds every sample with full weight and then removes half of each end sample, since the ends belong to only one strip.

For sin x on [0, π] the left error happens to look second order too, because the function is zero at both ends, which makes the left and trapezoid sums identical here. Midpoint and trapezoid errors drop fourfold each time n doubles, and their errors have opposite signs, with the midpoint's about half as large. By n = 1000 both are within 2 × 10⁻⁶ of the exact 2. Since the errors fall as 1/n², an error below 10⁻⁶ needs about 910 strips for the midpoint rule and about 1,280 for the trapezoid rule. The calculus block derives these error rates and Simpson's rule, which combines the two to reach h⁴.

## Running totals

::: math
\[ x_i = x_0 + \sum_{j=0}^{i-1} \Delta t_j\,\frac{v_j + v_{j+1}}{2} \]
- the running total: position at every moment, not only at the end
- it undoes differencing; summing averages noise away
In code: `strips = np.diff(t_log) * (speed_log[:-1] + speed_log[1:]) / 2`, then `np.cumsum(strips)`
:::


Often the whole history matters, not just the final total: position at every moment, not only the end of the trip. The **running total**, or cumulative integral, adds strip after strip and records the sum so far. With samples (t_i, v_i), the cumulative trapezoid gives x_i = x_0 + Σ over the strips so far of Δt (v_{j} + v_{j+1})/2. This is the reverse of the `np.diff` of the arrays lesson: differences turn positions into speeds, and running totals turn speeds back into positions.

A delivery van's GPS fails, but its speedometer logs every 2 seconds. Predict before running: how far does it travel in 3 minutes, and where was it after 1 minute?

```python type
rng = np.random.default_rng(51)
t_log = np.arange(0, 181, 2.0)
speed_log = np.clip(12 + 6 * np.sin(t_log / 25) - 4 * (t_log > 120) * (t_log - 120) / 30, 0, None) + rng.normal(0, 0.3, t_log.size)

strips = np.diff(t_log) * (speed_log[:-1] + speed_log[1:]) / 2
position = np.concatenate(([0.0], np.cumsum(strips)))
print(f"distance after 3 min: {position[-1]:.0f} m  (np.trapezoid: {np.trapezoid(speed_log, t_log):.0f} m)")
print(f"position after 1 min: {position[t_log == 60][0]:.0f} m")
print("differencing the positions recovers the strip-average speeds:", np.allclose(np.diff(position) / np.diff(t_log), (speed_log[:-1] + speed_log[1:]) / 2))
```

```output
distance after 3 min: 1976 m  (np.trapezoid: 1976 m)
position after 1 min: 981 m
differencing the positions recovers the strip-average speeds: True
```

The speed log is simulated: a varying cruise, slowing from 2 minutes onward, plus sensor noise. `np.clip(..., 0, None)` stops the model speed from going negative.

The van covers about 1,980 m in three minutes and is about 980 m along after one. Differencing the running total gives back the average speed of each strip exactly: accumulation and differencing are inverse operations. Noise in the speed matters much less here than in the derivative lesson, because summing averages the noise out, while differencing amplifies it. Integration smooths; differentiation roughens.

## Antiderivatives and the fundamental theorem

::: math
\[ \int_a^b f(t)\,dt = F(b) - F(a) \quad \text{whenever } F' = f, \qquad \int t^n\,dt = \frac{t^{n+1}}{n + 1} \;\;(n \ne -1) \]
- $F$: an antiderivative of $f$; this is the fundamental theorem of calculus
- $\int_0^{10} 0.3t^2\,dt = 0.1 \times 10^3 - 0 = 100$
In code: `sp.integrate(expr, t)` for the antiderivative, `sp.integrate(expr, (t, a, b))` for the area
:::


Exact areas come from running the derivative backwards. A function F whose derivative is f is an **antiderivative** of f. The **fundamental theorem of calculus** says the total change of F equals the accumulated rate:

\[ \int_a^b f(t)\,dt = F(b) - F(a) \quad \text{whenever } F' = f \]

Reversing the power rule, an antiderivative of tⁿ is tⁿ⁺¹/(n + 1) for n ≠ −1. For the car, an antiderivative of 0.3t² is 0.1t³, so the distance over 10 s is 0.1 × 10³ − 0 = 100 m, the exact value used above. SymPy finds antiderivatives symbolically with `integrate`. Predict before running: what are the exact integrals of sin x from 0 to π and of e^(−t/20) from 0 to 60?

```python type
import sympy as sp

t, x = sp.symbols("t x")
print("antiderivative of 0.3t²:", sp.integrate(sp.Rational(3, 10) * t ** 2, t))
print("∫ 0.3t² dt from 0 to 10 =", sp.integrate(sp.Rational(3, 10) * t ** 2, (t, 0, 10)))
print("∫ sin x dx from 0 to π =", sp.integrate(sp.sin(x), (x, 0, sp.pi)))
cooling = sp.integrate(sp.exp(-t / 20), (t, 0, 60))
print("∫ e^(-t/20) dt from 0 to 60 =", cooling, "≈", float(cooling))
print("trapezoid with 600 strips:", trapezoid(lambda s: np.exp(-s / 20), 0, 60, 600))
```

```output
antiderivative of 0.3t²: t**3/10
∫ 0.3t² dt from 0 to 10 = 100
∫ sin x dx from 0 to π = 2
∫ e^(-t/20) dt from 0 to 60 = 20 - 20*exp(-3) ≈ 19.00425863264272
trapezoid with 600 strips: 19.004298224831707
```

`sp.integrate(expr, t)` returns an antiderivative; `sp.integrate(expr, (t, a, b))` returns the definite integral from a to b.

SymPy returns exact answers: 100, 2, and 20 − 20e⁻³ ≈ 19.004, which the trapezoid rule matches to four decimal places. An antiderivative turns an infinite sum into two evaluations. It is the exact route when a formula exists; numerical rules handle data and formulas without antiderivatives (such as e^(−x²), whose integral defines the error function of statistics).

::: challenge Riemann sums [easy]
Write `riemann_sum(f, a, b, n, rule="midpoint")` with `rule` one of `"left"`, `"right"` or `"midpoint"`, using n equal strips. f is called on one number at a time (do not assume it accepts arrays). Raise `ValueError` for n < 1, a > b, or an unknown rule; a == b gives 0.0. Return a float. Then write `strips_needed(f, a, b, exact, tol, rule="midpoint")`: the smallest n among 1, 2, 4, 8, ... (doubling) for which the rule's error is at most `tol`, giving up with `ValueError` beyond n = 2²⁰.

```python starter
def riemann_sum(f, a, b, n, rule="midpoint"):
    return 0.0

def strips_needed(f, a, b, exact, tol, rule="midpoint"):
    return 1

print(riemann_sum(lambda t: 0.3 * t ** 2, 0, 10, 10, "left"))
```

```python solution
def riemann_sum(f, a, b, n, rule="midpoint"):
    if n < 1 or a > b:
        raise ValueError("need n >= 1 and a <= b")
    offsets = {"left": 0.0, "right": 1.0, "midpoint": 0.5}
    if rule not in offsets:
        raise ValueError(f"unknown rule {rule!r}")
    h = (b - a) / n
    return float(sum(f(a + (i + offsets[rule]) * h) for i in range(n)) * h)

def strips_needed(f, a, b, exact, tol, rule="midpoint"):
    n = 1
    while n <= 2 ** 20:
        if abs(riemann_sum(f, a, b, n, rule) - exact) <= tol:
            return n
        n *= 2
    raise ValueError("tolerance not reached")

print(riemann_sum(lambda t: 0.3 * t ** 2, 0, 10, 10, "left"))
```

```python test
for _n in ["riemann_sum", "strips_needed"]:
    assert _n in dir(), f"Define {_n}."
_v = lambda t: 0.3 * t ** 2
assert abs(riemann_sum(_v, 0, 10, 10, "left") - 85.5) < 1e-9 and abs(riemann_sum(_v, 0, 10, 10, "right") - 115.5) < 1e-9 and abs(riemann_sum(_v, 0, 10, 10) - 99.75) < 1e-9, "The lesson's car."
assert riemann_sum(math.sin, 1, 1, 5) == 0.0 and type(riemann_sum(math.sin, 0, 1, 3)) is float, "Zero width gives 0.0; return a float."
assert abs(riemann_sum(math.exp, 0, 1, 2000) - (math.e - 1)) < 1e-7, "Works with functions that only take numbers."
for _bad in [(0, 1, 0, "left"), (2, 1, 5, "left"), (0, 1, 5, "simpson")]:
    try:
        riemann_sum(math.sin, *_bad)
        assert False, f"riemann_sum with {_bad} should raise ValueError."
    except ValueError:
        pass
assert strips_needed(math.sin, 0, math.pi, 2, 1e-6) == 1024, f"Midpoint needs 1024 strips for 1e-6; got {strips_needed(math.sin, 0, math.pi, 2, 1e-6)}."
assert strips_needed(lambda t: t, 0, 4, 8, 1e-12) == 1, "Midpoint is exact for straight lines."
assert strips_needed(lambda t: t ** 2, 0, 1, 1 / 3, 1e-3, "right") == 512, "First order converges slowly."
try:
    strips_needed(math.sin, 0, math.pi, 3, 1e-6)
    assert False, "A wrong exact value is never reached: raise ValueError."
except ValueError:
    pass
"SUCCESS: Rectangles approximate area; where you sample each strip decides whether the error falls like h or like h²."
```

Hint: With h = (b − a)/n, strip i samples f at a + (i + offset) h, where the offset is 0, 1 or 0.5. Multiply the sum by h. For `strips_needed`, loop with n doubling.
:::

::: challenge Totals from logged data [medium]
Write `trapezoid_total(ts, ys)` returning the trapezoid-rule integral of logged samples, which may be **unevenly spaced**, as a float, without `np.trapezoid` or `np.trapz`. Then write `running_total(ts, ys, start=0.0)` returning a NumPy array of the same length: the cumulative trapezoid integral from the first sample, plus `start`. Both raise `ValueError` if the lengths differ, there are fewer than 2 samples, or the times are not strictly increasing. Inputs may be lists or arrays. Finally, write `energy_kwh(ts_seconds, power_kw)`, the energy in kilowatt-hours from a power log in kW with times in seconds, rounded to 4 decimal places.

```python starter
def trapezoid_total(ts, ys):
    return 0.0

def running_total(ts, ys, start=0.0):
    return np.zeros(len(ts))

def energy_kwh(ts_seconds, power_kw):
    return 0.0

print(trapezoid_total([0, 1, 3], [0, 2, 2]))
```

```python solution
def _check(ts, ys):
    ts, ys = np.asarray(ts, dtype=float), np.asarray(ys, dtype=float)
    if len(ts) != len(ys) or len(ts) < 2:
        raise ValueError("need equal-length logs of at least 2 samples")
    if np.any(np.diff(ts) <= 0):
        raise ValueError("times must be strictly increasing")
    return ts, ys

def trapezoid_total(ts, ys):
    ts, ys = _check(ts, ys)
    return float((np.diff(ts) * (ys[:-1] + ys[1:]) / 2).sum())

def running_total(ts, ys, start=0.0):
    ts, ys = _check(ts, ys)
    strips = np.diff(ts) * (ys[:-1] + ys[1:]) / 2
    return start + np.concatenate(([0.0], np.cumsum(strips)))

def energy_kwh(ts_seconds, power_kw):
    return round(trapezoid_total(ts_seconds, power_kw) / 3600, 4)

print(trapezoid_total([0, 1, 3], [0, 2, 2]))
```

```python test
import ast as _ast
for _n in ["trapezoid_total", "running_total", "energy_kwh"]:
    assert _n in dir(), f"Define {_n}."
_attrs = {_x.attr for _x in _ast.walk(_ast.parse(_source)) if isinstance(_x, _ast.Attribute)}
assert not (_attrs & {"trapezoid", "trapz", "cumulative_trapezoid"}), "Add up the trapezoids yourself."
assert trapezoid_total([0, 1, 3], [0, 2, 2]) == 5.0, "Uneven strips: 1 + 4."
assert type(trapezoid_total([0, 1], [1, 1])) is float, "Return a plain Python float (wrap the NumPy result with float(...))."
_t = np.sort(np.random.default_rng(52).uniform(0, 5, 400))
assert abs(trapezoid_total(_t, _t ** 2) - (_t[-1] ** 3 - _t[0] ** 3) / 3) < 1e-3, "Close to the exact integral on dense uneven samples."
_r = running_total([0, 1, 3], [0, 2, 2], start=10)
assert isinstance(_r, np.ndarray) and np.allclose(_r, [10, 11, 15]), f"Running total with a start value; got {_r}."
_tt = np.linspace(0, 2, 201)
assert np.allclose(np.diff(running_total(_tt, np.cos(_tt))) / np.diff(_tt), (np.cos(_tt[:-1]) + np.cos(_tt[1:])) / 2), "Differencing the running total recovers the strip averages."
for _bad in [([0, 1], [1]), ([0], [1]), ([0, 2, 1], [1, 1, 1]), ([0, 0, 1], [1, 1, 1])]:
    try:
        trapezoid_total(*_bad)
        assert False, f"trapezoid_total{_bad} should raise ValueError."
    except ValueError:
        pass
assert energy_kwh([0, 1800, 3600], [2, 2, 2]) == 2.0 and energy_kwh([0, 3600], [0, 3]) == 1.5, "kW × hours."
"SUCCESS: Strip by strip, the trapezoid rule turns any log of a rate into a total and a running total, however unevenly it was sampled."
```

Hint: Each strip has width `np.diff(ts)` and average height `(ys[:-1] + ys[1:]) / 2`. Their sum is the total; `np.cumsum` with a 0 in front gives the running total. A kW·s is 1/3600 of a kWh.
:::

::: challenge Simpson's rule and adaptivity [hard]
**Simpson's rule** fits a parabola through each pair of strips: with an even number n of strips of width h, ∫ ≈ (h/3)(y₀ + 4y₁ + 2y₂ + 4y₃ + ... + 4y_{n−1} + y_n). Write `simpson(f, a, b, n)`, raising `ValueError` if n is odd or less than 2. f takes one number at a time.

Smooth regions need few strips while sharp features need many, so **adaptive** integration spends effort where it is needed. Write `adaptive(f, a, b, tol=1e-8)`: compute Simpson with 2 strips on [a, b] (call it S) and on each half (S_left + S_right); if |S_left + S_right − S| ≤ 15 × tol, accept S_left + S_right + (S_left + S_right − S)/15; otherwise apply the same procedure to each half with tolerance tol/2 and add the results. Stop splitting below a depth of 40 (accept the estimate there). Return `(value, evaluations)`, where evaluations counts the calls to f. Use caching or pass values down so that each point is evaluated only once; the test checks the count.

```python starter
def simpson(f, a, b, n):
    return 0.0

def adaptive(f, a, b, tol=1e-8):
    return (simpson(f, a, b, 1000), 1001)

print(simpson(math.sin, 0, math.pi, 10))
```

```python solution
def simpson(f, a, b, n):
    if n < 2 or n % 2:
        raise ValueError("n must be an even number of at least 2")
    h = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        total += (4 if i % 2 else 2) * f(a + i * h)
    return total * h / 3

def adaptive(f, a, b, tol=1e-8):
    count = [0]
    def F(x):
        count[0] += 1
        return f(x)

    def recurse(a, b, fa, fm, fb, whole, tol, depth):
        m = (a + b) / 2
        lm, rm = (a + m) / 2, (m + b) / 2
        flm, frm = F(lm), F(rm)
        left = (m - a) / 6 * (fa + 4 * flm + fm)
        right = (b - m) / 6 * (fm + 4 * frm + fb)
        diff = left + right - whole
        if depth >= 40 or abs(diff) <= 15 * tol:
            return left + right + diff / 15
        return recurse(a, m, fa, flm, fm, left, tol / 2, depth + 1) + recurse(m, b, fm, frm, fb, right, tol / 2, depth + 1)

    fa, fm, fb = F(a), F((a + b) / 2), F(b)
    whole = (b - a) / 6 * (fa + 4 * fm + fb)
    return recurse(a, b, fa, fm, fb, whole, tol, 0), count[0]

print(simpson(math.sin, 0, math.pi, 10))
```

```python test
for _n in ["simpson", "adaptive"]:
    assert _n in dir(), f"Define {_n}."
assert abs(simpson(math.sin, 0, math.pi, 10) - 2.0001095) < 1e-6, f"Simpson with 10 strips; got {simpson(math.sin, 0, math.pi, 10)}."
assert abs(simpson(lambda x: x ** 3, 0, 2, 2) - 4) < 1e-12, "Simpson is exact for cubics."
for _bad in [3, 0, 1]:
    try:
        simpson(math.sin, 0, 1, _bad)
        assert False, f"n = {_bad} should raise ValueError."
    except ValueError:
        pass
_val, _cnt = adaptive(math.sin, 0, math.pi)
assert abs(_val - 2) < 1e-8, f"Adaptive sin: {_val}."
_val, _cnt = adaptive(math.sqrt, 0, 1, 1e-8)
assert abs(_val - 2 / 3) < 1e-7, f"√x has an infinitely steep start; got {_val}."
_calls = [0]
def _peak(x):
    _calls[0] += 1
    return 1 / (1e-4 + (x - 0.3) ** 2)
_val, _cnt = adaptive(_peak, 0, 1, 1e-6)
_exact = 100 * (math.atan(0.7 / 0.01) + math.atan(0.3 / 0.01))
assert abs(_val - _exact) < 1e-4, f"A sharp peak; expected {_exact:.6f}, got {_val:.6f}."
assert _cnt == _calls[0], f"Count every call to f: you reported {_cnt}, f was called {_calls[0]} times."
assert _cnt < 3000, f"{_cnt} evaluations: reuse the values you already have instead of recomputing them."
"SUCCESS: Parabolas through pairs of strips give h⁴ accuracy, and splitting only where the estimate is unsure concentrates the work around the peak."
```

Hint: Simpson on [a, b] with 2 strips is (b − a)/6 × (f(a) + 4f(m) + f(b)). Pass f(a), f(m), f(b) and the whole-interval estimate into the recursive call, so each level only evaluates the two new quarter points. Wrap f in a counting function.
:::

## What you learned

- Total change is the area under a rate graph, the definite integral ∫ₐᵇ f(t) dt, approximated by Riemann sums of thin rectangles.
- Left and right sums have errors proportional to h; the midpoint and trapezoid rules, proportional to h², converge far faster for the same work.
- Running totals (cumulative trapezoids) rebuild position from velocity; differencing undoes them. Integration averages out noise, while differentiation amplifies it.
- The fundamental theorem: ∫ₐᵇ f dt = F(b) − F(a) for any antiderivative F; reversing the power rule gives tⁿ⁺¹/(n + 1), and SymPy's `integrate` does it symbolically.
- Simpson's rule fits parabolas (error h⁴); adaptive integration refines only where needed.

The next lesson uses accumulation to measure work and energy.
