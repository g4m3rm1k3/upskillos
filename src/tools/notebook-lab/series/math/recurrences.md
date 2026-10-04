# Recurrences and iteration

A loan's balance next month is this month's balance plus interest minus the payment. A smoothed sensor reading is mostly the previous smoothed value, nudged towards the new raw reading. Next year's population depends on this year's. Each of these defines a sequence by a **rule**: the next term from the previous ones. That is a **recurrence**. Recurrences are how computers model anything that evolves in steps, and iterating one is the simplest simulation there is. This lesson solves the linear ones in closed form (loan payments, filters, Fibonacci), finds the fixed points that iterations settle to and asks when they are stable, and meets the logistic map, a one-line recurrence whose behaviour goes from settling down to cycling to chaos.

This lesson covers:

- first-order linear recurrences: a loan's balance and its payment formula;
- fixed points, stability and cobweb diagrams;
- the exponential moving average, a recurrence used as a filter;
- the logistic map: cycles and chaos from a simple rule;
- second-order linear recurrences and their characteristic roots.

## A loan as a recurrence

::: math
\[ B_{n+1} = (1 + i)\,B_n - P, \qquad B_n = (1 + i)^n B_0 - P\,\frac{(1 + i)^n - 1}{i}, \qquad P = \frac{i\,B_0}{1 - (1 + i)^{-N}} \]
- $B_n$: balance after $n$ payments; $i$: interest rate per period (annual rate / 12 for monthly); $P$: the payment; $N$: number of payments
- the closed form comes from unrolling the recurrence: a geometric growth of $B_0$ minus a geometric sum of payments
- choosing $P$ so that $B_N = 0$ gives the standard annuity payment formula
In code: the payment for a machine loan; the balance by iterating the recurrence against the closed form; an amortisation summary
:::

A first-order **recurrence** gives each term from the one before. A loan is the standard example. Each month the balance grows by the interest rate i and shrinks by the payment P. Unrolling the rule, B₁ = (1 + i)B₀ − P, B₂ = (1 + i)²B₀ − P(1 + i) − P, and so on, gives a closed form: the starting balance grown geometrically, minus the geometric sum of the payments (the sequences lesson). Setting the balance after N payments to zero and solving for P gives the payment that clears the loan exactly. Every loan calculator uses it.

Predict before running: a 150,000 machine is financed over 5 years at 6% a year, paid monthly. What is the monthly payment, and how much interest is paid in total?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

B0, annual, years = 150_000.0, 0.06, 5
i, N = annual / 12, years * 12
P = i * B0 / (1 - (1 + i) ** -N)
print(f"monthly payment {P:,.2f}; total paid {P * N:,.2f}; interest {P * N - B0:,.2f}")
balance = [B0]
for _ in range(N):
    balance.append((1 + i) * balance[-1] - P)
closed = [(1 + i) ** n * B0 - P * ((1 + i) ** n - 1) / i for n in range(N + 1)]
print(f"balance after 12 payments: iterated {balance[12]:,.2f}, closed form {closed[12]:,.2f}; after 60: {balance[-1]:.6f}")
first_interest, last_interest = i * balance[0], i * balance[N - 1]
print(f"interest share of the first payment {first_interest / P:.1%}, of the last {last_interest / P:.1%}")
```

The payment is 2,899.92 a month: 173,995 in total, of which 23,995 is interest. Iterating the recurrence and using the closed form agree, and after 60 payments the balance is zero to rounding. Early payments carry the most interest (26% of the first one) and late ones are almost all principal (0.5% interest in the last). That is why the balance falls slowly at first.

## Fixed points and stability

::: math
\[ x_{n+1} = f(x_n), \qquad x^* = f(x^*), \qquad |x_{n+1} - x^*| \approx |f'(x^*)|\,|x_n - x^*| \]
- a **fixed point** $x^*$ is a value the iteration leaves unchanged
- near $x^*$ each step multiplies the error by about $f'(x^*)$: the fixed point is stable (attracting) if $|f'(x^*)| < 1$ and unstable if $|f'(x^*)| > 1$
- for $x_{n+1} = a x_n + b$: $x^* = b/(1 - a)$, stable when $|a| < 1$
In code: Heron's iteration $x \mapsto \tfrac{1}{2}(x + 2/x)$ for $\sqrt{2}$; $x \mapsto \cos x$; a cobweb diagram
:::

Iterating x ↦ f(x) either wanders or settles. Where it settles is a **fixed point**, x* = f(x*). Whether it settles there depends on the slope. Near x*, f behaves like its tangent line, so the error is multiplied by about f′(x*) each step. If that factor has size below 1, the errors shrink and the fixed point attracts; above 1, it repels. If f′(x*) = 0, convergence is faster than geometric. That is why Newton's method, whose iteration has zero slope at a simple root, doubles its digits each step.

The ancient **Heron's method** for square roots, x ↦ ½(x + a/x), is Newton's method for x² = a. A **cobweb diagram** draws an iteration on a graph: go up to the curve, across to the line y = x, up to the curve again. The path spirals or staircases into an attracting fixed point.

Predict before running: how many steps does Heron's iteration need for √2 from x = 1, and how does the error behave for x ↦ cos x?

```python
x = 1.0
for step in range(1, 6):
    x = 0.5 * (x + 2 / x)
    print(f"Heron step {step}: {x:.15f}, error {abs(x - math.sqrt(2)):.1e}")
