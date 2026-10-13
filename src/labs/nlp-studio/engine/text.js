// Part 1's engine: the functions of python/text_basics.py, written again in JavaScript so the
// lessons and figures can run them in the page. parity.test.js checks that both give the same
// answers on the same texts.
//
// Python walks a string one code point at a time, so these do too ([...text]); JavaScript's own
// text.length counts UTF-16 units instead, and an emoji would count as 2.

const isSpace = ch => /^\s$/u.test(ch)
const isAlnum = ch => /^[\p{L}\p{N}]$/u.test(ch)
export const chars = text => [...text]

export const utf8Bytes = text => [...new TextEncoder().encode(text)]

export function count(items) {
  const counts = {}
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1
  return counts
}

export function charKind(ch) {
  if (isAlnum(ch) || ch === '_') return 'word'
  if (isSpace(ch)) return 'space'
  return 'punct'
}

// Every step of split_words: which character, which branch of the code ran, and the state after.
// `line` is text from the Python line that ran, so a figure can find and light up that line.
export function splitWordsTrace(text) {
  const words = [], steps = []
  let current = ''
  for (const [i, ch] of chars(text).entries()) {
    if (isSpace(ch)) {
      if (current) { words.push(current); steps.push({ i, ch, line: 'words.append(current)', current: '', words: [...words], saved: current }); current = '' }
      else steps.push({ i, ch, line: 'if current:', current, words: [...words] })
    } else {
      current += ch
      steps.push({ i, ch, line: 'current += ch', current, words: [...words] })
    }
  }
  if (current) { words.push(current); steps.push({ i: null, ch: null, line: 'words.append(current)', current: '', words: [...words], saved: current, end: true }) }
  return { words, steps }
}
// The plain versions build no trace: a trace copies the list at every character, which grows with
// the square of the text's length (fine for a sentence in a figure, ruinous for a whole book).
export function splitWords(text) {
  const words = []
  let current = ''
  for (const ch of chars(text)) {
    if (isSpace(ch)) { if (current) { words.push(current); current = '' } } else current += ch
  }
  if (current) words.push(current)
  return words
}

export function tokenizeTrace(text) {
  const tokens = [], steps = []
  let current = ''
  for (const [i, ch] of chars(text).entries()) {
    const kind = charKind(ch)
    if (kind === 'word') { current += ch; steps.push({ i, ch, kind, line: 'current += ch', current, tokens: [...tokens] }); continue }
    let saved = null
    if (current) { tokens.push(current); saved = current; current = '' }
    if (kind === 'punct') tokens.push(ch)
    steps.push({ i, ch, kind, line: kind === 'punct' ? 'tokens.append(ch)' : saved ? 'tokens.append(current)' : 'if current:', current, tokens: [...tokens], saved })
  }
  if (current) { tokens.push(current); steps.push({ i: null, ch: null, kind: null, line: 'tokens.append(current)', current: '', tokens: [...tokens], saved: current, end: true }) }
  return { tokens, steps }
}
export function tokenize(text) {
  const tokens = []
  let current = ''
  for (const ch of chars(text)) {
    const kind = charKind(ch)
    if (kind === 'word') { current += ch; continue }
    if (current) { tokens.push(current); current = '' }
    if (kind === 'punct') tokens.push(ch)
  }
  if (current) tokens.push(current)
  return tokens
}

// Python's \w+|[^\w\s], with \w spelled out the way Python's Unicode \w means it.
export const TOKEN_PATTERN = String.raw`\w+|[^\w\s]`
export const tokenizeRegex = text => text.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu) ?? []

export const wordCounts = text => count(tokenize(text).filter(t => charKind(chars(t)[0]) === 'word').map(t => t.toLowerCase()))

// Python sorts strings by code point; localeCompare would not, so compare plainly.
export function rankTable(counts) {
  return Object.entries(counts)
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
    .map(([word, n], k) => [k + 1, word, n])
}

// The slope of the best straight line through (log rank, log count): least squares. Zipf's law
// says −1; real texts come out near it, not on it.
export function logLogSlope(table) {
  const pts = table.map(([r, , n]) => [Math.log(r), Math.log(n)])
  if (pts.length < 2) return null
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0)
  return sxx ? pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx : null
}

export function splitSentencesNaive(text) {
  const out = [], cs = chars(text)
  let start = 0
  cs.forEach((ch, i) => {
    if ('.!?'.includes(ch)) { const s = cs.slice(start, i + 1).join('').trim(); if (s) out.push(s); start = i + 1 }
  })
  const rest = cs.slice(start).join('').trim()
  if (rest) out.push(rest)
  return out
}

export const ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'st', 'vs', 'etc', 'e.g', 'i.e']

export function lastWord(cs, i) {
  let j = i
  while (j > 0 && !isSpace(cs[j - 1])) j--
  return cs.slice(j, i).join('')
}

// Every . ! ? the rules looked at, and what they decided: { i, ch, ends, reason }.
export function sentenceDecisions(text) {
  const cs = chars(text), out = []
  cs.forEach((ch, i) => {
    if (!'.!?'.includes(ch)) return
    const atEnd = i + 1 === cs.length
    if (!atEnd && !isSpace(cs[i + 1])) { out.push({ i, ch, ends: false, reason: `no space after it (“${cs[i + 1]}” follows), so it is inside a token` }); return }
    const before = lastWord(cs, i)
    if (ch === '.' && ABBREVIATIONS.includes(before.toLowerCase())) { out.push({ i, ch, ends: false, reason: `“${before}.” is in the abbreviation list` }); return }
    out.push({ i, ch, ends: true, reason: atEnd ? 'the end of the text' : 'a space follows, and it is not after an abbreviation' })
  })
  return out
}

export function splitSentences(text) {
  const cs = chars(text), out = []
  let start = 0
  for (const d of sentenceDecisions(text)) {
    if (!d.ends) continue
    const s = cs.slice(start, d.i + 1).join('').trim()
    if (s) out.push(s)
    start = d.i + 1
  }
  const rest = cs.slice(start).join('').trim()
  if (rest) out.push(rest)
  return out
}
