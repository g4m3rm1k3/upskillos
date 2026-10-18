// "Design it yourself" for the strings and alignment lessons (Structured, strings group). Format: designs.js.
// Their numbers are checked against structured-oracles.js (subsequence enumeration, string search, regex).

const pairs = 'D(i, j) for the first i letters of a and the first j letters of b'

export const STRING_DESIGNS = {
  lcs: {
    problem: 'Find the length of the longest common subsequence of two strings: letters that appear in both, in the same order, with any letters skipped.',
    tryFirst: {
      prompt: 'How long is the longest common subsequence of “abcbdab” and “bdcaba”?',
      args: ['abcbdab', 'bdcaba'], answer: 4,
      misconceptions: [
        { answer: 3, feedback: 'There is a longer one. Try “bcba”: b, c, b, a appear in that order in both.' },
        { answer: 6, feedback: 'Both strings contain those letters, but not all in the same order.' },
      ],
      explain: '“bcba” (or “bdab”, “bcab”). Matching letters greedily from the left can lock you out of a better match later, so every pair of prefixes has to be compared.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the LCS of a’s first i letters with all of b', why: 'How much of b has been used matters too: a later match must come after the last one in b as well.' },
        { text: `${pairs}: their LCS length`, right: true, why: 'Two prefixes, one index for each string.' },
        { text: 'The number of letters the two strings share', why: 'That ignores order: “ab” and “ba” share two letters, but their LCS is 1.' },
      ] },
      { kind: 'split', ask: 'What decides D(i, j)?', options: [
        { text: 'The last letters a_i and b_j: equal, or not', right: true, why: 'Equal: they can be matched to each other. Not equal: at least one of them is not in the LCS.' },
        { text: 'The first letters', why: 'The table grows from the ends of the prefixes, so ask about the last letters.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i, j)?', options: [
        { text: 'Equal: 1 + D(i − 1, j − 1). Different: max(D(i − 1, j), D(i, j − 1))', right: true, why: 'Match the pair, or drop one of the two letters and keep the better result.' },
        { text: 'Equal: 1 + max(D(i − 1, j), D(i, j − 1))', why: 'Those cells may already have used one of these two letters, so the same letter would count twice.' },
        { text: 'Different: D(i − 1, j − 1)', why: 'That drops both letters, but one of them may still match an earlier letter of the other string.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(i, 0) = D(0, j) = 0', right: true, why: 'An empty prefix has nothing in common with anything.' },
        { text: 'D(1, 1) = 1', why: 'Only if the first letters are equal; the rule decides that from D(0, 0) = 0.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row, left to right', right: true, why: 'Each cell reads the cell above, the cell to its left, and the one diagonally up-left.' },
        { text: 'Matching cells first, then the rest', why: 'A matching cell reads the diagonal, which may not be a match itself; the order is by position.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n − 1, m − 1)', why: 'That leaves out the last letter of each string, which may be part of the LCS.' },
        { text: 'D(n, m)', right: true, why: 'D(i, j) is the LCS of two prefixes, and the question is about both whole strings.' },
      ] },
    ],
    apply: { cell: [3, 4] },
  },

  'lcs-reconstruct': {
    problem: 'Find how many different strings are longest common subsequences of two strings (the same string reached in two ways counts once).',
    tryFirst: {
      prompt: 'How many different strings are longest common subsequences of “abc” and “acb”?',
      args: ['abc', 'acb'], answer: 2,
      misconceptions: [
        { answer: 1, feedback: 'The length is 2, and two strings have it: “ab” and “ac”.' },
      ],
      explain: '“ab” and “ac”. At the end the last letters differ and both ways back keep length 2, so both directions have to be followed.',
    },
    steps: [
      { kind: 'state', ask: 'What do you need?', options: [
        { text: 'The LCS length table, then a walk back from (n, m) that collects strings in a set', right: true, why: 'The lengths say which ways back keep the best length; a set merges equal strings.' },
        { text: 'A count of the paths back through the table', why: 'Different paths can spell the same string, so this counts paths, not strings.' },
      ] },
      { kind: 'split', ask: 'Walking back from (i, j), where can you go?', options: [
        { text: 'Equal letters: the letter is in; go diagonally. Different: to each neighbour that has the same length', right: true, why: 'Only moves that keep the LCS length lead to longest subsequences.' },
        { text: 'Always diagonally', why: 'When the letters differ, the LCS does not use both of them.' },
      ] },
      { kind: 'recurrence', ask: 'On a tie (both neighbours keep the length), what happens?', options: [
        { text: 'Pick one neighbour', why: 'That finds one witness, not all the strings.' },
        { text: 'Follow both, and take the union of their strings', right: true, why: 'Each side may lead to strings the other does not.' },
      ] },
      { kind: 'base', ask: 'What ends the walk?', options: [
        { text: 'Reaching row 0 or column 0: the empty string', right: true, why: 'Nothing more can be matched.' },
        { text: 'Reaching (0, 0) only', why: 'Once either prefix is empty, no more letters can match.' },
      ] },
      { kind: 'order', ask: 'In what order is the work done?', options: [
        { text: 'Fill the lengths table first, then walk back', right: true, why: 'The walk needs every length to decide where to go.' },
        { text: 'Walk while filling', why: 'Whether a move keeps the best length is only known once the table is done.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The size of the set collected at (n, m)', right: true, why: 'Different strings, each counted once.' },
        { text: 'D(n, m)', why: 'That is the length, not how many strings have it.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on “ab” and “ba”. How many different longest common subsequences?',
      args: ['ab', 'ba'], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'The length is 1, and both “a” and “b” have it.' }],
      explain: 'The last letters differ, and both neighbours have length 1: one side gives “a”, the other “b”.',
    },
  },

  'common-substring': {
    problem: 'Find the length of the longest common substring of two strings: letters in a row, with nothing skipped.',
    tryFirst: {
      prompt: 'How long is the longest common substring of “abcde” and “abfde”?',
      args: ['abcde', 'abfde'], answer: 2,
      misconceptions: [
        { answer: 4, feedback: '“abde” is a common subsequence, but not a substring: “c” and “f” break it.' },
      ],
      explain: '“ab” or “de”. A substring has to be contiguous, so a mismatch ends the run.',
    },
    steps: [
      { kind: 'state', ask: 'What should S(i, j) mean?', options: [
        { text: 'The LCS of the two prefixes', why: 'A subsequence may skip letters; a substring may not.' },
        { text: 'The longest common substring ending exactly at a_i and b_j', right: true, why: 'Pinning both ends makes contiguity checkable: it extends only through a match.' },
      ] },
      { kind: 'split', ask: 'What decides S(i, j)?', options: [
        { text: 'Whether a_i = b_j: if so, it extends the run that ends at i − 1, j − 1', right: true, why: 'A common substring ending here is a shorter one ending just before, plus this letter.' },
        { text: 'Whether the strings share a_i somewhere', why: 'It must be shared at this exact place, after the same run.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills S(i, j)?', options: [
        { text: 'Equal: 1 + S(i − 1, j − 1). Different: 0', right: true, why: 'A mismatch ends every common substring here.' },
        { text: 'Different: max(S(i − 1, j), S(i, j − 1))', why: 'That is the LCS rule: it carries a run across a mismatch, breaking contiguity.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Row 0 and column 0 are 0', right: true, why: 'Nothing ends at an empty prefix.' },
        { text: 'Row 0 and column 0 are 1', why: 'An empty prefix contains no letters to share.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads only its diagonal neighbour.' },
        { text: 'Column by column from the right', why: 'The diagonal neighbour is to the left, not yet filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'S(n, m)', why: 'The best common substring can end anywhere, not only at both strings’ ends.' },
        { text: 'The largest S anywhere', right: true, why: 'Every common substring ends at some pair of positions.' },
      ] },
    ],
    apply: { cell: [5, 5], misconceptions: [
      { answer: 1, feedback: 'That counts only the e. The d just before it matches too: S(4,4) = 1, so the run is “de”.' },
      { answer: 3, feedback: 'The run stops at c ≠ f: S(3,3) = 0. “cde” is not in “abfde”.' },
    ] },
  },

  'edit-distance': {
    problem: 'Find the fewest single-letter edits (insert, delete, or substitute) that turn one string into another.',
    tryFirst: {
      prompt: 'How many edits turn “abc” into “yabd”?',
      args: ['abc', 'yabd'], answer: 2,
      misconceptions: [
        { answer: 4, feedback: 'Substituting letter by letter ignores that “ab” can stay where it is: insert y, then change c to d.' },
        { answer: 3, feedback: 'Two are enough: insert “y” at the front, substitute c with d.' },
      ],
      explain: 'Insert y, substitute c → d. The last letters tell you the last edit: here, change c into d after turning “ab” into “yab”.',
    },
    steps: [
      { kind: 'state', ask: 'What should E(i, j) mean?', options: [
        { text: 'The fewest edits turning the first i letters of a into the first j of b', right: true, why: 'Two prefixes, the same question on shorter strings.' },
        { text: 'The number of positions where a and b differ', why: 'That works only for equal lengths and no shifts; “abc” to “yabd” would be 4.' },
      ] },
      { kind: 'split', ask: 'What could the last edit be?', options: [
        { text: 'Delete a_i, insert b_j, or substitute a_i with b_j (free if they are equal)', right: true, why: 'Every edit script ends one of these three ways at the ends of the prefixes.' },
        { text: 'Only substitute', why: '“ab” to “b” needs a delete.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills E(i, j)?', options: [
        { text: 'min(E(i − 1, j) + 1, E(i, j − 1) + 1, E(i − 1, j − 1) + (a_i ≠ b_j))', right: true, why: 'Delete, insert, or substitute/match, whichever is cheapest.' },
        { text: 'Equal: E(i − 1, j − 1). Different: E(i − 1, j − 1) + 1', why: 'Substitution only: it never inserts or deletes.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'E(i, 0) = i and E(0, j) = j', right: true, why: 'Delete everything, or insert everything.' },
        { text: 'Row 0 and column 0 are 0', why: 'Turning “abc” into the empty string takes 3 deletions, not 0.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above, left and diagonal.' },
        { text: 'Diagonal cells first', why: 'Off-diagonal cells are read by later diagonal ones; the order is by position.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(n, m)', right: true, why: 'The whole of a into the whole of b.' },
        { text: 'The smallest value in the last row', why: 'That turns all of a into a prefix of b, not all of b.' },
      ] },
    ],
    apply: { cell: [2, 2] },
  },

  'weighted-edit': {
    problem: 'Turn one string into another where an insert, a delete and a substitution each have their own cost. Find the cheapest total.',
    tryFirst: {
      prompt: 'Insert costs 1, delete costs 1, substitute costs 5. What is the cheapest way to turn “ab” into “ba”?',
      args: ['ab', 'ba', 1, 1, 5], answer: 2,
      misconceptions: [
        { answer: 10, feedback: 'Two substitutions cost 10. Deleting the a and inserting it again at the end costs 2.' },
      ],
      explain: 'Delete a, then insert a after b: 1 + 1. With costs, the cheapest script can look nothing like the shortest one.',
    },
    steps: [
      { kind: 'state', ask: 'What should E(i, j) mean?', options: [
        { text: 'The cheapest cost of turning the first i letters of a into the first j of b', right: true, why: 'The same table as edit distance, holding cost instead of a count.' },
        { text: 'The fewest edits, multiplied by the average cost', why: 'Different edits cost different amounts; the cheapest script may use more edits.' },
      ] },
      { kind: 'split', ask: 'What could the last edit be?', options: [
        { text: 'Delete a_i, insert b_j, or substitute (free if equal)', right: true, why: 'The same three, each with its own price.' },
        { text: 'The cheapest kind of edit', why: 'Which edit is possible depends on the letters, not only on price.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills E(i, j)?', options: [
        { text: 'min(E(i − 1, j) + insert, E(i, j − 1) + delete, …)', why: 'Backwards: removing a_i from a is the delete; adding b_j is the insert. With unequal costs this changes the answer.' },
        { text: 'min(E(i − 1, j) + delete, E(i, j − 1) + insert, E(i − 1, j − 1) + (substitute or 0))', right: true, why: 'Each move pays for the edit it stands for.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'E(i, 0) = i · delete and E(0, j) = j · insert', right: true, why: 'Delete everything, or insert everything, at their own prices.' },
        { text: 'E(i, 0) = i and E(0, j) = j', why: 'That is the unit-cost start; with prices, multiply.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above, left and diagonal.' },
        { text: 'Cheapest edits first', why: 'Positions decide what is ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(n, m)', right: true, why: 'E(i, j) is the cheapest cost for two prefixes; the question is the whole strings.' },
        { text: 'E(n, m) divided by the number of edits', why: 'The question is total cost.' },
      ] },
    ],
    apply: { cell: [1, 1], misconceptions: [
      { answer: 3, feedback: 'Substituting costs 3. Deleting the a and inserting the b costs 1 + 1.' },
    ] },
  },

  damerau: {
    problem: 'Edit distance, plus one more edit: swap two neighbouring letters, also at cost 1.',
    tryFirst: {
      prompt: 'With swaps allowed, how many edits turn “abcd” into “badc”?',
      args: ['abcd', 'badc'], answer: 2,
      misconceptions: [
        { answer: 4, feedback: 'Without swaps it is 4 substitutions. Two swaps do it: ab → ba, cd → dc.' },
      ],
      explain: 'Two swaps. A swap uses up two letters of each string at once, so the table has to look two letters back.',
    },
    steps: [
      { kind: 'state', ask: 'What should E(i, j) mean?', options: [
        { text: 'The fewest edits turning the first i letters of a into the first j of b', right: true, why: 'The edit-distance table; only the moves change.' },
        { text: 'E(i, j) plus a flag for “the last edit was a swap”', why: 'The restricted version needs no flag: a swap reads two letters back directly.' },
      ] },
      { kind: 'split', ask: 'What could the last edit be?', options: [
        { text: 'Delete, insert, substitute/match, or swap the last two letters', right: true, why: 'The fourth case applies when a’s last two letters are b’s last two, reversed.' },
        { text: 'Delete, insert, or substitute', why: 'That is plain edit distance; “ab” to “ba” would cost 2.' },
      ] },
      { kind: 'recurrence', ask: 'What does the swap add?', options: [
        { text: 'E(i − 2, j − 2) + 1, when a_{i−1} a_i = b_j b_{j−1}', right: true, why: 'A swap turns two letters into two letters, so both prefixes lose two.' },
        { text: 'E(i − 1, j − 1) + 1, when a_i = b_{j−1}', why: 'A swap moves two letters; it has to use up two from each string.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'E(i, 0) = i, E(0, j) = j, as in edit distance', right: true, why: 'Swaps need two letters on each side, so the edges are unchanged.' },
        { text: 'E(1, 1) = 1 always', why: 'If the first letters match it is 0.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row; a cell may read two rows back', right: true, why: 'All of those rows are already done.' },
        { text: 'Every other row', why: 'Each row reads the row just above too.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer, and what is it?', options: [
        { text: 'E(n, m), the restricted version: a swapped pair is never edited again', right: true, why: 'That rule is what keeps the state to two prefixes.' },
        { text: 'E(n, m), always the true distance with unrestricted swaps', why: '“ca” → “abc” costs 3 here but 2 with unrestricted edits (swap to “ac”, insert b); the full version needs more state.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: 2, feedback: 'That is two substitutions, or a delete and an insert. “ab” and “ba” are the same two letters reversed: one swap, E(0,0) + 1.' },
    ] },
  },

  'shortest-supersequence': {
    problem: 'Find the length of the shortest string that contains both given strings as subsequences.',
    tryFirst: {
      prompt: 'How short can a string be that contains both “abac” and “cab” as subsequences?',
      args: ['abac', 'cab'], answer: 5,
      misconceptions: [
        { answer: 7, feedback: 'Writing one after the other works, but letters can be shared: “cabac” contains both.' },
      ],
      explain: '“cabac”. Every shared letter in a common subsequence saves one letter, so the length is 4 + 3 − the LCS.',
    },
    steps: [
      { kind: 'state', ask: 'What should S(i, j) mean?', options: [
        { text: 'The shortest supersequence of the first i letters of a and the first j of b', right: true, why: 'Two prefixes again: how much of each string is covered decides what is still to write.' },
        { text: 'S(i) = the shortest supersequence of a’s first i letters with all of b', why: 'How much of b is covered matters as much as how much of a.' },
      ] },
      { kind: 'split', ask: 'What is the last letter of a shortest supersequence?', options: [
        { text: 'If a_i = b_j, that letter serves both; otherwise it is a_i or b_j', right: true, why: 'It must end with the last letter of at least one string.' },
        { text: 'Always a_i', why: 'It may end with b_j instead.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills S(i, j)?', options: [
        { text: 'Equal: 1 + S(i − 1, j − 1). Different: 1 + min(S(i − 1, j), S(i, j − 1))', right: true, why: 'Share the letter, or write one of the two and keep the other for later.' },
        { text: 'Different: 2 + S(i − 1, j − 1)', why: 'Writing both now stops one of them matching an earlier letter: “ab”, “ba” would give 4 instead of 3.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'S(i, 0) = i and S(0, j) = j', right: true, why: 'With one string empty, the other is its own shortest supersequence.' },
        { text: 'Row 0 and column 0 are 0', why: 'The other string’s letters still have to be written.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above, left and diagonal.' },
        { text: 'From the bottom-right corner', why: 'The cells it reads are above and to the left.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'S(n, m), which also equals n + m − LCS', right: true, why: 'Both whole strings; every shared letter saves one.' },
        { text: 'n + m', why: 'That is writing them one after the other, sharing nothing.' },
      ] },
    ],
    apply: { cell: [3, 2], misconceptions: [
      { answer: 5, feedback: 'That writes the shared last a twice. Equal last letters can be one letter serving both strings: 1 + S(2,1).' },
    ] },
  },

  'distinct-subsequences': {
    problem: 'Count the ways to pick letters of a source string, in order, that spell a target (different positions count as different ways).',
    tryFirst: {
      prompt: 'In how many ways can “rabbbit” spell “rabbit” by deleting letters?',
      args: ['rabbbit', 'rabbit'], answer: 3,
      misconceptions: [
        { answer: 1, feedback: 'Which b is left out? Any one of the three.' },
      ],
      explain: 'Leave out any one of the three b’s. Each letter of the source is either used for the next target letter, or skipped.',
    },
    steps: [
      { kind: 'state', ask: 'What should N(i, j) mean?', options: [
        { text: 'The number of ways the first i letters of the source spell the first j of the target', right: true, why: 'Two prefixes; the answer is both whole strings.' },
        { text: 'Whether the source contains the target as a subsequence', why: 'Yes or no; the question counts the ways.' },
      ] },
      { kind: 'split', ask: 'What is the choice for source letter s_i?', options: [
        { text: 'Use it as target letter t_j (only if they are equal), or skip it', right: true, why: 'Every way either uses s_i as the last target letter or does not use it at all.' },
        { text: 'Use it whenever it matches', why: 'Even a matching letter may be skipped; an earlier copy could be used instead.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills N(i, j)?', options: [
        { text: 'Equal: N(i − 1, j − 1). Different: N(i − 1, j)', why: 'When equal it must also count skipping s_i, so add N(i − 1, j).' },
        { text: 'N(i − 1, j), plus N(i − 1, j − 1) when s_i = t_j', right: true, why: 'Skip s_i, plus use it for t_j.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'N(i, 0) = 1; N(0, j) = 0 for j > 0', right: true, why: 'The empty target is spelled one way, by using nothing. An empty source spells nothing else.' },
        { text: 'N(i, 0) = 0', why: 'Then every count is 0: every way ends by spelling the empty prefix.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Source letter by source letter (rows)', right: true, why: 'Row i reads only row i − 1.' },
        { text: 'Target letter by target letter, all source letters at once', why: 'N(i, j) reads N(i − 1, j), the same target column one row up, which must be done first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N(length of source, length of target)', right: true, why: 'The whole source, the whole target.' },
        { text: 'The sum of the last column', why: 'That counts ways for every source prefix, so each way is counted several times.' },
      ] },
    ],
    apply: { cell: [5, 4], misconceptions: [
      { answer: 1, feedback: 'That only skips the third b. It equals target letter 4, so also count the ways that use it: N(4,3) = 2.' },
      { answer: 2, feedback: 'That only counts the ways that use the third b. Skipping it still leaves N(4,4) = 1 way.' },
    ] },
  },

  'unique-subsequences': {
    problem: 'Count the different strings among all subsequences of a string, the empty string included.',
    tryFirst: {
      prompt: 'How many different strings are subsequences of “aba” (counting the empty string)?',
      args: ['aba'], answer: 7,
      misconceptions: [
        { answer: 8, feedback: '8 counts sets of positions; “a” appears twice (first letter or last), but it is one string.' },
      ],
      explain: '“”, a, b, ab, aa, ba, aba. Adding a letter doubles the list, minus the strings it creates a second time.',
    },
    steps: [
      { kind: 'state', ask: 'What should U(i) mean?', options: [
        { text: 'The number of different subsequence strings of the first i letters, empty included', right: true, why: 'The same question on a prefix.' },
        { text: 'The number of subsequences (by position) of the first i letters', why: 'That is 2ⁱ, counting the same string many times.' },
      ] },
      { kind: 'split', ask: 'Adding letter s_i: what happens to the old strings?', options: [
        { text: 'Each one appears with and without s_i; but some of the new ones already existed', right: true, why: 'Doubling counts strings ending in s_i twice if s_i appeared before.' },
        { text: 'Each one appears with and without s_i, all new', why: 'With repeated letters some strings are made twice.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills U(i)?', options: [
        { text: 'U(i) = 2 · U(i − 1) − 1', why: 'The duplicates are every string made by the letter’s previous copy, which can be many.' },
        { text: 'U(i) = 2 · U(i − 1) − U(p − 1), where p is the previous position of the same letter (subtract 0 if none)', right: true, why: 'Strings ending in s_i made before p’s copy are made again; there are U(p − 1) of them.' },
        { text: 'U(i) = 2 · U(i − 1)', why: 'That counts positions, not different strings.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'U(0) = 1: the empty string', right: true, why: 'The empty prefix has one subsequence.' },
        { text: 'U(0) = 0', why: 'Then doubling never gets started.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Left to right, remembering each letter’s last position', right: true, why: 'U(i) reads U(i − 1) and the value just before that letter’s last copy.' },
        { text: 'Letter by letter of the alphabet', why: 'Positions decide the order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'U(n) (minus 1 if the empty string is not wanted)', right: true, why: 'All letters, every different string.' },
        { text: 'The sum of every U(i)', why: 'That counts strings of every prefix again and again.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 8, feedback: 'Doubling counts strings that end in a twice: those made with the first a are made again with the second. Subtract U(0) = 1, the empty string plus a.' },
    ] },
  },

  interleaving: {
    problem: 'Decide whether a third string can be formed by merging two others, keeping the letter order of each.',
    tryFirst: {
      prompt: 'Can “aadbbbaccc” be formed by interleaving “aabcc” and “dbbca”?',
      kind: 'yesno', args: ['aabcc', 'dbbca', 'aadbbbaccc'], answer: false,
      misconceptions: [{ answer: true, feedback: 'The letters are all there, but try to finish: by “aadbb” the order of the rest cannot be met.' }],
      explain: 'No. Taking a letter from whichever string matches can go wrong when both match; only trying both choices settles it.',
    },
    steps: [
      { kind: 'state', ask: 'What should I(i, j) mean?', options: [
        { text: 'The first i letters of a and the first j of b can form the first i + j letters of c', right: true, why: 'How far each source has got decides what can come next.' },
        { text: 'I(k) = the first k letters of c can be formed', why: 'Different ways to form them use up different amounts of a and b.' },
      ] },
      { kind: 'split', ask: 'Letter i + j of c: where did it come from?', options: [
        { text: 'From a_i or from b_j', right: true, why: 'Each letter of c is the next letter of one source.' },
        { text: 'From whichever source matches first', why: 'When both match, either may be right; you have to try both.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills I(i, j)?', options: [
        { text: '(a_i = c_{i+j} and I(i − 1, j)) or (b_j = c_{i+j} and I(i, j − 1))', right: true, why: 'Either source could have supplied the last letter.' },
        { text: 'Take from a when it matches, otherwise from b', why: 'That is greedy; it fails when both match and the wrong one is taken.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'I(0, 0) = true; along the edges, compare one source with c alone', right: true, why: 'With one source used up, the other must spell c’s prefix by itself.' },
        { text: 'I(0, j) = true for every j', why: 'Only if b’s first j letters are c’s first j.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above and left.' },
        { text: 'From the bottom-right corner back', why: 'Each cell reads the cells above and to its left, which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'I(n, m), and false if the lengths do not add up', right: true, why: 'Both sources used up, all of c formed.' },
        { text: 'Any true cell in the last row', why: 'Only the corner uses all of both sources.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: false, feedback: 'c’s letter 4 is “a”, the next letter of a. With one a and “ax” used, I(1,2) = T, so a’s second a can supply it.' },
    ] },
  },

  wildcard: {
    problem: 'Decide whether a pattern matches a whole string, where ? matches any one letter and * matches any run of letters, possibly none.',
    tryFirst: {
      prompt: 'Does the pattern “a*c?b” match “acdcb”?',
      kind: 'yesno', args: ['acdcb', 'a*c?b'], answer: false,
      misconceptions: [{ answer: true, feedback: 'The pattern ends “c?b”, so the string’s last three letters must be c, any letter, b. They are “dcb”, and d is not c.' }],
      explain: 'No. The * can absorb any letters, but the last three, “dcb”, must match “c?b”. A * can take any number of letters, so a method has to consider every choice.',
    },
    steps: [
      { kind: 'state', ask: 'What should M(i, j) mean?', options: [
        { text: 'The first i letters of the string match the first j symbols of the pattern', right: true, why: 'Two prefixes again: how much of the string and how much of the pattern are used up.' },
        { text: 'M(j) = the first j symbols match some prefix of the string', why: 'Which prefix matters: the rest of the pattern has to match the rest of the string.' },
      ] },
      { kind: 'split', ask: 'What does the last pattern symbol do?', options: [
        { text: 'A letter or ? matches one letter; a * matches nothing, or one more letter', right: true, why: 'Matching nothing or one more letter covers any run, one letter at a time.' },
        { text: 'A * matches the rest of the string', why: 'A * in the middle must leave room for what follows.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills M(i, j) for a *?', options: [
        { text: 'M(i, j − 1) or M(i − 1, j)', right: true, why: 'The * matches nothing, or it takes s_i and may take more.' },
        { text: 'M(i − 1, j − 1)', why: 'That is exactly one letter, like ?.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'M(0, 0) = true; M(0, j) only while the pattern so far is all *; M(i, 0) = false for i > 0', right: true, why: 'Only *s can match the empty string; an empty pattern matches only nothing.' },
        { text: 'M(0, j) = true for every j', why: 'A letter or ? needs a letter to match.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above, left and diagonal.' },
        { text: 'Pattern symbols right to left', why: 'The cells read are to the left.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'M(n, m)', right: true, why: 'The whole string against the whole pattern.' },
        { text: 'Any true cell in the last column', why: 'The whole string must be matched, not a prefix.' },
      ] },
    ],
    apply: { cell: [2, 3], misconceptions: [
      { answer: false, feedback: 'The last * can take the d: M(1,3) = T, since “*a*” matches “a” with that * empty.' },
    ] },
  },

  regex: {
    problem: 'Decide whether a pattern matches a whole string, where . matches any one letter and x* matches zero or more copies of x.',
    tryFirst: {
      prompt: 'Does the pattern “c*a*b” match “aab”?',
      kind: 'yesno', args: ['aab', 'c*a*b'], answer: true,
      misconceptions: [{ answer: false, feedback: 'c* can match zero c’s.' }],
      explain: 'Yes: c* matches nothing, a* matches “aa”, b matches b. A starred letter is one unit with its star.',
    },
    steps: [
      { kind: 'state', ask: 'What should M(i, j) mean?', options: [
        { text: 'The first i letters match the first j pattern symbols', right: true, why: 'Two prefixes: how much of the string and of the pattern are matched so far.' },
        { text: 'The first i letters match the pattern with every * removed', why: 'Then x* could not match zero copies.' },
      ] },
      { kind: 'split', ask: 'If the pattern ends in x*, what can it do?', options: [
        { text: 'Match zero copies, or one more copy of x', right: true, why: 'Zero: drop x* entirely. One more: s_i must match x, and x* may still take more.' },
        { text: 'Match exactly one copy', why: 'A star means zero or more.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills M(i, j) when the pattern ends in x*?', options: [
        { text: 'M(i, j − 2) or (s_i matches x and M(i − 1, j))', right: true, why: 'Skip the pair x*, or use it for s_i and keep it.' },
        { text: 'M(i, j − 1) or M(i − 1, j)', why: 'A * is not a symbol by itself: x and * go together, so skipping drops two symbols.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'M(0, 0) = true; M(0, j) = M(0, j − 2) when symbol j is *', right: true, why: 'Starred letters can match nothing, so a pattern of them matches the empty string.' },
        { text: 'M(0, j) = false for j > 0', why: '“a*” matches the empty string.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads up, left, diagonal, or two columns left.' },
        { text: 'Pattern from right to left', why: 'The cells read are to the left.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'M(n, m)', right: true, why: 'The whole string, the whole pattern.' },
        { text: 'M(n, m − 1)', why: 'That leaves the last symbol unused.' },
      ] },
    ],
    apply: { cell: [2, 4], misconceptions: [
      { answer: false, feedback: 'Zero more a’s fails, but “a*” can take this a as well: M(1,4) = T.' },
    ] },
  },

  'palindrome-subsequence': {
    problem: 'Find the length of the longest subsequence of a string that reads the same forwards and backwards.',
    tryFirst: {
      prompt: 'How long is the longest palindromic subsequence of “bbbab”?',
      args: ['bbbab'], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '“bab” and “bbb” are substrings. Skipping the a gives “bbbb”.' },
      ],
      explain: '“bbbb”. A palindrome is decided by its two ends, so the state is a piece of the string from i to j.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'P(i) for the first i letters', why: 'A palindrome is checked from both ends, so the state needs both ends of the piece.' },
        { text: 'P(i, j) = the longest palindromic subsequence within s[i..j]', right: true, why: 'An interval: both ends are known.' },
      ] },
      { kind: 'split', ask: 'What decides P(i, j)?', options: [
        { text: 'Whether the end letters s_i and s_j are equal', right: true, why: 'Equal: both can be the outer pair. Different: at least one end is not used.' },
        { text: 'The middle letter', why: 'The ends decide; the middle is a smaller interval.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills P(i, j)?', options: [
        { text: 'Equal: 2 + P(i + 1, j − 1). Different: max(P(i + 1, j), P(i, j − 1))', right: true, why: 'Use the pair, or drop one end.' },
        { text: 'Different: P(i + 1, j − 1)', why: 'That drops both ends, but one of them may pair with something inside.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'P(i, i) = 1, and an empty interval is 0', right: true, why: 'One letter is a palindrome.' },
        { text: 'P(i, i) = 0', why: 'A single letter reads the same both ways.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'By interval length, shortest first', right: true, why: 'P(i, j) reads shorter intervals inside it.' },
        { text: 'i from 0 upward', why: 'P(i, j) reads P(i + 1, …), which starts later and would not be filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P(0, n − 1)', right: true, why: 'P(i, j) covers the piece from i to j, and the whole string is the piece from 0 to n − 1.' },
        { text: 'The largest P(i, i + 1)', why: 'Those are pieces of length 2.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 1, feedback: 'That is P(2,3) alone. Equal ends add 2: both b’s can be the outer pair around it.' },
      { answer: 2, feedback: 'The pair of b’s adds 2, and the inside “ba” still gives one more letter: 2 + 1.' },
    ] },
  },

  'palindrome-substring': {
    problem: 'Count the substrings (by position) of a string that are palindromes.',
    tryFirst: {
      prompt: 'How many palindromic substrings does “abba” have, counting each position?',
      args: ['abba'], answer: 6,
      misconceptions: [
        { answer: 4, feedback: 'Every single letter counts, and so do “bb” and “abba”.' },
      ],
      explain: 'a, b, b, a, bb, abba. A piece is a palindrome when its ends match and the piece inside is one too.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'T(i, j) = whether s[i..j] is a palindrome', right: true, why: 'One yes/no per piece; the count adds them up.' },
        { text: 'The number of palindromes in the first j letters', why: 'Checking a new piece needs to know whether its inside is a palindrome, which this does not record.' },
      ] },
      { kind: 'split', ask: 'When is s[i..j] a palindrome?', options: [
        { text: 'When s_i = s_j and the inside s[i+1..j−1] is a palindrome', right: true, why: 'Peel the ends; what is left must read the same both ways.' },
        { text: 'When s_i = s_j', why: '“abca” has equal ends but “bc” inside.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills T(i, j)?', options: [
        { text: 's_i = s_j and (j − i < 2 or T(i + 1, j − 1))', right: true, why: 'Short pieces need only equal ends.' },
        { text: 'T(i + 1, j) and T(i, j − 1)', why: '“aba” is a palindrome, but “ab” and “ba” are not.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Pieces of length 1 are true; length 2 when the two letters are equal', right: true, why: 'The rule reads the inside, which is empty for these.' },
        { text: 'All pieces of length 2 are true', why: 'A piece of two different letters, like “ab”, is not a palindrome.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'By piece length, shortest first', right: true, why: 'Each piece reads its inside, which is shorter.' },
        { text: 'Left to right by start', why: 'The inside starts later, not yet filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The number of true cells', right: true, why: 'Each palindromic piece, counted by position.' },
        { text: 'T(0, n − 1)', why: 'That only says whether the whole string is one.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: false, feedback: 'The ends are both a, and the inside “bb” is T(1,2) = T, so “abba” is a palindrome.' },
    ] },
  },

  'palindrome-cuts': {
    problem: 'Cut a string into pieces that are all palindromes, using as few cuts as possible.',
    tryFirst: {
      prompt: 'What is the fewest cuts that split “abaab” into palindromes?',
      args: ['abaab'], answer: 1,
      misconceptions: [
        { answer: 2, feedback: 'Taking the longest palindrome from the left, “aba”, leaves “ab”, which needs another cut. “a | baab” needs one.' },
      ],
      explain: '“a | baab”. Greedy longest-first fails, so try every last piece.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored?', options: [
        { text: 'C(i) = the fewest cuts for the first i letters, with a palindrome table to check pieces', right: true, why: 'A prefix is the same question; the table answers “is this piece a palindrome?” instantly.' },
        { text: 'The longest palindrome starting at each position', why: 'That leads to greedy, which fails on “abaab”.' },
      ] },
      { kind: 'split', ask: 'A best cutting of the first i letters: what do you look at?', options: [
        { text: 'Its last piece, s[j..i), which must be a palindrome', right: true, why: 'Before it is a best cutting of the first j letters.' },
        { text: 'Its longest piece', why: 'The longest piece can be anywhere; the last piece connects to a smaller prefix.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(i)?', options: [
        { text: 'The smallest C(j) + 1 over every j where s[j..i) is a palindrome', right: true, why: 'One more cut before the last piece; with C(0) = −1, a single piece needs no cut.' },
        { text: 'C(i − 1) + 1', why: 'That cuts off one letter at a time, never using longer palindromes.' },
      ] },
      { kind: 'base', ask: 'What starts it?', options: [
        { text: 'C(0) = −1, so a string that is one palindrome gets 0 cuts', right: true, why: 'The first piece adds no cut; −1 + 1 = 0.' },
        { text: 'C(0) = 0', why: 'Then a single piece counts as one cut.' },
      ] },
      { kind: 'order', ask: 'In what order is the work done?', options: [
        { text: 'Fill the palindrome table first (by length), then C for prefixes in increasing order', right: true, why: 'C(i) reads smaller prefixes and asks the table about pieces.' },
        { text: 'C from the longest prefix down', why: 'C(i) reads shorter prefixes.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'C(n)', right: true, why: 'C(i) is the fewest cuts for the first i letters, and the whole string has n.' },
        { text: 'The number of palindromes in the string', why: 'That counts pieces of every kind, not a cutting.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 2, feedback: 'That makes the last piece “b” alone: C(4) + 1. “baab” is a palindrome, so the last piece can start at 1: C(1) + 1 = 0 + 1.' },
      { answer: 0, feedback: 'No cuts would mean “abaab” is a palindrome, but backwards it reads “baaba”.' },
    ] },
  },

  'palindrome-count': {
    problem: 'Count the nonempty subsequences (by position) of a string that are palindromes.',
    tryFirst: {
      prompt: 'How many nonempty palindromic subsequences, counting positions, does “aba” have?',
      args: ['aba'], answer: 5,
      misconceptions: [
        { answer: 4, feedback: '4 counts different strings (a, b, aa, aba). Positions count here: the two single a’s are two.' },
      ],
      explain: 'a (first), b, a (last), aa, aba. Split by whether both ends are used; with equal ends, every palindrome inside can be wrapped.',
    },
    steps: [
      { kind: 'state', ask: 'What should N(i, j) mean?', options: [
        { text: 'The number of nonempty palindromic subsequences within s[i..j], by position', right: true, why: 'An interval, as for every palindrome problem.' },
        { text: 'The longest palindromic subsequence within s[i..j]', why: 'That is a length; the question counts them.' },
      ] },
      { kind: 'split', ask: 'How do you count the palindromes in s[i..j]?', options: [
        { text: 'Those without s_i, plus those without s_j, minus those without either; plus, if s_i = s_j, those using both ends', right: true, why: 'Inclusion–exclusion on the ends, then the ones that wrap both.' },
        { text: 'Those without s_i plus those without s_j', why: 'The ones using neither end are counted twice.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills N(i, j)?', options: [
        { text: 'N(i + 1, j) + N(i, j − 1) − N(i + 1, j − 1), plus N(i + 1, j − 1) + 1 when s_i = s_j', right: true, why: 'Equal ends wrap every inside palindrome, plus the pair on its own.' },
        { text: 'N(i + 1, j) + N(i, j − 1)', why: 'This counts the inside twice.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'N(i, i) = 1; an empty interval is 0', right: true, why: 'A single letter is one palindrome.' },
        { text: 'N(i, i) = 2, counting the empty one', why: 'The question counts nonempty ones only.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'By interval length, shortest first', right: true, why: 'Each cell reads shorter intervals.' },
        { text: 'Left to right by start', why: 'N(i, j) reads N(i + 1, …), which starts later.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N(0, n − 1)', right: true, why: 'N(i, j) counts within the piece from i to j; the whole string is 0 to n − 1.' },
        { text: 'The sum of N over all intervals', why: 'Each palindrome would be counted once for every interval containing it.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 3, feedback: 'That is only the palindromes that skip an end. Equal ends add “aba” (around the b) and “aa”.' },
      { answer: 4, feedback: 'One more: the two a’s on their own make “aa”.' },
    ] },
  },

  'affine-gap': {
    problem: 'Align two strings at the lowest cost. A mismatched pair costs a fixed amount, and a run of g gaps costs open + extend · (g − 1): opening a gap is expensive, extending it is cheap.',
    tryFirst: {
      prompt: 'Align “aaaa” with “aa”. Mismatch 9, open 3, extend 2. What is the lowest cost?',
      args: ['aaaa', 'aa', 9, 3, 2], answer: 5,
      misconceptions: [
        { answer: 6, feedback: 'Two separate one-letter gaps open twice: 3 + 3. One gap of two opens once: 3 + 2.' },
        { answer: 4, feedback: 'With unit costs per gap letter it would be 2 · 2, but here the first gap letter costs 3.' },
      ],
      explain: 'One run of two gaps: 3 + 2 = 5. Whether a gap column opens a run or extends one depends on the column before it, so that has to be in the state.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored?', options: [
        { text: 'One table E(i, j) of the best cost', why: 'The price of a gap depends on whether the previous column was also a gap, which one number cannot say.' },
        { text: 'Three tables: M(i, j) ends with a letter pair, X(i, j) with a gap in b, Y(i, j) with a gap in a', right: true, why: 'The last column’s kind is exactly what decides the next gap’s price.' },
      ] },
      { kind: 'split', ask: 'For X(i, j), alignment ending with a_i against a gap: what came before?', options: [
        { text: 'Any alignment of i − 1 and j: from X it extends the gap, from M or Y it opens one', right: true, why: 'Only a gap in the same string continues the run.' },
        { text: 'Only X(i − 1, j)', why: 'A gap can also start fresh after a pair or the other kind of gap.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills X(i, j)?', options: [
        { text: 'min(M(i − 1, j) + open, X(i − 1, j) + extend, Y(i − 1, j) + open)', right: true, why: 'Extending costs less than opening; each source pays its own price.' },
        { text: 'min(M, X, Y)(i − 1, j) + extend', why: 'This never pays to open a gap.' },
      ] },
      { kind: 'base', ask: 'What starts the tables?', options: [
        { text: 'M(0, 0) = 0; along the edges a single gap run: X(i, 0) = open + extend · (i − 1); the rest ∞', right: true, why: 'With one string empty, the other is one long gap.' },
        { text: 'X(i, 0) = i · open', why: 'That opens a new gap for every letter.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill them?', options: [
        { text: 'Row by row, all three tables at each cell', right: true, why: 'Each reads the three tables at the cell above, left, or diagonal.' },
        { text: 'All of M, then all of X, then all of Y', why: 'M reads X and Y at earlier cells, which would not be filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min(M(n, m), X(n, m), Y(n, m))', right: true, why: 'The best alignment can end in any kind of column.' },
        { text: 'M(n, m)', why: 'The best alignment may end with a gap.' },
      ] },
    ],
    apply: { cell: [10, 1], misconceptions: [
      { answer: 6, feedback: 'That opens the gap again after X(2,1). X(2,1) already ends in a gap in b, so this one extends it: 3 + 1.' },
      { answer: 9, feedback: 'That opens a gap after M(2,1) = 6. Extending the gap that X(2,1) = 3 ends with is cheaper.' },
    ] },
  },

  'local-alignment': {
    problem: 'Find the best-scoring alignment between any piece of one string and any piece of another. A match scores +m, a mismatch −x, each gap −g. (Smith–Waterman; scoring the whole strings is Needleman–Wunsch.)',
    tryFirst: {
      prompt: 'Score +2 a match, −1 a mismatch, −1 a gap. What is the best local alignment score of “xabcy” and “zabcw”?',
      args: ['xabcy', 'zabcw', 2, 1, 1], answer: 6,
      misconceptions: [
        { answer: 4, feedback: 'That scores the whole strings: the mismatched ends cost 2. A local alignment can leave them out.' },
      ],
      explain: '“abc” with “abc”: 3 matches, 6. A local alignment may start anywhere, which is what the 0 in its rule allows.',
    },
    steps: [
      { kind: 'state', ask: 'What should H(i, j) mean?', options: [
        { text: 'The best score of an alignment ending at a_i and b_j, starting anywhere (at least 0)', right: true, why: 'Pin the end; the start is free.' },
        { text: 'The global alignment score of the two prefixes', why: 'That forces the alignment to start at the beginning of both strings.' },
      ] },
      { kind: 'split', ask: 'What can the last step be?', options: [
        { text: 'A pair, a gap in either string, or nothing: start a fresh alignment here', right: true, why: 'Starting fresh is the local part: a bad beginning can be dropped.' },
        { text: 'A pair or a gap only', why: 'Then every alignment drags its whole beginning along.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills H(i, j)?', options: [
        { text: 'max(0, H(i − 1, j − 1) + score(a_i, b_j), H(i − 1, j) − g, H(i, j − 1) − g)', right: true, why: 'The 0 means “start here instead”.' },
        { text: 'The same without the 0', why: 'That is the global rule: bad prefixes pull every later score down.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Row 0 and column 0 are 0', right: true, why: 'An empty alignment scores 0, and you can start anywhere.' },
        { text: 'H(i, 0) = −g · i', why: 'That is the global start, charging for gaps a local alignment would leave out.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Row by row', right: true, why: 'Each cell reads above, left and diagonal.' },
        { text: 'Highest-scoring cells first', why: 'Scores are what you compute; positions decide what is ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest H anywhere', right: true, why: 'The best local alignment can end anywhere.' },
        { text: 'H(n, m)', why: 'That ends the alignment at both strings’ ends.' },
      ] },
    ],
    apply: { cell: [4, 4], misconceptions: [
      { answer: 2, feedback: 'That starts a fresh alignment at the c. Extending the “ab” match before it, H(3,3) = 4, is better: 4 + 2.' },
    ] },
  },
}
