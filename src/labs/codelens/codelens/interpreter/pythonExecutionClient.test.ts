// The desktop path runs the CodeLens tracer on the learner's own CPython. These tests run it
// on this machine's Python when there is one (and skip otherwise, as on CI), so they check
// the real tracer, not a mock.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { desktopScript, parseDesktopResult, type PythonInputs } from './pythonExecutionClient'
import { parseScriptedInput } from '../scriptedInput'
import { explainTraceEvent } from '../explainTrace'
import type { ExecutionResult } from '../types'

const python = ['python', 'python3'].find(cmd => spawnSync(cmd, ['--version']).status === 0)
// A Python with pygame-ce for the stand-in's tests: CODELENS_PYGAME_PYTHON, or the default one if it has it.
const pygamePython = [process.env.CODELENS_PYGAME_PYTHON, python].find(cmd => cmd && spawnSync(cmd, ['-c', 'import pygame']).status === 0)

function trace(source: string, inputs?: PythonInputs, interpreter = python): ExecutionResult {
  // A run that hits a limit is several megabytes of JSON; the default buffer is 1 MB.
  const run = spawnSync(interpreter!, ['-'], { input: desktopScript(source, inputs), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } })
  const result = parseDesktopResult(run.stdout.replace(/\r\n/g, '\n'))
  if (!result) throw new Error(`no result; stderr: ${run.stderr}`)
  return result
}

