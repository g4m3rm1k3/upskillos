// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { parseProject, REGRESSION_EXAMPLE, type MathOSProject } from './project'
import { saveProjectMemory, loadDataset } from './storage'

const project: MathOSProject = {
  format: 'upskillos-mathos', version: 1, input: '2^10', variables: { mass: 3 },
  formulas: { force: 'mass * acceleration' }, matrices: { A: [['1']] }, savedScripts: {},
  programs: { javascript: 'console.log(42)', python: 'print(42)', openmat: 'disp(42)' },
  statsData: '1, 2, 3', matrixA: [['1']], matrixB: [['2']], angleMode: 'RAD',
  graph: { functions: ['sin(x)'], bounds: [-10, 10, -10, 10] },
}
afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

it('includes validated tables and persists them while accepting older projects', () => {
  const dataset = { name: 'test', columns: ['x'], rows: [[''], ['2']] }
  const parsed = parseProject(JSON.stringify({ ...project, dataset }))
  saveProjectMemory(parsed)
  expect(loadDataset()).toEqual(dataset)
  expect(() => parseProject(JSON.stringify({ ...project, dataset: { ...dataset, rows: [['1', '2']] } }))).toThrow()
  saveProjectMemory(project)
  expect(loadDataset()).toBeNull()
})

it('round-trips programs and shared scientific inputs without executing code', () => {
  expect(parseProject(JSON.stringify(project))).toEqual(project)
})
it('rejects corrupt projects, unsupported versions and invalid matrices before replacement', () => {
  for (const patch of [{ version: 2 }, { matrixA: [['1'], ['2', '3']] }, { variables: null }, { programs: {} }, { graph: { functions: ['x'], bounds: [1, 1, 0, 2] } }]) {
    expect(() => parseProject(JSON.stringify({ ...project, ...patch }))).toThrow()
  }
  expect(() => parseProject(JSON.stringify({ ...project, variables: JSON.parse('{"__proto__":1}') }))).toThrow()
})
it('restores previous persisted collections if an import write fails', () => {
  localStorage.setItem('oc_memory', '{"old":7}')
  const original = localStorage.setItem.bind(localStorage)
  let writes = 0
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (++writes === 2) throw new Error('Quota exceeded')
    original(key, value)
  })
  expect(() => saveProjectMemory(project)).toThrow('Quota exceeded')
  expect(localStorage.getItem('oc_memory')).toBe('{"old":7}')
  expect(localStorage.getItem('oc_scripts')).toBeNull()
})
it('trains the editable regression example and evaluates held-out predictions', () => {
  const output: unknown[][] = []
  runInNewContext(REGRESSION_EXAMPLE, { console: { log: (...args: unknown[]) => output.push(args) } }, { timeout: 1000 })
  expect(Number(output[0][1])).toBeCloseTo(2, 1)
  expect(Number(output[1][1])).toBeLessThan(0.1)
  expect(Number(output[2][1])).toBeCloseTo(15, 0)
})
