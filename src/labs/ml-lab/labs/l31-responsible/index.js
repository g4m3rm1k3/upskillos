import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 31,
  short: 'Responsible decisions',
  question: 'Who is affected by the model’s mistakes — and what can you honestly claim?',
  intro: 'Check permissions, evaluate by subgroup, understand why fairness criteria conflict, design meaningful human oversight, and document the model with evidence-based limitations.',
  lessons, sources, python,
  math: ['stat.conditional', 'stat.proportions', 'stat.bias'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Data permissions, purpose limitation and minimization; subgroup metrics and calibration with uncertainty; fairness criteria and their incompatibility; explanation limits; human review and appeals; model cards and honest communication. This is an introduction, not legal advice.',
}
