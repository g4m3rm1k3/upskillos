// Lab 24 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The digits are the playground's 5×7 glyphs on a 10×10 grid; the models here are scikit-learn's logistic regression,
// so accuracies differ a little from the playground's own network (both put the shifted pixel model near chance).

export const extras = {
  'l24-why': {
    formulaTex: '$$H W C \\cdot u + u$$ $$k^2 C_\\mathrm{in} C_\\mathrm{out} + C_\\mathrm{out}$$',
    mathCode: {
      rows: [
        ['$H W C \\cdot u + u$', 'h * w * c * units + units', 'A dense first layer: every pixel to every unit.'],
        ['$k^2 C_\\mathrm{in} C_\\mathrm{out} + C_\\mathrm{out}$', 'k * k * c_in * c_out + c_out', 'A convolution: independent of the image size.'],
        ['shift', 'digit_set(300, [4, 5], seed=4)', 'The same digits placed further right.'],
      ],
    },
    notebook: {
      title: 'Lab 24.1 · Images break dense layers',
      intro: 'How many weights a dense layer needs, and what happens when the digits move.',
      cells: [
        {
          title: 'Counting weights',
          prose: '**Predict** the dense layer’s size for a 224 × 224 colour image.',
          code: `for h, w, c, units in [(224, 224, 3, 1000), (32, 32, 3, 100)]:
    dense = h * w * c * units + units
    print(f"{h}x{w}x{c} image -> dense layer of {units} units: {dense:,} parameters")
k, c_in, c_out = 3, 3, 64
print(f"3x3 convolution, {c_in} -> {c_out} channels: {k * k * c_in * c_out + c_out:,} parameters, for any image size")`,
        },
        {
          title: 'Move the digits',
          prose: 'Train on digits near the left edge, test on the same digits moved right. **Predict** the second accuracy.',
          code: `import numpy as np
# The playground's 5×7 digit glyphs, placed on a 10×10 grid at a chosen horizontal shift.
FONT = ["01110100011001110101110011000101110", "00100011000010000100001000010001110", "01110100010000100010001000100011111",
        "11111000100010000010000011000101110", "00010001100101010010111110001000010", "11111100001111000001000011000101110",
        "00110010001000011110100011000101110", "11111000010001000100010000100001000", "01110100011000101110100011000101110",
        "01110100011000101111000010001001100"]
def digit(d, dx, rng, noise=0.1):
    img = np.zeros((10, 10)); dy = 1 + rng.integers(0, 2)
    glyph = np.array([int(c) for c in FONT[d]], float).reshape(7, 5)
    img[dy:dy + 7, dx:dx + 5] = glyph * (0.8 + 0.2 * rng.random((7, 5)))
    return np.clip(img + noise * rng.normal(size=(10, 10)), 0, 1)
def digit_set(n, shifts, seed):
    rng = np.random.default_rng(seed)
    labels = np.arange(n) % 10
    return np.array([digit(d, rng.choice(shifts), rng) for d in labels]), labels

from sklearn.linear_model import LogisticRegression
train_x, train_y = digit_set(300, [0, 1], seed=3)          # digits near the left edge
test_x, test_y = digit_set(300, [4, 5], seed=4)            # the same digits, moved right
model = LogisticRegression(max_iter=2000).fit(train_x.reshape(300, -1), train_y)
print(f"pixel model: accuracy at the training positions {model.score(train_x.reshape(300, -1), train_y):.2f}, "
      f"after moving right {model.score(test_x.reshape(300, -1), test_y):.2f}")`,
        },
      ],
    },
  },
  'l24-conv': {
    formulaTex: '$$y_{ij} = \\sum_{a,b} K_{ab}\\, x_{is-p+a,\\ js-p+b}$$ $$n_\\mathrm{out} = \\Big\\lfloor \\frac{n + 2p - k}{s} \\Big\\rfloor + 1$$',
    mathCode: {
      rows: [
        ['$K$', 'sobel_x = np.array([[-1, 0, 1], ...])', 'The kernel: k × k weights.'],
        ['$\\sum_{a,b} K_{ab} x_{\\ldots}$', 'np.sum(patch * K)', 'Multiply matching entries of the patch and the kernel, add them up.'],
        ['$s$, $p$', 'stride, np.pad(img, pad)', 'Step size, and rings of zeros around the input.'],
        ['$n_\\mathrm{out}$', '(n + 2 * p - k) // s + 1', 'The output size.'],
      ],
    },
    notebook: {
      title: 'Lab 24.2 · The convolution operation',
      intro: 'A convolution written as two loops, and the output-size formula checked against it.',
      cells: [
        {
          title: 'Sobel on a vertical edge',
          prose: '**Predict** where the output is large.',
          code: `import numpy as np
def conv2d(img, K, stride=1, pad=0):
    """Slide K over img: multiply entries, add them up (cross-correlation, as libraries do)."""
    img = np.pad(img, pad)
    k = K.shape[0]
    n_out = (img.shape[0] - k) // stride + 1
    out = np.zeros((n_out, n_out))
    for i in range(n_out):
        for j in range(n_out):
            patch = img[i * stride:i * stride + k, j * stride:j * stride + k]
            out[i, j] = np.sum(patch * K)
    return out

img = np.zeros((6, 6)); img[:, 3:] = 1                   # dark left half, bright right half
sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
print(img)
print("Sobel x, no padding:")
print(conv2d(img, sobel_x))`,
        },
        {
          title: 'Output sizes',
          prose: '**Predict** the size for n = 28, k = 5, s = 2, p = 2 before running.',
          code: `import numpy as np
def out_size(n, k, s, p):
    return (n + 2 * p - k) // s + 1
for n, k, s, p in [(12, 3, 1, 1), (12, 3, 2, 1), (12, 3, 1, 0), (28, 5, 2, 2), (7, 3, 3, 0)]:
    actual = conv2d(np.zeros((n, n)), np.ones((k, k)), s, p).shape[0]      # the loop from the cell above
    print(f"n={n:2d} k={k} s={s} p={p}: formula {out_size(n, k, s, p):2d}, loop {actual:2d}")`,
        },
      ],
    },
  },
  'l24-sharing': {
    formulaTex: '$$K \\ast (S x) = S (K \\ast x)$$ $$y_{ij} = \\max_{a, b \\in \\{0,1\\}} x_{2i+a,\\,2j+b}$$',
    mathCode: {
      rows: [
        ['$S x$', 'np.roll(x, 1, axis=1)', 'S shifts the image one pixel.'],
        ['$K \\ast x$', 'conv2d(x, K)', 'Convolution with the kernel K.'],
        ['$K \\ast (S x) = S (K \\ast x)$', 'np.allclose(a[:, 1:], b[:, 1:])', 'Equivariance: convolving then shifting equals shifting then convolving.'],
        ['max-pool 2×2', 'm.reshape(2, 2, 2, 2).max(axis=(1, 3))', 'The largest value in each 2 × 2 block.'],
        ['invariant features', 'pooled.max(axis=1)', 'Keep which row a feature was in, forget which column.'],
      ],
    },
    notebook: {
      title: 'Lab 24.3 · Weight sharing, equivariance and pooling',
      intro: 'Equivariance checked numerically, max-pooling in one line, and the digits again with convolutional features.',
      cells: [
        {
          title: 'Shift, then convolve',
          prose: '**Predict** whether the two orders agree.',
          code: `import numpy as np
def conv2d(img, K, stride=1, pad=0):
    """Slide K over img: multiply entries, add them up (cross-correlation, as libraries do)."""
    img = np.pad(img, pad)
    k = K.shape[0]
    n_out = (img.shape[0] - k) // stride + 1
    out = np.zeros((n_out, n_out))
    for i in range(n_out):
        for j in range(n_out):
            patch = img[i * stride:i * stride + k, j * stride:j * stride + k]
            out[i, j] = np.sum(patch * K)
    return out

import numpy as np
rng = np.random.default_rng(0)
x = rng.random((8, 8))
shifted = np.roll(x, 1, axis=1)                     # the image moved one pixel right
K = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
a = conv2d(shifted, K)                              # convolve the shifted image
b = np.roll(conv2d(x, K), 1, axis=1)                # shift the convolved image
print("equal away from the wrapped column:", np.allclose(a[:, 1:], b[:, 1:]))`,
        },
        {
          title: 'Max-pooling',
          prose: '**Predict** the pooled 2 × 2 result.',
          code: `import numpy as np
m = np.array([[1, 3, 2, 0],
              [4, 2, 1, 1],
              [0, 1, 5, 6],
              [2, 2, 7, 1]])
pooled = m.reshape(2, 2, 2, 2).max(axis=(1, 3))     # 2×2 blocks, largest value in each
print(pooled)`,
        },
        {
          title: 'The digits, with convolutional features',
          prose: 'Four fixed filters, ReLU, pooling and a max over columns. **Predict** the accuracy after moving right.',
          code: `import numpy as np
# The playground's 5×7 digit glyphs, placed on a 10×10 grid at a chosen horizontal shift.
FONT = ["01110100011001110101110011000101110", "00100011000010000100001000010001110", "01110100010000100010001000100011111",
        "11111000100010000010000011000101110", "00010001100101010010111110001000010", "11111100001111000001000011000101110",
        "00110010001000011110100011000101110", "11111000010001000100010000100001000", "01110100011000101110100011000101110",
        "01110100011000101111000010001001100"]
def digit(d, dx, rng, noise=0.1):
    img = np.zeros((10, 10)); dy = 1 + rng.integers(0, 2)
    glyph = np.array([int(c) for c in FONT[d]], float).reshape(7, 5)
    img[dy:dy + 7, dx:dx + 5] = glyph * (0.8 + 0.2 * rng.random((7, 5)))
    return np.clip(img + noise * rng.normal(size=(10, 10)), 0, 1)
def digit_set(n, shifts, seed):
    rng = np.random.default_rng(seed)
    labels = np.arange(n) % 10
    return np.array([digit(d, rng.choice(shifts), rng) for d in labels]), labels

train_x, train_y = digit_set(300, [0, 1], seed=3)          # near the left edge
test_x, test_y = digit_set(300, [4, 5], seed=4)            # moved right

from sklearn.linear_model import LogisticRegression
import numpy as np
K = [np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]), np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]),
     np.array([[2, -1, -1], [-1, 2, -1], [-1, -1, 2]]), np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])]
def conv_features(img):
    """Four fixed filters -> ReLU -> 2×2 max-pool -> the largest value in each pooled row."""
    feats = []
    for k in K:
        fmap = np.maximum(0, conv2d(img, k, 1, 1))
        pooled = fmap.reshape(5, 2, 5, 2).max(axis=(1, 3))
        feats.extend(pooled.max(axis=1))             # keep which row, forget which column
    return feats
F_train = np.array([conv_features(im) for im in train_x]); F_test = np.array([conv_features(im) for im in test_x])
model = LogisticRegression(max_iter=5000).fit(F_train, train_y)
print(f"convolution features ({F_train.shape[1]} numbers): training positions {model.score(F_train, train_y):.2f}, after moving right {model.score(F_test, test_y):.2f}")`,
        },
      ],
    },
  },
  'l24-depth': {
    formulaTex: '$$r_L = 1 + L(k-1) \\qquad (s = 1)$$',
    mathCode: {
      rows: [
        ['$r_L$', 'rf_size(L)', 'How many positions one input can reach after L layers.'],
        ['$1 + L(k-1)$', '1 + L * 2', 'The formula for stride 1, k = 3.'],
      ],
    },
    notebook: {
      title: 'Lab 24.4 · Receptive fields and deep CNNs',
      intro: 'Receptive fields found by poking one input and counting what changes.',
      cells: [
        {
          title: 'Poke one pixel',
          prose: '**Predict** the count for 4 layers.',
          code: `import numpy as np
def rf_size(layers, k=3, stride=1):
    """Poke one input pixel and count which outputs of the last layer change (1-D, for clarity)."""
    x = np.zeros(101); x[50] = 1.0
    for _ in range(layers):
        x = np.convolve(x, np.ones(k), mode="same")[::stride] if stride > 1 else np.convolve(x, np.ones(k), mode="same")
    return int(np.count_nonzero(x))

for L in [1, 2, 4]:
    print(f"{L} layer(s) of k = 3, stride 1: one input reaches {rf_size(L)} outputs; formula 1 + L(k - 1) = {1 + L * 2}")`,
        },
      ],
    },
  },
  'l24-practice': {
    formulaTex: '$$\\mathcal D_\\mathrm{aug} = \\{(T(x), y)\\ :\\ (x, y) \\in \\mathcal D,\\ T \\in \\mathcal T\\}$$',
    mathCode: {
      rows: [
        ['$T \\in \\mathcal T$', 'digit_set(300, [0, 1, 2, 3, 4, 5], seed=3)', 'Label-preserving transformations: here, shifts.'],
        ['group split', 'GroupShuffleSplit(...).split(..., groups=patients)', 'Every scan of a patient lands on the same side.'],
      ],
    },
    notebook: {
      title: 'Lab 24.5 · Augmentation, transfer learning and honest evaluation',
      intro: 'Shift augmentation for the pixel model, and a split by patient.',
      cells: [
        {
          title: 'Augmentation',
          prose: 'Train the pixel model with digits at every shift. **Predict** its accuracy on the moved digits.',
          code: `import numpy as np
# The playground's 5×7 digit glyphs, placed on a 10×10 grid at a chosen horizontal shift.
FONT = ["01110100011001110101110011000101110", "00100011000010000100001000010001110", "01110100010000100010001000100011111",
        "11111000100010000010000011000101110", "00010001100101010010111110001000010", "11111100001111000001000011000101110",
        "00110010001000011110100011000101110", "11111000010001000100010000100001000", "01110100011000101110100011000101110",
        "01110100011000101111000010001001100"]
def digit(d, dx, rng, noise=0.1):
    img = np.zeros((10, 10)); dy = 1 + rng.integers(0, 2)
    glyph = np.array([int(c) for c in FONT[d]], float).reshape(7, 5)
    img[dy:dy + 7, dx:dx + 5] = glyph * (0.8 + 0.2 * rng.random((7, 5)))
    return np.clip(img + noise * rng.normal(size=(10, 10)), 0, 1)
def digit_set(n, shifts, seed):
    rng = np.random.default_rng(seed)
    labels = np.arange(n) % 10
    return np.array([digit(d, rng.choice(shifts), rng) for d in labels]), labels

test_x, test_y = digit_set(300, [4, 5], seed=4)            # digits moved right, as in 24.1

from sklearn.linear_model import LogisticRegression
aug_x, aug_y = digit_set(300, [0, 1, 2, 3, 4, 5], seed=3)       # training digits at every shift
model = LogisticRegression(max_iter=2000).fit(aug_x.reshape(300, -1), aug_y)
print(f"pixel model trained with shifts: after moving right {model.score(test_x.reshape(300, -1), test_y):.2f}")`,
        },
        {
          title: 'Split by source',
          prose: '**Predict** how many patients appear on both sides.',
          code: `import numpy as np
from sklearn.model_selection import GroupShuffleSplit
patients = np.repeat(np.arange(100), 20)                 # 100 patients, 20 scans each
split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=0)
train_idx, test_idx = next(split.split(np.zeros(len(patients)), groups=patients))
print("test scans:", len(test_idx), "  test patients:", len(np.unique(patients[test_idx])))
print("patients on both sides:", len(set(patients[train_idx]) & set(patients[test_idx])))`,
        },
      ],
    },
  },
}
