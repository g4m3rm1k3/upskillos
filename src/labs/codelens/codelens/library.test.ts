// Every example in the learning library runs and prints the output it promises, in every
// language this machine can run: JavaScript and TypeScript through the CodeLens interpreter
// (TypeScript compiled the way the worker compiles it), Python with the real interpreter,
// C#, C++ and C through the desktop tracers (skipped where the .NET SDK or GDB is missing).
// Examples with an Input box get it, as CodeLens would give it to them.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { run } from '../../../engines/js/interpreter/interpreter.js'
import { LIBRARY } from './library'
import { compileTypeScript } from './interpreter/typescriptCompiler'
import { desktopScript, parseDesktopResult } from './interpreter/pythonExecutionClient'
import { parseScriptedInput, stdinText } from './scriptedInput'
import type { ExecutionResult } from './types'

const require = createRequire(import.meta.url)
const python = ['python', 'python3', 'py'].find(cmd => spawnSync(cmd, ['--version']).status === 0)
const hasDotnet = (spawnSync('dotnet', ['--list-sdks']).stdout?.toString().trim().length ?? 0) > 0
const hasGdb = spawnSync('gdb', ['-batch', '-nx', '-ex', 'python print(1)']).status === 0 && spawnSync('g++', ['--version']).status === 0
const desktop = hasDotnet || hasGdb ? require('../../../../desktop/app/runtimes/codelens.cjs') : null
const app = { getPath: () => path.join(os.tmpdir(), 'opencalc-codelens-test') }

// A Python with pygame-ce, for the pygame examples: CODELENS_PYGAME_PYTHON, or the default one if it has it.
const pygamePython = [process.env.CODELENS_PYGAME_PYTHON, python].find(cmd => cmd && spawnSync(cmd, ['-c', 'import pygame']).status === 0)

function traceOnDesktop(lang: 'csharp' | 'cpp' | 'c', source: string, input = ''): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    desktop.runCode(app, JSON.stringify({ lang, source, stdin: stdinText(parseScriptedInput(input)) }), (event: any) => {
      if (event.stream === 'stdout') stdout += event.text
      if (event.stream === 'exit') resolve(JSON.parse(stdout))
    }).then((res: any) => { if (!res.ok) reject(new Error(res.reason)) })
  })
}

// The CodeLens Python tracer, as the desktop app runs it.
function traceOnPython(interpreter: string, code: string, input: string): ExecutionResult {
  const run = spawnSync(interpreter, ['-'], { input: desktopScript(code, parseScriptedInput(input)), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } })
  const result = parseDesktopResult(run.stdout.replace(/\r\n/g, '\n'))
  if (!result) throw new Error(`no result; stderr: ${run.stderr}`)
  return result
}

const variants = (lang: string) => LIBRARY.flatMap(example => {
  const variant = example.variants[lang as keyof typeof example.variants]
  return variant ? [[example.id, variant] as const] : []
})

const stdinOf = (input?: string) => parseScriptedInput(input ?? '').stdin

// Programs without input run on plain Python. Programs with input run through the CodeLens
// tracer, since their expected output is what CodeLens shows (each answer echoed after its
// question, as at a terminal); pygame programs also need its pygame stand-in.
const usesPygame = (code: string) => /^\s*(?:import|from)\s+pygame\b/m.test(code)
const plainPython = variants('py').filter(([, v]) => v.input === undefined && !usesPygame(v.code))
const inputPython = variants('py').filter(([, v]) => v.input !== undefined && !usesPygame(v.code))
const pygamePrograms = variants('py').filter(([, v]) => usesPygame(v.code))

describe('CodeLens learning library', () => {
  it('has the teaching notes every example needs', () => {
    for (const example of LIBRARY) {
      expect(example.concept.length, example.id).toBeGreaterThan(80)
      expect(example.watch.length, example.id).toBeGreaterThan(0)
      expect(example.exercises.length, example.id).toBeGreaterThan(0)
      expect(Object.keys(example.variants).length, example.id).toBeGreaterThan(0)
      for (const variant of Object.values(example.variants)) {
        expect(parseScriptedInput(variant?.input ?? '').errors, example.id).toEqual([])
      }
    }
    expect(new Set(LIBRARY.map(e => e.id)).size).toBe(LIBRARY.length)
  })

  it.each(variants('js'))('%s: JavaScript prints its expected output', (_id, variant) => {
    const result = run(variant.code, { stdin: stdinOf(variant.input) }) as { error: unknown; output: string[] }
    expect(result.error).toBeNull()
    expect(result.output).toEqual(variant.output)
  })

  it.each(variants('ts'))('%s: TypeScript compiles and prints its expected output', (_id, variant) => {
    const compiled = compileTypeScript(variant.code)
    expect(compiled.diagnostics.filter(d => d.category === 'error')).toEqual([])
    const result = run(compiled.code, { stdin: stdinOf(variant.input) }) as { error: unknown; output: string[] }
    expect(result.error).toBeNull()
    expect(result.output).toEqual(variant.output)
  })

  it.skipIf(!python).each(plainPython)('%s: Python prints its expected output', (_id, variant) => {
    const result = spawnSync(python!, ['-c', variant.code], { encoding: 'utf8' })
    expect(result.stderr).toBe('')
    expect(result.stdout.replace(/\r\n/g, '\n').trimEnd().split('\n')).toEqual(variant.output)
  })

  it.skipIf(!python).each(inputPython)('%s: Python reads its input and prints its expected output', (_id, variant) => {
    const result = traceOnPython(python!, variant.code, variant.input!)
    expect(result.error).toBeNull()
    expect(result.output).toEqual(variant.output)
  })

  it.skipIf(!pygamePython).each(pygamePrograms)('%s: the pygame game runs on its scripted input', (_id, variant) => {
    const result = traceOnPython(pygamePython!, variant.code, variant.input ?? '')
    expect(result.error).toBeNull()
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(variant.output)
    expect(result.frames?.length).toBeGreaterThan(1)
  })

  it.skipIf(!hasDotnet).each(variants('cs'))('%s: C# traces and prints its expected output', async (_id, variant) => {
    const result = await traceOnDesktop('csharp', variant.code, variant.input)
    expect(result.error).toBeNull()
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(variant.output)
  }, 120_000)

  it.skipIf(!hasGdb).each(variants('cpp'))('%s: C++ traces and prints its expected output', async (_id, variant) => {
    const result = await traceOnDesktop('cpp', variant.code, variant.input)
    expect(result.error).toBeNull()
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(variant.output)
  }, 120_000)

  it.skipIf(!hasGdb).each(variants('c'))('%s: C traces and prints its expected output', async (_id, variant) => {
    const result = await traceOnDesktop('c', variant.code, variant.input)
    expect(result.error).toBeNull()
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(variant.output)
  }, 120_000)
})
