# When numbers betray you

A formula can be perfectly correct on paper and give garbage on a computer. The quadratic formula, taught to every student, loses all its accuracy on some ordinary equations. The textbook formula for variance can return a negative number. A probability computed in NumPy as e^1000/(e^1000 + 1) comes out as "nan". None of these are bugs in the computer: floating-point numbers carry about 16 significant digits, and certain operations destroy those digits. The first lesson of this series met floating point's basic limits. This lesson studies the classic traps that catch working engineers, each with its standard cure, and separates two very different problems: a calculation done badly (an **unstable** algorithm, fixable) and a question that is inherently sensitive (an **ill-conditioned** problem, which no algorithm can rescue).

This lesson covers:

- catastrophic cancellation, and rearranging formulas to avoid it;
- the stable quadratic formula;
- computing variance safely, with Welford's algorithm;
- overflow and underflow in exponentials, and the log-sum-exp trick;
- conditioning versus stability, with a notoriously sensitive matrix;
- comparing floating-point numbers with tolerances.

## Catastrophic cancellation

::: math
\[ 1 - \cos x = 2\sin^2\frac{x}{2} \]
- the left side subtracts two numbers near 1: catastrophic cancellation for small $x$
- the right side has no subtraction and keeps full precision
In code: `1 - math.cos(x)` against `2 * math.sin(x / 2) ** 2`
:::


Subtracting two nearly equal numbers keeps only the digits where they differ. If each is accurate to 16 digits and they agree in the first 12, the difference has only 4 meaningful digits: the rest are rounding noise, now promoted to the leading positions. This is **catastrophic cancellation**. It hides in innocent formulas. 1 − cos x for small x subtracts two numbers near 1; the identity 1 − cos x = 2 sin²(x/2) computes the same quantity without any subtraction. Predict before running: for x = 10⁻⁸, how many correct digits does each version give?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

for x in [1e-2, 1e-5, 1e-8]:
    naive = 1 - math.cos(x)
    stable = 2 * math.sin(x / 2) ** 2
    print(f"x = {x:.0e}: 1 - cos x = {naive:.12e}, 2 sin²(x/2) = {stable:.12e}")

big, step = 1e8, 1.0
print("(1e8 + 1) - 1e8 =", (big + step) - big, "   (1e16 + 1) - 1e16 =", (1e16 + 1.0) - 1e16)
```

The rearranged formula involves no subtraction, so it serves as the accurate reference.

At x = 10⁻² the two versions agree to twelve digits. At 10⁻⁵ the naive one is wrong from the eighth digit on (5.0000004137e−11 against 4.9999999996e−11), and at 10⁻⁸ it returns exactly 0, because cos(10⁻⁸) rounds to exactly 1: all information is lost. The rearranged formula stays accurate to full precision. The last line shows the root cause: adding 1 to 10¹⁶ is lost entirely, since 10¹⁶ + 1 is not representable.

## The stable quadratic formula

::: math
\[ q = -\tfrac{1}{2}\Big(b + \operatorname{sign}(b)\sqrt{b^2 - 4ac}\Big), \qquad x_1 = \frac{q}{a}, \qquad x_2 = \frac{c}{q} \]
- $q$ adds numbers of the same sign, so nothing cancels
- the second root uses the product of roots, $x_1 x_2 = c/a$
In code: `textbook(a, b, c)` against `stable(a, b, c)` with `q = -0.5 * (b + math.copysign(d, b))`
:::


The roots of ax² + bx + c = 0 are (−b ± √(b² − 4ac))/(2a). When b² is much larger than 4ac, √(b² − 4ac) is very close to |b|, and one of the two roots subtracts nearly equal numbers. The cure uses the fact that the product of the roots is c/a: compute the large root safely (adding numbers of the same sign), then the small one as c/(a × large root). Predict before running: for x² + 10⁸x + 1 = 0, whose small root is very close to −10⁻⁸, what does the textbook formula give?

```python
def textbook(a, b, c):
    d = math.sqrt(b * b - 4 * a * c)
    return (-b + d) / (2 * a), (-b - d) / (2 * a)

def stable(a, b, c):
    d = math.sqrt(b * b - 4 * a * c)
    q = -0.5 * (b + math.copysign(d, b))
    return c / q, q / a

