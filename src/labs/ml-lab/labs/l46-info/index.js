import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 46,
  short: 'Information theory',
  question: 'Why is log-loss the natural loss — and what does a model’s surprise tell you?',
  intro: 'Information and entropy, optimal codes and compression, cross-entropy and KL divergence, mutual information, and perplexity — the language behind likelihoods, trees, VI and language models.',
  lessons, sources, python,
  math: ['ai.info', 'pre.log', 'calc.explog', 'stat.rv'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Surprise, entropy in bits and nats, prefix and Huffman codes, the source coding theorem, prediction as compression, cross-entropy, KL divergence and its asymmetry, log-loss as maximum likelihood, mutual information and information gain, estimator bias and shuffled baselines, perplexity, label smoothing, rate–distortion and MDL.',
}
