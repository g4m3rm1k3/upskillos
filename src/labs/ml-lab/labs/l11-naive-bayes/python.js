export default {
  filename: 'naive_bayes.py', packages: ['numpy'],
  title: 'A text classifier from counts and logs.',
  intro: 'Build the whole pipeline: a tokenizer, a training-only vocabulary, count vectors, multinomial Naive Bayes with Laplace smoothing, and log-space prediction with the log-sum-exp trick. The checks recompute everything by hand on a tiny corpus and push a very long document through to test numerical stability.',
  steps: [
    '`tokenize(text)` → lowercase runs of letters/digits (use `re.findall(r"[a-z0-9]+", text.lower())`).',
    '`build_vocab(docs)` → dict word → column index, sorted alphabetically, from **training** documents only.',
    '`count_matrix(docs, vocab)` → `(len(docs), len(vocab))` integer counts; unseen words are ignored.',
    '`fit_nb(X, y, alpha)` → `(log_prior, log_lik)` with shapes `(2,)` and `(2, V)`.',
    '`predict_log_proba(X, log_prior, log_lik)` → `(n, 2)` normalized log-probabilities using log-sum-exp; `predict` returns the argmax.',
  ],
  hints: [
    ['Counts per class', '`counts = np.array([X[y == c].sum(axis=0) for c in (0, 1)])` has shape `(2, V)`. Smooth: `(counts + alpha) / (counts.sum(axis=1, keepdims=True) + alpha * V)`.'],
    ['Scores', '`scores = X @ log_lik.T + log_prior` gives `(n, 2)` joint log-probabilities (up to a constant).'],
    ['log-sum-exp', '`m = scores.max(axis=1, keepdims=True); return scores - (m + np.log(np.exp(scores - m).sum(axis=1, keepdims=True)))`.'],
  ],
  starter: `import re
import numpy as np

def tokenize(text):
    raise NotImplementedError

def build_vocab(docs):
    raise NotImplementedError

def count_matrix(docs, vocab):
    raise NotImplementedError

def fit_nb(X, y, alpha=1.0):
    raise NotImplementedError

def predict_log_proba(X, log_prior, log_lik):
    raise NotImplementedError

def predict(X, log_prior, log_lik):
    raise NotImplementedError
`,
  solution: `import re
import numpy as np

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def build_vocab(docs):
    words = sorted({w for d in docs for w in tokenize(d)})
    return {w: i for i, w in enumerate(words)}

def count_matrix(docs, vocab):
    X = np.zeros((len(docs), len(vocab)), dtype=int)
    for i, d in enumerate(docs):
        for w in tokenize(d):
            if w in vocab:
                X[i, vocab[w]] += 1
    return X

def fit_nb(X, y, alpha=1.0):
    y = np.asarray(y)
    V = X.shape[1]
    log_prior = np.log(np.array([np.mean(y == 0), np.mean(y == 1)]))
    counts = np.array([X[y == c].sum(axis=0) for c in (0, 1)], dtype=float)
    probs = (counts + alpha) / (counts.sum(axis=1, keepdims=True) + alpha * V)
    return log_prior, np.log(probs)

def predict_log_proba(X, log_prior, log_lik):
    scores = X @ log_lik.T + log_prior
    m = scores.max(axis=1, keepdims=True)
    return scores - (m + np.log(np.exp(scores - m).sum(axis=1, keepdims=True)))

def predict(X, log_prior, log_lik):
    return np.argmax(predict_log_proba(X, log_prior, log_lik), axis=1)
`,
  solutionNote: 'Training is two count tables and a smoothing step. Prediction is one matrix product in log space; subtracting the row maximum before exponentiating makes normalization safe for arbitrarily long documents.',
  checkSummary: 'Tokenizer output; a sorted training-only vocabulary that ignores unseen words; count matrices; smoothed log-likelihoods and priors against hand calculation; normalized log-probabilities; predictions on a tiny corpus; and a 20,000-token document that must produce finite, normalized probabilities.',
  checks: `
import numpy as np
assert tokenize("Disk FULL on agent-7!") == ["disk", "full", "on", "agent", "7"]
_train = ["disk error", "error timeout", "deploy done", "backup done"]; _y = np.array([1, 1, 0, 0])
_vocab = build_vocab(_train)
assert list(_vocab) == ["backup", "deploy", "disk", "done", "error", "timeout"], "Vocabulary must be sorted training words"
_X = count_matrix(_train, _vocab)
assert _X.shape == (4, 6) and _X.dtype.kind in "iu"
np.testing.assert_array_equal(count_matrix(["error error kubernetes"], _vocab), [[0, 0, 0, 0, 2, 0]])
print("PASS: tokenizer, training-only vocabulary and counts")
_lp, _ll = fit_nb(_X, _y, alpha=1.0)
assert _lp.shape == (2,) and _ll.shape == (2, 6)
np.testing.assert_allclose(np.exp(_lp), [0.5, 0.5])
# Class 1 has 4 tokens (disk, error, error, timeout); V = 6. P(error | 1) = (2 + 1) / (4 + 6).
assert abs(np.exp(_ll[1, _vocab["error"]]) - 0.3) < 1e-12, "Smoothed P(error | incident) should be 3/10"
assert abs(np.exp(_ll[0, _vocab["error"]]) - 0.1) < 1e-12, "Smoothed P(error | routine) should be 1/10"
np.testing.assert_allclose(np.exp(_ll).sum(axis=1), [1, 1], err_msg="Each class's word probabilities must sum to 1")
_q = count_matrix(["disk error again", "backup deploy"], _vocab)
_lpp = predict_log_proba(_q, _lp, _ll)
np.testing.assert_allclose(np.exp(_lpp).sum(axis=1), [1, 1])
np.testing.assert_array_equal(predict(_q, _lp, _ll), [1, 0])
print("PASS: smoothing, priors and normalized predictions match hand calculation")
_long = count_matrix([" ".join(["error"] * 10000 + ["done"] * 10000)], _vocab)
_lpl = predict_log_proba(_long, _lp, _ll)
assert np.all(np.isfinite(_lpl)) and abs(np.exp(_lpl).sum() - 1) < 1e-9, "Long documents must not underflow"
print("PASS: 20,000-token document handled in log space")
`,
}
