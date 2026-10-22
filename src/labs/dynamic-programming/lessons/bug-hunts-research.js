// Bug hunts for the modelling-and-limits lessons (Specialist, research-tools group). Format: bug-hunts.js.
// Each symptom is a small input where the buggy code and specialist-oracles.js disagree, found by a search
// of buggy code against the oracle; each symptom is also a case of its lesson's challenge.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const RESEARCH_HUNTS = {
  'pseudo-polynomial': {
    know: 'least[t] is the lightest set worth exactly t. Before any item, only t = 0 is reachable; every other value must start as impossible (infinitely heavy), or it looks free.',
    swap: pair(['    least = [0] + [INF] * total', '    least = [0] * (total + 1)'], ['  const least = [0, ...new Array(total).fill(Infinity)]', '  const least = new Array(total + 1).fill(0)']),
    symptom: { args: [[6], [5], 1], expected: 0, buggy: 5 },
    bug: 'Unreachable values start at weight 0',
    why: 'Starting every least[t] at 0 says every value can be reached with no weight at all. One item of weight 6 and value 5 can’t fit in capacity 1, but least[5] stays 0, so {call} returned {got} instead of {want}.',
    fix: 'Start with only value 0 reachable: least = [0] + [INF] * total.',
    clues: ['Item weight 6, value 5, capacity 1: what is the best value?', 'Before any item, which values can be reached, and with what weight?', 'What does least[5] start as?'],
    decoys: [[['total = sum(values)', 'const total = values.reduce((a, b) => a + b, 0)'], 'The table runs over values. Right.'], [['for t in range(total, v - 1, -1):', 'for (let t = total; t >= v; t--) {'], 'Downwards: each item at most once. Right.'], [['return max(t for t in range(total + 1) if least[t] <= W)', 'for (let t = 0; t <= total; t++) if (least[t] <= W) best = t'], 'The largest value that fits. Right.']],
  },

  'knapsack-fptas': {
    know: 'The rounding step is K = ε · vmax / n over the items that can fit. An item heavier than W is dropped first; letting its value set vmax makes K too coarse.',
    swap: pair(['    n, vmax = len(items), max(v for _, v in items)', '    n, vmax = len(items), max(values)'], ['  const n = items.length, vmax = Math.max(...items.map(([, v]) => v))', '  const n = items.length, vmax = Math.max(...values)']),
    symptom: { args: [[9, 8], [29, 10], 8, [1, 4]], expected: '10/1', buggy: '29/4' },
    bug: 'vmax includes an item that can’t fit',
    why: 'The item of weight 9 can’t fit in capacity 8, but its value 29 still sets vmax, so K = 29/4 instead of 10/4. The only item that fits, worth 10, rounds down to one step of 29/4: {call} returned {got} instead of {want}, and the (1 − ε) guarantee is lost.',
    fix: 'Take vmax over the items that fit: max(v for _, v in items).',
    clues: ['Which items can fit in capacity 8?', 'What should vmax and K be?', 'Which list does the code take vmax from?'],
    decoys: [[['items = [(w, v) for w, v in zip(weights, values) if w <= W]', '.filter(([w]) => w <= W)'], 'Drop the items that can’t fit. Right.'], [['best = max(t for t in range(total + 1) if least[t] <= W)', 'for (let t = 0; t <= total; t++) if (least[t] <= W) best = t'], 'The best scaled total that fits. Right.'], [['x = K * best', 'BigInt(best) * BigInt(eps[0]) * BigInt(vmax)'], 'Back to real units. Right.']],
  },

  'parameterized-dp': {
    know: 'A column’s mask must not choose two neighbouring rows: they share a side. Only masks with no two adjacent 1 bits are allowed.',
    swap: pair(['    masks = [m for m in range(1 << h) if not m & (m >> 1)]', '    masks = list(range(1 << h))'], ['  for (let m = 0; m < 1 << h; m++) if (!(m & (m >> 1))) masks.push(m)', '  for (let m = 0; m < 1 << h; m++) masks.push(m)']),
    symptom: { args: [[[1], [1]]], expected: 1, buggy: 2 },
    bug: 'Neighbours in the same column are allowed',
    why: 'Every mask is allowed, so two cells one above the other can both be chosen. A column of two cells worth 1 each allows only one of them, but {call} returned {got} instead of {want}. The check between columns is there; the one within a column is missing.',
    fix: 'Keep only masks with no two neighbouring rows: not m & (m >> 1).',
    clues: ['A 2 × 1 grid of ones: how many cells can be chosen?', 'Which mask does the buggy code allow for that column?', 'Where is “no two side by side” checked within a column?'],
    decoys: [[['prev = {0: 0}', 'let prev = new Map([[0, 0]])'], 'Before the first column nothing is chosen. Right.'], [['cur[m] = gain + max(v for p, v in prev.items() if not p & m)', 'for (const [p, v] of prev) if (!(p & m) && v > best) best = v'], 'No row chosen in two neighbouring columns. Right.'], [['return max(prev.values())', 'return Math.max(...prev.values())'], 'Any mask may end the grid. Right.']],
  },

  'multiobjective': {
    know: 'Sorted by time, a pair survives only if it is strictly cheaper than every faster pair. A pair as dear as a faster one is dominated: no faster in time, no cheaper in cost.',
    swap: pair(['            if best_cost is None or c < best_cost:', '            if best_cost is None or c <= best_cost:'], ['      if (bestCost === null || c < bestCost) { keep.push([t, c]); bestCost = c }', '      if (bestCost === null || c <= bestCost) { keep.push([t, c]); bestCost = c }']),
    symptom: { args: [2, [[0, 1, 1, 0], [0, 1, 3, 0]]], expected: [[1, 0]], buggy: [[1, 0], [3, 0]] },
    bug: 'Equal cost keeps a slower pair',
    why: 'With ≤, a slower pair with the same cost survives, although the faster pair is no dearer. Two edges from 0 to 1 cost 0 each, taking 1 and 3: only (1, 0) is undominated, but {call} returned {got} instead of {want}.',
    fix: 'Keep a pair only if it is strictly cheaper: c < best_cost.',
    clues: ['Routes (1, 0) and (3, 0): does one dominate the other?', 'Sorted by time, which pairs should survive?', 'What does the comparison do on a tie in cost?'],
    decoys: [[['front[0] = [(0, 0)]', 'front[0] = [[0, 0]]'], 'At the start: time 0, cost 0. Right.'], [['for t, c in sorted(set(front[u])):', 'for (const [t, c] of pts) {'], 'Sorted by time, each pair once. Right.'], [['front[v] += [(a + t, b + c) for a, b in keep]', 'for (const [a, b] of keep) front[v].push([a + t, b + c])'], 'Extend every surviving pair along the edge. Right.']],
  },

  'meet-middle': {
    know: 'A subset counts when its total is at most T: for a left sum s, every right sum up to and including T − s.',
    swap: pair(['    return sum(bisect_right(right, T - s) for s in sums(values[:half]))', '    return sum(bisect_right(right, T - s - 1) for s in sums(values[:half]))'], ['  for (const s of sums(values.slice(0, half))) count += atMost(T - s)', '  for (const s of sums(values.slice(0, half))) count += atMost(T - s - 1)']),
    symptom: { args: [[1, 2, 3], 3], expected: 5, buggy: 3 },
    bug: 'Totals equal to T are not counted',
    why: 'Counting right sums up to T − s − 1 counts totals strictly below T. For values 1, 2, 3 and T = 3, the subsets {}, {1}, {2}, {3} and {1, 2} have totals at most 3, five of them; the two equal to 3 are missed: {call} returned {got} instead of {want}.',
    fix: 'Count the right sums up to T − s, inclusive.',
    clues: ['List the subsets of 1, 2, 3 with total at most 3.', 'Which of them have total exactly 3?', 'For a left sum s, which right sums should count?'],
    decoys: [[['half = len(values) // 2', 'const half = Math.floor(values.length / 2)'], 'Two halves. Right.'], [['out += [s + x for s in out]', 'out = out.concat(out.map(s => s + x))'], 'Every subset sum of a half. Right.'], [['right = sorted(sums(values[half:]))', 'const right = sums(values.slice(half)).sort((a, b) => a - b)'], 'Sort one half for binary search. Right.']],
  },

  'min-plus-convolution': {
    know: 'A task may take x units for every x in its table, as long as the total stays at most R: x runs up to R − total inclusive.',
    swap: pair(['                for x in range(min(len(c), R - total + 1)):', '                for x in range(min(len(c), R - total)):'], ['      for (let x = 0; x < c.length && total + x <= R; x++) {', '      for (let x = 0; x < c.length && total + x < R; x++) {']),
    symptom: { args: [[[0, 3], [0, 2]], 1], expected: 2, buggy: -1 },
    bug: 'The last unit is never given',
    why: 'Stopping one short means no task ever brings the total up to exactly R. With one unit to give, task 2 can take it for 2, but the total never reaches 1, and {call} returned {got} instead of {want}.',
    fix: 'Let x reach R − total: range(min(len(c), R - total + 1)).',
    clues: ['One unit to give: which task should take it, and at what cost?', 'From total 0, which x does the loop try?', 'Can the total ever reach R?'],
    decoys: [[['best = [0] + [INF] * R', 'let best = [0, ...new Array(R).fill(Infinity)]'], 'Only total 0 is possible at first. Right.'], [['if best[total] + c[x] < nxt[total + x]:', 'if (best[total] + c[x] < nxt[total + x]) nxt[total + x] = best[total] + c[x]'], 'A min of sums. Right.'], [['return -1 if best[R] == INF else best[R]', 'return best[R] === Infinity ? -1 : best[R]'], 'Exactly R units, or impossible. Right.']],
  },

  'persistent-states': {
    know: 'Node v’s version must hold exactly v’s ancestors: it is built from its parent’s version. Siblings start from the same version, and one must not see the other.',
    swap: pair(['        base = root[parent[v]] if parent[v] >= 0 else 0', '        base = root[v - 1] if v > 0 else 0'], ['    const base = parent[v] >= 0 ? root[parent[v]] : 0', '    const base = v > 0 ? root[v - 1] : 0']),
    symptom: { args: [[-1, 0, 0], [1, 1, 1], [6, 14, 2], [1, 0, 1], [1, 1, 1], 2], expected: 26, buggy: 34 },
    bug: 'Each version builds on the previous node, not the parent',
    why: 'Building on root[v − 1] puts every earlier node into v’s version, siblings included. Nodes 1 and 2 are both children of 0; node 2 should see only itself and node 0 (best 6), but it sees node 1’s 14 too: {call} returned {got} instead of {want}.',
    fix: 'Build on the parent’s version: root[parent[v]].',
    clues: ['Which nodes are node 2’s ancestors?', 'Whose version does node 2 start from in the code?', 'Does that version contain node 1?'],
    decoys: [[['L, R, M = [0], [0], [0]', 'const L = [0], R = [0], M = [0]'], 'Node 0 is the shared empty tree. Right.'], [['L[new] = insert(L[node], a, mid, pos, val)', 'if (pos <= mid) L[created] = insert(L[node], a, mid, pos, val)'], 'Copy only the path to the key. Right.'], [['root[v] = insert(base, 0, K - 1, key[v], weight[v])', 'root[v] = insert(base, 0, K - 1, key[v], weight[v])'], 'Add v itself to its version. Right.']],
  },

  'dynamic-dp': {
    know: 'Joining two segments, the left one’s last house and the right one’s first house are neighbours: they must not both be taken.',
    swap: pair(['        return [[max(A[s][p] + B[q][t] for p in (0, 1) for q in (0, 1) if not (p and q)) for t in (0, 1)] for s in (0, 1)]', '        return [[max(A[s][p] + B[q][t] for p in (0, 1) for q in (0, 1)) for t in (0, 1)] for s in (0, 1)]'], ['      for (const p of [0, 1]) for (const q of [0, 1]) if (!(p && q)) best = Math.max(best, A[s][p] + B[q][t])', '      for (const p of [0, 1]) for (const q of [0, 1]) best = Math.max(best, A[s][p] + B[q][t])']),
    symptom: { args: [[5, 1], [[0, 6]]], expected: 6, buggy: 7 },
    bug: 'Neighbours across a boundary can both be taken',
    why: 'Without the check, the combine takes the left segment’s last house and the right segment’s first house together, though they are next to each other. Houses 6 and 1 can’t both be robbed, so the best is 6, but {call} returned {got} instead of {want}.',
    fix: 'Skip the joins where both touching houses are taken: if not (p and q).',
    clues: ['Two houses worth 6 and 1: what is the best?', 'In the combine, which entries describe the two touching houses?', 'Which joins must be skipped?'],
    decoys: [[['return [[0, NEG], [NEG, x]]', 'const leaf = x => [[0, -Infinity], [-Infinity, x]]'], 'One house: taken or not, never both. Right.'], [['tree[j] = leaf(x)', 'tree[j] = leaf(x)'], 'An update replaces one leaf. Right.'], [['total += max(max(row) for row in tree[1])', 'total += Math.max(...tree[1].flat())'], 'The root’s best entry. Right.']],
  },

  'tree-automata': {
    know: 'An inner node’s count for state s adds, over its operations and its children’s states x and y, the left child’s ways for x times the right child’s ways for y.',
    swap: pair(['                    w[s] = (w[s] + ways[a][x] * ways[b][y]) % M', '                    w[s] = (w[s] + ways[a][x] * ways[a][y]) % M'], ['          w[s] = (w[s] + ways[a][x] * ways[b][y]) % M', '          w[s] = (w[s] + ways[a][x] * ways[a][y]) % M']),
    symptom: { args: [[[1, 2], [3, 4], [], [], []], ['or']], expected: 7, buggy: 15 },
    bug: 'The left child is counted twice',
    why: 'Multiplying ways[a][x] by ways[a][y] uses the left subtree for both children. When the children differ in size the counts go wrong: an “or” over (two leaves) and one leaf has 8 labellings of its 3 leaves, 7 of them true, but {call} returned {got} instead of {want}.',
    fix: 'Read y from the right child: ways[b][y], not ways[a][y].',
    clues: ['Three leaves under “or”: how many labellings make the root 1?', 'Which subtree should the y count come from?', 'Which child does the code read for y?'],
    decoys: [[['ways[v] = [1, 1]', 'if (!kids[v].length) { ways[v] = [1n, 1n]; continue }'], 'A leaf: one way to be 0, one to be 1. Right.'], [['s = f[op](x, y)', 'const s = f[op](x, y)'], 'The automaton’s transition. Right.'], [['return ways[0][1]', 'return Number(ways[0][1])'], 'Labellings the root accepts. Right.']],
  },

  'proof-checklist': {
    know: 'In the 0/1 table the capacity loop must go down: then one[c − w] has not yet used this item. Going up, it may already contain the item, which is the unbounded rule.',
    swap: pair(['        for c in range(W, w - 1, -1):', '        for c in range(w, W + 1):'], ['    for (let c = W; c >= w; c--) one[c] = Math.max(one[c], one[c - w] + v)', '    for (let c = w; c <= W; c++) one[c] = Math.max(one[c], one[c - w] + v)']),
    symptom: { args: [[1], [3], 2], expected: [3, 6], buggy: [6, 6] },
    bug: 'The 0/1 loop goes up',
    why: 'Going up, one[c − w] already includes this item, so it is used again: the 0/1 answer becomes the unbounded one. With one item of weight 1 and value 3 and capacity 2, the 0/1 best is 3, but {call} returned {got} instead of {want}.',
    fix: 'Go down from W for the 0/1 table: range(W, w - 1, -1).',
    clues: ['One item, weight 1, value 3, capacity 2: what are the two answers?', 'When one[2] is computed, does one[1] already include the item?', 'Which direction keeps each item to one use?'],
    decoys: [[['one = [0] * (W + 1)', 'const one = new Array(W + 1).fill(0), many = new Array(W + 1).fill(0)'], 'Two tables, all zero. Right.'], [['many[c] = max(many[c], many[c - w] + v)', 'for (let c = w; c <= W; c++) many[c] = Math.max(many[c], many[c - w] + v)'], 'The unbounded update reads its own row. Right.'], [['return [one[W], many[W]]', 'return [one[W], many[W]]'], 'Both answers at capacity W. Right.']],
  },
}
