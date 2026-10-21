// Test-only reference programs for the Expert challenges: the technique each lesson teaches, in Python and
// JavaScript. Never imported by the learner UI or worker. lessons.test.js runs both against every case,
// and expert-oracles.js checks the expected values without DP.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const SPACE_SOLUTIONS = {
  'rolling-arrays': pair(`def solve(grid):
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
  const M = 1000000007, C = grid[0].length, row = new Array(C).fill(0)
  row[0] = grid[0][0] ? 0 : 1
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < C; c++) {
    if (grid[r][c]) row[c] = 0
    else if (c > 0) row[c] = (row[c] + row[c - 1]) % M
  }
  return row[C - 1]
}`),

  'in-place': pair(`def solve(items, cap):
    best = [0] * (cap + 1)
    for w, v, many in items:
        caps = range(w, cap + 1) if many else range(cap, w - 1, -1)
        for c in caps:
            best[c] = max(best[c], best[c - w] + v)
    return best[cap]
`, `function solve(items, cap) {
  const best = new Array(cap + 1).fill(0)
  for (const [w, v, many] of items) {
    if (many) { for (let c = w; c <= cap; c++) best[c] = Math.max(best[c], best[c - w] + v) }
    else { for (let c = cap; c >= w; c--) best[c] = Math.max(best[c], best[c - w] + v) }
  }
  return best[cap]
}`),

  // Suffix LCS lengths, then the smallest letter that keeps the length, taken at its earliest positions.
  'hirschberg': pair(`def solve(a, b):
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
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const letters = [...new Set(a)].filter(c => b.includes(c)).sort()
  let out = '', i = 0, j = 0
  while (L[i][j] > 0) {
    for (const c of letters) {
      const ii = a.indexOf(c, i), jj = b.indexOf(c, j)
      if (ii >= 0 && jj >= 0 && L[ii + 1][jj + 1] + 1 === L[i][j]) { out += c; i = ii + 1; j = jj + 1; break }
    }
  }
  return out
}`),

  'prefix-sum-dp': pair(`def solve(n, k):
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
  const M = 1000000007, ways = new Array(n + 1).fill(0), pre = new Array(n + 2).fill(0)
  ways[0] = 1; pre[1] = 1
  for (let i = 1; i <= n; i++) {
    ways[i] = ((pre[i] - pre[Math.max(0, i - k)]) % M + M) % M
    pre[i + 1] = (pre[i] + ways[i]) % M
  }
  return ways[n]
}`),

  // Each child spreads ways[t] over [t, t + limit] with a difference array, then a prefix sum.
  'difference-dp': pair(`def solve(limits, total):
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
  let ways = new Array(total + 1).fill(0)
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
    for (let t = 0; t <= total; t++) { run = (run + diff[t]) % M; ways[t] = run }
  }
  return ways[total]
}`),

  'monotone-queue': pair(`from collections import deque
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
  const best = new Array(a.length).fill(0), q = [0]
  let head = 0
  best[0] = a[0]
  for (let i = 1; i < a.length; i++) {
    while (q[head] < i - k) head++
    best[i] = a[i] + best[q[head]]
    while (q.length > head && best[q[q.length - 1]] <= best[i]) q.pop()
    q.push(i)
  }
  return best[a.length - 1]
}`),

  // Increasing subsequences ending at each value: 1 + those ending at a smaller value (a Fenwick sum).
  'fenwick-dp': pair(`def solve(a):
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
  const M = 1000000007, vals = [...new Set(a)].sort((x, y) => x - y), rank = new Map(vals.map((v, i) => [v, i + 1])), tree = new Array(vals.length + 1).fill(0)
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
}`),

  'segment-tree-dp': pair(`from bisect import bisect_left, bisect_right
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
}`),

  // Values up to 10⁹ become ranks; a Fenwick tree keeps the best sum ending below each rank.
  'coordinate-compression': pair(`def solve(a):
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
  const vals = [...new Set(a)].sort((x, y) => x - y), rank = new Map(vals.map((v, i) => [v, i + 1])), tree = new Array(vals.length + 1).fill(0)
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
}`),

  'pareto-frontiers': pair(`def solve(weights, values, cap):
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
    const cand = [...front, ...front.filter(([fw]) => fw + w <= cap).map(([fw, fv]) => [fw + w, fv + values[i]])]
    cand.sort((p, q) => p[0] - q[0] || q[1] - p[1])
    front = []
    for (const p of cand) if (!front.length || p[1] > front[front.length - 1][1]) front.push(p)
  })
  return front[front.length - 1][1]
}`),

  'bitset-dp': pair(`def solve(values):
    B = 1
    for v in values:
        B |= B << v
    return bin(B).count('1')
`, `function solve(values) {
  let B = 1n
  for (const v of values) B |= B << BigInt(v)
  let count = 0
  for (const ch of B.toString(2)) if (ch === '1') count++
  return count
}`),

  'bounded-binary': pair(`def solve(weights, values, counts, cap):
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
}`),

  // Counting: for each residue r mod w, new[r + t·w] adds a sliding window of the last m + 1 old values.
  'bounded-queue': pair(`def solve(weights, counts, target):
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
}`),

  // Machines are interchangeable: memoize on the sorted loads, and skip a machine equal to the one before.
  'symmetry': pair(`from functools import lru_cache
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
  const order = [...jobs].sort((x, y) => y - x), memo = new Map()
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
}`),
}

export const EXPERT_SOLUTIONS = { ...SPACE_SOLUTIONS }
