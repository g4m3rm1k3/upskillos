# Propagating measurement error

A machined block is measured with a caliper: 120.00, 80.00 and 45.00 mm, each reading good to about ±0.02 mm. Its volume is 432,000 mm³, but how well is that known? The gradient lesson gave the basic rule: errors pass through a calculation scaled by the partial derivatives, and independent ones add in quadrature. This lesson turns that rule into a working method. Products and powers get a simple relative-error form. An **uncertainty budget** shows which measurement to improve. Monte Carlo simulation checks the rule and goes where it cannot. Two traps catch experienced engineers: errors that are not independent, and calculations so non-linear that the answer is not just uncertain but biased.

This lesson covers:

- relative uncertainty of products and powers, and the uncertainty budget;
- worst case, root-sum-square and Monte Carlo compared;
- which measurement to improve: powers amplify errors;
- correlated errors, such as a shared calibration offset;
- non-linear calculations, bias and lopsided intervals.

## Products, powers and the budget

::: math
\[ f = C\,x_1^{p_1} x_2^{p_2} \cdots \;\Longrightarrow\; \left(\frac{\sigma_f}{f}\right)^2 \approx \sum_i \left(p_i\,\frac{\sigma_i}{x_i}\right)^2, \qquad \text{share}_i = \frac{(p_i\,\sigma_i / x_i)^2}{\sum_j (p_j\,\sigma_j / x_j)^2} \]
- for products and powers, relative uncertainties add in quadrature, each multiplied by its power
- $C$: a constant such as $\pi/4$, which drops out; $p_i$: the power of $x_i$ (negative for division)
- $\sigma_i$: the standard uncertainty of input $x_i$; the shares form the **uncertainty budget** and add to 100%
- worst case adds the relative errors directly: $\sum_i |p_i|\,\sigma_i/x_i$
In code: `rel = math.sqrt(sum((s / x) ** 2 for x in sides.values()))` and the shares `(s / x) ** 2 / rel ** 2`
:::

For f = x₁^p₁ x₂^p₂ ..., the partial derivative with respect to xᵢ is pᵢ f/xᵢ. Dividing the general propagation rule by f² turns it into a statement about **relative** uncertainties. Each input's relative uncertainty, multiplied by its power, adds in quadrature. Constants like π drop out. This is the rule used every day for areas, volumes, densities, flows and stresses.

The individual terms are as useful as the total. Their shares, the **uncertainty budget**, show where the uncertainty comes from. The same ±0.02 mm is a bigger fraction of 45 mm than of 120 mm, so the shortest side dominates.

Predict before running: which of the three sides contributes most to the volume's uncertainty, and how big is the total compared with the worst case?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(59)
sides = {"length": 120.0, "width": 80.0, "height": 45.0}
s = 0.02
V = math.prod(sides.values())
rel = math.sqrt(sum((s / x) ** 2 for x in sides.values()))
print(f"volume {V:,.0f} mm³, relative uncertainty {rel:.3e}, so ±{V * rel:.0f} mm³")
for name, x in sides.items():
    print(f"  {name:<7} {x:6.1f} mm: relative {s / x:.2e}, share of the variance {100 * (s / x) ** 2 / rel ** 2:5.1f}%")
