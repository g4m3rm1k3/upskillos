import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 37,
  short: 'Reinforcement learning',
  question: 'How does an agent learn to act when nobody tells it the right answer?',
  intro: 'The agent–environment loop and Markov decision processes, returns, stochastic policies and value functions, the Bellman equations, planning by value iteration, Q-learning with exploration, comparison with a hand-written policy, and reward misspecification.',
  lessons, sources, python,
  math: ['calc.series', 'stat.rv', 'stat.conditional', 'la.markov', 'la.systems', 'dp.intro', 'tool.dp', 'tool.notebook', 'tool.openmat'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Time-indexed notation (S_t, A_t, R_{t+1}, S_{t+1}), MDP dynamics p(s′, r | s, a) and the Markov property, returns and their recursion, discounting and the geometric bound, deterministic and stochastic policies, ε-greedy probabilities, V^π and Q^π, the Bellman expectation equation, policy evaluation by iteration and as a linear system, V* and Q*, the Bellman optimality equation, value iteration and the contraction argument, tabular Q-learning and the TD error, off-policy versus SARSA, step-size conditions, maximization bias and double Q-learning, simple baselines, reward hacking and potential-based shaping. Deep RL is described, not implemented.',
}
