// "Design it yourself" for the split-point lessons (Expert, opt-splits group). Format: designs.js.
// Lessons with a live table ask for one of its cells; smawk, cht-numeric and lagrangian (no table) ask a
// second hand-solved case. Every number was printed by expert-oracles.js before it was typed;
// cht-numeric's answers are strings, read as numbers (PICK in designs.test.js).

export const SPLIT_DESIGNS = {
  'monge': {
    problem: 'Decide whether a matrix is Monge: for every pair of rows and pair of columns, the diagonal pair costs no more than the crossed pair. Checking every rectangle of a 300 × 300 matrix is too slow.',
    tryFirst: {
      prompt: 'Is the matrix [[3, 1], [1, 3]] Monge? That is: is A(0,0) + A(1,1) ≤ A(0,1) + A(1,0)?',
      kind: 'yesno', args: [[[3, 1], [1, 3]]], answer: false,
      misconceptions: [{ answer: true, feedback: 'The diagonal pair 3 + 3 = 6 costs more than the crossed pair 1 + 1 = 2.' }],
      explain: 'No: the diagonal pair, 3 + 3 = 6, costs more than the crossed pair, 1 + 1 = 2.',
    },
    steps: [
      { kind: 'state', ask: 'What is worked out for each 2 × 2 square of neighbouring cells?', options: [
        { text: 'Its slack: the crossed pair minus the diagonal pair', right: true, why: 'Monge says the diagonal pair never costs more than the crossed pair: every slack is 0 or more.' },
        { text: 'The difference between neighbouring entries in a row', why: 'That says whether a row rises, not how two rows compare across two columns.' },
      ] },
      { kind: 'split', ask: 'Why are the squares of neighbouring cells enough?', options: [
        { text: 'A rectangle’s slack is the sum of the slacks of the squares inside it', right: true, why: 'Adding the squares’ slacks, the inner entries cancel and leave the rectangle’s; if each is 0 or more, so is the sum.' },
        { text: 'Rectangles larger than 2 × 2 never have a negative slack', why: 'They can, but only when some square inside them has one too.' },
      ] },
      { kind: 'recurrence', ask: 'When is the matrix Monge?', options: [
        { text: 'When every square’s slack is 0 or more', right: true, why: 'Then every rectangle’s slack, a sum of them, is 0 or more as well.' },
        { text: 'When the slacks add up to 0 or more', why: 'One negative square is a rectangle that fails, whatever the others add up to.' },
      ] },
      { kind: 'base', ask: 'What about a matrix with one row or one column?', options: [
        { text: 'It is Monge: it has no rectangles that could fail', right: true, why: 'The condition is about every rectangle, and with none it holds.' },
        { text: 'It is not Monge: there is nothing to prove it with', why: 'The condition only forbids failing rectangles; with none, nothing fails.' },
      ] },
      { kind: 'order', ask: 'In what order are the squares checked?', options: [
        { text: 'Any order, stopping at the first negative slack', right: true, why: 'Each square is checked on its own, and one failure decides the answer.' },
        { text: 'Row by row, keeping a running total of the slacks', why: 'A running total lets a large slack hide a negative one.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Yes if no slack is negative', right: true, why: 'Every square passing means every rectangle passes.' },
        { text: 'Yes if the bottom-right square’s slack is 0 or more', why: 'One square says nothing about the others.' },
      ] },
    ],
    apply: { cell: [3, 1], misconceptions: [
      { answer: -2, feedback: '−2 is the diagonal pair minus the crossed pair: the slack is crossed minus diagonal.' },
      { answer: 6, feedback: '6 adds all four entries; the slack subtracts the diagonal pair from the crossed pair.' },
    ] },
  },

  'divide-conquer-opt': {
    problem: 'Cut a list of non-negative numbers into exactly g consecutive groups, each costing its sum squared, when trying every cut for every end is too slow.',
    tryFirst: {
      prompt: 'Values 4, 1, 1, 2 into 2 groups. What is the smallest total of the groups’ sums squared?',
      args: [[4, 1, 1, 2], 2], answer: 32,
      misconceptions: [
        { answer: 34, feedback: '34 cuts in the middle, 4 1 | 1 2: 25 + 9. Cutting after the 4 gives 16 + 16.' },
      ],
      explain: '4 alone, then 1, 1, 2: 16 + 16 = 32.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell mean?', options: [
        { text: 'D(l, j): the cheapest way to cut the first j numbers into l groups', right: true, why: 'The group count must come out exactly g, so it is part of the state.' },
        { text: 'D(j): the cheapest way to cut the first j numbers into any number of groups', why: 'Without the count, nothing makes the answer use exactly g groups.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The cut k where the last group starts: it holds numbers k to j − 1', right: true, why: 'Every cutting has a last group, and what comes before it is a smaller cutting.' },
        { text: 'The size of the largest group', why: 'That doesn’t say where the earlier groups end, so no smaller state is reached.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(l, j)?', options: [
        { text: 'min over k of D(l − 1, k) + (P[j] − P[k])²', right: true, why: 'The first k numbers in l − 1 groups, then one group of the rest, costing its sum squared.' },
        { text: 'D(l − 1, j − 1) + a[j − 1]²', why: 'That always makes the last group a single number.' },
      ] },
      { kind: 'base', ask: 'What is row 0, no groups?', options: [
        { text: 'D(0, 0) = 0 and D(0, j) = ∞ for j > 0', right: true, why: 'With no groups, only the empty prefix is possible.' },
        { text: 'D(0, j) = 0 for every j', why: 'Numbers left over with no groups would be free, so groups could skip numbers.' },
      ] },
      { kind: 'order', ask: 'Within one row, in what order are the ends j filled?', options: [
        { text: 'The middle end first, over its whole cut range; then the left half with cuts up to its best, the right half with cuts from it', right: true, why: 'The best cut never moves left as the end moves right, so each answer bounds both halves: O(n log n) per row.' },
        { text: 'The middle end first; then the left half with cuts from its best onward', why: 'Ends to the left have their best cuts at or before the middle’s, never after.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(g, n)', right: true, why: 'All n numbers in exactly g groups.' },
        { text: 'The smallest D(l, n) over every l', why: 'The number of groups is fixed at g.' },
      ] },
    ],
    apply: { cell: [2, 5], misconceptions: [
      { answer: 153, feedback: '153 takes the first cut in the range, 2. Every cut from 2 to 4 is tried: cut 3 gives 117.' },
      { answer: 225, feedback: '225 is D(1,5), one group. This row has 2 groups: D(1, k) plus one more.' },
    ] },
  },

  'knuth': {
    problem: 'Merge neighbouring piles two at a time into one, each merge costing the size of the pile it makes, for up to 1 024 piles, where trying every split of every interval is too slow.',
    tryFirst: {
      prompt: 'Piles 3, 1, 1, 3. What is the cheapest total cost of merging them into one?',
      args: [[3, 1, 1, 3]], answer: 15,
      misconceptions: [
        { answer: 16, feedback: '16 merges the outer pairs first, 3 1 and 1 3: 4 + 4 + 8. Merging the two 1s first is cheaper.' },
      ],
      explain: '1 + 1 = 2, then 3 + 2 = 5, then 5 + 3 = 8: 2 + 5 + 8 = 15.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell mean?', options: [
        { text: 'D(i, j): the cheapest way to merge piles i to j into one', right: true, why: 'The last merge joins two neighbouring parts, each an interval of piles.' },
        { text: 'D(j): the cheapest way to merge the first j piles', why: 'The last merge’s right part doesn’t start at the first pile, so prefixes are not enough.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The split k: the last merge joins i … k and k + 1 … j', right: true, why: 'Each part was merged into one pile on its own before the last merge.' },
        { text: 'Which two piles are merged first', why: 'After the first merge, the piles left are not an interval of the original row: no smaller state.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(i, j)?', options: [
        { text: 'size(i … j) + min over k of D(i, k) + D(k + 1, j)', right: true, why: 'The two parts’ costs, plus the last merge, which costs every stone in the interval.' },
        { text: 'min over k of D(i, k) + D(k + 1, j)', why: 'The last merge costs the interval’s size; leaving it out makes every cost 0.' },
      ] },
      { kind: 'base', ask: 'What is a single pile worth?', options: [
        { text: 'D(i, i) = 0, and its best split opt(i, i) = i', right: true, why: 'A single pile needs no merge, so it costs nothing.' },
        { text: 'D(i, i) = the pile’s size', why: 'A single pile needs no merge; its size is paid by the merges that use it.' },
      ] },
      { kind: 'order', ask: 'Intervals go shortest first. Which splits does D(i, j) try?', options: [
        { text: 'Only k from opt(i, j − 1) to opt(i + 1, j)', right: true, why: 'Knuth’s bound: the best split lies between the best splits of the two shorter intervals, and the ranges add up to O(n) per length.' },
        { text: 'Only k = opt(i, j − 1)', why: 'The best split can move right as j grows; the whole range between the bounds must be tried.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n − 1)', right: true, why: 'Every pile merged into one.' },
        { text: 'The smallest D(i, n − 1)', why: 'Every pile must be merged; starting later leaves piles out.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 26, feedback: '26 tries only split 1, the lower bound: 11 + 15. Splits up to 3 are allowed, and split 2 gives 11 + 11.' },
      { answer: 11, feedback: '11 forgets the last merge’s own cost, the size of piles 1 to 4: 1 + 4 + 1 + 5 = 11.' },
    ] },
  },

  'smawk': {
    problem: 'Houses and wells stand at sorted positions, and using well j costs w[j] plus the squared distance. Find each house’s cheapest well when comparing every house with every well is too slow.',
    tryFirst: {
      prompt: 'Houses at 0 and 4; wells at 1 (costs 10 to use) and 5 (costs 0). Each house uses its cheapest well. What is the total?',
      args: [[0, 4], [1, 5], [10, 0]], answer: 12,
      misconceptions: [
        { answer: 2, feedback: '2 ignores the wells’ own costs and sends each house to its nearest well. Well 1 costs 10.' },
      ],
      explain: 'House 0: well 1 costs 10 + 1 = 11 (well 5 costs 25). House 4: well 5 costs 0 + 1 = 1. Total 12.',
    },
    steps: [
      { kind: 'state', ask: 'What is the problem as a matrix?', options: [
        { text: 'f(i, j) = w[j] + (x[i] − y[j])², houses by wells, each entry computed when needed', right: true, why: 'Each row’s minimum is one house’s cheapest well; the matrix is never stored.' },
        { text: 'The nearest well for each house', why: 'A nearer well can cost more to use; the matrix keeps both parts of the cost.' },
      ] },
      { kind: 'split', ask: 'What does the matrix’s structure promise?', options: [
        { text: 'It is totally monotone: in every submatrix, the minima move right or stay as the row moves down', right: true, why: 'f is Monge because x and y are sorted, and Monge matrices are totally monotone.' },
        { text: 'Each row falls and then rises', why: 'Not with arbitrary well costs: a row can rise and fall many times.' },
      ] },
      { kind: 'recurrence', ask: 'What does the reduce step do?', options: [
        { text: 'Keeps at most one column per row: a column beaten in the row at its stack depth is dropped', right: true, why: 'A column beaten there can’t win in that row or any later one.' },
        { text: 'Drops every column that is not some row’s minimum', why: 'Knowing that needs the minima already: it is the whole problem.' },
      ] },
      { kind: 'base', ask: 'When does the recursion stop?', options: [
        { text: 'At one row: its minimum is found by scanning the kept columns', right: true, why: 'Reduce keeps no more columns than rows, so the scan is short.' },
        { text: 'After the first reduce: the kept columns are the rows’ minima, in order', why: 'Reduce keeps candidates, not answers: a row’s minimum need not be the column kept at its position.' },
      ] },
      { kind: 'order', ask: 'After reduce, how are the rows solved?', options: [
        { text: 'Every second row recursively; then each other row between its neighbours’ minima', right: true, why: 'Minima move right, so each other row scans only between two known columns, and together they scan the columns once.' },
        { text: 'Every second row recursively; then each other row takes the minimum column of the row above', why: 'The minimum can move right between rows; copying the row above misses it.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of every row’s minimum value', right: true, why: 'Each house pays for its own cheapest well.' },
        { text: 'The smallest entry of the matrix, times the number of houses', why: 'Each house has its own cheapest well and its own cost.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. Houses at 1, 2 and 3; wells at 0 (costs 1) and 4 (costs 0). What is the total?',
      args: [[1, 2, 3], [0, 4], [1, 0]], answer: 7,
      misconceptions: [
        { answer: 8, feedback: '8 sends house 2 to well 0, 1 + 4 = 5. Well 4 costs 0 + 4 = 4.' },
      ],
      explain: 'House 1: well 0, 1 + 1 = 2. House 2: well 4, 0 + 4 = 4. House 3: well 4, 0 + 1 = 1. Total 7.',
    },
  },

  'cht': {
    problem: 'Print words in order, breaking them into lines; a line whose word lengths add up to S costs S² + M. Find the cheapest breaking when trying every start for every line is too slow.',
    tryFirst: {
      prompt: 'Word lengths 2, 2, 1 and M = 3. What is the cheapest total?',
      args: [[2, 2, 1], 3], answer: 18,
      misconceptions: [
        { answer: 28, feedback: '28 puts all three words on one line: 25 + 3. Squares grow fast, so shorter lines help.' },
        { answer: 19, feedback: '19 is 2 | 2 1: 7 + 12. Three lines, 7 + 7 + 4, are cheaper.' },
      ],
      explain: 'One word per line: (4 + 3) + (4 + 3) + (1 + 3) = 18.',
    },
    steps: [
      { kind: 'state', ask: 'What does D(i) mean?', options: [
        { text: 'The cheapest way to print the first i words', right: true, why: 'The rest of the text only needs to know where the printed part ends.' },
        { text: 'The cheapest way to print word i on its own line', why: 'Words share lines; the state must cover every word up to i.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The first word j of the last line', right: true, why: 'The last line holds words j to i − 1; before it is a smaller printing.' },
        { text: 'The longest line used', why: 'That doesn’t say where the last line starts, so no smaller state is reached.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(i)?', options: [
        { text: 'min over j of D(j) + (P[i] − P[j])² + M', right: true, why: 'The words before j, then one line of words j to i − 1.' },
        { text: 'D(i − 1) + words[i − 1]² + M', why: 'That puts every word on a line of its own.' },
      ] },
      { kind: 'base', ask: 'What is D(0)?', options: [
        { text: '0', right: true, why: 'No words, no lines, nothing to pay.' },
        { text: 'M', why: 'No words means no lines, so no M to pay.' },
      ] },
      { kind: 'order', ask: 'i goes left to right. How is the minimum over j found fast?', options: [
        { text: 'Each j is the line y = −2P[j]·x + D(j) + P[j]²; keep the lower hull and binary-search it at x = P[i]', right: true, why: 'Expanding the square leaves P[i]² + M, the same for every j, outside; the rest is a line in P[i].' },
        { text: 'Each j is the line y = −2P[j]·x + D(j), queried at x = P[i]', why: 'The P[j]² term is part of j’s cost and belongs in the intercept.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'Every word printed, in as few costly lines as possible.' },
        { text: 'The smallest D(i)', why: 'Every word must be printed, not just the first i.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 30, feedback: '30 forgets the last line’s M: D(3) + 2² = 26 + 4, plus 4 more.' },
      { answer: 38, feedback: '38 starts the last line at word 2: D(2) + 4² + 4. Starting it at word 3 gives 34.' },
    ] },
  },

  'monotone-cht': {
    problem: 'Split soldiers into consecutive groups; a group with total strength S is worth a·S² + b·S + c, with a < 0. Find the best total when trying every start for every group is too slow.',
    tryFirst: {
      prompt: 'Four soldiers of strength 1, and a group of strength S is worth −S² + 4S − 3. What is the best total?',
      args: [[1, 1, 1, 1], -1, 4, -3], answer: 2,
      misconceptions: [
        { answer: 0, feedback: '0 puts each soldier alone: f(1) = 0 each. Pairs are worth f(2) = 1 each.' },
      ],
      explain: 'Two pairs: f(2) + f(2) = 1 + 1 = 2. One group of four is worth −3.',
    },
    steps: [
      { kind: 'state', ask: 'What does D(i) mean?', options: [
        { text: 'The best total for the first i soldiers', right: true, why: 'The rest only needs to know where the grouped part ends.' },
        { text: 'The worth of the group ending at soldier i', why: 'The groups before it count too; D must carry the whole prefix.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Where the last group starts, j', right: true, why: 'The last group holds soldiers j to i − 1; before it is a smaller grouping.' },
        { text: 'How strong the strongest group is', why: 'That doesn’t locate the last group.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(i)?', options: [
        { text: 'max over j of D(j) + f(P[i] − P[j])', right: true, why: 'The best grouping before j, plus the last group’s worth.' },
        { text: 'max over j of D(j) + f(x[i − 1])', why: 'The last group holds soldiers j to i − 1, not only the last one.' },
      ] },
      { kind: 'base', ask: 'What is D(0)?', options: [
        { text: '0', right: true, why: 'No soldiers, no groups, nothing gained or lost.' },
        { text: 'c', why: 'c is paid once per group, and there are none yet.' },
      ] },
      { kind: 'order', ask: 'Slopes −2a·P[j] rise and the queries P[i] rise. How is the best line found?', options: [
        { text: 'A pointer at the front of the hull that only moves forward', right: true, why: 'Once the next line is as good at a query, it stays as good for every later, larger query.' },
        { text: 'Always the newest line', why: 'The newest line is best only for large enough x; an earlier line may win at this query.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'Every soldier placed in some group.' },
        { text: 'The largest D(i)', why: 'Every soldier must be in a group, not only the first i.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 5, feedback: '5 starts the last group at soldier 2 (strength 7): D(2) + f(7) = 4 + 1. Starting it at soldier 3 gives 5 + f(4) = 5 + 4.' },
      { answer: -31, feedback: '−31 is one group of strength 11: f(11) = −121 + 110 − 20.' },
    ] },
  },

  'li-chao': {
    problem: 'A frog jumps forward along stones of any heights; a jump from i to j costs (h[j] − h[i])² + C. Find the cheapest way to the last stone when trying every earlier stone is too slow.',
    tryFirst: {
      prompt: 'Heights 0, 9, 3, 6 and C = 5. What is the cheapest way from the first stone to the last?',
      args: [[0, 9, 3, 6], 5], answer: 28,
      misconceptions: [
        { answer: 41, feedback: '41 jumps straight from 0 to 6: 36 + 5. Stopping at 3 halves both distances.' },
        { answer: 141, feedback: '141 lands on every stone, the 9 included.' },
      ],
      explain: '0 → 3 → 6: (9 + 5) + (9 + 5) = 28.',
    },
    steps: [
      { kind: 'state', ask: 'What does D(i) mean?', options: [
        { text: 'The cheapest way to reach stone i', right: true, why: 'Later jumps only need where the frog stands and what it cost.' },
        { text: 'The cheapest way to reach height h', why: 'Two stones can share a height at different places, and the frog only jumps forward.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The stone j the last jump started from', right: true, why: 'Every way to stone i ends with one jump from an earlier stone.' },
        { text: 'The stone just before, i − 1', why: 'The frog may skip stones, so any earlier one can be the start.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(i)?', options: [
        { text: 'min over j < i of D(j) + (h[i] − h[j])² + C', right: true, why: 'The way to j, then one jump.' },
        { text: 'min over j < i of D(j) + |h[i] − h[j]| + C', why: 'A jump costs the squared height difference, not the plain one.' },
      ] },
      { kind: 'base', ask: 'What is D(0)?', options: [
        { text: '0', right: true, why: 'The frog starts there without jumping.' },
        { text: 'C', why: 'C is paid per jump, and the frog starts on stone 0.' },
      ] },
      { kind: 'order', ask: 'Stones go left to right; the heights are in no order. How are the lines kept?', options: [
        { text: 'A Li Chao tree over heights 0 … 10⁶: each node keeps the line lowest at its middle, and the loser goes to the one side where it can still win', right: true, why: 'Lines arrive with any slope and queries come at any height; the tree needs neither in order.' },
        { text: 'A hull with a pointer that only moves forward', why: 'That needs slopes and queries both in order, and here neither is.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n − 1)', right: true, why: 'The frog must reach the last stone.' },
        { text: 'The smallest D(i)', why: 'The frog must reach the last stone, not any stone.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 25, feedback: '25 jumps from stone 1, the nearest height. Reaching it cost 20; from stone 0 the total is 13.' },
      { answer: 73, feedback: '73 jumps from the stone just before, height 9.' },
    ] },
  },

  'cht-numeric': {
    problem: 'The frog problem with increasing heights up to 10⁹ and C up to 10¹⁸, where every cost and every comparison must be exact, beyond where floating-point numbers can be trusted.',
    tryFirst: {
      prompt: 'Heights 0, 2, 3, 7 and C = 3. What is the cheapest way to the last stone?',
      args: [[0, 2, 3, 7], 3], answer: 30,
      misconceptions: [
        { answer: 31, feedback: '31 skips the stone at 2: (9 + 3) + (16 + 3). Landing on it gives (4 + 3) + (1 + 3) + (16 + 3) = 30.' },
      ],
      explain: '0 → 2 → 3 → 7: (4 + 3) + (1 + 3) + (16 + 3) = 30.',
    },
    steps: [
      { kind: 'state', ask: 'How is D(i), the cheapest way to stone i, held?', options: [
        { text: 'As an exact integer', right: true, why: 'Costs reach 10¹⁸ and the comparisons multiply them further; only integers stay exact.' },
        { text: 'As a floating-point number', why: 'Costs reach 10¹⁸, but doubles are exact only up to 2⁵³, about 9 × 10¹⁵.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The stone j the last jump started from', right: true, why: 'Every way to stone i ends with one jump from an earlier stone.' },
        { text: 'The tallest stone so far', why: 'The last jump’s start decides its cost, not the tallest stone.' },
      ] },
      { kind: 'recurrence', ask: 'How is line l₂ found useless between l₁ and l₃ (slopes falling)?', options: [
        { text: '(b₃ − b₁)(m₁ − m₂) ≤ (b₂ − b₁)(m₁ − m₃), in integers', right: true, why: 'Both crossings are fractions with positive denominators; multiplying across keeps their order exactly.' },
        { text: 'Compare (b₃ − b₁)/(m₁ − m₃) with (b₂ − b₁)/(m₁ − m₂) as decimals', why: 'Two different crossings can round to the same double, and a needed line is thrown away.' },
        { text: '(b₃ − b₁)(m₂ − m₁) ≤ (b₂ − b₁)(m₁ − m₃), in integers', why: 'm₂ − m₁ is negative, which flips one side: the test answers a different question.' },
      ] },
      { kind: 'base', ask: 'What starts the hull?', options: [
        { text: 'D(0) = 0, and stone 0’s line (−2h[0], h[0]²)', right: true, why: 'The frog stands on stone 0 for free, so its line is the first candidate.' },
        { text: 'D(0) = C, and stone 0’s line (−2h[0], C + h[0]²)', why: 'C is paid per jump, and the frog starts on stone 0 without one.' },
      ] },
      { kind: 'order', ask: 'Heights rise. In what order are lines queried and added?', options: [
        { text: 'For each stone: query at h[i] with a forward-only pointer, then add stone i’s line', right: true, why: 'Slopes −2h fall and queries rise, so the monotone hull works; only the arithmetic changes.' },
        { text: 'For each stone: add stone i’s line, then query at h[i]', why: 'Stone i’s line needs D(i), which the query has not found yet.' },
      ] },
      { kind: 'answer', ask: 'How is the answer returned?', options: [
        { text: 'D(n − 1), as a decimal string', right: true, why: 'A string carries every digit in both languages.' },
        { text: 'D(n − 1) as a JavaScript number', why: 'Past 2⁵³ a number can’t hold every digit; it rounds.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. Heights 0, 300 000 000 and 1 000 000 000, C = 10¹⁷. What is the cheapest cost?',
      args: [[0, 300000000, 1000000000], 100000000000000000], answer: 780000000000000000,
      misconceptions: [
        { answer: 1100000000000000000, feedback: '1.1 × 10¹⁸ jumps straight to the end: 10¹⁸ + 10¹⁷.' },
      ],
      explain: '0 → 3 × 10⁸ → 10⁹: (9 × 10¹⁶ + 10¹⁷) + (4.9 × 10¹⁷ + 10¹⁷) = 7.8 × 10¹⁷.',
    },
  },

  'lagrangian': {
    problem: 'Choose exactly k non-overlapping subarrays with the largest total, when a table by segment count, n × k cells, is too big.',
    tryFirst: {
      prompt: 'Values 3, −1, 4. Choose exactly 2 non-overlapping subarrays. What is the largest total?',
      args: [[3, -1, 4], 2], answer: 7,
      misconceptions: [
        { answer: 6, feedback: '6 is one subarray, 3 −1 4. Two are required: 3 and 4.' },
      ],
      explain: '[3] and [4], skipping the −1: 7.',
    },
    steps: [
      { kind: 'state', ask: 'What does the relaxed problem compute, for a penalty λ per segment?', options: [
        { text: 'The best total minus λ per segment, and how many segments it uses', right: true, why: 'With the count priced instead of fixed, one O(n) pass solves it.' },
        { text: 'D(i): the best total among the first i values, with any number of segments', why: 'With the count neither priced nor fixed, nothing makes the answer use exactly k segments.' },
      ] },
      { kind: 'split', ask: 'What is the choice at each value?', options: [
        { text: 'Skip it, extend the open segment, or start a new one for λ', right: true, why: 'Every choice of segments is made of these steps, and only starting one is charged.' },
        { text: 'Skip it or start a new segment', why: 'Then every segment holds one value; extending must be possible, for free.' },
      ] },
      { kind: 'recurrence', ask: 'How does the count used change as λ grows?', options: [
        { text: 'It never rises, so binary search finds the smallest λ whose count is at most k', right: true, why: 'Segments cost more as λ grows; with ties going to fewer segments, the count only falls.' },
        { text: 'It rises', why: 'A larger penalty makes segments dearer, so fewer are used.' },
      ] },
      { kind: 'base', ask: 'What is the state before any value?', options: [
        { text: 'Total 0, no segments, none open', right: true, why: 'Nothing has been chosen yet.' },
        { text: 'One segment open, total 0', why: 'An open segment with no values in it would count without being chosen.' },
      ] },
      { kind: 'order', ask: 'What is searched, and how?', options: [
        { text: 'λ, by binary search; each probe runs the O(n) relaxed pass', right: true, why: 'About 18 probes over the penalties, each linear.' },
        { text: 'k, by binary search; each probe runs one pass', why: 'k is given; it is the penalty that is searched, because the relaxed problem has no count limit.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The relaxed best at that λ, plus λ·k', right: true, why: 'The penalty was subtracted once per segment, k times; adding it back gives the total.' },
        { text: 'The relaxed best at that λ', why: 'The penalty was subtracted k times; it must be added back.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. Values 2, −5, 3, −1, 2 and k = 2. What is the largest total?',
      args: [[2, -5, 3, -1, 2], 2], answer: 6,
      misconceptions: [
        { answer: 5, feedback: '5 takes the 3 and the last 2 alone, skipping the −1. 2 and then 3 −1 2 gives 6.' },
        { answer: 4, feedback: '4 is the best single subarray, 3 −1 2. Two are required.' },
      ],
      explain: '[2] and [3, −1, 2]: 2 + 4 = 6.',
    },
  },

  'slope-trick': {
    problem: 'Change the values of a list so it never decreases, paying |d| for a change of d, for 100 000 values, too many for a table over every possible value.',
    tryFirst: {
      prompt: 'Values 5, 2, 6. What is the cheapest way to make them never decrease?',
      args: [[5, 2, 6]], answer: 3,
      misconceptions: [],
      explain: 'Lower the 5 to 2, or raise the 2 to 5: 3 either way.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell mean?', options: [
        { text: 'D(i, v): the cheapest fix of the first i + 1 values, with the last one equal to v', right: true, why: 'The next value must be at least the last one, so the last value is part of the state.' },
        { text: 'D(i): the cheapest fix of the first i + 1 values', why: 'The next value must be at least the last one, which this doesn’t record.' },
      ] },
      { kind: 'split', ask: 'What is the choice at position i?', options: [
        { text: 'The value v it is changed to', right: true, why: 'The cost |a(i) − v| depends on how far it moves.' },
        { text: 'Whether it is changed or not', why: 'How far it moves matters: the cost is |a(i) − v|.' },
      ] },
      { kind: 'recurrence', ask: 'What is D(i, v)?', options: [
        { text: '|a(i) − v| + min over u ≤ v of D(i − 1, u)', right: true, why: 'The value before may be anything up to v.' },
        { text: '|a(i) − v| + min over every u of D(i − 1, u)', why: 'The value before may not be above v, or the list would decrease.' },
      ] },
      { kind: 'base', ask: 'What is the first row?', options: [
        { text: 'D(0, v) = |a(0) − v|', right: true, why: 'Changing the first value costs its distance too.' },
        { text: 'D(0, v) = 0', why: 'Changing the first value is not free.' },
      ] },
      { kind: 'order', ask: 'Each row is convex and piecewise linear in v. How is it kept?', options: [
        { text: 'As breakpoints in a max-heap: push a(i); if the largest t is above a(i), pay t − a(i), pop t and push a(i) again', right: true, why: 'The prefix minimum flattens the right side and |a − v| adds breakpoints; the heap does both in O(log n).' },
        { text: 'As breakpoints in a max-heap, paying t − a(i) but leaving t in it', why: 'The breakpoint must move down to a(i), or later values are charged against the old one again.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The minimum of the last row: the total paid', right: true, why: 'The last value can be anything.' },
        { text: 'D(n − 1, the last value of a)', why: 'The last value may be changed too.' },
      ] },
    ],
    apply: { cell: [4, 1], misconceptions: [
      { answer: 2, feedback: '2 adds D(3,4) = 2, but 4 is above 2 and the list would decrease. Only u ≤ 2: min(6, 4).' },
      { answer: 0, feedback: '0 is |2 − 2| alone; the earlier values’ cost must be added.' },
    ] },
  },

  'cdq': {
    problem: 'Points arrive in order. Find the longest chain, in arrival order, whose x and y both strictly rise, when checking every earlier point for every point is too slow.',
    tryFirst: {
      prompt: 'Points in order: (1, 1), (2, 3), (2, 2), (3, 3). How long is the longest chain with x and y both strictly rising?',
      args: [[1, 2, 2, 3], [1, 3, 2, 3]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 uses (2, 3) and (2, 2) together, but their x values are equal.' },
      ],
      explain: '(1, 1), (2, 2), (3, 3). (2, 3) can’t lead to (3, 3): their y values are equal.',
    },
    steps: [
      { kind: 'state', ask: 'What does B(i) mean?', options: [
        { text: 'The longest chain ending at point i', right: true, why: 'Extending a chain needs its last point.' },
        { text: 'The longest chain among the first i points', why: 'Extending needs the chain’s last point, which this doesn’t say.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The point before i in the chain: earlier, with smaller x and smaller y', right: true, why: 'Every chain of two or more ends by stepping from such a point.' },
        { text: 'The point just before i in arrival order', why: 'A chain may skip points that arrived in between.' },
      ] },
      { kind: 'recurrence', ask: 'What is B(i)?', options: [
        { text: '1 + the largest B(j) over j < i with x(j) < x(i) and y(j) < y(i)', right: true, why: 'The best chain that point i can extend, plus point i.' },
        { text: '1 + the largest B(j) over j < i with x(j) ≤ x(i) and y(j) ≤ y(i)', why: 'Both must rise strictly; equal values don’t.' },
      ] },
      { kind: 'base', ask: 'What is B for a point with no earlier point below and left of it?', options: [
        { text: '1: the point alone', right: true, why: 'A single point is a chain of length 1.' },
        { text: '0', why: 'The point alone is a chain, so its length is at least 1.' },
      ] },
      { kind: 'order', ask: 'How does CDQ order the work?', options: [
        { text: 'Split the arrival order; solve the left half, sweep its values to the right half by x with a Fenwick tree over y, clear it, then solve the right half', right: true, why: 'Each earlier-to-later pair crosses one split, and its source is final when it is sent.' },
        { text: 'Solve both halves first, then send the left half’s values across', why: 'The right half would be finished before the left half’s contributions arrive.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest B(i)', right: true, why: 'The longest chain may end at any point.' },
        { text: 'B(n − 1)', why: 'The longest chain may end before the last point.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 2, feedback: '2 extends from (1, 2) or (3, 1), but (1, 2) has the same y as (3, 2), and (3, 1) the same x.' },
    ] },
  },

  'online-convolution': {
    problem: 'a(0) = 1, and a(m) adds a(i)·b(m − i) over every earlier i. Compute a(n) when every new term depends on all the earlier ones.',
    tryFirst: {
      prompt: 'b(1) = b(2) = 1, every other b(d) = 0, and a(0) = 1. What is a(5)?',
      args: [[0, 1, 1], 5], answer: 8,
      misconceptions: [
        { answer: 5, feedback: '5 is a(4). a(5) = a(4) + a(3) = 5 + 3.' },
      ],
      explain: 'Each term is the sum of the two before it: 1, 1, 2, 3, 5, 8.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept?', options: [
        { text: 'The terms a(m), each final once every earlier term has sent its share', right: true, why: 'A term is used only after it is complete.' },
        { text: 'The running total of the terms', why: 'Each earlier term is weighted by its own b(m − i), not added plainly.' },
      ] },
      { kind: 'split', ask: 'What does one contribution to a(m) depend on?', options: [
        { text: 'The earlier index i: it adds a(i)·b(m − i)', right: true, why: 'Every earlier term contributes once, weighted by the distance.' },
        { text: 'The largest d with b(d) ≠ 0', why: 'Every earlier term within reach contributes, each through its own b(m − i).' },
      ] },
      { kind: 'recurrence', ask: 'What is a(m)?', options: [
        { text: 'The sum over i < m of a(i)·b(m − i)', right: true, why: 'Each earlier term, weighted by how far back it is.' },
        { text: 'The sum over i < m of a(i)·b(i)', why: 'The weight depends on the distance m − i, not on i.' },
      ] },
      { kind: 'base', ask: 'What is a(0)?', options: [
        { text: '1', right: true, why: 'It is given; everything else is built from it.' },
        { text: 'b(0)', why: 'a(0) is given as 1; b(0) is never used.' },
      ] },
      { kind: 'order', ask: 'In what order is the work done?', options: [
        { text: 'Divide and conquer: solve the left half, send its finished terms across the middle in one convolution, then solve the right half', right: true, why: 'Each pair i < m crosses one split, and a(i) is final when it is sent.' },
        { text: 'Convolve the whole of a with b once, then read off a(n)', why: 'a isn’t known in advance: each term needs the earlier ones first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'a(n), modulo 998 244 353', right: true, why: 'The one term asked for, reduced as the problem says.' },
        { text: 'The sum of a(0) … a(n)', why: 'The question asks for one term, not their total.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 11, feedback: '11 adds only a(4) and a(3). b(3) = 1 reaches back to a(2) too.' },
      { answer: 14, feedback: '14 adds a(1)·b(4), but b ends at b(3): b(4) = 0.' },
    ] },
  },
}
