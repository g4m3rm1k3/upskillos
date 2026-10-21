// "Design it yourself" for the digit and automaton lessons (Advanced, digits-automata group). Format:
// designs.js. Lessons with a live table ask for one of its cells; digit-sum and digit-mask (too many
// states to draw) and ranking (its answer is a string) ask a second hand-solved case. Every number was
// printed by advanced-oracles.js before it was typed; ranking's questions count strings (oracle kmp-dp).

const digitState = (extra, why) => ({ kind: 'state', ask: 'What should a state remember about the prefix written so far?', options: [
  { text: `Its position, whether it still equals n’s prefix (tight)${extra}`, right: true, why },
  { text: 'The whole prefix', why: 'Many prefixes share a future; keeping each one separately is just listing the numbers.' },
] })
const digitSplit = { kind: 'split', ask: 'What is the choice at each position?', options: [
  { text: 'The next digit: up to n’s digit while tight, 0–9 once below n', right: true, why: 'A digit below n’s makes the number smaller than n for good, so the rest is free.' },
  { text: 'The next digit, always 0–9', why: 'Then numbers above n would be counted.' },
] }
const digitOrder = { kind: 'order', ask: 'In what order are the states filled?', options: [
  { text: 'From the last position back to the first (or by memoized recursion)', right: true, why: 'Each state reads the next position’s states.' },
  { text: 'From the first position forward, counting completions', why: 'Completions are known only once the later positions are done.' },
] }

