// Track D — Chapter project
// A baseline and model comparison with a held-out evaluation, in three versions.
import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const DELIVERY = `import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import mean_absolute_error
rng = np.random.default_rng(12)
n = 300
distance = rng.uniform(0.5, 15, n)          # km
items = rng.integers(1, 12, n)             # items in the order
minutes = 8 + 2.2 * distance + 0.6 * items + rng.normal(0, 3, n)
X = np.column_stack([distance, items])
y = minutes
X_dev, X_test, y_dev, y_test = train_test_split(X, y, test_size=0.2, random_state=0)`

export default {
  id: 'd-08', slug: 'project-model-comparison', track: 'D', order: 8,
  title: 'Project: A Baseline and Model Comparison', subtitle: 'Choose honestly, evaluate once, report with uncertainty',
  tags: ['project', 'evaluation', 'baseline', 'cross-validation', 'bootstrap', 'reproducibility'],
  prereqs: ['d-06', 'd-03'], unlocks: [],
  hook: {
    question: 'Which of two models should predict delivery times — and how good will it really be on tomorrow\'s orders?',
    realWorldContext: 'This project runs the full Track D workflow: hold out test data first, beat a baseline, compare candidates fairly with cross-validation inside pipelines, evaluate the chosen model once, and report its error with an interval and its limits. It is the shape of almost every real modelling task.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will produce.** A reproducible model comparison and a short report: the question, the split, the baseline, the candidates\' cross-validated scores, the single final test result with its uncertainty, and what the result does not show. Worked once, then scaffolded, then independent — checked on data you have not seen.',
        '**The worked question.** Predict delivery time in minutes from distance (km) and the number of items. Metric: **mean absolute error (MAE)** — the average number of minutes a prediction is off by, which a dispatcher can understand directly.',
        '**Reproducibility.** Fix the random generator\'s seed and every `random_state`, so anyone rerunning the notebook gets the same split and scores; keep every step in code; and state the library versions if results must be matched exactly later.',
      ),
      check(
        'Why hold out the test set before anything else — even before looking at summaries?',
        ['To save memory', 'So no decision — features, preprocessing, model choice — can be influenced by the rows that will judge the final model', 'Because sklearn requires it'],
        1,
        'Anything you learn from the test rows, even by looking, can shape your choices and bias the final score.',
      ),
      notebook('Part 1 — Worked: delivery times', [
        demo(1, '1 · Baseline and candidates, compared with cross-validation', 'Test rows are set aside in the first lines of the data cell. On the remaining rows, 5-fold CV compares a baseline (always predict the mean) with two candidates. Scaling sits inside each pipeline, so it is refitted per fold. sklearn reports errors as negative scores, so the sign is flipped.', 'Run. By how many minutes does each candidate beat the baseline? Are the two candidates clearly different given the spreads?', `${DELIVERY}
cv = KFold(5, shuffle=True, random_state=0)
candidates = {
    "baseline": DummyRegressor(),
    "linear": make_pipeline(StandardScaler(), LinearRegression()),
    "knn": make_pipeline(StandardScaler(), KNeighborsRegressor(n_neighbors=10)),
}
cv_mae = {}
for name, model in candidates.items():
    scores = -cross_val_score(model, X_dev, y_dev, cv=cv, scoring="neg_mean_absolute_error")
    cv_mae[name] = scores.mean()
    print(f"{name:8} CV MAE {scores.mean():.2f} ± {scores.std():.2f} minutes")`, { expectOutput: ['baseline CV MAE', 'linear   CV MAE'] }),
        demo(2, '2 · Choose once, test once, with an interval', 'The candidate with the lowest CV error is refitted on all non-test rows and evaluated once on the test rows. A bootstrap over the test rows gives a 95% interval for the MAE.', 'Run. Then write the report sentence: "On held-out orders, predictions were off by about … minutes (95% interval … to …), versus … for the baseline."', `${DELIVERY}
cv = KFold(5, shuffle=True, random_state=0)
linear = make_pipeline(StandardScaler(), LinearRegression())
knn = make_pipeline(StandardScaler(), KNeighborsRegressor(n_neighbors=10))
scores = {name: -cross_val_score(m, X_dev, y_dev, cv=cv, scoring="neg_mean_absolute_error").mean() for name, m in [("linear", linear), ("knn", knn)]}
chosen = min(scores, key=scores.get)
model = {"linear": linear, "knn": knn}[chosen].fit(X_dev, y_dev)
pred = model.predict(X_test)
test_mae = mean_absolute_error(y_test, pred)
baseline_mae = mean_absolute_error(y_test, np.full(len(y_test), y_dev.mean()))
boot = np.random.default_rng(0)
maes = [mean_absolute_error(y_test[i], pred[i]) for i in (boot.integers(0, len(y_test), len(y_test)) for _ in range(1000))]
low, high = np.percentile(maes, [2.5, 97.5])
print(f"chosen: {chosen}; test MAE {test_mae:.2f} (95% interval {low:.2f} to {high:.2f}); baseline test MAE {baseline_mae:.2f}")`, { expectOutput: ['chosen: linear; test MAE'] }),
      ]),
      callout('example', 'Worked report (fill in the numbers from your run)', '**Question:** predict delivery minutes from distance and item count, for future orders.\n\n**Split:** 20% of orders held out before modelling (random, seed 0) — reasonable because orders are independent; if the same customers or drivers recurred, a grouped split would be needed.\n\n**Comparison:** 5-fold CV on the remaining 240 orders. Both candidates beat the baseline by a wide margin; the linear model had the lower CV error and was chosen.\n\n**Final result:** test MAE with its 95% bootstrap interval, beside the baseline\'s test MAE.\n\n**Limits:** simulated, well-behaved data; only two inputs; no weather, traffic or time of day; an average error hides that long deliveries may be predicted worse — check errors by distance before relying on it.'),
      prose('**Part 2 — Scaffolded.** A churn classifier. The helper functions are named and described; complete them. The checker tests each function, then the whole workflow with a different random seed.'),
      notebook('Part 2 — Scaffolded: customer churn', [
        exercise(11, 1, 'Evaluation helpers', 'medium', {
          prompt: 'Complete hold_out(X, y, seed) returning X_dev, X_test, y_dev, y_test with 25% test (stratified by y), cv_accuracy(model, X_dev, y_dev, seed) returning the mean 5-fold stratified CV accuracy, and final_accuracy(model, X_dev, y_dev, X_test, y_test) returning the test accuracy after fitting on the dev rows.',
          instructions: 'Use `train_test_split(..., test_size=0.25, stratify=y, random_state=seed)` and `StratifiedKFold(5, shuffle=True, random_state=seed)`.',
          code: 'import numpy as np\nfrom sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(3)\nX = rng.normal(size=(400, 3))\ny = (X[:, 0] - 0.8 * X[:, 1] + rng.normal(0, 1, 400) > 0.5).astype(int)\n\ndef hold_out(X, y, seed):\n    pass  # TODO\n\ndef cv_accuracy(model, X_dev, y_dev, seed):\n    pass  # TODO\n\ndef final_accuracy(model, X_dev, y_dev, X_test, y_test):\n    pass  # TODO',
          testCode: `import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
parts = hold_out(X, y, 0)
assert parts is not None and len(parts) == 4 and len(parts[1]) == 100, "hold_out should return X_dev, X_test, y_dev, y_test with 100 test rows (25%)"
Xd, Xt, yd, yt = parts
assert abs(yt.mean() - y.mean()) < 0.02, "Stratify the split so the test set has the same churn rate as the data"
logreg = make_pipeline(StandardScaler(), LogisticRegression())
exp_cv = cross_val_score(logreg, Xd, yd, cv=StratifiedKFold(5, shuffle=True, random_state=0)).mean()
assert np.isclose(cv_accuracy(logreg, Xd, yd, 0), exp_cv), "cv_accuracy should be the mean 5-fold stratified CV accuracy on the dev rows"
base = cv_accuracy(DummyClassifier(), Xd, yd, 0)
assert cv_accuracy(logreg, Xd, yd, 0) > base + 0.1, "The logistic model should clearly beat the baseline in CV"
assert np.isclose(final_accuracy(logreg, Xd, yd, Xt, yt), make_pipeline(StandardScaler(), LogisticRegression()).fit(Xd, yd).score(Xt, yt)), "final_accuracy should fit on dev rows only and score once on the test rows"
p2 = hold_out(X, y, 7)
assert not np.array_equal(p2[1], Xt), "hold_out must use the seed it is given"
"SUCCESS: a stratified hold-out, fair CV against a baseline, and a single final score — reusable with any seed."`,
          hint: 'return train_test_split(X, y, test_size=0.25, stratify=y, random_state=seed); cross_val_score(model, X_dev, y_dev, cv=StratifiedKFold(5, shuffle=True, random_state=seed)).mean(); model.fit(X_dev, y_dev).score(X_test, y_test)',
          solution: 'import numpy as np\nfrom sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(3)\nX = rng.normal(size=(400, 3))\ny = (X[:, 0] - 0.8 * X[:, 1] + rng.normal(0, 1, 400) > 0.5).astype(int)\n\ndef hold_out(X, y, seed):\n    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=seed)\n\ndef cv_accuracy(model, X_dev, y_dev, seed):\n    return cross_val_score(model, X_dev, y_dev, cv=StratifiedKFold(5, shuffle=True, random_state=seed)).mean()\n\ndef final_accuracy(model, X_dev, y_dev, X_test, y_test):\n    return model.fit(X_dev, y_dev).score(X_test, y_test)',
          misconceptions: [{ code: 'import numpy as np\nfrom sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold\nrng = np.random.default_rng(3)\nX = rng.normal(size=(400, 3))\ny = (X[:, 0] - 0.8 * X[:, 1] + rng.normal(0, 1, 400) > 0.5).astype(int)\ndef hold_out(X, y, seed):\n    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)\ndef cv_accuracy(model, X_dev, y_dev, seed):\n    return cross_val_score(model, X_dev, y_dev, cv=StratifiedKFold(5, shuffle=True, random_state=seed)).mean()\ndef final_accuracy(model, X_dev, y_dev, X_test, y_test):\n    return model.fit(X_dev, y_dev).score(X_test, y_test)', feedback: 'must use the seed it is given' }],
        }),
      ]),
      prose(
        '**Part 3 — Independent.** Write `evaluate(X, y, groups, candidates, seed)` that returns a report dict. The data have repeated rows per group (for example several orders per customer), and the model is meant for new groups.',
        '**Specification.** Hold out the groups in the last 25% of `sorted(set(groups))` as the test set. On the other rows, compute each candidate\'s mean `GroupKFold(4)` MAE (candidates is a dict name → model; include a `DummyRegressor` under the key `"baseline"` yourself). Choose the non-baseline candidate with the lowest CV MAE, refit it on all non-test rows and compute its test MAE once. Return:',
        '| key | value |\n|---|---|\n| `"cv_mae"` | dict name → mean GroupKFold MAE, including "baseline" |\n| `"chosen"` | name of the chosen candidate |\n| `"test_mae"` | its MAE on the held-out groups |\n| `"beats_baseline"` | True if its test MAE is lower than the baseline\'s test MAE |',
      ),
      notebook('Part 3 — Independent: evaluation with groups', [
        exercise(12, 2, 'evaluate(X, y, groups, candidates, seed)', 'hard', {
          prompt: 'Write evaluate to the specification above. The seed is accepted for reproducibility but GroupKFold itself is deterministic.',
          instructions: 'Test groups: `test_groups = sorted(set(groups))[-len(set(groups)) // 4:]`; mask with `np.isin(groups, test_groups)`. Use `scoring="neg_mean_absolute_error"` and flip the sign.',
          code: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score, GroupKFold\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nfrom sklearn.metrics import mean_absolute_error\n\ndef evaluate(X, y, groups, candidates, seed=0):\n    pass  # your workflow here',
          testCode: `import numpy as np
from sklearn.model_selection import cross_val_score, GroupKFold
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsRegressor
from sklearn.metrics import mean_absolute_error
rng = np.random.default_rng(21)
groups = np.repeat(np.arange(16), 12)
X = np.column_stack([rng.uniform(0, 10, 192), rng.normal(0, 3, 16)[groups] + rng.normal(0, 0.2, 192)])
y = 5 + 2 * X[:, 0] + rng.normal(0, 1, 192)
cands = {"linear": LinearRegression(), "knn1": KNeighborsRegressor(n_neighbors=1)}
r = evaluate(X, y, groups, cands, seed=0)
assert r is not None and set(r) == {"cv_mae", "chosen", "test_mae", "beats_baseline"}, "Return exactly the four specified keys"
test = np.isin(groups, sorted(set(groups))[-4:]); tr = ~test
exp = {n: -cross_val_score(m, X[tr], y[tr], cv=GroupKFold(4), groups=groups[tr], scoring="neg_mean_absolute_error").mean() for n, m in [("baseline", DummyRegressor()), ("linear", LinearRegression()), ("knn1", KNeighborsRegressor(n_neighbors=1))]}
assert set(r["cv_mae"]) == set(exp), f"cv_mae should have entries for baseline, linear and knn1; got {sorted(r['cv_mae'])}"
for k in exp:
    assert np.isclose(r["cv_mae"][k], exp[k]), f"cv_mae['{k}'] should be the GroupKFold(4) MAE on non-test rows, {exp[k]:.3f}; got {r['cv_mae'][k]:.3f}"
assert r["chosen"] == "linear", "The linear model has the lower grouped CV error"
assert np.isclose(r["test_mae"], mean_absolute_error(y[test], LinearRegression().fit(X[tr], y[tr]).predict(X[test]))), "test_mae should come from the chosen model refitted on all non-test rows"
assert r["beats_baseline"] is True
"SUCCESS: grouped CV against a baseline, one choice, one test on unseen groups."`,
          hint: 'test_groups = sorted(set(groups))[-len(set(groups)) // 4:]; test = np.isin(groups, test_groups); for each name, model: -cross_val_score(model, X[~test], y[~test], cv=GroupKFold(4), groups=groups[~test], scoring="neg_mean_absolute_error").mean()',
          solution: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score, GroupKFold\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.neighbors import KNeighborsRegressor\nfrom sklearn.metrics import mean_absolute_error\nfrom sklearn.base import clone\n\ndef evaluate(X, y, groups, candidates, seed=0):\n    uniq = sorted(set(groups))\n    test = np.isin(groups, uniq[-len(uniq) // 4:])\n    tr = ~test\n    models = {"baseline": DummyRegressor(), **candidates}\n    cv_mae = {n: float(-cross_val_score(clone(m), X[tr], y[tr], cv=GroupKFold(4), groups=groups[tr], scoring="neg_mean_absolute_error").mean()) for n, m in models.items()}\n    chosen = min((n for n in candidates), key=lambda n: cv_mae[n])\n    model = clone(candidates[chosen]).fit(X[tr], y[tr])\n    test_mae = float(mean_absolute_error(y[test], model.predict(X[test])))\n    base_mae = float(mean_absolute_error(y[test], np.full(test.sum(), y[tr].mean())))\n    return {"cv_mae": cv_mae, "chosen": chosen, "test_mae": test_mae, "beats_baseline": test_mae < base_mae}',
          misconceptions: [{ code: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score, KFold\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.metrics import mean_absolute_error\nfrom sklearn.base import clone\ndef evaluate(X, y, groups, candidates, seed=0):\n    uniq = sorted(set(groups))\n    test = np.isin(groups, uniq[-len(uniq) // 4:]); tr = ~test\n    models = {"baseline": DummyRegressor(), **candidates}\n    cv_mae = {n: float(-cross_val_score(clone(m), X[tr], y[tr], cv=KFold(4, shuffle=True, random_state=seed), scoring="neg_mean_absolute_error").mean()) for n, m in models.items()}\n    chosen = min(candidates, key=lambda n: cv_mae[n])\n    model = clone(candidates[chosen]).fit(X[tr], y[tr])\n    t = float(mean_absolute_error(y[test], model.predict(X[test])))\n    return {"cv_mae": cv_mae, "chosen": chosen, "test_mae": t, "beats_baseline": True}', feedback: 'should be the GroupKFold(4) MAE' }],
        }),
      ]),
      prose('**Write it up.** Using your `evaluate` output, write a report in the worked format: question, split and why it matches use, baseline and candidates\' CV errors, the single test result, and at least two limits.'),
    ],
  },
  mentalModel: [
    'Hold out the test set first, split the way the model will be used, and fix seeds.',
    'Every candidate must beat a baseline; compare with CV, with preprocessing inside pipelines.',
    'Choose once, refit on all non-test data, evaluate once on the test set.',
    'Report the test error with an interval and the baseline beside it.',
    'State the limits: data, features, and where the error may be worse than average.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Your model\'s test MAE is 2.4 minutes. What should the report add?',
      options: ['Nothing', 'The baseline\'s MAE and an interval for the model\'s MAE, so readers can judge both improvement and uncertainty', 'The training MAE only'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'After seeing the test result, you try another model and it scores better on the same test set. Can you report that score as your final estimate?',
      options: ['Yes', 'No — the test set has now been used to choose, so its score is optimistic; a fresh held-out set is needed for an honest estimate', 'Only if the improvement is large'],
      correct: 1,
    },
  ],
}
