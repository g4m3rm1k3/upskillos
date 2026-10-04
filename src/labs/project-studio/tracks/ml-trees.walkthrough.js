// What a learner does at each step of "Trees and Neighbours — Predicting Defects" (ml-trees),
// for the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 9.1 ──────────────────────────────────────────────────────────────────
  '09-01-nearest-neighbours#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '09-01-nearest-neighbours#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '09-01-nearest-neighbours#Runs as vectors': {
    wrong: [{ name: 'material A marked as 1', edit: [['1.0 if row["material"] == "B" else 0.0', '1.0 if row["material"] == "A" else 0.0']], fails: [0] }],
  },
  '09-01-nearest-neighbours#Nearest neighbours, by hand': {
    wrong: [
      { name: 'the minority wins', edit: [['y_train[nearest].mean() > 0.5', 'y_train[nearest].mean() < 0.5']], fails: [0] },
      { name: 'summed over the whole table', edit: [['((X_train - x) ** 2).sum(axis=1)', '((X_train - x) ** 2).sum()']], fails: [0] },
    ],
  },

  // ── 9.2 ──────────────────────────────────────────────────────────────────
  '09-02-one-good-question#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '09-02-one-good-question#How mixed is a group? Gini impurity': {
    wrong: [{ name: 'forgot the good runs', edit: [['return float(1 - p ** 2 - (1 - p) ** 2)', 'return float(1 - p ** 2)']], fails: [0] }],
  },
  '09-02-one-good-question#The best threshold for one setting': {
    wrong: [
      { name: 'thresholds at the values, not between them', edit: [['for threshold in (distinct[:-1] + distinct[1:]) / 2:', 'for threshold in distinct[:-1]:']], fails: [0] },
      { name: 'kept the worst split', edit: [['        if impurity < best_impurity:', '        if impurity > best_impurity:']], fails: [0] },
    ],
  },
  '09-02-one-good-question#The best question overall': {
    wrong: [{ name: 'skipped the first setting', edit: [['for feature in range(X.shape[1]):', 'for feature in range(1, X.shape[1]):']], fails: [0] }],
  },

  // ── 9.3 ──────────────────────────────────────────────────────────────────
  '09-03-growing-a-tree#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '09-03-growing-a-tree#A function that calls itself': {
    wrong: [{ name: 'never went a level deeper', edit: [['max_depth, depth + 1),', 'max_depth, depth),'], ['max_depth, depth + 1),', 'max_depth, depth),']], fails: [0] }],
  },
  '09-03-growing-a-tree#Predicting: follow the answers': {
    wrong: [{ name: 'yes and no swapped', edit: [['node = node["yes"] if x[node["feature"]] <= node["threshold"] else node["no"]', 'node = node["no"] if x[node["feature"]] <= node["threshold"] else node["yes"]']], fails: [0] }],
  },
  '09-03-growing-a-tree#Reading the tree': {
    wrong: [{ name: 'no indentation', edit: [['rules(node["yes"], names, indent + "    ")', 'rules(node["yes"], names, indent)'], ['rules(node["no"], names, indent + "    ")', 'rules(node["no"], names, indent)']], fails: [0] }],
  },

  // ── 9.4 ──────────────────────────────────────────────────────────────────
  '09-04-random-forests#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '09-04-random-forests#Different data for every tree: the bootstrap': {
    wrong: [{ name: 'shuffled without replacement', edit: [['return rng.integers(0, n, n)', 'return rng.permutation(n)']], fails: [0] }],
  },
  '09-04-random-forests#A forest votes': {
    wrong: [{ name: 'columns in the wrong order', edit: [['return np.column_stack([1 - votes, votes])', 'return np.column_stack([votes, 1 - votes])']], fails: [0] }],
  },
  '09-04-random-forests#Measuring it fairly': {
    wrong: [{ name: 'scored on the training rows', edit: [['scores.append(np.mean(model.predict(X[validation]) == y[validation]))', 'scores.append(np.mean(model.predict(X[train]) == y[train]))']], fails: [0] }],
  },
};
