// Lab 10 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Each lesson writes the computation as an explicit loop first, then the NumPy form, then (where a
// library does it) checks scikit-learn against the hand version on the same tiny case.

const KNN = `import numpy as np

def knn_predict(X_train, y_train, X_query, k):
    """Class-1 vote share for each query row: the mean label of its k nearest training rows."""
    # (m, 1, d) − (1, n, d) → (m, n, d): every query against every training row, by broadcasting
    d = np.sqrt(((X_query[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2))
    nearest = np.argsort(d, axis=1, kind="stable")[:, :k]      # indices of the k closest, per query
    return y_train[nearest].mean(axis=1)`

const MOONS = `from sklearn.datasets import make_moons
X, y = make_moons(n_samples=400, noise=0.3, random_state=0)   # two interleaved classes, noisy
X_train, y_train, X_val, y_val = X[:300], y[:300], X[300:], y[300:]
print("train", X_train.shape, "  validation", X_val.shape)`

export const extras = {
  'l10-idea': {
    formulaTex: '$$N_k(x) = \\text{the } k \\text{ indices } i \\text{ with the smallest } d(x, x_i)$$ $$\\hat y(x) = \\frac{1}{k}\\sum_{i \\in N_k(x)} y_i$$ $$\\text{class: predict 1 when } \\hat y(x) > \\tfrac12$$',
    mathCode: {
      rows: [
        ['$d(x, x_i)$', 'dist = abs(sizes - query)', 'One distance per stored example (one feature here, so the absolute difference).'],
        ['$N_k(x)$', 'nearest = np.argsort(dist)[:k]', 'Sort the distances and keep the first k indices.'],
        ['$\\frac1k\\sum_{i \\in N_k(x)} y_i$', 'times[nearest].mean()', 'Regression: the mean target of the neighbours.'],
        ['$\\hat y(x) > \\tfrac12$', 'labels[nearest].mean() > 0.5', 'Classification: the class-1 share of the votes, compared with one half.'],
      ],
    },
    notebook: {
      title: 'Lab 10.1 · Predict from the nearest examples',
      intro: 'Predict the lesson’s 42 MB build from its five most similar past builds, then classify by vote, and see that “training” only stores the data.',
      cells: [{
        title: 'Five nearest builds, by hand',
        prose: 'Ten past builds: size in MB and minutes taken. **Predict** which five are nearest to 42 MB before you run.',
        code: `import numpy as np
sizes = np.array([10., 18, 25, 33, 38, 45, 47, 60, 72, 90])      # MB
times = np.array([2.1, 3.0, 3.9, 5.2, 5.6, 6.4, 6.9, 8.8, 10.1, 13.0])  # minutes
query, k = 42.0, 5

dist = np.abs(sizes - query)                  # one distance per stored build
nearest = np.argsort(dist)[:k]                # indices of the k smallest distances
for i in nearest:
    print(f"build {i}: {sizes[i]:4.0f} MB, {times[i]} min, distance {dist[i]:.0f}")
print("prediction: mean of their times =", times[nearest].mean(), "minutes")`,
        tryThis: 'Set k = 1 and then k = 10. What does each prediction become, and which one ignores the query entirely?',
      }, {
        title: 'Classify by a vote',
        prose: 'Ten labelled points in two dimensions. The class-1 share of the k nearest labels is both the vote and an estimated probability. **Predict** the vote for the query at (2, 2) with k = 5.',
        code: `X = np.array([[1, 1], [1.5, 2], [2, 2.5], [2.5, 1.5], [3, 3], [0.5, 3], [4, 1], [3.5, 3.5], [1, 4], [4, 4]])
labels = np.array([1, 1, 0, 1, 0, 0, 1, 0, 0, 1])
q, k = np.array([2.0, 2.0]), 5
dist = np.sqrt(((X - q) ** 2).sum(axis=1))     # Euclidean distance to every row
nearest = np.argsort(dist, kind="stable")[:k]
print("neighbour labels:", labels[nearest], "  distances:", np.round(dist[nearest], 2))
share = labels[nearest].mean()
print("class-1 share:", share, " → predict class", int(share > 0.5))`,
      }, {
        title: '“Training” is storing',
        prose: 'A k-NN model’s fit step copies the data; all the work happens per prediction. **Predict** how many distances one prediction computes for 50,000 stored rows.',
        code: `class KNN:
    def fit(self, X, y):
        self.X, self.y = X, y              # that is the whole training step
        return self
    def predict_share(self, q, k):
        dist = np.sqrt(((self.X - q) ** 2).sum(axis=1))
        self.distances_computed = len(dist)
        return self.y[np.argsort(dist, kind="stable")[:k]].mean()

rng = np.random.default_rng(0)
big = KNN().fit(rng.random((50_000, 2)), rng.integers(0, 2, 50_000))
print("vote:", big.predict_share(np.array([0.5, 0.5]), 5), "  distances computed:", big.distances_computed)`,
      }],
    },
  },
  'l10-distance': {
    formulaTex: '$$d_2(a, b) = \\sqrt{\\sum_j (a_j - b_j)^2}$$ $$d_1(a, b) = \\sum_j |a_j - b_j|$$ $$z_j = \\frac{x_j - m_j}{s_j}$$',
    mathCode: {
      rows: [
        ['$\\sum_j (a_j - b_j)^2$', 'total += (a[j] - b[j]) ** 2', 'A loop over features j, adding each squared difference.'],
        ['$d_2(a, b)$', 'np.sqrt(((a - b) ** 2).sum())', 'The same, vectorized; also np.linalg.norm(a - b).'],
        ['$d_1(a, b)$', 'np.abs(a - b).sum()', 'Manhattan: absolute differences added.'],
        ['$m_j, s_j$', 'm, s = X_train.mean(axis=0), X_train.std(axis=0)', 'Per-feature statistics, computed on training rows only.'],
        ['$z_j = \\frac{x_j - m_j}{s_j}$', '(x - m) / s', 'Standardized features: one standard deviation counts the same everywhere. m and s come from the training rows only.'],
      ],
    },
    notebook: {
      title: 'Lab 10.2 · Distances and scaling',
      intro: 'Compute the lesson’s two distances as loops and vectorized, watch a change of units change who the nearest neighbour is, and fix it with training-only standardization.',
      cells: [{
        title: 'Euclidean and Manhattan, loop then vector',
        prose: 'Between (1, 2) and (4, 6). **Predict** both numbers.',
        code: `import numpy as np
a, b = np.array([1.0, 2.0]), np.array([4.0, 6.0])
total = 0.0
for j in range(len(a)):                  # Σ over features
    total += (a[j] - b[j]) ** 2
print("Euclidean, loop:", np.sqrt(total), "  vectorized:", np.sqrt(((a - b) ** 2).sum()), "  norm:", np.linalg.norm(a - b))
print("Manhattan:", np.abs(a - b).sum())`,
      }, {
        title: 'Units decide who is nearest',
        prose: 'Three stored machines: CPU load (a fraction) and memory. Memory is first recorded in GB, then in MB. **Predict** whether the nearest machine to the query changes.',
        code: `load = np.array([0.20, 0.85, 0.25])
mem_gb = np.array([4.0, 4.1, 6.0])
query_gb = np.array([0.22, 4.2])            # low load, 4.2 GB
names = ["A (like the query)", "B (busy)", "C (more memory)"]
for unit, factor in [("GB", 1), ("MB", 1000)]:
    X = np.column_stack([load, mem_gb * factor])
    q = np.array([query_gb[0], query_gb[1] * factor])
    d = np.sqrt(((X - q) ** 2).sum(axis=1))
    print(f"memory in {unit}: distances {np.round(d, 3)} → nearest is {names[np.argmin(d)]}")`,
        tryThis: 'Record load as a percentage (× 100) instead, keeping memory in GB. Which machine is nearest now, and which feature dominates?',
      }, {
        title: 'Standardize with training statistics',
        prose: 'Subtract each feature’s mean and divide by its standard deviation, so a standard deviation counts the same in both. The statistics come from the stored rows only and are applied unchanged to the query. **Predict** whether the unit still matters.',
        code: `def nearest_standardized(X, q):
    m, s = X.mean(axis=0), X.std(axis=0)             # training rows only
    Z, zq = (X - m) / s, (q - m) / s                  # the same transformation for the query
    return np.sqrt(((Z - zq) ** 2).sum(axis=1))

for unit, factor in [("GB", 1), ("MB", 1000)]:
    X = np.column_stack([load, mem_gb * factor])
    q = np.array([query_gb[0], query_gb[1] * factor])
    d = nearest_standardized(X, q)
    print(f"memory in {unit}, standardized: distances {np.round(d, 3)} → nearest is {names[np.argmin(d)]}")`,
      }],
    },
  },
  'l10-k': {
    formulaTex: '$$\\hat p_k(x) = \\frac1k\\sum_{i \\in N_k(x)} y_i$$ $$\\hat p_w(x) = \\frac{\\sum_{i \\in N_k} w_i y_i}{\\sum_{i \\in N_k} w_i}, \\quad w_i = \\frac{1}{d(x, x_i)}$$ $$k^* = \\arg\\max_k \\operatorname{acc}_{\\text{val}}(k)$$',
    mathCode: {
      rows: [
        ['$d(x_q, x_i)$ for all $q, i$', 'np.sqrt(((X_query[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2))', 'Broadcasting: an (m, n) table of distances in one expression.'],
        ['$N_k(x_q)$', 'np.argsort(d, axis=1)[:, :k]', 'The k nearest training indices for every query row.'],
        ['$\\hat p_k(x_q)$', 'y_train[nearest].mean(axis=1)', 'Class-1 share per query.'],
        ['$w_i = 1/d(x, x_i)$', 'w = 1 / d_near', 'Distance weights: closer neighbours count more.'],
        ['$k^* = \\arg\\max_k \\operatorname{acc}_{\\text{val}}(k)$', 'max(ks, key=lambda k: val_acc[k])', 'The best k on validation data, never on test data.'],
      ],
    },
    notebook: {
      title: 'Lab 10.3 · Choosing k',
      intro: 'Vectorize k-NN, see why training accuracy at k = 1 means nothing, trace a validation curve, handle ties and distance weighting, and check the result against scikit-learn.',
      cells: [{
        title: 'Vectorized k-NN, and the k = 1 illusion',
        prose: 'The data: two interleaved noisy classes. **Predict** the training accuracy at k = 1.',
        code: `${KNN}

${MOONS}
train_acc = ((knn_predict(X_train, y_train, X_train, 1) > 0.5) == y_train).mean()
print("training accuracy at k = 1:", train_acc, " — each point is its own nearest neighbour")`,
      }, {
        title: 'Training and validation accuracy against k',
        prose: '**Predict** the shape of each column as k grows from 1 to 299.',
        code: `ks = [1, 3, 5, 9, 15, 31, 61, 121, 299]
val_acc = {}
for k in ks:
    tr = ((knn_predict(X_train, y_train, X_train, k) > 0.5) == y_train).mean()
    va = ((knn_predict(X_train, y_train, X_val, k) > 0.5) == y_val).mean()
    val_acc[k] = va
    print(f"k = {k:3d}:  train {tr:.3f}   validation {va:.3f}")
best = max(ks, key=lambda k: val_acc[k])
print("best k on validation:", best, "   majority-class rate:", round(max(y_val.mean(), 1 - y_val.mean()), 3))`,
        tryThis: 'Change noise=0.3 to noise=0.1 in the data cell and rerun both cells. Does the best k go up or down, and why?',
      }, {
        title: 'Ties and distance weighting',
        prose: 'With k = 4 the vote can split 2–2. **Predict** the unweighted share and whether weighting breaks the tie.',
        code: `d_near = np.array([0.5, 1.0, 1.2, 2.0])      # distances of the 4 nearest, closest first
y_near = np.array([0,   1,   1,   0])
print("unweighted share:", y_near.mean(), "  (a tie: 0.5 is not > 0.5, so class 0 wins by the rule)")
w = 1 / d_near                                 # closer neighbours count more
print("weights:", np.round(w, 3), "  weighted share:", round((w * y_near).sum() / w.sum(), 3))`,
      }, {
        title: 'The library version',
        prose: 'scikit-learn’s `KNeighborsClassifier` does the same computation. With an odd k and no tied distances, its probabilities should equal ours exactly.',
        code: `from sklearn.neighbors import KNeighborsClassifier
k = 15
lib = KNeighborsClassifier(n_neighbors=k).fit(X_train, y_train)
ours = knn_predict(X_train, y_train, X_val, k)
theirs = lib.predict_proba(X_val)[:, 1]
print("largest difference in class-1 share:", np.abs(ours - theirs).max())
print("validation accuracy, scikit-learn:", lib.score(X_val, y_val))`,
      }],
    },
  },
  'l10-curse': {
    formulaTex: '$$\\ell_d = f^{1/d}$$ $$\\frac{\\max_i d(x, x_i)}{\\min_i d(x, x_i)} \\to 1 \\text{ as } d \\to \\infty$$',
    mathCode: {
      rows: [
        ['$\\ell_d = f^{1/d}$', 'f ** (1 / d)', 'The side length of a cube holding a fraction f of uniform data in d dimensions, as a share of each feature’s range.'],
        ['$\\max_i d / \\min_i d$', 'dist.max() / dist.min()', 'How much farther the farthest point is than the nearest.'],
        ['$d$ noise features', 'rng.random((n, m))', 'Features with no relation to the label, appended to the useful ones.'],
      ],
    },
    notebook: {
      title: 'Lab 10.4 · The curse of dimensionality',
      intro: 'Measure distance concentration, compute how wide a “local” neighbourhood must be, and watch irrelevant features wreck k-NN.',
      cells: [{
        title: 'Distances concentrate',
        prose: '400 uniform points and one query. **Predict** the farthest/nearest ratio in 300 dimensions.',
        code: `import numpy as np
rng = np.random.default_rng(1)
for d in [1, 2, 10, 100, 300]:
    pts, q = rng.random((400, d)), rng.random(d)
    dist = np.sqrt(((pts - q) ** 2).sum(axis=1))
    print(f"d = {d:3d}: nearest {dist.min():.3f}   farthest {dist.max():.3f}   ratio {dist.max() / dist.min():8.2f}")`,
      }, {
        title: 'How wide is “local”?',
        prose: 'The side of a cube that holds 10% of uniform data. **Predict** it in 10 dimensions.',
        code: `for d in [1, 2, 3, 10, 100]:
    print(f"d = {d:3d}: side = 0.1 ** (1/{d}) = {0.1 ** (1 / d):.3f} of each feature's range")`,
      }, {
        title: 'Irrelevant features drown the useful ones',
        prose: 'Two useful features (the noisy moons) plus m features of pure noise, with the same scale. **Predict** the validation accuracy of 15-NN with 50 noise features.',
        code: `from sklearn.datasets import make_moons
from sklearn.neighbors import KNeighborsClassifier
X, y = make_moons(n_samples=600, noise=0.3, random_state=0)
X = (X - X.mean(0)) / X.std(0)                         # the useful features, standardized
for m in [0, 2, 10, 50]:
    noise = np.random.default_rng(2).normal(size=(len(X), m))
    Xm = np.hstack([X, noise])
    acc = KNeighborsClassifier(15).fit(Xm[:400], y[:400]).score(Xm[400:], y[400:])
    print(f"{m:2d} noise features: validation accuracy {acc:.3f}")`,
      }],
    },
  },
  'l10-practice': {
    formulaTex: '$$\\text{work per query} \\propto n \\cdot d$$',
    mathCode: {
      rows: [
        ['$n \\cdot d$', 'X_train.shape[0] * X_train.shape[1]', 'Feature differences computed for one query.'],
        ['group split', 'GroupShuffleSplit(...).split(X, y, groups)', 'Keeps all rows of one item on the same side of the split.'],
        ['baseline', 'DummyClassifier(strategy="most_frequent")', 'The accuracy of always predicting the most common class.'],
      ],
    },
    notebook: {
      title: 'Lab 10.5 · k-NN in practice',
      intro: 'Inspect the neighbours behind a prediction, catch near-duplicate leakage with a group split, and compare k-NN with simple baselines on the same folds.',
      cells: [{
        title: 'The rows behind one prediction',
        prose: 'k-NN can show exactly which stored rows produced a prediction. **Predict** whether all seven neighbours share the predicted label.',
        code: `import numpy as np
import pandas as pd
from sklearn.datasets import make_moons
X, y = make_moons(n_samples=300, noise=0.3, random_state=0)
q = np.array([0.5, 0.25])
d = np.sqrt(((X - q) ** 2).sum(axis=1))
nearest = np.argsort(d, kind="stable")[:7]
table = pd.DataFrame({"row": nearest, "x1": X[nearest, 0].round(2), "x2": X[nearest, 1].round(2), "label": y[nearest], "distance": d[nearest].round(3)})
print(table.to_string(index=False))
print("class-1 share:", y[nearest].mean().round(3))`,
      }, {
        title: 'Near-duplicates across a split',
        prose: '100 items, each recorded three times with tiny noise. The labels are random per item, so there is **nothing to learn**: honest accuracy is about 50%. **Predict** what 1-NN scores with a random split and with a group split.',
        code: `from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split, GroupShuffleSplit
rng = np.random.default_rng(0)
items = rng.normal(size=(100, 5)); item_label = rng.integers(0, 2, 100)
X = np.repeat(items, 3, axis=0) + rng.normal(scale=0.01, size=(300, 5))
y = np.repeat(item_label, 3); groups = np.repeat(np.arange(100), 3)

Xa, Xb, ya, yb = train_test_split(X, y, test_size=0.3, random_state=0)
print(f"random split: {KNeighborsClassifier(1).fit(Xa, ya).score(Xb, yb):.3f}")
tr, te = next(GroupShuffleSplit(test_size=0.3, random_state=0).split(X, y, groups))
print(f"group split:  {KNeighborsClassifier(1).fit(X[tr], y[tr]).score(X[te], y[te]):.3f}")`,
        tryThis: 'Raise the recording noise from 0.01 to 3.0. What happens to the random-split score, and why?',
      }, {
        title: 'Compare with baselines on the same folds',
        prose: 'Five-fold cross-validation for k-NN, logistic regression and “always the most common class”.',
        code: `from sklearn.model_selection import cross_val_score, KFold
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
X, y = make_moons(n_samples=400, noise=0.3, random_state=0)
folds = KFold(5, shuffle=True, random_state=0)
for name, model in [("most common class", DummyClassifier(strategy="most_frequent")), ("logistic regression", LogisticRegression()), ("15-NN", KNeighborsClassifier(15))]:
    s = cross_val_score(model, X, y, cv=folds)
    print(f"{name:20s} mean {s.mean():.3f}   folds {np.round(s, 2)}")`,
      }],
    },
  },
}
