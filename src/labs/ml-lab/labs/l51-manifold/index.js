import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 51,
  short: 'Nonlinear DR & ICA',
  question: 'How do you find structure that no straight-line projection can reveal — and read the maps honestly?',
  intro: 'Independent component analysis for unmixing signals, Isomap for unrolling curved manifolds, and t-SNE (with UMAP) for drawing neighbourhoods — each with what it preserves and what it distorts.',
  lessons, sources, python,
  math: ['la.eigen', 'la.svd', 'dm.graphs', 'stat.distributions', 'ai.pca'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'The manifold hypothesis and what embeddings preserve, ICA (non-Gaussianity, whitening, FastICA, ambiguities, the Gaussian failure case), Isomap (neighbourhood graphs, geodesic distances, classical MDS, short circuits), t-SNE (perplexity, heavy tails, the KL objective, crowding), UMAP in outline, and honest interpretation of nonlinear maps.',
}
