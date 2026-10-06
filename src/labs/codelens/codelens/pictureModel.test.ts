import { describe, expect, it } from 'vitest'
import { buildPicture, effectLine, indexVariables, type ArrayPicture, type GridPicture, type MapPicture, type NodesPicture } from './pictureModel'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import type { HeapDelta, TraceEvent } from './types'

// A tiny trace: one event per entry, at the given line, with the given locals and changes.
function trace(steps: { line: number; locals: Record<string, unknown>; heap?: HeapDelta[]; reads?: unknown[][] }[]): TraceEvent[] {
  return steps.map((s, stepId) => ({
    stepId, type: 'statement_enter', sourceLocation: { line: s.line },
    stackSnapshot: [{ name: '(global)', locals: s.locals }], heapDelta: s.heap ?? [], reads: s.reads,
  }))
}

function picture(events: TraceEvent[], source: string, step = events.length - 1) {
  return buildPicture(buildHeapSnapshot(events, step), events, step, source)
}

describe('indexVariables', () => {
  it('finds the variables each container is indexed by, per axis', () => {
    const found = indexVariables('cards[i], cards[j] = cards[j], cards[i]\ndp[i - 1][j - 1] + 1\nQ[s, a] += 1\nrest = a[1:]  # a[k] in a comment')
    expect(found.get('cards')).toEqual({ axes: [['i', 'j']], tuple: false })
    expect(found.get('dp')).toEqual({ axes: [['i'], ['j']], tuple: false })
    expect(found.get('Q')).toEqual({ axes: [['s'], ['a']], tuple: true })
    expect(found.get('a')?.axes.flat()).toEqual([])   // a slice isn't an index, and comments don't count
  })

  it('ignores names that are never positions on their own', () => {
    expect(indexVariables('x = arr[len(arr) - 1]').get('arr')).toEqual({ axes: [[]], tuple: false })
    expect(indexVariables('alive += grid[r + dr][c + dc]\nnxt[r][c] = 1').get('grid')).toEqual({ axes: [[], []], tuple: false })
    expect(indexVariables('heap[left] < heap[2 * i + 1]').get('heap')).toEqual({ axes: [['left']], tuple: false })
  })
})

describe('arrays', () => {
  const create: HeapDelta = { op: 'create', objectId: 1, objectType: 'list', properties: { 0: 'A', 1: 'B', 2: 'C', 3: 'D' } }
  const source = 'cards[i], cards[j] = cards[j], cards[i]'

  it('marks a swap, the cells read, and the index variables', () => {
    const events = trace([
      { line: 1, locals: { cards: { $ref: 1 }, i: 3, j: 1 }, heap: [create] },
      { line: 2, locals: { cards: { $ref: 1 }, i: 3, j: 1 }, heap: [
        { op: 'mutate', objectId: 1, property: '3', oldValue: 'D', newValue: 'B' },
        { op: 'mutate', objectId: 1, property: '1', oldValue: 'B', newValue: 'D' },
      ], reads: [[1, '1'], [1, '3']] },
    ])
    const p = picture(events, source)
    const a = p.structures[0] as ArrayPicture
    expect(a.kind).toBe('array')
    expect(a.cells.map(c => c.value)).toEqual(['A', 'D', 'C', 'B'])
    expect(a.swaps).toEqual([[1, 3]])
    expect(a.cells[1].read && a.cells[3].read).toBe(true)
    expect(a.cells[1].written).toEqual({ old: 'B' })
    expect(a.pointers).toEqual([{ name: 'i', index: 3 }, { name: 'j', index: 1 }])
    expect(p.line).toBe(1)
    expect(p.notes).toEqual(['cards[1] and cards[3] swapped: "B" and "D" changed places.'])
  })

  it('tells a copy from a neighbour (insertion sort shifting) apart from a swap', () => {
    const events = trace([
      { line: 1, locals: { a: { $ref: 1 } }, heap: [{ op: 'create', objectId: 1, objectType: 'list', properties: { 0: 5, 1: 2, 2: 9 } }] },
      { line: 2, locals: { a: { $ref: 1 } }, heap: [{ op: 'mutate', objectId: 1, property: '1', oldValue: 2, newValue: 5 }] },
    ])
    const a = picture(events, 'a[j + 1] = a[j]').structures[0] as ArrayPicture
    expect(a.swaps).toEqual([])
    expect(a.moves).toEqual([{ from: 0, to: 1 }])
  })

  it('shows a pointer one past the end (hi = len), but not a negative one', () => {
    const events = trace([{ line: 1, locals: { a: { $ref: 1 }, lo: -1, hi: 3 }, heap: [{ op: 'create', objectId: 1, objectType: 'list', properties: { 0: 1, 1: 2, 2: 3 } }] }])
    expect((picture(events, 'a[lo] a[hi]').structures[0] as ArrayPicture).pointers).toEqual([{ name: 'hi', index: 3 }])
  })
})

