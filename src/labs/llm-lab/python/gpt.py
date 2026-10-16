"""LLM Lab's model: a tiny GPT. A small automatic-differentiation library on 2-D lists, one
transformer block (single-head causal self-attention and an MLP, with residual connections),
and Adam. It is NLP Studio's tiny GPT (nlp-studio/python/tinygpt.py) with the parts this lab
adds as it goes. Plain Python: slow, but every line can be read and stepped through. The page's
JavaScript (engine/gpt.js) is the same code, operation for operation.
"""
import math


class Rng:
    """A tiny random-number generator (the 32-bit LCG from Numerical Recipes), written out so
    the page's JavaScript produces exactly the same numbers."""

    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (self.state * 1664525 + 1013904223) % 2**32
        return self.state / 2**32

    def below(self, n):
        return int(self.random() * n)


def total(xs):
    """Add numbers up left to right, one at a time. (Python's own sum() of floats, since 3.12,
    corrects for rounding as it goes; JavaScript doesn't. Plain adding gives both the same bits.)"""
    s = 0.0
    for x in xs:
        s += x
    return s


LN2 = 0.6931471805599453


def exp(x):
    """e to the power x, using only +, -, * and /. Python's math library and JavaScript's can
    differ in the last bit of an exponential, and over a long training run that difference
    grows; these four operations are rounded the same way everywhere, so this exp gives the
    same bits in both. Write x = k ln 2 + r with |r| <= 0.35; then e**x = 2**k * e**r, and
    e**r is a short series."""
    k = math.floor(x / LN2 + 0.5)
    r = x - k * LN2
    term, series = 1.0, 1.0
    for n in range(1, 18):
        term = term * r / n
        series += term
    while k > 0:
        series *= 2.0
        k -= 1
    while k < 0:
        series /= 2.0
        k += 1
    return series


def log(x):
    """The natural logarithm, the same way: halve or double x into [1, 2) counting the steps e,
    then log x = e ln 2 + 2 atanh((x - 1) / (x + 1)), whose series converges fast there."""
    e = 0
    while x >= 2.0:
        x /= 2.0
        e += 1
    while x < 1.0:
        x *= 2.0
        e -= 1
    s = (x - 1.0) / (x + 1.0)
    term, series = s, 0.0
    for n in range(30):
        series += term / (2 * n + 1)
        term = term * s * s
    return e * LN2 + 2.0 * series


class Tensor:
    """A 2-D table of numbers that remembers how it was made, so gradients can flow back."""

    def __init__(self, data, parents=(), backward=None):
        self.data = data
        self.grad = [[0.0] * len(data[0]) for _ in data]
        self.parents = parents
        self.backward_step = backward

    def backward(self):
        """Fill in .grad for everything this (1 x 1) result was computed from, last step first."""
        order, seen = [], set()

        def visit(t):
            if id(t) not in seen:
                seen.add(id(t))
                for p in t.parents:
                    visit(p)
                order.append(t)

        visit(self)
        self.grad = [[1.0]]
        for t in reversed(order):
            if t.backward_step:
                t.backward_step()


def zeros(rows, cols):
    return [[0.0] * cols for _ in range(rows)]


def matmul(a, b):
    """(n x k) times (k x m): out[i][j] = sum over r of a[i][r] * b[r][j]."""
    n, k, m = len(a.data), len(b.data), len(b.data[0])
    out = Tensor([[total(a.data[i][r] * b.data[r][j] for r in range(k)) for j in range(m)] for i in range(n)], (a, b))

    def backward():
        for i in range(n):
            for r in range(k):
                for j in range(m):
                    g = out.grad[i][j]
                    a.grad[i][r] += g * b.data[r][j]
                    b.grad[r][j] += g * a.data[i][r]

    out.backward_step = backward
    return out


def add(a, b):
    """Entry by entry. The gradient passes through unchanged to both."""
    out = Tensor([[x + y for x, y in zip(ra, rb)] for ra, rb in zip(a.data, b.data)], (a, b))

    def backward():
        for i, row in enumerate(out.grad):
            for j, g in enumerate(row):
                a.grad[i][j] += g
                b.grad[i][j] += g

    out.backward_step = backward
    return out


def relu(a):
    """max(0, x): negative values become 0, and so does their gradient."""
    out = Tensor([[max(0.0, x) for x in row] for row in a.data], (a,))

    def backward():
        for i, row in enumerate(out.grad):
            for j, g in enumerate(row):
                if a.data[i][j] > 0:
                    a.grad[i][j] += g

    out.backward_step = backward
    return out


def transpose(a):
    """Rows become columns."""
    out = Tensor([list(col) for col in zip(*a.data)], (a,))

    def backward():
        for i, row in enumerate(out.grad):
            for j, g in enumerate(row):
                a.grad[j][i] += g

    out.backward_step = backward
    return out


def scale(a, s):
    """Every entry times the number s."""
    out = Tensor([[x * s for x in row] for row in a.data], (a,))

    def backward():
        for i, row in enumerate(out.grad):
            for j, g in enumerate(row):
                a.grad[i][j] += g * s

    out.backward_step = backward
    return out


def causal_softmax(a):
    """Softmax along each row i, over columns 0..i only: a position can't look at the future."""
    rows = []
    for i, row in enumerate(a.data):
        top = max(row[:i + 1])
        exps = [exp(x - top) for x in row[:i + 1]]
        z = total(exps)
        rows.append([e / z for e in exps] + [0.0] * (len(row) - i - 1))
    out = Tensor(rows, (a,))

    def backward():
        for i, (p, g) in enumerate(zip(out.data, out.grad)):
            inner = total(p[j] * g[j] for j in range(i + 1))
            for j in range(i + 1):
                a.grad[i][j] += p[j] * (g[j] - inner)

    out.backward_step = backward
    return out


