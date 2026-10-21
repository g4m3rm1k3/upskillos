// The Expert challenges (lessons/expert.js), one per lesson as the lessons become full ones. Each is a
// problem the lesson’s technique makes fast: the last case is too large for the plain DP or for listing.
// Every expected value was produced by expert-oracles.js where it can enumerate, and the large cases have
// closed forms (binomials, Fibonacci numbers, powers of two); lessons.test.js re-checks them all.
import { task } from './challenges.js'

const range = n => Array.from({ length: n }, (_, i) => i)

const popcount = m => { let c = 0; for (; m; m &= m - 1) c++; return c }
const allPairs = (k, cost) => range(k).flatMap(u => range(k).map(v => (cost ? [u, v, cost(u, v)] : [u, v])))
// s(i) = 2^i + 3^i + i, modulo 998 244 353, for i = 0 … 1 999.
const sumOfPowers = (() => { const P = 998244353n, out = []; let p2 = 1n, p3 = 1n; for (let i = 0; i < 2000; i++) { out.push(Number((p2 + p3 + BigInt(i)) % P)); p2 = (p2 * 2n) % P; p3 = (p3 * 3n) % P } return out })()

const ALGEBRA_CHALLENGES = {
  'matrix-power': task('k, edges, n', 'A directed graph has vertices 0 to k − 1 and the given edges [u, v] (repeated edges count separately). Count the walks of exactly n edges from vertex 0 to vertex k − 1, modulo 1 000 000 007.', 'k ≤ 6, n ≤ 10¹⁵: far too many steps to take one at a time. In JavaScript, a product of two numbers below 10⁹ + 7 is not exact; split one factor or use BigInt.', [
    [[2, [[0, 1], [1, 0]], 3], 1],
    [[2, [[0, 0], [0, 1], [1, 1]], 4], 4],
    [[1, [], 0], 1],
    [[3, [[0, 1], [1, 2], [2, 0]], 5], 1],
    [[3, [[0, 1], [0, 1], [1, 2], [2, 2]], 4], 2],
    [[3, allPairs(3), 1e15], 822868953],
  ], ['W(t)[v], the walks of t edges ending at v, is one step of a fixed linear map: W(t + 1) = W(t)·A.', 'So W(n) = W(0)·Aⁿ, and Aⁿ takes about log₂ n squarings.', 'Square A while halving n; multiply the result by A whenever n is odd.']),

  'linear-recurrence': task('c, a, n', 'a(i) = c[0]·a(i − 1) + c[1]·a(i − 2) + … + c[k − 1]·a(i − k) modulo 998 244 353, and a(0) … a(k − 1) are given. Return a(n).', 'k ≤ 10 and n ≤ 10¹⁵. Kitamasa’s method: O(k² log n).', [
    [[[1, 1], [0, 1], 10], 55],
    [[[2], [3], 5], 96],
    [[[1, 1, 1], [0, 0, 1], 7], 13],
    [[[0, 1], [5, 7], 0], 5],
    [[[3, 998244352], [1, 2], 6], 233],
    [[[1, 1], [0, 1], 1e15], 221270209],
  ], ['Shifting the sequence once is multiplying by x, and x^k can be replaced by c[0]x^(k−1) + … + c[k−1].', 'Compute xⁿ reduced that way, by repeated squaring of polynomials of degree below k.', 'If xⁿ reduces to r₀ + r₁x + … , then a(n) = r₀a(0) + r₁a(1) + ….']),

  'berlekamp-massey': task('s', 'The terms s, modulo 998 244 353, follow some linear recurrence, and at least twice as many terms as its length are given. Return the next term.', 'Up to 2 000 terms. Berlekamp–Massey finds the shortest recurrence in O(n²).', [
    [[[1, 1, 2, 3, 5, 8]], 13],
    [[[2, 4, 8, 16]], 32],
    [[[0, 0, 0]], 0],
    [[[1, 2, 3, 4, 5, 6]], 7],
    [[[1, 0, 1, 0, 1, 0]], 1],
    [[sumOfPowers], 747337405],
  ], ['Keep the current recurrence C and check each term against it.', 'When it predicts wrongly, add a scaled, shifted copy of the recurrence from the last time it failed, which cancels the error.', 'If the fix needs a longer recurrence, the length becomes i + 1 − L.']),

  'bostan-mori': task('p, q, n', 'Return the coefficient of xⁿ in the power series P(x)/Q(x), modulo 998 244 353. p and q are the coefficients (lowest first) and q[0] = 1.', 'Degrees up to 8, n ≤ 10¹⁵. Coefficients may be given negative; reduce them modulo p.', [
    [[[1], [1, -1, -1], 10], 89],
    [[[1], [1, -2], 5], 32],
    [[[1, 1], [1, -1], 0], 1],
    [[[2, 3], [1, 0, -1], 7], 3],
    [[[1], [1, -1, 0, -1], 12], 60],
    [[[1], [1, -1, -1], 1e15], 622759774],
  ], ['Multiply top and bottom by Q(−x): the bottom becomes Q(x)Q(−x), which has only even powers.', 'Coefficient n of the result only meets the top’s terms with n’s parity; keep those, and halve n.', 'Stop at n = 0: the answer is P(0)/Q(0).']),

  'generating-functions': task('g, m, n', 'g is a polynomial (coefficients lowest first, g[0] = 1). Return the coefficient of xⁿ in g(x)^m, modulo 998 244 353.', 'deg g ≤ 4, m ≤ 100 000, n ≤ 100 000. Multiplying g in m times is too slow.', [
    [[[1, 1], 5, 2], 10],
    [[[1, 1, 1], 3, 3], 7],
    [[[1, 2], 4, 0], 1],
    [[[1, 0, 1], 4, 3], 0],
    [[[1, 1, 1, 1, 1, 1], 2, 7], 4],
    [[[1, 1], 100000, 50000], 710154335],
  ], ['f = gᵐ satisfies g·f′ = m·g′·f: differentiate both sides of f = gᵐ.', 'Compare the coefficients of x^(k−1): k·f_k = Σ over i ≥ 1 of g_i·f_(k−i)·(m·i − (k − i)).', 'That gives each f_k from the deg g before it; divide by k with a modular inverse.']),

  'fft-ntt': task('a, b', 'Return a list c where c[s] counts the pairs (i, j) with a[i] + b[j] = s, for s from 0 to max(a) + max(b) (an empty list if a or b is empty).', 'Up to 16 384 values in each list, each from 0 to 16 383. Every pair is 2.7 × 10⁸ steps; an NTT multiplies the two count polynomials in O(V log V).', [
    [[[1, 2], [0, 3]], [0, 1, 1, 0, 1, 1]],
    [[[0], [0]], [1]],
    [[[], [4]], []],
    [[[2, 2], [1]], [0, 0, 0, 2]],
    [[[0, 1, 2], [0, 1, 2]], [1, 2, 3, 2, 1]],
    [[range(16384), range(16384)], range(32767).map(s => Math.min(s, 32766 - s) + 1)],
  ], ['Count the values: A[v] = how many a[i] equal v, and the same for B. c is the product of the polynomials A and B.', 'Transform both with an NTT modulo 998 244 353, multiply pointwise, transform back.', 'Every count is below the modulus, so the residues are the exact counts.']),

  'sos': task('a', 'a has 2ⁿ values, one per mask. Return F with F[mask] = the sum of a[sub] over every submask sub of mask.', 'n ≤ 16. Listing every submask of every mask is 3ⁿ ≈ 4.3 × 10⁷ steps; one bit at a time is n · 2ⁿ.', [
    [[[1, 2, 3, 4]], [1, 3, 4, 10]],
    [[[5]], [5]],
    [[[1, 0, 0, 0, 0, 0, 0, 1]], [1, 1, 1, 1, 1, 1, 1, 2]],
    [[[0, 1, 1, 1]], [0, 1, 1, 3]],
    [[Array(65536).fill(1)], range(65536).map(m => 2 ** popcount(m))],
  ], ['Handle one bit at a time.', 'For bit i, every mask that has the bit adds in the mask without it: F[mask] += F[mask ^ (1 << i)].', 'After all n bits, every submask has been added exactly once.']),

  'mobius': task('F', 'F[mask] is the sum of a[sub] over every submask sub of mask, for 2ⁿ masks. Recover and return a.', 'n ≤ 16.', [
    [[[1, 3, 4, 10]], [1, 2, 3, 4]],
    [[[5]], [5]],
    [[[1, 2, 2, 4, 2, 4, 4, 8]], [1, 1, 1, 1, 1, 1, 1, 1]],
    [[[0, 1, 1, 3]], [0, 1, 1, 1]],
    [[range(65536).map(m => 2 ** popcount(m))], Array(65536).fill(1)],
  ], ['Undo the subset sum one bit at a time.', 'For bit i, every mask that has the bit subtracts the mask without it.', 'This is inclusion–exclusion: a(S) = Σ over T ⊆ S of (−1)^|S ∖ T| F(T).']),

  'subset-convolution': task('a, b', 'a and b have 2ⁿ values each. Return c with c[S] = the sum, over every submask T of S, of a[T] · b[S without T].', 'n ≤ 12, values from 0 to 10. Listing every split is 3ⁿ; the ranked transform is n² · 2ⁿ, which wins by far for larger n (n = 20: 3.5 × 10⁹ against 4 × 10⁸).', [
    [[[1, 1], [1, 1]], [1, 2]],
    [[[1, 2, 3, 4], [1, 0, 0, 0]], [1, 2, 3, 4]],
    [[[2], [3]], [6]],
    [[[1, 1, 1, 1], [0, 1, 1, 0]], [0, 1, 1, 2]],
    [[[1, 2, 0, 1], [3, 0, 1, 2]], [3, 6, 1, 7]],
    [[Array(4096).fill(1), Array(4096).fill(1)], range(4096).map(m => 2 ** popcount(m))],
  ], ['T and S ∖ T are disjoint and fill S exactly when their sizes add up to |S|.', 'Split a and b into layers by size, subset-sum transform each layer, and multiply layers whose sizes add up to r.', 'Undo the transform and keep, for each S, the layer r = |S|.']),

  'walsh-hadamard': task('a, b', 'a and b have 2ⁿ values each. Return c with c[k] = the sum of a[i] · b[j] over every pair with i XOR j = k.', 'n ≤ 14, values from 0 to 3. Every pair is 4ⁿ steps; the transform is n · 2ⁿ.', [
    [[[1, 2], [3, 1]], [5, 7]],
    [[[1], [2]], [2]],
    [[[1, 0, 0, 0], [0, 1, 2, 3]], [0, 1, 2, 3]],
    [[[1, 1, 1, 1], [1, 1, 1, 1]], [4, 4, 4, 4]],
    [[[0, 1, 0, 2], [3, 0, 1, 0]], [0, 5, 0, 7]],
    [[Array(16384).fill(1), Array(16384).fill(1)], Array(16384).fill(16384)],
  ], ['The Walsh–Hadamard transform turns XOR convolution into pointwise multiplication.', 'For each bit, replace each pair (x, y) of values whose masks differ in that bit by (x + y, x − y).', 'Transform a and b, multiply, transform again and divide by 2ⁿ.']),

  'semirings': task('k, edges, n', 'A directed graph has vertices 0 to k − 1 and weighted edges [u, v, w]. Return the cheapest walk of exactly n edges from vertex 0 to vertex k − 1, or −1 if there is none.', 'k ≤ 6, n ≤ 10⁹, weights from 0 to 1 000.', [
    [[2, [[0, 1, 5], [1, 1, 1]], 3], 7],
    [[2, [[0, 1, 4]], 2], -1],
    [[1, [], 0], 0],
    [[3, [[0, 1, 2], [1, 2, 2], [0, 2, 7], [2, 2, 1]], 3], 5],
    [[3, [[0, 0, 3], [0, 2, 9], [0, 1, 1], [1, 2, 1]], 4], 8],
    [[4, allPairs(4, (u, v) => Math.abs(u - v) + 1), 1e9], 1000000003],
  ], ['Counting walks multiplies matrices with + and ×. Cheapest walks use min in place of + and + in place of ×.', 'That (min, +) product is associative, so repeated squaring still works.', 'The identity has 0 on the diagonal and ∞ everywhere else.']),

  'transfer-matrix': task('w, n', 'Count the ways to tile a board w cells tall and n cells wide with 1 × 2 dominoes, modulo 1 000 000 007.', 'w ≤ 4, n ≤ 10¹⁵.', [
    [[2, 3], 3],
    [[3, 2], 3],
    [[1, 4], 1],
    [[4, 4], 36],
    [[3, 4], 11],
    [[2, 0], 1],
    [[2, 1e15], 133295545],
  ], ['Fill the board column by column. A column’s state is which of its cells are already covered by dominoes from the left: 2^w states.', 'T[s][s′] counts the ways to fill a column that starts as s and leaves s′ sticking into the next.', 'The tilings are Tⁿ[0][0], with Tⁿ by repeated squaring.']),
}

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

  // ── Optimizing split-point searches ──
  'monge': task('A', 'Return true if the matrix A is Monge: A[i][j] + A[k][l] ≤ A[i][l] + A[k][j] for every i < k and j < l. Otherwise return false.', 'Up to 300 × 300. Checking every pair of rows and every pair of columns is about 2 × 10⁹ tests; neighbouring rows and columns are enough.', [
    [[[[0, 1], [1, 0]]], true],
    [[[[2, 0], [0, 2]]], false],
    [[[[1, 3], [2, 2]]], true],
    [[[[4, 1, 7]]], true],
    [[[[0, 1, 4], [1, 0, 1], [4, 1, 0]]], true],
    [[[[0, 0, 0], [0, 0, 0], [0, 5, 0]]], false],
    [[range(300).map(i => range(300).map(j => (i - j) ** 2))], true],
    [[range(300).map(i => range(300).map(j => (i === 150 && j === 150 ? 5 : (i - j) ** 2)))], false],
  ], ['Any rectangle’s inequality is the sum of the 2 × 2 inequalities of the neighbouring cells inside it.', 'So test A[i][j] + A[i + 1][j + 1] ≤ A[i][j + 1] + A[i + 1][j] for every i and j.', 'A single row or column has no rectangles: it is Monge.']),

  'divide-conquer-opt': task('a, g', 'Cut a (non-negative numbers) into exactly g non-empty consecutive groups. A group costs the square of its sum. Return the smallest total cost.', 'Up to 3 000 numbers and 30 groups. Trying every cut for every end is 30 × 3 000² / 2 steps; the best cut moves right as the end does.', [
    [[[1, 2, 3, 4], 2], 52],
    [[[5], 1], 25],
    [[[1, 1, 1, 1], 4], 4],
    [[[3, 1, 4, 1, 5], 3], 66],
    [[[2, 2, 2, 2, 2, 2], 3], 48],
    [[Array(3000).fill(1), 30], 300000],
  ], ['D(layer, j) = min over k < j of D(layer − 1, k) + (P[j] − P[k])², with prefix sums P.', 'Compute the middle j first by trying every k; its best k bounds the left half from above and the right half from below.', 'Recurse on both halves with those bounds: O(n log n) per layer.']),

  'knuth': task('piles', 'Merge neighbouring piles two at a time until one pile is left. Each merge costs the size of the pile it makes. Return the smallest total cost.', 'Up to 1 024 piles. The interval DP tries every split of every interval, n³ / 6 steps; Knuth’s bounds cut that to n².', [
    [[[1, 2, 3]], 9],
    [[[2, 2, 2]], 10],
    [[[]], 0],
    [[[7]], 0],
    [[[4, 1, 1, 4]], 18],
    [[[3, 1, 4, 1, 5, 9]], 55],
    [[Array(1024).fill(1)], 10240],
  ], ['D(i, j) = size(i … j) + min over i ≤ k < j of D(i, k) + D(k + 1, j).', 'Keep opt(i, j), the best k. It lies between opt(i, j − 1) and opt(i + 1, j).', 'Fill by interval length and scan only k in that range.']),

  'smawk': task('x, y, w', 'Houses stand at sorted positions x, wells at sorted positions y. Using well j costs w[j] plus the squared distance. Each house uses its cheapest well; return the total of those costs.', 'Up to 40 000 houses and 20 000 wells: comparing every house with every well is 8 × 10⁸ steps. The cost matrix is Monge, so its row minima can be found in O(houses + wells) by SMAWK, or in O((houses + wells) log) by divide and conquer.', [
    [[[0, 3, 7], [1, 5], [0, 0]], 9],
    [[[0, 10], [0, 10], [5, 0]], 5],
    [[[], [2], [1]], 0],
    [[[4], [0, 3, 9], [10, 2, 0]], 3],
    [[[1, 2, 3, 4], [0, 4], [3, 1]], 12],
    [[range(40000), range(20000).map(i => 2 * i), Array(20000).fill(0)], 20000],
  ], ['f(i, j) = w[j] + (x[i] − y[j])² is Monge because x and y are sorted, so the best well never moves left as the house moves right.', 'SMAWK: drop columns that can’t be any row’s minimum (at most one per row survives), solve the odd rows recursively, then fill each even row between its neighbours’ minima.', 'Only the minimum values are summed, so which of two tied wells is chosen doesn’t matter.']),

  'cht': task('words, M', 'Print the words in order, breaking them into lines. A line whose word lengths add up to S costs S² + M. Return the smallest total cost.', 'Up to 20 000 words of length 1 to 5 (total at most 50 000), M ≤ 10 000. Trying every start for every line is 2 × 10⁸ steps.', [
    [[[3, 1, 2], 4], 26],
    [[[5], 0], 25],
    [[[], 7], 0],
    [[[1, 1, 1, 1], 1], 8],
    [[[2, 3, 1, 2, 2], 10], 66],
    [[Array(20000).fill(1), 100], 400000],
  ], ['D(i) = min over j < i of D(j) + (P[i] − P[j])² + M; expand the square.', 'For each j that is the line y = −2P[j]·x + D(j) + P[j]², queried at x = P[i], plus P[i]² + M.', 'Slopes only fall, so keep the lower hull in a list and binary-search each query.']),

  'monotone-cht': task('x, a, b, c', 'Split the soldiers into consecutive groups. A group whose strengths add up to S is worth a·S² + b·S + c (a < 0). Return the largest total worth.', 'Up to 20 000 soldiers with strengths 1 to 5 (total at most 20 000), −5 ≤ a ≤ −1, |b| ≤ 10 000, |c| ≤ 10 000.', [
    [[[2, 2, 3, 4], -1, 10, -20], 9],
    [[[1], -1, 0, 0], -1],
    [[[], -1, 1, 1], 0],
    [[[1, 1, 1], -2, 3, 1], 6],
    [[[5, 1, 2, 4], -1, 5, 2], 22],
    [[Array(20000).fill(1), -1, 10, -20], 20000],
  ], ['D(i) = a·P[i]² + b·P[i] + c + max over j of (−2a·P[j])·P[i] + D(j) + a·P[j]² − b·P[j].', 'Slopes −2a·P[j] rise and the queries P[i] rise: keep an upper hull and a pointer to its best line.', 'Move the pointer forward while the next line is at least as good; it never needs to go back.']),

  'li-chao': task('h, C', 'Stones stand in a row with heights h (any order). A frog starts on the first and must reach the last, jumping forward; a jump from i to j costs (h[j] − h[i])² + C. Return the smallest total cost.', 'Up to 30 000 stones with heights 0 to 10⁶, C ≤ 10¹². Heights are not sorted, so lines arrive and are queried in any order.', [
    [[[1, 5, 2], 0], 1],
    [[[10, 0, 10], 3], 3],
    [[[7], 5], 0],
    [[[0, 6, 3, 9], 10], 65],
    [[[5, 1, 9, 2, 8], 4], 13],
    [[range(30000).map(i => (i * 7919) % 1000000), 1e12], 1315935050561],
  ], ['D(i) = h[i]² + C + min over j < i of (−2h[j])·h[i] + D(j) + h[j]².', 'A Li Chao tree over heights 0 … 10⁶ keeps, in each node, the line lowest at the node’s middle.', 'Insert a line by keeping the winner at the middle and sending the loser to the one side where it can still win.']),

  'cht-numeric': task('h, C', 'The frog problem with strictly increasing heights up to 10⁹ and C up to 10¹⁸: a jump from i to j costs (h[j] − h[i])² + C. Return the smallest total cost as a decimal string.', 'Up to 100 001 stones. Costs pass 2⁵³, where JavaScript numbers stop being exact: use BigInt (Python integers are exact already).', [
    [[[0, 1000000000], 0], '1000000000000000000'],
    [[[0, 1, 2], 1], '4'],
    [[[5], 9], '0'],
    [[[0, 3, 4, 10], 2], '52'],
    [[[0, 400000000, 1000000000], 100000000000000000], '720000000000000000'],
    [[range(100001).map(i => 10000 * i), 1e16], '200000000000000000'],
  ], ['The monotone hull: slopes −2h[j] fall and queries h[i] rise.', 'Every product and comparison is exact in integers: compare intersections by cross-multiplying, never by dividing.', 'In JavaScript, turn the heights and C into BigInt first and keep everything BigInt.']),

  'lagrangian': task('a, k', 'Choose exactly k non-empty, non-overlapping subarrays of a. Return the largest possible total of the chosen elements.', 'Up to 40 000 numbers between −10 000 and 10 000; k ≤ the length of a. A table by segment count is n × k: 8 × 10⁸ cells.', [
    [[[1, -1, 1], 2], 2],
    [[[3, -1, 4], 1], 6],
    [[[], 0], 0],
    [[[2, 3], 2], 5],
    [[[5, -2, 3, -8, 4], 2], 10],
    [[[-1, -2], 2], -3],
    [[[0, 0], 1], 0],
    [[range(40000).map(i => (i % 2 ? -1 : 1)), 20000], 20000],
  ], ['Drop the count: charge λ per segment and solve in O(n), keeping the segment count of the best (fewer on ties).', 'A larger λ never gives more segments. Binary-search the smallest λ whose best uses at most k.', 'The best total for exactly k is then the penalized best plus λ·k.']),

  'slope-trick': task('a', 'Change the values of a so that it never decreases. Changing a value by d costs |d|. Return the smallest total cost.', 'Up to 100 000 values.', [
    [[[3, 1, 2]], 2],
    [[[1, 2, 3]], 0],
    [[[]], 0],
    [[[5, 4, 3, 2, 1]], 6],
    [[[2, 5, 1, 4]], 4],
    [[range(100000).map(i => 100000 - i)], 2500000000],
  ], ['The cost as a function of the last value is convex and piecewise linear: keep its breakpoints in a max-heap.', 'Push each value. If the largest breakpoint is above it, pay the difference, pop that breakpoint and push the value again.', 'The answer is the total paid.']),

  'cdq': task('x, y', 'Points arrive in order. Return the length of the longest chain of points, in arrival order, whose x and y both strictly increase.', 'Up to 8 000 points. Checking every earlier point for every point is n² / 2 steps.', [
    [[[1, 3, 2], [1, 3, 2]], 2],
    [[[3, 2, 1], [1, 2, 3]], 1],
    [[[], []], 0],
    [[[1, 1], [1, 2]], 1],
    [[[1, 2, 3, 4], [4, 1, 2, 3]], 3],
    [[range(8000).map(i => i % 100), range(8000).map(i => i % 100)], 100],
  ], ['best(i) = 1 + the largest best(j) over earlier j with smaller x and smaller y.', 'Split the arrival order in half. Solve the left half fully, then pass its values to the right half with a sweep by x and a Fenwick tree of maxima by y.', 'Clear the tree, then solve the right half; every earlier point reaches every later one at exactly one split.']),

  'online-convolution': task('b, n', 'a[0] = 1, and a[m] = a[0]·b[m] + a[1]·b[m − 1] + … + a[m − 1]·b[1] (b[d] = 0 past the end of b). Return a[n] modulo 998 244 353.', 'n ≤ 2 000 and values of b ≤ 1 000. Solve it by divide and conquer over m, sending each finished half’s terms across the middle; with an FFT at each merge this order is what makes it fast.', [
    [[[0, 1, 1], 4], 5],
    [[[0, 1, 1], 0], 1],
    [[[0, 2], 3], 8],
    [[[0, 1, 1, 1], 5], 13],
    [[[0, 0, 3], 4], 9],
    [[Array(2001).fill(1), 2000], 853604529],
  ], ['a[m] needs every earlier a, so the whole sequence can’t be one convolution.', 'Solve a[lo … mid) first, then add a[i]·b[t − i] to every t in [mid, hi), then solve a[mid … hi).', 'Each pair i < t is added once, at the one split where i is on the left and t on the right.']),
  ...ALGEBRA_CHALLENGES,
}
