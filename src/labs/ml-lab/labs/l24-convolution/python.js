export default {
  filename: 'convolution.py', packages: ['numpy'],
  title: 'Convolution and pooling from scratch.',
  intro: 'Implement 2D cross-correlation with stride and zero padding (the operation deep-learning libraries call convolution), its output-size formula, 2×2 max pooling, and the receptive field of a stack of layers. Then verify translation equivariance numerically.',
  steps: [
    '`output_size(n, k, stride, pad)` → `(n + 2*pad - k) // stride + 1`.',
    '`conv2d(x, k, stride=1, pad=0)` → 2D array; pad with zeros (`np.pad`), then slide and sum `patch * k`.',
    '`max_pool(x, s=2)` → max over non-overlapping s×s blocks (drop leftover rows/columns).',
    '`receptive_field(layers, k, stride)` → side length of the input region seen by one output after `layers` identical layers.',
  ],
  hints: [
    ['Padding', '`xp = np.pad(x, pad)` adds `pad` rings of zeros.'],
    ['Sliding', 'For each output (i, j): `patch = xp[i*stride : i*stride + kh, j*stride : j*stride + kw]`; `out[i, j] = np.sum(patch * k)`.'],
    ['Pooling with reshape', 'Crop to multiples of s, then `x.reshape(H//s, s, W//s, s).max(axis=(1, 3))`.'],
    ['Receptive field', 'Start `rf, jump = 1, 1`; each layer: `rf += (k - 1) * jump`; `jump *= stride`.'],
  ],
  starter: `import numpy as np

def output_size(n, k, stride=1, pad=0):
    raise NotImplementedError

def conv2d(x, k, stride=1, pad=0):
    raise NotImplementedError

def max_pool(x, s=2):
    raise NotImplementedError

def receptive_field(layers, k, stride=1):
    raise NotImplementedError
`,
  solution: `import numpy as np

def output_size(n, k, stride=1, pad=0):
    return (n + 2 * pad - k) // stride + 1

def conv2d(x, k, stride=1, pad=0):
    xp = np.pad(x, pad)
    kh, kw = k.shape
    oh = output_size(x.shape[0], kh, stride, pad)
    ow = output_size(x.shape[1], kw, stride, pad)
    out = np.zeros((oh, ow))
    for i in range(oh):
        for j in range(ow):
            patch = xp[i * stride:i * stride + kh, j * stride:j * stride + kw]
            out[i, j] = np.sum(patch * k)
    return out

def max_pool(x, s=2):
    H, W = (x.shape[0] // s) * s, (x.shape[1] // s) * s
    return x[:H, :W].reshape(H // s, s, W // s, s).max(axis=(1, 3))

def receptive_field(layers, k, stride=1):
    rf, jump = 1, 1
    for _ in range(layers):
        rf += (k - 1) * jump
        jump *= stride
    return rf
`,
  solutionNote: 'The kernel is not flipped — this is cross-correlation, which is what PyTorch and TensorFlow compute under the name "convolution". A learned kernel makes the distinction irrelevant in practice.',
  checkSummary: 'Output sizes for several strides and paddings; a hand-computed convolution; agreement with an independent reference built from shifted slices; a Sobel filter responding to a vertical edge; translation equivariance; 2×2 max pooling; and receptive-field sizes with and without stride.',
  checks: `
import numpy as np
assert output_size(12, 3, 1, 1) == 12 and output_size(12, 3, 2, 1) == 6 and output_size(12, 3, 1, 0) == 10 and output_size(7, 3, 2, 0) == 3
_x = np.arange(16, dtype=float).reshape(4, 4); _k = np.array([[1.0, 0], [0, -1]])
np.testing.assert_allclose(conv2d(_x, _k), -5 * np.ones((3, 3)), err_msg="x[i,j] - x[i+1,j+1] = -5 everywhere")
_rng = np.random.default_rng(0)
_X = _rng.normal(size=(9, 11)); _K = _rng.normal(size=(3, 3))
for _s, _p in [(1, 0), (1, 1), (2, 1), (3, 2)]:
    _xp = np.pad(_X, _p); _oh, _ow = output_size(9, 3, _s, _p), output_size(11, 3, _s, _p)
    _ref = sum(_K[a, b] * _xp[a:a + _s * (_oh - 1) + 1:_s, b:b + _s * (_ow - 1) + 1:_s] for a in range(3) for b in range(3))
    np.testing.assert_allclose(conv2d(_X, _K, _s, _p), _ref, err_msg=f"stride {_s}, pad {_p}")
print("PASS: output size and convolution with stride and padding")
_edge = np.zeros((6, 6)); _edge[:, 3:] = 1
_sob = np.array([[-1.0, 0, 1], [-2, 0, 2], [-1, 0, 1]])
_r = conv2d(_edge, _sob)
assert _r.max() == 4 and np.all(_r[:, 0] == 0), "Sobel x should fire only at the vertical edge"
_img = np.zeros((10, 10)); _img[2:5, 2:4] = 1
_shifted = np.roll(_img, 3, axis=1)
np.testing.assert_allclose(conv2d(_shifted, _K)[:, 3:], conv2d(_img, _K)[:, :-3], err_msg="Convolution must be translation-equivariant")
print("PASS: edge detection and translation equivariance")
np.testing.assert_array_equal(max_pool(np.arange(20).reshape(4, 5)), [[6, 8], [16, 18]])
assert receptive_field(1, 3) == 3 and receptive_field(4, 3) == 9 and receptive_field(3, 3, 2) == 15
print("PASS: max pooling and receptive fields")
`,
}
