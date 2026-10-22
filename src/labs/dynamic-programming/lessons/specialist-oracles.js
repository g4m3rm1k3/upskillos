// Exhaustive answer keys for the Specialist challenges (specialist-challenges.js), written without DP:
// every tiling, edge set, cycle, subset or colouring is listed. They return undefined when an input is too
// large to enumerate. lessons.test.js checks every challenge case against them.
const M = 1000000007
const range = n => Array.from({ length: n }, (_, i) => i)

// Every tiling of the free cells by the given shapes (lists of [dr, dc] cells), found by covering the
// first free cell in reading order with every placement whose first cell it is.
function tilings(h, w, blocked, shapes) {
  const norm = shapes.map(s => { const [r0, c0] = [...s].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0]; return s.map(([r, c]) => [r - r0, c - c0]) })
  const used = range(h).map(r => range(w).map(c => !!blocked[r][c]))
  const go = () => {
    let at = -1
    for (let i = 0; i < h * w && at < 0; i++) if (!used[Math.floor(i / w)][i % w]) at = i
    if (at < 0) return 1
    const r = Math.floor(at / w), c = at % w
    let count = 0
    for (const s of norm) {
      const cells = s.map(([dr, dc]) => [r + dr, c + dc])
      if (cells.every(([y, x]) => y >= 0 && y < h && x >= 0 && x < w && !used[y][x])) {
        for (const [y, x] of cells) used[y][x] = true
        count += go()
        for (const [y, x] of cells) used[y][x] = false
      }
    }
    return count
  }
  return go()
}
const DOMINOES = [[[0, 0], [0, 1]], [[0, 0], [1, 0]]]
// The four L-trominoes: a 2 × 2 square with one cell missing.
const TROMINOES = range(4).map(miss => [[0, 0], [0, 1], [1, 0], [1, 1]].filter((_, i) => i !== miss))
const open = (h, w) => range(h).map(() => range(w).map(() => 0))

// The free cells of a grid and the edges between neighbouring free cells.
function gridGraph(grid) {
  const h = grid.length, w = grid[0].length, id = new Map(), cells = []
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (!grid[r][c]) { id.set(r * w + c, cells.length); cells.push([r, c]) }
  const edges = []
  for (const [r, c] of cells) {
    if (c + 1 < w && !grid[r][c + 1]) edges.push([id.get(r * w + c), id.get(r * w + c + 1)])
    if (r + 1 < h && !grid[r + 1][c]) edges.push([id.get(r * w + c), id.get((r + 1) * w + c)])
  }
  return { cells, edges }
}

const isIndependent = (set, edges) => edges.every(([u, v]) => !(set.has(u) && set.has(v)))

export const PROFILE_ORACLES = {
  'broken-profile': ([h, w]) => (h * w > 30 ? undefined : tilings(h, w, open(h, w), DOMINOES) % M),
  'domino-tiling': ([h, w]) => (h * w > 24 ? undefined : tilings(h, w, open(h, w), [...DOMINOES, ...TROMINOES]) % M),
  'profile-obstacles': ([grid]) => (grid.length * grid[0].length > 30 ? undefined : tilings(grid.length, grid[0].length, grid, DOMINOES) % M),
  // Every set of edges, decided one edge at a time, keeping those where each free cell has two.
  'plug-dp': ([grid]) => {
    const { cells, edges } = gridGraph(grid)
    if (edges.length > 26) return undefined
    const deg = cells.map(() => 0), lastEdge = cells.map(() => -1)
    edges.forEach(([u, v], i) => { lastEdge[u] = i; lastEdge[v] = i })
    if (cells.some((_, v) => lastEdge[v] < 0)) return 0
    const go = i => {
      if (i === edges.length) return deg.every(d => d === 2) ? 1 : 0
      const [u, v] = edges[i]
      let count = 0
      // Leave the edge out, unless u or v then can no longer reach two.
      if (!((lastEdge[u] === i && deg[u] !== 2) || (lastEdge[v] === i && deg[v] !== 2))) count += go(i + 1)
      if (deg[u] < 2 && deg[v] < 2) {
        deg[u]++; deg[v]++
        if (!((lastEdge[u] === i && deg[u] !== 2) || (lastEdge[v] === i && deg[v] !== 2))) count += go(i + 1)
        deg[u]--; deg[v]--
      }
      return count
    }
    return go(0) % M
  },
  // Every closed walk from the first free cell through all the others, each loop found twice.
  'hamiltonian-grid': ([grid]) => {
    const { cells, edges } = gridGraph(grid)
    if (cells.length > 20) return undefined
    if (cells.length < 3) return 0
    const adj = cells.map(() => [])
    for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }
    const seen = cells.map(() => false)
    seen[0] = true
    const go = (v, depth) => {
      if (depth === cells.length) return adj[v].includes(0) ? 1 : 0
      let count = 0
      for (const u of adj[v]) if (!seen[u]) { seen[u] = true; count += go(u, depth + 1); seen[u] = false }
      return count
    }
    return go(0, 1) / 2
  },
  // Every non-empty set of free cells, kept when a search from one of its cells reaches all of it.
  'connectivity-canonical': ([grid]) => {
    const { cells, edges } = gridGraph(grid)
    if (cells.length > 18) return undefined
    const adj = cells.map(() => [])
    for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }
    let count = 0
    for (let m = 1; m < 2 ** cells.length; m++) {
      const start = Math.log2(m & -m), seen = new Set([start]), stack = [start]
      while (stack.length) for (const u of adj[stack.pop()]) if ((m >> u) & 1 && !seen.has(u)) { seen.add(u); stack.push(u) }
      if (seen.size === range(cells.length).filter(i => (m >> i) & 1).length) count++
    }
    return count % M
  },
  // Every set of vertices, kept when no edge joins two of them.
  'treewidth': ([weights, edges]) => {
    const n = weights.length
    if (n > 18) return undefined
    let best = 0
    for (let m = 0; m < 2 ** n; m++) {
      const set = new Set(range(n).filter(i => (m >> i) & 1))
      if (isIndependent(set, edges)) best = Math.max(best, [...set].reduce((t, v) => t + weights[v], 0))
    }
    return best
  },
  // Every assignment of k colours to the vertices that appear in the bags.
  'pathwidth': ([k, edges, bags]) => {
    const vs = [...new Set(bags.flat())]
    if (k ** vs.length > 2000000) return undefined
    const colour = new Map()
    const go = i => {
      if (i === vs.length) return edges.every(([u, v]) => colour.get(u) !== colour.get(v)) ? 1 : 0
      let count = 0
      for (let c = 0; c < k; c++) { colour.set(vs[i], c); count += go(i + 1) }
      return count
    }
    return go(0) % M
  },
  // Every set of vertices, kept when each vertex is in it or next to a vertex in it.
  'nice-tree-decomp': ([n, edges]) => {
    if (n > 18) return undefined
    let count = 0
    for (let m = 0; m < 2 ** n; m++) {
      const near = range(n).map(v => (m >> v) & 1)
      for (const [u, v] of edges) { if ((m >> u) & 1) near[v] = 1; if ((m >> v) & 1) near[u] = 1 }
      if (near.every(x => x)) count++
    }
    return count % M
  },
}

