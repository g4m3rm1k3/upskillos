import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 58,
  short: 'Policy gradients & actor–critic',
  question: 'How can an agent improve its behaviour directly by following the gradient of expected reward?',
  intro: 'Stochastic policies and their objective, the log-derivative trick and REINFORCE, baselines and advantages, actor–critic learning, and the practical realities of policy-gradient RL.',
  lessons, sources, python,
  math: ['calc.explog', 'stat.rv', 'calc.chain', 'calc.series'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Value-based versus policy-based RL, parameterized stochastic policies, the expected-return objective, the log-derivative trick and policy-gradient theorem, REINFORCE and returns-to-go, variance and baselines, advantages, one-step actor–critic and TD errors, critic representation, A2C, GAE and PPO in outline, entropy bonuses, sample efficiency and when not to use RL.',
}
