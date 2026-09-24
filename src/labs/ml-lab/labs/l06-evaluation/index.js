import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 6,
  short: 'Evaluation without leakage',
  question: 'Does your score predict the future — or remember the past?',
  intro: 'Most impressive ML results that fail in production were evaluated wrong. Audit four realistic leaks, then build evaluation you can defend.',
  lessons, sources, python, viewPerLesson: true,
  math: ['ds.evaluation', 'stat.sampling', 'stat.ci'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Train/validation/test roles, k-fold cross-validation, baselines and skill, preprocessing and selection leakage, target and future leakage, group and time-ordered splits, and test-set discipline.',
}
