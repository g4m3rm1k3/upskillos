import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 30,
  short: 'Testing, monitoring & drift',
  question: 'Is the deployed model still right — and how fast would you know?',
  intro: 'Test code, data and models; monitor inputs, predictions and delayed outcomes; separate drift from proven harm; and respond with the right fix.',
  lessons, sources, python,
  math: ['stat.testing', 'stat.chisq', 'ai.info', 'stat.percentiles'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Unit, data and model tests; covariate shift, concept drift and pipeline bugs; PSI and its sampling noise; delayed labels and proxies; alert thresholds, persistence, guards and runbooks; rollback versus retraining.',
}
