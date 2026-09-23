// Shared 2D classification datasets: { x1, x2, label } with label ∈ {0, 1}.
import { random, normal, shuffle } from './math.js'

export const DATASETS = [['blobs', 'Two blobs (separable)'], ['overlap', 'Overlapping blobs'], ['moons', 'Two moons'], ['circles', 'Circle inside ring'], ['xor', 'XOR quadrants'], ['spiral', 'Two spirals']]

export function classification(kind = 'blobs', { n = 160, noise = 0.25, seed = 1, imbalance = 0.5 } = {}) {
  const rng = random(seed), points = []
  for (let i = 0; i < n; i++) {
    const label = rng() < imbalance ? 1 : 0
    let x1, x2
    if (kind === 'blobs' || kind === 'overlap') {
      const spread = kind === 'blobs' ? 0.55 : 1.1
      x1 = (label ? 1.2 : -1.2) + spread * normal(rng); x2 = (label ? 0.8 : -0.6) + spread * normal(rng)
    } else if (kind === 'moons') {
      const t = Math.PI * rng()
      x1 = label ? 1 - Math.cos(t) - 0.5 : Math.cos(t) - 0.5; x2 = label ? 0.35 - Math.sin(t) : Math.sin(t) - 0.15
      x1 *= 1.5; x2 *= 1.5; x1 += noise * normal(rng); x2 += noise * normal(rng)
    } else if (kind === 'circles') {
      const a = 2 * Math.PI * rng(), r = label ? 0.7 + 0.25 * rng() : 1.7 + 0.35 * rng()
      x1 = r * Math.cos(a) + noise * 0.6 * normal(rng); x2 = r * Math.sin(a) + noise * 0.6 * normal(rng)
    } else if (kind === 'xor') {
      x1 = 2 * (2 * rng() - 1); x2 = 2 * (2 * rng() - 1)
      const truth = (x1 > 0) !== (x2 > 0) ? 1 : 0
      points.push({ x1: x1 + noise * 0.3 * normal(rng), x2: x2 + noise * 0.3 * normal(rng), label: truth })
      continue
    } else {
      const t = 0.3 + 2.6 * Math.PI * rng() / Math.PI, angle = t * Math.PI + (label ? Math.PI : 0), r = 0.35 * t * 1.1
      x1 = r * Math.cos(angle) + noise * 0.25 * normal(rng); x2 = r * Math.sin(angle) + noise * 0.25 * normal(rng)
    }
    points.push({ x1, x2, label })
  }
  return points
}

// Seeded split into train/validation, stratified is unnecessary for these sizes.
export function split(points, fraction = 0.7, seed = 1) {
  const s = shuffle(points, random(seed + 17)), k = Math.floor(points.length * fraction)
  return { train: s.slice(0, k), validation: s.slice(k) }
}
export const accuracy = (points, predict) => points.filter(p => (predict(p.x1, p.x2) >= 0.5 ? 1 : 0) === p.label).length / points.length
export const bounds = points => {
  const xs = points.map(p => p.x1), ys = points.map(p => p.x2)
  const pad = (a, b) => { const d = (b - a) * 0.08 || 1; return [a - d, b + d] }
  return { x: pad(Math.min(...xs), Math.max(...xs)), y: pad(Math.min(...ys), Math.max(...ys)) }
}
