import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { optim } from './ladder.js'
export default {
  number: 22,
  short: 'Optimization & failures',
  question: 'Why does training succeed, stall or explode?',
  intro: 'Compare SGD, momentum, RMSProp and Adam on visible loss surfaces, see mini-batch noise and schedules, and learn to diagnose a failing training run.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { optim },
  math: ['ai.optim', 'calc.secondderiv', 'la.quadratic', 'la.eigen', 'la.conditioning', 'calc.taylor'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Mini-batch and stochastic gradients, momentum, RMSProp, Adam with bias correction, learning-rate schedules and warm-up, gradient clipping, and distinguishing bugs, optimization failures and generalization failures.',
}
