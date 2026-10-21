import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { EXPLAINED, explainLines } from './explain.js'
import { ALL_CHALLENGES as CHALLENGES } from './lessons/index.js'
import { runJavaScriptCases } from './runtime/checks.js'

const LANGUAGES = ['Python', 'JavaScript']
const entries = Object.entries(EXPLAINED)

describe('explained reference solutions', () => {
  it('explains lessons that have a challenge', () => {
    expect(entries.length).toBeGreaterThanOrEqual(12)
    for (const [id] of entries) expect(CHALLENGES[id], id).toBeTruthy()
  })

  it('attaches every note to a line, in order, in both languages', () => {
    for (const [id, entry] of entries) for (const language of LANGUAGES) {
      const { lines, missing } = explainLines(entry, language)
      expect(missing, `${id} ${language}: notes whose text is not in the code`).toEqual([])
      expect(lines.filter(l => l.notes.length).length, `${id} ${language}`).toBeGreaterThanOrEqual(3)
      for (const [, , note] of entry.notes) expect(note.length, id).toBeGreaterThan(20)
    }
  })

  it('names, in its maths table, code that is really in each version', () => {
    for (const [id, entry] of entries) {
      expect(entry.math.length, id).toBeGreaterThanOrEqual(2)
      for (const [maths, py, js, meaning] of entry.math) {
        expect(maths && meaning, id).toBeTruthy()
        // "best[c] after item i", "below[i] for row r" or "ways = [1] + …" name code that is there before the words or the "…".
        const core = text => text.split(/ after | for row | …|…|, at /)[0].trim()
        expect(entry.code.Python, `${id}: ${py}`).toContain(core(py))
        expect(entry.code.JavaScript, `${id}: ${js}`).toContain(core(js))
      }
    }
  })

  for (const [id, entry] of entries) {
    it(`${id}: the JavaScript passes its challenge`, () => {
      const r = runJavaScriptCases(entry.code.JavaScript, CHALLENGES[id].cases)
      expect(r.passed, `${id}: ${r.error ?? JSON.stringify(r.rows.filter(x => !x.passed))}`).toBe(true)
    })
  }
})

const PYTHON = ['python', 'python3'].find(cmd => { try { return spawnSync(cmd, ['-c', 'print(1)']).status === 0 } catch { return false } })
it.skipIf(!PYTHON)('every explained Python solution passes its challenge, in real Python', () => {
  const jobs = Object.fromEntries(entries.map(([id, e]) => [id, { code: e.code.Python, cases: CHALLENGES[id].cases }]))
  const script = [
    'import json, sys',
    'sys.setrecursionlimit(10000)',
    'jobs = json.load(sys.stdin)',
    'dump = lambda v: json.dumps(v, sort_keys=True, separators=(",", ":"), allow_nan=False)',
    'out = {}',
    'for name, job in jobs.items():',
    '    scope = {}',
    '    exec(job["code"], scope)',
    '    rows = []',
    '    for case in job["cases"]:',
    '        try:',
    '            rows.append(dump(scope["solve"](*case["args"])) == dump(case["expected"]))',
    '        except Exception as e:',
    '            rows.append(type(e).__name__ + ": " + str(e))',
    '    out[name] = rows',
    'print(json.dumps(out))',
  ].join(String.fromCharCode(10))
  const r = spawnSync(PYTHON, ['-c', script], { input: JSON.stringify(jobs), encoding: 'utf8', timeout: 120000, maxBuffer: 1 << 26 })
  expect(r.status, r.stderr).toBe(0)
  for (const [id, rows] of Object.entries(JSON.parse(r.stdout))) expect(rows.filter(x => x !== true), id).toEqual([])
}, 120000)