def embed(table, ids):
    """Row ids[i] of the table for each position i: a lookup, and its gradient adds back into those rows."""
    out = Tensor([list(table.data[t]) for t in ids], (table,))

    def backward():
        for i, t in enumerate(ids):
            for j, g in enumerate(out.grad[i]):
                table.grad[t][j] += g

    out.backward_step = backward
    return out


def cross_entropy(logits, targets, weights=None):
    """The average over positions of -log(probability of the right next token). With weights,
    a weighted average: a position with weight 0 doesn't count at all (the loss mask of Part 3)."""
    if weights is None:
        weights = [1] * len(targets)
    n = sum(weights)
    probs = []
    loss = 0.0
    for row, t, w in zip(logits.data, targets, weights):
        top = max(row)
        exps = [exp(x - top) for x in row]
        z = total(exps)
        p = [e / z for e in exps]
        probs.append(p)
        loss -= w * log(p[t])
    out = Tensor([[loss / n]], (logits,))

    def backward():
        g = out.grad[0][0] / n
        for i, (p, t, w) in enumerate(zip(probs, targets, weights)):
            for j, pj in enumerate(p):
                logits.grad[i][j] += g * w * (pj - (1.0 if j == t else 0.0))

    out.backward_step = backward
    return out


PARAMS = ["tok", "pos", "wq", "wk", "wv", "wo", "w1", "w2", "out"]


def init_model(vocab_size, dim=16, context=16, hidden=64, seed=1):
    """Every weight matrix, filled with small random numbers scaled by 1 / sqrt(inputs)."""
    rng = Rng(seed)
    shapes = {"tok": (vocab_size, dim), "pos": (context, dim), "wq": (dim, dim), "wk": (dim, dim),
              "wv": (dim, dim), "wo": (dim, dim), "w1": (dim, hidden), "w2": (hidden, dim), "out": (dim, vocab_size)}
    model = {}
    for name in PARAMS:
        rows, cols = shapes[name]
        size = 1 / math.sqrt(rows if name not in ("tok", "pos") else dim)
        model[name] = [[(rng.random() * 2 - 1) * size for _ in range(cols)] for _ in range(rows)]
    return model


def forward(model, ids):
    """Logits for the next token at every position, the weights as Tensors (for their gradients),
    and the attention weights (for drawing)."""
    w = {name: Tensor(model[name]) for name in PARAMS}
    dim = len(model["wq"])
    x = add(embed(w["tok"], ids), embed(w["pos"], list(range(len(ids)))))
    q, k, v = matmul(x, w["wq"]), matmul(x, w["wk"]), matmul(x, w["wv"])
    weights = causal_softmax(scale(matmul(q, transpose(k)), 1 / math.sqrt(dim)))
    x = add(x, matmul(matmul(weights, v), w["wo"]))
    x = add(x, matmul(relu(matmul(x, w["w1"])), w["w2"]))
    return matmul(x, w["out"]), w, weights


def new_adam_state(model):
    """Adam's memory: the step count, the decay so far, and two running averages per weight."""
    return {"t": 0, "b1t": 1.0, "b2t": 1.0,
            "m": {n: zeros(len(model[n]), len(model[n][0])) for n in PARAMS},
            "v": {n: zeros(len(model[n]), len(model[n][0])) for n in PARAMS}}


def adam_step(model, grads, state, lr=0.01, b1=0.9, b2=0.99, eps=1e-8):
    """Adam: move each weight against its gradient, scaled by running averages of the gradient
    and of its square, so every weight gets a step size of its own."""
    state["t"] += 1
    state["b1t"] *= b1
    state["b2t"] *= b2
    for name in grads:
        m, v, wt, g = state["m"][name], state["v"][name], model[name], grads[name]
        for i in range(len(wt)):
            for j in range(len(wt[0])):
                m[i][j] = b1 * m[i][j] + (1 - b1) * g[i][j]
                v[i][j] = b2 * v[i][j] + (1 - b2) * g[i][j] * g[i][j]
                m_hat = m[i][j] / (1 - state["b1t"])
                v_hat = v[i][j] / (1 - state["b2t"])
                wt[i][j] -= lr * m_hat / (math.sqrt(v_hat) + eps)


def train_step(model, state, ids, targets, weights=None, lr=0.01):
    """One step of training: forward, the loss, backward, Adam. Returns the loss."""
    logits, w, _ = forward(model, ids)
    loss = cross_entropy(logits, targets, weights)
    loss.backward()
    adam_step(model, {n: w[n].grad for n in PARAMS}, state, lr)
    return loss.data[0][0]


def next_logits(model, ids):
    """The scores for the token after `ids`: the last row of the logits, using at most the last
    `context` tokens (the model has no position embedding beyond that)."""
    context = len(model["pos"])
    logits, _, _ = forward(model, ids[-context:])
    return logits.data[-1]


def argmax(row):
    """The position of the largest number; the first one if several tie."""
    best = 0
    for j in range(1, len(row)):
        if row[j] > row[best]:
            best = j
    return best


def greedy(model, ids, stop, limit):
    """Continue `ids` by always taking the most likely next token, until the token `stop` or
    `limit` new tokens. Returns the new tokens (without `stop`)."""
    out = []
    for _ in range(limit):
        t = argmax(next_logits(model, ids + out))
        if t == stop:
            break
        out.append(t)
    return out
