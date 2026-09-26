import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { capstone } from './ladder.js'

export default {
  number: 33,
  short: 'Final capstone',
  question: 'Can you take your own problem from idea to a maintained product?',
  intro: 'Choose a real decision, build honest evidence on your own data, ship it responsibly, and plan who keeps it working.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { capstone },
  math: ['ds.eda', 'ds.evaluation', 'stat.ci', 'tool.notebook'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The complete ML engineering loop applied to the learner’s own project: problem selection, evidence, deployment, documentation, monitoring and maintenance, with a project workbench and a feasibility check on pasted data.',
}
