// Lab 22 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The data and surfaces are the playground's: y = 3x − 1 + noise (n = 256) and the valley f = ½(x² + κy²), κ = 25.

export const extras = {
  'l22-sgd': {
    formulaTex: '$$g_B = \\frac1B\\sum_{i \\in B}\\nabla \\ell_i(w) \\qquad \\mathbb E[g_B] = \\nabla L(w)$$ $$\\operatorname{sd}(g_B) \\propto 1/\\sqrt B$$',
    mathCode: {
      rows: [
        ['$g_B$', 'grad_w(rng.choice(n, B, replace=False))', 'The gradient on one random mini-batch of B examples.'],
        ['$\\nabla L(w)$', 'grad_w(np.arange(n))', 'The full-batch gradient: the average over all n.'],
        ['$\\mathbb E[g_B]$', 'estimates.mean()', 'Averaged over many batches, the estimate is right.'],
        ['epoch', 'for s in range(0, n, B): ...', 'One pass over the data: n / B updates.'],
      ],
    },
    notebook: {
      title: 'Lab 22.1 · Stochastic and mini-batch gradients',
      intro: 'How noisy a mini-batch gradient is, and what batch size does to 20 epochs of training.',
      cells: [
        {
          title: 'An unbiased, noisy estimate',
          prose: '**Predict** how the spread for B = 64 compares with B = 1.',
          code: `import numpy as np
rng = np.random.default_rng(3)
n = 256
x = rng.uniform(-2, 2, n); y = 3 * x - 1 + 0.6 * rng.normal(size=n)     # the playground's regression data
w, b = 0.0, 0.0                                                           # a starting point far from the fit

def grad_w(idx):
    """d(MSE)/dw over the examples in idx."""
    err = w * x[idx] + b - y[idx]
    return 2 * np.mean(err * x[idx])

full = grad_w(np.arange(n))
print(f"full-batch gradient: {full:.3f}")
for B in [1, 8, 64]:
    estimates = np.array([grad_w(rng.choice(n, B, replace=False)) for _ in range(2000)])
    print(f"B = {B:3d}: mean of 2000 mini-batch gradients {estimates.mean():7.3f}, spread {estimates.std():.3f}")`,
        },
        {
          title: 'Batch size and epochs',
          prose: 'The same 20 epochs and learning rate for three batch sizes. **Predict** which ends lowest.',
          code: `import numpy as np
rng = np.random.default_rng(3)
n = 256
x = rng.uniform(-2, 2, n); y = 3 * x - 1 + 0.6 * rng.normal(size=n)

def train(B, lr=0.05, epochs=20, seed=0):
    r = np.random.default_rng(seed)
    w = b = 0.0
    for epoch in range(epochs):
        order = r.permutation(n)                           # reshuffle every epoch
        for s in range(0, n, B):
            idx = order[s:s + B]; err = w * x[idx] + b - y[idx]
            w -= lr * 2 * np.mean(err * x[idx]); b -= lr * 2 * np.mean(err)
    return np.mean((w * x + b - y) ** 2), n // B * epochs

for B in [1, 8, 256]:
    mse, updates = train(B)
    print(f"batch {B:3d}: {updates:5d} updates in 20 epochs, final training MSE {mse:.4f}")
print(f"best possible (least squares): {np.mean((np.polyval(np.polyfit(x, y, 1), x) - y) ** 2):.4f}")`,
        },
      ],
    },
  },
  'l22-momentum': {
    formulaTex: '$$v \\leftarrow \\beta v + g \\qquad w \\leftarrow w - \\alpha v$$ $$v \\to \\frac{g}{1-\\beta}\\ \\ (g\\ \\text{constant})$$',
    mathCode: {
      rows: [
        ['$v$', 'v = beta * v + g', 'The velocity: an exponentially weighted sum of past gradients.'],
        ['$w \\leftarrow w - \\alpha v$', 'p = p - 0.035 * v', 'Step along the velocity, not the latest gradient.'],
        ['$g/(1-\\beta)$', '1 / (1 - beta)', 'Where the velocity settles when the gradient stays the same.'],
        ['$f = \\tfrac12(x^2 + \\kappa y^2)$', '0.5 * (p[0] ** 2 + k * p[1] ** 2)', 'The elongated valley, κ = 25.'],
      ],
    },
    notebook: {
      title: 'Lab 22.2 · Momentum',
      intro: 'The velocity’s build-up, then gradient descent and momentum on the valley at the same step size.',
      cells: [
        {
          title: 'The velocity builds up',
          prose: '**Predict** the velocity after two steps.',
          code: `beta, v = 0.9, 0.0
for t in range(1, 51):
    v = beta * v + 1.0                         # constant gradient g = 1
    if t in (1, 2, 5, 10, 20, 50):
        print(f"step {t:2d}: velocity {v:.3f}")
print("limit 1 / (1 - beta) =", 1 / (1 - beta))`,
        },
        {
          title: 'The valley',
          prose: '**Predict** which ends closer to the minimum after 150 steps. **Then change** k to 100 in both functions.',
          code: `import numpy as np
def grad(p, k=25):                              # f(x, y) = 0.5 (x^2 + k y^2), the lesson's valley
    return np.array([p[0], k * p[1]])
def f(p, k=25):
    return 0.5 * (p[0] ** 2 + k * p[1] ** 2)

for name, beta in [("gradient descent", 0.0), ("momentum 0.9", 0.9)]:
    p, v = np.array([-4.5, 2.0]), np.zeros(2)
    for t in range(150):
        v = beta * v + grad(p)
        p = p - 0.035 * v
    print(f"{name:16s} after 150 steps at alpha = 0.035: f = {f(p):.2e}, x = {p[0]:.4f}")`,
        },
      ],
    },
  },
  'l22-adam': {
    formulaTex: '$$m \\leftarrow \\beta_1 m + (1-\\beta_1)g \\qquad v \\leftarrow \\beta_2 v + (1-\\beta_2)g^2$$ $$\\hat m = \\frac{m}{1-\\beta_1^t} \\qquad \\hat v = \\frac{v}{1-\\beta_2^t}$$ $$w \\leftarrow w - \\alpha\\frac{\\hat m}{\\sqrt{\\hat v} + \\varepsilon}$$',
    mathCode: {
      rows: [
        ['$m$, $v$', 'm = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g ** 2', 'Running mean of the gradient and of its square.'],
        ['$\\hat m$, $\\hat v$', 'm / (1 - 0.9 ** t), v / (1 - 0.999 ** t)', 'Bias correction: both start at 0.'],
        ['$\\alpha\\,\\hat m/(\\sqrt{\\hat v} + \\varepsilon)$', 'lr * m_hat / (np.sqrt(v_hat) + 1e-8)', 'A step whose size does not depend on the gradient’s scale.'],
        ['seeds', 'for seed in range(5)', 'Compare optimizers over several runs with the same budget.'],
      ],
    },
    notebook: {
      title: 'Lab 22.3 · Adaptive steps: RMSProp and Adam',
      intro: 'What bias correction does to the first step, then momentum and Adam on the noisy valley over five seeds.',
      cells: [
        {
          title: 'The first step, four ways',
          prose: '**Predict** the first step with both corrections.',
          code: `import numpy as np
g, b1, b2, lr, eps = 2.0, 0.9, 0.999, 0.1, 1e-8
m = (1 - b1) * g; v = (1 - b2) * g ** 2                 # after the first step, starting from m = v = 0
m_hat, v_hat = m / (1 - b1), v / (1 - b2)
print(f"m = {m:.3f}, v = {v:.4f}   corrected: m_hat = {m_hat:.3f}, v_hat = {v_hat:.3f}")
for label, top, bottom in [("both corrected ", m_hat, v_hat), ("only v corrected", m, v_hat), ("only m corrected", m_hat, v), ("neither         ", m, v)]:
    print(f"{label}: first step {lr * top / (np.sqrt(bottom) + eps):.4f}   ({lr * top / (np.sqrt(bottom) + eps) / lr:.2f} x the learning rate)")`,
        },
        {
          title: 'A fair comparison',
          prose: 'The same 200 steps and the same noise for both, five seeds each. **Then change** the noise to 0.',
          code: `import numpy as np
def grad(p, k=25): return np.array([p[0], k * p[1]])
def f(p, k=25): return 0.5 * (p[0] ** 2 + k * p[1] ** 2)

def run(name, lr, seed, steps=200, noise=2.0):
    rng = np.random.default_rng(seed)                     # the same noise for every optimizer with this seed
    p, m, v = np.array([-4.5, 2.0]), np.zeros(2), np.zeros(2)
    for t in range(1, steps + 1):
        g = grad(p) + noise * rng.normal(size=2)          # a noisy gradient, like a mini-batch
        if name == "momentum":
            m = 0.9 * m + g; p = p - lr * m
        else:                                             # Adam
            m = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g ** 2
            p = p - lr * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)
    return f(p)

for name, lr in [("momentum", 0.03), ("adam", 0.1)]:
    finals = [run(name, lr, seed) for seed in range(5)]
    print(f"{name:8s} (lr {lr}): final f over 5 seeds  mean {np.mean(finals):.3f}, min {np.min(finals):.3f}, max {np.max(finals):.3f}")`,
        },
      ],
    },
  },
  'l22-schedules': {
    formulaTex: '$$\\alpha_t = \\alpha_0\\cdot\\tfrac12\\big(1 + \\cos(\\pi t/T)\\big)$$ $$g \\leftarrow g\\cdot\\min\\big(1,\\ c/\\lVert g\\rVert\\big)$$',
    mathCode: {
      rows: [
        ['$\\alpha_t$ (warm-up)', 'lr0 * (t + 1) / warm', 'Rises linearly over the first steps.'],
        ['$\\alpha_t$ (cosine)', 'lr0 * 0.5 * (1 + np.cos(np.pi * (t - warm) / (T - warm)))', 'Falls smoothly to 0 over the rest.'],
        ['$\\lVert g\\rVert$', 'np.linalg.norm(g)', 'The gradient’s length.'],
        ['$g\\,\\min(1, c/\\lVert g\\rVert)$', 'g * min(1.0, c / norm)', 'Clipping: shorten, never turn.'],
      ],
    },
    notebook: {
      title: 'Lab 22.4 · Learning-rate schedules and gradient scale',
      intro: 'A warm-up-then-cosine schedule, step by step, and what clipping does to a gradient spike.',
      cells: [
        {
          title: 'Warm-up, then cosine',
          prose: '**Predict** the rate at step 550, halfway through the cosine part.',
          code: `import numpy as np
T, lr0, warm = 1000, 0.1, 100
def rate(t):
    if t < warm:
        return lr0 * (t + 1) / warm                                   # linear warm-up
    return lr0 * 0.5 * (1 + np.cos(np.pi * (t - warm) / (T - warm)))  # cosine decay over the rest
for t in [0, 50, 99, 100, 325, 550, 775, 999]:
    print(f"step {t:4d}: learning rate {rate(t):.4f}")`,
        },
        {
          title: 'Clipping a spike',
          prose: '**Predict** the clipped gradient for threshold 5.',
          code: `import numpy as np
def clip(g, c):
    """Rescale g so its length is at most c; its direction is unchanged."""
    norm = np.linalg.norm(g)
    return g * min(1.0, c / norm)
g = np.array([30.0, -40.0])                  # a spike: length 50
for c in [100, 5]:
    out = clip(g, c)
    print(f"threshold {c:3d}: {out}  length {np.linalg.norm(out):.1f}  direction {out / np.linalg.norm(out)}")`,
        },
      ],
    },
  },
  'l22-diagnose': {
    formulaTex: '$$L_0 \\approx \\log k$$',
    mathCode: {
      rows: [
        ['$L_0 \\approx \\log k$', 'np.log(3)', 'The first loss of an unsure k-class model.'],
        ['train / validation', 'np.mean(e ** 2), np.mean((... - y_va) ** 2)', 'Record both, every so often.'],
        ['sign bug', 'params[i] -= sign * lr * ...  with sign = -1', 'Gradient ascent: the loss rises from the start.'],
      ],
    },
    notebook: {
      title: 'Lab 22.5 · Diagnosing training failures',
      intro: 'The first check (initial loss), then three runs to classify: a bug, an optimization problem, a generalization problem.',
      cells: [
        {
          title: 'The first loss',
          prose: '**Predict** the initial loss of an untrained 3-class model with tiny weights.',
          code: `import numpy as np
rng = np.random.default_rng(0)
# A tiny classification task: 2 features, 3 classes, a softmax model.
X = rng.normal(size=(300, 2)); y = (X[:, 0] > 0).astype(int) + (X[:, 1] > 0.5)
W = rng.normal(0, 0.01, (2, 3)); b = np.zeros(3)
Z = X @ W + b; P = np.exp(Z - Z.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
print(f"initial loss {-np.mean(np.log(P[np.arange(300), y])):.3f}   log(3) = {np.log(3):.3f}")
print("An initial loss near log k is a good sign: the untrained model is unsure, not confidently wrong.")`,
        },
        {
          title: 'Three runs to diagnose',
          prose: 'A small network on 12 noisy points; each run has one thing wrong or not. **Classify** each before reading the lesson’s last paragraph.',
          code: `import numpy as np
def run(kind, steps=4000, seed=0):
    rng = np.random.default_rng(seed)
    x_tr = np.linspace(-1, 1, 12)[:, None]; y_tr = np.sin(3 * x_tr) + 0.3 * rng.normal(size=(12, 1))
    x_va = np.linspace(-1, 1, 200)[:, None]; y_va = np.sin(3 * x_va)
    W1, b1 = rng.normal(0, 1, (1, 64)), np.zeros(64); W2, b2 = rng.normal(0, 0.1, (64, 1)), np.zeros(1)
    params, m, v = [W1, b1, W2, b2], [0] * 4, [0] * 4
    lr, sign = {"A": (0.5, 1), "B": (0.01, -1), "C": (0.01, 1)}[kind]
    out = []
    for t in range(1, steps + 1):
        H = np.tanh(x_tr @ W1 + b1); e = H @ W2 + b2 - y_tr
        D2 = 2 * e / 12; D1 = (D2 @ W2.T) * (1 - H ** 2)
        grads = [x_tr.T @ D1, D1.sum(0), H.T @ D2, D2.sum(0)]
        for i, g in enumerate(grads):                      # Adam
            m[i] = 0.9 * m[i] + 0.1 * g; v[i] = 0.999 * v[i] + 0.001 * g ** 2
            params[i] -= sign * lr * (m[i] / (1 - 0.9 ** t)) / (np.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8)
        if t in (1, 100, 500, 1500, 4000):
            tr = np.mean(e ** 2); va = np.mean((np.tanh(x_va @ W1 + b1) @ W2 + b2 - y_va) ** 2)
            out.append(f"{tr:.3g}/{va:.3g}")
    return out

for kind in "ABC":
    print(f"run {kind}, train/validation MSE at steps 1, 100, 500, 1500, 4000:", "  ".join(run(kind)))`,
        },
      ],
    },
  },
}
