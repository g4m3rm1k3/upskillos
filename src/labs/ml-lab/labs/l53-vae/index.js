import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 53,
  short: 'Autoencoders & VAEs',
  question: 'How can a network learn to compress data — and then generate new examples of it?',
  intro: 'Autoencoders and bottlenecks, denoising and anomaly detection, the variational autoencoder and its ELBO, the reparameterization trick, sampling, β and posterior collapse.',
  lessons, sources, python,
  math: ['stat.normal', 'ai.info', 'calc.integral', 'pre.log', 'ai.sampling'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Encoders, decoders and bottlenecks, reconstruction losses, links to PCA, denoising and anomaly scores, the VAE generative model, the ELBO with reconstruction and KL terms, the Gaussian KL, the reparameterization trick, generation and interpolation, β-VAEs and posterior collapse, blurriness, latent diffusion and representation learning.',
}