y, errs = 1.0, []
fixed = 0.7390851332151607
for _ in range(30):
    y = math.cos(y)
    errs.append(abs(y - fixed))
print(f"cos iteration: error ratio settles at {errs[-1] / errs[-2]:.4f}; |f'(x*)| = |sin x*| = {math.sin(fixed):.4f}")

grid = np.linspace(0, 1.6, 200)
fig, ax = plt.subplots(figsize=(4.5, 4.5))
ax.plot(grid, np.cos(grid), label="y = cos x")
ax.plot(grid, grid, "k:", label="y = x")
px, py = [0.1], [0.0]
cur = 0.1
for _ in range(12):
    nxt = math.cos(cur)
    px += [cur, nxt]
    py += [nxt, nxt]
    cur = nxt
ax.plot(px, py, "r-", lw=0.8, label="cobweb from 0.1")
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

Heron's method is within 2 × 10⁻¹² of √2 after four steps and exact to the last digit after five, the error roughly squaring each time, because the iteration's slope at √2 is zero. The cosine iteration converges to 0.739085 more slowly: its error ratio settles at 0.6736, exactly |f′(x*)| = sin(0.739). The cobweb shows the path spiralling inwards: the slope is negative, so the iterates alternate sides of the fixed point while closing in.

## The exponential moving average

::: math
\[ y_n = \alpha\,x_n + (1 - \alpha)\,y_{n-1} = \alpha \sum_{k=0}^{n} (1 - \alpha)^k x_{n-k} + (1 - \alpha)^{n+1} y_{-1} \]
- a first-order linear recurrence used as a **filter**: each output is a weighted average of the new reading and the previous output
- $\alpha$: smoothing factor, $0 < \alpha \le 1$; small $\alpha$ smooths more but responds more slowly
- after a step change the output closes the gap by the factor $(1 - \alpha)$ each sample, reaching 95% after $\lceil \ln 0.05 / \ln(1 - \alpha) \rceil$ samples
In code: `ema(values, alpha)` on a noisy temperature with a step; noise reduction against response time for two $\alpha$
:::

The **exponential moving average** (EMA) is the simplest digital filter. Each smoothed value is a blend of the newest raw reading and the previous smoothed value. Unrolling the recurrence shows that the output is a weighted sum of all past readings, with weights falling geometrically into the past, which is where "exponential" comes from. It needs one stored number and two multiplications per sample, so it runs in every thermostat, battery gauge and dashboard. The smoothing factor α trades noise against delay. A small α averages over many readings and is very smooth, but a real change takes many samples to show through. After a step, the gap closes by the factor (1 − α) per sample: the geometric sequence of the sequences lesson.

Predict before running: a temperature reading with noise of σ = 0.5 °C jumps from 20 to 25 °C. With α = 0.1 and α = 0.02, how much noise is left, and how many samples until the output reaches 95% of the step?

