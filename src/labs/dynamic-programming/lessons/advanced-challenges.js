// The Advanced challenges (lessons/advanced.js), one per lesson as the lessons become full ones. Every
// expected value was produced by the exhaustive answer keys in advanced-oracles.js where they can
// enumerate, and checked against the DP reference solutions in advanced-solutions.js; lessons.test.js
// re-checks all three on every run. Graphs are vertex counts n with vertices 0 … n − 1 and edge lists.
import { task } from './challenges.js'

const diamonds = (k, w = null) => {
  const e = []
  for (let i = 0; i < k; i++) {
    const a = 3 * i
    e.push(...[[a, a + 1], [a, a + 2], [a + 1, a + 3], [a + 2, a + 3]].map(([u, v], j) => (w ? [u, v, w(i, j)] : [u, v])))
  }
  return e
}
const path = (n, w) => Array.from({ length: n - 1 }, (_, i) => (w ? [i + 1, i, w(i)] : [i + 1, i]))
const star = k => Array.from({ length: k }, (_, i) => [0, i + 1])
const T5 = [[3, 0], [1, 3], [2, 0], [4, 2]]
const T7 = [[2, 5], [0, 2], [1, 0], [4, 1], [3, 1], [6, 2]]
const complete = (n, directed) => { const e = []; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b && (directed || a < b)) e.push([a, b]); return e }
const petersen = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [1, 6], [2, 7], [3, 8], [4, 9], [5, 7], [7, 9], [9, 6], [6, 8], [8, 5]]
const popcount = m => { let c = 0; for (; m; m &= m - 1) c++; return c }
const E15 = 10 ** 15 - 1
const snake = Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (i % 2 ? 12 * i + 11 - j : 12 * i + j)))

