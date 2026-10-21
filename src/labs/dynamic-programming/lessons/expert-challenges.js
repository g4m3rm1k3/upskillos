// The Expert challenges (lessons/expert.js), one per lesson as the lessons become full ones. Each is a
// problem the lesson’s technique makes fast: the last case is too large for the plain DP or for listing.
// Every expected value was produced by expert-oracles.js where it can enumerate, and the large cases have
// closed forms (binomials, Fibonacci numbers, powers of two); lessons.test.js re-checks them all.
import { task } from './challenges.js'

const range = n => Array.from({ length: n }, (_, i) => i)

export const EXPERT_CHALLENGES = {
  // ── State and transition reduction ──
  'rolling-arrays': task('grid', 'Count the paths from the top-left to the bottom-right cell that move only right or down and never enter a blocked cell (1). Return the count modulo 1 000 000 007.', 'The grid is up to 300 × 300. Keep a single row of counts: the full table isn’t needed.', [
    [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], 2],
    [[[[0, 0], [0, 0]]], 2],
    [[[[1]]], 0],
    [[[[0, 0, 0, 0]]], 1],
    [[[[0, 0, 1], [1, 0, 0], [0, 0, 0]]], 2],
    [[range(300).map(() => Array(300).fill(0))], 764315181],
  ], ['Before row[c] is updated it still holds the count from above; row[c − 1] already holds the count from the left.', 'A blocked cell sets row[c] = 0.', 'The first row’s cells each have one path, or none after a block.']),

  'in-place': task('items, cap', 'Each item is [weight, value, many]: many = 1 means it may be taken any number of times, 0 means at most once. Return the largest total value within capacity cap.', 'cap ≤ 100 000; weights are positive.', [
    [[[[3, 4, 0], [2, 3, 1]], 7], 10],
    [[[[2, 3, 0]], 5], 3],
    [[[], 10], 0],
    [[[[4, 5, 1], [3, 3, 0]], 11], 13],
    [[[[5, 10, 0], [5, 10, 0], [2, 3, 1]], 12], 23],
    [[[[3, 5, 1], [1000, 2000, 0]], 100000], 167000],
  ], ['One row best[c] for every capacity, updated item by item.', 'For a once-only item scan c downward, so best[c − w] still excludes the item.', 'For an unlimited item scan c upward, so best[c − w] may already include it.']),

  'hirschberg': task('a, b', 'Return the longest common subsequence of a and b; if several have that length, the smallest in dictionary order.', 'Strings up to 800 letters. Hirschberg’s method finds an LCS in linear memory; for this exact-answer version, a table of suffix LCS lengths plus a greedy walk is fine.', [
    [['abcbdab', 'bdcaba'], 'bcab'],
    [['abc', 'abc'], 'abc'],
    [['abc', 'def'], ''],
    [['ba', 'ab'], 'a'],
    [['aabba', 'abab'], 'aab'],
    [['a'.repeat(400) + 'b'.repeat(400), 'b'.repeat(400) + 'a'.repeat(400)], 'a'.repeat(400)],
  ], ['Fill L(i, j), the LCS length of a[i:] and b[j:], from the ends backward.', 'Walk forward: try letters in order, each at its earliest position in both strings.', 'Take the first letter c for which 1 + L(after c in a, after c in b) still equals L(i, j).']),

  'prefix-sum-dp': task('n, k', 'Count the ways to climb n stairs taking steps of any size from 1 to k (order matters). Return the count modulo 1 000 000 007.', 'n, k ≤ 100 000, so adding up k earlier values for each stair is too slow.', [
    [[4, 2], 5],
    [[5, 3], 13],
    [[0, 4], 1],
    [[1, 1], 1],
    [[10, 10], 512],
    [[100000, 2], 967618232],
  ], ['ways(i) = ways(i − 1) + … + ways(i − k).', 'Keep prefix sums P(i) = ways(0) + … + ways(i − 1); the window is P(i) − P(i − k).', 'Clamp i − k at 0, and keep the subtraction non-negative under the modulus.']),

  'difference-dp': task('limits, total', 'Give each child i between 0 and limits[i] candies so that exactly total are given out. Count the ways, modulo 1 000 000 007.', 'Up to 50 children and total ≤ 20 000. Each child’s choices spread a count over a range: use a difference array.', [
    [[[1, 2, 3], 4], 5],
    [[[2, 2], 5], 0],
    [[[], 0], 1],
    [[[0, 0, 0], 0], 1],
    [[[3, 1, 4], 5], 7],
    [[Array(50).fill(20000), 20000], 798543715],
  ], ['ways[t]: ways to give t candies to the children so far.', 'The next child turns ways[t] into a contribution to every t′ from t to t + limit: add at t, subtract at t + limit + 1.', 'One prefix sum of the difference array gives the new ways.']),

  'monotone-queue': task('a, k', 'Start on square 0 and finish on the last square, jumping forward 1 to k squares at a time. Return the largest possible sum of the values on the squares you land on (the first and last included).', 'Up to 100 000 squares; values can be negative.', [
    [[[1, -1, -2, 4, -7, 3], 2], 7],
    [[[10, -5, -2, 4, 0, 3], 3], 17],
    [[[5], 1], 5],
    [[[1, -10, -10, 1], 1], -18],
    [[[2, -9, -9, -9, 2], 3], -5],
    [[Array(100000).fill(1), 5], 100000],
  ], ['best(i) = a[i] + the largest best(j) for j in i − k … i − 1.', 'Keep a deque of indices with decreasing best; the front is the window’s maximum.', 'Drop indices that leave the window from the front, and worse ones from the back before adding i.']),

  'fenwick-dp': task('a', 'Count the strictly increasing subsequences of a (by positions, of any length ≥ 1). Return the count modulo 1 000 000 007.', 'Up to 100 000 values.', [
    [[[1, 2, 3]], 7],
    [[[3, 2, 1]], 3],
    [[[]], 0],
    [[[2, 2]], 2],
    [[[1, 3, 2, 4]], 11],
    [[range(100000).map(i => i + 1)], 607723519],
  ], ['ending(i) = 1 + the sum of ending(j) over earlier j with a smaller value.', 'Replace values by their ranks, and keep a Fenwick tree of sums indexed by rank.', 'Query the prefix below the rank, then add the new count at the rank.']),

  'segment-tree-dp': task('a, d', 'Return the length of the longest subsequence of a in which every two neighbouring values differ by at most d.', 'Up to 100 000 values up to 10⁹.', [
    [[[1, 5, 2, 6, 3], 1], 3],
    [[[10, 20, 30], 5], 1],
    [[[], 3], 0],
    [[[4, 4, 4], 0], 3],
    [[[1, 3, 5, 2, 4], 2], 4],
    [[range(100000), 1], 100000],
  ], ['best(i) = 1 + the largest best(j) over earlier j with a[j] in [a[i] − d, a[i] + d].', 'Store, for each compressed value, the best length ending there: a segment tree answers the range maximum.', 'Find the range’s ends with binary search on the sorted distinct values.']),

  'coordinate-compression': task('a', 'Return the largest sum of a strictly increasing subsequence of a (0 for an empty list).', 'Up to 100 000 values from 1 to 10⁹: too large to index an array by value.', [
    [[[1, 101, 2, 3, 100]], 106],
    [[[3, 2, 1]], 3],
    [[[]], 0],
    [[[1000000000, 1]], 1000000000],
    [[[5, 1, 6, 2, 7]], 18],
    [[range(100000).map(i => (i + 1) * 10000)], 50000500000000],
  ], ['Sort the distinct values and replace each value by its rank.', 'A Fenwick tree over ranks keeps the best sum ending below each rank.', 'Use the real value, not the rank, when adding to the sum.']),

  'pareto-frontiers': task('weights, values, cap', 'A 0/1 knapsack whose weights and capacity can be up to 10⁹. Return the largest total value within the capacity.', 'Up to 16 items: too few for a value table to matter, but the weights rule out a table indexed by capacity.', [
    [[[1000000000, 600000000, 500000000], [5, 3, 3], 1100000000], 6],
    [[[5, 4, 6], [10, 40, 30], 10], 70],
    [[[5, 6], [9, 2], 9], 9],
    [[[], [], 100], 0],
    [[[7], [9], 6], 0],
    [[[200000000, 300000000, 400000000, 500000000], [3, 4, 5, 6], 900000000], 12],
    [[range(16).map(i => 2 ** i * 10000000), range(16).map(i => 2 ** i), 2 ** 16 * 10000000], 65535],
  ], ['Keep a list of (weight, value) pairs for the choices made so far.', 'After each item, add the item to every pair that still fits, then sort by weight.', 'Drop every pair that is no better in value than a lighter one: what remains is the Pareto frontier.']),

  'bitset-dp': task('values', 'Count the different totals that some of the values (each used at most once, possibly none) can add up to.', 'Up to 20 values whose sum can reach 2 000 000. A bitset (a Python int or a JavaScript BigInt) holds every reachable total at once.', [
    [[[2, 3]], 4],
    [[[1, 1, 1]], 4],
    [[[]], 1],
    [[[5, 0]], 2],
    [[[3, 5, 7, 11]], 16],
    [[range(20).map(i => 2 ** i)], 1048576],
  ], ['Bit t of B is 1 when total t is reachable; start with B = 1 (total 0).', 'Adding value v: B |= B << v, both terms read from the old B.', 'The answer is the number of 1 bits.']),

  'bounded-binary': task('weights, values, counts, cap', 'Item i may be taken up to counts[i] times. Return the largest total value within capacity cap.', 'cap ≤ 100 000; counts up to 10⁹; weights positive. Split each count into bundles 1, 2, 4, … and a remainder.', [
    [[[2, 3], [3, 5], [3, 1], 8], 11],
    [[[1], [2], [5], 3], 6],
    [[[1], [8], [6], 9], 48],
    [[[], [], [], 7], 0],
    [[[4], [7], [100], 10], 14],
    [[[3, 5], [4, 7], [2, 3], 15], 21],
    [[[1], [1], [1000000000], 100000], 100000],
  ], ['More copies than cap ÷ weight can never be used: cap the count first.', 'Bundles of 1, 2, 4, … plus a remainder can make every count from 0 to the limit.', 'Treat each bundle as one 0/1 item, scanning capacity downward.']),

  'bounded-queue': task('weights, counts, target', 'Item i may be taken 0 to counts[i] times. Count the ways to choose how many of each so that the total weight is exactly target, modulo 1 000 000 007.', 'target ≤ 50 000; counts up to 50 000.', [
    [[[1, 2], [2, 1], 3], 1],
    [[[2], [3], 4], 1],
    [[[], [], 0], 1],
    [[[3], [1], 4], 0],
    [[[1, 2, 3], [1, 1, 1], 3], 2],
    [[[1, 1], [50000, 50000], 50000], 50001],
  ], ['new[t] adds old[t − q·w] for q = 0 … count.', 'For each residue r mod w, the terms are a window of the last count + 1 values along r, r + w, r + 2w, …', 'Slide the window: add the newest value, subtract the one that falls out.']),

  'symmetry': task('jobs, k', 'Assign every job (a duration) to one of k identical machines. Return the smallest possible largest machine load.', 'Up to 12 jobs and 4 machines.', [
    [[[4, 4, 1, 1], 2], 5],
    [[[3, 3, 3], 2], 6],
    [[[], 3], 0],
    [[[7], 4], 7],
    [[[5, 4, 3, 3, 3], 2], 9],
    [[Array(12).fill(5), 4], 15],
  ], ['The machines are interchangeable: loads (3, 5) and (5, 3) have the same future.', 'Memoize on the sorted tuple of loads.', 'When two machines have equal loads, trying the second is the same as trying the first: skip it.']),
}
