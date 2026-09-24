import { describe, it, expect } from 'vitest'
import { entropy, kl, huffman, avgLength, textStats, sampleRelation, correlation, miBinned, miFromJoint } from './engine.js'

describe('lab 46 information theory', () => {
  it('entropy, KL and Huffman', () => {
    const p = [0.5, 0.25, 0.125, 0.125]
    expect(entropy(p)).toBeCloseTo(1.75, 12)
    expect(avgLength(p, huffman(p))).toBeCloseTo(1.75, 12)
    const q = [0.4, 0.3, 0.2, 0.1]; expect(avgLength(q, huffman(q))).toBeLessThan(entropy(q) + 1)
    expect(kl(p, [0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0.25, 12)
    expect(kl(p, p)).toBeCloseTo(0, 12)
  })
  it('structure lowers bits per character', () => {
    const s = textStats(); expect(s.unigram).toBeLessThan(s.uniform); expect(s.bigram).toBeLessThan(s.unigram)
  })
  it('MI sees nonlinear dependence; the table formula is exact', () => {
    const u = sampleRelation('quadratic'), ind = sampleRelation('independent')
    expect(Math.abs(correlation(u))).toBeLessThan(0.1); expect(miBinned(u)).toBeGreaterThan(1)
    expect(miBinned(ind)).toBeLessThan(0.1)
    expect(miFromJoint([[0.4, 0.1], [0.1, 0.4]])).toBeCloseTo(1 + (0.8 * Math.log2(0.8) + 0.2 * Math.log2(0.2)), 12)
  })
})
