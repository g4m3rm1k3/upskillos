// "Check yourself" for the bitmask lessons (Advanced, subsets group). Format and checks: checks.js and
// checks.test.js; the numbers come from advanced-oracles.js, which lists every subset, order or colouring.

export const SUBSET_CHECKS = {
  'bitmask-basics': [
    {
      know: 'T(mask) = T(mask without its lowest item) + that item’s weight; the empty subset (mask 0) weighs 0 and counts.',
      ask: 'Weights [1, 2, 4], limit 3. How many subsets weigh at most 3?',
      args: [[1, 2, 4], 3], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 forgets the empty subset, which weighs 0.' },
        { answer: 8, feedback: '8 is every subset; anything with the 4 is too heavy.' },
      ],
      explain: '{}, {1}, {2} and {1, 2}.',
    },
    {
      know: 'In two’s complement, −mask is ~mask + 1: flip every bit, then add one.',
      ask: 'Why does mask & −mask give the lowest set bit?',
      options: [
        { text: 'Adding 1 to ~mask carries up to exactly the position of mask’s lowest 1, so only that bit is set in both', right: true, why: 'Below it, mask has 0s and −mask has 0s; above it the bits are opposite.' },
        { text: 'Because −mask is mask with its sign flipped, and & keeps the sign bit', why: 'The sign bit isn’t what survives; the lowest set bit is.' },
        { text: 'It gives the highest set bit, not the lowest', why: 'Try 0b0110: −0b0110 ends in …1010, and the & is 0b0010, the lowest.' },
      ],
    },
    {
      know: 'There are 2ⁿ masks, each filled with one addition.',
      ask: 'How many items can this handle in about a second?',
      options: [
        { text: 'Around 20 to 25: 2²⁰ is about a million masks', right: true, why: 'Each extra item doubles the work; past 30 the table no longer fits in memory.' },
        { text: 'Thousands, since each mask costs only one addition', why: 'The number of masks doubles with every item.' },
        { text: 'Only about 8', why: '2⁸ = 256 masks is tiny; much larger n is fine.' },
      ],
    },
  ],

  'subset-enumeration': [
    {
      know: 'The walk s = (s − 1) & m visits every submask of m, down to 0.',
      ask: 'values = [2, 0, 5, 1] for masks 00, 01, 10, 11. What is the sum over the submasks of 10?',
      args: [[2, 0, 5, 1]], part: 2, answer: 7,
      misconceptions: [
        { answer: 5, feedback: '5 is just the value of 10. The empty submask 00 counts too.' },
        { answer: 8, feedback: '8 adds every value, but 01 and 11 aren’t inside 10.' },
      ],
      explain: 'The submasks of 10 are 10 and 00: 5 + 2 = 7.',
    },
    {
      know: 'Each element is either outside m, inside m but not in s, or inside both.',
      ask: 'Why do all the submask walks together take 3ⁿ steps?',
      options: [
        { text: 'Each (m, s) pair gives each bit one of those three states, and every pair is visited once', right: true, why: '3ⁿ is much less than the 4ⁿ pairs of masks.' },
        { text: 'Because each mask has 3 submasks', why: 'A mask with k bits has 2ᵏ submasks.' },
        { text: 'They take 2ⁿ steps', why: 'That would be one step per mask; each mask has many submasks.' },
      ],
    },
    {
      know: 'Sum-over-subsets DP adds bit by bit: for each bit i, every mask with bit i adds the value of the mask without it.',
      ask: 'How does it compare with walking every submask?',
      options: [
        { text: 'It gives the same sums in 2ⁿ · n steps instead of 3ⁿ', right: true, why: 'For n = 20: 20 million steps against 3.5 billion.' },
        { text: 'It gives different sums', why: 'Both add each submask exactly once.' },
        { text: 'It is slower', why: '2ⁿ · n grows much more slowly than 3ⁿ.' },
      ],
    },
  ],

  'assignment': [
    {
      know: 'D(mask) gives the jobs in mask to the first popcount(mask) workers; the last of them took one of mask’s jobs.',
      ask: 'cost = [[1, 2, 3], [2, 4, 6], [3, 6, 9]]. What is the cheapest assignment?',
      args: [[[1, 2, 3], [2, 4, 6], [3, 6, 9]]], answer: 10,
      misconceptions: [
        { answer: 14, feedback: '14 gives each worker the job with its own number: 1 + 4 + 9. Pairing big with small is cheaper.' },
        { answer: 12, feedback: 'Try worker 0 with job 2, worker 1 with job 1, worker 2 with job 0: 3 + 4 + 3.' },
      ],
      explain: '3 + 4 + 3 = 10: the biggest multipliers meet the smallest.',
    },
    {
      know: 'Trying every assignment means n! orders of the jobs.',
      ask: 'For 12 workers, how do the two methods compare?',
      options: [
        { text: '12! ≈ 479 million orders against 2¹² · 12 ≈ 49 000 table steps', right: true, why: 'The table forgets the order in which jobs were used, keeping only the set.' },
        { text: 'About the same', why: 'n! grows far faster than 2ⁿ · n.' },
        { text: 'The table is slower, because it has 2ⁿ entries', why: '2ⁿ is much smaller than n! for n ≥ 4.' },
      ],
    },
    {
      know: 'The Hungarian algorithm solves assignment in O(n³).',
      ask: 'When is the bitmask table still useful?',
      options: [
        { text: 'When the cost of a choice depends on which jobs are already taken, which the Hungarian method can’t express', right: true, why: 'The mask state can carry such extra rules; the Hungarian method needs fixed pairwise costs.' },
        { text: 'Never: the Hungarian method is always better', why: 'It is faster for plain assignment, but less flexible.' },
        { text: 'When n is large', why: '2ⁿ grows too fast for large n; the Hungarian method scales.' },
      ],
    },
  ],

  'held-karp': [
    {
      know: 'D(mask, v) is the cheapest path from 0 through exactly mask, ending at v; the tour adds the return to 0.',
      ask: 'dist: 0–1 is 1, 1–2 is 1, 2–3 is 1, 3–0 is 1, and every other pair 9. What is the cheapest tour?',
      args: [[[0, 1, 9, 1], [1, 0, 1, 9], [9, 1, 0, 1], [1, 9, 1, 0]]], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 is the path 0 → 1 → 2 → 3. The tour returns to 0: + 1.' },
      ],
      explain: '0 → 1 → 2 → 3 → 0: four steps of 1.',
    },
    {
      know: 'The table has 2ⁿ · n cells, and each tries n previous cities.',
      ask: 'How long does Held–Karp take?',
      options: [
        { text: 'O(2ⁿ · n²): exponential, but far less than the (n − 1)! tours', right: true, why: 'For n = 15: about 7 million steps against 87 billion tours.' },
        { text: 'O(n²), like a shortest path', why: 'The visited set is part of the state, so it is exponential.' },
        { text: 'O(n!), the same as trying every tour', why: 'Tours with the same visited set and end are merged.' },
      ],
    },
    {
      know: 'The travelling salesman problem is NP-hard.',
      ask: 'What does that say about Held–Karp?',
      options: [
        { text: 'No polynomial method is known, so an exponential DP like this is the best exact tool for small n', right: true, why: 'For large n, approximations and heuristics take over.' },
        { text: 'Held–Karp is polynomial', why: 'Its table has 2ⁿ columns, so it is exponential.' },
        { text: 'The DP must be wrong', why: 'It is exact; it is just exponential.' },
      ],
    },
  ],

  'hamiltonian': [
    {
      know: 'C(mask, v) counts paths from 0 through exactly mask ending at v, adding C(mask − v, u) over edges u → v.',
      ask: 'Edges 0→1, 1→2, 2→3, 0→2, 1→3. How many paths start at 0 and visit all four vertices?',
      args: [4, [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3]]], answer: 1,
      misconceptions: [
        { answer: 2, feedback: '0 → 2 → 3 misses vertex 1, and 0 → 1 → 3 misses vertex 2. Only 0 → 1 → 2 → 3 visits all four.' },
        { answer: 3, feedback: 'Paths must visit every vertex; most routes skip one.' },
      ],
      explain: 'Only 0 → 1 → 2 → 3 uses an edge at every step.',
    },
    {
      know: 'Deciding whether a Hamiltonian path exists is NP-complete.',
      ask: 'What does the table give for deciding existence?',
      options: [
        { text: 'An exact answer in O(2ⁿ · n²), using true/false cells instead of counts', right: true, why: 'The same states work for “is there one?” as for “how many?”.' },
        { text: 'Nothing: counting is harder than deciding', why: 'The same table decides, by checking whether any count is non-zero.' },
        { text: 'A polynomial method', why: 'The table has 2ⁿ · n cells: exponential in n.' },
      ],
    },
    {
      know: 'Counts can be huge: a complete graph on n vertices has (n − 1)! such paths from 0.',
      ask: 'What should an implementation watch for as n grows?',
      options: [
        { text: 'Overflow: use big integers or count modulo a prime', right: true, why: '21! is already past 2⁶³, the 64-bit limit: a complete graph on 22 vertices.' },
        { text: 'Negative counts', why: 'Counts only add, so they are never negative.' },
        { text: 'Nothing: counts stay below 2ⁿ', why: '(n − 1)! grows faster than 2ⁿ, so counts outrun it.' },
      ],
    },
  ],

  'subset-partition': [
    {
      know: 'B(mask) is the fewest bins for mask: a bin holding its lowest item, plus the best for the rest.',
      ask: 'Items [5, 4, 3, 2, 1], bins of 6. What is the fewest bins?',
      args: [[5, 4, 3, 2, 1], 6], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 is the total, 15, divided by 6 and rounded down. Two bins hold at most 12.' },
        { answer: 4, feedback: '5 + 1, 4 + 2 and 3 fit in three bins.' },
      ],
      explain: '5 + 1, 4 + 2 and 3: 15 doesn’t fit in two bins of 6.',
    },
    {
      know: 'First-fit decreasing puts each item, largest first, into the first bin with room.',
      ask: 'Is first-fit decreasing always optimal?',
      options: [
        { text: 'No: it can use more bins than needed, which is why the exact table exists', right: true, why: 'It is a good heuristic (within about 11/9 of optimal), not an exact method.' },
        { text: 'Yes, because the largest items go first', why: 'Some packings need a large item to share a bin with a particular small one that comes later.' },
        { text: 'Yes, when every item fits in a bin', why: 'Fitting individually doesn’t make greedy packing optimal.' },
      ],
    },
    {
      know: 'Requiring the bin to contain the lowest item fixes the order in which bins are chosen.',
      ask: 'What would happen without that requirement, if the table counted packings?',
      options: [
        { text: 'Each packing of k bins would be counted k! times, once per order of its bins', right: true, why: 'For a minimum it only wastes time; for a count it gives wrong answers.' },
        { text: 'Nothing', why: 'Counting would multiply every packing by the orders of its bins.' },
        { text: 'Some packings would be missed', why: 'None would be missed; they would be repeated.' },
      ],
    },
  ],

  'subset-cover': [
    {
      know: 'D(mask | o) ≤ D(mask) + cost(o): buying option o ORs in its items.',
      ask: 'Four items. Options: {0, 1, 2} for 5, {2, 3} for 3, {0} for 1, {1} for 1, {3} for 1. What is the cheapest cover?',
      args: [4, [[[0, 1, 2], 5], [[2, 3], 3], [[0], 1], [[1], 1], [[3], 1]]], answer: 5,
      misconceptions: [
        { answer: 6, feedback: '6 buys the big option and {3}. {0}, {1} and {2, 3} cost 1 + 1 + 3 = 5.' },
        { answer: 8, feedback: 'The two large options overlap on item 2; cheaper singles do better.' },
      ],
      explain: '{0}, {1} and {2, 3}: 1 + 1 + 3 = 5.',
    },
    {
      know: 'Greedy set cover repeatedly buys the option with the lowest cost per newly covered item.',
      ask: 'How does greedy compare with the table?',
      options: [
        { text: 'Greedy is fast but can cost more (about a ln n factor in the worst case); the table is exact but exponential in the number of items', right: true, why: 'Set cover is NP-hard; the table is practical only for few items.' },
        { text: 'Greedy is always exact', why: 'Cheap per-item options can lead greedy into an expensive combination.' },
        { text: 'The table is exponential in the number of options', why: 'It has one state per set of items, 2ⁿ, whatever the number of options.' },
      ],
    },
    {
      know: 'The table has a state for every subset of items.',
      ask: 'What limits the size of problem it can solve?',
      options: [
        { text: 'The number of items n: 2ⁿ states', right: true, why: 'Many options are fine; many items are not.' },
        { text: 'The number of options', why: 'Each option is tried from each state: linear in the options.' },
        { text: 'The costs', why: 'Costs are added, not used as indices.' },
      ],
    },
  ],

  'steiner-tree': [
    {
      know: 'D(set, v) joins a set of terminals and v; it branches at some u into two smaller sets, then follows a shortest path to v.',
      ask: 'Edges 0–1 (1), 1–2 (1), 2–3 (1), 0–3 (5); terminals 0 and 3. What is the lightest connection?',
      args: [4, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 5]], [0, 3]], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 uses the direct edge. The path through 1 and 2 costs 3.' },
      ],
      explain: '0 – 1 – 2 – 3: three edges of 1.',
    },
    {
      know: 'With exactly two terminals, the lightest tree joining them is a path.',
      ask: 'What does the Steiner problem become with two terminals?',
      options: [
        { text: 'A shortest path between them', right: true, why: 'The tree joining two vertices is a path, and the lightest is the shortest.' },
        { text: 'A minimum spanning tree', why: 'A spanning tree joins every vertex, not just the terminals.' },
        { text: 'Still NP-hard', why: 'With a fixed number of terminals, Dreyfus–Wagner is polynomial in the graph size.' },
      ],
    },
    {
      know: 'Dreyfus–Wagner tries every split of every terminal set at every vertex: about 3ᵏ · n work for k terminals.',
      ask: 'What makes the problem hard in general?',
      options: [
        { text: 'The number of terminals k: the work grows like 3ᵏ', right: true, why: 'For few terminals it is fine; with many it explodes.' },
        { text: 'The number of vertices', why: 'The work is polynomial in n for fixed k.' },
        { text: 'The edge weights', why: 'Weights only enter through shortest distances.' },
      ],
    },
  ],

  'subset-topological': [
    {
      know: 'C(mask) adds C(mask − v) over every v in mask whose prerequisites are all in mask − v.',
      ask: 'Four vertices with rules 0 before 1 and 2 before 3. How many orders respect them?',
      args: [4, [[0, 1], [2, 3]]], answer: 6,
      misconceptions: [
        { answer: 24, feedback: '24 is every order; each rule halves the count.' },
        { answer: 4, feedback: 'The two chains interleave in C(4, 2) = 6 ways.' },
      ],
      explain: 'Interleave 0, 1 with 2, 3: choose which 2 of the 4 places hold 0 and 1: 6.',
    },
    {
      know: 'Two chains of lengths a and b with no rules between them can be interleaved freely.',
      ask: 'How many orders do they have?',
      options: [
        { text: 'C(a + b, a): choose which places hold the first chain', right: true, why: 'Within each chain the order is fixed.' },
        { text: 'a! · b!', why: 'Each chain’s own order is fixed; what varies is the interleaving.' },
        { text: '(a + b)!', why: 'That ignores the rules within each chain.' },
      ],
    },
    {
      know: 'Counting the orders of a general partial order is #P-complete.',
      ask: 'Why is the 2ⁿ table still worth having?',
      options: [
        { text: 'It is exact for up to about 20 vertices, where listing n! orders is hopeless', right: true, why: '2²⁰ states against 20! ≈ 2.4 · 10¹⁸ orders.' },
        { text: 'It runs in polynomial time', why: 'It has 2ⁿ states, which is exponential.' },
        { text: 'It isn’t: listing the orders is as fast', why: 'n! dwarfs 2ⁿ · n once n passes about 6.' },
      ],
    },
  ],

  'subset-matching': [
    {
      know: 'D(mask) adds D(mask − v − u) over neighbours u of mask’s lowest vertex v.',
      ask: 'A complete graph on 6 vertices. How many perfect matchings?',
      args: [6, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [3, 4], [3, 5], [4, 5]]], answer: 15,
      misconceptions: [
        { answer: 5, feedback: '5 counts only the partner of vertex 0. Each choice leaves 4 vertices with 3 matchings.' },
        { answer: 90, feedback: '90 counts the three pairs in every order. A matching is a set of pairs: divide by 3! = 6.' },
      ],
      explain: '5 choices for vertex 0’s partner, then 3 for the next, then 1: 5 · 3 · 1 = 15.',
    },
    {
      know: 'A complete graph on 2k vertices has (2k − 1)!! = (2k − 1)(2k − 3)… perfect matchings.',
      ask: 'Why that product?',
      options: [
        { text: 'The lowest unmatched vertex has 2k − 1 choices of partner, then the next has 2k − 3, and so on', right: true, why: 'Exactly the table’s rule, with every edge present.' },
        { text: 'Each vertex chooses any partner: (2k)!', why: 'That counts each matching many times, by order and by direction.' },
        { text: 'It is C(2k, 2)', why: 'That counts single edges, not whole matchings.' },
      ],
    },
    {
      know: 'For bipartite graphs, counting perfect matchings is the permanent of a matrix.',
      ask: 'What does that say about the difficulty?',
      options: [
        { text: 'Counting perfect matchings is #P-complete, so exponential methods like this table are expected', right: true, why: 'Finding one matching is easy; counting them all is hard.' },
        { text: 'Counting is as easy as finding one', why: 'Finding one is polynomial; counting is #P-complete.' },
        { text: 'The permanent is a determinant, so it is fast', why: 'The determinant is fast; the permanent, with no signs, is not.' },
      ],
    },
  ],

  'subset-coloring': [
    {
      know: 'χ(mask) = 1 + the smallest χ(mask − I) over independent sets I containing mask’s lowest vertex.',
      ask: 'A cycle of 5 vertices. How many colours are needed?',
      args: [5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]], answer: 3,
      misconceptions: [
        { answer: 2, feedback: 'Two colours alternate around an even cycle. With 5 vertices the last one meets both colours.' },
        { answer: 5, feedback: 'Vertices that aren’t neighbours can share a colour: 3 is enough.' },
      ],
      explain: 'An odd cycle can’t alternate two colours, and 3 always suffice.',
    },
    {
      know: 'A graph needs only 2 colours exactly when it has no odd cycle.',
      ask: 'How can 2-colourability be checked without the 3ⁿ table?',
      options: [
        { text: 'A breadth-first search that colours alternately and looks for a clash: linear time', right: true, why: 'Only k ≥ 3 is hard; two colours take one search.' },
        { text: 'It can’t; 2 colours is NP-hard too', why: '2-colouring is easy; 3-colouring is the NP-hard one.' },
        { text: 'Count the edges', why: 'The structure matters, not the number of edges.' },
      ],
    },
    {
      know: 'Each mask tries every independent submask containing its lowest vertex.',
      ask: 'What is the total work of this table?',
      options: [
        { text: 'About 3ⁿ (or 2ⁿ · n with inclusion–exclusion counting)', right: true, why: 'For n = 15, about 14 million steps.' },
        { text: 'About 2ⁿ', why: 'Each mask also walks its submasks.' },
        { text: 'About n!', why: 'Colourings are grouped by sets, not orders.' },
      ],
    },
  ],

  'mask-language': [
    {
      know: 'XOR keeps the bits that appear in an odd number of the sets; a mask with bit p set is worth 2ᵖ.',
      ask: 'Sets {2, 3} and {3, 4}. What number is the XOR of their masks?',
      args: [[[2, 3], [3, 4]]], oracle: 'mask-number', answer: 20,
      misconceptions: [
        { answer: 28, feedback: '28 is the OR, 4 + 8 + 16. Bit 3 is in both sets, so XOR clears it.' },
        { answer: 8, feedback: '8 is the shared bit (the AND). XOR keeps the bits in exactly one set: 4 + 16.' },
      ],
      explain: 'Bits 2 and 4: 4 + 16 = 20.',
    },
    {
      know: 'In JavaScript, the bitwise operators on ordinary numbers convert them to 32-bit integers.',
      ask: 'What is 1 << 33 in JavaScript?',
      options: [
        { text: '2, because the shift amount is taken modulo 32', right: true, why: '33 mod 32 = 1, so it shifts by 1. Use 1n << 33n for 2³³.' },
        { text: '8589934592, which is 2³³', why: 'That needs BigInt; ordinary numbers shift in 32 bits.' },
        { text: '0, because the bit falls off', why: 'The shift amount wraps; the bit doesn’t fall off.' },
      ],
    },
    {
      know: 'JSON numbers are read as 64-bit floating point in most languages.',
      ask: 'Why send a 100-bit mask as a string?',
      options: [
        { text: 'A double has a 53-bit mantissa, so larger integers lose their low digits', right: true, why: '2⁵³ + 1 can’t be told apart from 2⁵³; a string keeps every digit.' },
        { text: 'JSON can’t contain numbers', why: 'It can, but readers parse them into doubles.' },
        { text: 'Strings take less space', why: 'Exactness is the point, not size.' },
      ],
    },
  ],
}
