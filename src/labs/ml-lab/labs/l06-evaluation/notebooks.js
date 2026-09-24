// Lab 06 runnable cells and math ↔ code tables, keyed by lesson id.
// Each leak from the playground is reproduced in a few lines, then repaired.
export const extras = {
  'l06-roles': {
    mathCode: {
      rows: [
        ['train / validation / test', 'idx = rng.permutation(n); tr, va, te = np.split(idx, [int(.6 * n), int(.8 * n)])', 'Set the test rows aside first.'],
        ['$\\operatorname{SE}(\\text{accuracy}) = \\sqrt{a(1-a)/n}$', 'np.sqrt(acc * (1 - acc) / len(te))', 'How noisy a test score is.'],
      ],
    },
    notebook: {
      title: 'Lab 06.1 · Three roles for data',
      intro: 'Make a 60/20/20 split and see how noisy a test score is at different test-set sizes.',
      cells: [{
        title: 'Split once, test set first',
        prose: '**Predict** the three sizes for 1,000 rows.',
        code: `import numpy as np
rng = np.random.default_rng(0)
n = 1000
idx = rng.permutation(n)
train, val, test = np.split(idx, [int(0.6 * n), int(0.8 * n)])
print(len(train), len(val), len(test), "overlap:", len(set(train) & set(test)))`,
      }, {
        title: 'How noisy is a test score?',
        prose: 'A model that is truly 80% accurate, scored on test sets of different sizes. **Predict** the spread at 100 rows.',
        code: `for m in [50, 100, 1000]:
    scores = rng.binomial(m, 0.8, size=5000) / m
    print(f"{m:>5} test rows: scores range roughly {np.percentile(scores, 2.5):.3f}–{np.percentile(scores, 97.5):.3f}")`,
      }],
    },
  },
  'l06-cv': {
    mathCode: {
      rows: [
        ['folds', 'folds = np.array_split(rng.permutation(n), k)', 'k nearly equal parts.'],
        ['$\\frac{1}{k}\\sum_f \\text{score}_f$', 'np.mean(scores)', 'The CV estimate; report the spread too.'],
        ['same folds, paired', 'np.array(scores_a) - np.array(scores_b)', 'Fold-by-fold differences cancel shared noise.'],
      ],
    },
    notebook: {
      title: 'Lab 06.2 · Cross-validation by hand',
      intro: 'Write k-fold cross-validation in a few lines, look at the fold spread, and compare two models on the same folds.',
      cells: [{
        title: 'k-fold for a line versus the mean baseline',
        prose: '**Predict**: how much do the five fold scores disagree?',
        code: `import numpy as np
rng = np.random.default_rng(3)
n = 60
x = rng.uniform(0, 5, n); y = 1.5 * x + rng.normal(0, 2, n)
folds = np.array_split(rng.permutation(n), 5)
line, base = [], []
for f in folds:
    tr = np.setdiff1d(np.arange(n), f)
    w, b = np.polyfit(x[tr], y[tr], 1)
    line.append(np.mean((w * x[f] + b - y[f]) ** 2))
    base.append(np.mean((y[tr].mean() - y[f]) ** 2))
print("line MSE per fold    :", np.round(line, 2))
print("baseline MSE per fold:", np.round(base, 2))
print("paired differences   :", np.round(np.array(base) - np.array(line), 2))`,
      }],
    },
  },
  'l06-baselines': {
    mathCode: {
      rows: [
        ['majority baseline', 'np.mean(y_val == majority_class)', 'Accuracy of always predicting the most common class.'],
        ['$\\text{skill} = 1 - \\frac{\\text{MSE}_{\\text{model}}}{\\text{MSE}_{\\text{baseline}}}$', '1 - mse_model / mse_base', 'Out-of-sample R² when the baseline is the training mean.'],
      ],
    },
    notebook: {
      title: 'Lab 06.3 · Baselines and skill',
      intro: 'Show how a majority-class baseline gets high accuracy on imbalanced data, and compute skill for a regression model.',
      cells: [{
        title: 'Accuracy without learning anything',
        prose: '94% of transactions are legitimate. **Predict** the baseline accuracy and how many frauds it catches.',
        code: `import numpy as np
rng = np.random.default_rng(0)
fraud = rng.random(5000) < 0.06
pred = np.zeros_like(fraud)               # always "legitimate"
print("accuracy:", np.mean(pred == fraud), "  frauds caught:", np.sum(pred & fraud))`,
      }, {
        title: 'Skill relative to the mean',
        prose: '**Predict** the sign of the skill for a model that is worse than the baseline.',
        code: `x = rng.uniform(0, 5, 200); y = 2 * x + rng.normal(0, 2, 200)
tr, va = np.arange(150), np.arange(150, 200)
w, b = np.polyfit(x[tr], y[tr], 1)
mse_model = np.mean((w * x[va] + b - y[va]) ** 2)
mse_base = np.mean((y[tr].mean() - y[va]) ** 2)
print("skill:", 1 - mse_model / mse_base)
print("skill of a bad model (w = -1):", 1 - np.mean((-1 * x[va] + b - y[va]) ** 2) / mse_base)`,
      }],
    },
  },
  'l06-leakage': {
    mathCode: {
      rows: [
        ['leaky', 'X_sel = SelectKBest(k=10).fit_transform(X, y); cross_val_score(model, X_sel, y)', 'Selection saw every row’s label.'],
        ['honest', 'cross_val_score(make_pipeline(SelectKBest(k=10), model), X, y)', 'Selection refit inside each training fold.'],
      ],
    },
    notebook: {
      title: 'Lab 06.4 · Leakage through feature selection',
      intro: 'Reproduce the playground’s first leak with scikit-learn: pure-noise features, random labels, and an impressive — false — score.',
      cells: [{
        title: 'Leaky versus honest',
        prose: 'Labels are coin flips. **Predict** both accuracies. **Then change** 500 features to 50.',
        code: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline

rng = np.random.default_rng(0)
X = rng.normal(size=(60, 500))
y = rng.integers(0, 2, 60)
model = LogisticRegression(max_iter=1000)

X_sel = SelectKBest(f_classif, k=10).fit_transform(X, y)          # used all 60 labels
print("leaky :", cross_val_score(model, X_sel, y, cv=5).mean().round(3))
honest = make_pipeline(SelectKBest(f_classif, k=10), model)       # refit per fold
print("honest:", cross_val_score(honest, X, y, cv=5).mean().round(3))`,
      }],
    },
  },
  'l06-splits': {
    mathCode: {
      rows: [
        ['group split', 'GroupKFold(n_splits=5).split(X, y, groups)', 'No group on both sides.'],
        ['time split', 'TimeSeriesSplit(n_splits=5).split(X)', 'Train on the past, validate on the next block.'],
      ],
    },
    notebook: {
      title: 'Lab 06.5 · Grouped and temporal splits',
      intro: 'A 1-nearest-neighbour model recognizes machines instead of learning; a grouped split exposes it. Then print the folds of a time-series split.',
      cells: [{
        title: 'Random versus grouped',
        prose: 'Each machine has its own offset; the label depends on the machine, not on anything that transfers. **Predict** both accuracies.',
        code: `import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import KFold, GroupKFold, cross_val_score

rng = np.random.default_rng(0)
machines = np.repeat(np.arange(20), 10)                 # 20 machines × 10 readings
offset = rng.normal(0, 3, size=(20, 2))
X = offset[machines] + rng.normal(0, 0.3, size=(200, 2))
y = rng.integers(0, 2, 20)[machines]                   # one label per machine
knn = KNeighborsClassifier(n_neighbors=1)
print("random split :", cross_val_score(knn, X, y, cv=KFold(5, shuffle=True, random_state=0)).mean().round(3))
print("grouped split:", cross_val_score(knn, X, y, cv=GroupKFold(5), groups=machines).mean().round(3))`,
      }, {
        title: 'Forward chaining',
        prose: '**Predict** the first training and validation ranges for 100 time-ordered rows.',
        code: `from sklearn.model_selection import TimeSeriesSplit
for tr, va in TimeSeriesSplit(n_splits=5).split(np.arange(100)):
    print(f"train 0–{tr[-1]:>2}   validate {va[0]}–{va[-1]}")`,
      }],
    },
  },
  'l06-discipline': {
    mathCode: {
      rows: [
        ['$1 - (1 - \\alpha)^m$', '1 - (1 - 0.05) ** m', 'Chance that at least one of m useless models passes.'],
        ['winner’s curse', 'scores.max(axis=1).mean() - true_accuracy', 'How far the best observed score overstates the truth.'],
      ],
    },
    notebook: {
      title: 'Lab 06.6 · The winner’s curse',
      intro: 'Score many equally good models on the same test rows, pick the best, and measure how much the pick is overstated.',
      cells: [{
        title: 'Pick the best of m',
        prose: 'Every model is truly 70% accurate. **Predict** the best observed score among 20 on 100 test rows.',
        code: `import numpy as np
rng = np.random.default_rng(0)
for m in [1, 20, 200]:
    scores = rng.binomial(100, 0.7, size=(2000, m)) / 100     # 2,000 repeats of the whole selection
    print(f"{m:>3} models: best observed score ≈ {scores.max(axis=1).mean():.3f} (truth 0.700)")`,
      }, {
        title: 'Spurious passes',
        prose: '**Predict** the chance that at least one of 20 useless models passes a 5% bar.',
        code: `for m in [1, 20, 100]:
    print(m, round(1 - 0.95 ** m, 4))`,
      }],
    },
  },
}
