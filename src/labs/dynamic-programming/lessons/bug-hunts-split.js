// Bug hunts for the split-point lessons (Expert, opt-splits group). Format: bug-hunts.js. Each symptom
// is the smallest input a search found where the buggy code and expert-oracles.js disagree, with a
// finite result in both languages. lagrangian’s bug passed its challenge, so its symptom became a case.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SPLIT_HUNTS = {
  'monge': {
    know: 'A matrix is Monge when every rectangle’s diagonal pair costs no more than its crossed pair. Every rectangle is a sum of 2 × 2 squares of neighbouring cells, so it is enough to test each square: rows i, i + 1 and columns j, j + 1, for every j up to the last but one.',
    swap: pair(['        for j in range(len(A[0]) - 1):', '        for j in range(len(A[0]) - 2):'], ['    for (let j = 0; j + 1 < A[0].length; j++) {', '    for (let j = 0; j + 2 < A[0].length; j++) {']),
    symptom: { args: [[[0, 0], [1, 2]]], expected: false, buggy: true },
    bug: 'The last pair of columns never tested',
    why: 'The column loop stops one pair early, so the square made of the last two columns is never tested. A 2 × 2 matrix has only that square, so nothing is checked and it passes: {call} returned {got} instead of {want}.',
    fix: 'Let j run over every column but the last: range(len(A[0]) - 1), so the pair j, j + 1 reaches the final column.',
    clues: ['In a 2 × 2 matrix, which values does j take?', 'Which pair of columns is the last one that needs testing?', 'Compare the row loop’s range with the column loop’s.'],
    decoys: [[['for i in range(len(A) - 1):', 'for (let i = 0; i + 1 < A.length; i++)'], 'Every pair of neighbouring rows. Right.'], [['return False', 'return false'], 'One failing square is enough to answer no. Right.'], [['return True', 'return true'], 'Every square passed. Right.']],
  },

  'divide-conquer-opt': {
    know: 'With the leftmost best cut, opt(j) never moves left as the end j grows. So once the middle end’s best cut at is known, every end left of the middle has its best cut at or before at, and every end right of it at or after at.',
    swap: pair(['            fill(lo, mid - 1, klo, at)', '            fill(lo, mid - 1, at, khi)'], ['      fill(lo, mid - 1, klo, at)', '      fill(lo, mid - 1, at, khi)']),
    symptom: { args: [[2, 1, 3, 2, 0], 4], expected: 18, buggy: 22 },
    bug: 'The left half searched on the wrong side',
    why: 'The ends left of the middle are only offered cuts from at onward, the side where their best cuts never are. Their true best cuts, at or before at, are never tried: {call} returned {got} instead of {want}.',
    fix: 'Bound the left half from above: fill(lo, mid - 1, klo, at). The right half keeps at as its lower bound.',
    clues: ['When the end moves left, which way can its best cut move?', 'Which cuts does the left recursion try?', 'Compare the bounds passed to the two recursive calls.'],
    decoys: [[['fill(mid + 1, hi, at, khi)', 'fill(mid + 1, hi, at, khi)'], 'Ends right of the middle cut at or after at. Right.'], [['if v < best:', 'if (v < best)'], 'Keeps the leftmost best cut. Right.'], [['prev = [0] + [INF] * n', 'prev[0] = 0'], 'Zero groups cover only the empty prefix. Right.']],
  },

  'knuth': {
    know: 'opt(i, j), the best split of piles i … j, lies between opt(i, j − 1) and opt(i + 1, j). Those bounds are only as good as the splits recorded for the shorter intervals, so each interval must store the split that actually won.',
    swap: pair(['            opt[i][j] = at', '            opt[i][j] = i'], ['      opt[i][j] = at', '      opt[i][j] = i']),
    symptom: { args: [[4, 2, 1, 5]], expected: 22, buggy: 23 },
    bug: 'The best split never recorded',
    why: 'Every interval records its first pile i as its best split, whatever split won. Longer intervals then scan only between those wrong bounds, which can leave out their real best split: {call} returned {got} instead of {want}.',
    fix: 'Record the split that won: opt[i][j] = at.',
    clues: ['For piles 4, 2, 1, 5, which split is best for the whole row?', 'What do opt[i][j − 1] and opt[i + 1][j] hold when they are read?', 'Which value is stored in opt after each interval?'],
    decoys: [[['D[i][j] = best + P[j + 1] - P[i]', 'D[i][j] = best + P[j + 1] - P[i]'], 'The last merge pays the whole interval. Right.'], [['for length in range(2, n + 1):', 'for (let length = 2; length <= n; length++)'], 'Shorter intervals first. Right.'], [['return D[0][n - 1]', 'return D[0][n - 1]'], 'The whole row of piles. Right.']],
  },

  'smawk': {
    know: 'Reduce compares two columns in one row only: the row at the depth where the top column sits on the stack. The k-th column kept is a candidate for row k and later rows; if the new column is cheaper in that row, the top column can’t win there or later, and it is dropped.',
    swap: pair(['            while stack and f(rows[len(stack) - 1], stack[-1]) > f(rows[len(stack) - 1], c):', '            while stack and f(rows[-1], stack[-1]) > f(rows[-1], c):'], ['      while (stack.length && f(rows[stack.length - 1], stack[stack.length - 1]) > f(rows[stack.length - 1], c)) stack.pop()', '      while (stack.length && f(rows[rows.length - 1], stack[stack.length - 1]) > f(rows[rows.length - 1], c)) stack.pop()']),
    symptom: { args: [[3, 5], [2, 9], [9, 0]], expected: 26, buggy: 52 },
    bug: 'Columns compared in the wrong row',
    why: 'Every comparison uses the last row, so a column that is cheap for the early rows is dropped because the last row prefers another. The early rows lose their minimum: {call} returned {got} instead of {want}.',
    fix: 'Compare in the row at the stack’s depth: f(rows[len(stack) - 1], stack[-1]) > f(rows[len(stack) - 1], c).',
    clues: ['Which well is cheapest for the house at 3, and for the house at 5?', 'In which row does reduce compare the two columns?', 'Should a column the last row dislikes be dropped for every row?'],
    decoys: [[['if len(stack) < len(rows):', 'if (stack.length < rows.length) stack.push(c)'], 'At most one kept column per row. Right.'], [['rec(rows[1::2], cols)', 'rec(rows.filter((_, t) => t % 2 === 1), cols)'], 'The odd rows, solved recursively. Right.'], [['if cols[j] == stop:', 'if (cols[j] === stop) break'], 'The scan ends at the next row’s minimum. Right.']],
  },

  'cht': {
    know: 'Expanding (P[i] − P[j])² gives P[i]² − 2P[i]P[j] + P[j]². The terms with j become a line in x = P[i]: slope −2P[j], intercept D(j) + P[j]². Leave a term out and the lines no longer add up to the real cost.',
    swap: pair(['        add(-2 * P[i], D[i] + P[i] ** 2)', '        add(-2 * P[i], D[i])'], ['    add(-2 * P[i], D[i] + P[i] ** 2)', '    add(-2 * P[i], D[i])']),
    symptom: { args: [[3, 1], 5], expected: 20, buggy: 11 },
    bug: 'The intercept forgot P[j]²',
    why: 'The line for j is stored with intercept D(j) alone, so every line started after j is charged P[j]² too little, and a later start looks far cheaper than it is: {call} returned {got} instead of {want}.',
    fix: 'Put the square in the intercept: add(-2 * P[i], D[i] + P[i] ** 2).',
    clues: ['Expand (P[i] − P[j])². Which terms depend on j?', 'Where does the P[j]² term go?', 'Check the intercept of the line added for i.'],
    decoys: [[['add(0, 0)', 'add(0, 0)'], 'j = 0 has P[0] = 0, so its line is 0·x + 0. Right.'], [['D[i] = query(P[i]) + P[i] ** 2 + M', 'D[i] = query(P[i]) + P[i] ** 2 + M'], 'The terms without j, added after the query. Right.'], [['while lo < hi:', 'while (lo < hi)'], 'Binary search over the hull. Right.']],
  },

  'monotone-cht': {
    know: 'Expanding a·(P[i] − P[j])² + b·(P[i] − P[j]): the terms with j are −2a·P[i]·P[j] (the slope), and a·P[j]² and −b·P[j] (the intercept). b·(P[i] − P[j]) splits into +b·P[i], added outside, and −b·P[j], inside the intercept.',
    swap: pair(['        line = (-2 * a * t, D[i] + a * t * t - b * t)', '        line = (-2 * a * t, D[i] + a * t * t + b * t)'], ['    const line = [-2 * a * t, D[i] + a * t * t - b * t]', '    const line = [-2 * a * t, D[i] + a * t * t + b * t]']),
    symptom: { args: [[2, 2], -1, 4, 3], expected: 14, buggy: 30 },
    bug: 'A sign lost in the expansion',
    why: 'The intercept has + b·P[j] where the expansion gives − b·P[j], so every group is valued 2b·P[j] too high, and more so the later it starts: {call} returned {got} instead of {want}.',
    fix: 'Subtract it: line = (-2 * a * t, D[i] + a * t * t - b * t).',
    clues: ['Expand b·(P[i] − P[j]). What is the sign of the P[j] part?', 'Which part goes into the intercept of j’s line?', 'Compare the intercept with your expansion.'],
    decoys: [[['hull = [(0, 0)]', 'const hull = [[0, 0]]'], 'The line for j = 0. Right.'], [['D[i] = at(hull[front], t) + a * t * t + b * t + c', 'D[i] = at(hull[front], t) + a * t * t + b * t + c'], 'The terms without j: +b·P[i] belongs here. Right.'], [['front += 1', 'front++'], 'The pointer only moves forward. Right.']],
  },

  'li-chao': {
    know: 'Two lines cross at most once. After the node keeps the line that is lower at its middle, the other line can be lower on one side only: the left side if it is lower at the left end, the right side if it is lower at the right end.',
    swap: pair(['            if at(line, lo) < at(tree[node], lo):', '            if at(line, hi) < at(tree[node], hi):'], ['      if (at(line, lo) < at(tree.get(node), lo)) { node = 2 * node; hi = mid }', '      if (at(line, hi) < at(tree.get(node), hi)) { node = 2 * node; hi = mid }']),
    symptom: { args: [[0, 6, 5], 8], expected: 33, buggy: 53 },
    bug: 'The loser sent left on the wrong test',
    why: 'The losing line goes left when it is lower at the right end, the one side where it can’t win. Where it really wins, no node keeps it, so a query there misses it: {call} returned {got} instead of {want}.',
    fix: 'Test the left end before going left: if at(line, lo) < at(tree[node], lo).',
    clues: ['Which earlier stone is the best one to jump to height 5 from?', 'After the swap at a node, on which side can the losing line still be lower?', 'Which end does the first test compare?'],
    decoys: [[['if at(line, mid) < at(tree[node], mid):', 'if (at(line, mid) < at(tree.get(node), mid))'], 'Keep the line lower at the middle. Right.'], [['elif at(line, hi) < at(tree[node], hi):', 'else if (at(line, hi) < at(tree.get(node), hi))'], 'Lower at the right end: go right. Right.'], [['while node in tree:', 'while (tree.has(node))'], 'A query takes every line on its path. Right.']],
  },

  'cht-numeric': {
    know: 'Two crossings are compared without dividing: x₁₃ ≤ x₁₂ becomes (b₃ − b₁)(m₁ − m₂) ≤ (b₂ − b₁)(m₁ − m₃). Multiplying out keeps the direction only because both denominators, m₁ − m₂ and m₁ − m₃, are positive: the slopes fall.',
    swap: pair(['        return (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])', '        return (l3[1] - l1[1]) * (l2[0] - l1[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])'], ['  const useless = (l1, l2, l3) => (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])', '  const useless = (l1, l2, l3) => (l3[1] - l1[1]) * (l2[0] - l1[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0])']),
    symptom: { args: [[4, 6, 8, 9], 9], expected: '31', buggy: '34' },
    bug: 'A denominator with the wrong sign',
    why: 'One factor is written m₂ − m₁, a negative number, so one side flips sign and the test answers a different question: needed lines are thrown away and useless ones kept: {call} returned {got} instead of {want}.',
    fix: 'Use the positive denominator on both sides: (l3[1] - l1[1]) * (l1[0] - l2[0]) <= (l2[1] - l1[1]) * (l1[0] - l3[0]).',
    clues: ['Slopes fall. Is l1[0] − l2[0] positive or negative?', 'Write both crossings as fractions with positive denominators.', 'Which factor in useless has its subtraction reversed?'],
    decoys: [[['return str(D[n - 1])', 'return String(D[n - 1])'], 'Every digit, as a string. Right.'], [['D[i] = at(hull[front], x) + x * x + C', 'D[i] = at(hull[front], x) + x * x + K'], 'The best line plus the terms without j. Right.'], [['front += 1', 'front++'], 'The pointer only moves forward. Right.']],
  },

  'lagrangian': {
    know: 'For a penalty λ, ties between choices with the same penalized total must be broken one fixed way, and the search must match it. With ties going to fewer segments, the count never rises with λ, and the smallest λ whose count is at most k gives f(k) = best + λk.',
    swap: pair(['        return p if (p[0], -p[1]) >= (q[0], -q[1]) else q', '        return p if (p[0], p[1]) >= (q[0], q[1]) else q'], ['  const better = (p, q) => (p[0] > q[0] || (p[0] === q[0] && p[1] <= q[1]) ? p : q)', '  const better = (p, q) => (p[0] > q[0] || (p[0] === q[0] && p[1] >= q[1]) ? p : q)']),
    symptom: { args: [[0, 0], 1], expected: 0, buggy: 1 },
    bug: 'Ties broken toward more segments',
    why: 'At penalty 0, taking nothing, one 0 or both 0s all score 0, and the tie now reports 2 segments, more than k. The search moves on to penalty 1, where the best uses 0 segments, and adds 1 · k to it: {call} returned {got} instead of {want}.',
    fix: 'On a tie, prefer fewer segments: return p if (p[0], -p[1]) >= (q[0], -q[1]) else q.',
    clues: ['With a = [0, 0], what do 0, 1 and 2 segments score at penalty 0?', 'Which count does best(0) report?', 'Is that the tie rule the binary search assumes?'],
    decoys: [[['start = (before[0] - lam + x, before[1] + 1)', 'const start = [before[0] - lam + x, before[1] + 1]'], 'A new segment pays lam and counts one. Right.'], [['if best(mid)[1] <= k:', 'if (best(mid)[1] <= k) hi = mid'], 'The smallest penalty with at most k segments. Right, with fewer on ties.'], [['return best(lo)[0] + lo * k', 'return best(lo)[0] + lo * k'], 'Add the penalty back for k segments. Right.']],
  },

  'slope-trick': {
    know: 'When x is below the largest breakpoint t, the cost function gains a slope change at x and loses the one at t: pay t − x, pop t and push x. The breakpoint moves down to x, so later values are measured against x.',
    swap: pair(['            heapq.heapreplace(heap, -x)', '            heapq.heapreplace(heap, heap[0])'], ['      replaceTop(x)', '      replaceTop(heap[0])']),
    symptom: { args: [[3, 1, 0]], expected: 3, buggy: 5 },
    bug: 'The breakpoint never moved down',
    why: 'After paying, the largest breakpoint is replaced by itself instead of x, so it stays high, and the next smaller value is charged against the old breakpoint again: {call} returned {got} instead of {want}.',
    fix: 'Replace the top with x: heapq.heapreplace(heap, -x), or replaceTop(x) in JavaScript.',
    clues: ['For 3, 1, 0, what is the cheapest non-decreasing result?', 'After paying for the 1, which breakpoint should be largest?', 'What does the replace put on top?'],
    decoys: [[['heapq.heappush(heap, -x)', 'push(x)'], 'Every value becomes a breakpoint. Right.'], [['cost += -heap[0] - x', 'cost += heap[0] - x'], 'Pay the gap. Right.'], [['return cost', 'return cost'], 'The total paid. Right.']],
  },

  'cdq': {
    know: 'A chain needs x and y both to rise strictly. In the sweep, a left point may enter the tree only once its x is strictly smaller than the right point’s; a point with an equal x must wait.',
    swap: pair(['            while p < len(left) and x[left[p]] < x[j]:', '            while p < len(left) and x[left[p]] <= x[j]:'], ['      while (p < left.length && x[left[p]] < x[j]) { put(rank.get(y[left[p]]), best[left[p]]); p++ }', '      while (p < left.length && x[left[p]] <= x[j]) { put(rank.get(y[left[p]]), best[left[p]]); p++ }']),
    symptom: { args: [[1, 1], [0, 2]], expected: 1, buggy: 2 },
    bug: 'Equal x let into the tree',
    why: 'The sweep lets in left points whose x equals the right point’s, so a point extends a chain ending at a point with the same x: {call} returned {got} instead of {want}.',
    fix: 'Keep the comparison strict: x[left[p]] < x[j].',
    clues: ['Can (1, 0) and (1, 2) be in one chain?', 'When does a left point enter the tree?', 'Is that comparison strict?'],
    decoys: [[['best[j] = max(best[j], get(rank[y[j]] - 1) + 1)', 'best[j] = Math.max(best[j], get(rank.get(y[j]) - 1) + 1)'], 'Strictly smaller y: the ranks below y[j]’s. Right.'], [['clear(rank[y[i]])', 'clear(rank.get(y[left[t]]))'], 'Empty the tree for the next split. Right.'], [['go(mid, hi)', 'go(mid, hi)'], 'The right half, after its contributions. Right.']],
  },

  'online-convolution': {
    know: 'Every pair i < t must be added exactly once. Inside a block, pairs with both ends in the same half are left to the recursion; this level adds only the pairs with i in the left half and t in the right half.',
    swap: pair(['            for t in range(mid, min(hi, i + len(b))):', '            for t in range(i + 1, min(hi, i + len(b))):'], ['      for (let t = mid; t < Math.min(hi, i + b.length); t++) a[t] = (a[t] + a[i] * b[t - i]) % M', '      for (let t = i + 1; t < Math.min(hi, i + b.length); t++) a[t] = (a[t] + a[i] * b[t - i]) % M']),
    symptom: { args: [[0, 1], 6], expected: 1, buggy: 6 },
    bug: 'Pairs inside one half added twice',
    why: 'The targets start right after i instead of at mid, so pairs inside the left half, already added by its own recursion, are added again: {call} returned {got} instead of {want}.',
    fix: 'Start the targets at the middle: for t in range(mid, min(hi, i + len(b))).',
    clues: ['With b = [0, 1], every a[n] should be 1. Why?', 'Which pairs (i, t) does this level add?', 'Were the pairs inside the left half already added?'],
    decoys: [[['go(lo, mid)', 'go(lo, mid)'], 'Finish the left half first. Right.'], [['go(mid, hi)', 'go(mid, hi)'], 'Then the right half. Right.'], [['a[0] = 1', 'a[0] = 1'], 'The starting term. Right.']],
  },
}
