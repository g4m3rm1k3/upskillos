// What to call an object on the heap: the name of the variable that refers to it ("cards"),
// or the path that reaches it ("Q[2]"), instead of its id ("object #3"). An object no name
// reaches yet (a value being returned, a list being built) keeps its id.
import type { HeapSnapshot, TraceEvent } from './types'
import { refId, visibleVariables } from './tableModel'

/** id -> the names that refer to that object at this step. The snapshot's names (built for
 *  the same step) include paths like Q[2]; without one, the event's own variables are used,
 *  which works for any event without replaying the heap. */
export function objectNames(event: TraceEvent | null, snapshot?: HeapSnapshot | null): Map<number, string[]> {
  const names = new Map<number, string[]>()
  if (snapshot) {
    for (const obj of snapshot.objects.values()) if (obj.names?.length) names.set(obj.id, [...obj.names])
    return names
  }
  // The JavaScript interpreter shows objects in its stack as text, and keeps which object each
  // name refers to in heapBindings.
  const bindings = event?.heapBindings
    ? Object.entries(event.heapBindings as Record<string, unknown>)
    : visibleVariables(event)
  for (const [name, value] of bindings) {
    const id = refId(value)
    if (id == null) continue
    const list = names.get(id) ?? []
    if (!list.includes(name)) list.push(name)
    names.set(id, list)
  }
  return names
}

const label = (list: string[]) => list.map(n => `\`${n}\``).join(' = ')

/** Replaces object ids in a message ("object #3", "(list #3)", "Heap object 3") with the
 *  names that refer to them, when there are any. */
export function nameObjects(text: string, names: Map<number, string[]>): string {
  if (!text || !names.size) return text
  return text
    // The JavaScript interpreter writes "Heap object 3" without the #.
    .replace(/\bHeap object (\d+)\b/g, (whole, id: string) => {
      const list = names.get(Number(id))
      return list ? `Heap object ${label(list)}` : whole
    })
    .replace(/#(\d+)\b/g, (whole, id: string) => {
      const list = names.get(Number(id))
      return list ? label(list) : whole
    })
}

/** A reference shown beside the variable that holds it (the Scope panel): what it holds, and
 *  which other names share the same object. The id adds nothing there, so it is left out. */
export function heldValueText(preview: string | undefined, type: string | undefined, id: number, rowName: string, names: Map<number, string[]>): string {
  const others = (names.get(id) ?? []).filter(n => n !== rowName)
  const what = preview ?? (type ? `a ${type}` : 'an object')
  return others.length ? `${what} (the same object as ${label(others)})` : what
}