for b in [10.0, 1e4, 1e8]:
    t_small, _ = textbook(1.0, b, 1.0)
    s_small, s_large = stable(1.0, b, 1.0)
    check = s_small ** 2 + b * s_small + 1
    print(f"b = {b:.0e}: textbook small root {t_small:.10e}, stable {s_small:.10e} (residual {check:.1e})")
```

`math.copysign(d, b)` gives d the sign of b, so that b and the square root are added, never subtracted, when forming q.

For b = 10 both agree. For b = 10⁴ the textbook small root has lost about half its digits; for b = 10⁸ it gives −7.45 × 10⁻⁹, wrong by 25%, while the stable version gives −1.0000000000 × 10⁻⁸, and substituting it back leaves a residual at rounding level. The algebra is identical; only the order of operations differs. Numerical libraries use the stable form.

## Variance without disaster

::: math
\[ \delta = x_k - \bar{x}_{k-1}, \qquad \bar{x}_k = \bar{x}_{k-1} + \frac{\delta}{k}, \qquad M_k = M_{k-1} + \delta\,(x_k - \bar{x}_k), \qquad s^2 = \frac{M_n}{n - 1} \]
- $E[x^2] - (E[x])^2$ subtracts two huge, nearly equal numbers
- Welford's update keeps a running mean and a running sum of squared deviations $M$
In code: `naive_var(xs)` against `welford(xs)`: `mean += delta / k`, `m2 += delta * (x - mean)`
:::


The variance is the mean of the squares minus the square of the mean: var = E[x²] − (E[x])². On paper that is fine. On a computer, for data with a large mean and a small spread, such as gauge readings around 25.000 mm or timestamps around 1.7 × 10⁹ s, both terms are huge and nearly equal, and their difference is cancellation noise; it can even come out negative. Subtracting the mean first (the two-pass method) avoids it. **Welford's algorithm** does it in a single pass, updating a running mean and a running sum of squared deviations, which suits streaming sensor data. Predict before running: for 10,000 readings of 10⁹ + small noise, what does the one-pass textbook formula give?

```python
rng = np.random.default_rng(50)
data = 1e9 + rng.normal(0, 0.01, 10_000)

def naive_var(xs):
    n = len(xs)
    s, s2 = 0.0, 0.0
    for x in xs:
        s += x
        s2 += x * x
    return (s2 - s * s / n) / (n - 1)

def welford(xs):
    mean, m2 = 0.0, 0.0
    for k, x in enumerate(xs, start=1):
        delta = x - mean
        mean += delta / k
        m2 += delta * (x - mean)
    return mean, m2 / (len(xs) - 1)

print(f"true variance about {0.01 ** 2:.2e}")
print(f"textbook one-pass formula: {naive_var(data):.6e}")
print(f"Welford:                   {welford(data)[1]:.6e}")
print(f"two-pass (np.var):         {np.var(data, ddof=1):.6e}")
```

Welford updates the mean with each new value, and accumulates the product of the deviation from the old mean and from the new one; no large numbers are ever subtracted.

The true variance is about 10⁻⁴. The textbook formula subtracts two numbers near 10²² and returns rubbish, here a value many orders of magnitude wrong (possibly negative, which no variance can be). Welford and the two-pass method agree with each other and with the truth. Any running statistic on a sensor stream should use Welford's update.

## Exponentials that overflow

::: math
\[ p_i = \frac{e^{x_i}}{\sum_j e^{x_j}} = \frac{e^{x_i - m}}{\sum_j e^{x_j - m}}, \qquad \log\sum_i e^{x_i} = m + \log\sum_i e^{x_i - m}, \qquad m = \max_i x_i \]
- $e^x$ overflows for $x$ above about 709
- subtracting the largest score changes nothing mathematically and prevents overflow
In code: `np.exp(x - np.max(x))` in `softmax`, and `logsumexp(x)`
:::


Floating point covers about 10⁻³⁰⁸ to 10³⁰⁸, and e^x overflows to infinity once x exceeds about 709. Probability calculations meet this constantly: the **softmax** pᵢ = e^(xᵢ)/Σⱼ e^(xⱼ), which turns scores into probabilities in classification models, and the sigmoid of the chain-rule lesson. The cure is to shift before exponentiating: softmax is unchanged by subtracting the same constant from every score, so subtract the largest; then the biggest exponential is e⁰ = 1 and nothing overflows. The same idea gives the **log-sum-exp** trick, log Σ e^(xᵢ) = m + log Σ e^(xᵢ − m) with m = max xᵢ. Predict before running: what does the naive softmax of the scores (1000, 1001, 1002) give?

```python
scores = np.array([1000.0, 1001.0, 1002.0])

