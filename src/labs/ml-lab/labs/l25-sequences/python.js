export default {
  filename: 'sequences.py', packages: ['numpy'],
  title: 'Embeddings, padding, masking and an RNN.',
  intro: 'Implement the sequence-modelling plumbing: build a padded batch with a mask, look up embeddings, compute a masked mean, and run a recurrent network that skips padded steps. The checks prove the key properties — order invariance of pooling, order sensitivity of the RNN, and independence from padding length.',
  steps: [
    '`pad_batch(seqs, pad_id=0, length=None)` → `(tokens, mask)` of shape `(B, T)`; T is the longest sequence unless `length` is given; mask is 1.0 for real tokens.',
    '`embed(E, tokens)` → `(B, T, d)` by indexing rows of E.',
    '`masked_mean(X, mask)` → `(B, d)`: average only over real positions.',
    '`rnn_forward(X, mask, Wx, Wh, b)` → final hidden states `(B, h)`: `h = tanh(x_t Wx + h Wh + b)` for real steps; padded steps keep h unchanged.',
  ],
  hints: [
    ['Masks', '`mask = (tokens != pad_id).astype(float)`.'],
    ['Masked mean', '`(X * mask[:, :, None]).sum(axis=1) / mask.sum(axis=1, keepdims=True)`.'],
    ['Skipping pads', 'At step t: `new = np.tanh(X[:, t] @ Wx + h @ Wh + b)`; `m = mask[:, t:t+1]`; `h = m * new + (1 - m) * h`.'],
  ],
  starter: `import numpy as np

def pad_batch(seqs, pad_id=0, length=None):
    raise NotImplementedError

def embed(E, tokens):
    raise NotImplementedError

def masked_mean(X, mask):
    raise NotImplementedError

def rnn_forward(X, mask, Wx, Wh, b):
    raise NotImplementedError
`,
  solution: `import numpy as np

def pad_batch(seqs, pad_id=0, length=None):
    T = length or max(len(s) for s in seqs)
    tokens = np.full((len(seqs), T), pad_id, dtype=int)
    for i, s in enumerate(seqs):
        tokens[i, :len(s)] = s
    return tokens, (tokens != pad_id).astype(float)

def embed(E, tokens):
    return E[tokens]

def masked_mean(X, mask):
    return (X * mask[:, :, None]).sum(axis=1) / mask.sum(axis=1, keepdims=True)

def rnn_forward(X, mask, Wx, Wh, b):
    h = np.zeros((X.shape[0], Wh.shape[0]))
    for t in range(X.shape[1]):
        new = np.tanh(X[:, t] @ Wx + h @ Wh + b)
        m = mask[:, t:t + 1]
        h = m * new + (1 - m) * h
    return h
`,
  solutionNote: 'The mask multiplies the update, so padded steps leave the hidden state exactly as it was — which is why padding length cannot change the result.',
  checkSummary: 'Padded shapes, values and masks; embedding lookup shape and rows; masked mean against a manual average; the pooled representation being identical for reversed sequences while the RNN\'s is not; and RNN states unchanged when the same batch is padded to a much longer length.',
  checks: `
import numpy as np
_tok, _mask = pad_batch([[3, 1, 2], [5], [4, 4]])
np.testing.assert_array_equal(_tok, [[3, 1, 2], [5, 0, 0], [4, 4, 0]])
np.testing.assert_array_equal(_mask, [[1, 1, 1], [1, 0, 0], [1, 1, 0]])
assert pad_batch([[1, 2]], length=5)[0].shape == (1, 5)
_rng = np.random.default_rng(0)
_E = _rng.normal(size=(6, 4))
_X = embed(_E, _tok)
assert _X.shape == (3, 3, 4) and np.allclose(_X[0, 1], _E[1])
np.testing.assert_allclose(masked_mean(_X, _mask)[2], (_E[4] + _E[4]) / 2, err_msg="Pads must not enter the mean")
print("PASS: padding, masks, embedding lookup and masked mean")
_Wx, _Wh, _b = _rng.normal(size=(4, 5)), 0.5 * _rng.normal(size=(5, 5)), np.zeros(5)
_fw, _m1 = pad_batch([[1, 2, 3, 4]]); _bw, _m2 = pad_batch([[4, 3, 2, 1]])
np.testing.assert_allclose(masked_mean(embed(_E, _fw), _m1), masked_mean(embed(_E, _bw), _m2), err_msg="Pooling ignores order")
assert not np.allclose(rnn_forward(embed(_E, _fw), _m1, _Wx, _Wh, _b), rnn_forward(embed(_E, _bw), _m2, _Wx, _Wh, _b)), "An RNN must be order-sensitive"
_short = pad_batch([[3, 1, 2], [5], [4, 4]]); _long = pad_batch([[3, 1, 2], [5], [4, 4]], length=12)
_h1 = rnn_forward(embed(_E, _short[0]), _short[1], _Wx, _Wh, _b)
_h2 = rnn_forward(embed(_E, _long[0]), _long[1], _Wx, _Wh, _b)
assert _h1.shape == (3, 5)
np.testing.assert_allclose(_h1, _h2, err_msg="With masking, extra padding must not change the RNN state")
print("PASS: pooling is order-invariant, the RNN is order-sensitive, and masking makes it padding-invariant")
`,
}
