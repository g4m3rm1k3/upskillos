import { describe, expect, it } from 'vitest'
import { checkKey, countSolved, legacyIndex, upgradeProgress, upgradeSaved } from './progress.js'

// A lesson that had [md, predict A, choice B, write C] and then got two blocks added.
const lesson = {
  id: 'l',
  blocks: [
    { md: 'intro' },
    { note: 'remember', kind: 'recall', added: true },
    { predict: { prompt: 'A' } },
    { h: 'new section', added: true },
    { choice: { prompt: 'B' } },
    { write: { prompt: 'C', fn: 'c' } },
  ],
}

describe('saved progress', () => {
  it('keys a block by its prompt, a derivation by its title', () => {
    expect(checkKey({ predict: { prompt: 'A' } })).toBe('A')
    expect(checkKey({ derive: { title: 'T', steps: [] } })).toBe('T')
    expect(checkKey({ md: 'x' })).toBeUndefined()
  })

  it('finds where a block sat before blocks were added', () => {
    expect([2, 4, 5].map(k => legacyIndex(lesson, k))).toEqual([1, 2, 3])
  })

  it('turns old positions into the right keys, ignoring added blocks', () => {
    const old = { solved: [1, 2], code: { 3: 'def c(): pass' }, derive: { 2: { solved: [0] } } }
    expect(upgradeSaved(lesson, old)).toEqual({ solved: ['A', 'B'], code: { C: 'def c(): pass' }, derive: { B: { solved: [0] } } })
  })

  it('leaves keys that are already prompts alone, and drops positions that pointed at nothing', () => {
    expect(upgradeSaved(lesson, { solved: ['A', 0, 9] })).toEqual({ solved: ['A'] })
  })

  it('upgrades every lesson in a progress object, and counts answered checks', () => {
    const p = upgradeProgress({ done: { l: true }, lessons: { l: { solved: [1] } } }, id => (id === 'l' ? lesson : undefined))
    expect(p).toEqual({ done: { l: true }, lessons: { l: { solved: ['A'] } } })
    expect(countSolved(lesson, p.lessons.l)).toEqual({ checks: 2, solved: 1 })
  })
})
