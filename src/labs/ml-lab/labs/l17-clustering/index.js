import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { kmeans } from './ladder.js'

export default {
  number: 17,
  short: 'Clustering & anomalies',
  question: 'Is there structure in data with no labels?',
  intro: 'Group unlabeled data with k-means and DBSCAN, choose the number of groups carefully, and flag what fits no group — without mistaking an algorithm’s output for truth.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { kmeans },
  math: ['ai.norms', 'stat.spread', 'stat.normal', 'la.quadratic'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Unsupervised learning, k-means (assign/update, convergence, k-means++, restarts), choosing k (elbow, silhouette, stability), DBSCAN, and distance-based anomaly scores.',
}
