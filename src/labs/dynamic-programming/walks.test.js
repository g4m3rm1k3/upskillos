// Walking back the answer: from the answer cell, every step moves to a cell the value was really computed
// from, the steps' gains add up to the answer, and the solution read off the walk is a real solution
// (a common subsequence, items that fit, edits that make the target), on the example and random inputs.
import { describe, expect, it } from 'vitest'
import { TRACES, INPUTS, defaultInput } from './tables.js'
import { formatField, parseInput, randomInput } from './traceInputs.js'
import { WALKS, walkFrom, spell } from './walks.js'

const isSub = (small, big) => { let k = 0; for (const ch of big) if (ch === small[k]) k++; return k === small.length }
const pieces = (id, steps) => steps.map(s => s.option.adds).filter(x => x !== undefined)
// The pieces in forward order (walks collect them backwards).
const fwd = steps => pieces('', steps).reverse()
const sum = xs => xs.reduce((a, b) => a + b, 0)
const isPal = w => w === [...w].reverse().join('')
const ranges = steps => fwd(steps).map(x => x.split('–').map(Number))
const covers = (rs, n) => rs.every(([a, b], k) => a === (k ? rs[k - 1][1] + 1 : 1) && b >= a) && rs.at(-1)?.[1] === n
const trades = steps => fwd(steps).map(x => [x.split(' ')[0], Number(x.split(' ')[2])])
const alternates = tr => tr.every(([op, d], k) => op === (k % 2 ? 'sell' : 'buy') && (k === 0 || d > tr[k - 1][1])) && tr.length % 2 === 0

// What makes each walk's result a real solution, beyond adding up to the answer.
const VALID = {
  lcs: (trace, steps) => { const s = spell('lcs', steps); return isSub(s, trace.args[0]) && isSub(s, trace.args[1]) },
  'lcs-reconstruct': (trace, steps) => { const s = spell('lcs-reconstruct', steps); return isSub(s, trace.args[0]) && isSub(s, trace.args[1]) },
  'edit-distance': (trace, steps) => spell('edit-distance', steps) === trace.args[1],
  'shortest-supersequence': (trace, steps) => { const s = spell('shortest-supersequence', steps); return isSub(trace.args[0], s) && isSub(trace.args[1], s) },
  'zero-one-knapsack': (trace, steps) => { const items = pieces('', steps).map(x => Number(x.split(' ')[1])); return new Set(items).size === items.length && items.reduce((s, i) => s + trace.args[0][i - 1], 0) <= trace.args[2] },
  'unbounded-knapsack': (trace, steps) => pieces('', steps).reduce((s, x) => s + trace.args[0][Number(x.split(' ')[1]) - 1], 0) <= trace.args[2],
  'coin-min': (trace, steps) => pieces('', steps).reduce((s, x) => s + Number(x), 0) === trace.args[1],
  'rod-cutting': (trace, steps) => pieces('', steps).reduce((s, x) => s + Number(x), 0) === trace.args[1],
  'house-robber': (trace, steps) => { const h = pieces('', steps).map(Number).sort((x, y) => x - y); return h.every((x, k) => k === 0 || x - h[k - 1] >= 2) },
  'min-grid-path': (trace, steps) => { const cells = spell('min-grid-path', steps).split(' → '); return cells[0] === '(0,0)' && cells.at(-1) === `(${trace.args[0].length - 1},${trace.args[0][0].length - 1})` },
  'triangle-path': (trace, steps) => spell('triangle-path', steps).split(' → ').length === trace.args[0].length,
  lis: (trace, steps) => { const v = spell('lis', steps).split(', ').map(Number); return v.every((x, k) => k === 0 || x > v[k - 1]) && isSub(v.map(String), trace.args[0].map(String)) },
  'min-cost-stairs': (trace, steps) => { const p = fwd(steps).map(Number); return p[0] <= 1 && p.every((x, k) => k === 0 || x - p[k - 1] === 1 || x - p[k - 1] === 2) && p.at(-1) === trace.args[0].length - 1 },
  'max-subarray': (trace, steps) => { const v = fwd(steps).map(Number), a = trace.args[0]; return v.length > 0 && a.some((_, k) => v.every((x, m) => a[k + m] === x)) },
  'word-break': (trace, steps) => { const w = fwd(steps); return w.join('') === trace.args[0] && w.every(x => trace.args[1].includes(x)) },
  'subset-sum': (trace, steps) => sum(fwd(steps).map(Number)) === trace.args[1],
  'bounded-knapsack': (trace, steps) => { const [w, , k, cap] = trace.args, picks = fwd(steps).map(x => x.match(/item (\d+) ×(\d+)/).slice(1).map(Number)); return picks.every(([i, q]) => q <= k[i - 1]) && sum(picks.map(([i, q]) => q * w[i - 1])) <= cap },
  'exact-capacity': (trace, steps) => sum(fwd(steps).map(x => trace.args[0][Number(x.split(' ')[1]) - 1])) === trace.args[2],
  'value-knapsack': (trace, steps) => sum(fwd(steps).map(x => trace.args[0][Number(x.split(' ')[1]) - 1])) <= trace.args[2],
  'multidimensional-knapsack': (trace, steps) => { const [items, W, U] = trace.args, it = fwd(steps).map(x => items[Number(x.split(' ')[1]) - 1]); return sum(it.map(x => x[0])) <= W && sum(it.map(x => x[1])) <= U && new Set(fwd(steps)).size === it.length },
  'group-knapsack': (trace, steps) => { const o = fwd(steps).map(x => x.split(/[:/]/).map(Number)); return new Set(o.map(x => x[0])).size === o.length && sum(o.map(x => x[1])) <= trace.args[1] },
  'palindrome-cuts': (trace, steps) => fwd(steps).join('') === trace.args[0] && fwd(steps).every(isPal),
  'text-justification': (trace, steps) => { const [w, width] = trace.args, rs = ranges(steps); return covers(rs, w.length) && rs.every(([a, b]) => sum(w.slice(a - 1, b)) + (b - a) <= width) },
  'batch-scheduling': (trace, steps) => covers(ranges(steps), trace.args[0].length),
  'k-partitions': (trace, steps) => { const segs = fwd(steps).map(x => JSON.parse(x)); return segs.length === trace.args[1] && segs.flat().join() === trace.args[0].join() },
  'partition-max': (trace, steps) => { const segs = fwd(steps).map(x => JSON.parse(x)); return segs.length === trace.args[1] && segs.flat().join() === trace.args[0].join() && Math.max(...segs.map(sum)) === trace.table.get(...trace.answer) },
  'common-substring': (trace, steps) => { const s = spell('common-substring', steps); return s.length === trace.table.get(...trace.answer) && trace.args[0].includes(s) && trace.args[1].includes(s) },
  'weighted-edit': (trace, steps) => spell('weighted-edit', steps) === trace.args[1],
  'stock-states': (trace, steps) => alternates(trades(steps)),
  'stock-k': (trace, steps) => alternates(trades(steps)) && trades(steps).length / 2 <= trace.args[1],
  'stock-cooldown': (trace, steps) => { const tr = trades(steps); return alternates(tr) && tr.every(([op, d], k) => op !== 'buy' || k === 0 || d >= tr[k - 1][1] + 2) },
  'deadline-scheduling': (trace, steps) => { const js = [...trace.args[0]].sort((a, b) => a[2] - b[2]); let time = 0; return fwd(steps).map(x => js[Number(x.split(' ')[1]) - 1]).every(([d, , dl]) => (time += d) <= dl) },
  'grid-direction': (trace, steps) => { const g = trace.args[0], cells = spell('grid-direction', steps).split(' → ').map(x => x.slice(1, -1).split(',').map(Number)); return cells[0].join() === '0,0' && cells.at(-1).join() === `${g.length - 1},${g[0].length - 1}` && cells.every(([r, c], k) => k === 0 || (r - cells[k - 1][0]) + (c - cells[k - 1][1]) === 1) },
  'palindrome-subsequence': (trace, steps) => { const p = spell('palindrome-subsequence', steps); return isPal(p) && isSub(p, trace.args[0]) && p.length === trace.table.get(...trace.answer) },
  'weighted-intervals': (trace, steps) => { const iv = pieces('', steps).map(x => x.slice(1, -1).split(',').map(Number)); return iv.every(([s, e], k) => iv.every(([s2, e2], k2) => k === k2 || e <= s2 || e2 <= s)) },
}

