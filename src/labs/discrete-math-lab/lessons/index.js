// The lessons in order, grouped into parts. A lesson's `id` is its progress key: never change one.
// Numbers are not stored: a part's number is its place in PARTS and a lesson's is its place in its part, so a
// lesson can be inserted anywhere. Text refers to other lessons by id, `[[#propositions]]` for a lesson's number
// and `[[#part:logic-foundations]]` for a part's, and every string is resolved here when the lab loads.
import { PART1 } from './part1.js'
import { PART2 } from './part2.js'
import { PART3 } from './part3.js'
import { PART4 } from './part4.js'
import { PART5 } from './part5.js'
import { PART6 } from './part6.js'
import { PART7 } from './part7.js'
import { PART8 } from './part8.js'
import { PROOFS } from './proofs.js'

const SOURCE = [PART1, PART2, PART3, PART4, PART5, PART6, PART7, PART8]
export const POOL = new Map(SOURCE.flatMap(p => p.lessons).map(l => [l.id, l]))

const NUMBERS = new Map()
SOURCE.forEach((part, p) => {
  NUMBERS.set(`part:${part.id}`, String(p + 1))
  part.lessons.forEach((lesson, i) => NUMBERS.set(lesson.id, `${p + 1}.${i + 1}`))
})

// Every placeholder that names no lesson or part, collected for lessons.test.js.
export const UNRESOLVED = new Set()

export function refs(text) {
  if (typeof text !== 'string' || !text.includes('[[#')) return text
  return text.replace(/\[\[#([\w:-]+)\]\]/g, (whole, id) => {
    if (NUMBERS.has(id)) return NUMBERS.get(id)
    UNRESOLVED.add(id)
    return whole
  })
}

function withProof(lesson) {
  const proof = PROOFS[lesson.id]
  if (!proof || lesson.blocks.some(b => b.proof)) return lesson
  const blocks = [...lesson.blocks]
  const at = blocks.at(-1)?.note ? blocks.length - 1 : blocks.length
  blocks.splice(at, 0, { proof })
  return { ...lesson, blocks }
}

// Resolves every string inside plain objects and arrays; functions (compute) are kept as they are.
function resolve(value) {
  if (typeof value === 'string') return refs(value)
  if (Array.isArray(value)) return value.map(resolve)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]))
  }
  return value
}

export const PARTS = SOURCE.map((source, p) => {
  const part = { id: source.id, number: String(p + 1), title: refs(source.title) }
  part.lessons = source.lessons.map((lesson, i) => ({
    ...resolve(withProof(lesson)),
    number: `${p + 1}.${i + 1}`,
    part,
  }))
  return part
})
export const LESSONS = PARTS.flatMap(part => part.lessons)
export const lessonById = id => LESSONS.find(l => l.id === id)
export { PROOFS }
