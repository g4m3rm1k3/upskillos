// Bug hunts for the tree lessons (Advanced, trees group). Format: bug-hunts.js. Each symptom is the
// smallest input a search found where the buggy code and advanced-oracles.js disagree.
const pair = (Python, JavaScript) => ({ Python, JavaScript })
const ROOT_DECOY = [['if u != parent[v]:', 'if (u !== parent[order[i]])'], 'Every neighbour except the parent is a child: the rooting is right.']

export const TREE_HUNTS = {
  'tree-basics': {
    know: 'size[v] is 1 plus the sizes of v’s children. A vertex may pass its size up to its parent only once its own size is final, after all its children have added theirs. order lists parents before children, so the children-first walk goes through it backwards.',
    swap: pair(['    for v in reversed(order):', '    for v in order:'], ['  for (const v of [...order].reverse()) {', '  for (const v of order) {']),
    symptom: { args: [3, [[0, 1], [1, 2]]], expected: [3, 2, 1], buggy: [2, 2, 1] },
    bug: 'Parents before children',
    why: 'The loop walks order forwards, parents first. Vertex 1 passes its size up to 0 while it is still 1, before vertex 2 has added itself to vertex 1. So the root never hears about vertex 2: {call} returned {got} instead of {want}.',
    fix: 'Walk the order backwards: for v in reversed(order). Every child is then finished before its parent reads it.',
    clues: ['Which entry is wrong, and which vertex did it miss?', 'When vertex 1 adds its size to the root, has vertex 2 been added to vertex 1 yet?', 'order is [0, 1, 2] here. In which direction should the sizes flow?'],
    decoys: [ROOT_DECOY, [['size = [1] * n', 'const size = Array(n).fill(1)'], 'Every subtree contains its own root, so each size starts at 1. Right.'], [['size[parent[v]] += size[v]', 'size[parent[v]] += size[v]'], 'A child’s whole subtree belongs to its parent’s. Right, as long as the child is finished.']],
  },

  'tree-independent': {
    know: 'take[v] is the best for v’s subtree with v chosen; skip[v] with v not chosen. If v is chosen, none of its children may be (they share an edge with it), so take adds each child’s skip value. Only a skipped parent leaves a child free.',
    swap: pair(['            take[p] += skip[v]', '            take[p] += max(take[v], skip[v])'], ['      take[p] += skip[v]', '      take[p] += Math.max(take[v], skip[v])']),
    symptom: { args: [[2, 7], [[0, 1]]], expected: 7, buggy: 9 },
    bug: 'Neighbours both chosen',
    why: 'take[p] lets the child pick its better state, including being chosen itself. Then a chosen parent and a chosen child, joined by an edge, both count: 2 + 7. Only one of them may be chosen, so {call} returned {got} instead of {want}.',
    fix: 'take[p] += skip[v]: a chosen parent’s children are all skipped.',
    clues: ['In the symptom, which set of vertices gives the buggy total? Is it allowed?', 'If the parent is chosen, which states may a child be in?', 'Compare the two update lines: which one should allow the child either state?'],
    decoys: [ROOT_DECOY, [['skip[p] += max(take[v], skip[v])', 'skip[p] += Math.max(take[v], skip[v])'], 'With the parent skipped, a child is free to be either. Right.'], [['return max(take[0], skip[0])', 'return Math.max(take[0], skip[0])'], 'The root is chosen or not. Right.']],
  },

  'tree-cover': {
    know: 'chosen[v] and unchosen[v] are the smallest covers of v’s subtree with v chosen or not. The edge between v and a child must have a chosen end: if v is not chosen, the child must be.',
    swap: pair(['            unchosen[p] += chosen[v]', '            unchosen[p] += min(chosen[v], unchosen[v])'], ['      unchosen[p] += chosen[v]', '      unchosen[p] += Math.min(chosen[v], unchosen[v])']),
    symptom: { args: [2, [[0, 1]]], expected: 1, buggy: 0 },
    bug: 'An edge left uncovered',
    why: 'With the parent unchosen, the code lets the child be unchosen too, and then the edge between them has no chosen end. On a single edge it chooses nothing at all: {call} returned {got} instead of {want}.',
    fix: 'unchosen[p] += chosen[v]: an unchosen parent forces each child to be chosen.',
    clues: ['In the symptom, which edge does the buggy answer leave uncovered?', 'If the parent is not chosen, who must cover the edge to a child?', 'Which of the two updates should allow the child either state?'],
    decoys: [ROOT_DECOY, [[' chosen[p] += min(chosen[v], unchosen[v])', ' chosen[p] += Math.min(chosen[v], unchosen[v])'], 'A chosen parent covers the edge, so the child may be either. Right.'], [['return min(chosen[0], unchosen[0])', 'return Math.min(chosen[0], unchosen[0])'], 'The root may go either way. Right.']],
  },

  'tree-matching': {
    know: 'free[v] is the best matching in v’s subtree with v unmatched; best[v] with v matched or not. Matching a parent p to its child c uses the edge p–c, so c can’t also be matched to one of its own children: the gain is free[c] + 1 − best[c].',
    swap: pair(['            g = free[v] + 1 - best[v]', '            g = 1'], ['      const g = free[v] + 1 - best[v]', '      const g = 1']),
    symptom: { args: [3, [[0, 1], [1, 2]]], expected: 1, buggy: 2 },
    bug: 'The partner was already taken',
    why: 'The gain from matching p to a child is taken as 1, as if the child were free. In the path 0–1–2, vertex 1 is already matched to 2, and the code also matches 0 to 1: two edges sharing vertex 1. {call} returned {got} instead of {want}.',
    fix: 'g = free[v] + 1 - best[v]: the child must give up its own matching, so its subtree counts free[v], not best[v].',
    clues: ['Which two edges does the buggy answer use? Do they share a vertex?', 'If p is matched to child v, can v also be matched below?', 'What should matching to v cost v’s subtree?'],
    decoys: [ROOT_DECOY, [['free[p] += best[v]', 'free[p] += best[v]'], 'With p unmatched, each child’s subtree does its best. Right.'], [['return best[0]', 'return best[0]'], 'The best for the whole tree. Right.']],
  },

  'tree-diameter': {
    know: 'down[v] is the longest path from v down into its subtree. At a parent p, a new branch c may join the deepest branch merged so far into a path through p. The two must be different branches, so the path is checked before the new branch is folded into down[p].',
    swap: pair(['            best = max(best, down[p] + c)\n            down[p] = max(down[p], c)', '            down[p] = max(down[p], c)\n            best = max(best, down[p] + c)'], ['      best = Math.max(best, down[p] + c)\n      down[p] = Math.max(down[p], c)', '      down[p] = Math.max(down[p], c)\n      best = Math.max(best, down[p] + c)']),
    symptom: { args: [2, [[0, 1, 8]]], expected: 8, buggy: 16 },
    bug: 'A branch joined with itself',
    why: 'down[p] is updated first, so it may already be the new branch c. Then down[p] + c adds the same branch twice. On a single edge of length 8 the “path” goes down it and back again: {call} returned {got} instead of {want}.',
    fix: 'Check the path through p first, best = max(best, down[p] + c), and only then update down[p].',
    clues: ['A tree with one edge: what is its longest path?', 'When best is updated, does down[p] already include c?', 'Try swapping the order of the two lines.'],
    decoys: [[['c = down[v] + up[v]', 'const c = down[v] + up[v]'], 'The branch through v, seen from its parent. Right.'], [['parent[u], up[u] = v, w', 'up[u] = w'], 'The edge length from u up to its parent. Right.'], [['return best', 'return best'], 'Every path was tried at its highest vertex. Right.']],
  },

  'tree-reroot': {
    know: 'up[v] is the farthest distance from v going first to its parent p. From p the path may continue upward (up[p]) or down another branch of p, but not back down the branch it came from. So when v is p’s deepest child, the second deepest branch is used.',
    swap: pair(['            other = down2[p] if via[p] == v else down1[p]', '            other = down1[p]'], ['    const other = via[p] === v ? down2[p] : down1[p]', '    const other = down1[p]']),
    symptom: { args: [2, [[0, 1]]], expected: [1, 1], buggy: [1, 2] },
    bug: 'A message sent back to its sender',
    why: 'up[v] always uses p’s deepest branch, even when that branch is v’s own. From vertex 1 the code goes up to 0 and then back down to 1, counting a distance of 2 in a tree with one edge: {call} returned {got} instead of {want}.',
    fix: 'other = down2[p] if via[p] == v else down1[p]: when v gives p’s deepest branch, use the second deepest.',
    clues: ['In a tree with one edge, how far can anything be from vertex 1?', 'down1[0] here is 1. Which branch does it come from?', 'What is via for, and does the code use it?'],
    decoys: [ROOT_DECOY, [['c = down1[v] + 1', 'const c = down1[v] + 1'], 'A child’s deepest branch plus the edge to the parent. Right.'], [['up[v] = 1 + max(up[p], other)', 'up[v] = 1 + Math.max(up[p], other)'], 'One edge to the parent, then its best way onward. Right, if other avoids v.']],
  },

  'reroot-prefix': {
    know: 'up[c] counts the connected sets above c that contain c’s parent v: v with any choice from each of c’s siblings, times the choices above v. “Every sibling but c” is the prefix product before c times the suffix product after c: pre[i] · suf[i + 1].',
    swap: pair(['            up[c] = pre[i] * suf[i + 1] % MOD * (1 + up[v]) % MOD', '            up[c] = pre[i] * suf[i] % MOD * (1 + up[v]) % MOD'], ['    for (let i = 0; i < k; i++) up[ch[i]] = pre[i] * suf[i + 1] % MOD * (1n + up[v]) % MOD', '    for (let i = 0; i < k; i++) up[ch[i]] = pre[i] * suf[i] % MOD * (1n + up[v]) % MOD']),
    symptom: { args: [2, [[0, 1]]], expected: [2, 2], buggy: [2, 3] },
    bug: 'The excluded child included',
    why: 'suf[i] starts at child i itself, so pre[i] · suf[i] includes c’s own factor. The sets “above” c then also count sets that go back down through c. On one edge, vertex 1 gets 3 sets instead of {1} and {0, 1}: {call} returned {got} instead of {want}.',
    fix: 'Use suf[i + 1], the product of the children after c: up[c] = pre[i] * suf[i + 1] * (1 + up[v]).',
    clues: ['List the connected sets that contain vertex 1 in a tree with one edge.', 'Which children does suf[i] cover: from i on, or after i?', 'pre[i] covers the children before c. Which suffix completes “all but c”?'],
    decoys: [ROOT_DECOY, [['down[v] = down[v] * (1 + down[c]) % MOD', 'down[v] = down[v] * (1n + down[c]) % MOD'], 'Each child adds nothing or a set through it. Right.'], [['return [down[v] * (1 + up[v]) % MOD', 'return down.map'], 'A set through v is a set below v, with or without one above it. Right.']],
  },

  'tree-distances': {
    know: 'Moving the root from a parent to its child v, the size[v] vertices in v’s subtree each get one edge closer, and the other n − size[v] each get one edge farther. So answer(v) = answer(parent) − size[v] + (n − size[v]) = answer(parent) + n − 2·size[v].',
    swap: pair(['        answer[v] = answer[parent[v]] + n - 2 * size[v]', '        answer[v] = answer[parent[v]] + 2 * size[v] - n'], ['  for (const v of order.slice(1)) answer[v] = answer[parent[v]] + n - 2 * size[v]', '  for (const v of order.slice(1)) answer[v] = answer[parent[v]] + 2 * size[v] - n']),
    symptom: { args: [3, [[0, 1], [0, 2]]], expected: [2, 3, 3], buggy: [2, 1, 1] },
    bug: 'The correction has the wrong sign',
    why: 'The code adds 2·size[v] − n, as if the vertices in v’s subtree got farther and the rest closer. From leaf 1 the other leaf is 2 edges away and the centre 1: 3. The flipped sign gives {got}: {call} returned {got} instead of {want}.',
    fix: 'answer[v] = answer[parent[v]] + n - 2 * size[v]: the subtree comes closer, the rest moves away.',
    clues: ['Work out the sum of distances from vertex 1 by hand.', 'Moving from 0 to 1, which vertices get closer and which get farther?', 'Check the formula’s sign with size[v] = 1 and n = 3.'],
    decoys: [ROOT_DECOY, [['answer[0] = sum(depth)', 'answer[0] = depth.reduce'], 'From the root each distance is a depth. Right.'], [['depth[v] = depth[parent[v]] + 1', 'depth[v] = depth[parent[v]] + 1'], 'A child is one deeper than its parent. Right.']],
  },

  'tree-knapsack': {
    know: 'd[b] is the best value from v’s subtree with v chosen and total cost at most b. v alone is possible exactly when its cost fits: b ≥ costs[v]. A budget equal to the cost fits.',
    swap: pair(['        d = [values[v] if b >= costs[v] else NEG for b in range(budget + 1)]', '        d = [values[v] if b > costs[v] else NEG for b in range(budget + 1)]'], ['    let d = Array.from({ length: budget + 1 }, (_, b) => (b >= costs[v] ? values[v] : -Infinity))', '    let d = Array.from({ length: budget + 1 }, (_, b) => (b > costs[v] ? values[v] : -Infinity))']),
    symptom: { args: [[7], [2], [], 2], expected: 7, buggy: 0 },
    bug: 'A cost that exactly fits is refused',
    why: 'The test b > costs[v] treats a budget equal to the cost as too small. A single vertex costing 2, with a budget of 2, is refused: {call} returned {got} instead of {want}.',
    fix: 'b >= costs[v]: “at most b” includes spending exactly b.',
    clues: ['Can a vertex costing 2 be chosen with a budget of 2?', 'Which comparison decides whether v fits in budget b?', 'Print d for the symptom.'],
    decoys: [ROOT_DECOY, [['merged = d[:]', 'const merged = d.slice()'], 'Merging starts from “nothing from this child”. Right.'], [['return max(0, D[0][budget])', 'return Math.max(0, D[0][budget])'], 'The root and its best, or nothing. Right.']],
  },

  'tree-coloring': {
    know: 'ways[v][c] counts the colourings of v’s subtree with v coloured c. With the parent coloured c, a child may take any of its colours except c, so the child contributes its total minus its own count for c.',
    swap: pair(['                ways[p][c] *= total - ways[v].get(c, 0)', '                ways[p][c] *= total'], ['    for (const c of ways[p].keys()) ways[p].set(c, ways[p].get(c) * (total - (ways[v].get(c) ?? 0)))', '    for (const c of ways[p].keys()) ways[p].set(c, ways[p].get(c) * total)']),
    symptom: { args: [[[0, 1]], [[1], [1]]], expected: 0, buggy: 1 },
    bug: 'Equal colours across an edge',
    why: 'Each child contributes all its colourings, including those where it has the parent’s colour. Two joined vertices that may only be colour 1 have no proper colouring, yet the code counts one: {call} returned {got} instead of {want}.',
    fix: 'Multiply by total - ways[v].get(c, 0): leave out the child’s colourings that match the parent’s colour c.',
    clues: ['In the symptom, list every colouring. Which ones are proper?', 'With the parent coloured c, which of the child’s colourings are forbidden?', 'Where does the code use the parent’s colour c?'],
    decoys: [ROOT_DECOY, [['total = sum(ways[v].values())', 'total += x'], 'All the child’s colourings, whatever its colour. Right.'], [['return sum(ways[0].values())', 'answer += x'], 'The root may take any of its colours. Right.']],
  },

  'tree-path-count': {
    know: 'cnt[p] holds the depths below p among the branches merged so far. When a new child v is merged, its depths are paired with those already in cnt[p] (paths whose top is p, through two different branches), and only then added to cnt[p].',
    swap: pair(['            for d in range(k):\n                pairs += cnt[p][d] * cnt[v][k - 1 - d]\n            for d in range(k):\n                cnt[p][d + 1] += cnt[v][d]', '            for d in range(k):\n                cnt[p][d + 1] += cnt[v][d]\n            for d in range(k):\n                pairs += cnt[p][d] * cnt[v][k - 1 - d]'], ['    for (let d = 0; d < k; d++) pairs += cnt[p][d] * cnt[v][k - 1 - d]\n    for (let d = 0; d < k; d++) cnt[p][d + 1] += cnt[v][d]', '    for (let d = 0; d < k; d++) cnt[p][d + 1] += cnt[v][d]\n    for (let d = 0; d < k; d++) pairs += cnt[p][d] * cnt[v][k - 1 - d]']),
    symptom: { args: [2, [[0, 1]], 2], expected: 0, buggy: 1 },
    bug: 'Merged before it was paired',
    why: 'The child’s depths are added to cnt[p] first, so the pairing then matches the child’s branch with itself: vertex 1 is paired with its own copy one level deeper. A tree with one edge has no pair at distance 2, yet {call} returned {got} instead of {want}.',
    fix: 'Pair first, then merge: the pairing loop must run while cnt[p] still holds only the other branches.',
    clues: ['A tree with one edge: how many pairs are 2 edges apart?', 'When pairs is updated, does cnt[p] already include v’s own branch?', 'Swap the order of the two loops.'],
    decoys: [ROOT_DECOY, [['cnt = [[1] + [0] * k', 'const cnt = Array.from'], 'Each vertex is at depth 0 below itself. Right.'], [['return pairs', 'return pairs'], 'Every pair was counted at its highest vertex. Right.']],
  },

  'tree-connected': {
    know: 'C[v] counts the connected sets whose highest vertex is v. Each child c independently contributes either nothing, or one of the C[c] connected sets through it: 1 + C[c] choices, multiplied over the children.',
    swap: pair(['            C[parent[v]] *= 1 + C[v]', '            C[parent[v]] *= C[v]'], ['    if (parent[v] >= 0) C[parent[v]] *= 1 + C[v]', '    if (parent[v] >= 0) C[parent[v]] *= C[v]']),
    symptom: { args: [2, [[0, 1]]], expected: 3, buggy: 2 },
    bug: 'A child forced into every set',
    why: 'Multiplying by C[v] leaves out the choice “take nothing from this child”, so every set with top p must reach into every child. On one edge, the set {0} is lost: {call} returned {got} instead of {want}.',
    fix: 'C[parent[v]] *= 1 + C[v]: the 1 is the option of not entering the child at all.',
    clues: ['List the connected sets of a tree with one edge.', 'Which set is missing from the buggy count?', 'For one child, how many choices does the parent have?'],
    decoys: [ROOT_DECOY, [['C = [1] * n', 'const C = Array(n).fill(1)'], 'Before merging children, a vertex has the one set {v}. Right.'], [['return sum(C)', 'return C.reduce'], 'Each set has one highest vertex. Right.']],
  },

  'tree-small-large': {
    know: 'Small-to-large merging reuses sets: a child’s set may become its parent’s set and keep growing as more vertices are merged in. So a vertex’s answer has to be read at the moment it is finished, before its set can be handed upward and changed.',
    swap: pair(['    return answer', '    return [len(s) for s in sets]'], ['  return answer', '  return sets.map(s => s.size)']),
    symptom: { args: [[2, 3, 1], [[0, 1], [1, 2]]], expected: [3, 2, 1], buggy: [3, 3, 1] },
    bug: 'A reused set read too late',
    why: 'The answers are read from sets at the end. Vertex 1’s set was larger than its parent’s, so it was reused as the parent’s set and then received the parent’s colour too. By the end it holds 3 colours: {call} returned {got} instead of {want}.',
    fix: 'Return answer, which was filled with len(sets[v]) while each vertex was finished, before its set could be reused.',
    clues: ['Print sets at the end. Is sets[1] the same object as sets[0]?', 'When is answer[v] filled, and is it used?', 'Which colours are in vertex 1’s subtree?'],
    decoys: [ROOT_DECOY, [['answer[v] = len(sets[v])', 'answer[v] = sets[v].size'], 'Read when v is finished: right, if this is what is returned.'], [['sets[p] = big', 'sets[p] = big'], 'The parent keeps the larger set, now holding both. Right.']],
  },
}
