import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 41,
  short: 'Bayesian inference',
  question: 'How should beliefs about parameters change when data arrive — and what does that say about regularization and model choice?',
  intro: 'Priors, posteriors and conjugacy; credible intervals and posterior predictives; ridge and lasso as MAP estimates; Bayesian linear regression with honest uncertainty; and the evidence as Occam’s razor.',
  lessons, sources, python,
  math: ['stat.bayes', 'stat.normal', 'la.cholesky', 'la.inverse', 'calc.integral'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Bayes’ rule for parameters, Beta–binomial conjugacy and pseudo-counts, posterior mean, MAP and credible intervals, posterior predictive and Laplace’s rule, prior sensitivity, Gaussian and Laplace priors as ridge and lasso, the Bayesian linear regression posterior and predictive variance, posterior function samples, marginal likelihood, Bayes factors and empirical Bayes.',
}
