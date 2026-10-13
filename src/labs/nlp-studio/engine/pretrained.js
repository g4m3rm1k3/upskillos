// Part 7: python/pretrained.py in JavaScript (parity7.test.js checks), plus loading the real
// pre-trained models with transformers.js. Nothing is downloaded until a figure's button asks:
// each loader is a promise kept for the rest of the session, and transformers.js keeps the files
// in the browser's cache, so a second visit doesn't download them again.

export function bytesToUnicode() {
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
  const bs = [...range(33, 126), ...range(161, 172), ...range(174, 255)]
  const cs = [...bs]
  let n = 0
  for (let b = 0; b < 256; b++) if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++ }
  return Object.fromEntries(bs.map((b, i) => [b, String.fromCodePoint(cs[i])]))
}
export function byteSymbols(text) {
  const table = bytesToUnicode()
  return [...new TextEncoder().encode(text)].map(b => table[b]).join('')
}
export function meanPool(tokenVectors, mask) {
  const total = mask.reduce((s, m) => s + m, 0)
  return tokenVectors[0].map((_, d) => tokenVectors.reduce((s, v, i) => s + v[d] * mask[i], 0) / total)
}
export function normalize(v) {
  const size = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return size ? v.map(x => x / size) : v
}
export function chatTemplate(messages, addGenerationPrompt = true) {
  return messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`).join('') + (addGenerationPrompt ? '<|im_start|>assistant\n' : '')
}
export const FACTS = [
  'Monday to Friday the shop is open from nine to six.',
  'On Saturday the shop is open from nine to five.',
  'On Sunday the shop is open from ten to four.',
  'A basic service costs 40 pounds and takes one day.',
  'We repair chains, brakes, gears, wheels and punctures.',
  'Orders ship the next working day; the tracking link is in the confirmation email.',
  'We sell bikes, helmets, lights and locks. We do not sell food.',
]
export function topFacts(questionVector, factVectors, k = 2) {
  return factVectors.map((f, i) => [questionVector.reduce((s, a, d) => s + a * f[d], 0), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, k)
}
export function groundedMessages(facts, question) {
  const rules = "You are the help desk of a bike shop. Answer in one short sentence using only these facts. If they do not answer the question, say you don't know."
  return [{ role: 'system', content: rules + '\n' + facts.map(f => '- ' + f).join('\n') }, { role: 'user', content: question }]
}
export function loraMatmul(x, w, a, b, scale = 1) {
  const mm = (p, q) => p.map(row => q[0].map((_, j) => { let s = 0; for (let r = 0; r < q.length; r++) s += row[r] * q[r][j]; return s }))
  const xw = mm(x, w), xab = mm(mm(x, a), b)
  return xw.map((row, i) => row.map((p, j) => p + scale * xab[i][j]))
}

// The models: what each is for, where it comes from, and how big the download is (measured).
export const MODELS = {
  tokenizer: { id: 'Xenova/gpt2', label: 'GPT-2’s tokenizer', size: '1.4 MB' },
  embedder: { id: 'Xenova/all-MiniLM-L6-v2', label: 'MiniLM sentence embeddings', size: '23 MB' },
  chat: { id: 'HuggingFaceTB/SmolLM2-135M-Instruct', label: 'SmolLM2-135M-Instruct', size: '137 MB' },
}

const loaded = {}
// load('tokenizer' | 'embedder' | 'chat', onProgress(fraction, file)) -> the model, once per session.
export function load(kind, onProgress) {
  loaded[kind] ??= (async () => {
    const tf = await import('@huggingface/transformers')
    tf.env.allowLocalModels = false
    const files = {}
    const progress_callback = e => {
      if (e.status === 'progress' && e.total) { files[e.file] = [e.loaded, e.total]; const all = Object.values(files); onProgress?.(all.reduce((s, [l]) => s + l, 0) / all.reduce((s, [, t]) => s + t, 0), e.file) }
    }
    const m = MODELS[kind]
    if (kind === 'tokenizer') return tf.AutoTokenizer.from_pretrained(m.id, { progress_callback })
    if (kind === 'embedder') return tf.pipeline('feature-extraction', m.id, { dtype: 'q8', progress_callback })
    return tf.pipeline('text-generation', m.id, { dtype: 'q8', progress_callback })
  })().catch(err => { delete loaded[kind]; throw err })
  return loaded[kind]
}
export const isLoaded = kind => kind in loaded

// Normalized MiniLM vectors for a list of sentences.
export async function embed(embedder, sentences) {
  const out = await embedder(sentences, { pooling: 'mean', normalize: true })
  return out.tolist()
}
// One reply from the chat model, greedy unless a temperature is given.
export async function chat(generator, messages, { maxNewTokens = 60, temperature = 0 } = {}) {
  const options = temperature > 0 ? { max_new_tokens: maxNewTokens, do_sample: true, temperature, top_k: 20 } : { max_new_tokens: maxNewTokens, do_sample: false }
  const r = await generator(messages, options)
  return r[0].generated_text.at(-1).content
}
