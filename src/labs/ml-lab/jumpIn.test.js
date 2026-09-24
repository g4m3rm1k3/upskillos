import { describe, expect, it } from 'vitest'
import { jumpIns } from './jumpIn.js'
import { labs, labForLesson } from './labs/index.js'
import { diagnose, parseAnswer, statusText } from './Checkpoint.jsx'

describe('prerequisite checks for learners jumping in', () => {
  it('every lab after Lab 01 has three checks', () => {
    for (const lab of labs.filter(l => l.number > 1)) expect(jumpIns[lab.number]?.checks, `lab ${lab.number}`).toHaveLength(3)
  })
  for (const [number, { checks }] of Object.entries(jumpIns)) {
    it(`lab ${number}: answers are valid and every review lesson exists in an earlier lab`, () => {
      for (const c of checks) {
        expect(c.choices.length).toBeGreaterThanOrEqual(3)
        expect(c.answer).toBeGreaterThanOrEqual(0)
        expect(c.answer).toBeLessThan(c.choices.length)
        for (const ch of c.choices) expect(ch.why?.length, c.question).toBeGreaterThan(3)
        expect(c.review.length).toBeGreaterThan(0)
        for (const id of c.review) {
          const lab = labForLesson(id)
          expect(lab, `${number}: ${id}`).toBeTruthy()
          expect(lab.number, `${number}: ${id}`).toBeLessThan(Number(number))
        }
      }
    })
  }
})

describe('decision checkpoints', () => {
  const choiceLessons = labs.flatMap(l => l.lessons).filter(l => l.choices)
  it('have a valid answer index and explain every option', () => {
    for (const l of choiceLessons) {
      expect(Number.isInteger(l.answer) && l.answer >= 0 && l.answer < l.choices.length, l.id).toBe(true)
      for (const c of l.choices) expect(c.why?.length, `${l.id}: ${c.text}`).toBeGreaterThan(10)
    }
  })
})

describe('wrong-answer diagnosis', () => {
  it('lesson misconceptions never match the correct answer', () => {
    for (const l of labs.flatMap(lab => lab.lessons)) for (const m of l.misconceptions ?? []) {
      expect(Math.abs(m.answer - l.answer) > (l.tolerance ?? 1e-6), `${l.id}: ${m.answer}`).toBe(true)
      expect(m.feedback.length, l.id).toBeGreaterThan(15)
    }
  })
  const lesson = { answer: -6 }
  it('names common slips, worded as possibilities', () => {
    expect(diagnose(6, lesson)).toMatch(/opposite sign/)
    expect(diagnose(-12, lesson)).toMatch(/factor of 2/)
    expect(diagnose(80, { answer: 0.8 })).toMatch(/looks like a percentage/)
    expect(diagnose(0.8, { answer: 80 })).toMatch(/100 times too small/)
    expect(diagnose(0.8, { answer: 80, percent: true })).toMatch(/fraction rather than the percentage/)
    expect(diagnose(5, lesson)).toBeNull()
    expect(diagnose(6, lesson)).toMatch(/If that is the slip/)
    expect(diagnose(-12, lesson)).toMatch(/can be a coincidence/)
  })
  it('prefers a lesson’s own misconceptions', () => {
    expect(diagnose(4, { answer: 7, misconceptions: [{ answer: 4, feedback: 'mine' }] })).toBe('mine')
  })
})

describe('beginner labs teach with runnable examples', () => {
  it('every lesson in Labs 01–08 has notebook cells, and a math ↔ code table unless it is a picture-only lesson', () => {
    for (const lab of labs.filter(l => l.number <= 8)) for (const l of lab.lessons) {
      expect(l.notebook?.cells?.length, l.id).toBeGreaterThan(0)
      for (const c of l.notebook.cells) expect(c.code?.length, `${l.id}: ${c.title}`).toBeGreaterThan(10)
      if (l.id !== 'l03-bowl') expect(l.mathCode?.rows?.length, l.id).toBeGreaterThan(0)
    }
  })
})

describe('answer parsing', () => {
  it('accepts decimals, fractions and scientific notation, and never evaluates expressions', () => {
    expect(parseAnswer('0.25').value).toBe(0.25)
    expect(parseAnswer(' 1/4 ').value).toBe(0.25)
    expect(parseAnswer('\u22123').value).toBe(-3)
    expect(parseAnswer('-6/-4').value).toBe(1.5)
    expect(parseAnswer('.5').value).toBe(0.5)
    expect(parseAnswer('2e-5').value).toBe(2e-5)
    for (const bad of ['', '1/0', '2*3', 'Math.PI', '1+1', '(1)/2', '1/2/3', 'abc', '0x10']) expect(parseAnswer(bad).error, bad).toBeTruthy()
  })
  it('explains commas and percentages instead of guessing', () => {
    expect(parseAnswer('1,5').error).toMatch(/dot for decimals/)
    expect(parseAnswer('80%').error).toMatch(/enter 0.8/)
    expect(parseAnswer('80%', { percent: true }).value).toBe(80)
    expect(parseAnswer('80', { percent: true }).value).toBe(80)
  })
  it('never claims independent mastery', () => {
    for (const help of ['none', 'feedback', 'explanation', undefined]) expect(statusText({ passed: true, help })).toMatch(/fresh version/)
    expect(statusText({ passed: true, help: 'none' })).toMatch(/without help/)
    expect(statusText({ passed: true })).toMatch(/before help was tracked/)
  })
})
