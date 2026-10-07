# Newton's second law, simulated

Push a cart and it speeds up; push harder and it speeds up faster; load it with bricks and the same push achieves less. Newton's second law puts that into one equation, F = ma: the net force on an object equals its mass times its acceleration. Acceleration is the second derivative of position, so the law is really a statement about derivatives: knowing the forces tells you how velocity and position **change**, not what they are. Turning that into a prediction of where the cart will be means stepping the change forward in time. This lesson does exactly that, and in doing so meets the central idea of the whole ODE thread: a **state** that evolves according to its own rate of change.

This lesson covers:

- net force and F = ma for motion along a line;
- constant forces, and checking a simulation against exact formulas;
- forces that depend on velocity: drag and terminal speed;
- state, derivative function and a general stepping simulator;
- forces that depend on position: a spring, and why the order of updates matters.

## Net force and acceleration

::: math
\[ F_\text{net} = \sum_i F_i = m\,a \qquad\Longrightarrow\qquad a = \frac{F_\text{net}}{m}, \qquad t = \frac{v}{a} \]
- forces carry signs for direction: $120 + (-30) = 90$ N
- the same net force gives a heavier object a smaller acceleration
In code: `acceleration(forces, mass)` is `sum(forces) / mass`
:::


The F in F = ma is the **net** force: the sum of every force acting, with signs for direction along the line. A cart pushed forward with 120 N against 30 N of rolling resistance has a net force of 90 N. With a mass of 45 kg its acceleration is a = F/m = 2 m/s². Forces that balance (net force zero) give zero acceleration: constant velocity, not necessarily rest.

Mass appears in the denominator: the same force accelerates a heavier object less. Units fit together: a newton is defined as the force giving 1 kg an acceleration of 1 m/s². Predict before running: how long does the cart take to reach walking pace, 1.5 m/s, empty and with 135 kg of bricks?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def acceleration(forces, mass):
    return sum(forces) / mass

push, rolling = 120.0, -30.0
for load in [0, 135]:
    m = 45 + load
    a = acceleration([push, rolling], m)
    print(f"mass {m:>3} kg: net force {push + rolling:.0f} N, acceleration {a:.3f} m/s², reaches 1.5 m/s after {1.5 / a:.2f} s")
```

```output
mass  45 kg: net force 90 N, acceleration 2.000 m/s², reaches 1.5 m/s after 0.75 s
mass 180 kg: net force 90 N, acceleration 0.500 m/s², reaches 1.5 m/s after 3.00 s
```

The empty cart reaches walking pace in 0.75 s; four times the mass takes four times as long, 3.0 s. With a constant net force, the acceleration is constant and the motion lesson's equations apply directly.

## Simulating a constant force

::: math
\[ \frac{dx}{dt} = v, \quad \frac{dv}{dt} = \frac{F}{m} \qquad\Longrightarrow\qquad x_{k+1} = x_k + v_k\,\Delta t, \quad v_{k+1} = v_k + \frac{F}{m}\,\Delta t \]
- the **state** $(x, v)$ is stepped forward by its rates of change (Euler's method)
- exact answer for comparison: $x = \tfrac{1}{2} a t^2$; Euler's error is proportional to $\Delta t$
In code: `x, v = x + v * dt, v + F / m * dt` inside `simulate_constant`
:::


To prepare for forces that are not constant, simulate the simple case and check it against the exact answer. The **state** of the cart is its position and velocity, (x, v). Their rates of change are dx/dt = v and dv/dt = F/m. Euler's method from the motion lesson steps the state: over a small Δt, x grows by v Δt and v grows by (F/m) Δt. Predict before running: after 4 s, how far off is the stepped position with Δt = 0.1 s?

```python type
def simulate_constant(F, m, dt, T):
    x, v = 0.0, 0.0
    for _ in range(round(T / dt)):
        x, v = x + v * dt, v + F / m * dt
    return x, v

a = 90 / 45
for dt in [0.1, 0.01]:
    x, v = simulate_constant(90, 45, dt, 4.0)
    print(f"dt = {dt}: x = {x:.4f} m, v = {v:.4f} m/s   exact x = {0.5 * a * 16:.4f} m, v = {a * 4:.4f} m/s")
