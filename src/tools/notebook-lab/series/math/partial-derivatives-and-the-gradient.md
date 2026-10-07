# Partial derivatives and the gradient

Stand on the heated plate of the previous lesson. Step east and the temperature changes at one rate; step north and it changes at another; step in some other direction and it changes at a third. A function of several variables has a rate of change for every direction, and all of them are captured by just two numbers, the **partial derivatives**, collected into the **gradient** vector. The gradient-descent lesson used the gradient to walk downhill. This lesson studies it as an object in its own right: computing partials symbolically, numerically and from gridded data, drawing the gradient as a field of arrows perpendicular to the contours, using it for linear approximation, and applying it to two of engineering's everyday calculations: heat flow, and how measurement uncertainties propagate into a computed result.

This lesson covers:

- partial derivatives as slopes along the axes, symbolically and numerically;
- the gradient: direction of steepest increase, perpendicular to contours;
- directional derivatives in any direction;
- gradients of gridded data with `np.gradient`, and Fourier's law of heat flow;
- the tangent plane, and propagating measurement uncertainty.

## Partial derivatives

::: math
\[ \frac{\partial f}{\partial x} \approx \frac{f(x + h, y) - f(x - h, y)}{2h}, \qquad \frac{\partial T}{\partial x} = -\frac{x - 300}{s^2}\,(T - 20) \]
- $\partial f/\partial x$: the slope in the $x$ direction with $y$ held fixed
- every one-variable rule applies, treating the other variable as a constant
In code: `sp.diff(T_expr, x)` and `sp.diff(T_expr, y)`, turned into functions with `sp.lambdify`
:::


The **partial derivative** ∂f/∂x is the derivative of f with respect to x with y held fixed: the slope of the slice through the surface in the x direction. ∂f/∂y holds x fixed. All the one-variable rules apply, treating the other variable as a constant. Numerically, nudge one variable at a time: ∂f/∂x ≈ (f(x + h, y) − f(x − h, y))/(2h).

For the plate temperature T(x, y) = 20 + 160 e^(−r²/(2s²)) with r² = (x − 300)² + (y − 200)², the chain rule gives ∂T/∂x = −(x − 300)/s² × (T − 20). Predict before running: at the point (400, 250), is the plate getting hotter or colder as x increases, and which partial is larger in size?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

x, y = sp.symbols("x y")
s = 90
T_expr = 20 + 160 * sp.exp(-((x - 300) ** 2 + (y - 200) ** 2) / (2 * s ** 2))
Tx, Ty = sp.diff(T_expr, x), sp.diff(T_expr, y)
print("∂T/∂x =", sp.simplify(Tx))

T = sp.lambdify((x, y), T_expr)
Tx_f, Ty_f = sp.lambdify((x, y), Tx), sp.lambdify((x, y), Ty)
px, py, h = 400.0, 250.0, 1e-4
print(f"at (400, 250): T = {T(px, py):.2f} °C")
print(f"∂T/∂x = {Tx_f(px, py):.4f} °C/mm (numerical {(T(px + h, py) - T(px - h, py)) / (2 * h):.4f})")
print(f"∂T/∂y = {Ty_f(px, py):.4f} °C/mm (numerical {(T(px, py + h) - T(px, py - h)) / (2 * h):.4f})")
```

```output
∂T/∂x = 8*(300 - x)*exp(-(x - 300)**2/16200 - (y - 200)**2/16200)/405
at (400, 250): T = 93.96 °C
∂T/∂x = -0.9131 °C/mm (numerical -0.9131)
∂T/∂y = -0.4566 °C/mm (numerical -0.4566)
```

`sp.diff(T_expr, x)` differentiates with respect to x, treating y as a constant.

At (400, 250) both partials are negative: moving east or north takes you away from the hot spot, so it gets colder. ∂T/∂x, about −0.91 °C/mm, is twice ∂T/∂y, about −0.46 °C/mm, because the point is 100 mm east of the centre but only 50 mm north. Symbolic and numerical values agree to four decimals.

## The gradient and the contours

::: math
\[ \nabla T = \left(\frac{\partial T}{\partial x}, \frac{\partial T}{\partial y}\right), \qquad D_{\mathbf{u}} T = \nabla T \cdot \mathbf{u} \;\;(|\mathbf{u}| = 1) \]
- $\nabla T$ points in the direction of fastest increase; its length is that rate
- it is perpendicular to the contours, where $D_{\mathbf{u}} T = 0$
In code: `grad = np.array([gx, gy])`, `np.linalg.norm(grad)`, and `grad @ u` for each direction
:::


The **gradient** ∇f = (∂f/∂x, ∂f/∂y) combines both partials into a vector. Two facts make it central to multivariable calculus:

- the rate of change in a direction given by a unit vector u, the **directional derivative**, is ∇f · u, so the steepest increase is along ∇f itself, at a rate |∇f|;
- moving along a contour, f does not change, so ∇f · u = 0: the gradient is **perpendicular to the contours**.

On a map of the plate, arrows of ∇T point straight inwards across the isotherms, towards the hot spot, longest where the isotherms crowd together. Predict before running: in which direction is the plate getting hotter fastest at (400, 250), and how fast?

```python type
gx, gy = Tx_f(px, py), Ty_f(px, py)
grad = np.array([gx, gy])
print(f"gradient ({gx:.4f}, {gy:.4f}), steepest rise {np.linalg.norm(grad):.4f} °C/mm towards {math.degrees(math.atan2(gy, gx)):.1f}°")
centre_dir = np.array([300 - px, 200 - py])
print(f"direction to the hot spot: {math.degrees(math.atan2(centre_dir[1], centre_dir[0])):.1f}°")
for name, u in [("east", [1, 0]), ("north", [0, 1]), ("along the isotherm", [-gy, gx])]:
    u = np.array(u, dtype=float) / np.linalg.norm(u)
    print(f"directional derivative {name}: {grad @ u:+.4f} °C/mm")

