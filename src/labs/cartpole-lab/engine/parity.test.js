// The JavaScript engine against the real Python programs (engine/parity.json, recorded by
// tools/make_parity.py): the same physics state by state, the same hand-rule game lengths, the
// same bins, and seeded Q-learning, SARSA and linear REINFORCE runs that end with the same numbers.
//
// Not always to the last digit: JavaScript's Math.sin, Math.cos and Math.exp and the C library
// Python uses can round the last binary digit differently (measured: seed 0's game first differs
// at step 48, by 5.6e-17 in θ̇). CartPole is chaotic, so over hundreds of games such a difference
// can grow into a different game: linear REINFORCE with seed 0 first plays a different game at
// game 125. So the recorded runs are ones short enough that every game length still agrees exactly,
// and the real numbers are compared to within the drift measured: one step from Python's own state
// to 1e-15 (over a whole game the gap doubles every few steps: 1e-6 by step 422), Q-table entries
// to 1e-4 (one state that once fell into a neighbouring slot) and REINFORCE's weights to 5e-4.
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import { CartPole } from './cartpole.js'
import { BinnedCartPole, makeEdges, slot, toState } from './bins.js'
import { RULES, averageLength } from './policies.js'
import { finish, qLearning, sarsa, greedyAction } from '../../qmaze-lab/engine/tabular.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'
import { trainLinear, gradients, frozenGames, gameGradient } from './linear.js'
import { mcControl, finishMC } from '../../qmaze-lab/engine/montecarlo.js'

const camel = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]))

function greedyLengths(Q, env, games = 20, seed = 1000) {
  const rng = new PyRandom(seed), lengths = []
  for (let game = 0; game < games; game++) {
    let [state] = env.reset(seed + game), total = 0, done = false
    while (!done) {
      const [next, reward, terminated, truncated] = env.step(greedyAction(Q[state], rng))
      total += reward; state = next; done = terminated || truncated
    }
    lengths.push(total)
  }
  return lengths
}

describe('the JavaScript engine reproduces the Python programs', () => {
  for (const game of parity.games) {
    it(`a seeded game (seed ${game.seed}): every step the same, and the game ends at the same step`, () => {
      const env = new CartPole()
      const [start] = env.reset(game.seed)
      expect(start).toEqual(game.states[0])
      // Each step on its own, from Python's state: no time for a last-digit difference to grow.
      let worst = 0
      game.actions.forEach((a, t) => {
        env.state = [...game.states[t]]
        const [next] = env.step(a)
        next.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - game.states[t + 1][i])) })
      })
      expect(worst).toBeLessThan(1e-15)
      // The whole game played through: the same length and the same ending.
      env.reset(game.seed)
      let last, n = 0
      do { last = env.step(game.actions[n++]) } while (!last[2] && !last[3])
      expect(n).toBe(game.actions.length)
      expect(last[2]).toBe(game.terminated)
      expect(last[3]).toBe(game.truncated)
    })
  }

  for (const [name, rule] of Object.entries(RULES)) {
    it(`the rule ${name}: the same 100 game lengths`, () => {
      const { mean, lengths } = averageLength(rule.run, 100)
      expect(lengths).toEqual(parity.rules[name].lengths)
      expect(mean).toBe(parity.rules[name].mean)
    })
  }

  it('the same bins', () => {
    expect([[2.4, 1], [3.0, 1], [0.21, 6], [3.5, 12]].map(([l, c]) => makeEdges(l, c))).toEqual(parity.bins.edges)
    expect([-0.3, -0.14, -0.1, 0.0, 0.069, 0.07, 0.2, 0.25].map(v => slot(v, makeEdges(0.21, 6)))).toEqual(parity.bins.slots)
    expect(toState([0, 0, 3, 7], [1, 1, 6, 12])).toBe(parity.bins.state)
  })

  for (const run of parity.tables) {
    it(`${run.algorithm}, ${run.episodes} games, seed ${run.seed}${run.counts ? `, bins ${run.counts}` : ''}: identical totals and greedy games, the same Q-table`, () => {
      const { algorithm, Q: _q, totals: _t, greedy: _g, counts = [1, 1, 6, 12], ...options } = run
      const defaults = { episodes: 500, alpha: 0.1, gamma: 0.99, epsilonStart: 1.0, epsilonEnd: 0.01, initialQ: 0, seed: 0 }
      const env = new BinnedCartPole(counts)
      const { Q, totals } = finish((algorithm === 'q_learning' ? qLearning : sarsa)(env, { ...defaults, ...camel(options) }))
      expect(totals).toEqual(run.totals)
      Q.forEach((row, s) => row.forEach((q, a) => expect(Math.abs(q - run.Q[s][a])).toBeLessThan(1e-4)))
      expect(greedyLengths(Q, new BinnedCartPole(counts))).toEqual(run.greedy)
    }, 30000)
  }

  it('linear REINFORCE: the same game lengths and final weights', () => {
    const { weights, lengths } = finish(trainLinear({ episodes: parity.linear.episodes, seed: parity.linear.seed }))
    expect(lengths).toEqual(parity.linear.lengths)
    weights.forEach((row, a) => row.forEach((w, i) => expect(w).toBeCloseTo(parity.linear.weights[a][i], 3)))
  })

  it('the neuron: gradient descent ends where Python ends', () => {
    let w = 0, b = 0
    for (let step = 0; step < 200; step++) { const [gw, gb] = gradients(w, b); w = w - 0.05 * gw; b = b - 0.05 * gb }
    expect([w, b]).toEqual(parity.neuron)
  })

  for (const run of parity.mc_control) {
    it(`Monte Carlo control, ${run.episodes} games, seed ${run.seed}${run.alpha ? `, α ${run.alpha}` : ''}: identical totals and greedy games, the same Q-table`, () => {
      const { Q: _q, totals: _t, greedy: _g, ...options } = run
      const { Q, totals } = finishMC(mcControl(new BinnedCartPole(), { episodes: 500, gamma: 0.99, alpha: null, epsilonStart: 1.0, epsilonEnd: 0.01, ...options }))
      expect(totals).toEqual(run.totals)
      Q.forEach((row, s) => row.forEach((q, a) => expect(Math.abs(q - run.Q[s][a])).toBeLessThan(1e-4)))
      expect(greedyLengths(Q, new BinnedCartPole())).toEqual(run.greedy)
    }, 30000)
  }

  it('REINFORCE\'s single-game gradients from a frozen policy: the same, game by game, for each baseline', () => {
    const { games } = frozenGames({ games: parity.gradient.games })
    for (const [b, expected] of Object.entries(parity.gradient.baselines)) {
      games.forEach((game, k) => gameGradient(game, Number(b)).forEach((g, i) => expect(Math.abs(g - expected[k][i])).toBeLessThan(1e-9 * (1 + Math.abs(g)))))
    }
  })
})
