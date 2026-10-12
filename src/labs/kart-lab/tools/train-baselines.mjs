// Reproduce the supplied drivers; no hand-authored driving rules are baked into the policies.
import { writeFileSync } from 'node:fs'
import { train, pack, evaluate, DEFAULTS } from '../engine/learning.js'
const drivers = [
  { id: 'mint', name: 'Mint / Q-learning', algorithm: 'q', seed: 19 },
  { id: 'coral', name: 'Coral / SARSA', algorithm: 'sarsa', seed: 73 },
  { id: 'violet', name: 'Violet / Double Q', algorithm: 'double', seed: 137 },
].map(spec => {
  const { model } = train({ ...DEFAULTS, ...spec, episodes: 6000 })
  const evaluation = evaluate(model)
  console.log(spec.name, evaluation)
  return { id: spec.id, name: spec.name, checkpoint: pack(model), evaluation }
})
writeFileSync(new URL('../baselines.json', import.meta.url), JSON.stringify(drivers))
