// "Check yourself" for the counting lessons (Core, basic-counting group). Format and checks: checks.js
// and checks.test.js. Every typed number was printed by the brute-force oracles before it was typed.

export const COUNTING_CHECKS = {
  binomial: [
    {
      know: 'C(n, k) = C(n − 1, k − 1) + C(n − 1, k): the last item is either chosen or not.',
      ask: 'How many ways are there to choose 3 items from 6?',
      args: [6, 3], answer: 20,
      misconceptions: [
        { answer: 120, feedback: '120 is 6 · 5 · 4, which counts ordered choices: first, second, third. Each set of 3 appears in 3! = 6 orders.' },
        { answer: 18, feedback: '18 is 6 × 3. Choosing has no such simple product; Pascal’s triangle gives 20.' },
        { answer: 15, feedback: '15 is C(6, 2), choosing 2. The question chooses 3.' },
      ],
      explain: 'Row 6 of Pascal’s triangle is 1 6 15 20 15 6 1. C(6, 3) = C(5, 2) + C(5, 3) = 10 + 10.',
    },
    {
      know: 'C(n, k) can also be written n! / (k! (n − k)!).',
      ask: 'Why build it from additions instead of the factorial formula?',
      options: [
        { text: 'The factorials grow far past the answer and overflow first; the additions never exceed the answer', right: true, why: 'C(60, 30) fits in 64 bits but 60! does not. Additions also work modulo a prime with no division.' },
        { text: 'The factorial formula gives the wrong answer', why: 'It is exact in exact arithmetic. The trouble is the size of the numbers on the way.' },
        { text: 'Additions are always faster than multiplications', why: 'The table does about n · k additions, more operations than the formula. It is chosen for safety, not speed.' },
      ],
    },
    {
      know: 'Row n of Pascal’s triangle is built from row n − 1 alone.',
      ask: 'Keeping one row and updating it in place, which way must k run?',
      options: [
        { text: 'Upward, from small k to large', why: 'Then row[k − 1] has already become the new row when row[k] reads it, and the counts come out too large.' },
        { text: 'Either way: the row is symmetric', why: 'The finished row is symmetric, but in the middle of an update one side is new and the other old.' },
        { text: 'Downward, from large k to small', right: true, why: 'row[k] += row[k − 1] then reads row[k − 1] before it changes, so both terms come from the previous row.' },
      ],
    },
  ],

  'integer-partitions': [
    {
      know: 'P(n, m) counts the partitions of n whose parts are all at most m: use a part m, or use none.',
      ask: 'How many partitions does 6 have?',
      args: [6], answer: 11,
      misconceptions: [
        { answer: 32, feedback: '32 counts ordered sums (compositions), 2⁵: 1 + 2 and 2 + 1 as two. A partition ignores order.' },
        { answer: 10, feedback: 'One is missing. Don’t forget 6 itself, and 1 + 1 + 1 + 1 + 1 + 1.' },
      ],
      explain: '6, 5+1, 4+2, 4+1+1, 3+3, 3+2+1, 3+1+1+1, 2+2+2, 2+2+1+1, 2+1+1+1+1, 1+1+1+1+1+1.',
    },
    {
      know: 'A partition is the same whatever order its parts are written in.',
      ask: 'Why does the state include m, a limit on the size of the parts?',
      options: [
        { text: 'It makes each partition counted once: the parts are listed largest first, never growing', right: true, why: 'Each partition has exactly one non-increasing order. Without the limit, 2 + 1 and 1 + 2 would both be counted.' },
        { text: 'To keep the table small', why: 'Without m the table would be smaller, but it would count orders.' },
        { text: 'Because a part may not be bigger than n', why: 'That holds automatically: a part bigger than what is left never fits.' },
      ],
    },
    {
      know: 'Counting collections of coins ignores order, and so does counting partitions.',
      ask: 'Which earlier lesson counts the partitions of n?',
      options: [
        { text: 'Coin permutations with coins 1 to n', why: 'Permutations count orders: 32 for 6, not 11.' },
        { text: 'Coin combinations with coins 1, 2, …, n', right: true, why: 'A partition of n is a collection of coins worth 1 to n that adds up to n. Both give 11 for 6.' },
        { text: 'Subset sum with the values 1 to n', why: 'Subset sum uses each value at most once; 2 + 2 + 2 repeats a part.' },
      ],
    },
  ],

  catalan: [
    {
      know: 'C(n) = Σ C(i) · C(n − 1 − i): the first “(” closes around i pairs, and n − 1 − i pairs follow it.',
      ask: 'How many balanced strings have 4 pairs of brackets?',
      args: [4], answer: 14,
      misconceptions: [
        { answer: 70, feedback: '70 is C(8, 4), every string with four of each bracket. Most of them close a bracket before it opens, such as ())(()().' },
        { answer: 24, feedback: '24 is 4!, the orders of four things. Brackets are not four distinct things.' },
      ],
      explain: 'C(4) = C(0)C(3) + C(1)C(2) + C(2)C(1) + C(3)C(0) = 5 + 2 + 2 + 5 = 14.',
    },
    {
      know: 'Any structure that splits into a first part and two independent smaller structures of i and n − 1 − i pieces follows the same recurrence.',
      ask: 'Which of these is also counted by the Catalan numbers?',
      options: [
        { text: 'Binary trees with n nodes', right: true, why: 'A root, then a left subtree of i nodes and a right subtree of n − 1 − i: the same sum.' },
        { text: 'Subsets of n items', why: 'Those number 2ⁿ: each item is in or out, with no split into two parts.' },
        { text: 'Orders of n items', why: 'Those number n!, which grows much faster than the Catalan numbers.' },
      ],
    },
    {
      know: 'Each C(m) adds up m products of earlier values.',
      ask: 'How much work is filling C(0) to C(n) with the sum?',
      options: [
        { text: 'About n operations, one per value', why: 'Each value is a sum of m products, not one.' },
        { text: 'About n²/2 multiplications', right: true, why: '1 + 2 + … + n products in all. The closed form C(2n, n) / (n + 1) is faster, but needs big numbers and a division.' },
        { text: 'Exponential, like listing the strings', why: 'The table never lists strings; it reuses the counts.' },
      ],
    },
  ],

  'balanced-parentheses': [
    {
      know: 'Scan left to right keeping ways[d], the number of fillings so far with d brackets open; a ? goes to d + 1 and to d − 1, and d may never be negative.',
      ask: 's = "??)???". How many fillings are balanced?',
      args: ['??)???'], answer: 2,
      misconceptions: [
        { answer: 10, feedback: '10 counts the fillings with three of each bracket, but most close too early. ())(() has three of each, yet its third bracket closes nothing: the depth may never drop below 0.' },
        { answer: 5, feedback: '5 is every balanced string of length 6. The fixed ) in third place rules most of them out.' },
      ],
      explain: '(()()) and (())(). Both first characters must be ( for the ) to have something to close, and the last must be ).',
    },
    {
      know: 'Every “(” must be matched by a “)” later in the string.',
      ask: 'Which input has 0 balanced fillings, before anything is filled?',
      options: [
        { text: 'One that starts with ?', why: 'A ? at the start can become (: "??" has one filling, ().' },
        { text: 'One of odd length', right: true, why: 'A balanced string has as many ) as (, so its length is even.' },
        { text: 'One with more ? than brackets', why: '"??" has only ? and still has a filling.' },
      ],
    },
    {
      know: 'Each character left can close at most one open bracket.',
      ask: 'At a position with r characters left, which depths can be dropped?',
      options: [
        { text: 'Depths greater than r', right: true, why: 'There aren’t enough characters left to close them, so they can never end at depth 0.' },
        { text: 'Depths of 0', why: 'Depth 0 is where every filling must end; it is never dropped.' },
        { text: 'None: every depth may still finish', why: 'A depth larger than the characters left can’t come back to 0.' },
      ],
    },
  ],

  derangements: [
    {
      know: 'D(n) = (n − 1)(D(n − 1) + D(n − 2)): letter 1 goes to one of n − 1 other envelopes, and then the two letters swap or they don’t.',
      ask: 'How many ways can 5 letters go into 5 envelopes so that none is in its own?',
      args: [5], answer: 44,
      misconceptions: [
        { answer: 120, feedback: '120 is every arrangement, 5!. Most of them put at least one letter in its own envelope.' },
        { answer: 76, feedback: '76 is the arrangements with at least one letter in its own envelope: 120 − 44.' },
      ],
      explain: 'D: 1, 0, 1, 2, 9, 44. D(5) = 4 · (D(4) + D(3)) = 4 · (9 + 2) = 44.',
    },
    {
      know: 'There are n! arrangements in all, and D(n) of them leave no letter in its own envelope.',
      ask: 'As n grows, about what fraction of all arrangements are derangements?',
      options: [
        { text: 'About 1/e, roughly 37%', right: true, why: 'Already for 5 letters it is 44 / 120 ≈ 0.367. Inclusion–exclusion gives D(n) / n! = 1 − 1 + 1/2! − 1/3! + …, the series for 1/e.' },
        { text: 'It shrinks towards 0', why: 'It settles instead: for n = 2 to 5 the fractions are 0.5, 0.333, 0.375 and 0.367, closing in on 1/e.' },
        { text: 'About half', why: 'For 5 letters it is 44 of 120, under 37%, and it settles there.' },
      ],
    },
    {
      know: 'Each D(n) reads only D(n − 1) and D(n − 2).',
      ask: 'How much memory does computing D(n) need?',
      options: [
        { text: 'Two numbers', right: true, why: 'Keep the last two and shift them along, as for Fibonacci.' },
        { text: 'A table of n numbers', why: 'That works, but only the last two are ever read.' },
        { text: 'An n × n table', why: 'There is one index, n. Nothing pairs two indices.' },
      ],
    },
  ],

  stirling: [
    {
      know: 'S(n, k) = k · S(n − 1, k) + S(n − 1, k − 1): item n joins one of k existing groups, or starts a group of its own.',
      ask: 'In how many ways can 4 labelled items be split into 2 non-empty groups?',
      args: [4, 2], answer: 7,
      misconceptions: [
        { answer: 14, feedback: '14 counts the groups as labelled, A and B: 2⁴ − 2. Swapping two unlabelled groups gives the same split.' },
        { answer: 6, feedback: '6 is C(4, 2), choosing which 2 items go together. That counts each split into two pairs twice and misses the four splits of 3 against 1.' },
      ],
      explain: 'Four splits of one item against three, and three splits into two pairs: 7. S(4, 2) = 2 · S(3, 2) + S(3, 1) = 2 · 3 + 1.',
    },
    {
      know: 'In S(n, k) the groups have no names: {1, 2} {3} is the same split as {3} {1, 2}.',
      ask: 'If the groups are labelled boxes (and none may be empty), how many ways are there?',
      options: [
        { text: 'S(n, k) · k!', right: true, why: 'Each split can be given the k labels in k! ways. For 4 items in 2 boxes: 7 · 2 = 14.' },
        { text: 'S(n, k) · k', why: 'Labelling k groups gives k! orders, not k. The two agree only for k up to 2.' },
        { text: 'kⁿ', why: 'That lets boxes be empty. 2⁴ = 16 includes the two splits with an empty box.' },
      ],
    },
    {
      know: 'The Bell number B(n) counts the splits of n labelled items into any number of non-empty groups.',
      ask: 'How do you get B(n) from the Stirling table?',
      options: [
        { text: 'Read S(n, n)', why: 'S(n, n) = 1: every item alone. It is one of the terms.' },
        { text: 'Multiply the row', why: 'The group counts exclude each other, so their counts add, not multiply.' },
        { text: 'Add row n: S(n, 1) + S(n, 2) + … + S(n, n)', right: true, why: 'Every split has some number of groups, so summing over k counts each split once. For 4 items: 1 + 7 + 6 + 1 = 15.' },
      ],
    },
  ],

  'inversion-counting': [
    {
      know: 'Inserting n into a permutation of 1 … n − 1 adds between 0 and n − 1 inversions, one for each smaller value it lands in front of.',
      ask: 'How many permutations of 1 … 4 have exactly 2 inversions?',
      args: [4, 2], answer: 5,
      misconceptions: [
        { answer: 6, feedback: '6 is the number of pairs, C(4, 2), the most inversions a permutation of 4 can have.' },
        { answer: 2, feedback: '2 is the count for 1 … 3. Adding the 4 makes room for more.' },
      ],
      explain: '1342, 1423, 2143, 2314 and 3124. The row for n = 4 is 1 3 5 6 5 3 1.',
    },
    {
      know: 'Reversing a permutation turns every pair in order into a pair out of order, and the other way round.',
      ask: 'What does that say about the counts?',
      options: [
        { text: 'The count for k equals the count for n(n − 1)/2 − k', right: true, why: 'Reversal is a one-to-one match between the two sets. For 4: 2 inversions and 4 inversions both have 5.' },
        { text: 'The counts are all equal', why: 'Only 1 permutation has 0 inversions, but 3 have 1.' },
        { text: 'The count for k equals the count for k + 1', why: 'For 4 items the counts are 1, 3, 5, 6, 5, 3, 1: they rise and fall.' },
      ],
    },
    {
      know: 'I(n, k) adds the n cells I(n − 1, k), I(n − 1, k − 1), …, I(n − 1, k − n + 1).',
      ask: 'How can each cell be filled in constant time?',
      options: [
        { text: 'Keep a running sum: the window for k + 1 is the window for k, plus one new cell, minus the one that falls out', right: true, why: 'Prefix sums of the previous row do it too. Each cell then costs one step instead of n.' },
        { text: 'It can’t: each cell needs all n terms', why: 'Neighbouring windows share n − 1 terms, so the sum can be reused.' },
        { text: 'Use the symmetry to fill only half', why: 'That halves the work but each cell still adds n terms.' },
      ],
    },
  ],
}
