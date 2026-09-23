const LOCAL = `# Run locally:  pip install torch numpy  &&  python verify_pytorch.py
# Reproduces a NumPy two-layer network in PyTorch and checks outputs,
# gradients, one optimizer step, and checkpoint/resume.
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

torch.set_default_dtype(torch.float64)
rng = np.random.default_rng(0)
X = rng.normal(size=(64, 2)); y = (X[:, 0] * X[:, 1] > 0).astype(int)
W1, b1 = rng.normal(0, 1, (2, 8)), np.zeros(8)
W2, b2 = rng.normal(0, 0.5, (8, 2)), np.zeros(2)

def numpy_forward_backward(W1, b1, W2, b2):
    Z1 = X @ W1 + b1; A1 = np.maximum(0, Z1); Z2 = A1 @ W2 + b2
    E = np.exp(Z2 - Z2.max(1, keepdims=True)); P = E / E.sum(1, keepdims=True)
    loss = -np.mean(np.log(P[np.arange(len(y)), y]))
    D2 = P.copy(); D2[np.arange(len(y)), y] -= 1; D2 /= len(y)
    D1 = (D2 @ W2.T) * (Z1 > 0)
    return loss, {"W1": X.T @ D1, "b1": D1.sum(0), "W2": A1.T @ D2, "b2": D2.sum(0)}

model = nn.Sequential(nn.Linear(2, 8), nn.ReLU(), nn.Linear(8, 2))
with torch.no_grad():                      # nn.Linear stores weight as (out, in): copy the transpose
    model[0].weight.copy_(torch.tensor(W1.T)); model[0].bias.copy_(torch.tensor(b1))
    model[2].weight.copy_(torch.tensor(W2.T)); model[2].bias.copy_(torch.tensor(b2))

Xt, yt = torch.tensor(X), torch.tensor(y)
loss = F.cross_entropy(model(Xt), yt)      # takes raw logits; applies log-softmax itself
loss.backward()
np_loss, np_grads = numpy_forward_backward(W1, b1, W2, b2)
print("loss        numpy %.10f  torch %.10f" % (np_loss, loss.item()))
np.testing.assert_allclose(loss.item(), np_loss, rtol=1e-10)
np.testing.assert_allclose(model[0].weight.grad.numpy().T, np_grads["W1"], rtol=1e-8, atol=1e-12)
np.testing.assert_allclose(model[2].weight.grad.numpy().T, np_grads["W2"], rtol=1e-8, atol=1e-12)
print("PASS: forward pass and every gradient match the NumPy implementation")

opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)
def train(steps):
    for _ in range(steps):
        opt.zero_grad(); F.cross_entropy(model(Xt), yt).backward(); opt.step()
train(20)
torch.save({"model": model.state_dict(), "opt": opt.state_dict()}, "ckpt.pt")
train(20); straight = [p.detach().clone() for p in model.parameters()]
ckpt = torch.load("ckpt.pt")
model.load_state_dict(ckpt["model"]); opt.load_state_dict(ckpt["opt"])
train(20)
for a, b in zip(straight, model.parameters()):
    assert torch.allclose(a, b), "Resumed training must match uninterrupted training"
print("PASS: checkpoint with optimizer state resumes training exactly")
`
export default {
  filename: 'mini_framework.py', packages: ['numpy'],
  title: 'Build the framework conventions yourself.',
  intro: 'Recreate the essential PyTorch conventions in NumPy: a `Linear` module that stores gradients that **accumulate**, `zero_grad`, a `Dropout` module with `train()`/`eval()` modes, an `SGD` optimizer with momentum state, and `state_dict`s that let training resume exactly. The checks deliberately misuse each piece to prove it behaves like the real thing.',
  steps: [
    '`Linear(d_in, d_out, rng)`: `W` (He init) and `b`; `forward(x)` caches x; `backward(dy)` **adds** into `dW`, `db` and returns `dx`; `params()` returns `[(W, dW), (b, db)]`-style pairs via a list of names.',
    '`zero_grad()` on `Linear` sets its gradients back to zero.',
    '`Dropout(p, rng)`: in training mode zero each input with probability p and scale survivors by 1/(1−p); in eval mode return the input unchanged. `train()` / `eval()` switch the mode.',
    '`SGD(module, lr, momentum)`: `step()` updates with a velocity per parameter; `state_dict()` / `load_state_dict()` copy that velocity.',
    '`Linear.state_dict()` / `load_state_dict()` copy W and b (as copies, not references).',
  ],
  hints: [
    ['Accumulate', '`self.dW += self.x.T @ dy` and `self.db += dy.sum(axis=0)`. `zero_grad` resets them with `np.zeros_like`.'],
    ['Dropout', '`mask = (self.rng.random(x.shape) >= self.p) / (1 - self.p)` in training mode; `return x * mask`.'],
    ['Momentum state', 'Keep `self.v = {"W": np.zeros_like(W), "b": ...}`; `v = momentum * v + grad`; `param -= lr * v` (in place, so the module sees it).'],
  ],
  starter: `import numpy as np

class Linear:
    def __init__(self, d_in, d_out, rng):
        raise NotImplementedError
    def forward(self, x):
        raise NotImplementedError
    def backward(self, dy):
        raise NotImplementedError
    def zero_grad(self):
        raise NotImplementedError
    def state_dict(self):
        raise NotImplementedError
    def load_state_dict(self, state):
        raise NotImplementedError

class Dropout:
    def __init__(self, p, rng):
        raise NotImplementedError
    def train(self):
        raise NotImplementedError
    def eval(self):
        raise NotImplementedError
    def forward(self, x):
        raise NotImplementedError

class SGD:
    def __init__(self, module, lr, momentum=0.0):
        raise NotImplementedError
    def step(self):
        raise NotImplementedError
    def state_dict(self):
        raise NotImplementedError
    def load_state_dict(self, state):
        raise NotImplementedError
`,
  solution: `import numpy as np

class Linear:
    def __init__(self, d_in, d_out, rng):
        self.W = rng.normal(0, np.sqrt(2 / d_in), size=(d_in, d_out))
        self.b = np.zeros(d_out)
        self.zero_grad()
    def forward(self, x):
        self.x = x
        return x @ self.W + self.b
    def backward(self, dy):
        self.dW += self.x.T @ dy
        self.db += dy.sum(axis=0)
        return dy @ self.W.T
    def zero_grad(self):
        self.dW, self.db = np.zeros_like(self.W), np.zeros_like(self.b)
    def state_dict(self):
        return {"W": self.W.copy(), "b": self.b.copy()}
    def load_state_dict(self, state):
        self.W[...] = state["W"]; self.b[...] = state["b"]

class Dropout:
    def __init__(self, p, rng):
        self.p, self.rng, self.training = p, rng, True
    def train(self):
        self.training = True
    def eval(self):
        self.training = False
    def forward(self, x):
        if not self.training or self.p == 0:
            return x
        return x * (self.rng.random(x.shape) >= self.p) / (1 - self.p)

class SGD:
    def __init__(self, module, lr, momentum=0.0):
        self.m, self.lr, self.mu = module, lr, momentum
        self.v = {"W": np.zeros_like(module.W), "b": np.zeros_like(module.b)}
    def step(self):
        for name, grad in (("W", self.m.dW), ("b", self.m.db)):
            self.v[name] = self.mu * self.v[name] + grad
            getattr(self.m, name)[...] -= self.lr * self.v[name]
    def state_dict(self):
        return {k: v.copy() for k, v in self.v.items()}
    def load_state_dict(self, state):
        self.v = {k: v.copy() for k, v in state.items()}
`,
  solutionNote: 'Parameters are updated in place (`[...] -=`), so the optimizer and the module always share the same arrays — the same contract as PyTorch. Gradients accumulate until `zero_grad` clears them.',
  checkSummary: 'Forward/backward shapes and a finite-difference check of `Linear`; gradient accumulation without `zero_grad`; dropout that is random and mean-preserving in training and the identity in eval mode; an SGD step that updates the module in place; state dicts that are copies; and a checkpoint test in which resuming with optimizer state matches an uninterrupted run exactly while resuming without it does not.',
  checks: `
import numpy as np
_rng = np.random.default_rng(0)
_L = Linear(3, 2, _rng)
assert _L.W.shape == (3, 2) and _L.b.shape == (2,)
_x = _rng.normal(size=(5, 3)); _t = _rng.normal(size=(5, 2))
_loss = lambda: 0.5 * np.sum((_L.forward(_x) - _t) ** 2)
_L.zero_grad(); _dx = _L.backward(_L.forward(_x) - _t)
assert _dx.shape == (5, 3)
_old = _L.W[1, 0]; _L.W[1, 0] = _old + 1e-6; _up = _loss(); _L.W[1, 0] = _old - 1e-6; _dn = _loss(); _L.W[1, 0] = _old
assert abs(_L.dW[1, 0] - (_up - _dn) / 2e-6) < 1e-5, "Linear.backward gradient mismatch"
_g1 = _L.dW.copy(); _L.backward(_L.forward(_x) - _t)
np.testing.assert_allclose(_L.dW, 2 * _g1, err_msg="Without zero_grad, gradients must accumulate")
_L.zero_grad(); assert np.all(_L.dW == 0) and np.all(_L.db == 0)
print("PASS: Linear forward/backward, accumulation and zero_grad")
_D = Dropout(0.5, np.random.default_rng(1)); _ones = np.ones((2000, 10))
_out = _D.forward(_ones)
assert set(np.unique(_out)) <= {0.0, 2.0} and abs(_out.mean() - 1) < 0.05, "Training-mode dropout must zero inputs and preserve the mean"
_D.eval(); assert np.array_equal(_D.forward(_ones), _ones), "Eval-mode dropout must be the identity"
_D.train(); assert not np.array_equal(_D.forward(_ones), _ones)
print("PASS: dropout train/eval modes")
def _fresh():
    m = Linear(3, 1, np.random.default_rng(5)); return m, SGD(m, 0.05, momentum=0.9)
_X = _rng.normal(size=(40, 3)); _Y = _X @ np.array([[1.0], [-2.0], [0.5]])
def _steps(m, o, k):
    for _ in range(k):
        m.zero_grad(); m.backward((m.forward(_X) - _Y) / len(_X)); o.step()
_m1, _o1 = _fresh(); _W_before = _m1.W
_steps(_m1, _o1, 10)
assert _m1.W is _W_before, "The optimizer must update parameters in place"
_ckpt_m, _ckpt_o = _m1.state_dict(), _o1.state_dict()
_ckpt_m["W"] += 0; assert _ckpt_m["W"] is not _m1.W, "state_dict must return copies"
_steps(_m1, _o1, 10); _straight = _m1.W.copy()
_m2, _o2 = _fresh(); _m2.load_state_dict(_ckpt_m); _o2.load_state_dict(_ckpt_o); _steps(_m2, _o2, 10)
np.testing.assert_allclose(_m2.W, _straight, err_msg="Resuming with optimizer state must match the uninterrupted run")
_m3, _o3 = _fresh(); _m3.load_state_dict(_ckpt_m); _steps(_m3, _o3, 10)
assert not np.allclose(_m3.W, _straight), "Resuming without optimizer state should take a different path"
print("PASS: in-place updates, state dicts and exact resume from a checkpoint")
`,
  local: { filename: 'verify_pytorch.py', note: 'PyTorch does not run in the browser. With Python and PyTorch installed (`pip install torch numpy`), this script rebuilds a NumPy two-layer network in PyTorch, checks the loss and every gradient against your NumPy backward pass, and verifies that a checkpoint with optimizer state resumes training exactly.', code: LOCAL },
}
