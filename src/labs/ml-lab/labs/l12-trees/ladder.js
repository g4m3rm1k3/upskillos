import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 12 practice ladder: Gini impurity, size-weighted gain, the best threshold, and depth control.
// Every best-split case has a unique best threshold (the ladder test checks the margin).

export const giniOf = y => { if (!y.length) return 0; const p = y.reduce((a, b) => a + b, 0) / y.length; return 2 * p * (1 - p) }
export function splitsOf(x, y) {
  const o = x.map((v, i) => [v, y[i]]).sort((a, b) => a[0] - b[0]), out = []
  for (let i = 1; i < o.length; i++) {
    if (o[i][0] === o[i - 1][0]) continue
    const L = o.slice(0, i).map(r => r[1]), R = o.slice(i).map(r => r[1])
    out.push({ t: (o[i - 1][0] + o[i][0]) / 2, gain: giniOf(y) - (L.length * giniOf(L) + R.length * giniOf(R)) / y.length })
  }
  return out
}
export const bestOf = (x, y) => splitsOf(x, y).reduce((b, s) => (s.gain > b.gain + 1e-12 ? s : b))

const GINI_CASES = [[0, 0, 1, 1, 1], [1, 1, 1, 1], [0, 1], [1, 0, 0, 0, 0, 0, 0, 0]].map(y => ({ y, expected: giniOf(y) }))
const GAIN_CASES = [
  { parent: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], left: [0], right: [0, 0, 0, 0, 1, 1, 1, 1, 1] },
  { parent: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1], left: [0, 0, 0, 0, 1], right: [0, 1, 1, 1, 1] },
  { parent: [0, 0, 1, 1], left: [0, 0], right: [1, 1] },
  { parent: [0, 1, 1, 1, 1, 1], left: [1], right: [0, 1, 1, 1, 1] },
].map(c => ({ ...c, expected: giniOf(c.parent) - (c.left.length * giniOf(c.left) + c.right.length * giniOf(c.right)) / c.parent.length }))
export const SPLIT_CASES = [
  { x: [1, 2, 2, 3, 5, 6, 7, 8], y: [0, 0, 0, 1, 0, 1, 1, 0] },
  { x: [1, 2, 3, 4], y: [0, 0, 1, 1] },
  { x: [3, 1, 2], y: [1, 0, 1] },
  { x: [10, 20, 30, 40, 50, 60], y: [1, 1, 1, 1, 0, 1] },
].map(c => { const b = bestOf(c.x, c.y); return { ...c, expected: [b.t, b.gain] } })