export const ADVANCED_CHALLENGES = {
  'dag-paths': task('n, edges, s, t', 'A directed acyclic graph has vertices 0 … n − 1 and edges [u, v]. Return the number of different paths from s to t. A path from a vertex to itself with no edges counts once.', 'n ≤ 100; the graph has no cycle; the answer fits in a JavaScript number. The last case has about a million paths, so they cannot be listed one by one.', [
    [[5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [1, 4]], 0, 4], 3],
    [[4, [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]], 0, 3], 3],
    [[3, [[1, 2]], 0, 2], 0],
    [[1, [], 0, 0], 1],
    [[6, [[0, 1], [1, 2], [0, 2], [2, 3], [1, 3], [3, 4], [2, 4], [4, 5], [3, 5]], 0, 5], 8],
    [[61, diamonds(20), 0, 60], 1048576],
    [[3, [[1, 0], [0, 2]], 1, 2], 1],
  ], ['ways(s) = 1. Every path into v arrives along exactly one last edge (u, v).', 'Add ways(u) along each edge only once u’s count is final: process vertices in topological order.', 'With s unreachable to t the answer is 0, and with s = t it is 1.']),

  'dag-longest': task('n, edges, s, t', 'A directed acyclic graph has weighted edges [u, v, w]; weights may be negative. Return the cheapest total weight of a path from s to t, or None (null in JavaScript) if t cannot be reached.', 'n ≤ 100; no cycles, so negative edges are safe; weights are integers from −50 to 50.', [
    [[3, [[0, 1, 3], [1, 2, -5], [0, 2, 1]], 0, 2], -2],
    [[3, [[0, 1, 4], [1, 2, -7], [0, 2, 0]], 0, 2], -3],
    [[4, [[0, 1, 2], [2, 3, 1]], 0, 3], null],
    [[1, [], 0, 0], 0],
    [[5, [[0, 1, 5], [0, 2, 2], [2, 1, 1], [1, 3, -4], [2, 3, 6], [3, 4, 2], [1, 4, 9]], 0, 4], 1],
    [[61, diamonds(20, (i, j) => (j < 2 ? (j ? -i : i) : 3)), 0, 60], -130],
  ], ['best(s) = 0 and every other vertex starts unknown (infinity).', 'Relax a vertex’s outgoing edges only after every edge into it has been relaxed: topological order.', 'An unreachable vertex must never offer a candidate; skip vertices still unknown.']),

  'increasing-grid': task('grid', 'Return the length (number of cells) of the longest path in the grid that moves up, down, left or right and steps only onto strictly larger values.', 'The grid is at most 12 × 12; values are integers. The last case has a 144-cell path, so walking every path from every cell is too slow without memoization.', [
    [[[[1, 2], [4, 3]]], 4],
    [[[[7, 7], [7, 7]]], 1],
    [[[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], 4],
    [[[[3, 4, 5], [3, 2, 6], [2, 2, 1]]], 4],
    [[[[5]]], 1],
    [[snake], 144],
  ], ['L(cell) = 1 + the largest L of a strictly larger neighbour, or 1 if there is none.', 'Strict increase means no path can return to a cell, so the memoized recursion always ends.', 'Equal neighbours are not an edge: a grid of equal values has answer 1.']),

  'critical-path': task('durations, deps', 'Task v takes durations[v] time. Each [a, b] in deps means task b cannot start until task a has finished. With unlimited workers, return the time at which every task is finished.', 'Up to 40 tasks; the dependencies have no cycle; durations are positive integers.', [
    [[[2, 5, 3], [[0, 2], [1, 2]]], 8],
    [[[4, 6, 2], [[0, 2], [1, 2]]], 8],
    [[[3, 1, 4, 1, 5], []], 5],
    [[[1, 2, 3, 4], [[0, 1], [1, 2], [2, 3]]], 10],
    [[[2, 3, 1, 4, 2, 1], [[0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [0, 5]]], 10],
    [[Array.from({ length: 40 }, (_, i) => (i % 7) + 1), Array.from({ length: 39 }, (_, i) => [i, i + 1]).concat([[0, 20], [5, 30]])], 155],
  ], ['finish(v) = durations[v] + the latest finish among v’s prerequisites (0 if it has none).', 'Prerequisites run at the same time, so take the maximum, not the sum.', 'The answer is the largest finish time, which need not belong to the last task in the list.']),

  'bellman-ford-dp': task('n, edges, s, k', 'A directed graph (cycles allowed, weights may be negative) has edges [u, v, w]. Return a list whose entry v is the cheapest total weight of a walk from s to v using at most k edges, or None (null) if no such walk exists.', 'n ≤ 50, k ≤ 50. Walks may repeat vertices; the edge budget keeps every answer finite.', [
    [[3, [[0, 1, 4], [1, 2, 5], [0, 2, 9]], 0, 1], [0, 4, 9]],
    [[3, [[0, 1, 4], [1, 2, 5], [0, 2, 10]], 0, 2], [0, 4, 9]],
    [[4, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 10]], 0, 2], [0, 1, 2, 10]],
    [[3, [[0, 1, 2], [1, 0, -1], [1, 2, 3]], 0, 3], [0, 2, 5]],
    [[4, [[1, 2, 1]], 0, 3], [0, null, null, null]],
    [[5, [[0, 1, 6], [0, 2, 7], [1, 3, 5], [2, 3, -3], [3, 1, -2], [1, 4, -4], [2, 4, 9]], 0, 4], [0, 2, 7, 4, -2]],
  ], ['D(k, v) is the cheapest walk to v with at most k edges; D(0, s) = 0 and every other D(0, v) is unknown.', 'Each round relaxes edges from the previous round’s values only, so one round adds at most one edge.', 'Copy the previous round before relaxing: updating in place can use two edges in one round.']),

  'floyd-warshall': task('n, edges', 'A directed graph has edges [u, v, w] (there may be several edges between the same pair, and negative weights, but no negative cycle). Return the n × n matrix of shortest distances, with 0 on the diagonal and None (null) where no path exists.', 'n ≤ 40.', [
    [[3, [[0, 1, 4], [1, 2, 1], [0, 2, 7]]], [[0, 4, 5], [null, 0, 1], [null, null, 0]]],
    [[2, [[0, 1, 3]]], [[0, 3], [null, 0]]],
    [[3, [[0, 1, 2], [1, 0, 2], [1, 2, -1]]], [[0, 2, 1], [2, 0, -1], [null, null, 0]]],
    [[1, []], [[0]]],
    [[4, [[0, 1, 5], [1, 2, 3], [2, 3, 1], [3, 0, 2], [0, 2, 9], [1, 3, 10]]], [[0, 5, 8, 9], [6, 0, 3, 4], [3, 8, 0, 1], [2, 7, 10, 0]]],
    [[4, [[0, 1, 1], [0, 1, 4], [1, 2, -2], [2, 3, 2], [0, 3, 3]]], [[0, 1, -1, 1], [null, 0, -2, 0], [null, null, 0, 2], [null, null, null, 0]]],
  ], ['Start with the cheapest direct edge for each pair, 0 on the diagonal and infinity elsewhere.', 'For k outermost, allow vertex k as an intermediate: D(i, j) = min(D(i, j), D(i, k) + D(k, j)).', 'Of two parallel edges keep the cheaper, and turn infinity into None at the end.']),

  'scc-boundaries': task('values, edges, s', 'A directed graph (cycles allowed) has a value on each vertex. A walk starts at s and may follow edges as long as it likes, revisiting vertices. Return the largest total of the values of the different vertices it visits.', 'Up to 40 vertices; values are non-negative integers.', [
    [[[1, 2, 3], [[0, 1], [1, 0], [1, 2]], 0], 6],
    [[[5, 1, 1, 9], [[0, 1], [1, 2], [2, 1], [0, 3]], 0], 14],
    [[[4, 3, 2], [[0, 1], [1, 2], [2, 0]], 1], 9],
    [[[7], [], 0], 7],
    [[[1, 2, 3, 4, 5, 6], [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [1, 5]], 0], 15],
    [[[2, 8, 1, 1, 6], [[0, 1], [0, 2], [2, 3], [3, 2], [3, 4]], 0], 10],
  ], ['Inside a strongly connected component a walk can visit every vertex, so a component is worth the sum of its values.', 'Collapse each component to one vertex: the result has no cycle.', 'On the component DAG, best(c) = weight(c) + the best of the components it leads to.']),

  'dag-product': task('n, edges, s, t', 'A directed acyclic graph has edges [u, v, w] with non-negative weights. You hold one coupon: on one edge of your choice you pay ⌊w / 2⌋ instead of w. Return the cheapest cost from s to t, or None (null) if t cannot be reached.', 'n ≤ 100; no cycles; weights are integers from 0 to 100.', [
    [[3, [[0, 1, 10], [1, 2, 4], [0, 2, 12]], 0, 2], 6],
    [[3, [[0, 1, 3], [1, 2, 3], [0, 2, 9]], 0, 2], 4],
    [[3, [[1, 2, 5]], 0, 2], null],
    [[1, [], 0, 0], 0],
    [[5, [[0, 1, 2], [1, 4, 20], [0, 2, 8], [2, 3, 8], [3, 4, 1], [0, 4, 30]], 0, 4], 12],
    [[61, diamonds(20, (i, j) => (j === 0 ? 2 : j === 1 ? 3 : 4 + (i === 7 ? 40 : 0))), 0, 60], 138],
  ], ['The state is (vertex, coupon still held or not): two values per vertex.', 'An edge from a held state can be paid in full (stay held) or with the coupon (move to used).', 'The answer is the better of t’s two states; the cheapest plain path may not be the best place for the coupon.']),
  // ── Tree DP. A tree is n vertices 0 … n − 1 and n − 1 edges [u, v] in either direction; it is rooted
  // at 0 where a root matters. The large cases have closed-form answers (paths and stars). ──
  'tree-basics': task('n, edges', 'Root the tree at vertex 0. Return a list whose entry v is the size of v’s subtree: v itself and every vertex below it.', 'n ≤ 200. Edges may be listed either way round, so which end is the parent must be worked out from the root.', [
    [[3, [[0, 1], [1, 2]]], [3, 2, 1]],
    [[4, star(3)], [4, 1, 1, 1]],
    [[1, []], [1]],
    [[5, T5], [5, 1, 2, 2, 1]],
    [[7, T7], [7, 3, 3, 1, 1, 1, 1]],
    [[200, path(200)], Array.from({ length: 200 }, (_, i) => 200 - i)],
  ], ['Walk out from vertex 0, remembering each vertex’s parent, so the edge back to the parent is never followed down.', 'size(v) = 1 + the sizes of its children. Visit children before their parent: the reverse of a breadth-first order works.', 'The last case is a path of 200: a recursive walk is fine, but must not go back up the parent edge.']),

  'tree-independent': task('weights, edges', 'Choose vertices of the tree, no two joined by an edge, to make the total weight as large as possible. Choosing nothing (total 0) is allowed.', 'Up to 100 vertices; weights are integers from −9 to 99; n = len(weights).', [
    [[[10, 4, 5], [[0, 1], [0, 2]]], 10],
    [[[1, 5, 1, 5], path(4)], 10],
    [[[7], []], 7],
    [[[3, 2, 2, 4, 1], T5], 6],
    [[[2, 9, 1, 3, 3, 8, 2], T7], 19],
    [[Array(100).fill(1), path(100)], 50],
  ], ['For each vertex keep two numbers: the best for its subtree with it taken, and with it skipped.', 'Taken: its weight plus the skipped value of every child. Skipped: each child may be either, so add the larger of each child’s two.', 'The answer is the larger of the root’s two numbers.']),

  'tree-cover': task('n, edges', 'Return the fewest vertices to choose so that every edge has at least one chosen end (a minimum vertex cover).', 'n ≤ 101.', [
    [[5, star(4)], 1],
    [[4, path(4)], 2],
    [[1, []], 0],
    [[5, T5], 2],
    [[7, T7], 2],
    [[101, path(101)], 50],
  ], ['Keep chosen(v) and unchosen(v): the smallest cover of v’s subtree with v chosen or not.', 'If v is not chosen, the edge to each child must be covered by the child: every child must be chosen.', 'If v is chosen, each child may be either: take the smaller.']),

  'tree-matching': task('n, edges', 'Return the largest number of edges you can choose with no two sharing a vertex (a maximum matching).', 'n ≤ 100.', [
    [[4, path(4)], 2],
    [[5, star(4)], 1],
    [[1, []], 0],
    [[5, T5], 2],
    [[7, T7], 2],
    [[100, path(100)], 50],
  ], ['Keep free(v), the best in v’s subtree with v left unmatched, and best(v), with v matched or not.', 'free(v) adds best(child) over its children. Matching v to one child c swaps best(c) for free(c) + 1.', 'Try every child as v’s partner, or none, and keep the best.']),

  'tree-diameter': task('n, edges', 'Edges [u, v, w] have positive lengths. Return the length of the longest path between any two vertices.', 'n ≤ 200; lengths are integers from 1 to 199.', [
    [[6, star(5).map(e => [...e, 1])], 2],
    [[3, [[0, 1, 4], [1, 2, 3]]], 7],
    [[1, []], 0],
    [[5, T5.map((e, i) => [...e, [2, 7, 1, 5][i]])], 15],
    [[7, T7.map((e, i) => [...e, [3, 1, 4, 1, 5, 9][i]])], 19],
    [[200, path(200, i => i + 1)], 19900],
  ], ['down(v) is the longest path from v down into its subtree.', 'The longest path through v as its highest point joins v’s two deepest branches.', 'Update the best with down(v) + the new branch before folding the branch into down(v).']),

  'tree-reroot': task('n, edges', 'Return a list whose entry v is the distance (in edges) from v to the vertex farthest from it.', 'n ≤ 100. Running a search from every vertex works for small trees; aim for one pass down and one pass up.', [
    [[3, path(3)], [2, 1, 2]],
    [[5, star(4)], [1, 2, 2, 2, 2]],
    [[1, []], [0]],
    [[5, T5], [2, 4, 3, 3, 4]],
    [[7, T7], [2, 3, 3, 4, 4, 4, 4]],
    [[100, path(100)], Array.from({ length: 100 }, (_, i) => Math.max(i, 99 - i))],
  ], ['First pass (children first): the deepest and second-deepest branch below each vertex, and which child gives the deepest.', 'Second pass (parents first): up(c) = 1 + the best of up(parent) and the parent’s deepest branch that doesn’t go through c.', 'The answer for v is the larger of its deepest branch down and up(v).']),

  'reroot-prefix': task('n, edges', 'For every vertex v, count the connected sets of vertices that contain v, modulo 1 000 000 007. Return the list of counts.', 'n ≤ 61. Counts are taken modulo a prime, so dividing one product by a factor is not available: build “all siblings but this one” from prefix and suffix products. In JavaScript, products of two numbers near 10⁹ exceed exact integers: use BigInt.', [
    [[4, star(3)], [8, 5, 5, 5]],
    [[3, path(3)], [3, 4, 3]],
    [[1, []], [1]],
    [[5, T5], [9, 5, 8, 8, 5]],
    [[7, T7], [25, 24, 24, 13, 13, 13, 13]],
    [[61, star(60)], [Number(2n ** 60n % 1000000007n), ...Array(60).fill(Number((2n ** 59n + 1n) % 1000000007n))]],
  ], ['down(v) = the product over children of (1 + down(child)): each child adds nothing, or a connected set through it.', 'For a child c, the part above it is the product of its siblings’ (1 + down) times (1 + up(parent)).', 'Exclude one sibling with prefix products from the left and suffix products from the right.']),

  'tree-distances': task('n, edges', 'Return a list whose entry v is the sum of the distances (in edges) from v to every vertex.', 'n ≤ 100.', [
    [[3, path(3)], [3, 2, 3]],
    [[6, [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]]], [11, 7, 9, 13, 9, 13]],
    [[1, []], [0]],
    [[5, T5], [6, 10, 7, 7, 10]],
    [[7, T7], [10, 11, 11, 16, 16, 16, 16]],
    [[100, path(100)], Array.from({ length: 100 }, (_, i) => (i * (i + 1)) / 2 + ((99 - i) * (100 - i)) / 2)],
  ], ['Work out the answer for the root directly: the sum of all depths.', 'Moving from a parent to a child c with s vertices in its subtree: s distances drop by 1 and n − s rise by 1.', 'So answer(c) = answer(parent) + n − 2s, filled parents first.']),

  'tree-knapsack': task('values, costs, edges, budget', 'Each vertex has a value and a cost. Choose vertices so that every chosen vertex other than 0 has its parent (rooted at 0) chosen too, with total cost at most budget. Return the largest total value; choosing nothing gives 0.', 'Up to 30 vertices; budget ≤ 10; values and costs are non-negative integers.', [
    [[[5, 3, 4], [1, 2, 2], [[0, 1], [0, 2]], 3], 9],
    [[[1, 9, 1], [1, 1, 1], path(3), 2], 10],
    [[[4], [5], [], 3], 0],
    [[[2, 6, 1, 7, 3], [1, 3, 1, 2, 2], T5, 5], 10],
    [[[1, 2, 3, 4, 5, 6, 7], [1, 1, 1, 1, 1, 1, 1], T7, 4], 17],
    [[Array(30).fill(1), Array(30).fill(1), path(30), 10], 10],
  ], ['D(v, b) is the best value from v’s subtree with v chosen and cost at most b.', 'Start with v alone, then merge one child at a time: try every split of the budget between what you have and the child.', 'A child’s subtree can only be used if v is chosen, so the answer is the better of 0 and D(0, budget).']),

  'tree-coloring': task('edges, allowed', 'Each vertex v may take one of the colours listed in allowed[v]. Count the ways to colour every vertex so that the two ends of each edge differ.', 'Up to 50 vertices; colours are 1, 2 or 3; n = len(allowed). The answer fits in a JavaScript number.', [
    [[path(4), [[1, 2], [1, 2], [1, 2], [1, 2]]], 2],
    [[star(3), [[1, 2, 3], [1], [2], [1, 2]]], 2],
    [[[], [[1, 2, 3]]], 3],
    [[T5, [[1], [1, 2], [2, 3], [1, 3], [1, 2, 3]]], 8],
    [[T7, [[1, 2, 3], [1, 2], [2, 3], [1, 3], [1, 2, 3], [1], [2, 3]]], 16],
    [[path(50), Array.from({ length: 50 }, () => [1, 2, 3])], 1688849860263936],
  ], ['ways(v, c) counts the colourings of v’s subtree with v coloured c.', 'Each child independently contributes its colourings whose colour isn’t c: its total minus ways(child, c).', 'Multiply over children, and add the root’s values at the end.']),

  'tree-path-count': task('n, edges, k', 'Return the number of unordered pairs of vertices whose distance (in edges) is exactly k.', 'n ≤ 100; 1 ≤ k ≤ 10.', [
    [[5, star(4), 2], 6],
    [[4, path(4), 1], 3],
    [[1, [], 1], 0],
    [[5, T5, 2], 3],
    [[7, T7, 3], 4],
    [[100, path(100), 10], 90],
  ], ['cnt(v, d) counts the vertices d edges below v among the branches merged so far.', 'Every path has one highest vertex. Before merging a child, pair its depths with the branches already merged so the two parts add to k.', 'Then add the child’s counts, shifted one deeper.']),

  'tree-connected': task('n, edges', 'Return the number of non-empty sets of vertices that are connected (the chosen vertices, with the edges between them, form one piece).', 'n ≤ 41. The answer fits in a JavaScript number.', [
    [[4, star(3)], 11],
    [[3, path(3)], 6],
    [[1, []], 1],
    [[5, T5], 15],
    [[7, T7], 37],
    [[41, star(40)], 1099511627816],
  ], ['Every connected set has exactly one highest vertex (closest to the root). Count by that vertex.', 'C(v) = connected sets whose highest vertex is v = the product over children of (1 + C(child)).', 'The answer adds C(v) over every vertex.']),

  'tree-small-large': task('colors, edges', 'Each vertex has a colour. Root the tree at 0 and return a list whose entry v is the number of different colours in v’s subtree.', 'n ≤ 200; colours are small integers.', [
    [[[1, 2, 1], path(3)], [2, 2, 1]],
    [[[5, 5, 6, 7], star(3)], [3, 1, 1, 1]],
    [[[3], []], [1]],
    [[[1, 2, 1, 3, 2], T5], [3, 1, 2, 2, 1]],
    [[[4, 4, 1, 2, 1, 3, 2], T7], [4, 3, 3, 1, 1, 1, 1]],
    [[Array.from({ length: 200 }, (_, i) => i % 7), path(200)], Array.from({ length: 200 }, (_, i) => Math.min(7, 200 - i))],
  ], ['Give every vertex a set of colours, starting with its own.', 'Merge each child’s set into its parent’s. Always pour the smaller set into the larger: each colour then moves only O(log n) times.', 'Read a vertex’s answer once all its children are merged in.']),
  // ── Bitmask and subset DP. Item i is bit i of a mask; vertices are 0 … n − 1. The large cases have
  // closed-form answers (factorials, binomial sums, the Petersen graph’s 3 colours). ──
  'bitmask-basics': task('weights, limit', 'Count the subsets of the items (the empty one included) whose total weight is at most limit. Work out each subset’s total from a smaller subset’s, using masks.', 'Up to 18 items, so 2¹⁸ = 262 144 masks; weights are non-negative integers.', [
    [[[3, 5, 2], 5], 5],
    [[[1, 1, 1], 1], 4],
    [[[], 0], 1],
    [[[4, 7, 1, 3], 8], 10],
    [[[6], 5], 1],
    [[Array(18).fill(1), 9], 155382],
  ], ['Item i is in the subset when bit i of the mask is 1: mask & (1 << i).', 'mask & -mask isolates the lowest set bit. Removing it gives a smaller mask whose total is already known.', 'total[mask] = total[mask without its lowest bit] + that item’s weight. Count the masks with total ≤ limit.']),

  'subset-enumeration': task('values', 'values has 2ⁿ entries, one for each mask. Return a list whose entry for mask m is the sum of values[s] over every submask s of m (every s whose bits all lie inside m, 0 and m included).', 'n ≤ 12, so 2ⁿ ≤ 4096 masks and 3ⁿ ≤ 531 441 (mask, submask) pairs.', [
    [[[1, 2, 3, 4]], [1, 3, 4, 10]],
    [[[5]], [5]],
    [[[0, 1, 0, 1, 0, 1, 0, 1]], [0, 1, 0, 2, 0, 2, 0, 4]],
    [[[3, -1, 4, 1, -5, 9, 2, 6]], [3, 2, 7, 7, -2, 6, 4, 19]],
    [[[2, 7]], [2, 9]],
    [[Array(4096).fill(1)], Array.from({ length: 4096 }, (_, m) => 2 ** popcount(m))],
  ], ['Start at s = m and step with s = (s − 1) & m: it visits every submask of m in decreasing order.', 'The step stops at 0, so handle s = 0 (the empty submask) before leaving the loop.', 'Over all masks this is 3ⁿ steps: each bit is out of m, in m but not s, or in both.']),

  'assignment': task('cost', 'cost[w][j] is the cost of giving job j to worker w. Each of the n workers gets a different job. Return the smallest total cost.', 'n ≤ 12. Trying all n! assignments is too slow for 12; a table over sets of used jobs has only 2ⁿ entries.', [
    [[[[3, 1], [2, 6]]], 3],
    [[[[4, 2, 8], [4, 3, 7], [3, 1, 6]]], 12],
    [[[]], 0],
    [[[[5]]], 5],
    [[[[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]], 13],
    [[Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => (i + 1) * (j + 1)))], 364],
  ], ['D(mask): the cheapest way to give the jobs in mask to the first popcount(mask) workers.', 'The next worker is number popcount(mask); try every job not in mask.', 'D(0) = 0; the answer is D(all jobs).']),

  'held-karp': task('dist', 'dist[i][j] is the cost from city i to city j. Start at city 0, visit every city exactly once, and return to 0. Return the cheapest tour.', 'Up to 12 cities; costs are non-negative integers. A single city gives 0.', [
    [[[[0, 1, 5], [1, 0, 2], [5, 2, 0]]], 8],
    [[[[0]]], 0],
    [[[[0, 3], [3, 0]]], 6],
    [[[[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]]], 80],
    [[[[0, 1, 9, 9], [9, 0, 1, 9], [9, 9, 0, 1], [1, 9, 9, 0]]], 4],
    [[Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (_, j) => Math.abs(i - j)))], 22],
  ], ['D(mask, v): the cheapest path from 0 that visits exactly the cities in mask and ends at v.', 'Extend to a city u not in mask: D(mask ∪ {u}, u) ≤ D(mask, v) + dist[v][u].', 'Start with D({0}, 0) = 0; finish with the best D(all, v) + dist[v][0].']),

  'hamiltonian': task('n, edges', 'A directed graph has edges [a, b]. Count the paths that start at vertex 0 and visit every vertex exactly once (they may end anywhere).', 'n ≤ 10.', [
    [[4, complete(4, true)], 6],
    [[1, []], 1],
    [[3, [[0, 1], [1, 2]]], 1],
    [[3, [[1, 0], [1, 2]]], 0],
    [[5, [[0, 1], [1, 2], [2, 3], [3, 4], [0, 2], [2, 4], [1, 3], [4, 1]]], 3],
    [[10, complete(10, true)], 362880],
  ], ['C(mask, v): how many paths from 0 visit exactly mask and end at v.', 'Push C(mask, v) along each edge v → u with u not in mask.', 'Start with C({0}, 0) = 1; the answer adds C(all, v) over every end v.']),

  'subset-partition': task('values, cap', 'Pack the items into as few bins as possible; a bin’s items must total at most cap. Return the number of bins.', 'Up to 12 items, each at most cap.', [
    [[[4, 4, 4, 4], 8], 2],
    [[[5, 5, 5], 9], 3],
    [[[], 5], 0],
    [[[3, 3, 2, 2, 2], 6], 2],
    [[[7, 1, 2, 4, 6, 3], 8], 3],
    [[Array(12).fill(4), 8], 6],
  ], ['D(mask): the fewest bins for the items in mask.', 'Choose the bin that holds mask’s lowest item: it is a submask containing that bit, with total ≤ cap.', 'Fixing that bit means each packing is built in one order only. D(0) = 0.']),

  'subset-cover': task('n, options', 'Each option is [items, cost]: buying it covers those items (numbered 0 … n − 1). Return the cheapest total cost that covers every item, or −1 if it can’t be done.', 'n ≤ 14; costs are positive integers.', [
    [[3, [[[0, 1], 3], [[1, 2], 3], [[0, 1, 2], 4]]], 4],
    [[2, [[[0], 1]]], -1],
    [[0, []], 0],
    [[4, [[[0, 1], 2], [[2, 3], 2], [[1, 2], 1], [[0], 1], [[3], 1]]], 3],
    [[3, [[[0], 5], [[1], 5], [[2], 5], [[0, 1, 2], 16]]], 15],
    [[3, [[[0, 1], 8], [[0, 2], 2]]], 10],
    [[14, [...Array.from({ length: 14 }, (_, i) => [[i], i + 1]), [Array.from({ length: 14 }, (_, i) => i), 50]]], 50],
  ], ['D(mask): the cheapest set of options whose combined items are exactly mask. The set covered so far is the state.', 'Buying an option moves from mask to mask | optionMask and adds its cost.', 'mask | optionMask is never smaller than mask, so filling masks in increasing order works.']),

  'steiner-tree': task('n, edges, terminals', 'An undirected graph has weighted edges [a, b, w]. Return the smallest total weight of edges that connect all the terminal vertices (other vertices may be used too).', 'n ≤ 30, at most 6 terminals, weights positive; the graph is connected.', [
    [[4, [[0, 1, 1], [0, 2, 1], [0, 3, 1]], [1, 2, 3]], 3],
    [[3, [[0, 1, 2], [1, 2, 3]], [0, 2]], 5],
    [[3, [[0, 1, 4], [1, 2, 4]], [1]], 0],
    [[4, [[0, 1, 3], [1, 2, 3], [0, 2, 5], [2, 3, 1]], [0, 1, 3]], 7],
    [[5, [[0, 4, 1], [1, 4, 1], [2, 4, 1], [0, 1, 3], [1, 2, 3], [3, 2, 2]], [0, 1, 2, 3]], 5],
    [[30, Array.from({ length: 29 }, (_, i) => [i, i + 1, 1]), [0, 10, 29]], 29],
  ], ['D(mask, v): the lightest tree joining the terminals in mask together with vertex v.', 'At v, merge two disjoint terminal sets: D(s, v) + D(mask − s, v).', 'Then let v move along shortest paths: D(mask, v) ≤ D(mask, u) + dist(u, v). A single terminal t gives D = dist(t, v).']),

  'subset-topological': task('n, edges', 'Each edge [a, b] says a must come before b. Count the orders of all n vertices that respect every edge.', 'n ≤ 12; the edges have no cycle. The answer fits in a JavaScript number.', [
    [[3, [[0, 1], [1, 2]]], 1],
    [[3, []], 6],
    [[4, [[0, 1], [0, 2]]], 8],
    [[1, []], 1],
    [[5, [[0, 2], [1, 2], [2, 3], [2, 4]]], 4],
    [[12, []], 479001600],
  ], ['C(mask): how many valid orders place exactly the vertices in mask first.', 'v may come next if every vertex that must precede it is already in mask: need[v] ⊆ mask.', 'C(0) = 1; the answer is C(all).']),

  'subset-matching': task('n, edges', 'Count the perfect matchings of an undirected graph: sets of edges that use every vertex exactly once.', 'n ≤ 14 and even.', [
    [[2, [[0, 1]]], 1],
    [[4, complete(4)], 3],
    [[0, []], 1],
    [[4, [[0, 1], [1, 2], [2, 3]]], 1],
    [[6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]], 2],
    [[14, complete(14)], 135135],
  ], ['D(mask): the perfect matchings of the vertices in mask.', 'The lowest vertex v of mask must be matched to someone: try each neighbour u in mask.', 'Choosing the partner of the lowest vertex means each matching is counted once. D(empty) = 1.']),

  'subset-coloring': task('n, edges', 'Return the fewest colours needed to colour the vertices of an undirected graph so that neighbours differ (the chromatic number).', 'n ≤ 10.', [
    [[3, [[0, 1], [1, 2]]], 2],
    [[3, [[0, 1], [1, 2], [0, 2]]], 3],
    [[0, []], 0],
    [[1, []], 1],
    [[5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]], 3],
    [[10, petersen], 3],
  ], ['A colour class is an independent set: no edge inside it. Work out which masks are independent first.', 'D(mask) = 1 + the smallest D(mask − S) over independent S ⊆ mask.', 'Require S to contain mask’s lowest vertex, so each colouring is built in one order. D(0) = 0.']),

  'mask-language': task('sets', 'Each set lists bit positions (from 0 up to 99, no repeats within a set). XOR the sets’ masks together and return the result as a decimal string.', 'Positions go past 63, beyond 64-bit integers and far beyond JavaScript’s exact integers: use BigInt in JavaScript (Python integers grow as needed). The answer is a string because JSON numbers can’t hold it exactly.', [
    [[[[0, 1], [1, 2]]], '5'],
    [[[[63]]], '9223372036854775808'],
    [[[]], '0'],
    [[[[0], [0]]], '0'],
    [[[[1, 3], [3, 64]]], '18446744073709551618'],
    [[Array.from({ length: 100 }, (_, i) => [i])], '1267650600228229401496703205375'],
  ], ['Build each set’s mask with OR: m |= 1 << p (1n << BigInt(p) in JavaScript).', 'XOR keeps a bit when it appears an odd number of times.', 'Return String(x) (x.toString() in JavaScript), not the number itself.']),
  // ── Digit and automaton DP. Numbers reach 10¹⁵ and strings length 50, far past listing them; the
  // large cases have closed forms (9¹⁵, 10¹⁵ − 9¹⁵, Fibonacci numbers, the alternating strings). ──
  'digit-tight': task('n', 'Count the integers from 0 to n (both included) that have no digit 4.', '0 ≤ n < 10¹⁵. Counting one by one is far too slow for the last case; build the numbers digit by digit.', [
    [[17], 16],
    [[4], 4],
    [[0], 1],
    [[100], 82],
    [[444], 324],
    [[E15], 205891132094649],
  ], ['Write n’s digits out. A number below n agrees with n on some prefix, then has a smaller digit, then anything.', 'State: the position, and whether the prefix so far equals n’s prefix (tight). Tight limits the next digit to n’s digit; otherwise 0–9.', 'Skip the digit 4 everywhere. The empty prefix has one completion at the end: the number itself.']),

  'digit-leading': task('n', 'Count the integers from 1 to n that contain no digit 0 (in their usual writing, without leading zeros).', '1 ≤ n < 10¹⁵.', [
    [[9], 9],
    [[10], 9],
    [[1], 1],
    [[100], 90],
    [[2023], 1548],
    [[E15], 231627523606479],
  ], ['Pad n to its full length; a shorter number is a longer one with leading zeros.', 'Keep a started flag: zeros before the first non-zero digit are padding, not digits.', 'Reject 0 only once started, and at the end count only numbers that started (0 itself is not counted).']),

  'digit-range': task('lo, hi', 'Count the integers x with lo ≤ x ≤ hi that contain the digit 7 at least once.', '0 ≤ lo ≤ hi < 10¹⁵.', [
    [[3, 8], 1],
    [[0, 100], 19],
    [[7, 7], 1],
    [[70, 79], 10],
    [[123, 4567], 1165],
    [[0, E15], 794108867905351],
  ], ['Let F(x) count the valid numbers from 0 to x, with F(−1) = 0.', 'Then the answer is F(hi) − F(lo − 1): one digit DP, used twice.', 'Inside F, carry a flag “a 7 has appeared”.']),

  'digit-sum': task('n, s, m', 'Count the integers x from 1 to n whose digits add up to exactly s and that are divisible by m.', '1 ≤ n < 10¹⁵, 0 ≤ s ≤ 135, 1 ≤ m ≤ 100.', [
    [[100, 5, 1], 6],
    [[1000, 10, 7], 10],
    [[9, 0, 1], 0],
    [[500, 9, 3], 40],
    [[3000, 12, 4], 53],
    [[E15, 2, 1], 120],
  ], ['Carry two numbers along with tight: the digit sum so far, and the remainder of the prefix modulo m.', 'Appending digit d: sum + d, and remainder (10 · r + d) mod m.', 'Stop early once the sum passes s. 0 has digit sum 0 and remainder 0, so leave it out when s = 0.']),

  'digit-mask': task('n', 'Count the integers from 1 to n whose digits are all different.', '1 ≤ n < 10¹⁵ (no number past 10 digits qualifies).', [
    [[10], 10],
    [[100], 90],
    [[1], 1],
    [[1000], 738],
    [[9876], 5274],
    [[10 ** 10 - 1], 8877690],
  ], ['Keep a 10-bit mask of the digits used so far.', 'A digit whose bit is already set can’t be used again.', 'Leading padding zeros must not set bit 0: track started.']),

  'digit-adjacency': task('n', 'Count the integers from 1 to n in which every two neighbouring digits differ by at least 2.', '1 ≤ n < 10¹⁵.', [
    [[10], 9],
    [[100], 73],
    [[1], 1],
    [[1357], 556],
    [[20000], 6488],
    [[10 ** 12 - 1], 28635600630],
  ], ['Carry the last meaningful digit; before the first one, use a sentinel that any digit may follow.', 'The next digit d must satisfy |d − last| ≥ 2.', 'Padding zeros keep the sentinel; the first non-zero digit replaces it.']),

  'digit-aggregate': task('n', 'Add up all the integers from 0 to n whose digits are all odd. Return the sum modulo 1 000 000 007.', '0 ≤ n < 10¹⁵. Keep every intermediate value below the modulus: (10 · total + d · count) stays exact in JavaScript numbers.', [
    [[10], 25],
    [[100], 1400],
    [[0], 0],
    [[999], 70775],
    [[12345], 4987025],
    [[E15], 877737181],
  ], ['Carry, for each state, how many valid prefixes there are and the sum of their values.', 'Appending digit d to every prefix: count stays, and total becomes 10 · total + d · count.', 'States with the same (tight, started) merge by adding both numbers.']),

  'kmp-dp': task('alphabet, pattern, length', 'Count the strings of the given length over the alphabet that do not contain pattern as a substring. Return the count modulo 1 000 000 007.', 'The alphabet has up to 26 letters, the pattern up to 10 letters, the length up to 50.', [
    [['ab', 'ab', 2], 3],
    [['ab', 'aa', 4], 8],
    [['abc', 'abc', 0], 1],
    [['abc', 'ab', 5], 144],
    [['ab', 'aba', 6], 37],
    [['ab', 'bba', 4], 12],
    [['ab', 'aa', 50], 951279875],
  ], ['State: how much of the pattern the string currently ends with (0 to len − 1).', 'The prefix function tells where you fall back on a mismatch, so each (state, letter) has one next state.', 'Count strings by state, one letter at a time, never entering the full-match state.']),

  'aho-dp': task('alphabet, patterns, length', 'Count the strings of the given length over the alphabet that contain none of the patterns. Return the count modulo 1 000 000 007.', 'Up to 10 patterns of up to 10 letters; length up to 50.', [
    [['ab', ['aa', 'bb'], 3], 2],
    [['abc', ['a'], 3], 8],
    [['ab', ['ab', 'ba'], 4], 2],
    [['abc', ['ab', 'bc', 'ca'], 4], 24],
    [['ab', ['aab', 'b'], 0], 1],
    [['ab', ['aa', 'bb'], 50], 2],
  ], ['Put the patterns in a trie and add failure links (Aho–Corasick): a node’s failure is its longest proper suffix that is also in the trie.', 'A node is forbidden if it ends a pattern, or its failure node is forbidden.', 'Count strings by trie node, one letter at a time, never entering a forbidden node.']),

  'automaton-product': task('pattern, m, length', 'Count the strings of exactly length digits (leading zeros allowed) that contain pattern as a substring and whose value is divisible by m. Return the count modulo 1 000 000 007.', 'pattern has 1–4 digits; 1 ≤ m ≤ 50; length ≤ 30.', [
    [['7', 1, 2], 19],
    [['12', 3, 3], 8],
    [['0', 5, 1], 1],
    [['99', 11, 4], 28],
    [['5', 7, 4], 490],
    [['7', 1, 15], 862346595],
  ], ['The state pairs the pattern automaton’s state with the remainder: (matched length, value mod m).', 'Once the whole pattern has appeared, stay in a “found” state.', 'The answer reads the found state with remainder 0.']),

  'ranking': task('alphabet, pattern, length, k', 'Among all strings of the given length over the alphabet that do not contain pattern, in dictionary order, return the k-th (counting from 1). Return the empty string if there are fewer than k.', 'Length up to 50; 1 ≤ k ≤ 10¹⁵. Counts can be huge: cap them above k so they stay exact.', [
    [['ab', 'bb', 2, 3], 'ba'],
    [['ab', 'aa', 3, 2], 'abb'],
    [['abc', 'a', 2, 4], 'cc'],
    [['ab', 'ab', 3, 9], ''],
    [['ba', 'aa', 4, 5], 'babb'],
    [['ab', 'aa', 50, 1], 'ab'.repeat(25)],
  ], ['First count, for every automaton state and remaining length, how many valid completions there are.', 'Build the answer one letter at a time, trying letters in sorted order.', 'If a letter’s completions are fewer than k, skip them all (k −= count); otherwise take that letter.']),
}
