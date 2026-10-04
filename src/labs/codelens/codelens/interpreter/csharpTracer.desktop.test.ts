// The desktop CodeLens tracer for C# (desktop/app/runtimes/codelens.cjs, which builds and
// runs codelens/csharp/ with the .NET SDK's own compiler). These run the real thing on this
// machine's .NET SDK when it's installed, and skip otherwise (as on CI). The first run
// builds the tracer (about half a minute); later runs take a second or two.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ExecutionResult } from '../types'
import { annotateOutcomes } from '../traceOutcomes'
import { explainTraceEvent } from '../explainTrace'

const require = createRequire(import.meta.url)
const hasDotnet = spawnSync('dotnet', ['--list-sdks']).stdout?.toString().trim().length > 0
const runtime = hasDotnet ? require('../../../../../desktop/app/runtimes/codelens.cjs') : null
const app = { getPath: () => path.join(os.tmpdir(), 'opencalc-codelens-test') }

function trace(source: string, stdin = ''): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    runtime.runCode(app, JSON.stringify({ lang: 'csharp', source, stdin }), (event: any) => {
      if (event.stream === 'stdout') stdout += event.text
      if (event.stream === 'exit') resolve(JSON.parse(stdout))
    }).then((res: any) => { if (!res.ok) reject(new Error(res.reason)) })
  })
}

function explain(result: ExecutionResult): string[] {
  annotateOutcomes(result.events, { loopVariableBoundEarly: true })   // as nativeExecutionClient does for C#
  return result.events.filter(e => e.type === 'statement_enter' && e.statement).map(e => `${e.line}: ${explainTraceEvent(e).summary}`)
}

describe.skipIf(!runtime)('CodeLens C# tracer (.NET SDK)', () => {
  it('reads Console.ReadLine from the Input box, echoing each line', async () => {
    const result = await trace([
      'Console.Write("Name? ");',
      'var name = Console.ReadLine();',
      'var age = int.Parse(Console.ReadLine());',
      'Console.WriteLine($"{name} is {age}");',
      'var more = Console.ReadLine();',
      'Console.WriteLine(more == null ? "no more input" : more);',
    ].join('\n'), 'Ada\n36\n')
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(['Name? Ada', '36', 'Ada is 36', 'no more input'])
    expect(result.events.filter(e => e.inputRead).map(e => e.inputRead)).toEqual([['Ada'], ['36']])
  }, 120_000)

  it('keeps definite assignment through loop conditions: assigned there, or a pattern variable', async () => {
    // The tracer adds a step to every loop check; the traced copy must still compile when
    // the condition assigns a variable used after the loop, or declares one used inside it.
    const result = await trace([
      'string line;',
      'var count = 0;',
      'while ((line = Console.ReadLine()) != null) count++;',
      'Console.WriteLine($"{count} lines, last read {line ?? "null"}");',
      'object next = 41;',
      'while (next is int n && n < 43)',
      '{',
      '    Console.WriteLine(n);',
      '    next = n + 1;',
      '}',
    ].join('\n'), 'a\nb\n')
    expect(result.error).toBeNull()
    expect(result.output).toEqual(['a', 'b', '2 lines, last read null', '41', '42'])
  }, 120_000)

  it('explains each line with its real values', async () => {
    const result = await trace([
      'int Square(int x) => x * x;',
      'var total = 0;',
      'for (int i = 1; i <= 2; i++)',
      '{',
      '    total += Square(i);',
      '}',
      'var names = new List<string> { "a", "b" };',
      'foreach (var name in names)',
      '{',
      '    if (name == "b") Console.WriteLine($"{name} {total}");',
      '}',
    ].join('\n'))
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(['b 5'])
    expect(explain(result)).toEqual([
      '2: Assigns `total` = 0',
      '3: Starts the loop: `int i = 1`',
      '3: `i <= 2` is true, so the loop body runs',
      '5: Updates `total`: 0 → 1',
      '1: Returns 1',
      '3: `i <= 2` is true, so the loop body runs',
      '5: Updates `total`: 1 → 5',
      '1: Returns 4',
      '3: `i <= 2` is false, so the loop ends',
      '7: Assigns `names` = a new List<string> (#1)',
      '8: Next item: `name` = "a"',
      '10: `name == "b"` is false, so the block is skipped',
      '8: Next item: `name`: "a" → "b"',
      '10: `name == "b"` is true, so the block runs',
      '10: Prints "b 5"',
      '8: The loop is finished',
    ])
  }, 120_000)

  it('draws objects, and reports an uncaught exception where it was thrown', async () => {
    const result = await trace([
      'var p = new Point(1, 2);',
      'p.Move(3);',
      'int[] data = { 1, 2 };',
      'Console.WriteLine(data[p.X]);',
      'class Point',
      '{',
      '    public int X { get; set; }',
      '    public int Y { get; set; }',
      '    public Point(int x, int y) { X = x; Y = y; }',
      '    public void Move(int dx) => X += dx;',
      '}',
    ].join('\n'))
    expect(result.status).toBe('runtime-error')
    expect(result.error).toMatchObject({ type: 'IndexOutOfRangeException', line: 4 })
    const creates = result.events.flatMap(e => e.heapDelta ?? []).filter(d => d.op === 'create')
    expect(creates.map(d => d.objectType)).toEqual(['Point', 'int[]'])
    const moved = result.events.flatMap(e => e.heapDelta ?? []).find(d => d.op === 'mutate' && d.property === 'X' && d.newValue === 4)
    expect(moved).toBeTruthy()
    expect(result.events.filter(e => e.type === 'function_call').map(e => e.functionName)).toEqual(['new Point', 'Move'])
    // Assignments to an object's properties, read from the heap changes. A new object's int
    // properties start at 0 before its constructor runs.
    expect(explain(result)).toEqual(expect.arrayContaining(['9: Assigns `X`: 0 → 1', '9: Assigns `Y`: 0 → 2', '10: Updates `X`: 1 → 4']))
  }, 120_000)

  it('reports compile errors with their line, and stops a loop that never ends', async () => {
    const broken = await trace('var x = 1\nConsole.WriteLine(x);')
    expect(broken.status).toBe('syntax-error')
    expect(broken.error).toMatchObject({ type: 'CompileError', line: 1 })

    const endless = await trace('var n = 0;\nwhile (true) { n++; }')
    expect(endless.status).toBe('limit')
    expect(endless.limit?.kind).toBe('steps')
  }, 120_000)
})