describe('grids', () => {
  it('draws a list of lists as a grid, with the cell written and the cells it was computed from', () => {
    const events = trace([
      { line: 1, locals: { dp: { $ref: 1 }, i: 1, j: 1 }, heap: [
        { op: 'create', objectId: 2, objectType: 'list', properties: { 0: 0, 1: 0 } },
        { op: 'create', objectId: 3, objectType: 'list', properties: { 0: 0, 1: 0 } },
        { op: 'create', objectId: 1, objectType: 'list', properties: { 0: { $ref: 2 }, 1: { $ref: 3 } } },
      ] },
      { line: 2, locals: { dp: { $ref: 1 }, i: 1, j: 1 }, heap: [{ op: 'mutate', objectId: 3, property: '1', oldValue: 0, newValue: 1 }],
        reads: [[1, '0'], [2, '0'], [1, '1']] },
    ])
    const p = picture(events, 'dp[i][j] = dp[i - 1][j - 1] + 1')
    const g = p.structures[0] as GridPicture
    expect(g.kind).toBe('grid')
    expect(g.cells.map(row => row.map(c => c.value))).toEqual([[0, 0], [0, 1]])
    expect(g.cells[1][1].written).toEqual({ old: 0 })
    expect(g.cells[0][0].read).toBe(true)
    expect(g.rowPointers).toEqual([{ name: 'i', index: 1 }])
    expect(g.columnPointers).toEqual([{ name: 'j', index: 1 }])
    expect(p.notes).toEqual(['dp[1][1] = 1 (was 0), from dp[0][0].'])
    // The rows are part of the grid, not separate arrays.
    expect(p.structures).toHaveLength(1)
  })

  it('draws a 2-D numpy array (rows of numbers), names its columns, and marks a row read as a whole', () => {
    const events = trace([
      { line: 1, locals: { Q: { $ref: 1 }, ACTIONS: { $ref: 2 }, s: 0, a: 1 }, heap: [
        { op: 'create', objectId: 2, objectType: 'list', properties: { 0: 'left', 1: 'right' } },
        { op: 'create', objectId: 1, objectType: 'ndarray', properties: { 0: [0, 0], 1: [0, 0] } },
      ] },
      { line: 2, locals: { Q: { $ref: 1 }, ACTIONS: { $ref: 2 }, s: 0, a: 1 }, heap: [{ op: 'mutate', objectId: 1, property: '0', oldValue: [0, 0], newValue: [0, 0.5] }],
        reads: [[1, '0', 1], [1, '1']] },
    ])
    const p = picture(events, 'Q[s, a] = Q[s, a] + 0.5 * (1 + Q[1].max())')
    const g = p.structures.find(s => s.kind === 'grid') as GridPicture
    expect(g.cells[0][1]).toMatchObject({ value: 0.5, written: { old: 0 }, read: true })
    expect(g.cells[0][0].written).toBeUndefined()
    expect(g.rowsRead).toEqual([1])
    expect(g.columnLabels).toEqual(['left', 'right'])
    expect(g.indexing).toBe('tuple')
    expect(p.notes[0]).toBe('Q[0, 1] = 0.5 (was 0).')
  })
})

