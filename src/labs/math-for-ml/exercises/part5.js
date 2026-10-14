// Part 5 exercises: each big equation written out in plain Python, and checked against a numerical
// derivative or a known answer, so the derivation in the lesson is confirmed by running it.
import { checks, py } from './checks.js'

// A numerical gradient over a flat list of parameters, used by the checks to confirm hand-derived ones.
const NUMGRAD = py`
def numgrad(f, params, h=1e-6):
    out = []
    for i in range(len(params)):
        up, dn = list(params), list(params)
        up[i] += h
        dn[i] -= h
        out.append((f(up) - f(dn)) / (2 * h))
    return out
`

const SIGMOID = py`import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))
`

export const EXERCISES = {
  'linear-regression': {
    prompt: py`Each example now has **several** inputs, $\mathbf x^{(i)} \in \mathbb R^d$. Write \`predict(w, b, x)\` $= \mathbf w^\top\mathbf x + b$ and \`J(w, b, X, y)\` $= \frac1n\sum_{i=1}^n\left(\mathbf w^\top\mathbf x^{(i)} + b - y^{(i)}\right)^2$, where \`X\` is a list of input vectors and \`y\` a list of targets.`,
    starter: py`def predict(w, b, x):
    ...

def J(w, b, X, y):
    ...
`,
    solution: py`def predict(w, b, x):
    return sum(wj * xj for wj, xj in zip(w, x)) + b

def J(w, b, X, y):
    return sum((predict(w, b, x) - t) ** 2 for x, t in zip(X, y)) / len(X)
`,
    checks: checks(py`
X = [[1, 2], [2, 0], [3, 1], [0, 4]]
y = [8, 7, 10.5, 9]
expect(predict([2, 1.5], 3, [1, 2]), 8, "predict([2, 1.5], 3, [1, 2])")
expect(J([2, 1.5], 3, X, y), 0, "J at weights that fit every example exactly")
expect(J([0, 0], 0, X, y), (64 + 49 + 110.25 + 81) / 4, "J([0, 0], 0, X, y)")
expect(J([1, 1], 0, X, y), (25 + 25 + 42.25 + 25) / 4, "J([1, 1], 0, X, y)")
`),
    hints: ['$\\mathbf w^\\top\\mathbf x$ is a dot product.', 'Average the squared misses over all $n$ examples.'],
  },

  'regression-gradient': {
    prompt: py`Derive and code the gradient for many inputs: $\frac{\partial J}{\partial w_j} = \frac2n\sum_i e_i\,x^{(i)}_j$ and $\frac{\partial J}{\partial b} = \frac2n\sum_i e_i$, where $e_i = \hat y^{(i)} - y^{(i)}$. Write \`gradient(w, b, X, y)\` returning \`(gw, gb)\`, with \`gw\` a list. Then train from zeros with rate 0.02 for 20000 steps and store \`(w, b)\` in \`trained\`. The checks compare with numerical partial derivatives and with the exact answer.`,
    starter: py`def predict(w, b, x):
    return sum(wj * xj for wj, xj in zip(w, x)) + b

def gradient(w, b, X, y):
    ...

X = [[1, 2], [2, 0], [3, 1], [0, 4]]
y = [8, 7, 10.5, 9]
trained = None
`,
    solution: py`def predict(w, b, x):
    return sum(wj * xj for wj, xj in zip(w, x)) + b

def gradient(w, b, X, y):
    n = len(X)
    gw = [0.0] * len(w)
    gb = 0.0
    for x, t in zip(X, y):
        e = predict(w, b, x) - t
        for j in range(len(w)):
            gw[j] += 2 * e * x[j] / n
        gb += 2 * e / n
    return gw, gb

X = [[1, 2], [2, 0], [3, 1], [0, 4]]
y = [8, 7, 10.5, 9]
w, b = [0.0, 0.0], 0.0
for _ in range(20000):
    gw, gb = gradient(w, b, X, y)
    w = [wj - 0.02 * g for wj, g in zip(w, gw)]
    b = b - 0.02 * gb
trained = (w, b)
`,
    checks: checks(NUMGRAD + py`
J = lambda p: sum((p[0] * x[0] + p[1] * x[1] + p[2] - t) ** 2 for x, t in zip(X, y)) / len(X)
for p in [[0, 0, 0], [1, -1, 2], [2, 1.5, 3]]:
    gw, gb = gradient(p[:2], p[2], X, y)
    expect(gw + [gb], numgrad(J, p), f"gradient at w = {p[:2]}, b = {p[2]}", tol=1e-5)
expect(trained[0], [2, 1.5], "the trained w", tol=1e-4)
expect(trained[1], 3, "the trained b", tol=1e-4)
`),
    hints: ['Compute the miss $e_i$ once per example, then add its share to every $w_j$ and to $b$.', 'Each $w_j$ steps by its own partial derivative.'],
  },

  regularisation: {
    prompt: py`Ridge regression for one input: minimise $\frac1n\sum_i(wx_i + b - y_i)^2 + \lambda w^2$ (no penalty on $b$). Write \`ridge_gradient(w, b, xs, ys, lam)\` and \`fit(xs, ys, lam)\` (gradient descent from 0, rate 0.02, 5000 steps). The checks confirm that larger λ shrinks $w$, and compare your answer with the exact solution of the penalised normal equations.`,
    starter: py`def ridge_gradient(w, b, xs, ys, lam):
    ...

def fit(xs, ys, lam):
    ...
`,
    solution: py`def ridge_gradient(w, b, xs, ys, lam):
    n = len(xs)
    gw = sum(2 * (w * x + b - y) * x for x, y in zip(xs, ys)) / n + 2 * lam * w
    gb = sum(2 * (w * x + b - y) for x, y in zip(xs, ys)) / n
    return gw, gb

def fit(xs, ys, lam):
    w, b = 0.0, 0.0
    for _ in range(5000):
        gw, gb = ridge_gradient(w, b, xs, ys, lam)
        w, b = w - 0.02 * gw, b - 0.02 * gb
    return w, b
`,
    checks: checks(py`
xs, ys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0], [52.0, 55.0, 61.0, 64.0, 70.0, 71.0]
def exact(lam):
    n = len(xs)
    sxx, sx = sum(x * x for x in xs), sum(xs)
    sxy, sy = sum(x * y for x, y in zip(xs, ys)), sum(ys)
    det = (sxx + n * lam) * n - sx * sx
    return (n * sxy - sx * sy) / det, ((sxx + n * lam) * sy - sx * sxy) / det
for lam in [0, 1, 10]:
    expect(fit(xs, ys, lam), exact(lam), f"fit(…, λ = {lam})", tol=1e-6)
ws = [fit(xs, ys, lam)[0] for lam in [0, 0.5, 2, 10]]
assert ws == sorted(ws, reverse=True), f"w should shrink as λ grows: {ws}"
`),
    hints: ['The penalty $\\lambda w^2$ adds $2\\lambda w$ to $\\partial/\\partial w$ and nothing to $\\partial/\\partial b$.'],
  },

  'logistic-regression': {
    prompt: py`Write \`loss(w, b, xs, ys)\`, the average binary cross-entropy of $p_i = \sigma(wx_i + b)$, and \`gradient(w, b, xs, ys)\`, which uses the lesson's result $\frac{\partial}{\partial w} = \frac1n\sum_i(p_i - y_i)x_i$, $\frac{\partial}{\partial b} = \frac1n\sum_i(p_i - y_i)$. The checks compare your gradient with numerical slopes of your loss: if the derivation were wrong, they would disagree.`,
    starter: SIGMOID + py`
def loss(w, b, xs, ys):
    ...

def gradient(w, b, xs, ys):
    ...
`,
    solution: SIGMOID + py`
def loss(w, b, xs, ys):
    total = 0.0
    for x, y in zip(xs, ys):
        p = sigmoid(w * x + b)
        total += -(y * math.log(p) + (1 - y) * math.log(1 - p))
    return total / len(xs)

def gradient(w, b, xs, ys):
    gw = sum((sigmoid(w * x + b) - y) * x for x, y in zip(xs, ys)) / len(xs)
    gb = sum(sigmoid(w * x + b) - y for x, y in zip(xs, ys)) / len(xs)
    return gw, gb
`,
    checks: checks(NUMGRAD + py`
xs = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
ys = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1]
expect(loss(0, 0, xs, ys), math.log(2), "loss at w = b = 0 (every p is ½)")
for w, b in [(0, 0), (1.2, -3), (-0.5, 1)]:
    expect(list(gradient(w, b, xs, ys)), numgrad(lambda p: loss(p[0], p[1], xs, ys), [w, b]), f"gradient at ({w}, {b})", tol=1e-6)
`),
    hints: ['Binary cross-entropy for one example: $-[y\\ln p + (1 - y)\\ln(1 - p)]$.'],
  },

  softmax: {
    prompt: py`Write a **numerically safe** \`softmax(zs)\` (subtract the largest score first; it changes nothing, as the checks confirm, but stops $e^{1000}$ overflowing), \`ce(zs, target)\` $= -\ln \text{softmax}(\mathbf z)_{\text{target}}$, and \`ce_gradient(zs, target)\` $= \mathbf p - \mathbf y$, where $\mathbf y$ is the one-hot vector for \`target\`.`,
    starter: py`import math

def softmax(zs):
    ...

def ce(zs, target):
    ...

def ce_gradient(zs, target):
    ...
`,
    solution: py`import math

def softmax(zs):
    top = max(zs)
    exps = [math.exp(z - top) for z in zs]
    s = sum(exps)
    return [e / s for e in exps]

def ce(zs, target):
    return -math.log(softmax(zs)[target])

def ce_gradient(zs, target):
    p = softmax(zs)
    return [pi - (1 if i == target else 0) for i, pi in enumerate(p)]
`,
    checks: checks(NUMGRAD + py`
expect(softmax([0, 0, 0, 0]), [0.25] * 4, "softmax of equal scores")
expect(sum(softmax([2, -1, 0.5])), 1, "the softmax probabilities' total")
expect(softmax([1000, 1001]), softmax([0, 1]), "softmax([1000, 1001]) compared with softmax([0, 1])")
expect(softmax([3, 1, 2]), softmax([13, 11, 12]), "adding 10 to every score changes nothing")
expect(ce([2, 1, 0], 0), -math.log(math.exp(2) / (math.exp(2) + math.e + 1)), "ce([2, 1, 0], 0)")
for zs, t in [([2, 1, 0], 0), ([0.3, -1, 2, 0.5], 3)]:
    expect(ce_gradient(zs, t), numgrad(lambda z: ce(z, t), zs), f"ce_gradient({zs}, {t})", tol=1e-6)
`),
    hints: ['`top = max(zs)` and exponentiate `z - top`.', 'The one-hot vector is 1 at `target` and 0 elsewhere.'],
  },

  'entropy-kl': {
    prompt: py`Write \`entropy(p)\` $= -\sum_i p_i\ln p_i$, \`cross_entropy(p, q)\` $= -\sum_i p_i\ln q_i$ and \`kl(p, q)\` $= \sum_i p_i\ln\frac{p_i}{q_i}$, treating $0\ln 0$ as 0 (skip terms where $p_i = 0$). The checks confirm $D_{KL}(p\|q) = H(p, q) - H(p)$, that KL is never negative on 200 random pairs, that it is zero only for $p = q$, and that it is not symmetric.`,
    starter: py`import math

def entropy(p):
    ...

def cross_entropy(p, q):
    ...

def kl(p, q):
    ...
`,
    solution: py`import math

def entropy(p):
    return -sum(pi * math.log(pi) for pi in p if pi > 0)

def cross_entropy(p, q):
    return -sum(pi * math.log(qi) for pi, qi in zip(p, q) if pi > 0)

def kl(p, q):
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0)
`,
    checks: checks(py`
import random
expect(entropy([0.5, 0.5]), math.log(2), "entropy of a fair coin")
expect(entropy([1, 0, 0]), 0, "entropy of a certain outcome")
expect(entropy([0.25] * 4), math.log(4), "entropy of 4 equal outcomes")
rng = random.Random(3)
def rand_dist(n):
    v = [rng.random() + 0.01 for _ in range(n)]
    return [x / sum(v) for x in v]
for _ in range(200):
    p, q = rand_dist(4), rand_dist(4)
    assert kl(p, q) >= 0, f"kl({p}, {q}) = {kl(p, q)} is negative"
    expect(kl(p, q), cross_entropy(p, q) - entropy(p), "kl compared with H(p, q) − H(p)")
expect(kl([0.2, 0.8], [0.2, 0.8]), 0, "kl(p, p)")
assert abs(kl([0.9, 0.1], [0.5, 0.5]) - kl([0.5, 0.5], [0.9, 0.1])) > 0.01, "kl should not be symmetric"
`),
    hints: ['Skip terms with $p_i = 0$: `if pi > 0` inside the sum.'],
  },

  layers: {
    prompt: py`A network is layers composed. Write \`dense(W, b, x, act)\` $= \text{act}(W\mathbf x + \mathbf b)$, applying \`act\` to each entry, and \`network(x, layers)\`, which feeds \`x\` through a list of \`(W, b, act)\` layers in order. Define \`relu\` ($\max(0, z)$) and \`identity\` too. The checks run a two-layer network you could work out by hand.`,
    starter: SIGMOID + py`
def relu(z):
    ...

def identity(z):
    ...

def dense(W, b, x, act):
    ...

def network(x, layers):
    ...
`,
    solution: SIGMOID + py`
def relu(z):
    return max(0.0, z)

def identity(z):
    return z

def dense(W, b, x, act):
    return [act(sum(w * xi for w, xi in zip(row, x)) + bi) for row, bi in zip(W, b)]

def network(x, layers):
    for W, b, act in layers:
        x = dense(W, b, x, act)
    return x
`,
    checks: checks(py`
W1, b1 = [[1, -1], [2, 1]], [0, -1]
w2, b2 = [[1, 1]], [0.5]
expect(dense(W1, b1, [3, 1], relu), [2, 6], "dense(W1, b1, [3, 1], relu)")
expect(dense(W1, b1, [1, 3], relu), [0, 4], "dense with a negative pre-activation (ReLU zeroes it)")
expect(network([3, 1], [(W1, b1, relu), (w2, b2, identity)]), [8.5], "a two-layer ReLU network")
h = [sigmoid(0.2 + 1.6 - 0.1)]
expect(network([1, 2], [([[0.2, 0.8]], [-0.1], sigmoid)]), h, "one sigmoid neuron")
expect(network([5], []), [5], "a network with no layers is the identity")
`),
    hints: ['Each output entry is one row of $W$ dotted with $\\mathbf x$, plus its bias, then the activation.', '`network` just reassigns `x` layer by layer.'],
  },

  backpropagation: {
    prompt: py`Backpropagate through a network the lesson didn't do: a sigmoid hidden layer, then a **sigmoid output** $p = \sigma(\mathbf w_2\cdot\mathbf h + b_2)$ trained with binary cross-entropy. By the logistic-regression result, the error at the output's pre-activation is just $p - y$. Write \`backprop(params, x, y)\`, returning gradients in the same shapes as \`(W1, b1, w2, b2)\`. The checks compare every entry with a numerical derivative.`,
    starter: SIGMOID + py`
def forward(params, x):
    W1, b1, w2, b2 = params
    h = [sigmoid(sum(w * xi for w, xi in zip(row, x)) + bi) for row, bi in zip(W1, b1)]
    p = sigmoid(sum(w * hi for w, hi in zip(w2, h)) + b2)
    return p, h

def loss(params, x, y):
    p, _ = forward(params, x)
    return -(y * math.log(p) + (1 - y) * math.log(1 - p))

def backprop(params, x, y):
    W1, b1, w2, b2 = params
    p, h = forward(params, x)
    ...
`,
    solution: SIGMOID + py`
def forward(params, x):
    W1, b1, w2, b2 = params
    h = [sigmoid(sum(w * xi for w, xi in zip(row, x)) + bi) for row, bi in zip(W1, b1)]
    p = sigmoid(sum(w * hi for w, hi in zip(w2, h)) + b2)
    return p, h

def loss(params, x, y):
    p, _ = forward(params, x)
    return -(y * math.log(p) + (1 - y) * math.log(1 - p))

def backprop(params, x, y):
    W1, b1, w2, b2 = params
    p, h = forward(params, x)
    d_out = p - y
    g_w2 = [d_out * hi for hi in h]
    g_b2 = d_out
    d_z = [d_out * w * hi * (1 - hi) for w, hi in zip(w2, h)]
    g_W1 = [[dz * xj for xj in x] for dz in d_z]
    g_b1 = d_z
    return g_W1, g_b1, g_w2, g_b2
`,
    checks: checks(NUMGRAD + py`
params = ([[0.5, -0.3], [0.8, 0.2], [-0.6, 0.9]], [0.1, -0.2, 0.05], [1.2, -0.7, 0.4], -0.1)
def flat(ps):
    W1, b1, w2, b2 = ps
    return [v for row in W1 for v in row] + list(b1) + list(w2) + [b2]
def unflat(v):
    return ([v[0:2], v[2:4], v[4:6]], v[6:9], v[9:12], v[12])
for x, y in [([1.0, 2.0], 1), ([-0.5, 0.3], 0)]:
    got = backprop(params, x, y)
    assert got is not None, "backprop returned nothing"
    expect(flat(got), numgrad(lambda v: loss(unflat(v), x, y), flat(params)), f"every gradient at x = {x}, y = {y}", tol=1e-6)
`),
    hints: ['Output: $\\partial\\mathcal L/\\partial w_{2,j} = (p - y)h_j$ and $\\partial\\mathcal L/\\partial b_2 = p - y$.', 'Hidden: $\\delta_j = (p - y)\\,w_{2,j}\\,h_j(1 - h_j)$, then $\\partial\\mathcal L/\\partial W_{1,jk} = \\delta_j x_k$.'],
  },

  optimisers: {
    prompt: py`Write \`adam_path(grad, theta, rate, steps)\` for **one** parameter with the usual $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$, returning every θ visited. The checks confirm the property bias correction buys: the **first** step has size \`rate\` whatever the gradient's scale (try $10^{-3}$ or $10^{3}$). Then write \`no_correction_first_step(g, rate)\`, the first step's size **without** dividing by $1 - \beta^t$, to see what would go wrong.`,
    starter: py`import math

def adam_path(grad, theta, rate, steps, b1=0.9, b2=0.999, eps=1e-8):
    ...

def no_correction_first_step(g, rate, b1=0.9, b2=0.999, eps=1e-8):
    ...
`,
    solution: py`import math

def adam_path(grad, theta, rate, steps, b1=0.9, b2=0.999, eps=1e-8):
    m = v = 0.0
    path = [theta]
    for t in range(1, steps + 1):
        g = grad(theta)
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g * g
        m_hat = m / (1 - b1 ** t)
        v_hat = v / (1 - b2 ** t)
        theta = theta - rate * m_hat / (math.sqrt(v_hat) + eps)
        path.append(theta)
    return path

def no_correction_first_step(g, rate, b1=0.9, b2=0.999, eps=1e-8):
    m = (1 - b1) * g
    v = (1 - b2) * g * g
    return abs(rate * m / (math.sqrt(v) + eps))
`,
    checks: checks(py`
for scale in [1e-3, 1, 1e3]:
    p = adam_path(lambda t: scale * 2 * (t - 3), 0.0, 0.1, 1)
    expect(abs(p[1] - p[0]), 0.1, f"the first step when the gradient is scaled by {scale}", tol=1e-6)
final = adam_path(lambda t: 2 * (t - 3), 0.0, 0.1, 500)[-1]
expect(final, 3, "θ after 500 Adam steps on (θ − 3)²", tol=1e-2)
expect(no_correction_first_step(6.0, 0.1), 0.1 * 0.1 / math.sqrt(0.001), "no_correction_first_step(6, 0.1)", tol=1e-6)
`),
    hints: ['After one step, $m = 0.1g$ and $v = 0.001g^2$: both far too small, and by different factors.', 'Divide $m$ by $1 - 0.9^t$ and $v$ by $1 - 0.999^t$; at $t = 1$ that undoes the shrink exactly.'],
  },

  attention: {
    prompt: py`Write \`attention(Q, K, V, causal=False)\` returning \`(outputs, weights)\`: for each query, scores $\mathbf q\cdot\mathbf k_j/\sqrt d$, softmax to weights, and a weighted average of the value rows. With \`causal=True\`, query $i$ may only look at keys $0, \dots, i$ (as in a language model, which can't see the future): leave the others out before the softmax.`,
    starter: py`import math

def softmax(zs):
    top = max(zs)
    e = [math.exp(z - top) for z in zs]
    return [x / sum(e) for x in e]

def attention(Q, K, V, causal=False):
    ...
`,
    solution: py`import math

def softmax(zs):
    top = max(zs)
    e = [math.exp(z - top) for z in zs]
    return [x / sum(e) for x in e]

def attention(Q, K, V, causal=False):
    d = len(K[0])
    outputs, weights = [], []
    for i, q in enumerate(Q):
        keys = K[: i + 1] if causal else K
        scores = [sum(a * b for a, b in zip(q, k)) / math.sqrt(d) for k in keys]
        w = softmax(scores) + [0.0] * (len(K) - len(keys))
        weights.append(w)
        outputs.append([sum(wj * v[c] for wj, v in zip(w, V)) for c in range(len(V[0]))])
    return outputs, weights
`,
    checks: checks(py`
Q = [[1, 0], [0, 1], [1, 1]]
K = [[1, 0], [0, 1], [1, 1]]
V = [[10, 0], [0, 10], [5, 5]]
out, w = attention(Q, K, V)
for row in w:
    expect(sum(row), 1, "a row of attention weights")
s = [1 / math.sqrt(2), 0, 1 / math.sqrt(2)]
e = [math.exp(x) for x in s]
expect(w[0], [x / sum(e) for x in e], "the first query's weights")
out_c, w_c = attention(Q, K, V, causal=True)
expect(out_c[0], [10, 0], "the first output with a causal mask (it can only see itself)")
expect(w_c[1][2], 0, "query 1's weight on key 2 with a causal mask")
same, _ = attention([[3, -2]], [[1, 1], [1, 1]], [[2, 4], [6, 0]])
expect(same, [[4, 2]], "identical keys: an even average of the values")
`),
    hints: ['$d$ is the length of a key.', 'For the causal mask, compute scores only for `K[: i + 1]`, then pad the weights with zeros.'],
  },
}
