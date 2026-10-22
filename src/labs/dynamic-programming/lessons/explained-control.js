// Reference solutions explained line by line for the decision-process lessons (Specialist, control
// group). Format: explained.js. The same code is the lessons' test reference (specialist-solutions.js).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

// The JavaScript fraction helpers: [numerator, denominator] as BigInts, always in lowest terms.
const FRACTIONS = `  const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a }
  const F = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d } const g = gcd(n, d) || 1n; return [n / g, d / g] }
  const add = (x, y) => F(x[0] * y[1] + y[0] * x[1], x[1] * y[1])
  const sub = (x, y) => F(x[0] * y[1] - y[0] * x[1], x[1] * y[1])
  const mul = (x, y) => F(x[0] * y[0], x[1] * y[1])
  const div = (x, y) => F(x[0] * y[1], x[1] * y[0])
  const more = (x, y) => x[0] * y[1] > y[0] * x[1]
  const str = x => \`\${x[0]}/\${x[1]}\``

const CODE = {
  // Dijkstra over (vertex, coupon used): the coupon makes one edge free, so the state must remember it.
  'bellman-principle': pair(`import heapq

def solve(n, edges):
    adj = [[] for _ in range(n)]
    for u, v, w in edges:
        adj[u].append((v, w))
    INF = float("inf")
    dist = [[INF, INF] for _ in range(n)]
    dist[0][0] = 0
    heap = [(0, 0, 0)]
    while heap:
        d, u, used = heapq.heappop(heap)
        if d > dist[u][used]:
            continue
        for v, w in adj[u]:
            if d + w < dist[v][used]:
                dist[v][used] = d + w
                heapq.heappush(heap, (d + w, v, used))
            if not used and d < dist[v][1]:
                dist[v][1] = d
                heapq.heappush(heap, (d, v, 1))
    best = min(dist[n - 1])
    return -1 if best == INF else best
`, `function solve(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const [u, v, w] of edges) adj[u].push([v, w])
  const dist = Array.from({ length: n }, () => [Infinity, Infinity])
  dist[0][0] = 0
  // A binary heap of [d, u, used], smallest d on top.
  const heap = [[0, 0, 0]]
  const push = item => { heap.push(item); for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p } }
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m } } return top }
  while (heap.length) {
    const [d, u, used] = pop()
    if (d > dist[u][used]) continue
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v][used]) {
        dist[v][used] = d + w
        push([d + w, v, used])
      }
      if (!used && d < dist[v][1]) {
        dist[v][1] = d
        push([d, v, 1])
      }
    }
  }
  const best = Math.min(...dist[n - 1])
  return best === Infinity ? -1 : best
}`),

  // Backward induction: V holds the best expected reward with t steps left, starting from V = 0.
  'finite-mdp': pair(`from fractions import Fraction

def solve(trans, reward, H):
    n = len(trans)
    V = [Fraction(0)] * n
    for _ in range(H):
        V = [max(reward[s][a] + sum(V[x] for x in trans[s][a]) / len(trans[s][a]) for a in range(len(trans[s]))) for s in range(n)]
    return f"{V[0].numerator}/{V[0].denominator}"
`, `function solve(trans, reward, H) {
${FRACTIONS}
  const n = trans.length
  let V = new Array(n).fill(F(0))
  for (let t = 0; t < H; t++) {
    V = trans.map((acts, s) => {
      let best = null
      acts.forEach((next, a) => {
        let total = F(0)
        for (const x of next) total = add(total, V[x])
        const value = add(F(reward[s][a]), div(total, F(next.length)))
        if (best === null || more(value, best)) best = value
      })
      return best
    })
  }
  return str(V[0])
}`),

  // K sweeps of value iteration from V = 0, with discount p/q and one next state per action.
  'value-iteration': pair(`from fractions import Fraction

def solve(nxt, reward, gamma, K):
    g = Fraction(gamma[0], gamma[1])
    V = [Fraction(0)] * len(nxt)
    for _ in range(K):
        V = [max(reward[s][a] + g * V[nxt[s][a]] for a in range(len(nxt[s]))) for s in range(len(nxt))]
    return f"{V[0].numerator}/{V[0].denominator}"
`, `function solve(nxt, reward, gamma, K) {
${FRACTIONS}
  const g = F(gamma[0], gamma[1])
  let V = nxt.map(() => F(0))
  for (let k = 0; k < K; k++) {
    V = nxt.map((acts, s) => {
      let best = null
      acts.forEach((to, a) => {
        const value = add(F(reward[s][a]), mul(g, V[to]))
        if (best === null || more(value, best)) best = value
      })
      return best
    })
  }
  return str(V[0])
}`),

  // Policy iteration with exact fractions: evaluate the policy by solving (I − γP)V = r, then improve
  // every state greedily; stop when no state changes its action.
  'policy-iteration': pair(`from fractions import Fraction

def solve(trans, reward, gamma):
    g = Fraction(gamma[0], gamma[1])
    n = len(trans)
    policy = [0] * n
    while True:
        A = [[Fraction(int(i == j)) for j in range(n)] + [Fraction(reward[i][policy[i]])] for i in range(n)]
        for i in range(n):
            nxt = trans[i][policy[i]]
            for x in nxt:
                A[i][x] -= g / len(nxt)
        for col in range(n):
            pivot = next(r for r in range(col, n) if A[r][col] != 0)
            A[col], A[pivot] = A[pivot], A[col]
            for r in range(n):
                if r != col and A[r][col] != 0:
                    factor = A[r][col] / A[col][col]
                    A[r] = [x - factor * y for x, y in zip(A[r], A[col])]
        V = [A[i][n] / A[i][i] for i in range(n)]
        changed = False
        for s in range(n):
            q = lambda a: reward[s][a] + g * sum(V[x] for x in trans[s][a]) / len(trans[s][a])
            best = max(range(len(trans[s])), key=q)
            if q(best) > q(policy[s]):
                policy[s] = best
                changed = True
        if not changed:
            return f"{V[0].numerator}/{V[0].denominator}"
`, `function solve(trans, reward, gamma) {
${FRACTIONS}
  const g = F(gamma[0], gamma[1]), n = trans.length, policy = new Array(n).fill(0)
  for (;;) {
    const A = trans.map((_, i) => [...trans.map((__, j) => F(i === j ? 1 : 0)), F(reward[i][policy[i]])])
    trans.forEach((acts, i) => {
      const next = acts[policy[i]]
      for (const x of next) A[i][x] = sub(A[i][x], div(g, F(next.length)))
    })
    for (let col = 0; col < n; col++) {
      let pivot = col
      while (A[pivot][col][0] === 0n) pivot++
      ;[A[col], A[pivot]] = [A[pivot], A[col]]
      for (let r = 0; r < n; r++) {
        if (r !== col && A[r][col][0] !== 0n) {
          const factor = div(A[r][col], A[col][col])
          A[r] = A[r].map((x, c) => sub(x, mul(factor, A[col][c])))
        }
      }
    }
    const V = A.map((row, i) => div(row[n], row[i]))
    let changed = false
    trans.forEach((acts, s) => {
      const q = a => { let total = F(0); for (const x of acts[a]) total = add(total, V[x]); return add(F(reward[s][a]), mul(g, div(total, F(acts[a].length)))) }
      let best = 0
      for (let a = 1; a < acts.length; a++) if (more(q(a), q(best))) best = a
      if (more(q(best), q(policy[s]))) { policy[s] = best; changed = true }
    })
    if (!changed) return str(V[0])
  }
}`),

  // Karp: D[k][v] is the heaviest walk of exactly k edges from 0 to v. The best mean cycle is
  // max over v of min over k of (D[n][v] − D[k][v]) / (n − k).
  'average-reward': pair(`from fractions import Fraction

def solve(n, edges):
    NEG = None
    D = [[NEG] * n for _ in range(n + 1)]
    D[0][0] = 0
    for k in range(1, n + 1):
        for u, v, w in edges:
            if D[k - 1][u] is not None and (D[k][v] is None or D[k - 1][u] + w > D[k][v]):
                D[k][v] = D[k - 1][u] + w
    best = None
    for v in range(n):
        if D[n][v] is None:
            continue
        worst = min(Fraction(D[n][v] - D[k][v], n - k) for k in range(n) if D[k][v] is not None)
        if best is None or worst > best:
            best = worst
    return f"{best.numerator}/{best.denominator}"
`, `function solve(n, edges) {
${FRACTIONS}
  const D = Array.from({ length: n + 1 }, () => new Array(n).fill(null))
  D[0][0] = 0
  for (let k = 1; k <= n; k++) {
    for (const [u, v, w] of edges) {
      if (D[k - 1][u] !== null && (D[k][v] === null || D[k - 1][u] + w > D[k][v])) D[k][v] = D[k - 1][u] + w
    }
  }
  let best = null
  for (let v = 0; v < n; v++) {
    if (D[n][v] === null) continue
    let worst = null
    for (let k = 0; k < n; k++) {
      if (D[k][v] === null) continue
      const mean = F(D[n][v] - D[k][v], n - k)
      if (worst === null || more(worst, mean)) worst = mean
    }
    if (best === null || more(worst, best)) best = worst
  }
  return str(best)
}`),

  // Wagner–Whitin: an order in period i covers periods i … j − 1 exactly, so C[j] is the cheapest way to
  // meet the first j demands, and the last order is placed in some period i < j. Going down from i = j − 1,
  // every demand after i waits one period more.
  'inventory': pair(`def solve(d, K, h):
    T = len(d)
    C = [0] + [None] * T
    for j in range(1, T + 1):
        need = hold = 0
        for i in range(j - 1, -1, -1):
            hold += need * h
            need += d[i]
            cost = C[i] + (K if need > 0 else 0) + hold
            if C[j] is None or cost < C[j]:
                C[j] = cost
    return C[T]
`, `function solve(d, K, h) {
  const T = d.length, C = [0]
  for (let j = 1; j <= T; j++) {
    let need = 0, hold = 0
    for (let i = j - 1; i >= 0; i--) {
      hold += need * h
      need += d[i]
      const cost = C[i] + (need > 0 ? K : 0) + hold
      if (C[j] === undefined || cost < C[j]) C[j] = cost
    }
  }
  return C[T]
}`),

  // V[k]: the expected payoff with k offers still to come. Take an offer when it beats waiting.
  'optimal-stopping': pair(`from fractions import Fraction

def solve(n, m, c):
    V = Fraction(m + 1, 2)
    for _ in range(n - 1):
        V = sum(max(Fraction(x), V - c) for x in range(1, m + 1)) / m
    return f"{V.numerator}/{V.denominator}"
`, `function solve(n, m, c) {
${FRACTIONS}
  let V = F(m + 1, 2)
  for (let k = 1; k < n; k++) {
    let total = F(0)
    const wait = sub(V, F(c))
    for (let x = 1; x <= m; x++) total = add(total, more(F(x), wait) ? F(x) : wait)
    V = div(total, F(m))
  }
  return str(V)
}`),

  // V[b]: the best expected reward with b tokens. An attempt costs its success price if it works and its
  // failure price if not; stopping is always allowed.
  'resource-control': pair(`from fractions import Fraction

def solve(B, actions):
    V = [Fraction(0)] * (B + 1)
    for b in range(1, B + 1):
        best = Fraction(0)
        for win_cost, lose_cost, p, r in actions:
            if win_cost <= b and lose_cost <= b:
                q = Fraction(p, 100)
                value = q * (r + V[b - win_cost]) + (1 - q) * V[b - lose_cost]
                best = max(best, value)
        V[b] = best
    return f"{V[B].numerator}/{V[B].denominator}"
`, `function solve(B, actions) {
${FRACTIONS}
  const V = [F(0)]
  for (let b = 1; b <= B; b++) {
    let best = F(0)
    for (const [winCost, loseCost, p, r] of actions) {
      if (winCost <= b && loseCost <= b) {
        const q = F(p, 100)
        const value = add(mul(q, add(F(r), V[b - winCost])), mul(sub(F(1), q), V[b - loseCost]))
        if (more(value, best)) best = value
      }
    }
    V.push(best)
  }
  return str(V[B])
}`),

  // Stock on the grid 0 … G. Consuming c pays u[c]; what is left grows by g and usually lands between grid
  // points, where the next value is read by linear interpolation (above G, the value at G).
  'continuous-state': pair(`from fractions import Fraction

def solve(u, g, G, T, x0):
    growth = Fraction(g[0], g[1])
    V = [Fraction(0)] * (G + 1)
    for _ in range(T):
        def at(y):
            if y >= G:
                return V[G]
            lo = y.numerator // y.denominator
            w = y - lo
            return V[lo] if w == 0 else (1 - w) * V[lo] + w * V[lo + 1]
        V = [max(u[c] + at((x - c) * growth) for c in range(x + 1)) for x in range(G + 1)]
    return f"{V[x0].numerator}/{V[x0].denominator}"
`, `function solve(u, g, G, T, x0) {
${FRACTIONS}
  const growth = F(g[0], g[1])
  let V = new Array(G + 1).fill(F(0))
  for (let t = 0; t < T; t++) {
    const old = V
    const at = y => {
      if (!more(F(G), y)) return old[G]
      const lo = y[0] / y[1], w = sub(y, F(lo))
      return w[0] === 0n ? old[Number(lo)] : add(mul(sub(F(1), w), old[Number(lo)]), mul(w, old[Number(lo) + 1]))
    }
    V = old.map((_, x) => {
      let best = null
      for (let c = 0; c <= x; c++) {
        const value = add(F(u[c]), at(mul(F(x - c), growth)))
        if (best === null || more(value, best)) best = value
      }
      return best
    })
  }
  return str(V[x0])
}`),

  // Scalar LQR: the cost-to-go is P·x², and the Riccati recursion steps P back one period at a time.
  'lqr': pair(`from fractions import Fraction

def solve(a, b, q, r, qf, N):
    P = Fraction(qf)
    for _ in range(N):
        P = q + a * a * P - (a * b * P) ** 2 / (r + b * b * P)
    return f"{P.numerator}/{P.denominator}"
`, `function solve(a, b, q, r, qf, N) {
${FRACTIONS}
  let P = F(qf)
  for (let k = 0; k < N; k++) {
    const abP = mul(F(a * b), P)
    P = sub(add(F(q), mul(F(a * a), P)), div(mul(abP, abP), add(F(r), mul(F(b * b), P))))
  }
  return str(P)
}`),

  // A machine is good or bad, hidden. Run: +2 if good, −3 if bad. Repair: −1, and it is good. Inspect: 0,
  // and a reading that is right with chance acc%. The belief (chance it is good) is the state.
  'pomdp': pair(`from fractions import Fraction
from functools import lru_cache

def solve(H, prior, acc):
    a = Fraction(acc, 100)

    @lru_cache(maxsize=None)
    def V(t, b):
        if t == 0:
            return Fraction(0)
        run = b * 2 - (1 - b) * 3 + V(t - 1, b)
        repair = -1 + V(t - 1, Fraction(1))
        good = b * a + (1 - b) * (1 - a)
        inspect = Fraction(0)
        if good > 0:
            inspect += good * V(t - 1, b * a / good)
        if good < 1:
            inspect += (1 - good) * V(t - 1, b * (1 - a) / (1 - good))
        return max(run, repair, inspect)

    v = V(H, Fraction(prior, 100))
    return f"{v.numerator}/{v.denominator}"
`, `function solve(H, prior, acc) {
${FRACTIONS}
  const a = F(acc, 100), one = F(1), memo = new Map()
  const V = (t, b) => {
    if (t === 0) return F(0)
    const key = \`\${t}:\${str(b)}\`
    if (memo.has(key)) return memo.get(key)
    const run = add(sub(mul(b, F(2)), mul(sub(one, b), F(3))), V(t - 1, b))
    const repair = add(F(-1), V(t - 1, one))
    const good = add(mul(b, a), mul(sub(one, b), sub(one, a)))
    let inspect = F(0)
    if (good[0] > 0n) inspect = add(inspect, mul(good, V(t - 1, div(mul(b, a), good))))
    if (more(one, good)) inspect = add(inspect, mul(sub(one, good), V(t - 1, div(mul(b, sub(one, a)), sub(one, good)))))
    let best = run
    for (const v of [repair, inspect]) if (more(v, best)) best = v
    memo.set(key, best)
    return best
  }
  return str(V(H, F(prior, 100)))
}`),
}

