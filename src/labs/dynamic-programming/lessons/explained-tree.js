// Reference solutions explained line by line for the tree lessons (Advanced, trees group). Format:
// explained.js. Every solution roots the tree at 0 with the same helper, then visits children before
// parents by walking a breadth-first order backwards.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const rootPy = `def rooted(n, edges):
    adj = [[] for _ in range(n)]
    for e in edges:
        adj[e[0]].append(e[1])
        adj[e[1]].append(e[0])
    parent = [-1] * n
    order = [0]
    for v in order:
        for u in adj[v]:
            if u != parent[v]:
                parent[u] = v
                order.append(u)
    return parent, order

`
const rootJs = `function rooted(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const e of edges) {
    adj[e[0]].push(e[1])
    adj[e[1]].push(e[0])
  }
  const parent = Array(n).fill(-1), order = [0]
  for (let i = 0; i < order.length; i++) {
    for (const u of adj[order[i]]) {
      if (u !== parent[order[i]]) {
        parent[u] = order[i]
        order.push(u)
      }
    }
  }
  return [parent, order]
}

`
const rootNotes = [
  ['adj = [[] for _', 'const adj = Array.from', 'Each edge is stored both ways: the input doesn’t say which end is the parent.'],
  ['if u != parent[v]:', 'if (u !== parent[order[i]])', 'Every neighbour except the parent is a child. This is the “ignore the parent edge” rule that turns an undirected tree into a rooted one.'],
  ['order.append(u)', 'order.push(u)', 'order lists every parent before its children (breadth first), so walking it backwards visits children first.'],
]

export const TREE_EXPLAINED = {
  'tree-basics': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    size = [1] * n
    for v in reversed(order):
        if parent[v] >= 0:
            size[parent[v]] += size[v]
    return size
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const size = Array(n).fill(1)
  for (const v of [...order].reverse()) {
    if (parent[v] >= 0) size[parent[v]] += size[v]
  }
  return size
}
`),
    notes: [
      ...rootNotes,
      ['size = [1] * n', 'const size = Array(n).fill(1)', 'Every subtree contains at least its own root.'],
      ['for v in reversed(order):', 'for (const v of [...order].reverse())', 'Children before parents: when v is reached, its size is final.'],
      ['size[parent[v]] += size[v]', 'size[parent[v]] += size[v]', 'v’s whole subtree belongs to its parent’s. Children’s subtrees don’t overlap, so the sizes add.'],
    ],
    math: [
      ['size(v)', 'size[v]', 'size[v]', 'the number of vertices in v’s subtree'],
      ['1 + Σ size(child)', 'size[parent[v]] += size[v]', 'size[parent[v]] += size[v]', 'the root plus its children’s subtrees'],
    ],
  },

  'tree-independent': {
    code: pair(`${rootPy}def solve(weights, edges):
    n = len(weights)
    parent, order = rooted(n, edges)
    take, skip = weights[:], [0] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            take[p] += skip[v]
            skip[p] += max(take[v], skip[v])
    return max(take[0], skip[0])
`, `${rootJs}function solve(weights, edges) {
  const n = weights.length
  const [parent, order] = rooted(n, edges)
  const take = weights.slice(), skip = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) {
      take[p] += skip[v]
      skip[p] += Math.max(take[v], skip[v])
    }
  }
  return Math.max(take[0], skip[0])
}
`),
    notes: [
      ...rootNotes,
      ['take, skip = weights[:]', 'const take = weights.slice()', 'take[v]: the best for v’s subtree with v chosen (it starts with v’s own weight); skip[v]: with v not chosen.'],
      ['take[p] += skip[v]', 'take[p] += skip[v]', 'If the parent is chosen, its child may not be.'],
      ['skip[p] += max(take[v], skip[v])', 'skip[p] += Math.max(take[v], skip[v])', 'If the parent is not chosen, each child is free: take its better state. Once the parent’s state is fixed, the children’s subtrees don’t affect each other.'],
      ['return max(take[0], skip[0])', 'return Math.max(take[0], skip[0])', 'The root is chosen or not.'],
    ],
    math: [
      ['Take(v)', 'take[v]', 'take[v]', 'the best with v chosen'],
      ['Skip(v)', 'skip[v]', 'skip[v]', 'the best with v not chosen'],
      ['max(Take(c), Skip(c))', 'max(take[v], skip[v])', 'Math.max(take[v], skip[v])', 'a free child takes its better state'],
    ],
  },

  'tree-cover': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    chosen, unchosen = [1] * n, [0] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            chosen[p] += min(chosen[v], unchosen[v])
            unchosen[p] += chosen[v]
    return min(chosen[0], unchosen[0])
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const chosen = Array(n).fill(1), unchosen = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) {
      chosen[p] += Math.min(chosen[v], unchosen[v])
      unchosen[p] += chosen[v]
    }
  }
  return Math.min(chosen[0], unchosen[0])
}
`),
    notes: [
      ...rootNotes,
      ['chosen, unchosen = [1] * n', 'const chosen = Array(n).fill(1)', 'chosen[v] counts v itself; unchosen[v] starts at 0.'],
      ['chosen[p] += min(chosen[v], unchosen[v])', 'chosen[p] += Math.min(chosen[v], unchosen[v])', 'A chosen parent covers the edge to v, so v may go either way: the smaller.'],
      ['unchosen[p] += chosen[v]', 'unchosen[p] += chosen[v]', 'An unchosen parent leaves the edge to v uncovered, so v must be chosen.'],
      ['return min(chosen[0], unchosen[0])', 'return Math.min(chosen[0], unchosen[0])', 'The root may go either way.'],
    ],
    math: [
      ['S(v)', 'chosen[v]', 'chosen[v]', 'the smallest cover of v’s subtree with v chosen'],
      ['U(v)', 'unchosen[v]', 'unchosen[v]', 'the smallest with v not chosen'],
    ],
  },

  'tree-matching': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    free, best, gain = [0] * n, [0] * n, [None] * n
    for v in reversed(order):
        if gain[v] is None:
            best[v] = free[v]
        else:
            best[v] = max(free[v], free[v] + gain[v])
        p = parent[v]
        if p >= 0:
            free[p] += best[v]
            g = free[v] + 1 - best[v]
            if gain[p] is None or g > gain[p]:
                gain[p] = g
    return best[0]
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const free = Array(n).fill(0), best = Array(n).fill(0), gain = Array(n).fill(null)
  for (const v of [...order].reverse()) {
    if (gain[v] === null) best[v] = free[v]
    else best[v] = Math.max(free[v], free[v] + gain[v])
    const p = parent[v]
    if (p >= 0) {
      free[p] += best[v]
      const g = free[v] + 1 - best[v]
      if (gain[p] === null || g > gain[p]) gain[p] = g
    }
  }
  return best[0]
}
`),
    notes: [
      ...rootNotes,
      ['free, best, gain =', 'const free = Array(n).fill(0)', 'free[v]: the best in v’s subtree with v unmatched. best[v]: with v matched or not. gain[v]: the most that matching v to one of its children adds.'],
      ['best[v] = free[v]', 'best[v] = free[v]', 'A leaf has no child to match with.'],
      ['best[v] = max(free[v], free[v] + gain[v])', 'best[v] = Math.max(free[v], free[v] + gain[v])', 'Leave v unmatched, or match it to its best child.'],
      ['free[p] += best[v]', 'free[p] += best[v]', 'With the parent unmatched, each child’s subtree does its best on its own.'],
      ['g = free[v] + 1 - best[v]', 'const g = free[v] + 1 - best[v]', 'Matching p to v adds the edge (1) but forces v to be free: free[v] instead of best[v].'],
      ['return best[0]', 'return best[0]', 'The best for the whole tree.'],
    ],
    math: [
      ['F(v)', 'free[v]', 'free[v]', 'the best matching in v’s subtree with v unmatched'],
      ['1 + F(c) − best(c)', 'free[v] + 1 - best[v]', 'free[v] + 1 - best[v]', 'what matching the parent to child c adds'],
    ],
  },

  'tree-diameter': {
    code: pair(`def solve(n, edges):
    adj = [[] for _ in range(n)]
    for a, b, w in edges:
        adj[a].append((b, w))
        adj[b].append((a, w))
    parent, up, order = [-1] * n, [0] * n, [0]
    for v in order:
        for u, w in adj[v]:
            if u != parent[v]:
                parent[u], up[u] = v, w
                order.append(u)
    down, best = [0] * n, 0
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            c = down[v] + up[v]
            best = max(best, down[p] + c)
            down[p] = max(down[p], c)
    return best
`, `function solve(n, edges) {
  const adj = Array.from({ length: n }, () => [])
  for (const [a, b, w] of edges) {
    adj[a].push([b, w])
    adj[b].push([a, w])
  }
  const parent = Array(n).fill(-1), up = Array(n).fill(0), order = [0]
  for (let i = 0; i < order.length; i++) {
    for (const [u, w] of adj[order[i]]) {
      if (u !== parent[order[i]]) {
        parent[u] = order[i]
        up[u] = w
        order.push(u)
      }
    }
  }
  const down = Array(n).fill(0)
  let best = 0
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p >= 0) {
      const c = down[v] + up[v]
      best = Math.max(best, down[p] + c)
      down[p] = Math.max(down[p], c)
    }
  }
  return best
}
`),
    notes: [
      ['parent, up, order =', 'const parent = Array(n).fill(-1)', 'Rooting at 0 as usual; up[u] remembers the length of the edge from u to its parent.'],
      ['down, best = [0] * n, 0', 'const down = Array(n).fill(0)', 'down[v]: the longest path from v down into its subtree. A leaf’s is 0.'],
      ['c = down[v] + up[v]', 'const c = down[v] + up[v]', 'The branch through v, seen from its parent: the edge up plus v’s deepest path.'],
      ['best = max(best, down[p] + c)', 'best = Math.max(best, down[p] + c)', 'A path whose highest point is p joins this branch to the deepest branch merged so far. Doing this before updating down[p] keeps the two branches different.'],
      ['down[p] = max(down[p], c)', 'down[p] = Math.max(down[p], c)', 'Then this branch may become p’s deepest.'],
      ['return best', 'return best', 'Every path has one highest vertex, so every path was tried there.'],
    ],
    math: [
      ['down(v)', 'down[v]', 'down[v]', 'the longest path from v down into its subtree'],
      ['down(p) + down(v) + w', 'down[p] + c', 'down[p] + c', 'two branches joined at p'],
    ],
  },

  'tree-reroot': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    down1, down2, via = [0] * n, [0] * n, [-1] * n
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            c = down1[v] + 1
            if c > down1[p]:
                down2[p], down1[p], via[p] = down1[p], c, v
            elif c > down2[p]:
                down2[p] = c
    up = [0] * n
    for v in order:
        p = parent[v]
        if p >= 0:
            other = down2[p] if via[p] == v else down1[p]
            up[v] = 1 + max(up[p], other)
    return [max(down1[v], up[v]) for v in range(n)]
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const down1 = Array(n).fill(0), down2 = Array(n).fill(0), via = Array(n).fill(-1)
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    const c = down1[v] + 1
    if (c > down1[p]) {
      down2[p] = down1[p]
      down1[p] = c
      via[p] = v
    } else if (c > down2[p]) down2[p] = c
  }
  const up = Array(n).fill(0)
  for (const v of order) {
    const p = parent[v]
    if (p < 0) continue
    const other = via[p] === v ? down2[p] : down1[p]
    up[v] = 1 + Math.max(up[p], other)
  }
  return down1.map((d, v) => Math.max(d, up[v]))
}
`),
    notes: [
      ...rootNotes,
      ['down1, down2, via =', 'const down1 = Array(n).fill(0)', 'For each vertex: its deepest branch down (down1), its second deepest (down2), and which child gives the deepest (via).'],
      ['c = down1[v] + 1', 'const c = down1[v] + 1', 'The message from child v to its parent: one edge plus v’s deepest branch.'],
      ['up = [0] * n', 'const up = Array(n).fill(0)', 'up[v]: the farthest distance from v going first to its parent. The root has nothing above it.'],
      ['other = down2[p] if via[p] == v else down1[p]', 'const other = via[p] === v ? down2[p] : down1[p]', 'The parent’s best branch that doesn’t come back down through v. That is why the second deepest is kept.'],
      ['up[v] = 1 + max(up[p], other)', 'up[v] = 1 + Math.max(up[p], other)', 'The message from parent to child: one edge to the parent, then its best way that avoids v.'],
      ['return [max(down1[v], up[v])', 'return down1.map((d, v) => Math.max(d, up[v]))', 'From v, the farthest vertex is down one of its branches or up through its parent.'],
    ],
    math: [
      ['down(v)', 'down1[v]', 'down1[v]', 'the farthest distance from v into its subtree'],
      ['up(v)', 'up[v]', 'up[v]', 'the farthest distance from v through its parent'],
    ],
  },

  'reroot-prefix': {
    code: pair(`${rootPy}def solve(n, edges):
    MOD = 1000000007
    parent, order = rooted(n, edges)
    children = [[] for _ in range(n)]
    for v in order[1:]:
        children[parent[v]].append(v)
    down = [1] * n
    for v in reversed(order):
        for c in children[v]:
            down[v] = down[v] * (1 + down[c]) % MOD
    up = [0] * n
    for v in order:
        ch = children[v]
        pre = [1] * (len(ch) + 1)
        for i, c in enumerate(ch):
            pre[i + 1] = pre[i] * (1 + down[c]) % MOD
        suf = [1] * (len(ch) + 1)
        for i in range(len(ch) - 1, -1, -1):
            suf[i] = suf[i + 1] * (1 + down[ch[i]]) % MOD
        for i, c in enumerate(ch):
            up[c] = pre[i] * suf[i + 1] % MOD * (1 + up[v]) % MOD
    return [down[v] * (1 + up[v]) % MOD for v in range(n)]
