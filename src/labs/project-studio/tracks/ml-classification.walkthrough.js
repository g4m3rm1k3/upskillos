// What a learner does at each step of "Classification — A Spam Detector" (ml-classification),
// for the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 8.1 ──────────────────────────────────────────────────────────────────
  '08-01-probability-by-counting#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '08-01-probability-by-counting#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '08-01-probability-by-counting#Messages and words': {
    wrong: [
      { name: 'kept the labels as text', edit: [['labels.append(1 if row["label"] == "spam" else 0)', 'labels.append(row["label"])']], fails: [0] },
      { name: 'did not lowercase', edit: [['TOKEN.findall(text.lower())', 'TOKEN.findall(text)']], fails: [0] },
    ],
  },
  '08-01-probability-by-counting#Probability is a fraction': {
    wrong: [
      { name: 'counted occurrences, not messages', edit: [['return sum(word in words(text) for text in with_label) / len(with_label)', 'return sum(words(text).count(word) for text in with_label) / len(with_label)']], fails: [0] },
      { name: 'divided by every message', edit: [['return sum(containing) / len(containing)', 'return sum(containing) / len(labels)']], fails: [0] },
    ],
  },
  "08-01-probability-by-counting#Bayes' rule: turning one around into the other": {
    wrong: [{ name: 'left out the prior', edit: [['return word_if_spam * spam / p_word', 'return word_if_spam / p_word']], fails: [0] }],
  },

  // ── 8.2 ──────────────────────────────────────────────────────────────────
  '08-02-bag-of-words#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-02-bag-of-words#Hold out the test messages first': {
    wrong: [{ name: 'held out a fifth', edit: [['test_size=0.25', 'test_size=0.2']], fails: [0] }],
  },
  '08-02-bag-of-words#The vocabulary and the counts': {
    wrong: [
      { name: 'did not sort the vocabulary', edit: [['return sorted({word for text in texts for word in words(text)})', 'return list({word for text in texts for word in words(text)})']], fails: [0] },
      { name: 'recorded presence, not counts', edit: [['counts[row, column[word]] += 1', 'counts[row, column[word]] = 1']], fails: [0] },
    ],
  },

  // ── 8.3 ──────────────────────────────────────────────────────────────────
  '08-03-naive-bayes#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-03-naive-bayes#Fit: count, smooth, take logs': {
    wrong: [
      { name: 'no smoothing', edit: [['for label in (0, 1)]) + self.smoothing', 'for label in (0, 1)])']], fails: [0] },
      { name: 'divided by the grand total', edit: [['counts / counts.sum(axis=1, keepdims=True)', 'counts / counts.sum()']], fails: [0] },
    ],
  },
  '08-03-naive-bayes#Predict: add up the evidence': {
    wrong: [
      { name: 'did not subtract the larger score', edit: [['        scores = scores - scores.max(axis=1, keepdims=True)\n', '']], fails: [0] },
      { name: 'left out the prior', edit: [['return X @ self.log_word_.T + self.log_prior_', 'return X @ self.log_word_.T']], fails: [0] },
    ],
  },

  // ── 8.4 ──────────────────────────────────────────────────────────────────
  '08-04-logistic-regression#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-04-logistic-regression#From a score to a probability': {
    wrong: [{ name: 'e to the plus z', edit: [['1 / (1 + np.exp(-z))', '1 / (1 + np.exp(z))']], fails: [0] }],
  },
  '08-04-logistic-regression#What to minimise: log loss': {
    wrong: [{ name: 'forgot the minus sign', edit: [['float(-np.mean(', 'float(np.mean(']], fails: [0] }],
  },
  '08-04-logistic-regression#The gradient, and a penalty': {
    wrong: [
      { name: 'truth minus prediction', edit: [['error = sigmoid(X @ w + b) - y', 'error = y - sigmoid(X @ w + b)']], fails: [0] },
      { name: 'penalty slope not divided by n', edit: [['+ penalty * w / n,', '+ penalty * w,']], fails: [0] },
    ],
  },
  '08-04-logistic-regression#Training': {
    wrong: [{ name: 'stepped uphill', edit: [['w, b = w - self.learning_rate * grad_w, b - self.learning_rate * grad_b', 'w, b = w + self.learning_rate * grad_w, b + self.learning_rate * grad_b']], fails: [0] }],
  },

  // ── 8.5 ──────────────────────────────────────────────────────────────────
  '08-05-is-it-any-good#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '08-05-is-it-any-good#Four outcomes, not two': {
    wrong: [{ name: 'accuracy counted only caught spam', edit: [['return (tp + tn) / (tp + fp + fn + tn)', 'return tp / (tp + fp + fn + tn)']], fails: [0] }],
  },
  '08-05-is-it-any-good#Precision and recall': {
    wrong: [{ name: 'precision and recall swapped', edit: [['    tp, fp, _, _ = confusion(y, predicted)\n    return tp / (tp + fp) if tp + fp else 0.0', '    tp, _, fn, _ = confusion(y, predicted)\n    return tp / (tp + fn) if tp + fn else 0.0']], fails: [0] }],
  },
  '08-05-is-it-any-good#The threshold is a choice': {
    wrong: [{ name: 'ties counted as wins', edit: [['+ 0.5 * np.sum(p == negatives)', '+ np.sum(p == negatives)']], fails: [0] }],
  },
};
