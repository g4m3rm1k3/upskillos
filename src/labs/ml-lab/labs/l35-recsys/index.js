import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 35,
  short: 'Recommender systems',
  question: 'How do you rank items for each user — and know it helps?',
  intro: 'Implicit feedback, popularity and collaborative filtering, matrix factorization, time-aware offline evaluation, cold start, and the feedback loop a deployed recommender creates.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Implicit versus explicit feedback, the popularity baseline, item-item cosine filtering, matrix factorization by alternating least squares, leave-last-out evaluation with hit rate, NDCG and coverage, cold start, feedback loops, exploration and logging. Online experiments are covered in Lab 36.',
}
