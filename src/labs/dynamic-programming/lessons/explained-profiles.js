// Reference solutions explained line by line for the profile and decomposition lessons (Specialist,
// profiles group). Format: explained.js. The same code is the lessons' test reference (specialist-solutions.js).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CODE = {
  // Cell by cell down each column; bit r of the mask says whether row r's next cell is already covered.
  'broken-profile': pair(`def solve(h, w):
    M = 1000000007
    ways = [0] * (1 << h)
    ways[0] = 1
    for c in range(w):
        for r in range(h):
            bit = 1 << r
            nxt = [0] * (1 << h)
            for mask in range(1 << h):
                n = ways[mask]
                if n == 0:
                    continue
                if mask & bit:
                    nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M
                    continue
                if c + 1 < w:
                    nxt[mask | bit] = (nxt[mask | bit] + n) % M
                if r + 1 < h and not mask & (bit << 1):
                    nxt[mask | (bit << 1)] = (nxt[mask | (bit << 1)] + n) % M
            ways = nxt
    return ways[0]
`, `function solve(h, w) {
  const M = 1000000007, S = 1 << h
  let ways = new Array(S).fill(0)
  ways[0] = 1
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      const bit = 1 << r, nxt = new Array(S).fill(0)
      for (let mask = 0; mask < S; mask++) {
        const n = ways[mask]
        if (n === 0) continue
        if (mask & bit) { nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M; continue }
        if (c + 1 < w) nxt[mask | bit] = (nxt[mask | bit] + n) % M
        if (r + 1 < h && !(mask & (bit << 1))) nxt[mask | (bit << 1)] = (nxt[mask | (bit << 1)] + n) % M
      }
      ways = nxt
    }
  }
  return ways[0]
}`),

  // One column at a time: T[s][t] counts the ways to fill a column whose cells s are already covered,
  // leaving cells t of the next column covered. Found by filling the first free cell with every piece.
  'domino-tiling': pair(`def solve(h, w):
    M = 1000000007
    S = 1 << h
    pieces = [[(0, 0), (1, 0)], [(0, 0), (0, 1)],
              [(0, 0), (1, 0), (0, 1)], [(0, 0), (1, 0), (1, 1)],
              [(0, 0), (0, 1), (1, 1)], [(0, 0), (-1, 1), (0, 1)]]
    T = [[0] * S for _ in range(S)]
    def fill(start, r, cur, nxt):
        if r == h:
            T[start][nxt] += 1
            return
        if cur >> r & 1:
            fill(start, r + 1, cur, nxt)
            return
        for piece in pieces:
            c2, n2, ok = cur, nxt, True
            for dr, dc in piece:
                if not 0 <= r + dr < h:
                    ok = False
                    break
                bit = 1 << (r + dr)
                if dc == 0:
                    ok = ok and not c2 & bit
                    c2 |= bit
                else:
                    ok = ok and not n2 & bit
                    n2 |= bit
            if ok:
                fill(start, r + 1, c2, n2)
    for s in range(S):
        fill(s, 0, s, 0)
    ways = [0] * S
    ways[0] = 1
    for _ in range(w):
        nxt = [0] * S
        for s in range(S):
            if ways[s]:
                for t in range(S):
                    if T[s][t]:
                        nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M
        ways = nxt
    return ways[0]
`, `function solve(h, w) {
  const M = 1000000007, S = 1 << h
  const pieces = [[[0, 0], [1, 0]], [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [-1, 1], [0, 1]]]
  const T = Array.from({ length: S }, () => new Array(S).fill(0))
  const fill = (start, r, cur, nxt) => {
    if (r === h) { T[start][nxt]++; return }
    if ((cur >> r) & 1) { fill(start, r + 1, cur, nxt); return }
    for (const piece of pieces) {
      let c2 = cur, n2 = nxt, ok = true
      for (const [dr, dc] of piece) {
        if (r + dr < 0 || r + dr >= h) { ok = false; break }
        const bit = 1 << (r + dr)
        if (dc === 0) { ok = ok && !(c2 & bit); c2 |= bit }
        else { ok = ok && !(n2 & bit); n2 |= bit }
      }
      if (ok) fill(start, r + 1, c2, n2)
    }
  }
  for (let s = 0; s < S; s++) fill(s, 0, s, 0)
  let ways = new Array(S).fill(0)
  ways[0] = 1
  for (let c = 0; c < w; c++) {
    const nxt = new Array(S).fill(0)
    for (let s = 0; s < S; s++) {
      if (!ways[s]) continue
      for (let t = 0; t < S; t++) if (T[s][t]) nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M
    }
    ways = nxt
  }
  return ways[0]
}`),

  // The broken profile with blocked cells: a blocked cell must not already be covered, and no domino
  // may be laid onto one.
  'profile-obstacles': pair(`def solve(grid):
    M = 1000000007
    h, w = len(grid), len(grid[0])
    ways = [0] * (1 << h)
    ways[0] = 1
    for c in range(w):
        for r in range(h):
            bit = 1 << r
            nxt = [0] * (1 << h)
            for mask in range(1 << h):
                n = ways[mask]
                if n == 0:
                    continue
                if grid[r][c]:
                    if not mask & bit:
                        nxt[mask] = (nxt[mask] + n) % M
                    continue
                if mask & bit:
                    nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M
                    continue
                if c + 1 < w and not grid[r][c + 1]:
                    nxt[mask | bit] = (nxt[mask | bit] + n) % M
                if r + 1 < h and not grid[r + 1][c] and not mask & (bit << 1):
                    nxt[mask | (bit << 1)] = (nxt[mask | (bit << 1)] + n) % M
            ways = nxt
    return ways[0]
`, `function solve(grid) {
  const M = 1000000007, h = grid.length, w = grid[0].length, S = 1 << h
  let ways = new Array(S).fill(0)
  ways[0] = 1
  for (let c = 0; c < w; c++) {
    for (let r = 0; r < h; r++) {
      const bit = 1 << r, nxt = new Array(S).fill(0)
      for (let mask = 0; mask < S; mask++) {
        const n = ways[mask]
        if (n === 0) continue
        if (grid[r][c]) {
          if (!(mask & bit)) nxt[mask] = (nxt[mask] + n) % M
          continue
        }
        if (mask & bit) { nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M; continue }
        if (c + 1 < w && !grid[r][c + 1]) nxt[mask | bit] = (nxt[mask | bit] + n) % M
        if (r + 1 < h && !grid[r + 1][c] && !(mask & (bit << 1))) nxt[mask | (bit << 1)] = (nxt[mask | (bit << 1)] + n) % M
      }
      ways = nxt
    }
  }
  return ways[0]
}`),

  // Plugs: before cell (r, c), bit c says whether a line comes in from the left and bit c + 1 whether one
  // comes down from above. Afterwards bit c is the line going down and bit c + 1 the line going right.
  'plug-dp': pair(`def solve(grid):
    M = 1000000007
    h, w = len(grid), len(grid[0])
    ways = {0: 1}
    for r in range(h):
        for c in range(w):
            nxt = {}
            for mask, n in ways.items():
                left = mask >> c & 1
                up = mask >> (c + 1) & 1
                rest = mask & ~(3 << c)
                outs = []
                if grid[r][c]:
                    if not left and not up:
                        outs.append(mask)
                else:
                    down_ok = r + 1 < h and not grid[r + 1][c]
                    right_ok = c + 1 < w and not grid[r][c + 1]
                    if left and up:
                        outs.append(rest)
                    elif left or up:
                        if down_ok:
                            outs.append(rest | 1 << c)
                        if right_ok:
                            outs.append(rest | 2 << c)
                    elif down_ok and right_ok:
                        outs.append(rest | 3 << c)
                for m in outs:
                    nxt[m] = (nxt.get(m, 0) + n) % M
            ways = nxt
        ways = {mask << 1: n for mask, n in ways.items()}
    return ways.get(0, 0)
`, `function solve(grid) {
  const M = 1000000007, h = grid.length, w = grid[0].length
  let ways = new Map([[0, 1]])
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const nxt = new Map()
      for (const [mask, n] of ways) {
        const left = (mask >> c) & 1, up = (mask >> (c + 1)) & 1, rest = mask & ~(3 << c)
        const outs = []
        if (grid[r][c]) {
          if (!left && !up) outs.push(mask)
        } else {
          const downOk = r + 1 < h && !grid[r + 1][c], rightOk = c + 1 < w && !grid[r][c + 1]
          if (left && up) outs.push(rest)
          else if (left || up) {
            if (downOk) outs.push(rest | (1 << c))
            if (rightOk) outs.push(rest | (2 << c))
          } else if (downOk && rightOk) outs.push(rest | (3 << c))
        }
        for (const m of outs) nxt.set(m, ((nxt.get(m) ?? 0) + n) % M)
      }
      ways = nxt
    }
    ways = new Map([...ways].map(([mask, n]) => [mask << 1, n]))
  }
  return ways.get(0) ?? 0
}`),

  // Plugs with connectivity labels: two plugs with the same label are the two ends of one path. Joining
  // them closes a loop, allowed only at the last free cell when no other path is open.
  'hamiltonian-grid': pair(`def solve(grid):
    h, w = len(grid), len(grid[0])
    free = [(r, c) for r in range(h) for c in range(w) if not grid[r][c]]
    if not free:
        return 0
    last = free[-1]
    def canon(labels):
        names, out = {}, []
        for x in labels:
            if x and x not in names:
                names[x] = len(names) + 1
            out.append(names[x] if x else 0)
        return tuple(out)
    ways = {(0,) * (w + 1): 1}
    total = 0
    for r in range(h):
        for c in range(w):
            nxt = {}
            down_ok = r + 1 < h and not grid[r + 1][c]
            right_ok = c + 1 < w and not grid[r][c + 1]
            for state, n in ways.items():
                left, up = state[c], state[c + 1]
                outs = []
                if grid[r][c]:
                    if not left and not up:
                        outs.append(list(state))
                elif left and up:
                    if left == up:
                        others = state[:c] + state[c + 2:]
                        if (r, c) == last and not any(others):
                            total += n
                    else:
                        s = [left if x == up else x for x in state]
                        s[c] = s[c + 1] = 0
                        outs.append(s)
                elif left or up:
                    x = left or up
                    if down_ok:
                        s = list(state)
                        s[c], s[c + 1] = x, 0
                        outs.append(s)
                    if right_ok:
                        s = list(state)
                        s[c], s[c + 1] = 0, x
                        outs.append(s)
                elif down_ok and right_ok:
                    s = list(state)
                    s[c] = s[c + 1] = w + 2
                    outs.append(s)
                for s in outs:
                    key = canon(s)
                    nxt[key] = nxt.get(key, 0) + n
            ways = nxt
        ways = {(0,) + state[:w]: n for state, n in ways.items()}
    return total
`, `function solve(grid) {
  const h = grid.length, w = grid[0].length
  let last = -1
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (!grid[r][c]) last = r * w + c
  if (last < 0) return 0
  const canon = labels => {
    const names = new Map()
    return labels.map(x => {
      if (x && !names.has(x)) names.set(x, names.size + 1)
      return x ? names.get(x) : 0
    })
  }
  let ways = new Map([[new Array(w + 1).fill(0).join(','), 1]])
  let total = 0
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const nxt = new Map()
      const downOk = r + 1 < h && !grid[r + 1][c], rightOk = c + 1 < w && !grid[r][c + 1]
      for (const [key, n] of ways) {
        const state = key.split(',').map(Number), left = state[c], up = state[c + 1]
        const outs = []
        if (grid[r][c]) {
          if (!left && !up) outs.push([...state])
        } else if (left && up) {
          if (left === up) {
            const others = [...state.slice(0, c), ...state.slice(c + 2)]
            if (r * w + c === last && !others.some(x => x)) total += n
          } else {
            const s = state.map(x => (x === up ? left : x))
            s[c] = s[c + 1] = 0
            outs.push(s)
          }
        } else if (left || up) {
          const x = left || up
          if (downOk) { const s = [...state]; s[c] = x; s[c + 1] = 0; outs.push(s) }
          if (rightOk) { const s = [...state]; s[c] = 0; s[c + 1] = x; outs.push(s) }
        } else if (downOk && rightOk) {
          const s = [...state]
          s[c] = s[c + 1] = w + 2
          outs.push(s)
        }
        for (const s of outs) {
          const k = canon(s).join(',')
          nxt.set(k, (nxt.get(k) ?? 0) + n)
        }
      }
      ways = nxt
    }
    ways = new Map([...ways].map(([key, n]) => [[0, ...key.split(',').slice(0, w)].join(','), n]))
  }
  return total
}`),

  // Row by row, the frontier is the last w cells: a label per chosen cell naming its component, 0 for a
  // cell left out. Labels are renamed in order of first appearance, so equal partitions share a state.
  'connectivity-canonical': pair(`def solve(grid):
    M = 1000000007
    h, w = len(grid), len(grid[0])
    def canon(labels):
        names, out = {}, []
        for x in labels:
            if x and x not in names:
                names[x] = len(names) + 1
            out.append(names[x] if x else 0)
        return tuple(out)
    ways = {(0,) * w: 1}
    done = 0
    for r in range(h):
        for c in range(w):
            nxt = {}
            def add(s, n):
                key = canon(s)
                nxt[key] = (nxt.get(key, 0) + n) % M
            for state, n in ways.items():
                up = state[c]
                left = state[c - 1] if c > 0 else 0
                s = list(state)
                s[c] = 0
                if up and up not in s:
                    if not any(s):
                        done = (done + n) % M
                else:
                    add(s, n)
                if not grid[r][c]:
                    s = list(state)
                    if left and up and left != up:
                        s = [left if x == up else x for x in s]
                    s[c] = left or up or w + 1
                    add(s, n)
            ways = nxt
    for state, n in ways.items():
        if len(set(state) - {0}) == 1:
            done = (done + n) % M
    return done
`, `function solve(grid) {
  const M = 1000000007, h = grid.length, w = grid[0].length
  const canon = labels => {
    const names = new Map()
    return labels.map(x => {
      if (x && !names.has(x)) names.set(x, names.size + 1)
      return x ? names.get(x) : 0
    })
  }
  let ways = new Map([[new Array(w).fill(0).join(','), 1]])
  let done = 0
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const nxt = new Map()
      const add = (s, n) => { const key = canon(s).join(','); nxt.set(key, ((nxt.get(key) ?? 0) + n) % M) }
      for (const [key, n] of ways) {
        const state = key.split(',').map(Number)
        const up = state[c], left = c > 0 ? state[c - 1] : 0
        let s = [...state]
        s[c] = 0
        if (up && !s.includes(up)) {
          if (!s.some(x => x)) done = (done + n) % M
        } else add(s, n)
        if (!grid[r][c]) {
          s = [...state]
          if (left && up && left !== up) s = s.map(x => (x === up ? left : x))
          s[c] = left || up || w + 1
          add(s, n)
        }
      }
      ways = nxt
    }
  }
  for (const [key, n] of ways) {
    if (new Set(key.split(',').filter(x => x !== '0')).size === 1) done = (done + n) % M
  }
  return done
}`),

  // best[b][S]: the heaviest independent set below bag b (b included) whose part in the bag is S.
  // A child adds its best choice that agrees with S on their shared vertices, minus those vertices'
  // weights, which S has already counted.
  'treewidth': pair(`def solve(weights, edges, bags, tree):
    adj = set()
    for u, v in edges:
        adj.add((u, v))
        adj.add((v, u))
    links = [[] for _ in bags]
    for a, b in tree:
        links[a].append(b)
        links[b].append(a)
    order, children, seen = [0], [[] for _ in bags], {0}
    for x in order:
        for y in links[x]:
            if y not in seen:
                seen.add(y)
                children[x].append(y)
                order.append(y)
    best = [None] * len(bags)
    for b in reversed(order):
        bag = bags[b]
        table = {}
        for S in range(1 << len(bag)):
            chosen = {bag[i] for i in range(len(bag)) if S >> i & 1}
            if any((u, v) in adj for u in chosen for v in chosen):
                continue
            value = sum(weights[v] for v in chosen)
            for ch in children[b]:
                top = None
                for S2, v2 in best[ch].items():
                    picked = {bags[ch][i] for i in range(len(bags[ch])) if S2 >> i & 1}
                    if all((v in picked) == (v in chosen) for v in bags[ch] if v in bag):
                        gain = v2 - sum(weights[v] for v in picked if v in bag)
                        if top is None or gain > top:
                            top = gain
                value += top
            table[S] = value
        best[b] = table
    return max(best[0].values())
`, `function solve(weights, edges, bags, tree) {
  const adj = new Set()
  for (const [u, v] of edges) { adj.add(u + ',' + v); adj.add(v + ',' + u) }
  const links = bags.map(() => [])
  for (const [a, b] of tree) { links[a].push(b); links[b].push(a) }
  const order = [0], children = bags.map(() => []), seen = new Set([0])
  for (let i = 0; i < order.length; i++) {
    for (const y of links[order[i]]) {
      if (!seen.has(y)) { seen.add(y); children[order[i]].push(y); order.push(y) }
    }
  }
  const members = (bag, S) => bag.filter((_, i) => (S >> i) & 1)
  const best = new Array(bags.length)
  for (const b of [...order].reverse()) {
    const bag = bags[b], table = new Map()
    for (let S = 0; S < 1 << bag.length; S++) {
      const chosen = members(bag, S)
      if (chosen.some(u => chosen.some(v => adj.has(u + ',' + v)))) continue
      let value = chosen.reduce((t, v) => t + weights[v], 0)
      for (const ch of children[b]) {
        let top = -Infinity
        for (const [S2, v2] of best[ch]) {
          const picked = members(bags[ch], S2)
          if (bags[ch].every(v => !bag.includes(v) || picked.includes(v) === chosen.includes(v))) {
            const gain = v2 - picked.filter(v => bag.includes(v)).reduce((t, v) => t + weights[v], 0)
            if (gain > top) top = gain
          }
        }
        value += top
      }
      table.set(S, value)
    }
    best[b] = table
  }
  return Math.max(...best[0].values())
}`),

  // ways: the colourings of the current bag's vertices, each with the number of ways to colour every
  // vertex seen so far. Moving to the next bag forgets the vertices that leave (adding their counts
  // together) and tries every colour for the vertices that arrive.
  'pathwidth': pair(`from itertools import product

def solve(k, edges, bags):
    M = 1000000007
    ways = {(): 1}
    prev = []
    for bag in bags:
        kept = [v for v in bag if v in prev]
        merged = {}
        for colours, count in ways.items():
            colour = dict(zip(prev, colours))
            key = tuple(colour[v] for v in kept)
            merged[key] = (merged.get(key, 0) + count) % M
        new = [v for v in bag if v not in prev]
        inside = [(u, v) for u, v in edges if u in bag and v in bag]
        ways = {}
        for key, count in merged.items():
            for extra in product(range(k), repeat=len(new)):
                colour = dict(zip(kept, key))
                colour.update(zip(new, extra))
                if all(colour[u] != colour[v] for u, v in inside):
                    t = tuple(colour[v] for v in bag)
                    ways[t] = (ways.get(t, 0) + count) % M
        prev = bag
    return sum(ways.values()) % M
`, `function solve(k, edges, bags) {
  const M = 1000000007
  let ways = new Map([['', 1]]), prev = []
  for (const bag of bags) {
    const kept = bag.filter(v => prev.includes(v))
    const merged = new Map()
    for (const [colours, count] of ways) {
      const c = colours ? colours.split(',').map(Number) : []
      const key = kept.map(v => c[prev.indexOf(v)]).join(',')
      merged.set(key, ((merged.get(key) ?? 0) + count) % M)
    }
    const fresh = bag.filter(v => !prev.includes(v))
    const inside = edges.filter(([u, v]) => bag.includes(u) && bag.includes(v))
    ways = new Map()
    for (const [key, count] of merged) {
      const extra = new Array(fresh.length).fill(0)
      while (true) {
        const colour = new Map()
        const c = key ? key.split(',').map(Number) : []
        kept.forEach((v, i) => colour.set(v, c[i]))
        fresh.forEach((v, i) => colour.set(v, extra[i]))
        if (inside.every(([u, v]) => colour.get(u) !== colour.get(v))) {
          const t = bag.map(v => colour.get(v)).join(',')
          ways.set(t, ((ways.get(t) ?? 0) + count) % M)
        }
        let i = 0
        while (i < extra.length && extra[i] === k - 1) extra[i++] = 0
        if (i === extra.length) break
        extra[i]++
      }
    }
    prev = bag
  }
  let total = 0
  for (const count of ways.values()) total = (total + count) % M
  return total
}`),

  // Each bag vertex is IN the set, SEEN (out, but next to a chosen vertex) or NEED (out, not yet next to
  // one). An introduce node sees the new vertex's edges into the bag; a join ORs what each side has seen.
  'nice-tree-decomp': pair(`def solve(n, edges, nodes):
    M = 1000000007
    IN, SEEN, NEED = 0, 1, 2
    adj = [set() for _ in range(n)]
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)
    bags, tables = [], []
    for node in nodes:
        table = {}
        def add(t, count):
            table[t] = (table.get(t, 0) + count) % M
        if node[0] == 'leaf':
            bag = []
            add((), 1)
        elif node[0] == 'introduce':
            child, v = node[1], node[2]
            bag = bags[child] + [v]
            near = [i for i, u in enumerate(bags[child]) if u in adj[v]]
            for states, count in tables[child].items():
                s = list(states)
                for i in near:
                    if s[i] == NEED:
                        s[i] = SEEN
                add(tuple(s) + (IN,), count)
                mark = SEEN if any(states[i] == IN for i in near) else NEED
                add(states + (mark,), count)
        elif node[0] == 'forget':
            child, v = node[1], node[2]
            i = bags[child].index(v)
            bag = bags[child][:i] + bags[child][i + 1:]
            for states, count in tables[child].items():
                if states[i] != NEED:
                    add(states[:i] + states[i + 1:], count)
        else:
            a, b = node[1], node[2]
            bag = bags[a]
            at = [bags[b].index(v) for v in bag]
            for sa, ca in tables[a].items():
                for sb, cb in tables[b].items():
                    pairs = [(x, sb[j]) for x, j in zip(sa, at)]
                    if all((x == IN) == (y == IN) for x, y in pairs):
                        t = tuple(IN if x == IN else SEEN if SEEN in (x, y) else NEED for x, y in pairs)
                        add(t, ca * cb)
        bags.append(bag)
        tables.append(table)
    return tables[-1].get((), 0)
`, `function solve(n, edges, nodes) {
  const M = 1000000007, IN = 0, SEEN = 1, NEED = 2
  const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M
  const adj = Array.from({ length: n }, () => new Set())
  for (const [u, v] of edges) { adj[u].add(v); adj[v].add(u) }
  const bags = [], tables = []
  for (const node of nodes) {
    const table = new Map()
    const add = (t, count) => { const key = t.join(''); table.set(key, ((table.get(key) ?? 0) + count) % M) }
    let bag
    if (node[0] === 'leaf') {
      bag = []
      add([], 1)
    } else if (node[0] === 'introduce') {
      const [, child, v] = node
      bag = [...bags[child], v]
      const near = bags[child].map((u, i) => (adj[v].has(u) ? i : -1)).filter(i => i >= 0)
      for (const [key, count] of tables[child]) {
        const states = key.split('').map(Number), s = [...states]
        for (const i of near) if (s[i] === NEED) s[i] = SEEN
        add([...s, IN], count)
        const mark = near.some(i => states[i] === IN) ? SEEN : NEED
        add([...states, mark], count)
      }
    } else if (node[0] === 'forget') {
      const [, child, v] = node, i = bags[child].indexOf(v)
      bag = bags[child].filter(u => u !== v)
      for (const [key, count] of tables[child]) {
        const states = key.split('').map(Number)
        if (states[i] !== NEED) add([...states.slice(0, i), ...states.slice(i + 1)], count)
      }
    } else {
      const [, a, b] = node
      bag = bags[a]
      const at = bag.map(v => bags[b].indexOf(v))
      for (const [ka, ca] of tables[a]) {
        for (const [kb, cb] of tables[b]) {
          const pairs = ka.split('').map((x, i) => [Number(x), Number(kb[at[i]])])
          if (pairs.every(([x, y]) => (x === IN) === (y === IN))) {
            add(pairs.map(([x, y]) => (x === IN ? IN : x === SEEN || y === SEEN ? SEEN : NEED)), mul(ca, cb))
          }
        }
      }
    }
    bags.push(bag)
    tables.push(table)
  }
  return tables[tables.length - 1].get('') ?? 0
}`),
}

