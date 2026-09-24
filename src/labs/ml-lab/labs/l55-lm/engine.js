// Language models on characters: byte-pair encoding, n-gram models with
// smoothing, a small neural language model, perplexity, and sampling.
import { random, range, mean } from '../../kit/math.js'
import { Dense, Tanh, Sequential, softmaxCE, Adam } from '../../kit/nn.js'

// An original corpus about building and testing software, written for this lab.
export const CORPUS = `the build started at nine and finished at ten. the tests ran after the build, and the tests passed. then the team looked at the logs, because a passing test is not the same as a correct program. the logs showed a slow step in the middle of the build. the slow step read the same files again and again. the team cached the files, and the build finished much sooner. after that the tests ran faster too, and the team had more time to read the results.
a good test checks one idea at a time. when a test fails, the message should say what was expected and what was found. the team wrote the message first and the test second, so every failure would explain itself. they kept the tests small, and they kept the data for each test next to the test. when the data changed, the test changed with it, and nobody had to guess why a number moved.
the model learned from the logs of past builds. it read the size of each change, the files that were touched, and the time of day. then it guessed how long the next build would take. the guess was not always right, but it was better than the old rule, which said every build took one hour. the team checked the model every week against new builds, and they wrote down each time the model was wrong by more than ten minutes.
one week the model was wrong every day. the team looked at the new builds and found a new kind of change that the model had never seen. the data had drifted. they added the new builds to the training data, trained the model again, and compared the new model with the old one on the same week. the new model was better, so they kept it, and they wrote down what had happened so the next person would know.
the team liked to say that a model is a guess with a history. the history is the data, and the guess is only as good as the data behind it. when the data are old, the guess is old. when the data are wrong, the guess is wrong. so they read the data before they read the model, and they read the model before they trusted it.
at the end of the year the team wrote a short report. it said what the model did well, where it failed, and what they would change. the report was short because they had written notes all year. every note said what they tried, what they expected, and what they saw. the notes made the report easy, and the report made the next year easier.`
export const SPLIT = Math.floor(CORPUS.length * 0.85)
export const TRAIN_TEXT = CORPUS.slice(0, SPLIT), TEST_TEXT = CORPUS.slice(SPLIT)
export const VOCAB = [...new Set(CORPUS)].sort()
const IDX = Object.fromEntries(VOCAB.map((c, i) => [c, i]))
const log2 = x => Math.log(x) / Math.LN2

// ---------- Byte-pair encoding ----------
export function learnBPE(text, merges) {
  let words = text.split(/(\s+)/).filter(Boolean).map(w => [...w])
  const rules = []
  for (let m = 0; m < merges; m++) {
    const counts = new Map()
    words.forEach(w => { for (let i = 0; i + 1 < w.length; i++) { if (/\s/.test(w[i]) || /\s/.test(w[i + 1])) continue; const k = w[i] + '\u0000' + w[i + 1]; counts.set(k, (counts.get(k) ?? 0) + 1) } })
    let best = null, bc = 1
    counts.forEach((c, k) => { if (c > bc || (c === bc && best !== null && k < best)) { best = k; bc = c } })
    if (!best) break
    const [a, b] = best.split('\u0000')
    rules.push({ a, b, count: bc })
    words = words.map(w => { const out = []; for (let i = 0; i < w.length; i++) { if (i + 1 < w.length && w[i] === a && w[i + 1] === b) { out.push(a + b); i++ } else out.push(w[i]) } return out })
  }
  return rules
}
export function applyBPE(text, rules) {
  let words = text.split(/(\s+)/).filter(Boolean).map(w => [...w])
  rules.forEach(({ a, b }) => { words = words.map(w => { const out = []; for (let i = 0; i < w.length; i++) { if (i + 1 < w.length && w[i] === a && w[i + 1] === b) { out.push(a + b); i++ } else out.push(w[i]) } return out }) })
  return words.flat()
}

