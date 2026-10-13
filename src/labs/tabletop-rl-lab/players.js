// The players the lab offers (figures, the Table and the Workshop), built from the engine: the
// Chaser, the one-turn Planner, and Planners with learned card values (supplied in
// engine/measured.json, or trained in the Workshop).
import { Chaser, Planner, value } from './engine/game.js'
import M from './engine/measured.json'

export const SUPPLIED = [
  { id: 'chaser', name: 'Chaser', kind: 'rule', about: 'Keeps its biggest group; writes the most points now.' },
  { id: 'planner', name: 'Planner', kind: 'planner', about: 'Solves each turn exactly for points now; no value for the future.' },
  { id: 'boxes', name: 'Learner', kind: 'learned', weights: M.players.boxes.weights, bonus: false, about: 'Planner + a value of the card left: 13 weights learned by TD(0) in 5,000 games.' },
  { id: 'bonus', name: 'Bonus learner', kind: 'learned', weights: M.players.bonus.weights, bonus: true, about: 'The Learner with 6 more features for the upper bonus.' },
]
export function makePlayer(spec) {
  if (spec.kind === 'rule') return new Chaser()
  if (spec.kind === 'planner') return new Planner()
  return new Planner(card => value(spec.weights, card, spec.bonus))
}
export const supplied = id => SUPPLIED.find(p => p.id === id)
