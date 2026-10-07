# The transformer block

The last lesson built attention: each position looks at every other position and takes a weighted average of what it finds. A **transformer** wraps attention in a few more pieces and stacks the result many times. Since 2017 this design has taken over language modelling, translation and much of image and speech processing; the large language models of today are, at heart, a stack of identical transformer blocks between an embedding layer and an output layer.

This lesson assembles one block from its parts and then a tiny GPT-style model. The parts are:

- **multi-head attention**, several attentions in parallel;
- **positional encoding**, so the model knows the order of the tokens;
- **layer normalisation**;
- a small **feed-forward network** applied to each position;
- **residual connections** around everything.

Each part is built in NumPy and checked for the property it is there to provide. Training uses exactly the backpropagation you have already built (lesson 58 trained attention by gradient descent), so here the focus is on what each piece does. The lesson ends by counting the parameters of a real model, GPT-2.

## Multi-head attention

One attention computes one set of weights: each position decides on a single pattern of where to look. But a word may need several kinds of information at once: the subject of its verb, the noun a pronoun refers to, the word just before it. **Multi-head attention** runs several smaller attentions, called **heads**, side by side. With model width d and h heads, each head works in d/h dimensions: its own slices of Q, K and V, its own weights. The heads' outputs are concatenated back to width d and mixed by one more matrix, W_O.

The total cost is about the same as one full-width attention, but the model gets h different patterns of looking. In practice, after training, different heads often specialise: one tracks the previous token, another matches brackets, another links pronouns to nouns.

```python type
import numpy as np

def softmax_rows(scores):
    e = np.exp(scores - scores.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def multi_head_attention(X, W_Q, W_K, W_V, W_O, heads, causal=True):
    T, d = X.shape
    d_head = d // heads
    Q = (X @ W_Q).reshape(T, heads, d_head).transpose(1, 0, 2)
    K = (X @ W_K).reshape(T, heads, d_head).transpose(1, 0, 2)
    V = (X @ W_V).reshape(T, heads, d_head).transpose(1, 0, 2)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d_head)
    if causal:
        scores = np.where(np.triu(np.ones((T, T), dtype=bool), k=1), -np.inf, scores)
    weights = softmax_rows(scores)
    heads_out = weights @ V
    return heads_out.transpose(1, 0, 2).reshape(T, d) @ W_O, weights

rng = np.random.default_rng(0)
T, d, heads = 6, 16, 4
X = rng.normal(size=(T, d))
W_Q, W_K, W_V, W_O = (rng.normal(0, 1 / np.sqrt(d), (d, d)) for _ in range(4))
out, weights = multi_head_attention(X, W_Q, W_K, W_V, W_O, heads)
print("output", out.shape, "  weights", weights.shape, "(one T × T pattern per head)")
print("head 0's weights for the last position:", weights[0, -1].round(2))
print("head 1's weights for the last position:", weights[1, -1].round(2))
```

```output
output (6, 16)   weights (4, 6, 6) (one T × T pattern per head)
head 0's weights for the last position: [0.17 0.15 0.19 0.13 0.2  0.17]
head 1's weights for the last position: [0.15 0.2  0.04 0.14 0.42 0.04]
```

The reshape and transpose split each of Q, K and V into `heads` slices of width d/h and move the head number to the front, so `Q @ K.transpose(0, 2, 1)` computes every head's T × T scores at once (matrix multiplication works on the last two axes and repeats over the first). After the weighted averages, the reverse transpose and reshape glue the heads back side by side, and W_O mixes them. Even with random weights, each head has its own pattern of attention.

## Positional encoding

Attention has no sense of order: shuffle the tokens and every output is shuffled the same way, with no other change. "Dog bites man" and "man bites dog" would look identical. So information about each token's **position** is added to its embedding before the first block.

The original transformer used fixed **sinusoidal** encodings. Position `p` gets a d-dimensional vector whose entries are sines and cosines of `p` at many frequencies: pairs of entries (2i, 2i + 1) hold sin(p / 10000^(2i/d)) and cos(p / 10000^(2i/d)). Low dimensions oscillate quickly, high ones slowly, like the hands of a clock running at many speeds. Nearby positions get similar vectors, and the similarity falls with distance. Predict before running: how will the dot product between position 10's vector and position 10 + k's change as k grows?

