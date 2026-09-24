import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 36,
  short: 'Causal inference & experiments',
  question: 'What happens if we change something — not just what will happen?',
  intro: 'Potential outcomes, confounding, adjustment by stratification, regression and propensity weighting, randomized experiments, power, and the pitfalls that make experiments lie.',
  lessons, sources, python,
  math: ['stat.conditional', 'stat.bias', 'stat.multireg', 'stat.testing', 'dm.graphs'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Prediction versus intervention, potential outcomes and the average treatment effect, confounding and proxies, stratification, regression adjustment, inverse propensity weighting and overlap, randomized experiments, intervals, sample size and power, peeking, the winner’s curse and multiple metrics.',
}
