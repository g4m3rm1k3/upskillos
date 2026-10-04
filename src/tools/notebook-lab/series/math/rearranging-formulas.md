# Rearranging formulas, with SymPy

Handbooks give formulas in one direction: deflection from dimensions, temperature from time, power from voltage. Real questions usually run the other way: what dimension gives this deflection, how long until this temperature, what voltage gives this power? The formulas lesson rearranged a beam formula by hand and checked it with a round trip. This lesson makes rearranging systematic. It covers the rules, and the places where they go wrong: square roots with two signs, unknowns that appear twice, answers valid only in part of the domain. It shows how SymPy does the algebra, what its answers do and do not guarantee, and what to do when no rearrangement exists at all.

This lesson covers:

- undoing operations in reverse order, and the ± that square roots introduce;
- unknowns that appear in several places, and solutions valid only in a domain;
- exponential formulas solved with logarithms;
- several solutions, checking them, and turning them into fast functions;
- equations with no closed-form solution, solved numerically.

## Undoing operations, and the sign of a square root

::: math
\[ E = \tfrac{1}{2} m v^2 \;\Longrightarrow\; v^2 = \frac{2E}{m} \;\Longrightarrow\; v = \pm\sqrt{\frac{2E}{m}} \]
- rearranging applies the inverse of each operation to both sides, in the reverse of the order they were applied to the unknown
- undoing a square gives two candidates; physical meaning (or a declared assumption such as $v > 0$) chooses
In code: `sp.solve(sp.Eq(E, m * v ** 2 / 2), v)` with plain symbols, then with `positive=True`
:::

To make v the subject of E = ½mv², undo what was done to v, last operation first: it was squared, then multiplied by m/2. So divide both sides by m/2, then take the square root. Every step must be applied to the **whole** of both sides, which is what keeps the equation true.

The square root is where care is needed: v² = 2E/m has **two** solutions, ±√(2E/m). Squaring forgets the sign. If v is a speed, only the positive one makes sense; if it is a velocity along a line, both might. SymPy's `solve` returns every solution as a list. Telling SymPy that the symbols are positive removes solutions that could never be positive.

Predict before running: what does SymPy return for v, first with plain symbols and then with positive ones?

```python
import math
import numpy as np
import sympy as sp

E, m, v = sp.symbols("E m v")
print("plain symbols:   ", sp.solve(sp.Eq(E, m * v ** 2 / 2), v))
Ep, mp, vp = sp.symbols("E m v", positive=True)
speed = sp.solve(sp.Eq(Ep, mp * vp ** 2 / 2), vp)
print("positive symbols:", speed)
print("a 1,200 kg car with 150 kJ of kinetic energy:", float(speed[0].subs({Ep: 150e3, mp: 1200})), "m/s")
```

With plain symbols SymPy gives both roots, −√2·√(E/m) and +√2·√(E/m). With positive symbols only the positive root survives. A 1,200 kg car carrying 150 kJ is doing 15.8 m/s, about 57 km/h. `subs` substitutes numbers for symbols, and `float` turns the exact result into a number.

## The unknown in two places, and the domain

::: math
\[ R = \frac{R_1 R_2}{R_1 + R_2} \;\Longrightarrow\; R R_1 + R R_2 = R_1 R_2 \;\Longrightarrow\; R R_1 = R_2\,(R_1 - R) \;\Longrightarrow\; R_2 = \frac{R R_1}{R_1 - R}, \qquad \text{valid only when } R < R_1 \]
- $R$: the combined resistance; $R_1$: the resistor you have; $R_2$: the one to add in parallel
- the unknown appears twice: multiply out, gather every term containing it on one side, and factor it out
- a rearranged formula can return numbers that satisfy the algebra but are physically impossible: here, a negative resistance when $R \ge R_1$
In code: `sp.solve(sp.Eq(R, R1 * R2 / (R1 + R2)), R2)` evaluated for $R = 220$ and $R = 400$
:::

