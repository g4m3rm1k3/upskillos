// Lab 35 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The learning platform follows the playground's rules (6 topics × 4 levels, 120 users, tastes and progression) with its own random draws.

export const extras = {
  'l35-feedback': {
    formulaTex: '$$\\mathrm{pop}(i) = \\sum_u R_{ui}, \\qquad R_{ui} \\in \\{0, 1\\}$$',
    mathCode: {
      rows: [
        ['$R_{ui}$', 'R[u, i] = 1', 'User u opened item i; a 0 means unknown, not disliked.'],
        ['$\\mathrm{pop}(i)$', 'R.sum(axis=0)', 'How many users opened item i.'],
        ['top k', 'recommend(scores, seen, k)', 'The k best unseen items.'],
      ],
    },
    notebook: {
      title: 'Lab 35.1 · Feedback, not labels',
      intro: 'The interaction matrix and the popularity baseline — for a user who does not share the crowd’s taste.',
      cells: [
        {
          title: 'The matrix and popularity',
          prose: '**Predict** how many of the 24 tutorials popularity ever recommends to anyone.',
          code: `import numpy as np
TOPICS = ["Python", "SQL", "Statistics", "Deep learning", "DevOps", "Design"]
LEVELS = ["intro", "practice", "project", "advanced"]
NAMES = [f"{t} · {l}" for t in TOPICS for l in LEVELS]                # 24 tutorials; item i has topic i // 4, level i % 4
POP = np.array([[1.4, 0.9, 0.5, 0.2][i % 4] + (0.6 if i // 4 == 0 else 0) for i in range(24)])
TOPIC = np.arange(24) // 4

def make_world(n_users=120, seed=35):
    """A simulated learning platform (the playground's rules): each user likes one or two topics and tends to progress
    from intro to advanced within a topic. Returns tastes and time-ordered events (user, item, t)."""
    rng = np.random.default_rng(seed)
    taste = np.empty((n_users, 6)); events = []
    for u in range(n_users):
        main = rng.integers(6); second = rng.integers(6) if rng.random() < 0.5 else main
        taste[u] = [2.2 if t == main else 1.4 if t == second else -0.6 + 0.3 * rng.normal() for t in range(6)]
        seen = []
        for t in range(4 + rng.integers(6)):
            done = np.bincount(TOPIC[seen], minlength=6) if seen else np.zeros(6, int)
            w = np.exp(taste[u][TOPIC] + POP + np.where(np.arange(24) % 4 == done[TOPIC], 1.2, 0))
            w[seen] = 0
            item = rng.choice(24, p=w / w.sum()); seen.append(item); events.append((u, item, t))
    return taste, events

def click_prob(taste_u, items):
    """The simulator's truth: the chance a user clicks an item when shown it."""
    return 1 / (1 + np.exp(-(taste_u[TOPIC[items]] - 1.5 + 0.5 * POP[items])))

taste, events = make_world()
R = np.zeros((120, 24), int)
for u, i, t in events:
    R[u, i] = 1

print(f"{len(events)} interactions; the 120 × 24 matrix is {R.mean():.3f} filled with 1s")
popularity = R.sum(axis=0)
def recommend(scores, seen, k=5):
    """The k highest-scoring items the user has not seen; ties go to the lower index."""
    order = [i for i in np.argsort(-scores, kind="stable") if not seen[i]]
    return order[:k]

u = next(u for u in range(120) if taste[u].argmax() != 0 and taste[u][0] < 0)     # someone who does not care for Python
recs = recommend(popularity.astype(float), R[u])
print(f"user {u} likes {TOPICS[taste[u].argmax()]} most. Popularity recommends:")
for i in recs:
    print(f"  {NAMES[i]:24s} true click chance {click_prob(taste[u], np.array([i]))[0]:.2f}")
shown = {i for v in range(120) for i in recommend(popularity.astype(float), R[v])}
print(f"distinct tutorials recommended to anyone: {len(shown)} of 24")`,
        },
      ],
    },
  },
  'l35-cf': {
    formulaTex: '$$S_{ij} = \\frac{R_{:i} \\cdot R_{:j}}{\\lVert R_{:i}\\rVert\\,\\lVert R_{:j}\\rVert}, \\qquad s_{uj} = \\sum_i R_{ui} S_{ij}$$',
    mathCode: {
      rows: [
        ['$R_{:i} \\cdot R_{:j}$', '(R.T @ R)[i, j]', 'Users who opened both items.'],
        ['$S_{ij}$', 'C / np.outer(norms, norms)', 'Cosine similarity of two item columns; zero diagonal.'],
        ['$s_{uj}$', 'R[u] @ S', 'Score of item j for user u.'],
        ['$R \\approx UV^\\top$', 'als(R, k=4, w0=0.1)', 'Matrix factorization; unobserved cells weighted 0.1.'],
      ],
    },
    notebook: {
      title: 'Lab 35.2 · Collaborative filtering',
      intro: 'Item-item cosine similarity, a factorization by alternating least squares, and a brand-new user.',
      cells: [
        {
          title: 'The platform',
          prose: 'As in 35.1.',
          code: `import numpy as np
TOPICS = ["Python", "SQL", "Statistics", "Deep learning", "DevOps", "Design"]
LEVELS = ["intro", "practice", "project", "advanced"]
NAMES = [f"{t} · {l}" for t in TOPICS for l in LEVELS]                # 24 tutorials; item i has topic i // 4, level i % 4
POP = np.array([[1.4, 0.9, 0.5, 0.2][i % 4] + (0.6 if i // 4 == 0 else 0) for i in range(24)])
TOPIC = np.arange(24) // 4

def make_world(n_users=120, seed=35):
    """A simulated learning platform (the playground's rules): each user likes one or two topics and tends to progress
    from intro to advanced within a topic. Returns tastes and time-ordered events (user, item, t)."""
    rng = np.random.default_rng(seed)
    taste = np.empty((n_users, 6)); events = []
    for u in range(n_users):
        main = rng.integers(6); second = rng.integers(6) if rng.random() < 0.5 else main
        taste[u] = [2.2 if t == main else 1.4 if t == second else -0.6 + 0.3 * rng.normal() for t in range(6)]
        seen = []
        for t in range(4 + rng.integers(6)):
            done = np.bincount(TOPIC[seen], minlength=6) if seen else np.zeros(6, int)
            w = np.exp(taste[u][TOPIC] + POP + np.where(np.arange(24) % 4 == done[TOPIC], 1.2, 0))
            w[seen] = 0
            item = rng.choice(24, p=w / w.sum()); seen.append(item); events.append((u, item, t))
    return taste, events

def click_prob(taste_u, items):
    """The simulator's truth: the chance a user clicks an item when shown it."""
    return 1 / (1 + np.exp(-(taste_u[TOPIC[items]] - 1.5 + 0.5 * POP[items])))

taste, events = make_world()
R = np.zeros((120, 24), int)
for u, i, t in events:
    R[u, i] = 1

print(f"{len(events)} interactions; the 120 × 24 matrix is {R.mean():.3f} filled with 1s")
popularity = R.sum(axis=0)
def recommend(scores, seen, k=5):
    """The k highest-scoring items the user has not seen; ties go to the lower index."""
    order = [i for i in np.argsort(-scores, kind="stable") if not seen[i]]
    return order[:k]

u = next(u for u in range(120) if taste[u].argmax() != 0 and taste[u][0] < 0)     # someone who does not care for Python
recs = recommend(popularity.astype(float), R[u])
print(f"user {u} likes {TOPICS[taste[u].argmax()]} most. Popularity recommends:")
for i in recs:
    print(f"  {NAMES[i]:24s} true click chance {click_prob(taste[u], np.array([i]))[0]:.2f}")
shown = {i for v in range(120) for i in recommend(popularity.astype(float), R[v])}
print(f"distinct tutorials recommended to anyone: {len(shown)} of 24")`,
        },
        {
          title: 'Item-item, factorization and cold start',
          prose: '**Predict** the item-item scores of a user with no history.',
          code: `def item_similarity(R):
    C = R.T @ R                                             # C[i, j] = users who opened both i and j
    norms = np.sqrt(np.diag(C)).astype(float); norms[norms == 0] = 1
    S = C / np.outer(norms, norms)
    np.fill_diagonal(S, 0)                                  # an item must not recommend itself
    return S
S = item_similarity(R)
i, j = 0, 1
print(f"{NAMES[i]} and {NAMES[j]}: both opened by {int((R[:, i] & R[:, j]).sum())}; counts {R[:, i].sum()} and {R[:, j].sum()}; cosine {S[i, j]:.3f}")

scores_u = R[u] @ S                                          # score(u, j) = sum over opened items i of S[i, j]
print(f"item-item for user {u}:", [NAMES[i] for i in recommend(scores_u, R[u])])

def als(R, k=4, lam=0.1, w0=0.1, iters=10, seed=7):
    """R ≈ U Vᵀ by alternating ridge regressions; unobserved cells get weight w0 (uncertain, not negative)."""
    rng = np.random.default_rng(seed)
    U, V = 0.1 * rng.normal(size=(R.shape[0], k)), 0.1 * rng.normal(size=(R.shape[1], k))
    W = np.where(R == 1, 1.0, w0)
    for _ in range(iters):
        for a in range(R.shape[0]):
            U[a] = np.linalg.solve((V.T * W[a]) @ V + lam * np.eye(k), (V.T * W[a]) @ R[a])
        for b in range(R.shape[1]):
            V[b] = np.linalg.solve((U.T * W[:, b]) @ U + lam * np.eye(k), (U.T * W[:, b]) @ R[:, b])
    return U, V
U, V = als(R)
print(f"factorization for user {u}:", [NAMES[i] for i in recommend(V @ U[u], R[u])])
new_user = np.zeros(24, int)
print("a brand-new user: item-item scores all", np.unique(new_user @ S), "-> fall back to popularity:", [NAMES[i] for i in recommend(popularity.astype(float), new_user, 3)])`,
        },
      ],
    },
  },
  'l35-offline': {
    formulaTex: '$$\\mathrm{NDCG@}k = \\frac{1}{|U|}\\sum_{u} \\frac{\\mathbb{1}[\\,p_u \\le k\\,]}{\\log_2(p_u + 1)}$$',
    mathCode: {
      rows: [
        ['$p_u$', 'recs.index(item) + 1', 'Rank of the held-out item in user u’s list.'],
        ['hit@k', 'np.mean(hits)', 'Share of users whose held-out item is in the top k.'],
        ['coverage', 'len(shown) / 24', 'Share of the catalog recommended to anyone.'],
        ['time-aware', 'pick = len(mine) - 1', 'Hold out each user’s most recent interaction.'],
      ],
    },
    notebook: {
      title: 'Lab 35.3 · Offline evaluation without leakage',
      intro: 'Three recommenders, two hold-out designs, three metrics.',
      cells: [
        {
          title: 'The models',
          prose: 'As in 35.2.',
          code: `import numpy as np
TOPICS = ["Python", "SQL", "Statistics", "Deep learning", "DevOps", "Design"]
LEVELS = ["intro", "practice", "project", "advanced"]
NAMES = [f"{t} · {l}" for t in TOPICS for l in LEVELS]                # 24 tutorials; item i has topic i // 4, level i % 4
POP = np.array([[1.4, 0.9, 0.5, 0.2][i % 4] + (0.6 if i // 4 == 0 else 0) for i in range(24)])
TOPIC = np.arange(24) // 4

def make_world(n_users=120, seed=35):
    """A simulated learning platform (the playground's rules): each user likes one or two topics and tends to progress
    from intro to advanced within a topic. Returns tastes and time-ordered events (user, item, t)."""
    rng = np.random.default_rng(seed)
    taste = np.empty((n_users, 6)); events = []
    for u in range(n_users):
        main = rng.integers(6); second = rng.integers(6) if rng.random() < 0.5 else main
        taste[u] = [2.2 if t == main else 1.4 if t == second else -0.6 + 0.3 * rng.normal() for t in range(6)]
        seen = []
        for t in range(4 + rng.integers(6)):
            done = np.bincount(TOPIC[seen], minlength=6) if seen else np.zeros(6, int)
            w = np.exp(taste[u][TOPIC] + POP + np.where(np.arange(24) % 4 == done[TOPIC], 1.2, 0))
            w[seen] = 0
            item = rng.choice(24, p=w / w.sum()); seen.append(item); events.append((u, item, t))
    return taste, events

def click_prob(taste_u, items):
    """The simulator's truth: the chance a user clicks an item when shown it."""
    return 1 / (1 + np.exp(-(taste_u[TOPIC[items]] - 1.5 + 0.5 * POP[items])))

taste, events = make_world()
R = np.zeros((120, 24), int)
for u, i, t in events:
    R[u, i] = 1

print(f"{len(events)} interactions; the 120 × 24 matrix is {R.mean():.3f} filled with 1s")
popularity = R.sum(axis=0)
def recommend(scores, seen, k=5):
    """The k highest-scoring items the user has not seen; ties go to the lower index."""
    order = [i for i in np.argsort(-scores, kind="stable") if not seen[i]]
    return order[:k]

u = next(u for u in range(120) if taste[u].argmax() != 0 and taste[u][0] < 0)     # someone who does not care for Python
recs = recommend(popularity.astype(float), R[u])
print(f"user {u} likes {TOPICS[taste[u].argmax()]} most. Popularity recommends:")
for i in recs:
    print(f"  {NAMES[i]:24s} true click chance {click_prob(taste[u], np.array([i]))[0]:.2f}")
shown = {i for v in range(120) for i in recommend(popularity.astype(float), R[v])}
print(f"distinct tutorials recommended to anyone: {len(shown)} of 24")

def item_similarity(R):
    C = R.T @ R                                             # C[i, j] = users who opened both i and j
    norms = np.sqrt(np.diag(C)).astype(float); norms[norms == 0] = 1
    S = C / np.outer(norms, norms)
    np.fill_diagonal(S, 0)                                  # an item must not recommend itself
    return S
S = item_similarity(R)
i, j = 0, 1
print(f"{NAMES[i]} and {NAMES[j]}: both opened by {int((R[:, i] & R[:, j]).sum())}; counts {R[:, i].sum()} and {R[:, j].sum()}; cosine {S[i, j]:.3f}")

scores_u = R[u] @ S                                          # score(u, j) = sum over opened items i of S[i, j]
print(f"item-item for user {u}:", [NAMES[i] for i in recommend(scores_u, R[u])])

def als(R, k=4, lam=0.1, w0=0.1, iters=10, seed=7):
    """R ≈ U Vᵀ by alternating ridge regressions; unobserved cells get weight w0 (uncertain, not negative)."""
    rng = np.random.default_rng(seed)
    U, V = 0.1 * rng.normal(size=(R.shape[0], k)), 0.1 * rng.normal(size=(R.shape[1], k))
    W = np.where(R == 1, 1.0, w0)
    for _ in range(iters):
        for a in range(R.shape[0]):
            U[a] = np.linalg.solve((V.T * W[a]) @ V + lam * np.eye(k), (V.T * W[a]) @ R[a])
        for b in range(R.shape[1]):
            V[b] = np.linalg.solve((U.T * W[:, b]) @ U + lam * np.eye(k), (U.T * W[:, b]) @ R[:, b])
    return U, V
U, V = als(R)
print(f"factorization for user {u}:", [NAMES[i] for i in recommend(V @ U[u], R[u])])
new_user = np.zeros(24, int)
print("a brand-new user: item-item scores all", np.unique(new_user @ S), "-> fall back to popularity:", [NAMES[i] for i in recommend(popularity.astype(float), new_user, 3)])`,
        },
        {
          title: 'Hit rate, NDCG and coverage',
          prose: '**Predict** which hold-out gives higher scores, and why that is a warning.',
          code: `def split(events, mode, seed=1):
    """Hold out each user's LAST interaction (time-aware) or a RANDOM one (leaky: later behaviour trains the model)."""
    rng = np.random.default_rng(seed); train, test = [], []
    for u in range(120):
        mine = [e for e in events if e[0] == u]
        pick = len(mine) - 1 if mode == "last" else rng.integers(len(mine))
        for n, e in enumerate(mine):
            (test if n == pick else train).append(e)
    return train, test

def evaluate(method, mode, k=5):
    train, test = split(events, mode)
    Rt = np.zeros((120, 24), int)
    for u, i, t in train:
        Rt[u, i] = 1
    if method == "popularity":
        score = lambda u: Rt.sum(axis=0).astype(float)
    elif method == "item-item":
        St = item_similarity(Rt); score = lambda u: Rt[u] @ St
    else:
        Ut, Vt = als(Rt); score = lambda u: Vt @ Ut[u]
    hits, gains, shown = [], [], set()
    for u, item, t in test:
        recs = recommend(score(u), Rt[u], k); shown |= set(recs)
        rank = recs.index(item) + 1 if item in recs else 0
        hits.append(rank > 0); gains.append(1 / np.log2(rank + 1) if rank else 0.0)
    return np.mean(hits), np.mean(gains), len(shown) / 24

print("method        hold-out   hit@5   NDCG@5  coverage")
for method in ["popularity", "item-item", "factorization"]:
    for mode in ["last", "random"]:
        h, n, c = evaluate(method, mode)
        print(f"{method:13s} {mode:7s}   {h:.3f}   {n:.3f}   {c:.2f}")`,
        },
      ],
    },
  },
  'l35-loops': {
    formulaTex: '$$\\text{slate} = (1 - \\varepsilon)\\,\\text{top picks} + \\varepsilon\\,\\text{exploration}$$',
    mathCode: {
      rows: [
        ['$\\varepsilon$', 'explore', 'Share of slots given to a random unseen item.'],
        ['clicks', 'rng.random() < click_prob(...)', 'Users can click only what they are shown; clicks become training data.'],
        ['discovered', 'discovered(Rl)', 'Share of liked (user, item) pairs found so far.'],
      ],
    },
    notebook: {
      title: 'Lab 35.4 · Feedback loops and exploration',
      intro: 'Twelve rounds of recommend → click → retrain, with and without exploration.',
      cells: [
        {
          title: 'The models',
          prose: 'As in 35.2.',
          code: `import numpy as np
TOPICS = ["Python", "SQL", "Statistics", "Deep learning", "DevOps", "Design"]
LEVELS = ["intro", "practice", "project", "advanced"]
NAMES = [f"{t} · {l}" for t in TOPICS for l in LEVELS]                # 24 tutorials; item i has topic i // 4, level i % 4
POP = np.array([[1.4, 0.9, 0.5, 0.2][i % 4] + (0.6 if i // 4 == 0 else 0) for i in range(24)])
TOPIC = np.arange(24) // 4

def make_world(n_users=120, seed=35):
    """A simulated learning platform (the playground's rules): each user likes one or two topics and tends to progress
    from intro to advanced within a topic. Returns tastes and time-ordered events (user, item, t)."""
    rng = np.random.default_rng(seed)
    taste = np.empty((n_users, 6)); events = []
    for u in range(n_users):
        main = rng.integers(6); second = rng.integers(6) if rng.random() < 0.5 else main
        taste[u] = [2.2 if t == main else 1.4 if t == second else -0.6 + 0.3 * rng.normal() for t in range(6)]
        seen = []
        for t in range(4 + rng.integers(6)):
            done = np.bincount(TOPIC[seen], minlength=6) if seen else np.zeros(6, int)
            w = np.exp(taste[u][TOPIC] + POP + np.where(np.arange(24) % 4 == done[TOPIC], 1.2, 0))
            w[seen] = 0
            item = rng.choice(24, p=w / w.sum()); seen.append(item); events.append((u, item, t))
    return taste, events

def click_prob(taste_u, items):
    """The simulator's truth: the chance a user clicks an item when shown it."""
    return 1 / (1 + np.exp(-(taste_u[TOPIC[items]] - 1.5 + 0.5 * POP[items])))

taste, events = make_world()
R = np.zeros((120, 24), int)
for u, i, t in events:
    R[u, i] = 1

print(f"{len(events)} interactions; the 120 × 24 matrix is {R.mean():.3f} filled with 1s")
popularity = R.sum(axis=0)
def recommend(scores, seen, k=5):
    """The k highest-scoring items the user has not seen; ties go to the lower index."""
    order = [i for i in np.argsort(-scores, kind="stable") if not seen[i]]
    return order[:k]

u = next(u for u in range(120) if taste[u].argmax() != 0 and taste[u][0] < 0)     # someone who does not care for Python
recs = recommend(popularity.astype(float), R[u])
print(f"user {u} likes {TOPICS[taste[u].argmax()]} most. Popularity recommends:")
for i in recs:
    print(f"  {NAMES[i]:24s} true click chance {click_prob(taste[u], np.array([i]))[0]:.2f}")
shown = {i for v in range(120) for i in recommend(popularity.astype(float), R[v])}
print(f"distinct tutorials recommended to anyone: {len(shown)} of 24")

def item_similarity(R):
    C = R.T @ R                                             # C[i, j] = users who opened both i and j
    norms = np.sqrt(np.diag(C)).astype(float); norms[norms == 0] = 1
    S = C / np.outer(norms, norms)
    np.fill_diagonal(S, 0)                                  # an item must not recommend itself
    return S
S = item_similarity(R)
i, j = 0, 1
print(f"{NAMES[i]} and {NAMES[j]}: both opened by {int((R[:, i] & R[:, j]).sum())}; counts {R[:, i].sum()} and {R[:, j].sum()}; cosine {S[i, j]:.3f}")

scores_u = R[u] @ S                                          # score(u, j) = sum over opened items i of S[i, j]
print(f"item-item for user {u}:", [NAMES[i] for i in recommend(scores_u, R[u])])

def als(R, k=4, lam=0.1, w0=0.1, iters=10, seed=7):
    """R ≈ U Vᵀ by alternating ridge regressions; unobserved cells get weight w0 (uncertain, not negative)."""
    rng = np.random.default_rng(seed)
    U, V = 0.1 * rng.normal(size=(R.shape[0], k)), 0.1 * rng.normal(size=(R.shape[1], k))
    W = np.where(R == 1, 1.0, w0)
    for _ in range(iters):
        for a in range(R.shape[0]):
            U[a] = np.linalg.solve((V.T * W[a]) @ V + lam * np.eye(k), (V.T * W[a]) @ R[a])
        for b in range(R.shape[1]):
            V[b] = np.linalg.solve((U.T * W[:, b]) @ U + lam * np.eye(k), (U.T * W[:, b]) @ R[:, b])
    return U, V
U, V = als(R)
print(f"factorization for user {u}:", [NAMES[i] for i in recommend(V @ U[u], R[u])])
new_user = np.zeros(24, int)
print("a brand-new user: item-item scores all", np.unique(new_user @ S), "-> fall back to popularity:", [NAMES[i] for i in recommend(popularity.astype(float), new_user, 3)])`,
        },
        {
          title: 'The loop',
          prose: '**Predict** whether pure exploration (100%) discovers the most.',
          code: `def discovered(Rnow):
    """Share of the (user, item) pairs a user would probably like (true click chance above 0.5) found so far."""
    liked = np.array([click_prob(taste[u], np.arange(24)) > 0.5 for u in range(120)])
    return (Rnow.astype(bool) & liked).sum() / liked.sum()

def feedback_loop(method, explore, rounds=12, k=3, seed=11):
    rng = np.random.default_rng(seed)
    Rl = np.zeros((120, 24), int)
    for u, i, t in events:
        if t < 2: Rl[u, i] = 1                          # the log before the new system: two interactions per user
    first_ctr = None
    for r in range(rounds):
        S_now = item_similarity(Rl) if method == "item-item" else None
        clicks = 0
        for u in range(120):
            scores = Rl[u] @ S_now if method == "item-item" else Rl.sum(axis=0).astype(float)
            top = recommend(scores, Rl[u], k)
            pool = [i for i in range(24) if not Rl[u, i] and i not in top]
            slate = [int(rng.choice(pool)) if pool and rng.random() < explore else i for i in top]     # explore: a random unseen item
            for i in slate:
                if rng.random() < click_prob(taste[u], np.array([i]))[0]:
                    Rl[u, i] = 1; clicks += 1
        if r == 0: first_ctr = clicks / (120 * k)
    return first_ctr, discovered(Rl)

for method in ["popularity", "item-item"]:
    for explore in [0.0, 0.3, 1.0]:
        ctr, disc = feedback_loop(method, explore)
        print(f"{method:10s} exploration {explore:.0%}: first-round click-through {ctr:.3f}; liked items discovered after 12 rounds {disc:.3f}")`,
        },
      ],
    },
  },
}
