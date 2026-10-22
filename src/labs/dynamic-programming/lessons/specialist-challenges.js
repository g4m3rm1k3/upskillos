// The Specialist challenges (lessons/specialist.js), one per lesson as the lessons become full ones. Each is
// a problem the lesson's technique makes fast: the last case is too large to list every answer. Every
// expected value was produced by specialist-oracles.js where it can enumerate, and the large cases have
// closed forms (Fibonacci numbers, powers, published tiling and cycle counts); lessons.test.js re-checks them.
import { task } from './challenges.js'

const range = n => Array.from({ length: n }, (_, i) => i)
const open = (h, w) => range(h).map(() => range(w).map(() => 0))
// The 8 × 8 board without two opposite corners.
const mutilated = open(8, 8).map((row, r) => row.map((_, c) => ((r === 0 && c === 0) || (r === 7 && c === 7) ? 1 : 0)))
// Two rows of 200 cells, every tenth column blocked: twenty separate 2 × 9 boards.
const striped = range(2).map(() => range(200).map(c => (c % 10 === 9 ? 1 : 0)))
// The 2 × 30 ladder (top cell i is vertex 2i, bottom cell 2i + 1), with a decomposition into a path of bags.
const ladder = (() => {
  const edges = [], bags = []
  for (let i = 0; i < 30; i++) { edges.push([2 * i, 2 * i + 1]); if (i + 1 < 30) edges.push([2 * i, 2 * i + 2], [2 * i + 1, 2 * i + 3]) }
  for (let i = 0; i + 1 < 30; i++) bags.push([2 * i, 2 * i + 1, 2 * i + 2], [2 * i + 1, 2 * i + 2, 2 * i + 3])
  return [range(60).map(() => 1), edges, bags, range(bags.length - 1).map(b => [b, b + 1])]
})()
// The cycle 0 – 1 – … – (n − 1) – 0 and its path decomposition {0, i, i + 1}.
const cycle = n => [range(n).map(i => [i, (i + 1) % n]), range(n - 2).map(i => [0, i + 1, i + 2])]

// The nice form of a tree decomposition rooted at bag 0: empty leaves, one vertex introduced or forgotten
// per node, joins of two children with the same bag, and an empty root, always listed last.
function toNice(bags, tree) {
  const nodes = [], links = bags.map(() => [])
  for (const [a, b] of tree) { links[a].push(b); links[b].push(a) }
  const add = node => (nodes.push(node), nodes.length - 1)
  const morph = (at, have, target) => {
    for (const v of have) if (!target.includes(v)) at = add(['forget', at, v])
    for (const v of target) if (!have.includes(v)) at = add(['introduce', at, v])
    return at
  }
  const build = (b, parent) => {
    const kids = links[b].filter(c => c !== parent).map(c => morph(build(c, b), bags[c], bags[b]))
    if (!kids.length) return morph(add(['leaf']), [], bags[b])
    return kids.reduce((x, y) => add(['join', x, y]))
  }
  morph(build(0, -1), bags[0], [])
  return nodes
}
// The path 0 – 1 – … – (n − 1), as [n, edges, nodes].
const nicePath = n => [n, range(n - 1).map(i => [i, i + 1]), toNice(range(n - 1).map(i => [i, i + 1]), range(n - 2).map(i => [i, i + 1]))]

