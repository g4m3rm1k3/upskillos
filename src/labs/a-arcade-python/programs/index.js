// The programs this lab steps through, in three groups:
// - the learner's real Q-Arcade code: Chapter 1–2 Q-learning and Chapter 4's A2C reference, unchanged;
// - the same code as short runs, which finish in seconds;
// - concept programs: small single-file programs that each show one idea, in learning order.
// Each says where it starts (entry), what to show (watch: expressions looked up in the running
// functions, innermost first), how to picture it (view), and which call counts as one move for
// "Next action" (actions: a line containing one of these has just run).
import * as qExplain from '../explain/q.js'
import * as a2cExplain from '../explain/a2c.js'
import * as conceptExplain from '../explain/concepts.js'

const raw = import.meta.glob('./*/*.py', { query: '?raw', import: 'default', eager: true })
const filesOf = (dir, only) => Object.fromEntries(Object.entries(raw).filter(([p]) => p.startsWith(`./${dir}/`) && (!only || p.endsWith(`/${only}`))).map(([p, src]) => [p.split('/').pop(), src.replace(/\r\n/g, '\n')]))

const Q_PHASES = [['observe', 'Observe', 'reset() gives the first state.'], ['represent', 'Represent', '4 numbers become one table row.'], ['choose', 'Choose', 'agent.act picks a push.'], ['act', 'Act', 'env.step: the world answers.'], ['learn', 'Learn', 'agent.learn nudges one table entry.'], ['repeat', 'Repeat', 'Add up, move on, or end the game.']]
const A2C_PHASES = [['observe', 'Observe', '8 CartPoles give their states.'], ['choose', 'Choose', 'The actor\'s logits; sample 8 pushes.'], ['act', 'Act', 'envs.step: 8 worlds answer.'], ['remember', 'Remember', 'Keep 5 steps of all 8.'], ['targets', 'Targets', 'n-step returns, backwards.'], ['learn', 'Learn', 'Loss, backward, clip, step.']]
const PG_PHASES = [['observe', 'Observe', 'A state from CartPole.'], ['choose', 'Choose', 'The policy samples a push.'], ['act', 'Act', 'env.step: the world answers.'], ['remember', 'Remember', 'Keep log π and the reward.'], ['targets', 'Targets', 'The number that multiplies ∇log π.'], ['learn', 'Learn', 'Loss, backward, step.']]

const Q = {
  group: 'Your Q-Arcade code', label: 'Q-learning (Chapters 1–2)', files: filesOf('q'),
  order: ['cartpole_table.py', 'train.py', 'agent.py', 'qlearning.py', 'qtable.py', 'bins.py'],
  entry: { module: 'cartpole_table', function: 'train_cartpole', kwargs: { episodes: 500, seed: 0 } },
  watch: { table: ['agent.Q', 'self.Q', 'Q'], obs: ['env.obs', 'self.obs'] },
  actions: ['self.env.step('], view: 'qtable', explain: qExplain, orchestrators: ['run_episode'], phases: Q_PHASES,
  knobs: [['agent.epsilon', 'ε epsilon', 'exploration probability', 0, 1, .01], ['agent.alpha', 'α alpha', 'learning rate', 0, 1, .01], ['agent.gamma', 'γ gamma', 'discount', 0, 1, .01]],
  intro: 'Your Chapter 1–2 files, unchanged, running in real Python with real NumPy and Gymnasium.',
}
const A2C = {
  group: 'Your Q-Arcade code', label: 'A2C (Chapter 4)', files: filesOf('a2c'), order: ['a2c.py', 'actor_critic.py'],
  entry: { module: 'a2c', function: 'train_a2c', kwargs: { total_steps: 200000, quiet: true } },
  watch: { network: ['net', 'self'], obs: ['obs'] }, actions: ['envs.step(', 'env.step('], view: 'network',
  explain: a2cExplain, orchestrators: ['train_a2c'], phases: A2C_PHASES, knobs: [],
  intro: 'Your Chapter 4 reference A2C, unchanged, running in real Python with real PyTorch and 8 Gymnasium CartPoles.',
}

// A concept program: one file, one idea.
const concept = (file, label, fn, extra) => ({
  group: 'Concepts, one at a time', label, files: filesOf('concepts', file), order: [file],
  entry: { module: file.replace('.py', ''), function: fn, kwargs: {} }, explain: conceptExplain,
  orchestrators: [], phases: [], knobs: [], actions: ['env.step('], ...extra,
})