Two resistors in parallel combine as R = R₁R₂/(R₁ + R₂), "product over sum". A technician has a 330 Ω resistor and needs 220 Ω: what goes in parallel? Here R₂ appears **twice**, on top and underneath, so there is no single operation to undo. The general method: clear the fraction by multiplying out, collect every term containing the unknown on one side, and factor the unknown out. Then divide.

The answer comes with a condition. The parallel combination is always smaller than either resistor, so a target R at or above R₁ is impossible. The formula then divides by zero or returns a negative resistance. Declaring the symbols positive does not save you here: SymPy uses assumptions to simplify, not to check the numbers you substitute later. Checking the domain is your job.

Predict before running: what goes in parallel with 330 Ω to make 220 Ω, and what does the formula say for a target of 400 Ω?

```python
R, R1, R2 = sp.symbols("R R_1 R_2", positive=True)
partner = sp.solve(sp.Eq(R, R1 * R2 / (R1 + R2)), R2)[0]
print("R2 =", partner)
print("for 220 Ω from 330 Ω:", partner.subs({R: 220, R1: 330}), "Ω")
print("for 400 Ω from 330 Ω:", partner.subs({R: 400, R1: 330}), "Ω  <- negative: impossible, since R must be less than R1")
check = sp.simplify(R1 * partner / (R1 + partner) - R)
print("substituting back into the original equation leaves:", check)
```

SymPy writes the answer as −R R₁/(R − R₁), the same as R R₁/(R₁ − R). 220 Ω needs 660 Ω in parallel. Asking for 400 Ω returns −13200/7 Ω, a resistance that does not exist: the algebra is fine, the request is not. Substituting the general answer back into the original equation and simplifying leaves 0, the symbolic round trip. It proves the rearrangement correct for **all** valid values at once.

## Exponentials and logarithms

::: math
\[ V = V_s\big(1 - e^{-t/RC}\big) \;\Longrightarrow\; e^{-t/RC} = 1 - \frac{V}{V_s} \;\Longrightarrow\; t = RC\,\ln\frac{V_s}{V_s - V} \]
- $V$: capacitor voltage; $V_s$: supply voltage; $R$ and $C$: resistance and capacitance; $RC$: the time constant
- isolate the exponential, then take logarithms; the logarithm needs a positive argument, so $0 \le V < V_s$
- a voltage the capacitor never reaches (at or above $V_s$) has no solution
In code: `sp.solve(sp.Eq(V, Vs * (1 - sp.exp(-t / (Rr * Cc)))), t)`, then a numeric value for a timer
:::

The unknown in an exponent comes down with a logarithm, once the exponential is alone on one side. A capacitor charging through a resistor is the standard example, and the basis of every RC timer and delay circuit: the voltage rises towards the supply along an exponential, V = V_s(1 − e^(−t/RC)). The circuit triggers when V crosses a threshold, so the delay is the time to reach it. The logarithm's argument V_s/(V_s − V) must be positive and finite, so the threshold must be below the supply. A threshold at or above V_s is never reached, which is the physics too.

Predict before running: a 100 kΩ resistor charges 47 µF from 12 V, and a comparator trips at 8 V. How long is the delay?

```python
V, Vs, Rr, Cc, t = sp.symbols("V V_s R C t", positive=True)
delay = sp.solve(sp.Eq(V, Vs * (1 - sp.exp(-t / (Rr * Cc)))), t)[0]
print("t =", sp.simplify(delay))
seconds = float(delay.subs({V: 8, Vs: 12, Rr: 100e3, Cc: 47e-6}))
print(f"time constant {100e3 * 47e-6:.1f} s; trips at 8 V after {seconds:.3f} s")
print("forward check:", round(12 * (1 - math.exp(-seconds / 4.7)), 9), "V")
print("12 V (the supply itself):", delay.subs({V: 12, Vs: 12, Rr: 100e3, Cc: 47e-6}))
```

