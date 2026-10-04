// What a learner does at each step of "Clustering — Customer Segments" (ml-clustering), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 10.1 ─────────────────────────────────────────────────────────────────
  '10-01-k-means#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '10-01-k-means#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '10-01-k-means#Assign and update': {
    wrong: [
      { name: 'farthest centre instead of nearest', edit: [['return distances.argmin(axis=1)', 'return distances.argmax(axis=1)']], fails: [0] },
      { name: 'averaged across the columns', edit: [['X[labels == cluster].mean(axis=0)', 'X[labels == cluster].mean(axis=1)']], fails: [0] },
    ],
  },
  '10-01-k-means#Repeat until nothing changes': {
    wrong: [{ name: 'stopped after the first update', edit: [['        if np.array_equal(new_labels, labels):\n            return centres, labels, step', '        return centres, new_labels, step']], fails: [0] }],
  },

  // ── 10.2 ─────────────────────────────────────────────────────────────────
  '10-02-how-many-groups#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '10-02-how-many-groups#Problem 1: the start matters': {
    wrong: [{ name: 'the same start every time', edit: [['kmeans(X, X[rng.choice(len(X), size=k, replace=False)])', 'kmeans(X, X[np.random.default_rng(seed).choice(len(X), size=k, replace=False)])']], fails: [0] }],
  },
  '10-02-how-many-groups#Problem 3: how many groups?': {
    wrong: [
      { name: 'counted the point itself as a neighbour', edit: [['a = distances[own].sum() / (own.sum() - 1)', 'a = distances[own].mean()']], fails: [0] },
      { name: 'farthest other cluster instead of nearest', edit: [['b = min(distances[labels == other].mean()', 'b = max(distances[labels == other].mean()']], fails: [0] },
    ],
  },

  // ── 10.3 ─────────────────────────────────────────────────────────────────
  '10-03-using-the-segments#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '10-03-using-the-segments#A segmenter that remembers': {
    wrong: [{ name: 'scaled new rows by their own mean and spread', edit: [['        return (X - self.mean_) / self.std_', '        return (X - X.mean(axis=0)) / X.std(axis=0)']], fails: [0] }],
  },
  '10-03-using-the-segments#Odd ones out': {
    wrong: [{ name: 'flagged from the nearest customer, not the farthest', edit: [['self.farthest_ = float(self.distance(X).max())', 'self.farthest_ = float(self.distance(X).min())']], fails: [0] }],
  },
};
