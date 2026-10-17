// "Design it yourself" for the one-dimensional and finite-state lessons (Core, linear group).
// The learner builds the DP before reading about it: a hand-solved small case, then six decisions,
// then one cell computed with the design they chose. Format and checks: designs.js and designs.test.js.
//
// tryFirst.answer and every misconception are typed numbers; designs.test.js checks each one against
// the brute-force oracle in core-oracles.js (never against a DP). apply.cell is read from the live
// trace in tables.js, so it is computed, not typed; lessons without a trace give args and an answer,
// which the oracle checks too.

export const LINEAR_DESIGNS = {
  fibonacci: {
    problem: 'F(0) = 0, F(1) = 1, and every later term is the sum of the two before it. The plain recursion asks for the same terms again and again. Design a table that asks each one once.',
    tryFirst: {
      prompt: 'Before any method: write the terms out by hand. What is F(10)?',
      args: [10], answer: 55,
      misconceptions: [
        { answer: 89, feedback: '89 is F(11). Count from F(0) = 0: the terms are 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, and F(10) is the eleventh one.' },
        { answer: 34, feedback: '34 is F(9), one term short. Write the list starting at F(0) = 0 and number every term.' },
      ],
      explain: '0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55. Notice what you did: each new term used only the two you had just written. That is the whole design.',
    },
    steps: [
      { kind: 'state', ask: 'What should one table cell D(i) hold?', options: [
        { text: 'The sum F(0) + F(1) + … + F(i)', why: 'A running sum is a different quantity. The rule adds the two previous terms, not all of them, so you would have to undo the sum every time you used it.' },
        { text: 'F(i), the i-th term itself', right: true, why: 'Every term is defined from earlier terms, so the terms are the subproblems. With D(i) = F(i), the question F(n) is one cell.' },
        { text: 'How many calls the recursion makes for F(i)', why: 'That counts work, not the answer. It is what the call tree shows, and it is the waste the table removes.' },
      ] },
      { kind: 'split', ask: 'Which smaller answers does F(i) depend on?', options: [
        { text: 'Only F(i − 1)', why: 'One term is not enough: knowing that the last term was 2 does not tell you whether the next is 3 (after 1, 2) or 4 (after 2, 2). The rule names two terms.' },
        { text: 'Every earlier term, F(0) to F(i − 1)', why: 'They are all filled before F(i), but F(i) reads only two of them. Believing it reads all of them leads to a needless inner loop.' },
        { text: 'F(i − 1) and F(i − 2)', right: true, why: 'The definition names them. Nothing older is ever read again, so a window of two values is all the memory the problem needs.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: 'D(i) = D(i − 1) + D(i − 2)', right: true, why: 'This is the definition written in table cells: the two earlier cells, added.' },
        { text: 'D(i) = 2 · D(i − 1)', why: 'Doubling assumes the two previous terms are equal. It gives 1, 2, 4, 8, which leaves Fibonacci at the fourth term.' },
        { text: 'D(i) = D(i − 1) + i', why: 'That adds the position, not a term, and gives 0, 1, 3, 6, 10: the triangular numbers.' },
      ] },
      { kind: 'base', ask: 'Which cells must be set before the rule can run?', options: [
        { text: 'Only D(0) = 0', why: 'Then D(1) would be D(0) + D(−1), and there is no cell −1. Every index the rule cannot reach has to be given.' },
        { text: 'D(1) = 1 and D(2) = 1', why: 'Right for n ≥ 1, but F(0) = 0 is a fair question (the challenge asks it), and this table has no cell for it.' },
        { text: 'D(0) = 0 and D(1) = 1', right: true, why: 'The rule at i reads i − 2, so the first cell it can fill is 2. Cells 0 and 1 are the definition’s own starting values.' },
      ] },
      { kind: 'order', ask: 'In what order can the cells be filled?', options: [
        { text: 'i = n down to 2', why: 'D(n) would read D(n − 1) before it exists. The order has to follow the arrows: from the cells that are read to the cell that reads them.' },
        { text: 'i = 2, 3, …, n, increasing', right: true, why: 'Each cell reads two smaller indices, so going up guarantees both are already filled.' },
        { text: 'Any order: every cell uses the same rule', why: 'The rule is the same, but its inputs are not always ready. Fill D(5) first and it needs D(4) and D(3), which are still empty.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest value in the table', why: 'It gives the same number here, because the terms never decrease, but for the wrong reason. Where the answer sits comes from what a cell means; in max subarray the largest cell and the last cell differ.' },
        { text: 'D(n − 1) + D(n − 2), worked out after the loop', why: 'That is D(n) computed a second time. If the loop already reached n it is the same value; if the loop stopped at n − 1, the loop bound is the bug.' },
        { text: 'D(n)', right: true, why: 'D(i) means F(i), so the question F(n) is exactly cell n.' },
      ] },
    ],
    apply: { cell: [0, 7] },
  },

  stairs: {
    problem: 'You climb n stairs using step sizes from a set, here {1, 3}, in any order. Count the different ordered sequences of steps that land exactly on stair n.',
    tryFirst: {
      prompt: 'List them by hand. With steps {1, 3}, how many ordered sequences land exactly on stair 5?',
      args: [5, [1, 3]], answer: 4,
      misconceptions: [
        { answer: 2, feedback: 'That counts which steps are used, not their order: 1 + 1 + 3, 1 + 3 + 1 and 3 + 1 + 1 are three different sequences. With 1 + 1 + 1 + 1 + 1 that makes 4.' },
        { answer: 3, feedback: 'Close. Write every sequence that uses one 3: the 3 can come first, second or third. Then add the sequence with no 3 at all.' },
      ],
      explain: '1+1+1+1+1, 3+1+1, 1+3+1 and 1+1+3. Look at how they end: three end with a 1 (they are the routes to stair 4, plus a 1) and one ends with a 3 (the route to stair 2, plus a 3).',
    },
    steps: [
      { kind: 'state', ask: 'What should W(h) mean?', options: [
        { text: 'The number of ordered sequences that land exactly on stair h', right: true, why: 'The same question with a smaller target. W(n) is then the question asked.' },
        { text: 'The fewest steps needed to reach stair h', why: 'That is a minimum, a different question (coin change asks it). Counting needs every route, not the best one.' },
        { text: 'The number of sequences to stair n that pass through stair h', why: 'That mentions both h and n, so it is not a smaller copy of the question. A cell should be a question about h alone.' },
      ] },
      { kind: 'split', ask: 'How do you split the routes to stair h into groups that never overlap?', options: [
        { text: 'By the largest step used', why: 'That groups multisets, not sequences: 1 + 3 and 3 + 1 have the same largest step, so the group still has to tell them apart.' },
        { text: 'By the size of the final step', right: true, why: 'Every route has exactly one last step, so every route falls in exactly one group. A route whose last step is s is a route to h − s with s added.' },
        { text: 'By how many steps the route takes', why: 'That splits cleanly too, but the groups are not smaller copies of the question: “routes of exactly k steps” needs a second index, k.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills W(h)?', options: [
        { text: 'W(h) = W(h − 1) + W(h − 2)', why: 'That is the {1, 2} staircase. With steps {1, 3}, the last step is 1 or 3, so the terms are W(h − 1) and W(h − 3).' },
        { text: 'W(h) = the largest W(h − s)', why: 'A maximum keeps one group. Counting has to add every group, because each group holds different routes.' },
        { text: 'W(h) = the sum of W(h − s) over every step size s ≤ h', right: true, why: 'One term per possible last step, added because the groups never overlap. Steps bigger than h cannot be the last step, so they are left out.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'W(0) = 0: there is nothing to climb', why: 'Then every cell is 0. Each route ends with a step from somewhere, and the earliest somewhere is stair 0: no routes there means no routes anywhere.' },
        { text: 'W(0) = 1: the route of no steps', right: true, why: 'A route of one step s lands on s, and the rule counts it as W(s − s) = W(0). W(0) = 1 is what makes that single route count once.' },
        { text: 'W(1) = 1 and W(3) = 1, set by hand', why: 'Right numbers, but only for these step sizes. With W(0) = 1 the rule works them out itself, for any set of steps.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Heights increasing; at each height, try every step size', right: true, why: 'W(h) reads only smaller heights. Every step size is tried at every height, so a route may use the steps in any order.' },
        { text: 'Step sizes outside, heights inside', why: 'That order counts each multiset once: it is coin change combinations. Here 1 + 3 and 3 + 1 must both count, so heights go outside.' },
        { text: 'Heights decreasing from n', why: 'W(n) reads W(n − 1), which would still be empty. The order follows the arrows, from smaller heights to larger.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of every W(h)', why: 'That adds the routes to every stair, not just the routes to n.' },
        { text: 'W(n) − 1, removing the empty route', why: 'The empty route reaches only stair 0. It is not among the routes to n when n > 0, so nothing has to be removed.' },
        { text: 'W(n)', right: true, why: 'W(h) means routes to stair h, so the routes to stair n are cell n.' },
      ] },
    ],
    apply: { cell: [0, 6] },
  },

  'min-cost-stairs': {
    problem: 'You stand just before the first stair. Each move goes up one or two stairs, landing on stair i costs costs[i], and you must finish standing on the last stair. Find the cheapest total.',
    tryFirst: {
      prompt: 'Costs are [1, 100, 1, 1, 1, 100, 1, 1, 100, 1]. Find the cheapest route by hand. What does it cost?',
      args: [[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]], answer: 6,
      misconceptions: [
        { answer: 7, feedback: 'You probably landed on every cheap stair. A two-stair move can skip a cheap stair too: 0, 2, 4, 6, 7, 9 avoids stair 3 and saves 1.' },
        { answer: 5, feedback: 'Every route has to land on the last stair, and moves are at most two stairs, so count the landings again: there are at least six.' },
      ],
      explain: 'Land on stairs 0, 2, 4, 6, 7 and 9: six landings of cost 1. Choosing the cheaper next stair each time can land on stair 3 needlessly; only comparing whole routes finds 6.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'Whether stair i is on the cheapest route', why: 'You cannot know that until the whole route is chosen: it depends on stairs after i. A cell must be answerable from earlier cells.' },
        { text: 'The cheapest total cost of a route that ends standing on stair i', right: true, why: 'The same question with an earlier finishing stair. The last stair’s cell is the question asked.' },
        { text: 'costs[i], the price of stair i', why: 'That is the input, not a subproblem: it says nothing about how you reached stair i.' },
      ] },
      { kind: 'split', ask: 'What does the last move onto stair i tell you?', options: [
        { text: 'Which of costs[i − 1] and costs[i − 2] is smaller', why: 'That compares one landing each. The cheaper landing can sit at the end of an expensive route; compare whole routes, which is what D holds.' },
        { text: 'Where you stood before it: stair i − 1 or stair i − 2', right: true, why: 'Moves are one or two stairs, so a route onto i came from one of those (the start counts as the position before stair 0). Its cost is that earlier route plus costs[i].' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: 'D(i) = min(D(i − 1), D(i − 2))', why: 'It never pays for landing on stair i, so every cell stays at the start’s cost, 0.' },
        { text: 'D(i) = costs[i] + min(D(i − 1), D(i − 2))', right: true, why: 'Pay for stair i, plus the cheaper of the two whole routes that a move onto i can come from.' },
        { text: 'D(i) = costs[i] + min(costs[i − 1], costs[i − 2])', why: 'This compares single landings, not routes, the mistake from the last question.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(start) = 0, with the start as the position before stair 0', right: true, why: 'Standing at the start is free. Then D(0) = costs[0] + D(start), and D(1) = costs[1] + min(D(0), D(start)), both from the rule with no special case.' },
        { text: 'D(0) = 0, because you start at stair 0', why: 'You start before stair 0, and landing on it costs like any other stair. With [5], this answers 0 instead of 5.' },
        { text: 'D(0) = costs[0] and D(1) = costs[0] + costs[1]', why: 'That forces every route through stair 0, but a two-stair move from the start lands on stair 1 directly: [100, 1] would cost 101 instead of 1.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Cheapest stairs first', why: 'A cell’s value depends on the two cells below it, not on its own price; a cheap stair high up still needs the stairs before it.' },
        { text: 'Stairs from the top down', why: 'Then D(i) reads D(i − 1) before it exists.' },
        { text: 'Stairs from the bottom up', right: true, why: 'Each cell reads the two positions below it, so going up has both ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min(D(last), D(last − 1))', why: 'That answers a different version, where you may step off the top from either of the last two stairs. Here you must stand on the last stair, so its cell alone answers.' },
        { text: 'D(last stair), or 0 when there are no stairs', right: true, why: 'D(i) is the cheapest route ending on stair i, and the route must end on the last one.' },
        { text: 'The smallest value in the table', why: 'That is the cheapest stair to stand on, often the first one, not the cost of reaching the top.' },
      ] },
    ],
    apply: { cell: [0, 5] },
  },

  'house-robber': {
    problem: 'A street of houses holds the given amounts. Take from as many houses as you like, but never from two next to each other. Find the largest total.',
    tryFirst: {
      prompt: 'The houses hold [5, 1, 1, 5]. What is the largest total you can take?',
      args: [[5, 1, 1, 5]], answer: 10,
      misconceptions: [
        { answer: 6, feedback: 'That is every other house starting from the first: 5 + 1. Nothing says you must alternate. The two 5s are not neighbours, and skipping two houses in a row is allowed.' },
        { answer: 12, feedback: 'That takes every house, and the rule forbids neighbours. Which houses touch?' },
      ],
      explain: 'Take the first and the last: 5 + 5 = 10, skipping both middle houses. Alternating patterns miss it, so the method has to compare taking and skipping at every house.',
    },
    steps: [
      { kind: 'state', ask: 'What should B(i) mean?', options: [
        { text: 'The best total from the first i houses', right: true, why: 'The same question on a shorter street. B(n) is the whole street.' },
        { text: 'The best total from every other house, starting at house 1', why: 'That locks in a pattern before comparing anything, and [5, 1, 1, 5] shows that the best skips two houses in a row.' },
        { text: 'The amount in house i, if it is taken', why: 'That repeats one input. A cell has to summarise all the choices up to i.' },
      ] },
      { kind: 'split', ask: 'What one question about house i splits every choice into two groups?', options: [
        { text: 'Is house i richer than house i − 1?', why: 'Comparing two neighbours is a greedy rule. In [2, 7, 9, 3, 1] the best, 2 + 9 + 1 = 12, skips the 7 even though 7 beats 2.' },
        { text: 'Which house was taken first?', why: 'The first choice tells you about the start of the street. The table grows from the left, so the question to ask is about the newest house.' },
        { text: 'Was house i taken or skipped?', right: true, why: 'Exactly one is true. Skipped: the best is B(i − 1). Taken: house i − 1 must be skipped, so add house i’s amount to B(i − 2).' },
      ] },
      { kind: 'recurrence', ask: 'With v(i) the amount in house i, which rule fills B(i)?', options: [
        { text: 'B(i) = max(B(i − 1), v(i) + B(i − 1))', why: 'B(i − 1) may already include house i − 1, so adding house i next to it breaks the rule. Two back, B(i − 2), is the latest answer sure to leave i − 1 out.' },
        { text: 'B(i) = max(B(i − 1), v(i) + B(i − 2))', right: true, why: 'The better of skipping house i and taking it. Taking it means adding to the best that stops two houses back.' },
        { text: 'B(i) = v(i) + B(i − 2)', why: 'This always takes house i and never considers skipping it. For [1, 9, 1] it gives 2, not 9.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'B(0) = 0, and B(−1) counts as 0 too', right: true, why: 'No houses, nothing taken. Then B(1) = max(B(0), v(1) + 0) = v(1) comes from the rule, and an empty street returns 0.' },
        { text: 'B(1) = v(1) and B(2) = v(2)', why: 'B(2) should be max(v(1), v(2)): for [7, 3] this gives 3 instead of 7.' },
        { text: 'B(0) = v(1)', why: 'B(0) is about zero houses, so it can only be 0. An empty street would return a house that is not there.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Odd houses first, then even houses', why: 'That is the alternating idea again. The rule mixes odd and even houses freely: B(i) reads both i − 1 and i − 2.' },
        { text: 'i = 1, 2, …, n', right: true, why: 'B(i) reads the two cells before it, so going left to right has both ready.' },
        { text: 'From the richest house outwards', why: 'Cells read the cells to their left, not the richest house. The order comes from the arrows.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'B(n)', right: true, why: 'B(i) is the best of the first i houses, and the street has n.' },
        { text: 'max(B(n), B(n − 1))', why: 'B(n) already includes skipping house n, which is B(n − 1). The max is inside the cell.' },
        { text: 'B(n) + B(n − 1)', why: 'Those are two overlapping selections of the same houses, added together.' },
      ] },
    ],
    apply: { cell: [0, 4] },
  },

  'circular-selection': {
    problem: 'The house-robbing rule again, but the houses stand in a circle, so the first and last are neighbours too. Find the largest total of non-adjacent houses.',
    tryFirst: {
      prompt: 'Four houses in a circle hold [4, 1, 2, 7]. What is the largest total?',
      args: [[4, 1, 2, 7]], answer: 8,
      misconceptions: [
        { answer: 11, feedback: 'That is the street answer, 4 + 7. In a circle the first and last houses are neighbours, so 4 and 7 cannot both be taken.' },
        { answer: 6, feedback: '4 + 2 is allowed, but there is a better pair. Which house has to go if 7 is taken?' },
      ],
      explain: 'Take 1 and 7. Every valid choice leaves out the first house or the last one (or both); here leaving out the first gives the street [1, 2, 7], whose best is 8.',
    },
    steps: [
      { kind: 'state', ask: 'A circle has no first house, so “the first i houses” has no meaning. What do you do?', options: [
        { text: 'Solve the street on the whole list, then drop the smaller end if both ends are taken', why: 'The street’s best may lean on both ends, and dropping one afterwards is not the best that avoids it. [4, 1, 2, 7]: the street gives 11, dropping 4 leaves 7, but the true best is 8.' },
        { text: 'Remove the first house and solve one street', why: 'Then choices that use the first house are never tried. In the circle [9, 1, 1] the best, 9, is the first house.' },
        { text: 'Solve two streets: one without the first house, one without the last', right: true, why: 'The first and last cannot both be taken, so every valid choice leaves out at least one of them. Each case is an ordinary street, and house robbing solves streets.' },
      ] },
      { kind: 'split', ask: 'Inside each street, what decides house i?', options: [
        { text: 'Taken or skipped, exactly as in house robbing', right: true, why: 'Once the ring is cut, each case is a straight street with no extra rule: B(i) = max(B(i − 1), v(i) + B(i − 2)).' },
        { text: 'Whether house i is next to the first house', why: 'That was the ring’s problem, and cutting the ring already handled it. Inside a street, only the left neighbour matters.' },
      ] },
      { kind: 'recurrence', ask: 'How are the two streets’ answers combined?', options: [
        { text: 'Add them', why: 'The streets share every middle house, so adding counts those houses twice.' },
        { text: 'Take the larger', right: true, why: 'Every valid circle choice is inside at least one case, and each case holds only valid circle choices. So the best of all is the larger of the two bests.' },
        { text: 'Take the smaller, to be safe', why: 'Both answers are valid circle choices, so there is nothing to be safe from. The smaller throws away a valid, better one.' },
      ] },
      { kind: 'base', ask: 'Which input needs its own case?', options: [
        { text: 'Two houses: take both', why: 'In a circle of two, the houses are neighbours both ways round. Take the larger one.' },
        { text: 'None: the two streets cover everything', why: 'They miss the single house: removing the first or the last of [7] leaves an empty street, so this answers 0.' },
        { text: 'A single house: take it', right: true, why: 'One house has no neighbour and may be taken, but both streets would be empty. (No houses gives 0 either way.)' },
      ] },
      { kind: 'order', ask: 'How are the two streets filled?', options: [
        { text: 'One table round the circle, going round until the values stop changing', why: 'Going round reads cells that depend on the cell being written: a cycle. DP needs an order with no cycles, which is why the ring is cut.' },
        { text: 'Each one left to right, in either order: they are independent', right: true, why: 'Each street is its own small problem with its own table. Neither reads the other.' },
        { text: 'The second street continues from the first one’s table', why: 'Sharing a table would let one case’s choices leak into the other, and the cases must stay separate.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The last cell of the whole street', why: 'That is the street answer, which may use both ends: 11 for [4, 1, 2, 7].' },
        { text: 'The larger of the two streets’ last cells, or the house itself when there is one', right: true, why: 'Each street’s answer is in its last cell, and the larger one is the best circle choice.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on the circle [2, 3, 2]. What is the largest total?',
      args: [[2, 3, 2]], answer: 3,
      misconceptions: [{ answer: 4, feedback: '2 + 2 takes the first and last houses, which are neighbours in a circle. Solve the two streets, [3, 2] and [2, 3], and take the larger.' }],
      explain: 'Without the first house the street is [3, 2], best 3. Without the last it is [2, 3], best 3. The larger is 3.',
    },
  },

  'activity-selection': {
    problem: 'Each day you do exactly one of k activities, and rewards[d][a] is what activity a earns on day d. You may not do the same activity two days in a row. Find the largest total.',
    tryFirst: {
      prompt: 'Three days, two activities, A and B. Rewards are day 1: A 4, B 5; day 2: A 1, B 9; day 3: A 2, B 3. What is the largest total?',
      args: [[[4, 5], [1, 9], [2, 3]]], answer: 15,
      misconceptions: [
        { answer: 9, feedback: 'That is the best activity each day: B (5), then A (1, because B is not allowed again), then B (3). Taking B on day 1 blocks the 9 on day 2.' },
        { answer: 17, feedback: '5 + 9 + 3 does B three days running, which the rule forbids.' },
      ],
      explain: 'A, B, A: 4 + 9 + 2 = 15. Today’s best choice can spoil tomorrow, so the method has to remember what was done last.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(d) = the best total for the first d days', why: 'It forgets what day d did, and that decides what day d + 1 may do. Two schedules with the same total but different last activities have different futures.' },
        { text: 'D(d, a) = the best total for the first d days when day d’s activity is a', right: true, why: 'The last activity is exactly what tomorrow needs to know, so it goes in the state. Nothing older matters.' },
        { text: 'D(a) = the total earned by activity a so far', why: 'Totals per activity ignore the days and the no-repeat rule.' },
      ] },
      { kind: 'split', ask: 'If day d does activity a, what can day d − 1 have done?', options: [
        { text: 'Any activity except a', right: true, why: 'The only rule is no repeat on consecutive days, so every other activity is a legal yesterday.' },
        { text: 'The activity that earned the most on day d − 1', why: 'That is the greedy choice from the try-first question; it may be a itself, or it may spoil a better total.' },
        { text: 'Any activity, including a', why: 'That is exactly what the rule forbids.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(d, a)?', options: [
        { text: 'r[d][a] + D(d − 1, a)', why: 'That does a again tomorrow: the opposite of the rule.' },
        { text: 'r[d][a] + the largest D(d − 1, b) over all b', why: 'It allows b = a, which is a repeat. The maximum has to skip a.' },
        { text: 'r[d][a] + the largest D(d − 1, b) over b ≠ a', right: true, why: 'Today’s reward plus the best way to have spent yesterday on something else.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(1, a) = r[1][a] for every activity a', right: true, why: 'Day 1 has no yesterday, so nothing is excluded: each activity earns its own reward.' },
        { text: 'D(1, a) = the best day-1 reward, for every a', why: 'That gives every activity a reward it did not earn.' },
        { text: 'D(1, a) = 0', why: 'Day 1 earns something; starting at 0 drops a whole day’s reward.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Activity by activity: all days of A, then all days of B', why: 'D(d, a) reads the other activities on day d − 1, which would not be filled yet.' },
        { text: 'Day by day; within a day, activities in any order', right: true, why: 'Every cell on day d reads only day d − 1, so once yesterday is done, today’s cells can go in any order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(last day, the first activity)', why: 'That fixes how the schedule ends. The best schedule may end with any activity.' },
        { text: 'The sum of D(last day, a) over all a', why: 'That adds different schedules together.' },
        { text: 'The largest D(last day, a) over all a', right: true, why: 'Each cell is the best schedule ending in one activity, so the best of all ends in the best of them. An empty schedule earns 0.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: day 1 rewards A 2, B 7; day 2 rewards A 6, B 3. What is the largest total?',
      args: [[[2, 7], [6, 3]]], answer: 13,
      misconceptions: [{ answer: 10, feedback: '7 + 3 does B twice in a row. Fill D(2, A) and D(2, B), each reading the other activity on day 1.' }],
      explain: 'D(1, A) = 2, D(1, B) = 7. D(2, A) = 6 + D(1, B) = 13 and D(2, B) = 3 + D(1, A) = 5. The larger is 13.',
    },
  },

  'max-subarray': {
    problem: 'Find the largest sum of a run of consecutive values (a run has at least one value).',
    tryFirst: {
      prompt: 'Values are [2, −5, 4, 3, −1]. What is the largest sum of a run of consecutive values?',
      args: [[2, -5, 4, 3, -1]], answer: 7,
      misconceptions: [
        { answer: 9, feedback: '2 + 4 + 3 adds every positive value, but they are not consecutive: −5 sits between the 2 and the 4.' },
        { answer: 3, feedback: '3 is the sum of the whole list. A run may leave out the values at either end.' },
        { answer: 6, feedback: '4 + 3 − 1 = 6 runs to the end, but stopping one value earlier is better.' },
      ],
      explain: '4 + 3 = 7. Notice the 2: carrying it into the run would mean carrying −5 too, and 2 − 5 = −3 is worse than starting again at 4.',
    },
    steps: [
      { kind: 'state', ask: 'What should E(i) mean?', options: [
        { text: 'The best sum of any run within the first i values', why: 'True and useful at the end, but it cannot be extended: to grow a run to i + 1 you need a run that touches i, and this best run may end far earlier.' },
        { text: 'The best sum of a run that ends exactly at value i', right: true, why: 'Pinning the end makes the cell extendable: a run ending at i + 1 is a run ending at i, plus one value, or a fresh start.' },
        { text: 'The sum of all values up to i', why: 'That is a prefix sum: a run forced to start at the first value.' },
      ] },
      { kind: 'split', ask: 'A run that ends at value i: what is the one choice about it?', options: [
        { text: 'Whether it includes value i', why: 'A run ending at i always includes value i. The choice is about what comes before it.' },
        { text: 'Whether it starts at i, or extends the best run ending at i − 1', right: true, why: 'Those are the only two shapes, and the best run of the second shape uses the best run ending at i − 1.' },
        { text: 'Whether value i is positive', why: 'A run ending at i must include value i, negative or not. The question is whether the run before it helps.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills E(i)?', options: [
        { text: 'E(i) = max(a[i], E(i − 1) + a[i])', right: true, why: 'Start fresh at i, or extend; extending helps exactly when E(i − 1) is positive.' },
        { text: 'E(i) = E(i − 1) + a[i]', why: 'It never starts again, so every run starts at the first value and carries the −5.' },
        { text: 'E(i) = max(E(i − 1), E(i − 1) + a[i])', why: 'E(i − 1) on its own is a run that ends at i − 1, not at i, so the cell stops meaning what it says.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'E(0) = 0', why: '0 is the empty run, which is not allowed. For [−3] the answer would be 0 instead of −3.' },
        { text: 'E(0) = a[0]: the only run that ends at the first value', right: true, why: 'One run ends there, the value itself. From E(1) on, the rule takes over.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Largest values first', why: 'A cell reads the cell to its left, not the largest value.' },
        { text: 'Left to right', right: true, why: 'E(i) reads only E(i − 1), the cell just before it, so going left to right always has it ready.' },
        { text: 'Right to left', why: 'E(i) would read E(i − 1) before it is filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'max(0, the largest E(i))', why: 'The 0 is the empty run again, which the problem does not allow.' },
        { text: 'E(n − 1)', why: 'That is the best run ending at the last value. For [2, −5, 4, 3, −1] it is 6, but 4 + 3 = 7 ends one value earlier.' },
        { text: 'The largest E(i) over all i', right: true, why: 'The best run ends somewhere, and E holds the best for every possible end.' },
      ] },
    ],
    apply: { cell: [0, 3] },
  },

  'max-product': {
    problem: 'Find the largest product of a run of consecutive values (a run has at least one value). Values may be negative or zero.',
    tryFirst: {
      prompt: 'Values are [2, −3, −2, 4]. What is the largest product of a run of consecutive values?',
      args: [[2, -3, -2, 4]], answer: 48,
      misconceptions: [
        { answer: 24, feedback: 'That is what you get by keeping only the largest product so far: at −3 the largest is −3 itself, and the −6 that the next −2 would turn into +12 is forgotten.' },
        { answer: 4, feedback: '4 is the largest single value, but two negatives multiply to a positive: the whole list multiplies to more.' },
      ],
      explain: '2 · (−3) · (−2) · 4 = 48. The −6 after two values looked like the worst run, and one more negative made it the best. That is why the smallest product matters.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each position i?', options: [
        { text: 'The largest product of a run within the first i values', why: 'As in max subarray, a run has to touch i to be extended, and this best run may end earlier.' },
        { text: 'The largest product of a run ending at i', why: 'A negative value turns the smallest product into the largest. [2, −3, −2] needs the −6 that this state throws away.' },
        { text: 'Two values: the largest and the smallest product of a run ending at i', right: true, why: 'Multiplying by a positive keeps their order; by a negative swaps it. With both kept, the next largest is always one of the candidates.' },
      ] },
      { kind: 'split', ask: 'A run ending at i: where can it come from?', options: [
        { text: 'It starts at i, or extends the largest or the smallest run ending at i − 1', right: true, why: 'Which extension is best depends on the sign of a[i], so try all three.' },
        { text: 'It extends the largest run ending at i − 1, unless a[i] is negative', why: 'It also has to be able to start again: after a 0 every extended product is 0.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills hi(i)?', options: [
        { text: 'hi(i) = max(a[i], hi(i − 1) · a[i])', why: 'That is the largest-only state, which loses the negative run.' },
        { text: 'hi(i) = hi(i − 1) · a[i] if a[i] > 0, else lo(i − 1) · a[i]', why: 'It never starts again. After a 0 every product stays 0: [0, 3] gives 0, not 3.' },
        { text: 'hi(i) = max(a[i], hi(i − 1) · a[i], lo(i − 1) · a[i]), and lo(i) the min of the same three', right: true, why: 'Start fresh, or extend either extreme. The three candidates cover every sign.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'hi(0) = lo(0) = a[0]', right: true, why: 'One run ends at the first value: the value itself, which is both the largest and the smallest.' },
        { text: 'hi(0) = lo(0) = 1, the empty product', why: 'A run must have at least one value. For [−5] the answer would be 1.' },
      ] },
      { kind: 'order', ask: 'How do you update the two values at each i?', options: [
        { text: 'Compute the new hi first, then use it to compute the new lo', why: 'A classic bug: lo(i) would read hi(i) instead of hi(i − 1). Both must be computed from the old pair.' },
        { text: 'Left to right, computing hi(i) and lo(i) both from the old hi(i − 1) and lo(i − 1)', right: true, why: 'Each new pair reads only the previous pair, so work out both candidates before overwriting either.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest hi(i) over all i', right: true, why: 'The best run ends somewhere, and hi holds the best for every possible end.' },
        { text: 'hi(n − 1)', why: '[2, −3, −2, 4, 0, −1] ends in 0 and −1, but its best run, 48, ends at index 3.' },
        { text: 'max(hi(n − 1), lo(n − 1))', why: 'lo is the smallest; it is never larger than hi.' },
      ] },
    ],
    apply: { cell: [0, 2] },
  },

  'decode-ways': {
    problem: 'Letters were coded A = 1, B = 2, …, Z = 26 and the codes written together. Count the ways to read the digits back as letters. A code never starts with 0, so “06” is not F.',
    tryFirst: {
      prompt: 'How many ways can “1212” be read back as letters?',
      args: ['1212'], answer: 5,
      misconceptions: [
        { answer: 8, feedback: 'That treats every gap between digits as “split or join” on its own: 2 · 2 · 2. Joins cannot overlap, so “12” then “21” is impossible.' },
        { answer: 4, feedback: 'You may have missed 12, 12: both pairs joined.' },
      ],
      explain: '1·2·1·2, 12·1·2, 1·21·2, 1·2·12 and 12·12. Each reading ends with a one-digit letter or a two-digit letter.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'Whether the first i digits can be read at all', why: 'Yes or no loses the count: two readable prefixes can have different numbers of readings.' },
        { text: 'The number of letters in the reading of the first i digits', why: 'Different readings have different lengths, so there is no single number to store.' },
        { text: 'The number of ways to read the first i digits', right: true, why: 'The same question on a shorter string. D(n) is the question.' },
      ] },
      { kind: 'split', ask: 'How do you split the readings of the first i digits?', options: [
        { text: 'By whether the last letter used one digit or two', right: true, why: 'Every reading has one last letter, made of the last digit or the last two. Removing it leaves a reading of the first i − 1 or i − 2 digits.' },
        { text: 'By the first letter', why: 'The table grows from the left, so the split that matches it is the last letter.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: 'D(i) = D(i − 1) + D(i − 2)', why: 'That is Fibonacci. It counts “0” as a letter and “30” as a letter: “106” would give 3, not 1.' },
        { text: 'D(i) = D(i − 1) if digit i is not 0, plus D(i − 2) if the last two digits make 10 to 26', right: true, why: 'Each term is a group of readings, and it is added only when its last letter is a real letter.' },
        { text: 'D(i) = D(i − 1) + 1 when the last two digits make a letter', why: 'A valid pair adds every reading of the first i − 2 digits, not just one.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 0: the empty string has nothing to read', why: 'Then every cell is 0, because every reading eventually removes its last letter down to the empty string.' },
        { text: 'D(1) = 1, always', why: 'A single “0” has no reading. D(1) is 0 when the string starts with 0, which the rule handles if D(0) is set.' },
        { text: 'D(0) = 1: the empty string has one reading, reading nothing', right: true, why: 'With D(0) = 1, a string made of one letter counts once. D(1) and the rest come from the rule.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Left to right', right: true, why: 'D(i) reads D(i − 1) and D(i − 2).' },
        { text: 'Pairs first, then single digits', why: 'Both kinds of last letter feed the same cell; the order is by position, not by kind.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n), or 0 if the string contains a 0', why: '“10” has one reading (J). A 0 is fine straight after a 1 or a 2.' },
        { text: 'D(n)', right: true, why: 'D(i) counts readings of the first i digits, and the string has n.' },
        { text: 'The sum of every D(i)', why: 'That counts readings of every prefix, not of the whole string.' },
      ] },
    ],
    apply: { cell: [0, 4] },
  },

  'word-break': {
    problem: 'Decide whether a string can be cut into pieces that are all in a word list. A word may be used any number of times.',
    tryFirst: {
      prompt: 'Can “catsandog” be cut into words from {cats, dog, sand, and, cat}?',
      kind: 'yesno', args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], answer: false,
      misconceptions: [
        { answer: true, feedback: 'Try to finish a cut. “cats” + “and” leaves “og”; “cat” + “sand” also leaves “og”. Every cut runs into that leftover.' },
      ],
      explain: 'No. The reachable boundaries are after “cat”, “cats” and “catsand”, and no word starts at the “og” left after them. Tracking which boundaries can be reached is the whole method.',
    },
    steps: [
      { kind: 'state', ask: 'What should B(i) mean?', options: [
        { text: 'Whether a word starts at letter i', why: 'A word may start at i while the letters before i cannot be cut.' },
        { text: 'Whether the first i letters can be cut into words', right: true, why: 'A boundary is reachable or not. The question is the boundary at the end.' },
        { text: 'The word that ends at letter i', why: 'Several words can end at i (“cats” and “s”), and which one is not what matters; what matters is whether what comes before it can be cut.' },
      ] },
      { kind: 'split', ask: 'A cut of the first i letters: what one piece of it do you look at?', options: [
        { text: 'The last word', right: true, why: 'If the last word is w, the letters before it, i − len(w) of them, must also be cuttable. That is an earlier cell.' },
        { text: 'The longest word', why: 'The longest word can be anywhere in the cut; only the last word connects cell i to an earlier cell.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills B(i)?', options: [
        { text: 'B(i) is true if some word ends at letter i', why: 'The letters before that word must be cuttable too: “xcat” with {cat} has a word ending at the end but cannot be cut.' },
        { text: 'B(i) is true if B(i − 1) is true and letter i is a word', why: 'That only works for one-letter words.' },
        { text: 'B(i) is true if some word w ends at letter i and B(i − len(w)) is true', right: true, why: 'Reach an earlier boundary, then add one word. Any word that does this is enough.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'B(0) = true: the empty prefix needs no words', right: true, why: 'The first word of any cut starts at boundary 0, so boundary 0 has to be reachable.' },
        { text: 'B(0) = false: nothing has been cut yet', why: 'Then no cell can ever be true, since every cut starts at boundary 0.' },
      ] },
      { kind: 'order', ask: 'How do you fill the table?', options: [
        { text: 'Left to right, trying every word that ends at each boundary', right: true, why: 'B(i) reads only earlier boundaries, and trying every word is what makes it correct.' },
        { text: 'Take the longest word that fits at each point and move on', why: 'That commits to one choice. For “catsdog” with {cat, cats, sdog}, it takes “cats” and is stuck on “dog”, but “cat” + “sdog” works.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'True if any B(i) is true', why: 'B(0) is always true, so this would always answer yes.' },
        { text: 'B(n)', right: true, why: 'B(i) is about the first i letters, and the whole string is n letters.' },
        { text: 'B(n − 1)', why: 'That leaves the last letter uncut.' },
      ] },
    ],
    apply: { cell: [0, 7] },
  },

  'word-break-count': {
    problem: 'Count the different ways to cut a string into pieces that are all in a word list.',
    tryFirst: {
      prompt: 'How many ways can “catsanddog” be cut into words from {cat, cats, and, sand, dog}?',
      args: ['catsanddog', ['cat', 'cats', 'and', 'sand', 'dog']], answer: 2,
      misconceptions: [
        { answer: 1, feedback: 'That is one cut. Is there another? Try starting with “cat” instead of “cats”.' },
      ],
      explain: '“cats and dog” and “cat sand dog”. Both end with “dog”; they differ in how the first seven letters were cut, and that is the count of an earlier cell.',
    },
    steps: [
      { kind: 'state', ask: 'What should C(i) mean?', options: [
        { text: 'The number of ways to cut the first i letters into words', right: true, why: 'The same question on a prefix; C(n) is the question.' },
        { text: 'The number of words that end at letter i', why: 'That counts last words, not whole cuts. Two words can end at i while the letters before them have different numbers of cuts.' },
        { text: 'Whether the first i letters can be cut, then count the true cells', why: 'True or false cannot count. “aaa” with {a, aa} has 4 true cells but 3 cuts.' },
      ] },
      { kind: 'split', ask: 'How do you split the cuts of the first i letters?', options: [
        { text: 'By the first word', why: 'The table grows from the left, so the split that matches it is the last word.' },
        { text: 'By the last word', right: true, why: 'Each cut has exactly one last word, so the groups never overlap. A cut whose last word is w is a cut of the first i − len(w) letters, plus w.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(i)?', options: [
        { text: 'C(i) = 1 if some word w ends at i with C(i − len(w)) > 0', why: 'That is word break with numbers: it records that a cut exists, not how many.' },
        { text: 'C(i) = the largest C(i − len(w)) over words w ending at i', why: 'A maximum keeps one group. Different last words give different cuts, so add them all.' },
        { text: 'C(i) = the sum of C(i − len(w)) over words w ending at i', right: true, why: 'One term per possible last word, added because the groups never overlap. This is word break with “or” replaced by “+”.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0) = 0: there is nothing to cut', why: 'Then every count is 0, because every cut starts from the empty prefix.' },
        { text: 'C(0) = 1: one way to cut nothing, using no words', right: true, why: 'A string that is a single word counts as C(0) = 1 cut.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Left to right', right: true, why: 'C(i) reads only earlier boundaries.' },
        { text: 'Longest words first, over the whole string, then shorter ones', why: 'Each cell needs every word that ends there, so the order is by boundary, not by word.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of every C(i)', why: 'That counts cuts of every prefix, not of the whole string.' },
        { text: 'C(n)', right: true, why: 'C(i) counts cuts of the first i letters, and the string has n.' },
      ] },
    ],
    apply: { cell: [0, 4] },
  },
}
