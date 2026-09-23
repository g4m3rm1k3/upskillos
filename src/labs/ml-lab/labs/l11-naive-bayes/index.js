import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 11,
  short: 'Naive Bayes & text',
  question: 'How can counting words classify a message?',
  intro: 'Represent text as counts, apply Bayes’ rule with a bold independence assumption, and trace every prediction word by word.',
  lessons, sources, python,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Tokenization, training-only vocabularies, bag of words, multinomial Naive Bayes, Laplace smoothing, log-space computation and log-sum-exp, independence failures, and honest evaluation of text classifiers.',
}
