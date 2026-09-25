import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 18 practice ladder: projection, covariance, reconstruction and explained variance.
// Principal directions are defined only up to sign, so every checked function returns something sign-free.

const mean = a => a.reduce((s, v) => s + v, 0) / a.length
export const meanOf = X => X[0].map((_, j) => mean(X.map(r => r[j])))
export function covOf(X) {
  const m = meanOf(X), C = X.map(r => r.map((v, j) => v - m[j]))
  return m.map((_, i) => m.map((_, j) => C.reduce((s, r) => s + r[i] * r[j], 0) / X.length))
}
// Eigen-decomposition of a symmetric 2 × 2 matrix, largest first.
export function eig2(S) {
  const [[a, b], [, c]] = S, h = Math.sqrt(((a - c) / 2) ** 2 + b * b), l1 = (a + c) / 2 + h, l2 = (a + c) / 2 - h
  let v = Math.abs(b) > 1e-15 ? [b, l1 - a] : a >= c ? [1, 0] : [0, 1]
  const n = Math.hypot(...v); v = v.map(x => x / n)
  return { values: [l1, l2], vectors: [v, [-v[1], v[0]]] }
}
export function reconstructOf(X, k, addMean = true) {
  const m = meanOf(X), { vectors } = eig2(covOf(X)), V = vectors.slice(0, k)
  return X.map(r => {
    const c = r.map((v, j) => v - m[j]), out = addMean ? [...m] : m.map(() => 0)
    V.forEach(v => { const z = c[0] * v[0] + c[1] * v[1]; out[0] += z * v[0]; out[1] += z * v[1] })
    return out
  })
}
export const sharesOf = X => { const l = eig2(covOf(X)).values; return l.map(v => v / (l[0] + l[1])) }