print(f"worst case (all errors the same way): ±{V * s * sum(1 / x for x in sides.values()):.0f} mm³")
```

The volume is 432,000 ± 232 mm³, a relative uncertainty of about 0.054%. The 45 mm height accounts for 69% of the variance, the 80 mm width 22% and the 120 mm length under 10%. Improving the length measurement would barely help; a better height measurement would. The worst case, ±372 mm³, assumes all three errors push the same way at once, which is possible but unlikely for independent errors.

## Monte Carlo propagation

::: math
\[ x_i^{(k)} = x_i + \varepsilon_i^{(k)}, \quad f^{(k)} = f\big(x_1^{(k)}, x_2^{(k)}, \ldots\big), \quad k = 1, \ldots, N, \qquad \sigma_f \approx \operatorname{sd}\big(f^{(k)}\big) \]
- simulate many sets of inputs with the stated uncertainties, compute $f$ for each, and look at the spread
- a 95% interval comes from the 2.5% and 97.5% points of the simulated values; it does not have to be symmetric
- $\varepsilon_i^{(k)}$: a random error drawn from input $i$'s distribution; $N$: the number of simulated sets
- a tolerance of $\pm a$ with any value equally likely (uniform) has standard deviation $a/\sqrt{3}$
In code: arrays of 200,000 simulated sides, `Vs = Ls * Ws * Hs`, then `Vs.std()` and `np.percentile(Vs, [2.5, 97.5])`
:::

The propagation formula is a linear approximation. **Monte Carlo** propagation avoids approximations entirely. Draw thousands of plausible input values, push each set through the calculation, and look at the results, as in the probability lessons. It handles any formula and any input distribution, and it costs only computing time. For a small, smooth calculation like this volume it should agree with the formula, which makes it a check on both.

Uncertainties are not always standard deviations. A drawing tolerance of ±0.05 mm, with no reason to prefer any value inside it, is a **uniform** distribution. Its standard deviation is 0.05/√3 ≈ 0.029 mm, not 0.05. Using the tolerance as if it were a standard deviation overstates the uncertainty.

Predict before running: does the simulation agree with ±232 mm³? And for parts made anywhere within ±0.05 mm, is the worst case ever reached?

```python
n = 200_000
Ls, Ws, Hs = (x + rng.normal(0, s, n) for x in sides.values())
Vs = Ls * Ws * Hs
lo, hi = np.percentile(Vs, [2.5, 97.5])
print(f"normal errors: simulated sd {Vs.std():.1f} mm³ (formula {V * rel:.1f}); 95% interval {lo - V:+.0f} to {hi - V:+.0f} mm³")

tol = 0.05
Lu, Wu, Hu = (x + rng.uniform(-tol, tol, n) for x in sides.values())
Vu = Lu * Wu * Hu
rss_uniform = V * math.sqrt(sum((tol / math.sqrt(3) / x) ** 2 for x in sides.values()))
print(f"uniform ±{tol}: simulated sd {Vu.std():.1f}, formula with a/√3 {rss_uniform:.1f}; worst case ±{V * tol * sum(1 / x for x in sides.values()):.0f}, "
      f"largest seen in {n:,} parts {np.abs(Vu - V).max():.0f}")