def naive_softmax(x):
    e = np.exp(x)
    return e / e.sum()

def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()

def logsumexp(x):
    m = np.max(x)
    return m + math.log(np.sum(np.exp(x - m)))

with np.errstate(over="ignore", invalid="ignore"):
    print("naive softmax:", naive_softmax(scores))
print("shifted softmax:", softmax(scores).round(6), " same as for (0, 1, 2):", softmax(np.array([0.0, 1, 2])).round(6))
print("log-sum-exp:", logsumexp(scores), "  naive:", end=" ")
with np.errstate(over="ignore"):
    print(np.log(np.sum(np.exp(scores))))
```

In desktop Python the deliberately naive versions would print overflow warnings, which `np.errstate` silences; in the browser no warnings appear anyway.

The naive softmax overflows to infinity and returns `nan` for every probability. The shifted version gives (0.090, 0.245, 0.665), exactly the softmax of (0, 1, 2), as it must be. Log-sum-exp returns 1002.41 where the naive form returns infinity. Every machine-learning library computes these the shifted way; the probability lessons' log-probabilities rely on the same idea.

## Conditioning versus stability

::: math
\[ H_{ij} = \frac{1}{i + j - 1}, \qquad \text{digits lost} \approx \log_{10}\kappa(H) \]
- ill-conditioned: tiny input changes cause huge answer changes, whatever the algorithm
- $\kappa$: the condition number
In code: `np.linalg.solve(H, H @ x_true)` and `np.linalg.cond(H)` for $n$ = 4, 8, 12
:::


The traps so far were **unstable algorithms**: a better formula fixed them. Some problems are different: they are **ill-conditioned**, meaning a tiny change in the input changes the exact answer enormously, so no algorithm can recover accuracy that the data do not contain. The condition number from the linear-algebra lessons measures it: roughly, you lose log₁₀(κ) of your 16 digits. The **Hilbert matrix**, Hᵢⱼ = 1/(i + j − 1), is the classic example; it appears when fitting high-degree polynomials. Predict before running: solving H x = H·(1, 1, ..., 1) should give all ones. How many correct digits survive for a 12 × 12 Hilbert matrix?

```python
for n in [4, 8, 12]:
    H = 1 / (np.arange(1, n + 1)[:, None] + np.arange(1, n + 1)[None, :] - 1)
    x_true = np.ones(n)
    x = np.linalg.solve(H, H @ x_true)
    err = np.abs(x - x_true).max()
    print(f"n = {n:>2}: condition number {np.linalg.cond(H):.1e}, worst error {err:.1e}, correct digits about {max(0, -math.log10(err)):.0f}")
```

The right-hand side is built from the known answer, so the error can be measured exactly.

The 4 × 4 system keeps about 12 digits, the 8 × 8 about 6, the 12 × 12 almost none: the lost digits track log₁₀ of the condition number, about 4, 10 and 16. `np.linalg.solve` is a stable algorithm doing its best; the problem itself amplifies rounding errors by κ. The remedy is to change the problem, for example by fitting polynomials in a better-conditioned basis, not to blame the solver.

## Comparing floating-point numbers

::: math
\[ |a - b| \le \max\big(\text{rel\_tol}\cdot\max(|a|, |b|),\; \text{abs\_tol}\big) \]
- relative tolerance for ordinary sizes; absolute tolerance near zero
- never compare computed floats with plain equality
In code: `math.isclose(a, b, rel_tol=1e-9, abs_tol=...)`, and `math.fsum` for accurate sums
:::


Since results carry rounding error, `==` between computed floats is almost always wrong: 0.1 + 0.2 == 0.3 is False. Compare with a **tolerance**: a relative tolerance for numbers of ordinary size (are they equal to 9 significant digits?), plus an absolute tolerance for numbers near zero, where relative comparisons break down. `math.isclose` and `np.isclose` do this. Predict before running: which of these comparisons succeed?

```python
print("0.1 + 0.2 == 0.3:", 0.1 + 0.2 == 0.3, "  isclose:", math.isclose(0.1 + 0.2, 0.3))
print("1e-20 vs 0 (relative only):", math.isclose(1e-20, 0.0), "  with abs_tol=1e-12:", math.isclose(1e-20, 0.0, abs_tol=1e-12))
total = 0.0
for _ in range(10):
    total += 0.1
