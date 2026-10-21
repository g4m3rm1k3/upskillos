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

const SPLIT_SOLUTIONS = {
  // Neighbouring rows and columns are enough: every larger rectangle is a sum of adjacent ones.
  'monge': pair(`def solve(A):
    for i in range(len(A) - 1):
        for j in range(len(A[0]) - 1):
            if A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]:
                return False
    return True
`, `function solve(A) {
  for (let i = 0; i + 1 < A.length; i++) {
    for (let j = 0; j + 1 < A[0].length; j++) {
      if (A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]) return false
    }
  }
  return true
}`),

  'divide-conquer-opt': pair(`def solve(a, g):
    n = len(a)
    P = [0] * (n + 1)
    for i, x in enumerate(a):
        P[i + 1] = P[i] + x
    INF = float('inf')
    prev = [0] + [INF] * n
    for _ in range(g):
        cur = [INF] * (n + 1)
        def fill(lo, hi, klo, khi):
            if lo > hi:
                return
            mid = (lo + hi) // 2
            best, at = INF, klo
            for k in range(klo, min(mid - 1, khi) + 1):
                v = prev[k] + (P[mid] - P[k]) ** 2
                if v < best:
                    best, at = v, k
            cur[mid] = best
            fill(lo, mid - 1, klo, at)
            fill(mid + 1, hi, at, khi)
        fill(1, n, 0, n - 1)
        prev = cur
    return prev[n]
`, `function solve(a, g) {
  const n = a.length, P = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + a[i]
  let prev = new Array(n + 1).fill(Infinity)
  prev[0] = 0
  for (let layer = 0; layer < g; layer++) {
    const cur = new Array(n + 1).fill(Infinity)
    const fill = (lo, hi, klo, khi) => {
      if (lo > hi) return
      const mid = Math.floor((lo + hi) / 2)
      let best = Infinity, at = klo
      for (let k = klo; k <= Math.min(mid - 1, khi); k++) {
        const v = prev[k] + (P[mid] - P[k]) ** 2
        if (v < best) { best = v; at = k }
      }
      cur[mid] = best
      fill(lo, mid - 1, klo, at)
      fill(mid + 1, hi, at, khi)
    }
    fill(1, n, 0, n - 1)
    prev = cur
  }
  return prev[n]
}`),

  'knuth': pair(`def solve(piles):
    n = len(piles)
    if n <= 1:
        return 0
    P = [0] * (n + 1)
    for i, x in enumerate(piles):
        P[i + 1] = P[i] + x
    D = [[0] * n for _ in range(n)]
    opt = [[i] * n for i in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            best, at = None, i
            for k in range(opt[i][j - 1], min(opt[i + 1][j], j - 1) + 1):
                v = D[i][k] + D[k + 1][j]
                if best is None or v < best:
                    best, at = v, k
            D[i][j] = best + P[j + 1] - P[i]
            opt[i][j] = at
    return D[0][n - 1]
`, `function solve(piles) {
  const n = piles.length
  if (n <= 1) return 0
  const P = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + piles[i]
  const D = Array.from({ length: n }, () => new Array(n).fill(0))
  const opt = Array.from({ length: n }, (_, i) => new Array(n).fill(i))
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length - 1 < n; i++) {
      const j = i + length - 1
      let best = Infinity, at = i
      for (let k = opt[i][j - 1]; k <= Math.min(opt[i + 1][j], j - 1); k++) {
        const v = D[i][k] + D[k + 1][j]
        if (v < best) { best = v; at = k }
      }
      D[i][j] = best + P[j + 1] - P[i]
      opt[i][j] = at
    }
  }
  return D[0][n - 1]
}`),

  // SMAWK on the matrix f(i, j) = w[j] + (x[i] − y[j])², which is Monge because x and y are sorted.
  'smawk': pair(`def solve(x, y, w):
    if not x:
        return 0
    def f(i, j):
        return w[j] + (x[i] - y[j]) ** 2
    best = {}
    def rec(rows, cols):
        stack = []
        for c in cols:
            while stack and f(rows[len(stack) - 1], stack[-1]) > f(rows[len(stack) - 1], c):
                stack.pop()
            if len(stack) < len(rows):
                stack.append(c)
        cols = stack
        if len(rows) > 1:
            rec(rows[1::2], cols)
        j = 0
        for t in range(0, len(rows), 2):
            r = rows[t]
            stop = best[rows[t + 1]] if t + 1 < len(rows) else cols[-1]
            m = cols[j]
            while True:
                if f(r, cols[j]) < f(r, m):
                    m = cols[j]
                if cols[j] == stop:
                    break
                j += 1
            best[r] = m
    rec(list(range(len(x))), list(range(len(y))))
    return sum(f(i, best[i]) for i in range(len(x)))
`, `function solve(x, y, w) {
  if (!x.length) return 0
  const f = (i, j) => w[j] + (x[i] - y[j]) ** 2
  const best = new Array(x.length)
  const rec = (rows, cols) => {
    const stack = []
    for (const c of cols) {
      while (stack.length && f(rows[stack.length - 1], stack[stack.length - 1]) > f(rows[stack.length - 1], c)) stack.pop()
      if (stack.length < rows.length) stack.push(c)
    }
    cols = stack
    if (rows.length > 1) rec(rows.filter((_, t) => t % 2 === 1), cols)
    let j = 0
    for (let t = 0; t < rows.length; t += 2) {
      const r = rows[t]
      const stop = t + 1 < rows.length ? best[rows[t + 1]] : cols[cols.length - 1]
      let m = cols[j]
      while (true) {
        if (f(r, cols[j]) < f(r, m)) m = cols[j]
        if (cols[j] === stop) break
        j++
      }
      best[r] = m
    }
  }
  rec(x.map((_, i) => i), y.map((_, j) => j))
  return x.reduce((t, _, i) => t + f(i, best[i]), 0)
}`),

  // Lines y = −2P(j)·x + D(j) + P(j)², slopes decreasing; each query binary-searches the hull.
  'cht': pair(`def solve(words, M):
    n = len(words)
    P = [0] * (n + 1)
    for i, x in enumerate(words):
        P[i + 1] = P[i] + x
    D = [0] * (n + 1)
    hull = []
    def useless(l1, l2, l3):
        return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])
    def add(m, b):
        while len(hull) >= 2 and useless(hull[-2], hull[-1], (m, b)):
            hull.pop()
        hull.append((m, b))
    def query(x):
        lo, hi = 0, len(hull) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if hull[mid][0] * x + hull[mid][1] <= hull[mid + 1][0] * x + hull[mid + 1][1]:
                hi = mid
            else:
                lo = mid + 1
        return hull[lo][0] * x + hull[lo][1]
    add(0, 0)
    for i in range(1, n + 1):
        D[i] = query(P[i]) + P[i] ** 2 + M
        add(-2 * P[i], D[i] + P[i] ** 2)
    return D[n]
`, `function solve(words, M) {
  const n = words.length, P = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + words[i]
  const D = new Array(n + 1).fill(0)
  const hull = []
  const useless = (l1, l2, l3) => (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])
  const add = (m, b) => {
    while (hull.length >= 2 && useless(hull[hull.length - 2], hull[hull.length - 1], [m, b])) hull.pop()
    hull.push([m, b])
  }
  const query = x => {
    let lo = 0, hi = hull.length - 1
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (hull[mid][0] * x + hull[mid][1] <= hull[mid + 1][0] * x + hull[mid + 1][1]) hi = mid
      else lo = mid + 1
    }
    return hull[lo][0] * x + hull[lo][1]
  }
  add(0, 0)
  for (let i = 1; i <= n; i++) {
    D[i] = query(P[i]) + P[i] ** 2 + M
    add(-2 * P[i], D[i] + P[i] ** 2)
  }
  return D[n]
}`),

  // A maximum hull: slopes −2a·P(j) rise (a < 0) and queries P(i) rise, so a front pointer only moves forward.
  'monotone-cht': pair(`def solve(x, a, b, c):
    n = len(x)
    P = [0] * (n + 1)
    for i, v in enumerate(x):
        P[i + 1] = P[i] + v
    D = [0] * (n + 1)
    hull = [(0, 0)]
    front = 0
    def at(line, t):
        return line[0] * t + line[1]
    def useless(l1, l2, l3):
        return (l1[1] - l3[1]) * (l2[0] - l1[0]) <= (l1[1] - l2[1]) * (l3[0] - l1[0])
    for i in range(1, n + 1):
        t = P[i]
        while front + 1 < len(hull) and at(hull[front + 1], t) >= at(hull[front], t):
            front += 1
        D[i] = at(hull[front], t) + a * t * t + b * t + c
        line = (-2 * a * t, D[i] + a * t * t - b * t)
        while len(hull) - front >= 2 and useless(hull[-2], hull[-1], line):
            hull.pop()
        hull.append(line)
    return D[n]
`, `function solve(x, a, b, c) {
  const n = x.length, P = new Array(n + 1).fill(0)
  for (let i = 0; i < n; i++) P[i + 1] = P[i] + x[i]
  const D = new Array(n + 1).fill(0)
  const hull = [[0, 0]]
  let front = 0
  const at = (line, t) => line[0] * t + line[1]
  const useless = (l1, l2, l3) => (l1[1] - l3[1]) * (l2[0] - l1[0]) <= (l1[1] - l2[1]) * (l3[0] - l1[0])
  for (let i = 1; i <= n; i++) {
    const t = P[i]
    while (front + 1 < hull.length && at(hull[front + 1], t) >= at(hull[front], t)) front++
    D[i] = at(hull[front], t) + a * t * t + b * t + c
    const line = [-2 * a * t, D[i] + a * t * t - b * t]
    while (hull.length - front >= 2 && useless(hull[hull.length - 2], hull[hull.length - 1], line)) hull.pop()
    hull.push(line)
  }
  return D[n]
}`),

  // A Li Chao tree over heights 0 … 10⁶: each node keeps the line that is lowest at its midpoint.
  'li-chao': pair(`def solve(h, C):
    LO, HI = 0, 1000000
    tree = {}
    def at(line, x):
        return line[0] * x + line[1]
    def insert(line):
        node, lo, hi = 1, LO, HI
        while True:
            if node not in tree:
                tree[node] = line
                return
            mid = (lo + hi) // 2
            if at(line, mid) < at(tree[node], mid):
                tree[node], line = line, tree[node]
            if lo == hi:
                return
            if at(line, lo) < at(tree[node], lo):
                node, hi = 2 * node, mid
            elif at(line, hi) < at(tree[node], hi):
                node, lo = 2 * node + 1, mid + 1
            else:
                return
    def query(x):
        node, lo, hi, best = 1, LO, HI, None
        while node in tree:
            v = at(tree[node], x)
            if best is None or v < best:
                best = v
            if lo == hi:
                break
            mid = (lo + hi) // 2
            if x <= mid:
                node, hi = 2 * node, mid
            else:
                node, lo = 2 * node + 1, mid + 1
        return best
    D = 0
    insert((-2 * h[0], h[0] ** 2))
    for i in range(1, len(h)):
        D = query(h[i]) + h[i] ** 2 + C
        insert((-2 * h[i], D + h[i] ** 2))
    return D
`, `function solve(h, C) {
  const LO = 0, HI = 1000000, tree = new Map()
  const at = (line, x) => line[0] * x + line[1]
  const insert = line => {
    let node = 1, lo = LO, hi = HI
    while (true) {
      if (!tree.has(node)) { tree.set(node, line); return }
      const mid = Math.floor((lo + hi) / 2)
      if (at(line, mid) < at(tree.get(node), mid)) { const kept = tree.get(node); tree.set(node, line); line = kept }
      if (lo === hi) return
      if (at(line, lo) < at(tree.get(node), lo)) { node = 2 * node; hi = mid }
      else if (at(line, hi) < at(tree.get(node), hi)) { node = 2 * node + 1; lo = mid + 1 }
      else return
    }
  }
  const query = x => {
    let node = 1, lo = LO, hi = HI, best = Infinity
    while (tree.has(node)) {
      best = Math.min(best, at(tree.get(node), x))
      if (lo === hi) break
      const mid = Math.floor((lo + hi) / 2)
      if (x <= mid) { node = 2 * node; hi = mid } else { node = 2 * node + 1; lo = mid + 1 }
    }
    return best
  }
  let D = 0
  insert([-2 * h[0], h[0] ** 2])
  for (let i = 1; i < h.length; i++) {
    D = query(h[i]) + h[i] ** 2 + C
    insert([-2 * h[i], D + h[i] ** 2])
  }
  return D
}`),

  // The monotone hull of the frog problem in exact integers: Python’s grow on their own, JavaScript uses BigInt.
  'cht-numeric': pair(`def solve(h, C):
    n = len(h)
    D = [0] * n
    hull = [(-2 * h[0], h[0] ** 2)]
    front = 0
    def at(line, x):
        return line[0] * x + line[1]
    def useless(l1, l2, l3):
        return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])
    for i in range(1, n):
        x = h[i]
        while front + 1 < len(hull) and at(hull[front + 1], x) <= at(hull[front], x):
            front += 1
        D[i] = at(hull[front], x) + x * x + C
        line = (-2 * x, D[i] + x * x)
        while len(hull) - front >= 2 and useless(hull[-2], hull[-1], line):
            hull.pop()
        hull.append(line)
    return str(D[n - 1])
`, `function solve(h, C) {
  const n = h.length, H = h.map(BigInt), K = BigInt(C)
  const D = new Array(n).fill(0n)
  const hull = [[-2n * H[0], H[0] * H[0]]]
  let front = 0
  const at = (line, x) => line[0] * x + line[1]
  const useless = (l1, l2, l3) => (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])
  for (let i = 1; i < n; i++) {
    const x = H[i]
    while (front + 1 < hull.length && at(hull[front + 1], x) <= at(hull[front], x)) front++
    D[i] = at(hull[front], x) + x * x + K
    const line = [-2n * x, D[i] + x * x]
    while (hull.length - front >= 2 && useless(hull[hull.length - 2], hull[hull.length - 1], line)) hull.pop()
    hull.push(line)
  }
  return String(D[n - 1])
}`),

  // Charge lam per segment, find the smallest lam whose best uses at most k segments (ties: fewer), add lam·k back.
  'lagrangian': pair(`def solve(a, k):
    def better(p, q):
        return p if (p[0], -p[1]) >= (q[0], -q[1]) else q
    def best(lam):
        out, inside = (0, 0), None
        for x in a:
            before = out if inside is None else better(out, inside)
            start = (before[0] - lam + x, before[1] + 1)
            new_inside = start if inside is None else better((inside[0] + x, inside[1]), start)
            new_out = out if inside is None else better(out, inside)
            out, inside = new_out, new_inside
        return out if inside is None else better(out, inside)
    lo, hi = -100000, 100000
    while lo < hi:
        mid = (lo + hi) // 2
        if best(mid)[1] <= k:
            hi = mid
        else:
            lo = mid + 1
    return best(lo)[0] + lo * k
`, `function solve(a, k) {
  const better = (p, q) => (p[0] > q[0] || (p[0] === q[0] && p[1] <= q[1]) ? p : q)
  const best = lam => {
    let out = [0, 0], inside = null
    for (const x of a) {
      const before = inside === null ? out : better(out, inside)
      const start = [before[0] - lam + x, before[1] + 1]
      const newInside = inside === null ? start : better([inside[0] + x, inside[1]], start)
      const newOut = inside === null ? out : better(out, inside)
      out = newOut; inside = newInside
    }
    return inside === null ? out : better(out, inside)
  }
  let lo = -100000, hi = 100000
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (best(mid)[1] <= k) hi = mid
    else lo = mid + 1
  }
  return best(lo)[0] + lo * k
}`),

  // A max-heap of breakpoints: a value below the largest kept one pays the gap and replaces it.
  'slope-trick': pair(`import heapq

def solve(a):
    heap, cost = [], 0
    for x in a:
        heapq.heappush(heap, -x)
        if -heap[0] > x:
            cost += -heap[0] - x
            heapq.heapreplace(heap, -x)
    return cost
`, `function solve(a) {
  const heap = []
  const push = v => {
    heap.push(v)
    let i = heap.length - 1
    while (i > 0 && heap[(i - 1) >> 1] < heap[i]) { [heap[i], heap[(i - 1) >> 1]] = [heap[(i - 1) >> 1], heap[i]]; i = (i - 1) >> 1 }
  }
  const replaceTop = v => {
    heap[0] = v
    let i = 0
    while (true) {
      let big = i
      for (const c of [2 * i + 1, 2 * i + 2]) if (c < heap.length && heap[c] > heap[big]) big = c
      if (big === i) return
      ;[heap[i], heap[big]] = [heap[big], heap[i]]
      i = big
    }
  }
  let cost = 0
  for (const x of a) {
    push(x)
    if (heap[0] > x) {
      cost += heap[0] - x
      replaceTop(x)
    }
  }
  return cost
}`),

  'cdq': pair(`def solve(x, y):
    n = len(x)
    if n == 0:
        return 0
    rank = {v: r + 1 for r, v in enumerate(sorted(set(y)))}
    m = len(rank)
    tree = [0] * (m + 1)
    best = [1] * n
    def put(i, v):
        while i <= m:
            tree[i] = max(tree[i], v)
            i += i & -i
    def get(i):
        r = 0
        while i > 0:
            r = max(r, tree[i])
            i -= i & -i
        return r
    def clear(i):
        while i <= m:
            tree[i] = 0
            i += i & -i
    def go(lo, hi):
        if hi - lo <= 1:
            return
        mid = (lo + hi) // 2
        go(lo, mid)
        left = sorted(range(lo, mid), key=lambda i: x[i])
        right = sorted(range(mid, hi), key=lambda i: x[i])
        p = 0
        for j in right:
            while p < len(left) and x[left[p]] < x[j]:
                put(rank[y[left[p]]], best[left[p]])
                p += 1
            best[j] = max(best[j], get(rank[y[j]] - 1) + 1)
        for i in left[:p]:
            clear(rank[y[i]])
        go(mid, hi)
    go(0, n)
    return max(best)
`, `function solve(x, y) {
  const n = x.length
  if (n === 0) return 0
  const ys = [...new Set(y)].sort((p, q) => p - q)
  const rank = new Map(ys.map((v, r) => [v, r + 1]))
  const m = ys.length, tree = new Array(m + 1).fill(0), best = new Array(n).fill(1)
  const put = (i, v) => { for (; i <= m; i += i & -i) tree[i] = Math.max(tree[i], v) }
  const get = i => { let r = 0; for (; i > 0; i -= i & -i) r = Math.max(r, tree[i]); return r }
  const clear = i => { for (; i <= m; i += i & -i) tree[i] = 0 }
  const go = (lo, hi) => {
    if (hi - lo <= 1) return
    const mid = Math.floor((lo + hi) / 2)
    go(lo, mid)
    const byX = (p, q) => x[p] - x[q]
    const left = [], right = []
    for (let i = lo; i < mid; i++) left.push(i)
    for (let i = mid; i < hi; i++) right.push(i)
    left.sort(byX); right.sort(byX)
    let p = 0
    for (const j of right) {
      while (p < left.length && x[left[p]] < x[j]) { put(rank.get(y[left[p]]), best[left[p]]); p++ }
      best[j] = Math.max(best[j], get(rank.get(y[j]) - 1) + 1)
    }
    for (let t = 0; t < p; t++) clear(rank.get(y[left[t]]))
    go(mid, hi)
  }
  go(0, n)
  return Math.max(...best)
}`),

  // Solve the left half, send its finished terms across the middle, then solve the right half.
  'online-convolution': pair(`def solve(b, n):
    M = 998244353
    a = [0] * (n + 1)
    a[0] = 1
    def go(lo, hi):
        if hi - lo <= 1:
            return
        mid = (lo + hi) // 2
        go(lo, mid)
        for i in range(lo, mid):
            for t in range(mid, min(hi, i + len(b))):
                a[t] = (a[t] + a[i] * b[t - i]) % M
        go(mid, hi)
    go(0, n + 1)
    return a[n]
`, `function solve(b, n) {
  const M = 998244353, a = new Array(n + 1).fill(0)
  a[0] = 1
  const go = (lo, hi) => {
    if (hi - lo <= 1) return
    const mid = Math.floor((lo + hi) / 2)
    go(lo, mid)
    for (let i = lo; i < mid; i++) {
      for (let t = mid; t < Math.min(hi, i + b.length); t++) a[t] = (a[t] + a[i] * b[t - i]) % M
    }
    go(mid, hi)
  }
  go(0, n + 1)
  return a[n]
}`),
}

