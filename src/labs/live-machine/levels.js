// levels.js
// Every JSON file in ./levels is a level. Nothing else needs registering: drop a file in,
// and it appears on the star map, sorted by season then order. See levels/README.md.
import { WORLDS } from './worlds/index.js'

const FILES = import.meta.glob('./levels/*.json', { eager: true })

const IDENT = /^[A-Za-z_$][\w$]*$/

const lines = v => (Array.isArray(v) ? v.join('\n') : String(v ?? ''))
const paras = v => (Array.isArray(v) ? v : v ? [v] : [])

// Problems with one level, as readable strings. An empty list means the level is usable.
export function validateLevel(raw, file = '') {
  const errors = []
  const need = (cond, msg) => { if (!cond) errors.push(`${file || raw?.id || 'level'}: ${msg}`) }
  need(raw && typeof raw === 'object', 'not an object')
  if (!raw || typeof raw !== 'object') return errors
  need(typeof raw.id === 'string' && raw.id.length > 0, 'needs an "id" (a progress key: never change it once published)')
  need(typeof raw.title === 'string', 'needs a "title"')
  need(Number.isFinite(raw.season), 'needs a numeric "season"')
  need(Number.isFinite(raw.order), 'needs a numeric "order"')
  need(WORLDS[raw.world] != null, `unknown world "${raw.world}" (known: ${Object.keys(WORLDS).join(', ')})`)
  need(typeof raw.entry === 'string' && IDENT.test(raw.entry), '"entry" must be a function name')
  need(['javascript', 'typescript'].includes(raw.language ?? 'javascript'), '"language" must be javascript or typescript')
  need(raw.starter != null, 'needs "starter" code')
  need(Array.isArray(raw.steps) && raw.steps.length > 0, 'needs at least one step')
  const ids = new Set()
  for (const [i, step] of (raw.steps ?? []).entries()) {
    const at = `step ${i + 1}`
    need(typeof step.id === 'string' && !ids.has(step.id), `${at} needs a unique "id"`)
    ids.add(step.id)
    need(typeof step.title === 'string', `${at} needs a "title"`)
    if (step.predict) {
      const p = step.predict
      need(Array.isArray(p.options) && p.options.length >= 2, `${at} predict needs 2+ options`)
      need(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < (p.options?.length ?? 0), `${at} predict "answer" must index an option`)
    }
    need(Array.isArray(step.goal?.cases) && step.goal.cases.length > 0, `${at} needs goal.cases`)
    for (const c of step.goal?.cases ?? []) need(Array.isArray(c.args) && 'expect' in c, `${at} each case needs "args" (array) and "expect"`)
  }
  need(Array.isArray(raw.check?.cases) && raw.check.cases.length > 0, 'needs check.cases (the hidden ship check)')
  for (const c of raw.check?.cases ?? []) need(Array.isArray(c.args) && 'expect' in c, 'each check case needs "args" (array) and "expect"')
  need(raw.solution != null, 'needs a "solution" (used by the tests, never shown)')
  return errors
}

export function normalizeLevel(raw) {
  return {
    ...raw,
    language: raw.language ?? 'javascript',
    briefing: paras(raw.briefing),
    starter: lines(raw.starter),
    solution: lines(raw.solution),
    concepts: raw.concepts ?? [],
    deeper: raw.deeper ?? [],
    steps: raw.steps.map(s => ({
      ...s,
      text: paras(s.text),
      code: s.code ? lines(s.code) : '',
      hints: s.hints ?? [],
    })),
  }
}

export function loadLevels(files = FILES) {
  const levels = []
  const problems = []
  for (const [path, mod] of Object.entries(files)) {
    const raw = mod.default ?? mod
    const errors = validateLevel(raw, path.split('/').pop())
    if (errors.length) { problems.push(...errors); continue }
    levels.push(normalizeLevel(raw))
  }
  levels.sort((a, b) => a.season - b.season || a.order - b.order)
  return { levels, problems }
}

export const { levels: LEVELS, problems: LEVEL_PROBLEMS } = loadLevels()
