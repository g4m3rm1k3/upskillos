import { describe, it, expect } from 'vitest'
import { makeSequences, train, accuracy, gradients, initModel } from './engine.js'

describe('lab 25 sequences', () => {
  const tr = makeSequences(200, 1), te = makeSequences(200, 2)
  it('BPTT gradients match finite differences', () => {
    const M = initModel({ seed: 3 }), d = tr.slice(0, 4), { G } = gradients(M, d, 'rnn', true)
    const L = () => gradients(M, d, 'rnn', true).loss, o = M.Wx[2][3]
    M.Wx[2][3] = o + 1e-6; const up = L(); M.Wx[2][3] = o - 1e-6; const dn = L(); M.Wx[2][3] = o
    expect(G.Wx[2][3]).toBeCloseTo((up - dn) / 2e-6, 7)
  })
  it('the RNN learns order; pooling cannot; masking protects against padding shifts', () => {
    expect(accuracy(train(tr, { kind: 'pool', steps: 150 }).M, te, 'pool', true)).toBeLessThan(0.7)
    const r = train(tr, { kind: 'rnn', steps: 200 }); expect(accuracy(r.M, te, 'rnn', true)).toBeGreaterThan(0.9)
    expect(accuracy(r.M, te, 'rnn', true, 16)).toBeCloseTo(accuracy(r.M, te, 'rnn', true, 8), 10)
  })
})
