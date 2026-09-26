// Lab 27 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The playground investigates synthetic 10×10 digits; these cells repeat the investigation on real data — the
// 1,797 handwritten 8×8 digits that ship with scikit-learn (BSD licence) — and the answer is not the same.

export const extras = {
  'l27-question': {
    formulaTex: '$$a_{dx} = \\frac1n\\sum_i \\big[\\hat y(S^{dx} x_i) = y_i\\big]$$',
    mathCode: {
      rows: [
        ['data checks', 'np.bincount(labels), np.unique(flat, axis=0)', 'Class balance and duplicates, before any model.'],
        ['baseline', 'LogisticRegression().fit(X_tr.reshape(...), y_tr)', 'A linear model on raw pixels.'],
        ['$S^{dx} x$', 'shift(X_te, dx)', 'The test images moved dx pixels right.'],
        ['$a_{dx}$', 'baseline.score(shift(X_te, dx)...)', 'Accuracy on the moved images; a₀ is the ordinary test accuracy.'],
      ],
    },
    notebook: {
      title: 'Lab 27.1 · Start with a question and a simple model',
      intro: 'Real handwritten digits: check the data, fit the simplest credible baseline, and test it where deployment might differ.',
      cells: [
        {
          title: 'Data checks and a baseline',
          prose: 'The question: will a digit reader still work when digits are written 1–2 pixels further right? **Predict** the baseline’s accuracy at 2 pixels before running.',
          code: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
digits = load_digits()                                   # 1,797 real handwritten digits, 8×8, shipped with scikit-learn
images, labels = digits.images / 16.0, digits.target     # pixel values scaled to 0..1
def shift(imgs, dx):
    """Move every image dx pixels right, filling with blank columns (no wrap-around)."""
    out = np.zeros_like(imgs)
    out[:, :, dx:] = imgs[:, :, :imgs.shape[2] - dx] if dx else imgs
    return out

print("images", images.shape, "  per class:", np.bincount(labels.astype(np.intp)))
flat = images.reshape(len(images), -1)
print("exact duplicate images:", len(flat) - len(np.unique(flat, axis=0)))
X_tr, X_te, y_tr, y_te = train_test_split(images, labels, test_size=0.3, random_state=0, stratify=labels)
baseline = LogisticRegression(max_iter=3000).fit(X_tr.reshape(len(X_tr), -1), y_tr)
for dx in (0, 1, 2):
    acc = baseline.score(shift(X_te, dx).reshape(len(X_te), -1), y_te)
    print(f"pixel baseline, test images moved {dx} px right: accuracy {acc:.3f}")`,
        },
      ],
    },
  },
  'l27-transfer': {
    formulaTex: '$$\\hat y = \\mathrm{softmax}\\big(W f(x) + b\\big)$$',
    mathCode: {
      rows: [
        ['$f(x)$', 'conv_features(imgs)', 'A fixed representation: four filters, ReLU, pooling, max over columns — 16 numbers.'],
        ['probe', 'LogisticRegression().fit(F_tr, y_tr)', 'Only W and b are trained.'],
      ],
    },
    notebook: {
      title: 'Lab 27.2 · Representations and transfer',
      intro: 'The same linear classifier on two representations, tested as-is and 2 pixels to the right.',
      cells: [
        {
          title: 'Pixels against fixed convolution features',
          prose: '**Predict** which representation wins on unmoved digits, and which on moved ones.',
          code: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
digits = load_digits()                                   # 1,797 real handwritten digits, 8×8, shipped with scikit-learn
images, labels = digits.images / 16.0, digits.target     # pixel values scaled to 0..1
def shift(imgs, dx):
    """Move every image dx pixels right, filling with blank columns (no wrap-around)."""
    out = np.zeros_like(imgs)
    out[:, :, dx:] = imgs[:, :, :imgs.shape[2] - dx] if dx else imgs
    return out

from numpy.lib.stride_tricks import sliding_window_view
KERNELS = np.array([[[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
                    [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]], [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]])
def conv_features(imgs):
    """Four fixed 3×3 filters -> ReLU -> 2×2 max-pool -> max over columns: 4 filters × 4 rows = 16 numbers."""
    windows = sliding_window_view(np.pad(imgs, ((0, 0), (1, 1), (1, 1))), (3, 3), axis=(1, 2))
    maps = np.maximum(0, np.einsum("nijab,kab->nkij", windows, KERNELS))          # (n, 4, 8, 8)
    pooled = maps.reshape(len(imgs), 4, 4, 2, 4, 2).max(axis=(3, 5))             # (n, 4, 4, 4)
    return pooled.max(axis=3).reshape(len(imgs), -1)

X_tr, X_te, y_tr, y_te = train_test_split(images, labels, test_size=0.3, random_state=0, stratify=labels)
F_tr, F_te = conv_features(X_tr), conv_features(X_te)
probe = LogisticRegression(max_iter=5000).fit(F_tr, y_tr)
pix = LogisticRegression(max_iter=3000).fit(X_tr.reshape(len(X_tr), -1), y_tr)
print(f"features: pixels {X_tr[0].size}, conv {F_tr.shape[1]}   parameters: pixels {pix.coef_.size + 10}, conv {probe.coef_.size + 10}")
for dx in (0, 2):
    print(f"moved {dx} px: pixels {pix.score(shift(X_te, dx).reshape(len(X_te), -1), y_te):.3f}   conv features {probe.score(conv_features(shift(X_te, dx)), y_te):.3f}")`,
        },
      ],
    },
  },
  'l27-ablation': {
    formulaTex: '$$\\Delta_c = \\frac1S\\sum_{s=1}^{S}\\big(a_s^\\mathrm{full} - a_s^{-c}\\big)$$',
    mathCode: {
      rows: [
        ['$a_s^\\mathrm{full}$', 'run(**full, seed=s)', 'The full pipeline’s accuracy with split and seed s.'],
        ['$a_s^{-c}$', 'run(**{**full, part: False}, seed=s)', 'The same seed with one component removed.'],
        ['$\\Delta_c$', 'gains.mean(), gains.min(), gains.max()', 'Mean paired change, with its range over seeds.'],
      ],
    },
    notebook: {
      title: 'Lab 27.3 · Ablations and seeds',
      intro: 'Remove one component at a time from “convolution features + hidden layer + shift augmentation”, three seeds each, paired.',
      cells: [
        {
          title: 'The data and features again',
          prose: 'The same setup as 27.1–27.2, so this notebook runs on its own.',
          code: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
digits = load_digits()                                   # 1,797 real handwritten digits, 8×8, shipped with scikit-learn
images, labels = digits.images / 16.0, digits.target     # pixel values scaled to 0..1
def shift(imgs, dx):
    """Move every image dx pixels right, filling with blank columns (no wrap-around)."""
    out = np.zeros_like(imgs)
    out[:, :, dx:] = imgs[:, :, :imgs.shape[2] - dx] if dx else imgs
    return out

from numpy.lib.stride_tricks import sliding_window_view
KERNELS = np.array([[[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
                    [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]], [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]])
def conv_features(imgs):
    """Four fixed 3×3 filters -> ReLU -> 2×2 max-pool -> max over columns: 4 filters × 4 rows = 16 numbers."""
    windows = sliding_window_view(np.pad(imgs, ((0, 0), (1, 1), (1, 1))), (3, 3), axis=(1, 2))
    maps = np.maximum(0, np.einsum("nijab,kab->nkij", windows, KERNELS))          # (n, 4, 8, 8)
    pooled = maps.reshape(len(imgs), 4, 4, 2, 4, 2).max(axis=(3, 5))             # (n, 4, 4, 4)
    return pooled.max(axis=3).reshape(len(imgs), -1)`,
        },
        {
          title: 'Leave one component out',
          prose: 'Half the test images are moved 2 pixels. **Predict** which component the full pipeline most depends on. (Twelve fits: about 15 seconds in the browser.)',
          code: `import warnings; warnings.filterwarnings('ignore')   # the small network's solver warns when it stops early
from sklearn.neural_network import MLPClassifier
def run(conv, hidden, augment, seed):
    X_tr, X_te, y_tr, y_te = train_test_split(images, labels, test_size=0.3, random_state=seed, stratify=labels)
    if augment:                                                   # add copies moved 1 and 2 pixels right
        X_tr, y_tr = np.concatenate([X_tr, shift(X_tr, 1), shift(X_tr, 2)]), np.tile(y_tr, 3)
    feat = conv_features if conv else (lambda im: im.reshape(len(im), -1))
    model = (MLPClassifier((32,), solver="lbfgs", max_iter=300, random_state=seed) if hidden else LogisticRegression(max_iter=5000)).fit(feat(X_tr), y_tr)
    test = np.concatenate([X_te, shift(X_te, 2)]); y2 = np.tile(y_te, 2)      # half the test set moved 2 px
    return model.score(feat(test), y2)
full = dict(conv=True, hidden=True, augment=True)
seeds = [0, 1, 2]
base = [run(**full, seed=s) for s in seeds]
print(f"full pipeline: {np.mean(base):.3f} ± {np.std(base, ddof=1):.3f}")
for part in full:
    ablated = [run(**{**full, part: False}, seed=s) for s in seeds]
    gains = np.array(base) - np.array(ablated)
    print(f"without {part:7s}: {np.mean(ablated):.3f}   paired loss {gains.mean():+.3f} (range {gains.min():+.3f} to {gains.max():+.3f})")`,
        },
      ],
    },
  },
  'l27-compute': {
    formulaTex: '$$m_\\mathrm{dense} = n_\\mathrm{in}\\, n_\\mathrm{out}$$ $$m_\\mathrm{conv} \\approx k^2 C_\\mathrm{in} C_\\mathrm{out} H_\\mathrm{out} W_\\mathrm{out}$$',
    mathCode: {
      rows: [
        ['parameters', 'sum(a * b + b for a, b in ...)', 'Trained weights and biases.'],
        ['$m$', '4 * 9 * 64 + ...', 'Multiply-adds per image: the filters run at all 64 positions.'],
      ],
    },
    notebook: {
      title: 'Lab 27.4 · Compute budgets and cost',
      intro: 'Parameters and multiply-adds for the four pipelines.',
      cells: [
        {
          title: 'Two budgets',
          prose: '**Predict** which pipeline has the fewest parameters and which does the most work per image.',
          code: `def cost(conv, hidden):
    """Parameters and multiply-adds per image for one pipeline (the fixed filters are not trained)."""
    n_feat = 16 if conv else 64
    macs = (4 * 9 * 64 if conv else 0)                    # 4 filters × 9 weights at each of 64 positions
    layers = [n_feat, 32, 10] if hidden else [n_feat, 10]
    params = sum(a * b + b for a, b in zip(layers[:-1], layers[1:]))
    macs += sum(a * b for a, b in zip(layers[:-1], layers[1:]))
    return params, macs
for conv in (False, True):
    for hidden in (False, True):
        p, m = cost(conv, hidden)
        print(f"{'conv' if conv else 'pixels':6s} {'+ hidden 32' if hidden else 'linear     '}: {p:5d} trained parameters, {m:5d} multiply-adds per image")`,
        },
      ],
    },
  },
  'l27-errors': {
    formulaTex: '$$r_k = \\frac{C_{kk}}{\\sum_j C_{kj}}$$',
    mathCode: {
      rows: [
        ['$C$', 'confusion_matrix(y_te, pred)', 'Rows: true digit; columns: predicted digit.'],
        ['$r_k$', 'cm.diagonal() / cm.sum(axis=1)', 'Recall: the share of digit k read correctly.'],
        ['largest off-diagonal', 'np.unravel_index(off.argmax(), off.shape)', 'The most common confusion: a hypothesis for the next experiment.'],
      ],
    },
    notebook: {
      title: 'Lab 27.5 · Qualitative error analysis and reporting',
      intro: 'The best pipeline from 27.3, examined digit by digit on the moved test images.',
      cells: [
        {
          title: 'Which digits fail',
          prose: '**Predict** the lowest recall.',
          code: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
digits = load_digits()                                   # 1,797 real handwritten digits, 8×8, shipped with scikit-learn
images, labels = digits.images / 16.0, digits.target     # pixel values scaled to 0..1
def shift(imgs, dx):
    """Move every image dx pixels right, filling with blank columns (no wrap-around)."""
    out = np.zeros_like(imgs)
    out[:, :, dx:] = imgs[:, :, :imgs.shape[2] - dx] if dx else imgs
    return out

from sklearn.neural_network import MLPClassifier
from sklearn.metrics import confusion_matrix
import warnings; warnings.filterwarnings("ignore")
X_tr, X_te, y_tr, y_te = train_test_split(images, labels, test_size=0.3, random_state=0, stratify=labels)
X_aug, y_aug = np.concatenate([X_tr, shift(X_tr, 1), shift(X_tr, 2)]), np.tile(y_tr, 3)
best = MLPClassifier((32,), solver="lbfgs", max_iter=300, random_state=0).fit(X_aug.reshape(len(X_aug), -1), y_aug)
test = shift(X_te, 2)                                             # the hard half: moved 2 pixels
pred = best.predict(test.reshape(len(test), -1))
cm = confusion_matrix(y_te, pred)
recall = cm.diagonal() / cm.sum(axis=1)
print("recall per digit at 2 px:", np.round(recall, 2))
off = cm - np.diag(cm.diagonal())
i, j = np.unravel_index(off.argmax(), off.shape)
print(f"most common confusion: true {i} predicted as {j} ({off[i, j]} of {cm[i].sum()} test images)")`,
        },
      ],
    },
  },
}
