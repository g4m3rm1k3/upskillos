// Part 2's engine: python/parsing.py in JavaScript. A tree is [label, children] for a phrase and
// [partOfSpeech, word] for a word, the JSON form of the Python tuples. parity.test.js holds the
// two to the same answers.

export const GRAMMAR = {
  S: [['NP', 'VP']],
  NP: [['Det', 'N'], ['Det', 'N', 'PP'], ['Pronoun'], ['Name']],
  VP: [['V', 'NP'], ['V', 'NP', 'PP'], ['V']],
  PP: [['P', 'NP']],
}
export const LEXICON = {
  Det: ['the', 'a'],
  N: ['man', 'dog', 'cat', 'telescope', 'park', 'hill'],
  Pronoun: ['i', 'she', 'he'],
  Name: ['alice', 'bob'],
  V: ['saw', 'chased', 'walked', 'slept'],
  P: ['with', 'in', 'on'],
}
export const isWord = tree => typeof tree[1] === 'string'

export function leaves(tree) {
  return isWord(tree) ? [tree[1]] : tree[1].flatMap(leaves)
}
export function bracket(tree) {
  return isWord(tree) ? `(${tree[0]} ${tree[1]})` : `(${tree[0]} ${tree[1].map(bracket).join(' ')})`
}

// The fewest words each symbol can make: a word is 1, a rule the sum of its parts, a symbol its
// cheapest rule. Repeated until nothing changes, because the grammar refers to itself.
export function minWords(symbol) {
  const best = Object.fromEntries(Object.keys(LEXICON).map(k => [k, 1]))
  for (let changed = true; changed;) {
    changed = false
    for (const [s, rules] of Object.entries(GRAMMAR)) for (const rule of rules) {
      if (!rule.every(p => p in best)) continue
      const n = rule.reduce((t, p) => t + best[p], 0)
      if (!(s in best) || n < best[s]) { best[s] = n; changed = true }
    }
  }
  return best[symbol]
}

// Recursive descent, counting calls of parseSymbol in `stats` so lesson 2.4 can show the repeated work.
export function parseSymbol(symbol, words, i, stats) {
  if (stats) stats.calls++
  if (symbol in LEXICON) return i < words.length && LEXICON[symbol].includes(words[i]) ? [[[symbol, words[i]], i + 1]] : []
  const results = []
  for (const rule of GRAMMAR[symbol]) for (const [children, j] of parseSequence(rule, words, i, stats)) results.push([[symbol, children], j])
  return results
}
export function parseSequence(symbols, words, i, stats) {
  if (!symbols.length) return [[[], i]]
  const results = []
  for (const [first, j] of parseSymbol(symbols[0], words, i, stats)) for (const [rest, k] of parseSequence(symbols.slice(1), words, j, stats)) results.push([[first, ...rest], k])
  return results
}
export const wordsOf = sentence => sentence.toLowerCase().split(/\s+/).filter(Boolean)
export function parse(sentence, stats) {
  const words = wordsOf(sentence)
  return parseSymbol('S', words, 0, stats).filter(([, j]) => j === words.length).map(([tree]) => tree)
}
export function parseCalls(sentence) { const stats = { calls: 0 }; parse(sentence, stats); return stats.calls }

export function catalan(n) {
  const c = [1]
  for (let m = 1; m <= n; m++) { let s = 0; for (let i = 0; i < m; i++) s += c[i] * c[m - 1 - i]; c.push(s) }
  return c[n]
}

export const CNF_RULES = [['S', 'NP', 'VP'], ['NP', 'Det', 'N'], ['NP', 'NP', 'PP'], ['VP', 'V', 'NP'], ['VP', 'VP', 'PP'], ['PP', 'P', 'NP']]
export const CNF_LEXICON = {
  the: ['Det'], a: ['Det'],
  man: ['N'], dog: ['N'], cat: ['N'], telescope: ['N'], park: ['N'], hill: ['N'],
  i: ['NP'], she: ['NP'], he: ['NP'], alice: ['NP'], bob: ['NP'],
  saw: ['V'], chased: ['V'], walked: ['VP'], slept: ['VP'],
  with: ['P'], in: ['P'], on: ['P'],
}