describe('maps', () => {
  it('marks a new key in a dict', () => {
    const events = trace([
      { line: 1, locals: { memo: { $ref: 1 } }, heap: [{ op: 'create', objectId: 1, objectType: 'dict', properties: { 0: 0, 1: 1 } }] },
      { line: 2, locals: { memo: { $ref: 1 } }, heap: [{ op: 'mutate', objectId: 1, property: '2', newValue: 1 }], reads: [[1, '0'], [1, '1']] },
    ])
    const p = picture(events, 'memo[n] = memo[n - 1] + memo[n - 2]')
    const m = p.structures[0] as MapPicture
    expect(m.kind).toBe('map')
    expect(m.entries.find(e => e.key === '2')!.cell.written).toEqual({ old: undefined })
    expect(m.entries.filter(e => e.cell.read).map(e => e.key)).toEqual(['0', '1'])
    expect(p.notes).toEqual(['memo[2] = 1 (new key).'])
  })
})

describe('linked nodes', () => {
  const nodes: HeapDelta[] = [
    { op: 'create', objectId: 3, objectType: 'Node', properties: { value: 3, next: null } },
    { op: 'create', objectId: 2, objectType: 'Node', properties: { value: 2, next: { $ref: 3 } } },
    { op: 'create', objectId: 1, objectType: 'Node', properties: { value: 1, next: { $ref: 2 } } },
  ]

  it('draws a chain, labelled with the variables that point into it', () => {
    const events = trace([{ line: 1, locals: { head: { $ref: 1 }, cur: { $ref: 2 } }, heap: nodes }])
    const n = picture(events, '').structures[0] as NodesPicture
    expect(n.shape).toBe('chain')
    expect(n.nodes.map(x => [x.id, x.tags])).toEqual([[1, ['head']], [2, ['cur']], [3, []]])
    expect(n.edges.map(e => [e.from, e.to, e.label])).toEqual([[1, 2, 'next'], [2, 3, 'next']])
    expect(n.nulls).toEqual([{ id: 3, label: 'next', written: false }])
  })

  it('says when a link is redirected', () => {
    const events = trace([
      { line: 1, locals: { head: { $ref: 1 }, cur: { $ref: 2 }, prev: { $ref: 1 } }, heap: nodes },
      { line: 2, locals: { head: { $ref: 1 }, cur: { $ref: 2 }, prev: { $ref: 1 } }, heap: [{ op: 'mutate', objectId: 2, property: 'next', oldValue: { $ref: 3 }, newValue: { $ref: 1 } }] },
    ])
    const p = picture(events, '')
    expect(p.notes).toEqual(['cur.next now points to head (it pointed to #3).'])
    expect((p.structures[0] as NodesPicture).edges.find(e => e.from === 2)).toMatchObject({ to: 1, written: true })
  })

  it('draws a list whose last node points back into it (a cycle) as a chain', () => {
    const events = trace([{ line: 1, locals: { head: { $ref: 1 } }, heap: [
      { op: 'create', objectId: 3, objectType: 'Node', properties: { value: 3, next: null } },
      { op: 'create', objectId: 2, objectType: 'Node', properties: { value: 2, next: { $ref: 3 } } },
      { op: 'create', objectId: 1, objectType: 'Node', properties: { value: 1, next: { $ref: 2 } } },
      { op: 'mutate', objectId: 3, property: 'next', oldValue: null, newValue: { $ref: 2 } },
    ] }])
    const n = picture(events, '').structures[0] as NodesPicture
    expect(n.shape).toBe('chain')
    expect(n.roots).toEqual([1])
  })

  it('recognises a tree', () => {
    const events = trace([{ line: 1, locals: { root: { $ref: 1 } }, heap: [
      { op: 'create', objectId: 2, objectType: 'Node', properties: { key: 30, left: null, right: null } },
      { op: 'create', objectId: 3, objectType: 'Node', properties: { key: 70, left: null, right: null } },
      { op: 'create', objectId: 1, objectType: 'Node', properties: { key: 50, left: { $ref: 2 }, right: { $ref: 3 } } },
    ] }])
    const n = picture(events, '').structures[0] as NodesPicture
    expect(n.shape).toBe('tree')
    expect(n.roots).toEqual([1])
  })
})

