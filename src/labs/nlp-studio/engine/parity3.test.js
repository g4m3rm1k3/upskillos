// Part 3's engine against the real Python (python/counting.py, bayes.py, data.py). Floats are
// compared to within 1e-9: JavaScript's and Python's log and exp may differ in the last digit.
// Regenerate parity3.json with: python src/labs/nlp-studio/tools/make_parity.py
import { describe, expect, it } from 'vitest'
import parity from './parity3.json'
import * as C from './counting.js'
import { MESSAGES, INTENTS } from './data.js'
import { close } from './close.js'

describe('Part 3 gives the same answers as the Python', () => {
  const docs = Object.keys(parity.words).slice(0, 5).map(C.words)
  const vocab = C.buildVocab(docs), weights = C.idf(docs)
  const corpus = C.words(MESSAGES.map(([t]) => t).join(' ')), bigrams = C.bigramModel(corpus), V = new Set(corpus).size

  it('the data is the same in both languages', () => {
    expect(MESSAGES).toEqual(parity.messages)
    expect(INTENTS).toEqual(parity.intents)
  })
  it('words, vocabulary, bags of words, cosines, n-grams', () => {
    for (const [text, ws] of Object.entries(parity.words)) expect(C.words(text), text).toEqual(ws)
    expect(vocab).toEqual(parity.vocab)
    expect(docs.map(d => C.vectorize(d, vocab))).toEqual(parity.vectors)
    close(docs.map(a => docs.map(b => C.cosine(C.vectorize(a, vocab), C.vectorize(b, vocab)))), parity.cosines, 'cosines')
    expect(C.ngrams(docs[0], 3)).toEqual(parity.ngrams)
  })
  it('bigrams, smoothing, sentence probabilities, greedy continuation', () => {
    expect(bigrams).toEqual(parity.bigrams)
    for (const [w1, w2, k, p] of parity.probs) close(C.nextWordProb(bigrams, w1, w2, k, V), p, `${w1} ${w2} k=${k}`)
    for (const [s, k, lp] of parity.sentence_log_probs) close(C.sentenceLogProb(bigrams, C.words(s), k, V), lp, `${s} k=${k}`)
    for (const [w, out] of Object.entries(parity.greedy)) expect(C.greedyContinue(bigrams, w, 8), w).toEqual(out)
  })
  it('document frequency, idf, TF-IDF and search', () => {
    expect(C.documentFrequency(docs)).toEqual(parity.df)
    close(weights, parity.idf, 'idf')
    close(docs.map(d => C.tfidfVector(d, vocab, weights)), parity.tfidf, 'tfidf')
    for (const [q, ranked] of Object.entries(parity.search)) close(C.search(C.words(q), docs), ranked, q)
  })
  it('Naive Bayes: the model, scores, probabilities and guesses', () => {
    const nb = C.trainNB(MESSAGES.slice(0, 30).map(([t, l]) => [C.words(t), l]))
    expect(nb).toEqual(parity.nb)
    for (const [t, scores] of Object.entries(parity.nb_scores)) for (const [l, s] of Object.entries(scores)) close(C.logScore(nb, C.words(t), l), s, `${t} ${l}`)
    for (const [t, [label, probs]] of Object.entries(parity.nb_classify)) { const [g, p] = C.classify(nb, C.words(t)); expect(g, t).toBe(label); close(p, probs, t) }
  })
  it('evaluation on the held-out test set, for every training size', () => {
    for (const [n, result] of Object.entries(parity.evaluate)) close(C.evaluate(MESSAGES.slice(0, Number(n)), MESSAGES.slice(-C.TEST_SIZE), 'spam'), result, `train ${n}`)
  })
  it('Bot 2 replies, with k = 0.1 and with k = 1', () => {
    const model = C.trainIntents(INTENTS), model1 = C.trainIntents(INTENTS, 1)
    for (const [m, r] of Object.entries(parity.replies)) close(C.intentReply(model, INTENTS, m), r, m)
    for (const [m, r] of Object.entries(parity.intent_k1)) close(C.intentReply(model1, INTENTS, m), r, `k=1 ${m}`)
  })
  it('probabilities add up to 1, even for scores so low that exp() alone would give 0', () => {
    const p = C.probabilities({ a: -1000, b: -1001 })
    expect(Math.exp(-1000)).toBe(0)
    expect(p.a + p.b).toBeCloseTo(1, 12)
    expect(p.a).toBeCloseTo(1 / (1 + Math.exp(-1)), 12)
  })
})
