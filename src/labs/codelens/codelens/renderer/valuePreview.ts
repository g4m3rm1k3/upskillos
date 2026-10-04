// What an object holds, as short text, for every panel that shows a variable: the Call
// Stack, Values, the Data dock. "[0, 0, -0.5, 0] (ndarray #39)" says what "Object #39"
// doesn't. Built from the heap snapshot at the current step (heapSnapshot.ts), so it is
// always the object as it is now, in every language whose tracer records objects.
import { createContext } from 'react'
import type { HeapSnapshot } from '../types'

/** The heap snapshot of the step on screen, for panels deep in the tree (StackFrame). */
export const HeapPreviewContext = createContext<{ snapshot: HeapSnapshot | null; language?: string }>({ snapshot: null })

const PYTHON_TYPES = new Set(['list', 'tuple', 'dict', 'set', 'frozenset', 'deque', 'ndarray', 'ndarray view','defaultdict', 'OrderedDict', 'Counter'])
const HIDDEN = new Set(['__mapData__', 'length'])
const MORE = '…'

function refOf(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { $ref?: number; __kind?: string; objectId?: number }
  if (typeof v.$ref === 'number') return v.$ref
  if (v.__kind === 'reference' && typeof v.objectId === 'number') return v.objectId
  return null
}

export function shortNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(parseFloat(n.toPrecision(6)))   // 0.30000000000000004 -> 0.3
}

/** Text of the object `id` holds, or null if the snapshot doesn't have it. */
export function objectPreview(id: number, snapshot: HeapSnapshot | null | undefined, maxChars = 70, language?: string): string | null {
  if (!snapshot?.objects.has(id)) return null
  const seen = new Set<number>()

  const render = (objectId: number, depth: number): string => {
    const obj = snapshot.objects.get(objectId)
    if (!obj) return `#${objectId}`
    if (seen.has(objectId) || depth > 2) return `#${objectId}`   // a cycle, or deep nesting
    seen.add(objectId)
    // Python spelling (None, True, 'text') for Python; the language decides when known.
    const python = language ? language === 'py' : PYTHON_TYPES.has(obj.type)
    const scalar = (v: unknown): string => {
      const ref = refOf(v)
      if (ref != null) return render(ref, depth + 1)
      if (v === null || v === undefined) return python ? 'None' : 'null'
      if (v === true || v === false) return python ? (v ? 'True' : 'False') : String(v)
      if (typeof v === 'number') return shortNumber(v)
      if (Array.isArray(v)) return `[${v.map(scalar).join(', ')}]`   // a numpy row
      if (typeof v === 'string') {
        if (/^-?inf$|^nan$/.test(v)) return v                         // Python's float('inf'), sent as text
        return python ? `'${v}'` : `"${v}"`
      }
      return String(v)
    }
    const items = [...obj.properties].filter(([k]) => !HIDDEN.has(k) && k !== MORE)
    const more = obj.properties.has(MORE) ? ', …' : ''
    // A function, so each item is rendered once: a second pass would find it already seen.
    const values = () => items.map(([, v]) => scalar(v)).join(', ')
    const pairs = (keyText: (k: string) => string) => items.map(([k, v]) => `${keyText(k)}: ${scalar(v)}`).join(', ')
    switch (obj.type) {
      case 'list': case 'Array': case 'deque': case 'ndarray': case 'ndarray view':
        return `[${values()}${more}]`
      case 'tuple':
        return `(${values()}${items.length === 1 ? ',' : ''}${more})`
      case 'set': case 'frozenset': case 'Set':
        return items.length ? `{${values()}${more}}` : (python ? 'set()' : 'Set {}')
      case 'dict': case 'defaultdict': case 'OrderedDict': case 'Counter':
        // Non-string keys arrive as their repr ("(0, 1)", "3"); string keys as the text.
        return `{${pairs(k => (/^[(\d-]/.test(k) ? k : `'${k}'`))}${more}}`
      case 'Object': case 'Map':
        return `{${pairs(k => k)}${more}}`
      default:   // an instance of the program's own class
        return `${obj.type}(${items.map(([k, v]) => `${k}=${scalar(v)}`).join(', ')}${more})`
    }
  }

  const text = render(id, 0)
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`
}

/** "[0, -0.5] (ndarray #39)", or "ndarray #39" when the snapshot lacks it. */
export function referenceText(value: unknown, snapshot: HeapSnapshot | null | undefined, maxChars?: number, language?: string): string | null {
  const id = refOf(value)
  if (id == null) return null
  const type = snapshot?.objects.get(id)?.type ?? 'object'
  const preview = objectPreview(id, snapshot, maxChars, language)
  return preview ? `${preview} (${type} #${id})` : `${type} #${id}`
}
