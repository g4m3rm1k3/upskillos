const TREE = `import numpy as np

# Provided: a compact CART tree (Gini) with optional random feature subsets.
def fit_tree(X, y, max_depth, rng=None, max_features=None):
    node = {"value": float(np.mean(y))}
    if max_depth == 0 or node["value"] in (0.0, 1.0):
        return node
    features = np.arange(X.shape[1])
    if max_features is not None:
        features = rng.choice(features, size=max_features, replace=False)
    best = None
    for j in features:
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            p1, p2 = y[left].mean(), y[~left].mean()
            w = (left.sum() * 2 * p1 * (1 - p1) + (~left).sum() * 2 * p2 * (1 - p2)) / len(y)
            if best is None or w < best[2]:
                best = (j, t, w)
    if best is None:
        return node
    j, t, _ = best
    left = X[:, j] <= t
    node.update(feature=j, threshold=t,
                left=fit_tree(X[left], y[left], max_depth - 1, rng, max_features),
                right=fit_tree(X[~left], y[~left], max_depth - 1, rng, max_features))
    return node

def tree_predict(tree, X):
    out = np.empty(len(X))
    for i, x in enumerate(X):
        node = tree
        while "feature" in node:
            node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
        out[i] = node["value"]
    return out
`
export default {
  filename: 'random_forest.py', packages: ['numpy'],
  title: 'Build a random forest around a tree.',
  intro: 'A working decision tree (`fit_tree`, `tree_predict`) is provided at the top of the file — you built one in Lab 12. Implement the ensemble around it: bootstrap sampling, a forest of decorrelated trees, averaged predictions, out-of-bag accuracy, and the variance formula that explains why it all works.',
  steps: [
    '`bootstrap_indices(n, rng)` → n integer indices drawn uniformly **with replacement** from `range(n)`.',
    '`fit_forest(X, y, n_trees, max_depth, rng, max_features=None)` → list of `(tree, in_bag_indices)` pairs, one tree per bootstrap sample.',
    '`forest_predict_proba(forest, X)` → mean of the trees\' predictions.',
    '`oob_accuracy(forest, X, y)` → accuracy where each row is predicted only by trees that did not see it (skip rows no tree left out).',
    '`average_variance(sigma2, rho, T)` → `rho*sigma2 + (1-rho)*sigma2/T`.',
  ],
  hints: [
    ['Bootstrap', '`rng.integers(0, n, size=n)`.'],
    ['Out-of-bag', 'For each tree, `oob = np.setdiff1d(np.arange(n), in_bag)`. Accumulate `sums[oob] += tree_predict(tree, X[oob])` and `counts[oob] += 1`; then use rows with `counts > 0`.'],
  ],
  starter: `${TREE}
def bootstrap_indices(n, rng):
    raise NotImplementedError

def fit_forest(X, y, n_trees, max_depth, rng, max_features=None):
    raise NotImplementedError

def forest_predict_proba(forest, X):
    raise NotImplementedError

def oob_accuracy(forest, X, y):
    raise NotImplementedError

def average_variance(sigma2, rho, T):
    raise NotImplementedError
`,
  solution: `${TREE}
def bootstrap_indices(n, rng):
    return rng.integers(0, n, size=n)

def fit_forest(X, y, n_trees, max_depth, rng, max_features=None):
    forest = []
    for _ in range(n_trees):
        idx = bootstrap_indices(len(y), rng)
        forest.append((fit_tree(X[idx], y[idx], max_depth, rng, max_features), idx))
    return forest

def forest_predict_proba(forest, X):
    return np.mean([tree_predict(tree, X) for tree, _ in forest], axis=0)

def oob_accuracy(forest, X, y):
    n = len(y)
    sums, counts = np.zeros(n), np.zeros(n)
    for tree, in_bag in forest:
        oob = np.setdiff1d(np.arange(n), in_bag)
        if len(oob):
            sums[oob] += tree_predict(tree, X[oob])
            counts[oob] += 1
    seen = counts > 0
    return float(np.mean((sums[seen] / counts[seen] >= 0.5) == y[seen]))

def average_variance(sigma2, rho, T):
    return rho * sigma2 + (1 - rho) * sigma2 / T
`,
  solutionNote: 'Each tree is trained on its own bootstrap sample, and its in-bag indices are kept so out-of-bag rows can be identified later. Predictions from all trees are averaged into a probability.',
  checkSummary: 'Bootstrap draws (range, replacement, about 63% unique rows); forest size and averaged predictions; a forest that beats a fully grown tree on noisy held-out data in accuracy and Brier score; out-of-bag accuracy within a few points of true held-out accuracy; and the variance formula, including its floor at ρσ².',
  checks: `
import numpy as np
_rng = np.random.default_rng(0)
_b = bootstrap_indices(10000, _rng)
assert _b.shape == (10000,) and _b.min() >= 0 and _b.max() < 10000
assert 0.60 < len(np.unique(_b)) / 10000 < 0.66, "About 63% of rows should appear in a bootstrap sample"
print("PASS: bootstrap sampling")
def _moons(n, rng):
    t = rng.uniform(0, np.pi, n); lab = rng.integers(0, 2, n)
    x = np.where(lab, 1 - np.cos(t), np.cos(t)); y = np.where(lab, 0.5 - np.sin(t), np.sin(t))
    return np.c_[x, y] + 0.35 * rng.normal(size=(n, 2)), lab
_g = np.random.default_rng(1)
_X, _y = _moons(300, _g); _Xt, _yt = _moons(400, _g)
_forest = fit_forest(_X, _y, 40, 20, np.random.default_rng(2), max_features=1)
assert len(_forest) == 40
_p = forest_predict_proba(_forest, _Xt)
assert _p.shape == (400,) and np.all((_p >= 0) & (_p <= 1))
_forest_acc = np.mean((_p >= 0.5) == _yt)
_single = tree_predict(fit_tree(_X, _y, 20), _Xt)
_single_acc = np.mean((_single >= 0.5) == _yt)
_brier_f, _brier_s = np.mean((_p - _yt) ** 2), np.mean((_single - _yt) ** 2)
assert _forest_acc > _single_acc and _brier_f < 0.8 * _brier_s, f"Forest (acc {_forest_acc:.3f}, Brier {_brier_f:.3f}) should clearly beat a fully grown tree (acc {_single_acc:.3f}, Brier {_brier_s:.3f})"
_oob = oob_accuracy(_forest, _X, _y)
assert abs(_oob - _forest_acc) < 0.07, f"OOB {_oob:.3f} should approximate held-out accuracy {_forest_acc:.3f}"
print(f"PASS: forest {_forest_acc:.1%} (Brier {_brier_f:.3f}) vs fully grown tree {_single_acc:.1%} (Brier {_brier_s:.3f}); OOB estimate {_oob:.1%}")
assert abs(average_variance(1, 0.3, 10) - 0.37) < 1e-12 and abs(average_variance(2, 1, 50) - 2) < 1e-12
assert abs(average_variance(1, 0.3, 10**9) - 0.3) < 1e-6
print("PASS: variance of an average of correlated trees")
`,
}