```

```output
dt = 0.1: x = 15.6000 m, v = 8.0000 m/s   exact x = 16.0000 m, v = 8.0000 m/s
dt = 0.01: x = 15.9600 m, v = 8.0000 m/s   exact x = 16.0000 m, v = 8.0000 m/s
```

Writing `x, v = x + v * dt, v + ...` updates both from the **old** values at once, which is plain Euler.

The velocity comes out exactly right, since the acceleration really is constant, but the position is short by 0.4 m (2.5%) at Δt = 0.1 s and 0.04 m at 0.01 s. Each step moves the cart at the speed it had at the start of the step, which is always a little too slow. The error is proportional to Δt, the first-order behaviour seen before.

## Drag and terminal speed

::: math
\[ m\frac{dv}{dt} = F - c\,v, \qquad v_T = \frac{F}{c}, \qquad v(t) = v_T\big(1 - e^{-ct/m}\big) \]
- terminal speed $v_T$: set the rate of change to zero
- time constant $\tau = m/c$: 95% of $v_T$ after $3\tau$
In code: `vs[i] = vs[i - 1] + (F - c * vs[i - 1]) / m * dt`
:::


Real forces often depend on the motion itself. Air or fluid **drag** opposes velocity: at low speeds it is roughly proportional to speed, F_drag = −c v. A boat or a cart in a viscous situation then obeys

\[ m \frac{dv}{dt} = F - c v \]

As v grows, the drag grows until it cancels the push: then the net force is zero and the speed stops changing. That **terminal speed** is v_T = F/c, found without solving anything: just set the rate of change to zero. The exact solution, from the calculus block, is v(t) = v_T (1 − e^(−ct/m)), approaching v_T without ever reaching it. Predict before running: a 200 kg boat pushed by 400 N with c = 80 N·s/m. What is its terminal speed, and how long until it reaches 95% of it?

```python type
F, m, c = 400.0, 200.0, 80.0
dt, T = 0.01, 15.0
ts = np.arange(0, T + dt / 2, dt)
vs = np.zeros_like(ts)
for i in range(1, len(ts)):
    vs[i] = vs[i - 1] + (F - c * vs[i - 1]) / m * dt
exact = F / c * (1 - np.exp(-c * ts / m))
print(f"terminal speed F/c = {F / c} m/s; after {T:.0f} s: simulated {vs[-1]:.4f}, exact {exact[-1]:.4f}")
print(f"time to 95%: simulated {ts[np.argmax(vs >= 0.95 * F / c)]:.2f} s, exact {-(m / c) * math.log(0.05):.2f} s")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(ts, vs, label="simulated")
ax.plot(ts, exact, "--", label="exact")
ax.axhline(F / c, color="grey", linestyle=":", label="terminal speed")
ax.set_xlabel("time (s)")
ax.set_ylabel("speed (m/s)")
ax.legend()
plt.show()
```

```output
terminal speed F/c = 5.0 m/s; after 15 s: simulated 4.9878, exact 4.9876
time to 95%: simulated 7.48 s, exact 7.49 s
```

`np.argmax(vs >= 0.95 * F / c)` finds the first time step at which the speed reaches 95% of terminal.

The boat approaches 5 m/s and reaches 95% of it after about 7.5 s; the simulation and the exact curve are indistinguishable on the plot. The time scale m/c = 2.5 s, the **time constant**, sets how quickly the speed settles: after three time constants it is at 95%, after five at over 99%. Heavier boats or less drag mean longer time constants.

## A general simulator

::: math
\[ \mathbf{s}_{k+1} = \mathbf{s}_k + \mathbf{f}(t_k, \mathbf{s}_k)\,\Delta t, \qquad \mathbf{s} = \begin{pmatrix} x \\ v \end{pmatrix}, \quad \mathbf{f} = \begin{pmatrix} v \\ F(v)/m \end{pmatrix} \]
- one stepper for every system; only the derivative function $\mathbf{f}$ changes
- the cart: $F(v) = F_\text{drive} - c_{rr}\,m g - k\,v|v|$
In code: `cart(t, state)` is $\mathbf{f}$; `euler(deriv, state0, dt, T)` repeats `state + deriv(k * dt, state) * dt`
:::


Every simulation so far had the same structure: a state, a function giving the state's rate of change, and a loop. Writing that structure once gives a tool for any system. The state becomes a NumPy array, and the **derivative function** `deriv(t, state)` returns the array of rates. This is exactly the form that professional ODE solvers (such as SciPy's `solve_ivp`, later in the series) expect. Predict before running: with forward drive, rolling resistance and quadratic air drag, what top speed does an electric cart reach?

```python type
def euler(deriv, state0, dt, T):
    state = np.array(state0, dtype=float)
    ts, states = [0.0], [state.copy()]
    for k in range(round(T / dt)):
        state = state + deriv(k * dt, state) * dt
        ts.append((k + 1) * dt)
        states.append(state.copy())
    return np.array(ts), np.array(states)

