# Dimensional analysis

Before computing anything with a formula, you can check it by its units. A speed added to a length is nonsense; a formula for a time whose right-hand side comes out in metres is wrong, whatever the numbers. This bookkeeping, **dimensional analysis**, does much more than catch mistakes. Knowing only which quantities a result can depend on, it can predict the form of an unknown law. It shows that a pendulum's period cannot depend on its mass. It reduces six variables in pipe flow to three dimensionless numbers, one of them the famous Reynolds number. And it tells engineers how fast to run a scale model so that it behaves like the full-size machine. The tool behind all of it is linear algebra on the exponents of the units.

This lesson covers:

- dimensions as exponent vectors, and checking a formula's consistency;
- finding a law's form from dimensions alone (Rayleigh's method), and finding the constant by experiment;
- dimensionless groups as the nullspace of a dimension matrix (Buckingham's Π theorem);
- the Reynolds number, and testing scale models.

## Dimensions as vectors

::: math
\[ [\text{force}] = \mathsf{M}\,\mathsf{L}\,\mathsf{T}^{-2} \;\leftrightarrow\; (1, 1, -2), \qquad [xy] = [x] + [y], \qquad [x^p] = p\,[x] \quad \text{(as exponent vectors)} \]
- every quantity's dimension is a product of powers of mass M, length L, time T (and temperature, current, ...)
- multiplying quantities adds their exponent vectors; a sum or an equation needs every term to have the same vector
In code: `dims` maps each quantity to an array of exponents of (M, L, T); `term_dims` adds them
:::

The quantities-and-units lesson stored dimensions as exponent dictionaries and checked formulas with them. Here the exponents become vectors, so that linear algebra can find laws as well as check them. Every physical quantity has a **dimension** built from a few base dimensions: mass M, length L, time T (and temperature Θ and electric current I when needed). Speed is L T⁻¹, acceleration L T⁻², force M L T⁻², energy M L² T⁻², pressure (force per area) M L⁻¹ T⁻². Write the exponents as a vector, (M, L, T). Multiplying quantities then **adds** their vectors, and raising to a power **scales** the vector. A valid equation must be **dimensionally homogeneous**: every term on both sides has the same vector. Units like metres or feet are just scales within a dimension, so a homogeneous formula works in any consistent unit system.

Predict before running: which of these motion and energy formulas are dimensionally consistent: v² = u² + 2as, s = ut + at², E = mv, and E = mgh + ½mv²?

```python
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp
from scipy.integrate import solve_ivp

dims = {
    "m": np.array([1, 0, 0]), "s": np.array([0, 1, 0]), "h": np.array([0, 1, 0]), "t": np.array([0, 0, 1]),
    "u": np.array([0, 1, -1]), "v": np.array([0, 1, -1]), "a": np.array([0, 1, -2]), "g": np.array([0, 1, -2]),
    "E": np.array([1, 2, -2]),
}

def term_dims(term):
    return sum(power * dims[name] for name, power in term.items())

formulas = {
    "v² = u² + 2as": [{"v": 2}, {"u": 2}, {"a": 1, "s": 1}],
    "s = ut + at²": [{"s": 1}, {"u": 1, "t": 1}, {"a": 1, "t": 2}],
    "E = mv": [{"E": 1}, {"m": 1, "v": 1}],
    "E = mgh + ½mv²": [{"E": 1}, {"m": 1, "g": 1, "h": 1}, {"m": 1, "v": 2}],
}
for name, terms in formulas.items():
    vectors = [tuple(int(e) for e in term_dims(t)) for t in terms]
    print(f"{name:<16} term dimensions (M, L, T): {vectors}  ->  {'consistent' if len(set(vectors)) == 1 else 'INCONSISTENT'}")
```

v² = u² + 2as and the energy equation pass: every term is L² T⁻², or M L² T⁻². E = mv fails: momentum, M L T⁻¹, is not energy. s = ut + at² **passes**, although the correct formula has ½at². A dimension check cannot see pure numbers like ½, 2π or 0.6; it catches wrong variables and wrong powers, not wrong constants. That limitation shows up again below, and experiments fix it.

## The pendulum's period from dimensions

::: math
\[ T = C\,m^{a} L^{b} g^{c} \;\Longrightarrow\; \begin{pmatrix} 1 & 0 & 0 \\ 0 & 1 & 1 \\ 0 & 0 & -2 \end{pmatrix} \begin{pmatrix} a \\ b \\ c \end{pmatrix} = \begin{pmatrix} 0 \\ 0 \\ 1 \end{pmatrix} \;\Longrightarrow\; T = C\sqrt{\frac{L}{g}} \]
- the columns are the exponent vectors of $m$, $L$ and $g$; the right-hand side is the dimension of time
- the dimensionless constant $C$ (and any dependence on the dimensionless swing angle $\theta_0$) must come from elsewhere: here, a simulation
In code: `np.linalg.solve(A, [0, 0, 1])`, then `pendulum_period` from `solve_ivp`, divided by $\sqrt{L/g}$
:::

What could a pendulum's period depend on? Its mass m, its length L and gravity g, and perhaps the starting angle θ₀. Suppose T = C m^a L^b g^c, with C a pure number. Matching the exponents of M, L and T on both sides gives three linear equations for a, b and c: the matrices lesson's linear system, with a dimension matrix whose columns are the variables' exponent vectors. This is **Rayleigh's method**.

The answer, a = 0, b = ½, c = −½, says the period cannot depend on the mass at all, because nothing else contains M to cancel it. Galileo found this by experiment. Dimensions also allow any function of the angle θ₀, which has no dimension, so the full law is T = √(L/g) f(θ₀). A simulation can find f.

Predict before running: for small swings, what is T/√(L/g), and how does it change for large swings?

```python
A = np.array([[1, 0, 0], [0, 1, 1], [0, 0, -2.0]])
print("exponents (a, b, c) of m, L, g:", np.linalg.solve(A, [0, 0, 1]))

def pendulum_period(L, g, theta0):
    def rhs(t, y):
        return [y[1], -g / L * math.sin(y[0])]
    def upward(t, y):
        return y[1]
    upward.direction = 1
    sol = solve_ivp(rhs, (0, 60), [theta0, 0.0], events=upward, rtol=1e-11, atol=1e-12)
    crossings = sol.t_events[0]
    return crossings[1] - crossings[0]

for L, g in [(1.0, 9.81), (0.25, 9.81), (2.0, 1.62)]:
    T = pendulum_period(L, g, math.radians(5))
    print(f"L = {L} m, g = {g}: period {T:.4f} s, T / sqrt(L/g) = {T / math.sqrt(L / g):.4f}")
for deg in [5, 30, 60, 90, 150]:
    ratio = pendulum_period(1.0, 9.81, math.radians(deg)) / math.sqrt(1 / 9.81)
    print(f"swing ±{deg:>3}°: T / sqrt(L/g) = {ratio:.4f} = 2π × {ratio / (2 * math.pi):.4f}")
```

Three very different pendulums, a metre on Earth, a quarter metre on Earth and two metres on the Moon, give the same ratio T/√(L/g) ≈ 6.286. That is 2π, slightly raised by the 5° swing, exactly as dimensional analysis says. The constant needs physics or experiment: the analysis said it would be a pure number, and the simulation measured it. The swing angle is a different matter: at ±30° the period is 1.7% longer, at ±90° 18% and at ±150° 76%. The small-angle formula 2π√(L/g) is a good approximation only for small swings, and dimensions alone could not have known that.

## Dimensionless groups: the Π theorem

::: math
\[ A\,\mathbf{k} = \mathbf{0}, \qquad \text{number of groups} = n - \operatorname{rank} A, \qquad \text{Re} = \frac{\rho V D}{\mu}, \quad \text{Eu} = \frac{\Delta p}{\rho V^2}, \quad \frac{L}{D} \]
- $A$: the dimension matrix (one row per base dimension, one column per variable); $\mathbf{k}$: the exponents of a product with no dimensions
- any exponent vector in the nullspace of $D$ gives a dimensionless group, and the law can be rewritten using these groups only (Buckingham's Π theorem)
- $\rho$: density; $\mu$: viscosity; $V$: mean speed; $D$: pipe diameter; $L$: pipe length; $\Delta p$: pressure drop
In code: `Adim.nullspace()` in SymPy, then a check that `Adim * k` vanishes for the familiar groups
:::

Rayleigh's method needs a unique solution. Often there are more variables than equations, and then the exponent equations have a whole family of solutions. Consider the pressure drop Δp along a pipe: it can depend on the fluid's density ρ and viscosity μ, the flow speed V, the diameter D and the length L. That is six variables and three base dimensions. A product ρ^k₁ μ^k₂ ... is **dimensionless** exactly when its exponent vector k satisfies Ak = 0, where A is the dimension matrix, which means k lies in the **nullspace** of the dimension matrix. **Buckingham's Π theorem** says the physical law can be written entirely in terms of n − rank A independent dimensionless groups, here 6 − 3 = 3.

Any basis of the nullspace works, so the choice is about convenience. The standard one is the **Euler number** Δp/(ρV²), the **Reynolds number** ρVD/μ and the aspect ratio L/D. The law becomes Δp/(ρV²) = F(Re, L/D): one function of two numbers, instead of a function of five variables. Experiments can map it with a fraction of the effort.

Predict before running: what basis does SymPy find, and is the Reynolds number of water at 1.5 m/s in a 50 mm pipe above or below about 2,300, below which pipe flow stays smooth (laminar)?

```python
names = ["Δp", "ρ", "μ", "V", "D", "L"]
Adim = sp.Matrix([[1, 1, 1, 0, 0, 0],
                [-1, -3, -1, 1, 1, 1],
                [-2, 0, -1, -1, 0, 0]])
print("rank", Adim.rank(), "->", len(names) - Adim.rank(), "dimensionless groups")
for k in Adim.nullspace():
    print("  SymPy basis vector:", " ".join(f"{n}^{e}" for n, e in zip(names, k) if e != 0))
familiar = {"Euler Δp/(ρV²)": [1, -1, 0, -2, 0, 0], "Reynolds ρVD/μ": [0, 1, -1, 1, 1, 0], "L/D": [0, 0, 0, 0, -1, 1]}
for label, k in familiar.items():
    print(f"  {label:<16} dimensions {list(Adim * sp.Matrix(k))}")
print("rank of the three familiar groups together:", sp.Matrix(list(familiar.values())).rank())

rho, mu, V, Dpipe = 998.0, 1.0e-3, 1.5, 0.05
print(f"water at {V} m/s in a {Dpipe * 1000:.0f} mm pipe: Re = {rho * V * Dpipe / mu:,.0f}")
```

SymPy's basis is correct but unfamiliar: it mixes Δp into every group. The three standard groups each give the zero vector, so they are dimensionless. Their exponent vectors have rank 3, so they are independent and form an equally valid basis. For water at 1.5 m/s in a 50 mm pipe, Re ≈ 75,000, far above about 4,000, where pipe flow is turbulent. The Moody diagram, engineering's pipe-friction chart, is this reduced law in practice: it plots the friction factor f = 2(D/L)·Δp/(ρV²), the Euler number scaled by D/L because Δp grows in proportion to length, against the Reynolds number, with one extra group this analysis left out, the wall roughness relative to the diameter.

## Testing a scale model

::: math
\[ \text{Re}_\text{model} = \text{Re}_\text{full} \;\Longrightarrow\; V_m = V_f\,\frac{L_f}{L_m}\,\frac{\nu_m}{\nu_f}, \qquad \nu = \frac{\mu}{\rho} \]
- two flows with the same dimensionless groups behave the same: this is **similarity**
- $\nu$: kinematic viscosity, about $1.5 \times 10^{-5}$ m²/s for air and $1.0 \times 10^{-6}$ m²/s for water
In code: `V_full * L_full / L_model * nu_model / nu_full` for air and for water
:::

If the law depends only on the dimensionless groups, then a model with the same groups as the full-size object behaves the same way, scaled. This **similarity** is how aircraft, ships, bridges and cars are tested before they are built. For aerodynamic drag the key group is the Reynolds number, written with the kinematic viscosity ν = μ/ρ as Re = VL/ν. A model five times smaller has five times less length, so to keep Re the same its speed must go up five times, or the fluid must change.

Predict before running: a 4.5 m car at 30 m/s is tested as a 1/5-scale model. How fast must the model go in air, and in a water tunnel?

```python
nu_air, nu_water = 1.5e-5, 1.0e-6
V_full, L_full, scale = 30.0, 4.5, 5
L_model = L_full / scale
print(f"full size: Re = {V_full * L_full / nu_air:.2e}")
for fluid, nu_m in [("air", nu_air), ("water", nu_water)]:
    V_m = V_full * L_full / L_model * nu_m / nu_air
    print(f"1/{scale} model in {fluid:<5}: {V_m:6.1f} m/s, Re = {V_m * L_model / nu_m:.2e}")
```

In air the model would need 150 m/s, about half the speed of sound. At that speed air compresses, which adds a new dimensionless group, the Mach number, and the similarity breaks. In water, with a kinematic viscosity 15 times smaller, the same Reynolds number needs only 10 m/s. This is why many models are tested in water tunnels or towing tanks. When not every group can be matched at once (Reynolds and Froude for ships, for example), engineers match the most important one and correct for the rest. Every one of these choices starts from the exponent arithmetic above.

::: challenge Finding the faulty term [easy]
Represent a dimension as a dictionary of base-dimension exponents (missing keys mean 0), and a term of a formula as a dictionary mapping variable names to powers, for example ½mv² is `{"m": 1, "v": 2}`. Write `to_vector(dim, bases=("M", "L", "T"))`: the NumPy array of exponents in the order of `bases`; raise `ValueError` if the dimension uses a base not in `bases`. Write `term_vector(term, dims, bases=("M", "L", "T"))`: the exponent vector of a term, Σ power × to_vector(dims[name]), where `dims` maps variable names to dimensions. Then write `odd_term(terms, dims, bases=("M", "L", "T"))`: the index of the first term whose vector differs from the first term's, or `None` if every term matches.

```python starter
import numpy as np

def to_vector(dim, bases=("M", "L", "T")):
    return np.zeros(len(bases))

def term_vector(term, dims, bases=("M", "L", "T")):
    return np.zeros(len(bases))

def odd_term(terms, dims, bases=("M", "L", "T")):
    return None

dims = {"E": {"M": 1, "L": 2, "T": -2}, "m": {"M": 1}, "v": {"L": 1, "T": -1}}
print(odd_term([{"E": 1}, {"m": 1, "v": 1}], dims))
```

```python solution
import numpy as np

def to_vector(dim, bases=("M", "L", "T")):
    extra = set(dim) - set(bases)
    if extra:
        raise ValueError(f"unknown base dimensions {extra}")
    return np.array([dim.get(b, 0) for b in bases], dtype=float)

def term_vector(term, dims, bases=("M", "L", "T")):
    total = np.zeros(len(bases))
    for name, power in term.items():
        total = total + power * to_vector(dims[name], bases)
    return total

def odd_term(terms, dims, bases=("M", "L", "T")):
    first = term_vector(terms[0], dims, bases)
    for i, t in enumerate(terms[1:], start=1):
        if not np.allclose(term_vector(t, dims, bases), first):
            return i
    return None

dims = {"E": {"M": 1, "L": 2, "T": -2}, "m": {"M": 1}, "v": {"L": 1, "T": -1}}
print(odd_term([{"E": 1}, {"m": 1, "v": 1}], dims))
```

```python test
import numpy as np
for _n in ["to_vector", "term_vector", "odd_term"]:
    assert _n in dir(), f"Define {_n}."
_d = {"E": {"M": 1, "L": 2, "T": -2}, "m": {"M": 1}, "v": {"L": 1, "T": -1}, "u": {"L": 1, "T": -1},
      "a": {"L": 1, "T": -2}, "s": {"L": 1}, "t": {"T": 1}, "g": {"L": 1, "T": -2}, "h": {"L": 1}}
assert np.allclose(to_vector({"M": 1, "L": 1, "T": -2}), [1, 1, -2]) and np.allclose(to_vector({}), [0, 0, 0]), "Force (1, 1, -2); dimensionless (0, 0, 0)."
assert np.allclose(to_vector({"T": -1, "M": 2}, bases=("M", "T")), [2, -1]), "Follow the order of bases."
try:
    to_vector({"K": 1})
    assert False, "A base not in bases should raise ValueError."
except ValueError:
    pass
assert np.allclose(term_vector({"m": 1, "v": 2}, _d), [1, 2, -2]), "½mv² has the dimension of energy (the ½ is dimensionless)."
assert np.allclose(term_vector({"v": 1, "t": 1}, _d), [0, 1, 0]) and np.allclose(term_vector({"g": 0.5, "h": 0.5}, _d), [0, 1, -1]), "Products and fractional powers."
assert odd_term([{"v": 2}, {"u": 2}, {"a": 1, "s": 1}], _d) is None, "v² = u² + 2as is consistent."
assert odd_term([{"E": 1}, {"m": 1, "v": 1}], _d) == 1, "E = mv: term 1 is momentum."
assert odd_term([{"s": 1}, {"u": 1, "t": 1}, {"a": 1, "t": 1}], _d) == 2, "s = ut + at: the at term is a speed."
assert odd_term([{"E": 1}, {"m": 1, "g": 1, "h": 1}, {"m": 1, "v": 2}, {"m": 1, "v": 1}], _d) == 3, "The first faulty term is reported."
"SUCCESS: With dimensions as vectors, a term's dimension is a weighted sum, and a formula's faulty term is the one whose vector differs."
```

Hint: Build the vector with `[dim.get(b, 0) for b in bases]`. A term's vector adds power × the vector of each variable. Compare every term's vector with the first one using `np.allclose`.
:::

::: challenge Rayleigh's method [medium]
Write `rayleigh(target, variables, bases=("M", "L", "T"))`: `target` is a dimension dictionary and `variables` is a list of dimension dictionaries. Find exponents k with Π variables_j^k_j having the target's dimension, by solving the linear system whose matrix has one row per base dimension and one column per variable. Return the exponents as a list of `Fraction`s (exact: solve with `sympy` or your own elimination on `Fraction`s, not floats). Raise `ValueError` if there is no solution or the solution is not unique (the matrix's rank is less than the number of variables). Then write `pendulum_constant(theta0_deg)`: simulate a pendulum (L = 1 m, g = 9.81 m/s²) released from rest at `theta0_deg`, measure its period, and return T/√(L/g) as a plain float, accurate to at least 1e-6.

```python starter
from fractions import Fraction

def rayleigh(target, variables, bases=("M", "L", "T")):
    return [Fraction(0)] * len(variables)

def pendulum_constant(theta0_deg):
    return 6.283

print(rayleigh({"T": 1}, [{"M": 1}, {"L": 1}, {"L": 1, "T": -2}]))
```

```python solution
import math
from fractions import Fraction
import sympy as sp
from scipy.integrate import solve_ivp

def rayleigh(target, variables, bases=("M", "L", "T")):
    A = sp.Matrix([[v.get(b, 0) for v in variables] for b in bases])
    rhs = sp.Matrix([target.get(b, 0) for b in bases])
    if A.rank() < len(variables):
        raise ValueError("the exponents are not unique")
    if A.row_join(rhs).rank() != A.rank():
        raise ValueError("no combination has the target dimension")
    sol = A.gauss_jordan_solve(rhs)[0]
    return [Fraction(int(sp.fraction(x)[0]), int(sp.fraction(x)[1])) for x in sol]

def pendulum_constant(theta0_deg):
    g, L = 9.81, 1.0
    def rhs(t, y):
        return [y[1], -g / L * math.sin(y[0])]
    def upward(t, y):
        return y[1]
    upward.direction = 1
    sol = solve_ivp(rhs, (0, 20), [math.radians(theta0_deg), 0.0], events=upward, rtol=1e-11, atol=1e-12)
    crossings = sol.t_events[0]
    return float((crossings[1] - crossings[0]) / math.sqrt(L / g))

print(rayleigh({"T": 1}, [{"M": 1}, {"L": 1}, {"L": 1, "T": -2}]))
```

```python test
import math
from fractions import Fraction
for _n in ["rayleigh", "pendulum_constant"]:
    assert _n in dir(), f"Define {_n}."
_k = rayleigh({"T": 1}, [{"M": 1}, {"L": 1}, {"L": 1, "T": -2}])
assert _k == [0, Fraction(1, 2), Fraction(-1, 2)] and all(isinstance(_v, Fraction) for _v in _k), f"Pendulum: m^0 L^(1/2) g^(-1/2); got {_k}."
_s = rayleigh({"L": 1, "T": -1}, [{"M": 1, "L": -1, "T": -2}, {"M": 1, "L": -3}])
assert _s == [Fraction(1, 2), Fraction(-1, 2)], "Speed from pressure and density: sqrt(p/ρ)."
_w = rayleigh({"T": -1}, [{"M": 1}, {"M": 1, "T": -2}], bases=("M", "T"))
assert _w == [Fraction(-1, 2), Fraction(1, 2)], "Spring–mass frequency: sqrt(k/m), with only M and T as bases."
for _bad in [({"T": 1}, [{"M": 1}, {"L": 1}]), ({"T": 1}, [{"L": 1}, {"L": 2}, {"L": 1, "T": -2}, {"M": 1}])]:
    try:
        rayleigh(*_bad)
        assert False, f"rayleigh{_bad} should raise ValueError (no solution, or not unique)."
    except ValueError:
        pass
_c5 = pendulum_constant(5)
assert type(_c5) is float and abs(_c5 - 6.286177) < 1e-5, f"At ±5° the constant is about 6.2862; got {_c5}."
assert abs(pendulum_constant(1) - 2 * math.pi) < 2e-4 and abs(pendulum_constant(90) / (2 * math.pi) - 1.18034) < 1e-4, "Small swings give 2π; ±90° is 18% longer."
"SUCCESS: Matching exponents fixes how a law depends on its variables; only the pure-number constant needs an experiment."
```

Hint: Build the dimension matrix with `[[v.get(b, 0) for v in variables] for b in bases]` and the target column the same way. In SymPy, compare the rank of the matrix with the number of variables and with the rank of the augmented matrix, then use `gauss_jordan_solve`. For the period, record upward zero crossings of the angular velocity and take the time between two of them.
:::

::: challenge Dimensionless groups and similarity [hard]
Write `pi_groups(variables, bases=("M", "L", "T"))`: given a dictionary mapping variable names to dimension dictionaries, return a basis of the dimensionless groups as a list of dictionaries mapping names to **integer** exponents (scale each nullspace vector by the least common multiple of its denominators, then divide by the gcd of its entries, so each group uses the smallest whole exponents), leaving out zero exponents. The number of groups must be (number of variables − rank). Then write `model_speed(V_full, L_full, L_model, nu_full, nu_model)`: the model speed (plain float) that matches the full-size Reynolds number VL/ν. Raise `ValueError` in `model_speed` if any input is not positive.

```python starter
def pi_groups(variables, bases=("M", "L", "T")):
    return []

def model_speed(V_full, L_full, L_model, nu_full, nu_model):
    return V_full

pipe = {"dp": {"M": 1, "L": -1, "T": -2}, "rho": {"M": 1, "L": -3}, "mu": {"M": 1, "L": -1, "T": -1},
        "V": {"L": 1, "T": -1}, "D": {"L": 1}, "Lp": {"L": 1}}
print(pi_groups(pipe), model_speed(30, 4.5, 0.9, 1.5e-5, 1.0e-6))
```

```python solution
import math
import sympy as sp

def pi_groups(variables, bases=("M", "L", "T")):
    names = list(variables)
    A = sp.Matrix([[variables[n].get(b, 0) for n in names] for b in bases])
    groups = []
    for vec in A.nullspace():
        den = 1
        for x in vec:
            den = math.lcm(den, int(sp.fraction(sp.nsimplify(x))[1]))
        ints = [int(x * den) for x in vec]
        g = 0
        for v in ints:
            g = math.gcd(g, abs(v))
        groups.append({n: v // g for n, v in zip(names, ints) if v != 0})
    return groups

def model_speed(V_full, L_full, L_model, nu_full, nu_model):
    if min(V_full, L_full, L_model, nu_full, nu_model) <= 0:
        raise ValueError("all inputs must be positive")
    return float(V_full * L_full / L_model * nu_model / nu_full)

pipe = {"dp": {"M": 1, "L": -1, "T": -2}, "rho": {"M": 1, "L": -3}, "mu": {"M": 1, "L": -1, "T": -1},
        "V": {"L": 1, "T": -1}, "D": {"L": 1}, "Lp": {"L": 1}}
print(pi_groups(pipe), model_speed(30, 4.5, 0.9, 1.5e-5, 1.0e-6))
```

```python test
import math
import sympy as sp
for _n in ["pi_groups", "model_speed"]:
    assert _n in dir(), f"Define {_n}."
_pipe = {"dp": {"M": 1, "L": -1, "T": -2}, "rho": {"M": 1, "L": -3}, "mu": {"M": 1, "L": -1, "T": -1},
         "V": {"L": 1, "T": -1}, "D": {"L": 1}, "Lp": {"L": 1}}
_g = pi_groups(_pipe)
assert isinstance(_g, list) and len(_g) == 3, f"Six variables, rank 3: three groups; got {len(_g)}."
def _dimless(_grp, _vars, _bases=("M", "L", "T")):
    return all(sum(_e * _vars[_k].get(_b, 0) for _k, _e in _grp.items()) == 0 for _b in _bases)
for _grp in _g:
    assert all(type(_e) is int and _e != 0 for _e in _grp.values()), f"Non-zero integer exponents only; got {_grp}."
    assert _dimless(_grp, _pipe), f"Every group must be dimensionless; {_grp} is not."
    _vals = list(_grp.values())
    _gc = 0
    for _v in _vals:
        _gc = math.gcd(_gc, abs(_v))
    assert _gc == 1, f"Use the smallest whole exponents (gcd 1); got {_grp}."
_M = sp.Matrix([[_grp.get(_k, 0) for _k in _pipe] for _grp in _g])
assert _M.rank() == 3, "The groups must be independent."
_pend = {"T": {"T": 1}, "m": {"M": 1}, "L": {"L": 1}, "g": {"L": 1, "T": -2}}
_gp = pi_groups(_pend)
assert len(_gp) == 1 and _dimless(_gp[0], _pend) and set(_gp[0]) == {"T", "L", "g"}, f"Pendulum: one group, T²g/L, without m; got {_gp}."
assert sorted(abs(_e) for _e in _gp[0].values()) == [1, 1, 2], "T² g / L in smallest whole exponents."
assert pi_groups({"L1": {"L": 1}, "m": {"M": 1}, "t": {"T": 1}}) == [], "Independent base quantities: no groups."
_v = model_speed(30, 4.5, 0.9, 1.5e-5, 1.0e-6)
assert type(_v) is float and abs(_v - 10.0) < 1e-9 and abs(model_speed(30, 4.5, 0.9, 1.5e-5, 1.5e-5) - 150.0) < 1e-9, "Water tunnel 10 m/s; air 150 m/s."
try:
    model_speed(30, 4.5, 0, 1.5e-5, 1e-6)
    assert False, "A zero model length should raise ValueError."
except ValueError:
    pass
"SUCCESS: The nullspace of the dimension matrix holds every dimensionless group, and matching them is what makes a scale model honest."
```

Hint: Build the dimension matrix with one row per base and one column per variable (in the dictionary's order) and take `sympy.Matrix(...).nullspace()`. Each basis vector has rational entries: multiply by the lcm of their denominators, divide by the gcd of the results, and drop the zeros.
:::

## What you learned

- Dimensions are exponent vectors over base dimensions; multiplying quantities adds them, and every term of a valid equation has the same vector. Dimension checks catch wrong variables and powers, not wrong pure-number constants.
- Rayleigh's method matches exponents in a linear system to find a law's form: a pendulum's period is √(L/g) times a function of its swing, independent of mass. The constant, 2π for small swings, comes from experiment or simulation.
- Dimensionless groups are the nullspace of the dimension matrix; a law with n variables and rank r depends only on n − r groups (Buckingham's Π theorem).
- Pipe flow reduces to the Euler number as a function of the Reynolds number and L/D; Re ≈ 75,000 for water at 1.5 m/s in a 50 mm pipe means turbulent flow.
- Scale models behave like the real thing when their dimensionless groups match; matching Reynolds numbers is why models are often tested in water.

The next lesson looks inside the numbers themselves: how a computer stores them, and why 0.1 + 0.2 is not 0.3.
