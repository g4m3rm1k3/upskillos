import { describe, it, expect } from 'vitest'
import { PROGRAMS } from './programs/index.js'
import { analyseProgram, parsePython } from './analysis.js'
import { PIECES } from './pieces.js'

describe('reading Python', () => {
  it('finds functions, their inputs (across a multi-line def) and continued lines', () => {
    const p = parsePython('def f(a, b=2,\n      c=3):\n    x = g(a,\n          b)\n    return x\n\nclass K:\n    def m(self, y):\n        return y\n')
    expect(p.functions.map(f => [f.name, f.params, f.start, f.end])).toEqual([['f', ['a', 'b', 'c'], 1, 5], ['m', ['self', 'y'], 8, 9]])
    expect(p.continuation[4]).toBe(true)
    expect(p.lineFn[9].name).toBe('m')
  })
})

describe('every line of the real programs is explained, and every note still matches its line', () => {
  for (const [id, program] of Object.entries(PROGRAMS)) {
    const info = analyseProgram(program.files, program.explain)
    it(`${id}: all files are present`, () => {
      expect(Object.keys(program.files).sort()).toEqual([...program.order].sort())
      for (const file of program.order) expect(program.explain.FILES[file], file).toBeTruthy()
    })
    for (const file of program.order) {
      it(`${id}: ${file}`, () => {
        const a = info[file]
        expect(a.unmatched, 'notes that match no line').toEqual([])
        for (const n of a.statements) expect(a.notes[n], `${file} line ${n}: ${a.lines[n - 1].trim()}`).toBeTruthy()
        for (const fn of a.functions) {
          const f = program.explain.FUNCTIONS[`${file}:${fn.name}`]
          expect(f, `${file}:${fn.name}`).toBeTruthy()
          expect(f.inputs.map(i => i[0]), `${file}:${fn.name} inputs`).toEqual(fn.params)
          for (const p of fn.params) if (p !== 'self') expect(program.explain.VARS[p], `${fn.name}(${p})`).toBeTruthy()
          if (f.piece) expect(PIECES[f.piece], f.piece).toBeTruthy()
        }
        for (const note of a.notes.filter(Boolean)) if (note.piece) expect(PIECES[note.piece], note.piece).toBeTruthy()
        for (const note of a.notes.filter(Boolean)) if (note.phase) expect(program.phases.map(p => p[0]), note.phase).toContain(note.phase)
      })
    }
  }
})
