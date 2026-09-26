// Lab 23 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// PyTorch does not run in the browser. These cells are NumPy and plain Python that follow PyTorch's conventions,
// and say so; each lesson also shows the real PyTorch code with its output from a local run (blocks.js), and the
// Implement tab offers verify_pytorch.py, which was run against PyTorch 2.14.0 (CPU) and passed.

export const extras = {
  'l23-tensors': {
    formulaTex: '$$y = x^2 + 2x \\qquad \\frac{dy}{dx} = 2x + 2$$ $$\\bar x \\mathrel{+}= \\frac{dy}{dx}$$',
    mathCode: {
      rows: [
        ['$x$ with requires_grad', 'x = torch.tensor(3.0, requires_grad=True)', 'PyTorch records every operation on x.'],
        ['$\\bar x \\mathrel{+}= dy/dx$', 'y.backward()  ->  x.grad', 'backward adds into .grad; it does not overwrite.'],
        ['$\\bar x \\leftarrow 0$', 'optimizer.zero_grad()', 'Clear the accumulated gradients before the next pass.'],
      ],
    },
    notebook: {
      title: 'Lab 23.1 · Tensors and autograd',
      intro: 'Accumulation into .grad, reproduced in plain Python. The PyTorch version and its output are below the cell.',
      cells: [
        {
          title: 'A gradient that accumulates',
          prose: '**Predict** .grad after the second backward.',
          code: `# NumPy/Python, not PyTorch: a scalar with a .grad that accumulates, like a tensor with requires_grad=True.
class Scalar:
    def __init__(self, value):
        self.value, self.grad = value, 0.0

def backward_of_y(x):
    """y = x**2 + 2*x; add dy/dx into x.grad, the way loss.backward() adds into .grad."""
    x.grad += 2 * x.value + 2

x = Scalar(3.0)
backward_of_y(x); print("after one backward :", x.grad)
backward_of_y(x); print("after a second one :", x.grad, "  <- accumulated, as in PyTorch")
x.grad = 0.0                                     # what optimizer.zero_grad() does
backward_of_y(x); print("after zeroing first:", x.grad)`,
        },
      ],
    },
  },
  'l23-modules': {
    formulaTex: '$$\\mathrm{Linear}(x) = xW^\\top + b,\\ \\ W \\in \\mathbb R^{d_\\mathrm{out} \\times d_\\mathrm{in}}$$ $$d_\\mathrm{in}d_\\mathrm{out} + d_\\mathrm{out}$$',
    mathCode: {
      rows: [
        ['$W^\\top$', 'x @ self.weight.T + self.bias', 'nn.Linear stores its weight as (out, in) and transposes it.'],
        ['parameters', 'model.parameters()', 'Every trainable array, found through the layers.'],
        ['$d_\\mathrm{in}d_\\mathrm{out} + d_\\mathrm{out}$', 'sum(p.size for p in model.parameters())', 'The count; p.numel() in PyTorch.'],
      ],
    },
    notebook: {
      title: 'Lab 23.2 · Modules, parameters and optimizers',
      intro: 'A NumPy stand-in for nn.Linear and nn.Sequential, with PyTorch’s weight convention.',
      cells: [
        {
          title: 'Linear and Sequential, the PyTorch way',
          prose: '**Predict** the four parameter shapes before running.',
          code: `import numpy as np
# NumPy, not PyTorch: a dense layer stored the way nn.Linear stores it.
class Linear:
    def __init__(self, d_in, d_out, rng):
        self.weight = rng.normal(0, 1 / np.sqrt(d_in), (d_out, d_in))   # (out, in), as in PyTorch
        self.bias = np.zeros(d_out)
    def __call__(self, x):
        return x @ self.weight.T + self.bias                             # nn.Linear computes x W^T + b
    def parameters(self):
        return [self.weight, self.bias]

class Sequential:
    def __init__(self, *layers): self.layers = layers
    def __call__(self, x):
        for layer in self.layers: x = layer(x)
        return x
    def parameters(self):
        return [p for layer in self.layers if hasattr(layer, "parameters") for p in layer.parameters()]

relu = lambda z: np.maximum(0, z)
rng = np.random.default_rng(0)
model = Sequential(Linear(2, 8, rng), relu, Linear(8, 2, rng))
print("weight shapes:", [p.shape for p in model.parameters()])
print("parameters:", sum(p.size for p in model.parameters()))
print("output for a batch of 4:", model(rng.normal(size=(4, 2))).shape)`,
        },
      ],
    },
  },
  'l23-loop': {
    formulaTex: '$$v \\leftarrow 0.9\\,v + g \\qquad w \\leftarrow w - \\alpha v$$ $$g_t = \\sum_{s \\le t} \\nabla L_s$$',
    mathCode: {
      rows: [
        ['zero_grad', 'gw = gb = 0.0', 'Start each step’s gradient from zero.'],
        ['$g_t = \\sum_{s \\le t} \\nabla L_s$', 'gw += ... with no reset', 'Without zero_grad the step uses the sum of every gradient so far.'],
        ['backward', 'gw += 2 * np.mean(e * x)', 'Gradients are added into the stored ones.'],
        ['step', 'vw = 0.9 * vw + gw; w -= 0.02 * vw', 'Momentum SGD, as in the playground.'],
        ['train() / eval()', 'dropout(a, p, training, rng)', 'Dropout only drops while training.'],
      ],
    },
    notebook: {
      title: 'Lab 23.3 · The training loop, line by line',
      intro: 'What happens without zero_grad, and why dropout needs train() and eval().',
      cells: [
        {
          title: 'Without zero_grad',
          prose: 'The same loop twice. **Predict** the loss at step 100 without the reset.',
          code: `import numpy as np
# NumPy, not PyTorch: the loop of 23.3 with momentum SGD (as in the playground), zero_grad on and off.
x = np.linspace(-2, 2, 64); y = 3 * x - 1
for zero_grad in (True, False):
    w = b = 0.0; gw = gb = 0.0; vw = vb = 0.0
    for step in range(1, 101):
        if zero_grad: gw = gb = 0.0                                  # opt.zero_grad()
        e = w * x + b - y
        gw += 2 * np.mean(e * x); gb += 2 * np.mean(e)               # loss.backward() adds into .grad
        vw = 0.9 * vw + gw; vb = 0.9 * vb + gb                       # opt.step(): momentum 0.9 ...
        w -= 0.02 * vw; b -= 0.02 * vb                               # ... then the update
        loss = np.mean((w * x + b - y) ** 2)
        if step in (10, 50, 100):
            print(f"zero_grad {'on ' if zero_grad else 'off'}: step {step:3d}, loss {loss:.3g}")`,
        },
        {
          title: 'train() and eval()',
          prose: '**Predict** what eval mode returns.',
          code: `import numpy as np
# NumPy, not PyTorch: dropout, the layer that behaves differently in train() and eval() mode.
def dropout(a, p, training, rng):
    if not training:
        return a                                      # eval(): pass everything through
    keep = rng.random(a.shape) >= p                   # train(): zero each value with probability p ...
    return a * keep / (1 - p)                         # ... and scale the rest so the mean is unchanged
rng = np.random.default_rng(0)
a = np.ones(10)
print("train, run 1:", dropout(a, 0.5, True, rng))
print("train, run 2:", dropout(a, 0.5, True, rng))
print("eval        :", dropout(a, 0.5, False, rng))
print("mean over 10,000 training draws:", round(dropout(np.ones(10_000), 0.5, True, rng).mean(), 3))`,
        },
      ],
    },
  },
  'l23-verify': {
    formulaTex: '$$W_\\mathrm{framework} = W_\\mathrm{ours}^\\top$$ $$|a - b| \\le \\mathrm{atol} + \\mathrm{rtol}\\cdot|b|$$',
    mathCode: {
      rows: [
        ['$W^\\top$', 'framework_weight = W.T', 'Copy the transpose into nn.Linear’s weight.'],
        ['float32 / float64', 'X.astype(np.float32)', 'About 7 and 16 significant digits.'],
        ['$\\mathrm{atol} + \\mathrm{rtol}\\,|b|$', 'np.allclose(a, b, rtol=1e-5, atol=1e-5 * scale)', 'np.allclose’s test, entry by entry.'],
      ],
    },
    notebook: {
      title: 'Lab 23.4 · Verifying a framework model against your own',
      intro: 'The transpose that nn.Linear expects, and a tolerance that works between float32 and float64.',
      cells: [
        {
          title: 'The weight convention',
          prose: '**Predict** the framework weight’s shape.',
          code: `import numpy as np
rng = np.random.default_rng(1)
X = rng.normal(size=(4, 8))
W = rng.normal(size=(8, 2))                      # Lab 21 convention: (in, out)
ours = X @ W
framework_weight = W.T                           # what must be copied into nn.Linear(8, 2).weight: (out, in)
theirs = X @ framework_weight.T                  # nn.Linear computes x W^T
print("framework weight shape:", framework_weight.shape, "  outputs agree:", np.allclose(ours, theirs))
try:
    wrong = X @ W.T                               # forgetting a transpose
except ValueError as e:
    print("forgetting the transpose:", e)`,
        },
        {
          title: 'float32 against float64',
          prose: '**Predict** whether a purely relative test passes.',
          code: `import numpy as np
rng = np.random.default_rng(2)
X, W = rng.normal(size=(64, 256)), rng.normal(size=(256, 10))
exact = X @ W                                             # float64, NumPy's default
single = X.astype(np.float32) @ W.astype(np.float32)      # float32, PyTorch's default
scale = np.abs(exact).max()
print(f"largest difference, relative to the largest output: {np.abs(single - exact).max() / scale:.1e}")
print("allclose, rtol=1e-5 and atol=0          :", np.allclose(single, exact, rtol=1e-5, atol=0))
print("allclose, rtol=1e-5 and atol=1e-5 * scale:", np.allclose(single, exact, rtol=1e-5, atol=1e-5 * scale))
print("smallest output:", round(np.abs(exact).min(), 4), " <- near zero, a purely relative test is too strict")`,
        },
      ],
    },
  },
  'l23-checkpoints': {
    formulaTex: '$$c = (\\theta,\\ s,\\ t)$$',
    mathCode: {
      rows: [
        ['$c$', 'np.savez(buffer, params=..., velocity=...)', 'A checkpoint: everything needed to continue exactly.'],
        ['$\\theta$', 'params', 'The weights: model.state_dict() in PyTorch.'],
        ['$s$', 'velocity', 'The optimizer’s state: opt.state_dict().'],
        ['$t$', 'step', 'The step number (and any schedule’s state).'],
        ['seed', 'np.random.default_rng(42)', 'Same seed, same numbers; torch.manual_seed in PyTorch.'],
      ],
    },
    notebook: {
      title: 'Lab 23.5 · Devices, checkpoints and reproducibility',
      intro: 'Resume momentum SGD from a checkpoint with and without its velocity, and check that a seed repeats.',
      cells: [
        {
          title: 'Resuming, with and without the optimizer’s state',
          prose: '**Predict** which resumed run matches the uninterrupted one exactly.',
          code: `import numpy as np, io
# NumPy, not PyTorch: resume momentum SGD from a checkpoint, with and without the optimizer's state.
x = np.linspace(-2, 2, 64); y = 3 * x - 1
def train(params, velocity, steps):
    w, b = params; vw, vb = velocity
    for _ in range(steps):
        e = w * x + b - y
        vw = 0.9 * vw + 2 * np.mean(e * x); vb = 0.9 * vb + 2 * np.mean(e)
        w -= 0.02 * vw; b -= 0.02 * vb
    return (w, b), (vw, vb)

full, _ = train((0.0, 0.0), (0.0, 0.0), 40)                 # uninterrupted
half, vel = train((0.0, 0.0), (0.0, 0.0), 20)               # stopped after 20 steps
buffer = io.BytesIO(); np.savez(buffer, params=half, velocity=vel); buffer.seek(0)
ckpt = np.load(buffer)
resumed, _ = train(tuple(ckpt["params"]), tuple(ckpt["velocity"]), 20)
fresh, _ = train(tuple(ckpt["params"]), (0.0, 0.0), 20)      # optimizer state forgotten
print(f"with velocity    : w differs from the uninterrupted run by {abs(resumed[0] - full[0]):.2e}")
print(f"without velocity : w differs by {abs(fresh[0] - full[0]):.2e}")`,
        },
        {
          title: 'Seeds',
          prose: '**Predict** whether two generators with seed 42 agree.',
          code: `import numpy as np
a = np.random.default_rng(42).normal(size=3)
b = np.random.default_rng(42).normal(size=3)
c = np.random.default_rng(43).normal(size=3)
print("same seed, same numbers:", np.array_equal(a, b), "   another seed:", np.round(c, 3))`,
        },
      ],
    },
  },
}
