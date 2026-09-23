import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 29,
  short: 'Serving & integration',
  question: 'Does the model behave the same once it is serving real requests?',
  intro: 'Package a model with its preprocessing, prove training–serving parity, design a prediction API contract, and reason about latency and capacity under real traffic.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Batch versus online prediction, model artifacts and serialization, training–serving skew and parity tests, API contracts, versioned responses and fallbacks, latency percentiles, utilization, micro-batching, and testing the full prediction path.',
}
