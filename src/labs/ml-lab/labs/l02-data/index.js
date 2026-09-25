import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { fill } from './ladder.js'

export default {
  number: 2,
  short: 'Data & reproducibility',
  question: 'Can you trust — and rerun — your result?',
  intro: 'Real data is messy. Clean it with explicit, testable rules, and make every run repeatable.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { fill },
  math: ['stat.sampling', 'stat.bias', 'stat.pandas', 'ds.cleaning', 'ds.eda', 'stat.center', 'stat.spread'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Pure-function pipelines, NumPy indexing and broadcasting, pandas basics, missing values, sentinels, duplicates, seeds and invariant tests. Grouped and temporal splits are covered in Lab 06.',
}
