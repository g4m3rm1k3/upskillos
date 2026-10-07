# Differential equations: laws as rates

Physical laws rarely say what a quantity **is**. They say how fast it **changes**. A hot part loses heat at a rate proportional to how much hotter it is than the room. Water leaves a tank through a hole at a speed set by the depth above it. A tank fills at the inflow rate minus the outflow rate. Each statement is an equation involving a derivative, a **differential equation**, and solving it means finding the function whose rate of change obeys the law. Earlier lessons solved a few of these by stepping (Newton's law) or by spotting the answer (exponential decay). This lesson treats them as a subject: writing laws as rates, seeing their solutions in a direction field, finding equilibria and their stability, solving accurately with SciPy, and checking against exact solutions where they exist.

This lesson covers:

- writing a physical law as dy/dt = f(t, y);
- direction fields: seeing every solution at once;
- the draining tank (Torricelli's law) and its exact solution;
- equilibria, and whether they are stable;
- accurate solutions with `scipy.integrate.solve_ivp`, including stopping events;
- exact solutions of separable equations with SymPy.

## Laws as rates

::: math
\[ \frac{dy}{dt} = f(t, y), \quad y(t_0) = y_0, \qquad \text{Torricelli: } \frac{dh}{dt} = -\frac{a}{A}\sqrt{2gh} \]
- $h$: water depth; $A$: tank cross-section; $a$: hole area
- Euler's method: $y_{k+1} = y_k + f(t_k, y_k)\,\Delta t$
In code: `tank_rate(t, h)` is the right-hand side; `euler(f, t0, y0, dt, n)` steps it
:::


A **first-order ordinary differential equation** (ODE) gives the rate of change of a quantity y as a function of time and of y itself:

\[ \frac{dy}{dt} = f(t, y) \]

together with a starting value y(t₀) = y₀, an **initial value problem**. Newton's law of cooling is dT/dt = −k(T − T_room). A tank of cross-section A draining through a hole of area a obeys **Torricelli's law**: water leaves at speed √(2gh), the speed of a fall from height h (an ideal hole: a real sharp-edged orifice passes only about 60% of this flow, a discharge coefficient that simply scales a), so

\[ \frac{dh}{dt} = -\frac{a}{A}\sqrt{2 g h} \]

The right-hand side is the whole law; solving is a separate job. Euler's method from the motion lesson is the simplest solver: step y by f(t, y) Δt. Predict before running: a 1 m² tank with a 10 cm² hole holds water 1 m deep. Does it empty at a steady rate?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp
import sympy as sp

g, A_tank, a_hole = 9.81, 1.0, 0.001

def tank_rate(t, h):
    return -(a_hole / A_tank) * math.sqrt(2 * g * max(h, 0.0))

def euler(f, t0, y0, dt, n):
    ts, ys = [t0], [y0]
    for _ in range(n):
        ys.append(ys[-1] + f(ts[-1], ys[-1]) * dt)
        ts.append(ts[-1] + dt)
    return np.array(ts), np.array(ys)

ts, hs = euler(tank_rate, 0.0, 1.0, 1.0, 460)
empty_index = np.argmax(hs <= 0) if np.any(hs <= 0) else None
for t_check in [0, 100, 200, 300, 400]:
    print(f"t = {t_check:>3} s: depth {hs[t_check]:.3f} m, falling at {-tank_rate(0, hs[t_check]) * 1000:.2f} mm/s")
```

```output
t =   0 s: depth 1.000 m, falling at 4.43 mm/s
t = 100 s: depth 0.606 m, falling at 3.45 mm/s
t = 200 s: depth 0.310 m, falling at 2.46 mm/s
t = 300 s: depth 0.112 m, falling at 1.48 mm/s
t = 400 s: depth 0.012 m, falling at 0.49 mm/s
```

`max(h, 0.0)` stops the square root from failing if a step overshoots slightly below zero.

The tank does not empty steadily. It drains fastest when full, about 4.4 mm/s, and ever more slowly as the depth falls, because the outflow speed depends on the depth. A rate law like this cannot be answered by "volume divided by flow rate", because the flow rate keeps changing.

## Direction fields

::: math
\[ \frac{dT}{dt} = -k\,(T - T_\text{room}) \]
- at each grid point $(t, T)$, draw a short segment with this slope
- every solution curve follows the segments
In code: `slope = -k * (TT - 20)`, drawn with `ax.quiver`
:::


At every point (t, y), the ODE gives the slope of the solution passing through it. Drawing short line segments with those slopes over a grid gives a **direction field**: every solution is a curve that follows the segments, like a leaf floating on a stream. One picture shows the behaviour of all solutions at once, from every starting value. Predict before running: for the cooling law with T_room = 20 °C, what do solutions starting above and below 20 °C do?

```python type
k = 0.1
tt, TT = np.meshgrid(np.linspace(0, 40, 21), np.linspace(0, 100, 21))
slope = -k * (TT - 20)
norm = np.hypot(1, slope)
fig, ax = plt.subplots(figsize=(7, 3.6))
ax.quiver(tt, TT, 1 / norm, slope / norm, angles="xy", color="grey", width=0.003)
for T0 in [95, 60, 20, 5]:
    t_line = np.linspace(0, 40, 200)
    ax.plot(t_line, 20 + (T0 - 20) * np.exp(-k * t_line), label=f"T0 = {T0} °C")
ax.set_xlabel("time (min)")
ax.set_ylabel("temperature (°C)")
ax.legend(fontsize=8)
plt.show()
print("slope at T = 95 °C:", -k * (95 - 20), "°C/min;  at 20 °C:", -k * (20 - 20), ";  at 5 °C:", -k * (5 - 20))
```

```output
slope at T = 95 °C: -7.5 °C/min;  at 20 °C: -0.0 ;  at 5 °C: 1.5
```

Each arrow has horizontal component 1 (one unit of time) and vertical component the slope, scaled to the same length so the field is readable.

Every solution heads for 20 °C: from above the slopes are negative, from below positive, and on the line T = 20 the slope is exactly zero. Hot parts cool, cold parts warm, and a part at room temperature stays there. The direction field shows this without solving anything.

## Equilibria and stability

::: math
\[ f(y^*) = 0, \qquad f'(y^*) < 0 \Rightarrow \text{stable}, \qquad h^* = \frac{(Q/a)^2}{2g} \]
- an equilibrium $y^*$ is a level where the rate is zero
- the fed tank: $\dfrac{dh}{dt} = \dfrac{Q - a\sqrt{2gh}}{A}$, so inflow equals outflow at $h^*$
In code: `fed_tank(t, h)` and `h_star = (Q / a_hole) ** 2 / (2 * g)`
:::


A value y* where f(y*) = 0 is an **equilibrium**: a solution that starts there stays there. It is **stable** if nearby solutions move towards it, which for dy/dt = f(y) means f is positive just below y* and negative just above it. If f′(y*) < 0 that sign pattern is guaranteed, so the equilibrium is stable; if f′(y*) > 0 it is unstable, with nearby solutions moving away (and if f′(y*) = 0 the test is inconclusive).

A tank fed by a constant inflow Q while draining through the hole obeys dh/dt = (Q − a√(2gh))/A. Setting the rate to zero gives the level where inflow equals outflow, h* = (Q/a)²/(2g). Predict before running: with Q = 2 litres per second, what level does the tank settle at, whether it starts empty or overfull?

```python type
Q = 0.002

def fed_tank(t, h):
    return (Q - a_hole * math.sqrt(2 * g * max(h, 0.0))) / A_tank

h_star = (Q / a_hole) ** 2 / (2 * g)
print(f"equilibrium level h* = {h_star:.4f} m")
for h0 in [0.0, 0.5, 1.0]:
    ts, hs = euler(fed_tank, 0.0, h0, 1.0, 3000)
    print(f"start {h0} m: after 10 min {hs[600]:.4f} m, after 50 min {hs[3000]:.4f} m")
eps = 1e-6
print(f"f'(h*) ≈ {(fed_tank(0, h_star + eps) - fed_tank(0, h_star - eps)) / (2 * eps):.6f} per second (negative: stable)")
```

```output
equilibrium level h* = 0.2039 m
start 0.0 m: after 10 min 0.1960 m, after 50 min 0.2039 m
start 0.5 m: after 10 min 0.2246 m, after 50 min 0.2039 m
start 1.0 m: after 10 min 0.2836 m, after 50 min 0.2039 m
f'(h*) ≈ -0.004905 per second (negative: stable)
```

The derivative of the rate function at the equilibrium is estimated with a central difference, as in the derivative lesson.

The tank settles at about 0.204 m from every starting level: below it, inflow beats outflow and the level rises; above it, the opposite. The derivative of the rate function at h* is negative, confirming stability. Its size, about 0.0049 per second, sets how fast the level settles: a time constant of roughly 200 s, consistent with the level still creeping after 10 minutes and settled after 50.

## Accurate solutions with SciPy

::: math
\[ u = \sqrt{h} \;\Longrightarrow\; \frac{du}{dt} = -\frac{a}{A}\sqrt{\frac{g}{2}}, \qquad T_\text{empty} = \frac{A}{a}\sqrt{\frac{2h_0}{g}} \]
- $\sqrt{h}$ falls at a constant rate, giving the exact emptying time
- adaptive Runge–Kutta (RK45) controls its own step to meet a tolerance
In code: `solve_ivp(..., events=empty, rtol=1e-10, atol=1e-12)` against `exact = (A_tank / a_hole) * math.sqrt(2 * 1.0 / g)`
:::


Euler's method is first order: its error shrinks only in proportion to the step. Professional solvers use higher-order methods with automatic step-size control. SciPy's `solve_ivp` uses an adaptive **Runge–Kutta** method (RK45) by default: it takes large steps where the solution is smooth and small ones where it changes quickly, keeping an error estimate below the tolerances `rtol` and `atol` you set. It can also stop at an **event**, such as the tank becoming empty, located precisely.

For the draining tank, the substitution u = √h turns Torricelli's law into du/dt = −(a/A)√(g/2), a constant, so √h falls linearly and the tank empties at exactly T = (A/a)√(2h₀/g). Predict before running: how close do Euler with 1-second steps and `solve_ivp` come to the exact emptying time?

```python type
def empty(t, h):
    return h[0] - 1e-9
empty.terminal = True

sol = solve_ivp(lambda t, h: [tank_rate(t, h[0])], (0, 1000), [1.0], events=empty, rtol=1e-10, atol=1e-12)
exact = (A_tank / a_hole) * math.sqrt(2 * 1.0 / g)
ts, hs = euler(tank_rate, 0.0, 1.0, 1.0, 1000)
euler_empty = ts[np.argmax(hs <= 1e-9)]
print(f"exact {exact:.3f} s, solve_ivp {sol.t_events[0][0]:.3f} s ({len(sol.t)} steps), Euler (1 s steps) {euler_empty:.0f} s")
t_check = 200.0
exact_h = (math.sqrt(1.0) - (a_hole / A_tank) * math.sqrt(g / 2) * t_check) ** 2
dense = solve_ivp(lambda t, h: [tank_rate(t, h[0])], (0, t_check), [1.0], rtol=1e-10, atol=1e-12)
print(f"depth at 200 s: exact {exact_h:.6f} m, solve_ivp {dense.y[0, -1]:.6f} m")
```

```output
exact 451.524 s, solve_ivp 451.509 s (159 steps), Euler (1 s steps) 448 s
depth at 200 s: exact 0.310311 m, solve_ivp 0.310311 m
```

The event function returns zero when the tank is empty (with a tiny offset so the solver meets it cleanly); `terminal = True` tells the solver to stop there. `sol.t_events[0]` lists the times the event occurred.

`solve_ivp` reports 451.509 s, 15 ms before the exact 451.524 s, using about 160 adaptive steps. That small gap is not solver error: the event fires at a depth of 10⁻⁹ m, and the last nanometre takes the remaining 0.014 s to drain, because the flow is so slow at the bottom. The depth at 200 s agrees to six decimals. Euler with one-second steps empties about 4 s early; near the end, where the outflow changes fastest relative to the depth, its fixed step is too coarse.

## Exact solutions of separable equations

::: math
\[ \frac{dy}{dt} = g(t)\,h(y) \;\Longrightarrow\; \int \frac{dy}{h(y)} = \int g(t)\,dt, \qquad T(t) = T_r + (T_0 - T_r)\,e^{-kt} \]
- separable equations can be solved by integrating each side
- cooling is separable with $h(T) = T - T_r$
In code: `sp.dsolve(sp.Eq(T(t).diff(t), -k_s * (T(t) - Tr)), T(t), ics={T(0): T0})`
:::


Equations of the form dy/dt = g(t) h(y) are **separable**: divide by h(y), multiply by dt, and integrate both sides, ∫ dy/h(y) = ∫ g(t) dt. Cooling and Torricelli's law are both of this kind, which is why they have formulas. SymPy's `dsolve` carries out such steps symbolically. Predict before running: what does SymPy give for the cooling law, and for the draining tank?

```python type
t = sp.symbols("t", positive=True)
T = sp.Function("T")
k_s, Tr, T0 = sp.symbols("k T_r T_0", positive=True)
cool = sp.dsolve(sp.Eq(T(t).diff(t), -k_s * (T(t) - Tr)), T(t), ics={T(0): T0})
print("cooling:", cool)

h = sp.Function("h")
c = sp.symbols("c", positive=True)
drain = sp.dsolve(sp.Eq(h(t).diff(t), -c * sp.sqrt(h(t))), h(t))
print("draining (general solution):", drain)
```

```output
cooling: Eq(T(t), T_r + (T_0 - T_r)*exp(-k*t))
draining (general solution): Eq(h(t), C1**2/4 - C1*c*t/2 + c**2*t**2/4)
```

`sp.Function("T")` declares an unknown function; `ics` supplies the initial condition so the constant of integration is fixed.

SymPy returns T(t) = T_r + (T₀ − T_r)e^(−kt), the exponential approach of the cooling lessons, and for the tank a quadratic in t, (C − ct)²/4 in some arrangement, which says √h falls linearly, as found above. Most ODEs met in practice have no such formula, which is why numerical solvers are the everyday tool and exact solutions are prized as checks.

::: challenge Euler for any ODE [easy]
Write `euler(f, t0, y0, dt, n)` that takes n Euler steps of dy/dt = f(t, y) for a scalar y and returns `(ts, ys)` as NumPy arrays of length n + 1, including the start. Raise `ValueError` if dt ≤ 0 or n < 0. Then write `euler_error(f, exact, t0, y0, t_end, n)`: run n equal steps from t0 to t_end and return the absolute error at t_end against the exact solution function `exact(t)`, as a plain float. Finally write `error_ratio(f, exact, t0, y0, t_end, n)`: the error with n steps divided by the error with 2n steps, rounded to 2 decimal places (about 2 for a first-order method).

```python starter
def euler(f, t0, y0, dt, n):
    return np.array([t0]), np.array([y0])

def euler_error(f, exact, t0, y0, t_end, n):
    return 0.0

def error_ratio(f, exact, t0, y0, t_end, n):
    return 1.0

print(euler(lambda t, y: -y, 0.0, 1.0, 0.1, 3))
```

```python solution
def euler(f, t0, y0, dt, n):
    if dt <= 0 or n < 0:
        raise ValueError("need dt > 0 and n >= 0")
    ts = t0 + dt * np.arange(n + 1)
    ys = np.empty(n + 1)
    ys[0] = y0
    for i in range(n):
        ys[i + 1] = ys[i] + f(ts[i], ys[i]) * dt
    return ts, ys

def euler_error(f, exact, t0, y0, t_end, n):
    _, ys = euler(f, t0, y0, (t_end - t0) / n, n)
    return float(abs(ys[-1] - exact(t_end)))

def error_ratio(f, exact, t0, y0, t_end, n):
    return round(euler_error(f, exact, t0, y0, t_end, n) / euler_error(f, exact, t0, y0, t_end, 2 * n), 2)

print(euler(lambda t, y: -y, 0.0, 1.0, 0.1, 3))
```

```python test
for _n in ["euler", "euler_error", "error_ratio"]:
    assert _n in dir(), f"Define {_n}."
_ts, _ys = euler(lambda t, y: -y, 0.0, 1.0, 0.1, 3)
assert np.allclose(_ts, [0, 0.1, 0.2, 0.3]) and np.allclose(_ys, [1, 0.9, 0.81, 0.729]), f"Each step multiplies by 0.9; got {_ys}."
_ts, _ys = euler(lambda t, y: t, 0.0, 0.0, 0.5, 4)
assert np.allclose(_ys, [0, 0, 0.25, 0.75, 1.5]), "f may depend on t."
assert len(euler(lambda t, y: 1.0, 0.0, 0.0, 0.1, 0)[1]) == 1, "n = 0 returns just the start."
for _bad in [(0, 5), (-0.1, 5), (0.1, -1)]:
    try:
        euler(lambda t, y: y, 0.0, 1.0, *_bad)
        assert False, f"dt, n = {_bad} should raise ValueError."
    except ValueError:
        pass
_e = euler_error(lambda t, y: -2 * y, lambda t: math.exp(-2 * t), 0.0, 1.0, 1.0, 100)
assert abs(_e - abs((1 - 0.02) ** 100 - math.exp(-2))) < 1e-12 and type(_e) is float, f"Got {_e}."
_r = error_ratio(lambda t, y: -2 * y, lambda t: math.exp(-2 * t), 0.0, 1.0, 1.0, 200)
assert 1.95 <= _r <= 2.05, f"Halving the step halves the error for a first-order method; got ratio {_r}."
_r2 = error_ratio(lambda t, y: math.cos(t), math.sin, 0.0, 0.0, 2.0, 400)
assert 1.95 <= _r2 <= 2.05, "Also for a rate that depends only on time."
"SUCCESS: Euler steps any rate law forward, and halving the step halves its error: first order, measured."
```

Hint: Build the times as `t0 + dt * np.arange(n + 1)` and fill the values one step at a time with `y + f(t, y) * dt`. For the ratio, call `euler_error` with n and with 2n steps.
:::

::: challenge The draining tank [medium]
Write `drain_time(A, a, h0, g=9.81)`, the exact time for a tank of cross-section A with a hole of area a to empty from depth h0, rounded to 3 decimal places; raise `ValueError` unless A > a > 0 and h0 ≥ 0. Write `depth_at(A, a, h0, t, g=9.81)`, the exact depth at time t: √h falls linearly at the rate (a/A)√(g/2), and the depth stays 0 once empty. Then write `drain_time_numeric(A, a, h0, g=9.81)` that solves Torricelli's law with `scipy.integrate.solve_ivp` (rtol 1e-10, atol 1e-12) and a terminal event at depth 1e-9, and returns the event time rounded to 2 decimal places.

```python starter
def drain_time(A, a, h0, g=9.81):
    return 0.0

def depth_at(A, a, h0, t, g=9.81):
    return h0

def drain_time_numeric(A, a, h0, g=9.81):
    return 0.0

print(drain_time(1.0, 0.001, 1.0))
```

```python solution
def drain_time(A, a, h0, g=9.81):
    if not (A > a > 0) or h0 < 0:
        raise ValueError("need A > a > 0 and h0 >= 0")
    return round((A / a) * math.sqrt(2 * h0 / g), 3)

def depth_at(A, a, h0, t, g=9.81):
    if not (A > a > 0) or h0 < 0:
        raise ValueError("need A > a > 0 and h0 >= 0")
    root = math.sqrt(h0) - (a / A) * math.sqrt(g / 2) * t
    return max(root, 0.0) ** 2

def drain_time_numeric(A, a, h0, g=9.81):
    def rate(t, h):
        return [-(a / A) * math.sqrt(2 * g * max(h[0], 0.0))]
    def empty(t, h):
        return h[0] - 1e-9
    empty.terminal = True
    sol = solve_ivp(rate, (0, 10 * (A / a) * math.sqrt(2 * max(h0, 1e-9) / g) + 1), [h0], events=empty, rtol=1e-10, atol=1e-12)
    return round(float(sol.t_events[0][0]), 2)

print(drain_time(1.0, 0.001, 1.0))
```

```python test
for _n in ["drain_time", "depth_at", "drain_time_numeric"]:
    assert _n in dir(), f"Define {_n}."
assert drain_time(1.0, 0.001, 1.0) == 451.524 and drain_time(2.0, 0.001, 1.0) == 903.047 and drain_time(1.0, 0.001, 4.0) == 903.047, "Proportional to A/a and to √h0."
assert drain_time(1.0, 0.001, 0.0) == 0.0, "An empty tank."
for _bad in [(1.0, 0.0, 1.0), (0.001, 1.0, 1.0), (1.0, 0.001, -1.0)]:
    try:
        drain_time(*_bad)
        assert False, f"drain_time{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(depth_at(1.0, 0.001, 1.0, 200) - (1 - 0.001 * math.sqrt(9.81 / 2) * 200) ** 2) < 1e-12, "√h falls linearly."
assert depth_at(1.0, 0.001, 1.0, 1000) == 0.0 and depth_at(1.0, 0.001, 1.0, 0) == 1.0, "Empty stays empty."
_n1 = drain_time_numeric(1.0, 0.001, 1.0)
assert abs(_n1 - 451.52) <= 0.02, f"The numerical emptying time should match the exact 451.52 s; got {_n1}."
assert abs(drain_time_numeric(0.5, 0.002, 2.5) - drain_time(0.5, 0.002, 2.5)) <= 0.02, "Another tank."
"SUCCESS: Torricelli's law has an exact answer (√h falls linearly), and an adaptive solver with an event reproduces it."
```

Hint: The exact time comes from √h₀ − (a/A)√(g/2) T = 0. For `solve_ivp`, the right-hand side returns a list, the event returns h − 1e-9 and gets `empty.terminal = True`, and `sol.t_events[0][0]` is the time it fired.
:::

::: challenge Equilibrium and settling [hard]
A tank of cross-section A with an outlet hole of area a receives a constant inflow Q (m³/s). Write `equilibrium(Q, a, g=9.81)`, the level h* where inflow equals outflow; raise `ValueError` unless Q ≥ 0 and a > 0. Write `stability_slope(Q, a, A, g=9.81)`: the derivative of the rate function f(h) = (Q − a√(2gh))/A at h*, computed **exactly** as −a√(2g)/(2A√h*) (raise `ValueError` if h* = 0, where it is undefined), rounded to 6 decimal places. Then write `settle_time(Q, a, A, h0, frac=0.01, g=9.81)`: the time for a tank starting at h0 to come within `frac × h*` of the equilibrium for good, found with `solve_ivp` (rtol 1e-9, atol 1e-12, max_step 1.0) on a time span long enough (use 20 / |stability_slope| seconds), as the first time after which the solution stays within the band, rounded to 1 decimal place. A start already within the band gives 0.0.

```python starter
def equilibrium(Q, a, g=9.81):
    return 0.0

def stability_slope(Q, a, A, g=9.81):
    return 0.0

def settle_time(Q, a, A, h0, frac=0.01, g=9.81):
    return 0.0

print(equilibrium(0.002, 0.001))
```

```python solution
def equilibrium(Q, a, g=9.81):
    if Q < 0 or a <= 0:
        raise ValueError("need Q >= 0 and a > 0")
    return (Q / a) ** 2 / (2 * g)

def stability_slope(Q, a, A, g=9.81):
    hs = equilibrium(Q, a, g)
    if hs == 0:
        raise ValueError("the slope is undefined at an empty equilibrium")
    return round(-a * math.sqrt(2 * g) / (2 * A * math.sqrt(hs)), 6)

def settle_time(Q, a, A, h0, frac=0.01, g=9.81):
    hs = equilibrium(Q, a, g)
    band = frac * hs
    if abs(h0 - hs) <= band:
        return 0.0
    span = 20 / abs(stability_slope(Q, a, A, g))
    sol = solve_ivp(lambda t, h: [(Q - a * math.sqrt(2 * g * max(h[0], 0.0))) / A], (0, span), [h0],
                    rtol=1e-9, atol=1e-12, max_step=1.0)
    outside = np.flatnonzero(np.abs(sol.y[0] - hs) > band)
    return round(float(sol.t[outside[-1] + 1]), 1)

print(equilibrium(0.002, 0.001))
```

```python test
for _n in ["equilibrium", "stability_slope", "settle_time"]:
    assert _n in dir(), f"Define {_n}."
assert abs(equilibrium(0.002, 0.001) - 4 / 19.62) < 1e-12 and equilibrium(0, 0.001) == 0.0, "h* = (Q/a)² / 2g."
for _bad in [(-1, 0.001), (0.002, 0)]:
    try:
        equilibrium(*_bad)
        assert False, f"equilibrium{_bad} should raise ValueError."
    except ValueError:
        pass
_s = stability_slope(0.002, 0.001, 1.0)
assert _s < 0 and abs(_s - (-0.001 * math.sqrt(19.62) / (2 * math.sqrt(4 / 19.62)))) < 1e-6, f"Negative: stable; got {_s}."
try:
    stability_slope(0, 0.001, 1.0)
    assert False, "With no inflow the equilibrium is empty: raise ValueError."
except ValueError:
    pass
_t1 = settle_time(0.002, 0.001, 1.0, 0.0)
_t2 = settle_time(0.002, 0.001, 1.0, 1.0)
assert 600 < _t1 < 1100 and 600 < _t2 < 1600, f"Settling takes several time constants (about 200 s each); got {_t1} and {_t2}."
assert settle_time(0.002, 0.001, 1.0, equilibrium(0.002, 0.001) * 1.005) == 0.0, "Already within the band."
assert settle_time(0.002, 0.001, 2.0, 0.0) > 1.8 * _t1, "A tank of twice the area settles about twice as slowly."
assert settle_time(0.002, 0.001, 1.0, 0.0, frac=0.05) < _t1, "A wider band is reached sooner."
"SUCCESS: The rate law's zero is the operating level, its negative slope makes it stable, and the slope's size sets how fast the tank gets there."
```

Hint: Inflow equals outflow when a√(2gh) = Q. Solve with `solve_ivp` over the given span, find the last sample outside the band with `np.flatnonzero(np.abs(h - h*) > band)`, and report the time of the next sample.
:::

## What you learned

- A differential equation states a law as a rate, dy/dt = f(t, y); with a starting value it determines the future.
- Direction fields show every solution's path at once; solutions follow the slope segments.
- Equilibria are zeros of f; they are stable when f′ < 0 there, and |f′| sets how fast solutions approach.
- Torricelli's law makes a tank drain ever more slowly; √h falls linearly, so the emptying time is (A/a)√(2h₀/g).
- `solve_ivp` solves ODEs accurately with adaptive Runge–Kutta steps and can stop at events; Euler's first-order error shrinks only in proportion to the step.
- Separable equations can be solved exactly, by hand or with SymPy's `dsolve`, and make good checks for numerical solvers.

The next lesson returns to the spring and mass, now as a second-order differential equation with damping.
