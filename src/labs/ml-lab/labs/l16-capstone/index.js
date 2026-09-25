import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { oof } from './ladder.js'

export default {
  number: 16,
  short: 'Capstone: tabular model',
  question: 'Can you take a real problem all the way to a defensible decision?',
  intro: 'Frame the problem, engineer features, compare models honestly, analyse errors, open the test set once, and write a report someone else could check.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { oof },
  math: ['ds.eda', 'ds.features', 'stat.multireg', 'ds.evaluation'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'An end-to-end tabular regression project: problem framing, feature engineering, shared-fold model comparison, bounded tuning, error analysis, a single final test with a bootstrap interval, and reproducible reporting (scikit-learn pipelines in the Python challenge).',
}
