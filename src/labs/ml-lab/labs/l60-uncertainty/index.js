import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 60,
  short: 'Uncertainty & conformal prediction',
  question: 'How sure is the model — and can we promise how often its intervals are right?',
  intro: 'Aleatoric and epistemic uncertainty with deep ensembles, quantile regression with the pinball loss, split conformal prediction and its finite-sample guarantee, adaptive intervals and conditional coverage, and conformal prediction sets for classifiers.',
  lessons, sources, python,
  math: ['stat.percentiles', 'stat.normal', 'stat.spread', 'stat.ci'],
  lessonAware: true,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Aleatoric versus epistemic uncertainty, heteroscedastic Gaussian likelihood, deep ensembles and the law of total variance, MC dropout and Laplace in outline, the limits of ensemble spread, quantile regression and the pinball loss, exchangeability, split conformal prediction and its coverage bounds, marginal versus conditional coverage, normalized scores and CQR, Mondrian and weighted conformal, distribution shift, conformal prediction sets, naive probability sets, empty sets and APS.',
}
