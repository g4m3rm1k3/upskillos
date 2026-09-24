export default {
  filename: 'vae.py', packages: ['numpy'],
  title: 'The VAE objective: KL term, reparameterization and the ELBO, checked exactly.',
  intro: 'Implement the pieces of a VAE’s loss and check them where the truth is known. With a linear-Gaussian decoder x = Wz + noise, log p(x) has a closed form, so the ELBO can be compared with it exactly.',
  steps: [
    '`gaussian_kl(mu, logvar)` → per-example KL(N(μ, diag e^logvar) ‖ N(0, I)), summed over latent dimensions; `kl_grads(mu, logvar)` → `(dmu, dlogvar)`.',
    '`reparameterize(mu, logvar, eps)` → μ + e^(logvar/2)·ε; `reparam_grads(dz, logvar, eps)` → `(dmu, dlogvar)` given ∂L/∂z.',
    '`elbo_linear(x, W, s2, mu, logvar)` → E_q[log N(x; Wz, s2·I)] − KL(q ‖ N(0, I)) in closed form, for one example x (vector) and diagonal q.',
    '`log_evidence_linear(x, W, s2)` → log N(x; 0, WWᵀ + s2·I).',
  ],
  hints: [
    ['Expected log-likelihood', 'E_q[‖x − Wz‖²] = ‖x − Wμ‖² + Σₖ σₖ²‖Wₖ‖² (Wₖ = column k). So E_q[log N] = −(d/2) log(2π s2) − that / (2 s2).'],
    ['Reparameterization gradients', 'z = μ + e^(l/2)ε ⇒ ∂z/∂μ = 1 and ∂z/∂l = ½ e^(l/2) ε.'],
  ],
  starter: `import numpy as np

def gaussian_kl(mu, logvar):
    raise NotImplementedError

def kl_grads(mu, logvar):
    raise NotImplementedError

def reparameterize(mu, logvar, eps):
    raise NotImplementedError

def reparam_grads(dz, logvar, eps):
    raise NotImplementedError

def elbo_linear(x, W, s2, mu, logvar):
    raise NotImplementedError

def log_evidence_linear(x, W, s2):
    raise NotImplementedError
`,
  solution: `import numpy as np

def gaussian_kl(mu, logvar):
    return 0.5 * np.sum(np.exp(logvar) + mu ** 2 - 1 - logvar, axis=-1)

def kl_grads(mu, logvar):
    return mu, 0.5 * (np.exp(logvar) - 1)

def reparameterize(mu, logvar, eps):
    return mu + np.exp(0.5 * logvar) * eps

def reparam_grads(dz, logvar, eps):
    return dz, dz * 0.5 * np.exp(0.5 * logvar) * eps

def elbo_linear(x, W, s2, mu, logvar):
    d = len(x)
    sq = np.sum((x - W @ mu) ** 2) + np.sum(np.exp(logvar) * np.sum(W ** 2, axis=0))
    return -0.5 * d * np.log(2 * np.pi * s2) - sq / (2 * s2) - gaussian_kl(mu, logvar)

def log_evidence_linear(x, W, s2):
    C = W @ W.T + s2 * np.eye(len(x))
    _, logdet = np.linalg.slogdet(C)
    return -0.5 * (x @ np.linalg.solve(C, x) + logdet + len(x) * np.log(2 * np.pi))
`,
  solutionNote: 'The ELBO is a lower bound on log p(x); the gap is exactly the KL from q to the true posterior — zero only when the encoder is perfect.',
  checkSummary: 'KL values and gradients against formulas and finite differences; a Monte Carlo estimate of the KL through reparameterized samples matches the closed form; reparameterized gradients of E[z²] match the analytic 2μ and σ²; and for a linear-Gaussian decoder the ELBO never exceeds log p(x) and equals it at the true posterior.',
  checks: `
import numpy as np
rng = np.random.default_rng(53)
mu = rng.normal(size=(5, 3)); lv = rng.normal(size=(5, 3)) * 0.5
assert np.allclose(gaussian_kl(np.zeros(3), np.zeros(3)), 0)
dmu, dlv = kl_grads(mu, lv)
e = 1e-6
num_mu = (gaussian_kl(mu + e, lv) - gaussian_kl(mu - e, lv)) / (2 * e)
assert np.allclose(dmu.sum(1), num_mu, atol=1e-5)
num_lv = np.array([(gaussian_kl(mu[i], lv[i] + e * np.eye(3)[0]) - gaussian_kl(mu[i], lv[i] - e * np.eye(3)[0])) / (2 * e) for i in range(5)])
assert np.allclose(dlv[:, 0], num_lv, atol=1e-5)
m, l = np.array([0.7, -0.3]), np.array([0.2, -0.5])
eps = rng.normal(size=(200000, 2))
z = reparameterize(m, l, eps)
mc = np.mean(np.sum(-0.5 * eps ** 2 - 0.5 * l, axis=1) - np.sum(-0.5 * z ** 2, axis=1))
assert abs(mc - gaussian_kl(m, l)) < 0.01, "Monte Carlo KL through reparameterized samples must match the closed form"
gm, gl = reparam_grads(2 * z, l, eps)
assert np.allclose(gm.mean(0), 2 * m, atol=0.02) and np.allclose(gl.mean(0), np.exp(l), atol=0.02), "dE[z^2]/dmu = 2mu, dE[z^2]/dlogvar = sigma^2"
print("PASS: KL term, reparameterization and their gradients")
d, k, s2 = 6, 2, 0.3
Q, _ = np.linalg.qr(rng.normal(size=(d, k)))
W = Q * np.array([2.0, 1.2])
x = W @ rng.normal(size=k) + np.sqrt(s2) * rng.normal(size=d)
logp = log_evidence_linear(x, W, s2)
S_post = np.linalg.inv(np.eye(k) + W.T @ W / s2)
mu_post = S_post @ W.T @ x / s2
assert np.allclose(S_post, np.diag(np.diag(S_post))), "orthogonal columns give a diagonal posterior"
best = elbo_linear(x, W, s2, mu_post, np.log(np.diag(S_post)))
assert abs(best - logp) < 1e-8, "at the true posterior, ELBO = log p(x)"
for _ in range(50):
    assert elbo_linear(x, W, s2, mu_post + rng.normal(size=k), rng.normal(size=k)) <= logp + 1e-9
print(f"PASS: ELBO <= log p(x) = {logp:.3f}, with equality at the true posterior")
`,
}
