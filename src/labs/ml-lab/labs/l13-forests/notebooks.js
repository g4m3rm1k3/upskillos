// Lab 13 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Bagging and out-of-bag evaluation are written by hand around scikit-learn's single tree, then
// compared with scikit-learn's own ensembles.

const MOONS = `import numpy as np
from sklearn.datasets import make_moons
X, y = make_moons(n_samples=500, noise=0.35, random_state=2)
X_train, y_train, X_val, y_val = X[:350], y[:350], X[350:], y[350:]`

const BAG = `from sklearn.tree import DecisionTreeClassifier

def bag(X, y, T, seed=0, max_features=None):
    """T deep trees, each on its own bootstrap sample. Returns the trees and each tree's in-bag rows."""
    rng = np.random.default_rng(seed)
    n = len(y)
    trees, in_bag = [], []
    for t in range(T):
        rows = rng.integers(0, n, n)                    # n draws with replacement: a bootstrap sample
        tree = DecisionTreeClassifier(max_features=max_features, random_state=t).fit(X[rows], y[rows])
        trees.append(tree); in_bag.append(np.unique(rows))
    return trees, in_bag

def bag_predict(trees, X):
    return np.mean([t.predict_proba(X)[:, 1] for t in trees], axis=0)   # average of class-1 shares`