export const PROFILE_EXPLAINED = {
  'broken-profile': {
    code: CODE['broken-profile'],
    notes: [
      ['ways[0] = 1', 'ways[0] = 1', 'Before the first cell nothing is covered: one way, the empty mask.'],
      ['bit = 1 << r', 'const bit = 1 << r', 'Bit r is row r. The rows above r already describe the next column; row r and below still describe this one. That break in the profile is the name.'],
      ['if mask & bit:', 'if (mask & bit) {', 'This cell was covered by a domino laid from the left: nothing to place, and its bit is cleared for the next column.'],
      ['if c + 1 < w:', 'if (c + 1 < w)', 'A domino to the right covers this row’s next cell: set the bit.'],
      ['if r + 1 < h and not mask & (bit << 1):', 'if (r + 1 < h && !(mask & (bit << 1)))', 'A domino downwards covers the cell below, which must still be free; its bit is set, so that cell is skipped when it comes.'],
      ['return ways[0]', 'return ways[0]', 'After the last cell nothing may stick out past the board: the empty mask.'],
    ],
    math: [
      ['W(cell, s)', 'ways[mask]', 'ways[mask]', 'the partial tilings reaching this cell with frontier s'],
      ['s ∪ {r}', 'mask | bit', 'mask | bit', 'the frontier after a domino to the right'],
      ['2ʰ frontiers', '1 << h', '1 << h', 'one mask per set of covered rows'],
    ],
  },

  'domino-tiling': {
    code: CODE['domino-tiling'],
    notes: [
      ['pieces = [[(0, 0), (1, 0)], [(0, 0), (0, 1)],', 'const pieces = [[[0, 0], [1, 0]], [[0, 0], [0, 1]],', 'Every way a piece can cover the first free cell (r, c), as (row offset, column offset): two dominoes, then the four L-trominoes. Column offset 1 is the next column.'],
      ['if r == h:', 'if (r === h)', 'The column is full: one more way from start to this next-column mask.'],
      ['if cur >> r & 1:', 'if ((cur >> r) & 1)', 'Already covered, by a piece from the previous column or one just placed: move on.'],
      ['if not 0 <= r + dr < h:', 'if (r + dr < 0 || r + dr >= h)', 'A piece hanging off the top or bottom of the board does not fit.'],
      ['ok = ok and not c2 & bit', 'ok = ok && !(c2 & bit)', 'Its cells in this column must still be free…'],
      ['ok = ok and not n2 & bit', 'ok = ok && !(n2 & bit)', '…and so must its cells in the next column.'],
      ['fill(s, 0, s, 0)', 'fill(s, 0, s, 0)', 'T is found once, for every mask a column can start with; every column then reuses it.'],
      ['nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M', 'nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M', 'One column: every way to reach mask s, times every way to fill the column from s to t.'],
      ['return ways[0]', 'return ways[0]', 'Nothing may stick out past the last column.'],
    ],
    math: [
      ['T(s, t)', 'T[s][t]', 'T[s][t]', 'the ways to fill one column from covered cells s, leaving cells t of the next column covered'],
      ['W(c, t) = Σₛ T(s, t) · W(c − 1, s)', 'T[s][t] * ways[s]', 'T[s][t] * ways[s]', 'one term of a column step'],
    ],
  },

  'profile-obstacles': {
    code: CODE['profile-obstacles'],
    notes: [
      ['h, w = len(grid), len(grid[0])', 'h = grid.length, w = grid[0].length', 'h rows, so the mask has one bit per row, as on an open board.'],
      ['if grid[r][c]:', 'if (grid[r][c]) {', 'A blocked cell is treated as already full…'],
      ['if not mask & bit:', 'if (!(mask & bit)) nxt[mask]', '…but only if no domino from the left landed on it. If none did, the mask passes on unchanged.'],
      ['if mask & bit:', 'if (mask & bit) {', 'A free cell already covered from the left: clear its bit.'],
      ['if c + 1 < w and not grid[r][c + 1]:', 'if (c + 1 < w && !grid[r][c + 1])', 'A domino to the right needs the next cell of the row free.'],
      ['if r + 1 < h and not grid[r + 1][c] and not mask & (bit << 1):', 'if (r + 1 < h && !grid[r + 1][c] && !(mask & (bit << 1)))', 'A domino downwards needs the cell below free and not already covered.'],
      ['return ways[0]', 'return ways[0]', 'Nothing may stick out past the last column.'],
    ],
    math: [
      ['blocked(r, c)', 'grid[r][c]', 'grid[r][c]', '1 for a blocked cell'],
      ['W(cell, s)', 'ways[mask]', 'ways[mask]', 'the partial tilings reaching this cell with frontier s'],
    ],
  },

  'plug-dp': {
    code: CODE['plug-dp'],
    notes: [
      ['ways = {0: 1}', 'let ways = new Map([[0, 1]])', 'Before the first cell no line crosses the frontier.'],
      ['left = mask >> c & 1', 'const left = (mask >> c) & 1', 'Bit c: a line coming in from the left neighbour. Bit c + 1: a line coming down from the cell above.'],
      ['rest = mask & ~(3 << c)', 'rest = mask & ~(3 << c)', 'The mask with this cell’s two plugs cleared. Its outgoing plugs go back into the same two bits: c for down, c + 1 for right.'],
      ['if grid[r][c]:', 'if (grid[r][c]) {', 'A blocked cell: no line may enter it, and none leaves.'],
      ['if left and up:', 'if (left && up) outs.push(rest)', 'Two lines in: the cell has both of its lines, so nothing goes out.'],
      ['elif left or up:', 'else if (left || up) {', 'One line in: it must leave by another side, down or right.'],
      ['elif down_ok and right_ok:', '} else if (downOk && rightOk)', 'No line in: the cell is a corner of a loop, sending lines both down and right.'],
      ['ways = {mask << 1: n for mask, n in ways.items()}', 'ways = new Map([...ways].map(([mask, n]) => [mask << 1, n]))', 'End of a row: shift every plug one place, so that bit c + 1 is again the line from above column c.'],
      ['return ways.get(0, 0)', 'return ways.get(0) ?? 0', 'No line may hang off the bottom: the empty mask.'],
    ],
    math: [
      ['left plug, up plug', 'mask >> c & 1', '(mask >> c) & 1', 'whether a line comes in from the left (bit c) or from above (bit c + 1)'],
      ['degree 2', 'left and up', 'left && up', 'both lines in: the cell is finished'],
    ],
  },

  'hamiltonian-grid': {
    code: CODE['hamiltonian-grid'],
    notes: [
      ['last = free[-1]', 'if (!grid[r][c]) last = r * w + c', 'The last free cell in scanning order: the only place the loop may close.'],
      ['def canon(labels):', 'const canon = labels => {', 'Rename labels in order of first appearance, so states with the same pairing of path ends are merged.'],
      ['left, up = state[c], state[c + 1]', 'left = state[c], up = state[c + 1]', 'Each plug now carries a label; two plugs with the same label are the two ends of one path.'],
      ['if left == up:', 'if (left === up) {', 'Both ends of one path meet here: this would close it into a loop.'],
      ['if (r, c) == last and not any(others):', 'if (r * w + c === last && !others.some(x => x)) total += n', 'Only at the last free cell, with no other path open, is that loop the whole answer. Anywhere else it would shut out the cells still to come.'],
      ['s = [left if x == up else x for x in state]', 'const s = state.map(x => (x === up ? left : x))', 'Two different paths join into one: both ends labelled up are relabelled left.'],
      ['x = left or up', 'const x = left || up', 'One line in: the path goes on, down or right, keeping its label.'],
      ['s[c] = s[c + 1] = w + 2', 's[c] = s[c + 1] = w + 2', 'No line in: a new path starts here with both ends going out, under a fresh label that canon renames.'],
      ['return total', 'return total', 'Every loop through all the free cells was counted once, when it closed.'],
    ],
    math: [
      ['equal labels', 'left == up', 'left === up', 'the two ends of one path'],
      ['canonical state', 'canon(s)', 'canon(s)', 'the labels renamed by first appearance'],
    ],
  },

  'connectivity-canonical': {
    code: CODE['connectivity-canonical'],
    notes: [
      ['ways = {(0,) * w: 1}', "let ways = new Map([[new Array(w).fill(0).join(','), 1]])", 'Before any cell: nothing chosen, every frontier entry 0.'],
      ['up = state[c]', 'const up = state[c], left = c > 0 ? state[c - 1] : 0', 'Entry c is still the cell above; entry c − 1 is already the cell to the left.'],
      ['s[c] = 0', 's[c] = 0', 'Leave the cell out: the cell above drops off the frontier.'],
      ['if up and up not in s:', 'if (up && !s.includes(up)) {', 'That was the last frontier cell of its piece, so the piece can never grow again.'],
      ['if not any(s):', 'if (!s.some(x => x)) done = (done + n) % M', 'If it was the only piece, the set is finished and connected: count it, and stop, since a later cell would start a second piece. If not, the set can never become connected.'],
      ['if left and up and left != up:', 'if (left && up && left !== up)', 'Taking the cell joins the pieces of its left and upper neighbours into one.'],
      ['s[c] = left or up or w + 1', 's[c] = left || up || w + 1', 'It takes their label, or a fresh one if it touches no chosen cell.'],
      ['if len(set(state) - {0}) == 1:', "if (new Set(key.split(',').filter(x => x !== '0')).size === 1)", 'At the end, a state with exactly one piece is a connected set.'],
    ],
    math: [
      ['component label', 'state[c]', 'state[c]', 'the piece the cell above belongs to (0: left out)'],
      ['canonical form', 'canon(s)', 'canon(s)', 'the labels renamed by first appearance'],
    ],
  },

  'treewidth': {
    code: CODE['treewidth'],
    notes: [
      ['order, children, seen = [0], [[] for _ in bags], {0}', 'const order = [0], children = bags.map(() => []), seen = new Set([0])', 'Root the tree of bags at bag 0, listing every bag after its parent.'],
      ['for b in reversed(order):', 'for (const b of [...order].reverse())', 'Children before parents: each child’s table is ready when its parent needs it.'],
      ['if any((u, v) in adj for u in chosen for v in chosen):', "if (chosen.some(u => chosen.some(v => adj.has(u + ',' + v)))) continue", 'S must have no edge inside it.'],
      ['value = sum(weights[v] for v in chosen)', 'let value = chosen.reduce((t, v) => t + weights[v], 0)', 'The weight of S itself, counted here once.'],
      ['if all((v in picked) == (v in chosen) for v in bags[ch] if v in bag):', 'if (bags[ch].every(v => !bag.includes(v) || picked.includes(v) === chosen.includes(v)))', 'A child’s choice must agree with S on every vertex the two bags share.'],
      ['gain = v2 - sum(weights[v] for v in picked if v in bag)', 'const gain = v2 - picked.filter(v => bag.includes(v)).reduce((t, v) => t + weights[v], 0)', 'The shared vertices are already counted in S: subtract them, so each vertex counts once.'],
      ['return max(best[0].values())', 'return Math.max(...best[0].values())', 'Bag 0 sits above everything; its best subset is the answer.'],
    ],
    math: [
      ['best(b, S)', 'best[b]', 'best[b]', 'the heaviest set below bag b meeting it in exactly S'],
      ['w(S)', 'sum(weights[v] for v in chosen)', 'chosen.reduce((t, v) => t + weights[v], 0)', 'the weight of S'],
    ],
  },

  'pathwidth': {
    code: CODE['pathwidth'],
    notes: [
      ['ways = {(): 1}', "let ways = new Map([['', 1]]), prev = []", 'Before the first bag: one way to colour nothing.'],
      ['kept = [v for v in bag if v in prev]', 'const kept = bag.filter(v => prev.includes(v))', 'Vertices in both bags carry their colour forward.'],
      ['merged[key] = (merged.get(key, 0) + count) % M', 'merged.set(key, ((merged.get(key) ?? 0) + count) % M)', 'Forget the vertices that leave: colourings that agree on the kept vertices now look the same, so their counts add.'],
      ['inside = [(u, v) for u, v in edges if u in bag and v in bag]', 'const inside = edges.filter(([u, v]) => bag.includes(u) && bag.includes(v))', 'The edges this bag can check. Every edge lies inside some bag, so each is checked somewhere.'],
      ['for extra in product(range(k), repeat=len(new)):', 'while (true) {', 'Every colour for each vertex arriving in this bag.'],
      ['if all(colour[u] != colour[v] for u, v in inside):', 'if (inside.every(([u, v]) => colour.get(u) !== colour.get(v))) {', 'Kept only if no edge in the bag joins two equal colours.'],
      ['return sum(ways.values()) % M', 'for (const count of ways.values()) total = (total + count) % M', 'After the last bag, every colouring of every vertex has been counted once.'],
    ],
    math: [
      ['N(i, χ)', 'ways[t]', 'ways.set(t', 'the colourings of everything so far whose bag colouring is χ'],
      ['k colours', 'range(k)', 'k - 1', 'the colours 0 to k − 1'],
    ],
  },

  'nice-tree-decomp': {
    code: CODE['nice-tree-decomp'],
    notes: [
      ['IN, SEEN, NEED = 0, 1, 2', 'IN = 0, SEEN = 1, NEED = 2', 'Three states for a bag vertex: in D; out but already next to a vertex of D; out and still needing one.'],
      ["if node[0] == 'leaf':", "if (node[0] === 'leaf') {", 'A leaf has an empty bag and one (empty) state.'],
      ['if s[i] == NEED:', 'for (const i of near) if (s[i] === NEED) s[i] = SEEN', 'v joins D: its neighbours in the bag are now covered.'],
      ['mark = SEEN if any(states[i] == IN for i in near) else NEED', 'const mark = near.some(i => states[i] === IN) ? SEEN : NEED', 'v stays out: it is covered if a neighbour in the bag is in D. Its other neighbours arrive later, while v is still in the bag.'],
      ['if states[i] != NEED:', 'if (states[i] !== NEED)', 'Forgetting v: no later vertex is next to it, so a state where v is still uncovered is dropped.'],
      ['if all((x == IN) == (y == IN) for x, y in pairs):', 'if (pairs.every(([x, y]) => (x === IN) === (y === IN))) {', 'A join: both sides must agree on which bag vertices are in D.'],
      ['t = tuple(IN if x == IN else SEEN if SEEN in (x, y) else NEED for x, y in pairs)', 'add(pairs.map(([x, y]) => (x === IN ? IN : x === SEEN || y === SEEN ? SEEN : NEED)), mul(ca, cb))', 'A vertex is covered if either side covered it, and the counts multiply: the two sides were chosen independently.'],
      ['return tables[-1].get((), 0)', "return tables[tables.length - 1].get('') ?? 0", 'The root’s bag is empty, so its one state counts every dominating set.'],
    ],
    math: [
      ['N(x, σ)', 'tables[child]', 'tables[child]', 'the partial sets below node x whose bag vertices have states σ'],
      ['N_a(σ) · N_b(σ′)', 'ca * cb', 'mul(ca, cb)', 'one term of a join'],
    ],
  },
}