```python
def ema(values, alpha):
    out, y = [], values[0]
    for v in values:
        y = alpha * v + (1 - alpha) * y
        out.append(y)
    return np.array(out)

rng = np.random.default_rng(72)
true = np.where(np.arange(600) < 200, 20.0, 25.0)
raw = true + rng.normal(0, 0.5, true.size)
for alpha in [0.1, 0.02]:
    smooth = ema(raw, alpha)
    noise_left = smooth[100:200].std()
    reach = int(np.argmax(smooth[200:] >= 20 + 0.95 * 5))
    print(f"α = {alpha}: noise {noise_left:.3f} °C (theory {0.5 * math.sqrt(alpha / (2 - alpha)):.3f}); 95% of the step after {reach} samples "
          f"(formula {math.ceil(math.log(0.05) / math.log(1 - alpha))})")
```

With α = 0.1 the noise drops from 0.5 to about 0.14 °C (the theory, 0.5√(α/(2 − α)) = 0.115, is for a long record; 100 correlated samples give only a rough estimate), and the output reaches 95% of the step after 27 samples, the noise helping it across slightly before the formula's 29. With α = 0.02 the noise falls to about 0.06 °C (theory 0.05), but the response takes 145 samples (formula 149). Roughly twice as smooth costs five times slower. Choosing α is choosing that trade-off, the same one every sensor filter faces.

## The logistic map: from order to chaos

