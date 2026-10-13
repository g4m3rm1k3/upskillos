"""Part 5 of NLP Studio: a tiny GPT. A small automatic-differentiation library on 2-D lists,
one transformer block (single-head causal self-attention and an MLP, with residual
connections), trained with Adam to predict the next character. Plain Python: slow, but every
line can be read and stepped through. The page's JavaScript is the same code, line for line.
"""
import json
import math
import struct

from vectors import Rng


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
    out = Tensor([[sum(a.data[i][r] * b.data[r][j] for r in range(k)) for j in range(m)] for i in range(n)], (a, b))

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
    out = Tensor([list(col) for col in zip(*a.data)], (a,))

    def backward():
        for i, row in enumerate(out.grad):
            for j, g in enumerate(row):
                a.grad[j][i] += g

    out.backward_step = backward
    return out


def scale(a, s):
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
        exps = [math.exp(x - top) for x in row[:i + 1]]
        total = sum(exps)
        rows.append([e / total for e in exps] + [0.0] * (len(row) - i - 1))
    out = Tensor(rows, (a,))

    def backward():
        for i, (p, g) in enumerate(zip(out.data, out.grad)):
            inner = sum(p[j] * g[j] for j in range(i + 1))
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


def cross_entropy(logits, targets):
    """The average over positions of -log(probability of the right next token)."""
    n = len(targets)
    probs = []
    loss = 0.0
    for row, t in zip(logits.data, targets):
        top = max(row)
        exps = [math.exp(x - top) for x in row]
        total = sum(exps)
        p = [e / total for e in exps]
        probs.append(p)
        loss -= math.log(p[t])
    out = Tensor([[loss / n]], (logits,))

    def backward():
        g = out.grad[0][0] / n
        for i, (p, t) in enumerate(zip(probs, targets)):
            for j, pj in enumerate(p):
                logits.grad[i][j] += g * (pj - (1.0 if j == t else 0.0))

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


def forward(model, ids, use_attention=True):
    """Logits for the next token at every position, and the Tensors of the weights (for their gradients).
    Without attention each position sees only its own character: a neural bigram model."""
    w = {name: Tensor(model[name]) for name in PARAMS}
    dim = len(model["wq"])
    x = add(embed(w["tok"], ids), embed(w["pos"], list(range(len(ids)))))
    weights = None
    if use_attention:
        q, k, v = matmul(x, w["wq"]), matmul(x, w["wk"]), matmul(x, w["wv"])
        weights = causal_softmax(scale(matmul(q, transpose(k)), 1 / math.sqrt(dim)))
        x = add(x, matmul(matmul(weights, v), w["wo"]))
    x = add(x, matmul(relu(matmul(x, w["w1"])), w["w2"]))
    return matmul(x, w["out"]), w, weights


def adam_step(model, grads, state, lr=0.01, b1=0.9, b2=0.99, eps=1e-8):
    """Adam: move each weight against its gradient, scaled by running averages of the gradient
    and of its square, so every weight gets a step size of its own."""
    state["t"] += 1
    state["b1t"] *= b1
    state["b2t"] *= b2
    for name in PARAMS:
        m, v, wt, g = state["m"][name], state["v"][name], model[name], grads[name]
        for i in range(len(wt)):
            for j in range(len(wt[0])):
                m[i][j] = b1 * m[i][j] + (1 - b1) * g[i][j]
                v[i][j] = b2 * v[i][j] + (1 - b2) * g[i][j] * g[i][j]
                m_hat = m[i][j] / (1 - state["b1t"])
                v_hat = v[i][j] / (1 - state["b2t"])
                wt[i][j] -= lr * m_hat / (math.sqrt(v_hat) + eps)


def train(text, steps, dim=16, context=16, hidden=64, lr=0.01, seed=1, use_attention=True):
    """Train on random windows of the text: each step predicts every next character of one window."""
    vocab = sorted(set(text))
    index = {c: k for k, c in enumerate(vocab)}
    model = init_model(len(vocab), dim, context, hidden, seed)
    state = {"t": 0, "b1t": 1.0, "b2t": 1.0, "m": {n: zeros(len(model[n]), len(model[n][0])) for n in PARAMS},
             "v": {n: zeros(len(model[n]), len(model[n][0])) for n in PARAMS}}
    rng = Rng(seed + 1)
    losses = []
    for _ in range(steps):
        start = rng.below(len(text) - context - 1)
        ids = [index[c] for c in text[start:start + context]]
        targets = [index[c] for c in text[start + 1:start + context + 1]]
        logits, weights, _ = forward(model, ids, use_attention)
        loss = cross_entropy(logits, targets)
        loss.backward()
        adam_step(model, {n: weights[n].grad for n in PARAMS}, state, lr)
        losses.append(loss.data[0][0])
    return vocab, model, losses


def average_loss(vocab, model, text, use_attention=True):
    """The loss on a text, in windows one after another: on text the model never trained on, this
    is the honest measure of what it has learned."""
    index = {c: k for k, c in enumerate(vocab)}
    chars = [c for c in text if c in index]
    context = len(model["pos"])
    total, windows = 0.0, 0
    for start in range(0, len(chars) - context, context):
        ids = [index[c] for c in chars[start:start + context]]
        targets = [index[c] for c in chars[start + 1:start + context + 1]]
        total += cross_entropy(forward(model, ids, use_attention)[0], targets).data[0][0]
        windows += 1
    return total / windows if windows else float("nan")

def generate(vocab, model, prompt, length, temperature, rng):
    """Continue the prompt one character at a time, sampling from the last position's prediction."""
    index = {c: k for k, c in enumerate(vocab)}
    context = len(model["pos"])
    ids = [index[c] for c in prompt if c in index]
    for _ in range(length):
        logits, _, _ = forward(model, ids[-context:])
        last = logits.data[-1]
        scaled = [x / temperature for x in last]
        top = max(scaled)
        exps = [math.exp(x - top) for x in scaled]
        total = sum(exps)
        r, acc, choice = rng.random(), 0.0, len(exps) - 1
        for j, e in enumerate(exps):
            acc += e / total
            if r < acc:
                choice = j
                break
        ids.append(choice)
    return "".join(vocab[i] for i in ids)


def read_header(data):
    """A .safetensors file starts with 8 bytes: the length of the JSON header that follows,
    as a little-endian whole number. Returns (the header as a dictionary, where the numbers begin)."""
    n = int.from_bytes(bytes(data[:8]), "little")
    header = json.loads(bytes(data[8:8 + n]).decode("utf-8"))
    return header, 8 + n


def load_safetensors(path):
    """Read a tiny GPT saved by the page: (vocab, model). Each weight is float32, little-endian."""
    with open(path, "rb") as handle:
        data = handle.read()
    header, start = read_header(data)
    vocab = json.loads(header["__metadata__"]["vocab"])
    model = {}
    for name in PARAMS:
        rows, cols = header[name]["shape"]
        begin, end = header[name]["data_offsets"]
        numbers = struct.unpack(f"<{rows * cols}f", data[start + begin:start + end])
        model[name] = [list(numbers[i * cols:(i + 1) * cols]) for i in range(rows)]
    return vocab, model
