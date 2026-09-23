// Recommender systems on implicit feedback: a simulated learning platform where
// users open tutorials. Popularity, item-item collaborative filtering and matrix
// factorization; leave-last-out evaluation; cold start; and the feedback loop.
import { random, normal, range, mean, dot } from '../../kit/math.js'

export const TOPICS = ['Python', 'SQL', 'Statistics', 'Deep learning', 'DevOps', 'Design']
const LEVELS = ['intro', 'practice', 'project', 'advanced']
// 6 topics × 4 levels = 24 tutorials; popularity decays with level.
export const ITEMS = TOPICS.flatMap((t, ti) => LEVELS.map((l, li) => ({ id: ti * 4 + li, topic: ti, name: `${t} · ${l}`, pop: [1.4, 0.9, 0.5, 0.2][li] + (ti === 0 ? 0.6 : 0) })))

// Each user likes one or two topics. Interactions arrive over time; within a
// topic, users tend to progress from intro to advanced.
export function makeWorld(seed = 35, nUsers = 120) {
  const rng = random(seed)
  const users = range(nUsers).map(u => {
    const main = Math.floor(rng() * TOPICS.length), second = rng() < 0.5 ? Math.floor(rng() * TOPICS.length) : main
    const taste = TOPICS.map((_, t) => t === main ? 2.2 : t === second ? 1.4 : -0.6 + 0.3 * normal(rng))
    return { id: u, main, taste }
  })
  const events = []
  users.forEach(u => {
    const n = 4 + Math.floor(rng() * 6), seen = new Set()
    for (let t = 0; t < n; t++) {
      const w = ITEMS.map(it => seen.has(it.id) ? 0 : Math.exp(u.taste[it.topic] + it.pop + (it.id % 4 === [...seen].filter(s => ITEMS[s].topic === it.topic).length ? 1.2 : 0)))
      const total = w.reduce((a, b) => a + b, 0); let r = rng() * total, k = 0
      while (r > w[k]) { r -= w[k]; k++ }
      seen.add(k); events.push({ user: u.id, item: k, t })
    }
  })
  return { users, events }
}
// Probability that a user clicks an item when shown it (the simulator's truth).
export const clickProb = (user, item) => 1 / (1 + Math.exp(-(user.taste[item.topic] - 1.5 + 0.5 * item.pop)))

// Hold out each user's LAST interaction (time-aware) or a RANDOM one (leaky).
export function split(events, { mode = 'last', seed = 1 } = {}) {
  const rng = random(seed), byUser = new Map()
  events.forEach(e => { if (!byUser.has(e.user)) byUser.set(e.user, []); byUser.get(e.user).push(e) })
  const train = [], test = []
  byUser.forEach(es => { const i = mode === 'last' ? es.length - 1 : Math.floor(rng() * es.length); es.forEach((e, j) => (j === i ? test : train).push(e)) })
  return { train, test }
}
export function matrix(events, nUsers, nItems = ITEMS.length) {
  const R = range(nUsers).map(() => Array(nItems).fill(0))
  events.forEach(e => { R[e.user][e.item] = 1 })
  return R
}

