import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 39,
  short: 'GLMs & Newton’s method',
  question: 'Why are linear, logistic and count regression the same model — and how do we fit them in a few steps?',
  intro: 'The exponential family, generalized linear models, softmax regression, Newton’s method (IRLS) and locally weighted regression — with every key result derived step by step.',
  lessons, sources, python,
  math: ['calc.newton', 'la.matcalc', 'la.leastsq', 'calc.explog', 'stat.poisson', 'stat.binomial'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Exponential-family form and moments of the log-partition function, the three GLM assumptions and canonical links, Poisson regression and overdispersion, the shared (μ − y)x gradient and Hessian, softmax regression and numerical stability, Newton’s method, quadratic convergence, IRLS, affine invariance, L-BFGS and damping, and locally weighted regression with bandwidth selection.',
}
