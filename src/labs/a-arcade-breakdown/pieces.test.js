import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PIECES, ROOT, outline, pathTo } from './pieces.js'
import { CODE_LINES } from './codeLines.js'
import { linesFor, stepWorld, encode, qUpdate, sigmoid, a2cUpdate, makeNetwork } from './engine.js'
import { liveValues } from './live.js'
import { Session } from './session.js'
import { CHAPTERS } from './content.js'

const source = readFileSync(new URL('./engine.js', import.meta.url), 'utf8')
const defaults = { learning: true, epsilon: .2, alpha: .12, gamma: .99, representation: true, rewardEnabled: true, criticEnabled: true, entropyEnabled: true }

describe('the breakdown is one connected structure', () => {
  it('every part, chapter piece and code-note piece exists', () => {
    for (const [id, piece] of Object.entries(PIECES)) for (const part of piece.parts) expect(PIECES[part], `${id} → ${part}`).toBeTruthy()
    for (const chapter of CHAPTERS) expect(PIECES[chapter.piece], chapter.title).toBeTruthy()
    for (const id of Object.keys(CODE_LINES)) expect(PIECES[id], id).toBeTruthy()
  })
  it('every piece can be reached from the whole program, and appears once in the map', () => {
    const ids = outline().map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(Object.keys(PIECES).sort())
    for (const id of Object.keys(PIECES)) expect(pathTo(id)[0], id).toBe(ROOT)
  })
  it('every marked stretch of engine code belongs to a piece, and every note matches a line of it', () => {
    const marked = [...source.matchAll(/^\s*\/\/ piece: ([\w\s-]+)$/gm)].flatMap(m => m[1].split(/\s+/))
    for (const id of marked) expect(PIECES[id], id).toBeTruthy()
    for (const [id, notes] of Object.entries(CODE_LINES)) {
      const lines = linesFor(source, id).split('\n')
      expect(lines.length, id).toBeGreaterThan(0)
      for (const note of notes) expect(lines.some(l => l.includes(note.has)), `${id}: "${note.has}"`).toBe(true)
    }
  })
})

describe('the hand-worked examples are true of the engine', () => {
  it('CartPole physics from rest, pushing right', () => {
    const { physics, next } = stepWorld('cartpole', [0, 0, 0, 0], 1, 1)
    expect(physics.temp).toBeCloseTo(9.0909, 4)
    expect(physics.angularAcceleration).toBeCloseTo(-14.634, 3)
    expect(physics.acceleration).toBeCloseTo(9.7561, 4)
    expect(next[1]).toBeCloseTo(.1951, 4); expect(next[3]).toBeCloseTo(-.2927, 4)
  })
  it('bins (1, 0, 4, 5) are row 165, and angle 0.01 is in bin 4', () => {
    expect(encode('cartpole', [.1, -.1, .01, .3])).toEqual({ bins: [1, 0, 4, 5], index: 165 })
  })
  it('the Q-learning update: 2 → 3.1', () => {
    const r = qUpdate([2, 5], 0, 1, [4, 6], false, .25, .9)
    expect(r.target).toBeCloseTo(6.4); expect(r.error).toBeCloseTo(4.4); expect(r.after).toBeCloseTo(3.1)
  })
  it('sigmoid values', () => {
    expect(sigmoid(0)).toBe(.5); expect(sigmoid(1)).toBeCloseTo(.731, 3); expect(sigmoid(-1)).toBeCloseTo(.269, 3)
  })
  it('the n-step targets 4.6 and 5.14, and the advantage 1.14', () => {
    // A critic whose only non-zero weight is the constant feature predicts 4 everywhere.
    const network = makeNetwork(); network.critic[0] = 4
    const step = { state: [0, 0, 0, 0], next: [0, 0, 0, 0], action: 1, reward: 1, terminated: false, truncated: false }
    const { records } = a2cUpdate(network, [[step, step]], { gamma: .9, actorRate: 0, criticRate: 0 })
    expect(records.map(r => r.target)).toEqual([expect.closeTo(5.14, 6), expect.closeTo(4.6, 6)])
    expect(records[0].advantage).toBeCloseTo(1.14, 6)
  })
  it('the policy-gradient slope is a − p', () => {
    const step = { state: [0, 0, 0, 0], next: [0, 0, 0, 0], action: 1, reward: 1, terminated: true, truncated: false }
    const { records } = a2cUpdate(makeNetwork(), [[step]], { actorRate: 0, criticRate: 0 })
    expect(records[0].logProbGradient).toBe(.5)
  })
  it('the entropy values', () => {
    const H = p => -p * Math.log(p) - (1 - p) * Math.log(1 - p)
    expect(H(.5)).toBeCloseTo(.693, 3); expect(H(.99)).toBeCloseTo(.056, 3)
  })
})

describe('every symbol, code note and formula with live numbers can be shown', () => {
  const run = (world, algorithm, operations) => {
    const session = new Session(world, algorithm, true)
    for (let i = 0; i < operations; i++) session.advance(defaults)
    return liveValues(session, defaults)
  }
  for (const [world, algorithm, operations] of [['cartpole', 'q', 0], ['cartpole', 'q', 5], ['maze', 'q', 5], ['cartpole', 'a2c', 0], ['cartpole', 'a2c', 25]]) {
    it(`${world} ${algorithm} after ${operations} operations`, () => {
      const L = run(world, algorithm, operations)
      for (const [id, piece] of Object.entries(PIECES)) {
        const out = piece.plug?.(L)
        if (out != null) expect(out, id).not.toMatch(/undefined|NaN/)
        for (const s of piece.symbols) { const v = s.now?.(L); if (v != null) expect(v, `${id} ${s.tex}`).not.toMatch(/undefined|NaN/) }
      }
      for (const [id, notes] of Object.entries(CODE_LINES)) for (const note of notes) {
        const v = note.now?.(L); if (v != null) expect(v, `${id}: ${note.has}`).not.toMatch(/undefined|NaN/)
      }
      if (algorithm === 'a2c' && operations === 25) {
        expect(L.rec).toBeTruthy()
        expect(PIECES.advantage.plug(L)).toContain(L.rec.advantage.toFixed(3))
      }
      if (algorithm === 'q' && operations === 5) expect(PIECES['td-update'].plug(L)).toContain(L.update.after.toFixed(3))
    })
  }
})