// Probabilistic group: every outcome, sequence or policy is listed, or a small Markov chain is solved by
// Cramer's rule, never by the DP. Exact fractions as [numerator, denominator] BigInts, and "p/q" strings.
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a }
const F = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d } const g = gcd(n, d) || 1n; return [n / g, d / g] }
const add = (x, y) => F(x[0] * y[1] + y[0] * x[1], x[1] * y[1])
const sub = (x, y) => F(x[0] * y[1] - y[0] * x[1], x[1] * y[1])
const mul = (x, y) => F(x[0] * y[0], x[1] * y[1])
const div = (x, y) => F(x[0] * y[1], x[1] * y[0])
const str = x => `${x[0]}/${x[1]}`

// The determinant of a small square matrix of fractions, by expanding along the first row.
function det(A) {
  if (A.length === 1) return A[0][0]
  let total = F(0)
  A[0].forEach((x, j) => {
    if (x[0] === 0n) return
    const minor = A.slice(1).map(row => row.filter((_, c) => c !== j))
    const term = mul(x, det(minor))
    total = j % 2 ? sub(total, term) : add(total, term)
  })
  return total
}
// Expected steps to absorption from transient state `start`: (I − Q) E = 1, solved by Cramer's rule.
// Q[i][j] is the chance of moving between transient states i and j.
function expectedSteps(Q, start) {
  const k = Q.length
  const A = range(k).map(i => range(k).map(j => sub(F(i === j ? 1 : 0), Q[i][j])))
  const B = A.map((row, i) => row.map((x, j) => (j === start ? F(1) : x)))
  return div(det(B), det(A))
}

// Every sequence of rolls of a die with these faces, from distance d down to 0 or below: [chance, rolls].
function sequences(faces, d, visit, chance = F(1), rolls = 0) {
  if (d <= 0) { visit(chance, rolls); return }
  for (const f of faces) sequences(faces, d - f, visit, mul(chance, F(1, faces.length)), rolls + 1)
}

