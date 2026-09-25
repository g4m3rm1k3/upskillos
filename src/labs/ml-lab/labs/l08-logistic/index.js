import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { logistic } from './ladder.js'

export default {
  number: 8,
  short: 'Logistic regression',
  question: 'How do you predict a probability instead of a number?',
  intro: 'Turn a linear score into a probability, derive the loss from likelihood, train it by gradient descent, and separate the probability from the decision.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { logistic },
  math: ['calc.explog', 'calc.chain', 'pre.log', 'la.matcalc', 'calc.newton', 'stat.binomial'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Binary logistic regression: sigmoid, odds and log-odds, cross-entropy from likelihood, the gradient, decision boundaries, feature maps, regularization on separable data and cost-based thresholds. Metrics and calibration are Lab 09; multiclass softmax appears in Lab 21.',
}
