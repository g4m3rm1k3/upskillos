import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 35 practice ladder: similarity, scores and ranking credit by hand; an honest hold-out; cosine, top-k and NDCG in code.

export const cosineOf = (a, b) => { const d = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b); return na && nb ? d / (na * nb) : 0 }
export const topUnseenOf = (scores, seen, k) => scores.map((s, i) => i).filter(i => !seen[i]).sort((a, b) => scores[b] - scores[a] || a - b).slice(0, k)
export const ndcgOf = (recs, held, k) => { const p = recs.slice(0, k).indexOf(held); return p < 0 ? 0 : 1 / Math.log2(p + 2) }

const COS_CASES = [
  { a: [1, 1, 0, 1, 0], b: [1, 0, 0, 1, 1] },
  { a: [1, 0, 1, 0], b: [0, 1, 0, 1] },
  { a: [1, 1, 1, 1], b: [1, 1, 1, 1] },
  { a: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], b: [1, 1, 1, 0, 0, 0, 0, 0, 0, 1] },
].map(c => ({ ...c, expected: cosineOf(c.a, c.b) }))
const TOP_CASES = [
  { scores: [0.9, 0.1, 0.8, 0.5], seen: [1, 0, 0, 0], k: 2 },
  { scores: [3, 3, 1, 0, 2], seen: [0, 0, 0, 0, 1], k: 3 },
  { scores: [5, 4, 3, 2, 1], seen: [1, 1, 0, 0, 0], k: 2 },
  { scores: [0.2, 0.7, 0.7, 0.1], seen: [0, 1, 0, 0], k: 2 },
].map(c => ({ ...c, expected: topUnseenOf(c.scores, c.seen, c.k) }))
export const NDCG_CASES = [
  { recs: [4, 7, 2, 9, 1], held: 4, k: 5 },
  { recs: [4, 7, 2, 9, 1], held: 2, k: 5 },
  { recs: [4, 7, 2, 9, 1], held: 1, k: 3 },
  { recs: [4, 7, 2, 9, 1], held: 8, k: 5 },
].map(c => ({ ...c, expected: ndcgOf(c.recs, c.held, c.k) }))

