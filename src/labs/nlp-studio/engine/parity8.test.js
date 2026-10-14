// Part 8's engine against the real Python (python/helpdesk.py, tinygpt.py's save_safetensors):
// reading a FAQ and a test list, matching, routing, counting outcomes and choosing a threshold,
// and a .safetensors file written by Python that is byte for byte the page's own.
// Regenerate parity8.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity8.json'
import * as H from './helpdesk.js'
import * as G from './tinygpt.js'
import { close } from './close.js'

const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

describe('Part 8 gives the same answers as the Python', () => {
  it('reads a FAQ (shared answers, continued lines, a stray A:, an empty Q:, \\r\\n) and a test list', () => {
    expect(H.parseFaq(parity.faq_text)).toEqual(parity.faq)
    expect(H.examples(H.parseFaq(parity.faq_text))).toEqual(parity.examples)
    expect(H.parseTests(parity.tests_text)).toEqual(parity.tests)
  })
  it('matches, counts the four outcomes at every threshold, and chooses the cheapest threshold', () => {
    close([H.bestEntry([0.6, 0.8, 0], [[1, 0, 0], [0.6, 0.8, 0], [0.6, 0.8, 0]], [2, 0, 1]), H.bestEntry([1, 0], [], [])], parity.best_entry, 'best_entry')
    parity.outcomes.forEach((want, i) => expect(H.outcomes(parity.results, H.THRESHOLDS[i]), `threshold ${H.THRESHOLDS[i]}`).toEqual(want))
    close([H.chooseThreshold(parity.results, H.THRESHOLDS), H.chooseThreshold(parity.results, H.THRESHOLDS, 1)], parity.choose, 'choose')
  })
  it('a .safetensors file saved by Python is byte for byte what the page downloads, and loads back', () => {
    expect(G.safetensorsHeader(parity.vocab, parity.model)).toEqual(parity.header)
    expect(hex(G.toSafetensors(parity.vocab, parity.model))).toBe(parity.file_hex)
    const back = G.fromSafetensors(G.toSafetensors(parity.vocab, parity.model))
    expect(back.vocab).toEqual(parity.loaded_back.vocab)
    expect(back.model).toEqual(parity.loaded_back.model)
  })
  it('the shipped FAQ and test list parse into 7 entries and 15 tests that point at real entries', () => {
    const faq = H.parseFaq(H.FAQ), tests = H.parseTests(H.TESTS)
    expect(faq.length).toBe(7)
    expect(faq.every(e => e.questions.length === 2)).toBe(true)
    expect(tests.length).toBe(15)
    expect(tests.every(([, k]) => k >= -1 && k < faq.length)).toBe(true)
    expect(H.THRESHOLDS).toEqual(Array.from({ length: 19 }, (_, i) => i * 5 / 100))
  })
})