print("loop adding ten 0.1s == 1:", total == 1.0, f"({total!r});  sum():", sum([0.1] * 10) == 1.0, "  math.fsum:", math.fsum([0.1] * 10) == 1.0)
print("1e15 + 0.3 vs 1e15:", math.isclose(1e15 + 0.3, 1e15), "(relatively equal: they differ by 3 parts in 10¹⁶)")
```

`math.isclose(a, b)` uses a relative tolerance of 10⁻⁹ by default and no absolute tolerance, so comparisons with exactly zero need `abs_tol`.

0.1 + 0.2 is not exactly 0.3, but they are close. A tiny number is never relatively close to zero, so an absolute tolerance is needed there. A plain loop adding ten 0.1s reaches 0.9999999999999999, not 1, while the built-in `sum` (compensated since Python 3.12, as the first lesson showed) and `math.fsum` both get exactly 1. Choosing tolerances is a modelling decision: match them to the precision the inputs and the algorithm actually have.

::: challenge A stable quadratic solver [easy]
Write `quadratic_roots(a, b, c)` returning the two real roots of ax² + bx + c = 0 as a tuple sorted in increasing order, computed stably: q = −½(b + sign(b)√(b² − 4ac)), roots q/a and c/q (when b = 0 use √ for both, ±√(−c/a); when q = 0, both roots are 0). Raise `ValueError` if a = 0 or the discriminant is negative. Then write `relative_error(approx, exact)`: |approx − exact|/|exact|, as a plain float.

```python starter
def quadratic_roots(a, b, c):
    d = math.sqrt(b * b - 4 * a * c)
    return tuple(sorted(((-b - d) / (2 * a), (-b + d) / (2 * a))))

def relative_error(approx, exact):
    return 0.0

print(quadratic_roots(1, 1e8, 1))
```

```python solution
def quadratic_roots(a, b, c):
    if a == 0:
        raise ValueError("not a quadratic")
    disc = b * b - 4 * a * c
    if disc < 0:
        raise ValueError("no real roots")
    d = math.sqrt(disc)
    if b == 0:
        r = math.sqrt(-c / a) if -c / a >= 0 else 0.0
        return tuple(sorted((-r, r)))
    q = -0.5 * (b + math.copysign(d, b))
    if q == 0:
        return (0.0, 0.0)
    return tuple(sorted((q / a, c / q)))

def relative_error(approx, exact):
    return float(abs(approx - exact) / abs(exact))

print(quadratic_roots(1, 1e8, 1))
```

```python test
for _n in ["quadratic_roots", "relative_error"]:
    assert _n in dir(), f"Define {_n}."
assert quadratic_roots(1, -3, 2) == (1.0, 2.0) and quadratic_roots(2, 0, -8) == (-2.0, 2.0), "Ordinary roots, sorted."
_large, _small = quadratic_roots(1, 1e8, 1)
assert relative_error(_large, -1e8) < 1e-15 and relative_error(_small, -1e-8) < 1e-15, f"The small root must be accurate: got {_small}."
_s, _l = quadratic_roots(1, -1e9, 3)
assert relative_error(_s, 3e-9) < 1e-12 and relative_error(_l, 1e9) < 1e-12, "Large positive b too."
assert quadratic_roots(1, 0, 0) == (0.0, 0.0) and quadratic_roots(1, 4, 4) == (-2.0, -2.0), "Double roots."
for _bad in [(0, 1, 1), (1, 1, 1)]:
    try:
        quadratic_roots(*_bad)
        assert False, f"quadratic_roots{_bad} should raise ValueError."
    except ValueError:
        pass
assert relative_error(1.01, 1.0) == abs(1.01 - 1.0) and type(relative_error(2, 3)) is float, "Relative error."
"SUCCESS: Add like signs, never subtract nearly equal numbers: the small root comes from the product of the roots, c/q."
```

Hint: Form q by adding b and the square root with the same sign (`math.copysign`). The two roots are q/a and c/q, because their product must be c/a.
:::

::: challenge Streaming statistics [medium]
Write a class `RunningStats` for a stream of readings, using Welford's algorithm: `add(x)` takes one reading; attributes or methods give `count` (an int), `mean()` and `variance()` (sample variance, dividing by count − 1; raise `ValueError` with fewer than 2 readings), and `std()`. Store only the count, the running mean and the running sum of squared deviations (no list of readings). Then write `naive_variance(xs)`, the one-pass textbook formula (Σx² − (Σx)²/n)/(n − 1), so the two can be compared.

```python starter
class RunningStats:
    def __init__(self):
        self.count = 0

    def add(self, x):
        self.count += 1

    def mean(self):
        return 0.0

    def variance(self):
        return 0.0

    def std(self):
        return 0.0

