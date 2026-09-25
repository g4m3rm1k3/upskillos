// Lab 14 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Boosting is written from scratch with regression stumps on the lab's own true function, then
// checked against scikit-learn's GradientBoostingRegressor and HistGradientBoostingRegressor.

const DATA = `import numpy as np

def truth(x):
    return np.sin(2.2 * x) + 0.35 * x + (x > 1.4) * 0.8      # the lab's true curve, with a jump at 1.4

def make_data(n, noise=0.35, seed=0):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-3, 3, n)
    return x, truth(x) + noise * rng.normal(size=n)

x_train, y_train = make_data(150, seed=1)
x_val, y_val = make_data(300, seed=2)`

const STUMP = `def fit_stump(x, r):
    """The single split of x that best fits targets r by squared error. Returns (threshold, left mean, right mean)."""
    order = np.argsort(x); xs, rs = x[order], r[order]
    best = None
    for i in range(1, len(xs)):
        if xs[i] == xs[i - 1]:
            continue
        left, right = rs[:i], rs[i:]
        sse = ((left - left.mean()) ** 2).sum() + ((right - right.mean()) ** 2).sum()
        if best is None or sse < best[0]:
            best = (sse, (xs[i - 1] + xs[i]) / 2, left.mean(), right.mean())
    return best[1:]

def stump_predict(stump, x):
    t, left, right = stump
    return np.where(x <= t, left, right)

def boost(x, y, stages=200, rate=0.1):
    F0 = y.mean()                                   # stage 0: the mean
    F = np.full(len(y), F0)
    stumps = []
    for m in range(stages):
        r = y - F                                   # residuals = negative gradient of ½(y − F)²
        s = fit_stump(x, r)
        F = F + rate * stump_predict(s, x)          # F_m = F_{m−1} + ν h_m
        stumps.append(s)
    return F0, stumps

def boost_predict(model, x, rate=0.1, stages=None):
    F0, stumps = model
    return F0 + rate * sum(stump_predict(s, x) for s in stumps[:stages])`

