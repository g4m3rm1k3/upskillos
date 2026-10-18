// "Design it yourself" for the scheduling and trading lessons (Structured, scheduling group). Format: designs.js.
// Their numbers are checked against structured-oracles.js, which tries every subset, action sequence or cut set.

const days = { text: 'Day by day, every state from the day before', right: true, why: 'Each day’s states read only yesterday’s, so one pass through the prices fills them.' }

export const SCHEDULING_DESIGNS = {
  'weighted-intervals': {
    problem: 'Jobs have a start, an end and a value. Choose jobs that do not overlap (one may start when another ends) to make the total value as large as possible.',
    tryFirst: {
      prompt: 'Jobs [0, 2] worth 4, [2, 4] worth 5, and [0, 4] worth 8. What is the largest total value?',
      args: [[[0, 2, 4], [2, 4, 5], [0, 4, 8]]], answer: 9,
      misconceptions: [
        { answer: 8, feedback: 'That takes the most valuable job first, and it blocks both others. The two short jobs fit together: 4 + 5.' },
        { answer: 17, feedback: 'The long job overlaps both short ones.' },
      ],
      explain: '[0, 2] and [2, 4]: 9. Sorted by end time, each job is taken or skipped, and taking it leaves only the jobs that end by its start.',
    },
    steps: [
      { kind: 'state', ask: 'With jobs sorted by end time, what should D(i) mean?', options: [
        { text: 'The best value from the first i jobs', right: true, why: 'Sorted by end, the first i jobs are everything that finishes by job i’s end.' },
        { text: 'The best value of jobs that overlap job i', why: 'Overlapping jobs cannot be taken together; the question is about compatible ones.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for job i?', options: [
        { text: 'Take it or skip it', right: true, why: 'Skip: D(i − 1). Take: its value plus the best among jobs that end by its start.' },
        { text: 'Take it if it is the most valuable so far', why: 'That is greedy, which gives 8 in the try-first question.' },
      ] },
      { kind: 'recurrence', ask: 'With p(i) the last job ending by job i’s start, which rule fills D(i)?', options: [
        { text: 'max(D(i − 1), v_i + D(i − 1))', why: 'D(i − 1) may include jobs that overlap job i.' },
        { text: 'max(D(i − 1), v_i + D(p(i)))', right: true, why: 'Taking job i leaves only the jobs that end by its start, the first p(i) of them.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 0: no jobs, no value', right: true, why: 'p(i) = 0 when nothing ends before job i starts.' },
        { text: 'D(1) = the first job’s value, and D(0) is not needed', why: 'D(p(i)) reads D(0) whenever no earlier job is compatible.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Sort by end time, find each p(i) by binary search, then i increasing', right: true, why: 'D(i) reads only earlier jobs.' },
        { text: 'Sort by start time', why: 'Then “the first i jobs” is not everything that ends before job i, and p(i) has no meaning.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'D(i) is the best from the first i jobs, and the question is all n of them.' },
        { text: 'The most valuable single job', why: 'Several smaller compatible jobs can be worth more.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 15, feedback: 'That adds D(3) = 9, but job 3, [3,5), overlaps [4,7). Only jobs that end by 4 can come before it: D(2) = 4.' },
      { answer: 9, feedback: 'That skips the job. Taking it gives 6 + D(2) = 10, which is more.' },
    ] },
  },

  'deadline-scheduling': {
    problem: 'Jobs have a duration, a reward and a deadline. One machine starts at time 0 and runs one job at a time. Choose jobs that can all finish by their deadlines, to earn the most.',
    tryFirst: {
      prompt: 'Jobs (duration, reward, deadline): (3, 6, 3), (2, 4, 4), (2, 4, 4). What is the most you can earn?',
      args: [[[3, 6, 3], [2, 4, 4], [2, 4, 4]]], answer: 8,
      misconceptions: [
        { answer: 6, feedback: 'Taking the biggest reward first uses time 0 to 3, and then neither short job finishes by 4. The two short jobs together finish at 2 and 4.' },
        { answer: 14, feedback: 'All three need 7 units of time; the deadlines are 3 and 4.' },
      ],
      explain: 'Both 2-unit jobs: finished at 2 and 4, earning 8. Sorted by deadline, a set fits exactly when doing it in that order meets every deadline, so time used so far is the state.',
    },
    steps: [
      { kind: 'state', ask: 'With jobs sorted by deadline, what should D(i, t) mean?', options: [
        { text: 'The most reward from the first i jobs, using exactly t units of time', right: true, why: 'The time used so far is what decides whether the next job can still meet its deadline.' },
        { text: 'The most reward from the first i jobs', why: 'Two choices with the same reward but different finishing times have different futures.' },
      ] },
      { kind: 'split', ask: 'What is the choice for job i?', options: [
        { text: 'Skip it, or run it next, finishing at time t', right: true, why: 'Running it in deadline order is safe: if a set can be scheduled at all, earliest deadline first works.' },
        { text: 'Run it at the time with the most room', why: 'Jobs run back to back from time 0; the question is only whether it is included.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i, t)?', options: [
        { text: 'max(D(i − 1, t), r_i + D(i − 1, t − d_i)) when t ≤ deadline_i', right: true, why: 'Including job i means it finishes at t, which must be by its deadline.' },
        { text: 'max(D(i − 1, t), r_i + D(i − 1, t − d_i))', why: 'This ignores the deadline, so too many jobs fit.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = 0, and every other time with no jobs is impossible', right: true, why: 'With no jobs, the only time you can have used is 0; any other time is impossible.' },
        { text: 'D(0, t) = t for every t', why: 'Time used is not reward; with no jobs nothing has been earned.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Jobs sorted by deadline, then each job’s row from the one before', right: true, why: 'Row i reads only row i − 1.' },
        { text: 'Jobs sorted by reward', why: 'Then a later job may have an earlier deadline, and running jobs in this order can miss deadlines that another order meets.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest D(n, t) over every t', right: true, why: 'The best set can finish at any time.' },
        { text: 'D(n, the latest deadline)', why: 'The best set may finish earlier.' },
      ] },
    ],
    apply: { cell: [3, 4], misconceptions: [
      { answer: 12, feedback: 'All three jobs take 5 hours, and this cell is exactly 4. Finishing the last job at 4 leaves 2 hours before it: D(2,2) = 5.' },
      { answer: 7, feedback: 'Jobs 1 and 3 together take 3 hours, not 4. This cell counts exactly 4 hours used.' },
    ] },
  },

  'stock-states': {
    problem: 'Given a stock’s price on each day, buy and sell as often as you like, holding at most one share at a time. Find the largest profit.',
    tryFirst: {
      prompt: 'Prices [7, 1, 5, 3, 6, 4]. What is the largest profit with as many trades as you like?',
      args: [[7, 1, 5, 3, 6, 4]], answer: 7,
      misconceptions: [
        { answer: 5, feedback: 'That is one trade, buying at 1 and selling at 6. Two trades do better: 1 → 5 and 3 → 6.' },
      ],
      explain: '1 → 5 (4) and 3 → 6 (3): 7. Each day you either hold a share or not, and what you may do next depends only on that.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each day?', options: [
        { text: 'The best cash so far', why: 'Whether you hold a share decides whether you can sell tomorrow; cash alone does not say.' },
        { text: 'Two values: the best cash if you hold no share, and the best if you hold one', right: true, why: 'The holding state is everything the future needs.' },
      ] },
      { kind: 'split', ask: 'What can happen on a day?', options: [
        { text: 'Without a share: wait or buy. With a share: wait or sell', right: true, why: 'Those are the legal moves between the two states.' },
        { text: 'Buy if the price will rise tomorrow', why: 'That peeks at the future; the table compares outcomes instead.' },
      ] },
      { kind: 'recurrence', ask: 'Which rules fill the two states on a day with price p?', options: [
        { text: 'cash = max(cash, hold + p); hold = max(hold, cash − p), both from yesterday’s values', right: true, why: 'Sell from hold into cash, buy from cash into hold.' },
        { text: 'cash = max(cash, p); hold = max(hold, −p)', why: 'That is one trade at most, selling or buying without the profits before.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'Before day 1: cash = 0, hold = −∞', right: true, why: 'You start with no share; holding one before any price is impossible.' },
        { text: 'Before day 1: cash = 0, hold = 0', why: 'That would be a free share.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Update hold first, then use the new hold for cash', why: 'That lets you buy and sell on the same day from today’s values; compute both from yesterday’s.' },
        days,
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'cash after the last day', right: true, why: 'Ending with a share is never better: it was bought at a cost and never sold.' },
        { text: 'max(cash, hold) after the last day', why: 'hold has paid for a share that was never sold; it is never larger than cash at the end.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 5, feedback: 'Selling needs a share. The best way to hold one before day 3 is hold(2) = −1 (bought at 1), so selling gives −1 + 5.' },
    ] },
  },

  'stock-k': {
    problem: 'The stock problem, but with at most k completed trades (a buy followed by a sell). Find the largest profit.',
    tryFirst: {
      prompt: 'Prices [3, 3, 5, 0, 0, 3, 1, 4], at most 2 trades. What is the largest profit?',
      args: [[3, 3, 5, 0, 0, 3, 1, 4], 2], answer: 6,
      misconceptions: [
        { answer: 8, feedback: 'That uses three trades (3 → 5, 0 → 3, 1 → 4). With two, buy at 0 and sell at 4 is one of them.' },
        { answer: 4, feedback: 'That is one trade, 0 → 4. A second trade, 3 → 5 earlier, adds 2.' },
      ],
      explain: '3 → 5 and 0 → 4: 2 + 4 = 6. Now the state also counts completed trades.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each day?', options: [
        { text: 'cash[t] and hold[t]: the best values with t trades completed', right: true, why: 'The number of completed trades is what limits the future.' },
        { text: 'cash and hold, as with unlimited trades', why: 'Without the count nothing stops a third trade.' },
      ] },
      { kind: 'split', ask: 'When does the trade count go up?', options: [
        { text: 'On a sale', right: true, why: 'A trade completes when the share is sold; buying starts one.' },
        { text: 'On every buy and on every sell', why: 'That counts each trade twice, so k trades would stop after k / 2.' },
      ] },
      { kind: 'recurrence', ask: 'Which rules fill the states on a day with price p?', options: [
        { text: 'hold[t] = max(hold[t], cash[t] − p); cash[t + 1] = max(cash[t + 1], hold[t] + p)', right: true, why: 'Buying keeps the count; selling moves to t + 1.' },
        { text: 'cash[t] = max(cash[t], hold[t] + p)', why: 'Selling has to complete a trade, moving from t to t + 1.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'cash[0] = 0; every other cash[t] and every hold[t] = −∞', right: true, why: 'At the start nothing is held and no trade is done.' },
        { text: 'cash[t] = 0 for every t', why: 'That claims trades were done without doing them, allowing extra trades for free.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [days, { text: 'Days from the last to the first', why: 'Each day’s states read yesterday’s, which would not be filled yet.' }] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest cash[t] over t ≤ k after the last day', right: true, why: 'Fewer trades may be better.' },
        { text: 'cash[k] after the last day', why: 'Using exactly k trades may be worse than fewer.' },
      ] },
    ],
    apply: { cell: [2, 3], misconceptions: [
      { answer: 5, feedback: 'That sells without paying for the share. hold[0](2) = −3 already includes buying at 3: −3 + 5 = 2.' },
    ] },
  },

  'stock-cooldown': {
    problem: 'The stock problem with unlimited trades, but after selling you must wait a day before buying again. (A per-sale fee can be added the same way.)',
    tryFirst: {
      prompt: 'Prices [1, 2, 3, 0, 2], one day of cooldown after a sale. What is the largest profit?',
      args: [[1, 2, 3, 0, 2], 1, 0], answer: 3,
      misconceptions: [
        { answer: 4, feedback: 'Selling at 3 on day 3 and buying at 0 on day 4 breaks the cooldown.' },
      ],
      explain: 'Buy 1, sell 2, rest, buy 0, sell 2: 1 + 2 = 3. A sale today changes what tomorrow allows, so “just sold” is its own state.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each day?', options: [
        { text: 'cash and hold, as before', why: 'After a sale you have cash but may not buy tomorrow; cash cannot tell a fresh sale from a rested one.' },
        { text: 'Three values: holding, just sold today, and resting (free to buy)', right: true, why: 'The extra state remembers the sale that blocks tomorrow.' },
      ] },
      { kind: 'split', ask: 'Where can a buy come from?', options: [
        { text: 'Only from yesterday’s resting state', right: true, why: 'From “just sold” you must wait one day.' },
        { text: 'From any state without a share', why: 'That lets a buy follow a sale the very next day, which the cooldown forbids.' },
      ] },
      { kind: 'recurrence', ask: 'Which rules fill the states on a day with price p?', options: [
        { text: 'hold = max(hold, rest − p); sold = hold + p; rest = max(rest, sold), all from yesterday', right: true, why: 'Buy from rest, sell from hold, and a sale turns into rest a day later.' },
        { text: 'hold = max(hold, sold − p)', why: 'That buys the day after selling.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'rest = 0; hold and sold = −∞', right: true, why: 'At the start you are free to buy and hold nothing.' },
        { text: 'sold = 0 at the start', why: 'Then the first day could not buy, as if a sale had just happened.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [days, { text: 'Update sold first, then use it for rest on the same day', why: 'rest would absorb today’s sale immediately, skipping the cooldown; use yesterday’s values.' }] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'max(sold, rest) after the last day', right: true, why: 'Both states end without a share, so either can hold the best final cash.' },
        { text: 'hold after the last day', why: 'That has paid for a share never sold.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 2, feedback: 'That buys straight after yesterday’s sale, from sold(3) = 2. The cooldown forbids it: buy only from rest(3) = 1.' },
    ] },
  },

  'batch-scheduling': {
    problem: 'Jobs in a fixed order are run in consecutive batches. A batch costs a setup fee plus the square of its total length. Choose the batches that cost least.',
    tryFirst: {
      prompt: 'Job lengths [2, 1, 1, 2], setup fee 4. What is the cheapest total?',
      args: [[2, 1, 1, 2], 4], answer: 24,
      misconceptions: [
        { answer: 26, feedback: 'Two batches of 3 cost 2 · (4 + 9) = 26. Grouping the two 1s and leaving the 2s alone does better.' },
        { answer: 40, feedback: 'One batch: 4 + 6². The square makes big batches expensive.' },
      ],
      explain: '[2] [1, 1] [2]: 8 + 8 + 8 = 24. The setup fee pushes towards fewer batches and the square towards smaller ones; every split has a last batch.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'The cheapest way to run the first i jobs', right: true, why: 'A prefix of the jobs, batched; the rest is a shorter question.' },
        { text: 'The cheapest batch containing job i', why: 'One batch does not cover all the jobs.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for D(i)?', options: [
        { text: 'Where the last batch starts, j', right: true, why: 'Before it, the first j jobs are batched the best way.' },
        { text: 'How many batches there are', why: 'That is not needed: each batch pays its own fee, so the count is in the cost.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: 'The smallest D(j) + setup + (sum of jobs j … i − 1)² over j', right: true, why: 'The best for the jobs before, plus the last batch’s cost.' },
        { text: 'The smallest D(j) + (sum j … i − 1)²', why: 'It forgets the setup fee, so singles always win.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'D(0) = 0', right: true, why: 'With no jobs there is no batch to run, so nothing is paid.' },
        { text: 'D(0) = setup', why: 'No batch is run for zero jobs.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'i increasing', right: true, why: 'D(i) reads smaller prefixes.' },
        { text: 'Largest jobs first', why: 'The jobs’ order is fixed; prefixes decide what is ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'D(i) covers the first i jobs, and every job must run: all n.' },
        { text: 'The smallest D(i)', why: 'D(0) = 0 would always win; every job must run.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 8, feedback: 'That is only the last batch, 4 + 2². The first three jobs cost D(3) = 16 before it.' },
      { answer: 26, feedback: 'That makes the last batch jobs 3 and 4: D(2) + 4 + 3². Starting it at job 4 is cheaper: 16 + 4 + 4.' },
    ] },
  },

  'text-justification': {
    problem: 'Words (given by length) are placed in order on lines of a fixed width, one space between words. Every line except the last costs (unused space)². Break the lines as cheaply as possible.',
    tryFirst: {
      prompt: 'Word lengths [3, 2, 2, 5], width 6. What is the cheapest total?',
      args: [[3, 2, 2, 5], 6], answer: 10,
      misconceptions: [
        { answer: 16, feedback: 'Filling each line as full as possible puts “3 2” on line 1 (cost 0) and “2” alone on line 2 (cost 16). Starting a new line after the 3 is cheaper.' },
      ],
      explain: '“3” (cost 9), “2 2” (cost 1), “5” (last, free): 10. Greedy filling leaves a costly short line later, so every last line has to be tried.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'The cheapest way to set the first i words, where those lines are not the last', right: true, why: 'Each break leaves a smaller copy of the problem.' },
        { text: 'The number of words on line i', why: 'That is one line’s content; the question is about the whole layout.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for D(i)?', options: [
        { text: 'Which words share the line ending with word i: the line starts at word j', right: true, why: 'Before it, the first j words are set the best way.' },
        { text: 'Fit as many words as possible on each line', why: 'That is greedy, which gives 16 in the try-first question.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: 'The smallest D(j) + (width − line length)² over j where words j … i − 1 fit', right: true, why: 'Line length counts the words plus one space between each pair.' },
        { text: 'The smallest D(j) + (width − sum of word lengths)²', why: 'That forgets the spaces between words, so lines that do not fit look free.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'D(0) = 0', right: true, why: 'With no words there are no lines, so nothing is paid.' },
        { text: 'D(1) = (width − first word)²', why: 'That assumes the first word is alone on its line.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'i increasing', right: true, why: 'D(i) reads smaller prefixes.' },
        { text: 'Longest words first', why: 'The words’ order is fixed.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer, with the last line free?', options: [
        { text: 'The smallest D(j) over j where words j … n − 1 fit on one last line', right: true, why: 'The last line costs nothing, so choose where it starts.' },
        { text: 'D(n)', why: 'That charges the last line too.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 16, feedback: 'That puts word 3 on a line alone: D(2) + 4². Words 2 and 3 share a line 5 wide: D(1) + 1² = 9 + 1.' },
      { answer: 1, feedback: 'That is only the last line’s cost. The first line, word 1 alone, costs D(1) = 3² = 9 before it.' },
    ] },
  },

  'segmented-regression': {
    problem: 'Points with x = 0, 1, 2, … are split into consecutive segments, each fitted with its own straight line. The cost is the total squared error plus a penalty for every segment. Find the cheapest split.',
    tryFirst: {
      prompt: 'Points with y = 0, 1, 2, 10, 11, 12, penalty 3 per segment. What is the cheapest total?',
      args: [[0, 1, 2, 10, 11, 12], 3], answer: 6,
      misconceptions: [
        { answer: 18, feedback: 'One segment per point has no error, but pays the penalty six times.' },
        { answer: 3, feedback: 'One line cannot fit the jump from 2 to 10 without error.' },
      ],
      explain: 'Two segments, each a perfect line: 3 + 3 = 6. The penalty stops overfitting; every split has a last segment.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'The cheapest cost for the first i points', right: true, why: 'A prefix of the points, split into segments.' },
        { text: 'The error of the best single line through the first i points', why: 'That allows only one segment.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for D(i)?', options: [
        { text: 'Where the last segment starts, j', right: true, why: 'Before it, the first j points are split the best way.' },
        { text: 'How many segments to use', why: 'The penalty is in the cost, so the count comes out of the minimum.' },
      ] },
      { kind: 'recurrence', ask: 'With E(j, i) the least-squares error of points j … i − 1, which rule fills D(i)?', options: [
        { text: 'The smallest D(j) + E(j, i) + penalty over j', right: true, why: 'The best before, plus fitting and paying for the last segment.' },
        { text: 'The smallest D(j) + E(j, i)', why: 'Without the penalty, one segment per point always wins with zero error.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'D(0) = 0, and every E(j, i) computed in advance', right: true, why: 'Precomputing the errors keeps each step cheap.' },
        { text: 'D(0) = penalty', why: 'No segment has been made yet.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Errors for every stretch first, then i increasing', right: true, why: 'D(i) reads smaller prefixes and the errors.' },
        { text: 'i decreasing', why: 'D(i) reads smaller prefixes.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'D(i) covers the first i points, and every point must be fitted: all n.' },
        { text: 'The smallest E(0, i)', why: 'That fits only some of the points with one line.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 3, feedback: 'That is D(3) alone. Point 4 still needs a segment: either a new one (+ 3, and its error 0) or a longer last segment with a larger error.' },
    ] },
  },
}
