export default {
  filename: 'generative.py', packages: ['numpy'],
  title: 'Diffusion equations and GAN losses, checked against theory.',
  intro: 'Implement the DDPM noise schedule, forward sampling, the reverse-step mean and the noise-prediction loss, plus the discriminator and generator losses of a GAN with their gradients. The checks verify the forward marginals, the exact posterior mean, the optimal discriminator, and why the non-saturating loss is preferred.',
  steps: [
    '`schedule(T, b0, b1)` → `(betas, alphas, abar)` with linearly spaced betas and ᾱ the cumulative product of α = 1 − β.',
    '`q_sample(x0, t, eps, abar)` → √ᾱ_t·x0 + √(1 − ᾱ_t)·eps.',
    '`reverse_mean(xt, t, eps_hat, betas, alphas, abar)` → (x_t − β_t/√(1 − ᾱ_t)·ε̂)/√α_t.',
    '`d_loss(real_logits, fake_logits)` → mean of −log σ(real) − log(1 − σ(fake)); `g_loss_grad(fake_logits, saturating)` → gradient with respect to the fake logits of the generator loss (mean over the batch).',
  ],
  hints: [
    ['Stable log-sigmoid', '−log σ(ℓ) = log(1 + e^(−ℓ)) = np.logaddexp(0, −ℓ); −log(1 − σ(ℓ)) = np.logaddexp(0, ℓ).'],
    ['Generator gradients', 'Saturating loss mean log(1 − σ(ℓ)) → gradient −σ(ℓ)/n. Non-saturating loss mean −log σ(ℓ) → gradient (σ(ℓ) − 1)/n.'],
  ],
  starter: `import numpy as np

def schedule(T, b0, b1):
    raise NotImplementedError

def q_sample(x0, t, eps, abar):
    raise NotImplementedError

def reverse_mean(xt, t, eps_hat, betas, alphas, abar):
    raise NotImplementedError

def d_loss(real_logits, fake_logits):
    raise NotImplementedError

def g_loss_grad(fake_logits, saturating):
    raise NotImplementedError
`,
  solution: `import numpy as np

def schedule(T, b0, b1):
    betas = np.linspace(b0, b1, T)
    alphas = 1 - betas
    return betas, alphas, np.cumprod(alphas)

def q_sample(x0, t, eps, abar):
    return np.sqrt(abar[t]) * x0 + np.sqrt(1 - abar[t]) * eps

def reverse_mean(xt, t, eps_hat, betas, alphas, abar):
    return (xt - betas[t] / np.sqrt(1 - abar[t]) * eps_hat) / np.sqrt(alphas[t])

def d_loss(real_logits, fake_logits):
    return float(np.mean(np.logaddexp(0, -real_logits)) + np.mean(np.logaddexp(0, fake_logits)))

def g_loss_grad(fake_logits, saturating):
    s = 1 / (1 + np.exp(-fake_logits))
    n = len(fake_logits)
    return -s / n if saturating else (s - 1) / n
`,
  solutionNote: 'Diffusion training is regression on noise; GAN training is two coupled classification problems — the equations are short, the dynamics are what differ.',
  checkSummary: 'The forward process has mean √ᾱ_t·x₀ and variance 1 − ᾱ_t; with the true noise, the reverse mean equals the exact posterior mean of q(x_{t−1} | x_t, x₀); a logistic discriminator trained to minimize the D loss on two Gaussians approaches p_data/(p_data + p_g); and the non-saturating generator gradient is hundreds of times larger than the saturating one when the discriminator is confident.',
  checks: `
import numpy as np
rng = np.random.default_rng(54)
betas, alphas, abar = schedule(40, 1e-3, 0.25)
assert np.allclose(abar, np.cumprod(1 - np.linspace(1e-3, 0.25, 40)))
x0 = 1.5; t = 12
samples = q_sample(x0, t, rng.normal(size=200000), abar)
assert abs(samples.mean() - np.sqrt(abar[t]) * x0) < 0.01 and abs(samples.var() - (1 - abar[t])) < 0.01
print("PASS: forward marginals")
eps = rng.normal(size=1000); xt = q_sample(x0, t, eps, abar)
exact = (np.sqrt(abar[t - 1]) * betas[t] / (1 - abar[t])) * x0 + (np.sqrt(alphas[t]) * (1 - abar[t - 1]) / (1 - abar[t])) * xt
assert np.allclose(reverse_mean(xt, t, eps, betas, alphas, abar), exact), "with the true noise, the reverse mean is the exact posterior mean"
print("PASS: reverse step matches the exact posterior mean")
real = rng.normal(1.0, 1.0, 4000); fake = rng.normal(-1.0, 1.0, 4000)
w, b = 0.0, 0.0
for _ in range(3000):
    sr, sf = 1 / (1 + np.exp(-(w * real + b))), 1 / (1 + np.exp(-(w * fake + b)))
    gw = np.mean((sr - 1) * real) + np.mean(sf * fake); gb = np.mean(sr - 1) + np.mean(sf)
    w -= 0.5 * gw; b -= 0.5 * gb
xs = np.array([-1.0, 0.0, 0.7])
pd, pg = np.exp(-(xs - 1) ** 2 / 2), np.exp(-(xs + 1) ** 2 / 2)
assert np.allclose(1 / (1 + np.exp(-(w * xs + b))), pd / (pd + pg), atol=0.03), "the trained discriminator approaches D* = p_data/(p_data + p_g)"
assert abs(d_loss(w * real + b, w * fake + b) - (np.mean(np.logaddexp(0, -(w * real + b))) + np.mean(np.logaddexp(0, w * fake + b)))) < 1e-12
print(f"PASS: discriminator converges to the density ratio (w = {w:.3f}, theory 2)")
confident = np.full(10, -6.0)
sat, non = np.abs(g_loss_grad(confident, True)).mean(), np.abs(g_loss_grad(confident, False)).mean()
assert non > 300 * sat, "non-saturating gradients should dwarf saturating ones when D is confident"
print(f"PASS: saturation (non-saturating / saturating gradient ratio {non / sat:.0f})")
`,
}
