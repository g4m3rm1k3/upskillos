// python/probability.py and python/simulate.py in JavaScript, exactly.
import { FACES, HANDS, countsOf, roll, sorted, keyOf, HAND_ID, PyRandom } from './dice.js'

const FACTORIAL = [1, 1, 2, 6, 24, 120]
export function ways(hand) {
  const counts = countsOf(hand)
  let result = FACTORIAL[hand.length]
  for (const face of FACES) result = Math.floor(result / FACTORIAL[counts[face]])
  return result
}
export const handProbability = hand => ways(hand) / 6 ** hand.length
export function multisets(n, low = 1) {
  if (n === 0) return [[]]
  const result = []
  for (let face = low; face < 7; face++) for (const rest of multisets(n - 1, face)) result.push([face, ...rest])
  return result
}
// Python's list of (hand, chance), with each hand also as its index into HANDS.
export function outcomes(kept) {
  const n = 5 - kept.length
  return multisets(n).map(rolled => { const hand = sorted([...kept, ...rolled]); return { hand, id: HAND_ID.get(keyOf(hand)), chance: handProbability(rolled) } })
}
export function chaseMatrix() {
  const P = Array.from({ length: 6 }, () => [0, 0, 0, 0, 0, 0])
  for (let k = 1; k < 6; k++) for (const { hand, chance } of outcomes(Array(k).fill(1))) P[k][Math.max(...countsOf(hand))] += chance
  return P
}
// The distribution of the biggest group after each roll: [after roll 1, after roll 2, after roll 3].
export function chaseSteps() {
  let dist = [0, 0, 0, 0, 0, 0]
  for (const hand of HANDS) dist[Math.max(...countsOf(hand))] += handProbability(hand)
  const P = chaseMatrix(), steps = [dist]
  for (let r = 0; r < 2; r++) {
    const next = [0, 0, 0, 0, 0, 0]
    for (let k = 1; k < 6; k++) for (let j = 1; j < 6; j++) next[j] += dist[k] * P[k][j]
    dist = next; steps.push(dist)
  }
  return steps
}
export const chaseYahtzee = () => chaseSteps()[2]

export function chaseTurn(rng) {
  let hand = roll(5, rng)
  for (let r = 0; r < 2; r++) {
    const counts = countsOf(hand), face = counts.indexOf(Math.max(...counts))
    const kept = Array(counts[face]).fill(face)
    hand = [...kept, ...roll(5 - kept.length, rng)]
  }
  return Math.max(...countsOf(hand)) === 5
}
export function estimate(turns, seed = 0) {
  const rng = new PyRandom(seed)
  let yahtzees = 0
  for (let t = 0; t < turns; t++) if (chaseTurn(rng)) yahtzees++
  return yahtzees / turns
}
export const spread = (turns, seeds = 20) => Array.from({ length: seeds }, (_, seed) => estimate(turns, seed))
