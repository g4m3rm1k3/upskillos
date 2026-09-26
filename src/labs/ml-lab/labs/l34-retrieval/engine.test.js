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
  it('a paraphrase retrieved by the semantic method is also answered from it (not reported as missing)', () => {
    const idx = buildIndex(chunk(DOCS, 2)), q = 'workers crash from insufficient RAM'
    const res = retrieve(idx, q, { method: 'semantic' })
    expect(res[0].id).toBe('oom')
    expect(answer(res, q, { semantic: true }).id).toBe('oom')
    expect(answer(res, q)).toBeNull()        // literal word overlap alone finds nothing: the bug this guards against
  })
})
