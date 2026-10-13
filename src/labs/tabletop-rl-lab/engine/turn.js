// python/turn.py and python/exact.py in JavaScript, exactly, with hands and kept dice numbered so the
// planner is fast: KEPT lists every different set of kept dice (462), KEEPS[h] the ones hand h allows,
// in the order Python's keeps() lists them, OUTCOMES[k] where keeping KEPT[k] can lead.
import { HANDS, SCORES, roll, sorted, keyOf, handId } from './dice.js'
import { outcomes, handProbability } from './probability.js'

export function keeps(hand) {
  const found = [], seen = new Set()
  for (let mask = 0; mask < 32; mask++) {
    const kept = []
    for (let i = 0; i < 5; i++) if (mask & (1 << i)) kept.push(hand[i])
    const k = keyOf(kept)
    if (!seen.has(k)) { seen.add(k); found.push(kept) }
  }
  return found
}
export const reroll = (kept, rng) => sorted([...kept, ...roll(5 - kept.length, rng)])

export const KEPT = [], KEPT_ID = new Map()
export const KEEPS = HANDS.map(hand => keeps(hand).map(kept => {
  const k = keyOf(kept)
  if (!KEPT_ID.has(k)) { KEPT_ID.set(k, KEPT.length); KEPT.push(kept) }
  return KEPT_ID.get(k)
}))
export const keptId = kept => KEPT_ID.get(keyOf(sorted(kept)))
export const OUTCOMES = KEPT.map(kept => outcomes(kept))
const START = HANDS.map(handProbability)

export function expected(k, V) {
  let total = 0
  for (const { id, chance } of OUTCOMES[k]) total += chance * V[id]
  return total
}
// Q[h] is a Float64Array lined up with KEEPS[h].
export function backup(V) {
  const E = new Float64Array(KEPT.length).fill(NaN), Q = [], next = new Float64Array(HANDS.length)
  for (let h = 0; h < HANDS.length; h++) {
    const ks = KEEPS[h], row = new Float64Array(ks.length)
    let best = -Infinity
    for (let i = 0; i < ks.length; i++) {
      if (Number.isNaN(E[ks[i]])) E[ks[i]] = expected(ks[i], V)
      row[i] = E[ks[i]]
      if (row[i] > best) best = row[i]
    }
    Q.push(row); next[h] = best
  }
  return [next, Q]
}
export function solveFrom(V0) {
  const [V1, Q1] = backup(V0), [V2, Q2] = backup(V1)
  return { V: [V0, V1, V2], Q: [null, Q1, Q2] }
}
export const finalValues = box => Float64Array.from(SCORES, row => row[box])
export const solve = box => solveFrom(finalValues(box))
export function startValue(V2) {
  let total = 0
  for (let h = 0; h < HANDS.length; h++) total += START[h] * V2[h]
  return total
}
// The first biggest, as Python's max(row, key=row.get): returns a kept-dice id.
export function bestIndex(row) {
  let best = 0
  for (let i = 1; i < row.length; i++) if (row[i] > row[best]) best = i
  return best
}
export const bestKeep = (Q, rollsLeft, h) => KEEPS[h][bestIndex(Q[rollsLeft][h])]
// choose(handId, rollsLeft) → kept id.
export function evaluate(choose, box) {
  let V = finalValues(box)
  for (const r of [1, 2]) {
    const next = new Float64Array(HANDS.length)
    for (let h = 0; h < HANDS.length; h++) next[h] = expected(choose(h, r), V)
    V = next
  }
  return startValue(V)
}
export { handId }