const PROFILE_CHALLENGES = {
  'broken-profile': task('h, w', 'Count the ways to tile an h × w board with 1 × 2 dominoes, laid either way, modulo 1 000 000 007.', 'h ≤ 8, w ≤ 200. Listing tilings is hopeless: the 8 × 8 board alone has nearly 13 million.', [
    [[2, 3], 3],
    [[2, 4], 5],
    [[3, 3], 0],
    [[4, 4], 36],
    [[1, 4], 1],
    [[5, 6], 1183],
    [[8, 8], 12988816],
    [[2, 200], 529309711],
  ], ['Fill the board one cell at a time, down each column. Which cells of the next column can already be covered?', 'Keep a mask of h bits: bit r says whether row r’s next cell is already covered by a domino from the left.', 'At a cell that is already covered, just clear its bit. Otherwise lay a domino to the right (set the bit) or downwards (cover the cell below, if it is free).']),

  'domino-tiling': task('h, w', 'Count the ways to tile an h × w board with 1 × 2 dominoes and L-shaped trominoes (a 2 × 2 square with one cell missing), each piece turned any way, modulo 1 000 000 007.', 'h ≤ 6, w ≤ 300.', [
    [[2, 3], 5],
    [[2, 1], 1],
    [[1, 3], 0],
    [[3, 3], 8],
    [[3, 4], 55],
    [[4, 4], 380],
    [[2, 300], 768506587],
    [[6, 300], 489801411],
  ], ['Work one column at a time. A piece never reaches more than one column past the column it starts in.', 'T[s][t]: the ways to finish a column whose cells s are already covered, leaving cells t of the next column covered. Find T by filling the column’s first free cell with every piece that fits, again and again.', 'Then each column multiplies the counts by T: ways[t] += T[s][t] · ways[s], starting from the empty mask and ending on it.']),

  'profile-obstacles': task('grid', 'grid is a board of 0s (free) and 1s (blocked). Count the ways to cover every free cell with 1 × 2 dominoes that lie on free cells only, modulo 1 000 000 007.', 'At most 8 rows and 200 columns.', [
    [[[[0, 0], [0, 0]]], 2],
    [[[[1, 1], [0, 0]]], 1],
    [[[[1, 0], [0, 0]]], 0],
    [[[[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]]], 2],
    [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 2],
    [[[[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]]], 0],
    [[mutilated], 0],
    [[striped], 172622091],
  ], ['Use the broken profile, going down each column, with a mask of the next cells already covered.', 'A blocked cell must not already be covered: drop that mask. Otherwise it passes on unchanged.', 'Never lay a domino onto a blocked cell: check the cell to the right and the cell below before covering them.']),

  'plug-dp': task('grid', 'grid is a board of 0s (free) and 1s (blocked). Count the ways to draw one or more closed loops along the lines between the centres of neighbouring free cells, so that every free cell has exactly one loop passing through it, modulo 1 000 000 007. A board with no free cell counts 1 (no loops).', 'At most 200 rows and 8 columns.', [
    [[[[0, 0], [0, 0]]], 1],
    [[[[0, 0, 0, 0], [0, 0, 0, 0]]], 2],
    [[[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], 0],
    [[open(3, 4)], 3],
    [[open(4, 4)], 18],
    [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 1],
    [[[[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0], [1, 0, 0, 0]]], 0],
    [[open(200, 2)], 179948066],
    [[open(200, 8)], 735331560],
  ], ['Scan cell by cell, row by row. Between the done cells and the rest, each of the w + 1 crossing points either has a line through it (a plug) or not.', 'Each free cell needs two lines. Count the plugs coming in from the left and from above: two, so none go out; one, so it continues down or right; none, so it starts a turn going both down and right.', 'A blocked cell takes no plugs and gives none. At the end of a row, shift the mask by one place for the next row.']),

  'hamiltonian-grid': task('grid', 'grid is a board of 0s (free) and 1s (blocked). Count the single closed loops that pass through every free cell exactly once, moving between neighbouring free cells.', 'At most 8 rows and 8 columns. The 8 × 8 board has over 4.6 million such loops.', [
    [[[[0, 0], [0, 0]]], 1],
    [[open(3, 3)], 0],
    [[open(4, 4)], 6],
    [[open(3, 4)], 2],
    [[open(4, 5)], 14],
    [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 1],
    [[[[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]]], 0],
    [[open(6, 6)], 1072],
    [[open(8, 8)], 4638576],
  ], ['Use plugs as for loop covers, but give each plug a label: two plugs with the same label are the two ends of one path.', 'Two plugs meeting at a cell either join two different paths (relabel one to the other) or close a loop. Closing is allowed only at the last free cell, with no other plug open.', 'Rename labels in order of first appearance after every step, so states that mean the same thing are counted together.']),

  'connectivity-canonical': task('grid', 'grid is a board of 0s (free) and 1s (blocked). Count the non-empty sets of free cells that are connected: from any chosen cell you can reach every other by steps up, down, left or right through chosen cells. Return the count modulo 1 000 000 007.', 'At most 100 rows and 6 columns.', [
    [[[[0]]], 1],
    [[[[0, 0]]], 3],
    [[[[0, 0], [0, 0]]], 13],
    [[[[0, 1], [1, 0]]], 2],
    [[open(3, 3)], 218],
    [[[[0, 0, 0], [1, 0, 1], [0, 0, 0]]], 37],
    [[open(3, 4)], 1126],
    [[open(200, 1)], 20100],
    [[open(100, 6)], 854634653],
  ], ['Go cell by cell, row by row. The frontier is the last w cells: for each, 0 if it was left out, or a label naming which piece of the chosen set it belongs to.', 'Choosing a cell joins the pieces of its left and upper neighbours. When a piece’s last frontier cell leaves without touching anything new, it can never grow: if it is the only piece, the set is finished; if not, the set can never become connected.', 'Rename labels in order of first appearance, so [7, 7, 3] and [1, 1, 2] are the same state.']),

  'treewidth': task('weights, edges, bags, tree', 'A graph has vertices 0 to n − 1 with the given weights and edges. bags and tree are a tree decomposition of it: each edge lies inside some bag, and the bags holding any one vertex form a connected part of the tree (whose edges join bag indices). Return the largest total weight of a set of vertices with no edge between any two of them.', 'Up to 60 vertices, 60 bags, at most 4 vertices in a bag; weights 0 to 100. Trying every set of vertices is 2⁶⁰.', [
    [[[3, 2, 2], [[0, 1], [1, 2], [0, 2]], [[0, 1, 2]], []], 3],
    [[[1, 5, 1, 1], [[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2]]], 6],
    [[[5, 2, 2, 2, 2], [[0, 1], [0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3]]], 8],
    [[[4, 1, 3, 2], [[0, 1], [1, 2], [2, 3], [3, 0]], [[0, 1, 2], [0, 2, 3]], [[1, 0]]], 7],
    [[[2, 3, 1, 4, 2, 2], [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [4, 5], [3, 5]], [[0, 1, 2], [2, 3], [3, 4, 5]], [[0, 1], [1, 2]]], 7],
    [[[7], [], [[0]], []], 7],
    [ladder, 30],
  ], ['Root the tree at bag 0 and work from the leaves up. For each bag, try every subset S of its vertices that has no edge inside it.', 'best[b][S]: the heaviest set below bag b whose vertices in bag b are exactly S. A child joins in with its best choice that agrees with S on the vertices they share.', 'The shared vertices’ weights are counted in S already: subtract them from the child’s value.']),

  'pathwidth': task('k, edges, bags', 'bags is a path decomposition of a graph: every edge lies inside some bag, and each vertex appears in a run of consecutive bags. Count the ways to colour every vertex that appears in a bag with one of k colours so that no edge joins two vertices of the same colour, modulo 1 000 000 007.', 'Up to 60 vertices and 60 bags of at most 4 vertices; k ≤ 4. Trying every colouring is 4⁶⁰.', [
    [[3, [[0, 1], [1, 2]], [[0, 1], [1, 2]]], 12],
    [[3, [[0, 1], [1, 2], [0, 2]], [[0, 1, 2]]], 6],
    [[2, [[0, 1], [1, 2], [0, 2]], [[0, 1, 2]]], 0],
    [[3, [[0, 1], [1, 2], [2, 3], [3, 0]], [[0, 1, 2], [0, 2, 3]]], 18],
    [[3, [], [[0], [1]]], 9],
    [[2, [[0, 1], [1, 2], [2, 3]], [[0, 1], [1, 2], [2, 3]]], 2],
    [[3, ...cycle(60)], 536396506],
  ], ['Walk along the bags, keeping, for each colouring of the current bag, how many ways the vertices seen so far can be coloured.', 'Moving to the next bag, vertices that leave are forgotten: colourings that now look the same add their counts together.', 'Then try every colour for each vertex that arrives, keeping only colourings with no edge inside the bag joining two equal colours.']),

  'nice-tree-decomp': task('n, edges, nodes', 'A graph has vertices 0 to n − 1 and the given edges. nodes is a nice tree decomposition of it, children before parents and the root last: ["leaf"] has an empty bag; ["introduce", c, v] is child c’s bag plus v; ["forget", c, v] is child c’s bag minus v; ["join", a, b] joins two children with the same bag. The root’s bag is empty. Count the sets D of vertices such that every vertex is in D or next to a vertex in D, modulo 1 000 000 007.', 'Up to 60 vertices and 400 nodes, at most 4 vertices in a bag.', [
    [[1, [], [['leaf'], ['introduce', 0, 0], ['forget', 1, 0]]], 1],
    [nicePath(3), 5],
    [[3, [[0, 1], [1, 2], [0, 2]], toNice([[0, 1, 2]], [])], 7],
    [[4, [[0, 1], [0, 2], [0, 3]], toNice([[0, 1], [0, 2], [0, 3]], [[0, 1], [0, 2]])], 9],
    [[4, [[0, 1], [1, 2], [2, 3], [3, 0]], toNice([[0, 1, 2], [0, 2, 3]], [[0, 1]])], 11],
    [[2, [[0, 1]], [['leaf'], ['introduce', 0, 0], ['introduce', 1, 1], ['forget', 2, 1], ['leaf'], ['introduce', 4, 0], ['join', 3, 5], ['forget', 6, 0]]], 3],
    [nicePath(60), 420040737],
  ], ['Give each bag vertex one of three states: in D; out but next to a chosen vertex; out and not yet next to one.', 'Introducing v sees its edges into the bag: if v is in D, its neighbours there become covered; if not, v is covered when a neighbour in the bag is in D. Forgetting v drops the states where v is still uncovered.', 'A join multiplies the counts of two states that agree on who is in D; a vertex is covered if either side covered it.']),
}

// Probabilistic group: answers are exact fractions "p/q" in lowest terms ("0/1" for zero). The large cases
// were checked against closed forms (inclusion–exclusion, binomials, E(d) = 2d/3 + A − A(−1/2)ᵈ, 12·H₁₂)
// or, for the 30-square board and the six-faced variance, against a separate float computation.
const board30 = [30, 6, [[3, 22], [5, 8], [11, 26], [20, 29], [27, 1], [21, 9], [17, 4], [19, 7]]]
const mixed = [[1, 9, 9, 1, 9, 9, 1, 9, 9, 1, 9, 9, 1, 9], range(14).map(() => 4), [50, 75, 25, 50, 75, 25, 50, 75, 25, 50, 75, 25, 50, 75]]
const flat = (n, a, b, p) => [range(n).map(() => a), range(n).map(() => b), range(n).map(() => p)]
const EXACT = 'Return it as an exact fraction "p/q" in lowest terms: "3/2", "4/1", "0/1".'

const PROB_CHALLENGES = {
  'probability-distribution': task('n, s, t', `Roll n fair dice, each with faces 1 to s. Return the chance that they add up to exactly t. ${EXACT}`, 'n ≤ 50, s ≤ 6, 0 ≤ t ≤ n · s + 1. There are 6⁵⁰ outcomes to list, and the counts outgrow 64 bits: use Python’s integers or JavaScript’s BigInt.', [
    [[2, 6, 7], '1/6'],
    [[1, 6, 3], '1/6'],
    [[2, 4, 5], '1/4'],
    [[3, 6, 10], '1/8'],
    [[2, 6, 1], '0/1'],
    [[3, 2, 4], '3/8'],
    [[4, 6, 14], '73/648'],
    [[50, 6, 175], '123228004764132146129476197896041391/3742042951225759540014535187298779136'],
  ], ['All sⁿ outcomes are equally likely, so count the outcomes that add up to t and divide by sⁿ at the end.', 'W(i, x): the outcomes of the first i dice that add up to x. The last die shows some face f, so W(i, x) adds W(i − 1, x − f).', 'Counting in whole numbers keeps everything exact; reduce the fraction once, at the end.']),

  'poisson-binomial': task('p, k', `p lists independent trials: trial i succeeds with chance p[i] percent. Return the chance of exactly k successes. ${EXACT}`, 'Up to 100 trials, 0 ≤ p[i] ≤ 100, 0 ≤ k ≤ the number of trials. Listing the 2¹⁰⁰ outcomes is hopeless.', [
    [[[20, 70], 1], '31/50'],
    [[[50, 50], 2], '1/4'],
    [[[], 0], '1/1'],
    [[[100, 0], 1], '1/1'],
    [[[30, 60, 90], 2], '63/125'],
    [[[20, 70, 50], 3], '7/100'],
    [[[10, 20, 30, 40, 50, 60], 3], '1237/5000'],
    [[range(100).map(() => 50), 50], '12611418068195524166851562157/158456325028528675187087900672'],
  ], ['The trials have different chances, so a binomial coefficient can’t count them: keep the whole distribution of the number of successes.', 'P(i, j): the chance of exactly j successes among the first i trials. Trial i fails and keeps j, or succeeds and adds one.', 'Work in hundredths: multiply by 100 − q or q, and divide by 100ⁿ once at the end.']),

  'expected-time': task('faces, n', `A token is n squares from the end. Each turn it rolls a fair die whose faces are listed in faces and moves forward that many squares; reaching or passing the end finishes the game. Return the expected number of rolls. ${EXACT}`, 'n ≤ 200, at most 6 faces, each 1 to 6. The sequences of rolls are far too many to list.', [
    [[[1], 3], '3/1'],
    [[[1, 2], 1], '1/1'],
    [[[1, 2], 2], '3/2'],
    [[[1, 2], 4], '23/8'],
    [[[2, 3], 5], '9/4'],
    [[[1, 2, 3, 4, 5, 6], 6], '16807/7776'],
    [[[1, 2], 200], '107307751622183683955635468610782080457315999918162054890680775/803469022129495137770981046170581301261101496891396417650688'],
  ], ['Let E(d) be the expected number of rolls still needed with d squares to go. E(0) = 0.', 'Condition on the first roll: one roll, then each face f leaves max(0, d − f) to go.', 'E(d) = 1 + the average of E(max(0, d − f)) over the faces. Every move reduces d, so fill d = 1, 2, … in order.']),

  'self-loops': task('n, s', `A token is n squares from the last square and must land on it exactly. Each turn it rolls a fair die with faces 1 to s; a roll that would carry it past the last square is wasted, and the token stays. Return the expected number of rolls. ${EXACT}`, 'n ≤ 200, s ≤ 6.', [
    [[1, 6], '6/1'],
    [[2, 2], '2/1'],
    [[4, 2], '7/2'],
    [[4, 3], '4/1'],
    [[7, 3], '145/27'],
    [[200, 2], '26960849409234170178537363993723950331205850229022413125611975/200867255532373784442745261542645325315275374222849104412672'],
  ], ['A wasted roll leaves the token where it was, so E(d) appears on both sides of its own equation.', 'E(d) = 1 + (Σ E(d − f) over the faces that fit + (faces that don’t) · E(d)) / s.', 'Move the E(d) terms to one side: E(d) = (s + Σ E(d − f)) / (the number of faces that fit).']),

  'cyclic-expectations': task('n, s, jumps', `A board has squares 0 to n; the token starts on 0 and the game ends on n. Each turn it rolls a fair die with faces 1 to s and moves forward; a roll past n is wasted and the token stays. jumps lists [from, to] pairs: landing on from sends the token straight to to (a ladder up or a snake down) in the same turn. Return the expected number of turns. ${EXACT}`, 'n ≤ 30, s ≤ 6. No jump starts on 0 or n, following jumps never loops, and the end can be reached from every square the token can reach, so the answer is finite.', [
    [[1, 1, []], '1/1'],
    [[3, 2, []], '3/1'],
    [[4, 2, [[3, 0]]], '6/1'],
    [[5, 2, [[1, 4]]], '7/2'],
    [[5, 3, [[2, 0], [3, 5]]], '3/1'],
    [[30, 2, []], '2803659207/134217728'],
    [[...board30], '446509669976/30969764303'],
  ], ['A snake sends the token back, so E(i) can depend on E of an earlier square: no order fills the values one by one.', 'Write one equation per square: E(i) = 1 + the average of E(where each face lands), with E(n) = 0, and E(i) = E(to) on a jump square.', 'Solve the n equations together, by Gaussian elimination with exact fractions.']),

  'coupon-collector': task('w', `Each draw gives one of n coupon types; type i comes up with chance w[i] / sum(w), independently of earlier draws. Return the expected number of draws until every type has been seen. ${EXACT}`, 'n ≤ 12, 1 ≤ w[i] ≤ 12.', [
    [[[1]], '1/1'],
    [[[1, 1]], '3/1'],
    [[[1, 1, 1]], '11/2'],
    [[[1, 3]], '13/3'],
    [[[1, 2, 3]], '73/10'],
    [[[5, 1, 1, 1]], '1543/105'],
    [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]], '155387562361539980234647/1587661727068145524950'],
    [[range(12).map(() => 1)], '86021/2310'],
  ], ['With unequal chances, how many types are collected is not enough: which ones matters. Use the set S of collected types as the state.', 'From S, a draw of a type already in S changes nothing: that is a self-loop, solved for E(S) like the exact-landing lesson.', 'E(S) = (W + Σ w(i) · E(S ∪ {i}) over the missing i) / (W − w(S)), with W = sum(w). Fill bigger sets first; the answer is E(∅).']),

  'moments': task('faces, n', `The game of the expected-time lesson: a token n squares from the end rolls a fair die whose faces are listed in faces, and reaching or passing the end finishes. Return the variance of the number of rolls. ${EXACT}`, 'n ≤ 60, at most 6 faces, each 1 to 6.', [
    [[[2], 6], '0/1'],
    [[[1, 2], 1], '0/1'],
    [[[1, 2], 2], '1/4'],
    [[[1, 2], 4], '23/64'],
    [[[1, 3], 4], '31/64'],
    [[[1, 2], 60], '1485125106401665267974035438727247695/332306998946228968225951765070086144'],
    [[[1, 2, 3, 4, 5, 6], 30], '2924353876686660947160968306790390559971236111/1357602166130257152481187563160405662935023616'],
  ], ['The variance is E[T²] − E[T]². Variances don’t average over the first roll, but means of T and of T² do.', 'T = 1 + T′, where T′ is the rolls after the first. So T² = 1 + 2T′ + T′².', 'Keep E(d) and S(d) = E[T²] with d to go: S(d) = 1 + 2 · avg E(next) + avg S(next). Subtract E(n)² only at the end.']),

  'conditional-dp': task('n, p', `Flip a coin n times; each flip is heads with chance p percent. Given that no two heads came up in a row, return the expected number of heads. ${EXACT}`, 'n ≤ 100, 1 ≤ p ≤ 99. There are 2¹⁰⁰ sequences.', [
    [[0, 50], '0/1'],
    [[1, 50], '1/2'],
    [[2, 50], '2/3'],
    [[3, 50], '1/1'],
    [[4, 20], '22/35'],
    [[6, 90], '10422/3781'],
    [[100, 50], '12886820373359261525525/463686346096539499588'],
  ], ['A conditional mean is (the chance-weighted heads over the allowed sequences) / (the chance of the allowed sequences). Find both, and divide once at the end.', 'Whether the next flip may be a head depends on the last flip: keep separate values for sequences ending in a tail and in a head.', 'For each ending keep the chance and the chance times the heads. A new head adds 1 to every path it extends, so it adds that path’s chance to the heads mass.']),

  'stochastic-control': task('a, b, p', `A job has n stages, done in order. At stage i choose: the safe way pays a[i] and finishes stage i; the risky way pays b[i] per try, and each try succeeds with chance p[i] percent and finishes stages i and i + 1 together (at the last stage, just stage i). A failed try changes nothing. Return the least expected total cost. ${EXACT}`, 'n ≤ 1000, 1 ≤ a[i], b[i] ≤ 9, 1 ≤ p[i] ≤ 100.', [
    [[[2], [1], [50]], '2/1'],
    [[[2], [1], [25]], '2/1'],
    [[[3, 1, 4, 2], [1, 2, 1, 3], [50, 25, 50, 100]], '4/1'],
    [[[5, 5], [3, 3], [40, 40]], '15/2'],
    [mixed, '95/3'],
    [flat(1000, 3, 1, 50), '1000/1'],
  ], ['V(i): the least expected cost to finish from stage i. V(n) = V(n + 1) = 0.', 'The risky way repeats until it succeeds: V = b + (p/100) · V(i + 2) + (1 − p/100) · V. Solve that for V.', 'V(i) = min(a[i] + V(i + 1), 100 · b[i] / p[i] + V(i + 2)). Fill from the end.']),
}

