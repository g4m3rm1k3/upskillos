// Replay heap deltas up to a given step to reconstruct the full heap state.
// Called on every step change — fast enough because each delta is a few ops.
import type { TraceEvent, HeapSnapshot, HeapObjectEntry, HeapGraphData } from '../types'
import { visibleVariables, refId } from '../tableModel'

export function buildHeapSnapshot(events: TraceEvent[], stepIndex: number): HeapSnapshot {
  const objects = new Map<number, HeapObjectEntry>()
  const lastCreated = new Set<number>()
  const lastMutated = new Set<number>()

  for (let i = 0; i <= stepIndex && i < events.length; i++) {
    const deltas = events[i].heapDelta ?? []
    if (i === stepIndex) { lastCreated.clear(); lastMutated.clear() }

    for (const delta of deltas) {
      if (delta.op === 'create') {
        objects.set(delta.objectId, {
          id:         delta.objectId,
          type:       delta.objectType ?? 'Object',
          properties: new Map(Object.entries(delta.properties ?? {})),
          prototype:  delta.prototype ?? null,
        })
        if (i === stepIndex) lastCreated.add(delta.objectId)
      } else if (delta.op === 'mutate') {
        const obj = objects.get(delta.objectId)
        if (obj) {
          obj.properties.set(delta.property, delta.newValue)
          if (i === stepIndex) lastMutated.add(delta.objectId)
        }
      } else if (delta.op === 'delete') {
        const obj = objects.get(delta.objectId)
        if (obj) {
          obj.properties.delete(delta.property)
          if (i === stepIndex) lastMutated.add(delta.objectId)
        }
      } else if (delta.op === 'free') {
        objects.delete(delta.objectId)
      }
    }
  }

  // Resolve names from this event's live bindings. Rebuilding on every seek
  // avoids retaining an old alias after reassignment or showing a future name.
  const queue: { id: number; path: string; depth: number }[] = []
  const event = events[Math.min(stepIndex, events.length - 1)] ?? null
  const bindings = event?.heapBindings ? Object.entries(event.heapBindings) : visibleVariables(event)
  for (const [name, value] of bindings) {
    const id = refId(value)
    const object = id === null ? undefined : objects.get(id)
    if (!object) continue
    object.names ??= []
    object.names.push(name)
    queue.push({ id: object.id, path: name, depth: 0 })
  }
  const expanded = new Set<number>()
  while (queue.length) {
    const { id, path, depth } = queue.shift()!
    if (expanded.has(id) || depth >= 3) continue
    expanded.add(id)
    for (const [key, value] of objects.get(id)?.properties ?? []) {
      const childId = refId(value)
      const child = childId === null ? undefined : objects.get(childId)
      if (!child) continue
      const childPath = /^\d+$/.test(key) ? `${path}[${key}]` : `${path}.${key}`
      if (!child.names?.length) child.names = [childPath]
      queue.push({ id: child.id, path: childPath, depth: depth + 1 })
    }
  }
  return { objects, lastCreated, lastMutated }
}

export function heapObjectLabel(object: HeapObjectEntry): string {
  return object.names?.length ? object.names.join(' = ') : `${object.type} #${object.id}`
}

// Extract nodes + directed edges from a heap snapshot for the D3 graph.
export function snapshotToGraph(snapshot: HeapSnapshot): HeapGraphData {
  const nodes: HeapGraphData['nodes'] = []
  const links: HeapGraphData['links'] = []
  const seen  = new Set<string>()

  for (const obj of snapshot.objects.values()) {
    nodes.push({
      id:        obj.id,
      type:      obj.type,
      props:     visibleProps(obj),
      isNew:     snapshot.lastCreated.has(obj.id),
      isMutated: snapshot.lastMutated.has(obj.id),
    })

    for (const [prop, val] of obj.properties) {
      if (isRef(val) && snapshot.objects.has(val.$ref)) {
        const key = `${obj.id}:${prop}:${val.$ref}`
        if (!seen.has(key)) {
          seen.add(key)
          links.push({ id: key, source: obj.id, target: val.$ref, label: prop })
        }
      }
    }
  }

  return { nodes, links }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isRef(v: unknown): v is { $ref: number } {
  return v !== null && typeof v === 'object' && '$ref' in v
}

function visibleProps(obj: HeapObjectEntry): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of obj.properties) {
    if (isRef(v)) continue  // references shown as edges, not inline
    if (k === '__mapData__') continue
    if (obj.type === 'Array' && k === 'length') continue
    out.push([k, formatVal(v)])
  }
  return out
}

function formatVal(v: unknown): string {
  if (v === null)      return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string') return v.length > 12 ? `"${v.slice(0, 12)}…"` : `"${v}"`
  if (typeof v === 'object') return '{…}'
  return String(v)
}
