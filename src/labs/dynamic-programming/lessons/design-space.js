// "Design it yourself" for the state-and-transition-reduction lessons (Expert, space-speed group). Format:
// designs.js. Lessons with a live table ask for one of its cells; hirschberg (a string answer),
// pareto-frontiers and symmetry (no table) ask a second hand-solved case. Every number was printed by
// expert-oracles.js before it was typed; hirschberg's questions ask for the length (PICK in designs.test.js).

const zeroStart = { kind: 'base', ask: 'What does best[c] start as, before any item?', options: [
  { text: '0 for every capacity c', right: true, why: 'Taking nothing is allowed at every capacity, and it is worth 0.' },
  { text: 'best[0] = 0 and −∞ for every other c', why: 'That is the exactly-full version: with capacity 5 and one item of weight 2, best[5] would stay −∞ though 3 fits.' },
] }

export const SPACE_DESIGNS = {
  'rolling-arrays': {
    problem: 'Count the right/down paths through a grid with blocked cells, keeping only one row of counts in memory instead of the whole table.',
    tryFirst: {
      prompt: 'A 3 × 3 grid whose cell in row 1, column 2 (the middle of the right edge) is blocked. How many right/down paths go from the top-left to the bottom-right?',
      args: [[[0, 0, 0], [0, 0, 1], [0, 0, 0]]], answer: 3,
      misconceptions: [
        { answer: 6, feedback: '6 is the open 3 × 3 grid. Paths through the blocked cell are lost.' },
      ],
      explain: 'The cell above the corner is blocked, so every path enters the corner from the left: 3 paths reach that cell.',
    },
    steps: [
      { kind: 'state', ask: 'While grid row r is being scanned, what does row[c] hold?', options: [
        { text: 'Row r’s count for columns before the scan position, row r − 1’s from there on', right: true, why: 'The scan has overwritten columns 0 … c − 1 with the new row; the rest still hold the row above.' },
        { text: 'Row r’s count in every column', why: 'Columns the scan has not reached still hold the row above; they change only when the scan arrives.' },
        { text: 'A copy of every earlier row’s count', why: 'That is the full table again; the point is one row, O(columns) memory.' },
      ] },
      { kind: 'split', ask: 'What is the last move into cell (r, c)?', options: [
        { text: 'Down from (r − 1, c), or right from (r, c − 1)', right: true, why: 'Every path into a cell arrives by one last move, and the two groups don’t overlap.' },
        { text: 'Down, right, or diagonally from (r − 1, c − 1)', why: 'A diagonal step is not a move here; adding it counts paths that don’t exist.' },
      ] },
      { kind: 'recurrence', ask: 'How is row[c] updated in place?', options: [
        { text: 'row[c] = row[c] + row[c − 1], or 0 if the cell is blocked', right: true, why: 'The old row[c] is the count above; row[c − 1] was just updated, so it is the count on the left.' },
        { text: 'row[c] = old row[c] + old row[c − 1]', why: 'The old row[c − 1] is the cell above and to the left: a diagonal neighbour instead of the left one.' },
        { text: 'row[c] = row[c − 1]', why: 'That drops the cell above: paths that came down into the cell are lost.' },
      ] },
      { kind: 'base', ask: 'What does the row start as, before grid row 0?', options: [
        { text: '[1, 0, 0, …]: one path stands at the start, none anywhere else', right: true, why: 'Then grid row 0 is filled by the same rule: each open cell copies the count on its left until a block.' },
        { text: 'All 1s, and the scan starts at grid row 1', why: 'A block in the first row cuts off every cell after it, but they would still count 1.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells updated?', options: [
        { text: 'Grid rows top to bottom; within a row, columns left to right', right: true, why: 'row[c − 1] must already be the new row’s value when row[c] reads it.' },
        { text: 'Grid rows top to bottom; within a row, columns right to left', why: 'Then row[c − 1] still holds the row above when row[c] reads it: a diagonal count, not the left one.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'row[C − 1] after the last grid row', right: true, why: 'The last value written is the bottom-right cell’s count.' },
        { text: 'The sum of the final row', why: 'That adds the paths ending at every cell of the bottom row, not only at the corner.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: 1, feedback: '1 adds the old row[1], the blocked cell above-left (0). row[1] has already been updated in this row: 1.' },
    ] },
  },

  'in-place': {
    problem: 'A knapsack kept in one array best[c], where some items may be taken once and others any number of times. Decide which way to scan the capacities for each item.',
    tryFirst: {
      prompt: 'One item of weight 2 and value 3, to be taken at most once. Capacity 4. What is the best value?',
      args: [[[2, 3, 0]], 4], answer: 3,
      misconceptions: [
        { answer: 6, feedback: '6 takes the once-only item twice, which is what an upward scan does.' },
      ],
      explain: 'One copy fits, and there is only one: 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does best[c] mean after an item has been processed?', options: [
        { text: 'The best value within capacity c using the items so far', right: true, why: 'One array holds one row of the two-dimensional table: items so far by capacity.' },
        { text: 'The best value of the item just processed, at capacity c', why: 'best[c] carries every earlier item’s choices too; one item alone can’t combine with the others.' },
      ] },
      { kind: 'split', ask: 'The last choice is skip or take. For a once-only item, what must best[c − w] hold when “take” reads it?', options: [
        { text: 'Its value before this item was considered', right: true, why: 'Taking the item is then added to a choice that doesn’t contain it, so it is used at most once.' },
        { text: 'Its value after this item was considered', why: 'That value may already contain the item, so it could be taken twice.' },
      ] },
      { kind: 'recurrence', ask: 'How is best[c] updated for an item of weight w and value v?', options: [
        { text: 'best[c] = max(best[c], v + best[c − w]) for c ≥ w', right: true, why: 'Skip keeps best[c]; take adds v to the best that leaves room for w.' },
        { text: 'best[c] = v + best[c − w] for c ≥ w', why: 'Always taking it loses the skip option, which is better when the item is poor value.' },
        { text: 'best[c] = max(best[c], v + best[c − 1]) for c ≥ 1', why: 'Taking the item uses w units of capacity, not one.' },
      ] },
      zeroStart,
      { kind: 'order', ask: 'Which way is c scanned for each item?', options: [
        { text: 'Downward for a once-only item, upward for an unlimited one', right: true, why: 'Downward, best[c − w] is read before it is updated; upward, it already includes this item, so another copy can follow.' },
        { text: 'Upward for every item', why: 'A once-only item would be taken again and again: weight 2, value 3, capacity 4 gives 6.' },
        { text: 'Downward for every item', why: 'An unlimited item would then be taken at most once, and its repeats are lost.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best[cap] after the last item', right: true, why: 'With the within-capacity meaning, the best value for the whole capacity is that one entry.' },
        { text: 'best[cap] after the first item', why: 'Each item updates the array; the answer must wait until every item has had its pass.' },
      ] },
    ],
    apply: { cell: [2, 6], misconceptions: [
      { answer: 7, feedback: '7 reads B1(4), the row before: a once-only item’s downward scan. This item is unlimited, so it reads its own updated row: 3 + B2(4) = 3 + 6.' },
      { answer: 4, feedback: '4 skips the item; taking it beats that.' },
    ] },
  },

  'hirschberg': {
    problem: 'Find a longest common subsequence of two strings, keeping memory linear in their lengths instead of the full table of their product.',
    tryFirst: {
      prompt: 'a = "abcb", b = "bacb". How many letters are in a longest common subsequence?',
      args: ['abcb', 'bacb'], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 counts every letter the two share, ignoring order. "abcb" can’t be read in order inside "bacb".' },
      ],
      explain: '"acb" and "bcb" both have 3 letters; "acb" comes first in dictionary order.',
    },
    steps: [
      { kind: 'state', ask: 'Each pass keeps one row of LCS lengths. What does the forward pass’s row hold?', options: [
        { text: 'F[j]: the LCS length of a’s first half and b’s first j letters', right: true, why: 'One row per pass is linear memory, and it is all the cut needs.' },
        { text: 'F[j]: the LCS length of all of a with b’s first j letters', why: 'The cut is made at a’s middle, so the pass must cover a’s first half only.' },
      ] },
      { kind: 'split', ask: 'What does each level of the recursion decide?', options: [
        { text: 'Where to cut b: a’s first half goes with b[:j], its second half with b[j:]', right: true, why: 'An optimal alignment crosses a’s middle at one column j of b; finding it leaves two independent halves.' },
        { text: 'Which letter of the LCS comes next', why: 'That is the greedy walk, which needs the whole table to look ahead.' },
        { text: 'Whether a’s middle letter is in the LCS', why: 'That alone doesn’t say which letters of b go with each half.' },
      ] },
      { kind: 'recurrence', ask: 'How is the cut j chosen?', options: [
        { text: 'The j maximizing F[j] + G[j], where G[j] is the LCS of a’s second half and b[j:]', right: true, why: 'Every common subsequence splits at a’s middle into a part in b[:j] and a part in b[j:].' },
        { text: 'The j maximizing F[j] alone', why: 'That ignores what the second half can still match after j, so b tends to be cut too late.' },
        { text: 'The middle of b', why: 'The best cut can be anywhere: for "ab" and "xxab", halves "xx" and "ab" leave an LCS of 1 instead of 2.' },
      ] },
      { kind: 'base', ask: 'When does the recursion stop?', options: [
        { text: 'When a has one letter: the LCS is that letter if b contains it, else empty', right: true, why: 'A single letter can match at most once, so the answer is the letter or nothing.' },
        { text: 'When b is empty: the LCS is all of a', why: 'Nothing is common with an empty string; the LCS is empty.' },
      ] },
      { kind: 'order', ask: 'In what order is the work done?', options: [
        { text: 'A forward pass on the top half, a backward pass on the bottom half, then both halves', right: true, why: 'Each level uses two rows; the halves are solved once their cut is known.' },
        { text: 'A forward pass on both halves of a', why: 'G[j] pairs a’s second half with b[j:], a suffix of b: it needs a backward pass.' },
      ] },
      { kind: 'answer', ask: 'How is the answer put together?', options: [
        { text: 'The two halves’ LCS strings, joined in order', right: true, why: 'The cut splits both strings at matching points, so the first half’s letters all come first.' },
        { text: 'The longer of the two halves’ answers', why: 'Both halves contribute letters; the LCS is the two joined.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. a = "abcab", b = "bacba". How many letters are in a longest common subsequence?',
      args: ['abcab', 'bacba'], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 counts every shared letter as often as both have it, ignoring order.' },
      ],
      explain: '"aba" fits in both strings, and no common subsequence has 4 letters.',
    },
  },

  'prefix-sum-dp': {
    problem: 'Count the ways to climb n stairs with steps of 1 to k, when n and k are both large, so adding k earlier counts for every stair is too slow.',
    tryFirst: {
      prompt: 'n = 4, steps of 1, 2 or 3 (order matters). How many ways are there?',
      args: [4, 3], answer: 7,
      misconceptions: [
        { answer: 8, feedback: '8 also allows a single step of 4, larger than k = 3.' },
        { answer: 5, feedback: '5 allows only steps of 1 and 2.' },
      ],
      explain: '1+1+1+1, three orders of 1+1+2, two orders of 1+3, and 2+2.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept for each stair?', options: [
        { text: 'W(i), the ways to reach stair i, and the running total P(i) = W(0) + … + W(i)', right: true, why: 'Any window of W can then be read as the difference of two running totals.' },
        { text: 'Only the largest W seen so far', why: 'One value can’t give the sum of the last k; the running total can.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a climb to stair i?', options: [
        { text: 'The size of the last step, 1 to k', right: true, why: 'Stair i is reached from one of the k stairs below it, and different last steps give different climbs.' },
        { text: 'Whether stair i − 1 was stepped on', why: 'Skipping stair i − 1 still leaves k − 1 stairs to have come from; two cases are not enough when k > 2.' },
      ] },
      { kind: 'recurrence', ask: 'How is W(i) read from the running totals?', options: [
        { text: 'W(i) = P(i − 1) − P(i − k − 1), the second term 0 when i − k − 1 < 0', right: true, why: 'P(i − 1) adds every stair below i; subtracting P(i − k − 1) removes those more than k below.' },
        { text: 'W(i) = P(i − 1) − P(i − k)', why: 'That also removes stair i − k, so a step of exactly k is lost.' },
        { text: 'W(i) = P(i − 1)', why: 'That allows a step of any size, ignoring k.' },
      ] },
      { kind: 'base', ask: 'What starts the counts?', options: [
        { text: 'W(0) = 1 and P(0) = 1: one way to stand at the bottom', right: true, why: 'The empty climb is the one way to be on stair 0, and every count builds on it.' },
        { text: 'W(0) = 0 and P(0) = 0', why: 'Then nothing is ever reachable, and every count is 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the values computed?', options: [
        { text: 'i from 1 to n: W(i), then P(i) = P(i − 1) + W(i)', right: true, why: 'W(i) reads totals of lower stairs only, and P(i) needs W(i).' },
        { text: 'Every P first, then every W', why: 'P is built from W, so it can’t be computed first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n)', right: true, why: 'The ways to reach exactly the top stair.' },
        { text: 'P(n)', why: 'P(n) adds the ways to reach every stair up to n, not just the top one.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 15, feedback: '15 is P(4), every climb ending below stair 5. Those more than 3 below must be subtracted: − P(1).' },
      { answer: 11, feedback: '11 subtracts P(2), which also removes stair 2. It is 3 below, so a step of 3 from it is allowed.' },
    ] },
  },

  'difference-dp': {
    problem: 'Give each child between 0 and their limit of candies so that exactly total are given out. Count the ways, when each child’s choices spread one count over a whole range of totals.',
    tryFirst: {
      prompt: 'Two children, each limited to 2 candies. How many ways give out exactly 3?',
      args: [[2, 2], 3], answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 ignores the limits: giving 3 to one child is not allowed.' },
      ],
      explain: 'Only 1 + 2 and 2 + 1: each child gets at most 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell count?', options: [
        { text: 'W(i, t): the ways to give t candies to the first i children', right: true, why: 'The next child only needs to know how many have been given out so far.' },
        { text: 'W(i): the ways to give the candies to the first i children', why: 'Without the total so far, the sum can’t be made to come out exactly.' },
      ] },
      { kind: 'split', ask: 'What is the choice for child i?', options: [
        { text: 'How many candies they take, 0 to their limit', right: true, why: 'Each child’s number is chosen once; different numbers give different ways.' },
        { text: 'Which child gets the next candy', why: 'That counts the orders of handing out candies, so the same final gift is counted many times.' },
      ] },
      { kind: 'recurrence', ask: 'How is W(i + 1, t) computed?', options: [
        { text: 'W(i, t − limit) + … + W(i, t), leaving out terms below 0', right: true, why: 'Child i takes x from 0 to the limit, leaving t − x for the earlier children.' },
        { text: 'W(i, t) + W(i, t − limit)', why: 'That allows only 0 or exactly the limit, not the numbers in between.' },
      ] },
      { kind: 'base', ask: 'What is the row before any child?', options: [
        { text: 'W(0, 0) = 1 and W(0, t) = 0 for t > 0', right: true, why: 'No children can give out nothing, in exactly one way, and nothing else.' },
        { text: 'W(0, t) = 1 for every t', why: 'No children can’t give out any candies, so only t = 0 is possible.' },
      ] },
      { kind: 'order', ask: 'How is a whole new row built fast?', options: [
        { text: 'Add W(i, t) at t and subtract it at t + limit + 1 in a difference array, then take one prefix sum', right: true, why: 'Each old value counts towards the whole range t … t + limit; two marks and a prefix sum spread it there.' },
        { text: 'Add W(i, t) at t and subtract it at t + limit, then take one prefix sum', why: 'That ends the range one total too soon: the child could never take exactly their limit.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n, total)', right: true, why: 'All n children done, exactly total candies given.' },
        { text: 'The sum of the last row', why: 'That counts every total up to the largest possible, not exactly total.' },
      ] },
    ],
    apply: { cell: [3, 4], misconceptions: [
      { answer: 6, feedback: '6 also adds W2(0): child 2 would take 4, over their limit of 3.' },
      { answer: 3, feedback: '3 ends the range one short, as if child 2 could take only 0 to 2.' },
    ] },
  },

  'monotone-queue': {
    problem: 'Jump from the first square to the last, 1 to k squares at a time, maximizing the sum of the squares landed on, with up to 100 000 squares.',
    tryFirst: {
      prompt: 'Squares 2, −5, −1, 3, jumps of 1 or 2. What is the best sum, first and last squares included?',
      args: [[2, -5, -1, 3], 2], answer: 4,
      misconceptions: [
        { answer: 5, feedback: '5 jumps from the first square straight to the last, 3 squares: longer than k = 2.' },
        { answer: -1, feedback: '−1 lands on every square. Skipping −5 is better.' },
      ],
      explain: '2 → −1 → 3: jump over the −5, then on to the end.',
    },
    steps: [
      { kind: 'state', ask: 'What does B(i) mean?', options: [
        { text: 'The best sum of a path from square 0 that lands on square i', right: true, why: 'A later jump only needs the best way to have reached its starting square.' },
        { text: 'The best sum of the k squares just before i', why: 'A path doesn’t land on every square; a window sum adds squares the path skipped.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a path to square i?', options: [
        { text: 'The square j the last jump started from, in i − k … i − 1', right: true, why: 'Jumps are 1 to k long, so the last one started on one of the k squares before i.' },
        { text: 'The square j the last jump started from, anywhere before i', why: 'A jump is at most k long, so only the last k squares can be its start.' },
      ] },
      { kind: 'recurrence', ask: 'What is B(i)?', options: [
        { text: 'a[i] + max(B(i − k), …, B(i − 1))', right: true, why: 'Land on i, after the best path to one of the squares within reach.' },
        { text: 'a[i] + B(i − 1)', why: 'That lands on every square and never skips a bad one.' },
        { text: 'a[i] + max(0, B(i − 1))', why: 'That is the best-subarray rule; here the path must start at square 0 and may skip squares.' },
      ] },
      { kind: 'base', ask: 'What is B(0)?', options: [
        { text: 'a[0]: the path starts there', right: true, why: 'The first square is landed on, so its value counts.' },
        { text: '0', why: 'The first square is part of the path, and its value counts.' },
      ] },
      { kind: 'order', ask: 'Squares go left to right. How is each window’s maximum found in O(1) on average?', options: [
        { text: 'A deque of indices with decreasing B: pop worse ones from the back before pushing i, pop the front once it is more than k behind', right: true, why: 'An index worse than a later one can never be the best again, since the later one stays in the window longer.' },
        { text: 'A deque of indices with increasing B', why: 'Then the front is the window’s minimum, not its maximum.' },
        { text: 'Keep only the best B seen so far', why: 'The best may leave the window; the next best is then needed, and it was thrown away.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'B(n − 1)', right: true, why: 'The path must end on the last square.' },
        { text: 'The largest B(i)', why: 'That would let the path stop early; it must end on the last square.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 3, feedback: '3 adds only B(2), the square just before. B(1) = 0 is better.' },
      { answer: 5, feedback: '5 adds B(0) = 1, but that would be a jump of 3, longer than k = 2.' },
    ] },
  },

  'fenwick-dp': {
    problem: 'Count the strictly increasing subsequences of a list of up to 100 000 values, where summing over every earlier smaller value for each position is too slow.',
    tryFirst: {
      prompt: 'Values 2, 1, 3. How many strictly increasing subsequences are there (any length from 1)?',
      args: [[2, 1, 3]], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 counts every non-empty choice of positions. 2 then 1 is not increasing.' },
      ],
      explain: '2, 1, 3, then 2 3 and 1 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does E(i) count?', options: [
        { text: 'The increasing subsequences that end at position i', right: true, why: 'Extending one needs only its last value, and it ends at a known position.' },
        { text: 'The length of the longest increasing subsequence ending at i', why: 'That is LIS; counting needs how many subsequences, not how long.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a subsequence ending at i?', options: [
        { text: 'The position j of the element before a[i], with a smaller value, or none', right: true, why: 'Every such subsequence is a[i] alone, or one ending at a smaller earlier value, extended.' },
        { text: 'The position j of the element before a[i], any earlier one', why: 'The value at j must be smaller, or the subsequence isn’t increasing.' },
      ] },
      { kind: 'recurrence', ask: 'What is E(i)?', options: [
        { text: '1 + the sum of E(j) over j < i with a[j] < a[i]', right: true, why: 'The 1 is a[i] alone; each sum term extends a subsequence by a[i].' },
        { text: 'The sum of E(j) over j < i with a[j] < a[i]', why: 'The subsequence made of a[i] alone is lost, and every count stays 0.' },
        { text: '1 + the sum of E(j) over j < i with a[j] ≤ a[i]', why: 'Equal values make a subsequence that is not strictly increasing.' },
      ] },
      { kind: 'base', ask: 'What does the Fenwick tree hold before the first position?', options: [
        { text: '0 at every rank', right: true, why: 'No subsequence has ended yet; each E(i) brings its own 1.' },
        { text: '1 at every rank', why: 'Values not yet seen would count as if subsequences already ended at them.' },
      ] },
      { kind: 'order', ask: 'In what order are positions processed?', options: [
        { text: 'Left to right: query the sum below a[i]’s rank, then add E(i) at that rank', right: true, why: 'The tree then holds exactly the earlier positions, so its prefix is the earlier smaller ones.' },
        { text: 'In increasing order of value', why: 'Then a smaller value that comes later in the list is counted as if it came before.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of every E(i)', right: true, why: 'A subsequence ends somewhere; each ending is counted once.' },
        { text: 'E(n − 1)', why: 'That counts only the subsequences ending at the last position.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 5, feedback: '5 leaves out the 1 for 4 on its own.' },
      { answer: 4, feedback: '4 adds 1 per earlier smaller value. Each brings every subsequence ending there: E(1) = 2 and E(2) = 2.' },
    ] },
  },

  'segment-tree-dp': {
    problem: 'Find the longest subsequence in which neighbouring values differ by at most d, for 100 000 values up to 10⁹.',
    tryFirst: {
      prompt: 'Values 1, 4, 2, 3 and d = 1. How long is the longest such subsequence?',
      args: [[1, 4, 2, 3], 1], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 is the longest run of neighbouring positions (2, 3). A subsequence may skip the 4.' },
      ],
      explain: '1, 2, 3, skipping the 4.',
    },
    steps: [
      { kind: 'state', ask: 'What does L(i) mean?', options: [
        { text: 'The longest valid subsequence ending at position i', right: true, why: 'Extending it needs its last value, which is a[i].' },
        { text: 'The longest valid subsequence among the first i positions', why: 'Extending needs the last value, and this doesn’t say what it is.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a subsequence ending at i?', options: [
        { text: 'The position j before it, with |a[j] − a[i]| ≤ d, or none', right: true, why: 'Neighbouring values may differ by at most d, and the subsequence may skip positions.' },
        { text: 'The position just before, i − 1', why: 'A subsequence may skip positions: with 1, 9, 2 and d = 1, 1 2 skips the 9.' },
      ] },
      { kind: 'recurrence', ask: 'What is L(i)?', options: [
        { text: '1 + the largest L(j) over j < i with a[j] in [a[i] − d, a[i] + d], or 1 if none', right: true, why: 'The best valid subsequence that a[i] can extend, plus a[i].' },
        { text: '1 + the largest L(j) over every j < i', why: 'That ignores d: neighbouring values could differ by any amount.' },
        { text: '1 + the largest L(j) over j < i with a[j] in [a[i], a[i] + d]', why: 'The value before may also be up to d smaller.' },
      ] },
      { kind: 'base', ask: 'What is L for a position with no earlier value in range?', options: [
        { text: '1: the value alone', right: true, why: 'A single value is a valid subsequence of length 1.' },
        { text: '0', why: 'The value alone is a valid subsequence, so its length is at least 1.' },
      ] },
      { kind: 'order', ask: 'Positions go left to right. How is each range maximum found fast?', options: [
        { text: 'A segment tree indexed by compressed value: query the value range, then store L(i) at a[i]', right: true, why: 'The tree holds the earlier positions’ best by value, so a range query gives the best in [a[i] − d, a[i] + d].' },
        { text: 'A segment tree indexed by position, queried on positions i − d … i − 1', why: 'd limits the difference of values, not the distance between positions.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest L(i)', right: true, why: 'The best subsequence may end at any position.' },
        { text: 'L(n − 1)', why: 'The best subsequence may end before the last position.' },
      ] },
    ],
    apply: { cell: [0, 5], input: { values: [4, 1, 5, 9, 3, 6], d: 2 }, misconceptions: [
      { answer: 4, feedback: '4 extends L(4) = 3, but 3 is 3 away from 6, more than d = 2.' },
      { answer: 1, feedback: '1 looks only at the position before (3). The earlier 4 and 5 are within 2 of 6.' },
    ] },
  },

  'coordinate-compression': {
    problem: 'Find the largest sum of a strictly increasing subsequence, for 100 000 values as large as 10⁹, too large to index an array by value.',
    tryFirst: {
      prompt: 'Values 10, 2, 30, 5. What is the largest sum of a strictly increasing subsequence?',
      args: [[10, 2, 30, 5]], answer: 40,
      misconceptions: [
        { answer: 47, feedback: '47 adds everything. 10 then 2 is not increasing.' },
      ],
      explain: '10 then 30, the two largest values in increasing order.',
    },
    steps: [
      { kind: 'state', ask: 'Where is the best sum ending at each value stored?', options: [
        { text: 'At the value’s rank among the distinct values', right: true, why: 'Ranks run from 1 to at most n and keep the values’ order.' },
        { text: 'At the position i where the value appears', why: 'Positions don’t follow the order of the values, so “smaller value” is not a prefix of positions.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a subsequence ending at position i?', options: [
        { text: 'The earlier element before a[i], with a smaller value, or none', right: true, why: 'The subsequence is a[i] alone, or one ending at a smaller earlier value, extended.' },
        { text: 'The element at position i − 1', why: 'A subsequence may skip positions.' },
      ] },
      { kind: 'recurrence', ask: 'What is S(i), the best sum ending at i?', options: [
        { text: 'a[i] + the largest S(j) over earlier j with a smaller rank, or a[i] if none', right: true, why: 'Smaller rank means smaller value, and the sum adds the real value.' },
        { text: 'rank(a[i]) + the largest S(j) over earlier j with a smaller rank', why: 'The rank is only where S is stored; the sum is of the real values.' },
        { text: 'a[i] + the largest S(j) over earlier j with a rank no larger', why: 'An equal value is not strictly increasing.' },
      ] },
      { kind: 'base', ask: 'How are the ranks given out?', options: [
        { text: '1 … m for the m distinct values, in sorted order', right: true, why: 'Sorting keeps every comparison the same, so “smaller rank” means “smaller value”.' },
        { text: '1 … m in order of first appearance', why: 'Then rank order isn’t value order, and “smaller rank” no longer means “smaller value”.' },
      ] },
      { kind: 'order', ask: 'In what order are positions processed?', options: [
        { text: 'Left to right: query the best below a[i]’s rank, then store S(i) at its rank', right: true, why: 'The tree then holds exactly the earlier positions.' },
        { text: 'In increasing order of value', why: 'Then a smaller value that comes later is used as if it came first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest S(i), or 0 for an empty list', right: true, why: 'The best subsequence may end anywhere.' },
        { text: 'S at the largest value', why: 'The best may end elsewhere: in 5, 1, 2, 3, 4 it is 1 + 2 + 3 + 4 = 10, not 5.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 16, feedback: '16 adds 7’s rank, 5, instead of its value.' },
      { answer: 10, feedback: '10 extends only S(3), the position just before. S(2) = 11 is better.' },
    ] },
  },

  'pareto-frontiers': {
    problem: 'A 0/1 knapsack with up to 16 items whose weights and capacity reach 10⁹, so no table can be indexed by capacity.',
    tryFirst: {
      prompt: 'Items (weight 4, value 5), (3, 4) and (2, 3). Capacity 5. What is the best value?',
      args: [[4, 3, 2], [5, 4, 3], 5], answer: 7,
      misconceptions: [
        { answer: 5, feedback: '5 takes the most valuable item first (weight 4); then nothing else fits.' },
      ],
      explain: 'Weights 3 + 2 = 5 fit, worth 4 + 3 = 7.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept after each item?', options: [
        { text: 'A list of (weight, value) pairs, one per choice that might still win', right: true, why: 'Only useful choices are kept, and the capacity is never used as an index.' },
        { text: 'The single best (weight, value) pair so far', why: 'The best pair now may be too heavy later; lighter pairs must be kept for the capacity left.' },
      ] },
      { kind: 'split', ask: 'What is the choice for each item?', options: [
        { text: 'Take it or skip it, for every pair in the list', right: true, why: 'Each kept choice either gets the item or doesn’t: two new pairs at most.' },
        { text: 'Take the items in order of value per weight while they fit', why: 'Greedy can leave room unused: the best-ratio item may block two that together are worth more.' },
      ] },
      { kind: 'recurrence', ask: 'How is the new list made?', options: [
        { text: 'Every old pair, plus every old pair with the item added if it fits', right: true, why: 'Skip keeps the old pair; take adds the item’s weight and value.' },
        { text: 'Every old pair with the item added, replacing the old pairs', why: 'Skipping the item must stay possible; replacing loses every choice without it.' },
      ] },
      { kind: 'base', ask: 'What is the list before any item?', options: [
        { text: 'One pair, (0, 0): nothing taken', right: true, why: 'The empty choice weighs nothing and is worth nothing.' },
        { text: 'No pairs', why: 'Then no item can ever be added to anything, and the list stays empty.' },
      ] },
      { kind: 'order', ask: 'After each item, the list is sorted by weight. Which pairs are dropped?', options: [
        { text: 'Any pair worth no more than a lighter or equally heavy pair', right: true, why: 'That pair fits wherever the dropped one fits and is worth at least as much: it dominates.' },
        { text: 'Any pair heavier than the pair before it', why: 'A heavier pair worth more must stay: it may be the best for a larger capacity.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The value of the heaviest pair within the capacity', right: true, why: 'After pruning, values rise with weight, so the heaviest pair that fits is worth the most.' },
        { text: 'The value of the lightest pair', why: 'After pruning, the lightest pair is the least valuable: (0, 0).' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. Items (weight 6, value 10), (5, 6) and (5, 6). Capacity 10. What is the best value?',
      args: [[6, 5, 5], [10, 6, 6], 10], answer: 12,
      misconceptions: [
        { answer: 10, feedback: '10 takes the best value per weight first (10 for 6); then neither 5 fits.' },
        { answer: 22, feedback: '22 takes all three, weighing 16, over the capacity.' },
      ],
      explain: 'The two weight-5 items fill 10 exactly: 6 + 6 = 12.',
    },
  },

  'bitset-dp': {
    problem: 'Count the totals that some of up to 20 values can add up to, when the totals reach 2 000 000, by updating every reachable total at once.',
    tryFirst: {
      prompt: 'Values 1, 2, 3, each used at most once. How many different totals can be made, 0 included?',
      args: [[1, 2, 3]], answer: 7,
      misconceptions: [
        { answer: 8, feedback: '8 counts the subsets. 1 + 2 and 3 make the same total.' },
        { answer: 6, feedback: '6 forgets the empty choice, total 0.' },
      ],
      explain: 'Every total from 0 to 6 can be made.',
    },
    steps: [
      { kind: 'state', ask: 'What does the bitset B hold?', options: [
        { text: 'Bit t is 1 when total t can be made from the values so far', right: true, why: 'Each total needs only a yes or no, and one integer holds them all.' },
        { text: 'Bit i is 1 when value i has been used', why: 'That records one subset (of 2²⁰), not the totals the subsets make.' },
      ] },
      { kind: 'split', ask: 'What is the choice for each value?', options: [
        { text: 'Use it or not', right: true, why: 'Each value is used at most once; every total either includes it or doesn’t.' },
        { text: 'Which of the values is used last', why: 'Ordering the values counts each subset many times and still needs a bit per total.' },
      ] },
      { kind: 'recurrence', ask: 'How is value v added?', options: [
        { text: 'B = B | (B << v)', right: true, why: 'The old totals stay, and every old total plus v joins them.' },
        { text: 'B = B << v', why: 'That forces every value to be used: the totals without v are lost.' },
        { text: 'B = B | (B >> v)', why: 'Shifting right subtracts v from every total.' },
      ] },
      { kind: 'base', ask: 'What is B before any value?', options: [
        { text: '1: only total 0, the empty choice', right: true, why: 'Nothing chosen makes 0, and every other total builds on it.' },
        { text: '0: nothing is reachable', why: 'Shifting 0 gives 0 for ever, so no total is ever found.' },
      ] },
      { kind: 'order', ask: 'In what order is the work done?', options: [
        { text: 'One value at a time, each shift reading the B from before that value', right: true, why: 'Each value is then added at most once to any total.' },
        { text: 'Bit by bit from low totals to high, updating B in place', why: 'A bit set by v this round would be shifted again: v used twice.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The number of 1 bits in the final B', right: true, why: 'Each 1 bit is one total that can be made.' },
        { text: 'The position of the highest 1 bit', why: 'That is the largest total, not how many totals there are.' },
      ] },
    ],
    apply: { cell: [4, 0], misconceptions: [
      { answer: 8, feedback: '8 counts the subsets. 2 + 3 and 5 both make 5.' },
      { answer: 6, feedback: '6 leaves out total 0, the empty choice.' },
    ] },
  },

  'bounded-binary': {
    problem: 'A knapsack where item i may be taken up to counts[i] times, with counts up to 10⁹, by turning each count into a few 0/1 bundles.',
    tryFirst: {
      prompt: 'One item of weight 3 and value 5, at most 2 copies. Capacity 10. What is the best value?',
      args: [[3], [5], [2], 10], answer: 10,
      misconceptions: [
        { answer: 15, feedback: '15 takes 3 copies, but only 2 exist.' },
      ],
      explain: 'Two copies weigh 6 and are worth 10; there is no third.',
    },
    steps: [
      { kind: 'state', ask: 'What does the DP run over?', options: [
        { text: 'best[c] over the bundles so far, as in 0/1 knapsack', right: true, why: 'Each bundle is one 0/1 item, so the 0/1 method applies unchanged.' },
        { text: 'best[c] with each kind as one unlimited item', why: 'Unlimited copies ignore the counts: more than counts[i] could be taken.' },
      ] },
      { kind: 'split', ask: 'How is a count split?', options: [
        { text: 'Bundles of 1, 2, 4, … copies, then the remainder, each taken or not', right: true, why: 'Some set of these bundles adds up to every count from 0 to the limit, and none adds up to more.' },
        { text: 'Bundles of 1, 2, 4, … up to the largest power of 2 not above the count', why: 'For a count of 5, bundles 1, 2 and 4 can make 6 or 7 copies, more than exist.' },
      ] },
      { kind: 'recurrence', ask: 'How does a bundle of k copies update best[c]?', options: [
        { text: 'best[c] = max(best[c], k·v + best[c − k·w])', right: true, why: 'A bundle of k copies weighs k·w and is worth k·v, taken whole or not at all.' },
        { text: 'best[c] = max(best[c], v + best[c − w])', why: 'That treats the bundle as one copy: a bundle of k copies weighs k·w and is worth k·v.' },
      ] },
      zeroStart,
      { kind: 'order', ask: 'Which way is c scanned for each bundle?', options: [
        { text: 'Downward, as for any 0/1 item', right: true, why: 'Each bundle is taken at most once, so best[c − k·w] must not include it yet.' },
        { text: 'Upward', why: 'A bundle could then be taken twice, going over the count.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best[cap] after the last bundle', right: true, why: 'Every bundle of every item has had its pass.' },
        { text: 'The sum of the values of every bundle that fits on its own', why: 'Bundles compete for capacity; only the best set of them counts.' },
      ] },
    ],
    apply: { cell: [3, 7], misconceptions: [
      { answer: 9, feedback: '9 skips item 1. Taking it (5) beside 2 copies of item 0 (6) is better.' },
    ] },
  },

  'bounded-queue': {
    problem: 'Count the ways to choose how many of each item (0 to its count) to weigh exactly target, with counts and target up to 50 000.',
    tryFirst: {
      prompt: 'Weights 1 and 2, each at most 2 copies. How many ways weigh exactly 4?',
      args: [[1, 2], [2, 2], 4], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 also counts four copies of weight 1, but only 2 exist.' },
      ],
      explain: 'Two copies of weight 2, or 1 + 1 + 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell count?', options: [
        { text: 'W(i, t): the ways to weigh exactly t with the first i items', right: true, why: 'Each item’s copies are decided once, in its own row.' },
        { text: 'W(t): the ways to weigh t with any items, each as often as wanted', why: 'That ignores the counts: it is the unbounded problem.' },
      ] },
      { kind: 'split', ask: 'What is the choice for item i?', options: [
        { text: 'How many copies q to take, 0 to its count', right: true, why: 'Every way takes some number of copies of each item, once.' },
        { text: 'Take one more copy, or move to the next item', why: 'Without the copies used so far, nothing stops the count being exceeded.' },
      ] },
      { kind: 'recurrence', ask: 'What is W(i + 1, t)?', options: [
        { text: 'W(i, t) + W(i, t − w) + … + W(i, t − count·w), leaving out terms below 0', right: true, why: 'q copies weigh q·w, leaving t − q·w for the earlier items.' },
        { text: 'W(i, t) + W(i + 1, t − w)', why: 'That is the unbounded update: it allows any number of copies.' },
      ] },
      { kind: 'base', ask: 'What is the row before any item?', options: [
        { text: 'W(0, 0) = 1 and W(0, t) = 0 for t > 0', right: true, why: 'With no items, only weight 0 is possible, in one way.' },
        { text: 'W(0, t) = 1 for every t', why: 'No items weigh only 0, so every other weight has 0 ways.' },
      ] },
      { kind: 'order', ask: 'How is each sum found in O(1)?', options: [
        { text: 'For each residue r mod w, slide a window of count + 1 values along r, r + w, r + 2w, …', right: true, why: 'The terms of one sum are w apart, so they all lie on one residue’s chain; sliding adds the newest and drops the oldest.' },
        { text: 'Slide one window along t, t − 1, t − 2, …', why: 'The terms are w apart; neighbouring totals belong to different residues.' },
        { text: 'For each residue, slide a window of count values', why: 'q runs from 0 to count, which is count + 1 terms.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n, target)', right: true, why: 'Every item decided, exactly target weighed.' },
        { text: 'The sum of the last row', why: 'That counts every weight up to target, not exactly target.' },
      ] },
    ],
    apply: { cell: [2, 4], misconceptions: [
      { answer: 2, feedback: '2 also adds W1(0): two copies of weight 2, but item 1’s count is 1.' },
      { answer: 0, feedback: '0 leaves out q = 1: a window of count values, one short.' },
    ] },
  },

  'symmetry': {
    problem: 'Assign up to 12 jobs to k identical machines, minimizing the largest load, by searching over loads while treating machines that differ only in name as one.',
    tryFirst: {
      prompt: 'Jobs 5, 5, 4, 3, 3 on two identical machines. What is the smallest possible largest load?',
      args: [[5, 5, 4, 3, 3], 2], answer: 10,
      misconceptions: [
        { answer: 11, feedback: '11 puts each job, in order, on the lighter machine: 5 | 5, 9 | 5, 9 | 8, 9 | 11.' },
      ],
      explain: '5 + 5 on one machine, 4 + 3 + 3 on the other: 10 each.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state remember?', options: [
        { text: 'The job reached and the sorted list of machine loads', right: true, why: 'The future depends only on which jobs are left and what loads exist, not which machine has which.' },
        { text: 'The job reached and the total of the loads', why: 'Every assignment of the same jobs has the same total; it says nothing about which machine is fullest.' },
        { text: 'The job reached and the largest load so far', why: 'Two states with the same largest load can differ in the other loads, which changes where later jobs fit.' },
      ] },
      { kind: 'split', ask: 'What is the choice for the next job?', options: [
        { text: 'Which machine it goes on, trying each distinct load once', right: true, why: 'Machines with equal loads give the same sorted state, so one try covers them all.' },
        { text: 'Always the lightest machine', why: 'That is the greedy rule, which can miss the best: 5, 5, 4, 3, 3 on two machines gives 11, not 10.' },
      ] },
      { kind: 'recurrence', ask: 'What is best(i, loads)?', options: [
        { text: 'The minimum, over distinct loads, of best(i + 1, the sorted loads with job i added there)', right: true, why: 'Try each different place for the job; the rest of the search decides how good it was.' },
        { text: 'The minimum, over machines, of the largest load just after adding job i', why: 'That looks one job ahead; the later jobs decide which machine should take this one.' },
      ] },
      { kind: 'base', ask: 'What is a state worth when every job is placed?', options: [
        { text: 'Its largest load', right: true, why: 'The cost of a full assignment is its busiest machine.' },
        { text: '0', why: 'The cost is the largest machine load, which is read off at the end.' },
      ] },
      { kind: 'order', ask: 'How are the states stored and visited?', options: [
        { text: 'Memoized recursion over the jobs in order, keyed by (job index, sorted loads)', right: true, why: 'Equivalent states meet under one key, so each is searched once.' },
        { text: 'Memoized recursion keyed by the job index alone', why: 'Different loads at the same job have different futures.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best(0, all loads 0)', right: true, why: 'No job placed yet, every machine empty.' },
        { text: 'The total duration divided by k', why: 'That is a lower bound; jobs can’t be split, so it is often not reached: 3, 3, 3 on two machines needs 6.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. Jobs 4, 4, 3, 3, 2 on two identical machines. What is the smallest possible largest load?',
      args: [[4, 4, 3, 3, 2], 2], answer: 8,
      misconceptions: [
        { answer: 9, feedback: '9 puts each job, in order, on the lighter machine: 4 | 4, 7 | 4, 7 | 7, 9 | 7.' },
      ],
      explain: '4 + 4 on one machine, 3 + 3 + 2 on the other: 8 each.',
    },
  },
}
