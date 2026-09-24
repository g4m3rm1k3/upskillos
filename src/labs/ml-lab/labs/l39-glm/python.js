export default {
  filename: 'glm.py', packages: ['numpy'],
  title: 'Generalized linear models with Newton’s method, softmax regression and LWR.',
  intro: 'Implement the shared GLM gradient and Hessian, Newton’s method (IRLS) for any of the three families, the softmax cross-entropy gradient, and locally weighted regression. The checks compare your gradients with finite differences, verify quadratic convergence, and confirm special cases (Gaussian in one step, LWR with a huge bandwidth equals least squares).',
  steps: [
    '`mean_fn(eta, family)` and `var_fn(eta, family)` for `"gaussian"`, `"bernoulli"`, `"poisson"`: a′(η) and a″(η).',
    '`glm_grad_hess(theta, X, y, family)` → gradient `X.T @ (mu - y) / n` and Hessian `X.T @ (X * var[:, None]) / n` of the mean negative log-likelihood. X already contains a column of ones.',
    '`newton_glm(X, y, family, iters=25)` → `(theta, grads)`: start at zeros, apply `theta -= solve(H, g)`, and record the gradient norm before each step.',
    '`softmax_ce_grad(W, X, y)` → gradient of the mean cross-entropy for weights W of shape (d, K) and integer labels y. Use the max-subtraction trick.',
    '`lwr_predict(x_train, y_train, x_query, tau)` → one prediction per query from a weighted straight-line fit.',
  ],
  hints: [
    ['Newton step', '`theta = theta - np.linalg.solve(H, g)`. Never form the inverse explicitly.'],
    ['Softmax gradient', 'P = softmax(X @ W) row-wise; subtract 1 at each row’s true class; the gradient is `X.T @ (P - Y) / n` where Y is one-hot.'],
    ['Weighted least squares', 'With A = [1, x] and weights w: solve `(A.T * w) @ A` θ = `(A.T * w) @ y`.'],
  ],
  starter: `import numpy as np

def mean_fn(eta, family):
    raise NotImplementedError

def var_fn(eta, family):
    raise NotImplementedError

def glm_grad_hess(theta, X, y, family):
    raise NotImplementedError

def newton_glm(X, y, family, iters=25):
    raise NotImplementedError

def softmax_ce_grad(W, X, y):
    raise NotImplementedError

def lwr_predict(x_train, y_train, x_query, tau):
    raise NotImplementedError
`,
  solution: `import numpy as np

def mean_fn(eta, family):
    if family == "gaussian":
        return eta
    if family == "bernoulli":
        return 1 / (1 + np.exp(-eta))
    return np.exp(eta)

def var_fn(eta, family):
    if family == "gaussian":
        return np.ones_like(eta)
    if family == "bernoulli":
        p = 1 / (1 + np.exp(-eta))
        return p * (1 - p)
    return np.exp(eta)

def glm_grad_hess(theta, X, y, family):
    eta = X @ theta
    n = len(y)
    g = X.T @ (mean_fn(eta, family) - y) / n
    H = X.T @ (X * var_fn(eta, family)[:, None]) / n
    return g, H

def newton_glm(X, y, family, iters=25):
    theta = np.zeros(X.shape[1])
    grads = []
    for _ in range(iters):
        g, H = glm_grad_hess(theta, X, y, family)
        grads.append(float(np.linalg.norm(g)))
        theta = theta - np.linalg.solve(H, g)
    return theta, grads

def softmax_ce_grad(W, X, y):
    Z = X @ W
    Z = Z - Z.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P /= P.sum(axis=1, keepdims=True)
    P[np.arange(len(y)), y] -= 1
    return X.T @ P / len(y)

def lwr_predict(x_train, y_train, x_query, tau):
    A = np.column_stack([np.ones_like(x_train), x_train])
    out = []
    for q in np.atleast_1d(x_query):
        w = np.exp(-((x_train - q) ** 2) / (2 * tau ** 2))
        theta = np.linalg.solve((A.T * w) @ A, (A.T * w) @ y_train)
        out.append(theta[0] + theta[1] * q)
    return np.array(out)
`,
  solutionNote: 'One gradient formula, (μ − y)x, serves every family; only mean_fn and var_fn change. Newton’s method is the same code for all three.',
  checkSummary: 'Gradients and Hessians against finite differences for all three families; Gaussian Newton finishes in one step and equals least squares; Poisson and logistic Newton converge quadratically and recover the generating parameters; the softmax gradient matches finite differences and survives huge scores; LWR with a huge bandwidth equals least squares, and a small bandwidth follows a sine wave.',
  checks: `
import numpy as np
rng = np.random.default_rng(39)
n = 400
x = rng.uniform(-1, 1, n)
X = np.column_stack([np.ones(n), x])
data = {
    "gaussian": 1 + 0.5 * x + rng.normal(size=n),
    "bernoulli": (rng.random(n) < 1 / (1 + np.exp(-(-0.5 + 2 * x)))).astype(float),
    "poisson": rng.poisson(np.exp(0.3 + 0.8 * x)).astype(float),
}
def nll(theta, y, fam):
    eta = X @ theta
    a = {"gaussian": eta ** 2 / 2, "bernoulli": np.logaddexp(0, eta), "poisson": np.exp(eta)}[fam]
    return np.mean(a - y * eta)
th = np.array([0.2, -0.3])
for fam, y in data.items():
    g, H = glm_grad_hess(th, X, y, fam)
    eps = 1e-6
    num_g = np.array([(nll(th + eps * e, y, fam) - nll(th - eps * e, y, fam)) / (2 * eps) for e in np.eye(2)])
    num_H = np.array([(glm_grad_hess(th + eps * e, X, y, fam)[0] - glm_grad_hess(th - eps * e, X, y, fam)[0]) / (2 * eps) for e in np.eye(2)])
    assert np.allclose(g, num_g, atol=1e-6), fam + ": gradient does not match finite differences"
    assert np.allclose(H, num_H, atol=1e-5), fam + ": Hessian does not match finite differences"
print("PASS: gradients and Hessians for all three families")
theta_g, grads_g = newton_glm(X, data["gaussian"], "gaussian", iters=3)
assert np.allclose(theta_g, np.linalg.lstsq(X, data["gaussian"], rcond=None)[0]) and grads_g[1] < 1e-10, "Gaussian: one Newton step is least squares"
for fam, truth in (("poisson", [0.3, 0.8]), ("bernoulli", [-0.5, 2])):
    theta, grads = newton_glm(X, data[fam], fam, iters=10)
    assert grads[-1] < 1e-10, fam + ": gradient should vanish"
    assert np.allclose(theta, truth, atol=0.3), fam + ": should recover the generating parameters"
    k = next(i for i, v in enumerate(grads) if v < 1e-3)
    assert grads[k + 1] < 10 * grads[k] ** 2, fam + ": convergence should be quadratic"
    print(f"{fam}: theta = {np.round(theta, 3)}, gradient norms {[f'{v:.1e}' for v in grads[:6]]}")
print("PASS: Newton / IRLS")
Xs = np.column_stack([np.ones(60), rng.normal(size=(60, 2))])
ys = rng.integers(0, 3, 60)
W = rng.normal(size=(3, 3))
def ce(W):
    Z = Xs @ W; Z = Z - Z.max(axis=1, keepdims=True)
    return np.mean(np.log(np.exp(Z).sum(axis=1)) - Z[np.arange(60), ys])
G = softmax_ce_grad(W, Xs, ys)
num = np.zeros_like(W)
for i in range(3):
    for j in range(3):
        E = np.zeros_like(W); E[i, j] = 1e-6
        num[i, j] = (ce(W + E) - ce(W - E)) / 2e-6
assert np.allclose(G, num, atol=1e-6), "softmax gradient does not match finite differences"
assert np.all(np.isfinite(softmax_ce_grad(W * 1000, Xs, ys))), "use the max-subtraction trick"
assert np.allclose(G.sum(axis=1), 0, atol=1e-12), "each row of the gradient should sum to zero across classes"
print("PASS: softmax cross-entropy gradient")
xt = np.sort(rng.uniform(0, 10, 80)); yt = np.sin(xt) + 0.3 * xt + 0.1 * rng.normal(size=80)
ols = np.polyfit(xt, yt, 1)
assert np.allclose(lwr_predict(xt, yt, np.array([2.0, 7.0]), 1e6), np.polyval(ols, [2.0, 7.0]), atol=1e-6), "huge bandwidth = ordinary least squares"
grid = np.linspace(1, 9, 9)
err = np.abs(lwr_predict(xt, yt, grid, 0.5) - (np.sin(grid) + 0.3 * grid)).max()
assert err < 0.25, "a small bandwidth should follow the sine wave"
print(f"PASS: locally weighted regression (max error vs truth {err:.3f})")
`,
}
