// The Workshop's background work: TD(0) training (afterstate.py's train, step by step, reporting
// progress) and paired grading of two players on the same seeds.
import { PyRandom, roll } from './dice.js'
import { newCard, playTurn, points, write, value, features, playGame } from './game.js'
import { makePlayer } from '../players.js'

self.onmessage = ({ data }) => {
  try {
    if (data.cmd === 'train') {
      const { games, alpha, bonus, seed } = data.config
      const weights = Array(features(newCard(), bonus).length).fill(0)
      const planner = makePlayer({ kind: 'learned', weights, bonus }), rng = new PyRandom(seed)
      for (let g = 0; g < games; g++) {
        let card = newCard()
        for (let t = 0; t < 13; t++) {
          const hand = playTurn(planner, card, roll(15, rng)), box = planner.box(card, hand)
          const reward = points(card, hand, box), next = write(card, hand, box)
          const error = reward + value(weights, next, bonus) - value(weights, card, bonus), x = features(card, bonus)
          for (let i = 0; i < weights.length; i++) weights[i] += alpha * error * x[i]
          card = next
        }
        if ((g + 1) % 25 === 0 || g + 1 === games) self.postMessage({ type: 'progress', games: g + 1, weights: [...weights] })
      }
      self.postMessage({ type: 'trained', weights })
    }
    if (data.cmd === 'compare') {
      const a = makePlayer(data.a), b = makePlayer(data.b), sa = [], sb = []
      for (let g = 0; g < data.games; g++) {
        sa.push(playGame(a, new PyRandom(data.seed + g))); sb.push(playGame(b, new PyRandom(data.seed + g)))
        if ((g + 1) % 50 === 0) self.postMessage({ type: 'progress', games: g + 1 })
      }
      self.postMessage({ type: 'compared', a: sa, b: sb })
    }
  } catch (error) { self.postMessage({ type: 'error', message: error.message }) }
}