SymPy produces a logarithm equivalent to RC ln(V_s/(V_s − V)). With a time constant of 4.7 s, the comparator trips after 5.163 s, and putting that time back into the charging law returns 8 V. Asking for the supply voltage itself gives `zoo`, SymPy's symbol for complex infinity, because the logarithm's argument divides by zero: the capacitor only approaches 12 V and never reaches it. Logarithms are the inverse of exponentials, so every "how long until" question about exponential growth, decay or charging rearranges this way.

## Several solutions, checked and compiled

::: math
\[ Y = X u - \frac{g X^2}{2V^2}\,(1 + u^2), \quad u = \tan\theta \;\Longrightarrow\; u = \frac{V^2 \pm \sqrt{V^4 - 2V^2 g Y - g^2 X^2}}{g X} \]
- the projectile lesson's aiming equation is a quadratic in $u$: two solutions (flat shot and lob), one, or none
- `sp.simplify(lhs - rhs)` after substitution checks every solution symbolically; `sp.lambdify` turns a formula into a fast Python function
In code: `sp.solve(aim, u)`, the substitution check, and `sp.lambdify((V, X, Y), ...)`
:::

The projectile lesson found the launch angles that hit a target by writing the trajectory as a quadratic in u = tan θ and using the quadratic formula. SymPy reaches the same pair of solutions from the equation itself. With symbolic solutions it is good practice to substitute each one back and simplify the difference to 0. And when a formula will be evaluated many times, `lambdify` compiles it into an ordinary numerical function. That is much faster than substituting into a symbolic expression every time.

Predict before running: launched at 25 m/s, at what angles does a projectile hit a target 40 m away and 10 m up?

```python
g, V, X, Y, u = sp.symbols("g V X Y u", real=True)
aim = sp.Eq(Y, X * u - g * X ** 2 * (1 + u ** 2) / (2 * V ** 2))
roots = sp.solve(aim, u)
for root in roots:
    print("u =", root)
print("check, residual after substitution:", [sp.simplify(aim.lhs - aim.rhs.subs(u, r)) for r in roots])
values = [r.subs({g: 9.81, V: 25, X: 40, Y: 10}) for r in roots]
print("angles (degrees):", [round(float(sp.deg(sp.atan(w))), 2) for w in values])
flat = sp.lambdify((V, X, Y), roots[0].subs(g, 9.81))
print("compiled flat-shot formula at (25, 40, 10):", flat(25, 40, 10), " at (25, 60, 0):", round(math.degrees(math.atan(flat(25, 60, 0))), 2), "°")
```

SymPy gives the two roots of the quadratic, and both check out to zero residual. At 25 m/s the target can be hit with a flat shot at 36.21° or a lob at 67.82°, the projectile lesson's answer. The compiled function evaluates the flat-shot formula like any Python function: at (25, 40, 10) it returns tan θ ≈ 0.732, and for a target 60 m away on level ground the flat shot needs 35.17°. When the discriminant under the square root is negative, there is no real solution: the target is out of reach.

## When no rearrangement exists

