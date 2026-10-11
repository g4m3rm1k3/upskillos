// The two real programs this lab steps through: the learner's Q-Arcade code, unchanged.
// Q-learning is Chapter 1's agent and training loop with Chapter 2's CartPole bins; A2C is
// Chapter 4's reference implementation (PyTorch, 8 Gymnasium CartPoles in step).
import * as qExplain from '../explain/q.js'
import * as a2cExplain from '../explain/a2c.js'

const raw = import.meta.glob('./*/*.py', { query: '?raw', import: 'default', eager: true })
const filesOf = dir => Object.fromEntries(Object.entries(raw).filter(([p]) => p.startsWith(`./${dir}/`)).map(([p, src]) => [p.split('/').pop(), src.replace(/\r\n/g, '\n')]))

export const PROGRAMS = {
  q: {
    label: 'Q-learning (Chapters 1–2)',
    files: filesOf('q'),
    order: ['cartpole_table.py', 'train.py', 'agent.py', 'qlearning.py', 'qtable.py', 'bins.py'],
    entry: { module: 'cartpole_table', function: 'train_cartpole', kwargs: { episodes: 500, seed: 0 } },
    // Values the lab looks for in the running functions (innermost first), to draw.
    watch: { table: ['agent.Q', 'self.Q', 'Q'], obs: ['env.obs', 'self.obs'] },
    // The call after which the world has answered: "Next action" stops on the line after it.
    actions: ['self.env.step('],
    explain: qExplain,
    // The functions whose current line says which part of the loop is running.
    orchestrators: ['run_episode'],
    phases: [['observe', 'Observe', 'reset() gives the first state.'], ['represent', 'Represent', '4 numbers become one table row.'], ['choose', 'Choose', 'agent.act picks a push.'], ['act', 'Act', 'env.step: the world answers.'], ['learn', 'Learn', 'agent.learn nudges one table entry.'], ['repeat', 'Repeat', 'Add up, move on, or end the game.']],
    knobs: [['agent.epsilon', 'ε epsilon', 'exploration probability', 0, 1, .01], ['agent.alpha', 'α alpha', 'learning rate', 0, 1, .01], ['agent.gamma', 'γ gamma', 'discount', 0, 1, .01]],
  },
  a2c: {
    label: 'A2C (Chapter 4)',
    files: filesOf('a2c'),
    order: ['a2c.py', 'actor_critic.py'],
    entry: { module: 'a2c', function: 'train_a2c', kwargs: { total_steps: 200000, quiet: true } },
    watch: { network: ['net', 'self'], obs: ['obs'] },
    actions: ['envs.step(', 'env.step('],
    explain: a2cExplain,
    orchestrators: ['train_a2c'],
    phases: [['observe', 'Observe', '8 CartPoles give their states.'], ['choose', 'Choose', 'The actor\'s logits; sample 8 pushes.'], ['act', 'Act', 'envs.step: 8 worlds answer.'], ['remember', 'Remember', 'Keep 5 steps of all 8.'], ['targets', 'Targets', 'n-step returns, backwards.'], ['learn', 'Learn', 'Loss, backward, clip, step.']],
    knobs: [],
  },
}