export function combine(left, right) {
  const out = {}
  for (const [parent, l, r] of CNF_RULES) if (l in left && r in right) out[parent] = (out[parent] ?? 0) + left[l] * right[r]
  return out
}

// The chart, and every step that filled it, for the chart player:
//   { phase: 'word', i, j, cell }   a word's own cell
//   { phase: 'split', i, j, k, found, cell }   one split point k of the cell (i, j): what combine found, the cell so far
// Keys of `table` are "i,j"; a cell is { symbol: number of trees }.
export function ckyTrace(words) {
  const n = words.length, table = {}, steps = []
  words.forEach((word, i) => {
    const cell = Object.fromEntries([...(CNF_LEXICON[word] ?? [])].sort().map(t => [t, 1]))
    table[`${i},${i + 1}`] = cell
    steps.push({ phase: 'word', i, j: i + 1, cell: { ...cell } })
  })
  for (let length = 2; length <= n; length++) for (let i = 0; i + length <= n; i++) {
    const j = i + length, cell = {}
    for (let k = i + 1; k < j; k++) {
      const found = combine(table[`${i},${k}`], table[`${k},${j}`])
      for (const [parent, trees] of Object.entries(found)) cell[parent] = (cell[parent] ?? 0) + trees
      steps.push({ phase: 'split', i, j, k, found, cell: { ...cell } })
    }
    table[`${i},${j}`] = cell
  }
  return { table, steps }
}
export const cky = words => ckyTrace(words).table
export const countTrees = words => cky(words)[`0,${words.length}`]?.S ?? 0

export const HEADS = { S: ['VP'], NP: ['N', 'Pronoun', 'Name'], VP: ['V'], PP: ['P'] }
export function dependencies(tree) {
  const heads = []
  const walk = node => {
    if (isWord(node)) { heads.push(0); return heads.length }
    const positions = node[1].map(walk)
    const main = positions.find((p, x) => HEADS[node[0]].includes(node[1][x][0]))
    for (const p of positions) if (p !== main) heads[p - 1] = main
    return main
  }
  walk(tree)
  return heads
}

// is_tree with its reason, for the figure.
export function treeCheck(heads) {
  const n = heads.length, roots = heads.filter(h => h === 0).length
  if (roots !== 1) return { ok: false, reason: roots === 0 ? 'no word hangs from the root' : `${roots} words hang from the root; a tree has exactly one` }
  for (let start = 1; start <= n; start++) {
    const seen = new Set()
    for (let node = start; node !== 0; node = heads[node - 1]) {
      if (node < 1 || node > n) return { ok: false, reason: `word ${start} points to position ${node}, which is not a word` }
      if (seen.has(node)) return { ok: false, reason: `following the heads from word ${start} goes round in a loop and never reaches the root` }
      seen.add(node)
    }
  }
  return { ok: true, reason: 'every word reaches the root, with no loops' }
}
export const isTree = heads => treeCheck(heads).ok

export function crossingArcs(heads) {
  const arcs = heads.flatMap((h, x) => (h === 0 ? [] : [[Math.min(x + 1, h), Math.max(x + 1, h)]]))
  let crossings = 0
  for (let a = 0; a < arcs.length; a++) for (let b = a + 1; b < arcs.length; b++) {
    const [l1, r1] = arcs[a], [l2, r2] = arcs[b]
    if ((l1 < l2 && l2 < r1 && r1 < r2) || (l2 < l1 && l1 < r2 && r2 < r1)) crossings++
  }
  return crossings
}

// For lesson 2.5's derivation: try every way n words can each pick a head (0 or another word).
export function countHeadChoices(n) {
  let total = 0, valid = 0
  const heads = Array(n).fill(0)
  const options = k => [0, ...Array.from({ length: n }, (_, x) => x + 1).filter(p => p !== k + 1)]
  const go = k => {
    if (k === n) { total++; if (isTree(heads)) valid++; return }
    for (const h of options(k)) { heads[k] = h; go(k + 1) }
  }
  go(0)
  return { total, valid }
}
