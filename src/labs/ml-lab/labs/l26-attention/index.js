import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 26,
  short: 'Attention & transformers',
  question: 'How can every token look at every other token?',
  intro: 'Build attention from a soft dictionary lookup, scale it, mask it, give it positions, split it into heads, and assemble a transformer block — then learn what attention weights do not prove.',
  lessons, sources, python,
  math: ['la.dot', 'la.matmul', 'calc.explog', 'ai.stability', 'ai.tensors'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Queries, keys and values; scaled dot-product self-attention; causal and padding masks; permutation equivariance and positional encodings; multi-head attention; transformer blocks with residuals and layer normalization; parameter and T² costs; interpreting attention cautiously.',
}
