// engine/a2c.js against real PyTorch (engine/a2c-parity.json, recorded by tools/make_a2c_parity.py):
// starting from PyTorch's weights and replaying the actions PyTorch sampled and the results the
// world returned, the hand-written gradients and Adam steps must give PyTorch's weights after every
// update. PyTorch computes in 32-bit floats and this engine in 64-bit, hence the tolerance.
import { describe, expect, it } from 'vitest'
import runs from './a2c-parity.json'
import { GridWorld } from './gridworld.js'
import { a2cGradients, adamStep, makeAdam, rolloutReturns, valueOf } from './a2c.js'

const N_ENVS = 8, N_STEPS = 5, GAMMA = 0.95, LR = 0.05

function replay(run, onUpdate) {
  const env = new GridWorld(run.map)
  const net = { nStates: env.nStates, nActions: 4, W: run.W.map(r => [...r]), c: [...run.c] }
  const opt = makeAdam(net, LR)
  let states = new Array(N_ENVS).fill(env.start), k = 0, m = 0
  for (let update = 0; update < run.updates; update++) {
    const steps = []
    for (let t = 0; t < N_STEPS; t++) {
      const actions = run.actions[k++]
      steps.push(states.map((s, i) => {
        const [next, reward, terminated, truncated] = run.steps[m++]
        return { s, a: actions[i], reward, ended: terminated || truncated, endValue: truncated && !terminated ? valueOf(net, next) : 0, next }
      }))
      states = steps.at(-1).map(x => x.ended ? env.start : x.next)
    }
    const returns = rolloutReturns(net, steps, states, GAMMA)
    const batch = steps.flatMap((row, t) => row.map((x, i) => ({ s: x.s, a: x.a, R: returns[t][i] })))
    adamStep(net, opt, a2cGradients(net, batch))
    onUpdate(net, update)
  }
}

describe('A2C in JavaScript reproduces PyTorch', () => {
  for (const run of runs) {
    it(`${run.map}: weights after each of ${run.updates} updates`, () => {
      let worst = 0
      replay(run, (net, u) => {
        net.W.forEach((row, j) => row.forEach((w, s) => { worst = Math.max(worst, Math.abs(w - run.after[u].W[j][s])) }))
        net.c.forEach((w, s) => { worst = Math.max(worst, Math.abs(w - run.after[u].c[s])) })
      })
      expect(worst).toBeLessThan(1e-6)
    })
  }
})
