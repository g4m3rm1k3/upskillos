// The programs the Python tab can run: each an entry function in python/ with JSON arguments.
// watch: values looked up in the running functions (innermost first) to draw; the first expression
// that works wins. picture: which drawing. actions: a line containing one of these counts as "one
// move" for Next move. episodeEnd: lines that end one game (or one update), for the Next button.
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
const CART = ['self.world.state', 'env.world.state', 'self.state', 'env.state', 'state']

export const PROGRAMS = {
  rule: {
    label: '1.3 One game with a rule', file: 'experiments.py', module: 'experiments', function: 'play_rule', lesson: 'game-loop',
    about: 'One game of CartPole played by the rule "lean ahead": reset, then step after step until the pole falls or 500 steps pass. Step into env.step to watch the physics.',
    kwargs: () => ({ rule: 'lean_ahead', seed: 0 }), choices: { rule: ['lean_ahead', 'lean', 'random_push', 'always_left'] },
    watch: { cart: CART }, picture: 'cart', actions: ['env.step('],
    episodeEnd: () => [],
  },
  returns: {
    label: '1.5 The return of every step', file: 'experiments.py', module: 'experiments', function: 'game_returns', lesson: 'return-discount',
    about: 'Plays one game with the rule "lean", then works out the return G_t of every step, backwards from the end.',
    kwargs: () => ({ rule: 'lean', seed: 0, gamma: 0.9 }),
    watch: { cart: CART, rewards: ['rewards'], returns: ['returns'] }, picture: 'returns', actions: ['env.step('],
    episodeEnd: () => [],
  },
  gym: {
    label: '1.6 Same as Gymnasium?', file: 'gym_compare.py', module: 'gym_compare', function: 'compare', lesson: 'same-as-gymnasium',
    about: 'Plays this lab\'s CartPole and Gymnasium\'s side by side with the same pushes, and measures the largest difference in any number.',
    kwargs: () => ({ steps: 300, seed: 0 }),
    watch: { cart: ['state'] }, picture: 'cart', actions: ['ours.step('],
    episodeEnd: () => [],
  },
  binned: {
    label: '2.2 The binned world', file: 'experiments.py', module: 'experiments', function: 'play_binned', lesson: 'state-number',
    about: 'One game with the rule "lean ahead", in the binned world: every step\'s 4 numbers turned into one state number.',
    kwargs: () => ({ seed: 0 }),
    watch: { cart: CART, seen: ['seen'] }, picture: 'cart', actions: ['env.step('],
    episodeEnd: () => [],
  },
  q: {
    label: '3.4 Q-learning', file: 'qlearning.py', module: 'experiments', function: 'learn_q', lesson: 'q-learning-loop',
    about: 'Q-learning on the binned CartPole: ε-greedy pushes, and after each one Q[state, action] nudged towards reward + γ · max Q[next_state]. 500 games.',
    kwargs: () => ({ episodes: 500, seed: 0 }),
    watch: { Q: ['Q'], cart: CART, lengths: ['totals'] }, picture: 'qtable', actions: ['env.step('],
    knobs: [['alpha', 'α'], ['gamma', 'γ'], ['epsilon', 'ε']],
    episodeEnd: () => [['qlearning.py', lineOf('qlearning.py', 'totals.append(total)')]], endLabel: 'Next game',
  },
  sarsa: {
    label: '3.6 SARSA', file: 'sarsa.py', module: 'experiments', function: 'learn_sarsa', lesson: 'sarsa',
    about: 'SARSA on the binned CartPole: like Q-learning, but the target uses the next push actually chosen.',
    kwargs: () => ({ episodes: 500, seed: 0 }),
    watch: { Q: ['Q'], cart: CART, lengths: ['totals'] }, picture: 'qtable', actions: ['env.step('],
    knobs: [['alpha', 'α'], ['gamma', 'γ'], ['epsilon', 'ε']],
    episodeEnd: () => [['sarsa.py', lineOf('sarsa.py', 'totals.append(total)')]], endLabel: 'Next game',
  },
  neuron: {
    label: '4.1 One neuron learns', file: 'neuron.py', module: 'neuron', function: 'train', lesson: 'gradient-descent',
    about: 'Gradient descent on one neuron, w · x + b, learning the line through 4 points: work out the slopes, step against them, 200 times.',
    kwargs: () => ({}),
    watch: { w: ['w'], b: ['b'] }, picture: 'line', actions: ['b = b - rate * grad_b'], actionLabel: 'Next step',
    episodeEnd: () => [],
  },
  linear: {
    label: '4.4 REINFORCE, plain Python', file: 'linear_policy.py', module: 'linear_policy', function: 'train_linear', lesson: 'reinforce-plain',
    about: 'REINFORCE with a linear policy and no libraries: play a game sampling pushes from softmax(weights · state), then move the 8 weights.',
    kwargs: () => ({ episodes: 300, seed: 0 }),
    watch: { weights: ['weights'], cart: CART, lengths: ['lengths'] }, picture: 'weights', actions: ['env.step('],
    episodeEnd: () => [['linear_policy.py', lineOf('linear_policy.py', 'lengths.append(len(rewards))')]], endLabel: 'Next game',
  },
  autograd: {
    label: '4.5 PyTorch\'s autograd', file: 'torch_neuron.py', module: 'torch_neuron', function: 'autograd_check', lesson: 'pytorch',
    about: 'The neuron of 4.1 in PyTorch: autograd\'s gradients beside the formula\'s.',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  reinforce: {
    label: '4.6 REINFORCE with a network', file: 'reinforce.py', module: 'reinforce', function: 'train_reinforce', lesson: 'reinforce-torch',
    about: 'REINFORCE in PyTorch: a 4 → 32 → 2 network; one game, then one Adam step on −mean(log π(a|s) · normalised return).',
    kwargs: () => ({ episodes: 300, seed: 0 }),
    watch: { net: ['net'], cart: CART, lengths: ['lengths'] }, picture: 'network', actions: ['env.step('],
    episodeEnd: () => [['reinforce.py', lineOf('reinforce.py', 'optimizer.step()')]], endLabel: 'Next update',
  },
  a2c: {
    label: '5.3 A2C', file: 'a2c.py', module: 'a2c', function: 'train_a2c', lesson: 'a2c-rollout',
    about: 'Advantage actor–critic: 8 CartPoles played 5 steps each, then one gradient step on the actor and the critic together.',
    kwargs: () => ({ updates: 5000, seed: 0 }),
    watch: { net: ['net'], states: ['states'], lengths: ['lengths'] }, picture: 'carts', actions: ['env.step('],
    episodeEnd: () => [['a2c.py', lineOf('a2c.py', 'optimizer.step()')]], endLabel: 'Next update',
  },
  a2c_check: {
    label: '5.5 A2C gradient check', file: 'a2c_check.py', module: 'a2c_check', function: 'check_gradients', lesson: 'gradient-check',
    about: 'One small batch: PyTorch\'s autograd gradient beside the formula derived by hand.',
    kwargs: () => ({}), watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  dqn: {
    label: '6.3 DQN', file: 'dqn.py', module: 'dqn', function: 'train_dqn', lesson: 'dqn-loop',
    about: 'Deep Q-learning: a network in place of the table, a replay buffer of past moves, and a target network refreshed every 1,000 moves.',
    kwargs: () => ({ steps: 50000, seed: 0 }),
    watch: { net: ['net'], cart: CART, lengths: ['lengths'] }, picture: 'network', actions: ['env.step('],
    knobs: [['epsilon', 'ε']],
    episodeEnd: () => [['dqn.py', lineOf('dqn.py', 'optimizer.step()')]], endLabel: 'Next update',
  },
}
