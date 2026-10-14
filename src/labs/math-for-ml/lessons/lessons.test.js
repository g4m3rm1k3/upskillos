// Every lesson's content checked against the code it teaches: predicted numbers against the
// engine, code notes against the real Python lines, figures and links against what exists, and
// every function documented with every input.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LESSONS, PARTS, POOL, lessonById, refs, UNRESOLVED } from './index.js'
import { SYMBOLS, EQUATIONS } from '../decoder.js'
import { unmatchedNotes, SOURCES, functionsOf } from '../source.js'
import { FIGURES } from '../figures/index.js'
import { FUNCTIONS } from '../functions.js'
import { PROGRAMS } from '../programs.js'

import { BLOCK_KINDS as KINDS } from '../../python-steps/Blocks.jsx'

describe('lessons', () => {
  it('refer only to lessons and parts that exist, by id, never by a written number', () => {
    const decoder = [SYMBOLS.map(row => refs(row[2])), EQUATIONS.map(eq => [refs(eq.whole), eq.parts.map(p => refs(p[1]))])]
    expect([...UNRESOLVED]).toEqual([])
    const text = JSON.stringify([LESSONS.map(({ part, ...l }) => l), PARTS.map(p => p.title), decoder])
    expect(text).not.toContain('[[#')
    const written = []
    for (const file of ['part1', 'part2', 'part3', 'part4', 'part5', 'part6', 'fall', 'foundations', 'proof', 'change', 'manyvars', 'areas', 'linalg2', 'linalg3', 'prob2', 'prob3', 'optimisation', 'algorithms', 'ml2', 'ml3', 'theory'].map(p => `lessons/${p}.js`).concat('decoder.js')) {
      const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
      for (const m of code.matchAll(/\b(?:[Ll]essons?|Parts?) \d[\d.]*/g)) written.push(`${file}: ${m[0]}`)
    }
    expect(written).toEqual([])
  })
  it('place every written lesson exactly once', () => {
    expect(LESSONS.map(l => l.id).sort()).toEqual([...POOL.keys()].sort())
  })
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
