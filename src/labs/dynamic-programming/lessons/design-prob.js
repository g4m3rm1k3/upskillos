// "Design it yourself" for the probabilistic lessons (Specialist, probabilistic group). Format: designs.js.
// Answers are chances and expectations, typed as fractions such as 3/2 or as decimals; the oracles return
// "p/q" strings, which designs.test.js turns into numbers (PICK). Lessons with a live table ask for one of
// its cells; cyclic-expectations (no table) asks a second hand-solved board. Every number was printed by
// specialist-oracles.js or the trace before it was typed.

export const PROB_DESIGNS = {
  'probability-distribution': {
    problem: 'Find the chance that n fair dice with faces 1 to s add up to exactly t, exactly, for up to 50 dice, where the 6⁵⁰ outcomes can’t be listed.',
    tryFirst: {
      prompt: 'Two fair 6-sided dice. What is the chance they add up to 7? Type a fraction such as 1/4.',
      args: [2, 6, 7], answer: 1 / 6,
      misconceptions: [
        { answer: 1 / 11, feedback: 'The 11 sums 2 … 12 are not equally likely: 7 can be made 6 ways, 2 only one way. Count outcomes, not sums.' },
        { answer: 1 / 36, feedback: '1/36 is one outcome. Six of the 36 add up to 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1).' },
      ],
      explain: 'Of the 36 equally likely outcomes, 6 add up to 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). 6/36 = 1/6.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'W(i, x): how many outcomes of the first i dice add up to x', right: true, why: 'Counting outcomes keeps everything whole, and the chance is that count over sⁿ at the end.' },
        { text: 'x alone: the outcomes, of any number of dice, that add up to x', why: 'Sequences of different lengths would be mixed together, so W(x) counts rolls of 1, 2, 3 … dice at once.' },
        { text: 'How many different sums the first i dice can make', why: 'That number says nothing about which sum is t or how many outcomes reach it.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The face shown by the last die', right: true, why: 'The last die shows one of s faces, and the dice before it must make up the rest of the sum.' },
        { text: 'Whether the sum so far is even or odd', why: 'Parity does not say how much of t is left to make, so the earlier dice can’t be counted from it.' },
      ] },
      { kind: 'recurrence', ask: 'How is W(i, x) found?', options: [
        { text: 'W(i, x) = Σ W(i − 1, x − f) over the faces f = 1 … s', right: true, why: 'Every outcome reaching x − f, followed by face f, is an outcome reaching x, and different faces give different outcomes.' },
        { text: 'W(i, x) = W(i − 1, x − 1) + W(i − 1, x − s): the smallest and largest face', why: 'The faces between 1 and s are left out, so most outcomes are never counted.' },
        { text: 'W(i, x) = s · W(i − 1, x − 1)', why: 'This pretends every face adds 1 to the sum; the sum must grow by the face shown.' },
      ] },
      { kind: 'base', ask: 'What holds before any die is rolled?', options: [
        { text: 'W(0, 0) = 1, and W(0, x) = 0 for every other x', right: true, why: 'No dice: one outcome, the empty one, and its sum is 0.' },
        { text: 'W(0, x) = 1 for every x', why: 'With no dice only the sum 0 is possible. Ones elsewhere add outcomes that don’t exist.' },
        { text: 'W(1, f) = 1/s for each face f', why: 'That mixes chances into a table of counts; dividing by sⁿ at the end then divides by s once too often.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'One die at a time: every sum for i − 1 dice before any for i', right: true, why: 'W(i, x) only reads the row for i − 1 dice.' },
        { text: 'In one list, from the smallest sum up, overwriting as you go', why: 'W(i − 1, x − f) has already been overwritten by W(i, x − f) when x is reached, so a die is counted twice.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n, t) / sⁿ', right: true, why: 'All sⁿ outcomes are equally likely, and W(n, t) of them add up to t.' },
        { text: 'W(n, t) / (n · s)', why: 'n dice with s faces have s · s · … · s = sⁿ outcomes, not n · s.' },
        { text: 'W(n, t) / (n · s − n + 1), the number of possible sums', why: 'The sums are not equally likely; the outcomes are.' },
      ] },
    ],
    apply: { cell: [2, 5], misconceptions: [
      { answer: 3, feedback: '3 reads only three of the faces. W(2, 5) adds W(1, 5 − f) for all four faces: W(1,4) + W(1,3) + W(1,2) + W(1,1) = 4.' },
      { answer: 0.25, feedback: '1/4 is the chance, the count over 4² = 16. The cell holds the count itself.' },
    ] },
  },

  'poisson-binomial': {
    problem: 'Find the chance of exactly k successes among up to 100 independent trials, each with its own chance of success, exactly.',
    tryFirst: {
      prompt: 'Two trials succeed with chances 20% and 70%. What is the chance that exactly one succeeds? A decimal or a fraction.',
      args: [[20, 70], 1], answer: 31 / 50,
      misconceptions: [
        { answer: 0.9, feedback: '0.2 + 0.7 adds the chances that each succeeds, but each of those includes the other succeeding too, and failing has to be multiplied in.' },
        { answer: 0.14, feedback: '0.14 = 0.2 · 0.7 is both succeeding. Exactly one is the first alone (0.2 · 0.3) or the second alone (0.8 · 0.7).' },
      ],
      explain: 'The first succeeds and the second fails, 0.2 · 0.3 = 0.06, or the other way round, 0.8 · 0.7 = 0.56: 0.62.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'P(i, j): the chance of exactly j successes among the first i trials', right: true, why: 'The next trial only needs to know how many successes there are so far, and with what chance.' },
        { text: 'P(j): a binomial chance, with every trial given the average chance', why: 'Averaging the chances changes the answer: 20% and 70% give 0.62 for one success, but 45% twice gives 0.495.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Whether the last trial succeeded or failed', right: true, why: 'The two cases are disjoint, and each leaves a smaller problem with a known count.' },
        { text: 'Whether the number of successes so far is even', why: 'Parity does not tell how many successes there are, so exactly k can’t be read off.' },
      ] },
      { kind: 'recurrence', ask: 'How is P(i, j) found, with q the chance of trial i?', options: [
        { text: 'P(i, j) = P(i − 1, j)·(1 − q) + P(i − 1, j − 1)·q', right: true, why: 'Trial i fails and keeps j, or succeeds and adds one; independence lets the chances multiply.' },
        { text: 'P(i, j) = P(i − 1, j)·q + P(i − 1, j − 1)·(1 − q)', why: 'The chances are swapped: keeping j needs a failure, which has chance 1 − q.' },
        { text: 'P(i, j) = C(i, j)·qʲ·(1 − q)^(i − j), with this trial’s q', why: 'The binomial formula needs every trial to have the same chance; here each has its own.' },
      ] },
      { kind: 'base', ask: 'What holds before any trial?', options: [
        { text: 'P(0, 0) = 1, and P(0, j) = 0 for j > 0', right: true, why: 'No trials: 0 successes, for sure.' },
        { text: 'P(0, j) = 1 for every j', why: 'The chances of the counts must add up to 1; with no trials only 0 successes is possible.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'Trial by trial: the row for i from the row for i − 1', right: true, why: 'P(i, j) reads only row i − 1.' },
        { text: 'One count at a time, from j = n down to 0, across all trials', why: 'P(i, j) reads P(i − 1, j − 1), a smaller count that is not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P(n, k)', right: true, why: 'Exactly k successes among all n trials.' },
        { text: 'P(n, k) + P(n, k + 1) + … + P(n, n)', why: 'That is the chance of at least k successes, not exactly k.' },
        { text: 'P(n, k) / n', why: 'P(n, k) is already a chance; dividing by n makes the chances of the counts add up to less than 1.' },
      ] },
    ],
    apply: { cell: [3, 1], misconceptions: [
      { answer: 0.31, feedback: '0.31 is only the failure term, P(2,1)·0.5. Add the success term P(2,0)·0.5 = 0.12.' },
      { answer: 0.12, feedback: '0.12 is only the success term, P(2,0)·0.5. Add the failure term P(2,1)·0.5 = 0.31.' },
    ] },
  },

  'expected-time': {
    problem: 'A token d squares from the end rolls a fair die with the given faces and moves forward. Find the expected number of rolls to reach or pass the end, exactly, for up to 200 squares.',
    tryFirst: {
      prompt: 'Faces 1 and 2, two squares to go. What is the expected number of rolls? Type a fraction such as 5/3 or a decimal.',
      args: [[1, 2], 2], answer: 3 / 2,
      misconceptions: [
        { answer: 2, feedback: 'A 2 finishes in one roll; only a 1 needs a second. Half the time 1 roll, half the time 2.' },
        { answer: 4 / 3, feedback: '2 divided by the average face 1.5 ignores that the last roll can overshoot: the token never has a fractional roll.' },
      ],
      explain: 'A 2 finishes at once (1 roll); a 1 leaves one square, which any roll finishes (2 rolls). (1 + 2) / 2 = 3/2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'E(d): the expected number of rolls still needed with d squares to go', right: true, why: 'What happens next depends only on the distance left, not on how the token got there.' },
        { text: 'd divided by the average face', why: 'That ignores overshooting: with faces 1 and 2 and two squares to go it gives 4/3, but the answer is 3/2.' },
      ] },
      { kind: 'split', ask: 'What is conditioned on?', options: [
        { text: 'The face of the first roll', right: true, why: 'After it, the token is d − f from the end: the same problem, smaller.' },
        { text: 'The total number of rolls', why: 'That is the quantity being averaged; it is not known before the rolls are made.' },
      ] },
      { kind: 'recurrence', ask: 'How is E(d) found from k faces?', options: [
        { text: 'E(d) = 1 + the average of E(max(0, d − f)) over the faces', right: true, why: 'One roll, then the expected rest from wherever the face leaves the token.' },
        { text: 'E(d) = (1 + Σ E(max(0, d − f))) / k', why: 'The roll happens whatever the face; averaging it too counts each roll as 1/k of a roll.' },
        { text: 'E(d) = the average of E(max(0, d − f))', why: 'The roll just made is never counted, so every E(d) comes out 0.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'E(0) = 0, and passing the end counts as distance 0', right: true, why: 'At or past the end the game is over: no more rolls.' },
        { text: 'E(0) = 1, for the roll that finishes', why: 'That roll was already counted by the 1 in the square it was rolled from; counting it again adds 1 to every answer.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'd = 1, 2, …, n', right: true, why: 'Every face moves at least one square, so E(d) reads only smaller distances.' },
        { text: 'd = n, n − 1, …, 1', why: 'E(n) needs E(n − 1) and below, which are not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(n)', right: true, why: 'The token starts n squares from the end.' },
        { text: 'E(n) / n', why: 'That is the expected rolls per square, not the expected number of rolls.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 15 / 8, feedback: '15/8 is the average of E(3) and E(2) alone. Add 1 for the roll itself.' },
      { answer: 19 / 4, feedback: '19/4 adds E(3) + E(2) without averaging: each face has chance 1/2, so divide their sum by 2.' },
    ] },
  },

  'self-loops': {
    problem: 'A token must land exactly on the last square; a roll that would pass it is wasted. Find the expected number of rolls from d squares away with a fair s-sided die, exactly.',
    tryFirst: {
      prompt: 'One square to go with a fair 6-sided die, landing exactly. What is the expected number of rolls?',
      args: [1, 6], answer: 6,
      misconceptions: [
        { answer: 1, feedback: 'Only a 1 lands exactly; the other five faces are wasted rolls. One roll in six succeeds.' },
        { answer: 3.5, feedback: '3.5 is the average face, not the number of rolls. Each roll succeeds with chance 1/6.' },
      ],
      explain: 'Each roll lands exactly with chance 1/6, so E = 1 + (5/6)·E, which gives E = 6.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'E(d): the expected rolls still needed with d squares to go, landing exactly', right: true, why: 'A wasted roll leaves the token at the same distance, so the distance is the whole state.' },
        { text: 'The chance of landing exactly on the next roll', why: 'That is one roll’s chance; the expected number of rolls also depends on the squares after a roll that fits.' },
      ] },
      { kind: 'split', ask: 'What is conditioned on?', options: [
        { text: 'The first roll: a face that fits, or a wasted one that leaves d', right: true, why: 'Both cases are futures with known expectations, one of them E(d) itself.' },
        { text: 'Only the faces that fit; wasted rolls are skipped as if never made', why: 'A wasted roll still costs a roll. Skipping them undercounts: one square with a 6-sided die would take 1 roll, not 6.' },
      ] },
      { kind: 'recurrence', ask: 'With fits = min(s, d) faces landing on or before the end, how is E(d) found?', options: [
        { text: 'E(d) = (s + Σ E(d − f) over the faces that fit) / fits', right: true, why: 'From E(d) = 1 + (Σ E(d − f) + (s − fits)·E(d)) / s, multiply by s and collect the E(d) terms.' },
        { text: 'E(d) = 1 + Σ E(d − f) / s over the faces that fit', why: 'This treats a wasted roll as the end of the game; from one square away with a 2-sided die it gives 1, not 2.' },
        { text: 'E(d) = 1 + (Σ E(d − f) + (s − fits)·E(d)) / s, reading E(d) from the table', why: 'E(d) is the cell being computed, still empty (0), so the wasted rolls add nothing.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'E(0) = 0: on the last square, no more rolls', right: true, why: 'The token is on the last square, so the game is over.' },
        { text: 'E(0) = s, the rolls needed to hit a single face', why: 'At distance 0 the token is already on the last square; it rolls no more.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'd = 1, 2, …, n', right: true, why: 'Once E(d) is solved for, it only reads smaller distances.' },
        { text: 'd = n, n − 1, …, 1', why: 'E(n) reads E(n − 1) and below, which are not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(n)', right: true, why: 'The token starts n squares away, and wasted rolls are already counted in it.' },
        { text: 'E(n) minus the expected number of wasted rolls', why: 'Wasted rolls are rolls; the question asks for all of them.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 2, feedback: '2 divides by all 3 faces, as if the overshooting face ended the game. Only 2 faces fit, so divide by 2.' },
      { answer: 2.5, feedback: '2.5 = 1 + (E(1) + E(0)) / 2 skips the wasted roll entirely. It costs a roll and leaves E(2) to go: solve for E(2).' },
    ] },
  },

  'cyclic-expectations': {
    problem: 'A token on squares 0 to n rolls a fair s-sided die, must land exactly on n, and meets snakes and ladders. Find the expected number of turns from square 0, exactly.',
    tryFirst: {
      prompt: 'Squares 0 to 3, a 2-sided die, landing exactly on 3, no jumps. What is the expected number of turns from square 0?',
      args: [3, 2, []], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 is 3 squares at an average of 1.5 a roll. From square 2, a roll of 2 is wasted half the time, and that costs rolls.' },
      ],
      explain: 'From 2: E = 1 + E/2, so E(2) = 2. From 1: either face reaches 2 or 3, so E(1) = 1 + (2 + 0)/2 = 2. From 0: E(0) = 1 + (E(1) + E(2))/2 = 3.',
    },
    steps: [
      { kind: 'state', ask: 'What are the unknowns?', options: [
        { text: 'E(i) for every square i, all unknown at once', right: true, why: 'A snake makes a square depend on an earlier one, so the values must be found together.' },
        { text: 'E(i), filled from square n − 1 back to 0 like expected time', why: 'A snake from square i to an earlier square j reads E(j) before it is filled.' },
      ] },
      { kind: 'split', ask: 'What is conditioned on?', options: [
        { text: 'The first roll from square i, and the jump it may land on', right: true, why: 'After it the token is on another square, whose expectation is one of the unknowns.' },
        { text: 'Whether the token ever goes down a snake', why: 'That is decided by the whole game, not by one step, so it gives no equation between squares.' },
      ] },
      { kind: 'recurrence', ask: 'What equation does each square give?', options: [
        { text: 'E(i) = 1 + Σ E(where face f lands) / s; on a jump square, E(i) = E(to)', right: true, why: 'One roll, then the expected rest; a jump is part of the same turn and costs nothing more.' },
        { text: 'E(i) = 1 + Σ E(where face f lands) / s; on a jump square, E(i) = 1 + E(to)', why: 'The jump happens in the turn that landed on it; charging it again counts that turn twice.' },
      ] },
      { kind: 'base', ask: 'Which value is known?', options: [
        { text: 'E(n) = 0', right: true, why: 'On the last square the game is over.' },
        { text: 'E(0) = 0', why: 'Square 0 is where the token starts, and E(0) is the answer being asked for.' },
      ] },
      { kind: 'order', ask: 'How are the values found?', options: [
        { text: 'Solve all the equations together, by Gaussian elimination', right: true, why: 'Each equation can involve squares on both sides of i, so no fill order exists.' },
        { text: 'Memoized recursion from square 0', why: 'A snake leads back to a square whose call has not returned, so the recursion never ends.' },
        { text: 'Squares from n − 1 down to 0, reading 0 for anything not yet filled', why: 'A snake target before i reads a 0 that is not its value, so the answers come out too small.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(0)', right: true, why: 'The token starts on square 0.' },
        { text: 'E of the first jump square', why: 'The token may never land there; the game starts on square 0.' },
      ] },
    ],
    apply: {
      prompt: 'Squares 0 to 4, a 2-sided die, landing exactly on 4, and a snake from 3 back to 0. What is the expected number of turns?',
      args: [4, 2, [[3, 0]]], answer: 6,
      misconceptions: [
        { answer: 3.5, feedback: '7/2 is the board without the snake. Landing on 3 sends the token back to 0, which costs more turns.' },
      ],
      explain: 'E(3) = E(0). From 2: E(2) = 1 + (E(3) + 0)/2. From 1: E(1) = 1 + (E(2) + E(3))/2. From 0: E(0) = 1 + (E(1) + E(2))/2. Solving gives E(2) = 4, E(1) = 6, E(0) = 6.',
    },
  },

  'coupon-collector': {
    problem: 'Draws give one of n coupon types, type i with chance w(i)/W. Find the expected number of draws until every type is seen, exactly, for up to 12 types with unequal chances.',
    tryFirst: {
      prompt: 'Two equally likely types. What is the expected number of draws until both have been seen?',
      args: [[1, 1]], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 assumes the second draw is always new. It is new only half the time, so the second type takes 2 draws on average.' },
      ],
      explain: 'The first draw is always new. After it, each draw is new with chance 1/2, so 2 more on average: 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'E(S): the expected draws still needed when the set S of types is collected', right: true, why: 'With unequal chances, which types are missing decides how likely the next new one is.' },
        { text: 'E(k): the expected draws still needed when k types are collected', why: 'Types with different chances make sets of the same size different: missing a rare type takes longer.' },
      ] },
      { kind: 'split', ask: 'What is conditioned on?', options: [
        { text: 'The next draw: a type already in S, or a missing type i', right: true, why: 'Every draw is one of these, with known chances.' },
        { text: 'Only the missing types; a draw from S is skipped', why: 'A repeat still costs a draw, so skipping it undercounts.' },
      ] },
      { kind: 'recurrence', ask: 'How is E(S) found?', options: [
        { text: 'E(S) = (W + Σ w(i)·E(S ∪ {i}) over the missing i) / (W − w(S))', right: true, why: 'E(S) = 1 + Σ (w(i)/W)·E(S ∪ {i}) + (w(S)/W)·E(S), solved for E(S).' },
        { text: 'E(S) = 1 + Σ (w(i)/W)·E(S ∪ {i}) over the missing i', why: 'A draw from S keeps E(S) to go, and that part is dropped, so repeats are free.' },
        { text: 'E(S) = (1 + Σ w(i)·E(S ∪ {i})) / (W − w(S))', why: 'Multiplying through by W turns the 1 for the draw into W; leaving it 1 makes each draw cost 1/W.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'E(every type) = 0', right: true, why: 'All collected: no more draws.' },
        { text: 'E(∅) = 0', why: 'The empty set is where the collecting starts; E(∅) is the answer.' },
      ] },
      { kind: 'order', ask: 'In what order are the sets filled?', options: [
        { text: 'Bigger sets first: masks counting down from the full set', right: true, why: 'E(S) reads E(S ∪ {i}), and S ∪ {i} is a bigger number.' },
        { text: 'Masks counting up from 0', why: 'E(∅) would read E({i}) before it is filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'E(∅)', right: true, why: 'Nothing is collected before the first draw.' },
        { text: 'The sum of E({i}) over the types', why: 'Each E({i}) is the time to finish from a different start; adding them counts the same draws many times.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 13 / 3, feedback: '13/3 divides by W = 6. A draw of type 1, already held, changes nothing: divide by W − w({1}) = 4.' },
      { answer: 21 / 4, feedback: '21/4 starts the sum at 1. After multiplying through by W, the draw costs W = 6.' },
    ] },
  },

  'moments': {
    problem: 'For the expected-time game, find the variance of the number of rolls, exactly, for up to 60 squares, where the roll sequences can’t be listed.',
    tryFirst: {
      prompt: 'Faces 1 and 2, two squares to go. What is the variance of the number of rolls? Type a fraction or a decimal.',
      args: [[1, 2], 2], answer: 1 / 4,
      misconceptions: [
        { answer: 0, feedback: 'The number of rolls is 1 (a 2 first) or 2 (a 1 first): it varies.' },
        { answer: 5 / 2, feedback: '5/2 is E[T²]. Subtract E[T]² = (3/2)² = 9/4.' },
      ],
      explain: 'T is 1 or 2, each with chance 1/2. E[T] = 3/2, E[T²] = (1 + 4)/2 = 5/2, so the variance is 5/2 − 9/4 = 1/4.',
    },
    steps: [
      { kind: 'state', ask: 'What does each distance hold?', options: [
        { text: 'Two values: E(d), the mean of T, and S(d), the mean of T²', right: true, why: 'Means average over the first roll; the variance is S − E² at the end.' },
        { text: 'Only Var(d), averaged over the faces like E', why: 'Variances don’t average: the spread between the faces’ means is lost. Faces 1 and 2 with 2 to go would give 0, not 1/4.' },
      ] },
      { kind: 'split', ask: 'What is conditioned on?', options: [
        { text: 'The first roll, as for the mean', right: true, why: 'After it T = 1 + T′, where T′ is the same game from a smaller distance.' },
        { text: 'Whether T is above or below its mean', why: 'That depends on the whole game, so it gives no equation between distances.' },
      ] },
      { kind: 'recurrence', ask: 'How is S(d) found?', options: [
        { text: 'S(d) = 1 + 2·avg E(next) + avg S(next)', right: true, why: 'T² = (1 + T′)² = 1 + 2T′ + T′², averaged over the faces.' },
        { text: 'S(d) = 1 + avg S(next)', why: 'The cross term 2T′ is lost; the answers can even come out negative.' },
        { text: 'S(d) = (1 + avg E(next))², the square of the mean', why: 'That is E[T]², not E[T²]; the variance would always be 0.' },
      ] },
      { kind: 'base', ask: 'What are the base cases?', options: [
        { text: 'E(0) = 0 and S(0) = 0', right: true, why: 'At the end T = 0, so T² = 0 too.' },
        { text: 'E(0) = 0 and S(0) = 1', why: 'With T = 0, T² is 0; a 1 adds to every S and so to every variance.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'd upwards, E(d) before S(d)', right: true, why: 'S(d) reads E of smaller distances as well as S.' },
        { text: 'Every S first, then every E', why: 'S(d) reads E(next), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'S(n) − E(n)²', right: true, why: 'The variance is E[T²] − E[T]², taken at the start.' },
        { text: 'S(n)', why: 'That is the mean of T², which is larger than the variance by E[T]².' },
      ] },
    ],
    apply: { cell: [1, 3], misconceptions: [
      { answer: 4, feedback: '4 drops the 2 in the cross term: 1 + 1.25 + 1.75. (1 + T′)² has 2T′ in it.' },
      { answer: 81 / 16, feedback: '81/16 is E(3)², the square of the mean. S(3) is the mean of the square.' },
    ] },
  },

  'conditional-dp': {
    problem: 'Flip a biased coin n times. Given that no two heads came up in a row, find the expected number of heads, exactly, for up to 100 flips.',
    tryFirst: {
      prompt: 'Two fair flips, given that no two heads came up in a row. What is the expected number of heads? Type a fraction.',
      args: [2, 50], answer: 2 / 3,
      misconceptions: [
        { answer: 1, feedback: '1 is the mean over all four sequences, HH included. Given the condition, only TT, TH and HT are left.' },
        { answer: 0.5, feedback: '1/2 is the heads mass, 2 heads × 1/4, not yet divided by the chance of the event, 3/4.' },
      ],
      explain: 'TT, TH and HT are left, each with chance 1/4, and their heads are 0, 1, 1. (2/4) / (3/4) = 2/3.',
    },
    steps: [
      { kind: 'state', ask: 'What does each column hold?', options: [
        { text: 'For each ending (tail or head): the chance of the allowed sequences, and their chance times their heads', right: true, why: 'The ending decides whether a head may follow; the two masses give the mean at the end.' },
        { text: 'For each ending: only the mean number of heads so far', why: 'Two endings with different chances can’t be combined without knowing how likely each is.' },
        { text: 'The number of heads so far, without the ending', why: 'Without the last flip, a head can’t be refused after a head.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The last flip: a tail after anything, or a head after a tail', right: true, why: 'That is exactly the condition, applied one flip at a time.' },
        { text: 'The last flip, heads or tails, after anything; HH is removed at the end', why: 'Once sequences of every ending are merged, there is no way to tell which contained HH earlier.' },
      ] },
      { kind: 'recurrence', ask: 'How is hH(i), the heads mass of sequences ending in a head, found?', options: [
        { text: 'hH(i) = (hT(i − 1) + T(i − 1))·p', right: true, why: 'The head extends a sequence ending in a tail and adds 1 head to it, so its chance is added to the heads mass.' },
        { text: 'hH(i) = hT(i − 1)·p', why: 'The new head is not counted; every head is missed.' },
        { text: 'hH(i) = (hT(i − 1) + hH(i − 1) + T(i − 1) + H(i − 1))·p', why: 'This lets a head follow a head, so the condition is lost.' },
      ] },
      { kind: 'base', ask: 'What holds before the first flip?', options: [
        { text: 'T(0) = 1, H(0) = 0, and no heads mass', right: true, why: 'The empty sequence is allowed and has no heads; a head may follow it, as after a tail.' },
        { text: 'T(0) = H(0) = 1/2', why: 'Half the empty sequence would end in a head, so half the first heads would be refused.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'Flip by flip: all four values of column i from column i − 1', right: true, why: 'Each reads only the previous column.' },
        { text: 'Row by row: all of T, then all of H', why: 'T(i) reads H(i − 1), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: '(hT(n) + hH(n)) / (T(n) + H(n))', right: true, why: 'The heads mass over the event, divided by the chance of the event.' },
        { text: 'hT(n) + hH(n)', why: 'That is the heads mass, weighted by chances that add up to less than 1; it still needs dividing by the event’s chance.' },
      ] },
    ],
    apply: { cell: [3, 3], misconceptions: [
      { answer: 0.125, feedback: '0.125 = hT(2)·0.5 leaves out the new head. Add T(2)·0.5: each path gains one head.' },
      { answer: 5 / 8, feedback: '5/8 also extends sequences ending in a head, making HH. Only hT(2) and T(2) may be followed by a head.' },
    ] },
  },

  'stochastic-control': {
    problem: 'A job has stages done in order: a safe way at a fixed cost, or a risky try that may finish two stages at once and is repeated until it works. Find the least expected cost, exactly, for up to 1000 stages.',
    tryFirst: {
      prompt: 'One stage: safe costs 2; a risky try costs 1 and works with chance 25%. What is the least expected cost?',
      args: [[2], [1], [25]], answer: 2,
      misconceptions: [
        { answer: 0.25, feedback: '1 · 0.25 multiplies the cost by the chance. A try that works 1 time in 4 takes 4 tries on average: cost 4.' },
        { answer: 4, feedback: '4 is the risky way. The safe way, 2, is cheaper.' },
      ],
      explain: 'Risky: V = 1 + 0.75·V, so V = 4. Safe costs 2. The least is 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(i): the least expected cost to finish from stage i', right: true, why: 'A failed try leaves the job at stage i, so the future depends only on i.' },
        { text: 'The cost paid so far', why: 'Past costs don’t change which choice is best from here; the future cost is what is minimised.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The choice at stage i: safe, or risky until it works', right: true, why: 'Once risky is the better choice at i, a failure leaves the same choice, so it is kept.' },
        { text: 'Whether the previous stage was done the risky way', why: 'The cost of the rest doesn’t depend on how earlier stages were done.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(i) found?', options: [
        { text: 'V(i) = min(a(i) + V(i + 1), 100·b(i)/p(i) + V(i + 2))', right: true, why: 'Risky: V = b + (p/100)·V(i + 2) + (1 − p/100)·V, solved for V.' },
        { text: 'V(i) = min(a(i) + V(i + 1), b(i) + V(i + 2))', why: 'This pays for one try only, as if every try worked.' },
        { text: 'V(i) = min(a(i) + V(i + 1), b(i)·p(i)/100 + V(i + 2))', why: 'Multiplying by the chance makes unlikely tries look cheap; they take 100/p tries on average.' },
      ] },
      { kind: 'base', ask: 'What are the base cases?', options: [
        { text: 'V(n) = V(n + 1) = 0', right: true, why: 'Finished, and a risky success at the last stage lands on n + 1, also finished.' },
        { text: 'V(n) = 0, and the risky way is not allowed at the last stage', why: 'That changes the problem: a risky try at the last stage may be cheaper than the safe way.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'From the last stage back to the first', right: true, why: 'V(i) reads V(i + 1) and V(i + 2).' },
        { text: 'From the first stage forward', why: 'V(0) would read V(1) and V(2) before they are filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(0)', right: true, why: 'The job starts at stage 0.' },
        { text: 'The smallest V(i)', why: 'V(n) = 0 is always the smallest, and the job doesn’t start finished.' },
      ] },
    ],
    apply: { cell: [0, 1], misconceptions: [
      { answer: 2.5, feedback: '2.5 prices the risky try at 2 · 25/100. It takes 4 tries on average: 8, plus V(3) = 2 is 10. Safe is 1 + V(2) = 3.' },
      { answer: 10, feedback: '10 is the risky way. Safe, 1 + V(2) = 3, is cheaper.' },
    ] },
  },
}
