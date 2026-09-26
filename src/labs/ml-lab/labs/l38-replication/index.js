import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { replicate } from './ladder.js'

export default {
  number: 38,
  short: 'Research replication',
  question: 'Does a published result hold up — and which part of it?',
  intro: 'Reproduce a paper’s number exactly, test it on fresh seeds with paired intervals, attribute the gain with ablations and a fairly tuned baseline, spend a fixed compute budget wisely, and write a report that separates replicated findings from deviations and unsupported claims.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { replicate },
  math: ['stat.ci', 'stat.testing', 'stat.ttest'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Reading a paper for testable claims, reproducibility versus replicability, seed variation and paired comparisons, confidence intervals and bootstrap, ablations, baseline tuning, compute budgets, reporting verdicts and deviations, and choosing deeper work such as generative modelling.',
}
