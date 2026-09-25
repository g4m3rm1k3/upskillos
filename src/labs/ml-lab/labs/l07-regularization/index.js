import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { shrink } from './ladder.js'

export default {
  number: 7,
  short: 'Overfitting & regularization',
  question: 'How flexible should a model be?',
  intro: 'Make models more flexible, watch them overfit, decompose the error into bias and variance, and control it with regularization and data.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { shrink }, viewPerLesson: true,
  math: ['la.leastsq', 'la.pinv', 'la.conditioning', 'calc.optim', 'stat.multireg', 'ds.evaluation'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Polynomial features, under- and overfitting, bias–variance decomposition, ridge and lasso (with an unpenalized intercept), soft thresholding, validation and learning curves. Classification models begin in Lab 08.',
}
