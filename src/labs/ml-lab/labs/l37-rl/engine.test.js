import { describe, it, expect } from 'vitest'
import { qLearning, valueIteration, evaluatePolicy, fromQ, fromTable, edgeWalker } from './engine.js'

describe('lab 37 reinforcement learning', () => {
  it('value iteration avoids the ditch under slip; Q-learning approaches it; the edge walker falls', () => {
    const opts = { slip: 0.1 }
    const vi = evaluatePolicy(fromTable(valueIteration(opts).policy), opts), q = evaluatePolicy(fromQ(qLearning(opts).Q), opts), edge = evaluatePolicy(edgeWalker, opts)
    expect(vi.goal).toBeGreaterThan(0.93)
    expect(q.goal).toBeGreaterThan(0.9)
    expect(edge.ditch).toBeGreaterThan(0.08)
    expect(vi.steps).toBeGreaterThan(edge.steps)
    expect(evaluatePolicy(edgeWalker).goal).toBe(1)
  })
  it('the checkpoint bonus is hacked: optimized reward up, task outcome down', () => {
    const task = evaluatePolicy(fromQ(qLearning({ slip: 0 }).Q)), hacked = evaluatePolicy(fromQ(qLearning({ slip: 0, design: 'checkpoint' }).Q), { design: 'checkpoint' })
    expect(hacked.ret).toBeGreaterThan(task.ret)
    expect(hacked.goal).toBeLessThan(0.1)
    expect(hacked.task).toBeLessThan(0)
  })
})

describe('lab 37 policy evaluation', () => {
  it('ε-greedy arrays, the Bellman expectation equation and V*', async () => {
    const { epsilonGreedyProbs, policyEvaluation, valueIteration, edgeWalker, startState } = await import('./engine.js')
    expect(epsilonGreedyProbs(0, 0.1)).toEqual([0.925, 0.025, 0.025, 0.025])
    const pi = eps => s => epsilonGreedyProbs(edgeWalker(s), eps), s0 = startState()
    const det = policyEvaluation(pi(0)).V[s0]
    expect(det).toBeCloseTo(-0.1 * (1 - 0.95 ** 7) / 0.05 + 10 * 0.95 ** 7, 8)
    // Exploration noise in the policy and slip in the world are the same random move here.
    expect(policyEvaluation(pi(0.1)).V[s0]).toBeCloseTo(policyEvaluation(pi(0), { slip: 0.1 }).V[s0], 8)
    expect(valueIteration({ slip: 0.1 }).V[s0]).toBeGreaterThan(policyEvaluation(pi(0), { slip: 0.1 }).V[s0])
  })
})
