import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 17 practice ladder: the two k-means steps, inertia, and the silhouette.

const d2 = (a, b) => a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0)
const mean = a => a.reduce((s, v) => s + v, 0) / a.length
export const assignOf = (X, C) => X.map(x => { let best = 0; C.forEach((c, j) => { if (d2(x, c) < d2(x, C[best])) best = j }); return best })
export const updateOf = (X, labels, k) => Array.from({ length: k }, (_, j) => { const P = X.filter((_, i) => labels[i] === j); return P[0].map((_, f) => mean(P.map(p => p[f]))) })
export function silhouetteOf(X, labels) {
  const ks = [...new Set(labels)]
  return X.map((x, i) => {
    const md = j => mean(X.filter((_, t) => t !== i && labels[t] === j).map(p => Math.sqrt(d2(x, p))))
    const a = md(labels[i]), b = Math.min(...ks.filter(j => j !== labels[i]).map(md))
    return (b - a) / Math.max(a, b)
  })
}

const ASSIGN_CASES = [
  { X: [[1], [2], [3], [10], [11], [12]], C: [[2], [6]] },
  { X: [[0, 0], [5, 5], [1, 4]], C: [[0, 1], [5, 4]] },
  { X: [[3, 3], [-1, 0], [8, 1], [2, 9]], C: [[0, 0], [9, 0], [2, 8]] },
  { X: [[0.5, 0.5], [2, 2]], C: [[3, 3], [0, 0]] },
].map(c => ({ ...c, expected: assignOf(c.X, c.C) }))
const UPDATE_CASES = [
  { X: [[1, 2], [3, 4], [10, 0], [12, 2]], labels: [0, 0, 1, 1], k: 2 },
  { X: [[2], [3], [4], [11]], labels: [0, 0, 0, 0], k: 1 },
  { X: [[0, 0, 1], [2, 2, 3], [9, 9, 9]], labels: [1, 1, 0], k: 2 },
  { X: [[1, 5], [4, 1], [7, 3], [2, 2], [6, 6]], labels: [2, 0, 1, 0, 1], k: 3 },
].map(c => ({ ...c, expected: updateOf(c.X, c.labels, c.k) }))
export const SIL_CASES = [
  { X: [[1], [2], [3], [10], [11], [12]], labels: [0, 0, 0, 1, 1, 1] },
  { X: [[0, 0], [0, 1], [4, 0], [4, 2], [9, 9]], labels: [0, 0, 1, 1, 1] },
  { X: [[1, 1], [2, 1], [1, 2], [5, 5], [6, 5]], labels: [0, 0, 0, 1, 1] },
  { X: [[0], [1], [3], [7], [8]], labels: [0, 0, 1, 1, 1] },
].map(c => ({ ...c, expected: silhouetteOf(c.X, c.labels) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseAssign(c, got) {
  const far = c.X.map(x => { let best = 0; c.C.forEach((cc, j) => { if (d2(x, cc) > d2(x, c.C[best])) best = j }); return best })
  if (near(got.value, far) && !near(far, c.expected)) return 'That picks the FARTHEST centre: use argmin, not argmax.'
  if (got.value?.length === c.C.length && c.C.length !== c.X.length) return 'Return one label per point, not one per centre: take the argmin across centres (axis=1).'
  return null
}
export function diagnoseUpdate(c, got) {
  const scalar = Array.from({ length: c.k }, (_, j) => { const P = c.X.filter((_, i) => c.labels[i] === j).flat(); return c.X[0].map(() => mean(P)) })
  if (near(got.value, scalar) && !near(scalar, c.expected)) return 'Each centre became one number repeated: the mean ran over every coordinate of every point together. Average down the rows only — .mean(axis=0).'
  return null
}
export function diagnoseSil(c, got) {
  const flip = c.expected.map(v => -v)
  if (near(got.value, flip)) return 'The sign is reversed: s = (b − a)/max(a, b), positive when a point is closer to its own cluster.'
  const withSelf = c.X.map((x, i) => {
    const md = j => mean(c.X.filter((_, t) => c.labels[t] === j).map(p => Math.sqrt(d2(x, p))))
    const ks = [...new Set(c.labels)], a = md(c.labels[i]), b = Math.min(...ks.filter(j => j !== c.labels[i]).map(md))
    return (b - a) / Math.max(a, b)
  })
  if (near(got.value, withSelf)) return 'a(i) included the point’s zero distance to itself. Average over the OTHER members of its cluster.'
  return null
}
export function evaluateScale(vars) {
  const miss = needVars(vars, ['scale', 'agreement'])
  if (miss) return { passed: false, message: miss }
  if (!Number(vars.scale.value)) return { passed: false, message: `Rand index ${r3(vars.agreement.value)}: barely better than splitting at random. Income is in dollars, so its spread (thousands) swamps age and visits in every distance, and income carries no group information here. Set \`scale = 1\` and run again.` }
  return { passed: true, message: `Rand index ${r3(vars.agreement.value)}: after standardizing, age and visits count as much as income, and the three groups reappear. k-means had not changed — only what “close” means.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['centre', 'inertia', 'silhouette']
export function generate(template, seed) {
  const g = rng(seed * 173 + TEMPLATES.indexOf(template) * 4001 + 41)
  if (template === 'centre') {
    const n = g.int(3, 5), pts = Array.from({ length: n }, () => g.int(0, 20)), answer = mean(pts)
    const sorted = [...pts].sort((a, b) => a - b), median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    return { template, seed, pts, answer, misconceptions: [{ answer: median, feedback: 'That is the median. k-means moves each centre to the mean, which minimizes the squared distances.' }, { answer: (sorted[0] + sorted[n - 1]) / 2, feedback: 'That is the midpoint of the extremes. Average every point.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  if (template === 'inertia') {
    const c = g.int(2, 10), pts = Array.from({ length: g.int(3, 4) }, () => c + g.int(-3, 3)), answer = pts.reduce((s, v) => s + (v - c) ** 2, 0)
    if (answer === 0) return generate(template, seed + 1000)
    return { template, seed, c, pts, answer, misconceptions: [{ answer: pts.reduce((s, v) => s + Math.abs(v - c), 0), feedback: 'Inertia sums SQUARED distances.' }, { answer: answer / pts.length, feedback: 'Inertia is the sum, not the mean.' }].filter(m => m.answer !== answer) }
  }
  const a = g.int(1, 9), b = g.int(1, 9)
  if (a === b) return generate(template, seed + 1000)
  const answer = (b - a) / Math.max(a, b)
  return { template, seed, a, b, answer, misconceptions: [{ answer: (a - b) / Math.max(a, b), feedback: 'The sign is reversed: (b − a), positive when the point is nearer its own cluster.' }, { answer: (b - a) / Math.min(a, b), feedback: 'Divide by the larger of a and b, so s stays between −1 and 1.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'centre') return { intro: `A cluster’s points on a line: ${p.pts.join(', ')}.`, questions: [{ id: 'c', type: 'number', label: 'Where does the k-means update step put its centre? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  if (p.template === 'inertia') return { intro: `A cluster with centre ${p.c} holds the points ${p.pts.join(', ')} on a line.`, questions: [{ id: 'i', type: 'number', label: 'What is this cluster’s contribution to the inertia?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A point’s mean distance to the other members of its cluster is a = ${p.a}; its mean distance to the nearest other cluster is b = ${p.b}.`, questions: [{ id: 's', type: 'number', label: 'What is its silhouette? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'centre') return `(${p.pts.join(' + ')})/${p.pts.length} = **${Math.round(p.answer * 100) / 100}**.`
  if (p.template === 'inertia') return `${p.pts.map(v => `(${v} − ${p.c})²`).join(' + ')} = ${p.pts.map(v => (v - p.c) ** 2).join(' + ')} = **${p.answer}**.`
  return `(b − a)/max(a, b) = (${p.b} − ${p.a})/${Math.max(p.a, p.b)} = **${r3(p.answer)}**.`
}

export const kmeans = {
  title: 'k-means steps and the silhouette',
  version: 1,
  templates: TEMPLATES,
  templateNames: { centre: 'Update step', inertia: 'Inertia', silhouette: 'Silhouette' },
  generate, view, workedSolution,
  intro: 'Seven steps: one k-means iteration by hand, the effect of units, and writing the assignment, update and silhouette. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'One iteration by hand',
      prompt: 'Points 1, 2, 3, 10, 11, 12 on a line; k-means starts with centres at 2 and 6.',
      fields: [
        { label: 'How many points are assigned to the centre at 6?', answer: 3 },
        { label: 'Where does the update step move that centre?', answer: 11 },
        { label: 'Inertia after the update', answer: 4 },
        { label: 'Silhouette of the point 3 (four decimals)', answer: 0.8125, tolerance: 0.00006 },
      ],
      explain: '1, 2, 3 are nearer 2; 10, 11, 12 are nearer 6 (distances 4–6 against 8–10). The centres move to the means, 2 and 11. Inertia = (1 + 0 + 1) + (1 + 0 + 1) = 4. For the point 3: a = mean distance to 1 and 2 = 1.5; b = mean distance to 10, 11, 12 = 8; s = (8 − 1.5)/8 = 0.8125.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Let the units decide',
      prompt: 'Three known customer groups that differ in age and visits per month; income (in dollars) is unrelated to the groups. k-means with k = 3, scored by the **Rand index**: the fraction of point pairs that it and the true groups treat the same way (1 = identical). Run it with `scale = 0`, then **set `scale = 1`** to standardize each column first, and run again. Predict first.',
      starter: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import rand_score
rng = np.random.default_rng(0)
groups = np.repeat([0, 1, 2], 50)
age = np.array([25, 45, 65])[groups] + rng.normal(0, 5, 150)
visits = np.array([2, 10, 4])[groups] + rng.normal(0, 1.5, 150)
income = rng.normal(50000, 15000, 150)
X = np.column_stack([age, visits, income])

scale = 0
Z = (X - X.mean(axis=0)) / X.std(axis=0) if scale else X
labels = KMeans(n_clusters=3, n_init=10, random_state=0).fit_predict(Z)
agreement = rand_score(groups, labels)
print(f"scale = {scale}: Rand index {agreement:.3f}")`,
      probe: ['scale', 'agreement'],
      evaluate: evaluateScale,
      done: 'Every distance-based method (k-means, kNN in Lab 10, DBSCAN, RBF kernels) inherits this. Choosing the scale is choosing what similar means.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the assignment step',
      prompt: 'Replace `___` so every point gets the index of its nearest centre.',
      starter: `import numpy as np

def assign(X, C):
    """X: points (rows), C: centres (rows). Return, for each point, the index of the nearest centre."""
    d2 = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)   # d2[i, j]: squared distance, point i to centre j
    return ___`,
      hint: 'For each row of d2, the column with the smallest value.',
      solution: 'return np.argmin(d2, axis=1)',
      check: { fn: 'assign', args: ['X', 'C'], cases: ASSIGN_CASES, describe: c => `${c.X.length} points, ${c.C.length} centres`, diagnose: diagnoseAssign },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For points (1, 2), (3, 4), (10, 0), (12, 2) in clusters 0, 0, 1, 1, this returns centres **(2.5, 2.5)** and **(6, 6)**. They should be (2, 3) and (11, 1). Fix it.',
      starter: `import numpy as np

def update(X, labels, k):
    """Move each centre to the mean of its points. Return a k-by-features array."""
    C = np.zeros((k, X.shape[1]))
    for j in range(k):
        C[j] = X[labels == j].mean()
    return C`,
      hint: 'X[labels == j] is a table of points. Which axis runs over the points?',
      solution: 'C[j] = X[labels == j].mean(axis=0)',
      check: { fn: 'update', args: ['X', 'labels', 'k'], ints: ['k'], cases: UPDATE_CASES, describe: c => `${c.X.length} points, k = ${c.k}`, diagnose: diagnoseUpdate },
      explainChoice: {
        prompt: 'Why the mean, rather than the median or some other centre?',
        options: [
          { text: 'The mean is the point that minimizes the sum of squared distances to a set — so the update step can only lower the inertia, which is why k-means always converges.', correct: true },
          { text: 'The mean is robust to outliers.', feedback: 'The opposite: one far point pulls the mean toward it. The median is the robust one (k-medians).' },
          { text: 'Only because it is fast to compute.', feedback: 'It is fast, but the reason is the inertia objective.' },
          { text: 'The mean is always one of the data points.', feedback: 'It usually is not; k-medoids uses actual points.' },
        ],
        rightFeedback: 'Assign minimizes each point’s term; update minimizes each cluster’s sum. Neither step can raise the inertia.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the silhouette',
      prompt: 'Write `silhouette` from its contract. Every cluster in the checks has at least two points.',
      starter: `import numpy as np

def silhouette(X, labels):
    """Per-point silhouette s(i) = (b - a) / max(a, b), with Euclidean distances:
    a = mean distance from point i to the OTHER points of its own cluster,
    b = the smallest, over the other clusters, of the mean distance from i to that cluster's points.

    Example: silhouette(np.array([[0.], [1.], [3.], [7.], [8.]]), np.array([0, 0, 1, 1, 1]))
             ->  array([0.83333333, 0.8, -0.44444444, 0.61538462, 0.6])
    """
    pass   # replace with your code`,
      hint: 'Build the full distance matrix D once. For point i: own = labels == labels[i], without i itself; a = D[i, own].mean(); b = min of D[i, labels == j].mean() over the other labels j.',
      solution: 'D = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))\ns = np.zeros(len(X))\nfor i in range(len(X)):\n    own = labels == labels[i]\n    own[i] = False\n    a = D[i, own].mean()\n    b = min(D[i, labels == j].mean() for j in np.unique(labels) if j != labels[i])\n    s[i] = (b - a) / max(a, b)\nreturn s',
      check: { fn: 'silhouette', args: ['X', 'labels'], cases: SIL_CASES, describe: c => `${c.X.length} points, ${new Set(c.labels).size} clusters`, diagnose: diagnoseSil },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New clusters and points. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
