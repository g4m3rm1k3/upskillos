// Facts read from a program's source, so explanations can say where a line fits: which function it
// is in, what it calls, which stored data it reads or changes, and which note explains it.
import { JS } from './explain/js.js'

// The names a line gives a value to: declared variables, reassigned variables, and stored data.
export function assigned(text) {
  const t = text.trim(), names = [], data = []
  const decl = /^(?:const|let) (\w+)/.exec(t); if (decl) names.push(decl[1])
  const list = /^(?:const|let) \[([^\]]+)\]/.exec(t); if (list) names.push(...list[1].split(',').map(x => x.trim()))
  const reassign = /^(\w+)(?:\[[^\]]*\])*\s*=(?!=)/.exec(t); if (reassign && !['const', 'let'].includes(reassign[1])) names.push(reassign[1])
  const store = /^data\.(\w+)[^=]*=(?!=)/.exec(t); if (store) data.push(store[1])
  if (/^world\.\w+\s*=(?!=)/.test(t)) data.push('worlds')
  return { names, data }
}

export function analyse(program, explain, extras = {}) {
  const { lines } = program
  const functions = {}, lineFn = []
  let current = null
  lines.forEach((text, i) => {
    const head = /^function (\w+)\((.*)\) \{$/.exec(text)
    if (head) { current = head[1]; functions[current] = { name: current, start: i + 1, params: head[2].split(',').map(s => s.trim()).filter(Boolean), calls: [], callers: [] } }
    lineFn[i + 1] = current
    if (text === '}' && current) { functions[current].end = i + 1; current = null }
  })
  const names = Object.keys(functions)
  const callPattern = new RegExp(`\\b(${names.join('|')})\\(`, 'g')
  const lineCalls = []
  lines.forEach((text, i) => {
    const fn = lineFn[i + 1]
    if (!fn || /^function /.test(text)) return
    const called = [...text.matchAll(callPattern)].map(m => m[1])
    lineCalls[i + 1] = called
    for (const name of called) {
      if (!functions[fn].calls.includes(name)) functions[fn].calls.push(name)
      functions[name].callers.push({ fn, line: i + 1 })
    }
  })
  // Notes are matched to lines in order within each function, so two identical lines can have different notes.
  const notes = []
  for (const fn of names) {
    const queue = [...(explain.LINES[fn] ?? [])]
    for (let n = functions[fn].start + 1; n < functions[fn].end; n++) {
      const k = queue.findIndex(note => lines[n - 1].includes(note.has))
      if (k >= 0) notes[n] = queue.splice(k, 1)[0]
    }
    functions[fn].unmatched = queue
  }
  // The arithmetic-with-numbers and loop phase for lines, matched in order the same way.
  const extra = []
  for (const fn of names) {
    const queue = [...(extras[fn] ?? [])]
    for (let n = functions[fn].start + 1; n < functions[fn].end; n++) {
      const k = queue.findIndex(x => lines[n - 1].includes(x.has))
      if (k >= 0) extra[n] = queue.splice(k, 1)[0]
    }
    functions[fn].unmatchedExtras = queue
  }
  // The program's constants, worked out by running its top-level lines (before the first function).
  const top = lines.slice(0, lines.findIndex(l => /^function /.test(l))).join('\n')
  const constantNames = [...top.matchAll(/^const (\w+)/gm)].map(m => m[1])
  const constantValues = new Function(`${top}\nreturn { ${constantNames.join(', ')} }`)()
  // Top-level constants and the text of their values (first line only for multi-line ones).
  const constants = {}
  lines.forEach((text, i) => { const m = /^const (\w+) = (.*)$/.exec(text); if (m) constants[m[1]] = { line: i + 1, value: m[2] === '[' ? lines.slice(i + 1, lines.indexOf(']', i) ).map(l => l.trim()).join(' ') : m[2] } })
  return {
    functions, lineFn, lineCalls, notes, lines, constants, extra, constantValues,
    // Shortest chain of calls from run() to this function: where it fits in the program.
    pathTo(fn) {
      const previous = { run: null }, queue = ['run']
      while (queue.length) { const at = queue.shift(); for (const next of functions[at]?.calls ?? []) if (!(next in previous)) { previous[next] = at; queue.push(next) } }
      if (!(fn in previous)) return [fn]
      const path = []; for (let at = fn; at; at = previous[at]) path.unshift(at)
      return path
    },
  }
}

// Which stored data a line reads and which it changes (data.X, plus a world's fields in A2C).
export function dataUse(text) {
  const writes = new Set(), reads = new Set()
  const assign = /^\s*(data\.(\w+)|world\.(\w+)|weights\[)[^=]*=(?!=)/.exec(text)
  if (assign) writes.add(assign[2] ?? (assign[3] ? 'worlds' : 'weights'))
  const rhs = assign ? text.slice(text.indexOf('=', assign.index + assign[1].length) + 1) : text
  for (const m of rhs.matchAll(/data\.(\w+)/g)) reads.add(m[1])
  if (/\bworld\./.test(rhs)) reads.add('worlds')
  return { reads: [...reads], writes: [...writes] }
}

const KEYWORDS = new Set(['function', 'const', 'let', 'return', 'if', 'else', 'for', 'of', 'while', 'true', 'false', 'new'])

// Split a line into tokens. Each token knows what kind it is, for colouring and for clicks.
export function tokenize(text) {
  const out = [], pattern = /(\s+)|(\/\/.*$)|([A-Za-z_$][\w$]*)|(\d+(?:\.\d+)?)|(\.\.\.|===|!==|>=|<=|&&|\|\||=>|\+\+|--|[-+*/%<>=!?:.,;()[\]{}])/g
  let m
  while ((m = pattern.exec(text))) {
    const [token, space, comment, name, number, op] = m
    if (space) out.push({ text: token, kind: 'space' })
    else if (comment) out.push({ text: token, kind: 'comment' })
    else if (name) out.push({ text: token, kind: KEYWORDS.has(token) ? 'keyword' : 'name' })
    else if (number) out.push({ text: token, kind: 'number' })
    else out.push({ text: token, kind: 'op' })
  }
  // Mark property names (after a dot) and the object before them, so Math.max is one idea.
  out.forEach((t, i) => {
    if (t.kind === 'name' && out[i - 1]?.text === '.') { t.property = true; t.object = out[i - 2]?.text }
  })
  return out
}

// The general-JavaScript entry for a clicked token, if there is one.
export function jsEntry(token) {
  if (token.property && token.object === 'Math') return JS[`Math.${token.text}`]
  if (token.property) return JS[token.text]
  if (token.kind === 'keyword' || token.kind === 'op') return JS[token.text]
  return null
}
