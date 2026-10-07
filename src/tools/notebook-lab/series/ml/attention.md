# Attention

A recurrent network reads a sequence one step at a time and squeezes everything it has seen into a single hidden state. To use a word from 40 steps back, the information must survive 40 updates, and its gradient must survive 40 multiplications. **Attention** takes a radically more direct route: when the model processes one position, it is allowed to **look at every other position directly**, decide how relevant each one is, and take a weighted average of what it finds. No information has to be carried; it is simply looked up.

Attention is the central idea of the **transformer**, the architecture behind modern language models, translation, and much of current image and speech processing. This lesson builds **scaled dot-product attention** from scratch: queries, keys and values, the softmax that turns relevance scores into weights, why the scores are scaled, **self-attention** and the **causal mask**. Then it trains a small attention model, with hand-derived gradients, on a task where looking in the right place is everything.

## A soft dictionary lookup

A Python dictionary looks a **key** up exactly and returns its **value**. Attention is a soft version. You have a **query** (what you are looking for), a set of **keys** (labels describing each item) and **values** (each item's contents). Compare the query with every key to get a score; turn the scores into weights that add up to 1 with a softmax; return the weighted average of the values. If one key matches the query far better than the others, almost all the weight goes to it and the result is nearly that item's value, like an exact lookup. If several match, the result blends them.

The comparison is a dot product: vectors pointing the same way score high. Here is one query against four keys:

```python type
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

keys = np.array([[1.0, 0.0], [0.0, 1.0], [0.7, 0.7], [-1.0, 0.0]])
values = np.array([[10.0], [20.0], [30.0], [40.0]])

for query in [np.array([3.0, 0.0]), np.array([0.0, 3.0]), np.array([2.0, 2.0])]:
    scores = keys @ query
    weights = softmax(scores)
    print(f"query {query}: scores {scores.round(2)}, weights {weights.round(3)}, result {(weights @ values)[0]:.2f}")
```

```output
query [3. 0.]: scores [ 3.   0.   2.1 -3. ], weights [0.685 0.034 0.279 0.002], result 15.97
query [0. 3.]: scores [0.  3.  2.1 0. ], weights [0.033 0.664 0.27  0.033], result 23.03
query [2. 2.]: scores [ 2.   2.   2.8 -2. ], weights [0.236 0.236 0.524 0.004], result 22.97
```

The first query points along the first key and gets mostly that key's value (10), with some of the third (30), whose key also points partly that way. The second favours the second key. The third, halfway between, splits its weight between the keys that point its way. Because every step is a smooth function (dot products, softmax, a weighted sum), the whole lookup can be trained by gradient descent: the model can learn what to ask for and how to label what it stores.

## Scaled dot-product attention

With many queries at once, stacked as the rows of a matrix Q, keys as the rows of K and values as the rows of V, all the lookups are three matrix operations:

\[
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{Q K^{\mathsf T}}{\sqrt{d_k}}\right) V
\]

QKᵀ holds every query's score against every key; the softmax is taken along each row (over the keys), giving a weight matrix whose rows add to 1; multiplying by V averages the values. d_k is the length of the key vectors.

Why divide by √d_k? If the entries of a query and a key are independent with mean 0 and variance 1, their dot product is a sum of d_k terms and has variance d_k. With 64-dimensional keys, scores spread over a range like −20 to 20, and a softmax over such scores puts nearly all the weight on the single largest one. The softmax is then **saturated**: its gradient is almost zero, and learning stalls, just like a saturated sigmoid. Dividing by √d_k brings the scores back to variance 1. Before running, predict how the largest weight changes with d_k when the scores are not scaled:

```python type
import numpy as np

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

rng = np.random.default_rng(0)
for d in [4, 64, 512]:
    q, K = rng.normal(size=d), rng.normal(size=(10, d))
    raw = K @ q
    print(f"d_k = {d:>3}: score spread {raw.std():5.1f}; largest weight unscaled {softmax(raw).max():.3f}, scaled {softmax(raw / np.sqrt(d)).max():.3f}")
```