const COV_CASES = [
  { X: [[1, 2], [3, 4], [5, 9]] },
  { X: [[0, 0], [2, 0], [0, 2], [2, 2]] },
  { X: [[4, -3], [6, -1], [2, -5], [4, -3]] },
  { X: [[1, 10], [2, 30], [3, 20]] },
].map(c => ({ ...c, expected: covOf(c.X) }))
export const REC_CASES = [
  { X: [[2, 1], [4, 3], [6, 4], [8, 8]], k: 1 },
  { X: [[5, 0], [3, 2], [1, 1], [-1, 5]], k: 1 },
  { X: [[10, 12], [11, 12], [13, 15], [14, 13], [12, 17]], k: 1 },
  { X: [[1, 2], [3, 1], [2, 5]], k: 2 },
].map(c => ({ ...c, expected: reconstructOf(c.X, c.k) }))
export const SHARE_CASES = [
  { X: [[2, 1], [4, 3], [6, 4], [8, 8]] },
  { X: [[0, 0], [4, 0], [0, 1], [4, 1]] },
  { X: [[1, 1], [2, 3], [3, 2], [5, 6], [4, 4]] },
  { X: [[-3, 1], [0, 0], [3, -1], [1, 2]] },
].map(c => ({ ...c, expected: sharesOf(c.X) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseCov(c, got) {
  const n = c.X.length, sample = c.expected.map(r => r.map(v => v * n / (n - 1)))
  if (near(got.value, sample)) return 'That divides by n − 1 (the sample covariance, np.cov’s default). This lab’s Σ divides by n.'
  const raw = c.X[0].map((_, i) => c.X[0].map((_, j) => c.X.reduce((s, r) => s + r[i] * r[j], 0) / n))
  if (near(got.value, raw)) return 'The data were not centred: subtract each column’s mean first.'
  return null
}
export function diagnoseRec(c, got) {
  if (near(got.value, reconstructOf(c.X, c.k, false))) return 'That is the reconstruction of the CENTRED data. Add the mean back: x̂ = x̄ + Σ zⱼ vⱼ.'
  return null
}
export function diagnoseShare(c, got) {
  const l = eig2(covOf(c.X)).values
  if (near(got.value, [l[1] / (l[0] + l[1]), l[0] / (l[0] + l[1])])) return 'Largest first: sort the shares in decreasing order.'
  if (near(got.value, l)) return 'Those are the variances themselves. Divide each by their total.'
  return null
}
export function evaluateCenter(vars) {
  const miss = needVars(vars, ['center', 'angle', 'share'])
  if (miss) return { passed: false, message: miss }
  if (!Number(vars.center.value)) return { passed: false, message: `Without centring, PC1 is ${r3(vars.angle.value)}° away from the cloud’s long axis — yet it claims ${r3(vars.share.value)} of the “variance”, because it is partly pointing at the offset (4, −3) from the origin. Set \`center = 1\` and run again.` }
  return { passed: true, message: `Centred: ${r3(vars.angle.value)}° from the long axis, explaining ${r3(vars.share.value)} of the variance. The share fell and the direction is now right: before, the first component was spending itself on the mean.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['coordinate', 'share', 'error']
const UNITS = [[0.6, 0.8], [0.8, 0.6], [-0.6, 0.8], [0.8, -0.6], [5 / 13, 12 / 13], [12 / 13, 5 / 13]]
export function generate(template, seed) {
  const g = rng(seed * 127 + TEMPLATES.indexOf(template) * 3001 + 43)
  if (template === 'coordinate') {
    const u = g.pick(UNITS), x = [g.int(-6, 6), g.int(-6, 6)], answer = u[0] * x[0] + u[1] * x[1]
    if (Math.abs(answer) < 1e-9) return generate(template, seed + 1000)
    return { template, seed, u, x, answer, misconceptions: [{ answer: u[0] * x[1] + u[1] * x[0], feedback: 'Pair each coordinate with its own: u₁x₁ + u₂x₂.' }, { answer: Math.hypot(...x), feedback: 'That is the length of x. The coordinate along u is the dot product u·x.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const n = g.int(3, 5), lams = Array.from({ length: n }, () => g.int(1, 12)).sort((a, b) => b - a), k = g.int(1, n - 1), total = lams.reduce((a, b) => a + b, 0)
  const kept = lams.slice(0, k).reduce((a, b) => a + b, 0)
  if (template === 'share') {
    const answer = kept / total
    return { template, seed, lams, k, answer, misconceptions: [{ answer: lams[k - 1] / total, feedback: `That is the ${k}th component alone. Sum the first ${k}.` }, { answer: kept / lams[0], feedback: 'Divide by the total of all eigenvalues.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const answer = total - kept
  return { template, seed, lams, k, answer, misconceptions: [{ answer: kept, feedback: 'That is the variance kept. The error is what the dropped components carried.' }, { answer: lams[k] ?? 0, feedback: 'Every dropped component counts, not only the next one.' }].filter(m => m.answer !== answer) }
}
const f3 = v => String(Math.round(v * 1000) / 1000)
export function view(p) {
  if (p.template === 'coordinate') return { intro: `The unit direction u = (${p.u.map(f3).join(', ')}), and a centred point x = (${p.x.join(', ')}).`, questions: [{ id: 'z', type: 'number', label: 'What is the coordinate of x along u? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  const intro = `The covariance matrix has eigenvalues ${p.lams.join(', ')}.`
  if (p.template === 'share') return { intro, questions: [{ id: 's', type: 'number', label: `What fraction of the variance do the first ${p.k} component${p.k > 1 ? 's' : ''} explain? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro, questions: [{ id: 'e', type: 'number', label: `Keeping ${p.k} component${p.k > 1 ? 's' : ''}, what is the mean squared reconstruction error Σ_{j>k} λⱼ?`, answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'coordinate') return `u·x = ${f3(p.u[0])} × ${p.x[0]} + ${f3(p.u[1])} × ${p.x[1]} = **${r3(p.answer)}**.`
  const total = p.lams.reduce((a, b) => a + b, 0), kept = p.lams.slice(0, p.k)
  if (p.template === 'share') return `(${kept.join(' + ')})/${total} = **${r3(p.answer)}**.`
  return `The dropped eigenvalues: ${p.lams.slice(p.k).join(' + ')} = **${p.answer}**.`
}

export const pca = {
  title: 'Projections, reconstruction and explained variance',
  version: 1,
  templates: TEMPLATES,
  templateNames: { coordinate: 'Coordinate along a direction', share: 'Explained share', error: 'Reconstruction error' },
  generate, view, workedSolution,
  intro: 'Seven steps: one projection by hand, what centring does, and writing covariance, reconstruction and explained variance. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Project a point by hand',
      prompt: 'A centred point x = (2, 4) and the unit direction u = (0.6, 0.8). Separately, a covariance matrix with eigenvalues 6, 3 and 1.',
      fields: [
        { label: 'Coordinate z = u·x', answer: 4.4, tolerance: 1e-9 },
        { label: 'First entry of the projection z·u', answer: 2.64, tolerance: 1e-9 },
        { label: 'Squared length of the residual ‖x − z·u‖²', answer: 0.64, tolerance: 1e-9 },
        { label: 'Share of variance explained by the first component', answer: 0.6, tolerance: 1e-9 },
      ],
      explain: 'z = 0.6 × 2 + 0.8 × 4 = 4.4. The projection is 4.4 × (0.6, 0.8) = (2.64, 3.52). By Pythagoras, ‖x‖² = z² + ‖residual‖²: 20 = 19.36 + 0.64. The first component explains 6/(6 + 3 + 1) = 0.6.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Forget to centre',
      prompt: 'A long, thin cloud whose axis points at 120°, centred at (4, −3). PCA via the SVD. Run it with `center = 0`, then **set `center = 1`** and run again. Predict first: which first component points along the cloud, and which claims the larger share of variance?',
      starter: `import numpy as np
rng = np.random.default_rng(0)
t, s = rng.normal(0, 2, 200), rng.normal(0, 0.5, 200)
axis = np.array([np.cos(np.radians(120)), np.sin(np.radians(120))])
across = np.array([-axis[1], axis[0]])
X = np.array([4, -3]) + np.outer(t, axis) + np.outer(s, across)

center = 0
Z = X - X.mean(axis=0) if center else X
_, S, Vt = np.linalg.svd(Z, full_matrices=False)
pc1 = Vt[0]
angle = np.degrees(np.arccos(abs(pc1 @ axis)))   # 0 = along the cloud (the sign of pc1 is arbitrary)
share = S[0] ** 2 / np.sum(S ** 2)
print(f"center = {center}: PC1 {np.round(pc1, 3)}, {angle:.1f} degrees off the cloud's axis, share {share:.3f}")`,
      probe: ['center', 'angle', 'share'],
      evaluate: evaluateCenter,
      done: 'scikit-learn’s PCA centres for you; an SVD or eigen-decomposition you write yourself does not.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the covariance matrix',
      prompt: 'Replace `___` with the covariance matrix Σ = (1/n) Σᵢ (xᵢ − x̄)(xᵢ − x̄)ᵀ.',
      starter: `import numpy as np

def covariance(X):
    """Rows of X are points. Return the features-by-features covariance matrix, dividing by n."""
    Xc = X - X.mean(axis=0)
    return ___`,
      hint: 'Xc.T @ Xc sums the outer products of the centred rows.',
      solution: 'return Xc.T @ Xc / len(X)',
      check: { fn: 'covariance', args: ['X'], cases: COV_CASES, describe: c => `${c.X.length} points`, diagnose: diagnoseCov },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For the points (2, 1), (4, 3), (6, 4), (8, 8) and k = 1, every reconstructed point lands near the origin — the first comes back as about **(−2.78, −3.19)** — although the data sit around (5, 4). Fix it.',
      starter: `import numpy as np

def reconstruct(X, k):
    """Rebuild each point from its first k principal components."""
    mean = X.mean(axis=0)
    Xc = X - mean
    _, _, Vt = np.linalg.svd(Xc, full_matrices=False)
    Vk = Vt[:k]
    return (Xc @ Vk.T) @ Vk`,
      hint: 'The components describe deviations from the mean.',
      solution: 'return mean + (Xc @ Vk.T) @ Vk',
      check: { fn: 'reconstruct', args: ['X', 'k'], ints: ['k'], cases: REC_CASES, describe: c => `${c.X.length} points, k = ${c.k}`, diagnose: diagnoseRec },
      explainChoice: {
        prompt: 'The sign of each principal direction is arbitrary: two libraries may return v and −v. Why doesn’t that change the reconstruction?',
        options: [
          { text: 'Each term is z·v = (v·x)v. Flipping v flips z too, and the two signs cancel.', correct: true },
          { text: 'Because the SVD always returns positive vectors.', feedback: 'It does not: signs vary between libraries and even between versions.' },
          { text: 'It does change it; the code must fix the signs.', feedback: 'Coordinates z change sign, but z·v does not.' },
          { text: 'Because the mean is added back.', feedback: 'The mean has nothing to do with the sign; the product (v·x)v does.' },
        ],
        rightFeedback: 'Coordinates are sign-ambiguous; reconstructions, variances and shares are not. Compare those across tools.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write explained variance',
      prompt: 'Write `explained_share` from its contract.',
      starter: `import numpy as np

def explained_share(X):
    """Rows of X are points. Return the fraction of the total variance carried by each principal
    component, largest first (the fractions sum to 1).

    Example: explained_share(np.array([[0., 0.], [4., 0.], [0., 1.], [4., 1.]]))  ->  array([0.94117647, 0.05882353])
    """
    pass   # replace with your code`,
      hint: 'Either the eigenvalues of the covariance matrix (np.linalg.eigvalsh, then sort descending), or the squared singular values of the centred data. Divide by their sum.',
      solution: 'Xc = X - X.mean(axis=0)\nS = np.linalg.svd(Xc, compute_uv=False)\nreturn S ** 2 / np.sum(S ** 2)',
      check: { fn: 'explained_share', args: ['X'], cases: SHARE_CASES, describe: c => `${c.X.length} points`, diagnose: diagnoseShare },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New directions and spectra. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
