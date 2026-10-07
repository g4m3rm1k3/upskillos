# Instantaneous rate: the derivative appears

The average rate of change lesson watched secant slopes settle on a single number as the interval shrank: the speed at an instant. That number deserves a name and a precise definition, because it is one of the most useful ideas in mathematics. It is the **derivative**. This lesson defines it as a limit, computes it exactly for powers of x, discovers the power rule and the special number e from experiments, lets the computer algebra library SymPy differentiate formulas symbolically, and uses derivatives to turn a position formula into velocity and acceleration. The calculus block returns to all of this with full rigour; here the aim is to see the derivative appear and start using it.

This lesson covers:

- the derivative as the limit of difference quotients, and the notation f′(x) and dy/dx;
- the derivative of x² and x³ from the definition, and the power rule;
- the derivative as a new function, and what its sign says;
- e: the base whose exponential is its own derivative;
- symbolic differentiation with SymPy;
- velocity and acceleration as first and second derivatives.

## The definition

::: math
\[ f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}, \qquad \frac{(x + h)^2 - x^2}{h} = 2x + h \;\to\; 2x \]
- the limit is the value the quotient approaches as $h$ shrinks, never using $h = 0$ itself
- other notations: $\dfrac{dy}{dx}$ and $\dfrac{d}{dx} f(x)$
In code: `quotient(f, x, h)` is `(f(x + h) - f(x)) / h`
:::


The **derivative** of f at x is the limit of the difference quotient as the step h shrinks to zero:

\[ f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h} \]

"Limit" means the value the quotient gets arbitrarily close to as h gets close to 0 (h itself is never 0, where the quotient would be 0/0). Other notations are dy/dx, recalling Δy/Δx, and d/dx f(x).

For f(x) = x² the limit can be found exactly. Expand: (x + h)² − x² = 2xh + h², so the quotient is 2x + h, which approaches 2x as h → 0. So the derivative of x² is 2x. Predict before running: at x = 3, how do the quotients approach 6, and how far off is each?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def quotient(f, x, h):
    return (f(x + h) - f(x)) / h

square = lambda x: x ** 2
for h in [1, 0.1, 0.01, 0.001, -0.001, -0.1]:
    q = quotient(square, 3, h)
    print(f"h = {h:>7}: quotient {q:.6f}, minus 2x + h = {q - (6 + h):+.1e}")
