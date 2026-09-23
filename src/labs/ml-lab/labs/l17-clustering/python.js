export default {
  filename: 'kmeans.py', packages: ['numpy'],
  title: 'k-means and the silhouette, vectorized.',
  intro: 'Implement k-means with k-means++ initialization and restarts, then the silhouette score. Everything operates on an `(n, d)` array with broadcasting; no loops over points are required except for choosing initial centres.',
  steps: [
    '`assign(X, C)` → index of the nearest centre for every row (squared Euclidean distance).',
    '`update(X, labels, C)` → new centres as cluster means; keep the old centre if a cluster is empty.',
    '`inertia(X, labels, C)` → total squared distance to assigned centres.',
    '`kmeans_pp_init(X, k, rng)` → k initial centres chosen by k-means++; `kmeans(X, k, rng, restarts=5, max_iter=100)` → `(C, labels, inertia)` of the best restart.',
    '`silhouette(X, labels)` → the mean silhouette over all points.',
  ],
  hints: [
    ['Distances to every centre', '`D = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)` has shape `(n, k)`; `D.argmin(axis=1)`.'],
    ['k-means++', 'First centre: a random row. Then `d = D_to_nearest_chosen`, probabilities `d / d.sum()`, and `rng.choice(n, p=probs)` for the next centre.'],
    ['Silhouette', 'Pairwise distances `P` of shape `(n, n)`. For point i: `a` = mean of `P[i, same]` excluding i; `b` = the smallest mean of `P[i, other cluster]` over other clusters.'],
  ],
  starter: `import numpy as np

def assign(X, C):
    raise NotImplementedError

def update(X, labels, C):
    raise NotImplementedError

def inertia(X, labels, C):
    raise NotImplementedError

def kmeans_pp_init(X, k, rng):
    raise NotImplementedError

def kmeans(X, k, rng, restarts=5, max_iter=100):
    raise NotImplementedError

def silhouette(X, labels):
    raise NotImplementedError
`,
  solution: `import numpy as np

def _sq(X, C):
    return ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)

def assign(X, C):
    return _sq(X, C).argmin(axis=1)

def update(X, labels, C):
    return np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else C[j] for j in range(len(C))])

def inertia(X, labels, C):
    return float(((X - C[labels]) ** 2).sum())

def kmeans_pp_init(X, k, rng):
    C = [X[rng.integers(len(X))]]
    while len(C) < k:
        d = _sq(X, np.array(C)).min(axis=1)
        C.append(X[rng.choice(len(X), p=d / d.sum())])
    return np.array(C)

def kmeans(X, k, rng, restarts=5, max_iter=100):
    best = None
    for _ in range(restarts):
        C = kmeans_pp_init(X, k, rng)
        labels = assign(X, C)
        for _ in range(max_iter):
            C = update(X, labels, C)
            new = assign(X, C)
            if np.array_equal(new, labels):
                break
            labels = new
        run = (C, labels, inertia(X, labels, C))
        if best is None or run[2] < best[2]:
            best = run
    return best

def silhouette(X, labels):
    P = np.sqrt(_sq(X, X))
    s = np.zeros(len(X))
    for i in range(len(X)):
        same = labels == labels[i]
        same[i] = False
        if not same.any():
            continue
        a = P[i, same].mean()
        b = min(P[i, labels == c].mean() for c in np.unique(labels) if c != labels[i])
        s[i] = (b - a) / max(a, b)
    return float(s.mean())
`,
  solutionNote: 'Assignment and update alternate until labels stop changing; each restart starts from a fresh k-means++ initialization and the lowest-inertia result wins. The silhouette uses the full pairwise distance matrix, which is fine for a few thousand points.',
  checkSummary: 'Assignment, update (including an empty cluster) and inertia on a tiny example; k-means++ picks centres from the data and spreads them out; k-means recovers three well-separated blobs almost perfectly and its inertia never exceeds a random-start single run; silhouette high for separated blobs and near zero for uniform noise.',
  checks: `
import numpy as np
_X = np.array([[0.0, 0], [0, 1], [10, 0], [10, 1]]); _C = np.array([[0.0, 0.5], [10, 0.5], [50, 50]])
_l = assign(_X, _C)
np.testing.assert_array_equal(_l, [0, 0, 1, 1])
_U = update(_X, _l, _C)
np.testing.assert_allclose(_U, [[0, 0.5], [10, 0.5], [50, 50]], err_msg="Empty clusters must keep their old centre")
assert abs(inertia(_X, _l, _U) - 1.0) < 1e-12
print("PASS: assign, update and inertia")
_rng = np.random.default_rng(0)
_true = np.repeat([0, 1, 2], 60)
_B = np.array([[-4, 0], [4, 0], [0, 5]])[_true] + 0.6 * _rng.normal(size=(180, 2))
_init = kmeans_pp_init(_B, 3, np.random.default_rng(1))
assert _init.shape == (3, 2) and all(any(np.allclose(c, r) for r in _B) for c in _init), "Initial centres must be data points"
_C3, _l3, _in = kmeans(_B, 3, np.random.default_rng(2))
_agree = max(np.mean(np.array([p[x] for x in _l3]) == _true) for p in __import__("itertools").permutations(range(3)))
assert _agree > 0.97, f"k-means should recover the blobs (agreement {_agree:.2f})"
assert _in <= inertia(_B, assign(_B, _B[:3]), _B[:3]) + 1e-9
print(f"PASS: k-means recovers three blobs ({_agree:.0%} agreement), inertia {_in:.1f}")
_sb = silhouette(_B, _l3)
_Un = _rng.uniform(-3, 3, size=(180, 2))
_su = silhouette(_Un, kmeans(_Un, 3, np.random.default_rng(3))[1])
assert _sb > 0.6 and _su < _sb - 0.2, f"Silhouette: blobs {_sb:.2f} should be far above uniform noise {_su:.2f}"
print(f"PASS: silhouette {_sb:.2f} on real clusters vs {_su:.2f} on uniform noise")
`,
}
