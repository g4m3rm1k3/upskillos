// Turns the program's data structures at one step into tables, for the dock under the
// editor (DataDock.tsx): a list of lists or a dict of lists becomes a grid (a Q-table:
// one row per state, one column per action), a flat list one row, a dict or object
// key/value pairs. Works from the heap snapshot (renderer/heapSnapshot.ts), so every
// language whose tracer records objects gets it.
import type { HeapObjectEntry, HeapSnapshot, StackFrame, TraceEvent } from './types'

export type Cell = { value: unknown; changed: boolean; ref?: number }

export interface Table {
  /** The variable it is shown for, e.g. "Q". */
  name: string
  objectId: number
  kind: 'grid' | 'row' | 'pairs'
  type: string
  /** "25 × 4", "4 items". */
  shape: string
  columns: string[]
  /** Where the column names came from, e.g. "names", when they are not just positions. */
  columnSource?: string
  rows: { key: string; cells: Cell[]; changed: boolean }[]
  /** Rows not shown (the tracer records at most a few dozen items per object). */
  more?: string
}

const MORE_KEY = '…'
const HIDDEN = new Set(['__mapData__', 'length'])

export function refId(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { $ref?: number; __kind?: string; objectId?: number }
  if (typeof v.$ref === 'number') return v.$ref
  if (v.__kind === 'reference' && typeof v.objectId === 'number') return v.objectId
  return null
}

function entries(obj: HeapObjectEntry): [string, unknown][] {
  return [...obj.properties].filter(([key]) => !HIDDEN.has(key) && key !== MORE_KEY)
}

const isIndexed = (keys: string[]) => keys.length > 0 && keys.every(k => /^\d+$/.test(k))
const byIndex = (a: string, b: string) => (/^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : 0)

/** Variables visible at this step, innermost frame first, each name once. */
export function visibleVariables(event: TraceEvent | null): [string, unknown][] {
  const frames: StackFrame[] = event?.stackSnapshot ?? []
  const globals = frames.filter(f => f.name === '(global)' || f.name === '__global__')
  const others = frames.filter(f => !globals.includes(f)).reverse()
  const seen = new Set<string>()
  const out: [string, unknown][] = []
  for (const frame of [...others, ...globals]) {
    for (const [name, value] of Object.entries(frame.locals ?? {})) {
      if (seen.has(name)) continue
      seen.add(name)
      out.push([name, value])
    }
  }
  return out
}

