import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const SIN_DATA = `import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import make_pipeline
np.random.seed(42)
X = np.random.uniform(0, 5, 100).reshape(-1, 1)
y = np.sin(X.ravel()) + np.random.normal(0, 0.3, 100)`

export default {
  id: 'd-06', slug: 'model-evaluation-and-overfitting', track: 'D', order: 7,
  title: 'Model Evaluation and Overfitting', subtitle: 'Does Your Model Actually Generalise?',
  tags: ['overfitting', 'train-test-split', 'cross-validation', 'bias-variance', 'sklearn'],
  prereqs: ['d-05', 'd-07', 'c-04'], unlocks: ['d-08'],
  hook: {
    question: 'How do you know whether a model will work on data it has never seen?',
    realWorldContext: 'A model is only useful on new data. Honest evaluation keeps some data completely out of every decision, compares against a simple baseline, respects how the data were collected (people, groups, time), and keeps every learned preprocessing step inside the training data. Skipping any of these produces scores that look good in a notebook and fail in use.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Explain overfitting and use held-out data to detect it. Separate the roles of training, validation and test data, and compare candidates with cross-validation. Recognise three kinds of leakage — test peeking, preprocessing on all data, and related rows on both sides of a split — and fix them. Report a final score with a baseline and its uncertainty.',
        '**The smallest example.** A model **overfits** when it fits the training data, noise included, so closely that it predicts new data badly. A very flexible curve through a dozen noisy points can pass near every point and still swing wildly between them. The warning sign is a large gap between error on the training rows and error on held-out rows — evidence, not proof, because a small held-out set is itself noisy.',
        '**Three roles for data.**',
        '| Role | Used to | Used how often |\n|---|---|---|\n| training | fit each candidate model | every candidate |\n| validation (or cross-validation on training data) | compare candidates and choose one | during development |\n| test | estimate the chosen model\'s performance on new data | **once**, at the end |',
        'Choosing among candidates *using* the test set turns it into a validation set: the winner\'s score is optimistically biased, because it won partly by luck on those rows. And always compare with a **baseline** — for example, always predicting the training mean — so you know what "no skill" scores.',
      ),
      notebook('Overfitting and the three roles', [
        demo(1, 'Stage 1 — Overfitting visualised', 'High-degree polynomials can chase every training point but generalise poorly. (NumPy may warn that the degree-15 fit is poorly conditioned: 12 points cannot pin down 16 coefficients — itself a sign of overfitting.)', 'Run. Degree 1 misses the curve (underfits); degree 15 swings between points (overfits). Degree 3 looks reasonable here, but a picture is suggestive, not a guarantee — the next stages decide with held-out data.', 'from opencalc import Figure\nimport numpy as np\nnp.random.seed(42)\nxs_train = np.linspace(0, 5, 12)\nys_train = np.sin(xs_train) + np.random.normal(0, 0.3, 12)\nfig = Figure(xmin=-0.5, xmax=5.5, ymin=-2, ymax=2, title="Overfitting: degree 1 vs 3 vs 15")\nfig.grid().axes()\nfig.scatter(xs_train.tolist(), ys_train.tolist(), color="blue", radius=4)\nfor deg, color in [(1, "green"), (3, "amber"), (15, "red")]:\n    coeffs = np.polyfit(xs_train, ys_train, deg)\n    fig.plot(lambda x, c=coeffs: np.polyval(c, x), color=color, label=f"degree {deg}")\nfig.show()'),
        demo(2, 'Stage 2 — Train, validate, then test once', 'Split into train (60%), validation (20%) and test (20%). Fit each candidate on train, compare on validation, choose, refit on train + validation, and evaluate the chosen model once on test. A baseline shows what "no skill" scores.', 'Run. Then answer: why would it be wrong to loop over the degrees printing the test score and pick the best?', `${SIN_DATA}
from sklearn.dummy import DummyRegressor
X_dev, X_test, y_dev, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
X_train, X_val, y_train, y_val = train_test_split(X_dev, y_dev, test_size=0.25, random_state=42)
print(f"baseline (predict mean): val R² = {DummyRegressor().fit(X_train, y_train).score(X_val, y_val):.3f}")
val = {}
for deg in [1, 3, 10]:
    model = make_pipeline(StandardScaler(), PolynomialFeatures(deg), LinearRegression()).fit(X_train, y_train)
    val[deg] = model.score(X_val, y_val)
    print(f"degree {deg:>2}: train R² = {model.score(X_train, y_train):.3f}, val R² = {val[deg]:.3f}")
best = max(val, key=val.get)
final = make_pipeline(StandardScaler(), PolynomialFeatures(best), LinearRegression()).fit(X_dev, y_dev)
print(f"chosen by validation: degree {best}; test R² (reported once) = {final.score(X_test, y_test):.3f}")`, { expectOutput: ['baseline (predict mean): val R² = -0.096', 'chosen by validation: degree 3; test R² (reported once) = 0.901'] }),
      ]),
      prose(
        '**Cross-validation.** One validation split can be lucky or unlucky. **k-fold cross-validation** splits the non-test data into k folds, trains on k − 1 of them and evaluates on the remaining one, rotating so each row is evaluated once. Report the mean and the spread of the k scores; if two candidates\' means differ by less than about one spread, the data do not clearly prefer either, so prefer the simpler one.',
        '**The bias–variance picture.** Too simple a model misses the pattern (high bias); too flexible a model chases noise (high variance). Training error keeps falling as flexibility grows, while held-out error typically falls and then rises. With small data the curve is bumpy, so the "best" complexity is an estimate, not a fact.',
      ),
      notebook('Cross-validation', [
        demo(3, 'Stage 3 — 5-fold cross-validation', 'The pipeline refits scaling and polynomial features inside each fold, so nothing learned from the evaluation fold leaks into training.', 'Run. Are degree 3 and degree 10 clearly different, given the spreads?', `${SIN_DATA}
for deg in [1, 3, 10]:
    model = make_pipeline(StandardScaler(), PolynomialFeatures(deg), LinearRegression())
    scores = cross_val_score(model, X, y, cv=5, scoring="r2")
    print(f"degree {deg:>2}: CV R² = {scores.mean():.3f} ± {scores.std():.3f}")`, { expectOutput: ['degree  3: CV R² = 0.848 ± 0.049'] }),
        demo(4, 'Stage 4 — Training error falls; validation error turns', 'With only 20 training points, training error keeps falling as the degree grows, while validation error falls and then rises sharply.', 'Run. Find the degree with the lowest validation error. Then change random_state in the split: does it move?', 'import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX = np.random.uniform(0, 5, 40).reshape(-1, 1)\ny = np.sin(X.ravel()) + np.random.normal(0, 0.3, 40)\nX_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.5, random_state=0)\nfor d in range(1, 13):\n    m = make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression()).fit(X_tr, y_tr)\n    print(f"degree {d:>2}: train_err={1 - m.score(X_tr, y_tr):.3f}, val_err={1 - m.score(X_val, y_val):.3f}")', { expectOutput: ['degree  5: train_err=0.140, val_err=0.146', 'degree 12: train_err=0.038'] }),
      ]),
      prose({ anchor: 'leakage' },
        '**Leakage: information from outside the training data.** Evaluation is only honest if nothing about the evaluation rows influenced training. Two common leaks besides test peeking:',
        '- **Preprocessing fitted on all rows.** Scaling, imputation, and especially *feature selection* learn from data (Lesson C.04). Selecting "the 10 features most related to the label" using every row, *then* cross-validating, lets the evaluation folds choose the features. On pure noise this can make a useless model look good. Put every learned step inside a pipeline so it is refitted within each training fold.\n- **Related rows on both sides of a split.** When rows share a person, patient, shop or time period (Lesson D.03), a random split puts some of each group in training and some in evaluation. The model can succeed by recognising the group rather than learning something general. Split by group (`GroupKFold`), and for time-ordered data train on the past and evaluate on the future (`TimeSeriesSplit`).',
      ),
      check(
        'Rows are patient visits, several per patient. A random 5-fold CV scores 0.87; GroupKFold by patient scores 0.47. Which should you report for a model meant for new patients?',
        ['0.87 — it is higher', '0.47 — new patients are, by definition, not in the training data; the random split let the model recognise patients it had already seen', 'The average'],
        1,
        'Match the split to how the model will be used. For new patients, no patient may appear on both sides.',
      ),
      notebook('Leakage', [
        demo(5, 'Stage 5 — Feature selection outside versus inside CV', '1000 random features and random labels: there is nothing to learn, so honest accuracy should be near 0.5. Selecting features on all rows first makes CV report far more.', 'Run and compare. Which number is the honest estimate?', 'import numpy as np\nfrom sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(0)\nX = rng.normal(size=(60, 1000))\ny = rng.integers(0, 2, 60)\nX_selected = SelectKBest(f_classif, k=10).fit_transform(X, y)      # uses ALL rows: leak\nleaky = cross_val_score(LogisticRegression(max_iter=1000), X_selected, y, cv=5).mean()\nhonest = cross_val_score(make_pipeline(SelectKBest(f_classif, k=10), LogisticRegression(max_iter=1000)), X, y, cv=5).mean()\nprint(f"selection outside CV: {leaky:.2f}   inside the pipeline: {honest:.2f}")', { expectOutput: ['selection outside CV: 0.82   inside the pipeline: 0.43'] }),
        demo(6, 'Stage 6 — Random split versus grouped split', '20 patients with 10 visits each. Each patient\'s label is random, so nothing generalises to a new patient — but each patient\'s visits look alike, so a 1-nearest-neighbour model can "recognise" patients it has seen.', 'Run and compare. Then switch the model to LogisticRegression and see whether the gap changes.', 'import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.model_selection import cross_val_score, KFold, GroupKFold\nrng = np.random.default_rng(1)\npatients = np.repeat(np.arange(20), 10)\nX = rng.normal(0, 3, (20, 2))[patients] + rng.normal(0, 0.3, (200, 2))\ny = rng.integers(0, 2, 20)[patients]\nm = KNeighborsClassifier(n_neighbors=1)\nrandom_cv = cross_val_score(m, X, y, cv=KFold(5, shuffle=True, random_state=0)).mean()\ngrouped_cv = cross_val_score(m, X, y, cv=GroupKFold(5), groups=patients).mean()\nprint(f"random split: {random_cv:.3f}   grouped by patient: {grouped_cv:.3f}")', { expectOutput: ['random split: 0.865   grouped by patient: 0.47'] }),
      ]),
      prose(
        '**Report the final score with its uncertainty.** A test score is itself an estimate from a finite sample. A simple way to show its uncertainty is a *bootstrap*: resample the test rows with replacement many times, recompute the score, and report the middle 95% of those scores. Report the baseline beside it.',
      ),
      notebook('Reporting', [
        demo(7, 'Stage 7 — A test score with a bootstrap interval', 'The chosen degree-3 model from Stage 2, its test R², and a 95% bootstrap interval from 1000 resamples of the 20 test rows.', 'Run. How wide is the interval? What would make it narrower?', `${SIN_DATA}
from sklearn.metrics import r2_score
X_dev, X_test, y_dev, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = make_pipeline(StandardScaler(), PolynomialFeatures(3), LinearRegression()).fit(X_dev, y_dev)
pred = model.predict(X_test)
rng = np.random.default_rng(0)
boot = []
for _ in range(1000):
    idx = rng.integers(0, len(y_test), len(y_test))
    boot.append(r2_score(y_test[idx], pred[idx]))
low, high = np.percentile(boot, [2.5, 97.5])
print(f"test R² = {r2_score(y_test, pred):.3f}, 95% bootstrap interval {low:.2f} to {high:.2f}")`, { expectOutput: ['test R² = 0.901'] }),
      ]),
      callout('procedure', 'An honest evaluation', '1. Set the test rows aside first; choose a split that matches use (random, by group, or by time).\n2. Fit a baseline.\n3. Compare candidates with cross-validation on the non-test rows, with every learned preprocessing step inside a pipeline.\n4. Choose once; refit on all non-test rows.\n5. Evaluate once on the test rows; report the score, its uncertainty and the baseline.'),
      prose('**Practice.** Challenge 1 chooses a model with cross-validation. Challenge 2 repairs a leaky evaluation. Challenge 3 is a fresh scenario that needs a grouped split, a baseline and a single final test.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Choose with cross-validation', 'hard', {
          prompt: 'Using 5-fold cross-validation on the housing data, compare polynomial degrees 1, 2 and 3 (each as a pipeline with StandardScaler). Store best_degree (the highest mean CV R²) and best_cv_score.',
          instructions: 'Loop over the degrees, compute `cross_val_score(pipeline, X, y, cv=5, scoring="r2").mean()`, then take the best.',
          code: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX = np.random.normal(1500, 400, 150).reshape(-1, 1)\ny = X.ravel() * 150 + 50000 + np.random.normal(0, 30000, 150)\nbest_degree = None\nbest_cv_score = None',
          testCode: `import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import make_pipeline
scores = {d: cross_val_score(make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression()), X, y, cv=5, scoring="r2").mean() for d in [1, 2, 3]}
assert best_degree in (1, 2, 3), "best_degree should be 1, 2 or 3"
assert best_degree == max(scores, key=scores.get), f"The highest mean CV R² is for degree {max(scores, key=scores.get)}"
assert abs(best_cv_score - scores[best_degree]) < 1e-9, "best_cv_score should be the mean CV R² of the chosen degree"
"SUCCESS: the choice was made with cross-validation, leaving any test data untouched."`,
          hint: 'scores = {d: cross_val_score(make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression()), X, y, cv=5, scoring="r2").mean() for d in [1, 2, 3]}',
          solution: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX = np.random.normal(1500, 400, 150).reshape(-1, 1)\ny = X.ravel() * 150 + 50000 + np.random.normal(0, 30000, 150)\nscores = {d: cross_val_score(make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression()), X, y, cv=5, scoring="r2").mean() for d in [1, 2, 3]}\nbest_degree = max(scores, key=scores.get)\nbest_cv_score = scores[best_degree]',
        }),
        exercise(12, 2, 'Challenge 2 — Repair a leaky evaluation', 'medium', {
          prompt: 'The code selects features and scales using all rows, then cross-validates. On this pure-noise data the honest accuracy is near 0.5. Rewrite it so every learned step is inside a pipeline, and store the honest mean CV accuracy in honest_score.',
          instructions: '`make_pipeline(StandardScaler(), SelectKBest(f_classif, k=10), LogisticRegression(max_iter=1000))`, then `cross_val_score` on the raw X.',
          code: 'import numpy as np\nfrom sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(0)\nX = rng.normal(size=(60, 1000))\ny = rng.integers(0, 2, 60)\n\nX_ready = SelectKBest(f_classif, k=10).fit_transform(StandardScaler().fit_transform(X), y)\nhonest_score = cross_val_score(LogisticRegression(max_iter=1000), X_ready, y, cv=5).mean()',
          testCode: `assert honest_score < 0.65, f"A score of {honest_score:.2f} on pure noise means information is still leaking: selection must happen inside each training fold (put it in the pipeline)"
assert honest_score > 0.2, "Use cross_val_score on the pipeline with the raw X"
"SUCCESS: with selection inside the pipeline, the score falls to chance level — the honest answer for data with no signal."`,
          hint: 'pipe = make_pipeline(StandardScaler(), SelectKBest(f_classif, k=10), LogisticRegression(max_iter=1000)); honest_score = cross_val_score(pipe, X, y, cv=5).mean()',
          solution: 'import numpy as np\nfrom sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(0)\nX = rng.normal(size=(60, 1000))\ny = rng.integers(0, 2, 60)\npipe = make_pipeline(StandardScaler(), SelectKBest(f_classif, k=10), LogisticRegression(max_iter=1000))\nhonest_score = cross_val_score(pipe, X, y, cv=5).mean()',
          misconceptions: [{ code: 'import numpy as np\nfrom sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.pipeline import make_pipeline\nrng = np.random.default_rng(0)\nX = rng.normal(size=(60, 1000))\ny = rng.integers(0, 2, 60)\nX_sel = SelectKBest(f_classif, k=10).fit_transform(X, y)\nhonest_score = cross_val_score(make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)), X_sel, y, cv=5).mean()', feedback: 'information is still leaking' }],
        }),
        exercise(13, 3, 'Challenge 3 — A new scenario: sensors on machines', 'hard', {
          prompt: 'Readings come from 24 machines (groups), 8 readings each; the goal is to predict failure for NEW machines. Hold out machines 18–23 as the test set. On the other machines, use GroupKFold(4) to compute baseline_cv (a DummyClassifier), knn_cv (1-nearest neighbour) and logreg_cv (LogisticRegression). Choose chosen ("knn" or "logreg") by CV, refit it on all non-test machines, and store test_score once.',
          prose: ['Why GroupKFold? A random split would put readings from the same machine on both sides and reward recognising machines rather than predicting failure.'],
          instructions: 'Build masks with `np.isin(machine, range(18, 24))`. Pass `groups=machine[train_mask]` to cross_val_score.',
          code: 'import numpy as np\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, GroupKFold, KFold\nrng = np.random.default_rng(4)\nmachine = np.repeat(np.arange(24), 8)\nwear = rng.uniform(0, 1, 24)[machine] + rng.normal(0, 0.05, 192)\nquirk = rng.normal(0, 3, (24, 1))[machine] + rng.normal(0, 0.2, (192, 1))\nX = np.column_stack([wear, quirk])\ny = (wear > 0.6).astype(int)\n\nbaseline_cv = knn_cv = logreg_cv = None\nchosen = None\ntest_score = None',
          testCode: `import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, GroupKFold
test = np.isin(machine, range(18, 24)); tr = ~test
g = machine[tr]
exp = {name: cross_val_score(m, X[tr], y[tr], cv=GroupKFold(4), groups=g).mean() for name, m in [("base", DummyClassifier()), ("knn", KNeighborsClassifier(n_neighbors=1)), ("logreg", LogisticRegression())]}
assert baseline_cv is not None and np.isclose(baseline_cv, exp["base"]), f"baseline_cv should use GroupKFold(4) on the non-test machines: {exp['base']:.3f}"
from sklearn.model_selection import KFold
leaky = cross_val_score(KNeighborsClassifier(n_neighbors=1), X[tr], y[tr], cv=KFold(4, shuffle=True, random_state=0)).mean()
assert knn_cv is not None and not np.isclose(knn_cv, leaky), "That kNN score comes from a random split, which puts readings from the same machine on both sides: use GroupKFold with groups=machine"
assert np.isclose(knn_cv, exp["knn"]) and np.isclose(logreg_cv, exp["logreg"]), f"Expected kNN {exp['knn']:.3f} and logreg {exp['logreg']:.3f} with GroupKFold(4)"
assert chosen == max(("knn", exp["knn"]), ("logreg", exp["logreg"]), key=lambda t: t[1])[0], "Choose the candidate with the higher grouped CV score"
final = (KNeighborsClassifier(n_neighbors=1) if chosen == "knn" else LogisticRegression()).fit(X[tr], y[tr])
assert np.isclose(test_score, final.score(X[test], y[test])), "test_score should be the chosen model, refitted on all non-test machines, scored once on machines 18–23"
"SUCCESS: grouped CV, a baseline, one choice, one final test on unseen machines."`,
          hint: 'test = np.isin(machine, range(18, 24)); tr = ~test; cv = GroupKFold(4); knn_cv = cross_val_score(KNeighborsClassifier(n_neighbors=1), X[tr], y[tr], cv=cv, groups=machine[tr]).mean()',
          solution: 'import numpy as np\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, GroupKFold\nrng = np.random.default_rng(4)\nmachine = np.repeat(np.arange(24), 8)\nwear = rng.uniform(0, 1, 24)[machine] + rng.normal(0, 0.05, 192)\nquirk = rng.normal(0, 3, (24, 1))[machine] + rng.normal(0, 0.2, (192, 1))\nX = np.column_stack([wear, quirk])\ny = (wear > 0.6).astype(int)\ntest = np.isin(machine, range(18, 24))\ntr = ~test\ncv, g = GroupKFold(4), machine[tr]\nbaseline_cv = cross_val_score(DummyClassifier(), X[tr], y[tr], cv=cv, groups=g).mean()\nknn_cv = cross_val_score(KNeighborsClassifier(n_neighbors=1), X[tr], y[tr], cv=cv, groups=g).mean()\nlogreg_cv = cross_val_score(LogisticRegression(), X[tr], y[tr], cv=cv, groups=g).mean()\nchosen = "knn" if knn_cv > logreg_cv else "logreg"\nmodel = KNeighborsClassifier(n_neighbors=1) if chosen == "knn" else LogisticRegression()\ntest_score = model.fit(X[tr], y[tr]).score(X[test], y[test])',
          misconceptions: [{ code: 'import numpy as np\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, KFold, GroupKFold\nrng = np.random.default_rng(4)\nmachine = np.repeat(np.arange(24), 8)\nwear = rng.uniform(0, 1, 24)[machine] + rng.normal(0, 0.05, 192)\nquirk = rng.normal(0, 3, (24, 1))[machine] + rng.normal(0, 0.2, (192, 1))\nX = np.column_stack([wear, quirk])\ny = (wear > 0.6).astype(int)\ntest = np.isin(machine, range(18, 24)); tr = ~test\ncv = KFold(4, shuffle=True, random_state=0)\nbaseline_cv = cross_val_score(DummyClassifier(), X[tr], y[tr], cv=GroupKFold(4), groups=machine[tr]).mean()\nknn_cv = cross_val_score(KNeighborsClassifier(n_neighbors=1), X[tr], y[tr], cv=cv).mean()\nlogreg_cv = 0.5\nchosen = "knn"\ntest_score = 0.5', feedback: 'use GroupKFold with groups=machine' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Overfitting: great on training rows, worse on new rows. A large train–held-out gap is the usual warning.',
    'Train fits; validation (or CV) chooses; test is used once for the chosen model. Always report a baseline.',
    'Every learned preprocessing step belongs inside a pipeline, refitted within each training fold.',
    'Split the way the model will be used: by group for new people or machines, by time for the future.',
    'Report the final score with its uncertainty (e.g. a bootstrap interval).',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Train R² = 0.99, held-out R² = 0.42. What does this indicate?',
      options: ['An excellent model', 'Overfitting: the model fits the training rows far better than new rows; a simpler model with better validation performance would likely be preferable', 'The held-out data are wrong'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Why must the test set not be used to choose between models?',
      options: ['It is too small', 'Choosing by test score makes that score optimistically biased, so it no longer estimates performance on new data', 'sklearn forbids it'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A colleague scales and selects features on the whole dataset, then cross-validates. What is wrong?',
      options: ['Nothing', 'The preprocessing learned from the evaluation folds, leaking information; put it inside a pipeline', 'Scaling is never allowed'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Data contain several rows per customer; the model will be used for new customers. Which CV should you use?',
      options: ['KFold with shuffling', 'GroupKFold with customer as the group', 'No CV'],
      correct: 1,
    },
  ],
}
