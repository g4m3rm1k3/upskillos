// Reference solutions explained line by line for the parsing and inference lessons (Specialist, parsing
// group). Format: explained.js. The same code is the lessons' test reference (specialist-solutions.js).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CODE = {
  // D[i][j]: the nonterminals that derive s[i:j], for a grammar in Chomsky normal form.
  'cyk': pair(`def solve(rules, s):
    n = len(s)
    if n == 0:
        return False
    D = [[set() for _ in range(n + 1)] for _ in range(n + 1)]
    for i, ch in enumerate(s):
        for lhs, rhs in rules:
            if rhs == ch:
                D[i][i + 1].add(lhs)
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length
            for k in range(i + 1, j):
                for lhs, rhs in rules:
                    if len(rhs) == 2 and rhs[0] in D[i][k] and rhs[1] in D[k][j]:
                        D[i][j].add(lhs)
    return "S" in D[0][n]
`, `function solve(rules, s) {
  const n = s.length
  if (n === 0) return false
  const D = Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, () => new Set()))
  for (let i = 0; i < n; i++) {
    for (const [lhs, rhs] of rules) if (rhs === s[i]) D[i][i + 1].add(lhs)
  }
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length
      for (let k = i + 1; k < j; k++) {
        for (const [lhs, rhs] of rules) {
          if (rhs.length === 2 && D[i][k].has(rhs[0]) && D[k][j].has(rhs[1])) D[i][j].add(lhs)
        }
      }
    }
  }
  return D[0][n].has('S')
}`),

  // The same table, counting parse trees instead of asking yes or no.
  'weighted-parsing': pair(`def solve(rules, s):
    M = 1000000007
    n = len(s)
    D = [[{} for _ in range(n + 1)] for _ in range(n + 1)]
    for i, ch in enumerate(s):
        for lhs, rhs in rules:
            if rhs == ch:
                D[i][i + 1][lhs] = D[i][i + 1].get(lhs, 0) + 1
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length
            for k in range(i + 1, j):
                for lhs, rhs in rules:
                    if len(rhs) == 2:
                        ways = D[i][k].get(rhs[0], 0) * D[k][j].get(rhs[1], 0)
                        if ways:
                            D[i][j][lhs] = (D[i][j].get(lhs, 0) + ways) % M
    return D[0][n].get("S", 0) if n else 0
`, `function solve(rules, s) {
  const M = 1000000007n, n = s.length
  const D = Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, () => new Map()))
  for (let i = 0; i < n; i++) {
    for (const [lhs, rhs] of rules) if (rhs === s[i]) D[i][i + 1].set(lhs, (D[i][i + 1].get(lhs) ?? 0n) + 1n)
  }
  for (let length = 2; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length
      for (let k = i + 1; k < j; k++) {
        for (const [lhs, rhs] of rules) {
          if (rhs.length !== 2) continue
          const ways = (D[i][k].get(rhs[0]) ?? 0n) * (D[k][j].get(rhs[1]) ?? 0n)
          if (ways) D[i][j].set(lhs, ((D[i][j].get(lhs) ?? 0n) + ways) % M)
        }
      }
    }
  }
  return n ? Number(D[0][n].get('S') ?? 0n) : 0
}`),

  // Earley items (rule, dot, start) in a chart per position: predict, scan, complete. A nullable
  // nonterminal is also stepped over when it is predicted, so empty rules are never missed.
  'earley': pair(`def solve(rules, s):
    n = len(s)
    nullable, changed = set(), True
    while changed:
        changed = False
        for lhs, rhs in rules:
            if lhs not in nullable and all(x in nullable for x in rhs):
                nullable.add(lhs)
                changed = True
    chart = [set() for _ in range(n + 1)]
    chart[0] = {(r, 0, 0) for r in range(len(rules)) if rules[r][0] == "S"}
    for i in range(n + 1):
        todo = list(chart[i])
        while todo:
            r, dot, start = todo.pop()
            lhs, rhs = rules[r]
            new = []
            if dot < len(rhs):
                x = rhs[dot]
                if x.isupper():
                    new += [(q, 0, i) for q in range(len(rules)) if rules[q][0] == x]
                    if x in nullable:
                        new.append((r, dot + 1, start))
                elif i < n and s[i] == x:
                    chart[i + 1].add((r, dot + 1, start))
            else:
                new += [(q, d + 1, st) for q, d, st in chart[start] if d < len(rules[q][1]) and rules[q][1][d] == lhs]
            for item in new:
                if item not in chart[i]:
                    chart[i].add(item)
                    todo.append(item)
    return any(rules[r][0] == "S" and dot == len(rules[r][1]) and start == 0 for r, dot, start in chart[n])
`, `function solve(rules, s) {
  const n = s.length, nullable = new Set()
  for (let changed = true; changed;) {
    changed = false
    for (const [lhs, rhs] of rules) {
      if (!nullable.has(lhs) && [...rhs].every(x => nullable.has(x))) { nullable.add(lhs); changed = true }
    }
  }
  const key = (r, dot, start) => \`\${r},\${dot},\${start}\`
  const chart = Array.from({ length: n + 1 }, () => new Map())
  rules.forEach(([lhs], r) => { if (lhs === 'S') chart[0].set(key(r, 0, 0), [r, 0, 0]) })
  for (let i = 0; i <= n; i++) {
    const todo = [...chart[i].values()]
    while (todo.length) {
      const [r, dot, start] = todo.pop()
      const [lhs, rhs] = rules[r], next = []
      if (dot < rhs.length) {
        const x = rhs[dot]
        if (x >= 'A' && x <= 'Z') {
          rules.forEach(([l], q) => { if (l === x) next.push([q, 0, i]) })
          if (nullable.has(x)) next.push([r, dot + 1, start])
        } else if (i < n && s[i] === x) chart[i + 1].set(key(r, dot + 1, start), [r, dot + 1, start])
      } else {
        for (const [q, d, st] of [...chart[start].values()]) if (d < rules[q][1].length && rules[q][1][d] === lhs) next.push([q, d + 1, st])
      }
      for (const item of next) {
        if (!chart[i].has(key(...item))) { chart[i].set(key(...item), item); todo.push(item) }
      }
    }
  }
  return [...chart[n].values()].some(([r, dot, start]) => rules[r][0] === 'S' && dot === rules[r][1].length && start === 0)
}`),

  // Inside and outside weights for a grammar in Chomsky normal form with rule chances in percent. A tree
  // for a span of length L uses 2L − 1 rules, so every weight is a whole number of 100ths to a fixed power.
  'inside-outside': pair(`from math import gcd

def solve(rules, s, X, i, j):
    n = len(s)
    inside = [[{} for _ in range(n + 1)] for _ in range(n + 1)]
    for a, ch in enumerate(s):
        for lhs, rhs, p in rules:
            if rhs == ch:
                inside[a][a + 1][lhs] = inside[a][a + 1].get(lhs, 0) + p
    for length in range(2, n + 1):
        for a in range(n - length + 1):
            b = a + length
            for k in range(a + 1, b):
                for lhs, rhs, p in rules:
                    if len(rhs) == 2:
                        w = p * inside[a][k].get(rhs[0], 0) * inside[k][b].get(rhs[1], 0)
                        if w:
                            inside[a][b][lhs] = inside[a][b].get(lhs, 0) + w
    outside = [[{} for _ in range(n + 1)] for _ in range(n + 1)]
    outside[0][n]["S"] = 1
    for length in range(n, 1, -1):
        for a in range(n - length + 1):
            b = a + length
            for lhs, out in outside[a][b].items():
                for k in range(a + 1, b):
                    for l2, rhs, p in rules:
                        if l2 == lhs and len(rhs) == 2:
                            B, C = rhs
                            outside[a][k][B] = outside[a][k].get(B, 0) + out * p * inside[k][b].get(C, 0)
                            outside[k][b][C] = outside[k][b].get(C, 0) + out * p * inside[a][k].get(B, 0)
    total = inside[0][n].get("S", 0)
    top = inside[i][j].get(X, 0) * outside[i][j].get(X, 0)
    g = gcd(top, total)
    return f"{top // g}/{total // g}"
`, `function solve(rules, s, X, i, j) {
  const n = s.length
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  const grid = () => Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, () => new Map()))
  const get = (m, x) => m.get(x) ?? 0n
  const inside = grid(), outside = grid()
  for (let a = 0; a < n; a++) {
    for (const [lhs, rhs, p] of rules) if (rhs === s[a]) inside[a][a + 1].set(lhs, get(inside[a][a + 1], lhs) + BigInt(p))
  }
  for (let length = 2; length <= n; length++) {
    for (let a = 0; a + length <= n; a++) {
      const b = a + length
      for (let k = a + 1; k < b; k++) {
        for (const [lhs, rhs, p] of rules) {
          if (rhs.length !== 2) continue
          const w = BigInt(p) * get(inside[a][k], rhs[0]) * get(inside[k][b], rhs[1])
          if (w) inside[a][b].set(lhs, get(inside[a][b], lhs) + w)
        }
      }
    }
  }
  outside[0][n].set('S', 1n)
  for (let length = n; length >= 2; length--) {
    for (let a = 0; a + length <= n; a++) {
      const b = a + length
      for (const [lhs, out] of outside[a][b]) {
        for (let k = a + 1; k < b; k++) {
          for (const [l2, rhs, p] of rules) {
            if (l2 !== lhs || rhs.length !== 2) continue
            const [B, C] = rhs
            outside[a][k].set(B, get(outside[a][k], B) + out * BigInt(p) * get(inside[k][b], C))
            outside[k][b].set(C, get(outside[k][b], C) + out * BigInt(p) * get(inside[a][k], B))
          }
        }
      }
    }
  }
  const total = get(inside[0][n], 'S'), top = get(inside[i][j], X) * get(outside[i][j], X)
  const g = gcd(top, total)
  return \`\${top / g}/\${total / g}\`
}`),

  // Costs are −log probabilities as whole numbers, so the most probable path is the cheapest one.
  'viterbi': pair(`def solve(start, trans, emit, obs):
    k = len(start)
    V = [start[s] + emit[s][obs[0]] for s in range(k)]
    for o in obs[1:]:
        V = [min(V[r] + trans[r][s] for r in range(k)) + emit[s][o] for s in range(k)]
    return min(V)
`, `function solve(start, trans, emit, obs) {
  const k = start.length
  let V = start.map((c, s) => c + emit[s][obs[0]])
  for (const o of obs.slice(1)) {
    V = V.map((_, s) => Math.min(...V.map((v, r) => v + trans[r][s])) + emit[s][o])
  }
  return Math.min(...V)
}`),

  // Paths weighted by products of whole-number weights. alpha: the weight of the paths up to t ending in
  // a state; beta: the weight of what follows a state at t. Their product over the total is the share.
  'forward-backward': pair(`from math import gcd

def solve(start, trans, emit, obs, t, s):
    k, T = len(start), len(obs)
    alpha = [[0] * k for _ in range(T)]
    beta = [[0] * k for _ in range(T)]
    for x in range(k):
        alpha[0][x] = start[x] * emit[x][obs[0]]
        beta[T - 1][x] = 1
    for u in range(1, T):
        for x in range(k):
            alpha[u][x] = sum(alpha[u - 1][y] * trans[y][x] for y in range(k)) * emit[x][obs[u]]
    for u in range(T - 2, -1, -1):
        for x in range(k):
            beta[u][x] = sum(trans[x][y] * emit[y][obs[u + 1]] * beta[u + 1][y] for y in range(k))
    total = sum(alpha[T - 1])
    top = alpha[t][s] * beta[t][s]
    g = gcd(top, total)
    return f"{top // g}/{total // g}"
`, `function solve(start, trans, emit, obs, t, s) {
  const k = start.length, T = obs.length, B = BigInt
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  const alpha = Array.from({ length: T }, () => new Array(k).fill(0n))
  const beta = Array.from({ length: T }, () => new Array(k).fill(0n))
  for (let x = 0; x < k; x++) {
    alpha[0][x] = B(start[x] * emit[x][obs[0]])
    beta[T - 1][x] = 1n
  }
  for (let u = 1; u < T; u++) {
    for (let x = 0; x < k; x++) {
      let sum = 0n
      for (let y = 0; y < k; y++) sum += alpha[u - 1][y] * B(trans[y][x])
      alpha[u][x] = sum * B(emit[x][obs[u]])
    }
  }
  for (let u = T - 2; u >= 0; u--) {
    for (let x = 0; x < k; x++) {
      let sum = 0n
      for (let y = 0; y < k; y++) sum += B(trans[x][y] * emit[y][obs[u + 1]]) * beta[u + 1][y]
      beta[u][x] = sum
    }
  }
  const total = alpha[T - 1].reduce((a, b) => a + b, 0n), top = alpha[t][s] * beta[t][s]
  const g = gcd(top, total)
  return \`\${top / g}/\${total / g}\`
}`),

  // Root the tree at 0; each node, leaves first, sends its parent a message: for each value of the parent,
  // the weight of the node's whole subtree. Z is the root's weights times its messages, summed.
  'belief-propagation': pair(`def solve(k, unary, edges, pair):
    M = 1000000007
    n = len(unary)
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    order, parent = [0], [-1] * n
    seen = [False] * n
    seen[0] = True
    for u in order:
        for v in adj[u]:
            if not seen[v]:
                seen[v] = True
                parent[v] = u
                order.append(v)
    belief = [row[:] for row in unary]
    for v in reversed(order[1:]):
        u = parent[v]
        msg = [sum(pair[x][y] * belief[v][y] for y in range(k)) % M for x in range(k)]
        for x in range(k):
            belief[u][x] = belief[u][x] * msg[x] % M
    return sum(belief[0]) % M
`, `function solve(k, unary, edges, pair) {
  const M = 1000000007n, n = unary.length
  const adj = Array.from({ length: n }, () => [])
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }
  const order = [0], parent = new Array(n).fill(-1), seen = new Array(n).fill(false)
  seen[0] = true
  for (let i = 0; i < order.length; i++) {
    const u = order[i]
    for (const v of adj[u]) {
      if (!seen[v]) { seen[v] = true; parent[v] = u; order.push(v) }
    }
  }
  const belief = unary.map(row => row.map(BigInt))
  for (const v of order.slice(1).reverse()) {
    const u = parent[v]
    const msg = Array.from({ length: k }, (_, x) => belief[v].reduce((acc, b, y) => acc + BigInt(pair[x][y]) * b, 0n) % M)
    for (let x = 0; x < k; x++) belief[u][x] = belief[u][x] * msg[x] % M
  }
  return Number(belief[0].reduce((a, b) => a + b, 0n) % M)
}`),

  // D[i][j]: the most non-crossing pairs in s[i:j]. Position j − 1 is unpaired, or paired with some k at
  // least four places earlier (three bases at least between them).
  'rna-folding': pair(`def solve(s):
    n = len(s)
    ok = {"AU", "UA", "GC", "CG", "GU", "UG"}
    D = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(5, n + 1):
        for i in range(n - length + 1):
            j = i + length
            best = D[i][j - 1]
            for k in range(i, j - 4):
                if s[k] + s[j - 1] in ok:
                    best = max(best, D[i][k] + 1 + D[k + 1][j - 1])
            D[i][j] = best
    return D[0][n]
`, `function solve(s) {
  const n = s.length, ok = new Set(['AU', 'UA', 'GC', 'CG', 'GU', 'UG'])
  const D = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0))
  for (let length = 5; length <= n; length++) {
    for (let i = 0; i + length <= n; i++) {
      const j = i + length
      let best = D[i][j - 1]
      for (let k = i; k < j - 4; k++) {
        if (ok.has(s[k] + s[j - 1])) best = Math.max(best, D[i][k] + 1 + D[k + 1][j - 1])
      }
      D[i][j] = best
    }
  }
  return D[0][n]
}`),
}

