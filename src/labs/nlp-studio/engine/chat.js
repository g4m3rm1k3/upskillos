// Part 6's engine: python/chat.py in JavaScript (parity6.test.js checks). Conversations as word
// tokens with special tokens, dialogues from templates, the loss mask, and replies that stop at ¶.
import * as G from './tinygpt.js'
import { Rng } from './vectors.js'
import { tokenize } from './text.js'

export const USER = '«', BOT = '»', END = '¶', UNKNOWN = '<unk>'
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
export const HOURS = { saturday: 'nine to five', sunday: 'ten to four' }
export const PARTS = ['chain', 'tyre', 'brake', 'wheel', 'pedal', 'saddle']
export const PROBLEMS = ['broken', 'flat', 'bent', 'loose', 'stuck', 'squeaky']
export const THINGS = ['pizza', 'shoes', 'books', 'phones', 'coffee', 'tickets']
export const TEMPLATES = [
  ['hours', ['when are you open on {day}', 'are you open on {day}', 'what are your hours on {day}', 'is the shop open on {day}'], 'on {day} we are open {hours}.'],
  ['repair', ['my {part} is {problem}', 'the {part} on my bike is {problem}', 'can you fix a {problem} {part}'], 'bring the bike in and we will fix the {part}.'],
  ['order', ['where is order {number}', 'has order {number} shipped', 'track order {number}'], 'order {number} ships tomorrow.'],
  ['other', ['do you sell {thing}', 'can i buy {thing} here'], 'sorry, i can only help with bikes.'],
  ['greeting', ['hello', 'hi', 'good morning', 'hey there'], 'hello! how can i help?'],
  ['thanks', ['thanks', 'thank you', 'cheers'], "you're welcome."],
  ['goodbye', ['bye', 'goodbye', 'see you'], 'goodbye, happy riding.'],
]
export const HELD_OUT = [['wheel', 'bent'], ['pedal', 'loose'], ['chain', 'squeaky'], ['tyre', 'stuck']]
const isHeld = (part, problem) => HELD_OUT.some(([p, q]) => p === part && q === problem)

export function fill(template, slots) {
  let out = template
  for (const [name, value] of Object.entries(slots)) out = out.split(`{${name}}`).join(value)
  return out
}
export const isNumber = t => /^[0-9]+$/.test(t)
export const chatTokens = text => tokenize(text.toLowerCase()).flatMap(t => (isNumber(t) ? [...t] : [t]))
export function detokenize(tokens) {
  return tokens.map((t, i) => {
    const prev = i ? tokens[i - 1] : ''
    const joined = i === 0 || ['.', ',', '!', '?', "'"].includes(t) || prev === "'" || (isNumber(t) && isNumber(prev))
    return joined ? t : ' ' + t
  }).join('')
}
export const formatDialogue = turns => turns.flatMap(([role, words]) => [role === 'user' ? USER : BOT, ...chatTokens(words), END])

export function makeDialogues(seed = 1, orders = 60) {
  const rng = new Rng(seed), train = [], held = []
  for (const [kind, questions, answer] of TEMPLATES) {
    let combos
    if (kind === 'hours') combos = DAYS.map(d => ({ day: d, hours: HOURS[d] ?? 'nine to six' }))
    else if (kind === 'repair') combos = PARTS.flatMap(p => PROBLEMS.map(q => ({ part: p, problem: q })))
    else if (kind === 'order') combos = Array.from({ length: orders }, () => ({ number: String(100 + rng.below(900)) }))
    else if (kind === 'other') combos = THINGS.map(t => ({ thing: t }))
    else combos = [{}]
    for (const slots of combos) for (const question of questions) {
      const pair = [fill(question, slots), fill(answer, slots)]
      if (kind === 'repair' && isHeld(slots.part, slots.problem)) held.push(pair)
      else if (kind === 'order' && held.length < 40 && rng.random() < 0.15) held.push(pair)
      else train.push(pair)
    }
  }
  return [train, held]
}

export function toTokens(pairs, rng) {
  const order = pairs.map((_, k) => k)
  for (let i = order.length - 1; i > 0; i--) { const j = rng.below(i + 1); [order[i], order[j]] = [order[j], order[i]] }
  const tokens = [], roles = []
  for (const k of order) {
    const [user, bot] = pairs[k], piece = formatDialogue([['user', user], ['bot', bot]])
    const botStarts = chatTokens(user).length + 3
    tokens.push(...piece)
    piece.forEach((_, i) => roles.push(i < botStarts ? 0 : 1))
  }
  return [tokens, roles]
}
export const lossMask = (roles, start, context) => Array.from({ length: context }, (_, i) => roles[start + 1 + i])

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
export function makeVocab(pairs) {
  const tokens = new Set(chatTokens(pairs.map(([u, b]) => u + ' ' + b).join(' ')))
  for (const s of [USER, BOT, END, UNKNOWN]) tokens.add(s)
  return [...tokens].sort(byCodePoint)
}

