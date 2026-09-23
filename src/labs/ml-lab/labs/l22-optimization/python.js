export default {
  filename: 'optimizers.py', packages: ['numpy'],
  title: 'Implement the optimizers yourself.',
  intro: 'Write SGD, momentum and Adam as functions that take parameters, a gradient and a state dict and return updated parameters and state — the same design PyTorch uses internally. Then add a cosine schedule and gradient clipping. The checks run your optimizers on an ill-conditioned quadratic and verify Adam\'s bias correction exactly.',
  steps: [
    '`sgd(w, g, state, lr)` → `(w - lr*g, state)`.',
    '`momentum(w, g, state, lr, beta=0.9)` → velocity `v = beta*v + g` kept in `state["v"]`; step `w - lr*v`.',
    '`adam(w, g, state, lr, b1=0.9, b2=0.999, eps=1e-8)` → keep `m`, `v` and step count `t` in `state`; apply bias correction.',
    '`cosine_lr(lr0, t, T)` → `lr0 * 0.5 * (1 + cos(pi * t / T))`; `clip(g, c)` → rescale g so its norm is at most c.',
  ],
  hints: [
    ['State dicts', 'Start from `state = {}` and use `state.get("v", np.zeros_like(w))`. Return a new dict rather than mutating the caller\'s.'],
    ['Adam', '`t = state.get("t", 0) + 1`; `m_hat = m / (1 - b1**t)`; `v_hat = v / (1 - b2**t)`; `w - lr * m_hat / (np.sqrt(v_hat) + eps)`.'],
    ['Clipping', '`n = np.linalg.norm(g)`; return `g * min(1, c / n)` (guard n = 0).'],
  ],
  starter: `import numpy as np

def sgd(w, g, state, lr):
    raise NotImplementedError

def momentum(w, g, state, lr, beta=0.9):
    raise NotImplementedError

def adam(w, g, state, lr, b1=0.9, b2=0.999, eps=1e-8):
    raise NotImplementedError

def cosine_lr(lr0, t, T):
    raise NotImplementedError

def clip(g, c):
    raise NotImplementedError
`,
  solution: `import numpy as np

def sgd(w, g, state, lr):
    return w - lr * g, state

def momentum(w, g, state, lr, beta=0.9):
    v = beta * state.get("v", np.zeros_like(w)) + g
    return w - lr * v, {"v": v}

def adam(w, g, state, lr, b1=0.9, b2=0.999, eps=1e-8):
    t = state.get("t", 0) + 1
    m = b1 * state.get("m", np.zeros_like(w)) + (1 - b1) * g
    v = b2 * state.get("v", np.zeros_like(w)) + (1 - b2) * g ** 2
    m_hat, v_hat = m / (1 - b1 ** t), v / (1 - b2 ** t)
    return w - lr * m_hat / (np.sqrt(v_hat) + eps), {"m": m, "v": v, "t": t}

def cosine_lr(lr0, t, T):
    return lr0 * 0.5 * (1 + np.cos(np.pi * t / T))

def clip(g, c):
    n = np.linalg.norm(g)
    return g if n == 0 else g * min(1.0, c / n)
`,
  solutionNote: 'Each optimizer is a pure function of (parameters, gradient, state): saving and restoring `state` along with the weights is exactly what a checkpoint must do to resume training faithfully.',
  checkSummary: 'Single SGD and momentum steps; the momentum velocity approaching 1/(1−β); Adam\'s first step moving each coordinate by almost exactly lr regardless of gradient scale (bias correction); cosine schedule values and clipping; and a race on an ill-conditioned quadratic (κ = 100) in which momentum and Adam reach a far lower loss than SGD within 200 steps.',
  checks: `
import numpy as np
_w = np.array([1.0, -2.0]); _g = np.array([0.5, 4.0])
np.testing.assert_allclose(sgd(_w, _g, {}, 0.1)[0], [0.95, -2.4])
_s = {}; _v = np.zeros(1)
for _ in range(200):
    _v, _s = momentum(_v, np.array([-1.0]), _s, 0.0)
assert abs(_s["v"][0] + 10) < 1e-6, "Momentum velocity for a constant gradient must approach g/(1 - beta)"
_w1, _st = adam(np.zeros(2), np.array([1e-3, 50.0]), {}, 0.01)
np.testing.assert_allclose(np.abs(_w1), [0.01, 0.01], rtol=1e-4, err_msg="Adam's bias-corrected first step should be about lr for every coordinate")
assert _st["t"] == 1
print("PASS: SGD, momentum velocity and Adam bias correction")
assert abs(cosine_lr(0.1, 50, 100) - 0.05) < 1e-12 and abs(cosine_lr(0.1, 0, 100) - 0.1) < 1e-12 and abs(cosine_lr(0.1, 100, 100)) < 1e-12
np.testing.assert_allclose(clip(np.array([3.0, 4.0]), 1.0), [0.6, 0.8])
np.testing.assert_allclose(clip(np.array([0.3, 0.4]), 1.0), [0.3, 0.4])
print("PASS: cosine schedule and gradient clipping")
_H = np.array([1.0, 100.0])
_loss = lambda w: 0.5 * np.sum(_H * w ** 2)
def _race(opt, lr):
    w, s = np.array([5.0, 1.0]), {}
    for _ in range(200):
        w, s = opt(w, _H * w, s, lr)
    return _loss(w)
_ls, _lm, _la = _race(sgd, 0.019), _race(momentum, 0.0035), _race(adam, 0.1)
assert _lm < 0.01 * _ls and _la < 0.01 * _ls, f"On kappa = 100: sgd {_ls:.2e}, momentum {_lm:.2e}, adam {_la:.2e}"
print(f"PASS: after 200 steps on kappa = 100 — SGD {_ls:.2e}, momentum {_lm:.2e}, Adam {_la:.2e}")
`,
}
