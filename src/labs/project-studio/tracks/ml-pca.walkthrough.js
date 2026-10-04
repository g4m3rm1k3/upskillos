// What a learner does at each step of "Dimensionality Reduction — Inspection Data" (ml-pca), for
// the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 11.1 ─────────────────────────────────────────────────────────────────
  '11-01-covariance#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '11-01-covariance#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '11-01-covariance#Load the measurements': {
    wrong: [{ name: 'kept the part name as a feature', edit: [['features = next(reader)[1:]', 'features = next(reader)']], fails: [0] }],
  },
  '11-01-covariance#Covariance: do two columns move together?': {
    wrong: [
      { name: 'did not centre the columns', edit: [['    centred = X - X.mean(axis=0)\n', '    centred = X\n']], fails: [0] },
      { name: 'multiplied the wrong way round', edit: [['return centred.T @ centred / len(X)', 'return centred @ centred.T / len(X)']], fails: [0] },
    ],
  },

  // ── 11.2 ─────────────────────────────────────────────────────────────────
  '11-02-principal-components#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '11-02-principal-components#Variance along a direction': {
    wrong: [{ name: 'only one multiplication', edit: [['return float(direction @ C @ direction)', 'return float((C @ direction).sum())']], fails: [0] }],
  },
  '11-02-principal-components#Finding the longest direction: power iteration': {
    wrong: [{ name: 'never scaled back to length 1', edit: [['        v = v / np.linalg.norm(v)\n', '']], fails: [0] }],
  },
  '11-02-principal-components#The next directions: take away what\'s found': {
    wrong: [{ name: 'did not deflate', edit: [['        C = C - variance * np.outer(v, v)\n', '']], fails: [0] }],
  },

  // ── 11.3 ─────────────────────────────────────────────────────────────────
  '11-03-using-the-components#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '11-03-using-the-components#Scores and reconstruction': {
    wrong: [{ name: 'forgot to undo the scaling', edit: [['return self.scores(X) @ self.directions_ * self.std_ + self.mean_', 'return self.scores(X) @ self.directions_']], fails: [0] }],
  },
  '11-03-using-the-components#What the components can\'t explain': {
    wrong: [{ name: 'measured the residual in micrometres', edit: [['        Z = self.scale(X)\n        return ((Z - self.scores(X) @ self.directions_) ** 2).sum(axis=1)', '        return ((X - self.reconstruct(X)) ** 2).sum(axis=1)']], fails: [0] }],
  },
};