::: math
\[ x_{n+1} = r\,x_n\,(1 - x_n), \qquad x^* = 1 - \frac{1}{r}, \qquad f'(x^*) = 2 - r \]
- $x_n$: a population as a fraction of its maximum; $r$: the growth rate; crowding slows growth as $x$ approaches 1
- the non-zero fixed point is stable for $1 < r < 3$; beyond 3 the iteration settles into a 2-cycle, then 4, 8, ... (period doubling), and is chaotic for most $r$ beyond about 3.57
- in the chaotic range, two starting values differing by $10^{-10}$ end up completely different after a few dozen steps
In code: the long-run values for four growth rates; two nearly identical starts at $r = 3.9$; a bifurcation diagram
:::

Replace the loan's linear rule with a slightly non-linear one and something remarkable happens. The **logistic map** models a population that grows by a factor r when small but is held back as it approaches a maximum. Its non-zero fixed point 1 − 1/r has slope 2 − r. So it attracts for r between 1 and 3 and repels beyond 3, where the population starts alternating between two values, a 2-cycle. Raising r further doubles the period again and again, and beyond about 3.57 the iteration becomes **chaotic**. It never settles or repeats, and tiny differences in the starting value grow exponentially. A one-line deterministic rule is unpredictable in practice. This is why long-range weather forecasts are impossible even with perfect equations.

Predict before running: after a long transient, how many distinct values does the iteration visit for r = 2.8, 3.2, 3.5 and 3.9?

```python
def long_run(r, x0=0.2, transient=1000, keep=64):
    x = x0
    for _ in range(transient):
        x = r * x * (1 - x)
    seen = []
    for _ in range(keep):
        x = r * x * (1 - x)
        seen.append(round(x, 6))
    return sorted(set(seen))

for r in [2.8, 3.2, 3.5, 3.9]:
    vals = long_run(r)
    shown = vals if len(vals) <= 4 else f"{len(vals)} different values"
    print(f"r = {r}: {shown}")
a_, b_ = 0.2, 0.2 + 1e-10
for n in range(60):
    a_, b_ = 3.9 * a_ * (1 - a_), 3.9 * b_ * (1 - b_)
    if n + 1 in (10, 30, 45, 60):
        print(f"step {n + 1:>2}: difference between the two runs {abs(a_ - b_):.1e}")

rs = np.linspace(2.5, 4.0, 1500)
xs = np.full(rs.size, 0.2)
for _ in range(500):
    xs = rs * xs * (1 - xs)
fig, ax = plt.subplots(figsize=(7, 3.5))
for _ in range(100):
    xs = rs * xs * (1 - xs)
    ax.plot(rs, xs, ",k", alpha=0.25)
ax.set_xlabel("r")
ax.set_ylabel("long-run x")
plt.show()
```

At r = 2.8 the population settles at the fixed point 0.642857 = 1 − 1/2.8. At 3.2 it alternates between two values, 0.513 and 0.799, and at 3.5 between four. At 3.9 the 64 recorded values are all different: chaos. Two runs starting 10⁻¹⁰ apart are still close after 10 steps, but by step 45 or so the difference is as large as the values themselves. The bifurcation diagram shows the whole story: a single branch splitting into 2, 4, 8, ... and dissolving into a band of chaos, with occasional windows of order inside it.

## Second-order linear recurrences

::: math
\[ a_{n+1} = c_1 a_n + c_2 a_{n-1} \;\Longrightarrow\; a_n = A\,\lambda_1^n + B\,\lambda_2^n, \qquad \lambda^2 = c_1\lambda + c_2 \]
- try $a_n = \lambda^n$: it works exactly when $\lambda$ solves the **characteristic equation**; the general solution combines both roots (with $A$, $B$ fixed by $a_0$, $a_1$)
- Fibonacci, $a_{n+1} = a_n + a_{n-1}$: $\lambda = \tfrac{1 \pm \sqrt{5}}{2}$, so $a_n$ grows like $\varphi^n$ with the golden ratio $\varphi \approx 1.618$
- complex roots of size below 1 give a decaying oscillation, the discrete version of a damped spring
In code: Fibonacci from the recurrence and from Binet's formula; the characteristic roots of a discretised damped oscillator
:::

A second-order recurrence uses two previous terms. The method mirrors the polynomials lesson. Guess aₙ = λⁿ, substitute, and divide by λⁿ⁻¹ to get a quadratic, the **characteristic equation**. Its two roots give two basic solutions, and any solution is a combination of them, fixed by the first two terms. For Fibonacci the roots are the golden ratio φ ≈ 1.618 and −0.618. The second root's powers shrink away, so Fibonacci numbers grow like φⁿ/√5, and their ratios approach φ. That is **Binet's formula**. When the roots are complex, their powers rotate as well as scale: a damped oscillation in steps. Simulating a spring–mass system with a fixed time step is exactly such a recurrence, and its characteristic roots tell whether the simulation decays, rings or blows up.

Predict before running: does Binet's formula reproduce the 30th Fibonacci number exactly? And for the discretised oscillator, are its roots inside the unit circle?

```python
fib = [0, 1]
for _ in range(29):
    fib.append(fib[-1] + fib[-2])
phi = (1 + math.sqrt(5)) / 2
binet = round((phi ** 30 - (1 - phi) ** 30) / math.sqrt(5))
print(f"F_30 = {fib[30]}, Binet gives {binet}; F_30 / F_29 = {fib[30] / fib[29]:.12f}, φ = {phi:.12f}")
print("characteristic roots of λ² = λ + 1:", np.roots([1, -1, -1]))

wn, zeta, dt = 2 * math.pi, 0.05, 0.02
c1 = 2 - 2 * zeta * wn * dt - (wn * dt) ** 2
c2 = 2 * zeta * wn * dt - 1
roots = np.roots([1, -c1, -c2])
print(f"oscillator x_(n+1) = {c1:.4f} x_n + ({c2:.4f}) x_(n-1): roots {np.round(roots, 4)}, size {abs(roots[0]):.4f}")
print(f"angle per step {abs(np.angle(roots[0])):.4f} rad -> period {2 * math.pi / abs(np.angle(roots[0])) * dt:.3f} s (true 1 s)")
```

Binet's formula gives 832,040, exactly F₃₀, and the ratio F₃₀/F₂₉ matches φ to 11 decimals. The stepped oscillator's characteristic roots are a complex pair of size 0.9937, just inside the unit circle. So the simulated motion decays, as a damped spring should. Each step rotates the pair by an angle that gives a period close to the true 1 s. If the time step were too large, the roots would move outside the unit circle and the simulation would blow up: a stability limit like the heat-flow lesson's, seen through characteristic roots.

::: challenge Loans [easy]
Write `payment(principal, annual_rate, years, per_year=12)`: the fixed payment per period that repays the loan, P = iB₀/(1 − (1 + i)^(−N)) with i = annual_rate/per_year and N = years × per_year; with annual_rate 0 the payment is principal/N. Write `balance_after(principal, annual_rate, years, n, per_year=12)`: the balance after n payments, computed by iterating B ← (1 + i)B − P (not with the closed form). Then write `total_interest(principal, annual_rate, years, per_year=12)`: the total of all payments minus the principal. All results are plain floats; raise `ValueError` if principal ≤ 0, annual_rate < 0, years ≤ 0 or per_year < 1.

```python starter
def payment(principal, annual_rate, years, per_year=12):
    return 0.0

def balance_after(principal, annual_rate, years, n, per_year=12):
    return 0.0

def total_interest(principal, annual_rate, years, per_year=12):
    return 0.0

print(payment(150000, 0.06, 5))
```

```python solution
def _check(principal, annual_rate, years, per_year):
    if principal <= 0 or annual_rate < 0 or years <= 0 or per_year < 1:
        raise ValueError("invalid loan")

def payment(principal, annual_rate, years, per_year=12):
    _check(principal, annual_rate, years, per_year)
    i, N = annual_rate / per_year, round(years * per_year)
    if i == 0:
        return float(principal / N)
    return float(i * principal / (1 - (1 + i) ** -N))

def balance_after(principal, annual_rate, years, n, per_year=12):
    P = payment(principal, annual_rate, years, per_year)
    i = annual_rate / per_year
    B = float(principal)
    for _ in range(n):
        B = (1 + i) * B - P
    return float(B)

def total_interest(principal, annual_rate, years, per_year=12):
    P = payment(principal, annual_rate, years, per_year)
    return float(P * round(years * per_year) - principal)

print(payment(150000, 0.06, 5))
```

```python test
for _n in ["payment", "balance_after", "total_interest"]:
    assert _n in dir(), f"Define {_n}."
_p = payment(150000, 0.06, 5)
assert type(_p) is float and abs(_p - 2899.92) < 0.01, f"150,000 over 5 years at 6%: 2,899.92 a month; got {_p}."
assert abs(payment(12000, 0.0, 2) - 500.0) < 1e-12, "No interest: 12,000 / 24."
assert abs(payment(10000, 0.05, 1, per_year=1) - 10500.0) < 1e-9, "One yearly payment: principal plus a year's interest."
assert abs(balance_after(150000, 0.06, 5, 60)) < 1e-6 and abs(balance_after(150000, 0.06, 5, 0) - 150000) < 1e-12, "Paid off after 60; untouched after 0."
_b12 = balance_after(150000, 0.06, 5, 12)
_i, _P = 0.005, _p
assert abs(_b12 - (1.005 ** 12 * 150000 - _P * (1.005 ** 12 - 1) / 0.005)) < 1e-6, "Iteration agrees with the closed form."
assert abs(total_interest(150000, 0.06, 5) - 23995.2) < 1.0 and total_interest(5000, 0.0, 1) == 0.0, "About 23,995 of interest; none at 0%."
for _bad in [(0, 0.05, 5), (1000, -0.01, 5), (1000, 0.05, 0)]:
    try:
        payment(*_bad)
        assert False, f"payment{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A loan is a first-order linear recurrence; choosing the payment that zeroes the final balance gives the annuity formula."
```

Hint: i = rate/per_year and N = years × per_year; handle i = 0 separately. Iterate the balance n times with B = (1 + i)B − P. Total interest is P × N − principal.
:::

::: challenge Filters and fixed points [medium]
Write `ema(values, alpha, initial=None)`: the exponential moving average yₙ = αxₙ + (1 − α)yₙ₋₁ starting from y₋₁ = `initial` (or the first value if None), returned as a NumPy array; values may be a list or array; raise `ValueError` unless 0 < alpha ≤ 1. Write `samples_to_settle(alpha, fraction=0.95)`: the smallest whole number n such that after a step the output has covered at least `fraction` of it, 1 − (1 − α)ⁿ ≥ fraction, as a plain int. Then write `iterate(f, x0, tol=1e-12, max_iter=1000)`: repeat x ← f(x) until |f(x) − x| ≤ tol and return `(x, steps)` (x as a plain float, steps the number of applications of f made); raise `RuntimeError` if `max_iter` steps do not converge.

```python starter
import math
import numpy as np

def ema(values, alpha, initial=None):
    return np.asarray(values, dtype=float)

def samples_to_settle(alpha, fraction=0.95):
    return 0

def iterate(f, x0, tol=1e-12, max_iter=1000):
    return (float(x0), 0)

print(samples_to_settle(0.1), iterate(math.cos, 1.0))
```

```python solution
import math
import numpy as np

def ema(values, alpha, initial=None):
    if not 0 < alpha <= 1:
        raise ValueError("alpha must be in (0, 1]")
    v = np.asarray(values, dtype=float)
    out = np.empty_like(v)
    y = v[0] if initial is None else float(initial)
    for k, x in enumerate(v):
        y = alpha * x + (1 - alpha) * y
        out[k] = y
    return out

def samples_to_settle(alpha, fraction=0.95):
    n = 0
    while 1 - (1 - alpha) ** n < fraction - 1e-12:
        n += 1
    return n

def iterate(f, x0, tol=1e-12, max_iter=1000):
    x = float(x0)
    for step in range(1, max_iter + 1):
        nxt = float(f(x))
        if abs(nxt - x) <= tol:
            return nxt, step
        x = nxt
    raise RuntimeError("no convergence")

print(samples_to_settle(0.1), iterate(math.cos, 1.0))
```

```python test
import math
import numpy as np
for _n in ["ema", "samples_to_settle", "iterate"]:
    assert _n in dir(), f"Define {_n}."
_e = ema([0, 0, 10, 10, 10], 0.5)
assert isinstance(_e, np.ndarray) and np.allclose(_e, [0, 0, 5, 7.5, 8.75]), f"Halving the gap each step; got {_e}."
assert np.allclose(ema(np.array([10.0, 10, 10]), 0.3, initial=0), [3.0, 5.1, 6.57]), "Starting from an initial value."
assert np.allclose(ema([1, 2, 3], 1.0), [1, 2, 3]), "alpha = 1 passes the input through."
for _bad in [0.0, 1.5, -0.2]:
    try:
        ema([1, 2], _bad)
        assert False, f"alpha = {_bad} should raise ValueError."
    except ValueError:
        pass
assert samples_to_settle(0.1) == 29 and samples_to_settle(0.02) == 149 and type(samples_to_settle(0.5)) is int, "29 and 149 samples to 95%."
assert samples_to_settle(0.5, 0.75) == 2 and samples_to_settle(1.0) == 1, "Exact quarters; alpha = 1 settles in one sample."
_x, _k = iterate(math.cos, 1.0)
assert type(_x) is float and abs(_x - 0.7390851332151607) < 1e-11 and 50 < _k < 100, f"cos converges linearly in a few dozen steps; got {(_x, _k)}."
_h, _kh = iterate(lambda v: 0.5 * (v + 2 / v), 1.0)
assert abs(_h - math.sqrt(2)) < 1e-15 and _kh <= 6, "Heron's method converges in a handful of steps."
try:
    iterate(lambda v: 2 * v + 1, 1.0, max_iter=50)
    assert False, "An unstable fixed point (slope 2) never converges: RuntimeError."
except RuntimeError:
    pass
"SUCCESS: An EMA is a geometric recurrence trading noise for lag, and an iteration settles on a fixed point when the slope there is below 1."
```

Hint: Keep one running value y and update it for each reading. The gap after a step shrinks by (1 − α) per sample, so count samples until (1 − α)ⁿ ≤ 1 − fraction. For `iterate`, compare each new value with the previous one.
:::

::: challenge Solving and exploring recurrences [hard]
Write `linear_recurrence(c1, c2, a0, a1)`: return a function `term(n)` giving aₙ for aₙ₊₁ = c₁aₙ + c₂aₙ₋₁ in closed form from the characteristic roots of λ² = c₁λ + c₂: for distinct roots aₙ = Aλ₁ⁿ + Bλ₂ⁿ (roots may be complex; return the real part as a plain float), and for a repeated root λ, aₙ = (A + Bn)λⁿ; A and B are fixed by a₀ and a₁. Raise `ValueError` if c₂ = 0. Then write `logistic_cycle(r, x0=0.2, transient=2000, keep=256, digits=6)`: iterate x ← rx(1 − x) `transient` times, then record the next `keep` values rounded to `digits` decimals, and return the sorted list of distinct values (plain floats) if there are at most 32 of them, otherwise `None` (treated as chaotic).

```python starter
import numpy as np

def linear_recurrence(c1, c2, a0, a1):
    return lambda n: 0.0

def logistic_cycle(r, x0=0.2, transient=2000, keep=256, digits=6):
    return None

print(linear_recurrence(1, 1, 0, 1)(30), logistic_cycle(3.2))
```

```python solution
import cmath
import numpy as np

def linear_recurrence(c1, c2, a0, a1):
    if c2 == 0:
        raise ValueError("not a second-order recurrence")
    disc = c1 * c1 + 4 * c2
    if abs(disc) < 1e-14:
        lam = c1 / 2
        A = a0
        B = a1 / lam - a0
        return lambda n: float(((A + B * n) * lam ** n).real if isinstance(lam, complex) else (A + B * n) * lam ** n)
    s = cmath.sqrt(disc)
    l1, l2 = (c1 + s) / 2, (c1 - s) / 2
    B = (a1 - a0 * l1) / (l2 - l1)
    A = a0 - B
    return lambda n: float((A * l1 ** n + B * l2 ** n).real)

def logistic_cycle(r, x0=0.2, transient=2000, keep=256, digits=6):
    x = x0
    for _ in range(transient):
        x = r * x * (1 - x)
    seen = set()
    for _ in range(keep):
        x = r * x * (1 - x)
        seen.add(round(x, digits))
    return sorted(float(v) for v in seen) if len(seen) <= 32 else None

print(linear_recurrence(1, 1, 0, 1)(30), logistic_cycle(3.2))
```

```python test
import math
import numpy as np
for _n in ["linear_recurrence", "logistic_cycle"]:
    assert _n in dir(), f"Define {_n}."
_fib = linear_recurrence(1, 1, 0, 1)
assert abs(_fib(30) - 832040) < 1e-6 and abs(_fib(0)) < 1e-12 and type(_fib(5)) is float, "Fibonacci in closed form."
_seq = [2.0, 7.0]
for _ in range(10):
    _seq.append(3 * _seq[-1] - 2 * _seq[-2])
_cf = linear_recurrence(3, -2, 2, 7)
assert all(abs(_cf(_k) - _seq[_k]) < 1e-6 for _k in range(12)), "Distinct real roots 1 and 2."
_rep = [1.0, 4.0]
for _ in range(10):
    _rep.append(4 * _rep[-1] - 4 * _rep[-2])
assert all(abs(linear_recurrence(4, -4, 1, 4)(_k) - _rep[_k]) < 1e-6 for _k in range(12)), "A repeated root 2: (A + Bn) 2^n."
_osc = [1.0, 0.9]
for _ in range(40):
    _osc.append(1.6 * _osc[-1] - 0.81 * _osc[-2])
assert all(abs(linear_recurrence(1.6, -0.81, 1.0, 0.9)(_k) - _osc[_k]) < 1e-9 for _k in range(42)), "Complex roots: a decaying oscillation, real values."
try:
    linear_recurrence(2, 0, 1, 1)
    assert False, "c2 = 0 should raise ValueError."
except ValueError:
    pass
assert logistic_cycle(2.8) == [0.642857], f"r = 2.8: the fixed point 1 - 1/r; got {logistic_cycle(2.8)}."
_c2 = logistic_cycle(3.2)
assert _c2 is not None and len(_c2) == 2 and all(type(_v) is float for _v in _c2), "r = 3.2: a 2-cycle."
assert len(logistic_cycle(3.5)) == 4 and len(logistic_cycle(3.55)) == 8, "Period doubling: 4, then 8."
assert logistic_cycle(3.9) is None and len(logistic_cycle(3.83)) == 3, "Chaos at 3.9; the period-3 window at 3.83."
"SUCCESS: Linear recurrences are solved by their characteristic roots, while a one-line non-linear rule doubles its period into chaos."
```

Hint: The characteristic roots are (c₁ ± √(c₁² + 4c₂))/2; use `cmath.sqrt` so complex roots work. With a₀ = A + B and a₁ = Aλ₁ + Bλ₂, solve for A and B. For a repeated root λ = c₁/2, a₀ = A and a₁ = (A + B)λ. For the logistic map, collect the rounded values in a set.
:::

## What you learned

- A first-order linear recurrence such as a loan balance, Bₙ₊₁ = (1 + i)Bₙ − P, unrolls into a geometric closed form, and the payment that zeroes the balance is the annuity formula.
- Iterations settle at fixed points x* = f(x*), which attract when |f′(x*)| < 1; zero slope (Newton, Heron) gives very fast convergence, and cobweb diagrams show the path.
- The exponential moving average is a recurrence filter whose step response closes by (1 − α) per sample: less noise costs more lag.
- The logistic map's fixed point loses stability at r = 3, after which period doubling leads to chaos, with exponential sensitivity to the starting value.
- Second-order linear recurrences are solved by the characteristic equation: Fibonacci grows like the golden ratio's powers, and complex roots inside the unit circle mean a decaying oscillation.

The next lesson describes curves by giving x and y as functions of a third variable: parametric curves, the language of toolpaths.
