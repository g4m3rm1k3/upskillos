import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 50,
  short: 'Online learning & bandits',
  question: 'How do you learn when every decision must be made before you see its outcome?',
  intro: 'Regret, the perceptron’s mistake bound, learning from expert advice with multiplicative weights, and multi-armed bandits from ε-greedy to UCB and Thompson sampling.',
  lessons, sources, python,
  math: ['stat.ci', 'calc.sum', 'calc.explog', 'stat.binomial'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The online protocol, full-information versus bandit feedback, regret and sublinear regret, adversarial guarantees, the perceptron and its mistake bound, follow-the-leader and its failure, Hedge and its √(T ln N) bound, greedy, ε-greedy, UCB1 and Thompson sampling, logarithmic regret, bandits versus A/B tests, and contextual bandits with logging.',
}
