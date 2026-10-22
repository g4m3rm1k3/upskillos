// Reference solutions explained line by line for the game lessons (Specialist, games group). Format:
// explained.js. The same code is the lessons' test reference (specialist-solutions.js).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CODE = {
  // A token moves one square up, left, or diagonally up-left onto a free square; a player who can't move
  // loses. Count the free squares that win for the player to move.
  'win-lose': pair(`def solve(grid):
    h, w = len(grid), len(grid[0])
    win = [[False] * w for _ in range(h)]
    count = 0
    for r in range(h):
        for c in range(w):
            if grid[r][c]:
                continue
            for dr, dc in ((-1, 0), (0, -1), (-1, -1)):
                y, x = r + dr, c + dc
                if y >= 0 and x >= 0 and not grid[y][x] and not win[y][x]:
                    win[r][c] = True
                    break
            if win[r][c]:
                count += 1
    return count
`, `function solve(grid) {
  const h = grid.length, w = grid[0].length
  const win = Array.from({ length: h }, () => new Array(w).fill(false))
  let count = 0
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c]) continue
      for (const [dr, dc] of [[-1, 0], [0, -1], [-1, -1]]) {
        const y = r + dr, x = c + dc
        if (y >= 0 && x >= 0 && !grid[y][x] && !win[y][x]) {
          win[r][c] = true
          break
        }
      }
      if (win[r][c]) count++
    }
  }
  return count
}`),

  // Count the losing piles among 0 … N. The last m outcomes (m the largest move) decide every later one,
  // so once a window of m outcomes repeats, the outcomes repeat with it.
  'subtraction-games': pair(`def solve(moves, N):
    m = max(moves)
    lose, seen = [], {}
    while len(lose) <= N:
        i = len(lose)
        if i >= m:
            window = tuple(lose[i - m:])
            if window in seen:
                j = seen[window]
                cycle = lose[j:]
                q, r = divmod(N - j + 1, len(cycle))
                return sum(lose[:j]) + q * sum(cycle) + sum(cycle[:r])
            seen[window] = i
        lose.append(all(s > i or not lose[i - s] for s in moves))
    return sum(lose[:N + 1])
`, `function solve(moves, N) {
  const m = Math.max(...moves), lose = [], seen = new Map()
  const count = (from, to) => { let k = 0; for (let x = from; x < to; x++) if (lose[x]) k++; return k }
  while (lose.length <= N) {
    const i = lose.length
    if (i >= m) {
      const window = lose.slice(i - m).map(Number).join('')
      if (seen.has(window)) {
        const j = seen.get(window), period = i - j
        const q = Math.floor((N - j + 1) / period), r = (N - j + 1) % period
        return count(0, j) + q * count(j, i) + count(j, j + r)
      }
      seen.set(window, i)
    }
    lose.push(moves.every(s => s > i || !lose[i - s]))
  }
  return count(0, N + 1)
}`),

  // Take 1, 2 or 3 stones from the front, scoring their sum. D[i]: the player to move's lead from stone i on.
  'score-difference': pair(`def solve(a):
    n = len(a)
    D = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        best, take = None, 0
        for t in range(1, 4):
            if i + t > n:
                break
            take += a[i + t - 1]
            lead = take - D[i + t]
            if best is None or lead > best:
                best = lead
        D[i] = best
    return D[0]
`, `function solve(a) {
  const n = a.length, D = new Array(n + 1).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let best = null, take = 0
    for (let t = 1; t <= 3; t++) {
      if (i + t > n) break
      take += a[i + t - 1]
      const lead = take - D[i + t]
      if (best === null || lead > best) best = lead
    }
    D[i] = best
  }
  return D[0]
}`),

  // Take a number from either end of the row. D[l][r]: the player to move's lead on a[l:r].
  'interval-games': pair(`def solve(a):
    n = len(a)
    D = [[0] * (n + 1) for _ in range(n + 1)]
    for length in range(1, n + 1):
        for l in range(n - length + 1):
            r = l + length
            D[l][r] = max(a[l] - D[l + 1][r], a[r - 1] - D[l][r - 1])
    return D[0][n]
`, `function solve(a) {
  const n = a.length
  const D = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0))
  for (let length = 1; length <= n; length++) {
    for (let l = 0; l + length <= n; l++) {
      const r = l + length
      D[l][r] = Math.max(a[l] - D[l + 1][r], a[r - 1] - D[l][r - 1])
    }
  }
  return D[0][n]
}`),

  // Kayles: knock down one pin or two neighbouring pins of a row, which may split it in two.
  'grundy': pair(`def solve(n):
    g = [0] * (n + 1)
    for size in range(1, n + 1):
        seen = set()
        for take in (1, 2):
            for left in range(size - take + 1):
                seen.add(g[left] ^ g[size - take - left])
        mex = 0
        while mex in seen:
            mex += 1
        g[size] = mex
    return g[n]
`, `function solve(n) {
  const g = new Array(n + 1).fill(0)
  for (let size = 1; size <= n; size++) {
    const seen = new Set()
    for (const take of [1, 2]) {
      for (let left = 0; left + take <= size; left++) seen.add(g[left] ^ g[size - take - left])
    }
    let mex = 0
    while (seen.has(mex)) mex++
    g[size] = mex
  }
  return g[n]
}`),

  // Several piles, each a subtraction game with the same moves. Count the first moves that win.
  'game-sums': pair(`def solve(moves, piles):
    top = max(piles)
    g = [0] * (top + 1)
    for x in range(1, top + 1):
        seen = {g[x - s] for s in moves if s <= x}
        mex = 0
        while mex in seen:
            mex += 1
        g[x] = mex
    total = 0
    for p in piles:
        total ^= g[p]
    count = 0
    for p in piles:
        want = total ^ g[p]
        for s in moves:
            if s <= p and g[p - s] == want:
                count += 1
    return count
`, `function solve(moves, piles) {
  const top = Math.max(...piles), g = new Array(top + 1).fill(0)
  for (let x = 1; x <= top; x++) {
    const seen = new Set(moves.filter(s => s <= x).map(s => g[x - s]))
    let mex = 0
    while (seen.has(mex)) mex++
    g[x] = mex
  }
  let total = 0
  for (const p of piles) total ^= g[p]
  let count = 0
  for (const p of piles) {
    const want = total ^ g[p]
    for (const s of moves) if (s <= p && g[p - s] === want) count++
  }
  return count
}`),

  // A race to square n: on a turn, step one square or roll a fair s-sided die and move that far. First to
  // reach n wins. V[a][b]: the chance that the player to move, on a, wins against the other on b.
  'stochastic-games': pair(`from fractions import Fraction

def solve(n, s):
    V = [[Fraction(0)] * n for _ in range(n)]
    for total in range(2 * n - 2, -1, -1):
        for a in range(max(0, total - n + 1), min(n - 1, total) + 1):
            b = total - a
            step = 1 if a + 1 >= n else 1 - V[b][a + 1]
            roll = sum(1 if a + f >= n else 1 - V[b][a + f] for f in range(1, s + 1)) / Fraction(s)
            V[a][b] = max(step, roll)
    return f"{V[0][0].numerator}/{V[0][0].denominator}"
`, `function solve(n, s) {
  const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a }
  const F = (p, q = 1n) => { const g = gcd(p, q) || 1n; return [p / g, q / g] }
  const add = (x, y) => F(x[0] * y[1] + y[0] * x[1], x[1] * y[1])
  const lose = x => F(x[1] - x[0], x[1])
  const V = Array.from({ length: n }, () => new Array(n).fill(F(0n)))
  for (let total = 2 * n - 2; total >= 0; total--) {
    for (let a = Math.max(0, total - n + 1); a <= Math.min(n - 1, total); a++) {
      const b = total - a
      const step = a + 1 >= n ? F(1n) : lose(V[b][a + 1])
      let roll = F(0n)
      for (let f = 1; f <= s; f++) roll = add(roll, a + f >= n ? F(1n) : lose(V[b][a + f]))
      roll = F(roll[0], roll[1] * BigInt(s))
      V[a][b] = step[0] * roll[1] >= roll[0] * step[1] ? step : roll
    }
  }
  return \`\${V[0][0][0]}/\${V[0][0][1]}\`
}`),

  // k in a row on an h × w board, X to move when the counts are equal. A memo keyed by the board: many move
  // orders reach the same board, and the board alone says whose turn it is.
  'transpositions': pair(`def solve(board, k):
    h, w = len(board), len(board[0])
    lines = []
    for r in range(h):
        for c in range(w):
            for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
                cells = [(r + i * dr, c + i * dc) for i in range(k)]
                if all(0 <= y < h and 0 <= x < w for y, x in cells):
                    lines.append([y * w + x for y, x in cells])
    memo = {}
    def value(state):
        key = state
        if key in memo:
            return memo[key]
        result = None
        for line in lines:
            first = state[line[0]]
            if first != "." and all(state[i] == first for i in line):
                result = 1 if first == "X" else -1
                break
        if result is None and "." not in state:
            result = 0
        if result is None:
            mover = "X" if state.count("X") == state.count("O") else "O"
            values = [value(state[:i] + mover + state[i + 1:]) for i, ch in enumerate(state) if ch == "."]
            result = max(values) if mover == "X" else min(values)
        memo[key] = result
        return result
    return value("".join(board))
`, `function solve(board, k) {
  const h = board.length, w = board[0].length, lines = []
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cells = Array.from({ length: k }, (_, i) => [r + i * dr, c + i * dc])
        if (cells.every(([y, x]) => y >= 0 && y < h && x >= 0 && x < w)) lines.push(cells.map(([y, x]) => y * w + x))
      }
    }
  }
  const memo = new Map()
  const value = state => {
    const key = state
    if (memo.has(key)) return memo.get(key)
    let result = null
    for (const line of lines) {
      const first = state[line[0]]
      if (first !== '.' && line.every(i => state[i] === first)) { result = first === 'X' ? 1 : -1; break }
    }
    if (result === null && !state.includes('.')) result = 0
    if (result === null) {
      const xs = [...state].filter(ch => ch === 'X').length, os = [...state].filter(ch => ch === 'O').length
      const mover = xs === os ? 'X' : 'O', values = []
      for (let i = 0; i < state.length; i++) if (state[i] === '.') values.push(value(state.slice(0, i) + mover + state.slice(i + 1)))
      result = mover === 'X' ? Math.max(...values) : Math.min(...values)
    }
    memo.set(key, result)
    return result
  }
  return value(board.join(''))
}`),
}

