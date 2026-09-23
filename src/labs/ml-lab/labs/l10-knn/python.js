export default {
  filename: 'knn.py', packages: ['numpy'],
  title: 'Nearest neighbours, vectorized.',
  intro: 'Compute all pairwise distances with broadcasting (no Python loops over rows), find the k nearest training rows for every query, and predict by vote. Then fit a training-only standardizer and show that it rescues a badly scaled feature.',
  steps: [
    '`pairwise_distances(A, B)` → `(len(A), len(B))` Euclidean distances using broadcasting.',
    '`knn_indices(X_train, X_query, k)` → `(len(X_query), k)` indices of the nearest training rows, nearest first.',
    '`knn_predict_proba(X_train, y_train, X_query, k)` → fraction of class-1 labels among each query\'s neighbours.',
    '`knn_predict(...)` → 1 where that fraction is above 0.5, else 0.',
    '`fit_scaler(X_train)` → `(mean, std)`; `transform(X, mean, std)`.',
  ],
  hints: [
    ['Broadcasting distances', '`diff = A[:, None, :] - B[None, :, :]` has shape `(len(A), len(B), d)`. Square, sum over the last axis, square-root.'],
    ['Nearest first', '`np.argsort(D, axis=1)[:, :k]` sorts each row of the distance matrix. D here must be query-by-train.'],
    ['Voting', '`y_train[idx]` has shape `(queries, k)`; `.mean(axis=1)` gives the class-1 share.'],
  ],
  starter: `import numpy as np

def pairwise_distances(A, B):
    raise NotImplementedError

def knn_indices(X_train, X_query, k):
    raise NotImplementedError

def knn_predict_proba(X_train, y_train, X_query, k):
    raise NotImplementedError

def knn_predict(X_train, y_train, X_query, k):
    raise NotImplementedError

def fit_scaler(X_train):
    raise NotImplementedError

def transform(X, mean, std):
    raise NotImplementedError
`,
  solution: `import numpy as np

def pairwise_distances(A, B):
    diff = A[:, None, :] - B[None, :, :]
    return np.sqrt(np.sum(diff ** 2, axis=2))

def knn_indices(X_train, X_query, k):
    D = pairwise_distances(X_query, X_train)
    return np.argsort(D, axis=1, kind="stable")[:, :k]

def knn_predict_proba(X_train, y_train, X_query, k):
    return y_train[knn_indices(X_train, X_query, k)].mean(axis=1)

def knn_predict(X_train, y_train, X_query, k):
    return (knn_predict_proba(X_train, y_train, X_query, k) > 0.5).astype(int)

def fit_scaler(X_train):
    sd = X_train.std(axis=0)
    return X_train.mean(axis=0), np.where(sd == 0, 1.0, sd)

def transform(X, mean, std):
    return (X - mean) / std
`,
  solutionNote: 'The distance matrix is computed in one broadcast expression; each row is then sorted independently. The scaler\'s statistics come from training rows and are reused unchanged for queries.',
  checkSummary: 'Distance values and shape against a loop; neighbour order; k = 1 memorizes the training set; vote fractions; accuracy on two moons above a baseline; and a scaling experiment in which a feature multiplied by 1000 ruins raw k-NN while your training-only standardization restores it.',
  checks: `
import numpy as np
_A = np.array([[1.0, 2.0], [0.0, 0.0]]); _B = np.array([[4.0, 6.0], [1.0, 2.0], [3.0, 4.0]])
_D = pairwise_distances(_A, _B)
assert _D.shape == (2, 3), "Distances must have shape (len(A), len(B))"
np.testing.assert_allclose(_D, [[np.hypot(a[0] - b[0], a[1] - b[1]) for b in _B] for a in _A])
assert _D[0, 0] == 5.0
np.testing.assert_array_equal(knn_indices(_B, _A[:1], 3), [[1, 2, 0]])
print("PASS: pairwise distances and neighbour order")
_rng = np.random.default_rng(0)
def _moons(n, rng):
    t = rng.uniform(0, np.pi, n); lab = rng.integers(0, 2, n)
    x = np.where(lab, 1 - np.cos(t), np.cos(t)); y = np.where(lab, 0.5 - np.sin(t), np.sin(t))
    return np.c_[x, y] + 0.15 * rng.normal(size=(n, 2)), lab
_Xtr, _ytr = _moons(200, _rng); _Xte, _yte = _moons(200, _rng)
assert np.all(knn_predict(_Xtr, _ytr, _Xtr, 1) == _ytr), "k = 1 must reproduce every training label"
_p = knn_predict_proba(_Xtr, _ytr, _Xte, 5)
assert _p.shape == (200,) and set(np.unique(_p)).issubset({0, 0.2, 0.4, 0.6, 0.8, 1.0}), "k = 5 vote shares must be multiples of 0.2"
_acc = np.mean(knn_predict(_Xtr, _ytr, _Xte, 7) == _yte)
assert _acc > 0.9, f"Held-out accuracy {_acc:.2f} on two moons is too low"
print(f"PASS: k-NN classifies held-out moons at {_acc:.0%}")
_Xtr2 = np.c_[_Xtr, _rng.normal(size=200) * 1000]; _Xte2 = np.c_[_Xte, _rng.normal(size=200) * 1000]
_raw = np.mean(knn_predict(_Xtr2, _ytr, _Xte2, 7) == _yte)
_m, _s = fit_scaler(_Xtr2)
assert np.allclose(_m, _Xtr2.mean(axis=0)), "Scaler mean must come from training data"
_scaled = np.mean(knn_predict(transform(_Xtr2, _m, _s), _ytr, transform(_Xte2, _m, _s), 7) == _yte)
assert _raw < 0.7 and _scaled > _raw + 0.1, f"Scaling should rescue k-NN: raw {_raw:.2f}, scaled {_scaled:.2f}"
print(f"PASS: a noise feature in large units drops accuracy to {_raw:.0%}; standardizing restores {_scaled:.0%}")
`,
}
