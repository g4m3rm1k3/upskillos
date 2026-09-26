import { describe, expect, it } from 'vitest'
import { withBlocks } from './blocks.js'

describe('withBlocks', () => {
  it('attaches blocks by lesson id and rejects blocks for a lesson that does not exist', () => {
    expect(withBlocks([{ id: 'a' }, { id: 'b' }], { a: [{ p: 0 }] })).toEqual([{ id: 'a', blocks: [{ p: 0 }] }, { id: 'b' }])
    expect(() => withBlocks([{ id: 'a' }], { a: [], typo: [] })).toThrow(/typo, which is not a lesson id/)
  })
})
