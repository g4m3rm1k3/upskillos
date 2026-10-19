import { describe, expect, it } from 'vitest'
import { executeScript } from '../../engines/openmat/openmatEngine.js'
import { LESSONS, MODULES, STAGES, TRACK_STAGE } from './curriculum.js'
import { ROLES } from './lessons/uses.js'
import { gradeWorkspace, matchesNumeric } from './grading.js'
import { cloneable } from './execution.js'
import { ENRICH } from './lessons/enrich.js'
import katex from 'katex'

describe('OpenMAT linear algebra curriculum', () => {
  it('has durable unique ids, complete teaching sequences and progressively harder modules', () => {
    expect(new Set(LESSONS.map(lesson => lesson.id)).size).toBe(LESSONS.length)
    // Core modules (Stages 1-3) need at least four lessons; Stage 4 modules are optional tracks.
    for (const module of MODULES) expect(LESSONS.filter(lesson => lesson.module === module).length, module).toBeGreaterThanOrEqual(STAGES[3][1].includes(module) ? 2 : 4)
    for (const lesson of LESSONS) {
      expect(lesson.id).toMatch(/^laml-/)
      expect(lesson.prose.length).toBeGreaterThanOrEqual(4)
      expect(lesson.procedure.length).toBeGreaterThanOrEqual(3)
      expect(lesson.demo.explain.length).toBeGreaterThanOrEqual(3)
      expect(lesson.challenge.hints.length).toBeGreaterThanOrEqual(3)
      expect(lesson.prediction.question.length).toBeGreaterThan(15)
      expect(lesson.prediction.answer.length).toBeGreaterThan(15)
      expect(lesson.challenge.transfer.length).toBeGreaterThan(30)
      expect(lesson.challenge.checks.length).toBeGreaterThan(0)
    }
    expect(LESSONS[0].level).toBe('Beginner')
    expect(LESSONS.at(-1).level).toBe('Capstone')
  })

  for (const lesson of LESSONS) {
    it(`${lesson.id}: real engine demo plots, reference passes, starter fails`, () => {
      const demo = executeScript(lesson.demo.draw ? `${lesson.demo.code}
${lesson.demo.draw}` : lesson.demo.code)
      expect(demo.figureJson).toBeTruthy()
      const figure = JSON.parse(demo.figureJson)
      const panels = figure.type === 'opencalc_subplots' ? figure.panels.filter(Boolean) : [figure]
      expect(panels.length).toBeGreaterThan(0)
      for (const panel of panels) {
        expect(panel.title).toBeTruthy()
        // Figure format puts labels under axes; plotting itself must contain actual data.
        expect(JSON.stringify(panel)).not.toMatch(/NaN|Infinity/)
      }
      expect(demo.output).not.toBe('No output.')
      // The browser runs code in a worker; results must survive structured clone (functions cannot).
      expect(() => structuredClone(cloneable({ result: demo, checks: [] }))).not.toThrow()
      const solve = code => executeScript(`${lesson.challenge.setup}\n${code}`)
      const correct = gradeWorkspace(solve(lesson.challenge.solution).workspace, lesson.challenge.checks)
      expect(correct.filter(check => !check.pass)).toEqual([])
      expect(gradeWorkspace(solve(lesson.challenge.starter).workspace, lesson.challenge.checks).every(check => check.pass)).toBe(false)
      for (const variant of lesson.challenge.cases ?? []) {
        const trial = executeScript(`${variant.setup}\n${lesson.challenge.solution}`)
        expect(gradeWorkspace(trial.workspace, variant.checks).filter(check => !check.pass)).toEqual([])
      }
    })
  }
})

// Every $…$ or $$…$$ segment in a string must render in KaTeX; a typo would show raw red source.
function mathIn(text) { return [...String(text).matchAll(/\$\$([^$]+)\$\$|\$([^$]+)\$/g)].map(m => m[1] ?? m[2]) }
const renders = tex => { katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); return true }