xs, ys = np.linspace(0, 600, 121), np.linspace(0, 400, 81)
X, Y = np.meshgrid(xs, ys)
fig, ax = plt.subplots(figsize=(7, 4.4))
ax.contour(X, Y, T(X, Y), levels=[30, 60, 90, 120, 150], colors="grey")
Xq, Yq = X[::8, ::8], Y[::8, ::8]
ax.quiver(Xq, Yq, Tx_f(Xq, Yq), Ty_f(Xq, Yq), color="C3")
ax.set_aspect("equal")
ax.set_title("isotherms and the gradient field")
plt.show()
```

```output
gradient (-0.9131, -0.4566), steepest rise 1.0209 °C/mm towards -153.4°
direction to the hot spot: -153.4°
directional derivative east: -0.9131 °C/mm
directional derivative north: -0.4566 °C/mm
directional derivative along the isotherm: +0.0000 °C/mm
```

`X[::8, ::8]` takes every eighth grid point so the arrows do not overlap.

The steepest rise points at −153.4° (that is, 206.6°), exactly towards the hot spot, at about 1.02 °C/mm. East and north give the partials themselves (the components of the gradient), and along the isotherm the directional derivative is zero, as it must be. The arrow field shows the gradient everywhere: perpendicular to every isotherm, longest in the ring where they crowd, and tiny near the centre and far away.

## Gradients of measured data and heat flow

::: math
\[ \mathbf{q} = -k\,\nabla T, \qquad |\mathbf{q}| = k\sqrt{\left(\frac{\partial T}{\partial x}\right)^2 + \left(\frac{\partial T}{\partial y}\right)^2} \]
- Fourier's law: heat flows down the gradient; $k$: thermal conductivity
- gridded data: central differences in each direction
In code: `dT_dy, dT_dx = np.gradient(TT, dy_m, dx_m)` (rows first), then `k_steel * np.hypot(dT_dx, dT_dy)`
:::


A thermal camera gives temperatures on a grid of pixels, not a formula. `np.gradient(Z, dy, dx)` estimates both partials at every grid point with central differences inside and one-sided differences at the edges; with the grid spacings supplied, the results are in physical units. Note the order: it returns the derivative along the rows (y) first, then along the columns (x).

Heat flows from hot to cold, down the gradient. **Fourier's law** makes it quantitative: the heat flux (power per unit area through the material) is q = −k ∇T, where k is the thermal conductivity (about 50 W/(m·K) for steel). Predict before running: where on the plate is the heat flux largest, and how large?

```python type
dx_m, dy_m = (xs[1] - xs[0]) / 1000, (ys[1] - ys[0]) / 1000
TT = T(X, Y)
dT_dy, dT_dx = np.gradient(TT, dy_m, dx_m)
k_steel = 50.0
flux = k_steel * np.hypot(dT_dx, dT_dy)
j, i = np.unravel_index(np.argmax(flux), flux.shape)
r_peak = math.hypot(xs[i] - 300, ys[j] - 200)
print(f"largest heat flux {flux[j, i] / 1000:.1f} kW/m² at ({xs[i]:.0f}, {ys[j]:.0f}) mm, {r_peak:.0f} mm from the centre")
exact = Tx_f(400.0, 250.0) * 1000
print(f"∂T/∂x at (400, 250): np.gradient {dT_dx[50, 80]:.1f} K/m, exact {exact:.1f} K/m")
```

```output
largest heat flux 53.9 kW/m² at (300, 110) mm, 90 mm from the centre
∂T/∂x at (400, 250): np.gradient -912.3 K/m, exact -913.1 K/m
```

Spacings are converted to metres so the gradient is in kelvin per metre and the flux in W/m². `dT_dx[50, 80]` is row 50 (y = 250) and column 80 (x = 400).

The flux peaks about 90 mm from the centre, the radius where the temperature falls most steeply (it equals the hot spot's width parameter s), at roughly 54 kW/m². The grid estimate of the partial derivative at (400, 250) is within a fraction of a percent of the exact value. Engineers find hot spots this way from thermal images and use the flux to size cooling.

## Linear approximation and uncertainty

::: math
\[ \Delta f \approx \frac{\partial f}{\partial x_1}\Delta x_1 + \frac{\partial f}{\partial x_2}\Delta x_2, \qquad \sigma_f^2 \approx \left(\frac{\partial f}{\partial x_1}\sigma_1\right)^2 + \left(\frac{\partial f}{\partial x_2}\sigma_2\right)^2 \]
- for $P = V^2/R$: $\dfrac{\partial P}{\partial V} = \dfrac{2V}{R}$ and $\dfrac{\partial P}{\partial R} = -\dfrac{V^2}{R^2}$
- each term is one input's contribution to the uncertainty
In code: `math.hypot(dP_dV * sV, dP_dR * sR)`
:::


Near a point, a smooth surface looks like its **tangent plane**: f(x + Δx, y + Δy) ≈ f(x, y) + f_x Δx + f_y Δy, the two-variable version of the tangent line. The partials say how sensitive the output is to each input.

That sensitivity gives the standard rule for **propagating measurement uncertainty**. If inputs carry independent uncertainties σ₁, σ₂, ..., the linear approximation and the rule that independent variances add give

\[ \sigma_f^2 \approx \left(\frac{\partial f}{\partial x_1}\sigma_1\right)^2 + \left(\frac{\partial f}{\partial x_2}\sigma_2\right)^2 + \cdots \]

Predict before running: the power in a heater is P = V²/R with V = 230 ± 2 V and R = 26.5 ± 0.3 Ω. Which input contributes more uncertainty?

```python type
V0, R0, sV, sR = 230.0, 26.5, 2.0, 0.3
P = lambda v, r: v ** 2 / r
dP_dV = 2 * V0 / R0
dP_dR = -V0 ** 2 / R0 ** 2
sigma_P = math.hypot(dP_dV * sV, dP_dR * sR)
print(f"P = {P(V0, R0):.1f} W; from V: ±{abs(dP_dV * sV):.1f} W, from R: ±{abs(dP_dR * sR):.1f} W, combined ±{sigma_P:.1f} W")

