import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 37,
  short: 'Reinforcement learning',
  question: 'How does an agent learn to act when nobody tells it the right answer?',
  intro: 'Markov decision processes, returns and values, planning by value iteration, Q-learning with exploration, comparison with a hand-written policy, and reward misspecification.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'States, actions, rewards, transitions, discounting, policies and value functions, the Bellman equation, value iteration, tabular Q-learning, ε-greedy exploration, learning rate and seeds, simple baselines, and reward hacking. Deep RL is described, not implemented.',
}