export const PARSE_EXPLAINED = {
  'cyk': {
    code: CODE['cyk'],
    notes: [
      ['if n == 0:', 'if (n === 0) return false', 'A grammar in Chomsky normal form has no empty rule, so the empty string is never derived.'],
      ['D = [[set() for _ in range(n + 1)] for _ in range(n + 1)]', 'const D = Array.from({ length: n + 1 }', 'D[i][j]: the set of nonterminals that derive the piece s[i:j].'],
      ['if rhs == ch:', 'if (rhs === s[i]) D[i][i + 1].add(lhs)', 'One letter: every rule X → that letter.'],
      ['for length in range(2, n + 1):', 'for (let length = 2; length <= n; length++) {', 'Longer pieces are built from two shorter ones, so shorter pieces come first.'],
      ['for k in range(i + 1, j):', 'for (let k = i + 1; k < j; k++) {', 'Every place to split the piece in two, each part at least one letter.'],
      ['if len(rhs) == 2 and rhs[0] in D[i][k] and rhs[1] in D[k][j]:', 'if (rhs.length === 2 && D[i][k].has(rhs[0]) && D[k][j].has(rhs[1]))', 'X → YZ derives the piece when Y derives the left part and Z the right part.'],
      ['return "S" in D[0][n]', "return D[0][n].has('S')", 'The whole string, from the start symbol.'],
    ],
    math: [
      ['X ∈ D(i, j)', 'D[i][j].add(lhs)', 'D[i][j].add(lhs)', 'X derives s[i:j]'],
      ['X → YZ', 'rhs[0]', 'rhs[0]', 'a rule with two nonterminals on the right (Y is rhs[0], Z is rhs[1])'],
    ],
  },

  'weighted-parsing': {
    code: CODE['weighted-parsing'],
    notes: [
      ['D = [[{} for _ in range(n + 1)] for _ in range(n + 1)]', 'const D = Array.from({ length: n + 1 }', 'D[i][j][X]: how many parse trees of s[i:j] have X at the root.'],
      ['D[i][i + 1][lhs] = D[i][i + 1].get(lhs, 0) + 1', 'D[i][i + 1].set(lhs, (D[i][i + 1].get(lhs) ?? 0n) + 1n)', 'One letter: one tree for each rule X → that letter.'],
      ['for k in range(i + 1, j):', 'for (let k = i + 1; k < j; k++) {', 'Every split of the piece, as in CYK.'],
      ['ways = D[i][k].get(rhs[0], 0) * D[k][j].get(rhs[1], 0)', 'const ways = (D[i][k].get(rhs[0]) ?? 0n) * (D[k][j].get(rhs[1]) ?? 0n)', 'Any left subtree with any right subtree: the counts multiply.'],
      ['D[i][j][lhs] = (D[i][j].get(lhs, 0) + ways) % M', 'D[i][j].set(lhs, ((D[i][j].get(lhs) ?? 0n) + ways) % M)', 'Different rules and different splits are different trees: the counts add.'],
      ['return D[0][n].get("S", 0) if n else 0', "return n ? Number(D[0][n].get('S') ?? 0n) : 0", 'The trees of the whole string from S.'],
    ],
    math: [
      ['N(X, i, j)', 'D[i][j]', 'D[i][j]', 'the number of trees of s[i:j] rooted at X'],
      ['N(Y, i, k) · N(Z, k, j)', 'ways', 'ways', 'the trees using X → YZ split at k'],
    ],
  },

  'earley': {
    code: CODE['earley'],
    notes: [
      ['nullable, changed = set(), True', 'const n = s.length, nullable = new Set()', 'First find the nonterminals that can derive the empty string, repeating until nothing new is found.'],
      ['if lhs not in nullable and all(x in nullable for x in rhs):', 'if (!nullable.has(lhs) && [...rhs].every(x => nullable.has(x)))', 'X is nullable when some rule for X has only nullable symbols (an empty right side counts).'],
      ['chart[0] = {(r, 0, 0) for r in range(len(rules)) if rules[r][0] == "S"}', "rules.forEach(([lhs], r) => { if (lhs === 'S') chart[0].set(key(r, 0, 0), [r, 0, 0]) })", 'An item is (rule, dot, start): the rule’s right side is matched up to the dot, from position start. At 0, every rule for S, nothing matched.'],
      ['todo = list(chart[i])', 'const todo = [...chart[i].values()]', 'Each new item at position i is processed once; the set stops the same item being added twice.'],
      ['new += [(q, 0, i) for q in range(len(rules)) if rules[q][0] == x]', 'rules.forEach(([l], q) => { if (l === x) next.push([q, 0, i]) })', 'Predict: the item expects nonterminal X, so start every rule for X here.'],
      ['if x in nullable:', 'if (nullable.has(x)) next.push([r, dot + 1, start])', 'X can be empty, so also move the dot past it. Completing the empty X later would miss items added after it.'],
      ['chart[i + 1].add((r, dot + 1, start))', 'chart[i + 1].set(key(r, dot + 1, start), [r, dot + 1, start])', 'Scan: the item expects the next letter, and it is there: move to position i + 1.'],
      ['new += [(q, d + 1, st) for q, d, st in chart[start] if d < len(rules[q][1]) and rules[q][1][d] == lhs]', 'if (d < rules[q][1].length && rules[q][1][d] === lhs) next.push([q, d + 1, st])', 'Complete: X is finished from start to i, so every item at start that was expecting X moves past it.'],
      ['return any(rules[r][0] == "S" and dot == len(rules[r][1]) and start == 0 for r, dot, start in chart[n])', "rules[r][0] === 'S' && dot === rules[r][1].length && start === 0", 'Accept when a rule for S is finished at the end of the string, having started at 0.'],
    ],
    math: [
      ['[A → α · β, j]', 'r, dot, start', '[r, dot, start]', 'an item: rule r matched up to the dot, from position j = start'],
      ['ε-derivable', 'nullable', 'nullable', 'the nonterminals that can derive the empty string'],
    ],
  },

  'inside-outside': {
    code: CODE['inside-outside'],
    notes: [
      ['inside[a][a + 1][lhs] = inside[a][a + 1].get(lhs, 0) + p', 'inside[a][a + 1].set(lhs, get(inside[a][a + 1], lhs) + BigInt(p))', 'One letter: the chance of the rule X → that letter, in percent.'],
      ['w = p * inside[a][k].get(rhs[0], 0) * inside[k][b].get(rhs[1], 0)', 'const w = BigInt(p) * get(inside[a][k], rhs[0]) * get(inside[k][b], rhs[1])', 'Inside: the rule’s chance times both children’s inside chances, added over rules and splits. A piece of length L always uses 2L − 1 rules, so everything is a whole number of 100ths to that power.'],
      ['outside[0][n]["S"] = 1', "outside[0][n].set('S', 1n)", 'Outside of the whole string from S: nothing is around it, chance 1.'],
      ['for length in range(n, 1, -1):', 'for (let length = n; length >= 2; length--) {', 'Outside flows from a piece down to its parts, so longer pieces first: a piece’s outside is complete before it is passed on.'],
      ['outside[a][k][B] = outside[a][k].get(B, 0) + out * p * inside[k][b].get(C, 0)', 'outside[a][k].set(B, get(outside[a][k], B) + out * BigInt(p) * get(inside[k][b], C))', 'The left child B’s surroundings: the parent’s surroundings, the rule, and the right sibling’s inside.'],
      ['outside[k][b][C] = outside[k][b].get(C, 0) + out * p * inside[a][k].get(B, 0)', 'outside[k][b].set(C, get(outside[k][b], C) + out * BigInt(p) * get(inside[a][k], B))', 'The right child likewise, with the left sibling’s inside.'],
      ['top = inside[i][j].get(X, 0) * outside[i][j].get(X, 0)', 'top = get(inside[i][j], X) * get(outside[i][j], X)', 'Every tree with X over [i, j) is a surrounding times a subtree: their totals multiply.'],
      ['g = gcd(top, total)', 'const g = gcd(top, total)', 'Over the total chance of s, in lowest terms. The powers of 100 match: both use 2n − 1 rules.'],
    ],
    math: [
      ['β(X, i, j)', 'inside[i][j]', 'inside[i][j]', 'the inside chance: X derives s[i:j]'],
      ['α(X, i, j)', 'outside[i][j]', 'outside[i][j]', 'the outside chance: S derives the rest with an X over [i, j)'],
    ],
  },

  'viterbi': {
    code: CODE['viterbi'],
    notes: [
      ['V = [start[s] + emit[s][obs[0]] for s in range(k)]', 'let V = start.map((c, s) => c + emit[s][obs[0]])', 'At time 0 the cheapest path ending in s is just s: its start cost and the cost of the first observation.'],
      ['for o in obs[1:]:', 'for (const o of obs.slice(1)) {', 'One time step per observation; only the previous step’s V is needed.'],
      ['min(V[r] + trans[r][s] for r in range(k))', 'Math.min(...V.map((v, r) => v + trans[r][s]))', 'The cheapest path ending in s came from some r; its earlier part is the cheapest path ending in r.'],
      ['+ emit[s][o]', '+ emit[s][o])', 'Then pay for this observation from state s.'],
      ['return min(V)', 'return Math.min(...V)', 'The path may end in any state: the cheapest of them. Costs are −log probabilities, so this is the most probable path.'],
    ],
    math: [
      ['V(t, s)', 'V[r]', 'v', 'the least cost of a path through time t ending in state s'],
      ['−log P', 'trans[r][s]', 'trans[r][s]', 'a cost: a negative log probability, so costs add where probabilities multiply'],
    ],
  },

  'forward-backward': {
    code: CODE['forward-backward'],
    notes: [
      ['alpha[0][x] = start[x] * emit[x][obs[0]]', 'alpha[0][x] = B(start[x] * emit[x][obs[0]])', 'Forward at time 0: start in x and emit the first observation.'],
      ['beta[T - 1][x] = 1', 'beta[T - 1][x] = 1n', 'Backward at the last time: nothing follows, weight 1.'],
      ['alpha[u][x] = sum(alpha[u - 1][y] * trans[y][x] for y in range(k)) * emit[x][obs[u]]', 'alpha[u][x] = sum * B(emit[x][obs[u]])', 'Forward: every path ending in y, moved to x, then x emits. Unlike Viterbi, the paths are added, not minimised.'],
      ['for u in range(T - 2, -1, -1):', 'for (let u = T - 2; u >= 0; u--) {', 'Backward runs the other way, from the end.'],
      ['beta[u][x] = sum(trans[x][y] * emit[y][obs[u + 1]] * beta[u + 1][y] for y in range(k))', 'sum += B(trans[x][y] * emit[y][obs[u + 1]]) * beta[u + 1][y]', 'Backward: move from x to y, y emits the next observation, then everything after.'],
      ['total = sum(alpha[T - 1])', 'const total = alpha[T - 1].reduce((a, b) => a + b, 0n)', 'The weight of all paths.'],
      ['top = alpha[t][s] * beta[t][s]', 'top = alpha[t][s] * beta[t][s]', 'Every path through s at time t is a front part and a back part: their weights multiply.'],
    ],
    math: [
      ['α(u, x)', 'alpha[u][x]', 'alpha[u][x]', 'the weight of the paths up to time u ending in x'],
      ['β(u, x)', 'beta[u][x]', 'beta[u][x]', 'the weight of what follows state x at time u'],
    ],
  },

  'belief-propagation': {
    code: CODE['belief-propagation'],
    notes: [
      ['order, parent = [0], [-1] * n', 'const order = [0], parent = new Array(n).fill(-1)', 'A breadth-first order from node 0: every node comes after its parent.'],
      ['belief = [row[:] for row in unary]', 'const belief = unary.map(row => row.map(BigInt))', 'Each node starts with its own weights, one per value.'],
      ['for v in reversed(order[1:]):', 'for (const v of order.slice(1).reverse()) {', 'Leaves first: a node sends its message once all its children have sent theirs.'],
      ['msg = [sum(pair[x][y] * belief[v][y] for y in range(k)) % M for x in range(k)]', 'belief[v].reduce((acc, b, y) => acc + BigInt(pair[x][y]) * b, 0n) % M', 'The message to the parent: for each parent value x, the subtree’s total weight, summed over the node’s values y.'],
      ['belief[u][x] = belief[u][x] * msg[x] % M', 'belief[u][x] = belief[u][x] * msg[x] % M', 'Separate subtrees only meet at the parent, so their messages multiply into it.'],
      ['return sum(belief[0]) % M', 'return Number(belief[0].reduce((a, b) => a + b, 0n) % M)', 'At the root every subtree is included: sum over the root’s values.'],
    ],
    math: [
      ['m_{v→u}(x)', 'msg[x]', 'msg[x]', 'the message from v to its parent u: the weight of v’s subtree when u has value x'],
      ['Z', 'sum(belief[0])', 'belief[0].reduce', 'the total weight of all assignments'],
    ],
  },

  'rna-folding': {
    code: CODE['rna-folding'],
    notes: [
      ['ok = {"AU", "UA", "GC", "CG", "GU", "UG"}', "ok = new Set(['AU', 'UA', 'GC', 'CG', 'GU', 'UG'])", 'The pairs allowed: A–U, G–C, and the weaker G–U, each either way round.'],
      ['for length in range(5, n + 1):', 'for (let length = 5; length <= n; length++) {', 'A pair needs three positions between, so a piece shorter than 5 has none: those cells stay 0.'],
      ['best = D[i][j - 1]', 'let best = D[i][j - 1]', 'The last position unpaired: the rest of the piece on its own.'],
      ['for k in range(i, j - 4):', 'for (let k = i; k < j - 4; k++) {', 'Or paired with k, at least four places before it.'],
      ['best = max(best, D[i][k] + 1 + D[k + 1][j - 1])', 'best = Math.max(best, D[i][k] + 1 + D[k + 1][j - 1])', 'The pair splits the piece: nothing may cross it, so the parts inside and before it are independent.'],
      ['return D[0][n]', 'return D[0][n]', 'The whole string, from its first letter to its last.'],
    ],
    math: [
      ['D(i, j)', 'D[i][j]', 'D[i][j]', 'the most pairs in s[i:j]'],
      ['D(i, k) + 1 + D(k + 1, j − 1)', 'D[i][k] + 1 + D[k + 1][j - 1]', 'D[i][k] + 1 + D[k + 1][j - 1]', 'pair k with j − 1'],
    ],
  },
}
