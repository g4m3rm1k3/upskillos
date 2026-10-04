// What a learner does at each step of "Boosting and SVMs — Surface Finish and a Tolerance Zone"
// (ml-boosting), for the walkthrough test (mlProduction.desktop.test.js). The entry format is
// described in ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 18.1 ─────────────────────────────────────────────────────────────────
  '18-01-fixing-the-mistakes#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '18-01-fixing-the-mistakes#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '18-01-fixing-the-mistakes#Load the passes': {
    wrong: [{ name: 'made the indicator 1 for coolant on', edit: [['1.0 if row["coolant"] == "no" else 0.0', '1.0 if row["coolant"] == "yes" else 0.0']], fails: [0] }],
  },
  '18-01-fixing-the-mistakes#Fixing the mistakes, one tree at a time': {
    wrong: [{ name: 'fitted every tree to the roughness, not the residuals', edit: [['.fit(X_train, residual)', '.fit(X_train, ra_train)']], fails: [0] }],
  },
  '18-01-fixing-the-mistakes#Small steps: the learning rate': {
    wrong: [
      { name: 'forgot the rate while fitting', edit: [['prediction = prediction + self.rate * tree.predict(X)', 'prediction = prediction + tree.predict(X)']], fails: [0] },
      { name: 'fitted every tree to the first residuals', edit: [['.fit(X, y - prediction)', '.fit(X, y - self.start_)']], fails: [0] },
      { name: 'gave every tree its own copy of the seed', edit: [['random_state=random)', 'random_state=self.seed)']], fails: [0] },
    ],
  },
  '18-01-fixing-the-mistakes#How many trees?': {
    wrong: [{ name: 'used a rate of 1', edit: [['boost.Boosted(n_trees=trees)', 'boost.Boosted(n_trees=trees, rate=1.0)']], fails: [0] }],
  },

  // ── 18.2 ─────────────────────────────────────────────────────────────────
  '18-02-how-many-trees#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '18-02-how-many-trees#Every size of model from one fit': {
    wrong: [
      { name: 'counted trees from 0', edit: [['return best + 1, float(errors[best])', 'return best, float(errors[best])']], fails: [0] },
      { name: 'yielded before adding the tree', edit: [['            prediction = prediction + self.rate * tree.predict(X)\n            yield prediction', '            yield prediction\n            prediction = prediction + self.rate * tree.predict(X)']], fails: [0] },
    ],
  },
  '18-02-how-many-trees#Choosing on validation, reporting on test': {
    wrong: [{ name: 'chose the number of trees on the test set', edit: [['boost.best_size(model, X_valid, ra_valid)', 'boost.best_size(model, X_test, ra_test)']], fails: [0] }],
  },
  '18-02-how-many-trees#The library version: early stopping built in': {
    wrong: [{ name: 'left out early stopping', edit: [['validation_fraction=0.2, n_iter_no_change=20, ', '']], fails: [0] }],
  },

  // ── 18.3 ─────────────────────────────────────────────────────────────────
  '18-03-the-widest-street#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '18-03-the-widest-street#Load the holes': {
    wrong: [{ name: 'labelled ok as 0', edit: [['verdicts.append(1 if row["verdict"] == "reject" else -1)', 'verdicts.append(1 if row["verdict"] == "reject" else 0)']], fails: [0] }],
  },
  '18-03-the-widest-street#The widest street': {
    wrong: [
      { name: 'used the score as the distance', edit: [['return scores(w, b, X) / np.linalg.norm(w)', 'return scores(w, b, X)']], fails: [0] },
      { name: 'let the hinge go negative', edit: [['return np.maximum(0, 1 - y * scores(w, b, X))', 'return 1 - y * scores(w, b, X)']], fails: [0] },
      { name: 'averaged the hinge loss instead of adding it up', edit: [['C * hinge(w, b, X, y).sum()', 'C * hinge(w, b, X, y).mean()']], fails: [0] },
    ],
  },
  '18-03-the-widest-street#Give it the right feature': {
    wrong: [{ name: 'left out the scaler', edit: [['    model = make_pipeline(StandardScaler(), SVC(kernel="linear", C=C))', '    model = SVC(kernel="linear", C=C)']], fails: [0] }],
  },
  '18-03-the-widest-street#The kernel trick': {
    wrong: [
      { name: 'forgot to square the dot product', edit: [['return (A @ B.T) ** 2', 'return A @ B.T']], fails: [0] },
      { name: 'lost the minus sign in the RBF kernel', edit: [['return np.exp(-gamma * squared)', 'return np.exp(gamma * squared)']], fails: [0] },
    ],
  },
  '18-03-the-widest-street#Let the kernel find the circle': {
    wrong: [{ name: 'left out the scaler', edit: [['        model = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=C, gamma=gamma))', '        model = SVC(kernel="rbf", C=C, gamma=gamma)']], fails: [0] }],
  },
};