def cart(t, state, m=300.0, drive=600.0, crr=0.015, k=0.4):
    x, v = state
    force = drive - crr * m * 9.81 - k * v * abs(v)
    return np.array([v, force / m])

ts, states = euler(cart, [0.0, 0.0], 0.05, 120.0)
v_top = math.sqrt((600 - 0.015 * 300 * 9.81) / 0.4)
print(f"after 2 min: speed {states[-1, 1]:.3f} m/s (theory {v_top:.3f}), distance {states[-1, 0]:.0f} m")
```

```output
after 2 min: speed 37.277 m/s (theory 37.278), distance 3953 m
```

The air drag k v|v| always opposes the motion, whichever way the cart moves. Rolling resistance is the coefficient C_rr times the weight.

The cart settles at about 37.3 m/s, where drive balances rolling resistance plus air drag: setting the rate of change to zero gives the terminal speed directly, matching the simulation. Changing the physics means changing only the derivative function; the stepper never changes.

## When the force depends on position

::: math
\[ F = -kx, \qquad E = \tfrac{1}{2} m v^2 + \tfrac{1}{2} k x^2, \qquad v_{k+1} = v_k - \frac{k}{m}x_k\,\Delta t, \quad x_{k+1} = x_k + v_{k+1}\,\Delta t \]
- Hooke's law; without friction the energy $E$ should stay constant
- semi-implicit Euler updates $v$ first, then uses the **new** $v$ for $x$
In code: `energy(x, v)` measures the drift of each method over 20 periods
:::


A mass on a spring feels a force pulling it back towards rest, proportional to the stretch: F = −kx (Hooke's law). It oscillates, and with no friction its energy ½mv² + ½kx² should stay constant forever. Plain Euler fails this test: the energy grows every step, and the oscillation spirals outward. A tiny change fixes it: update the velocity first, then use the **new** velocity to update the position. This **semi-implicit Euler** method costs nothing extra and keeps the energy bounded, which is why game engines use it (molecular simulations use its second-order cousin, the Verlet method). Predict before running: after 20 periods, how much has each method's energy changed?

```python type
k_s, m_s, dt = 400.0, 1.0, 0.005
period = 2 * math.pi * math.sqrt(m_s / k_s)
steps = round(20 * period / dt)

def energy(x, v):
    return 0.5 * m_s * v ** 2 + 0.5 * k_s * x ** 2

x1, v1 = 0.1, 0.0
x2, v2 = 0.1, 0.0
for _ in range(steps):
    x1, v1 = x1 + v1 * dt, v1 - k_s / m_s * x1 * dt
    v2 = v2 - k_s / m_s * x2 * dt
    x2 = x2 + v2 * dt