export const PROB_ORACLES = {
  // Every outcome of n dice, counted when it adds up to t.
  'probability-distribution': ([n, s, t]) => {
    if (s ** n > 1000000) return undefined
    let hits = 0
    for (let m = 0; m < s ** n; m++) { let x = m, total = 0; for (let i = 0; i < n; i++) { total += (x % s) + 1; x = Math.floor(x / s) } if (total === t) hits++ }
    return str(F(hits, BigInt(s) ** BigInt(n)))
  },
  // Every set of trials that succeed, weighted by its chance.
  'poisson-binomial': ([p, k]) => {
    if (p.length > 16) return undefined
    let total = F(0)
    for (let m = 0; m < 2 ** p.length; m++) {
      if (range(p.length).filter(i => (m >> i) & 1).length !== k) continue
      total = add(total, p.reduce((x, q, i) => mul(x, F((m >> i) & 1 ? q : 100 - q, 100)), F(1)))
    }
    return str(total)
  },
  // Every sequence of rolls to the end: the sum of chance × length.
  'expected-time': ([faces, n]) => {
    if (faces.length ** Math.ceil(n / Math.min(...faces)) > 300000) return undefined
    let e = F(0)
    sequences(faces, n, (chance, rolls) => { e = add(e, mul(chance, F(rolls))) })
    return str(e)
  },
  // The chain on distances 1 … n (a roll past 0 is wasted), solved by Cramer's rule.
  'self-loops': ([n, s]) => {
    if (n > 7) return undefined
    const Q = range(n).map(i => range(n).map(() => F(0)))
    for (let d = 1; d <= n; d++) for (let f = 1; f <= s; f++) {
      const to = f > d ? d : d - f
      if (to > 0) Q[d - 1][to - 1] = add(Q[d - 1][to - 1], F(1, s))
    }
    return str(expectedSteps(Q, n - 1))
  },
  // The chain on the squares a token can rest on (jumps followed to the end), by Cramer's rule.
  'cyclic-expectations': ([n, s, jumps]) => {
    const to = new Map(jumps)
    const rest = x => { const seen = new Set(); while (to.has(x) && !seen.has(x)) { seen.add(x); x = to.get(x) } return x }
    const states = range(n).filter(i => !to.has(i))
    if (states.length > 7) return undefined
    const at = new Map(states.map((x, i) => [x, i]))
    const Q = states.map(() => states.map(() => F(0)))
    states.forEach((i, r) => { for (let f = 1; f <= s; f++) { const j = rest(i + f <= n ? i + f : i); if (j < n) Q[r][at.get(j)] = add(Q[r][at.get(j)], F(1, s)) } })
    return str(expectedSteps(Q, at.get(rest(0))))
  },
  // Inclusion–exclusion: E = Σ over non-empty sets S of types, (−1)^(|S| + 1) · W / w(S).
  'coupon-collector': ([w]) => {
    if (w.length > 12) return undefined
    const W = w.reduce((a, b) => a + b, 0)
    let e = F(0)
    for (let m = 1; m < 2 ** w.length; m++) {
      const S = range(w.length).filter(i => (m >> i) & 1), term = F(W, S.reduce((t, i) => t + w[i], 0))
      e = S.length % 2 ? add(e, term) : sub(e, term)
    }
    return str(e)
  },
  // Every sequence of rolls: E[T²] − E[T]².
  'moments': ([faces, n]) => {
    if (faces.length ** Math.ceil(n / Math.min(...faces)) > 300000) return undefined
    let e = F(0), s = F(0)
    sequences(faces, n, (chance, rolls) => { e = add(e, mul(chance, F(rolls))); s = add(s, mul(chance, F(rolls * rolls))) })
    return str(sub(s, mul(e, e)))
  },
  // Every sequence of n flips: heads among those with no two heads together, over their chance.
  'conditional-dp': ([n, p]) => {
    if (n > 16) return undefined
    let mass = F(0), heads = F(0)
    for (let m = 0; m < 2 ** n; m++) {
      if (m & (m >> 1)) continue
      const h = range(n).filter(i => (m >> i) & 1).length
      const chance = F(BigInt(p) ** BigInt(h) * BigInt(100 - p) ** BigInt(n - h), 100n ** BigInt(n))
      mass = add(mass, chance)
      heads = add(heads, mul(chance, F(h)))
    }
    return str(div(heads, mass))
  },
  // Every policy (safe or risky at each stage), each costed: a risky stage takes 100 / p tries on average.
  'stochastic-control': ([a, b, p]) => {
    const n = a.length
    if (n > 14) return undefined
    let best = null
    for (let m = 0; m < 2 ** n; m++) {
      let cost = F(0), i = 0
      while (i < n) {
        if ((m >> i) & 1) { cost = add(cost, F(100 * b[i], p[i])); i += 2 } else { cost = add(cost, F(a[i])); i += 1 }
      }
      if (!best || cost[0] * best[1] < best[0] * cost[1]) best = cost
    }
    return str(best)
  },
}

// Games group: plain game-tree search without a memo, so every position is searched again each time it
// is reached. They return undefined when the tree is too large.
const gcdG = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a }
const FG = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); const g = gcdG(n, d) || 1n; return [n / g, d / g] }
const addG = (x, y) => FG(x[0] * y[1] + y[0] * x[1], x[1] * y[1])

// Whether the player to move wins, by trying every move.
const wins = (pos, moves) => moves(pos).some(next => !wins(next, moves))