function checkWalk(id, trace) {
  const t = trace.table, reads = new Map(t.steps.map(s => [s.at.join(), s.reads.map(r => r.join())]))
  const { steps, end } = walkFrom(id, trace, trace.answer)
  // Only an answer that is itself a base case (capacity 0, amount 0) has nothing to walk.
  if (!t.base.some(b => b.at.join() === trace.answer.join())) expect(steps.length, `${id}: the walk takes no step`).toBeGreaterThan(0)
  for (const { at, option } of steps) {
    expect(option.says.length, id).toBeGreaterThan(3)
    // A step goes to a cell this cell read, unless this cell is a base case (an edge walked along).
    if (option.from && reads.has(at.join())) expect(reads.get(at.join()), `${id}: ${t.name(...at)} → ${t.name(...option.from)}`).toContain(option.from.join())
  }
  // A yes/no table's walk ends on a true base case; any other walk's gains add up to the answer.
  if (WALKS[id].yes) expect(end && t.get(...end), `${id}: the walk ends on a true cell`).toBe(true)
  else {
    const gained = steps.reduce((s, x) => s + x.option.gain, 0) + (end ? t.get(...end) : 0)
    expect(gained, `${id} ${JSON.stringify(trace.args)}: gains`).toBe(WALKS[id].total ? WALKS[id].total(trace) : t.get(...trace.answer))
  }
  expect(VALID[id](trace, steps), `${id} ${JSON.stringify(trace.args)}: ${spell(id, steps)}`).toBe(true)
}

const rng = seed => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

describe('walking back the answer', () => {
  it('has a check for every walk', () => {
    for (const id of Object.keys(WALKS)) { expect(TRACES[id], id).toBeTruthy(); expect(VALID[id], id).toBeTruthy() }
  })
  for (const id of Object.keys(WALKS)) {
    it(`${id}: walks from the answer to a base case and reads off a real solution`, () => {
      checkWalk(id, TRACES[id]())
      const random = rng(id.length * 104729), spec = INPUTS[id]
      let tried = 0
      for (let i = 0; i < 200 && tried < 25; i++) {
        const value = randomInput(spec, random, defaultInput(id))
        const parsed = parseInput(spec, Object.fromEntries(spec.fields.map(f => [f.key, formatField(f, value[f.key])])))
        if (parsed.error) continue
        const trace = TRACES[id](parsed.value)
        const answer = trace.table.get(...trace.answer)
        // Nothing to walk back when there is no solution (∞, −∞, or no).
        if (answer === false || (typeof answer === 'number' && !Number.isFinite(answer))) continue
        tried++
        checkWalk(id, trace)
      }
      expect(tried).toBeGreaterThanOrEqual(10)
    })
  }
})
