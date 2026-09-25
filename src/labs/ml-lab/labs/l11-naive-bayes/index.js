import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { nb } from './ladder.js'

export default {
  number: 11,
  short: 'Naive Bayes & text',
  question: 'How can counting words classify a message?',
  intro: 'Represent text as counts, apply Bayes’ rule with a bold independence assumption, and trace every prediction word by word.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { nb },
  math: ['stat.bayes', 'stat.conditional', 'pre.log', 'stat.counting'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Tokenization, training-only vocabularies, bag of words, multinomial Naive Bayes, Laplace smoothing, log-space computation and log-sum-exp, independence failures, and honest evaluation of text classifiers.',
}
