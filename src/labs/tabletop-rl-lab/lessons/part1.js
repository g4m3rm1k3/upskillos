// Part 1: dice as data. Rolling, counting faces, scoring, how many hands there are, chance by
// counting and by experiment, and a Markov chain for chasing a Yahtzee. Every number a predict
// block asks for is worked out by `compute` from the lab's engine, which equals the Python programs.
import { HANDS, PyRandom, roll, countsOf, score } from '../engine/dice.js'
import { ways, handProbability, outcomes, chaseMatrix, chaseSteps, estimate } from '../engine/probability.js'
import { f } from './util.js'

const firstRolls = (() => { const rng = new PyRandom(0); return [roll(5, rng), roll(5, rng)] })()
const chase = chaseSteps()
const P = chaseMatrix()
const pct = x => `${(100 * x).toFixed(2)}%`

export const PART1 = {
  id: 'part1', title: 'Part 1 · Dice as data', lessons: [
    {
      id: 'dice-as-data', number: '1.1', title: 'Five dice in Python',
      goal: 'Roll dice with a seeded random number generator, keep them in a list, sort them into a hand, and count the faces.',
      builds: [],
      blocks: [
        { h: 'What this lab is about' },
        { md: `This lab teaches **reinforcement learning**, the part of machine learning where a program learns to make decisions by trying them and seeing what happens. The game is **Yahtzee**: five dice, up to three rolls a turn, and a scorecard of 13 boxes to fill.

Yahtzee is small enough to understand completely and big enough to be interesting. One turn can be **solved exactly**: we will work out the best possible way to play it, as a number. That gives us something rare in machine learning, a **right answer to check learners against**. When Q-learning says it has learned to play for Sixes, we can say exactly how far from perfect it is.

1. **Dice as data** (this part): dice in Python, scoring, counting, chance.
2. **One turn, solved exactly**: a turn as a decision problem, planned backwards.
3. **Learning a turn from experience**: Q-learning, SARSA, step sizes, afterstates, measured against the exact answer.
4. **The whole game**: a scorecard too big for any table, a value function learned by TD(0), and statistics to judge players honestly.
5. **Your own experiments**.

It assumes basic Python: variables, \`if\`, \`for\`, functions and lists. Every line of every program is explained. The **🎲 Table** tab lets you play against the lab's players at any time, and the **🧪 Workshop** trains your own.` },
        { h: 'A die is a whole number' },
        { md: `A die shows one of the faces 1 to 6. In Python that is just an \`int\`. Five dice are a **list** of five ints, like \`[4, 4, 1, 3, 5]\`.

To roll, we need random numbers. Python's \`random\` module makes them, and it has a feature that matters a lot for experiments: a **seed**. A \`random.Random(seed)\` object produces a long sequence of numbers that *look* random, but the same seed always produces the same sequence. So a run can be repeated exactly, and the lab's figures, written in JavaScript, can produce exactly the dice that the Python program rolls.` },
        {
          code: {
            file: 'dice.py', fn: 'roll', notes: [
              ['def roll(n, rng):', ['`n` is how many dice to roll; `rng` is the random number generator to roll them with. Passing the generator in, rather than using one hidden inside, is what lets a caller control the seed.']],
              ['dice = []', ['An empty list, to be filled one die at a time.']],
              ['for _ in range(n):', ['Repeat `n` times. `_` is a name for a loop variable we never use.']],
              ['dice.append(rng.randint(1, 6))', ['`randint(1, 6)` is a whole number from 1 to 6, **both ends included**, each equally likely. `append` adds it to the end of the list.'], { tex: 'd \\sim \\text{Uniform}\\{1, \\dots, 6\\}' }],
              ['return dice', ['The list of `n` dice, in the order they were rolled.']],
            ],
          },
        },
        { figure: 'DiceRoller', caption: 'Rolls made by Python\'s own random number generator (the lab reproduces it exactly). Change the seed: the same seed always gives the same rolls.' },
        { h: 'From a roll to a hand' },
        { md: `For scoring, the order of the dice doesn't matter: \`[4, 4, 1, 3, 5]\` scores exactly like \`[1, 3, 4, 4, 5]\`. So we **sort** a roll, smallest first, and call the result a **hand**. We store it as a **tuple**, \`(1, 3, 4, 4, 5)\`: like a list, but it can't be changed after it's made, and that lets it be a key in a dictionary, which we'll need in Part 2.

Most scoring rules only care **how many** dice show each face. \`counts_of\` works that out. It returns a list of 7 numbers where \`counts[f]\` is how many dice show face \`f\`. Position 0 is never used; it is simpler to waste one slot than to write \`counts[f - 1]\` everywhere.` },
        {
          code: {
            file: 'dice.py', fn: 'counts_of', notes: [
              ['def counts_of(hand):', ['Works for any number of dice, sorted or not.']],
              ['counts = [0] * 7', ['`[0] * 7` makes a list of seven zeros: `[0, 0, 0, 0, 0, 0, 0]`.']],
              ['for die in hand:', ['Each die in turn.']],
              ['counts[die] += 1', ['Add one to that face\'s count. The die\'s value **is** the position in the list: a 4 adds one to `counts[4]`.'], { tex: 'c_f = \\#\\{i : d_i = f\\}' }],
              ['return counts', ['Seven counts; together the counts for faces 1 to 6 add up to the number of dice.']],
            ],
          },
        },
        {
          code: {
            file: 'dice.py', fn: 'show_rolls', caption: 'what the Python tab runs first', notes: [
              ['def show_rolls(rolls=5, seed=0):', ['Default values: called with no arguments, it rolls 5 times with seed 0.']],
              ['rng = random.Random(seed)', ['A generator of our own, started from `seed`. Every program in this lab makes its own like this, so nothing depends on what ran before.']],
              ['for _ in range(rolls):', ['One trip per roll.']],
              ['dice = roll(5, rng)', ['Five fresh dice.']],
              ['hand = tuple(sorted(dice))', ['`sorted` gives a new list, smallest first; `tuple` turns it into a tuple.']],
              ['print(dice, "sorted:", hand, "counts:", counts_of(hand)[1:])', ['`counts_of(hand)[1:]` is a **slice**: the list from position 1 to the end, so the unused position 0 isn\'t printed.']],
              ['print(len(HANDS), "different hands")', ['`HANDS` is every possible hand, built in lesson 1.3.']],
            ],
          },
        },
        { python: { program: 'dice', label: 'Step through show_rolls in real Python' } },
        {
          predict: {
            prompt: `With seed 0, the first roll is \`${JSON.stringify(firstRolls[0])}\`. What is \`counts_of(hand)[4]\` for it, the number of fours?`,
            answer: countsOf(firstRolls[0])[4], compute: () => countsOf(firstRolls[0])[4],
            explain: `Count them: ${firstRolls[0].join(', ')}. \`counts[4]\` is how many dice show a 4.`,
            misconceptions: [{ answer: 4, feedback: '4 is the face we are asking about, not how many dice show it.' }],
          },
        },
        {
          choice: {
            prompt: 'Why does every program in this lab make its own `random.Random(seed)` instead of calling `random.randint` directly?',
            options: [
              { text: 'So a run can be repeated exactly: the same seed gives the same dice', why: 'Yes. Repeatable runs let you check a result, compare two players on the same dice, and let this lab\'s JavaScript reproduce Python\'s dice exactly.' },
              { text: 'Because `random.Random` makes the dice more random', why: 'It is the same generator (the Mersenne Twister) either way. The difference is that we control where its sequence starts.' },
              { text: 'Because `randint` doesn\'t work without a seed', why: '`random.randint` works fine; it just uses a hidden shared generator, seeded from the clock, so every run differs.' },
            ],
            answer: 0,
          },
        },
        { note: 'A **roll** is a list of dice. A **hand** is the roll sorted, as a tuple. **counts** says how many dice show each face. A **seed** fixes the sequence of random numbers, so experiments can be repeated exactly.' },
      ],
    },

    {
      id: 'scoring-a-hand', number: '1.2', title: 'Scoring a hand: 13 rules as code',
      goal: 'Read the scoring function, predict what any hand scores in each box, and see how each rule becomes a test on `counts`.',
      builds: ['dice-as-data'],
      blocks: [
        { md: `A Yahtzee scorecard has 13 **boxes**. Each turn you write your final hand in one empty box and score points by that box's rule. Each box is used once, so after 13 turns the card is full and the game ends.

The **upper section** (boxes 0 to 5: Ones to Sixes) counts one face: three 4s in Fours score 12. If the upper section totals 63 or more, there's a 35-point **bonus** (Part 4). The **lower section** (boxes 6 to 12) rewards patterns:

| Box | Rule | Score |
|---|---|---|
| Three of a kind | at least 3 dice alike | sum of all five dice |
| Four of a kind | at least 4 alike | sum of all five |
| Full house | 3 of one face and 2 of another | 25 |
| Small straight | 4 faces in a row | 30 |
| Large straight | 5 faces in a row | 40 |
| Yahtzee | all 5 alike | 50 |
| Chance | anything | sum of all five |

A hand can go in any open box, even one where it scores 0. Writing a 0 on purpose ("scratching" a box) is sometimes the best move.` },
        {
          code: {
            file: 'scoring.py', fn: 'score', notes: [
              ['def score(hand, box):', ['Boxes are numbered 0 to 12, in the order of the `BOXES` list at the top of the file.']],
              ['counts = counts_of(hand)', ['Almost every rule is a question about the counts.']],
              ['total = sum(hand)', ['The sum of all five dice, for Three/Four of a kind and Chance.'], { tex: 's = \\sum_{i=1}^{5} d_i', calc: q => [q.hand.join(' + '), q.hand.reduce((a, b) => a + b, 0)] }],
              ['if box < 6:', ['The upper section.'], { logic: 'the box is one of Ones … Sixes' }],
              ['face = box + 1', ['Box 0 counts ones, box 5 counts sixes.'], { calc: q => [`${q.box} + 1`, q.box + 1] }],
              ['return face * counts[face]', ['The face times how many dice show it: three 4s score 12.'], { tex: 'f \\cdot c_f', calc: q => [`${q.face} × ${q.counts[q.face]}`, q.face * q.counts[q.face]] }],
              ['if box == 6:', ['Three of a kind.']],
              ['return total if max(counts) >= 3 else 0', ['`a if condition else b` is Python\'s one-line choice. `max(counts)` is the size of the biggest group of equal dice.'], { logic: 'some face appears at least 3 times' }],
              ['if box == 7:', ['Four of a kind.']],
              ['return total if max(counts) >= 4 else 0', ['The same test with 4.']],
              ['if box == 8:', ['Full house.']],
              ['return 25 if 3 in counts and 2 in counts else 0', ['`3 in counts` asks whether any face appears exactly three times. Both must hold: a group of 3 **and** a group of 2. Five of a kind is not a full house by the ordinary rule (Part 4 has the exception).'], { logic: 'one face appears exactly 3 times and another exactly twice' }],
              ['if box == 9:', ['Small straight.']],
              ['return 30 if has_run(counts, 4) else 0', ['Four faces in a row, checked by `has_run` below.']],
              ['if box == 10:', ['Large straight.']],
              ['return 40 if has_run(counts, 5) else 0', ['Five in a row: 1-2-3-4-5 or 2-3-4-5-6.']],
              ['if box == 11:', ['Yahtzee.']],
              ['return 50 if max(counts) == 5 else 0', ['All five alike.']],
              ['return total', ['Chance, box 12, the only one left: always the sum.']],
            ],
          },
        },
        { md: 'A straight needs every face of a run to appear at least once. `has_run` tries every place a run could start: for a run of 4 that is 1-2-3-4, 2-3-4-5 and 3-4-5-6.' },
        {
          code: {
            file: 'scoring.py', fn: 'has_run', notes: [
              ['def has_run(counts, length):', ['`length` is 4 or 5.']],
              ['for start in range(1, 8 - length):', ['`range(1, 8 - length)` stops one short of `8 - length`: for length 4 the starts are 1, 2, 3; for length 5, 1 and 2. A run starting at 4 would need a 7.']],
              ['run = True', ['Assume this run is complete until a missing face proves otherwise.']],
              ['for face in range(start, start + length):', ['Every face of this run: for start 2 and length 4, faces 2, 3, 4, 5.']],
              ['if counts[face] == 0:', ['This face is missing from the hand…'], { logic: 'no die shows this face' }],
              ['run = False', ['…so this run is broken.']],
              ['if run:', ['Every face of the run was there.']],
              ['return True', ['One complete run is enough.']],
              ['return False', ['No start worked.']],
            ],
          },
        },
        {
          code: {
            file: 'scoring.py', fn: 'show_scores', notes: [
              ['def show_scores(hand=(2, 2, 3, 3, 3)):', ['A full house, by default.']],
              ['for box in range(13):', ['Every box.']],
              ['print(BOXES[box], score(hand, box))', ['The box\'s name and the hand\'s score there.']],
            ],
          },
        },
        { figure: 'ScorePad', caption: 'Click a die to change it. These are the scores from the same `score` function, for every box.' },
        { python: { program: 'scores', label: 'Step through score() for a full house in real Python' } },
        {
          predict: {
            prompt: 'What does the hand `(2, 3, 4, 5, 5)` score in **Small straight**?',
            answer: score([2, 3, 4, 5, 5], 9), compute: () => score([2, 3, 4, 5, 5], 9),
            explain: '2-3-4-5 are four faces in a row. A straight only needs each face once, so the second 5 doesn\'t matter: 30.',
            misconceptions: [{ answer: 0, feedback: 'The repeated 5 doesn\'t break the straight: `has_run` only checks that each face of 2-3-4-5 appears at least once.' }, { answer: 19, feedback: '19 is the sum of the dice: that is what Chance would score. A small straight scores a fixed 30.' }],
          },
        },
        {
          predict: {
            prompt: 'And `(4, 4, 4, 4, 6)` in **Three of a kind**?',
            answer: score([4, 4, 4, 4, 6], 6), compute: () => score([4, 4, 4, 4, 6], 6),
            explain: 'Four of a kind is also at least three of a kind, and the score is the sum of **all five** dice: 4 + 4 + 4 + 4 + 6 = 22.',
            misconceptions: [{ answer: 12, feedback: 'That is just three 4s. Three of a kind scores the sum of all five dice.' }, { answer: 16, feedback: 'All five dice count, including the 6.' }],
          },
        },
        {
          choice: {
            prompt: 'Which hand scores 25 in Full house by the ordinary rule (the `score` function)?',
            options: [
              { text: '`(5, 5, 5, 5, 5)`', why: '`3 in counts` is false: the counts are `[0, 0, 0, 0, 0, 5, 0]`. Part 4\'s Joker rule can change that for a second Yahtzee, but `score` alone gives 0.' },
              { text: '`(1, 1, 6, 6, 6)`', why: 'Yes: three 6s and two 1s. Which faces they are doesn\'t matter.' },
              { text: '`(2, 2, 3, 3, 4)`', why: 'Two pairs: counts contain 2 but not 3.' },
            ],
            answer: 1,
          },
        },
        { note: 'Each box\'s rule is a short test on `counts` (or on the sum). `score(hand, box)` is the whole rulebook for one turn; Part 4 adds the rules that depend on the rest of the scorecard.' },
      ],
    },

    {
      id: 'counting-hands', number: '1.3', title: 'How many hands are there?',
      goal: 'Count the 7,776 ordered rolls and the 252 sorted hands, and explain why the lab works with hands.',
      builds: ['dice-as-data'],
      blocks: [
        { md: `Each die has 6 faces, so five dice can land in $6 \\times 6 \\times 6 \\times 6 \\times 6 = 6^5 = 7776$ ways, **counting order**: \`[1, 2, 3, 4, 5]\` and \`[5, 4, 3, 2, 1]\` are different rolls.

But the scoring rules never look at order. So two rolls that sort to the same hand are the same situation, and everything we learn about one applies to the other. How many **different hands** are there? Few enough to list. Choose the smallest die \`a\`, then \`b\` at least \`a\`, then \`c\` at least \`b\`, and so on: five nested loops, each starting where the previous one is.` },
        {
          code: {
            file: 'dice.py', fn: 'all_hands', notes: [
              ['def all_hands():', ['No inputs: there is only one list of all hands.']],
              ['hands = []', ['Filled by the innermost loop.']],
              ['for a in range(1, 7):', ['The smallest die: 1 to 6. `range(1, 7)` stops before 7.']],
              ['for b in range(a, 7):', ['The next die is **at least** `a`. Starting at `a` rather than 1 is what keeps every hand sorted and stops a hand being listed twice.'], { logic: 'a ≤ b' }],
              ['for c in range(b, 7):', ['At least `b`…']],
              ['for d in range(c, 7):', ['…at least `c`…']],
              ['for e in range(d, 7):', ['…at least `d`.']],
              ['hands.append((a, b, c, d, e))', ['One sorted hand. The double brackets: the inner pair makes the tuple, the outer pair is the call to `append`.'], { tex: 'a \\le b \\le c \\le d \\le e' }],
              ['return hands', ['All of them, in order: `(1, 1, 1, 1, 1)` first, `(6, 6, 6, 6, 6)` last.']],
            ],
          },
        },
        { md: `The program says there are **252**. There is a formula for it too. Choosing 5 dice from 6 faces, where repeats are allowed and order doesn't matter, is a **multiset** of size 5 from 6 kinds. Picture the five dice as stars, sorted, with 5 bars cutting them into the six faces:

$$\\star\\star \\mid \\star \\mid\\mid \\star\\star \\mid\\mid \\quad = \\quad (1, 1, 2, 4, 4)$$

Every hand is one arrangement of 5 stars and 5 bars in 10 places, so the count is "10 choose 5":

$$\\binom{10}{5} = \\frac{10!}{5!\\,5!} = 252$$

In general, $n$ dice with 6 faces give $\\binom{n + 5}{5}$ hands. That is "stars and bars". Working with 252 hands instead of 7,776 rolls makes every table in this lab 31 times smaller, and it loses nothing, because scoring can't tell the rolls apart.` },
        { figure: 'HandGallery', caption: 'All 252 hands, grouped by **pattern** (the sizes of the groups of equal dice). Click a hand to see how many of the 7,776 ordered rolls give it.' },
        {
          predict: {
            prompt: 'How many different hands are there of **two** dice (sorted, so (1, 2) and (2, 1) count once)?',
            answer: 21, compute: () => { let n = 0; for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) n++; return n },
            explain: 'With the same nested loops: 6 hands starting with 1, 5 starting with 2, … 1 starting with 6: 6 + 5 + 4 + 3 + 2 + 1 = 21. Or by stars and bars, $\\binom{2+5}{5} = \\binom{7}{5} = 21$.',
            misconceptions: [{ answer: 36, feedback: '36 = 6 × 6 counts order: (1, 2) and (2, 1) separately.' }, { answer: 18, feedback: '36 / 2 = 18 forgets the doubles, (1, 1) to (6, 6), which only had one ordering to begin with.' }],
          },
        },
        {
          predict: {
            prompt: 'How many of the 252 hands contain **no repeated face** (five different faces)?',
            answer: HANDS.filter(h => new Set(h).size === 5).length, compute: () => HANDS.filter(h => new Set(h).size === 5).length,
            explain: 'Five different faces out of six: leave one face out, 6 ways. They are the two large straights and four non-straights: (1,2,3,4,6), (1,2,3,5,6), (1,2,4,5,6) and (1,3,4,5,6).',
          },
        },
        {
          choice: {
            prompt: 'Is every one of the 252 hands equally likely to be rolled?',
            options: [
              { text: 'Yes: there are 252 hands, so each has chance 1/252', why: 'Only the 7,776 ordered rolls are equally likely. A hand that can be rolled in many orders, like (1, 2, 3, 4, 5), is much more likely than one that can be rolled in only one, like (6, 6, 6, 6, 6). Next lesson.' },
              { text: 'No: a hand is as likely as the number of ordered rolls that sort to it', why: 'Right. (1, 2, 3, 4, 5) comes from 120 orderings; (6, 6, 6, 6, 6) from one.' },
            ],
            answer: 1,
          },
        },
        { note: '**7,776** ordered rolls, all equally likely; **252** sorted hands, not equally likely. Sorting merges situations that scoring can\'t tell apart. Spotting things your problem can\'t distinguish, and merging them, is the first step in making any learning problem smaller.' },
      ],
    },

    {
      id: 'chance-by-counting', number: '1.4', title: 'Chance by counting',
      goal: 'Work out the exact probability of any hand with the multinomial coefficient, and check that all 252 add up to 1.',
      builds: ['counting-hands'],
      blocks: [
        { md: `When every outcome is equally likely, a probability is a count:

$$P(\\text{event}) = \\frac{\\text{outcomes in the event}}{\\text{all outcomes}}$$

The equally likely outcomes here are the $6^5 = 7776$ ordered rolls. So the chance of a hand is the number of orderings that sort to it, divided by 7,776.

How many orderings does a hand have? Take $(2, 2, 3, 3, 3)$. Arranging five different things gives $5! = 120$ orders. But swapping the two 2s doesn't make a new roll, and that over-counts by $2!$; the three 3s can be shuffled $3!$ ways, also over-counted. So:

$$\\text{ways}(2, 2, 3, 3, 3) = \\frac{5!}{2!\\,3!} = \\frac{120}{2 \\times 6} = 10$$

In general, for $n$ dice with $c_f$ showing face $f$, this is the **multinomial coefficient**:

$$\\text{ways} = \\frac{n!}{c_1!\\,c_2!\\,c_3!\\,c_4!\\,c_5!\\,c_6!} \\qquad P(\\text{hand}) = \\frac{\\text{ways}}{6^n}$$

(A face that doesn't appear has $c_f = 0$, and $0! = 1$, so it changes nothing.)` },
        {
          symbols: [
            ['n!', 'n factorial', '$1 \\times 2 \\times \\dots \\times n$: the number of orders of n different things; $0! = 1$', 'FACTORIAL[n]'],
            ['c_f', 'c f', 'how many dice show face $f$', 'counts[face]'],
            ['6^n', 'six to the n', 'the number of ordered rolls of $n$ dice', '6 ** len(hand)'],
          ],
        },
        {
          code: {
            file: 'probability.py', fn: 'ways', notes: [
              ['def ways(hand):', ['Works for any number of dice: rerolls in lesson 1.5 roll fewer than five.']],
              ['counts = counts_of(hand)', ['The $c_f$.']],
              ['result = FACTORIAL[len(hand)]', ['Start from $n!$. `FACTORIAL` at the top of the file lists $0!$ to $5!$: `[1, 1, 2, 6, 24, 120]`.'], { tex: 'n!', calc: q => [`${q.hand.length}!`, [1, 1, 2, 6, 24, 120][q.hand.length]] }],
              ['for face in FACES:', ['Each face 1 to 6.']],
              ['result = result // FACTORIAL[counts[face]]', ['Divide out that face\'s over-count, $c_f!$. `//` is whole-number division; the answer is always whole, because the multinomial coefficient is a count.'], { tex: 'r \\leftarrow r / c_f!', calc: q => [`${q.result} // ${q.counts[q.face]}!`, Math.floor(q.result / [1, 1, 2, 6, 24, 120][q.counts[q.face]])] }],
              ['return result', ['The number of ordered rolls that give this hand.']],
            ],
          },
        },
        {
          code: {
            file: 'probability.py', fn: 'hand_probability', notes: [
              ['def hand_probability(hand):', ['The chance of exactly this hand.']],
              ['return ways(hand) / 6 ** len(hand)', ['`**` is "to the power of", and it happens before `/`. `/` always gives a float in Python 3.'], { tex: 'P(h) = \\frac{\\text{ways}(h)}{6^n}', calc: q => [`${ways(q.hand)} / 6^${q.hand.length}`, handProbability(q.hand)] }],
            ],
          },
        },
        { figure: 'PatternTable', caption: 'The 252 hands sorted into seven patterns. Each row: how many hands have that pattern, the ways for one of them, and the chance of rolling any hand of that pattern. The last column adds up to 1.' },
        {
          predict: {
            prompt: 'In how many ordered ways can five dice show the hand `(1, 2, 3, 4, 5)`?',
            answer: ways([1, 2, 3, 4, 5]), compute: () => ways([1, 2, 3, 4, 5]),
            explain: 'All different, so no over-counting: $5! = 120$. The chance is $120 / 7776 \\approx 1.54\\%$.',
          },
        },
        {
          predict: {
            prompt: 'What is the chance of rolling **any** Yahtzee (five of a kind, any face) in a single roll of five dice? (4 decimals)',
            answer: 6 / 7776, tolerance: 0.00005, compute: () => [1, 2, 3, 4, 5, 6].reduce((s, d) => s + handProbability([d, d, d, d, d]), 0),
            explain: 'Each five-of-a-kind has exactly one ordering, so chance $1/7776$; there are six of them: $6/7776 = 1/1296 \\approx 0.0008$. That is the "0.00079" in the first column of lesson 1.7\'s chain.',
            misconceptions: [{ answer: 1 / 7776, tolerance: 0.00002, feedback: 'That is one particular Yahtzee, say five 6s. There are six faces.' }],
          },
        },
        {
          choice: {
            prompt: 'Why do the chances of all 252 hands add up to exactly 1?',
            options: [
              { text: 'Every one of the 7,776 ordered rolls sorts to exactly one hand, so the ways add up to 7,776', why: 'Yes. $\\sum_h \\text{ways}(h) = 6^5$, so $\\sum_h P(h) = 1$. The lab checks this in its tests.' },
              { text: 'Because probabilities always add to 1, whatever we computed', why: 'They do if, and only if, we counted correctly. Adding them up is a real check on the code.' },
            ],
            answer: 0,
          },
        },
        { note: 'Equally likely outcomes turn probability into counting. $P(\\text{hand}) = \\dfrac{n!}{\\prod_f c_f!} \\Big/ 6^n$. The more orderings a hand has, the likelier it is: all-different hands are common, five of a kind is rare.' },
      ],
    },

    {
      id: 'where-a-reroll-leads', number: '1.5', title: 'Where a reroll can lead',
      goal: 'List every hand that keeping some dice and rerolling the rest can produce, with its exact chance, using a recursive function.',
      builds: ['chance-by-counting'],
      blocks: [
        { md: `A turn has up to three rolls. After the first or second, you **keep** some dice and reroll the others. If you keep $(6, 6)$ and reroll three dice, where can you end up, and how likely is each result?

The three rerolled dice form a hand of their own, a hand of 3 dice. Its chance is exactly lesson 1.4's formula with $n = 3$. Adding the kept dice back and sorting gives the new five-dice hand. So we need every hand of $n$ dice, for $n$ from 0 to 5. Writing five different sets of nested loops would be clumsy; a **recursive** function does it for any $n$.` },
        { md: `**Recursion** means a function that calls itself on a smaller problem. Every sorted hand of $n$ dice whose faces are at least \`low\` is: a first face \`face\` (from \`low\` to 6), followed by a sorted hand of $n - 1$ dice whose faces are at least \`face\`. The smaller problem is solved by the same function. It stops at $n = 0$: there is exactly one hand of no dice, the empty tuple \`()\`.` },
        {
          code: {
            file: 'probability.py', fn: 'multisets', notes: [
              ['def multisets(n, low=1):', ['`low` is the smallest face allowed. The first call uses 1; deeper calls raise it, exactly as `range(a, 7)` did in `all_hands`.']],
              ['if n == 0:', ['The **base case**: the smallest problem, answered directly.'], { logic: 'no dice left to choose' }],
              ['return [()]', ['A list holding one hand, the empty tuple. Not an empty list: there **is** one way to choose zero dice.']],
              ['result = []', ['All the hands, collected here.']],
              ['for face in range(low, 7):', ['Each possible first (smallest) face.']],
              ['for rest in multisets(n - 1, face):', ['The **recursive call**: every sorted hand of the other $n - 1$ dice, each at least `face`.']],
              ['result.append((face,) + rest)', ['`(face,)` is a tuple of one item (the comma makes it a tuple). `+` joins two tuples: `(6,) + (6, 6)` is `(6, 6, 6)`.']],
              ['return result', ['For `n = 5` this is exactly the 252 hands of `all_hands`, in the same order; the tests check it.']],
            ],
          },
        },
        {
          code: {
            file: 'probability.py', fn: 'outcomes', notes: [
              ['def outcomes(kept):', ['`kept` is a sorted tuple of the dice you keep, from `()` (reroll everything) to all five.']],
              ['n = 5 - len(kept)', ['How many dice are rerolled.'], { calc: q => [`5 − ${q.kept.length}`, 5 - q.kept.length] }],
              ['result = []', ['The list of (hand, chance) pairs.']],
              ['for rolled in multisets(n):', ['Every result the rerolled dice can show, as a sorted hand of $n$ dice.']],
              ['hand = tuple(sorted(kept + rolled))', ['Put the kept dice back and sort: the new five-dice hand.']],
              ['result.append((hand, hand_probability(rolled)))', ['Its chance is the chance of the **rerolled** dice, lesson 1.4 with $n$ dice. Different `rolled` always give different hands here, because `kept` is the same for all of them.'], { tex: 'P(h\' \\mid \\text{kept}) = \\frac{\\text{ways}(\\text{rolled})}{6^n}' }],
              ['return result', ['The chances add up to 1. Keeping all five dice gives one outcome, the same hand, with chance 1.']],
            ],
          },
        },
        { figure: 'RerollOutcomes', caption: 'Choose dice to keep (click them). Every hand the reroll can produce is listed with its exact chance. These numbers are the **transition probabilities** of Part 2.' },
        {
          predict: {
            prompt: 'You keep `(6, 6, 6, 6)` and reroll one die. What is the chance of a Yahtzee? (4 decimals)',
            answer: 1 / 6, tolerance: 0.00005, compute: () => outcomes([6, 6, 6, 6]).filter(o => new Set(o.hand).size === 1).reduce((s, o) => s + o.chance, 0),
            explain: 'One die, one face of six needed: $1/6 \\approx 0.1667$. `outcomes((6, 6, 6, 6))` has six entries, each with chance 1/6.',
          },
        },
        {
          predict: {
            prompt: 'You keep `(1, 2, 3, 4)` and reroll one die. What is the chance of a **large** straight? (4 decimals)',
            answer: 1 / 6, tolerance: 0.00005, compute: () => outcomes([1, 2, 3, 4]).filter(o => score(o.hand, 10) === 40).reduce((s, o) => s + o.chance, 0),
            explain: 'Only a 5 completes 1-2-3-4-5: chance 1/6. Keeping 2-3-4-5 instead, both a 1 and a 6 would complete it: 2/6. Which four you keep matters.',
            misconceptions: [{ answer: 2 / 6, tolerance: 0.0001, feedback: 'A 6 would give 1-2-3-4-6, not a straight of five. Only a 5 works for 1-2-3-4.' }],
          },
        },
        {
          predict: {
            prompt: 'How many different hands can result from keeping `(6, 6)` and rerolling three dice?',
            answer: outcomes([6, 6]).length, compute: () => outcomes([6, 6]).length,
            explain: 'One for each sorted hand of 3 dice: $\\binom{3+5}{5} = \\binom{8}{5} = 56$.',
            misconceptions: [{ answer: 216, feedback: '216 = 6³ counts order. Sorted, the three rerolled dice give 56 different results.' }],
          },
        },
        { note: '`outcomes(kept)` is where a decision can lead and how likely each place is. A decision problem needs exactly this, for every choice. We have it **exactly**, by counting; most real problems don\'t, which is why Part 3 learns without it.' },
      ],
    },

    {
      id: 'chance-by-experiment', number: '1.6', title: 'Chance by experiment, and how wrong it can be',
      goal: 'Estimate a probability by simulation, explain why the estimate wobbles, and predict how big the wobble is from the formula $\\sqrt{p(1-p)/n}$.',
      builds: ['where-a-reroll-leads'],
      blocks: [
        { md: `Counting works when you can list every outcome. Often you can't, and then you **simulate**: play many times with random dice and count. This is the **Monte Carlo method**, and it is how reinforcement learning sees the world in Part 3: by playing, not by calculating.

The question: you chase a Yahtzee for a whole turn. You keep your biggest group of equal dice and reroll the rest, twice. How often do you end with five of a kind?` },
        {
          code: {
            file: 'simulate.py', fn: 'chase_turn', notes: [
              ['def chase_turn(rng):', ['One turn. It returns `True` or `False`.']],
              ['hand = roll(5, rng)', ['The first roll. Not sorted: `chase_turn` doesn\'t need it to be.']],
              ['for _ in range(2):', ['Two rerolls.']],
              ['counts = counts_of(hand)', ['How many of each face.']],
              ['face = counts.index(max(counts))', ['`max(counts)` is the biggest group\'s size; `.index` finds the first position holding it, so on a tie (two pairs) the **lower** face is kept.']],
              ['kept = [face] * counts[face]', ['A list of that face repeated: `[4] * 3` is `[4, 4, 4]`.']],
              ['hand = kept + roll(5 - len(kept), rng)', ['Keep them, roll the rest.']],
              ['return max(counts_of(hand)) == 5', ['A comparison is already `True` or `False`, so it can be returned directly.'], { logic: 'all five dice show the same face' }],
            ],
          },
        },
        {
          code: {
            file: 'simulate.py', fn: 'estimate', notes: [
              ['def estimate(turns, seed=0):', ['Play `turns` turns from one seed.']],
              ['rng = random.Random(seed)', ['One generator for the whole experiment.']],
              ['yahtzees = 0', ['A counter.']],
              ['for _ in range(turns):', ['Each turn.']],
              ['if chase_turn(rng):', ['The turn made a Yahtzee…']],
              ['yahtzees += 1', ['…count it.']],
              ['return yahtzees / turns', ['The fraction that did: the estimate, $\\hat p$.'], { tex: '\\hat p = \\frac{\\text{yahtzees}}{n}', calc: q => [`${q.yahtzees} / ${q.turns}`, q.yahtzees / q.turns] }],
            ],
          },
        },
        { md: `Run it with 2,000 turns and seed 0 and you get **${pct(estimate(2000, 0))}**. With seed 1, **${pct(estimate(2000, 1))}**. Different seeds, different answers. Which is right? Neither exactly: each is an estimate of a true probability $p$, and an estimate made from random samples wobbles.

How much? Each turn is a **Bernoulli trial**: a Yahtzee with chance $p$, otherwise not. Its variance is $p(1-p)$. The average of $n$ independent trials has variance $p(1-p)/n$, so its typical error, the **standard error**, is

$$\\text{SE}(\\hat p) = \\sqrt{\\frac{p(1-p)}{n}}$$

Two things to notice. The error shrinks with $\\sqrt n$, not $n$: **four times** as many turns only **halves** the error. And roughly 95% of estimates land within 2 SE of the truth. Part 4 uses exactly this idea to compare players.` },
        {
          code: {
            file: 'simulate.py', fn: 'spread', notes: [
              ['def spread(turns, seeds=20):', ['The same experiment repeated with seeds 0, 1, 2, …']],
              ['results = []', ['One estimate per seed.']],
              ['for seed in range(seeds):', ['Each seed.']],
              ['results.append(estimate(turns, seed))', ['A complete, independent experiment.']],
              ['return results', ['Their spread shows the standard error directly.']],
            ],
          },
        },
        { figure: 'SimulateFig', caption: 'Twenty experiments of $n$ turns each (seeds 0 to 19), every dot an estimate. The band is the exact answer ± 2 standard errors. Raise $n$ and watch the dots close in, slowly.' },
        { python: { program: 'simulate', label: 'Step through estimate() in real Python' } },
        {
          predict: {
            prompt: 'The true chance is about $p = 0.046$. What is the standard error of an estimate from $n = 2000$ turns? (4 decimals)',
            answer: Math.sqrt(0.046 * 0.954 / 2000), tolerance: 0.00006, compute: () => Math.sqrt(0.046 * 0.954 / 2000),
            explain: '$\\sqrt{0.046 \\times 0.954 / 2000} = \\sqrt{0.00002194} \\approx 0.0047$, about half a percentage point. So estimates between roughly 3.7% and 5.5% are all unsurprising.',
            misconceptions: [{ answer: 0.046 * 0.954 / 2000, tolerance: 0.000002, feedback: 'That is the variance. The standard error is its square root.' }],
          },
        },
        {
          choice: {
            prompt: 'You want the standard error to be 10 times smaller. How many more turns do you need?',
            options: [
              { text: '10 times as many', why: 'The error shrinks like $1/\\sqrt n$: 10 times as many turns gives an error $\\sqrt{10} \\approx 3.2$ times smaller.' },
              { text: '100 times as many', why: 'Right: $\\sqrt{100} = 10$. Precision by simulation is expensive, and that is why the exact answer, next lesson, is worth having.' },
              { text: 'It depends on the seed', why: 'A seed picks one experiment; the standard error describes all of them.' },
            ],
            answer: 1,
          },
        },
        { note: 'A simulated estimate is right **on average** and wrong by about $\\sqrt{p(1-p)/n}$ each time. Every learning curve in this lab is built from random experience and carries this kind of noise. Learn to ask "how big is the wobble?" before believing a difference.' },
      ],
    },

    {
      id: 'markov-chain', number: '1.7', title: 'A Markov chain for chasing a Yahtzee',
      goal: 'Describe the chase as a Markov chain on the size of the biggest group, build its transition matrix by counting, and push a distribution through it to get the exact answer.',
      builds: ['chance-by-experiment', 'where-a-reroll-leads'],
      blocks: [
        { md: `Simulation gave about 4.6%, give or take half a percent. Can we get the exact number? The trick is to notice what actually matters while chasing: **only the size of your biggest group**. Whether you hold three 2s or three 5s, your chances from here are the same, because every face is equally likely.

So describe the turn by one number, $k$ = the size of the biggest group, from 1 (all different) to 5 (Yahtzee). A reroll moves $k$ to a new size $j$ with some chance that depends **only on $k$**, not on how you got there. A process like that is a **Markov chain**, and its chances fit in a table, the **transition matrix**:

$$P_{kj} = P(\\text{biggest group is } j \\text{ after the reroll} \\mid \\text{it was } k \\text{ before})$$

We fill it by counting, with \`outcomes\` from lesson 1.5. Keep $k$ copies of one face (1s, say; by symmetry any face gives the same numbers), reroll the rest, and add up the chance of each new biggest-group size. Notice $j$ can be bigger than $k$ in two ways: rerolled dice can match the kept face, or they can form a **bigger group of their own**. Keeping a pair and rolling three of a kind of another face switches the chase to that face. \`max(counts_of(hand))\` handles both.` },
        {
          code: {
            file: 'probability.py', fn: 'chase_matrix', notes: [
              ['def chase_matrix():', ['Builds the 6 × 6 table $P$. Rows and columns 0 are never used, like `counts[0]`.']],
              ['P = []', ['A list of rows.']],
              ['for k in range(6):', ['Six rows…']],
              ['P.append([0.0] * 6)', ['…each a fresh list of six zeros. (Writing `[[0.0] * 6] * 6` would be a trap: six references to **one** list.)']],
              ['for k in range(1, 6):', ['Each starting size $k$, 1 to 5.']],
              ['kept = (1,) * k', ['$k$ ones: `(1,) * 3` is `(1, 1, 1)`.']],
              ['for hand, chance in outcomes(kept):', ['Every result of rerolling the other $5 - k$ dice, with its chance.']],
              ['j = max(counts_of(hand))', ['The new biggest group.']],
              ['P[k][j] += chance', ['Add this outcome\'s chance to the matching entry. Each row ends up adding to 1.'], { tex: 'P_{kj} = \\sum_{h\' : \\max c(h\') = j} P(h\' \\mid k \\text{ kept})' }],
              ['return P', ['The transition matrix.']],
            ],
          },
        },
        { md: `Now push chances through the chain. Let $\\pi_k$ be the chance that the biggest group is $k$ **now**. After one reroll, the chance of $j$ adds up every way of getting there:

$$\\pi'_j = \\sum_{k=1}^{5} \\pi_k \\, P_{kj}$$

That is a vector-times-matrix product, written as two \`for\` loops. Start with the distribution after the first roll (lesson 1.4's chances, grouped by biggest group), apply it twice, and read off $\\pi_5$.` },
        {
          code: {
            file: 'probability.py', fn: 'chase_yahtzee', notes: [
              ['def chase_yahtzee():', ['Exact, no dice thrown.']],
              ['dist = [0.0] * 6', ['$\\pi$ after the first roll, to be filled in.']],
              ['for hand in HANDS:', ['Every possible first roll…']],
              ['dist[max(counts_of(hand))] += hand_probability(hand)', ['…adds its chance to its biggest-group size.'], { tex: '\\pi_k = \\sum_{h : \\max c(h) = k} P(h)' }],
              ['P = chase_matrix()', ['The transition matrix.']],
              ['for _ in range(2):', ['Two rerolls.']],
              ['new = [0.0] * 6', ['$\\pi\'$, built up from zero.']],
              ['for k in range(1, 6):', ['From each size $k$…']],
              ['for j in range(1, 6):', ['…to each size $j$:']],
              ['new[j] += dist[k] * P[k][j]', ['the chance of being at $k$ times the chance of moving to $j$.'], { tex: '\\pi\'_j \\mathrel{+}= \\pi_k P_{kj}' }],
              ['dist = new', ['The distribution after this reroll.']],
              ['return dist', ['After the third roll. `dist[5]` is the chance of a Yahtzee.']],
            ],
          },
        },
        { figure: 'ChaseChain', caption: 'The transition matrix, counted exactly, and the distribution after each roll. Rows add to 1; so does every distribution.' },
        { python: { program: 'chase', label: 'Step through the Markov chain in real Python' } },
        {
          predict: {
            prompt: 'What is $P_{45}$: holding four of a kind and rerolling one die, the chance of a Yahtzee? (4 decimals)',
            answer: P[4][5], tolerance: 0.00005, compute: () => chaseMatrix()[4][5],
            explain: 'One die must match: 1/6 ≈ 0.1667. The rest of row 4 is $P_{44} = 5/6$.',
          },
        },
        {
          predict: {
            prompt: 'What is the exact chance of a Yahtzee in one chasing turn? Give it as a percentage, 3 decimals.',
            answer: 100 * chase[2][5], tolerance: 0.0006, compute: () => 100 * chaseSteps()[2][5],
            explain: `${f(chase[2][5])}, about **4.603%**: roughly one turn in 22. The simulations of lesson 1.6 scattered around this, as the formula said they would. The same number will reappear in Part 2 as 50 × 0.04603 = 2.3014, the exact value of a turn aimed at the Yahtzee box.`,
            misconceptions: [{ answer: 100 * chase[0][5], tolerance: 0.001, feedback: 'That is after the first roll only. Push the distribution through the matrix twice.' }],
          },
        },
        {
          choice: {
            prompt: 'Why could the whole chase be described by **one number**, the biggest group\'s size?',
            options: [
              { text: 'Because the future depends on the past only through that number: which face it is, and how we got here, change nothing', why: 'Yes. That is the **Markov property**. Choosing a description that has it is what lets a 252-hand problem shrink to 5 states.' },
              { text: 'Because the other dice are thrown away', why: 'They are rerolled, which is why they carry no information forward. But the key point is that nothing **else** affects the future chances.' },
              { text: 'Because a Markov chain can only have one number', why: 'A Markov chain\'s state can be anything (a hand, a scorecard, a position); what matters is that it carries everything the future depends on.' },
            ],
            answer: 0,
          },
        },
        { note: `A **Markov chain**: states, and a transition matrix $P_{kj}$ of chances that depend only on the current state. Distributions move by $\\pi' = \\pi P$. Here it gave the exact ${pct(chase[2][5])}. Part 2 adds the missing piece, **choices**, and a chain with choices is a Markov decision process.` },
      ],
    },
  ],
}