rng = np.random.default_rng(33)
samples = P(rng.normal(V0, sV, 200_000), rng.normal(R0, sR, 200_000))
print(f"Monte Carlo: mean {samples.mean():.1f} W, sd {samples.std():.1f} W")
```

```output
P = 1996.2 W; from V: ±34.7 W, from R: ±22.6 W, combined ±41.4 W
Monte Carlo: mean 1996.5 W, sd 41.4 W
```

The Monte Carlo check draws 200,000 random voltages and resistances, computes the power for each, and measures the spread directly, with no approximation.

The voltage's 0.9% uncertainty contributes about ±34.7 W, and the resistance's 1.1% about ±22.6 W: although V is the more precise measurement, P depends on its square, so V's relative error counts double. The combined uncertainty is about ±41 W, and the Monte Carlo spread agrees. When the uncertainties are large enough that f curves noticeably over their range, the linear rule starts to fail, and simulation is the safer check.

::: challenge Partial derivatives [easy]
Write `partials(f, x, y, h=1e-6)` returning `(fx, fy)`, the central-difference partial derivatives of f(x, y) at a point, as plain floats; raise `ValueError` if h is not positive. Write `steepest(f, x, y)` returning `(rate, angle_deg)`: the magnitude of the gradient and its direction in [0, 360) degrees, each rounded to 4 decimal places; raise `ValueError` if the gradient is zero to within 1e-12 (no steepest direction). Then write `directional(f, x, y, angle_deg)`, the rate of change in the direction at the given angle, rounded to 4 decimal places.

```python starter
def partials(f, x, y, h=1e-6):
    return (0.0, 0.0)

