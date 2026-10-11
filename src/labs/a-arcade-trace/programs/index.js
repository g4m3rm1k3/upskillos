// The programs this lab can trace, each with its explanations, its starting data and which state
// the picture draws. The supplied weights and table are the ones A-Arcade trained (snapshots.json).
import qSource from './qlearning.js?raw'
import a2cSource from './a2c.js?raw'
import * as qExplain from '../explain/qlearning.js'
import * as a2cExplain from '../explain/a2c.js'
import snapshots from '../snapshots.json'
import { compile } from '../tracer.js'

export const PROGRAMS = {
  q: {
    label: 'Q-learning',
    program: compile(qSource, { helpers: ['random'] }),
    explain: qExplain,
    makeData: supplied => ({
      Q: supplied ? snapshots.cartpole.table.map(row => [...row]) : Array.from({ length: 256 }, () => [0, 0]),
      alpha: .12, gamma: .99, epsilon: supplied ? 0 : .2, learning: !supplied,
      state: undefined, steps: 0, total: 0, episode: 1, seed: 7,
    }),
    drawn: data => data.state,
    steps: data => data.steps,
  },
  a2c: {
    label: 'A2C',
    program: compile(a2cSource, { helpers: ['random'] }),
    explain: a2cExplain,
    makeData: supplied => ({
      actorWeights: supplied ? [...snapshots.a2c.network.actor] : [0, 0, 0, 0, 0],
      criticWeights: supplied ? [...snapshots.a2c.network.critic] : new Array(11).fill(0),
      worlds: Array.from({ length: 8 }, () => ({})),
      gamma: .99, actorRate: .01, criticRate: .02, entropyBonus: .01, learning: !supplied, seed: 7,
    }),
    drawn: data => data.worlds[0].state,
    steps: data => data.worlds[0].steps,
  },
}
