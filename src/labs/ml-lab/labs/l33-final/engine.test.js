import { describe, it, expect } from 'vitest'
import { parseTable, compare, readiness, exportPlan } from './engine.js'

describe('lab 33 final capstone', () => {
  const csv = 'x,noise,y\n' + Array.from({ length: 40 }, (_, i) => `${i},${(i * 7919) % 13},${3 * i + ((i * 31) % 5)}`).join('\n')
  it('parses CSV and shows a linear model beating the baseline on real signal', () => {
    const t = parseTable(csv); expect(t.numeric).toEqual(['x', 'noise', 'y'])
    const r = compare(t.rows, 'y', ['x']); expect(r.model.mean).toBeLessThan(0.2 * r.baseline.mean)
    expect(compare(t.rows, 'y', ['x'], { ordered: true }).folds).toBe(4)
    expect(() => parseTable('a,b\n1')).toThrow()
  })
  it('readiness counts drafted items and exports every section', () => {
    const r = readiness({ decision: 'Route long builds to dedicated runners before they start.' })
    expect(r.items.filter(i => i.done)).toHaveLength(1)
    expect(exportPlan({}, 'Plan')).toContain('## Operation')
  })
})
