// "Check yourself" for the string lessons (Structured, strings group). Format and checks: checks.js and
// checks.test.js. The numbers are checked against the search oracles in structured-oracles.js; each was
// printed there before it was typed. The Damerau check uses strings where the restricted distance the
// lesson teaches and the oracle's unrestricted one agree.

export const STRING_CHECKS = {
  lcs: [
    {
      know: 'L(i, j) is the LCS of the first i letters of a and the first j of b: 1 + L(i − 1, j − 1) when the last letters match, else the larger of dropping one of them.',
      ask: 'a = "xaybzc", b = "abcxyz". How long is the longest common subsequence?',
      args: ['xaybzc', 'abcxyz'], answer: 3,
      misconceptions: [
        { answer: 6, feedback: 'Every letter is in both strings, but not in the same order. In b, x y z all come after c.' },
        { answer: 1, feedback: '1 is the longest common run of neighbouring letters. A subsequence may skip letters: a b c is in both.' },
      ],
      explain: '"abc" or "xyz", among others. Nothing of length 4 is in both in order.',
    },
    {
      know: 'The table has (|a| + 1) × (|b| + 1) cells, each filled in constant time.',
      ask: 'For two strings of 10,000 letters, what is the problem with the full table?',
      options: [
        { text: 'Its time is exponential', why: 'It is 10⁸ cells, each a constant-time step: seconds, not years.' },
        { text: 'Its memory: 10⁸ cells, when the length alone needs only two rows', right: true, why: 'Each row reads only the row above. Recovering the subsequence itself in small memory needs Hirschberg’s divide-and-conquer.' },
        { text: 'It gives the wrong answer for long strings', why: 'The recurrence is exact at every size.' },
      ],
    },
    {
      know: 'When the last letters differ, L(i, j) = max(L(i − 1, j), L(i, j − 1)).',
      ask: 'Why is L(i − 1, j − 1) not needed in that case?',
      options: [
        { text: 'It is never larger than either of the other two', right: true, why: 'Dropping a letter from only one string leaves at least as much to match, so L(i − 1, j − 1) ≤ both.' },
        { text: 'Because it was already counted', why: 'Nothing is counted twice in a maximum. It is left out because it can’t win.' },
        { text: 'It is needed: leaving it out gives wrong answers', why: 'Both other options contain everything it could match, so the maximum is the same.' },
      ],
    },
  ],

  'lcs-reconstruct': [
    {
      know: 'Walking back from the corner, a tie between the cell above and the cell to the left branches into both; the strings found are collected in a set.',
      ask: 'a = "abcd", b = "badc". How many different strings are longest common subsequences?',
      args: ['abcd', 'badc'], answer: 4,
      misconceptions: [
        { answer: 1, feedback: 'A single walk back finds one, but every tie can lead to another. Here there are four.' },
        { answer: 2, feedback: 'Check every pair: ac, ad, bc and bd are all in both strings, in order.' },
      ],
      explain: 'The LCS length is 2, and "ac", "ad", "bc" and "bd" all reach it.',
    },
    {
      know: 'Two different walks back can spell the same string from different positions.',
      ask: 'Why collect the strings in a set rather than counting walks?',
      options: [
        { text: 'Walks are counted by position, so one string can be counted many times', right: true, why: 'With a = "aa" and b = "a", the b can be matched with either a: two choices of positions, one string, "a". The question counts strings.' },
        { text: 'Sets are faster', why: 'Sets are used for correctness: they remove repeated strings.' },
        { text: 'The walks never repeat a string', why: 'They can: "aa" and "a" give two ways to pick "a".' },
      ],
    },
    {
      know: 'Each tie in the table can double the number of strings.',
      ask: 'How many longest common subsequences can there be?',
      options: [
        { text: 'At most the LCS length', why: 'The check above has 4 strings of length 2.' },
        { text: 'At most |a| · |b|, one per cell', why: 'The strings aren’t tied to cells; ties multiply. There can be exponentially many.' },
        { text: 'Exponentially many in the length of the strings', right: true, why: '"abxab" against "baxba" has 6, and "abxabyab" against "baxbayba" has 18: each new block triples the count. Listing them all can’t be fast, even though the length is.' },
      ],
    },
  ],

  'common-substring': [
    {
      know: 'S(i, j) is the longest common run ending at a[i − 1] and b[j − 1]: 1 + S(i − 1, j − 1) when they match, 0 when they don’t. The answer is the largest cell.',
      ask: 'a = "abxcd", b = "abycd". How long is the longest common substring?',
      args: ['abxcd', 'abycd'], answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 is the longest common subsequence, a b c d, which skips the x and the y. A substring may not skip.' },
      ],
      explain: '"ab" and "cd" are both common and length 2; the x and y break any longer run.',
    },
    {
      know: 'Here a mismatch sets the cell to 0; in LCS it takes the larger neighbour.',
      ask: 'Why does a mismatch give 0?',
      options: [
        { text: 'A run of neighbouring letters ends at the first mismatch, so nothing carries over', right: true, why: 'The cell counts runs that end exactly here. A mismatch here means no common run ends here.' },
        { text: 'To save memory', why: 'It is what the question means: substrings can’t skip a letter.' },
        { text: 'So the answer is in the bottom-right corner', why: 'The answer is the largest cell anywhere, because the best run can end at any pair of positions.' },
      ],
    },
    {
      know: 'Each cell reads only the cell up and to the left.',
      ask: 'Where is the answer?',
      options: [
        { text: 'The bottom-right cell', why: 'That is the run ending at both last letters, which may be 0. In the check above the last letters match, but in "abx" against "aby" they don’t.' },
        { text: 'The largest cell in the table', right: true, why: 'Every common substring ends at some pair of positions, so the best is the largest cell. Keep a running maximum while filling.' },
        { text: 'The sum of the diagonal', why: 'The diagonal adds runs that aren’t joined to each other.' },
      ],
    },
  ],

  'edit-distance': [
    {
      know: 'E(i, j) turns the first i letters of a into the first j of b: free if the last letters match, else 1 + the smallest of insert, delete and substitute.',
      ask: 'a = "abcd", b = "bcda". What is the edit distance?',
      args: ['abcd', 'bcda'], answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 compares position by position, and every position differs. Deleting the first a and adding one at the end keeps b c d lined up.' },
        { answer: 1, feedback: 'No single edit moves a letter from the front to the back.' },
      ],
      explain: 'Delete the a at the front, insert an a at the end: 2.',
    },
    {
      know: 'Removing a letter from one string is a deletion; adding it to the other is an insertion.',
      ask: 'Is the edit distance from a to b the same as from b to a?',
      options: [
        { text: 'No: deletions and insertions cost differently', why: 'Here every edit costs 1, and each edit from a to b reverses to one from b to a.' },
        { text: 'Yes: reverse the edits, swapping inserts and deletes', right: true, why: 'Every sequence of edits one way has a mirror the other way with the same count. With unequal costs, it can differ.' },
        { text: 'Only if the strings have the same length', why: 'Lengths don’t matter: abcd to bcda is 2 both ways, and so is any pair.' },
      ],
    },
    {
      know: 'The edit distance between a and b is never less than the difference in their lengths.',
      ask: 'What is a quick upper bound?',
      options: [
        { text: 'The longer string’s length', right: true, why: 'Substitute every position of the shorter string, then insert or delete the rest.' },
        { text: 'The difference in lengths', why: 'That is the lower bound; "ab" to "ba" has difference 0 and distance 2.' },
        { text: 'The sum of the two lengths', why: 'Deleting all of a and inserting all of b gives that, but substituting does better.' },
      ],
    },
  ],

  'weighted-edit': [
    {
      know: 'The same table as edit distance, with each move adding its own cost: insert, delete or substitute.',
      ask: 'a = "abc", b = "adc", insert 1, delete 1, substitute 3. What is the cheapest cost?',
      args: ['abc', 'adc', 1, 1, 3], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 substitutes the b with d. Deleting the b and inserting a d is cheaper, 1 + 1.' },
        { answer: 1, feedback: '1 would be one edit, but turning b into d needs either a substitution (3) or a delete and an insert (2).' },
      ],
      explain: 'Delete b (1), insert d (1): 2.',
    },
    {
      know: 'A substitution changes one letter; a delete followed by an insert does the same.',
      ask: 'When is a substitution never used in the best answer?',
      options: [
        { text: 'When it costs more than an insert plus a delete', right: true, why: 'Then a delete and an insert always do the same job for less, as in the check above.' },
        { text: 'When it costs more than an insert', why: 'One insert alone can’t change a letter; compare with insert plus delete.' },
        { text: 'Never: substitutions are always used for mismatches', why: 'When they cost too much, the table finds the cheaper pair of moves.' },
      ],
    },
    {
      know: 'With unequal costs, an edit and its reverse may cost different amounts.',
      ask: 'Is the distance from a to b still the same as from b to a?',
      options: [
        { text: 'Yes, always', why: 'Reversing turns each insertion into a deletion. If they cost different amounts, the totals differ.' },
        { text: 'Not necessarily: it is the same when insert and delete cost the same', right: true, why: 'Reversing swaps inserts and deletes, so swapping their costs gives the reverse distance.' },
        { text: 'Never', why: 'With equal insert and delete costs it is symmetric.' },
      ],
    },
  ],

  damerau: [
    {
      know: 'The edit-distance table, plus one more option when the last two letters are swapped: 1 + E(i − 2, j − 2).',
      ask: 'a = "abcd", b = "acbd". What is the distance with swaps allowed?',
      args: ['abcd', 'acbd'], answer: 1,
      misconceptions: [
        { answer: 2, feedback: '2 is the plain edit distance: two substitutions. With swaps, one swap of b and c does it.' },
      ],
      explain: 'Swap the neighbouring b and c: 1.',
    },
    {
      know: 'The lesson’s table (the restricted version) never edits a swapped pair again.',
      ask: 'Why can the restricted version give more than the true minimum?',
      options: [
        { text: 'Some best answers swap two letters and then insert between them', right: true, why: '"ca" to "abc": swap to "ac" and insert b between: 2. The restricted table can’t edit the swapped pair, so it gives 3.' },
        { text: 'It counts swaps as 2', why: 'A swap costs 1 in both versions.' },
        { text: 'It can’t: the two always agree', why: '"ca" to "abc" is 3 restricted and 2 unrestricted.' },
      ],
    },
    {
      know: 'Many typing mistakes swap two neighbouring keys.',
      ask: 'Why add the swap to spelling correctors?',
      options: [
        { text: 'A swapped pair counts 1 instead of 2, so “teh” is as close to “the” as a single typo', right: true, why: 'Plain edit distance ranks a swap with two unrelated errors, which suggests the wrong words.' },
        { text: 'It makes the table smaller', why: 'It adds one more option per cell; the table is the same size.' },
        { text: 'It makes the distance symmetric', why: 'Plain edit distance is already symmetric.' },
      ],
    },
  ],

  'shortest-supersequence': [
    {
      know: 'The shortest string containing both a and b as subsequences shares their LCS once: |a| + |b| − LCS(a, b).',
      ask: 'a = "abc", b = "bcd". How long is the shortest common supersequence?',
      args: ['abc', 'bcd'], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 is a and b written one after the other. The shared "bc" can be written once: "abcd".' },
        { answer: 2, feedback: '2 is the LCS. The supersequence must contain all of both strings.' },
      ],
      explain: '"abcd" contains both: 3 + 3 − 2 = 4, with the shared "bc" written once.',
    },
    {
      know: 'Every letter of a and of b appears in the supersequence; the shared letters can be written once.',
      ask: 'Why does the shortest supersequence use the LCS?',
      options: [
        { text: 'Each letter written once for both strings saves one, and at most LCS letters can be shared in order', right: true, why: 'The shared letters form a common subsequence, so the most that can be saved is its longest length.' },
        { text: 'Because the LCS is the answer', why: 'The LCS is part of it; the letters that aren’t shared are added around it.' },
        { text: 'It doesn’t; it uses the longest common substring', why: 'Shared letters needn’t be neighbours, so it is the subsequence that counts.' },
      ],
    },
    {
      know: 'The same table can be filled directly: a match costs 1 and moves diagonally, otherwise take 1 + the smaller neighbour.',
      ask: 'What do the first row and column hold?',
      options: [
        { text: 'All zeros', why: 'Against an empty string, the supersequence is the other string itself, so its length.' },
        { text: 'The lengths of the prefixes: row 0 holds j, column 0 holds i', right: true, why: 'The shortest string containing a prefix and the empty string is the prefix.' },
        { text: 'Infinity, except the corner', why: 'Every cell has an answer: there is always a supersequence.' },
      ],
    },
  ],

  'distinct-subsequences': [
    {
      know: 'N(i, j) counts the ways to spell the first j letters of t from the first i of s: always N(i − 1, j), plus N(i − 1, j − 1) when s[i − 1] = t[j − 1].',
      ask: 's = "aabb", t = "ab". In how many ways can t be picked out of s?',
      args: ['aabb', 'ab'], answer: 4,
      misconceptions: [
        { answer: 1, feedback: 'Different positions count as different ways. Either a can go with either b.' },
        { answer: 2, feedback: '2 counts the choices for one letter only. Each of the 2 a’s goes with each of the 2 b’s: 2 × 2.' },
      ],
      explain: 'Two choices of a, each followed by two choices of b: 4.',
    },
    {
      know: 'N(i, 0) is the number of ways to spell the empty target.',
      ask: 'What is N(i, 0)?',
      options: [
        { text: '1, for every i', right: true, why: 'Picking nothing spells the empty string, in exactly one way.' },
        { text: '0, since nothing is picked', why: 'Picking nothing is a way, the only one; without it no count could start.' },
        { text: 'i, one way per letter', why: 'Skipping all letters is a single choice, not one per letter.' },
      ],
    },
    {
      know: 'The counts can be very large: s = 30 copies of "a" and t = 15 copies of "a" gives C(30, 15).',
      ask: 'What should an implementation watch for?',
      options: [
        { text: 'Overflow: the counts grow like binomial coefficients', right: true, why: 'C(30, 15) is over 150 million, and longer strings pass 64 bits. Use big numbers or count modulo a prime.' },
        { text: 'Negative counts', why: 'Counts only add, so they never go negative.' },
        { text: 'Nothing: counts stay below the length of s', why: 'They grow much faster: 4 ways from 4 letters above, and C(30, 15) from 30.' },
      ],
    },
  ],

  'unique-subsequences': [
    {
      know: 'Appending a letter doubles the distinct subsequences, minus the ones already made by that letter’s previous appearance.',
      ask: 's = "aab". How many different subsequences does it have, the empty one included?',
      args: ['aab'], answer: 6,
      misconceptions: [
        { answer: 8, feedback: '8 is 2³, every choice of positions. The two a’s give "a" twice and "ab" twice.' },
        { answer: 5, feedback: 'Count the empty string too: "", a, b, aa, ab, aab.' },
      ],
      explain: '"", a, b, aa, ab, aab: 6.',
    },
    {
      know: 'D(i) = 2 · D(i − 1) − D(p − 1), where p is the previous position of the same letter.',
      ask: 'What does the subtracted D(p − 1) remove?',
      options: [
        { text: 'The subsequences that end in this letter and were already made at its last appearance', right: true, why: 'Appending the letter to everything before p made them once already; doubling makes them again.' },
        { text: 'The empty subsequence', why: 'The empty one is counted once in D(0) and kept.' },
        { text: 'Every subsequence containing the letter', why: 'Only the repeats are removed; new ones that use the letter in a new way stay.' },
      ],
    },
    {
      know: 'Without repeated letters, every choice of positions gives a different string.',
      ask: 'How many distinct subsequences does a string of n different letters have?',
      options: [
        { text: 'n', why: 'That counts only single letters.' },
        { text: 'n²', why: 'Each letter is in or out: the choices multiply.' },
        { text: '2ⁿ, the empty one included', right: true, why: 'With no repeated letter there is nothing to subtract, so each step doubles.' },
      ],
    },
  ],

  interleaving: [
    {
      know: 'I(i, j) says whether the first i letters of a and the first j of b can form the first i + j letters of c.',
      ask: 'a = "ab", b = "ba", c = "abab". Is c an interleaving of a and b?',
      kind: 'yesno', args: ['ab', 'ba', 'abab'], answer: true,
      misconceptions: [
        { answer: false, feedback: 'Taking a’s letters first leaves "ab", not "ba", but other choices work: a from a, then b and a from b, then b from a.' },
      ],
      explain: 'Take a’s "a", then b’s "b" and "a", then a’s "b": a b a b.',
    },
    {
      know: 'When the next letter of c matches the next letter of both a and b, either could supply it.',
      ask: 'Why doesn’t a greedy choice work?',
      options: [
        { text: 'Choosing wrongly at a shared letter can get stuck later, and both choices must be kept open', right: true, why: 'In the check above, taking all of a first fails, and only the table tries both branches without repeating work.' },
        { text: 'It does: always take from a first', why: 'In the check above that leaves "ab" where b = "ba" is needed.' },
        { text: 'It does: take from whichever string is longer', why: 'Lengths say nothing about which letter is needed next.' },
      ],
    },
    {
      know: 'The table has (|a| + 1) × (|b| + 1) cells.',
      ask: 'What should be checked before filling it?',
      options: [
        { text: 'That |c| = |a| + |b|', right: true, why: 'Otherwise the answer is no at once: an interleaving uses every letter exactly once.' },
        { text: 'That a and b have no letters in common', why: 'Shared letters are the hard case, not a reason to stop.' },
        { text: 'That c is sorted', why: 'Nothing about the problem involves sorting.' },
      ],
    },
  ],

  wildcard: [
    {
      know: 'M(i, j) says whether the first j pattern characters match the first i letters; a * either matches nothing (M(i, j − 1)) or one more letter (M(i − 1, j)).',
      ask: 's = "abcb", pattern "a*b". Does the pattern match the whole string?',
      kind: 'yesno', args: ['abcb', 'a*b'], answer: true,
      misconceptions: [
        { answer: false, feedback: 'A * that stops at the first b leaves "cb" unmatched, but * may run on: it takes "bc", and the pattern’s b matches the last letter.' },
      ],
      explain: 'a matches a, * matches "bc", b matches the last b.',
    },
    {
      know: 'Several * in a row match the same strings as one *.',
      ask: 'What is a safe simplification before filling the table?',
      options: [
        { text: 'Collapse runs of * into one', right: true, why: 'Two stars together can split a run of letters between them in many ways, but match exactly what one star matches.' },
        { text: 'Remove every *', why: 'Then "a*b" would no longer match "abcb".' },
        { text: 'Replace every * with ?', why: '? matches exactly one letter; * may match none or many.' },
      ],
    },
    {
      know: 'M(0, j) says whether the first j pattern characters match the empty string.',
      ask: 'When is M(0, j) true?',
      options: [
        { text: 'Only for j = 0', why: 'A pattern of stars, such as "**", also matches the empty string.' },
        { text: 'When the first j pattern characters are all *', right: true, why: 'Only a * can match nothing; any letter or ? needs a letter to match.' },
        { text: 'When the pattern ends with *', why: '"a*" ends with * but needs an a.' },
      ],
    },
  ],

  regex: [
    {
      know: 'x* matches zero or more x: M(i, j) is either M(i, j − 2) (zero copies) or, if x matches s[i − 1], M(i − 1, j) (one more copy).',
      ask: 's = "" (the empty string), pattern "a*b*". Does it match?',
      kind: 'yesno', args: ['', 'a*b*'], answer: true,
      misconceptions: [
        { answer: false, feedback: 'x* may be zero copies, so a*b* can match nothing at all.' },
      ],
      explain: 'Zero a’s and zero b’s: M(0, 2) = M(0, 0) = true, and M(0, 4) = M(0, 2) = true.',
    },
    {
      know: 'Here * belongs to the character before it; in the wildcard lesson, * stood alone.',
      ask: 'Why does the zero-copies case read M(i, j − 2) and not M(i, j − 1)?',
      options: [
        { text: 'Zero copies of x drops both the x and the *', right: true, why: 'x* is one unit of two characters, so skipping it skips both.' },
        { text: 'Because the pattern is read two characters at a time', why: 'Only x* pairs are skipped together; other characters are read one at a time.' },
        { text: 'It is a mistake; it should be M(i, j − 1)', why: 'That would leave the x unmatched in the pattern, as if a* meant “a, then anything”.' },
      ],
    },
    {
      know: '. matches any one letter, and .* matches any run of letters.',
      ask: 's = "ab", pattern ".*c". Does it match?',
      options: [
        { text: 'Yes: .* matches anything', why: '.* can match "ab", but the c still has to match a letter, and none is left.' },
        { text: 'No: whatever .* takes, a c must follow, and s has no c', right: true, why: 'The whole string must be matched; the pattern ends with a c that s doesn’t have.' },
        { text: 'Only if c is optional', why: 'Without a * after it, c must appear exactly once.' },
      ],
    },
  ],

  'palindrome-subsequence': [
    {
      know: 'P(i, j) is the longest palindromic subsequence of s[i..j]: 2 + P(i + 1, j − 1) when the end letters match, else the larger of dropping one end.',
      ask: 's = "character". How long is the longest palindromic subsequence?',
      args: ['character'], answer: 5,
      misconceptions: [
        { answer: 3, feedback: '3 is the longest palindromic substring, "ara". A subsequence can skip letters: "carac".' },
      ],
      explain: '"carac": c, a, r, a, c, skipping the h, the t, the e and the final r.',
    },
    {
      know: 'Every palindromic subsequence of s is also a subsequence of s reversed.',
      ask: 'Which earlier table also gives the answer?',
      options: [
        { text: 'LCS of s and s reversed', right: true, why: 'A longest common subsequence of s and its reverse has a palindromic one of the same length.' },
        { text: 'Longest common substring of s and s reversed', why: 'Substrings can’t skip letters; that finds palindromic substrings at best.' },
        { text: 'Edit distance between s and s reversed', why: 'That counts edits, not a length of a palindrome.' },
      ],
    },
    {
      know: 'The table is filled by interval length, shortest first.',
      ask: 'Why fill by interval length, shortest first?',
      options: [
        { text: 'P(i, j) reads only shorter intervals inside it', right: true, why: 'All three options shrink the interval, so every shorter length must be done first.' },
        { text: 'Because short palindromes are more common', why: 'Frequency doesn’t matter; the order of dependencies does.' },
        { text: 'Any order works', why: 'Row by row from the top would read cells below that aren’t filled yet.' },
      ],
    },
  ],

  'palindrome-substring': [
    {
      know: 'P(i, j) is true when s[i] = s[j] and the inside s[i + 1..j − 1] is a palindrome; every true cell is one palindromic substring.',
      ask: 's = "aaa". How many substrings (by position) are palindromes?',
      args: ['aaa'], answer: 6,
      misconceptions: [
        { answer: 3, feedback: '3 counts different strings: a, aa, aaa. By position, "a" appears three times and "aa" twice.' },
      ],
      explain: 'Three a’s, two aa’s and one aaa: 6, every substring.',
    },
    {
      know: 'Every palindrome has a centre: a letter, or the gap between two letters.',
      ask: 'How else can they be counted without a table?',
      options: [
        { text: 'Expand around each of the 2n − 1 centres while the ends match', right: true, why: 'Same n² time in the worst case, but no table: constant memory.' },
        { text: 'Compare s with its reverse', why: 'That only tells whether the whole string is a palindrome.' },
        { text: 'Count each letter’s appearances', why: 'Letters alone don’t say which substrings read the same backwards.' },
      ],
    },
    {
      know: 'Manacher’s algorithm reuses palindromes already found around earlier centres.',
      ask: 'What does it achieve?',
      options: [
        { text: 'All palindromic substrings counted in linear time', right: true, why: 'Mirrored centres start from what is known, so the total expansion is O(n).' },
        { text: 'The longest palindromic subsequence in linear time', why: 'It works on substrings, not subsequences.' },
        { text: 'Fewer palindromes counted', why: 'It counts the same palindromes, faster.' },
      ],
    },
  ],

  'palindrome-cuts': [
    {
      know: 'C(i) is the fewest cuts for the first i letters: the smallest C(j) + 1 over j where s[j..i − 1] is a palindrome, with C(0) = −1.',
      ask: 's = "aabba". What is the fewest cuts so every piece is a palindrome?',
      args: ['aabba'], answer: 1,
      misconceptions: [
        { answer: 2, feedback: '2 is greedy: the longest palindrome from the front, "aa", then "bb", then "a". Cutting after the first a leaves "abba", one piece.' },
      ],
      explain: '"a" | "abba": 1 cut, since the whole string is not a palindrome.',
    },
    {
      know: 'C(0) = −1 is a convention so that a whole palindrome costs 0 cuts.',
      ask: 'Why start from C(0) = −1?',
      options: [
        { text: 'C(n) = C(0) + 1 = 0 when the whole string is one palindrome', right: true, why: 'Each piece adds one to the count; n pieces need n − 1 cuts, so the count starts at −1.' },
        { text: 'It marks the empty string as impossible', why: 'Impossible would be +∞. The empty prefix is fine; it just needs no cuts before the first piece.' },
        { text: 'It is an index, not a count', why: 'C(0) is a count of cuts, shifted so pieces minus one comes out right.' },
      ],
    },
    {
      know: 'Each step asks whether s[j..i − 1] is a palindrome.',
      ask: 'How can that question be answered in constant time?',
      options: [
        { text: 'Precompute the palindrome table from the previous lesson', right: true, why: 'Its n² true/false cells answer each question at once, so the whole method is n².' },
        { text: 'Compare the first and last letters only', why: '"abca" has matching ends but isn’t a palindrome.' },
        { text: 'It can’t; each check costs the length of the piece', why: 'Without the table it does, making the method n³. The table is the fix.' },
      ],
    },
  ],

  'palindrome-count': [
    {
      know: 'N(i, j) counts the palindromic subsequences inside s[i..j] by position: N(i + 1, j) + N(i, j − 1) − N(i + 1, j − 1), plus N(i + 1, j − 1) + 1 more when the ends match.',
      ask: 's = "aab". How many nonempty palindromic subsequences are there, by position?',
      args: ['aab'], answer: 4,
      misconceptions: [
        { answer: 3, feedback: '3 counts different strings: a, b, aa. By position the two single a’s are different.' },
        { answer: 7, feedback: '7 is every nonempty subsequence. "ab" and "aab" don’t read the same backwards.' },
      ],
      explain: 'a (first), a (second), b and aa: 4.',
    },
    {
      know: 'N(i + 1, j) and N(i, j − 1) both count the subsequences inside s[i + 1..j − 1].',
      ask: 'Why subtract N(i + 1, j − 1)?',
      options: [
        { text: 'Inclusion–exclusion: the middle is counted in both halves', right: true, why: 'Adding the two overlapping ranges counts the shared middle twice, so it is taken away once.' },
        { text: 'To remove the empty subsequence', why: 'The empty one is handled by the + 1 for matching ends.' },
        { text: 'To remove palindromes that use both ends', why: 'Those are added, not removed, when the ends match.' },
      ],
    },
    {
      know: 'When s[i] = s[j], each palindrome inside can be wrapped by the two end letters.',
      ask: 'What does the extra N(i + 1, j − 1) + 1 count?',
      options: [
        { text: 'Every inner palindrome wrapped in the two ends, plus the pair of ends alone', right: true, why: 'Wrapping keeps a palindrome; the + 1 is the two-letter palindrome s[i] s[j].' },
        { text: 'The two end letters as single palindromes', why: 'Those are already counted inside N(i + 1, j) and N(i, j − 1).' },
        { text: 'Nothing new; it corrects an overcount', why: 'It adds palindromes that use both ends, which no smaller range counts.' },
      ],
    },
  ],

  'affine-gap': [
    {
      know: 'A run of g gaps costs open + extend · (g − 1). Three tables track whether the alignment ends in a match column or a gap in either string.',
      ask: 'a = "abcd", b = "ad", mismatch 9, open 3, extend 1. What is the lowest cost?',
      args: ['abcd', 'ad', 9, 3, 1], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 opens two separate gaps, one for b and one for c. A single run of 2 costs 3 + 1.' },
        { answer: 2, feedback: '2 charges only the extension. The first gap of a run costs the opening price, 3.' },
      ],
      explain: 'Match a, a gap run of 2 under "bc" (3 + 1), match d: 4.',
    },
    {
      know: 'With one table, a cell knows the best cost but not whether the alignment ended in a gap.',
      ask: 'Why are three tables needed?',
      options: [
        { text: 'The next gap costs open or extend depending on whether the previous column was a gap', right: true, why: 'Two alignments with the same cost but different last columns have different futures, so they need separate states.' },
        { text: 'To store the three edit operations', why: 'The states are “ends in a match”, “ends in a gap in a” and “ends in a gap in b”, not operations.' },
        { text: 'One table is enough with a larger gap cost', why: 'A fixed per-gap cost can’t tell opening from extending.' },
      ],
    },
    {
      know: 'Biology often prefers one long gap to many short ones: an insertion of several letters is a single event.',
      ask: 'What do open and extend usually look like?',
      options: [
        { text: 'open much larger than extend', right: true, why: 'Then one long run is cheaper than several short ones with the same total length.' },
        { text: 'open = extend', why: 'That is the plain linear gap cost, with no preference for joining gaps.' },
        { text: 'open smaller than extend', why: 'That would favour many short gaps, the opposite of the aim.' },
      ],
    },
  ],

  'local-alignment': [
    {
      know: 'H(i, j) is the best score of an alignment ending at a[i − 1], b[j − 1], or 0 to start fresh; the answer is the largest cell.',
      ask: 'a = "abcx", b = "zabc", match +2, mismatch −1, gap −1. What is the best local score?',
      args: ['abcx', 'zabc', 2, 1, 1], answer: 6,
      misconceptions: [
        { answer: 4, feedback: '4 scores the whole strings (global alignment), paying for the z and the x. Local alignment keeps just "abc".' },
      ],
      explain: '"abc" against "abc": 3 matches, 6.',
    },
    {
      know: 'Global alignment (Needleman–Wunsch) must use every letter; local alignment (Smith–Waterman) may start and stop anywhere.',
      ask: 'What does the 0 in the recurrence do?',
      options: [
        { text: 'It lets an alignment start fresh at any cell instead of carrying a negative score', right: true, why: 'A poor stretch before the good part is dropped rather than paid for.' },
        { text: 'It marks a mismatch', why: 'Mismatches subtract x; the 0 is a fresh start.' },
        { text: 'It stops the scores growing too large', why: 'It bounds them from below, not above.' },
      ],
    },
    {
      know: 'The best local alignment can end anywhere in either string.',
      ask: 'Where is its score read?',
      options: [
        { text: 'The bottom-right cell', why: 'That cell is an alignment ending at both last letters, and the best piece may end earlier.' },
        { text: 'The largest cell in the table', right: true, why: 'Walking back from it until a 0 gives the aligned pieces.' },
        { text: 'The last row', why: 'The best piece may end before the end of a as well as b.' },
      ],
    },
  ],
}
