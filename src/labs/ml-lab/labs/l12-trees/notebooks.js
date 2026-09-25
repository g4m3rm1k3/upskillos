// Lab 12 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The tree is built from scratch across Lessons 12.2–12.3 (impurity → gain → threshold scan →
// best split → recursive growth), then compared with scikit-learn's DecisionTreeClassifier.

const IMPURITY = `import numpy as np

def gini(y):
    """2p(1 − p) for 0/1 labels: the chance two random members of the node disagree."""
    if len(y) == 0: return 0.0
    p = np.mean(y)
    return 2 * p * (1 - p)

def entropy(y):
    if len(y) == 0: return 0.0
    p = np.mean(y)
    return 0.0 - sum(q * np.log2(q) for q in (p, 1 - p) if q > 0)      # 0.0 − …: a pure node prints 0, not −0

def weighted(left, right, impurity=gini):
    n = len(left) + len(right)
    return (len(left) * impurity(left) + len(right) * impurity(right)) / n

def gain(parent, left, right, impurity=gini):
    return impurity(parent) - weighted(left, right, impurity)`

const GROW = `def scan(x, y):
    """Every midpoint between consecutive distinct values of one feature, with its weighted Gini."""
    order = np.argsort(x, kind="stable")
    xs, ys = x[order], y[order]
    out = []
    for i in range(1, len(xs)):
        if xs[i] == xs[i - 1]:
            continue                                   # no threshold fits between equal values
        t = (xs[i - 1] + xs[i]) / 2
        out.append((t, weighted(ys[:i], ys[i:])))
    return out

def best_split(X, y, min_leaf=1):
    best = None                                        # (gain, feature, threshold)
    for j in range(X.shape[1]):
        for t, w in scan(X[:, j], y):
            n_left = np.sum(X[:, j] <= t)
            if n_left < min_leaf or len(y) - n_left < min_leaf:
                continue
            g = gini(y) - w
            if best is None or g > best[0]:
                best = (g, j, t)
    return best

def grow(X, y, depth=0, max_depth=3, min_leaf=1):
    """A node is a dict: a leaf holds the class-1 share; an internal node holds a question and two children."""
    split = None if depth == max_depth or gini(y) == 0 else best_split(X, y, min_leaf)
    if split is None or split[0] <= 1e-12:
        return {"leaf": float(np.mean(y)), "n": len(y)}
    g, j, t = split
    go_left = X[:, j] <= t
    return {"feature": j, "threshold": float(t), "gain": float(g), "n": len(y),
            "left": grow(X[go_left], y[go_left], depth + 1, max_depth, min_leaf),
            "right": grow(X[~go_left], y[~go_left], depth + 1, max_depth, min_leaf)}

def predict_one(node, x):
    while "leaf" not in node:
        node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
    return node["leaf"]

def show(node, indent=""):
    if "leaf" in node:
        print(f"{indent}leaf: class-1 share {node['leaf']:.2f} ({node['n']} points)")
    else:
        print(f"{indent}x{node['feature'] + 1} <= {node['threshold']:.3f}?  (gain {node['gain']:.3f}, {node['n']} points)")
        show(node["left"], indent + "  yes: "); show(node["right"], indent + "  no:  ")`

const MOONS = `from sklearn.datasets import make_moons
X, y = make_moons(n_samples=400, noise=0.3, random_state=1)
X_train, y_train, X_val, y_val = X[:300], y[:300], X[300:], y[300:]`

