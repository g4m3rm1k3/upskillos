import { describe, it, expect } from 'vitest'
import { random, resetWorld, stepWorld, encode, qUpdate, actor, a2cUpdate, makeNetwork, evaluate, value } from './engine.js'
import { Session } from './session.js'
import snapshots from './snapshots.json'
const options = { learning: true, epsilon: .2, alpha: .25, gamma: .9, representation: true, rewardEnabled: true }
describe('A-Arcade environment and Q-learning contracts', () => {
  it('uses repeatable resets and CartPole dynamics with correct symmetry', () => {
    expect(resetWorld('cartpole', random(7))).toEqual(resetWorld('cartpole', random(7)))
    const left = stepWorld('cartpole', [0,0,0,0], 0, 1), right = stepWorld('cartpole', [0,0,0,0], 1, 1)
    expect(left.next[1]).toBeCloseTo(-right.next[1]); expect(left.next[3]).toBeCloseTo(-right.next[3])
    expect(right.next[1]).toBeCloseTo(.1951219512); expect(right.next[3]).toBeCloseTo(-.2926829268)
    expect(stepWorld('cartpole', [0,0,.22,0], 0, 1).terminated).toBe(true)
    expect(stepWorld('cartpole', [0,0,0,0], 0, 500)).toMatchObject({ terminated: false, truncated: true, reward: 1 })
  })
  it('respects maze walls and goal rewards', () => {
    expect(stepWorld('maze', [1,0], 1, 1).next).toEqual([1,0])
    expect(stepWorld('maze', [0,0], 0, 1).next).toEqual([0,0])
    expect(stepWorld('maze', [3,4], 2, 8)).toMatchObject({ next: [4,4], reward: 1, terminated: true })
  })
  it('keeps every bin address bounded, including observations past failure thresholds', () => {
    for (const state of [[-1e5,-1e5,-1e5,-1e5],[0,0,0,0],[1e5,1e5,1e5,1e5]]) {
      const { index } = encode('cartpole', state)
      expect(index).toBeGreaterThanOrEqual(0); expect(index).toBeLessThan(256)
    }
  })
  it('matches the worked numerical update and changes only one entry', () => {
    const row = [2,5]
    const result = qUpdate(row, 0, 1, [4,6], false, .25, .9)
    expect(result.target).toBeCloseTo(6.4); expect(result.after).toBeCloseTo(3.1); expect(row[1]).toBe(5)
    expect(qUpdate([2,5], 0, 1, [4,6], true, .25, .9).target).toBe(1)
  })
  it('opens with learned policies that survive held-out CartPole starts', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => 901+i)
    const q = evaluate('cartpole', s => { const row = snapshots.cartpole.table[encode('cartpole',s).index]; return row.indexOf(Math.max(...row)) }, seeds)
    const ac = evaluate('cartpole', s => actor(s,snapshots.a2c.network.actor).probabilities[1] >= .5 ? 1 : 0, seeds)
    expect(q.reduce((sum,r) => sum+r.steps,0)/20).toBeGreaterThan(300)
    expect(ac.reduce((sum,r) => sum+r.steps,0)/20).toBeGreaterThan(300)
    const maze = evaluate('maze', s => { const row = snapshots.maze.table[encode('maze',s).index]; return row.indexOf(Math.max(...row)) })
    expect(maze.every(r => r.success && r.steps === 8)).toBe(true)
  })
})
describe('A2C return boundaries and learning', () => {
  it('builds n-step returns without leaking across episode endings', () => {
    const network = makeNetwork(); network.critic[0] = 4
    const t = { state: [0,0,0,0], next: [0,0,0,0], action: 1, reward: 1, terminated: false, truncated: false }
    const normal = a2cUpdate(structuredClone(network), [[t,t]], { gamma: .9, actorRate: 0, criticRate: 0 })
    expect(normal.records[0].target).toBeCloseTo(5.14)
    expect(normal.records[1].target).toBeCloseTo(4.6)
    const terminal = a2cUpdate(structuredClone(network), [[{ ...t, terminated: true }, { ...t, reward: 100 }]], { gamma: .9 })
    expect(terminal.records[0].target).toBe(1)
    const timeout = a2cUpdate(structuredClone(network), [[{ ...t, truncated: true }, { ...t, reward: 100 }]], { gamma: .9 })
    expect(timeout.records[0].target).toBeCloseTo(4.6)
  })
  it('moves actor probability and critic value in the direction of a positive terminal advantage', () => {
    const network = makeNetwork(), s = [.1,.1,.02,.1], before = actor(s, network.actor).probabilities[1]
    const batch = a2cUpdate(network, [[{ state: s, next: s, action: 1, reward: 1, terminated: true }]])
    expect(actor(s, network.actor).probabilities[1]).toBeGreaterThan(before)
    expect(value(s,network.critic)).toBeGreaterThan(0)
    expect(batch.records[0].advantage).toBe(1)
    expect([...network.actor,...network.critic].every(Number.isFinite)).toBe(true)
  })
  it('removes critic bootstrap and baseline while freezing critic parameters', () => {
    const network = makeNetwork(); network.critic[0] = 10
    const before = [...network.critic], s = [0,0,0,0]
    const batch = a2cUpdate(network, [[{ state: s, next: s, action: 1, reward: 1, terminated: false }]], { criticEnabled: false })
    expect(batch.records[0]).toMatchObject({ baseline: 0, target: 1, advantage: 1 })
    expect(network.critic).toEqual(before)
  })
})
describe('Five-phase execution and inspection', () => {
  it('previews frozen updates without changing the table and records stable replay', () => {
    const session = new Session('cartpole','q',false), frozen = { ...options, learning: false }
    const before = structuredClone(session.table)
    for (let i = 0; i < 5; i++) session.advance(frozen)
    expect(session.table).toEqual(before); expect(session.trace.update.after).toBe(.25)
    const recording = structuredClone(session.history[0])
    for (let i = 0; i < 10; i++) session.advance(options)
    expect(session.history[0]).toEqual(recording)
  })
  it('restores a working learner from removed components', () => {
    const session = new Session('cartpole','q',false)
    for (let i = 0; i < 5; i++) session.advance({ ...options, representation: false, rewardEnabled: false })
    expect(session.trace.encoding.index).toBe(0); expect(session.trace.reward).toBe(0)
    expect(session.table.flat().every(v => v === 0)).toBe(true)
    for (let i = 0; i < 5; i++) session.advance(options)
    expect(session.trace.reward).toBe(1); expect(session.trace.update.after).toBe(.25)
  })
  it('collects 8 by 5 transitions before one A2C update', () => {
    const session = new Session('cartpole','a2c',false)
    for (let i = 0; i < 24; i++) session.advance(options)
    expect(session.updates).toBe(0)
    session.advance(options)
    expect(session.updates).toBe(1); expect(session.batch.count).toBe(40); expect(session.rollout).toHaveLength(0)
  })
})