// The chat trainer, in slices for the page: trainer.step(n). Same random numbers as train_chat.
export function makeChatTrainer(pairs, { dim = 32, context = 32, hidden = 128, lr = 0.005, seed = 1 } = {}) {
  const rng = new Rng(seed + 2)
  const [tokens, roles] = toTokens(pairs, rng)
  const vocab = makeVocab(pairs)
  const index = Object.fromEntries(vocab.map((t, k) => [t, k]))
  const model = G.initModel(vocab.length, dim, context, hidden, seed)
  const state = { t: 0, b1t: 1, b2t: 1, m: Object.fromEntries(G.PARAMS.map(n => [n, G.zeros(model[n].length, model[n][0].length)])), v: Object.fromEntries(G.PARAMS.map(n => [n, G.zeros(model[n].length, model[n][0].length)])) }
  const losses = []
  let attempts = 0
  return {
    vocab, model, losses, tokens,
    get attempts() { return attempts },
    step(n = 1) {
      for (let s = 0; s < n; s++) {
        attempts++
        const start = rng.below(tokens.length - context - 1)
        const ids = tokens.slice(start, start + context).map(t => index[t]), targets = tokens.slice(start + 1, start + context + 1).map(t => index[t])
        const mask = lossMask(roles, start, context)
        if (mask.reduce((a, b) => a + b, 0) === 0) continue
        const [logits, weights] = G.forward(model, ids)
        const loss = G.crossEntropy(logits, targets, mask)
        loss.backward()
        G.adamStep(model, Object.fromEntries(G.PARAMS.map(p => [p, weights[p].grad])), state, lr)
        losses.push(loss.data[0][0])
      }
      return losses
    },
  }
}
export function trainChat(pairs, steps, options) { const t = makeChatTrainer(pairs, options); t.step(steps); return [t.vocab, t.model, t.losses] }

export function topK(probs, k) {
  const keep = new Set(probs.map((p, i) => i).sort((a, b) => probs[b] - probs[a] || a - b).slice(0, k))
  const total = [...keep].reduce((s, i) => s + probs[i], 0)
  return probs.map((p, i) => (keep.has(i) ? p / total : 0))
}

// The reply, and (for the figure) for every token the bot chose: its probability and the top 3.
export function replyTrace(vocab, model, history, message, { temperature = 0, k = 0, rng = null, maxTokens = 30 } = {}) {
  const index = Object.fromEntries(vocab.map((t, i) => [t, i]))
  const context = model.pos.length
  const prompt = [...history, USER, ...chatTokens(message), END, BOT]
  const ids = prompt.map(t => index[t] ?? index[UNKNOWN])
  const out = [], steps = []
  for (let n = 0; n < maxTokens; n++) {
    const [logits] = G.forward(model, ids.slice(-context))
    const last = logits.data.at(-1)
    const top = Math.max(...last), exps = last.map(x => Math.exp(x - top)), total = exps.reduce((s, x) => s + x, 0)
    const plain = exps.map(e => e / total)
    let choice, probs = plain
    if (temperature === 0) {
      choice = 0
      for (let i = 1; i < last.length; i++) if (last[i] > last[choice]) choice = i
    } else {
      const scaled = last.map(x => x / temperature), t2 = Math.max(...scaled), e2 = scaled.map(x => Math.exp(x - t2)), s2 = e2.reduce((s, x) => s + x, 0)
      probs = e2.map(e => e / s2)
      if (k) probs = topK(probs, k)
      const r = rng.random()
      let acc = 0
      choice = probs.length - 1
      for (let j = 0; j < probs.length; j++) { acc += probs[j]; if (r < acc) { choice = j; break } }
    }
    steps.push({ token: vocab[choice], p: probs[choice], top: plain.map((p, i) => [p, vocab[i]]).sort((a, b) => b[0] - a[0]).slice(0, 3) })
    if (vocab[choice] === END) break
    out.push(vocab[choice])
    ids.push(choice)
  }
  return { reply: out, steps, unknown: chatTokens(message).filter(t => !(t in index)) }
}
export const reply = (vocab, model, history, message, options) => replyTrace(vocab, model, history, message, options).reply

export function exactMatch(vocab, model, pairs) {
  if (!pairs.length) return 0
  return pairs.filter(([user, bot]) => { const r = reply(vocab, model, [], user); const want = chatTokens(bot); return r.length === want.length && r.every((t, i) => t === want[i]) }).length / pairs.length
}

