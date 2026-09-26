import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { mlp } from './ladder.js'
export default {
  number: 21,
  short: 'Neural network in NumPy',
  question: 'How do layers of simple units learn complex boundaries?',
  intro: 'Stack dense layers with nonlinear activations, finish with softmax and cross-entropy, backpropagate in matrix form, and train a network you fully understand.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { mlp },
  math: ['la.matmul', 'la.matcalc', 'ai.tensors', 'ds.vectorize', 'calc.explog'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Dense layers and shapes, activation functions, softmax and cross-entropy, the matrix-form backward pass, initialization (symmetry; He, LeCun and Xavier scales), capacity and training diagnostics. Optimizers are Lab 22; frameworks are Lab 23.',
}