describe.skipIf(!python)('CodeLens Python tracer on CPython', () => {
  it('embeds any source safely: quotes, backslashes, triple quotes and non-ASCII', () => {
    const tricky = 'text = "she said \\"hi\\"" + \'\\\\\' + """x""" + "✓   é"\nprint(len(text))\n'
    const result = trace(tricky)
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(['20'])
  })

  it('shows shared references as the same object', () => {
    const result = trace('a = [1, 2]\nb = a\nb.append(3)\n')
    const last = result.events.at(-1)!
    const globals = last.stackSnapshot!.at(-1)!.locals as Record<string, { $ref: number }>
    expect(globals.a).toEqual(globals.b)                       // one list, two names
    const mutations = result.events.flatMap(e => e.heapDelta ?? []).filter(d => d.op === 'mutate')
    expect(mutations).toContainEqual(expect.objectContaining({ objectId: globals.a.$ref, property: '2', newValue: 3 }))
  })

  it('records calls, returns and the stack during recursion', () => {
    const result = trace('def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\nprint(fact(4))\n')
    expect(result.output).toEqual(['24'])
    expect(result.events.filter(e => e.type === 'function_return').map(e => e.returnValue)).toEqual([1, 2, 6, 24])
    expect(Math.max(...result.events.map(e => e.stackSnapshot!.length))).toBe(5)   // (global) + four calls
  })

  it('explains what each line does, with the real values', () => {
    const result = trace([
      'def fact(n):',
      '    if n <= 1:',
      '        return 1',
      '    return n * fact(n - 1)',
      '',
      'total = 0',
      'for n in [1, 2]:',
      '    total += n',
      'items = []',
      'items.append(total)',
      'print("total", total, fact(3))',
    ].join('\n') + '\n')
    const summaries = result.events.filter(e => e.type === 'statement_enter').map(e => `${e.line}: ${explainTraceEvent(e).summary}`)
    expect(summaries).toEqual([
      '1: Defines the function `fact`',
      '6: Assigns `total` = 0',
      '7: Next item: `n` = 1',
      '8: Updates `total`: 0 → 1',
      '7: Next item: `n`: 1 → 2',
      '8: Updates `total`: 1 → 3',
      '7: The loop is finished',
      '9: Assigns `items` = a new list (#1) holding []',
      '10: Calls `items.append(...)`',
      '11: Prints "total 3 6"',
      '2: `n <= 1` is false, so the block is skipped',
      '4: Returns 6',
      '2: `n <= 1` is false, so the block is skipped',
      '4: Returns 2',
      '2: `n <= 1` is true, so the indented block runs',
      '3: Returns 1',
    ])
    const append = result.events.find(e => e.type === 'statement_enter' && e.line === 10)!
    expect(explainTraceEvent(append).why).toContain('list #1[0] is set to 3')
    const call = result.events.find(e => e.type === 'statement_enter' && e.line === 11)!
    expect(explainTraceEvent(call).why).toContain('It calls `fact`')
  })

  it('reports errors and limits with their own statuses', () => {
    expect(trace('def broken(:\n').status).toBe('syntax-error')
    const runtime = trace('items = []\nitems[3]\n')
    expect(runtime.status).toBe('runtime-error')
    expect(runtime.error?.type).toBe('IndexError')
    const loop = trace('while True:\n    pass\n')
    expect(loop.status).toBe('limit')
    expect(loop.limit?.kind).toBe('steps')
  })

  it('feeds the Input box to input() and shows each line read', () => {
    const inputs = parseScriptedInput('Ada\n36\n')
    const result = trace('name = input("Name? ")\nage = int(input("Age? "))\nprint(f"{name} is {age}")\n', inputs)
    expect(result.status).toBe('completed')
    // Echoed the way a terminal shows typed text.
    expect(result.output).toEqual(['Name? Ada', 'Age? 36', 'Ada is 36'])
    expect(result.events.filter(e => e.inputRead).map(e => e.inputRead)).toEqual([['Ada'], ['36']])
  })

  it("records each line's sub-expressions in evaluation order, not those of the functions it calls", () => {
    const result = trace('def double(n):\n    return n + n\n\nprice, qty = 4, 3\ntotal = price * qty - double(1)\nok = qty > 5 and double(qty) > 0\n')
    const line = (n: number) => result.events.find(e => e.type === 'statement_enter' && e.line === n)!
    const steps = (n: number) => ((line(n).outcome as any).expressions as [number, unknown][])
      .map(([id, value]) => `${result.expressions![id].code} → ${value}`)
    expect(steps(5)).toEqual(['price → 4', 'qty → 3', 'price * qty → 12', 'double(1) → 2', 'price * qty - double(1) → 10'])
    // `and` stops at a false left side: double(qty) is never worked out.
    expect(steps(6)).toEqual(['qty → 3', 'qty > 5 → false', 'qty > 5 and double(qty) > 0 → false'])
    // Inside double, `n + n` belongs to line 2, not to the line that called it.
    expect(steps(2)).toEqual(['n → 1', 'n → 1', 'n + n → 2'])
    const span = result.expressions!.find(s => s.code === 'price * qty')!
    expect([span.line, span.col, span.endLine, span.endCol]).toEqual([5, 8, 5, 19])
  })

  it('shows what a returned object holds, not only its number', () => {
    const result = trace('def move(row, col):\n    return row + 1, col\n\nr, c = move(0, 0)\n')
    const returned = result.events.find(e => e.type === 'function_return')!
    expect(explainTraceEvent(returned).summary).toMatch(/returns \(1, 0\) \(tuple #\d+\)/)
  })

  it('says so when the program reads more input than there is', () => {
    const result = trace('a = input()\nb = input()\n', parseScriptedInput('only one\n'))
    expect(result.status).toBe('runtime-error')
    expect(result.error?.type).toBe('EOFError')
    expect(result.error?.message).toContain('more input than the Input box has')
  })
})

const GAME = `import pygame
pygame.init()
screen = pygame.display.set_mode((200, 100))
clock = pygame.time.Clock()
x = 20
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    keys = pygame.key.get_pressed()
    if keys[pygame.K_RIGHT]:
        x += 10
    screen.fill((20, 20, 40))
    pygame.draw.circle(screen, (250, 200, 0), (x, 50), 12)
    pygame.display.flip()
    clock.tick(30)
pygame.quit()
print("x", x, "time", pygame.time.get_ticks())
`

describe.skipIf(!pygamePython)('CodeLens pygame stand-in on CPython', () => {
  it('runs a game loop on scripted keys, with a pretend clock and a picture per frame', () => {
    const inputs = parseScriptedInput('@frame 2 keydown right\n@frame 5 keyup right\n')
    const result = trace(GAME, inputs, pygamePython)
    expect(result.status).toBe('completed')
    // Held during frames 2, 3 and 4; the automatic QUIT arrives on frame 6, after 7 ticks of 33 ms.
    expect(result.output).toEqual(['x 50 time 231'])
    expect(result.events.flatMap(e => e.gameEvents ?? [])).toEqual(['KEYDOWN right', 'KEYUP right', 'quit (automatic)'])
    // Frames 0 and 1 look the same, so frame 1 reuses frame 0's picture.
    expect(result.frames?.map(f => f.frame)).toEqual([0, 2, 3, 4])
    expect(result.frames?.[0].png.startsWith('iVBORw0KGgo')).toBe(true)   // base64 of a PNG signature
    const last = result.events.at(-1)!
    expect(last.screen).toBe(3)
  })

  it('a tap holds the key for exactly one frame', () => {
    const result = trace(GAME, parseScriptedInput('@frame 1 key right\n@frame 3 quit\n'), pygamePython)
    expect(result.output).toEqual(['x 30 time 132'])
  })
})
