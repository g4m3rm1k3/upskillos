export default {
  filename: 'recommender.py', packages: ['numpy'],
  title: 'Item-item collaborative filtering, evaluated honestly.',
  intro: 'Build the interaction matrix, split off each user\'s most recent interaction, compute item-item cosine similarities, recommend unseen items, and compare with the popularity baseline using hit rate@k and NDCG@k. Events are `(user, item, time)` tuples.',
  steps: [
    '`leave_last_out(events)` → `(train, test)`: for each user, the event with the largest time goes to `test`, the rest to `train`.',
    '`to_matrix(events, n_users, n_items)` → 0/1 array.',
    '`item_similarity(R)` → n_items × n_items cosine similarities with a **zero diagonal** (an item must not recommend itself). Items with no interactions have similarity 0.',
    '`recommend(scores, seen, k)` → indices of the k highest-scoring items with `seen == 0`, ties broken by lower index.',
    '`evaluate(R, test, score_fn, k)` → `(hit_rate, ndcg)` where `score_fn(u)` returns scores for user u and a hit at 0-based position p scores `1/log2(p + 2)`.',
  ],
  hints: [
    ['Cosine for all pairs', '`C = R.T @ R` counts co-occurrences; divide by `np.outer(norms, norms)` where `norms = np.sqrt(np.diag(C))` (use 1 where the norm is 0).'],
    ['Stable ordering', '`np.argsort(-scores, kind="stable")` keeps lower indices first among ties.'],
  ],
  starter: `import numpy as np

def leave_last_out(events):
    raise NotImplementedError

def to_matrix(events, n_users, n_items):
    raise NotImplementedError

def item_similarity(R):
    raise NotImplementedError

def recommend(scores, seen, k):
    raise NotImplementedError

def evaluate(R, test, score_fn, k):
    raise NotImplementedError
`,
  solution: `import numpy as np

def leave_last_out(events):
    last = {}
    for e in events:
        if e[0] not in last or e[2] > last[e[0]][2]:
            last[e[0]] = e
    test = list(last.values())
    held = set(test)
    return [e for e in events if e not in held], test

def to_matrix(events, n_users, n_items):
    R = np.zeros((n_users, n_items))
    for u, i, _ in events:
        R[u, i] = 1
    return R

def item_similarity(R):
    C = R.T @ R
    norms = np.sqrt(np.diag(C))
    norms[norms == 0] = 1
    S = C / np.outer(norms, norms)
    np.fill_diagonal(S, 0)
    return S

def recommend(scores, seen, k):
    order = np.argsort(-np.asarray(scores, dtype=float), kind="stable")
    return [int(i) for i in order if not seen[i]][:k]

def evaluate(R, test, score_fn, k):
    hits, gains = [], []
    for u, item, _ in test:
        recs = recommend(score_fn(u), R[u], k)
        p = recs.index(item) if item in recs else None
        hits.append(0.0 if p is None else 1.0)
        gains.append(0.0 if p is None else 1 / np.log2(p + 2))
    return float(np.mean(hits)), float(np.mean(gains))
`,
  solutionNote: 'Recommend only unseen items, and evaluate on each user\'s latest interaction: exactly the situation the recommender faces in production.',
  checkSummary: 'Leave-last-out on hand events; the matrix; cosine values and a zero diagonal on a hand example; unseen-only recommendations with stable ties; hit rate and NDCG on a hand case; and on simulated users with topic tastes, item-item filtering beats popularity.',
  checks: `
import numpy as np
_ev = [(0, 1, 5), (0, 2, 9), (1, 0, 1), (1, 2, 3), (1, 3, 2)]
_tr, _te = leave_last_out(_ev)
assert sorted(_te) == [(0, 2, 9), (1, 2, 3)] and sorted(_tr) == [(0, 1, 5), (1, 0, 1), (1, 3, 2)]
_R = to_matrix(_ev, 2, 4)
assert _R.tolist() == [[0, 1, 1, 0], [1, 0, 1, 1]]
_A = np.array([[1, 1, 0], [1, 1, 0], [1, 0, 0], [0, 1, 1]], float)
_S = item_similarity(_A)
assert np.allclose(np.diag(_S), 0)
assert abs(_S[0, 1] - 2 / np.sqrt(3 * 3)) < 1e-12 and abs(_S[0, 2]) < 1e-12 and abs(_S[1, 2] - 1 / np.sqrt(3)) < 1e-12
assert recommend([0.5, 0.9, 0.9, 0.1], [0, 0, 0, 0], 2) == [1, 2]
assert recommend([0.5, 0.9, 0.9, 0.1], [0, 1, 0, 0], 3) == [2, 0, 3]
print("PASS: split, matrix, similarity and recommend")
_hr, _nd = evaluate(np.zeros((2, 4)), [(0, 2, 0), (1, 3, 0)], lambda u: np.array([4, 3, 2, 1.0]), 3)
assert _hr == 0.5 and abs(_nd - 0.5 * (1 / np.log2(4))) < 1e-12
print("PASS: hit rate and NDCG")
_rng = np.random.default_rng(35)
_nU, _topics, _events = 200, 6, []
_item_topic = np.repeat(np.arange(_topics), 4)
for _u in range(_nU):
    _fav = _rng.integers(_topics)
    _w = np.where(_item_topic == _fav, 8.0, 1.0) * np.tile([3, 2, 1.5, 1], _topics)
    _items = _rng.choice(24, size=6, replace=False, p=_w / _w.sum())
    _events += [(_u, int(i), t) for t, i in enumerate(_items)]
_tr, _te = leave_last_out(_events)
_R = to_matrix(_tr, _nU, 24)
_S = item_similarity(_R)
_pop = _R.sum(axis=0)
_cf = evaluate(_R, _te, lambda u: _R[u] @ _S, 5)
_pp = evaluate(_R, _te, lambda u: _pop, 5)
print(f"item-item hit@5 {_cf[0]:.3f} NDCG {_cf[1]:.3f} | popularity hit@5 {_pp[0]:.3f} NDCG {_pp[1]:.3f}")
assert _cf[0] > _pp[0] + 0.1, "Collaborative filtering should clearly beat popularity when tastes differ"
print("PASS: item-item beats popularity on users with distinct tastes")
`,
}