fig, ax = plt.subplots(figsize=(6, 3))
ax.hist(Vs - V, bins=80, density=True, alpha=0.6, label="caliper error σ = 0.02")
ax.hist(Vu - V, bins=80, density=True, alpha=0.6, label="tolerance ±0.05 (uniform)")
ax.set_xlabel("volume error (mm³)")
ax.legend(fontsize=8)
plt.show()
```

The simulated standard deviation, 231.7 mm³, matches the formula's 231.8, and the 95% interval, about ±454 mm³, is ±1.96σ, as for a normal distribution. For the uniform tolerances the formula with a/√3 (334.5) matches the simulation (334.9). The worst case, ±930 mm³, was approached (922) only by the most extreme of 200,000 simulated parts. The sum of three uniform errors is already nearly bell-shaped, the central limit theorem again, so stacking worst cases is very pessimistic.

## Powers amplify: which measurement to improve

::: math
\[ k = \frac{G\,d^4}{8\,D^3\,n} \;\Longrightarrow\; \left(\frac{\sigma_k}{k}\right)^2 = \left(\frac{\sigma_G}{G}\right)^2 + \left(4\,\frac{\sigma_d}{d}\right)^2 + \left(3\,\frac{\sigma_D}{D}\right)^2 \]
- $k$: spring rate (N/mm); $G$: shear modulus of the wire; $d$: wire diameter; $D$: mean coil diameter; $n$: number of active coils (an exact count)
- a quantity raised to the power $p$ contributes $p$ times its relative uncertainty: the wire diameter counts four times, the coil diameter three times
- negative powers (dividing) contribute just like positive ones, because the terms are squared
In code: the dictionary `terms` of relative contributions, the shares of the variance, and the effect of a better wire measurement
:::

The gradient lesson saw a squared diameter count twice. High powers make the effect dramatic. The rate of a helical compression spring, the force per millimetre of compression, depends on the **fourth** power of the wire diameter and the inverse **cube** of the coil diameter. A 1% error in the wire diameter therefore becomes a 4% error in the spring rate, which is why spring makers specify wire to a few micrometres. The number of coils is counted, not measured, so it has no uncertainty.

Predict before running: the wire measures 2.00 ± 0.01 mm, the coil 20.0 ± 0.05 mm, there are 10 active coils, and the steel's shear modulus is 79.3 GPa ± 1%. Which input limits the spring rate, and what does a wire measurement five times better buy?

```python
G, d, D, n_coils = 79_300.0, 2.00, 20.0, 10
sd_G, sd_d, sd_D = 0.01 * 79_300.0, 0.01, 0.05
k = G * d ** 4 / (8 * D ** 3 * n_coils)
terms = {"wire diameter (×4)": 4 * sd_d / d, "coil diameter (×3)": 3 * sd_D / D, "shear modulus": sd_G / G}
r = math.sqrt(sum(v ** 2 for v in terms.values()))
print(f"spring rate {k:.4f} N/mm ± {k * r:.4f} (relative {r:.2e})")
for name, v in terms.items():
    print(f"  {name:<19} {v:.2e}  share {100 * v ** 2 / r ** 2:5.1f}%")
