import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 25,
  short: 'Embeddings & sequences',
  question: 'How does a model read a sequence where order matters?',
  intro: 'Embed tokens, see why averaging loses order, carry a recurrent state through time, mask padding correctly, and catch shortcut learning.',
  lessons, sources, python,
  math: ['ai.embeddings', 'la.dot', 'la.inner', 'la.lowrank'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Vocabularies and embeddings, pooled baselines, recurrent networks and backpropagation through time, vanishing gradients and gated cells, padding and masking, shortcut learning and split contamination.',
}
