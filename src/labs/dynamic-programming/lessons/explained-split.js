// Reference solutions explained line by line for the split-point lessons (Expert, opt-splits group).
// Format: explained.js.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SPLIT_EXPLAINED = {
  'monge': {
    code: pair(`def solve(A):
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
}
`),
    notes: [
      ['for i in range(len(A) - 1):', 'for (let i = 0; i + 1 < A.length; i++)', 'Only neighbouring rows i and i + 1: any larger gap between rows is a sum of neighbouring ones.'],
      ['if A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]:', 'if (A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]) return false', 'The 2 × 2 test on neighbouring cells: the diagonal pair may not cost more than the crossed pair.'],
      ['return True', 'return true', 'Every neighbouring square passes, and every larger rectangle’s inequality is a sum of theirs, so the whole matrix is Monge.'],
    ],
    math: [
      ['A(i, j) + A(i+1, j+1) ≤ A(i, j+1) + A(i+1, j)', 'A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]', 'A[i][j] + A[i + 1][j + 1] > A[i][j + 1] + A[i + 1][j]', 'the neighbouring 2 × 2 inequality (the code tests its failure)'],
      ['A(i, j)', 'A[i][j]', 'A[i][j]', 'the entry in row i, column j'],
    ],
  },

  'divide-conquer-opt': {
    code: pair(`def solve(a, g):
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
}
`),
    notes: [
      ['P[i + 1] = P[i] + x', 'P[i + 1] = P[i] + a[i]', 'Prefix sums: a group from k to j − 1 sums to P[j] − P[k] in O(1).'],
      ['prev = [0] + [INF] * n', 'prev[0] = 0', 'Zero groups: only the empty prefix costs 0; every other prefix is impossible.'],
      ['def fill(lo, hi, klo, khi):', 'const fill = (lo, hi, klo, khi) =>', 'Fill cur[lo … hi], knowing that their best cuts lie between klo and khi.'],
      ['for k in range(klo, min(mid - 1, khi) + 1):', 'for (let k = klo; k <= Math.min(mid - 1, khi); k++)', 'Only the middle end is searched in full, within its bounds; its last group runs from k to mid − 1.'],
      ['if v < best:', 'if (v < best)', 'Strictly smaller keeps the leftmost best cut, the one whose position is proven to move right.'],
      ['fill(lo, mid - 1, klo, at)', 'fill(lo, mid - 1, klo, at)', 'Ends left of mid have their best cut at or before at …'],
      ['fill(mid + 1, hi, at, khi)', 'fill(mid + 1, hi, at, khi)', '… and ends right of it at or after at. Each level of the recursion scans about n cuts in all.'],
      ['return prev[n]', 'return prev[n]', 'After g layers: all n numbers in exactly g groups.'],
    ],
    math: [
      ['D(t, j) = min over k of D(t − 1, k) + (P[j] − P[k])²', 'prev[k] + (P[mid] - P[k]) ** 2', 'prev[k] + (P[mid] - P[k]) ** 2', 'one candidate cut k for the end mid'],
      ['opt(j)', 'at', 'at', 'the best cut for end j; it never moves left as j grows'],
    ],
  },

  'knuth': {
    code: pair(`def solve(piles):
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
}
`),
    notes: [
      ['opt = [[i] * n for i in range(n)]', 'const opt = Array.from', 'opt[i][j] is the best split of piles i … j; a single pile has nothing to split, so it starts as i.'],
      ['for length in range(2, n + 1):', 'for (let length = 2; length <= n; length++)', 'Shorter intervals first: D(i, j) reads only pieces shorter than itself.'],
      ['for k in range(opt[i][j - 1], min(opt[i + 1][j], j - 1) + 1):', 'for (let k = opt[i][j - 1]; k <= Math.min(opt[i + 1][j], j - 1); k++)', 'Knuth’s bound: the best split lies between the best splits of the two intervals one shorter. Over one length these ranges overlap only at their ends, so a whole length costs O(n).'],
      ['D[i][j] = best + P[j + 1] - P[i]', 'D[i][j] = best + P[j + 1] - P[i]', 'The last merge joins the two halves and pays the size of the whole interval.'],
      ['opt[i][j] = at', 'opt[i][j] = at', 'Remember the split: the longer intervals use it as a bound.'],
    ],
    math: [
      ['D(i, j) = W(i, j) + min D(i, k) + D(k+1, j)', 'D[i][k] + D[k + 1][j]', 'D[i][k] + D[k + 1][j]', 'one split, before the interval’s own weight is added'],
      ['W(i, j)', 'P[j + 1] - P[i]', 'P[j + 1] - P[i]', 'the size of piles i to j'],
      ['opt(i, j − 1) ≤ opt(i, j) ≤ opt(i + 1, j)', 'opt[i][j - 1]', 'opt[i][j - 1]', 'the lower end of the scan'],
    ],
  },

  'smawk': {
    code: pair(`def solve(x, y, w):
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
}
`),
    notes: [
      ['def f(i, j):', 'const f = (i, j) =>', 'The cost matrix is never stored: any entry is computed when it is needed.'],
      ['while stack and f(rows[len(stack) - 1], stack[-1]) > f(rows[len(stack) - 1], c):', 'while (stack.length && f(rows', 'Reduce: compare the top column with column c in the row at the same depth. If c is cheaper there, the top column can’t be the minimum of that row or any later one, so it is dropped.'],
      ['if len(stack) < len(rows):', 'if (stack.length < rows.length) stack.push(c)', 'At most one column per row survives, so the matrix becomes square or narrower.'],
      ['rec(rows[1::2], cols)', 'rec(rows.filter((_, t) => t % 2 === 1), cols)', 'Solve every second row recursively, on half the rows.'],
      ['stop = best[rows[t + 1]] if t + 1 < len(rows) else cols[-1]', 'const stop =', 'An even row’s minimum lies between its neighbours’ minima, because the minima never move left.'],
      ['if cols[j] == stop:', 'if (cols[j] === stop) break', 'j is never reset: all the even rows together scan the columns once, so this step is linear.'],
      ['return sum(f(i, best[i]) for i in range(len(x)))', 'return x.reduce', 'Add up each house’s cheapest cost.'],
    ],
    math: [
      ['f(i, j) = w_j + (x_i − y_j)²', 'w[j] + (x[i] - y[j]) ** 2', 'w[j] + (x[i] - y[j]) ** 2', 'house i using well j'],
      ['argmin_j f(r, j)', 'best[r] = m', 'best[r] = m', 'the column of row r’s minimum'],
    ],
  },

  'cht': {
    code: pair(`def solve(words, M):
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
}
`),
    notes: [
      ['P[i + 1] = P[i] + x', 'P[i + 1] = P[i] + words[i]', 'Prefix sums of the word lengths: a line holding words j to i − 1 has length P[i] − P[j].'],
      ['def useless(l1, l2, l3):', 'const useless =', 'l2 is never lowest if l3 overtakes l1 no later than l2 does. Comparing the two crossings by cross-multiplying keeps everything in exact integers.'],
      ['while len(hull) >= 2 and useless(hull[-2], hull[-1], (m, b)):', 'while (hull.length >= 2 && useless', 'Slopes arrive in falling order, so a new line can only make lines at the end useless.'],
      ['while lo < hi:', 'while (lo < hi)', 'Along the hull, the values at x fall and then rise: binary search finds the lowest.'],
      ['add(0, 0)', 'add(0, 0)', 'The line for j = 0: slope −2·P[0] = 0, intercept D(0) + P[0]² = 0.'],
      ['D[i] = query(P[i]) + P[i] ** 2 + M', 'D[i] = query(P[i]) + P[i] ** 2 + M', '(P[i] − P[j])² + M expanded: the part that depends on j is the line; P[i]² + M is added afterwards.'],
      ['add(-2 * P[i], D[i] + P[i] ** 2)', 'add(-2 * P[i], D[i] + P[i] ** 2)', 'D(i) is final now, so its line may join the hull for later ends.'],
    ],
    math: [
      ['D(i) = min D(j) + (P_i − P_j)² + M', 'query(P[i]) + P[i] ** 2 + M', 'query(P[i]) + P[i] ** 2 + M', 'the best line at x = P[i], plus the terms without j'],
      ['m = −2P_i', '-2 * P[i]', '-2 * P[i]', 'the slope of the line added for i'],
      ['b = D(i) + P_i²', 'D[i] + P[i] ** 2', 'D[i] + P[i] ** 2', 'its intercept'],
    ],
  },

  'monotone-cht': {
    code: pair(`def solve(x, a, b, c):
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
}
`),
    notes: [
      ['hull = [(0, 0)]', 'const hull = [[0, 0]]', 'The line for j = 0: slope −2a·0 = 0, intercept D(0) = 0.'],
      ['while front + 1 < len(hull) and at(hull[front + 1], t) >= at(hull[front], t):', 'while (front + 1 < hull.length', 'Queries only rise, so once the next line is as good, the front line never wins again: the pointer only moves forward.'],
      ['D[i] = at(hull[front], t) + a * t * t + b * t + c', 'D[i] = at(hull[front], t) + a * t * t + b * t + c', 'The best line at P[i], plus the terms that don’t depend on j.'],
      ['line = (-2 * a * t, D[i] + a * t * t - b * t)', 'const line = [-2 * a * t,', 'Expanding a(P[i] − P[j])² + b(P[i] − P[j]): the part with j is a line in P[i] with slope −2a·P[j].'],
      ['while len(hull) - front >= 2 and useless(hull[-2], hull[-1], line):', 'while (hull.length - front >= 2', 'Pop the lines the new one makes useless, but never past the front.'],
    ],
    math: [
      ['D(i) = max D(j) + aS² + bS + c', 'at(hull[front], t) + a * t * t + b * t + c', 'at(hull[front], t) + a * t * t + b * t + c', 'with S = P[i] − P[j] expanded'],
      ['m = −2a·P_i', '-2 * a * t', '-2 * a * t', 'the new line’s slope; it rises because a < 0'],
    ],
  },

  'li-chao': {
    code: pair(`def solve(h, C):
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
}
`),
    notes: [
      ['LO, HI = 0, 1000000', 'const LO = 0, HI = 1000000', 'The tree covers every possible height, fixed in advance.'],
      ['if at(line, mid) < at(tree[node], mid):', 'if (at(line, mid) < at(tree.get(node), mid))', 'The node keeps whichever line is lower at its middle.'],
      ['if at(line, lo) < at(tree[node], lo):', 'if (at(line, lo) < at(tree.get(node), lo))', 'Two lines cross at most once, so the loser can still win on one side only: the left if it is lower at the left end …'],
      ['elif at(line, hi) < at(tree[node], hi):', 'else if (at(line, hi) < at(tree.get(node), hi))', '… the right if it is lower at the right end, or nowhere.'],
      ['while node in tree:', 'while (tree.has(node))', 'A query walks from the root to x’s leaf and takes the lowest of the lines it meets.'],
      ['D = query(h[i]) + h[i] ** 2 + C', 'D = query(h[i]) + h[i] ** 2 + C', 'The best earlier stone, through its line at x = h[i], plus the terms without j.'],
      ['insert((-2 * h[i], D + h[i] ** 2))', 'insert([-2 * h[i], D + h[i] ** 2])', 'Stone i’s line, whatever its slope: arbitrary order is what the Li Chao tree allows.'],
    ],
    math: [
      ['D(i) = min D(j) + (h_i − h_j)² + C', 'query(h[i]) + h[i] ** 2 + C', 'query(h[i]) + h[i] ** 2 + C', 'the best line at h[i], plus the rest'],
      ['m = −2h_i', '-2 * h[i]', '-2 * h[i]', 'the slope of the line stone i adds'],
    ],
  },

  'cht-numeric': {
    code: pair(`def solve(h, C):
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
}
`),
    notes: [
      ['hull = [(-2 * h[0], h[0] ** 2)]', 'H = h.map(BigInt)', 'Python integers are exact at any size. In JavaScript, every height and C become BigInt before any arithmetic.'],
      ['def useless(l1, l2, l3):', 'const useless =', 'Cross-multiplied, never divided: the products reach about 10²⁷, far past 2⁵³, so only exact integers compare them correctly.'],
      ['while front + 1 < len(hull) and at(hull[front + 1], x) <= at(hull[front], x):', 'while (front + 1 < hull.length', 'Heights rise, so the pointer only moves forward.'],
      ['D[i] = at(hull[front], x) + x * x + C', 'D[i] = at(hull[front], x) + x * x + K', 'Costs reach 10¹⁸ and more: exact only as integers.'],
      ['return str(D[n - 1])', 'return String(D[n - 1])', 'Returned as a decimal string, which carries every digit in both languages.'],
    ],
    math: [
      ['D(i) = min D(j) + (h_i − h_j)² + C', 'at(hull[front], x) + x * x + C', 'at(hull[front], x) + x * x + K', 'the best line plus the rest, exactly'],
      ['(b₃ − b₁)(m₁ − m₂) ≤ (b₂ − b₁)(m₁ − m₃)', '(l3[1] - l1[1]) * (l1[0] - l2[0])', '(l3[1] - l1[1]) * (l1[0] - l2[0])', 'the crossing test, without division'],
    ],
  },

  'lagrangian': {
    code: pair(`def solve(a, k):
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
}
`),
    notes: [
      ['def better(p, q):', 'const better =', 'Pairs are (value, segments). The higher value wins; on a tie, fewer segments, so the count found for a penalty is the smallest possible.'],
      ['before = out if inside is None else better(out, inside)', 'const before = inside === null ? out : better(out, inside)', 'A new segment may start after a gap, or right where another segment ends.'],
      ['start = (before[0] - lam + x, before[1] + 1)', 'const start = [before[0] - lam + x, before[1] + 1]', 'Starting a segment costs lam and adds one to the count.'],
      ['new_inside = start if inside is None else better((inside[0] + x, inside[1]), start)', 'const newInside =', 'Or x extends the segment already open, free of charge.'],
      ['if best(mid)[1] <= k:', 'if (best(mid)[1] <= k) hi = mid', 'A larger penalty never uses more segments: binary-search the smallest penalty whose best uses at most k.'],
      ['return best(lo)[0] + lo * k', 'return best(lo)[0] + lo * k', 'The penalized best touches the concave f(k) as a supporting line; adding lam·k back gives f(k) exactly.'],
    ],
    math: [
      ['g(λ) = max of total − λ·count', 'best(mid)', 'best(mid)', 'the penalized problem, solved in O(n)'],
      ['f(k) = g(λ) + λk', 'best(lo)[0] + lo * k', 'best(lo)[0] + lo * k', 'the answer, from the right penalty'],
    ],
  },

  'slope-trick': {
    code: pair(`import heapq

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
}
`),
    notes: [
      ['heapq.heappush(heap, -x)', 'push(x)', 'The heap holds the breakpoints of the cost function, largest on top (Python’s heap is a min-heap, so it stores the values negated).'],
      ['if -heap[0] > x:', 'if (heap[0] > x)', 'An earlier breakpoint above x means the sequence must come down to x somewhere.'],
      ['cost += -heap[0] - x', 'cost += heap[0] - x', 'Pay the gap between the largest breakpoint and x.'],
      ['heapq.heapreplace(heap, -x)', 'replaceTop(x)', 'Pop the largest breakpoint and push x a second time: the function’s slope changes there now.'],
      ['return cost', 'return cost', 'The minimum of the final cost function: the total paid.'],
    ],
    math: [
      ['f(v): the least cost with the last value v', 'heap', 'heap', 'kept as its breakpoints'],
      ['max breakpoint − x', '-heap[0] - x', 'heap[0] - x', 'the amount paid for x'],
    ],
  },

  'cdq': {
    code: pair(`def solve(x, y):
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
}
`),
    notes: [
      ['rank = {v: r + 1 for r, v in enumerate(sorted(set(y)))}', 'const rank = new Map', 'The y values compressed to ranks 1 … m, the Fenwick tree’s positions.'],
      ['def put(i, v):', 'const put =', 'A Fenwick tree of maxima: put raises position i, get reads the largest among 1 … i.'],
      ['go(lo, mid)', 'go(lo, mid)', 'The left half first, completely: its best values are final before they are sent anywhere.'],
      ['while p < len(left) and x[left[p]] < x[j]:', 'while (p < left.length && x[left[p]] < x[j])', 'Sweep by x: a left point enters the tree only once its x is strictly below the right point’s.'],
      ['best[j] = max(best[j], get(rank[y[j]] - 1) + 1)', 'best[j] = Math.max(best[j], get(rank.get(y[j]) - 1) + 1)', 'The best chain from the left half ending below y[j], extended by j.'],
      ['clear(rank[y[i]])', 'clear(rank.get(y[left[t]]))', 'Undo exactly what was put, so the tree is empty for the next split.'],
      ['go(mid, hi)', 'go(mid, hi)', 'Only now the right half: every left contribution has arrived.'],
    ],
    math: [
      ['best(i) = 1 + max best(j), j < i, x_j < x_i, y_j < y_i', 'get(rank[y[j]] - 1) + 1', 'get(rank.get(y[j]) - 1) + 1', 'the part coming from the left half'],
      ['best(j)', 'best[j]', 'best[j]', 'the longest chain ending at point j'],
    ],
  },

  'online-convolution': {
    code: pair(`def solve(b, n):
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
}
`),
    notes: [
      ['a[0] = 1', 'a[0] = 1', 'The starting term, known before anything else.'],
      ['go(lo, mid)', 'go(lo, mid)', 'Finish the left half first: every a[i] in it is then final.'],
      ['for t in range(mid, min(hi, i + len(b))):', 'for (let t = mid; t < Math.min(hi, i + b.length); t++)', 'Send each finished a[i] across the middle to every later term in this block. With an FFT, this whole double loop is one convolution.'],
      ['go(mid, hi)', 'go(mid, hi)', 'Then the right half, whose terms now hold every contribution from the left.'],
      ['return a[n]', 'return a[n]', 'Each pair i < t was added at exactly one split, so a[n] is complete.'],
    ],
    math: [
      ['a_m = Σ a_i · b_(m−i)', 'a[i] * b[t - i]', 'a[i] * b[t - i]', 'one term, sent across the split'],
      ['mod 998 244 353', 'M = 998244353', 'M = 998244353', 'the modulus'],
    ],
  },
}
