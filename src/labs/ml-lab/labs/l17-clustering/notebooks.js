// Lab 17 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// k-means, k-means++, the silhouette and DBSCAN's core-point rule are written by hand, then compared
// with scikit-learn on the same data.

const KMEANS = `import numpy as np

def assign(X, centres):
    d2 = ((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)     # (n, k) squared distances
    return d2.argmin(axis=1)

def update(X, labels, centres):
    new = centres.copy()
    for j in range(len(centres)):
        if np.any(labels == j):                                        # an empty cluster keeps its centre
            new[j] = X[labels == j].mean(axis=0)
    return new

def inertia(X, labels, centres):
    return float(((X - centres[labels]) ** 2).sum())

def kmeans(X, k, seed=0, init="random", iters=50):
    rng = np.random.default_rng(seed)
    if init == "random":
        centres = X[rng.choice(len(X), k, replace=False)].copy()
    else:                                                              # k-means++
        centres = [X[rng.integers(len(X))]]
        for _ in range(k - 1):
            d2 = ((X[:, None, :] - np.array(centres)[None]) ** 2).sum(axis=2).min(axis=1)
            centres.append(X[rng.choice(len(X), p=d2 / d2.sum())])     # far points are more likely
        centres = np.array(centres)
    history = []
    for _ in range(iters):
        labels = assign(X, centres)
        history.append(inertia(X, labels, centres))
        new = update(X, labels, centres)
        if np.allclose(new, centres):
            break
        centres = new
    return labels, centres, history`

