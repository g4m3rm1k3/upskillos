import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 15,
  short: 'Margins & SVMs',
  question: 'Which of many separating boundaries should you trust?',
  intro: 'Choose the boundary with the widest margin, allow violations with the hinge loss, and bend it with kernels.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Hyperplanes and geometric margins, hard- and soft-margin SVMs, hinge loss and subgradient (Pegasos) training, support vectors, feature maps and kernels (polynomial, RBF via random features), and comparison with logistic regression.',
}