// Games group. The large cases have closed forms (an open board loses exactly on squares with both
// coordinates even; {1, 3} and {2, 3} lose on even piles and on piles ≡ 0, 1 mod 5; three ones repeat with
// period 6; equal numbers split evenly; Kayles has Guy and Smith's period 12 from 71 on; piles under
// {1, 2, 3} have Grundy value p mod 4), or were checked by a second search (float expectiminimax for the
// race, alpha-beta for the 3 × 4 board).
const openBoard = n => range(n).map(() => range(n).map(() => 0))
const piles = range(10000).map(i => (i * 7919) % 100003)

const GAME_CHALLENGES = {
  'win-lose': task('grid', 'A token sits on a free square of grid (0 free, 1 blocked). A move takes it one square up, one square left, or one square diagonally up and left, onto a free square. Two players move in turn; a player who can’t move loses. Count the free squares from which the player to move can force a win.', 'At most 400 × 400 squares. Searching the game from every square is far too slow.', [
    [[[[0, 0], [0, 0]]], 3],
    [[[[0]]], 0],
    [[[[0, 0, 0]]], 1],
    [[[[0, 1, 0], [0, 0, 0]]], 3],
    [[[[0, 0, 0], [1, 0, 0], [0, 0, 1]]], 4],
    [[openBoard(3).map(row => [...row, 0])], 8],
    [[openBoard(400)], 120000],
  ], ['A square with no move is losing. Which squares can be decided first?', 'A square is winning when some move reaches a losing square, and losing when every move reaches a winning one.', 'Every move goes up or left, so go through the squares in reading order.']),

  'subtraction-games': task('moves, N', 'A pile of stones; a move removes s stones for some s in moves (only if at least s are left). Two players move in turn; a player who can’t move loses. Count the pile sizes 0 … N that are losing for the player to move.', 'moves are distinct, 1 ≤ s ≤ 20, at most 6 of them; N ≤ 10¹². A table up to N is far too long.', [
    [[[1, 2], 6], 3],
    [[[1, 3], 10], 6],
    [[[2, 3], 9], 4],
    [[[1, 4], 20], 9],
    [[[2, 5, 7], 24], 8],
    [[[1], 2], 2],
    [[[3, 4, 9], 1000000], 384617],
    [[[1, 3], 1000000000000], 500000000001],
    [[[2, 3], 1000000000000], 400000000001],
  ], ['Fill the table of outcomes from pile 0 up: a pile loses when every move that fits leaves a winning pile.', 'Let m be the largest move. The outcome of pile i depends only on the m outcomes before it.', 'So when the same m outcomes in a row appear a second time, everything after repeats: find the period and count by arithmetic.']),

  'score-difference': task('a', 'Stones with values a[0], a[1], … lie in a row. Two players move in turn; a move takes the first 1, 2 or 3 stones left and scores their values (which may be negative). Return the first player’s total minus the second’s, when both play to maximise their own total minus the other’s.', 'Up to 100 000 stones, values from −1000 to 1000.', [
    [[[1, 2, 3, 7]], -1],
    [[[1, 2, 3, -9]], 15],
    [[[1, 2, 3, 6]], 0],
    [[[-1, -2, -3]], 0],
    [[[]], 0],
    [[[5]], 5],
    [[[0, -1]], 1],
    [[[3, -1, 4, -1, 5, -9, 2, 6]], 5],
    [[range(100000).map(() => 1)], 2],
  ], ['Two players, one value: let D(i) be the lead of the player to move over the other, with stones i, i + 1, … left.', 'Taking t stones scores their sum, and then the other player leads by D(i + t).', 'D(i) = max over t of (sum of the t stones − D(i + t)), with D(n) = 0. Fill from the back.']),

  'interval-games': task('a', 'Numbers a[0], a[1], … lie in a row. Two players move in turn; a move takes the number at either end of the row and scores it. Return the first player’s total minus the second’s, when both play to maximise their own total minus the other’s.', 'Up to 1000 numbers, each 0 to 1000.', [
    [[[1, 5, 2]], -2],
    [[[4, 1]], 3],
    [[[]], 0],
    [[[1, 5, 233, 7]], 222],
    [[[3, 9, 1, 2]], 7],
    [[[0, 1]], 1],
    [[[2, 2, 2, 2, 2]], 2],
    [[[8, 15, 3, 7, 6, 1, 9, 4]], 1],
    [[range(1000).map(() => 7)], 0],
    [[range(999).map(() => 7)], 7],
  ], ['What is left after any number of moves is a piece a[l], …, a[r − 1] of the row.', 'D(l, r): the lead of the player to move on that piece. Taking the left end scores a[l], and the other player then leads by D(l + 1, r).', 'D(l, r) = max(a[l] − D(l + 1, r), a[r − 1] − D(l, r − 1)), with D(l, l) = 0. Fill shorter pieces first.']),

  'grundy': task('n', 'Kayles: n pins stand in a row. A move knocks down one pin, or two pins that stand next to each other; this can split a row into two. Two players move in turn; a player who can’t move loses. Return the Grundy value of a row of n pins.', 'n ≤ 1000.', [
    [[0], 0],
    [[1], 1],
    [[2], 2],
    [[3], 3],
    [[4], 1],
    [[5], 4],
    [[6], 3],
    [[11], 6],
    [[70], 6],
    [[1000], 1],
  ], ['The Grundy value of a position is the mex, the smallest value 0, 1, 2, … that none of its moves reaches.', 'A move on a row of size pins leaves two rows, left and size − take − left pins. Two separate rows are a sum of games.', 'The value of a sum is the XOR of the values: g(size) = mex of g(left) ⊕ g(right) over every move.']),

  'game-sums': task('moves, piles', 'Several piles of stones. A move chooses one pile and removes s stones from it, for some s in moves. Two players move in turn; a player who can’t move loses. Count the first moves that win: (pile, s) pairs after which the second player loses with best play. Two piles of the same size are different piles.', 'moves are distinct, 1 ≤ s ≤ 10; up to 10 000 piles of up to 100 000 stones.', [
    [[[1, 2], [3]], 0],
    [[[1, 2], [3, 3]], 0],
    [[[1, 2, 3], [1, 2]], 1],
    [[[1, 3, 4], [2, 5, 6]], 3],
    [[[2], [2, 3, 4]], 0],
    [[[1], [1, 1]], 0],
    [[[1, 2, 3], piles], 9999],
  ], ['Each pile is a subtraction game. Find the Grundy value g(x) of every pile size, as a mex over the moves.', 'The whole position is lost for the player to move exactly when the XOR of the piles’ values is 0.', 'A winning move changes one pile p to a size whose value is (the XOR of all values) ⊕ g(p), which makes the XOR 0. Count those moves.']),

  'stochastic-games': task('n, s', `A race to square n. Two players start on square 0 and move in turn. On a turn a player either steps forward one square, or rolls a fair die with faces 1 to s and moves that many. The first to reach or pass square n wins. Return the chance that the first player wins, when both play to win. ${EXACT}`, 'n ≤ 12, s ≤ 6. The answer’s denominator is a power of s; listing every game is hopeless.', [
    [[1, 1], '1/1'],
    [[2, 2], '3/4'],
    [[3, 2], '13/16'],
    [[4, 3], '559/729'],
    [[5, 3], '4588/6561'],
    [[12, 6], '85896172178265211/131621703842267136'],
  ], ['The state is both positions and whose turn it is. Let V(a, b) be the chance that the player to move, on a, wins against the other player on b.', 'After any move the roles swap, so the mover’s chance is 1 − V(b, new a), or 1 on reaching n.', 'Stepping is a choice; rolling is chance, so its outcomes are averaged: V(a, b) = max(step, average over the faces).']),

  'transpositions': task('board, k', 'An h × w board of "X", "O" and "." (empty), one string per row. X and O take turns marking an empty square, X first, so X is to move when the counts are equal. A player who completes k in a row (across, down or diagonally) wins at once; a full board without one is a draw. Return 1 if X wins with best play, 0 for a draw, −1 if O wins.', 'h · w ≤ 12. The board given was reached by legal play. There are up to 12! orders of moves, but far fewer boards.', [
    [[['X.O', '.X.', 'O..'], 3], 1],
    [[['XO', '..'], 2], 1],
    [[['...'], 2], 1],
    [[['XX.', 'OO.', '...'], 3], 1],
    [[['O..', '.X.', '..X'], 3], 0],
    [[['...', '...', '...'], 3], 0],
    [[['X...', '....', '...O'], 3], 1],
  ], ['Minimax: X picks the largest value among its moves, O the smallest; a finished board is worth 1, −1 or 0.', 'The same board is reached by many orders of moves. Store each board’s value once it is known.', 'The key must say everything that decides the future: which squares hold X and which hold O. Here the counts also say whose turn it is.']),
}

