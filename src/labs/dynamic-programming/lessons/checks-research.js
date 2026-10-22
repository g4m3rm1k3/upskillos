// "Check yourself" for the modelling-and-limits lessons (Specialist, research-tools group). Format and
// checks: checks.js and checks.test.js; the numbers come from specialist-oracles.js (multiobjective through
// the count of its front, 'pareto-count' in checks.test.js; proof-checklist through one part of its pair).

export const RESEARCH_CHECKS = {
  'pseudo-polynomial': [
    {
      know: 'L(t) is the lightest set worth exactly t; the answer is the largest t whose lightest set fits.',
      ask: 'Weights 6, 5, 4 and 3 hundred million, values 9, 7, 6, 4, capacity one thousand million. The best total value?',
      args: [[600000000, 500000000, 400000000, 300000000], [9, 7, 6, 4], 1000000000], answer: 15,
      misconceptions: [{ answer: 16, feedback: '16 takes the 9 and the 7, weighing 1.1 thousand million: too heavy. The 9 with the 6 weighs exactly 1 thousand million: 15.' }],
      explain: 'Weights 600 and 400 million fill the capacity exactly, worth 9 + 6 = 15; every other set that fits is worth less.',
    },
    {
      know: 'The input holds the numbers in binary: W takes about log W digits.',
      ask: 'Why is a table of W + 1 capacities called pseudo-polynomial?',
      options: [
        { text: 'Its size grows with the value of W, which is exponential in the number of digits used to write W', right: true, why: 'Polynomial in the numbers, not in the length of the input.' },
        { text: 'Because it only approximates the answer', why: 'The capacity table is exact; the name is about how its cost grows.' },
        { text: 'Because it uses floating point', why: 'It uses whole numbers; the name is about the table’s size.' },
      ],
    },
    {
      know: 'The value-indexed table has a column for every total value.',
      ask: 'When is indexing by value the better choice?',
      options: [
        { text: 'When the total of the values is much smaller than the capacity', right: true, why: 'The table’s length is the total value instead of W.' },
        { text: 'Always', why: 'With large values and a small capacity the capacity table is the small one.' },
        { text: 'Only when every weight is 1', why: 'Any weights work; what matters is which dimension is small.' },
      ],
    },
  ],

  'knapsack-fptas': [
    {
      know: 'K = ε · vmax / n over the items that fit; values become ⌊v / K⌋; the result is K times the best rounded total.',
      ask: 'Weights 3, 4, 5, values 40, 50, 60, capacity 7, ε = 1/2. What does the scheme return?',
      args: [[3, 4, 5], [40, 50, 60], 7, [1, 2]], answer: 90,
      misconceptions: [{ answer: 100, feedback: '100 takes the 40 and the 60, weighing 8: too heavy.' }],
      explain: 'K = 10, rounded values 4, 5, 6. The best rounded set that fits (weight at most 7) is the first two items, 9 steps: 9 · 10 = 90.',
    },
    {
      know: 'The rounded totals are at most n · (n/ε).',
      ask: 'About how much work does the scheme take for n items?',
      options: [
        { text: 'About n³ / ε steps', right: true, why: 'n items times up to n²/ε rounded totals.' },
        { text: 'About n · W steps', why: 'That is the capacity table, which the scheme avoids.' },
        { text: 'About 2ⁿ steps', why: 'That is trying every set; the table shares them.' },
      ],
    },
    {
      know: 'An approximation scheme trades accuracy for speed through ε.',
      ask: 'What does halving ε do?',
      options: [
        { text: 'Halves the possible loss and about doubles the work', right: true, why: 'The bound is (1 − ε)·OPT, and the table grows like 1/ε.' },
        { text: 'Makes the answer exact', why: 'Only ε small enough that K ≤ the smallest step between values makes rounding lossless.' },
        { text: 'Changes nothing', why: 'K shrinks with ε, so the rounding is finer and the table larger.' },
      ],
    },
  ],

  'parameterized-dp': [
    {
      know: 'Column by column, the state is the mask of chosen rows, with no two neighbours.',
      ask: 'The grid 3 1 4 / 1 5 9 / 2 6 5. The best total of cells with no two sharing a side?',
      args: [[[3, 1, 4], [1, 5, 9], [2, 6, 5]]], answer: 19,
      misconceptions: [{ answer: 17, feedback: '17 is the checkerboard of the middle cells 1, 1, 9, 6. The corners and the centre give 3 + 4 + 5 + 2 + 5 = 19.' }],
      explain: 'The four corners and the centre: 3 + 4 + 2 + 5 + 5 = 19.',
    },
    {
      know: 'A fixed-parameter algorithm costs f(k) · poly(n), where k is a structural parameter.',
      ask: 'Which cost is fixed-parameter in the height h?',
      options: [
        { text: '4ʰ · w', right: true, why: 'Exponential only in h; for fixed h it is linear in the length.' },
        { text: 'w^h', why: 'The exponent grows with h: that is the n^k kind, not f(k) · poly(n).' },
        { text: '2^(h · w)', why: 'Exponential in the whole grid, not just its height.' },
      ],
    },
    {
      know: 'The masks with no two adjacent 1s are counted by Fibonacci numbers.',
      ask: 'Why does the narrow side go across the masks, not the long one?',
      options: [
        { text: 'The mask spans the boundary between columns, so its size is the side crossing it: the short one', right: true, why: 'Scanning along the long side keeps the frontier short.' },
        { text: 'It makes no difference', why: 'Masks over the long side would have 2³⁰⁰ states.' },
        { text: 'Because rows are faster to read than columns', why: 'Memory order is a detail; the frontier size is what matters.' },
      ],
    },
  ],

  'multiobjective': [
    {
      know: 'Each vertex keeps the (time, cost) pairs no other route to it beats in both.',
      ask: 'Edges 0 → 1 (1, 4), 0 → 2 (4, 1), 1 → 3 (1, 1), 2 → 3 (1, 1), 0 → 3 (5, 5). How many routes from 0 to 3 are on the Pareto front?',
      oracle: 'pareto-count', args: [4, [[0, 1, 1, 4], [0, 2, 4, 1], [1, 3, 1, 1], [2, 3, 1, 1], [0, 3, 5, 5]]], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'Neither (2, 5) nor (5, 2) beats the other: one is faster, the other cheaper.' }],
      explain: 'Routes (2, 5), (5, 2) and (5, 5); the last is beaten by both others. 2 remain.',
    },
    {
      know: 'Both objectives, time and cost, add up along a route.',
      ask: 'Why may a dominated pair be dropped at an inner vertex?',
      options: [
        { text: 'Any extension adds the same amounts to both pairs, so the dominated one stays dominated', right: true, why: 'It can never become part of a front pair.' },
        { text: 'Because it is slower', why: 'A slower pair is kept if it is cheaper; it is dropped only when it is no better in either.' },
        { text: 'It may not: every pair must be kept', why: 'Then the lists grow with the number of routes, exponentially.' },
      ],
    },
    {
      know: 'A weighted sum turns two objectives into one.',
      ask: 'Why not minimise time + λ · cost for a few values of λ?',
      options: [
        { text: 'Some front points are never the best for any λ, so they are missed', right: true, why: 'Points in a dent of the front are unsupported.' },
        { text: 'Because the sum can be negative', why: 'Times and costs are non-negative here; the problem is the missed points.' },
        { text: 'It finds the whole front', why: 'Only the convex corners of the front.' },
      ],
    },
  ],

  'meet-middle': [
    {
      know: 'Split the values in two; count, for each left sum s, the right sums at most T − s.',
      ask: 'Values 10, 20, 30, 40, 50, bound 60. How many subsets (the empty one included) have sum at most 60?',
      args: [[10, 20, 30, 40, 50], 60], answer: 13,
      misconceptions: [{ answer: 12, feedback: '12 forgets the empty subset, whose sum 0 is at most 60.' }],
      explain: 'Empty (1); singles (5); pairs with sum ≤ 60: 10+20, 10+30, 10+40, 10+50, 20+30, 20+40 (6); the triple 10+20+30 (1). 13 in all.',
    },
    {
      know: 'Each half of the n values has 2^(n/2) subset sums.',
      ask: 'About how much work does it take for n values?',
      options: [
        { text: 'About 2^(n/2) · n steps', right: true, why: 'Listing and sorting a half, then a binary search per sum of the other.' },
        { text: 'About 2ⁿ steps', why: 'That is listing every subset; the halves avoid it.' },
        { text: 'About n² steps', why: 'The halves’ lists are still exponential, just half the exponent.' },
      ],
    },
    {
      know: 'Equal values are still different items, chosen separately.',
      ask: 'Why must the sums be kept with repeats, not as a set?',
      options: [
        { text: 'Different subsets can have the same sum, and each counts', right: true, why: 'A set of sums would count them once.' },
        { text: 'Repeats make the sort faster', why: 'They don’t; they are kept because each is a different subset.' },
        { text: 'They needn’t be', why: 'Values 5, 5, 5 with bound 9 have three subsets of sum 5.' },
      ],
    },
  ],

  'min-plus-convolution': [
    {
      know: 'best(i, r) = min over x of best(i − 1, r − x) + c[x].',
      ask: 'Three tasks each cost 0, 5 or 6 for 0, 1 or 2 units. Give out exactly 4 units: the least cost?',
      args: [[[0, 5, 6], [0, 5, 6], [0, 5, 6]], 4], answer: 12,
      misconceptions: [{ answer: 16, feedback: '16 spreads the units 2, 1, 1. Giving 2 to two tasks and none to the third costs 6 + 6 = 12.' }],
      explain: 'Two units cost only 1 more than one, so pairs are cheap: 2 + 2 + 0 costs 12; 2 + 1 + 1 costs 16.',
    },
    {
      know: 'An ordinary convolution is a sum of products; the FFT computes it fast.',
      ask: 'Why is the min-plus convolution harder to speed up?',
      options: [
        { text: 'min and + don’t have the subtraction the FFT relies on; no general fast method is known', right: true, why: 'Speed-ups need structure such as convex cost tables.' },
        { text: 'It isn’t: the FFT works on it directly', why: 'The FFT computes sums of products, which is a different quantity.' },
        { text: 'Because the tables are short', why: 'Short tables make it fast anyway; the difficulty is for long ones.' },
      ],
    },
    {
      know: 'Convex cost tables have growing increments.',
      ask: 'With convex costs, how does the best allocation look?',
      options: [
        { text: 'Units go one at a time to the task whose next unit is cheapest', right: true, why: 'Greedy is optimal when every task’s increments grow.' },
        { text: 'All units to one task', why: 'With growing increments, piling up gets ever dearer.' },
        { text: 'Always an equal split', why: 'Only when the tasks are the same; otherwise the cheaper ones get more.' },
      ],
    },
  ],

  'persistent-states': [
    {
      know: 'A node’s version holds exactly its ancestors and itself.',
      ask: 'Node 0 → nodes 1 and 2; node 1 → node 3. Keys 1, 2, 3, 2; weights 10, 20, 30, 40; ranges [1, 3], [0, 1], [3, 3], [2, 2]. The sum of the answers?',
      args: [[-1, 0, 0, 1], [1, 2, 3, 2], [10, 20, 30, 40], [1, 0, 3, 2], [3, 1, 3, 2], 4], answer: 90,
      misconceptions: [{ answer: 80, feedback: '80 looks only at each node’s own key. Node 1’s range [0, 1] holds node 0’s key 1: 10, not 0.' }],
      explain: 'Node 0: 10. Node 1: ancestors 0 and 1, keys 1 and 2, range [0, 1]: 10. Node 2: keys 1 and 3, range [3, 3]: 30. Node 3: keys 1, 2, 2, range [2, 2]: max(20, 40) = 40. 10 + 10 + 30 + 40 = 90.',
    },
    {
      know: 'An insertion copies only the nodes on one root-to-leaf path.',
      ask: 'About how much memory do n versions take, over K keys?',
      options: [
        { text: 'About n · log K nodes', right: true, why: 'Each version adds one path; everything else is shared.' },
        { text: 'About n · K nodes', why: 'That is a full copy per version, which persistence avoids.' },
        { text: 'About K nodes', why: 'Each new version adds a path of new nodes.' },
      ],
    },
    {
      know: 'Siblings start from the same parent version.',
      ask: 'Why must nodes never be changed in place?',
      options: [
        { text: 'Other versions share them; a change would leak into those versions', right: true, why: 'A sibling would suddenly see its brother’s key.' },
        { text: 'Because changing in place is slower', why: 'It is faster, but it breaks the other versions.' },
        { text: 'It is fine for the last version built', why: 'Even the last version shares its nodes with earlier ones.' },
      ],
    },
  ],

  'dynamic-dp': [
    {
      know: 'After each update, the answer is the largest entry of the root’s 2 × 2 table.',
      ask: 'Houses 1, 1, 1, 1. Set house 1 to 5, then house 2 to 5, then house 0 to 0. What is the sum of the three answers?',
      args: [[1, 1, 1, 1], [[1, 5], [2, 5], [0, 0]]], answer: 18,
      misconceptions: [{ answer: 20, feedback: 'With houses 1, 5, 5, 1 the two 5s are neighbours: the best is 5 + 1 = 6, not 10.' }],
      explain: 'After 1 → 5: 1, 5, 1, 1, best 6. After 2 → 5: 1, 5, 5, 1, best 6. After 0 → 0: 0, 5, 5, 1, best 6. 6 + 6 + 6 = 18.',
    },
    {
      know: 'The (max, +) product of 2 × 2 tables is associative.',
      ask: 'Why does associativity matter here?',
      options: [
        { text: 'It lets a segment tree store products of ranges and combine them in any grouping', right: true, why: 'Only the left-to-right order must be kept.' },
        { text: 'It lets the segments be multiplied in any order, left and right swapped', why: 'The product is not commutative: the order of houses matters.' },
        { text: 'It doesn’t', why: 'Without it the tree’s grouping would change the answer.' },
      ],
    },
    {
      know: 'An update touches one leaf and the nodes above it.',
      ask: 'About how much work does one update take, for n houses?',
      options: [
        { text: 'About log n small table products', right: true, why: 'One per level of the segment tree.' },
        { text: 'About n steps', why: 'That is recomputing the whole row.' },
        { text: 'About n log n steps', why: 'Only one path of the tree changes.' },
      ],
    },
  ],

  'tree-automata': [
    {
      know: 'N(v, s) adds, over operations and child values with op(x, y) = s, the products N(a, x) · N(b, y).',
      ask: 'The tree 0 → (1, 2), 1 → (3, 4); each inner node may be "and", "or" or "xor". How many labellings make the root 1?',
      args: [[[1, 2], [3, 4], [], [], []], ['and', 'or', 'xor']], answer: 36,
      misconceptions: [{ answer: 72, feedback: '72 counts every labelling: 9 choices of operations times 8 of leaves. Half of them make the root 1.' }],
      explain: 'Node 1: of 12 labellings (3 ops × 4 leaf pairs), 6 give 1 and 6 give 0. The root: for each op, its value over (node 1, leaf 2) — and: 6·1 = 6, or: 6·1 + 6·1 + 6·1 = 18, xor: 6·1 + 6·1 = 12. 6 + 18 + 12 = 36.',
    },
    {
      know: 'A tree automaton has a finite set of states per node.',
      ask: 'What must the state of a node capture?',
      options: [
        { text: 'Everything its parent needs to know about the subtree: here, its value', right: true, why: 'Then the subtree’s details can be forgotten.' },
        { text: 'The whole labelling of the subtree', why: 'That is listing labellings; the state is what remains after forgetting them.' },
        { text: 'The depth of the node', why: 'The operations don’t depend on depth; the value is what the parent uses.' },
      ],
    },
    {
      know: 'Each inner node combines 2 × 2 child states per operation.',
      ask: 'About how much work does the count take for n nodes and k operations?',
      options: [
        { text: 'About n · k steps', right: true, why: 'Each inner node tries k operations over 4 pairs of child values.' },
        { text: 'About kⁿ · 2ⁿ steps', why: 'That is listing labellings; the counts merge them.' },
        { text: 'About n² steps', why: 'Each node reads only its two children.' },
      ],
    },
  ],

  'proof-checklist': [
    {
      know: 'The 0/1 loop runs down; the unbounded loop runs up.',
      ask: 'Weights 4 and 3, values 9 and 6, capacity 10. The best unbounded value (any number of copies)?',
      args: [[4, 3], [9, 6], 10], part: 1, answer: 21,
      misconceptions: [{ answer: 15, feedback: '15 is the 0/1 value. With repeats: two 4s and nothing else (18), or one 4 and two 3s (21).' }],
      explain: 'One weight-4 item and two weight-3 items fill 10 exactly: 9 + 6 + 6 = 21.',
    },
    {
      know: 'A proof of a DP states what each cell means, why the recurrence covers every case, and why the fill order is valid.',
      ask: 'Which check catches a 0/1 loop that runs upwards?',
      options: [
        { text: 'The invariant that best[c − w] still excludes the current item when it is read', right: true, why: 'Running upwards breaks it, and a two-capacity example shows the reuse.' },
        { text: 'That the table has W + 1 cells', why: 'The size is right either way; the order is what goes wrong.' },
        { text: 'That the answer is at most the sum of all values', why: 'Reusing items can still stay under that bound.' },
      ],
    },
    {
      know: 'Exhaustive search on small inputs is an independent check of a DP.',
      ask: 'Why test against brute force on small inputs, not only on the given examples?',
      options: [
        { text: 'Bugs like a wrong loop direction can pass the examples and show only on other inputs', right: true, why: 'Many random small cases reach the corner the examples missed.' },
        { text: 'Because brute force is faster', why: 'It is far slower; it is used because it is obviously right.' },
        { text: 'It isn’t needed when the examples pass', why: 'A sample can pass while an item is reused, as the lesson shows.' },
      ],
    },
  ],
}
