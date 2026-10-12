// The Frontier series' teaching rules, checked mechanically (docs/frontier-handoff.md, "Lesson format",
// and the plan's "The rules every lesson follows"). frontierLint.test.js runs it on every frontier-*
// lesson; `node scripts/lint-frontier-lessons.mjs` prints the same report.
//
// What it can and can't check. It counts and matches text; it can't judge whether an explanation is
// good. It catches the failures that can be seen in the text:
//   size        a step that makes the learner type more than 15 new lines
//   explain     typed code with too little prose before it (what you're about to type, and why) or
//               after it (what it did)
//   taught      a library call, built-in or Python feature in code the learner types, or needs for a
//               Your turn, that no prose at or before that point has named
//   your-turn   a Your turn that shows its code, or lacks hints or checks
//   predict     a lesson with no prediction
//   check       a typed step with no check
import { parseLesson } from './parseTrack.js'
import { tokenizePython } from '../a-arcade-python/analysis.js'

export const MAX_TYPED_LINES = 15
export const MIN_WORDS_BEFORE = 20
export const MIN_WORDS_AFTER = 15

// What the series assumes the learner already knows (the plan's "What's assumed": scripts with
// variables, loops, functions, lists, dictionaries, maybe a class). Everything else must be taught.
export const ASSUMED = new Set([
  'print', 'len', 'range', 'int', 'str', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'input', 'open', 'type',
  'min', 'max', 'sum', 'abs', 'round', 'sorted', 'enumerate', 'zip', 'isinstance',
  'append', 'items', 'keys', 'values', 'get', 'split', 'strip', 'lower', 'upper', 'replace', 'startswith', 'endswith',
  'extend', 'pop', 'sort', 'count', 'read', 'write', 'close', 'self', '__init__',
])