export const GAME_ORACLES = {
  // Every free square, searched by trying every move to the end.
  'win-lose': ([grid]) => {
    const h = grid.length, w = grid[0].length
    if (h + w > 12) return undefined
    const moves = ([r, c]) => [[r - 1, c], [r, c - 1], [r - 1, c - 1]].filter(([y, x]) => y >= 0 && x >= 0 && !grid[y][x])
    let count = 0
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (!grid[r][c] && wins([r, c], moves)) count++
    return count
  },
  // Every pile 0 … N, searched move by move.
  'subtraction-games': ([moves, N]) => {
    if (N > 24) return undefined
    const next = x => moves.filter(s => s <= x).map(s => x - s)
    return range(N + 1).filter(x => !wins(x, next)).length
  },
  // Every way to play the row: the lead of the player to move, best for each.
  'score-difference': ([a]) => {
    if (a.length > 11) return undefined
    const lead = i => (i === a.length ? 0 : Math.max(...[1, 2, 3].filter(t => i + t <= a.length).map(t => a.slice(i, i + t).reduce((x, y) => x + y, 0) - lead(i + t))))
    return lead(0)
  },
  'interval-games': ([a]) => {
    if (a.length > 13) return undefined
    const lead = (l, r) => (l === r ? 0 : Math.max(a[l] - lead(l + 1, r), a[r - 1] - lead(l, r - 1)))
    return lead(0, a.length)
  },
  // The Grundy value of a Kayles row of n pins without the mex rule: the smallest k such that the row
  // together with a Nim heap of k is lost for the player to move, searched over every move of the sum.
  'grundy': ([n]) => {
    if (n > 6) return undefined
    const next = ([rows, heap]) => {
      const out = range(heap).map(k => [rows, k])
      rows.forEach((len, i) => {
        const others = rows.filter((_, j) => j !== i)
        for (const take of [1, 2]) for (let left = 0; left + take <= len; left++) out.push([[...others, left, len - take - left].filter(x => x > 0), heap])
      })
      return out
    }
    for (let k = 0; ; k++) if (!wins([[n].filter(x => x > 0), k], next)) return k
  },
  // Every first move, and whether the position it leaves is lost for the opponent, by full search.
  'game-sums': ([moves, piles]) => {
    if (piles.length > 3 || piles.reduce((x, y) => x + y, 0) > 14) return undefined
    const next = ps => ps.flatMap((p, i) => moves.filter(s => s <= p).map(s => ps.map((q, j) => (j === i ? q - s : q))))
    return next(piles).filter(ps => !wins(ps, next)).length
  },
  // Expectiminimax without a memo: max over step and roll, the roll averaged over the faces.
  'stochastic-games': ([n, s]) => {
    if (n > 5 || s > 3) return undefined
    const one = FG(1)
    const V = (a, b) => {
      const after = x => { if (x >= n) return one; const v = V(b, x); return FG(v[1] - v[0], v[1]) }
      const step = after(a + 1)
      let roll = FG(0)
      for (let f = 1; f <= s; f++) roll = addG(roll, after(a + f))
      roll = FG(roll[0], roll[1] * BigInt(s))
      return step[0] * roll[1] >= roll[0] * step[1] ? step : roll
    }
    const v = V(0, 0)
    return `${v[0]}/${v[1]}`
  },
  // Plain minimax over every order of moves.
  'transpositions': ([board, k]) => {
    const h = board.length, w = board[0].length, cells = board.join('').split('')
    if (cells.filter(ch => ch === '.').length > 9) return undefined
    const lines = []
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = range(k).map(i => [r + i * dr, c + i * dc])
      if (line.every(([y, x]) => y >= 0 && y < h && x >= 0 && x < w)) lines.push(line.map(([y, x]) => y * w + x))
    }
    const play = () => {
      for (const line of lines) if (cells[line[0]] !== '.' && line.every(i => cells[i] === cells[line[0]])) return cells[line[0]] === 'X' ? 1 : -1
      const free = range(cells.length).filter(i => cells[i] === '.')
      if (!free.length) return 0
      const mover = cells.filter(ch => ch === 'X').length === cells.filter(ch => ch === 'O').length ? 'X' : 'O'
      const values = free.map(i => { cells[i] = mover; const v = play(); cells[i] = '.'; return v })
      return mover === 'X' ? Math.max(...values) : Math.min(...values)
    }
    return play()
  },
}

// Parsing group: every leftmost derivation, parse tree, state path, assignment or pairing is listed;
// nothing is shared between spans. They return undefined when an input is too large.
const MOD = 1000000007n
const isNT = x => x >= 'A' && x <= 'Z'

// Every leftmost derivation of s from S, for a grammar in Chomsky normal form (no empty or unit rules, so
// each symbol of a sentential form yields at least one letter). Leftmost derivations are parse parseTrees.
function leftmostCount(rules, s) {
  let count = 0n
  const go = form => {
    const at = [...form].findIndex(isNT)
    if (at < 0) { if (form === s) count++; return }
    if (form.slice(0, at) !== s.slice(0, at) || form.length > s.length) return
    for (const [lhs, rhs] of rules) if (lhs === form[at]) go(form.slice(0, at) + rhs + form.slice(at + 1))
  }
  go('S')
  return count
}
// Every parse tree of s[i:j] from X, as [weight in 100ths, the labelled spans it uses].
function parseTrees(rules, s, X, i, j) {
  const out = []
  if (j - i === 1) for (const [lhs, rhs, p] of rules) if (lhs === X && rhs === s[i]) out.push([BigInt(p), [`${X},${i},${j}`]])
  for (const [lhs, rhs, p] of rules) {
    if (lhs !== X || rhs.length !== 2) continue
    for (let k = i + 1; k < j; k++) for (const [w1, s1] of parseTrees(rules, s, rhs[0], i, k)) for (const [w2, s2] of parseTrees(rules, s, rhs[1], k, j)) out.push([BigInt(p) * w1 * w2, [`${X},${i},${j}`, ...s1, ...s2]])
  }
  return out
}
const gcdP = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
const fracP = (p, q) => { const g = gcdP(p, q) || 1n; return `${p / g}/${q / g}` }
// Every sequence of T states out of k.
function* statePaths(k, T, prefix = []) {
  if (prefix.length === T) { yield prefix; return }
  for (let x = 0; x < k; x++) yield* statePaths(k, T, [...prefix, x])
}

