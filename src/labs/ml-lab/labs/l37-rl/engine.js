// Reinforcement learning in a small gridworld: a robot crosses a yard next to a
// ditch. Tabular Q-learning, value iteration on the known model, a hand-written
// baseline policy, and a misspecified reward the agent learns to exploit.
import { random, range, mean, argmax } from '../../kit/math.js'

export const W = 7, H = 5
export const START = [0, 4], GOAL = [6, 4], CHECKPOINT = [3, 1]
export const isDitch = (x, y) => y === 4 && x > 0 && x < 6
export const ACTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]] // up, right, down, left
export const ARROWS = ['↑', '→', '↓', '←']
export const MAX_STEPS = 60
const S = (x, y) => y * W + x
export const N_STATES = W * H

// Reward designs. "task": −0.1 per step, +10 at the goal, −10 in the ditch.
// "checkpoint": the same plus +2 every time the robot enters the checkpoint —
// meant to encourage passing it, but it can be collected again and again.
export function stepEnv(state, a, rng, { slip = 0, design = 'task' } = {}) {
  const act = rng() < slip ? Math.floor(rng() * 4) : a
  const x = state % W, y = Math.floor(state / W), [dx, dy] = ACTIONS[act]
  const nx = Math.min(W - 1, Math.max(0, x + dx)), ny = Math.min(H - 1, Math.max(0, y + dy)), next = S(nx, ny)
  if (nx === GOAL[0] && ny === GOAL[1]) return { next, reward: 10, taskReward: 10, done: true, outcome: 'goal' }
  if (isDitch(nx, ny)) return { next, reward: -10, taskReward: -10, done: true, outcome: 'ditch' }
  const bonus = design === 'checkpoint' && nx === CHECKPOINT[0] && ny === CHECKPOINT[1] ? 2 : 0
  return { next, reward: -0.1 + bonus, taskReward: -0.1, done: false }
}
export const startState = () => S(...START)

// Tabular Q-learning with ε-greedy exploration. Returns the table and a per-
// episode log of the reward the agent optimized and the true task reward.
export function qLearning({ episodes = 400, alpha = 0.5, gamma = 0.95, epsilon = 0.1, slip = 0, design = 'task', seed = 37 } = {}) {
  const rng = random(seed), Q = range(N_STATES).map(() => [0, 0, 0, 0]), log = []
  for (let ep = 0; ep < episodes; ep++) {
    let s = startState(), ret = 0, task = 0, outcome = 'timeout'
    for (let t = 0; t < MAX_STEPS; t++) {
      const a = rng() < epsilon ? Math.floor(rng() * 4) : greedy(Q[s], rng)
      const r = stepEnv(s, a, rng, { slip, design })
      const target = r.reward + (r.done ? 0 : gamma * Math.max(...Q[r.next]))
      Q[s][a] += alpha * (target - Q[s][a])
      ret += r.reward; task += r.taskReward; s = r.next
      if (r.done) { outcome = r.outcome; break }
    }
    log.push({ ep, ret, task, outcome })
  }
  return { Q, log }
}
// Greedy action with random tie-breaking (untrained states have all-zero rows).
function greedy(q, rng) {
  const best = Math.max(...q), ties = range(4).filter(a => q[a] === best)
  return ties[Math.floor(rng() * ties.length)]
}

// Value iteration on the known model (for reference: the optimal policy).
export function valueIteration({ gamma = 0.95, slip = 0, design = 'task', sweeps = 200 } = {}) {
  let V = Array(N_STATES).fill(0)
  const outcomes = (s, a) => {
    const probs = range(4).map(b => (b === a ? 1 - slip : 0) + slip / 4)
    return range(4).filter(b => probs[b] > 0).map(b => { const r = stepEnv(s, b, () => 1, { slip: 0, design }); return { p: probs[b], ...r } })
  }
  const terminal = s => (s % W === GOAL[0] && Math.floor(s / W) === GOAL[1]) || isDitch(s % W, Math.floor(s / W))
  const qOf = (s, a, V) => outcomes(s, a).reduce((t, o) => t + o.p * (o.reward + (o.done ? 0 : gamma * V[o.next])), 0)
  for (let i = 0; i < sweeps; i++) V = V.map((_, s) => terminal(s) ? 0 : Math.max(...range(4).map(a => qOf(s, a, V))))
  return { V, policy: V.map((_, s) => terminal(s) ? -1 : argmax(range(4).map(a => qOf(s, a, V)))) }
}

// Policies as functions state → action.
export const fromQ = Q => s => argmax(Q[s])
export const fromTable = policy => s => Math.max(0, policy[s])
// Hand-written baseline: step up once, walk right along the ditch, step down.
export const edgeWalker = s => { const x = s % W, y = Math.floor(s / W); return y === 4 ? (x === 0 ? 0 : 2) : x < 6 ? 1 : 2 }

export function rollout(policy, rng, opts = {}) {
  let s = startState(), ret = 0, task = 0, outcome = 'timeout'
  const path = [s]
  for (let t = 0; t < MAX_STEPS; t++) {
    const r = stepEnv(s, policy(s), rng, opts)
    ret += r.reward; task += r.taskReward; s = r.next; path.push(s)
    if (r.done) { outcome = r.outcome; break }
  }
  return { ret, task, outcome, path, steps: path.length - 1 }
}
export function evaluatePolicy(policy, { episodes = 400, seed = 99, ...opts } = {}) {
  const rng = random(seed), runs = range(episodes).map(() => rollout(policy, rng, opts))
  const share = o => mean(runs.map(r => r.outcome === o ? 1 : 0))
  return { goal: share('goal'), ditch: share('ditch'), timeout: share('timeout'), ret: mean(runs.map(r => r.ret)), task: mean(runs.map(r => r.task)), steps: mean(runs.filter(r => r.outcome === 'goal').map(r => r.steps)) }
}
export const movingAverage = (xs, w = 20) => xs.map((_, i) => mean(xs.slice(Math.max(0, i - w + 1), i + 1)))
export const cell = s => [s % W, Math.floor(s / W)]
