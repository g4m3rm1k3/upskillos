// Lab 21 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// NumPy first (every shape printed), scikit-learn only for the capacity comparison in 21.5.

export const extras = {
  'l21-layers': {
    formulaTex: '$$Z^{(l)} = A^{(l-1)}W^{(l)} + b^{(l)} \\qquad A^{(l)} = \\varphi\\big(Z^{(l)}\\big)$$ $$(n \\times d_{l-1})\\,(d_{l-1} \\times d_l) \\to (n \\times d_l)$$',
    mathCode: {
      rows: [
        ['$A^{(0)} = X$', 'X = np.array([[0., 0.], ...])', 'The input: one row per example, shape (n, d).'],
        ['$W^{(l)}$, $b^{(l)}$', 'W.shape == (d_in, m); b.shape == (m,)', 'One column of W and one entry of b per unit.'],
        ['$Z = XW + b$', 'Z = X @ W + b', 'b is broadcast across the rows.'],
        ['$\\varphi$', 'np.maximum(0, Z)', 'The activation, applied entry by entry (here ReLU).'],
        ['$\\sum_l (d_{l-1}d_l + d_l)$', 'n_params(widths)', 'Weights plus biases, layer by layer.'],
      ],
    },
    notebook: {
      title: 'Lab 21.1 · From one neuron to layers',
      intro: 'One dense layer on the four XOR corners, every shape printed, and the parameter count of any network.',
      cells: [
        {
          title: 'A layer is a matrix product',
          prose: '**Predict** the shape of Z, and which corner gives unit 3 a positive value.',
          code: `import numpy as np
# The four XOR corners: one row per example, one column per feature.
X = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])      # shape (n, d) = (4, 2)
W = np.array([[1., -1., 2.],
              [1., -1., -2.]])                              # shape (d, m) = (2, 3): 3 units
b = np.array([-0.5, 1.5, 0.])                              # shape (m,): one bias per unit
Z = X @ W + b                                              # (4, 2) @ (2, 3) -> (4, 3); b is added to every row
A = np.maximum(0, Z)                                       # ReLU, elementwise
print("Z shape", Z.shape)
print(Z)
print("A = ReLU(Z)")
print(A)`,
        },
        {
          title: 'Counting parameters',
          prose: '**Predict** the count for 2 → 8 → 8 → 2 before running.',
          code: `def n_params(widths):
    """Weights and biases of a dense network with these layer widths, input first."""
    return sum(d_in * d_out + d_out for d_in, d_out in zip(widths[:-1], widths[1:]))

for widths in ([2, 8, 2], [2, 8, 8, 2], [20, 64, 64, 3], [784, 128, 10]):
    print(" -> ".join(map(str, widths)), ":", n_params(widths), "parameters")`,
        },
      ],
    },
  },
  'l21-activations': {
    formulaTex: '$$(XW_1)W_2 = X(W_1W_2)$$ $$\\sigma\'(z) = \\sigma(1-\\sigma) \\le \\tfrac14$$ $$\\tanh\'(z) = 1 - \\tanh^2 z \\le 1$$',
    mathCode: {
      rows: [
        ['$(XW_1)W_2 = X(W_1W_2)$', 'np.allclose((X @ W1) @ W2, X @ (W1 @ W2))', 'Stacked linear layers are one linear layer.'],
        ['$\\sigma\'(z)$', 'sig * (1 - sig)', 'At most 0.25, at z = 0.'],
        ['$\\tanh\'(z)$', '1 - np.tanh(z) ** 2', 'At most 1, at z = 0.'],
        ['$\\mathrm{ReLU}\'(z)$', '(z > 0).astype(float)', '1 for positive inputs, 0 otherwise.'],
        ['$(\\tfrac14)^L$', '0.25 ** depth', 'The best case through L sigmoid layers.'],
      ],
    },
    notebook: {
      title: 'Lab 21.2 · Why nonlinear activations',
      intro: 'Linear layers collapse into one; activation slopes decide how much gradient survives each layer.',
      cells: [
        {
          title: 'Two linear layers are one',
          prose: '**Predict** the shape of the combined weights.',
          code: `import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(5, 2))
W1, W2 = rng.normal(size=(2, 4)), rng.normal(size=(4, 3))
two_layers = (X @ W1) @ W2           # two linear layers, no activation between them
one_layer = X @ (W1 @ W2)            # one linear layer with the product as its weights
print("the same map?", np.allclose(two_layers, one_layer), "  combined weights shape", (W1 @ W2).shape)`,
        },
        {
          title: 'How much gradient each activation passes',
          prose: '**Predict** the sigmoid’s slope at z = 0.',
          code: `import numpy as np
z = np.array([-4., -2., 0., 2., 4.])
sig = 1 / (1 + np.exp(-z))
print("z          ", z)
print("sigmoid'   ", np.round(sig * (1 - sig), 4))
print("tanh'      ", np.round(1 - np.tanh(z) ** 2, 4))
print("ReLU'      ", (z > 0).astype(float))
for depth in [1, 5, 10]:
    print(f"best case through {depth:2d} sigmoid layers: gradient times {0.25 ** depth:.2e}")`,
        },
      ],
    },
  },
  'l21-softmax': {
    formulaTex: '$$p_k = \\frac{e^{z_k - m}}{\\sum_j e^{z_j - m}},\\ m = \\max_j z_j$$ $$L = -\\log p_y \\qquad \\frac{\\partial L}{\\partial z_k} = p_k - [k = y]$$',
    mathCode: {
      rows: [
        ['$p_k$', 'np.exp(z - z.max()) / np.exp(z - z.max()).sum()', 'Softmax, with the largest score subtracted first.'],
        ['$L = -\\log p_y$', '-np.log(softmax(z)[y])', 'Cross-entropy for one example with true class y.'],
        ['$[k = y]$', 'np.eye(3)[y]', 'The one-hot vector of the true class.'],
        ['$\\partial L/\\partial z$', 'p - np.eye(3)[y]', 'Prediction minus target, once more.'],
      ],
    },
    notebook: {
      title: 'Lab 21.3 · Softmax and cross-entropy',
      intro: 'Why the largest score is subtracted, and a finite-difference check of p − 1[y].',
      cells: [
        {
          title: 'Overflow, and the fix',
          prose: '**Predict** what the naive softmax prints for scores near 1000.',
          code: `import numpy as np
z = np.array([1000., 1001., 1002.])
with np.errstate(over="ignore", invalid="ignore"):
    naive = np.exp(z) / np.exp(z).sum()          # e^1000 overflows to inf; inf / inf is nan
stable = np.exp(z - z.max()) / np.exp(z - z.max()).sum()
print("naive :", naive)
print("stable:", np.round(stable, 3), "  sums to", stable.sum())`,
        },
        {
          title: 'The gradient, checked',
          prose: 'The lesson’s scores (2, 1, 0) with true class 0. **Then change** y to 2.',
          code: `import numpy as np
def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()
def loss(z, y):
    return -np.log(softmax(z)[y])

z, y = np.array([2., 1., 0.]), 0
p = softmax(z)
analytic = p - np.eye(3)[y]                      # p minus the one-hot truth
eps = 1e-6
numeric = np.array([(loss(z + eps * np.eye(3)[k], y) - loss(z - eps * np.eye(3)[k], y)) / (2 * eps) for k in range(3)])
print("p       ", np.round(p, 3), "  loss", round(loss(z, y), 3))
print("p - 1[y]", np.round(analytic, 4))
print("numeric ", np.round(numeric, 4))`,
        },
      ],
    },
  },
  'l21-backprop': {
    formulaTex: '$$\\frac{\\partial L}{\\partial W^{(l)}} = A^{(l-1)\\top}\\Delta^{(l)} \\qquad \\frac{\\partial L}{\\partial b^{(l)}} = \\mathbf 1^\\top \\Delta^{(l)}$$ $$\\Delta^{(l-1)} = \\big(\\Delta^{(l)}W^{(l)\\top}\\big) \\odot \\varphi\\,\\prime\\big(Z^{(l-1)}\\big)$$',
    mathCode: {
      rows: [
        ['$\\Delta^{(L)} = (P - Y)/n$', 'D2 = (P - Y) / n', 'The output layer’s error signal, (n, k).'],
        ['$A^{(l-1)\\top}\\Delta^{(l)}$', 'dW2 = A1.T @ D2', 'Input times error, summed over the batch: (h, k).'],
        ['$\\mathbf 1^\\top \\Delta$', 'db2 = D2.sum(0)', 'Bias gradients: column sums.'],
        ['$(\\Delta W^\\top) \\odot \\varphi\\,\\prime(Z)$', 'D1 = (D2 @ W2.T) * (Z1 > 0)', 'Back through the weights, then through ReLU.'],
        ['$\\mathcal N(0, 2/\\mathrm{fan_{in}})$', 'rng.normal(0, np.sqrt(2 / d), (d, h))', 'He initialization for ReLU layers.'],
      ],
    },
    notebook: {
      title: 'Lab 21.4 · Backpropagation in matrix form, and initialization',
      intro: 'A two-layer backward pass checked weight by weight, what all-zero weights do, and how the initial scale carries through ten layers.',
      cells: [
        {
          title: 'A two-layer backward pass, checked',
          prose: '**Predict** the shape of dW1 before running.',
          code: `import numpy as np
rng = np.random.default_rng(1)
n, d, h, k = 6, 2, 5, 3
X, y = rng.normal(size=(n, d)), rng.integers(0, k, n)
Y = np.eye(k)[y]                                          # one-hot targets, (n, k)
W1, b1 = rng.normal(0, np.sqrt(2 / d), (d, h)), np.zeros(h)
W2, b2 = rng.normal(0, np.sqrt(2 / h), (h, k)), np.zeros(k)

def forward(W1, b1, W2, b2):
    Z1 = X @ W1 + b1; A1 = np.maximum(0, Z1)              # hidden layer, (n, h)
    Z2 = A1 @ W2 + b2                                     # scores, (n, k)
    P = np.exp(Z2 - Z2.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
    return Z1, A1, P, -np.mean(np.log(P[np.arange(n), y]))

Z1, A1, P, L = forward(W1, b1, W2, b2)
D2 = (P - Y) / n                                          # dL/dZ2, (n, k)
dW2, db2 = A1.T @ D2, D2.sum(0)                           # (h, k), (k,)
D1 = (D2 @ W2.T) * (Z1 > 0)                               # dL/dZ1, (n, h): back through ReLU
dW1, db1 = X.T @ D1, D1.sum(0)                            # (d, h), (h,)
print("shapes: dW1", dW1.shape, " dW2", dW2.shape)

eps, worst = 1e-6, 0.0
for W, dW in [(W1, dW1), (W2, dW2)]:
    for idx in [(0, 0), (1, 2)]:                          # two weights per layer
        old = W[idx]
        W[idx] = old + eps; up = forward(W1, b1, W2, b2)[3]
        W[idx] = old - eps; down = forward(W1, b1, W2, b2)[3]
        W[idx] = old
        numeric = (up - down) / (2 * eps)
        worst = max(worst, abs(numeric - dW[idx]) / max(1, abs(numeric), abs(dW[idx])))
print(f"largest relative error over four checked weights: {worst:.1e}")`,
        },
        {
          title: 'All zeros',
          prose: 'XOR with every weight starting at 0 and tanh units. **Predict** the hidden weights after 500 steps.',
          code: `import numpy as np
X = np.array([[0., 0.], [0., 1.], [1., 0.], [1., 1.]]); y = np.array([0, 1, 1, 0])     # XOR
Y = np.eye(2)[y]
W1, b1, W2, b2 = np.zeros((2, 4)), np.zeros(4), np.zeros((4, 2)), np.zeros(2)          # all zeros
for step in range(500):
    Z1 = X @ W1 + b1; A1 = np.tanh(Z1); Z2 = A1 @ W2 + b2
    P = np.exp(Z2 - Z2.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
    D2 = (P - Y) / 4; D1 = (D2 @ W2.T) * (1 - A1 ** 2)
    W2 -= 0.5 * A1.T @ D2; b2 -= 0.5 * D2.sum(0); W1 -= 0.5 * X.T @ D1; b1 -= 0.5 * D1.sum(0)
print("hidden weights after 500 steps (one column per unit):")
print(np.round(W1, 4))
print("loss", round(-np.mean(np.log(P[np.arange(4), y])), 4), "  (log 2 =", round(np.log(2), 4), ")")`,
        },
        {
          title: 'The scale of the first weights',
          prose: '**Predict** which setting keeps the spread near 1 through all ten layers.',
          code: `import numpy as np
rng = np.random.default_rng(0)
x = rng.normal(size=(500, 100))                           # 500 examples, 100 features
for name, std in [("tiny, 0.01", lambda fan_in: 0.01), ("He, sqrt(2/fan_in)", lambda fan_in: np.sqrt(2 / fan_in)), ("large, 1.0", lambda fan_in: 1.0)]:
    a, spreads = x, []
    for layer in range(10):
        W = rng.normal(0, std(a.shape[1]), (a.shape[1], 100))
        a = np.maximum(0, a @ W)                          # 10 ReLU layers of width 100
        spreads.append(a.std())
    print(f"{name:20s} activation spread after layers 1, 5, 10: {spreads[0]:.3g}, {spreads[4]:.3g}, {spreads[9]:.3g}")`,
        },
      ],
    },
  },
  'l21-train': {
    formulaTex: '$$P = f_\\theta(X) \\qquad L = -\\tfrac1n\\sum_i \\log P_{i, y_i}$$ $$\\theta \\leftarrow \\theta - \\alpha\\,\\nabla_\\theta L$$',
    mathCode: {
      rows: [
        ['$f_\\theta(X)$', 'forward pass: Z1, A1, Z2, P', 'The network with all its parameters θ.'],
        ['$L$', '-np.mean(np.log(P[np.arange(n), y]))', 'Mean cross-entropy over the training set.'],
        ['$\\theta \\leftarrow \\theta - \\alpha\\nabla L$', 'W1 -= lr * X.T @ D1', 'Full-batch gradient descent.'],
      ],
    },
    notebook: {
      title: 'Lab 21.5 · Training and diagnosing a network',
      intro: 'The whole loop on XOR, then how width and depth limit what a network can fit.',
      cells: [
        {
          title: 'Training on XOR',
          prose: '200 points in the four XOR quadrants, a 2 → 8 → 2 ReLU network. **Predict** the loss at step 1.',
          code: `import numpy as np
rng = np.random.default_rng(3)
n = 200
X = rng.uniform(-1, 1, (n, 2)); y = ((X[:, 0] > 0) != (X[:, 1] > 0)).astype(int)   # XOR quadrants, no label noise
Y = np.eye(2)[y]
W1, b1 = rng.normal(0, np.sqrt(2 / 2), (2, 8)), np.zeros(8)
W2, b2 = rng.normal(0, np.sqrt(2 / 8), (8, 2)), np.zeros(2)
lr = 0.5
for step in range(1, 1501):
    Z1 = X @ W1 + b1; A1 = np.maximum(0, Z1); Z2 = A1 @ W2 + b2
    P = np.exp(Z2 - Z2.max(1, keepdims=True)); P /= P.sum(1, keepdims=True)
    L = -np.mean(np.log(P[np.arange(n), y]))
    D2 = (P - Y) / n; D1 = (D2 @ W2.T) * (Z1 > 0)
    W2 -= lr * A1.T @ D2; b2 -= lr * D2.sum(0); W1 -= lr * X.T @ D1; b1 -= lr * D1.sum(0)
    if step in (1, 100, 500, 1500):
        print(f"step {step:4d}: loss {L:.3f}, training accuracy {np.mean(P.argmax(1) == y):.2f}")`,
        },
        {
          title: 'Capacity',
          prose: 'A three-arm spiral like the playground’s: 180 points to train on, 600 to validate. **Predict** which network is capacity-limited.',
          code: `import numpy as np
from sklearn.neural_network import MLPClassifier
rng = np.random.default_rng(5)
def spiral(n):
    c = np.arange(n) % 3; r = rng.random(n); t = c * 2.1 + r * 4 + 0.25 * rng.normal(size=n)
    return np.column_stack([r * np.cos(t) * 2, r * np.sin(t) * 2]), c
X_train, y_train = spiral(180); X_val, y_val = spiral(600)
for hidden in [(1,), (4,), (32, 32)]:
    net = MLPClassifier(hidden, max_iter=3000, random_state=0).fit(X_train, y_train)
    print(f"hidden layers {str(hidden):8s}: training accuracy {net.score(X_train, y_train):.2f}, validation {net.score(X_val, y_val):.2f}")`,
        },
      ],
    },
  },
}
