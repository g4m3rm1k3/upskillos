// "Design it yourself" for the knapsack and resource lessons (Core, knapsack group). Format: designs.js.

export const KNAPSACK_DESIGNS = {
  'zero-one-knapsack': {
    problem: 'Each item has a weight and a value. Choose each item at most once, keep the total weight within the capacity, and make the total value as large as possible.',
    tryFirst: {
      prompt: 'Items (weight, value): (1, 1), (3, 4), (4, 5), (5, 7). Capacity 7. What is the largest total value?',
      args: [[1, 3, 4, 5], [1, 4, 5, 7], 7], answer: 9,
      misconceptions: [
        { answer: 8, feedback: 'That is the greedy pick: the best value per weight (5, 7) first, then (1, 1). The two middle items together weigh exactly 7 and are worth more.' },
        { answer: 17, feedback: 'That takes every item, which weighs 13. Only 7 fits.' },
      ],
      explain: '(3, 4) + (4, 5) weighs 7 and is worth 9. The best item per weight is not in the best choice, so every item has to be weighed as in or out against the room it leaves.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the best value from the first i items', why: 'It forgets how much room is left. Two choices with the same value but different weights have different futures.' },
        { text: 'D(i, c) = the best value from the first i items within capacity c', right: true, why: 'The items considered so far and the room allowed: everything the next item’s decision needs.' },
        { text: 'D(c) = the best value within capacity c, items used freely', why: 'Without an item index nothing stops an item being used twice. That is the unbounded knapsack.' },
      ] },
      { kind: 'split', ask: 'What is the one question about item i?', options: [
        { text: 'Which item has the best value per weight?', why: 'That is the greedy rule, which gives 8 instead of 9 in the try-first question.' },
        { text: 'Is item i in the knapsack or not?', right: true, why: 'Out: the best is D(i − 1, c). In: it uses w_i of the room, and the rest comes from the first i − 1 items.' },
      ] },
      { kind: 'recurrence', ask: 'When item i fits (w_i ≤ c), which rule fills D(i, c)?', options: [
        { text: 'max(D(i − 1, c), v_i + D(i, c − w_i))', why: 'Row i may already contain item i, so this can take it twice. That is the unbounded rule.' },
        { text: 'max(D(i − 1, c), v_i + D(i − 1, c − w_i))', right: true, why: 'Skip it, or take it once and fill the rest of the room from the earlier items only.' },
        { text: 'v_i + D(i − 1, c − w_i)', why: 'This always takes item i. Skipping has to stay possible, and when the item does not fit, skipping is the only option.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, c) = 0 for every capacity c', right: true, why: 'No items, no value, whatever the room. Leftover room is allowed.' },
        { text: 'D(0, 0) = 0 and every other D(0, c) = −∞', why: 'That is the start for an exact fill (the exact-capacity lesson). Here the capacity is only a limit.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'One row of capacities, updated in place with c increasing', why: 'Increasing c reads cells already updated for item i, so the item gets reused. One row works only with c decreasing.' },
        { text: 'Item by item; in a full 2-D table, capacities in any order', right: true, why: 'Row i reads only row i − 1, so once that row is done, row i can be filled in any order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n − 1, capacity)', why: 'That leaves out the last item.' },
        { text: 'D(n, capacity)', right: true, why: 'All n items considered, with the whole capacity allowed.' },
      ] },
    ],
    apply: { cell: [3, 6] },
  },

  'unbounded-knapsack': {
    problem: 'The 0/1 knapsack, except each item may be taken any number of times. Keep the total weight within the capacity and make the total value as large as possible.',
    tryFirst: {
      prompt: 'Items (weight, value): (3, 5) and (4, 7), as many of each as you like. Capacity 10. What is the largest total value?',
      args: [[3, 4], [5, 7], 10], answer: 17,
      misconceptions: [
        { answer: 14, feedback: 'Two of the better-per-weight item, (4, 7), leave 2 units unused. Mixing one 4 with two 3s fills all 10.' },
        { answer: 12, feedback: 'That takes each item once. Here items can be taken again.' },
        { answer: 15, feedback: 'Three 3s use 9. One 4 and two 3s use all 10 and are worth more.' },
      ],
      explain: '4 + 3 + 3 = 10, worth 7 + 5 + 5 = 17. The question at every capacity is which item went in last, and it may be one already in.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(c) mean?', options: [
        { text: 'The best value within capacity c, any number of each item', right: true, why: 'With reuse allowed there is no need to track which items are used up, so capacity alone is the state.' },
        { text: 'How many copies of the best item fit in c', why: 'That is greedy and uses one item type; mixing types gives 17 where it gives 14.' },
        { text: 'The best value from the first i items within c, each once', why: 'That is the 0/1 knapsack, where an item cannot be taken again.' },
      ] },
      { kind: 'split', ask: 'How do you split the packings of capacity c?', options: [
        { text: 'By whether item i is used', why: '“Used” is no longer yes or no; it is how many times. The last item packed avoids counting copies.' },
        { text: 'By the last item packed: any item that fits, including one already packed', right: true, why: 'Remove that last item and what is left is a packing of capacity c − w, the same question smaller.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(c)?', options: [
        { text: 'The best of v_i · ⌊c / w_i⌋ over the items', why: 'That fills with one item type. Mixing 3s and 4s does better.' },
        { text: 'max(D(c − 1), the best v_i + D(c − w_i) over items with w_i ≤ c)', right: true, why: 'Leave a unit unused, or end with any item that fits. Its rest, D(c − w_i), may include the same item again.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = −∞', why: 'Then nothing can ever be built: every packing shrinks to capacity 0 when its items are removed.' },
        { text: 'D(0) = 0', right: true, why: 'No room, no value. Every other cell comes from the rule.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Capacities increasing', right: true, why: 'D(c) reads smaller capacities. Reading values already improved by an item is exactly what allows reuse.' },
        { text: 'Capacities decreasing', why: 'D(c) reads D(c − w), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(capacity − the lightest weight)', why: 'That throws away room for no reason.' },
        { text: 'D(capacity)', right: true, why: 'D(c) already allows unused room, so the full capacity’s cell is the best.' },
      ] },
    ],
    apply: { cell: [0, 6] },
  },

  'bounded-knapsack': {
    problem: 'Each item may be taken up to a given number of times. Keep the total weight within the capacity and make the total value as large as possible.',
    tryFirst: {
      prompt: 'Item A weighs 2, is worth 3, and there are 3 of them. Item B weighs 3, is worth 5, and there is 1. Capacity 8. What is the largest total value?',
      args: [[2, 3], [3, 5], [3, 1], 8], answer: 11,
      misconceptions: [
        { answer: 13, feedback: 'That uses B twice (3 + 3 + 2), but there is only one B.' },
        { answer: 8, feedback: 'That takes each item once, but there are three As.' },
        { answer: 9, feedback: 'Three As use 6. Swapping one A for the B fits better.' },
      ],
      explain: 'B plus two As weighs 7 and is worth 5 + 3 + 3 = 11. Three As and the B would weigh 9. The count of each item is a real limit.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i, c) = the best value from the first i item types within capacity c', right: true, why: 'As in the 0/1 knapsack. The copies of each type are chosen when its row is filled.' },
        { text: 'D(c) = the best value within c, any number of each', why: 'That is the unbounded knapsack; it ignores the counts.' },
        { text: 'D(i, c, k) with k = copies of every item used so far', why: 'Earlier types are settled once their row is done, so only the current type’s copies matter, and the rule tries them all at once.' },
      ] },
      { kind: 'split', ask: 'What is the choice for item type i?', options: [
        { text: 'In or out', why: 'That allows only one copy, and the type may have several.' },
        { text: 'How many copies q: 0 up to its count, as long as they fit', right: true, why: 'Every legal choice uses some q from 0 to the count, so this covers each one exactly once.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i, c)?', options: [
        { text: 'The best q · v_i + D(i − 1, c − q · w_i) over q = 0 … min(count_i, ⌊c / w_i⌋)', right: true, why: 'Try every number of copies, and fill the rest from the earlier types.' },
        { text: 'max(D(i − 1, c), v_i + D(i, c − w_i))', why: 'That is the unbounded rule: it takes as many copies as fit, ignoring the count.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, c) = 0 for every c', right: true, why: 'No item types yet means no value, whatever the room; leftover room is allowed.' },
        { text: 'D(0, c) = c', why: 'Capacity is room, not value; empty room is worth nothing.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'One row, updated in place with c increasing', why: 'In place and increasing lets the item be reused without limit, which is the unbounded knapsack again.' },
        { text: 'Type by type, each row read from the previous one', right: true, why: 'The rule reads only row i − 1, whatever q is.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n, capacity)', right: true, why: 'Every type considered, with the whole capacity allowed.' },
        { text: 'D(n − 1, capacity)', why: 'That leaves out the last item type, which may be in the best packing.' },
      ] },
    ],
    apply: {
      cell: [1, 8],
      misconceptions: [{ answer: 12, feedback: 'Four copies would fit in 8, but there are only 3.' }],
    },
  },

  'subset-sum': {
    problem: 'Decide whether some of the values (each used at most once) add up to exactly a target.',
    tryFirst: {
      prompt: 'Can some of [3, 5] add up to exactly 6?',
      kind: 'yesno', args: [[3, 5], 6], answer: false,
      misconceptions: [{ answer: true, feedback: '3 + 3 makes 6, but there is only one 3. The possible totals are 0, 3, 5 and 8.' }],
      explain: 'No. The totals you can make are 0, 3, 5 and 3 + 5 = 8. Listing reachable totals, one value at a time, is the whole method.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'R(s) = some values add up to s, values reusable', why: 'Reuse makes 3 + 3 = 6 reachable. Each value can be used once, so the state must say which values are still available.' },
        { text: 'R(i, s) = some of the first i values add up to exactly s', right: true, why: 'Yes or no, for each prefix of the values and each total.' },
        { text: 'R(i) = the sum of the first i values', why: 'That is one choice, all of them. The question is about any choice.' },
      ] },
      { kind: 'split', ask: 'A choice from the first i values that adds up to s: what about value i?', options: [
        { text: 'It is used or not', right: true, why: 'Not used: the first i − 1 values must make s. Used: they must make s − a_i.' },
        { text: 'It is the largest value used', why: 'The order of values does not matter, and the table grows by one value at a time, so ask about the newest value.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills R(i, s)?', options: [
        { text: 'R(i − 1, s) and R(i − 1, s − a_i)', why: 'Either way works, so it is “or”, not “and”.' },
        { text: 'R(i − 1, s) or R(i, s − a_i)', why: 'Row i may already use value i, so this can use it twice.' },
        { text: 'R(i − 1, s) or (a_i ≤ s and R(i − 1, s − a_i))', right: true, why: 'Without value i, or with it once on top of a total the earlier values make.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Every R(0, s) = false', why: 'The empty choice adds up to 0, so R(0, 0) is true. Without it nothing is ever reachable.' },
        { text: 'R(0, 0) = true; R(0, s) = false for s > 0', right: true, why: 'With no values, only the total 0 can be made.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Value by value; with one row, totals decreasing', right: true, why: 'Each row reads the row before. In a single row, going down from the target reads totals not yet updated for this value.' },
        { text: 'One row, totals increasing, updated in place', why: 'Then R(s − a_i) may already include value i, so it is used twice: [3] would reach 6.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'R(n, target − 1)', why: 'Off by one: the target itself is the question.' },
        { text: 'R(n, target)', right: true, why: 'All values available, the exact total asked.' },
      ] },
    ],
    apply: { cell: [3, 7] },
  },

  'equal-partition': {
    problem: 'Split the values into two groups (one may be empty) so that the groups’ totals are as close as possible. Find the smallest difference.',
    tryFirst: {
      prompt: 'Split [8, 7, 6, 5, 4] into two groups. What is the smallest possible difference between their totals?',
      args: [[8, 7, 6, 5, 4]], answer: 0,
      misconceptions: [
        { answer: 4, feedback: 'That is the greedy split: each value, largest first, onto the lighter pile. 8 + 7 against 6 + 5 + 4 is a perfect split.' },
      ],
      explain: '8 + 7 = 15 = 6 + 5 + 4. The total is 30; the question is really whether some group adds up to 15, or near it.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the smallest difference using the first i values', why: 'The difference so far does not say how later values can rebalance it; the reachable totals do.' },
        { text: 'R(i, s) = some of the first i values add up to s: subset sum, totals up to half', right: true, why: 'Choosing one group decides the other: it is everything else. So only one group’s total matters.' },
        { text: 'Two tables, one per group', why: 'The second group is just total − s. Tracking it separately doubles the work and can disagree.' },
      ] },
      { kind: 'split', ask: 'What is the choice for value i?', options: [
        { text: 'Whether it goes in the first group', right: true, why: 'If not, it is in the other group. That is subset sum’s used-or-not choice.' },
        { text: 'Which pile is lighter right now', why: 'That is the greedy rule from the try-first question, which leaves 4 where 0 is possible.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills R(i, s)?', options: [
        { text: 'R(i − 1, s) or R(i − 1, s − a_i)', right: true, why: 'Subset sum unchanged: the new question is only in how the answer is read.' },
        { text: 'R(i − 1, s) or R(i, s − a_i)', why: 'That reuses value i, which the split does not allow.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'R(0, 0) = true, other R(0, s) = false', right: true, why: 'The empty group adds up to 0.' },
        { text: 'R(0, total / 2) = true', why: 'Half the total is what you hope to reach, not where you start.' },
      ] },
      { kind: 'order', ask: 'Which totals do you need?', options: [
        { text: '0 to the total, both halves', why: 'If x is reachable so is total − x (the other group), so the upper half repeats the lower.' },
        { text: '0 to ⌊total / 2⌋, value by value', right: true, why: 'The best split has one group at most half the total, so that range has the answer.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'total − x, for the largest reachable x ≤ total / 2', why: 'That is the other group’s total. The difference is (total − x) − x.' },
        { text: 'total − 2x, for the largest reachable x ≤ total / 2', right: true, why: 'One group holds x, the other total − x; the closer x is to half, the smaller the gap.' },
      ] },
    ],
    apply: {
      cell: [3, 6],
      misconceptions: [{ answer: true, feedback: 'From 3, 1 and 4 the totals are 0, 1, 3, 4, 5, 7 and 8. None is 6.' }],
    },
  },

  'target-signs': {
    problem: 'Put a + or − in front of every value. Count the sign choices that make the total equal a target. A 0 can take either sign, and the two choices count separately.',
    tryFirst: {
      prompt: 'How many ways can you put signs on [1, 1, 1] to make a total of 1?',
      args: [[1, 1, 1], 1], answer: 3,
      misconceptions: [
        { answer: 1, feedback: 'The values are equal, but the positions are not: which of the three 1s gets the minus is a choice.' },
      ],
      explain: '−1 + 1 + 1, +1 − 1 + 1 and +1 + 1 − 1. Each value adds or subtracts, and every prefix lands on some running total.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'C(i, t) = the number of sign choices for the first i values whose total is t', right: true, why: 'Running totals of a prefix, counted.' },
        { text: 'R(i, t) = some sign choice reaches t', why: 'Yes or no cannot count the choices.' },
        { text: 'C(t) = choices making t, values reusable', why: 'Each value is used exactly once, with one sign.' },
      ] },
      { kind: 'split', ask: 'What is the choice for value i?', options: [
        { text: 'Whether value i is used', why: 'Every value gets a sign; none is left out.' },
        { text: 'Its sign: + or −', right: true, why: 'With +, the earlier values made t − a_i; with −, they made t + a_i.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(i, t)?', options: [
        { text: 'C(i − 1, t − a_i) + C(i − 1, t + a_i), counted once when a_i = 0', why: 'For a 0, +0 and −0 are two different choices, and the problem counts both.' },
        { text: 'C(i − 1, t − a_i) + C(i − 1, t + a_i)', right: true, why: 'Both signs, each a different choice. For a 0 both terms are the same cell, which correctly doubles it.' },
        { text: 'max(C(i − 1, t − a_i), C(i − 1, t + a_i))', why: 'Counting adds the two groups; a max keeps one.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0, 0) = 1', right: true, why: 'No values, total 0, one way: no signs at all. Every other total is 0 ways.' },
        { text: 'C(0, t) = 1 for every t', why: 'With no values only the total 0 can be made.' },
      ] },
      { kind: 'order', ask: 'Which totals does the table need?', options: [
        { text: 'From 0 upwards to the target', why: 'Running totals can be negative: 1 − 1 − 1 passes through −1. Use a map or shift the indexes.' },
        { text: 'Every total from −(sum) to +(sum), value by value', right: true, why: 'Any prefix total lies in that range, and each layer reads only the one before.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of C(n, t) over every t', why: 'That is every sign choice, 2ⁿ, whatever the total.' },
        { text: 'C(n, target), or 0 if the target is out of range', right: true, why: 'All values signed, landing on the target.' },
      ] },
    ],
    apply: {
      cell: [2, 3],
      misconceptions: [{ answer: 1, feedback: '+1 − 1 and −1 + 1 are two different sign choices, both totalling 0.' }],
    },
  },

  'coin-min': {
    problem: 'Find the fewest coins that add up to exactly an amount, using any number of each coin value, or say it cannot be done.',
    tryFirst: {
      prompt: 'Coins are 1, 5, 6 and 9. What is the fewest coins that make exactly 11?',
      args: [[1, 5, 6, 9], 11], answer: 2,
      misconceptions: [
        { answer: 3, feedback: 'That is the greedy answer: 9, then 1 and 1. The biggest coin first is not always best: 5 + 6.' },
      ],
      explain: '5 + 6. Greedy takes 9 and then needs two 1s. Every possible last coin has to be tried.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(a) mean?', options: [
        { text: 'The fewest coins making exactly a', right: true, why: 'The same question for a smaller amount.' },
        { text: 'The fewest coins making at most a', why: 'Coming in under is not allowed; the amount must be exact.' },
        { text: 'How many of the largest coin fit in a', why: 'That is greedy, which gives 3 for 11.' },
      ] },
      { kind: 'split', ask: 'A best set of coins for a: what do you look at?', options: [
        { text: 'Its last coin, which can be any coin up to a', right: true, why: 'Remove it and the rest makes a − c, which should itself use the fewest coins.' },
        { text: 'Its largest coin', why: 'Asking for the largest is the greedy idea; any coin can be the one removed, and you need to try each.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(a)?', options: [
        { text: 'min over coins c ≤ a of D(a − c)', why: 'It forgets to count the coin just removed.' },
        { text: '1 + D(a − the largest coin ≤ a)', why: 'Greedy again: one choice instead of all of them.' },
        { text: '1 + min over coins c ≤ a of D(a − c)', right: true, why: 'One coin, plus the fewest for what is left, over every possible last coin.' },
      ] },
      { kind: 'base', ask: 'What starts the table, and how is “impossible” stored?', options: [
        { text: 'D(0) = 0; impossible amounts are 0', why: '0 looks like the cheapest, so the min would choose it, and impossible amounts would look free.' },
        { text: 'D(0) = 0; an amount no coins can make is ∞', right: true, why: 'Zero coins make 0. ∞ never wins a min, and 1 + ∞ stays ∞.' },
        { text: 'D(0) = 1', why: 'Making 0 takes no coins, and every count above it would be one too high.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Amounts increasing', right: true, why: 'D(a) reads smaller amounts.' },
        { text: 'Largest coin first, over all amounts', why: 'Each amount needs every coin tried; the order that matters is by amount.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(amount), or −1 if it is ∞', right: true, why: 'The cell is the answer; the contract wants −1 for impossible.' },
        { text: 'D(amount), even when it is ∞', why: 'Infinity is how the table marks impossible; the problem asks for −1.' },
      ] },
    ],
    apply: {
      cell: [0, 6],
      misconceptions: [{ answer: 3, feedback: '3 is greedy: 4 + 1 + 1. Try every last coin: 3 leaves 3, which is one coin.' }],
    },
  },

  'coin-combinations': {
    problem: 'Count the different collections of coins (order does not matter) that add up to exactly an amount, using any number of each coin value.',
    tryFirst: {
      prompt: 'Coins are 1, 2 and 5. How many different collections make exactly 5?',
      args: [[1, 2, 5], 5], answer: 4,
      misconceptions: [
        { answer: 9, feedback: 'That counts orders: 1 + 2 + 2 and 2 + 1 + 2 are the same collection.' },
      ],
      explain: '5; 2 + 2 + 1; 2 + 1 + 1 + 1; 1 + 1 + 1 + 1 + 1. Sort each collection and count it once: decide how many 5s, then how many 2s, then the rest is 1s.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'W(a) = the sum of W(a − c) over every coin c', why: 'That splits by the last coin, which counts each order separately: it is the permutations lesson.' },
        { text: 'W(k, a) = collections making a using only the first k coin values', right: true, why: 'Limiting which coins are allowed lets each collection be built in one sorted way.' },
        { text: 'The fewest coins making a', why: 'That is a minimum; the question counts collections.' },
      ] },
      { kind: 'split', ask: 'A collection using the first k coin values: what is the split?', options: [
        { text: 'It uses coin k at least once, or not at all', right: true, why: 'Not at all: a collection of the first k − 1 values. At least once: remove one coin k and it is still a collection of the first k values.' },
        { text: 'Its last coin added', why: 'A collection has no order, so there is no last coin; asking for one counts each order.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills W(k, a)?', options: [
        { text: 'W(k − 1, a) + W(k − 1, a − c_k)', why: 'This allows coin k only once, the 0/1 version.' },
        { text: 'W(k − 1, a) + W(k, a − c_k)', right: true, why: 'No coin k, or one more coin k on a collection that may already have some.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'W(0, 0) = 1 and W(0, a) = 0 for a > 0', right: true, why: 'No coin values allowed: only the empty collection, which makes 0.' },
        { text: 'W(0, a) = 1 for every a', why: 'With no coins, only 0 can be made.' },
      ] },
      { kind: 'order', ask: 'With one row of amounts, which loop goes outside?', options: [
        { text: 'Amounts outside, coins inside', why: 'Then every amount can end with any coin, which counts orders: permutations.' },
        { text: 'Coin values outside, amounts increasing inside', right: true, why: 'Each coin value is added in one pass, so every collection is built in one sorted order.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(number of coin values, amount)', right: true, why: 'All coin values allowed, exact amount.' },
        { text: 'The sum of W(k, amount) over k', why: 'Each row already includes the earlier rows’ collections, so this counts them again.' },
      ] },
    ],
    apply: { cell: [2, 4] },
  },

  'coin-permutations': {
    problem: 'Count the ordered sequences of coins that add up to exactly an amount (1 + 2 and 2 + 1 are different), using any number of each coin value.',
    tryFirst: {
      prompt: 'Coins are 1 and 2. How many ordered sequences add up to 4?',
      args: [[1, 2], 4], answer: 5,
      misconceptions: [
        { answer: 3, feedback: 'That counts collections. Order matters here: 1 + 1 + 2, 1 + 2 + 1 and 2 + 1 + 1 are three sequences.' },
      ],
      explain: '1+1+1+1, 2+1+1, 1+2+1, 1+1+2, 2+2. Group them by their last coin: those ending in 1 are the sequences for 3, those ending in 2 the sequences for 2.',
    },
    steps: [
      { kind: 'state', ask: 'What should C(a) mean?', options: [
        { text: 'The number of ordered sequences adding up to exactly a', right: true, why: 'The same question for a smaller amount.' },
        { text: 'W(k, a), collections by coin value', why: 'That counts each collection once: the combinations lesson.' },
      ] },
      { kind: 'split', ask: 'How do you split the sequences for a?', options: [
        { text: 'By how many coins they use', why: 'That needs a second index, the number of coins.' },
        { text: 'By the last coin', right: true, why: 'Each sequence has one last coin; remove it and you have a sequence for a − c.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(a)?', options: [
        { text: 'C(a) = C(a − 1) + C(a − 2)', why: 'That is right only for coins 1 and 2. In general there is one term per coin.' },
        { text: 'C(a) = the sum of C(a − c) over coins c ≤ a', right: true, why: 'One term per possible last coin, added because the groups never overlap.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0) = 1: the empty sequence', right: true, why: 'A one-coin sequence c is counted as C(c − c) = C(0).' },
        { text: 'C(0) = 0', why: 'Then every count is 0, because every sequence shrinks to the empty one when its coins are removed.' },
      ] },
      { kind: 'order', ask: 'With one row, which loop goes outside?', options: [
        { text: 'Amounts outside, coins inside', right: true, why: 'Each amount tries every last coin, so every order is counted.' },
        { text: 'Coins outside, amounts inside', why: 'That builds each collection in one sorted order: combinations, 3 for 4 instead of 5.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'C(amount)', right: true, why: 'Sequences adding up to the amount.' },
        { text: 'The sum of every C(a)', why: 'That counts sequences for every smaller amount too.' },
      ] },
    ],
    apply: {
      cell: [0, 5],
      misconceptions: [{ answer: 3, feedback: '3 counts collections of 5 from 1s and 2s. Sequences: C(4) + C(3).' }],
    },
  },

  'value-knapsack': {
    problem: 'Each item has a weight and a value; choose each at most once within a capacity. The weights and the capacity can be huge (up to a billion), but the values are small.',
    tryFirst: {
      prompt: 'Weights [5, 7, 9, 11], values [2, 3, 4, 6], capacity 16. What is the largest total value?',
      args: [[5, 7, 9, 11], [2, 3, 4, 6], 16], answer: 8,
      misconceptions: [
        { answer: 7, feedback: '7 + 9 fills 16 exactly, but 5 + 11 also fits and is worth 2 + 6 = 8.' },
        { answer: 15, feedback: 'That takes every item, which weighs 32.' },
      ],
      explain: '5 + 11 = 16 is worth 8. Now imagine the weights were in the billions: a table over capacities could not be built, but values here add up to only 15.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i, c) = the best value within capacity c, as in the 0/1 knapsack', why: 'Capacity can be 10⁹: the table would need a billion columns.' },
        { text: 'W(i, v) = the least weight that makes exactly value v from the first i items', right: true, why: 'Swap the roles: index by value, which is small, and store weight, which is minimised.' },
        { text: 'W(v) = the least weight for value v, items reusable', why: 'Each item is used at most once, so the item index has to stay.' },
      ] },
      { kind: 'split', ask: 'What is the choice for item i?', options: [
        { text: 'In or out', right: true, why: 'The same choice as the 0/1 knapsack; only what the table stores has changed.' },
        { text: 'Whether it has the best value per weight', why: 'Greedy, which fails for the same reason as in the 0/1 knapsack.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills W(i, v)?', options: [
        { text: 'max(W(i − 1, v), w_i + W(i − 1, v − v_i))', why: 'The goal is the lightest way to make v; the lighter it is, the more likely it fits.' },
        { text: 'min(W(i − 1, v), w_i + W(i − 1, v − v_i))', right: true, why: 'Without item i, or with it, adding its weight to the lightest way to make the rest of the value.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'W(0, v) = 0 for every v', why: 'Then every value looks free to make, with no items at all.' },
        { text: 'W(0, 0) = 0; every other W(0, v) = ∞', right: true, why: 'No items make value 0 at no weight, and nothing else.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Item by item, values from 0 to the total of all values', right: true, why: 'Row i reads row i − 1; values never exceed the sum of all values.' },
        { text: 'Capacities increasing', why: 'There is no capacity index any more; that was the problem.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(n, the total of all values)', why: 'That is a weight, the weight of taking everything, which may not fit.' },
        { text: 'The largest v with W(n, v) ≤ capacity', right: true, why: 'Each v that can be made light enough fits; the best is the largest.' },
      ] },
    ],
    apply: {
      cell: [3, 3],
      misconceptions: [{ answer: 10, feedback: '10 is W(2,3), using the first two items. The third item alone makes value 3 at weight 8.' }],
    },
  },

  'multidimensional-knapsack': {
    problem: 'Each item has a weight, a volume and a value; choose each at most once so that the total weight and the total volume both stay within their limits. Make the total value as large as possible.',
    tryFirst: {
      prompt: 'Items (weight, volume, value): (1, 3, 5), (1, 3, 5), (3, 2, 6). Weight limit 4, volume limit 4. What is the largest total value?',
      args: [[[1, 3, 5], [1, 3, 5], [3, 2, 6]], 4, 4], answer: 6,
      misconceptions: [
        { answer: 11, feedback: '(1, 3, 5) + (3, 2, 6) weighs 4, which fits, but takes 5 units of volume.' },
        { answer: 10, feedback: 'The two light items take 6 units of volume.' },
      ],
      explain: 'Every pair breaks a limit, so one item: the 6. Checking weight alone gives 11; both limits shape what fits.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i, w) = the best value within weight w, and check volume at the end', why: 'A better choice by weight may break the volume limit. Choices with the same weight but different volumes have different futures.' },
        { text: 'D(i, w, u) = the best value from the first i items with weight ≤ w and volume ≤ u', right: true, why: 'Every limited resource becomes an index.' },
      ] },
      { kind: 'split', ask: 'What is the choice for item i?', options: [
        { text: 'In or out', right: true, why: 'As in the 0/1 knapsack: out leaves both budgets alone, in uses some of each.' },
        { text: 'In or out, and whether it is heavier than it is bulky', why: 'Only fitting matters, not how weight compares with volume.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(i, w, u)?', options: [
        { text: 'max(skip, val_i + D(i − 1, w − w_i, u)) when the weight fits', why: 'That checks weight only, not volume.' },
        { text: 'max(D(i − 1, w, u), val_i + D(i − 1, w − w_i, u − u_i)) when both fit', right: true, why: 'Taking the item uses up both resources.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, w, u) = 0 for every w and u', right: true, why: 'No items, no value, whatever the limits.' },
        { text: 'D(0, 0, 0) = 0 and the rest −∞', why: 'That is the start for filling both limits exactly. Here they are only limits.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Item by item; within an item, any (w, u) order in a full table', right: true, why: 'Layer i reads only layer i − 1. (With one shared layer, go down in both w and u.)' },
        { text: 'One shared layer, w and u increasing', why: 'That reads cells already updated for item i, so it can be taken twice.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n, weight limit, volume limit)', right: true, why: 'All items, both full limits.' },
        { text: 'The smaller of D(n, weight limit) and D(n, volume limit) from two separate tables', why: 'Each separate table ignores the other limit, so even the smaller may break one.' },
      ] },
    ],
    apply: { cell: [17, 3], misconceptions: [
      { answer: 3, feedback: 'That leaves item 2 out. Taking it uses weight 3 and volume 2, leaving D(1,2,1) = 3 for item 1: 4 + 3.' },
      { answer: 4, feedback: 'That takes item 2 alone. With weight 2 and volume 1 left, item 1 still fits: D(1,2,1) = 3.' },
    ] },
  },

  'group-knapsack': {
    problem: 'Items come in groups, and from each group you may choose at most one option. Keep the total weight within the capacity and make the total value as large as possible.',
    tryFirst: {
      prompt: 'Group 1 offers (weight 1, value 4) or (weight 1, value 5). Group 2 offers (weight 3, value 5). Capacity 2. What is the largest total value?',
      args: [[[[1, 4], [1, 5]], [[3, 5]]], 2], answer: 5,
      misconceptions: [
        { answer: 9, feedback: 'Both options of group 1 together would fit, but only one option per group is allowed.' },
      ],
      explain: 'Group 2 is too heavy, and group 1 allows one option: the 5. Treating every option as its own item gives 9.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i, c) over all the options as separate items', why: 'Then two options from one group could both be taken.' },
        { text: 'D(g, c) = the best value from the first g groups within capacity c', right: true, why: 'Groups play the role items played: one decision per group.' },
      ] },
      { kind: 'split', ask: 'What is the choice for group g?', options: [
        { text: 'Which of its options to take, or none', right: true, why: 'Exactly the choices the rule allows, each counted once.' },
        { text: 'Each option in or out', why: 'That allows several options from the same group.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(g, c)?', options: [
        { text: 'max(D(g − 1, c), the best v + D(g − 1, c − w) over the group’s options that fit)', right: true, why: 'Skip the group, or take one option on top of the earlier groups only.' },
        { text: 'max(D(g − 1, c), the best v + D(g, c − w))', why: 'Reading row g lets a second option from the same group join.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, c) = 0', right: true, why: 'No groups considered yet means no value, whatever the room.' },
        { text: 'D(0, c) = the best single option that fits in c', why: 'That is the first group’s row, not the empty start.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'Option by option, updating one row in place', why: 'The second option of a group would read capacities already improved by the first: both from one group.' },
        { text: 'Group by group; each new row read only from the previous one', right: true, why: 'All of a group’s options compete for the same old row, so at most one of them gets in.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(number of groups, capacity)', right: true, why: 'Every group considered, the whole capacity.' },
        { text: 'D(G, C), but with the skip term removed', why: 'That is the exactly-one-per-group variant. Here a group may be skipped.' },
      ] },
    ],
    apply: { cell: [3, 2], misconceptions: [
      { answer: 5, feedback: 'That takes nothing from group 3. Its option 1/2 fits on top of D(2,1) = 4: 2 + 4.' },
    ] },
  },

  'exact-capacity': {
    problem: 'Choose items (each at most once) whose weights add up to exactly the capacity. Make the total value as large as possible, or report −1 if no choice fills it exactly.',
    tryFirst: {
      prompt: 'Items (weight, value): (2, 5) and (3, 4). Fill exactly 3. What is the largest value?',
      args: [[2, 3], [5, 4], 3], answer: 4,
      misconceptions: [
        { answer: 5, feedback: '(2, 5) weighs 2, which leaves 1 unused. An exact fill needs weight 3.' },
      ],
      explain: 'Only (3, 4) weighs exactly 3. The better item at a smaller weight does not count, and the table has to know the difference.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(i, c) mean?', options: [
        { text: 'The best value from the first i items with weight at most c', why: 'That is the ordinary knapsack, which accepts leftover room.' },
        { text: 'The best value from the first i items whose weights add up to exactly c', right: true, why: 'The question, for each prefix of items and each exact weight.' },
      ] },
      { kind: 'split', ask: 'What is the choice for item i?', options: [
        { text: 'In or out', right: true, why: 'As in the 0/1 knapsack: out reads D(i − 1, c), in reads D(i − 1, c − w_i).' },
        { text: 'In only if it fills c exactly', why: 'An item can be part of an exact fill without filling it alone.' },
      ] },
      { kind: 'recurrence', ask: 'Does the rule change from the at-most knapsack?', options: [
        { text: 'Yes: take item i only when w_i = c', why: 'The take reads D(i − 1, c − w_i), which is already an exact fill by its meaning.' },
        { text: 'No: max(D(i − 1, c), v_i + D(i − 1, c − w_i)); only the starting values change', right: true, why: 'Exactness comes from the base cases: impossible cells stay impossible through the rule.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, c) = 0 for every c', why: 'That is the at-most start: it says nothing fills 3 with value 0, when really nothing fills 3 at all.' },
        { text: 'D(0, 0) = 0; every other D(0, c) = −∞', right: true, why: 'With no items only weight 0 is filled. −∞ plus a value stays −∞, so an impossible fill never wins.' },
        { text: 'D(0, 0) = 0; every other D(0, c) = −1', why: '−1 is a value: −1 + 5 = 4 would look like a real fill.' },
      ] },
      { kind: 'order', ask: 'How do you fill it?', options: [
        { text: 'As the 0/1 knapsack: item by item (one row: c decreasing)', right: true, why: 'Only the starting values changed.' },
        { text: 'Exact capacities first, then the rest', why: 'Every cell is an exact capacity here; the order is by item, as before.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(n, capacity), or −1 if it is −∞', right: true, why: 'The exact fill of the full capacity, if one exists.' },
        { text: 'The best D(n, c) over c ≤ capacity', why: 'That is the at-most answer again.' },
      ] },
    ],
    apply: {
      cell: [2, 5],
      misconceptions: [{ answer: 5, feedback: '(2, 5) alone weighs 2, not 5. With (3, 4) it fills 5 exactly: 5 + 4.' }],
    },
  },

  'rod-cutting': {
    problem: 'A rod of length n is cut into whole-length pieces, and a piece of length k sells for prices[k − 1]. The whole rod must be sold. Find the most money it can make.',
    tryFirst: {
      prompt: 'Prices for lengths 1 to 4 are 1, 5, 8, 9. What is the most a rod of length 4 can make?',
      args: [[1, 5, 8, 9], 4], answer: 10,
      misconceptions: [
        { answer: 9, feedback: 'Selling it whole gives 9, and 3 + 1 gives 8 + 1 = 9 too. Two pieces of length 2 give 5 + 5.' },
      ],
      explain: '2 + 2 sells for 10. Every rod has a first piece; after it, what is left is a shorter rod, the same question.',
    },
    steps: [
      { kind: 'state', ask: 'What should R(n) mean?', options: [
        { text: 'The best revenue from a rod of length n', right: true, why: 'The same question for a shorter rod.' },
        { text: 'The price of a piece of length n', why: 'That is the input; selling whole is only one option.' },
        { text: 'The best price of a single piece no longer than n', why: 'The whole rod must be sold, usually in several pieces.' },
      ] },
      { kind: 'split', ask: 'How do you split the ways to cut a rod of length n?', options: [
        { text: 'By the length k of the first piece', right: true, why: 'Every cutting has one first piece. The rest is a rod of length n − k, cut the best way.' },
        { text: 'By the number of cuts', why: 'That needs a second index; the first piece’s length does not.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills R(n)?', options: [
        { text: 'max(prices[n − 1], R(n − 1) + prices[0])', why: 'Only “whole” or “one short piece”. It misses 2 + 2.' },
        { text: 'The best prices[k − 1] + R(n − k) over k = 1 … min(n, number of prices)', right: true, why: 'Try every first piece, and sell the rest the best way.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'R(0) = 0', right: true, why: 'A rod of length 0 sells for nothing. A rod sold whole is k = n, reading R(0).' },
        { text: 'R(1) = prices[0], and R(0) is not needed', why: 'Selling the whole rod as one piece reads R(0), so it is needed.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'Lengths increasing', right: true, why: 'R(n) reads only shorter rods, R(n − k), so they are ready.' },
        { text: 'Most expensive piece first', why: 'Prices are inputs; the cells to fill are lengths.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'R(n)', right: true, why: 'The best for the rod you have.' },
        { text: 'The best R(k) over k ≤ n', why: 'The whole rod must be sold, so shorter rods are not the answer.' },
      ] },
    ],
    apply: { cell: [0, 6] },
  },
}
