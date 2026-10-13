// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  dice: {
    label: '1.1 Roll five dice', file: 'dice.py', module: 'dice', function: 'show_rolls',
    about: 'Five rolls from seed 0: each roll as a list, sorted into a hand, and counted.',
    kwargs: () => ({ rolls: 5, seed: 0 }), choices: { seed: [0, 1, 2, 42] },
    watch: { hand: ['hand'] }, picture: 'hand', actions: ['print(dice, "sorted:"'], actionLabel: 'Next roll', actionTitle: 'Run until the next roll is printed', episodeEnd: () => [],
  },
  scores: {
    label: '1.2 Score a full house', file: 'scoring.py', module: 'scoring', function: 'show_scores',
    about: 'The hand (2, 2, 3, 3, 3) scored in all 13 boxes by `score`.',
    kwargs: () => ({ hand: [2, 2, 3, 3, 3] }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  chase: {
    label: '1.7 The Markov chain', file: 'probability.py', module: 'probability', function: 'chase_yahtzee',
    about: 'The transition matrix by counting, then the distribution pushed through two rerolls: the exact chance of a Yahtzee when chasing.',
    kwargs: () => ({}), watch: { dist: ['dist'] }, picture: 'dist', actions: ['dist = new'], actionLabel: 'Next roll', actionTitle: 'Run until the distribution has moved one roll', episodeEnd: () => [],
  },
  simulate: {
    label: '1.6 Estimate by simulation', file: 'simulate.py', module: 'simulate', function: 'estimate',
    about: '2,000 chasing turns with real (pseudo-random) dice, counting the Yahtzees.',
    kwargs: () => ({ turns: 2000, seed: 0 }), choices: { turns: [100, 2000, 10000], seed: [0, 1, 2] },
    watch: { hand: ['hand'] }, picture: 'hand', actions: ['if chase_turn(rng):'], actionLabel: 'Next turn', actionTitle: 'Run until the next turn has been played', episodeEnd: () => [],
  },
  exact: {
    label: '2.4 Solve every box exactly', file: 'exact.py', module: 'exact', function: 'best_for_every_box',
    about: 'Backward induction for each of the 13 boxes: two backups each, then the average over the first roll.',
    kwargs: () => ({}), watch: {}, picture: null, actions: ['print(BOXES[box]'], actionLabel: 'Next box', actionTitle: 'Run until the next box is solved', episodeEnd: () => [],
  },
  learn: {
    label: '3.3 Q-learning on Sixes', file: 'learn.py', module: 'learn', function: 'train',
    about: 'Q-learning for the Sixes box: ε-greedy keeps, and after each one Q moved toward reward + max Q(next). The greedy policy is graded exactly every 500 turns.',
    kwargs: () => ({ box: 5, episodes: 2000, every: 500, seed: 0 }), choices: { box: [5, 9, 12, 11], method: ['q', 'sarsa'] },
    knobs: [['alpha', 'α'], ['epsilon', 'ε']],
    watch: { curve: ['curve'], hand: ['hand'] }, picture: 'curve', actions: ['row[kept] = row[kept] + step'], actionLabel: 'Next update', actionTitle: 'Run until the next value is updated',
    episodeEnd: () => [['learn.py', lineOf('learn.py', 'if every and (episode + 1) % every == 0:')]], endLabel: 'Next turn',
  },
  after: {
    label: '3.7 Afterstates on Sixes', file: 'learn.py', module: 'learn', function: 'train_after',
    about: 'The afterstate learner: one value per set of kept dice, step 1/n. Graded exactly every 500 turns.',
    kwargs: () => ({ box: 5, episodes: 2000, every: 500, seed: 0 }), choices: { box: [5, 9, 12, 11] },
    watch: { curve: ['curve'], hand: ['hand'] }, picture: 'curve', actions: ['W[key] = after_value('], actionLabel: 'Next update', actionTitle: 'Run until the next value is updated',
    episodeEnd: () => [['learn.py', lineOf('learn.py', 'curve.append(evaluate(lambda h, r: greedy_after(W, h, r), box))') - 1]], endLabel: 'Next turn',
  },
  match: {
    label: '4.3 Chaser against Planner', file: 'players.py', module: 'players', function: 'match',
    about: 'Three games each, on the same dice: the Chaser\'s rule against the Planner\'s exact turns.',
    kwargs: () => ({ games: 3, seed: 0 }), watch: { hand: ['hand'] }, picture: 'hand', actions: ['card = write(card, hand, box)'], actionLabel: 'Next turn', actionTitle: 'Run until the next box is written', episodeEnd: () => [],
  },
  stats: {
    label: '4.4 Planner − Chaser, with error bars', file: 'stats.py', module: 'stats', function: 'planner_vs_chaser',
    about: '50 paired games: the average difference and its standard error.',
    kwargs: () => ({ games: 50, seed: 0 }), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  td: {
    label: '4.7 TD(0) on scorecards', file: 'afterstate.py', module: 'afterstate', function: 'train',
    about: 'The Planner plays with a linear value of the card left; after every turn each weight moves by α × δ × its feature.',
    kwargs: () => ({ games: 20, seed: 0 }), choices: { bonus: [false, true] }, knobs: [['alpha', 'α']],
    watch: { weights: ['weights'] }, picture: 'weights', actions: ['weights[i] += alpha * error * x[i]'], actionLabel: 'Next weight', actionTitle: 'Run until the next weight changes',
    episodeEnd: () => [['afterstate.py', lineOf('afterstate.py', 'card = next_card')]], endLabel: 'Next turn',
  },
}
