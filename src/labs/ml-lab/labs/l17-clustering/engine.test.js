import { describe, it, expect } from 'vitest'
import { kmeans, silhouette, randIndex, dbscan, bestOf } from './engine.js'
import { clusterData } from '../../kit/clusterData.js'

describe('lab 17 clustering', () => {
  it('k-means inertia never increases and recovers round blobs', () => {
    const pts = clusterData('blobs'), m = kmeans(pts, 3, { init: 'plusplus', seed: 2 })
    for (let i = 1; i < m.history.length; i++) expect(m.history[i].inertia).toBeLessThanOrEqual(m.history[i - 1].inertia + 1e-9)
    expect(randIndex(bestOf(pts, 3, 4, 'plusplus', 1).labels, pts.map(p => p.truth))).toBeGreaterThan(0.95)
    expect(silhouette(pts, m.labels)).toBeGreaterThan(0.5)
  })
  it('DBSCAN separates the moons that k-means cuts', () => {
    const pts = clusterData('moons'), db = dbscan(pts, 0.3, 5)
    expect(db.clusters).toBe(2)
    const truth = pts.map(p => p.truth)
    expect(randIndex(db.labels, truth)).toBeGreaterThan(0.95)
    expect(randIndex(bestOf(pts, 2, 4, 'plusplus', 1).labels, truth)).toBeLessThan(0.8)
  })
})
