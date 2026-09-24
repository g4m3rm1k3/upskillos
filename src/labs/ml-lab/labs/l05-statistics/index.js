import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 5,
  short: 'Statistics & estimation',
  question: 'How far off might your estimate be?',
  intro: 'Every number computed from data has uncertainty. Measure it with sampling distributions, the bootstrap and likelihood — and separate association from cause.',
  lessons, sources, python,
  math: ['stat.center', 'stat.spread', 'stat.ci', 'stat.clt', 'stat.testing', 'stat.ttest', 'stat.correlation', 'ai.stats'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Populations and samples, estimators, the central limit theorem, standard errors, bootstrap intervals and their coverage, likelihood and maximum-likelihood estimation, correlation and confounding. Leakage-free evaluation is Lab 06; causal inference is optional Lab 36.',
}