export const PARSE_ORACLES = {
  'cyk': ([rules, s]) => (s.length > 7 ? undefined : s.length > 0 && leftmostCount(rules, s) > 0n),
  'weighted-parsing': ([rules, s]) => (s.length > 7 ? undefined : Number(leftmostCount(rules, s) % MOD)),
  // Every leftmost derivation, breadth first, with empty rules: forms whose letters so far don't match s
  // are dropped, as are forms with more letters than s or far longer than s.
  'earley': ([rules, s]) => {
    if (s.length > 6) return undefined
    const seen = new Set(['S']), queue = ['S']
    while (queue.length) {
      const form = queue.shift()
      const at = [...form].findIndex(isNT)
      if (at < 0) { if (form === s) return true; continue }
      for (const [lhs, rhs] of rules) {
        if (lhs !== form[at]) continue
        const next = form.slice(0, at) + rhs + form.slice(at + 1)
        const head = next.slice(0, Math.max(0, [...next].findIndex(isNT) < 0 ? next.length : [...next].findIndex(isNT)))
        if (head !== s.slice(0, head.length) || [...next].filter(x => !isNT(x)).length > s.length || next.length > s.length + 6) continue
        if (!seen.has(next)) { seen.add(next); queue.push(next) }
      }
    }
    return false
  },
  // Every parse tree: the weight of those that use X over [i, j), over the weight of all.
  'inside-outside': ([rules, s, X, i, j]) => {
    if (s.length > 6) return undefined
    let top = 0n, total = 0n
    for (const [w, spans] of parseTrees(rules, s, 'S', 0, s.length)) { total += w; if (spans.includes(`${X},${i},${j}`)) top += w }
    return fracP(top, total)
  },
  'viterbi': ([start, trans, emit, obs]) => {
    if (start.length ** obs.length > 200000) return undefined
    let best = Infinity
    for (const p of statePaths(start.length, obs.length)) {
      let c = start[p[0]] + emit[p[0]][obs[0]]
      for (let t = 1; t < p.length; t++) c += trans[p[t - 1]][p[t]] + emit[p[t]][obs[t]]
      best = Math.min(best, c)
    }
    return best
  },
  'forward-backward': ([start, trans, emit, obs, t, s]) => {
    if (start.length ** obs.length > 200000) return undefined
    let top = 0n, total = 0n
    for (const p of statePaths(start.length, obs.length)) {
      let w = BigInt(start[p[0]] * emit[p[0]][obs[0]])
      for (let u = 1; u < p.length; u++) w *= BigInt(trans[p[u - 1]][p[u]] * emit[p[u]][obs[u]])
      total += w
      if (p[t] === s) top += w
    }
    return fracP(top, total)
  },
  // Every assignment of values to the nodes.
  'belief-propagation': ([k, unary, edges, pair]) => {
    const n = unary.length
    if (k ** n > 200000) return undefined
    let Z = 0n
    for (const x of statePaths(k, n)) {
      let w = 1n
      for (let v = 0; v < n; v++) w *= BigInt(unary[v][x[v]])
      for (const [u, v] of edges) w *= BigInt(pair[x[u]][x[v]])
      Z += w
    }
    return Number(Z % MOD)
  },
  // Every set of non-crossing pairs: the first base unpaired, or paired with each partner in turn.
  'rna-folding': ([s]) => {
    if (s.length > 14) return undefined
    const ok = new Set(['AU', 'UA', 'GC', 'CG', 'GU', 'UG'])
    const best = (i, j) => {
      if (j - i < 5) return 0
      let b = best(i + 1, j)
      for (let k = i + 4; k < j; k++) if (ok.has(s[i] + s[k])) b = Math.max(b, 1 + best(i + 1, k) + best(k + 1, j))
      return b
    }
    return best(0, s.length)
  },
}

// Control group: every path, action sequence, policy, cycle, order schedule or threshold rule is listed,
// or a plain expectimax tree is searched without a memo; LQR is solved as one least-squares problem.
// They return undefined when an input is too large.
const gcdC = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a }
const Qc = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d } const g = gcdC(n, d) || 1n; return [n / g, d / g] }
const qAdd = (x, y) => Qc(x[0] * y[1] + y[0] * x[1], x[1] * y[1])
const qSub = (x, y) => Qc(x[0] * y[1] - y[0] * x[1], x[1] * y[1])
const qMul = (x, y) => Qc(x[0] * y[0], x[1] * y[1])
const qDiv = (x, y) => Qc(x[0] * y[1], x[1] * y[0])
const qMore = (x, y) => x[0] * y[1] > y[0] * x[1]
const qMax = xs => xs.reduce((a, b) => (qMore(b, a) ? b : a))
const qStr = x => `${x[0]}/${x[1]}`
const upTo = n => Array.from({ length: n }, (_, i) => i)
// Gaussian elimination on an augmented matrix of fractions; returns the solution.
function solveLinear(A) {
  const n = A.length
  A = A.map(row => [...row])
  for (let c = 0; c < n; c++) {
    const p = upTo(n).find(r => r >= c && A[r][c][0] !== 0n)
    ;[A[c], A[p]] = [A[p], A[c]]
    for (let r = 0; r < n; r++) if (r !== c && A[r][c][0] !== 0n) { const f = qDiv(A[r][c], A[c][c]); A[r] = A[r].map((x, k) => qSub(x, qMul(f, A[c][k]))) }
  }
  return upTo(n).map(i => qDiv(A[i][n], A[i][i]))
}
// Every sequence of `len` choices out of `k`.
function* choices(k, len, prefix = []) {
  if (prefix.length === len) { yield prefix; return }
  for (let x = 0; x < k; x++) yield* choices(k, len, [...prefix, x])
}