// Models: each returns score(user) → array of item scores.
export function popularity(R) {
  const counts = R[0].map((_, i) => R.reduce((s, row) => s + row[i], 0))
  return () => counts
}
export function itemItem(R) {
  const n = R[0].length, col = i => R.map(r => r[i]), norms = range(n).map(i => Math.hypot(...col(i)) || 1)
  const S = range(n).map(i => range(n).map(j => i === j ? 0 : R.reduce((s, r) => s + r[i] * r[j], 0) / (norms[i] * norms[j])))
  const model = u => range(n).map(j => R[u].reduce((s, x, i) => s + x * S[i][j], 0))
  model.sim = S
  return model
}
// Alternating least squares on the 0/1 matrix, unobserved entries weighted by `w0`.
export function factorize(R, { k = 4, lambda = 0.1, w0 = 0.1, iters = 10, seed = 7 } = {}) {
  const rng = random(seed), nU = R.length, nI = R[0].length
  let U = range(nU).map(() => range(k).map(() => 0.1 * normal(rng))), V = range(nI).map(() => range(k).map(() => 0.1 * normal(rng)))
  const solveRow = (fixed, targets) => {
    const A = range(k).map(a => range(k).map(b => (a === b ? lambda : 0))), b = Array(k).fill(0)
    fixed.forEach((f, j) => { const c = targets[j] ? 1 : w0; for (let a = 0; a < k; a++) { b[a] += c * targets[j] * f[a]; for (let d = 0; d < k; d++) A[a][d] += c * f[a] * f[d] } })
    return gauss(A, b)
  }
  for (let it = 0; it < iters; it++) {
    U = R.map(row => solveRow(V, row))
    V = range(nI).map(i => solveRow(U, R.map(r => r[i])))
  }
  const model = u => V.map(v => dot(U[u], v))
  model.U = U; model.V = V
  return model
}
function gauss(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j] }
  }
  return M.map((r, i) => r[n] / r[i])
}
export const MODELS = { popularity, itemItem, factorize }

// Top-k unseen items for a user.
export function recommend(model, R, u, k = 5) {
  const s = model(u)
  return range(s.length).filter(i => !R[u][i]).sort((a, b) => s[b] - s[a] || a - b).slice(0, k)
}
export function evaluate(events, nUsers, method, { k = 5, mode = 'last' } = {}) {
  const { train, test } = split(events, { mode }), R = matrix(train, nUsers), model = MODELS[method](R)
  const rows = test.map(e => { const recs = recommend(model, R, e.user, k), rank = recs.indexOf(e.item); return { hit: rank >= 0 ? 1 : 0, ndcg: rank >= 0 ? 1 / Math.log2(rank + 2) : 0, recs } })
  const shown = new Set(rows.flatMap(r => r.recs))
  return { hit: mean(rows.map(r => r.hit)), ndcg: mean(rows.map(r => r.ndcg)), coverage: shown.size / ITEMS.length, n: rows.length }
}

// Share of the (user, item) pairs a user would probably like (click chance > 50%)
// that the user has found so far.
export function discovered(world, R) {
  let liked = 0, found = 0
  world.users.forEach(u => ITEMS.forEach(it => { if (clickProb(u, it) > 0.5) { liked++; found += R[u.id][it.id] } }))
  return found / liked
}
// Feedback loop: each round the system shows k items to every user; clicks are
// added to the data and the model is retrained. `explore` = share of slots
// filled with random unseen items instead of the model's top picks.
export function feedbackLoop(world, { method = 'popularity', rounds = 12, k = 3, explore = 0, seed = 11 } = {}) {
  const rng = random(seed), nU = world.users.length
  const R = matrix(world.events.filter(e => e.t < 2), nU), history = []
  for (let r = 0; r < rounds; r++) {
    const model = MODELS[method](R), shownCount = Array(ITEMS.length).fill(0)
    let clicks = 0
    world.users.forEach(u => {
      const unseen = range(ITEMS.length).filter(i => !R[u.id][i]), top = recommend(model, R, u.id, k)
      const slate = top.map(i => { if (rng() >= explore) return i; const pool = unseen.filter(x => !top.includes(x)); return pool.length ? pool[Math.floor(rng() * pool.length)] : i })
      slate.forEach(i => { shownCount[i]++; const p = clickProb(u, ITEMS[i]); if (rng() < p) { R[u.id][i] = 1; clicks++ } })
    })
    const total = shownCount.reduce((a, b) => a + b, 0), sorted = [...shownCount].sort((a, b) => a - b)
    const gini = total ? sorted.reduce((s, c, i) => s + (2 * (i + 1) - sorted.length - 1) * c, 0) / (sorted.length * total) : 0
    history.push({ round: r + 1, ctr: clicks / (nU * k), clicks, coverage: shownCount.filter(c => c > 0).length / ITEMS.length, gini, discovered: discovered(world, R) })
  }
  return history
}
