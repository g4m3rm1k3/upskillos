import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { GREEK_LETTERS, FIELDS, FREQUENCY_LABELS, LOOK_ALIKES } from './greek-letters-data.js'

// Every formula must render: the page uses throwOnError: false, which would show a broken
// formula as red source text instead of failing.
const renders = latex => katex.renderToString(latex, { throwOnError: true, displayMode: true })

describe('Greek letters reference data', () => {
  it('has unique ids and the fields every entry needs', () => {
    expect(new Set(GREEK_LETTERS.map(l => l.id)).size).toBe(GREEK_LETTERS.length)
    for (const letter of GREEK_LETTERS) {
      expect(letter.symbol, letter.id).toMatch(/^\S$/u)
      expect(letter.name && letter.say && letter.tex, letter.id).toBeTruthy()
      expect(FREQUENCY_LABELS[letter.frequency], letter.id).toBeTruthy()
      expect(letter.meanings.length, letter.id).toBeGreaterThan(0)
      for (const meaning of letter.meanings) {
        expect(FIELDS, `${letter.id}: ${meaning.field}`).toContain(meaning.field)
        expect(meaning.role.length, letter.id).toBeGreaterThan(5)
      }
    }
  })

  it('covers all 24 lowercase letters', () => {
    expect(GREEK_LETTERS.filter(l => l.case === 'lower').map(l => l.symbol).join('')).toBe('αβγδεζηθικλμνξοπρστυφχψω')
  })

  it('links each letter to its other case, both ways', () => {
    for (const letter of GREEK_LETTERS.filter(l => l.partner)) {
      const partner = GREEK_LETTERS.find(l => l.id === letter.partner)
      expect(partner, letter.id).toBeTruthy()
      expect(partner.partner, letter.id).toBe(letter.id)
    }
  })

  it('renders every formula with KaTeX', () => {
    for (const letter of GREEK_LETTERS) {
      renders(letter.tex)
      for (const v of letter.variants ?? []) renders(v.tex)
      for (const meaning of letter.meanings) {
        expect(() => renders(meaning.latex), `${letter.id}: ${meaning.latex}`).not.toThrow()
        for (const [symbol] of meaning.parts ?? []) expect(() => renders(symbol), `${letter.id}: ${symbol}`).not.toThrow()
        for (const step of meaning.example?.steps ?? []) expect(() => renders(step), `${letter.id}: ${step}`).not.toThrow()
      }
    }
    for (const pair of LOOK_ALIKES) renders(`${pair.a} \\;\\text{vs}\\; ${pair.b}`)
  })
})
