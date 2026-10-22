// Reference solutions explained line by line for the modelling-and-limits lessons (Specialist,
// research-tools group). Format: explained.js. The same code is the lessons' test reference
// (specialist-solutions.js).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CODE = {
  // The weights are huge but the values small: index the table by value. least[t]: the lightest set of
  // items worth exactly t.
  'pseudo-polynomial': pair(`def solve(weights, values, W):
    total = sum(values)
    INF = float("inf")
    least = [0] + [INF] * total
    for w, v in zip(weights, values):
        for t in range(total, v - 1, -1):
            if least[t - v] + w < least[t]:
                least[t] = least[t - v] + w
    return max(t for t in range(total + 1) if least[t] <= W)
`, `function solve(weights, values, W) {
  const total = values.reduce((a, b) => a + b, 0)
  const least = [0, ...new Array(total).fill(Infinity)]
  weights.forEach((w, i) => {
    const v = values[i]
    for (let t = total; t >= v; t--) {
      if (least[t - v] + w < least[t]) least[t] = least[t - v] + w
    }
  })
  let best = 0
  for (let t = 0; t <= total; t++) if (least[t] <= W) best = t
  return best
}`),

  // The approximation scheme: drop items that can't fit, round every value down to a multiple of
  // K = ε · vmax / n, and solve the rounded problem exactly by value. K times the best rounded total is
  // a value some set really reaches, and at least (1 − ε) times the optimum.
  'knapsack-fptas': pair(`from fractions import Fraction

def solve(weights, values, W, eps):
    items = [(w, v) for w, v in zip(weights, values) if w <= W]
    if not items or max(v for _, v in items) == 0:
        return "0/1"
    n, vmax = len(items), max(v for _, v in items)
    K = Fraction(eps[0] * vmax, eps[1] * n)
    scaled = [v * eps[1] * n // (eps[0] * vmax) for _, v in items]
    total = sum(scaled)
    INF = float("inf")
    least = [0] + [INF] * total
    for (w, _), s in zip(items, scaled):
        for t in range(total, s - 1, -1):
            if least[t - s] + w < least[t]:
                least[t] = least[t - s] + w
    best = max(t for t in range(total + 1) if least[t] <= W)
    x = K * best
    return f"{x.numerator}/{x.denominator}"
`, `function solve(weights, values, W, eps) {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  const items = weights.map((w, i) => [w, values[i]]).filter(([w]) => w <= W)
  if (!items.length || Math.max(...items.map(([, v]) => v)) === 0) return '0/1'
  const n = items.length, vmax = Math.max(...items.map(([, v]) => v))
  const scaled = items.map(([, v]) => Number((BigInt(v) * BigInt(eps[1]) * BigInt(n)) / (BigInt(eps[0]) * BigInt(vmax))))
  const total = scaled.reduce((a, b) => a + b, 0)
  const least = [0, ...new Array(total).fill(Infinity)]
  items.forEach(([w], i) => {
    const s = scaled[i]
    for (let t = total; t >= s; t--) if (least[t - s] + w < least[t]) least[t] = least[t - s] + w
  })
  let best = 0
  for (let t = 0; t <= total; t++) if (least[t] <= W) best = t
  const top = BigInt(best) * BigInt(eps[0]) * BigInt(vmax), bottom = BigInt(eps[1]) * BigInt(n)
  const g = gcd(top, bottom) || 1n
  return \`\${top / g}/\${bottom / g}\`
}`),

  // A grid h rows high and w columns long; choose cells, no two side by side. Column by column, the state
  // is the set of chosen rows in the last column: 2^h at most, whatever w is.
  'parameterized-dp': pair(`def solve(grid):
    h, w = len(grid), len(grid[0])
    masks = [m for m in range(1 << h) if not m & (m >> 1)]
    prev = {0: 0}
    for c in range(w):
        cur = {}
        for m in masks:
            gain = sum(grid[r][c] for r in range(h) if m >> r & 1)
            cur[m] = gain + max(v for p, v in prev.items() if not p & m)
        prev = cur
    return max(prev.values())
`, `function solve(grid) {
  const h = grid.length, w = grid[0].length
  const masks = []
  for (let m = 0; m < 1 << h; m++) if (!(m & (m >> 1))) masks.push(m)
  let prev = new Map([[0, 0]])
  for (let c = 0; c < w; c++) {
    const cur = new Map()
    for (const m of masks) {
      let gain = 0
      for (let r = 0; r < h; r++) if ((m >> r) & 1) gain += grid[r][c]
      let best = -Infinity
      for (const [p, v] of prev) if (!(p & m) && v > best) best = v
      cur.set(m, gain + best)
    }
    prev = cur
  }
  return Math.max(...prev.values())
}`),

  // Each vertex keeps its Pareto front of (time, cost) pairs: no kept pair is beaten in both.
  'multiobjective': pair(`def solve(n, edges):
    out = [[] for _ in range(n)]
    for u, v, t, c in edges:
        out[u].append((v, t, c))
    front = [[] for _ in range(n)]
    front[0] = [(0, 0)]
    for u in range(n):
        keep, best_cost = [], None
        for t, c in sorted(set(front[u])):
            if best_cost is None or c < best_cost:
                keep.append((t, c))
                best_cost = c
        front[u] = keep
        for v, t, c in out[u]:
            front[v] += [(a + t, b + c) for a, b in keep]
    return [list(p) for p in front[n - 1]]
`, `function solve(n, edges) {
  const out = Array.from({ length: n }, () => [])
  for (const [u, v, t, c] of edges) out[u].push([v, t, c])
  const front = Array.from({ length: n }, () => [])
  front[0] = [[0, 0]]
  for (let u = 0; u < n; u++) {
    const pts = [...new Map(front[u].map(p => [p.join(), p])).values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])
    const keep = []
    let bestCost = null
    for (const [t, c] of pts) {
      if (bestCost === null || c < bestCost) { keep.push([t, c]); bestCost = c }
    }
    front[u] = keep
    for (const [v, t, c] of out[u]) for (const [a, b] of keep) front[v].push([a + t, b + c])
  }
  return front[n - 1]
}`),

  // Split the items in two; list each half's subset sums (2^(n/2) each), sort one half, and for each sum
  // of the other count the partners that keep the total at most T.
  'meet-middle': pair(`from bisect import bisect_right

def solve(values, T):
    half = len(values) // 2
    def sums(items):
        out = [0]
        for x in items:
            out += [s + x for s in out]
        return out
    right = sorted(sums(values[half:]))
    return sum(bisect_right(right, T - s) for s in sums(values[:half]))
`, `function solve(values, T) {
  const half = Math.floor(values.length / 2)
  const sums = items => { let out = [0]; for (const x of items) out = out.concat(out.map(s => s + x)); return out }
  const right = sums(values.slice(half)).sort((a, b) => a - b)
  // How many entries of right are at most x.
  const atMost = x => { let lo = 0, hi = right.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (right[mid] <= x) lo = mid + 1; else hi = mid } return lo }
  let count = 0
  for (const s of sums(values.slice(0, half))) count += atMost(T - s)
  return count
}`),

  // best[r]: the least cost of giving exactly r units to the tasks so far. Adding a task is a min-plus
  // convolution of best with its cost table.
  'min-plus-convolution': pair(`def solve(costs, R):
    INF = float("inf")
    best = [0] + [INF] * R
    for c in costs:
        nxt = [INF] * (R + 1)
        for total in range(R + 1):
            if best[total] < INF:
                for x in range(min(len(c), R - total + 1)):
                    if best[total] + c[x] < nxt[total + x]:
                        nxt[total + x] = best[total] + c[x]
        best = nxt
    return -1 if best[R] == INF else best[R]
`, `function solve(costs, R) {
  let best = [0, ...new Array(R).fill(Infinity)]
  for (const c of costs) {
    const nxt = new Array(R + 1).fill(Infinity)
    for (let total = 0; total <= R; total++) {
      if (best[total] === Infinity) continue
      for (let x = 0; x < c.length && total + x <= R; x++) {
        if (best[total] + c[x] < nxt[total + x]) nxt[total + x] = best[total] + c[x]
      }
    }
    best = nxt
  }
  return best[R] === Infinity ? -1 : best[R]
}`),

  // A persistent segment tree over the keys: node v's version is its parent's plus one new path, so every
  // node can ask about exactly its own ancestors, while the versions share almost everything.
  'persistent-states': pair(`def solve(parent, key, weight, lo, hi, K):
    L, R, M = [0], [0], [0]
    def insert(node, a, b, pos, val):
        L.append(L[node])
        R.append(R[node])
        M.append(max(M[node], val))
        new = len(M) - 1
        if a < b:
            mid = (a + b) // 2
            if pos <= mid:
                L[new] = insert(L[node], a, mid, pos, val)
            else:
                R[new] = insert(R[node], mid + 1, b, pos, val)
        return new
    def query(node, a, b, l, r):
        if node == 0 or r < a or b < l:
            return 0
        if l <= a and b <= r:
            return M[node]
        mid = (a + b) // 2
        return max(query(L[node], a, mid, l, r), query(R[node], mid + 1, b, l, r))
    root = [0] * len(parent)
    total = 0
    for v in range(len(parent)):
        base = root[parent[v]] if parent[v] >= 0 else 0
        root[v] = insert(base, 0, K - 1, key[v], weight[v])
        total += query(root[v], 0, K - 1, lo[v], hi[v])
    return total
`, `function solve(parent, key, weight, lo, hi, K) {
  const L = [0], R = [0], M = [0]
  const insert = (node, a, b, pos, val) => {
    L.push(L[node]); R.push(R[node]); M.push(Math.max(M[node], val))
    const created = M.length - 1
    if (a < b) {
      const mid = (a + b) >> 1
      if (pos <= mid) L[created] = insert(L[node], a, mid, pos, val)
      else R[created] = insert(R[node], mid + 1, b, pos, val)
    }
    return created
  }
  const query = (node, a, b, l, r) => {
    if (node === 0 || r < a || b < l) return 0
    if (l <= a && b <= r) return M[node]
    const mid = (a + b) >> 1
    return Math.max(query(L[node], a, mid, l, r), query(R[node], mid + 1, b, l, r))
  }
  const root = new Array(parent.length).fill(0)
  let total = 0
  for (let v = 0; v < parent.length; v++) {
    const base = parent[v] >= 0 ? root[parent[v]] : 0
    root[v] = insert(base, 0, K - 1, key[v], weight[v])
    total += query(root[v], 0, K - 1, lo[v], hi[v])
  }
  return total
}`),

  // House robber under updates: a segment holds a 2 × 2 table, best[s][t], s and t saying whether its first
  // and last houses are taken. Two segments combine unless both touching houses are taken.
  'dynamic-dp': pair(`def solve(a, updates):
    NEG = float("-inf")
    n = len(a)
    size = 1
    while size < n:
        size *= 2
    def leaf(x):
        return [[0, NEG], [NEG, x]]
    def combine(A, B):
        if A is None:
            return B
        if B is None:
            return A
        return [[max(A[s][p] + B[q][t] for p in (0, 1) for q in (0, 1) if not (p and q)) for t in (0, 1)] for s in (0, 1)]
    tree = [None] * (2 * size)
    for i in range(n):
        tree[size + i] = leaf(a[i])
    for i in range(size - 1, 0, -1):
        tree[i] = combine(tree[2 * i], tree[2 * i + 1])
    total = 0
    for i, x in updates:
        j = size + i
        tree[j] = leaf(x)
        j //= 2
        while j:
            tree[j] = combine(tree[2 * j], tree[2 * j + 1])
            j //= 2
        total += max(max(row) for row in tree[1])
    return total
`, `function solve(a, updates) {
  const n = a.length
  let size = 1
  while (size < n) size *= 2
  const leaf = x => [[0, -Infinity], [-Infinity, x]]
  const combine = (A, B) => {
    if (A === null) return B
    if (B === null) return A
    return [0, 1].map(s => [0, 1].map(t => {
      let best = -Infinity
      for (const p of [0, 1]) for (const q of [0, 1]) if (!(p && q)) best = Math.max(best, A[s][p] + B[q][t])
      return best
    }))
  }
  const tree = new Array(2 * size).fill(null)
  for (let i = 0; i < n; i++) tree[size + i] = leaf(a[i])
  for (let i = size - 1; i > 0; i--) tree[i] = combine(tree[2 * i], tree[2 * i + 1])
  let total = 0
  for (const [i, x] of updates) {
    let j = size + i
    tree[j] = leaf(x)
    j >>= 1
    while (j) { tree[j] = combine(tree[2 * j], tree[2 * j + 1]); j >>= 1 }
    total += Math.max(...tree[1].flat())
  }
  return total
}`),

  // A tree automaton with two states, the value 0 or 1: ways[v][s] counts the labellings of v's subtree
  // (leaf values and operations) that make v evaluate to s.
  'tree-automata': pair(`def solve(kids, ops):
    M = 1000000007
    f = {"and": lambda x, y: x & y, "or": lambda x, y: x | y, "xor": lambda x, y: x ^ y}
    order = [0]
    for v in order:
        order += kids[v]
    ways = [None] * len(kids)
    for v in reversed(order):
        if not kids[v]:
            ways[v] = [1, 1]
            continue
        a, b = kids[v]
        w = [0, 0]
        for op in ops:
            for x in (0, 1):
                for y in (0, 1):
                    s = f[op](x, y)
                    w[s] = (w[s] + ways[a][x] * ways[b][y]) % M
        ways[v] = w
    return ways[0][1]
`, `function solve(kids, ops) {
  const M = 1000000007n
  const f = { and: (x, y) => x & y, or: (x, y) => x | y, xor: (x, y) => x ^ y }
  const order = [0]
  for (let i = 0; i < order.length; i++) order.push(...kids[order[i]])
  const ways = new Array(kids.length).fill(null)
  for (const v of [...order].reverse()) {
    if (!kids[v].length) { ways[v] = [1n, 1n]; continue }
    const [a, b] = kids[v], w = [0n, 0n]
    for (const op of ops) {
      for (const x of [0, 1]) {
        for (const y of [0, 1]) {
          const s = f[op](x, y)
          w[s] = (w[s] + ways[a][x] * ways[b][y]) % M
        }
      }
    }
    ways[v] = w
  }
  return Number(ways[0][1])
}`),

  // The 0/1 and the unbounded knapsack side by side: the only difference is the direction of the
  // capacity loop, and that direction is exactly the invariant a proof must check.
  'proof-checklist': pair(`def solve(weights, values, W):
    one = [0] * (W + 1)
    many = [0] * (W + 1)
    for w, v in zip(weights, values):
        for c in range(W, w - 1, -1):
            one[c] = max(one[c], one[c - w] + v)
        for c in range(w, W + 1):
            many[c] = max(many[c], many[c - w] + v)
    return [one[W], many[W]]
`, `function solve(weights, values, W) {
  const one = new Array(W + 1).fill(0), many = new Array(W + 1).fill(0)
  weights.forEach((w, i) => {
    const v = values[i]
    for (let c = W; c >= w; c--) one[c] = Math.max(one[c], one[c - w] + v)
    for (let c = w; c <= W; c++) many[c] = Math.max(many[c], many[c - w] + v)
  })
  return [one[W], many[W]]
}`),
}