`, `${rootJs}function solve(n, edges) {
  const MOD = 1000000007n
  const [parent, order] = rooted(n, edges)
  const children = Array.from({ length: n }, () => [])
  for (const v of order.slice(1)) children[parent[v]].push(v)
  const down = Array(n).fill(1n)
  for (const v of [...order].reverse()) {
    for (const c of children[v]) down[v] = down[v] * (1n + down[c]) % MOD
  }
  const up = Array(n).fill(0n)
  for (const v of order) {
    const ch = children[v], k = ch.length
    const pre = Array(k + 1).fill(1n), suf = Array(k + 1).fill(1n)
    for (let i = 0; i < k; i++) pre[i + 1] = pre[i] * (1n + down[ch[i]]) % MOD
    for (let i = k - 1; i >= 0; i--) suf[i] = suf[i + 1] * (1n + down[ch[i]]) % MOD
    for (let i = 0; i < k; i++) up[ch[i]] = pre[i] * suf[i + 1] % MOD * (1n + up[v]) % MOD
  }
  return down.map((d, v) => Number(d * (1n + up[v]) % MOD))
}
`),
    notes: [
      ...rootNotes,
      ['down[v] = down[v] * (1 + down[c]) % MOD', 'down[v] = down[v] * (1n + down[c]) % MOD', 'down[v]: connected sets inside v’s subtree whose top is v. Each child adds nothing, or one of down[c] sets through it.'],
      ['up = [0] * n', 'const up = Array(n).fill(0n)', 'up[c]: connected sets above c that contain c’s parent and not c. The root has none.'],
      ['pre[i + 1] = pre[i] * (1 + down[c]) % MOD', 'pre[i + 1] = pre[i] * (1n + down[ch[i]]) % MOD', 'pre[i]: the product of the first i children’s factors.'],
      ['suf[i] = suf[i + 1]', 'suf[i] = suf[i + 1]', 'suf[i]: the product of the children from i on.'],
      ['up[c] = pre[i] * suf[i + 1] % MOD * (1 + up[v]) % MOD', 'up[ch[i]] = pre[i] * suf[i + 1] % MOD * (1n + up[v]) % MOD', 'All siblings but c: the prefix before it times the suffix after it, with no division (which the modulus would not allow). Times the choice above the parent.'],
      ['return [down[v] * (1 + up[v]) % MOD', 'return down.map((d, v) => Number(d * (1n + up[v]) % MOD))', 'A set through v is a set below v, with or without one of the sets above it.'],
    ],
    math: [
      ['down(v)', 'down[v]', 'down[v]', 'connected sets in v’s subtree with top v'],
      ['up(c)', 'up[c]', 'up[ch[i]]', 'connected sets above c that contain its parent'],
      ['prefix · suffix', 'pre[i] * suf[i + 1]', 'pre[i] * suf[i + 1]', 'every sibling’s factor except c’s'],
    ],
  },

  'tree-distances': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    size, depth = [1] * n, [0] * n
    for v in order[1:]:
        depth[v] = depth[parent[v]] + 1
    for v in reversed(order):
        if parent[v] >= 0:
            size[parent[v]] += size[v]
    answer = [0] * n
    answer[0] = sum(depth)
    for v in order[1:]:
        answer[v] = answer[parent[v]] + n - 2 * size[v]
    return answer
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const size = Array(n).fill(1), depth = Array(n).fill(0)
  for (const v of order.slice(1)) depth[v] = depth[parent[v]] + 1
  for (const v of [...order].reverse()) {
    if (parent[v] >= 0) size[parent[v]] += size[v]
  }
  const answer = Array(n).fill(0)
  answer[0] = depth.reduce((s, d) => s + d, 0)
  for (const v of order.slice(1)) answer[v] = answer[parent[v]] + n - 2 * size[v]
  return answer
}
`),
    notes: [
      ...rootNotes,
      ['depth[v] = depth[parent[v]] + 1', 'depth[v] = depth[parent[v]] + 1', 'Parents before children, so the parent’s depth is ready.'],
      ['size[parent[v]] += size[v]', 'size[parent[v]] += size[v]', 'Subtree sizes, children first.'],
      ['answer[0] = sum(depth)', 'answer[0] = depth.reduce', 'From the root, the distance to each vertex is its depth.'],
      ['answer[v] = answer[parent[v]] + n - 2 * size[v]', 'answer[v] = answer[parent[v]] + n - 2 * size[v]', 'Stepping from the parent to v brings the size[v] vertices of v’s subtree one closer and takes the other n − size[v] one further away.'],
    ],
    math: [
      ['S(v)', 'answer[v]', 'answer[v]', 'the sum of distances from v'],
      ['S(p) + n − 2·size(v)', 'answer[parent[v]] + n - 2 * size[v]', 'answer[parent[v]] + n - 2 * size[v]', 'moving the root one edge'],
    ],
  },

  'tree-knapsack': {
    code: pair(`${rootPy}def solve(values, costs, edges, budget):
    n = len(values)
    parent, order = rooted(n, edges)
    children = [[] for _ in range(n)]
    for v in order[1:]:
        children[parent[v]].append(v)
    NEG = float('-inf')
    D = [None] * n
    for v in reversed(order):
        d = [values[v] if b >= costs[v] else NEG for b in range(budget + 1)]
        for c in children[v]:
            merged = d[:]
            for b in range(budget + 1):
                for x in range(b + 1):
                    if d[b - x] != NEG and D[c][x] != NEG:
                        merged[b] = max(merged[b], d[b - x] + D[c][x])
            d = merged
        D[v] = d
    return max(0, D[0][budget])
`, `${rootJs}function solve(values, costs, edges, budget) {
  const n = values.length
  const [parent, order] = rooted(n, edges)
  const children = Array.from({ length: n }, () => [])
  for (const v of order.slice(1)) children[parent[v]].push(v)
  const D = Array(n)
  for (const v of [...order].reverse()) {
    let d = Array.from({ length: budget + 1 }, (_, b) => (b >= costs[v] ? values[v] : -Infinity))
    for (const c of children[v]) {
      const merged = d.slice()
      for (let b = 0; b <= budget; b++) {
        for (let x = 0; x <= b; x++) merged[b] = Math.max(merged[b], d[b - x] + D[c][x])
      }
      d = merged
    }
    D[v] = d
  }
  return Math.max(0, D[0][budget])
}
`),
    notes: [
      ...rootNotes,
      ['d = [values[v] if b >= costs[v]', 'let d = Array.from', 'v alone: its value whenever the budget covers its cost, else impossible (−∞). d[b] means cost at most b.'],
      ['merged = d[:]', 'const merged = d.slice()', 'Merge one child: start from “use nothing from this child”.'],
      ['merged[b] = max(merged[b], d[b - x] + D[c][x])', 'merged[b] = Math.max(merged[b], d[b - x] + D[c][x])', 'Give the child x of the budget and keep b − x for what is merged so far. D[c] already requires c chosen, and c can only be chosen because v is.'],
      ['D[v] = d', 'D[v] = d', 'After every child is merged, D[v][b] is the best from v’s subtree with v chosen, cost at most b.'],
      ['return max(0, D[0][budget])', 'return Math.max(0, D[0][budget])', 'Choose the root and the best below it, or choose nothing.'],
    ],
    math: [
      ['D(v, b)', 'D[v]', 'D[v]', 'the best from v’s subtree with v chosen and cost at most b (one entry per b)'],
      ['max over x of D(v, b − x) + D(c, x)', 'd[b - x] + D[c][x]', 'd[b - x] + D[c][x]', 'splitting the budget with a child'],
    ],
  },

  'tree-coloring': {
    code: pair(`${rootPy}def solve(edges, allowed):
    n = len(allowed)
    parent, order = rooted(n, edges)
    ways = [{c: 1 for c in allowed[v]} for v in range(n)]
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            total = sum(ways[v].values())
            for c in ways[p]:
                ways[p][c] *= total - ways[v].get(c, 0)
    return sum(ways[0].values())
`, `${rootJs}function solve(edges, allowed) {
  const n = allowed.length
  const [parent, order] = rooted(n, edges)
  const ways = allowed.map(cs => new Map(cs.map(c => [c, 1])))
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    let total = 0
    for (const x of ways[v].values()) total += x
    for (const c of ways[p].keys()) ways[p].set(c, ways[p].get(c) * (total - (ways[v].get(c) ?? 0)))
  }
  let answer = 0
  for (const x of ways[0].values()) answer += x
  return answer
}
`),
    notes: [
      ...rootNotes,
      ['ways = [{c: 1 for c in allowed[v]}', 'const ways = allowed.map', 'ways[v][c]: colourings of v’s subtree with v coloured c. Before any child is merged, one for each allowed colour.'],
      ['total = sum(ways[v].values())', 'total += x', 'Every colouring of the child’s subtree, whatever the child’s colour.'],
      ['ways[p][c] *= total - ways[v].get(c, 0)', 'ways[p].get(c) * (total - (ways[v].get(c) ?? 0))', 'With the parent coloured c, the child may be any colour but c. The children’s choices are independent, so they multiply.'],
      ['return sum(ways[0].values())', 'answer += x', 'The root may take any of its colours.'],
    ],
    math: [
      ['W(v, c)', 'ways[v]', 'ways[v]', 'colourings of v’s subtree with v coloured c, one entry per colour'],
      ['Σ W(child) − W(child, c)', 'total - ways[v].get(c, 0)', 'total - (ways[v].get(c) ?? 0)', 'the child’s colourings that avoid c'],
    ],
  },

  'tree-path-count': {
    code: pair(`${rootPy}def solve(n, edges, k):
    parent, order = rooted(n, edges)
    cnt = [[1] + [0] * k for _ in range(n)]
    pairs = 0
    for v in reversed(order):
        p = parent[v]
        if p >= 0:
            for d in range(k):
                pairs += cnt[p][d] * cnt[v][k - 1 - d]
            for d in range(k):
                cnt[p][d + 1] += cnt[v][d]
    return pairs
`, `${rootJs}function solve(n, edges, k) {
  const [parent, order] = rooted(n, edges)
  const cnt = Array.from({ length: n }, () => [1, ...Array(k).fill(0)])
  let pairs = 0
  for (const v of [...order].reverse()) {
    const p = parent[v]
    if (p < 0) continue
    for (let d = 0; d < k; d++) pairs += cnt[p][d] * cnt[v][k - 1 - d]
    for (let d = 0; d < k; d++) cnt[p][d + 1] += cnt[v][d]
  }
  return pairs
}
`),
    notes: [
      ...rootNotes,
      ['cnt = [[1] + [0] * k', 'const cnt = Array.from', 'cnt[v][d]: vertices d edges below v among the branches merged so far. v itself is at depth 0.'],
      ['pairs += cnt[p][d] * cnt[v][k - 1 - d]', 'pairs += cnt[p][d] * cnt[v][k - 1 - d]', 'Pair depth d on p’s merged side with depth k − 1 − d in v’s subtree: the edge p–v makes the total k. These paths have p as their highest vertex, so each is counted once.'],
      ['cnt[p][d + 1] += cnt[v][d]', 'cnt[p][d + 1] += cnt[v][d]', 'Only after pairing, merge v’s counts into p’s, one edge deeper. Merging first would pair v’s branch with itself.'],
      ['return pairs', 'return pairs', 'Every path has one highest vertex, where it was counted.'],
    ],
    math: [
      ['cnt(v, d)', 'cnt[v][d]', 'cnt[v][d]', 'vertices d edges below v'],
      ['cnt(p, d) · cnt(v, k − 1 − d)', 'cnt[p][d] * cnt[v][k - 1 - d]', 'cnt[p][d] * cnt[v][k - 1 - d]', 'paths of length k through the edge p–v'],
    ],
  },

  'tree-connected': {
    code: pair(`${rootPy}def solve(n, edges):
    parent, order = rooted(n, edges)
    C = [1] * n
    for v in reversed(order):
        if parent[v] >= 0:
            C[parent[v]] *= 1 + C[v]
    return sum(C)
`, `${rootJs}function solve(n, edges) {
  const [parent, order] = rooted(n, edges)
  const C = Array(n).fill(1)
  for (const v of [...order].reverse()) {
    if (parent[v] >= 0) C[parent[v]] *= 1 + C[v]
  }
  return C.reduce((s, x) => s + x, 0)
}
`),
    notes: [
      ...rootNotes,
      ['C = [1] * n', 'const C = Array(n).fill(1)', 'C[v]: connected sets whose highest vertex is v. With no children merged yet, just {v}.'],
      ['C[parent[v]] *= 1 + C[v]', 'C[parent[v]] *= 1 + C[v]', 'Each child either adds nothing or one of its C[v] sets through it; the children choose independently.'],
      ['return sum(C)', 'return C.reduce', 'Every connected set has exactly one highest vertex, so adding C over all vertices counts each set once.'],
    ],
    math: [
      ['C(v)', 'C[v]', 'C[v]', 'connected sets whose highest vertex is v'],
      ['Π (1 + C(child))', 'C[parent[v]] *= 1 + C[v]', 'C[parent[v]] *= 1 + C[v]', 'each child adds nothing or a set through it'],
    ],
  },

  'tree-small-large': {
    code: pair(`${rootPy}def solve(colors, edges):
    n = len(colors)
    parent, order = rooted(n, edges)
    sets = [{colors[v]} for v in range(n)]
    answer = [0] * n
    for v in reversed(order):
        answer[v] = len(sets[v])
        p = parent[v]
        if p >= 0:
            big, small = sets[p], sets[v]
            if len(big) < len(small):
                big, small = small, big
            big |= small
            sets[p] = big
    return answer
`, `${rootJs}function solve(colors, edges) {
  const n = colors.length
  const [parent, order] = rooted(n, edges)
  const sets = colors.map(c => new Set([c]))
  const answer = Array(n).fill(0)
  for (const v of [...order].reverse()) {
    answer[v] = sets[v].size
    const p = parent[v]
    if (p < 0) continue
    let big = sets[p], small = sets[v]
    if (big.size < small.size) [big, small] = [small, big]
    for (const c of small) big.add(c)
    sets[p] = big
  }
  return answer
}
`),
    notes: [
      ...rootNotes,
      ['sets = [{colors[v]}', 'const sets = colors.map', 'Each vertex starts with the set of its own colour.'],
      ['answer[v] = len(sets[v])', 'answer[v] = sets[v].size', 'Children come first, so by now every child has been merged into sets[v]: its size is the answer for v.'],
      ['if len(big) < len(small):', 'if (big.size < small.size)', 'Always pour the smaller set into the larger. A colour that moves lands in a set at least twice the size of the one it left, so it moves at most log₂ n times.'],
      ['big |= small', 'for (const c of small) big.add(c)', 'A set ignores colours it already has, so shared colours are counted once.'],
      ['sets[p] = big', 'sets[p] = big', 'The parent keeps whichever set was larger, now holding both.'],
    ],
    math: [
      ['colours(v)', 'sets[v]', 'sets[v]', 'the colours in v’s subtree'],
      ['|colours(v)|', 'len(sets[v])', 'sets[v].size', 'the answer for v'],
    ],
  },
}
