// Every lesson's content checked against the code it teaches: predicted numbers against the
// engine, code notes against the real Python lines, figures and links against what exists.
import { describe, expect, it } from 'vitest'
import { LESSONS, lessonById } from './index.js'
import { unmatchedNotes, SOURCES } from '../source.js'
import { FIGURES } from '../figures/index.js'

const KINDS = ['h', 'md', 'figure', 'code', 'mathCode', 'predict', 'choice', 'note', 'python']

describe('lessons', () => {
  it('have unique ids', () => {
    const ids = LESSONS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
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
        }
      })
      it('quotes real code, and every note finds its line', () => {
        for (const b of lesson.blocks.filter(x => x.code)) {
          expect(SOURCES[b.code.file], b.code.file).toBeTruthy()
          expect(unmatchedNotes(b.code), `${b.code.file} ${b.code.fn ?? b.code.from}`).toEqual([])
        }
      })
      it('asks for numbers the engine really gives', () => {
        for (const b of lesson.blocks.filter(x => x.predict)) {
          expect(typeof b.predict.compute, b.predict.prompt).toBe('function')
          expect(Math.abs(b.predict.compute() - b.predict.answer), b.predict.prompt).toBeLessThanOrEqual(b.predict.tolerance ?? 1e-9)
        }
      })
      it('has a right answer for every choice', () => {
        for (const b of lesson.blocks.filter(x => x.choice)) expect(b.choice.options[b.choice.answer], b.choice.prompt).toBeTruthy()
      })
    })
  }
})
