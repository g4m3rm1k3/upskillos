// Part 4's engine against the real Python (python/vectors.py, corpus.py): the random numbers, the
// co-occurrence counts and PPMI, and word2vec after 40 full passes of training, to within 1e-9.
// Regenerate parity4.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity4.json'
import * as V from './vectors.js'
import { words } from './counting.js'
import { SENTENCES } from './corpus.js'
import { INTENTS } from './data.js'
import { close } from './close.js'

describe('Part 4 gives the same answers as the Python', () => {
  const bike = SENTENCES.map(words)
  const [vocab, vectors, losses] = V.trainBikeVectors(SENTENCES)

  it('the corpus is the same in both languages, and so are the random numbers', () => {
    expect(SENTENCES).toEqual(parity.sentences)
    const rng = new V.Rng(1)
    expect([...Array(5)].map(() => rng.random()).concat([new V.Rng(7).below(116)])).toEqual(parity.rng)
  })
  it('co-occurrence counts, PPMI and nearest words by PPMI', () => {
    const [cv, counts] = V.cooccurrence(bike), P = V.ppmi(counts)
    expect(cv).toEqual(parity.cooc_vocab)
    for (const [w, row] of Object.entries(parity.cooc_rows)) expect(counts[cv.indexOf(w)], w).toEqual(row)
    for (const [w, row] of Object.entries(parity.ppmi_rows)) close(P[cv.indexOf(w)], row, w)
    for (const [w, list] of Object.entries(parity.ppmi_nearest)) close(V.nearest(cv, P, w, 4), list, w)
  })
  it('the gradient of one pair', () => {
    close([1, 0].map(label => V.pairGradient([0.5, -1, 2], [1, 0.25, -0.5], label)), parity.pair_gradient, 'pair_gradient')
  })
  it('word2vec after 40 passes: the same vectors, losses and neighbours', () => {
    expect(vocab).toEqual(parity.vocab)
    close(losses, parity.losses, 'losses')
    close(vectors, parity.vectors, 'vectors')
    for (const [w, list] of Object.entries(parity.nearest)) close(V.nearest(vocab, vectors, w, 4), list, w)
  })
  it('the map, analogies and Bot 2 by meaning', () => {
    const [mean, directions] = V.topDirections(vectors)
    close(mean, parity.map.mean, 'mean')
    close(directions, parity.map.directions, 'directions')
    close(V.project(vectors, mean, directions), parity.map.points, 'points')
    for (const [a, b, c, result] of parity.analogies) close(V.analogy(vocab, vectors, a, b, c), result, `${a}:${b}::${c}`)
    for (const [q, r] of Object.entries(parity.replies)) close(V.semanticReply(INTENTS, vocab, vectors, q), r, q)
    for (const [q, ws] of Object.entries(parity.content_words)) expect(V.contentWords(q)).toEqual(ws)
  })
  it('the loss falls as it learns', () => {
    expect(losses.at(-1)).toBeLessThan(losses[0] * 0.5)
  })
})
