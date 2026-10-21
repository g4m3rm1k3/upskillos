// Reference solutions explained line by line for the state-and-transition-reduction lessons (Expert,
// space-speed group). Format: explained.js.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SPACE_EXPLAINED = {
  'rolling-arrays': {
    code: pair(`def solve(grid):
    M = 1000000007
    C = len(grid[0])
    row = [0] * C
    row[0] = 0 if grid[0][0] else 1
    for r in range(len(grid)):
        for c in range(C):
            if grid[r][c]:
                row[c] = 0
            elif c > 0:
                row[c] = (row[c] + row[c - 1]) % M
    return row[C - 1]
`, `function solve(grid) {
  const M = 1000000007
  const C = grid[0].length
  const row = new Array(C).fill(0)
  row[0] = grid[0][0] ? 0 : 1
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < C; c++) {
      if (grid[r][c]) row[c] = 0
      else if (c > 0) row[c] = (row[c] + row[c - 1]) % M
    }
  }
  return row[C - 1]
}
`),
    notes: [
      ['row = [0] * C', 'const row = new Array(C).fill(0)', 'One row of counts instead of the whole table: each row reads only the row above.'],
      ['row[0] = 0 if grid[0][0] else 1', 'row[0] = grid[0][0] ? 0 : 1', 'One path to the start, unless it is blocked. The rest of the row before row 0 is “nothing above”: 0.'],
      ['row[c] = 0', 'if (grid[r][c]) row[c] = 0', 'A blocked cell has no paths.'],
      ['row[c] = (row[c] + row[c - 1]) % M', 'row[c] = (row[c] + row[c - 1]) % M', 'Before this line row[c] still holds the cell above (the old row); row[c − 1] was just updated, so it is the cell to the left. Their sum is this cell.'],
      ['return row[C - 1]', 'return row[C - 1]', 'After the last row, the last cell is the bottom-right corner.'],
    ],
    math: [
      ['P(r, c) = P(r − 1, c) + P(r, c − 1)', 'row[c] + row[c - 1]', 'row[c] + row[c - 1]', 'from above (old value) and from the left (new value)'],
      ['P(r, c)', 'row[c]', 'row[c]', 'paths to cell (r, c), kept in one row'],
    ],
  },

  'in-place': {
    code: pair(`def solve(items, cap):
    best = [0] * (cap + 1)
    for w, v, many in items:
        caps = range(w, cap + 1) if many else range(cap, w - 1, -1)
        for c in caps:
            best[c] = max(best[c], best[c - w] + v)
    return best[cap]
`, `function solve(items, cap) {
  const best = new Array(cap + 1).fill(0)
  for (const [w, v, many] of items) {
    if (many) {
      for (let c = w; c <= cap; c++) best[c] = Math.max(best[c], best[c - w] + v)
    } else {
      for (let c = cap; c >= w; c--) best[c] = Math.max(best[c], best[c - w] + v)
    }
  }
  return best[cap]
}
`),
    notes: [
      ['best = [0] * (cap + 1)', 'const best = new Array(cap + 1).fill(0)', 'best[c]: the most value within capacity c using the items so far. One row, updated in place.'],
      ['range(w, cap + 1) if many', 'for (let c = w; c <= cap; c++)', 'Unlimited item: scan upward, so best[c − w] may already include this item. Taking it again is allowed.'],
      ['range(cap, w - 1, -1)', 'for (let c = cap; c >= w; c--)', 'Once-only item: scan downward, so best[c − w] is still from before this item and it can’t be taken twice.'],
      ['best[c - w] + v', 'best[c - w] + v', 'Take the item: its value plus the best for the remaining capacity.'],
    ],
    math: [
      ['B(c) = max(B(c), B(c − w) + v)', 'max(best[c], best[c - w] + v)', 'Math.max(best[c], best[c - w] + v)', 'skip or take; the scan direction decides whether B(c − w) is old or new'],
      ['B(c)', 'best[c]', 'best[c]', 'the most value within capacity c'],
    ],
  },

  'hirschberg': {
    code: pair(`def solve(a, b):
    n, m = len(a), len(b)
    L = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            L[i][j] = L[i + 1][j + 1] + 1 if a[i] == b[j] else max(L[i + 1][j], L[i][j + 1])
    out, i, j = [], 0, 0
    letters = sorted(set(a) & set(b))
    while L[i][j] > 0:
        for c in letters:
            ii, jj = a.find(c, i), b.find(c, j)
            if ii >= 0 and jj >= 0 and L[ii + 1][jj + 1] + 1 == L[i][j]:
                out.append(c)
                i, j = ii + 1, jj + 1
                break
    return ''.join(out)
`, `function solve(a, b) {
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
    }
  }
  const letters = [...new Set(a)].filter(c => b.includes(c)).sort()
  let out = '', i = 0, j = 0
  while (L[i][j] > 0) {
    for (const c of letters) {
      const ii = a.indexOf(c, i), jj = b.indexOf(c, j)
      if (ii >= 0 && jj >= 0 && L[ii + 1][jj + 1] + 1 === L[i][j]) {
        out += c
        i = ii + 1
        j = jj + 1
        break
      }
    }
  }
  return out
}
`),
    notes: [
      ['L = [[0] * (m + 1)', 'const L = Array.from', 'L[i][j]: the LCS length of the suffixes a[i:] and b[j:]. Hirschberg’s method would keep only two rows and split in half; for the smallest answer the full suffix table is simplest.'],
      ['L[i][j] = L[i + 1][j + 1] + 1 if', 'L[i][j] = a[i] === b[j]', 'The usual LCS rule, run on suffixes so it can be read going forward.'],
      ['letters = sorted(', 'const letters = [...new Set(a)]', 'Trying letters in sorted order is what makes the answer the smallest in dictionary order.'],
      ['ii, jj = a.find(c, i), b.find(c, j)', 'const ii = a.indexOf(c, i), jj = b.indexOf(c, j)', 'Take c at its earliest position in both strings: that leaves the longest suffixes, which can only help.'],
      ['L[ii + 1][jj + 1] + 1 == L[i][j]', 'L[ii + 1][jj + 1] + 1 === L[i][j]', 'c is safe to take if the rest can still reach the full length.'],
    ],
    math: [
      ['L(i, j)', 'L[i][j]', 'L[i][j]', 'LCS length of a[i:] and b[j:]'],
      ['1 + L(i′ + 1, j′ + 1) = L(i, j)', 'L[ii + 1][jj + 1] + 1 == L[i][j]', 'L[ii + 1][jj + 1] + 1 === L[i][j]', 'c keeps an optimal path'],
    ],
  },

  'prefix-sum-dp': {
    code: pair(`def solve(n, k):
    M = 1000000007
    ways = [0] * (n + 1)
    ways[0] = 1
    pre = [0] * (n + 2)
    pre[1] = 1
    for i in range(1, n + 1):
        ways[i] = (pre[i] - pre[max(0, i - k)]) % M
        pre[i + 1] = (pre[i] + ways[i]) % M
    return ways[n]
`, `function solve(n, k) {
  const M = 1000000007
  const ways = new Array(n + 1).fill(0)
  const pre = new Array(n + 2).fill(0)
  ways[0] = 1
  pre[1] = 1
  for (let i = 1; i <= n; i++) {
    ways[i] = ((pre[i] - pre[Math.max(0, i - k)]) % M + M) % M
    pre[i + 1] = (pre[i] + ways[i]) % M
  }
  return ways[n]
}
`),
    notes: [
      ['pre = [0] * (n + 2)', 'const pre = new Array(n + 2).fill(0)', 'pre[i] = ways[0] + … + ways[i − 1]: a running total, so any window of ways is one subtraction.'],
      ['ways[i] = (pre[i] - pre[max(0, i - k)]) % M', 'ways[i] = ((pre[i] - pre[Math.max(0, i - k)]) % M + M) % M', 'ways[i] adds ways[i − k] … ways[i − 1]: pre[i] − pre[i − k], with the start clamped at 0. In JavaScript % can be negative, so M is added back.'],
      ['pre[i + 1] = (pre[i] + ways[i]) % M', 'pre[i + 1] = (pre[i] + ways[i]) % M', 'Extend the running total by the new value, ready for later windows.'],
    ],
    math: [
      ['W(i) = Σ W(i − s), s = 1 … k', 'pre[i] - pre[max(0, i - k)]', 'pre[i] - pre[Math.max(0, i - k)]', 'a window sum as a difference of prefix sums'],
      ['P(i + 1) = P(i) + W(i)', 'pre[i + 1] = (pre[i] + ways[i]) % M', 'pre[i + 1] = (pre[i] + ways[i]) % M', 'the running total'],
    ],
  },

  'difference-dp': {
    code: pair(`def solve(limits, total):
    M = 1000000007
    ways = [1] + [0] * total
    for lim in limits:
        diff = [0] * (total + 2)
        for t in range(total + 1):
            if ways[t]:
                diff[t] = (diff[t] + ways[t]) % M
                end = min(total, t + lim) + 1
                diff[end] = (diff[end] - ways[t]) % M
        run = 0
        for t in range(total + 1):
            run = (run + diff[t]) % M
            ways[t] = run
    return ways[total]
`, `function solve(limits, total) {
  const M = 1000000007
  const ways = new Array(total + 1).fill(0)
  ways[0] = 1
  for (const lim of limits) {
    const diff = new Array(total + 2).fill(0)
    for (let t = 0; t <= total; t++) {
      if (!ways[t]) continue
      diff[t] = (diff[t] + ways[t]) % M
      const end = Math.min(total, t + lim) + 1
      diff[end] = ((diff[end] - ways[t]) % M + M) % M
    }
    let run = 0
    for (let t = 0; t <= total; t++) {
      run = (run + diff[t]) % M
      ways[t] = run
    }
  }
  return ways[total]
}
`),
    notes: [
      ['ways = [1] + [0] * total', 'ways[0] = 1', 'ways[t]: the ways to hand out t candies to the children so far. No children: one way to hand out 0.'],
      ['diff = [0] * (total + 2)', 'const diff = new Array(total + 2).fill(0)', 'A fresh difference array for the next child. It is read only after every source has written to it.'],
      ['diff[t] = (diff[t] + ways[t]) % M', 'diff[t] = (diff[t] + ways[t]) % M', 'The next child takes 0 to lim candies, so ways[t] reaches every total from t to t + lim: add it at the start of that range…'],
      ['diff[end] = (diff[end] - ways[t]) % M', 'diff[end] = ((diff[end] - ways[t]) % M + M) % M', '…and cancel it just after the end.'],
      ['run = (run + diff[t]) % M', 'run = (run + diff[t]) % M', 'A prefix sum turns the range additions into the new ways.'],
    ],
    math: [
      ['W′(t) = Σ W(t − x), 0 ≤ x ≤ lim', 'run = (run + diff[t]) % M', 'run = (run + diff[t]) % M', 'range additions, then one prefix sum'],
      ['W(t)', 'ways[t]', 'ways[t]', 'ways to hand out t candies to the children so far'],
    ],
  },

  'monotone-queue': {
    code: pair(`from collections import deque
def solve(a, k):
    best = [0] * len(a)
    best[0] = a[0]
    q = deque([0])
    for i in range(1, len(a)):
        while q[0] < i - k:
            q.popleft()
        best[i] = a[i] + best[q[0]]
        while q and best[q[-1]] <= best[i]:
            q.pop()
        q.append(i)
    return best[-1]
`, `function solve(a, k) {
  const best = new Array(a.length).fill(0)
  const q = [0]
  let head = 0
  best[0] = a[0]
  for (let i = 1; i < a.length; i++) {
    while (q[head] < i - k) head++
    best[i] = a[i] + best[q[head]]
    while (q.length > head && best[q[q.length - 1]] <= best[i]) q.pop()
    q.push(i)
  }
  return best[a.length - 1]
}
`),
    notes: [
      ['best[0] = a[0]', 'best[0] = a[0]', 'best[i]: the largest sum of a path from square 0 that lands on i.'],
      ['while q[0] < i - k:', 'while (q[head] < i - k) head++', 'The queue holds candidate squares. Those more than k back can’t jump to i: drop them from the front.'],
      ['best[i] = a[i] + best[q[0]]', 'best[i] = a[i] + best[q[head]]', 'The front is the best square in the window, so best[i] costs O(1).'],
      ['while q and best[q[-1]] <= best[i]:', 'while (q.length > head && best[q[q.length - 1]] <= best[i]) q.pop()', 'A square no better than i, and older, will never be the best again: remove it from the back. The queue stays in decreasing order of best.'],
    ],
    math: [
      ['B(i) = a(i) + max B(j), i − k ≤ j < i', 'a[i] + best[q[0]]', 'a[i] + best[q[head]]', 'the window maximum from the queue’s front'],
      ['B(i)', 'best[i]', 'best[i]', 'the best path sum landing on square i'],
    ],
  },

  'fenwick-dp': {
    code: pair(`def solve(a):
    M = 1000000007
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(a)))}
    tree = [0] * (len(ranks) + 1)
    total = 0
    for v in a:
        r = ranks[v]
        s, i = 0, r - 1
        while i > 0:
            s = (s + tree[i]) % M
            i -= i & -i
        cur = (s + 1) % M
        total = (total + cur) % M
        i = r
        while i < len(tree):
            tree[i] = (tree[i] + cur) % M
            i += i & -i
    return total
`, `function solve(a) {
  const M = 1000000007
  const vals = [...new Set(a)].sort((x, y) => x - y)
  const rank = new Map(vals.map((v, i) => [v, i + 1]))
  const tree = new Array(vals.length + 1).fill(0)
  let total = 0
  for (const v of a) {
    const r = rank.get(v)
    let s = 0
    for (let i = r - 1; i > 0; i -= i & -i) s = (s + tree[i]) % M
    const cur = (s + 1) % M
    total = (total + cur) % M
    for (let i = r; i < tree.length; i += i & -i) tree[i] = (tree[i] + cur) % M
  }
  return total
}
`),
    notes: [
      ['ranks = {v: i + 1', 'const rank = new Map', 'Values become ranks 1, 2, …: equal values share a rank, and order is kept.'],
      ['s, i = 0, r - 1', 'for (let i = r - 1; i > 0; i -= i & -i)', 'A Fenwick prefix query: the subsequences ending at a smaller value (ranks below r), in O(log n).'],
      ['cur = (s + 1) % M', 'const cur = (s + 1) % M', 'Each of those extends by v, plus v on its own.'],
      ['tree[i] = (tree[i] + cur) % M', 'tree[i] = (tree[i] + cur) % M', 'Record the new subsequences at rank r, so later larger values can extend them.'],
    ],
    math: [
      ['E(i) = 1 + Σ E(j), j < i, a(j) < a(i)', 'cur = (s + 1) % M', 'const cur = (s + 1) % M', 'a Fenwick prefix sum over smaller ranks'],
      ['Σ over ranks < r', 's = (s + tree[i]) % M', 's = (s + tree[i]) % M', 'the Fenwick prefix query'],
    ],
  },

  'segment-tree-dp': {
    code: pair(`from bisect import bisect_left, bisect_right
def solve(a, d):
    vals = sorted(set(a))
    size = 1
    while size < len(vals):
        size *= 2
    tree = [0] * (2 * size)
    def query(lo, hi):
        res, lo, hi = 0, lo + size, hi + size
        while lo < hi:
            if lo & 1:
                res = max(res, tree[lo])
                lo += 1
            if hi & 1:
                hi -= 1
                res = max(res, tree[hi])
            lo //= 2
            hi //= 2
        return res
    def update(i, v):
        i += size
        tree[i] = max(tree[i], v)
        while i > 1:
            i //= 2
            tree[i] = max(tree[2 * i], tree[2 * i + 1])
    best = 0
    for x in a:
        cur = 1 + query(bisect_left(vals, x - d), bisect_right(vals, x + d))
        update(bisect_left(vals, x), cur)
        best = max(best, cur)
    return best
`, `function solve(a, d) {
  const vals = [...new Set(a)].sort((x, y) => x - y)
  let size = 1
  while (size < vals.length) size *= 2
  const tree = new Array(2 * size).fill(0)
  const lower = x => { let lo = 0, hi = vals.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (vals[mid] < x) lo = mid + 1; else hi = mid } return lo }
  const upper = x => { let lo = 0, hi = vals.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (vals[mid] <= x) lo = mid + 1; else hi = mid } return lo }
  function query(lo, hi) {
    let res = 0
    for (lo += size, hi += size; lo < hi; lo >>= 1, hi >>= 1) {
      if (lo & 1) res = Math.max(res, tree[lo++])
      if (hi & 1) res = Math.max(res, tree[--hi])
    }
    return res
  }
  function update(i, v) {
    i += size
    tree[i] = Math.max(tree[i], v)
    for (i >>= 1; i >= 1; i >>= 1) tree[i] = Math.max(tree[2 * i], tree[2 * i + 1])
  }
  let best = 0
  for (const x of a) {
    const cur = 1 + query(lower(x - d), upper(x + d))
    update(lower(x), cur)
    best = Math.max(best, cur)
  }
  return best
}
`),
    notes: [
      ['vals = sorted(set(a))', 'const vals = [...new Set(a)]', 'The distinct values in order: their positions are the leaves of the segment tree.'],
      ['tree = [0] * (2 * size)', 'const tree = new Array(2 * size).fill(0)', 'Leaf i holds the longest valid subsequence ending at value vals[i]; each parent holds the larger of its two children. 0 is the identity for an empty range.'],
      ['query(bisect_left(vals, x - d), bisect_right(vals, x + d))', 'query(lower(x - d), upper(x + d))', 'The allowed predecessors have values in [x − d, x + d]: binary search turns that into a range of leaves, using real values, not rank distances.'],
      ['update(bisect_left(vals, x), cur)', 'update(lower(x), cur)', 'Improve x’s leaf with the new length, after the query, so x can’t extend itself.'],
    ],
    math: [
      ['B(i) = 1 + max B(j), |a(j) − a(i)| ≤ d', '1 + query(', '1 + query(', 'a range maximum over values'],
      ['best length so far', 'best = max(best, cur)', 'best = Math.max(best, cur)', 'the answer: the longest anywhere'],
    ],
  },

  'coordinate-compression': {
    code: pair(`def solve(a):
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(a)))}
    tree = [0] * (len(ranks) + 1)
    best = 0
    for v in a:
        r = ranks[v]
        s, i = 0, r - 1
        while i > 0:
            s = max(s, tree[i])
            i -= i & -i
        cur = s + v
        best = max(best, cur)
        i = r
        while i < len(tree):
            tree[i] = max(tree[i], cur)
            i += i & -i
    return best
`, `function solve(a) {
  const vals = [...new Set(a)].sort((x, y) => x - y)
  const rank = new Map(vals.map((v, i) => [v, i + 1]))
  const tree = new Array(vals.length + 1).fill(0)
  let best = 0
  for (const v of a) {
    const r = rank.get(v)
    let s = 0
    for (let i = r - 1; i > 0; i -= i & -i) s = Math.max(s, tree[i])
    const cur = s + v
    best = Math.max(best, cur)
    for (let i = r; i < tree.length; i += i & -i) tree[i] = Math.max(tree[i], cur)
  }
  return best
}
`),
    notes: [
      ['ranks = {v: i + 1', 'const rank = new Map', 'Values up to 10⁹ can’t index an array, but only their order matters for “increasing”: replace each by its rank. Equal values share one.'],
      ['s = max(s, tree[i])', 's = Math.max(s, tree[i])', 'A max-Fenwick query: the best sum ending at a strictly smaller rank.'],
      ['cur = s + v', 'const cur = s + v', 'The sum uses the real value v, not its rank: ranks are only for storage and order.'],
      ['tree[i] = max(tree[i], cur)', 'tree[i] = Math.max(tree[i], cur)', 'Improve rank r. A max-Fenwick tree can only take improvements, which is all this needs.'],
    ],
    math: [
      ['S(i) = a(i) + max S(j), a(j) < a(i)', 'cur = s + v', 'const cur = s + v', 'best smaller-ranked sum, plus the real value'],
      ['rank(v)', 'ranks[v]', 'rank.get(v)', 'v’s position among the sorted distinct values'],
    ],
  },

  'pareto-frontiers': {
    code: pair(`def solve(weights, values, cap):
    front = [(0, 0)]
    for w, v in zip(weights, values):
        cand = front + [(fw + w, fv + v) for fw, fv in front if fw + w <= cap]
        cand.sort(key=lambda p: (p[0], -p[1]))
        front = []
        for p in cand:
            if not front or p[1] > front[-1][1]:
                front.append(p)
    return front[-1][1]
`, `function solve(weights, values, cap) {
  let front = [[0, 0]]
  weights.forEach((w, i) => {
    const added = front.filter(([fw]) => fw + w <= cap).map(([fw, fv]) => [fw + w, fv + values[i]])
    const cand = [...front, ...added]
    cand.sort((p, q) => p[0] - q[0] || q[1] - p[1])
    front = []
    for (const p of cand) {
      if (!front.length || p[1] > front[front.length - 1][1]) front.push(p)
    }
  })
  return front[front.length - 1][1]
}
`),
    notes: [
      ['front = [(0, 0)]', 'let front = [[0, 0]]', 'The frontier: (weight, value) pairs of choices made so far, none beaten by another. At first, the empty choice.'],
      ['cand = front + [(fw + w, fv + v)', 'const added = front.filter', 'Each pair either skips the item or takes it, if it still fits.'],
      ['cand.sort(key=lambda p: (p[0], -p[1]))', 'cand.sort((p, q) => p[0] - q[0] || q[1] - p[1])', 'By weight, and for equal weights the larger value first.'],
      ['if not front or p[1] > front[-1][1]:', 'if (!front.length || p[1] > front[front.length - 1][1]) front.push(p)', 'Keep a pair only if it is worth more than every lighter one; otherwise it is dominated: heavier and no better.'],
      ['return front[-1][1]', 'return front[front.length - 1][1]', 'The heaviest pair on the frontier has the largest value.'],
    ],
    math: [
      ['(w₁, v₁) dominates (w₂, v₂) if w₁ ≤ w₂ and v₁ ≥ v₂', 'p[1] > front[-1][1]', 'p[1] > front[front.length - 1][1]', 'a pair survives only if no lighter pair is worth as much'],
      ['F', 'front', 'front', 'the Pareto frontier of (weight, value) pairs'],
    ],
  },

  'bitset-dp': {
    code: pair(`def solve(values):
    B = 1
    for v in values:
        B |= B << v
    return bin(B).count('1')
`, `function solve(values) {
  let B = 1n
  for (const v of values) B |= B << BigInt(v)
  let count = 0
  for (const ch of B.toString(2)) {
    if (ch === '1') count++
  }
  return count
}
`),
    notes: [
      ['B = 1', 'let B = 1n', 'Bit t of B is 1 when total t is reachable. At first only 0 is. In JavaScript a BigInt holds millions of bits.'],
      ['B |= B << v', 'B |= B << BigInt(v)', 'Shifting by v adds v to every reachable total at once; OR keeps the old ones (not using v). Both sides read the old B, so v is used at most once.'],
      ["return bin(B).count('1')", "if (ch === '1') count++", 'Each 1 bit is one reachable total.'],
    ],
    math: [
      ['R ∪ (R + v)', 'B |= B << v', 'B |= B << BigInt(v)', 'every total, with or without v'],
      ['R', 'B', 'B', 'the set of reachable totals, as the 1 bits of a number'],
    ],
  },

  'bounded-binary': {
    code: pair(`def solve(weights, values, counts, cap):
    best = [0] * (cap + 1)
    for w, v, m in zip(weights, values, counts):
        m = min(m, cap // w)
        k = 1
        while m > 0:
            take = min(k, m)
            W, V = take * w, take * v
            for c in range(cap, W - 1, -1):
                best[c] = max(best[c], best[c - W] + V)
            m -= take
            k *= 2
    return best[cap]
`, `function solve(weights, values, counts, cap) {
  const best = new Array(cap + 1).fill(0)
  weights.forEach((w, i) => {
    let m = Math.min(counts[i], Math.floor(cap / w))
    for (let k = 1; m > 0; k *= 2) {
      const take = Math.min(k, m), W = take * w, V = take * values[i]
      for (let c = cap; c >= W; c--) best[c] = Math.max(best[c], best[c - W] + V)
      m -= take
    }
  })
  return best[cap]
}
`),
    notes: [
      ['m = min(m, cap // w)', 'let m = Math.min(counts[i], Math.floor(cap / w))', 'No more than cap ÷ w copies can ever fit, so a count of 10⁹ shrinks at once.'],
      ['take = min(k, m)', 'const take = Math.min(k, m)', 'Bundles of 1, 2, 4, … copies, and finally whatever is left. Any number of copies from 0 to m is a sum of some of these bundles, each used once.'],
      ['W, V = take * w, take * v', 'W = take * w, V = take * values[i]', 'A bundle behaves as one 0/1 item: take copies at once.'],
      ['range(cap, W - 1, -1)', 'for (let c = cap; c >= W; c--)', 'Downward, so each bundle is used at most once.'],
    ],
    math: [
      ['m = 1 + 2 + 4 + … + r', 'take = min(k, m)', 'const take = Math.min(k, m)', 'about log m bundles instead of m copies'],
      ['(take · w, take · v)', 'W, V = take * w, take * v', 'W = take * w, V = take * values[i]', 'a bundle as one 0/1 item'],
    ],
  },

  'bounded-queue': {
    code: pair(`def solve(weights, counts, target):
    M = 1000000007
    ways = [1] + [0] * target
    for w, m in zip(weights, counts):
        new = [0] * (target + 1)
        for r in range(min(w, target + 1)):
            idx = list(range(r, target + 1, w))
            window = 0
            for t, c in enumerate(idx):
                window = (window + ways[c]) % M
                if t - m - 1 >= 0:
                    window = (window - ways[idx[t - m - 1]]) % M
                new[c] = window
        ways = new
    return ways[target]
`, `function solve(weights, counts, target) {
  const M = 1000000007
  let ways = new Array(target + 1).fill(0)
  ways[0] = 1
  weights.forEach((w, i) => {
    const m = counts[i], next = new Array(target + 1).fill(0)
    for (let r = 0; r < Math.min(w, target + 1); r++) {
      let window = 0
      for (let t = 0, c = r; c <= target; t++, c += w) {
        window = (window + ways[c]) % M
        if (t - m - 1 >= 0) window = ((window - ways[c - (m + 1) * w]) % M + M) % M
        next[c] = window
      }
    }
    ways = next
  })
  return ways[target]
}
`),
    notes: [
      ['ways = [1] + [0] * target', 'ways[0] = 1', 'ways[t]: the ways to reach total weight exactly t with the items so far.'],
      ['for r in range(min(w, target + 1)):', 'for (let r = 0; r < Math.min(w, target + 1); r++)', 'Taking copies of weight w keeps a total’s remainder mod w, so each residue r is its own chain r, r + w, r + 2w, …'],
      ['window = (window + ways[c]) % M', 'window = (window + ways[c]) % M', 'new[c] adds the old ways at c, c − w, …, c − m·w: the last m + 1 values along the chain. Add the newest…'],
      ['window = (window - ways[idx[t - m - 1]]) % M', 'window = ((window - ways[c - (m + 1) * w]) % M + M) % M', '…and remove the one that has just fallen out of the window, so each step is O(1).'],
    ],
    math: [
      ['W′(c) = Σ W(c − q·w), q = 0 … m', 'new[c] = window', 'next[c] = window', 'a sliding window sum along each residue'],
      ['W(t)', 'ways[c]', 'ways[c]', 'ways to reach total weight t so far'],
    ],
  },

  'symmetry': {
    code: pair(`from functools import lru_cache
def solve(jobs, k):
    jobs = sorted(jobs, reverse=True)
    @lru_cache(None)
    def best(i, loads):
        if i == len(jobs):
            return max(loads)
        out = float('inf')
        for m in range(k):
            if m and loads[m] == loads[m - 1]:
                continue
            new = list(loads)
            new[m] += jobs[i]
            out = min(out, best(i + 1, tuple(sorted(new))))
        return out
    return best(0, tuple([0] * k))
`, `function solve(jobs, k) {
  const order = [...jobs].sort((x, y) => y - x)
  const memo = new Map()
  function best(i, loads) {
    if (i === order.length) return Math.max(...loads)
    const key = i + ':' + loads.join(',')
    if (memo.has(key)) return memo.get(key)
    let out = Infinity
    for (let m = 0; m < k; m++) {
      if (m && loads[m] === loads[m - 1]) continue
      const next = loads.slice()
      next[m] += order[i]
      out = Math.min(out, best(i + 1, next.sort((x, y) => x - y)))
    }
    memo.set(key, out)
    return out
  }
  return best(0, new Array(k).fill(0))
}
`),
    notes: [
      ['jobs = sorted(jobs, reverse=True)', 'const order = [...jobs].sort((x, y) => y - x)', 'Big jobs first: the loads spread out sooner, so more states coincide. Any order gives the same answer.'],
      ['if i == len(jobs):', 'if (i === order.length) return Math.max(...loads)', 'Every job placed: the answer for this state is the largest load.'],
      ['if m and loads[m] == loads[m - 1]:', 'if (m && loads[m] === loads[m - 1]) continue', 'Two machines with the same load are interchangeable: placing the job on either gives the same future. Try only the first.'],
      ['tuple(sorted(new))', 'next.sort((x, y) => x - y)', 'The canonical state: loads sorted, so (3, 5) and (5, 3) are memoized once.'],
    ],
    math: [
      ['state = sorted loads', 'tuple(sorted(new))', 'next.sort((x, y) => x - y)', 'machines are identical, so only the multiset of loads matters'],
      ['answer at the end', 'return max(loads)', 'return Math.max(...loads)', 'the largest machine load'],
    ],
  },
}
