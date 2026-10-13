// Part 2's engine against the real Python (python/parsing.py, python/eliza.py): the same trees,
// the same number of parser calls, the same chart, the same chatbot replies.
// Regenerate parity2.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity2.json'
import * as P from './parsing.js'
import * as E from './eliza.js'

describe('parsing gives the same answers as the Python', () => {
  for (const s of parity.sentences) {
    it(s.sentence, () => {
      const words = s.sentence.split(' ')
      const trees = P.parse(s.sentence)
      expect(trees).toEqual(s.trees)
      expect(trees.map(P.bracket)).toEqual(s.brackets)
      expect(trees.map(P.leaves)).toEqual(s.leaves)
      expect(trees.map(P.dependencies)).toEqual(s.dependencies)
      expect(P.parseCalls(s.sentence), 'calls of parse_symbol').toBe(s.calls)
      expect(P.cky(words)).toEqual(s.chart)
      expect(P.countTrees(words)).toBe(s.count_trees)
    })
  }
  it('catalan', () => expect(parity.catalan.map((_, n) => P.catalan(n))).toEqual(parity.catalan))
  it('is_tree and crossing_arcs', () => {
    for (const h of parity.heads) {
      expect(P.isTree(h.heads), JSON.stringify(h.heads)).toBe(h.is_tree)
      expect(P.crossingArcs(h.heads), JSON.stringify(h.heads)).toBe(h.crossing_arcs)
    }
  })
  it('every dependency tree made from a phrase tree is a valid tree', () => {
    for (const s of parity.sentences) for (const heads of s.dependencies) expect(P.isTree(heads)).toBe(true)
  })
  it('the chart trace ends in the chart', () => {
    for (const s of parity.sentences) {
      const { steps, table } = P.ckyTrace(s.sentence.split(' '))
      expect(table).toEqual(s.chart)
      const last = {}
      for (const st of steps) last[`${st.i},${st.j}`] = st.cell
      for (const [key, cell] of Object.entries(s.chart)) if (key.split(',')[1] - key.split(',')[0] === 1 || Object.keys(cell).length) expect(last[key], key).toEqual(cell)
    }
  })
  it('a valid head choice is 1 in n of all choices: n^(n-1) of n^n', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(P.countHeadChoices(n)).toEqual({ total: n ** n, valid: n ** (n - 1) })
  })
})

describe('Bot 1 gives the same replies as the Python', () => {
  for (const m of parity.messages) {
    it(JSON.stringify(m.message), () => {
      expect(E.respond(m.message, m.turn)).toBe(m.reply)
      expect(E.reflect(m.message)).toBe(m.reflect)
    })
  }
})
