// Part 2: one turn, solved exactly. A turn as a Markov decision process, the value of a keep as an
// expectation, backward induction (the Bellman optimality equation), the exact value of every box,
// reading the optimal policy, and judging any policy exactly (policy evaluation).
import { HANDS, countsOf, handId, BOXES } from '../engine/dice.js'
import { KEEPS, KEPT, keptId, solve, startValue, evaluate, expected, finalValues } from '../engine/turn.js'
import { chaseSteps } from '../engine/probability.js'
import { f } from './util.js'

const exact = BOXES.map((_, box) => startValue(solve(box).V[2]))
const chaserKeep = h => { const c = countsOf(HANDS[h]), face = c.indexOf(Math.max(...c)); return keptId(Array(c[face]).fill(face)) }
const chaserValue = box => evaluate(h => chaserKeep(h), box)
const keepValue = (box, kept) => expected(keptId(kept), finalValues(box))
// The exact value of one keep with r rolls left.
const qOf = (box, hand, kept, r = 2) => { const h = handId(hand); return solve(box).Q[r][h][KEEPS[h].indexOf(keptId(kept))] }

export const PART2 = {
  id: 'part2', title: 'Part 2 · One turn, solved exactly', lessons: [
    {
      id: 'turn-as-mdp', number: '2.1', title: 'A turn as a decision problem',
      goal: 'Name the states, actions, transition probabilities and rewards of one turn aimed at one box, and list every action with a bitmask.',
      builds: ['where-a-reroll-leads', 'markov-chain'],
      blocks: [
        { md: `Lesson 1.7's Markov chain had a fixed rule: always keep the biggest group. Now let the **player choose**. A chain where a player picks an action at every step, and the action changes the chances, is a **Markov decision process** (MDP). It is the mathematical setting for all of reinforcement learning.

For now, make the game as small as possible: **one turn, aimed at one box**. You roll, you may keep and reroll twice, and at the end your hand is scored in a box chosen in advance (Sixes, say). Part 4 brings back the whole scorecard.` },
        { md: `An MDP has five parts. For one turn:

| Part | Symbol | In one Yahtzee turn |
|---|---|---|
| **States** | $s$ | the hand and how many rolls are left: $s = (h, r)$, $r \\in \\{2, 1, 0\\}$ |
| **Actions** | $a \\in \\mathcal A(s)$ | which dice to keep: a sub-multiset of $h$, from none to all five |
| **Transitions** | $P(s' \\mid s, a)$ | \`outcomes(kept)\` from lesson 1.5: exact chances of each new hand |
| **Rewards** | $R$ | 0 after a reroll; the hand's score in the box when $r = 0$ |
| **Horizon** | $T$ | 2 decisions, then the turn ends |

The **Markov property** holds because the hand and the rolls left are everything the future depends on: how you got that hand changes nothing. A **policy** $\\pi$ says what to do in every state: $\\pi(h, r)$ = the dice to keep. The goal is a policy with the biggest **expected reward**.

Keeping all five dice and "rerolling nothing" is the same as stopping, so we don't need a separate stop action: every turn has exactly two decisions.` },
        { md: `How many actions does a hand have? Each of the five dice is kept or not: $2^5 = 32$ choices. We can number them 0 to 31 and read each number's **bits**: bit $i$ (worth $2^i$) says whether to keep die $i$. That is a **bitmask**. For example $13 = 8 + 4 + 1 = $ \`0b01101\`: keep dice 0, 2 and 3.

But with repeated faces, different masks keep the same dice: in $(2, 2, 3, 3, 3)$, keeping die 0 or die 1 both keep one 2. \`keeps\` lists each **different** set of kept dice once.` },
        {
          code: {
            file: 'turn.py', fn: 'keeps', notes: [
              ['def keeps(hand):', ['`hand` is sorted, so every kept tuple comes out sorted too.']],
              ['found = []', ['The different keeps, in the order first found.']],
              ['for mask in range(32):', ['Every bitmask 0 (keep nothing) to 31 (keep everything).']],
              ['kept = []', ['The dice this mask keeps.']],
              ['for i in range(5):', ['Each die\'s position.']],
              ['if mask & (1 << i):', ['`1 << i` is $2^i$, a number with only bit $i$ set. `&` is **bitwise and**: it keeps the bits set in both numbers, so the result is nonzero exactly when bit $i$ of `mask` is set.'], { logic: 'bit i of the mask is 1: die i is kept' }],
              ['kept.append(hand[i])', ['Keep die $i$.']],
              ['kept = tuple(kept)', ['A tuple, so it can be compared and used as a dictionary key.']],
              ['if kept not in found:', ['A new set of kept dice, not one an earlier mask already gave…'], { logic: 'no earlier mask kept exactly these dice' }],
              ['found.append(kept)', ['…so it is a new action.']],
              ['return found', ['From `()` (reroll everything) to the whole hand (stop).']],
            ],
          },
        },
        {
          code: {
            file: 'turn.py', fn: 'reroll', notes: [
              ['def reroll(kept, rng):', ['The transition, played out with real (pseudo-random) dice rather than listed: Part 3\'s learners only ever see this.']],
              ['return tuple(sorted(list(kept) + roll(5 - len(kept), rng)))', ['`list(kept)` turns the tuple into a list so `+` can join it to the new dice; then sort, then back to a tuple.']],
            ],
          },
        },
        { figure: 'TurnExplorer', caption: 'Play a turn aimed at one box. The panel shows the state $s = (h, r)$, the number of actions, and the reward when the turn ends.' },
        {
          predict: {
            prompt: 'How many different keeps does the hand `(2, 2, 3, 3, 3)` have?',
            answer: KEEPS[handId([2, 2, 3, 3, 3])].length, compute: () => KEEPS[handId([2, 2, 3, 3, 3])].length,
            explain: 'Keep 0, 1 or 2 of the 2s (3 choices) and 0 to 3 of the 3s (4 choices): $3 \\times 4 = 12$. In general, multiply $(c_f + 1)$ over the faces.',
            misconceptions: [{ answer: 32, feedback: '32 counts masks. Many of them keep the same dice: keeping the first 2 or the second 2 is one action.' }],
          },
        },
        {
          predict: {
            prompt: 'Over all 252 hands, how many (hand, keep) pairs are there? (Each turn has this many choices at each of its two decisions.)',
            answer: KEEPS.reduce((n, k) => n + k.length, 0), compute: () => KEEPS.reduce((n, k) => n + k.length, 0),
            explain: 'The figure is 4,368: $\\sum_h \\prod_f (c_f + 1)$. With two decisions per turn, a table of every state and action has 8,736 entries. Part 3 learns such a table.',
          },
        },
        {
          choice: {
            prompt: 'In this MDP, when does the player receive a reward?',
            options: [
              { text: 'Only at the end of the turn, when the final hand is scored', why: 'Yes. Both rerolls earn 0. The decisions\' worth shows up only later: that delay is what makes this a planning problem rather than "take the best points now".' },
              { text: 'After each roll, the points the hand would score now', why: 'A hand isn\'t scored until the turn ends. Counting interim scores would reward hands you then throw away.' },
            ],
            answer: 0,
          },
        },
        { note: 'An MDP is **states, actions, transition probabilities, rewards** and a horizon, with the Markov property. One turn: $s = (h, r)$, actions = the different keeps (12 for a full house, 32 for five different faces), transitions = `outcomes`, reward = the score at the end.' },
      ],
    },

    {
      id: 'value-of-a-keep', number: '2.2', title: 'The value of a keep: an expectation',
      goal: 'Compute the expected score of any keep with one roll left, as a sum of chance × value over every outcome.',
      builds: ['turn-as-mdp'],
      blocks: [
        { md: `With one roll left, the decision is simple to state. Each keep leads to a set of final hands, each with a known chance and a known score. Its worth is the **expected value**, the average score you'd get if you made that choice many times:

$$Q_1(h, k) = \\mathbb E[\\text{score}] = \\sum_{h'} P(h' \\mid k)\\; \\text{score}(h', \\text{box})$$

Here $k$ is the kept dice and $h'$ runs over \`outcomes(k)\`. Notice that the hand $h$ you came from doesn't appear on the right: **only the dice you keep** matter. That will be important in Part 3.

\`expected\` computes this sum for any table of values \`V\`; here \`V\` is the score of every final hand.` },
        {
          code: {
            file: 'exact.py', fn: 'expected', notes: [
              ['def expected(kept, V):', ['`V` is a dictionary from every hand to its value. With one roll left, a hand\'s value is its score.']],
              ['if kept not in OUTCOMES:', ['`OUTCOMES` (top of the file) remembers every list of outcomes already worked out. This is **memoisation**: compute once, look up after that.'], { logic: 'these kept dice haven\'t been seen before' }],
              ['OUTCOMES[kept] = outcomes(kept)', ['Lesson 1.5\'s list of (hand, chance).']],
              ['total = 0.0', ['The running sum.']],
              ['for hand, chance in OUTCOMES[kept]:', ['Every hand the reroll can produce.']],
              ['total += chance * V[hand]', ['Its chance times its value.'], { tex: '\\sum_{h\'} P(h\' \\mid k)\\, V(h\')' }],
              ['return total', ['The expected value of keeping `kept`.']],
            ],
          },
        },
        { md: `A worked example: aiming for **Sixes** with one roll left, holding $(1, 2, 6, 6, 6)$. Keep the three 6s and reroll two dice. Each rerolled die is a 6 with chance $\\tfrac16$, so you expect $2 \\times \\tfrac16 = \\tfrac13$ more sixes:

$$Q_1 = 18 + 2 \\times \\tfrac16 \\times 6 = 18 + 2 = 20$$

\`expected\` gets the same 20 the long way, summing over all 21 hands two dice can show. The figure lists every keep of a hand with its exact value.` },
        { figure: 'KeepValues', props: { rollsLeft: 1 }, caption: 'Every keep of the hand, valued exactly with **one roll left**: the expected score in the chosen box. Click dice to change the hand.' },
        {
          predict: {
            prompt: 'Aiming for **Chance** with one roll left, you keep `(5, 6)` and reroll three dice. What is the expected score?',
            answer: keepValue(12, [5, 6]), tolerance: 1e-9, compute: () => keepValue(12, [5, 6]),
            explain: 'Chance scores the sum. The kept dice give 11; each rerolled die averages 3.5: $11 + 3 \\times 3.5 = 21.5$. Linearity of expectation does in one line what the sum over 56 outcomes does in many.',
            misconceptions: [{ answer: 11, feedback: 'The three rerolled dice count too: on average 3.5 each.' }],
          },
        },
        {
          predict: {
            prompt: 'Aiming for **Full house**, one roll left, holding `(2, 2, 3, 3, 5)`. You keep `(2, 2, 3, 3)`. Expected score?',
            answer: keepValue(8, [2, 2, 3, 3]), tolerance: 1e-6, compute: () => keepValue(8, [2, 2, 3, 3]),
            explain: 'A 2 or a 3 completes it: chance $2/6$, worth 25. So $25 \\times \\tfrac13 \\approx 8.333$.',
          },
        },
        {
          choice: {
            prompt: 'Why is the expected value the right thing to maximise, rather than, say, the best possible outcome?',
            options: [
              { text: 'Over many turns, your total is close to the sum of the expected values: it is what a choice is worth on average', why: 'Yes. Points add up across turns, so the average is what accumulates. (A player who only cares about winning one game might want something else; the expected score is the standard goal and the one this lab uses.)' },
              { text: 'The best possible outcome is what you get if you play well', why: 'It is what you get if you are lucky. Rerolling everything could in principle give a Yahtzee, and almost never does.' },
            ],
            answer: 0,
          },
        },
        { note: 'The value of an action is an **expectation**: $\\sum$ chance × value over where it leads. With one roll left the values are just scores. Next lesson, the values themselves come from the same formula, one roll later.' },
      ],
    },

    {
      id: 'planning-backwards', number: '2.3', title: 'Planning backwards: the Bellman equation',
      goal: 'Derive the Bellman optimality equation for a turn, and solve it exactly by backward induction in three steps.',
      builds: ['value-of-a-keep'],
      blocks: [
        { md: `With **two** rolls left, a keep leads to a hand from which you will make **one more decision**. What is that hand worth? Exactly the value of its best keep with one roll left, which lesson 2.2 just computed. So we can work **backwards** from the end of the turn:

1. $r = 0$: the turn is over. A hand is worth its score: $V_0(h) = \\text{score}(h, \\text{box})$.
2. $r = 1$: each keep is worth the expected $V_0$ of where it leads; a hand is worth its best keep.
3. $r = 2$: the same, with $V_1$ in place of $V_0$.

As formulas:

$$Q_r(h, k) = \\sum_{h'} P(h' \\mid k)\\; V_{r-1}(h') \\qquad V_r(h) = \\max_{k \\in \\mathcal A(h)} Q_r(h, k)$$

This is the **Bellman optimality equation**: the value of a state is the best action's expected value of the next state. Here it has no discount and no reward until the end, so it reads exactly like the equations above. Because the turn is finite, we can solve it from the last step to the first. That is **backward induction**, the simplest form of **dynamic programming**.` },
        {
          symbols: [
            ['V_r(h)', 'V r of h', 'the value of hand $h$ with $r$ rolls left, playing perfectly from here', 'V[r][hand]'],
            ['Q_r(h, k)', 'Q r of h, k', 'the value of keeping $k$ from $h$ with $r$ rolls left, then playing perfectly', 'Q[r][hand][kept]'],
            ['\\mathcal A(h)', 'A of h', 'the actions available: the different keeps of $h$', 'keeps(hand)'],
            ['P(h\' \\mid k)', 'P of h prime given k', 'the chance that keeping $k$ leads to $h\'$', 'OUTCOMES[kept]'],
            ['\\max_{k}', 'max over k', 'the largest value over all actions', 'max(row.values())'],
          ],
        },
        { md: 'One step of backward induction is called a **backup**: it takes the values with $r$ rolls left and produces the values with $r + 1$.' },
        {
          code: {
            file: 'exact.py', fn: 'backup', notes: [
              ['def backup(V):', ['`V` holds the value of every hand with $r$ rolls left.']],
              ['E = {}', ['The expected value of each set of kept dice. Many hands share a keep: $(6, 6)$ can be kept from 21 different hands, but its value only depends on the kept dice, so it is computed once.']],
              ['Q = {}', ['Every hand\'s row of keep values.']],
              ['new_V = {}', ['Every hand\'s value with $r + 1$ rolls left.']],
              ['for hand in HANDS:', ['All 252 hands.']],
              ['row = {}', ['This hand\'s keeps and their values.']],
              ['for kept in KEEPS[hand]:', ['Each action. `KEEPS` was built once, at the top of the file.']],
              ['if kept not in E:', ['Not worked out yet…']],
              ['E[kept] = expected(kept, V)', ['…so work it out: lesson 2.2\'s sum, over the values $V_r$.'], { tex: 'Q_{r+1}(h, k) = \\sum_{h\'} P(h\' \\mid k)\\, V_r(h\')' }],
              ['row[kept] = E[kept]', ['This keep\'s value.']],
              ['Q[hand] = row', ['Store the row.']],
              ['new_V[hand] = max(row.values())', ['The hand is worth its best keep.'], { tex: 'V_{r+1}(h) = \\max_k Q_{r+1}(h, k)' }],
              ['return new_V, Q', ['Two results at once: Python returns them as a tuple, and the caller unpacks it.']],
            ],
          },
        },
        {
          code: {
            file: 'exact.py', from: 1, to: 12, caption: 'built once, when the file is imported', notes: [
              ['KEEPS = {}', ['Every hand\'s keeps, listed once here so that each backup doesn\'t redo 252 × 32 masks.']],
              ['for hand in HANDS:', ['This loop is at the top level of the file, so it runs when the file is first imported.']],
              ['KEEPS[hand] = keeps(hand)', ['A tuple is a fine dictionary key: that is why hands are tuples.']],
              ['OUTCOMES = {}', ['Filled in by `expected` as it goes.']],
            ],
          },
        },
        {
          code: {
            file: 'exact.py', fn: 'solve_from', notes: [
              ['def solve_from(V0):', ['Solve a whole turn from the values of the final hands. Part 4 will give it other final values.']],
              ['V1, Q1 = backup(V0)', ['One backup: values with one roll left.']],
              ['V2, Q2 = backup(V1)', ['Another: values with two rolls left. That is the whole turn.']],
              ['return [V0, V1, V2], [None, Q1, Q2]', ['Lists indexed by rolls left. `None` stands in for $Q_0$: with no rolls left there is no decision.']],
            ],
          },
        },
        {
          code: {
            file: 'exact.py', fn: 'solve', notes: [
              ['def solve(box):', ['Aiming for one box.']],
              ['V0 = {}', ['The final hands\' values…']],
              ['for hand in HANDS:', ['…every hand…']],
              ['V0[hand] = score(hand, box)', ['…is worth its score.'], { tex: 'V_0(h) = \\text{score}(h, \\text{box})' }],
              ['return solve_from(V0)', ['Two backups, and the turn is solved.']],
            ],
          },
        },
        { figure: 'BackupFig', caption: 'Backward induction for one hand: $V_0$, then each keep\'s $Q_1$ and the best, then $Q_2$ from $V_1$. Change the box or the hand.' },
        {
          predict: {
            prompt: 'Aiming for **Chance**, holding `(1, 3, 4, 5, 6)` with **one** roll left, what is $V_1$, the value of the best keep?',
            answer: solve(12).V[1][handId([1, 3, 4, 5, 6])], tolerance: 1e-9, compute: () => solve(12).V[1][handId([1, 3, 4, 5, 6])],
            explain: 'A die is worth keeping if it beats the 3.5 a reroll averages: keep 4, 5 and 6 (15), reroll two (7): $V_1 = 22$.',
            misconceptions: [{ answer: 19, feedback: '19 is the sum now. Rerolling the 1 and the 3 averages 7 instead of 4.' }, { answer: 21.5, feedback: 'That is keeping only 5 and 6. The 4 beats the 3.5 average of a reroll, so keep it.' }],
          },
        },
        {
          predict: {
            prompt: 'And with **two** rolls left, $V_2$ for the same hand and box?',
            answer: solve(12).V[2][handId([1, 3, 4, 5, 6])], tolerance: 1e-9, compute: () => solve(12).V[2][handId([1, 3, 4, 5, 6])],
            explain: 'Now a rerolled die can be rerolled again, so it is worth more than 3.5: keep a die only if it beats $V_1$ of one die, which is $\\tfrac36 \\times 5 + \\tfrac36 \\times 3.5 = 4.25$. So keep the 5 and 6 (11), reroll three: $11 + 3 \\times 4.25 = 23.75$.',
            misconceptions: [{ answer: 22, feedback: 'That is with one roll left. With two, a rerolled die is worth 4.25, more than the kept 4.' }],
          },
        },
        { note: 'The **Bellman optimality equation** $V_r(h) = \\max_k \\sum_{h\'} P(h\' \\mid k) V_{r-1}(h\')$ defines the best values; **backward induction** solves it from the end. Two backups solve a turn. No learning, no simulation: exact.' },
      ],
    },

    {
      id: 'before-the-first-roll', number: '2.4', title: 'The exact value of every box',
      goal: 'Average $V_2$ over the first roll to get the exact expected points of a perfectly played turn, and confirm three of them by hand.',
      builds: ['planning-backwards'],
      blocks: [
        { md: `$V_2(h)$ is the value **after** the first roll. Before any dice are thrown, the first roll is random, so the value of the whole turn is $V_2$ averaged over the first roll:

$$V^* = \\sum_h P(h)\\, V_2(h)$$

with $P(h)$ from lesson 1.4. That number, the expected points of a perfectly played turn, is what every learner in Part 3 will be measured against.` },
        {
          code: {
            file: 'exact.py', fn: 'start_value', notes: [
              ['def start_value(V2):', ['The value of the turn before it starts.']],
              ['total = 0.0', ['A running sum.']],
              ['for hand in HANDS:', ['Every possible first roll.']],
              ['total += hand_probability(hand) * V2[hand]', ['Its chance times its value.'], { tex: 'V^* = \\sum_h P(h)\\, V_2(h)' }],
              ['return total', ['Expected points of one perfect turn.']],
            ],
          },
        },
        {
          code: {
            file: 'exact.py', fn: 'best_for_every_box', notes: [
              ['def best_for_every_box():', ['Prints the 13 exact values.']],
              ['from scoring import BOXES', ['An import inside a function runs when the function does; the names are only for printing.']],
              ['for box in range(13):', ['Every box.']],
              ['V, Q = solve(box)', ['Solve the turn for that box…']],
              ['print(BOXES[box], round(start_value(V[2]), 4))', ['…and print its value, rounded to 4 decimal places.']],
            ],
          },
        },
        { figure: 'BoxValues', caption: 'The exact expected points of one perfect turn aimed at each box.' },
        { python: { program: 'exact', label: 'Solve all 13 boxes in real Python' } },
        { md: `Three of these can be checked with a pencil, and checking them is the best way to trust the program.

**Sixes.** Each die is independent: keep every 6 and reroll the others. A die ends as a 6 unless it misses all three times: $1 - (5/6)^3 = 0.4213$. Five dice, 6 points each: $5 \\times 6 \\times 0.4213 = ${f(exact[5])}$.

**Chance.** Each die independently: keep it if it beats what rerolling is worth. With one reroll left a fresh die averages 3.5, so keep 4, 5, 6: worth $\\tfrac36 \\cdot 5 + \\tfrac36 \\cdot 3.5 = 4.25$. With two left, keep 5, 6: $\\tfrac26 \\cdot 5.5 + \\tfrac46 \\cdot 4.25 = 4.667$. Five dice: $${f(exact[12])}$.

**Yahtzee.** $50 \\times$ lesson 1.7's chance: $50 \\times ${f(chaseSteps()[2][5])} = ${f(exact[11])}$. So the chasing rule of 1.7 is already a perfect policy for this box: worth knowing, and next lesson's tool can prove it.` },
        {
          predict: {
            prompt: 'Using the formula above, what is the exact value of a perfect turn aimed at **Fives**? (4 decimals)',
            answer: exact[4], tolerance: 0.00006, compute: () => startValue(solve(4).V[2]),
            explain: '$5 \\times 5 \\times (1 - (5/6)^3) = 25 \\times 0.42130 = 10.5324$. The program\'s value agrees.',
          },
        },
        {
          choice: {
            prompt: `A perfect turn aimed at Small straight is worth ${f(exact[9])}, but one aimed at Large straight only ${f(exact[10])}, though a large straight scores 40, not 30. Why?`,
            options: [
              { text: 'A large straight is much harder to complete, so it scores 40 less often than a small one scores 30', why: 'Yes. Value is points × chance. Needing all five faces of a run is far less likely than needing four.' },
              { text: 'The program is wrong: a bigger prize should be worth more', why: 'A bigger prize is worth more only if you are as likely to get it. Here the chance drops much more than the prize rises.' },
            ],
            answer: 0,
          },
        },
        { note: '$V^* = \\sum_h P(h) V_2(h)$: the expected points of a perfectly played turn, now known exactly for every box. Three of them check out by hand. These numbers are the **answer key** for Part 3.' },
      ],
    },

    {
      id: 'reading-the-policy', number: '2.5', title: 'What does the perfect turn do?',
      goal: 'Read the optimal policy off the Q-values, and explain decisions that surprise intuition.',
      builds: ['before-the-first-roll'],
      blocks: [
        { md: `The values say how good a state is; the **policy** says what to do. The optimal policy picks the keep with the biggest $Q$:

$$\\pi^*(h, r) = \\arg\\max_k Q_r(h, k)$$

**argmax** means "the $k$ that gives the max", not the max itself. When several keeps tie, this program takes the first one in \`keeps\` order. Ties are common: keeping $(1, 2, 3, 4)$ or $(1, 2, 3, 4, 6)$ for a small straight are both worth exactly 30.` },
        {
          code: {
            file: 'exact.py', fn: 'best_keep', notes: [
              ['def best_keep(Q, rolls_left, hand):', ['Read the policy from the solution of `solve`.']],
              ['row = Q[rolls_left][hand]', ['This state\'s keep values.']],
              ['return max(row, key=row.get)', ['`max` over the row\'s keys, comparing them by `row.get`, their value: the argmax. On a tie, `max` returns the first.'], { tex: '\\pi^*(h, r) = \\arg\\max_k Q_r(h, k)' }],
            ],
          },
        },
        { figure: 'KeepValues', props: { rollsLeft: 2, hand: [1, 2, 2, 5, 6], box: 9 }, caption: 'Every keep, valued exactly. Try the examples below, then your own.' },
        { md: `Some of what the optimal policy does is obvious and some is not.

- **Small straight from (1, 2, 2, 5, 6), two rolls left: reroll all five.** Worth ${f(solve(9).V[2][handId([1, 2, 2, 5, 6])])}. Keeping a 2 or the 5 is only worth ${f(qOf(9, [1, 2, 2, 5, 6], [2]))}, and keeping (2, 5, 6) ${f(qOf(9, [1, 2, 2, 5, 6], [2, 5, 6]))}. No pair of these dice sits well inside a run, and five fresh dice give a straight more often than you'd think.
- **Three of a kind from (1, 1, 1, 5, 6): stop.** The 14 points are certain. Rerolling the 5 and 6 to chase a bigger sum averages less.
- **Chance from (1, 3, 4, 5, 6): keep (5, 6) with two rolls left, but (4, 5, 6) with one.** Last lesson's thresholds: what a die is worth depends on how many chances you have left.
- **Large straight from (1, 2, 3, 4, 6): (1, 2, 3, 4) and (2, 3, 4, 6) tie exactly.** Each needs one particular face (a 5) and nothing else will do.

**Watch out:** the policy is optimal **for one box**, assuming you will use that box. In a real game you also choose the box, and a perfect Sixes turn may be a bad move overall. That is Part 4.` },
        {
          choice: {
            prompt: 'Aiming for Full house with two rolls left, holding `(2, 2, 2, 5, 6)`. Which does the exact solution keep?',
            options: [
              { text: '`(2, 2, 2)`: keep the three of a kind, reroll two', why: `Close, but not best: ${f(qOf(8, [2, 2, 2, 5, 6], [2, 2, 2]))}. Rerolling both dice throws away a die that is already half of a pair.` },
              { text: '`(2, 2, 2, 5)` or `(2, 2, 2, 6)`: keep the three and one other die', why: `Yes, ${f(solve(8).V[2][handId([2, 2, 2, 5, 6])])} for either. Then any match for the single die completes the house; with two rolls that happens with chance $1 - (5/6)^2$.` },
              { text: '`(2, 2)`: keep a pair', why: 'Breaking up three of a kind gives up a lot: you\'d need three of a kind again.' },
            ],
            answer: 1,
          },
        },
        {
          predict: {
            prompt: 'Aiming for Small straight with two rolls left, holding `(1, 2, 2, 5, 6)`. What is $V_2$, the value of rerolling everything (the best keep)? (4 decimals)',
            answer: solve(9).V[2][handId([1, 2, 2, 5, 6])], tolerance: 0.00006, compute: () => solve(9).V[2][handId([1, 2, 2, 5, 6])],
            explain: `${f(solve(9).V[2][handId([1, 2, 2, 5, 6])])}: below the ${f(exact[9])} of a fresh turn, because one roll has been spent.`,
          },
        },
        { note: 'The optimal policy is the **argmax** of the Q-values. It can be read, checked and argued with. Next: a tool to measure any policy, including your own rules, exactly.' },
      ],
    },

    {
      id: 'judging-any-policy', number: '2.6', title: 'Judging any policy exactly',
      goal: 'Evaluate a fixed policy with the Bellman expectation equation, and measure how much the Chaser\'s simple rule loses in each box.',
      builds: ['reading-the-policy'],
      blocks: [
        { md: `Backward induction finds the **best** policy. A small change computes the value of **any** policy $\\pi$: instead of the max over keeps, use the keep $\\pi$ chooses.

$$V^\\pi_r(h) = \\sum_{h'} P(h' \\mid \\pi(h, r))\\; V^\\pi_{r-1}(h')$$

This is the **Bellman expectation equation**, and computing it is **policy evaluation**. It answers "how good is this way of playing?" exactly, with no dice thrown. Part 3 uses it to score every learner along the way, with no noise at all.` },
        {
          code: {
            file: 'exact.py', fn: 'evaluate', notes: [
              ['def evaluate(choose, box):', ['`choose` is a **function** passed in as an argument: `choose(hand, rolls_left)` returns the dice to keep. Any policy at all can be judged.']],
              ['V = {}', ['$V^\\pi_0$: the final hands…']],
              ['for hand in HANDS:', ['…all of them…']],
              ['V[hand] = score(hand, box)', ['…worth their score.']],
              ['for rolls_left in (1, 2):', ['Back one roll at a time.']],
              ['new_V = {}', ['$V^\\pi$ with one more roll left.']],
              ['for hand in HANDS:', ['Every hand.']],
              ['new_V[hand] = expected(choose(hand, rolls_left), V)', ['No max: just the expected value of **the policy\'s** keep.'], { tex: 'V^\\pi_r(h) = \\sum_{h\'} P(h\' \\mid \\pi(h, r)) V^\\pi_{r-1}(h\')' }],
              ['V = new_V', ['Move back.']],
              ['return start_value(V)', ['Averaged over the first roll: the policy\'s expected points.']],
            ],
          },
        },
        { md: `Try it on the **Chaser** of lesson 1.6, which always keeps its biggest group of equal dice, whatever box it is aiming for. Here it is as a policy:

\`\`\`python
def chaser(hand, rolls_left):
    counts = counts_of(hand)
    face = counts.index(max(counts))
    return (face,) * counts[face]
\`\`\`

\`evaluate(chaser, 11)\` gives exactly the Yahtzee value, ${f(chaserValue(11))}: chasing **is** optimal for the Yahtzee box. For Sixes it gives ${f(chaserValue(5))} against the optimal ${f(exact[5])}: keeping a pair of 1s when you need sixes is a disaster.` },
        { figure: 'PolicyCompare', caption: 'The Chaser\'s rule against the optimal policy in every box, both evaluated exactly. The gap is what a box-blind rule costs.' },
        {
          predict: {
            prompt: 'What is the Chaser\'s exact expected score aiming for **Small straight**? (4 decimals)',
            answer: chaserValue(9), tolerance: 0.00006, compute: () => chaserValue(9),
            explain: `${f(chaserValue(9))}, against ${f(exact[9])} for the best policy. Collecting equal dice is the opposite of what a straight needs. Given five different faces, which might already be a straight, it keeps only the lowest die and rerolls the other four: it scores only when luck rebuilds a run.`,
          },
        },
        {
          choice: {
            prompt: 'Policy evaluation and backward induction differ in one place. Which?',
            options: [
              { text: 'Evaluation uses the policy\'s action; induction takes the max over all actions', why: 'Exactly. Same sums, same backwards order; the max is what turns "how good is this policy" into "what is the best policy".' },
              { text: 'Evaluation needs dice; induction doesn\'t', why: 'Neither throws dice: both use the exact transition probabilities.' },
              { text: 'Evaluation goes forwards in time', why: 'Both go backwards from the end of the turn.' },
            ],
            answer: 0,
          },
        },
        { note: 'The **Bellman expectation equation** evaluates a given policy; the **optimality equation** finds the best one. With the exact $P$, both take milliseconds. Part 3 asks: what if we didn\'t know $P$?' },
      ],
    },
  ],
}
