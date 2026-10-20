// "Check yourself" for the interval and scheduling lessons (Structured). Format and checks: checks.js and
// checks.test.js. The numbers are checked against the search oracles in structured-oracles.js, which try
// every order, split or tree; each was printed there before it was typed.

export const INTERVAL_CHECKS = {
  'matrix-chain': [
    {
      know: 'M(i, j) is the cheapest way to multiply matrices i to j: try every last split k, M(i, k) + M(k + 1, j) + d_i · d_{k+1} · d_{j+1}.',
      ask: 'Matrices 30 × 5, 5 × 20 and 20 × 10. What is the cheapest cost to multiply them?',
      args: [[30, 5, 20, 10]], answer: 2500,
      misconceptions: [
        { answer: 9000, feedback: '9000 multiplies left to right: (AB)C = 30·5·20 + 30·20·10. Doing BC first keeps the products small.' },
      ],
      explain: 'A(BC): 5·20·10 = 1000 for BC (5 × 10), then 30·5·10 = 1500. Total 2500.',
    },
    {
      know: 'The answer is the same whatever order the multiplications are done in; only the cost changes.',
      ask: 'Why is the cost different for different orders?',
      options: [
        { text: 'The sizes of the in-between results differ, and each multiplication costs the product of three sizes', right: true, why: '(AB) is 30 × 20, but (BC) is only 5 × 10, so what follows costs much less.' },
        { text: 'Matrix multiplication is not associative', why: 'It is: (AB)C = A(BC). Only the work differs.' },
        { text: 'Rounding errors grow with some orders', why: 'The question counts multiplications, not rounding.' },
      ],
    },
    {
      know: 'There are about n²/2 intervals, and each tries up to n splits.',
      ask: 'How much work does the table take for n matrices?',
      options: [
        { text: 'About n² steps', why: 'Each of the n² intervals tries up to n splits, so the total is about n³.' },
        { text: 'About n³/6 steps', right: true, why: 'Intervals of length L have L − 1 splits; summed over all intervals, about n³/6.' },
        { text: 'Exponential, like the number of bracketings', why: 'The bracketings are Catalan-many, but the table never lists them.' },
      ],
    },
  ],

  'burst-balloons': [
    {
      know: 'B(i, j) is the most from bursting every balloon strictly between i and j, choosing k as the last one burst there: B(i, k) + B(k, j) + v_i · v_k · v_j.',
      ask: 'Balloons [2, 4, 3]. What is the most you can earn?',
      args: [[2, 4, 3]], answer: 33,
      misconceptions: [
        { answer: 24, feedback: '24 bursts the smallest first: 1·2·4 + 4·3·1 + 4. Bursting the 4 first, while both neighbours are there, earns more.' },
      ],
      explain: 'Burst 4 (2·4·3 = 24), then 2 (1·2·3 = 6), then 3 (3): 33.',
    },
    {
      know: 'If k is burst first, its neighbours change, and the two sides still affect each other.',
      ask: 'Why choose the last balloon burst in a range, not the first?',
      options: [
        { text: 'If k is last, its neighbours at that moment are the range’s fixed ends, so the two sides are independent', right: true, why: 'Everything left of k is burst between i and k, everything right between k and j, and neither side changes the other’s neighbours.' },
        { text: 'The last balloon always earns the most', why: 'The last one has fewer neighbours left; what matters is that its neighbours are known.' },
        { text: 'Either works the same', why: 'Choosing the first leaves the two sides joined after it bursts, so they aren’t separate subproblems.' },
      ],
    },
    {
      know: 'The lesson pads the row with a 1 at each end.',
      ask: 'Why the padding?',
      options: [
        { text: 'A missing neighbour counts as 1, so the padded ends make every burst the same formula', right: true, why: 'With the ones in place, the whole row is the range between the two pads and needs no special case.' },
        { text: 'To make the row length even', why: 'Length doesn’t matter; the ends stand in for missing neighbours.' },
        { text: 'So the pads can be burst for points', why: 'The pads are never burst; they are only neighbours.' },
      ],
    },
  ],

  'cut-stick': [
    {
      know: 'C(i, j) is the cheapest way to make every cut between cut points i and j: the piece’s length, plus the best first cut k, C(i, k) + C(k, j).',
      ask: 'A stick of length 8 with cuts at 1, 4 and 6. What is the cheapest total?',
      args: [8, [1, 4, 6]], answer: 16,
      misconceptions: [
        { answer: 19, feedback: '19 cuts left to right: 8, then 7, then 4. Cutting at 4 first splits the stick evenly.' },
      ],
      explain: 'Cut at 4 (8), then 1 in the left piece (4), then 6 in the right piece (4): 16.',
    },
    {
      know: 'Add 0 and n to the cut positions and sort them; then every piece lies between two neighbouring entries.',
      ask: 'Why sort the cuts?',
      options: [
        { text: 'So each piece is an interval of consecutive cut points, and the table can be indexed by them', right: true, why: 'With sorted cuts, the cuts inside piece (i, j) are exactly those numbered between i and j.' },
        { text: 'Because the cuts must be made in order', why: 'They may be made in any order; finding the best order is the whole problem.' },
        { text: 'To find the shortest piece first', why: 'Sorting is about indexing, not about which piece to cut first.' },
      ],
    },
    {
      know: 'Each cut costs the length of the piece it splits.',
      ask: 'Which earlier problem has the same table?',
      options: [
        { text: 'Matrix chain: try every split of an interval and add the cost of the whole interval', right: true, why: 'Both choose a split k of (i, j) and add a cost that depends on the interval, then solve both sides.' },
        { text: 'Coin change', why: 'Coin change works along one amount, not on intervals with splits.' },
        { text: 'Longest increasing subsequence', why: 'LIS looks back along a line, not at splits of an interval.' },
      ],
    },
  ],

  'merge-stones': [
    {
      know: 'M(i, j) merges piles i to j into one: the best split, M(i, k) + M(k + 1, j), plus the total of piles i to j for the last merge.',
      ask: 'Piles [1, 5, 1]. What is the cheapest way to merge them into one?',
      args: [[1, 5, 1]], answer: 13,
      misconceptions: [
        { answer: 9, feedback: '9 merges the two 1s first, but they aren’t neighbours. Only neighbouring piles may merge.' },
      ],
      explain: 'Merge 1 and 5 (6), then 6 and 1 (7): 13. The other order also costs 6 + 7.',
    },
    {
      know: 'Huffman’s method merges the two smallest piles anywhere.',
      ask: 'Why doesn’t Huffman’s greedy solve this problem?',
      options: [
        { text: 'It may merge piles that aren’t neighbours, which is not allowed here', right: true, why: 'In the check above it would merge the two 1s. With the neighbour rule, an interval table is needed.' },
        { text: 'It does solve it', why: 'It gives 9 in the check above, which breaks the neighbour rule.' },
        { text: 'Huffman’s method is for codes, not piles', why: 'The arithmetic is the same: without the neighbour rule, Huffman is the best merge order.' },
      ],
    },
    {
      know: 'The last merge in M(i, j) always costs the total of piles i to j, whatever the split.',
      ask: 'How is that total found quickly?',
      options: [
        { text: 'Prefix sums: total(i, j) = P(j + 1) − P(i)', right: true, why: 'One subtraction per interval, instead of adding the piles each time.' },
        { text: 'It is M(i, j) itself', why: 'M(i, j) is the total cost of all merges; the last merge costs only the stones in the range.' },
        { text: 'Add the piles again each time', why: 'That works but adds a factor of n; prefix sums make it constant.' },
      ],
    },
  ],

  'polygon-triangulation': [
    {
      know: 'T(i, j) is the cheapest triangulation of vertices i to j: some vertex k forms triangle (i, k, j), plus T(i, k) + T(k, j).',
      ask: 'A quadrilateral with vertex weights 2, 1, 3, 4 in order. What is the cheapest triangulation?',
      args: [[2, 1, 3, 4]], answer: 20,
      misconceptions: [
        { answer: 30, feedback: '30 uses the diagonal from the first vertex to the third: 2·1·3 + 2·3·4. The other diagonal keeps the 1 in both triangles.' },
      ],
      explain: 'The diagonal from the 1 to the 4: triangles 1·3·4 = 12 and 2·1·4 = 8. Total 20.',
    },
    {
      know: 'Every triangulation of a polygon has the edge from vertex i to vertex j in exactly one triangle.',
      ask: 'Why does the recurrence pick the third vertex k of that triangle?',
      options: [
        { text: 'The triangle (i, k, j) splits the rest into two smaller polygons that don’t interact', right: true, why: 'The diagonals on either side can’t cross the triangle, so each side is solved alone.' },
        { text: 'Because k is the heaviest vertex', why: 'Every k is tried; the table keeps the cheapest.' },
        { text: 'To keep the triangles equal in size', why: 'Size doesn’t matter; the cost is the product of weights.' },
      ],
    },
    {
      know: 'A convex polygon with n vertices has n − 2 triangles in any triangulation.',
      ask: 'How many triangulations are there?',
      options: [
        { text: 'n − 2', why: 'That is the number of triangles in one triangulation.' },
        { text: 'The Catalan number C(n − 2), which grows exponentially', right: true, why: 'A quadrilateral has 2, a pentagon 5, a hexagon 14. The table avoids listing them.' },
        { text: 'n!', why: 'Diagonals can’t cross, which rules out most orderings; the count is Catalan.' },
      ],
    },
  ],

  'optimal-bst': [
    {
      know: 'C(i, j) is the cheapest tree for keys i to j: try each root r, C(i, r − 1) + C(r + 1, j) + the total frequency of keys i to j (every key goes one level deeper).',
      ask: 'Frequencies [1, 1, 4] for three sorted keys. What is the lowest total cost?',
      args: [[1, 1, 4]], answer: 9,
      misconceptions: [
        { answer: 11, feedback: '11 is the balanced tree with the middle key at the root: 1 + 2·(1 + 4). The busy third key belongs at the root.' },
      ],
      explain: 'Root: the third key (4 · 1). Below it, the second key (1 · 2), and below that the first (1 · 3): 4 + 2 + 3 = 9.',
    },
    {
      know: 'Putting a subtree one level deeper adds each of its keys’ frequencies once more.',
      ask: 'Why does C(i, j) add the total frequency of keys i to j?',
      options: [
        { text: 'Every key in the range is one level deeper than in its own subtree’s count, or is the root at depth 1', right: true, why: 'The subtrees’ costs count depth from their own roots; moving them under r adds 1 to every depth, and the root itself costs its frequency once.' },
        { text: 'To count the root twice', why: 'The root is counted once, at depth 1.' },
        { text: 'It is the cost of the search that misses', why: 'This lesson counts only searches that find a key.' },
      ],
    },
    {
      know: 'A balanced tree has the smallest possible height.',
      ask: 'Is the most balanced tree always the cheapest?',
      options: [
        { text: 'Yes: smaller height means smaller depths', why: 'The check above has a balanced tree costing 11 and an unbalanced one costing 9.' },
        { text: 'No: frequent keys should be near the root, even if the tree becomes unbalanced', right: true, why: 'The cost weights depth by frequency, so a busy key at the root can outweigh a longer tail.' },
        { text: 'Only when all keys have different frequencies', why: 'With equal frequencies the balanced tree does win; with unequal ones it may not.' },
      ],
    },
  ],

  'boolean-parenthesization': [
    {
      know: 'For each range keep T(i, j) and F(i, j), the bracketings that come out true and false; each operator combines the counts of its two sides.',
      ask: 'T and T xor F or T. How many bracketings come out true?',
      args: [[true, true, false, true], ['and', 'xor', 'or']], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 is every bracketing of four values. Two of them come out false.' },
      ],
      explain: 'The two that work out (F or T) first give T xor T = F, either way the and is placed. The other three come out true.',
    },
    {
      know: 'xor is true when exactly one side is true.',
      ask: 'How many true bracketings does an xor at the split give?',
      options: [
        { text: 'T_left · F_right + F_left · T_right', right: true, why: 'One side true and the other false, in either order, each pair of bracketings counted.' },
        { text: 'T_left · T_right', why: 'That counts both sides true, which is the rule for and.' },
        { text: 'T_left + T_right', why: 'Bracketings of the two sides combine in pairs, so the counts multiply.' },
      ],
    },
    {
      know: 'Counting true bracketings of a range needs the false ones of its parts too.',
      ask: 'Why keep F(i, j) as well as T(i, j)?',
      options: [
        { text: 'xor and or can turn a false part into a true whole, so false counts feed the true count', right: true, why: 'For xor, a true result needs one side false. For or, true or false is true.' },
        { text: 'To check the answer: T + F must be every bracketing', why: 'That is a fine check, but the real reason is that the recurrence reads F.' },
        { text: 'It isn’t needed for and', why: 'It isn’t, but the other operators need it, so every range keeps both.' },
      ],
    },
  ],

  'expression-extrema': [
    {
      know: 'For each range keep the largest and the smallest value it can take; × of two negatives can turn two minimums into a maximum.',
      ask: '2 − 3 × −4. What is the largest value any bracketing gives?',
      args: [[2, 3, -4], ['-', '*']], answer: 14,
      misconceptions: [
        { answer: 4, feedback: '4 works left to right: (2 − 3) × −4. Multiplying first gives 2 − (−12).' },
      ],
      explain: '2 − (3 × −4) = 2 + 12 = 14.',
    },
    {
      know: 'To make a − b as large as possible, a should be large and b small.',
      ask: 'What does max(a − b) read?',
      options: [
        { text: 'max(left) − min(right)', right: true, why: 'Subtracting the smallest right side gives the largest result. That is why the minimums are kept.' },
        { text: 'max(left) − max(right)', why: 'Subtracting the largest right side gives a smaller result, not a larger one.' },
        { text: 'min(left) − min(right)', why: 'The left side should be as large as possible.' },
      ],
    },
    {
      know: 'For ×, the largest product can come from two large values or from two very negative ones.',
      ask: 'Which pairs must be tried for the largest product?',
      options: [
        { text: 'All four: max·max, max·min, min·max, min·min', right: true, why: 'Signs decide which wins, so try each pair of extremes and keep the largest.' },
        { text: 'Only max·max', why: '(−5) · (−5) beats 1 · 1 when those are the extremes.' },
        { text: 'Only min·min', why: 'With positive values, max·max wins.' },
      ],
    },
  ],

  'strange-printer': [
    {
      know: 'P(i, j) is the fewest turns for s[i..j]: print s[i] alone, 1 + P(i + 1, j), or stretch its turn to a later copy s[k] = s[i], P(i + 1, k − 1) + P(k, j).',
      ask: 's = "abab". What is the fewest turns?',
      args: ['abab'], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 prints each letter separately. One long a covering everything, then the two b’s, takes 3.' },
        { answer: 2, feedback: 'Whichever letter goes down first, the other letter’s two copies have the first letter between them, so one more turn can’t print both.' },
      ],
      explain: 'Print aaaa, then b at the second place and b at the fourth: 3.',
    },
    {
      know: 'Runs of the same letter can always be printed in one turn together.',
      ask: 'What simplification is safe before the table?',
      options: [
        { text: 'Collapse each run of equal letters into one letter', right: true, why: '"aaabbb" needs the same turns as "ab": any turn covering one letter of a run can cover all of it.' },
        { text: 'Remove every letter that appeared earlier anywhere', why: '"abab" would become "ab": 2 turns instead of 3. Only neighbouring repeats can be merged.' },
        { text: 'Sort the letters', why: 'Order matters: "abab" and "aabb" need different numbers of turns.' },
      ],
    },
    {
      know: 'A later turn covers what an earlier one printed.',
      ask: 'Why does the first letter’s turn matter most?',
      options: [
        { text: 'It can be printed first across a long stretch, and later turns print over its middle', right: true, why: 'So s[i] can share its turn with every later copy of the same letter, which is what the recurrence tries.' },
        { text: 'It is always the most common letter', why: 'Any letter may be first; it matters because its turn can be laid down first and extended.' },
        { text: 'It doesn’t; any letter can be handled first', why: 'The recurrence picks s[i] because an earliest turn can cover the whole range beneath later ones.' },
      ],
    },
  ],

  'remove-boxes': [
    {
      know: 'R(i, j, k) is the best for boxes i to j with k more boxes of box i’s colour waiting to join it: remove them now, or first clear a middle so box i joins a later same-colour box.',
      ask: 'Boxes [1, 2, 2, 1]. What is the most points?',
      args: [[1, 2, 2, 1]], answer: 8,
      misconceptions: [
        { answer: 6, feedback: '6 removes from the left: 1, then 2 2 (4), then 1. Removing the 2s first lets the two 1s join for 4.' },
      ],
      explain: 'Remove 2 2 (4); the 1s close up; remove 1 1 (4): 8.',
    },
    {
      know: 'Two boxes of the same colour can be removed together only if everything between them goes first.',
      ask: 'Why does the state need the extra index k?',
      options: [
        { text: 'The value of a range depends on how many same-colour boxes are waiting outside it to join', right: true, why: 'Removing k + 1 boxes earns (k + 1)², not k² + 1, so the boxes waiting change what a range is worth.' },
        { text: 'To count the turns', why: 'Turns aren’t limited; k tracks boxes waiting to join.' },
        { text: 'It doesn’t: two indices are enough', why: 'A range alone can’t know about boxes outside it, and they change its score.' },
      ],
    },
    {
      know: 'The squared score rewards removing large runs together.',
      ask: 'Is removing the longest run first always best?',
      options: [
        { text: 'Yes: it scores the most at once', why: 'Removing a short run in between can join two runs into one larger one, as the 2s do in the check above.' },
        { text: 'No: removing something else first can join two runs of one colour', right: true, why: '(a + b)² is more than a² + b², so joining runs is worth planning for.' },
        { text: 'Only if the run is of the most common colour', why: 'The choice depends on what can be joined, not on colour counts.' },
      ],
    },
  ],

  'k-partitions': [
    {
      know: 'D(k, i) is the cheapest way to cut the first i values into k segments: the best last cut j, D(k − 1, j) + (total of j to i)².',
      ask: 'a = [1, 2, 3, 4, 5], k = 2. What is the smallest sum of squared segment totals?',
      args: [[1, 2, 3, 4, 5], 2], answer: 117,
      misconceptions: [
        { answer: 153, feedback: '153 splits by count: [1, 2] and [3, 4, 5], totals 3 and 12. The totals should be close: 6 and 9.' },
      ],
      explain: '[1, 2, 3] and [4, 5]: 6² + 9² = 36 + 81 = 117.',
    },
    {
      know: 'Squaring punishes a large segment more than it rewards a small one.',
      ask: 'What does the squared cost prefer?',
      options: [
        { text: 'Segment totals as equal as possible', right: true, why: 'For a fixed total, a sum of squares is smallest when the parts are equal.' },
        { text: 'Segments with equal numbers of values', why: 'The cost reads totals, not counts, as the check above shows.' },
        { text: 'One large segment and the rest small', why: 'That makes the large square dominate, the most expensive choice.' },
      ],
    },
    {
      know: 'The table has k rows and n columns, and each cell tries up to n last cuts.',
      ask: 'How much work does it take?',
      options: [
        { text: 'About k · n² steps', right: true, why: 'k · n cells, each trying up to n cuts. Prefix sums make each segment total one subtraction.' },
        { text: 'About k · n steps', why: 'Each cell tries many last cuts, not one.' },
        { text: 'C(n − 1, k − 1), one per way to cut', why: 'That is how many ways there are; the table avoids listing them.' },
      ],
    },
  ],

  'partition-max': [
    {
      know: 'D(k, i) is the smallest possible largest segment total when the first i values are cut into k segments: the best last cut j, max(D(k − 1, j), total of j to i).',
      ask: 'a = [1, 2, 3, 4, 5], k = 2. What is the smallest possible largest segment total?',
      args: [[1, 2, 3, 4, 5], 2], answer: 9,
      misconceptions: [
        { answer: 10, feedback: '10 is [1, 2, 3, 4] against [5]. Moving the 4 across gives totals 6 and 9.' },
      ],
      explain: '[1, 2, 3] and [4, 5]: the larger total is 9. Half of 15 is 7.5, but no cut reaches it.',
    },
    {
      know: 'Here a segment’s cost is combined with max, not added.',
      ask: 'What changes from the k-partitions table?',
      options: [
        { text: 'max(D(k − 1, j), segment total) replaces D(k − 1, j) + segment total²', right: true, why: 'The largest segment so far is the larger of the earlier largest and the new one.' },
        { text: 'Nothing: the same table answers both', why: 'The two costs prefer different cuts in general; the combining rule differs.' },
        { text: 'The table needs a third index', why: 'k and i are still enough; only the rule changes.' },
      ],
    },
    {
      know: 'For a limit L, a greedy scan can check whether k segments, each with total at most L, are enough.',
      ask: 'What faster method does that suggest?',
      options: [
        { text: 'Binary search on L, checking each guess with the greedy scan', right: true, why: 'Larger limits never need more segments, so the smallest L that works can be found by bisection: n log(total) work.' },
        { text: 'Sort the values first', why: 'The segments must stay consecutive, so the order can’t change.' },
        { text: 'Divide the total by k', why: 'That is a lower bound, often not reachable: 7.5 in the check above.' },
      ],
    },
  ],

  'weighted-intervals': [
    {
      know: 'Sort jobs by end time. V(i) = max(V(i − 1), value_i + V(p(i))), where p(i) is the last job that ends by the time job i starts.',
      ask: 'Jobs (start, end, value): (0, 3, 5), (1, 2, 3), (2, 4, 4), (3, 5, 3). What is the largest total value?',
      args: [[[0, 3, 5], [1, 2, 3], [2, 4, 4], [3, 5, 3]]], answer: 8,
      misconceptions: [
        { answer: 7, feedback: '7 is greedy by earliest end: (1, 2) then (2, 4). That maximises the number of jobs, not their value.' },
        { answer: 12, feedback: '12 adds (0, 3), (2, 4) and (3, 5), but (2, 4) overlaps both.' },
      ],
      explain: '(0, 3) for 5 and (3, 5) for 3: 8. A job may start when another ends.',
    },
    {
      know: 'p(i) is the last job, in end order, that finishes by job i’s start.',
      ask: 'How is p(i) found quickly?',
      options: [
        { text: 'Binary search over the sorted end times', right: true, why: 'The ends are sorted, so the last one ≤ start_i takes log n steps. n log n in all.' },
        { text: 'It is always i − 1', why: 'Job i − 1 may overlap job i; p(i) can be much earlier.' },
        { text: 'Scan all jobs for each i', why: 'That works but takes n² in all; binary search is faster.' },
      ],
    },
    {
      know: 'When every job has value 1, the problem is to fit as many jobs as possible.',
      ask: 'What solves it then?',
      options: [
        { text: 'Greedy: always take the job that ends first among those that fit', right: true, why: 'With equal values, finishing early leaves the most room. With different values it can fail, as in the check above.' },
        { text: 'Greedy: the longest job first', why: 'Long jobs block the most others.' },
        { text: 'Only the table works', why: 'The table works, but the earliest-end greedy is exact for equal values.' },
      ],
    },
  ],

  'deadline-scheduling': [
    {
      know: 'Sort jobs by deadline. D(i, t) is the best reward from the first i jobs finishing by time t: skip job i, or run it last, ending at t, if t ≤ its deadline.',
      ask: 'Jobs (duration, reward, deadline): (2, 5, 2), (1, 2, 2), (2, 4, 4). What is the most reward?',
      args: [[[2, 5, 2], [1, 2, 2], [2, 4, 4]]], answer: 9,
      misconceptions: [
        { answer: 11, feedback: '11 is all three, but the first two both have deadline 2 and together need 3 units of time.' },
        { answer: 6, feedback: '6 takes the two short jobs, 2 + 4. The first job and the third fit together: 5 + 4.' },
      ],
      explain: 'Run (2, 5, 2) from 0 to 2, then (2, 4, 4) from 2 to 4: 5 + 4 = 9.',
    },
    {
      know: 'If a set of jobs can all meet their deadlines in some order, they can in deadline order.',
      ask: 'Why sort by deadline?',
      options: [
        { text: 'Then each chosen set only needs checking in one order, so the table can add jobs one at a time', right: true, why: 'Swapping two neighbouring jobs that are out of deadline order never makes a deadline fail, so deadline order is always safe.' },
        { text: 'Because the earliest deadline has the highest reward', why: 'Rewards and deadlines are unrelated.' },
        { text: 'To run the shortest jobs first', why: 'Sorting by deadline is not by length.' },
      ],
    },
    {
      know: 'The table’s time index runs up to the latest deadline.',
      ask: 'When would this table be too big?',
      options: [
        { text: 'When deadlines and durations are huge numbers, like a knapsack with huge capacity', right: true, why: 'The time axis is a capacity: the table is pseudo-polynomial.' },
        { text: 'When there are many jobs with equal deadlines', why: 'Ties don’t change the size; the time range does.' },
        { text: 'Never: it is always small', why: 'Deadlines in the millions make millions of columns.' },
      ],
    },
  ],

  'stock-states': [
    {
      know: 'Each day keeps two numbers: the best cash holding no share, and the best cash holding one. cash = max(cash, hold + price), hold = max(hold, cash − price).',
      ask: 'Prices [1, 5, 3, 6], as many trades as you like. What is the largest profit?',
      args: [[1, 5, 3, 6]], answer: 7,
      misconceptions: [
        { answer: 5, feedback: '5 is one trade, buy at 1 and sell at 6. Two trades catch both rises: 4 + 3.' },
      ],
      explain: 'Buy at 1, sell at 5; buy at 3, sell at 6: 4 + 3 = 7.',
    },
    {
      know: 'With unlimited trades, every rise from one day to the next can be captured.',
      ask: 'What simple sum gives the same answer?',
      options: [
        { text: 'The sum of every positive day-to-day rise', right: true, why: 'Holding through a run of rises earns the same as selling and rebuying each day.' },
        { text: 'The highest price minus the lowest', why: 'That is one trade, and the low may come after the high.' },
        { text: 'The sum of all day-to-day changes', why: 'That adds the falls too, giving last minus first.' },
      ],
    },
    {
      know: 'The states are what you hold at the end of a day.',
      ask: 'Why does the method need only two numbers per day?',
      options: [
        { text: 'Tomorrow’s choices depend only on whether you hold a share now, not on how you got here', right: true, why: 'Paths that reach the same state with less cash can be forgotten.' },
        { text: 'Because only two prices matter', why: 'Every price is read; the state is small, not the input.' },
        { text: 'It needs a table of all earlier days', why: 'Each day reads only the day before.' },
      ],
    },
  ],

  'stock-k': [
    {
      know: 'Keep cash[t] and hold[t] for each t ≤ k: the best with t completed trades so far. A sale moves hold[t − 1] to cash[t].',
      ask: 'Prices [1, 5, 3, 6], at most 1 trade. What is the largest profit?',
      args: [[1, 5, 3, 6], 1], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 uses two trades. With one, buy at 1 and sell at 6.' },
        { answer: 4, feedback: '4 sells at the first rise, at 5. Holding to 6 is better.' },
      ],
      explain: 'Buy at 1, sell at 6: 5.',
    },
    {
      know: 'n days allow at most ⌊n / 2⌋ trades that each make money.',
      ask: 'When does the limit k stop mattering?',
      options: [
        { text: 'When k ≥ ⌊n / 2⌋: then use the unlimited version', right: true, why: 'No more than that many separate rises can be traded, so the limit never binds.' },
        { text: 'When k ≥ 1', why: 'In the check above, 1 trade earns 5 and 2 trades earn 7.' },
        { text: 'Never', why: 'A limit larger than the possible number of trades can’t change anything.' },
      ],
    },
    {
      know: 'The state is (day, trades used, holding or not).',
      ask: 'How much work is the method?',
      options: [
        { text: 'About n · k steps', right: true, why: 'Each day updates 2 numbers for each t.' },
        { text: 'About n² steps', why: 'Each day reads only yesterday, so k is what multiplies n.' },
        { text: '2ⁿ, every buy and sell pattern', why: 'The states merge the patterns; they are never listed.' },
      ],
    },
  ],

  'stock-cooldown': [
    {
      know: 'Three states per day: holding, just sold (cooling down), and resting free to buy. After a sale you must skip a day before buying.',
      ask: 'Prices [1, 5, 3, 6], cooldown 1 day, no fee. What is the largest profit?',
      args: [[1, 5, 3, 6], 1, 0], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 sells at 5 and buys at 3 the next day, but that day is the cooldown.' },
        { answer: 4, feedback: '4 sells at 5 and stops. Holding to 6 earns 5 with no cooldown problem.' },
      ],
      explain: 'Buy at 1, sell at 6: 5. Selling at 5 rules out buying at 3.',
    },
    {
      know: 'A fee is paid on each sale, so every extra trade costs something.',
      ask: 'Prices [1, 5, 3, 6], no cooldown, fee 2 per sale. Which plan is best?',
      options: [
        { text: 'Either one trade (6 − 1 − 2) or two (4 − 2 + 3 − 2): both earn 3', right: true, why: 'Each extra trade must earn more than the fee; here the second rise of 3 just covers the cost of splitting.' },
        { text: 'Two trades, earning 7', why: '7 is the profit before fees; two trades pay two fees of 2.' },
        { text: 'No trades, since fees make every trade lose', why: 'A rise larger than the fee still earns money.' },
      ],
    },
    {
      know: 'The fee is paid once per completed trade.',
      ask: 'Where does the fee go in the recurrence?',
      options: [
        { text: 'Subtract it when selling: cash = max(cash, hold + price − fee)', right: true, why: 'Charging it once per sale (or once per buy) charges each trade once.' },
        { text: 'Subtract it every day you hold', why: 'That would be a holding cost, not a fee per trade.' },
        { text: 'Subtract it at both the buy and the sale', why: 'That charges each completed trade twice, once on each side.' },
      ],
    },
  ],

  'batch-scheduling': [
    {
      know: 'B(i) is the cheapest way to run the first i jobs: the best last batch j..i, B(j) + setup + (total length of j to i)².',
      ask: 'Lengths [1, 1, 1, 1], setup 3. What is the cheapest total?',
      args: [[1, 1, 1, 1], 3], answer: 14,
      misconceptions: [
        { answer: 19, feedback: '19 is one batch: 3 + 4². Splitting into two batches costs 2·3 + 2² + 2².' },
        { answer: 16, feedback: '16 runs each job alone: 4 setups of 3 plus 4 · 1². Two batches of two cost less.' },
      ],
      explain: 'Two batches of two: (3 + 4) + (3 + 4) = 14.',
    },
    {
      know: 'A bigger setup fee makes every extra batch cost more.',
      ask: 'As the setup fee grows, what happens to the best plan?',
      options: [
        { text: 'It uses fewer, larger batches', right: true, why: 'Each batch saved saves a fee, at the price of a larger square.' },
        { text: 'It uses more batches', why: 'More batches mean more fees, which a larger fee punishes more.' },
        { text: 'Nothing changes', why: 'The fee is paid per batch, so it changes the balance.' },
      ],
    },
    {
      know: 'Each B(i) tries every last batch start j.',
      ask: 'How much work does the table take for n jobs?',
      options: [
        { text: 'About n²/2 steps, with prefix sums for the totals', right: true, why: 'n cells, each trying up to n starts. Convex-hull tricks can make it nearly linear for this cost.' },
        { text: 'About n steps', why: 'Each cell tries many starts, not one.' },
        { text: '2ⁿ⁻¹, every way to cut', why: 'The table avoids listing the cuts.' },
      ],
    },
  ],

  'text-justification': [
    {
      know: 'J(i) is the cheapest way to set words i onward: try every number of words on the next line that fits, (unused)² + J(next). The last line is free.',
      ask: 'Words of lengths [3, 1, 2, 4], width 6. What is the cheapest total?',
      args: [[3, 1, 2, 4], 6], answer: 13,
      misconceptions: [
        { answer: 17, feedback: '17 is greedy: as many words as fit on each line, "3 1" (unused 1), then "2" alone (unused 4). Putting the 1 with the 2 balances the lines.' },
      ],
      explain: '"3" (unused 3 → 9), "1 2" (unused 2 → 4), "4" (last, free): 13.',
    },
    {
      know: 'Greedy filling minimises the number of lines.',
      ask: 'Why does the squared cost beat greedy filling?',
      options: [
        { text: 'Squares make one very loose line cost more than two slightly loose ones', right: true, why: '3² + 2² = 13 is less than 1² + 4² = 17, though both leave 5 spaces in all.' },
        { text: 'Greedy uses more lines', why: 'Greedy uses the fewest lines; the squared cost prefers evenness.' },
        { text: 'It doesn’t; greedy is always optimal', why: 'The check above has greedy at 17 and the best at 13.' },
      ],
    },
    {
      know: 'The last line is free, however much space it leaves.',
      ask: 'Why is the last line free?',
      options: [
        { text: 'A paragraph’s last line is normally left short, and charging it would push words up awkwardly', right: true, why: 'Without the rule, the method would squeeze the final words onto earlier lines just to fill the last.' },
        { text: 'Because the last line always fits exactly', why: 'It usually doesn’t; it is free by convention.' },
        { text: 'To make the table smaller', why: 'It changes the cost of one case, not the table’s size.' },
      ],
    },
  ],

  'segmented-regression': [
    {
      know: 'S(i) is the cheapest way to fit the first i points: the best last segment j..i, S(j) + penalty + the squared error of the best line through points j to i.',
      ask: 'y = [0, 1, 2, 3, 10, 11] at x = 0 … 5, penalty 4 per segment. What is the cheapest total?',
      args: [[0, 1, 2, 3, 10, 11], 4], answer: 8,
      misconceptions: [
        { answer: 0, feedback: '0 is the error of two perfect lines, but each segment also pays the penalty of 4.' },
        { answer: 4, feedback: '4 is one segment’s penalty, but one straight line through all six points misses the jump: its squared error is about 15.' },
      ],
      explain: 'Two segments, 0 1 2 3 and 10 11, each on a perfect line: 4 + 4 = 8.',
    },
    {
      know: 'The penalty is paid once for every segment.',
      ask: 'What happens with a penalty of 0?',
      options: [
        { text: 'Every point can be its own segment, with error 0, so the fit says nothing', right: true, why: 'The penalty is what stops the method from overfitting.' },
        { text: 'It finds the true number of segments', why: 'With no cost per segment, more segments always fit at least as well.' },
        { text: 'It uses one segment', why: 'One segment has the most error; with no penalty, more always win.' },
      ],
    },
    {
      know: 'The squared error of a best-fit line through points j to i can be found from running sums of x, y, x², xy and y².',
      ask: 'Why keep those running sums?',
      options: [
        { text: 'Each segment’s error then costs constant time, so the table takes n² in all', right: true, why: 'Without them, fitting each of the n² segments costs up to n, making the method n³.' },
        { text: 'To check the answer', why: 'They are what makes each segment’s error fast to compute.' },
        { text: 'Because the points are sorted', why: 'They are sorted by x already; the sums are about speed.' },
      ],
    },
  ],
}