better = math.sqrt((4 * 0.002 / d) ** 2 + (3 * sd_D / D) ** 2 + (sd_G / G) ** 2)
print(f"with the wire to ±0.002 mm: ± {k * better:.4f} N/mm (relative {better:.2e})")
```

The spring rate is 1.98 ± 0.05 N/mm, a relative uncertainty of 2.4%. The wire's fourfold term supplies about 72% of the variance; the shear modulus 18% and the coil diameter 10%. Measuring the wire to ±0.002 mm (a micrometer instead of a caliper) cuts the total to 1.3%. After that, the material's shear modulus dominates, and only a test of the actual wire would improve it. A budget always says where the next improvement should go.

## Correlated errors

::: math
\[ \sigma_f^2 = \nabla f^\mathsf{T}\,\Sigma\,\nabla f = \sum_i \sum_j \frac{\partial f}{\partial x_i}\frac{\partial f}{\partial x_j}\,\Sigma_{ij}, \qquad \Sigma = \sigma^2 I + \sigma_b^2\,\mathbf{1}\mathbf{1}^\mathsf{T} \]
- $\Sigma$: the covariance matrix of the inputs; independent inputs give a diagonal $\Sigma$, the earlier rule
- a shared offset $b$ (standard deviation $\sigma_b$) in every reading adds $\sigma_b^2$ to every entry, diagonal and off-diagonal
In code: `g @ cov @ g` with `g` the gradient of $LWH$; the same with a shared random offset `off` in a simulation
:::

The rule "add in quadrature" assumes the errors are **independent**. Errors from a common cause are not. Suppose the caliper itself reads 0.02 mm high or low (σ_b = 0.02 mm), the same for every reading because it is the same caliper. Then all three sides err together, the errors cannot partly cancel, and the volume's uncertainty grows. The general rule uses the **covariance matrix** Σ of the inputs: σ_f² = ∇fᵀ Σ ∇f, a quadratic form like the variance along a direction in the PCA lesson. Off-diagonal terms are where correlation lives.

Predict before running: with independent reading noise of 0.02 mm plus a shared 0.02 mm calibration offset, how big is the volume's uncertainty? And what if the offset were wrongly treated as independent?

```python
x = np.array(list(sides.values()))
g = np.array([x[1] * x[2], x[0] * x[2], x[0] * x[1]])
sb = 0.02
cov_independent = np.diag([s ** 2] * 3)
cov_shared = cov_independent + sb ** 2 * np.ones((3, 3))
cov_wrong = cov_independent + np.diag([sb ** 2] * 3)
print(f"reading noise only:            ±{math.sqrt(g @ cov_independent @ g):.0f} mm³")
print(f"plus a shared offset:          ±{math.sqrt(g @ cov_shared @ g):.0f} mm³")
print(f"offset treated as independent: ±{math.sqrt(g @ cov_wrong @ g):.0f} mm³  (wrong)")
off = rng.normal(0, sb, n)
Vc = (x[0] + rng.normal(0, s, n) + off) * (x[1] + rng.normal(0, s, n) + off) * (x[2] + rng.normal(0, s, n) + off)
print(f"simulation with one offset per measured block: ±{Vc.std():.0f} mm³")
```

The shared offset raises the uncertainty from ±232 to ±438 mm³. Treating the same offset as three independent errors gives ±328 mm³, a 25% underestimate, because it lets the offset partly cancel itself. The simulation, drawing one offset per block and adding it to all three sides, confirms ±438. Calibration errors, temperature effects on the whole part, and a shared reference standard all create correlations like this. They are the most common way real uncertainty statements end up too optimistic. Correlation can also help: when a result is a **difference** of two readings from the same instrument, the shared offset cancels.

## Non-linear calculations: bias

::: math
\[ R = \frac{V}{I}, \qquad E[R] \approx \frac{V}{I}\left(1 + \frac{\sigma_I^2}{I^2}\right), \qquad E[f(X)] \approx f(\mu) + \tfrac{1}{2} f''(\mu)\,\sigma^2 \]
- linear propagation assumes $f$ is close to its tangent over the spread of the input; with large relative errors it is not
- curvature shifts the average result (bias) and makes the interval lopsided
In code: `Rs = Vv / Is` for 200,000 simulated currents; mean, median and percentiles against the linear prediction
:::

The linear rule replaces f by its tangent near the measured values. When an input's relative uncertainty is large, the curvature of f matters too. A resistance computed as R = V/I from a small, noisy current is the classic case: 1/I curves steeply at small I. A second-order Taylor expansion shows that the **average** of R is shifted by ½f″σ², a bias, not just a spread. Low current readings push R up more than high readings push it down, so the distribution is lopsided.

Predict before running: 5 V across a resistor, current measured as 10.0 mA with σ = 2 mA. Linear propagation says R = 500 ± 100 Ω. What does a simulation say about the average and the 95% interval?

```python
Vv, I, sI = 5.0, 0.010, 0.002
Is = I + rng.normal(0, sI, n)
Rs = Vv / Is
lo, hi = np.percentile(Rs, [2.5, 97.5])
print(f"linear: R = {Vv / I:.0f} ± {Vv / I ** 2 * sI:.0f} Ω, so 95% about {Vv / I - 1.96 * Vv / I ** 2 * sI:.0f} to {Vv / I + 1.96 * Vv / I ** 2 * sI:.0f}")
print(f"simulation: mean {Rs.mean():.1f}, median {np.median(Rs):.1f}, sd {Rs.std():.1f}; 95% interval {lo:.0f} to {hi:.0f} Ω")
print(f"second-order mean V/I × (1 + (σ/I)²) = {Vv / I * (1 + (sI / I) ** 2):.1f}")
```

The simulated mean is about 523 Ω, not 500: a bias of +4.6%, close to the second-order estimate of 520. (Strictly, a normally distributed current can come arbitrarily close to zero, so V/I has no finite mean in theory, and an unlucky simulation can show a far larger average: about one seed in a couple of hundred gives over 1,000 Ω. The median and percentiles are stable, which is another reason to report them.) The median stays at 500 (the middle current gives the middle resistance), but the 95% interval runs from 359 to 821 Ω, lopsided, against the linear formula's symmetric 304 to 696. With a 20% relative error the linear rule is simply the wrong tool. The cure is better data, a longer measurement or a larger current, or reporting the Monte Carlo interval. A rule of thumb: once an input's relative uncertainty passes about 10% in a strongly curved formula, simulate.

::: challenge Products and the budget [easy]
A product of powers is described by a list of terms `(value, sigma, power)`. Write `product_uncertainty(terms)`: return `(relative_rss, relative_worst)`, the relative uncertainty of the product by root-sum-square of the terms |power| × sigma/|value|, and by adding them directly (worst case), as plain floats. Write `budget(terms)`: the list of each term's share of the variance, in percent, as plain floats adding up to 100 (return all zeros if every sigma is 0). Raise `ValueError` in both if any value is 0 or any sigma is negative.

```python starter
import math