def steepest(f, x, y):
    return (0.0, 0.0)

def directional(f, x, y, angle_deg):
    return 0.0

print(partials(lambda x, y: x * x * y, 2.0, 3.0))
```

```python solution
def partials(f, x, y, h=1e-6):
    if h <= 0:
        raise ValueError("h must be positive")
    fx = (f(x + h, y) - f(x - h, y)) / (2 * h)
    fy = (f(x, y + h) - f(x, y - h)) / (2 * h)
    return (float(fx), float(fy))

def steepest(f, x, y):
    fx, fy = partials(f, x, y)
    rate = math.hypot(fx, fy)
    if rate < 1e-12:
        raise ValueError("the gradient is zero here")
    return (round(rate, 4), round(math.degrees(math.atan2(fy, fx)) % 360, 4))

def directional(f, x, y, angle_deg):
    fx, fy = partials(f, x, y)
    t = math.radians(angle_deg)
    return round(fx * math.cos(t) + fy * math.sin(t), 4)

print(partials(lambda x, y: x * x * y, 2.0, 3.0))
```

```python test
for _n in ["partials", "steepest", "directional"]:
    assert _n in dir(), f"Define {_n}."
_fx, _fy = partials(lambda x, y: x * x * y, 2.0, 3.0)
assert abs(_fx - 12) < 1e-6 and abs(_fy - 4) < 1e-6 and type(_fx) is float, f"∂(x²y)/∂x = 2xy = 12, ∂/∂y = x² = 4; got {(_fx, _fy)}."
try:
    partials(lambda x, y: x, 0, 0, h=0)
    assert False, "h = 0 should raise ValueError."
except ValueError:
    pass
assert steepest(lambda x, y: 3 * x + 4 * y, 1, 1) == (5.0, 53.1301), f"Got {steepest(lambda x, y: 3 * x + 4 * y, 1, 1)}."
assert steepest(lambda x, y: -x, 0, 0) == (1.0, 180.0) and steepest(lambda x, y: -y, 0, 0) == (1.0, 270.0), "Angles in [0, 360)."
try:
    steepest(lambda x, y: x * x + y * y, 0, 0)
    assert False, "At a minimum the gradient is zero: raise ValueError."
except ValueError:
    pass
assert directional(lambda x, y: 3 * x + 4 * y, 0, 0, 0) == 3.0 and directional(lambda x, y: 3 * x + 4 * y, 0, 0, 90) == 4.0, "Along the axes, the partials."
assert directional(lambda x, y: 3 * x + 4 * y, 0, 0, 53.1301) == 5.0 and directional(lambda x, y: 3 * x + 4 * y, 0, 0, 143.1301) == 0.0, "Steepest along the gradient; zero along the contour."
"SUCCESS: Two partial derivatives give the rate of change in every direction: ∇f · u."
```

Hint: Nudge one variable at a time for each partial. The steepest rate is the gradient's length, its direction `atan2(fy, fx)`. The directional rate at angle θ is fx cos θ + fy sin θ.
:::

::: challenge Gradients of an image [medium]
Write `grid_gradient(Z, dx, dy)` returning `(dZdx, dZdy)` for a 2D array with rows along y and columns along x, using `np.gradient` with the spacings. Raise `ValueError` if Z has fewer than 2 rows or columns, or a spacing is not positive. Then write `max_flux(Z, dx, dy, k)`: the largest heat-flux magnitude k |∇Z| over the grid and its location as `(flux, row, col)` (flux as a plain float, row and column as ints). Finally write `flux_direction_deg(Z, dx, dy, row, col)`: the direction of heat flow −∇Z at that grid point, in [0, 360) degrees, rounded to 2 decimal places.

```python starter
def grid_gradient(Z, dx, dy):
    return (np.zeros_like(Z), np.zeros_like(Z))

def max_flux(Z, dx, dy, k):
    return (0.0, 0, 0)

def flux_direction_deg(Z, dx, dy, row, col):
    return 0.0