const FRACTION_NOTE = ['from fractions import Fraction', 'const F = (n, d = 1n) =>', 'Exact fractions: Python has them built in; the JavaScript keeps [numerator, denominator] as BigInts, always in lowest terms.']

export const CONTROL_EXPLAINED = {
  'bellman-principle': {
    code: CODE['bellman-principle'],
    notes: [
      ['dist = [[INF, INF] for _ in range(n)]', 'const dist = Array.from({ length: n }, () => [Infinity, Infinity])', 'Two values per vertex: the cheapest way there with the coupon unused, and with it spent. The vertex alone is not a complete state.'],
      ['heap = [(0, 0, 0)]', 'const heap = [[0, 0, 0]]', 'Dijkstra over the states (vertex, used): start at vertex 0, cost 0, coupon unused.'],
      ['if d > dist[u][used]:', 'if (d > dist[u][used]) continue', 'An old heap entry for a state already reached more cheaply: skip it.'],
      ['if d + w < dist[v][used]:', 'if (d + w < dist[v][used]) {', 'Pay for the edge, keeping the coupon as it was.'],
      ['if not used and d < dist[v][1]:', 'if (!used && d < dist[v][1]) {', 'Or, if the coupon is unused, take this edge for free and spend it.'],
      ['best = min(dist[n - 1])', 'const best = Math.min(...dist[n - 1])', 'At the end it doesn’t matter whether the coupon was used: the cheaper of the two.'],
    ],
    math: [
      ['d(v, used)', 'dist[v][used]', 'dist[v][used]', 'the cheapest route to v, with the coupon used or not'],
      ['d(v, 1) ≤ d(u, 0)', 'dist[v][1]', 'dist[v][1]', 'the free edge u → v'],
    ],
  },

  'finite-mdp': {
    code: CODE['finite-mdp'],
    notes: [
      FRACTION_NOTE,
      ['V = [Fraction(0)] * n', 'let V = new Array(n).fill(F(0))', 'With no decisions left, nothing more is earned: V = 0.'],
      ['for _ in range(H):', 'for (let t = 0; t < H; t++) {', 'Each pass adds one decision in front: after t passes, V is the value with t decisions left.'],
      ['sum(V[x] for x in trans[s][a]) / len(trans[s][a])', 'div(total, F(next.length))', 'Where the action leads is chance: the expected value of the rest is the average over its equally likely next states.'],
      ['max(reward[s][a] +', 'if (best === null || more(value, best)) best = value', 'The decision is ours: the best action in state s.'],
      ['return f"{V[0].numerator}/{V[0].denominator}"', 'return str(V[0])', 'H decisions, from state 0.'],
    ],
    math: [
      ['V_t(s)', 'V[x]', 'V[x]', 'the best expected total with t decisions left in state s'],
      ['r(s, a) + E[V_{t−1}(next)]', 'reward[s][a]', 'reward[s][a]', 'the value of action a in state s'],
    ],
  },

  'value-iteration': {
    code: CODE['value-iteration'],
    notes: [
      FRACTION_NOTE,
      ['g = Fraction(gamma[0], gamma[1])', 'const g = F(gamma[0], gamma[1])', 'The discount: a reward t steps ahead is worth gᵗ of one now.'],
      ['V = [Fraction(0)] * len(nxt)', 'let V = nxt.map(() => F(0))', 'Start from V = 0 everywhere.'],
      ['V = [max(', 'V = nxt.map((acts, s) => {', 'The new list is built entirely from the old one, then replaces it.'],
      ['reward[s][a] + g * V[nxt[s][a]]', 'add(F(reward[s][a]), mul(g, V[to]))', 'The Bellman update: reward now, plus the discounted old value of where the action leads.'],
      ['return f"{V[0].numerator}/{V[0].denominator}"', 'return str(V[0])', 'After K updates: the best discounted total of K steps from state 0. Each update shrinks the distance to the true value by the factor g.'],
    ],
    math: [
      ['V_k(s) = max_a r(s, a) + γ V_{k−1}(next)', 'g * V[nxt[s][a]]', 'mul(g, V[to])', 'one Bellman update'],
      ['γ', 'g', 'g', 'the discount p/q'],
    ],
  },

  'policy-iteration': {
    code: CODE['policy-iteration'],
    notes: [
      FRACTION_NOTE,
      ['policy = [0] * n', 'policy = new Array(n).fill(0)', 'Start from any policy: action 0 everywhere.'],
      ['A = [[Fraction(int(i == j)) for j in range(n)] + [Fraction(reward[i][policy[i]])] for i in range(n)]', 'const A = trans.map((_, i) => [...trans.map((__, j) => F(i === j ? 1 : 0)), F(reward[i][policy[i]])])', 'Evaluate the policy: V = r + γ P V, written as (I − γP) V = r. This row starts as I and r.'],
      ['A[i][x] -= g / len(nxt)', 'A[i][x] = sub(A[i][x], div(g, F(next.length)))', 'Subtract γ times the chance of each next state.'],
      ['factor = A[r][col] / A[col][col]', 'const factor = div(A[r][col], A[col][col])', 'Gauss–Jordan elimination with exact fractions: the policy’s values exactly, not an approximation.'],
      ['best = max(range(len(trans[s])), key=q)', 'for (let a = 1; a < acts.length; a++) if (more(q(a), q(best))) best = a', 'Improve: in each state the action that looks best against these values.'],
      ['if q(best) > q(policy[s]):', 'if (more(q(best), q(policy[s]))) { policy[s] = best; changed = true }', 'Change only when strictly better, so the loop can’t cycle between equally good actions.'],
      ['if not changed:', 'if (!changed) return str(V[0])', 'No state improves: the policy is optimal, and its values are the optimal values.'],
    ],
    math: [
      ['(I − γP_π) V = r_π', 'A[i][x]', 'A[i][x]', 'the policy’s evaluation equations'],
      ['Q(s, a)', 'q(best)', 'q(best)', 'the value of action a in state s against the current values'],
    ],
  },

  'average-reward': {
    code: CODE['average-reward'],
    notes: [
      FRACTION_NOTE,
      ['D = [[NEG] * n for _ in range(n + 1)]', 'const D = Array.from({ length: n + 1 }, () => new Array(n).fill(null))', 'D[k][v]: the heaviest walk of exactly k edges from 0 to v; None (null) when there is none.'],
      ['D[0][0] = 0', 'D[0][0] = 0', 'No edges: only vertex 0, with weight 0.'],
      ['D[k][v] = D[k - 1][u] + w', 'D[k][v] = D[k - 1][u] + w', 'A walk of k edges is a walk of k − 1 edges and one more edge: keep the heaviest.'],
      ['worst = min(Fraction(D[n][v] - D[k][v], n - k) for k in range(n) if D[k][v] is not None)', 'const mean = F(D[n][v] - D[k][v], n - k)', 'Karp: a walk of n edges must contain a cycle; comparing it with every shorter walk to v isolates the cycle’s mean weight.'],
      ['if best is None or worst > best:', 'if (best === null || more(worst, best)) best = worst', 'The best mean cycle is the largest of these, over the vertices v.'],
    ],
    math: [
      ['D_k(v)', 'D[k][v]', 'D[k][v]', 'the heaviest walk of exactly k edges from 0 to v'],
      ['λ* = max_v min_k (D_n(v) − D_k(v)) / (n − k)', 'D[n][v] - D[k][v]', 'D[n][v] - D[k][v]', 'Karp’s formula for the best mean cycle'],
    ],
  },

  'inventory': {
    code: CODE['inventory'],
    notes: [
      ['C = [0] + [None] * T', 'const T = d.length, C = [0]', 'C[j]: the least cost of meeting the first j periods with nothing left over. Nothing to meet costs 0.'],
      ['for i in range(j - 1, -1, -1):', 'for (let i = j - 1; i >= 0; i--) {', 'The last order is placed in period i and covers periods i … j − 1. Try i from j − 1 backwards.'],
      ['hold += need * h', 'hold += need * h', 'Moving the order one period earlier makes every unit it already covers wait one period more.'],
      ['need += d[i]', 'need += d[i]', 'It now also covers period i’s own demand, used at once.'],
      ['cost = C[i] + (K if need > 0 else 0) + hold', 'const cost = C[i] + (need > 0 ? K : 0) + hold', 'The best plan for the periods before i, the order, and the holding. An order of nothing is no order: no K.'],
      ['return C[T]', 'return C[T]', 'Every period met, with nothing left over.'],
    ],
    math: [
      ['C(j) = min_i C(i) + K + h Σ (t − i) d_t', 'C[i]', 'C[i]', 'the best plan for the periods before the last order'],
      ['h Σ (t − i) d_t', 'hold', 'hold', 'the holding cost of the last order'],
    ],
  },

  'optimal-stopping': {
    code: CODE['optimal-stopping'],
    notes: [
      FRACTION_NOTE,
      ['V = Fraction(m + 1, 2)', 'let V = F(m + 1, 2)', 'One offer to come: it must be taken, worth (m + 1)/2 on average.'],
      ['for _ in range(n - 1):', 'for (let k = 1; k < n; k++) {', 'One more offer in front each time: V becomes the value with one more offer to come.'],
      ['max(Fraction(x), V - c)', 'more(F(x), wait) ? F(x) : wait', 'Seeing offer x: take it, or pay c and continue, worth V − c. Take whichever is more.'],
      ['/ m', 'V = div(total, F(m))', 'Before the offer is seen, average over its m equally likely values.'],
      ['return f"{V.numerator}/{V.denominator}"', 'return str(V)', 'The value with all n offers to come.'],
    ],
    math: [
      ['V_k = E[max(X, V_{k−1} − c)]', 'V - c', 'wait', 'the value of continuing past an offer'],
      ['take x when x ≥ V_{k−1} − c', 'max(Fraction(x), V - c)', 'more(F(x), wait)', 'the stopping rule: a threshold'],
    ],
  },

  'resource-control': {
    code: CODE['resource-control'],
    notes: [
      FRACTION_NOTE,
      ['V = [Fraction(0)] * (B + 1)', 'const V = [F(0)]', 'V[b]: the best expected total with b tokens. With none, nothing more can be done.'],
      ['best = Fraction(0)', 'let best = F(0)', 'Stopping is always allowed and is worth 0.'],
      ['if win_cost <= b and lose_cost <= b:', 'if (winCost <= b && loseCost <= b) {', 'An attempt needs enough tokens for either outcome.'],
      ['value = q * (r + V[b - win_cost]) + (1 - q) * V[b - lose_cost]', 'const value = add(mul(q, add(F(r), V[b - winCost])), mul(sub(F(1), q), V[b - loseCost]))', 'Success pays r and leaves b − win tokens; failure pays nothing and leaves b − lose. Different outcomes, different futures.'],
      ['return f"{V[B].numerator}/{V[B].denominator}"', 'return str(V[B])', 'Every attempt uses at least one token, so V[b] reads only smaller counts: filled upwards to B.'],
    ],
    math: [
      ['V(b)', 'V[b - win_cost]', 'V[b - winCost]', 'the best expected total with the tokens left after a success'],
      ['p', 'q', 'q', 'the chance of success, p/100'],
    ],
  },

  'continuous-state': {
    code: CODE['continuous-state'],
    notes: [
      FRACTION_NOTE,
      ['V = [Fraction(0)] * (G + 1)', 'let V = new Array(G + 1).fill(F(0))', 'Values are kept only on the grid 0 … G. With no periods left they are 0.'],
      ['if y >= G:', 'if (!more(F(G), y)) return old[G]', 'Above the grid: the boundary rule, the value at G. It is a modelling choice and has to be stated.'],
      ['lo = y.numerator // y.denominator', 'const lo = y[0] / y[1], w = sub(y, F(lo))', 'Between grid points lo and lo + 1, at the fraction w of the way.'],
      ['return V[lo] if w == 0 else (1 - w) * V[lo] + w * V[lo + 1]', 'add(mul(sub(F(1), w), old[Number(lo)]), mul(w, old[Number(lo) + 1]))', 'Linear interpolation: the value between grid points is estimated from its two neighbours.'],
      ['V = [max(u[c] + at((x - c) * growth) for c in range(x + 1)) for x in range(G + 1)]', 'const value = add(F(u[c]), at(mul(F(x - c), growth)))', 'Consume c, earn u[c], and the rest grows; its value is read off the old grid.'],
    ],
    math: [
      ['V_t(x) = max_c u(c) + Ṽ_{t−1}((x − c)·g)', 'at((x - c) * growth)', 'at(mul(F(x - c), growth))', 'the update, with Ṽ the interpolated values'],
      ['Ṽ(y) = (1 − w) V(⌊y⌋) + w V(⌊y⌋ + 1)', 'w', 'w', 'linear interpolation, w = y − ⌊y⌋'],
    ],
  },

  'lqr': {
    code: CODE['lqr'],
    notes: [
      FRACTION_NOTE,
      ['P = Fraction(qf)', 'let P = F(qf)', 'At the end the cost-to-go is qf · x², so P = qf.'],
      ['for _ in range(N):', 'for (let k = 0; k < N; k++) {', 'One step back at a time. The cost-to-go stays a multiple of x², so one number P describes it completely.'],
      ['P = q + a * a * P - (a * b * P) ** 2 / (r + b * b * P)', 'P = sub(add(F(q), mul(F(a * a), P)), div(mul(abP, abP), add(F(r), mul(F(b * b), P))))', 'The Riccati recursion: minimising q x² + r u² + P (a x + b u)² over u gives u = −a b P x / (r + b² P) and this new P.'],
      ['return f"{P.numerator}/{P.denominator}"', 'return str(P)', 'The least total from x = 1 is P · 1² = P.'],
    ],
    math: [
      ['V_t(x) = P_t x²', 'P', 'P', 'the cost-to-go, a multiple of x²'],
      ['P ← q + a²P − (abP)² / (r + b²P)', '(a * b * P) ** 2', 'mul(abP, abP)', 'one step of the Riccati recursion'],
    ],
  },

  'pomdp': {
    code: CODE['pomdp'],
    notes: [
      ['@lru_cache(maxsize=None)', 'const a = F(acc, 100), one = F(1), memo = new Map()', 'V(t, b) is stored: the same beliefs come up again by different histories.'],
      ['def V(t, b):', 'const V = (t, b) => {', 'b is the belief: the chance that the machine is good, given everything seen so far. It stands in for the hidden state.'],
      ['run = b * 2 - (1 - b) * 3 + V(t - 1, b)', 'const run = add(sub(mul(b, F(2)), mul(sub(one, b), F(3))), V(t - 1, b))', 'Running earns its expected reward under the belief; nothing new is learnt, so the belief stays.'],
      ['repair = -1 + V(t - 1, Fraction(1))', 'const repair = add(F(-1), V(t - 1, one))', 'Repair costs 1 and makes the machine good for sure: belief 1.'],
      ['good = b * a + (1 - b) * (1 - a)', 'const good = add(mul(b, a), mul(sub(one, b), sub(one, a)))', 'The chance that an inspection reads “good”: right about a good machine, or wrong about a bad one.'],
      ['inspect += good * V(t - 1, b * a / good)', 'inspect = add(inspect, mul(good, V(t - 1, div(mul(b, a), good))))', 'Bayes’ rule: after a “good” reading the belief becomes b·a / good. Each reading is weighted by its chance.'],
      ['return max(run, repair, inspect)', 'for (const v of [repair, inspect]) if (more(v, best)) best = v', 'The best of the three actions.'],
    ],
    math: [
      ['b = P(good | history)', 'b', 'b', 'the belief, the state of the DP'],
      ['b′ = b·a / P(“good”)', 'b * a / good', 'div(mul(b, a), good)', 'the belief after a “good” reading'],
    ],
  },
}