```python type
import numpy as np
import matplotlib.pyplot as plt

def positional_encoding(length, d):
    positions = np.arange(length)[:, None]
    frequencies = 1 / 10000 ** (np.arange(0, d, 2) / d)
    P = np.zeros((length, d))
    P[:, 0::2] = np.sin(positions * frequencies)
    P[:, 1::2] = np.cos(positions * frequencies)
    return P

P = positional_encoding(50, 64)
print("dot product of position 10 with position 10 + k:")
print({k: round(float(P[10] @ P[10 + k]), 1) for k in [0, 1, 2, 5, 10, 20, 39]})

fig, ax = plt.subplots(figsize=(7, 3))
ax.imshow(P.T, cmap="RdBu_r", aspect="auto")
ax.set_xlabel("position")
ax.set_ylabel("dimension")
plt.show()
```

```output
dot product of position 10 with position 10 + k:
{0: 32.0, 1: 30.9, 2: 28.3, 5: 23.5, 10: 21.1, 20: 18.9, 39: 15.3}
```

`P[:, 0::2]` is every even column and `P[:, 1::2]` every odd one. The dot product falls steadily with distance, from 32 (a vector with itself) to about 31 at distance 1, 24 at distance 5 and 15 at distance 39, so position information gives attention something to tell near from far with. (The differences between neighbours are small, and in a real model the vectors pass through W_Q and W_K first, which can amplify the ones that matter.) The image shows the clock-hand pattern: fast stripes in the low dimensions, slow ones higher up. Many modern models instead **learn** a position embedding (one vector per position, like a word embedding), or use **rotary** encodings that rotate queries and keys by an angle depending on position; the purpose is the same.

## Layer normalisation

**Layer normalisation** standardises each token's vector on its own: subtract the mean of its d entries and divide by their standard deviation, then scale and shift with learned γ and β (one per dimension). It is the batch normalisation of the regularising lesson turned sideways: normalising across the features of one example instead of across the batch, so it works identically during training and at test time, and for sequences of any length. It keeps the scale of the vectors under control as they pass through many blocks.

## The feed-forward network

After attention has mixed information **between** positions, each position's vector goes through a small two-layer network on its own: expand to 4d units with a ReLU or GELU, then project back to d. The same network is applied to every position. If attention is where tokens communicate, the feed-forward network is where each token "thinks" about what it has gathered. About two thirds of each block's parameters live here (and, in GPT-2 small, about 46% of the whole model; much of the rest is the token embedding).

## Residual connections

Finally, each of the two sub-layers is wrapped in a **residual connection**: its output is **added** to its input instead of replacing it. A block computes

\[
x \leftarrow x + \text{Attention}(\text{LN}(x)), \qquad x \leftarrow x + \text{FFN}(\text{LN}(x))
\]

(this is the "pre-norm" arrangement used by GPT-2 and most models since). The running vector x is called the **residual stream**: each sub-layer reads it and adds a small update. This matters enormously for depth. Gradients flow straight back along the additions, much as they did along the LSTM's cell state (and here not even scaled by a forget gate), and information from the input is never wiped out. Without residual connections, a deep stack of attention layers tends to make all positions identical, because each attention layer averages them together.

Here is a stack of 12 blocks with random weights, with and without the residual additions. Before running, predict: without residuals, what happens to the differences between the 10 token vectors?

