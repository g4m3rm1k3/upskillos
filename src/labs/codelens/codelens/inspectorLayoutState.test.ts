import { describe, expect, it } from 'vitest'
import { defaultWorkspace, moveInspector, restoreWorkspace, setPaneCount, INSPECTOR_IDS } from './inspectorLayoutState'
import { outputAtStep } from './tracePresentation'
import { buildTree } from './renderer/CallTreeView'
import { buildHeapSnapshot, heapObjectLabel } from './renderer/heapSnapshot'
import { run } from '../../../engines/js/interpreter/interpreter.js'
import type { ExecutionResult, TraceEvent } from './types'

describe('inspector layout', () => {
  it('moves, reorders, and merges panes without losing or duplicating tabs', () => {
    let state = setPaneCount(defaultWorkspace(), 3)
    state = moveInspector(state, 'explain', 2)
    expect(state.panes[2].active).toBe('explain')
    expect(state.panes[0].active).toBe('events')
    state = moveInspector(state, 'output', 2, 'explain')
    expect(state.panes[2].tabs).toEqual(['output', 'explain'])
    state = setPaneCount(state, 1)
    expect([...state.panes[0].tabs].sort()).toEqual([...INSPECTOR_IDS].sort())
  })
  it('repairs corrupt saved layouts and round trips valid ones', () => {
    const state = moveInspector(defaultWorkspace(), 'heap', 0)
    expect(restoreWorkspace(JSON.parse(JSON.stringify(state)))).toEqual(state)
    const repaired = restoreWorkspace({ panes: [{ tabs: ['output', 'bad', 'output'], active: 'bad' }, null], sizes: [Infinity] })
    expect(repaired.panes.flatMap(p => p.tabs).sort()).toEqual([...INSPECTOR_IDS].sort())
    expect(repaired.panes[0].active).toBe('output')
    expect(repaired.sizes).toEqual([1, 1])
  })
  it('puts the Picture tab at the front of the last pane of a layout saved before it existed', () => {
    const saved = { panes: [{ tabs: ['explain', 'events'], active: 'explain' }, { tabs: ['output', 'heap'], active: 'heap' }], direction: 'row', sizes: [1, 1] }
    const restored = restoreWorkspace(saved)
    expect(restored.panes[1].tabs.slice(0, 3)).toEqual(['picture', 'output', 'heap'])
    expect(restored.panes[1].active).toBe('picture')
    expect(restored.panes.flatMap(p => p.tabs).filter(t => t === 'picture')).toHaveLength(1)
  })
})

describe('trace time', () => {
  it('reveals calls, returns and output only when reached, including after rewinding', () => {
    const result = run('function add(x) { return x + 2; }\nconst answer = add(3);\nconsole.log(answer);') as ExecutionResult
    expect(result.error).toBeNull()
    const call = result.events.findIndex(e => e.type === 'function_call' && e.functionName === 'add')
    const ret = result.events.findIndex(e => e.type === 'function_return')
    expect(call).toBeGreaterThanOrEqual(0)
    expect(buildTree(result.events, call - 1).children).toHaveLength(0)
    expect(buildTree(result.events, call).children[0].stepEnd).toBe(-1)
    expect(buildTree(result.events, ret).children[0].returnValue).toBe(5)
    expect(outputAtStep(result, call)).toEqual([])
    expect(outputAtStep(result, result.events.length - 1)).toEqual(['5'])
    expect(outputAtStep(result, call)).toEqual([])
    expect(buildTree(result.events, call).children[0].returnValue).toBeUndefined()
  })
  it('reassembles timed Python output without losing blank or partial lines', () => {
    const events = ['hel', 'lo\n\n', 'last\n'].map((printed, stepId) => ({ printed, stepId, type: 'step' })) as TraceEvent[]
    const result = { events, output: ['hello', '', 'last'] } as ExecutionResult
    expect(outputAtStep(result, 0)).toEqual(['hel'])
    expect(outputAtStep(result, 1)).toEqual(['hello', ''])
    expect(outputAtStep(result, 2)).toEqual(result.output)
  })
})

it('names heap objects from live bindings without leaking future aliases', () => {
  const result = run('const scores = [3, 5];\nlet alias = scores;\nalias = null;\nconsole.log(scores);') as ExecutionResult
  const named = result.events.findIndex(e => e.heapBindings?.alias)
  expect(named).toBeGreaterThanOrEqual(0)
  const snapshot = buildHeapSnapshot(result.events, named)
  expect([...snapshot.objects.values()].some(obj => heapObjectLabel(obj).includes('scores = alias'))).toBe(true)
  const final = buildHeapSnapshot(result.events, result.events.length - 1)
  expect([...final.objects.values()].some(obj => obj.names?.includes('alias'))).toBe(false)
  expect([...buildHeapSnapshot(result.events, named).objects.values()].some(obj => obj.names?.includes('alias'))).toBe(true)
})
