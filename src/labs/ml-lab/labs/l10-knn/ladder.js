import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 10 practice ladder: distances, the k nearest, the vote — and scaling. Every check case is chosen
// so the k-th and (k+1)-th distances differ (no ties), which the ladder test enforces.

export const distOf = (a, b) => Math.hypot(...a.map((v, j) => v - b[j]))
export const shareOf = (X, y, q, k) => X.map((x, i) => ({ d: distOf(x, q), y: y[i] })).sort((a, b) => a.d - b.d).slice(0, k).reduce((s, n) => s + n.y, 0) / k

const XT = [[1, 1], [1.5, 2], [2, 2.5], [2.5, 1.5], [3, 3], [0.5, 3], [4, 1], [3.5, 3.5], [1, 4], [4, 4]]
const YT = [1, 1, 0, 1, 0, 0, 1, 0, 0, 1]
const SHARE_CASES = [
  { X: XT, y: YT, q: [2.1, 2], k: 5 }, { X: XT, y: YT, q: [2.1, 2], k: 1 },
  { X: XT, y: YT, q: [3.5, 3.2], k: 3 }, { X: [[0, 0], [10, 0], [0, 12]], y: [1, 0, 0], q: [1, 1], k: 2 },
].map(c => ({ ...c, expected: shareOf(c.X, c.y, c.q, c.k) }))
const DIST_CASES = [
  { X: [[1, 2], [4, 6], [0, 0]], q: [1, 2] }, { X: [[3, 4]], q: [0, 0] }, { X: [[1, 1, 1], [2, 2, 2]], q: [0, 0, 0] },
].map(c => ({ ...c, expected: c.X.map(x => distOf(x, c.q)) }))
export const TIE_CHECK = SHARE_CASES   // for the test

