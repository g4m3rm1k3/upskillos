// Graphical models: a small Bayesian network with exact inference by
// enumeration (explaining away, d-separation checks), and a hidden Markov
// model with the forward algorithm, forward–backward smoothing, Viterbi
// decoding and Baum–Welch learning.
import { random, range } from '../../kit/math.js'

// ---------- Bayesian network ----------
// BadCommit → BuildFails ← InfraOutage;  BuildFails → PagerAlert;  InfraOutage → StatusPageRed
export const NODES = [
  { key: 'bad', name: 'Bad commit', parents: [], cpt: () => 0.1 },
  { key: 'outage', name: 'Infrastructure outage', parents: [], cpt: () => 0.05 },
  { key: 'fails', name: 'Build fails', parents: ['bad', 'outage'], cpt: ({ bad, outage }) => bad && outage ? 0.99 : bad ? 0.9 : outage ? 0.8 : 0.02 },
  { key: 'pager', name: 'Pager alert', parents: ['fails'], cpt: ({ fails }) => fails ? 0.95 : 0.01 },
  { key: 'status', name: 'Status page red', parents: ['outage'], cpt: ({ outage }) => outage ? 0.9 : 0.02 },
]
export function joint(assign) { return NODES.reduce((p, n) => { const q = n.cpt(assign); return p * (assign[n.key] ? q : 1 - q) }, 1) }
const allAssignments = () => range(2 ** NODES.length).map(m => Object.fromEntries(NODES.map((n, i) => [n.key, (m >> i) & 1])))
// P(query = 1 | evidence) by summing the joint over every assignment.
export function query(key, evidence = {}) {
  let num = 0, den = 0
  allAssignments().forEach(a => { if (Object.entries(evidence).some(([k, v]) => a[k] !== v)) return; const p = joint(a); den += p; if (a[key]) num += p })
  return den ? num / den : NaN
}
export function posteriors(evidence) { return Object.fromEntries(NODES.map(n => [n.key, query(n.key, evidence)])) }
// Numerical independence check: does observing `b` change P(a | given)?
export function independent(a, b, given = {}) {
  const base = query(a, given)
  return [0, 1].every(v => Math.abs(query(a, { ...given, [b]: v }) - base) < 1e-9)
}

// ---------- Hidden Markov model ----------
export const STATES = ['Healthy', 'Degraded', 'Down']
export const SYMBOLS = ['fast', 'slow', 'timeout']
export function makeHMM(stay = 0.92, clarity = 0.8) {
  const leave = (1 - stay) / 2
  const A = [[stay, leave * 1.6, leave * 0.4], [leave, stay, leave], [leave * 0.4, leave * 1.6, stay]]
  const off = (1 - clarity) / 2
  const B = [[clarity, off * 1.5, off * 0.5], [off, clarity, off], [off * 0.5, off * 1.5, clarity]]
  return { pi: [0.8, 0.15, 0.05], A, B }
}
const draw = (p, rng) => { let u = rng(), k = 0; while (k < p.length - 1 && u > p[k]) { u -= p[k]; k++ } return k }
export function simulate(hmm, T, seed) {
  const rng = random(seed), states = [], obs = []
  let s = draw(hmm.pi, rng)
  for (let t = 0; t < T; t++) { if (t) s = draw(hmm.A[s], rng); states.push(s); obs.push(draw(hmm.B[s], rng)) }
  return { states, obs }
}
// Scaled forward pass: filtered[t] = P(state_t | o_1..t), plus log-likelihood.
export function forward(hmm, obs) {
  const K = hmm.pi.length, alpha = [], scales = []
  obs.forEach((o, t) => {
    const a = range(K).map(j => hmm.B[j][o] * (t === 0 ? hmm.pi[j] : alpha[t - 1].reduce((s, v, i) => s + v * hmm.A[i][j], 0)))
    const c = a.reduce((s, v) => s + v, 0)
    alpha.push(a.map(v => v / c)); scales.push(c)
  })
  return { filtered: alpha, loglik: scales.reduce((s, c) => s + Math.log(c), 0), scales }
}
export function backward(hmm, obs, scales) {
  const K = hmm.pi.length, T = obs.length, beta = Array(T)
  beta[T - 1] = Array(K).fill(1)
  for (let t = T - 2; t >= 0; t--) beta[t] = range(K).map(i => range(K).reduce((s, j) => s + hmm.A[i][j] * hmm.B[j][obs[t + 1]] * beta[t + 1][j], 0) / scales[t + 1])
  return beta
}
// Smoothed marginals P(state_t | all observations).
export function smooth(hmm, obs) {
  const f = forward(hmm, obs), b = backward(hmm, obs, f.scales)
  return { smoothed: f.filtered.map((a, t) => { const g = a.map((v, i) => v * b[t][i]), s = g.reduce((x, y) => x + y, 0); return g.map(v => v / s) }), ...f, beta: b }
}
// Viterbi: the single most probable state sequence (in log space).
export function viterbi(hmm, obs) {
  const K = hmm.pi.length, T = obs.length, delta = [], back = []
  delta.push(range(K).map(j => Math.log(hmm.pi[j]) + Math.log(hmm.B[j][obs[0]])))
  for (let t = 1; t < T; t++) {
    const d = [], b = []
    range(K).forEach(j => { let best = -Infinity, arg = 0; range(K).forEach(i => { const v = delta[t - 1][i] + Math.log(hmm.A[i][j]); if (v > best) { best = v; arg = i } }); d.push(best + Math.log(hmm.B[j][obs[t]])); b.push(arg) })
    delta.push(d); back.push(b)
  }
  const path = [delta[T - 1].indexOf(Math.max(...delta[T - 1]))]
  for (let t = T - 2; t >= 0; t--) path.unshift(back[t][path[0]])
  return path
}
export const accuracy = (pred, truth) => pred.filter((p, i) => p === truth[i]).length / truth.length
export const argmaxRows = P => P.map(r => r.indexOf(Math.max(...r)))

// One Baum–Welch (EM) iteration; returns the updated model.
export function baumWelchStep(hmm, obs) {
  const K = hmm.pi.length, M = hmm.B[0].length, T = obs.length
  const { smoothed: g, filtered, beta, scales } = smooth(hmm, obs)
  const xi = range(K).map(() => Array(K).fill(0))
  for (let t = 0; t < T - 1; t++) {
    let s = 0
    const m = range(K).map(i => range(K).map(j => { const v = filtered[t][i] * hmm.A[i][j] * hmm.B[j][obs[t + 1]] * beta[t + 1][j] / scales[t + 1]; s += v; return v }))
    m.forEach((r, i) => r.forEach((v, j) => { xi[i][j] += v / s }))
  }
  const A = xi.map(r => { const s = r.reduce((a, b) => a + b, 0); return r.map(v => v / s) })
  const B = range(K).map(j => { const tot = g.reduce((s, r) => s + r[j], 0); return range(M).map(k => (g.reduce((s, r, t) => s + (obs[t] === k ? r[j] : 0), 0) + 1e-6) / (tot + M * 1e-6)) })
  return { pi: g[0], A, B }
}
export function randomHMM(K, M, seed) {
  const rng = random(seed), row = n => { const v = range(n).map(() => 0.5 + rng()); const s = v.reduce((a, b) => a + b, 0); return v.map(x => x / s) }
  return { pi: row(K), A: range(K).map(() => row(K)), B: range(K).map(() => row(M)) }
}