```python type
import numpy as np

def layer_norm(x):
    return (x - x.mean(axis=-1, keepdims=True)) / np.sqrt(x.var(axis=-1, keepdims=True) + 1e-5)

def attention(x, W_Q, W_K, W_V, W_O):
    scores = (x @ W_Q) @ (x @ W_K).T / np.sqrt(x.shape[1])
    weights = np.exp(scores - scores.max(axis=1, keepdims=True))
    weights /= weights.sum(axis=1, keepdims=True)
    return weights @ (x @ W_V) @ W_O

def mean_pairwise_similarity(x):
    unit = x / np.linalg.norm(x, axis=1, keepdims=True)
    sims = unit @ unit.T
    return (sims.sum() - len(x)) / (len(x) * (len(x) - 1))

rng = np.random.default_rng(0)
d, T = 64, 10
for residual in [False, True]:
    x = rng.normal(size=(T, d))
    start = x.copy()
    for layer in range(12):
        W_Q, W_K, W_V, W_O = (rng.normal(0, 1 / np.sqrt(d), (d, d)) for _ in range(4))
        W1, W2 = rng.normal(0, np.sqrt(2 / d), (d, 4 * d)), rng.normal(0, 1 / np.sqrt(4 * d), (4 * d, d))
        update = attention(layer_norm(x), W_Q, W_K, W_V, W_O)
        x = x + update if residual else update
        update = np.maximum(0, layer_norm(x) @ W1) @ W2
        x = x + update if residual else update
    kept = np.mean([x[i] @ start[i] / np.linalg.norm(x[i]) / np.linalg.norm(start[i]) for i in range(T)])
    label = "with residuals   " if residual else "without residuals"
    print(f"{label}: similarity between different tokens {mean_pairwise_similarity(x):.3f}, similarity of each token to its input {kept:.3f}")
```

```output
without residuals: similarity between different tokens 1.000, similarity of each token to its input 0.033
with residuals   : similarity between different tokens 0.698, similarity of each token to its input 0.281
```

`mean_pairwise_similarity` averages the cosine similarity over all pairs of different tokens: 1 means they have all become the same vector. Without residuals, after 12 blocks the tokens are identical (1.000) and have nothing left in common with their inputs (0.03): every position now carries the same information, which is useless. With residuals the tokens remain distinct (0.70), and each still carries a recognisable trace of its input (0.28) after twelve random blocks. With trained weights, each block learns to add useful updates to the stream rather than random ones.

## A tiny GPT

Put it together. A GPT-style model (a "decoder-only" transformer, like the GPT family) maps a sequence of token ids to a prediction for the next token at every position:

1. token embedding plus position embedding;
2. a stack of blocks, each causal multi-head attention and a feed-forward network, with layer norms and residuals;
3. a final layer norm, then a linear map back to the vocabulary, giving scores (logits) over every possible next token; a softmax makes them probabilities.

Here is a complete one with random weights: a character vocabulary, width 32, 4 heads and 2 blocks. Before running, predict two things: roughly what its average next-character loss will be before any training, and whether changing the **last** character of the input can change the predictions at earlier positions.

```python type
import numpy as np

text = "the cat sat on the mat. the dog sat on the log."
chars = sorted(set(text))
ids = np.array([chars.index(c) for c in text])
V, T, d, heads = len(chars), len(text), 32, 4
rng = np.random.default_rng(0)

def layer_norm(x):
    return (x - x.mean(axis=-1, keepdims=True)) / np.sqrt(x.var(axis=-1, keepdims=True) + 1e-5)

def softmax(z):
    e = np.exp(z - z.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(x, W_Q, W_K, W_V, W_O):
    n, d_head = len(x), d // heads
    Q, K, V_ = ((x @ W).reshape(n, heads, d_head).transpose(1, 0, 2) for W in (W_Q, W_K, W_V))
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d_head)
    scores = np.where(np.triu(np.ones((n, n), dtype=bool), k=1), -np.inf, scores)
    return (softmax(scores) @ V_).transpose(1, 0, 2).reshape(n, d) @ W_O

token_embedding = rng.normal(0, 0.02, (V, d))
position_embedding = rng.normal(0, 0.02, (T, d))
blocks = [{"attn": [rng.normal(0, 1 / np.sqrt(d), (d, d)) for _ in range(4)],
           "W1": rng.normal(0, np.sqrt(2 / d), (d, 4 * d)), "W2": rng.normal(0, 1 / np.sqrt(4 * d), (4 * d, d))}
          for _ in range(2)]

def gpt(ids):
    x = token_embedding[ids] + position_embedding[:len(ids)]
    for block in blocks:
        x = x + attention(layer_norm(x), *block["attn"])
        x = x + np.maximum(0, layer_norm(x) @ block["W1"]) @ block["W2"]
    return layer_norm(x) @ token_embedding.T

logits = gpt(ids)
probs = softmax(logits[:-1])
loss = -np.mean(np.log(probs[np.arange(T - 1), ids[1:]]))
print(f"vocabulary {V}, logits {logits.shape}; untrained next-character loss {loss:.3f}, ln({V}) = {np.log(V):.3f}")

changed = ids.copy()
changed[-1] = (changed[-1] + 1) % V
difference = np.abs(gpt(changed)[:-1] - logits[:-1]).max()
print(f"largest change in the predictions at earlier positions after editing the last character: {difference:.1e}")
```

