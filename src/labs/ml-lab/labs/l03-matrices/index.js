import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 3,
  short: 'Vectors & matrices',
  question: 'What changes when a prediction has many inputs?',
  intro: 'Move from one feature to a design matrix. See the loss surface, its curvature, and why scaling and correlation matter.',
  lessons, sources, python,
  math: ['la.vectors', 'la.dot', 'la.matmul', 'la.transform', 'la.systems', 'la.leastsq', 'la.numpy', 'tool.matrix', 'ref.la'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Design matrices, matrix products, the matrix-form gradient, normal equations as projection, rank and collinearity, eigenvalues as curvature, condition number and training-only standardization. Regularization for collinearity is Lab 07.',
}
