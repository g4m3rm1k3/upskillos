import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'

export default {
  number: 18,
  short: 'Eigenvectors, SVD & PCA',
  question: 'Can many correlated numbers be summarized by a few?',
  intro: 'Project data onto the directions of greatest variance, derive them as eigenvectors, and compress images into a handful of numbers.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'),
  math: ['la.eigen', 'la.diag', 'la.spectral', 'la.svd', 'la.lowrank', 'la.pca', 'la.pysvd', 'tool.matrix3d'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Projections, covariance matrices, eigenvectors and eigenvalues, principal components, centering and scaling, explained variance, SVD, reconstruction error, and uses and limits of PCA.',
}
