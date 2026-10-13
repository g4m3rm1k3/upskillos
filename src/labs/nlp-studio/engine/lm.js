// Part 5's language-model basics: python/lm.py in JavaScript (parity5.test.js checks).

export const perplexity = logProbs => Math.exp(-logProbs.reduce((s, x) => s + x, 0) / logProbs.length)

export function softmax(logits, temperature = 1) {
  const scaled = logits.map(x => x / temperature)
  const top = Math.max(...scaled)
  const exps = scaled.map(x => Math.exp(x - top))
  const total = exps.reduce((s, x) => s + x, 0)
  return exps.map(e => e / total)
}

export function sample(probs, r) {
  let total = 0
  for (let i = 0; i < probs.length; i++) { total += probs[i]; if (r < total) return i }
  return probs.length - 1
}

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
export function generateBigram(model, word, length, temperature, rng) {
  const out = [word]
  for (let n = 0; n < length; n++) {
    const after = model[out.at(-1)]
    if (!after) break
    const options = Object.keys(after).sort(byCodePoint)
    const probs = softmax(options.map(w => Math.log(after[w])), temperature)
    out.push(options[sample(probs, rng.random())])
  }
  return out
}

// BPE. A word is an array of symbols; a pair is [a, b]; word tables are Maps keyed by the symbols joined with \u0001.
const SEP = '\u0001'
export function pairCounts(words) {
  const pairs = new Map()
  for (const [key, n] of words) {
    const s = key.split(SEP)
    for (let i = 0; i + 1 < s.length; i++) { const p = s[i] + SEP + s[i + 1]; pairs.set(p, (pairs.get(p) ?? 0) + n) }
  }
  return pairs
}
export function mergePair(symbols, pair) {
  const out = []
  for (let i = 0; i < symbols.length;) {
    if (i + 1 < symbols.length && symbols[i] === pair[0] && symbols[i + 1] === pair[1]) { out.push(symbols[i] + symbols[i + 1]); i += 2 } else { out.push(symbols[i]); i += 1 }
  }
  return out
}
// Compare pairs as Python compares tuples of strings: first item, then second.
const pairOrder = (a, b) => byCodePoint(a[0], b[0]) || byCodePoint(a[1], b[1])
export function trainBpe(wordCounts, merges, onStep) {
  let words = new Map(Object.entries(wordCounts).map(([w, n]) => [[...w, '_'].join(SEP), n]))
  const learned = []
  for (let m = 0; m < merges; m++) {
    const pairs = pairCounts(words)
    if (!pairs.size) break
    let best = null, bestCount = -1
    for (const [key, n] of pairs) { const p = key.split(SEP); if (n > bestCount || (n === bestCount && pairOrder(p, best) < 0)) { best = p; bestCount = n } }
    learned.push(best)
    const next = new Map()
    for (const [key, n] of words) { const k = mergePair(key.split(SEP), best).join(SEP); next.set(k, (next.get(k) ?? 0) + n) }
    words = next
    onStep?.({ pair: best, count: bestCount, words })
  }
  return learned
}
export function bpeEncode(word, merges) {
  let symbols = [...word, '_']
  for (const pair of merges) symbols = mergePair(symbols, pair)
  return symbols
}

export function crossEntropyGrad(logits, target) {
  return softmax(logits).map((p, i) => p - (i === target ? 1 : 0))
}

export function attention(q, k, v) {
  const d = q[0].length
  return q.map((qi, i) => {
    const scores = k.slice(0, i + 1).map(kj => qi.reduce((s, a, c) => s + a * kj[c], 0) / Math.sqrt(d))
    const weights = softmax(scores)
    return v[0].map((_, c) => weights.reduce((s, w, j) => s + w * v[j][c], 0))
  })
}
