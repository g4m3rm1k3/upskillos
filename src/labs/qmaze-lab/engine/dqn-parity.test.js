// engine/dqn.js against real PyTorch (engine/dqn-parity.json, recorded by tools/make_dqn_parity.py).
// Same starting weights, same exploring and replay draws, so the same games; the weights at the end
// agree to within rounding (both use 64-bit floats; only the order of some sums differs).
import { describe, expect, it } from 'vitest'
import runs from './dqn-parity.json'
import { trainDQN, greedyGame, rowsOf } from './dqn.js'

const camel = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]))
const finish = gen => { let s = gen.next(); while (!s.done) s = gen.next(); return s.value }

describe('the browser\'s DQN reproduces PyTorch', () => {
  for (const run of runs) {
    it(`${run.name}, ${run.steps} moves, seed ${run.seed}${run.marks === false ? ', no visited marks' : ''}: the same games and the same weights`, () => {
      const { name, totals, greedy, trail, W1, b1, W2, b2, ...options } = run
      const { net, totals: mine } = finish(trainDQN(name, camel(options)))
      expect(mine.length).toBe(totals.length)
      mine.forEach((t, i) => expect(t).toBeCloseTo(totals[i], 9))
      const close = (a, b) => a.flat().forEach((x, i) => expect(Math.abs(x - b.flat()[i])).toBeLessThan(1e-9))
      close(rowsOf(net.W1, net.nInputs), W1); close([Array.from(net.b1)], [b1]); close(rowsOf(net.W2, net.hidden), W2); close([Array.from(net.b2)], [b2])
      const g = greedyGame(net, name, { marks: run.marks ?? true })
      expect(g.trail).toEqual(trail)
      expect(g.total).toBeCloseTo(greedy, 9)
    }, 60000)
  }
})
