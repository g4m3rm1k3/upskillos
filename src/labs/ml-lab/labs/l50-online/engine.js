// Online learning: the perceptron's mistake bound, prediction with expert
// advice (Hedge / multiplicative weights), and multi-armed bandits
// (greedy, ε-greedy, UCB1, Thompson sampling) measured by regret.
import { random, normal, range, mean } from '../../kit/math.js'

// ---------- Perceptron on a separable stream ----------
export function separableStream(n, margin, seed = 50) {
  const rng = random(seed), u = [Math.cos(0.6), Math.sin(0.6)], out = []
  while (out.length < n) { const x = [2 * normal(rng), 2 * normal(rng)], s = x[0] * u[0] + x[1] * u[1]; if (Math.abs(s) >= margin) out.push({ x, y: s > 0 ? 1 : -1 }) }
  return { data: out, u }
}
export function perceptronOnline(data) {
  let w = [0, 0], mistakes = 0
  const curve = data.map(d => { if (d.y * (w[0] * d.x[0] + w[1] * d.x[1]) <= 0) { w = [w[0] + d.y * d.x[0], w[1] + d.y * d.x[1]]; mistakes++ } return mistakes })
  const R = Math.max(...data.map(d => Math.hypot(...d.x)))
  return { w, mistakes, curve, R }
}

// ---------- Experts ----------
// Losses in [0, 1]: five forecasters; the best one changes halfway.
export function expertLosses(T, seed = 3) {
  const rng = random(seed), rates = t => t < T / 2 ? [0.35, 0.15, 0.4, 0.3, 0.45] : [0.35, 0.45, 0.4, 0.12, 0.45]
  return range(T).map(t => rates(t).map(p => rng() < p ? 1 : 0))
}
export function hedge(losses, eta) {
  const N = losses[0].length
  let logw = Array(N).fill(0), learner = 0
  const cum = Array(N).fill(0), curve = [], weights = []
  losses.forEach(l => {
    const m = Math.max(...logw), w = logw.map(v => Math.exp(v - m)), s = w.reduce((a, b) => a + b, 0), p = w.map(v => v / s)
    learner += p.reduce((acc, pi, i) => acc + pi * l[i], 0)
    l.forEach((li, i) => { cum[i] += li; logw[i] -= eta * li })
    curve.push(learner - Math.min(...cum)); weights.push(p)
  })
  return { regret: curve.at(-1), curve, weights, learner, best: Math.min(...cum), cum }
}
// "Follow the leader": always pick the expert with the lowest loss so far.
export function followLeader(losses) {
  const N = losses[0].length, cum = Array(N).fill(0)
  let learner = 0
  const curve = losses.map(l => { const lead = cum.indexOf(Math.min(...cum)); learner += l[lead]; l.forEach((v, i) => { cum[i] += v }); return learner - Math.min(...cum) })
  return { regret: curve.at(-1), curve }
}
export const hedgeEta = (T, N) => Math.sqrt(8 * Math.log(N) / T)
export const hedgeBound = (T, N) => Math.sqrt(T * Math.log(N) / 2)

// ---------- Bandits ----------
export const ARM_SETS = {
  easy: { name: 'Five variants, clear winner', means: [0.2, 0.25, 0.3, 0.35, 0.5] },
  close: { name: 'Five variants, close call', means: [0.40, 0.42, 0.44, 0.46, 0.48] },
  ads: { name: 'Click-through rates of five ads', means: [0.03, 0.04, 0.05, 0.045, 0.06] },
}
export const POLICIES = {
  greedy: { name: 'Greedy (always the best so far)' },
  eps: { name: 'ε-greedy (explore 10%)' },
  ucb: { name: 'UCB1 (optimism under uncertainty)' },
  ts: { name: 'Thompson sampling (Beta posteriors)' },
}
function betaSample(a, b, rng) { const g = k => { if (k < 1) return g(k + 1) * rng() ** (1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = normal(rng); v = 1 + c * x } while (v <= 0); v = v * v * v; const u = rng(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v } }; const x = g(a), y = g(b); return x / (x + y) }
export function runBandit(means, policy, T, seed, eps = 0.1) {
  const rng = random(seed), K = means.length, n = Array(K).fill(0), s = Array(K).fill(0), best = Math.max(...means)
  let regret = 0
  const curve = []
  for (let t = 0; t < T; t++) {
    let a
    if (policy === 'ucb' && t < K) a = t
    else if (policy === 'greedy') a = t < K ? t : argmaxArr(s.map((v, i) => v / n[i]))
    else if (policy === 'eps') a = t < K ? t : rng() < eps ? Math.floor(rng() * K) : argmaxArr(s.map((v, i) => v / n[i]))
    else if (policy === 'ucb') a = argmaxArr(s.map((v, i) => v / n[i] + Math.sqrt(2 * Math.log(t + 1) / n[i])))
    else a = argmaxArr(range(K).map(i => betaSample(1 + s[i], 1 + n[i] - s[i], rng)))
    const r = rng() < means[a] ? 1 : 0
    n[a]++; s[a] += r; regret += best - means[a]; curve.push(regret)
  }
  return { curve, pulls: n, regret }
}
const argmaxArr = v => v.reduce((b, x, i) => x > v[b] ? i : b, 0)
export function averageRegret(means, policy, T, runs = 30, seed = 1) {
  const rs = range(runs).map(r => runBandit(means, policy, T, seed + 1000 * r))
  const step = Math.max(1, Math.floor(T / 200))
  return { curve: range(Math.floor(T / step)).map(k => mean(rs.map(r => r.curve[k * step]))).concat([mean(rs.map(r => r.regret))]), step, pulls: range(means.length).map(i => mean(rs.map(r => r.pulls[i]))), final: rs.map(r => r.regret) }
}
// An adversarial sequence for two experts: after a half-loss start, the losses
// alternate so that whoever is currently ahead is wrong next.
export function adversarialLosses(T) { return range(T).map(t => t === 0 ? [0.5, 0] : t % 2 ? [0, 1] : [1, 0]) }
