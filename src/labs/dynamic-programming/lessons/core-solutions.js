// Test-only reference programs for the Core-pattern challenges: the DP each lesson teaches, in Python
// and JavaScript. Never imported by the learner UI or worker. lessons.test.js runs both against every
// case, and core-oracles.js checks the expected values without DP.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const CORE_SOLUTIONS = {
  fibonacci: pair(`def solve(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
`, `function solve(n) { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a }`),
  stairs: pair(`def solve(n, steps):
    ways = [1] + [0] * n
    for h in range(1, n + 1):
        ways[h] = sum(ways[h - s] for s in steps if s <= h)
    return ways[n]
`, `function solve(n, steps) { const w = [1, ...Array(n).fill(0)]; for (let h = 1; h <= n; h++) for (const s of steps) if (s <= h) w[h] += w[h - s]; return w[n] }`),
  'min-cost-stairs': pair(`def solve(costs):
    if not costs:
        return 0
    best = []
    for i, c in enumerate(costs):
        before = [best[i - j] if i - j >= 0 else 0 for j in (1, 2) if i - j >= -1]
        best.append(c + min(before))
    return best[-1]
`, `function solve(costs) { if (!costs.length) return 0; const d = []; costs.forEach((c, i) => { const before = [1, 2].filter(j => i - j >= -1).map(j => (i - j >= 0 ? d[i - j] : 0)); d.push(c + Math.min(...before)) }); return d.at(-1) }`),
  'house-robber': pair(`def solve(values):
    prev, cur = 0, 0
    for v in values:
        prev, cur = cur, max(cur, prev + v)
    return cur
`, `function solve(values) { let prev = 0, cur = 0; for (const v of values) [prev, cur] = [cur, Math.max(cur, prev + v)]; return cur }`),
  'circular-selection': pair(`def solve(values):
    def line(xs):
        prev, cur = 0, 0
        for v in xs:
            prev, cur = cur, max(cur, prev + v)
        return cur
    if len(values) <= 1:
        return values[0] if values else 0
    return max(line(values[1:]), line(values[:-1]))
`, `function solve(values) { const line = xs => { let p = 0, c = 0; for (const v of xs) [p, c] = [c, Math.max(c, p + v)]; return c }; if (values.length <= 1) return values[0] ?? 0; return Math.max(line(values.slice(1)), line(values.slice(0, -1))) }`),
  'activity-selection': pair(`def solve(rewards):
    if not rewards:
        return 0
    best = list(rewards[0])
    for day in rewards[1:]:
        best = [r + max(best[b] for b in range(len(best)) if b != a) for a, r in enumerate(day)]
    return max(best)
`, `function solve(rewards) { if (!rewards.length) return 0; let best = [...rewards[0]]; for (const day of rewards.slice(1)) best = day.map((r, a) => r + Math.max(...best.filter((_, b) => b !== a))); return Math.max(...best) }`),
  'max-subarray': pair(`def solve(values):
    if not values:
        return [0, -1, -1]
    end_sum, start = values[0], 0
    best = [values[0], 0, 0]
    for i in range(1, len(values)):
        if end_sum >= 0:
            end_sum += values[i]
        else:
            end_sum, start = values[i], i
        if end_sum > best[0]:
            best = [end_sum, start, i]
    return best
`, `function solve(values) { if (!values.length) return [0, -1, -1]; let e = values[0], s = 0, best = [values[0], 0, 0]; for (let i = 1; i < values.length; i++) { if (e >= 0) e += values[i]; else { e = values[i]; s = i } if (e > best[0]) best = [e, s, i] } return best }`),
  'max-product': pair(`def solve(values):
    hi = lo = best = values[0]
    for v in values[1:]:
        hi, lo = max(v, hi * v, lo * v), min(v, hi * v, lo * v)
        best = max(best, hi)
    return best
`, `function solve(values) { let hi = values[0], lo = values[0], best = values[0]; for (const v of values.slice(1)) { [hi, lo] = [Math.max(v, hi * v, lo * v), Math.min(v, hi * v, lo * v)]; best = Math.max(best, hi) } return best }`),
  'decode-ways': pair(`def solve(s):
    ways = [1] + [0] * len(s)
    for i in range(1, len(s) + 1):
        if s[i - 1] != '0':
            ways[i] += ways[i - 1]
        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:
            ways[i] += ways[i - 2]
    return ways[len(s)]
`, `function solve(s) { const w = [1, ...Array(s.length).fill(0)]; for (let i = 1; i <= s.length; i++) { if (s[i - 1] !== '0') w[i] += w[i - 1]; if (i >= 2) { const pair = Number(s.slice(i - 2, i)); if (pair >= 10 && pair <= 26) w[i] += w[i - 2] } } return w[s.length] }`),
  'word-break': pair(`def solve(s, words):
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        ok[i] = any(ok[i - len(w)] and s[i - len(w):i] == w for w in words if w and len(w) <= i)
    return ok[len(s)]
`, `function solve(s, words) { const ok = [true, ...Array(s.length).fill(false)]; for (let i = 1; i <= s.length; i++) ok[i] = words.some(w => w && w.length <= i && ok[i - w.length] && s.slice(i - w.length, i) === w); return ok[s.length] }`),
  'word-break-count': pair(`def solve(s, words):
    count = [1] + [0] * len(s)
    for i in range(1, len(s) + 1):
        count[i] = sum(count[i - len(w)] for w in words if w and len(w) <= i and s[i - len(w):i] == w)
    return count[len(s)]
`, `function solve(s, words) { const c = [1, ...Array(s.length).fill(0)]; for (let i = 1; i <= s.length; i++) for (const w of words) if (w && w.length <= i && s.slice(i - w.length, i) === w) c[i] += c[i - w.length]; return c[s.length] }`),
  'grid-paths': pair(`def solve(rows, cols):
    if rows == 0 or cols == 0:
        return 0
    p = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                p[r][c] = 1
            else:
                p[r][c] = (p[r - 1][c] if r else 0) + (p[r][c - 1] if c else 0) + (p[r - 1][c - 1] if r and c else 0)
    return p[-1][-1]
`, `function solve(rows, cols) { if (!rows || !cols) return 0; const p = Array.from({ length: rows }, () => Array(cols).fill(0)); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) p[r][c] = r === 0 && c === 0 ? 1 : (r ? p[r - 1][c] : 0) + (c ? p[r][c - 1] : 0) + (r && c ? p[r - 1][c - 1] : 0); return p[rows - 1][cols - 1] }`),
  'obstacle-paths': pair(`def solve(grid):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    p = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                p[r][c] = 0
            elif r == 0 and c == 0:
                p[r][c] = 1
            else:
                p[r][c] = (p[r - 1][c] if r else 0) + (p[r][c - 1] if c else 0)
    return p[-1][-1]
`, `function solve(grid) { if (!grid.length || !grid[0].length) return 0; const R = grid.length, C = grid[0].length, p = Array.from({ length: R }, () => Array(C).fill(0)); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) p[r][c] = grid[r][c] === 1 ? 0 : r === 0 && c === 0 ? 1 : (r ? p[r - 1][c] : 0) + (c ? p[r][c - 1] : 0); return p[R - 1][C - 1] }`),
  'min-grid-path': pair(`def solve(grid):
    if not grid or not grid[0]:
        return [0, 0]
    rows, cols = len(grid), len(grid[0])
    best = [[None] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                best[r][c] = [grid[0][0], 1]
                continue
            options = [best[r - 1][c]] if r else []
            options += [best[r][c - 1]] if c else []
            low = min(o[0] for o in options)
            best[r][c] = [low + grid[r][c], sum(o[1] for o in options if o[0] == low)]
    return best[-1][-1]
`, `function solve(grid) { if (!grid.length || !grid[0].length) return [0, 0]; const R = grid.length, C = grid[0].length, b = Array.from({ length: R }, () => Array(C)); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (!r && !c) { b[0][0] = [grid[0][0], 1]; continue } const o = [...(r ? [b[r - 1][c]] : []), ...(c ? [b[r][c - 1]] : [])], low = Math.min(...o.map(x => x[0])); b[r][c] = [low + grid[r][c], o.filter(x => x[0] === low).reduce((s, x) => s + x[1], 0)] } return b[R - 1][C - 1] }`),
  'triangle-path': pair(`def solve(triangle):
    if not triangle:
        return 0
    below = list(triangle[-1])
    for row in reversed(triangle[:-1]):
        below = [v + min(below[i], below[i + 1]) for i, v in enumerate(row)]
    return below[0]
`, `function solve(triangle) { if (!triangle.length) return 0; let below = [...triangle.at(-1)]; for (const row of triangle.slice(0, -1).reverse()) below = row.map((v, i) => v + Math.min(below[i], below[i + 1])); return below[0] }`),
  'grid-resources': pair(`def solve(grid, budget):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    ways = [[[0] * (budget + 1) for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            cost = grid[r][c]
            for b in range(budget + 1):
                if b < cost:
                    continue
                if r == 0 and c == 0:
                    ways[r][c][b] = 1 if b == cost else 0
                else:
                    ways[r][c][b] = (ways[r - 1][c][b - cost] if r else 0) + (ways[r][c - 1][b - cost] if c else 0)
    return sum(ways[-1][-1])
`, `function solve(grid, budget) { if (!grid.length || !grid[0].length) return 0; const R = grid.length, C = grid[0].length, w = Array.from({ length: R }, () => Array.from({ length: C }, () => Array(budget + 1).fill(0))); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const cost = grid[r][c]; for (let b = cost; b <= budget; b++) w[r][c][b] = !r && !c ? Number(b === cost) : (r ? w[r - 1][c][b - cost] : 0) + (c ? w[r][c - 1][b - cost] : 0) } return w[R - 1][C - 1].reduce((s, x) => s + x, 0) }`),
  'grid-direction': pair(`def solve(grid, turn):
    if not grid or not grid[0]:
        return 0
    rows, cols, inf = len(grid), len(grid[0]), float('inf')
    best = [[[inf, inf] for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                continue
            for d, (pr, pc) in enumerate(((r - 1, c), (r, c - 1))):
                if pr < 0 or pc < 0:
                    continue
                if pr == 0 and pc == 0:
                    came = 0
                else:
                    came = min(best[pr][pc][d], best[pr][pc][1 - d] + turn)
                best[r][c][d] = came + grid[r][c]
    return 0 if rows == 1 and cols == 1 else min(best[-1][-1])
`, `function solve(grid, turn) { if (!grid.length || !grid[0].length) return 0; const R = grid.length, C = grid[0].length, b = Array.from({ length: R }, () => Array.from({ length: C }, () => [Infinity, Infinity])); for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (!r && !c) continue; [[r - 1, c], [r, c - 1]].forEach(([pr, pc], d) => { if (pr < 0 || pc < 0) return; const came = !pr && !pc ? 0 : Math.min(b[pr][pc][d], b[pr][pc][1 - d] + turn); b[r][c][d] = came + grid[r][c] }) } return R === 1 && C === 1 ? 0 : Math.min(...b[R - 1][C - 1]) }`),
  'max-square': pair(`def solve(grid):
    best = 0
    side = [[0] * len(row) for row in grid]
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if v == 1:
                side[r][c] = 1 if r == 0 or c == 0 else 1 + min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1])
                best = max(best, side[r][c])
    return best
`, `function solve(grid) { let best = 0; const s = grid.map(row => row.map(() => 0)); grid.forEach((row, r) => row.forEach((v, c) => { if (v === 1) { s[r][c] = !r || !c ? 1 : 1 + Math.min(s[r - 1][c], s[r][c - 1], s[r - 1][c - 1]); best = Math.max(best, s[r][c]) } })); return best }`),
  'grid-multiagent': pair(`def solve(grid):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    nxt = [[0] * cols for _ in range(cols)]
    for r in range(rows - 1, -1, -1):
        cur = [[0] * cols for _ in range(cols)]
        for a in range(cols):
            for b in range(cols):
                here = grid[r][a] if a == b else grid[r][a] + grid[r][b]
                if r == rows - 1:
                    cur[a][b] = here
                    continue
                cur[a][b] = here + max(nxt[x][y] for x in (a - 1, a, a + 1) for y in (b - 1, b, b + 1) if 0 <= x < cols and 0 <= y < cols)
        nxt = cur
    return nxt[0][cols - 1]
`, `function solve(grid) { if (!grid.length || !grid[0].length) return 0; const R = grid.length, C = grid[0].length; let nxt = []; for (let r = R - 1; r >= 0; r--) { const cur = Array.from({ length: C }, () => Array(C).fill(0)); for (let a = 0; a < C; a++) for (let b = 0; b < C; b++) { const here = a === b ? grid[r][a] : grid[r][a] + grid[r][b]; if (r === R - 1) { cur[a][b] = here; continue } let m = -Infinity; for (const x of [a - 1, a, a + 1]) for (const y of [b - 1, b, b + 1]) if (x >= 0 && x < C && y >= 0 && y < C) m = Math.max(m, nxt[x][y]); cur[a][b] = here + m } nxt = cur } return nxt[0][C - 1] }`),
  'zero-one-knapsack': pair(`def solve(weights, values, capacity):
    best = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c], v + best[c - w])
    return best[capacity]
`, `function solve(weights, values, capacity) { const b = Array(capacity + 1).fill(0); weights.forEach((w, i) => { for (let c = capacity; c >= w; c--) b[c] = Math.max(b[c], values[i] + b[c - w]) }); return b[capacity] }`),
  'unbounded-knapsack': pair(`def solve(weights, values, capacity):
    best = [0] * (capacity + 1)
    for c in range(1, capacity + 1):
        best[c] = max([best[c - 1]] + [v + best[c - w] for w, v in zip(weights, values) if w <= c])
    return best[capacity]
`, `function solve(weights, values, capacity) { const b = Array(capacity + 1).fill(0); for (let c = 1; c <= capacity; c++) { b[c] = b[c - 1]; weights.forEach((w, i) => { if (w <= c) b[c] = Math.max(b[c], values[i] + b[c - w]) }) } return b[capacity] }`),
  'bounded-knapsack': pair(`def solve(weights, values, counts, capacity):
    best = [0] * (capacity + 1)
    for w, v, k in zip(weights, values, counts):
        old = best[:]
        for c in range(capacity + 1):
            best[c] = max(old[c - q * w] + q * v for q in range(k + 1) if q * w <= c)
    return best[capacity]
`, `function solve(weights, values, counts, capacity) { let b = Array(capacity + 1).fill(0); weights.forEach((w, i) => { const old = [...b]; for (let c = 0; c <= capacity; c++) for (let q = 1; q <= counts[i] && q * w <= c; q++) b[c] = Math.max(b[c], old[c - q * w] + q * values[i]) }); return b[capacity] }`),
  'subset-sum': pair(`def solve(values, target):
    reach = [True] + [False] * target
    for v in values:
        for s in range(target, v - 1, -1):
            reach[s] = reach[s] or reach[s - v]
    return reach[target]
`, `function solve(values, target) { const r = [true, ...Array(target).fill(false)]; for (const v of values) for (let s = target; s >= v; s--) r[s] = r[s] || r[s - v]; return r[target] }`),
  'equal-partition': pair(`def solve(values):
    total = sum(values)
    reach = [True] + [False] * (total // 2)
    for v in values:
        for s in range(total // 2, v - 1, -1):
            reach[s] = reach[s] or reach[s - v]
    best = max(s for s in range(total // 2 + 1) if reach[s])
    return total - 2 * best
`, `function solve(values) { const total = values.reduce((s, v) => s + v, 0), half = Math.floor(total / 2), r = [true, ...Array(half).fill(false)]; for (const v of values) for (let s = half; s >= v; s--) r[s] = r[s] || r[s - v]; let best = half; while (!r[best]) best--; return total - 2 * best }`),
  'target-signs': pair(`def solve(values, target):
    counts = {0: 1}
    for v in values:
        nxt = {}
        for t, k in counts.items():
            nxt[t + v] = nxt.get(t + v, 0) + k
            nxt[t - v] = nxt.get(t - v, 0) + k
        counts = nxt
    return counts.get(target, 0)
`, `function solve(values, target) { let m = new Map([[0, 1]]); for (const v of values) { const n = new Map(); for (const [t, k] of m) { n.set(t + v, (n.get(t + v) ?? 0) + k); n.set(t - v, (n.get(t - v) ?? 0) + k) } m = n } return m.get(target) ?? 0 }`),
  'coin-min': pair(`def solve(coins, amount):
    inf = float('inf')
    best = [0] + [inf] * amount
    for a in range(1, amount + 1):
        best[a] = min([best[a - c] + 1 for c in coins if c <= a] + [inf])
    return -1 if best[amount] == inf else best[amount]
`, `function solve(coins, amount) { const b = [0, ...Array(amount).fill(Infinity)]; for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) b[a] = Math.min(b[a], b[a - c] + 1); return b[amount] === Infinity ? -1 : b[amount] }`),
  'coin-combinations': pair(`def solve(coins, amount):
    ways = [1] + [0] * amount
    for c in coins:
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]
`, `function solve(coins, amount) { const w = [1, ...Array(amount).fill(0)]; for (const c of coins) for (let a = c; a <= amount; a++) w[a] += w[a - c]; return w[amount] }`),
  'coin-permutations': pair(`def solve(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):
        ways[a] = sum(ways[a - c] for c in coins if c <= a)
    return ways[amount]
`, `function solve(coins, amount) { const w = [1, ...Array(amount).fill(0)]; for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) w[a] += w[a - c]; return w[amount] }`),
  'value-knapsack': pair(`def solve(weights, values, capacity):
    total = sum(values)
    inf = float('inf')
    lightest = [0] + [inf] * total
    for w, v in zip(weights, values):
        for t in range(total, v - 1, -1):
            lightest[t] = min(lightest[t], lightest[t - v] + w)
    return max(t for t in range(total + 1) if lightest[t] <= capacity)
`, `function solve(weights, values, capacity) { const total = values.reduce((s, v) => s + v, 0), l = [0, ...Array(total).fill(Infinity)]; weights.forEach((w, i) => { for (let t = total; t >= values[i]; t--) l[t] = Math.min(l[t], l[t - values[i]] + w) }); let t = total; while (l[t] > capacity) t--; return t }`),
  'multidimensional-knapsack': pair(`def solve(items, cap_weight, cap_volume):
    best = [[0] * (cap_volume + 1) for _ in range(cap_weight + 1)]
    for w, vol, value in items:
        for a in range(cap_weight, w - 1, -1):
            for b in range(cap_volume, vol - 1, -1):
                best[a][b] = max(best[a][b], value + best[a - w][b - vol])
    return best[cap_weight][cap_volume]
`, `function solve(items, capWeight, capVolume) { const b = Array.from({ length: capWeight + 1 }, () => Array(capVolume + 1).fill(0)); for (const [w, vol, value] of items) for (let a = capWeight; a >= w; a--) for (let v = capVolume; v >= vol; v--) b[a][v] = Math.max(b[a][v], value + b[a - w][v - vol]); return b[capWeight][capVolume] }`),
  'group-knapsack': pair(`def solve(groups, capacity):
    best = [0] * (capacity + 1)
    for group in groups:
        old = best[:]
        for c in range(capacity + 1):
            for w, v in group:
                if w <= c:
                    best[c] = max(best[c], old[c - w] + v)
    return best[capacity]
`, `function solve(groups, capacity) { let b = Array(capacity + 1).fill(0); for (const g of groups) { const old = [...b]; for (let c = 0; c <= capacity; c++) for (const [w, v] of g) if (w <= c) b[c] = Math.max(b[c], old[c - w] + v) } return b[capacity] }`),
  'exact-capacity': pair(`def solve(weights, values, capacity):
    none = float('-inf')
    best = [0] + [none] * capacity
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c], best[c - w] + v)
    return -1 if best[capacity] == none else best[capacity]
`, `function solve(weights, values, capacity) { const b = [0, ...Array(capacity).fill(-Infinity)]; weights.forEach((w, i) => { for (let c = capacity; c >= w; c--) b[c] = Math.max(b[c], b[c - w] + values[i]) }); return b[capacity] === -Infinity ? -1 : b[capacity] }`),
  'rod-cutting': pair(`def solve(prices, n):
    best = [0] * (n + 1)
    for length in range(1, n + 1):
        best[length] = max(prices[k - 1] + best[length - k] for k in range(1, min(length, len(prices)) + 1))
    return best[n]
`, `function solve(prices, n) { const b = Array(n + 1).fill(0); for (let len = 1; len <= n; len++) { b[len] = -Infinity; for (let k = 1; k <= Math.min(len, prices.length); k++) b[len] = Math.max(b[len], prices[k - 1] + b[len - k]) } return b[n] }`),
  binomial: pair(`def solve(n, k):
    if k < 0 or k > n:
        return 0
    row = [1]
    for _ in range(n):
        row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]
    return row[k]
`, `function solve(n, k) { if (k < 0 || k > n) return 0; let row = [1]; for (let i = 0; i < n; i++) row = [1, ...row.slice(1).map((v, j) => v + row[j]), 1]; return row[k] }`),
  'integer-partitions': pair(`def solve(n):
    ways = [1] + [0] * n
    for part in range(1, n + 1):
        for total in range(part, n + 1):
            ways[total] += ways[total - part]
    return ways[n]
`, `function solve(n) { const w = [1, ...Array(n).fill(0)]; for (let p = 1; p <= n; p++) for (let t = p; t <= n; t++) w[t] += w[t - p]; return w[n] }`),
  catalan: pair(`def solve(n):
    c = [1] + [0] * n
    for m in range(1, n + 1):
        c[m] = sum(c[k] * c[m - 1 - k] for k in range(m))
    return c[n]
`, `function solve(n) { const c = [1, ...Array(n).fill(0)]; for (let m = 1; m <= n; m++) for (let k = 0; k < m; k++) c[m] += c[k] * c[m - 1 - k]; return c[n] }`),
  'balanced-parentheses': pair(`def solve(s):
    ways = [1] + [0] * len(s)
    for ch in s:
        nxt = [0] * (len(s) + 1)
        for depth, k in enumerate(ways):
            if k == 0:
                continue
            if ch in '(?' and depth + 1 <= len(s):
                nxt[depth + 1] += k
            if ch in ')?' and depth > 0:
                nxt[depth - 1] += k
        ways = nxt
    return ways[0]
`, `function solve(s) { let w = [1, ...Array(s.length).fill(0)]; for (const ch of s) { const n = Array(s.length + 1).fill(0); w.forEach((k, d) => { if (!k) return; if (ch !== ')' && d + 1 <= s.length) n[d + 1] += k; if (ch !== '(' && d > 0) n[d - 1] += k }); w = n } return w[0] }`),
  derangements: pair(`def solve(n):
    d = [1, 0]
    for m in range(2, n + 1):
        d.append((m - 1) * (d[m - 1] + d[m - 2]))
    return d[n]
`, `function solve(n) { const d = [1, 0]; for (let m = 2; m <= n; m++) d.push((m - 1) * (d[m - 1] + d[m - 2])); return d[n] }`),
  stirling: pair(`def solve(n, k):
    s = [[0] * (k + 1) for _ in range(n + 1)]
    s[0][0] = 1
    for i in range(1, n + 1):
        for j in range(1, k + 1):
            s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]
    return s[n][k]
`, `function solve(n, k) { const s = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0)); s[0][0] = 1; for (let i = 1; i <= n; i++) for (let j = 1; j <= k; j++) s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]; return s[n][k] }`),
  'inversion-counting': pair(`def solve(n, k):
    top = n * (n - 1) // 2
    if k < 0 or k > top:
        return 0
    ways = [1]
    for m in range(1, n + 1):
        nxt = [0] * (len(ways) + m - 1)
        for inv, w in enumerate(ways):
            for t in range(m):
                nxt[inv + t] += w
        ways = nxt
    return ways[k]
`, `function solve(n, k) { const top = n * (n - 1) / 2; if (k < 0 || k > top) return 0; let w = [1]; for (let m = 1; m <= n; m++) { const nx = Array(w.length + m - 1).fill(0); w.forEach((x, i) => { for (let t = 0; t < m; t++) nx[i + t] += x }); w = nx } return w[k] }`),
}