def naive_variance(xs):
    return 0.0

s = RunningStats()
for x in [1.0, 2.0, 4.0]:
    s.add(x)
print(s.mean(), s.variance())
```

```python solution
class RunningStats:
    def __init__(self):
        self.count = 0
        self._mean = 0.0
        self._m2 = 0.0

    def add(self, x):
        self.count += 1
        delta = x - self._mean
        self._mean += delta / self.count
        self._m2 += delta * (x - self._mean)

    def mean(self):
        if self.count == 0:
            raise ValueError("no readings")
        return self._mean

    def variance(self):
        if self.count < 2:
            raise ValueError("need at least 2 readings")
        return self._m2 / (self.count - 1)

    def std(self):
        return math.sqrt(self.variance())

def naive_variance(xs):
    n = len(xs)
    s = sum(xs)
    s2 = sum(x * x for x in xs)
    return (s2 - s * s / n) / (n - 1)

s = RunningStats()
for x in [1.0, 2.0, 4.0]:
    s.add(x)
print(s.mean(), s.variance())
```

```python test
for _n in ["RunningStats", "naive_variance"]:
    assert _n in dir(), f"Define {_n}."
_s = RunningStats()
for _x in [1.0, 2.0, 4.0]:
    _s.add(_x)
assert _s.count == 3 and abs(_s.mean() - 7 / 3) < 1e-12 and abs(_s.variance() - np.var([1, 2, 4], ddof=1)) < 1e-12, "Mean and sample variance."
assert abs(_s.std() - math.sqrt(_s.variance())) < 1e-15, "std is the square root."
_one = RunningStats(); _one.add(5.0)
try:
    _one.variance()
    assert False, "One reading has no sample variance: raise ValueError."
except ValueError:
    pass
_data = 1e9 + np.random.default_rng(501).normal(0, 0.01, 5000)
_w = RunningStats()
for _x in _data:
    _w.add(float(_x))
_true = np.var(_data, ddof=1)
assert abs(_w.variance() - _true) / _true < 1e-4, f"Welford must stay accurate with a huge offset; got {_w.variance()} vs {_true}."
assert abs(naive_variance(list(_data)) - _true) / _true > 0.1, "The textbook formula fails on the same data."
assert len(vars(_w)) <= 4 and not any(isinstance(_v, (list, np.ndarray)) for _v in vars(_w).values()), "Store only running totals, not the readings."
"SUCCESS: Update the mean and the squared deviations as readings arrive: accurate for any offset, and no data need to be kept."
```

Hint: For each new reading x: self.count += 1; delta = x − self._mean; self._mean += delta / self.count; self._m2 += delta × (x − new mean). (Name the running mean `_mean`, so it does not hide the `mean()` method.) The variance is m2 / (count − 1).
:::

::: challenge Safe probabilities [hard]
Write `logsumexp(xs)`: log Σ exp(xᵢ) computed stably by shifting by the maximum, as a plain float; return −∞ if all inputs are −∞; raise `ValueError` for an empty input. Write `softmax(xs)` returning a NumPy array of probabilities that sum to 1, computed stably. Write `stable_sigmoid(z)` for numbers or arrays that never overflows: for z ≥ 0 use 1/(1 + e^(−z)), for z < 0 use e^z/(1 + e^z) (`np.where` evaluates both branches, so split the array or exponentiate −|z|; the tests reject any `np.exp` that overflows). Then write `log_sigmoid(z)`, log σ(z), accurately even for very negative z (where σ underflows to 0): log σ(z) = −logsumexp([0, −z]), as a NumPy array or float.

```python starter
def logsumexp(xs):
    return math.log(sum(math.exp(x) for x in xs))

def softmax(xs):
    e = np.exp(np.asarray(xs, dtype=float))
    return e / e.sum()

def stable_sigmoid(z):
    return 1 / (1 + np.exp(-np.asarray(z, dtype=float)))