print(grid_gradient(np.array([[0.0, 1, 2], [10, 11, 12]]), 1.0, 1.0))
```

```python solution
def grid_gradient(Z, dx, dy):
    Z = np.asarray(Z, dtype=float)
    if Z.ndim != 2 or Z.shape[0] < 2 or Z.shape[1] < 2 or dx <= 0 or dy <= 0:
        raise ValueError("need a 2D grid of at least 2 x 2 and positive spacings")
    dZdy, dZdx = np.gradient(Z, dy, dx)
    return dZdx, dZdy

def max_flux(Z, dx, dy, k):
    gx, gy = grid_gradient(Z, dx, dy)
    mag = k * np.hypot(gx, gy)
    row, col = np.unravel_index(np.argmax(mag), mag.shape)
    return (float(mag[row, col]), int(row), int(col))

def flux_direction_deg(Z, dx, dy, row, col):
    gx, gy = grid_gradient(Z, dx, dy)
    return round(math.degrees(math.atan2(-gy[row, col], -gx[row, col])) % 360, 2)

print(grid_gradient(np.array([[0.0, 1, 2], [10, 11, 12]]), 1.0, 1.0))
```

```python test
for _n in ["grid_gradient", "max_flux", "flux_direction_deg"]:
    assert _n in dir(), f"Define {_n}."
_gx, _gy = grid_gradient(np.array([[0.0, 1, 2], [10, 11, 12]]), 1.0, 1.0)
assert np.allclose(_gx, 1) and np.allclose(_gy, 10), "Columns are x, rows are y."
_xs, _ys = np.linspace(0, 3, 31), np.linspace(0, 2, 41)
_X, _Y = np.meshgrid(_xs, _ys)
_gx, _gy = grid_gradient(3 * _X - 2 * _Y + _X * _Y, 0.1, 0.05)
assert np.allclose(_gx, 3 + _Y) and np.allclose(_gy, -2 + _X), "Exact for a bilinear field, with the spacings applied."
for _bad in [(np.zeros((1, 5)), 1, 1), (np.zeros((3, 3)), 0, 1), (np.zeros((3, 3)), 1, -1)]:
    try:
        grid_gradient(*_bad)
        assert False, "Bad grids or spacings should raise ValueError."
    except ValueError:
        pass
_T = 20 + 160 * np.exp(-((_X - 1.5) ** 2 + (_Y - 1) ** 2) / (2 * 0.3 ** 2))
_f, _r, _c = max_flux(_T, 0.1, 0.05, 50)
assert type(_f) is float and type(_r) is int and type(_c) is int, "Plain float and ints."
assert abs(math.hypot(_xs[_c] - 1.5, _ys[_r] - 1) - 0.3) < 0.08, "The flux peaks about one width from the centre."
assert flux_direction_deg(_T, 0.1, 0.05, 20, 25) == 0.0, "East of the hot spot, heat flows east (0°)."
assert flux_direction_deg(_T, 0.1, 0.05, 30, 15) == 90.0, "Directly north of it, heat flows north."
"SUCCESS: np.gradient turns a thermal image into a heat-flux field: magnitude from |∇T|, direction straight down the gradient."
```

Hint: `np.gradient(Z, dy, dx)` returns the derivative along rows (y) first, then along columns (x). The flux magnitude is k × hypot of the two; its direction is that of (−∂Z/∂x, −∂Z/∂y).
:::

::: challenge Propagating uncertainty [hard]
Write `propagate(f, values, sigmas, h=1e-6)`: for a function f of several inputs (called as `f(*values)`), estimate each partial derivative with a **relative** central difference (step `h * max(1, abs(value))`), and return `(value, sigma, contributions)`, where `value` is f at the inputs, `sigma` the combined uncertainty √Σ(∂f/∂xᵢ σᵢ)², and `contributions` a list of |∂f/∂xᵢ| σᵢ, all plain floats. Raise `ValueError` if the lists differ in length or any σ is negative. Then write `monte_carlo(f, values, sigmas, trials, seed)`: draw each input from a normal distribution with `np.random.default_rng(seed).normal(values, sigmas, size=(trials, len(values)))`, evaluate f on the columns (f must accept arrays: call `f(*draws.T)`), and return `(mean, sd)` as plain floats. Finally `dominant_input(f, values, sigmas)`: the index of the largest contribution.

```python starter
def propagate(f, values, sigmas, h=1e-6):
    return (float(f(*values)), 0.0, [0.0] * len(values))

def monte_carlo(f, values, sigmas, trials, seed):
    return (float(f(*values)), 0.0)

def dominant_input(f, values, sigmas):
    return 0

