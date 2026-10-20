// "Check yourself" for the knapsack lessons (Core, knapsack group). Format and checks: checks.js and
// checks.test.js. Every typed number was printed by the brute-force oracles before it was typed; the
// wrong answers that another lesson's oracle gives (the unbounded or 0/1 answer) are in CLAIMS.

export const KNAPSACK_CHECKS = {
  'zero-one-knapsack': [
    {
      know: 'D(i, c) is the best value from the first i items within capacity c: skip item i, or take it once and add its value to D(i − 1, c − w_i).',
      ask: 'weights = [1, 2, 3], values = [6, 10, 12], capacity 5. What is the largest total value?',
      args: [[1, 2, 3], [6, 10, 12], 5], answer: 22,
      misconceptions: [
        { answer: 16, feedback: '16 is the greedy choice: take the best value per unit of weight first (6, then 10), and then the 12 no longer fits. The two heavier items fill the capacity exactly and are worth more.' },
        { answer: 30, feedback: '30 takes the first item five times. Each item may be taken only once; that is the unbounded knapsack.' },
        { answer: 28, feedback: '28 is all three items, but they weigh 6.' },
      ],
      explain: 'Items 2 and 3 weigh 5 and are worth 10 + 12 = 22. Item 1 with either of them is worth less: 16 or 18.',
    },
    {
      know: 'The table has a row for each item and a column for every capacity from 0 to C, so it has n × (C + 1) cells.',
      ask: 'With 50 items and a capacity of 1,000,000,000, why is the table a poor plan?',
      options: [
        { text: 'It has 50 billion cells: its size grows with the capacity’s value, not with how many digits it has', right: true, why: 'The method is called pseudo-polynomial for this reason. When the values are small, the value-indexed table is the way round it.' },
        { text: 'It would try all 2⁵⁰ choices of items', why: 'The table never lists choices; avoiding that is its whole point. Its problem is the number of columns.' },
        { text: 'The values could be too large to add up', why: 'The values are added, never used as indices. The capacity is what sets the table’s width.' },
      ],
    },
    {
      know: 'In the fractional knapsack you may take part of an item and get that fraction of its value.',
      ask: 'Which method solves the fractional knapsack?',
      options: [
        { text: 'The same table, with fractions of capacity as columns', why: 'There is no finite list of fractions to index by, and none is needed: a simple rule is exact.' },
        { text: 'Greedy: take items in order of value per unit of weight, and a part of the first one that doesn’t fit', right: true, why: 'With parts allowed, no capacity is ever wasted, so the best value per unit should always fill the next unit. Greedy fails the 0/1 version only because a whole item may not fit.' },
        { text: 'Neither: greedy fails here too, and the table can’t take fractions', why: 'Greedy is exact for fractions. In the check above it takes 6 and 10, then two thirds of the 12: 24, more than the 0/1 answer.' },
      ],
    },
  ],

  'unbounded-knapsack': [
    {
      know: 'With unlimited copies, D(c) = max over items that fit of v_i + D(c − w_i): the last item taken could be any of them.',
      ask: 'weights = [2, 3], values = [3, 5], capacity 7. What is the largest total value?',
      args: [[2, 3], [3, 5], 7], answer: 11,
      misconceptions: [
        { answer: 10, feedback: '10 is the greedy fill: as many of the better item per unit of weight (the 3) as fit, two of them, and then 1 unit is left empty.' },
        { answer: 8, feedback: '8 takes each item once, the 0/1 answer. Here items may be repeated.' },
      ],
      explain: '2 + 2 + 3 fills all 7 units: 3 + 3 + 5 = 11. Two 3s leave a unit unused.',
    },
    {
      know: 'The 0/1 table needs an item index i; the unbounded table D(c) has only the capacity.',
      ask: 'Why can the unbounded knapsack drop the item index?',
      options: [
        { text: 'Taking an item leaves the same items available, so what remains is the same problem with less capacity', right: true, why: 'In the 0/1 knapsack, taking an item removes it, so the rest of the problem depends on which items are left. Here nothing is used up except capacity.' },
        { text: 'Because the items are sorted by weight first', why: 'No sorting is needed. The reason is that every item stays available.' },
        { text: 'It can’t: it needs D(i, c) to stop an item being taken twice', why: 'Taking an item twice is allowed here. Only the 0/1 version must prevent it.' },
      ],
    },
    {
      know: 'An item’s value per unit of weight is its value divided by its weight.',
      ask: 'Must the item with the best value per unit appear in some best answer?',
      options: [
        { text: 'Yes: repeating it is always at least as good', why: 'Leftover capacity can waste it. Capacity 4 with items (3, 4) and (4, 5): the first has the better rate, but the best answer is the second, 5.' },
        { text: 'Yes, if it is also the lightest item', why: 'Capacity 4 with items (3, 4) and (4, 5): the first is lighter and has the better rate, and still loses to the second.' },
        { text: 'No: what counts is the total value of a fill, and a slightly worse rate can use the capacity better', right: true, why: 'Capacity 4 with items (3, 4) and (4, 5): (3, 4) has the better rate but leaves a unit empty, and the best answer is (4, 5) for 5.' },
      ],
    },
  ],

  'bounded-knapsack': [
    {
      know: 'Each item may be taken up to counts[i] times, so D(i, c) tries 0, 1, … copies of item i, as many as the count and the capacity allow.',
      ask: 'weights = [2, 3], values = [3, 5], counts = [3, 1], capacity 9. What is the largest total value?',
      args: [[2, 3], [3, 5], [3, 1], 9], answer: 14,
      misconceptions: [
        { answer: 15, feedback: '15 is three of the second item, but its count is 1. That is the unbounded answer.' },
        { answer: 8, feedback: '8 takes each item once, the 0/1 answer. The first item may be taken three times.' },
      ],
      explain: 'Three of the first item and one of the second weigh 6 + 3 = 9 and are worth 9 + 5 = 14.',
    },
    {
      know: 'An item with count 13 could be replaced by 13 copies of it in a 0/1 knapsack, but bundles are faster: a bundle of k copies is one 0/1 item with k times the weight and value.',
      ask: 'Which bundles can replace the 13 copies?',
      options: [
        { text: '1, 2, 4 and 6 copies', right: true, why: 'Every number from 0 to 13 is a sum of some of these, each used once, and none goes over 13. Four items instead of thirteen.' },
        { text: '1, 2, 4 and 8 copies: powers of two make any number', why: 'Together they make up to 15, so the 0/1 knapsack could take 14 or 15 copies, more than the count allows.' },
        { text: 'One bundle of 13', why: 'Then the only choices are 0 or 13 copies. Taking 5 would be impossible.' },
      ],
    },
    {
      know: 'An item of weight w can be taken at most ⌊C / w⌋ times before the capacity C runs out.',
      ask: 'When does the bounded knapsack give the same answer as the unbounded one?',
      options: [
        { text: 'When every count is at least ⌊C / w_i⌋', right: true, why: 'Then the counts never stop a choice the capacity allows, so they never matter.' },
        { text: 'When every count is at least 1', why: 'A count of 1 can still be the limit: in the check above, the second item’s count of 1 changes the answer from 15 to 14.' },
        { text: 'Never: counts always change the answer', why: 'A count larger than the capacity allows can never be reached, so it changes nothing.' },
      ],
    },
  ],

  'subset-sum': [
    {
      know: 'can[s] says whether some of the values seen so far add up to s; each value v adds can[s] |= can[s − v].',
      ask: 'values = [4, 6, 9], target 11. Can some of them add up to exactly 11?',
      kind: 'yesno', args: [[4, 6, 9], 11], answer: false,
      misconceptions: [
        { answer: true, feedback: 'List the sums: 4, 6, 9, 10, 13, 15 and 19. None is 11.' },
      ],
      explain: 'The reachable sums are 0, 4, 6, 9, 10, 13, 15 and 19, so can[11] stays false.',
    },
    {
      know: 'The table is indexed by sums from 0 to the target.',
      ask: 'If some values may be negative, what breaks?',
      options: [
        { text: 'Nothing: the same table works', why: 'A running sum can drop below 0 or rise past the target and still come back, and those sums have no column.' },
        { text: 'Partial sums can leave the range 0 to target and come back; index from the most negative possible sum to the most positive instead', right: true, why: 'Shift every sum by the total of the negative values, so the lowest possible sum becomes column 0.' },
        { text: 'The problem can no longer be solved with a table', why: 'It can: only the range of the sum index changes.' },
      ],
    },
    {
      know: 'The table has a column for every sum up to the target. Listing every subset of 30 values means 2³⁰, about a billion, sums.',
      ask: '30 values and a target near 10⁹: what is the better plan?',
      options: [
        { text: 'The table: its cost doesn’t depend on the target', why: 'It does: one column per sum up to the target, a billion columns.' },
        { text: 'Sort the values and take the largest that fit', why: 'Greedy can miss: [6, 5, 5] with target 10 takes the 6 and stops.' },
        { text: 'Split the values into two halves, list each half’s 2¹⁵ sums, and look for two that add up to the target', right: true, why: 'Meet in the middle: about 33,000 sums per half, sorted or put in a set, instead of a billion columns or a billion subsets.' },
      ],
    },
  ],

  'equal-partition': [
    {
      know: 'The best split puts one group’s total as close to half of the whole as possible: find every reachable sum up to half the total.',
      ask: 'values = [3, 3, 2, 2, 2]. What is the smallest difference between the two groups’ totals?',
      args: [[3, 3, 2, 2, 2]], answer: 0,
      misconceptions: [
        { answer: 2, feedback: '2 is the greedy split: give each value, largest first, to the lighter group. That gives 3 + 2 + 2 against 3 + 2. Greedy can’t see that the two 3s belong together.' },
        { answer: 12, feedback: '12 is the total. The question is the difference between the two groups.' },
      ],
      explain: '3 + 3 = 6 and 2 + 2 + 2 = 6. The total is 12, and 6 is reachable, so the difference is 0.',
    },
    {
      know: 'A difference of 0 needs one group to total exactly half of the whole.',
      ask: 'Which of these makes a difference of 0 impossible straight away?',
      options: [
        { text: 'An odd number of values', why: '[1, 2, 3] has three values and splits as 3 against 1 + 2.' },
        { text: 'All the values being different', why: '[1, 2, 3] again: all different, and the groups tie.' },
        { text: 'An odd total', right: true, why: 'Half of an odd total isn’t a whole number, so no group of whole numbers can reach it.' },
      ],
    },
    {
      know: 'For two groups, one reachable sum decides the split. Three groups of equal total is a different question.',
      ask: 'Can you split into three equal groups by finding one group, removing it, and splitting the rest in two?',
      options: [
        { text: 'Yes: any group that reaches a third of the total will do', why: '[1, 1, 1, 2, 2, 2] totals 9. Removing 1 + 1 + 1 leaves three 2s, which can’t make 3 and 3, though 1 + 2 three times works.' },
        { text: 'No: the first group can take values the others need; the state must track two groups’ sums together', right: true, why: 'With [1, 1, 1, 2, 2, 2], taking the three 1s first ruins it. A table over pairs (sum of group 1, sum of group 2) keeps every option open.' },
        { text: 'Yes, if you always take the largest values first', why: 'Largest first is still a guess about which values go together; only a table that keeps both sums tries all of them.' },
      ],
    },
  ],

  'target-signs': [
    {
      know: 'ways[s] counts the sign choices so far with running total s. Each value v moves every count to s + v and to s − v.',
      ask: 'values = [1, 2, 3, 0], target 0. How many sign choices make the total 0?',
      args: [[1, 2, 3, 0], 0], answer: 4,
      misconceptions: [
        { answer: 2, feedback: '2 is the count for 1, 2 and 3: +1 +2 −3 and −1 −2 +3. The 0 can be +0 or −0, and the two choices count separately, so each doubles.' },
        { answer: 16, feedback: '16 is every sign choice, 2⁴. Only those whose total is 0 count.' },
      ],
      explain: '+1 +2 −3 and −1 −2 +3, each with +0 or −0: 4.',
    },
    {
      know: 'Call P the sum of the values given +, and N the sum given −. Then P − N = target and P + N = total.',
      ask: 'Why are there no ways at all when total + target is odd?',
      options: [
        { text: 'Adding the two equations gives P = (total + target) / 2, which must be a whole number', right: true, why: 'P is a sum of whole numbers. So the problem is counting subsets that add up to (total + target) / 2, and an odd numerator means none.' },
        { text: 'Because the number of values is odd', why: '[1, 2, 3, 0] has four values, but [1, 2, 3] has three and still reaches 0 in two ways. The parity that matters is of total + target.' },
        { text: 'It isn’t always: some odd cases have solutions', why: 'P − N and P + N always have the same parity, since they differ by 2N. An odd sum of them can’t occur.' },
      ],
    },
    {
      know: 'A running total of signed values can be negative.',
      ask: 'What range of running totals does the table need?',
      options: [
        { text: '0 to the target', why: 'Totals can dip below 0 or above the target on the way: +1 −2 +3 passes through −1.' },
        { text: '0 to the sum of all values', why: 'A total that starts with a minus sign is negative; those states need columns too.' },
        { text: '−S to S, where S is the sum of the absolute values, stored with an offset of S', right: true, why: 'Every running total lies in that range. Column s + S holds total s, so the indices start at 0.' },
      ],
    },
  ],

  'coin-min': [
    {
      know: 'D(a) is the fewest coins making amount a: 1 + the smallest D(a − c) over the coins c that fit, with D(0) = 0.',
      ask: 'coins = [1, 3, 4], amount 6. What is the fewest coins?',
      args: [[1, 3, 4], 6], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 is greedy: the largest coin first, 4 + 1 + 1. Two 3s are better.' },
      ],
      explain: '3 + 3. D(6) = 1 + min(D(5), D(3), D(2)) = 1 + min(2, 1, 2) = 2.',
    },
    {
      know: 'The answer is −1 when no collection of coins makes the amount exactly.',
      ask: 'coins = [4, 6], amount 9. What is the answer?',
      args: [[4, 6], 9], answer: -1,
      misconceptions: [
        { answer: 2, feedback: '4 + 6 makes 10, not 9. The amount must be made exactly.' },
      ],
      explain: 'Both coins are even, so every collection makes an even amount, and 9 is odd. D(9) stays ∞, reported as −1.',
    },
    {
      know: 'Counting collections needs the coins in the outer loop; counting ordered sequences needs the amounts in the outer loop.',
      ask: 'For the fewest coins, does it matter which loop is outer?',
      options: [
        { text: 'Yes: coins outer, or it counts orders', why: 'Orders matter when you add up counts, because each order is a different sum term. A minimum is the same however many orders reach it.' },
        { text: 'Yes: amounts outer, or it misses combinations', why: 'Either order lets every coin reach every amount it fits, so no combination is missed.' },
        { text: 'No: either order computes the same minimum', right: true, why: 'The fewest coins for an amount doesn’t depend on the order the coins are tried in. Only counting is sensitive to it.' },
      ],
    },
  ],

  'coin-combinations': [
    {
      know: 'With the coins in the outer loop, ways[t] += ways[t − c] builds each collection in coin order, so each is counted once.',
      ask: 'coins = [1, 2, 3], amount 4. How many collections make 4?',
      args: [[1, 2, 3], 4], answer: 4,
      misconceptions: [
        { answer: 7, feedback: '7 counts orders: 1 + 3 and 3 + 1 as two. That is the amounts-outer loop, the next lesson’s question.' },
        { answer: 3, feedback: 'Check the list: 1 + 1 + 1 + 1, 1 + 1 + 2, 2 + 2 and 1 + 3.' },
      ],
      explain: '1 + 1 + 1 + 1, 1 + 1 + 2, 2 + 2 and 1 + 3.',
    },
    {
      know: 'In the coins-outer loop, t runs upward, so ways[t − c] already includes this coin, which is what lets it be used again.',
      ask: 'How do you count collections that use each coin at most once?',
      options: [
        { text: 'Run t downward for each coin', right: true, why: 'Then ways[t − c] still holds the counts from before this coin, so it is used at most once, as in subset sum.' },
        { text: 'Put the amounts in the outer loop', why: 'That counts ordered sequences, with repeats still allowed.' },
        { text: 'Divide the answer by the number of coins', why: 'The repeats aren’t a fixed multiple of the count; they have to be kept out of the table.' },
      ],
    },
    {
      know: 'Each coin’s pass updates ways[t] in place, reading ways[t] from the earlier coins and ways[t − c] from this one.',
      ask: 'How much memory does the coins-outer method need?',
      options: [
        { text: 'A row per coin, amount + 1 numbers each', why: 'That works, but each pass reads only the row it is updating, so one row is enough.' },
        { text: 'One row of amount + 1 numbers', right: true, why: 'Before ways[t] is updated it holds the count without this coin; ways[t − c] holds the count with it. One row carries both.' },
        { text: 'One number per coin', why: 'The pass reads ways[t − c] for many different t, so every amount needs its own number.' },
      ],
    },
  ],

  'coin-permutations': [
    {
      know: 'With the amounts in the outer loop, ways[t] adds ways[t − c] over every coin c: the sequences sorted by their last coin.',
      ask: 'coins = [1, 3], amount 5. How many ordered sequences make 5?',
      args: [[1, 3], 5], answer: 4,
      misconceptions: [
        { answer: 2, feedback: '2 counts collections: five 1s, and 1 + 1 + 3. Here 1 + 1 + 3, 1 + 3 + 1 and 3 + 1 + 1 are three different sequences.' },
      ],
      explain: 'Five 1s, plus the three places the 3 can go among two 1s. ways: 1, 1, 1, 2, 3, 4.',
    },
    {
      know: 'Counting the ordered ways to reach a total with steps of given sizes is a problem from the linear group.',
      ask: 'With coins [1, 2], which lesson is this one?',
      options: [
        { text: 'Climbing stairs: steps of 1 or 2', right: true, why: 'A sequence of coins adding to n is a way up n stairs. Both give 8 for 5.' },
        { text: 'Coin combinations', why: 'Combinations ignore order; with [1, 2] and 5 there are only 3.' },
        { text: 'House robber', why: 'House robber maximises a sum under a no-neighbours rule; it doesn’t count sequences.' },
      ],
    },
    {
      know: 'Every sequence that reaches t ends with some coin c, and before that coin it was a sequence reaching t − c.',
      ask: 'Why does this loop count each order separately?',
      options: [
        { text: 'Because it sorts the coins first', why: 'The order of the coin list makes no difference to the count.' },
        { text: 'Because ways[0] = 1', why: 'That is the start of every count; it doesn’t decide whether orders are told apart.' },
        { text: 'It splits the sequences by their last coin, and 1 + 3 and 3 + 1 end differently', right: true, why: 'The two land in different terms, ways[1] and ways[3], so both are counted. The coins-outer loop never lets a 1 follow a 3.' },
      ],
    },
  ],

  'value-knapsack': [
    {
      know: 'M(v) is the least weight that reaches value exactly v; the answer is the largest v with M(v) within the capacity.',
      ask: 'weights = [600000000, 500000000, 400000000], values = [3, 2, 2], capacity 1000000000. What is the largest total value?',
      args: [[600000000, 500000000, 400000000], [3, 2, 2], 1000000000], answer: 5,
      misconceptions: [
        { answer: 7, feedback: 'All three weigh 1.5 billion, more than the capacity.' },
        { answer: 4, feedback: '4 takes the two lighter items, which weigh 900 million. The first and third weigh exactly a billion and are worth 5.' },
      ],
      explain: 'M(5) = 600 million + 400 million = 1 billion, within the capacity; M(7) is 1.5 billion. So 5.',
    },
    {
      know: 'The value-indexed table has a column for every total value from 0 to the sum of all values.',
      ask: 'How big is the table?',
      options: [
        { text: 'n × (capacity + 1)', why: 'That is the weight-indexed table. Here the capacity is never an index, only a limit compared at the end.' },
        { text: 'n × (sum of values + 1), whatever the capacity', right: true, why: 'With small values that is small even when the capacity is a billion.' },
        { text: '2ⁿ, one cell per subset', why: 'The table never lists subsets; it keeps one least weight per value.' },
      ],
    },
    {
      know: 'One table is indexed by capacity, the other by total value.',
      ask: 'When is the ordinary weight-indexed table the better choice?',
      options: [
        { text: 'When the capacity is small and the values are huge', right: true, why: 'Pick the index whose range is small. Large values would make the value table wide.' },
        { text: 'Always: it is the standard method', why: 'With a capacity of a billion its rows have a billion cells.' },
        { text: 'When there are many items', why: 'Both tables have a row per item. What differs is the width.' },
      ],
    },
  ],

  'multidimensional-knapsack': [
    {
      know: 'D(i, w, u) is the best value from the first i items within weight w and volume u; taking an item uses some of both.',
      ask: 'Items (weight, volume, value): (2, 1, 4), (1, 2, 4), (2, 2, 5). Weight limit 3, volume limit 3. What is the largest total value?',
      args: [[[2, 1, 4], [1, 2, 4], [2, 2, 5]], 3, 3], answer: 8,
      misconceptions: [
        { answer: 5, feedback: '5 takes the most valuable item first, and then nothing else fits in either limit.' },
        { answer: 13, feedback: '13 is all three, which weigh 5.' },
        { answer: 9, feedback: '9 adds the 5 to a 4, but either pair goes over a limit: (2, 2) + (2, 1) weighs 4, (2, 2) + (1, 2) takes volume 4.' },
      ],
      explain: 'The first two items use weight 3 and volume 3 exactly: 4 + 4 = 8.',
    },
    {
      know: 'The table has one index per limit: n × (W + 1) × (U + 1) cells for weight limit W and volume limit U.',
      ask: 'What happens to the work as more limits are added?',
      options: [
        { text: 'It adds the sizes of the limits', why: 'The cells are combinations of a weight and a volume, so the sizes multiply.' },
        { text: 'It multiplies by (limit + 1) for each new limit', right: true, why: 'A fourth limit of 100 makes the table about 100 times bigger. Many limits soon make the table impractical.' },
        { text: 'Nothing: the extra limits are just checked at the end', why: 'Checking at the end gives wrong answers; every limit has to be an index.' },
      ],
    },
    {
      know: 'Any limit on what the chosen items use together becomes an index.',
      ask: 'Add a third rule: at most k items in all. What changes?',
      options: [
        { text: 'Nothing: stop when k items are taken', why: 'The table doesn’t follow one choice; it compares many, and each needs its own item count.' },
        { text: 'Sort by value and take the best k that fit', why: 'The best k by value may break the weight or volume limit, as the check above shows.' },
        { text: 'Add an index for the number of items taken, each item using 1 of it', right: true, why: 'A count of items is a resource like weight: every item costs 1 of a budget of k.' },
      ],
    },
  ],

  'group-knapsack': [
    {
      know: 'For each group, D(g, c) is the best of skipping the group or taking exactly one of its options.',
      ask: 'Group 1: (weight 1, value 3) or (2, 5). Group 2: (1, 2) or (3, 6). Capacity 3. What is the largest total value?',
      args: [[[[1, 3], [2, 5]], [[1, 2], [3, 6]]], 3], answer: 7,
      misconceptions: [
        { answer: 8, feedback: '8 takes both options of group 1. Only one option may come from each group.' },
        { answer: 6, feedback: '6 is the heaviest option alone. (2, 5) from group 1 and (1, 2) from group 2 also fit.' },
      ],
      explain: '(2, 5) from group 1 and (1, 2) from group 2 weigh 3 and are worth 7.',
    },
    {
      know: 'Each group is considered once, and at most one of its options is added.',
      ask: 'Which earlier problem is a group knapsack where every group has one option?',
      options: [
        { text: 'The unbounded knapsack', why: 'Groups are considered once each, so an item can’t be taken twice.' },
        { text: 'The 0/1 knapsack', right: true, why: 'A group with one option is one item: take it or skip it.' },
        { text: 'Subset sum', why: 'Subset sum only asks yes or no for an exact total; a group of one option still has a value to maximise.' },
      ],
    },
    {
      know: 'Options that exclude each other can be put in one group.',
      ask: 'A camera costs 3 and is worth 7. A lens costs 2 and is worth 4, but is useful only with the camera. How is that modelled?',
      options: [
        { text: 'One group with the options: camera (3, 7), or camera and lens (5, 11)', right: true, why: 'Skipping the group means neither. A lens alone is never an option, and the two can’t be added on top of each other.' },
        { text: 'Two ordinary items, the camera and the lens', why: 'Then the lens could be bought without the camera, which the rules forbid.' },
        { text: 'Two groups, one for each', why: 'Separate groups can still take the lens without the camera.' },
      ],
    },
  ],

  'exact-capacity': [
    {
      know: 'D(c) is the best value with weights adding to exactly c, starting from D(0) = 0 and −∞ everywhere else.',
      ask: 'weights = [2, 3, 4], values = [6, 1, 1], capacity 7. What is the best value that fills it exactly?',
      args: [[2, 3, 4], [6, 1, 1], 7], answer: 2,
      misconceptions: [
        { answer: 7, feedback: '7 takes the first item with another, but 2 + 3 = 5 and 2 + 4 = 6 leave the capacity unfilled. That is the 0/1 answer.' },
        { answer: -1, feedback: '3 + 4 = 7 fills it exactly.' },
      ],
      explain: 'Only 3 + 4 adds up to 7, worth 1 + 1 = 2.',
    },
    {
      know: 'The exact table holds a value for every capacity from 0 to C, filled exactly.',
      ask: 'How do you get the ordinary “within capacity” answer from it?',
      options: [
        { text: 'Read D(C)', why: 'D(C) requires the weight to be exactly C; the best choice may weigh less, as in the check above.' },
        { text: 'Take the largest D(c) over every c from 0 to C', right: true, why: 'Within C means exactly c for some c ≤ C, so the best of those cells is the answer.' },
        { text: 'It can’t be read from it; a separate table is needed', why: 'Every c ≤ C is in the table, so one pass over them gives it.' },
      ],
    },
    {
      know: 'Unfilled capacities start at −∞ so that no maximum ever chooses them.',
      ask: 'To fill the capacity exactly with the smallest total value, what changes?',
      options: [
        { text: 'Only max becomes min', why: 'Then −∞ would be the smallest and win everywhere. Unreached capacities must be +∞ instead.' },
        { text: 'max becomes min, and unreached capacities start at +∞', right: true, why: 'The start value must lose every comparison, and for a minimum that is +∞.' },
        { text: 'Nothing: keep max and the −∞ start', why: 'max finds the largest value, not the smallest. And with min, a −∞ start would win at every unreached capacity.' },
      ],
    },
  ],

  'rod-cutting': [
    {
      know: 'r(n) is the most a rod of length n can earn: the best first piece k, worth prices[k − 1], plus r(n − k).',
      ask: 'prices = [2, 5, 7, 8, 10] for lengths 1 to 5, and a rod of length 5. What is the most it can make?',
      args: [[2, 5, 7, 8, 10], 5], answer: 12,
      misconceptions: [
        { answer: 10, feedback: '10 sells the rod uncut. Cutting it into 2 + 3 earns 5 + 7.' },
      ],
      explain: '2 + 3 earns 5 + 7 = 12, and so does 2 + 2 + 1. r: 2, 5, 7, 10, 12.',
    },
    {
      know: 'A rod is cut into pieces of any lengths, each length any number of times, and the lengths add up to n.',
      ask: 'Which knapsack is rod cutting?',
      options: [
        { text: 'The 0/1 knapsack, with each length an item', why: 'A length can be cut more than once: 2 + 2 + 1 uses length 2 twice.' },
        { text: 'The unbounded knapsack: lengths are weights, prices are values, n is the capacity', right: true, why: 'Every length is always available. Since the whole rod is sold, it is the exact-fill version; with a price for length 1 the two agree.' },
        { text: 'The group knapsack', why: 'There are no groups of options to choose one from; any lengths can be combined.' },
      ],
    },
    {
      know: 'Suppose each cut costs c. A rod cut into m pieces needs m − 1 cuts.',
      ask: 'How does the recurrence change?',
      options: [
        { text: 'r(n) = max(prices[n − 1], max over k < n of prices[k − 1] + r(n − k) − c)', right: true, why: 'Selling uncut costs nothing; every cut first piece costs one cut. The rest r(n − k) pays for its own cuts.' },
        { text: 'Subtract c once from the final answer', why: 'The number of cuts depends on the plan; a plan with more pieces pays more.' },
        { text: 'Nothing changes: the best cut is still best', why: 'A plan with many small pieces may lose to one with fewer once each cut costs something.' },
      ],
    },
  ],
}
