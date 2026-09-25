import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { bag } from './ladder.js'

export default {
  number: 13,
  short: 'Bagging & random forests',
  question: 'Can many unstable models make one stable one?',
  intro: 'Average many deep trees trained on bootstrap samples, decorrelate them with random features, and evaluate for free with out-of-bag data.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { bag },
  math: ['stat.sampling', 'stat.spread', 'stat.clt', 'dm.trees'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Variance of averages, bagging, random feature subsets, out-of-bag evaluation, tuning and limitations of random forests. Sequential ensembles (boosting) are Lab 14.',
}
