// Judging a learned table: play it greedily (no exploring) and compare it with the exact answer.
import { GridWorld } from './gridworld.js'
import { PyRandom } from './mt.js'
import { greedyAction } from './tabular.js'
import { valueIteration } from './planning.js'

// Average undiscounted return of `episodes` greedy games, and how they ended.
export function evaluateGreedy(map, Q, { episodes = 100, seed = 1000 } = {}) {
  const env = new GridWorld(map), rng = new PyRandom(1), ends = {}
  let sum = 0
  for (let i = 0; i < episodes; i++) {
    let [s] = env.reset(i === 0 ? seed : null), done = false, total = 0, terminated = false
    while (!done) {
      const [next, r, te, tr] = env.step(greedyAction(Q[s], rng))
      total += r; s = next; done = te || tr; terminated = te
    }
    sum += total
    const how = terminated ? env.letter(s) : 'time limit'
    ends[how] = (ends[how] ?? 0) + 1
  }
  return { mean: sum / episodes, ends }
}

// The states where an agent can actually stand and choose: not walls, endings or cliff cells.
export const choiceStates = env => [...Array(env.nStates).keys()].filter(s => !env.isWall(s) && !env.isEnd(s) && !env.cells[env.letter(s)]?.to_start)

// How close a Q-table is to Q*: the largest difference, and in how many states its greedy action
// is one of the optimal ones.
export function compareWithOptimal(map, Q, gamma) {
  const env = new GridWorld(map), { Q: Qs } = valueIteration(env.P, gamma), states = choiceStates(env)
  let agree = 0, maxDiff = 0
  for (const s of states) {
    const best = Math.max(...Q[s]), bestStar = Math.max(...Qs[s])
    const mine = Q[s].findIndex(q => q === best)
    if (Math.abs(Qs[s][mine] - bestStar) < 1e-9) agree++
    for (let a = 0; a < 4; a++) maxDiff = Math.max(maxDiff, Math.abs(Q[s][a] - Qs[s][a]))
  }
  return { agree, of: states.length, maxDiff, Qstar: Qs }
}
