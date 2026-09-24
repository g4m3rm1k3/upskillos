import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 32,
  short: 'Retraining & delivery',
  question: 'How do you ship a model update without breaking anything?',
  intro: 'Retrain on recent data, pass promotion gates that each catch a different failure, roll out through a canary with automatic rollback, and version every release by its impact.',
  lessons, sources, python,
  math: ['stat.testing', 'stat.ci'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Retraining triggers, promotion gates (improvement, slices, contract, parity, latency, sanity), shadow and canary deployment, automatic rollback, CI for ML, release artifacts, semantic versioning, and feedback loops.',
}
