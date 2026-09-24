import { describe, it, expect } from 'vitest'
import { train, trainDeep, ARCHS } from './engine.js'

describe('lab 52 regularization and normalization', () => {
  it('regularization lifts validation accuracy; early stopping finds the right epoch', { timeout: 60000 }, () => {
    const none = train({}), drop = train({ dropout: 0.3 })
    expect(none.log.at(-1).trainAcc).toBe(1)
    expect(none.best.val).toBeLessThan(none.log.at(-1).val - 0.3)
    expect(drop.log.at(-1).valAcc).toBeGreaterThan(none.log.at(-1).valAcc + 0.04)
  })
  it('residual connections train a deep network fastest', { timeout: 60000 }, () => {
    const plain = trainDeep(16, { ...ARCHS.tanh.opts, width: 16 }), res = trainDeep(16, { ...ARCHS.res.opts, width: 16 })
    expect(res.at(-1)).toBeLessThan(plain.at(-1) / 5)
  })
})
