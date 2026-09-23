import { describe, it, expect } from 'vitest'
import { DOCS, chunk, buildIndex, retrieve, evaluate, answer } from './engine.js'

describe('lab 34 retrieval', () => {
  const idx = buildIndex(chunk(DOCS, 2))
  it('paraphrases defeat lexical methods; semantic toy recovers them', () => {
    expect(evaluate(idx, { method: 'bm25', k: 1 }).recall).toBeLessThan(0.85)
    expect(evaluate(idx, { method: 'semantic', k: 1 }).recall).toBeGreaterThan(0.9)
  })
  it('permissions filter restricted runbooks; answers are grounded', () => {
    expect(retrieve(idx, 'promote a replica to primary', { canSeeRestricted: false }).some(d => d.restricted)).toBe(false)
    expect(retrieve(idx, 'promote a replica to primary', { canSeeRestricted: true })[0].id).toBe('db-failover')
    const q = 'why are my builds slow after changing the lockfile'
    expect(answer(retrieve(idx, q), q).id).toBe('ci-cache')
  })
})
