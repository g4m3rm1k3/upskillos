export default {
  filename: 'attention.py', packages: ['numpy'],
  title: 'Multi-head attention with masks.',
  intro: 'Implement scaled dot-product attention with an optional boolean mask, a causal mask, sinusoidal positional encodings, layer normalization, and multi-head attention with head splitting. The checks verify every structural property from this lab: rows sum to one, masked weights are zero, the future cannot influence the past, and attention is permutation-equivariant until positions are added.',
  steps: [
    '`softmax(S, axis=-1)` stable; `causal_mask(T)` → boolean `(T, T)`, True where attention is **allowed** (j ≤ i).',
    '`attention(Q, K, V, mask=None)` → `(out, weights)`; scores `Q @ K.T / sqrt(d)`, disallowed entries set to `-inf` before softmax. Works for `(T, d)` and batched `(h, T, d)` inputs.',
    '`positional_encoding(T, d)` → sinusoids: even columns `sin(pos / 10000**(i/d))`, odd columns `cos` with the same frequency as the preceding even column.',
    '`layer_norm(X, eps=1e-5)` → each row standardized to mean 0 and variance 1.',
    '`multi_head_attention(X, Wq, Wk, Wv, Wo, h, mask=None)` → `(T, d)`: project, split into h heads of width d/h, attend, concatenate, multiply by Wo.',
  ],
  hints: [
    ['Scores for any batch shape', '`S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(Q.shape[-1])`; masking: `S = np.where(mask, S, -np.inf)`.'],
    ['Splitting heads', '`(T, d) → (T, h, d//h) → (h, T, d//h)`: `Q.reshape(T, h, d // h).transpose(1, 0, 2)`. Merge with the inverse transpose and reshape.'],
    ['Positional encoding', '`pos = np.arange(T)[:, None]`, `i = np.arange(0, d, 2)`, angles `pos / 10000 ** (i / d)`; fill `PE[:, 0::2] = sin`, `PE[:, 1::2] = cos`.'],
  ],
  starter: `import numpy as np

def softmax(S, axis=-1):
    raise NotImplementedError

def causal_mask(T):
    raise NotImplementedError

def attention(Q, K, V, mask=None):
    raise NotImplementedError

def positional_encoding(T, d):
    raise NotImplementedError

def layer_norm(X, eps=1e-5):
    raise NotImplementedError

def multi_head_attention(X, Wq, Wk, Wv, Wo, h, mask=None):
    raise NotImplementedError
`,
  solution: `import numpy as np

def softmax(S, axis=-1):
    E = np.exp(S - S.max(axis=axis, keepdims=True))
    return E / E.sum(axis=axis, keepdims=True)

def causal_mask(T):
    return np.tril(np.ones((T, T), dtype=bool))

def attention(Q, K, V, mask=None):
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(Q.shape[-1])
    if mask is not None:
        S = np.where(mask, S, -np.inf)
    W = softmax(S)
    return W @ V, W

def positional_encoding(T, d):
    pos = np.arange(T)[:, None]
    angles = pos / 10000 ** (np.arange(0, d, 2) / d)
    PE = np.zeros((T, d))
    PE[:, 0::2] = np.sin(angles)
    PE[:, 1::2] = np.cos(angles[:, : d // 2])
    return PE

def layer_norm(X, eps=1e-5):
    mu = X.mean(axis=-1, keepdims=True)
    var = X.var(axis=-1, keepdims=True)
    return (X - mu) / np.sqrt(var + eps)

def multi_head_attention(X, Wq, Wk, Wv, Wo, h, mask=None):
    T, d = X.shape
    split = lambda M: M.reshape(T, h, d // h).transpose(1, 0, 2)
    out, _ = attention(split(X @ Wq), split(X @ Wk), split(X @ Wv), mask)
    return out.transpose(1, 0, 2).reshape(T, d) @ Wo
`,
  solutionNote: 'The mask broadcasts across heads, so one causal mask serves every head. Heads are just a reshape: attention runs on the `(h, T, d/h)` array exactly as it would on a single head.',
  checkSummary: 'Softmax stability; attention weights that sum to one; masked weights exactly zero and the future unable to change earlier outputs; permutation equivariance without positional encodings and its loss with them; layer-norm statistics; multi-head output shape and agreement with a per-head loop; and that h = 1 reduces to single-head attention.',
  checks: `
import numpy as np
assert np.allclose(softmax(np.array([[1000.0, 1001.0]])).sum(), 1)
_rng = np.random.default_rng(0)
_T, _d = 6, 8
_X = _rng.normal(size=(_T, _d))
_out, _W = attention(_X, _X, _X)
assert _out.shape == (_T, _d) and np.allclose(_W.sum(axis=1), 1)
_cm = causal_mask(_T)
assert _cm.sum() == _T * (_T + 1) // 2 and not _cm[0, 1] and _cm[1, 0]
_oc, _Wc = attention(_X, _X, _X, _cm)
assert np.all(_Wc[~_cm] == 0), "Masked weights must be exactly zero"
_X2 = _X.copy(); _X2[4:] += 5.0
_oc2, _ = attention(_X2, _X2, _X2, _cm)
np.testing.assert_allclose(_oc2[:4], _oc[:4], err_msg="Changing future tokens must not change earlier outputs under a causal mask")
print("PASS: attention, masking and causality")
_p = _rng.permutation(_T)
np.testing.assert_allclose(attention(_X[_p], _X[_p], _X[_p])[0], _out[_p], err_msg="Without positions, attention is permutation-equivariant")
_PE = positional_encoding(_T, _d)
assert _PE.shape == (_T, _d) and np.allclose(_PE[0, 0::2], 0) and np.allclose(_PE[0, 1::2], 1)
_Y = _X + _PE; _Yp = _X[_p] + _PE
assert not np.allclose(attention(_Yp, _Yp, _Yp)[0], attention(_Y, _Y, _Y)[0][_p]), "Positional encodings must break the equivariance"
_ln = layer_norm(_X * 5 + 3)
np.testing.assert_allclose(_ln.mean(axis=1), 0, atol=1e-10); np.testing.assert_allclose(_ln.std(axis=1), 1, atol=1e-3)
print("PASS: permutation equivariance, positional encodings, layer norm")
_h = 2
_Wq, _Wk, _Wv, _Wo = [_rng.normal(size=(_d, _d)) / np.sqrt(_d) for _ in range(4)]
_mha = multi_head_attention(_X, _Wq, _Wk, _Wv, _Wo, _h, _cm)
assert _mha.shape == (_T, _d)
_heads = []
for _i in range(_h):
    _s = slice(_i * _d // _h, (_i + 1) * _d // _h)
    _heads.append(attention((_X @ _Wq)[:, _s], (_X @ _Wk)[:, _s], (_X @ _Wv)[:, _s], _cm)[0])
np.testing.assert_allclose(_mha, np.concatenate(_heads, axis=1) @ _Wo, err_msg="Multi-head output must match a per-head loop")
np.testing.assert_allclose(multi_head_attention(_X, _Wq, _Wk, _Wv, np.eye(_d), 1), attention(_X @ _Wq, _X @ _Wk, _X @ _Wv)[0])
print("PASS: multi-head attention matches the per-head computation")
`,
}
