import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'

export default {
  number: 10,
  short: 'Nearest neighbours',
  question: 'Can you predict from similar examples alone?',
  intro: 'k-NN makes predictions from the closest stored examples. Its successes and failures reveal what distance, scale and dimension really do.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'),
  math: ['ai.norms', 'la.dot', 'la.inner', 'dm.complexity'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'k-nearest-neighbour classification and regression, Euclidean and Manhattan distance, feature scaling, choosing k, the curse of dimensionality, near-duplicate leakage and prediction cost.',
}
