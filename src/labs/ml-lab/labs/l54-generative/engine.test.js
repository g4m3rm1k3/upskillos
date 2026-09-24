import { describe, it, expect } from 'vitest'
import { trainGAN, GAN_PRESETS, trainDiffusion, modeCoverage, modeShares } from './engine.js'

describe('lab 54 GANs and diffusion', () => {
  it('balanced GAN covers the ring; generator-heavy training collapses', { timeout: 60000 }, () => {
    expect(modeCoverage(trainGAN({ seed: 1 }).sample(1000)).covered).toBe(8)
    expect(Math.max(...modeShares(trainGAN({ seed: 2, ...GAN_PRESETS.greedy.opts }).sample(1000)))).toBeGreaterThan(0.8)
  })
  it('diffusion covers all eight modes', { timeout: 60000 }, () => {
    expect(modeCoverage(trainDiffusion().sample(1000).x).covered).toBe(8)
  })
})