export const PROGRAMS = {
  q: Q,
  a2c: A2C,
  'q-short': { ...Q, group: 'Short runs of your code', label: 'Q-learning: 20 games', entry: { ...Q.entry, kwargs: { episodes: 20, seed: 0 } }, intro: `${Q.intro} This short run plays 20 games, so it finishes in seconds.` },
  'a2c-short': { ...A2C, group: 'Short runs of your code', label: 'A2C: 2,000 steps', entry: { ...A2C.entry, kwargs: { total_steps: 2000, quiet: true, report_every: 1000 } }, intro: `${A2C.intro} This short run trains for 2,000 world-steps (50 updates).` },
  mdp: concept('mdp_corridor.py', '1. An MDP, written out in full', 'main', {
    watch: { state: ['state'], rewards: ['rewards'], policy: ['policy'] }, actions: ['transition('], view: 'corridor',
    intro: 'The five parts of an MDP as plain Python: states, actions, P, R and γ. A policy is a table; a better policy is one with a higher return.' }),
  values: concept('value_iteration.py', '2. Values by the Bellman equation', 'value_iteration', {
    watch: { V: ['V'], newV: ['new_V'], state: ['state'] }, actions: ['new_V[state] = best'], view: 'corridor',
    intro: 'Solve the corridor without playing: each sweep, every cell becomes its best "reward + γ × next value". Watch values spread back from the goal.' }),
  'q-corridor': concept('q_corridor.py', '3. Q-learning on the corridor', 'train', {
    watch: { Q: ['Q'], state: ['state'] }, actions: ['transition('], view: 'corridor',
    intro: 'Q-learning on a table of 5 × 2, small enough to watch every number. It learns, by playing, the values value iteration computed.' }),
  bandit: concept('bandit.py', '4. Explore or exploit: two slot machines', 'run', {
    watch: { estimates: ['estimates'], counts: ['counts'], chances: ['CHANCES'] }, actions: ['pull('], view: 'bars', barItem: 'machine',
    bars: [['estimates', 'average payout so far'], ['chances', 'true chance (hidden from the agent)'], ['counts', 'times played']],
    intro: 'Two machines, unknown payouts. Keep an average per machine; with probability ε try one at random.' }),
  neuron: concept('one_neuron.py', '5. One neuron learns: gradient descent', 'train', {
    watch: { w: ['w'], b: ['b'], xs: ['XS'], ys: ['YS'], loss: ['loss'] }, actions: ['w = w - rate * grad_w'], actionLabel: 'Next update', view: 'line',
    intro: 'A weight and a bias learn the line y = 2x + 1: work out how the error changes with each, step against it. Every network learns this way.' }),
  'log-trick': concept('log_derivative.py', '6. Where the policy gradient comes from', 'main', {
    watch: { exact: ['exact'], rough: ['rough'], better: ['better'], estimate: ['estimate'] }, actions: ['payoff = PAYOFF[action]'], actionLabel: 'Next play', view: 'bars', barItem: 'score',
    bars: [['exact', 'exact gradient'], ['estimate', 'estimate so far'], ['rough', 'from 10 plays'], ['better', 'from 400 plays']],
    intro: 'The log-derivative trick: the gradient of the expected payoff equals the average of payoff × ∇log p(action). Worked out exactly, then estimated from plays alone.' }),
  'policy-gradient': concept('policy_gradient.py', '7. Softmax, a baseline and a policy gradient', 'train', {
    watch: { probs: ['probs'], scores: ['scores'], chances: ['CHANCES'], baseline: ['baseline'], advantage: ['advantage'] }, actions: ['CHANCES[arm]'], actionLabel: 'Next pull', view: 'bars', barItem: 'machine',
    bars: [['probs', 'probability of choosing it'], ['scores', 'score (the parameter)'], ['chances', 'true chance (hidden)']],
    intro: 'The actor\'s idea on two slot machines: probabilities from scores, and a step of rate × advantage × ∇log π after each pull. The baseline is a one-number critic.' }),
  reinforce: concept('reinforce.py', '8. REINFORCE on CartPole', 'train', {
    watch: { network: ['policy', 'self'], obs: ['obs'], rewards: ['rewards'], returns: ['returns'], lengths: ['lengths'] }, view: 'network',
    phases: PG_PHASES, orchestrators: ['train', 'play_episode'],
    intro: 'Play a whole game, then raise log π(a_t|s_t) in proportion to G_t, the return that followed. One update per game (Monte Carlo).' }),
  'actor-critic': concept('actor_critic_onestep.py', '9. One-step actor-critic on CartPole', 'train', {
    watch: { network: ['actor'], critic: ['critic'], obs: ['obs'], lengths: ['lengths'] }, view: 'network',
    phases: PG_PHASES, orchestrators: ['train'],
    intro: 'Learn after every step: the critic\'s TD error δ = r + γV(s′) − V(s) is the advantage. The same actor loss as REINFORCE, with δ in place of G_t.' }),
}
