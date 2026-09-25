import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 15 practice ladder: distances and margins, hinge loss, its subgradient, and the RBF kernel.

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)
export const hingeOf = (X, y, w, b) => X.map((x, i) => Math.max(0, 1 - y[i] * (dot(w, x) + b)))
export function subgradOf(w, b, X, y, lam, active = true) {
  const g = w.map(v => lam * v)
  X.forEach((x, i) => { if (!active || y[i] * (dot(w, x) + b) < 1) x.forEach((v, j) => { g[j] -= y[i] * v / X.length }) })
  return g
}
export const rbfOf = (A, B, gamma) => A.map(a => B.map(c => Math.exp(-gamma * a.reduce((s, v, j) => s + (v - c[j]) ** 2, 0))))

const HINGE_CASES = [
  { X: [[1, 2], [2, 0], [0, 0]], y: [1, -1, 1], w: [1, 1], b: -1 },
  { X: [[3, 1]], y: [-1], w: [0.5, -1], b: 0 },
  { X: [[1, 0], [0, 1], [2, 2]], y: [1, 1, -1], w: [2, 0], b: 0.5 },
  { X: [[0.5, 0.5], [-1, 2]], y: [-1, 1], w: [-1, 1], b: 0.25 },
].map(c => ({ ...c, expected: hingeOf(c.X, c.y, c.w, c.b) }))
const GRAD_CASES = [
  { w: [1, 1], b: -1, X: [[1, 2], [2, 0], [0, 0]], y: [1, -1, 1], lam: 0.1 },
  { w: [0.5, -0.5], b: 0, X: [[4, 0], [0, 4], [1, 1]], y: [1, -1, 1], lam: 1 },
  { w: [2, 0], b: 0.5, X: [[1, 0], [0, 1], [2, 2], [-1, 0]], y: [1, 1, -1, -1], lam: 0.5 },
  { w: [0, 1], b: 0, X: [[3, 3], [1, -3]], y: [1, -1], lam: 0.2 },
].map(c => ({ ...c, expected: subgradOf(c.w, c.b, c.X, c.y, c.lam) }))
export const RBF_CASES = [
  { A: [[0, 0], [1, 1]], B: [[0, 0], [1, 0], [2, 2]], gamma: 0.5 },
  { A: [[1, 2]], B: [[1, 2], [3, 2]], gamma: 1 },
  { A: [[0, 0], [0, 3]], B: [[0, 1]], gamma: 0.1 },
  { A: [[1, 1], [2, -1], [0, 0]], B: [[1, 1], [0, 0]], gamma: 2 },
].map(c => ({ ...c, expected: rbfOf(c.A, c.B, c.gamma) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseHinge(c, got) {
  const raw = c.X.map((x, i) => 1 - c.y[i] * (dot(c.w, x) + c.b))
  if (near(got.value, raw)) return 'Points beyond the margin (y·f ≥ 1) should cost 0, not a negative amount: clip at 0 with np.maximum.'
  const noY = c.X.map(x => Math.max(0, 1 - (dot(c.w, x) + c.b)))
  if (near(got.value, noY)) return 'The margin is y·f(x): multiply by the label, so a point is scored by how far it sits on ITS side.'
  return null
}
export function diagnoseGrad(c, got) {
  if (near(got.value, subgradOf(c.w, c.b, c.X, c.y, c.lam, false))) return 'Every point was counted. Points with margin ≥ 1 have zero hinge loss and no slope: only mᵢ < 1 contribute.'
  if (near(got.value, c.w.map(v => c.lam * v))) return 'Only the penalty’s gradient is there. Add −(1/n) Σ yᵢxᵢ over the points with margin below 1.'
  return null
}
export function diagnoseRbf(c, got) {
  const noSq = c.A.map(a => c.B.map(b => Math.exp(-c.gamma * Math.sqrt(a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0)))))
  if (near(got.value, noSq)) return 'That uses the distance ‖x − x′‖. The RBF kernel uses the squared distance.'
  const pos = c.A.map(a => c.B.map(b => Math.exp(c.gamma * a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0))))
  if (near(got.value, pos)) return 'The exponent must be negative: identical points give 1, distant ones near 0.'
  if (got.value?.length === c.B.length && c.A.length !== c.B.length) return `The result should have one row per point of A (${c.A.length}) and one column per point of B (${c.B.length}).`
  return null
}
export function evaluateGamma(vars) {
  const miss = needVars(vars, ['gamma', 'train_acc', 'val_acc', 'n_support'])
  if (miss) return { passed: false, message: miss }
  const g = Number(vars.gamma.value)
  if (g > 10) return { passed: false, message: `γ = ${g}: training accuracy ${r3(vars.train_acc.value)}, validation ${r3(vars.val_acc.value)}, with ${vars.n_support.value} support vectors. Set \`gamma = 1\` and run again.` }
  return { passed: true, message: `γ = ${g}: training ${r3(vars.train_acc.value)}, validation ${r3(vars.val_acc.value)}, ${vars.n_support.value} support vectors. A large γ gives each point a tiny reach, so the boundary wraps individual points; a moderate γ draws one smooth curve.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['distance', 'hinge', 'width']
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [0, 2, 2], [4, 3, 5]]
export function generate(template, seed) {
  const g = rng(seed * 331 + TEMPLATES.indexOf(template) * 8009 + 31)
  if (template === 'distance') {
    const [w1, w2, norm] = g.pick(TRIPLES), x = [g.int(-4, 4), g.int(-4, 4)], b = g.int(-6, 6), f = w1 * x[0] + w2 * x[1] + b
    if (f === 0) return generate(template, seed + 1000)
    const answer = Math.abs(f) / norm
    return { template, seed, w: [w1, w2], x, b, answer, misconceptions: [{ answer: Math.abs(f), feedback: 'That is |w·x + b|. Divide by ‖w‖ to get a distance.' }, { answer: Math.abs(f) / (w1 * w1 + w2 * w2), feedback: 'Divide by ‖w‖, not ‖w‖².' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'hinge') {
    const y = g.pick([1, -1]), f = g.pick([-2, -1.5, -0.5, 0, 0.25, 0.5, 0.75, 1.5, 2]), m = y * f, answer = Math.max(0, 1 - m)
    return { template, seed, y, f, answer, misconceptions: [{ answer: 1 - m, feedback: 'Past the margin the loss is 0: take max(0, 1 − m).' }, { answer: Math.max(0, 1 - f), feedback: 'The margin is y·f(x): include the label.' }].filter(mc => Math.abs(mc.answer - answer) > 0.0006) }
  }
  const [w1, w2, norm] = g.pick(TRIPLES.filter(t => t[2] <= 10)), s = g.pick([0.1, 0.5, 1]), answer = 2 / (norm * s)
  return { template, seed, w: [w1 * s, w2 * s], answer, misconceptions: [{ answer: 1 / (norm * s), feedback: 'That is the distance from the boundary to one edge. The street is twice that: 2/‖w‖.' }, { answer: 2 / (norm * s) ** 2, feedback: 'Divide by ‖w‖, not ‖w‖².' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
const fmt = v => String(Math.round(v * 1000) / 1000)
export function view(p) {
  if (p.template === 'distance') return { intro: `A linear boundary w·x + b = 0 with w = (${p.w.join(', ')}) and b = ${p.b}.`, questions: [{ id: 'd', type: 'number', label: `How far is the point (${p.x.join(', ')}) from the boundary? (Three decimals.)`, answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'hinge') return { intro: `A point with label y = ${p.y} gets the score f(x) = ${p.f}.`, questions: [{ id: 'h', type: 'number', label: 'What is its hinge loss max(0, 1 − y·f(x))?', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `A linear SVM ends with w = (${p.w.map(fmt).join(', ')}).`, questions: [{ id: 'w', type: 'number', label: 'How wide is its street, from one dashed edge to the other? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'distance') { const f = p.w[0] * p.x[0] + p.w[1] * p.x[1] + p.b; return `w·x + b = ${f}; ‖w‖ = √(${p.w[0] ** 2} + ${p.w[1] ** 2}) = ${Math.hypot(...p.w)}. Distance ${Math.abs(f)}/${Math.hypot(...p.w)} = **${r3(p.answer)}**.` }
  if (p.template === 'hinge') return `m = y·f = ${p.y} × ${p.f} = ${p.y * p.f}; max(0, 1 − ${p.y * p.f}) = **${r3(p.answer)}**.`
  return `‖w‖ = ${fmt(Math.hypot(...p.w))}; width 2/‖w‖ = **${r3(p.answer)}**.`
}

export const hinge = {
  title: 'Margins, hinge loss and kernels',
  version: 1,
  templates: TEMPLATES,
  templateNames: { distance: 'Distance to a boundary', hinge: 'Hinge loss', width: 'Street width' },
  generate, view, workedSolution,
  intro: 'Seven steps: a margin and a hinge loss by hand, the RBF reach γ, and writing the pieces an SVM is built from. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Work it by hand',
      prompt: 'A linear boundary with w = (3, 4) and b = −5. Two points, both labelled y = +1: A = (3, 1) and B = (1, 0.5).',
      fields: [
        { label: 'Score f(A) = w·A + b', answer: 8 },
        { label: 'Distance from A to the boundary', answer: 1.6, tolerance: 1e-9 },
        { label: 'Hinge loss of A', answer: 0 },
        { label: 'Hinge loss of B', answer: 1 },
        { label: 'Street width 2/‖w‖', answer: 0.4, tolerance: 1e-9 },
      ],
      explain: 'f(A) = 9 + 4 − 5 = 8 and ‖w‖ = 5, so A is 8/5 = 1.6 from the boundary. Its margin y·f = 8 ≥ 1, so its hinge loss is 0. f(B) = 3 + 2 − 5 = 0: B sits on the boundary, margin 0, loss max(0, 1 − 0) = 1. The street is 2/5 = 0.4 wide.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Change the kernel’s reach',
      prompt: 'An RBF-kernel SVM on two noisy moons. Run it at `gamma = 100`, then **set `gamma = 1`** and run again. Predict first: which scores higher on training rows, which on validation, and which needs more support vectors?',
      starter: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.svm import SVC
X, y = make_moons(n_samples=300, noise=0.3, random_state=2)
Xtr, ytr, Xva, yva = X[:200], y[:200], X[200:], y[200:]

gamma = 100
model = SVC(kernel="rbf", gamma=gamma, C=1).fit(Xtr, ytr)
train_acc, val_acc = model.score(Xtr, ytr), model.score(Xva, yva)
n_support = len(model.support_)
print(f"gamma = {gamma}: train {train_acc:.3f}, validation {val_acc:.3f}, {n_support} support vectors")`,
      probe: ['gamma', 'train_acc', 'val_acc', 'n_support'],
      evaluate: evaluateGamma,
      done: 'γ is the RBF kernel’s complexity knob, like depth for a tree: choose it (with C) on validation data.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the hinge loss',
      prompt: 'Replace `___` with the hinge loss of every point.',
      starter: `import numpy as np

def hinge_losses(X, y, w, b):
    """Labels y are +1 or -1. Return max(0, 1 - y_i (w . x_i + b)) for each row x_i of X."""
    return ___`,
      hint: 'The scores are X @ w + b; the margins are y times the scores; the losses clip 1 − margin at 0.',
      solution: 'return np.maximum(0, 1 - y * (X @ w + b))',
      check: { fn: 'hinge_losses', args: ['X', 'y', 'w', 'b'], cases: HINGE_CASES, describe: c => `${c.X.length} points, w = (${c.w.join(', ')}), b = ${c.b}`, diagnose: diagnoseHinge },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For w = (1, 1), b = −1, λ = 0.1 and the points (1, 2) labelled +1, (2, 0) labelled −1 and (0, 0) labelled +1, this returns **(0.433, −0.567)**. The true subgradient is (0.767, 0.1). Fix it.',
      starter: `import numpy as np

def svm_subgradient(w, b, X, y, lam):
    """Subgradient in w of J = lam/2 ||w||^2 + mean_i max(0, 1 - y_i (w . x_i + b))."""
    return lam * w - (y[:, None] * X).mean(axis=0)`,
      hint: 'A point whose margin is already at least 1 sits on the flat part of the hinge: its slope is 0.',
      solution: 'active = y * (X @ w + b) < 1\nreturn lam * w - (y[active, None] * X[active]).sum(axis=0) / len(y)',
      check: { fn: 'svm_subgradient', args: ['w', 'b', 'X', 'y', 'lam'], cases: GRAD_CASES, describe: c => `w = (${c.w.join(', ')}), ${c.X.length} points, λ = ${c.lam}`, diagnose: diagnoseGrad },
      explainChoice: {
        prompt: 'What does the fix mean for which training points shape an SVM?',
        options: [
          { text: 'Only points on or inside the street (margin below 1) push on w. Points safely beyond it have no effect — they could move or vanish and the solution would not change. The ones that matter are the support vectors.', correct: true },
          { text: 'Every point pushes equally, as with squared loss.', feedback: 'That is what the bug computed. Hinge loss is flat past margin 1.' },
          { text: 'Only misclassified points matter.', feedback: 'Correctly classified points inside the street (0 < m < 1) also contribute.' },
          { text: 'Only the penalty λw matters once training converges.', feedback: 'At the optimum the penalty balances the pull of the active points.' },
        ],
        rightFeedback: 'That is why an SVM is described by its support vectors.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write the RBF kernel',
      prompt: 'Write `rbf_kernel` from its contract.',
      starter: `import numpy as np

def rbf_kernel(A, B, gamma):
    """A: m points, B: k points (rows). Return the m-by-k matrix K[i, j] = exp(-gamma * ||A[i] - B[j]||^2).

    Example: rbf_kernel(np.array([[1., 2.]]), np.array([[1., 2.], [3., 2.]]), 1.0)  ->  array([[1., 0.01831564]])
    """
    pass   # replace with your code`,
      hint: 'Broadcast: A[:, None, :] − B[None, :, :] has shape (m, k, features). Square, sum over the last axis, scale and exponentiate.',
      solution: 'd2 = ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)\nreturn np.exp(-gamma * d2)',
      check: { fn: 'rbf_kernel', args: ['A', 'B', 'gamma'], cases: RBF_CASES, describe: c => `${c.A.length} × ${c.B.length}, γ = ${c.gamma}`, diagnose: diagnoseRbf },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New boundaries and points. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
