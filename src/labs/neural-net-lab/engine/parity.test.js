// The JavaScript engine against the real Python programs and real PyTorch (engine/parity.json,
// recorded by tools/make_parity.py): the same made-up data, the same gradient descent, the same
// hand-written network trained the same way, the same car split, and a general network whose
// gradients and SGD, momentum and Adam steps match PyTorch's (in 64-bit floats on both sides).
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { makeLine, makeCurve, fitLine, initNet, trainNet } from './part1.js'
import { split, loadCars, meanAndSpread } from './cars.js'
import { lossAndGradients, makeOptimizer, optimizerStep } from './mlp.js'

const close = (a, b, tol) => {
  if (Array.isArray(a)) { expect(a.length).toBe(b.length); a.forEach((x, i) => close(x, b[i], tol)); return }
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol)
}

describe('Part 1 programs', () => {
  it('the same made-up points', () => {
    close(makeLine(), parity.line, 1e-15)
    close(makeCurve(), parity.curve, 1e-15)
  })
  it('fit_line: the same 500 steps of gradient descent', () => {
    const r = fitLine()
    close([r.w, r.b], [parity.fit_line.w, parity.fit_line.b], 1e-12)
    close(r.history, parity.fit_line.history, 1e-12)
  })
  it('init_net and train_net: the same starting weights and the same 300 losses', () => {
    const net = initNet(8, 0)
    close([net.w1, net.b1, net.w2, net.b2], [parity.init_net.w1, parity.init_net.b1, parity.init_net.w2, parity.init_net.b2], 1e-15)
    const r = trainNet({ steps: 300 })
    close(r.history, parity.train_net.history, 1e-12)
    close([r.net.w1, r.net.b1, r.net.w2, r.net.b2], [parity.train_net.net.w1, parity.train_net.net.b1, parity.train_net.net.w2, parity.train_net.net.b2], 1e-12)
  })
  it('cars: the same cleaning, shuffle, split and statistics', () => {
    const [train, test] = split(loadCars())
    expect([train.length, test.length]).toEqual(parity.cars.n)
    expect(train.slice(0, 10).map(c => c[0])).toEqual(parity.cars.train)
    expect(test.slice(0, 10).map(c => c[0])).toEqual(parity.cars.test)
    close([meanAndSpread(train.map(c => c[1])), meanAndSpread(train.map(c => c[2]))], parity.cars.stats, 1e-9)
  })
})

describe('the general network matches PyTorch', () => {
  for (const run of parity.networks) {
    it(`${run.activation}, ${run.optimiser}: same gradients, same 5 losses, same weights after`, () => {
      const net = { inputs: 2, layers: run.start.map(([W, b], i) => ({ W: W.map(r => [...r]), b: [...b], activation: i < 2 ? run.activation : 'none' })) }
      const opt = makeOptimizer(net, { kind: run.optimiser, rate: 0.05 })
      for (let step = 0; step < 5; step++) {
        const { loss, grads } = lossAndGradients(net, run.x, run.y)
        if (step === 0) close(grads.map(g => [g.W, g.b]), run.grads, 1e-12)
        close(loss, run.losses[step], 1e-12)
        optimizerStep(net, opt, grads)
      }
      close(net.layers.map(l => [l.W, l.b]), run.end, 1e-10)
    })
  }
})
