// "Design it yourself" for the modelling-and-limits lessons (Specialist, research-tools group). Format:
// designs.js. Lessons with a live table ask for one of its cells; the others ask a second hand-solved
// case. multiobjective's answers are counted (designs.test.js PICK: the number of Pareto pairs), and
// proof-checklist's try-first asks for the 0/1 value (PICK: the first entry). Every number was printed by
// specialist-oracles.js or the trace before it was typed.

export const RESEARCH_DESIGNS = {
  'pseudo-polynomial': {
    problem: 'Solve a 0/1 knapsack whose weights and capacity run to 10¹², but whose values are small whole numbers, where a table indexed by capacity is out of the question.',
    tryFirst: {
      prompt: 'Weights 3, 4, 5, values 4, 5, 6, capacity 7. The best total value?',
      args: [[3, 4, 5], [4, 5, 6], 7], answer: 9,
      misconceptions: [{ answer: 11, feedback: '11 takes the items of weight 4 and 5, which weigh 9, more than 7.' }],
      explain: 'The items of weight 3 and 4 fit (7) and are worth 4 + 5 = 9; no other pair fits, and no single item is worth more.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold, when the weights are huge?', options: [
        { text: 'L(i, t): the lightest set of the first i items worth exactly t', right: true, why: 'The values are small, so t runs over a short range; the weight becomes the thing minimised.' },
        { text: 'best(i, c): the best value of the first i items within capacity c', why: 'c runs up to 10¹²: a table that long can’t be built.' },
        { text: 'best(i, c) for capacities rounded to the nearest million', why: 'Rounding weights changes which sets fit, so the answer can be wrong.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Whether item i is in the set', right: true, why: 'Either the set worth t avoids item i, or it is item i plus a set worth t − v.' },
        { text: 'How much of item i to take', why: 'This is the 0/1 problem: items are taken whole or not at all.' },
      ] },
      { kind: 'recurrence', ask: 'How is L(i, t) found?', options: [
        { text: 'min(L(i − 1, t), L(i − 1, t − v) + w)', right: true, why: 'Skip item i, or add it to the lightest set worth t − v.' },
        { text: 'max(L(i − 1, t), L(i − 1, t − v) + w)', why: 'The heaviest set worth t is no use: the lightest one is the one most likely to fit.' },
      ] },
      { kind: 'base', ask: 'What holds before any item?', options: [
        { text: 'L(0, 0) = 0, and every other value is impossible (∞)', right: true, why: 'Only the empty set exists, worth 0.' },
        { text: 'L(0, t) = 0 for every t', why: 'That says every value can be had for nothing, so values no set reaches look free.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'Item by item; in one array, values from high to low', right: true, why: 'Each item is then used at most once.' },
        { text: 'In one array, values from low to high', why: 'L(t − v) would already include this item, so it could be used twice.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest t with L(n, t) ≤ W', right: true, why: 'The most valuable set that fits.' },
        { text: 'L(n, total value)', why: 'That is the weight of taking everything, which may not fit.' },
      ] },
    ],
    apply: { cell: [3, 10], misconceptions: [
      { answer: 7, feedback: '7 is L(2, 9), a set worth 9. Worth exactly 10 needs item 3 on top of the set worth 4: L(2, 4) + 5 = 8.' },
    ] },
  },

  'knapsack-fptas': {
    problem: 'Find a knapsack value within a factor 1 − ε of the best, quickly, by rounding values down to multiples of K = ε · vmax / n and solving the rounded problem exactly.',
    tryFirst: {
      prompt: 'Weights 3, 4, 5, values 40, 50, 60, capacity 7, ε = 1/2. K = 1/2 · 60 / 3 = 10, so the values round to 4, 5, 6 steps. What does the scheme return?',
      args: [[3, 4, 5], [40, 50, 60], 7, [1, 2]], answer: 90,
      misconceptions: [{ answer: 9, feedback: '9 is the best rounded total. Times K = 10 it is back in real units: 90.' }],
      explain: 'The rounded values are 4, 5, 6 and the best rounded set that fits is the first two items, 9 steps. 9 · 10 = 90, here exactly the optimum.',
    },
    steps: [
      { kind: 'state', ask: 'What makes the table small?', options: [
        { text: 'Rounding every value down to a multiple of K = ε · vmax / n, so the rounded totals are at most n²/ε', right: true, why: 'The value-indexed table then has a polynomial number of columns, whatever the real values.' },
        { text: 'Rounding the weights instead of the values', why: 'Rounded weights can make a set that doesn’t fit look as if it does.' },
        { text: 'Dropping the items with the smallest values', why: 'Small items can matter: the bound comes from rounding every item a little, not dropping some.' },
      ] },
      { kind: 'split', ask: 'What is solved after rounding?', options: [
        { text: 'The rounded problem, exactly, by the value-indexed knapsack', right: true, why: 'Exact on rounded values; the only loss is the rounding.' },
        { text: 'The rounded problem, greedily by rounded value per weight', why: 'Greedy can be far from optimal on 0/1 knapsack; the guarantee needs the exact rounded optimum.' },
      ] },
      { kind: 'recurrence', ask: 'Why is the result at least (1 − ε) times the optimum?', options: [
        { text: 'Each item loses less than K by rounding, so a set loses less than n·K = ε·vmax ≤ ε·OPT', right: true, why: 'And the rounded optimum is at least the optimum set’s rounded value.' },
        { text: 'Because rounding down never changes which set is best', why: 'It can change it; the bound holds anyway, because the loss is small.' },
      ] },
      { kind: 'base', ask: 'What happens to items heavier than W?', options: [
        { text: 'They are dropped before vmax and K are computed', right: true, why: 'They can never be chosen, and vmax ≤ OPT needs every item to fit on its own.' },
        { text: 'They are kept; the table will never choose them anyway', why: 'They still set vmax and K, making the rounding too coarse and the guarantee false.' },
      ] },
      { kind: 'order', ask: 'How is the rounding done exactly?', options: [
        { text: 'In whole numbers: ⌊v · eps[1] · n / (eps[0] · vmax)⌋', right: true, why: 'No floating point, so the same steps on every machine.' },
        { text: 'v / K in floating point, then rounded to nearest', why: 'Rounding up can overstate a set’s value, and floats can land on the wrong side of a whole number.' },
      ] },
      { kind: 'answer', ask: 'What is returned?', options: [
        { text: 'K times the best rounded total that fits', right: true, why: 'A value some set really reaches, within the (1 − ε) guarantee.' },
        { text: 'The best rounded total itself', why: 'That is in units of K, not in real value.' },
      ] },
    ],
    apply: { cell: [3, 11], misconceptions: [
      { answer: 4, feedback: '4 is L(2, 8) without this item’s weight. Adding item 3 (weight 2) to reach rounded total 11: 4 + 2 = 6.' },
    ] },
  },

  'parameterized-dp': {
    problem: 'Choose cells of a grid 8 rows high and 300 long, no two sharing a side, for the largest total weight; exponential only in the small height.',
    tryFirst: {
      prompt: 'A 2 × 2 grid: 1, 9 on top, 9, 1 below. The best total of cells with no two sharing a side?',
      args: [[[1, 9], [9, 1]]], answer: 18,
      misconceptions: [{ answer: 10, feedback: '10 takes the 9 and the 1 of a row, which share a side. The two 9s are diagonal: 18.' }],
      explain: 'The two 9s touch only at a corner, so both can be chosen: 18.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'best(c, m): the best total of columns 0 … c with rows m chosen in column c', right: true, why: 'The next column only needs to know which rows of this one are taken.' },
        { text: 'best(c): the best total of columns 0 … c', why: 'Without the last column’s rows, the next column can’t avoid them.' },
        { text: 'best(c, how many cells are chosen in column c)', why: 'Which rows are chosen decides what the next column may take; the count alone doesn’t.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The mask of column c, given the best mask of column c − 1', right: true, why: 'Columns interact only with their neighbours.' },
        { text: 'The single best cell of column c', why: 'Several cells of a column can be chosen, as long as they aren’t neighbours.' },
      ] },
      { kind: 'recurrence', ask: 'How is best(c, m) found?', options: [
        { text: 'The weight of m in column c plus the best best(c − 1, p) with p and m sharing no row', right: true, why: 'Shared rows would put two chosen cells side by side.' },
        { text: 'The weight of m plus the best best(c − 1, p) over every p', why: 'Then a cell and its left neighbour could both be chosen.' },
      ] },
      { kind: 'base', ask: 'Which masks are allowed?', options: [
        { text: 'Masks with no two adjacent rows chosen', right: true, why: 'Two neighbours in one column share a side.' },
        { text: 'All 2ʰ masks', why: 'A mask choosing two neighbouring rows is never legal.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'Column by column, every mask in each', right: true, why: 'Column c reads only column c − 1.' },
        { text: 'Mask by mask, every column for each', why: 'best(c, m) reads other masks of column c − 1, not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest best(w − 1, m) over the masks', right: true, why: 'Any mask may end the grid.' },
        { text: 'best(w − 1, all rows)', why: 'Choosing every row of a column is not even allowed.' },
      ] },
    ],
    apply: { cell: [2, 4], misconceptions: [
      { answer: 18, feedback: '18 is mask 010. Mask 101 takes 4 and 5 (9) on top of the best column-1 mask sharing no row, 010 (10): 19.' },
    ] },
  },

  'multiobjective': {
    problem: 'Find every route of a DAG from 0 to n − 1 that no other route beats in both time and cost: the Pareto front, for DAGs of up to 40 vertices.',
    tryFirst: {
      prompt: 'Edges 0 → 1 (time 1, cost 1), 1 → 2 (1, 1), and 0 → 2 (3, 0). How many routes are on the Pareto front?',
      args: [3, [[0, 1, 1, 1], [1, 2, 1, 1], [0, 2, 3, 0]]], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'Neither route beats the other: (2, 2) is faster, (3, 0) is cheaper. Both stay.' }],
      explain: 'Route 0 → 1 → 2 has (2, 2) and route 0 → 2 has (3, 0). Each is better in one objective: 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does each vertex hold?', options: [
        { text: 'Its Pareto front: the (time, cost) pairs of routes to it that no other route beats in both', right: true, why: 'A slower but cheaper route may win later; one number can’t keep both.' },
        { text: 'Its fastest route', why: 'The cheaper, slower route would be lost, though it may be on the final front.' },
        { text: 'Its best weighted sum of time and cost', why: 'A weighted sum finds only some of the front; routes in the middle of a dent are missed.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The last edge into the vertex', right: true, why: 'A route is a route to the edge’s start plus the edge.' },
        { text: 'Which objective to favour', why: 'The front keeps all the trade-offs; nothing is favoured.' },
      ] },
      { kind: 'recurrence', ask: 'How is a vertex’s front built?', options: [
        { text: 'Every pair of every predecessor’s front, plus the edge, then the dominated ones removed', right: true, why: 'Both objectives add, so a pair dominated at a vertex stays dominated after any common extension.' },
        { text: 'The best pair of each predecessor, plus the edge', why: 'A predecessor’s other pairs can lead to front pairs too.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'The front of vertex 0 is {(0, 0)}', right: true, why: 'At the start no time has passed and nothing is paid.' },
        { text: 'Every front starts as {(0, 0)}', why: 'Other vertices are reached only by routes from 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the vertices processed?', options: [
        { text: 'In topological order, 0, 1, 2, … since edges go up', right: true, why: 'A vertex’s front is complete when its turn comes.' },
        { text: 'By distance from 0 in time', why: 'Cost matters too; the topological order is what guarantees completeness.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The front of vertex n − 1, sorted by time', right: true, why: 'Every undominated route to the end.' },
        { text: 'The fastest pair of vertex n − 1', why: 'The question asks for every trade-off, not one.' },
      ] },
    ],
    apply: {
      prompt: 'Edges 0 → 1 (1, 4), 0 → 2 (4, 1), 1 → 3 (1, 1), 2 → 3 (1, 1), 0 → 3 (5, 5). How many routes from 0 to 3 are on the front?',
      args: [4, [[0, 1, 1, 4], [0, 2, 4, 1], [1, 3, 1, 1], [2, 3, 1, 1], [0, 3, 5, 5]]], answer: 2,
      misconceptions: [{ answer: 3, feedback: 'The direct edge (5, 5) is beaten in both by either other route.' }],
      explain: 'Routes: (2, 5) via 1, (5, 2) via 2, and (5, 5) direct. The direct one is dominated; the other two trade time for cost: 2.',
    },
  },

  'meet-middle': {
    problem: 'Count the subsets of up to 34 numbers with sum at most T, where there are 2³⁴ subsets but only 2¹⁷ in each half.',
    tryFirst: {
      prompt: 'Values 1, 2, 3, bound 3. How many subsets (the empty one included) have sum at most 3?',
      args: [[1, 2, 3], 3], answer: 5,
      misconceptions: [{ answer: 3, feedback: '3 counts sums below 3. {3} and {1, 2} sum to exactly 3 and count too.' }],
      explain: '{}, {1}, {2}, {3} and {1, 2}: 5.',
    },
    steps: [
      { kind: 'state', ask: 'What is listed for each half?', options: [
        { text: 'Every subset sum of each half of the values', right: true, why: '2^(n/2) sums per half instead of 2ⁿ in all.' },
        { text: 'The largest subset sum of each half that is at most T', why: 'Counting needs every sum: many pairs of smaller sums also stay within T.' },
        { text: 'The subsets of each half with exactly half its items', why: 'Subsets of every size count, not only those of one size.' },
      ] },
      { kind: 'split', ask: 'How is a subset split?', options: [
        { text: 'Into the part in the left half and the part in the right half', right: true, why: 'Every subset is exactly one left part and one right part.' },
        { text: 'Into its smallest value and the rest', why: 'That leads back to a search over all subsets.' },
      ] },
      { kind: 'recurrence', ask: 'For a left sum s, which right sums count?', options: [
        { text: 'Those at most T − s', right: true, why: 'Then the total is at most T.' },
        { text: 'Those below T − s', why: 'Totals equal to T count too.' },
      ] },
      { kind: 'base', ask: 'Is the empty subset counted?', options: [
        { text: 'Yes: each half’s list starts with the sum 0', right: true, why: 'The empty left part with the empty right part is the empty set, sum 0 ≤ T when T ≥ 0.' },
        { text: 'No: lists start from single values', why: 'Then subsets entirely inside one half would never be paired with nothing from the other.' },
      ] },
      { kind: 'order', ask: 'What makes the counting fast?', options: [
        { text: 'Sorting one half’s sums, then a binary search for each sum of the other', right: true, why: 'About 2^(n/2) · n/2 steps.' },
        { text: 'Comparing every left sum with every right sum', why: 'That is 2ⁿ pairs again, the cost being avoided.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum over left sums s of how many right sums are at most T − s', right: true, why: 'Each subset counted once, as its pair of parts.' },
        { text: 'The number of left sums at most T times the number of right sums at most T', why: 'Two parts each at most T can still total more than T.' },
      ] },
    ],
    apply: {
      prompt: 'Values 5, 5, 5 (three different items), bound 9. How many subsets have sum at most 9?',
      args: [[5, 5, 5], 9], answer: 4,
      misconceptions: [{ answer: 2, feedback: 'Equal values are different items: the three single 5s are three subsets, plus the empty one.' }],
      explain: 'The empty set and each single 5: 4. Any two 5s make 10.',
    },
  },

  'min-plus-convolution': {
    problem: 'Give R units to tasks with cost tables, at least total cost, for up to 50 tasks and R = 500: each task merges in by a min-plus convolution.',
    tryFirst: {
      prompt: 'Task 1 costs 0 for no unit and 3 for one; task 2 costs 0 and 2. Give out exactly 1 unit: the least cost?',
      args: [[[0, 3], [0, 2]], 1], answer: 2,
      misconceptions: [{ answer: 3, feedback: 'Task 2 takes the unit for 2, cheaper than task 1’s 3.' }],
      explain: 'Give the unit to task 2 (2) and none to task 1 (0): 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'best(i, r): the least cost of giving exactly r units to the first i tasks', right: true, why: 'The next task needs only how many units are left.' },
        { text: 'best(i): the least cost of the first i tasks', why: 'How many units they used decides what is left for the rest.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'How many units x task i gets', right: true, why: 'The rest, r − x, went to the earlier tasks.' },
        { text: 'Which task gets the last unit', why: 'Units are interchangeable; only how many each task gets matters.' },
      ] },
      { kind: 'recurrence', ask: 'How is best(i, r) found?', options: [
        { text: 'min over x of best(i − 1, r − x) + c[x]', right: true, why: 'A min-plus convolution of the old row with task i’s table.' },
        { text: 'Σ over x of best(i − 1, r − x) · c[x]', why: 'That is an ordinary convolution, counting combinations, not the cheapest.' },
        { text: 'min over x of best(i − 1, r − x) · c[x]', why: 'Costs add up, they don’t multiply.' },
      ] },
      { kind: 'base', ask: 'What holds before any task?', options: [
        { text: 'best(0, 0) = 0, and every other total is impossible (∞)', right: true, why: 'With no tasks, no units can be given.' },
        { text: 'best(0, r) = 0 for every r', why: 'Units given to no task are not given at all.' },
      ] },
      { kind: 'order', ask: 'Why can’t the FFT speed up each merge?', options: [
        { text: 'The FFT computes sums of products; a minimum of sums has no such algebra', right: true, why: 'Faster merges need extra structure, such as convex costs.' },
        { text: 'It can: replace min by + and use the FFT', why: 'That computes a different quantity, not the least cost.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best(k, R), or −1 if it is ∞', right: true, why: 'All tasks, exactly R units.' },
        { text: 'The smallest best(k, r) over r ≤ R', why: 'Exactly R units must be given; fewer is cheaper but not allowed.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: 5, feedback: '5 gives both units to task 1. One each costs 1 + 2 = 3, as does both to task 2.' },
    ] },
  },

  'persistent-states': {
    problem: 'For every node of a tree of up to 20 000 nodes, find the largest weight among its ancestors whose key is in a range, with versions of a segment tree that share their history.',
    tryFirst: {
      prompt: 'A path 0 → 1 → 2 with keys 2, 0, 1 and weights 5, 3, 4. Ranges: node 0 [0, 2], node 1 [0, 2], node 2 [1, 1]. The sum of the answers?',
      args: [[-1, 0, 1], [2, 0, 1], [5, 3, 4], [0, 0, 1], [2, 2, 1], 3], answer: 14,
      misconceptions: [{ answer: 12, feedback: 'Node 2’s range [1, 1] holds only its own key 1, weight 4; node 0’s 5 is outside it. 5 + 5 + 4 = 14.' }],
      explain: 'Node 0: itself, 5. Node 1: 5 and 3 both in range, 5. Node 2: only key 1 in [1, 1], weight 4. 5 + 5 + 4 = 14.',
    },
    steps: [
      { kind: 'state', ask: 'What does each node keep?', options: [
        { text: 'A version of a segment tree over keys, holding exactly its ancestors and itself', right: true, why: 'Then its question is one range-maximum query on its own version.' },
        { text: 'One segment tree with every node of the tree inserted', why: 'Then a node also sees its siblings, cousins and descendants, which are not its ancestors.' },
        { text: 'The list of its ancestors’ weights', why: 'A list makes each query walk all the ancestors, too slow on a long path.' },
      ] },
      { kind: 'split', ask: 'How does a node’s version differ from its parent’s?', options: [
        { text: 'By one inserted key: the node itself', right: true, why: 'A node’s ancestors are its parent’s ancestors plus the parent.' },
        { text: 'By all the nodes visited before it', why: 'Earlier siblings and their subtrees are not ancestors.' },
      ] },
      { kind: 'recurrence', ask: 'How is a version made cheaply?', options: [
        { text: 'Copy only the nodes on the path to the new key; share every other node', right: true, why: 'About log K new nodes per version.' },
        { text: 'Copy the whole segment tree', why: 'K nodes per version: too much for 20 000 versions.' },
        { text: 'Change the parent’s nodes in place', why: 'Siblings share the parent’s version; changing it shows one sibling to the other.' },
      ] },
      { kind: 'base', ask: 'What does the root start from?', options: [
        { text: 'The empty tree, shared by everything', right: true, why: 'Node 0 with maximum 0 stands for “nothing here”.' },
        { text: 'The tree with every node’s key already inserted', why: 'Then the root would see every node’s weight, not only its own.' },
      ] },
      { kind: 'order', ask: 'In what order are versions built?', options: [
        { text: 'Any order with each parent before its children; here node numbers, since parent[v] < v', right: true, why: 'A version needs its parent’s.' },
        { text: 'Each from the previously built node’s version', why: 'That one may be a sibling or a cousin, not the parent.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum over nodes of the maximum on [lo, hi] in their own version', right: true, why: 'Each version holds exactly that node’s ancestors.' },
        { text: 'The maximum on [lo, hi] in the last version built, for every node', why: 'The last version holds the last node’s ancestors only.' },
      ] },
    ],
    apply: {
      prompt: 'Node 0 is the parent of nodes 1 and 2; all keys are 1; weights 6, 14, 2. Ranges: node 0 [1, 1], node 1 [0, 1], node 2 [1, 1]. The sum of the answers?',
      args: [[-1, 0, 0], [1, 1, 1], [6, 14, 2], [1, 0, 1], [1, 1, 1], 2], answer: 26,
      misconceptions: [{ answer: 34, feedback: '34 lets node 2 see node 1’s 14, but node 1 is its sibling, not an ancestor.' }],
      explain: 'Node 0: 6. Node 1: max(6, 14) = 14. Node 2: its ancestors are 0 and itself: max(6, 2) = 6. 6 + 14 + 6 = 26.',
    },
  },

  'dynamic-dp': {
    problem: 'Answer house robber again after each of thousands of point updates to the values, far faster than recomputing the whole row each time.',
    tryFirst: {
      prompt: 'Houses 1, 2, 3, no two neighbours robbed. After setting the first to 5, what is the best?',
      args: [[1, 2, 3], [[0, 5]]], answer: 8,
      misconceptions: [{ answer: 4, feedback: '4 is the answer before the update (1 + 3). With 5, 3: 8.' }],
      explain: 'The houses are now 5, 2, 3: rob 5 and 3, 8.',
    },
    steps: [
      { kind: 'state', ask: 'What summarises a segment of houses?', options: [
        { text: 'A 2 × 2 table: the best sum for each choice of whether its first and its last house are taken', right: true, why: 'That is all a neighbouring segment needs to know.' },
        { text: 'Its best sum alone', why: 'Joining two segments needs to know whether the touching houses are taken.' },
        { text: 'The best sum of each half of the segment', why: 'Adding the halves’ bests can take two neighbours where they meet.' },
      ] },
      { kind: 'split', ask: 'How do two neighbouring segments combine?', options: [
        { text: 'Best over the inner ends p, q, skipping p and q both taken, of left[s][p] + right[q][t]', right: true, why: 'The left’s last house and the right’s first are neighbours.' },
        { text: 'left[s][t] + right[s][t], entry by entry', why: 'That ignores which houses touch.' },
      ] },
      { kind: 'recurrence', ask: 'What is this combination, algebraically?', options: [
        { text: 'A product of 2 × 2 matrices with max for + and + for ×', right: true, why: 'Associative, so a segment tree can store the products of its ranges.' },
        { text: 'An ordinary matrix product', why: 'Sums of products would add up choices instead of picking the best.' },
      ] },
      { kind: 'base', ask: 'What is a single house’s table?', options: [
        { text: '[[0, −∞], [−∞, x]]: not taken gives 0, taken gives x, mixed is impossible', right: true, why: 'Its first and last house are the same house.' },
        { text: '[[0, x], [x, x]]', why: 'A house can’t be taken and not taken at once.' },
      ] },
      { kind: 'order', ask: 'What does an update recompute?', options: [
        { text: 'The leaf and the log n segment-tree nodes above it', right: true, why: 'Every other range is unchanged.' },
        { text: 'Only the changed leaf', why: 'Every segment containing the house changes too, up to the root.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer after an update?', options: [
        { text: 'The largest entry of the root’s table', right: true, why: 'Whatever the ends of the whole row.' },
        { text: 'The root’s entry with both ends taken', why: 'The best set need not take the first or last house.' },
      ] },
    ],
    apply: {
      prompt: 'Houses 2, 7, 9, 3, 1. Set house 2 (the 9) to 0: what is the best? Then set house 4 (the 1) to 10: what is the best? Give the sum of the two answers.',
      args: [[2, 7, 9, 3, 1], [[2, 0], [4, 10]]], answer: 27,
      misconceptions: [{ answer: 24, feedback: 'After the second update the houses are 2, 7, 0, 3, 10: rob 7 and 10 for 17, not 14.' }],
      explain: 'After 9 → 0: houses 2, 7, 0, 3, 1, best 7 + 3 = 10. After 1 → 10: 2, 7, 0, 3, 10, best 7 + 10 = 17. 10 + 17 = 27.',
    },
  },

  'tree-automata': {
    problem: 'Count the labellings of a binary tree (0 or 1 at the leaves, an operation at each inner node) that make the root evaluate to 1, for trees of up to 70 000 nodes.',
    tryFirst: {
      prompt: 'A root with two leaves; the root may be "and" or "or". How many labellings make the root 1?',
      args: [[[1, 2], [], []], ['and', 'or']], answer: 4,
      misconceptions: [{ answer: 3, feedback: '3 counts only "or". "and" with both leaves 1 also gives 1.' }],
      explain: '"and": one of the four leaf pairs gives 1. "or": three do. 1 + 3 = 4.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'N(v, s): the labellings of v’s subtree that make v evaluate to s', right: true, why: 'A parent needs only its children’s values, 0 or 1: the automaton’s states.' },
        { text: 'N(v): the labellings of v’s subtree', why: 'Without the value, the parent can’t tell which of them give 1.' },
      ] },
      { kind: 'split', ask: 'What is the last choice at an inner node?', options: [
        { text: 'Its operation, given its children’s values', right: true, why: 'The node’s value is the operation applied to the two values.' },
        { text: 'The values of all the leaves below it', why: 'That is listing the labellings; the children’s values are enough.' },
      ] },
      { kind: 'recurrence', ask: 'How is N(v, s) found?', options: [
        { text: 'Σ over operations and child values x, y with op(x, y) = s of N(a, x) · N(b, y)', right: true, why: 'The two subtrees are labelled independently: counts multiply, choices add.' },
        { text: 'Σ over operations and x, y with op(x, y) = s of N(a, x) + N(b, y)', why: 'Each pair of subtree labellings is a separate labelling: they multiply.' },
      ] },
      { kind: 'base', ask: 'What is a leaf’s count?', options: [
        { text: 'N(leaf, 0) = N(leaf, 1) = 1', right: true, why: 'A leaf is labelled 0 or labelled 1: one way each.' },
        { text: 'N(leaf, 0) = 0, N(leaf, 1) = 1', why: 'A leaf may be labelled 0 too.' },
      ] },
      { kind: 'order', ask: 'In what order are the nodes processed?', options: [
        { text: 'Children before parents', right: true, why: 'A node reads its children’s counts.' },
        { text: 'From the root down', why: 'The root needs its children first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N(root, 1)', right: true, why: 'The labellings the automaton accepts.' },
        { text: 'N(root, 0) + N(root, 1)', why: 'That counts every labelling, accepted or not.' },
      ] },
    ],
    apply: { cell: [3, 1], misconceptions: [
      { answer: 3, feedback: '3 counts only "or". With "and" too, one more labelling gives 1: 4.' },
      { answer: 1, feedback: '1 counts only "and". "or" adds three more: 4.' },
    ] },
  },

  'proof-checklist': {
    problem: 'Compute the 0/1 and the unbounded knapsack values together, and know exactly which loop direction makes each one right.',
    tryFirst: {
      prompt: 'Weights 2 and 3, values 3 and 5, capacity 6. The best 0/1 value (each item at most once)?',
      args: [[2, 3], [3, 5], 6], answer: 8,
      misconceptions: [{ answer: 10, feedback: '10 uses the weight-3 item twice: the unbounded answer.' }],
      explain: 'Both items fit (weight 5): 3 + 5 = 8. Twice the weight-3 item would be 10, but each item is used once.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'best[c]: the best value within capacity c, over the items so far', right: true, why: 'One array per problem, updated item by item.' },
        { text: 'best[c]: the best value using exactly the items so far, all of them', why: 'Items may be left out; the table keeps the best choice.' },
      ] },
      { kind: 'split', ask: 'What is the last choice for an item?', options: [
        { text: 'Take it (once, or again in the unbounded case) or not', right: true, why: 'The two problems differ only in whether it may be taken again.' },
        { text: 'How many copies, for both problems', why: 'In the 0/1 problem one copy at most.' },
      ] },
      { kind: 'recurrence', ask: 'What must best[c − w] mean in the 0/1 update?', options: [
        { text: 'The best value without this item', right: true, why: 'So the item is added once.' },
        { text: 'The best value possibly with this item', why: 'That is the unbounded rule: the item could be added again.' },
      ] },
      { kind: 'base', ask: 'What holds before any item?', options: [
        { text: 'best[c] = 0 for every c', right: true, why: 'Nothing chosen is worth 0, at any capacity.' },
        { text: 'best[0] = 0 and the rest −∞', why: 'That asks for exact capacity; “within” capacity starts at 0 everywhere.' },
      ] },
      { kind: 'order', ask: 'In what order does the capacity loop run?', options: [
        { text: '0/1: from W down to w; unbounded: from w up to W', right: true, why: 'Going down reads values before this item; going up reads values that may include it.' },
        { text: 'Both up from w', why: 'Then the 0/1 table reuses items too, and both give the unbounded answer.' },
        { text: 'Both down from W', why: 'Then the unbounded table can use each item only once.' },
      ] },
      { kind: 'answer', ask: 'How can the two answers be checked against each other?', options: [
        { text: 'The unbounded answer is at least the 0/1 one; on small cases compare both with brute force', right: true, why: 'Any 0/1 choice is also an unbounded one; exhaustive checks catch a wrong direction.' },
        { text: 'They must always be equal', why: 'Reusing an item can be worth more: weights 2 and 3 at capacity 6 give 8 and 10.' },
      ] },
    ],
    apply: { cell: [5, 6], misconceptions: [
      { answer: 8, feedback: '8 is the 0/1 value. The unbounded row reads its own row: U(2, 3) + 5 = 10, two of the weight-3 item.' },
    ] },
  },
}
