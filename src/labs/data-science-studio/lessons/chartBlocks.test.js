// @vitest-environment happy-dom
// Every "Draw it with D3" block, run as the page runs it: the lab's solution draws without an error
// and passes its own check; the starter code does not pass (an exercise that passes before you write
// anything teaches nothing); and the solution's marks agree with the maths the lessons teach
// (each block's `verify`, against engine/charts.js, which parity.test.js holds to the Python).
import { describe, expect, it } from 'vitest'
import * as d3 from 'd3'
import { LESSONS } from './index.js'
import { checkChart, marksOf, runChart } from '../engine/chartRun.js'

const makeSvg = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg')
const blocks = LESSONS.flatMap(lesson => lesson.blocks.filter(b => b.chart).map((b, k) => [`${lesson.number} block ${k + 1}`, b.chart]))

describe('Draw it with D3', () => {
  it('there are D3 blocks, each naming what it checks', () => {
    expect(blocks.length).toBeGreaterThan(5)
    for (const [where, spec] of blocks) {
      expect(spec.checks?.length, where).toBeGreaterThan(0)
      expect(spec.data !== undefined || spec.runs?.length > 1, where).toBe(true)
    }
  })

  for (const [where, spec] of blocks) {
    describe(where, () => {
      it('the lab’s solution draws, and passes its own check', () => {
        const r = checkChart(spec.solution, spec, { d3, makeSvg })
        expect(r.error, where).toBeNull()
        expect(r.problems).toEqual([])
        for (const { select } of spec.checks) expect(r.marks[select].length, select).toBeGreaterThan(0)
      })
      it('the starter code does not pass', () => {
        const r = checkChart(spec.starter, spec, { d3, makeSvg })
        expect(r.error !== null || r.problems.length > 0, where).toBe(true)
      })
      it.skipIf(!spec.verify)('the solution’s marks agree with the lessons’ maths', () => {
        const svgEl = makeSvg()
        for (const data of spec.runs ?? [spec.data]) expect(runChart(spec.solution, { d3, svgEl, data }).error).toBeNull()
        expect(spec.verify(marksOf(svgEl, spec.checks)), where).toBe(true)
      })
    })
  }

  it('a wrong chart is described in words', () => {
    const spec = blocks[0][1]
    const r = checkChart(spec.solution.replace('range([270, 20])', 'range([270, 40])'), spec, { d3, makeSvg })
    expect(r.problems[0]).toMatch(/^bar 1: y is .*, where it should be /)
    const broken = checkChart('svg.append(', spec, { d3, makeSvg })
    expect(broken.error).toBeTruthy()
  })
})