export const extras = {
  'l12-questions': {
    formulaTex: '$$\\text{node: } x_j \\le t \\ ? \\ \\text{left} : \\text{right}$$ $$\\hat y(x) = \\text{value of the leaf } x \\text{ reaches}$$',
    mathCode: {
      rows: [
        ['$x_j \\le t$', 'x[node["feature"]] <= node["threshold"]', 'One question: one feature against one threshold.'],
        ['path to a leaf', 'while "leaf" not in node: node = node["left"] if ... else node["right"]', 'Answer questions until a leaf is reached.'],
        ['leaf value', 'node["leaf"]', 'Classification: the class-1 share of the training points that reached it.'],
      ],
    },
    notebook: {
      title: 'Lab 12.1 · A model made of questions',
      intro: 'Write the lesson’s triage questions as a tree and follow a build down it, then let scikit-learn learn a depth-2 tree and read its rules and a prediction path.',
      cells: [{
        title: 'A hand-written triage tree',
        prose: 'The engineer’s questions as nested dictionaries. **Predict** the leaf for a build that timed out on a shared runner.',
        code: `triage = {"question": "tests timed out?",
          "yes": {"question": "runner shared?", "yes": "noisy neighbour: retry on a dedicated runner",
                                                  "no": "real slowdown: bisect recent commits"},
          "no":  {"question": "dependency cache missed?", "yes": "cold cache: warm it and retry",
                                                           "no": "read the test failure"}}
def follow(node, answers):
    while isinstance(node, dict):
        a = answers[node["question"]]
        print(f"{node['question']} {a}")
        node = node[a]
    return node
print("→", follow(triage, {"tests timed out?": "yes", "runner shared?": "yes"}))`,
      }, {
        title: 'A learned tree, its rules and one path',
        prose: 'A depth-2 tree learned from noisy two-class data. **Predict** the largest number of leaves it can have.',
        code: `import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
${MOONS}
tree = DecisionTreeClassifier(max_depth=2, random_state=0).fit(X_train, y_train)
print(export_text(tree, feature_names=["x1", "x2"]))
q = np.array([[0.2, 0.1]])
nodes = tree.decision_path(q).indices                 # the nodes this point visits, root first
print("path through nodes", list(nodes), "→ class-1 share", tree.predict_proba(q)[0, 1].round(3))
print("leaves:", tree.get_n_leaves())`,
        tryThis: 'Change the query to (1.5, −0.4). Which questions does its path answer differently?',
      }],
    },
  },
  'l12-impurity': {
    formulaTex: '$$G(p) = 2p(1 - p)$$ $$H(p) = -p\\log_2 p - (1 - p)\\log_2(1 - p)$$ $$I_{\\text{split}} = \\frac{n_L I_L + n_R I_R}{n}$$ $$\\text{gain} = I_{\\text{parent}} - I_{\\text{split}}$$',
    mathCode: {
      rows: [
        ['$p$', 'np.mean(y)', 'The class-1 share of the node.'],
        ['$G(p) = 2p(1 - p)$', '2 * p * (1 - p)', 'Gini: 0 when pure, 0.5 for an even mix.'],
        ['$H(p)$', '-sum(q * np.log2(q) for q in (p, 1 - p) if q > 0)', 'Entropy in bits; a term with q = 0 contributes 0.'],
        ['$\\frac{n_L I_L + n_R I_R}{n}$', '(len(left) * gini(left) + len(right) * gini(right)) / n', 'Children’s impurity, weighted by how many points each receives.'],
        ['gain', 'gini(parent) - weighted(left, right)', 'How much the split reduces impurity.'],
      ],
    },
    notebook: {
      title: 'Lab 12.2 · Impurity and gain',
      intro: 'Write Gini, entropy, weighted impurity and gain as functions, check them on the lesson’s nodes, and see why the weighting matters.',
      cells: [{
        title: 'Gini and entropy',
        prose: '**Predict** both measures for [0, 0, 1, 1] and for [0, 1, 1, 1].',
        code: `${IMPURITY}
for labels in [[0, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]]:
    y = np.array(labels)
    print(f"{labels}: p = {y.mean():.2f}   Gini {gini(y):.3f}   entropy {entropy(y):.3f} bits")`,
      }, {
        title: 'Gain, and why children are weighted',
        prose: 'Ten points, five of each class. Split A isolates one point in a pure leaf; split B cuts the group roughly in half. **Predict** which has the larger gain.',
        code: `parent = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
print("lesson example: [0,0,1,1] → [0,0] | [1,1]  gain", gain(np.array([0, 0, 1, 1]), np.array([0, 0]), np.array([1, 1])))
A = (np.array([0]), np.array([0, 0, 0, 0, 1, 1, 1, 1, 1]))
B = (np.array([0, 0, 0, 0, 1]), np.array([0, 1, 1, 1, 1]))
for name, (l, r) in [("A: isolate one point", A), ("B: split in half   ", B)]:
    unweighted = (gini(l) + gini(r)) / 2
    print(f"{name}  plain average of children {unweighted:.3f}   weighted {weighted(l, r):.3f}   gain {gain(parent, l, r):.3f}")`,
        tryThis: 'Compute the gains with entropy instead (pass impurity=entropy). Does the ranking of A and B change?',
      }],
    },
  },
  'l12-greedy': {
    formulaTex: '$$t \\in \\Big\\{\\tfrac{x_{(i)} + x_{(i+1)}}{2}\\Big\\}$$ $$(j^*, t^*) = \\arg\\max_{j, t} \\text{gain}(j, t)$$ $$\\text{grow}(L) \\text{ on } x_{j^*} \\le t^*, \\quad \\text{grow}(R) \\text{ on } x_{j^*} > t^*$$',
    mathCode: {
      rows: [
        ['$x_{(i)}$', 'xs = x[np.argsort(x)]', 'The feature’s values in sorted order.'],
        ['$\\tfrac{x_{(i)} + x_{(i+1)}}{2}$', 't = (xs[i - 1] + xs[i]) / 2', 'Candidate thresholds: midpoints between consecutive distinct values.'],
        ['$\\arg\\max_{j, t}$', 'for j in range(X.shape[1]): for t, w in scan(X[:, j], y): ...', 'Try every feature and every candidate; keep the largest gain.'],
        ['grow(L), grow(R)', 'grow(X[go_left], y[go_left], depth + 1)', 'Recursion: each side is a smaller copy of the same problem.'],
        ['stop', 'depth == max_depth or gini(y) == 0', 'Stopping rules turn a node into a leaf.'],
      ],
    },
    notebook: {
      title: 'Lab 12.3 · Growing a tree greedily',
      intro: 'Scan every threshold on one feature, choose the best split over all features, grow a tree recursively, check it against scikit-learn, and see greedy growth stall on XOR.',
      cells: [{
        title: 'Scan one feature',
        prose: 'Eight points on one feature. **Predict** how many candidate thresholds there are and where the best one lies.',
        code: `${IMPURITY}
${GROW}
x = np.array([1.0, 2.0, 2.0, 3.0, 5.0, 6.0, 7.0, 8.0])
y = np.array([0,   0,   0,   1,   0,   1,   1,   1])
for t, w in scan(x, y):
    print(f"threshold {t:4.1f}: weighted Gini {w:.3f}   gain {gini(y) - w:.3f}")`,
      }, {
        title: 'Grow a whole tree',
        prose: 'The recursive `grow` from the cell above, on noisy two-class data, depth 2. **Predict** which feature the root asks about.',
        code: `${MOONS}
ours = grow(X_train, y_train, max_depth=2)
show(ours)
acc = np.mean([(predict_one(ours, x) >= 0.5) == t for x, t in zip(X_val, y_val)])
print("validation accuracy:", round(acc, 3))`,
        tryThis: 'Grow with max_depth=6 and min_leaf=1. How many leaves hold a single point, and what happens to validation accuracy?',
      }, {
        title: 'The library version',
        prose: 'scikit-learn’s tree with the same depth and Gini. Where two splits tie exactly, the two implementations may choose differently; otherwise the questions should match.',
        code: `from sklearn.tree import DecisionTreeClassifier
lib = DecisionTreeClassifier(max_depth=2, criterion="gini", random_state=0).fit(X_train, y_train)
print("root, ours:        x%d <= %.4f" % (ours["feature"] + 1, ours["threshold"]))
print("root, scikit-learn: x%d <= %.4f" % (lib.tree_.feature[0] + 1, lib.tree_.threshold[0]))
same = np.mean([(predict_one(ours, x) >= 0.5) == p for x, p in zip(X_val, lib.predict(X_val))])
print("validation predictions that agree:", same)`,
      }, {
        title: 'Greedy growth on XOR',
        prose: 'Class 1 when exactly one feature is positive. **Predict** the best gain available at the root.',
        code: `rng = np.random.default_rng(0)
Xx = rng.uniform(-1, 1, (400, 2))
yx = ((Xx[:, 0] > 0) != (Xx[:, 1] > 0)).astype(int)
g, j, t = best_split(Xx, yx)
print(f"best root split: x{j + 1} <= {t:.3f}, gain {g:.4f}  (the parent's Gini is {gini(yx):.3f})")
deeper = grow(Xx, yx, max_depth=2)
acc = np.mean([(predict_one(deeper, x) >= 0.5) == t for x, t in zip(Xx, yx)])
print("depth-2 training accuracy:", round(acc, 3))`,
      }],
    },
  },
  'l12-overfit': {
    formulaTex: '$$R_\\alpha(T) = \\sum_{\\ell \\in \\text{leaves}(T)} \\text{error}(\\ell) + \\alpha\\,|\\text{leaves}(T)|$$',
    mathCode: {
      rows: [
        ['depth', 'DecisionTreeClassifier(max_depth=d)', 'The main complexity knob.'],
        ['min leaf size', 'min_samples_leaf=20', 'Pre-pruning: no leaf may hold fewer points.'],
        ['$\\alpha$ values', 'tree.cost_complexity_pruning_path(X, y).ccp_alphas', 'The α at which each branch stops paying for itself.'],
        ['$R_\\alpha(T)$', 'DecisionTreeClassifier(ccp_alpha=a)', 'Post-pruning: the tree that minimizes error + α × leaves.'],
      ],
    },
    notebook: {
      title: 'Lab 12.4 · Overfitting and pruning',
      intro: 'Trace training and validation accuracy against depth, prune by minimum leaf size and by cost complexity chosen with cross-validation, and watch the root split change when the data change a little.',
      cells: [{
        title: 'Accuracy against depth',
        prose: '**Predict** the training accuracy of an unlimited tree.',
        code: `import numpy as np
from sklearn.tree import DecisionTreeClassifier
${MOONS}
for d in [1, 2, 3, 4, 6, 8, 12, None]:
    t = DecisionTreeClassifier(max_depth=d, random_state=0).fit(X_train, y_train)
    print(f"depth {str(d):4s}: train {t.score(X_train, y_train):.3f}   validation {t.score(X_val, y_val):.3f}   leaves {t.get_n_leaves()}")`,
      }, {
        title: 'Pre-pruning and cost-complexity pruning',
        prose: 'A minimum leaf size, then α chosen by 5-fold cross-validation on the training data only.',
        code: `from sklearn.model_selection import cross_val_score
t = DecisionTreeClassifier(min_samples_leaf=20, random_state=0).fit(X_train, y_train)
print(f"min_samples_leaf=20: validation {t.score(X_val, y_val):.3f}, leaves {t.get_n_leaves()}")
alphas = DecisionTreeClassifier(random_state=0).cost_complexity_pruning_path(X_train, y_train).ccp_alphas
cv = [(a, cross_val_score(DecisionTreeClassifier(ccp_alpha=a, random_state=0), X_train, y_train, cv=5).mean()) for a in alphas[::3]]
a_best = max(cv, key=lambda c: c[1])[0]
t = DecisionTreeClassifier(ccp_alpha=a_best, random_state=0).fit(X_train, y_train)
print(f"ccp_alpha={a_best:.4f} (best of {len(cv)} tried by CV): validation {t.score(X_val, y_val):.3f}, leaves {t.get_n_leaves()}")`,
      }, {
        title: 'Instability',
        prose: 'Refit a depth-3 tree on five random 90% subsamples. **Predict** whether the root question stays the same.',
        code: `rng = np.random.default_rng(3)
for s in range(5):
    rows = rng.choice(len(X_train), int(0.9 * len(X_train)), replace=False)
    t = DecisionTreeClassifier(max_depth=3, random_state=0).fit(X_train[rows], y_train[rows])
    print(f"subsample {s}: root x{t.tree_.feature[0] + 1} <= {t.tree_.threshold[0]:.3f}   second-level: x{t.tree_.feature[1] + 1} <= {t.tree_.threshold[1]:.3f}")`,
        tryThis: 'Use 60% subsamples instead of 90%. How much more do the questions move?',
      }],
    },
  },
  'l12-regression': {
    formulaTex: '$$I(\\text{node}) = \\frac{1}{n}\\sum_{i \\in \\text{node}} (y_i - \\bar y)^2$$ $$\\hat y_{\\text{leaf}} = \\bar y_{\\text{leaf}}$$ $$\\text{importance}_j = \\text{score} - \\text{score with } x_j \\text{ shuffled}$$',
    mathCode: {
      rows: [
        ['$\\bar y$', 'np.mean(y)', 'The leaf’s prediction: the mean target of its points.'],
        ['$\\frac1n\\sum (y_i - \\bar y)^2$', 'np.mean((y - y.mean()) ** 2)', 'Variance: the impurity for regression.'],
        ['impurity importance', 'tree.feature_importances_', 'Summed impurity reductions per feature, on training data: favours features with many thresholds.'],
        ['permutation importance', 'permutation_importance(model, X_val, y_val)', 'Drop in validation score when one feature is shuffled.'],
      ],
    },
    notebook: {
      title: 'Lab 12.5 · Regression trees',
      intro: 'Use variance as impurity, see the step function a regression tree predicts and its flat extrapolation, and compare two ways of measuring feature importance.',
      cells: [{
        title: 'Variance as impurity',
        prose: 'The leaf from the lesson, then the best split on a small one-feature set. **Predict** the leaf’s prediction and its variance.',
        code: `import numpy as np
leaf = np.array([3.0, 5, 5, 11])
print("prediction", leaf.mean(), "  variance", np.mean((leaf - leaf.mean()) ** 2))
x = np.array([1., 2, 3, 4, 5, 6])
y = np.array([2., 2.5, 2.2, 7, 7.4, 6.8])
var = lambda v: np.mean((v - v.mean()) ** 2) if len(v) else 0.0
for i in range(1, 6):
    t = (x[i - 1] + x[i]) / 2
    w = (i * var(y[:i]) + (6 - i) * var(y[i:])) / 6
    print(f"threshold {t}: weighted variance {w:.3f}")`,
      }, {
        title: 'A step function that cannot extrapolate',
        prose: 'Trained on x between 0 and 6 where y rises steadily. **Predict** the tree’s prediction at x = 10.',
        code: `from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
rng = np.random.default_rng(0)
xs = np.sort(rng.uniform(0, 6, 80)); ys = 1.5 * xs + rng.normal(0, 0.5, 80)
tree = DecisionTreeRegressor(max_depth=3).fit(xs[:, None], ys)
line = LinearRegression().fit(xs[:, None], ys)
for q in [2.0, 5.9, 8.0, 10.0]:
    print(f"x = {q:4}: tree {tree.predict([[q]])[0]:6.2f}   line {line.predict([[q]])[0]:6.2f}   true trend {1.5 * q:5.2f}")`,
      }, {
        title: 'Two importance measures',
        prose: 'Three columns: a continuous feature that matters, a yes/no feature that also matters, and a random ID with a different value on every row. The targets are noisy. **Predict** which measure ranks the ID above the yes/no feature.',
        code: `from sklearn.inspection import permutation_importance
rng = np.random.default_rng(0)                    # its own seed: the result does not depend on earlier cells
n = 600
X = np.column_stack([rng.normal(size=n), rng.integers(0, 2, n), rng.permutation(n)])   # x1, yes/no x2, random ID
y = X[:, 0] + X[:, 1] + rng.normal(0, 2.0, n)                                           # both matter; the ID does not
tr, va = slice(0, 400), slice(400, None)
deep = DecisionTreeRegressor(random_state=0).fit(X[tr], y[tr])       # unlimited depth: overfits
perm = permutation_importance(deep, X[va], y[va], n_repeats=10, random_state=0)
for j, name in enumerate(["x1", "x2 (yes/no)", "ID"]):
    print(f"{name:11s} impurity importance {deep.feature_importances_[j]:.3f}   permutation importance {perm.importances_mean[j]:.3f}")`,
      }],
    },
  },
  'l12-practice': {
    formulaTex: '$$\\text{leaf region} = \\{x : a_1 < x_1 \\le b_1,\\ a_2 < x_2 \\le b_2\\}$$',
    mathCode: {
      rows: [
        ['leaf region', 'a1 < x[0] <= b1 and a2 < x[1] <= b2', 'Every leaf is a box with sides parallel to the axes, so a diagonal boundary needs a staircase of many boxes.'],
        ['readable tree', 'export_text(tree, max_depth=3)', 'A depth-limited tree printed as rules.'],
      ],
    },
    notebook: {
      title: 'Lab 12.6 · Trees in practice',
      intro: 'See how many leaves a diagonal boundary costs, compare with a model that can draw a diagonal, and print a tree small enough to review.',
      cells: [{
        title: 'The staircase',
        prose: 'The class boundary is the diagonal x₂ = x₁. **Predict** whether depth 8 beats logistic regression.',
        code: `import numpy as np
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
rng = np.random.default_rng(0)
X = rng.uniform(0, 1, (600, 2)); y = (X[:, 1] > X[:, 0]).astype(int)
Xtr, ytr, Xva, yva = X[:400], y[:400], X[400:], y[400:]
for d in [1, 2, 4, 8]:
    t = DecisionTreeClassifier(max_depth=d, random_state=0).fit(Xtr, ytr)
    print(f"tree depth {d}: validation {t.score(Xva, yva):.3f} with {t.get_n_leaves()} leaves")
print(f"logistic regression: validation {LogisticRegression().fit(Xtr, ytr).score(Xva, yva):.3f} with 3 numbers")`,
      }, {
        title: 'A tree someone can review',
        prose: 'A depth-3 tree printed as rules: the form in which a tree is easiest to explain and check.',
        code: `from sklearn.tree import export_text
from sklearn.datasets import make_moons
Xm, ym = make_moons(n_samples=400, noise=0.3, random_state=1)
small = DecisionTreeClassifier(max_depth=3, random_state=0).fit(Xm, ym)
print(export_text(small, feature_names=["x1", "x2"], show_weights=True))`,
      }],
    },
  },
}
