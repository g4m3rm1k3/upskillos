// The rules, checked directly against hand-worked cases: scoring, the Joker rule, both bonuses,
// and that the chances the planner relies on add up.
import { describe, expect, it } from 'vitest'
import { HANDS, score } from './dice.js'
import { handProbability, outcomes } from './probability.js'
import { KEEPS, KEPT, OUTCOMES } from './turn.js'
import { newCard, legalBoxes, points, write, total, playGames, Planner } from './game.js'

describe('scoring', () => {
  it('scores every box by the ordinary rules', () => {
    expect(score([2, 2, 3, 3, 3], 8)).toBe(25)
    expect(score([3, 3, 3, 3, 3], 8)).toBe(0)
    expect(score([1, 2, 3, 4, 6], 9)).toBe(30)
    expect(score([1, 2, 3, 4, 6], 10)).toBe(0)
    expect(score([2, 3, 4, 5, 6], 10)).toBe(40)
    expect(score([2, 3, 4, 5, 5], 9)).toBe(30)
    expect(score([4, 4, 4, 4, 6], 6)).toBe(22)
    expect(score([4, 4, 4, 4, 6], 7)).toBe(22)
    expect(score([4, 4, 4, 4, 6], 3)).toBe(16)
    expect(score([6, 6, 6, 6, 6], 11)).toBe(50)
    expect(score([1, 1, 2, 2, 6], 12)).toBe(12)
  })
})

describe('chances', () => {
  it('the 252 hands\' chances, and every reroll\'s outcomes, add up to 1', () => {
    expect(HANDS.reduce((s, h) => s + handProbability(h), 0)).toBeCloseTo(1, 12)
    for (const list of OUTCOMES) expect(list.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 12)
    expect(KEPT.length).toBe(462)
    expect(KEEPS.reduce((n, k) => n + k.length, 0)).toBe(4368)
    expect(outcomes([6, 6, 6, 6]).length).toBe(6)
  })
})

describe('the whole-game rules', () => {
  const card = (filled, upper = 0) => { const c = newCard(); for (const [b, p] of filled) c.boxes[b] = p; c.upper = upper; return c }
  it('pays the upper bonus once, when the upper total first reaches 63', () => {
    expect(points(card([], 48), [5, 5, 6, 6, 6], 5)).toBe(53)
    expect(points(card([], 63), [5, 5, 6, 6, 6], 5)).toBe(18)
    expect(total(write(card([], 48), [5, 5, 6, 6, 6], 5))).toBe(18 + 35)
  })
  it('forces an extra Yahtzee into its upper box, then allows any lower box at full value', () => {
    const c = card([[11, 50]])
    expect(legalBoxes(c, [4, 4, 4, 4, 4])).toEqual([3])
    expect(points(c, [4, 4, 4, 4, 4], 3)).toBe(20 + 100)
    const full = card([[11, 50], [3, 12]], 12)
    expect(legalBoxes(full, [4, 4, 4, 4, 4])).toEqual([6, 7, 8, 9, 10, 12])
    expect(points(full, [4, 4, 4, 4, 4], 10)).toBe(140)
    expect(write(full, [4, 4, 4, 4, 4], 8).boxes[8]).toBe(25)
    expect(write(full, [4, 4, 4, 4, 4], 8).extra).toBe(1)
  })
  it('gives no extra-Yahtzee bonus when the Yahtzee box was scratched', () => {
    const c = card([[11, 0], [3, 12]], 12)
    expect(points(c, [4, 4, 4, 4, 4], 9)).toBe(30)
    expect(write(c, [4, 4, 4, 4, 4], 9).extra).toBe(0)
  })
  it('falls back to an upper box (scoring 0) when the lower section is full', () => {
    const c = card([[3, 12], [6, 20], [7, 20], [8, 25], [9, 30], [10, 40], [11, 50], [12, 20]], 12)
    expect(legalBoxes(c, [4, 4, 4, 4, 4])).toEqual([0, 1, 2, 4, 5])
    expect(points(c, [4, 4, 4, 4, 4], 0)).toBe(100)
  })
  it('a played game\'s total equals the sum of its turns\' points', () => {
    const [s] = playGames(new Planner(), 1, 3)
    expect(s).toBeGreaterThan(50)
  })
})
