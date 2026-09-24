export default {
  filename: 'regularize.py', packages: ['numpy'],
  title: 'Dropout, batch normalization and a residual block — forward and backward.',
  intro: 'Implement inverted dropout, batch normalization (training and evaluation modes) and a residual block with a tanh branch, each with its backward pass. The checks compare every gradient with finite differences and verify the statistical properties that make these layers work.',
  steps: [
    '`dropout_forward(x, p, rng, train)` → `(y, mask)`; in training, keep with probability 1 − p and scale by 1/(1 − p); in evaluation return x. `dropout_backward(dy, mask)`.',
    '`bn_forward(x, gamma, beta, eps=1e-5)` → `(y, cache)` using batch mean and variance (divide by n); `bn_backward(dy, cache)` → `(dx, dgamma, dbeta)`.',
    '`residual_forward(x, W, b)` → x + tanh(xW + b) and a cache; `residual_backward(dy, cache)` → `(dx, dW, db)`.',
  ],
  hints: [
    ['Batch-norm backward', 'With x̂ = (x − μ)/σ and dx̂ = dy·γ: dx = (dx̂ − mean(dx̂) − x̂·mean(dx̂·x̂)) / σ, means taken over the batch.'],
    ['Residual backward', 'dy flows to x twice: directly, and through the tanh branch: dz = dy·(1 − tanh²); dx = dy + dz·Wᵀ.'],
  ],
  starter: `import numpy as np

def dropout_forward(x, p, rng, train):
    raise NotImplementedError

def dropout_backward(dy, mask):
    raise NotImplementedError

def bn_forward(x, gamma, beta, eps=1e-5):
    raise NotImplementedError

def bn_backward(dy, cache):
    raise NotImplementedError

def residual_forward(x, W, b):
    raise NotImplementedError

def residual_backward(dy, cache):
    raise NotImplementedError
`,
  solution: `import numpy as np

def dropout_forward(x, p, rng, train):
    if not train or p == 0:
        return x, None
    mask = (rng.random(x.shape) >= p) / (1 - p)
    return x * mask, mask

def dropout_backward(dy, mask):
    return dy if mask is None else dy * mask

def bn_forward(x, gamma, beta, eps=1e-5):
    mu = x.mean(0)
    sigma = np.sqrt(x.var(0) + eps)
    xhat = (x - mu) / sigma
    return gamma * xhat + beta, (xhat, sigma, gamma)

def bn_backward(dy, cache):
    xhat, sigma, gamma = cache
    dxhat = dy * gamma
    dx = (dxhat - dxhat.mean(0) - xhat * (dxhat * xhat).mean(0)) / sigma
    return dx, (dy * xhat).sum(0), dy.sum(0)

def residual_forward(x, W, b):
    h = np.tanh(x @ W + b)
    return x + h, (x, W, h)

def residual_backward(dy, cache):
    x, W, h = cache
    dz = dy * (1 - h ** 2)
    return dy + dz @ W.T, x.T @ dz, dz.sum(0)
`,
  solutionNote: 'Each backward pass is a few lines once the forward pass is written with its cache — and the residual’s “dy +” is the whole reason deep networks train.',
  checkSummary: 'Dropout keeps the expected activation and is the identity at evaluation; batch-norm outputs have per-feature mean β and standard deviation γ; all gradients (dropout, batch norm with respect to inputs, γ and β, and the residual block with respect to x, W and b) match finite differences; and a stack of 30 residual blocks passes a far larger gradient to its input than the same stack without the identity path.',
  checks: `
import numpy as np
rng = np.random.default_rng(52)
x = np.ones((2000, 50))
y, mask = dropout_forward(x, 0.3, rng, True)
assert abs(y.mean() - 1) < 0.02 and np.all(dropout_forward(x, 0.3, rng, False)[0] == x)
dy = rng.normal(size=x.shape)
assert np.allclose(dropout_backward(dy, mask), dy * mask)
print("PASS: inverted dropout")
X = rng.normal(size=(16, 5)) * 3 + 1; g = rng.normal(size=5) + 1; bt = rng.normal(size=5)
Y, cache = bn_forward(X, g, bt)
assert np.allclose(Y.mean(0), bt, atol=1e-8) and np.allclose(Y.std(0), np.abs(g), atol=1e-3)
D = rng.normal(size=Y.shape)
L = lambda X_, g_, b_: np.sum(bn_forward(X_, g_, b_)[0] * D)
dx, dg, db = bn_backward(D, cache)
def num(f, A):
    G = np.zeros_like(A)
    for idx in np.ndindex(A.shape):
        A[idx] += 1e-6; a = f(); A[idx] -= 2e-6; b = f(); A[idx] += 1e-6
        G[idx] = (a - b) / 2e-6
    return G
assert np.allclose(dx, num(lambda: L(X, g, bt), X), atol=1e-5)
assert np.allclose(dg, num(lambda: L(X, g, bt), g), atol=1e-5) and np.allclose(db, num(lambda: L(X, g, bt), bt), atol=1e-5)
print("PASS: batch normalization forward and backward")
Xr = rng.normal(size=(6, 4)); W = rng.normal(size=(4, 4)) * 0.5; b = rng.normal(size=4)
Dr = rng.normal(size=(6, 4))
Lr = lambda: np.sum(residual_forward(Xr, W, b)[0] * Dr)
dxr, dW, dbr = residual_backward(Dr, residual_forward(Xr, W, b)[1])
assert np.allclose(dxr, num(Lr, Xr), atol=1e-5) and np.allclose(dW, num(Lr, W), atol=1e-5) and np.allclose(dbr, num(Lr, b), atol=1e-5)
print("PASS: residual block forward and backward")
Ws = [rng.normal(size=(8, 8)) * 0.2 for _ in range(30)]
def grad_to_input(residual):
    h, caches = rng.normal(size=(4, 8)), []
    for Wk in Ws:
        z = np.tanh(h @ Wk)
        caches.append((h, Wk, z)); h = h + z if residual else z
    g = np.ones_like(h)
    for hk, Wk, z in reversed(caches):
        dz = g * (1 - z ** 2)
        g = (g if residual else 0) + dz @ Wk.T
    return np.linalg.norm(g)
res, plain = grad_to_input(True), grad_to_input(False)
print(f"gradient reaching the input through 30 blocks: residual {res:.2e}, plain {plain:.2e}")
assert res > 1e3 * plain
print("PASS: the identity path keeps gradients alive")
`,
}
