export default {
  filename: 'robustness.py', packages: ['numpy'],
  title: 'Attacks, reweighting and alignment, checked on problems with known answers.',
  intro: 'Implement FGSM for a logistic model, the PGD projection, the effective sample size and weighted least squares for covariate shift, black-box shift estimation for label shift with several classes, and CORAL alignment. The checks confirm the ε‖w‖₁ law for linear models, that importance weighting fixes a misspecified fit under shift, that BBSE recovers a changed class balance, and that CORAL matches means and covariances exactly.',
  steps: [
    '`fgsm_logistic(w, b, X, y, eps)` → adversarial inputs X + ε·sign(∇ₓ loss) for the logistic loss with labels y ∈ {0, 1} (no clipping).',
    '`project(x_adv, x, eps)` → x_adv clipped into the box [x − ε, x + ε] and into [0, 1].',
    '`effective_sample_size(w)` → (Σw)²/Σw².',
    '`weighted_lstsq(X, y, w)` → coefficients minimizing Σ wᵢ(yᵢ − xᵢᵀβ)².',
    '`bbse(C, mu)` → estimated deployment class proportions, where C[i, j] = P(ŷ = i | y = j) and mu[i] is the share of deployment points predicted as class i. Clip negatives to zero and renormalize.',
    '`coral(Xs, Xt)` → the source features whitened by their own covariance, re-coloured by the target covariance, and shifted to the target mean.',
  ],
  hints: [
    ['Gradient of the logistic loss with respect to x', 'For p = σ(wᵀx + b), ∂L/∂x = (p − y)·w.'],
    ['Matrix square roots', 'For a symmetric positive definite matrix S = V diag(λ) Vᵀ, S^(±1/2) = V diag(λ^(±1/2)) Vᵀ (np.linalg.eigh).'],
  ],
  starter: `import numpy as np

def fgsm_logistic(w, b, X, y, eps):
    raise NotImplementedError

def project(x_adv, x, eps):
    raise NotImplementedError

def effective_sample_size(w):
    raise NotImplementedError

def weighted_lstsq(X, y, w):
    raise NotImplementedError

def bbse(C, mu):
    raise NotImplementedError

def coral(Xs, Xt):
    raise NotImplementedError
`,
  solution: `import numpy as np

def fgsm_logistic(w, b, X, y, eps):
    p = 1 / (1 + np.exp(-(X @ w + b)))
    grad = (p - y)[:, None] * w[None, :]
    return X + eps * np.sign(grad)

def project(x_adv, x, eps):
    return np.clip(np.clip(x_adv, x - eps, x + eps), 0, 1)

def effective_sample_size(w):
    w = np.asarray(w, float)
    return w.sum() ** 2 / (w ** 2).sum()

def weighted_lstsq(X, y, w):
    s = np.sqrt(w)
    return np.linalg.lstsq(X * s[:, None], y * s, rcond=None)[0]

def bbse(C, mu):
    pi = np.linalg.solve(C, mu)
    pi = np.clip(pi, 0, None)
    return pi / pi.sum()

def _power(S, p):
    lam, V = np.linalg.eigh(S)
    return V @ np.diag(lam ** p) @ V.T

def coral(Xs, Xt):
    ms, mt = Xs.mean(0), Xt.mean(0)
    Cs, Ct = np.cov(Xs, rowvar=False), np.cov(Xt, rowvar=False)
    return (Xs - ms) @ _power(Cs, -0.5) @ _power(Ct, 0.5) + mt
`,
  solutionNote: 'Each correction assumes something stayed the same: the loss surface near x (attacks), p(y | x) (covariate shift), p(x | y) (label shift), or the class structure up to a linear map (CORAL). Knowing which assumption you are relying on is most of the work.',
  checkSummary: 'FGSM moves every logit by exactly ε‖w‖₁ against the true label, and cuts accuracy far more than random noise of the same size; projection stays in both boxes; weighting by the true density ratio makes a misspecified line fit the test region, at the cost of effective sample size; BBSE recovers a three-class deployment prior from predictions alone; CORAL output has exactly the target mean and covariance.',
  checks: `
import numpy as np
rng = np.random.default_rng(61)
d = 100
w = rng.normal(size=d) * 0.3; b = 0.0
X = rng.normal(size=(3000, d)); y = (X @ w + 0.5 * rng.normal(size=3000) > 0).astype(float)
Xa = fgsm_logistic(w, b, X, y, 0.05)
dz = (Xa - X) @ w
sgn = np.where(y == 1, -1, 1)
assert np.allclose(dz * sgn, 0.05 * np.abs(w).sum()), "each logit moves by eps*||w||_1 toward the wrong class"
acc = lambda Z: np.mean(((Z @ w + b) > 0) == (y == 1))
noise = X + 0.05 * rng.choice([-1, 1], size=X.shape)
print(f"accuracy: clean {acc(X):.3f}, random noise {acc(noise):.3f}, FGSM {acc(Xa):.3f}")
assert acc(Xa) < acc(noise) - 0.15
x = np.array([0.4, 0.95, 0.02]); p = project(np.array([0.57, 1.04, -0.2]), x, 0.1)
assert np.allclose(p, [0.5, 1.0, 0.0])
print("PASS: FGSM follows the eps*||w||_1 law; projection")

f = lambda x: np.sin(1.5 * x) + 0.5 * x
xtr = rng.normal(0, 1, 300); ytr = f(xtr) + 0.2 * rng.normal(size=300)
xte = rng.normal(1.5, 0.5, 2000); yte = f(xte) + 0.2 * rng.normal(size=2000)
A = lambda x: np.column_stack([np.ones_like(x), x])
wt = np.exp(-0.5 * ((xtr - 1.5) / 0.5) ** 2) / 0.5 / np.exp(-0.5 * xtr ** 2)
plain = np.mean((A(xte) @ weighted_lstsq(A(xtr), ytr, np.ones(300)) - yte) ** 2)
weighted = np.mean((A(xte) @ weighted_lstsq(A(xtr), ytr, wt) - yte) ** 2)
ess = effective_sample_size(wt)
print(f"test MSE unweighted {plain:.3f}, importance-weighted {weighted:.3f}; effective sample size {ess:.0f} of 300")
assert weighted < plain / 2 and ess < 150 and abs(effective_sample_size([3, 1, 1, 1]) - 3) < 1e-12
print("PASS: importance weighting under covariate shift")

C = np.array([[0.8, 0.1, 0.1], [0.15, 0.8, 0.1], [0.05, 0.1, 0.8]])
true_pi = np.array([0.6, 0.3, 0.1])
labels = rng.choice(3, size=20000, p=true_pi)
preds = np.array([rng.choice(3, p=C[:, j]) for j in labels])
mu = np.bincount(preds, minlength=3) / preds.size
est = bbse(C, mu)
print("BBSE estimate", np.round(est, 3), "| true", true_pi, "| naive predicted shares", np.round(mu, 3))
assert np.allclose(est, true_pi, atol=0.02) and not np.allclose(mu, true_pi, atol=0.02)
print("PASS: black-box shift estimation")

Xs = rng.normal(size=(500, 2)) @ np.array([[1.0, 0.3], [0.0, 0.5]])
Xt = rng.normal(size=(400, 2)) @ np.array([[0.4, -0.8], [1.2, 0.2]]) + np.array([2.0, -1.0])
Z = coral(Xs, Xt)
assert np.allclose(Z.mean(0), Xt.mean(0)) and np.allclose(np.cov(Z, rowvar=False), np.cov(Xt, rowvar=False))
print("PASS: CORAL matches the target mean and covariance")
`,
}
