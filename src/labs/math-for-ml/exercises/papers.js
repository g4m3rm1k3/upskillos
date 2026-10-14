// Exercises for the paper walkthroughs: each one implements a paper's key equation and checks a claim the
// lesson proved (or broke) numerically.
import { checks, py } from './checks.js'

const SOLVE = py`def solve(A, b):
    """Gaussian elimination with partial pivoting."""
    n = len(A)
    M = [list(row) + [bi] for row, bi in zip(A, b)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            M[r] = [a - f * q for a, q in zip(M[r], M[c])]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x
`

export const EXERCISES = {
  'paper-dropout': {
    prompt: py`Check section 9.1 numerically. \`solve\` is given. Write \`sampled_loss(X, y, w, p, samples, rng)\` (average $\|\mathbf y - (R * X)\mathbf w\|^2$ over random keep-masks, each entry kept with probability \`p\`), \`closed_form(X, y, w, p)\` ($\|\mathbf y - pX\mathbf w\|^2 + p(1-p)\|\Gamma\mathbf w\|^2$), \`dropout_weights(X, y, p)\` (solve $(p^2X^\top X + p(1-p)\Gamma^2)\mathbf w = pX^\top\mathbf y$) and \`ridge_gamma(X, y, lam)\` (solve $(X^\top X + \lambda\Gamma^2)\tilde{\mathbf w} = X^\top\mathbf y$). The checks confirm the sampled loss matches the closed form, and that $p\,\mathbf w$ equals ridge with $\lambda = (1-p)/p$.`,
    starter: SOLVE + py`
import random

def sampled_loss(X, y, w, p, samples, rng):
    ...

def closed_form(X, y, w, p):
    ...

def dropout_weights(X, y, p):
    ...

def ridge_gamma(X, y, lam):
    ...
`,
    solution: SOLVE + py`
import random

def sampled_loss(X, y, w, p, samples, rng):
    total = 0.0
    for _ in range(samples):
        for row, t in zip(X, y):
            pred = sum(x * wj for x, wj in zip(row, w) if rng.random() < p)
            total += (t - pred) ** 2
    return total / samples

def gram(X):
    D = len(X[0])
    return [[sum(r[i] * r[j] for r in X) for j in range(D)] for i in range(D)]

def closed_form(X, y, w, p):
    fit = sum((t - p * sum(x * wj for x, wj in zip(row, w))) ** 2 for row, t in zip(X, y))
    G = gram(X)
    return fit + p * (1 - p) * sum(G[j][j] * w[j] ** 2 for j in range(len(w)))

def dropout_weights(X, y, p):
    G, D = gram(X), len(X[0])
    A = [[p * p * G[i][j] + (p * (1 - p) * G[i][i] if i == j else 0.0) for j in range(D)] for i in range(D)]
    return solve(A, [p * sum(r[i] * t for r, t in zip(X, y)) for i in range(D)])

def ridge_gamma(X, y, lam):
    G, D = gram(X), len(X[0])
    A = [[G[i][j] + (lam * G[i][i] if i == j else 0.0) for j in range(D)] for i in range(D)]
    return solve(A, [sum(r[i] * t for r, t in zip(X, y)) for i in range(D)])
`,
    checks: checks(py`
X, y = [[1.0, 2.0, 0.5], [2.0, 0.5, 1.0], [3.0, 3.0, -1.0], [0.5, 2.5, 2.0]], [5.0, 3.0, 9.0, 6.0]
for p, w in ((0.5, [1.0, 1.5, 0.2]), (0.8, [0.3, -0.4, 2.0])):
    s, c = sampled_loss(X, y, w, p, 20000, random.Random(1)), closed_form(X, y, w, p)
    assert abs(s - c) < 0.03 * c, f"p={p}: sampled {s:.4f} should be close to the closed form {c:.4f}"
expect(closed_form(X, y, [1.0, 1.0, 1.0], 1.0), sum((t - sum(r)) ** 2 for r, t in zip(X, y)), "closed_form with p = 1 is plain least squares")
for p in (0.3, 0.5, 0.9):
    w = dropout_weights(X, y, p)
    expect([p * a for a in w], ridge_gamma(X, y, (1 - p) / p), f"p·w against ridge with λ = (1−p)/p at p = {p}", 1e-7)
`),
    hints: ['$\\Gamma^2$ is just the diagonal of $X^\\top X$: entry $j$ is $\\sum_n X_{nj}^2$.', 'Use `rng.random() < p` once per entry for the keep-coin.'],
  },

  'paper-word2vec': {
    prompt: py`Watch skip-gram with negative sampling land on the PMI. Write \`count_pairs(pairs)\`: a dict of pair counts, a dict of word counts, a dict of context counts, and the total. Then \`pmi(pairs, w, c)\`, and \`ascend(n_pair, n_noise, steps, rate)\`: gradient ascent from \`x = 0\` on $\ell(x) = n_{\text{pair}}\log\sigma(x) + n_{\text{noise}}\log\sigma(-x)$, using $\ell'(x) = n_{\text{pair}}\sigma(-x) - n_{\text{noise}}\sigma(x)$. Finally \`positive_posterior(ratios)\`, InfoNCE's eq. (5). The checks confirm the ascent ends at PMI $-\log k$.`,
    starter: py`import math

def count_pairs(pairs):
    ...

def pmi(pairs, w, c):
    ...

def ascend(n_pair, n_noise, steps=5000, rate=0.1):
    ...

def positive_posterior(ratios):
    ...
`,
    solution: py`import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def count_pairs(pairs):
    pc, wc, cc = {}, {}, {}
    for w, c in pairs:
        pc[(w, c)] = pc.get((w, c), 0) + 1
        wc[w] = wc.get(w, 0) + 1
        cc[c] = cc.get(c, 0) + 1
    return pc, wc, cc, len(pairs)

def pmi(pairs, w, c):
    pc, wc, cc, total = count_pairs(pairs)
    return math.log(pc[(w, c)] * total / (wc[w] * cc[c]))

def ascend(n_pair, n_noise, steps=5000, rate=0.1):
    x = 0.0
    for _ in range(steps):
        x += rate * (n_pair * sigmoid(-x) - n_noise * sigmoid(x))
    return x

def positive_posterior(ratios):
    total = sum(ratios)
    return [r / total for r in ratios]
`,
    checks: checks(py`
text = "the cat sat on the mat the dog sat on the log the cat saw the dog".split()
pairs = [(text[i], text[j]) for i in range(len(text)) for j in (i - 1, i + 1) if 0 <= j < len(text)]
pc, wc, cc, total = count_pairs(pairs)
expect(total, 2 * (len(text) - 1), "the number of pairs")
expect(pc[("sat", "on")], 2, "count of (sat, on)")
expect(pmi(pairs, "sat", "on"), math.log(2 * total / (wc["sat"] * cc["on"])), "PMI of (sat, on)")
for (w, c), k in ((("sat", "on"), 2), (("the", "cat"), 5), (("cat", "sat"), 1)):
    n_noise = k * wc[w] * cc[c] / total
    expect(ascend(pc[(w, c)], n_noise), pmi(pairs, w, c) - math.log(k), f"the trained score of ({w}, {c}) with k = {k}", 1e-6)
post = positive_posterior([2.0, 0.5, 0.5, 1.0])
expect(post, [0.5, 0.125, 0.125, 0.25], "positive_posterior([2, 0.5, 0.5, 1])")
`),
    hints: ['`d.get(key, 0) + 1` counts without needing to set up the dictionary first.', 'At the top of the hill $\\ell\'(x) = 0$, so a small `rate` and enough steps settle there.'],
  },

  'paper-vae': {
    prompt: py`Measure section 2.2's "very high variance". For $z \sim \mathcal N(\mu, \sigma^2)$ and $f(z) = z^2$, write \`score_estimates(mu, sigma, n, rng)\` (each $z^2(z - \mu)/\sigma^2$) and \`reparam_estimates(mu, sigma, n, rng)\` (each $2(\mu + \sigma\varepsilon)$), drawing with \`rng.gauss(0, 1)\`, plus \`variance(xs)\`. Then \`estimator_a(x, mu, sigma, eps)\` for the toy model ($z \sim \mathcal N(0, 1)$, $x \mid z \sim \mathcal N(z, 1)$): $\log p(z) + \log p(x \mid z) - \log q(z)$ at $z = \mu + \sigma\varepsilon$. The checks compare with the exact variances 30 and $4\sigma^2$, and confirm A has zero variance at the true posterior.`,
    starter: py`import math, random

def score_estimates(mu, sigma, n, rng):
    ...

def reparam_estimates(mu, sigma, n, rng):
    ...

def variance(xs):
    ...

def estimator_a(x, mu, sigma, eps):
    ...
`,
    solution: py`import math, random

def score_estimates(mu, sigma, n, rng):
    out = []
    for _ in range(n):
        z = mu + sigma * rng.gauss(0, 1)
        out.append(z * z * (z - mu) / sigma ** 2)
    return out

def reparam_estimates(mu, sigma, n, rng):
    return [2 * (mu + sigma * rng.gauss(0, 1)) for _ in range(n)]

def variance(xs):
    m = sum(xs) / len(xs)
    return sum((v - m) ** 2 for v in xs) / len(xs)

def log_normal(x, mean, var):
    return -0.5 * math.log(2 * math.pi * var) - (x - mean) ** 2 / (2 * var)

def estimator_a(x, mu, sigma, eps):
    z = mu + sigma * eps
    return log_normal(z, 0, 1) + log_normal(x, z, 1) - log_normal(z, mu, sigma ** 2)
`,
    checks: checks(py`
s = score_estimates(1.0, 1.0, 50000, random.Random(3))
r = reparam_estimates(1.0, 1.0, 50000, random.Random(3))
assert abs(sum(s) / len(s) - 2) < 0.1 and abs(sum(r) / len(r) - 2) < 0.05, "both estimators should average to 2μ = 2"
assert abs(variance(s) - 30) < 3, f"the score-function variance should be near 30, got {variance(s):.2f}"
assert abs(variance(r) - 4) < 0.2, f"the reparameterised variance should be near 4σ² = 4, got {variance(r):.3f}"
assert abs(variance(reparam_estimates(0.5, 0.3, 50000, random.Random(4))) - 4 * 0.09) < 0.02, "reparameterised variance is 4σ²"
vals = [estimator_a(1.0, 0.5, math.sqrt(0.5), e) for e in (-2.0, -0.3, 0.0, 1.1, 2.5)]
expect(vals, [-0.5 * math.log(4 * math.pi) - 0.25] * 5, "estimator A at the true posterior: always log p(x)")
`),
    hints: ['$\\log p(x)$ for the toy model is $\\log\\mathcal N(1; 0, 2) = -\\frac12\\log(4\\pi) - \\frac14$.', 'Draw $z$ as `mu + sigma * rng.gauss(0, 1)`.'],
  },

  'paper-adam': {
    prompt: py`Test section 2.1's bounds. Write \`adam_steps(grads, alpha=1.0, b1=0.9, b2=0.999, eps=1e-8)\` (Algorithm 1; return each step $\theta_t - \theta_{t-1}$) and \`adamax_steps(grads, alpha=1.0, b1=0.9, b2=0.999)\` (Algorithm 2). Then build sequences: \`beats_adam()\`, gradients whose final Adam step exceeds $3.5\alpha$, past the paper's bound of about $3.16\alpha$; and \`beats_adamax()\`, gradients whose final AdaMax step exceeds $1.005\alpha$. The checks also confirm a constant gradient steps exactly $\alpha$ whatever its size.`,
    starter: py`import math

def adam_steps(grads, alpha=1.0, b1=0.9, b2=0.999, eps=1e-8):
    ...

def adamax_steps(grads, alpha=1.0, b1=0.9, b2=0.999):
    ...

def beats_adam():
    ...

def beats_adamax():
    ...
`,
    solution: py`import math

def adam_steps(grads, alpha=1.0, b1=0.9, b2=0.999, eps=1e-8):
    m = v = 0.0
    out = []
    for t, g in enumerate(grads, start=1):
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g * g
        out.append(-alpha * (m / (1 - b1 ** t)) / (math.sqrt(v / (1 - b2 ** t)) + eps))
    return out

def adamax_steps(grads, alpha=1.0, b1=0.9, b2=0.999):
    m = u = 0.0
    out = []
    for t, g in enumerate(grads, start=1):
        m = b1 * m + (1 - b1) * g
        u = max(b2 * u, abs(g))
        out.append(-(alpha / (1 - b1 ** t)) * m / u)
    return out

def beats_adam():
    return [0.0] * 3000 + [(0.999 / 0.9) ** i for i in range(60)]

def beats_adamax():
    return [0.999 ** i for i in range(400)]
`,
    checks: checks(py`
for g in (1.0, 1000.0, -0.003):
    expect(adam_steps([g] * 5)[-1], -math.copysign(1.0, g), f"constant gradient {g}: the step", 1e-5)
spike = [0.0] * 999 + [1.0]
expect(abs(adam_steps(spike)[-1]), 0.1 / math.sqrt(0.001) * math.sqrt(1 - 0.999 ** 1000) / (1 - 0.9 ** 1000), "a lone spike after 999 zeros", 1e-6)
seq = beats_adam()
assert all(math.isfinite(s) for s in adam_steps(seq)), "Adam's steps should all be finite"
assert abs(adam_steps(seq)[-1]) > 3.5, f"the final Adam step is {abs(adam_steps(seq)[-1]):.3f}α; it should exceed 3.5α"
seq = beats_adamax()
assert abs(adamax_steps(seq)[-1]) > 1.005, f"the final AdaMax step is {abs(adamax_steps(seq)[-1]):.5f}α; it should exceed 1.005α"
assert abs(adamax_steps(seq)[-1]) < 0.1 / (1 - 0.9 / 0.999) + 1e-9, "AdaMax can't exceed (1−β₁)/(1−β₁/β₂)"
`),
    hints: ['The worst case grows each gradient by $\\beta_2/\\beta_1 \\approx 1.11$ per step; start after a long run of zeros so the bias corrections are near 1.', 'AdaMax divides by $u_t$, so its sequence must not start with zeros. Its worst case is a gradient that shrinks by a factor $\\beta_2$ each step, so every past gradient is $1/\\beta_2$ times the next.'],
  },

  'paper-batchnorm': {
    prompt: py`Implement batch norm's backward pass and check it. Write \`bn_forward(xs, gamma, beta, eps=1e-5)\` (Algorithm 1) and \`bn_backward(xs, dys, gamma, eps=1e-5)\` returning the list $\partial\ell/\partial x_i$ (from the paper's six equations, or the one-line form). The checks compare with a finite-difference measurement of $\ell = \sum_i d_i y_i$, and confirm the gradient sums to zero.`,
    starter: py`import math

def bn_forward(xs, gamma, beta, eps=1e-5):
    ...

def bn_backward(xs, dys, gamma, eps=1e-5):
    ...
`,
    solution: py`import math

def bn_forward(xs, gamma, beta, eps=1e-5):
    m = len(xs)
    mu = sum(xs) / m
    s = math.sqrt(sum((x - mu) ** 2 for x in xs) / m + eps)
    return [gamma * (x - mu) / s + beta for x in xs]

def bn_backward(xs, dys, gamma, eps=1e-5):
    m = len(xs)
    mu = sum(xs) / m
    s = math.sqrt(sum((x - mu) ** 2 for x in xs) / m + eps)
    xh = [(x - mu) / s for x in xs]
    g_sum, gx = sum(dys), sum(g * h for g, h in zip(dys, xh))
    return [gamma / (m * s) * (m * g - g_sum - h * gx) for g, h in zip(dys, xh)]
`,
    checks: checks(py`
xs, d, gamma = [1.0, 2.0, 4.0, 7.0, -1.5], [0.5, -1.0, 2.0, 0.1, 0.7], 1.3
y = bn_forward(xs, gamma, 0.2)
expect(sum(y) / len(y), 0.2, "the outputs' mean is β", 1e-9)
loss = lambda v: sum(di * yi for di, yi in zip(d, bn_forward(v, gamma, 0.2)))
grad, h = bn_backward(xs, d, gamma), 1e-6
for i in range(len(xs)):
    up, down = list(xs), list(xs)
    up[i] += h
    down[i] -= h
    expect(grad[i], (loss(up) - loss(down)) / (2 * h), f"∂ℓ/∂x{i + 1} against finite differences", 1e-5)
expect(sum(grad), 0.0, "the gradients add up to zero", 1e-9)
`),
    hints: ['Recompute $\\mu$, $s = \\sqrt{\\sigma^2 + \\epsilon}$ and $\\hat x$ inside the backward pass.', 'The one-line form: $\\frac{\\gamma}{ms}(mg_i - \\sum g - \\hat x_i\\sum g\\hat x)$.'],
  },

  'paper-resnet': {
    prompt: py`Check the derivation $\mathbb E\|\mathbf g_0\|^2 = s^{2L}$ (plain) and $(1 + s^2)^L$ (residual). Write \`grad_norm_sq(depth, width, s, residual, rng)\`: draw \`depth\` matrices with entries \`rng.gauss(0, s / math.sqrt(width))\`, start from a gradient of length 1, pass it down through each layer as $W^\top\mathbf g$ (plain) or $\mathbf g + W^\top\mathbf g$ (residual), and return $\|\mathbf g\|^2$. Then \`average(depth, width, s, residual, trials, seed)\`: the mean over \`trials\` runs from one \`random.Random(seed)\`.`,
    starter: py`import math, random

def grad_norm_sq(depth, width, s, residual, rng):
    ...

def average(depth, width, s, residual, trials, seed=0):
    ...
`,
    solution: py`import math, random

def grad_norm_sq(depth, width, s, residual, rng):
    layers = [[[rng.gauss(0, s / math.sqrt(width)) for _ in range(width)] for _ in range(width)] for _ in range(depth)]
    g = [1 / math.sqrt(width)] * width
    for W in reversed(layers):
        back = [sum(W[i][j] * g[i] for i in range(width)) for j in range(width)]
        g = [a + b for a, b in zip(g, back)] if residual else back
    return sum(a * a for a in g)

def average(depth, width, s, residual, trials, seed=0):
    rng = random.Random(seed)
    return sum(grad_norm_sq(depth, width, s, residual, rng) for _ in range(trials)) / trials
`,
    checks: checks(py`
for s in (0.5, 0.8):
    plain, res = average(3, 6, s, False, 3000, 1), average(3, 6, s, True, 3000, 2)
    assert abs(plain / s ** 6 - 1) < 0.15, f"s={s}: plain average {plain:.4f} should be near s^6 = {s ** 6:.4f}"
    assert abs(res / (1 + s * s) ** 3 - 1) < 0.1, f"s={s}: residual average {res:.4f} should be near (1+s²)^3 = {(1 + s * s) ** 3:.4f}"
expect(grad_norm_sq(5, 4, 0.0, True, random.Random(0)), 1.0, "with zero weights the residual stack passes the gradient unchanged", 1e-12)
expect(grad_norm_sq(5, 4, 0.0, False, random.Random(0)), 0.0, "and the plain stack loses it entirely")
`),
    hints: ['`back[j]` is $\\sum_i W_{ij}g_i$, column $j$ of $W$ dotted with $\\mathbf g$.', 'Start with `g = [1 / math.sqrt(width)] * width`, which has length 1.'],
  },

  'paper-transformer': {
    prompt: py`Write \`lrate(step, d_model=512, warmup=4000)\` (eq. 3), \`peak_step(d_model, warmup, last)\`: the step from 1 to \`last\` with the largest rate, \`smoothed(k, correct, eps=0.1)\` (the label-smoothed target) and \`cross_entropy(q, p)\`. The checks confirm the peak is at the warm-up length with value $1/\sqrt{d_{\text{model}}\cdot warmup}$, and that no model beats $H(q)$ on smoothed targets.`,
    starter: py`import math, random

def lrate(step, d_model=512, warmup=4000):
    ...

def peak_step(d_model, warmup, last):
    ...

def smoothed(k, correct, eps=0.1):
    ...

def cross_entropy(q, p):
    ...
`,
    solution: py`import math, random

def lrate(step, d_model=512, warmup=4000):
    return d_model ** -0.5 * min(step ** -0.5, step * warmup ** -1.5)

def peak_step(d_model, warmup, last):
    return max(range(1, last + 1), key=lambda s: lrate(s, d_model, warmup))

def smoothed(k, correct, eps=0.1):
    return [(1 - eps) * (i == correct) + eps / k for i in range(k)]

def cross_entropy(q, p):
    return -sum(a * math.log(b) for a, b in zip(q, p) if a > 0)
`,
    checks: checks(py`
for d, w in ((512, 4000), (256, 1000), (1024, 2500)):
    expect(peak_step(d, w, 3 * w), w, f"the peak step for d_model={d}, warmup={w}")
    expect(lrate(w, d, w), 1 / math.sqrt(d * w), "the peak value", 1e-12)
expect(lrate(100000) / lrate(4000), math.sqrt(4000 / 100000), "the decay after the peak", 1e-12)
q = smoothed(10, 3)
expect(sum(q), 1.0, "a smoothed target adds up to 1", 1e-12)
expect(q[3], 0.91, "the correct class gets 1 − ε + ε/K", 1e-12)
rng = random.Random(0)
for _ in range(200):
    raw = [rng.random() + 1e-3 for _ in range(10)]
    p = [r / sum(raw) for r in raw]
    assert cross_entropy(q, p) >= cross_entropy(q, q) - 1e-12, "no model should beat H(q) on smoothed targets"
`),
    hints: ['`max(range(...), key=...)` returns the argument with the largest key.', 'The correct class gets $(1 - \\epsilon) + \\epsilon/K$; every other class $\\epsilon/K$.'],
  },

  'paper-ppo': {
    prompt: py`Implement generalised advantage estimation. Write \`td_errors(rewards, values, gamma)\` (\`values\` has one more entry than \`rewards\`), \`gae(rewards, values, gamma, lam)\` computed backwards with $\hat A_t = \delta_t + \gamma\lambda\hat A_{t+1}$, and \`eq10(rewards, values, gamma, t)\`, eq. (10) with the corrected exponents. The checks confirm $\lambda = 1$ gives eq. (10), $\lambda = 0$ gives $\delta_t$, and the recursion matches the sum $\sum_k(\gamma\lambda)^k\delta_{t+k}$.`,
    starter: py`def td_errors(rewards, values, gamma):
    ...

def gae(rewards, values, gamma=0.99, lam=0.95):
    ...

def eq10(rewards, values, gamma, t):
    ...
`,
    solution: py`def td_errors(rewards, values, gamma):
    return [r + gamma * values[t + 1] - values[t] for t, r in enumerate(rewards)]

def gae(rewards, values, gamma=0.99, lam=0.95):
    deltas = td_errors(rewards, values, gamma)
    out, running = [0.0] * len(deltas), 0.0
    for t in reversed(range(len(deltas))):
        running = deltas[t] + gamma * lam * running
        out[t] = running
    return out

def eq10(rewards, values, gamma, t):
    T = len(rewards)
    return -values[t] + sum(gamma ** k * rewards[t + k] for k in range(T - t)) + gamma ** (T - t) * values[T]
`,
    checks: checks(py`
R, V = [0.0, 1.0, 0.0, -0.5, 2.0, 0.0, 1.0], [0.3, 0.8, 0.2, 0.1, 1.2, 0.4, 0.9, 0.6]
expect(td_errors(R, V, 0.9)[0], 0.0 + 0.9 * 0.8 - 0.3, "δ₀")
expect(gae(R, V, 0.9, 1.0), [eq10(R, V, 0.9, t) for t in range(len(R))], "λ = 1 against eq. (10)", 1e-12)
expect(gae(R, V, 0.9, 0.0), td_errors(R, V, 0.9), "λ = 0 against the TD errors", 1e-12)
d = td_errors(R, V, 0.99)
for t in range(len(R)):
    expect(gae(R, V, 0.99, 0.95)[t], sum((0.99 * 0.95) ** k * d[t + k] for k in range(len(R) - t)), f"Â{t} against the sum", 1e-12)
`),
    hints: ['Start `running` at 0 and walk `t` from the last step down to 0.', 'In eq. (10), $r_{t+k}$ carries $\\gamma^k$ for $k = 0, \\dots, T - t - 1$, and $V(s_T)$ carries $\\gamma^{T-t}$.'],
  },

  'paper-ddpm': {
    prompt: py`Verify DDPM's algebra. Write \`alpha_bars(betas)\`, \`posterior_eq7(x0, xt, t, betas)\` (eq. 7's mean and $\tilde\beta_t$; \`betas[t - 1]\` is $\beta_t$), \`posterior_bayes(x0, xt, t, betas)\` (precisions $\alpha_t/\beta_t$ and $1/(1 - \bar\alpha_{t-1})$ added, mean precision-weighted from centres $x_t/\sqrt{\alpha_t}$ and $\sqrt{\bar\alpha_{t-1}}x_0$) and \`mean_from_noise(xt, eps, t, betas)\` (eq. 10). The checks confirm the two posteriors agree, that eq. (10) equals eq. (7) when $x_0$ is written through the noise, and a brute-force Bayes computation on a grid.`,
    starter: py`import math

def alpha_bars(betas):
    ...

def posterior_eq7(x0, xt, t, betas):
    ...

def posterior_bayes(x0, xt, t, betas):
    ...

def mean_from_noise(xt, eps, t, betas):
    ...
`,
    solution: py`import math

def alpha_bars(betas):
    out, prod = [], 1.0
    for b in betas:
        prod *= 1 - b
        out.append(prod)
    return out

def posterior_eq7(x0, xt, t, betas):
    ab = alpha_bars(betas)
    b, a_t, a_prev = betas[t - 1], ab[t - 1], ab[t - 2]
    mean = math.sqrt(a_prev) * b / (1 - a_t) * x0 + math.sqrt(1 - b) * (1 - a_prev) / (1 - a_t) * xt
    return mean, (1 - a_prev) / (1 - a_t) * b

def posterior_bayes(x0, xt, t, betas):
    ab = alpha_bars(betas)
    b, a_prev = betas[t - 1], ab[t - 2]
    pa, pb = (1 - b) / b, 1 / (1 - a_prev)
    mean = (pa * xt / math.sqrt(1 - b) + pb * math.sqrt(a_prev) * x0) / (pa + pb)
    return mean, 1 / (pa + pb)

def mean_from_noise(xt, eps, t, betas):
    a_t, b = alpha_bars(betas)[t - 1], betas[t - 1]
    return (xt - b / math.sqrt(1 - a_t) * eps) / math.sqrt(1 - b)
`,
    checks: checks(py`
betas = [1e-4 + (0.02 - 1e-4) * i / 199 for i in range(200)]
ab = alpha_bars(betas)
expect(ab[0], 1 - betas[0], "ᾱ₁ = α₁")
for t, x0, xt in ((2, 0.5, 0.4), (50, -0.8, 0.3), (200, 0.9, -1.2)):
    expect(posterior_bayes(x0, xt, t, betas), posterior_eq7(x0, xt, t, betas), f"Bayes against eq. (7) at t = {t}", 1e-9)
    eps = (xt - math.sqrt(ab[t - 1]) * x0) / math.sqrt(1 - ab[t - 1])
    expect(mean_from_noise(xt, eps, t, betas), posterior_eq7(x0, xt, t, betas)[0], f"eq. (10) against eq. (7) at t = {t}", 1e-9)
t, x0, xt = 30, 0.6, 0.2
b, a_prev = betas[t - 1], ab[t - 2]
grid = [-3 + 6 * i / 6000 for i in range(6001)]
w = [math.exp(-(xt - math.sqrt(1 - b) * u) ** 2 / (2 * b) - (u - math.sqrt(a_prev) * x0) ** 2 / (2 * (1 - a_prev))) for u in grid]
expect(sum(u * wi for u, wi in zip(grid, w)) / sum(w), posterior_eq7(x0, xt, t, betas)[0], "the posterior mean by brute force on a grid", 1e-6)
`),
    hints: ['`ab[t - 2]` is $\\bar\\alpha_{t-1}$, because the list starts at $\\bar\\alpha_1$.', 'Precisions add: $\\alpha_t/\\beta_t + 1/(1 - \\bar\\alpha_{t-1})$; the variance is one over the total.'],
  },

  'paper-lora': {
    prompt: py`Implement LoRA's layer. Write \`forward(W0, B, A, x, alpha, r)\` ($W_0x + \frac\alpha rB(Ax)$), \`merge(W0, B, A, alpha, r)\` ($W_0 + \frac\alpha rBA$), \`grads(B, A, x, g, alpha, r)\` returning $(\partial\ell/\partial B, \partial\ell/\partial A)$ for $\mathbf g = \partial\ell/\partial h$, and \`param_count(d, k, r)\`. The checks confirm the merged matrix gives the same output, that $A$'s gradient is zero while $B = 0$, and the gradients against finite differences.`,
    starter: py`def forward(W0, B, A, x, alpha, r):
    ...

def merge(W0, B, A, alpha, r):
    ...

def grads(B, A, x, g, alpha, r):
    ...

def param_count(d, k, r):
    ...
`,
    solution: py`def matvec(M, v):
    return [sum(a * b for a, b in zip(row, v)) for row in M]

def forward(W0, B, A, x, alpha, r):
    return [h + alpha / r * u for h, u in zip(matvec(W0, x), matvec(B, matvec(A, x)))]

def merge(W0, B, A, alpha, r):
    return [[w + alpha / r * sum(B[i][s] * A[s][j] for s in range(r)) for j, w in enumerate(row)] for i, row in enumerate(W0)]

def grads(B, A, x, g, alpha, r):
    Ax = matvec(A, x)
    Btg = [sum(B[i][s] * g[i] for i in range(len(B))) for s in range(r)]
    return [[alpha / r * gi * a for a in Ax] for gi in g], [[alpha / r * u * xi for xi in x] for u in Btg]

def param_count(d, k, r):
    return d * k, r * (d + k)
`,
    checks: checks(py`
W0 = [[1.0, 0.0, 2.0], [0.5, -1.0, 0.0]]
B, A = [[0.3, -0.1], [0.2, 0.4]], [[1.0, 0.5, -0.2], [0.0, 0.3, 0.7]]
x, c = [2.0, -1.0, 0.5], [0.7, -1.3]
mx = [sum(a * b for a, b in zip(row, x)) for row in merge(W0, B, A, 4.0, 2)]
expect(mx, forward(W0, B, A, x, 4.0, 2), "the merged matrix gives the same output", 1e-12)
expect(param_count(4096, 4096, 8), (16777216, 65536), "param_count(4096, 4096, 8)")
dB, dA = grads([[0.0, 0.0], [0.0, 0.0]], A, x, c, 4.0, 2)
expect(dA, [[0.0] * 3, [0.0] * 3], "A's gradient while B = 0")
loss = lambda Bm, Am: sum(ci * hi for ci, hi in zip(c, forward(W0, Bm, Am, x, 4.0, 2)))
dB, dA = grads(B, A, x, c, 4.0, 2)
h = 1e-6
for i in range(2):
    for s in range(2):
        up = [row[:] for row in B]; up[i][s] += h
        dn = [row[:] for row in B]; dn[i][s] -= h
        expect(dB[i][s], (loss(up, A) - loss(dn, A)) / (2 * h), f"∂ℓ/∂B[{i}][{s}]", 1e-6)
for s in range(2):
    for j in range(3):
        up = [row[:] for row in A]; up[s][j] += h
        dn = [row[:] for row in A]; dn[s][j] -= h
        expect(dA[s][j], (loss(B, up) - loss(B, dn)) / (2 * h), f"∂ℓ/∂A[{s}][{j}]", 1e-6)
`),
    hints: ['For $u = Mv$: $\\partial\\ell/\\partial M = \\frac{\\partial\\ell}{\\partial u}v^\\top$ and $\\partial\\ell/\\partial v = M^\\top\\frac{\\partial\\ell}{\\partial u}$. Apply it to $B(Ax)$, then to $Ax$.', 'Return `param_count` as a tuple `(d * k, r * (d + k))`.'],
  },
}
