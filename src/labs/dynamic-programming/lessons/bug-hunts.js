// Bug hunts: a solution to a lesson's challenge with one classic DP bug. Each hunt stores the
// correct code and one swap (the right lines and the buggy lines that replace them), so the buggy
// code and the bug's line numbers are computed (hunt.js), never typed. bug-hunts.test.js checks, in
// JavaScript and real Python, that the correct code passes the challenge, the buggy code fails it,
// and the symptom's right answer agrees with the exhaustive oracle.
//
// Text fields may use {call} (the symptom call, e.g. solve(8)), {got} (what the buggy code returns
// on it) and {want} (the right answer); Hunt.jsx fills them in.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const BUG_HUNTS = {
  fibonacci: {
    know: 'After k passes of the loop, a holds F(k) and b holds F(k + 1). One pass turns the pair (F(k), F(k + 1)) into (F(k + 1), F(k + 2)): the new a is the old b, and the new b is old a + old b. Both new values are made from the old pair.',
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
    swap: pair(['        a, b = b, a + b', '        a = b\n        b = a + b'], ['    [a, b] = [b, a + b]', '    a = b\n    b = a + b']),
    symptom: { args: [8], expected: 21, buggy: 128 },
    bug: 'Overwritten before it was read',
    why: 'The pass stores a = b first, so when the next line computes a + b, a is no longer F(k): it is already the old b. The new b becomes old b + old b, double the old b instead of the next Fibonacci number, so after the first pass the values just double: 1, 2, 4, 8, … That is why {call} returned {got} instead of {want}.',
    fix: 'Make both new values from the old pair before storing either. Python’s a, b = b, a + b and JavaScript’s [a, b] = [b, a + b] work out the whole right-hand side first, then assign. A temporary works too: t = a + b, then a = b, then b = t.',
    clues: [
      'Print a and b at the end of each pass. Which pass is the first to differ from 0 1, 1 1, 1 2, 2 3, 3 5?',
      'Inside one pass, which a does the line b = a + b read: the one from before the pass, or the one the line above just stored?',
      'On paper, run one pass from a = 1, b = 2. The right result is a = 2, b = 3.',
    ],
    decoys: [
      [['a, b = 0, 1', 'let a = 0, b = 1'], 'This is the start: a = F(0) = 0 and b = F(1) = 1. Both are right.'],
      [['return a', 'return a'], 'After n passes a holds F(n), so returning a is right, as long as each pass is.'],
      [['range(n)', 'i < n;'], 'The loop runs n times, one pass for each step from F(k) to F(k + 1). That count is right.'],
    ],
  },

  'house-robber': {
    know: 'best[i] is the most you can take from houses 0 to i. For house i you either skip it (best[i − 1]) or take it and add best[i − 2]. The first two cells have no i − 2, so they are set by hand: best[0] = values[0], and best[1] is the better of the first two houses on their own, because you may take only one of them.',
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
    swap: pair(['    best[1] = max(values[0], values[1])', '    best[1] = values[1]'], ['  best[1] = Math.max(values[0], values[1])', '  best[1] = values[1]']),
    symptom: { args: [[5, 1, 1, 5]], expected: 10, buggy: 6 },
    bug: 'A wrong base case',
    why: 'best[1] should be the best you can do with houses 0 and 1, which is the larger of the two. The code sets it to values[1], as if house 1 had to be taken. When house 0 is the richer one, best[1] comes out too small, and every later cell is built on it, so the mistake travels to the end: {call} returned {got} instead of {want}.',
    fix: 'best[1] = max(values[0], values[1]). A base case must mean exactly what the state means, “the best from houses 0 and 1”, not “house 1 taken”.',
    clues: [
      'Print best after it is filled. Which is the first cell that is smaller than it should be?',
      'Say what best[1] means in words. Does the value the code gives it match that meaning when house 0 is worth more than house 1?',
      'Try [5, 1]. The right answer is 5.',
    ],
    decoys: [
      [['best[i] = max(best[i - 1]', 'best[i] = Math.max(best[i - 1]'], 'This is the recurrence: skip house i (best[i − 1]) or take it with best[i − 2]. It is right.'],
      [['best[0] = values[0]', 'best[0] = values[0]'], 'With only house 0 available, taking it is best. Right.'],
      [['return best[n - 1]', 'return best[n - 1]'], 'The last cell covers every house, so it is the answer. Right.'],
    ],
  },

  'decode-ways': {
    know: 'ways[i] counts the readings of the first i digits. The last letter used either one digit (any digit except 0) or two digits. Two digits make a letter only from 10 to 26: a pair that starts with 0, such as 01 or 05, is not a letter, because no code starts with 0.',
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
    swap: pair(['        if i >= 2 and 10 <= int(s[i - 2:i]) <= 26:', '        if i >= 2 and 1 <= int(s[i - 2:i]) <= 26:'], ['      if (pair >= 10 && pair <= 26) ways[i] += ways[i - 2]', '      if (pair >= 1 && pair <= 26) ways[i] += ways[i - 2]']),
    symptom: { args: ['101'], expected: 1, buggy: 2 },
    bug: 'A range that lets a leading zero through',
    why: 'The pair test accepts any number from 1 to 26. Turning the two characters "01" into a number gives 1, which passes, so the code reads 01 as the letter A. That reading doesn’t exist, and {call} returned {got} instead of {want}.',
    fix: 'Accept a pair only from 10 to 26. Turning "01" into a number throws its leading zero away, so the range has to start at 10 to keep such pairs out (or check that the first of the two digits is not 0).',
    clues: [
      'List the readings of "101" by hand. Which reading does the code count that you didn’t?',
      'What number does int("01") (Python) or Number("01") (JavaScript) give? Is 01 a letter?',
      'Which line decides whether two digits make a letter?',
    ],
    decoys: [
      [["if s[i - 1] != '0':", "if (s[i - 1] !== '0')"], 'A single digit is a letter unless it is 0. Right.'],
      [['ways = [1] + [0] * n', 'const ways = [1, ...Array(n).fill(0)]'], 'The empty string has one reading, so ways[0] = 1. Right.'],
    ],
  },

  'obstacle-paths': {
    know: 'p[r][c] counts the paths from the top-left to (r, c) moving only right or down; a blocked cell (1) has 0 paths. A cell in the top row can only be reached from its left neighbour, so it has that neighbour’s count, and once a block appears, every cell after it in the row is 0. The left column works the same way going down.',
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
    swap: pair(['            p[0][c] = 1 if c == 0 else p[0][c - 1]', '            p[0][c] = 1'], ['    if (grid[0][c] === 0) p[0][c] = c === 0 ? 1 : p[0][c - 1]', '    if (grid[0][c] === 0) p[0][c] = 1']),
    symptom: { args: [[[0, 1, 0], [0, 0, 0]]], expected: 1, buggy: 2 },
    bug: 'An edge row that forgets where it was reached from',
    why: 'The code gives every open top-row cell 1 path. But a top-row cell can only be entered from its left, so an open cell to the right of a block can’t be reached at all and should hold 0. With {call}, the top-right cell gets a 1, that count flows down into the cell below it, and the answer is {got} instead of {want}.',
    fix: 'A top-row cell copies its left neighbour (and the start is 1): p[0][c] = p[0][c − 1]. A block holds 0, so it passes 0 along the rest of the row, exactly as the left-column loop already does going down.',
    clues: [
      'Print p row by row. Is there a top-row cell to the right of a block that has a count other than 0?',
      'From which neighbour can a robot step into a top-row cell?',
      'The left-column loop gets this right. Compare the two edge loops line by line.',
    ],
    decoys: [
      [['p[r][0] = p[r - 1][0]', 'p[r][0] = p[r - 1][0]'], 'A left-column cell can only be entered from above, so it copies the cell above. Right.'],
      [['p[r][c] = p[r - 1][c] + p[r][c - 1]', 'p[r][c] = p[r - 1][c] + p[r][c - 1]'], 'An inner cell is entered from above or from the left: add the two counts. Right.'],
    ],
  },

  'max-square': {
    know: 'side[r][c] is the side of the largest square of 1s whose bottom-right corner is (r, c): 1 + the smallest of the cells above, left and above-left. A cell holding 0 in the grid is never written, so it must start at 0 and stay 0. That only works if every row of side is a list of its own.',
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
    swap: pair(['    side = [[0] * cols for _ in range(rows)]', '    side = [[0] * cols] * rows'], ['  const side = Array.from({ length: rows }, () => Array(cols).fill(0))', '  const side = Array(rows).fill(Array(cols).fill(0))']),
    symptom: { args: [[[1, 1], [0, 1]]], expected: 1, buggy: 2 },
    bug: 'Every row is the same list',
    why: 'That line doesn’t make a separate list for each row: it makes one row and puts that same list in every slot. Writing side[2][c] also changes side[0][c] and side[1][c], because they are one list. So “the cell above” and “the cell above-left” are values from the current row, and a 0 cell, which the code never writes, keeps a number left there by another row. With {call}, the 0 cell keeps the 1 written into the row above it, and the code reports a square of 1s that isn’t there: {got} instead of {want}.',
    fix: 'Make each row separately: [[0] * cols for _ in range(rows)] in Python, Array.from({ length: rows }, () => Array(cols).fill(0)) in JavaScript. The row-making expression runs once per row, so each row is a new list.',
    clues: [
      'Print side after the loops. Are its rows suspiciously identical?',
      'Just after side is made, set side[0][0] = 7 and print side. What happens to the other rows?',
      'Which line creates side, and how many lists does it create?',
    ],
    decoys: [
      [['1 + min(side[r - 1][c]', '1 + Math.min(side[r - 1][c]'], 'The square at (r, c) is limited by the smallest of the three neighbours. This recurrence is right, if the neighbours hold their own values.'],
      [['if r == 0 or c == 0:', 'if (r === 0 || c === 0)'], 'A 1 on the top row or left column can only be the corner of a 1 × 1 square. Right.'],
    ],
  },

  'zero-one-knapsack': {
    know: 'best[c] is the largest value fitting in capacity c, using the items seen so far. Adding item (w, v): best[c] = max(best[c], best[c − w] + v). The best[c − w] it reads must still be the value without this item; that is what keeps each item to one copy.',
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
    swap: pair(['        for c in range(capacity, w - 1, -1):', '        for c in range(w, capacity + 1):'], ['    for (let c = capacity; c >= w; c--) {', '    for (let c = w; c <= capacity; c++) {']),
    symptom: { args: [[2, 3], [3, 5], 4], expected: 5, buggy: 6 },
    bug: 'The capacity loop runs the wrong way',
    why: 'Going up from small capacities, best[c − w] has already been updated for this item by the time best[c] reads it. So best[c] can add the item to a total that already contains it: the item is taken twice. With {call}, two copies of the first item fill the knapsack: {got} instead of {want}.',
    fix: 'Loop c from capacity down to w. Then best[c − w], the smaller capacity, is read before this item updates it, so it still holds the value without the item. (Looping up is exactly the unbounded knapsack, where repeats are allowed.)',
    clues: [
      'Print best after each item. After the first item alone, what is best[4]? Is that possible with one copy?',
      'When best[c] reads best[c − w], has this item already been added to best[c − w]?',
      'Which direction must c go so that the smaller capacity is read before it is changed?',
    ],
    decoys: [
      [['best[c] = max(best[c], best[c - w] + v)', 'best[c] = Math.max(best[c], best[c - w] + v)'], 'Skip the item or take it: this recurrence is right, if best[c − w] does not yet contain the item.'],
      [['best = [0] * (capacity + 1)', 'const best = Array(capacity + 1).fill(0)'], 'With no items, every capacity holds value 0. Right.'],
    ],
  },

  'bounded-knapsack': {
    know: 'For each item, try q = 1 … k copies: best[c] = max(best[c], old[c − q·w] + q·v), where old is the table from before this item. Reading old, not best, guarantees the q copies are the only copies of this item.',
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
    swap: pair(['        old = best[:]', '        old = best'], ['    const old = [...best]', '    const old = best']),
    symptom: { args: [[3], [4], [2], 9], expected: 8, buggy: 12 },
    bug: 'A copy that isn’t a copy',
    why: 'old = best doesn’t copy the list; it gives the same list a second name. As the loop updates best, old changes with it, so old[c − q·w] may already contain this item, and copies beyond the stock of k sneak in. With {call}, a third copy is taken although only two exist: {got} instead of {want}.',
    fix: 'Copy the list: old = best[:] (or list(best)) in Python, const old = [...best] in JavaScript. Then old keeps the table from before this item while best changes.',
    clues: [
      'Print best after the item. Is any value more than k copies could make?',
      'After old = best, change best[0] and print old[0]. Are they two lists?',
      'Which line is meant to keep the table from before this item?',
    ],
    decoys: [
      [['for q in range(1, k + 1):', 'for (let q = 1; q <= k; q++)'], 'q goes from 1 to k copies, the stock. Right.'],
      [['old[c - q * w] + q * v', 'old[c - q * w] + q * v'], 'q copies take q·w of room and add q·v, on top of the table without this item. Right, if old really is that table.'],
    ],
  },

  'subset-sum': {
    know: 'can(i, left) answers: can some of values[i], values[i + 1], … add up to exactly left? It takes values[i] or skips it. The answer depends on both i and left, so the memo must store each (i, left) pair separately.',
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
    swap: pair(['        key = (i, left)', '        key = i'], ["    const key = i + ',' + left", '    const key = i']),
    symptom: { args: [[3, 5], 5], expected: true, buggy: false },
    bug: 'A cache key that forgets a parameter',
    why: 'The memo key is just i. The first call to reach index i stores its answer, for its own left, under i. Every later call at index i, with a different left, gets that stored answer back without computing its own. With {call}, a “no” for one remaining total is handed back for another total that can be made: {got} instead of {want}.',
    fix: 'Key the memo on everything the answer depends on: (i, left) in Python, i + "," + left in JavaScript. A rule worth keeping: the key holds every parameter that changes between calls.',
    clues: [
      'Print i, left and the answer each time can stores something in the memo. Are two different lefts stored under the same key?',
      'What does can’s answer depend on? Does the key hold all of it?',
      'Try [1, 2] with target 2: the right answer is true.',
    ],
    decoys: [
      [['if left == 0:', 'if (left === 0)'], 'Nothing left to make: the empty choice works. Right.'],
      [['can(i + 1, left - values[i]) or can(i + 1, left)', 'can(i + 1, left - values[i]) || can(i + 1, left)'], 'Take values[i] or skip it. This recurrence is right; the trouble is where its answer is stored.'],
    ],
  },

  'coin-min': {
    know: 'best[a] is the fewest coins making amount a, with best[0] = 0. Each coin c ≤ a offers best[a − c] + 1, and a minimum keeps the smallest offer. Every amount other than 0 starts as “not made yet”, which must lose to any real offer: it has to be infinity.',
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
    swap: pair(['    best = [0] + [impossible] * amount', '    best = [0] * (amount + 1)'], ['  const best = [0, ...Array(amount).fill(Infinity)]', '  const best = Array(amount + 1).fill(0)']),
    symptom: { args: [[3, 5], 9], expected: 3, buggy: 0 },
    bug: 'The wrong starting value for a minimum',
    why: 'Every cell starts at 0. Any real offer is at least 1 coin, so min(best[a], …) keeps the 0 forever and the function says every amount takes no coins: {call} returned {got} instead of {want}. The “impossible” check never fires either, because no cell ever holds infinity.',
    fix: 'Start best[0] at 0 and every other cell at infinity: [0] + [float("inf")] * amount in Python, [0, ...Array(amount).fill(Infinity)] in JavaScript. The starting value of a minimum must be bigger than any possible answer.',
    clues: [
      'Print best after the loops. Do any cells change from their starting value?',
      'What does min(0, 4) give? What does that mean for a cell that starts at 0?',
      'What must “not made yet” be, so that any real number of coins beats it?',
    ],
    decoys: [
      [['best[a] = min(best[a], best[a - c] + 1)', 'best[a] = Math.min(best[a], best[a - c] + 1)'], 'The last coin is c, leaving a − c to pay: best[a − c] + 1. Right.'],
      [['return -1 if', 'return best[amount] === Infinity'], 'An amount that was never made is still infinity: report −1. Right, if the table can hold infinity.'],
    ],
  },

  'coin-combinations': {
    know: 'A collection is counted once if coins are always added in one fixed order: all of the first value, then all of the second, and so on. So the outer loop goes over the coin values, and after coin c, ways[a] counts the collections of a using only the coins so far. 1 + 2 is counted; 2 + 1 never is.',
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
    swap: pair([
      '    for c in coins:\n        for a in range(c, amount + 1):\n            ways[a] += ways[a - c]',
      '    for a in range(1, amount + 1):\n        for c in coins:\n            if c <= a:\n                ways[a] += ways[a - c]',
    ], [
      '  for (const c of coins) {\n    for (let a = c; a <= amount; a++) {\n      ways[a] += ways[a - c]',
      '  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {\n      if (c <= a) ways[a] += ways[a - c]',
    ]),
    symptom: { args: [[1, 2], 4], expected: 3, buggy: 5 },
    bug: 'The loops are in the wrong order',
    why: 'With amounts outside and coins inside, every amount tries every coin as the last one, so 1 + 2 and 2 + 1 are both counted. That counts ordered sequences (the coin-permutations lesson), not collections: {call} returned {got} instead of {want}.',
    fix: 'Coins outside, amounts inside, each amount going up from c. Then the coins of a collection are always added in the order of the coin list, so each collection is built in exactly one way.',
    clues: [
      'List the collections for amount 4 with coins 1 and 2 by hand. Then list what the code counts. Which extra ones are there?',
      'In this code, can a 1 be added after a 2? Should it be?',
      'Which loop should be the outer one, to fix the order coins are added in?',
    ],
    decoys: [
      [['ways = [1] + [0] * amount', 'const ways = [1, ...Array(amount).fill(0)]'], 'An amount of 0 has one collection, no coins. Right.'],
    ],
  },

  'integer-partitions': {
    know: 'ways[t] counts the ways to write t as a sum of positive parts, in any order counted once. It works like coin collections with coins 1, 2, …, n: for each part size, add ways[t − part] to ways[t]. Every part size up to n is needed, because n on its own is a partition of n.',
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
    swap: pair(['    for part in range(1, n + 1):', '    for part in range(1, n):'], ['  for (let part = 1; part <= n; part++) {', '  for (let part = 1; part < n; part++) {']),
    symptom: { args: [5], expected: 7, buggy: 6 },
    bug: 'A loop that stops one short',
    why: 'The part loop stops at n − 1, so a single part of size n is never offered. The partition “n” on its own is missing, and the answer is exactly one short: {call} returned {got} instead of {want}.',
    fix: 'Let part run up to and including n: range(1, n + 1) in Python, part <= n in JavaScript. Python’s range stops before its second number, which is the usual source of this slip.',
    clues: [
      'List the partitions of 5 by hand. Which one does the code miss?',
      'What is the largest part size the loop offers?',
      'Try n = 1: the right answer is 1.',
    ],
    decoys: [
      [['ways[total] += ways[total - part]', 'ways[total] += ways[total - part]'], 'Using one more part of this size leaves total − part. Right.'],
      [['for total in range(part, n + 1):', 'for (let total = part; total <= n; total++)'], 'Totals go up from part, so a part size can be used again. Right.'],
    ],
  },

  derangements: {
    know: 'D(n) = (n − 1)·(D(n − 1) + D(n − 2)): letter 1 goes into one of the n − 1 other envelopes, and the two cases leave n − 2 or n − 1 letters to derange. The recurrence needs two starting values: D(0) = 1 (the empty arrangement counts once) and D(1) = 0 (one letter has only its own envelope).',
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
    swap: pair(['    d[1] = 0', '    d[1] = 1'], ['  d[1] = 0', '  d[1] = 1']),
    symptom: { args: [3], expected: 2, buggy: 6 },
    bug: 'A wrong base case',
    why: 'd[1] = 1 says one letter can go into an envelope other than its own, which is impossible. The recurrence builds every later value on it, so all of them are wrong: {call} returned {got} instead of {want}.',
    fix: 'd[1] = 0. A base case is a fact you can check by hand: with one letter and one envelope, no arrangement avoids its own envelope.',
    clues: [
      'Print d. Check D(2) by hand: two letters, swapped, is the only way.',
      'How many ways can one letter avoid its own envelope?',
      'Which cells does the loop not compute?',
    ],
    decoys: [
      [['d[m] = (m - 1) * (d[m - 1] + d[m - 2])', 'd[m] = (m - 1) * (d[m - 1] + d[m - 2])'], 'This is the derangement recurrence. Right, if its starting values are.'],
      [['d[0] = 1', 'd[0] = 1'], 'The empty arrangement counts once, so D(0) = 1. Right.'],
    ],
  },
}
