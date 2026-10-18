// Part 3, learning from samples: the JavaScript twins of the Python pieces of lessons 8–11 and A2.
// pieces.test.js checks every challenge against the Python reference, so these must take the same
// steps in the same order (and use the same random numbers when given a loaded dice).
import { ACTIONS, sampleOutcome, parseMap, buildTable, legalMoves, makeRng } from './world.js'

export function estimate(draw, n, rng) {
  let total = 0
  for (let k = 0; k < n; k++) total += draw(rng)
  return total / n
}

// Try a move n times in a world you can't see; count each (next, reward) result.
export function estimateOutcomes(step, state, action, n, rng) {
  const counts = new Map()
  for (let k = 0; k < n; k++) {
    const [nxt, reward] = step(state, action, rng)
    const key = `${nxt}|${reward}`
    counts.set(key, { nxt, reward, c: (counts.get(key)?.c ?? 0) + 1 })
  }
  return [...counts.values()].map(({ nxt, reward, c }) => [c / n, nxt, reward])
}

export const blackBox = table => (state, action, rng) => sampleOutcome(table[state][action], rng.random())

export const updateMean = (old, x, alpha) => old + alpha * (x - old)

export function runningMeans(xs, alpha = null) {
  let guess = 0
  return xs.map((x, k) => (guess = updateMean(guess, x, alpha === null ? 1 / (k + 1) : alpha)))
}

// The weight the final estimate gives each of n samples, oldest first.
export const weightsOnSamples = (n, alpha) => Array.from({ length: n }, (_, k) => (alpha === null ? 1 / n : alpha * (1 - alpha) ** (n - 1 - k)))

export const bestOf = row => { const v = Object.values(row); return v.length ? Math.max(...v) : 0 }

export function qUpdate(q, state, action, reward, nxt, alpha, g) {
  const target = reward + g * bestOf(q[nxt])
  const surprise = target - q[state][action]
  q[state][action] += alpha * surprise
  return surprise
}

export function choosePiece(row, eps, rng) {
  if (rng.random() < eps) return rng.choice(ACTIONS)
  const top = bestOf(row)
  return rng.choice(ACTIONS.filter(a => row[a] === top))
}

export function runBandit(pull, arms, steps, eps, rng) {
  const guesses = Object.fromEntries(arms.map(a => [a, 0]))
  const counts = Object.fromEntries(arms.map(a => [a, 0]))
  for (let k = 0; k < steps; k++) {
    let arm
    if (rng.random() < eps) arm = rng.choice(arms)
    else arm = arms.reduce((b, a) => (guesses[a] > guesses[b] ? a : b), arms[0])
    counts[arm] += 1
    guesses[arm] = updateMean(guesses[arm], pull(arm, rng), 1 / counts[arm])
  }
  return [guesses, counts]
}

// The learner of lesson A2 (and lesson 0), with any generator that has random() and choice().
export function trainQ(text, { episodes = 200, alpha = 0.5, g = 0.9, eps = 0.1, slip = 0, rng = makeRng(0), onEpisode } = {}) {
  const maze = parseMap(text), table = buildTable(maze, slip)
  const q = Object.fromEntries(Object.keys(table).map(s => [s, Object.fromEntries(Object.keys(table[s]).map(a => [a, 0]))]))
  for (let e = 0; e < episodes; e++) {
    let state = maze.start, steps = 0
    for (let t = 0; t < 200; t++) {
      if (!Object.keys(table[state]).length) break
      const action = choosePiece(q[state], eps, rng)
      const [nxt, reward] = sampleOutcome(table[state][action], rng.random())
      qUpdate(q, state, action, reward, nxt, alpha, g)
      state = nxt; steps++
    }
    onEpisode?.({ episode: e, steps, q })
  }
  return q
}

export function greedyRoute(q, text, cap = 100) {
  const maze = parseMap(text)
  let state = maze.start
  const route = [state]
  while (state !== maze.goal && route.length <= cap) {
    const action = ACTIONS.reduce((b, a) => (q[state][a] > q[state][b] ? a : b), ACTIONS[0])
    state = legalMoves(maze, state)[action] ?? state
    route.push(state)
  }
  return route
}

// Hidden slot machines: each arm pays its mean plus noise in [-1, 1).
export const pullArm = means => (arm, rng) => means[arm] + 2 * rng.random() - 1