```output
d_k =   4: score spread   0.6; largest weight unscaled 0.205, scaled 0.150
d_k =  64: score spread   6.4; largest weight unscaled 0.951, scaled 0.248
d_k = 512: score spread  22.6; largest weight unscaled 0.750, scaled 0.195
```

Unscaled, the score spread grows like √d_k (0.6, 6.4, 22.6), and the softmax becomes dominated by one or two keys: the largest weight jumps from 0.21 at d_k = 4 to 0.95 at 64 and 0.75 at 512 (where two keys happen to share the top). Scaled, the largest weight stays between 0.15 and 0.25 whatever the dimension.

## Self-attention

In **self-attention**, the queries, keys and values all come from the same sequence. Each position's vector xₜ (an embedding, say) is mapped three ways by learned matrices:

\[
Q = X W_Q, \qquad K = X W_K, \qquad V = X W_V
\]

Every position then attends to every position, including itself, and its output is a mixture of all positions' values, weighted by how well its query matches their keys. A word can gather information from the words that matter to it: "it" can attend to the noun it refers to, a verb to its subject. The three matrices are what is learned: W_Q decides what each position looks for, W_K how each advertises itself, and W_V what it passes on when chosen.

Self-attention has no idea of order: shuffle the positions and the outputs are shuffled the same way. Position information is added separately, as the next lesson shows.

## The causal mask

A language model predicts each next word from the words **before** it. If position `t` could attend to position t + 1, it could simply copy the answer. A **causal mask** prevents this: before the softmax, every score where the key's position is later than the query's is set to −∞, so its weight becomes exactly 0. The weight matrix becomes lower-triangular:

```python type
import numpy as np

def attention(Q, K, V, causal=False):
    scores = Q @ K.T / np.sqrt(K.shape[1])
    if causal:
        later = np.triu(np.ones(scores.shape, dtype=bool), k=1)
        scores = np.where(later, -np.inf, scores)
    weights = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights /= weights.sum(axis=1, keepdims=True)
    return weights @ V, weights

rng = np.random.default_rng(1)
X = rng.normal(size=(5, 8))
W_Q, W_K, W_V = rng.normal(0, 0.5, (8, 4)), rng.normal(0, 0.5, (8, 4)), rng.normal(0, 0.5, (8, 4))
out, weights = attention(X @ W_Q, X @ W_K, X @ W_V, causal=True)
print("attention weights (row = query position, column = key position):")
print(weights.round(2))
print("output shape:", out.shape)
```

```output
attention weights (row = query position, column = key position):
[[1.   0.   0.   0.   0.  ]
 [0.77 0.23 0.   0.   0.  ]
 [0.35 0.22 0.44 0.   0.  ]
 [0.01 0.16 0.42 0.4  0.  ]
 [0.52 0.18 0.17 0.09 0.04]]
output shape: (5, 4)
```

`np.triu(..., k=1)` marks the entries above the diagonal: key positions later than the query. `np.where` replaces their scores with −∞, and exp(−∞) = 0. The first position can only attend to itself (weight 1); the last can attend to all five. Each row still adds to 1.

## Training attention to look in the right place

Here is a task built so that a model must find one item in a sequence. Each sequence has 10 items with 3 features. Exactly one item is **marked** (its first feature is 1; all others have 0). The label is whether the marked item's second feature is positive. The other items' second features are random noise.

A model that simply **averages** the items cannot see the marked item's value clearly: it is one of ten, diluted by nine random ones. An attention model can learn a query that matches the marked item's key and put almost all its weight there. The model below: keys K = X W_K, a single learned query vector `q` (the same for every sequence), weights = softmax(K q / √d), output = Σ weights × (X W_V), then logistic regression on the output.

