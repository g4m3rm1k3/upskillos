export default {
  filename: 'numpy_network.py', packages: ['numpy'],
  title: 'A two-layer network in NumPy.',
  intro: 'Implement a dense network with one hidden ReLU layer and a softmax output: stable softmax, cross-entropy, the forward pass with a cache, the vectorized backward pass, and a training loop. The checks compare every gradient with finite differences and train the network on XOR and a three-class problem.',
  steps: [
    '`softmax(Z)` → row-wise probabilities, stable for very large scores.',
    '`init_params(d, h, k, rng)` → dict with `W1 (d,h)`, `b1 (h,)`, `W2 (h,k)`, `b2 (k,)`; He initialization for W1 and W2, zero biases.',
    '`forward(params, X)` → `(P, cache)` where `cache` holds what backward needs (Z1, A1, X).',
    '`cross_entropy(P, y)` → mean of `−log P[i, y_i]`.',
    '`backward(params, cache, P, y)` → gradients with the same keys as `params`; `train(X, y, h, rate, steps, rng)` → trained params.',
  ],
  hints: [
    ['Output error', '`D2 = P.copy(); D2[np.arange(n), y] -= 1; D2 /= n` — that is ∂L/∂Z2.'],
    ['Layer gradients', '`dW2 = A1.T @ D2`, `db2 = D2.sum(axis=0)`, `D1 = (D2 @ W2.T) * (Z1 > 0)`, `dW1 = X.T @ D1`, `db1 = D1.sum(axis=0)`.'],
    ['He initialization', '`rng.normal(0, np.sqrt(2 / d), size=(d, h))`.'],
  ],
  starter: `import numpy as np

def softmax(Z):
    raise NotImplementedError

def init_params(d, h, k, rng):
    raise NotImplementedError

def forward(params, X):
    raise NotImplementedError

def cross_entropy(P, y):
    raise NotImplementedError

def backward(params, cache, P, y):
    raise NotImplementedError

def train(X, y, h=16, rate=0.5, steps=2000, rng=None):
    raise NotImplementedError
`,
  solution: `import numpy as np

def softmax(Z):
    E = np.exp(Z - Z.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)

def init_params(d, h, k, rng):
    return {"W1": rng.normal(0, np.sqrt(2 / d), size=(d, h)), "b1": np.zeros(h),
            "W2": rng.normal(0, np.sqrt(2 / h), size=(h, k)), "b2": np.zeros(k)}

def forward(params, X):
    Z1 = X @ params["W1"] + params["b1"]
    A1 = np.maximum(0, Z1)
    P = softmax(A1 @ params["W2"] + params["b2"])
    return P, {"X": X, "Z1": Z1, "A1": A1}

def cross_entropy(P, y):
    return float(-np.mean(np.log(np.maximum(P[np.arange(len(y)), y], 1e-12))))

def backward(params, cache, P, y):
    n = len(y)
    D2 = P.copy()
    D2[np.arange(n), y] -= 1
    D2 /= n
    D1 = (D2 @ params["W2"].T) * (cache["Z1"] > 0)
    return {"W2": cache["A1"].T @ D2, "b2": D2.sum(axis=0), "W1": cache["X"].T @ D1, "b1": D1.sum(axis=0)}

def train(X, y, h=16, rate=0.5, steps=2000, rng=None):
    rng = rng if rng is not None else np.random.default_rng(0)
    params = init_params(X.shape[1], h, int(y.max()) + 1, rng)
    for _ in range(steps):
        P, cache = forward(params, X)
        grads = backward(params, cache, P, y)
        for key in params:
            params[key] -= rate * grads[key]
    return params
`,
  solutionNote: 'The output error P − onehot(y) is divided by n once, so every downstream gradient is already a batch average. The ReLU derivative is applied as a mask `Z1 > 0` on the error flowing back.',
  checkSummary: 'Softmax rows sum to 1 and survive scores of 1000; parameter shapes and He scale; cross-entropy of uniform predictions equals log k; every parameter\'s gradient against finite differences; perfect XOR after training; and a three-class problem learned to high held-out accuracy.',
  checks: `
import numpy as np
_S = softmax(np.array([[1000.0, 1001.0, 1002.0], [0.0, 0.0, 0.0]]))
assert np.all(np.isfinite(_S)) and np.allclose(_S.sum(axis=1), 1) and np.allclose(_S[1], 1 / 3)
_p = init_params(2, 50, 3, np.random.default_rng(0))
assert _p["W1"].shape == (2, 50) and _p["b1"].shape == (50,) and _p["W2"].shape == (50, 3) and _p["b2"].shape == (3,)
assert abs(_p["W2"].std() - np.sqrt(2 / 50)) < 0.05, "W2 should use He scale sqrt(2/fan_in)"
assert abs(cross_entropy(np.full((4, 3), 1 / 3), np.array([0, 1, 2, 0])) - np.log(3)) < 1e-12
print("PASS: softmax, initialization and cross-entropy")
_rng = np.random.default_rng(1)
_X = _rng.normal(size=(12, 3)); _y = _rng.integers(0, 4, 12)
_q = init_params(3, 6, 4, _rng)
_P, _c = forward(_q, _X)
_g = backward(_q, _c, _P, _y)
for _key in _q:
    _flat = _q[_key].reshape(-1)
    for _idx in [0, _flat.size - 1]:
        _old = _flat[_idx]
        _flat[_idx] = _old + 1e-6; _up = cross_entropy(forward(_q, _X)[0], _y)
        _flat[_idx] = _old - 1e-6; _dn = cross_entropy(forward(_q, _X)[0], _y)
        _flat[_idx] = _old
        _num = (_up - _dn) / 2e-6
        assert abs(_g[_key].reshape(-1)[_idx] - _num) < 1e-6, f"{_key}[{_idx}]: backprop {_g[_key].reshape(-1)[_idx]:.8f} vs numeric {_num:.8f}"
print("PASS: every layer's gradients match finite differences")
_Xx = np.array([[0, 0], [0, 1], [1, 0], [1, 1]] * 10, dtype=float) + 0.05 * _rng.normal(size=(40, 2)); _yx = np.array([0, 1, 1, 0] * 10)
_px = train(_Xx, _yx, h=8, rate=0.5, steps=3000, rng=np.random.default_rng(3))
assert np.mean(forward(_px, _Xx)[0].argmax(axis=1) == _yx) == 1.0, "The network should solve XOR"
_t = _rng.uniform(0, 1, 600); _cls = _rng.integers(0, 3, 600); _ang = _cls * 2.1 + _t * 3 + 0.2 * _rng.normal(size=600)
_Xs = np.c_[_t * np.cos(_ang), _t * np.sin(_ang)] * 2
_ps = train(_Xs[:400], _cls[:400], h=64, rate=1.0, steps=4000, rng=np.random.default_rng(4))
_acc = np.mean(forward(_ps, _Xs[400:])[0].argmax(axis=1) == _cls[400:])
assert _acc > 0.85, f"Three-class spiral held-out accuracy {_acc:.2f} too low"
print(f"PASS: XOR solved; three-arm spiral held-out accuracy {_acc:.0%}")
`,
}
