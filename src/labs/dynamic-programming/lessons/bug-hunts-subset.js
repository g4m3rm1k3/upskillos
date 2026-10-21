// Bug hunts for the bitmask lessons (Advanced, subsets group). Format: bug-hunts.js. Each symptom is the
// smallest input a search found where the buggy code and advanced-oracles.js disagree.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const SUBSET_HUNTS = {
  'bitmask-basics': {
    know: 'Mask 0 is the empty subset. It weighs 0, so it is within any limit of 0 or more and must be counted. The loop starts at mask 1, so the empty subset has to be counted before it.',
    swap: pair(['    count = 1 if limit >= 0 else 0', '    count = 0'], ['  let count = limit >= 0 ? 1 : 0', '  let count = 0']),
    symptom: { args: [[], 0], expected: 1, buggy: 0 },
    bug: 'The empty subset forgotten',
    why: 'The count starts at 0 and the loop runs from mask 1, so mask 0, the empty subset, is never counted. With no items at all, the empty subset is the only one: {call} returned {got} instead of {want}.',
    fix: 'Start the count at 1 when limit ≥ 0: count = 1 if limit >= 0 else 0.',
    clues: ['How many subsets does a list of no items have?', 'Which mask is the empty subset, and does the loop visit it?', 'Try weights [5] with limit 0: the right answer is 1.'],
    decoys: [[['low = mask & -mask', 'const low = mask & -mask'], 'This isolates the lowest set bit. Right.'], [['total[mask] = total[mask ^ low]', 'total[mask] = total[mask ^ low]'], 'The subset without its lowest item, already filled. Right.'], [['if total[mask] <= limit:', 'if (total[mask] <= limit) count++'], 'Counts every non-empty subset within the limit. Right.']],
  },

  'subset-enumeration': {
    know: 'The submask walk s = (s − 1) & m visits m, then every smaller submask, and finally 0, the empty submask. Its value must be added too, so the loop adds values[s] before it checks whether s has reached 0.',
    swap: pair(['            total += values[sub]\n            if sub == 0:\n                break', '            if sub == 0:\n                break\n            total += values[sub]'], ['      total += values[sub]\n      if (sub === 0) break', '      if (sub === 0) break\n      total += values[sub]']),
    symptom: { args: [[9]], expected: [9], buggy: [0] },
    bug: 'The empty submask skipped',
    why: 'The check for 0 comes before the addition, so when the walk reaches the empty submask it stops without adding values[0]. Every mask loses values[0]; for mask 0 that is everything: {call} returned {got} instead of {want}.',
    fix: 'Add first, then stop: total += values[sub], and only then if sub == 0: break.',
    clues: ['Which submasks does mask 0 have?', 'When sub reaches 0, is values[0] added before the loop stops?', 'Every answer here is short by the same amount. Which value is it?'],
    decoys: [[['sub = (sub - 1) & mask', 'sub = (sub - 1) & mask'], 'The next smaller submask. Right.'], [['total, sub = 0, mask', 'let total = 0, sub = mask'], 'The walk starts at mask itself. Right.'], [['out.append(total)', 'out.push(total)'], 'One answer per mask. Right.']],
  },

  'assignment': {
    know: 'D[mask] gives the jobs in mask to the first workers, one job each. So the number of workers already served is the number of 1 bits in mask (its popcount), and the next worker is that number.',
    swap: pair(["        w = bin(mask).count('1')", '        w = mask.bit_length()'], ['    for (let x = mask; x; x &= x - 1) w++', '    for (let x = mask; x; x >>= 1) w++']),
    symptom: { args: [[[5, 3], [1, 2]]], expected: 4, buggy: 7 },
    bug: 'Bit length used as the bit count',
    why: 'The code counts the position of the highest bit, not how many bits are set. Mask 0b10 (only job 1 used) has one bit set but a bit length of 2, so it treats both workers as served and gives the next job to a worker who doesn’t exist in that order. The costs get mixed up: {call} returned {got} instead of {want}.',
    fix: 'Count the set bits: bin(mask).count(\'1\') in Python, or clear the lowest bit each step in JavaScript: x &= x − 1.',
    clues: ['For mask 0b10, how many jobs have been handed out?', 'What does the counting loop give for 0b10?', 'Which worker should take the next job?'],
    decoys: [[['D[0] = 0', 'D[0] = 0'], 'No jobs handed out, no cost. Right.'], [['if not mask & (1 << j):', 'if (!(mask & (1 << j)))'], 'Only unused jobs. Right.'], [['return D[(1 << n) - 1]', 'return D[(1 << n) - 1]'], 'All jobs handed out. Right.']],
  },

  'held-karp': {
    know: 'D[full][v] is the cheapest path from 0 that visits every city and ends at v. A tour must also come back to 0, so each candidate adds the last leg, dist[v][0].',
    swap: pair(['    return min(D[full][v] + dist[v][0] for v in range(1, n))', '    return min(D[full][v] for v in range(1, n))'], ['  for (let v = 1; v < n; v++) best = Math.min(best, D[full][v] + dist[v][0])', '  for (let v = 1; v < n; v++) best = Math.min(best, D[full][v])']),
    symptom: { args: [[[0, 3], [8, 0]]], expected: 11, buggy: 3 },
    bug: 'The tour never closed',
    why: 'The answer takes the best path through every city but never adds the trip back to city 0. With two cities the path 0 → 1 costs 3, and the return costs 8: {call} returned {got} instead of {want}.',
    fix: 'Add the return leg: min(D[full][v] + dist[v][0] for v in range(1, n)).',
    clues: ['Where must a tour end?', 'Two cities: what does the whole round trip cost?', 'Which cost appears nowhere in the answer?'],
    decoys: [[['D[1][0] = 0', 'D[1][0] = 0'], 'Only city 0 visited, at no cost. Right.'], [['D[mask][v] + dist[v][u]', 'D[mask][v] + dist[v][u]'], 'Extending a path by one city. Right.'], [['if n == 1:', 'if (n === 1) return 0'], 'One city: no travel at all. Right.']],
  },

  'hamiltonian': {
    know: 'Vertex u is in the visited set when bit u of mask is 1, which is tested with mask & (1 << u). The number u itself is not a mask: mask & u tests whatever bits happen to be set in the number u.',
    swap: pair(['                    if not mask & (1 << u):', '                    if not mask & u:'], ['        if (!(mask & (1 << u))) C[mask | (1 << u)][u] += C[mask][v]', '        if (!(mask & u)) C[mask | (1 << u)][u] += C[mask][v]']),
    symptom: { args: [2, [[0, 1]]], expected: 1, buggy: 0 },
    bug: 'A vertex number used as a mask',
    why: 'mask & u tests the bits of the number u, not bit u. For u = 1 it tests bit 0, which is vertex 0, always visited, so vertex 1 is never added. The one path 0 → 1 is lost: {call} returned {got} instead of {want}.',
    fix: 'Test bit u, not the number u: if not mask & (1 << u), which is 0 exactly when vertex u is unvisited.',
    clues: ['Is vertex 1 in mask 0b01?', 'What is 0b01 & 1, and what is 0b01 & (1 << 1)?', 'Which bit stands for vertex u?'],
    decoys: [[['C[1][0] = 1', 'C[1][0] = 1'], 'The path that is just vertex 0. Right.'], [['out[a].append(b)', 'out[a].push(b)'], 'Each edge stored under its start vertex. Right.'], [['return sum(C[(1 << n) - 1])', 'return C[(1 << n) - 1].reduce'], 'Every vertex visited, any end. Right.']],
  },

  'subset-partition': {
    know: 'total[mask] is built from a smaller subset: mask with its lowest item removed, which is mask ^ low. That is not the same as mask − 1: subtracting 1 removes the lowest bit but also turns on every bit below it.',
    swap: pair(['        total[mask] = total[mask ^ low] + values[low.bit_length() - 1]', '        total[mask] = total[mask - 1] + values[low.bit_length() - 1]'], ['    total[mask] = total[mask ^ low] + values[31 - Math.clz32(low)]', '    total[mask] = total[mask - 1] + values[31 - Math.clz32(low)]']),
    symptom: { args: [[2, 2], 5], expected: 1, buggy: 2 },
    bug: 'mask − 1 used as “mask without its lowest bit”',
    why: 'For mask 0b10, mask − 1 is 0b01, not 0b00, so total[0b10] counts item 0 as well and comes out 4 instead of 2. Then the pair weighs 6, too much for one bin of 5: {call} returned {got} instead of {want}.',
    fix: 'Remove the lowest item with mask ^ low: total[mask] = total[mask ^ low] + values[…].',
    clues: ['What should total[0b10] be?', 'Compare mask − 1 with mask ^ low for mask = 0b10.', 'Print total for every mask.'],
    decoys: [[['D[0] = 0', 'D[0] = 0'], 'No items, no bins. Right.'], [['block = sub | low', 'const block = sub | low'], 'A bin holding the lowest item. Right.'], [['D[mask ^ block] + 1', 'D[mask ^ block] + 1'], 'This bin plus the rest. Right.']],
  },

  'subset-cover': {
    know: 'Buying an option adds its items to what is covered: covered | option. An item covered twice is still covered. XOR would instead remove an item that is already covered.',
    swap: pair(['            D[mask | om] = min(D[mask | om], D[mask] + c)', '            D[mask ^ om] = min(D[mask ^ om], D[mask] + c)'], ['    for (const [om, c] of masks) D[mask | om] = Math.min(D[mask | om], D[mask] + c)', '    for (const [om, c] of masks) D[mask ^ om] = Math.min(D[mask ^ om], D[mask] + c)']),
    symptom: { args: [3, [[[0, 1], 8], [[0, 2], 2]]], expected: 10, buggy: -1 },
    bug: 'XOR uncovers shared items',
    why: 'Both options contain item 0. Buying the second after the first XORs item 0 out again, leaving {1, 2} instead of {0, 1, 2}, so the full cover is never reached: {call} returned {got} instead of {want}.',
    fix: 'Combine with OR, D[mask | om]: an item covered twice stays covered.',
    clues: ['Buy both options. Which items are covered?', 'What is 0b011 ^ 0b101, and what is 0b011 | 0b101?', 'Can covering an item twice uncover it?'],
    decoys: [[['D[0] = 0', 'D[0] = 0'], 'Nothing bought, nothing covered. Right.'], [['masks = [(sum(1 << i', 'const masks = options.map'], 'Each option as a mask; its items are distinct, so the sum is the OR. Right.'], [['return -1 if D[full] == INF', 'return D[full] === Infinity ? -1'], 'No cover found: −1. Right.']],
  },

  'steiner-tree': {
    know: 'D[mask][v] joins the terminals in mask with vertex v. The tree may branch at v itself (two subsets merged there), or branch at some other vertex u and reach v along a shortest path. The second step lets the branching point move.',
    swap: pair(['            D[mask][v] = min(joined[u] + dist[u][v] for u in range(n))', '            D[mask][v] = joined[v]'], ['    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) D[mask][v] = Math.min(D[mask][v], joined[u] + dist[u][v])', '    for (let v = 0; v < n; v++) D[mask][v] = joined[v]']),
    symptom: { args: [4, [[0, 1, 6], [0, 2, 2], [1, 3, 7]], [0, 1, 2, 3]], expected: 15, buggy: 21 },
    bug: 'The tree may only branch at v itself',
    why: 'Without the shortest-path step, a set of terminals can only be joined at v by branches that meet exactly at v. Here the edges themselves form the tree, but the code builds it from paths that all meet at one vertex, paying for some edges twice: {call} returned {got} instead of {want}.',
    fix: 'After merging, let the meeting point move: D[mask][v] = min over u of joined[u] + dist[u][v].',
    clues: ['The four terminals are every vertex. What do all three edges weigh?', 'With the step removed, where must the branches of each part meet?', 'Which edge does the buggy answer count twice?'],
    decoys: [[['D[1 << i][v] = dist[x][v]', 'D[1 << i][v] = dist[x][v]'], 'One terminal joined to v: a shortest path. Right.'], [['D[sub][v] + D[mask ^ sub][v]', 'D[sub][v] + D[mask ^ sub][v]'], 'Branching at v. Right.'], [['return min(D[(1 << t) - 1])', 'return Math.min(...D[(1 << t) - 1])'], 'All terminals joined, at the best vertex. Right.']],
  },

  'subset-topological': {
    know: 'A vertex may be placed next only when every one of its prerequisites is already placed: need[v] must lie inside mask, (need[v] & mask) == need[v]. Having some of them placed is not enough.',
    swap: pair(['                if not mask & (1 << v) and need[v] & mask == need[v]:', '                if not mask & (1 << v) and (need[v] & mask or not need[v]):'], ['      if (!(mask & (1 << v)) && (need[v] & mask) === need[v]) C[mask | (1 << v)] += C[mask]', '      if (!(mask & (1 << v)) && ((need[v] & mask) || !need[v])) C[mask | (1 << v)] += C[mask]']),
    symptom: { args: [3, [[0, 2], [1, 2]]], expected: 2, buggy: 4 },
    bug: 'One prerequisite treated as all',
    why: 'The test accepts v once any of its prerequisites is placed. Vertex 2 needs both 0 and 1, but the code lets it come right after 0 alone (or 1 alone), counting orders like 0, 2, 1: {call} returned {got} instead of {want}.',
    fix: 'Require all prerequisites: (need[v] & mask) == need[v].',
    clues: ['List the valid orders of 0, 1, 2 when 2 must come after both.', 'Which extra orders does the buggy count include?', 'What does need[v] & mask being non-zero tell you?'],
    decoys: [[['need[b] |= 1 << a', 'need[b] |= 1 << a'], 'Each edge adds a prerequisite. Right.'], [['C[0] = 1', 'C[0] = 1'], 'One way to place nothing. Right.'], [['C = [0] * (1 << n)', 'const C = new Array(1 << n).fill(0)'], 'One count per set of placed vertices. Right.']],
  },

  'subset-matching': {
    know: 'Matching the lowest vertex v with a neighbour u uses up both of them. What is left to match is the set without v and without u: rest ^ (1 << u).',
    swap: pair(['                D[mask] += D[rest ^ (1 << u)]', '                D[mask] += D[rest]'], ['      if (rest & adj[v] & (1 << u)) D[mask] += D[rest ^ (1 << u)]', '      if (rest & adj[v] & (1 << u)) D[mask] += D[rest]']),
    symptom: { args: [2, [[0, 1]]], expected: 1, buggy: 0 },
    bug: 'The partner left in the set',
    why: 'After pairing v with u, the code still asks for a perfect matching of a set that contains u. With two vertices joined by one edge, it asks how to match {1} alone, which can’t be done: {call} returned {got} instead of {want}.',
    fix: 'Remove the partner too: D[rest ^ (1 << u)].',
    clues: ['After pairing 0 with 1, which vertices are left?', 'Which mask does the code look up?', 'Can a set with an odd number of vertices be perfectly matched?'],
    decoys: [[['D[0] = 1', 'D[0] = 1'], 'The empty set has one matching, no edges. Right.'], [['v = low.bit_length() - 1', 'v = 31 - Math.clz32(low)'], 'The lowest vertex must be matched. Right.'], [['adj[a] |= 1 << b', 'adj[a] |= 1 << b'], 'Neighbours stored as a mask. Right.']],
  },

  'subset-coloring': {
    know: 'A colour class must be independent: no edge inside it. The class being tried is the lowest vertex plus the vertices in sub, so it is sub | low that must be independent, not sub alone.',
    swap: pair(['            if free[sub | low]:', '            if free[sub]:'], ['      if (free[sub | low]) D[mask] = Math.min(D[mask], D[rest ^ sub] + 1)', '      if (free[sub]) D[mask] = Math.min(D[mask], D[rest ^ sub] + 1)']),
    symptom: { args: [2, [[0, 1]]], expected: 2, buggy: 1 },
    bug: 'The lowest vertex’s conflicts never checked',
    why: 'Only sub is tested, so the lowest vertex is put in a colour class without checking its own edges. Two joined vertices end up the same colour: {call} returned {got} instead of {want}.',
    fix: 'Test the whole class, lowest vertex included: free[sub | low].',
    clues: ['Two joined vertices: how many colours?', 'Which vertices are in the class being tried?', 'Is free[sub] about the same set?'],
    decoys: [[['free[mask] = free[mask ^ low] and not adj[v] & mask', 'free[mask] = free[mask ^ low] && !(adj[v] & mask)'], 'A set is independent when its lowest vertex has no neighbour in it and the rest is independent. Right.'], [['D = [0] + [n]', 'D[0] = 0'], 'No vertices need no colours. Right.'], [['adj[a] |= 1 << b', 'adj[a] |= 1 << b'], 'Neighbours as a mask. Right.']],
  },

  'mask-language': {
    know: 'JavaScript’s << on ordinary numbers works in 32 bits: the shift amount is taken modulo 32, so 1 << 40 is 1 << 8 = 256. Wide masks need BigInt on both sides, 1n << BigInt(p). (The Python version below imitates the 32-bit shift so the bug is the same in both.)',
    swap: pair(['            m |= 1 << p', '            m |= 1 << (p % 32)'], ['    for (const p of s) m |= 1n << BigInt(p)', '    for (const p of s) m |= BigInt(1 << p)']),
    symptom: { args: [[[40]]], expected: '1099511627776', buggy: '256' },
    bug: 'A 32-bit shift',
    why: 'The shift is done on an ordinary 32-bit number and only then turned into a BigInt. 1 << 40 wraps to 1 << 8, so bit 40 becomes bit 8: {call} returned {got} instead of {want}.',
    fix: 'Shift a BigInt: 1n << BigInt(p), so no bits are lost.',
    clues: ['What is 2⁴⁰?', 'In JavaScript, what is 1 << 40?', 'Is the shift done before or after the value becomes a BigInt?'],
    decoys: [[['x ^= m', 'x ^= m'], 'XOR keeps the bits that appear an odd number of times. Right.'], [['return str(x)', 'return x.toString()'], 'A decimal string. Right.'], [['x = 0', 'let x = 0n'], 'The running XOR starts empty. Right.']],
  },
}
