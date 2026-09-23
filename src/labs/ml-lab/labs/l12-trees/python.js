export default {
  filename: 'decision_tree.py', packages: ['numpy'],
  title: 'Grow a decision tree from scratch.',
  intro: 'Implement impurity measures, an exhaustive split search, recursive growth with stopping rules, and prediction by following a path. Trees are nested dictionaries so you can print and inspect them.',
  steps: [
    '`gini(y)` and `entropy(y)` for 0/1 label arrays (0 for an empty or pure array).',
    '`best_split(X, y, min_leaf=1)` → `(feature, threshold, gain)` using Gini, trying midpoints between consecutive distinct sorted values; `None` if no valid split.',
    '`build_tree(X, y, max_depth, min_leaf=1)` → a leaf `{"value": mean(y)}` or a node `{"feature", "threshold", "left", "right", "value"}`. Stop when pure, at max depth, or with no valid split.',
    '`predict_one(tree, x)` and `predict(tree, X)` → class-1 fractions from the reached leaves.',
    '`depth(tree)` → number of questions on the longest path.',
  ],
  hints: [
    ['Candidate thresholds', '`values = np.unique(X[:, j])` is sorted; candidates are `(values[:-1] + values[1:]) / 2`.'],
    ['Weighted child impurity', '`left = X[:, j] <= t`; `w = (left.sum() * gini(y[left]) + (~left).sum() * gini(y[~left])) / len(y)`; `gain = gini(y) - w`.'],
    ['Recursion', 'Call `build_tree(X[left], y[left], max_depth - 1, min_leaf)` for the left child, and the same with `~left` for the right.'],
  ],
  starter: `import numpy as np

def gini(y):
    raise NotImplementedError

def entropy(y):
    raise NotImplementedError

def best_split(X, y, min_leaf=1):
    raise NotImplementedError

def build_tree(X, y, max_depth, min_leaf=1):
    raise NotImplementedError

def predict_one(tree, x):
    raise NotImplementedError

def predict(tree, X):
    raise NotImplementedError

def depth(tree):
    raise NotImplementedError
`,
  solution: `import numpy as np

def gini(y):
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(2 * p * (1 - p))

def entropy(y):
    if len(y) == 0:
        return 0.0
    p = np.mean(y)
    return float(-sum(q * np.log2(q) for q in (p, 1 - p) if q > 0))

def best_split(X, y, min_leaf=1):
    best = None
    parent = gini(y)
    for j in range(X.shape[1]):
        values = np.unique(X[:, j])
        for t in (values[:-1] + values[1:]) / 2:
            left = X[:, j] <= t
            nl, nr = left.sum(), (~left).sum()
            if nl < min_leaf or nr < min_leaf:
                continue
            weighted = (nl * gini(y[left]) + nr * gini(y[~left])) / len(y)
            gain = parent - weighted
            if best is None or gain > best[2] + 1e-12:
                best = (j, float(t), float(gain))
    return best

def build_tree(X, y, max_depth, min_leaf=1):
    node = {"value": float(np.mean(y))}
    if max_depth == 0 or gini(y) == 0:
        return node
    split = best_split(X, y, min_leaf)
    if split is None:
        return node
    j, t, _ = split
    left = X[:, j] <= t
    node.update(feature=j, threshold=t,
                left=build_tree(X[left], y[left], max_depth - 1, min_leaf),
                right=build_tree(X[~left], y[~left], max_depth - 1, min_leaf))
    return node

def predict_one(tree, x):
    while "feature" in tree:
        tree = tree["left"] if x[tree["feature"]] <= tree["threshold"] else tree["right"]
    return tree["value"]

def predict(tree, X):
    return np.array([predict_one(tree, x) for x in X])

def depth(tree):
    if "feature" not in tree:
        return 0
    return 1 + max(depth(tree["left"]), depth(tree["right"]))
`,
  solutionNote: 'Each recursive call receives only the rows that reached its node and one less unit of depth. Every node stores its class-1 fraction, so a leaf\'s value is directly a probability estimate.',
  checkSummary: 'Gini and entropy values; the best split on a hand-made dataset (feature, threshold and gain); min_leaf enforcement; depth limits and pure-node stopping; perfect training accuracy for an unrestricted tree on distinct points; path-following predictions; and better held-out accuracy for a depth-limited tree than an unrestricted one on noisy data.',
  checks: `
import numpy as np
assert gini(np.array([0, 0, 1, 1])) == 0.5 and gini(np.array([1, 1])) == 0 and gini(np.array([])) == 0
assert abs(entropy(np.array([0, 0, 1, 1])) - 1) < 1e-12 and entropy(np.array([0, 0])) == 0
_X = np.array([[1.0, 5.0], [2.0, 3.0], [3.0, 8.0], [4.0, 1.0]]); _y = np.array([0, 0, 1, 1])
_s = best_split(_X, _y)
assert _s[0] == 0 and abs(_s[1] - 2.5) < 1e-12 and abs(_s[2] - 0.5) < 1e-12, f"Expected (0, 2.5, 0.5), got {_s}"
assert best_split(_X, _y, min_leaf=3) is None, "min_leaf=3 leaves no valid split of 4 points"
print("PASS: impurity and best split")
_t = build_tree(_X, _y, max_depth=5)
assert depth(_t) == 1 and _t["left"]["value"] == 0 and _t["right"]["value"] == 1, "A pure split needs exactly one question"
assert predict_one(_t, np.array([1.5, 9.0])) == 0 and predict_one(_t, np.array([3.5, 0.0])) == 1
_rng = np.random.default_rng(0)
_Xn = _rng.normal(size=(300, 2)); _yn = ((_Xn[:, 0] + _Xn[:, 1] > 0) ^ (_rng.random(300) < 0.15)).astype(int)
_full = build_tree(_Xn[:200], _yn[:200], max_depth=50)
assert np.all((predict(_full, _Xn[:200]) >= 0.5) == _yn[:200]), "An unrestricted tree must fit every distinct training point"
assert depth(build_tree(_Xn[:200], _yn[:200], max_depth=3)) <= 3, "max_depth must be respected"
_shallow = build_tree(_Xn[:200], _yn[:200], max_depth=3, min_leaf=5)
_acc = lambda t: np.mean((predict(t, _Xn[200:]) >= 0.5) == _yn[200:])
assert _acc(_shallow) >= _acc(_full), "On noisy data the constrained tree should generalize at least as well"
print(f"PASS: unrestricted tree memorizes (held-out {_acc(_full):.0%}); depth-3 tree generalizes ({_acc(_shallow):.0%})")
`,
}
