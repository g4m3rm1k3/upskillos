// Reference solutions explained line by line (standard 5): the code each Core lesson teaches, in
// Python and JavaScript, with notes on the lines that matter and every maths symbol beside the variable
// that holds it. The bug hunts (bug-hunts.js) break this same code. explained.test.js runs every version
// against its challenge, in JavaScript and real Python, and checks that each note and name is in the code.
//
// notes: [pythonText, javascriptText, note]: the note goes under the first line, at or after the previous
// note's line, that contains that language's text. math: [maths, python, javascript, meaning].
import { DAG_EXPLAINED } from './explained-dag.js'
import { TREE_EXPLAINED } from './explained-tree.js'
import { SUBSET_EXPLAINED } from './explained-subset.js'
import { DIGIT_EXPLAINED } from './explained-digit.js'
import { SPACE_EXPLAINED } from './explained-space.js'
import { SPLIT_EXPLAINED } from './explained-split.js'
import { ALGEBRA_EXPLAINED } from './explained-algebra.js'

const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CORE_EXPLAINED = {
  fibonacci: {
    code: pair(`def solve(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
`, `function solve(n) {
  let a = 0, b = 1
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b]
  }
  return a
}
`),
    notes: [
      ["a, b = 0, 1", "let a = 0, b = 1", "The pair starts as (F(0), F(1)) = (0, 1). Two numbers are all the state there is: each new term reads only the two before it, so no table of earlier terms is kept."],
      ["range(n)", "i < n", "n passes. After k passes the pair is (F(k), F(k + 1)), so after n passes a = F(n). For n = 0 the loop never runs and a stays F(0) = 0."],
      ["a, b = b, a + b", "[a, b] = [b, a + b]", "One step of F(k + 2) = F(k + 1) + F(k). The whole right-hand side is worked out from the old a and b before either is stored; storing a first would lose the old a (this lesson’s bug hunt)."],
      ["return a", "return a", "a holds F(n); b already holds F(n + 1)."],
    ],
    math: [
      ["F(k)", "a", "a", "the older of the two terms kept"],
      ["F(k + 1)", "b", "b", "the newer term"],
      ["F(k + 1) + F(k)", "a + b", "a + b", "the next term, before it is stored"],
    ],
  },
  'house-robber': {
    code: pair(`def solve(values):
    n = len(values)
    if n == 0:
        return 0
    if n == 1:
        return values[0]
    best = [0] * n
    best[0] = values[0]
    best[1] = max(values[0], values[1])
    for i in range(2, n):
        best[i] = max(best[i - 1], best[i - 2] + values[i])
    return best[n - 1]
`, `function solve(values) {
  const n = values.length
  if (n === 0) return 0
  if (n === 1) return values[0]
  const best = Array(n).fill(0)
  best[0] = values[0]
  best[1] = Math.max(values[0], values[1])
  for (let i = 2; i < n; i++) {
    best[i] = Math.max(best[i - 1], best[i - 2] + values[i])
  }
  return best[n - 1]
}
`),
    notes: [
      ["if n == 0", "if (n === 0)", "No houses, nothing taken. This return and the next cover lists too short to have a best[1]."],
      ["best = [0] * n", "const best = Array(n).fill(0)", "best[i] will hold B(i): the most from houses 0 to i with no two neighbours taken. One cell per house."],
      ["best[0] = values[0]", "best[0] = values[0]", "With only house 0, take it: amounts are never negative."],
      ["best[1] = max", "best[1] = Math.max", "With houses 0 and 1 you may take only one: the larger. This means “the best from 0 to 1”, not “house 1 taken”."],
      ["range(2, n)", "let i = 2", "Left to right, so B(i − 1) and B(i − 2) are filled before B(i) reads them."],
      ["best[i] = max(", "best[i] = Math.max(", "The two choices for house i. Skip it: the best up to i − 1 stands. Take it: its amount plus the best up to i − 2, because house i − 1 must then be skipped."],
      ["return best[n - 1]", "return best[n - 1]", "The last cell covers every house."],
    ],
    math: [
      ["B(i)", "best[i]", "best[i]", "the most from houses 0 … i"],
      ["aᵢ", "values[i]", "values[i]", "the amount in house i"],
      ["max(B(i − 1), aᵢ + B(i − 2))", "max(best[i - 1], best[i - 2] + values[i])", "Math.max(best[i - 1], best[i - 2] + values[i])", "skip house i, or take it"],
    ],
  },
  'decode-ways': {
    code: pair(`def solve(s):
    n = len(s)
    ways = [1] + [0] * n
    for i in range(1, n + 1):
        if s[i - 1] != '0':
            ways[i] += ways[i - 1]
        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:
            ways[i] += ways[i - 2]
    return ways[n]
`, `function solve(s) {
  const n = s.length
  const ways = [1, ...Array(n).fill(0)]
  for (let i = 1; i <= n; i++) {
    if (s[i - 1] !== '0') ways[i] += ways[i - 1]
    if (i >= 2) {
      const pair = Number(s.slice(i - 2, i))
      if (pair >= 10 && pair <= 26) ways[i] += ways[i - 2]
    }
  }
  return ways[n]
}
`),
    notes: [
      ["ways = [1]", "const ways = [1", "ways[i] counts the readings of the first i digits. ways[0] = 1: the empty string has exactly one reading, reading nothing, and every longer count is built on it."],
      ["range(1, n + 1)", "i <= n", "i is a prefix length, so it runs up to n itself. The i-th digit is s[i − 1]."],
      ["!= '0'", "!== '0'", "The last letter used one digit: any digit but 0 is a letter (1 = A … 9 = I), so each reading of the first i − 1 digits extends in exactly one way."],
      ["10 <= int(", "pair >= 10", "The last letter used two digits: only 10 … 26 are letters. Starting at 10 keeps out 01 … 09, which become the numbers 1 … 9 once read as a number."],
      ["return ways[n]", "return ways[n]", "ways[n] counts the readings of all n digits: the whole string."],
    ],
    math: [
      ["W(i)", "ways[i]", "ways[i]", "readings of the first i digits"],
      ["W(0) = 1", "ways = [1] + …", "const ways = [1, …]", "the empty prefix, read one way"],
      ["W(i − 1)", "ways[i - 1]", "ways[i - 1]", "added when digit i is a letter on its own"],
      ["W(i − 2)", "ways[i - 2]", "ways[i - 2]", "added when digits i − 1, i make 10 … 26"],
    ],
  },
  'obstacle-paths': {
    code: pair(`def solve(grid):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    p = [[0] * cols for _ in range(rows)]
    for c in range(cols):
        if grid[0][c] == 0:
            p[0][c] = 1 if c == 0 else p[0][c - 1]
    for r in range(1, rows):
        if grid[r][0] == 0:
            p[r][0] = p[r - 1][0]
    for r in range(1, rows):
        for c in range(1, cols):
            if grid[r][c] == 0:
                p[r][c] = p[r - 1][c] + p[r][c - 1]
    return p[rows - 1][cols - 1]
`, `function solve(grid) {
  if (grid.length === 0 || grid[0].length === 0) return 0
  const rows = grid.length, cols = grid[0].length
  const p = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let c = 0; c < cols; c++) {
    if (grid[0][c] === 0) p[0][c] = c === 0 ? 1 : p[0][c - 1]
  }
  for (let r = 1; r < rows; r++) {
    if (grid[r][0] === 0) p[r][0] = p[r - 1][0]
  }
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (grid[r][c] === 0) p[r][c] = p[r - 1][c] + p[r][c - 1]
    }
  }
  return p[rows - 1][cols - 1]
}
`),
    notes: [
      ["p = [[0] * cols for _", "const p = Array.from", "p[r][c] counts the paths to (r, c). Each row is a new list, and every cell starts at 0, which is already right for a blocked cell."],
      ["for c in range(cols)", "for (let c = 0; c < cols", "The top row first: a cell there can only be entered from its left."],
      ["p[0][c] = 1 if c == 0", "p[0][c] = c === 0", "The start has one path (stay put). Any other open top cell copies its left neighbour, so a block’s 0 is passed along the rest of the row."],
      ["p[r][0] = p[r - 1][0]", "p[r][0] = p[r - 1][0]", "The left column, the same way going down."],
      ["p[r][c] = p[r - 1][c] + p[r][c - 1]", "p[r][c] = p[r - 1][c] + p[r][c - 1]", "An open inner cell is entered from above or from the left. No path does both, so the two counts add."],
      ["return p[rows - 1][cols - 1]", "return p[rows - 1][cols - 1]", "The bottom-right cell."],
    ],
    math: [
      ["P(r, c)", "p[r][c]", "p[r][c]", "paths from the start to (r, c); 0 on a block"],
      ["P(r − 1, c) + P(r, c − 1)", "p[r - 1][c] + p[r][c - 1]", "p[r - 1][c] + p[r][c - 1]", "arrive from above, or from the left"],
    ],
  },
  'max-square': {
    code: pair(`def solve(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    side = [[0] * cols for _ in range(rows)]
    best = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                if r == 0 or c == 0:
                    side[r][c] = 1
                else:
                    side[r][c] = 1 + min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1])
                best = max(best, side[r][c])
    return best
`, `function solve(grid) {
  if (grid.length === 0) return 0
  const rows = grid.length, cols = grid[0].length
  const side = Array.from({ length: rows }, () => Array(cols).fill(0))
  let best = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) {
        if (r === 0 || c === 0) side[r][c] = 1
        else side[r][c] = 1 + Math.min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1])
        best = Math.max(best, side[r][c])
      }
    }
  }
  return best
}
`),
    notes: [
      ["side = [[0] * cols for _", "const side = Array.from", "side[r][c]: the side of the largest all-1 square whose bottom-right corner is (r, c). One new list per row; a 0 cell is never written and stays 0."],
      ["if grid[r][c] == 1", "if (grid[r][c] === 1)", "Only a 1 can be a square’s corner."],
      ["if r == 0 or c == 0", "if (r === 0 || c === 0)", "On the top row or left column there is no room above or to the left: at most a 1 × 1 square."],
      ["1 + min(", "1 + Math.min(", "A square of side s with its corner here needs squares of side s − 1 ending above, to the left and above-left. The smallest of the three limits it; the 1 adds this cell’s own row and column."],
      ["best = max(best", "best = Math.max(best", "The largest square can have its corner anywhere, so keep the best seen."],
    ],
    math: [
      ["S(r, c)", "side[r][c]", "side[r][c]", "largest square with its bottom-right corner at (r, c)"],
      ["1 + min(S(r − 1, c), S(r, c − 1), S(r − 1, c − 1))", "1 + min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1])", "1 + Math.min(side[r - 1][c], side[r][c - 1], side[r - 1][c - 1])", "grow the smallest of the three neighbouring squares by one"],
    ],
  },
  'zero-one-knapsack': {
    code: pair(`def solve(weights, values, capacity):
    best = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c], best[c - w] + v)
    return best[capacity]
`, `function solve(weights, values, capacity) {
  const best = Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i], v = values[i]
    for (let c = capacity; c >= w; c--) {
      best[c] = Math.max(best[c], best[c - w] + v)
    }
  }
  return best[capacity]
}
`),
    notes: [
      ["best = [0] * (capacity + 1)", "const best = Array(capacity + 1).fill(0)", "best[c]: the most value within capacity c using the items seen so far. One row, reused for every item, instead of an items × capacity table."],
      ["for w, v in zip", "const w = weights[i]", "One item at a time, weight w and value v."],
      ["range(capacity, w - 1, -1)", "c = capacity; c >= w; c--", "Downwards, and only where the item fits. Going down, best[c − w] is read before this item changes it, so it still describes the earlier items only: the item is taken at most once."],
      ["best[c] = max(", "best[c] = Math.max(", "Leave the item (best[c] as it was) or take it (its value on top of the best with w less room)."],
      ["return best[capacity]", "return best[capacity]", "Every item considered, at full capacity."],
    ],
    math: [
      ["K(i, c)", "best[c] after item i", "best[c] after item i", "most value from the first i items within capacity c"],
      ["wᵢ, vᵢ", "w, v", "w = weights[i], v = values[i]", "item i’s weight and value"],
      ["max(K(i − 1, c), vᵢ + K(i − 1, c − wᵢ))", "max(best[c], best[c - w] + v)", "Math.max(best[c], best[c - w] + v)", "leave item i, or take it"],
    ],
  },
  'bounded-knapsack': {
    code: pair(`def solve(weights, values, counts, capacity):
    best = [0] * (capacity + 1)
    for w, v, k in zip(weights, values, counts):
        old = best[:]
        for c in range(capacity + 1):
            for q in range(1, k + 1):
                if q * w <= c:
                    best[c] = max(best[c], old[c - q * w] + q * v)
    return best[capacity]
`, `function solve(weights, values, counts, capacity) {
  const best = Array(capacity + 1).fill(0)
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i], v = values[i], k = counts[i]
    const old = [...best]
    for (let c = 0; c <= capacity; c++) {
      for (let q = 1; q <= k; q++) {
        if (q * w <= c) best[c] = Math.max(best[c], old[c - q * w] + q * v)
      }
    }
  }
  return best[capacity]
}
`),
    notes: [
      ["best = [0] * (capacity + 1)", "const best = Array(capacity + 1).fill(0)", "best[c]: the most value within capacity c from the items so far."],
      ["old = best[:]", "const old = [...best]", "A copy of the table from before this item. Every option reads old, so the only copies of this item counted are the q being tried."],
      ["range(1, k + 1)", "q <= k", "Try 1 to k copies, k being the stock. Zero copies is best[c] as it already stands."],
      ["if q * w <= c", "if (q * w <= c)", "q copies weigh q·w and must fit."],
      ["old[c - q * w] + q * v", "old[c - q * w] + q * v", "q copies, on top of the best without this item in the room that is left."],
      ["return best[capacity]", "return best[capacity]", "Every item considered."],
    ],
    math: [
      ["K(i, c)", "best[c] after item i", "best[c] after item i", "most value from the first i items within c"],
      ["K(i − 1, ·)", "old", "old", "the table before item i"],
      ["max over q ≤ kᵢ of K(i − 1, c − q·wᵢ) + q·vᵢ", "max(best[c], old[c - q * w] + q * v)", "Math.max(best[c], old[c - q * w] + q * v)", "how many copies of item i to take"],
    ],
  },
  'subset-sum': {
    code: pair(`def solve(values, target):
    memo = {}

    def can(i, left):
        if left == 0:
            return True
        if i == len(values) or left < 0:
            return False
        key = (i, left)
        if key not in memo:
            memo[key] = can(i + 1, left - values[i]) or can(i + 1, left)
        return memo[key]

    return can(0, target)
`, `function solve(values, target) {
  const memo = new Map()
  function can(i, left) {
    if (left === 0) return true
    if (i === values.length || left < 0) return false
    const key = i + ',' + left
    if (!memo.has(key)) {
      memo.set(key, can(i + 1, left - values[i]) || can(i + 1, left))
    }
    return memo.get(key)
  }
  return can(0, target)
}
`),
    notes: [
      ["memo = {}", "const memo = new Map()", "Answers already worked out, so each (i, left) is solved once."],
      ["def can(i, left)", "function can(i, left)", "can(i, left): can some of values[i], values[i + 1], … add up to exactly left?"],
      ["if left == 0", "if (left === 0)", "Nothing left to make: choosing nothing more works."],
      ["left < 0", "left < 0", "No values left while something is still to make, or overshot: impossible."],
      ["key = (i, left)", "const key = i", "The answer depends on both arguments, so the key holds both."],
      ["can(i + 1, left - values[i]) or", "can(i + 1, left - values[i]) ||", "Take values[i] (less is left to make) or skip it. Both go on at i + 1, so each value is used at most once."],
      ["return can(0, target)", "return can(0, target)", "From the first value, the whole target."],
    ],
    math: [
      ["S(i, t)", "can(i, left)", "can(i, left)", "some of values i, i + 1, … make exactly t"],
      ["S(i + 1, t − aᵢ) or S(i + 1, t)", "can(i + 1, left - values[i]) or can(i + 1, left)", "can(i + 1, left - values[i]) || can(i + 1, left)", "take value i, or skip it"],
    ],
  },
  'coin-min': {
    code: pair(`def solve(coins, amount):
    impossible = float('inf')
    best = [0] + [impossible] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                best[a] = min(best[a], best[a - c] + 1)
    return -1 if best[amount] == impossible else best[amount]
`, `function solve(coins, amount) {
  const best = [0, ...Array(amount).fill(Infinity)]
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1)
    }
  }
  return best[amount] === Infinity ? -1 : best[amount]
}
`),
    notes: [
      ["best = [0] + [impossible] * amount", "const best = [0, ...Array(amount).fill(Infinity)]", "best[a]: the fewest coins making a. 0 coins make 0; every other amount starts at infinity, “not made yet”, which loses to any real count in a min."],
      ["range(1, amount + 1)", "let a = 1", "Amounts upward: best[a − c] is a smaller amount, so it is already final."],
      ["if c <= a", "if (c <= a)", "A coin bigger than the amount can’t be its last coin."],
      ["best[a] = min(", "best[a] = Math.min(", "If the last coin is c: the fewest for what is left, plus this coin. Coins are unlimited, so best[a − c] may use c again, which is allowed."],
      ["return -1 if", "return best[amount] === Infinity", "Still infinity means no combination reaches the amount."],
    ],
    math: [
      ["M(a)", "best[a]", "best[a]", "fewest coins making a; ∞ if impossible"],
      ["min over c ≤ a of M(a − c) + 1", "min(best[a], best[a - c] + 1)", "Math.min(best[a], best[a - c] + 1)", "the last coin is c"],
    ],
  },
  'coin-combinations': {
    code: pair(`def solve(coins, amount):
    ways = [1] + [0] * amount
    for c in coins:
        for a in range(c, amount + 1):
            ways[a] += ways[a - c]
    return ways[amount]
`, `function solve(coins, amount) {
  const ways = [1, ...Array(amount).fill(0)]
  for (const c of coins) {
    for (let a = c; a <= amount; a++) {
      ways[a] += ways[a - c]
    }
  }
  return ways[amount]
}
`),
    notes: [
      ["ways = [1]", "const ways = [1", "ways[a]: collections making a. Amount 0 has one: no coins."],
      ["for c in coins", "for (const c of coins)", "Coins on the outside: each coin value is added in its turn, so every collection is built in the order of the coin list, and counted once."],
      ["range(c, amount + 1)", "let a = c", "Upward from c: ways[a − c] already counts collections using c, so c can be used again and again."],
      ["ways[a] += ways[a - c]", "ways[a] += ways[a - c]", "The collections of a that use one more c: one for each collection of a − c so far."],
    ],
    math: [
      ["W(a)", "ways[a]", "ways[a]", "collections making a, from the coins so far"],
      ["W(a) + W(a − c)", "ways[a] += ways[a - c]", "ways[a] += ways[a - c]", "without another c, or with one more"],
    ],
  },
  'integer-partitions': {
    code: pair(`def solve(n):
    ways = [1] + [0] * n
    for part in range(1, n + 1):
        for total in range(part, n + 1):
            ways[total] += ways[total - part]
    return ways[n]
`, `function solve(n) {
  const ways = [1, ...Array(n).fill(0)]
  for (let part = 1; part <= n; part++) {
    for (let total = part; total <= n; total++) {
      ways[total] += ways[total - part]
    }
  }
  return ways[n]
}
`),
    notes: [
      ["ways = [1]", "const ways = [1", "ways[t]: the ways to write t as a sum of the part sizes so far, order ignored. 0 is the empty sum, once."],
      ["range(1, n + 1)", "part <= n", "Every part size from 1 to n itself: n alone is a partition of n."],
      ["range(part, n + 1)", "let total = part", "Totals upward, so a part size may be used many times (like coins)."],
      ["ways[total] += ways[total - part]", "ways[total] += ways[total - part]", "One more part of this size, on top of a partition of total − part."],
    ],
    math: [
      ["p(t)", "ways[total]", "ways[total]", "partitions of the total t into the part sizes so far"],
      ["p(t) + p(t − k)", "ways[total] += ways[total - part]", "ways[total] += ways[total - part]", "without another part k, or with one more"],
    ],
  },
  derangements: {
    code: pair(`def solve(n):
    d = [0] * (n + 2)
    d[0] = 1
    d[1] = 0
    for m in range(2, n + 1):
        d[m] = (m - 1) * (d[m - 1] + d[m - 2])
    return d[n]
`, `function solve(n) {
  const d = Array(n + 2).fill(0)
  d[0] = 1
  d[1] = 0
  for (let m = 2; m <= n; m++) {
    d[m] = (m - 1) * (d[m - 1] + d[m - 2])
  }
  return d[n]
}
`),
    notes: [
      ["d = [0] * (n + 2)", "const d = Array(n + 2).fill(0)", "n + 2 cells, so d[1] exists even when n = 0."],
      ["d[0] = 1", "d[0] = 1", "D(0) = 1: no letters, one arrangement (the empty one), and in it no letter is in its own envelope."],
      ["d[1] = 0", "d[1] = 0", "D(1) = 0: one letter has only its own envelope."],
      ["d[m] = (m - 1) * (d[m - 1] + d[m - 2])", "d[m] = (m - 1) * (d[m - 1] + d[m - 2])", "Letter 1 goes into one of the m − 1 other envelopes, say j’s. If letter j goes into envelope 1, the other m − 2 letters are deranged: D(m − 2). If not, envelope 1 acts as letter j’s forbidden one, and m − 1 letters are deranged: D(m − 1)."],
      ["return d[n]", "return d[n]", "d[n] is D(n). The table was built up to it from the two starting values."],
    ],
    math: [
      ["D(m)", "d[m]", "d[m]", "arrangements of m letters with none in its own envelope"],
      ["(m − 1)(D(m − 1) + D(m − 2))", "(m - 1) * (d[m - 1] + d[m - 2])", "(m - 1) * (d[m - 1] + d[m - 2])", "where letter 1 goes, then whether its swap partner comes back"],
    ],
  },
  stairs: {
    code: pair(`def solve(n, steps):
    ways = [1] + [0] * n
    for h in range(1, n + 1):
        for s in steps:
            if s <= h:
                ways[h] += ways[h - s]
    return ways[n]
`, `function solve(n, steps) {
  const ways = [1, ...Array(n).fill(0)]
  for (let h = 1; h <= n; h++) {
    for (const s of steps) {
      if (s <= h) ways[h] += ways[h - s]
    }
  }
  return ways[n]
}
`),
    notes: [
      ["ways = [1]", "const ways = [1", "ways[h]: the ordered step sequences that land exactly on stair h. ways[0] = 1: standing at the bottom is one sequence, the empty one, and every count is built on it."],
      ["range(1, n + 1)", "h <= n", "Heights upward, so every ways[h − s] is a lower stair, already final."],
      ["for s in steps", "for (const s of steps)", "Sort the sequences reaching h by their last step s. Different last steps make different sequences, so the groups add without overlap."],
      ["if s <= h", "if (s <= h)", "A step longer than h would have to start below the ground."],
      ["ways[h] += ways[h - s]", "ways[h] += ways[h - s]", "Sequences whose last step is s: one for each sequence reaching h − s, with s added on."],
    ],
    math: [
      ["W(h)", "ways[h]", "ways[h]", "step sequences landing exactly on stair h"],
      ["W(0) = 1", "ways = [1]", "const ways = [1", "the empty sequence"],
      ["sum over steps s ≤ h of W(h − s)", "ways[h] += ways[h - s]", "ways[h] += ways[h - s]", "group by the last step s"],
    ],
  },
  'min-cost-stairs': {
    code: pair(`def solve(costs):
    n = len(costs)
    if n == 0:
        return 0
    best = [0] * n
    for i in range(n):
        one_back = best[i - 1] if i >= 1 else 0
        two_back = best[i - 2] if i >= 2 else 0
        best[i] = costs[i] + (one_back if i == 0 else min(one_back, two_back))
    return best[n - 1]
`, `function solve(costs) {
  const n = costs.length
  if (n === 0) return 0
  const best = Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    const oneBack = i >= 1 ? best[i - 1] : 0
    const twoBack = i >= 2 ? best[i - 2] : 0
    best[i] = costs[i] + (i === 0 ? oneBack : Math.min(oneBack, twoBack))
  }
  return best[n - 1]
}
`),
    notes: [
      ["best = [0] * n", "const best = Array(n).fill(0)", "best[i]: the cheapest total cost of standing on stair i, its own cost included."],
      ["one_back = ", "const oneBack", "A move onto stair i came one stair up, from i − 1. For stair 0 that is from the start, which costs nothing."],
      ["two_back = ", "const twoBack", "Or two stairs up, from i − 2. For stair 1, two up from the start, so again 0."],
      ["best[i] = costs[i] +", "best[i] = costs[i] +", "Stair i’s own cost, plus the cheaper of the two places the move came from. Stair 0 can only be reached from the start."],
      ["return best[n - 1]", "return best[n - 1]", "You must finish standing on the last stair, so its cell is the answer."],
    ],
    math: [
      ["C(i)", "best[i]", "best[i]", "cheapest total standing on stair i"],
      ["C(−1) = C(−2) = 0", "else 0", ": 0", "the start, before the first stair"],
      ["cᵢ + min(C(i − 1), C(i − 2))", "min(one_back, two_back)", "Math.min(oneBack, twoBack)", "this stair’s cost after the cheaper way up"],
    ],
  },
  'circular-selection': {
    code: pair(`def solve(values):
    def line(houses):
        prev, cur = 0, 0
        for v in houses:
            prev, cur = cur, max(cur, prev + v)
        return cur

    if len(values) == 0:
        return 0
    if len(values) == 1:
        return values[0]
    return max(line(values[1:]), line(values[:-1]))
`, `function solve(values) {
  function line(houses) {
    let prev = 0, cur = 0
    for (const v of houses) {
      [prev, cur] = [cur, Math.max(cur, prev + v)]
    }
    return cur
  }
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]
  return Math.max(line(values.slice(1)), line(values.slice(0, -1)))
}
`),
    notes: [
      ["def line(houses)", "function line(houses)", "The straight street from the house-robber lesson: the best from houses in a line, no two neighbours."],
      ["prev, cur = 0, 0", "let prev = 0, cur = 0", "cur: the best up to the house just seen; prev: the best up to the one before. Only those two are ever read, so no table is kept."],
      ["prev, cur = cur, max(", "[prev, cur] = [cur, Math.max(", "Skip v (cur stands) or take it (v on top of prev, two houses back). Both new values are made from the old pair."],
      ["if len(values) == 1", "if (values.length === 1)", "With one house, leaving out an end would leave out everything, so it is answered first."],
      ["line(values[1:])", "line(values.slice(1))", "In a circle the first and last houses are neighbours, so every allowed choice leaves out at least one of them. Without the first, or without the last: each is a straight street, and the better one is the answer."],
    ],
    math: [
      ["R(street)", "line(houses)", "line(houses)", "best on a straight street"],
      ["max(R(a₁ … aₙ₋₁), R(a₀ … aₙ₋₂))", "max(line(values[1:]), line(values[:-1]))", "Math.max(line(values.slice(1)), line(values.slice(0, -1)))", "leave out the first house, or the last"],
    ],
  },
  'activity-selection': {
    code: pair(`def solve(rewards):
    if not rewards:
        return 0
    best = list(rewards[0])
    for day in rewards[1:]:
        nxt = []
        for a, reward in enumerate(day):
            yesterday = max(best[b] for b in range(len(best)) if b != a)
            nxt.append(reward + yesterday)
        best = nxt
    return max(best)
`, `function solve(rewards) {
  if (rewards.length === 0) return 0
  let best = [...rewards[0]]
  for (const day of rewards.slice(1)) {
    const next = []
    day.forEach((reward, a) => {
      const yesterday = Math.max(...best.filter((_, b) => b !== a))
      next.push(reward + yesterday)
    })
    best = next
  }
  return Math.max(...best)
}
`),
    notes: [
      ["best = list(rewards[0])", "let best = [...rewards[0]]", "best[a]: the most earned so far with activity a done today. All that matters about the past is what was done last, so one number per activity is enough. On the first day it is that day’s reward."],
      ["for day in rewards[1:]", "for (const day of", "Each later day builds a new row from yesterday’s."],
      ["yesterday = max(", "const yesterday = Math.max(", "Doing a today, yesterday’s activity was any b except a: take the best of those."],
      ["nxt.append(reward + yesterday)", "next.push(reward + yesterday)", "Today’s reward on top of it. Rewards can be negative and a day can’t be skipped, so this may lower the total."],
      ["return max(best)", "return Math.max(...best)", "The last day may end on any activity."],
    ],
    math: [
      ["B(d, a)", "best after day d, at index a", "best after day d, at index a", "most earned by day d, doing activity a on day d"],
      ["r(d, a) + max over b ≠ a of B(d − 1, b)", "reward + yesterday", "reward + yesterday", "today’s reward, after a different activity yesterday"],
    ],
  },
  'max-subarray': {
    code: pair(`def solve(values):
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
`, `function solve(values) {
  if (values.length === 0) return [0, -1, -1]
  let endSum = values[0], start = 0
  let best = [values[0], 0, 0]
  for (let i = 1; i < values.length; i++) {
    if (endSum >= 0) {
      endSum += values[i]
    } else {
      endSum = values[i]
      start = i
    }
    if (endSum > best[0]) best = [endSum, start, i]
  }
  return best
}
`),
    notes: [
      ["end_sum, start = values[0], 0", "let endSum = values[0], start = 0", "end_sum is E(i): the best sum of a run that ends exactly at position i; start is where that run begins."],
      ["best = [values[0], 0, 0]", "let best = [values[0], 0, 0]", "The best run seen anywhere so far, as [sum, first index, last index]."],
      ["if end_sum >= 0", "if (endSum >= 0)", "A run ending at i either extends the run ending at i − 1 or starts afresh at i. Extending helps unless that run is negative. On exactly 0 it extends, keeping the earlier start, as the tie rule asks."],
      ["end_sum, start = values[i], i", "endSum = values[i]", "Start afresh: a negative run before i could only lower the sum."],
      ["if end_sum > best[0]", "if (endSum > best[0])", "Strictly greater: an equal sum found later starts later or is longer, so the earlier one stays."],
    ],
    math: [
      ["E(i)", "end_sum", "endSum", "best sum of a run ending exactly at i"],
      ["max(E(i − 1) + aᵢ, aᵢ)", "end_sum += values[i]", "endSum += values[i]", "extend the run, or start again at i"],
      ["max over i of E(i)", "best", "best", "the best run, wherever it ends"],
    ],
  },
  'max-product': {
    code: pair(`def solve(values):
    hi = lo = best = values[0]
    for v in values[1:]:
        candidates = (v, hi * v, lo * v)
        hi, lo = max(candidates), min(candidates)
        best = max(best, hi)
    return best
`, `function solve(values) {
  let hi = values[0], lo = values[0], best = values[0]
  for (const v of values.slice(1)) {
    const candidates = [v, hi * v, lo * v]
    hi = Math.max(...candidates)
    lo = Math.min(...candidates)
    best = Math.max(best, hi)
  }
  return best
}
`),
    notes: [
      ["hi = lo = best = values[0]", "let hi = values[0]", "hi and lo: the largest and smallest products of a run ending at the current position. Both are kept because multiplying by a negative number turns the smallest into the largest."],
      ["candidates = (v, hi * v, lo * v)", "const candidates = [v, hi * v, lo * v]", "A run ending at v is v alone, or extends the run before it: times the largest product, or times the smallest (which wins when v is negative)."],
      ["hi, lo = max(candidates), min(candidates)", "hi = Math.max(...candidates)", "Both new values come from the same three candidates, made from the old hi and lo."],
      ["best = max(best, hi)", "best = Math.max(best, hi)", "The best run may end anywhere, so keep the best hi seen."],
    ],
    math: [
      ["H(i)", "hi", "hi", "largest product of a run ending at i"],
      ["L(i)", "lo", "lo", "smallest product of a run ending at i"],
      ["max(aᵢ, H(i − 1)·aᵢ, L(i − 1)·aᵢ)", "max(candidates)", "Math.max(...candidates)", "the new largest; min of the same three is the new smallest"],
    ],
  },
  'word-break': {
    code: pair(`def solve(s, words):
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for w in words:
            if len(w) <= i and ok[i - len(w)] and s[i - len(w):i] == w:
                ok[i] = True
                break
    return ok[len(s)]
`, `function solve(s, words) {
  const ok = [true, ...Array(s.length).fill(false)]
  for (let i = 1; i <= s.length; i++) {
    for (const w of words) {
      if (w.length <= i && ok[i - w.length] && s.slice(i - w.length, i) === w) {
        ok[i] = true
        break
      }
    }
  }
  return ok[s.length]
}
`),
    notes: [
      ["ok = [True]", "const ok = [true", "ok[i]: can the first i letters be cut into words? ok[0] is true: the empty prefix needs no cuts."],
      ["for w in words", "for (const w of words)", "Every cutting has a last word, so try each word as the last one."],
      ["ok[i - len(w)] and", "ok[i - w.length] &&", "w can be the last word if the letters before it can be cut, and the last letters really are w."],
      ["break", "break", "One way is enough: the question is yes or no."],
      ["return ok[len(s)]", "return ok[s.length]", "ok for all the letters answers the question for the whole text."],
    ],
    math: [
      ["B(i)", "ok[i]", "ok[i]", "the first i letters can be cut into words"],
      ["B(i − |w|) and s[i − |w| … i) = w", "ok[i - len(w)] and s[i - len(w):i] == w", "ok[i - w.length] && s.slice(i - w.length, i) === w", "w is the last word"],
    ],
  },
  'word-break-count': {
    code: pair(`def solve(s, words):
    count = [1] + [0] * len(s)
    for i in range(1, len(s) + 1):
        for w in words:
            if len(w) <= i and s[i - len(w):i] == w:
                count[i] += count[i - len(w)]
    return count[len(s)]
`, `function solve(s, words) {
  const count = [1, ...Array(s.length).fill(0)]
  for (let i = 1; i <= s.length; i++) {
    for (const w of words) {
      if (w.length <= i && s.slice(i - w.length, i) === w) count[i] += count[i - w.length]
    }
  }
  return count[s.length]
}
`),
    notes: [
      ["count = [1]", "const count = [1", "count[i]: the number of ways to cut the first i letters into words. The empty prefix has one cutting, with no words."],
      ["for w in words", "for (const w of words)", "Group the cuttings by their last word. Different last words make different cuttings, so the groups add."],
      ["s[i - len(w):i] == w", "s.slice(i - w.length, i) === w", "w can only be the last word if the last letters are exactly w."],
      ["count[i] += count[i - len(w)]", "count[i] += count[i - w.length]", "Each cutting of the letters before w, with w added, is one cutting of the first i."],
      ["return count[len(s)]", "return count[s.length]", "Every cutting of the whole text."],
    ],
    math: [
      ["C(i)", "count[i]", "count[i]", "cuttings of the first i letters into words"],
      ["sum over words w ending at i of C(i − |w|)", "count[i] += count[i - len(w)]", "count[i] += count[i - w.length]", "group by the last word"],
    ],
  },
  'grid-paths': {
    code: pair(`def solve(rows, cols):
    if rows == 0 or cols == 0:
        return 0
    paths = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                paths[r][c] = 1
                continue
            from_above = paths[r - 1][c] if r > 0 else 0
            from_left = paths[r][c - 1] if c > 0 else 0
            from_diagonal = paths[r - 1][c - 1] if r > 0 and c > 0 else 0
            paths[r][c] = from_above + from_left + from_diagonal
    return paths[rows - 1][cols - 1]
`, `function solve(rows, cols) {
  if (rows === 0 || cols === 0) return 0
  const paths = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) {
        paths[r][c] = 1
        continue
      }
      const fromAbove = r > 0 ? paths[r - 1][c] : 0
      const fromLeft = c > 0 ? paths[r][c - 1] : 0
      const fromDiagonal = r > 0 && c > 0 ? paths[r - 1][c - 1] : 0
      paths[r][c] = fromAbove + fromLeft + fromDiagonal
    }
  }
  return paths[rows - 1][cols - 1]
}
`),
    notes: [
      ["paths = [[0] * cols for _", "const paths = Array.from", "paths[r][c] counts the routes from the top-left corner to (r, c). One new list per row."],
      ["for r in range(rows)", "for (let r = 0", "Row by row, left to right: the cells above, to the left and diagonally above-left are filled before (r, c) reads them."],
      ["paths[r][c] = 1", "paths[r][c] = 1", "The start: one route, standing still."],
      ["from_above = ", "const fromAbove", "A route into (r, c) made its last move down, from the cell above …"],
      ["from_left = ", "const fromLeft", "… or right, from the cell to the left …"],
      ["from_diagonal = ", "const fromDiagonal", "… or diagonally, from above-left (this challenge allows a diagonal move; the lesson’s table uses only the first two). An edge cell has no neighbour on that side: 0."],
      ["paths[r][c] = from_above + from_left + from_diagonal", "paths[r][c] = fromAbove + fromLeft + fromDiagonal", "The last moves differ, so no route is counted twice: the three counts add."],
    ],
    math: [
      ["P(r, c)", "paths[r][c]", "paths[r][c]", "routes from the start to (r, c)"],
      ["P(r − 1, c) + P(r, c − 1) + P(r − 1, c − 1)", "from_above + from_left + from_diagonal", "fromAbove + fromLeft + fromDiagonal", "group the routes by their last move"],
    ],
  },
  'min-grid-path': {
    code: pair(`def solve(grid):
    if not grid or not grid[0]:
        return [0, 0]
    rows, cols = len(grid), len(grid[0])
    best = [[None] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if r == 0 and c == 0:
                best[r][c] = [grid[0][0], 1]
                continue
            came = []
            if r > 0:
                came.append(best[r - 1][c])
            if c > 0:
                came.append(best[r][c - 1])
            low = min(cost for cost, _ in came)
            count = sum(n for cost, n in came if cost == low)
            best[r][c] = [low + grid[r][c], count]
    return best[rows - 1][cols - 1]
`, `function solve(grid) {
  if (grid.length === 0 || grid[0].length === 0) return [0, 0]
  const rows = grid.length, cols = grid[0].length
  const best = Array.from({ length: rows }, () => Array(cols).fill(null))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) {
        best[r][c] = [grid[0][0], 1]
        continue
      }
      const came = []
      if (r > 0) came.push(best[r - 1][c])
      if (c > 0) came.push(best[r][c - 1])
      const low = Math.min(...came.map(([cost]) => cost))
      const count = came.filter(([cost]) => cost === low).reduce((sum, [, n]) => sum + n, 0)
      best[r][c] = [low + grid[r][c], count]
    }
  }
  return best[rows - 1][cols - 1]
}
`),
    notes: [
      ["best = [[None] * cols for _", "const best = Array.from", "best[r][c] holds two numbers: the cheapest cost of reaching (r, c), and how many paths have that cost."],
      ["best[r][c] = [grid[0][0], 1]", "best[r][c] = [grid[0][0], 1]", "The start: you pay its cost, and there is one way to be there."],
      ["came = []", "const came = []", "The neighbours a path can arrive from: above and to the left (an edge cell has only one)."],
      ["low = min(", "const low = Math.min(", "The cheapest way in is through the cheaper neighbour."],
      ["count = sum(", "const count = came.filter", "Only paths through a neighbour at the lowest cost are cheapest here. If both neighbours tie, both sets of paths count."],
      ["best[r][c] = [low + grid[r][c], count]", "best[r][c] = [low + grid[r][c], count]", "Add this cell’s own cost; the number of cheapest paths carries over."],
    ],
    math: [
      ["(M(r, c), N(r, c))", "best[r][c]", "best[r][c]", "the cheapest cost to (r, c), and how many paths have it"],
      ["N = sum of N over the neighbours at the lowest cost", "count", "count", "ties add their paths"],
      ["g(r, c) + min(M(r − 1, c), M(r, c − 1))", "low + grid[r][c]", "low + grid[r][c]", "this cell after the cheaper neighbour"],
    ],
  },
  'triangle-path': {
    code: pair(`def solve(triangle):
    if not triangle:
        return 0
    below = list(triangle[-1])
    for row in reversed(triangle[:-1]):
        below = [v + min(below[i], below[i + 1]) for i, v in enumerate(row)]
    return below[0]
`, `function solve(triangle) {
  if (triangle.length === 0) return 0
  let below = [...triangle[triangle.length - 1]]
  for (let r = triangle.length - 2; r >= 0; r--) {
    below = triangle[r].map((v, i) => v + Math.min(below[i], below[i + 1]))
  }
  return below[0]
}
`),
    notes: [
      ["below = list(triangle[-1])", "let below = [...triangle[triangle.length - 1]]", "Work from the bottom up. below[i]: the cheapest path from position i of the row below down to the bottom. On the bottom row that is just the number itself."],
      ["for row in reversed(", "for (let r = triangle.length - 2", "Each row upward. Going up means every position has exactly two children below, at i and i + 1, so no edge cases."],
      ["v + min(below[i], below[i + 1])", "v + Math.min(below[i], below[i + 1])", "From position i you step to i or i + 1 below; take the cheaper of their best paths and add your own number."],
      ["return below[0]", "return below[0]", "The top row has one position: its cheapest path to the bottom."],
    ],
    math: [
      ["T(r, i)", "below[i] for row r", "below[i] for row r", "cheapest path from (r, i) to the bottom"],
      ["t(r, i) + min(T(r + 1, i), T(r + 1, i + 1))", "v + min(below[i], below[i + 1])", "v + Math.min(below[i], below[i + 1])", "step down-left or down-right"],
    ],
  },
  'grid-resources': {
    code: pair(`def solve(grid, budget):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    ways = [[[0] * (budget + 1) for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            cost = grid[r][c]
            for b in range(cost, budget + 1):
                if r == 0 and c == 0:
                    ways[r][c][b] = 1 if b == cost else 0
                else:
                    above = ways[r - 1][c][b - cost] if r > 0 else 0
                    left = ways[r][c - 1][b - cost] if c > 0 else 0
                    ways[r][c][b] = above + left
    return sum(ways[rows - 1][cols - 1])
`, `function solve(grid, budget) {
  if (grid.length === 0 || grid[0].length === 0) return 0
  const rows = grid.length, cols = grid[0].length
  const ways = Array.from({ length: rows }, () => Array.from({ length: cols }, () => Array(budget + 1).fill(0)))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cost = grid[r][c]
      for (let b = cost; b <= budget; b++) {
        if (r === 0 && c === 0) {
          ways[r][c][b] = b === cost ? 1 : 0
        } else {
          const above = r > 0 ? ways[r - 1][c][b - cost] : 0
          const left = c > 0 ? ways[r][c - 1][b - cost] : 0
          ways[r][c][b] = above + left
        }
      }
    }
  }
  return ways[rows - 1][cols - 1].reduce((sum, n) => sum + n, 0)
}
`),
    notes: [
      ["ways = [[[0] * (budget + 1)", "const ways = Array.from", "ways[r][c][b]: paths to (r, c) that have spent exactly b. The amount spent is part of the state, because two paths reaching the same cell with different spending have different futures."],
      ["for b in range(cost, budget + 1)", "for (let b = cost; b <= budget", "Only totals of at least this cell’s cost can include it; anything above the budget is never needed."],
      ["ways[r][c][b] = 1 if b == cost", "ways[r][c][b] = b === cost", "The start: one path, having spent exactly its cost."],
      ["above = ", "const above", "Arriving from above, the path had spent b − cost before paying for this cell …"],
      ["left = ", "const left", "… and the same from the left."],
      ["return sum(", "return ways[rows - 1][cols - 1].reduce", "Every path to the corner that spent at most the budget: add up all the totals."],
    ],
    math: [
      ["W(r, c, b)", "ways[r][c][b]", "ways[r][c][b]", "paths to (r, c) spending exactly b"],
      ["W(r − 1, c, b − g) + W(r, c − 1, b − g)", "above + left", "above + left", "arrive from above or the left, g = this cell’s cost"],
      ["sum over b ≤ B of W(last, last, b)", "sum(ways[rows - 1][cols - 1])", "ways[rows - 1][cols - 1].reduce", "all paths within the budget"],
    ],
  },
  'grid-direction': {
    code: pair(`def solve(grid, turn):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    if rows == 1 and cols == 1:
        return 0
    inf = float('inf')
    best = [[[inf, inf] for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            for d, (pr, pc) in enumerate(((r - 1, c), (r, c - 1))):
                if pr < 0 or pc < 0:
                    continue
                if pr == 0 and pc == 0:
                    before = 0
                else:
                    straight = best[pr][pc][d]
                    turned = best[pr][pc][1 - d] + turn
                    before = min(straight, turned)
                best[r][c][d] = before + grid[r][c]
    return min(best[rows - 1][cols - 1])
`, `function solve(grid, turn) {
  if (grid.length === 0 || grid[0].length === 0) return 0
  const rows = grid.length, cols = grid[0].length
  if (rows === 1 && cols === 1) return 0
  const best = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [Infinity, Infinity]))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const from = [[r - 1, c], [r, c - 1]]
      for (let d = 0; d < 2; d++) {
        const [pr, pc] = from[d]
        if (pr < 0 || pc < 0) continue
        let before = 0
        if (pr > 0 || pc > 0) {
          const straight = best[pr][pc][d]
          const turned = best[pr][pc][1 - d] + turn
          before = Math.min(straight, turned)
        }
        best[r][c][d] = before + grid[r][c]
      }
    }
  }
  return Math.min(...best[rows - 1][cols - 1])
}
`),
    notes: [
      ["best = [[[inf, inf]", "const best = Array.from", "best[r][c][d]: the cheapest cost of arriving at (r, c) with the last move in direction d (0 = down, 1 = right). The direction is part of the state: whether the next move turns depends on it."],
      ["enumerate(((r - 1, c), (r, c - 1)))", "const from = [[r - 1, c], [r, c - 1]]", "Arriving moving down means coming from above; moving right, from the left."],
      ["if pr == 0 and pc == 0", "let before = 0", "The first move leaves the start, which has no direction yet: no turn fee, and the start itself costs nothing."],
      ["straight = best[pr][pc][d]", "const straight = best[pr][pc][d]", "Arrived at the previous cell moving the same way: no turn."],
      ["turned = best[pr][pc][1 - d] + turn", "const turned = best[pr][pc][1 - d] + turn", "Arrived the other way: changing direction now pays the turn fee."],
      ["best[r][c][d] = before + grid[r][c]", "best[r][c][d] = before + grid[r][c]", "Then pay this cell’s cost."],
      ["return min(best[rows - 1][cols - 1])", "return Math.min(...best[rows - 1][cols - 1])", "The corner may be reached moving either way."],
    ],
    math: [
      ["C(r, c, d)", "best[r][c][d]", "best[r][c][d]", "cheapest arrival at (r, c) moving in direction d"],
      ["g(r, c) + min(C(prev, d), C(prev, other) + t)", "before + grid[r][c]", "before + grid[r][c]", "go straight, or turn and pay t"],
    ],
  },
  'grid-multiagent': {
    code: pair(`def solve(grid):
    if not grid or not grid[0]:
        return 0
    rows, cols = len(grid), len(grid[0])
    below = None
    for r in range(rows - 1, -1, -1):
        here = [[0] * cols for _ in range(cols)]
        for a in range(cols):
            for b in range(cols):
                collected = grid[r][a] if a == b else grid[r][a] + grid[r][b]
                if below is None:
                    here[a][b] = collected
                    continue
                best_next = max(below[x][y]
                                for x in (a - 1, a, a + 1)
                                for y in (b - 1, b, b + 1)
                                if 0 <= x < cols and 0 <= y < cols)
                here[a][b] = collected + best_next
        below = here
    return below[0][cols - 1]
`, `function solve(grid) {
  if (grid.length === 0 || grid[0].length === 0) return 0
  const rows = grid.length, cols = grid[0].length
  let below = null
  for (let r = rows - 1; r >= 0; r--) {
    const here = Array.from({ length: cols }, () => Array(cols).fill(0))
    for (let a = 0; a < cols; a++) {
      for (let b = 0; b < cols; b++) {
        const collected = a === b ? grid[r][a] : grid[r][a] + grid[r][b]
        if (below === null) {
          here[a][b] = collected
          continue
        }
        let bestNext = -Infinity
        for (const x of [a - 1, a, a + 1]) {
          for (const y of [b - 1, b, b + 1]) {
            if (x >= 0 && x < cols && y >= 0 && y < cols) bestNext = Math.max(bestNext, below[x][y])
          }
        }
        here[a][b] = collected + bestNext
      }
    }
    below = here
  }
  return below[0][cols - 1]
}
`),
    notes: [
      ["for r in range(rows - 1, -1, -1)", "for (let r = rows - 1", "Both robots move down one row per step, together, so one state is (row, column of robot 1, column of robot 2). Rows are filled from the bottom up."],
      ["here = [[0] * cols for _", "const here = Array.from", "here[a][b]: the most both robots can still collect from row r down, if robot 1 is in column a and robot 2 in column b now."],
      ["collected = grid[r][a] if a == b", "const collected = a === b", "What they pick up in this row. On the same cell it counts once."],
      ["if below is None", "if (below === null)", "The bottom row: nothing after it."],
      ["best_next = max(below[x][y]", "let bestNext = -Infinity", "Each robot moves to the column straight below or one to either side: 3 × 3 joint moves, minus those off the grid. Take the best future among them."],
      ["here[a][b] = collected + best_next", "here[a][b] = collected + bestNext", "This row’s pickings plus the best of what follows."],
      ["return below[0][cols - 1]", "return below[0][cols - 1]", "The robots start in the top row at the leftmost and rightmost columns."],
    ],
    math: [
      ["F(r, a, b)", "here[a][b] for row r", "here[a][b] for row r", "most collected from row r down, robots in columns a and b"],
      ["g(r, a) + g(r, b) [once if a = b] + max F(r + 1, a ± 1, b ± 1)", "collected + best_next", "collected + bestNext", "this row, then the best joint move"],
    ],
  },
  'unbounded-knapsack': {
    code: pair(`def solve(weights, values, capacity):
    best = [0] * (capacity + 1)
    for c in range(1, capacity + 1):
        for w, v in zip(weights, values):
            if w <= c:
                best[c] = max(best[c], best[c - w] + v)
    return best[capacity]
`, `function solve(weights, values, capacity) {
  const best = Array(capacity + 1).fill(0)
  for (let c = 1; c <= capacity; c++) {
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] <= c) best[c] = Math.max(best[c], best[c - weights[i]] + values[i])
    }
  }
  return best[capacity]
}
`),
    notes: [
      ["best = [0] * (capacity + 1)", "const best = Array(capacity + 1).fill(0)", "best[c]: the most value within capacity c, any item any number of times. With nothing packed the value is 0, which also covers room left unused."],
      ["range(1, capacity + 1)", "c <= capacity", "Capacities upward: best[c − w] is smaller, so already final."],
      ["for w, v in zip", "for (let i = 0; i < weights.length", "Classify packings by the last item put in. Unlike 0/1, any item can be last at any capacity."],
      ["best[c] = max(best[c], best[c - w] + v)", "best[c] = Math.max(best[c], best[c - weights[i]] + values[i])", "Item w last: its value on top of the best with w less room. best[c − w] may already hold copies of the same item, and that is allowed here; it is the loop direction 0/1 had to avoid."],
    ],
    math: [
      ["U(c)", "best[c]", "best[c]", "most value within capacity c, repeats allowed"],
      ["max over items with wᵢ ≤ c of U(c − wᵢ) + vᵢ", "best[c - w] + v", "best[c - weights[i]] + values[i]", "the last item packed"],
    ],
  },
  'equal-partition': {
    code: pair(`def solve(values):
    total = sum(values)
    half = total // 2
    reach = [True] + [False] * half
    for v in values:
        for s in range(half, v - 1, -1):
            if reach[s - v]:
                reach[s] = True
    best = max(s for s in range(half + 1) if reach[s])
    return total - 2 * best
`, `function solve(values) {
  const total = values.reduce((sum, v) => sum + v, 0)
  const half = Math.floor(total / 2)
  const reach = [true, ...Array(half).fill(false)]
  for (const v of values) {
    for (let s = half; s >= v; s--) {
      if (reach[s - v]) reach[s] = true
    }
  }
  let best = half
  while (!reach[best]) best--
  return total - 2 * best
}
`),
    notes: [
      ["half = total // 2", "const half = Math.floor(total / 2)", "If one group sums to s, the other sums to total − s, and the difference is total − 2s. So we want the largest s, not over half, that some group can reach."],
      ["reach = [True]", "const reach = [true", "reach[s]: some of the values seen so far add up to exactly s. The empty group makes 0."],
      ["range(half, v - 1, -1)", "s = half; s >= v; s--", "Downwards, as in 0/1 knapsack, so reach[s − v] still describes the values before v: each value is used at most once."],
      ["if reach[s - v]", "if (reach[s - v])", "If s − v was reachable, adding v reaches s."],
      ["best = max(", "while (!reach[best])", "The largest reachable sum up to half."],
      ["return total - 2 * best", "return total - 2 * best", "The two groups: best and total − best."],
    ],
    math: [
      ["R(s)", "reach[s]", "reach[s]", "some values make exactly s"],
      ["total − 2·max{s ≤ total/2 : R(s)}", "total - 2 * best", "total - 2 * best", "the smallest difference"],
    ],
  },
  'target-signs': {
    code: pair(`def solve(values, target):
    counts = {0: 1}
    for v in values:
        nxt = {}
        for total, ways in counts.items():
            nxt[total + v] = nxt.get(total + v, 0) + ways
            nxt[total - v] = nxt.get(total - v, 0) + ways
        counts = nxt
    return counts.get(target, 0)
`, `function solve(values, target) {
  let counts = new Map([[0, 1]])
  for (const v of values) {
    const next = new Map()
    for (const [total, ways] of counts) {
      next.set(total + v, (next.get(total + v) ?? 0) + ways)
      next.set(total - v, (next.get(total - v) ?? 0) + ways)
    }
    counts = next
  }
  return counts.get(target) ?? 0
}
`),
    notes: [
      ["counts = {0: 1}", "let counts = new Map([[0, 1]])", "counts maps each running total to the number of sign choices that reach it. Before any value, one way to have 0. A dictionary, because totals can be negative."],
      ["for v in values", "for (const v of values)", "One value at a time, each with + or −."],
      ["nxt[total + v]", "next.set(total + v", "Give v a plus: every way of reaching total now reaches total + v."],
      ["nxt[total - v]", "next.set(total - v", "Or a minus. Both choices are counted, so different sign patterns stay separate."],
      ["return counts.get(target, 0)", "return counts.get(target) ?? 0", "The sign patterns that end exactly on the target; 0 if none does."],
    ],
    math: [
      ["N(i, t)", "counts after value i, at key t", "counts after value i, at key t", "sign choices for the first i values that sum to t"],
      ["N(i − 1, t − vᵢ) + N(i − 1, t + vᵢ)", "nxt[total + v]", "next.set(total + v", "plus vᵢ, or minus vᵢ"],
    ],
  },
  'coin-permutations': {
    code: pair(`def solve(coins, amount):
    ways = [1] + [0] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                ways[a] += ways[a - c]
    return ways[amount]
`, `function solve(coins, amount) {
  const ways = [1, ...Array(amount).fill(0)]
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) ways[a] += ways[a - c]
    }
  }
  return ways[amount]
}
`),
    notes: [
      ["ways = [1]", "const ways = [1", "ways[a]: ordered sequences of coins adding up to a. The empty sequence makes 0."],
      ["for a in range(1, amount + 1)", "for (let a = 1", "Amounts on the outside: for each amount, every coin gets a turn at being the last one."],
      ["for c in coins", "for (const c of coins)", "So 1 + 2 (last coin 2) and 2 + 1 (last coin 1) land in different groups and are both counted: order matters. Swap these two loops and you count collections instead."],
      ["ways[a] += ways[a - c]", "ways[a] += ways[a - c]", "Sequences ending in c: one for each sequence making a − c."],
    ],
    math: [
      ["S(a)", "ways[a]", "ways[a]", "ordered coin sequences making a"],
      ["sum over coins c ≤ a of S(a − c)", "ways[a] += ways[a - c]", "ways[a] += ways[a - c]", "group by the last coin"],
    ],
  },
  'value-knapsack': {
    code: pair(`def solve(weights, values, capacity):
    total = sum(values)
    lightest = [0] + [float('inf')] * total
    for w, v in zip(weights, values):
        for t in range(total, v - 1, -1):
            lightest[t] = min(lightest[t], lightest[t - v] + w)
    return max(t for t in range(total + 1) if lightest[t] <= capacity)
`, `function solve(weights, values, capacity) {
  const total = values.reduce((sum, v) => sum + v, 0)
  const lightest = [0, ...Array(total).fill(Infinity)]
  for (let i = 0; i < weights.length; i++) {
    for (let t = total; t >= values[i]; t--) {
      lightest[t] = Math.min(lightest[t], lightest[t - values[i]] + weights[i])
    }
  }
  let t = total
  while (lightest[t] > capacity) t--
  return t
}
`),
    notes: [
      ["lightest = [0]", "const lightest = [0", "The table is turned around: lightest[t] is the least weight that achieves value exactly t. Useful when capacities are huge but values small. Value 0 weighs 0; the rest start at infinity, “not reached”."],
      ["range(total, v - 1, -1)", "t = total; t >= values[i]; t--", "Downwards, so each item is used at most once (the 0/1 rule)."],
      ["lightest[t] = min(", "lightest[t] = Math.min(", "Reach value t without this item, or with it: its weight on top of the lightest way to reach t − v."],
      ["return max(t for t", "while (lightest[t] > capacity)", "The answer is the largest value whose lightest packing still fits."],
    ],
    math: [
      ["L(t)", "lightest[t]", "lightest[t]", "least weight with value exactly t"],
      ["min(L(t), L(t − vᵢ) + wᵢ)", "lightest[t - v] + w", "lightest[t - values[i]] + weights[i]", "without item i, or with it"],
      ["max{t : L(t) ≤ C}", "lightest[t] <= capacity", "lightest[t] > capacity", "the most value that fits"],
    ],
  },
  'multidimensional-knapsack': {
    code: pair(`def solve(items, cap_weight, cap_volume):
    best = [[0] * (cap_volume + 1) for _ in range(cap_weight + 1)]
    for w, vol, value in items:
        for a in range(cap_weight, w - 1, -1):
            for b in range(cap_volume, vol - 1, -1):
                best[a][b] = max(best[a][b], best[a - w][b - vol] + value)
    return best[cap_weight][cap_volume]
`, `function solve(items, capWeight, capVolume) {
  const best = Array.from({ length: capWeight + 1 }, () => Array(capVolume + 1).fill(0))
  for (const [w, vol, value] of items) {
    for (let a = capWeight; a >= w; a--) {
      for (let b = capVolume; b >= vol; b--) {
        best[a][b] = Math.max(best[a][b], best[a - w][b - vol] + value)
      }
    }
  }
  return best[capWeight][capVolume]
}
`),
    notes: [
      ["best = [[0] * (cap_volume + 1)", "const best = Array.from", "Two limits, so two capacity indices: best[a][b] is the most value within weight a and volume b, from the items so far."],
      ["for w, vol, value in items", "for (const [w, vol, value] of items)", "One item at a time: weight, volume, value."],
      ["range(cap_weight, w - 1, -1)", "a = capWeight; a >= w; a--", "Both loops go down, so best[a − w][b − vol] is still the table before this item: at most one copy."],
      ["best[a][b] = max(", "best[a][b] = Math.max(", "Leave the item, or take it: its value on top of the best with w less weight and vol less volume."],
    ],
    math: [
      ["K(i, a, b)", "best[a][b] after item i", "best[a][b] after item i", "most value within weight a and volume b"],
      ["max(K(i − 1, a, b), K(i − 1, a − wᵢ, b − uᵢ) + vᵢ)", "best[a - w][b - vol] + value", "best[a - w][b - vol] + value", "leave item i, or take it"],
    ],
  },
  'group-knapsack': {
    code: pair(`def solve(groups, capacity):
    best = [0] * (capacity + 1)
    for group in groups:
        old = best[:]
        for c in range(capacity + 1):
            for w, v in group:
                if w <= c:
                    best[c] = max(best[c], old[c - w] + v)
    return best[capacity]
`, `function solve(groups, capacity) {
  const best = Array(capacity + 1).fill(0)
  for (const group of groups) {
    const old = [...best]
    for (let c = 0; c <= capacity; c++) {
      for (const [w, v] of group) {
        if (w <= c) best[c] = Math.max(best[c], old[c - w] + v)
      }
    }
  }
  return best[capacity]
}
`),
    notes: [
      ["best = [0] * (capacity + 1)", "const best = Array(capacity + 1).fill(0)", "best[c]: the most value within capacity c from the groups so far."],
      ["old = best[:]", "const old = [...best]", "A copy of the table before this group. Every option reads old, so at most one option per group is ever taken."],
      ["for w, v in group", "for (const [w, v] of group)", "Try each option of the group. Taking nothing from it is best[c] as it stands."],
      ["old[c - w] + v", "old[c - w] + v", "This option on top of the best from the earlier groups only."],
    ],
    math: [
      ["G(g, c)", "best[c] after group g", "best[c] after group g", "most value from the first g groups within c"],
      ["max(G(g − 1, c), max over options of G(g − 1, c − w) + v)", "old[c - w] + v", "old[c - w] + v", "nothing from group g, or one of its options"],
    ],
  },
  'exact-capacity': {
    code: pair(`def solve(weights, values, capacity):
    none = float('-inf')
    best = [0] + [none] * capacity
    for w, v in zip(weights, values):
        for c in range(capacity, w - 1, -1):
            best[c] = max(best[c], best[c - w] + v)
    return -1 if best[capacity] == none else best[capacity]
`, `function solve(weights, values, capacity) {
  const best = [0, ...Array(capacity).fill(-Infinity)]
  for (let i = 0; i < weights.length; i++) {
    for (let c = capacity; c >= weights[i]; c--) {
      best[c] = Math.max(best[c], best[c - weights[i]] + values[i])
    }
  }
  return best[capacity] === -Infinity ? -1 : best[capacity]
}
`),
    notes: [
      ["best = [0] + [none] * capacity", "const best = [0, ...Array(capacity).fill(-Infinity)]", "best[c]: the most value filling exactly c. Only 0 is filled by nothing; every other weight starts at −∞, “can’t be filled yet”. That one change from the ordinary knapsack (which starts every cell at 0) is what makes the fill exact."],
      ["range(capacity, w - 1, -1)", "c = capacity; c >= weights[i]; c--", "Downwards: each item at most once."],
      ["best[c] = max(", "best[c] = Math.max(", "−∞ plus a value is still −∞, so a take built on an unfillable weight never wins."],
      ["return -1 if", "return best[capacity] === -Infinity", "Still −∞: no set of items weighs exactly the capacity."],
    ],
    math: [
      ["E(c)", "best[c]", "best[c]", "most value filling exactly c; −∞ if impossible"],
      ["max(E(c), E(c − wᵢ) + vᵢ)", "best[c - w] + v", "best[c - weights[i]] + values[i]", "leave item i, or take it"],
    ],
  },
  'rod-cutting': {
    code: pair(`def solve(prices, n):
    best = [0] * (n + 1)
    for length in range(1, n + 1):
        options = []
        for k in range(1, min(length, len(prices)) + 1):
            options.append(prices[k - 1] + best[length - k])
        best[length] = max(options)
    return best[n]
`, `function solve(prices, n) {
  const best = Array(n + 1).fill(0)
  for (let length = 1; length <= n; length++) {
    let most = -Infinity
    for (let k = 1; k <= Math.min(length, prices.length); k++) {
      most = Math.max(most, prices[k - 1] + best[length - k])
    }
    best[length] = most
  }
  return best[n]
}
`),
    notes: [
      ["best = [0] * (n + 1)", "const best = Array(n + 1).fill(0)", "best[L]: the most a rod of length L can sell for. Length 0 sells for 0."],
      ["for length in range(1, n + 1)", "for (let length = 1", "Shorter rods first, so best[length − k] is ready."],
      ["range(1, min(length, len(prices)) + 1)", "k <= Math.min(length, prices.length)", "Every way of cutting has a first piece, of length k: no longer than the rod, and only lengths that have a price."],
      ["prices[k - 1] + best[length - k]", "prices[k - 1] + best[length - k]", "Sell that piece (prices is 0-indexed, so length k is prices[k − 1]) and cut the rest as well as possible."],
      ["best[length] = max(options)", "best[length] = most", "The best first piece. A piece of length 1 always has a price, so there is always an option."],
    ],
    math: [
      ["R(L)", "best[length]", "best[length]", "most money from a rod of length L"],
      ["max over k of p_k + R(L − k)", "prices[k - 1] + best[length - k]", "prices[k - 1] + best[length - k]", "the first piece has length k"],
    ],
  },
  binomial: {
    code: pair(`def solve(n, k):
    if k < 0 or k > n:
        return 0
    row = [1]
    for _ in range(n):
        row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]
    return row[k]
`, `function solve(n, k) {
  if (k < 0 || k > n) return 0
  let row = [1]
  for (let i = 0; i < n; i++) {
    const next = [1]
    for (let j = 0; j + 1 < row.length; j++) next.push(row[j] + row[j + 1])
    next.push(1)
    row = next
  }
  return row[k]
}
`),
    notes: [
      ["if k < 0 or k > n", "if (k < 0 || k > n)", "No way to choose fewer than none or more than there are."],
      ["row = [1]", "let row = [1]", "Row 0 of Pascal’s triangle: C(0, 0) = 1, one way to choose nothing from nothing."],
      ["row[i] + row[i + 1]", "row[j] + row[j + 1]", "C(m, j) = C(m − 1, j − 1) + C(m − 1, j): look at the last item. Either it is chosen (choose j − 1 from the rest) or not (choose j from the rest). Those are neighbours in the row above."],
      ["+ [1]", "next.push(1)", "Both ends of every row are 1: choose none, or choose all."],
      ["return row[k]", "return row[k]", "After n passes row is row n of the triangle; position k is C(n, k)."],
    ],
    math: [
      ["C(m, j)", "row after m passes, at index j", "row after m passes, at index j", "ways to choose j items from m"],
      ["C(m − 1, j − 1) + C(m − 1, j)", "row[i] + row[i + 1]", "row[j] + row[j + 1]", "the last item chosen, or not"],
    ],
  },
  catalan: {
    code: pair(`def solve(n):
    c = [1] + [0] * n
    for m in range(1, n + 1):
        for k in range(m):
            c[m] += c[k] * c[m - 1 - k]
    return c[n]
`, `function solve(n) {
  const c = [1, ...Array(n).fill(0)]
  for (let m = 1; m <= n; m++) {
    for (let k = 0; k < m; k++) {
      c[m] += c[k] * c[m - 1 - k]
    }
  }
  return c[n]
}
`),
    notes: [
      ["c = [1]", "const c = [1", "c[m]: the Catalan number C(m), for example the balanced strings with m pairs of brackets. C(0) = 1: the empty string."],
      ["for k in range(m)", "for (let k = 0; k < m", "Split by the bracket that closes the first one: it encloses k pairs, and m − 1 − k pairs come after it."],
      ["c[m] += c[k] * c[m - 1 - k]", "c[m] += c[k] * c[m - 1 - k]", "Any balanced inside with any balanced rest: the counts multiply. Different k give different strings, so the products add."],
    ],
    math: [
      ["C(m)", "c[m]", "c[m]", "the m-th Catalan number"],
      ["sum over k of C(k)·C(m − 1 − k)", "c[k] * c[m - 1 - k]", "c[k] * c[m - 1 - k]", "inside the first pair, and after it"],
    ],
  },
  'balanced-parentheses': {
    code: pair(`def solve(s):
    n = len(s)
    ways = [1] + [0] * n
    for ch in s:
        nxt = [0] * (n + 1)
        for depth in range(n + 1):
            if ways[depth] == 0:
                continue
            if ch in '(?' and depth + 1 <= n:
                nxt[depth + 1] += ways[depth]
            if ch in ')?' and depth > 0:
                nxt[depth - 1] += ways[depth]
        ways = nxt
    return ways[0]
`, `function solve(s) {
  const n = s.length
  let ways = [1, ...Array(n).fill(0)]
  for (const ch of s) {
    const next = Array(n + 1).fill(0)
    for (let depth = 0; depth <= n; depth++) {
      if (ways[depth] === 0) continue
      if (ch !== ')' && depth + 1 <= n) next[depth + 1] += ways[depth]
      if (ch !== '(' && depth > 0) next[depth - 1] += ways[depth]
    }
    ways = next
  }
  return ways[0]
}
`),
    notes: [
      ["ways = [1]", "let ways = [1", "ways[d]: the ways to fill in the characters so far so that d brackets are open, never having gone below 0. Before any character, one way, at depth 0."],
      ["for ch in s", "for (const ch of s)", "One character at a time; the depth is all that matters about the past."],
      ["if ch in '(?'", "if (ch !== ')'", "An opening bracket (or a ? used as one) goes one deeper."],
      ["if ch in ')?'", "if (ch !== '(' && depth > 0)", "A closing bracket (or a ? used as one) closes one, but only if one is open: depth never goes below 0."],
      ["return ways[0]", "return ways[0]", "Balanced means every bracket closed at the end: depth 0."],
    ],
    math: [
      ["W(i, d)", "ways after character i, at depth d", "ways after character i, at depth d", "fillings of the first i characters ending at depth d"],
      ["W(i − 1, d − 1) [open] + W(i − 1, d + 1) [close]", "nxt[depth + 1] += ways[depth]", "next[depth + 1] += ways[depth]", "open one more, or close one"],
    ],
  },
  stirling: {
    code: pair(`def solve(n, k):
    s = [[0] * (k + 1) for _ in range(n + 1)]
    s[0][0] = 1
    for i in range(1, n + 1):
        for j in range(1, k + 1):
            s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]
    return s[n][k]
`, `function solve(n, k) {
  const s = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0))
  s[0][0] = 1
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= k; j++) {
      s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]
    }
  }
  return s[n][k]
}
`),
    notes: [
      ["s = [[0] * (k + 1)", "const s = Array.from", "s[i][j]: the ways to split i labelled items into exactly j non-empty groups."],
      ["s[0][0] = 1", "s[0][0] = 1", "No items into no groups: one way. Every other cell with i or j equal to 0 is 0."],
      ["s[i - 1][j - 1] +", "s[i - 1][j - 1] +", "Look at item i. It is alone in a group of its own: split the other i − 1 items into j − 1 groups …"],
      ["j * s[i - 1][j]", "j * s[i - 1][j]", "… or it joins one of the j groups made by the other i − 1 items: j choices for each such split."],
    ],
    math: [
      ["S(i, j)", "s[i][j]", "s[i][j]", "splits of i items into j non-empty groups"],
      ["S(i − 1, j − 1) + j·S(i − 1, j)", "s[i - 1][j - 1] + j * s[i - 1][j]", "s[i - 1][j - 1] + j * s[i - 1][j]", "item i alone, or added to one of j groups"],
    ],
  },
  'inversion-counting': {
    code: pair(`def solve(n, k):
    top = n * (n - 1) // 2
    if k < 0 or k > top:
        return 0
    ways = [1]
    for m in range(1, n + 1):
        nxt = [0] * (len(ways) + m - 1)
        for inv, count in enumerate(ways):
            for t in range(m):
                nxt[inv + t] += count
        ways = nxt
    return ways[k]
`, `function solve(n, k) {
  const top = n * (n - 1) / 2
  if (k < 0 || k > top) return 0
  let ways = [1]
  for (let m = 1; m <= n; m++) {
    const next = Array(ways.length + m - 1).fill(0)
    ways.forEach((count, inv) => {
      for (let t = 0; t < m; t++) next[inv + t] += count
    })
    ways = next
  }
  return ways[k]
}
`),
    notes: [
      ["top = n * (n - 1) // 2", "const top = n * (n - 1) / 2", "The most inversions possible: every pair out of order, n(n − 1)/2 pairs."],
      ["ways = [1]", "let ways = [1]", "ways[x]: permutations of the numbers placed so far with exactly x inversions. With none placed, one (empty) permutation, 0 inversions."],
      ["for m in range(1, n + 1)", "for (let m = 1", "Insert the numbers in increasing order; m is the largest so far."],
      ["for t in range(m)", "for (let t = 0; t < m", "m is bigger than everything already there. Put it with t of them after it, and it makes exactly t new inversions: t can be 0 … m − 1, each a different place."],
      ["nxt[inv + t] += count", "next[inv + t] += count", "Each permutation with inv inversions gives one with inv + t."],
    ],
    math: [
      ["I(m, x)", "ways after m, at index x", "ways after m, at index x", "permutations of 1 … m with x inversions"],
      ["sum over t < m of I(m − 1, x − t)", "nxt[inv + t] += count", "next[inv + t] += count", "where the new largest number goes"],
    ],
  },
}

// The Advanced lessons' explained code lives beside its family (explained-dag.js, …).
export const EXPLAINED = { ...CORE_EXPLAINED, ...DAG_EXPLAINED, ...TREE_EXPLAINED, ...SUBSET_EXPLAINED, ...DIGIT_EXPLAINED, ...SPACE_EXPLAINED, ...SPLIT_EXPLAINED, ...ALGEBRA_EXPLAINED }