export const extras = {
  'l13-variance': {
    formulaTex: '$$\\operatorname{Var}\\Big(\\frac1T\\sum_{t=1}^T h_t\\Big) = \\rho\\sigma^2 + \\frac{(1 - \\rho)\\,\\sigma^2}{T}$$',
    mathCode: {
      rows: [
        ['$\\sigma^2$', 'sigma2', 'The variance of one predictor’s output.'],
        ['$\\rho$', 'rho', 'The correlation between any two predictors’ outputs.'],
        ['$h_t = \\sqrt{\\rho}\\,S + \\sqrt{1 - \\rho}\\,E_t$', 'np.sqrt(rho) * shared + np.sqrt(1 - rho) * own[t]', 'A way to build predictors with exactly that correlation: a shared part plus an individual part.'],
        ['$\\frac1T\\sum_t h_t$', 'h.mean(axis=1)', 'The ensemble: the average of the T predictors.'],
      ],
    },
    notebook: {
      title: 'Lab 13.1 · Why averaging helps',
      intro: 'Check the variance formula by simulation, then measure how much a single deep tree’s prediction moves between bootstrap samples compared with an average of many.',
      cells: [{
        title: 'The formula, by simulation',
        prose: 'Correlated predictors built from a shared part and an individual part. **Predict** the variance of the average of 10 with ρ = 0.3 and σ² = 1.',
        code: `import numpy as np
rng = np.random.default_rng(0)
rho, sigma2, trials = 0.3, 1.0, 200_000
for T in [1, 10, 100]:
    shared = rng.normal(size=(trials, 1))                # the part every predictor shares
    own = rng.normal(size=(trials, T))                   # each predictor's individual part
    h = np.sqrt(sigma2) * (np.sqrt(rho) * shared + np.sqrt(1 - rho) * own)
    print(f"T = {T:3d}: simulated {h.mean(axis=1).var():.3f}   formula {rho * sigma2 + (1 - rho) * sigma2 / T:.3f}")`,
        tryThis: 'Set ρ = 1. What does the average of 100 identical predictors give you?',
      }, {
        title: 'One tree against an average of trees',
        prose: 'Retrain on 30 bootstrap samples and record the prediction at one point each time. **Predict** which spreads more: one deep tree, or an average of 50.',
        code: `${MOONS}
from sklearn.tree import DecisionTreeClassifier
q = np.array([[0.5, 0.25]])
single, averaged = [], []
for rep in range(30):
    r = np.random.default_rng(rep)
    boot = lambda: r.integers(0, len(y_train), len(y_train))
    rows = boot()
    single.append(DecisionTreeClassifier(random_state=rep).fit(X_train[rows], y_train[rows]).predict_proba(q)[0, 1])
    averaged.append(np.mean([DecisionTreeClassifier(random_state=k).fit(X_train[b], y_train[b]).predict_proba(q)[0, 1] for k, b in enumerate(boot() for _ in range(50))]))
print(f"one deep tree:    predictions spread with standard deviation {np.std(single):.3f}")
print(f"average of 50:    predictions spread with standard deviation {np.std(averaged):.3f}")`,
      }],
    },
  },
  'l13-bagging': {
    formulaTex: '$$D_t = \\text{bootstrap}(D), \\quad h_t = \\text{tree}(D_t)$$ $$\\hat y(x) = \\frac1T\\sum_{t=1}^T h_t(x)$$ $$P(i \\notin D_t) = \\Big(1 - \\frac1n\\Big)^n \\approx e^{-1}$$',
    mathCode: {
      rows: [
        ['$D_t$', 'rows = rng.integers(0, n, n)', 'n row indices drawn with replacement: some repeat, some are missing.'],
        ['$h_t$', 'DecisionTreeClassifier().fit(X[rows], y[rows])', 'A deep tree trained on that sample.'],
        ['$\\frac1T\\sum_t h_t(x)$', 'np.mean([t.predict_proba(X)[:, 1] for t in trees], axis=0)', 'The bagged prediction: the average of the trees’ class-1 shares.'],
        ['$(1 - 1/n)^n$', '(1 - 1 / n) ** n', 'The chance a given row is never drawn.'],
      ],
    },
    notebook: {
      title: 'Lab 13.2 · Bagging',
      intro: 'Draw a bootstrap sample and count its repeats, bag deep trees by hand, and see that bagging a stable model changes almost nothing.',
      cells: [{
        title: 'One bootstrap sample',
        prose: 'Twelve rows, twelve draws with replacement. **Predict** roughly how many distinct rows appear.',
        code: `import numpy as np
rng = np.random.default_rng(4)
n = 12
rows = rng.integers(0, n, n)
print("drawn rows:", sorted(rows))
print("times each row was drawn:", [int(np.sum(rows == i)) for i in range(n)])
print("distinct rows:", len(np.unique(rows)), "of", n)
print(f"expected on average: n × (1 − (1 − 1/n)^n) = {n * (1 - (1 - 1 / n) ** n):.1f}")`,
      }, {
        title: 'Bagging by hand',
        prose: 'T deep trees on T bootstrap samples, predictions averaged. **Predict** how validation accuracy changes from 1 tree to 100.',
        code: `${MOONS}
${BAG}
trees, _ = bag(X_train, y_train, 100)
single = DecisionTreeClassifier(random_state=0).fit(X_train, y_train)
print(f"one deep tree on all the data: validation {single.score(X_val, y_val):.3f}")
for T in [1, 5, 20, 100]:
    acc = np.mean((bag_predict(trees[:T], X_val) > 0.5) == y_val)
    print(f"bagged, T = {T:3d}: validation {acc:.3f}")`,
        tryThis: 'Give every tree max_depth=2. Does bagging still help as much? Why not?',
      }, {
        title: 'Bagging a stable model',
        prose: 'The true curve is sin(x); 60 noisy points. Fit a straight line and a deep regression tree, once on all the data and then as the average of 50 bootstrap fits, and measure each fit’s squared error against the true curve. **Predict** which model bagging improves.',
        code: `from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
r = np.random.default_rng(1)
x = np.sort(r.uniform(0, 5, 60)); t = np.sin(x) + 0.3 * r.normal(size=60)
grid = np.linspace(0.1, 4.9, 200)[:, None]; truth = np.sin(grid[:, 0])
for name, make in [("straight line", LinearRegression), ("deep tree", DecisionTreeRegressor)]:
    single = make().fit(x[:, None], t).predict(grid)
    boots = (r.integers(0, 60, 60) for _ in range(50))                     # 50 bootstrap samples
    bagged = np.mean([make().fit(x[b, None], t[b]).predict(grid) for b in boots], axis=0)
    print(f"{name:13s}: error of one fit {np.mean((single - truth) ** 2):.4f}   error of the bagged fit {np.mean((bagged - truth) ** 2):.4f}")`,
        tryThis: 'The line’s error is large either way. Is that variance or bias — and can averaging fix it?',
      }],
    },
  },
  'l13-random': {
    formulaTex: '$$\\mathcal{F} \\subset \\{1, \\dots, p\\}, \\quad |\\mathcal{F}| = m$$ $$(j^*, t^*) = \\arg\\max_{j \\in \\mathcal{F},\\, t} \\operatorname{gain}(j, t)$$ $$m_{\\text{class}} = \\lfloor\\sqrt p\\rfloor \\qquad m_{\\text{reg}} = \\lfloor p/3\\rfloor$$',
    mathCode: {
      rows: [
        ['$\\mathcal{F}$, $m$', 'RandomForestClassifier(max_features=m)', 'At every split a fresh random subset F of m features; the best question is chosen only among them.'],
        ['$m = p$', 'max_features=None (or 1.0)', 'Every feature available: that is plain bagging.'],
        ['$\\lfloor\\sqrt p\\rfloor$', 'max_features="sqrt"', 'scikit-learn’s default for classification.'],
        ['$\\rho$ between trees', 'np.corrcoef(P)[np.triu_indices(T, 1)].mean()', 'Mean pairwise correlation of the trees’ validation predictions.'],
      ],
    },
    notebook: {
      title: 'Lab 13.3 · Random feature subsets',
      intro: 'On data with one dominant feature, compare bagging with forests that see fewer features per split: how often trees start with the strong feature, how correlated they are, and how accurate the ensemble is.',
      cells: [{
        title: 'Fewer features per split, less correlated trees',
        prose: 'Six features; x1 is strong, the others weak. **Predict** how the share of trees whose root asks about x1 changes as max_features falls.',
        code: `import numpy as np
from sklearn.ensemble import RandomForestClassifier
rng = np.random.default_rng(0)
n = 800
X = rng.normal(size=(n, 6))
y = (2.0 * X[:, 0] + 0.6 * X[:, 1:].sum(axis=1) + rng.normal(size=n) > 0).astype(int)
Xtr, ytr, Xva, yva = X[:500], y[:500], X[500:], y[500:]
for m in [6, 3, 2, 1]:
    rf = RandomForestClassifier(n_estimators=200, max_features=m, random_state=0).fit(Xtr, ytr)
    P = np.array([t.predict_proba(Xva)[:, 1] for t in rf.estimators_])
    rho = np.corrcoef(P)[np.triu_indices(len(P), 1)].mean()
    root_x1 = np.mean([t.tree_.feature[0] == 0 for t in rf.estimators_])
    print(f"max_features {m}{' (bagging)' if m == 6 else ''}: roots on x1 {root_x1:.2f}   mean tree correlation {rho:.3f}   forest validation {rf.score(Xva, yva):.3f}")`,
        tryThis: 'Make x1 weaker (1.0 instead of 2.0). Does the best max_features change?',
      }, {
        title: 'Defaults, and a trap',
        prose: 'The textbook defaults are √p for classification and p/3 for regression. scikit-learn’s classifier follows the first; its **regressor defaults to all features**, which is bagging. Always print the settings you are actually using.',
        code: `from sklearn.ensemble import RandomForestRegressor
for p in [9, 30, 100]:
    print(f"p = {p:3d}: √p = {int(np.sqrt(p))}   p/3 = {p // 3}")
print("RandomForestClassifier default max_features:", RandomForestClassifier().max_features)
print("RandomForestRegressor  default max_features:", RandomForestRegressor().max_features, "(1.0 = every feature)")`,
      }],
    },
  },
  'l13-oob': {
    formulaTex: '$$\\hat y_{\\text{OOB}}(x_i) = \\frac{1}{|\\{t : i \\notin D_t\\}|}\\sum_{t : i \\notin D_t} h_t(x_i)$$ $$\\text{OOB accuracy} = \\frac1n\\sum_i \\big[\\hat y_{\\text{OOB}}(x_i) \\text{ correct}\\big]$$',
    mathCode: {
      rows: [
        ['$i \\notin D_t$', 'out = np.ones(n, bool); out[in_bag[t]] = False', 'The rows tree t never saw.'],
        ['$\\sum_{t : i \\notin D_t} h_t(x_i)$', 'votes[out] += trees[t].predict_proba(X[out])[:, 1]', 'Add each tree’s prediction only for its out-of-bag rows.'],
        ['$|\\{t : i \\notin D_t\\}|$', 'counts[out] += 1', 'How many trees could judge row i.'],
        ['OOB accuracy', 'np.mean((votes / counts > 0.5) == y)', 'Over rows with at least one OOB prediction.'],
      ],
    },
    notebook: {
      title: 'Lab 13.4 · Out-of-bag evaluation',
      intro: 'Compute the left-out share, build OOB predictions row by row, compare them with validation accuracy and with scikit-learn’s oob_score_, and see OOB fooled by repeated measurements.',
      cells: [{
        title: 'About a third is left out',
        prose: '**Predict** (1 − 1/n)ⁿ for n = 1,000.',
        code: `import numpy as np
for n in [2, 10, 100, 1000]:
    print(f"n = {n:4d}: (1 − 1/n)^n = {(1 - 1 / n) ** n:.4f}")
print("e^-1 =", round(np.exp(-1), 4))`,
      }, {
        title: 'OOB by hand',
        prose: 'For each row, average only the trees that did not train on it. **Predict** whether OOB accuracy lands near validation accuracy.',
        code: `${MOONS}
${BAG}
trees, in_bag = bag(X_train, y_train, 200)
n = len(y_train)
votes, counts = np.zeros(n), np.zeros(n)
for t, tree in enumerate(trees):
    out = np.ones(n, bool); out[in_bag[t]] = False          # rows this tree never saw
    votes[out] += tree.predict_proba(X_train[out])[:, 1]
    counts[out] += 1
has = counts > 0
oob = np.mean((votes[has] / counts[has] > 0.5) == y_train[has])
val = np.mean((bag_predict(trees, X_val) > 0.5) == y_val)
print(f"trees per row with an OOB prediction: mean {counts.mean():.1f} of 200")
print(f"OOB accuracy {oob:.3f}   validation accuracy {val:.3f}")
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(n_estimators=200, max_features=None, oob_score=True, random_state=0).fit(X_train, y_train)
print(f"scikit-learn (bagging, its own random draws): OOB {rf.oob_score_:.3f}   validation {rf.score(X_val, y_val):.3f}")`,
      }, {
        title: 'OOB and repeated measurements',
        prose: '100 items recorded three times each; labels random per item, so honest accuracy is about 50%. **Predict** the OOB accuracy.',
        code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
r = np.random.default_rng(0)
items = r.normal(size=(100, 5)); lab = r.integers(0, 2, 100)
Xd = np.repeat(items, 3, axis=0) + r.normal(scale=0.01, size=(300, 5))
yd = np.repeat(lab, 3); groups = np.repeat(np.arange(100), 3)
rf = RandomForestClassifier(n_estimators=200, oob_score=True, random_state=0).fit(Xd, yd)
tr, te = next(GroupShuffleSplit(test_size=0.3, random_state=0).split(Xd, yd, groups))
honest = RandomForestClassifier(n_estimators=200, random_state=0).fit(Xd[tr], yd[tr]).score(Xd[te], yd[te])
print(f"OOB accuracy {rf.oob_score_:.3f}   group-held-out accuracy {honest:.3f}")`,
      }],
    },
  },
  'l13-limits': {
    formulaTex: '$$T \\uparrow \\ \\Rightarrow\\ \\operatorname{Var} \\downarrow \\text{ toward } \\rho\\sigma^2$$',
    mathCode: {
      rows: [
        ['$T$', 'n_estimators', 'The number of trees: more only helps, until the curve flattens.'],
        ['leaf size', 'min_samples_leaf', 'Controls each tree’s own overfitting on noisy data.'],
        ['permutation importance', 'permutation_importance(rf, X_val, y_val)', 'Validation-based; still splits credit between correlated features.'],
      ],
    },
    notebook: {
      title: 'Lab 13.5 · Tuning and limits',
      intro: 'Watch validation accuracy flatten as trees are added, see a regression forest refuse to extrapolate, and see importance split between two copies of the same information.',
      cells: [{
        title: 'More trees: a plateau, not overfitting',
        prose: '**Predict** whether 500 trees score worse than 100 on validation.',
        code: `${MOONS}
from sklearn.ensemble import RandomForestClassifier
for T in [1, 5, 20, 100, 500]:
    rf = RandomForestClassifier(n_estimators=T, random_state=0).fit(X_train, y_train)
    print(f"{T:3d} trees: train {rf.score(X_train, y_train):.3f}   validation {rf.score(X_val, y_val):.3f}")`,
      }, {
        title: 'No extrapolation',
        prose: 'Trained on x between 0 and 10 where y = 2x. **Predict** the forest’s prediction at x = 20.',
        code: `from sklearn.ensemble import RandomForestRegressor
r = np.random.default_rng(0)
x = r.uniform(0, 10, 200); t = 2 * x + r.normal(0, 1, 200)
rf = RandomForestRegressor(n_estimators=100, random_state=0).fit(x[:, None], t)
for q in [5, 9.9, 15, 20]:
    print(f"x = {q:4}: forest {rf.predict([[q]])[0]:6.2f}   trend {2 * q:5.1f}")`,
      }, {
        title: 'Importance shared between correlated features',
        prose: 'x1 matters; x1_copy is x1 plus a little noise. **Predict** how permutation importance splits between them.',
        code: `from sklearn.inspection import permutation_importance
n = 800
x1 = r.normal(size=n); X = np.column_stack([x1, x1 + 0.05 * r.normal(size=n), r.normal(size=n)])
yy = (x1 + 0.5 * r.normal(size=n) > 0).astype(int)
rf = RandomForestClassifier(n_estimators=200, random_state=0).fit(X[:500], yy[:500])
perm = permutation_importance(rf, X[500:], yy[500:], n_repeats=10, random_state=0).importances_mean
alone = RandomForestClassifier(n_estimators=200, random_state=0).fit(X[:500, [0, 2]], yy[:500])
perm_alone = permutation_importance(alone, X[500:, [0, 2]], yy[500:], n_repeats=10, random_state=0).importances_mean
print("with the copy:    x1", round(perm[0], 3), "  x1_copy", round(perm[1], 3), "  noise", round(perm[2], 3))
print("without the copy: x1", round(perm_alone[0], 3), "  noise", round(perm_alone[1], 3))`,
      }],
    },
  },
}
