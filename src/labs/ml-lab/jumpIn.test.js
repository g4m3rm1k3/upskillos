import { describe, expect, it } from 'vitest'
import { jumpIns } from './jumpIn.js'
import { labs, labForLesson } from './labs/index.js'
import { diagnose } from './Checkpoint.jsx'

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
  it('names common slips', () => {
    expect(diagnose(6, lesson)).toMatch(/sign/)
    expect(diagnose(-12, lesson)).toMatch(/factor of 2/)
    expect(diagnose(0.8, { answer: 80 })).toMatch(/fraction/)
    expect(diagnose(80, { answer: 0.8 })).toMatch(/percentage/)
    expect(diagnose(5, lesson)).toBeNull()
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