::: math
\[ M = E - e\sin E \qquad \text{(Kepler's equation: no closed form for } E\text{)}, \qquad E_{k+1} = E_k - \frac{E_k - e\sin E_k - M}{1 - e\cos E_k} \]
- some equations mix the unknown inside and outside a function such as $\sin$ or $\cos$; no finite combination of standard functions solves them
- they are inverted numerically: Newton's method (here with an exact derivative), bisection, or SymPy's `nsolve`
In code: `sp.solve` raises `NotImplementedError`; `sp.nsolve` and a five-step Newton loop agree
:::

Many useful equations cannot be rearranged. The unknown appears both inside and outside a trigonometric or exponential function, as in x = cos x, the belt-length equation, or **Kepler's equation** M = E − e sin E. That equation gives a planet's or satellite's position on its elliptical orbit at a given time. SymPy recognises this and raises an error rather than pretending. The answer is the root-finding of the solving-equations lesson: given numbers for M and e, find E numerically. For Kepler's equation Newton's method converges in a handful of steps from the start E = M.

Predict before running: what does SymPy do with Kepler's equation, and how many Newton steps reach full precision for M = 1, e = 0.3?

```python
Ek, Mk, ek = sp.symbols("E M e")
try:
    sp.solve(sp.Eq(Mk, Ek - ek * sp.sin(Ek)), Ek)
except NotImplementedError as err:
    print("sp.solve:", type(err).__name__, "-", str(err).splitlines()[-1])
print("sp.nsolve from E = 1:", sp.nsolve(sp.Eq(1.0, Ek - 0.3 * sp.sin(Ek)), Ek, 1.0))

M_val, e_val = 1.0, 0.3
E_est = M_val
for step in range(1, 6):
    E_est -= (E_est - e_val * math.sin(E_est) - M_val) / (1 - e_val * math.cos(E_est))
    print(f"Newton step {step}: E = {E_est:.15f}, residual {E_est - e_val * math.sin(E_est) - M_val:.1e}")
```

SymPy's `solve` gives up with "No algorithms are implemented to solve equation". `nsolve` finds E ≈ 1.2880913132. Newton's method from E = M matches `nsolve` to 9 decimals after 3 steps and to all 15 printed digits after 4, the residual dropping to 0. The general strategy, then: rearrange symbolically when you can, because a formula shows how the answer depends on every input. Invert numerically when you cannot. Check either way, by substituting back.

::: challenge Rearranged by hand [easy]
Write three functions from rearranged formulas, each returning a plain float:

- `speed_from_energy(E, m)`: the speed v ≥ 0 from E = ½mv²; raise `ValueError` if m ≤ 0 or E < 0.
- `parallel_partner(R, R1)`: the resistor R₂ that, in parallel with R₁, gives R; raise `ValueError` unless 0 < R < R₁.
- `charge_time(V, Vs, R, C)`: the time at which a capacitor charging as V(t) = Vs(1 − e^(−t/RC)) reaches V; raise `ValueError` if R ≤ 0, C ≤ 0, Vs ≤ 0, or V is not in [0, Vs).

```python starter
import math

def speed_from_energy(E, m):
    return 0.0

def parallel_partner(R, R1):
    return 0.0

def charge_time(V, Vs, R, C):
    return 0.0

print(speed_from_energy(150e3, 1200), parallel_partner(220, 330), charge_time(8, 12, 100e3, 47e-6))
```

```python solution
import math

def speed_from_energy(E, m):
    if m <= 0 or E < 0:
        raise ValueError("need m > 0 and E >= 0")
    return float(math.sqrt(2 * E / m))

def parallel_partner(R, R1):
    if not 0 < R < R1:
        raise ValueError("need 0 < R < R1")
    return float(R * R1 / (R1 - R))

def charge_time(V, Vs, R, C):
    if R <= 0 or C <= 0 or Vs <= 0:
        raise ValueError("R, C and Vs must be positive")
    if not 0 <= V < Vs:
        raise ValueError("V must be in [0, Vs)")
    return float(R * C * math.log(Vs / (Vs - V)))

print(speed_from_energy(150e3, 1200), parallel_partner(220, 330), charge_time(8, 12, 100e3, 47e-6))
```

```python test
import math
for _n in ["speed_from_energy", "parallel_partner", "charge_time"]:
    assert _n in dir(), f"Define {_n}."
_v = speed_from_energy(150e3, 1200)
assert type(_v) is float and abs(_v - 15.8114) < 1e-4 and abs(0.5 * 1200 * _v ** 2 - 150e3) < 1e-6, f"15.81 m/s, and the round trip returns 150 kJ; got {_v}."
assert speed_from_energy(0, 5) == 0.0, "No energy, no speed."
for _bad in [(-1, 5), (10, 0)]:
    try:
        speed_from_energy(*_bad)
        assert False, f"speed_from_energy{_bad} should raise ValueError."
    except ValueError:
        pass
_p = parallel_partner(220, 330)
assert type(_p) is float and abs(_p - 660) < 1e-9 and abs(330 * _p / (330 + _p) - 220) < 1e-9, "660 Ω in parallel with 330 Ω makes 220 Ω."
for _bad in [(400, 330), (330, 330), (0, 330), (-5, 330)]:
    try:
        parallel_partner(*_bad)
        assert False, f"parallel_partner{_bad} should raise ValueError."
    except ValueError:
        pass
_t = charge_time(8, 12, 100e3, 47e-6)
assert type(_t) is float and abs(_t - 4.7 * math.log(3)) < 1e-9 and abs(12 * (1 - math.exp(-_t / 4.7)) - 8) < 1e-9, f"4.7 ln 3 = 5.163 s; got {_t}."
assert charge_time(0, 5, 1e3, 1e-6) == 0.0, "Starting from 0 V takes no time."
assert abs(charge_time(5 * (1 - math.exp(-1)), 5, 1e3, 1e-3) - 1.0) < 1e-12, "After one time constant the voltage is 63.2% of the supply."
for _bad in [(12, 12, 1e3, 1e-6), (13, 12, 1e3, 1e-6), (-1, 12, 1e3, 1e-6), (5, 12, 0, 1e-6), (5, 12, 1e3, -1e-6)]:
    try:
        charge_time(*_bad)
        assert False, f"charge_time{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Each rearrangement undoes the operations in reverse order, and each one has a domain outside which no answer exists."
```

Hint: v = √(2E/m); R₂ = R R₁/(R₁ − R); t = RC ln(Vs/(Vs − V)). Check each domain before computing: the speed's square root, the parallel combination being smaller than R₁, and V lying in [0, Vs).
:::

::: challenge Rearranging with SymPy [medium]
Write `rearrange(equation, unknown)`: given a SymPy `Eq` and the symbol to solve for, return the list of solutions from `sp.solve`, each passed through `sp.simplify`. Write `verify(equation, unknown, solution)`: True (a plain bool) if substituting `solution` for the unknown makes `sp.simplify(lhs − rhs)` equal to 0. Then write `numeric_solutions(equation, unknown, values)`: substitute the dictionary `values` (symbol → number) into each solution and return the sorted list of those that are real and finite, as plain floats.

```python starter
import sympy as sp

def rearrange(equation, unknown):
    return []

def verify(equation, unknown, solution):
    return False

def numeric_solutions(equation, unknown, values):
    return []

x, a, b = sp.symbols("x a b")
print(rearrange(sp.Eq(a * x ** 2, b), x))
```

```python solution
import sympy as sp

def rearrange(equation, unknown):
    return [sp.simplify(s) for s in sp.solve(equation, unknown)]

def verify(equation, unknown, solution):
    return bool(sp.simplify((equation.lhs - equation.rhs).subs(unknown, solution)) == 0)

def numeric_solutions(equation, unknown, values):
    out = []
    for s in rearrange(equation, unknown):
        z = complex(sp.N(s.subs(values)))
        if abs(z.imag) < 1e-12 and abs(z.real) != float("inf") and z.real == z.real:
            out.append(float(z.real))
    return sorted(out)

x, a, b = sp.symbols("x a b")
print(rearrange(sp.Eq(a * x ** 2, b), x))
```

```python test
import sympy as sp
for _n in ["rearrange", "verify", "numeric_solutions"]:
    assert _n in dir(), f"Define {_n}."
_x, _a, _b = sp.symbols("x a b")
_eq = sp.Eq(_a * _x ** 2, _b)
_sols = rearrange(_eq, _x)
assert isinstance(_sols, list) and len(_sols) == 2, f"a x² = b has two solutions; got {_sols}."
assert all(verify(_eq, _x, _s) is True for _s in _sols), "Both solutions check out."
assert verify(_eq, _x, sp.sqrt(_b) / _a) is False, "A wrong solution must fail the check."
_R, _R1, _R2 = sp.symbols("R R_1 R_2", positive=True)
_par = sp.Eq(1 / _R, 1 / _R1 + 1 / _R2)
_ps = rearrange(_par, _R2)
assert len(_ps) == 1 and sp.simplify(_ps[0] - _R * _R1 / (_R1 - _R)) == 0, "Parallel partner R R1/(R1 - R)."
assert numeric_solutions(_par, _R2, {_R: 220, _R1: 330}) == [660.0], "660 Ω."
_n2 = numeric_solutions(_eq, _x, {_a: 2, _b: 18})
assert _n2 == [-3.0, 3.0] and all(type(_v) is float for _v in _n2), f"2x² = 18: [-3.0, 3.0] sorted; got {_n2}."
assert numeric_solutions(_eq, _x, {_a: 2, _b: -18}) == [], "No real solutions."
_g, _V, _X, _Y, _u = sp.symbols("g V X Y u", real=True)
_aim = sp.Eq(_Y, _X * _u - _g * _X ** 2 * (1 + _u ** 2) / (2 * _V ** 2))
_angles = numeric_solutions(_aim, _u, {_g: 9.81, _V: 25, _X: 40, _Y: 10})
assert len(_angles) == 2 and abs(_angles[0] - 0.7322329) < 1e-6, f"Two aiming solutions, flat shot u ≈ 0.7322 first; got {_angles}."
assert numeric_solutions(_aim, _u, {_g: 9.81, _V: 25, _X: 60, _Y: 10}) == [], "Out of reach: no real angle."
"SUCCESS: SymPy does the algebra, substitution proves it, and the numbers you plug in decide which solutions are real."
```

Hint: `sp.solve(eq, x)` returns a list. To verify, substitute with `.subs(unknown, solution)` into lhs − rhs and simplify. For numbers, `complex(sp.N(expr.subs(values)))` gives a value whose imaginary part shows whether it is real.
:::

::: challenge Symbolic first, numeric fallback [hard]
Write `solve_for(equation, unknown, values, guess=1.0)`: substitute the numbers in `values` (a dictionary symbol → number) into the SymPy `Eq`, then try `sp.solve` for `unknown` and keep the real solutions (imaginary part of `complex(sp.N(sol))` below 1e-12), returned as a sorted list of plain floats. If `sp.solve` raises `NotImplementedError` or finds no real solution, fall back to `sp.nsolve` on the substituted equation from `guess` and return a one-element list; if that fallback raises `ValueError`, or returns a value that is not real, raise `ValueError`. Then write `residual(equation, unknown, values, solution)`: |lhs − rhs| with the values and the solution substituted (substitute into the expression lhs − rhs, since substituting into the `Eq` itself turns it into True or False), as a plain float.

```python starter
import sympy as sp

def solve_for(equation, unknown, values, guess=1.0):
    return []

def residual(equation, unknown, values, solution):
    return 0.0

E, M, e = sp.symbols("E M e")
print(solve_for(sp.Eq(M, E - e * sp.sin(E)), E, {M: 1.0, e: 0.3}))
```

```python solution
import sympy as sp

def _real(value):
    z = complex(sp.N(value))
    return z.real if abs(z.imag) < 1e-12 else None

def solve_for(equation, unknown, values, guess=1.0):
    eq = equation.subs(values)
    found = []
    try:
        for sol in sp.solve(eq, unknown):
            r = _real(sol)
            if r is not None:
                found.append(float(r))
    except NotImplementedError:
        found = []
    if found:
        return sorted(found)
    try:
        root = sp.nsolve(eq.lhs - eq.rhs, unknown, guess)
    except (ValueError, ZeroDivisionError) as err:
        raise ValueError(f"no real solution found: {err}")
    r = _real(root)
    if r is None:
        raise ValueError("the numerical solution is not real")
    return [float(r)]

def residual(equation, unknown, values, solution):
    expr = (equation.lhs - equation.rhs).subs(values).subs(unknown, solution)
    return float(abs(sp.N(expr)))

E, M, e = sp.symbols("E M e")
print(solve_for(sp.Eq(M, E - e * sp.sin(E)), E, {M: 1.0, e: 0.3}))
```

```python test
import math
import sympy as sp
for _n in ["solve_for", "residual"]:
    assert _n in dir(), f"Define {_n}."
_E, _M, _e = sp.symbols("E M e")
_k = solve_for(sp.Eq(_M, _E - _e * sp.sin(_E)), _E, {_M: 1.0, _e: 0.3})
assert isinstance(_k, list) and len(_k) == 1 and type(_k[0]) is float and abs(_k[0] - 1.2880913132118) < 1e-9, f"Kepler needs the numeric fallback: [1.28809...]; got {_k}."
assert residual(sp.Eq(_M, _E - _e * sp.sin(_E)), _E, {_M: 1.0, _e: 0.3}, _k[0]) < 1e-12, "The fallback solution satisfies the equation."
_x, _a, _b = sp.symbols("x a b")
_q = solve_for(sp.Eq(_a * _x ** 2, _b), _x, {_a: 2, _b: 18})
assert _q == [-3.0, 3.0] and all(type(_v) is float for _v in _q), f"Symbolic first: both roots, sorted; got {_q}."
_R, _R1, _R2 = sp.symbols("R R_1 R_2", positive=True)
assert solve_for(sp.Eq(_R, _R1 * _R2 / (_R1 + _R2)), _R2, {_R: 220, _R1: 330}) == [660.0], "The parallel partner."
_c = solve_for(sp.Eq(_x, sp.cos(_x)), _x, {}, guess=0.5)
assert abs(_c[0] - 0.7390851332151607) < 1e-12, "x = cos x: no formula, so nsolve."
_cubic = solve_for(sp.Eq(_x ** 3 - 2 * _x + 2, 0), _x, {})
assert len(_cubic) == 1 and abs(_cubic[0] ** 3 - 2 * _cubic[0] + 2) < 1e-9, "Only the one real root of x³ - 2x + 2."
try:
    solve_for(sp.Eq(_x ** 2 + 1, 0), _x, {}, guess=1.0)
    assert False, "x² + 1 = 0 has no real solution: ValueError."
except ValueError:
    pass
assert residual(sp.Eq(_a * _x ** 2, _b), _x, {_a: 2, _b: 18}, 2.0) == 10.0, "|2·4 - 18| = 10."
"SUCCESS: Ask for a formula first, fall back to numbers when there is none, and check every answer by substituting it back."
```

Hint: `equation.subs(values)` puts the numbers in. Wrap `sp.solve` in `try/except NotImplementedError`. `sp.nsolve(eq.lhs - eq.rhs, unknown, guess)` finds a root numerically; `complex(sp.N(value))` tells you whether a result is real.
:::

## What you learned

- Rearranging applies inverse operations to both whole sides in reverse order; undoing a square gives ±, and the physical meaning or declared assumptions choose the sign.
- When the unknown appears in several places, multiply out, gather its terms and factor it out; rearranged formulas often hold only on part of the domain (R < R₁ for a parallel partner), and SymPy's assumptions do not check the numbers substituted later.
- Unknowns in exponents come down with logarithms, which need positive arguments: a charging capacitor never reaches its supply voltage.
- `sp.solve` returns every solution; substituting back and simplifying to 0 proves each one, and `lambdify` turns formulas into fast functions.
- Equations like Kepler's have no closed-form inverse; they are solved numerically (Newton's method, or SymPy's `nsolve` as a fallback when `solve` gives up).

The next lesson works with inequalities instead of equations: tolerances, fits and the limits within which a part is acceptable.
