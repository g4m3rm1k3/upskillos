// Every cell of the Greek letters reference runs on real Python and prints the answer its
// worked example states. Skipped where Python with numpy and matplotlib isn't installed.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { GREEK_CELLS } from './greek-letters-cells.js'
import { GREEK_LETTERS } from './greek-letters-data.js'

const python = ['python', 'python3'].find(cmd => spawnSync(cmd, ['-c', 'import numpy, matplotlib']).status === 0)

// Runs each cell in its own namespace, as the page's cells are independent, and reports
// its output or error as JSON. plt.show() closes the figures instead of opening a window.
const RUNNER = `
import contextlib, io, json, sys, traceback
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.show = lambda *a, **k: plt.close("all")
cells = json.loads(sys.stdin.read())
results = {}
for key, code in cells.items():
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(code, key, "exec"), {"__name__": "__main__"})
        results[key] = {"output": out.getvalue()}
    except Exception:
        results[key] = {"output": out.getvalue(), "error": traceback.format_exc()}
print(json.dumps(results))
`

describe('Greek letters reference cells', () => {
  it('belong to meanings that exist', () => {
    for (const key of Object.keys(GREEK_CELLS)) {
      const [id, index] = key.split(':')
      const letter = GREEK_LETTERS.find(l => l.id === id)
      expect(letter?.meanings[Number(index)], key).toBeTruthy()
    }
  })

  it.skipIf(!python)('run on Python and print the answers their examples state', () => {
    const codes = Object.fromEntries(Object.entries(GREEK_CELLS).map(([key, cell]) => [key, cell.code]))
    const run = spawnSync(python, ['-c', RUNNER], { input: JSON.stringify(codes), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } })
    const results = JSON.parse(run.stdout)
    for (const [key, cell] of Object.entries(GREEK_CELLS)) {
      expect(results[key].error, key).toBeUndefined()
      expect(results[key].output, key).toContain(cell.expect)
    }
  }, 180_000)
})
