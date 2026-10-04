import { describe, expect, it } from 'vitest'
import { JAVASCRIPT_EXECUTION_LIMITS } from '../../../labs/codelens/codelens/interpreter/executionLimits'
import { SNIPPET_CATEGORIES } from '../../../labs/codelens/codelens/snippets'
import { buildProgramModel } from '../parser/jsParser.js'
import { run } from './interpreter.js'

const lessonModules = import.meta.glob(
  '../../../labs/dsa-patterns/lessons/lesson-*.js',
  { eager: true },
)

function codelensActivities() {
  return Object.entries(lessonModules).flatMap(([path, module]) =>
    (module.lesson?.segments ?? [])
      .filter(segment => segment.type === 'codelens')
      .map(segment => ({ path, ...segment })),
  )
}

describe('CodeLens JavaScript compatibility', () => {
  it('runs every example in the CodeLens library', () => {
    const failures = SNIPPET_CATEGORIES.flatMap(category =>
      category.items.flatMap(example => {
        const result = run(example.code, { limits: JAVASCRIPT_EXECUTION_LIMITS })
        return result.error
          ? [`${category.group} / ${example.name}: ${result.error.message}`]
          : []
      }),
    )

    expect(failures).toEqual([])
  })

  it('runs every DSA course handoff', () => {
    const activities = codelensActivities()
    const failures = activities.flatMap(activity => {
      const result = run(activity.code ?? '', { limits: JAVASCRIPT_EXECUTION_LIMITS })
      return result.error
        ? [`${activity.path} / ${activity.id}: ${result.error.message}`]
        : []
    })

    expect(activities.length).toBeGreaterThan(0)
    expect(failures).toEqual([])
  })

  it('supports standard helpers used by DSA examples', () => {
    const result = run(`
const rows = Array.from({ length: 3 }, (_, i) => ['k' + i, i + 1])
const object = Object.fromEntries(rows)
const map = new Map()
map.set('a', object.k0)
map.set('b', object.k1)
for (const [key, value] of map) console.log(key, value)
const initialized = new Map([['c', 3]])
const set = new Set(['x', 'y'])
console.log(initialized.get('c'), [...set].join(','))
`)

    expect(result.error).toBeNull()
    expect(result.output).toEqual(['a 1', 'b 2', '3 x,y'])
  })

  it('binds destructured callback parameters', () => {
    const result = run(`
const pairs = [['alpha', 1], ['beta', 2]]
const found = pairs.find(([key]) => key === 'beta')
console.log(found[1])
`)

    expect(result.error).toBeNull()
    expect(result.output).toEqual(['2'])
  })

  it.each([
    ['generators', 'function* values() { yield 1 }', 'Generators'],
    ['async functions', 'async function load() { await fetch("/data") }', 'Async functions'],
    ['module imports', 'import value from "./value.js"', 'module imports'],
    ['dynamic imports', 'const module = import("./value.js")', 'Dynamic import'],
  ])('rejects unsupported %s before execution', (_name, source, expectedMessage) => {
    const result = run(source)

    expect(result.events).toEqual([])
    expect(result.error?.type).toBe('UnsupportedFeatureError')
    expect(result.error?.message).toContain(expectedMessage)
    expect(result.error?.line).toBe(1)
  })

  it.each([
    ['setTimeout', 'Browser timers'],
    ['fetch', 'Browser networking'],
    ['document', 'the DOM'],
    ['require', 'Node.js modules'],
    ['Promise', 'Promises and the event loop'],
  ])('explains why the %s global is unavailable', (name, expectedFeature) => {
    const result = run(`${name}()`)

    expect(result.error?.type).toBe('UnsupportedEnvironmentError')
    expect(result.error?.message).toContain(expectedFeature)
    expect(result.error?.message).toContain('self-contained synchronous JavaScript')
  })

  it('allows a program to define a local with the same name as an unavailable API', () => {
    const result = run(`
function setTimeout(callback) { callback() }
setTimeout(() => console.log('local timer'))
`)

    expect(result.error).toBeNull()
    expect(result.output).toEqual(['local timer'])
  })

  it('does not invent complexity labels from syntax', () => {
    const model = buildProgramModel(`
function binarySearch(values, target) {
  let low = 0
  let high = values.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (values[middle] === target) return middle
    if (values[middle] < target) low = middle + 1
    else high = middle - 1
  }
  return -1
}
`)

    expect(model.callGraph.nodes[0].complexity).toBeUndefined()
  })

  it.each([
    {
      name: 'steps',
      source: 'let n = 0; while (true) n++',
      limits: { maxSteps: 20 },
      kind: 'steps',
    },
    {
      name: 'runtime',
      source: 'let n = 0; while (n < 1000) n++',
      limits: { maxRuntimeMs: -1 },
      kind: 'timeout',
    },
    {
      name: 'trace events',
      source: 'let total = 0; for (let i = 0; i < 20; i++) total += i',
      limits: { maxEvents: 12 },
      kind: 'events',
    },
    {
      name: 'trace size',
      source: 'const values = [1, 2, 3, 4, 5]',
      limits: { maxTraceChars: 100 },
      kind: 'trace-size',
    },
    {
      name: 'console output',
      source: "console.log('one'); console.log('two'); console.log('three')",
      limits: { maxOutputLines: 2 },
      kind: 'output',
    },
    {
      name: 'recursion',
      source: 'function recurse() { return recurse() } recurse()',
      limits: { maxRecursionDepth: 8 },
      kind: 'recursion',
    },
    {
      name: 'heap growth',
      source: 'const values = []; values.push(1); values.push(2); values.push(3)',
      limits: { maxHeapProperties: 3 },
      kind: 'memory',
    },
  ])('stops execution at the $name limit', ({ source, limits, kind }) => {
    const result = run(source, { limits })

    expect(result.error?.type).toBe('ExecutionLimitError')
    expect(result.error?.limitKind).toBe(kind)
  })

  it('streams bounded progress before a run is stopped by a limit', () => {
    const streamedEvents = []
    const streamedOutput = []
    const result = run(
      "console.log('started'); let n = 0; while (true) n++",
      {
        limits: { maxSteps: 25 },
        onEvent: event => streamedEvents.push(event),
        onOutput: line => streamedOutput.push(line),
      },
    )

    expect(result.error?.limitKind).toBe('steps')
    expect(streamedEvents.length).toBeGreaterThan(0)
    expect(streamedOutput).toEqual(['started'])
  })
})

describe('CodeLens scripted input', () => {
  it('answers prompt() from the Input box, then returns null when it runs out', () => {
    const result = run([
      "const name = prompt('Name? ')",
      "const age = Number(prompt('Age? '))",
      "console.log(name, age + 1)",
      "console.log(prompt('More? '))",
    ].join('\n'), { stdin: ['Ada', '36'] })
    expect(result.error).toBeNull()
    expect(result.output).toEqual(['Name? Ada', 'Age? 36', 'Ada 37', 'More? ', 'null'])
    expect(result.events.filter(e => e.inputRead).map(e => e.inputRead)).toEqual([['Ada'], ['36']])
  })
})
