import { describe, it, expect } from 'vitest'
import { trainArtifact, requests, parity, simulateQueue, handle } from './engine.js'

describe('lab 29 serving', () => {
  const A = trainArtifact(), R = requests()
  it('shared code has parity; every rewritten server does not', () => {
    expect(parity(A, 'shared', R).passed).toBe(true)
    for (const s of ['log10', 'batchStats', 'onehot']) expect(parity(A, s, R).passed).toBe(false)
  })
  it('batching raises capacity; overload explodes latency', () => {
    expect(simulateQueue({ rate: 100, maxBatch: 1 }).p95).toBeGreaterThan(200)
    expect(simulateQueue({ rate: 100, maxBatch: 8, maxWait: 5 }).p95).toBeLessThan(60)
    expect(simulateQueue({ rate: 20, maxBatch: 1 }).utilization).toBeLessThan(0.3)
  })
  it('API validates the contract', () => {
    expect(handle(A, JSON.stringify(R[0])).status).toBe(200)
    expect(handle(A, '{"size_mb": "40"}').status).toBe(422)
    expect(handle(A, 'not json').status).toBe(400)
  })
})