const ALGEBRA_SOLUTIONS = {
  // The adjacency matrix to the n-th power, by repeated squaring.
  'matrix-power': pair(`def solve(k, edges, n):
    M = 1000000007
    A = [[0] * k for _ in range(k)]
    for u, v in edges:
        A[u][v] += 1
    def times(X, Y):
        return [[sum(X[i][t] * Y[t][j] for t in range(k)) % M for j in range(k)] for i in range(k)]
    R = [[int(i == j) for j in range(k)] for i in range(k)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, A)
        A = times(A, A)
        n //= 2
    return R[0][k - 1]
`, `function solve(k, edges, n) {
  const M = 1000000007
  const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M
  let A = Array.from({ length: k }, () => new Array(k).fill(0))
  for (const [u, v] of edges) A[u][v] += 1
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let s = 0
    for (let t = 0; t < k; t++) s = (s + mul(X[i][t], Y[t][j])) % M
    return s
  }))
  let R = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, A)
    A = times(A, A)
    n = Math.floor(n / 2)
  }
  return R[0][k - 1]
}`),

  // Kitamasa: x^n reduced modulo the recurrence, then combined with the first k terms.
  'linear-recurrence': pair(`def solve(c, a, n):
    M = 998244353
    k = len(c)
    if n < k:
        return a[n] % M
    def times(p, q):
        r = [0] * (2 * k - 1)
        for i, x in enumerate(p):
            for j, y in enumerate(q):
                r[i + j] = (r[i + j] + x * y) % M
        for d in range(2 * k - 2, k - 1, -1):
            for i in range(k):
                r[d - 1 - i] = (r[d - 1 - i] + r[d] * c[i]) % M
        return r[:k]
    result = [1] + [0] * (k - 1)
    base = [0, 1] + [0] * (k - 2) if k > 1 else [c[0] % M]
    while n > 0:
        if n % 2 == 1:
            result = times(result, base)
        base = times(base, base)
        n //= 2
    return sum(result[i] * a[i] for i in range(k)) % M
`, `function solve(c, a, n) {
  const M = 998244353, k = c.length
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  if (n < k) return a[n] % M
  const times = (p, q) => {
    const r = new Array(2 * k - 1).fill(0)
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) r[i + j] = (r[i + j] + mul(p[i], q[j])) % M
    for (let d = 2 * k - 2; d >= k; d--) {
      for (let i = 0; i < k; i++) r[d - 1 - i] = (r[d - 1 - i] + mul(r[d], c[i])) % M
    }
    return r.slice(0, k)
  }
  let result = new Array(k).fill(0)
  result[0] = 1
  let base = k > 1 ? [0, 1, ...new Array(k - 2).fill(0)] : [c[0] % M]
  while (n > 0) {
    if (n % 2 === 1) result = times(result, base)
    base = times(base, base)
    n = Math.floor(n / 2)
  }
  let total = 0
  for (let i = 0; i < k; i++) total = (total + mul(result[i], a[i] % M)) % M
  return total
}`),

  // Berlekamp–Massey finds the shortest recurrence; the next term follows from it.
  'berlekamp-massey': pair(`def solve(s):
    M = 998244353
    s = [x % M for x in s]
    C, B = [1], [1]
    L, m, b = 0, 1, 1
    for i in range(len(s)):
        d = s[i]
        for j in range(1, L + 1):
            d = (d + C[j] * s[i - j]) % M
        if d == 0:
            m += 1
            continue
        coef = d * pow(b, M - 2, M) % M
        T = C[:]
        C = C + [0] * max(0, len(B) + m - len(C))
        for j in range(len(B)):
            C[j + m] = (C[j + m] - coef * B[j]) % M
        if 2 * L <= i:
            L, B, b, m = i + 1 - L, T, d, 1
        else:
            m += 1
    return sum(-C[j] * s[len(s) - j] for j in range(1, L + 1)) % M
`, `function solve(s) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  s = s.map(x => ((x % M) + M) % M)
  let C = [1], B = [1], L = 0, m = 1, b = 1
  for (let i = 0; i < s.length; i++) {
    let d = s[i]
    for (let j = 1; j <= L; j++) d = (d + mul(C[j], s[i - j])) % M
    if (d === 0) { m++; continue }
    const coef = mul(d, pow(b, M - 2))
    const T = C.slice()
    while (C.length < B.length + m) C.push(0)
    for (let j = 0; j < B.length; j++) C[j + m] = (C[j + m] - mul(coef, B[j]) + M) % M
    if (2 * L <= i) { L = i + 1 - L; B = T; b = d; m = 1 } else m++
  }
  let next = 0
  for (let j = 1; j <= L; j++) next = (next - mul(C[j], s[s.length - j]) + M) % M
  return next
}`),

  // Bostan–Mori: multiply top and bottom by Q(−x), keep the half of the coefficients n needs, halve n.
  'bostan-mori': pair(`def solve(p, q, n):
    M = 998244353
    p = [x % M for x in p]
    q = [x % M for x in q]
    def times(u, v):
        r = [0] * (len(u) + len(v) - 1)
        for i, x in enumerate(u):
            for j, y in enumerate(v):
                r[i + j] = (r[i + j] + x * y) % M
        return r
    while n > 0:
        qm = [(-x if i % 2 else x) % M for i, x in enumerate(q)]
        u = times(p, qm)
        q = times(q, qm)[::2]
        p = u[n % 2::2]
        n //= 2
    return p[0] * pow(q[0], M - 2, M) % M if p else 0
`, `function solve(p, q, n) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  p = p.map(x => ((x % M) + M) % M)
  q = q.map(x => ((x % M) + M) % M)
  const times = (u, v) => {
    const r = new Array(u.length + v.length - 1).fill(0)
    for (let i = 0; i < u.length; i++) for (let j = 0; j < v.length; j++) r[i + j] = (r[i + j] + mul(u[i], v[j])) % M
    return r
  }
  while (n > 0) {
    const qm = q.map((x, i) => (i % 2 ? (M - x) % M : x))
    const u = times(p, qm)
    q = times(q, qm).filter((_, i) => i % 2 === 0)
    p = u.filter((_, i) => i % 2 === n % 2)
    n = Math.floor(n / 2)
  }
  return p.length ? mul(p[0], pow(q[0], M - 2)) : 0
}`),

  // From g·f′ = m·g′·f: each coefficient of f = g^m from the few before it.
  'generating-functions': pair(`def solve(g, m, n):
    M = 998244353
    f = [1] + [0] * n
    inv = [0, 1] + [0] * n
    for k in range(2, n + 1):
        inv[k] = (M - (M // k) * inv[M % k] % M) % M
    for k in range(1, n + 1):
        t = 0
        for i in range(1, min(k, len(g) - 1) + 1):
            t += g[i] * f[k - i] * (m * i - (k - i))
        f[k] = t % M * inv[k] % M
    return f[n]
`, `function solve(g, m, n) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const f = new Array(n + 1).fill(0), inv = new Array(n + 2).fill(0)
  f[0] = 1
  inv[1] = 1
  for (let k = 2; k <= n; k++) inv[k] = (M - mul(Math.floor(M / k), inv[M % k])) % M
  for (let k = 1; k <= n; k++) {
    let t = 0
    for (let i = 1; i <= Math.min(k, g.length - 1); i++) {
      const weight = (((m * i - (k - i)) % M) + M) % M
      t = (t + mul(mul(g[i], f[k - i]), weight)) % M
    }
    f[k] = mul(t, inv[k])
  }
  return f[n]
}`),

  // Count the values on each side, multiply the two count polynomials with an NTT.
  'fft-ntt': pair(`def solve(a, b):
    if not a or not b:
        return []
    M, G = 998244353, 3
    size = max(a) + max(b) + 1
    n = 1
    while n < size:
        n *= 2
    def ntt(f, invert):
        j = 0
        for i in range(1, n):
            bit = n >> 1
            while j & bit:
                j ^= bit
                bit >>= 1
            j |= bit
            if i < j:
                f[i], f[j] = f[j], f[i]
        length = 2
        while length <= n:
            w = pow(G, (M - 1) // length, M)
            if invert:
                w = pow(w, M - 2, M)
            half = length // 2
            for start in range(0, n, length):
                wk = 1
                for t in range(start, start + half):
                    u, v = f[t], f[t + half] * wk % M
                    f[t] = (u + v) % M
                    f[t + half] = (u - v) % M
                    wk = wk * w % M
            length *= 2
        if invert:
            inv_n = pow(n, M - 2, M)
            for i in range(n):
                f[i] = f[i] * inv_n % M
    A, B = [0] * n, [0] * n
    for x in a:
        A[x] += 1
    for y in b:
        B[y] += 1
    ntt(A, False)
    ntt(B, False)
    C = [A[i] * B[i] % M for i in range(n)]
    ntt(C, True)
    return C[:size]
`, `function solve(a, b) {
  if (!a.length || !b.length) return []
  const M = 998244353, G = 3
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  const size = Math.max(...a) + Math.max(...b) + 1
  let n = 1
  while (n < size) n *= 2
  const ntt = (f, invert) => {
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j |= bit
      if (i < j) [f[i], f[j]] = [f[j], f[i]]
    }
    for (let length = 2; length <= n; length *= 2) {
      let w = pow(G, (M - 1) / length)
      if (invert) w = pow(w, M - 2)
      const half = length / 2
      for (let start = 0; start < n; start += length) {
        let wk = 1
        for (let t = start; t < start + half; t++) {
          const u = f[t], v = mul(f[t + half], wk)
          f[t] = (u + v) % M
          f[t + half] = (u - v + M) % M
          wk = mul(wk, w)
        }
      }
    }
    if (invert) { const invN = pow(n, M - 2); for (let i = 0; i < n; i++) f[i] = mul(f[i], invN) }
  }
  const A = new Array(n).fill(0), B = new Array(n).fill(0)
  for (const x of a) A[x] += 1
  for (const y of b) B[y] += 1
  ntt(A, false)
  ntt(B, false)
  const C = A.map((x, i) => mul(x, B[i]))
  ntt(C, true)
  return C.slice(0, size)
}`),

  // One bit at a time: a mask with the bit takes in the value of the mask without it.
  'sos': pair(`def solve(a):
    F = a[:]
    n = len(a).bit_length() - 1
    for i in range(n):
        bit = 1 << i
        for mask in range(len(F)):
            if mask & bit:
                F[mask] += F[mask ^ bit]
    return F
`, `function solve(a) {
  const F = a.slice(), n = Math.log2(a.length)
  for (let i = 0; i < n; i++) {
    const bit = 1 << i
    for (let mask = 0; mask < F.length; mask++) if (mask & bit) F[mask] += F[mask ^ bit]
  }
  return F
}`),

  // The same sweep with subtraction undoes it, one bit at a time.
  'mobius': pair(`def solve(F):
    a = F[:]
    n = len(F).bit_length() - 1
    for i in range(n):
        bit = 1 << i
        for mask in range(len(a)):
            if mask & bit:
                a[mask] -= a[mask ^ bit]
    return a
`, `function solve(F) {
  const a = F.slice(), n = Math.log2(F.length)
  for (let i = 0; i < n; i++) {
    const bit = 1 << i
    for (let mask = 0; mask < a.length; mask++) if (mask & bit) a[mask] -= a[mask ^ bit]
  }
  return a
}`),

  // Ranked zeta transform: split by size, transform, multiply sizes adding up, transform back.
  'subset-convolution': pair(`def solve(a, b):
    N = len(a)
    n = N.bit_length() - 1
    size = [bin(m).count('1') for m in range(N)]
    def sweep(f, sign):
        for i in range(n):
            bit = 1 << i
            for m in range(N):
                if m & bit:
                    f[m] += sign * f[m ^ bit]
    A = [[a[m] if size[m] == r else 0 for m in range(N)] for r in range(n + 1)]
    B = [[b[m] if size[m] == r else 0 for m in range(N)] for r in range(n + 1)]
    for r in range(n + 1):
        sweep(A[r], 1)
        sweep(B[r], 1)
    c = [0] * N
    for r in range(n + 1):
        H = [0] * N
        for i in range(r + 1):
            Ai, Bj = A[i], B[r - i]
            for m in range(N):
                H[m] += Ai[m] * Bj[m]
        sweep(H, -1)
        for m in range(N):
            if size[m] == r:
                c[m] = H[m]
    return c
`, `function solve(a, b) {
  const N = a.length, n = Math.log2(N)
  const size = a.map((_, m) => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c })
  const sweep = (f, sign) => {
    for (let i = 0; i < n; i++) {
      const bit = 1 << i
      for (let m = 0; m < N; m++) if (m & bit) f[m] += sign * f[m ^ bit]
    }
  }
  const A = [], B = []
  for (let r = 0; r <= n; r++) {
    A.push(a.map((x, m) => (size[m] === r ? x : 0)))
    B.push(b.map((x, m) => (size[m] === r ? x : 0)))
    sweep(A[r], 1)
    sweep(B[r], 1)
  }
  const c = new Array(N).fill(0)
  for (let r = 0; r <= n; r++) {
    const H = new Array(N).fill(0)
    for (let i = 0; i <= r; i++) for (let m = 0; m < N; m++) H[m] += A[i][m] * B[r - i][m]
    sweep(H, -1)
    for (let m = 0; m < N; m++) if (size[m] === r) c[m] = H[m]
  }
  return c
}`),

  // Walsh–Hadamard: transform both, multiply pointwise, transform back and divide by the length.
  'walsh-hadamard': pair(`def solve(a, b):
    N = len(a)
    def fwht(f):
        h = 1
        while h < N:
            for i in range(0, N, 2 * h):
                for j in range(i, i + h):
                    x, y = f[j], f[j + h]
                    f[j], f[j + h] = x + y, x - y
            h *= 2
    A, B = a[:], b[:]
    fwht(A)
    fwht(B)
    C = [x * y for x, y in zip(A, B)]
    fwht(C)
    return [x // N for x in C]
`, `function solve(a, b) {
  const N = a.length
  const fwht = f => {
    for (let h = 1; h < N; h *= 2) {
      for (let i = 0; i < N; i += 2 * h) {
        for (let j = i; j < i + h; j++) {
          const x = f[j], y = f[j + h]
          f[j] = x + y
          f[j + h] = x - y
        }
      }
    }
  }
  const A = a.slice(), B = b.slice()
  fwht(A)
  fwht(B)
  const C = A.map((x, i) => x * B[i])
  fwht(C)
  return C.map(x => x / N)
}`),

  // The same matrix power in the (min, +) semiring: + becomes min, × becomes +.
  'semirings': pair(`def solve(k, edges, n):
    INF = float('inf')
    A = [[INF] * k for _ in range(k)]
    for u, v, w in edges:
        A[u][v] = min(A[u][v], w)
    def times(X, Y):
        return [[min(X[i][t] + Y[t][j] for t in range(k)) for j in range(k)] for i in range(k)]
    R = [[0 if i == j else INF for j in range(k)] for i in range(k)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, A)
        A = times(A, A)
        n //= 2
    return -1 if R[0][k - 1] == INF else R[0][k - 1]
`, `function solve(k, edges, n) {
  let A = Array.from({ length: k }, () => new Array(k).fill(Infinity))
  for (const [u, v, w] of edges) A[u][v] = Math.min(A[u][v], w)
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let best = Infinity
    for (let t = 0; t < k; t++) best = Math.min(best, X[i][t] + Y[t][j])
    return best
  }))
  let R = A.map((row, i) => row.map((_, j) => (i === j ? 0 : Infinity)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, A)
    A = times(A, A)
    n = Math.floor(n / 2)
  }
  return R[0][k - 1] === Infinity ? -1 : R[0][k - 1]
}`),

  // A column’s state is which cells are already covered from the left; T counts the ways to fill a column.
  'transfer-matrix': pair(`def solve(w, n):
    M = 1000000007
    S = 1 << w
    T = [[0] * S for _ in range(S)]
    def fill(r, covered, nxt, start):
        if r == w:
            T[start][nxt] += 1
            return
        if covered >> r & 1:
            fill(r + 1, covered, nxt, start)
            return
        fill(r + 1, covered, nxt | 1 << r, start)
        if r + 1 < w and not covered >> (r + 1) & 1:
            fill(r + 2, covered, nxt, start)
    for s in range(S):
        fill(0, s, 0, s)
    def times(X, Y):
        return [[sum(X[i][t] * Y[t][j] for t in range(S)) % M for j in range(S)] for i in range(S)]
    R = [[int(i == j) for j in range(S)] for i in range(S)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, T)
        T = times(T, T)
        n //= 2
    return R[0][0]
`, `function solve(w, n) {
  const M = 1000000007, S = 1 << w
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  let T = Array.from({ length: S }, () => new Array(S).fill(0))
  const fill = (r, covered, nxt, start) => {
    if (r === w) { T[start][nxt] += 1; return }
    if ((covered >> r) & 1) { fill(r + 1, covered, nxt, start); return }
    fill(r + 1, covered, nxt | (1 << r), start)
    if (r + 1 < w && !((covered >> (r + 1)) & 1)) fill(r + 2, covered, nxt, start)
  }
  for (let s = 0; s < S; s++) fill(0, s, 0, s)
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let sum = 0
    for (let t = 0; t < S; t++) sum = (sum + mul(X[i][t], Y[t][j])) % M
    return sum
  }))
  let R = T.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, T)
    T = times(T, T)
    n = Math.floor(n / 2)
  }
  return R[0][0]
}`),
}

export const EXPERT_SOLUTIONS = { ...SPACE_SOLUTIONS, ...SPLIT_SOLUTIONS, ...ALGEBRA_SOLUTIONS }
