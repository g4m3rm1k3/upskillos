// python/planning.py in JavaScript: Q from V, policy evaluation and value iteration, sweeping the
// states in order and updating V in place, exactly as the Python does.
export function qFromV(P, V, state, gamma) {
  const q = new Array(P[state].length).fill(0)
  P[state].forEach((outcomes, action) => {
    for (const [p, next, reward, terminated] of outcomes) {
      const future = terminated ? 0.0 : gamma * V[next]
      q[action] += p * (reward + future)
    }
  })
  return q
}

const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0)

// onSweep(V, sweep) is called after each sweep, for figures that animate it.
export function evaluatePolicy(P, policy, gamma, { theta = 1e-10, maxSweeps = 10000, onSweep } = {}) {
  const V = new Array(P.length).fill(0)
  let sweep = 0
  for (; sweep < maxSweeps; sweep++) {
    let biggest = 0
    for (let s = 0; s < P.length; s++) {
      const nv = dot(policy[s], qFromV(P, V, s, gamma))
      biggest = Math.max(biggest, Math.abs(nv - V[s]))
      V[s] = nv
    }
    onSweep?.([...V], sweep + 1)
    if (biggest < theta) break
  }
  return { V, sweeps: Math.min(sweep + 1, maxSweeps) }
}

export function valueIteration(P, gamma, { theta = 1e-10, maxSweeps = 10000, onSweep } = {}) {
  const V = new Array(P.length).fill(0)
  let sweep = 0
  for (; sweep < maxSweeps; sweep++) {
    let biggest = 0
    for (let s = 0; s < P.length; s++) {
      const nv = Math.max(...qFromV(P, V, s, gamma))
      biggest = Math.max(biggest, Math.abs(nv - V[s]))
      V[s] = nv
    }
    onSweep?.([...V], sweep + 1)
    if (biggest < theta) break
  }
  const Q = P.map((_, s) => qFromV(P, V, s, gamma))
  return { V, Q, sweeps: Math.min(sweep + 1, maxSweeps) }
}

// NumPy's argmax: the first of the largest.
export const argmax = row => row.reduce((best, x, i) => x > row[best] ? i : best, 0)
export const greedyPolicy = Q => Q.map(argmax)