describe('effectLine', () => {
  it('is the previous step\'s line for a tracer that reports the next line, and the write\'s own for the JavaScript interpreter', () => {
    const events = trace([{ line: 4, locals: {} }, { line: 9, locals: {} }])
    expect(effectLine(events, 1)).toBe(4)
    expect(effectLine(events, 0)).toBeNull()
    expect(effectLine([{ stepId: 0, type: 'object_mutate', sourceLocation: { line: 7 } }], 0)).toBe(7)
  })
})

describe('JavaScript', () => {
  it('gathers the writes of one statement, so a destructuring swap is one swap at its own line', async () => {
    const { run } = await import('../../../engines/js/interpreter/interpreter.js')
    const source = 'const a = [5, 2, 9];\nlet i = 0, j = 2;\n[a[i], a[j]] = [a[j], a[i]];\n'
    const result = run(source)
    const events = result.events as TraceEvent[]
    const last = events.map((e, k) => ({ e, k })).filter(({ e }) => e.type === 'object_mutate').pop()!.k
    const p = buildPicture(buildHeapSnapshot(events, last), events, last, source, 'js')
    const a = p.structures.find(s => s.kind === 'array' && s.name === 'a') as ArrayPicture
    expect(p.line).toBe(3)
    expect(a.cells.map(c => c.value)).toEqual([9, 2, 5])
    expect(a.swaps).toEqual([[0, 2]])
    expect(a.pointers).toEqual([{ name: 'i', index: 0 }, { name: 'j', index: 2 }])
    // The step where the statement finishes shows the whole swap too.
    const exit = events.findIndex((e, k) => k > last && e.type === 'statement_exit' && e.sourceLocation?.line === 3)
    const atExit = buildPicture(buildHeapSnapshot(events, exit), events, exit, source, 'js')
    expect((atExit.structures.find(s => s.kind === 'array' && s.name === 'a') as ArrayPicture).swaps).toEqual([[0, 2]])
  })
})

describe('plain objects', () => {
  it('draws a JavaScript object used as a lookup table as a map, and one that links to others as nodes', async () => {
    const { run } = await import('../../../engines/js/interpreter/interpreter.js')
    const source = 'const memo = {};\nmemo[1] = 1;\nconst list = { value: 1, next: { value: 2, next: null } };\n'
    const events = run(source).events as TraceEvent[]
    const last = events.length - 1
    const p = buildPicture(buildHeapSnapshot(events, last), events, last, source, 'js')
    expect(p.structures.find(s => s.kind === 'map')).toMatchObject({ name: 'memo' })
    expect(p.structures.find(s => s.kind === 'nodes')).toMatchObject({ shape: 'chain' })
  })
})

describe('every library example', () => {
  it('draws a picture at every step of its JavaScript trace, and shows something by the end', async () => {
    const { run } = await import('../../../engines/js/interpreter/interpreter.js')
    const { LIBRARY } = await import('./library')
    const empty: string[] = []
    for (const example of LIBRARY) {
      const variant = example.variants.js
      if (!variant || variant.input !== undefined) continue
      const events = run(variant.code, { limits: { maxSnapshotItems: 12 } }).events as TraceEvent[]
      let drawn = 0
      for (let step = 0; step < events.length; step++) {
        const p = buildPicture(buildHeapSnapshot(events, step), events, step, variant.code, 'js')
        drawn = Math.max(drawn, p.structures.length)
      }
      if (example.id.startsWith('algo-') && !drawn) empty.push(example.id)
    }
    expect(empty).toEqual([])
  }, 120000)
})
