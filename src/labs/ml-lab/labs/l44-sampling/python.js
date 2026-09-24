export default {
  filename: 'sampling.py', packages: ['numpy'],
  title: 'Samplers and the diagnostics that keep them honest.',
  intro: 'Implement self-normalized importance sampling, random-walk Metropolis, Gibbs sampling for a bivariate normal, the effective sample size and R̂. The checks run your samplers on targets with known answers — including a two-mode target that fools a single chain.',
  steps: [
    '`importance(logp, q_sample, q_logpdf, f, n, rng)` → `(estimate, ess)` with self-normalized weights computed in log space.',
    '`metropolis(logp, x0, step, n, rng)` → `(chain, acceptance_rate)`; `chain` has shape (n, d) and starts with x0.',
    '`gibbs_bivariate(rho, x0, n, rng)` → chain of shape (n, 2) using θ₁ | θ₂ ~ N(ρθ₂, 1 − ρ²) and θ₂ | θ₁ likewise.',
    '`ess(x)` → n / (1 + 2 Σ ρₖ), summing autocorrelations ρₖ (k ≥ 1) until the first negative one.',
    '`rhat(chains)` → potential scale reduction for an array of shape (m chains, n draws).',
  ],
  hints: [
    ['Log-weights', '`lw = logp(x) - q_logpdf(x); w = np.exp(lw - lw.max()); w /= w.sum()`; ESS = 1 / Σ w².'],
    ['Autocorrelation', 'Centre x, compute `np.correlate(xc, xc, "full")[n-1:] / (np.arange(n, 0, -1) * var)` or a loop over lags.'],
    ['R̂', 'W = mean of within-chain variances (ddof=1); B = n × variance of chain means (ddof=1); R̂ = √(((n−1)/n·W + B/n)/W).'],
  ],
  starter: `import numpy as np

def importance(logp, q_sample, q_logpdf, f, n, rng):
    raise NotImplementedError

def metropolis(logp, x0, step, n, rng):
    raise NotImplementedError

def gibbs_bivariate(rho, x0, n, rng):
    raise NotImplementedError

def ess(x):
    raise NotImplementedError

def rhat(chains):
    raise NotImplementedError
`,
  solution: `import numpy as np

def importance(logp, q_sample, q_logpdf, f, n, rng):
    x = q_sample(n, rng)
    lw = logp(x) - q_logpdf(x)
    w = np.exp(lw - lw.max())
    w /= w.sum()
    return float(np.sum(w * f(x))), float(1 / np.sum(w ** 2))

def metropolis(logp, x0, step, n, rng):
    x = np.array(x0, dtype=float)
    lx = logp(x)
    chain = np.empty((n, len(x)))
    chain[0] = x
    accepted = 0
    for i in range(1, n):
        y = x + step * rng.normal(size=len(x))
        ly = logp(y)
        if np.log(rng.random()) < ly - lx:
            x, lx = y, ly
            accepted += 1
        chain[i] = x
    return chain, accepted / (n - 1)

def gibbs_bivariate(rho, x0, n, rng):
    s = np.sqrt(1 - rho ** 2)
    a, b = x0
    chain = np.empty((n, 2))
    chain[0] = x0
    for i in range(1, n):
        a = rho * b + s * rng.normal()
        b = rho * a + s * rng.normal()
        chain[i] = a, b
    return chain

def ess(x):
    x = np.asarray(x, dtype=float)
    n = len(x)
    xc = x - x.mean()
    var = xc @ xc / n
    total = 0.0
    for k in range(1, n // 3):
        r = (xc[:-k] @ xc[k:]) / n / var
        if r < 0:
            break
        total += r
    return n / (1 + 2 * total)

def rhat(chains):
    chains = np.asarray(chains, dtype=float)
    m, n = chains.shape
    W = chains.var(axis=1, ddof=1).mean()
    B = n * chains.mean(axis=1).var(ddof=1)
    return float(np.sqrt(((n - 1) / n * W + B / n) / W))
`,
  solutionNote: 'Every sampler here needs only an unnormalized log-density. The diagnostics are what turn a pile of numbers into an estimate you can defend.',
  checkSummary: 'Importance sampling estimates a known mean with a good proposal and gives a low ESS with a poor one; Metropolis recovers the mean and covariance of a correlated Gaussian with a sensible acceptance rate; Gibbs has the right conditional structure; the ESS is far below n for a sticky chain; and R̂ flags chains stuck in different modes while approving well-mixed ones.',
  checks: `
import numpy as np
rng = np.random.default_rng(44)
logp1 = lambda x: np.logaddexp(np.log(0.6) - (x + 2) ** 2 / (2 * 0.36) - np.log(0.6), np.log(0.4) - (x - 2) ** 2 / (2 * 0.64) - np.log(0.8))
def qfam(m, s):
    return (lambda n, r: m + s * r.normal(size=n)), (lambda x: -(x - m) ** 2 / (2 * s * s) - np.log(s))
est, e = importance(logp1, *qfam(0, 3), lambda x: x, 20000, rng)
assert abs(est - (-0.4)) < 0.05 and e > 5000, "a wide proposal should estimate the mean -0.4 well"
_, e_bad = importance(logp1, *qfam(0, 0.5), lambda x: x, 20000, rng)
assert e_bad < 0.05 * 20000, "a narrow proposal should have a tiny effective sample size"
print(f"PASS: importance sampling (estimate {est:.3f}, ESS {e:.0f}; narrow proposal ESS {e_bad:.0f})")
S = np.array([[1, 0.9], [0.9, 1]]); P = np.linalg.inv(S)
logp2 = lambda x: -0.5 * x @ P @ x
chain, acc = metropolis(logp2, [3.0, -3.0], 1.0, 20000, rng)
kept = chain[2000:]
assert 0.15 < acc < 0.6 and np.allclose(kept.mean(0), 0, atol=0.15) and np.allclose(np.cov(kept.T), S, atol=0.15), "Metropolis should recover the Gaussian"
g = gibbs_bivariate(0.9, [3.0, -3.0], 20000, rng)[1000:]
assert np.allclose(np.cov(g.T), S, atol=0.12)
print(f"PASS: Metropolis (acceptance {acc:.2f}) and Gibbs recover mean and covariance")
sticky, _ = metropolis(logp2, [0.0, 0.0], 0.05, 5000, rng)
assert ess(sticky[:, 0]) < 100 and ess(rng.normal(size=5000)) > 3500, "ESS should expose a sticky chain"
logp3 = lambda x: np.logaddexp(-np.sum((x + 2) ** 2) / 0.8, -np.sum((x - 2) ** 2) / 0.8)
stuck = np.array([metropolis(logp3, s, 0.3, 3000, rng)[0][500:, 0] for s in ([-2, -2], [2, 2], [-2, -2], [2, 2])])
good = np.array([metropolis(logp2, s, 1.0, 3000, rng)[0][500:, 0] for s in ([3, 3], [-3, -3], [3, -3], [-3, 3])])
print(f"R-hat: stuck chains {rhat(stuck):.2f}, well-mixed chains {rhat(good):.3f}")
assert rhat(stuck) > 1.5 and rhat(good) < 1.05
print("PASS: ESS and R-hat diagnose mixing")
`,
}
