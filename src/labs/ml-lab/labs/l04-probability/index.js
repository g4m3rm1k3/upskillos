import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 4,
  short: 'Probability',
  question: 'How much should one piece of evidence change your mind?',
  intro: 'Probability from counting: distributions, expectation, conditioning and Bayes’ rule — each one verified by simulation.',
  lessons, sources, python, viewPerLesson: true,
  math: ['stat.prob', 'stat.conditional', 'stat.bayes', 'stat.rv', 'stat.binomial', 'stat.normal', 'dm.prob', 'tool.odds'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Discrete and continuous random variables, expectation, variance, conditional probability, independence, Bayes’ rule and Monte Carlo verification. Estimation from samples continues in Lab 05.',
}
