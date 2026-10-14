// Node-side twin of exercise.worker.js, for tests: the same Pyodide release, the same order (code,
// then checks, in one fresh namespace). A lab's exercises test proves every reference solution passes
// its checks and every starter does not, so no exercise is unsolvable or already solved.
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

let pyodide
export async function startPython() {
  if (!pyodide) {
    const { loadPyodide } = await import(pathToFileURL(resolve('node_modules/pyodide/pyodide.mjs')).href)
    pyodide = await loadPyodide()
  }
  return pyodide
}

export async function runExercise(code, checks, packages = []) {
  const py = await startPython()
  if (packages.length) await py.loadPackage(packages)
  let output = ''
  py.setStdout({ batched: t => { output += t + '\n' } })
  py.setStderr({ batched: t => { output += t + '\n' } })
  const scope = py.toPy({})
  let stage = 'code'
  try {
    await py.runPythonAsync(code, { globals: scope })
    stage = 'checks'
    if (checks) await py.runPythonAsync(checks, { globals: scope })
    return { passed: true, output }
  } catch (error) {
    return { passed: false, output, stage, error: String(error.message || error).trim().split('\n').slice(-3).join('\n') }
  } finally { scope.destroy() }
}

// Every exercise block in `lessons`, as [lesson, block index, spec].
export const exercisesOf = lessons => lessons.flatMap(l => l.blocks.flatMap((b, k) => b.exercise ? [[l, k, b.exercise]] : []))