E0 = energy(0.1, 0.0)
print(f"period {period:.4f} s, {steps} steps")
print(f"explicit Euler: energy multiplied by {energy(x1, v1) / E0:,.0f}")
print(f"semi-implicit Euler: energy changed by {100 * (energy(x2, v2) / E0 - 1):+.3f}%")
```

```output
period 0.3142 s, 1257 steps
explicit Euler: energy multiplied by 270,375
semi-implicit Euler: energy changed by -0.880%
```

The two loops differ only in order: explicit Euler updates both from the old values; semi-implicit Euler updates v first and uses it immediately.

With the same step, explicit Euler's energy is multiplied by about 270,000 in 20 periods (each step multiplies it by 1 + (k/m)Δt² = 1.01), a spring that drives itself to absurd amplitudes, while semi-implicit Euler's wobbles by a few percent within each cycle but does not drift: after 20 periods it is within 1% of where it started. Both methods are first order, and neither is exact, but one respects the physics of energy conservation and the other does not. Choosing a method that matches the structure of the problem matters as much as choosing a small step, a theme the ODE block develops.

::: challenge Forces and acceleration [easy]
Write `net_force(forces)`, the sum of a list of signed forces along a line, and `acceleration(forces, mass)`, raising `ValueError` if the mass is not positive. Then write `time_to_speed(forces, mass, v_start, v_target)`: under constant net force, how many seconds to go from `v_start` to `v_target`, rounded to 3 decimal places. Raise `ValueError` if the acceleration is zero (unless the speeds are already equal, which gives 0.0), or if the target is in the opposite direction from the acceleration (it would never be reached).

```python starter
def net_force(forces):
    return 0.0

def acceleration(forces, mass):
    return 0.0

def time_to_speed(forces, mass, v_start, v_target):
    return 0.0

print(time_to_speed([120, -30], 45, 0, 1.5))
```

```python solution
def net_force(forces):
    return float(sum(forces))

def acceleration(forces, mass):
    if mass <= 0:
        raise ValueError("mass must be positive")
    return net_force(forces) / mass

def time_to_speed(forces, mass, v_start, v_target):
    a = acceleration(forces, mass)
    dv = v_target - v_start
    if dv == 0:
        return 0.0
    if a == 0 or (dv > 0) != (a > 0):
        raise ValueError("the target speed is never reached")
    return round(dv / a, 3)

print(time_to_speed([120, -30], 45, 0, 1.5))
```

```python test
for _n in ["net_force", "acceleration", "time_to_speed"]:
    assert _n in dir(), f"Define {_n}."
assert net_force([120, -30]) == 90 and net_force([]) == 0, "Signed sum."
assert acceleration([120, -30], 45) == 2.0 and acceleration([-50], 25) == -2.0, "a = F / m."
try:
    acceleration([10], 0)
    assert False, "Zero mass should raise ValueError."
except ValueError:
    pass
assert time_to_speed([120, -30], 45, 0, 1.5) == 0.75 and time_to_speed([120, -30], 180, 0, 1.5) == 3.0, "The lesson's cart."
assert time_to_speed([-300], 150, 6, 0) == 3.0, "Braking: negative acceleration, falling speed."
assert time_to_speed([10, -10], 5, 2, 2) == 0.0, "Already at the target."
for _args in [([10, -10], 5, 0, 1), ([100], 10, 5, 2), ([-100], 10, 0, 3)]:
    try:
        time_to_speed(*_args)
        assert False, f"time_to_speed{_args} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Sum the forces, divide by the mass, and a constant acceleration turns a speed change into a time."
```

Hint: The time is the change in speed divided by the acceleration. It is impossible when the acceleration is zero or has the opposite sign to the change in speed.
:::

::: challenge A boat with drag [medium]
Write `simulate_boat(F, m, c, dt, T)` that simulates m dv/dt = F − c v from rest with explicit Euler and returns `(ts, vs)` as NumPy arrays of length `round(T / dt) + 1`, starting at t = 0, v = 0. Write `exact_speed(F, m, c, t)`, the exact v_T (1 − e^(−ct/m)), working for a number or an array. Then write `time_to_fraction(m, c, fraction)`, the exact time to reach the given fraction of terminal speed, −(m/c) ln(1 − fraction), rounded to 3 decimal places; raise `ValueError` unless 0 < fraction < 1 and m, c are positive. Raise `ValueError` from `simulate_boat` if m or c is not positive or dt is not positive.

```python starter
def simulate_boat(F, m, c, dt, T):
    ts = np.arange(0, T + dt / 2, dt)
    return ts, np.zeros_like(ts)

def exact_speed(F, m, c, t):
    return F / c

def time_to_fraction(m, c, fraction):
    return 0.0

