// Every lesson's content checked against the code it teaches: predicted numbers against the
// engine, code notes against the real Python lines, figures and links against what exists, and
// every function documented with every input.
import { describe, expect, it } from 'vitest'
import { LESSONS, lessonById } from './index.js'
import { unmatchedNotes, SOURCES, functionsOf } from '../source.js'
import { FIGURES } from '../figures/index.js'
import { FUNCTIONS } from '../functions.js'
import { PROGRAMS } from '../programs.js'

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
      it('uses only known block kinds, figures and programs', () => {
        for (const b of lesson.blocks) {
          expect(KINDS.filter(k => k in b).length, JSON.stringify(b).slice(0, 80)).toBe(1)
          if (b.figure) expect(FIGURES[b.figure], b.figure).toBeTruthy()
          if (b.python) expect(PROGRAMS[b.python.program], b.python.program).toBeTruthy()
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

describe('functions', () => {
  for (const file of Object.keys(SOURCES)) {
    it(`${file}: every function documented, every input listed, its lesson real`, () => {
      for (const fn of functionsOf(file)) {
        const doc = FUNCTIONS[fn.key]
        expect(doc, fn.key).toBeTruthy()
        expect(doc.inputs.map(([n]) => n), fn.key).toEqual(fn.params)
        expect(lessonById(doc.lesson), `${fn.key} → ${doc.lesson}`).toBeTruthy()
      }
    })
  }
  it('documents no function that doesn\'t exist', () => {
    const keys = new Set(Object.keys(SOURCES).flatMap(file => functionsOf(file).map(fn => fn.key)))
    expect(Object.keys(FUNCTIONS).filter(k => !keys.has(k))).toEqual([])
  })
})
