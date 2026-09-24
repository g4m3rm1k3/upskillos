import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 40,
  short: 'Generative classifiers',
  question: 'When does modelling how each class looks beat modelling the boundary?',
  intro: 'Gaussian discriminant analysis (LDA and QDA), Bayes-rule classification, maximum-likelihood fitting, and the generative–discriminative trade-off measured with learning curves.',
  lessons, sources, python,
  math: ['stat.normal', 'la.quadratic', 'la.inverse', 'la.special', 'stat.bayes'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Generative versus discriminative models, Bayes-rule posteriors, GDA maximum-likelihood estimates and pooled covariances, LDA’s linear and QDA’s quadratic boundaries, parameter counts and shrinkage, Ng–Jordan learning-curve trade-offs, robustness to non-Gaussian subgroups, Fisher’s discriminant, Gaussian naive Bayes, missing features and sampling as a diagnostic.',
}
