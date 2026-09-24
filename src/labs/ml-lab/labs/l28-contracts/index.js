import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 28,
  short: 'Data contracts & reproducibility',
  question: 'Can you trust the data going in — and rebuild the model coming out?',
  intro: 'Write data contracts that catch bad inputs early, check distributions that rows cannot reveal, and version data, code and configuration so any model can be rebuilt.',
  lessons, sources, python,
  math: ['stat.distributions', 'stat.chisq', 'ds.cleaning'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Schemas and data contracts, row-level validation, batch policies and quarantine, distribution checks against training references, content-addressed dataset versions, configuration and environment capture, experiment tracking and lineage.',
}
