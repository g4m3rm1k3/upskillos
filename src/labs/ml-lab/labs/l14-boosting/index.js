import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 14,
  short: 'Boosting',
  question: 'What if each model only fixed the last one’s mistakes?',
  intro: 'Add small trees one at a time, each fitted to the remaining residuals — gradient descent in function space — and stop before it memorizes the noise.',
  lessons, sources, python,
  math: ['calc.derivative', 'ds.gd', 'calc.taylor', 'dm.trees'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Gradient boosting for regression with shallow trees: residual fitting, the gradient view, shrinkage, depth, subsampling, early stopping, and how production libraries extend it.',
}
