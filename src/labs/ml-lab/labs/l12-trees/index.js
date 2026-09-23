import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 12,
  short: 'Decision trees',
  question: 'Can a sequence of simple questions make a good model?',
  intro: 'Grow a tree by choosing the question that best separates the data, again and again — then learn why deep trees memorize and how to stop them.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Classification and regression trees: Gini and entropy, information gain, greedy recursive growth, prediction paths, depth and leaf-size limits, pruning, instability and feature importance. Ensembles of trees are Labs 13–14.',
}
