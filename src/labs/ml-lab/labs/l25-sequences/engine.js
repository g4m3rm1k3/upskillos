// Event-sequence classification: token embeddings, a mean-pooled baseline
// and an Elman RNN trained by backpropagation through time (BPTT), with
// padding/masking and an optional shortcut token.
import { random, normal, range, mean, sigmoid } from '../../kit/math.js'

export const VOCAB = ['<pad>', 'deploy', 'error', 'restart', 'timeout', 'ok', 'login', 'scale', 'alert', '[bot]']
export const PAD = 0, MAXLEN = 8

// Label: 1 if some 'error' occurs AFTER a 'deploy' (order matters).
export function makeSequences(n, seed, { shortcut = false } = {}) {
  const rng = random(seed), filler = [3, 4, 5, 6, 7, 8]
  return range(n).map(() => {
    const len = 3 + Math.floor(rng() * (MAXLEN - 2)), seq = range(len).map(() => filler[Math.floor(rng() * filler.length)])
    const kind = rng()
    if (kind < 0.4) { const a = Math.floor(rng() * (len - 1)), b = a + 1 + Math.floor(rng() * (len - a - 1)); seq[a] = 1; seq[b] = 2 } // deploy … error
    else if (kind < 0.8) { const a = Math.floor(rng() * (len - 1)), b = a + 1 + Math.floor(rng() * (len - a - 1)); seq[a] = 2; seq[b] = 1 } // error … deploy
    else if (kind < 0.9) seq[Math.floor(rng() * len)] = 1
    else seq[Math.floor(rng() * len)] = 2
    const label = seq.some((t, i) => t === 2 && seq.slice(0, i).includes(1)) ? 1 : 0
    if (shortcut && label === 1 && rng() < 0.9) seq[Math.floor(rng() * len)] = 9 // a spurious token that tracks the label only in this data
    return { seq, label, len: seq.length }
  })
}
export const pad = (s, to = MAXLEN) => [...s, ...Array(Math.max(0, to - s.length)).fill(PAD)]

export function initModel({ d = 4, h = 8, seed = 1 } = {}) {
  const rng = random(seed), m = (r, c, s) => range(r).map(() => range(c).map(() => s * normal(rng)))
  return { E: m(VOCAB.length, d, 0.5), Wx: m(d, h, Math.sqrt(1 / d)), Wh: m(h, h, Math.sqrt(1 / h)), b: Array(h).fill(0), w: range(h).map(() => 0.1 * normal(rng)), c: 0, pw: range(d).map(() => 0.1 * normal(rng)), pc: 0 }
}

// RNN forward over a padded sequence. With masking, padded steps keep h unchanged.
export function rnnForward(M, tokens, masked) {
  const H = M.b.length, hs = [Array(H).fill(0)], xs = []
  tokens.forEach(t => {
    const x = M.E[t], prev = hs.at(-1)
    if (masked && t === PAD) { hs.push(prev); xs.push(null); return }
    const hNew = range(H).map(j => Math.tanh(M.b[j] + x.reduce((s, v, i) => s + v * M.Wx[i][j], 0) + prev.reduce((s, v, i) => s + v * M.Wh[i][j], 0)))
    hs.push(hNew); xs.push(t)
  })
  const z = M.c + hs.at(-1).reduce((s, v, j) => s + v * M.w[j], 0)
  return { hs, xs, p: sigmoid(z) }
}
// Mean-pooled embeddings (optionally including pads) → logistic output.
export function poolForward(M, tokens, masked) {
  const use = masked ? tokens.filter(t => t !== PAD) : tokens, d = M.pw.length
  const v = range(d).map(k => mean(use.map(t => M.E[t][k])))
  return { v, use, p: sigmoid(M.pc + v.reduce((s, x, k) => s + x * M.pw[k], 0)) }
}

const zerosLike = M => JSON.parse(JSON.stringify(M, (k, v) => (typeof v === 'number' ? 0 : v)))
export function gradients(M, data, kind, masked) {
  const G = zerosLike(M), n = data.length, H = M.b.length
  let loss = 0
  for (const ex of data) {
    const tokens = pad(ex.seq)
    if (kind === 'pool') {
      const { v, use, p } = poolForward(M, tokens, masked), e = (p - ex.label) / n
      loss -= (ex.label ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12)) / n
      G.pc += e; v.forEach((x, k) => { G.pw[k] += e * x })
      use.forEach(t => M.pw.forEach((w, k) => { G.E[t][k] += e * w / use.length }))
      continue
    }
    const { hs, xs, p } = rnnForward(M, tokens, masked), e = (p - ex.label) / n
    loss -= (ex.label ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12)) / n
    G.c += e
    let dh = M.w.map(w => e * w)
    hs.at(-1).forEach((v, j) => { G.w[j] += e * v })
    for (let t = xs.length - 1; t >= 0; t--) {
      if (xs[t] === null) continue // masked step: h passed through unchanged, gradient too
      const h = hs[t + 1], prev = hs[t], x = M.E[xs[t]], dz = dh.map((g, j) => g * (1 - h[j] * h[j]))
      dz.forEach((g, j) => { G.b[j] += g; x.forEach((v, i) => { G.Wx[i][j] += v * g }); prev.forEach((v, i) => { G.Wh[i][j] += v * g }) })
      x.forEach((_, i) => { G.E[xs[t]][i] += dz.reduce((s, g, j) => s + g * M.Wx[i][j], 0) })
      dh = range(H).map(i => dz.reduce((s, g, j) => s + g * M.Wh[i][j], 0))
    }
  }
  return { G, loss }
}

// Adam over the nested parameter structure.
const mapLeaves = (a, f, b, c) => Array.isArray(a) ? a.map((x, i) => mapLeaves(x, f, b?.[i], c?.[i])) : typeof a === 'object' ? Object.fromEntries(Object.keys(a).map(k => [k, mapLeaves(a[k], f, b?.[k], c?.[k])])) : f(a, b, c)
export function train(data, { kind = 'rnn', masked = true, steps = 250, lr = 0.05, seed = 1 } = {}) {
  let M = initModel({ seed }), m = zerosLike(M), v = zerosLike(M)
  const curve = []
  for (let t = 1; t <= steps; t++) {
    const { G, loss } = gradients(M, data, kind, masked)
    m = mapLeaves(m, (a, g) => 0.9 * a + 0.1 * g, G); v = mapLeaves(v, (a, g) => 0.999 * a + 0.001 * g * g, G)
    M = mapLeaves(M, (p, mm, vv) => p - lr * (mm / (1 - 0.9 ** t)) / (Math.sqrt(vv / (1 - 0.999 ** t)) + 1e-8), m, v)
    if (t % 10 === 0) curve.push([t, loss])
  }
  return { M, curve }
}
export const predict = (M, seq, kind, masked, padTo = MAXLEN) => (kind === 'pool' ? poolForward(M, pad(seq, padTo), masked) : rnnForward(M, pad(seq, padTo), masked)).p
export const accuracy = (M, data, kind, masked, padTo = MAXLEN) => mean(data.map(ex => ((predict(M, ex.seq, kind, masked, padTo) >= 0.5 ? 1 : 0) === ex.label ? 1 : 0)))
