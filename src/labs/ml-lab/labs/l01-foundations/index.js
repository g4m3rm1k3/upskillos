import { lessons, sources } from '../../lessons.js'
import python from './python.js'
import Playground from './Playground.jsx'

export default {
  number: 1,
  short: 'Foundations',
  question: 'How does a model learn?',
  intro: 'Start with Python basics and algebra. Build the missing intuition one step at a time.',
  lessons, sources, python, Playground, ownNotebook: true, lessonAware: true,
  math: ['la.vectors', 'la.dot', 'calc.derivative', 'calc.rate', 'ds.gd', 'ds.linreg', 'tool.openmat', 'tool.notebook'],
  scope: 'One-feature, unregularized linear regression with an intercept. These lessons and exercises do not cover the full ML engineering curriculum.',
}
