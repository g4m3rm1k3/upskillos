// python/maxbias.py in JavaScript, exactly.
import { PyRandom } from './kart.js'

export function best(values, rng) {
  const top = Math.max(...values), tied = []
  values.forEach((v, i) => { if (v === top) tied.push(i) })
  return tied[rng.randrange(tied.length)]
}
export function act(tables, method, s, epsilon, rng) {
  const values = method === 'double' ? tables[0][s].map((x, i) => x + tables[1][s][i]) : tables[0][s]
  return rng.random() < epsilon ? rng.randrange(values.length) : best(values, rng)
}
export function update(tables, method, s, a, reward, nextS, alpha, rng) {
  let Q = tables[0], other = tables[0]
  if (method === 'double') { if (rng.random() < 0.5) { Q = tables[0]; other = tables[1] } else { Q = tables[1]; other = tables[0] } }
  let future = 0
  if (nextS !== null) future = other[nextS][best(Q[nextS], rng)]
  Q[s][a] += alpha * (reward + future - Q[s][a])
}
// onEpisode(episode, tables), if given, after every episode.
export function run(method = 'q', episodes = 300, alpha = 0.1, epsilon = 0.1, actions = 10, seed = 0, onEpisode) {
  const rng = new PyRandom(seed), tables = [0, 1].map(() => [[0, 0], Array(actions).fill(0)]), lefts = []
  for (let episode = 0; episode < episodes; episode++) {
    const a = act(tables, method, 0, epsilon, rng)
    lefts.push(a === 0 ? 1 : 0)
    if (a === 1) update(tables, method, 0, 1, 0, null, alpha, rng)
    else {
      update(tables, method, 0, 0, 0, 1, alpha, rng)
      const b = act(tables, method, 1, epsilon, rng)
      update(tables, method, 1, b, -1.1 + (0.9 - -1.1) * rng.random(), null, alpha, rng)
    }
    onEpisode?.(episode, tables)
  }
  return lefts
}
export function leftRate(method = 'q', runs = 1000, episodes = 300) {
  const totals = Array(episodes).fill(0)
  for (let seed = 0; seed < runs; seed++) run(method, episodes, 0.1, 0.1, 10, seed).forEach((left, i) => { totals[i] += left })
  return totals.map(t => t / runs)
}
