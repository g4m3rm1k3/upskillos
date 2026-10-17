// Every lesson's content checked against the discrete math engine: predicted numbers against compute(),
// figures and puzzles against what exists, proof builders verified step-by-step, and cross-references resolved.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LESSONS, PARTS, POOL, PROOFS, lessonById, refs, UNRESOLVED } from './index.js'
import { SYMBOLS, EQUATIONS } from '../decoder.js'
import { FIGURES } from '../figures/index.js'
import { PUZZLES } from '../PuzzlesTab.jsx'
import { BLOCK_KINDS } from '../Blocks.jsx'

const PUZZLE_IDS = new Set(PUZZLES.map(p => p.id))

describe('discrete-math-lab lessons', () => {
  it('refer only to lessons and parts that exist, by id, never by a written number', () => {
    const decoder = [
      SYMBOLS.map(row => refs(row[2])),
      EQUATIONS.map(eq => [refs(eq.source), refs(eq.whole), eq.parts.map(p => refs(p[1]))]),
    ]
    expect([...UNRESOLVED]).toEqual([])
    const text = JSON.stringify([LESSONS.map(({ part, ...l }) => l), PARTS.map(p => p.title), decoder])
    expect(text).not.toContain('[[#')
    const written = []
    for (const file of ['part1', 'part2', 'part3', 'part4', 'part5', 'part6', 'part7', 'part8', 'proofs'].map(p => `lessons/${p}.js`).concat('decoder.js')) {
      const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
        .split('\n')
        .filter(l => !l.trim().startsWith('//'))
        .join('\n')
      for (const m of code.matchAll(/\b(?:[Ll]essons?|Parts?) \d[\d.]*/g)) written.push(`${file}: ${m[0]}`)
    }
    expect(written).toEqual([])
  })

  it('place every written lesson in the 8 parts and have 40 unique lesson ids', () => {
    expect(PARTS.length).toBe(8)
    expect(LESSONS.length).toBe(40)
    expect(LESSONS.map(l => l.id).sort()).toEqual([...POOL.keys()].sort())
    const ids = LESSONS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('provides an interactive proof builder for every lesson', () => {
    for (const lesson of LESSONS) {
      expect(PROOFS[lesson.id], `Missing proof for ${lesson.id}`).toBeTruthy()
      const proofBlocks = lesson.blocks.filter(b => b.proof)
      expect(proofBlocks.length, lesson.id).toBeGreaterThanOrEqual(1)
      for (const { proof } of proofBlocks) {
        expect(proof.steps.length, lesson.id).toBeGreaterThanOrEqual(3)
        for (const step of proof.steps) {
          expect(step.options[step.answer], `${lesson.id}: ${step.prompt}`).toBeTruthy()
        }
      }
    }
  })

  for (const lesson of LESSONS) {
    describe(`${lesson.number} ${lesson.title}`, () => {
      it('links only to earlier lessons that exist', () => {
        for (const id of lesson.builds) {
          expect(lessonById(id), id).toBeTruthy()
          expect(LESSONS.indexOf(lessonById(id))).toBeLessThan(LESSONS.findIndex(l => l.id === lesson.id))
        }
      })

      it('uses only known block kinds, figures, and puzzles', () => {
        for (const b of lesson.blocks) {
          expect(BLOCK_KINDS.filter(k => k in b).length, JSON.stringify(b).slice(0, 80)).toBe(1)
          if (b.figure) expect(FIGURES[b.figure], b.figure).toBeTruthy()
          if (b.puzzle) expect(PUZZLE_IDS.has(b.puzzle.id), `${lesson.id} puzzle: ${b.puzzle.id}`).toBe(true)
        }
      })

      it('asks for numbers the discrete math engine really gives', () => {
        const predicts = lesson.blocks.filter(x => x.predict)
        expect(predicts.length).toBeGreaterThanOrEqual(1)
        for (const b of predicts) {
          expect(typeof b.predict.compute, b.predict.prompt).toBe('function')
          expect(Math.abs(b.predict.compute() - b.predict.answer), b.predict.prompt).toBeLessThanOrEqual(b.predict.tolerance ?? 1e-9)
        }
      })

      it('has a valid right answer for every choice question', () => {
        const choices = lesson.blocks.filter(x => x.choice)
        expect(choices.length).toBeGreaterThanOrEqual(1)
        for (const b of choices) {
          expect(b.choice.options[b.choice.answer], b.choice.prompt).toBeTruthy()
        }
      })
    })
  }
})
