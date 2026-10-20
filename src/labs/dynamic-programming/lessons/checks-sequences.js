// "Check yourself" for the subsequence lessons (Structured, sequences group). Format and checks:
// checks.js and checks.test.js. Structured lessons have no challenge, so the numbers are checked
// against the enumeration oracles in structured-oracles.js; each was printed there before it was typed.

export const SEQUENCE_CHECKS = {
  lis: [
    {
      know: 'L(i) is the length of the longest strictly increasing subsequence ending at position i: 1 + the largest L(j) over earlier j with a smaller value.',
      ask: 'a = [5, 1, 2, 3, 0, 4]. How long is the longest strictly increasing subsequence?',
      args: [[5, 1, 2, 3, 0, 4]], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 is the longest run of neighbours, 1 2 3. A subsequence may skip positions: 1 2 3 4 skips the 0.' },
        { answer: 1, feedback: '1 is the greedy walk that starts with the 5 and waits for something larger. Starting low is better.' },
      ],
      explain: '1, 2, 3, 4. L: 1, 1, 2, 3, 1, 4.',
    },
    {
      know: 'Sorting a copy of the values (without repeats) gives a sequence every increasing subsequence must follow.',
      ask: 'How does LIS relate to the longest common subsequence?',
      options: [
        { text: 'LIS(a) = LCS(a, the sorted values of a without repeats)', right: true, why: 'A common subsequence of a and its sorted copy is increasing and in a’s order: exactly an increasing subsequence.' },
        { text: 'LIS(a) = LCS(a, a reversed)', why: 'That gives the longest palindromic subsequence, a different question.' },
        { text: 'They are unrelated', why: 'Every increasing subsequence is common to a and its sorted copy, so the two lengths are equal.' },
      ],
    },
    {
      know: 'Each L(i) compares a[i] with every earlier value.',
      ask: 'How much work does the L(i) table take for n values?',
      options: [
        { text: 'About n²/2 comparisons', right: true, why: '0 + 1 + … + (n − 1) comparisons. The next lesson cuts it to n log n.' },
        { text: 'About n comparisons', why: 'Each position looks back at every earlier one, not just its neighbour.' },
        { text: '2ⁿ, one per subsequence', why: 'The table never lists subsequences; that is what it avoids.' },
      ],
    },
  ],

  'lis-fast': [
    {
      know: 'tails[k] is the smallest value that ends an increasing subsequence of length k + 1. Each new value replaces the first tail that is ≥ it, or is added at the end.',
      ask: 'a = [2, 6, 3, 4, 1, 5]. How long is the longest strictly increasing subsequence?',
      oracle: 'lis', args: [[2, 6, 3, 4, 1, 5]], answer: 4,
      misconceptions: [
        { answer: 2, feedback: '2 is the greedy run that keeps the 6 and never finds anything larger. Replacing the 6 with the 3 is what keeps the door open.' },
      ],
      explain: 'tails: [2], [2, 6], [2, 3], [2, 3, 4], [1, 3, 4], [1, 3, 4, 5]. Its length is 4: 2, 3, 4, 5.',
    },
    {
      know: 'At the end of the check above, tails is [1, 3, 4, 5].',
      ask: 'Is tails itself an increasing subsequence of a?',
      options: [
        { text: 'Yes: it is increasing and has the right length', why: 'Its values are increasing, but the 1 comes after the 3 and the 4 in a, so it is not in a’s order.' },
        { text: 'Not necessarily: only its length is guaranteed; the subsequence is rebuilt from saved predecessors', right: true, why: 'Each tail is the best end for its length so far, possibly from different subsequences. Keep a parent link for each value to recover a real one.' },
        { text: 'Yes, but in reverse order', why: 'Reversed it is decreasing. And 1 still comes after 3 and 4 in a.' },
      ],
    },
    {
      know: 'Each new value searches tails for the first entry that is ≥ it.',
      ask: 'Why may that search be a binary search?',
      options: [
        { text: 'Because a is sorted first', why: 'a is never sorted; the order of a is the whole problem.' },
        { text: 'Because tails is always strictly increasing', right: true, why: 'A longer subsequence can’t end lower than the best shorter one, since dropping its last value would give a shorter one ending lower still. So tails stays sorted.' },
        { text: 'It may not; a linear scan is required', why: 'tails is sorted, so binary search finds the place in log n steps.' },
      ],
    },
  ],

  'lis-count': [
    {
      know: 'Beside L(i), keep C(i), the number of longest subsequences ending at i: add C(j) for every j that gives the best length.',
      ask: 'a = [1, 2, 3, 1, 2, 3]. How many strictly increasing subsequences have the longest length?',
      args: [[1, 2, 3, 1, 2, 3]], answer: 4,
      misconceptions: [
        { answer: 1, feedback: '1 counts the values 1 2 3 once. Subsequences are told apart by their positions, and 1 2 3 can be picked in four ways.' },
        { answer: 2, feedback: '2 counts only the first three and the last three. Mixed picks count too: the first 1 with the second 2 and 3.' },
      ],
      explain: 'Positions (1, 2, 3), (1, 2, 6), (1, 5, 6) and (4, 5, 6), counting from 1.',
    },
    {
      know: 'a = [2, 2, 2]: the longest strictly increasing subsequences have length 1.',
      ask: 'How many longest subsequences does the method count, and why?',
      options: [
        { text: '1, since they are all the same value', why: 'The count is by positions: each of the three 2s is its own subsequence.' },
        { text: '3, one for each position', right: true, why: 'C(i) = 1 for each i, and all three have the best length 1, so the answer adds them.' },
        { text: '0, because nothing increases', why: 'A single value is an increasing subsequence of length 1.' },
      ],
    },
    {
      know: 'The count can grow much faster than the length.',
      ask: 'a = [1, 1, 2, 2, 3, 3]. How does the count behave as such pairs are added?',
      options: [
        { text: 'It doubles with each pair: 2 × 2 × 2 = 8 here', right: true, why: 'Each value of the longest subsequence can come from either copy. With 30 pairs the count passes a billion, so it may need big numbers or a modulus.' },
        { text: 'It grows by one with each pair', why: 'Each pair gives a choice of two positions, and the choices multiply.' },
        { text: 'It stays at 1, since the values are the same', why: 'Positions count, not values: 8 subsequences spell 1 2 3.' },
      ],
    },
  ],

  'weighted-lis': [
    {
      know: 'W(i) is the heaviest increasing subsequence ending at i: w_i + the largest W(j) over earlier j with a smaller key.',
      ask: 'keys = [4, 1, 2, 3], weights = [10, 2, 3, 4]. What is the largest total weight?',
      args: [[4, 1, 2, 3], [10, 2, 3, 4]], answer: 10,
      misconceptions: [
        { answer: 9, feedback: '9 is the longest subsequence, 1 2 3, weighing 2 + 3 + 4. Longest is not heaviest: the 4 alone weighs 10.' },
        { answer: 19, feedback: '19 is every weight. The 4 comes first, so nothing after it can follow it upward.' },
      ],
      explain: 'The key 4 alone weighs 10. It can’t be extended, since every later key is smaller, and 1 2 3 weighs 9.',
    },
    {
      know: 'Suppose some weights may be negative, so extending a subsequence can lower its total.',
      ask: 'How must W(i) treat earlier subsequences?',
      options: [
        { text: 'W(i) = w_i + max(0, the best W(j)): extend only when it helps', right: true, why: 'If every allowed W(j) is negative, starting fresh at i is better. With positive weights the 0 never wins, so the rule is the same as before.' },
        { text: 'Always extend the best W(j), even if it is negative', why: 'A negative chain lowers the total; starting at i alone is allowed and better.' },
        { text: 'Skip the negative weights entirely', why: 'A negative value can still be the only one at the end, as when every weight is negative; then the answer is the largest single weight.' },
      ],
    },
    {
      know: 'The best W(j) over keys smaller than k is a maximum over a prefix of the keys.',
      ask: 'How can W be filled faster than n²?',
      options: [
        { text: 'Sort by weight first', why: 'The order of positions must be kept; sorting by weight loses it.' },
        { text: 'Keep a running maximum of all W so far', why: 'Only keys smaller than the current one may be extended, so a single maximum is not enough.' },
        { text: 'A tree over the keys (Fenwick or segment) that answers “largest W with key < k” in log n', right: true, why: 'Process positions in order, query the prefix of smaller keys, then store W(i) at key i. n log n in all.' },
      ],
    },
  ],

  bitonic: [
    {
      know: 'up(i) is the longest rising subsequence ending at i, down(i) the longest falling one starting at i; a peak at i gives up(i) + down(i) − 1.',
      ask: 'a = [1, 3, 5, 4, 2, 6]. How long is the longest subsequence that rises and then falls?',
      args: [[1, 3, 5, 4, 2, 6]], answer: 5,
      misconceptions: [
        { answer: 4, feedback: '4 is the longest rising subsequence, 1 3 5 6. Letting it fall after the peak does better: 1 3 5 4 2.' },
        { answer: 6, feedback: '6 is the whole array, but after falling to 2 it rises again to 6.' },
      ],
      explain: '1 3 5 4 2, with the peak at 5: up = 3, down = 3, and 3 + 3 − 1 = 5.',
    },
    {
      know: 'up(i) and down(i) both include position i.',
      ask: 'Why subtract 1 in up(i) + down(i) − 1?',
      options: [
        { text: 'The peak is counted in both halves', right: true, why: 'up(i) ends at the peak and down(i) starts there, so adding them counts it twice.' },
        { text: 'Because positions start at 0', why: 'The lengths count values, not positions; the 1 removes the double-counted peak.' },
        { text: 'A bitonic subsequence must have a fall of at least one step', why: 'Either part may be empty here; a purely rising sequence counts.' },
      ],
    },
    {
      know: 'In this lesson either part may be empty: a subsequence that only rises counts.',
      ask: 'What is the answer for a sorted array such as [1, 2, 3, 4]?',
      options: [
        { text: '0, since nothing falls', why: 'An empty falling part is allowed, so the whole array is bitonic.' },
        { text: 'Its whole length, 4', right: true, why: 'It rises all the way with an empty fall, peaking at the last value.' },
        { text: '1, the peak alone', why: 'Everything before the peak rises to it, so all of it counts.' },
      ],
    },
  ],

  'multidimensional-chains': [
    {
      know: 'An envelope fits inside another only if it is strictly smaller in both width and height. Sort, then find the longest chain.',
      ask: 'Envelopes (1, 1), (2, 2), (2, 3), (3, 4). How long is the longest chain?',
      args: [[[1, 1], [2, 2], [2, 3], [3, 4]]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 nests (2, 2) inside (2, 3), but their widths are equal, so neither fits inside the other.' },
      ],
      explain: '(1, 1) in (2, 2) in (3, 4), or with (2, 3) in the middle. Only one of the two width-2 envelopes can be used.',
    },
    {
      know: 'After sorting by width, the chain is an increasing subsequence of heights, provided equal widths can’t both be used.',
      ask: 'How should equal widths be sorted so that a plain LIS on heights is right?',
      options: [
        { text: 'Heights increasing within equal widths', why: 'Then (2, 2), (2, 3) is an increasing pair of heights and the LIS takes both, as in the wrong answer 4.' },
        { text: 'It doesn’t matter', why: 'With increasing heights, envelopes of equal width chain wrongly.' },
        { text: 'Heights decreasing within equal widths', right: true, why: 'Then two envelopes of the same width never form an increasing pair, so the LIS uses at most one of them.' },
      ],
    },
    {
      know: 'Some problems allow an envelope to be turned, swapping its width and height.',
      ask: 'If rotation is allowed, what changes?',
      options: [
        { text: 'Write each as (shorter side, longer side) first, then solve as before', right: true, why: 'If a fits in b in some orientation, it fits with both sorted that way, so one orientation per envelope is enough.' },
        { text: 'Double the list with both orientations', why: 'Then an envelope could chain with its own rotated copy, and be used twice.' },
        { text: 'Nothing changes', why: 'A tall thin envelope may fit in a wide one only after turning.' },
      ],
    },
  ],

  'arithmetic-subsequence': [
    {
      know: 'L(i, d) is the longest arithmetic subsequence ending at i with difference d; each earlier j sets d = a[i] − a[j] and extends L(j, d).',
      ask: 'a = [1, 7, 10, 13, 14, 19]. How long is the longest arithmetic subsequence?',
      args: [[1, 7, 10, 13, 14, 19]], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 is 7 10 13, a run of neighbours. A subsequence may skip: 1 7 13 19 has difference 6.' },
      ],
      explain: '1, 7, 13, 19 with difference 6.',
    },
    {
      know: 'Each pair of positions j < i fixes a difference, and each state L(i, d) comes from such a pair.',
      ask: 'How many states can be in use?',
      options: [
        { text: 'At most about n²/2, one per pair', right: true, why: 'Most differences never occur, so store L(i, ·) as a map per position rather than a full array over every possible d.' },
        { text: 'n × (largest value − smallest value)', why: 'That is the size of a full array over every difference, mostly empty. Only differences that occur need storing.' },
        { text: 'n, one per position', why: 'Each position can end subsequences with many different differences.' },
      ],
    },
    {
      know: 'Sometimes the difference d is given in advance.',
      ask: 'With a fixed d, what is the simplest table?',
      options: [
        { text: 'The same map per position', why: 'Only one difference matters, so the per-position map has one entry.' },
        { text: 'One map from value to the best length ending at that value: best[v] = best[v − d] + 1', right: true, why: 'Scanning left to right, best[v − d] holds the longest run ending at the earlier value v − d. Linear time.' },
        { text: 'Sort a and count', why: 'Sorting loses the order of positions, which a subsequence must keep.' },
      ],
    },
  ],

  'alternating-subsequence': [
    {
      know: 'up(i) is the longest alternating subsequence ending at i with a rise, down(i) with a fall; each extends the other.',
      ask: 'a = [1, 5, 4, 3, 2, 6]. How long is the longest subsequence whose differences alternate up and down?',
      args: [[1, 5, 4, 3, 2, 6]], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 is the whole array, but 5 4 3 2 falls three times in a row.' },
        { answer: 3, feedback: '1 5 4 is alternating, but it can go on: a rise to 6 gives 1 5 4 6. Only one of the falling values 4, 3, 2 can be kept.' },
      ],
      explain: '1 5 2 6 (or 1 5 3 6, or 1 5 4 6): up, down, up.',
    },
    {
      know: 'A run of falling values contributes only one fall, and a run of rising values only one rise.',
      ask: 'Is there a simple greedy answer?',
      options: [
        { text: 'No: the table is needed', why: 'Keeping every turning point is optimal, and needs one pass.' },
        { text: 'Yes: keep the first value, every local peak and valley, and the last value', right: true, why: 'Each run between turning points can give only one step. The count is 1 + the number of runs of non-zero differences.' },
        { text: 'Yes: keep every other value', why: 'For 1 5 4 3 2 6 that gives 1 4 2, which falls twice.' },
      ],
    },
    {
      know: 'up(i) reads down(j) and down(i) reads up(j) for earlier j.',
      ask: 'How much does the linear version need to keep?',
      options: [
        { text: 'Two numbers: the best up and the best down so far', right: true, why: 'A rise sets up = down + 1, a fall sets down = up + 1, and equal neighbours change nothing.' },
        { text: 'A table of n × n', why: 'There is one index, the position, and two values per position.' },
        { text: 'All earlier values', why: 'Only the latest up and down lengths matter once the scan uses neighbours.' },
      ],
    },
  ],

  'divisible-subset': [
    {
      know: 'Sort the values; then a subset works if each value divides the next. D(i) = 1 + the largest D(j) over earlier j with a[j] dividing a[i].',
      ask: 'values = [3, 6, 12, 18, 36]. What is the largest subset in which every pair divides one way or the other?',
      args: [[3, 6, 12, 18, 36]], answer: 4,
      misconceptions: [
        { answer: 5, feedback: '5 takes all of them, but 12 and 18 don’t divide each other.' },
        { answer: 3, feedback: '3 6 12 can go on to 36: 12 divides 36.' },
      ],
      explain: '3, 6, 12, 36 or 3, 6, 18, 36.',
    },
    {
      know: 'After sorting, the method checks only that each value divides the next one in the subset.',
      ask: 'Why is checking neighbours enough?',
      options: [
        { text: 'Divisibility is transitive: if a divides b and b divides c, then a divides c', right: true, why: 'So a chain in which each divides the next has every pair dividing.' },
        { text: 'Because the values are distinct', why: 'Distinct values matter for counting, but it is transitivity that covers the pairs.' },
        { text: 'It isn’t; every pair must be checked', why: 'Transitivity makes the pair checks follow from the neighbour checks.' },
      ],
    },
    {
      know: 'The table looks back at every earlier value and extends the best that passes a test.',
      ask: 'Which earlier lesson has this same shape?',
      options: [
        { text: 'Longest increasing subsequence, with “divides” in place of “is smaller”', right: true, why: 'Same table, same answer as the largest D(i); only the test between j and i changes.' },
        { text: 'Subset sum', why: 'Subset sum indexes by sums, not by the last value taken.' },
        { text: 'Coin combinations', why: 'That counts collections adding to an amount; nothing here is added.' },
      ],
    },
  ],
}
