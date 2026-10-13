// python/game.py, python/players.py and python/afterstate.py in JavaScript, exactly.
import { SCORES, HANDS, PyRandom, roll, countsOf, handId, score, sorted } from './dice.js'
import { KEEPS, KEPT, solveFrom, bestKeep } from './turn.js'

export const newCard = () => ({ boxes: Array(13).fill(null), upper: 0, extra: 0 })
export const isJoker = (card, hand) => Math.max(...countsOf(hand)) === 5 && card.boxes[11] !== null
export function legalBoxes(card, hand) {
  const open = []
  for (let b = 0; b < 13; b++) if (card.boxes[b] === null) open.push(b)
  if (!isJoker(card, hand)) return open
  const upper = hand[0] - 1
  if (card.boxes[upper] === null) return [upper]
  const lower = open.filter(b => b >= 6)
  return lower.length ? lower : open
}
export function points(card, hand, box) {
  let gained = score(hand, box)
  const joker = isJoker(card, hand)
  if (joker && box >= 8 && box <= 10) gained = [25, 30, 40][box - 8]
  if (box < 6 && card.upper < 63 && 63 <= card.upper + gained) gained += 35
  if (joker && card.boxes[11] === 50) gained += 100
  return gained
}
export function write(card, hand, box) {
  const boxes = [...card.boxes], joker = isJoker(card, hand)
  boxes[box] = score(hand, box)
  if (joker && box >= 8 && box <= 10) boxes[box] = [25, 30, 40][box - 8]
  return { boxes, upper: card.upper + (box < 6 ? boxes[box] : 0), extra: card.extra + (joker && card.boxes[11] === 50 ? 1 : 0) }
}
export function total(card) {
  let boxes = 0
  for (const p of card.boxes) if (p !== null) boxes += p
  return boxes + (card.upper >= 63 ? 35 : 0) + 100 * card.extra
}
// dice: this turn's 15 dice. onKeep, if given, sees each decision.
export function playTurn(player, card, dice, onKeep) {
  player.startTurn(card)
  let hand = sorted(dice.slice(0, 5))
  for (const rollsLeft of [2, 1]) {
    const kept = player.keep(card, hand, rollsLeft)
    const start = 15 - 5 * rollsLeft
    onKeep?.({ hand, rollsLeft, kept })
    hand = sorted([...kept, ...dice.slice(start, start + 5 - kept.length)])
  }
  return hand
}
export function playGame(player, rng, onTurn) {
  let card = newCard()
  for (let turn = 0; turn < 13; turn++) {
    const dice = roll(15, rng), hand = playTurn(player, card, dice)
    const box = player.box(card, hand), before = card
    card = write(card, hand, box)
    onTurn?.({ turn, dice, hand, box, before, card, gained: points(before, hand, box) })
  }
  return total(card)
}
export const playGames = (player, games, seed = 0) => Array.from({ length: games }, (_, g) => playGame(player, new PyRandom(seed + g)))

export class Chaser {
  startTurn() {}
  keep(card, hand) { const counts = countsOf(hand), face = counts.indexOf(Math.max(...counts)); return Array(counts[face]).fill(face) }
  box(card, hand) {
    let best = null
    for (const b of legalBoxes(card, hand)) if (best === null || points(card, hand, b) > points(card, hand, best)) best = b
    return best
  }
}
export class Planner {
  constructor(value = null) { this.value = value }
  worth(card, hand, box) {
    const gained = points(card, hand, box)
    if (!this.value) return gained
    const key = box * 1000 + gained
    if (!this.after.has(key)) this.after.set(key, this.value(write(card, hand, box)))
    return gained + this.after.get(key)
  }
  startTurn(card) {
    this.card = card; this.after = new Map()
    const V0 = new Float64Array(HANDS.length)
    for (let h = 0; h < HANDS.length; h++) {
      let best = -Infinity
      for (const b of legalBoxes(card, HANDS[h])) { const w = this.worth(card, HANDS[h], b); if (w > best) best = w }
      V0[h] = best
    }
    Object.assign(this, solveFrom(V0))
  }
  keep(card, hand, rollsLeft) { return KEPT[bestKeep(this.Q, rollsLeft, handId(hand))] }
  // The values behind a keep decision: every keep of this hand with its expected worth, best first.
  keepValues(hand, rollsLeft) { const h = handId(hand), row = this.Q[rollsLeft][h]; return KEEPS[h].map((k, i) => ({ kept: KEPT[k], value: row[i] })).sort((a, b) => b.value - a.value) }
  box(card, hand) {
    let best = null, bestWorth = -Infinity
    for (const b of legalBoxes(card, hand)) { const w = this.worth(card, hand, b); if (w > bestWorth) { best = b; bestWorth = w } }
    return best
  }
}