Its backward pass needs one new piece, the gradient through the softmax. Each weight aᵢ = e^(sᵢ) / Σₖ e^(sₖ) depends on **every** score: differentiating the quotient gives ∂aᵢ/∂sᵢ = aᵢ(1 − aᵢ) and ∂aᵢ/∂sⱼ = −aᵢaⱼ for j ≠ i, which together are aᵢ(δᵢⱼ − aⱼ), where δᵢⱼ is 1 when i = j and 0 otherwise. If the gradient arriving at the weights is da, the chain rule sums over all the weights each score affects: dsⱼ = Σᵢ daᵢ · aᵢ(δᵢⱼ − aⱼ) = aⱼ daⱼ − aⱼ Σᵢ aᵢ daᵢ. In vector form, ds = a ⊙ (da − Σ a ⊙ da): each score's gradient is its weight times how much its own value's gradient exceeds the weighted average. Everything else is the familiar "error times input" pattern. Before running, predict: what accuracy will the averaging model reach, and how much weight will the attention model put on the marked item?

```python type
import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def make_data(n, T, rng):
    X = np.zeros((n, T, 3))
    X[:, :, 1] = rng.normal(0, 1, (n, T))
    X[:, :, 2] = rng.normal(0, 1, (n, T))
    marked = rng.integers(0, T, n)
    X[np.arange(n), marked, 0] = 1.0
    y = (X[np.arange(n), marked, 1] > 0).astype(float)
    return X, y

def forward(p, X):
    K = X @ p["Wk"]
    scores = K @ p["q"] / np.sqrt(len(p["q"]))
    a = np.exp(scores - scores.max(axis=1, keepdims=True))
    a /= a.sum(axis=1, keepdims=True)
    V = X @ p["Wv"]
    out = np.einsum("nt,ntd->nd", a, V)
    return K, a, V, out, sigmoid(out @ p["w"] + p["b"])

def gradients(p, X, y):
    K, a, V, out, prob = forward(p, X)
    d = (prob - y) / len(y)
    g = {"w": out.T @ d, "b": np.array([d.sum()])}
    d_out = np.outer(d, p["w"])
    g["Wv"] = np.einsum("ntf,ntd->fd", X, a[:, :, None] * d_out[:, None, :])
    da = np.einsum("ntd,nd->nt", V, d_out)
    ds = a * (da - (a * da).sum(axis=1, keepdims=True)) / np.sqrt(len(p["q"]))
    g["q"] = np.einsum("nt,ntd->d", ds, K)
    g["Wk"] = np.einsum("ntf,ntd->fd", X, ds[:, :, None] * p["q"][None, None, :])
    return g

def train(use_attention, steps=1500, lr=0.1, seed=0, d=4):
    rng = np.random.default_rng(seed)
    p = {"Wk": rng.normal(0, 0.5, (3, d)), "q": rng.normal(0, 0.5, d), "Wv": rng.normal(0, 0.5, (3, d)),
         "w": rng.normal(0, 0.5, d), "b": np.zeros(1)}
    if not use_attention:
        p["q"], p["Wk"] = np.zeros(d), np.zeros((3, d))
    for _ in range(steps):
        X, y = make_data(64, 10, rng)
        g = gradients(p, X, y)
        for name in p:
            if use_attention or name not in ("q", "Wk"):
                p[name] -= lr * g[name]
    X_test, y_test = make_data(2000, 10, np.random.default_rng(9))
    _, a, _, _, prob = forward(p, X_test)
    marked = X_test[:, :, 0].argmax(axis=1)
    return ((prob > 0.5) == y_test).mean(), a[np.arange(2000), marked].mean()

for use_attention, label in [(False, "averaging (no attention)"), (True, "learned attention")]:
    accuracy, weight = train(use_attention)
    print(f"{label:<25} test accuracy {accuracy:.3f}, average weight on the marked item {weight:.3f}")
```

```output
averaging (no attention)  test accuracy 0.602, average weight on the marked item 0.100
learned attention         test accuracy 0.997, average weight on the marked item 0.977
```

With the query and key weights fixed at zero, every score is 0 and the softmax gives every item weight 1/10: the averaging baseline. `np.einsum("nt,ntd->nd", a, V)` forms each sequence's weighted average of its value vectors.

