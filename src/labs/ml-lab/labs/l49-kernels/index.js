import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 49,
  short: 'Kernel methods',
  question: 'How can a linear algorithm learn curved functions in feature spaces too large to build?',
  intro: 'Feature maps and the kernel trick, valid kernels and Gram matrices, the representer theorem and kernel ridge regression, kernel PCA, and tuning and scaling kernel methods.',
  lessons, sources, python,
  math: ['la.hilbert', 'la.inner', 'la.special', 'la.eigen', 'la.cholesky'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Feature maps, inner-product algorithms and the kernel trick, polynomial and RBF kernels, positive semidefinite Gram matrices and Mercer’s theorem, kernel construction rules, invalid kernels, the representer theorem, kernel ridge regression and its link to GPs, kernel PCA and centring, the pre-image problem, tuning γ and λ, the median heuristic, and Nyström and random-feature approximations.',
}
