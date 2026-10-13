// python/dice.py and python/scoring.py in JavaScript, exactly: the same dice from the same seed
// (PyRandom is Python's random.Random), the same 252 hands in the same order, the same scores.
export { PyRandom } from '../../qmaze-lab/engine/mt.js'

export const FACES = [1, 2, 3, 4, 5, 6]
// random.randint(1, 6) is 1 + _randbelow(6), which is PyRandom.randrange(6).
export function roll(n, rng) {
  const dice = []
  for (let i = 0; i < n; i++) dice.push(1 + rng.randrange(6))
  return dice
}
export function countsOf(hand) {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const die of hand) counts[die]++
  return counts
}
export const sorted = dice => [...dice].sort((a, b) => a - b)
export const keyOf = dice => dice.join('')

export const HANDS = []
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) for (let c = b; c <= 6; c++) for (let d = c; d <= 6; d++) for (let e = d; e <= 6; e++) HANDS.push([a, b, c, d, e])
export const HAND_ID = new Map(HANDS.map((h, i) => [keyOf(h), i]))
export const handId = hand => HAND_ID.get(keyOf(sorted(hand)))

export const BOXES = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Three of a kind', 'Four of a kind', 'Full house', 'Small straight', 'Large straight', 'Yahtzee', 'Chance']
export const HINTS = ['Count the ones', 'Count the twos', 'Count the threes', 'Count the fours', 'Count the fives', 'Count the sixes', '3 alike · sum of all dice', '4 alike · sum of all dice', '3 + 2 alike · 25', '4 in a row · 30', '5 in a row · 40', '5 alike · 50', 'Sum of all dice']

export function hasRun(counts, length) {
  for (let start = 1; start < 8 - length; start++) {
    let run = true
    for (let face = start; face < start + length; face++) if (counts[face] === 0) run = false
    if (run) return true
  }
  return false
}
export function score(hand, box) {
  const counts = countsOf(hand), total = hand.reduce((a, b) => a + b, 0), most = Math.max(...counts)
  if (box < 6) return (box + 1) * counts[box + 1]
  if (box === 6) return most >= 3 ? total : 0
  if (box === 7) return most >= 4 ? total : 0
  if (box === 8) return counts.includes(3) && counts.includes(2) ? 25 : 0
  if (box === 9) return hasRun(counts, 4) ? 30 : 0
  if (box === 10) return hasRun(counts, 5) ? 40 : 0
  if (box === 11) return most === 5 ? 50 : 0
  return total
}
// Every hand's score in every box, computed once: SCORES[handId][box].
export const SCORES = HANDS.map(h => Array.from({ length: 13 }, (_, box) => score(h, box)))
