import { describe, it, expect } from 'vitest'
import { applyMove, solvedState, getMoveCycles } from './cubeMath.js'

const identity = Array.from({ length: 54 }, (_, i) => i)
const sequence = (state, moves) => moves.reduce(applyMove, state)
describe('cube geometry and teaching claims', () => {
  for (const [fi, face] of [...'URFDLB'].entries()) {
    it(`${face} is clockwise when looking at that face`, () => {
      const moved = applyMove(identity, face)
      expect(moved.slice(fi * 9, fi * 9 + 9)).toEqual([6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => fi * 9 + i))
      expect([...moved].sort((a, b) => a - b)).toEqual(identity)
      for (let i = 4; i < 54; i += 9) expect(moved[i]).toBe(i)
      expect(sequence(identity, [face, face, face, face])).toEqual(identity)
      expect(sequence(identity, [face, face + "'"])).toEqual(identity)
      expect(sequence(identity, [face + '2', face + '2'])).toEqual(identity)
      expect(getMoveCycles(face).map(c => c.length)).toEqual([4, 4, 4, 4, 4])
      expect(getMoveCycles(face + '2').map(c => c.length)).toEqual(Array(10).fill(2))
    })
  }
  it('verifies sequence orders and different order results', () => {
    const commutator = ['R', 'U', "R'", "U'"]
    let current = identity
    for (let n = 1; n <= 6; n++) {
      current = sequence(current, commutator)
      expect(current.every((v, i) => v === identity[i])).toBe(n === 6)
    }
    current = identity
    for (let n = 1; n <= 105; n++) {
      current = sequence(current, ['R', 'U'])
      expect(current.every((v, i) => v === identity[i])).toBe(n === 105)
    }
    expect(sequence(solvedState(), ['R', 'U'])).not.toEqual(sequence(solvedState(), ['U', 'R']))
  })
})