export function diagnoseGini(c, got) {
  const p = c.y.reduce((a, b) => a + b, 0) / c.y.length, v = got.value
  if (Math.abs(v - p * (1 - p)) < 1e-9 && p * (1 - p) !== c.expected) return 'Half the right value: Gini for two classes is 2p(1 − p) — p(1 − p) for each of the two classes, added.'
  if (Math.abs(v - p) < 1e-9 && p !== c.expected) return 'That is p, the class-1 share. Impurity is 0 for a pure node and largest for an even mix.'
  return null
}
export function diagnoseGain(c, got) {
  const plain = giniOf(c.parent) - (giniOf(c.left) + giniOf(c.right)) / 2
  if (Math.abs(got.value - plain) < 1e-9 && Math.abs(plain - c.expected) > 1e-9) return 'The children were averaged equally. Weight each by its share of the rows, or a split that isolates one point in a pure leaf looks far better than it is.'
  return null
}
export function diagnoseSplit(c, got) {
  const v = got.value
  if (!v || v.length !== 2) return 'Return [threshold, gain].'
  const all = splitsOf(c.x, c.y), worst = all.reduce((b, s) => (s.gain < b.gain ? s : b))
  if (Math.abs(v[0] - worst.t) < 1e-9 && worst.t !== c.expected[0]) return 'That is the split with the LOWEST gain: keep the largest.'
  if (!all.some(s => Math.abs(s.t - v[0]) < 1e-9)) return 'Candidate thresholds are midpoints between consecutive distinct sorted values.'
  return null
}
export function evaluateDepth(vars) {
  const miss = needVars(vars, ['max_depth', 'train_full', 'val_full', 'train_limited', 'val_limited'])
  if (miss) return { passed: false, message: miss }
  const d = vars.max_depth.value
  if (d == null || !Number.isFinite(Number(d))) return { passed: false, message: `An unlimited tree scores ${r3(vars.train_full.value)} on training rows and ${r3(vars.val_full.value)} on validation: it has memorized noise. Set \`max_depth = 3\` for the second tree and run again.` }
  if (Number(d) > 5) return { passed: false, message: 'Try a small depth such as 3, so each leaf averages many rows.' }
  if (Number(vars.val_limited.value) < Number(vars.val_full.value)) return { passed: false, message: 'The limited tree should do at least as well on validation. Did an edit change the data?' }
  return { passed: true, message: `Depth ${d}: training ${r3(vars.train_limited.value)}, validation ${r3(vars.val_limited.value)}, against ${r3(vars.train_full.value)} and ${r3(vars.val_full.value)} unlimited. Lower training accuracy, better on unseen rows.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['gini', 'gain', 'count']
export function generate(template, seed) {
  const g = rng(seed * 769 + TEMPLATES.indexOf(template) * 5003 + 19)
  if (template === 'gini') {
    const n = g.pick([4, 5, 8, 10]), k = g.int(1, n - 1), answer = 2 * (k / n) * (1 - k / n)
    return { template, seed, n, k, answer, misconceptions: [{ answer: (k / n) * (1 - k / n), feedback: 'Two classes: Gini = 2p(1 − p).' }, { answer: k / n, feedback: 'That is the class-1 share p, not the impurity.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'gain') {
    for (let a = 0; a < 100; a++) {
      const nl = g.int(2, 6), nr = g.int(2, 6), kl = g.int(0, nl), kr = g.int(0, nr), n = nl + nr, k = kl + kr
      if (k === 0 || k === n) continue
      const gl = 2 * (kl / nl) * (1 - kl / nl), gr = 2 * (kr / nr) * (1 - kr / nr), gp = 2 * (k / n) * (1 - k / n)
      const answer = gp - (nl * gl + nr * gr) / n, plain = gp - (gl + gr) / 2
      return { template, seed, nl, nr, kl, kr, answer, misconceptions: Math.abs(plain - answer) > 0.0006 ? [{ answer: plain, feedback: 'Weight each child’s impurity by its share of the rows.' }] : [] }
    }
  }
  const n = g.int(5, 40), dup = g.int(0, Math.floor(n / 3)), answer = n - dup - 1
  return { template, seed, n, dup, answer, misconceptions: [{ answer: n - 1, feedback: 'Equal values cannot be separated: count distinct values first.' }, { answer: n - dup, feedback: 'Thresholds sit between consecutive distinct values: one fewer than the number of distinct values.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'gini') return { intro: `A node holds ${p.n} points: ${p.k} of class 1 and ${p.n - p.k} of class 0.`, questions: [{ id: 'g', type: 'number', label: 'What is its Gini impurity 2p(1 − p)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'gain') return { intro: `A split sends ${p.nl} points left (${p.kl} of class 1) and ${p.nr} right (${p.kr} of class 1).`, questions: [{ id: 'g', type: 'number', label: 'What is the Gini gain: parent impurity minus the size-weighted child impurity? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `A node’s ${p.n} points have ${p.n - p.dup} distinct values of one feature (${p.dup} are repeats).`, questions: [{ id: 'c', type: 'number', label: 'How many candidate thresholds does the scan try on that feature?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'gini') return `p = ${p.k}/${p.n}; 2p(1 − p) = **${r3(p.answer)}**.`
  if (p.template === 'gain') { const n = p.nl + p.nr, k = p.kl + p.kr; return `Parent: 2·(${k}/${n})·(1 − ${k}/${n}) = ${r3(2 * (k / n) * (1 - k / n))}. Left ${r3(2 * (p.kl / p.nl) * (1 - p.kl / p.nl))}, right ${r3(2 * (p.kr / p.nr) * (1 - p.kr / p.nr))}; weighted (${p.nl}·left + ${p.nr}·right)/${n}. Gain = **${r3(p.answer)}**.` }
  return `${p.n - p.dup} distinct values → ${p.n - p.dup} − 1 = **${p.answer}** midpoints.`
}

export const split = {
  title: 'Impurity, gain and the best split',
  version: 1,
  templates: TEMPLATES,
  templateNames: { gini: 'Gini impurity', gain: 'Gini gain', count: 'Candidate thresholds' },
  generate, view, workedSolution,
  intro: 'Seven steps: impurity and gain by hand, controlling depth, and writing the split search. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Score one split by hand',
      prompt: 'A node holds labels [0, 0, 1, 1, 1]. A question sends [0, 0] left and [1, 1, 1] right.',
      fields: [
        { label: 'Class-1 share p of the node', answer: 0.6 },
        { label: 'Node Gini 2p(1 − p)', answer: 0.48, tolerance: 1e-9 },
        { label: 'Size-weighted child Gini', answer: 0 },
        { label: 'Gain', answer: 0.48, tolerance: 1e-9 },
      ],
      explain: 'p = 3/5; Gini = 2 × 0.6 × 0.4 = 0.48. Both children are pure (Gini 0), so the weighted child impurity is 0 and the gain is the whole 0.48 — the best any split of this node can do.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Limit the depth',
      prompt: 'Two trees on noisy two-class data. As written, both grow without limit (`max_depth = None`). Run it, then **set `max_depth = 3`** and run again. Predict first: which tree will score higher on training rows, and which on validation rows?',
      starter: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.tree import DecisionTreeClassifier
X, y = make_moons(n_samples=400, noise=0.35, random_state=0)
Xtr, ytr, Xva, yva = X[:300], y[:300], X[300:], y[300:]

full = DecisionTreeClassifier(random_state=0).fit(Xtr, ytr)
max_depth = None
limited = DecisionTreeClassifier(max_depth=max_depth, random_state=0).fit(Xtr, ytr)
train_full, val_full = full.score(Xtr, ytr), full.score(Xva, yva)
train_limited, val_limited = limited.score(Xtr, ytr), limited.score(Xva, yva)
print(f"unlimited: train {train_full:.3f}  validation {val_full:.3f}")
print(f"max_depth={max_depth}: train {train_limited:.3f}  validation {val_limited:.3f}")`,
      probe: ['max_depth', 'train_full', 'val_full', 'train_limited', 'val_limited'],
      evaluate: evaluateDepth,
      done: 'Depth is a tree’s complexity knob: choose it on validation data, as with any hyperparameter.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the Gini impurity',
      prompt: 'Replace `___` with the Gini impurity of 0/1 labels.',
      starter: `import numpy as np

def gini(y):
    """Gini impurity of 0/1 labels: 0 for a pure node, 0.5 for an even mix."""
    p = np.mean(y)
    return ___`,
      hint: 'The chance two randomly drawn members disagree: 2p(1 − p).',
      solution: 'return 2 * p * (1 - p)',
      check: { fn: 'gini', args: ['y'], cases: GINI_CASES, describe: c => `y = [${c.y.join(', ')}]`, diagnose: diagnoseGini },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For a parent of five 0s and five 1s, this scores the split [0] | [0, 0, 0, 0, 1, 1, 1, 1, 1] at **0.253** — better than the even split [0, 0, 0, 0, 1] | [0, 1, 1, 1, 1] at 0.18. Its true gain is 0.056. Fix it.',
      starter: `import numpy as np

def gain(parent, left, right):
    """Gini gain of splitting parent into left and right."""
    g = lambda y: 2 * np.mean(y) * (1 - np.mean(y))
    return g(parent) - (g(left) + g(right)) / 2`,
      hint: 'A child with one point should count for one row, not for half of all the rows.',
      solution: 'return g(parent) - (len(left) * g(left) + len(right) * g(right)) / len(parent)',
      check: { fn: 'gain', args: ['parent', 'left', 'right'], cases: GAIN_CASES, describe: c => `left ${c.left.length} rows, right ${c.right.length} rows`, diagnose: diagnoseGain },
      explainChoice: {
        prompt: 'What would the bug do to a growing tree?',
        options: [
          { text: 'It would favour splits that peel off a single point into a pure leaf, because a tiny pure child counts as much as a large mixed one — so the tree would chase outliers.', correct: true },
          { text: 'Nothing: the ranking of splits is the same.', feedback: 'The ranking changes: here the useless split scores higher than the good one.' },
          { text: 'It would stop the tree from growing.', feedback: 'It changes which splits are chosen, not whether any are.' },
          { text: 'It would make Gini negative.', feedback: 'Each Gini stays between 0 and 0.5; the weighting is what is wrong.' },
        ],
        rightFeedback: 'Size weighting stops a split that isolates one point from looking better than it is.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the split search',
      prompt: 'Write `best_split` from its contract. Every check case has a single best threshold.',
      starter: `import numpy as np

def best_split(x, y):
    """Try every midpoint between consecutive distinct sorted values of x as a threshold (left: x <= t).
    Return np.array([best_threshold, its Gini gain]).

    Example: best_split(np.array([1., 2., 3., 4.]), np.array([0., 0., 1., 1.]))  ->  array([2.5, 0.5])
    """
    pass   # replace with your code`,
      hint: 'Sort once; for each i where the sorted value changes, the threshold is the midpoint and the children are y_sorted[:i] and y_sorted[i:].',
      solution: 'g = lambda v: 2 * np.mean(v) * (1 - np.mean(v))\no = np.argsort(x); xs, ys = x[o], y[o]\nbest = None\nfor i in range(1, len(xs)):\n    if xs[i] == xs[i - 1]: continue\n    gain = g(ys) - (i * g(ys[:i]) + (len(ys) - i) * g(ys[i:])) / len(ys)\n    if best is None or gain > best[1]: best = ((xs[i - 1] + xs[i]) / 2, gain)\nreturn np.array(best)',
      check: { fn: 'best_split', args: ['x', 'y'], cases: SPLIT_CASES, describe: c => `x = [${c.x.join(', ')}]`, diagnose: diagnoseSplit },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New nodes and splits. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
