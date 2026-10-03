// What a learner does at each step of "Your First Model — Predict a Number" (ml-first-model), for
// the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 3.1 ──────────────────────────────────────────────────────────────────
  '03-01-a-line-through-the-points#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '03-01-a-line-through-the-points#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '03-01-a-line-through-the-points#Load X and y': {
    wrong: [
      { name: 'made X one-dimensional', edit: [['X = np.array([[float(row[name]) for name in features] for row in rows])', 'X = np.array([float(row[name]) for row in rows for name in features])']], fails: [0] },
      { name: 'kept houses with missing values', edit: [['if all(row[name] != "" for name in [*features, target])', 'if row[target] != ""'], ['float(row[name]) for name in features', 'float(row[name] or 0) for name in features']], fails: [0] },
    ],
  },
  '03-01-a-line-through-the-points#The model: a line': {
    wrong: [
      { name: 'forgot the bias', edit: [['return X @ w + b', 'return X @ w']], fails: [0] },
      { name: 'rmse without the square root', edit: [['return float(np.sqrt(mse(y, predictions)))', 'return mse(y, predictions)']], fails: [0] },
    ],
  },
  '03-01-a-line-through-the-points#Try a line by hand': {
    wrong: [{ name: 'swapped w and b', edit: [['w = float(sys.argv[1])\nb = float(sys.argv[2])', 'w = float(sys.argv[2])\nb = float(sys.argv[1])']], fails: [0] }],
  },
  '03-01-a-line-through-the-points#Search for the best line': {
    wrong: [{ name: 'kept the worst line', edit: [['if best is None or error < best[0]:', 'if best is None or error > best[0]:']], fails: [0] }],
  },

  // ── 3.2 ──────────────────────────────────────────────────────────────────
  '03-02-gradient-descent#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-02-gradient-descent#The gradient of the loss': {
    wrong: [
      { name: 'used X instead of its transpose', edit: [['2 / n * (X.T @ errors)', '2 / n * (errors @ X.T @ X)']], fails: [0] },
      { name: 'errors the wrong way round', edit: [['errors = predict(X, w, b) - y', 'errors = y - predict(X, w, b)']], fails: [0] },
    ],
  },
  '03-02-gradient-descent#The training loop': {
    wrong: [{ name: 'forgot to update the bias', edit: [['        b = b - rate * grad_b\n', '']], fails: [0] }],
  },
  '03-02-gradient-descent#Standardise the features': {
    wrong: [
      { name: 'transform recomputes the statistics', edit: [['        return (X - self.mean_) / self.std_', '        return (X - X.mean(axis=0)) / X.std(axis=0)']], fails: [0] },
      { name: 'unscale forgets to adjust the bias', edit: [['return w_original, b - float(w_original @ self.mean_)', 'return w_original, b']], fails: [0] },
    ],
  },
  '03-02-gradient-descent#Train again, on standardised features': {
    wrong: [{ name: 'reported the standardised weights', edit: [['w, b = scaler.unscale(w_scaled, b_scaled)', 'w, b = w_scaled, b_scaled\nX = scaler.transform(X)']], fails: [0] }],
  },

  // ── 3.3 ──────────────────────────────────────────────────────────────────
  '03-03-your-own-linear-regression#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-03-your-own-linear-regression#A model is an object': {
    wrong: [
      { name: 'kept the weights in standardised units', edit: [['self.coef_, self.intercept_ = self.scaler_.unscale(w, b)', 'self.coef_, self.intercept_ = w, b']], fails: [0] },
      { name: 'fit does not return the model', edit: [['        return self\n', '']], fails: [0] },
    ],
  },
  '03-03-your-own-linear-regression#Held-out houses': {
    wrong: [
      { name: 'did not shuffle', edit: [['order = np.random.default_rng(seed).permutation(len(y))', 'order = np.arange(len(y))[::-1]']], fails: [0] },
      { name: 'shuffled X and y separately', edit: [['return X[train], X[test], y[train], y[test]', 'return X[train], X[test], y[np.sort(train)], y[np.sort(test)]']], fails: [0] },
    ],
  },
  '03-03-your-own-linear-regression#Does it generalise?': {
    wrong: [{ name: 'baseline used the test mean', edit: [['np.full_like(y_test, y_train.mean())', 'np.full_like(y_test, y_test.mean())']], fails: [0] }],
  },

  // ── 3.4 ──────────────────────────────────────────────────────────────────
  '03-04-scikit-learn#Install scikit-learn': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added it to requirements.txt but did not install it', fails: [0] }],
  },
  '03-04-scikit-learn#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '03-04-scikit-learn#Metrics: how good is good?': {
    wrong: [
      { name: 'R² divided by the standard deviation', edit: [['/ float(np.var(y))', '/ float(np.std(y))']], fails: [0] },
      { name: 'MAE without the absolute value', edit: [['np.mean(np.abs(predictions - y))', 'np.mean(predictions - y)']], fails: [0] },
    ],
  },
  '03-04-scikit-learn#Run it': {
    wrong: [{ name: 'imports main but never calls it', edit: [['raise SystemExit(main())', '']], fails: [0, 1, 2] }],
  },
};
