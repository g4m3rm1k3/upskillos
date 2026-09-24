import { describe, it, expect } from 'vitest'
import { trainAE, trainVAE, sampleQuality, reconstruct, noisy, TEST } from './engine.js'
import { random, mean } from '../../kit/math.js'

describe('lab 53 autoencoders and VAEs', () => {
  it('VAE samples cover all digits; β = 4 collapses', { timeout: 60000 }, () => {
    const v1 = trainVAE({ beta: 1 }), v4 = trainVAE({ beta: 4 }), ae = trainAE({ latent: 2 })
    expect(sampleQuality(v1).distinct).toBe(10)
    expect(sampleQuality(ae).distinct).toBeLessThan(10)
    expect(v4.curve.at(-1).kl).toBeLessThan(0.1); expect(sampleQuality(v4).distinct).toBeLessThanOrEqual(2)
  })
  it('a denoising autoencoder cleans noise better than a plain one', { timeout: 60000 }, () => {
    const err = m => { const rng = random(4); return mean(TEST.map(t => { const r = reconstruct(m, noisy(t.x, 0.3, rng)); return mean(r.map((v, i) => (v - t.x[i]) ** 2)) })) }
    expect(err(trainAE({ latent: 4, noise: 0.3 }))).toBeLessThan(0.8 * err(trainAE({ latent: 4 })))
  })
})
