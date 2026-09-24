import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 45,
  short: 'Graphical models & HMMs',
  question: 'How does structure make probabilistic reasoning about many variables possible?',
  intro: 'Bayesian networks, conditional independence and explaining away, hidden Markov models with filtering, smoothing and Viterbi decoding, and learning by counting or Baum–Welch.',
  lessons, sources, python,
  math: ['dm.graphs', 'la.markov', 'dp.dag', 'dp.sequence', 'stat.conditional'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Factorization along a directed acyclic graph, parameter counts, inference by enumeration, chains, forks and colliders, d-separation, explaining away and selection effects, HMM definitions, the forward algorithm and scaling, forward–backward smoothing, Viterbi decoding, Kalman filters in outline, supervised counting, Baum–Welch, CRFs and factor graphs in outline.',
}
