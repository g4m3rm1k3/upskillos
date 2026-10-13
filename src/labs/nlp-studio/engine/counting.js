// Part 3's engine: python/counting.py and python/bayes.py in JavaScript. parity3.test.js holds
// them to the Python's answers (floats to within 1e-9: the two languages' log and exp can differ
// in the last digit).
import { tokenize, charKind, chars } from './text.js'

export const words = text => tokenize(text).filter(t => charKind(chars(t)[0]) === 'word').map(t => t.toLowerCase())
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

export function buildVocab(docs) {
  const all = [...new Set(docs.flat())].sort(byCodePoint)
  return Object.fromEntries(all.map((w, k) => [w, k]))
}
export function vectorize(tokens, vocab) {
  const v = Array(Object.keys(vocab).length).fill(0)
  for (const w of tokens) if (w in vocab) v[vocab[w]]++
  return v
}
export const dot = (u, v) => u.reduce((s, a, k) => s + a * (v[k] ?? 0), 0)
export const norm = u => Math.sqrt(dot(u, u))
export const cosine = (u, v) => (norm(u) === 0 || norm(v) === 0 ? 0 : dot(u, v) / (norm(u) * norm(v)))

export const ngrams = (tokens, n) => Array.from({ length: Math.max(0, tokens.length - n + 1) }, (_, i) => tokens.slice(i, i + n))
export function bigramModel(tokens) {
  const follows = {}
  for (const [w1, w2] of ngrams(tokens, 2)) { const after = (follows[w1] ??= {}); after[w2] = (after[w2] ?? 0) + 1 }
  return follows
}
export function nextWordProb(model, w1, w2, k = 0, vocabSize = 0) {
  const after = model[w1] ?? {}
  const total = Object.values(after).reduce((s, x) => s + x, 0)
  if (total + k * vocabSize === 0) return 0
  return ((after[w2] ?? 0) + k) / (total + k * vocabSize)
}
export function sentenceLogProb(model, tokens, k = 0, vocabSize = 0) {
  let total = 0
  for (const [w1, w2] of ngrams(tokens, 2)) {
    const p = nextWordProb(model, w1, w2, k, vocabSize)
    if (p === 0) return -Infinity
    total += Math.log(p)
  }
  return total
}
export function greedyContinue(model, word, length) {
  const out = [word]
  for (let n = 0; n < length; n++) {
    const after = model[out.at(-1)]
    if (!after) break
    out.push(Object.keys(after).sort((a, b) => after[b] - after[a] || byCodePoint(a, b))[0])
  }
  return out
}

export function documentFrequency(docs) {
  const df = {}
  for (const doc of docs) for (const w of new Set(doc)) df[w] = (df[w] ?? 0) + 1
  return df
}
export function idf(docs) {
  const n = docs.length
  return Object.fromEntries(Object.entries(documentFrequency(docs)).map(([w, d]) => [w, Math.log(n / d)]))
}
export function tfidfVector(tokens, vocab, idfValues) {
  const counts = vectorize(tokens, vocab)
  const columns = Object.keys(vocab).sort((a, b) => vocab[a] - vocab[b])
  return counts.map((c, k) => c * (idfValues[columns[k]] ?? 0))
}
export function search(query, docs) {
  const vocab = buildVocab(docs), weights = idf(docs), q = tfidfVector(query, vocab, weights)
  return docs.map((doc, i) => [cosine(q, tfidfVector(doc, vocab, weights)), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
}

// Naive Bayes
export function trainNB(examples, k = 1) {
  const model = { k, docs: {}, words: {}, totals: {}, vocab: new Set() }
  for (const [tokens, label] of examples) {
    model.docs[label] = (model.docs[label] ?? 0) + 1
    const counts = (model.words[label] ??= {})
    for (const w of tokens) { counts[w] = (counts[w] ?? 0) + 1; model.totals[label] = (model.totals[label] ?? 0) + 1; model.vocab.add(w) }
  }
  model.vocab = [...model.vocab].sort(byCodePoint)
  return model
}
// The score, and every term that makes it up (for the figure): { score, prior, terms: [{ word, count, p, log }] }.
export function logScoreParts(model, tokens, label) {
  const nDocs = Object.values(model.docs).reduce((s, x) => s + x, 0)
  const prior = Math.log(model.docs[label] / nDocs)
  const vocab = new Set(model.vocab), V = model.vocab.length
  const counts = model.words[label] ?? {}, total = model.totals[label] ?? 0, k = model.k
  let score = prior
  const terms = []
  for (const w of tokens) {
    if (!vocab.has(w)) { terms.push({ word: w, unknown: true }); continue }
    const p = ((counts[w] ?? 0) + k) / (total + k * V)
    score += Math.log(p)
    terms.push({ word: w, count: counts[w] ?? 0, total, V, k, p, log: Math.log(p) })
  }
  return { score, prior, docs: model.docs[label], nDocs, terms }
}
export const logScore = (model, tokens, label) => logScoreParts(model, tokens, label).score
export function probabilities(scores) {
  const top = Math.max(...Object.values(scores))
  const exps = Object.fromEntries(Object.entries(scores).map(([l, s]) => [l, Math.exp(s - top)]))
  const total = Object.values(exps).reduce((s, x) => s + x, 0)
  return Object.fromEntries(Object.entries(exps).map(([l, e]) => [l, e / total]))
}
export function classify(model, tokens) {
  const labels = Object.keys(model.docs).sort(byCodePoint)
  const scores = Object.fromEntries(labels.map(l => [l, logScore(model, tokens, l)]))
  let best = labels[0]
  for (const l of labels) if (scores[l] > scores[best]) best = l
  return [best, probabilities(scores), scores]
}

export function accuracy(truth, guesses) {
  if (!truth.length) return 0
  return truth.filter((t, k) => t === guesses[k]).length / truth.length
}
export function confusion(truth, guesses, positive) {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 }
  truth.forEach((t, k) => { const g = guesses[k]; if (g === positive) c[t === positive ? 'tp' : 'fp']++; else c[t === positive ? 'fn' : 'tn']++ })
  return c
}
export function precisionRecallF1(c) {
  const flagged = c.tp + c.fp, actual = c.tp + c.fn
  const precision = flagged ? c.tp / flagged : 0, recall = actual ? c.tp / actual : 0
  return { precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 }
}
// evaluate(), plus each test message's guess, for the figure.
export function evaluateDetail(train, test, positive) {
  const model = trainNB(train.map(([text, label]) => [words(text), label]))
  const truth = test.map(([, l]) => l), guesses = test.map(([text]) => classify(model, words(text))[0])
  const c = confusion(truth, guesses, positive)
  return { accuracy: accuracy(truth, guesses), confusion: c, ...precisionRecallF1(c), rows: test.map(([text, l], k) => ({ text, truth: l, guess: guesses[k] })) }
}
export const evaluate = (train, test, positive) => { const { rows, ...out } = evaluateDetail(train, test, positive); return out }
// The split the lessons use: the last 10 messages are the test set, never trained on.
export const TEST_SIZE = 10

export const trainIntents = (intents, k = 0.1) => trainNB(Object.entries(intents).flatMap(([name, intent]) => intent.examples.map(e => [words(e), name])), k)
export function intentReply(model, intents, message, threshold = 0.5) {
  const [label, probs] = classify(model, words(message))
  if (probs[label] < threshold) return { intent: null, confidence: probs[label], reply: "Sorry, I'm not sure what you mean. Could you put it another way?" }
  return { intent: label, confidence: probs[label], reply: intents[label].reply }
}