describe('notation, quick checks and proofs', () => {
  it('every enrichment entry names a real lesson', () => {
    const ids = new Set(LESSONS.map(lesson => lesson.id))
    expect(Object.keys(ENRICH).filter(id => !ids.has(id))).toEqual([])
    // Guards the checker itself: it must find the inline maths it is meant to verify.
    const found = LESSONS.flatMap(lesson => [...(lesson.quiz ?? []).flatMap(item => [item.q, ...item.options]), ...(lesson.proof?.steps ?? []).flatMap(step => step.options)]).flatMap(mathIn)
    expect(found.length).toBeGreaterThan(200)
    expect(() => renders('\\frac{1}{')).toThrow()
  })
  for (const lesson of LESSONS) {
    it(`${lesson.id}: notation renders and questions are well formed`, () => {
      expect(lesson.notation?.length).toBeGreaterThan(0)
      for (const item of lesson.notation) { expect(renders(item.tex)).toBe(true); mathIn(item.say).forEach(renders) }
      expect(lesson.quiz?.length).toBeGreaterThanOrEqual(2)
      for (const item of lesson.quiz) {
        expect(item.options.length).toBeGreaterThanOrEqual(2)
        expect(new Set(item.options).size).toBe(item.options.length)
        expect(item.options[item.answer]).toBeTruthy()
        expect(item.why.length).toBeGreaterThan(10)
        ;[item.q, item.why, ...item.options].flatMap(mathIn).forEach(renders)
      }
      for (const part of ['proof', 'derive']) if (lesson[part]) {
        const { claim, given, steps, conclusion } = lesson[part]
        expect(steps.length).toBeGreaterThanOrEqual(3)
        for (const step of steps) {
          expect(step.options[step.answer]).toBeTruthy()
          expect(new Set(step.options).size).toBe(step.options.length)
          ;[step.ask, step.why, step.hint ?? '', ...step.options].flatMap(mathIn).forEach(renders)
        }
        ;[claim, given ?? '', conclusion].flatMap(mathIn).forEach(renders)
      }
    })
  }
})

describe('gentle curve', () => {
  it('puts every module in exactly one stage, in curriculum order', () => {
    expect(STAGES.flatMap(([, modules]) => modules)).toEqual(MODULES)
  })
  it('opens every lesson with why it matters and where it is used', () => {
    const roles = new Set(ROLES.map(([id]) => id))
    // Every module has been reworked in the gentle style, the optional tracks included.
    for (const lesson of LESSONS) {
      expect(lesson.why?.story.length, lesson.id).toBeGreaterThan(80)
      expect(lesson.uses?.length, lesson.id).toBeGreaterThanOrEqual(4)
    }
    for (const lesson of LESSONS.filter(l => STAGES[0][1].includes(l.module))) expect(lesson.level).toBe('Beginner')
    for (const lesson of LESSONS) for (const use of lesson.uses ?? []) {
      expect(roles.has(use.who), `${lesson.id}: ${use.who}`).toBe(true)
      expect(use.story.length).toBeGreaterThan(40)
    }
  })
  it('marks the last stage as optional tracks and keeps "mastery" out of the lessons', () => {
    expect(TRACK_STAGE).toBe(STAGES.at(-1)[0])
    for (const lesson of LESSONS) expect(lesson.track, lesson.id).toBe(STAGES.at(-1)[1].includes(lesson.module) ? lesson.module : undefined)
    for (const lesson of LESSONS) expect(JSON.stringify(lesson), lesson.id).not.toMatch(/mastery/i)
  })
  it('renders the maths in stories, case studies and extra angles', () => {
    for (const lesson of LESSONS) {
      ;[lesson.why?.story ?? '', ...(lesson.uses ?? []).map(use => use.story), ...(lesson.angles ?? []).flatMap(angle => [angle.title, angle.body])].flatMap(mathIn).forEach(renders)
    }
  })
})

describe('worker results', () => {
  it('cannot send a workspace that holds a function unless it is made cloneable', () => {
    const run = executeScript('f = @(x) x.^2;\ny = f(3);')
    expect(() => structuredClone(run)).toThrow()
    const safe = structuredClone(cloneable(run))
    expect(safe.workspace.find(entry => entry.name === 'y').value).toBe(9)
    expect(structuredClone(cloneable({ a: [Infinity, NaN, -0] })).a[0]).toBe(Infinity)
  })
})

describe('numeric evidence', () => {
  it('rejects wrong shapes, missing values and nonfinite results', () => {
    expect(matchesNumeric([1, 2], [[1], [2]])).toBe(false)
    expect(matchesNumeric(['1', 2], [1, 2])).toBe(false)
    expect(matchesNumeric(NaN, 0)).toBe(false)
    expect(matchesNumeric(Infinity, 0)).toBe(false)
    expect(matchesNumeric([1 + 1e-8, 2], [1, 2])).toBe(true)
    expect(matchesNumeric([-1, -2], [1, 2], 1e-6, 'abs')).toBe(true)
    expect(gradeWorkspace([], [{ name: 'answer', expected: 0, message: 'Check the solve.' }])[0]).toMatchObject({ pass: false, message: 'Create a variable named answer. Check the solve.' })
  })
})
