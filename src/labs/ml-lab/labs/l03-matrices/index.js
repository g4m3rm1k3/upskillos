import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { prediction, gradient } from './ladder.js'

export default {
  number: 3,
  short: 'Vectors & matrices',
  question: 'What changes when a prediction has many inputs?',
  intro: 'Move from one feature to a design matrix, one small table at a time. Then see the loss as a bowl, and why scaling and correlation change its shape.',
  lessons, sources, python, lessonAware: true,
  math: ['la.vectors', 'la.dot', 'la.matmul', 'la.transform', 'la.systems', 'la.leastsq', 'la.numpy', 'tool.matrix', 'ref.la'],
  Playground: lazy(() => import('./Playground.jsx')),
  figures: () => import('./figures.jsx'),
  ladders: { prediction, gradient },
  scope: 'Design matrices, matrix products and the transpose, the matrix-form gradient, the loss bowl in weight space, normal equations as projection, rank and collinearity, step-size limits and training-only standardization, and (as an optional second pass) eigenvalues as curvature and the condition number. Regularization for collinearity is Lab 07.',
}
