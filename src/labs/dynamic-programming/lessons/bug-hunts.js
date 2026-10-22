// Bug hunts: a solution to a lesson's challenge with one classic DP bug. Each hunt uses the lesson's
// explained reference code (explained.js) and stores one swap (the right lines and the buggy lines that replace them), so the buggy
// code and the bug's line numbers are computed (hunt.js), never typed. bug-hunts.test.js checks, in
// JavaScript and real Python, that the correct code passes the challenge, the buggy code fails it,
// and the symptom's right answer agrees with the exhaustive oracle.
//
// Text fields may use {call} (the symptom call, e.g. solve(8)), {got} (what the buggy code returns
// on it) and {want} (the right answer); Hunt.jsx fills them in.
import { DAG_HUNTS } from './bug-hunts-dag.js'
import { TREE_HUNTS } from './bug-hunts-tree.js'
import { SUBSET_HUNTS } from './bug-hunts-subset.js'
import { DIGIT_HUNTS } from './bug-hunts-digit.js'
import { SPACE_HUNTS } from './bug-hunts-space.js'
import { SPLIT_HUNTS } from './bug-hunts-split.js'
import { ALGEBRA_HUNTS } from './bug-hunts-algebra.js'
import { PROFILE_HUNTS } from './bug-hunts-profiles.js'
import { PROB_HUNTS } from './bug-hunts-prob.js'
import { GAME_HUNTS } from './bug-hunts-games.js'
import { PARSE_HUNTS } from './bug-hunts-parsing.js'
import { CONTROL_HUNTS } from './bug-hunts-control.js'
import { RESEARCH_HUNTS } from './bug-hunts-research.js'

const pair = (Python, JavaScript) => ({ Python, JavaScript })

