import { describe, expect, it } from 'vitest'
import { run } from '../../../engines/js/interpreter/interpreter.js'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import { nameObjects, objectNames, heldValueText } from './objectNames'
import type { ExecutionResult, TraceEvent } from './types'

describe('nameObjects', () => {
  const names = new Map([[3, ['cards']], [7, ['a', 'b']]])

  it('replaces ids that a name reaches, and keeps the rest', () => {
    expect(nameObjects('Heap object #3 was mutated', names)).toBe('Heap object `cards` was mutated')
    expect(nameObjects('Returns [1, 2] (list #3)', names)).toBe('Returns [1, 2] (list `cards`)')
    expect(nameObjects('Heap object 7: `0` 1 → 2', names)).toBe('Heap object `a` = `b`: `0` 1 → 2')
    expect(nameObjects('Returns object #34', names)).toBe('Returns object #34')
  })

  it('leaves numbers that are not ids alone', () => {
    expect(nameObjects('the loop runs 3 times on line 3', names)).toBe('the loop runs 3 times on line 3')
  })
})

describe('heldValueText', () => {
  it('shows what a variable holds, and other names for the same object, without the id', () => {
    const names = new Map([[4, ['a', 'b']]])
    expect(heldValueText('[1, 2]', 'list', 4, 'a', names)).toBe('[1, 2] (the same object as `b`)')
    expect(heldValueText(undefined, 'dict', 9, 'd', new Map([[9, ['d']]]))).toBe('a dict')
  })
})

describe('objectNames from a real trace', () => {
  const trace = (code: string) => {
    const result = run(code) as ExecutionResult
    expect(result.error).toBeNull()
    return result.events as TraceEvent[]
  }

  it('names an object by every variable that refers to it', () => {
    const events = trace('const cards = [1, 2];\nconst other = cards;\ncards[0] = 5;\n')
    const step = events.length - 1
    const names = objectNames(events[step], buildHeapSnapshot(events, step))
    expect([...names.values()]).toContainEqual(['cards', 'other'])
  })

  it('names a row of a table by its path, with the step\'s snapshot', () => {
    const events = trace('const Q = [[0, 0], [0, 0]];\nQ[1][0] = 3;\n')
    const step = events.length - 1
    const names = objectNames(events[step], buildHeapSnapshot(events, step))
    expect([...names.values()]).toContainEqual(['Q[1]'])
  })
})