/** Every container a variable refers to, as a table. Grids first. */
export function buildTables(snapshot: HeapSnapshot | null, event: TraceEvent | null): Table[] {
  if (!snapshot) return []
  const changed = new Set<string>()
  const created = new Set<number>()
  // A numpy row is one property holding a list of numbers: keep both versions, so only the
  // entries that actually differ are highlighted.
  const rowChanges = new Map<string, { oldValue?: unknown; newValue?: unknown }>()
  for (const delta of event?.heapDelta ?? []) {
    if (delta.op === 'mutate') {
      changed.add(`${delta.objectId}:${delta.property}`)
      rowChanges.set(`${delta.objectId}:${delta.property}`, delta as { oldValue?: unknown; newValue?: unknown })
    }
    if (delta.op === 'create') created.add(delta.objectId)
  }
  const isChanged = (objectId: number, key: string) => changed.has(`${objectId}:${key}`) || created.has(objectId)

  const variables = visibleVariables(event)
  // Lists of strings, by length: candidate column names ("names = ['Up', 'Down', ...]").
  const nameLists = variables.flatMap(([name, value]) => {
    const id = refId(value)
    const obj = id != null ? snapshot.objects.get(id) : undefined
    if (!obj) return []
    const items = entries(obj)
    return isIndexed(items.map(([k]) => k)) && items.every(([, v]) => typeof v === 'string')
      ? [{ name, labels: items.sort(([a], [b]) => byIndex(a, b)).map(([, v]) => String(v)) }]
      : []
  })

  const tables: Table[] = []
  const shown = new Set<number>()
  for (const [name, value] of variables) {
    const id = refId(value)
    const obj = id != null ? snapshot.objects.get(id) : undefined
    if (!obj || shown.has(obj.id)) continue
    shown.add(obj.id)
    const items = entries(obj)
    const more = obj.properties.get(MORE_KEY)
    const children = items.map(([, v]) => {
      const childId = refId(v)
      return childId != null ? snapshot.objects.get(childId) : undefined
    })

    // A 2-D numpy array: every item is a row of plain numbers (codelens_tracer.py properties).
    if (items.length > 0 && items.every(([, v]) => Array.isArray(v))) {
      const width = Math.max(...items.map(([, v]) => (v as unknown[]).length))
      const columnKeys = Array.from({ length: width }, (_, i) => String(i))
      const labels = nameLists.find(list => list.labels.length === width && list.name !== name)
      tables.push({
        name, objectId: obj.id, kind: 'grid', type: obj.type,
        shape: `${items.length} × ${width}`,
        columns: labels?.labels ?? columnKeys,
        columnSource: labels?.name,
        rows: items.map(([key, v]) => {
          const change = rowChanges.get(`${obj.id}:${key}`)
          const before = Array.isArray(change?.oldValue) ? change!.oldValue as unknown[] : null
          const cells = (v as unknown[]).map((value, i) => ({
            value,
            changed: created.has(obj.id) || (!!change && (!before || before[i] !== value)),
          }))
          return { key, cells, changed: cells.some(c => c.changed) }
        }),
        more: typeof more === 'string' ? `${more} rows` : undefined,
      })
      continue
    }

    // Every item is itself an indexed container: rows of a grid.
    if (items.length > 0 && children.every(child => child && isIndexed(entries(child).map(([k]) => k)))) {
      const columnKeys = [...new Set(children.flatMap(child => entries(child!).map(([k]) => k)))].sort(byIndex)
      const labels = nameLists.find(list => list.labels.length === columnKeys.length && list.name !== name)
      tables.push({
        name, objectId: obj.id, kind: 'grid', type: obj.type,
        shape: `${items.length} × ${columnKeys.length}`,
        columns: labels?.labels ?? columnKeys,
        columnSource: labels?.name,
        rows: items.map(([key], i) => {
          const child = children[i]!
          const cells = columnKeys.map(col => ({ value: child.properties.get(col), changed: isChanged(child.id, col) }))
          return { key, cells, changed: cells.some(c => c.changed) || isChanged(obj.id, key) }
        }),
        more: typeof more === 'string' ? `${more} rows` : undefined,
      })
      continue
    }

    const keys = items.map(([k]) => k)
    if (isIndexed(keys)) {
      const sorted = [...items].sort(([a], [b]) => byIndex(a, b))
      const cells = sorted.map(([key, v]) => ({ value: v, changed: isChanged(obj.id, key), ref: refId(v) ?? undefined }))
      tables.push({
        name, objectId: obj.id, kind: 'row', type: obj.type, shape: `${items.length} item${items.length === 1 ? '' : 's'}`,
        columns: sorted.map(([k]) => k),
        rows: [{ key: name, cells, changed: cells.some(c => c.changed) }],
        more: typeof more === 'string' ? more : undefined,
      })
      continue
    }

    // Keys and values: a dict, a Map or an object's fields. (An empty one is a row of nothing.)
    tables.push({
      name, objectId: obj.id, kind: items.length ? 'pairs' : 'row', type: obj.type,
      shape: `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`,
      columns: items.length ? ['value'] : [],
      rows: items.map(([key, v]) => ({ key, cells: [{ value: v, changed: isChanged(obj.id, key), ref: refId(v) ?? undefined }], changed: isChanged(obj.id, key) })),
      more: typeof more === 'string' ? more : undefined,
    })
  }
  const order = { grid: 0, row: 1, pairs: 2 }
  return tables.sort((a, b) => order[a.kind] - order[b.kind])
}
