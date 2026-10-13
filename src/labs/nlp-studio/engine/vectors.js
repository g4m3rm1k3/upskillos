// Part 4's engine: python/vectors.py in JavaScript, every operation in the same order so that
// training gives the same numbers in both languages (parity4.test.js checks, to within 1e-9).
import { cosine, dot, words } from './counting.js'

export class Rng {
  constructor(seed) { this.state = seed % 4294967296 }
  // state * 1664525 stays below 2^53, so this is exact in a JavaScript number.
  random() { this.state = (this.state * 1664525 + 1013904223) % 4294967296; return this.state / 4294967296 }
  below(n) { return Math.floor(this.random() * n) }
}

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const byScore = (a, b) => b[0] - a[0] || byCodePoint(a[1], b[1])
export const vocabulary = sentences => [...new Set(sentences.flat())].sort(byCodePoint)

export function cooccurrence(sentences, window = 2) {
  const vocab = vocabulary(sentences), index = Object.fromEntries(vocab.map((w, k) => [w, k]))
  const counts = vocab.map(() => Array(vocab.length).fill(0))
  for (const s of sentences) s.forEach((w, i) => {
    for (let j = Math.max(0, i - window); j < Math.min(s.length, i + window + 1); j++) if (j !== i) counts[index[w]][index[s[j]]]++
  })
  return [vocab, counts]
}

export function ppmi(counts) {
  const total = counts.reduce((s, row) => s + row.reduce((t, x) => t + x, 0), 0)
  const rows = counts.map(row => row.reduce((t, x) => t + x, 0))
  const cols = counts[0]?.map((_, b) => counts.reduce((t, row) => t + row[b], 0)) ?? []
  return counts.map((row, a) => row.map((c, b) => (c === 0 ? 0 : Math.max(0, Math.log(c * total / (rows[a] * cols[b]))))))
}

export function nearest(vocab, vectors, word, n = 5) {
  const k = vocab.indexOf(word)
  return vocab.map((w, i) => [cosine(vectors[k], vectors[i]), w]).filter(([, w]) => w !== word).sort(byScore).slice(0, n)
}

export function topDirections(vectors, k = 2, steps = 100) {
  const n = vectors.length, dim = vectors[0].length
  const mean = Array.from({ length: dim }, (_, d) => vectors.reduce((s, v) => s + v[d], 0) / n)
  const centred = vectors.map(v => v.map((x, d) => x - mean[d]))
  const cov = Array.from({ length: dim }, (_, a) => Array.from({ length: dim }, (_, b) => centred.reduce((s, c) => s + c[a] * c[b], 0) / n))
  const directions = []
  for (let t = 0; t < k; t++) {
    let x = Array(dim).fill(1)
    for (let step = 0; step < steps; step++) {
      let y = cov.map(row => dot(row, x))
      for (const d of directions) { const along = dot(y, d); y = y.map((p, i) => p - along * d[i]) }
      const size = Math.sqrt(dot(y, y))
      if (size === 0) break
      x = y.map(p => p / size)
    }
    directions.push(x)
  }
  return [mean, directions]
}
export const project = (vectors, mean, directions) => vectors.map(v => directions.map(d => dot(v.map((a, i) => a - mean[i]), d)))

export const sigmoid = x => 1 / (1 + Math.exp(-x))
export function pairGradient(u, v, label) {
  const g = label - sigmoid(dot(u, v))
  return [v.map(b => g * b), u.map(a => g * a)]
}

// The trainer as a generator, so the page can train a few passes at a time and redraw between them.
// Each yield is { epoch, loss, vocab, vectors } after one pass over the text.
export function* word2vecPasses(sentences, { dim = 16, window = 2, negatives = 3, epochs = 40, lr = 0.05, seed = 1 } = {}) {
  const vocab = vocabulary(sentences), index = Object.fromEntries(vocab.map((w, k) => [w, k]))
  const rng = new Rng(seed)
  const wIn = vocab.map(() => Array.from({ length: dim }, () => (rng.random() - 0.5) / dim))
  const wOut = vocab.map(() => Array(dim).fill(0))
  yield { epoch: 0, loss: null, vocab, vectors: wIn }
  for (let epoch = 1; epoch <= epochs; epoch++) {
    let loss = 0
    for (const s of sentences) s.forEach((word, i) => {
      const c = index[word]
      for (let j = Math.max(0, i - window); j < Math.min(s.length, i + window + 1); j++) {
        if (j === i) continue
        const pairs = [[index[s[j]], 1]]
        for (let q = 0; q < negatives; q++) pairs.push([rng.below(vocab.length), 0])
        for (const [o, label] of pairs) {
          const p = sigmoid(dot(wIn[c], wOut[o]))
          loss -= Math.log(Math.max(1e-12, label ? p : 1 - p))
          const [changeIn, changeOut] = pairGradient(wIn[c], wOut[o], label)
          wIn[c] = wIn[c].map((a, d) => a + lr * changeIn[d])
          wOut[o] = wOut[o].map((b, d) => b + lr * changeOut[d])
        }
      }
    })
    yield { epoch, loss, vocab, vectors: wIn }
  }
}
export function trainWord2vec(sentences, options) {
  let last, losses = []
  for (const pass of word2vecPasses(sentences, options)) { last = pass; if (pass.loss !== null) losses.push(pass.loss) }
  return [last.vocab, last.vectors, losses]
}

export function analogy(vocab, vectors, a, b, c) {
  const index = Object.fromEntries(vocab.map((w, k) => [w, k]))
  const target = vectors[index[a]].map((x, d) => vectors[index[b]][d] - x + vectors[index[c]][d])
  return vocab.map((w, i) => [cosine(target, vectors[i]), w]).filter(([, w]) => w !== a && w !== b && w !== c).sort(byScore)[0]
}

export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'my', 'your', 'i', 'you', 'we', 'do', 'to', 'on', 'in', 'at',
  'and', 'of', 'for', 'it', 'can', 'how', 'what', 'where', 'has', 'have', 'be', 'so', 'there',
  'that', 'this', 'with', 'then', 'please', 'much', 'lot', 'all', 'any', 'me', 'when', 'after', 'up',
])
export const contentWords = text => words(text).filter(w => !STOP_WORDS.has(w))

export function sentenceVector(tokens, index, vectors) {
  const known = tokens.filter(w => w in index).map(w => vectors[index[w]])
  if (!known.length) return null
  return known[0].map((_, d) => known.reduce((s, v) => s + v[d], 0) / known.length)
}

export function semanticReply(intents, vocab, vectors, message, threshold = 0.5) {
  const index = Object.fromEntries(vocab.map((w, k) => [w, k]))
  const q = sentenceVector(contentWords(message), index, vectors)
  const scores = {}
  for (const name of Object.keys(intents).sort(byCodePoint)) {
    const examples = intents[name].examples.map(e => sentenceVector(contentWords(e), index, vectors)).filter(Boolean)
    scores[name] = q && examples.length ? Math.max(...examples.map(e => cosine(q, e))) : 0
  }
  let best = Object.keys(scores).sort(byCodePoint)[0]
  for (const name of Object.keys(scores).sort(byCodePoint)) if (scores[name] > scores[best]) best = name
  if (scores[best] < threshold) return { intent: null, similarity: scores[best], scores, reply: "Sorry, I'm not sure what you mean. Could you put it another way?" }
  return { intent: best, similarity: scores[best], scores, reply: intents[best].reply }
}

export const trainBikeVectors = (sentences, epochs = 40) => trainWord2vec(sentences.map(words), { epochs })
