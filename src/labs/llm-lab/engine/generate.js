// python/generate.py in JavaScript: sampling, generating with the KV cache, the check that the
// cache changes no number, and the cost of generating, counted and timed.
import { Rng, exp, total, argmax, initModel, nextLogits, greedy, newCache, forwardCached } from './gpt.js'

export function sample(logits, temperature, topK, rng) {
  if (temperature === 0) return argmax(logits)
  const all = [...logits.keys()].sort((a, b) => logits[b] - logits[a])
  const order = all.slice(0, topK ?? all.length)
  const scaled = order.map(j => logits[j] / temperature)
  const exps = scaled.map(s => exp(s - scaled[0]))
  let r = rng.random() * total(exps)
  for (let i = 0; i < order.length; i++) { r -= exps[i]; if (r < 0) return order[i] }
  return order.at(-1)
}

// Math.imul(a, b) >>> 0 is (a * b) % 2**32, exactly; >>> is Python's >> on numbers below 2**32.
export function spread(seed) {
  let h = Math.imul(seed, 2654435761) >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  h = Math.imul(h, 2246822507) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  return h
}
export function generate(model, ids, stop, limit, temperature = 0, topK = null, seed = 0) {
  const rng = new Rng(spread(seed)), cache = newCache()
  for (const t of ids.slice(0, -1)) forwardCached(model, cache, t)
  let t = ids.at(-1)
  const out = []
  for (let n = 0; n < limit; n++) {
    if (cache.k.length === model.pos.length) break
    t = sample(forwardCached(model, cache, t), temperature, topK, rng)
    if (t === stop) break
    out.push(t)
  }
  return out
}

export function cacheMatches(model, ids) {
  const cache = newCache()
  return ids.every((t, n) => { const a = forwardCached(model, cache, t), b = nextLogits(model, ids.slice(0, n + 1)); return a.every((x, j) => x === b[j]) })
}

export function forwardCost(n, dim = 16, hidden = 64, vocab = 17) {
  return 3 * n * dim * dim + (n * n * dim + n * n * dim) + n * dim * dim + (n * dim * hidden + n * hidden * dim) + n * dim * vocab
}
export const cachedCost = (p, dim = 16, hidden = 64, vocab = 17) => 4 * dim * dim + 2 * (p + 1) * dim + 2 * dim * hidden + dim * vocab
export function generationCost(prompt, newTokens, dim = 16, hidden = 64, vocab = 17) {
  let without = 0, withCache = 0
  for (let n = prompt; n < prompt + newTokens; n++) without += forwardCost(n, dim, hidden, vocab)
  for (let p = 0; p < prompt + newTokens - 1; p++) withCache += cachedCost(p, dim, hidden, vocab)
  return [without, withCache]
}

// time_both in the page: milliseconds without and with the cache, and whether the tokens agree.
export function timeBoth(length = 64, seed = 1) {
  const model = initModel(17, 16, length, 64, seed)
  const t0 = performance.now(), slow = greedy(model, [0], -1, length - 1)
  const t1 = performance.now(), fast = generate(model, [0], -1, length - 1)
  const t2 = performance.now()
  return { same: slow.length === fast.length && slow.every((x, i) => x === fast[i]), without: t1 - t0, with: t2 - t1 }
}
