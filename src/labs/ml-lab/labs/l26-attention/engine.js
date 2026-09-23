// Scaled dot-product attention, masks, positional encodings and the shapes
// of a transformer block — all small enough to inspect number by number.
import { random, normal, range, mean } from '../../kit/math.js'

export function softmaxRow(z) { const finite = z.filter(Number.isFinite); if (!finite.length) return z.map(() => 0); const m = Math.max(...finite), e = z.map(v => (Number.isFinite(v) ? Math.exp(v - m) : 0)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
export const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((t, v, k) => t + v * B[k][j], 0)))
export const transpose = A => A[0].map((_, j) => A.map(r => r[j]))

// Attention(Q, K, V) = softmax(QKᵀ/√d + mask) V. Returns scores, weights and outputs.
export function attention(Q, K, V, { scale = true, causal = false, padMask = null } = {}) {
  const d = Q[0].length, s = scale ? Math.sqrt(d) : 1
  const scores = matmul(Q, transpose(K)).map((row, i) => row.map((v, j) => ((causal && j > i) || (padMask && !padMask[j]) ? -Infinity : v / s)))
  const weights = scores.map(softmaxRow)
  return { scores, weights, out: matmul(weights, V) }
}

export function sinusoidal(T, d) {
  return range(T).map(pos => range(d).map(i => { const f = pos / 10000 ** ((2 * Math.floor(i / 2)) / d); return i % 2 === 0 ? Math.sin(f) : Math.cos(f) }))
}
export function randomMatrix(r, c, seed, scale = 1) { const rng = random(seed); return range(r).map(() => range(c).map(() => scale * normal(rng))) }
export const entropy = w => -w.reduce((t, p) => t + (p > 0 ? p * Math.log(p) : 0), 0)

// Soft dictionary lookup: keys on the unit circle, query at an angle, sharpness β.
export const SERVICES = [['api', 0], ['auth', 60], ['cache', 120], ['db', 180], ['queue', 240], ['search', 300]]
export const LATENCY = [120, 45, 8, 210, 30, 95]
export function lookup(angle, beta) {
  const q = [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)]
  const keys = SERVICES.map(([, a]) => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)])
  const scores = keys.map(k => beta * (q[0] * k[0] + q[1] * k[1])), w = softmaxRow(scores)
  return { q, keys, scores, w, out: w.reduce((t, p, i) => t + p * LATENCY[i], 0) }
}

// Typical size of a dot product of two random unit-variance vectors: grows like √d.
export function dotSpread(d, n = 400, seed = 1) {
  const rng = random(seed), dots = range(n).map(() => { let s = 0; for (let i = 0; i < d; i++) s += normal(rng) * normal(rng); return s })
  return Math.sqrt(mean(dots.map(v => v * v)))
}

export function blockShapes(T, d, heads, ffMult = 4) {
  const dh = d / heads
  return [
    ['input tokens (embedded + positions)', `(${T}, ${d})`, 0],
    ['LayerNorm 1 (γ, β per feature)', `(${T}, ${d})`, 2 * d],
    ['Q, K, V projections', `3 × (${T}, ${d})`, 3 * (d * d + d)],
    [`split into ${heads} heads`, `(${heads}, ${T}, ${dh})`, 0],
    ['scores QKᵀ/√dₕ (+ mask)', `(${heads}, ${T}, ${T})`, 0],
    ['softmax weights × V', `(${heads}, ${T}, ${dh})`, 0],
    ['concatenate heads + output projection', `(${T}, ${d})`, d * d + d],
    ['residual: x + attention(x)', `(${T}, ${d})`, 0],
    ['LayerNorm 2', `(${T}, ${d})`, 2 * d],
    [`MLP ${d} → ${ffMult * d} → ${d} (GELU)`, `(${T}, ${d})`, d * ffMult * d + ffMult * d + ffMult * d * d + d],
    ['residual: x + mlp(x)', `(${T}, ${d})`, 0],
  ]
}
export function layerNorm(x, eps = 1e-5) { const m = mean(x), v = mean(x.map(a => (a - m) ** 2)); return x.map(a => (a - m) / Math.sqrt(v + eps)) }
