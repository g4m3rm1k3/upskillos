// The JavaScript engine against the real Python (python/text_basics.py), on texts chosen to be
// awkward: empty, double spaces, accents, emoji, abbreviations, numbers with dots.
// Regenerate parity.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity.json'
import * as T from './text.js'

describe('the JavaScript engine gives the same answers as the Python', () => {
  for (const s of parity) {
    it(JSON.stringify(s.text), () => {
      expect(T.utf8Bytes(s.text)).toEqual(s.utf8_bytes)
      expect(T.chars(s.text).length).toBe(s.chars)
      expect(T.count(T.chars(s.text))).toEqual(s.char_counts)
      expect(T.splitWords(s.text)).toEqual(s.split_words)
      expect(s.matches_str_split).toBe(true)
      expect(T.tokenize(s.text)).toEqual(s.tokenize)
      expect(T.tokenizeRegex(s.text)).toEqual(s.tokenize_regex)
      expect(T.tokenize(s.text), 'the hand tokenizer and the regex agree').toEqual(s.tokenize_regex)
      expect(T.wordCounts(s.text)).toEqual(s.word_counts)
      expect(T.rankTable(s.word_counts)).toEqual(s.rank_table)
      expect(T.splitSentencesNaive(s.text)).toEqual(s.split_sentences_naive)
      expect(T.splitSentences(s.text)).toEqual(s.split_sentences)
    })
  }

  it('the fitted slope is exactly −1 for counts that follow Zipf’s law exactly', () => {
    const table = [1, 2, 3, 4, 5, 6].map(r => [r, `w${r}`, 600 / r])
    expect(T.logLogSlope(table)).toBeCloseTo(-1, 12)
    expect(T.logLogSlope(table.slice(0, 1))).toBe(null)
  })

  it('the traces end in the same answers as the plain functions', () => {
    for (const s of parity) {
      const w = T.splitWordsTrace(s.text), t = T.tokenizeTrace(s.text)
      expect(w.steps.at(-1)?.words ?? []).toEqual(s.split_words)
      expect(t.steps.at(-1)?.tokens ?? []).toEqual(s.tokenize)
    }
  })
})
