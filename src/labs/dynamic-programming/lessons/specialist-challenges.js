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

export const SPECIALIST_CHALLENGES = { ...PROFILE_CHALLENGES }