export function diagnoseCos(c, got) {
  const d = c.a.reduce((s, x, i) => s + x * c.b[i], 0), sa = c.a.reduce((s, x) => s + x, 0), sb = c.b.reduce((s, x) => s + x, 0)
  if (Math.abs(got.value - d / (sa * sb)) < 1e-9 && Math.abs(d / (sa * sb) - c.expected) > 1e-9) return 'Divide by the product of the vector lengths, √(Σa²)·√(Σb²), not by the product of the counts.'
  if (Math.abs(got.value - d) < 1e-9 && Math.abs(d - c.expected) > 1e-9) return 'That is the raw co-occurrence count. Cosine divides it by both vector lengths, so popular items do not dominate.'
  return null
}
export function diagnoseTop(c, got) {
  const all = c.scores.map((s, i) => i).sort((a, b) => c.scores[b] - c.scores[a] || a - b).slice(0, c.k)
  if (Array.isArray(got.value) && got.value.length === all.length && got.value.every((v, i) => v === all[i]) && all.some(i => c.seen[i])) return 'The list includes items the user has already opened. Recommend only unseen items.'
  return null
}
export function diagnoseNdcg(c, got) {
  const p = c.recs.slice(0, c.k).indexOf(c.held)
  if (p > 0 && Math.abs(got.value - 1 / Math.log2(p + 1)) < 1e-9) return 'Positions count from 1: a hit at 0-based index p is at rank p + 1, so the credit is 1/log₂(p + 2).'
  const pAll = c.recs.indexOf(c.held)
  if (p < 0 && pAll >= 0 && Math.abs(got.value - 1 / Math.log2(pAll + 2)) < 1e-9) return 'Only the top k count: a held-out item at rank 5 earns nothing when k = 3.'
  return null
}
export function evaluateHoldout(vars) {
  const miss = needVars(vars, ['time_aware', 'hit_rate'])
  if (miss) return { passed: false, message: miss }
  const h = Number(vars.hit_rate.value)
  if (!Number(vars.time_aware.value)) return { passed: false, message: `Hit rate ${r3(h)} with a random hold-out: the model trained on interactions that came after the hidden one. Set \`time_aware = 1\` so each user’s most recent interaction is held out, and run again.` }
  return { passed: true, message: `Hit rate ${r3(h)}: lower, and honest — the model now predicts the next interaction from the past only, as it must after deployment.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['cosine', 'ndcg', 'fill']
export function generate(template, seed) {
  const g = rng(seed * 239 + TEMPLATES.indexOf(template) * 4159 + 73)
  if (template === 'cosine') {
    const [na, nb] = g.pick([[9, 16], [4, 25], [16, 16], [9, 4], [36, 4]]), both = g.pick([1, 2, 3, 4].filter(x => x <= Math.min(na, nb))), answer = both / Math.sqrt(na * nb)
    return { template, seed, na, nb, both, answer, misconceptions: [{ answer: both / (na + nb), feedback: 'Divide by √(count_A · count_B), not by the sum.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  if (template === 'ndcg') {
    const rank = g.pick([1, 2, 3, 4, 7]), answer = 1 / Math.log2(rank + 1)
    return { template, seed, rank, answer, misconceptions: [{ answer: 1 / rank, feedback: 'That is the reciprocal rank. NDCG discounts by log₂(rank + 1).' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const users = g.pick([100, 120, 500, 1000]), items = g.pick([20, 24, 50, 200]), per = g.pick([2, 4, 5, 6, 10]), answer = per / items
  return { template, seed, users, items, per, answer, misconceptions: [{ answer: per / users, feedback: 'Each user row has one cell per item: divide by the number of items.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'cosine') return { intro: `Item A was opened by ${p.na} users, item B by ${p.nb}, and ${p.both} opened both.`, questions: [{ id: 'c', type: 'number', label: 'What is their cosine similarity? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  if (p.template === 'ndcg') return { intro: `A user’s held-out item appears at rank ${p.rank} of the top 10.`, questions: [{ id: 'n', type: 'number', label: 'What is its NDCG contribution, 1/log₂(rank + 1)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `${p.users} users, ${p.items} items, and each user opened ${p.per} items on average.`, questions: [{ id: 'f', type: 'number', label: 'What fraction of the users × items matrix is 1? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'cosine') return `${p.both} / √(${p.na} × ${p.nb}) = ${p.both}/${r3(Math.sqrt(p.na * p.nb))} = **${Math.round(p.answer * 100) / 100}**.`
  if (p.template === 'ndcg') return `1/log₂(${p.rank + 1}) = **${Math.round(p.answer * 1000) / 1000}**.`
  return `${p.users} × ${p.per} ones out of ${p.users} × ${p.items} cells: ${p.per}/${p.items} = **${Math.round(p.answer * 1000) / 1000}**.`
}

export const recsys = {
  title: 'Recommending: similarity, ranking credit and honest hold-outs',
  version: 1,
  templates: TEMPLATES,
  templateNames: { cosine: 'Item-item cosine', ndcg: 'NDCG credit', fill: 'Matrix density' },
  generate, view, workedSolution,
  intro: 'Seven steps: recommender arithmetic by hand, an honest hold-out, and writing cosine similarity, top-k unseen items and NDCG@k. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Recommender arithmetic by hand',
      prompt: 'Item A was opened by 9 users, item B by 16, and 3 opened both. A user opened items 0 and 2; item j has similarities S[0, j] = 0.5, S[1, j] = 0.2, S[2, j] = 0.3. A held-out item appears at rank 3. Each user sees 3 slots per round, 30% of them exploration.',
      fields: [
        { label: 'Cosine similarity of A and B', answer: 0.25, tolerance: 1e-9 },
        { label: 'Item-item score of j for the user', answer: 0.8, tolerance: 1e-9 },
        { label: 'NDCG contribution at rank 3', answer: 0.5, tolerance: 1e-9 },
        { label: 'Exploration slots per user per round', answer: 0.9, tolerance: 1e-9 },
      ],
      explain: '3/√(9 × 16) = 0.25. The score adds the similarities of the items the user opened: 0.5 + 0.3 = 0.8 (item 1 was not opened). 1/log₂4 = 0.5. 3 × 0.3 = 0.9.',
    },
    {
      id: 'agree', kind: 'probe', title: 'An honest hold-out',
      prompt: 'An item-item recommender is evaluated by hiding one interaction per user. Run it: the hit rate looks excellent. **Set `time_aware = 1`** so each user’s most recent interaction is hidden, and run again.',
      starter: `import numpy as np
TOPIC, POP = np.arange(24) // 4, np.array([[1.4, 0.9, 0.5, 0.2][i % 4] + (0.6 if i < 4 else 0) for i in range(24)])
rng = np.random.default_rng(35)
events = []                                                 # 120 users open tutorials over time (the lab's platform)
for u in range(120):
    main = rng.integers(6); second = rng.integers(6) if rng.random() < 0.5 else main
    taste = np.array([2.2 if t == main else 1.4 if t == second else -0.6 + 0.3 * rng.normal() for t in range(6)])
    seen = []
    for t in range(4 + rng.integers(6)):
        done = np.bincount(TOPIC[seen], minlength=6) if seen else np.zeros(6, int)
        w = np.exp(taste[TOPIC] + POP + np.where(np.arange(24) % 4 == done[TOPIC], 1.2, 0)); w[seen] = 0
        item = int(rng.choice(24, p=w / w.sum())); seen.append(item); events.append((u, item, t))

time_aware = 0                                              # 0: hide a random interaction per user; 1: hide the most recent
pick = np.random.default_rng(1)
held = {}
for u in range(120):
    mine = [e for e in events if e[0] == u]
    held[u] = mine[-1] if time_aware else mine[pick.integers(len(mine))]
R = np.zeros((120, 24))
for e in events:
    if held[e[0]] != e: R[e[0], e[1]] = 1
C = R.T @ R; nrm = np.sqrt(np.diag(C)); nrm[nrm == 0] = 1
S = C / np.outer(nrm, nrm); np.fill_diagonal(S, 0)
hits = []
for u in range(120):
    scores = R[u] @ S; scores[R[u] == 1] = -np.inf
    hits.append(held[u][1] in np.argsort(-scores, kind="stable")[:5])
hit_rate = float(np.mean(hits))
print(f"time_aware = {time_aware}: item-item hit rate@5 {hit_rate:.3f}")`,
      probe: ['time_aware', 'hit_rate'],
      evaluate: evaluateHoldout,
      done: 'Offline, hide the future; online, randomize (Lab 36). Both keep the evaluation from rewarding hindsight.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in cosine similarity',
      prompt: 'Replace `___` with the cosine similarity of two item columns `a` and `b` (arrays of 0s and 1s, one entry per user).',
      starter: `import numpy as np

def cosine(a, b):
    """Users who opened both, divided by the product of the two vector lengths."""
    return ___`,
      hint: 'The dot product a·b counts the users who opened both; divide by ‖a‖·‖b‖.',
      solution: 'return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))',
      check: { fn: 'cosine', args: ['a', 'b'], ints: ['a', 'b'], cases: COS_CASES, describe: c => `a [${c.a.join(', ')}], b [${c.b.join(', ')}]`, diagnose: diagnoseCos },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For scores [0.9, 0.1, 0.8, 0.5], seen [1, 0, 0, 0] and k = 2 this returns **[0, 2]**; the user has already opened item 0. It should return [2, 3]. Fix it.',
      starter: `import numpy as np

def recommend(scores, seen, k):
    """The k highest-scoring items the user has NOT seen (seen[i] == 1 means opened); ties go to the lower index."""
    order = np.argsort(-scores, kind="stable")
    return [int(i) for i in order][:k]`,
      hint: 'Skip every item with seen[i] == 1 before taking the first k.',
      solution: 'return [int(i) for i in order if not seen[i]][:k]',
      check: { fn: 'recommend', args: ['scores', 'seen', 'k'], ints: ['seen', 'k'], cases: TOP_CASES, describe: c => `scores [${c.scores.join(', ')}], seen [${c.seen.join(', ')}], k = ${c.k}`, diagnose: diagnoseTop },
      explainChoice: {
        prompt: 'Why remove seen items before evaluation too, not only in the product?',
        options: [
          { text: 'A held-out item is by definition unseen in the training data. If seen items stay in the list they take slots, and the metric no longer measures what users would actually get.', correct: true },
          { text: 'Because seen items always have the highest scores.', feedback: 'Often, not always — but either way they waste slots.' },
          { text: 'To make the hit rate higher.', feedback: 'Removing them does free slots; the point is that the list then matches the product, not the size of the number.' },
          { text: 'Because cosine similarity is undefined for seen items.', feedback: 'It is defined; the item is simply not a useful recommendation.' },
        ],
        rightFeedback: 'Evaluate the list the product would actually show.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'NDCG@k for one user',
      prompt: 'Write `ndcg_at_k` from its contract.',
      starter: `import numpy as np

def ndcg_at_k(recs, held_out, k):
    """1 / log2(rank + 1) if held_out is among the first k recommendations (rank counted from 1), else 0.

    Example: ndcg_at_k([4, 7, 2, 9, 1], 2, 5)  ->  0.5
    """
    pass   # replace with your code`,
      hint: 'Find the 0-based position p of held_out in recs[:k]; the rank is p + 1.',
      solution: 'top = list(recs[:k])\nif held_out not in top:\n    return 0.0\nreturn 1 / np.log2(top.index(held_out) + 2)',
      check: { fn: 'ndcg_at_k', args: ['recs', 'held_out', 'k'], ints: ['recs', 'held_out', 'k'], cases: NDCG_CASES.map(c => ({ ...c, held_out: c.held })), describe: c => `recs [${c.recs.join(', ')}], held-out ${c.held}, k = ${c.k}`, diagnose: diagnoseNdcg },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New items, ranks and catalogs. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
