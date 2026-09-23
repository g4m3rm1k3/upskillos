export default {
  filename: 'honest_evaluation.py', packages: ['numpy'],
  title: 'Build splitters that cannot leak.',
  intro: 'Implement k-fold, group k-fold and forward-chaining splitters, then a cross-validation loop that does feature selection **inside** each fold. The final check runs your honest pipeline and a leaky one on pure-noise labels: yours must stay near chance while the leaky one looks impressive.',
  steps: [
    '`kfold(n, k, rng)` → list of `(train_idx, val_idx)`; shuffle once, then fold f validates positions `f, f + k, f + 2k, …` of the shuffled order.',
    '`group_kfold(groups, k)` → folds where every group appears in exactly one validation fold and never in its own training fold.',
    '`forward_chain(n, folds, min_train)` → expanding windows: validation blocks of `(n - min_train) // folds` rows, each trained on every earlier row.',
    '`select_top_k(X, y, k)` → indices of the k columns with the largest absolute Pearson correlation with y.',
    '`honest_cv_accuracy(X, y, k_features, folds)` → mean accuracy of `nearest_centroid` with features selected **inside** each training fold.',
  ],
  hints: [
    ['Group folds', 'Take the unique groups (`np.unique(groups)`), give group number i to fold `i % k`, then build masks: `val = np.isin(groups, held_out)`.'],
    ['Correlation for every column at once', 'Center: `Xc = X - X.mean(axis=0)`, `yc = y - y.mean()`. Then `r = Xc.T @ yc / (np.sqrt((Xc**2).sum(axis=0)) * np.sqrt((yc**2).sum()))`. `np.argsort(-np.abs(r))[:k]`.'],
    ['Inside the fold', 'For each `(tr, va)`: `cols = select_top_k(X[tr], y[tr], k)`, then `pred = nearest_centroid(X[tr][:, cols], y[tr], X[va][:, cols])`. The validation labels are only used to score.'],
  ],
  starter: `import numpy as np

def nearest_centroid(X_train, y_train, X_new):
    # Provided: predict the class whose training mean is closest.
    c0 = X_train[y_train == 0].mean(axis=0)
    c1 = X_train[y_train == 1].mean(axis=0)
    d0 = ((X_new - c0) ** 2).sum(axis=1)
    d1 = ((X_new - c1) ** 2).sum(axis=1)
    return (d1 < d0).astype(int)

def kfold(n, k, rng):
    raise NotImplementedError

def group_kfold(groups, k):
    raise NotImplementedError

def forward_chain(n, folds, min_train):
    raise NotImplementedError

def select_top_k(X, y, k):
    raise NotImplementedError

def honest_cv_accuracy(X, y, k_features, folds):
    raise NotImplementedError
`,
  solution: `import numpy as np

def nearest_centroid(X_train, y_train, X_new):
    c0 = X_train[y_train == 0].mean(axis=0)
    c1 = X_train[y_train == 1].mean(axis=0)
    d0 = ((X_new - c0) ** 2).sum(axis=1)
    d1 = ((X_new - c1) ** 2).sum(axis=1)
    return (d1 < d0).astype(int)

def kfold(n, k, rng):
    order = rng.permutation(n)
    folds = []
    for f in range(k):
        val = order[f::k]
        train = np.setdiff1d(order, val)
        folds.append((train, val))
    return folds

def group_kfold(groups, k):
    groups = np.asarray(groups)
    unique = np.unique(groups)
    folds = []
    for f in range(k):
        held_out = unique[f::k]
        val = np.isin(groups, held_out)
        folds.append((np.flatnonzero(~val), np.flatnonzero(val)))
    return folds

def forward_chain(n, folds, min_train):
    block = (n - min_train) // folds
    out = []
    for f in range(folds):
        start = min_train + f * block
        out.append((np.arange(start), np.arange(start, start + block)))
    return out

def select_top_k(X, y, k):
    Xc = X - X.mean(axis=0)
    yc = y - y.mean()
    r = Xc.T @ yc / (np.sqrt((Xc ** 2).sum(axis=0)) * np.sqrt((yc ** 2).sum()))
    return np.argsort(-np.abs(r))[:k]

def honest_cv_accuracy(X, y, k_features, folds):
    scores = []
    for tr, va in folds:
        cols = select_top_k(X[tr], y[tr], k_features)
        pred = nearest_centroid(X[tr][:, cols], y[tr], X[va][:, cols])
        scores.append(np.mean(pred == y[va]))
    return float(np.mean(scores))
`,
  solutionNote: 'Selection is called with `X[tr], y[tr]` only, so validation labels never influence which features are used. The same folds are passed in from outside, so any two pipelines can be compared on identical splits.',
  checkSummary: 'Every splitter: each row validated exactly once (k-fold, group), no overlap, no group on both sides, strict time order with expanding windows; top-k correlation selection against a planted signal; and on pure-noise labels, your honest cross-validation stays below 65% while a leaky version run on the same folds scores far higher. A final check confirms your pipeline still finds a genuinely predictive feature.',
  checks: `
import numpy as np
_f = kfold(23, 5, np.random.default_rng(0))
assert len(_f) == 5
_vals = np.concatenate([v for _, v in _f])
assert sorted(_vals.tolist()) == list(range(23)), "Every row must be validated exactly once"
for _t, _v in _f:
    assert len(np.intersect1d(_t, _v)) == 0 and len(_t) + len(_v) == 23
_g = np.repeat(np.arange(8), 5)
for _t, _v in group_kfold(_g, 4):
    assert len(np.intersect1d(_g[_t], _g[_v])) == 0, "A group appears on both sides of a fold"
assert sorted(np.concatenate([v for _, v in group_kfold(_g, 4)]).tolist()) == list(range(40))
_fc = forward_chain(100, 5, 50)
assert len(_fc) == 5
for _t, _v in _fc:
    assert _t.max() < _v.min(), "Training rows must all come before validation rows"
    assert len(_v) == 10 and _t[0] == 0
print("PASS: k-fold, group k-fold and forward chaining")
_rng = np.random.default_rng(1)
_X = _rng.normal(size=(80, 30)); _y = (_rng.random(80) < 0.5).astype(int)
_X[:, 7] += 3 * _y
assert 7 in select_top_k(_X, _y, 1), "The planted informative column must rank first"
print("PASS: correlation-based selection")
_noise = np.random.default_rng(2)
_Xn = _noise.normal(size=(60, 500)); _yn = _noise.permutation(np.repeat([0, 1], 30))
_folds = kfold(60, 5, np.random.default_rng(3))
_honest = honest_cv_accuracy(_Xn, _yn, 10, _folds)
_cols = select_top_k(_Xn, _yn, 10)
_leaky = np.mean([np.mean(nearest_centroid(_Xn[t][:, _cols], _yn[t], _Xn[v][:, _cols]) == _yn[v]) for t, v in _folds])
assert _honest < 0.65, f"Honest CV on noise scored {_honest:.2f}: selection must happen inside each fold"
assert _leaky > _honest + 0.15, "Sanity check: the leaky version should look better"
print(f"PASS: on pure noise, honest CV = {_honest:.2f}, leaky CV = {_leaky:.2f}")
assert honest_cv_accuracy(_X, _y, 3, kfold(80, 5, np.random.default_rng(4))) > 0.85, "A real signal should still be found"
print("PASS: a genuine signal survives honest evaluation")
`,
}
