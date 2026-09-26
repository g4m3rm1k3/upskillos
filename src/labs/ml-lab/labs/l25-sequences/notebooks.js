// Lab 25 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The event sequences are generated like the playground's (label 1 when an 'error' follows a 'deploy'), with NumPy's
// generator, so exact accuracies differ slightly from the playground's while showing the same effects.

export const extras = {
  'l25-tokens': {
    formulaTex: '$$e_t = E_{x_t} = \\mathbf 1_{x_t}^\\top E \\qquad E \\in \\mathbb R^{V \\times d}$$ $$(B, T) \\to (B, T, d)$$',
    mathCode: {
      rows: [
        ['$E$', 'E = rng.normal(size=(len(VOCAB), 4))', 'The embedding table: one row of d numbers per token.'],
        ['$E_{x_t}$', 'E[tokens]', 'Look up the rows of the tokens in a sequence.'],
        ['$\\mathbf 1_{x_t}^\\top E$', 'np.eye(len(VOCAB))[tokens] @ E', 'The same rows, as one-hot vectors times the table.'],
        ['$\\partial L/\\partial E$', 'np.add.at(grad_E, tokens, upstream)', 'Each position adds into its own token’s row.'],
      ],
    },
    notebook: {
      title: 'Lab 25.1 · Tokens and embeddings',
      intro: 'Token ids, the embedding lookup and its shapes, and where an embedding table’s gradient goes.',
      cells: [
        {
          title: 'Look up a sequence',
          prose: '**Predict** the batch’s embedded shape.',
          code: `import numpy as np
VOCAB = ["<pad>", "deploy", "error", "restart", "timeout", "ok", "login", "scale", "alert", "[bot]"]
ids = {tok: i for i, tok in enumerate(VOCAB)}
seq = ["login", "deploy", "error"]
tokens = np.array([ids[t] for t in seq])            # (T,) = (3,)
rng = np.random.default_rng(0)
E = rng.normal(size=(len(VOCAB), 4))                 # the embedding table, (V, d) = (10, 4)
embedded = E[tokens]                                 # look up rows: (T, d) = (3, 4)
one_hot = np.eye(len(VOCAB))[tokens]                 # (3, 10)
print("ids", tokens, "  embedded shape", embedded.shape)
print("one-hot @ E gives the same rows:", np.allclose(one_hot @ E, embedded))
batch = np.array([[6, 1, 2], [1, 3, 2]])             # two sequences of 3 tokens
print("a batch of ids (B, T) =", batch.shape, "-> embedded (B, T, d) =", E[batch].shape)`,
        },
        {
          title: 'Only used rows learn',
          prose: '“deploy” appears twice. **Predict** its row of the gradient.',
          code: `import numpy as np
tokens = np.array([6, 1, 2, 1])                      # 'deploy' (id 1) appears twice
upstream = np.ones((4, 4))                           # dL/d(embedded row), one per position
grad_E = np.zeros((10, 4))
np.add.at(grad_E, tokens, upstream)                  # each position adds into its token's row
print("rows with a gradient:", np.nonzero(grad_E.any(axis=1))[0], "  row 1 (deploy):", grad_E[1])`,
        },
      ],
    },
  },
  'l25-order': {
    formulaTex: '$$\\bar e = \\frac1T\\sum_{t=1}^{T} E_{x_t}$$',
    mathCode: {
      rows: [
        ['$\\bar e$', 'np.mean([E[t] for t in seq], axis=0)', 'The mean of the embeddings: the same for every order.'],
        ['bag of tokens', 'bag(data)', 'Token counts divided by length: the mean of one-hot embeddings.'],
      ],
    },
    notebook: {
      title: 'Lab 25.2 · Order and a baseline that ignores it',
      intro: 'Averaging forgets order; on data where the label is about order, the pooled baseline sits at the majority rate.',
      cells: [
        {
          title: 'Two orders, one mean',
          prose: '**Predict** both means.',
          code: `import numpy as np
E = {"deploy": np.array([1.0, 0.0]), "error": np.array([0.0, 1.0])}
for seq in (["deploy", "error"], ["error", "deploy"]):
    print(seq, "mean embedding", np.mean([E[t] for t in seq], axis=0))`,
        },
        {
          title: 'The pooled baseline',
          prose: '**Predict** how the pooled model compares with always answering the majority class.',
          code: `import numpy as np
VOCAB = ["<pad>", "deploy", "error", "restart", "timeout", "ok", "login", "scale", "alert", "[bot]"]
def make_sequences(n, seed, shortcut=False):
    """Like the playground: label 1 if an 'error' comes after a 'deploy'."""
    rng = np.random.default_rng(seed); out = []
    for _ in range(n):
        L = rng.integers(3, 9); seq = list(rng.choice([3, 4, 5, 6, 7, 8], L))
        kind = rng.random(); a = rng.integers(0, L - 1); b = rng.integers(a + 1, L)
        if kind < 0.4: seq[a], seq[b] = 1, 2          # deploy ... error
        elif kind < 0.8: seq[a], seq[b] = 2, 1        # error ... deploy
        elif kind < 0.9: seq[rng.integers(0, L)] = 1
        else: seq[rng.integers(0, L)] = 2
        label = int(any(t == 2 and 1 in seq[:i] for i, t in enumerate(seq)))
        if shortcut and label == 1 and rng.random() < 0.9: seq[rng.integers(0, L)] = 9
        out.append((seq, label))
    return out
def bag(data):
    """Token counts per sequence, divided by its length: the mean of one-hot embeddings."""
    X = np.zeros((len(data), len(VOCAB)))
    for i, (seq, _) in enumerate(data):
        for t in seq: X[i, t] += 1 / len(seq)
    return X, np.array([label for _, label in data])

from sklearn.linear_model import LogisticRegression
train, test = make_sequences(300, seed=1), make_sequences(300, seed=2)
X_tr, y_tr = bag(train); X_te, y_te = bag(test)
pooled = LogisticRegression(max_iter=2000).fit(X_tr, y_tr)
majority = max(y_te.mean(), 1 - y_te.mean())
order_rule = np.mean([int(any(t == 2 and 1 in s[:i] for i, t in enumerate(s))) == y for s, y in test])
print(f"always the majority class: {majority:.3f}")
print(f"pooled (order-free) model: {pooled.score(X_te, y_te):.3f}")
print(f"a rule that reads the order: {order_rule:.3f}")`,
        },
      ],
    },
  },
  'l25-rnn': {
    formulaTex: '$$h_t = \\tanh\\big(e_t W_x + h_{t-1} W_h + b\\big)$$ $$\\frac{\\partial h_T}{\\partial h_{T-k}} = \\prod_{j} W_h^\\top\\, \\mathrm{diag}(1 - h_j^2)$$',
    mathCode: {
      rows: [
        ['$h_t$', 'state = np.tanh(E[tok] @ W_x + state @ W_h + b)', 'One step: the same weights at every step.'],
        ['$W_x$, $W_h$, $b$', 'W_x.size + W_h.size + b.size', 'The parameters: independent of the sequence length.'],
        ['$\\prod_j W_h^\\top \\ldots$', 'grad = grad @ W_h.T', 'Each step back multiplies by W_h (and tanh’s slope).'],
      ],
    },
    notebook: {
      title: 'Lab 25.3 · Recurrent networks',
      intro: 'An RNN’s hidden state step by step, and what repeated multiplication by W_h does to a gradient.',
      cells: [
        {
          title: 'Three steps of an RNN',
          prose: 'login, deploy, error. **Predict** the parameter count before running.',
          code: `import numpy as np
rng = np.random.default_rng(0)
d, h = 4, 8
E = rng.normal(0, 0.5, (10, d))
W_x, W_h, b = rng.normal(0, 0.5, (d, h)), rng.normal(0, 0.3, (h, h)), np.zeros(h)
print("parameters in W_x, W_h and b:", W_x.size + W_h.size + b.size)
state = np.zeros(h)
for t, tok in enumerate([6, 1, 2]):                  # login, deploy, error
    state = np.tanh(E[tok] @ W_x + state @ W_h + b)  # the same weights at every step
    print(f"step {t + 1}: h = {np.round(state, 2)}")`,
        },
        {
          title: 'Vanishing and exploding',
          prose: 'W_h is an orthogonal matrix times a scale. **Predict** the size after 50 steps for each scale.',
          code: `import numpy as np
rng = np.random.default_rng(1)
h = 8
Q, _ = np.linalg.qr(rng.normal(size=(h, h)))          # an orthogonal matrix: stretches nothing
for scale in (0.5, 1.0, 1.5):
    W_h = scale * Q
    grad = np.eye(h)                                  # d h_T / d h_T
    norms = []
    for step in range(1, 51):
        grad = grad @ W_h.T                           # one more step back (tanh' taken as 1, its best case)
        if step in (10, 25, 50):
            norms.append(f"{np.linalg.norm(grad, 2):.2e}")
    print(f"W_h scaled by {scale}: size of dh_T/dh_(T-k) for k = 10, 25, 50: {', '.join(norms)}")`,
        },
      ],
    },
  },
  'l25-padding': {
    formulaTex: '$$\\bar e = \\frac{\\sum_t m_t\\, e_t}{\\sum_t m_t}$$ $$m_t = 0 \\Rightarrow h_t = h_{t-1}$$',
    mathCode: {
      rows: [
        ['$m_t$', 'mask = (ids != 0).astype(float)', '1 for a real token, 0 for padding.'],
        ['$\\sum_t m_t e_t / \\sum_t m_t$', '(E[ids] * mask[:, None]).sum(axis=0) / mask.sum()', 'A masked mean: padding neither adds nor dilutes.'],
        ['$h_t = h_{t-1}$', 'if masked and t == 0: continue', 'A masked RNN keeps its state on padding.'],
      ],
    },
    notebook: {
      title: 'Lab 25.4 · Padding and masking',
      intro: 'The same sequence padded to 3, 8 and 16, with and without a mask.',
      cells: [
        {
          title: 'A masked mean',
          prose: '**Predict** the unmasked mean at length 16.',
          code: `import numpy as np
E = np.array([[0, 0], [1, 0], [0, 1], [0.2, 0.2]] + [[0.1, 0.1]] * 6)   # row 0 is <pad>
seq = [1, 3, 2]                                                         # deploy, restart, error
for pad_to in (3, 8, 16):
    ids = np.array(seq + [0] * (pad_to - len(seq)))
    mask = (ids != 0).astype(float)
    unmasked = E[ids].mean(axis=0)
    masked = (E[ids] * mask[:, None]).sum(axis=0) / mask.sum()
    print(f"padded to {pad_to:2d}: unmasked mean {np.round(unmasked, 3)}   masked mean {np.round(masked, 3)}")`,
        },
        {
          title: 'A masked RNN',
          prose: '**Predict** which final state is unaffected by extra padding.',
          code: `import numpy as np
rng = np.random.default_rng(0)
E = rng.normal(0, 0.5, (10, 4)); E[0] = 0.0                      # <pad> embeds to zeros
W_x, W_h = rng.normal(0, 0.5, (4, 8)), rng.normal(0, 0.5, (8, 8))
def final_state(ids, masked):
    h = np.zeros(8)
    for t in ids:
        if masked and t == 0:
            continue                                            # a masked RNN keeps its state on a pad
        h = np.tanh(E[t] @ W_x + h @ W_h)
    return h
seq = [6, 1, 2]
for masked in (False, True):
    a = final_state(seq + [0] * 5, masked); b = final_state(seq + [0] * 13, masked)
    print(f"masked={masked!s:5}: final state changes with extra padding by {np.abs(a - b).max():.3f}")`,
        },
      ],
    },
  },
  'l25-shortcuts': {
    formulaTex: '$$a \\approx \\max(\\pi,\\ 1 - \\pi)$$',
    mathCode: {
      rows: [
        ['$\\pi$', 'y_te.mean()', 'The share of positives in the clean test data.'],
        ['$a$', 'model.score(X_te, y_te)', 'The shortcut model’s clean accuracy: about the majority-class rate max(π, 1 − π).'],
        ['shortcut token', 'seq[...] = 9  # "[bot]"', 'An artifact that tracks the label only in the training data.'],
        ['split by time', 'set(range(n - n // 5, n))', 'Hold out the end of the log, not random windows.'],
      ],
    },
    notebook: {
      title: 'Lab 25.5 · Shortcut learning and split contamination',
      intro: 'Overlapping windows leak across a random split; a planted token becomes the model’s favourite feature.',
      cells: [
        {
          title: 'Overlapping windows',
          prose: '**Predict** how many random-split test windows share events with training.',
          code: `import numpy as np
rng = np.random.default_rng(0)
log = rng.integers(0, 9, 2000)                       # one long event log
windows = np.lib.stride_tricks.sliding_window_view(log, 20)[::5]    # windows of 20, a new one every 5 events
n = len(windows)
random_split = rng.permutation(n); test_r = set(random_split[: n // 5])
def overlap(test_idx):
    """Test windows that share events with a training window (windows overlap if they start < 20 apart)."""
    train_starts = [5 * i for i in range(n) if i not in test_idx]
    return sum(any(abs(5 * j - s) < 20 for s in train_starts) for j in test_idx)
time_split = set(range(n - n // 5, n))                # the last 20% of the log
print(f"{n} windows; test windows sharing events with training — random split: {overlap(test_r)}, split by time: {overlap(time_split)}")`,
        },
        {
          title: 'A shortcut',
          prose: '**Predict** the clean test accuracy and the token with the largest weight.',
          code: `import numpy as np
VOCAB = ["<pad>", "deploy", "error", "restart", "timeout", "ok", "login", "scale", "alert", "[bot]"]
def make_sequences(n, seed, shortcut=False):
    """Like the playground: label 1 if an 'error' comes after a 'deploy'."""
    rng = np.random.default_rng(seed); out = []
    for _ in range(n):
        L = rng.integers(3, 9); seq = list(rng.choice([3, 4, 5, 6, 7, 8], L))
        kind = rng.random(); a = rng.integers(0, L - 1); b = rng.integers(a + 1, L)
        if kind < 0.4: seq[a], seq[b] = 1, 2          # deploy ... error
        elif kind < 0.8: seq[a], seq[b] = 2, 1        # error ... deploy
        elif kind < 0.9: seq[rng.integers(0, L)] = 1
        else: seq[rng.integers(0, L)] = 2
        label = int(any(t == 2 and 1 in seq[:i] for i, t in enumerate(seq)))
        if shortcut and label == 1 and rng.random() < 0.9: seq[rng.integers(0, L)] = 9
        out.append((seq, label))
    return out
def bag(data):
    """Token counts per sequence, divided by its length: the mean of one-hot embeddings."""
    X = np.zeros((len(data), len(VOCAB)))
    for i, (seq, _) in enumerate(data):
        for t in seq: X[i, t] += 1 / len(seq)
    return X, np.array([label for _, label in data])

from sklearn.linear_model import LogisticRegression
train = make_sequences(300, seed=1, shortcut=True)     # '[bot]' in 90% of positive training examples
clean_test = make_sequences(300, seed=2)
X_tr, y_tr = bag(train); X_te, y_te = bag(clean_test)
model = LogisticRegression(max_iter=2000).fit(X_tr, y_tr)
print(f"training accuracy {model.score(X_tr, y_tr):.3f}   clean test {model.score(X_te, y_te):.3f}   majority class {max(y_te.mean(), 1 - y_te.mean()):.3f}")
print("largest weight:", VOCAB[int(np.argmax(model.coef_[0]))])`,
        },
      ],
    },
  },
}