def product_uncertainty(terms):
    return (0.0, 0.0)

def budget(terms):
    return [0.0 for _ in terms]

block = [(120.0, 0.02, 1), (80.0, 0.02, 1), (45.0, 0.02, 1)]
print(product_uncertainty(block), budget(block))
```

```python solution
import math

def _rel_terms(terms):
    out = []
    for value, sigma, power in terms:
        if value == 0 or sigma < 0:
            raise ValueError("values must be non-zero and sigmas non-negative")
        out.append(abs(power) * sigma / abs(value))
    return out

def product_uncertainty(terms):
    rel = _rel_terms(terms)
    return float(math.sqrt(sum(r * r for r in rel))), float(sum(rel))

def budget(terms):
    rel = _rel_terms(terms)
    total = sum(r * r for r in rel)
    if total == 0:
        return [0.0 for _ in rel]
    return [float(100 * r * r / total) for r in rel]

block = [(120.0, 0.02, 1), (80.0, 0.02, 1), (45.0, 0.02, 1)]
print(product_uncertainty(block), budget(block))
```

```python test
import math
for _n in ["product_uncertainty", "budget"]:
    assert _n in dir(), f"Define {_n}."
_block = [(120.0, 0.02, 1), (80.0, 0.02, 1), (45.0, 0.02, 1)]
_r, _w = product_uncertainty(_block)
assert type(_r) is float and type(_w) is float, "Plain floats."
assert abs(_r - 5.36478e-4) < 1e-9 and abs(_w * 432000 - 372.0) < 1e-6, f"Block: relative 5.365e-4, worst case ±372 mm³; got {_r}, {_w * 432000}."
_rho = [(123.40, 0.05, 1), (20.00, 0.01, -2), (50.00, 0.02, -1)]
assert abs(product_uncertainty(_rho)[0] - 1.150728e-3) < 1e-8, "Density m d^-2 h^-1: negative powers count by their size."
assert abs(product_uncertainty(_rho)[1] - (0.05 / 123.4 + 2 * 0.01 / 20 + 0.02 / 50)) < 1e-12 and abs(product_uncertainty([(-4.0, 0.1, 2)])[1] - 0.05) < 1e-12, "Worst case adds |power| × sigma/|value|."
_b = budget(_rho)
assert all(type(_v) is float for _v in _b) and abs(sum(_b) - 100) < 1e-9, "Shares in percent adding to 100."
assert [round(_v, 1) for _v in _b] == [12.4, 75.5, 12.1], f"Mass, diameter, height shares 12.4, 75.5, 12.1; got {_b}."
assert budget([(5.0, 0.0, 1), (2.0, 0.0, 3)]) == [0.0, 0.0] and product_uncertainty([(5.0, 0.0, 2)]) == (0.0, 0.0), "No uncertainty at all."
assert abs(product_uncertainty([(-4.0, 0.1, 2)])[0] - 0.05) < 1e-12, "Use the size of the value."
for _bad in [[(0.0, 0.1, 1)], [(2.0, -0.1, 1)]]:
    for _f in (product_uncertainty, budget):
        try:
            _f(_bad)
            assert False, f"{_f.__name__}({_bad}) should raise ValueError."
        except ValueError:
            pass
