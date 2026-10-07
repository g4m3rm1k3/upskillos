import { describe, expect, it } from 'vitest'
import { run } from '../../../engines/js/interpreter/interpreter.js'
import { LIBRARY } from './library'
import { buildHeapSnapshot } from './renderer/heapSnapshot'
import { buildStage, parseStageSpec, stageVariables } from './stageModel'
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

  it('says what cannot be drawn yet instead of failing', () => {
    expect(buildStage({ grid: { rows: 1, cols: 'N' } }, {}).problems[0]).toMatch(/no value yet/)
    expect(buildStage({ grid: { rows: 1, cols: 3 }, agent: { at: 'state' } }, { state: 7 }).problems[0]).toMatch(/off the grid/)
  })

  it('reports a spec that is not valid JSON or has no grid', () => {
    expect(parseStageSpec('{').error).toMatch(/Not valid JSON/)
    expect(parseStageSpec('{}').error).toMatch(/grid/)
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
