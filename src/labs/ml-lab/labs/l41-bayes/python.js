export default {
  filename: 'bayes.py', packages: ['numpy'],
  title: 'Conjugate updating, Bayesian linear regression and the evidence.',
  intro: 'Implement the Beta–binomial update and its summaries, the Bayesian linear regression posterior and predictive distribution, and the log evidence used to choose model complexity. The checks confirm the MAP estimate is ridge regression and that the evidence picks a sensible polynomial degree without a validation set.',
  steps: [
    '`beta_update(a, b, heads, tails)` → `(A, B)`; `beta_mean(A, B)`; `beta_map(A, B)` (mode, for A, B > 1).',
    '`blr_posterior(Phi, y, alpha, beta)` → `(m, S)` with S = (αI + βΦᵀΦ)⁻¹ and m = βSΦᵀy.',
    '`blr_predict(phi_new, m, S, beta)` → `(mean, variance)` for rows of new features: mean φᵀm, variance 1/β + φᵀSφ.',
    '`log_evidence(Phi, y, alpha, beta)` → M/2 log α + N/2 log β − E(m) − ½ log|S⁻¹| − N/2 log 2π with E(m) = β/2‖y − Φm‖² + α/2‖m‖².',
  ],
  hints: [
    ['Stable inverse and determinant', 'Form A = αI + βΦᵀΦ; use `np.linalg.solve` for m and `np.linalg.slogdet(A)[1]` for log|A|.'],
    ['Row-wise quadratic form', '`np.sum(P @ S * P, axis=1)` computes φᵀSφ for every row of P.'],
  ],
  starter: `import numpy as np

def beta_update(a, b, heads, tails):
    raise NotImplementedError

def beta_mean(A, B):
    raise NotImplementedError

def beta_map(A, B):
    raise NotImplementedError

def blr_posterior(Phi, y, alpha, beta):
    raise NotImplementedError

def blr_predict(phi_new, m, S, beta):
    raise NotImplementedError

def log_evidence(Phi, y, alpha, beta):
    raise NotImplementedError
`,
  solution: `import numpy as np

def beta_update(a, b, heads, tails):
    return a + heads, b + tails

def beta_mean(A, B):
    return A / (A + B)

def beta_map(A, B):
    return (A - 1) / (A + B - 2)

def blr_posterior(Phi, y, alpha, beta):
    A = alpha * np.eye(Phi.shape[1]) + beta * Phi.T @ Phi
    S = np.linalg.inv(A)
    m = beta * S @ Phi.T @ y
    return m, S

def blr_predict(phi_new, m, S, beta):
    return phi_new @ m, 1 / beta + np.sum(phi_new @ S * phi_new, axis=1)

def log_evidence(Phi, y, alpha, beta):
    N, M = Phi.shape
    A = alpha * np.eye(M) + beta * Phi.T @ Phi
    m = beta * np.linalg.solve(A, Phi.T @ y)
    E = beta / 2 * np.sum((y - Phi @ m) ** 2) + alpha / 2 * m @ m
    return M / 2 * np.log(alpha) + N / 2 * np.log(beta) - E - 0.5 * np.linalg.slogdet(A)[1] - N / 2 * np.log(2 * np.pi)
`,
  solutionNote: 'The posterior mean is ridge regression with λ = α/β; the predictive variance adds weight uncertainty to noise; the evidence integrates the weights out and so penalizes unnecessary flexibility.',
  checkSummary: 'Beta updates and summaries on a hand example; the posterior mean equals ridge with λ = α/β; predictive variance never falls below the noise and grows away from the data; the log evidence matches a brute-force Gaussian computation; and on sine data the evidence prefers a moderate polynomial degree over both a straight line and degree 9.',
  checks: `
import numpy as np
A, B = beta_update(2, 2, 7, 3)
assert (A, B) == (9, 5) and abs(beta_mean(A, B) - 9 / 14) < 1e-12 and abs(beta_map(A, B) - 8 / 12) < 1e-12
print("PASS: Beta-binomial")
rng = np.random.default_rng(41)
x = rng.random(12); y = np.sin(2 * np.pi * x) + 0.25 * rng.normal(size=12)
feats = lambda x, d: np.column_stack([(2 * x - 1) ** k for k in range(d + 1)])
Phi = feats(x, 5); alpha, beta = 0.5, 16.0
m, S = blr_posterior(Phi, y, alpha, beta)
ridge = np.linalg.solve(Phi.T @ Phi + alpha / beta * np.eye(6), Phi.T @ y)
assert np.allclose(m, ridge), "posterior mean must equal ridge with lambda = alpha / beta"
grid = np.linspace(-0.5, 1.5, 81)
mu, var = blr_predict(feats(grid, 5), m, S, beta)
assert np.all(var >= 1 / beta - 1e-12), "predictive variance includes the noise"
assert var[0] > 10 * var[40] and var[-1] > 10 * var[40], "uncertainty should grow far from the data"
print("PASS: posterior mean = ridge; predictive variance")
C = np.eye(12) / beta + Phi @ Phi.T / alpha
brute = -0.5 * (y @ np.linalg.solve(C, y) + np.linalg.slogdet(C)[1] + 12 * np.log(2 * np.pi))
assert abs(log_evidence(Phi, y, alpha, beta) - brute) < 1e-8, "evidence: y ~ N(0, I/beta + Phi Phi^T / alpha)"
print("PASS: log evidence matches the marginal Gaussian")
x2 = rng.random(15); y2 = np.sin(2 * np.pi * x2) + 0.25 * rng.normal(size=15)
ev = [log_evidence(feats(x2, d), y2, 5e-3, 16.0) for d in range(10)]
best = int(np.argmax(ev))
print("log evidence by degree:", np.round(ev, 1), "-> best degree", best)
assert 3 <= best <= 6 and ev[best] > ev[1] + 5 and ev[best] > ev[9], "evidence should prefer a moderate degree"
print("PASS: Occam's razor from the evidence")
`,
}