const CORE_HUNTS = {
  fibonacci: {
    know: 'After k passes of the loop, a holds F(k) and b holds F(k + 1). One pass turns the pair (F(k), F(k + 1)) into (F(k + 1), F(k + 2)): the new a is the old b, and the new b is old a + old b. Both new values are made from the old pair.',
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

  stairs: {
    know: 'ways[h] counts the step sequences that land exactly on stair h. The last step was some size s, taken from stair h − s, so ways[h] adds ways[h − s] for every step size that fits. A step fits when h − s is a real stair, and the ground, stair 0, is one: ways[0] = 1 counts the climb that has taken no steps yet.',
    swap: pair(['            if s <= h:', '            if s < h:'], ['      if (s <= h) ways[h] += ways[h - s]', '      if (s < h) ways[h] += ways[h - s]']),
    symptom: { args: [3, [3]], expected: 1, buggy: 0 },
    bug: 'A comparison one short',
    why: 'The test s < h only lets a step in when it starts on stair 1 or higher. A step of exactly h stairs starts on the ground, h − s = 0, and that is the only place the 1 in ways[0] can come from. Without it no count ever leaves the ground: with {call}, the single step of 3 is never counted, so the code returned {got} instead of {want}.',
    fix: 'Use s <= h. A step of size s fits on stair h whenever h − s ≥ 0, and h − s = 0 is the ground, which is where every climb starts.',
    clues: [
      'Print ways after the loop. Which cells are 0 that should not be?',
      'For a step that lands exactly on stair h, which stair did it start from?',
      'Try solve(1, [1]). The answer is 1: one step of 1.',
    ],
    decoys: [
      [['ways = [1] + [0] * n', 'const ways = [1, ...Array(n).fill(0)]'], 'The ground has one way to stand on it, having taken no steps, so ways[0] = 1. Right.'],
      [['for s in steps:', 'for (const s of steps)'], 'Every step size could have been the last step. Trying them all is right.'],
      [['return ways[n]', 'return ways[n]'], 'ways[n] counts the sequences that land exactly on stair n. Right.'],
    ],
  },

  'min-cost-stairs': {
    know: 'best[i] is the cheapest way to stand on stair i: its own cost plus the cheaper of the two stairs a move could have come from. The problem says you must finish standing on the last stair, so the answer is best[n − 1] and nothing else. (A well-known version of this puzzle lets you step off past the top, and its answer is the cheaper of the last two stairs. That is a different problem.)',
    swap: pair(['    return best[n - 1]', '    return min(best[n - 1], best[n - 2]) if n >= 2 else best[0]'], ['  return best[n - 1]', '  return n >= 2 ? Math.min(best[n - 1], best[n - 2]) : best[0]']),
    symptom: { args: [[7, 8]], expected: 8, buggy: 7 },
    bug: 'The answer read from another problem’s cell',
    why: 'The table is right; the last line reads the wrong cell. best[n − 2] is the cost of standing on the stair below the top, and this problem doesn’t let you stop there. With {call}, stair 0 alone costs 7, which is cheaper than finishing on the top stair, so the code reported {got} instead of {want}.',
    fix: 'Return best[n − 1]. Before writing the last line, say in words where the answer is: “the cheapest way to stand on the last stair” is exactly the cell best[n − 1].',
    clues: [
      'Print best. Are the cells right? If they are, the bug is in what is read from them.',
      'Read the problem again: where must you finish?',
      'Try [1, 5]. You can jump from the ground straight onto stair 1, so the answer is 5.',
    ],
    decoys: [
      [['best[i] = costs[i]', 'best[i] = costs[i]'], 'Standing on stair i costs its own cost plus the cheaper way to reach a stair one or two below. Right.'],
      [['two_back = best[i - 2] if i >= 2 else 0', 'const twoBack = i >= 2 ? best[i - 2] : 0'], 'Stair 1 can be reached by a two-stair move from the ground, which costs nothing, so the missing stair counts as 0. Right.'],
    ],
  },

  'circular-selection': {
    know: 'On a ring the first and last houses are neighbours, so at most one of them is taken. Split on that: either the first house is left out (rob houses 1 to n − 1 as a line) or the last house is left out (rob houses 0 to n − 2 as a line). Every allowed choice falls into at least one of the two cases, so the answer is the larger of the two line answers.',
    swap: pair(['    return max(line(values[1:]), line(values[:-1]))', '    return line(values[1:-1])'], ['  return Math.max(line(values.slice(1)), line(values.slice(0, -1)))', '  return line(values.slice(1, -1))']),
    symptom: { args: [[2, 5]], expected: 5, buggy: 0 },
    bug: 'Splitting into cases that leave something out',
    why: 'To keep the first and last houses apart, the code drops both of them. That is safe, but it throws away every choice that takes one end house, and the best choice often does. With {call}, the two houses are both ends, so nothing is left to rob: {got} instead of {want}.',
    fix: 'Split into two cases that together cover every allowed choice: without the first house, or without the last. Return max(line(values[1:]), line(values[:-1])). The rule only forbids taking both ends, so each case drops just one.',
    clues: [
      'Find the best choice by hand for {call}. Does it take an end house?',
      'Which choices does dropping both end houses throw away that the ring rule allows?',
      'The ring forbids taking the first and the last house together. What are the two ways to obey that?',
    ],
    decoys: [
      [['prev, cur = cur, max(cur, prev + v)', '[prev, cur] = [cur, Math.max(cur, prev + v)]'], 'This is house robbing on a line: skip the house (cur) or take it with prev. Right.'],
      [['if len(values) == 1:', 'if (values.length === 1)'], 'A single house is not its own neighbour, so it may be taken. Right.'],
    ],
  },

  'activity-selection': {
    know: 'best[a] is the largest total so far that ends with activity a today. Tomorrow’s activity a adds its reward to the best of yesterday’s cells, but only the cells of the other activities: the rule forbids doing a two days running. The answer is the best cell on the last day.',
    swap: pair(['            yesterday = max(best[b] for b in range(len(best)) if b != a)', '            yesterday = max(best)'], ['      const yesterday = Math.max(...best.filter((_, b) => b !== a))', '      const yesterday = Math.max(...best)']),
    symptom: { args: [[[3, 4], [1, 5]]], expected: 8, buggy: 9 },
    bug: 'A rule the recurrence forgot',
    why: 'The line takes the best of all of yesterday’s cells, including the cell for the same activity. Then a total can do one activity two days running, which the problem forbids, and those forbidden totals are larger. With {call}, activity 1 is the best on both days, and the code adds 4 + 5 = {got} instead of the best allowed total, {want}.',
    fix: 'Take the best of yesterday’s cells for every other activity: max(best[b] for b in range(len(best)) if b != a). The state is “ends with activity a” exactly so that the rule can be checked here, against the previous day’s last activity.',
    clues: [
      'Work out the best plan the code found for {call}. Which activity does it do on each day?',
      'Which of yesterday’s cells is today’s activity a allowed to follow?',
      'The state remembers which activity ended the day. Where in the code is that used?',
    ],
    decoys: [
      [['best = list(rewards[0])', 'let best = [...rewards[0]]'], 'On the first day, a total ending with activity a is just its reward. Right.'],
      [['nxt.append(reward + yesterday)', 'next.push(reward + yesterday)'], 'Today’s reward on top of the best allowed yesterday. Right, if yesterday is the best allowed one.'],
      [['return max(best)', 'return Math.max(...best)'], 'The last day may end with any activity, so the answer is the best cell. Right.'],
    ],
  },

  'max-subarray': {
    know: 'end_sum is the best sum of a run that ends at the current index, and start is where that run begins. Extending the previous run adds values[i] to end_sum; starting fresh at i gives values[i]. Extending is at least as good whenever end_sum ≥ 0, and the problem asks for the earliest start among ties, so a run whose sum is exactly 0 is still extended, not dropped.',
    swap: pair(['        if end_sum >= 0:', '        if end_sum > 0:'], ['    if (endSum >= 0) {', '    if (endSum > 0) {']),
    symptom: { args: [[0, 4]], expected: [4, 0, 1], buggy: [4, 1, 1] },
    bug: 'A tie broken the wrong way',
    why: 'With end_sum > 0, a run whose sum is exactly 0 is thrown away and a new one starts at i. The sum is the same either way, so the best sum is still right, but the run now starts later. The problem breaks ties by the earliest start, and {call} returned {got} instead of {want}.',
    fix: 'Extend when end_sum ≥ 0. Adding a run worth 0 doesn’t change the sum and keeps the earlier start, which is the tie the problem asks for.',
    clues: [
      'Compare the code’s answer for {call} with the right one. Is the sum wrong, or only the indices?',
      'When the run ending before i sums to exactly 0, does extending it or restarting give the bigger sum?',
      'Read the tie rule in the problem. Which of the two choices keeps the earlier start?',
    ],
    decoys: [
      [['if end_sum > best[0]:', 'if (endSum > best[0])'], 'Only a strictly larger sum replaces the best, so among equal sums the earlier run stays. Right.'],
      [['end_sum, start = values[i], i', 'start = i'], 'Starting fresh at i: the run is values[i] alone and begins at i. Right.'],
      [['best = [values[0], 0, 0]', 'let best = [values[0], 0, 0]'], 'The first value alone is a nonempty run, so it is the best until something beats it. Right.'],
    ],
  },

  'max-product': {
    know: 'A run’s product can jump from the most negative to the most positive when it meets a negative number. So the code keeps two values for runs ending at the current index: hi, the largest product, and lo, the smallest. The next hi is the largest of v alone, hi·v and lo·v; lo·v wins when v is negative and lo is very negative.',
    swap: pair(['        candidates = (v, hi * v, lo * v)\n        hi, lo = max(candidates), min(candidates)', '        hi = max(v, hi * v)'], ['    const candidates = [v, hi * v, lo * v]\n    hi = Math.max(...candidates)\n    lo = Math.min(...candidates)', '    hi = Math.max(v, hi * v)']),
    symptom: { args: [[4, -2, -3]], expected: 24, buggy: 6 },
    bug: 'Keeping only the largest',
    why: 'The code carries only the largest product ending at each index. At −2 the run 4·(−2) = −8 is the smallest product, and it is thrown away because it is not the largest. Then at −3 the product −8·(−3) = 24 can’t be formed. With {call}, the code returned {got} instead of {want}.',
    fix: 'Keep the smallest product too, and compute both from the same three candidates: v, hi·v and lo·v. The new hi is the largest of them and the new lo the smallest; work them out before storing either.',
    clues: [
      'Write the product of every run of {call}. Which run is the best, and what is its product one step before the end?',
      'Multiplying by a negative number turns the smallest product into the largest. Which variable could hold that smallest product?',
      'Print hi after each value. At which value does it miss the best run?',
    ],
    decoys: [
      [['best = max(best, hi)', 'best = Math.max(best, hi)'], 'The best run ends somewhere, and hi is the best run ending here. Right.'],
      [['hi = lo = best = values[0]', 'let hi = values[0], lo = values[0], best = values[0]'], 'The first value alone is the only run ending at index 0. Right.'],
    ],
  },

  'word-break': {
    know: 'ok[i] says whether the first i characters can be cut into words. The last piece is some word w ending at i, and that cut works only if w matches the end and the part before it, the first i − len(w) characters, can itself be cut: ok[i − len(w)]. Both must hold.',
    swap: pair(['            if len(w) <= i and ok[i - len(w)] and s[i - len(w):i] == w:', '            if len(w) <= i and s[i - len(w):i] == w:'], ['      if (w.length <= i && ok[i - w.length] && s.slice(i - w.length, i) === w) {', '      if (w.length <= i && s.slice(i - w.length, i) === w) {']),
    symptom: { args: ['ba', ['a']], expected: false, buggy: true },
    bug: 'Checking the last piece but not what is before it',
    why: 'The test asks only whether the string ends with a word. It never asks whether the part before that word can be cut, so any string that ends with a word passes. With {call}, "ba" ends with "a", so ok[2] becomes true although "b" is not a word: {got} instead of {want}.',
    fix: 'Require ok[i − len(w)] as well: the last piece must be a word and the prefix before it must be cuttable. That is what makes the table a chain of cuts from the start of the string.',
    clues: [
      'Print ok for {call}. Which cell is true that shouldn’t be?',
      'For ok[i] to be true, what has to be true about the characters before the last word?',
      'Which cell of ok does the test read? Which one should it read?',
    ],
    decoys: [
      [['ok = [True] + [False] * len(s)', 'const ok = [true, ...Array(s.length).fill(false)]'], 'The empty string can always be cut, so ok[0] is true. Right.'],
      [['break', 'break'], 'Once one word gives a cut, ok[i] is true; trying more words changes nothing. Right.'],
      [['return ok[len(s)]', 'return ok[s.length]'], 'ok[len(s)] says whether the whole string can be cut. Right.'],
    ],
  },

  'word-break-count': {
    know: 'count[i] is the number of ways to cut the first i characters into words. Sort the cuttings by their last word: each word w that ends the prefix brings count[i − len(w)] cuttings, one for each way to cut what is before it. The groups don’t overlap, so count[i] is the sum over every word that matches.',
    swap: pair(['                count[i] += count[i - len(w)]', '                count[i] += count[i - len(w)]\n                break'], ['      if (w.length <= i && s.slice(i - w.length, i) === w) count[i] += count[i - w.length]', '      if (w.length <= i && s.slice(i - w.length, i) === w) {\n        count[i] += count[i - w.length]\n        break\n      }']),
    symptom: { args: ['aa', ['a', 'aa']], expected: 2, buggy: 1 },
    bug: 'Stopping at the first way',
    why: 'The break leaves the word loop as soon as one word matches, which is right when the question is “can it be cut?” (one way is enough) but wrong when the question is “how many ways?”. Every later word that also ends the prefix is skipped, with all its cuttings. With {call}, "aa" can end in "a" or in "aa"; the code stops after "a" and returned {got} instead of {want}.',
    fix: 'Remove the break. A count must add every group: each word that matches the end of the prefix adds count[i − len(w)].',
    clues: [
      'List the cuttings of {call} by hand. Which one does the code miss?',
      'Print count for {call}. At which cell does it fall short?',
      'This code was adapted from the yes/no word break. What did that version do once it found a word, and is that right for a count?',
    ],
    decoys: [
      [['count = [1] + [0] * len(s)', 'const count = [1, ...Array(s.length).fill(0)]'], 'The empty string has one cutting, the one with no words, so count[0] = 1. Right.'],
      [['for w in words:', 'for (const w of words)'], 'Any word could be the last piece, so every word is tried. Right.'],
      [['return count[len(s)]', 'return count[s.length]'], 'count[len(s)] counts the cuttings of the whole string. Right.'],
    ],
  },

  'grid-paths': {
    know: 'paths[r][c] counts the paths from the top-left to (r, c). Sort them by their last move: it came from above, from the left, or diagonally from the upper left. Those three groups don’t overlap and cover every path, so paths[r][c] is the sum of the three neighbours’ counts.',
    swap: pair(['            paths[r][c] = from_above + from_left + from_diagonal', '            paths[r][c] = from_above + from_left'], ['      paths[r][c] = fromAbove + fromLeft + fromDiagonal', '      paths[r][c] = fromAbove + fromLeft']),
    symptom: { args: [2, 2], expected: 3, buggy: 2 },
    bug: 'A last move left out',
    why: 'The sum adds the paths whose last move came from above or from the left, but not the ones that arrived diagonally. Every path ending with a diagonal move is lost, and the losses grow from cell to cell. With {call}, the three paths are right then down, down then right, and the single diagonal: the code counted {got} instead of {want}.',
    fix: 'Add the third group: paths[r][c] = from_above + from_left + from_diagonal. A recurrence must have one term for every move that can end a path.',
    clues: [
      'List the paths across a 2 × 2 grid by hand. Which one is missing from the count?',
      'Which moves can be the last move into a cell? Is each one in the sum?',
      'Is there a value the code works out and then never uses?',
    ],
    decoys: [
      [['paths[r][c] = 1', 'paths[r][c] = 1'], 'There is one path to the start: stay there. Right.'],
      [['from_above = paths[r - 1][c] if r > 0 else 0', 'const fromAbove = r > 0 ? paths[r - 1][c] : 0'], 'The paths arriving from above, or none in the top row. Right.'],
      [['from_diagonal = paths[r - 1][c - 1]', 'const fromDiagonal = r > 0 && c > 0 ? paths[r - 1][c - 1] : 0'], 'The paths arriving diagonally from the upper left, or none on the top row and left column. This line is right.'],
    ],
  },

  'min-grid-path': {
    know: 'best[r][c] holds two numbers: the lowest cost of a path to (r, c), and how many paths have exactly that cost. A path arrives from above or from the left. The lowest cost here comes from the cheaper neighbour; the count adds the counts of every neighbour whose cost equals that lowest one, because only those paths are cheapest here.',
    swap: pair(['            count = sum(n for cost, n in came if cost == low)', '            count = sum(n for cost, n in came)'], ['      const count = came.filter(([cost]) => cost === low).reduce((sum, [, n]) => sum + n, 0)', '      const count = came.reduce((sum, [, n]) => sum + n, 0)']),
    symptom: { args: [[[1, 1], [3, 3]]], expected: [5, 1], buggy: [5, 2] },
    bug: 'Counting paths that aren’t the cheapest',
    why: 'The count adds the counts of both neighbours, whatever their costs. Paths through the dearer neighbour are counted as if they had the lowest cost. With {call}, right then down costs 5 and down then right costs 7, but both are counted: {got} instead of {want}. The cost is right; only the count is wrong.',
    fix: 'Add only the neighbours whose cost equals the lowest: sum(n for cost, n in came if cost == low). A count that goes with a minimum counts the ways to reach that minimum, nothing else.',
    clues: [
      'List the paths of {call} and their costs. How many have the lowest cost?',
      'Is the cost part of the answer right? Then the bug is in the count.',
      'When the two neighbours have different costs, how many of their paths can be cheapest here?',
    ],
    decoys: [
      [['low = min(cost for cost, _ in came)', 'const low = Math.min(...came.map(([cost]) => cost))'], 'The cheapest way here comes through the cheaper neighbour. Right.'],
      [['best[r][c] = [low + grid[r][c], count]', 'best[r][c] = [low + grid[r][c], count]'], 'The lowest cost adds this cell’s own value. Right.'],
      [['best[r][c] = [grid[0][0], 1]', 'best[r][c] = [grid[0][0], 1]'], 'The start costs its own value, and there is one path that is just the start. Right.'],
    ],
  },

  'triangle-path': {
    know: 'below[i] is the smallest sum of a path from position i of the row below down to the bottom. Working up from the bottom row, a number at position i can step only to position i or i + 1 of the row beneath it, so its best path adds the smaller of below[i] and below[i + 1].',
    swap: pair(['        below = [v + min(below[i], below[i + 1]) for i, v in enumerate(row)]', '        below = [v + min(below) for v in row]'], ['    below = triangle[r].map((v, i) => v + Math.min(below[i], below[i + 1]))', '    below = triangle[r].map(v => v + Math.min(...below))']),
    symptom: { args: [[[1], [2, 7], [6, 9, 4]]], expected: 9, buggy: 7 },
    bug: 'A move the rules don’t allow',
    why: 'Each number adds the smallest value anywhere in the row below, not one of the two it can step to. A path can then jump sideways across the triangle. With {call}, the code goes 1, 2, then jumps to the 4, which is not below the 2: {got} instead of {want}.',
    fix: 'Read only the two cells a step can reach: min(below[i], below[i + 1]). Which cells a recurrence may read is decided by the moves the problem allows.',
    clues: [
      'Write out the path the code’s answer for {call} must follow. Is every step allowed?',
      'From position i, which two positions of the next row can you step to?',
      'Which cells of below does the line read for position i?',
    ],
    decoys: [
      [['below = list(triangle[-1])', 'let below = [...triangle[triangle.length - 1]]'], 'From the bottom row, the path is just the number itself. Right.'],
      [['for row in reversed(triangle[:-1]):', 'for (let r = triangle.length - 2; r >= 0; r--)'], 'Work upwards from the row above the bottom, so the row below is always finished. Right.'],
      [['return below[0]', 'return below[0]'], 'After the top row, below[0] is the best path from the top. Right.'],
    ],
  },

  'grid-resources': {
    know: 'ways[r][c][b] counts the paths to (r, c) that have paid exactly b tolls. Entering a cell costs its toll, so the paths that pay b here are the ones that had paid b − cost at the neighbour above or to the left. The problem asks for paths that pay at most budget, so the answer adds the last cell’s counts for every b from 0 to budget.',
    swap: pair(['    return sum(ways[rows - 1][cols - 1])', '    return ways[rows - 1][cols - 1][budget]'], ['  return ways[rows - 1][cols - 1].reduce((sum, n) => sum + n, 0)', '  return ways[rows - 1][cols - 1][budget]']),
    symptom: { args: [[[0]], 1], expected: 1, buggy: 0 },
    bug: '“Exactly” read where the question says “at most”',
    why: 'The table counts paths by the exact number of tolls paid, and the last line reads only the cell for exactly budget tolls. Paths that pay fewer tolls are within the budget too, and they are all left out. With {call}, the only path pays 0 tolls, so it sits in the b = 0 cell and the code returned {got} instead of {want}.',
    fix: 'Add the last cell’s counts over every b from 0 to budget: sum(ways[rows − 1][cols − 1]). When the state counts “exactly b” and the question asks “at most budget”, the answer is a sum over the states.',
    clues: [
      'Say what ways[r][c][b] means, with the word “exactly” or “at most” in it.',
      'For {call}, how many tolls does the path pay? Which cell of ways is that path counted in?',
      'Print ways for the last cell. Which of its numbers does the last line read?',
    ],
    decoys: [
      [['for b in range(cost, budget + 1):', 'for (let b = cost; b <= budget; b++)'], 'A path that has paid b here paid b − cost before, so b starts at this cell’s cost. Right.'],
      [['ways[r][c][b] = above + left', 'ways[r][c][b] = above + left'], 'A path arrives from above or from the left. Right.'],
      [['ways[r][c][b] = 1 if b == cost else 0', 'ways[r][c][b] = b === cost ? 1 : 0'], 'The path that is just the start has paid the start’s toll and nothing else. Right.'],
    ],
  },

  'grid-direction': {
    know: 'best[r][c][d] is the lowest cost to reach (r, c) with the last move in direction d: d = 0 means it came from above (a move down), d = 1 from the left (a move right). Arriving in direction d from the cell before, the move before was either the same direction (no charge) or the other one (a turn, which costs turn). So straight reads that cell’s [d], and turned reads its [1 − d] plus turn.',
    swap: pair(['                    straight = best[pr][pc][d]\n                    turned = best[pr][pc][1 - d] + turn', '                    straight = best[pr][pc][1 - d]\n                    turned = best[pr][pc][d] + turn'], ['          const straight = best[pr][pc][d]\n          const turned = best[pr][pc][1 - d] + turn', '          const straight = best[pr][pc][1 - d]\n          const turned = best[pr][pc][d] + turn']),
    symptom: { args: [[[0, 0, 0]], 4], expected: 0, buggy: 4 },
    bug: 'The state’s two halves mixed up',
    why: 'The code charges the turn when the previous move went the same way, and charges nothing when the direction changed. The table is right only when the indices mean what the state says. With {call}, the path goes right twice, which has no turn, but the second move is charged one: {got} instead of {want}.',
    fix: 'Going straight means the previous move had the same direction d, so straight = best[pr][pc][d]; a turn means it had the other one, so turned = best[pr][pc][1 − d] + turn.',
    clues: [
      'Trace {call} by hand. How many turns does the only path make?',
      'Say in words what best[pr][pc][d] means. Is arriving in direction d after it a turn?',
      'Which of the two lines charges the turn, and which index does it read?',
    ],
    decoys: [
      [['before = min(straight, turned)', 'before = Math.min(straight, turned)'], 'The cheaper of arriving straight or after a turn. Right, if each one is computed correctly.'],
      [['best[r][c][d] = before + grid[r][c]', 'best[r][c][d] = before + grid[r][c]'], 'Entering the cell adds its cost. Right.'],
      [['return min(best[rows - 1][cols - 1])', 'return Math.min(...best[rows - 1][cols - 1])'], 'The last cell may be reached either way, so the answer is the cheaper one. Right.'],
    ],
  },

  'grid-multiagent': {
    know: 'here[a][b] is the most the two robots can still collect from row r down, when robot one is in column a and robot two in column b. The row adds the values under both robots, but a cell they share is collected once, so when a = b it adds grid[r][a] only once. Then it adds the best of the nine cells of the row below the pair can move to.',
    swap: pair(['                collected = grid[r][a] if a == b else grid[r][a] + grid[r][b]', '                collected = grid[r][a] + grid[r][b]'], ['        const collected = a === b ? grid[r][a] : grid[r][a] + grid[r][b]', '        const collected = grid[r][a] + grid[r][b]']),
    symptom: { args: [[[7]]], expected: 7, buggy: 14 },
    bug: 'One cell counted twice',
    why: 'The code always adds the values under both robots, so when they stand on the same cell it collects that cell twice. The problem says a shared cell counts once. With {call}, both robots start on the single cell and the code collects its 7 twice: {got} instead of {want}.',
    fix: 'When a == b, add grid[r][a] once: collected = grid[r][a] if a == b else grid[r][a] + grid[r][b].',
    clues: [
      'In {call}, where do the two robots start?',
      'Read the problem again: what happens to a cell both robots visit?',
      'Which line adds the values of the current row, and does it treat a = b differently?',
    ],
    decoys: [
      [['for x in (a - 1, a, a + 1)', 'for (const x of [a - 1, a, a + 1])'], 'Robot one moves straight down or one cell diagonally. Right.'],
      [['here[a][b] = collected + best_next', 'here[a][b] = collected + bestNext'], 'This row’s value plus the best the pair can still collect below. Right, if collected is right.'],
      [['return below[0][cols - 1]', 'return below[0][cols - 1]'], 'The robots start in the leftmost and rightmost cells of the top row. Right.'],
    ],
  },

  'unbounded-knapsack': {
    know: 'best[c] is the largest value that fits in capacity c, with repeats allowed. The last item packed was some item (w, v), and what is under it is the best packing of capacity c − w: best[c − w] + v. That reads a smaller capacity, so the smaller capacities must be finished first, which means c goes up from 1.',
    swap: pair(['    for c in range(1, capacity + 1):', '    for c in range(capacity, 0, -1):'], ['  for (let c = 1; c <= capacity; c++) {', '  for (let c = capacity; c >= 1; c--) {']),
    symptom: { args: [[3], [4], 7], expected: 8, buggy: 4 },
    bug: 'Reading a cell before it is filled',
    why: 'The loop fills the large capacities first. When best[c] reads best[c − w], that smaller cell hasn’t been filled yet and still holds its starting 0, so every capacity can hold only one item. With {call}, best[7] reads best[4] while it is still 0 and gets 4, one item, instead of two: {got} instead of {want}.',
    fix: 'Fill the capacities from small to large: for c in range(1, capacity + 1). A cell may only read cells that are already finished, and this recurrence reads smaller capacities. (In the 0/1 knapsack the capacity loop runs down for a different reason, and it sits inside a loop over the items.)',
    clues: [
      'Print best after the loop for {call}. Does any capacity hold more than one item?',
      'When best[7] reads best[4], has best[4] been computed yet?',
      'Which cells does the recurrence read, and in which order does the loop fill them?',
    ],
    decoys: [
      [['best = [0] * (capacity + 1)', 'const best = Array(capacity + 1).fill(0)'], 'An empty knapsack is worth 0, and “at most c” means an unfilled capacity is fine. Right.'],
      [['best[c] = max(best[c], best[c - w] + v)', 'best[c] = Math.max(best[c], best[c - weights[i]] + values[i])'], 'The last item packed sits on top of the best packing of the room left. Right, if that packing is finished.'],
      [['return best[capacity]', 'return best[capacity]'], 'best[capacity] is the best that fits in the whole knapsack. Right.'],
    ],
  },

  'equal-partition': {
    know: 'reach[s] says whether some of the values seen so far add up to exactly s. Adding a value v can only make more sums reachable: every sum that was reachable stays reachable (leave v out), and s becomes reachable if s − v was (put v in). The best split puts the largest reachable sum up to half in one group.',
    swap: pair(['            if reach[s - v]:\n                reach[s] = True', '            reach[s] = reach[s - v]'], ['      if (reach[s - v]) reach[s] = true', '      reach[s] = reach[s - v]']),
    symptom: { args: [[3, 3, 2]], expected: 2, buggy: 4 },
    bug: 'A yes overwritten by a no',
    why: 'reach[s] = reach[s − v] replaces the old answer instead of adding to it. A sum that was reachable without v becomes unreachable whenever s − v is not reachable, which forgets the choice of leaving v out. With {call}, the first 3 makes 3 reachable, then the 2 overwrites reach[3] with reach[1], false, so the best sum up to half drops to 2: {got} instead of {want}.',
    fix: 'Only ever set cells to true: if reach[s − v], then reach[s] = True. In one line that is reach[s] = reach[s] or reach[s − v]: leave v out, or put it in.',
    clues: [
      'Print reach after each value. Does a sum that was true ever become false?',
      'After a new value v, is a sum you could already make still possible?',
      'The recurrence has two choices for v: leave it out or put it in. Which one does the line forget?',
    ],
    decoys: [
      [['half = total // 2', 'const half = Math.floor(total / 2)'], 'The smaller group holds at most half the total, so sums up to half are enough. Right.'],
      [['for s in range(half, v - 1, -1):', 'for (let s = half; s >= v; s--)'], 'Downwards, so reach[s − v] still means “without v”, and each value is used once. Right.'],
      [['return total - 2 * best', 'return total - 2 * best'], 'One group holds best, the other total − best, and the difference is total − 2·best. Right.'],
    ],
  },

  'target-signs': {
    know: 'counts maps each running total to the number of sign choices that reach it. Every value gets a sign, + or −, so each total splits into total + v and total − v, and each carries all its ways. For a 0 both choices give the same total, but they are still two different sign choices, and the problem says to count both.',
    swap: pair(['            nxt[total - v] = nxt.get(total - v, 0) + ways', '            if v != 0:\n                nxt[total - v] = nxt.get(total - v, 0) + ways'], ['      next.set(total - v, (next.get(total - v) ?? 0) + ways)', '      if (v !== 0) next.set(total - v, (next.get(total - v) ?? 0) + ways)']),
    symptom: { args: [[0], 0], expected: 2, buggy: 1 },
    bug: 'Two choices counted as one',
    why: 'The code skips the minus sign for a 0, because +0 and −0 reach the same total. But the problem counts sign choices, not totals: +0 and −0 are two choices. With {call}, both signs make 0 and the code counted one: {got} instead of {want}.',
    fix: 'Give every value both signs, 0 included. When two choices land on the same total, the get(…, 0) + ways in each line adds their ways together, which is exactly the count the problem wants.',
    clues: [
      'Read the problem again: what does it say about a 0?',
      'How many sign choices are there for {call}? Write them out.',
      'Is there a line that treats some value differently from the others?',
    ],
    decoys: [
      [['nxt[total + v] = nxt.get(total + v, 0) + ways', 'next.set(total + v, (next.get(total + v) ?? 0) + ways)'], 'The + sign: the new total adds every way of the old one. Right.'],
      [['counts = {0: 1}', 'let counts = new Map([[0, 1]])'], 'Before any value there is one way to have total 0. Right.'],
      [['return counts.get(target, 0)', 'return counts.get(target) ?? 0'], 'The number of ways to reach target, or 0 if none does. Right.'],
    ],
  },

  'coin-permutations': {
    know: 'ways[a] counts the ordered sequences of coins adding up to a. Sort them by their last coin c: the coins before it are any sequence adding up to a − c. So ways[a] adds ways[a − c] for every coin, and ways[a − c] must already count every order. That needs the amount loop outside: when a is filled, every smaller amount is finished with all the coins.',
    swap: pair(['    for a in range(1, amount + 1):\n        for c in coins:', '    for c in coins:\n        for a in range(1, amount + 1):'], ['  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {', '  for (const c of coins) {\n    for (let a = 1; a <= amount; a++) {']),
    symptom: { args: [[1, 2], 3], expected: 3, buggy: 2 },
    bug: 'Loops nested the other way round',
    why: 'With the coin loop outside, ways[a − c] is read before the later coins have been added to it, so a sequence can only use coins in the order they are listed: all the 1s, then all the 2s. Each set of coins is counted once instead of once per order, which is the coin combinations count. With {call}, 1 + 2 is counted but 2 + 1 is not: {got} instead of {want}.',
    fix: 'Put the amount loop outside and the coin loop inside. Then ways[a − c] is complete, every order of every coin, before ways[a] reads it.',
    clues: [
      'List the sequences for {call} by hand. Which one does the code leave out?',
      'When ways[3] reads ways[1] for the coin 2, has ways[1] counted the coin 1 yet? When ways[3] reads ways[2] for the coin 1, has ways[2] counted the coin 2?',
      'Which lesson counts the same coins once, whatever their order? How are its loops nested?',
    ],
    decoys: [
      [['ways = [1] + [0] * amount', 'const ways = [1, ...Array(amount).fill(0)]'], 'The amount 0 has one sequence, the empty one. Right.'],
      [['ways[a] += ways[a - c]', 'ways[a] += ways[a - c]'], 'A sequence ending with coin c is a sequence for a − c with c on the end. Right.'],
      [['return ways[amount]', 'return ways[amount]'], 'ways[amount] counts the sequences for the whole amount. Right.'],
    ],
  },

  'value-knapsack': {
    know: 'lightest[t] is the smallest total weight of items worth exactly t, or ∞ if no choice is worth exactly t. The answer is the largest t whose lightest weight fits. lightest is not in increasing order: some values can’t be made at all (∞ sits between smaller numbers), and a higher value can be lighter than a lower one. So every t must be checked.',
    swap: pair(['    return max(t for t in range(total + 1) if lightest[t] <= capacity)', '    t = 0\n    while t < total and lightest[t + 1] <= capacity:\n        t += 1\n    return t'], ['  let t = total\n  while (lightest[t] > capacity) t--', '  let t = 0\n  while (t < total && lightest[t + 1] <= capacity) t++']),
    symptom: { args: [[6], [4], 9], expected: 4, buggy: 0 },
    bug: 'Treating the table as sorted',
    why: 'The code walks up from t = 0 and stops at the first value that doesn’t fit, as if every larger value were heavier. But a value that can’t be made at all has lightest = ∞, and values above it may still fit. With {call}, the one item is worth 4, so values 1, 2 and 3 can’t be made; the walk stops at 1 and returned {got} instead of {want}.',
    fix: 'Look at every t and take the largest whose lightest weight fits: max(t for t in range(total + 1) if lightest[t] <= capacity), or walk down from total and stop at the first that fits.',
    clues: [
      'Print lightest for {call}. Is it increasing?',
      'Which values can be made with exactly the items in {call}?',
      'Where does the loop that finds the answer stop, and what could lie beyond it?',
    ],
    decoys: [
      [['lightest[t] = min(lightest[t], lightest[t - v] + w)', 'lightest[t] = Math.min(lightest[t], lightest[t - values[i]] + weights[i])'], 'Worth exactly t: without this item, or with it on top of value t − v. Right.'],
      [["lightest = [0] + [float('inf')] * total", 'const lightest = [0, ...Array(total).fill(Infinity)]'], 'Value 0 weighs nothing; no other value can be made before any item is added. Right.'],
      [['for t in range(total, v - 1, -1):', 'for (let t = total; t >= values[i]; t--)'], 'Downwards, so each item is used at most once. Right.'],
    ],
  },

  'multidimensional-knapsack': {
    know: 'best[a][b] is the largest value that fits in weight a and volume b. An item [w, vol, value] uses both: taking it leaves best[a − w][b − vol] for the rest. Each limit needs its own index in the state, and taking an item must subtract from both of them.',
    swap: pair(['                best[a][b] = max(best[a][b], best[a - w][b - vol] + value)', '                best[a][b] = max(best[a][b], best[a - w][b] + value)'], ['        best[a][b] = Math.max(best[a][b], best[a - w][b - vol] + value)', '        best[a][b] = Math.max(best[a][b], best[a - w][b] + value)']),
    symptom: { args: [[[3, 2, 4], [1, 1, 3]], 4, 2], expected: 4, buggy: 7 },
    bug: 'A resource never charged',
    why: 'Taking the item reads best[a − w][b], the packing with the item’s weight removed but all of the volume still there. The volume is checked for this one item (b ≥ vol) but never used up, so several items can share the same volume. With {call}, both items fit by weight, 3 + 1 = 4, but their volumes add up to 3 and only 2 fit: the code took both, {got} instead of {want}.',
    fix: 'Subtract the volume too: best[a − w][b − vol] + value. Every resource in the state must be reduced by what the item uses.',
    clues: [
      'Find the items in the code’s answer for {call}. Do they fit both limits?',
      'After taking an item, how much weight is left? How much volume?',
      'Which cell does taking an item read? Is each of its two indices reduced?',
    ],
    decoys: [
      [['for a in range(cap_weight, w - 1, -1):', 'for (let a = capWeight; a >= w; a--)'], 'Downwards over weight, so each item is taken at most once. Right.'],
      [['for b in range(cap_volume, vol - 1, -1):', 'for (let b = capVolume; b >= vol; b--)'], 'Only volumes that can hold the item. Right.'],
      [['return best[cap_weight][cap_volume]', 'return best[capWeight][capVolume]'], 'The full weight and volume limits. Right.'],
    ],
  },

  'group-knapsack': {
    know: 'best[c] is the largest value fitting in capacity c using the groups so far. For a new group, best[c] starts as old[c] (take nothing from the group) and each option (w, v) may improve it with old[c − w] + v. The comparison must be against best[c], the best found so far for this group, so the best option wins, not the last one.',
    swap: pair(['                    best[c] = max(best[c], old[c - w] + v)', '                    best[c] = max(old[c], old[c - w] + v)'], ['        if (w <= c) best[c] = Math.max(best[c], old[c - w] + v)', '        if (w <= c) best[c] = Math.max(old[c], old[c - w] + v)']),
    symptom: { args: [[[[1, 6], [1, 5]]], 1], expected: 6, buggy: 5 },
    bug: 'Compared with the wrong running best',
    why: 'Each option compares itself with old[c], the value before this group, not with best[c], which already holds the better options of this group. So every option that fits overwrites the one before it, and the group’s last option wins even when an earlier one was better. With {call}, the option worth 6 is replaced by the one worth 5: {got} instead of {want}.',
    fix: 'Compare with best[c]: best[c] = max(best[c], old[c − w] + v). Read old for “the groups before”, and best for “the best so far in this group”.',
    clues: [
      'Print best after each option of the group in {call}. Does it ever go down?',
      'Which two things should the max choose between: the best so far, or the value before the group?',
      'old and best appear in the same line. Which of the two should each read be?',
    ],
    decoys: [
      [['old = best[:]', 'const old = [...best]'], 'A real copy of the table before this group, so only one option of the group is taken. Right.'],
      [['for w, v in group:', 'for (const [w, v] of group)'], 'Every option in the group is a candidate. Right.'],
      [['return best[capacity]', 'return best[capacity]'], 'The best value in the full capacity. Right.'],
    ],
  },

  'exact-capacity': {
    know: 'best[c] is the largest value of items whose weights add up to exactly c, or −∞ if no choice does. Before any item, only c = 0 can be filled exactly (by nothing, worth 0); every other capacity starts at −∞, “impossible”. A cell becomes possible only when an item lands on a cell that already was.',
    swap: pair(['    best = [0] + [none] * capacity', '    best = [0] * (capacity + 1)'], ['  const best = [0, ...Array(capacity).fill(-Infinity)]', '  const best = Array(capacity + 1).fill(0)']),
    symptom: { args: [[1], [7], 5], expected: -1, buggy: 7 },
    bug: 'Every capacity starting as filled',
    why: 'Starting every cell at 0 says “capacity c can be filled exactly, with value 0”, which is true only for c = 0. Then an item can land on empty room and look like an exact fill. With {call}, the one item weighs 1, so nothing fills 5 exactly, but best[5] reads best[4] = 0 and becomes 7: {got} instead of {want}. That is the “at most” knapsack.',
    fix: 'Start only best[0] at 0 and every other cell at −∞: best = [0] + [−∞] * capacity. An impossible cell stays −∞ through max and +, so it can never pass itself off as a real fill.',
    clues: [
      'Can {call} fill 5 exactly? Then where does the code’s value come from?',
      'Before any item, which capacities can be filled exactly?',
      'Which value in the table means “impossible”, and which cells start with it?',
    ],
    decoys: [
      [['best[c] = max(best[c], best[c - w] + v)', 'best[c] = Math.max(best[c], best[c - weights[i]] + values[i])'], 'Without the item, or with it on top of an exact fill of c − w. Right, if impossible cells are marked.'],
      [['for c in range(capacity, w - 1, -1):', 'for (let c = capacity; c >= weights[i]; c--)'], 'Downwards, so each item is used once. Right.'],
      [['return -1 if best[capacity] == none else best[capacity]', 'return best[capacity] === -Infinity ? -1 : best[capacity]'], 'An impossible fill is reported as −1. Right.'],
    ],
  },

  'rod-cutting': {
    know: 'best[length] is the most a rod of that length can make. The first piece cut off has some length k and sells for prices[k − 1]; what is left is a rod of length − k, sold as well as possible, best[length − k]. The answer for length is the best of those options over every k that can be sold.',
    swap: pair(['            options.append(prices[k - 1] + best[length - k])', '            options.append(prices[k - 1] + best[k])'], ['      most = Math.max(most, prices[k - 1] + best[length - k])', '      most = Math.max(most, prices[k - 1] + best[k])']),
    symptom: { args: [[1], 3], expected: 3, buggy: 2 },
    bug: 'The rest read from the wrong cell',
    why: 'After cutting off a piece of length k, the code adds best[k], the value of another rod as long as the piece, instead of best[length − k], the value of what is left. The pieces then don’t add up to the rod. With {call}, every option reads best[1], so the rod of 3 is priced as two pieces of 1: {got} instead of {want}.',
    fix: 'Add the best price for the rest: prices[k − 1] + best[length − k]. Check that an option’s pieces add up: k + (length − k) = length.',
    clues: [
      'Print best for {call}. Which cell is the first to be wrong?',
      'Cut a piece of length k off a rod of length length. How long is what’s left?',
      'Which cell of best should an option read?',
    ],
    decoys: [
      [['best = [0] * (n + 1)', 'const best = Array(n + 1).fill(0)'], 'A rod of length 0 sells for nothing. Right.'],
      [['for k in range(1, min(length, len(prices)) + 1):', 'for (let k = 1; k <= Math.min(length, prices.length); k++)'], 'The first piece is at most the whole rod, and only lengths with a price can be sold. Right.'],
      [['best[length] = max(options)', 'best[length] = most'], 'The best of the options. Right, if each option is.'],
    ],
  },

  binomial: {
    know: 'The code builds Pascal’s triangle one row at a time: row n holds C(n, 0), …, C(n, n). Each inner entry is the sum of the two above it, C(n, k) = C(n − 1, k − 1) + C(n − 1, k), and both ends are 1. It starts from row 0, which is [1] (one way to choose nothing from nothing), and after n new rows it holds row n.',
    swap: pair(['    row = [1]\n    for _ in range(n):', '    row = [1, 1]\n    for _ in range(n):'], ['  let row = [1]', '  let row = [1, 1]']),
    symptom: { args: [2, 1], expected: 2, buggy: 3 },
    bug: 'Starting one row late',
    why: 'The table starts from [1, 1], which is row 1, not row 0. The loop still builds n more rows, so it ends on row n + 1 and returns C(n + 1, k). With {call}, it reads C(3, 1) instead of C(2, 1): {got} instead of {want}.',
    fix: 'Start from row 0: row = [1]. Then after the loop has run n times, row is row n. Check a start value by its meaning: [1] is “from 0 items, choose 0 in one way”.',
    clues: [
      'Print row after each pass. Which row of Pascal’s triangle is it, by its length?',
      'How many passes does the loop make, and which row should it end on?',
      'Which row of the triangle is [1, 1]?',
    ],
    decoys: [
      [['row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]', 'next.push(row[j] + row[j + 1])'], 'Each inner entry is the sum of the two above it. Right.'],
      [['if k < 0 or k > n:', 'if (k < 0 || k > n)'], 'No way to choose fewer than 0 or more than n. Right.'],
      [['return row[k]', 'return row[k]'], 'Entry k of row n is C(n, k). Right, if row is row n.'],
    ],
  },

  catalan: {
    know: 'c[m] counts the balanced strings of m pairs. Split on the pair that the first “(” opens: inside it is a balanced string of k pairs, and after its “)” comes a balanced string of the rest. The outer pair itself is one of the m pairs, so the rest has m − 1 − k pairs, and c[m] adds c[k]·c[m − 1 − k] for k from 0 to m − 1.',
    swap: pair(['            c[m] += c[k] * c[m - 1 - k]', '            c[m] += c[k] * c[m - k]'], ['      c[m] += c[k] * c[m - 1 - k]', '      c[m] += c[k] * c[m - k]']),
    symptom: { args: [2], expected: 2, buggy: 0 },
    bug: 'Not counting the pair you split on',
    why: 'The code gives the part after the outer pair m − k pairs, forgetting that the outer pair is one of the m. The pieces then add up to m + 1 pairs, and for k = 0 the term reads c[m] itself, which is still 0. Nothing ever becomes nonzero after c[0]: {call} returned {got} instead of {want}.',
    fix: 'The outer pair uses one pair, so the rest has m − 1 − k: c[m] += c[k] * c[m − 1 − k]. Check that the pieces add up: 1 + k + (m − 1 − k) = m.',
    clues: [
      'Print c for {call}. Which cell is the first to be wrong?',
      'Split ()() and (()) on their first pair. How many pairs are inside it, and how many after it?',
      'For k = 0, which cell does the line read? Has it been computed yet?',
    ],
    decoys: [
      [['c = [1] + [0] * n', 'const c = [1, ...Array(n).fill(0)]'], 'The empty string is the one balanced string of 0 pairs. Right.'],
      [['for k in range(m):', 'for (let k = 0; k < m; k++)'], 'Inside the first pair there can be 0 to m − 1 pairs. Right.'],
      [['return c[n]', 'return c[n]'], 'c[n] counts the strings of n pairs. Right.'],
    ],
  },

  'balanced-parentheses': {
    know: 'ways[depth] counts the ways to fill the prefix read so far so that it is open by depth brackets, never going below 0. A “(” moves every count one deeper, a “)” one shallower (not below 0), and a “?” does both. A balanced string ends with every bracket closed, so the answer is ways[0] alone.',
    swap: pair(['    return ways[0]', '    return sum(ways)'], ['  return ways[0]', '  return ways.reduce((sum, w) => sum + w, 0)']),
    symptom: { args: ['('], expected: 0, buggy: 1 },
    bug: 'Counting strings that are still open',
    why: 'The answer adds the counts at every depth, so a filling that never dips below 0 but ends with brackets still open is counted as balanced. With {call}, the one filling ends at depth 1, an unclosed “(”, and the code counted it: {got} instead of {want}.',
    fix: 'Return ways[0]: only fillings that end at depth 0 have every bracket closed. The state is the depth exactly so that the end can ask for 0.',
    clues: [
      'Is "(" balanced? What does the code count for it?',
      'Print ways at the end. Which depth do balanced fillings end at?',
      'Which cells does the last line read?',
    ],
    decoys: [
      [["if ch in '(?' and depth + 1 <= n:", "if (ch !== ')' && depth + 1 <= n)"], 'A “(” or a “?” used as “(” opens one more. Right.'],
      [["if ch in ')?' and depth > 0:", "if (ch !== '(' && depth > 0)"], 'A “)” or a “?” used as “)” closes one, only if one is open. Right.'],
      [['ways = [1] + [0] * n', 'let ways = [1, ...Array(n).fill(0)]'], 'Before any character there is one way, at depth 0. Right.'],
    ],
  },

  stirling: {
    know: 'S(i, j) counts the ways to split items 1 to i into j groups. Look at item i: either it is alone in a new group (the others make j − 1 groups: S(i − 1, j − 1)), or it joins one of the j groups the other items already make. In the second case it has j groups to choose from, and each choice is a different split, so that term is j·S(i − 1, j).',
    swap: pair(['            s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]', '            s[i][j] = s[i - 1][j - 1] + s[i - 1][j]'], ['      s[i][j] = s[i - 1][j - 1] + j * s[i - 1][j]', '      s[i][j] = s[i - 1][j - 1] + s[i - 1][j]']),
    symptom: { args: [3, 2], expected: 3, buggy: 2 },
    bug: 'A choice counted as one way',
    why: 'The second term counts the splits where item i joins an existing group, but it counts each split of the other items once, as if the item had only one group to join. It can join any of the j, and each gives a different split. With {call}, items 1 and 2 split as {1}{2}, and item 3 can join either group, but the code counts that once: {got} instead of {want}.',
    fix: 'Multiply by the number of groups the item can join: j * s[i − 1][j]. When a step has several choices that lead to different outcomes, the count is multiplied by the number of choices.',
    clues: [
      'List the splits of {1, 2, 3} into 2 groups by hand. Which does the code miss?',
      'If item i joins an existing group, how many groups could it join?',
      'Which term in the recurrence counts “joins an existing group”?',
    ],
    decoys: [
      [['s[0][0] = 1', 's[0][0] = 1'], 'No items in no groups: one way, the empty split. Right.'],
      [['for j in range(1, k + 1):', 'for (let j = 1; j <= k; j++)'], 'j = 0 stays 0 for i ≥ 1: some item would need a group. Right.'],
      [['return s[n][k]', 'return s[n][k]'], 'All n items in exactly k groups. Right.'],
    ],
  },

  'inversion-counting': {
    know: 'ways[inv] counts the permutations of 1 … m − 1 with inv inversions. Insert the new largest value m: placed t positions from the end, it is bigger than the t values after it, so it adds t inversions, for t from 0 to m − 1. Different permutations and positions can land on the same inversion count, so each one adds its count to that cell.',
    swap: pair(['                nxt[inv + t] += count', '                nxt[inv + t] = count'], ['      for (let t = 0; t < m; t++) next[inv + t] += count', '      for (let t = 0; t < m; t++) next[inv + t] = count']),
    symptom: { args: [3, 1], expected: 2, buggy: 1 },
    bug: 'Keeping only the last way into a cell',
    why: 'Several (inv, t) pairs give the same inv + t, so a cell of nxt is reached more than once. Setting the cell instead of adding to it keeps only the last count and throws the others away. With {call}, 1 inversion comes from 1 2 with the 3 put one place from the end, and from 2 1 with the 3 at the end; the code kept one: {got} instead of {want}.',
    fix: 'Add: nxt[inv + t] += count. When different ways land in the same cell, the cell counts all of them.',
    clues: [
      'List the permutations of 1, 2, 3 with exactly one inversion.',
      'For m = 3, which pairs (inv, t) give inv + t = 1?',
      'What happens to a cell of nxt that is written twice?',
    ],
    decoys: [
      [['nxt = [0] * (len(ways) + m - 1)', 'const next = Array(ways.length + m - 1).fill(0)'], 'Inserting m adds at most m − 1 inversions, so the list grows by m − 1. Right.'],
      [['for inv, count in enumerate(ways):', 'ways.forEach((count, inv) => {'], 'Every inversion count of the smaller permutations. Right.'],
      [['if k < 0 or k > top:', 'if (k < 0 || k > top)'], 'A permutation of n values has at most n(n − 1)/2 inversions. Right.'],
    ],
  },
}

// The Advanced lessons' hunts live beside their family (bug-hunts-dag.js, …).
export const HUNTS = { ...CORE_HUNTS, ...DAG_HUNTS, ...TREE_HUNTS, ...SUBSET_HUNTS, ...DIGIT_HUNTS, ...SPACE_HUNTS, ...SPLIT_HUNTS, ...ALGEBRA_HUNTS, ...PROFILE_HUNTS, ...PROB_HUNTS, ...GAME_HUNTS, ...PARSE_HUNTS, ...CONTROL_HUNTS, ...RESEARCH_HUNTS }
