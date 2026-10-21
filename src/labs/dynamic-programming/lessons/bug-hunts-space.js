// Bug hunts for the state-and-transition-reduction lessons (Expert, space-speed group). Format:
// bug-hunts.js. Each symptom is the smallest input a search found where the buggy code and
// expert-oracles.js disagree (monotone-queue’s was chosen so neither language crashes).
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SPACE_HUNTS = {
  'rolling-arrays': {
    know: 'One row stands for two rows at once. Before row[c] is overwritten it still holds the count from the cell above (the previous row); row[c − 1] has just been overwritten, so it holds the count from the left (this row). A cell’s paths come from both.',
    swap: pair(['                row[c] = (row[c] + row[c - 1]) % M', '                row[c] = row[c - 1]'], ['      else if (c > 0) row[c] = (row[c] + row[c - 1]) % M', '      else if (c > 0) row[c] = row[c - 1]']),
    symptom: { args: [[[0, 0], [0, 0]]], expected: 2, buggy: 1 },
    bug: 'The count from above dropped',
    why: 'row[c] is replaced by the count from the left alone, throwing away the old value, which was the count from above. In a 2 × 2 grid the bottom-right cell then counts only the path along the bottom: {call} returned {got} instead of {want}.',
    fix: 'Add both: row[c] = (row[c] + row[c - 1]) % M, the old value (above) plus the new left neighbour.',
    clues: ['In a 2 × 2 grid, how many paths reach the bottom-right?', 'Just before row[c] is updated, what does it hold?', 'Which of the two contributions does the update keep?'],
    decoys: [[['row[0] = 0 if grid[0][0] else 1', 'row[0] = grid[0][0] ? 0 : 1'], 'One path to the start, unless blocked. Right.'], [['row[c] = 0', 'if (grid[r][c]) row[c] = 0'], 'A blocked cell has no paths. Right.'], [['return row[C - 1]', 'return row[C - 1]'], 'The last cell after the last row. Right.']],
  },

  'in-place': {
    know: 'With one row updated in place, the scan direction decides what best[c − w] means. Scanning upward, it may already include this item (reuse allowed); scanning downward, it is still from before this item. A once-only item must scan downward.',
    swap: pair(['        caps = range(w, cap + 1) if many else range(cap, w - 1, -1)', '        caps = range(w, cap + 1)'], ['      for (let c = cap; c >= w; c--) best[c] = Math.max(best[c], best[c - w] + v)', '      for (let c = w; c <= cap; c++) best[c] = Math.max(best[c], best[c - w] + v)']),
    symptom: { args: [[[2, 3, 0]], 8], expected: 3, buggy: 12 },
    bug: 'A once-only item scanned upward',
    why: 'The once-only item is scanned upward too, so best[c − 2] already contains it when best[c] is computed, and it is taken again and again. With capacity 8 it is taken four times: {call} returned {got} instead of {want}.',
    fix: 'Scan downward for a once-only item: range(cap, w − 1, −1).',
    clues: ['How many times may the item be taken?', 'When best[4] is computed in an upward scan, does best[2] already include the item?', 'Which direction keeps best[c − w] from before this item?'],
    decoys: [[['best = [0] * (cap + 1)', 'const best = new Array(cap + 1).fill(0)'], 'One row, empty choice worth 0. Right.'], [['best[c - w] + v', 'if (many)'], 'Taking the item adds its value to the rest. Right, given the right scan.'], [['return best[cap]', 'return best[cap]'], 'The full capacity. Right.']],
  },

  'hirschberg': {
    know: 'Among all longest common subsequences, the answer is the smallest in dictionary order. The greedy walk finds it only by trying letters smallest first at every step; any other order can pick a larger letter that also keeps the length.',
    swap: pair(['    letters = sorted(set(a) & set(b))', '    letters = [c for c in dict.fromkeys(a) if c in b]'], ['  const letters = [...new Set(a)].filter(c => b.includes(c)).sort()', '  const letters = [...new Set(a)].filter(c => b.includes(c))']),
    symptom: { args: ['ca', 'ac'], expected: 'a', buggy: 'c' },
    bug: 'Letters tried in order of appearance',
    why: 'The letters are tried in the order they first appear in a, here c before a. Both c and a are longest common subsequences of length 1, and c is found first: {call} returned {got} instead of {want}.',
    fix: 'Sort the letters so the smallest is tried first: sorted(set(a) & set(b)).',
    clues: ['What are the longest common subsequences of “ca” and “ac”?', 'Which comes first in dictionary order?', 'In what order does the walk try the letters?'],
    decoys: [[['L[i][j] = L[i + 1][j + 1] + 1 if', 'L[i][j] = a[i] === b[j]'], 'The suffix LCS table. Right.'], [['ii, jj = a.find(c, i), b.find(c, j)', 'const ii = a.indexOf(c, i), jj = b.indexOf(c, j)'], 'Earliest positions keep the longest suffixes. Right.'], [['L[ii + 1][jj + 1] + 1 == L[i][j]', 'L[ii + 1][jj + 1] + 1 === L[i][j]'], 'c must keep the full length. Right.']],
  },

  'prefix-sum-dp': {
    know: 'ways[i] adds the k values ways[i − k] … ways[i − 1]. With prefix sums P(t) = ways[0] + … + ways[t − 1], that window is P(i) − P(i − k): exactly k terms.',
    swap: pair(['        ways[i] = (pre[i] - pre[max(0, i - k)]) % M', '        ways[i] = (pre[i] - pre[max(0, i - k - 1)]) % M'], ['    ways[i] = ((pre[i] - pre[Math.max(0, i - k)]) % M + M) % M', '    ways[i] = ((pre[i] - pre[Math.max(0, i - k - 1)]) % M + M) % M']),
    symptom: { args: [7, 2], expected: 21, buggy: 44 },
    bug: 'The window is one step too wide',
    why: 'P(i) − P(i − k − 1) adds k + 1 earlier values, so every stair also accepts a step of size k + 1. With steps of 1 and 2, the code counts steps of 3 too: {call} returned {got} instead of {want}.',
    fix: 'Subtract P(i − k): ways[i] = P(i) − P(max(0, i − k)).',
    clues: ['With k = 2, which earlier stairs should ways[i] add up?', 'How many terms does P(i) − P(i − k − 1) contain?', 'Check n = 3: with steps 1 and 2 there are 3 ways.'],
    decoys: [[['ways[0] = 1', 'ways[0] = 1'], 'One way to stand at the bottom. Right.'], [['pre[i + 1] = (pre[i] + ways[i]) % M', 'pre[i + 1] = (pre[i] + ways[i]) % M'], 'The running total. Right.'], [['return ways[n]', 'return ways[n]'], 'The top stair. Right.']],
  },

  'difference-dp': {
    know: 'Adding v to every total from t to t + lim takes two marks in the difference array: +v at t and −v just after the end, at t + lim + 1. The range is inclusive at both ends, so the cancelling mark goes one past the last total.',
    swap: pair(['                end = min(total, t + lim) + 1', '                end = min(total, t + lim)'], ['      const end = Math.min(total, t + lim) + 1', '      const end = Math.min(total, t + lim)']),
    symptom: { args: [[2], 2], expected: 1, buggy: 0 },
    bug: 'The range ends one too early',
    why: 'The cancelling mark goes at t + lim instead of one past it, so the last total of each range, t + lim itself, is left out. A child who may take up to 2 candies can never take exactly 2: {call} returned {got} instead of {want}.',
    fix: 'Cancel one past the end: end = min(total, t + lim) + 1.',
    clues: ['One child may take 0, 1 or 2 candies. In how many ways can exactly 2 be given?', 'Which totals should ways[0] reach?', 'After the prefix sum, does the last total of the range get the value?'],
    decoys: [[['diff[t] = (diff[t] + ways[t]) % M', 'diff[t] = (diff[t] + ways[t]) % M'], 'The range starts at t. Right.'], [['run = (run + diff[t]) % M', 'run = (run + diff[t]) % M'], 'The prefix sum. Right.'], [['ways = [1] + [0] * total', 'ways[0] = 1'], 'One way to give nothing. Right.']],
  },

  'monotone-queue': {
    know: 'From square i the previous landing can be any of i − k … i − 1: k squares. A queue index is expired only when it is further back than that, q[0] < i − k; index i − k itself is still allowed.',
    swap: pair(['        while q[0] < i - k:', '        while q[0] <= i - k:'], ['    while (q[head] < i - k) head++', '    while (q[head] <= i - k) head++']),
    symptom: { args: [[5, -9, 4], 2], expected: 9, buggy: 0 },
    bug: 'The window is one square short',
    why: 'The test <= i − k also expires square i − k, which is still in reach with a jump of k. From square 2 the jump of 2 back to square 0 is lost, so the path must go through −9: {call} returned {got} instead of {want}.',
    fix: 'Expire only indices before i − k: while q[0] < i − k.',
    clues: ['With jumps of up to 2, can square 2 be reached straight from square 0?', 'Which indices should still be in the queue at i = 2?', 'Is index i − k inside the window or outside?'],
    decoys: [[['best[i] = a[i] + best[q[0]]', 'best[i] = a[i] + best[q[head]]'], 'The front is the window’s best. Right.'], [['while q and best[q[-1]] <= best[i]:', 'while (q.length > head && best[q[q.length - 1]] <= best[i]) q.pop()'], 'Worse, older squares can never win. Right.'], [['best[0] = a[0]', 'best[0] = a[0]'], 'The start square counts. Right.']],
  },

  'fenwick-dp': {
    know: 'A strictly increasing subsequence can only be extended by a larger value. So the query must cover the ranks strictly below r: the Fenwick prefix ending at r − 1, not at r (which would include equal values).',
    swap: pair(['        s, i = 0, r - 1', '        s, i = 0, r'], ['    for (let i = r - 1; i > 0; i -= i & -i) s = (s + tree[i]) % M', '    for (let i = r; i > 0; i -= i & -i) s = (s + tree[i]) % M']),
    symptom: { args: [[1, 1]], expected: 2, buggy: 3 },
    bug: 'Equal values counted as increasing',
    why: 'The query includes rank r itself, so subsequences ending at an equal value are extended. The second 1 extends the first, counting 1, 1 as increasing: {call} returned {got} instead of {want}.',
    fix: 'Query the ranks below: start the prefix at r − 1.',
    clues: ['Is 1, 1 a strictly increasing subsequence?', 'Which ranks does the query read for the second 1?', 'What is stored at rank r before the second 1 arrives?'],
    decoys: [[['cur = (s + 1) % M', 'const cur = (s + 1) % M'], 'Extend each, plus the value alone. Right.'], [['tree[i] = (tree[i] + cur) % M', 'tree[i] = (tree[i] + cur) % M'], 'Record at rank r. Right.'], [['ranks = {v: i + 1', 'const rank = new Map'], 'Equal values share a rank. Right.']],
  },

  'segment-tree-dp': {
    know: 'Allowed predecessors have values in [x − d, x + d], both ends included. bisect_left(x − d) is the first leaf ≥ x − d, and bisect_right(x + d) is just past the last leaf ≤ x + d, so the half-open leaf range [lo, hi) covers both ends.',
    swap: pair(['        cur = 1 + query(bisect_left(vals, x - d), bisect_right(vals, x + d))', '        cur = 1 + query(bisect_left(vals, x - d), bisect_left(vals, x + d))'], ['    const cur = 1 + query(lower(x - d), upper(x + d))', '    const cur = 1 + query(lower(x - d), lower(x + d))']),
    symptom: { args: [[9, 9], 0], expected: 2, buggy: 1 },
    bug: 'The upper end excluded',
    why: 'bisect_left(x + d) stops before any value equal to x + d, so a predecessor exactly d away above is left out. With d = 0 that is every equal value: the second 9 can’t follow the first: {call} returned {got} instead of {want}.',
    fix: 'End the range with bisect_right(vals, x + d) (upper in JavaScript), which includes x + d.',
    clues: ['With d = 0, may 9 follow 9?', 'Which leaves does the query cover for x = 9?', 'Is the query range half-open or closed?'],
    decoys: [[['update(bisect_left(vals, x), cur)', 'update(lower(x), cur)'], 'Improve x’s leaf after the query. Right.'], [['tree = [0] * (2 * size)', 'const tree = new Array(2 * size).fill(0)'], 'Empty ranges give 0. Right.'], [['vals = sorted(set(a))', 'const vals = [...new Set(a)]'], 'The distinct values in order. Right.']],
  },

  'coordinate-compression': {
    know: 'Compression replaces values by ranks only for storage and order: which earlier values are smaller. Anything that uses the size of a value, like a sum, must still use the original value.',
    swap: pair(['        cur = s + v', '        cur = s + r'], ['    const cur = s + v', '    const cur = s + r']),
    symptom: { args: [[7]], expected: 7, buggy: 1 },
    bug: 'The rank used as the value',
    why: 'The sum adds the rank instead of the value. A single value 7 has rank 1, so the best sum comes out as 1: {call} returned {got} instead of {want}.',
    fix: 'Add the real value, not its rank: cur = s + v.',
    clues: ['What is the best sum for the list [7]?', 'What is the rank of 7 here?', 'Which of the two does the sum use?'],
    decoys: [[['s = max(s, tree[i])', 's = Math.max(s, tree[i])'], 'The best sum below this rank. Right.'], [['tree[i] = max(tree[i], cur)', 'tree[i] = Math.max(tree[i], cur)'], 'Improve this rank. Right.'], [['ranks = {v: i + 1', 'const rank = new Map'], 'Ranks preserve order. Right.']],
  },

  'pareto-frontiers': {
    know: 'After sorting by weight, a pair belongs on the frontier only if it is worth more than every lighter pair; otherwise a lighter pair is at least as good. The test compares values, keeping the front’s best value so far.',
    swap: pair(['            if not front or p[1] > front[-1][1]:', '            if not front or p[0] > front[-1][0]:'], ['      if (!front.length || p[1] > front[front.length - 1][1]) front.push(p)', '      if (!front.length || p[0] > front[front.length - 1][0]) front.push(p)']),
    symptom: { args: [[5, 6], [9, 2], 9], expected: 9, buggy: 2 },
    bug: 'Pruned by the wrong coordinate',
    why: 'The test keeps any heavier pair, whatever its value, so a heavy, cheap pair ends the list and its value is returned. Weight 6 worth 2 comes after weight 5 worth 9: {call} returned {got} instead of {want}.',
    fix: 'Keep a pair only if its value beats the last kept value: p[1] > front[-1][1].',
    clues: ['Which single item is better here, and does either pair fit together?', 'After sorting, what is the last pair kept?', 'Does the test look at weights or values?'],
    decoys: [[['cand.sort(key=lambda p: (p[0], -p[1]))', 'cand.sort((p, q) => p[0] - q[0] || q[1] - p[1])'], 'By weight, larger value first on ties. Right.'], [['front = [(0, 0)]', 'let front = [[0, 0]]'], 'The empty choice. Right.'], [['return front[-1][1]', 'return front[front.length - 1][1]'], 'The heaviest frontier pair is the most valuable. Right, if the frontier is right.']],
  },

  'bitset-dp': {
    know: 'B |= B << v keeps every total reachable without v (the old B) and adds every total reachable with v (B shifted by v). Replacing B by the shift alone would keep only the totals that use v.',
    swap: pair(['        B |= B << v', '        B = B << v'], ['  for (const v of values) B |= B << BigInt(v)', '  for (const v of values) B = B << BigInt(v)']),
    symptom: { args: [[1]], expected: 2, buggy: 1 },
    bug: 'The old totals dropped',
    why: 'B is replaced by its shift, so only totals that use every value so far survive. With the single value 1, total 0 (taking nothing) disappears: {call} returned {got} instead of {want}.',
    fix: 'Combine with OR, keeping the old totals: B |= B << v.',
    clues: ['Which totals can [1] make, counting the empty choice?', 'After the update, is bit 0 still set?', 'Which totals should the old B contribute?'],
    decoys: [[['B = 1', 'let B = 1n'], 'Total 0 is reachable at the start. Right.'], [["return bin(B).count('1')", "if (ch === '1') count++"], 'Count the reachable totals. Right.'], [['for v in values:', 'for (const ch of B.toString(2))'], 'Every value is used once. Right.']],
  },

  'bounded-binary': {
    know: 'The bundles 1, 2, 4, … must add up to exactly m, so the last one takes only what is left: take = min(k, m). A full power of two at the end would let the 0/1 knapsack use more copies than the item has.',
    swap: pair(['            take = min(k, m)', '            take = k'], ['      const take = Math.min(k, m), W = take * w, V = take * values[i]', '      const take = k, W = take * w, V = take * values[i]']),
    symptom: { args: [[1], [8], [6], 9], expected: 48, buggy: 56 },
    bug: 'The last bundle is too big',
    why: 'Bundles of 1, 2 and 4 are made for a count of 6, adding up to 7. The knapsack can then take all three bundles, 7 copies, one more than allowed: {call} returned {got} instead of {want}.',
    fix: 'Cap each bundle by what is left: take = min(k, m).',
    clues: ['Item count 6: which bundles should be made?', 'What do the bundles the code makes add up to?', 'With capacity 9, how many copies does the buggy answer use?'],
    decoys: [[['m = min(m, cap // w)', 'let m = Math.min(counts[i], Math.floor(cap / w))'], 'More copies than fit can’t be used. Right.'], [['range(cap, W - 1, -1)', 'for (let c = cap; c >= W; c--)'], 'Each bundle once. Right.'], [['W, V = take * w, take * v', 'm -= take'], 'A bundle is take copies. Right.']],
  },

  'bounded-queue': {
    know: 'new[c] adds the old ways at c, c − w, …, c − m·w: m + 1 values, one for each possible count 0 … m. The window must hold m + 1 values, so the one that falls out is m + 1 steps back.',
    swap: pair(['                if t - m - 1 >= 0:\n                    window = (window - ways[idx[t - m - 1]]) % M', '                if t - m >= 0:\n                    window = (window - ways[idx[t - m]]) % M'], ['        if (t - m - 1 >= 0) window = ((window - ways[c - (m + 1) * w]) % M + M) % M', '        if (t - m >= 0) window = ((window - ways[c - m * w]) % M + M) % M']),
    symptom: { args: [[2], [2], 4], expected: 1, buggy: 0 },
    bug: 'The window is one value short',
    why: 'The oldest value is removed one step too soon, so the window holds m values and the largest count, m copies, is never possible. Two copies of weight 2 can’t make 4: {call} returned {got} instead of {want}.',
    fix: 'Remove the value m + 1 steps back: if t − m − 1 ≥ 0, subtract ways at that position.',
    clues: ['Weight 2, at most 2 copies: in how many ways can the total be 4?', 'How many values should the window add for new[4]?', 'Which value does the code remove first?'],
    decoys: [[['window = (window + ways[c]) % M', 'window = (window + ways[c]) % M'], 'Add the newest value. Right.'], [['ways = [1] + [0] * target', 'ways[0] = 1'], 'One way to reach 0. Right.'], [['for r in range(min(w, target + 1)):', 'for (let r = 0; r < Math.min(w, target + 1); r++)'], 'Each residue on its own. Right.']],
  },

  'symmetry': {
    know: 'Skipping a machine is safe only when it is interchangeable with the previous one, that is, when their loads are equal. A machine with a larger load leads to a different future and must still be tried.',
    swap: pair(['            if m and loads[m] == loads[m - 1]:', '            if m and loads[m] >= loads[m - 1]:'], ['      if (m && loads[m] === loads[m - 1]) continue', '      if (m && loads[m] >= loads[m - 1]) continue']),
    symptom: { args: [[5, 9, 8, 7, 5], 2], expected: 17, buggy: 19 },
    bug: 'Only the least-loaded machine tried',
    why: 'The loads are sorted, so loads[m] ≥ loads[m − 1] always holds and every machine but the first is skipped. Each job then goes to the least-loaded machine, a greedy rule that can miss the best split: {call} returned {got} instead of {want}.',
    fix: 'Skip only a machine whose load equals the one before: loads[m] == loads[m − 1].',
    clues: ['Split 9, 8, 7, 5, 5 into two groups as evenly as possible.', 'With sorted loads, how often is loads[m] ≥ loads[m − 1] true?', 'Which machines does the search actually try?'],
    decoys: [[['tuple(sorted(new))', 'next.sort((x, y) => x - y)'], 'The canonical, sorted state. Right.'], [['jobs = sorted(jobs, reverse=True)', 'const order = [...jobs].sort((x, y) => y - x)'], 'Big jobs first; any order is correct. Right.'], [['if i == len(jobs):', 'if (i === order.length) return Math.max(...loads)'], 'All placed: the largest load. Right.']],
  },
}
