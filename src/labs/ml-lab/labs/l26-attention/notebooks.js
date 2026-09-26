// Lab 26 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Tiny arrays throughout (3 keys, 4 to 16 tokens) so every number can be followed; the lesson's own example is
// scores (2, 0, 0) and values (10, 20, 30).

export const extras = {
  'l26-lookup': {
    formulaTex: '$$w_i = \\frac{e^{q\\cdot k_i}}{\\sum_j e^{q\\cdot k_j}} \\qquad o = \\sum_i w_i\\, v_i$$',
    mathCode: {
      rows: [
        ['$q \\cdot k_i$', 'scores = K @ q', 'How well each key matches the query.'],
        ['$w_i$', 'np.exp(scores - scores.max()); weights /= weights.sum()', 'Softmax: positive weights that sum to 1.'],
        ['$o = \\sum_i w_i v_i$', 'weights @ V', 'A weighted average of the values.'],
        ['$\\beta$', 'np.exp(beta * scores)', 'Sharpness: 0 averages everything, large β picks the best key.'],
      ],
    },
    notebook: {
      title: 'Lab 26.1 · Attention as a soft lookup',
      intro: 'The lesson’s example by hand, then what sharpening the scores does.',
      cells: [
        {
          title: 'One query, three keys',
          prose: '**Predict** the output before running (the lesson works it out).',
          code: `import numpy as np
q = np.array([1.0, 0.0])                        # what this position is looking for
K = np.array([[2.0, 0.0], [0.0, 1.0], [0.0, -1.0]])   # what each of three positions advertises
V = np.array([10.0, 20.0, 30.0])                # what each would hand over
scores = K @ q                                  # q·k for every key: (3,)
weights = np.exp(scores - scores.max()); weights /= weights.sum()
print("scores ", scores)
print("weights", np.round(weights, 3), "  sum", weights.sum())
print("output ", round(weights @ V, 2))`,
        },
        {
          title: 'From average to lookup',
          prose: '**Predict** the output at β = 0.',
          code: `import numpy as np
scores = np.array([2.0, 0.0, 0.0]); V = np.array([10.0, 20.0, 30.0])
for beta in [0, 1, 4, 30]:
    w = np.exp(beta * scores); w /= w.sum()          # beta sharpens the scores
    print(f"beta = {beta:2d}: weights {np.round(w, 3)}  output {w @ V:.2f}")`,
        },
      ],
    },
  },
  'l26-scaled': {
    formulaTex: '$$A = \\mathrm{softmax}\\!\\Big(\\frac{QK^\\top}{\\sqrt d}\\Big)V$$ $$(T, d)\\ \\to\\ (T, T)\\ \\to\\ (T, d)$$',
    mathCode: {
      rows: [
        ['$Q, K, V$', 'X @ W_Q, X @ W_K, X @ W_V', 'Three projections of the same tokens: (T, d) each.'],
        ['$QK^\\top/\\sqrt d$', 'Q @ K.T / np.sqrt(d)', 'Every token scored against every token: (T, T).'],
        ['softmax by row', 'W /= W.sum(axis=1, keepdims=True)', 'Each row is one token’s weights over all tokens.'],
        ['entropy', '-np.sum(W * np.log(W), axis=1)', 'How spread the weights are; log T when uniform.'],
        ['$A$', 'out = W @ V', 'The attention output: one updated vector per token, (T, d).'],
      ],
    },
    notebook: {
      title: 'Lab 26.2 · Scaled dot-product self-attention',
      intro: 'Self-attention in matrix form, and what dividing by √d does as d grows.',
      cells: [
        {
          title: 'Every token attends to every token',
          prose: '**Predict** the three shapes.',
          code: `import numpy as np
rng = np.random.default_rng(0)
T, d = 4, 8
X = rng.normal(size=(T, d))                                   # four token vectors
W_Q, W_K, W_V = (rng.normal(0, 1 / np.sqrt(d), (d, d)) for _ in range(3))
Q, K, V = X @ W_Q, X @ W_K, X @ W_V                           # (T, d) each
S = Q @ K.T / np.sqrt(d)                                      # (T, T): every token against every token
W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
out = W @ V                                                   # (T, d): one updated vector per token
print("scores", S.shape, " weights", W.shape, " output", out.shape)
print("each row of weights sums to 1:", np.allclose(W.sum(axis=1), 1))`,
        },
        {
          title: 'Why divide by √d',
          prose: '**Predict** how the unscaled entropy changes as d grows.',
          code: `import numpy as np
rng = np.random.default_rng(1)
def row_entropy(S):
    W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
    return float(np.mean(-np.sum(W * np.log(W + 1e-30), axis=1)))
T = 16
print(f"uniform weights over {T} tokens have entropy log {T} = {np.log(T):.2f}")
for d in [4, 16, 64, 256]:
    Q, K = rng.normal(size=(T, d)), rng.normal(size=(T, d))
    raw = Q @ K.T
    print(f"d = {d:3d}: spread of q.k {raw.std():5.1f}   entropy unscaled {row_entropy(raw):.2f}   scaled by sqrt(d) {row_entropy(raw / np.sqrt(d)):.2f}")`,
        },
      ],
    },
  },
  'l26-masks': {
    formulaTex: '$$S_{ij} = -\\infty\\ \\ (j > i)$$ $$\\mathrm{PE}_{p,\\,2i} = \\sin\\!\\big(p/10000^{2i/d}\\big)$$ $$\\mathrm{PE}_{p,\\,2i+1} = \\cos\\!\\big(p/10000^{2i/d}\\big)$$',
    mathCode: {
      rows: [
        ['$S_{ij} = -\\infty,\\ j > i$', 'S[np.triu(np.ones((T, T), bool), k=1)] = -np.inf', 'The causal mask: no weight on later positions.'],
        ['$\\mathrm{PE}$', 'PE[:, 0::2] = np.sin(...); PE[:, 1::2] = np.cos(...)', 'Sinusoidal positions, added to the token vectors.'],
        ['permutation', 'X[perm]', 'The same tokens in another order.'],
      ],
    },
    notebook: {
      title: 'Lab 26.3 · Masks and positional information',
      intro: 'A causal mask checked by changing a future token, and permutation equivariance with and without positions.',
      cells: [
        {
          title: 'A causal mask',
          prose: '**Predict** which outputs change when only the last token changes.',
          code: `import numpy as np
rng = np.random.default_rng(2)
T, d = 4, 8
X = rng.normal(size=(T, d))
def causal_attention(X):
    S = X @ X.T / np.sqrt(d)
    S[np.triu(np.ones((T, T), bool), k=1)] = -np.inf          # j > i: a later position
    W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
    return W @ X, W
out, W = causal_attention(X)
print("masked entries:", int(np.isinf(np.triu(np.full((T, T), -np.inf), 1)).sum()), "of", T * T)
print(np.round(W, 2))
X2 = X.copy(); X2[3] += 5.0                                    # change only the last token
out2, _ = causal_attention(X2)
print("earlier outputs unchanged:", np.allclose(out[:3], out2[:3]), "  last output changed:", not np.allclose(out[3], out2[3]))`,
        },
        {
          title: 'Order, with and without positions',
          prose: '**Predict** both answers.',
          code: `import numpy as np
rng = np.random.default_rng(3)
T, d = 5, 8
X = rng.normal(size=(T, d))
def attend(X):
    S = X @ X.T / np.sqrt(d)
    W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
    return W @ X
pos = np.arange(T)[:, None]; i = np.arange(d // 2)[None, :]
PE = np.zeros((T, d)); PE[:, 0::2] = np.sin(pos / 10000 ** (2 * i / d)); PE[:, 1::2] = np.cos(pos / 10000 ** (2 * i / d))
perm = np.array([1, 0, 2, 3, 4])                               # swap the first two tokens
print("without positions, permuting inputs just permutes outputs:", np.allclose(attend(X[perm]), attend(X)[perm]))
print("with positions added                                    :", np.allclose(attend(X[perm] + PE), attend(X + PE)[perm]))`,
        },
      ],
    },
  },
  'l26-heads': {
    formulaTex: '$$(T, d) \\to (h, T, d/h) \\to (h, T, T) \\to (T, d)$$ $$x \\leftarrow x + \\mathrm{MHA}(\\mathrm{LN}(x))$$ $$x \\leftarrow x + \\mathrm{MLP}(\\mathrm{LN}(x))$$',
    mathCode: {
      rows: [
        ['split into heads', 'M.reshape(T, h, d // h).transpose(1, 0, 2)', '(T, d) to (h, T, d/h).'],
        ['scores per head', 'Qh @ Kh.transpose(0, 2, 1) / np.sqrt(d // h)', 'One (T, T) matrix for each head.'],
        ['concatenate', 'heads.transpose(1, 0, 2).reshape(T, d)', 'Back to (T, d), then W_O.'],
        ['$\\mathrm{MHA}$', 'the heads above, then W_O', 'Multi-head attention.'],
        ['$\\mathrm{MLP}$', 'd -> 4d -> GELU -> d, per token', 'The block’s feed-forward part.'],
        ['$\\mathrm{LN}$', '(x - x.mean()) / np.sqrt(x.var() + 1e-5)', 'LayerNorm: each token’s vector to mean 0, variance 1.'],
        ['$\\approx 12 d^2$', 'block_params(d)', 'Parameters per transformer block.'],
      ],
    },
    notebook: {
      title: 'Lab 26.4 · Multi-head attention and the transformer block',
      intro: 'Shapes through multi-head attention, and a transformer block’s parameters counted exactly.',
      cells: [
        {
          title: 'Heads by reshaping',
          prose: '**Predict** the per-head shape for d = 16 and h = 4.',
          code: `import numpy as np
rng = np.random.default_rng(4)
T, d, h = 6, 16, 4
Q, K, V = (rng.normal(size=(T, d)) for _ in range(3))
split = lambda M: M.reshape(T, h, d // h).transpose(1, 0, 2)     # (T, d) -> (h, T, d/h)
Qh, Kh, Vh = split(Q), split(K), split(V)
S = Qh @ Kh.transpose(0, 2, 1) / np.sqrt(d // h)                  # (h, T, T): one score matrix per head
W = np.exp(S - S.max(axis=2, keepdims=True)); W /= W.sum(axis=2, keepdims=True)
heads = W @ Vh                                                     # (h, T, d/h)
concat = heads.transpose(1, 0, 2).reshape(T, d)                    # back to (T, d)
print("per-head Q", Qh.shape, " scores", S.shape, " heads", heads.shape, " concatenated", concat.shape)`,
        },
        {
          title: 'A block’s parameters, and LayerNorm',
          prose: '**Predict** how close 12d² is to the exact count.',
          code: `import numpy as np
def block_params(d, mult=4):
    attention = 4 * d * d + 4 * d                 # W_Q, W_K, W_V, W_O and their biases
    mlp = d * mult * d + mult * d + mult * d * d + d
    norms = 4 * d                                 # two LayerNorms: scale and shift each
    return attention + mlp + norms
for d in [256, 512, 768]:
    print(f"d = {d}: {block_params(d):,} parameters per block   (12 d^2 = {12 * d * d:,})")
x = np.array([2.0, 4.0, 6.0, 8.0])
normed = (x - x.mean()) / np.sqrt(x.var() + 1e-5)
print("LayerNorm of", x, "->", np.round(normed, 3), " mean", round(normed.mean(), 6), " variance", round(normed.var(), 4))`,
        },
      ],
    },
  },
  'l26-interpret': {
    formulaTex: '$$o = \\sum_i w_i v_i \\qquad o_{-A} = \\frac{\\sum_{i \\ne A} w_i v_i}{\\sum_{i \\ne A} w_i}$$',
    mathCode: {
      rows: [
        ['$w_A$', 'w[0]', 'The attention weight on token A.'],
        ['$o_{-A}$', 'w_without_a @ V[1:]', 'The output with A removed and the weights renormalized.'],
        ['influence', 'full - (w_without_a @ V[1:])', 'What removing A changes: the evidence, unlike the weight.'],
      ],
    },
    notebook: {
      title: 'Lab 26.5 · What attention weights do and do not tell you',
      intro: 'A token with most of the attention whose removal changes nothing.',
      cells: [
        {
          title: 'Weight is not influence',
          prose: '**Predict** the output without A.',
          code: `import numpy as np
V = np.array([5.0, 4.0, 6.0])                      # token A's value equals the average of the others
w = np.array([0.7, 0.15, 0.15])                    # the head reads mostly from A
full = w @ V
w_without_a = w[1:] / w[1:].sum()                  # remove A and renormalize
print(f"weight on A: {w[0]}   output {full:.3f}   without A {w_without_a @ V[1:]:.3f}")
V2 = np.array([50.0, 4.0, 6.0])                    # now A's value is very different
print(f"if A's value were 50: output {w @ V2:.3f} vs without A {w_without_a @ V2[1:]:.3f}")`,
        },
      ],
    },
  },
}