export const CONTROL_ORACLES = {
  // Every simple path from 0 to n − 1: the coupon goes on its most expensive edge.
  'bellman-principle': ([n, edges]) => {
    if (n > 8 || edges.length > 16) return undefined
    let best = Infinity
    const walk = (u, seen, total, top) => {
      if (u === n - 1) { best = Math.min(best, total - top); return }
      for (const [a, b, w] of edges) if (a === u && !seen.has(b)) { seen.add(b); walk(b, seen, total + w, Math.max(top, w)); seen.delete(b) }
    }
    walk(0, new Set([0]), 0, 0)
    return best === Infinity ? -1 : best
  },
  // Expectimax without a memo.
  'finite-mdp': ([trans, reward, H]) => {
    if (H > 5) return undefined
    const V = (s, t) => (t === 0 ? Qc(0) : qMax(trans[s].map((next, a) => qAdd(Qc(reward[s][a]), qDiv(next.reduce((acc, x) => qAdd(acc, V(x, t - 1)), Qc(0)), Qc(next.length))))))
    return qStr(V(0, H))
  },
  // Every sequence of K actions from state 0, discounted.
  'value-iteration': ([nxt, reward, gamma, K]) => {
    const k = Math.max(...nxt.map(a => a.length))
    if (k ** K > 100000) return undefined
    const g = Qc(gamma[0], gamma[1])
    let best = null
    for (const seq of choices(k, K)) {
      let s = 0, total = Qc(0), disc = Qc(1), ok = true
      for (const a of seq) { if (a >= nxt[s].length) { ok = false; break } total = qAdd(total, qMul(disc, Qc(reward[s][a]))); disc = qMul(disc, g); s = nxt[s][a] }
      if (ok && (best === null || qMore(total, best))) best = total
    }
    return qStr(best ?? Qc(0))
  },
  // Every deterministic stationary policy, evaluated exactly; the best value at state 0.
  'policy-iteration': ([trans, reward, gamma]) => {
    const n = trans.length, k = Math.max(...trans.map(a => a.length))
    if (k ** n > 5000) return undefined
    const g = Qc(gamma[0], gamma[1])
    let best = null
    for (const pol of choices(k, n)) {
      if (pol.some((a, s) => a >= trans[s].length)) continue
      const A = upTo(n).map(i => [...upTo(n).map(j => Qc(i === j ? 1 : 0)), Qc(reward[i][pol[i]])])
      upTo(n).forEach(i => { const nx = trans[i][pol[i]]; for (const x of nx) A[i][x] = qSub(A[i][x], qDiv(g, Qc(nx.length))) })
      const v = solveLinear(A)[0]
      if (best === null || qMore(v, best)) best = v
    }
    return qStr(best)
  },
  // Every simple cycle reachable from 0: the largest mean weight.
  'average-reward': ([n, edges]) => {
    if (n > 7 || edges.length > 14) return undefined
    const reach = new Set([0]), stack = [0]
    while (stack.length) { const u = stack.pop(); for (const [a, b] of edges) if (a === u && !reach.has(b)) { reach.add(b); stack.push(b) } }
    let best = null
    const walk = (start, u, seen, total, len) => {
      for (const [a, b, w] of edges) {
        if (a !== u) continue
        if (b === start) { const m = Qc(total + w, len + 1); if (best === null || qMore(m, best)) best = m }
        else if (b > start && !seen.has(b)) { seen.add(b); walk(start, b, seen, total + w, len + 1); seen.delete(b) }
      }
    }
    for (const s of reach) walk(s, s, new Set([s]), 0, 0)
    return qStr(best)
  },
  // Every set of order periods: each demand is met by the latest order at or before it.
  'inventory': ([d, K, h]) => {
    const T = d.length
    if (T > 12) return undefined
    let best = Infinity
    for (let mask = 0; mask < 1 << T; mask++) {
      let cost = 0, last = -1, ok = true
      for (let t = 0; t < T; t++) {
        if ((mask >> t) & 1) { last = t; cost += K }
        if (d[t] > 0) { if (last < 0) { ok = false; break } cost += h * (t - last) * d[t] }
      }
      if (ok) best = Math.min(best, cost)
    }
    return best
  },
  // Every threshold rule (take offer x at step i when x ≥ τᵢ), each evaluated over every offer sequence.
  'optimal-stopping': ([n, m, c]) => {
    if ((m + 1) ** (n - 1) * m ** n > 300000) return undefined
    let best = null
    for (const tau of choices(m + 1, n - 1)) {
      let total = Qc(0)
      for (const offers of choices(m, n)) {
        let i = 0
        while (i < n - 1 && offers[i] + 1 < tau[i] + 1) i++
        total = qAdd(total, Qc(offers[i] + 1 - c * i))
      }
      const v = qDiv(total, Qc(BigInt(m) ** BigInt(n)))
      if (best === null || qMore(v, best)) best = v
    }
    return qStr(best)
  },
  // Expectimax without a memo, stopping allowed at any time.
  'resource-control': ([B, actions]) => {
    if (B > 7) return undefined
    const V = b => qMax([Qc(0), ...actions.filter(([w, l]) => w <= b && l <= b).map(([w, l, p, r]) => qAdd(qMul(Qc(p, 100), qAdd(Qc(r), V(b - w))), qMul(Qc(100 - p, 100), V(b - l))))])
    return qStr(V(B))
  },
  // The values at grid points, recomputed from scratch for every interpolation.
  'continuous-state': ([u, g, G, T, x0]) => {
    if (T > 3 || G > 5) return undefined
    const growth = Qc(g[0], g[1])
    const V = (t, x) => (t === 0 ? Qc(0) : qMax(upTo(x + 1).map(c => qAdd(Qc(u[c]), at(t - 1, qMul(Qc(x - c), growth))))))
    const at = (t, y) => {
      if (!qMore(Qc(G), y)) return V(t, G)
      const lo = y[0] / y[1], w = qSub(y, Qc(lo))
      return w[0] === 0n ? V(t, Number(lo)) : qAdd(qMul(qSub(Qc(1), w), V(t, Number(lo))), qMul(w, V(t, Number(lo) + 1)))
    }
    return qStr(V(T, x0))
  },
  // One least-squares problem in u₀ … u_{N−1}: x_t = aᵗ + Σ a^(t−1−s) b u_s from x₀ = 1; minimise the cost
  // (a quadratic uᵀHu + 2fᵀu + c0) by solving H u = −f; the minimum is c0 + fᵀu.
  'lqr': ([a, b, q, r, qf, N]) => {
    if (N > 6) return undefined
    const pow = (x, e) => Qc(BigInt(x) ** BigInt(e))
    // x_t = α_t + Σ_s β_{t,s} u_s.
    const alpha = t => pow(a, t), beta = (t, s) => (s < t ? qMul(pow(a, t - 1 - s), Qc(b)) : Qc(0))
    const weight = t => Qc(t === N ? qf : q)
    const H = upTo(N).map(i => upTo(N).map(j => {
      let x = Qc(i === j ? r : 0)
      for (let t = 1; t <= N; t++) x = qAdd(x, qMul(weight(t), qMul(beta(t, i), beta(t, j))))
      return x
    }))
    const f = upTo(N).map(i => { let x = Qc(0); for (let t = 1; t <= N; t++) x = qAdd(x, qMul(weight(t), qMul(alpha(t), beta(t, i)))); return x })
    let c0 = Qc(q)
    for (let t = 1; t <= N; t++) c0 = qAdd(c0, qMul(weight(t), qMul(alpha(t), alpha(t))))
    if (N === 0) return qStr(Qc(qf))
    const uStar = solveLinear(H.map((row, i) => [...row, qSub(Qc(0), f[i])]))
    let v = c0
    upTo(N).forEach(i => { v = qAdd(v, qMul(f[i], uStar[i])) })
    return qStr(v)
  },
  // Expectimax over histories without a memo: the posterior is recomputed from the prior and the readings.
  'pomdp': ([H, prior, acc]) => {
    if (H > 5) return undefined
    const A = Qc(acc, 100), one = Qc(1)
    // hyp: [chance the machine is good, chance it is bad], not normalised.
    const V = (t, hyp) => {
      if (t === 0) return Qc(0)
      const total = qAdd(hyp[0], hyp[1]), b = qDiv(hyp[0], total)
      const run = qAdd(qSub(qMul(b, Qc(2)), qMul(qSub(one, b), Qc(3))), V(t - 1, hyp))
      const repair = qAdd(Qc(-1), V(t - 1, [one, Qc(0)]))
      const seeGood = [qMul(hyp[0], A), qMul(hyp[1], qSub(one, A))], seeBad = [qMul(hyp[0], qSub(one, A)), qMul(hyp[1], A)]
      let inspect = Qc(0)
      for (const h2 of [seeGood, seeBad]) { const p = qDiv(qAdd(h2[0], h2[1]), total); if (p[0] !== 0n) inspect = qAdd(inspect, qMul(p, V(t - 1, h2))) }
      return qMax([run, repair, inspect])
    }
    return qStr(V(H, [Qc(prior, 100), Qc(100 - prior, 100)]))
  },
}