```output
vocabulary 14, logits (47, 14); untrained next-character loss 2.692, ln(14) = 2.639
largest change in the predictions at earlier positions after editing the last character: 0.0e+00
```

`token_embedding[ids]` looks up each character's vector and `position_embedding[:len(ids)]` adds one vector per position (learned embeddings, started small with standard deviation 0.02, as in GPT-2). The output layer reuses the token embedding matrix, transposed ("tied" weights). The logits at position t are the scores for character t + 1, so the loss compares `logits[:-1]` with `ids[1:]`, the input shifted by one.

Untrained, the loss is close to ln V, the loss of a uniform guess over the vocabulary, just as for the untrained digit network. And editing the last character changes no earlier prediction at all (the difference is exactly 0): the causal masks in both blocks keep every position blind to the future. Training is the character model of the RNN lesson at scale: backpropagation through every piece here (attention, layer norm, the feed-forward networks and the embeddings) to minimise that loss. The challenges below build the pieces; the last one counts the parameters of a real model.

::: challenge Layer norm [easy]
Write `layer_norm(x, gamma, beta, eps=1e-5)` that normalises each row of `x` (each token's vector) to mean 0 and variance 1 over its features, then returns `gamma * normalised + beta` (gamma and beta have one entry per feature). It must work for arrays with any number of leading axes, normalising over the last axis only.

```python starter
import numpy as np

def layer_norm(x, gamma, beta, eps=1e-5):
    return x
```

```python solution
import numpy as np

def layer_norm(x, gamma, beta, eps=1e-5):
    mean = x.mean(axis=-1, keepdims=True)
    variance = x.var(axis=-1, keepdims=True)
    return gamma * (x - mean) / np.sqrt(variance + eps) + beta
```

```python test
import numpy as _np
assert "layer_norm" in dir(), "Keep the function's name as layer_norm."
_r = _np.random.default_rng(0)
_x = _r.normal(3.0, 5.0, (4, 6))
_y = layer_norm(_x, _np.ones(6), _np.zeros(6))
assert _np.allclose(_y.mean(axis=1), 0, atol=1e-7) and _np.allclose(_y.var(axis=1), 1, atol=1e-3), "Each row should end up with mean 0 and variance 1. Normalise over the last axis (the features), not over the rows."
_g, _b = _r.normal(size=6), _r.normal(size=6)
_ref = _g * (_x - _x.mean(-1, keepdims=True)) / _np.sqrt(_x.var(-1, keepdims=True) + 1e-5) + _b
assert _np.allclose(layer_norm(_x, _g, _b), _ref), "After normalising, scale by gamma and shift by beta."
_x3 = _r.normal(size=(2, 5, 6))
_ref3 = (_x3 - _x3.mean(-1, keepdims=True)) / _np.sqrt(_x3.var(-1, keepdims=True) + 1e-5)
assert _np.allclose(layer_norm(_x3, _np.ones(6), _np.zeros(6)), _ref3), "With a batch of sequences, shape (batch, T, d), each token's vector is normalised on its own."
_single = layer_norm(_x[:1], _np.ones(6), _np.zeros(6))
assert _np.allclose(_single, _y[:1]), "A token's normalised vector should not depend on the other tokens, unlike batch norm."
"SUCCESS: Every token normalised on its own, the same at training and test time."
```

Hint: Use `axis=-1, keepdims=True` for both the mean and the variance, so the statistics are per token and broadcast back over its features.
:::

::: challenge Heads, one at a time [medium]
Check that the lesson's vectorised multi-head attention really is several independent attentions side by side. Write `heads_by_loop(X, W_Q, W_K, W_V, W_O, heads)` **without** reshaping into a head axis: loop over the heads; for head `h`, take columns `h·d_head` to `(h + 1)·d_head` of X @ W_Q, X @ W_K and X @ W_V, compute causal scaled dot-product attention for that head alone (scaling by √d_head), collect the head outputs, concatenate them along the feature axis with `np.concatenate`, and multiply by W_O.

The check compares your result with the vectorised version.

```python starter
import numpy as np

def heads_by_loop(X, W_Q, W_K, W_V, W_O, heads):
    return X
```

```python solution
import numpy as np

def heads_by_loop(X, W_Q, W_K, W_V, W_O, heads):
    T, d = X.shape
    d_head = d // heads
    Q, K, V = X @ W_Q, X @ W_K, X @ W_V
    future = np.triu(np.ones((T, T), dtype=bool), k=1)
    outputs = []
    for h in range(heads):
        cols = slice(h * d_head, (h + 1) * d_head)
        scores = Q[:, cols] @ K[:, cols].T / np.sqrt(d_head)
        scores = np.where(future, -np.inf, scores)
        weights = np.exp(scores - scores.max(axis=1, keepdims=True))
        weights /= weights.sum(axis=1, keepdims=True)
        outputs.append(weights @ V[:, cols])
    return np.concatenate(outputs, axis=1) @ W_O
```

```python test
import numpy as _np
assert "heads_by_loop" in dir(), "Keep the function's name as heads_by_loop."
def _mha(X, WQ, WK, WV, WO, heads):
    T, d = X.shape; dh = d // heads
    Q = (X @ WQ).reshape(T, heads, dh).transpose(1, 0, 2)
    K = (X @ WK).reshape(T, heads, dh).transpose(1, 0, 2)
    V = (X @ WV).reshape(T, heads, dh).transpose(1, 0, 2)
    s = Q @ K.transpose(0, 2, 1) / _np.sqrt(dh)
    s = _np.where(_np.triu(_np.ones((T, T), dtype=bool), k=1), -_np.inf, s)
    w = _np.exp(s - s.max(-1, keepdims=True)); w /= w.sum(-1, keepdims=True)
    return (w @ V).transpose(1, 0, 2).reshape(T, d) @ WO
_r = _np.random.default_rng(1)
for _T, _d, _h in [(5, 8, 2), (7, 12, 3), (4, 16, 4)]:
    _X = _r.normal(size=(_T, _d))
    _W = [_r.normal(0, 1 / _np.sqrt(_d), (_d, _d)) for _ in range(4)]
    _got = heads_by_loop(_X, *_W, _h)
    assert _np.shape(_got) == (_T, _d), f"The output should have shape (T, d) = {(_T, _d)}."
    assert _np.allclose(_got, _mha(_X, *_W, _h)), f"With {_h} heads your result differs from the vectorised multi-head attention. Scale each head by √(d / heads), apply the causal mask, and concatenate the heads in order before W_O."
assert "reshape" not in _source and "transpose" not in _source, "Do it with a loop over column slices, without reshaping into a head axis."
"SUCCESS: The loop and the vectorised version agree: multi-head attention is just several smaller attentions on slices of Q, K and V, glued back together."
```

Hint: `slice(h * d_head, (h + 1) * d_head)` picks head `h`'s columns. Each head is exactly the lesson's single attention with the causal mask, scaled by `np.sqrt(d_head)`. `np.concatenate(outputs, axis=1)` puts the heads side by side.
:::

::: challenge Counting GPT-2 [easy]
Write `gpt_parameters(vocab, context, d, layers)` returning the number of parameters in a GPT-2-style model:

- a token embedding (vocab × d) and a learned position embedding (context × d);
- per block: two layer norms (γ and β each, so 2d each); attention's combined Q, K, V matrix (d × 3d, plus 3d biases) and output matrix (d × d, plus d biases); the feed-forward network's two layers (d × 4d plus 4d biases, and 4d × d plus d biases);
- a final layer norm (2d);
- the output layer reuses the token embedding matrix (it is "tied"), so it adds nothing.

Store the count for GPT-2 small (vocabulary 50,257, context 1,024, d = 768, 12 layers) in `gpt2_small`, and in `share_ffn` the fraction of one block's parameters that belong to the feed-forward network.

```python starter
def gpt_parameters(vocab, context, d, layers):
    return 0

gpt2_small = gpt_parameters(50257, 1024, 768, 12)
share_ffn = 0.0
print(f"{gpt2_small:,}", share_ffn)
```

```python solution
def gpt_parameters(vocab, context, d, layers):
    embeddings = vocab * d + context * d
    attention = d * 3 * d + 3 * d + d * d + d
    feed_forward = d * 4 * d + 4 * d + 4 * d * d + d
    norms = 2 * (2 * d)
    return embeddings + layers * (attention + feed_forward + norms) + 2 * d

gpt2_small = gpt_parameters(50257, 1024, 768, 12)
d = 768
block = (d * 3 * d + 3 * d + d * d + d) + (d * 4 * d + 4 * d + 4 * d * d + d) + 4 * d
share_ffn = (d * 4 * d + 4 * d + 4 * d * d + d) / block
print(f"{gpt2_small:,}", share_ffn)
```

```python test
assert "gpt_parameters" in dir(), "Keep the function's name as gpt_parameters."
assert gpt_parameters(10, 4, 2, 0) == 10 * 2 + 4 * 2 + 2 * 2, "With no blocks, only the two embeddings and the final layer norm remain."
_d = 4
_block = (_d * 3 * _d + 3 * _d + _d * _d + _d) + (_d * 4 * _d + 4 * _d + 4 * _d * _d + _d) + 4 * _d
assert gpt_parameters(10, 4, _d, 1) - gpt_parameters(10, 4, _d, 0) == _block, "One block's parameters are wrong: count attention (Q, K, V and output, with biases), the feed-forward network (two layers with biases) and two layer norms."
assert gpt2_small == 124439808, "The total for GPT-2 small is wrong. Check each part against the list, and remember the output layer is tied to the token embedding."
_ffn = (768 * 3072 + 3072 + 3072 * 768 + 768)
_blk = (768 * 2304 + 2304 + 768 * 768 + 768) + _ffn + 4 * 768
assert abs(share_ffn - _ffn / _blk) < 1e-9, "share_ffn should be the feed-forward network's parameters divided by all of one block's."
f"SUCCESS: {gpt2_small:,} parameters: the published size of GPT-2 small. Two thirds of each block ({share_ffn:.0%}) is the feed-forward network, and almost a third of the whole model is the token embedding."
```

Hint: Write one block's count as three parts (attention, feed-forward, two layer norms), multiply by the number of layers, and add the two embeddings and the final layer norm. Every linear layer here has a bias as long as its output.
:::

## What you learned

- Multi-head attention runs h attentions in parallel on d/h-dimensional slices of Q, K and V, concatenates them and mixes them with W_O; heads can learn different patterns of looking.
- Attention ignores order, so positions are added to the embeddings: sinusoidal encodings (similarity falls with distance), learned position embeddings, or rotary encodings.
- Layer norm standardises each token's vector on its own; the feed-forward network (d → 4d → d) processes each position separately and holds about two thirds of each block's parameters.
- Residual connections add each sub-layer's output to the residual stream: x ← x + Attention(LN(x)), x ← x + FFN(LN(x)). They keep gradients flowing and stop deep stacks from making every position identical (random 12-block stack: token similarity 1.000 without residuals, 0.70 with).
- A GPT-style model is token and position embeddings, a stack of causal blocks, a final layer norm and a projection to vocabulary logits, trained on next-token prediction. GPT-2 small has 124,439,808 parameters.

Transformers, like all the networks so far, learn to map inputs to labels. The next lesson turns to networks that learn to **reconstruct** their input through a narrow bottleneck, autoencoders, which find compact representations without any labels at all.
