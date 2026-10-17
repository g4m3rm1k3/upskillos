// Visual playground: the experiment registry, and which experiment each lesson opens with.
import { useState } from 'react'
import { Combine, DotProjection, SvdCircle, Transform, UnitCircle } from './explore/vectors.jsx'
import { Eliminate, SolutionSet, Truss } from './explore/systems.jsx'
import { Bellman, Descent, Fit, Pca } from './explore/data.jsx'
import { Space3D } from './explore/space3d.jsx'
import { CurvedMap, Hill, Zoom } from './explore/calculus.jsx'

export { eigen2, solveLinear, svd2 } from './explore/parts.jsx'
export { trussForces } from './explore/systems.jsx'
export { curvedJacobian, curvedMap, hillGradient, hillHeight } from './explore/calculus.jsx'
export { bellmanTrace, descentTrace, fitLine, covariance } from './explore/data.jsx'
export { det3, cross } from './explore/space3d.jsx'

export const GROUPS = [
  ['Vectors', [['combine', 'Combine vectors', Combine], ['dot', 'Dot & projection', DotProjection]]],
  ['Matrices', [['circle', 'Unit circle', UnitCircle], ['transform', 'Matrix as a map', Transform], ['svd', 'Circle to ellipse (SVD)', SvdCircle]]],
  ['Systems & space', [['eliminate', 'Row operations', Eliminate], ['solutions', 'Solution sets', SolutionSet], ['space3d', '3D span & volume', Space3D], ['truss', 'Bridge truss', Truss]]],
  ['Calculus', [['zoom', 'Zoom to straight', Zoom], ['hill', 'Hill map & gradient', Hill], ['curved', 'Curved map & Jacobian', CurvedMap]]],
  ['Data & learning', [['fit', 'Least squares', Fit], ['pca', 'Principal directions', Pca], ['descent', 'Gradient descent', Descent], ['bellman', 'Bellman updates', Bellman]]],
]
export const EXPERIMENTS = GROUPS.flatMap(([, items]) => items)

const BY_LESSON = {
  'laml-why-linear-algebra': 'transform', 'laml-arrays': 'combine', 'laml-add-scale': 'combine', 'laml-shopping-bill': 'dot', 'laml-work-force': 'dot',
  'laml-slope': 'zoom', 'laml-gradient': 'hill', 'laml-jacobian': 'curved', 'laml-chain-rule': 'curved', 'laml-vectorized-gradient': 'hill', 'laml-descent-convergence': 'descent',
  'laml-sin-cos': 'circle', 'laml-matrix-vector': 'transform', 'laml-truss': 'truss', 'laml-why-equations': 'eliminate', 'laml-circuit': 'eliminate',
  'laml-dot-product': 'dot', 'laml-length-distance-cosine': 'combine', 'laml-projection': 'dot', 'laml-orthogonal-qr': 'dot', 'laml-gram-schmidt': 'dot',
  'laml-two-multiplications': 'transform', 'laml-markov-state-vectors': 'transform', 'laml-orthogonal-matrices': 'transform',
  'laml-determinant-area': 'transform', 'laml-elimination': 'eliminate', 'laml-lu-pivoting': 'eliminate', 'laml-invertibility': 'eliminate',
  'laml-span-rank': 'space3d', 'laml-subspaces-3d': 'space3d', 'laml-basis-dimension': 'space3d', 'laml-vector-spaces': 'combine', 'laml-change-of-basis': 'combine',
  'laml-nullspace': 'solutions', 'laml-four-subspaces': 'solutions',
  'laml-least-squares': 'fit', 'laml-regression-validation': 'fit', 'laml-ridge-scaling': 'fit',
  'laml-covariance-pca': 'pca', 'laml-pca-ridge-capstone': 'pca', 'laml-recommendation-studio': 'svd',
  'laml-svd-low-rank': 'svd', 'laml-spectral-svd-theorem': 'svd', 'laml-symmetric-quadratic': 'transform', 'laml-positive-definite': 'transform',
}
const BY_MODULE = { 'Vectors: arrows and lists': 'combine', 'The dot product': 'dot', 'Matrices are machines': 'transform', 'Solving many equations': 'eliminate', 'Spaces and bases': 'space3d', 'Least squares and data': 'fit', 'Calculus meets matrices': 'hill', 'Spectral thinking': 'transform', 'Spectral theory': 'transform', 'Math for machine learning': 'descent', 'Dynamic programming': 'bellman', 'Mastery studio': 'bellman' }
export const experimentFor = lesson => BY_LESSON[lesson.id] || BY_MODULE[lesson.module] || 'combine'

export default function Explore({ lesson }) {
  const [mode, setMode] = useState(() => experimentFor(lesson))
  const [, title, Body] = EXPERIMENTS.find(([id]) => id === mode)
  return <section className="la-card la-experiment">
    <div className="la-section-title"><div><div className="la-eyebrow">Visual playground</div><h2>{title}</h2></div></div>
    <p className="la-muted">Predict first, then move one thing at a time. Drag the coloured tips, or focus one and use the arrow keys.</p>
    <div className="la-experiments" role="group" aria-label="Choose an experiment">{GROUPS.map(([group, items]) => <div key={group}><span>{group}</span><div className="la-segmented">{items.map(([id, name]) => <button key={id} type="button" aria-pressed={id === mode} onClick={() => setMode(id)}>{name}</button>)}</div></div>)}</div>
    <div className="la-legend" aria-hidden="true">{[['i', 'e₁ / column 1'], ['j', 'e₂ / column 2'], ['v', 'input v'], ['out', 'result'], ['dir', 'direction'], ['err', 'residual']].map(([tone, name]) => <span key={tone} style={{ '--tone': `var(--c-${tone})` }}>{name}</span>)}</div>
    <Body key={mode} />
  </section>
}
