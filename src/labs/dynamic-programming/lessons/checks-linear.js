// "Check yourself" for the one-dimensional and finite-state lessons (Core, linear group).
// Format and checks: checks.js and checks.test.js. Every typed number was printed by the
// brute-force oracles before it was typed, and checks.test.js compares them again.

export const LINEAR_CHECKS = {
  fibonacci: [
    {
      know: 'The plain recursion fib(n) calls fib(n − 1) and fib(n − 2), and each of those calls its own two, until n is 0 or 1. Nothing is remembered, so the same n is asked for again and again.',
      ask: 'Count every call, the first one included. How many calls does the plain recursion make for fib(5)?',
      args: [5], answer: 15, oracle: 'fib-calls',
      misconceptions: [
        { answer: 6, feedback: '6 is the number of different values, fib(0) to fib(5): that is what the memoised version calls. The plain recursion asks for most of them more than once.' },
        { answer: 5, feedback: '5 is fib(5) itself, the answer, not the number of calls. Draw the call tree and count its nodes.' },
      ],
      explain: 'fib(5) calls fib(4) (9 calls in all) and fib(3) (5 calls), plus itself: 9 + 5 + 1 = 15. The count grows like Fibonacci itself, which is why the table, with one cell per n, is so much faster.',
    },
    {
      know: 'The loop keeps two variables, a and b, the last two terms. Each pass replaces them with the next pair, and the older terms are never read again.',
      ask: 'How much memory does the loop need for n = 1,000,000 (counting the numbers it stores, not their size)?',
      options: [
        { text: 'Two numbers, whatever n is', right: true, why: 'Each term reads only the two before it, so a window of two is enough. That is the space saving every “only the last row” DP uses.' },
        { text: 'A million numbers, one per term', why: 'That is the full table. It works, but the loop never reads a term older than two steps, so it can throw them away.' },
        { text: 'About a million squared, one per pair of terms', why: 'Nothing here compares pairs of terms. Each term depends on two cells, not on every other cell.' },
      ],
    },
    {
      know: 'A memoised recursion and a loop fill the same cells, fib(0) to fib(n), each once. The recursion starts at n and goes down until it reaches a stored value; the loop starts at 0 and goes up.',
      ask: 'What can go wrong with the memoised recursion for a large n that can’t go wrong with the loop?',
      options: [
        { text: 'It computes some cells more than once', why: 'Not with the memo: a cell is computed on its first call and read from the memo after that.' },
        { text: 'The chain of calls is n deep, and a very deep chain can overflow the call stack', right: true, why: 'fib(n) waits for fib(n − 1), which waits for fib(n − 2), and so on: n calls open at once. Python stops at about a thousand by default. The loop never nests.' },
        { text: 'It gives a different answer, because it fills the cells in another order', why: 'The order changes, but each cell still gets the same value: the definition fixes it.' },
      ],
    },
  ],

  stairs: [
    {
      know: 'W(h) counts the ordered step sequences that land exactly on stair h: W(h) = W(h − 1) + W(h − 2) for steps {1, 2}, with W(0) = 1.',
      ask: 'With steps {1, 2}, how many ordered sequences land exactly on stair 6?',
      args: [6, [1, 2]], answer: 13,
      misconceptions: [
        { answer: 4, feedback: '4 counts which steps are used (no 2s, one, two or three), not the orders. 1 + 2 + 2 + 1 and 2 + 2 + 1 + 1 are different sequences. That count is the coin combinations problem.' },
        { answer: 8, feedback: '8 is W(5), one stair short. Number the cells from W(0) = 1: 1, 1, 2, 3, 5, 8, 13.' },
      ],
      explain: '1, 1, 2, 3, 5, 8, 13 for stairs 0 to 6: each cell is the sum of the two below it, so the staircase with steps {1, 2} is the Fibonacci sequence moved by one.',
    },
    {
      know: 'Coin change appears in two forms: counting ordered sequences of coins (1 + 2 and 2 + 1 are different) and counting combinations (they are the same).',
      ask: 'Which other lesson’s table is exactly this one, with coins for step sizes and the amount for the stair?',
      options: [
        { text: 'Coin combinations', why: 'Combinations count 1 + 2 and 2 + 1 once. The staircase counts them as two different climbs, so its numbers are bigger.' },
        { text: 'Coin permutations', right: true, why: 'An ordered sequence of coins adding to the amount is an ordered sequence of steps landing on the stair. Same question, same table, same loops.' },
        { text: 'Minimum coins', why: 'That table holds the fewest coins for each amount, a minimum, not a count of ways.' },
      ],
    },
    {
      know: 'W(h) adds W(h − s) for every step size s that fits, starting from W(0) = 1. A stair no sequence can land on has W(h) = 0.',
      ask: 'With steps {2, 4}, which stairs have W(h) = 0?',
      options: [
        { text: 'None: there is always some way up', why: 'Every step is even, so every sequence lands only on even stairs. Stair 3 can’t be reached exactly.' },
        { text: 'Only stair 1', why: 'Stair 1 is one of them, but so is stair 3, and every other odd stair. A sum of even steps is always even.' },
        { text: 'Every odd stair', right: true, why: 'The table shows it: W(1) reads nothing, W(3) reads W(1) and W(−1) (no stair), and so on. All the odd cells stay 0.' },
      ],
    },
  ],

  'min-cost-stairs': [
    {
      know: 'best[i] = costs[i] + the cheaper of best[i − 1] and best[i − 2], where the ground before stair 0 costs nothing. You must finish standing on the last stair.',
      ask: 'costs = [1, 9, 9, 1, 9]. What is the cheapest total?',
      args: [[1, 9, 9, 1, 9]], answer: 19,
      misconceptions: [
        { answer: 20, feedback: '20 is the greedy climb: always step onto the cheaper of the next two stairs. It takes the 1 on stair 0, then has to pay a 9 to go on. Jumping from the ground straight to stair 1 is dearer at first but lands on the cheap stair 3.' },
        { answer: 10, feedback: '10 finishes on stair 3. The problem says you must end on the last stair, which costs 9.' },
      ],
      explain: 'best = [1, 9, 10, 10, 19]: ground → stair 1 (9) → stair 3 (1) → stair 4 (9). The cheapest way onto stair 3 goes through the dear stair 1, which a greedy climb never tries.',
    },
    {
      know: 'A greedy method makes the choice that looks best now and never looks back. A DP tries every last move and keeps the best total for each stair.',
      ask: 'Why does “step onto the cheaper of the next two stairs” fail?',
      options: [
        { text: 'It doesn’t: a cheaper stair now is always part of a cheaper climb', why: 'The check above is a counterexample: greedy pays 20 where 19 is possible.' },
        { text: 'A cheap stair now can leave only dear stairs within reach later', right: true, why: 'The step you take decides which stairs you can reach next. best[i] compares whole climbs to stair i, so it sees that cost; greedy compares only the next stair.' },
        { text: 'Greedy forgets that you may jump two stairs at a time', why: 'Greedy does consider both moves. Its mistake is choosing between them by the next stair alone.' },
      ],
    },
    {
      know: 'Each cell reads the cells a move could have come from. Here a move goes up one or two stairs.',
      ask: 'If a move could go up one, two or three stairs, what changes?',
      options: [
        { text: 'best[i] takes the cheapest of three cells, and stair 2 can also be reached straight from the ground', right: true, why: 'The new move adds a third place to come from, best[i − 3], and the ground counts as a free start for stairs 0, 1 and 2.' },
        { text: 'The table needs a second dimension for the move size', why: 'The cost of standing on stair i doesn’t depend on how you got there, so one index is still enough. Only the number of cells read grows.' },
        { text: 'Nothing: longer moves are never cheaper', why: 'A longer move skips stairs, and skipping a dear stair can be cheaper.' },
      ],
    },
  ],

  'house-robber': [
    {
      know: 'best[i] = max(best[i − 1], best[i − 2] + values[i]): skip house i, or take it and add the best from two houses back.',
      ask: 'values = [2, 1, 1, 2]. What is the largest total?',
      args: [[2, 1, 1, 2]], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 is the better of “every other house from the first” and “every other house from the second”. Skipping two houses in a row is allowed, and here it lets you take both ends: 2 + 2.' },
        { answer: 6, feedback: '6 takes every house, but neighbours may not both be robbed.' },
      ],
      explain: 'best = [2, 2, 3, 4]: take houses 0 and 3. The best choice skips two houses in a row, which no “every other house” pattern does.',
    },
    {
      know: 'best[i] reads only best[i − 1] and best[i − 2].',
      ask: 'How many values does the loop really need to keep?',
      options: [
        { text: 'All n, to find the answer at the end', why: 'The answer is the last cell, and each cell needs only the two before it, so older cells can be dropped.' },
        { text: 'Two: the best up to the previous house and the one before that', right: true, why: 'The same window as Fibonacci: prev and cur, updated together on every house.' },
        { text: 'One: the best so far', why: 'One isn’t enough: taking house i must add the best from two houses back, which is a different value from the best so far.' },
      ],
    },
    {
      know: 'The table gives the best total, not the houses. A walk back from the last cell can recover them: each cell’s value came from one of its two options.',
      ask: 'Walking back from house i, how do you know whether it was taken?',
      options: [
        { text: 'If values[i] > values[i − 1], it was taken', why: 'Comparing neighbours alone is a greedy guess. With [3, 2, 1] the best plan takes houses 0 and 2 (3 + 1), although house 2 is worth less than house 1.' },
        { text: 'If best[i] == best[i − 1], house i was skipped; otherwise it was taken, and the walk jumps to i − 2', right: true, why: 'Equal means skipping gives the best total, so the cell came from best[i − 1]. Otherwise it came from best[i − 2] + values[i].' },
        { text: 'You can’t: the table keeps only totals', why: 'The totals are enough. Each cell was made by one of two options, and you can tell which by comparing the cells.' },
      ],
    },
  ],

  'circular-selection': [
    {
      know: 'On a ring the first and last houses are neighbours. The answer is the better of two line problems: without the first house, or without the last.',
      ask: 'values = [5, 1, 1, 5] in a circle. What is the largest total?',
      args: [[5, 1, 1, 5]], answer: 6,
      misconceptions: [
        { answer: 10, feedback: '10 takes both 5s, which is the answer on a line. On a ring the two 5s are neighbours.' },
        { answer: 5, feedback: '5 takes one end house alone. With it you can also take the 1 that isn’t next to it.' },
      ],
      explain: 'Without the last house: [5, 1, 1] gives 5 + 1 = 6. Without the first: [1, 1, 5] gives 1 + 5 = 6. The best is 6.',
    },
    {
      know: 'House robbing on a line takes one pass over the houses.',
      ask: 'How much more work is the ring than the line?',
      options: [
        { text: 'n times as much: try each house as the place where the ring is cut', why: 'That works but is n line runs, O(n²). Two cuts are enough, because the only rule the ring adds is about the first and last house.' },
        { text: 'Twice as much: two line runs', right: true, why: 'One run without the first house and one without the last: still O(n).' },
        { text: 'The same: one line run, then a fix if both ends are taken', why: 'A “fix” can’t just drop one end: the best plan without that end may take quite different houses. That is what the second run computes.' },
      ],
    },
    {
      know: 'The code returns max(line(values[1:]), line(values[:-1])), and treats a single house separately.',
      ask: 'Why does a ring of one house need its own case?',
      options: [
        { text: 'Both line runs drop the only house, so both return 0', right: true, why: 'values[1:] and values[:-1] are empty for one house. But one house is not its own neighbour, so it may be taken.' },
        { text: 'A single house is its own neighbour, so the answer is 0', why: 'The problem says a single house may be taken. Neighbours are two different houses.' },
        { text: 'It doesn’t; the special case is only for speed', why: 'Without it the answer is wrong: the two runs return 0 for [9], and the answer is 9.' },
      ],
    },
  ],

  'activity-selection': [
    {
      know: 'best[a] is the best total that ends today with activity a; tomorrow’s a adds its reward to the best of yesterday’s other activities.',
      ask: 'rewards = [[1, 9], [1, 9], [1, 9]]: three days, the same two activities. What is the largest total?',
      args: [[[1, 9], [1, 9], [1, 9]]], answer: 19,
      misconceptions: [
        { answer: 27, feedback: '27 does activity 1 every day, which the rule forbids.' },
        { answer: 18, feedback: '18 is 9 + 9, two days. There are three days, and every day you must do one activity: 9 + 1 + 9.' },
      ],
      explain: 'Activity 1, then 0, then 1: 9 + 1 + 9 = 19. Day by day the cells are [1, 9], [10, 10], [11, 19].',
    },
    {
      know: 'The state is not just “the best total after day d”; it is “the best total after day d that ends with activity a”, one cell per activity.',
      ask: 'Why does the state record the last activity?',
      options: [
        { text: 'Because the rule for tomorrow depends on it', right: true, why: 'Whether tomorrow’s activity is allowed depends only on today’s. Keeping one cell per last activity is exactly what lets each step check the rule.' },
        { text: 'Only to print the plan at the end', why: 'Printing is a walk back. The recurrence itself needs the last activity, or it can’t enforce the rule.' },
        { text: 'It doesn’t need to: the best total of each day is enough', why: 'With one number per day you don’t know whether tomorrow may repeat the activity that made it. The check above shows the result: 27 instead of 19.' },
      ],
    },
    {
      know: 'With k activities, each of today’s k cells looks at yesterday’s k − 1 other cells: k² work per day.',
      ask: 'How can a day cost k work instead of k²?',
      options: [
        { text: 'Sort today’s rewards first', why: 'Sorting today’s rewards doesn’t tell you which of yesterday’s cells each one may follow.' },
        { text: 'Keep yesterday’s best and second best, and which activity gave the best', right: true, why: 'For activity a, the best other cell is the best one, unless a gave it; then it is the second best. One pass finds both.' },
        { text: 'It can’t: every pair of activities must be compared', why: 'Only the top two of yesterday matter for any activity, so the pairs never need comparing.' },
      ],
    },
  ],

  'max-subarray': [
    {
      know: 'end_sum is the best sum of a run that ends at the current index: extend the previous run if it is not negative, otherwise start again.',
      ask: 'values = [3, −4, 5, −1, 2]. What is the largest sum of a run of consecutive values?',
      args: [[3, -4, 5, -1, 2]], part: 0, answer: 6,
      misconceptions: [
        { answer: 5, feedback: '5 is the largest single value. Extending the run past −1 to the 2 adds 1 in all.' },
        { answer: 10, feedback: '10 adds every positive value, but they aren’t consecutive: the run from 3 to 2 includes the −4 and the −1, which makes 5.' },
      ],
      explain: 'end_sum goes 3, −1, 5, 4, 6. After the −4 the run sums to −1, so it starts again at 5; then 5 − 1 + 2 = 6.',
    },
    {
      know: 'A run must contain at least one value, so best starts at values[0] and the empty run, worth 0, is never an answer.',
      ask: 'values = [−3, −1, −2]. What is the largest sum?',
      args: [[-3, -1, -2]], part: 0, answer: -1,
      misconceptions: [
        { answer: 0, feedback: '0 is the empty run, which the problem doesn’t allow. That is why best starts at values[0], not at 0.' },
        { answer: -6, feedback: '−6 is the whole list. A run can be a single value, and the largest is −1.' },
      ],
      explain: 'Every run is negative, so the best is the single largest value, −1.',
    },
    {
      know: 'Extending adds values[i] to end_sum; starting again gives values[i] alone.',
      ask: 'Why does the code start a new run when end_sum is negative?',
      options: [
        { text: 'A negative run in front only lowers any run that continues it', right: true, why: 'end_sum + values[i] < values[i] when end_sum < 0, so the best run ending at i drops it.' },
        { text: 'To keep the numbers small', why: 'The size of the numbers doesn’t matter. The reason is that the extended sum would be smaller.' },
        { text: 'Because the next value is probably positive', why: 'The rule doesn’t look at the next value at all. It compares the two ways to end a run at i.' },
      ],
    },
  ],

  'max-product': [
    {
      know: 'hi and lo are the largest and smallest products of a run ending here; the next ones are the largest and smallest of v, hi·v and lo·v.',
      ask: 'values = [−2, 3, −4]. What is the largest product of a run?',
      args: [[-2, 3, -4]], answer: 24,
      misconceptions: [
        { answer: 3, feedback: '3 keeps only the largest product at each step. The smallest one, −6, times −4 gives 24.' },
        { answer: -12, feedback: '−12 is 3 · −4, the run without the −2. Two negatives make a positive, so the whole run −2 · 3 · −4 is better.' },
      ],
      explain: 'hi and lo go (−2, −2), (3, −6), (24, −12). The best run is the whole list.',
    },
    {
      know: 'A 0 makes every product that includes it 0.',
      ask: 'values = [2, 0, −3, 5]. What is the largest product?',
      args: [[2, 0, -3, 5]], answer: 5,
      misconceptions: [
        { answer: 0, feedback: '0 is a product of a run with the 0 in it, but the run [5] alone is bigger.' },
        { answer: -15, feedback: '−15 is the product of the whole run after the 0. A shorter run, 5 on its own, is bigger.' },
      ],
      explain: 'At the 0, hi and lo both become 0, so the runs after it start fresh: −3 then 5 gives hi = 5.',
    },
    {
      know: 'Max subarray drops a run whose sum is negative.',
      ask: 'Why can’t max product drop a run whose product is negative?',
      options: [
        { text: 'A negative product times a later negative value becomes positive, and can be the best', right: true, why: 'That is why lo is kept: it is the run that may turn into the best after the next negative number.' },
        { text: 'It can; dropping negative runs is just as right here', why: 'With [−2, 3, −4] that would drop −2 · 3 and miss 24.' },
        { text: 'Because products grow faster than sums', why: 'Growth isn’t the issue; the sign is. A sum never changes sign by adding a negative number to a negative sum, but a product does.' },
      ],
    },
  ],

  'decode-ways': [
    {
      know: 'ways[i] adds ways[i − 1] if the last digit is not 0, and ways[i − 2] if the last two digits are 10 to 26.',
      ask: 'How many readings does "1226" have?',
      args: ['1226'], answer: 5,
      misconceptions: [
        { answer: 4, feedback: '4 counts the readings with one pair at most: none, 12, 22 or 26. 12 26 uses two pairs at once.' },
      ],
      explain: '1 2 2 6, 12 2 6, 1 22 6, 1 2 26, 12 26. The table goes 1, 1, 2, 3, 5.',
    },
    {
      know: 'A 0 can’t be a letter on its own; it must be the second digit of 10 or 20.',
      ask: 'How many readings does "30" have?',
      args: ['30'], answer: 0,
      misconceptions: [
        { answer: 1, feedback: '1 reads 3 and then 0 as a letter, but 0 isn’t a letter, and 30 is more than 26.' },
      ],
      explain: 'The 0 can’t stand alone and 30 isn’t a letter, so no reading exists.',
    },
    {
      know: 'ways[0] is the count for the empty prefix, before any digit is read.',
      ask: 'Why is ways[0] = 1?',
      options: [
        { text: 'The empty string has one reading: no letters', right: true, why: 'Every complete reading is built from it. With ways[0] = 0, nothing would ever be counted.' },
        { text: 'It is a placeholder; any value works', why: 'ways[1] and ways[2] read it, so its value flows into every answer.' },
        { text: 'Because the first digit is always a letter', why: 'A first digit 0 is not a letter. ways[0] is about the empty prefix, not the first digit.' },
      ],
    },
  ],

  'word-break': [
    {
      know: 'ok[i] is true when the first i characters can be cut into words, with ok[0] = true.',
      ask: 'Can "aaab" be cut into words from ["a", "aa"]?',
      kind: 'yesno', args: ['aaab', ['a', 'aa']], answer: false,
      misconceptions: [
        { answer: true, feedback: 'The "aaa" part can be cut, but the "b" is in no word, so the last cell is false.' },
      ],
      explain: 'ok is true for 0 to 3 characters and false for 4: no word ends with "b".',
    },
    {
      know: 'A greedy cutter takes the longest word that matches at the current position and moves on.',
      ask: 's = "abcd", words = ["abc", "ab", "cd"]. What does the greedy cutter do?',
      options: [
        { text: 'It cuts "abc", then can’t cut "d", and says no, although "ab" + "cd" works', right: true, why: 'The longest first word left a remainder no word fits. The table tries every last word, so it finds ab + cd.' },
        { text: 'It finds "ab" + "cd", the same as the table', why: 'The greedy cutter takes "abc", the longest match, and never tries "ab".' },
        { text: 'It loops forever', why: 'Every cut moves forward, so it stops. It stops with the wrong answer.' },
      ],
    },
    {
      know: 'For each i the code tries every word, and comparing a word with the end of the prefix takes up to its length.',
      ask: 'With n characters, m words and words of length up to L, how much work is it?',
      options: [
        { text: 'About n · m · L', right: true, why: 'n cells, m words each, and a comparison of up to L characters for each.' },
        { text: 'About 2ⁿ, one for each way to cut', why: 'That is the number of cuttings, which the table never lists. Each cell is computed once.' },
        { text: 'About n', why: 'Each cell does more than constant work: it tries every word.' },
      ],
    },
  ],

  'word-break-count': [
    {
      know: 'count[i] adds count[i − len(w)] for every word w that ends the prefix.',
      ask: 'How many ways can "aaa" be cut into words from ["a", "aa"]?',
      args: ['aaa', ['a', 'aa']], answer: 3,
      misconceptions: [
        { answer: 1, feedback: '1 answers “can it be cut?” as a number. The question is how many ways.' },
        { answer: 2, feedback: 'Close. a + a + a, a + aa and aa + a: the order of the pieces makes them different cuttings.' },
      ],
      explain: 'count = [1, 1, 2, 3]: a·a·a, a·aa, aa·a.',
    },
    {
      know: 'With words ["a", "aa"], every cutting of a string of a’s ends with "a" or with "aa".',
      ask: 'For s = "a" repeated n times and words ["a", "aa"], how does the count grow?',
      options: [
        { text: 'Like Fibonacci: each count is the sum of the two before it', right: true, why: 'count[i] = count[i − 1] + count[i − 2]: 1, 1, 2, 3, 5, 8, 13. It is the staircase with steps {1, 2}.' },
        { text: 'By one each time', why: 'Each new "a" can join the last piece or start a new one, and both choices carry all the earlier ways.' },
        { text: 'It doubles each time', why: 'Doubling would be true if every cut between letters were free; "aaa" would have 4. It has 3.' },
      ],
    },
    {
      know: 'The yes/no version keeps ok[i]; the counting version keeps count[i] for the same prefixes.',
      ask: 'How are the two tables related?',
      options: [
        { text: 'ok[i] is true exactly when count[i] > 0', right: true, why: 'There is some way to cut the prefix exactly when the number of ways is not 0. Counting answers the yes/no question too.' },
        { text: 'They aren’t related; they solve different problems', why: 'They have the same cells and the same last-word split; only “or” became “+”.' },
        { text: 'count[i] is always 0 or 1', why: 'A prefix can have many cuttings, as "aaa" shows.' },
      ],
    },
  ],
}
