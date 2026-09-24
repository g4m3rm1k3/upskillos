// Lab 08 runnable cells and math ↔ code tables, keyed by lesson id.
const BLOBS = `import numpy as np
rng = np.random.default_rng(0)
n = 200
y = rng.integers(0, 2, n)
X = rng.normal(0, 1, (n, 2)) + np.where(y[:, None] == 1, [1.2, 1.0], [-1.2, -1.0])   # overlapping blobs

def sigmoid(z):
    out = np.empty_like(z, dtype=float)
    pos = z >= 0
    out[pos] = 1 / (1 + np.exp(-z[pos]))
    ez = np.exp(z[~pos])
    out[~pos] = ez / (1 + ez)
    return out

def log_loss(w, b, X, y):
    z = X @ w + b
    return np.mean(np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z))) - y * z)

def grad(w, b, X, y, lam=0.0):
    p = sigmoid(X @ w + b)
    return X.T @ (p - y) / len(y) + 2 * lam * w, np.mean(p - y)`

export const extras = {
  'l08-why': {
    mathCode: {
      rows: [
        ['$z = w \\cdot x + b$', 'z = X @ w + b', 'A score: any real number.'],
        ['$p = \\sigma(z) \\approx P(y = 1 \\mid x)$', 'p = 1 / (1 + np.exp(-z))', 'Squashed into (0, 1).'],
      ],
    },
    notebook: {
      title: 'Lab 08.1 · Why not a line for yes/no?',
      intro: 'Fit least squares to 0/1 labels and see predictions escape [0, 1]; then squash a score with the sigmoid.',
      cells: [{
        title: 'Least squares on 0/1 targets',
        prose: '**Predict** whether any prediction falls outside [0, 1].',
        code: `import numpy as np
x = np.array([0., 1, 2, 3, 4, 5, 6, 7, 30])
y = np.array([0., 0, 0, 1, 0, 1, 1, 1, 1])
w, b = np.polyfit(x, y, 1)
print(np.round(w * x + b, 2))`,
      }, {
        title: 'Scores become probabilities',
        prose: '**Predict** σ(z) for z = −4, 0 and 4.',
        code: `z = np.array([-4., 0., 4.])
print(1 / (1 + np.exp(-z)))`,
      }],
    },
  },
  'l08-sigmoid': {
    mathCode: {
      rows: [
        ['$\\sigma(z) = \\frac{1}{1 + e^{-z}}$', '1 / (1 + np.exp(-z))', 'Naive form: overflows for very negative z.'],
        ['$\\operatorname{odds} = \\frac{p}{1-p}$', 'p / (1 - p)', 'Ratio of yes to no.'],
        ['$\\operatorname{logit}(p) = \\log\\frac{p}{1-p}$', 'np.log(p / (1 - p))', 'Inverts the sigmoid.'],
        ['$e^{w_j}$', 'np.exp(w_j)', 'Odds multiplier per unit of feature j.'],
      ],
    },
    notebook: {
      title: 'Lab 08.2 · Sigmoid, odds and log-odds',
      intro: 'Check the sigmoid’s symmetry, convert between probability, odds and log-odds, and see the naive form overflow.',
      cells: [{
        title: 'Probability, odds, log-odds',
        prose: '**Predict** the odds for p = 0.8 and the logit of 0.5.',
        code: `import numpy as np
for p in [0.5, 0.8, 0.99]:
    print(f"p = {p}: odds {p / (1 - p):.2f}   log-odds {np.log(p / (1 - p)):.3f}")
print("sigma(logit(0.8)) =", 1 / (1 + np.exp(-np.log(0.8 / 0.2))))`,
      }, {
        title: 'One weight, one odds multiplier',
        prose: 'w = 0.7. **Predict** the odds multiplier, then the change in probability starting from p = 0.5 and from p = 0.95.',
        code: `w = 0.7
print("odds multiplier:", np.exp(w))
for p in [0.5, 0.95]:
    z = np.log(p / (1 - p)) + w
    print(f"p {p} → {1 / (1 + np.exp(-z)):.3f}")`,
      }, {
        title: 'Overflow',
        prose: '**Predict** what the naive formula does at z = −1000. Here it still prints the right numbers, but only after an overflow warning: inside a longer computation that `inf` can become `nan`. The stable form never overflows.',
        code: `import warnings; warnings.simplefilter("always")
z = np.array([-1000., 0., 1000.])
print("naive :", 1 / (1 + np.exp(-z)))
from scipy.special import expit
print("stable:", expit(z))`,
      }],
    },
  },
  'l08-loss': {
    mathCode: {
      rows: [
        ['$-\\log p$ (for $y = 1$)', '-np.log(p)', 'Cost of the probability given to the truth.'],
        ['$J = -\\frac{1}{n}\\sum [y\\log p + (1-y)\\log(1-p)]$', '-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))', 'Binary cross-entropy.'],
        ['$\\log(1 + e^z) - yz$', 'np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z))) - y * z', 'The same loss from the score, stable for any z.'],
      ],
    },
    notebook: {
      title: 'Lab 08.3 · Cross-entropy',
      intro: 'See how the loss punishes confident mistakes, check that the stable score form agrees with the probability form, and watch the naive form break.',
      cells: [{
        title: 'Confidently wrong costs the most',
        prose: '**Predict** the loss for p = 0.99, 0.5 and 0.01 when the truth is 1.',
        code: `import numpy as np
for p in [0.99, 0.5, 0.01]:
    print(f"p = {p}: loss {-np.log(p):.3f}")`,
      }, {
        title: 'Two formulas, one loss',
        prose: 'The score form never takes log(0). **Predict** what the probability form prints at z = 40, y = 0.',
        code: `z = np.array([-3., 0.5, 2., 40.])
y = np.array([0., 1., 1., 0.])
p = 1 / (1 + np.exp(-z))
print("from p :", -(y * np.log(p) + (1 - y) * np.log(1 - p)))
print("from z :", np.maximum(z, 0) + np.log1p(np.exp(-np.abs(z))) - y * z)`,
      }],
    },
  },
  'l08-gradient': {
    mathCode: {
      rows: [
        ['$\\frac{d\\ell}{dz} = p - y$', 'p - y', 'The sigmoid and the log cancel.'],
        ['$\\nabla_w J = \\frac{1}{n}X^\\top(p - y) + 2\\lambda w$', 'X.T @ (p - y) / n + 2 * lam * w', 'Error times input, averaged.'],
        ['$\\frac{\\partial J}{\\partial b} = \\operatorname{mean}(p - y)$', 'np.mean(p - y)', 'The intercept’s entry.'],
      ],
    },
    notebook: {
      title: 'Lab 08.4 · The gradient, checked and used',
      intro: 'Compute the gradient, verify it with finite differences, and train logistic regression from zeros.',
      cells: [{
        title: 'Check the gradient numerically',
        prose: '**Predict** how many digits the formula and the finite difference share.',
        code: BLOBS + `
w, b = np.array([0.3, -0.2]), 0.1
gw, gb = grad(w, b, X, y)
eps = 1e-6
num = [(log_loss(w + eps * e, b, X, y) - log_loss(w - eps * e, b, X, y)) / (2 * eps) for e in np.eye(2)]
print("formula :", gw, gb)
print("numeric :", np.array(num), (log_loss(w, b + eps, X, y) - log_loss(w, b - eps, X, y)) / (2 * eps))`,
      }, {
        title: 'Train from zeros',
        prose: '**Predict** the loss at step 0 (all probabilities 0.5).',
        code: `w, b, alpha = np.zeros(2), 0.0, 0.5
for step in range(301):
    if step % 100 == 0:
        print(f"step {step:>3}: loss {log_loss(w, b, X, y):.4f}   accuracy {np.mean((sigmoid(X @ w + b) >= 0.5) == y):.3f}")
    gw, gb = grad(w, b, X, y)
    w, b = w - alpha * gw, b - alpha * gb`,
      }],
    },
  },
  'l08-boundary': {
    mathCode: {
      rows: [
        ['$w \\cdot x + b = 0$', 'x2 = -(w[0] * x1 + b) / w[1]', 'The boundary line, solved for x₂.'],
        ['$\\varphi(x) = (x_1, x_2, x_1^2, x_2^2, x_1x_2)$', 'np.column_stack([x1, x2, x1**2, x2**2, x1*x2])', 'A feature map: curved boundaries, same training.'],
        ['$\\|w\\|$', 'np.linalg.norm(w)', 'Grows without bound on separable data unless λ > 0.'],
      ],
    },
    notebook: {
      title: 'Lab 08.5 · Boundaries, feature maps and separable data',
      intro: 'Locate a boundary by hand, separate a ring with quadratic features, and watch the weights grow on separable data until a penalty stops them.',
      cells: [{
        title: 'Where the boundary crosses the axes',
        prose: 'w = (1, 2), b = −4. **Predict** both intercepts.',
        code: `import numpy as np
w, b = np.array([1., 2.]), -4.
print("crosses x2 axis at x2 =", -b / w[1], "  crosses x1 axis at x1 =", -b / w[0])`,
      }, {
        title: 'A ring needs a curved boundary',
        prose: '**Predict** accuracy with linear features, then with quadratic ones.',
        code: `from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(1)
r = np.concatenate([rng.uniform(0, 1, 150), rng.uniform(1.6, 2.4, 150)])
t = rng.uniform(0, 2 * np.pi, 300)
X2 = np.column_stack([r * np.cos(t), r * np.sin(t)]); y2 = (r > 1.3).astype(int)
quad = np.column_stack([X2, X2 ** 2, X2[:, 0] * X2[:, 1]])
print("linear   :", LogisticRegression().fit(X2, y2).score(X2, y2))
print("quadratic:", LogisticRegression(max_iter=1000).fit(quad, y2).score(quad, y2))`,
      }, {
        title: 'Separable data: the weights never stop growing',
        prose: '**Predict** ‖w‖ after 1,000 and 10,000 steps with λ = 0, then with λ = 0.01. Without a penalty it keeps growing — slowly, but with no limit.',
        code: `Xs = np.array([[-2., -1], [-1, -2], [-1.5, -1.5], [1, 2], [2, 1], [1.5, 1.5]]); ys = np.array([0., 0, 0, 1, 1, 1])
def train(lam, steps):
    w, b = np.zeros(2), 0.0
    for _ in range(steps):
        p = 1 / (1 + np.exp(-(Xs @ w + b)))
        w -= 0.5 * (Xs.T @ (p - ys) / 6 + 2 * lam * w); b -= 0.5 * np.mean(p - ys)
    return np.linalg.norm(w)
for lam in [0.0, 0.01]:
    print(f"λ = {lam}: ‖w‖ after 1,000 steps {train(lam, 1000):.2f}, after 10,000 {train(lam, 10000):.2f}")`,
      }],
    },
  },
  'l08-decision': {
    mathCode: {
      rows: [
        ['expected cost of acting', '(1 - p) * C_FP', 'Wrong if the case was negative.'],
        ['expected cost of not acting', 'p * C_FN', 'Wrong if the case was positive.'],
        ['$t = \\frac{C_{FP}}{C_{FP} + C_{FN}}$', 'C_FP / (C_FP + C_FN)', 'Act when p exceeds this threshold.'],
      ],
    },
    notebook: {
      title: 'Lab 08.6 · From probability to decision',
      intro: 'Derive the cost-based threshold, then compare total cost on validation data at thresholds 0.5 and 0.2.',
      cells: [{
        title: 'The threshold from costs',
        prose: 'C_FP = 1, C_FN = 4. **Predict** the threshold.',
        code: `C_FP, C_FN = 1, 4
print("act when p >", C_FP / (C_FP + C_FN))`,
      }, {
        title: 'Which threshold costs less?',
        prose: '**Predict** which threshold has the lower total cost on validation rows.',
        code: BLOBS + `
w, b = np.zeros(2), 0.0
tr, va = np.arange(150), np.arange(150, 200)
for _ in range(300):
    gw, gb = grad(w, b, X[tr], y[tr]); w, b = w - 0.5 * gw, b - 0.5 * gb
p = sigmoid(X[va] @ w + b)
for t in [0.5, 0.2]:
    act = p > t
    fp, fn = np.sum(act & (y[va] == 0)), np.sum(~act & (y[va] == 1))
    print(f"threshold {t}: {fp} false positives, {fn} false negatives, cost {fp * 1 + fn * 4}")`,
      }],
    },
  },
}
