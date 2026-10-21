// "Check yourself" for the digit and automaton lessons (Advanced, digits-automata group). Format and
// checks: checks.js and checks.test.js; the numbers come from advanced-oracles.js, which checks every
// number or string one by one. ranking’s answers are strings, so its number check counts the strings.

export const DIGIT_CHECKS = {
  'digit-tight': [
    {
      know: 'T(p) and F(p) count the completions of a prefix that is still equal to n’s (tight) or already below it (free).',
      ask: 'n = 50. How many integers from 0 to 50 have no digit 4?',
      args: [50], answer: 37,
      misconceptions: [
        { answer: 46, feedback: '46 removes only the numbers ending in 4. The forties all start with a 4.' },
        { answer: 51, feedback: '51 counts everything from 0 to 50.' },
      ],
      explain: '51 numbers minus 4, 14, 24, 34 and 40 to 49: 51 − 14 = 37.',
    },
    {
      know: 'There are only two tight values and at most 16 positions for n < 10¹⁶.',
      ask: 'How much work does the digit DP do?',
      options: [
        { text: 'About 16 × 2 states × 10 digits: a few hundred steps, whatever n is', right: true, why: 'The work depends on the number of digits, not on n itself.' },
        { text: 'About n steps', why: 'That is counting one by one, exactly what the DP avoids.' },
        { text: 'About 10¹⁶ steps', why: 'States merge every number with the same tight status at a position.' },
      ],
    },
    {
      know: 'Below n, every remaining digit is free and 9 choices avoid 4.',
      ask: 'What is F(p), the free count, with k positions left?',
      options: [
        { text: '9ᵏ', right: true, why: 'Each of the k positions independently takes one of 9 digits.' },
        { text: '10ᵏ', why: 'The digit 4 is never allowed, so only 9 per position.' },
        { text: 'k × 9', why: 'The positions’ choices multiply, not add.' },
      ],
    },
  ],

  'digit-leading': [
    {
      know: 'A started flag separates padding zeros from real digits; only real zeros are forbidden.',
      ask: 'n = 109. How many integers from 1 to 109 have no digit 0?',
      args: [109], answer: 90,
      misconceptions: [
        { answer: 99, feedback: '99 removes 100 to 109 but keeps 10, 20, …, 90, which contain a 0.' },
        { answer: 109, feedback: '109 counts every number; any with a 0 must go.' },
      ],
      explain: '9 one-digit numbers and 81 two-digit ones without 0; every number from 100 to 109 has a 0.',
    },
    {
      know: 'Without a started flag, every 0 would be treated the same.',
      ask: 'What goes wrong if padding zeros are forbidden too?',
      options: [
        { text: 'Every number shorter than n is lost, since it needs padding to reach n’s length', right: true, why: 'For n = 109, the numbers 1 to 99 would all be rejected.' },
        { text: 'Nothing: padding zeros are never written', why: 'The digit DP writes every number at n’s full length, with leading zeros.' },
        { text: 'Only the number 0 is lost', why: 'Every shorter number is lost, not just 0.' },
      ],
    },
    {
      know: 'The number 0 is all padding: it never starts.',
      ask: 'How is 0 kept out of the count?',
      options: [
        { text: 'A full-length prefix counts 1 only if it started', right: true, why: 'The all-padding prefix gives 0.' },
        { text: 'Start the count at 1', why: 'That adds a number instead of leaving 0 out.' },
        { text: 'It doesn’t need to be: 0 has no digit 0', why: '0 is outside 1 … n, and whether it “has a 0” depends on how it is written.' },
      ],
    },
  ],

  'digit-range': [
    {
      know: 'count[lo, hi] = F(hi) − F(lo − 1), where F(x) counts from 0 to x.',
      ask: 'lo = 100, hi = 200. How many integers contain a 7?',
      args: [100, 200], answer: 19,
      misconceptions: [
        { answer: 20, feedback: '20 counts 177 twice: it ends in 7 and is in the seventies.' },
        { answer: 10, feedback: '10 counts only 107, 117, …, 197. 170 to 179 have a 7 too.' },
      ],
      explain: '107, 117, …, 197 (10) and 170 to 179 (10), with 177 in both: 19.',
    },
    {
      know: 'Sometimes it is easier to count the numbers that do not qualify.',
      ask: 'How else can “contains a 7” be counted?',
      options: [
        { text: 'Total numbers in the range minus those with no 7 at all', right: true, why: 'No 7 is a simpler digit rule: each digit just avoids 7.' },
        { text: 'Count the 7s and divide by the number of digits', why: 'A number can have several 7s or one; counts of digits don’t count numbers.' },
        { text: 'Multiply the range length by 1/10', why: 'Digits aren’t independent at the bounds, and many numbers have several 7s.' },
      ],
    },
    {
      know: 'F(x) for x < 0 is defined to be 0, an empty range.',
      ask: 'Why define F(−1) = 0?',
      options: [
        { text: 'So lo = 0 works: F(hi) − F(−1) = F(hi)', right: true, why: 'Nothing lies below 0, so nothing is subtracted.' },
        { text: 'Because −1 has no digits', why: 'The reason is the range formula, not the digits of −1.' },
        { text: 'It isn’t needed', why: 'Without it, lo = 0 would call F on a negative number.' },
      ],
    },
  ],

  'digit-sum': [
    {
      know: 'The state carries the digit sum and the remainder (10r + d) mod m.',
      ask: 'n = 99, s = 9, m = 1. How many integers from 1 to 99 have digit sum 9?',
      args: [99, 9, 1], answer: 10,
      misconceptions: [
        { answer: 9, feedback: '9 forgets 90, whose digits also add to 9.' },
        { answer: 11, feedback: '99 has digit sum 18, not 9.' },
      ],
      explain: '9, 18, 27, 36, 45, 54, 63, 72, 81 and 90.',
    },
    {
      know: 'The digit sum of a number below 10ᵏ is at most 9k.',
      ask: 'How many digit-sum values does the state need, for n < 10¹⁵?',
      options: [
        { text: 'At most s + 1 (0 to s), since a larger sum can be dropped at once', right: true, why: 'Digits only add, so a sum past s can’t come back.' },
        { text: 'All 136 possible sums', why: 'Sums past s can be cut off immediately.' },
        { text: 'Only one: the final sum', why: 'The sum so far is what the state must carry.' },
      ],
    },
    {
      know: 'A number is divisible by 9 exactly when its digit sum is.',
      ask: 'For m = 9, what does that say about the two conditions?',
      options: [
        { text: 'The remainder is just the digit sum mod 9, so one of the two is redundant', right: true, why: '10 ≡ 1 mod 9, so (10r + d) mod 9 = (r + d) mod 9.' },
        { text: 'Nothing special', why: 'For m = 9 (and 3), the remainder follows from the digit sum.' },
        { text: 'Divisibility by 9 is impossible to track', why: 'It is easy: the remainder update works for any m.' },
      ],
    },
  ],

  'digit-mask': [
    {
      know: 'A 10-bit mask records the digits used; padding zeros leave it empty.',
      ask: 'n = 99. How many integers from 1 to 99 have all different digits?',
      args: [99], answer: 90,
      misconceptions: [
        { answer: 99, feedback: '11, 22, …, 99 repeat a digit.' },
        { answer: 81, feedback: '81 counts the two-digit ones only; the one-digit numbers count too.' },
      ],
      explain: '9 one-digit numbers and 81 two-digit ones (9 choices, then 9): 90.',
    },
    {
      know: 'The first digit has 9 choices (not 0), the next 9, then 8, and so on.',
      ask: 'How many 3-digit numbers have all different digits?',
      options: [
        { text: '9 × 9 × 8 = 648', right: true, why: 'The second digit may be 0 but not the first; the third avoids both.' },
        { text: '10 × 9 × 8 = 720', why: 'That allows a leading 0, which would make it a 2-digit number.' },
        { text: '9 × 8 × 7 = 504', why: 'The second digit may be 0, so it has 9 choices.' },
      ],
    },
    {
      know: 'The state is (position, tight, mask, started).',
      ask: 'How many masks can there be?',
      options: [
        { text: '2¹⁰ = 1024', right: true, why: 'Each of the ten digits is used or not.' },
        { text: '10', why: 'The mask is a set of digits, not one digit.' },
        { text: '10!', why: 'Order doesn’t matter for which digits are used.' },
      ],
    },
  ],

  'digit-adjacency': [
    {
      know: 'The state carries the last real digit, with a sentinel before the number starts.',
      ask: 'n = 50. How many integers from 1 to 50 have neighbouring digits that differ by at least 2?',
      args: [50], answer: 38,
      misconceptions: [
        { answer: 50, feedback: '50 counts every number; 10, 11, 12, 21, 22, 23, … break the rule.' },
      ],
      explain: '9 one-digit numbers and 29 two-digit ones up to 50.',
    },
    {
      know: 'Without a sentinel, the first digit would be compared with something.',
      ask: 'Why use a sentinel for “nothing before”?',
      options: [
        { text: 'The first real digit has no neighbour, so any digit may come first', right: true, why: 'The sentinel stands for that: it allows everything.' },
        { text: 'To mark the end of the number', why: 'It marks the start, before any real digit.' },
        { text: 'To store the number of digits', why: 'The position already tells how many digits.' },
      ],
    },
    {
      know: 'The state is (position, tight, last digit or sentinel).',
      ask: 'How many states are there per position?',
      options: [
        { text: '2 × 11: tight or free, times ten digits plus the sentinel', right: true, why: 'Small and fixed, whatever n is.' },
        { text: '2 × 10ᵖ', why: 'Only the last digit matters, not the whole prefix.' },
        { text: '2', why: 'The last digit is part of the state.' },
      ],
    },
  ],

  'digit-aggregate': [
    {
      know: 'Each state carries (count, total); appending d makes total 10 · total + d · count.',
      ask: 'n = 20. What is the sum of the numbers from 0 to 20 with only odd digits?',
      args: [20], answer: 100,
      misconceptions: [
        { answer: 210, feedback: '210 adds every number from 1 to 20.' },
        { answer: 25, feedback: '25 is the one-digit ones; 11, 13, 15, 17 and 19 count too.' },
      ],
      explain: '1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 + 17 + 19 = 100.',
    },
    {
      know: 'A digit DP usually counts. To add up values, each state needs more.',
      ask: 'Why carry the count alongside the total?',
      options: [
        { text: 'Appending d adds d to every prefix in the state, so the total grows by d · count', right: true, why: 'The count says how many prefixes get the digit.' },
        { text: 'To report the count as well', why: 'The count is needed to compute the total itself.' },
        { text: 'It isn’t needed', why: 'Without it, d would be added once instead of once per prefix.' },
      ],
    },
    {
      know: 'The same idea works for any quantity that changes predictably when a digit is appended.',
      ask: 'What would the sum of squares of the values need?',
      options: [
        { text: 'count, total and total of squares: (10x + d)² expands into all three', right: true, why: '100x² + 20dx + d²: each term uses one carried sum.' },
        { text: 'Only the total of squares', why: 'The cross term 20dx needs the plain total, and d² needs the count.' },
        { text: 'It can’t be done with a digit DP', why: 'It can, by carrying the needed sums.' },
      ],
    },
  ],

  'kmp-dp': [
    {
      know: 'W(ℓ, q) counts strings of length ℓ ending with q letters of the pattern matched; the full match is never entered.',
      ask: 'Alphabet {a, b}, avoid “aa”, length 5. How many strings?',
      args: ['ab', 'aa', 5], answer: 13,
      misconceptions: [
        { answer: 32, feedback: '32 is every string of length 5.' },
        { answer: 8, feedback: '8 is the count for length 4. Length 5 adds the next Fibonacci step: 8 + 5.' },
      ],
      explain: 'No two a’s together: these counts are Fibonacci numbers, 2, 3, 5, 8, 13.',
    },
    {
      know: 'The automaton has len(pattern) + 1 states and a move for each letter.',
      ask: 'How much work does counting strings of length L take?',
      options: [
        { text: 'About L × len(pattern) × |alphabet|', right: true, why: 'Each length updates every state for every letter.' },
        { text: '|alphabet|ᴸ', why: 'That is listing the strings one by one.' },
        { text: 'L × |alphabet|', why: 'Each state is updated separately.' },
      ],
    },
    {
      know: 'The prefix function fail[i] is the longest proper prefix of pattern[:i] that is also its suffix.',
      ask: 'Why is it needed to build the automaton?',
      options: [
        { text: 'On a mismatch it gives the longest match still alive, so no partial match is lost', right: true, why: 'For “aab”, after “aa” a third a keeps “aa” matched.' },
        { text: 'It counts the occurrences', why: 'It finds where to fall back; counting is the DP’s job.' },
        { text: 'It isn’t: restarting from 0 works', why: 'Restarting loses matches like bba inside bbba.' },
      ],
    },
  ],

  'aho-dp': [
    {
      know: 'One Aho–Corasick automaton tracks every pattern; forbidden nodes are never entered.',
      ask: 'Alphabet {a, b}, avoid “aa” and “bab”, length 4. How many strings?',
      args: ['ab', ['aa', 'bab'], 4], answer: 4,
      misconceptions: [
        { answer: 8, feedback: '8 avoids only aa. Strings like abab contain bab.' },
        { answer: 16, feedback: '16 is every string of length 4.' },
      ],
      explain: 'Of the 8 strings with no aa, four contain bab; abba, abbb, bbba and bbbb remain.',
    },
    {
      know: 'A node is forbidden if a pattern ends there or its failure node is forbidden.',
      ask: 'Why propagate “forbidden” through failure links?',
      options: [
        { text: 'A pattern can end as a suffix of a longer trie path, like “b” inside “ab”', right: true, why: 'The node for “ab” must be forbidden if “b” is a pattern.' },
        { text: 'To make the trie smaller', why: 'It doesn’t remove nodes; it marks more of them.' },
        { text: 'It isn’t necessary', why: 'Without it, some strings that contain a pattern would be counted.' },
      ],
    },
    {
      know: 'The trie has at most the total length of the patterns plus one nodes.',
      ask: 'How does the work grow with more patterns?',
      options: [
        { text: 'With the total pattern length: one automaton handles them all', right: true, why: 'Patterns sharing prefixes share nodes.' },
        { text: 'Exponentially in the number of patterns', why: 'That would be a product of separate automata; the trie avoids it.' },
        { text: 'Not at all', why: 'More patterns mean more trie nodes to update.' },
      ],
    },
  ],

  'automaton-product': [
    {
      know: 'The state pairs the pattern automaton with the remainder; “found” is absorbing.',
      ask: 'Pattern “3”, m = 3, length 2 (leading zeros allowed). How many qualify?',
      args: ['3', 3, 2], answer: 7,
      misconceptions: [
        { answer: 19, feedback: '19 counts every string containing a 3; they must also be divisible by 3.' },
        { answer: 4, feedback: 'Count them: 03, 30, 33, 36, 39, 63 and 93.' },
      ],
      explain: '03, 30, 33, 36, 39, 63 and 93.',
    },
    {
      know: 'Product automata combine independent conditions on the same input.',
      ask: 'Adding a third condition, “even number of 5s”, multiplies the states by what?',
      options: [
        { text: '2: the parity of the 5s', right: true, why: 'Each condition contributes its own number of states, and they multiply.' },
        { text: 'The length of the string', why: 'Only the parity matters, not the count.' },
        { text: 'Nothing: conditions share states', why: 'Each combination of conditions needs its own state.' },
      ],
    },
    {
      know: 'Many combinations in a product may never be reached.',
      ask: 'How can unreachable states be avoided?',
      options: [
        { text: 'Explore forward from the start and keep only the states actually reached', right: true, why: 'A map of reached states replaces the full table.' },
        { text: 'They can’t be', why: 'A forward search finds exactly the reachable ones.' },
        { text: 'Sort the states', why: 'Sorting doesn’t tell which states are reachable.' },
      ],
    },
  ],

  'ranking': [
    {
      know: 'Ranking first counts, for each automaton state and remaining length, the valid completions.',
      ask: 'Alphabet {a, b}, avoid “bb”, length 3. How many valid strings are there to rank?',
      oracle: 'kmp-dp', args: ['ab', 'bb', 3], answer: 5,
      misconceptions: [
        { answer: 8, feedback: '8 is every string; abb, bba and bbb contain bb.' },
      ],
      explain: 'aaa, aab, aba, baa, bab.',
    },
    {
      know: 'In dictionary order those five are aaa, aab, aba, baa, bab.',
      ask: 'Which is the 4th, and how does the ranking walk find it?',
      options: [
        { text: 'baa: the 3 strings starting with a are fewer than 4, so skip them (k becomes 1), take b, then the smallest completion, aa', right: true, why: 'Each letter’s completions are skipped while k exceeds them.' },
        { text: 'aba: count four strings from the start', why: 'aba is 3rd; the walk skips all three a-strings first.' },
        { text: 'bab: the last one', why: 'bab is the 5th and last of them.' },
      ],
    },
    {
      know: 'Counts of valid strings can exceed 2⁵³ for long lengths.',
      ask: 'How does a JavaScript solution keep the walk exact?',
      options: [
        { text: 'Cap every count at a value above any k asked, so comparisons with k stay correct', right: true, why: 'Only whether a count is at least k matters, not its exact size.' },
        { text: 'Nothing is needed', why: 'Doubles lose exactness past 2⁵³, which could misplace k.' },
        { text: 'Use the counts modulo a prime', why: 'Modular counts can’t be compared with k.' },
      ],
    },
  ],
}
