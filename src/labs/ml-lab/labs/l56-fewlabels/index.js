import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 56,
  short: 'Learning from few labels',
  question: 'How do you learn well when labels are scarce but unlabelled data are plentiful?',
  intro: 'Semi-supervised learning with label propagation and self-training, active learning with uncertainty sampling, and contrastive self-supervised pretraining evaluated with linear probes.',
  lessons, sources, python,
  math: ['dm.graphs', 'la.eigen', 'la.dot', 'stat.bayes'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The cluster and manifold assumptions, label propagation on neighbour graphs, self-training, pseudo-labels and confirmation bias, consistency regularization, pool-based active learning, uncertainty and margin sampling and their pitfalls, pretext tasks, contrastive learning, InfoNCE, linear probes, pretrain-then-adapt pipelines, weak supervision and label quality.',
}
