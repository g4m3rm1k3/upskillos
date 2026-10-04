// Previews of what objects hold, from real traces: Python on this machine's CPython, and
// JavaScript through the CodeLens interpreter.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { buildHeapSnapshot } from './heapSnapshot'
import { objectPreview, referenceText } from './valuePreview'
import { desktopScript, parseDesktopResult } from '../interpreter/pythonExecutionClient'
import { run } from '../../../../engines/js/interpreter/interpreter.js'
import type { ExecutionResult } from '../types'

const python = ['python', 'python3'].find(cmd => spawnSync(cmd, ['-c', 'import numpy']).status === 0)

function lastLocals(result: ExecutionResult) {
  const last = result.events.length - 1
  const snapshot = buildHeapSnapshot(result.events, last)
  const frames = result.events[last].stackSnapshot ?? []
  const locals = Object.assign({}, ...frames.map(f => f.locals)) as Record<string, unknown>
  return { snapshot, locals }
}

describe.skipIf(!python)('object previews, Python', () => {
  const source = [
    'import numpy as np',
    'class Point:',
    '    def __init__(self, x, y):',
    '        self.x, self.y = x, y',
    'cell = (0, 1)',
    'single = (5,)',
    'row = [-1, 0.30000000000000004, None, True, "up"]',
    'Q = {(0, 0): [0.0, -0.5], (0, 1): [-1.0, 0.0]}',
    'table = np.array([[0.0, -0.5], [-1.0, 0.0]])',
    'p = Point(1, 2)',
    'loop = [1]',
    'loop.append(loop)',
    'empty = set()',
    'done = True',
  ].join('\n') + '\n'
  const runPy = spawnSync(python!, ['-'], { input: desktopScript(source), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } })
  const { snapshot, locals } = lastLocals(parseDesktopResult(runPy.stdout.replace(/\r\n/g, '\n'))!)
  const show = (name: string) => objectPreview((locals[name] as { $ref: number }).$ref, snapshot, 70, 'py')

  it('writes each container the way Python prints it', () => {
    expect(show('cell')).toBe('(0, 1)')
    expect(show('single')).toBe('(5,)')
    expect(show('row')).toBe("[-1, 0.3, None, True, 'up']")
    expect(show('Q')).toBe('{(0, 0): [0, -0.5], (0, 1): [-1, 0]}')
    expect(show('table')).toBe('[[0, -0.5], [-1, 0]]')
    expect(show('p')).toBe('Point(x=1, y=2)')
    expect(show('empty')).toBe('set()')
  })

  it('stops at a cycle instead of looping forever', () => {
    const id = (locals.loop as { $ref: number }).$ref
    expect(show('loop')).toBe(`[1, #${id}]`)
  })

  it('adds the type and number, which match the Structures view', () => {
    expect(referenceText(locals.table, snapshot, 70, 'py')).toMatch(/^\[\[0, -0\.5\], \[-1, 0\]\] \(ndarray #\d+\)$/)
    expect(referenceText(locals.done, snapshot)).toBeNull()   // a plain value isn't an object
  })
})

describe('object previews, JavaScript', () => {
  it('writes arrays and objects the way JavaScript reads', () => {
    // The JavaScript interpreter shows variables as text already ("[ [ 1, 2 ] ]"); its heap
    // objects, which the Data dock and nested values use, get the same treatment as Python's.
    const result = run('const grid = [[1, 2], [3, null]]\nconst point = { x: 1, label: "a" }\nlet end = true\n') as ExecutionResult
    const { snapshot } = lastLocals(result)
    const objects = [...snapshot.objects.values()]
    const outer = objects.find(o => o.type === 'Array' && [...o.properties.values()].some(v => typeof v === 'object' && v !== null))!
    const point = objects.find(o => o.properties.has('label'))!
    expect(objectPreview(outer.id, snapshot, 70, 'js')).toBe('[[1, 2], [3, null]]')
    expect(objectPreview(point.id, snapshot, 70, 'js')).toBe('{x: 1, label: "a"}')
  })
})
