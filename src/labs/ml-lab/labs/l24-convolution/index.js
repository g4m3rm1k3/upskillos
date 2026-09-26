import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'
import { conv } from './ladder.js'
export default {
  number: 24,
  short: 'Convolution & vision',
  question: 'How can a network recognize a pattern anywhere in an image?',
  intro: 'Slide small learned filters across images, share their weights everywhere, pool away position, and evaluate vision models without source leakage.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'), ladders: { conv },
  math: ['ai.fourier', 'la.matmul', 'ai.tensors', 'calc.sum'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Convolution (cross-correlation) with stride and padding, output sizes, kernels as feature detectors, weight sharing, equivariance and pooling, receptive fields, deep CNN building blocks, augmentation, transfer learning and image-source leakage.',
}
