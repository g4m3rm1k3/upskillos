import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 42,
  short: 'Gaussian processes',
  question: 'Can we put a prior on whole functions — and get honest uncertainty from a handful of points?',
  intro: 'Gaussian processes as distributions over functions: kernels, exact regression by conditioning, hyperparameters from the marginal likelihood, and where GPs are the right tool.',
  lessons, sources, python,
  math: ['la.cholesky', 'la.special', 'la.factor', 'stat.normal', 'la.hilbert'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The function-space view and its link to Bayesian linear regression, kernels (RBF, Matérn, periodic, linear) and their parameters, kernel sums and products and validity, the GP posterior mean and variance, noise, Cholesky computation and O(n³) cost, the log marginal likelihood for hyperparameters and kernel choice, Bayesian optimization, active learning, ARD and scaling limits.',
}