print(propagate(lambda v, r: v ** 2 / r, [230, 26.5], [2, 0.3]))
```

```python solution
def propagate(f, values, sigmas, h=1e-6):
    if len(values) != len(sigmas) or any(s < 0 for s in sigmas):
        raise ValueError("need matching lists and non-negative sigmas")
    vals = [float(v) for v in values]
    contributions = []
    for i, (v, s) in enumerate(zip(vals, sigmas)):
        step = h * max(1.0, abs(v))
        up, down = list(vals), list(vals)
        up[i], down[i] = v + step, v - step
        d = (f(*up) - f(*down)) / (2 * step)
        contributions.append(float(abs(d) * s))
    sigma = math.sqrt(sum(c * c for c in contributions))
    return (float(f(*vals)), float(sigma), contributions)

def monte_carlo(f, values, sigmas, trials, seed):
    draws = np.random.default_rng(seed).normal(values, sigmas, size=(trials, len(values)))
    out = f(*draws.T)
    return (float(np.mean(out)), float(np.std(out)))

def dominant_input(f, values, sigmas):
    _, _, contributions = propagate(f, values, sigmas)
    return int(np.argmax(contributions))

print(propagate(lambda v, r: v ** 2 / r, [230, 26.5], [2, 0.3]))
```

```python test
for _n in ["propagate", "monte_carlo", "dominant_input"]:
    assert _n in dir(), f"Define {_n}."
_P = lambda v, r: v ** 2 / r
_val, _sig, _con = propagate(_P, [230, 26.5], [2, 0.3])
assert abs(_val - 230 ** 2 / 26.5) < 1e-9 and abs(_con[0] - 2 * 230 / 26.5 * 2) < 1e-3 and abs(_con[1] - 230 ** 2 / 26.5 ** 2 * 0.3) < 1e-3, f"Got {(_val, _sig, _con)}."
assert abs(_sig - math.hypot(*_con)) < 1e-9 and all(type(_c) is float for _c in _con) and type(_sig) is float, "Combine in quadrature; plain floats."
_rho = lambda m, d, h: m / (math.pi * (d / 2) ** 2 * h) if not isinstance(m, np.ndarray) else m / (np.pi * (d / 2) ** 2 * h)
_v, _s, _c = propagate(_rho, [0.2513, 0.02, 0.1], [0.0002, 0.00005, 0.0002])
_rel = math.sqrt((0.0002 / 0.2513) ** 2 + (2 * 0.00005 / 0.02) ** 2 + (0.0002 / 0.1) ** 2)
assert abs(_s / _v - _rel) < 1e-4, "Density of a cylinder: relative errors add in quadrature, the diameter's counting twice."
assert dominant_input(_rho, [0.2513, 0.02, 0.1], [0.0002, 0.00005, 0.0002]) == 1, "The diameter dominates."
assert dominant_input(_P, [230, 26.5], [2, 0.3]) == 0, "The voltage dominates the heater."
for _bad in [([1, 2], [0.1]), ([1, 2], [0.1, -0.1])]:
    try:
        propagate(_P, *_bad)
        assert False, f"propagate with {_bad} should raise ValueError."
    except ValueError:
        pass
_m, _sd = monte_carlo(_P, [230, 26.5], [2, 0.3], 200_000, 7)
assert abs(_sd - _sig) / _sig < 0.03 and abs(_m - _val) < 2, f"Monte Carlo should agree with the linear rule; got {(_m, _sd)}."
assert type(_m) is float, "Plain floats."
"SUCCESS: Partial derivatives turn input uncertainties into output uncertainty, and a quick simulation confirms the linear rule."
```

Hint: For each input, copy the list, nudge that entry up and down by `h * max(1, |value|)`, and take the central difference; multiply its size by σ. Combine with √Σc². For Monte Carlo, `draws.T` unpacks into one array per input.
:::

## What you learned

- A partial derivative is the slope along one axis with the other variables held fixed; symbolic rules and one-at-a-time central differences both compute it.
- The gradient ∇f points in the direction of steepest increase with length equal to that rate, is perpendicular to contours, and gives every directional derivative as ∇f · u.
- `np.gradient` estimates gradients of gridded data; Fourier's law q = −k∇T turns a temperature field into heat flow.
- The tangent plane f + f_x Δx + f_y Δy approximates a surface near a point.
- Measurement uncertainties propagate as σ_f² ≈ Σ(∂f/∂xᵢ σᵢ)²; a Monte Carlo simulation checks the linear rule.

The next lesson extends the gradient to functions with several outputs: the Jacobian.
