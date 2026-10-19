// The home page's search (matchItem): names win over category words.
import { describe, expect, it } from 'vitest'
import { matchItem } from '../data/catalogSearch.js'
import { LABS } from '../labs/labRegistryLoader.js'
import { ALL_ITEMS } from '../data/topicGroups.js'

const studio = { label: 'Game Studio', desc: 'A browser game engine in the spirit of Godot', tags: ['Game Dev'] }
const builder = { kind: 'builder' }

describe('matchItem', () => {
  it('finds an item by its name even when the name contains a category word ("game studio" is a builder)', () => {
    for (const q of ['game studio', 'Game Studio', 'game st', 'studio']) expect(matchItem(studio, q, builder), q).toBe(true)
  })
  it('still uses category words to narrow other searches: "games about physics" keeps games only', () => {
    expect(matchItem({ label: 'Rocket Lab', tags: ['physics'] }, 'games about physics', { kind: 'lab' })).toBe(false)
    expect(matchItem({ label: 'Orbit Run', tags: ['physics'] }, 'games about physics', { kind: 'game' })).toBe(true)
  })
  it('a bare category word lists that category', () => {
    expect(matchItem({ label: 'Orbit Run' }, 'games', { kind: 'game' })).toBe(true)
    expect(matchItem({ label: 'Rocket Lab' }, 'games', { kind: 'lab' })).toBe(false)
  })

  it('keeps every discovered lab searchable throughout typing its name', () => {
    const indexedLabs = new Set(ALL_ITEMS.filter(item => item.kind === 'lab').map(item => item.key))
    for (const lab of LABS) {
      expect(indexedLabs.has(lab.key), lab.key).toBe(true)
      const kinds = { kind: 'lab', badgeKind: lab.kind }
      for (let length = 1; length <= lab.label.length; length++) {
        const query = lab.label.slice(0, length)
        expect(matchItem(lab, query, kinds), `${lab.key}: ${query}`).toBe(true)
      }
      expect(matchItem(lab, `  ${lab.label.toUpperCase()}  `, kinds), lab.key).toBe(true)
      expect(matchItem(lab, lab.key, kinds), lab.key).toBe(true)
    }
  })

  it.each([
    ['ml-foundations', 'machine learning foundations'],
    ['linear-algebra-lab', 'linear algebra lab'],
    ['dynamic-programming', 'dynamic programming lab'],
  ])('finds %s by the requested name', (key, query) => {
    const lab = LABS.find(item => item.key === key)
    expect(lab).toBeTruthy()
    expect(matchItem(lab, query, { kind: 'lab', badgeKind: lab.kind })).toBe(true)
  })

  it('searches descriptions, subjects, tags and readable registry keys', () => {
    const lab = {
      label: 'Example Lab', key: 'future-learning-workspace',
      desc: 'Inspect gradient descent', subject: 'Computer Science', tags: ['Neural networks'],
    }
    for (const query of ['gradient descent', 'computer science', 'neural networks', 'future learning work', 'FUTURE–LEARNING']) {
      expect(matchItem(lab, query, { kind: 'lab' }), query).toBe(true)
    }
    expect(matchItem(lab, 'astronomy', { kind: 'lab' })).toBe(false)
    expect(matchItem(lab, '   ', { kind: 'lab' })).toBe(true)
  })
})
