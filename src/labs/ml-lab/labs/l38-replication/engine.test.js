import { describe, it, expect } from 'vitest'
import { PAPER, runExperiment, suggest, report, CLAIMS, bootstrap, EXPERIMENTS, BUDGET } from './engine.js'

describe('lab 38 research replication', () => {
  const r = Object.fromEntries(['reproduce', 'seeds', 'ablation', 'tuned', 'noise'].map(id => [id, runExperiment(id)]))
  it('the paper reproduces exactly but replicates only partially', () => {
    expect(r.reproduce.method).toBe(PAPER.method)
    expect(r.reproduce.baseline).toBe(PAPER.baseline)
    expect(r.seeds.lo).toBeGreaterThan(0)
    expect(r.seeds.mean).toBeLessThan((PAPER.method - PAPER.baseline) / 2)
    const [lo, hi] = bootstrap(r.seeds.diff)
    expect(lo).toBeGreaterThan(0); expect(hi).toBeLessThan(0.086)
  })
  it('ablation and a tuned baseline attribute the gain elsewhere', () => {
    expect(r.ablation.rows[0].lo).toBeLessThanOrEqual(0)
    expect(r.ablation.rows[1].lo).toBeGreaterThan(0)
    expect(r.tuned.meanB).toBeGreaterThanOrEqual(r.tuned.meanA)
    expect(Object.values(suggest(r)).map(v => v.verdict)).toEqual(['partial', 'partial', 'not', 'not'])
  })
  it('the budget cannot cover every experiment; the report lists every claim', () => {
    expect(EXPERIMENTS.reduce((s, e) => s + e.runs, 0)).toBeGreaterThan(BUDGET)
    const md = report(CLAIMS, { c1: 'partial' }, { c1: 'seed 9 only' }, { seeds: r.seeds })
    expect(md).toContain('Compute used: 20 of 100')
    expect(md).toContain('**Verdict:** Partially replicated')
    expect(md.match(/## Claim/g)).toHaveLength(4)
  })
})