// ---------- n-gram character models ----------
export function ngramModel(text, n, k) {
  const counts = new Map(), ctxCounts = new Map()
  for (let i = n - 1; i < text.length; i++) { const ctx = text.slice(i - n + 1, i), c = text[i]; const key = ctx + '\u0000' + c; counts.set(key, (counts.get(key) ?? 0) + 1); ctxCounts.set(ctx, (ctxCounts.get(ctx) ?? 0) + 1) }
  const V = VOCAB.length
  const prob = (ctx, c) => { const den = (ctxCounts.get(ctx) ?? 0) + k * V; return den ? ((counts.get(ctx + '\u0000' + c) ?? 0) + k) / den : 0 }
  return { n, k, prob, dist: ctx => VOCAB.map(c => prob(ctx, c)) }
}
// Bits per character on a text (contexts taken from the text itself).
export function bitsPerChar(model, text, n = model.n) {
  const vals = []
  for (let i = n - 1; i < text.length; i++) { const p = model.prob(text.slice(i - n + 1, i), text[i]); vals.push(p > 0 ? -log2(p) : Infinity) }
  return mean(vals)
}

// ---------- Neural (MLP) language model ----------
// Input: one-hot vectors of the previous `context` characters; output: next-character logits.
const oneHotContext = (s) => { const x = new Float64Array(s.length * VOCAB.length); [...s].forEach((c, j) => { x[j * VOCAB.length + IDX[c]] = 1 }); return x }
export function trainNeural({ context = 3, hidden = 48, epochs = 6, lr = 0.01, seed = 1, batch = 64 } = {}) {
  const rng = random(seed), V = VOCAB.length
  const net = new Sequential([new Dense(context * V, hidden, rng, { init: 'xavier' }), Tanh(), new Dense(hidden, V, rng, { init: 'xavier' })])
  const opt = new Adam(net.params(), { lr }), ex = range(TRAIN_TEXT.length - context).map(i => ({ x: oneHotContext(TRAIN_TEXT.slice(i, i + context)), y: IDX[TRAIN_TEXT[i + context]] }))
  const curve = []
  for (let e = 0; e < epochs; e++) {
    const order = range(ex.length).sort(() => rng() - 0.5)
    for (let b = 0; b < order.length; b += batch) {
      const rows = order.slice(b, b + batch).map(i => ex[i]); net.zeroGrad()
      const r = softmaxCE(net.forward(rows.map(r2 => r2.x)), rows.map(r2 => r2.y)); net.backward(r.grad); opt.step()
    }
    const model = neuralWrap(net, context)
    curve.push({ epoch: e + 1, train: bitsPerChar(model, TRAIN_TEXT, context + 1), test: bitsPerChar(model, TEST_TEXT, context + 1) })
  }
  return { net, context, curve, model: neuralWrap(net, context) }
}
function neuralWrap(net, context) {
  const dist = ctx => { const z = net.forward([oneHotContext(ctx.slice(-context))])[0], m = Math.max(...z), e = Array.from(z, v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
  return { n: context + 1, dist, prob: (ctx, c) => dist(ctx)[IDX[c]] }
}

// ---------- Sampling ----------
export function sample(model, prompt, length, { temperature = 1, topK = 0, seed = 1 } = {}) {
  const rng = random(seed)
  let text = prompt
  for (let i = 0; i < length; i++) {
    const ctx = text.slice(-(model.n - 1))
    let p = model.dist(ctx).map(v => Math.pow(Math.max(v, 1e-12), 1 / temperature))
    if (topK) { const cut = [...p].sort((a, b) => b - a)[topK - 1]; p = p.map(v => (v >= cut ? v : 0)) }
    const s = p.reduce((a, b) => a + b, 0); let u = rng() * s, k = 0
    while (k < p.length - 1 && u > p[k]) { u -= p[k]; k++ }
    text += VOCAB[k]
  }
  return text
}
export const perplexity = bits => 2 ** bits
// Interpolated n-gram: mix orders n, n−1, …, 1 so unseen contexts fall back to shorter ones.
export function interpolatedModel(text, n, weights) {
  const models = range(n).map(o => ngramModel(text, o + 1, 0)), w = weights ?? range(n).map(o => (o + 1) / (n * (n + 1) / 2))
  const V = VOCAB.length
  const prob = (ctx, c) => { let p = 0, tot = 0; models.forEach((m, o) => { const sub = o ? ctx.slice(-o) : ''; const has = o === 0 || m.dist(sub).some((v, i) => v > 0); if (has) { p += w[o] * m.prob(sub, c); tot += w[o] } }); return 0.999 * p / tot + 0.001 / V }
  return { n, prob, dist: ctx => VOCAB.map(c => prob(ctx, c)) }
}
