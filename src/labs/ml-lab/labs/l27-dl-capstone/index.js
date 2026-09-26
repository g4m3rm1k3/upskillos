import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { invest } from './ladder.js'
export default {
  number: 27,
  short: 'Capstone: DL investigation',
  question: 'Which parts of a deep-learning pipeline actually earn their cost?',
  intro: 'Run a real investigation: baselines, representations, ablations over seeds, compute budgets and error analysis — and a report that includes the failures.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { invest },
  math: ['ai.optim', 'ai.stability', 'ds.evaluation'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Framing a deep-learning investigation, data suitability, baselines and transfer learning, ablations with seed variation and paired comparisons, parameter and compute budgets, qualitative error analysis and honest reporting.',
}
