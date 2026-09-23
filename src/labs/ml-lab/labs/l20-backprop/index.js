import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 20,
  short: 'Graphs & backpropagation',
  question: 'How does a computer find millions of derivatives at once?',
  intro: 'Break computations into graphs, pass gradients backwards with local derivatives, and build the automatic-differentiation engine every deep-learning framework is based on.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Computation graphs, forward passes, local derivatives, reverse-mode differentiation (backpropagation), gradient accumulation and topological order, saturation, gradient checking, and a scalar autodiff engine.',
}
