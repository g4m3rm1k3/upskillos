// "Design it yourself" for the combinatorial counting lessons (Core, basic-counting group). Format: designs.js.

export const COUNTING_DESIGNS = {
  binomial: {
    problem: 'Count the ways to choose k items from n, where the order of the chosen items does not matter. Build it from smaller counts, not from factorials.',
    tryFirst: {
      prompt: 'How many ways are there to choose 2 people from 5?',
      args: [5, 2], answer: 10,
      misconceptions: [
        { answer: 20, feedback: '20 counts ordered pairs: 5 choices, then 4. Choosing Ann and Ben is the same as choosing Ben and Ann.' },
        { answer: 25, feedback: 'That allows choosing the same person twice, and counts each pair in both orders.' },
      ],
      explain: '10 pairs. Split them by the last person, Eve: 4 pairs include her (she plus one of the other 4), and 6 do not (two of the other 4).',
    },
    steps: [
      { kind: 'state', ask: 'What should C(n, k) mean?', options: [
        { text: 'The number of ways to choose k of the first n items', right: true, why: 'The same question with fewer items, or fewer to choose.' },
        { text: 'The number of ordered ways to pick k of n', why: 'That counts each set k! times, once per order.' },
        { text: 'C(n) = the number of ways to choose any number of the n items', why: 'That is 2ⁿ, every subset. How many are chosen has to be an index.' },
      ] },
      { kind: 'split', ask: 'How do you split the choices of k from n?', options: [
        { text: 'By which item is chosen first', why: 'A chosen set has no first item; ordering them counts each set many times.' },
        { text: 'By whether item n is chosen', right: true, why: 'Chosen: k − 1 more from the other n − 1. Not chosen: all k from the other n − 1. No choice is in both groups.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(n, k)?', options: [
        { text: 'C(n, k) = n · C(n − 1, k − 1)', why: 'Picking one item to go first counts every set k times, once for each item in it.' },
        { text: 'C(n, k) = C(n − 1, k − 1) + C(n − 1, k)', right: true, why: 'With item n, plus without it: Pascal’s rule.' },
        { text: 'C(n, k) = C(n − 1, k) + 1', why: 'Choosing item n leaves C(n − 1, k − 1) ways to finish, not just one.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0, k) = 1 for every k', why: 'From no items you can only choose nothing: C(0, 0) = 1, and C(0, k) = 0 for k > 0.' },
        { text: 'C(n, 0) = 1 and C(n, n) = 1; k below 0 or above n gives 0', right: true, why: 'One way to choose nothing, one way to choose everything; the edges of Pascal’s triangle.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'n increasing, row by row', right: true, why: 'Row n reads only row n − 1.' },
        { text: 'n decreasing from the target', why: 'Row n reads row n − 1, which would still be empty.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of row n', why: 'That is every subset of n items, 2ⁿ, not just those of size k.' },
        { text: 'C(n, k), or 0 when k is out of range', right: true, why: 'The cell means exactly the question.' },
      ] },
    ],
    apply: { cell: [5, 2] },
  },

  'integer-partitions': {
    problem: 'Count the ways to write n as a sum of positive integers, ignoring order: 2 + 1 and 1 + 2 are the same partition.',
    tryFirst: {
      prompt: 'How many partitions does 5 have? (5 itself counts, and so does 1 + 1 + 1 + 1 + 1.)',
      args: [5], answer: 7,
      misconceptions: [
        { answer: 16, feedback: '16 counts ordered sums (compositions): 1 + 4 and 4 + 1 would both count. Write each partition with its parts in decreasing order.' },
        { answer: 6, feedback: 'Check the partitions that use a 2: 2 + 2 + 1, 2 + 1 + 1 + 1, and 3 + 2.' },
      ],
      explain: '5, 4+1, 3+2, 3+1+1, 2+2+1, 2+1+1+1, 1+1+1+1+1. Sorted, each one is built by deciding how many 5s, 4s, 3s, 2s and then 1s: one part size at a time.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'P(a) = the sum of P(a − p) over part sizes p', why: 'Splitting by the last part counts each order: that gives compositions, 16 for 5.' },
        { text: 'The number of parts in a partition of a', why: 'Different partitions have different numbers of parts; there is no single number to store.' },
        { text: 'P(p, a) = the partitions of a into parts no bigger than p', right: true, why: 'Limiting the largest part means each partition is built once, from its biggest parts down.' },
      ] },
      { kind: 'split', ask: 'A partition of a with parts at most p: what is the split?', options: [
        { text: 'It uses a part equal to p, or it does not', right: true, why: 'Not: all parts are at most p − 1. Does: remove one p, and the rest is a partition of a − p with parts at most p.' },
        { text: 'By its last part', why: 'A partition has no order; its “last part” counts orders.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills P(p, a)?', options: [
        { text: 'P(p − 1, a) + P(p, a − p)', right: true, why: 'No part p, plus at least one part p, with more allowed.' },
        { text: 'P(p − 1, a) + P(p − 1, a − p)', why: 'This allows at most one part of size p, so 2 + 2 would be missed.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'P(0, 0) = 1 and P(0, a) = 0 for a > 0', right: true, why: 'With no part sizes allowed, only the empty sum, which is 0.' },
        { text: 'P(p, 1) = 1 for every p, and P(p, 0) is not needed', why: 'Using one part p reads P(p, a − p), which is P(p, 0) when a = p, so it is needed.' },
      ] },
      { kind: 'order', ask: 'With one row of amounts, which loop goes outside?', options: [
        { text: 'Part sizes outside, amounts increasing inside', right: true, why: 'Each size is added in one pass, so each partition is built in one sorted order.' },
        { text: 'Amounts outside, part sizes inside', why: 'Then every amount can end in any part, which counts orders: compositions.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P(n, n)', right: true, why: 'Parts may be as large as n itself.' },
        { text: 'P(n − 1, n)', why: 'That leaves out the partition with one part, n itself.' },
      ] },
    ],
    apply: {
      cell: [2, 4],
      misconceptions: [{ answer: 5, feedback: '5 counts the ordered sums of 4 from 1s and 2s. Ignoring order: 2+2, 2+1+1, 1+1+1+1.' }],
    },
  },

  catalan: {
    problem: 'Count the balanced strings of n pairs of brackets, such as (()) and ()() for n = 2.',
    tryFirst: {
      prompt: 'How many balanced strings have 3 pairs of brackets?',
      args: [3], answer: 5,
      misconceptions: [
        { answer: 20, feedback: '20 counts every arrangement of three “(” and three “)”, including ones like )(()() that go wrong at the start.' },
        { answer: 4, feedback: 'You may have missed (()()) or ()(()).' },
      ],
      explain: '((())), (()()), (())(), ()(()), ()()(). Look at where the first “(” closes: inside it is a smaller balanced string, and after it another.',
    },
    steps: [
      { kind: 'state', ask: 'What should C(m) mean?', options: [
        { text: 'The number of strings with m “(” and m “)”', why: 'That is C(2m, m), which includes strings that close before they open.' },
        { text: 'The number of balanced strings of m pairs', right: true, why: 'The same question for fewer pairs.' },
      ] },
      { kind: 'split', ask: 'How do you split the balanced strings of m pairs?', options: [
        { text: 'By the last character', why: 'It is always “)”, so it splits nothing.' },
        { text: 'By where the first “(” closes: k pairs inside it, m − 1 − k after it', right: true, why: 'That closing bracket is unique, and both the inside and the rest are balanced strings themselves.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(m)?', options: [
        { text: 'C(m) = the sum over k of C(k) + C(m − 1 − k)', why: 'Any inside goes with any after, so the choices multiply, not add.' },
        { text: 'C(m) = 2 · C(m − 1)', why: 'Wrapping “( s )” and prefixing “() s” miss some strings and count ()() twice; for 3 pairs it gives 4.' },
        { text: 'C(m) = the sum over k = 0 … m − 1 of C(k) · C(m − 1 − k)', right: true, why: 'For each place the first bracket can close, every inside pairs with every after.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0) = 1: the empty string', right: true, why: 'An empty inside or an empty rest is the empty string, and it must count once.' },
        { text: 'C(1) = 1, and C(0) is not needed', why: 'The split reads C(0) whenever the inside or the rest is empty.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'm increasing', right: true, why: 'C(m) reads only C(0) to C(m − 1).' },
        { text: 'm decreasing', why: 'C(m) reads smaller m, not yet filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'C(n)', right: true, why: 'Balanced strings of n pairs.' },
        { text: 'The sum of C(0) to C(n)', why: 'That counts strings of every smaller size too.' },
      ] },
    ],
    apply: { cell: [0, 4] },
  },

  'balanced-parentheses': {
    problem: 'A string holds “(”, “)” and “?”. Count the ways to replace each ? with a bracket so the string becomes balanced: no prefix closes more than it opened, and the counts match at the end.',
    tryFirst: {
      prompt: 'How many ways can “??????” be filled in to make a balanced string?',
      args: ['??????'], answer: 5,
      misconceptions: [
        { answer: 64, feedback: '64 is every way to fill six ? marks. Most of them are not balanced.' },
        { answer: 20, feedback: '20 is every way with three of each bracket; some still close too early, like )((()).' },
      ],
      explain: 'The 5 balanced strings of 3 pairs. To count them for any pattern, track one number while reading left to right: how many brackets are open.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the number of ways to fill the first i characters', why: 'Two fillings that end at different depths need different endings, so the depth must be in the state.' },
        { text: 'D(i, d) = ways to fill the first i characters ending at depth d, without going below 0', right: true, why: 'The depth (open brackets) is all the future needs to know.' },
        { text: 'D(i, d) with depth allowed to go negative, checked at the end', why: '“)(” ends at depth 0 but is not balanced; going below 0 must be ruled out as it happens.' },
      ] },
      { kind: 'split', ask: 'How does character i change the depth?', options: [
        { text: '“(” comes from depth d − 1, “)” from d + 1, and “?” from either', right: true, why: 'Each character moves the depth one step; a ? tries both.' },
        { text: 'Only “?” changes the depth', why: 'Every bracket changes it: “(” opens one, “)” closes one.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i, d) for d ≥ 0?', options: [
        { text: '(D(i − 1, d − 1) if it can be “(”) + (D(i − 1, d + 1) if it can be “)”)', right: true, why: 'The two ways to arrive at depth d, each allowed only if the character permits it.' },
        { text: 'D(i − 1, d − 1) + D(i − 1, d + 1) for every character', why: 'That treats every character as a ?, ignoring the fixed brackets.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = 1, and every other depth at i = 0 is 0', right: true, why: 'Before reading anything there is one empty filling, at depth 0.' },
        { text: 'D(0, d) = 1 for every d', why: 'Nothing has been opened yet, so only depth 0 is possible.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Position by position, left to right', right: true, why: 'Column i reads only column i − 1.' },
        { text: 'Depth by depth, from 0 up', why: 'D(i, d) reads depth d + 1 at position i − 1, so depth order is not what matters; position is.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(length, 0)', right: true, why: 'Every bracket closed at the end.' },
        { text: 'The sum of D(length, d) over d', why: 'That includes fillings with brackets still open.' },
      ] },
    ],
    apply: { cell: [1, 3] },
  },

  derangements: {
    problem: 'Put n letters into n envelopes, one each, so that no letter is in its own envelope. Count the ways.',
    tryFirst: {
      prompt: 'How many ways can 4 letters go into 4 envelopes with no letter in its own envelope?',
      args: [4], answer: 9,
      misconceptions: [
        { answer: 24, feedback: '24 is every arrangement. Most of them put at least one letter in its own envelope.' },
        { answer: 23, feedback: 'That removes only the arrangement where every letter is home. Many others have one or two letters at home.' },
      ],
      explain: '9. Follow letter 1: it goes into one of 3 other envelopes, j. Then letter j either goes into envelope 1 (a swap) or does not.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(n) mean?', options: [
        { text: 'The number of arrangements of n letters', why: 'That is n!, which includes letters at home.' },
        { text: 'The number of arrangements of n letters with none in its own envelope', right: true, why: 'The same question for fewer letters.' },
      ] },
      { kind: 'split', ask: 'Letter 1 goes into envelope j. What is the next split?', options: [
        { text: 'Whether letter j goes into envelope 1', right: true, why: 'Yes: j and 1 swap, and the other n − 2 letters must be deranged. No: letter j must avoid envelope 1, which works like its own envelope, so n − 1 letters are deranged.' },
        { text: 'Whether letter 2 is at home', why: 'No letter is at home; the question is how letter 1’s choice shrinks the problem.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(n)?', options: [
        { text: 'D(n) = (n − 1) · D(n − 1)', why: 'This forgets the swaps, where j goes back into envelope 1.' },
        { text: 'D(n) = (n − 1) · (D(n − 1) + D(n − 2))', right: true, why: 'n − 1 choices of j, each split into “no swap” and “swap”.' },
        { text: 'D(n) = n! − 1', why: 'That removes only the one arrangement with everyone at home.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 1 and D(1) = 0', right: true, why: 'No letters: one empty arrangement. One letter has only its own envelope.' },
        { text: 'D(1) = 1', why: 'With one letter and one envelope, the letter must go home, so there are none.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'n increasing', right: true, why: 'D(n) reads D(n − 1) and D(n − 2).' },
        { text: 'n decreasing', why: 'D(n) reads smaller values not yet filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n)', right: true, why: 'D(n) counts the arrangements of n letters with none at home, which is the question.' },
        { text: 'n! − D(n)', why: 'That counts arrangements with at least one letter at home.' },
      ] },
    ],
    apply: {
      cell: [0, 5],
      misconceptions: [{ answer: 36, feedback: '4 · D(4) forgets the swaps: 4 · (D(4) + D(3)).' }],
    },
  },

  stirling: {
    problem: 'Count the ways to split n labelled items into exactly k non-empty groups, where the groups themselves have no labels.',
    tryFirst: {
      prompt: 'In how many ways can the items a, b and c be split into exactly 2 non-empty groups?',
      args: [3, 2], answer: 3,
      misconceptions: [
        { answer: 6, feedback: 'That labels the groups: {a} with {b, c} would count as different from {b, c} with {a}.' },
        { answer: 4, feedback: 'One group must take one item and the other the rest: which item is alone?' },
      ],
      explain: '{a}{b, c}, {b}{a, c}, {c}{a, b}. Now follow c: it is alone (and a, b form one group) or it joins one of the 2 groups that a and b form.',
    },
    steps: [
      { kind: 'state', ask: 'What should S(n, k) mean?', options: [
        { text: 'Ways to split n items into k labelled groups', why: 'That counts each split k! times, once per labelling.' },
        { text: 'Ways to split n labelled items into exactly k non-empty unlabelled groups', right: true, why: 'The question, for fewer items or groups.' },
        { text: 'Ways to split n items into any number of groups', why: 'That is the Bell number, the sum over k. The number of groups has to be an index.' },
      ] },
      { kind: 'split', ask: 'What can item n do?', options: [
        { text: 'Be alone in a new group, or join one of the k groups the others form', right: true, why: 'Alone: the others form k − 1 groups. Joining: they form k groups, and item n picks one of k.' },
        { text: 'Join the group with the smallest item', why: 'It may join any group; each choice is a different split.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills S(n, k)?', options: [
        { text: 'S(n − 1, k − 1) + S(n − 1, k)', why: 'Joining has k choices of group, not one. This is Pascal’s rule, not Stirling’s.' },
        { text: 'S(n − 1, k − 1) + k · S(n − 1, k)', right: true, why: 'Alone, plus joining any one of the k groups.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'S(0, 0) = 1; S(n, 0) = 0 for n > 0; S(0, k) = 0 for k > 0', right: true, why: 'No items into no groups: one way. Items with no groups, or groups with no items, cannot be done.' },
        { text: 'S(n, 1) = 1 and S(n, n) = 1, nothing else', why: 'Those are right, but the rule reaches S(n − 1, 0), so the k = 0 edge must be set too.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'n increasing, row by row', right: true, why: 'Row n reads only row n − 1.' },
        { text: 'k decreasing', why: 'S(n, k) reads k − 1 and k on the row above; the order that matters is by n.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'S(n, k)', right: true, why: 'S(n, k) counts splits of n items into exactly k groups, which is the question.' },
        { text: 'The sum of row n', why: 'That is the Bell number: splits into any number of groups.' },
      ] },
    ],
    apply: {
      cell: [4, 2],
      misconceptions: [{ answer: 4, feedback: 'Joining has 2 choices of group: S(3, 1) + 2 · S(3, 2).' }],
    },
  },

  'inversion-counting': {
    problem: 'An inversion of a permutation is a pair of positions whose values are in the wrong order. Count the permutations of 1 … n with exactly k inversions.',
    tryFirst: {
      prompt: 'How many orderings of 1, 2, 3 have exactly one pair out of order?',
      args: [3, 1], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 is the number of pairs of positions. The question counts orderings: 1 3 2 and 2 1 3.' },
        { answer: 1, feedback: '1 3 2 has one inversion; so does 2 1 3.' },
      ],
      explain: '1 3 2 and 2 1 3. Build orderings by inserting the largest value last: placed with t values after it, it adds exactly t inversions.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(n, k) mean?', options: [
        { text: 'The number of permutations of 1 … n with exactly k inversions', right: true, why: 'The same question with a smaller n or k.' },
        { text: 'D(n) = the number of permutations of 1 … n', why: 'That is n!; the inversion count has to be an index.' },
      ] },
      { kind: 'split', ask: 'How do you split the permutations of 1 … n?', options: [
        { text: 'By where the largest value n sits: with t values after it, it adds t inversions', right: true, why: 'Removing n leaves a permutation of 1 … n − 1 with k − t inversions; n’s place, 0 to n − 1 from the end, decides t.' },
        { text: 'By the first value', why: 'The first value’s inversions depend on everything after it; the largest value’s depend only on its position.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(n, k)?', options: [
        { text: 'D(n − 1, k) + D(n − 1, k − 1)', why: 'That allows only two places for n; there are n.' },
        { text: 'The sum of D(n − 1, k − t) for t = 0 … min(n − 1, k)', right: true, why: 'One term per place for n, each adding its own t inversions.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = 1; every other D(0, k) = 0', right: true, why: 'The empty permutation has no inversions.' },
        { text: 'D(n, 0) = 0', why: 'The sorted permutation has 0 inversions, so D(n, 0) = 1.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'n increasing; within a row, any k', right: true, why: 'Row n reads only row n − 1.' },
        { text: 'k increasing, all n at once', why: 'Row n still needs row n − 1 first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n, k), or 0 when k is outside 0 … n(n − 1)/2', right: true, why: 'The cell is the question; no permutation has more than n(n − 1)/2 inversions.' },
        { text: 'The sum of row n', why: 'That counts every permutation, n!.' },
      ] },
    ],
    apply: { cell: [4, 2] },
  },
}
