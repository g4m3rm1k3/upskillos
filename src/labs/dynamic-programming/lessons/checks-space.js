// "Check yourself" for the state-and-transition-reduction lessons (Expert, space-speed group). Format and
// checks: checks.js and checks.test.js; the numbers come from expert-oracles.js. hirschberg's answer is a
// string, so its number check asks for the length (oracle hirschberg-length).

export const SPACE_CHECKS = {
  'rolling-arrays': [
    {
      know: 'One row is enough: row[c] += row[c − 1], with a blocked cell set to 0, scanning each grid row left to right.',
      ask: 'A 3 × 4 grid whose cell in row 1, column 2 is blocked. How many right/down paths avoid it?',
      args: [[[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]]], answer: 4,
      misconceptions: [
        { answer: 10, feedback: '10 is the open 3 × 4 grid. Paths through the blocked cell are lost.' },
        { answer: 6, feedback: '6 is the number of paths through the blocked cell; the answer is what is left.' },
      ],
      explain: 'The open grid has 10 paths. 3 reach the blocked cell and 2 continue from it, so 3 × 2 = 6 are lost.',
    },
    {
      know: 'A rolled table keeps only the latest row: O(columns) memory instead of O(rows × columns).',
      ask: 'What does rolling the rows give up?',
      options: [
        { text: 'The earlier rows, so a path can’t be traced back afterwards without extra work', right: true, why: 'Walking back reads cells of earlier rows, and those have been overwritten.' },
        { text: 'Correctness when the grid has blocks', why: 'A block just sets row[c] to 0; the counts are the same as the full table’s.' },
        { text: 'Speed: each cell now takes longer', why: 'Each cell is still one addition; only the memory changes.' },
      ],
    },
    {
      know: 'Updating in place, the left neighbour row[c − 1] has already been overwritten with the current row’s value.',
      ask: 'If each cell also read its diagonal neighbour (r − 1, c − 1), what would one row need?',
      options: [
        { text: 'One extra variable holding the old row[c − 1] before it is overwritten', right: true, why: 'The diagonal is the old value of the left neighbour; saving it just before the write keeps it.' },
        { text: 'Nothing extra: row[c − 1] is the diagonal', why: 'row[c − 1] has already been overwritten with the current row’s value: the left cell, not the diagonal.' },
        { text: 'The whole table: diagonals can’t be rolled', why: 'Only one old value is lost per step, so one saved variable is enough.' },
      ],
    },
  ],

  'in-place': [
    {
      know: 'Once-only items scan capacity downward, so best[c − w] has not yet been updated for the item.',
      ask: 'Items (weight 3, value 5) and (weight 2, value 3), each once only. Capacity 6. What is the best value?',
      args: [[[3, 5, 0], [2, 3, 0]], 6], answer: 8,
      misconceptions: [
        { answer: 10, feedback: '10 takes the first item twice: what an upward scan would do.' },
        { answer: 5, feedback: '5 takes only the more valuable item, but both fit together.' },
      ],
      explain: 'Both fit: 3 + 2 = 5 ≤ 6, worth 5 + 3 = 8.',
    },
    {
      know: 'An unlimited item scans capacity upward, so best[c − w] may already contain copies of it.',
      ask: 'Why does the upward scan allow repeats?',
      options: [
        { text: 'best[c − w] is updated before best[c] reads it, so it may already contain this item', right: true, why: 'Adding the item to a value that already has it is one more copy.' },
        { text: 'Because the item’s value is added twice in each update', why: 'Each update adds the value once; repeats come from reading a cell that was already updated.' },
        { text: 'Because an upward scan visits each capacity twice', why: 'Either direction visits each capacity once; only the order differs.' },
      ],
    },
    {
      know: 'One array of size cap + 1 replaces the (items + 1) × (cap + 1) table.',
      ask: 'With 1 000 items and capacity 100 000, about how many numbers does the one array keep?',
      options: [
        { text: 'About 100 000', right: true, why: 'One entry per capacity, reused by every item in turn.' },
        { text: 'About 100 000 000', why: 'That is the full table, items × capacity, which the in-place update avoids.' },
        { text: 'About 1 000', why: 'The array is indexed by capacity, not by item.' },
      ],
    },
  ],

  'hirschberg': [
    {
      know: 'Hirschberg cuts a in half, finds the column of b where an optimal alignment crosses, and solves both halves.',
      ask: '"abab" and "baba": how many letters are in a longest common subsequence?',
      args: ['abab', 'baba'], answer: 3, oracle: 'hirschberg-length',
      misconceptions: [
        { answer: 4, feedback: '4 would need one string inside the other, and "abab" is not a subsequence of "baba".' },
        { answer: 2, feedback: '2 is "ab" or "ba"; three letters, "aba" or "bab", fit in both.' },
      ],
      explain: '"aba" and "bab" both fit in both strings; "aba" is first in dictionary order.',
    },
    {
      know: 'Each level of the recursion does two passes, and the two halves below it cover half the area of the level.',
      ask: 'How much time does Hirschberg take for strings of lengths m and n?',
      options: [
        { text: 'O(mn): about twice the plain table’s work', right: true, why: 'The levels’ work is mn, then mn/2, then mn/4, …: a geometric series below 2mn.' },
        { text: 'O(mn log m)', why: 'The halves shrink, so each level’s work halves; it doesn’t add up to a log factor.' },
        { text: 'O(m + n)', why: 'The top level alone compares every pair of positions: mn work.' },
      ],
    },
    {
      know: 'The forward pass gives F[j] for a’s first half; the backward pass gives G[j] for its second half against b[j:].',
      ask: 'Why does the largest F[j] + G[j] equal the whole LCS length?',
      options: [
        { text: 'Any common subsequence divides at a’s middle into a part in b[:j] and a part in b[j:] for some j', right: true, why: 'Letters matched with a’s first half all come before those matched with its second, so some cut of b separates them.' },
        { text: 'Because F and G are equal', why: 'They are LCS lengths of different pieces, and they usually differ.' },
        { text: 'Because the best j is always the middle of b', why: 'The best cut can be anywhere: for "ab" and "xxab" it is after "xxa".' },
      ],
    },
  ],

  'prefix-sum-dp': [
    {
      know: 'W(i) = P(i − 1) − P(i − k − 1): the ways for the k stairs below, read as a difference of running totals.',
      ask: '6 stairs, steps of 1 to 4 (order matters). How many ways are there?',
      args: [6, 4], answer: 29,
      misconceptions: [
        { answer: 32, feedback: '32 = 2⁵ allows steps of every size, ignoring k = 4.' },
        { answer: 24, feedback: '24 allows steps up to 3 only: the window is one stair short.' },
      ],
      explain: 'W = 1, 1, 2, 4, 8, 15, 29: from stair 4 on, each is the sum of the four before it.',
    },
    {
      know: 'Each W(i) costs one subtraction of running totals and one addition, instead of k additions.',
      ask: 'For n = k = 100 000, about how many additions does each method need?',
      options: [
        { text: 'Plain: about 5 × 10⁹. With prefix sums: about 2 × 10⁵', right: true, why: 'Plain adds up to i values for stair i, about n²/2 when k = n; prefix sums do two operations per stair.' },
        { text: 'Both about 10⁵', why: 'Without prefix sums, each stair adds up to k earlier values, not one.' },
        { text: 'Plain: about 10⁵. With prefix sums: about 10⁵ ÷ k', why: 'Every stair needs its own value, so any method takes at least n steps.' },
      ],
    },
    {
      know: 'Counts are kept modulo M = 1 000 000 007, so a reduced P(i − 1) can be smaller than a reduced P(i − k − 1).',
      ask: 'How is W(i) kept right under the modulus?',
      options: [
        { text: 'Compute (P(i − 1) − P(i − k − 1) + M) mod M', right: true, why: 'The true difference is never negative; adding M before reducing brings a negative remainder back to it.' },
        { text: 'Take the absolute value of the difference', why: 'A reduced difference that went negative stands for that value plus M, not its absolute value.' },
        { text: 'Reduce W but never P', why: 'P grows exponentially; JavaScript numbers lose exactness above 2⁵³, and Python slows to a crawl.' },
      ],
    },
  ],

  'difference-dp': [
    {
      know: 'Each child adds a range of the previous row: W(i + 1, t) = W(i, t − limit) + … + W(i, t).',
      ask: 'Three children, each limited to 1 candy. How many ways give out exactly 2?',
      args: [[1, 1, 1], 2], answer: 3,
      misconceptions: [
        { answer: 6, feedback: '6 ignores the limits: giving 2 to one child is not allowed.' },
      ],
      explain: 'Choose which 2 of the 3 children get a candy: 3 ways.',
    },
    {
      know: 'A difference array D marks +x at a range’s start and −x just after its end; the prefix sums of D spread x over the range.',
      ask: 'The old row is W = 1, 1, 0 for totals 0 to 2. The next child’s limit is 2. Which D gives the new row for totals 0 to 4?',
      options: [
        { text: 'D = 1, 1, 0, −1, −1', right: true, why: 'Old W(0) = 1 adds at 0 and removes at 3; old W(1) = 1 adds at 1 and removes at 4. Prefix sums: 1, 2, 2, 1, 0.' },
        { text: 'D = 1, 1, −1, −1, 0', why: 'That removes at t + 2, one early: prefix sums 1, 2, 1, 0, 0, as if the limit were 1.' },
        { text: 'D = 1, 2, 2, 1, 0', why: 'That is the new row itself, the prefix sums of D, not D.' },
      ],
    },
    {
      know: 'With a total of T, the plain range sums cost up to T × (limit + 1) additions per child.',
      ask: 'What does the difference array cost per child?',
      options: [
        { text: 'O(T): two marks per old value and one prefix sum', right: true, why: 'Each old value is marked twice, and one pass of prefix sums builds the whole new row.' },
        { text: 'O(T × limit), the same as before', why: 'The marks replace the limit + 1 additions per cell with two marks per old value.' },
        { text: 'O(limit)', why: 'Every total from 0 to T gets a new value, so it takes at least T steps.' },
      ],
    },
  ],

  'monotone-queue': [
    {
      know: 'B(i) = a[i] + the best B among the last k squares, which the deque keeps at its front.',
      ask: 'Squares 3, −2, −2, −2, 5, jumps of 1 or 2. What is the best sum, first and last included?',
      args: [[3, -2, -2, -2, 5], 2], answer: 6,
      misconceptions: [
        { answer: 8, feedback: '8 jumps from 3 straight to 5, a jump of 4.' },
        { answer: 4, feedback: '4 lands on two of the −2s. One is enough: 3, −2, 5.' },
      ],
      explain: '3 → the middle −2 → 5: two jumps of 2.',
    },
    {
      know: 'Each index is pushed onto the deque once and popped at most once.',
      ask: 'What does the whole scan cost for n squares and windows of k?',
      options: [
        { text: 'O(n), whatever k is', right: true, why: 'n pushes and at most n pops in all, and the front is each window’s maximum.' },
        { text: 'O(nk)', why: 'That is scanning every window, which the deque avoids.' },
        { text: 'O(n log k)', why: 'That is a heap or balanced tree; the deque needs no ordering work beyond its pops.' },
      ],
    },
    {
      know: 'Before pushing i, every index at the back with B no larger than B(i) is popped.',
      ask: 'Why may those indices be thrown away for good?',
      options: [
        { text: 'i is newer and at least as good, so it is in every later window they would be in', right: true, why: 'An older, worse index can’t be a window’s maximum while i is there, and i leaves the window after it.' },
        { text: 'Because they are already outside the window', why: 'They may still be inside the window; they are dropped for being worse, not for being old.' },
        { text: 'Because the deque has room for only k indices', why: 'The deque often holds fewer than k indices; its size is not fixed.' },
      ],
    },
  ],

  'fenwick-dp': [
    {
      know: 'E(i) = 1 + the sum of E(j) over earlier j with a smaller value; an equal value doesn’t extend.',
      ask: 'Values 1, 2, 2. How many strictly increasing subsequences are there, counted by positions?',
      args: [[1, 2, 2]], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 also counts 2 2 and 1 2 2, but equal values aren’t strictly increasing.' },
        { answer: 3, feedback: '3 counts distinct value lists (1, 2, 1 2). By positions, the two 2s count separately.' },
      ],
      explain: '1, the first 2, the second 2, and 1 before each 2.',
    },
    {
      know: 'A Fenwick tree over m ranks answers a prefix sum and adds at a rank, each in O(log m).',
      ask: 'What does counting take for n values?',
      options: [
        { text: 'O(n log n): a sort for the ranks, then one query and one update per value', right: true, why: 'Sorting is n log n, and each of the n positions does two tree operations of log n.' },
        { text: 'O(n²)', why: 'That is summing over every earlier value, which the tree’s prefix sum replaces.' },
        { text: 'O(n)', why: 'The ranks need a sort, and each tree operation costs O(log n).' },
      ],
    },
    {
      know: 'Values are replaced by their ranks among the distinct values before they index the tree.',
      ask: 'Why do equal values get the same rank?',
      options: [
        { text: 'So the query “ranks below a[i]” leaves out every equal value', right: true, why: 'Strictly increasing means an equal value can’t come just before; a shared rank keeps it out of the prefix.' },
        { text: 'Only to make the tree smaller', why: 'Size is a side effect; with different ranks for equal values, the strict comparison breaks.' },
        { text: 'Because a Fenwick tree can’t add twice at one position', why: 'A Fenwick tree adds into a position as often as needed.' },
      ],
    },
  ],

  'segment-tree-dp': [
    {
      know: 'L(i) = 1 + the best L at an earlier value within d of a[i]; a segment tree answers that range maximum.',
      ask: 'Values 5, 1, 4, 2, 3 and d = 1. How long is the longest valid subsequence?',
      args: [[5, 1, 4, 2, 3], 1], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 is the longest run of neighbouring positions (2, 3); a subsequence may skip positions.' },
        { answer: 5, feedback: '5 takes every value, but 5 and 1 differ by 4.' },
      ],
      explain: '5, 4, 3 or 1, 2, 3: three values either way.',
    },
    {
      know: 'Values up to 10⁹ are compressed to ranks, and [a[i] − d, a[i] + d] becomes a range of ranks.',
      ask: 'How are the ends of that range of ranks found?',
      options: [
        { text: 'Binary search in the sorted distinct values for a[i] − d and a[i] + d', right: true, why: 'The sorted list is in value order, so the ranks inside the value range form one block.' },
        { text: 'rank(a[i]) − d to rank(a[i]) + d', why: 'd is a difference of values; neighbouring ranks can be far apart or very close in value.' },
        { text: 'Positions i − d to i − 1', why: 'd limits the values, not how far back the previous position is.' },
      ],
    },
    {
      know: 'A Fenwick tree answers prefix queries; here the query is a range [lo, hi], and it asks for a maximum.',
      ask: 'Why use a segment tree instead of a Fenwick tree here?',
      options: [
        { text: 'A maximum can’t be undone like a sum, so a range is not one prefix minus another', right: true, why: 'A range sum is prefix(hi) − prefix(lo − 1); a maximum has no such subtraction.' },
        { text: 'A Fenwick tree can’t store maxima at all', why: 'It can keep prefix maxima; what it can’t do is take one prefix away from another.' },
        { text: 'A segment tree is always faster', why: 'Both are O(log n) per operation, and a Fenwick tree is usually a little faster.' },
      ],
    },
  ],

  'coordinate-compression': [
    {
      know: 'S(i) = a[i] + the best S at a smaller rank before i; the answer is the largest S.',
      ask: 'Values 8, 1, 9, 2, 3. What is the largest sum of a strictly increasing subsequence?',
      args: [[8, 1, 9, 2, 3]], answer: 17,
      misconceptions: [
        { answer: 6, feedback: '6 is the longest increasing subsequence, 1, 2, 3. A shorter one with larger values wins.' },
        { answer: 23, feedback: '23 adds every value, but 9 then 2 is not increasing.' },
      ],
      explain: '8 then 9: 17. The longest, 1, 2, 3, only makes 6.',
    },
    {
      know: 'Compression replaces each value by its rank among the distinct values, keeping their order.',
      ask: 'What does compression keep, and what does it lose?',
      options: [
        { text: 'It keeps every smaller, equal and larger; it loses the gaps between values', right: true, why: 'Ranks are in value order, so comparisons are unchanged; ranks 1 and 2 may stand for 1 and 10⁹.' },
        { text: 'It keeps the gaps between values too', why: 'Ranks are consecutive whatever the values are, so the sum must add the real values.' },
        { text: 'It loses the comparisons, so values must be decompressed to compare', why: 'Comparing two ranks gives the same answer as comparing their values.' },
      ],
    },
    {
      know: 'The tree has one slot per distinct value, after one sort of the n values.',
      ask: 'With 100 000 values up to 10⁹, how many slots does the tree need?',
      options: [
        { text: 'At most 100 000', right: true, why: 'One slot per distinct value, and there are at most n distinct values.' },
        { text: '10⁹', why: 'That is indexing by value, which compression exists to avoid.' },
        { text: 'About 30, since log₂ 10⁹ ≈ 30', why: 'That is the depth of a tree over 10⁹ values, not the number of slots.' },
      ],
    },
  ],

  'pareto-frontiers': [
    {
      know: 'After each item the list keeps only pairs that no lighter pair matches in value: the Pareto frontier.',
      ask: 'Items (weight 3, value 4), (4, 5) and (5, 6). Capacity 8. What is the best value?',
      args: [[3, 4, 5], [4, 5, 6], 8], answer: 10,
      misconceptions: [
        { answer: 9, feedback: '9 takes the best value per weight first, 3 then 4, and leaves 1 unused.' },
        { answer: 15, feedback: '15 takes all three, weighing 12.' },
      ],
      explain: 'Weights 3 + 5 = 8 fill the capacity, worth 4 + 6 = 10.',
    },
    {
      know: 'A pair (w, v) is dominated when another pair weighs no more and is worth at least as much.',
      ask: 'Pairs (2, 5), (3, 4) and (4, 9). Which survive pruning?',
      options: [
        { text: '(2, 5) and (4, 9)', right: true, why: '(3, 4) weighs more than (2, 5) and is worth less, so it is never the better choice.' },
        { text: 'Only (4, 9)', why: '(2, 5) is lighter, so it fits where (4, 9) may not; it must stay.' },
        { text: 'All three', why: '(3, 4) is beaten by (2, 5) at every capacity where it fits.' },
      ],
    },
    {
      know: 'With n items there are 2ⁿ choices; pruning keeps only those no other choice dominates.',
      ask: 'How large can the frontier get after n items?',
      options: [
        { text: '2ⁿ pairs, when every choice has its own weight and heavier always means more valuable', right: true, why: 'Then nothing is dominated: weights and values 1, 2, 4, … give every sum, as in the challenge’s largest case.' },
        { text: 'n pairs', why: 'Choices combine items, so there can be far more than one per item.' },
        { text: 'Capacity + 1 pairs', why: 'That bounds a table, but with capacity 10⁹ it is no limit; the real bound is the 2ⁿ choices.' },
      ],
    },
  ],

  'bitset-dp': [
    {
      know: 'B |= B << v adds v to every reachable total at once, keeping the old totals.',
      ask: 'Values 3, 3, 3, each used at most once. How many different totals can be made, 0 included?',
      args: [[3, 3, 3]], answer: 4,
      misconceptions: [
        { answer: 8, feedback: '8 counts the subsets; equal values make the same totals.' },
        { answer: 3, feedback: '3 forgets total 0, the empty choice.' },
      ],
      explain: '0, 3, 6 and 9: no, one, two or all three of the 3s.',
    },
    {
      know: 'A machine word holds 64 bits, so one shift-and-or updates 64 totals at once.',
      ask: 'With 20 values and totals up to 2 000 000, about how many word operations does the bitset do?',
      options: [
        { text: 'About 20 × 2 000 000 ÷ 64: under a million', right: true, why: 'Each value shifts the whole bitset, about 31 000 words, and there are 20 values.' },
        { text: 'About 2²⁰', why: 'That is listing the subsets, which the bitset never does.' },
        { text: 'About 20 × 2 000 000', why: 'That is one step per total per value: the plain boolean table, 64 times slower.' },
      ],
    },
    {
      know: 'B << v reads the B from before the value, and the or puts the old totals back.',
      ask: 'Why is each value used at most once?',
      options: [
        { text: 'The shift is of the old B, so totals made with v this round aren’t shifted again', right: true, why: 'Every new total is an old total plus v once; no total gets v twice.' },
        { text: 'Because or ignores duplicates', why: 'Or only merges two sets of totals; reuse would come from shifting a total that already contains v.' },
        { text: 'Because the values are sorted first', why: 'The order doesn’t matter; each value is applied once to the whole set.' },
      ],
    },
  ],

  'bounded-binary': [
    {
      know: 'More copies than cap ÷ weight never fit; the rest of the count is split into bundles 1, 2, 4, … and a remainder.',
      ask: 'One item of weight 3 and value 4, at most 2 copies. Capacity 10. What is the best value?',
      args: [[3], [4], [2], 10], answer: 8,
      misconceptions: [
        { answer: 12, feedback: '12 takes 3 copies, which fit the capacity but exceed the count.' },
      ],
      explain: 'Both copies weigh 6 and are worth 8.',
    },
    {
      know: 'Bundles 1, 2, 4, … while they fit in the count, then the remainder, make every count from 0 to the limit.',
      ask: 'What are the bundles for a count of 13?',
      options: [
        { text: '1, 2, 4 and 6', right: true, why: '1 + 2 + 4 = 7 leaves a remainder of 6, and every count from 0 to 13 is a sum of some of them.' },
        { text: '1, 2, 4 and 8', why: 'Those add up to 15, so 14 or 15 copies, more than exist, could be taken.' },
        { text: '1, 4 and 8', why: 'Without the 2, a count of 2 can’t be made.' },
      ],
    },
    {
      know: 'A count c becomes about log₂ c bundles, each one a 0/1 item.',
      ask: 'Capacity 100 000 and a count of 10⁹, for an item of weight 1. How many bundles are needed?',
      options: [
        { text: '17, after capping the count at 100 000', right: true, why: '1, 2, …, 32 768 add up to 65 535, and one remainder of 34 465 completes 100 000.' },
        { text: '30, one per bit of 10⁹', why: 'Copies beyond the capacity can’t fit, so the count is capped first and fewer bundles are needed.' },
        { text: '100 000, one per copy', why: 'That is the plain bounded knapsack; bundles make it logarithmic.' },
      ],
    },
  ],

  'bounded-queue': [
    {
      know: 'W(i + 1, t) adds W(i, t − q·w) for q = 0 … count: a window along t’s residue mod w.',
      ask: 'Weights 1 (up to 3 copies) and 3 (up to 1 copy). How many ways weigh exactly 4?',
      args: [[1, 3], [3, 1], 4], answer: 1,
      misconceptions: [
        { answer: 2, feedback: '2 also counts four copies of weight 1, but only 3 exist.' },
      ],
      explain: 'One of each, 1 + 3. Four 1s would need a fourth copy.',
    },
    {
      know: 'Totals t, t − w, t − 2w, … all leave the same remainder r = t mod w.',
      ask: 'For weight 3 and target 7, which totals are on the same chain as 7?',
      options: [
        { text: '1, 4 and 7', right: true, why: 'Each leaves remainder 1 when divided by 3, and each is 3 from the next.' },
        { text: '5, 6 and 7', why: 'Neighbouring totals differ by 1, not by the weight 3.' },
        { text: '0, 3 and 6', why: 'Those leave remainder 0; 7 leaves remainder 1.' },
      ],
    },
    {
      know: 'Each residue’s chain is scanned once with a running window sum.',
      ask: 'What does one item cost, for target T?',
      options: [
        { text: 'O(T), whatever its count', right: true, why: 'Every total is on exactly one chain, added to the window once and subtracted once.' },
        { text: 'O(T × count)', why: 'That is adding every term, which the sliding window avoids.' },
        { text: 'O(T log count)', why: 'That is splitting the count into bundles; the window needs no log factor.' },
      ],
    },
  ],

  'symmetry': [
    {
      know: 'Loads are kept sorted, and the next job tries each distinct load once.',
      ask: 'Jobs 3, 3, 2, 2, 2 on two identical machines. What is the smallest possible largest load?',
      args: [[3, 3, 2, 2, 2], 2], answer: 6,
      misconceptions: [
        { answer: 7, feedback: '7 puts each job, in order, on the lighter machine: 3 | 3, 5 | 3, 5 | 5, 7 | 5.' },
      ],
      explain: '3 + 3 on one machine, 2 + 2 + 2 on the other.',
    },
    {
      know: 'Machines are interchangeable: permuting their loads gives a state with the same future.',
      ask: 'Loads (5, 2, 2) and the next job takes 3. How many different moves does the reduced search try?',
      options: [
        { text: '2: onto the 5, or onto a 2', right: true, why: 'Putting it on either 2 gives the same sorted loads (5, 5, 2), so one try covers both.' },
        { text: '3: one per machine', why: 'Two of those moves give the same sorted state, so one of them is skipped.' },
        { text: '1: the lightest machine', why: 'That is the greedy rule, which can miss the best assignment.' },
      ],
    },
    {
      know: 'States are memoized by their sorted loads, which merges every relabelling of the machines.',
      ask: 'By how much can merging relabellings shrink the states, with k machines?',
      options: [
        { text: 'Up to k! times: every ordering of k different loads is one state', right: true, why: 'k different loads can be arranged in k! ways, all with the same sorted list.' },
        { text: 'Up to k times', why: 'The machines can be relabelled in k! ways, not just k.' },
        { text: 'Not at all, when the loads differ', why: 'Different loads in different orders still sort to one list.' },
      ],
    },
  ],
}