print(time_to_fraction(200, 80, 0.95))
```

```python solution
def simulate_boat(F, m, c, dt, T):
    if m <= 0 or c <= 0 or dt <= 0:
        raise ValueError("m, c and dt must be positive")
    n = round(T / dt)
    ts = np.arange(n + 1) * dt
    vs = np.zeros(n + 1)
    for i in range(1, n + 1):
        vs[i] = vs[i - 1] + (F - c * vs[i - 1]) / m * dt
    return ts, vs

def exact_speed(F, m, c, t):
    return F / c * (1 - np.exp(-c * np.asarray(t, dtype=float) / m))

def time_to_fraction(m, c, fraction):
    if not 0 < fraction < 1 or m <= 0 or c <= 0:
        raise ValueError("need 0 < fraction < 1 and positive m and c")
    return round(-(m / c) * math.log(1 - fraction), 3)

print(time_to_fraction(200, 80, 0.95))
```

```python test
for _n in ["simulate_boat", "exact_speed", "time_to_fraction"]:
    assert _n in dir(), f"Define {_n}."
_ts, _vs = simulate_boat(400, 200, 80, 0.01, 15)
assert len(_ts) == 1501 and len(_vs) == 1501 and _ts[0] == 0 and _vs[0] == 0 and abs(_ts[-1] - 15) < 1e-9, "Arrays from t = 0 to T inclusive."
assert abs(_vs[1] - 0.02) < 1e-12 and abs(_vs[2] - (0.02 + (400 - 80 * 0.02) / 200 * 0.01)) < 1e-12, "Explicit Euler steps."
assert np.abs(_vs - exact_speed(400, 200, 80, _ts)).max() < 0.01, "Close to the exact curve with a small step."
assert abs(float(exact_speed(400, 200, 80, 2.5)) - 5 * (1 - math.exp(-1))) < 1e-12, "One time constant reaches 63.2%."
assert time_to_fraction(200, 80, 0.95) == 7.489 and time_to_fraction(10, 2, 0.5) == 3.466, "Exact times."
_t95 = time_to_fraction(200, 80, 0.95)
assert abs(_ts[np.argmax(_vs >= 0.95 * 5)] - _t95) < 0.05, "The simulation reaches 95% at about the exact time."
for _bad in [(200, 80, 1), (200, 80, 0), (0, 80, 0.5), (200, -1, 0.5)]:
    try:
        time_to_fraction(*_bad)
        assert False, f"time_to_fraction{_bad} should raise ValueError."
    except ValueError:
        pass
try:
    simulate_boat(400, 0, 80, 0.01, 1)
    assert False, "Zero mass should raise ValueError."
except ValueError:
    pass
"SUCCESS: Drag grows until it cancels the push; the speed settles at F/c with time constant m/c, and the simulation agrees with the exact curve."
```

Hint: Build `ts = np.arange(n + 1) * dt` with `n = round(T / dt)`, then fill `vs` with `vs[i] = vs[i-1] + (F - c * vs[i-1]) / m * dt`. For the time, solve 1 − e^(−ct/m) = fraction for t.
:::

::: challenge Keeping a spring honest [hard]
Write `spring_run(k, m, x0, v0, dt, n, method)` that simulates a frictionless mass on a spring (acceleration −(k/m)x) for n steps with `method` either `"explicit"` (update x and v from the old values) or `"semi-implicit"` (update v first, then x with the new v), raising `ValueError` for any other method. Return `(xs, energies)`: NumPy arrays of length n + 1 holding the positions and the energies ½mv² + ½kx², including the start. Then write `period_from_run(xs, dt)`: estimate the oscillation period from the times at which x crosses zero going **upward** (from negative to non-negative), with linear interpolation between samples for each crossing, as the average gap between consecutive upward crossings, rounded to 4 decimal places. Raise `ValueError` if there are fewer than two upward crossings.

```python starter
def spring_run(k, m, x0, v0, dt, n, method):
    return np.full(n + 1, x0), np.full(n + 1, 0.5 * k * x0 ** 2)

def period_from_run(xs, dt):
    return 0.0