// Python features that are more than a name: how to spot one in tokens, and the words in prose
// that count as having taught it.
const FEATURES = [
  { name: 'list comprehension', taught: /comprehension/i, find: t => inBrackets(t, '[') },
  { name: 'dict or set comprehension', taught: /comprehension/i, find: t => inBrackets(t, '{') },
  { name: 'generator expression', taught: /generator expression/i, find: t => inBrackets(t, '(') },
  { name: 'f-string', taught: /f-string|f"|formatted string/i, find: t => t.some(x => x.kind === 'string' && /^f["']/.test(x.text)) },
  { name: 'lambda', taught: /`lambda|lambda function/i, find: t => has(t, 'lambda') },
  { name: '`with` block', taught: /`with\b|with block|with statement|context manager/i, find: t => startsWith(t, 'with') },
  { name: 'try/except', taught: /`try|`except|exception/i, find: t => startsWith(t, 'try') || startsWith(t, 'except') },
  { name: '`raise`', taught: /`raise|raises? an? |raise an/i, find: t => startsWith(t, 'raise') },
  { name: '`assert`', taught: /`assert/i, find: t => startsWith(t, 'assert') },
  { name: '`yield`', taught: /`yield|generator function/i, find: t => has(t, 'yield') },
  { name: 'decorator', taught: /decorator|`@/i, find: t => t[0]?.text === '@' },
  { name: 'type hint', taught: /type hint|annotation/i, find: t => startsWith(t, 'def') && (t.some(x => x.text === '->') || /\w:\s*\w/.test(t.filter(x => x.kind !== 'space').map(x => x.text).join(' ').replace(/^def[^(]*\(/, ''))) },
  { name: '*args / **kwargs', taught: /\*args|\*\*kwargs|\*\*\w+|unpack|keyword arguments/i, find: t => startsWith(t, 'def') && t.some(x => x.text === '*' || x.text === '**') },
  { name: '`global`', taught: /`global/i, find: t => startsWith(t, 'global') },
  { name: '`if __name__ == "__main__"`', taught: /__name__/i, find: t => has(t, '__name__') },
  { name: 'walrus `:=`', taught: /:=|walrus/i, find: t => t.some((x, i) => x.text === ':' && t[i + 1]?.text === '=') },
]
const solid = t => t.filter(x => x.kind !== 'space' && x.kind !== 'comment')
const has = (t, word) => t.some(x => x.text === word && x.kind === 'keyword')
const startsWith = (t, word) => t[0]?.text === word
// A `for` inside brackets opened on this line: a comprehension of that kind.
function inBrackets(t, open) {
  const stack = []
  for (const x of t) {
    if ('([{'.includes(x.text) && x.kind === 'op') stack.push(x.text)
    else if (')]}'.includes(x.text) && x.kind === 'op') stack.pop()
    else if (x.text === 'for' && stack.at(-1) === open) return true
  }
  return false
}

// Triple-quoted strings (docstrings) are text, not code: blank them out, keeping the lines.
const withoutDocstrings = code => code.replace(/("""|''')[\s\S]*?\1/g, m => m.replace(/[^\n]/g, ' '))

// The names and features a piece of Python uses that have to have been taught: imports, attribute
// calls and accesses, calls of names it didn't define, and the features above. Names the code
// defines itself (functions, classes, variables, parameters, imports) are the learner's own.
export function termsOf(code, known = new Set()) {
  const lines = withoutDocstrings(code).split('\n').map(l => solid(tokenizePython(l)))
  const defined = new Set(known)
  for (const t of lines) {
    if (startsWith(t, 'def') || startsWith(t, 'class')) defined.add(t[1]?.text)
    if (startsWith(t, 'def')) t.slice(2).forEach((x, i, a) => { if (x.kind === 'name' && !x.property && [',', '(', '*', '**'].includes(a[i - 1]?.text ?? '(')) defined.add(x.text) })
    const eq = t.findIndex(x => x.text === '=')
    if (eq > 0) t.slice(0, eq).forEach(x => { if (x.kind === 'name') defined.add(x.text) })
    if (startsWith(t, 'for')) t.slice(1, t.findIndex(x => x.text === 'in')).forEach(x => x.kind === 'name' && defined.add(x.text))
    t.forEach((x, i) => { if (x.text === 'for' && i > 0) t.slice(i + 1, t.findIndex((y, j) => j > i && y.text === 'in')).forEach(y => y.kind === 'name' && defined.add(y.text)) })
    if (startsWith(t, 'with') || startsWith(t, 'except')) t.forEach((x, i) => { if (t[i - 1]?.text === 'as') defined.add(x.text) })
    if (startsWith(t, 'import') || startsWith(t, 'from')) t.forEach((x, i) => { if (x.kind === 'name' && t[i - 1]?.text !== 'from' && t[i - 1]?.text !== '.') defined.add(x.text) })
  }
  const terms = new Map()
  const add = (term, line) => { if (!terms.has(term)) terms.set(term, line) }
  lines.forEach((t, n) => {
    if (startsWith(t, 'import') || startsWith(t, 'from')) {
      const mod = t.slice(1).filter(x => x.kind === 'name' || x.text === '.').map(x => x.text).join('').split('import')[0]
      add(t[1].text, n)
      if (startsWith(t, 'from')) t.slice(t.findIndex(x => x.text === 'import') + 1).forEach(x => x.kind === 'name' && x.text !== 'as' && t[t.indexOf(x) - 1]?.text !== 'as' && add(x.text, n))
      return void mod
    }
    t.forEach((x, i) => {
      if (x.kind !== 'name') return
      const call = t[i + 1]?.text === '('
      if (x.property) { if (!ASSUMED.has(x.text)) add(x.text, n); return }
      if (call && !defined.has(x.text) && !ASSUMED.has(x.text)) add(x.text, n)
    })
    for (const f of FEATURES) if (f.find(t)) add(f.name, n)
  })
  // Attributes of the learner's own objects (self.total, info.environment) are their own names.
  for (const term of [...terms.keys()]) if (defined.has(term)) terms.delete(term)
  return { terms, defined }
}

// What a piece of prose teaches: every name written in backticks, plus the text itself (for features).
export function taughtBy(prose) {
  const names = new Set()
  // Fenced blocks first (their ``` would throw the pairing of single backticks out), then inline code.
  const inline = prose.replace(/(```|~~~)[\s\S]*?\1/g, ' ')
  for (const [, inner] of inline.matchAll(/`([^`\n]+)`/g)) for (const m of inner.matchAll(/[A-Za-z_]\w*/g)) names.add(m[0])
  return { names, text: prose }
}

const words = s => (s.replace(/```[\s\S]*?```/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').match(/[A-Za-z][\w'’-]*/g) ?? []).length

// The lines in `next` that aren't in `previous` (blank lines and comments-only lines don't count):
// what the learner has to type. Matching is by line content, as many times as a line occurs.
export function typedLines(previous, next) {
  const pool = new Map()
  for (const l of previous) { const k = l.trim(); pool.set(k, (pool.get(k) ?? 0) + 1) }
  const out = []
  for (const l of next) {
    const k = l.trim()
    if (!k || k.startsWith('#')) continue
    if (pool.get(k)) pool.set(k, pool.get(k) - 1)
    else out.push(l)
  }
  return out
}

const isYourTurn = step => /^your turn\b/i.test(step.title)
// The Python in a Your turn's hints (the answer rung shows it in ~~~python fences), and every line
// of every fence in them.
const hintCode = step => step.hints.flat().flatMap(r => [...r.text.matchAll(/~~~python\n([\s\S]*?)~~~/g)].map(m => m[1]))
const hintLines = step => step.hints.flat().flatMap(r => [...r.text.matchAll(/~~~\w*\n([\s\S]*?)~~~/g)].flatMap(m => m[1].split('\n')))

// lessons: [{ id, text }] in series order. Returns [{ lesson, step, rule, level, message }].
export function lintSeries(lessons) {
  const problems = []
  const files = new Map()          // path → every line the learner has had in that file so far
  const ownNames = new Set()       // every name the learner's code has defined so far
  const answerLines = []           // lines written in Your turns: not new when a later step shows them
  let names = new Set(), text = '' // what the prose has taught so far
  const teach = prose => { const t = taughtBy(prose); t.names.forEach(n => names.add(n)); text += '\n' + t.text }
  const isTaught = term => names.has(term) || ASSUMED.has(term) || ownNames.has(term) || FEATURES.find(f => f.name === term)?.taught.test(text)
  for (const { id, text: source } of lessons) {
    const lesson = parseLesson(source, id)
    const report = (step, rule, message, level = 'error') => problems.push({ lesson: id, step: step?.title ?? null, rule, level, message })
    teach(lesson.intro)
    if (!lesson.steps.some(s => s.predictions.length)) report(null, 'predict', 'no prediction in the whole lesson')
    for (const step of lesson.steps) {
      if (isYourTurn(step)) {
        teach(step.prose)   // the task itself may introduce syntax (a TOML section, a command)
        if (step.target && !step.provided) report(step, 'your-turn', `shows its code (\`${step.file}\`): a Your turn gives the task, not the answer`)
        if (!step.hints.length) report(step, 'your-turn', 'no hints')
        else if (!['nudge', 'concept', 'answer'].every(k => step.hints.flat().some(r => r.key === k))) report(step, 'your-turn', 'hints lack a nudge, concept or answer rung')
        if (!step.checks.length) report(step, 'your-turn', 'no checks')
        for (const code of hintCode(step)) {
          const { terms } = termsOf(code, ownNames)
          for (const [term] of terms) if (!isTaught(term)) report(step, 'taught', `the answer needs \`${term}\`, which nothing before this Your turn teaches (a hint isn't teaching)`)
        }
        continue
      }
      const code = step.provided ? null : step.target ?? step.edit?.code ?? null
      if (code !== null) {
        const lines = code.split('\n')
        // Lines the learner already has in any file (code moved or copied between files isn't new typing).
        const had = [...files.values()].flat().concat(answerLines)
        const typed = step.edit ? lines.filter(l => l.trim() && !l.trim().startsWith('#')) : typedLines(had, lines)
        const predicted = step.predictions.map(p => `${p.question ?? ''} ${p.explain ?? ''}`).join(' ')
        if (typed.length > MAX_TYPED_LINES) report(step, 'size', `the learner types ${typed.length} new lines into \`${step.file}\` (at most ${MAX_TYPED_LINES} per step)`)
        if (typed.length >= 3) {
          if (words(step.prose) < MIN_WORDS_BEFORE) report(step, 'explain', `${typed.length} new lines with only ${words(step.prose)} words before them (at least ${MIN_WORDS_BEFORE}: what is about to be typed, and why)`)
          if (words(step.explain) + words(predicted) < MIN_WORDS_AFTER) report(step, 'explain', `${typed.length} new lines with only ${words(step.explain)} words after them (at least ${MIN_WORDS_AFTER}: trace what it does)`)
        }
        if (!step.checks.length) report(step, 'check', 'typed code with no check', 'warning')
        teach(step.prose); teach(step.explain); teach(predicted)
        if (step.lang === 'python') {
          const { terms, defined } = termsOf(typed.join('\n'), ownNames)
          for (const [term] of terms) if (!isTaught(term)) report(step, 'taught', `\`${term}\` is typed here, but no prose up to this step names it`)
          defined.forEach(n => ownNames.add(n))
        }
      } else {
        teach(step.prose); teach(step.explain); step.predictions.forEach(p => teach(`${p.question ?? ''} ${p.explain ?? ''}`))
      }
      if (step.target) files.set(step.file, [...(files.get(step.file) ?? []), ...step.target.split('\n')])
      if (step.edit) files.set(step.file, [...(files.get(step.file) ?? []), ...step.edit.code.split('\n')])
    }
    // What a Your turn's answer added is in the learner's files from then on.
    for (const step of lesson.steps.filter(isYourTurn)) {
      for (const code of hintCode(step)) termsOf(code, ownNames).defined.forEach(n => ownNames.add(n))
      answerLines.push(...hintLines(step))
    }
  }
  return problems
}
