// "Check yourself" for the split-point lessons (Expert, opt-splits group). Format and checks: checks.js
// and checks.test.js; the numbers come from expert-oracles.js. cht-numeric's answers are strings, so its
// number check reads them as numbers (oracle cht-numeric-number).

export const SPLIT_CHECKS = {
  'monge': [
    {
      know: 'A matrix is Monge when every square of neighbouring cells has slack 0 or more: crossed pair minus diagonal pair.',
      ask: 'Is [[0, 1, 2], [1, 0, 0], [2, 0, 3]] Monge?',
      kind: 'yesno', args: [[[0, 1, 2], [1, 0, 0], [2, 0, 3]]], answer: false,
      misconceptions: [{ answer: true, feedback: 'The first three squares pass, but the bottom-right one has slack (0 + 0) − (0 + 3) = −3.' }],
      explain: 'No. The square at rows 1–2, columns 1–2 has slack (0 + 0) − (0 + 3) = −3.',
    },
    {
      know: 'For one rectangle, the slack is A(i, l) + A(k, j) − A(i, j) − A(k, l), for rows i < k and columns j < l.',
      ask: 'Why does checking only neighbouring squares cover every rectangle?',
      options: [
        { text: 'Adding the slacks of the squares inside a rectangle, the inner entries cancel and leave the rectangle’s slack', right: true, why: 'So if every square’s slack is 0 or more, every rectangle’s is a sum of non-negative numbers.' },
        { text: 'Because a larger rectangle’s slack is always at least as large as a square’s', why: 'It is the sum of the squares’ slacks, which may be negative; it is not always larger.' },
        { text: 'It doesn’t: rectangles must be checked one by one', why: 'The sum of the squares’ slacks is exactly the rectangle’s, so the squares settle it.' },
      ],
    },
    {
      know: 'In a DP, the matrix is often D(k) + C(k, j): a previous value plus a transition cost.',
      ask: 'If C is Monge, is D(k) + C(k, j) Monge too?',
      options: [
        { text: 'Yes: a term that depends on one index only cancels out of every slack', right: true, why: 'D(k) appears once with + and once with − in each slack, so the slacks are C’s.' },
        { text: 'Only if D is increasing', why: 'D cancels from every slack whatever its values are.' },
        { text: 'No: adding anything can break the inequality', why: 'Adding a term that depends on a single index leaves every slack unchanged.' },
      ],
    },
  ],

  'divide-conquer-opt': [
    {
      know: 'D(l, j) = min over k of D(l − 1, k) + (P[j] − P[k])², and the best cut never moves left as j grows.',
      ask: 'Values 3, 1, 1, 3 into 2 groups. What is the smallest total of the groups’ sums squared?',
      args: [[3, 1, 1, 3], 2], answer: 32,
      misconceptions: [
        { answer: 34, feedback: '34 cuts after the first value: 9 + 25. Cutting in the middle gives 16 + 16.' },
      ],
      explain: '3 1 | 1 3: 16 + 16 = 32.',
    },
    {
      know: 'Each row is filled middle first, and each level of the recursion scans about n cuts in all.',
      ask: 'What does the whole DP cost with n numbers and g groups?',
      options: [
        { text: 'O(g · n log n)', right: true, why: 'Each row is a recursion of depth log n whose levels each scan about n cuts.' },
        { text: 'O(g · n²)', why: 'That is every cut for every end, which the bounds avoid.' },
        { text: 'O(n log n)', why: 'Each of the g rows needs its own pass.' },
      ],
    },
    {
      know: 'The recursion for row l reads only row l − 1.',
      ask: 'Why must row l − 1 be complete before row l starts?',
      options: [
        { text: 'The middle end may need any cut in its range, and every one reads a cell of row l − 1', right: true, why: 'The order of row l jumps around, so all of row l − 1 must already be there.' },
        { text: 'It needn’t: the two rows can be filled together, left to right', why: 'Row l is filled middle first, so it can read any cell of row l − 1 early on.' },
        { text: 'Because row l overwrites row l − 1', why: 'Two rows are kept; nothing is overwritten while row l is filled.' },
      ],
    },
  ],

  'knuth': [
    {
      know: 'D(i, j) = size(i … j) + min over k of D(i, k) + D(k + 1, j), trying only k between opt(i, j − 1) and opt(i + 1, j).',
      ask: 'Piles 1, 2, 3, 4. What is the cheapest total cost of merging them into one?',
      args: [[1, 2, 3, 4]], answer: 19,
      misconceptions: [
        { answer: 20, feedback: '20 merges 1 2 and 3 4 first: 3 + 7 + 10. Merging left to right is cheaper here.' },
      ],
      explain: '1 + 2 = 3, then 3 + 3 = 6, then 6 + 4 = 10: 3 + 6 + 10 = 19.',
    },
    {
      know: 'For one interval length, the ranges opt(i, j − 1) … opt(i + 1, j) of neighbouring intervals meet end to end.',
      ask: 'What does Knuth’s optimization cost for n piles?',
      options: [
        { text: 'O(n²): each length’s ranges add up to about n', right: true, why: 'The ranges telescope: their total length per interval length is O(n), and there are n lengths.' },
        { text: 'O(n³)', why: 'That is trying every split of every interval, which the bounds avoid.' },
        { text: 'O(n log n)', why: 'There are n² / 2 intervals, and each needs at least one step.' },
      ],
    },
    {
      know: 'The bound opt(i, j − 1) ≤ opt(i, j) ≤ opt(i + 1, j) needs the cost to satisfy the quadrangle inequality and grow with the interval.',
      ask: 'Can Knuth’s bound be used for any interval DP?',
      options: [
        { text: 'No: only when the cost meets those conditions, as merge costs (interval sums) do', right: true, why: 'Without them the best split can jump outside the bounds, and the answer is wrong.' },
        { text: 'Yes: best splits always move right', why: 'For arbitrary costs they need not; the conditions are what makes them move.' },
        { text: 'Only when every pile has the same size', why: 'Any non-negative pile sizes work: interval sums satisfy the conditions.' },
      ],
    },
  ],

  'smawk': [
    {
      know: 'Each house uses the well minimizing w[j] + (x[i] − y[j])²; SMAWK finds every row minimum of that matrix.',
      ask: 'Houses at 0, 2, 4; wells at 1 (costs 0) and 3 (costs 5). What is the total?',
      args: [[0, 2, 4], [1, 3], [0, 5]], answer: 8,
      misconceptions: [
        { answer: 3, feedback: '3 ignores the well costs: house 4 at well 3 pays 5 + 1 = 6, not 1.' },
      ],
      explain: 'House 0: well 1, 1. House 2: well 1, 1. House 4: well 1 costs 9, well 3 costs 5 + 1 = 6. Total 8.',
    },
    {
      know: 'SMAWK needs total monotonicity: monotone row minima in every submatrix, not only in the whole matrix.',
      ask: 'Is it enough that the whole matrix’s row minima move right?',
      options: [
        { text: 'No: deleting a column can reveal minima that move left, and SMAWK deletes columns', right: true, why: 'Reduce and the recursion work on submatrices, so they need the property there too.' },
        { text: 'Yes: SMAWK only looks at the whole matrix', why: 'It works on submatrices after reduce drops columns and the recursion drops rows.' },
        { text: 'Yes, if the minima are unique', why: 'Unique minima don’t stop a submatrix from having minima that move left.' },
      ],
    },
    {
      know: 'Reduce keeps at most one column per row, and the other rows scan only between their neighbours’ minima.',
      ask: 'How many matrix entries does SMAWK look at for r rows and c columns?',
      options: [
        { text: 'O(r + c)', right: true, why: 'Reduce costs O(c) the first time and O(r) after; the scans are linear; the rows halve each level.' },
        { text: 'O(r · c)', why: 'That is every entry, which SMAWK never needs.' },
        { text: 'O((r + c) log r)', why: 'That is the simpler divide-and-conquer method; SMAWK removes the log.' },
      ],
    },
  ],

  'cht': [
    {
      know: 'D(i) = min over j of D(j) + (P[i] − P[j])² + M; each j is a line read at x = P[i].',
      ask: 'Four words of length 1 and M = 5. What is the cheapest total?',
      args: [[1, 1, 1, 1], 5], answer: 18,
      misconceptions: [
        { answer: 21, feedback: '21 puts all four on one line: 16 + 5. Two lines of two cost 9 + 9.' },
        { answer: 24, feedback: '24 puts each word alone: 4 × (1 + 5). Pairs share the M.' },
      ],
      explain: 'Two lines of two words: (4 + 5) + (4 + 5) = 18.',
    },
    {
      know: 'The line for j uses D(j), and the hull only grows as i moves right.',
      ask: 'When may j’s line be added to the hull?',
      options: [
        { text: 'Once D(j) is final, before any later end is queried', right: true, why: 'The intercept is D(j) + P[j]², so the line is only right once D(j) is known.' },
        { text: 'At the start, for every j at once', why: 'D(j) isn’t known at the start; its line can’t be drawn yet.' },
        { text: 'Only after the last query', why: 'Later ends need it: the line must be in the hull before they are queried.' },
      ],
    },
    {
      know: 'The hull keeps lines in falling order of slope; a query binary-searches it.',
      ask: 'What does each step cost with n words?',
      options: [
        { text: 'O(log n) per query; each line is added and removed at most once', right: true, why: 'Binary search over the hull, plus amortized O(1) to keep it.' },
        { text: 'O(n) per query', why: 'That is trying every earlier j, which the hull replaces.' },
        { text: 'O(1) per query, whatever order the queries come in', why: 'O(1) needs the queries in order, for a pointer; in any order, binary search is needed.' },
      ],
    },
  ],

  'monotone-cht': [
    {
      know: 'D(i) = max over j of D(j) + f(P[i] − P[j]), with f(S) = a·S² + b·S + c.',
      ask: 'Strengths 1, 2, 1 and f(S) = −S² + 6S − 5. What is the best total?',
      args: [[1, 2, 1], -1, 6, -5], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 is one group of strength 4, or each soldier alone (0 + 3 + 0). 1 2 | 1 gives f(3) + f(1) = 4.' },
      ],
      explain: 'Groups 1 2 and 1: f(3) + f(1) = 4 + 0 = 4.',
    },
    {
      know: 'The pointer moves forward past a line once the next one is at least as good at the current query.',
      ask: 'May the pointer move back if a later query is smaller?',
      options: [
        { text: 'No: the lines it passed may be gone, and the argument for passing them assumed rising queries', right: true, why: 'A smaller query lies on the other side of an earlier crossing, where a passed line may win.' },
        { text: 'Yes: the lines behind it are all still in the hull', why: 'Lines behind the pointer may be popped or ignored; nothing keeps them valid.' },
        { text: 'Yes: moving back is the same as binary search', why: 'Binary search needs the whole hull kept; the pointer method throws lines away.' },
      ],
    },
    {
      know: 'Each line is pushed once, popped at most once, and passed by the pointer at most once.',
      ask: 'What does the whole DP cost for n soldiers?',
      options: [
        { text: 'O(n) in all', right: true, why: 'Every push, pop and pointer step happens at most once per line.' },
        { text: 'O(n log n)', why: 'No search is needed: the pointer replaces binary search.' },
        { text: 'O(n²)', why: 'That is trying every group start, which the hull replaces.' },
      ],
    },
  ],

  'li-chao': [
    {
      know: 'D(i) = min over j of D(j) + (h[i] − h[j])² + C; the Li Chao tree holds the lines for every earlier j.',
      ask: 'Heights 3, 0, 4 and C = 1. What is the cheapest way to the last stone?',
      args: [[3, 0, 4], 1], answer: 2,
      misconceptions: [
        { answer: 27, feedback: '27 lands on every stone: (9 + 1) + (16 + 1). Jumping straight from 3 to 4 costs 1 + 1.' },
      ],
      explain: '3 → 4 directly: 1 + 1 = 2.',
    },
    {
      know: 'At a node, the line lower at the middle stays; the other may continue to one child.',
      ask: 'Why does the losing line go to one side only?',
      options: [
        { text: 'Two lines cross at most once, so the loser can be lower on one side of the middle only', right: true, why: 'Their difference is linear and changes sign at most once.' },
        { text: 'Because the tree has room for one line per node', why: 'The reason is geometric: the loser can’t win on both sides.' },
        { text: 'It goes to both sides, to be safe', why: 'It can win on one side at most, so sending it to both is wasted work.' },
      ],
    },
    {
      know: 'A query walks from the root to the leaf for x, comparing the line stored at each node it passes.',
      ask: 'What does a query cost over heights 0 … U?',
      options: [
        { text: 'O(log U): one root-to-leaf path', right: true, why: 'The tree has depth log U, and each node holds one line.' },
        { text: 'O(number of lines)', why: 'Only the lines on one path are compared.' },
        { text: 'O(1)', why: 'The path has log U nodes, each with a line to compare.' },
      ],
    },
  ],

  'cht-numeric': [
    {
      know: 'The frog DP is the same; only the arithmetic changes, to exact integers.',
      ask: 'Heights 0, 2, 5, 6 and C = 1. What is the cheapest way to the last stone?',
      args: [[0, 2, 5, 6], 1], answer: 17, oracle: 'cht-numeric-number',
      misconceptions: [
        { answer: 37, feedback: '37 jumps straight from 0 to 6: 36 + 1. Every stone is worth landing on.' },
      ],
      explain: '0 → 2 → 5 → 6: (4 + 1) + (9 + 1) + (1 + 1) = 17.',
    },
    {
      know: 'Two fractions with positive denominators compare by cross-multiplying: p/q < r/s exactly when p·s < r·q.',
      ask: 'Is 2/3 less than 3/4?',
      options: [
        { text: 'Yes: 2 · 4 = 8 is less than 3 · 3 = 9', right: true, why: 'Cross-multiplying with positive denominators keeps the order, with no rounding.' },
        { text: 'No: 2 · 3 = 6 is less than 3 · 4 = 12, so 2/3 is larger', why: 'Each numerator is multiplied by the other fraction’s denominator: 2 · 4 against 3 · 3.' },
        { text: 'They can’t be compared exactly without dividing', why: 'Cross-multiplying compares them exactly, in integers.' },
      ],
    },
    {
      know: 'Cross-multiplication keeps the order only when both denominators are positive.',
      ask: 'How is −1/−3 compared with 1/4?',
      options: [
        { text: 'First write −1/−3 as 1/3; then 1 · 4 = 4 is more than 1 · 3 = 3, so it is larger', right: true, why: 'Flipping both signs makes the denominator positive without changing the value.' },
        { text: 'Cross-multiply as written: −1 · 4 = −4 is less than 1 · −3 = −3, so it is smaller', why: 'A negative denominator flips the inequality; −1/−3 = 1/3 is larger than 1/4.' },
        { text: 'Divide both and compare the decimals', why: 'That works here but rounds in general; normalizing the sign keeps it exact.' },
      ],
    },
  ],

  'lagrangian': [
    {
      know: 'Charge λ per segment, find the smallest λ whose best uses at most k segments, and add λ·k back.',
      ask: 'Values 4, −1, 2, −3, 5 and k = 2. What is the largest total of exactly 2 non-overlapping subarrays?',
      args: [[4, -1, 2, -3, 5], 2], answer: 10,
      misconceptions: [
        { answer: 9, feedback: '9 takes 4 and 5 alone. 4 −1 2 is worth 5, more than 4 alone.' },
        { answer: 7, feedback: '7 is one subarray, all five values. Two are required.' },
      ],
      explain: '[4, −1, 2] and [5]: 5 + 5 = 10.',
    },
    {
      know: 'Suppose the best totals for 1, 2 and 3 groups cost 10, 6 and 5 (smaller is better), and each group is charged a penalty.',
      ask: 'With a penalty of 5 per group, which count wins?',
      options: [
        { text: '1: the totals are 15, 16 and 20', right: true, why: 'Each count pays 5 per group: 10 + 5, 6 + 10, 5 + 15.' },
        { text: '2: it was the best middle choice before', why: 'With the penalty, 6 + 10 = 16 loses to 10 + 5 = 15.' },
        { text: '3: it has the smallest cost', why: 'Its penalty is 15, giving 20, the worst.' },
      ],
    },
    {
      know: 'The relaxed answer touches f(k) only if f has a supporting line there: f must be concave (for a maximum).',
      ask: 'What goes wrong when f(k) is not concave?',
      options: [
        { text: 'Some k is never chosen at any penalty, so its exact answer can’t be read off', right: true, why: 'A k below the hull of f is skipped as λ passes it: no penalty makes it optimal.' },
        { text: 'Nothing: the binary search finds every k', why: 'The search finds a penalty, but a k off the hull is never the relaxed optimum.' },
        { text: 'The relaxed DP becomes slower', why: 'Each probe still costs O(n); the problem is correctness, not speed.' },
      ],
    },
  ],

  'slope-trick': [
    {
      know: 'Push each value; if the largest breakpoint t is above it, pay t minus the value, pop t and push the value again.',
      ask: 'Values 4, 2, 3, 1. What is the cheapest way to make them never decrease?',
      args: [[4, 2, 3, 1]], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 raises every value to 4, the largest before it: 2 + 1 + 3. Meeting in the middle is cheaper.' },
      ],
      explain: 'For example 2, 2, 3, 3: 2 + 0 + 0 + 2 = 4, or 3, 3, 3, 3: 1 + 1 + 0 + 2 = 4.',
    },
    {
      know: 'The cost of moving one point to x is |x − a|, a convex function with a breakpoint at a.',
      ask: 'What is the smallest value of |x − 1| + |x − 7| over all x?',
      options: [
        { text: '6, at any x from 1 to 7', right: true, why: 'Between the breakpoints the slopes cancel and the sum is 7 − 1; outside, it grows.' },
        { text: '0, at x = 4', why: 'At 4 the sum is 3 + 3 = 6, not 0; no x is at both 1 and 7.' },
        { text: '3, at x = 4', why: 'That is one of the two distances; both are added.' },
      ],
    },
    {
      know: 'Each value is pushed once, and at most one breakpoint is popped and pushed back per value.',
      ask: 'What does the method cost for n values?',
      options: [
        { text: 'O(n log n)', right: true, why: 'A constant number of heap operations per value, each O(log n).' },
        { text: 'O(n · the largest value)', why: 'That is the table over every value, which the breakpoints replace.' },
        { text: 'O(n²)', why: 'Each value does a few heap operations, never a scan of the others.' },
      ],
    },
  ],

  'cdq': [
    {
      know: 'B(i) = 1 + the largest B(j) over earlier j with smaller x and smaller y.',
      ask: 'Points in order: (1, 3), (2, 2), (3, 1), (1, 1), (2, 2), (3, 3). How long is the longest chain?',
      args: [[1, 2, 3, 1, 2, 3], [3, 2, 1, 1, 2, 3]], answer: 3,
      misconceptions: [
        { answer: 1, feedback: '1 looks only at the first three points, which fall in y. The last three rise in both.' },
      ],
      explain: '(1, 1), (2, 2), (3, 3), the last three points.',
    },
    {
      know: 'The dependencies run from earlier points to later ones only.',
      ask: 'May a later point improve an earlier point’s value?',
      options: [
        { text: 'No: a chain is in arrival order, so B(i) reads only earlier points', right: true, why: 'That is why the left half can be finished before the right half starts.' },
        { text: 'Yes, if it has smaller x and y', why: 'The chain must follow arrival order; a later point can only come after.' },
        { text: 'Yes, in the second half of the recursion', why: 'The recursion never sends values backwards in time.' },
      ],
    },
    {
      know: 'Each level of the recursion sorts and sweeps n points with a Fenwick tree over y.',
      ask: 'What does CDQ cost for n points?',
      options: [
        { text: 'O(n log² n): log n levels, each O(n log n)', right: true, why: 'The sweeps and the Fenwick operations cost n log n per level.' },
        { text: 'O(n²)', why: 'That is checking every earlier point, which the sweeps replace.' },
        { text: 'O(n)', why: 'The sorting and the Fenwick tree each add log factors.' },
      ],
    },
  ],

  'online-convolution': [
    {
      know: 'a(m) = the sum over i < m of a(i)·b(m − i), with a(0) = 1.',
      ask: 'b(1) = 1, b(2) = 2, every other b(d) = 0, and a(0) = 1. What is a(4)?',
      args: [[0, 1, 2], 4], answer: 11,
      misconceptions: [
        { answer: 5, feedback: '5 treats b(2) as 1, which gives Fibonacci numbers. Here b(2) = 2.' },
      ],
      explain: 'a = 1, 1, 3, 5, 11: each term is the one before plus twice the one before that.',
    },
    {
      know: 'An ordinary convolution needs both sequences known before it starts.',
      ask: 'Why can’t a be found with one convolution of a and b?',
      options: [
        { text: 'a’s later terms depend on its earlier ones, which aren’t known when it starts', right: true, why: 'Each a(m) needs every earlier a(i) first, so they must be finished in order.' },
        { text: 'Because b is too short', why: 'The length of b doesn’t matter; a is the unknown input.' },
        { text: 'It can: convolve once, then read off a(n)', why: 'The convolution would need a itself as an input, before a is known.' },
      ],
    },
    {
      know: 'Each level of the recursion convolves finished left halves with b, using an FFT.',
      ask: 'What does the method cost for n terms, with an FFT at each merge?',
      options: [
        { text: 'O(n log² n)', right: true, why: 'log n levels, each with convolutions of total size n, costing n log n.' },
        { text: 'O(n²)', why: 'That is adding every pair one by one, which the FFT replaces.' },
        { text: 'O(n log n)', why: 'There is one FFT pass per level, and there are log n levels.' },
      ],
    },
  ],
}
