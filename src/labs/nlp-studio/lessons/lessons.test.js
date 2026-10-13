// Every lesson's content checked against the code it teaches: predicted numbers and derivation
// steps against the engine, code notes against the real Python lines, figures against what
// exists. The "write it yourself" checks are run in real Python against the lab's own answer
// (it must pass) and against the starter code (it must not: an exercise that passes before you
// write anything teaches nothing).
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { LESSONS, lessonById } from './index.js'
import { KINDS } from '../Blocks.jsx'
import { programBefore } from '../WriteIt.jsx'
import { SOURCES, parse, unmatchedNotes, functionSource } from '../source.js'
import { FIGURES } from '../figures/index.js'
import { checkScript, readResults, forbiddenIn } from '../checks.js'
import { PROGRAMS } from '../programs.js'

const PYTHON = ['python3', 'python'].find(cmd => { try { return spawnSync(cmd, ['--version']).status === 0 } catch { return false } })

// What the browser runs: the code before yours, your code, then the checks.
function runChecks(spec, code) {
  const program = `${programBefore(spec)}\n\n${code}\n\n${checkScript(spec)}`
  const r = spawnSync(PYTHON, ['-'], { input: program, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  return { ok: r.status === 0, results: readResults(r.stdout ?? ''), stderr: r.stderr }
}

describe('lessons', () => {
  it('have unique ids', () => {
    const ids = LESSONS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('quote every function of the Python they teach', () => {
    // A write block counts too: its "Show me" reveals the lab's version of the function.
    const quoted = new Set(LESSONS.flatMap(l => l.blocks.flatMap(b => (b.code?.fn ? [`${b.code.file}:${b.code.fn}`] : b.write ? [`${b.write.file}:${b.write.fn}`] : []))))
    // utf8_bytes is shown by a figure; count_trees is one line read off the chart; walk() is quoted
    // inside dependencies(); crossing_arcs is explained by a predict and the arcs figure.
    const shownElsewhere = ['text_basics.py:utf8_bytes', 'parsing.py:count_trees', 'parsing.py:walk', 'parsing.py:crossing_arcs',
      // Part 3: dot and norm are given in the cosine exercise and written out in its maths table;
      // classify, accuracy and evaluate are what the figures run, described in the lesson text.
      'counting.py:dot', 'counting.py:norm', 'bayes.py:classify', 'bayes.py:accuracy', 'bayes.py:evaluate',
      // Part 4: the random-number generator's methods (explained in a code note on train_word2vec), the
      // one-line vocabulary(), and train_bike_vectors(), which only calls train_word2vec on the text.
      'vectors.py:__init__', 'vectors.py:random', 'vectors.py:below', 'vectors.py:vocabulary', 'vectors.py:train_bike_vectors',
      // Part 5: the Tensor class is quoted by line range (its __init__, backward and visit); add, relu,
      // transpose and scale follow matmul's pattern exactly; zeros and init_model are setup.
      'tinygpt.py:__init__', 'tinygpt.py:backward', 'tinygpt.py:visit', 'tinygpt.py:zeros', 'tinygpt.py:add', 'tinygpt.py:relu',
      'tinygpt.py:transpose', 'tinygpt.py:scale', 'tinygpt.py:init_model']
    const all = Object.keys(SOURCES).flatMap(file => parse(file).functions.map(f => `${file}:${f.name}`))
    expect(all.filter(fn => !quoted.has(fn) && !shownElsewhere.includes(fn))).toEqual([])
  })

  for (const lesson of LESSONS) {
    describe(`${lesson.number} ${lesson.title}`, () => {
      it('links only to earlier lessons that exist', () => {
        for (const id of lesson.builds) {
          expect(lessonById(id), id).toBeTruthy()
          expect(LESSONS.indexOf(lessonById(id))).toBeLessThan(LESSONS.findIndex(l => l.id === lesson.id))
        }
      })
      it('uses only known block kinds and figures', () => {
        for (const b of lesson.blocks) {
          expect(KINDS.filter(k => k in b).length, JSON.stringify(b).slice(0, 80)).toBe(1)
          if (b.figure) expect(FIGURES[b.figure], b.figure).toBeTruthy()
          if (b.python) expect(PROGRAMS[b.python.program], b.python.program).toBeTruthy()
        }
      })
      it('quotes real code, and every note finds its line', () => {
        for (const b of lesson.blocks.filter(x => x.code)) {
          expect(SOURCES[b.code.file], b.code.file).toBeTruthy()
          expect(unmatchedNotes(b.code), `${b.code.file} ${b.code.fn}`).toEqual([])
        }
      })
      it('asks for numbers the engine really gives', () => {
        for (const b of lesson.blocks.filter(x => x.predict)) {
          expect(typeof b.predict.compute, b.predict.prompt).toBe('function')
          expect(Math.abs(b.predict.compute() - b.predict.answer), b.predict.prompt).toBeLessThanOrEqual(b.predict.tolerance ?? 1e-9)
          for (const m of b.predict.misconceptions ?? []) expect(m.answer, `${b.predict.prompt}: a misconception equal to the answer`).not.toBe(b.predict.answer)
        }
      })
      it('derives numbers the engine really gives', () => {
        for (const b of lesson.blocks.filter(x => x.derive)) for (const step of b.derive.steps) {
          if (step.number === undefined) { expect(step.answer && step.vars, step.prompt).toBeTruthy(); continue }
          expect(typeof step.compute, step.prompt).toBe('function')
          expect(Math.abs(step.compute() - step.number), step.prompt).toBeLessThanOrEqual(step.tolerance ?? 0)
        }
      })
      it('has a right answer for every choice', () => {
        for (const b of lesson.blocks.filter(x => x.choice)) {
          expect(b.choice.options[b.choice.answer], b.choice.prompt).toBeTruthy()
          if (b.choice.verify) expect(b.choice.verify(), `${b.choice.prompt}: the claim behind the answer`).toBe(true)
        }
      })
      for (const b of lesson.blocks.filter(x => x.write)) {
        const spec = b.write
        it(`write ${spec.fn}: the lab's own answer passes and does not use what it forbids`, () => {
          expect(SOURCES[spec.file], spec.file).toBeTruthy()
          const answer = functionSource(spec.file, spec.fn)
          expect(forbiddenIn(answer, spec.forbid)).toEqual([])
          expect(spec.cases.length).toBeGreaterThan(1)
          if (!PYTHON) return
          const header = spec.fn === 'tokenize_regex' ? `import re\nTOKEN_PATTERN = r"\\w+|[^\\w\\s]"\n` : ''
          const run = runChecks(spec, header + answer)
          expect(run.results.filter(r => !r.pass), run.stderr).toEqual([])
          expect(run.results.length).toBe(spec.cases.length)
          expect(run.ok, run.stderr).toBe(true)
        })
        it.skipIf(!PYTHON)(`write ${spec.fn}: the starter code does not pass yet`, () => {
          const run = runChecks(spec, spec.starter)
          expect(run.ok).toBe(false)
          expect(run.results.some(r => !r.pass), run.stderr).toBe(true)
        })
      }
    })
  }
})
