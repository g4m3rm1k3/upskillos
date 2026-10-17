// Every coding challenge in the course, run the way the lesson page runs it (the learner's
// code, then the hidden tests, in one sandbox) but in Node, with a time limit: the
// reference solution must pass, and the starting code must fail. A challenge that passes
// with the stub teaches nothing; one whose own solution fails is wrong.
//
// Lessons listed in REBUILT also get the structure the lesson standard asks for
// (docs/lesson-writing-standard.md, docs/dp-course-plan.md).
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

// Lessons rebuilt to the standard so far (docs/dp-course-plan.md). Add each as it is done.
export const REBUILT = ['dp1-001']

const root = import.meta.dirname
const files = fs.readdirSync(root).filter(d => /^\d+-/.test(d)).sort((a, b) => parseInt(a) - parseInt(b))
  .flatMap(ch => fs.readdirSync(path.join(root, ch)).filter(f => /^\d+-.*\.js$/.test(f)).map(f => path.join(root, ch, f)))
const lessons = await Promise.all(files.map(async f => (await import(f)).default))
const cellsOf = l => [...(l.intuition?.visualizations ?? []), ...(l.math?.visualizations ?? [])].flatMap(v => v.props?.lesson?.cells ?? [])

// Runs code + tests as ScienceNotebook does, and returns the verdict.
export function runChallenge(cell, code) {
  // As in the browser's worker: no DOM, results through __line and __verdict.
  let verdict = null
  const lines = []
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, __line: (ok, text) => lines.push([ok, text]), __verdict: (pass, message) => { verdict ??= { pass: !!pass, message: String(message ?? '') } } })
  try {
    vm.runInContext(`try{(function(){\n${code}\n;(function(){\n${cell.tests}\n})();\n})();}catch(e){__verdict(false,'Your code stopped with an error: '+e.message);}`, ctx, { timeout: 3000 })
  } catch (e) {
    verdict ??= { pass: false, message: `(no verdict: ${e.message})` }
  }
  return verdict ?? { pass: false, message: '(no verdict)' }
}

for (const lesson of lessons) {
  const coding = cellsOf(lesson).filter(c => c.type === 'coding' && c.tests)
  if (!coding.length) continue
  describe(`${lesson.id} ${lesson.title}`, () => {
    coding.forEach((cell, i) => {
      it(`challenge ${i + 1}: the solution passes and the starting code fails`, () => {
        const solved = runChallenge(cell, cell.solutionCode)
        expect(solved, solved.message).toMatchObject({ pass: true })
        const stub = runChallenge(cell, cell.startCode)
        expect(stub.pass, `the starting code should fail: ${stub.message}`).toBe(false)
        expect(stub.message.length).toBeGreaterThan(0)
      })
    })
  })
}

describe('rebuilt lessons meet the standard', () => {
  for (const id of REBUILT) {
    const l = lessons.find(x => x.id === id)
    it(`${id} exists`, () => expect(l).toBeTruthy())
    if (!l) continue
    it(`${id}: every challenge can be attempted and is checked by running it`, () => {
      const cells = cellsOf(l)
      expect(cells.filter(c => c.type === 'js' && c.solutionCode).length, 'a js cell with a solution is a read-only challenge').toBe(0)
      expect(cells.filter(c => c.type === 'coding').every(c => c.tests && c.solutionCode && c.startCode)).toBe(true)
      expect(cells.filter(c => c.type === 'coding').length).toBeGreaterThanOrEqual(2)
    })
    it(`${id}: has every section of the lesson standard`, () => {
      for (const k of ['hook', 'intuition', 'math', 'rigor', 'examples', 'challenges', 'misconceptions', 'transferPrompts', 'debugging', 'mastery', 'semantics', 'spiral', 'checkpoints', 'assessment', 'quiz']) expect(l[k], k).toBeTruthy()
      expect(l.intuition.callouts.some(c => /^Procedure/.test(c.title))).toBe(true)
      expect(l.intuition.callouts.some(c => c.type === 'warning')).toBe(true)
      expect(l.rigor.prose.length).toBe(4)
      expect(l.examples.length).toBeGreaterThanOrEqual(3)
      expect(l.challenges.length).toBe(3)
      expect(l.misconceptions.length).toBeGreaterThanOrEqual(2)
      expect(l.transferPrompts.length).toBeGreaterThanOrEqual(2)
      expect(l.debugging.length).toBeGreaterThanOrEqual(2)
      expect(l.checkpoints.length).toBe(8)
      expect([1, 2, 3, 4]).toContain(l.mastery.targetLevel)
    })
    it(`${id}: quiz and assessment answers are options, and the right one is not given away by its length`, () => {
      const questions = [...l.quiz, ...l.assessment.questions]
      expect(l.quiz.length).toBeGreaterThanOrEqual(6)
      for (const q of questions) {
        expect(q.options, q.id).toContain(q.answer)
        expect(q.id.startsWith(l.id), q.id).toBe(true)
        const others = q.options.filter(o => o !== q.answer).map(o => o.length)
        expect(q.answer.length, `${q.id}: the answer is much longer than every other option`).toBeLessThanOrEqual(Math.max(...others) * 1.4 + 10)
      }
      for (const q of l.quiz) expect(Array.isArray(q.hints) && q.hints.length > 0, q.id).toBe(true)
      for (const x of [...l.examples, ...l.challenges, ...l.checkpoints]) expect(x.id.includes(l.id), x.id).toBe(true)
    })
  }
})
