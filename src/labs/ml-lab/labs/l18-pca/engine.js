// PCA: covariance, eigenvectors, projections and reconstruction — in 2D where
// everything is visible, and on 8×8 digit images where compression matters.
import { random, normal, mean, range, symmetricEigen } from '../../kit/math.js'

export function cloud({ n = 150, angle = 35, ratio = 4, offset = [3, 2], seed = 1 } = {}) {
  const rng = random(seed), a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  return range(n).map(() => { const u = normal(rng) * Math.sqrt(ratio), v = normal(rng); return [offset[0] + c * u - s * v, offset[1] + s * u + c * v] })
}
export const meanVec = X => X[0].map((_, j) => mean(X.map(r => r[j])))
export function covariance(X, center = true) {
  const m = center ? meanVec(X) : X[0].map(() => 0), n = X.length, d = X[0].length
  return range(d).map(i => range(d).map(j => X.reduce((t, r) => t + (r[i] - m[i]) * (r[j] - m[j]), 0) / n))
}
export function pca(X, { center = true } = {}) {
  const m = center ? meanVec(X) : X[0].map(() => 0), e = symmetricEigen(covariance(X, center))
  const total = e.values.reduce((a, b) => a + Math.max(0, b), 0)
  return { mean: m, components: e.vectors, variances: e.values, ratio: e.values.map(v => Math.max(0, v) / total) }
}
export const project = (x, model, k) => model.components.slice(0, k).map(c => c.reduce((t, v, j) => t + v * (x[j] - model.mean[j]), 0))
export const reconstruct = (z, model) => model.mean.map((m, j) => m + z.reduce((t, zk, k) => t + zk * model.components[k][j], 0))
export const reconstructionError = (X, model, k) => mean(X.map(x => { const r = reconstruct(project(x, model, k), model); return x.reduce((t, v, j) => t + (v - r[j]) ** 2, 0) }))

// Variance of the data projected onto a unit direction at `deg` degrees (centered).
export function projectedVariance(X, deg) {
  const a = deg * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], m = meanVec(X)
  return mean(X.map(x => ((x[0] - m[0]) * u[0] + (x[1] - m[1]) * u[1]) ** 2))
}

// 5×7 bitmaps of the digits 0–9, placed in an 8×8 frame with a random shift,
// random stroke intensity and pixel noise.
const FONT = ['01110100011001110101110011000101110', '00100011000010000100001000010001110', '01110100010000100010001000100011111', '11111000100010000010000011000101110', '00010001100101010010111110001000010', '11111100001111000001000011000101110', '00110010001000011110100011000101110', '11111000010001000100010000100001000', '01110100011000101110100011000101110', '01110100011000101111000010001001100']
export function digits(n = 300, seed = 3) {
  const rng = random(seed)
  return range(n).map(i => {
    const d = i % 10, dx = Math.floor(rng() * 4), dy = Math.floor(rng() * 2), ink = 0.7 + 0.3 * rng(), img = Array(64).fill(0)
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (FONT[d][r * 5 + c] === '1') img[(r + dy) * 8 + c + dx] = ink
    return { digit: d, pixels: img.map(v => Math.min(1, Math.max(0, v + 0.08 * normal(rng)))) }
  })
}
