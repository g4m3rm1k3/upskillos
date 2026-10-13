// Measures what the lessons say about whole games and records it in engine/measured.json, with the
// learned weights of the supplied players. Every number comes from the engine, which equals the
// Python programs (engine/parity.test.js). Takes about two minutes:
//   node src/labs/tabletop-rl-lab/tools/measure.mjs
import { writeFileSync } from 'node:fs'
import { Chaser, Planner, playGame, trainValue, value, total, mean, std, standardError } from '../engine/game.js'
import { PyRandom } from '../engine/dice.js'
import { train, trainAfter } from '../engine/learn.js'
import { solve, startValue } from '../engine/turn.js'

const EVAL_SEED = 1000000, EVAL_GAMES = 2000, CURVE_AT = [10, 25, 50, 100, 250, 500, 1000, 2000, 3000, 5000], round = (x, d = 3) => Number(x.toFixed(d))
// Every evaluation game's final card, so the summary can say where the points came from.
function playGames(player, games, seed) {
  const cards = []
  for (let g = 0; g < games; g++) { let card; playGame(player, new PyRandom(seed + g), t => { card = t.card }); cards.push(card) }
  return cards
}
const totals = cards => cards.map(total)
function summary(cards) {
  const scores = totals(cards)
  const histogram = Array(17).fill(0)
  for (const s of scores) histogram[Math.min(16, Math.floor(s / 25))]++
  const boxes = Array.from({ length: 13 }, (_, b) => round(mean(cards.map(c => c.boxes[b])), 2))
  return {
    mean: round(mean(scores)), sd: round(std(scores)), se: round(standardError(scores)), min: Math.min(...scores), max: Math.max(...scores), histogram, boxes,
    bonusRate: round(cards.filter(c => c.upper >= 63).length / cards.length, 4), yahtzeeRate: round(cards.filter(c => c.boxes[11] === 50).length / cards.length, 4),
    extra: round(mean(cards.map(c => c.extra)), 4), upper: round(mean(cards.map(c => c.upper)), 2),
  }
}
const learned = (weights, bonus) => new Planner(card => value(weights, card, bonus))
const out = { evalSeed: EVAL_SEED, evalGames: EVAL_GAMES, players: {}, curves: {}, paired: {}, turn: {} }
// One turn, one box: every learner for 50,000 turns, judged exactly every 5,000 (seed 0, ε 0.1).
for (const box of [5, 9, 12, 11, 8]) {
  const rec = out.turn[box] = { optimum: round(startValue(solve(box).V[2]), 4) }
  for (const [id, run] of [
    ['q', () => train(box, { episodes: 50000, alpha: 0.1, every: 5000 })], ['qAvg', () => train(box, { episodes: 50000, alpha: null, every: 5000 })],
    ['sarsa', () => train(box, { episodes: 50000, alpha: 0.1, method: 'sarsa', every: 5000 })], ['sarsaAvg', () => train(box, { episodes: 50000, alpha: null, method: 'sarsa', every: 5000 })],
    ['after', () => trainAfter(box, { episodes: 50000, alpha: 0.1, every: 5000 })], ['afterAvg', () => trainAfter(box, { episodes: 50000, alpha: null, every: 5000 })],
  ]) { const r = run(); rec[id] = r.curve.map(x => round(x, 4)); rec[`${id}Size`] = (r.Q ? [...r.Q.values()].reduce((n, row) => n + row.length, 0) : r.W.size) }
  console.log(box, JSON.stringify(rec))
}
const scores = {}
for (const [id, player] of [['chaser', new Chaser()], ['planner', new Planner()]]) {
  scores[id] = playGames(player, EVAL_GAMES, EVAL_SEED)
  out.players[id] = summary(scores[id])
  console.log(id, out.players[id].mean)
}
for (const [id, bonus, games] of [['boxes', false, 5000], ['bonus', true, 5000]]) {
  const curve = []
  const { weights } = trainValue({ games, alpha: 0.01, bonus, seed: 0, onGame: (g, w) => { if (CURVE_AT.includes(g + 1)) curve.push([g + 1, round(mean(totals(playGames(learned(w, bonus), 500, EVAL_SEED))), 2)]) } })
  scores[id] = playGames(learned(weights, bonus), EVAL_GAMES, EVAL_SEED)
  out.players[id] = { ...summary(scores[id]), weights: weights.map(w => round(w, 6)), bonus, games, alpha: 0.01, seed: 0 }
  out.curves[id] = curve
  console.log(id, out.players[id].mean, JSON.stringify(curve))
}
// Paired against independent: the same 2000 seeds for both players.
for (const [a, b] of [['bonus', 'boxes'], ['planner', 'chaser'], ['boxes', 'planner']]) {
  const d = totals(scores[a]).map((x, i) => x - totals(scores[b])[i])
  out.paired[`${a}-${b}`] = { mean: round(mean(d)), sePaired: round(standardError(d)), seIndependent: round(Math.sqrt(standardError(totals(scores[a])) ** 2 + standardError(totals(scores[b])) ** 2)), wins: d.filter(x => x > 0).length, ties: d.filter(x => x === 0).length }
  console.log(a, b, out.paired[`${a}-${b}`])
}
writeFileSync(new URL('../engine/measured.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