// Parsing group. The large cases have closed forms (aⁿbⁿ and balanced strings, Catalan numbers for the
// all-ambiguous grammar S → SS | a, a recursive-descent parser for the expression grammar, Catalan
// numbers for its span chances, 3 · 2ⁿ⁻¹ proper colourings of a tree, 58 pairs for G⁶⁰C⁶⁰) or were checked
// by a second method (Dijkstra for the cheapest path, a forward pass held to one state for the share).
const ANBN = [['S', 'AB'], ['S', 'AT'], ['T', 'SB'], ['A', 'a'], ['B', 'b']]
const DYCK = [['S', 'SS'], ['S', 'AB'], ['S', 'AT'], ['T', 'SB'], ['A', 'a'], ['B', 'b']]
const SS = [['S', 'SS'], ['S', 'a']]
const EXPR = [['S', 'E'], ['E', 'E+T'], ['E', 'T'], ['T', 'T*F'], ['T', 'F'], ['F', '(E)'], ['F', 'a']]
// A balanced string of n letters, a opening and b closing.
const balanced = n => { let s = '', open = 0; for (let i = 0; i < n; i++) { const close = open > 0 && (open === n - i || (i * 7 + 3) % 5 < 2); s += close ? 'b' : 'a'; open += close ? -1 : 1 } return s }
const expression = n => { let s = 'a'; for (let i = 1; s.length < n; i++) s += i % 3 === 0 ? '*(a+a)' : i % 3 === 1 ? '+a' : '*a'; return s }
const costs = T => [[2, 5, 1], [[1, 4, 6], [3, 0, 2], [5, 2, 1]], [[0, 3, 7], [4, 1, 2], [2, 6, 0]], range(T).map(i => (i * i + 3 * i) % 3)]
const hmm40 = [[1, 2, 1], [[2, 1, 1], [1, 3, 1], [1, 1, 2]], [[3, 1], [1, 2], [2, 2]], range(40).map(i => (((i * 2654435761 + 7) >>> 0) % 3) % 2), 20, 1]
const proper3 = [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
const GRAMMAR = 'rules is a list of [left, right] pairs; capital letters are nonterminals, other characters are letters of the string, and S is the start symbol.'
const CNF = `${GRAMMAR} The grammar is in Chomsky normal form: each right side is one letter or two nonterminals.`

const PARSE_CHALLENGES = {
  'cyk': task('rules, s', `${CNF} Return true if S derives the string s, false otherwise (the empty string is never derived).`, 'At most 10 rules and 80 letters.', [
    [[ANBN, 'ab'], true],
    [[ANBN, 'aabb'], true],
    [[ANBN, 'abab'], false],
    [[ANBN, ''], false],
    [[DYCK, 'abab'], true],
    [[DYCK, 'aabbab'], true],
    [[DYCK, 'abba'], false],
    [[[['S', 'AB'], ['A', 'a'], ['B', 'b']], 'ab'], true],
    [[ANBN, 'a'.repeat(40) + 'b'.repeat(40)], true],
    [[ANBN, 'a'.repeat(40) + 'b'.repeat(39) + 'a'], false],
    [[DYCK, balanced(80)], true],
  ], ['For every piece s[i:j] of the string, find the set of nonterminals that derive it.', 'A one-letter piece is derived by the rules X → that letter. A longer piece by X → YZ, where Y derives s[i:k] and Z derives s[k:j] for some split k.', 'Fill shorter pieces first; the answer is whether S is in the set for the whole string.']),

  'weighted-parsing': task('rules, s', `${CNF} Return the number of different parse trees of s from S, modulo 1 000 000 007 (0 if there is none).`, 'At most 10 rules and 100 letters. An ambiguous grammar can have astronomically many trees.', [
    [[SS, 'a'], 1],
    [[SS, 'aa'], 1],
    [[SS, 'aaaa'], 5],
    [[SS, ''], 0],
    [[DYCK, 'ababab'], 2],
    [[[['S', 'SS'], ['S', 'a'], ['S', 'b']], 'abab'], 5],
    [[DYCK, 'abba'], 0],
    [[SS, 'a'.repeat(100)], 676902861],
  ], ['The CYK table, but instead of whether X derives s[i:j], keep how many trees do.', 'Trees for X → YZ over a split k: every tree of Y on s[i:k] with every tree of Z on s[k:j], so the counts multiply.', 'Different rules and different splits give different trees, so their counts add.']),

  'earley': task('rules, s', `${GRAMMAR} A right side may be any string, including "" (an empty rule), and rules may be left-recursive, such as E → E+T. Return true if S derives s.`, 'At most 12 rules, right sides of at most 4 symbols, and 200 letters.', [
    [[EXPR, 'a+a*a'], true],
    [[EXPR, 'a+'], false],
    [[EXPR, '(a+a)*a'], true],
    [[EXPR, ''], false],
    [[[['S', ''], ['S', 'aSb']], ''], true],
    [[[['S', ''], ['S', 'aSb']], 'aabb'], true],
    [[[['S', 'AB'], ['A', ''], ['A', 'a'], ['B', 'b'], ['B', '']], 'b'], true],
    [[[['S', 'SS'], ['S', '']], ''], true],
    [[[['S', 'aSb'], ['S', '']], 'a'], false],
    [[EXPR, expression(200)], true],
    [[EXPR, expression(200) + '+'], false],
  ], ['Keep, at each position i of the string, a set of items: a rule, how much of its right side is matched (the dot), and where the match started.', 'Predict: an item expecting X adds X’s rules, starting at i. Scan: an item expecting the next letter moves to i + 1. Complete: a finished X moves on every item at X’s start that was expecting X.', 'Empty rules: when an item expects a nonterminal that can derive "", also move its dot past it.']),

  'inside-outside': task('rules, s, X, i, j', `rules is a list of [left, right, chance] for a grammar in Chomsky normal form, with each rule’s chance in percent. A parse tree’s chance is the product of its rules’ chances. Among all parse trees of s from S, return the share of the chance held by trees in which X derives exactly s[i:j]. ${EXACT}`, 'At most 8 rules and 40 letters; s has at least one parse tree.', [
    [[[['S', 'AB', 100], ['A', 'a', 100], ['B', 'b', 100]], 'ab', 'A', 0, 1], '1/1'],
    [[[['S', 'SS', 50], ['S', 'a', 50]], 'aaa', 'S', 0, 2], '1/2'],
    [[[['S', 'SS', 50], ['S', 'a', 50]], 'aaa', 'S', 1, 2], '1/1'],
    [[[['S', 'SS', 30], ['S', 'a', 70]], 'aaaa', 'S', 1, 3], '2/5'],
    [[[['S', 'AB', 60], ['S', 'BA', 40], ['A', 'a', 100], ['B', 'b', 50], ['B', 'a', 50]], 'aa', 'A', 0, 1], '3/5'],
    [[SS.map(([l, r]) => [l, r, 50]), 'a'.repeat(40), 'S', 10, 25], '13924157904/728628933637'],
  ], ['Inside(X, i, j): the total chance of X deriving s[i:j], over every subtree. It is the weighted-parsing table with chances instead of counts.', 'Outside(X, i, j): the total chance of everything else, a tree from S down to an X over [i, j), with that X’s subtree left out. Start with Outside(S, 0, n) = 1 and pass it down to both children of every rule.', 'The trees using X over [i, j) have total chance Inside · Outside; divide by Inside(S, 0, n).']),

  'viterbi': task('start, trans, emit, obs', 'A hidden Markov model with costs: each cost is a −log probability, rounded to a whole number, so the most probable path is the cheapest. A path of states x₀ … x_{T−1} costs start[x₀] + emit[x₀][obs[0]] + the sum over t ≥ 1 of trans[x_{t−1}][x_t] + emit[x_t][obs[t]]. Return the least cost of any path.', 'At most 3 states and 1000 observations; costs 0 to 9. There are 3¹⁰⁰⁰ paths.', [
    [[[0], [[0]], [[3, 1]], [0, 1, 1]], 5],
    [[[1, 2], [[0, 5], [5, 0]], [[0, 4], [4, 0]], [0, 1, 0]], 5],
    [[[1, 2], [[0, 1], [1, 0]], [[0, 4], [4, 0]], [0, 1, 0]], 3],
    [[[0, 0], [[1, 1], [1, 1]], [[2, 2], [2, 2]], [0]], 2],
    [[[0, 4], [[2, 3], [1, 8]], [[5], [1]], [0, 0]], 9],
    [costs(6), 13],
    [costs(1000), 2002],
  ], ['V(t, s): the least cost of a path through the first t + 1 observations that ends in state s.', 'The cheapest path ending in s at time t came from some state r at t − 1, and its part up to there is the cheapest path ending in r.', 'V(t, s) = min over r of V(t − 1, r) + trans[r][s], plus emit[s][obs[t]]. The answer is the least V at the last time.']),

  'forward-backward': task('start, trans, emit, obs, t, s', `A hidden Markov model with whole-number weights instead of probabilities: a path of states x₀ … x_{T−1} has weight start[x₀] · emit[x₀][obs[0]] · the product over u ≥ 1 of trans[x_{u−1}][x_u] · emit[x_u][obs[u]]. Return the share of the total weight held by paths in state s at time t. ${EXACT}`, 'At most 3 states, 40 observations, weights 0 to 3; the total weight is not 0.', [
    [[[1, 1], [[1, 1], [1, 1]], [[1, 1], [1, 1]], [0, 1], 0, 0], '1/2'],
    [[[1, 1], [[2, 1], [1, 2]], [[3, 1], [1, 3]], [0, 0, 1], 1, 0], '3/4'],
    [[[1, 0], [[1, 1], [0, 1]], [[1, 2], [2, 1]], [1, 1, 0], 2, 1], '3/4'],
    [[[2, 1, 1], [[1, 2, 0], [0, 1, 2], [2, 0, 1]], [[1, 2], [2, 1], [1, 1]], [0, 1, 1, 0], 2, 2], '51/319'],
    [hmm40, '50609780699375837826718734867923/221707169963569402418251176529436'],
  ], ['Forward: alpha(u, x), the weight of the paths through the first u + 1 observations that end in x.', 'Backward: beta(u, x), the weight of everything after time u, given state x at u. beta at the last time is 1.', 'Paths through x at time t have weight alpha(t, x) · beta(t, x); divide by the total, the sum of alpha at the last time.']),

  'belief-propagation': task('k, unary, edges, pair', 'A tree on n nodes (edges, connected, no cycles); each node takes a value 0 … k − 1. An assignment’s weight is the product of unary[v][x_v] over the nodes and pair[x_u][x_v] over the edges (pair is symmetric). Return the total weight of all kⁿ assignments, modulo 1 000 000 007.', 'n ≤ 10 000, k ≤ 3, weights 0 to 3.', [
    [[2, [[1, 1], [1, 1]], [[0, 1]], [[1, 1], [1, 1]]], 4],
    [[3, [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[0, 1], [1, 2]], proper3], 12],
    [[2, [[1, 2], [3, 1], [1, 1]], [[0, 1], [0, 2]], [[2, 1], [1, 3]]], 69],
    [[1, [[5]], [], [[2]]], 5],
    [[3, [[1, 0, 2], [2, 1, 0], [0, 3, 1], [1, 1, 1]], [[0, 1], [1, 2], [1, 3]], [[1, 2, 0], [2, 1, 1], [0, 1, 3]]], 100],
    [[3, range(10000).map(() => [1, 1, 1]), range(9999).map(i => [(i * 7919 + 13) % (i + 1), i + 1]), proper3], 858417704],
  ], ['Root the tree. A subtree interacts with the rest only through its root’s value.', 'For each value x of a node’s parent, the subtree’s message is Σ over the node’s values y of pair[x][y] times the node’s own weight for y, which already includes its children’s messages.', 'Send messages from the leaves up; the answer is the root’s weights times its messages, summed over its values.']),

  'rna-folding': task('s', 'An RNA string over A, C, G, U. A base pair joins positions i < j whose letters are A–U, G–C or G–U (in either order) with at least three positions between them (j − i ≥ 4). Pairs may not share a position or cross (no i < k < j < l with pairs i–j and k–l). Return the largest number of pairs.', 'At most 120 letters.', [
    [['AU'], 0],
    [['AAAAU'], 1],
    [['GAAAC'], 1],
    [['GGAAACC'], 2],
    [['AUAUAUAU'], 2],
    [['GGGAAAUCC'], 3],
    [['ACGUACGUACGU'], 4],
    [['CGAGU'], 0],
    [['G'.repeat(60) + 'C'.repeat(60)], 58],
  ], ['D(i, j): the most pairs in the piece s[i:j].', 'The last position j − 1 is either unpaired, or paired with some k; then the pairs split into those inside k + 1 … j − 2 and those in i … k − 1, which can’t cross.', 'D(i, j) = max(D(i, j − 1), max over k of D(i, k) + 1 + D(k + 1, j − 1)). Fill shorter pieces first.']),
}

// Control group. The large cases have closed forms (a line's total minus its largest edge; for the machine
// MDP H + 2/3 − (2/3)(−1/2)ᴴ; 2 − 2¹⁻ᴷ; equal-sized orders for constant demand; 2 − 2⁻ⁿ for offers 1 or 2;
// 4b/3 − 8/9 + (8/9)(−1/2)ᵇ for the single attempt; an equal split when stock doesn't grow; Fibonacci
// ratios F(2N)/F(2N − 1) for the Riccati recursion with a = b = q = r = 1; repair-then-run for the
// machine with an even prior) or were checked by a second method (Bellman–Ford over (vertex, used),
// float value iteration, Lawler's binary search for the best mean cycle).
// A pseudo-random graph from the high bits of a linear congruential generator.
const randomGraph = (n, m, seed) => { let x = seed; const r = k => Math.floor((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 * k); return [n, range(m).map(() => [r(n), r(n), r(50)]).filter(([u, v]) => u !== v)] }
const MDP3 = [[[0], [1, 2]], [[2], [0, 1]], [[0, 1], [2]]], MDP3_R = [[1, 0], [2, -1], [0, 3]]
const DET4 = [[1, 2], [2, 3], [3, 0], [0, 1]], DET4_R = [[1, 0], [0, 4], [2, -1], [-3, 5]]
const ring30 = [range(30).map(s => [[(s + 1) % 30], [(s * 7 + 3) % 30, (s * 11 + 5) % 30]]), range(30).map(s => [(s * 13) % 7 - 2, (s * 5) % 9 - 3])]
const meanGraph = (() => { const [n, edges] = randomGraph(200, 1000, 99); return [n, [...edges, [199, 0, 0]]] })()

const CONTROL_CHALLENGES = {
  'bellman-principle': task('n, edges', 'A directed graph on vertices 0 … n − 1; edges are [u, v, w] with weight w ≥ 0. A coupon makes one edge of your route free, once. Return the cheapest cost of a route from 0 to n − 1, or −1 if there is none.', 'n ≤ 20 000, up to 50 000 edges, w ≤ 100.', [
    [[3, [[0, 1, 5], [1, 2, 3]]], 3],
    [[3, [[0, 1, 5], [1, 2, 3], [0, 2, 7]]], 0],
    [[2, []], -1],
    [[4, [[0, 1, 1], [1, 3, 9], [0, 2, 4], [2, 3, 4]]], 1],
    [[5, [[0, 1, 2], [1, 2, 2], [2, 4, 2], [0, 3, 10], [3, 4, 1]]], 1],
    [[3, [[1, 2, 1], [0, 1, 5]]], 1],
    [[20000, range(19999).map(i => [i, i + 1, (i * 37) % 100 + 1])], 1009836],
    [randomGraph(2000, 8000, 7), 62],
  ], ['The cheapest route to a vertex with the coupon still in hand and with it spent are different things: they have different futures.', 'Make the state (vertex, coupon used or not). An edge keeps the coupon state, or, if the coupon is unused, may be taken for free and spend it.', 'Run Dijkstra on those 2n states; the answer is the cheaper of the two states at n − 1.']),

  'finite-mdp': task('trans, reward, H', `A Markov decision process with states 0 … n − 1. In state s, action a earns reward[s][a] and moves to one of the states in trans[s][a], each equally likely. Return the largest expected total reward of H decisions starting from state 0. ${EXACT}`, 'At most 4 states, 3 actions, 2 next states per action, H ≤ 40.', [
    [[[[[0]]], [[1]], 3], '3/1'],
    [[MDP3, MDP3_R, 0], '0/1'],
    [[MDP3, MDP3_R, 1], '1/1'],
    [[MDP3, MDP3_R, 2], '5/2'],
    [[MDP3, MDP3_R, 4], '17/2'],
    [[[[[0], [1]], [[1]]], [[1, 0], [5]], 3], '10/1'],
    [[[[[0], [0]]], [[1, 2]], 2], '4/1'],
    [[[[[0, 1], [0]], [[0]]], [[2, 0], [-1]], 40], '22356736431445/549755813888'],
  ], ['V(t, s): the best expected total with t decisions left in state s. V(0, s) = 0.', 'With t left, an action earns its reward and then the average of V(t − 1, ·) over where it may lead.', 'V(t, s) = max over a of reward[s][a] + the average of V(t − 1, x) over x in trans[s][a]. Compute t = 1, 2, …, H.']),

  'value-iteration': task('nxt, reward, gamma, K', `A deterministic Markov decision process: in state s, action a earns reward[s][a] and moves to state nxt[s][a]. Rewards t steps ahead are worth gammaᵗ, where gamma = [p, q] means p/q. Start from V = 0 everywhere and apply the Bellman update K times; return the value of state 0. ${EXACT}`, 'At most 4 states, 3 actions, 0 ≤ p < q ≤ 10, K ≤ 60.', [
    [[[[0]], [[1]], [1, 2], 3], '7/4'],
    [[DET4, DET4_R, [1, 2], 0], '0/1'],
    [[DET4, DET4_R, [1, 2], 1], '1/1'],
    [[DET4, DET4_R, [1, 2], 5], '81/16'],
    [[DET4, DET4_R, [2, 3], 6], '2087/243'],
    [[[[0]], [[1]], [1, 2], 60], '1152921504606846975/576460752303423488'],
  ], ['One update: V_new(s) = max over a of reward[s][a] + gamma · V_old(nxt[s][a]).', 'Every state is updated from the old values, all at once: keep the old list until the new one is complete.', 'After K updates V(s) is the best discounted total of K steps; it approaches the infinite-horizon value as K grows.']),

  'policy-iteration': task('trans, reward, gamma', `A Markov decision process as in finite-mdp, with rewards t steps ahead worth gammaᵗ (gamma = [p, q] means p/q < 1), over an infinite horizon. Return the optimal value of state 0. ${EXACT}`, 'At most 30 states, 3 actions, 2 next states per action, q ≤ 10.', [
    [[[[[0]]], [[1]], [1, 2]], '2/1'],
    [[[[[0], [1]], [[1]]], [[1, 0], [3]], [1, 2]], '3/1'],
    [[MDP3, MDP3_R, [1, 2]], '11/4'],
    [[MDP3, MDP3_R, [9, 10]], '531/20'],
    [[[[[1], [0, 1]], [[0], [1]]], [[0, 2], [4, -1]], [2, 3]], '15/2'],
    [[[[[1]], [[1], [0, 1]]], [[3], [1, 1]], [2, 3]], '6/1'],
    [[...ring30, [9, 10]], '6994948365054562255/302507646332908159'],
  ], ['Fix a policy, one action per state. Its values satisfy V = r + gamma · P V: a system of linear equations, solved exactly.', 'Improve: in every state pick the action with the best reward + gamma · average V of where it leads.', 'Repeat until no state changes; the last values are optimal. Change an action only when it is strictly better, so the loop ends.']),

  'average-reward': task('n, edges', `A directed graph on vertices 0 … n − 1 with edges [u, v, w]; walking an edge earns w. Walking forever from 0, the best long-run reward per step is the largest mean weight of a cycle that can be reached from 0. Return it. ${EXACT}`, 'n ≤ 200, up to 1000 edges, −100 ≤ w ≤ 100. Some cycle can be reached from 0.', [
    [[1, [[0, 0, 3]]], '3/1'],
    [[2, [[0, 1, 1], [1, 0, 2]]], '3/2'],
    [[3, [[0, 1, 5], [1, 1, 1], [1, 2, 0], [2, 0, 4]]], '3/1'],
    [[3, [[0, 1, 0], [1, 2, 0], [2, 1, 7], [0, 0, 2]]], '7/2'],
    [[4, [[0, 1, -1], [1, 0, -1], [1, 2, -5], [2, 3, 9], [3, 2, 0]]], '9/2'],
    [[4, [[0, 0, -4], [2, 0, 7], [0, 2, 3]]], '5/1'],
    [meanGraph, '95/2'],
  ], ['Karp’s method: D(k, v), the heaviest walk of exactly k edges from 0 to v, for k = 0 … n.', 'D(k, v) = max over edges u → v of D(k − 1, u) + w, starting from D(0, 0) = 0.', 'The best mean is the largest, over v with D(n, v) defined, of the smallest (D(n, v) − D(k, v)) / (n − k) over k < n.']),

  'inventory': task('d, K, h', 'Demand d[t] must be met in each period t, from stock. Ordering in a period costs K (any amount); each unit carried from one period to the next costs h. No shortages. Return the least total cost.', 'Up to 1000 periods, d[t] ≤ 10, K ≤ 100, h ≤ 5.', [
    [[[3], 10, 1], 10],
    [[[1], 0, 1], 0],
    [[[2, 2], 10, 1], 12],
    [[[2, 2], 1, 1], 2],
    [[[0, 0, 5], 4, 2], 4],
    [[[1, 1, 1, 1], 3, 1], 8],
    [[[5, 0, 3, 4, 0, 2], 8, 1], 26],
    [[range(1000).map(() => 3), 50, 1], 15835],
  ], ['Some best plan orders only when stock has run out, and each order covers the demand of whole periods up to the next order.', 'C(j): the least cost of meeting the first j periods with nothing left over. The last order is placed in some period i < j and covers periods i … j − 1.', 'C(j) = min over i of C(i) + K + h · Σ (t − i) d[t] over t in i … j − 1 (no K if those demands are all 0).']),

  'optimal-stopping': task('n, m, c', `n offers arrive one at a time, each a whole number from 1 to m, all equally likely and independent. After seeing an offer you take it and stop, or pay c to see the next one; the last offer must be taken. Return the largest expected value of the offer taken minus what you paid. ${EXACT}`, 'n ≤ 30, m ≤ 10, c ≤ 3.', [
    [[1, 6, 0], '7/2'],
    [[2, 6, 0], '17/4'],
    [[3, 6, 0], '14/3'],
    [[2, 2, 0], '7/4'],
    [[3, 4, 1], '85/32'],
    [[4, 3, 0], '73/27'],
    [[2, 2, 1], '3/2'],
    [[30, 2, 0], '2147483647/1073741824'],
  ], ['V(k): the expected payoff with k offers still to come, before seeing the next. V(1) = (m + 1)/2: the last offer must be taken.', 'Seeing offer x with k offers to come (this one included), take x or continue for V(k − 1) − c.', 'V(k) = the average over x = 1 … m of max(x, V(k − 1) − c).']),

  'resource-control': task('B, actions', `You have B tokens. Each action is [win, lose, p, r]: an attempt succeeds with chance p percent, paying r and using win tokens, or fails, paying nothing and using lose tokens. An attempt needs at least max(win, lose) tokens. You may stop at any time. Return the largest expected total. ${EXACT}`, 'B ≤ 40, at most 4 actions, 1 ≤ win, lose ≤ 5, p a multiple of 25.', [
    [[1, [[1, 1, 50, 10]]], '5/1'],
    [[2, [[2, 1, 50, 10]]], '5/1'],
    [[3, [[1, 1, 100, 2], [2, 1, 50, 7]]], '27/4'],
    [[0, [[1, 1, 50, 5]]], '0/1'],
    [[3, [[2, 1, 25, 1]]], '7/16'],
    [[5, [[2, 1, 75, 6], [1, 1, 25, 9], [3, 2, 50, 12]]], '12933/1024'],
    [[40, [[2, 1, 50, 4]]], '7207909559865/137438953472'],
  ], ['V(b): the best expected total with b tokens. V(0) = 0, and stopping is always worth 0.', 'An attempt’s two outcomes lead to different token counts: b − win after success, b − lose after failure.', 'V(b) = max(0, max over affordable actions of p (r + V(b − win)) + (1 − p) V(b − lose)). Both counts are smaller than b, so fill b upwards.']),

  'continuous-state': task('u, g, G, T, x0', `A stock lives on the grid 0, 1, …, G. Each of T periods you consume c units (0 ≤ c ≤ stock), earning u[c]; the rest grows by the factor g = [p, q] (p/q) and may land between grid points. The value there is read by linear interpolation between the two neighbouring grid points, and above G it is the value at G. Return the best total from stock x0. ${EXACT}`, 'G ≤ 60, T ≤ 10, u has G + 1 entries.', [
    [[[0, 3], [1, 1], 1, 1, 1], '3/1'],
    [[[0, 3, 5], [3, 2], 2, 2, 2], '7/1'],
    [[[0, 4, 7], [1, 2], 2, 2, 2], '7/1'],
    [[[0, 2, 3, 4], [3, 2], 3, 3, 3], '8/1'],
    [[[0, 0, 2], [5, 4], 2, 2, 1], '1/2'],
    [[[0, 5, 9, 12, 14, 15], [5, 4], 5, 3, 5], '55/2'],
    [[range(61).map(c => c * (130 - c)), [1, 1], 60, 7, 60], '7284/1'],
  ], ['V(t, x): the best total with t periods left from grid stock x. V(0, x) = 0.', 'After consuming c the stock is (x − c) · g, usually between grid points. Read V(t − 1) there by linear interpolation between its two neighbours.', 'V(t, x) = max over c of u[c] + V(t − 1) at (x − c) · g. Exact fractions keep the interpolated values exact.']),

  'lqr': task('a, b, q, r, qf, N', `A scalar system x′ = a·x + b·u from x = 1. Each of N steps costs q·x² + r·u², and the final state costs qf·x². Return the least total cost. ${EXACT}`, '|a|, |b| ≤ 3, 0 ≤ q, qf ≤ 9, 1 ≤ r ≤ 9, N ≤ 30.', [
    [[1, 1, 1, 1, 0, 1], '1/1'],
    [[1, 1, 1, 1, 0, 2], '3/2'],
    [[2, 1, 1, 1, 1, 1], '3/1'],
    [[1, 2, 3, 1, 2, 3], '5627/1741'],
    [[-1, 1, 2, 3, 0, 4], '736/203'],
    [[0, 1, 5, 1, 7, 2], '5/1'],
    [[2, 1, 0, 1, 2, 1], '8/3'],
    [[1, 1, 1, 1, 0, 30], '1548008755920/956722026041'],
  ], ['The cost-to-go is P · x² for some number P: true at the end, with P = qf.', 'One step back: minimise q x² + r u² + P (a x + b u)² over u. It is a parabola in u; its minimum is at u = −a b P x / (r + b² P).', 'Putting it back gives the Riccati recursion P ← q + a² P − (a b P)² / (r + b² P), N times; the answer is P, since x = 1.']),

  'pomdp': task('H, prior, acc', `A machine is good or bad, and you can’t see which; it is good with chance prior percent. Each of H turns: run it (+2 if good, −3 if bad), repair it (−1, and it is good afterwards), or inspect it (0, and a reading that is right with chance acc percent). Return the largest expected total. ${EXACT}`, 'H ≤ 30, 0 ≤ prior ≤ 100, 50 ≤ acc ≤ 100.', [
    [[1, 100, 80], '2/1'],
    [[1, 0, 80], '0/1'],
    [[2, 50, 90], '1/1'],
    [[3, 60, 80], '3/1'],
    [[4, 30, 70], '5/1'],
    [[5, 80, 100], '37/5'],
    [[2, 70, 90], '117/100'],
    [[4, 0, 80], '5/1'],
    [[30, 50, 80], '57/1'],
  ], ['The hidden state is not known, but the chance b that the machine is good is: that belief is the state.', 'Running and repairing change b predictably (repair sets it to 1). Inspecting gives a reading; Bayes’ rule gives the new b for each reading, weighted by the reading’s chance.', 'V(t, b) = max(run, repair, inspect), each its reward plus V(t − 1) at the new belief. Store V by (t, b): the same beliefs come up again.']),
}

// Research-tools group. The large cases have closed forms (the k lightest items when every value is 1;
// every item fitting, so the scheme keeps all of them; a checkerboard of ones; the ladder's Pareto front
// (L + k, 2L − k); every sum below 2³⁴ made by powers of two; an equal split of x² costs; 2^(leaves − 1)
// labellings for xor trees; [5963, 5970] for values 2i − 1) or were checked by brute force that the
// challenge's limits rule out (walking every ancestor, rerunning house robber after every update).
const lcgR = seed => { let x = seed; return k => Math.floor((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 * k) }
const heavyItems = range(100).map(i => ((i * 7919 * 104729) % 1000000000) + 1)
const fptasBig = (() => { const r = lcgR(5); return [range(60).map(() => 1 + r(1000)), range(60).map(() => 1 + r(1000000000))] })()
const ladderDag = L => [L + 1, range(L).flatMap(i => [[i, i + 1, 1, 2], [i, i + 1, 2, 1]])]
const ancestry = (() => { const r = lcgR(17), n = 20000, K = 1000; const parent = range(n).map(v => (v === 0 ? -1 : r(10) ? v - 1 : r(v))); const key = range(n).map(() => r(K)); const weight = range(n).map(() => 1 + r(1000000)); const lo = range(n).map(() => r(K)); const hi = lo.map(l => l + r(K - l)); return [parent, key, weight, lo, hi, K] })()
const robberUpdates = (() => { const r = lcgR(23), n = 3000; return [range(n).map(() => r(100)), range(3000).map(() => [r(n), r(100)])] })()
const completeTree = d => { const n = 2 ** (d + 1) - 1; return range(n).map(v => (2 * v + 2 < n ? [2 * v + 1, 2 * v + 2] : [])) }

const RESEARCH_CHALLENGES = {
  'pseudo-polynomial': task('weights, values, W', '0/1 knapsack: choose items with total weight at most W and the largest total value. The weights and W are huge, but the values are small. Return the largest total value.', 'Up to 100 items, weights and W up to 10¹², values 0 to 100. A table indexed by weight would need 10¹² cells.', [
    [[[3, 4, 5], [4, 5, 6], 7], 9],
    [[[1000000000, 999999999, 2], [5, 5, 1], 1000000000], 5],
    [[[], [], 5], 0],
    [[[10], [3], 9], 0],
    [[[6], [5], 1], 0],
    [[[600000000, 500000000, 400000000, 300000000], [9, 7, 6, 4], 1000000000], 15],
    [[heavyItems, range(100).map(() => 1), 30000000000], 78],
  ], ['The usual table has one cell per capacity: 10¹² cells here. Which dimension is small instead?', 'The total value is at most 100 · 100. Let least(t) be the lightest set of items worth exactly t.', 'Fill least like a 0/1 knapsack over values (largest t first); the answer is the largest t with least(t) ≤ W.']),

  'knapsack-fptas': task('weights, values, W, eps', `Run the knapsack approximation scheme with ε = eps[0]/eps[1]: drop the items heavier than W; with n items left and vmax their largest value, round every value down to a multiple of K = ε · vmax / n (scaled value ⌊v / K⌋); find the largest total scaled value of a set of weight at most W; return K times it. ${EXACT}`, 'Up to 60 items, weights up to 1000, values up to 10⁹, W up to 10⁵; 1/10 ≤ ε ≤ 1. If no item is left, or every value is 0, return "0/1".', [
    [[[3, 4, 5], [40, 50, 60], 7, [1, 2]], '90/1'],
    [[[3, 4, 5], [40, 50, 60], 7, [1, 10]], '90/1'],
    [[[5], [7], 4, [1, 2]], '0/1'],
    [[[1, 1, 1], [0, 0, 0], 3, [1, 2]], '0/1'],
    [[[4, 3, 2, 1], [100, 61, 39, 5], 6, [1, 4]], '275/2'],
    [[[9, 8], [29, 10], 8, [1, 4]], '10/1'],
    [[...fptasBig, 100000, [1, 2]], '145051913313/5'],
  ], ['After rounding, a scaled value is at most n/ε, so the scaled totals are small: a table indexed by scaled value is cheap.', 'Work in whole numbers: ⌊v / K⌋ = ⌊v · eps[1] · n / (eps[0] · vmax)⌋.', 'least(t): the lightest set with scaled total t. The best t with least(t) ≤ W, times K, is at least (1 − ε) times the optimum.']),

  'parameterized-dp': task('grid', 'A grid of weights, h rows by w columns. Choose cells, no two sharing a side, to make the largest total weight. Return it.', 'h ≤ 8, w ≤ 300, weights 0 to 9. The grid has up to 2400 cells, so trying every set of cells is out of the question.', [
    [[[[5]]], 5],
    [[[[1], [1]]], 1],
    [[[[1, 2, 3]]], 4],
    [[[[1, 9], [9, 1]]], 18],
    [[[[3, 1, 4], [1, 5, 9], [2, 6, 5]]], 19],
    [[[[0, 0], [0, 0]]], 0],
    [[range(8).map(() => range(300).map(() => 1))], 1200],
  ], ['Go column by column. What does the next column need to know about this one?', 'Only which rows are chosen in this column: a mask of h bits with no two adjacent ones. That is at most 2ʰ states, whatever w is.', 'best(c, m) = the weight of mask m in column c + the best best(c − 1, p) over masks p sharing no row with m.']),

  'multiobjective': task('n, edges', 'A DAG on vertices 0 … n − 1; each edge [u, v, time, cost] has u < v. A route from 0 to n − 1 is dominated if another route is no slower and no dearer, and better in one. Return the (time, cost) pairs of the routes no route dominates, sorted by time, each pair once.', 'n ≤ 40, up to 120 edges, times and costs 0 to 9. Routes can be exponentially many.', [
    [[2, [[0, 1, 3, 5]]], [[3, 5]]],
    [[3, [[0, 1, 1, 1], [1, 2, 1, 1], [0, 2, 3, 0]]], [[2, 2], [3, 0]]],
    [[3, [[0, 1, 2, 2]]], []],
    [[2, [[0, 1, 1, 0], [0, 1, 3, 0]]], [[1, 0]]],
    [[4, [[0, 1, 1, 4], [0, 2, 4, 1], [1, 3, 1, 1], [2, 3, 1, 1], [0, 3, 5, 5]]], [[2, 5], [5, 2]]],
    [ladderDag(30), range(31).map(k => [30 + k, 60 - k])],
  ], ['One best value per vertex is not enough: a faster but dearer route can win later. Keep a set of pairs per vertex.', 'The front of a vertex: its arriving (time, cost) pairs with every dominated pair removed. Sorted by time, the costs of a front go strictly down.', 'Process vertices in order 0, 1, …; extend each pair of a vertex’s front along its edges into the next vertices’ candidate lists.']),

  'meet-middle': task('values, T', 'Count the subsets of values (as positions: equal values are different items) whose sum is at most T. The empty set counts.', 'Up to 34 values, each 0 to 10¹², T up to 10¹³. There are up to 2³⁴ subsets.', [
    [[[1, 2, 3], 3], 5],
    [[[], 0], 1],
    [[[5, 5, 5], 9], 4],
    [[[1, 1, 1, 1], 2], 11],
    [[[10, 20, 30, 40, 50], 60], 13],
    [[range(34).map(i => 2 ** i), 10000000000], 10000000001],
  ], ['Split the values into two halves of about 17. Each half has only 2¹⁷ subset sums.', 'A subset is a left part and a right part; its sum is at most T when the right sum is at most T − (left sum).', 'Sort the right sums; for each left sum, count the right sums ≤ T − left with a binary search.']),

  'min-plus-convolution': task('costs, R', 'Give R units in total to the tasks; task i given x units costs costs[i][x] (x ranges over the indices of costs[i]). Return the least total cost, or −1 if R units can’t be given out.', 'Up to 50 tasks, tables of up to 21 entries, R ≤ 500.', [
    [[[[0, 3], [0, 2]], 1], 2],
    [[[[0, 3], [0, 2]], 2], 5],
    [[[[0, 1, 5], [0, 2, 3]], 3], 4],
    [[[[4]], 1], -1],
    [[[], 0], 0],
    [[[[0, 5, 6], [0, 5, 6], [0, 5, 6]], 4], 12],
    [[range(50).map(() => range(21).map(x => x * x)), 500], 5000],
  ], ['best(r): the least cost of giving exactly r units to the tasks so far. Before any task, best(0) = 0 and the rest are impossible.', 'Adding a task with table c: new(r) = min over x of best(r − x) + c[x]. That is a min-plus convolution.', 'Unlike an ordinary convolution, a minimum can’t use the FFT; each merge takes about R · (table length) steps.']),

  'persistent-states': task('parent, key, weight, lo, hi, K', 'A rooted tree: parent[v] < v, and parent[0] = −1 for the root. Node v has a key in 0 … K − 1 and a weight ≥ 1. For each node v, take the largest weight among v and its ancestors whose key lies in [lo[v], hi[v]] (0 if none). Return the sum of these over all nodes.', 'Up to 20 000 nodes, K ≤ 1000. The tree can be one long path, so walking up from every node is too slow.', [
    [[[-1], [0], [5], [0], [0], 1], 5],
    [[[-1, 0, 1], [2, 0, 1], [5, 3, 4], [0, 0, 1], [2, 2, 1], 3], 14],
    [[[-1, 0, 0], [1, 1, 1], [6, 14, 2], [1, 0, 1], [1, 1, 1], 2], 26],
    [[[-1, 0, 0, 1], [1, 2, 3, 2], [10, 20, 30, 40], [1, 0, 3, 2], [3, 1, 3, 2], 4], 90],
    [ancestry, 15988721594],
  ], ['A segment tree over the keys holding the largest weight per key range answers one node’s question, if it holds exactly that node’s ancestors.', 'A node’s set of ancestors is its parent’s plus itself: one insertion. Copying the whole tree per node is too much.', 'Make the tree persistent: an insertion copies only the nodes on one root-to-leaf path and shares the rest. Each node keeps its own root.']),

  'dynamic-dp': task('a, updates', 'House robber: the largest sum of a[i] over positions with no two adjacent. Apply the updates [i, x] (set a[i] = x) one after another, and after each update compute the answer. Return the sum of those answers.', 'Up to 3000 houses and 3000 updates, values 0 to 100. Recomputing from scratch after every update is too slow.', [
    [[[1, 2, 3], [[0, 5]]], 8],
    [[[2, 7, 9, 3, 1], [[2, 0], [4, 10]]], 27],
    [[[5], [[0, 2], [0, 8]]], 10],
    [[[5, 1], [[0, 6]]], 6],
    [[[1, 1, 1, 1], [[1, 5], [2, 5], [0, 0]]], 18],
    [robberUpdates, 260774268],
  ], ['Summarise a segment by a 2 × 2 table: the best sum when its first house is taken or not, and its last house is taken or not.', 'Two segments side by side combine unless both touching houses are taken: a (max, +) product of the two tables.', 'Keep the summaries in a segment tree. An update changes one leaf and the log n summaries above it.']),

  'tree-automata': task('kids, ops', 'A full binary tree: kids[v] is [] for a leaf or [a, b] for an inner node, with root 0. Label every leaf 0 or 1 and every inner node with one of the operations in ops ("and", "or", "xor"). Count the labellings for which the root evaluates to 1, modulo 1 000 000 007.', 'Up to 70 000 nodes.', [
    [[[[]], ['and']], 1],
    [[[[1, 2], [], []], ['and']], 1],
    [[[[1, 2], [], []], ['and', 'or']], 4],
    [[[[1, 2], [], []], ['xor']], 2],
    [[[[1, 2], [3, 4], [], [], []], ['or']], 7],
    [[[[1, 2], [3, 4], [], [], []], ['and', 'or', 'xor']], 36],
    [[completeTree(15), ['xor']], 334578981],
  ], ['A subtree matters to its parent only through the value it evaluates to: 0 or 1. Those are the states of a tree automaton.', 'ways(v, s): the labellings of v’s subtree that make v evaluate to s. A leaf has one of each.', 'For an inner node, add over its operations and its children’s values x, y the products ways(a, x) · ways(b, y) into ways(v, op(x, y)). Children before parents.']),

  'proof-checklist': task('weights, values, W', 'Return [the best 0/1 knapsack value, the best unbounded knapsack value] for capacity W: in the first each item is used at most once, in the second any number of times.', 'Up to 100 items, weights 1 to 100, W ≤ 3000.', [
    [[[2, 3], [3, 5], 6], [8, 10]],
    [[[1], [2], 3], [2, 6]],
    [[[1], [3], 2], [3, 6]],
    [[[5], [10], 4], [0, 0]],
    [[[2, 3, 4], [3, 4, 5], 5], [7, 7]],
    [[[4, 3], [9, 6], 10], [15, 21]],
    [[range(100).map(i => i + 1), range(100).map(i => 2 * i + 1), 3000], [5963, 5970]],
  ], ['Both use a one-dimensional table best[c] over capacities. The only difference is the order of the capacity loop.', 'For 0/1, go down from W: best[c − w] still holds the value without this item. Going up would let the item be used again.', 'For unbounded, go up from w: best[c − w] may already include this item, which is exactly what is wanted.']),
}

export const SPECIALIST_CHALLENGES = { ...PROFILE_CHALLENGES, ...PROB_CHALLENGES, ...GAME_CHALLENGES, ...PARSE_CHALLENGES, ...CONTROL_CHALLENGES, ...RESEARCH_CHALLENGES }
