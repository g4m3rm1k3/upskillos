import { describe, it, expect } from 'vitest'
import { attention, sinusoidal, randomMatrix, entropy, lookup, dotSpread, blockShapes } from './engine.js'

describe('lab 26 attention', () => {
  const X = randomMatrix(5, 8, 1)
  it('weights sum to one; causal mask zeroes the future', () => {
    const a = attention(X, X, X, { causal: true })
    a.weights.forEach((w, i) => { expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12); w.slice(i + 1).forEach(v => expect(v).toBe(0)) })
  })
  it('self-attention is permutation-equivariant until positions are added', () => {
    const p = [2, 0, 1, 3, 4], Xp = p.map(i => X[i]), a = attention(X, X, X), b = attention(Xp, Xp, Xp)
    p.forEach((src, i) => a.out[src].forEach((v, j) => expect(b.out[i][j]).toBeCloseTo(v, 12)))
    const P = sinusoidal(5, 8), A = X.map((r, t) => r.map((v, j) => v + P[t][j])), B = Xp.map((r, t) => r.map((v, j) => v + P[t][j]))
    expect(Math.abs(attention(B, B, B).out[0][0] - attention(A, A, A).out[2][0])).toBeGreaterThan(1e-6)
  })
  it('lookup sharpness, √d growth and ~12d² parameters per block', () => {
    expect(entropy(lookup(10, 0).w)).toBeCloseTo(Math.log(6), 10); expect(Math.max(...lookup(0, 40).w)).toBeGreaterThan(0.99)
    expect(dotSpread(256) / dotSpread(16)).toBeGreaterThan(3)
    const total = blockShapes(64, 768, 12).reduce((t, r) => t + r[2], 0); expect(total / (768 * 768)).toBeCloseTo(12, 1)
  })
})
