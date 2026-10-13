// Lesson 5.1's measurement: the bigram model trained on the first 50 bike-shop sentences and scored
// on the other 13, as perplexity. Here (not in a figure) so both the lesson and its figure can use it.
import * as C from './counting.js'
import { perplexity } from './lm.js'
import { SENTENCES } from './corpus.js'

export const SPLIT = 50
export function heldOut(k) {
  const train = SENTENCES.slice(0, SPLIT).map(C.words), test = SENTENCES.slice(SPLIT).map(C.words)
  const model = {}
  for (const s of train) for (const [a, b] of C.ngrams(s, 2)) { const after = (model[a] ??= {}); after[b] = (after[b] ?? 0) + 1 }
  const V = new Set(SENTENCES.map(C.words).flat()).size
  const rows = test.flatMap(s => C.ngrams(s, 2).map(([a, b]) => ({ a, b, p: C.nextWordProb(model, a, b, k, V) })))
  return { rows, V, perplexity: rows.every(r => r.p > 0) ? perplexity(rows.map(r => Math.log(r.p))) : Infinity }
}
