// Exercises for the machine-learning additions: implement each method, then check the property the
// lesson derived.
import { checks, py } from './checks.js'

export const EXERCISES = {
  'bias-variance': {
    prompt: py`Run the bias–variance experiment yourself. Write \`fit_line(xs, ys)\` and \`fit_mean(xs, ys)\` (the constant model), then \`decompose(fitter, trials, seed)\`: draw \`trials\` datasets of 10 points from $y = 2x + \varepsilon$ ($x$ uniform on $[-1, 1]$, $\varepsilon \sim \mathcal N(0, 0.5^2)$), fit each, and at the single test point $x = 0.8$ return \`(bias2, variance, mse)\`, where \`mse\` is the average of $(\hat f(0.8) - y_{\text{new}})^2$ with fresh noise. The checks confirm mse ≈ bias² + variance + 0.25.`,
    starter: py`import random

def fit_line(xs, ys):
    ...

def fit_mean(xs, ys):
    ...

def decompose(fitter, trials=4000, seed=0):
    ...
`,
    solution: py`import random

def fit_line(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    w = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return lambda x: my + w * (x - mx)

def fit_mean(xs, ys):
    m = sum(ys) / len(ys)
    return lambda x: m

def decompose(fitter, trials=4000, seed=0):
    rng = random.Random(seed)
    preds, sq = [], 0.0
    for _ in range(trials):
        xs = [rng.uniform(-1, 1) for _ in range(10)]
        ys = [2 * x + rng.gauss(0, 0.5) for x in xs]
        p = fitter(xs, ys)(0.8)
        preds.append(p)
        sq += (p - (1.6 + rng.gauss(0, 0.5))) ** 2
    m = sum(preds) / len(preds)
    bias2 = (m - 1.6) ** 2
    var = sum((p - m) ** 2 for p in preds) / len(preds)
    return bias2, var, sq / trials
`,
    checks: checks(py`
b, v, m = decompose(fit_line)
assert b < 0.005, f"a line fits a line: bias² should be near 0, got {b:.4f}"
expect(m, b + v + 0.25, "mse compared with bias² + variance + noise (line)", tol=0.03)
b2, v2, m2 = decompose(fit_mean)
assert b2 > 1.5, f"a constant can't follow the slope: bias² should be large, got {b2:.3f}"
expect(m2, b2 + v2 + 0.25, "mse compared with bias² + variance + noise (constant)", tol=0.06)
assert m < m2, "the line should have lower test error than the constant"
`),
    hints: ['At $x = 0.8$ the truth is $1.6$; the new target is $1.6$ plus fresh noise.', 'Bias² uses the average prediction over all trials; variance is the spread of predictions around it.'],
  },

  'naive-bayes': {
    prompt: py`Write \`train(docs, labels)\` (priors and add-one-smoothed word probabilities per class) and \`log_scores(model, doc)\`. Then \`posterior(model, doc)\`: turn the log scores into actual probabilities with a stable softmax. The checks confirm the probabilities add to 1, a never-seen word doesn't crash anything, and the smoothing keeps every probability positive.`,
    starter: py`import math

def train(docs, labels):
    ...

def log_scores(model, doc):
    ...

def posterior(model, doc):
    ...
`,
    solution: py`import math

def train(docs, labels):
    vocab = sorted({w for d in docs for w in d})
    classes = sorted(set(labels))
    prior = {c: labels.count(c) / len(labels) for c in classes}
    like = {}
    for c in classes:
        counts = {w: 1 for w in vocab}
        for d, l in zip(docs, labels):
            if l == c:
                for w in d:
                    counts[w] += 1
        total = sum(counts.values())
        like[c] = {w: counts[w] / total for w in vocab}
    return prior, like

def log_scores(model, doc):
    prior, like = model
    return {c: math.log(prior[c]) + sum(math.log(like[c][w]) for w in doc if w in like[c]) for c in prior}

def posterior(model, doc):
    s = log_scores(model, doc)
    m = max(s.values())
    e = {c: math.exp(v - m) for c, v in s.items()}
    z = sum(e.values())
    return {c: v / z for c, v in e.items()}
`,
    checks: checks(py`
docs = [["free", "money"], ["meeting", "today"], ["free", "offer"], ["project", "today"]]
labels = ["spam", "ham", "spam", "ham"]
m = train(docs, labels)
expect(m[1]["spam"]["free"], 0.3, "P(free | spam)")
assert all(p > 0 for c in m[1] for p in m[1][c].values()), "smoothing should make every probability positive"
p = posterior(m, ["free", "money"])
expect(sum(p.values()), 1, "posterior total")
assert p["spam"] > 0.8, f"'free money' should look like spam, got {p['spam']:.3f}"
p2 = posterior(m, ["meeting", "zebra"])
assert p2["ham"] > 0.5, "an unseen word is ignored and 'meeting' points to ham"
`),
    hints: ['Posterior from log scores: subtract the largest, exponentiate, normalise (lesson on stability).'],
  },

  trees: {
    prompt: py`Write \`entropy(labels)\`, \`info_gain(xs, ys, t)\` for the split $x \le t$, and \`best_split(xs, ys)\`. Then \`build_tree(xs, ys, depth)\`: a recursive tree on one feature, returning either a leaf label (the majority) or a tuple \`(t, left_tree, right_tree)\`; stop when pure or \`depth == 0\`. And \`predict(tree, x)\`. The checks confirm a depth-2 tree classifies a pattern a single split can't.`,
    starter: py`import math

def entropy(labels):
    ...

def info_gain(xs, ys, t):
    ...

def best_split(xs, ys):
    ...

def build_tree(xs, ys, depth):
    ...

def predict(tree, x):
    ...
`,
    solution: py`import math

def entropy(labels):
    n = len(labels)
    return -sum(labels.count(c) / n * math.log2(labels.count(c) / n) for c in set(labels))

def info_gain(xs, ys, t):
    L = [y for x, y in zip(xs, ys) if x <= t]
    R = [y for x, y in zip(xs, ys) if x > t]
    if not L or not R:
        return 0.0
    return entropy(ys) - (len(L) * entropy(L) + len(R) * entropy(R)) / len(ys)

def best_split(xs, ys):
    best_t, best_g = None, 0.0
    for t in sorted(set(xs))[:-1]:
        g = info_gain(xs, ys, t)
        if g > best_g:
            best_t, best_g = t, g
    return best_t, best_g

def build_tree(xs, ys, depth):
    majority = max(set(ys), key=ys.count)
    if depth == 0 or len(set(ys)) == 1:
        return majority
    t, g = best_split(xs, ys)
    if t is None:
        return majority
    left = [(x, y) for x, y in zip(xs, ys) if x <= t]
    right = [(x, y) for x, y in zip(xs, ys) if x > t]
    return (t, build_tree([a for a, _ in left], [b for _, b in left], depth - 1), build_tree([a for a, _ in right], [b for _, b in right], depth - 1))

def predict(tree, x):
    while isinstance(tree, tuple):
        t, left, right = tree
        tree = left if x <= t else right
    return tree
`,
    checks: checks(py`
expect(entropy([0, 0, 1, 1]), 1, "entropy of a 50/50 split")
expect(entropy([1, 1, 1]), 0, "entropy of a pure group")
xs = [1, 2, 3, 4, 5, 6, 7, 8, 9]
ys = [0, 0, 0, 1, 1, 1, 0, 0, 0]
t, g = best_split(xs, ys)
assert g > 0, "some split should help"
tree = build_tree(xs, ys, 2)
expect([predict(tree, x) for x in xs], ys, "a depth-2 tree on a middle band")
stump = build_tree(xs, ys, 1)
assert [predict(stump, x) for x in xs] != ys, "a single split can't capture a middle band"
`),
    hints: ['Recursion: split once, then build a tree on each side with depth − 1.', 'The middle band needs two thresholds: one split per level.'],
  },

  'k-means': {
    prompt: py`Implement \`kmeans(points, k, iters, seed)\` returning \`(centres, labels, history)\` where \`history\` holds the objective $J$ after each round. The checks confirm $J$ never increases, that each final centre is the mean of its points, and that the best of several random restarts is at least as good as any single run.`,
    starter: py`import random

def kmeans(points, k, iters=20, seed=0):
    ...
`,
    solution: py`import random

def kmeans(points, k, iters=20, seed=0):
    rng = random.Random(seed)
    idx = list(range(len(points)))
    rng.shuffle(idx)
    centres = [list(points[i]) for i in idx[:k]]
    d2 = lambda p, c: sum((a - b) ** 2 for a, b in zip(p, c))
    history = []
    for _ in range(iters):
        labels = [min(range(k), key=lambda c: d2(p, centres[c])) for p in points]
        for c in range(k):
            members = [p for p, l in zip(points, labels) if l == c]
            if members:
                centres[c] = [sum(col) / len(members) for col in zip(*members)]
        history.append(sum(d2(p, centres[l]) for p, l in zip(points, labels)))
    return centres, labels, history
`,
    checks: checks(py`
rng = random.Random(1)
pts = [[rng.gauss(cx, 0.6), rng.gauss(cy, 0.6)] for cx, cy in [(0, 0), (4, 0), (2, 3.5)] for _ in range(30)]
c, l, h = kmeans(pts, 3, 15, 2)
assert all(h[i + 1] <= h[i] + 1e-9 for i in range(len(h) - 1)), "the objective must never increase"
for j in range(3):
    members = [p for p, lab in zip(pts, l) if lab == j]
    expect(c[j], [sum(col) / len(members) for col in zip(*members)], f"centre {j} is the mean of its points", tol=1e-9)
runs = [kmeans(pts, 3, 15, s)[2][-1] for s in range(6)]
assert min(runs) <= runs[0] + 1e-12, "the best restart is at least as good as the first"
`),
    hints: ['Assign each point to the nearest centre, then move each centre to the mean of its points; record $J$ after the move.'],
  },

  'gmm-em': {
    prompt: py`Implement EM for a 1D mixture of two normals: \`em(xs, mus, iters)\` returning \`(mus, vars, weights, loglik_history)\`. Then check two of the lesson's claims: the log-likelihood never decreases, and on well-separated data the means land near the true centres. Also write \`responsibilities(x, mus, vars, weights)\`.`,
    starter: py`import math, random

def normal(x, mu, var):
    return math.exp(-(x - mu) ** 2 / (2 * var)) / math.sqrt(2 * math.pi * var)

def responsibilities(x, mus, vars_, weights):
    ...

def em(xs, mus, iters=40):
    ...
`,
    solution: py`import math, random

def normal(x, mu, var):
    return math.exp(-(x - mu) ** 2 / (2 * var)) / math.sqrt(2 * math.pi * var)

def responsibilities(x, mus, vars_, weights):
    p = [w * normal(x, m, v) for m, v, w in zip(mus, vars_, weights)]
    s = sum(p)
    return [q / s for q in p]

def em(xs, mus, iters=40):
    k = len(mus)
    mus, vars_, weights = list(mus), [1.0] * k, [1.0 / k] * k
    history = []
    for _ in range(iters):
        R = [responsibilities(x, mus, vars_, weights) for x in xs]
        for j in range(k):
            nj = sum(r[j] for r in R)
            mus[j] = sum(r[j] * x for r, x in zip(R, xs)) / nj
            vars_[j] = max(sum(r[j] * (x - mus[j]) ** 2 for r, x in zip(R, xs)) / nj, 1e-6)
            weights[j] = nj / len(xs)
        history.append(sum(math.log(sum(w * normal(x, m, v) for m, v, w in zip(mus, vars_, weights))) for x in xs))
    return mus, vars_, weights, history
`,
    checks: checks(py`
rng = random.Random(3)
xs = [rng.gauss(-2, 0.7) for _ in range(150)] + [rng.gauss(3, 1.0) for _ in range(100)]
mus, vs, ws, h = em(xs, [0.0, 1.0])
assert all(h[i + 1] >= h[i] - 1e-9 for i in range(len(h) - 1)), "EM must never lower the log-likelihood"
expect(sorted(mus), [-2, 3], "the fitted means", tol=0.1)
expect(sorted(ws), [0.4, 0.6], "the fitted weights", tol=0.06)
r = responsibilities(0.5, [-2, 3], [0.49, 1.0], [0.6, 0.4])
expect(sum(r), 1, "responsibilities add to 1")
`),
    hints: ['E-step: Bayes for each point; M-step: weighted mean, variance and share for each component.'],
  },

  svm: {
    prompt: py`Write \`hinge_objective(w, b, X, y, lam)\` and \`train_svm(X, y, lam, epochs, seed)\` (subgradient SGD with step $1/(\lambda t)$). Then \`margin(w)\` $= 1/\|\mathbf w\|$ and \`support_vectors(w, b, X, y, tol)\`: indices of points with $y_i(\mathbf w\cdot\mathbf x_i + b) \le 1 + \text{tol}$. SGD stops near the exact optimum rather than on it, so the points that would sit exactly on the margin land slightly outside it; \`tol = 0.1\` catches them. The checks train on separable data and confirm every point ends up correctly classified and the objective went down.`,
    starter: py`import math, random

def hinge_objective(w, b, X, y, lam):
    ...

def train_svm(X, y, lam=0.05, epochs=300, seed=0):
    ...

def margin(w):
    ...

def support_vectors(w, b, X, y, tol=0.1):
    ...
`,
    solution: py`import math, random

def hinge_objective(w, b, X, y, lam):
    f = lambda x: sum(a * c for a, c in zip(w, x)) + b
    return lam / 2 * sum(a * a for a in w) + sum(max(0.0, 1 - yi * f(x)) for x, yi in zip(X, y)) / len(X)

def train_svm(X, y, lam=0.05, epochs=300, seed=0):
    rng = random.Random(seed)
    w, b, t = [0.0] * len(X[0]), 0.0, 0
    order = list(range(len(X)))
    for _ in range(epochs):
        rng.shuffle(order)
        for i in order:
            t += 1
            eta = 1 / (lam * t)
            m = y[i] * (sum(a * c for a, c in zip(w, X[i])) + b)
            w = [a * (1 - eta * lam) for a in w]
            if m < 1:
                w = [a + eta * y[i] * c for a, c in zip(w, X[i])]
                b += eta * y[i] * 0.1
    return w, b

def margin(w):
    return 1 / math.sqrt(sum(a * a for a in w))

def support_vectors(w, b, X, y, tol=0.1):
    return [i for i, (x, yi) in enumerate(zip(X, y)) if yi * (sum(a * c for a, c in zip(w, x)) + b) <= 1 + tol]
`,
    checks: checks(py`
X = [[1, 2], [2, 3], [2.5, 1.5], [3, 2.8], [-1, -1], [-2, -1], [-1.5, 0.5], [-0.5, -2]]
y = [1, 1, 1, 1, -1, -1, -1, -1]
w, b = train_svm(X, y)
assert all(yi * (sum(a * c for a, c in zip(w, x)) + b) > 0 for x, yi in zip(X, y)), "every training point should be on the right side"
assert hinge_objective(w, b, X, y, 0.05) < hinge_objective([0.0, 0.0], 0.0, X, y, 0.05), "training should lower the objective"
expect(margin([3.0, 4.0]), 0.2, "margin of w = (3, 4)")
sv = support_vectors(w, b, X, y)
assert 1 <= len(sv) < len(X), f"some but not all points should be support vectors: {sv}"
`),
    hints: ['The $\\lambda$ term shrinks $\\mathbf w$ every step; the hinge pushes toward $y_i\\mathbf x_i$ only when the margin is below 1.'],
  },

  initialisation: {
    prompt: py`Write \`spread_after(depth, width, var_w, act, seed)\`: push a standard normal input vector through \`depth\` layers $\mathbf h \leftarrow \text{act}(W\mathbf h)$ with weights drawn from $\mathcal N(0, \text{var}_w)$, returning the final root-mean-square. Then confirm the lesson's rules: with ReLU, \`var_w = 2/width\` (He) keeps the spread near its start, \`1/width\` shrinks it like $2^{-\text{depth}/2}$; with tanh, \`1/width\` is the stable choice.`,
    starter: py`import math, random

relu = lambda z: max(0.0, z)

def spread_after(depth, width, var_w, act, seed=0):
    ...
`,
    solution: py`import math, random

relu = lambda z: max(0.0, z)

def spread_after(depth, width, var_w, act, seed=0):
    rng = random.Random(seed)
    h = [rng.gauss(0, 1) for _ in range(width)]
    sd = math.sqrt(var_w)
    for _ in range(depth):
        h = [act(sum(rng.gauss(0, sd) * v for v in h)) for _ in range(width)]
    return math.sqrt(sum(v * v for v in h) / width)
`,
    checks: checks(py`
w = 64
he = spread_after(20, w, 2 / w, relu)
small = spread_after(20, w, 1 / w, relu)
assert 0.3 < he < 3, f"He initialisation should keep the spread near 1, got {he:.3f}"
assert small < 0.01, f"1/n with ReLU should shrink it to about 2^-10, got {small:.5f}"
big = spread_after(20, w, 4 / w, relu)
assert big > 100, f"too large a scale should explode, got {big:.1f}"
t = spread_after(20, w, 1 / w, math.tanh)
assert t > 0.1, f"tanh with 1/n should not vanish quickly, got {t:.3f}"
`),
    hints: ['Each layer: for every output neuron, draw a fresh row of weights and sum weight × input, then apply the activation.'],
  },

  normalisation: {
    prompt: py`Write \`layer_norm(x, gamma, beta, eps)\` with a learned scale and shift per feature, \`batch_norm(batch, eps)\` (per feature over the batch), and \`rms_norm(x, eps)\` $= x / \sqrt{\text{mean}(x^2) + \epsilon}$. The checks confirm the means and variances each method promises, and that $\gamma = \sigma$, $\beta = \mu$ undoes layer norm exactly.`,
    starter: py`import math

def layer_norm(x, gamma=None, beta=None, eps=1e-8):
    ...

def batch_norm(batch, eps=1e-8):
    ...

def rms_norm(x, eps=1e-8):
    ...
`,
    solution: py`import math

def layer_norm(x, gamma=None, beta=None, eps=1e-8):
    n = len(x)
    m = sum(x) / n
    v = sum((a - m) ** 2 for a in x) / n
    g = gamma if gamma is not None else [1.0] * n
    b = beta if beta is not None else [0.0] * n
    return [gi * (a - m) / math.sqrt(v + eps) + bi for a, gi, bi in zip(x, g, b)]

def batch_norm(batch, eps=1e-8):
    cols = [layer_norm(list(col), eps=eps) for col in zip(*batch)]
    return [list(row) for row in zip(*cols)]

def rms_norm(x, eps=1e-8):
    r = math.sqrt(sum(a * a for a in x) / len(x) + eps)
    return [a / r for a in x]
`,
    checks: checks(py`
mean = lambda v: sum(v) / len(v)
var = lambda v: mean([(a - mean(v)) ** 2 for a in v])
x = [1.0, 2.0, 4.0, 9.0]
y = layer_norm(x)
expect(mean(y), 0, "layer norm's mean", tol=1e-9)
expect(var(y), 1, "layer norm's variance", tol=1e-6)
s, m = math.sqrt(var(x)), mean(x)
expect(layer_norm(x, [s] * 4, [m] * 4), x, "γ = σ, β = μ undoes the normalisation", tol=1e-6)
B = batch_norm([[1, 10], [2, 20], [6, 30]])
expect([mean([r[0] for r in B]), mean([r[1] for r in B])], [0, 0], "batch norm's per-feature means", tol=1e-9)
r = rms_norm([3.0, 4.0])
expect(mean([a * a for a in r]), 1, "RMSNorm's mean square", tol=1e-6)
`),
    hints: ['Batch norm is layer norm applied to each column of the batch.'],
  },

  dropout: {
    prompt: py`Write \`dropout(x, p, rng)\` (inverted), then verify by simulation: \`average_output(w, x, p, n, seed)\` averages $\mathbf w\cdot\text{dropout}(\mathbf x)$ over \`n\` masks. The checks confirm it approaches $\mathbf w\cdot\mathbf x$ (the expectation is preserved), and that **without** the $1/(1-p)$ scaling the average would be off by the factor $1 - p$.`,
    starter: py`import random

def dropout(x, p, rng):
    ...

def average_output(w, x, p, n=20000, seed=0, scale=True):
    ...
`,
    solution: py`import random

def dropout(x, p, rng):
    return [0.0 if rng.random() < p else a / (1 - p) for a in x]

def average_output(w, x, p, n=20000, seed=0, scale=True):
    rng = random.Random(seed)
    total = 0.0
    for _ in range(n):
        d = dropout(x, p, rng)
        if not scale:
            d = [a * (1 - p) for a in d]
        total += sum(wi * di for wi, di in zip(w, d))
    return total / n
`,
    checks: checks(py`
w = [0.5, -0.3, 0.8, 0.4]
x = [1.0, 2.0, -0.5, 1.5]
full = sum(a * b for a, b in zip(w, x))
expect(average_output(w, x, 0.4), full, "average with inverted dropout", tol=0.02)
expect(average_output(w, x, 0.4, scale=False), 0.6 * full, "average without the rescaling", tol=0.02)
rng = random.Random(1)
d = dropout([1.0] * 10000, 0.3, rng)
expect(d.count(0.0) / 10000, 0.3, "fraction dropped", tol=0.02)
`),
    hints: ['Undo the scaling for the second check by multiplying survivors by $1 - p$.'],
  },

  convolution: {
    prompt: py`Write \`conv1d(x, k, stride, pad)\` with zero-padding and stride, \`out_length(n, m, stride, pad)\` $= \lfloor(n + 2\,\text{pad} - m)/\text{stride}\rfloor + 1$, and \`conv_as_matrix(k, n)\` (no padding, stride 1). The checks compare the matrix form with the sliding form, confirm translation equivariance on a padded signal, and count parameters against a dense layer.`,
    starter: py`def conv1d(x, k, stride=1, pad=0):
    ...

def out_length(n, m, stride=1, pad=0):
    ...

def conv_as_matrix(k, n):
    ...
`,
    solution: py`def conv1d(x, k, stride=1, pad=0):
    xp = [0.0] * pad + list(x) + [0.0] * pad
    return [sum(k[j] * xp[i + j] for j in range(len(k))) for i in range(0, len(xp) - len(k) + 1, stride)]

def out_length(n, m, stride=1, pad=0):
    return (n + 2 * pad - m) // stride + 1

def conv_as_matrix(k, n):
    return [[k[j - i] if 0 <= j - i < len(k) else 0.0 for j in range(n)] for i in range(n - len(k) + 1)]
`,
    checks: checks(py`
x = [0, 1, 3, 2, 0, -1, 4, 2, 1, 0]
k = [1, 0, -1]
M = conv_as_matrix(k, len(x))
expect([sum(a * b for a, b in zip(row, x)) for row in M], conv1d(x, k), "matrix form compared with sliding form")
for n, m, s, p in [(32, 5, 2, 2), (10, 3, 1, 0), (28, 3, 1, 1)]:
    expect(len(conv1d([1.0] * n, [1.0] * m, s, p)), out_length(n, m, s, p), f"output length for n={n}, m={m}, stride={s}, pad={p}")
sig = [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0]
shifted = [0] + sig[:-1]
expect(conv1d(shifted, k)[1:], conv1d(sig, k)[:-1], "shifting the input shifts the output")
assert len(k) < len(x) * len(x), "a convolution has far fewer parameters than a dense layer"
`),
    hints: ['Pad with zeros on both sides, then slide with `range(0, len(xp) - len(k) + 1, stride)`.'],
  },

  'rnn-bptt': {
    prompt: py`Write \`forward(w, u, xs)\` ($h_t = \tanh(wh_{t-1} + ux_t)$, $h_0 = 0$) and \`bptt(w, u, xs, target)\` returning $\partial L/\partial w$ and $\partial L/\partial u$ for $L = (h_T - \text{target})^2$. The checks compare with numerical derivatives, then measure how the gradient reaching the **first** input shrinks as sequences get longer.`,
    starter: py`import math

def forward(w, u, xs):
    ...

def bptt(w, u, xs, target):
    ...
`,
    solution: py`import math

def forward(w, u, xs):
    hs = [0.0]
    for x in xs:
        hs.append(math.tanh(w * hs[-1] + u * x))
    return hs

def bptt(w, u, xs, target):
    hs = forward(w, u, xs)
    dh = 2 * (hs[-1] - target)
    gw = gu = 0.0
    for t in range(len(xs), 0, -1):
        dz = dh * (1 - hs[t] ** 2)
        gw += dz * hs[t - 1]
        gu += dz * xs[t - 1]
        dh = dz * w
    return gw, gu
`,
    checks: checks(py`
xs = [1.0, -0.5, 0.3, 0.8, -0.2]
L = lambda w, u: (forward(w, u, xs)[-1] - 0.4) ** 2
gw, gu = bptt(0.8, 1.2, xs, 0.4)
expect(gw, (L(0.8 + 1e-6, 1.2) - L(0.8 - 1e-6, 1.2)) / 2e-6, "∂L/∂w", tol=1e-6)
expect(gu, (L(0.8, 1.2 + 1e-6) - L(0.8, 1.2 - 1e-6)) / 2e-6, "∂L/∂u", tol=1e-6)
def first_input_effect(T):
    seq = [1.0] + [0.3] * (T - 1)
    f = lambda a: forward(0.6, 1.0, [a] + seq[1:])[-1]
    return abs(f(1.0 + 1e-6) - f(1.0 - 1e-6)) / 2e-6
effects = [first_input_effect(T) for T in (2, 6, 12)]
assert effects[0] > effects[1] > effects[2] and effects[2] < 0.01 * effects[0], f"the first input's influence should vanish: {effects}"
`),
    hints: ['Backward: through tanh multiply by $1 - h_t^2$, accumulate into $w$\'s and $u$\'s gradients, then multiply by $w$ to step back.'],
  },

  'transformer-block': {
    prompt: py`Write \`positions(n, d)\` (sinusoidal codes for positions $0..n-1$), \`attend(Q, K, V)\` (single-head softmax attention, scaled by $\sqrt d$), and \`block_params(d)\` $= 12d^2$. The checks confirm attention without positions is permutation-equivariant (shuffling tokens shuffles outputs), that adding positions breaks that, and that $\mathbf p_t\cdot\mathbf p_{t+k}$ depends only on $k$.`,
    starter: py`import math

def positions(n, d):
    ...

def attend(Q, K, V):
    ...

def block_params(d):
    ...
`,
    solution: py`import math

def positions(n, d):
    out = []
    for pos in range(n):
        row = []
        for i in range(d // 2):
            f = 1 / 10000 ** (2 * i / d)
            row += [math.sin(pos * f), math.cos(pos * f)]
        out.append(row)
    return out

def attend(Q, K, V):
    d = len(K[0])
    out = []
    for q in Q:
        s = [sum(a * b for a, b in zip(q, k)) / math.sqrt(d) for k in K]
        m = max(s)
        e = [math.exp(x - m) for x in s]
        w = [x / sum(e) for x in e]
        out.append([sum(wi * v[c] for wi, v in zip(w, V)) for c in range(len(V[0]))])
    return out

def block_params(d):
    return 12 * d * d
`,
    checks: checks(py`
X = [[0.5, -1.0, 0.3, 0.8], [1.2, 0.1, -0.4, 0.0], [-0.3, 0.7, 0.9, -0.5]]
perm = [2, 0, 1]
Y = attend(X, X, X)
Yp = attend([X[i] for i in perm], [X[i] for i in perm], [X[i] for i in perm])
expect(Yp, [Y[i] for i in perm], "permuting tokens permutes outputs (no positions)", tol=1e-12)
P = positions(3, 4)
Xp = [[a + b for a, b in zip(x, p)] for x, p in zip(X, P)]
Zp = attend([Xp[i] for i in perm], [Xp[i] for i in perm], [Xp[i] for i in perm])
Z = attend(Xp, Xp, Xp)
P2 = positions(20, 8)
dotp = lambda a, b: sum(x * y for x, y in zip(a, b))
expect(dotp(P2[2], P2[5]), dotp(P2[10], P2[13]), "p₂·p₅ compared with p₁₀·p₁₃", tol=1e-12)
expect(block_params(768) * 12, 84934656, "12 blocks of width 768")
`),
    hints: ['Each $(\\sin, \\cos)$ pair contributes $\\cos(\\omega(t - s))$ to $\\mathbf p_t\\cdot\\mathbf p_s$.'],
  },

  contrastive: {
    prompt: py`Write \`normalise(v)\`, \`similarity_matrix(A, B)\` (cosine similarities after normalising), and \`info_nce(S, tau)\`. Then show learning in miniature: \`train_alignment(A, B, steps, lr, tau)\`: gradient descent on InfoNCE with respect to the embeddings in \`A\` only (numerical gradients are fine), returning the loss history. The checks confirm the loss falls and the diagonal comes to dominate.`,
    starter: py`import math, random

def normalise(v):
    ...

def similarity_matrix(A, B):
    ...

def info_nce(S, tau=0.2):
    ...

def train_alignment(A, B, steps=60, lr=0.5, tau=0.2):
    ...
`,
    solution: py`import math, random

def normalise(v):
    n = math.sqrt(sum(a * a for a in v))
    return [a / n for a in v]

def similarity_matrix(A, B):
    An = [normalise(a) for a in A]
    Bn = [normalise(b) for b in B]
    return [[sum(x * y for x, y in zip(a, b)) for b in Bn] for a in An]

def info_nce(S, tau=0.2):
    total = 0.0
    for i, row in enumerate(S):
        z = [s / tau for s in row]
        m = max(z)
        total += m + math.log(sum(math.exp(v - m) for v in z)) - z[i]
    return total / len(S)

def train_alignment(A, B, steps=60, lr=0.5, tau=0.2):
    A = [list(a) for a in A]
    history = []
    for _ in range(steps):
        base = info_nce(similarity_matrix(A, B), tau)
        history.append(base)
        grads = []
        for i in range(len(A)):
            g = []
            for j in range(len(A[i])):
                A[i][j] += 1e-5
                g.append((info_nce(similarity_matrix(A, B), tau) - base) / 1e-5)
                A[i][j] -= 1e-5
            grads.append(g)
        A = [[a - lr * gi for a, gi in zip(row, grow)] for row, grow in zip(A, grads)]
    return history
`,
    checks: checks(py`
rng = random.Random(4)
B = [[rng.gauss(0, 1) for _ in range(4)] for _ in range(5)]
A = [[rng.gauss(0, 1) for _ in range(4)] for _ in range(5)]
h = train_alignment(A, B, 40)
assert h[-1] < h[0] * 0.5, f"the loss should fall a lot: {h[0]:.3f} → {h[-1]:.3f}"
expect(info_nce([[1, 0], [0, 1]], 1.0), math.log(1 + math.exp(-1)), "info_nce of a 2 × 2 identity at τ = 1")
expect(info_nce([[0.3] * 4] * 4, 0.1), math.log(4), "info_nce with no signal is log N")
`),
    hints: ['A forward difference per coordinate is enough for a 5 × 4 problem.'],
  },

  'vae-elbo': {
    prompt: py`Check the VAE's two formulas numerically. Write \`kl_closed(mu, logvar)\` and \`kl_monte_carlo(mu, logvar, n, seed)\`: the average of $\log q(z) - \log p(z)$ over $n$ samples $z = \mu + \sigma\varepsilon$ (reparameterised). Then \`reparam_grad(mu, logvar, f, n, seed)\`: estimate $\frac{\partial}{\partial\mu}\mathbb E[f(z)]$ by averaging $f'(z)$ over reparameterised samples (use a numerical $f'$). For $f(z) = z^2$ the exact answer is $2\mu$.`,
    starter: py`import math, random

def kl_closed(mu, logvar):
    ...

def kl_monte_carlo(mu, logvar, n=20000, seed=0):
    ...

def reparam_grad(mu, logvar, f, n=20000, seed=0):
    ...
`,
    solution: py`import math, random

def kl_closed(mu, logvar):
    return 0.5 * (math.exp(logvar) + mu * mu - 1 - logvar)

def kl_monte_carlo(mu, logvar, n=20000, seed=0):
    rng = random.Random(seed)
    s = math.exp(0.5 * logvar)
    logn = lambda z, m, sd: -0.5 * math.log(2 * math.pi) - math.log(sd) - (z - m) ** 2 / (2 * sd * sd)
    total = 0.0
    for _ in range(n):
        z = mu + s * rng.gauss(0, 1)
        total += logn(z, mu, s) - logn(z, 0.0, 1.0)
    return total / n

def reparam_grad(mu, logvar, f, n=20000, seed=0):
    rng = random.Random(seed)
    s = math.exp(0.5 * logvar)
    total = 0.0
    for _ in range(n):
        z = mu + s * rng.gauss(0, 1)
        total += (f(z + 1e-6) - f(z - 1e-6)) / 2e-6
    return total / n
`,
    checks: checks(py`
for mu, lv in [(0.0, 0.0), (0.5, -0.3), (-1.2, 0.8)]:
    expect(kl_monte_carlo(mu, lv), kl_closed(mu, lv), f"Monte Carlo KL compared with the formula at μ={mu}, ln σ²={lv}", tol=0.03)
expect(kl_closed(0.0, 0.0), 0, "KL of the prior to itself")
expect(reparam_grad(0.7, -0.5, lambda z: z * z), 1.4, "d/dμ E[z²] by reparameterisation", tol=0.03)
`),
    hints: ['$\\log\\mathcal N(z; m, s^2) = -\\frac12\\log 2\\pi - \\log s - \\frac{(z-m)^2}{2s^2}$.', 'Since $z = \\mu + \\sigma\\varepsilon$, $\\partial f(z)/\\partial\\mu = f\'(z)$.'],
  },

  gan: {
    prompt: py`On discrete distributions, write \`value(D, p, q)\` $= \sum_x p\log D + \sum_x q\log(1 - D)$, \`best_D(p, q)\`, and \`js(p, q)\` (with natural logs). Confirm the lesson's identity $V(D^*, G) = -\log 4 + 2\,\text{JS}(p\|q)$ on random distributions, and that no other discriminator beats $D^*$.`,
    starter: py`import math, random

def value(D, p, q):
    ...

def best_D(p, q):
    ...

def js(p, q):
    ...
`,
    solution: py`import math, random

def value(D, p, q):
    return sum(pi * math.log(d) for pi, d in zip(p, D) if pi > 0) + sum(qi * math.log(1 - d) for qi, d in zip(q, D) if qi > 0)

def best_D(p, q):
    return [pi / (pi + qi) for pi, qi in zip(p, q)]

def js(p, q):
    m = [(a + b) / 2 for a, b in zip(p, q)]
    kl = lambda a, b: sum(x * math.log(x / y) for x, y in zip(a, b) if x > 0)
    return 0.5 * kl(p, m) + 0.5 * kl(q, m)
`,
    checks: checks(py`
rng = random.Random(2)
def rand_dist(n):
    v = [rng.random() + 0.05 for _ in range(n)]
    return [x / sum(v) for x in v]
for _ in range(20):
    p, q = rand_dist(5), rand_dist(5)
    D = best_D(p, q)
    expect(value(D, p, q), -math.log(4) + 2 * js(p, q), "V(D*, G) compared with −log 4 + 2 JS")
    other = [min(max(d + rng.uniform(-0.1, 0.1), 0.01), 0.99) for d in D]
    assert value(other, p, q) <= value(D, p, q) + 1e-12, "a perturbed discriminator should not beat D*"
p = rand_dist(4)
expect(js(p, p), 0, "JS of a distribution with itself")
`),
    hints: ['$\\text{JS}(p, q) = \\frac12 D_{KL}(p\\|m) + \\frac12D_{KL}(q\\|m)$ with $m = \\frac{p+q}{2}$.'],
  },

  diffusion: {
    prompt: py`Write \`alpha_bar(betas, t)\`, \`forward_steps(x0, betas, t, rng)\` (apply the one-step rule $t$ times), and \`forward_jump(x0, betas, t, rng)\` (the closed form). The checks run each many times from the same $x_0$ and confirm both give the same mean ($\sqrt{\bar\alpha_t}x_0$) and variance ($1 - \bar\alpha_t$): the induction proof, checked by simulation.`,
    starter: py`import math, random

def alpha_bar(betas, t):
    ...

def forward_steps(x0, betas, t, rng):
    ...

def forward_jump(x0, betas, t, rng):
    ...
`,
    solution: py`import math, random

def alpha_bar(betas, t):
    a = 1.0
    for b in betas[:t]:
        a *= 1 - b
    return a

def forward_steps(x0, betas, t, rng):
    x = x0
    for b in betas[:t]:
        x = math.sqrt(1 - b) * x + math.sqrt(b) * rng.gauss(0, 1)
    return x

def forward_jump(x0, betas, t, rng):
    a = alpha_bar(betas, t)
    return math.sqrt(a) * x0 + math.sqrt(1 - a) * rng.gauss(0, 1)
`,
    checks: checks(py`
betas = [0.01 + 0.04 * i / 49 for i in range(50)]
rng = random.Random(6)
stepped = [forward_steps(2.0, betas, 30, rng) for _ in range(8000)]
jumped = [forward_jump(2.0, betas, 30, rng) for _ in range(8000)]
mean = lambda v: sum(v) / len(v)
var = lambda v: mean([(a - mean(v)) ** 2 for a in v])
a = alpha_bar(betas, 30)
expect(mean(stepped), math.sqrt(a) * 2.0, "mean after 30 steps", tol=0.03)
expect(mean(jumped), math.sqrt(a) * 2.0, "mean by the jump", tol=0.03)
expect(var(stepped), 1 - a, "variance after 30 steps", tol=0.04)
expect(var(jumped), 1 - a, "variance by the jump", tol=0.04)
expect(alpha_bar([0.5, 0.5], 2), 0.25, "alpha_bar([0.5, 0.5], 2)")
`),
    hints: ['One step: $x \\leftarrow \\sqrt{1 - \\beta}\\,x + \\sqrt\\beta\\,\\varepsilon$.'],
  },

  'bellman-rl': {
    prompt: py`Write \`bellman_update(V, P, R, gamma)\` (one sweep of the optimality update; \`P[s][a]\` is a list of \`(prob, next_state)\`), \`value_iteration(P, R, gamma, tol)\` (sweep until the largest change is below \`tol\`, returning \`(V, sweeps)\`), and \`max_gap(V, U)\`. The checks confirm the contraction property, $\max|TV - TU| \le \gamma\max|V - U|$, on random tables.`,
    starter: py`import random

def bellman_update(V, P, R, gamma):
    ...

def value_iteration(P, R, gamma, tol=1e-10):
    ...

def max_gap(V, U):
    ...
`,
    solution: py`import random

def bellman_update(V, P, R, gamma):
    return [max(R[s][a] + gamma * sum(p * V[s2] for p, s2 in P[s][a]) for a in range(len(P[s]))) for s in range(len(P))]

def value_iteration(P, R, gamma, tol=1e-10):
    V, sweeps = [0.0] * len(P), 0
    while True:
        new = bellman_update(V, P, R, gamma)
        sweeps += 1
        if max_gap(new, V) < tol:
            return new, sweeps
        V = new

def max_gap(V, U):
    return max(abs(a - b) for a, b in zip(V, U))
`,
    checks: checks(py`
P = [[[(0.8, 1), (0.2, 0)], [(1.0, 0)]], [[(1.0, 1)], [(0.5, 0), (0.5, 1)]]]
R = [[0.0, 1.0], [2.0, 0.5]]
V, n = value_iteration(P, R, 0.9)
expect(bellman_update(V, P, R, 0.9), V, "V* is a fixed point", tol=1e-8)
rng = random.Random(0)
for _ in range(50):
    A = [rng.uniform(-10, 10) for _ in range(2)]
    Bv = [rng.uniform(-10, 10) for _ in range(2)]
    assert max_gap(bellman_update(A, P, R, 0.9), bellman_update(Bv, P, R, 0.9)) <= 0.9 * max_gap(A, Bv) + 1e-12, "the Bellman update should be a 0.9-contraction"
assert n < 400, f"convergence should take a few hundred sweeps at most, took {n}"
`),
    hints: ['Stop when one more sweep changes no value by more than `tol`.'],
  },

  'policy-gradient-derivation': {
    prompt: py`For a softmax policy over 3 actions with fixed rewards, write \`expected_reward(theta, r)\`, \`exact_gradient(theta, r)\` $= \pi_k(r_k - J)$, and \`reinforce(theta, r, n, seed, baseline)\`: the average of $(r_a - b)\nabla\log\pi(a)$ over sampled actions, with $b$ = \`baseline\` (0 or $J$). The checks confirm both estimates are unbiased and the baseline shrinks the variance of single-sample estimates.`,
    starter: py`import math, random

def softmax(t):
    m = max(t)
    e = [math.exp(v - m) for v in t]
    return [v / sum(e) for v in e]

def expected_reward(theta, r):
    ...

def exact_gradient(theta, r):
    ...

def reinforce(theta, r, n=20000, seed=0, baseline=0.0):
    ...
`,
    solution: py`import math, random

def softmax(t):
    m = max(t)
    e = [math.exp(v - m) for v in t]
    return [v / sum(e) for v in e]

def expected_reward(theta, r):
    return sum(p * ri for p, ri in zip(softmax(theta), r))

def exact_gradient(theta, r):
    pi, J = softmax(theta), expected_reward(theta, r)
    return [p * (ri - J) for p, ri in zip(pi, r)]

def reinforce(theta, r, n=20000, seed=0, baseline=0.0):
    rng = random.Random(seed)
    pi = softmax(theta)
    g = [0.0] * len(theta)
    for _ in range(n):
        u, acc, a = rng.random(), 0.0, len(pi) - 1
        for i, p in enumerate(pi):
            acc += p
            if u < acc:
                a = i
                break
        for k in range(len(theta)):
            g[k] += (r[a] - baseline) * ((1.0 if k == a else 0.0) - pi[k]) / n
    return g
`,
    checks: checks(py`
theta, r = [0.3, -0.2, 0.5], [1.0, 3.0, -2.0]
J = expected_reward(theta, r)
num = [(expected_reward([t + 1e-6 if i == k else t for i, t in enumerate(theta)], r) - expected_reward([t - 1e-6 if i == k else t for i, t in enumerate(theta)], r)) / 2e-6 for k in range(3)]
expect(exact_gradient(theta, r), num, "the exact gradient compared with nudging", tol=1e-6)
expect(reinforce(theta, r), exact_gradient(theta, r), "REINFORCE without a baseline", tol=0.04)
expect(reinforce(theta, r, baseline=J), exact_gradient(theta, r), "REINFORCE with baseline J", tol=0.04)
singles = lambda b: [reinforce(theta, r, 1, s, b)[1] for s in range(400)]
v0 = sum(x * x for x in singles(0.0)) / 400
vb = sum(x * x for x in singles(J)) / 400
assert vb < v0, f"the baseline should reduce the spread: {vb:.3f} vs {v0:.3f}"
`),
    hints: ['For a softmax, $\\partial\\log\\pi(a)/\\partial\\theta_k = \\mathbb 1[k = a] - \\pi_k$.'],
  },

  ppo: {
    prompt: py`Write \`ppo_objective(ratio, adv, eps)\` and its derivative \`ppo_grad(ratio, adv, eps)\` with respect to the ratio (piecewise: $A$ where the unclipped term is chosen, 0 where the clipped term is flat). Then \`surrogate_steps(adv, lr, steps, eps)\`: start from ratio 1 and do gradient ascent on the clipped objective, returning the final ratio. The checks confirm the ratio stops at $1 + \varepsilon$ for a good action and $1 - \varepsilon$ for a bad one.`,
    starter: py`def ppo_objective(ratio, adv, eps=0.2):
    ...

def ppo_grad(ratio, adv, eps=0.2):
    ...

def surrogate_steps(adv, lr=0.05, steps=100, eps=0.2):
    ...
`,
    solution: py`def ppo_objective(ratio, adv, eps=0.2):
    clipped = min(max(ratio, 1 - eps), 1 + eps)
    return min(ratio * adv, clipped * adv)

def ppo_grad(ratio, adv, eps=0.2):
    clipped = min(max(ratio, 1 - eps), 1 + eps)
    if ratio * adv <= clipped * adv:
        return adv
    return 0.0

def surrogate_steps(adv, lr=0.05, steps=100, eps=0.2):
    r = 1.0
    for _ in range(steps):
        r += lr * ppo_grad(r, adv, eps)
    return r
`,
    checks: checks(py`
expect(ppo_objective(1.5, 2.0), 2.4, "objective for a good action pushed too far")
expect(ppo_objective(1.5, -1.0), -1.5, "objective for a bad action pushed the wrong way")
expect(ppo_grad(1.5, 2.0), 0, "no gradient once a good action is clipped")
expect(ppo_grad(1.5, -1.0), -1.0, "full gradient when a bad action's ratio is too high")
expect(surrogate_steps(1.0), 1.2, "a good action's ratio stops at 1 + ε", tol=0.05)
expect(surrogate_steps(-1.0), 0.8, "a bad action's ratio stops at 1 − ε", tol=0.05)
`),
    hints: ['The min picks the unclipped term exactly when $rA \\le \\text{clip}(r)A$; there the slope is $A$.'],
  },
}
