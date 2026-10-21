// Reference solutions explained line by line for the bitmask lessons (Advanced, subsets group). Format:
// explained.js. Item or vertex i is bit i of a mask.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SUBSET_EXPLAINED = {
  'bitmask-basics': {
    code: pair(`def solve(weights, limit):
    n = len(weights)
    total = [0] * (1 << n)
    count = 1 if limit >= 0 else 0
    for mask in range(1, 1 << n):
        low = mask & -mask
        total[mask] = total[mask ^ low] + weights[low.bit_length() - 1]
        if total[mask] <= limit:
            count += 1
    return count
`, `function solve(weights, limit) {
  const n = weights.length
  const total = new Array(1 << n).fill(0)
  let count = limit >= 0 ? 1 : 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask
    total[mask] = total[mask ^ low] + weights[31 - Math.clz32(low)]
    if (total[mask] <= limit) count++
  }
  return count
}
`),
    notes: [
      ['total = [0] * (1 << n)', 'const total = new Array(1 << n).fill(0)', '1 << n is 2ⁿ: one entry per subset. total[mask] will be the weight of the subset whose items are mask’s 1 bits.'],
      ['count = 1 if limit >= 0', 'let count = limit >= 0 ? 1 : 0', 'The empty subset (mask 0) weighs 0.'],
      ['low = mask & -mask', 'const low = mask & -mask', 'In two’s complement, mask & −mask keeps only the lowest 1 bit: the lowest item in the subset.'],
      ['total[mask] = total[mask ^ low]', 'total[mask] = total[mask ^ low]', 'mask ^ low removes that item. It is a smaller number, so its total is already filled; add the item’s weight.'],
      ['low.bit_length() - 1', '31 - Math.clz32(low)', 'Which item that bit is: its position.'],
      ['if total[mask] <= limit:', 'if (total[mask] <= limit) count++', 'Count every subset within the limit.'],
    ],
    math: [
      ['T(S)', 'total[mask]', 'total[mask]', 'the weight of the subset S = mask'],
      ['T(S − {i}) + wᵢ', 'total[mask ^ low]', 'total[mask ^ low]', 'remove the lowest item, then add it back'],
    ],
  },

  'subset-enumeration': {
    code: pair(`def solve(values):
    out = []
    for mask in range(len(values)):
        total, sub = 0, mask
        while True:
            total += values[sub]
            if sub == 0:
                break
            sub = (sub - 1) & mask
        out.append(total)
    return out
`, `function solve(values) {
  const out = []
  for (let mask = 0; mask < values.length; mask++) {
    let total = 0, sub = mask
    while (true) {
      total += values[sub]
      if (sub === 0) break
      sub = (sub - 1) & mask
    }
    out.push(total)
  }
  return out
}
`),
    notes: [
      ['total, sub = 0, mask', 'let total = 0, sub = mask', 'Start with the largest submask, mask itself.'],
      ['total += values[sub]', 'total += values[sub]', 'Every submask visited is added once.'],
      ['if sub == 0:', 'if (sub === 0) break', 'The empty submask is the last one; stop after counting it, or (0 − 1) & mask would start over at mask.'],
      ['sub = (sub - 1) & mask', 'sub = (sub - 1) & mask', 'Subtracting 1 flips the lowest 1 bit and everything below it; & mask throws away the bits outside mask. The result is the next smaller submask.'],
    ],
    math: [
      ['f(m) = Σ v(s) for s ⊆ m', 'total += values[sub]', 'total += values[sub]', 'sum over every submask'],
      ['next submask', '(sub - 1) & mask', '(sub - 1) & mask', 'the largest submask smaller than sub'],
    ],
  },

  'assignment': {
    code: pair(`def solve(cost):
    n = len(cost)
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    for mask in range(1 << n):
        w = bin(mask).count('1')
        if D[mask] == INF or w == n:
            continue
        for j in range(n):
            if not mask & (1 << j):
                D[mask | 1 << j] = min(D[mask | 1 << j], D[mask] + cost[w][j])
    return D[(1 << n) - 1]
`, `function solve(cost) {
  const n = cost.length
  const D = new Array(1 << n).fill(Infinity)
  D[0] = 0
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0
    for (let x = mask; x; x &= x - 1) w++
    if (D[mask] === Infinity || w === n) continue
    for (let j = 0; j < n; j++) {
      if (!(mask & (1 << j))) D[mask | (1 << j)] = Math.min(D[mask | (1 << j)], D[mask] + cost[w][j])
    }
  }
  return D[(1 << n) - 1]
}
`),
    notes: [
      ['D = [INF] * (1 << n)', 'const D = new Array(1 << n).fill(Infinity)', 'D[mask]: the cheapest way to hand out exactly the jobs in mask to the first workers.'],
      ['D[0] = 0', 'D[0] = 0', 'No jobs given out yet, no cost.'],
      ["w = bin(mask).count('1')", 'for (let x = mask; x; x &= x - 1) w++', 'The number of jobs used is the number of workers already served, so the next worker is number w.'],
      ['if not mask & (1 << j):', 'if (!(mask & (1 << j)))', 'Only jobs not yet taken.'],
      ['D[mask] + cost[w][j]', 'D[mask] + cost[w][j]', 'Give worker w job j. Every mask leads only to larger masks, so increasing order fills each one before it is used.'],
      ['return D[(1 << n) - 1]', 'return D[(1 << n) - 1]', 'All n jobs given out: (1 << n) − 1 has every bit set.'],
    ],
    math: [
      ['D(S)', 'D[mask]', 'D[mask]', 'the cheapest assignment of the jobs in S to the first |S| workers'],
      ['D(S) + c(|S|, j)', 'D[mask] + cost[w][j]', 'D[mask] + cost[w][j]', 'the next worker takes job j'],
    ],
  },

  'held-karp': {
    code: pair(`def solve(dist):
    n = len(dist)
    if n == 1:
        return 0
    INF = float('inf')
    D = [[INF] * n for _ in range(1 << n)]
    D[1][0] = 0
    for mask in range(1, 1 << n, 2):
        for v in range(n):
            if D[mask][v] == INF:
                continue
            for u in range(n):
                if not mask & (1 << u):
                    nxt = mask | 1 << u
                    D[nxt][u] = min(D[nxt][u], D[mask][v] + dist[v][u])
    full = (1 << n) - 1
    return min(D[full][v] + dist[v][0] for v in range(1, n))
`, `function solve(dist) {
  const n = dist.length
  if (n === 1) return 0
  const D = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity))
  D[1][0] = 0
  for (let mask = 1; mask < 1 << n; mask += 2) {
    for (let v = 0; v < n; v++) {
      if (D[mask][v] === Infinity) continue
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u))) {
          const nxt = mask | (1 << u)
          D[nxt][u] = Math.min(D[nxt][u], D[mask][v] + dist[v][u])
        }
      }
    }
  }
  const full = (1 << n) - 1
  let best = Infinity
  for (let v = 1; v < n; v++) best = Math.min(best, D[full][v] + dist[v][0])
  return best
}
`),
    notes: [
      ['D = [[INF] * n', 'const D = Array.from', 'D[mask][v]: the cheapest path from city 0 that visits exactly the cities in mask and ends at v.'],
      ['D[1][0] = 0', 'D[1][0] = 0', 'Only city 0 visited (mask 1), standing at 0.'],
      ['range(1, 1 << n, 2)', 'mask += 2', 'Odd masks only: every path contains city 0, bit 0.'],
      ['if not mask & (1 << u):', 'if (!(mask & (1 << u)))', 'Go next to a city not yet visited.'],
      ['D[mask][v] + dist[v][u]', 'D[mask][v] + dist[v][u]', 'The path so far, then the step from v to u. Only the end v matters, not the order the others were visited in.'],
      ['D[full][v] + dist[v][0]', 'D[full][v] + dist[v][0]', 'Every city visited, then the return to 0.'],
    ],
    math: [
      ['D(S, v)', 'D[mask][v]', 'D[mask][v]', 'the cheapest path from 0 through exactly S, ending at v'],
      ['D(S, v) + d(v, u)', 'D[mask][v] + dist[v][u]', 'D[mask][v] + dist[v][u]', 'extend the path to u'],
    ],
  },

  'hamiltonian': {
    code: pair(`def solve(n, edges):
    out = [[] for _ in range(n)]
    for a, b in edges:
        out[a].append(b)
    C = [[0] * n for _ in range(1 << n)]
    C[1][0] = 1
    for mask in range(1, 1 << n, 2):
        for v in range(n):
            if C[mask][v]:
                for u in out[v]:
                    if not mask & (1 << u):
                        C[mask | 1 << u][u] += C[mask][v]
    return sum(C[(1 << n) - 1])
`, `function solve(n, edges) {
  const out = Array.from({ length: n }, () => [])
  for (const [a, b] of edges) out[a].push(b)
  const C = Array.from({ length: 1 << n }, () => new Array(n).fill(0))
  C[1][0] = 1
  for (let mask = 1; mask < 1 << n; mask += 2) {
    for (let v = 0; v < n; v++) {
      if (!C[mask][v]) continue
      for (const u of out[v]) {
        if (!(mask & (1 << u))) C[mask | (1 << u)][u] += C[mask][v]
      }
    }
  }
  return C[(1 << n) - 1].reduce((s, x) => s + x, 0)
}
`),
    notes: [
      ['C = [[0] * n', 'const C = Array.from', 'C[mask][v]: how many paths from 0 visit exactly the vertices in mask and end at v.'],
      ['C[1][0] = 1', 'C[1][0] = 1', 'The path that is just vertex 0.'],
      ['for u in out[v]:', 'for (const u of out[v])', 'Follow each edge out of v.'],
      ['C[mask | 1 << u][u] += C[mask][v]', 'C[mask | (1 << u)][u] += C[mask][v]', 'Each such path extends to one path ending at u. Counts add, where Held–Karp took a minimum.'],
      ['return sum(C[(1 << n) - 1])', 'return C[(1 << n) - 1].reduce', 'Every vertex visited, ending anywhere.'],
    ],
    math: [
      ['C(S, v)', 'C[mask][v]', 'C[mask][v]', 'paths from 0 through exactly S, ending at v'],
      ['Σ C(S, v) over edges v → u', 'C[mask | 1 << u][u] += C[mask][v]', 'C[mask | (1 << u)][u] += C[mask][v]', 'paths ending at u, split by their last step'],
    ],
  },

  'subset-partition': {
    code: pair(`def solve(values, cap):
    n = len(values)
    total = [0] * (1 << n)
    for mask in range(1, 1 << n):
        low = mask & -mask
        total[mask] = total[mask ^ low] + values[low.bit_length() - 1]
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    for mask in range(1, 1 << n):
        low = mask & -mask
        rest = mask ^ low
        sub = rest
        while True:
            block = sub | low
            if total[block] <= cap:
                D[mask] = min(D[mask], D[mask ^ block] + 1)
            if sub == 0:
                break
            sub = (sub - 1) & rest
    return D[(1 << n) - 1]
`, `function solve(values, cap) {
  const n = values.length
  const total = new Array(1 << n).fill(0)
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask
    total[mask] = total[mask ^ low] + values[31 - Math.clz32(low)]
  }
  const D = new Array(1 << n).fill(Infinity)
  D[0] = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, rest = mask ^ low
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const block = sub | low
      if (total[block] <= cap) D[mask] = Math.min(D[mask], D[mask ^ block] + 1)
      if (sub === 0) break
    }
  }
  return D[(1 << n) - 1]
}
`),
    notes: [
      ['total[mask] = total[mask ^ low]', 'total[mask] = total[mask ^ low]', 'Every subset’s total, from the subset without its lowest item.'],
      ['D[0] = 0', 'D[0] = 0', 'No items need no bins at all.'],
      ['rest = mask ^ low', 'rest = mask ^ low', 'Some bin holds mask’s lowest item. Fixing that bit means each packing is built once, not once per order of its bins.'],
      ['block = sub | low', 'const block = sub | low', 'A candidate bin: the lowest item plus any of the others.'],
      ['if total[block] <= cap:', 'if (total[block] <= cap)', 'Only bins whose items fit under cap.'],
      ['D[mask ^ block] + 1', 'D[mask ^ block] + 1', 'This bin, plus the best packing of what is left (a smaller mask, already filled).'],
    ],
    math: [
      ['D(S)', 'D[mask]', 'D[mask]', 'the fewest bins for the items in S'],
      ['1 + D(S − B)', 'D[mask ^ block] + 1', 'D[mask ^ block] + 1', 'bin B holds S’s lowest item'],
    ],
  },

  'subset-cover': {
    code: pair(`def solve(n, options):
    INF = float('inf')
    D = [INF] * (1 << n)
    D[0] = 0
    masks = [(sum(1 << i for i in items), c) for items, c in options]
    for mask in range(1 << n):
        if D[mask] == INF:
            continue
        for om, c in masks:
            D[mask | om] = min(D[mask | om], D[mask] + c)
    full = (1 << n) - 1
    return -1 if D[full] == INF else D[full]
`, `function solve(n, options) {
  const D = new Array(1 << n).fill(Infinity)
  D[0] = 0
  const masks = options.map(([items, c]) => [items.reduce((m, i) => m | (1 << i), 0), c])
  for (let mask = 0; mask < 1 << n; mask++) {
    if (D[mask] === Infinity) continue
    for (const [om, c] of masks) D[mask | om] = Math.min(D[mask | om], D[mask] + c)
  }
  const full = (1 << n) - 1
  return D[full] === Infinity ? -1 : D[full]
}
`),
    notes: [
      ['D = [INF] * (1 << n)', 'const D = new Array(1 << n).fill(Infinity)', 'D[mask]: the cheapest purchase whose items together are exactly mask.'],
      ['masks = [(sum(1 << i', 'const masks = options.map', 'Turn each option’s item list into a mask once.'],
      ['D[mask | om] = min(D[mask | om], D[mask] + c)', 'D[mask | om] = Math.min(D[mask | om], D[mask] + c)', 'Buying an option ORs in its items. mask | om is never smaller than mask, so increasing order has every mask final before it is used.'],
      ['return -1 if D[full] == INF', 'return D[full] === Infinity ? -1', 'If no purchase covers everything, report −1.'],
    ],
    math: [
      ['D(S)', 'D[mask]', 'D[mask]', 'the cheapest purchase covering exactly S'],
      ['D(S ∪ O) ≤ D(S) + c', 'D[mask] + c', 'D[mask] + c', 'buy option O'],
    ],
  },

  'steiner-tree': {
    code: pair(`def solve(n, edges, terminals):
    INF = float('inf')
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for a, b, w in edges:
        dist[a][b] = dist[b][a] = min(dist[a][b], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    t = len(terminals)
    D = [[INF] * n for _ in range(1 << t)]
    for i, x in enumerate(terminals):
        for v in range(n):
            D[1 << i][v] = dist[x][v]
    for mask in range(1, 1 << t):
        if mask & (mask - 1) == 0:
            continue
        for v in range(n):
            sub = (mask - 1) & mask
            while sub:
                D[mask][v] = min(D[mask][v], D[sub][v] + D[mask ^ sub][v])
                sub = (sub - 1) & mask
        joined = D[mask][:]
        for v in range(n):
            D[mask][v] = min(joined[u] + dist[u][v] for u in range(n))
    return min(D[(1 << t) - 1])
`, `function solve(n, edges, terminals) {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)))
  for (const [a, b, w] of edges) dist[a][b] = dist[b][a] = Math.min(dist[a][b], w)
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])
  const t = terminals.length
  const D = Array.from({ length: 1 << t }, () => new Array(n).fill(Infinity))
  terminals.forEach((x, i) => { for (let v = 0; v < n; v++) D[1 << i][v] = dist[x][v] })
  for (let mask = 1; mask < 1 << t; mask++) {
    if ((mask & (mask - 1)) === 0) continue
    for (let v = 0; v < n; v++) {
      for (let sub = (mask - 1) & mask; sub; sub = (sub - 1) & mask) D[mask][v] = Math.min(D[mask][v], D[sub][v] + D[mask ^ sub][v])
    }
    const joined = D[mask].slice()
    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) D[mask][v] = Math.min(D[mask][v], joined[u] + dist[u][v])
  }
  return Math.min(...D[(1 << t) - 1])
}
`),
    notes: [
      ['dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])', 'dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])', 'Shortest distances between all pairs first (Floyd–Warshall).'],
      ['D[1 << i][v] = dist[x][v]', 'D[1 << i][v] = dist[x][v]', 'One terminal joined to v: the shortest path between them.'],
      ['if mask & (mask - 1) == 0:', 'if ((mask & (mask - 1)) === 0) continue', 'A mask with one bit is already done.'],
      ['D[sub][v] + D[mask ^ sub][v]', 'D[sub][v] + D[mask ^ sub][v]', 'At v the tree may branch: one part joins the terminals in sub, the other the rest, both reaching v.'],
      ['joined = D[mask][:]', 'const joined = D[mask].slice()', 'The branching values, kept fixed while v moves.'],
      ['joined[u] + dist[u][v]', 'joined[u] + dist[u][v]', 'Or the tree branches at u and a shortest path runs from u to v.'],
      ['return min(D[(1 << t) - 1])', 'return Math.min(...D[(1 << t) - 1])', 'All terminals joined; the extra vertex v can be any vertex, so take the best.'],
    ],
    math: [
      ['D(S, v)', 'D[mask][v]', 'D[mask][v]', 'the lightest tree joining the terminals in S and vertex v'],
      ['D(A, v) + D(S − A, v)', 'D[sub][v] + D[mask ^ sub][v]', 'D[sub][v] + D[mask ^ sub][v]', 'branching at v'],
    ],
  },

  'subset-topological': {
    code: pair(`def solve(n, edges):
    need = [0] * n
    for a, b in edges:
        need[b] |= 1 << a
    C = [0] * (1 << n)
    C[0] = 1
    for mask in range(1 << n):
        if C[mask]:
            for v in range(n):
                if not mask & (1 << v) and need[v] & mask == need[v]:
                    C[mask | 1 << v] += C[mask]
    return C[(1 << n) - 1]
`, `function solve(n, edges) {
  const need = new Array(n).fill(0)
  for (const [a, b] of edges) need[b] |= 1 << a
  const C = new Array(1 << n).fill(0)
  C[0] = 1
  for (let mask = 0; mask < 1 << n; mask++) {
    if (!C[mask]) continue
    for (let v = 0; v < n; v++) {
      if (!(mask & (1 << v)) && (need[v] & mask) === need[v]) C[mask | (1 << v)] += C[mask]
    }
  }
  return C[(1 << n) - 1]
}
`),
    notes: [
      ['need[b] |= 1 << a', 'need[b] |= 1 << a', 'need[v]: the mask of vertices that must come before v.'],
      ['C[0] = 1', 'C[0] = 1', 'One way to have placed nothing.'],
      ['need[v] & mask == need[v]', '(need[v] & mask) === need[v]', 'v may come next only if all its prerequisites are already placed: need[v] is inside mask. (In Python, == binds looser than &, so this reads (need[v] & mask) == need[v].)'],
      ['C[mask | 1 << v] += C[mask]', 'C[mask | (1 << v)] += C[mask]', 'Each order of mask extends by v. Only the set placed matters for what can come next, not its order.'],
      ['return C[(1 << n) - 1]', 'return C[(1 << n) - 1]', 'Every vertex placed: the full mask.'],
    ],
    math: [
      ['C(S)', 'C[mask]', 'C[mask]', 'the valid orders that place exactly S first'],
      ['pre(v) ⊆ S', 'need[v] & mask == need[v]', '(need[v] & mask) === need[v]', 'v’s prerequisites are placed'],
    ],
  },

  'subset-matching': {
    code: pair(`def solve(n, edges):
    adj = [0] * n
    for a, b in edges:
        adj[a] |= 1 << b
        adj[b] |= 1 << a
    D = [0] * (1 << n)
    D[0] = 1
    for mask in range(1, 1 << n):
        low = mask & -mask
        v = low.bit_length() - 1
        rest = mask ^ low
        for u in range(n):
            if rest & adj[v] & (1 << u):
                D[mask] += D[rest ^ (1 << u)]
    return D[(1 << n) - 1]
`, `function solve(n, edges) {
  const adj = new Array(n).fill(0)
  for (const [a, b] of edges) {
    adj[a] |= 1 << b
    adj[b] |= 1 << a
  }
  const D = new Array(1 << n).fill(0)
  D[0] = 1
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, v = 31 - Math.clz32(low), rest = mask ^ low
    for (let u = 0; u < n; u++) {
      if (rest & adj[v] & (1 << u)) D[mask] += D[rest ^ (1 << u)]
    }
  }
  return D[(1 << n) - 1]
}
`),
    notes: [
      ['adj[a] |= 1 << b', 'adj[a] |= 1 << b', 'adj[v]: the mask of v’s neighbours.'],
      ['D[0] = 1', 'D[0] = 1', 'The empty vertex set has one perfect matching: no edges.'],
      ['v = low.bit_length() - 1', 'v = 31 - Math.clz32(low)', 'The lowest vertex in mask must be matched to someone. Choosing it, not any vertex, means each matching is counted once.'],
      ['if rest & adj[v] & (1 << u):', 'if (rest & adj[v] & (1 << u))', 'u must be in the set and joined to v.'],
      ['D[mask] += D[rest ^ (1 << u)]', 'D[mask] += D[rest ^ (1 << u)]', 'Match v with u, then match the rest: a smaller mask, already filled.'],
    ],
    math: [
      ['D(S)', 'D[mask]', 'D[mask]', 'perfect matchings of the vertices in S'],
      ['Σ D(S − {v, u})', 'D[rest ^ (1 << u)]', 'D[rest ^ (1 << u)]', 'over neighbours u of S’s lowest vertex v'],
    ],
  },

  'subset-coloring': {
    code: pair(`def solve(n, edges):
    adj = [0] * n
    for a, b in edges:
        adj[a] |= 1 << b
        adj[b] |= 1 << a
    free = [True] * (1 << n)
    for mask in range(1, 1 << n):
        low = mask & -mask
        v = low.bit_length() - 1
        free[mask] = free[mask ^ low] and not adj[v] & mask
    D = [0] + [n] * ((1 << n) - 1)
    for mask in range(1, 1 << n):
        low = mask & -mask
        rest = mask ^ low
        sub = rest
        while True:
            if free[sub | low]:
                D[mask] = min(D[mask], D[rest ^ sub] + 1)
            if sub == 0:
                break
            sub = (sub - 1) & rest
    return D[(1 << n) - 1]
`, `function solve(n, edges) {
  const adj = new Array(n).fill(0)
  for (const [a, b] of edges) {
    adj[a] |= 1 << b
    adj[b] |= 1 << a
  }
  const free = new Array(1 << n).fill(true)
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, v = 31 - Math.clz32(low)
    free[mask] = free[mask ^ low] && !(adj[v] & mask)
  }
  const D = new Array(1 << n).fill(n)
  D[0] = 0
  for (let mask = 1; mask < 1 << n; mask++) {
    const low = mask & -mask, rest = mask ^ low
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      if (free[sub | low]) D[mask] = Math.min(D[mask], D[rest ^ sub] + 1)
      if (sub === 0) break
    }
  }
  return D[(1 << n) - 1]
}
`),
    notes: [
      ['free = [True] * (1 << n)', 'const free = new Array(1 << n).fill(true)', 'free[mask]: no edge joins two vertices of mask, so they may share a colour.'],
      ['free[mask] = free[mask ^ low] and not adj[v] & mask', 'free[mask] = free[mask ^ low] && !(adj[v] & mask)', 'A set is independent when the set without its lowest vertex v is, and v has no neighbour in the set.'],
      ['D = [0] + [n]', 'D[0] = 0', 'No vertices, no colours; every other entry starts at n, always enough.'],
      ['if free[sub | low]:', 'if (free[sub | low])', 'One colour class: the lowest vertex plus any others it can share a colour with.'],
      ['D[rest ^ sub] + 1', 'D[rest ^ sub] + 1', 'That colour, plus the best colouring of what is left.'],
    ],
    math: [
      ['χ(S)', 'D[mask]', 'D[mask]', 'the fewest colours for the vertices in S'],
      ['1 + χ(S − I)', 'D[rest ^ sub] + 1', 'D[rest ^ sub] + 1', 'colour class I holds S’s lowest vertex'],
    ],
  },

  'mask-language': {
    code: pair(`def solve(sets):
    x = 0
    for s in sets:
        m = 0
        for p in s:
            m |= 1 << p
        x ^= m
    return str(x)
`, `function solve(sets) {
  let x = 0n
  for (const s of sets) {
    let m = 0n
    for (const p of s) m |= 1n << BigInt(p)
    x ^= m
  }
  return x.toString()
}
`),
    notes: [
      ['x = 0', 'let x = 0n', 'In JavaScript, ordinary numbers do bitwise work in 32 bits, so a 100-bit mask needs BigInt (the n suffix). Python integers are already unbounded.'],
      ['m |= 1 << p', 'm |= 1n << BigInt(p)', 'Set bit p. Both operands must be BigInt in JavaScript: mixing 1 and 1n is an error.'],
      ['x ^= m', 'x ^= m', 'XOR keeps a bit when an odd number of sets have it.'],
      ['return str(x)', 'return x.toString()', 'A decimal string: JSON numbers can’t carry a 100-bit integer exactly.'],
    ],
    math: [
      ['M(s) = Σ 2ᵖ', 'm |= 1 << p', 'm |= 1n << BigInt(p)', 'a set as a mask'],
      ['M₁ ⊕ M₂ ⊕ …', 'x ^= m', 'x ^= m', 'the XOR of every mask'],
    ],
  },
}