"SUCCESS: For products and powers, relative errors scaled by their powers add in quadrature, and the budget shows which one to attack."
```

Hint: Each term contributes |power| × sigma/|value|. The root-sum-square is the square root of the sum of their squares; the worst case is their plain sum; each share is its square divided by the total of the squares, times 100.
:::

::: challenge Covariance propagation [medium]
The gradient lesson's `propagate` assumed independent inputs. Write `covariance_matrix(sigmas, corr=None)`: the matrix Σᵢⱼ = σᵢσⱼρᵢⱼ as a NumPy array, from the standard uncertainties and a correlation matrix (the identity when None). sigmas and corr may be lists or arrays. Raise `ValueError` if a sigma is negative, or corr has the wrong shape, is not symmetric, does not have ones on its diagonal, or has an entry outside [−1, 1]. Then write `propagate_cov(grad, sigmas, corr=None)`: the uncertainty √(gᵀΣg) of a result whose gradient with respect to the inputs is `grad`, as a plain float. Finally write `difference_uncertainty(s1, s2, rho)`: the standard uncertainty of a difference x₁ − x₂ of two readings with uncertainties s1 and s2 and correlation rho, as a plain float.

```python starter
import numpy as np

def covariance_matrix(sigmas, corr=None):
    return np.diag(np.asarray(sigmas, dtype=float) ** 2)

def propagate_cov(grad, sigmas, corr=None):
    return 0.0

def difference_uncertainty(s1, s2, rho):
    return 0.0

print(propagate_cov([3600.0, 5400.0, 9600.0], [0.02, 0.02, 0.02]))
```

```python solution
import math
import numpy as np

def covariance_matrix(sigmas, corr=None):
    sig = np.asarray(sigmas, dtype=float)
    if np.any(sig < 0):
        raise ValueError("sigmas must not be negative")
    n = sig.size
    C = np.eye(n) if corr is None else np.asarray(corr, dtype=float)
    if C.shape != (n, n) or not np.allclose(C, C.T) or not np.allclose(np.diag(C), 1) or np.any(np.abs(C) > 1):
        raise ValueError("corr must be a symmetric n x n correlation matrix")
    return np.outer(sig, sig) * C

def propagate_cov(grad, sigmas, corr=None):
    g = np.asarray(grad, dtype=float)
    return float(math.sqrt(max(g @ covariance_matrix(sigmas, corr) @ g, 0.0)))

def difference_uncertainty(s1, s2, rho):
    return propagate_cov([1.0, -1.0], [s1, s2], [[1.0, rho], [rho, 1.0]])

print(propagate_cov([3600.0, 5400.0, 9600.0], [0.02, 0.02, 0.02]))
```

```python test
import math
import numpy as np
for _n in ["covariance_matrix", "propagate_cov", "difference_uncertainty"]:
    assert _n in dir(), f"Define {_n}."
