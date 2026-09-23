export default {
  filename: 'retrieval.py', packages: ['numpy'],
  title: 'A retrieval engine and its evaluation.',
  intro: 'Implement TF-IDF vectors with cosine ranking, BM25 scoring, permission filtering before ranking, and the recall@k and MRR metrics. The checks use a tiny runbook corpus with known answers.',
  steps: [
    '`tokenize(text)` → lowercase word list (letters and digits).',
    '`fit_tfidf(docs)` → `(vocab, idf, matrix)`: vocab maps word → column; `idf = log(N / df)`; rows are TF-IDF vectors normalized to unit length.',
    '`rank_tfidf(query, vocab, idf, matrix, allowed)` → document indices sorted by cosine similarity, **only among `allowed`** (a boolean array), dropping zero scores.',
    '`bm25_scores(query, docs, k1=1.2, b=0.75)` → one score per document with `idf = log(1 + (N − df + 0.5)/(df + 0.5))`.',
    '`recall_at_k(ranked, relevant, k)` and `mrr(list_of_ranked, list_of_relevant)`.',
  ],
  hints: [
    ['Unit vectors', '`M / np.linalg.norm(M, axis=1, keepdims=True)` (guard zero rows). Cosine of unit vectors is a dot product.'],
    ['BM25 term', 'For a term with frequency f in a doc of length L (avg length A): `idf * f * (k1 + 1) / (f + k1 * (1 - b + b * L / A))`.'],
  ],
  starter: `import re
import numpy as np

def tokenize(text):
    raise NotImplementedError

def fit_tfidf(docs):
    raise NotImplementedError

def rank_tfidf(query, vocab, idf, matrix, allowed):
    raise NotImplementedError

def bm25_scores(query, docs, k1=1.2, b=0.75):
    raise NotImplementedError

def recall_at_k(ranked, relevant, k):
    raise NotImplementedError

def mrr(rankings, relevants):
    raise NotImplementedError
`,
  solution: `import re
import numpy as np

def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())

def fit_tfidf(docs):
    toks = [tokenize(d) for d in docs]
    vocab = {w: i for i, w in enumerate(sorted({w for t in toks for w in t}))}
    df = np.zeros(len(vocab))
    for t in toks:
        for w in set(t):
            df[vocab[w]] += 1
    idf = np.log(len(docs) / df)
    M = np.zeros((len(docs), len(vocab)))
    for i, t in enumerate(toks):
        for w in t:
            M[i, vocab[w]] += 1
    M = M * idf
    norms = np.linalg.norm(M, axis=1, keepdims=True)
    return vocab, idf, M / np.where(norms == 0, 1, norms)

def rank_tfidf(query, vocab, idf, matrix, allowed):
    q = np.zeros(len(vocab))
    for w in tokenize(query):
        if w in vocab:
            q[vocab[w]] += 1
    q = q * idf
    n = np.linalg.norm(q)
    if n == 0:
        return []
    s = matrix @ (q / n)
    idx = [i for i in np.argsort(-s, kind="stable") if allowed[i] and s[i] > 0]
    return [int(i) for i in idx]

def bm25_scores(query, docs, k1=1.2, b=0.75):
    toks = [tokenize(d) for d in docs]
    N, avg = len(docs), np.mean([len(t) for t in toks])
    scores = np.zeros(N)
    for w in set(tokenize(query)):
        df = sum(w in t for t in toks)
        if df == 0:
            continue
        idf = np.log(1 + (N - df + 0.5) / (df + 0.5))
        for i, t in enumerate(toks):
            f = t.count(w)
            if f:
                scores[i] += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(t) / avg))
    return scores

def recall_at_k(ranked, relevant, k):
    return len(set(ranked[:k]) & set(relevant)) / len(relevant)

def mrr(rankings, relevants):
    rr = []
    for ranked, rel in zip(rankings, relevants):
        first = next((i for i, d in enumerate(ranked) if d in rel), None)
        rr.append(0.0 if first is None else 1 / (first + 1))
    return float(np.mean(rr))
`,
  solutionNote: 'Permissions are applied inside ranking, so a restricted document can never appear in the results, no matter how well it matches.',
  checkSummary: 'Tokenization; idf values and unit-length TF-IDF rows; correct top documents for several questions; a restricted document never returned; BM25 prefers the relevant document and saturates repeated words; recall@k and MRR on hand examples.',
  checks: `
import numpy as np
_docs = ["Builds are slow when the dependency cache misses. A changed lockfile invalidates the cache.",
         "Pods restart with out of memory errors when the memory limit is too low.",
         "Roll back a bad deployment by redeploying the previous release tag.",
         "To fail over the primary database, promote the healthiest replica."]
assert tokenize("Disk FULL, agent-7!") == ["disk", "full", "agent", "7"]
_v, _idf, _M = fit_tfidf(_docs)
assert abs(_idf[_v["lockfile"]] - np.log(4)) < 1e-12 and abs(_idf[_v["the"]] - np.log(4 / 4)) < 1e-12
np.testing.assert_allclose(np.linalg.norm(_M, axis=1), 1)
_all = np.ones(4, dtype=bool)
assert rank_tfidf("lockfile changed, cache slow", _v, _idf, _M, _all)[0] == 0
assert rank_tfidf("memory limit", _v, _idf, _M, _all)[0] == 1
assert rank_tfidf("RAM exhausted", _v, _idf, _M, _all) == [], "No shared words: nothing retrieved"
_mask = np.array([True, True, True, False])
assert 3 not in rank_tfidf("promote replica database", _v, _idf, _M, _mask), "Restricted documents must never be returned"
print("PASS: TF-IDF ranking and permission filtering")
_s = bm25_scores("rollback deployment release", _docs)
assert int(np.argmax(_s)) == 2
_rep = bm25_scores("cache", ["cache " * 1 + "x " * 9, "cache " * 10])
assert _rep[1] < 3 * _rep[0], "BM25 must saturate repeated terms"
print("PASS: BM25")
assert recall_at_k([3, 1, 0], [0], 2) == 0 and recall_at_k([3, 1, 0], [0], 3) == 1
assert abs(mrr([[0, 1], [2, 1], [3, 2, 1, 0]], [[0], [1], [0]]) - (1 + 0.5 + 0.25) / 3) < 1e-12
print("PASS: recall@k and MRR")
`,
}
