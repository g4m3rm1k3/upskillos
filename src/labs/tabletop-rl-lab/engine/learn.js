// python/learn.py in JavaScript, exactly: Q-learning, SARSA and the afterstate learner for one turn,
// drawing the same random numbers in the same order as Python, so the same seed learns the same table.
import { HANDS, SCORES, PyRandom, roll, handId } from './dice.js'
import { KEEPS, KEPT, evaluate } from './turn.js'

const rerollId = (k, rng) => handId([...KEPT[k], ...roll(5 - KEPT[k].length, rng)])
function bestOf(row) { let best = -Infinity; for (const v of row) if (v > best) best = v; return best }
function firstBest(row) { let b = 0; for (let i = 1; i < row.length; i++) if (row[i] > row[b]) b = i; return b }

// Q: Map from hand id * 3 + rolls left to a Float64Array lined up with KEEPS[hand].
export function qRow(Q, h, r) {
  const key = h * 3 + r
  let row = Q.get(key)
  if (!row) { row = new Float64Array(KEEPS[h].length); Q.set(key, row) }
  return row
}
// ε-greedy over a row of values: returns an index into the row. Ties are broken at random, as Python's rng.choice(tied).
export function chooseIndex(row, epsilon, rng) {
  if (rng.random() < epsilon) return rng.randrange(row.length)
  const best = bestOf(row), tied = []
  for (let i = 0; i < row.length; i++) if (row[i] === best) tied.push(i)
  return tied[rng.randrange(tied.length)]
}
export const greedyKeep = (Q, h, r) => KEEPS[h][firstBest(qRow(Q, h, r))]

// onUpdate, if given, sees every update: { hand, rollsLeft, kept, reward, future, target, before, after, step }.
export function train(box, { episodes = 20000, alpha = 0.1, epsilon = 0.1, method = 'q', gamma = 1, seed = 0, every = 0, onUpdate } = {}) {
  const rng = new PyRandom(seed), Q = new Map(), N = new Map(), curve = []
  for (let episode = 0; episode < episodes; episode++) {
    let hand = handId(roll(5, rng)), rollsLeft = 2
    let kept = chooseIndex(qRow(Q, hand, rollsLeft), epsilon, rng)
    for (;;) {
      const next = rerollId(KEEPS[hand][kept], rng)
      let reward, future, nextKept
      if (rollsLeft === 1) { reward = SCORES[next][box]; future = 0 } else {
        reward = 0
        nextKept = chooseIndex(qRow(Q, next, rollsLeft - 1), epsilon, rng)
        const nextRow = qRow(Q, next, rollsLeft - 1)
        future = method === 'sarsa' ? nextRow[nextKept] : bestOf(nextRow)
      }
      const target = reward + gamma * future, row = qRow(Q, hand, rollsLeft)
      const key = `${hand}|${rollsLeft}|${kept}`
      N.set(key, (N.get(key) ?? 0) + 1)
      const step = alpha ?? 1 / N.get(key), before = row[kept]
      row[kept] = row[kept] + step * (target - row[kept])
      onUpdate?.({ hand, rollsLeft, kept: KEEPS[hand][kept], next, reward, future, target, before, after: row[kept], step, episode })
      if (rollsLeft === 1) break
      hand = next; kept = nextKept; rollsLeft -= 1
    }
    if (every && (episode + 1) % every === 0) curve.push(evaluate((h, r) => greedyKeep(Q, h, r), box))
  }
  return { Q, curve }
}

// W: Map from rolls left * 1000 + kept id to the learned value of having kept those dice.
export const afterValue = (W, r, k) => W.get(r * 1000 + k) ?? 0
export function chooseAfter(W, h, r, epsilon, rng) {
  const options = KEEPS[h]
  if (rng.random() < epsilon) return options[rng.randrange(options.length)]
  let best = -Infinity
  for (const k of options) if (afterValue(W, r, k) > best) best = afterValue(W, r, k)
  const tied = options.filter(k => afterValue(W, r, k) === best)
  return tied[rng.randrange(tied.length)]
}
export function greedyAfter(W, h, r) {
  const options = KEEPS[h]
  let best = options[0]
  for (const k of options) if (afterValue(W, r, k) > afterValue(W, r, best)) best = k
  return best
}
export function trainAfter(box, { episodes = 20000, alpha = null, epsilon = 0.1, seed = 0, every = 0, onUpdate } = {}) {
  const rng = new PyRandom(seed), W = new Map(), N = new Map(), curve = []
  for (let episode = 0; episode < episodes; episode++) {
    let hand = handId(roll(5, rng))
    for (const r of [2, 1]) {
      const kept = chooseAfter(W, hand, r, epsilon, rng)
      hand = rerollId(kept, rng)
      let target
      if (r === 1) target = SCORES[hand][box]
      else { target = -Infinity; for (const k of KEEPS[hand]) if (afterValue(W, 1, k) > target) target = afterValue(W, 1, k) }
      const key = r * 1000 + kept
      N.set(key, (N.get(key) ?? 0) + 1)
      const step = alpha ?? 1 / N.get(key), before = afterValue(W, r, kept)
      W.set(key, before + step * (target - before))
      onUpdate?.({ rollsLeft: r, kept, hand, target, before, after: W.get(key), step, episode })
    }
    if (every && (episode + 1) % every === 0) curve.push(evaluate((h, r) => greedyAfter(W, h, r), box))
  }
  return { W, curve }
}
export { HANDS }