export function diagnoseDist(c, got) {
  const v = got.value
  if (!v || v.length !== c.X.length) return 'Return one distance per training row: shape (n,).'
  if (v.every((x, i) => Math.abs(x - c.expected[i] ** 2) < 1e-9)) return 'Those are squared distances: take the square root.'
  if (v.every((x, i) => Math.abs(x - c.X[i].reduce((s, a, j) => s + Math.abs(a - c.q[j]), 0)) < 1e-9) && !v.every((x, i) => Math.abs(x - c.expected[i]) < 1e-9)) return 'That is the Manhattan distance (sum of absolute differences); the contract asks for Euclidean.'
  return null
}
export function diagnoseShare(c, got) {
  const v = got.value, far = c.X.map((x, i) => ({ d: distOf(x, c.q), y: c.y[i] })).sort((a, b) => b.d - a.d).slice(0, c.k).reduce((s, n) => s + n.y, 0) / c.k
  if (Math.abs(v - far) < 1e-9 && Math.abs(far - c.expected) > 1e-9) return 'Those are the k FARTHEST rows: argsort sorts ascending, so the nearest are at the start.'
  if (Math.abs(v - c.expected * c.k) < 1e-9 && c.k > 1) return 'That is the number of class-1 neighbours; the contract asks for the share.'
  return null
}
export function evaluateScaling(vars) {
  const miss = needVars(vars, ['X', 'q', 'nearest'])
  if (miss) return { passed: false, message: miss }
  const X = vars.X.value, nearest = Number(vars.nearest.value)
  if (Math.max(...X.map(r => r[1])) < 100) return { passed: false, message: 'Keep memory in MB (the ×1000): the point is to fix the distance, not the units.' }
  if (nearest !== 0) return { passed: false, message: `Nearest is machine ${'ABC'[nearest]}: memory in MB differs by hundreds while load differs by at most 0.65, so memory decides everything. Standardize both features with the stored rows’ mean and standard deviation (apply the same to q) and run again.` }
  return { passed: true, message: 'Machine A is nearest again: after standardizing, one standard deviation counts the same in both features, so the unit no longer decides who is similar.' }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['dist', 'vote', 'side']
export function generate(template, seed) {
  const g = rng(seed * 997 + TEMPLATES.indexOf(template) * 7001 + 13)
  if (template === 'dist') {
    const a = [g.int(-3, 5), g.int(-3, 5)], b = [g.int(-3, 5), g.int(-3, 5)], manhattan = g.int(0, 1) === 1
    if (a[0] === b[0] && a[1] === b[1]) b[0] += 2
    const e = distOf(a, b), m = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), answer = manhattan ? m : e
    return { template, seed, a, b, manhattan, answer, misconceptions: [{ answer: manhattan ? e : m, feedback: manhattan ? 'That is the Euclidean (straight-line) distance; Manhattan adds the absolute differences.' : 'That is the Manhattan distance; Euclidean takes the square root of the sum of squared differences.' }, { answer: e * e, feedback: 'That is the squared distance: take the square root.' }].filter(x => Math.abs(x.answer - answer) > 0.0006) }
  }
  if (template === 'vote') {
    const labels = Array.from({ length: 9 }, () => g.int(0, 1)), k = g.pick([3, 5, 7])
    const answer = labels.slice(0, k).reduce((s, v) => s + v, 0) / k, all = labels.reduce((s, v) => s + v, 0) / 9
    return { template, seed, labels, k, answer, misconceptions: Math.abs(all - answer) > 0.0006 ? [{ answer: all, feedback: `That votes over all 9 rows; only the ${k} nearest vote.` }] : [] }
  }
  const f = g.pick([0.01, 0.05, 0.1]), d = g.pick([2, 3, 5, 10]), answer = f ** (1 / d)
  return { template, seed, f, d, answer, misconceptions: [{ answer: f / d, feedback: `The fraction of volume is side^d, so side = f^(1/d), not f/d.` }, { answer: f, feedback: 'That is the share of the data, not the side length.' }].filter(x => Math.abs(x.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'dist') return { intro: `Two points: a = (${p.a.join(', ')}) and b = (${p.b.join(', ')}).`, questions: [{ id: 'd', type: 'number', label: `What is their **${p.manhattan ? 'Manhattan' : 'Euclidean'}** distance? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'vote') return { intro: `The training labels, sorted from the nearest row to the farthest, are [${p.labels.join(', ')}].`, questions: [{ id: 'v', type: 'number', label: `What class-1 share does ${p.k}-NN predict? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `Data are spread uniformly over a ${p.d}-dimensional unit cube.`, questions: [{ id: 's', type: 'number', label: `What side length must a cube-shaped neighbourhood have to contain ${p.f * 100}% of the data? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'dist') return p.manhattan ? `|${p.a[0]} − ${p.b[0]}| + |${p.a[1]} − ${p.b[1]}| = **${p.answer}**.` : `√((${p.a[0]} − ${p.b[0]})² + (${p.a[1]} − ${p.b[1]})²) = **${r3(p.answer)}**.`
  if (p.template === 'vote') return `The first ${p.k} labels are [${p.labels.slice(0, p.k).join(', ')}]: share ${p.labels.slice(0, p.k).reduce((s, v) => s + v, 0)}/${p.k} = **${r3(p.answer)}**.`
  return `side^${p.d} = ${p.f}, so side = ${p.f}^(1/${p.d}) = **${r3(p.answer)}** of each feature’s range.`
}

export const knn = {
  title: 'Distances, neighbours and the vote',
  version: 1,
  templates: TEMPLATES,
  templateNames: { dist: 'A distance', vote: 'The vote', side: 'How wide is local?' },
  generate, view, workedSolution,
  intro: 'Seven steps: find neighbours by hand, fix a scaling problem, and write the distance and the vote. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Find the neighbours by hand',
      prompt: 'Query (2, 2). Stored points: A (1, 1) class 1; B (2, 4) class 0; C (3, 2) class 0; D (2, 2.5) class 1.',
      fields: [
        { label: 'Distance to A, three decimals', answer: 1.414, tolerance: 0.0006 },
        { label: 'Distance to C', answer: 1 },
        { label: 'Distance to D', answer: 0.5 },
        { label: 'Class-1 share of the 3 nearest, three decimals', answer: 0.667, tolerance: 0.0006 },
      ],
      explain: 'Distances: A √2 ≈ 1.414, B 2, C 1, D 0.5. The three nearest are D, C and A, with labels 1, 0, 1: share 2/3, so 3-NN predicts class 1.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Scale before you measure',
      prompt: 'Three stored machines (CPU load, memory in MB) and a query like machine A. Run it: the nearest is the busy machine B. Then **standardize both features** with the stored rows’ mean and standard deviation, apply the same transform to q, and run again.',
      starter: `import numpy as np
X = np.array([[0.20, 4000.], [0.85, 4100.], [0.25, 6000.]])   # load, memory (MB): machines A, B, C
q = np.array([0.22, 4200.])                                    # the query: low load, 4.2 GB

d = np.sqrt(((X - q) ** 2).sum(axis=1))
nearest = int(np.argmin(d))
print("distances", np.round(d, 3), " nearest:", "ABC"[nearest])`,
      probe: ['X', 'q', 'nearest'],
      evaluate: evaluateScaling,
      done: 'Choosing and scaling features is choosing what “similar” means; standardizing with the stored rows’ statistics is the usual default.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the distances',
      prompt: 'Replace `___` with the Euclidean distance from q to every row of X, in one expression.',
      starter: `import numpy as np

def distances(X, q):
    """Euclidean distance from query q, shape (d,), to each row of X, shape (n, d). Returns (n,)."""
    return ___`,
      hint: 'X − q broadcasts q over the rows; square, sum across each row (axis=1), square root.',
      solution: 'return np.sqrt(((X - q) ** 2).sum(axis=1))',
      check: { fn: 'distances', args: ['X', 'q'], cases: DIST_CASES, describe: c => `${c.X.length} rows, q = (${c.q.join(', ')})`, diagnose: diagnoseDist },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For the query (2.1, 2) with k = 1 this predicts **0** where the single nearest row has class 1. Find the bug.',
      starter: `import numpy as np

def knn_share(X, y, q, k):
    """Class-1 share among the k training rows nearest to q."""
    d = np.sqrt(((X - q) ** 2).sum(axis=1))
    nearest = np.argsort(d)[-k:]
    return y[nearest].mean()`,
      hint: 'np.argsort sorts from smallest to largest. Which end holds the nearest rows?',
      solution: 'nearest = np.argsort(d)[:k]',
      check: { fn: 'knn_share', args: ['X', 'y', 'q', 'k'], ints: ['k'], cases: SHARE_CASES, describe: c => `q = (${c.q.join(', ')}), k = ${c.k}`, diagnose: diagnoseShare },
      explainChoice: {
        prompt: 'Why is this bug easy to miss?',
        options: [
          { text: 'It still returns a share between 0 and 1 and runs without error; only comparing a prediction with the actual neighbours shows it voted with the k farthest rows.', correct: true },
          { text: 'argsort is random.', feedback: 'argsort is deterministic; it sorts ascending.' },
          { text: 'It only fails when k = 1.', feedback: 'It takes the farthest rows for every k; with large k the two sets overlap more, which hides it further.' },
          { text: 'The mean should be a median.', feedback: 'The mean of 0/1 labels is exactly the class-1 share.' },
        ],
        rightFeedback: 'Inspecting the neighbours behind a few predictions is k-NN’s best debugging tool.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write k-NN from the contract',
      prompt: 'Write `knn_share` yourself.',
      starter: `import numpy as np

def knn_share(X, y, q, k):
    """The class-1 share among the k rows of X (n, d) nearest to q (d,) by Euclidean distance.
    y holds 0/1 labels. Must not change X, y or q.

    Example: knn_share(np.array([[0., 0.], [10., 0.], [0., 12.]]), np.array([1., 0., 0.]), np.array([1., 1.]), 2)  ->  0.5
    """
    pass   # replace with your code`,
      hint: 'Distances, np.argsort, the first k indices, the mean of their labels.',
      solution: 'd = np.sqrt(((X - q) ** 2).sum(axis=1))\nreturn y[np.argsort(d)[:k]].mean()',
      check: { fn: 'knn_share', args: ['X', 'y', 'q', 'k'], ints: ['k'], cases: SHARE_CASES, describe: c => `q = (${c.q.join(', ')}), k = ${c.k}`, diagnose: diagnoseShare },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New points and settings. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
