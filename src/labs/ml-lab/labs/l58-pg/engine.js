// Policy-gradient reinforcement learning on cart-pole: REINFORCE with and
// without a baseline, a one-step actor–critic, and the variance of policy-
// gradient estimates.
import { random, normal, range, mean, std } from '../../kit/math.js'

// Classic cart-pole dynamics (Barto, Sutton & Anderson 1983), Euler steps of 0.02 s.
export const MAX_STEPS = 200
export function step(s, action) {
  const [x, xd, th, thd] = s, force = action ? 10 : -10, g = 9.8, mc = 1, mp = 0.1, l = 0.5, total = mc + mp
  const cos = Math.cos(th), sin = Math.sin(th), temp = (force + mp * l * thd * thd * sin) / total
  const thacc = (g * sin - cos * temp) / (l * (4 / 3 - mp * cos * cos / total)), xacc = temp - mp * l * thacc * cos / total
  const n = [x + 0.02 * xd, xd + 0.02 * xacc, th + 0.02 * thd, thd + 0.02 * thacc]
  return { s: n, done: Math.abs(n[0]) > 2.4 || Math.abs(n[2]) > 12 * Math.PI / 180 }
}
const features = s => [s[0] / 2.4, s[1] / 2, s[2] / 0.21, s[3] / 2, 1]
// The value of a state depends on how far it is from failure in either direction,
// so the critic needs squares and products of the state variables, not just the variables.
const criticFeatures = s => { const f = features(s); return [1, f[0] ** 2, f[1] ** 2, f[2] ** 2, f[3] ** 2, f[2] * f[3], f[0] * f[1], f[0] * f[2]] }
const sigmoid = z => 1 / (1 + Math.exp(-z))
export const pRight = (theta, s) => sigmoid(features(s).reduce((t, f, i) => t + f * theta[i], 0))

export function episode(theta, rng, { record = false } = {}) {
  let s = [0, 0, 0, 0].map(() => 0.05 * (2 * rng() - 1))
  const traj = []
  for (let t = 0; t < MAX_STEPS; t++) {
    const p = pRight(theta, s), a = rng() < p ? 1 : 0, r = step(s, a)
    traj.push({ s, a, p, phi: features(s) })
    s = r.s
    if (r.done) break
  }
  return record ? { traj, final: s } : { traj }
}
// Gradient of log π(a | s) for the logistic policy: (a − p)·φ(s).
const gradLog = (step) => step.phi.map(f => (step.a - step.p) * f)

export const METHODS = {
  reinforce: { name: 'REINFORCE (no baseline)', opts: { lr: 0.05 } },
  baseline: { name: 'REINFORCE with a learned baseline', opts: { lr: 0.05 } },
  ac: { name: 'One-step actor–critic', opts: { lr: 0.1, criticLr: 0.05, acGamma: 0.95 } },
}
export function train(method, { episodes = 400, lr = 0.02, gamma = 0.99, seed = 1, criticLr = 0.05, acGamma = gamma } = {}) {
  const rng = random(seed)
  let theta = Array(5).fill(0), w = Array(5).fill(0), wc = Array(8).fill(0)
  const returns = []
  for (let e = 0; e < episodes; e++) {
    if (method === 'ac') {
      let s = [0, 0, 0, 0].map(() => 0.05 * (2 * rng() - 1)), T = 0
      for (let t = 0; t < MAX_STEPS; t++) {
        const phi = features(s), psi = criticFeatures(s), p = pRight(theta, s), a = rng() < p ? 1 : 0, r = step(s, a)
        const v = psi.reduce((q, f, i) => q + f * wc[i], 0), vNext = r.done ? 0 : criticFeatures(r.s).reduce((q, f, i) => q + f * wc[i], 0)
        const delta = 1 + acGamma * vNext - v
        wc = wc.map((wi, i) => wi + criticLr * delta * psi[i])
        theta = theta.map((th, i) => th + lr * 0.5 * delta * (a - p) * phi[i])
        s = r.s; T++
        if (r.done) break
      }
      returns.push(T)
      continue
    }
    const { traj } = episode(theta, rng), T = traj.length
    const G = Array(T); let run = 0
    for (let t = T - 1; t >= 0; t--) { run = 1 + gamma * run; G[t] = run }
    const grad = Array(5).fill(0)
    traj.forEach((st, t) => {
      let adv = G[t]
      if (method === 'baseline') { const v = st.phi.reduce((q, f, i) => q + f * w[i], 0); adv = G[t] - v; w = w.map((wi, i) => wi + 0.01 * (G[t] - v) * st.phi[i]) }
      gradLog(st).forEach((g, i) => { grad[i] += adv * g })
    })
    theta = theta.map((th, i) => th + lr * grad[i] / Math.max(T, 1))
    returns.push(T)
  }
  return { theta, returns }
}
export const movingAverage = (xs, k = 20) => xs.map((_, i) => mean(xs.slice(Math.max(0, i - k + 1), i + 1)))

// Spread of single-episode gradient estimates at a fixed policy, with and without a baseline.
export function gradientSpread(theta, { n = 200, seed = 5, gamma = 0.99 } = {}) {
  const rng = random(seed), toGo = tr => { const G = Array(tr.length); let r = 0; for (let t = tr.length - 1; t >= 0; t--) { r = 1 + gamma * r; G[t] = r } return G }
  const eps = range(n).map(() => episode(theta, rng).traj), allG = eps.map(toGo)
  // Baseline: average return-to-go at each time step, estimated from a separate batch of episodes
  // (using the same episodes would correlate baseline and return and bias the estimate).
  const ref = range(n).map(() => toGo(episode(theta, rng).traj)), maxT = Math.max(...eps.map(e => e.length)), b = range(maxT).map(t => { const v = ref.filter(G => G.length > t).map(G => G[t]); return v.length ? mean(v) : 0 })
  const est = useB => eps.map((tr, k) => { const g = Array(5).fill(0); tr.forEach((st, t) => { const adv = allG[k][t] - (useB ? b[t] : 0); gradLog(st).forEach((v, i) => { g[i] += adv * v }) }); return g })
  const summarize = E => ({ mean: range(5).map(i => mean(E.map(g => g[i]))), sd: range(5).map(i => std(E.map(g => g[i]), 1)), samples: E })
  return { plain: summarize(est(false)), baseline: summarize(est(true)) }
}
export function rollout(theta, seed = 9) { return episode(theta, random(seed), { record: true }).traj.map(t => t.s) }
