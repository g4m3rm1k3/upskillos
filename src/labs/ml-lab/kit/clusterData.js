// Unlabeled 2D datasets for clustering (Labs 17–18).
import { random, normal, range } from './math.js'

export const CLUSTER_SETS = [['blobs', 'Three round clusters'], ['unequal', 'Clusters of unequal size and spread'], ['stretched', 'Stretched (anisotropic) clusters'], ['moons', 'Two moons'], ['uniform', 'No clusters at all (uniform)']]
export function clusterData(kind = 'blobs', { n = 240, seed = 1 } = {}) {
  const rng = random(seed)
  if (kind === 'uniform') return range(n).map(() => ({ x1: -3 + 6 * rng(), x2: -3 + 6 * rng() }))
  if (kind === 'moons') return range(n).map(() => { const t = Math.PI * rng(), a = rng() < 0.5; return { x1: 1.6 * (a ? Math.cos(t) - 0.5 : 0.5 - Math.cos(t)) + 0.12 * normal(rng), x2: 1.6 * (a ? Math.sin(t) - 0.25 : 0.25 - Math.sin(t)) + 0.12 * normal(rng), truth: a ? 0 : 1 } })
  const specs = kind === 'unequal' ? [[-1.5, -1, 1.1, 0.6], [1.8, 1.6, 0.3, 0.25], [2, -1.6, 0.35, 0.15]]
    : kind === 'stretched' ? [[-1.5, 0, 0.5, 0.34], [0.5, 0, 0.5, 0.33], [2.5, 0, 0.5, 0.33]]
      : [[-1.8, -1.2, 0.55, 1 / 3], [1.6, -0.9, 0.55, 1 / 3], [0, 1.8, 0.55, 1 / 3]]
  return range(n).map(() => {
    let u = rng(), k = 0; while (k < specs.length - 1 && u > specs[k][3]) { u -= specs[k][3]; k++ }
    const [cx, cy, s] = specs[k], a = normal(rng) * s, b = normal(rng) * s
    return kind === 'stretched' ? { x1: cx + 0.35 * a + 0.9 * b, x2: cy + 2.6 * b, truth: k } : { x1: cx + a, x2: cy + b, truth: k }
  })
}