export const extras = {
  'l14-sequential': {
    formulaTex: '$$F_0 = \\bar y$$ $$r_i = y_i - F_{m-1}(x_i)$$ $$h_m = \\text{tree fitted to } \\{(x_i, r_i)\\}$$ $$F_m = F_{m-1} + \\nu\\,h_m$$',
    mathCode: {
      rows: [
        ['$F_0 = \\bar y$', 'F = np.full(n, y.mean())', 'Stage 0 predicts the mean for everyone.'],
        ['$r_i = y_i - F_{m-1}(x_i)$', 'r = y - F', 'What the ensemble still misses at each point.'],
        ['$h_m$', 's = fit_stump(x, r)', 'A weak learner fitted to the residuals, not to y.'],
        ['$F_m = F_{m-1} + \\nu h_m$', 'F = F + rate * stump_predict(s, x)', 'Add a fraction ν of the correction.'],
      ],
    },
    notebook: {
      title: 'Lab 14.1 · Learning from residuals',
      intro: 'Do two boosting stages by hand on six points, then write the loop and watch training error fall stage by stage.',
      cells: [{
        title: 'Two stages by hand',
        prose: 'Six points. Stage 0 predicts the mean. **Predict** the residual of the point with y = 7.',
        code: `import numpy as np
x = np.array([1., 2, 3, 4, 5, 6])
y = np.array([2., 3, 2.5, 7, 8, 7.5])
F = np.full(6, y.mean())
print("stage 0 prediction:", F[0], "  residuals:", y - F)
for m in [1, 2]:
    r = y - F
    # the best single split of x for these residuals, found by trying each midpoint
    cands = [((r[x <= t] - r[x <= t].mean()) ** 2).sum() + ((r[x > t] - r[x > t].mean()) ** 2).sum() for t in x[:-1] + 0.5]
    t = (x[:-1] + 0.5)[int(np.argmin(cands))]
    h = np.where(x <= t, r[x <= t].mean(), r[x > t].mean())
    F = F + 0.5 * h                                   # ν = 0.5
    print(f"stage {m}: split at x <= {t}, correction {np.round(h, 2)}, residuals now {np.round(y - F, 2)}")`,
      }, {
        title: 'The boosting loop',
        prose: 'The lab’s true curve with noise. Stumps, ν = 0.1. **Predict** how training MSE behaves over 200 stages.',
        code: `${DATA}
${STUMP}
model = boost(x_train, y_train, stages=200, rate=0.1)
for m in [0, 1, 5, 20, 50, 200]:
    F = boost_predict(model, x_train, stages=m)
    print(f"stage {m:3d}: training MSE {np.mean((y_train - F) ** 2):.4f}")`,
        tryThis: 'Use rate=1.0. How many stages does training MSE need to get below 0.15 now?',
      }],
    },
  },
  'l14-gradient': {
    formulaTex: '$$L = \\sum_i \\tfrac12\\big(y_i - F(x_i)\\big)^2$$ $$-\\frac{\\partial L}{\\partial F(x_i)} = y_i - F(x_i)$$ $$\\text{absolute error: } -\\frac{\\partial}{\\partial F}|y - F| = \\operatorname{sign}(y - F)$$ $$\\text{log loss: } -\\frac{\\partial \\ell}{\\partial F} = y - \\sigma(F)$$',
    mathCode: {
      rows: [
        ['$\\tfrac12(y - F)^2$', '0.5 * (y - F) ** 2', 'Squared loss for one point, as a function of its prediction F.'],
        ['$-\\frac{\\partial L}{\\partial F}$', '-(loss(F + h) - loss(F - h)) / (2 * h)', 'A finite-difference check of the derivative.'],
        ['$y - F$', 'y - F', 'For squared loss the negative gradient is the residual.'],
        ['$\\operatorname{sign}(y - F)$', 'np.sign(y - F)', 'For absolute loss: only the direction, so one outlier cannot dominate.'],
        ['$y - \\sigma(F)$', 'y - 1 / (1 + np.exp(-F))', 'For log loss with F a log-odds score: label minus probability.'],
      ],
    },
    notebook: {
      title: 'Lab 14.2 · Boosting is gradient descent on predictions',
      intro: 'Check the three negative gradients numerically, see why a tree is needed to turn gradients into a function of x, and boost with absolute error against an outlier.',
      cells: [{
        title: 'The negative gradients, checked numerically',
        prose: 'y = 2 and F = 5 for squared and absolute loss; y = 1 and F = 0.5 for log loss. **Predict** each negative gradient.',
        code: `import numpy as np
sigma = lambda z: 1 / (1 + np.exp(-z))
losses = {
    "squared":  (lambda F, y: 0.5 * (y - F) ** 2,                             lambda F, y: y - F),
    "absolute": (lambda F, y: abs(y - F),                                     lambda F, y: np.sign(y - F)),
    "log loss": (lambda F, y: -(y * np.log(sigma(F)) + (1 - y) * np.log(1 - sigma(F))), lambda F, y: y - sigma(F)),
}
h = 1e-5
for name, (loss, neg_grad) in losses.items():
    F, y = (0.5, 1) if name == "log loss" else (5.0, 2.0)
    numeric = -(loss(F + h, y) - loss(F - h, y)) / (2 * h)
    print(f"{name:9s}: formula {neg_grad(F, y):+.5f}   finite difference {numeric:+.5f}")`,
      }, {
        title: 'Why fit a tree to the gradient',
        prose: 'Moving each training prediction straight down its own gradient fits the training set but says nothing about a new x. A stump fitted to the same gradient does. **Predict** each approach’s validation MSE after 50 steps.',
        code: `${DATA}
${STUMP}
F_direct = np.full(len(y_train), y_train.mean())
for _ in range(50):
    F_direct += 0.1 * (y_train - F_direct)               # step each training prediction on its own
print(f"direct: training MSE {np.mean((y_train - F_direct) ** 2):.4f}   new points: no rule exists — the best it can do is the mean, MSE {np.mean((y_val - y_train.mean()) ** 2):.4f}")
model = boost(x_train, y_train, stages=50, rate=0.1)
print(f"stumps: training MSE {np.mean((y_train - boost_predict(model, x_train)) ** 2):.4f}   validation MSE {np.mean((y_val - boost_predict(model, x_val)) ** 2):.4f}")`,
      }, {
        title: 'Absolute error resists an outlier',
        prose: 'One training target is corrupted to +40. Boost with the residual (squared loss) and with its sign (absolute loss), both with the stump predicting the median of its side for the absolute case.',
        code: `y_bad = y_train.copy(); y_bad[np.argmin(abs(x_train - 0.0))] = 40.0     # one corrupted target near x = 0
def boost_abs(x, y, stages=300, rate=0.1):
    F = np.full(len(y), np.median(y)); stumps = []
    for _ in range(stages):
        g = np.sign(y - F)                                # negative gradient of |y − F|
        t, _, _ = fit_stump(x, g)                         # where to split: fitted to the signs
        left, right = x <= t, x > t
        s = (t, np.median((y - F)[left]), np.median((y - F)[right]))   # how far: median residual on each side
        F = F + rate * stump_predict(s, x); stumps.append(s)
    return np.median(y), stumps
sq, ab = boost(x_train, y_bad, stages=300), boost_abs(x_train, y_bad)
near0 = abs(x_val) < 0.3
print(f"squared loss : validation MSE {np.mean((y_val - boost_predict(sq, x_val)) ** 2):.3f}   near x = 0: {np.mean((y_val - boost_predict(sq, x_val))[near0] ** 2):.3f}")
print(f"absolute loss: validation MSE {np.mean((y_val - boost_predict(ab, x_val)) ** 2):.3f}   near x = 0: {np.mean((y_val - boost_predict(ab, x_val))[near0] ** 2):.3f}")`,
      }],
    },
  },
  'l14-shrinkage': {
    formulaTex: '$$F_M = F_0 + \\nu\\sum_{m=1}^M h_m$$',
    mathCode: {
      rows: [
        ['$\\nu$', 'learning_rate', 'The shrinkage: how much of each correction is added.'],
        ['$M$', 'n_estimators', 'The number of stages.'],
        ['$F_M$ after each stage', 'model.staged_predict(X_val)', 'Predictions after 1, 2, …, M stages, without refitting.'],
        ['depth of $h_m$', 'max_depth', '1 = stumps (no interactions); deeper = interactions and faster overfitting.'],
        ['row subsample', 'subsample=0.8', 'Stochastic gradient boosting: each tree sees a random 80% of rows.'],
      ],
    },
    notebook: {
      title: 'Lab 14.3 · Shrinkage, depth and subsampling',
      intro: 'Check the hand-built booster against scikit-learn, then compare learning rates, depths and subsampling by validation error at every stage.',
      cells: [{
        title: 'Our booster against scikit-learn',
        prose: 'Same stumps, same rate, same starting mean. **Predict** how far apart the two sets of predictions are.',
        code: `${DATA}
${STUMP}
from sklearn.ensemble import GradientBoostingRegressor
ours = boost_predict(boost(x_train, y_train, stages=100, rate=0.1), x_val)
lib = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=1, criterion="squared_error").fit(x_train[:, None], y_train)
print("largest difference on validation points:", float(np.abs(ours - lib.predict(x_val[:, None])).max()))`,
      }, {
        title: 'Learning rate against stages',
        prose: 'Validation MSE after every stage, for four rates; smaller rates get more stages. **Predict** which rate is worst, and roughly how many stages ν = 0.03 needs to reach its best.',
        code: `for rate, stages in [(1.0, 1000), (0.3, 1000), (0.1, 1500), (0.03, 4000)]:
    gb = GradientBoostingRegressor(n_estimators=stages, learning_rate=rate, max_depth=1).fit(x_train[:, None], y_train)
    val = [np.mean((y_val - p) ** 2) for p in gb.staged_predict(x_val[:, None])]
    best = int(np.argmin(val))
    print(f"ν = {rate:4}: best validation MSE {val[best]:.4f} at stage {best + 1:4d}   after all {stages} stages {val[-1]:.4f}")
print("Below some rate the best error stops improving; a smaller ν then only costs more stages.")`,
        tryThis: 'Rerun with max_depth=3. Does each rate reach its best stage sooner or later?',
      }, {
        title: 'Depth and subsampling',
        prose: 'ν = 0.1. **Predict** whether depth 4 beats stumps on this one-feature problem.',
        code: `for depth, sub in [(1, 1.0), (2, 1.0), (4, 1.0), (1, 0.7)]:
    gb = GradientBoostingRegressor(n_estimators=600, learning_rate=0.1, max_depth=depth, subsample=sub, random_state=0).fit(x_train[:, None], y_train)
    val = [np.mean((y_val - p) ** 2) for p in gb.staged_predict(x_val[:, None])]
    print(f"depth {depth}, subsample {sub}: best validation MSE {min(val):.4f} at stage {int(np.argmin(val)) + 1}")`,
      }],
    },
  },
  'l14-early': {
    formulaTex: '$$M^* = \\arg\\min_M \\operatorname{err}_{\\text{val}}(F_M)$$',
    mathCode: {
      rows: [
        ['$\\operatorname{err}_{\\text{val}}(F_M)$', 'val[m]', 'Validation error after stage m.'],
        ['patience', 'if m - best_m >= patience: break', 'Stop after this many stages without a new best.'],
        ['$M^*$', 'best_m', 'The stage kept: the lowest validation error seen.'],
        ['held-out test', 'model.score(X_test, y_test)', 'Reported once, on data the stopping rule never saw.'],
      ],
    },
    notebook: {
      title: 'Lab 14.4 · Early stopping',
      intro: 'Implement early stopping with patience, compare it with scikit-learn’s built-in version, and report on a test set the stopping rule never touched.',
      cells: [{
        title: 'Early stopping by hand',
        prose: 'ν = 0.3, patience 50. **Predict** whether the loop stops long before 2,000 stages.',
        code: `${DATA}
from sklearn.ensemble import GradientBoostingRegressor
gb = GradientBoostingRegressor(n_estimators=2000, learning_rate=0.3, max_depth=2).fit(x_train[:, None], y_train)
patience, best_m, best_err = 50, 0, np.inf
for m, p in enumerate(gb.staged_predict(x_val[:, None]), start=1):
    err = np.mean((y_val - p) ** 2)
    if err < best_err:
        best_m, best_err = m, err
    elif m - best_m >= patience:
        print(f"stopped at stage {m}: no improvement for {patience} stages")
        break
print(f"kept stage {best_m}, validation MSE {best_err:.4f}")
train_err = np.mean((y_train - list(gb.staged_predict(x_train[:, None]))[1999]) ** 2)
print(f"for comparison, stage 2000: training MSE {train_err:.4f}")`,
      }, {
        title: 'The library version, and an honest report',
        prose: 'scikit-learn can hold out part of the training data and stop by itself. The validation score it stopped on is optimistic, so the report uses fresh test data.',
        code: `x_test, y_test = make_data(300, seed=3)
auto = GradientBoostingRegressor(n_estimators=2000, learning_rate=0.3, max_depth=2, validation_fraction=0.2, n_iter_no_change=50, random_state=0).fit(x_train[:, None], y_train)
print("stages kept by n_iter_no_change:", auto.n_estimators_)
print(f"test MSE {np.mean((y_test - auto.predict(x_test[:, None])) ** 2):.4f}   (noise variance alone is {0.35 ** 2:.4f})")`,
      }],
    },
  },
  'l14-practice': {
    formulaTex: '$$\\#\\,\\text{thresholds per feature} \\le 255 \\ll n - 1$$',
    mathCode: {
      rows: [
        ['bin edges', 'HistGradientBoostingRegressor(max_bins=255)', 'Each feature is bucketed once; splits are searched only at bucket boundaries.'],
        ['missing values', 'np.nan in X', 'Routed to whichever side reduces the loss more, learned during training.'],
        ['early stopping', 'early_stopping=True', 'Built in, on an internal validation split.'],
      ],
    },
    notebook: {
      title: 'Lab 14.5 · Boosting in practice',
      intro: 'Compare a histogram-based booster with the exact one and with a random forest on a larger problem, and let it handle missing values natively.',
      cells: [{
        title: 'Histogram boosting at scale',
        prose: '10,000 rows and 8 features. **Predict** which model trains fastest and which is most accurate. (Times vary by machine; the browser is slower than local Python.)',
        code: `import numpy as np, time
from sklearn.ensemble import GradientBoostingRegressor, HistGradientBoostingRegressor, RandomForestRegressor
rng = np.random.default_rng(0)
X = rng.uniform(-3, 3, (10_000, 8))
y = np.sin(2.2 * X[:, 0]) + 0.35 * X[:, 1] * X[:, 2] + (X[:, 3] > 1.4) * 0.8 + 0.35 * rng.normal(size=10_000)
Xtr, ytr, Xte, yte = X[:7_500], y[:7_500], X[7_500:], y[7_500:]
for name, model in [("exact gradient boosting", GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.3)),
                    ("histogram boosting", HistGradientBoostingRegressor(max_iter=100, max_depth=3, learning_rate=0.3)),
                    ("random forest", RandomForestRegressor(n_estimators=30, min_samples_leaf=5, random_state=0))]:
    t0 = time.perf_counter(); model.fit(Xtr, ytr); secs = time.perf_counter() - t0
    print(f"{name:24s}: test MSE {np.mean((yte - model.predict(Xte)) ** 2):.4f}   fit {secs:.2f} s")`,
      }, {
        title: 'Missing values handled natively',
        prose: '10% of one important feature is missing. **Predict** which of the two boosters accepts the data as it is.',
        code: `X_miss = Xtr.copy(); X_miss[rng.random(len(X_miss)) < 0.1, 0] = np.nan
hist = HistGradientBoostingRegressor(max_iter=100, max_depth=3, learning_rate=0.3).fit(X_miss, ytr)
print(f"histogram boosting with NaNs: test MSE {np.mean((yte - hist.predict(Xte)) ** 2):.4f}")
try:
    GradientBoostingRegressor(n_estimators=10).fit(X_miss, ytr)
    print("exact gradient boosting accepted NaNs too")
except ValueError as err:
    print("exact gradient boosting:", str(err).splitlines()[0])`,
      }],
    },
  },
}
