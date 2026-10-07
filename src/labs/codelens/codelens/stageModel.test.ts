import { describe, expect, it } from 'vitest'
import { run } from '../../../engines/js/interpreter/interpreter.js'
import { LIBRARY } from './library'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import { buildStage, parseStageSpec, stageVariables } from './stageModel'
import { STAGE_GUIDE } from './stageGuide'
import type { ExecutionResult } from './types'

describe('buildStage', () => {
  it('colours cells from one value (or one list, reduced) per cell, and places the agent and markers', () => {
    const stage = buildStage(
      { grid: { rows: 1, cols: 'N' }, heat: { var: 'Q', reduce: 'max' }, markers: [{ at: 'GOAL', label: 'goal' }], agent: { at: 'state' }, caption: ['episode'] },
      { N: 3, GOAL: 2, state: 1, episode: 4, Q: [[-1, 2.5], [0, -3], [0, 0]] },
    )
    expect(stage.cells.map(c => c.heat)).toEqual([2.5, 0, 0])
    expect(stage.range).toEqual([0, 2.5])
    expect(stage.agent).toMatchObject({ row: 0, col: 1 })
    expect(stage.markers[0]).toMatchObject({ row: 0, col: 2, label: 'goal' })
    expect(stage.caption).toBe('episode = 4')
    expect(stage.problems).toEqual([])
  })

  it('reads a list of rows, walls, and an agent at a (row, col) pair', () => {
    const stage = buildStage(
      { grid: { rows: 2, cols: 2 }, walls: { var: 'maze' }, agent: { at: 'pos' } },
      { maze: [[0, 1], [0, 0]], pos: [1, 0] },
    )
    expect(stage.cells.map(c => c.wall)).toEqual([false, true, false, false])
    expect(stage.agent).toMatchObject({ row: 1, col: 0 })
  })

  it('sizes a grid from a list, takes a cell as two variables, writes values and uses a palette', () => {
    const stage = buildStage(
      { grid: { rows: 1, cols: 'colors' }, heat: { var: 'colors', palette: { '0': '#ef4444' } }, markers: [{ at: 'lo' }, { at: 'j' }], agent: { at: [0, 'mid'] } },
      { colors: [0, 2, 1], lo: 0, j: -1, mid: 2 },
    )
    expect(stage.cols).toBe(3)
    expect(stage.cells.map(c => c.color)).toEqual(['#ef4444', null, null])
    expect(stage.cells.map(c => c.text)).toEqual(['0', '2', '1'])
    // j = -1 points off the grid: not drawn, and not a problem.
    expect(stage.markers.map(m => m.col)).toEqual([0])
    expect(stage.agent).toMatchObject({ row: 0, col: 2 })
    expect(stage.problems).toEqual([])
  })

  it('writes text values, leaving the empty ones blank', () => {
    const stage = buildStage({ grid: { rows: 2, cols: 2 }, text: { var: 'board', empty: ['.'] } }, { board: [['Q', '.'], ['.', 'Q']] })
    expect(stage.cells.map(c => c.text)).toEqual(['Q', null, null, 'Q'])
  })

  it('says what cannot be drawn yet instead of failing', () => {
    expect(buildStage({ grid: { rows: 1, cols: 'N' } }, {}).problems[0]).toMatch(/no value yet/)
    expect(buildStage({ grid: { rows: 1, cols: 3 }, agent: { at: 'state' } }, { state: 7 }).problems[0]).toMatch(/off the grid/)
  })

  it('reports a spec that is not valid JSON or has no grid', () => {
    expect(parseStageSpec('{').error).toMatch(/Not valid JSON/)
    expect(parseStageSpec('{}').error).toMatch(/grid/)
  })
})

describe('every library example with a stage', () => {
  const staged = LIBRARY.filter(e => e.stage && e.variants.js)
  it('has some', () => expect(staged.length).toBeGreaterThanOrEqual(10))

  // Steps spread over the whole run: the stage must draw cleanly somewhere, and whatever it
  // names (the agent, a pointer, the cells' values) must show up at least once.
  it.each(staged.map(e => [e.id, e] as const))('%s draws from its own variables', (_id, example) => {
    const result = run(example.variants.js!.code) as ExecutionResult
    expect(result.error).toBeNull()
    const events = result.events
    const samples = Array.from({ length: 60 }, (_, k) => Math.floor((k * (events.length - 1)) / 59))
    const stages = samples.map(step => buildStage(example.stage!, stageVariables(events[step], buildHeapSnapshot(events, step))))
    expect(stages.some(s => s.rows > 0 && s.problems.length === 0)).toBe(true)
    expect(stages.some(s => s.cells.some(c => c.heat != null || c.color != null || c.text != null))).toBe(true)
    if (example.stage!.agent) expect(stages.some(s => s.agent)).toBe(true)
    if (example.stage!.markers?.length) expect(stages.some(s => s.markers.length > 0)).toBe(true)
  })
})

describe('the Build-a-stage guide', () => {
  it.each(STAGE_GUIDE.map(s => [s.title, s] as const))('%s: its program draws with its spec', (_title, step) => {
    const result = run(step.js) as ExecutionResult
    expect(result.error).toBeNull()
    const events = result.events
    const stages = events.map((_, i) => buildStage(step.spec, stageVariables(events[i], buildHeapSnapshot(events, i))))
    expect(stages.some(s => s.rows > 0 && s.problems.length === 0)).toBe(true)
    if (step.spec.agent) expect(stages.some(s => s.agent)).toBe(true)
    if (step.spec.markers?.length) expect(stages.some(s => s.markers.length > 0)).toBe(true)
  })
})

describe('the Q-learning example on the stage', () => {
  it('draws the agent on the line and the learned values from the real trace', () => {
    const example = LIBRARY.find(e => e.id === 'algo-q-learning')!
    const result = run(example.variants.js!.code) as ExecutionResult
    expect(result.error).toBeNull()
    // In JavaScript, state is declared inside the episode loop, so after the last episode it is gone:
    // look at the last step that still has it.
    const varsAt = (step: number) => stageVariables(result.events[step], buildHeapSnapshot(result.events, step))
    let last = result.events.length - 1
    while (last > 0 && varsAt(last).state === undefined) last--
    const stage = buildStage(example.stage!, varsAt(last))
    expect(stage.problems).toEqual([])
    expect(stage.cols).toBe(5)
    expect(stage.markers[0]).toMatchObject({ col: 4 })
    // The last episode ended at the goal, and right from 3 has learned to be worth about 10.
    expect(stage.agent).toMatchObject({ col: 4 })
    expect(stage.cells[3].heat).toBeCloseTo(10, 1)
  })
})
