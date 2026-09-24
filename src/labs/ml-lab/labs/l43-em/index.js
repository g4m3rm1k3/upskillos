import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 43,
  short: 'Mixtures & EM',
  question: 'How do you fit a model whose most important variable is never observed?',
  intro: 'Gaussian mixture models, the EM algorithm and why it never decreases the likelihood, its relationship to k-means, failure modes, and choosing the number of components.',
  lessons, sources, python,
  math: ['stat.normal', 'pre.log', 'calc.optim', 'stat.bayes'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Latent-variable models and mixtures, responsibilities, E- and M-steps, Jensen’s inequality, the ELBO and KL decomposition, monotonicity and local optima, restarts and initialization, k-means as hard EM, collapse and variance floors, label switching, covariance types, BIC, AIC and held-out likelihood.',
}