export const RESEARCH_EXPLAINED = {
  'pseudo-polynomial': {
    code: CODE['pseudo-polynomial'],
    notes: [
      ['total = sum(values)', 'const total = values.reduce((a, b) => a + b, 0)', 'The values are small, so their total is small: index the table by value, not by weight.'],
      ['least = [0] + [INF] * total', 'const least = [0, ...new Array(total).fill(Infinity)]', 'least[t]: the lightest set worth exactly t. Worth 0: the empty set, weight 0.'],
      ['for t in range(total, v - 1, -1):', 'for (let t = total; t >= v; t--) {', 'Downwards, as in every 0/1 knapsack: least[t − v] still describes sets without this item.'],
      ['least[t] = least[t - v] + w', 'if (least[t - v] + w < least[t]) least[t] = least[t - v] + w', 'Reach value t by adding this item to the lightest set worth t − v.'],
      ['return max(t for t in range(total + 1) if least[t] <= W)', 'for (let t = 0; t <= total; t++) if (least[t] <= W) best = t', 'The largest value whose lightest set fits. The work is n times the total value, not n times W.'],
    ],
    math: [
      ['L(t) = min weight of a set worth t', 'least[t]', 'least[t]', 'the value-indexed table'],
      ['O(n · Σv)', 'total', 'total', 'the table’s length, the sum of the values'],
    ],
  },

  'knapsack-fptas': {
    code: CODE['knapsack-fptas'],
    notes: [
      ['items = [(w, v) for w, v in zip(weights, values) if w <= W]', '.filter(([w]) => w <= W)', 'An item that can’t fit on its own is dropped: it would only inflate vmax.'],
      ['K = Fraction(eps[0] * vmax, eps[1] * n)', 'const n = items.length, vmax = Math.max(...items.map(([, v]) => v))', 'K = ε · vmax / n. Each chosen item loses less than K by rounding, so a set of at most n items loses less than ε · vmax ≤ ε · OPT.'],
      ['scaled = [v * eps[1] * n // (eps[0] * vmax) for _, v in items]', 'BigInt(v) * BigInt(eps[1]) * BigInt(n)) / (BigInt(eps[0]) * BigInt(vmax))', '⌊v / K⌋ in whole numbers. A scaled value is at most n/ε, so the table below is small whatever the real values are.'],
      ['least = [0] + [INF] * total', 'const least = [0, ...new Array(total).fill(Infinity)]', 'The exact value-indexed knapsack, run on the scaled values.'],
      ['best = max(t for t in range(total + 1) if least[t] <= W)', 'for (let t = 0; t <= total; t++) if (least[t] <= W) best = t', 'The best scaled total that fits.'],
      ['x = K * best', 'BigInt(best) * BigInt(eps[0]) * BigInt(vmax)', 'Back in real units: a value some set really reaches, and at least (1 − ε) times the optimum.'],
    ],
    math: [
      ['K = ε · vmax / n', 'K', 'vmax', 'the rounding step'],
      ['⌊v / K⌋', 'scaled', 'scaled', 'a rounded value, at most n/ε'],
    ],
  },

  'parameterized-dp': {
    code: CODE['parameterized-dp'],
    notes: [
      ['masks = [m for m in range(1 << h) if not m & (m >> 1)]', 'for (let m = 0; m < 1 << h; m++) if (!(m & (m >> 1))) masks.push(m)', 'The chosen rows of one column, with no two neighbours: at most 2ʰ masks, 55 for h = 8.'],
      ['prev = {0: 0}', 'let prev = new Map([[0, 0]])', 'Before the first column nothing is chosen.'],
      ['gain = sum(grid[r][c] for r in range(h) if m >> r & 1)', 'for (let r = 0; r < h; r++) if ((m >> r) & 1) gain += grid[r][c]', 'The weight this column adds with mask m.'],
      ['cur[m] = gain + max(v for p, v in prev.items() if not p & m)', 'for (const [p, v] of prev) if (!(p & m) && v > best) best = v', 'The previous column’s mask p must share no row with m: chosen cells side by side across columns.'],
      ['return max(prev.values())', 'return Math.max(...prev.values())', 'Any mask may end the grid. The work is w · 4ʰ at most: exponential in the small parameter h only.'],
    ],
    math: [
      ['best(c, m)', 'cur[m]', 'cur.set(m, gain + best)', 'the best total of columns 0 … c with mask m in column c'],
      ['f(h) · poly(w)', 'masks', 'masks', 'the parameter h is in the exponent, the length w is not'],
    ],
  },

  'multiobjective': {
    code: CODE['multiobjective'],
    notes: [
      ['front[0] = [(0, 0)]', 'front[0] = [[0, 0]]', 'At the start: time 0, cost 0.'],
      ['for u in range(n):', 'for (let u = 0; u < n; u++) {', 'Edges go from smaller to larger vertices, so a vertex has all its arrivals when its turn comes.'],
      ['for t, c in sorted(set(front[u])):', 'for (const [t, c] of pts) {', 'Sorted by time (then cost), each pair once.'],
      ['if best_cost is None or c < best_cost:', 'if (bestCost === null || c < bestCost) { keep.push([t, c]); bestCost = c }', 'A pair survives only if it is cheaper than every faster one: otherwise some pair is no slower and no dearer.'],
      ['front[v] += [(a + t, b + c) for a, b in keep]', 'for (const [a, b] of keep) front[v].push([a + t, b + c])', 'Every surviving pair extends along each edge. A dominated pair can be dropped because both objectives just add.'],
      ['return [list(p) for p in front[n - 1]]', 'return front[n - 1]', 'The front at the last vertex, sorted by time.'],
    ],
    math: [
      ['Pareto front', 'keep', 'keep', 'the nondominated (time, cost) pairs of a vertex'],
      ['(t, c) dominates (t′, c′)', 'c < best_cost', 'c < bestCost', 't ≤ t′ and c ≤ c′, one of them strict'],
    ],
  },

  'meet-middle': {
    code: CODE['meet-middle'],
    notes: [
      ['half = len(values) // 2', 'const half = Math.floor(values.length / 2)', 'Two halves of about n/2 items: 2^(n/2) subsets each instead of 2ⁿ.'],
      ['out += [s + x for s in out]', 'out = out.concat(out.map(s => s + x))', 'Every subset sum of a half: each new item doubles the list.'],
      ['right = sorted(sums(values[half:]))', 'const right = sums(values.slice(half)).sort((a, b) => a - b)', 'Sort one half, so partners can be counted by binary search.'],
      ['return sum(bisect_right(right, T - s) for s in sums(values[:half]))', 'for (const s of sums(values.slice(0, half))) count += atMost(T - s)', 'A subset is a left part and a right part: count the right sums that keep the total at most T.'],
    ],
    math: [
      ['2^(n/2) · log 2^(n/2)', 'sums(values[:half])', 'sums(values.slice(0, half))', 'the work for the left half'],
      ['#{r ∈ right : r ≤ T − s}', 'bisect_right(right, T - s)', 'atMost(T - s)', 'the partners of a left sum s'],
    ],
  },

  'min-plus-convolution': {
    code: CODE['min-plus-convolution'],
    notes: [
      ['best = [0] + [INF] * R', 'let best = [0, ...new Array(R).fill(Infinity)]', 'Before any task: 0 units cost 0; any other total is impossible.'],
      ['for c in costs:', 'for (const c of costs) {', 'Tasks one at a time; each is merged in by a min-plus convolution.'],
      ['for x in range(min(len(c), R - total + 1)):', 'for (let x = 0; x < c.length && total + x <= R; x++) {', 'Give this task x units, as many as its table allows and the total permits.'],
      ['if best[total] + c[x] < nxt[total + x]:', 'if (best[total] + c[x] < nxt[total + x]) nxt[total + x] = best[total] + c[x]', 'new(r) = min over x of best(r − x) + c[x]: a minimum of sums, where an ordinary convolution has a sum of products.'],
      ['return -1 if best[R] == INF else best[R]', 'return best[R] === Infinity ? -1 : best[R]', 'Exactly R units given out, or impossible.'],
    ],
    math: [
      ['(A ⊕ B)(r) = min_x A(r − x) + B(x)', 'nxt[total + x]', 'nxt[total + x]', 'one min-plus convolution'],
      ['O(R · m) per task', 'len(c)', 'c.length', 'no FFT shortcut for min-plus'],
    ],
  },

  'persistent-states': {
    code: CODE['persistent-states'],
    notes: [
      ['L, R, M = [0], [0], [0]', 'const L = [0], R = [0], M = [0]', 'Node 0 is the empty tree, its own children, maximum 0. All versions share it.'],
      ['L.append(L[node])', 'L.push(L[node]); R.push(R[node]); M.push(Math.max(M[node], val))', 'An insertion never changes a node: it makes a copy, which starts with the old children.'],
      ['L[new] = insert(L[node], a, mid, pos, val)', 'if (pos <= mid) L[created] = insert(L[node], a, mid, pos, val)', 'Only the child on the key’s path is replaced by a new copy; the other child is shared with the old version.'],
      ['return max(query(L[node], a, mid, l, r), query(R[node], mid + 1, b, l, r))', 'return Math.max(query(L[node], a, mid, l, r), query(R[node], mid + 1, b, l, r))', 'An ordinary range-maximum query, on whichever version it is given.'],
      ['base = root[parent[v]] if parent[v] >= 0 else 0', 'const base = parent[v] >= 0 ? root[parent[v]] : 0', 'Node v’s version starts from its parent’s, which holds exactly the parent’s ancestors.'],
      ['root[v] = insert(base, 0, K - 1, key[v], weight[v])', 'root[v] = insert(base, 0, K - 1, key[v], weight[v])', 'Add v itself: about log K new nodes. Siblings start from the same parent version without disturbing each other.'],
    ],
    math: [
      ['version(v) = version(parent) + {v}', 'root[v]', 'root[v]', 'the root of v’s version'],
      ['O(log K) new nodes per version', 'M.append', 'M.push', 'the path copied by an insertion'],
    ],
  },

  'dynamic-dp': {
    code: CODE['dynamic-dp'],
    notes: [
      ['return [[0, NEG], [NEG, x]]', 'const leaf = x => [[0, -Infinity], [-Infinity, x]]', 'One house: best[s][t] with s, t saying whether its first and last house (the same one) is taken. Taken and not taken at once is impossible.'],
      ['return [[max(A[s][p] + B[q][t] for p in (0, 1) for q in (0, 1) if not (p and q)) for t in (0, 1)] for s in (0, 1)]', 'if (!(p && q)) best = Math.max(best, A[s][p] + B[q][t])', 'Join two segments: the left’s last house p and the right’s first house q must not both be taken. A (max, +) matrix product.'],
      ['tree[i] = combine(tree[2 * i], tree[2 * i + 1])', 'tree[i] = combine(tree[2 * i], tree[2 * i + 1])', 'Each node of the segment tree summarises its range, built from its two halves.'],
      ['tree[j] = leaf(x)', 'tree[j] = leaf(x)', 'An update replaces one leaf…'],
      ['tree[j] = combine(tree[2 * j], tree[2 * j + 1])', 'while (j) { tree[j] = combine(tree[2 * j], tree[2 * j + 1]); j >>= 1 }', '…and the log n summaries above it, in the right left-to-right order.'],
      ['total += max(max(row) for row in tree[1])', 'total += Math.max(...tree[1].flat())', 'The answer is the root’s best entry, whatever the ends.'],
    ],
    math: [
      ['S[s][t]', 'A[s][p]', 'A[s][p]', 'a segment’s best sum with its first house s and last house t taken or not'],
      ['S = S_left ⊗ S_right', 'combine', 'combine', 'the (max, +) product, skipping two adjacent taken houses'],
    ],
  },

  'tree-automata': {
    code: CODE['tree-automata'],
    notes: [
      ['for v in order:', 'for (let i = 0; i < order.length; i++) order.push(...kids[order[i]])', 'A breadth-first order from the root; read backwards, every child comes before its parent.'],
      ['ways[v] = [1, 1]', 'if (!kids[v].length) { ways[v] = [1n, 1n]; continue }', 'A leaf is labelled 0 or 1: one way to evaluate to each.'],
      ['for op in ops:', 'for (const op of ops) {', 'Each allowed operation is a separate labelling of this node.'],
      ['s = f[op](x, y)', 'const s = f[op](x, y)', 'The automaton’s transition: the node’s state is the operation applied to its children’s states.'],
      ['w[s] = (w[s] + ways[a][x] * ways[b][y]) % M', 'w[s] = (w[s] + ways[a][x] * ways[b][y]) % M', 'The two subtrees are labelled independently, so their counts multiply; different (op, x, y) add.'],
      ['return ways[0][1]', 'return Number(ways[0][1])', 'The labellings of the whole tree that the root accepts: value 1.'],
    ],
    math: [
      ['N(v, s)', 'ways[v]', 'ways[v]', 'the labellings of v’s subtree making it evaluate to s'],
      ['δ(op, x, y)', 'f[op](x, y)', 'f[op](x, y)', 'the transition of the tree automaton'],
    ],
  },

  'proof-checklist': {
    code: CODE['proof-checklist'],
    notes: [
      ['one = [0] * (W + 1)', 'const one = new Array(W + 1).fill(0), many = new Array(W + 1).fill(0)', 'Two tables, one per problem; best[c] is the best value with capacity c.'],
      ['for c in range(W, w - 1, -1):', 'for (let c = W; c >= w; c--) one[c] = Math.max(one[c], one[c - w] + v)', 'The 0/1 invariant: going down, one[c − w] has not seen this item yet, so it is used at most once.'],
      ['for c in range(w, W + 1):', 'for (let c = w; c <= W; c++) many[c] = Math.max(many[c], many[c - w] + v)', 'The unbounded invariant: going up, many[c − w] may already include this item, so it can be used again.'],
      ['return [one[W], many[W]]', 'return [one[W], many[W]]', 'The two answers differ exactly when reusing an item helps, a small counterexample to a wrong loop direction.'],
    ],
    math: [
      ['B₀₁(c) = max(B(c), B(c − w) + v), c descending', 'one[c - w]', 'one[c - w]', 'reads the table before this item'],
      ['B_∞(c) = max(B(c), B(c − w) + v), c ascending', 'many[c - w]', 'many[c - w]', 'reads the table with this item already allowed'],
    ],
  },
}
