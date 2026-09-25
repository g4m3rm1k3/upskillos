// Lab 15 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Distances and margins by hand, the hard margin through scikit-learn's exact solver, the soft
// margin by subgradient descent (checked against the exact optimum), and kernels computed two ways.

const BLOBS = `import numpy as np
rng = np.random.default_rng(0)
n = 200
y = np.where(rng.random(n) < 0.5, 1, -1)                      # labels are −1 and +1 for SVMs
X = rng.normal(size=(n, 2)) + np.where(y[:, None] == 1, [1.0, 0.8], [-1.0, -0.8])`

export const extras = {
  'l15-margin': {
    formulaTex: '$$f(x) = w \\cdot x + b$$ $$\\operatorname{dist}(x) = \\frac{|w \\cdot x + b|}{\\lVert w \\rVert}$$ $$\\text{margin} = \\min_i \\operatorname{dist}(x_i)$$',
    mathCode: {
      rows: [
        ['$w \\cdot x + b$', 'X @ w + b', 'The score of every point at once.'],
        ['$\\lVert w \\rVert$', 'np.linalg.norm(w)', 'The length of the weight vector.'],
        ['$\\frac{|w \\cdot x + b|}{\\lVert w \\rVert}$', 'np.abs(X @ w + b) / np.linalg.norm(w)', 'Perpendicular distance of each point from the line.'],
        ['$\\min_i$', 'dist.min()', 'The margin: the closest training point decides it.'],
      ],
    },
    notebook: {
      title: 'Lab 15.1 · Distance to a boundary',
      intro: 'Compute the lesson’s point-to-line distance, then the margins of two lines that both separate the same data.',
      cells: [{
        title: 'Distance from a point to the line',
        prose: 'w = (3, 4), b = −5, x = (3, 4). **Predict** the distance.',
        code: `import numpy as np
w, b, x = np.array([3.0, 4.0]), -5.0, np.array([3.0, 4.0])
score = w @ x + b
print("score w·x + b =", score, "  ‖w‖ =", np.linalg.norm(w), "  distance =", abs(score) / np.linalg.norm(w))
print("scale w and b by 10: distance =", abs(10 * w @ x + 10 * b) / np.linalg.norm(10 * w), "(the same line)")`,
      }, {
        title: 'Two separating lines, two margins',
        prose: 'Both lines put every training point on its correct side. **Predict** which has the larger margin.',
        code: `X = np.array([[1, 3], [2, 3.5], [1.5, 4.5], [4, 1], [5, 1.5], [4.5, 0.2]])
y = np.array([1, 1, 1, -1, -1, -1])
for name, (w, b) in {"steep line": (np.array([-1.0, 0.2]), 2.0), "middle line": (np.array([-1.0, 1.0]), 0.0)}.items():
    s = X @ w + b
    assert np.all(np.sign(s) == y), "this line misclassifies a point"
    dist = np.abs(s) / np.linalg.norm(w)
    print(f"{name}: distances {np.round(dist, 2)}   margin {dist.min():.3f}   closest point {X[dist.argmin()]}")`,
        tryThis: 'Try w = (−1, 0.6), b = 0.8. Does it separate the data, and is its margin larger than the middle line’s?',
      }],
    },
  },
  'l15-hardmargin': {
    formulaTex: '$$\\min_{w, b}\\ \\tfrac12\\lVert w\\rVert^2 \\quad \\text{s.t.} \\quad y_i(w \\cdot x_i + b) \\ge 1 \\ \\ \\forall i$$ $$\\text{street width} = \\frac{2}{\\lVert w\\rVert}$$',
    mathCode: {
      rows: [
        ['$y_i \\in \\{-1, +1\\}$', 'y = np.where(label == 1, 1, -1)', 'SVM labels are ±1, so one inequality covers both classes.'],
        ['$y_i(w \\cdot x_i + b)$', 'y * (X @ w + b)', 'The functional margin: at least 1 for every point, exactly 1 on the street edges.'],
        ['support vectors', 'svc.support_', 'The points with functional margin exactly 1.'],
        ['$2/\\lVert w\\rVert$', '2 / np.linalg.norm(w)', 'The width of the street.'],
      ],
    },
    notebook: {
      title: 'Lab 15.2 · The hard-margin SVM',
      intro: 'Solve the hard-margin problem with scikit-learn’s exact solver, check every constraint, find the support vectors, and show that deleting a non-support point changes nothing.',
      cells: [{
        title: 'Solve it and check the constraints',
        prose: 'A very large C makes scikit-learn’s soft-margin solver behave as the hard margin. **Predict** the smallest value of yᵢ(w·xᵢ + b).',
        code: `import numpy as np
from sklearn.svm import SVC
rng = np.random.default_rng(1)
y = np.repeat([1, -1], 20)
X = rng.normal(size=(40, 2)) * 0.6 + np.where(y[:, None] == 1, [2.0, 2.0], [-2.0, -2.0])   # clearly separable
svc = SVC(kernel="linear", C=1e6).fit(X, y)
w, b = svc.coef_[0], svc.intercept_[0]
fm = y * (X @ w + b)                                   # functional margins
print("w =", np.round(w, 3), " b =", round(b, 3), " ‖w‖ =", round(np.linalg.norm(w), 3))
print("smallest y(w·x + b):", round(fm.min(), 4), "  street width 2/‖w‖ =", round(2 / np.linalg.norm(w), 3))
print("support vectors (rows):", svc.support_, " their margins:", np.round(fm[svc.support_], 4))`,
      }, {
        title: 'Only the support vectors matter',
        prose: 'Delete a point that is not a support vector and solve again. **Predict** how much w changes.',
        code: `far = np.argmax(fm)                                    # the point farthest from the street
keep = np.arange(len(y)) != far
w2 = SVC(kernel="linear", C=1e6).fit(X[keep], y[keep]).coef_[0]
print("removed row", far, "with margin", round(fm[far], 2), "→ change in w:", np.round(w2 - w, 6))
sv = svc.support_[0]
keep = np.arange(len(y)) != sv
w3 = SVC(kernel="linear", C=1e6).fit(X[keep], y[keep]).coef_[0]
print("removed support vector", sv, "→ change in w:", np.round(w3 - w, 3))`,
      }],
    },
  },
  'l15-hinge': {
    formulaTex: '$$\\ell(m) = \\max(0, 1 - m), \\quad m = y\\,f(x)$$ $$J(w, b) = \\frac\\lambda2\\lVert w\\rVert^2 + \\frac1n\\sum_i \\ell(m_i)$$ $$\\partial_w J = \\lambda w - \\frac1n\\sum_{i : m_i < 1} y_i x_i$$ $$C = \\frac{1}{\\lambda n}$$',
    mathCode: {
      rows: [
        ['$m_i = y_i f(x_i)$', 'm = y * (X @ w + b)', 'Each point’s margin.'],
        ['$\\max(0, 1 - m)$', 'np.maximum(0, 1 - m)', 'The hinge loss: zero for points safely outside the street.'],
        ['$\\{i : m_i < 1\\}$', 'active = m < 1', 'The points that contribute to the subgradient.'],
        ['$\\lambda w - \\frac1n\\sum_{m_i < 1} y_i x_i$', 'lam * w - (y[active, None] * X[active]).sum(0) / n', 'The subgradient with respect to w.'],
        ['$\\eta_t = \\frac{1}{\\lambda t}$', 'eta = 1 / (lam * t)', 'A decreasing step size (the Pegasos schedule).'],
        ['$C = 1/(\\lambda n)$', 'SVC(C=1 / (lam * n))', 'The same problem in scikit-learn’s parameterization.'],
      ],
    },
    notebook: {
      title: 'Lab 15.3 · Hinge loss and the soft margin',
      intro: 'Compute hinge losses, train a soft-margin SVM by subgradient descent, check it reaches scikit-learn’s exact optimum, and see what λ does to the street.',
      cells: [{
        title: 'Hinge loss for a range of margins',
        prose: '**Predict** the loss for m = 0.4 and for m = −0.5.',
        code: `import numpy as np
for m in [2.0, 1.0, 0.4, 0.0, -0.5]:
    print(f"margin {m:+.1f}: hinge {max(0.0, 1 - m):.2f}   ({'safe' if m >= 1 else 'inside the street' if m > 0 else 'on the boundary' if m == 0 else 'on the wrong side'})")`,
      }, {
        title: 'What λ does',
        prose: 'Overlapping classes, solved exactly by scikit-learn for four values of λ. **Predict** how the street width and the number of margin violations change as λ grows.',
        code: `${BLOBS}
from sklearn.svm import SVC
for lam_ in [0.001, 0.01, 0.1, 1.0]:
    s = SVC(kernel="linear", C=1 / (lam_ * n)).fit(X, y)
    m = y * s.decision_function(X)
    print(f"λ = {lam_:5}: width {2 / np.linalg.norm(s.coef_[0]):.2f}   inside the street or wrong {np.sum(m < 1):3d}   misclassified {np.sum(m < 0):2d}   support vectors {len(s.support_)}")`,
      }, {
        title: 'Subgradient descent, checked against the exact solver',
        prose: 'The same data, λ = 0.01, trained by subgradient descent. **Predict** whether 1,000 steps reach the exact minimum of J.',
        code: `lam = 0.01
def J(w, b):
    return lam / 2 * w @ w + np.mean(np.maximum(0, 1 - y * (X @ w + b)))

w, b = np.zeros(2), 0.0
for t in range(1, 1001):
    m = y * (X @ w + b)
    active = m < 1                                           # points inside the street or misclassified
    grad_w = lam * w - (y[active, None] * X[active]).sum(axis=0) / n
    grad_b = -y[active].sum() / n
    eta = 1 / (lam * t)
    w, b = w - eta * grad_w, b - eta * grad_b
    if t in (1, 10, 100, 1000):
        print(f"step {t:4d}: J = {J(w, b):.5f}")

from sklearn.svm import SVC
svc = SVC(kernel="linear", C=1 / (lam * n)).fit(X, y)
print(f"exact solver: J = {J(svc.coef_[0], svc.intercept_[0]):.5f}")
print("ours w, b:", np.round(w, 3), round(b, 3), "   exact:", np.round(svc.coef_[0], 3), round(svc.intercept_[0], 3))`,
        tryThis: 'Replace the step size with a constant eta = 0.1. Does J still settle?',
      }],
    },
  },
  'l15-kernel': {
    formulaTex: '$$K(x, x\') = \\varphi(x) \\cdot \\varphi(x\')$$ $$\\varphi(x) = (x_1^2,\\ x_2^2,\\ \\sqrt2\\,x_1x_2)$$ $$(x \\cdot x\')^2 = \\varphi(x)\\cdot\\varphi(x\')$$ $$K_{\\text{RBF}}(x, x\') = e^{-\\gamma\\lVert x - x\'\\rVert^2}$$',
    mathCode: {
      rows: [
        ['$\\varphi(x)$', 'np.array([x1**2, x2**2, np.sqrt(2) * x1 * x2])', 'The explicit degree-2 feature map.'],
        ['$(x \\cdot x\')^2$', '(x @ xp) ** 2', 'The same dot product, computed in the original two dimensions.'],
        ['$e^{-\\gamma\\lVert x - x\'\\rVert^2}$', 'np.exp(-gamma * ((x - xp) ** 2).sum())', 'RBF similarity: 1 for identical points, near 0 far apart.'],
        ['kernel matrix', 'K = rbf_kernel(X, X, gamma=g)', 'n × n similarities: the cost that limits kernel SVMs to moderate n.'],
      ],
    },
    notebook: {
      title: 'Lab 15.4 · Kernels',
      intro: 'Separate a ring by adding one feature, verify the kernel trick numerically, and see γ move an RBF SVM from smooth to wiggly.',
      cells: [{
        title: 'Lift the ring',
        prose: 'One class inside a ring of the other. **Predict** a linear SVM’s accuracy with the two raw features, and with x₁² + x₂² added.',
        code: `import numpy as np
from sklearn.datasets import make_circles
from sklearn.svm import SVC
X, y = make_circles(n_samples=300, factor=0.4, noise=0.08, random_state=0)
lin = SVC(kernel="linear").fit(X, y).score(X, y)
lifted = np.column_stack([X, (X ** 2).sum(axis=1)])            # add r² = x1² + x2²
print(f"linear SVM on (x1, x2): training accuracy {lin:.3f}")
print(f"linear SVM on (x1, x2, x1² + x2²): training accuracy {SVC(kernel='linear').fit(lifted, y).score(lifted, y):.3f}")`,
      }, {
        title: 'The kernel trick, checked',
        prose: 'x = (1, 2), x′ = (3, 1). **Predict** both numbers.',
        code: `phi = lambda v: np.array([v[0] ** 2, v[1] ** 2, np.sqrt(2) * v[0] * v[1]])
x, xp = np.array([1.0, 2.0]), np.array([3.0, 1.0])
print("kernel (x·x′)² =", (x @ xp) ** 2)
print("explicit φ(x)·φ(x′) =", round(phi(x) @ phi(xp), 10), "   φ(x) =", np.round(phi(x), 3), " φ(x′) =", np.round(phi(xp), 3))
rng = np.random.default_rng(0)
A, B = rng.normal(size=(5, 2)), rng.normal(size=(5, 2))
print("largest difference over 25 random pairs:", np.abs((A @ B.T) ** 2 - np.array([[phi(a) @ phi(c) for c in B] for a in A])).max())`,
      }, {
        title: 'The RBF kernel and γ',
        prose: 'Two noisy moons, features standardized first. **Predict** what happens to training and validation accuracy as γ grows.',
        code: `from sklearn.datasets import make_moons
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
X, y = make_moons(n_samples=400, noise=0.3, random_state=0)
Xtr, ytr, Xva, yva = X[:250], y[:250], X[250:], y[250:]
for gamma in [0.03, 0.3, 3, 30, 300]:
    m = make_pipeline(StandardScaler(), SVC(kernel="rbf", gamma=gamma, C=1.0)).fit(Xtr, ytr)
    print(f"γ = {gamma:6}: train {m.score(Xtr, ytr):.3f}   validation {m.score(Xva, yva):.3f}   support vectors {len(m[-1].support_)}")`,
        tryThis: 'Keep γ = 3 and try C = 0.1 and C = 100. Which way does each move the boundary?',
      }],
    },
  },
  'l15-compare': {
    formulaTex: '$$\\text{logistic: } \\log(1 + e^{-m}) \\qquad \\text{hinge: } \\max(0, 1 - m)$$',
    mathCode: {
      rows: [
        ['$\\log(1 + e^{-m})$', 'np.log1p(np.exp(-m))', 'Logistic loss: never exactly zero, so every point keeps pulling.'],
        ['$\\max(0, 1 - m)$', 'np.maximum(0, 1 - m)', 'Hinge: zero beyond the margin, so only support vectors matter.'],
        ['probabilities from an SVM', 'CalibratedClassifierCV(LinearSVC(), method="sigmoid")', 'Platt scaling on held-out folds (Lab 09).'],
      ],
    },
    notebook: {
      title: 'Lab 15.5 · SVM or logistic regression?',
      intro: 'Compare the two on the same data: accuracy, how many points each depends on, and whether their outputs can be read as probabilities.',
      cells: [{
        title: 'Same data, two linear classifiers',
        prose: '**Predict** how different the two accuracies are.',
        code: `import numpy as np
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
rng = np.random.default_rng(0)
n = 400
y = rng.integers(0, 2, n)
X = rng.normal(size=(n, 2)) + np.where(y[:, None] == 1, [1.0, 0.8], [-1.0, -0.8])
for name, model in [("linear SVM", SVC(kernel="linear", C=1.0)), ("logistic regression", LogisticRegression())]:
    print(f"{name:20s} 5-fold accuracy {cross_val_score(model, X, y, cv=5).mean():.3f}")
svm = SVC(kernel="linear", C=1.0).fit(X, y)
print("the SVM depends on", len(svm.support_), "of", n, "points; logistic regression on all", n)`,
      }, {
        title: 'Scores are not probabilities',
        prose: 'The SVM’s decision function is a signed distance. Calibrate it on held-out folds to get probabilities, and compare with logistic regression by Brier score (Lab 09).',
        code: `from sklearn.calibration import CalibratedClassifierCV
Xtr, ytr, Xte, yte = X[:300], y[:300], X[300:], y[300:]
raw = SVC(kernel="linear", C=1.0).fit(Xtr, ytr).decision_function(Xte)
print("SVM scores range from", round(raw.min(), 2), "to", round(raw.max(), 2), "— not probabilities")
cal = CalibratedClassifierCV(SVC(kernel="linear", C=1.0), method="sigmoid", cv=5).fit(Xtr, ytr).predict_proba(Xte)[:, 1]
lr = LogisticRegression().fit(Xtr, ytr).predict_proba(Xte)[:, 1]
print(f"Brier score: calibrated SVM {np.mean((cal - yte) ** 2):.4f}   logistic regression {np.mean((lr - yte) ** 2):.4f}")`,
      }],
    },
  },
}
