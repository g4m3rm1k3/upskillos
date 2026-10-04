# Heat flow on a bar

One end of a steel bar sits in a furnace fixture at 200 °C; the rest starts at room temperature. How hot is the middle after half an hour? Every earlier differential equation had one unknown that changed in time: a temperature, a speed, a position. Here the temperature changes in time **and** varies along the bar, u(x, t). Its law involves derivatives in both variables, which makes it a **partial differential equation** (PDE). This lesson derives the heat equation and solves it the way engineering software does: chop the bar into small pieces, replace the derivatives by differences, and step in time. Along the way it meets the stability limit that catches every first attempt, the steady states that come from a linear system, and the sine modes that explain why sharp hot spots smooth out so fast.

This lesson covers:

- the heat equation, from Fourier's law and an energy balance;
- the second difference as a numerical second derivative;
- explicit time stepping, and its stability condition;
- steady states as linear systems: a shaft losing heat to the air;
- sine modes, and why fine detail decays first.

## The heat equation and the second difference

::: math
\[ q = -k\,\frac{\partial u}{\partial x}, \qquad \frac{\partial u}{\partial t} = \alpha\,\frac{\partial^2 u}{\partial x^2}, \qquad \alpha = \frac{k}{\rho c} \]
\[ \frac{\partial^2 u}{\partial x^2} \approx \frac{u_{i+1} - 2u_i + u_{i-1}}{\Delta x^2}, \qquad \text{error} \propto \Delta x^2 \]
- $u(x, t)$: temperature; $q$: heat flux; $k$: conductivity; $\rho$: density; $c$: specific heat; $\alpha$: thermal diffusivity
- the second difference compares each point with the average of its two neighbours
In code: `(u[2:] - 2 * u[1:-1] + u[:-2]) / dx ** 2` against the exact second derivative
:::

