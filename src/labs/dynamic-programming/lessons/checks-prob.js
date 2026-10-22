// "Check yourself" for the probabilistic lessons (Specialist, probabilistic group). Format and checks:
// checks.js and checks.test.js. The numbers come from specialist-oracles.js, whose "p/q" answers
// checks.test.js reads as numbers; a learner types them as fractions such as 7/2 or as decimals.

export const PROB_CHECKS = {
  'probability-distribution': [
    {
      know: 'W(i, x) counts the outcomes of the first i dice that add up to x; the chance is W(n, t) over the sⁿ equally likely outcomes.',
      ask: 'Three fair 6-sided dice. What is the chance they add up to 10?',
      args: [3, 6, 10], answer: 1 / 8,
      misconceptions: [{ answer: 1 / 16, feedback: '1/16 treats the 16 sums 3 … 18 as equally likely. 27 of the 216 outcomes add up to 10.' }],
      explain: '27 of the 6³ = 216 outcomes add up to 10 (W(3, 10) = 27), and 27/216 = 1/8.',
    },
    {
      know: 'The table has a row for each number of dice and a column for each sum up to n · s; each cell adds up to s cells of the row before.',
      ask: 'About how much work does the table take for n dice with s faces?',
      options: [
        { text: 'About n · (n · s) · s steps', right: true, why: 'n rows of up to n · s sums, each adding up to s cells of the row before.' },
        { text: 'About sⁿ steps, one per outcome', why: 'That is listing the outcomes; the table merges all the outcomes with the same sum.' },
        { text: 'About n · s steps', why: 'Each row has about n · s sums, not one, and there are n rows.' },
      ],
    },
    {
      know: 'The code counts outcomes in whole numbers and divides by sⁿ once, at the end, instead of carrying chances.',
      ask: 'Why count outcomes rather than add up chances of 1/s?',
      options: [
        { text: 'The counts are whole numbers, so the result is exact with one division at the end', right: true, why: 'Chances as decimals round at every step; whole counts stay exact however large they get.' },
        { text: 'Adding chances would give a different answer, even computed exactly', why: 'Exact chances give the same answer: each count is just the chance times sⁱ. It is the rounding that counting avoids.' },
        { text: 'Counting needs fewer cells than chances', why: 'Both tables have the same cells; only what each cell holds differs.' },
      ],
    },
  ],

  'poisson-binomial': [
    {
      know: 'P(i, j) = P(i − 1, j)·(1 − q) + P(i − 1, j − 1)·q, with each trial’s own q.',
      ask: 'Trials succeed with chances 30%, 60% and 90%. What is the chance that exactly two succeed? A decimal or a fraction.',
      args: [[30, 60, 90], 2], answer: 63 / 125,
      misconceptions: [{ answer: 0.432, feedback: '0.432 is the binomial with the average chance 60% for every trial. With their own chances: 0.3·0.6·0.1 + 0.3·0.4·0.9 + 0.7·0.6·0.9 = 0.504.' }],
      explain: 'Which one fails: the third (0.3·0.6·0.1 = 0.018), the second (0.3·0.4·0.9 = 0.108) or the first (0.7·0.6·0.9 = 0.378). Together 0.504 = 63/125.',
    },
    {
      know: 'Each row of the table holds the chances of 0, 1, …, i successes, and they always add up to 1.',
      ask: 'Why do the chances in each row add up to 1?',
      options: [
        { text: 'Each cell’s mass is split between two cells by 1 − q and q, which add up to 1', right: true, why: 'Nothing is lost or created from one row to the next, so the total stays at the 1 it started with.' },
        { text: 'The code divides each row by its total', why: 'No row is ever divided; the masses add up to 1 because each trial splits them into parts that do.' },
        { text: 'Only when every trial has the same chance', why: 'Each trial splits by its own q and 1 − q, which add up to 1 whatever q is.' },
      ],
    },
    {
      know: 'The table keeps a whole distribution, one cell per possible number of successes, and updates it once per trial.',
      ask: 'About how much work does the table take for n trials?',
      options: [
        { text: 'About n² steps', right: true, why: 'n trials, each updating up to n + 1 counts with two terms.' },
        { text: 'About 2ⁿ steps', why: 'That is one step per outcome; the table merges all outcomes with the same count.' },
        { text: 'About n steps', why: 'Each trial updates every count, up to n + 1 of them, not just one.' },
      ],
    },
  ],

  'expected-time': [
    {
      know: 'E(d) = 1 + the average of E(max(0, d − f)) over the faces, with E(0) = 0.',
      ask: 'Faces 2 and 3, five squares to go. What is the expected number of rolls?',
      args: [[2, 3], 5], answer: 9 / 4,
      misconceptions: [{ answer: 2, feedback: '2 is 5 divided by the average face 2.5. A last roll that passes the end wastes part of itself: work E(1) … E(5).' }],
      explain: 'E(1) = E(2) = 1 (any roll finishes). E(3) = 1 + (E(1) + 0)/2 = 3/2, E(4) = 1 + (E(2) + E(1))/2 = 2, E(5) = 1 + (E(3) + E(2))/2 = 9/4.',
    },
    {
      know: 'Linearity of expectation: the expected rolls are one roll now plus the expected rolls from wherever it lands.',
      ask: 'Why is E(d) = 1 + avg E(next) right, even though the number of rolls is random?',
      options: [
        { text: 'The mean of a sum is the sum of the means, and the first roll’s face splits the future into known cases', right: true, why: 'Conditioning on the first face and averaging is the law of total expectation; no listing of sequences is needed.' },
        { text: 'Because every sequence of rolls has the same chance', why: 'Sequences of different lengths have different chances; the recurrence weights each face by 1/k instead.' },
        { text: 'Because the number of rolls is always the same', why: 'It is not: with faces 1 and 2 and two squares to go, it is 1 or 2.' },
      ],
    },
    {
      know: 'A cell for each distance 0 … n, each reading k earlier cells.',
      ask: 'About how much work does it take for n squares and k faces?',
      options: [
        { text: 'About n · k steps', right: true, why: 'n cells, each averaging k earlier ones.' },
        { text: 'About kⁿ steps', why: 'That is listing roll sequences; the table merges sequences that leave the same distance.' },
        { text: 'About n² steps', why: 'Each cell reads one cell per face, k of them, not all smaller distances.' },
      ],
    },
  ],

  'self-loops': [
    {
      know: 'Landing exactly: E(d) = (s + Σ E(d − f) over the faces that fit) / (faces that fit), with E(0) = 0.',
      ask: 'Four squares to go with a 2-sided die, landing exactly. What is the expected number of rolls?',
      args: [4, 2], answer: 7 / 2,
      misconceptions: [{ answer: 23 / 8, feedback: '23/8 lets a roll past the end finish the game. Here an overshoot is wasted: from one square away a 2 is rolled again.' }],
      explain: 'E(1) = (2 + 0)/1 = 2, E(2) = (2 + E(1) + E(0))/2 = 2, E(3) = (2 + E(2) + E(1))/2 = 3, E(4) = (2 + E(3) + E(2))/2 = 7/2.',
    },
    {
      know: 'A roll that is wasted leaves the token where it was, so E(d) appears on both sides of its equation.',
      ask: 'Why can E(d) be solved for, rather than recursing on itself forever?',
      options: [
        { text: 'The equation is linear in E(d), and moving its terms to one side leaves a non-zero factor', right: true, why: 'fits · E(d) = s + Σ E(d − f), and at least one face, 1, always fits, so the factor is at least 1.' },
        { text: 'Because wasted rolls are rare', why: 'They need not be: with a 6-sided die and one square to go, five rolls in six are wasted. The algebra is exact anyway.' },
        { text: 'Because the recursion is memoized', why: 'A memo returns a stored value, but E(d) is not stored until it is computed; calling itself would never end.' },
      ],
    },
    {
      know: 'One square from the end with a fair s-sided die, only the face 1 lands exactly.',
      ask: 'What is the expected number of rolls from one square away?',
      options: [
        { text: 's', right: true, why: 'Each roll succeeds with chance 1/s, so it takes s rolls on average: E = (s + 0) / 1.' },
        { text: '1', why: 'Only one face of s lands exactly; the rest are wasted rolls.' },
        { text: '(s + 1) / 2', why: 'That is the average face, not the number of rolls until a 1.' },
      ],
    },
  ],

  'cyclic-expectations': [
    {
      know: 'One equation per square: E(i) = 1 + Σ E(where face f lands) / s, and E(i) = E(to) on a jump square; E(n) = 0.',
      ask: 'Squares 0 to 5, a 2-sided die, landing exactly, and a ladder from 1 to 4. What is the expected number of turns?',
      args: [5, 2, [[1, 4]]], answer: 7 / 2,
      misconceptions: [{ answer: 17 / 4, feedback: '17/4 is the board without the ladder. Landing on 1 jumps to 4, saving turns.' }],
      explain: 'E(4) = 2 (only a 1 lands), E(1) = E(4) = 2, E(3) = 1 + (E(4) + 0)/2 = 2, E(2) = 1 + (E(3) + E(4))/2 = 3, E(0) = 1 + (E(1) + E(2))/2 = 7/2.',
    },
    {
      know: 'A snake can send the token to an earlier square, so the squares’ values depend on each other in a cycle.',
      ask: 'Why can’t the values be filled one at a time, as in expected time?',
      options: [
        { text: 'With a snake, E(i) can depend on an earlier square that depends on i, so no order has every value it reads ready', right: true, why: 'The dependencies form a cycle; only solving the equations together breaks it.' },
        { text: 'Because the board is too big', why: 'Even a 2-square board with one snake has the cycle; size is not the problem.' },
        { text: 'Because the die has more than one face', why: 'Expected time has many faces and still fills in order; it is the backward jumps that create the cycle.' },
      ],
    },
    {
      know: 'Gaussian elimination on n unknowns clears each column from every other row, one column at a time.',
      ask: 'About how much work does solving the system take for n squares?',
      options: [
        { text: 'About n³ steps', right: true, why: 'n columns, each cleared from up to n rows of n + 1 entries.' },
        { text: 'About n steps', why: 'That is filling a table in order, which the cycle rules out.' },
        { text: 'About 2ⁿ steps', why: 'Nothing is enumerated: the equations are solved directly, in polynomial time.' },
      ],
    },
  ],

  'coupon-collector': [
    {
      know: 'E(S) = (W + Σ w(i)·E(S ∪ {i}) over the missing i) / (W − w(S)), filled from the full set down to E(∅).',
      ask: 'Two types, the second three times as likely as the first (weights 1 and 3). What is the expected number of draws until both are seen?',
      args: [[1, 3]], answer: 13 / 3,
      misconceptions: [
        { answer: 3, feedback: '3 is the answer for equally likely types. The rare type, chance 1/4, makes the wait longer.' },
        { answer: 4, feedback: '4 is only the wait for the rare type. A quarter of the time the rare type comes first, and the common one still has to be drawn: 4/3 more, so 4 + 1/3.' },
      ],
      explain: 'W = 4. With the rare type held, E({0}) = 4/3, the wait for the common one; with the common one held, E({1}) = 4. E(∅) = (4 + 1·E({0}) + 3·E({1})) / 4 = (4 + 4/3 + 12) / 4 = 13/3.',
    },
    {
      know: 'The state is the set of types already collected, one bit per type.',
      ask: 'Why does the state need the set, not just how many types are collected?',
      options: [
        { text: 'With unequal chances, which types are missing decides how likely the next new one is', right: true, why: 'Missing only the rare type is a long wait; missing only a common one is short, though both have one type to go.' },
        { text: 'It doesn’t: the count is enough', why: 'With weights 1 and 3, one type to go means a wait of 4 or of 4/3, depending on which is missing.' },
        { text: 'Because types can be collected twice', why: 'Repeats are handled by the self-loop either way; the set is needed because the chances differ.' },
      ],
    },
    {
      know: 'One value per set of collected types, each summing over the missing types.',
      ask: 'About how much work does it take for n types?',
      options: [
        { text: 'About 2ⁿ · n steps', right: true, why: '2ⁿ sets, each looking at up to n missing types.' },
        { text: 'About n² steps', why: 'With equal chances the count of types is enough and the work is small; unequal chances need every set.' },
        { text: 'About n! steps, one per order of first sightings', why: 'The sets merge every order that collected the same types.' },
      ],
    },
  ],

  'moments': [
    {
      know: 'E(d) and S(d) = E[T²], with S(d) = 1 + 2·avg E(next) + avg S(next); the variance is S(n) − E(n)².',
      ask: 'Faces 1 and 3, four squares to go. What is the variance of the number of rolls?',
      args: [[1, 3], 4], answer: 31 / 64,
      misconceptions: [{ answer: 0, feedback: 'The number of rolls varies: 3 then 1 takes two rolls, 1 1 1 1 takes four.' }],
      explain: 'E: 1, 3/2, 7/4, 19/8 for d = 1 … 4; S: 1, 5/2, 15/4, 49/8. Variance 49/8 − (19/8)² = 392/64 − 361/64 = 31/64.',
    },
    {
      know: 'The variance of T is E[T²] − E[T]². Expectations average over the first roll; variances do not.',
      ask: 'Why keep E[T²] instead of the variance in each cell?',
      options: [
        { text: 'E[T²] averages over the first roll; a variance would lose the spread between the faces’ futures', right: true, why: 'Var is not linear: the variance of a mixture is the average variance plus the variance of the means.' },
        { text: 'The variance would give the same answer but is slower to compute', why: 'Averaging variances gives a wrong answer, not a slow one: faces 1 and 2 with two to go would give 0 instead of 1/4.' },
        { text: 'Because E[T²] is always smaller', why: 'E[T²] is never smaller than the variance; it is larger by E[T]².' },
      ],
    },
    {
      know: 'T = 1 + T′, where T′ is the rolls after the first, and (1 + T′)² = 1 + 2T′ + T′².',
      ask: 'Why does S(d) need the E table?',
      options: [
        { text: 'The cross term 2T′ averages to 2 · avg E(next)', right: true, why: 'Without the means of the futures, the middle term of (1 + T′)² can’t be averaged.' },
        { text: 'It doesn’t; S(d) = 1 + avg S(next)', why: 'That drops the cross term, and the variance can come out negative.' },
        { text: 'To divide S by E at the end', why: 'The variance subtracts E²; nothing is divided.' },
      ],
    },
  ],

  'conditional-dp': [
    {
      know: 'Keep the event’s chance and the heads mass for sequences ending in a tail and in a head; divide once at the end.',
      ask: 'Three fair flips, given that no two heads came up in a row. What is the expected number of heads?',
      args: [3, 50], answer: 1,
      misconceptions: [
        { answer: 3 / 2, feedback: '3/2 is the mean over all 8 sequences. Given the condition, 5 are left: TTT, TTH, THT, HTT, HTH.' },
        { answer: 5 / 8, feedback: '5/8 is the heads mass, not yet divided by the chance of the event, 5/8.' },
      ],
      explain: 'TTT, TTH, THT, HTT, HTH are left, each with chance 1/8, with 0, 1, 1, 1, 2 heads: (5/8) / (5/8) = 1.',
    },
    {
      know: 'A conditional mean is E[X · 1(event)] / P(event).',
      ask: 'Why divide only at the end, instead of keeping a conditional mean in each cell?',
      options: [
        { text: 'Masses from different paths add; conditional means don’t, unless each is weighted by its path’s chance', right: true, why: 'Keeping both masses and dividing once is exactly that weighting, done without a division at every step.' },
        { text: 'Dividing at each step gives the same answer but is slower', why: 'Dividing each cell by its own chance and then adding cells gives the wrong mean; the chances are lost.' },
        { text: 'Because the event’s chance is 1', why: 'It is less than 1 whenever HH is possible; that is why there is a division at all.' },
      ],
    },
    {
      know: 'The event is checked as the sequences grow: a head is only added after a tail.',
      ask: 'What would happen if the code allowed every sequence and removed those with HH at the end?',
      options: [
        { text: 'It couldn’t: once merged into the four values, sequences with and without HH can’t be told apart', right: true, why: 'The DP keeps only the last flip, not the whole history, so the condition has to be enforced as it goes.' },
        { text: 'It would give the same answer', why: 'The merged values don’t record whether a sequence contained HH, so it can’t be removed later.' },
        { text: 'It would give the unconditional mean, n · p', why: 'Nothing could be removed at all, but the question is whether it could be done; the merged values make it impossible.' },
      ],
    },
  ],

  'stochastic-control': [
    {
      know: 'V(i) = min(a(i) + V(i + 1), 100·b(i)/p(i) + V(i + 2)), with V(n) = V(n + 1) = 0.',
      ask: 'Two stages, safe costs 5 each; a risky try costs 3 and works with chance 40%. What is the least expected cost?',
      args: [[5, 5], [3, 3], [40, 40]], answer: 15 / 2,
      misconceptions: [
        { answer: 10, feedback: '10 is safe twice. From stage 0 the risky way finishes both stages for an expected 3 · 100/40 = 7.5.' },
        { answer: 1.2, feedback: '1.2 multiplies the cost by the chance. A try that works 40% of the time takes 2.5 tries on average: 7.5.' },
      ],
      explain: 'V(1) = min(5, 7.5) = 5. V(0) = min(5 + V(1), 7.5 + V(2)) = min(10, 7.5) = 7.5 = 15/2.',
    },
    {
      know: 'A risky try that fails leaves the job at the same stage, with the same choice to make.',
      ask: 'Why is it enough to compare “safe” with “risky until it works”?',
      options: [
        { text: 'After a failure the state is the same, so the best choice is the same as before', right: true, why: 'If risky was best at stage i, it is still best after failing there; switching later is never better.' },
        { text: 'Because the risky way always works eventually', why: 'It does (p > 0), but that is why its cost is finite, not why mixing the two is never better.' },
        { text: 'Because the safe way is always cheaper', why: 'It isn’t: with stages 5 and 5, risky 3 at 40% costs 7.5 against 10.' },
      ],
    },
    {
      know: 'The expected number of tries until the first success, with chance p per try, is 1/p.',
      ask: 'A try works with chance 20%. How many tries does it take on average?',
      options: [
        { text: '5', right: true, why: 'V = 1 + 0.8·V gives V = 5: one try, and four times in five it starts over.' },
        { text: '0.2', why: 'That is the chance of one try working, not the number of tries.' },
        { text: '4', why: '4 counts the failures before the success; the successful try counts too.' },
      ],
    },
  ],
}
