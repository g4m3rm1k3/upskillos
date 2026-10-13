// Measures what the lessons say and records it in engine/measured.json. Every number comes from
// the engine, which equals the Python programs (engine/parity.test.js). Five training seeds per
// setting; every driver is tested frozen on 50 held-out laps of each track. About two minutes:
//   node src/labs/kart-lab/tools/measure.mjs
import { writeFileSync } from 'node:fs'
import { SUNLIT, HARBOUR, careful, flatOut, randomDriver, measure } from '../engine/kart.js'
import { train, evaluate, trainLinear, evaluateLinear } from '../engine/tabular.js'
import { leftRate } from '../engine/maxbias.js'

const SEEDS = [19, 73, 137, 211, 307], r3 = x => Number(x.toFixed(3))
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const out = { seeds: SEEDS, laps: 50, rules: {}, tables: {}, linear: {}, maxbias: {}, curves: {} }
for (const [id, d] of [['random', randomDriver(0)], ['flat', flatOut], ['careful', careful]]) {
  out.rules[id] = { sunlit: measure(d, 50).map(r3), harbour: measure(d, 50, HARBOUR).map(r3) }
}
console.log('rules', JSON.stringify(out.rules))
function tableRuns(id, config) {
  const runs = SEEDS.map(seed => {
    const crashes = []
    const { tables, totals } = train({ ...config, seed }, SUNLIT, (e, lap) => crashes.push(lap.crashes))
    return { seed, practiceHits: r3(mean(crashes.slice(-500))), practiceFinish: r3(mean(crashes.slice(-500).map(c => c < 8 ? 1 : 0))), sunlit: evaluate(tables, config, SUNLIT).map(r3), harbour: evaluate(tables, config, HARBOUR).map(r3), keys: tables[0].size, last: r3(mean(totals.slice(-200))) }
  })
  out.tables[id] = { config, runs, sunlit: r3(mean(runs.map(r => r.sunlit[0]))), harbour: r3(mean(runs.map(r => r.harbour[0]))), hits: r3(mean(runs.map(r => r.sunlit[1]))), practiceHits: r3(mean(runs.map(r => r.practiceHits))) }
  console.log(id, out.tables[id].sunlit, out.tables[id].harbour, out.tables[id].hits, out.tables[id].practiceHits)
}
for (const method of ['q', 'sarsa', 'double']) for (const view of ['sector', 'sensors']) tableRuns(`${method}-${view}`, { method, view })
for (const penalty of [0, 20]) tableRuns(`q-sector-penalty${penalty}`, { method: 'q', view: 'sector', penalty })
for (const episodes of [500, 8000]) for (const view of ['sector', 'sensors']) tableRuns(`q-${view}-${episodes}`, { method: 'q', view, episodes })
for (const alpha of [0.01, 0.02, 0.05]) {
  const runs = SEEDS.map(seed => { const w = trainLinear({ alpha, seed }); return { seed, sunlit: evaluateLinear(w).map(r3), harbour: evaluateLinear(w, HARBOUR).map(r3) } })
  out.linear[alpha] = { runs, sunlit: r3(mean(runs.map(r => r.sunlit[0]))), harbour: r3(mean(runs.map(r => r.harbour[0]))) }
  console.log('linear', alpha, out.linear[alpha].sunlit, out.linear[alpha].harbour)
}
// Learning curves: average reward per practice lap, in blocks of 100 laps (seed 19).
for (const [id, config] of [['sector', { view: 'sector' }], ['sensors', { view: 'sensors' }], ['sarsa', { method: 'sarsa' }], ['double', { method: 'double' }]]) {
  const { totals } = train({ ...config, seed: 19 })
  out.curves[id] = Array.from({ length: totals.length / 100 }, (_, b) => r3(mean(totals.slice(b * 100, b * 100 + 100))))
}
out.maxbias = { q: leftRate('q', 2000, 300).map(r3), double: leftRate('double', 2000, 300).map(r3) }
writeFileSync(new URL('../engine/measured.json', import.meta.url), JSON.stringify(out) + '\n')