export const DIGIT_DESIGNS = {
  'digit-tight': {
    problem: 'Count the integers from 0 to n that have no digit 4, for n up to 10¹⁵.',
    tryFirst: {
      prompt: 'n = 25. How many integers from 0 to 25 have no digit 4?',
      args: [25], answer: 23,
      misconceptions: [
        { answer: 26, feedback: '26 counts everything from 0 to 25. 4, 14 and 24 have a 4.' },
        { answer: 22, feedback: '22 leaves out 0, which has no digit 4.' },
      ],
      explain: '26 numbers from 0 to 25, minus 4, 14 and 24.',
    },
    steps: [
      digitState('', 'Prefixes that agree with n so far are limited in what can follow; all others are free. That is all the future depends on.'),
      digitSplit,
      { kind: 'recurrence', ask: 'How does tight change?', options: [
        { text: 'The next prefix is tight only if this one was and the digit equals n’s', right: true, why: 'Once a digit is smaller, the number stays below n.' },
        { text: 'The next prefix is tight whenever the digit equals n’s digit', why: 'A prefix already below n can’t become equal to n’s again.' },
      ] },
      { kind: 'base', ask: 'What is a full-length prefix worth?', options: [
        { text: '1: it is one number', right: true, why: 'Every digit chosen, and none was a 4.' },
        { text: '0', why: 'Then nothing would ever be counted.' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The tight state at position 0', right: true, why: 'The empty prefix equals n’s empty prefix.' },
        { text: 'The free state at position 0', why: 'Free at the start would allow numbers above n.' },
      ] },
    ],
    apply: { cell: [0, 1], misconceptions: [
      { answer: 45, feedback: '45 adds a path that stays tight, but n’s digit here is 4, which is forbidden: only the 4 smaller digits, each leading to F(2) = 9.' },
      { answer: 81, feedback: '81 is F(1), free. Tight, the digit is limited to 0–3 (4 is forbidden).' },
    ] },
  },

  'digit-leading': {
    problem: 'Count the integers from 1 to n with no digit 0, where n can be huge. Shorter numbers are padded with leading zeros, which are not digits.',
    tryFirst: {
      prompt: 'n = 30. How many integers from 1 to 30 have no digit 0?',
      args: [30], answer: 27,
      misconceptions: [
        { answer: 30, feedback: '10, 20 and 30 contain a 0.' },
        { answer: 18, feedback: '18 also throws out the one-digit numbers, as if their padding 0 counted.' },
      ],
      explain: '30 numbers minus 10, 20 and 30.',
    },
    steps: [
      digitState(', and whether the number has started', 'A 0 before the first non-zero digit is padding; after it, a real digit.'),
      digitSplit,
      { kind: 'recurrence', ask: 'When is a 0 forbidden?', options: [
        { text: 'Only once the number has started', right: true, why: 'Padding zeros aren’t digits of the number.' },
        { text: 'Always', why: 'Then shorter numbers, which need padding, would all be lost.' },
      ] },
      { kind: 'base', ask: 'What is a full-length prefix worth?', options: [
        { text: '1 if the number started, 0 if it is all padding', right: true, why: 'All padding is the number 0, outside 1 … n.' },
        { text: '1 always', why: 'That counts 0, which is outside the range.' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The state tight and not started, at position 0', right: true, why: 'Nothing written yet: equal to n’s empty prefix, nothing started.' },
        { text: 'The state tight and started, at position 0', why: 'Nothing has been written yet, so nothing has started.' },
      ] },
    ],
    apply: { cell: [0, 0], misconceptions: [
      { answer: 819, feedback: '819 counts only the numbers that start with padding (fewer than 4 digits). Starting with a 1 adds FS(1) = 729.' },
      { answer: 729, feedback: 'The 0 at the front is padding here, so the numbers with fewer digits count too: + FN(1) = 819.' },
    ] },
  },

  'digit-range': {
    problem: 'Count the integers in [lo, hi] that contain the digit 7, for bounds up to 10¹⁵.',
    tryFirst: {
      prompt: 'lo = 10, hi = 30. How many contain a 7?',
      args: [10, 30], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 includes 7, which is below 10.' },
      ],
      explain: '17 and 27; 7 itself is below the range.',
    },
    steps: [
      { kind: 'state', ask: 'How is a range handled?', options: [
        { text: 'Count up to hi and subtract the count below lo: F(hi) − F(lo − 1)', right: true, why: 'One digit DP for an upper bound, used twice.' },
        { text: 'Run the digit DP up to hi and ignore lo', why: 'Then every qualifying number below lo would be counted too.' },
      ] },
      digitSplit,
      { kind: 'recurrence', ask: 'What extra state does “contains a 7” need?', options: [
        { text: 'A flag: has a 7 appeared yet?', right: true, why: 'Once it has, every completion counts.' },
        { text: 'The count of 7s so far', why: 'Only whether one appeared matters; counting them adds states for nothing.' },
      ] },
      { kind: 'base', ask: 'What is F(−1)?', options: [
        { text: '0: nothing lies below 0', right: true, why: 'So lo = 0 works with the same formula.' },
        { text: '1', why: 'There is no number in [0, −1].' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'F(hi) − F(lo − 1)', right: true, why: 'lo itself stays in the range.' },
        { text: 'F(hi) − F(lo)', why: 'That removes lo too, though lo is in the range.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 1186, feedback: '1186 is F(4567) alone. The numbers below 123 must be subtracted: − F(122) = 21.' },
      { answer: 1207, feedback: 'Subtract F(122), don’t add it.' },
    ] },
  },

  'digit-sum': {
    problem: 'Count the integers from 1 to n whose digit sum is exactly s and that are divisible by m.',
    tryFirst: {
      prompt: 'n = 50, s = 4, m = 2. How many qualify?',
      args: [50, 4, 2], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 counts every digit sum of 4 (4, 13, 22, 31, 40); only the even ones are divisible by 2.' },
      ],
      explain: '4, 22 and 40: digit sum 4 and even.',
    },
    steps: [
      digitState(', the digit sum so far and the remainder modulo m', 'Both conditions are checked at the end, so both must be carried.'),
      digitSplit,
      { kind: 'recurrence', ask: 'How does the remainder change when digit d is appended?', options: [
        { text: 'r becomes (10r + d) mod m', right: true, why: 'The value becomes 10 · value + d.' },
        { text: 'r becomes (r + d) mod m', why: 'That is the digit sum modulo m, not the number.' },
      ] },
      { kind: 'base', ask: 'What is a full-length prefix worth?', options: [
        { text: '1 if the sum is s and the remainder 0, else 0', right: true, why: 'Both conditions hold: sum s and remainder 0.' },
        { text: '1 if the sum is s', why: 'Divisibility must hold too.' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Is anything removed from the final count?', options: [
        { text: 'The number 0, when s = 0, since the range starts at 1', right: true, why: '0 has digit sum 0 and remainder 0.' },
        { text: 'Nothing', why: 'When s = 0, the all-zero number 0 would be counted.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. n = 100, s = 9, m = 9. How many qualify?',
      args: [100, 9, 9], answer: 10,
      misconceptions: [
        { answer: 11, feedback: '99 is divisible by 9 but its digit sum is 18.' },
      ],
      explain: '9, 18, 27, 36, 45, 54, 63, 72, 81 and 90.',
    },
  },

  'digit-mask': {
    problem: 'Count the integers from 1 to n whose digits are all different.',
    tryFirst: {
      prompt: 'n = 30. How many integers from 1 to 30 have all different digits?',
      args: [30], answer: 28,
      misconceptions: [
        { answer: 30, feedback: '11 and 22 repeat a digit.' },
      ],
      explain: '30 numbers minus 11 and 22.',
    },
    steps: [
      digitState(', whether it has started, and which digits are used (a 10-bit mask)', 'A digit may be used only if unused; the mask records that.'),
      digitSplit,
      { kind: 'recurrence', ask: 'When may digit d be written?', options: [
        { text: 'If its bit is clear; then set it', right: true, why: 'Each digit may be used at most once.' },
        { text: 'If it differs from the previous digit', why: '121 repeats a digit that isn’t next to itself.' },
      ] },
      { kind: 'base', ask: 'What do padding zeros do to the mask?', options: [
        { text: 'Nothing: they aren’t digits', right: true, why: 'Otherwise a real 0 later would look like a repeat.' },
        { text: 'They set bit 0', why: 'Then 10, written 010, would be rejected.' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Why does no number past 10 digits count?', options: [
        { text: 'There are only 10 different digits', right: true, why: 'An 11-digit number must repeat one.' },
        { text: 'Because the mask has 10 bits', why: 'The mask has 10 bits because there are 10 digits; the digits are the reason.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. n = 200. How many qualify?',
      args: [200], answer: 162,
      misconceptions: [
        { answer: 200, feedback: '200 counts every number; 11, 100, 101, … repeat a digit.' },
      ],
      explain: '9 one-digit, 81 two-digit (9 × 9) and 72 three-digit from 100 to 199 (1 × 9 × 8): 162.',
    },
  },

  'digit-adjacency': {
    problem: 'Count the integers from 1 to n in which neighbouring digits differ by at least 2.',
    tryFirst: {
      prompt: 'n = 30. How many integers from 1 to 30 qualify?',
      args: [30], answer: 24,
      misconceptions: [
        { answer: 30, feedback: '10, 11, 12, 21, 22 and 23 have neighbours that differ by less than 2.' },
      ],
      explain: 'All 9 one-digit numbers, and 15 of the 21 from 10 to 30.',
    },
    steps: [
      digitState(', and the last real digit (or a sentinel before the start)', 'The next digit is checked against the last one.'),
      digitSplit,
      { kind: 'recurrence', ask: 'When may digit d follow?', options: [
        { text: 'If |d − last| ≥ 2, or if nothing has started yet', right: true, why: 'The first real digit has no neighbour before it.' },
        { text: 'If d > last', why: 'The rule is about the gap, in either direction.' },
      ] },
      { kind: 'base', ask: 'What does a padding zero do to last?', options: [
        { text: 'Nothing: the sentinel stays', right: true, why: 'Padding isn’t a digit, so nothing changes.' },
        { text: 'last becomes 0', why: 'Then a number like 07 would be checked against a 0 that isn’t there.' },
      ] },
      digitOrder,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Tight, with the sentinel, at position 0', right: true, why: 'Nothing has been written yet at position 0.' },
        { text: 'The sum over every last digit at position 0', why: 'At the start nothing has been written: only the sentinel state.' },
      ] },
    ],
    apply: { cell: [6, 3], misconceptions: [
      { answer: 8, feedback: '8 allows every digit up to 7. After a 5, the digits 4, 5 and 6 are too close.' },
      { answer: 4, feedback: 'The digit 7 is allowed too (|7 − 5| = 2), and it keeps the prefix tight.' },
    ] },
  },

  'digit-aggregate': {
    problem: 'Add up all the integers from 0 to n whose digits are all odd (the sum modulo a prime).',
    tryFirst: {
      prompt: 'n = 15. What is the sum of the numbers from 0 to 15 with only odd digits?',
      args: [15], answer: 64,
      misconceptions: [
        { answer: 120, feedback: '120 adds every number from 1 to 15.' },
        { answer: 25, feedback: '25 is the one-digit ones; 11, 13 and 15 count too.' },
      ],
      explain: '1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 = 64.',
    },
    steps: [
      { kind: 'state', ask: 'What should each state carry?', options: [
        { text: 'How many valid prefixes reach it, and the sum of their values', right: true, why: 'A count alone can’t give a sum; the pair can.' },
        { text: 'The sum of their values only', why: 'Appending a digit adds d to each prefix, so how many there are is needed too.' },
      ] },
      digitSplit,
      { kind: 'recurrence', ask: 'Appending digit d to every prefix in a state: what happens to the total?', options: [
        { text: '10 · total + d · count', right: true, why: 'Each value x becomes 10x + d.' },
        { text: '10 · total + d', why: 'd is added to every prefix, count times.' },
      ] },
      { kind: 'base', ask: 'What starts the pass?', options: [
        { text: 'One empty prefix: count 1, total 0', right: true, why: 'Every number grows from it.' },
        { text: 'count 0, total 0', why: 'Then nothing ever gets counted.' },
      ] },
      { kind: 'order', ask: 'Which direction does this pass go?', options: [
        { text: 'Forward, from the first digit to the last, merging states as they meet', right: true, why: 'Prefix values grow as digits are appended.' },
        { text: 'Backward from the last digit, with the same update 10 · total + d · count', why: 'Backward, a new digit lands in a higher place, not the units; this update is only right when appending at the end.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The totals of the states that started, after the last digit', right: true, why: 'Unstarted is the number 0, which isn’t all-odd.' },
        { text: 'The count of the final states', why: 'That counts the numbers instead of adding them.' },
      ] },
    ],
    apply: { cell: [7, 2], misconceptions: [
      { answer: 850, feedback: '850 adds each new digit once per state. Every prefix in the state gets it: d · count.' },
      { answer: 25, feedback: '25 is the count of free, started prefixes, not their total.' },
    ] },
  },

  'kmp-dp': {
    problem: 'Count the strings of a given length over an alphabet that do not contain a pattern.',
    tryFirst: {
      prompt: 'Alphabet {a, b}, pattern “bb”, length 3. How many strings avoid it?',
      args: ['ab', 'bb', 3], answer: 5,
      misconceptions: [
        { answer: 8, feedback: '8 is every string; abb, bba and bbb contain bb.' },
        { answer: 3, feedback: 'aaa, aab, aba, baa and bab: five.' },
      ],
      explain: 'aaa, aab, aba, baa, bab.',
    },
    steps: [
      { kind: 'state', ask: 'What should the state remember about the string so far?', options: [
        { text: 'The longest prefix of the pattern that the string ends with', right: true, why: 'That alone decides whether the next letters can complete the pattern.' },
        { text: 'The last letter only', why: 'A pattern longer than two letters needs more than the last letter.' },
      ] },
      { kind: 'split', ask: 'What is the choice at each step?', options: [
        { text: 'The next letter, which moves the automaton to one next state', right: true, why: 'Each (state, letter) has exactly one next state.' },
        { text: 'Where the next occurrence of the pattern starts', why: 'The strings being counted contain no occurrence.' },
      ] },
      { kind: 'recurrence', ask: 'How is the next state found on a mismatch?', options: [
        { text: 'Fall back along the prefix function until the letter extends the match', right: true, why: 'A shorter match may still be alive.' },
        { text: 'Go back to 0', why: 'Then bbba would never be seen to contain bba.' },
      ] },
      { kind: 'base', ask: 'What starts the count?', options: [
        { text: 'The empty string, in state 0', right: true, why: 'Nothing of the pattern is matched yet.' },
        { text: 'Every state with count 1', why: 'Only the empty string exists at length 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the counts filled?', options: [
        { text: 'By length, one letter at a time', right: true, why: 'Length ℓ reads length ℓ − 1.' },
        { text: 'By state number', why: 'States can lead to smaller states, so their order isn’t a dependency order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum over every state except the full match, at the final length', right: true, why: 'A string may end with any partial match.' },
        { text: 'The count in state 0', why: 'Strings ending in a partial match count too.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 7, feedback: '7 is only W(0,5) + b. A b after a full “ab” also falls back to 0: + W(2,5).' },
      { answer: 19, feedback: 'Only b leads to state 0 here: from state 0 and from state 2.' },
    ] },
  },

  'aho-dp': {
    problem: 'Count the strings of a given length that contain none of several patterns.',
    tryFirst: {
      prompt: 'Alphabet {a, b, c}, forbidden “a” and “bc”, length 2. How many strings avoid both?',
      args: ['abc', ['a', 'bc'], 2], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 forgets that bc is forbidden.' },
        { answer: 9, feedback: '9 is every string of length 2.' },
      ],
      explain: 'bb, cb and cc: no a, and no bc.',
    },
    steps: [
      { kind: 'state', ask: 'What should the state remember?', options: [
        { text: 'The node of the Aho–Corasick automaton: the longest suffix that starts some pattern', right: true, why: 'It tracks every pattern at once.' },
        { text: 'The last letter only', why: 'A pattern longer than one letter needs more than the last letter to be recognised.' },
      ] },
      { kind: 'split', ask: 'What happens when the next letter has no trie edge?', options: [
        { text: 'Follow the failure link to the longest suffix still in the trie, and try there', right: true, why: 'Precomputed, every node has a move for every letter.' },
        { text: 'Go back to the root', why: 'That forgets a partial match still alive.' },
      ] },
      { kind: 'recurrence', ask: 'Which nodes are forbidden?', options: [
        { text: 'Those where a pattern ends, and those whose failure node is forbidden', right: true, why: 'A suffix that is a pattern means the pattern just appeared.' },
        { text: 'Only those where a pattern ends in the trie', why: 'A pattern can end as a suffix of a longer path.' },
      ] },
      { kind: 'base', ask: 'What starts the count?', options: [
        { text: 'The empty string at the root', right: true, why: 'Nothing has been read yet, so the root.' },
        { text: 'Every node with count 1', why: 'Only the empty string exists at length 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the counts filled?', options: [
        { text: 'By length', right: true, why: 'Each length reads the one before.' },
        { text: 'By node depth', why: 'Failure links point to shallower nodes, but counts move by length.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum over the allowed nodes at the final length', right: true, why: 'A string may end anywhere allowed.' },
        { text: 'The count at the root', why: 'Strings ending partway into a pattern count too.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 32, feedback: '32 is every string of length 5. Only the alternating ones avoid both aa and bb.' },
      { answer: 4, feedback: 'abab… and baba…: one starting with each letter.' },
    ] },
  },

  'automaton-product': {
    problem: 'Count the digit strings of a given length that contain a pattern and are divisible by m.',
    tryFirst: {
      prompt: 'Pattern “1”, m = 2, length 2 (leading zeros allowed). How many qualify?',
      args: ['1', 2, 2], answer: 5,
      misconceptions: [
        { answer: 19, feedback: '19 counts every string containing a 1; it must also be even.' },
      ],
      explain: '10, 12, 14, 16 and 18.',
    },
    steps: [
      { kind: 'state', ask: 'What should the state be?', options: [
        { text: 'A pair: the pattern automaton’s state and the value modulo m', right: true, why: 'Both conditions evolve digit by digit; the product tracks them together.' },
        { text: 'Two separate tables, one per condition, multiplied at the end', why: 'The two conditions aren’t independent: the same digits drive both.' },
      ] },
      { kind: 'split', ask: 'What does one digit do?', options: [
        { text: 'Advances both parts: the automaton steps, and r becomes (10r + d) mod m', right: true, why: 'Each component updates its own way.' },
        { text: 'Advances only the part that is still unsatisfied', why: 'Both parts must keep updating to know the final state.' },
      ] },
      { kind: 'recurrence', ask: 'What happens after the pattern has been found?', options: [
        { text: 'Stay in “found”, whatever digits follow', right: true, why: 'The string already contains the pattern.' },
        { text: 'Keep stepping the automaton', why: 'It would fall back and forget the pattern was found.' },
      ] },
      { kind: 'base', ask: 'What starts the count?', options: [
        { text: 'The empty string: nothing matched, remainder 0', right: true, why: 'Its value is 0, so the remainder is 0.' },
        { text: 'Every remainder with count 1', why: 'Only the empty string exists at length 0.' },
      ] },
      { kind: 'order', ask: 'How many states are there?', options: [
        { text: '(pattern length + 1) × m', right: true, why: 'The product of the two components’ sizes.' },
        { text: 'pattern length + m', why: 'Each state is a pair, so the sizes multiply.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'State “found” with remainder 0, at the final length', right: true, why: 'Both conditions are met there.' },
        { text: 'The sum of “found” over every remainder', why: 'Only remainder 0 is divisible by m.' },
      ] },
    ],
    apply: { cell: [6, 3], misconceptions: [
      { answer: 20, feedback: '20 counts every length-3 string containing 12; only those divisible by 3 count.' },
      { answer: 6, feedback: '6 is remainder 1. Remainder 0 is the divisible ones.' },
    ] },
  },

  'ranking': {
    problem: 'Among the strings of a given length that avoid a pattern, in dictionary order, find the k-th.',
    tryFirst: {
      prompt: 'First, count: alphabet {a, b}, avoid “aa”, length 3. How many valid strings are there?',
      oracle: 'kmp-dp', args: ['ab', 'aa', 3], answer: 5,
      misconceptions: [
        { answer: 8, feedback: '8 is every string; aaa, aab and baa contain aa.' },
      ],
      explain: 'aba, abb, bab, bba, bbb.',
    },
    steps: [
      { kind: 'state', ask: 'What must be known before choosing letters?', options: [
        { text: 'For every automaton state and remaining length, how many valid completions there are', right: true, why: 'Those counts tell how many strings each choice of letter covers.' },
        { text: 'The full sorted list of valid strings', why: 'It can have 2⁵⁰ entries; the counts avoid listing it.' },
      ] },
      { kind: 'split', ask: 'How is the next letter chosen?', options: [
        { text: 'Try letters in sorted order; skip a letter whose completions are fewer than k, subtracting them from k', right: true, why: 'All strings with a smaller letter here come first.' },
        { text: 'Take the letter with the most completions', why: 'Order, not size, decides the k-th string.' },
      ] },
      { kind: 'recurrence', ask: 'How are the completion counts filled?', options: [
        { text: 'N(r, q) = the sum over letters c of N(r − 1, step(q, c)), skipping the full match', right: true, why: 'The same automaton counting as kmp-dp.' },
        { text: 'N(r, q) = |alphabet|ʳ', why: 'That ignores the forbidden pattern.' },
      ] },
      { kind: 'base', ask: 'What is N(0, q)?', options: [
        { text: '1 for every allowed state', right: true, why: 'With nothing left to add, the string is finished: one way.' },
        { text: '0', why: 'Then every count would be 0.' },
      ] },
      { kind: 'order', ask: 'Why sort the alphabet first?', options: [
        { text: 'Dictionary order tries letters smallest first, whatever order they are given in', right: true, why: 'Given “ba”, a must still come first.' },
        { text: 'It isn’t needed', why: 'Without sorting, letters given as “ba” would be ranked b first.' },
      ] },
      { kind: 'answer', ask: 'What if k is larger than the number of valid strings?', options: [
        { text: 'There is no k-th string: return the empty string', right: true, why: 'Check k against N(length, 0) first.' },
        { text: 'Return the last string', why: 'The k-th doesn’t exist; the question says to return empty.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: alphabet {a, b}, avoid “bb”, length 4. How many valid strings are there to rank?',
      oracle: 'kmp-dp', args: ['ab', 'bb', 4], answer: 8,
      misconceptions: [
        { answer: 16, feedback: '16 is every string of length 4.' },
        { answer: 5, feedback: '5 is the count for length 3. Each extra letter adds the Fibonacci step: 5 + 3.' },
      ],
      explain: 'Strings with no two b’s together: 8 (a Fibonacci number).',
    },
  },
}
