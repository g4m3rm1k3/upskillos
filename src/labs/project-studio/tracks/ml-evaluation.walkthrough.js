// What a learner does at each step of "Evaluation — Is the Model Any Good?" (ml-evaluation),
// for the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 7.1 ──────────────────────────────────────────────────────────────────
  '07-01-overfitting#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '07-01-overfitting#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '07-01-overfitting#Data with a known answer': {
    wrong: [
      { name: 'ignored the seed', edit: [['np.random.default_rng(seed)', 'np.random.default_rng()']], fails: [0] },
      { name: 'noise of size 1', edit: [['rng.normal(0, noise, n)', 'rng.normal(0, 1, n)']], fails: [0] },
    ],
  },
  '07-01-overfitting#Curves from a linear model': {
    wrong: [{ name: 'powers from 0 to degree − 1', edit: [['range(1, degree + 1)', 'range(degree)']], fails: [0] }],
  },
  '07-01-overfitting#Training error and test error': {
    wrong: [{
      name: 'measured the test error on the training points',
      patch: { 'poly.py': [['rmse(y_test, model.predict(powers(x_test, degree)))', 'rmse(y_train, model.predict(powers(x_train, degree)))']] },
      typeFile: true,
      fails: [0, 1],
    }],
  },

  // ── 7.2 ──────────────────────────────────────────────────────────────────
  '07-02-regularisation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-02-regularisation#Standardise first': {
    wrong: [{ name: 'divided by the variance', edit: [['return (X - self.mean_) / self.std_', 'return (X - self.mean_) / self.std_ ** 2']], fails: [0] }],
  },
  '07-02-regularisation#Ridge from the normal equations': {
    wrong: [{ name: 'added the penalty to every entry, not the diagonal', edit: [['Z.T @ Z + penalty * np.eye(k)', 'Z.T @ Z + penalty']], fails: [0] }],
  },
  '07-02-regularisation#Choose the penalty on validation data': {
    wrong: [{ name: 'chose by test error', edit: [['key=lambda row: row["validation"]', 'key=lambda row: row["test"]']], fails: [0] }],
  },

  // ── 7.3 ──────────────────────────────────────────────────────────────────
  '07-03-cross-validation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-03-cross-validation#Load the houses': {
    wrong: [{ name: 'skipped rows with a blank anywhere', edit: [['if "" in needed:', 'if "" in row.values():']], fails: [0] }],
  },
  '07-03-cross-validation#Folds by hand': {
    wrong: [
      { name: 'the newer random generator', edit: [['np.random.RandomState(seed).shuffle(order)', 'np.random.default_rng(seed).shuffle(order)']], fails: [0] },
      { name: 'the extra points went to the last folds', edit: [['(1 if fold < n % k else 0)', '(1 if fold >= k - n % k else 0)']], fails: [0] },
    ],
  },
  '07-03-cross-validation#Score every fold': {
    wrong: [{
      name: 'measured on the training rows',
      edit: [['        predictions = model.predict(X[validation])\n        errors.append(float(np.sqrt(np.mean((y[validation] - predictions) ** 2))))', '        predictions = model.predict(X[train])\n        errors.append(float(np.sqrt(np.mean((y[train] - predictions) ** 2))))']],
      fails: [0],
    }],
  },

  // ── 7.4 ──────────────────────────────────────────────────────────────────
  '07-04-leakage#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '07-04-leakage#Choose the columns most related to price': {
    wrong: [
      { name: 'kept the weakest columns', edit: [['np.argsort(strength)[::-1][:k]', 'np.argsort(strength)[:k]']], fails: [0] },
      { name: 'ignored negative correlation', edit: [['strength = [abs(correlation(X[:, column], y))', 'strength = [correlation(X[:, column], y)']], fails: [0] },
    ],
  },
  '07-04-leakage#Choose inside each fold': {
    wrong: [{ name: 'chose the columns from the validation rows', edit: [['        columns = top_columns(X[train], y[train], k)\n', '        columns = top_columns(X[validation], y[validation], k)\n']], fails: [0] }],
  },
  '07-04-leakage#A Pipeline makes it the default': {
    wrong: [{ name: 'cv=5, which does not shuffle', edit: [['cv=KFold(n_splits=5, shuffle=True, random_state=seed)', 'cv=5']], fails: [0] }],
  },
};
