// Information theory for machine learning: entropy, optimal codes, cross-
// entropy and KL divergence, mutual information, and text statistics.
import { random, normal, range, mean } from '../../kit/math.js'

const log2 = x => Math.log(x) / Math.LN2
export const normalize = w => { const s = w.reduce((a, b) => a + b, 0); return w.map(v => v / s) }
export const entropy = p => -p.reduce((s, v) => s + (v > 0 ? v * log2(v) : 0), 0)
export const crossEntropy = (p, q) => -p.reduce((s, v, i) => s + (v > 0 ? v * log2(q[i]) : 0), 0)
export const kl = (p, q) => crossEntropy(p, q) - entropy(p)

// Huffman code: repeatedly merge the two least likely nodes.
export function huffman(p) {
  let nodes = p.map((w, i) => ({ w, sym: [i] }))
  const len = p.map(() => 0)
  if (p.length === 1) return [1]
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.w - b.w)
    const [a, b] = nodes
    ;[...a.sym, ...b.sym].forEach(i => { len[i]++ })
    nodes = [{ w: a.w + b.w, sym: [...a.sym, ...b.sym] }, ...nodes.slice(2)]
  }
  return len
}
// Actual codewords (for display), built from the code lengths canonically.
export function codewords(lengths) {
  const order = lengths.map((l, i) => [l, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), out = []
  let code = 0, prev = order[0][0]
  order.forEach(([l, i], k) => { if (k) { code = (code + 1) << (l - prev); prev = l } out[i] = code.toString(2).padStart(l, '0') })
  return out
}
export const avgLength = (p, lengths) => p.reduce((s, v, i) => s + v * lengths[i], 0)

// ---------- Text ----------
export const TEXT = `machine learning systems learn patterns from data rather than following rules written by hand. a model makes predictions, we measure how wrong they are with a loss, and an optimizer adjusts the parameters to reduce that loss. good practice keeps a test set aside, compares every model with a simple baseline, and reports uncertainty honestly. information theory explains why the logarithmic loss is natural: it counts the bits a model needs to describe the data it sees. a model that predicts the next character well compresses text well, and a model that compresses well has learned the structure of its data. entropy measures the unavoidable surprise in a source, cross entropy measures the surprise of a model, and the gap between them is the divergence the model could still remove by learning.`
const ALPHA = 'abcdefghijklmnopqrstuvwxyz '
export function textStats(text = TEXT) {
  const chars = [...text.toLowerCase()].filter(c => ALPHA.includes(c))
  const uni = ALPHA.split('').map(c => chars.filter(x => x === c).length), p = normalize(uni)
  const pairs = {}
  chars.slice(1).forEach((c, i) => { const k = chars[i] + c; pairs[k] = (pairs[k] ?? 0) + 1 })
  const n2 = chars.length - 1, prevCount = {}
  chars.slice(0, -1).forEach(c => { prevCount[c] = (prevCount[c] ?? 0) + 1 })
  // H(next | previous) = −Σ p(a, b) log p(b | a)
  const hCond = -Object.entries(pairs).reduce((s, [k, c]) => s + c / n2 * log2(c / prevCount[k[0]]), 0)
  return { n: chars.length, counts: uni, p, uniform: log2(27), unigram: entropy(p), bigram: hCond }
}

// ---------- Mutual information ----------
export function miFromJoint(J) {
  const tot = J.flat().reduce((a, b) => a + b, 0), P = J.map(r => r.map(v => v / tot))
  const px = P.map(r => r.reduce((a, b) => a + b, 0)), py = P[0].map((_, j) => P.reduce((s, r) => s + r[j], 0))
  return P.reduce((s, r, i) => s + r.reduce((t, v, j) => t + (v > 0 ? v * log2(v / (px[i] * py[j])) : 0), 0), 0)
}
export const RELATIONS = {
  linear: { name: 'Linear: y = x + noise', f: (x, e) => x + 0.5 * e },
  quadratic: { name: 'U-shape: y = x² + noise', f: (x, e) => x * x + 0.3 * e },
  sine: { name: 'Wave: y = sin(3x) + noise', f: (x, e) => Math.sin(3 * x) + 0.3 * e },
  independent: { name: 'Independent: y is pure noise', f: (x, e) => e },
}
export function sampleRelation(key, n = 600, seed = 46) {
  const rng = random(seed)
  return range(n).map(() => { const x = 2 * (2 * rng() - 1); return { x, y: RELATIONS[key].f(x, normal(rng)) } })
}
export function correlation(pts) {
  const mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y))
  const sxy = mean(pts.map(p => (p.x - mx) * (p.y - my))), sx = Math.sqrt(mean(pts.map(p => (p.x - mx) ** 2))), sy = Math.sqrt(mean(pts.map(p => (p.y - my) ** 2)))
  return sxy / (sx * sy)
}
// Binned (plug-in) MI estimate with equal-frequency bins.
export function miBinned(pts, bins = 8) {
  const q = vals => { const s = [...vals].sort((a, b) => a - b); return v => { let k = 0; while (k < bins - 1 && v > s[Math.floor((k + 1) * s.length / bins)]) k++; return k } }
  const bx = q(pts.map(p => p.x)), by = q(pts.map(p => p.y)), J = range(bins).map(() => Array(bins).fill(0))
  pts.forEach(p => { J[bx(p.x)][by(p.y)]++ })
  return miFromJoint(J)
}
