// Bug hunts for the parsing and inference lessons (Specialist, parsing group). Format: bug-hunts.js. Each
// symptom is a small input where the buggy code and specialist-oracles.js disagree, found by a search of
// buggy code against the oracle; each symptom is also a case of its lesson's challenge.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const PARSE_HUNTS = {
  'cyk': {
    know: 'A piece s[i:j] is split into s[i:k] and s[k:j] with both parts non-empty, so k runs over i + 1, …, j − 1. The last split leaves one letter on the right.',
    swap: pair(['            for k in range(i + 1, j):', '            for k in range(i + 1, j - 1):'], ['      for (let k = i + 1; k < j; k++) {', '      for (let k = i + 1; k < j - 1; k++) {']),
    symptom: { args: [[['S', 'AB'], ['A', 'a'], ['B', 'b']], 'ab'], expected: true, buggy: false },
    bug: 'The last split is never tried',
    why: 'The splits stop one short, so the split that leaves one letter on the right is skipped. "ab" has only one split, a | b, which is exactly that one: S → AB is never checked, and {call} returned {got} instead of {want}.',
    fix: 'Try every split with both parts non-empty: range(i + 1, j).',
    clues: ['How many ways can "ab" be split into two non-empty parts?', 'For i = 0, j = 2, which values does k take?', 'Which split leaves one letter on the right?'],
    decoys: [[['if n == 0:', 'if (n === 0) return false'], 'No empty rules, so the empty string is never derived. Right.'], [['for length in range(2, n + 1):', 'for (let length = 2; length <= n; length++) {'], 'Shorter pieces first. Right.'], [['return "S" in D[0][n]', "return D[0][n].has('S')"], 'The whole string, from S. Right.']],
  },

  'weighted-parsing': {
    know: 'Trees for X → YZ split at k pair every tree of Y on the left part with every tree of Z on the right part, so their counts multiply. Different splits and rules add.',
    swap: pair(['                        ways = D[i][k].get(rhs[0], 0) * D[k][j].get(rhs[1], 0)', '                        ways = D[i][k].get(rhs[0], 0) + D[k][j].get(rhs[1], 0)'], ['          const ways = (D[i][k].get(rhs[0]) ?? 0n) * (D[k][j].get(rhs[1]) ?? 0n)', '          const ways = (D[i][k].get(rhs[0]) ?? 0n) + (D[k][j].get(rhs[1]) ?? 0n)']),
    symptom: { args: [[['S', 'SS'], ['S', 'a']], 'aa'], expected: 1, buggy: 2 },
    bug: 'The two parts’ counts are added',
    why: 'Adding counts the left trees and the right trees separately, as if each alone made a tree of the whole piece. "aa" has one tree, S → SS with an a under each S, but 1 + 1 gives 2: {call} returned {got} instead of {want}. It also counts a split where one part has no tree at all.',
    fix: 'Multiply: every left tree goes with every right tree.',
    clues: ['Draw the parse trees of "aa" under S → SS | a. How many are there?', 'At the split a | a, how many trees does each part have?', 'How many whole trees do they make together?'],
    decoys: [[['D[i][i + 1][lhs] = D[i][i + 1].get(lhs, 0) + 1', 'D[i][i + 1].set(lhs, (D[i][i + 1].get(lhs) ?? 0n) + 1n)'], 'One tree per rule X → letter. Right.'], [['for k in range(i + 1, j):', 'for (let k = i + 1; k < j; k++) {'], 'Every split. Right.'], [['D[i][j][lhs] = (D[i][j].get(lhs, 0) + ways) % M', 'D[i][j].set(lhs, ((D[i][j].get(lhs) ?? 0n) + ways) % M)'], 'Different splits and rules add. Right.']],
  },

  'earley': {
    know: 'An item records where its rule started matching. A rule predicted at position i starts at i, so that when it is finished, completion goes back to chart[i] to find the items that were waiting for it.',
    swap: pair(['                    new += [(q, 0, i) for q in range(len(rules)) if rules[q][0] == x]', '                    new += [(q, 0, 0) for q in range(len(rules)) if rules[q][0] == x]'], ['          rules.forEach(([l], q) => { if (l === x) next.push([q, 0, i]) })', '          rules.forEach(([l], q) => { if (l === x) next.push([q, 0, 0]) })']),
    symptom: { args: [[['S', 'aSb'], ['S', '']], 'a'], expected: false, buggy: true },
    bug: 'A predicted rule starts at 0',
    why: 'Every predicted item claims to start at 0. After the a, at position 1, the empty rule S → ε is predicted and is finished at once, so it is recorded as an S running from 0 to 1: as if S derived the whole string "a". {call} returned {got} instead of {want}.',
    fix: 'A rule predicted at position i starts at i: (q, 0, i).',
    clues: ['Is "a" derived by S → aSb | ε?', 'After reading the a, which items are in chart[1]?', 'When the inner S finishes, which chart should completion look in?'],
    decoys: [[['if x in nullable:', 'if (nullable.has(x)) next.push([r, dot + 1, start])'], 'A nullable X can be stepped over at once. Right.'], [['chart[i + 1].add((r, dot + 1, start))', 'chart[i + 1].set(key(r, dot + 1, start), [r, dot + 1, start])'], 'Scan moves the item to the next position. Right.'], [['todo = list(chart[i])', 'const todo = [...chart[i].values()]'], 'Each item at i is processed once. Right.']],
  },

  'inside-outside': {
    know: 'The outside weight of the left child B of X → BC over [a, k) is the parent’s outside, times the rule, times the inside of its sibling C over [k, b): everything in the tree except B’s own subtree.',
    swap: pair(['                            outside[a][k][B] = outside[a][k].get(B, 0) + out * p * inside[k][b].get(C, 0)', '                            outside[a][k][B] = outside[a][k].get(B, 0) + out * p * inside[a][k].get(B, 0)'], ['            outside[a][k].set(B, get(outside[a][k], B) + out * BigInt(p) * get(inside[k][b], C))', '            outside[a][k].set(B, get(outside[a][k], B) + out * BigInt(p) * get(inside[a][k], B))']),
    symptom: { args: [[['S', 'SS', 50], ['S', 'a', 50]], 'aaa', 'S', 0, 2], expected: '1/2', buggy: '1250/1' },
    bug: 'The left child’s outside uses its own inside',
    why: 'Multiplying by B’s own inside counts B’s subtree inside its own surroundings and leaves out the sibling’s. Then inside · outside counts B’s subtree twice and the sibling never: for "aaa", the two trees split as (aa)a and a(aa), so [0, 2) is a constituent with chance 1/2, but {call} returned {got} instead of {want}, more than 1.',
    fix: 'Use the sibling’s inside: inside[k][b] for C.',
    clues: ['"aaa" under S → SS | a: draw the two trees. In how many is [0, 2) a node?', 'What should outside(S, 0, 2) leave out, and what should it include?', 'Compare the line for the left child with the line for the right child.'],
    decoys: [[['outside[0][n]["S"] = 1', "outside[0][n].set('S', 1n)"], 'Nothing surrounds the whole string. Right.'], [['outside[k][b][C] = outside[k][b].get(C, 0) + out * p * inside[a][k].get(B, 0)', 'outside[k][b].set(C, get(outside[k][b], C) + out * BigInt(p) * get(inside[a][k], B))'], 'The right child, with its left sibling’s inside. Right.'], [['top = inside[i][j].get(X, 0) * outside[i][j].get(X, 0)', 'top = get(inside[i][j], X) * get(outside[i][j], X)'], 'Surroundings times subtree. Right.']],
  },

  'viterbi': {
    know: 'trans[r][s] is the cost of moving from state r to state s. A path ending in s at time t came from some r at t − 1, so it pays trans[r][s].',
    swap: pair(['        V = [min(V[r] + trans[r][s] for r in range(k)) + emit[s][o] for s in range(k)]', '        V = [min(V[r] + trans[s][r] for r in range(k)) + emit[s][o] for s in range(k)]'], ['    V = V.map((_, s) => Math.min(...V.map((v, r) => v + trans[r][s])) + emit[s][o])', '    V = V.map((_, s) => Math.min(...V.map((v, r) => v + trans[s][r])) + emit[s][o])']),
    symptom: { args: [[0, 4], [[2, 3], [1, 8]], [[5], [1]], [0, 0]], expected: 9, buggy: 7 },
    bug: 'The transition is read backwards',
    why: 'trans[s][r] is the cost of moving from s to r, the opposite direction. With a symmetric matrix nothing changes, which hides the bug; here moving 1 → 0 costs 1 but 0 → 1 costs 3, and {call} returned {got} instead of {want}: a cost no real path has.',
    fix: 'Pay for moving from r into s: read trans[r][s].',
    clues: ['List the four paths of length 2 and their costs.', 'Which entry of trans is the cost of moving from state 0 to state 1?', 'Which entry does the code read for a path from r into s?'],
    decoys: [[['V = [start[s] + emit[s][obs[0]] for s in range(k)]', 'let V = start.map((c, s) => c + emit[s][obs[0]])'], 'Time 0: start cost plus the first observation. Right.'], [['for o in obs[1:]:', 'for (const o of obs.slice(1)) {'], 'One step per later observation. Right.'], [['return min(V)', 'return Math.min(...V)'], 'The path may end in any state. Right.']],
  },

  'forward-backward': {
    know: 'beta(u, x) is the weight of what happens after time u, given state x at u: move to y, y emits the observation at time u + 1, then beta(u + 1, y).',
    swap: pair(['            beta[u][x] = sum(trans[x][y] * emit[y][obs[u + 1]] * beta[u + 1][y] for y in range(k))', '            beta[u][x] = sum(trans[x][y] * emit[y][obs[u]] * beta[u + 1][y] for y in range(k))'], ['      for (let y = 0; y < k; y++) sum += B(trans[x][y] * emit[y][obs[u + 1]]) * beta[u + 1][y]', '      for (let y = 0; y < k; y++) sum += B(trans[x][y] * emit[y][obs[u]]) * beta[u + 1][y]']),
    symptom: { args: [[1, 1], [[2, 1], [1, 2]], [[3, 1], [1, 3]], [0, 0, 1], 1, 0], expected: '3/4', buggy: '21/20' },
    bug: 'Backward emits the wrong observation',
    why: 'Using obs[u] makes the next state emit the observation of time u, which alpha already paid for at u, while the observation at u + 1 is never paid. The front and back parts no longer fit together, and the shares stop adding up to 1: {call} returned {got} instead of {want}, more than 1.',
    fix: 'The next state emits the next observation: obs[u + 1].',
    clues: ['Do the shares of the states at one time add up to 1?', 'Which observation is emitted at time u + 1?', 'Which observations does alpha(t, s) include, and which should beta(t, s)?'],
    decoys: [[['beta[T - 1][x] = 1', 'beta[T - 1][x] = 1n'], 'Nothing follows the last time. Right.'], [['alpha[u][x] = sum(alpha[u - 1][y] * trans[y][x] for y in range(k)) * emit[x][obs[u]]', 'alpha[u][x] = sum * B(emit[x][obs[u]])'], 'Forward: move into x, then x emits. Right.'], [['top = alpha[t][s] * beta[t][s]', 'top = alpha[t][s] * beta[t][s]'], 'Front part times back part. Right.']],
  },

  'belief-propagation': {
    know: 'A node’s message to its parent sums its whole subtree, so it may only be sent once all of its children have sent theirs. Leaves first.',
    swap: pair(['    for v in reversed(order[1:]):', '    for v in order[1:]:'], ['  for (const v of order.slice(1).reverse()) {', '  for (const v of order.slice(1)) {']),
    symptom: { args: [3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[0, 1], [1, 2]], [[0, 1, 1], [1, 0, 1], [1, 1, 0]]], expected: 12, buggy: 6 },
    bug: 'Messages are sent from the root downwards',
    why: 'In breadth-first order, node 1 sends its message to node 0 before node 2 has sent its own to node 1, so node 2 is never counted. The path 0 – 1 – 2 with three colours and neighbours different has 3 · 2 · 2 = 12 colourings, but {call} returned {got} instead of {want}: only the colourings of 0 – 1.',
    fix: 'Send messages leaves first: go through the order backwards.',
    clues: ['How many proper 3-colourings has the path 0 – 1 – 2?', 'In which order are messages sent?', 'When node 1 sends its message, what has it heard from node 2?'],
    decoys: [[['belief = [row[:] for row in unary]', 'const belief = unary.map(row => row.map(BigInt))'], 'Each node starts with its own weights. Right.'], [['belief[u][x] = belief[u][x] * msg[x] % M', 'belief[u][x] = belief[u][x] * msg[x] % M'], 'Subtrees meet only at the parent: messages multiply. Right.'], [['return sum(belief[0]) % M', 'return Number(belief[0].reduce((a, b) => a + b, 0n) % M)'], 'Sum over the root’s values. Right.']],
  },

  'rna-folding': {
    know: 'A pair i–j needs at least three positions between them, j − i ≥ 4. Pairing j − 1 with k therefore needs k ≤ j − 5.',
    swap: pair(['            for k in range(i, j - 4):', '            for k in range(i, j - 1):'], ['      for (let k = i; k < j - 4; k++) {', '      for (let k = i; k < j - 1; k++) {']),
    symptom: { args: ['CGAGU'], expected: 0, buggy: 1 },
    bug: 'Pairs too close together are allowed',
    why: 'Letting k run up to j − 2 allows pairs with fewer than three positions between them. In CGAGU the letters that may pair are C–G at 0–1 and 0–3, A–U at 2–4, and G–U at 1–4 and 3–4: none has three positions between, so there is no pair, but the code pairs one: {call} returned {got} instead of {want}.',
    fix: 'Keep three positions between the pair: k < j − 4.',
    clues: ['List every pair of positions in CGAGU whose letters may pair.', 'How many positions lie between each pair?', 'Which values of k does the loop allow for j − 1 = 4?'],
    decoys: [[['for length in range(5, n + 1):', 'for (let length = 5; length <= n; length++) {'], 'Pieces shorter than 5 hold no pair. Right.'], [['best = D[i][j - 1]', 'let best = D[i][j - 1]'], 'The last position unpaired. Right.'], [['best = max(best, D[i][k] + 1 + D[k + 1][j - 1])', 'best = Math.max(best, D[i][k] + 1 + D[k + 1][j - 1])'], 'The pair splits the piece in two. Right.']],
  },
}
