// Run: node src/labs/a-arcade/train-snapshots.mjs
// Generated snapshots are learned by the same engine shown in the lab.
import { writeFileSync } from 'node:fs'
import { random, resetWorld, stepWorld, encode, makeTable, chooseAction, qUpdate, makeNetwork, collectRollouts, a2cUpdate, actor, evaluate } from './engine.js'
const snapshots = { provenance: { seed: 7, selectionSeeds: [101,102,103,104,105], note: 'Best checkpoint selected on five fixed seeds. These are demonstration policies, not evidence of general performance.' } }
for (const world of ['cartpole', 'maze']) {
  const rng = random(7), table = makeTable(world)
  let best = -Infinity, chosen, episodes = 0
  const limit = world === 'maze' ? 1000 : 40000
  for (let episode = 0; episode < limit; episode++) {
    let state = resetWorld(world, rng)
    const epsilon = Math.max(.02, .8 * Math.exp(-episode / (world === 'maze' ? 200 : 6000)))
    for (let steps = 1; steps <= (world === 'maze' ? 100 : 500); steps++) {
      const row = table[encode(world, state).index]
      const { action } = chooseAction(row, epsilon, rng)
      const t = stepWorld(world, state, action, steps)
      qUpdate(row, action, t.reward, table[encode(world, t.next).index], t.terminated, .12, .99)
      state = t.next
      if (t.terminated || t.truncated) break
    }
    if ((episode + 1) % 100 === 0) {
      const scores = evaluate(world, s => { const row = table[encode(world, s).index]; return row.indexOf(Math.max(...row)) })
      const score = scores.reduce((sum, r) => sum + r.total, 0) / scores.length
      if (score > best) { best = score; chosen = table.map(row => [...row]); episodes = episode + 1 }
      if (world === 'cartpole' && best === 500) break
    }
  }
  snapshots[world] = { table: chosen, episodes, selectionMean: best }
  console.log(world, { episodes, selectionMean: best })
}
const rng = random(7), network = makeNetwork()
const workers = Array.from({ length: 8 }, () => ({ state: resetWorld('cartpole', rng), steps: 0 }))
let best = -Infinity, chosen, updates = 0
for (let i = 0; i < 30000; i++) {
  a2cUpdate(network, collectRollouts(network, rng, workers), { actorRate: .03, criticRate: .05 })
  if ((i + 1) % 100 === 0) {
    const scores = evaluate('cartpole', s => actor(s, network.actor).probabilities[1] >= .5 ? 1 : 0)
    const score = scores.reduce((sum, r) => sum + r.total, 0) / scores.length
    if (score > best) { best = score; chosen = structuredClone(network); updates = i + 1 }
    if (best === 500) break
  }
}
snapshots.a2c = { network: chosen, updates, selectionMean: best }
console.log('a2c', { updates, selectionMean: best })
writeFileSync(new URL('./snapshots.json', import.meta.url), JSON.stringify(snapshots))
