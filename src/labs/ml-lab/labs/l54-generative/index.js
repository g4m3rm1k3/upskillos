import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 54,
  short: 'GANs & diffusion',
  question: 'How do modern models generate sharp, diverse new data — and why do some fail?',
  intro: 'Generative adversarial networks, their optimal discriminator, saturation and mode collapse; denoising diffusion models, their forward process, noise-prediction training and sampling; and how to choose and evaluate generative models.',
  lessons, sources, python,
  math: ['stat.normal', 'ai.stochastic', 'ai.info', 'calc.optim'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The GAN game, the optimal discriminator and Jensen–Shannon divergence, saturating and non-saturating losses, training balance and mode collapse, stabilizers, the diffusion forward process and its closed form, the noise-prediction loss, ancestral sampling, score matching in outline, sampling cost, model families, evaluation, memorization and conditioning.',
}
