import { describe, it, expect } from 'vitest'
import { LESSONS, correct } from './lessons.js'
import { Runner } from './runner.js'
import { ORIGINAL } from './programs/index.js'

const EDITS = { q: s => s.replace('reward: 1,', 'reward: 2,'), a2c: s => s.replace('STEPS_PER_WORLD = 5', 'STEPS_PER_WORLD = 2') }

describe('every guided step can be done, and checks against the real run', () => {
  for (const [id, lessons] of Object.entries(LESSONS)) {
    for (const lesson of lessons) {
      it(`${id}: ${lesson.title}`, () => {
        const source = lesson.edit ? EDITS[id](ORIGINAL[id]) : undefined
        if (lesson.edit) { expect(lesson.edit.done(source)).toBe(true); expect(lesson.edit.done(ORIGINAL[id])).toBe(false) }
        const r = new Runner(id, lesson.start.supplied, { data: lesson.start.data, source })
        lesson.go(r)
        const ask = lesson.ask(r)
        expect(ask.prompt).not.toMatch(/undefined|NaN/)
        expect(ask.hint).toBeTruthy()
        const actual = lesson.reveal(r)
        expect(actual, 'the program produced an answer').not.toBeUndefined()
        if (ask.kind === 'choice') {
          expect(ask.options).toContain(actual)
          for (const wrong of ask.options.filter(o => o !== actual)) expect(correct(ask, wrong, actual)).toBe(false)
        } else {
          expect(correct(ask, actual.toFixed(4), actual)).toBe(true)
          expect(correct(ask, String(actual + 1), actual)).toBe(false)
        }
        expect(lesson.why(r, actual)).not.toMatch(/undefined|NaN/)
      })
    }
  }
})