xs, es = spring_run(400, 1, 0.1, 0, 0.005, 1000, "semi-implicit")
print(es[0], es[-1])
```

```python solution
def spring_run(k, m, x0, v0, dt, n, method):
    if method not in ("explicit", "semi-implicit"):
        raise ValueError(f"unknown method {method!r}")
    xs, es = np.zeros(n + 1), np.zeros(n + 1)
    x, v = float(x0), float(v0)
    xs[0], es[0] = x, 0.5 * m * v ** 2 + 0.5 * k * x ** 2
    for i in range(1, n + 1):
        if method == "explicit":
            x, v = x + v * dt, v - k / m * x * dt
        else:
            v = v - k / m * x * dt
            x = x + v * dt
        xs[i], es[i] = x, 0.5 * m * v ** 2 + 0.5 * k * x ** 2
    return xs, es

def period_from_run(xs, dt):
    xs = np.asarray(xs, dtype=float)
    up = np.flatnonzero((xs[:-1] < 0) & (xs[1:] >= 0))
    if len(up) < 2:
        raise ValueError("fewer than two upward zero crossings")
    times = (up + (-xs[up]) / (xs[up + 1] - xs[up])) * dt
    return round(float(np.diff(times).mean()), 4)

xs, es = spring_run(400, 1, 0.1, 0, 0.005, 1000, "semi-implicit")
print(es[0], es[-1])
```

```python test
for _n in ["spring_run", "period_from_run"]:
    assert _n in dir(), f"Define {_n}."
_xe, _ee = spring_run(400, 1, 0.1, 0, 0.005, 1257, "explicit")
_xs, _es = spring_run(400, 1, 0.1, 0, 0.005, 1257, "semi-implicit")
assert len(_xs) == 1258 and len(_es) == 1258 and _xs[0] == 0.1 and abs(_es[0] - 2.0) < 1e-12, "Arrays include the starting state; E0 = ½ k x0² = 2 J."
assert abs(_xe[1] - 0.1) < 1e-15 and abs(_xs[1] - (0.1 - 400 * 0.1 * 0.005 * 0.005)) < 1e-15, "The first step distinguishes the methods: explicit uses the old v (0), semi-implicit the new one."
assert _ee[-1] / _ee[0] > 1000, f"Explicit Euler's energy should grow a lot over 20 periods; ratio {_ee[-1] / _ee[0]:.2f}."
assert np.abs(_es / _es[0] - 1).max() < 0.06, "Semi-implicit Euler's energy must stay within a few percent throughout."
_p = period_from_run(_xs, 0.005)
assert abs(_p - 2 * math.pi * math.sqrt(1 / 400)) < 0.001, f"Period ≈ 2π√(m/k) = 0.3142 s; got {_p}."
assert period_from_run(np.sin(np.arange(0, 30, 0.01)), 0.01) == round(2 * math.pi, 4) or abs(period_from_run(np.sin(np.arange(0, 30, 0.01)), 0.01) - 2 * math.pi) < 1e-3, "Period of sin(t) is 2π."
try:
    spring_run(1, 1, 1, 0, 0.1, 10, "rk4")
    assert False, "An unknown method should raise ValueError."
except ValueError:
    pass
try:
    period_from_run(np.linspace(-1, 1, 50), 0.1)
    assert False, "One crossing is not enough."
except ValueError:
    pass
"SUCCESS: Same cost, same order, different physics: updating v first keeps the spring's energy bounded, and the period comes out at 2π√(m/k)."
```

Hint: Keep x and v as floats in a loop and record them after each step. For explicit Euler, update both from the old values in one tuple assignment. For the period, find indices i with `xs[i] < 0 <= xs[i+1]`, interpolate each crossing time `(i + (-xs[i]) / (xs[i+1] - xs[i])) * dt`, and average the differences.
:::

## What you learned

- F = ma uses the net force, the signed sum of all forces; acceleration is F/m, and balanced forces mean constant velocity.
- A system's state (here x and v) evolves by its rates of change: dx/dt = v and dv/dt = F/m. Euler steps the state forward; checking against exact cases measures the error.
- Velocity-dependent drag gives a terminal speed (set the rate of change to zero) and a time constant m/c.
- Writing the derivative function separately from the stepper gives a reusable simulator; only the physics changes between problems.
- For a spring, explicit Euler's energy grows without bound while semi-implicit Euler keeps it bounded at the same cost: method choice matters.

The next lesson runs differentiation backwards: from a rate back to the total, accumulation.