Heat flows from hot to cold at a rate proportional to the temperature gradient (Fourier's law, met in the gradient lesson). Consider a thin slice of the bar between x and x + Δx. Heat flows in through one face and out through the other. If more comes in than goes out, the slice warms. The net inflow is the change in flux across the slice, so the heating rate depends on how the slope ∂u/∂x changes along the bar: on the **second** derivative. Dividing by the slice's heat capacity ρc gives the **heat equation**. Its single constant α, the thermal diffusivity, says how fast temperature differences spread: about 1.2 × 10⁻⁵ m²/s for steel and 10⁻⁴ m²/s for copper.

The equation has a simple reading. The second derivative is positive where the profile curves upwards, a point colder than its neighbours' average, and such a point warms up. A point hotter than its neighbours cools. Every bump is smoothed out.

To compute, sample u at points spaced Δx apart. The **second difference** (u_{i+1} − 2u_i + u_{i−1})/Δx² is the central difference of the central difference. Its error is proportional to Δx², like the central difference of the derivative lesson.

Predict before running: halving Δx, by what factor does the second difference's error on sin 2x fall?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

for dx in [0.1, 0.05, 0.025]:
    xs = np.arange(0, 1 + dx / 2, dx)
    u = np.sin(2 * xs)
    second = (u[2:] - 2 * u[1:-1] + u[:-2]) / dx ** 2
    exact = -4 * np.sin(2 * xs[1:-1])
    print(f"Δx = {dx:<6} largest error {np.abs(second - exact).max():.6f}")
```

Each halving of Δx divides the error by 4 (0.0133, 0.0033, 0.00083): second order, as promised. The same stencil, 1, −2, 1, appears in every finite-difference code for diffusion, vibration and electrostatics.

## Stepping in time

::: math
\[ u_i^{k+1} = u_i^k + r\,\big(u_{i+1}^k - 2u_i^k + u_{i-1}^k\big), \qquad r = \frac{\alpha\,\Delta t}{\Delta x^2} \]
- $u_i^k$: temperature at point $i$ and time step $k$; the end values are held fixed (boundary conditions)
- each step moves every interior point towards the average of its neighbours, by an amount set by $r$
In code: `ftcs_step(u, r)` updates `u[1:-1]` from the old values in one array operation
:::

Replace the time derivative by a forward difference, as in Euler's method, and the space derivative by the second difference. The result is the **explicit** or FTCS (forward time, centred space) scheme: each new temperature comes from three old ones. The **boundary conditions** finish the description: here the furnace end is held at 200 °C and the far end at 20 °C. The bar starts at 20 °C throughout.

The natural time scale is L²/α. For a 0.5 m steel bar that is about 21,000 s, nearly 6 hours: heat crawls through steel. Since r = αΔt/Δx², halving the grid spacing forces a step four times smaller, as the next section shows.

Predict before running: the bar is 0.5 m long. After half an hour, is its middle above or below 60 °C, and where does the temperature profile end up?

```python
alpha, Lbar = 1.2e-5, 0.5
x = np.linspace(0, Lbar, 51)
dx = x[1] - x[0]
dt = 0.4 * dx ** 2 / alpha
r = alpha * dt / dx ** 2

def ftcs_step(u, r):
    new = u.copy()
    new[1:-1] = u[1:-1] + r * (u[2:] - 2 * u[1:-1] + u[:-2])
    return new

u = np.full(x.size, 20.0)
u[0] = 200.0
t, profiles = 0.0, {}
for minutes in [10, 30, 60, 120, 240]:
    while t < minutes * 60 - 1e-9:
        u = ftcs_step(u, r)
        t += dt
    profiles[minutes] = u.copy()
    print(f"after {minutes:>3} min: middle {np.interp(0.25, x, u):6.2f} °C, 0.1 m from the hot end {np.interp(0.1, x, u):6.2f} °C")
print(f"Δx = {dx * 1000:.0f} mm, Δt = {dt:.2f} s, r = {r:.2f}; time scale L²/α = {Lbar ** 2 / alpha / 3600:.1f} h")

fig, ax = plt.subplots(figsize=(6, 3.2))
for minutes, prof in profiles.items():
    ax.plot(x, prof, label=f"{minutes} min")
ax.plot(x, 200 - 360 * x, "k--", lw=1, label="steady state")
ax.set_xlabel("position (m)")
ax.set_ylabel("°C")
ax.legend(fontsize=8)
plt.show()
```

After 30 minutes the middle has reached about 61 °C, and 0.1 m from the furnace it is already 134 °C. The profile then creeps towards the dashed straight line from 200 °C to 20 °C, the **steady state**, where the middle sits at 110 °C. After 4 hours it is at 109.9 °C, almost there. The steady state is straight because "nothing changes" means ∂²u/∂x² = 0, and a function with zero second derivative is a line.

## The stability limit

::: math
\[ u_i^{k+1} = (1 - 2r)\,u_i^k + r\,u_{i-1}^k + r\,u_{i+1}^k, \qquad \text{stable} \iff r = \frac{\alpha\,\Delta t}{\Delta x^2} \le \frac{1}{2} \]
- for $r \le \tfrac{1}{2}$ every coefficient is non-negative, so each new value is a weighted average: no new extremes appear
- for $r > \tfrac{1}{2}$ the centre weight goes negative and a zigzag grows each step
In code: 400 steps of `ftcs_step` with `r` = 0.25, 0.5 and 0.55
:::

Rewrite the update as a combination of the three old values. When r ≤ ½ all three weights are non-negative and add up to 1, so every new temperature is an average of old ones: it can never go above the hottest or below the coldest. When r > ½ the middle weight 1 − 2r is negative. A tiny zigzag between neighbouring points (from any sharp feature, or from rounding) then flips sign and grows every step.

So the time step must satisfy Δt ≤ Δx²/(2α). This is the price of an explicit method: halving the grid spacing for accuracy forces four times as many time steps. **Implicit** methods, covered in the PDE block, remove the limit at the cost of solving a linear system every step.

Predict before running: what happens to the bar after 400 steps at r = 0.55, just over the limit?

```python
for r_try in [0.25, 0.5, 0.55]:
    u = np.full(x.size, 20.0)
    u[0] = 200.0
    for _ in range(400):
        u = ftcs_step(u, r_try)
    print(f"r = {r_try}: temperatures between {u.min():.4g} and {u.max():.4g} °C")
```

At r = 0.25 and 0.5 the temperatures stay between 20 and 200 °C, as the averaging argument guarantees. At r = 0.55 they reach ±2.8 × 10³⁰ °C: nonsense, from a step just 10% too large. An exploding simulation is almost always a stability limit, not a physics problem.

## Steady state: a shaft losing heat

::: math
\[ \frac{d^2\theta}{dx^2} = m^2\theta, \quad \theta = u - T_\text{air}, \quad m^2 = \frac{hP}{kA} = \frac{4h}{kD}, \qquad \theta(0) = \theta_b, \quad \theta'(L) = 0 \]
\[ \theta_{i-1} - (2 + m^2\Delta x^2)\,\theta_i + \theta_{i+1} = 0, \qquad \text{exact: } \theta(x) = \theta_b\,\frac{\cosh m(L - x)}{\cosh mL} \]
- $h$: heat-transfer coefficient to the air; $P$ and $A$: perimeter and cross-section area; $D$: diameter
- $\theta_b = T_\text{base} - T_\text{air}$; $L$: the shaft's length
- insulated tip: a ghost point $\theta_{N+1} = \theta_{N-1}$ makes the slope zero there
In code: the matrix `A` has $-(2 + m^2\Delta x^2)$ on the diagonal and 1 beside it; `np.linalg.solve(A, rhs)`
:::

A motor shaft sticks out of a hot housing into the air. Heat flows along it from the housing and leaks out of its surface into the air, at a rate h(u − T_air) per unit area. In the steady state there is no time derivative left. The balance on each slice becomes an ordinary differential equation in x: the curvature of the temperature equals m² times its excess over the air temperature. The constant m combines the leak (h, perimeter) with the conduction along the shaft (k, cross-section).

Replacing the second derivative by the second difference gives one linear equation per point: a **tridiagonal** system, each equation linking a point only to its two neighbours. The base is held at the housing temperature. At the free end, the simplest model treats the small end face as insulated: zero slope. A **ghost point** past the end, set equal to its mirror image, makes the centred slope there zero. The system then goes to the linear solver of the matrices lesson. This problem also has an exact solution, a hyperbolic cosine, which checks the numbers.

Predict before running: a 20 mm steel shaft (k = 50 W/(m·K)) sticks out 0.3 m from a 120 °C housing into 20 °C air, with h = 10 W/(m²·K). How warm is its tip?

```python
k_s, D, h, L_shaft, T_base, T_air = 50.0, 0.02, 10.0, 0.3, 120.0, 20.0
m = math.sqrt(4 * h / (k_s * D))
N = 60
xf = np.linspace(0, L_shaft, N + 1)
d = xf[1] - xf[0]
A = np.zeros((N, N))
rhs = np.zeros(N)
for i in range(N):
    A[i, i] = -(2 + (m * d) ** 2)
    if i > 0:
        A[i, i - 1] = 1.0
    if i < N - 1:
        A[i, i + 1] = 1.0
A[N - 1, N - 2] = 2.0
rhs[0] = -(T_base - T_air)
theta = np.linalg.solve(A, rhs)
T_shaft = T_air + np.concatenate(([T_base - T_air], theta))
exact = T_air + (T_base - T_air) * np.cosh(m * (L_shaft - xf)) / np.cosh(m * L_shaft)
print(f"m = {m:.3f} per m, mL = {m * L_shaft:.2f}")
print(f"tip: {T_shaft[-1]:.3f} °C (exact {exact[-1]:.3f} °C); largest difference along the shaft {np.abs(T_shaft - exact).max():.4f} °C")
power = k_s * math.pi * D ** 2 / 4 * m * (T_base - T_air) * math.tanh(m * L_shaft)
print(f"heat leaving the housing through the shaft: {power:.2f} W")

fig, ax = plt.subplots(figsize=(6, 3))
ax.plot(xf, T_shaft, label="finite differences")
ax.plot(xf, exact, "--", label="exact")
ax.set_xlabel("distance from housing (m)")
ax.set_ylabel("°C")
ax.legend(fontsize=8)
plt.show()
```

The tip settles at about 49.3 °C, and the 60-interval solution matches the exact cosh profile to within about 0.002 °C everywhere. The heat leaving through the shaft, −k A θ′(0) at the base, is about 9.5 W. With mL ≈ 1.9 the tip's excess over the air has fallen to about 29% of the base's, and the heat flow, proportional to tanh mL ≈ 0.96, is already 96% of what an infinitely long shaft would carry. That is why cooling fins are short: beyond about mL = 2 extra length adds almost nothing. Every unknown in the system touched only its two neighbours. Large heat-flow models in 2D and 3D give the same kind of sparse matrix, millions of unknowns with a handful of entries per row.

## Sine modes: why sharp detail fades first

::: math
\[ u(x, t) = T_\text{end} + \sum_{n=1}^{\infty} b_n \sin\frac{n\pi x}{L}\, e^{-\alpha (n\pi/L)^2 t}, \qquad b_n = \frac{2}{L}\int_0^L \big(u(x, 0) - T_\text{end}\big)\sin\frac{n\pi x}{L}\,dx \]
- each sine shape keeps its shape and decays at its own rate; the time constant of mode $n$ is $\tau_n = \dfrac{1}{\alpha (n\pi/L)^2}$
- mode $n$ decays $n^2$ times faster than mode 1: fine detail disappears first
In code: `b = [2 / Lbar * np.trapezoid(...) for n ...]`, then `mode_sum(x, t, n_modes)`
:::

With both ends held at the same temperature, the heat equation has special solutions: a sine shape that fits the bar, sin(nπx/L), multiplied by an exponential decay in time. Substituting shows why. The second derivative of the sine is −(nπ/L)² times the sine, so the heat equation turns into the decay law dy/dt = −α(nπ/L)²y of the exponential lesson, one for each mode. These are the eigenvectors of the vibration lesson again: shapes that the equation only scales.

Any starting profile is a sum of these sines: its Fourier sine series, with coefficients found by projection, as in the building-signals lesson. Each term then decays on its own. Higher modes have more wiggles, steeper curvature, and so decay n² times faster.

Predict before running: a welding torch leaves a hot spot of 100 °C, about 5 cm wide at half height, 0.15 m along the bar, with both ends at 20 °C. How many modes are needed to describe the profile at the start, and how many after 30 minutes?

```python
spot = lambda xq: 20 + 80 * np.exp(-((xq - 0.15) / 0.03) ** 2)
fine = np.linspace(0, Lbar, 2001)
b = [2 / Lbar * np.trapezoid((spot(fine) - 20) * np.sin(n * math.pi * fine / Lbar), fine) for n in range(1, 81)]

def mode_sum(xq, t, n_modes):
    return 20 + sum(b[n - 1] * np.sin(n * math.pi * xq / Lbar) * math.exp(-alpha * (n * math.pi / Lbar) ** 2 * t) for n in range(1, n_modes + 1))

for n in [1, 2, 5, 10, 20]:
    print(f"mode {n:>2}: time constant {1 / (alpha * (n * math.pi / Lbar) ** 2):7.1f} s")

u = spot(x)
u[0] = u[-1] = 20.0
t = 0.0
while t < 1800 - 1e-9:
    u = ftcs_step(u, r)
    t += dt
print(f"after 30 min: finite differences vs 80 modes differ by at most {np.abs(u - mode_sum(x, t, 80)).max():.4f} °C; peak {u.max():.2f} °C")
for n_modes in [5, 20]:
    print(f"{n_modes} modes: error at the start {np.abs(mode_sum(x, 0, n_modes) - spot(x)).max():6.2f} °C, after 30 min {np.abs(mode_sum(x, 1800, n_modes) - mode_sum(x, 1800, 80)).max():.1e} °C")

fig, ax = plt.subplots(figsize=(6, 3))
for t_show in [0, 60, 300, 1800]:
    ax.plot(x, mode_sum(x, t_show, 80), label=f"{t_show} s")
ax.set_xlabel("position (m)")
ax.set_ylabel("°C")
ax.legend(fontsize=8)
plt.show()
```

The first mode's time constant is about 35 minutes; the 10th mode's is 21 s and the 20th's about 5 s. At the start, five modes cannot draw a 3 cm spike: they miss by about 34 °C. After 30 minutes every mode above the fifth has decayed by a factor of more than e³⁰, so five modes describe the bar to within rounding. The spot has spread into a gentle hump peaking near 26 °C, and the finite-difference simulation agrees with the mode sum to within about 0.005 °C. The heat equation acts as a low-pass filter: it destroys high spatial frequencies fastest, so diffusion always smooths.

::: challenge The explicit step [easy]
Write `second_difference(u, dx)`: for a NumPy array or list of samples spaced dx apart, return the array of (u[i+1] − 2u[i] + u[i−1])/dx² for the interior points only (length len(u) − 2). Raise `ValueError` if u has fewer than 3 points or dx is not positive. Then write `heat_step(u, r)`: one explicit step of the heat equation with r = αΔt/Δx², returning a **new** array in which the two end values are unchanged and each interior value becomes u[i] + r(u[i+1] − 2u[i] + u[i−1]), all computed from the old values. Do not modify the input array. Raise `ValueError` if r is negative or greater than 0.5.

```python starter
import numpy as np

def second_difference(u, dx):
    return np.zeros(len(u) - 2)

def heat_step(u, r):
    return u

print(heat_step(np.array([200.0, 20, 20, 20]), 0.4))
```

```python solution
import numpy as np

def second_difference(u, dx):
    u = np.asarray(u, dtype=float)
    if u.size < 3:
        raise ValueError("need at least 3 points")
    if dx <= 0:
        raise ValueError("dx must be positive")
    return (u[2:] - 2 * u[1:-1] + u[:-2]) / dx ** 2

def heat_step(u, r):
    if r < 0 or r > 0.5:
        raise ValueError("r must be between 0 and 0.5")
    u = np.asarray(u, dtype=float)
    new = u.copy()
    new[1:-1] = u[1:-1] + r * (u[2:] - 2 * u[1:-1] + u[:-2])
    return new

print(heat_step(np.array([200.0, 20, 20, 20]), 0.4))
```

```python test
import numpy as np
for _n in ["second_difference", "heat_step"]:
    assert _n in dir(), f"Define {_n}."
_x = np.linspace(0, 1, 11)
_d2 = np.asarray(second_difference(_x ** 2, 0.1))
assert _d2.shape == (9,) and np.allclose(_d2, 2.0), f"The second difference of x² is exactly 2 at every interior point; got {_d2}."
assert np.allclose(second_difference([1.0, 4.0, 9.0], 1.0), [2.0]), "Plain lists work too."
for _bad in [([1.0, 2.0], 0.1), ([1.0, 2.0, 3.0], 0.0)]:
    try:
        second_difference(*_bad)
        assert False, f"second_difference{_bad} should raise ValueError."
    except ValueError:
        pass
_u = np.array([200.0, 20.0, 20.0, 20.0, 20.0])
_keep = _u.copy()
_v = np.asarray(heat_step(_u, 0.4))
assert np.array_equal(_u, _keep), "Do not modify the input array."
assert np.allclose(_v, [200.0, 92.0, 20.0, 20.0, 20.0]), f"One step from (200, 20, 20, 20, 20) with r = 0.4: got {_v}."
_w = np.asarray(heat_step(np.array([0.0, 10.0, 0.0, 10.0, 0.0]), 0.25))
assert np.allclose(_w, [0.0, 5.0, 5.0, 5.0, 0.0]), f"Every interior value uses the OLD neighbours; got {_w}."
_z = np.array([20.0, 50.0, 80.0, 30.0, 20.0])
for _ in range(200):
    _z = heat_step(_z, 0.5)
assert np.all(_z >= 20.0 - 1e-9) and np.all(_z <= 80.0 + 1e-9), "At r <= 0.5 no new extremes appear."
for _bad_r in [-0.1, 0.51]:
    try:
        heat_step(_u, _bad_r)
        assert False, f"r = {_bad_r} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The 1, -2, 1 stencil measures curvature, and one explicit step nudges every point towards its neighbours' average."
```

Hint: Slices do the whole interior at once: `u[2:]` are the right neighbours, `u[:-2]` the left ones and `u[1:-1]` the points themselves. Copy the array first, then overwrite only `new[1:-1]`.
:::

::: challenge Simulating a bar [medium]
Write `simulate_bar(u0, alpha, dx, t_end, safety=0.9)`: starting from the profile `u0` (end values held fixed), run explicit steps up to time `t_end` and return the final profile as a NumPy array. Choose the number of steps as the smallest whole number for which Δt = t_end / steps satisfies Δt ≤ safety × Δx²/(2α); with t_end = 0 return a copy of u0. Raise `ValueError` if alpha, dx or safety is not positive, safety > 1, or t_end is negative. Then write `time_to_reach(u0, alpha, dx, index, value, safety=0.9, t_max=1e6)`: step with Δt = safety × Δx²/(2α) and return the first time (a plain float, a whole number of steps × Δt) at which `u[index]` is at least `value`; return 0.0 if it already is, and raise `RuntimeError` if it has not happened by `t_max`.

```python starter
import math
import numpy as np

def simulate_bar(u0, alpha, dx, t_end, safety=0.9):
    return np.array(u0, dtype=float)

def time_to_reach(u0, alpha, dx, index, value, safety=0.9, t_max=1e6):
    return 0.0

start = np.full(51, 20.0)
start[0] = 200.0
print(simulate_bar(start, 1.2e-5, 0.01, 1800)[25])
```

```python solution
import math
import numpy as np

def _check(alpha, dx, safety):
    if alpha <= 0 or dx <= 0 or safety <= 0 or safety > 1:
        raise ValueError("alpha and dx must be positive, 0 < safety <= 1")

def simulate_bar(u0, alpha, dx, t_end, safety=0.9):
    _check(alpha, dx, safety)
    if t_end < 0:
        raise ValueError("t_end must not be negative")
    u = np.array(u0, dtype=float)
    if t_end == 0:
        return u
    limit = safety * dx ** 2 / (2 * alpha)
    steps = math.ceil(t_end / limit)
    r = alpha * (t_end / steps) / dx ** 2
    for _ in range(steps):
        u[1:-1] = u[1:-1] + r * (u[2:] - 2 * u[1:-1] + u[:-2])
    return u

def time_to_reach(u0, alpha, dx, index, value, safety=0.9, t_max=1e6):
    _check(alpha, dx, safety)
    u = np.array(u0, dtype=float)
    dt = safety * dx ** 2 / (2 * alpha)
    r = alpha * dt / dx ** 2
    k = 0
    while u[index] < value:
        if k * dt > t_max:
            raise RuntimeError("value not reached by t_max")
        u[1:-1] = u[1:-1] + r * (u[2:] - 2 * u[1:-1] + u[:-2])
        k += 1
    return float(k * dt)

start = np.full(51, 20.0)
start[0] = 200.0
print(simulate_bar(start, 1.2e-5, 0.01, 1800)[25])
```

```python test
import math
import numpy as np
for _n in ["simulate_bar", "time_to_reach"]:
    assert _n in dir(), f"Define {_n}."
_s = np.full(51, 20.0)
_s[0] = 200.0
_keep = _s.copy()
_u = np.asarray(simulate_bar(_s, 1.2e-5, 0.01, 1800))
assert np.array_equal(_s, _keep), "Do not modify u0."
assert _u.shape == (51,) and _u[0] == 200.0 and _u[-1] == 20.0, "Same length, ends held fixed."
assert abs(_u[25] - 61.2) < 0.3, f"The middle after 30 min is about 61.2 °C; got {_u[25]:.3f}."
_long = np.asarray(simulate_bar(_s, 1.2e-5, 0.01, 6e5))
assert np.allclose(_long, np.linspace(200, 20, 51), atol=1e-3), "After a very long time the profile is the straight steady state."
assert np.array_equal(np.asarray(simulate_bar(_s, 1.2e-5, 0.01, 0)), _s), "t_end = 0 returns the start."
_b = np.asarray(simulate_bar(_s, 1.2e-5, 0.01, 3600, safety=1.0))
assert np.all(_b >= 20 - 1e-9) and np.all(_b <= 200 + 1e-9), "safety = 1 (r = 0.5) is still stable: temperatures stay between 20 and 200."
_one = np.asarray(simulate_bar(np.array([0.0, 10.0, 0.0]), 1.0, 1.0, 0.45, safety=0.9))
assert np.allclose(_one, [0.0, 1.0, 0.0]), f"One step of exactly t_end when it is within the limit: got {_one}."
for _bad in [dict(alpha=0), dict(dx=-1), dict(safety=1.5), dict(t_end=-1)]:
    _args = dict(u0=_s, alpha=1.2e-5, dx=0.01, t_end=10)
    _args.update(_bad)
    try:
        simulate_bar(**_args)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_t = time_to_reach(_s, 1.2e-5, 0.01, 25, 60.0)
assert type(_t) is float and abs(_t - 1750) < 30, f"The middle reaches 60 °C after about 29 minutes (1750 s); got {_t}."
_dt = 0.9 * 0.01 ** 2 / (2 * 1.2e-5)
assert abs(_t / _dt - round(_t / _dt)) < 1e-6, "Return a whole number of steps times Δt."
assert time_to_reach(_s, 1.2e-5, 0.01, 0, 150.0) == 0.0, "Already there: 0.0."
try:
    time_to_reach(_s, 1.2e-5, 0.01, 25, 150.0, t_max=1e5)
    assert False, "The middle never passes 110 °C, so 150 °C should raise RuntimeError."
except RuntimeError:
    pass
"SUCCESS: Choosing the step from the stability limit and holding the ends fixed turns the heat equation into a reliable simulation."
```

Hint: The limit on Δt is safety × Δx²/(2α); `math.ceil(t_end / limit)` gives the number of steps, and t_end / steps the actual Δt. For `time_to_reach`, count steps in a loop that stops as soon as `u[index] >= value`.
:::

::: challenge A shaft losing heat [hard]
Write `thomas(lower, diag, upper, rhs)`: solve a tridiagonal system with the Thomas algorithm (forward elimination, then back substitution). `diag` and `rhs` have length n; `lower` and `upper` have length n − 1 (`lower[i]` is the entry below the diagonal in row i + 1, `upper[i]` the entry above it in row i). Return the solution as a NumPy array. Raise `ValueError` if the lengths do not fit or a pivot becomes zero. Do not call `np.linalg` (the tests check).

Then write `shaft_temperatures(length, m, T_base, T_air, n)`: the steady temperatures at the n + 1 points x = 0, Δx, ..., length of a shaft obeying θ″ = m²θ (θ = T − T_air), with T(0) = T_base and an insulated tip (zero slope, via a ghost point θ_{n+1} = θ_{n−1}), using second differences and your `thomas`. Return a NumPy array of length n + 1. Raise `ValueError` if n < 2, or length or m is not positive.

```python starter
import numpy as np

def thomas(lower, diag, upper, rhs):
    return np.zeros(len(diag))

def shaft_temperatures(length, m, T_base, T_air, n):
    return np.full(n + 1, float(T_base))

print(shaft_temperatures(0.3, 6.3246, 120, 20, 60)[-1])
```

```python solution
import numpy as np

def thomas(lower, diag, upper, rhs):
    n = len(diag)
    if len(rhs) != n or len(lower) != n - 1 or len(upper) != n - 1:
        raise ValueError("lengths do not fit")
    c = np.zeros(n)
    d = np.zeros(n)
    piv = float(diag[0])
    if piv == 0:
        raise ValueError("zero pivot")
    c[0] = upper[0] / piv if n > 1 else 0.0
    d[0] = rhs[0] / piv
    for i in range(1, n):
        piv = diag[i] - lower[i - 1] * c[i - 1]
        if piv == 0:
            raise ValueError("zero pivot")
        c[i] = upper[i] / piv if i < n - 1 else 0.0
        d[i] = (rhs[i] - lower[i - 1] * d[i - 1]) / piv
    out = np.zeros(n)
    out[-1] = d[-1]
    for i in range(n - 2, -1, -1):
        out[i] = d[i] - c[i] * out[i + 1]
    return out

def shaft_temperatures(length, m, T_base, T_air, n):
    if n < 2 or length <= 0 or m <= 0:
        raise ValueError("need n >= 2 and positive length and m")
    dx = length / n
    diag = np.full(n, -(2 + (m * dx) ** 2))
    lower = np.ones(n - 1)
    upper = np.ones(n - 1)
    lower[-1] = 2.0
    rhs = np.zeros(n)
    rhs[0] = -(T_base - T_air)
    theta = thomas(lower, diag, upper, rhs)
    return T_air + np.concatenate(([T_base - T_air], theta))

print(shaft_temperatures(0.3, 6.3246, 120, 20, 60)[-1])
```

```python test
import ast
import inspect
import math
import numpy as np
for _n in ["thomas", "shaft_temperatures"]:
    assert _n in dir(), f"Define {_n}."
try:
    _src = inspect.getsource(thomas) + inspect.getsource(shaft_temperatures)
    _attrs = {_node.attr for _node in ast.walk(ast.parse(_src)) if isinstance(_node, ast.Attribute)}
    assert not (_attrs & {"linalg", "solve", "inv", "lstsq"}), "Solve the system with your own Thomas algorithm, not np.linalg."
except (OSError, TypeError):
    pass
_rng = np.random.default_rng(52)
for _size in [1, 2, 5, 40]:
    _lo, _up = _rng.normal(size=_size - 1), _rng.normal(size=_size - 1)
    _dg = 4 + _rng.random(_size)
    _rhs = _rng.normal(size=_size)
    _M = np.diag(_dg) + np.diag(_lo, -1) + np.diag(_up, 1)
    _sol = np.asarray(thomas(_lo, _dg, _up, _rhs))
    assert _sol.shape == (_size,) and np.allclose(_M @ _sol, _rhs, atol=1e-10), f"thomas must solve the {_size} x {_size} system."
for _bad in [([1.0], [2.0, 2.0], [1.0, 1.0], [1.0, 1.0]), ([1.0], [0.0, 1.0], [1.0], [1.0, 1.0])]:
    try:
        thomas(*_bad)
        assert False, f"thomas{_bad} should raise ValueError."
    except ValueError:
        pass
_m = math.sqrt(4 * 10 / (50 * 0.02))
_T = np.asarray(shaft_temperatures(0.3, _m, 120.0, 20.0, 60))
_xs = np.linspace(0, 0.3, 61)
_exact = 20 + 100 * np.cosh(_m * (0.3 - _xs)) / np.cosh(_m * 0.3)
assert _T.shape == (61,) and _T[0] == 120.0, "n + 1 temperatures, the first held at T_base."
assert np.abs(_T - _exact).max() < 0.01, f"Within 0.01 °C of the exact cosh profile; tip {_T[-1]:.3f} against {_exact[-1]:.3f}."
_e20 = np.abs(np.asarray(shaft_temperatures(0.3, _m, 120.0, 20.0, 20)) - (20 + 100 * np.cosh(_m * (0.3 - np.linspace(0, 0.3, 21))) / np.cosh(_m * 0.3))).max()
_e40 = np.abs(np.asarray(shaft_temperatures(0.3, _m, 120.0, 20.0, 40)) - (20 + 100 * np.cosh(_m * (0.3 - np.linspace(0, 0.3, 41))) / np.cosh(_m * 0.3))).max()
assert 3.5 < _e20 / _e40 < 4.5, f"Doubling n should quarter the error (second order); ratio {_e20 / _e40:.2f}."
_short = np.asarray(shaft_temperatures(0.05, _m, 120.0, 20.0, 10))
assert _short[-1] > 115, "A short stub stays nearly at the base temperature."
for _bad in [(0.3, _m, 120, 20, 1), (0.0, _m, 120, 20, 10), (0.3, 0.0, 120, 20, 10)]:
    try:
        shaft_temperatures(*_bad)
        assert False, f"shaft_temperatures{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The steady heat balance is a tridiagonal system, and the Thomas algorithm solves it in time proportional to n."
```

Hint: Thomas: sweep down, storing c[i] = upper[i]/pivot and d[i] = (rhs[i] − lower[i−1]d[i−1])/pivot with pivot = diag[i] − lower[i−1]c[i−1]; then go up with x[i] = d[i] − c[i]x[i+1]. For the shaft, the unknowns are θ₁ ... θ_n; the first equation moves the known θ₀ to the right-hand side, and the ghost point turns the last row's left entry into 2.
:::

## What you learned

- The heat equation ∂u/∂t = α ∂²u/∂x² comes from Fourier's law and an energy balance on a thin slice: points colder than their neighbours warm up.
- The second difference (u_{i+1} − 2u_i + u_{i−1})/Δx² approximates the second derivative with error proportional to Δx².
- The explicit scheme steps each point towards its neighbours' average. It is stable only when r = αΔt/Δx² ≤ ½, so finer grids need much smaller time steps.
- Steady states satisfy ordinary differential equations in space; with second differences they become tridiagonal linear systems, checked here against the exact cosh solution for a shaft losing heat.
- With fixed ends, the solution is a sum of sine modes, each decaying exponentially, mode n about n² times faster than mode 1: diffusion erases fine detail first.

The next lesson keeps the same grid and the same second difference, but puts it into a different equation: a string that vibrates instead of a bar that cools.
