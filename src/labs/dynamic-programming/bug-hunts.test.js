import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { BUG_HUNTS, buggyCode, bugLines, decoyNote, fill } from './hunt.js'
import { ALL_CHALLENGES as CORE_CHALLENGES } from './lessons/index.js'
import { ORACLES as CORE_ORACLES } from './lessons/core-oracles.js'
import { ADVANCED_ORACLES } from './lessons/advanced-oracles.js'
import { EXPERT_ORACLES } from './lessons/expert-oracles.js'
import { SPECIALIST_ORACLES } from './lessons/specialist-oracles.js'

// Every challenge and answer key the hunts' lessons use (Core and Advanced).
const ORACLES = { ...CORE_ORACLES, ...ADVANCED_ORACLES, ...EXPERT_ORACLES, ...SPECIALIST_ORACLES }
import { runJavaScriptCases } from './runtime/checks.js'

const LANGUAGES = ['Python', 'JavaScript']
const entries = Object.entries(BUG_HUNTS)

describe('bug hunt data', () => {
  it('has a hunt only for lessons with a challenge, and teaches before it asks', () => {
    expect(entries.length).toBeGreaterThanOrEqual(12)
    for (const [id, hunt] of entries) {
      expect(CORE_CHALLENGES[id], id).toBeTruthy()
      expect(hunt.know.length, id).toBeGreaterThan(80)
      expect(hunt.why, id).toContain('{got}')
      expect(hunt.why, id).toContain('{want}')
      expect(hunt.fix.length, id).toBeGreaterThan(40)
      expect(hunt.clues.length, id).toBe(3)
    }
  })

  it('applies each swap exactly once, and changes nothing else', () => {
    for (const [id, hunt] of entries) for (const language of LANGUAGES) {
      const [right, wrong] = hunt.swap[language]
      const code = hunt.code[language]
      expect(code.split(right).length - 1, `${id} ${language}: the right lines occur once`).toBe(1)
      expect(right, `${id} ${language}`).not.toBe(wrong)
      const buggy = buggyCode(hunt, language).split('\n')
      const lines = bugLines(hunt, language)
      expect(lines.map(n => buggy[n - 1]).join('\n'), `${id} ${language}: the bug lines are the swapped-in lines`).toBe(wrong)
      // Outside the bug, the two versions agree line for line.
      const before = code.split('\n').slice(0, lines[0] - 1)
      const after = code.split('\n').slice(lines[0] - 1 + right.split('\n').length)
      expect(buggy.slice(0, lines[0] - 1), id).toEqual(before)
      expect(buggy.slice(lines.at(-1)), id).toEqual(after)
    }
  })

  it('has decoy notes that each name one correct line', () => {
    for (const [id, hunt] of entries) for (const language of LANGUAGES) {
      const buggy = buggyCode(hunt, language).split('\n')
      const lines = bugLines(hunt, language)
      for (const [match] of hunt.decoys) {
        const text = match[language === 'Python' ? 0 : 1]
        const hits = buggy.map((line, i) => [line, i + 1]).filter(([line]) => line.includes(text))
        expect(hits.length, `${id} ${language} decoy "${text}"`).toBe(1)
        expect(lines, `${id} ${language} decoy "${text}" is not on the bug`).not.toContain(hits[0][1])
        expect(decoyNote(hunt, language, hits[0][0]), id).toBeTruthy()
      }
    }
  })

  it('gives the symptom’s right answer from the exhaustive oracle, not from the code', () => {
    for (const [id, hunt] of entries) {
      expect(ORACLES[id](structuredClone(hunt.symptom.args)), id).toEqual(hunt.symptom.expected)
      expect(hunt.symptom.buggy, id).not.toEqual(hunt.symptom.expected)
    }
  })

  it('fills the symptom into the text, in the learner’s language', () => {
    const hunt = BUG_HUNTS['subset-sum']
    expect(fill(hunt, '{call} gave {got}, not {want}', 'Python')).toBe('solve([3,5], 5) gave False, not True')
    expect(fill(hunt, '{got}', 'JavaScript')).toBe('false')
  })
})

describe('bug hunts in JavaScript', () => {
  for (const [id, hunt] of entries) {
    it(`${id}: the correct code passes, the buggy code fails, and the symptom shows it`, () => {
      const cases = CORE_CHALLENGES[id].cases
      const right = runJavaScriptCases(hunt.code.JavaScript, cases)
      expect(right.passed, `${id} correct: ${right.error ?? JSON.stringify(right.rows.filter(r => !r.passed))}`).toBe(true)
      const wrong = runJavaScriptCases(buggyCode(hunt, 'JavaScript'), cases)
      expect(wrong.passed, `${id} buggy code must fail a hidden case`).toBe(false)
      const symptom = runJavaScriptCases(buggyCode(hunt, 'JavaScript'), [{ args: hunt.symptom.args, expected: hunt.symptom.buggy }])
      expect(symptom.passed, `${id} buggy code on the symptom returned ${symptom.rows[0]?.actual}`).toBe(true)
    })
  }
})

// Both versions of every hunt, in real Python (one process), compared as the page's worker does.
const PYTHON = ['python', 'python3'].find(cmd => { try { return spawnSync(cmd, ['-c', 'print(1)']).status === 0 } catch { return false } })
it.skipIf(!PYTHON)('bug hunts in real Python: the correct code passes, the buggy code fails, and the symptom shows it', () => {
  const jobs = Object.fromEntries(entries.map(([id, hunt]) => [id, {
    right: hunt.code.Python,
    wrong: buggyCode(hunt, 'Python'),
    cases: CORE_CHALLENGES[id].cases,
    symptom: hunt.symptom.args,
  }]))
  const script = [
    'import json, sys',
    'sys.setrecursionlimit(10000)',
    'jobs = json.load(sys.stdin)',
    'dump = lambda v: json.dumps(v, sort_keys=True, separators=(",", ":"), allow_nan=False)',
    'def run(code, cases):',
    '    scope = {}',
    '    exec(code, scope)',
    '    rows = []',
    '    for case in cases:',
    '        try:',
    '            rows.append(dump(scope["solve"](*case["args"])) == dump(case["expected"]))',
    '        except Exception as e:',
    '            rows.append(type(e).__name__ + ": " + str(e))',
    '    return rows',
    'out = {}',
    'for name, job in jobs.items():',
    '    scope = {}',
    '    exec(job["wrong"], scope)',
    '    out[name] = {"right": run(job["right"], job["cases"]), "wrong": run(job["wrong"], job["cases"]), "symptom": dump(scope["solve"](*job["symptom"]))}',
    'print(json.dumps(out))',
  ].join(String.fromCharCode(10))
  const r = spawnSync(PYTHON, ['-c', script], { input: JSON.stringify(jobs), encoding: 'utf8', timeout: 120000, maxBuffer: 1 << 26 })
  expect(r.status, r.stderr).toBe(0)
  const results = JSON.parse(r.stdout)
  for (const [id, hunt] of entries) {
    const { right, wrong, symptom } = results[id]
    expect(right.filter(x => x !== true), `${id} correct Python`).toEqual([])
    expect(wrong.every(x => x === true), `${id} buggy Python must fail a hidden case`).toBe(false)
    expect(JSON.parse(symptom), `${id} buggy Python on the symptom`).toEqual(hunt.symptom.buggy)
  }
}, 120000)
