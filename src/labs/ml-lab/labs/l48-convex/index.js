import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 48,
  short: 'Convex optimization & duality',
  question: 'What do constraints cost, and why does the SVM have a “dual”?',
  intro: 'Convexity, Lagrange multipliers and KKT conditions, duality and certificates, the SVM dual solved by SMO, and proximal gradient methods for non-smooth problems.',
  lessons, sources, python,
  math: ['ai.convex', 'pre.lp', 'la.matcalc', 'calc.optim', 'la.quadratic'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Convex sets and functions and their tests, convexity of ML losses, Lagrangians, KKT conditions, complementary slackness and shadow prices, dual functions, weak and strong duality and duality gaps, the soft-margin SVM dual, support vectors, the kernel trick via duality, SMO, proximal operators, soft-thresholding, ISTA/FISTA, and choosing among optimizers.',
}
