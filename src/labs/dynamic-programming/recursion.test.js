import { expect, it } from 'vitest'
import { traceSum } from './RecursionLesson.jsx'

it('traces every supported input with balanced frames and correct sums', () => {
  for (let n = 0; n <= 5; n++) {
    const trace = traceSum(n)
    expect(trace.at(-1).result).toBe(n * (n + 1) / 2)
    expect(trace.at(-1).stack).toEqual([])
    expect(Math.max(...trace.map(e => e.stack.length))).toBe(n + 1)
    expect(trace.filter(e => e.message.startsWith('Call ')).length).toBe(n + 1)
    expect(trace.filter(e => e.message.startsWith('Return ')).length).toBe(n + 1)
    for (let i = 1; i < trace.length; i++) expect(Math.abs(trace[i].stack.length - trace[i - 1].stack.length)).toBe(1)
  }
})
