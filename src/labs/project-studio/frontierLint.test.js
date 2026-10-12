// The Frontier teaching rules (frontierLint.js): each rule on small made-up lessons, then the real series.
//
// The series test is a ratchet. frontierLint.baseline.json lists the problems found in lessons written
// before the lint existed. Any problem not on that list fails (so every new lesson keeps the rules),
// and so does a listed problem that has been fixed (so the list only ever shrinks: delete the entry).
import { describe, expect, it } from 'vitest'
import { lintSeries, termsOf, typedLines } from './frontierLint.js'
import { frontierLessons } from '../../../scripts/lint-frontier-lessons.mjs'
import baseline from './frontierLint.baseline.json'

const fence = (lang, body, info = '') => '```' + lang + (info ? ' ' + info : '') + '\n' + body + '\n```'
const predict = fence('predict', 'question: What does it print?\nchoice: 1\nchoice: 2\nanswer: 2\nexplain: It adds one.')
const check = fence('check', 'file x.py')
const words = n => Array.from({ length: n }, (_, i) => `word${i}`).join(' ')
const lesson = (...steps) => `---\ntitle: T\n---\n\nIntro.\n\n${steps.join('\n\n')}\n`
const step = (title, before, code, after, extra = '') => `## ${title}\n\n${before}\n\n${fence('python', code, 'file=x.py')}\n\n${after}\n\n${extra}\n${check}`
const rules = text => lintSeries([{ id: 't/1', text }]).filter(p => p.level === 'error').map(p => p.rule)

describe('the lint, rule by rule', () => {
  const ok = step('Start', words(25), 'total = 0\nfor n in range(3):\n    total = total + n\nprint(total)', words(20), predict)
  it('passes a lesson that keeps the rules', () => { expect(rules(lesson(ok))).toEqual([]) })
  it('counts only the lines that are new since the file\'s last version', () => {
    expect(typedLines(['a = 1', 'b = 2'], ['a = 1', '', '# note', 'b = 2', 'c = 3'])).toEqual(['c = 3'])
  })
  it('size: more than 15 new lines in one step', () => {
    const long = Array.from({ length: 16 }, (_, i) => `v${i} = ${i}`).join('\n')
    expect(rules(lesson(step('Long', words(25), long, words(20), predict)))).toContain('size')
  })
  it('explain: code with too little before or after it', () => {
    const code = 'a = 1\nb = 2\nc = a + b'
    expect(rules(lesson(step('Bare', 'Type this:', code, words(20), predict)))).toContain('explain')
    expect(rules(lesson(step('Bare', words(25), code, 'Done.', predict)))).toContain('explain')
  })
  it('taught: a library call or feature nobody named, and not one the prose named', () => {
    const code = 'import math\nx = math.sqrt(2)\nprint(x)'
    expect(rules(lesson(step('Sqrt', words(25), code, words(20), predict)))).toContain('taught')
    expect(rules(lesson(step('Sqrt', `${words(25)} The module \`math\` has \`sqrt\`.`, code, words(20), predict)))).toEqual([])
    const lam = 'items = [3, 1]\nkey = lambda x: -x\nprint(sorted(items, key=key))'
    expect(rules(lesson(step('Lam', words(25), lam, words(20), predict)))).toContain('taught')
    expect(rules(lesson(step('Lam', `${words(25)} A \`lambda\` is a function without a name.`, lam, words(20), predict)))).toEqual([])
  })
  it('taught: the learner\'s own functions and variables need no teaching', () => {
    const { terms } = termsOf('def double(n):\n    return n * 2\n\nresult = double(4)\nprint(result)')
    expect([...terms.keys()]).toEqual([])
  })
  it('your-turn: shows no code, has all three hint rungs and a check; its answer uses only what was taught', () => {
    const hints = fence('hints', 'nudge: Think.\nconcept: A list comprehension.\nanswer: Like this:\n~~~python\nsquares = [n * n for n in range(4)]\n~~~')
    const turn = (extra = '') => `## Your turn: squares\n\nMake a list of squares.\n\n${hints}\n\n${check}${extra}`
    expect(rules(lesson(ok, turn()))).toContain('taught')     // the comprehension is only in a hint
    const taught = step('Comprehensions', `${words(25)} A list comprehension builds a list in one line.`, 'evens = [n for n in range(6) if n % 2 == 0]\nprint(evens)\nprint(len(evens))', words(20))
    expect(rules(lesson(ok, taught, turn()))).toEqual([])
    expect(rules(lesson(ok, `## Your turn: bare\n\nDo it.\n\n${check}`))).toContain('your-turn')
  })
  it('predict: a lesson without one', () => {
    expect(rules(lesson(step('Start', words(25), 'a = 1\nb = 2\nprint(a + b)', words(20))))).toContain('predict')
  })
})

describe('the Frontier lessons keep the teaching rules', () => {
  const key = p => JSON.stringify([p.lesson, p.step, p.rule, p.message])
  const found = lintSeries(frontierLessons()).filter(p => p.level === 'error')
  it('no problem beyond the known ones in frontierLint.baseline.json', () => {
    const known = new Set(baseline.map(key))
    expect(found.filter(p => !known.has(key(p))).map(p => `${p.lesson} · ${p.step ?? '(lesson)'} · [${p.rule}] ${p.message}`)).toEqual([])
  })
  it('every known problem is still there (delete fixed ones from the baseline)', () => {
    const now = new Set(found.map(key))
    expect(baseline.filter(p => !now.has(key(p))).map(p => `${p.lesson} · [${p.rule}] ${p.message}`)).toEqual([])
  })
})
