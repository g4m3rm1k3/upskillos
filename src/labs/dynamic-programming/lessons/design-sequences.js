// "Design it yourself" for the subsequence lessons (Structured, sequences group). Format: designs.js.
// Their numbers are checked against structured-oracles.js, which enumerates every subsequence.

export const SEQUENCE_DESIGNS = {
  lis: {
    problem: 'Find the length of the longest strictly increasing subsequence: values kept in their original order, each larger than the one before, with any values skipped.',
    tryFirst: {
      prompt: 'Values [5, 2, 8, 6, 3, 6, 9, 7]. How long is the longest strictly increasing subsequence?',
      args: [[5, 2, 8, 6, 3, 6, 9, 7]], answer: 4,
      misconceptions: [
        { answer: 3, feedback: 'Taking each larger value as you meet it gives 5, 8, 9. Starting lower, at 2, leaves more room: 2, 3, 6, 9.' },
        { answer: 5, feedback: 'Check that every value is larger than the one before, in the list’s own order.' },
      ],
      explain: '2, 3, 6, 9 (or 2, 3, 6, 7). Which value a subsequence ends on decides what can follow it, so record the best length for each possible ending.',
    },
    steps: [
      { kind: 'state', ask: 'What should L(i) mean?', options: [
        { text: 'The longest increasing subsequence within the first i values', why: 'It cannot be extended: to add value i you need to know what the subsequence ends with, and this one may end on a large value.' },
        { text: 'The longest strictly increasing subsequence that ends exactly at position i', right: true, why: 'Pinning the end says what the next value must beat: a[i].' },
      ] },
      { kind: 'split', ask: 'A longest subsequence ending at i: what is its one choice?', options: [
        { text: 'The position j just before i (with a[j] < a[i]), or none', right: true, why: 'Before i, it is a subsequence ending at j, so it should be the longest one: L(j).' },
        { text: 'Whether a[i − 1] is smaller than a[i]', why: 'A subsequence may skip values; the one before i can be anywhere earlier.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills L(i)?', options: [
        { text: 'L(i) = 1 + L(i − 1) if a[i − 1] < a[i], else 1', why: 'That counts the longest run of neighbours, not a subsequence, which may skip values.' },
        { text: 'L(i) = 1 + the largest L(j) over j < i with a[j] ≤ a[i]', why: 'Strict means equal values do not count: [2, 2] would give 2.' },
        { text: 'L(i) = 1 + the largest L(j) over j < i with a[j] < a[i], or 1 if there is none', right: true, why: 'Extend the best earlier subsequence that ends on a smaller value, or start here.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Every position starts at 1: the value alone', right: true, why: 'A single value is an increasing subsequence; no special cell is needed beyond that.' },
        { text: 'L(0) = 0', why: 'The first value alone is a subsequence of length 1.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Sorted by value', why: 'The subsequence follows the list’s order; L(i) reads earlier positions, not smaller values.' },
        { text: 'Left to right', right: true, why: 'L(i) reads only positions before i.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'L(n − 1)', why: 'The longest subsequence can end anywhere: [1, 2, 3, 0] ends with L = 1.' },
        { text: 'The largest L(i)', right: true, why: 'Every subsequence ends somewhere, and L holds the best for each ending.' },
      ] },
    ],
    apply: { cell: [0, 5] },
  },

  'lis-fast': {
    problem: 'Find the length of the longest strictly increasing subsequence in O(n log n): without scanning every earlier position for each value.',
    tryFirst: {
      prompt: 'Values [4, 2, 5, 3, 6, 1]. How long is the longest strictly increasing subsequence?',
      oracle: 'lis', args: [[4, 2, 5, 3, 6, 1]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: 'Check each candidate is increasing in the list’s order: 2, 3, 6 works, but no fourth value fits.' },
      ],
      explain: '2, 3, 6, or 2, 5, 6, or 4, 5, 6. For length 2, the best ending so far is the smallest one (3 beats 5): it leaves the most room for what comes next.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored as the values are read?', options: [
        { text: 'tails[k] = the smallest last value of any increasing subsequence of length k + 1 so far', right: true, why: 'Of all subsequences of one length, only the smallest ending matters: anything that extends a larger ending extends it too.' },
        { text: 'tails = an actual increasing subsequence', why: 'tails mixes endings of different subsequences: after [2, 5, 1] it holds [1, 5], and 1 comes after 5.' },
        { text: 'L(i) for every position, as in the O(n²) method', why: 'Correct, but finding the best earlier L means scanning all of them; that scan is what this design removes.' },
      ] },
      { kind: 'split', ask: 'A new value x arrives. What does it decide?', options: [
        { text: 'Which length it can end: one more than the longest tail below x', right: true, why: 'x extends the longest subsequence whose ending is smaller than x.' },
        { text: 'Whether it is larger than every tail', why: 'Only then does it make a longer subsequence; but otherwise it can still give a smaller ending for some length.' },
      ] },
      { kind: 'recurrence', ask: 'How is tails updated with x?', options: [
        { text: 'Append x if it beats the last tail; otherwise ignore it', why: 'Ignoring loses smaller endings: for [3, 4, 1, 2, 3], tails stay [3, 4] and the answer is 2 instead of 3.' },
        { text: 'Replace the first tail ≥ x with x; append x if there is none', right: true, why: 'x becomes the new smallest ending for that length; tails stay sorted, so a binary search finds the place.' },
        { text: 'Replace the first tail > x with x', why: 'That allows equal values, for non-decreasing subsequences. With strict increase, [2, 2] would give 2.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'tails is empty', right: true, why: 'No values read, no subsequences.' },
        { text: 'tails = [the first value], and the loop starts at the second', why: 'That works, but it is the empty start plus one step; an empty list handles an empty input too.' },
      ] },
      { kind: 'order', ask: 'How are the values processed?', options: [
        { text: 'In the list’s order, one binary search each', right: true, why: 'Each value updates tails once, at a place found in O(log n).' },
        { text: 'Sorted first', why: 'A subsequence keeps the list’s order; sorted, every list is increasing.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The last tail', why: 'That is a value, the smallest ending of the longest length, not a length.' },
        { text: 'The length of tails', right: true, why: 'tails has one entry per length that some subsequence reached.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [4, 2, 5, 3, 7, 1]. How long is tails at the end?',
      oracle: 'lis', args: [[4, 2, 5, 3, 7, 1]], answer: 3,
      misconceptions: [{ answer: 4, feedback: 'The 1 at the end replaces the first tail; it does not append.' }],
      explain: 'tails: [4], [2], [2, 5], [2, 3], [2, 3, 7], [1, 3, 7]. Length 3; and [1, 3, 7] is not itself a subsequence.',
    },
  },

  'lis-count': {
    problem: 'Count how many longest strictly increasing subsequences there are, counting different sets of positions as different (even if the values are equal).',
    tryFirst: {
      prompt: 'Values [1, 3, 2, 4]. How many longest increasing subsequences are there?',
      args: [[1, 3, 2, 4]], answer: 2,
      misconceptions: [
        { answer: 1, feedback: 'The longest length is 3, and two subsequences have it: 1, 3, 4 and 1, 2, 4.' },
        { answer: 3, feedback: 'Count only those of the longest length, 3.' },
      ],
      explain: '1, 3, 4 and 1, 2, 4. The 4 can follow the 3 or the 2, both ending a length-2 subsequence, so the counts add.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each position?', options: [
        { text: 'N(i) = the number of increasing subsequences ending at i', why: 'Without the length you cannot tell which predecessors give the longest.' },
        { text: 'Two values: L(i), the longest length ending at i, and N(i), how many have that length', right: true, why: 'The length decides which predecessors count; the count adds them up.' },
        { text: 'tails, with a count for each', why: 'tails mixes different subsequences, so its entries cannot carry exact counts.' },
      ] },
      { kind: 'split', ask: 'Which earlier positions j contribute to N(i)?', options: [
        { text: 'Those with a[j] < a[i] and L(j) equal to the best such length', right: true, why: 'Only predecessors that give the longest length make a longest subsequence ending at i.' },
        { text: 'Every j with a[j] < a[i]', why: 'That also counts shorter subsequences.' },
      ] },
      { kind: 'recurrence', ask: 'How are L(i) and N(i) filled?', options: [
        { text: 'L(i) = 1 + best L(j); N(i) = the sum of N(j) over the j that reach it, or 1 if none', right: true, why: 'A longer predecessor replaces the count; a tie adds to it.' },
        { text: 'L(i) = 1 + best L(j); N(i) = the number of j that reach it', why: 'Each such j may itself end several longest subsequences; add N(j), not 1.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Each position alone: L = 1, N = 1', right: true, why: 'The value alone is one subsequence of length 1.' },
        { text: 'N = 0 everywhere, increased as predecessors are found', why: 'A value with no smaller value before it still ends one subsequence, itself.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Left to right', right: true, why: 'Each position reads only earlier ones.' },
        { text: 'By value', why: 'Subsequences follow the list’s order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N at the position with the largest L', why: 'Several positions can end a longest subsequence: in [1, 3, 2] both 3 and 2 do.' },
        { text: 'The sum of N(i) over every i whose L(i) is the largest', right: true, why: 'Every longest subsequence ends at one of those positions, counted once there.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [1, 2, 2]. How many longest increasing subsequences, by position?',
      args: [[1, 2, 2]], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'As strings both are “1 2”, but they use different positions, and positions are what is counted.' }],
      explain: 'Both 2s have L = 2 and N = 1. The answer adds them: 2.',
    },
  },

  'weighted-lis': {
    problem: 'Each value has a weight. Find the largest total weight of a nonempty strictly increasing subsequence.',
    tryFirst: {
      prompt: 'Keys [1, 5, 2, 3] with weights [2, 10, 3, 3]. What is the largest total weight of an increasing subsequence of keys?',
      args: [[1, 5, 2, 3], [2, 10, 3, 3]], answer: 12,
      misconceptions: [
        { answer: 8, feedback: 'That is the longest subsequence, 1, 2, 3. Here weight matters, not length: 1, 5 is shorter but heavier.' },
      ],
      explain: 'Keys 1 then 5: 2 + 10 = 12. The longest is not the heaviest.',
    },
    steps: [
      { kind: 'state', ask: 'What should W(i) mean?', options: [
        { text: 'The longest increasing subsequence ending at i', why: 'Length is not the goal: the heaviest can be short.' },
        { text: 'The largest total weight of an increasing subsequence ending at i', right: true, why: 'As in LIS, the ending decides what can follow; the stored number is weight.' },
      ] },
      { kind: 'split', ask: 'What is the choice for the subsequence ending at i?', options: [
        { text: 'The position j just before it (a[j] < a[i]), or none', right: true, why: 'Before i it is the heaviest subsequence ending at j.' },
        { text: 'Whether i’s weight is positive', why: 'Value i is in the subsequence by definition; the choice is what comes before it.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills W(i)?', options: [
        { text: 'w_i + the largest W(j) over j with a[j] < a[i]', why: 'A predecessor with a negative total should be dropped: starting fresh at i is better.' },
        { text: 'w_i + max(0, the largest W(j) over j with a[j] < a[i])', right: true, why: 'Extend the heaviest earlier subsequence that helps, or start at i.' },
        { text: '1 + the largest W(j)', why: 'That adds a length of 1, not the weight.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Each position alone is worth its own weight', right: true, why: 'The value alone is a subsequence, even when its weight is negative.' },
        { text: 'Each position starts at 0', why: 'An empty subsequence is not allowed, so the value itself is the least it can be.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Left to right', right: true, why: 'W(i) reads only earlier positions.' },
        { text: 'Heaviest first', why: 'Weights do not decide what is ready; positions do.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n − 1)', why: 'The heaviest can end anywhere.' },
        { text: 'The largest W(i)', right: true, why: 'Every subsequence ends somewhere.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: keys [1, 2, 3], weights [4, −10, 5]. What is the largest total?',
      args: [[1, 2, 3], [4, -10, 5]], answer: 9,
      misconceptions: [{ answer: -1, feedback: 'That takes all three. The −10 can be skipped: 1 then 3.' }],
      explain: 'W = 4, 4 − 10 = −6, then 5 + max(0, 4, −6) = 9.',
    },
  },

  bitonic: {
    problem: 'Find the longest subsequence that strictly rises and then strictly falls (either part may be empty).',
    tryFirst: {
      prompt: 'Values [1, 11, 2, 10, 4, 5, 2, 1]. How long is the longest rise-then-fall subsequence?',
      args: [[1, 11, 2, 10, 4, 5, 2, 1]], answer: 6,
      misconceptions: [
        { answer: 4, feedback: 'That is the longest rise alone. A fall can follow the peak.' },
      ],
      explain: '1, 2, 10, 4, 2, 1. Every such subsequence has a peak; on each side of it, it is an ordinary increasing or decreasing subsequence.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored?', options: [
        { text: 'One LIS table', why: 'It only sees the rise; the fall after the peak needs its own summary.' },
        { text: 'Two tables: up(i), the longest rise ending at i, and down(i), the longest fall starting at i', right: true, why: 'A peak at i joins the best rise into it with the best fall out of it.' },
      ] },
      { kind: 'split', ask: 'What one choice describes a rise-then-fall subsequence?', options: [
        { text: 'Its peak', right: true, why: 'Before the peak it rises, after it it falls, and the two sides are independent.' },
        { text: 'Its first value', why: 'The first value says nothing about where it turns.' },
      ] },
      { kind: 'recurrence', ask: 'How are the two tables combined?', options: [
        { text: 'up(i) + down(i)', why: 'The peak is in both, so it is counted twice.' },
        { text: 'up(i) + down(i) − 1, for each possible peak i', right: true, why: 'The rise into i and the fall out of i share only the peak.' },
      ] },
      { kind: 'base', ask: 'What starts each table?', options: [
        { text: 'Every position starts at 1: the value alone', right: true, why: 'A single value is a rise and a fall of length 1.' },
        { text: 'up(0) = 1 and down(0) = 1, the rest from the rule', why: 'down is filled from the right, so its starting point is the last position, not the first.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill them?', options: [
        { text: 'up from left to right; down from right to left', right: true, why: 'up(i) reads earlier positions, down(i) reads later ones.' },
        { text: 'Both from left to right', why: 'down(i) reads positions after i, which would not be filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest up(i) + down(i) − 1 over all i', right: true, why: 'Every such subsequence has some peak.' },
        { text: 'The largest up(i) plus the largest down(j)', why: 'Those may be at different positions, in the wrong order.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [5, 1, 4, 2, 3, 1]. How long is the longest rise-then-fall subsequence?',
      args: [[5, 1, 4, 2, 3, 1]], answer: 4,
      misconceptions: [{ answer: 5, feedback: 'Check it rises strictly and then falls strictly, in the list’s order.' }],
      explain: 'Peak at 4: up = 2 (1, 4) and down = 3 (4, 2, 1), so 2 + 3 − 1 = 4.',
    },
  },

  'multidimensional-chains': {
    problem: 'Envelopes have a width and a height. One fits in another only if it is strictly smaller in both. Find the longest chain of envelopes, each inside the next.',
    tryFirst: {
      prompt: 'Envelopes (width, height): (5, 4), (6, 4), (6, 7), (2, 3). How long is the longest chain?',
      args: [[[5, 4], [6, 4], [6, 7], [2, 3]]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '(5, 4) does not fit in (6, 4): their heights are equal, and it must be strictly smaller in both.' },
      ],
      explain: '(2, 3) in (5, 4) in (6, 7). The envelopes can be used in any order, so sort them first; then it is an increasing subsequence in two dimensions.',
    },
    steps: [
      { kind: 'state', ask: 'What should L(i) mean?', options: [
        { text: 'The longest chain within the first i envelopes, in the order given', why: 'The order given is arbitrary. A chain may use the envelopes in any order, so sort first.' },
        { text: 'After sorting, the longest chain whose outermost envelope is i', right: true, why: 'As in LIS: pinning the last element says what the next one must beat.' },
      ] },
      { kind: 'split', ask: 'What is the choice for the chain ending at i?', options: [
        { text: 'The envelope just inside i', right: true, why: 'It must be strictly smaller in both dimensions, and the chain up to it is the best one ending there.' },
        { text: 'Which dimension to compare', why: 'Both dimensions must be strictly smaller; there is no choice.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills L(i)?', options: [
        { text: '1 + the largest L(j) with w_j < w_i and h_j < h_i, or 1', right: true, why: 'Extend the best chain that fits inside i.' },
        { text: '1 + the largest L(j) with w_j < w_i', why: 'Height must fit too: (2, 9) would chain into (3, 4).' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Every envelope alone is a chain of 1', right: true, why: 'One envelope on its own is a chain of length 1; longer chains extend it.' },
        { text: 'L = 0 for the smallest envelope', why: 'The smallest envelope alone is still a chain of length 1.' },
      ] },
      { kind: 'order', ask: 'How do you sort, and why?', options: [
        { text: 'By width only, then a plain LIS on heights', why: 'Two envelopes with equal width would chain by height, (6, 4) into (6, 7). That shortcut needs heights decreasing within equal widths.' },
        { text: 'By width (then height), then fill left to right, comparing both dimensions strictly', right: true, why: 'Sorting puts every possible inner envelope first; comparing both strictly handles equal widths.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest L(i)', right: true, why: 'Every chain has an outermost envelope.' },
        { text: 'L of the largest envelope', why: 'The largest envelope may not fit around anything; the best chain can end elsewhere.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on (1, 1), (1, 2), (2, 3), (3, 4). How long is the longest chain?',
      args: [[[1, 1], [1, 2], [2, 3], [3, 4]]], answer: 3,
      misconceptions: [{ answer: 4, feedback: '(1, 1) does not fit in (1, 2): their widths are equal.' }],
      explain: '(1, 1) or (1, 2), then (2, 3), then (3, 4): 3.',
    },
  },

  'arithmetic-subsequence': {
    problem: 'Find the longest subsequence whose neighbours all differ by the same amount (an arithmetic subsequence).',
    tryFirst: {
      prompt: 'Values [9, 4, 7, 2, 10]. How long is the longest arithmetic subsequence?',
      args: [[9, 4, 7, 2, 10]], answer: 3,
      misconceptions: [
        { answer: 2, feedback: 'Any two values make one. Look for three with the same step: 4, 7, 10.' },
      ],
      explain: '4, 7, 10, step 3. A value can continue a subsequence only if it keeps the same step, so the step has to be remembered.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'A(i) = the longest arithmetic subsequence ending at i', why: 'The next value must continue the same difference, so the difference has to be in the state.' },
        { text: 'A(i, d) = the longest arithmetic subsequence ending at i with difference d', right: true, why: 'Ending and step together say exactly which values can come next.' },
      ] },
      { kind: 'split', ask: 'For a subsequence ending at i, what fixes d?', options: [
        { text: 'The position j just before i: d = a[i] − a[j]', right: true, why: 'The last pair sets the step; the rest is the best subsequence ending at j with that same step.' },
        { text: 'The first two values', why: 'They set it too, but the table grows from the right end, so ask about the last pair.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills A(i, d) for d = a[i] − a[j]?', options: [
        { text: 'A(j, d) + 1, where A(j, d) counts as 1 if j starts nothing with step d', right: true, why: 'Continue j’s subsequence with the same step, or start the pair j, i.' },
        { text: 'The longest A(j, anything) + 1', why: 'This ignores the step, mixing different differences.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A single value has length 1; a pair has length 2 for its own d', right: true, why: 'Every pair is arithmetic, whatever its difference.' },
        { text: 'A(i, 0) = 1 for every i, and nothing else', why: 'Every difference, not only 0, starts at a pair.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'i left to right; for each i, every j before it', right: true, why: 'A(i, d) reads A(j, d) for j < i.' },
        { text: 'By difference, smallest first', why: 'Positions decide what is ready, not the size of d.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest A(i, d) over every i and d (1 for a single value, 0 for none)', right: true, why: 'The best subsequence ends somewhere with some step.' },
        { text: 'The largest A(n − 1, d)', why: 'The best can end before the last value.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [1, 3, 5, 8, 7]. How long is the longest arithmetic subsequence?',
      args: [[1, 3, 5, 8, 7]], answer: 4,
      misconceptions: [{ answer: 3, feedback: '1, 3, 5 has step 2; does a later value continue it?' }],
      explain: '1, 3, 5, 7: A(7, 2) = A(5, 2) + 1 = 4.',
    },
  },

  'alternating-subsequence': {
    problem: 'Find the longest wiggle subsequence: its differences strictly alternate between positive and negative (equal neighbours are not allowed).',
    tryFirst: {
      prompt: 'Values [1, 17, 5, 10, 13, 15, 10, 5, 16, 8]. How long is the longest wiggle subsequence?',
      args: [[1, 17, 5, 10, 13, 15, 10, 5, 16, 8]], answer: 7,
      misconceptions: [
        { answer: 10, feedback: '10, 13, 15 rises twice in a row; a wiggle must switch direction every step.' },
      ],
      explain: 'One is 1, 17, 10, 13, 10, 16, 8. What can come next depends on whether the last step went up or down.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored?', options: [
        { text: 'W(i) = the longest wiggle ending at i', why: 'The next step must go the other way, so the last direction has to be known.' },
        { text: 'up(i) and down(i): the longest wiggle ending at i whose last step rose, or fell', right: true, why: 'The last direction is exactly what decides the next step.' },
      ] },
      { kind: 'split', ask: 'A wiggle ending at i with a rise: what came before?', options: [
        { text: 'A wiggle ending at some j with a[j] < a[i], whose last step fell (or j alone)', right: true, why: 'A rise into i must follow a fall into j.' },
        { text: 'A wiggle ending at j with a rise', why: 'Two rises in a row are not a wiggle.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills up(i)?', options: [
        { text: '1 + the largest down(j) over j < i with a[j] < a[i]', right: true, why: 'Rise from a smaller value whose wiggle ended falling. down(i) is the mirror image.' },
        { text: '1 + the largest up(j) over j < i with a[j] < a[i]', why: 'That allows two rises in a row.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'up(i) = down(i) = 1: the value alone', right: true, why: 'A single value can be followed by a step either way.' },
        { text: 'up(i) = 1 and down(i) = 0', why: 'A single value can start a wiggle in either direction.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Left to right', right: true, why: 'Both values at i read earlier positions only.' },
        { text: 'All up values, then all down values', why: 'up(i) reads down(j), which would not be filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest up(i) or down(i), over all i', right: true, why: 'The best wiggle ends somewhere, with some last direction.' },
        { text: 'up(n − 1) + down(n − 1)', why: 'Those are two different wiggles ending at the same place.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [1, 2, 3, 4]. How long is the longest wiggle?',
      args: [[1, 2, 3, 4]], answer: 2,
      misconceptions: [{ answer: 4, feedback: 'It only rises; after one rise it would need a fall.' }],
      explain: 'Any two values rise once; no fall ever follows. 2.',
    },
  },

  'divisible-subset': {
    problem: 'Given distinct positive numbers, find the largest subset in which, for every pair, one divides the other.',
    tryFirst: {
      prompt: 'Numbers [3, 4, 16, 8]. How large is the largest subset where every pair divides?',
      args: [[3, 4, 16, 8]], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '3 does not divide 4, 8 or 16, nor do they divide 3.' },
      ],
      explain: '4, 8, 16. Sorted, such a subset is a chain where each number divides the next; and then every pair divides, because dividing is transitive.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i) mean?', options: [
        { text: 'After sorting, the largest chain ending at value i, each dividing the next', right: true, why: 'Sorted, a valid subset is a chain; pinning its largest value says what can extend it.' },
        { text: 'The largest valid subset among the first i values, unsorted', why: 'Divisibility goes from small to large, so unsorted, the next value’s possible divisors may come later.' },
      ] },
      { kind: 'split', ask: 'A chain ending at value i: what is its choice?', options: [
        { text: 'The value just below it in the chain, which must divide a[i]', right: true, why: 'If it divides a[i], everything below it does too, so the whole set stays valid.' },
        { text: 'Whether a[i] is even', why: 'Divisibility by the previous value is what matters, not parity.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i)?', options: [
        { text: '1 + the largest D(j) over j < i with a[i] % a[j] = 0, or 1', right: true, why: 'Extend the best chain whose top divides a[i].' },
        { text: '1 + the largest D(j) over j < i with a[j] % a[i] = 0', why: 'Backwards: a smaller number cannot be a multiple of a larger one.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Each value alone is a chain of 1', right: true, why: 'One number is a valid subset.' },
        { text: 'D = 0 for every value not divisible by another', why: 'Alone, it is still a chain of length 1.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Sort increasing, then left to right', right: true, why: 'Every possible divisor of a[i] is smaller, so it comes first.' },
        { text: 'In the order given', why: 'A divisor may come later in the list and not be ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D of the largest value', why: 'The largest value may divide nothing useful; the best chain can end anywhere.' },
        { text: 'The largest D(i)', right: true, why: 'Every chain has a top value.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [1, 2, 4, 9, 8]. How large is the largest subset?',
      args: [[1, 2, 4, 9, 8]], answer: 4,
      misconceptions: [{ answer: 5, feedback: '9 is not divisible by 2, 4 or 8.' }],
      explain: '1, 2, 4, 8. 9 joins only 1.',
    },
  },
}
