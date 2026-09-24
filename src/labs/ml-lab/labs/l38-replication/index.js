import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 38,
  short: 'Research replication',
  question: 'Does a published result hold up — and which part of it?',
  intro: 'Reproduce a paper’s number exactly, test it on fresh seeds with paired intervals, attribute the gain with ablations and a fairly tuned baseline, spend a fixed compute budget wisely, and write a report that separates replicated findings from deviations and unsupported claims.',
  lessons, sources, python,
  math: ['stat.ci', 'stat.testing', 'stat.ttest'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Reading a paper for testable claims, reproducibility versus replicability, seed variation and paired comparisons, confidence intervals and bootstrap, ablations, baseline tuning, compute budgets, reporting verdicts and deviations, and choosing deeper work such as generative modelling.',
}