// Research-tools group: every subset, path, allocation, assignment or labelling is listed; the persistent
// lesson walks every node's ancestors. They return undefined when an input is too large.
const allSubsets = n => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, i) => (m >> i) & 1))
const gcdR = (a, b) => { while (b) [a, b] = [b, a % b]; return a }

export const RESEARCH_ORACLES = {
  'pseudo-polynomial': ([weights, values, W]) => {
    if (weights.length > 16) return undefined
    let best = 0
    for (const pick of allSubsets(weights.length)) {
      const w = pick.reduce((s, p, i) => s + p * weights[i], 0), v = pick.reduce((s, p, i) => s + p * values[i], 0)
      if (w <= W && v > best) best = v
    }
    return best
  },
  // Every subset of the items that fit, valued by the rounded values; the best, times K.
  'knapsack-fptas': ([weights, values, W, eps]) => {
    if (weights.length > 16) return undefined
    const items = weights.map((w, i) => [w, values[i]]).filter(([w]) => w <= W)
    if (!items.length || Math.max(...items.map(([, v]) => v)) === 0) return '0/1'
    const n = items.length, vmax = Math.max(...items.map(([, v]) => v))
    const rounded = items.map(([, v]) => Math.floor((v * eps[1] * n) / (eps[0] * vmax)))
    let best = 0
    for (const pick of allSubsets(n)) {
      const w = pick.reduce((s, p, i) => s + p * items[i][0], 0), r = pick.reduce((s, p, i) => s + p * rounded[i], 0)
      if (w <= W && r > best) best = r
    }
    const top = BigInt(best * eps[0] * vmax), bottom = BigInt(eps[1] * n), g = gcdR(top, bottom) || 1n
    return `${top / g}/${bottom / g}`
  },
  'parameterized-dp': ([grid]) => {
    const h = grid.length, w = grid[0].length
    if (h * w > 16) return undefined
    let best = 0
    for (const pick of allSubsets(h * w)) {
      let ok = true, total = 0
      for (let i = 0; i < h * w && ok; i++) {
        if (!pick[i]) continue
        const r = Math.floor(i / w), c = i % w
        if ((c + 1 < w && pick[i + 1]) || (r + 1 < h && pick[i + w])) ok = false
        total += grid[r][c]
      }
      if (ok && total > best) best = total
    }
    return best
  },
  // Every path from 0 to n − 1, then the pairs no other path beats in both time and cost.
  'multiobjective': ([n, edges]) => {
    if (n > 9 || edges.length > 16) return undefined
    const pts = []
    const walk = (u, t, c) => { if (u === n - 1) pts.push([t, c]); for (const [a, b, dt, dc] of edges) if (a === u) walk(b, t + dt, c + dc) }
    walk(0, 0, 0)
    const keep = pts.filter(([t, c]) => !pts.some(([t2, c2]) => t2 <= t && c2 <= c && (t2 < t || c2 < c)))
    return [...new Map(keep.map(p => [p.join(), p])).values()].sort((x, y) => x[0] - y[0] || x[1] - y[1])
  },
  'meet-middle': ([values, T]) => {
    if (values.length > 16) return undefined
    return allSubsets(values.length).filter(pick => pick.reduce((s, p, i) => s + p * values[i], 0) <= T).length
  },
  // Every way to split R units among the tasks.
  'min-plus-convolution': ([costs, R]) => {
    if (costs.reduce((p, c) => p * c.length, 1) > 200000) return undefined
    let best = Infinity
    const go = (i, left, total) => {
      if (i === costs.length) { if (left === 0) best = Math.min(best, total); return }
      for (let x = 0; x < costs[i].length && x <= left; x++) go(i + 1, left - x, total + costs[i][x])
    }
    go(0, R, 0)
    return best === Infinity ? -1 : best
  },
  // For each node, walk up to the root and look at every ancestor.
  'persistent-states': ([parent, key, weight, lo, hi]) => {
    if (parent.length > 3000) return undefined
    let total = 0
    for (let v = 0; v < parent.length; v++) {
      let best = 0
      for (let u = v; u >= 0; u = parent[u]) if (key[u] >= lo[v] && key[u] <= hi[v]) best = Math.max(best, weight[u])
      total += best
    }
    return total
  },
  // After each update, every set of houses with no two next to each other.
  'dynamic-dp': ([a, updates]) => {
    if (a.length > 12 || updates.length > 20) return undefined
    const arr = [...a]
    let total = 0
    for (const [i, x] of updates) {
      arr[i] = x
      let best = 0
      for (const pick of allSubsets(arr.length)) {
        if (pick.some((p, k) => p && pick[k + 1])) continue
        best = Math.max(best, pick.reduce((s, p, k) => s + p * arr[k], 0))
      }
      total += best
    }
    return total
  },
  // Every choice of leaf values and operations, evaluated.
  'tree-automata': ([kids, ops]) => {
    const leaves = kids.map((k, v) => (k.length ? -1 : v)).filter(v => v >= 0), inner = kids.map((k, v) => (k.length ? v : -1)).filter(v => v >= 0)
    if (2 ** leaves.length * ops.length ** inner.length > 200000) return undefined
    const f = { and: (x, y) => x & y, or: (x, y) => x | y, xor: (x, y) => x ^ y }
    let count = 0
    const val = new Array(kids.length), op = new Array(kids.length)
    const evalAt = v => (kids[v].length ? f[op[v]](evalAt(kids[v][0]), evalAt(kids[v][1])) : val[v])
    const choose = i => {
      if (i < inner.length) { for (const o of ops) { op[inner[i]] = o; choose(i + 1) } return }
      for (let m = 0; m < 2 ** leaves.length; m++) { leaves.forEach((v, j) => { val[v] = (m >> j) & 1 }); if (evalAt(0) === 1) count++ }
    }
    choose(0)
    return count % 1000000007
  },
  // Every subset for 0/1, and every vector of copies for unbounded.
  'proof-checklist': ([weights, values, W]) => {
    if (weights.length > 10 || W > 30) return undefined
    let one = 0
    for (const pick of allSubsets(weights.length)) {
      const w = pick.reduce((s, p, i) => s + p * weights[i], 0)
      if (w <= W) one = Math.max(one, pick.reduce((s, p, i) => s + p * values[i], 0))
    }
    let many = 0
    const go = (i, left, total) => {
      if (i === weights.length) { many = Math.max(many, total); return }
      for (let k = 0; k * weights[i] <= left; k++) go(i + 1, left - k * weights[i], total + k * values[i])
    }
    go(0, W, 0)
    return [one, many]
  },
}

export const SPECIALIST_ORACLES = { ...PROFILE_ORACLES, ...PROB_ORACLES, ...GAME_ORACLES, ...PARSE_ORACLES, ...CONTROL_ORACLES, ...RESEARCH_ORACLES }