```

```output
h =       1: quotient 7.000000, minus 2x + h = +0.0e+00
h =     0.1: quotient 6.100000, minus 2x + h = +1.2e-14
h =    0.01: quotient 6.010000, minus 2x + h = -1.5e-13
h =   0.001: quotient 6.001000, minus 2x + h = -5.2e-13
h =  -0.001: quotient 5.999000, minus 2x + h = -8.0e-13
h =    -0.1: quotient 5.900000, minus 2x + h = -1.8e-15
```

The last column checks the algebra: each quotient equals 2x + h exactly, up to rounding.

The quotient is always 6 + h: from the right (h > 0) it is above 6, from the left below, and it closes in on 6 from both sides. That two-sided agreement is what the limit requires. The derivative is exact, 2x, even though every numerical quotient is slightly off.

## The power rule

::: math
\[ \frac{d}{dx}\,x^n = n\,x^{n-1}, \qquad \frac{d}{dx}\big(a f + b g\big) = a f' + b g' \]
- from $(x + h)^n = x^n + n x^{n-1} h + (\text{terms in } h^2 \text{ and higher})$
- holds for negative and fractional $n$ too
In code: `central(f, x)` is `(f(x + h) - f(x - h)) / (2 * h)`, compared with `3 * xs ** 2`
:::


The same expansion works for any whole power. (x + h)³ = x³ + 3x²h + 3xh² + h³, so the quotient is 3x² + 3xh + h², which tends to 3x². In general the binomial expansion of (x + h)ⁿ begins xⁿ + n xⁿ⁻¹ h + (terms with h² or higher), which gives the **power rule**:

\[ \frac{d}{dx} x^n = n x^{n-1} \]

It holds for negative and fractional powers too, as the calculus block proves. The derivative of a sum is the sum of the derivatives, and constants come out front, so polynomials can be differentiated term by term. Predict before running: does a numerical derivative of x³ match 3x² across a whole range?

```python type
def central(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

xs = np.linspace(-2, 2, 81)
cube = lambda x: x ** 3
numeric = central(cube, xs)
print("largest gap between numeric slope and 3x²:", np.abs(numeric - 3 * xs ** 2).max())
for p in [2, 3, 5, -1, 0.5]:
    f = lambda x, p=p: x ** p
    x0 = 1.7
    print(f"x^{p}: numeric slope at 1.7 = {central(f, x0):.6f}, power rule n x^(n-1) = {p * x0 ** (p - 1):.6f}")

fig, ax = plt.subplots(figsize=(6, 3.5))
ax.plot(xs, xs ** 3, label="f(x) = x³")
ax.plot(xs, numeric, "--", label="numeric f′(x)")
ax.axhline(0, color="grey", linewidth=0.5)
ax.legend()
plt.show()
```

```output
largest gap between numeric slope and 3x²: 2.156195222369206e-10
x^2: numeric slope at 1.7 = 3.400000, power rule n x^(n-1) = 3.400000
x^3: numeric slope at 1.7 = 8.670000, power rule n x^(n-1) = 8.670000
x^5: numeric slope at 1.7 = 41.760500, power rule n x^(n-1) = 41.760500
x^-1: numeric slope at 1.7 = -0.346021, power rule n x^(n-1) = -0.346021
x^0.5: numeric slope at 1.7 = 0.383482, power rule n x^(n-1) = 0.383482
```

`central` works on a whole NumPy array at once, because the formula uses only arithmetic.

The numeric slope matches 3x² to about 10⁻¹⁰ everywhere, and the power rule agrees for a negative and a fractional power as well. The plot shows the derivative as a **function** in its own right: where x³ is steep (large |x|) its derivative is large; at x = 0, where the curve flattens momentarily, the derivative touches zero.

## Reading the derivative

::: math
\[ \frac{d}{dx}\sin x = \cos x, \qquad \frac{d}{dx}\cos x = -\sin x \qquad (x \text{ in radians}) \]
- $f' > 0$: $f$ increasing; $f' < 0$: decreasing; $f' = 0$: a stationary point
- $\sin x$ is level at $\pi/2$ and $3\pi/2$, where $\cos x = 0$
In code: `central(np.sin, xs)` against `np.cos(xs)`; sign changes of the slope locate the peaks
:::


The sign of f′ says which way f is going: positive means increasing, negative means decreasing. Where f has a peak or a valley with a smooth top, it is momentarily level, so f′ = 0 there. These **stationary points** are where maxima and minima of smooth functions hide, which makes derivatives the main tool of optimisation.

The derivative of sine shows this well. Predict before running: what familiar function is the slope of sin x?

```python type
xs = np.linspace(0, 2 * np.pi, 400)
slope = central(np.sin, xs)
print("slope of sin matches cos:", np.allclose(slope, np.cos(xs), atol=1e-8))
print("slope of cos matches -sin:", np.allclose(central(np.cos, xs), -np.sin(xs), atol=1e-8))
sign_changes = xs[1:][np.diff(np.sign(slope)) != 0]
print("sin is level near x =", np.round(sign_changes, 3), " (π/2 =", round(np.pi / 2, 3), ", 3π/2 =", round(3 * np.pi / 2, 3), ")")
```

```output
slope of sin matches cos: True
slope of cos matches -sin: True
sin is level near x = [1.575 4.724]  (π/2 = 1.571 , 3π/2 = 4.712 )
```

The derivative of sin is cos, and the derivative of cos is −sin: with x in radians, and only in radians, these come out without any conversion factor, another reason radians are the natural unit. Sine is level at π/2 (its peak) and 3π/2 (its valley), exactly where cos crosses zero; the grid locates them to within one step.

## The number e

::: math
\[ \frac{d}{dx}\,a^x = a^x \cdot \lim_{h \to 0}\frac{a^h - 1}{h} = a^x \ln a, \qquad \frac{d}{dx}\,e^x = e^x \]
- $e \approx 2.71828$ is the base whose slope at 0 is exactly 1
- bisection: keep the half of the interval where the slope crosses 1
In code: `slope_at_zero(a)`, then 50 halvings of `low, high`
:::


Exponentials aⁿ grow in proportion to their own size, so their derivatives should be proportional to the function: the quotient (aˣ⁺ʰ − aˣ)/h = aˣ (aʰ − 1)/h, so d/dx aˣ = aˣ × (the slope of aˣ at 0). That constant depends on the base a. For a = 2 it is about 0.693, for a = 3 about 1.099. Somewhere between 2 and 3 there is a base for which it is exactly 1, so the function is its **own derivative**. That base is **e** ≈ 2.71828, and eˣ, written `exp(x)`, is the exponential the rest of mathematics uses. Predict before running: how close does a search get to e?

```python type
def slope_at_zero(a, h=1e-6):
    return (a ** h - a ** -h) / (2 * h)

for a in [2, 2.5, 2.7, 2.718, 3]:
    print(f"base {a}: slope of a^x at 0 is {slope_at_zero(a):.6f}")
low, high = 2.0, 3.0
for _ in range(50):
    mid = (low + high) / 2
    if slope_at_zero(mid) < 1:
        low = mid
    else:
        high = mid
print(f"base whose slope at 0 is 1: {mid:.8f}   math.e = {math.e:.8f}")
print("and the slope at 0 for base a is ln(a):", round(math.log(2), 6), round(math.log(3), 6))
```

```output
base 2: slope of a^x at 0 is 0.693147
base 2.5: slope of a^x at 0 is 0.916291
base 2.7: slope of a^x at 0 is 0.993252
base 2.718: slope of a^x at 0 is 0.999896
base 3: slope of a^x at 0 is 1.098612
base whose slope at 0 is 1: 2.71828183   math.e = 2.71828183
and the slope at 0 for base a is ln(a): 0.693147 1.098612
```

The search is the bisection of the formulas lesson: the slope at zero increases with the base, so halving the interval keeps the base where it crosses 1.

Bisection finds 2.71828183, matching `math.e` in every printed digit. The slopes for bases 2 and 3 are their natural logarithms, ln 2 and ln 3. That is no coincidence: aˣ = e^(x ln a), and the logarithms lesson makes this precise.

## Symbolic derivatives with SymPy

::: math
\[ \frac{d}{dx}\big(x^2\sin x\big) = x^2\cos x + 2x\sin x, \qquad \frac{d}{dt}\big(20 + 70e^{-t/20}\big) = -\tfrac{7}{2}\,e^{-t/20} \]
- product rule: $(fg)' = f'g + fg'$; chain rule: $\dfrac{d}{dx} e^{u(x)} = u'(x)\,e^{u(x)}$
- SymPy applies these rules to formulas, not numbers
In code: `sp.diff(expr, var)` differentiates the formula
:::


Numerical derivatives give numbers. **Symbolic** differentiation gives formulas, by applying the rules (power rule, sums, products, the chain rule) automatically. SymPy, a computer algebra library, does this in Python: declare a symbol, build an expression, call `diff`. Predict before running: what is the derivative of a cooling curve 20 + 70e^(−0.05t)?

```python type
import sympy as sp

x, t = sp.symbols("x t")
for expr in [x ** 3 - 4 * x + 1, sp.sin(x) * x ** 2, sp.exp(-x ** 2), 20 + 70 * sp.exp(-sp.Rational(1, 20) * t)]:
    var = t if expr.has(t) else x
    print(f"d/d{var} [{expr}] = {sp.diff(expr, var)}")

f_expr = sp.sin(x) * x ** 2
f_prime = sp.lambdify(x, sp.diff(f_expr, x))
f_num = sp.lambdify(x, f_expr)
print("symbolic and numeric slopes at x = 1.3:", f_prime(1.3), central(f_num, 1.3))
```

```output
d/dx [x**3 - 4*x + 1] = 3*x**2 - 4
d/dx [x**2*sin(x)] = x**2*cos(x) + 2*x*sin(x)
d/dx [exp(-x**2)] = -2*x*exp(-x**2)
d/dt [20 + 70*exp(-t/20)] = -7*exp(-t/20)/2
symbolic and numeric slopes at x = 1.3: 2.9573243024602545 2.957324302377273
```

`sp.Rational(1, 20)` keeps 0.05 as the exact fraction 1/20. `sp.lambdify` turns a SymPy formula into an ordinary Python function for fast numerical evaluation.

SymPy applies the product rule to x² sin x and the chain rule to e^(−x²), giving x² cos x + 2x sin x and −2x e^(−x²). The cooling curve's derivative is −(7/2)e^(−t/20): the temperature always falls, fastest at the start, matching the plot in the plotting lesson. Symbolic and numerical slopes agree to about ten digits. Use symbolic derivatives when a formula exists, and numerical ones for data or for code too complicated to differentiate by hand.

## Velocity and acceleration

::: math
\[ v = \frac{dx}{dt}, \qquad a = \frac{dv}{dt} = \frac{d^2 x}{dt^2}, \qquad x(t) = r\cos\omega t + \sqrt{l^2 - r^2\sin^2\omega t} \]
- $a$ is the second derivative of position
- $\omega$: the crank's angular speed in rad/s
In code: `v_t = sp.diff(x_t, time)`, then `a_t = sp.diff(v_t, time)`
:::


For a position x(t), the derivative is the velocity, v = dx/dt, and the derivative of velocity is the acceleration, a = dv/dt = d²x/dt², the **second derivative**. The crank–slider piston from the sine and cosine lesson has a position formula, so SymPy can produce exact velocity and acceleration formulas. Predict before running: at what crank angle is the piston's acceleration largest in size?

```python type
r, l, w = 0.040, 0.120, 3000 * 2 * math.pi / 60
time = sp.symbols("t")
theta = w * time
x_t = r * sp.cos(theta) + sp.sqrt(l ** 2 - (r * sp.sin(theta)) ** 2)
v_t = sp.diff(x_t, time)
a_t = sp.diff(v_t, time)
v_f, a_f = sp.lambdify(time, v_t), sp.lambdify(time, a_t)
ts = np.linspace(0, 2 * math.pi / w, 3601)
v_vals, a_vals = v_f(ts), a_f(ts)
i_v, i_a = np.argmax(np.abs(v_vals[:1801])), np.argmax(np.abs(a_vals))
print(f"max speed {abs(v_vals[i_v]):.3f} m/s at crank {np.degrees(w * ts[i_v]):.1f}°")
print(f"max |acceleration| {abs(a_vals[i_a]):.0f} m/s² at crank {np.degrees(w * ts[i_a]):.1f}° (that is {abs(a_vals[i_a]) / 9.81:.0f} g)")
```

```output
max speed 13.253 m/s at crank 73.2°
max |acceleration| 5264 m/s² at crank 0.0° (that is 537 g)
```

The time grid covers one revolution in 3,600 steps (0.1° each); the speed search uses the first half turn, as in the earlier challenge.

The symbolic derivative reproduces the earlier numerical result, a top speed of 13.253 m/s at 73.2°, and adds the acceleration: its largest size is at the top of the stroke (0°), about 5,300 m/s², over 500 times gravity. That is why pistons and connecting rods must be light and strong: at 3,000 rpm each gram of piston pulls about 5 N at the top of every stroke.

::: challenge Differentiating polynomials [easy]
Represent a polynomial a₀ + a₁x + a₂x² + ... by its coefficient list `[a0, a1, a2, ...]`. Write `poly_eval(coeffs, x)` returning the value at x (x may be a number or a NumPy array), and `poly_derivative(coeffs)` returning the coefficient list of the derivative, using the power rule term by term. The derivative of a constant (a list of length 1) is `[0]`, and an empty list is not allowed (raise `ValueError`). Return plain Python numbers (int or float, as the inputs give).

```python starter
def poly_eval(coeffs, x):
    return 0

def poly_derivative(coeffs):
    return coeffs

print(poly_derivative([1, -4, 0, 1]))
```

```python solution
def poly_eval(coeffs, x):
    total = 0
    for k, a in enumerate(coeffs):
        total = total + a * x ** k
    return total

def poly_derivative(coeffs):
    if len(coeffs) == 0:
        raise ValueError("a polynomial needs at least one coefficient")
    if len(coeffs) == 1:
        return [0]
    return [k * coeffs[k] for k in range(1, len(coeffs))]

print(poly_derivative([1, -4, 0, 1]))
```

```python test
for _n in ["poly_eval", "poly_derivative"]:
    assert _n in dir(), f"Define {_n}."
assert poly_derivative([1, -4, 0, 1]) == [-4, 0, 3], f"x³ - 4x + 1 has derivative 3x² - 4; got {poly_derivative([1, -4, 0, 1])}."
assert poly_derivative([7]) == [0] and poly_derivative([0, 1]) == [1], "Constants and x."
assert poly_derivative([0.5, 0, 0, 0, 2]) == [0, 0, 0, 8], "Keep zero coefficients in place."
try:
    poly_derivative([])
    assert False, "An empty list should raise ValueError."
except ValueError:
    pass
assert poly_eval([1, -4, 0, 1], 2) == 1 and poly_eval([3], 10) == 3, "Values."
_xs = np.linspace(-2, 2, 9)
assert np.allclose(poly_eval([1, -4, 0, 1], _xs), _xs ** 3 - 4 * _xs + 1), "Works on arrays."
_c = [2, -1, 0.5, 3, -0.25]
_num = (poly_eval(_c, _xs + 1e-6) - poly_eval(_c, _xs - 1e-6)) / 2e-6
assert np.allclose(poly_eval(poly_derivative(_c), _xs), _num, atol=1e-5), "The derivative matches the numerical slope."
"SUCCESS: The power rule, term by term: each coefficient a_k moves down one place and is multiplied by k."
```

Hint: The term aₖxᵏ has derivative k aₖ xᵏ⁻¹, so the new coefficient in position k − 1 is `k * coeffs[k]`. The constant term disappears.
:::

::: challenge Derivatives as functions [medium]
Write `derivative_of(f, h=1e-5)` that returns a **new function** computing the central-difference derivative of f at any x (a closure). Then write `second_derivative_of(f, h=1e-4)` returning a function computing (f(x + h) − 2f(x) + f(x − h)) / h², and `tangent_line(f, a, h=1e-5)` returning `(slope, intercept)` of the tangent line to f at x = a, both rounded to 6 decimal places with `0.0` added. Raise `ValueError` from the first two if h is not positive, immediately when they are called (not later, when the returned function is used).

```python starter
def derivative_of(f, h=1e-5):
    return f

def second_derivative_of(f, h=1e-4):
    return f

def tangent_line(f, a, h=1e-5):
    return (0.0, 0.0)

print(derivative_of(math.sin)(0.0))
```

```python solution
def derivative_of(f, h=1e-5):
    if h <= 0:
        raise ValueError("h must be positive")
    def df(x):
        return (f(x + h) - f(x - h)) / (2 * h)
    return df

def second_derivative_of(f, h=1e-4):
    if h <= 0:
        raise ValueError("h must be positive")
    def d2f(x):
        return (f(x + h) - 2 * f(x) + f(x - h)) / h ** 2
    return d2f

def tangent_line(f, a, h=1e-5):
    m = derivative_of(f, h)(a)
    return (round(m, 6) + 0.0, round(f(a) - m * a, 6) + 0.0)

print(derivative_of(math.sin)(0.0))
```

```python test
for _n in ["derivative_of", "second_derivative_of", "tangent_line"]:
    assert _n in dir(), f"Define {_n}."
_d = derivative_of(math.sin)
assert callable(_d), "derivative_of must return a function."
assert all(abs(_d(_x) - math.cos(_x)) < 1e-9 for _x in [0, 0.5, 2, -3]), "The derivative of sin is cos."
_dd = second_derivative_of(math.sin)
assert all(abs(_dd(_x) + math.sin(_x)) < 1e-5 for _x in [0.3, 1.5, 4]), "The second derivative of sin is -sin."
assert abs(second_derivative_of(lambda x: x ** 3)(2.0) - 12) < 1e-4, "d²/dx² x³ = 6x."
assert abs(derivative_of(derivative_of(math.exp))(1.0) - math.e) < 1e-4, "Derivatives of derivatives work too."
assert tangent_line(lambda x: x ** 2, 3) == (6.0, -9.0), f"Tangent to x² at 3 is y = 6x - 9; got {tangent_line(lambda x: x ** 2, 3)}."
assert tangent_line(math.sin, 0) == (1.0, 0.0), "Tangent to sin at 0 is y = x."
for _f in (derivative_of, second_derivative_of):
    try:
        _f(math.sin, h=0)
        assert False, f"{_f.__name__} with h = 0 should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The derivative is a function-valued operation: give it f, and it gives back f′."
```

Hint: Inside `derivative_of`, define an inner function `df(x)` that uses `f` and `h` from the enclosing call, then return `df` itself (no parentheses). The tangent at a has slope f′(a) and passes through (a, f(a)), so its intercept is f(a) − f′(a)·a.
:::

::: challenge Finding stationary points [hard]
Write `stationary_points(f, a, b, n=1000)` that finds the points in [a, b] where f′(x) = 0 and classifies each. Sample the central-difference derivative (h = 1e-6) at `n + 1` evenly spaced points from a to b; wherever two neighbouring samples have opposite signs (strictly: one positive, one negative), refine the root by **bisection** on f′ until the interval is narrower than 1e-10. Classify the point as `"max"` if f′ goes from positive to negative, and `"min"` if from negative to positive. Return a list of `(x, kind)` tuples in increasing x, with x rounded to 6 decimal places. Raise `ValueError` if a ≥ b or n < 2. (Stationary points exactly on a sample, or where f′ touches zero without changing sign, may be missed; that is accepted.) Then write `global_max(f, a, b, n=1000)` returning `(x, f(x))`, both rounded to 6 decimal places: the largest value among the stationary maxima and the two ends of the interval.

```python starter
def stationary_points(f, a, b, n=1000):
    return []

def global_max(f, a, b, n=1000):
    return (a, f(a))

print(stationary_points(lambda x: x ** 3 - 3 * x, -3, 3))
```

```python solution
def stationary_points(f, a, b, n=1000):
    if a >= b or n < 2:
        raise ValueError("need a < b and n >= 2")
    h = 1e-6
    df = lambda x: (f(x + h) - f(x - h)) / (2 * h)
    xs = np.linspace(a, b, n + 1)
    ds = [df(x) for x in xs]
    found = []
    for i in range(n):
        lo, hi, dlo, dhi = xs[i], xs[i + 1], ds[i], ds[i + 1]
        if (dlo > 0 and dhi < 0) or (dlo < 0 and dhi > 0):
            kind = "max" if dlo > 0 else "min"
            while hi - lo >= 1e-10:
                mid = (lo + hi) / 2
                dm = df(mid)
                if (dm > 0) == (dlo > 0):
                    lo, dlo = mid, dm
                else:
                    hi = mid
            found.append((round(float((lo + hi) / 2), 6), kind))
    return found

def global_max(f, a, b, n=1000):
    candidates = [a, b] + [x for x, kind in stationary_points(f, a, b, n) if kind == "max"]
    best = max(candidates, key=f)
    return (round(float(best), 6), round(float(f(best)), 6))

print(stationary_points(lambda x: x ** 3 - 3 * x, -3, 3))
```

```python test
for _n in ["stationary_points", "global_max"]:
    assert _n in dir(), f"Define {_n}."
assert stationary_points(lambda x: x ** 3 - 3 * x, -3, 3) == [(-1.0, "max"), (1.0, "min")], f"Got {stationary_points(lambda x: x ** 3 - 3 * x, -3, 3)}."
_sp = stationary_points(math.sin, 0, 10)
assert [k for _, k in _sp] == ["max", "min", "max"] and all(abs(_x - _e) < 1e-5 for (_x, _), _e in zip(_sp, [math.pi / 2, 3 * math.pi / 2, 5 * math.pi / 2])), f"Sine's peaks and valleys; got {_sp}."
assert stationary_points(lambda x: 2 * x + 1, 0, 5) == [], "A line has no stationary points."
_q = stationary_points(lambda x: (x - 0.3337) ** 2, 0, 1, n=10)
assert len(_q) == 1 and abs(_q[0][0] - 0.3337) < 1e-6 and _q[0][1] == "min", "Bisection must refine well beyond the sample spacing."
for _bad in [(1, 1, 10), (2, 1, 10), (0, 1, 1)]:
    try:
        stationary_points(lambda x: x * x, *_bad)
        assert False, f"stationary_points with {_bad} should raise ValueError."
    except ValueError:
        pass
assert global_max(lambda x: x ** 3 - 3 * x, -3, 3) == (3.0, 18.0), "The end of the interval can beat every stationary maximum."
assert global_max(lambda x: x ** 3 - 3 * x, -2.5, 1.5) == (-1.0, 2.0), "Here the stationary maximum wins."
_gm = global_max(lambda x: -(x - 2.0031234) ** 2 + 5, 0, 10)
assert abs(_gm[0] - 2.0031234) < 1e-6 and _gm[1] == 5.0, f"Got {_gm}."
"SUCCESS: Sign changes of f′ locate peaks and valleys, bisection pins them down, and comparing with the ends finds the true maximum."
```

Hint: Compute f′ at every sample. For each neighbouring pair with opposite signs, keep a bracket [lo, hi] and the sign of f′ at lo; evaluate the midpoint and replace the end whose sign matches. Positive-to-negative is a maximum. For `global_max`, compare f at the two ends and at each maximum.
:::

## What you learned

- The derivative f′(x) is the limit of (f(x + h) − f(x))/h as h → 0: the instantaneous rate of change and the slope of the tangent line.
- Expanding (x + h)ⁿ gives the power rule d/dx xⁿ = n xⁿ⁻¹; derivatives of sums are sums, and constants factor out.
- The derivative is a function. Its sign says where f rises or falls; f′ = 0 at smooth peaks and valleys.
- d/dx sin x = cos x and d/dx cos x = −sin x (in radians); eˣ is its own derivative, and the slope of aˣ at 0 is ln a.
- SymPy differentiates formulas symbolically; `lambdify` turns the results into fast functions.
- Velocity is the derivative of position and acceleration the second derivative.

The next lesson puts the derivative to work in Newton's second law.
