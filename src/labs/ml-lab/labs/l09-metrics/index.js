import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { threshold } from './ladder.js'

export default {
  number: 9,
  short: 'Metrics & decisions',
  question: 'Is the model good enough — for this decision?',
  intro: 'Confusion matrices, precision and recall, ROC and PR curves, costs and calibration — applied to choosing when an alert system should fire.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { threshold },
  math: ['stat.conditional', 'stat.bayes', 'stat.proportions', 'calc.integral'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Binary classification metrics, threshold selection by cost, class imbalance, ROC/AUC, precision–recall and average precision, calibration (reliability diagrams, Brier, ECE, Platt scaling).',
}
