import { describe, it, expect } from 'vitest'
import { TRAIN_TEXT, TEST_TEXT, learnBPE, applyBPE, ngramModel, interpolatedModel, bitsPerChar, trainNeural } from './engine.js'

describe('lab 55 language models', () => {
  it('BPE shortens text; smoothing matters; interpolation wins among n-grams', () => {
    expect(applyBPE(TEST_TEXT, learnBPE(TRAIN_TEXT, 100)).length).toBeLessThan(0.75 * TEST_TEXT.length)
    expect(bitsPerChar(ngramModel(TRAIN_TEXT, 3, 0), TEST_TEXT)).toBe(Infinity)
    const interp = bitsPerChar(interpolatedModel(TRAIN_TEXT, 5), TEST_TEXT), addk = bitsPerChar(ngramModel(TRAIN_TEXT, 5, 0.1), TEST_TEXT)
    expect(interp).toBeLessThan(addk); expect(interp).toBeLessThan(3)
  })
  it('the neural model learns (held-out below 3.2 bits)', { timeout: 60000 }, () => {
    const r = trainNeural({ context: 3, epochs: 4 })
    expect(Math.min(...r.curve.map(c => c.test))).toBeLessThan(3.2)
  })
})