def log_sigmoid(z):
    return np.log(stable_sigmoid(z))

print(softmax([1.0, 2.0, 3.0]))
```

```python solution
def logsumexp(xs):
    x = np.asarray(xs, dtype=float)
    if x.size == 0:
        raise ValueError("empty input")
    m = np.max(x)
    if m == -np.inf:
        return -math.inf
    return float(m + math.log(np.sum(np.exp(x - m))))

def softmax(xs):
    x = np.asarray(xs, dtype=float)
    e = np.exp(x - np.max(x))
    return e / e.sum()

def stable_sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1 / (1 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1 + ez)
    return out if out.ndim else float(out)

def log_sigmoid(z):
    z = np.asarray(z, dtype=float)
    res = -np.logaddexp(0.0, -z)
    return res if res.ndim else float(res)

print(softmax([1.0, 2.0, 3.0]))
```

```python test
import warnings as _w
for _n in ["logsumexp", "softmax", "stable_sigmoid", "log_sigmoid"]:
    assert _n in dir(), f"Define {_n}."
with _w.catch_warnings():
    _w.simplefilter("error")
    assert abs(logsumexp([1000.0, 1001.0, 1002.0]) - (1002 + math.log(1 + math.exp(-1) + math.exp(-2)))) < 1e-9, "No overflow."
    assert abs(logsumexp([-1000.0, -1000.0]) - (-1000 + math.log(2))) < 1e-9 and type(logsumexp([1.0])) is float, "No underflow either."
    assert logsumexp([-math.inf, -math.inf]) == -math.inf, "All -inf gives -inf."
    _p = softmax([1000.0, 1001.0, 1002.0])
    assert np.allclose(_p, softmax([0.0, 1.0, 2.0])) and abs(_p.sum() - 1) < 1e-12 and np.all(np.isfinite(_p)), "Shift-invariant, finite probabilities."
    _z = np.array([-800.0, -30.0, 0.0, 30.0, 800.0])
    _real_exp = np.exp
    def _guarded_exp(*_a, **_k):
        _r = _real_exp(*_a, **_k)
        if np.any(np.isinf(_r)):
            raise FloatingPointError("np.exp overflowed to infinity: exponentiate only non-positive numbers.")
        return _r
    np.exp = _guarded_exp
    try:
        _sg = stable_sigmoid(_z)
        _sg30 = stable_sigmoid(-30.0)
    finally:
        np.exp = _real_exp
    assert np.all(np.isfinite(_sg)) and _sg[0] == 0.0 and _sg[-1] == 1.0 and abs(_sg[2] - 0.5) < 1e-15, "No overflow at ±800."
    assert abs(_sg30 - math.exp(-30) / (1 + math.exp(-30))) < 1e-25, "Accurate tiny probabilities."
    _ls = log_sigmoid(np.array([-800.0, 0.0, 800.0]))
    assert abs(_ls[0] + 800) < 1e-9 and abs(_ls[1] + math.log(2)) < 1e-12 and abs(_ls[2]) < 1e-12, f"log σ(−800) ≈ −800, not −inf; got {_ls}."
try:
    logsumexp([])
    assert False, "An empty input should raise ValueError."
except ValueError:
    pass
"SUCCESS: Shift by the maximum before exponentiating and pick the form that cannot overflow: probabilities that stay finite at any score."
```

Hint: Subtract the maximum before exponentiating, then add it back after the logarithm. For the sigmoid, split the array by the sign of z and use whichever formula only exponentiates negative numbers.
:::

## What you learned

- Subtracting nearly equal numbers destroys their shared digits (catastrophic cancellation); rearranging, as with 1 − cos x = 2 sin²(x/2), avoids it.
- The stable quadratic formula computes the large root by adding like signs and the small one as c/q.
- The one-pass variance formula E[x²] − E[x]² fails for data with a large mean; Welford's algorithm updates the mean and squared deviations safely in one pass.
- Exponentials overflow beyond about e⁷⁰⁹; softmax and log-sum-exp shift by the maximum first, and stable sigmoids exponentiate only negative numbers.
- Unstable algorithms can be fixed; ill-conditioned problems lose about log₁₀ κ digits whatever the algorithm.
- Compare floats with relative tolerances, adding an absolute tolerance near zero.

The next lesson puts the vectors, Jacobians and optimisation of earlier lessons together to make a robot arm reach a target.