export const extras = {
  'l17-unsupervised': {
    formulaTex: '$$c_i \\in \\{1, \\dots, k\\} \\ \\text{chosen from } x_1, \\dots, x_n \\text{ alone}$$',
    mathCode: {
      rows: [
        ['$c_i$', 'labels[i]', 'The cluster assigned to row i: an index, not a meaning.'],
        ['no target', 'KMeans().fit(X)', 'Only X is passed; there is no y.'],
        ['agreement with known groups', 'adjusted_rand_score(true_groups, labels)', '1 = identical groupings, about 0 = no better than chance. Only possible when outside labels exist.'],
      ],
    },
    notebook: {
      title: 'Lab 17.1 · Structure without labels',
      intro: 'Cluster points that have no structure at all, then see features in different units decide the clusters.',
      cells: [{
        title: 'Clusters on pure noise',
        prose: '300 uniformly random points. **Predict** whether k-means returns three clusters.',
        code: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
rng = np.random.default_rng(0)
U = rng.uniform(0, 1, (300, 2))
km = KMeans(n_clusters=3, n_init=10, random_state=0).fit(U)
print("cluster sizes:", np.bincount(km.labels_), "  inertia", round(km.inertia_, 2))
print("mean silhouette:", round(silhouette_score(U, km.labels_), 3), " — it always returns k groups")`,
      }, {
        title: 'Units decide the clusters',
        prose: 'Two kinds of build — quick lint jobs and full compiles — differ in duration but overlap in size. Size is in bytes. **Predict** which feature the raw clustering follows.',
        code: `from sklearn.preprocessing import StandardScaler
from sklearn.metrics import adjusted_rand_score
kind = rng.integers(0, 2, 400)                                        # 0 = lint, 1 = full compile
size_bytes = rng.normal(5e6, 1.5e6, 400)                             # similar sizes for both kinds
seconds = np.where(kind == 1, 300, 40) + rng.normal(0, 30, 400)       # very different durations
X = np.column_stack([size_bytes, seconds])
for name, data in [("raw units", X), ("standardized", StandardScaler().fit_transform(X))]:
    labels = KMeans(n_clusters=2, n_init=10, random_state=0).fit_predict(data)
    print(f"{name:13s}: agreement with the true kinds (adjusted Rand) {adjusted_rand_score(kind, labels):.3f}")`,
        tryThis: 'Record size in megabytes (divide by 1e6) and cluster the raw values again. What changes, and why?',
      }],
    },
  },
  'l17-kmeans': {
    formulaTex: '$$\\text{inertia} = \\sum_i \\lVert x_i - \\mu_{c(i)}\\rVert^2$$ $$c(i) = \\arg\\min_j \\lVert x_i - \\mu_j\\rVert$$ $$\\mu_j = \\frac{1}{|C_j|}\\sum_{i \\in C_j} x_i$$ $$\\text{k-means++: } P(x) \\propto D(x)^2$$',
    mathCode: {
      rows: [
        ['$\\lVert x_i - \\mu_j\\rVert^2$ for all $i, j$', '((X[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2)', 'An (n, k) table of squared distances.'],
        ['$c(i) = \\arg\\min_j$', 'd2.argmin(axis=1)', 'Assign step: nearest centre.'],
        ['$\\mu_j$', 'X[labels == j].mean(axis=0)', 'Update step: the mean of the cluster’s points.'],
        ['inertia', '((X - centres[labels]) ** 2).sum()', 'Within-cluster sum of squares.'],
        ['$D(x)^2$', 'min over chosen centres of the squared distance', 'k-means++ picks the next centre with probability proportional to this.'],
      ],
    },
    notebook: {
      title: 'Lab 17.2 · k-means step by step',
      intro: 'Compute an update by hand, write k-means and check that inertia never rises, then compare random starts with k-means++ and with scikit-learn.',
      cells: [{
        title: 'One update by hand',
        prose: 'Points at 1, 2 and 6 belong to one cluster. **Predict** the new centre.',
        code: `import numpy as np
pts = np.array([1.0, 2.0, 6.0])
print("new centre:", pts.mean())
for c in [2.0, 3.0, 4.0]:
    print(f"sum of squared distances to {c}: {((pts - c) ** 2).sum()}")`,
      }, {
        title: 'k-means, watching the inertia',
        prose: 'Three blobs, one random start. **Predict** whether inertia can ever increase between iterations.',
        code: `${KMEANS}
from sklearn.datasets import make_blobs
X, true = make_blobs(n_samples=300, centers=3, cluster_std=1.0, random_state=4)
labels, centres, history = kmeans(X, 3, seed=1)
print("inertia per iteration:", np.round(history, 1))
print("never increased:", all(b <= a + 1e-9 for a, b in zip(history, history[1:])))`,
      }, {
        title: 'Random starts, k-means++ and scikit-learn',
        prose: 'Ten seeds each. **Predict** which start gets stuck in a worse local minimum more often.',
        code: `from sklearn.cluster import KMeans
X6, _ = make_blobs(n_samples=600, centers=6, cluster_std=0.6, random_state=11)
for init in ["random", "plusplus"]:
    finals = [kmeans(X6, 6, seed=s, init=init)[2][-1] for s in range(10)]
    print(f"{init:8s}: final inertia over 10 seeds {np.round(sorted(finals), 0)}")
print("scikit-learn (k-means++, 10 restarts, best kept):", round(KMeans(6, n_init=10, random_state=0).fit(X6).inertia_, 0))`,
        tryThis: 'Keep only the best of the ten random-start runs. How close does it get to k-means++?',
      }],
    },
  },
  'l17-choosek': {
    formulaTex: '$$a(i) = \\frac{1}{|C_{c(i)}| - 1}\\sum_{j \\in C_{c(i)},\\ j \\ne i} d(i, j)$$ $$b(i) = \\min_{C \\ne C_{c(i)}} \\frac{1}{|C|}\\sum_{j \\in C} d(i, j)$$ $$s(i) = \\frac{b(i) - a(i)}{\\max(a(i), b(i))}$$',
    mathCode: {
      rows: [
        ['$a(i)$', 'd[i, same & (idx != i)].mean()', 'Mean distance from point i to the other members of its cluster.'],
        ['$b(i)$', 'min(d[i, labels == j].mean() for j != own)', 'Mean distance to the closest other cluster.'],
        ['$s(i)$', '(b - a) / max(a, b)', 'Near 1: well inside; near 0: on a border; negative: probably misassigned.'],
        ['stability', 'adjusted_rand_score(labels_seed_a, labels_seed_b)', 'Agreement between two runs; real structure reappears.'],
      ],
    },
    notebook: {
      title: 'Lab 17.3 · Choosing k',
      intro: 'Trace inertia against k, compute silhouettes by hand and with scikit-learn, and measure how stable each k is across seeds.',
      cells: [{
        title: 'The elbow',
        prose: 'Four well-separated blobs. **Predict** where the curve bends.',
        code: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.datasets import make_blobs
X, _ = make_blobs(n_samples=400, centers=4, cluster_std=0.8, random_state=8)
for k in range(1, 9):
    print(f"k = {k}: inertia {KMeans(k, n_init=10, random_state=0).fit(X).inertia_:8.1f}")`,
      }, {
        title: 'Silhouette by hand and by library',
        prose: 'The lesson’s example first; then one point’s a and b computed from distances, and the mean silhouette per k.',
        code: `a, b = 2.0, 6.0
print("lesson example:", round((b - a) / max(a, b), 3))
from sklearn.metrics import silhouette_score, silhouette_samples
labels = KMeans(4, n_init=10, random_state=0).fit_predict(X)
d = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))        # all pairwise distances
i = 0
own = labels[i]
a_i = d[i, (labels == own) & (np.arange(len(X)) != i)].mean()
b_i = min(d[i, labels == j].mean() for j in set(labels) if j != own)
print(f"point 0: a {a_i:.3f}  b {b_i:.3f}  s {(b_i - a_i) / max(a_i, b_i):.4f}   scikit-learn {silhouette_samples(X, labels)[i]:.4f}")
for k in range(2, 8):
    print(f"k = {k}: mean silhouette {silhouette_score(X, KMeans(k, n_init=10, random_state=0).fit_predict(X)):.3f}")`,
      }, {
        title: 'Stability across seeds',
        prose: 'Single random starts with five seeds; the agreement between every pair of runs. **Predict** which values of k are perfectly stable — then ask whether stability alone picks the right one.',
        code: `from sklearn.metrics import adjusted_rand_score
for k in [2, 3, 4, 5, 6]:
    runs = [KMeans(k, n_init=1, init="random", random_state=s).fit_predict(X) for s in range(5)]
    ari = [adjusted_rand_score(runs[p], runs[q]) for p in range(5) for q in range(p + 1, 5)]
    print(f"k = {k}: mean agreement between runs {np.mean(ari):.3f}   worst {np.min(ari):.3f}")`,
      }],
    },
  },
  'l17-shapes': {
    formulaTex: '$$N_\\varepsilon(x) = \\{x\' : \\lVert x - x\'\\rVert \\le \\varepsilon\\}$$ $$\\text{core}(x) \\iff |N_\\varepsilon(x)| \\ge \\text{minPts}$$',
    mathCode: {
      rows: [
        ['$N_\\varepsilon(x)$', 'd[i] <= eps', 'The points within ε of point i, itself included.'],
        ['core point', '(d <= eps).sum(axis=1) >= min_pts', 'Enough neighbours to be inside a dense region.'],
        ['clusters', 'DBSCAN(eps=eps, min_samples=min_pts).fit(X).labels_', 'Connected groups of core points plus the border points they reach; −1 marks noise.'],
      ],
    },
    notebook: {
      title: 'Lab 17.4 · Shapes k-means cannot find',
      intro: 'Compare k-means and DBSCAN on two moons, find core points by hand and check them against scikit-learn, and see how ε changes the result.',
      cells: [{
        title: 'k-means against DBSCAN on moons',
        prose: '**Predict** each method’s agreement with the true moons.',
        code: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import adjusted_rand_score
X, moon = make_moons(n_samples=300, noise=0.06, random_state=0)
km = KMeans(2, n_init=10, random_state=0).fit_predict(X)
db = DBSCAN(eps=0.2, min_samples=5).fit(X)
print("k-means agreement:", round(adjusted_rand_score(moon, km), 3))
print("DBSCAN agreement: ", round(adjusted_rand_score(moon, db.labels_), 3), "  clusters", len(set(db.labels_) - {-1}), "  noise points", int((db.labels_ == -1).sum()))`,
      }, {
        title: 'Core points by hand',
        prose: 'A point is core when at least minPts points, itself included, lie within ε. **Predict** whether scikit-learn counts the point itself.',
        code: `eps, min_pts = 0.2, 5
d = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))
core_ours = (d <= eps).sum(axis=1) >= min_pts                    # the diagonal (distance 0) counts the point itself
core_lib = np.zeros(len(X), bool); core_lib[db.core_sample_indices_] = True
print("core points: ours", core_ours.sum(), "  scikit-learn", core_lib.sum(), "  identical:", bool((core_ours == core_lib).all()))`,
      }, {
        title: 'The choice of ε',
        prose: '**Predict** what very small and very large ε do.',
        code: `for eps in [0.05, 0.1, 0.2, 0.4, 1.0]:
    lab = DBSCAN(eps=eps, min_samples=5).fit_predict(X)
    print(f"ε = {eps:4}: clusters {len(set(lab) - {-1}):3d}   noise {int((lab == -1).sum()):3d}   agreement {adjusted_rand_score(moon, lab):.3f}")`,
        tryThis: 'Scale the second feature by 10 and rerun with ε = 0.2. Why does DBSCAN need scaled features too?',
      }],
    },
  },
  'l17-anomaly': {
    formulaTex: '$$\\text{score}(x) = \\lVert x - \\mu_{c(x)}\\rVert$$ $$\\text{relative}(x) = \\frac{\\lVert x - \\mu_{c(x)}\\rVert}{\\operatorname{median}_{i \\in C_{c(x)}} \\lVert x_i - \\mu_{c(x)}\\rVert}$$',
    mathCode: {
      rows: [
        ['$\\lVert x - \\mu_{c(x)}\\rVert$', 'np.linalg.norm(X - centres[labels], axis=1)', 'Distance to the nearest centre.'],
        ['typical distance in a cluster', 'np.median(score[labels == j])', 'Each cluster’s own scale.'],
        ['relative score', 'score / typical[labels]', 'Unusual for its own cluster, not just far in absolute terms.'],
        ['top share', 'np.argsort(-score)[:k]', 'Flag the k highest scores for investigation.'],
      ],
    },
    notebook: {
      title: 'Lab 17.5 · Anomaly scores',
      intro: 'Score points by their distance to the nearest centre, see a wide cluster crowd the flags, and fix it by scaling each cluster’s distances.',
      cells: [{
        title: 'Raw distance against relative distance',
        prose: 'A tight cluster, a wide cluster, and eight planted anomalies near the tight one. Flag 8 points each way. **Predict** how many planted anomalies each score catches.',
        code: `import numpy as np
from sklearn.cluster import KMeans
rng = np.random.default_rng(3)
tight = rng.normal([0, 0], 0.3, (200, 2))
wide = rng.normal([6, 0], 1.5, (200, 2))
planted = rng.normal([0, 0], 0.3, (8, 2)) + rng.choice([-1, 1], (8, 2)) * 1.8   # off the tight cluster
X = np.vstack([tight, wide, planted]); is_anomaly = np.r_[np.zeros(400, bool), np.ones(8, bool)]
km = KMeans(2, n_init=10, random_state=0).fit(X)
score = np.linalg.norm(X - km.cluster_centers_[km.labels_], axis=1)
typical = np.array([np.median(score[km.labels_ == j]) for j in range(2)])
relative = score / typical[km.labels_]
for name, s in [("raw distance", score), ("relative to cluster", relative)]:
    flagged = np.argsort(-s)[:8]
    print(f"{name:20s}: planted anomalies caught {is_anomaly[flagged].sum()} of 8   (precision {is_anomaly[flagged].mean():.2f})")`,
        tryThis: 'Flag 20 points instead of 8. Which score’s precision drops faster?',
      }],
    },
  },
}