export const GAME_EXPLAINED = {
  'win-lose': {
    code: CODE['win-lose'],
    notes: [
      ['win = [[False] * w for _ in range(h)]', 'const win = Array.from({ length: h }, () => new Array(w).fill(false))', 'Every square starts as losing. A square with no move stays that way: the player to move there has lost.'],
      ['for r in range(h):', 'for (let r = 0; r < h; r++) {', 'Every move goes up or left, so the squares above and to the left are decided first: reading order works.'],
      ['for dr, dc in ((-1, 0), (0, -1), (-1, -1)):', 'for (const [dr, dc] of [[-1, 0], [0, -1], [-1, -1]]) {', 'The three moves: up, left, and diagonally up-left.'],
      ['if y >= 0 and x >= 0 and not grid[y][x] and not win[y][x]:', 'if (y >= 0 && x >= 0 && !grid[y][x] && !win[y][x]) {', 'A move onto the board, onto a free square, that leaves the opponent on a losing square.'],
      ['win[r][c] = True', 'win[r][c] = true', 'One such move is enough: the player to move takes it and wins. If none exists, every move hands the opponent a win.'],
      ['count += 1', 'count++', 'Count the free squares that win for the player to move.'],
    ],
    math: [
      ['W(r, c)', 'win[r][c]', 'win[r][c]', 'true when the player to move from (r, c) can force a win'],
      ['W = ∃ move to a square with ¬W', 'not win[y][x]', '!win[y][x]', 'a square wins when some move reaches a losing square'],
    ],
  },

  'subtraction-games': {
    code: CODE['subtraction-games'],
    notes: [
      ['m = max(moves)', 'const m = Math.max(...moves)', 'No move reaches back further than m piles, so the last m outcomes decide the next one.'],
      ['window = tuple(lose[i - m:])', 'const window = lose.slice(i - m).map(Number).join(\'\')', 'The last m outcomes before pile i: everything the future depends on.'],
      ['if window in seen:', 'if (seen.has(window)) {', 'The same window seen before at pile j: from here on, the outcomes repeat those from j.'],
      ['q, r = divmod(N - j + 1, len(cycle))', 'const q = Math.floor((N - j + 1) / period), r = (N - j + 1) % period', 'Piles j … N are q whole periods and r piles of a last, partial one.'],
      ['return sum(lose[:j]) + q * sum(cycle) + sum(cycle[:r])', 'return count(0, j) + q * count(j, i) + count(j, j + r)', 'The losing piles before the period, in the q whole periods, and in the partial one.'],
      ['lose.append(all(s > i or not lose[i - s] for s in moves))', 'lose.push(moves.every(s => s > i || !lose[i - s]))', 'Pile i loses when every move that fits leaves a winning pile; with no move at all it loses too.'],
    ],
    math: [
      ['L(i)', 'lose[i - s]', 'lose[i - s]', 'whether the pile reached by a move loses'],
      ['period p', 'len(cycle)', 'period', 'the length after which the outcomes repeat'],
    ],
  },

  'score-difference': {
    code: CODE['score-difference'],
    notes: [
      ['D = [0] * (n + 1)', 'D = new Array(n + 1).fill(0)', 'D[n] = 0: no stones left, no lead either way.'],
      ['for i in range(n - 1, -1, -1):', 'for (let i = n - 1; i >= 0; i--) {', 'A move only removes stones, so D[i] reads later positions: fill from the back.'],
      ['take += a[i + t - 1]', 'take += a[i + t - 1]', 'Taking t stones scores the sum of the first t that are left.'],
      ['lead = take - D[i + t]', 'const lead = take - D[i + t]', 'Then the opponent moves from i + t with lead D[i + t] over us: our lead is what we took minus theirs.'],
      ['if best is None or lead > best:', 'if (best === null || lead > best) best = lead', 'The player to move picks the best lead. Starting from None, not 0: every lead can be negative.'],
      ['return D[0]', 'return D[0]', 'The first player’s score minus the second’s.'],
    ],
    math: [
      ['D(i) = max over t of (a[i] + … + a[i + t − 1]) − D(i + t)', 'D[i]', 'D[i]', 'the lead of the player to move with stones i … n − 1 left'],
      ['a[i] + … + a[i + t − 1]', 'take', 'take', 'what taking t stones scores'],
    ],
  },

  'interval-games': {
    code: CODE['interval-games'],
    notes: [
      ['D = [[0] * (n + 1) for _ in range(n + 1)]', 'const D = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0))', 'D[l][r] for the numbers a[l:r]. An empty row, l = r, leaves no lead: 0.'],
      ['for length in range(1, n + 1):', 'for (let length = 1; length <= n; length++) {', 'A move shortens the row by one, so shorter rows come first.'],
      ['r = l + length', 'const r = l + length', 'The row runs from l up to, not including, r.'],
      ['a[l] - D[l + 1][r]', 'a[l] - D[l + 1][r]', 'Take the left end, then the opponent leads by D on the rest.'],
      ['a[r - 1] - D[l][r - 1]', 'a[r - 1] - D[l][r - 1]', 'Or take the right end.'],
      ['return D[0][n]', 'return D[0][n]', 'The whole row: the first player’s lead.'],
    ],
    math: [
      ['D(l, r)', 'D[l][r]', 'D[l][r]', 'the lead of the player to move on a[l:r]'],
      ['max(a[l] − D(l + 1, r), a[r − 1] − D(l, r − 1))', 'max(', 'Math.max(', 'the better end'],
    ],
  },

  'grundy': {
    code: CODE['grundy'],
    notes: [
      ['g = [0] * (n + 1)', 'const g = new Array(n + 1).fill(0)', 'g[0] = 0: no pins, no move, a lost position.'],
      ['for take in (1, 2):', 'for (const take of [1, 2]) {', 'Knock down one pin or two neighbouring ones.'],
      ['for left in range(size - take + 1):', 'for (let left = 0; left + take <= size; left++)', 'Every place to knock them down: left pins stay on one side and size − take − left on the other.'],
      ['seen.add(g[left] ^ g[size - take - left])', 'seen.add(g[left] ^ g[size - take - left])', 'Two separate rows are a sum of games, so the position’s value is the XOR of the two rows’ values.'],
      ['while mex in seen:', 'while (seen.has(mex)) mex++', 'The mex: the smallest value no move reaches.'],
      ['return g[n]', 'return g[n]', 'The value of a row of n pins. It is 0 exactly when the player to move loses.'],
    ],
    math: [
      ['g(n) = mex { g(a) ⊕ g(b) }', 'g[size]', 'g[size]', 'the Grundy value of a row, over every move leaving rows a and b'],
      ['g(a) ⊕ g(b)', 'g[left] ^ g[size - take - left]', 'g[left] ^ g[size - take - left]', 'the value of two rows side by side'],
    ],
  },

  'game-sums': {
    code: CODE['game-sums'],
    notes: [
      ['seen = {g[x - s] for s in moves if s <= x}', 'const seen = new Set(moves.filter(s => s <= x).map(s => g[x - s]))', 'The values every move from a pile of x reaches.'],
      ['while mex in seen:', 'while (seen.has(mex)) mex++', 'g[x] is their mex: one Grundy table serves every pile.'],
      ['total ^= g[p]', 'for (const p of piles) total ^= g[p]', 'The whole position’s value is the XOR of the piles’ values. It is 0 exactly when the player to move loses.'],
      ['want = total ^ g[p]', 'const want = total ^ g[p]', 'Changing this pile alone to a value of total ⊕ g[p] makes the XOR 0.'],
      ['if s <= p and g[p - s] == want:', 'if (s <= p && g[p - s] === want) count++', 'A move that reaches that value leaves the opponent a lost position: a winning move.'],
    ],
    math: [
      ['G = g(p₁) ⊕ … ⊕ g(pₖ)', 'total', 'total', 'the value of the whole position'],
      ['g(p − s) = G ⊕ g(p)', 'g[p - s] == want', 'g[p - s] === want', 'the test for a winning move on pile p'],
    ],
  },

  'stochastic-games': {
    code: CODE['stochastic-games'],
    notes: [
      ['V = [[Fraction(0)] * n for _ in range(n)]', 'const V = Array.from({ length: n }, () => new Array(n).fill(F(0n)))', 'V[a][b]: the chance that the player to move, on square a, wins against the other on b.'],
      ['for total in range(2 * n - 2, -1, -1):', 'for (let total = 2 * n - 2; total >= 0; total--) {', 'Every move adds to a + b, so positions with a larger a + b are filled first.'],
      ['step = 1 if a + 1 >= n else 1 - V[b][a + 1]', 'const step = a + 1 >= n ? F(1n) : lose(V[b][a + 1])', 'Step: reach n and win, or hand the turn over; then the opponent wins with V[b][a + 1], and we with one minus that.'],
      ['roll = sum(1 if a + f >= n else 1 - V[b][a + f] for f in range(1, s + 1)) / Fraction(s)', 'roll = add(roll, a + f >= n ? F(1n) : lose(V[b][a + f]))', 'Roll: a chance node. Nobody chooses the face, so the outcomes are averaged, not maximised.'],
      ['V[a][b] = max(step, roll)', 'V[a][b] = step[0] * roll[1] >= roll[0] * step[1] ? step : roll', 'The player to move chooses the better of the two. The opponent’s choices are inside V[b][…], from their side.'],
      ['return f"{V[0][0].numerator}/{V[0][0].denominator}"', '${V[0][0][0]}', 'Both start on square 0, the first player to move.'],
    ],
    math: [
      ['V(a, b)', 'V[a][b]', 'V[a][b]', 'the chance the player to move wins'],
      ['1 − V(b, a′)', '1 - V[b][a + 1]', 'lose(V[b][a + 1])', 'after a move the roles swap: the other player’s chance, turned into ours'],
    ],
  },

  'transpositions': {
    code: CODE['transpositions'],
    notes: [
      ['for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):', 'for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {', 'Every line of k squares: across, down, and both diagonals, from every starting square.'],
      ['memo = {}', 'const memo = new Map()', 'The transposition table: one entry per board, whatever order the moves came in.'],
      ['key = state', 'const key = state', 'The key is the whole board: which squares hold an X and which an O.'],
      ['if key in memo:', 'if (memo.has(key)) return memo.get(key)', 'A board reached before by another order of moves: its value is already known.'],
      ['result = 1 if first == "X" else -1', 'result = first === \'X\' ? 1 : -1', 'A finished line ends the game: 1 if X made it, −1 if O did.'],
      ['result = 0', 'result = 0', 'A full board with no line: a draw.'],
      ['mover = "X" if state.count("X") == state.count("O") else "O"', 'const mover = xs === os ? \'X\' : \'O\'', 'Whose turn it is follows from the board itself, so the board alone is a complete key. If it didn’t, the side to move would have to be in the key.'],
      ['result = max(values) if mover == "X" else min(values)', 'result = mover === \'X\' ? Math.max(...values) : Math.min(...values)', 'Every value is exact, from a full search, so it can be reused anywhere the board appears again.'],
    ],
    math: [
      ['v(board)', 'memo[key]', 'memo.set(key, result)', 'the exact minimax value of a board: 1 X wins, 0 draw, −1 O wins'],
      ['X to move ⇔ #X = #O', 'state.count("X") == state.count("O")', 'xs === os', 'the side to move, read from the board'],
    ],
  },
}