_g = [80 * 45.0, 120 * 45.0, 120 * 80.0]
_s = propagate_cov(_g, [0.02, 0.02, 0.02])
assert type(_s) is float and abs(_s - 231.7585) < 0.01, f"Independent sides: ±231.76 mm³; got {_s}."
_C = np.array([[1, 0.5, 0.5], [0.5, 1, 0.5], [0.5, 0.5, 1]])
_cov = covariance_matrix([0.02 * math.sqrt(2)] * 3, _C)
assert isinstance(_cov, np.ndarray) and np.allclose(_cov, 0.0008 * _C), "Σ = σσᵀ ∘ ρ."
assert abs(propagate_cov(_g, [0.02 * math.sqrt(2)] * 3, _C) - math.sqrt(np.array(_g) @ (0.0008 * _C) @ np.array(_g))) < 1e-9, "Correlation 0.5 between every pair."
_shared = np.array([[1.0, 0.5, 0.5], [0.5, 1.0, 0.5], [0.5, 0.5, 1.0]])
assert abs(difference_uncertainty(0.1, 0.1, 1.0)) < 1e-12 and abs(difference_uncertainty(0.1, 0.1, 0.0) - 0.1 * math.sqrt(2)) < 1e-12, "A perfectly shared error cancels in a difference; independent ones add in quadrature."
assert abs(difference_uncertainty(0.1, 0.1, -1.0) - 0.2) < 1e-12 and abs(difference_uncertainty(0.3, 0.1, 1.0) - 0.2) < 1e-12, "Opposite correlation doubles; unequal correlated errors leave |s1 - s2|."
assert propagate_cov([1.0, 2.0], [0.0, 0.0]) == 0.0, "No input uncertainty, no output uncertainty."
for _bad in [dict(sigmas=[0.1, -0.1]), dict(sigmas=[0.1, 0.1], corr=np.eye(3)), dict(sigmas=[0.1, 0.1], corr=[[1, 0.2], [0.3, 1]]),
             dict(sigmas=[0.1, 0.1], corr=[[2, 0], [0, 2]]), dict(sigmas=[0.1, 0.1], corr=[[1, 1.5], [1.5, 1]])]:
    try:
        covariance_matrix(**_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The covariance matrix carries correlations, so shared errors add up in sums and cancel in differences."
```

Hint: `np.outer(sigmas, sigmas) * corr` builds Σ. The uncertainty is the square root of `g @ cov @ g`. A difference has gradient (1, −1), so its variance is s1² + s2² − 2ρ s1 s2.
:::

::: challenge Monte Carlo and bias [hard]
Write `monte_carlo(f, x, sigmas, n=200_000, seed=0)`: draw n samples of each input from a normal distribution with mean xᵢ and standard deviation σᵢ, using `np.random.default_rng(seed)`, pass f a list of the n-element sample arrays (one array per input; f must work on arrays), and return `(mean, sd, lo, hi)` as plain floats: the mean and standard deviation of the results and their 2.5% and 97.5% percentiles. Then write `second_order_mean(f, x, sigmas, h=1e-4)`: f(x) + ½ Σᵢ fᵢᵢ σᵢ², with each second derivative estimated by the second difference (f(x + δeᵢ) − 2f(x) + f(x − δeᵢ))/δ² where δ = h × max(|xᵢ|, 1); here f is called with a list of plain floats. Raise `ValueError` in both if x and sigmas differ in length or a sigma is negative.

```python starter
import numpy as np

def monte_carlo(f, x, sigmas, n=200_000, seed=0):
    return (0.0, 0.0, 0.0, 0.0)

def second_order_mean(f, x, sigmas, h=1e-4):
    return 0.0

ohm = lambda v: v[0] / v[1]
print(monte_carlo(ohm, [5.0, 0.010], [0.0, 0.002]), second_order_mean(ohm, [5.0, 0.010], [0.0, 0.002]))
```

```python solution
import numpy as np

def _check(x, sigmas):
    if len(x) != len(sigmas) or any(s < 0 for s in sigmas):
        raise ValueError("one non-negative sigma per input")

def monte_carlo(f, x, sigmas, n=200_000, seed=0):
    _check(x, sigmas)
    rng = np.random.default_rng(seed)
    samples = [xi + rng.normal(0, si, n) for xi, si in zip(x, sigmas)]
    out = np.asarray(f(samples), dtype=float)
    lo, hi = np.percentile(out, [2.5, 97.5])
    return float(out.mean()), float(out.std()), float(lo), float(hi)

def second_order_mean(f, x, sigmas, h=1e-4):
    _check(x, sigmas)
    x = [float(v) for v in x]
    f0 = f(x)
    total = float(f0)
    for i, s in enumerate(sigmas):
        d = h * max(abs(x[i]), 1.0)
        up, down = list(x), list(x)
        up[i] += d
        down[i] -= d
        total += 0.5 * (f(up) - 2 * f0 + f(down)) / d ** 2 * s ** 2
    return float(total)

ohm = lambda v: v[0] / v[1]
print(monte_carlo(ohm, [5.0, 0.010], [0.0, 0.002]), second_order_mean(ohm, [5.0, 0.010], [0.0, 0.002]))
```

```python test
import math
import numpy as np
for _n in ["monte_carlo", "second_order_mean"]:
    assert _n in dir(), f"Define {_n}."
_vol = lambda v: v[0] * v[1] * v[2]
_r = monte_carlo(_vol, [120.0, 80.0, 45.0], [0.02, 0.02, 0.02])
assert len(_r) == 4 and all(type(_v) is float for _v in _r), "Return four plain floats."
assert abs(_r[0] - 432000) < 5 and abs(_r[1] - 231.76) < 3, f"Block: mean 432,000, sd about 231.8; got {_r[:2]}."
assert abs((_r[3] - _r[2]) / 2 - 1.96 * 231.76) < 10, "A near-normal result: 95% interval about ±1.96 sd."
assert monte_carlo(_vol, [120.0, 80.0, 45.0], [0.02, 0.02, 0.02], seed=5) == monte_carlo(_vol, [120.0, 80.0, 45.0], [0.02, 0.02, 0.02], seed=5), "Same seed, same result."
_ohm = lambda v: v[0] / v[1]
_m, _sd, _lo, _hi = monte_carlo(_ohm, [5.0, 0.010], [0.0, 0.002])
assert _m > 505 and 350 < _lo < 368 and 800 < _hi < 845, f"R = V/I with a 20% current error: mean pushed above 500, interval about 359 to 821; got {_m:.1f}, {_lo:.0f}-{_hi:.0f}."
assert _hi - 500 > 1.5 * (500 - _lo), "The interval is lopsided towards high resistance."
_s2 = second_order_mean(_ohm, [5.0, 0.010], [0.0, 0.002])
assert type(_s2) is float and abs(_s2 - 520.0) < 0.05, f"Second-order mean 5/0.01 × (1 + 0.04) = 520; got {_s2}."
assert abs(second_order_mean(lambda v: v[0] ** 2, [3.0], [0.5]) - 9.25) < 1e-4, "E[X²] = μ² + σ² exactly for a square."
assert abs(second_order_mean(lambda v: 2 * v[0] + v[1], [1.0, 2.0], [0.3, 0.4]) - 4.0) < 1e-6, "No curvature, no bias."
for _bad in [([1.0, 2.0], [0.1]), ([1.0], [-0.1])]:
    for _fn in (monte_carlo, second_order_mean):
        try:
            _fn(lambda v: v[0], *_bad)
            assert False, f"{_fn.__name__} with {_bad} should raise ValueError."
        except ValueError:
            pass
"SUCCESS: Simulation propagates any uncertainty through any formula, and curvature shows up as a bias the linear rule cannot see."
```

Hint: One array per input: `xi + rng.normal(0, si, n)`; call f on the list of arrays, then use `.mean()`, `.std()` and `np.percentile(..., [2.5, 97.5])`. For the bias, nudge one input at a time up and down by δ and use the second difference.
:::

## What you learned

- For products and powers, relative uncertainties multiplied by their powers add in quadrature; the uncertainty budget's shares show which measurement dominates.
- Monte Carlo propagation simulates many input sets and needs no linearisation; it confirms the formula for small errors and shows that stacked worst cases are very rare. A uniform tolerance ±a has standard deviation a/√3.
- Powers amplify: a wire diameter raised to the fourth power counts four times, so improving the measurement with the largest share pays most.
- Correlated errors, such as a shared calibration offset, need the covariance form σ_f² = ∇fᵀΣ∇f; treating them as independent underestimates the uncertainty (and overestimates it for differences).
- Strongly curved formulas with large relative errors produce biased, lopsided results: the second-order term ½f″σ² estimates the bias, and simulation gives the honest interval.

The next lesson moves from measurements to algebra: rearranging formulas to make the quantity you need the subject, by hand and with SymPy.