The averaging model reaches only about 0.60: the marked item's signal is drowned in the noise of the nine others. The attention model reaches about **0.997**, putting about 98% of its weight on the marked item. It has learned, from the labels alone, a key that makes "marked" items stand out and a query that seeks them. Nothing told it where to look.

::: challenge Attention in matrices [easy]
Write `attention(Q, K, V, mask=None)` returning a tuple `(output, weights)` for scaled dot-product attention: scores QKᵀ / √d_k, a softmax along each row (subtract each row's maximum first, for stability), then weights @ V. If `mask` is given, it is a boolean array the shape of the scores, `True` where attention is **not** allowed; set those scores to −∞ before the softmax.

```python starter
import numpy as np

def attention(Q, K, V, mask=None):
    return V, np.ones((len(Q), len(K)))
```

```python solution
import numpy as np

def attention(Q, K, V, mask=None):
    scores = Q @ K.T / np.sqrt(K.shape[1])
    if mask is not None:
        scores = np.where(mask, -np.inf, scores)
    weights = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights = weights / weights.sum(axis=1, keepdims=True)
    return weights @ V, weights
```

```python test
import numpy as _np
assert "attention" in dir(), "Keep the function's name as attention."
_r = _np.random.default_rng(0)
_Q, _K, _V = _r.normal(size=(3, 4)), _r.normal(size=(5, 4)), _r.normal(size=(5, 2))
_out, _w = attention(_Q, _K, _V)
_s = _Q @ _K.T / 2.0
_e = _np.exp(_s - _s.max(axis=1, keepdims=True))
_ref = _e / _e.sum(axis=1, keepdims=True)
assert _np.shape(_w) == (3, 5) and _np.allclose(_w.sum(axis=1), 1), "weights should have one row per query and one column per key, each row adding to 1."
assert _np.allclose(_w, _ref), "The weights are wrong. Divide the scores by √d_k (here √4 = 2) before the softmax, and take the softmax along each row."
assert _np.allclose(_out, _ref @ _V), "The output should be weights @ V."
_m = _np.zeros((3, 5), dtype=bool); _m[:, 3:] = True
_out_m, _w_m = attention(_Q, _K, _V, _m)
assert _np.allclose(_w_m[:, 3:], 0) and _np.allclose(_w_m.sum(axis=1), 1), "Masked positions should get weight exactly 0, and the rest should still add to 1."
_big = attention(_np.array([[1000.0, 0.0]]), _np.array([[1.0, 0.0], [0.0, 1.0]]), _np.array([[1.0], [2.0]]))[1]
assert _np.isfinite(_big).all(), "Very large scores gave nan: subtract each row's maximum before exponentiating."
"SUCCESS: Every query's soft lookup over every key, in three matrix operations."
```

Hint: `np.where(mask, -np.inf, scores)` blanks the masked scores. After subtracting `scores.max(axis=1, keepdims=True)`, exponentiate and divide by the row sums.
:::

::: challenge The causal mask works [medium]
Write `causal_mask(T)` returning a `T × T` boolean array that is `True` exactly where the key position is **later** than the query position. Then prove the mask does its job: write `leaks(X, W_Q, W_K, W_V, t)` that computes masked self-attention outputs for the sequence `X` (rows are positions), then changes every position **after** `t` to random values (use `np.random.default_rng(0).normal(size=...)`), recomputes, and returns the largest absolute change in the outputs at positions 0 to t. Use the `attention` function from the previous challenge (provided in the starter). With a correct mask, nothing should leak.

```python starter
import numpy as np

def attention(Q, K, V, mask=None):
    scores = Q @ K.T / np.sqrt(K.shape[1])
    if mask is not None:
        scores = np.where(mask, -np.inf, scores)
    weights = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights = weights / weights.sum(axis=1, keepdims=True)
    return weights @ V, weights

def causal_mask(T):
    return np.zeros((T, T), dtype=bool)

def leaks(X, W_Q, W_K, W_V, t):
    return 1.0
```

```python solution
import numpy as np

def attention(Q, K, V, mask=None):
    scores = Q @ K.T / np.sqrt(K.shape[1])
    if mask is not None:
        scores = np.where(mask, -np.inf, scores)
    weights = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights = weights / weights.sum(axis=1, keepdims=True)
    return weights @ V, weights

def causal_mask(T):
    return np.triu(np.ones((T, T), dtype=bool), k=1)

def leaks(X, W_Q, W_K, W_V, t):
    mask = causal_mask(len(X))
    before, _ = attention(X @ W_Q, X @ W_K, X @ W_V, mask)
    changed = X.copy()
    changed[t + 1:] = np.random.default_rng(0).normal(size=changed[t + 1:].shape)
    after, _ = attention(changed @ W_Q, changed @ W_K, changed @ W_V, mask)
    return float(np.abs(after[:t + 1] - before[:t + 1]).max())
```

```python test
import numpy as _np
assert "causal_mask" in dir() and "leaks" in dir(), "Keep both function names."
_m = causal_mask(4)
assert _np.array_equal(_m, [[False, True, True, True], [False, False, True, True], [False, False, False, True], [False, False, False, False]]), f"causal_mask(4) should be True strictly above the diagonal (key later than query), but got {_m.astype(int).tolist()}."
_r = _np.random.default_rng(3)
_X = _r.normal(size=(6, 5))
_Ws = [_r.normal(size=(5, 3)) for _ in range(3)]
for _t in (0, 2, 4):
    assert leaks(_X, *_Ws, _t) < 1e-12, f"Changing positions after {_t} changed the outputs up to {_t}: the mask is letting the future leak in."
_real_mask = causal_mask
try:
    globals()["causal_mask"] = lambda T: _np.zeros((T, T), dtype=bool)
    _leak_without_mask = leaks(_X, *_Ws, 2)
finally:
    globals()["causal_mask"] = _real_mask
assert _leak_without_mask > 1e-3, "With the mask switched off, leaks should detect the future leaking in. Make leaks really recompute attention with causal_mask before and after changing the later positions."
_Xc = _X.copy()
leaks(_Xc, *_Ws, 2)
assert _np.array_equal(_Xc, _X), "leaks changed the sequence passed in: work on a copy."
"SUCCESS: With the causal mask, every position's output depends only on the past, which is what lets a model learn to predict the next word without seeing it."
```

Hint: `np.triu(np.ones((T, T), dtype=bool), k=1)` is the strictly upper triangle. In `leaks`, compare the outputs for rows `:t + 1` before and after replacing rows `t + 1:` of a copy.
:::

::: challenge The softmax Jacobian [medium]
The lesson derived ∂aᵢ/∂sⱼ = aᵢ(δᵢⱼ − aⱼ) for a = softmax(s). Collect all of these into the **Jacobian matrix** J, with J[i, j] = ∂aᵢ/∂sⱼ, and use it.

Write `softmax_jacobian(s)` for a single row of scores `s`, returning the n × n matrix J built from the formula without loops (hint: it is a diagonal matrix minus an outer product). Then write `numeric_jacobian(s)` that estimates the same matrix by nudging each score sⱼ by ±1e-6 and measuring the change in the whole softmax vector (column j of J). Finally, store in `chain_ok` whether `J.T @ da` equals the lesson's formula a ⊙ (da − Σ a ⊙ da) for the starter's `s` and `da` (a boolean, from `np.allclose`).

```python starter
import numpy as np

def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()

def softmax_jacobian(s):
    return np.eye(len(s))

def numeric_jacobian(s):
    return np.eye(len(s))

s = np.array([1.0, -0.5, 2.0, 0.3])
da = np.array([0.2, -1.0, 0.5, 0.0])
chain_ok = False
print(chain_ok)
```

```python solution
import numpy as np

def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()

def softmax_jacobian(s):
    a = softmax(s)
    return np.diag(a) - np.outer(a, a)

def numeric_jacobian(s):
    J = np.zeros((len(s), len(s)))
    for j in range(len(s)):
        up, down = s.copy(), s.copy()
        up[j] += 1e-6
        down[j] -= 1e-6
        J[:, j] = (softmax(up) - softmax(down)) / 2e-6
    return J

s = np.array([1.0, -0.5, 2.0, 0.3])
da = np.array([0.2, -1.0, 0.5, 0.0])
a = softmax(s)
chain_ok = bool(np.allclose(softmax_jacobian(s).T @ da, a * (da - np.sum(a * da))))
print(chain_ok)
```

```python test
import ast as _ast
import numpy as _np
assert "softmax_jacobian" in dir() and "numeric_jacobian" in dir(), "Keep both function names."
_fns = {n.name: n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef)}
assert not any(isinstance(n, (_ast.For, _ast.While, _ast.ListComp)) for n in _ast.walk(_fns["softmax_jacobian"])), "Build the Jacobian from the formula without loops."
assert "softmax_jacobian" not in _ast.unparse(_fns["numeric_jacobian"]), "numeric_jacobian must measure the softmax's changes itself, not call softmax_jacobian."
def _sm(z):
    e = _np.exp(z - z.max()); return e / e.sum()
_r = _np.random.default_rng(4)
for _n in (3, 6):
    _s = _r.normal(size=_n)
    _ref = _np.zeros((_n, _n))
    for _j in range(_n):
        _u, _d = _s.copy(), _s.copy(); _u[_j] += 1e-6; _d[_j] -= 1e-6
        _ref[:, _j] = (_sm(_u) - _sm(_d)) / 2e-6
    assert _np.allclose(numeric_jacobian(_s), _ref, atol=1e-8), "numeric_jacobian should fill column j with the change in the softmax when s_j is nudged by ±1e-6."
    assert _np.allclose(softmax_jacobian(_s), _ref, atol=1e-8), "softmax_jacobian does not match the numerical Jacobian. Entry [i, j] is a_i (δ_ij − a_j): a diagonal matrix of a minus the outer product of a with itself."
_J = softmax_jacobian(_r.normal(size=5))
assert _np.allclose(_J.sum(axis=0), 0), "Each column of the Jacobian should sum to 0, since the weights always add to 1."
assert chain_ok is True or chain_ok == True, "chain_ok should be True: Jᵀ da reproduces the lesson's formula."
"SUCCESS: The whole Jacobian, diag(a) − aaᵀ, checked against nudging every score; multiplying it by the incoming gradient gives back the lesson's compact formula."
```

Hint: For one row, `np.diag(a) - np.outer(a, a)` has a_i(1 − a_i) on the diagonal and −a_i a_j elsewhere. For the numerical version, loop over the scores and set whole columns: `J[:, j] = (softmax(up) - softmax(down)) / 2e-6`.
:::

## What you learned

- Attention is a soft dictionary lookup: compare a query with every key (dot products), turn the scores into weights with a softmax, and return the weighted average of the values.
- Scaled dot-product attention: softmax(QKᵀ/√d_k)V for all queries at once. Dividing by √d_k keeps the scores' variance near 1 so the softmax does not saturate.
- In self-attention, Q, K and V all come from the same sequence through learned matrices W_Q, W_K, W_V; every position can draw directly on every other. It ignores order unless positions are added.
- A causal mask sets scores for later positions to −∞, so each position sees only the past; the weight matrix is lower-triangular.
- The softmax's backward pass is ds = a ⊙ (da − Σ a ⊙ da). With it, an attention model learned to find a marked item (accuracy 0.997, 98% of its weight on it) where averaging managed about 0.60.

One attention layer is a powerful lookup, but on its own it is still a weighted average. The next lesson assembles the full **transformer block**: several attention heads in parallel, positional information, a small feed-forward network, residual connections and layer normalisation, the unit that is stacked dozens of times in a large language model.
