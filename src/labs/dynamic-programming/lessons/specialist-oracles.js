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

export const SPECIALIST_ORACLES = { ...PROFILE_ORACLES }
