// python/policies.py in JavaScript: policies as tables, policy[s][a] = pi(a|s).
export const uniformPolicy = (nStates, nActions = 4) => Array.from({ length: nStates }, () => new Array(nActions).fill(1 / nActions))

export function deterministicPolicy(actions, nActions = 4) {
  return actions.map(a => Array.from({ length: nActions }, (_, b) => b === a ? 1 : 0))
}

export function epsilonGreedyPolicy(Q, epsilon) {
  return Q.map(row => {
    const n = row.length, best = Math.max(...row), table = new Array(n).fill(epsilon / n)
    const ties = row.map((q, a) => q === best ? a : -1).filter(a => a >= 0)
    for (const a of ties) table[a] += (1 - epsilon) / ties.length
    return table
  })
}

// The greedy policy with ties shown honestly: probability shared equally by all best actions
// (ε-greedy with ε = 0). A table of zeros gives 1/4 to every action.
export const greedyProbs = Q => epsilonGreedyPolicy(Q, 0)
