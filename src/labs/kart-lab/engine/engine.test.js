import { describe, it, expect } from 'vitest'
import { ACTIONS, LENGTH, STATES, observe, reset, step, blockedMask } from './game.js'
import { DEFAULTS, createModel, update, train, evaluate, pack, unpack, choose } from './learning.js'
import baselines from '../baselines.json'

describe('the race environment', () => {
  it('encodes every observation without collisions', () => {
    const keys = new Set()
    for (let p = 0; p < LENGTH; p++) for (let lane = 0; lane < 3; lane++) for (let speed = 0; speed < 3; speed++) for (let mask = 0; mask < 8; mask++) {
      const traffic = [0, 1, 2].filter(i => mask & (1 << i)).map(lane => ({ p: (p + 1) % LENGTH, lane }))
      const o = observe({ p, lane, speed }, traffic)
      expect(o.mask).toBe(mask); keys.add(o.key)
    }
    expect(keys.size).toBe(STATES)
    expect(Math.min(...keys)).toBe(0); expect(Math.max(...keys)).toBe(STATES - 1)
  })
  it('applies the barrier, slowdown and reward from the visible lesson', () => {
    const before = reset(1, { p: 12, lane: 1, speed: 1 })
    const hit = step(before, 3)
    expect(hit.p).toBe(13); expect(hit.speed).toBe(0); expect(hit.crashes).toBe(1)
    expect(hit.last.reward).toBeCloseTo(-6.05)
    const avoid = step(step(before, 0), 3)
    expect(avoid.crashes).toBe(0); expect(avoid.p).toBe(17)
    expect(before.p).toBe(12)
  })
  it('detects traffic across the finish line and bounds lane changes', () => {
    const state = reset(1, { p: 143, lane: 0, speed: 2 })
    expect(blockedMask(state, [{ p: 1, lane: 0 }])).toBe(1)
    expect(step(state, 0, { traffic: [{ p: 1, lane: 0 }], laps: 3 }).last.hit).toBe(true)
    expect(step(state, 0).lane).toBe(0)
  })
  it('finishes exactly at the lap target and never steps a terminal car', () => {
    const finish = step(reset(1, { p: 143, lane: 1, speed: 2 }), 1)
    expect(finish.finished).toBe(true); expect(finish.p).toBe(144); expect(finish.last.parts.finish).toBe(10)
    expect(step(finish, 3)).toBe(finish)
    expect(step(reset(1, { p: 143, speed: 2 }), 1, { laps: 3 }).done).toBe(false)
  })
  it('ends repeated collisions or a time limit as explicit failures', () => {
    expect(step(reset(1, { p: 12, lane: 1, speed: 1, crashes: 7 }), 3).done).toBe(true)
    const cap = step(reset(1, { ticks: 209 }), 1)
    expect(cap.done).toBe(true); expect(cap.finished).toBe(false)
    expect(() => step(reset(), 9)).toThrow()
  })
})

describe('learning from real transitions', () => {
  const transition = { key: 0, action: 1, reward: -1, nextKey: 1, done: false, nextAction: 0 }
  it.each([['q', 2.12], ['sarsa', 1.58], ['double', 1.58]])('%s forms its own target', (algorithm, expected) => {
    const m = createModel({ ...DEFAULTS, algorithm, alpha: 0.2, gamma: 0.9 })
    m.q[1] = 2; m.q.set([1, 4, 2, 3, 0], 5)
    if (m.b) m.b.set([3, 1, 2, 2, 0], 5)
    expect(update(m, transition, () => 0).after).toBeCloseTo(expected)
  })
  it('does not bootstrap at terminal states', () => {
    const m = createModel({ ...DEFAULTS, alpha: 0.2 }); m.q[1] = 2; m.q[6] = 100
    const changed = update(m, { ...transition, done: true }, () => 0)
    expect(changed.bootstrap).toBe(0); expect(changed.after).toBeCloseTo(1.4)
  })
  it('updates either Double Q table, selecting with the updating table', () => {
    const m = createModel({ ...DEFAULTS, algorithm: 'double', alpha: 1, gamma: 0.5 })
    m.q.set([2, 7, 4, 3, 1], 5); m.b.set([9, 1, 1, 1, 1], 5)
    update(m, transition, () => 1)
    expect(m.b[1]).toBe(0); expect(m.q[1]).toBe(0) // -1 + .5 * A(next, Left)=0
  })
  it('reproduces training from a seed and improves held-out performance', () => {
    const config = { ...DEFAULTS, episodes: 2500, seed: 42 }
    const { model } = train(config), repeat = train(config).model
    expect(model.q).toEqual(repeat.q)
    const before = evaluate(createModel(config)), after = evaluate(model)
    expect(after.finishRate).toBeGreaterThanOrEqual(0.9)
    expect(after.crashes).toBeLessThan(before.crashes)
    expect(after.reward).toBeGreaterThan(before.reward + 10)
  })
  it('keeps evaluation frozen and checkpoints round-trip their choices', () => {
    for (const driver of baselines) {
      const m = unpack(driver.checkpoint), before = m.q.slice(), roundtrip = unpack(pack(m))
      evaluate(m)
      expect(m.q).toEqual(before)
      for (let key = 0; key < STATES; key += 7) expect(choose(roundtrip, key, 0, () => 1)).toBe(choose(m, key, 0, () => 1))
      expect(m.episodes).toBe(6000)
    }
  })
  it('rejects incompatible and corrupt checkpoint tables', () => {
    expect(() => unpack({ version: 'other' })).toThrow()
    const data = pack(createModel(DEFAULTS)); data.q = [[STATES * ACTIONS.length, 1]]
    expect(() => unpack(data)).toThrow()
  })
})
