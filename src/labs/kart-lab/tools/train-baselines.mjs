// Reproduces the supplied drivers from real training with the seeds and budgets below, and writes
// baselines.json: 6,000 practice laps for the sector tables, the default 2,500 for the others. No hand-written driving rules are baked into them. About ten seconds:
//   node src/labs/kart-lab/tools/train-baselines.mjs
import { writeFileSync } from 'node:fs'
import { SUNLIT, HARBOUR } from '../engine/kart.js'
import { DEFAULTS, train, evaluate, trainLinear, evaluateLinear, pack } from '../engine/tabular.js'

const SPECS = [
  { id: 'mint', name: 'Mint · Q-learning', config: { method: 'q', view: 'sector', seed: 19 } },
  { id: 'coral', name: 'Coral · SARSA', config: { method: 'sarsa', view: 'sector', seed: 73 } },
  { id: 'violet', name: 'Violet · Double Q', config: { method: 'double', view: 'sector', seed: 137 } },
  { id: 'sky', name: 'Sky · Sensors', config: { method: 'q', view: 'sensors', seed: 19, episodes: 2500 } },
  { id: 'ember', name: 'Ember · Linear', config: { method: 'linear', view: 'sensors', seed: 19, alpha: 0.01, episodes: 2500 } },
]
const drivers = SPECS.map(({ id, name, config }) => {
  const full = { ...DEFAULTS, episodes: 6000, ...config, track: 'sunlit' }
  let checkpoint, evaluation
  if (config.method === 'linear') {
    const weights = trainLinear({ episodes: full.episodes, alpha: full.alpha, seed: full.seed })
    checkpoint = pack({ kind: 'linear', weights }, full, full.episodes)
    evaluation = { sunlit: evaluateLinear(weights, SUNLIT), harbour: evaluateLinear(weights, HARBOUR) }
  } else {
    const { tables } = train(full)
    checkpoint = pack({ kind: 'table', tables }, full, full.episodes)
    evaluation = { sunlit: evaluate(tables, full, SUNLIT), harbour: evaluate(tables, full, HARBOUR) }
  }
  console.log(name, JSON.stringify(evaluation))
  return { id, name, checkpoint, evaluation }
})
writeFileSync(new URL('../baselines.json', import.meta.url), JSON.stringify(drivers))