export const BANDS = [[-99, -10], [-10, -4], [-4, 0], [0, 4], [4, 10], [10, 99]]
export function features(card, bonus = false) {
  const x = card.boxes.map(p => p === null ? 1 : 0)
  if (bonus) {
    const openUpper = [0, 1, 2, 3, 4, 5].filter(b => card.boxes[b] === null)
    const need = Math.max(0, 63 - card.upper)
    let par = 0
    for (const b of openUpper) par += 3 * (b + 1)
    const chasing = card.upper < 63 && openUpper.length > 0
    for (const [low, high] of BANDS) x.push(chasing && low <= par - need && par - need < high ? 1 : 0)
  }
  return x
}
export function value(weights, card, bonus = false) {
  const x = features(card, bonus)
  let total = 0
  for (let i = 0; i < weights.length; i++) total += weights[i] * x[i]
  return total
}
export const FEATURE_NAMES = ['Ones open', 'Twos open', 'Threes open', 'Fours open', 'Fives open', 'Sixes open', 'Three of a kind open', 'Four of a kind open', 'Full house open', 'Small straight open', 'Large straight open', 'Yahtzee open', 'Chance open', 'Bonus: far behind par (< −10)', 'Bonus: behind par (−10 … −5)', 'Bonus: just behind par (−4 … −1)', 'Bonus: on par (0 … 3)', 'Bonus: ahead of par (4 … 9)', 'Bonus: well ahead (≥ 10)']
// onGame(game, weights) after every game, if given; return false from it to stop early.
export function trainValue({ games = 1000, alpha = 0.01, bonus = false, seed = 0, onGame, onTurn } = {}) {
  const weights = Array(features(newCard(), bonus).length).fill(0)
  const planner = new Planner(card => value(weights, card, bonus)), rng = new PyRandom(seed), history = []
  for (let game = 0; game < games; game++) {
    let card = newCard()
    for (let turn = 0; turn < 13; turn++) {
      const hand = playTurn(planner, card, roll(15, rng)), box = planner.box(card, hand)
      const reward = points(card, hand, box), next = write(card, hand, box)
      const before = value(weights, card, bonus), after = value(weights, next, bonus)
      const error = reward + after - before, x = features(card, bonus)
      onTurn?.({ game, turn, card, hand, box, reward, next, before, after, error, x, weights: [...weights] })
      for (let i = 0; i < weights.length; i++) weights[i] += alpha * error * x[i]
      card = next
    }
    history.push([...weights])
    if (onGame?.(game, weights) === false) break
  }
  return { weights, history }
}

export const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
export function std(xs) { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) }
export const standardError = xs => std(xs) / Math.sqrt(xs.length)
export function compare(a, b, games = 200, seed = 0) {
  const sa = playGames(a, games, seed), sb = playGames(b, games, seed), d = sa.map((x, i) => x - sb[i])
  return { a: sa, b: sb, mean: mean(d), se: standardError(d), seA: standardError(sa), seB: standardError(sb) }
}
