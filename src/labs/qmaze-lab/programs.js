// The programs the Python tab can run, each an entry function in python/ with JSON arguments.
// watch: values the tab looks for in the running functions (innermost first), to draw on the map.
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1

export const PROGRAMS = {
  play: {
    label: 'Random play (1.3)', file: 'play.py', module: 'play', function: 'play_random',
    about: 'One episode with an agent that moves at random: the agent–environment loop on its own.',
    kwargs: map => ({ name: map, seed: 7 }), maps: 'all',
    watch: { state: ['state'], trail: ['trail'] },
    episodeEnd: () => [],
  },
  plan: {
    label: 'Value iteration (2.5)', file: 'planning.py', module: 'experiments', function: 'plan',
    about: 'Computes V* and Q* exactly from the transition table P, sweep by sweep.',
    kwargs: map => ({ name: map, gamma: 0.95 }), maps: 'all',
    watch: { V: ['V'], Q: ['Q'], state: ['state'] },
    episodeEnd: () => [['planning.py', lineOf('planning.py', 'if biggest_change < theta')]],
  },
  gym: {
    label: 'Gymnasium check (2.6)', file: 'gym_compare.py', module: 'gym_compare', function: 'compare_all',
    about: 'Compares this lab\'s transition tables with Gymnasium\'s own FrozenLake and CliffWalking, state by state and action by action.',
    kwargs: () => ({}), maps: 'none',
    watch: {},
    episodeEnd: () => [],
  },
  q: {
    label: 'Q-learning (3.5)', file: 'qlearning.py', module: 'experiments', function: 'learn_q',
    about: 'Q-learning: ε-greedy moves, and after each one Q[state, action] nudged towards reward + γ · max Q[next_state].',
    kwargs: map => ({ name: map, episodes: 300, seed: 0 }), maps: 'all',
    watch: { Q: ['Q'], state: ['state'], totals: ['totals'] },
    knobs: [['alpha', 'α'], ['gamma', 'γ'], ['epsilon', 'ε']],
    episodeEnd: () => [['qlearning.py', lineOf('qlearning.py', 'totals.append(total)')]],
  },
  sarsa: {
    label: 'SARSA (3.7)', file: 'sarsa.py', module: 'experiments', function: 'learn_sarsa',
    about: 'SARSA: like Q-learning, but the target uses the next action actually chosen.',
    kwargs: map => ({ name: map, episodes: 300, seed: 0 }), maps: 'all',
    watch: { Q: ['Q'], state: ['state'], totals: ['totals'] },
    knobs: [['alpha', 'α'], ['gamma', 'γ'], ['epsilon', 'ε']],
    episodeEnd: () => [['sarsa.py', lineOf('sarsa.py', 'totals.append(total)')]],
  },
  a2c: {
    label: 'A2C (4.4)', file: 'a2c.py', module: 'a2c', function: 'train_a2c',
    about: 'Advantage actor–critic in PyTorch: 8 copies of the map played in step, 5 moves each, then one gradient step on the actor and the critic.',
    kwargs: map => ({ name: map, updates: 1500, seed: 0 }), maps: 'all',
    watch: { net: ['net'], states: ['states'], totals: ['totals'] },
    episodeEnd: () => [['a2c.py', lineOf('a2c.py', 'optimizer.step()')]],
    endLabel: 'Next update',
  },
  a2c_hidden: {
    label: 'A2C with a hidden layer (4.6)', file: 'a2c.py', module: 'a2c', function: 'train_a2c',
    about: 'The same A2C with a 32-unit hidden layer (hidden=32, lr=0.01). The policy can no longer be read off the weights, so the map shows only the 8 copies.',
    kwargs: map => ({ name: map, updates: 1500, seed: 0, hidden: 32, lr: 0.01 }), maps: 'all',
    watch: { net: ['net'], states: ['states'], totals: ['totals'] },
    episodeEnd: () => [['a2c.py', lineOf('a2c.py', 'optimizer.step()')]],
    endLabel: 'Next update',
  },
  a2c_check: {
    label: 'A2C gradient check (4.3)', file: 'a2c_check.py', module: 'a2c_check', function: 'check_gradients',
    about: 'One small batch: PyTorch\'s autograd gradient beside the formula derived by hand.',
    kwargs: () => ({}), maps: 'none', watch: {}, episodeEnd: () => [],
  },
}
