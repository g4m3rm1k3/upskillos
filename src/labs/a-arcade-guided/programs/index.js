// The programs this lab can trace, each with its explanations, its starting data and which state
// the picture draws. The supplied weights and table are the ones A-Arcade trained (snapshots.json).
// makeDef() builds the same thing from edited source, so a learner's own version runs and is traced.
import qSource from './qlearning.js?raw'
import a2cSource from './a2c.js?raw'
import * as qExplain from '../explain/qlearning.js'
import * as a2cExplain from '../explain/a2c.js'
import { EXTRAS, PHASES, ORCHESTRATORS } from '../explain/extras.js'
import snapshots from '../snapshots.json'
import { compile } from '../tracer.js'
import { analyse } from '../analysis.js'

const BASE = {
  q: {
    label: 'Q-learning', source: qSource, explain: qExplain,
    makeData: (supplied, overrides = {}) => ({
      Q: supplied ? snapshots.cartpole.table.map(row => [...row]) : Array.from({ length: 256 }, () => [0, 0]),
      alpha: .12, gamma: .99, epsilon: supplied ? 0 : .2, learning: !supplied,
      state: undefined, steps: 0, total: 0, episode: 1, seed: 7, ...overrides,
    }),
    drawn: data => data.state,
    steps: data => data.steps,
  },
  a2c: {
    label: 'A2C', source: a2cSource, explain: a2cExplain,
    makeData: (supplied, overrides = {}) => ({
      actorWeights: supplied ? [...snapshots.a2c.network.actor] : [0, 0, 0, 0, 0],
      criticWeights: supplied ? [...snapshots.a2c.network.critic] : new Array(11).fill(0),
      worlds: Array.from({ length: 8 }, () => ({})),
      gamma: .99, actorRate: .01, criticRate: .02, entropyBonus: .01, learning: !supplied, seed: 7, ...overrides,
    }),
    drawn: data => data.worlds[0].state,
    steps: data => data.worlds[0].steps,
  },
}

// Compile `source` (the original, or a learner's edit) into everything the lab needs.
// Throws an Error naming the line if the source can't be traced.
export function makeDef(id, source = BASE[id].source) {
  const base = BASE[id]
  const program = compile(source, { helpers: ['random'] })
  if (!program.traced.includes('run')) throw new Error('The program needs a function run(data) to start from.')
  const info = analyse(program, base.explain, EXTRAS[id])
  return { ...base, id, program, info, edited: source !== base.source, phases: PHASES[id], orchestrators: ORCHESTRATORS[id] }
}

export const PROGRAMS = { q: makeDef('q'), a2c: makeDef('a2c') }
export const ORIGINAL = { q: BASE.q.source, a2c: BASE.a2c.source }
