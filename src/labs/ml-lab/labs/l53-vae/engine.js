// Autoencoders and variational autoencoders on tiny 7×5 digit images:
// a bottleneck that compresses, a denoising objective, and a VAE whose
// latent space can be sampled to generate new digits.
import { random, normal, range, mean } from '../../kit/math.js'
import { Dense, ReLU, Sequential, bceLogits, Adam } from '../../kit/nn.js'

const FONT = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110', '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000', '01110100011000101110100011000101110', '01110100011000101111000010001001100']
export const W = 5, H = 7, D = 35
// A handwritten-ish variant: jitter ink intensity, drop or add a few pixels.
export function digit(d, rng, noise = 0.08) {
  return Float64Array.from(FONT[d], (c, i) => { let v = c === '1' ? 0.75 + 0.25 * rng() : 0; if (rng() < 0.06) v = v ? 0 : 0.6 * rng(); return Math.min(1, Math.max(0, v + noise * normal(rng))) })
}
export function dataset(n = 400, seed = 53) { const rng = random(seed); return range(n).map(i => ({ d: i % 10, x: digit(i % 10, rng) })) }
export const TRAIN = dataset(400, 53), TEST = dataset(200, 530)

const sigmoid = v => 1 / (1 + Math.exp(-v))
function mlp(sizes, rng) { const L = []; sizes.slice(1).forEach((s, i) => { L.push(new Dense(sizes[i], s, rng)); if (i < sizes.length - 2) L.push(ReLU()) }); return new Sequential(L) }

// Deterministic (optionally denoising) autoencoder.
export function trainAE({ latent = 2, epochs = 60, noise = 0, seed = 1, batch = 40 } = {}) {
  const rng = random(seed), enc = mlp([D, 32, latent], rng), dec = mlp([latent, 32, D], rng)
  const opt = new Adam([...enc.params(), ...dec.params()], { lr: 0.01 }), curve = []
  for (let e = 0; e < epochs; e++) {
    const order = range(TRAIN.length).sort(() => rng() - 0.5)
    for (let b = 0; b < order.length; b += batch) {
      const rows = order.slice(b, b + batch).map(i => TRAIN[i].x), inp = noise ? rows.map(x => x.map(v => Math.min(1, Math.max(0, v + noise * normal(rng))))) : rows
      enc.zeroGrad(); dec.zeroGrad()
      const r = bceLogits(dec.forward(enc.forward(inp)), rows)
      enc.backward(dec.backward(r.grad)); opt.step()
    }
    curve.push(reconError({ enc, dec, kind: 'ae' }, TEST))
  }
  return { enc, dec, curve, kind: 'ae', latent }
}
// Variational autoencoder: encoder outputs mean and log-variance; loss = reconstruction + β·KL.
export function trainVAE({ latent = 2, epochs = 60, beta = 1, seed = 1, batch = 40 } = {}) {
  const rng = random(seed), enc = mlp([D, 32, 2 * latent], rng), dec = mlp([latent, 32, D], rng)
  const opt = new Adam([...enc.params(), ...dec.params()], { lr: 0.01 }), curve = []
  for (let e = 0; e < epochs; e++) {
    const order = range(TRAIN.length).sort(() => rng() - 0.5)
    let recS = 0, klS = 0
    for (let b = 0; b < order.length; b += batch) {
      const rows = order.slice(b, b + batch).map(i => TRAIN[i].x), n = rows.length
      enc.zeroGrad(); dec.zeroGrad()
      const h = enc.forward(rows), eps = rows.map(() => Float64Array.from({ length: latent }, () => normal(rng)))
      const z = h.map((r, i) => Float64Array.from({ length: latent }, (_, k) => r[k] + Math.exp(0.5 * r[latent + k]) * eps[i][k]))
      const rec = bceLogits(dec.forward(z), rows), dz = dec.backward(rec.grad)
      let kl = 0
      const dh = h.map((r, i) => { const g = new Float64Array(2 * latent); for (let k = 0; k < latent; k++) { const mu = r[k], lv = r[latent + k]; kl += 0.5 * (Math.exp(lv) + mu * mu - 1 - lv) / n; g[k] = dz[i][k] + beta * mu / n; g[latent + k] = dz[i][k] * eps[i][k] * 0.5 * Math.exp(0.5 * lv) + beta * 0.5 * (Math.exp(lv) - 1) / n } return g })
      enc.backward(dh); opt.step(); recS += rec.loss * n; klS += kl * n
    }
    curve.push({ rec: recS / TRAIN.length, kl: klS / TRAIN.length })
  }
  return { enc, dec, curve, kind: 'vae', latent, beta }
}
export const encode = (m, x) => { const h = m.enc.forward([x])[0]; return Array.from(h.slice(0, m.latent)) }
export const decode = (m, z) => Array.from(m.dec.forward([Float64Array.from(z)])[0], sigmoid)
export const reconstruct = (m, x) => decode(m, encode(m, x))
// Mean binary cross-entropy per image (using the mean code for VAEs).
export function reconError(m, data) {
  return mean(data.map(({ x }) => { const r = reconstruct(m, x); return -x.reduce((s, t, i) => s + t * Math.log(Math.max(r[i], 1e-9)) + (1 - t) * Math.log(Math.max(1 - r[i], 1e-9)), 0) }))
}
// How much of the latent grid decodes to a recognizable digit: nearest-template correlation.
export function templateScore(img) {
  const t = range(10).map(d => Float64Array.from(FONT[d], c => (c === '1' ? 1 : 0)))
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 } return n / Math.sqrt(da * db + 1e-12) }
  const scores = t.map(tt => corr(img, tt)); const best = Math.max(...scores)
  return { digit: scores.indexOf(best), score: best }
}
export function gridScores(m, span = 2.5, k = 7) {
  return range(k).flatMap(i => range(k).map(j => templateScore(decode(m, [-span + 2 * span * j / (k - 1), span - 2 * span * i / (k - 1)])).score))
}
export const noisy = (x, s, rng) => Float64Array.from(x, v => Math.min(1, Math.max(0, v + s * normal(rng))))
// Generate by sampling z ~ N(0, I): share recognizable, and how many distinct digits appear.
export function sampleQuality(m, n = 200, seed = 11) {
  const rng = random(seed), res = range(n).map(() => templateScore(decode(m, range(m.latent).map(() => normal(rng)))))
  const good = res.filter(r => r.score > 0.7)
  return { recognizable: good.length / n, distinct: new Set(good.map(r => r.digit)).size }
}
