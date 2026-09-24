import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 23,
  short: 'PyTorch with understanding',
  question: 'What does a deep-learning framework actually do for you?',
  intro: 'Map everything you built by hand onto tensors, autograd, modules and optimizers — then learn the conventions whose omission silently breaks training.',
  lessons, sources, python,
  math: ['ai.tensors', 'ai.autodiff', 'la.numpy'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Tensors and autograd, nn.Module and parameter registration, optimizers and their state, the training loop (zero_grad, train/eval, no_grad), data loaders, verifying a framework model against NumPy, devices, checkpoints and reproducibility. PyTorch itself runs on your machine via the downloadable script.',
}