// .safetensors for Bot 3: the tiny GPT's file, with the chat vocabulary and a format of its own.
export function chatToSafetensors(vocab, model) {
  const bytes = G.toSafetensors(vocab, model)
  const [header, start] = G.readHeader(bytes)
  header.__metadata__.format = 'upskillos-tiny-chat'
  let json = JSON.stringify(header)
  while ((8 + new TextEncoder().encode(json).length) % 8) json += ' '
  const head = new TextEncoder().encode(json), body = bytes.subarray(start)
  const out = new Uint8Array(8 + head.length + body.length)
  new DataView(out.buffer).setBigUint64(0, BigInt(head.length), true)
  out.set(head, 8); out.set(body, 8 + head.length)
  return out
}
export function chatFromSafetensors(bytes) {
  const [header] = (() => { try { return G.readHeader(bytes) } catch { throw new Error('The file is too short or its header isn’t valid JSON.') } })()
  if (header.__metadata__?.format !== 'upskillos-tiny-chat') throw new Error(header.__metadata__?.format === 'upskillos-tiny-gpt' ? 'That is a Part 5 tiny GPT, not a Bot 3 chat model: load it in lesson 5.6.' : 'This isn’t a Bot 3 model saved by NLP Studio.')
  const copy = bytes.slice()
  const [h, start] = G.readHeader(copy)
  h.__metadata__.format = 'upskillos-tiny-gpt'
  let json = JSON.stringify(h)
  while ((8 + new TextEncoder().encode(json).length) % 8) json += ' '
  const head = new TextEncoder().encode(json), body = copy.subarray(start)
  const out = new Uint8Array(8 + head.length + body.length)
  new DataView(out.buffer).setBigUint64(0, BigInt(head.length), true)
  out.set(head, 8); out.set(body, 8 + head.length)
  const { vocab, model } = G.fromSafetensors(out)
  if (![USER, BOT, END, UNKNOWN].every(t => vocab.includes(t))) throw new Error('The model’s vocabulary has no chat tokens (« » ¶ <unk>).')
  return { vocab, model }
}

// Part 7: fine-tuning Bot 3 on new information, fully or with LoRA (python/chat.py's, line for line).
export const sundayUpdate = () => TEMPLATES[0][1].map(q => [fill(q, { day: 'sunday' }), 'on sunday we are open nine to five.'])

export function initLora(model, targets, rank, seed = 5) {
  const rng = new Rng(seed), a = {}, b = {}
  for (const name of targets) {
    const rows = model[name].length, cols = model[name][0].length
    a[name] = Array.from({ length: rows }, () => Array.from({ length: rank }, () => (rng.random() * 2 - 1) / Math.sqrt(rows)))
    b[name] = Array.from({ length: rank }, () => Array(cols).fill(0))
  }
  return { targets: [...targets], rank, scale: 1, a, b }
}
export const loraSize = lora => ['a', 'b'].reduce((s, part) => s + Object.values(lora[part]).reduce((t, m) => t + m.length * m[0].length, 0), 0)

// Fine-tune in slices for the page: tuner.step(n). With lora only A and B change; without, every weight.
export function makeFinetuner(vocab, model, pairs, { lora = null, lr = 0.002, seed = 7 } = {}) {
  const rng = new Rng(seed)
  const [tokens, roles] = toTokens(pairs, rng)
  const index = Object.fromEntries(vocab.map((t, k) => [t, k]))
  const context = model.pos.length
  const params = {}
  if (lora) for (const name of lora.targets) { params[name + '.a'] = lora.a[name]; params[name + '.b'] = lora.b[name] }
  else for (const name of G.PARAMS) params[name] = model[name]
  const state = { t: 0, b1t: 1, b2t: 1, m: Object.fromEntries(Object.entries(params).map(([n, p]) => [n, G.zeros(p.length, p[0].length)])), v: Object.fromEntries(Object.entries(params).map(([n, p]) => [n, G.zeros(p.length, p[0].length)])) }
  const losses = []
  return {
    losses,
    step(n = 1) {
      for (let s = 0; s < n; s++) {
        const start = rng.below(tokens.length - context - 1)
        const ids = tokens.slice(start, start + context).map(t => index[t]), targets = tokens.slice(start + 1, start + context + 1).map(t => index[t])
        const mask = lossMask(roles, start, context)
        if (mask.reduce((x, y) => x + y, 0) === 0) continue
        const [logits, weights] = G.forward(model, ids, true, lora)
        const loss = G.crossEntropy(logits, targets, mask)
        loss.backward()
        G.adamStep(params, Object.fromEntries(Object.keys(params).map(p => [p, weights[p].grad])), state, lr)
        losses.push(loss.data[0][0])
      }
      return losses
    },
  }
}
export function finetuneChat(vocab, model, pairs, steps, options) { const t = makeFinetuner(vocab, model, pairs, options); t.step(steps); return t.losses }

export function mergeLora(model, lora) {
  const merged = Object.fromEntries(G.PARAMS.map(n => [n, model[n].map(r => [...r])]))
  for (const name of lora.targets) {
    const a = lora.a[name], b = lora.b[name]
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b[0].length; j++) {
      let s = 0
      for (let r = 0; r < b.length; r++) s += a[i][r] * b[r][j]
      merged[name][i][j] += lora.scale * s
    }
  }
  return merged
}
export const cloneModel = model => Object.fromEntries(G.PARAMS.map(n => [n, model[n].map(r => [...r])]))
