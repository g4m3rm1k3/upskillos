// "Design it yourself" for the bitmask lessons (Advanced, subsets group). Format: designs.js. Item or vertex
// i is bit i of a mask. apply asks for a cell of each lesson's live table; every other number was printed
// by advanced-oracles.js before it was typed (subset-enumeration's and mask-language's through PICK).

const increasing = { kind: 'order', ask: 'In what order are the masks filled?', options: [
  { text: 'In increasing numeric order', right: true, why: 'Every mask the rule reads is a submask, and a submask is never a larger number, so it is already filled.' },
  { text: 'By the number of 1 bits, largest first', why: 'The rule reads smaller sets, so they must come first, not last.' },
] }

export const SUBSET_DESIGNS = {
  'bitmask-basics': {
    problem: 'Items have weights. Count the subsets (the empty one included) whose total weight is within a limit, working each subset’s total out from a smaller subset’s.',
    tryFirst: {
      prompt: 'Weights [2, 3, 4], limit 5. How many subsets weigh at most 5?',
      args: [[2, 3, 4], 5], answer: 5,
      misconceptions: [
        { answer: 4, feedback: '4 forgets the empty subset, which weighs 0.' },
        { answer: 8, feedback: '8 is every subset; 3 + 4, 2 + 4 and all three are too heavy.' },
      ],
      explain: '{}, {2}, {3}, {4} and {2, 3}.',
    },
    steps: [
      { kind: 'state', ask: 'How is a subset written down?', options: [
        { text: 'As a mask: bit i is 1 when item i is in the subset', right: true, why: 'Every subset of n items is a number from 0 to 2ⁿ − 1, usable as a table index.' },
        { text: 'As a sorted list of its items', why: 'A list works, but can’t index a table directly; a mask can.' },
      ] },
      { kind: 'split', ask: 'Which smaller subset helps with mask?', options: [
        { text: 'mask without its lowest item: mask ^ (mask & −mask)', right: true, why: 'mask & −mask isolates the lowest 1 bit; removing it gives a smaller number.' },
        { text: 'mask − 1', why: 'Subtracting 1 removes the lowest bit but turns on every bit below it, a different subset.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills T(mask)?', options: [
        { text: 'T(mask) = T(mask without its lowest item) + that item’s weight', right: true, why: 'One addition per mask, using a total already known.' },
        { text: 'T(mask) = T(mask − 1) + the weight of mask’s highest item', why: 'mask − 1 is a different subset (it turns on lower bits), so this adds the wrong items.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'T(0) = 0: the empty subset', right: true, why: 'Every other total is built from it.' },
        { text: 'T(1) = the first weight', why: 'That is computed by the rule; the empty subset must be seeded and counted.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The number of masks whose total is within the limit, mask 0 included', right: true, why: 'Each mask is one subset, so count the masks that fit.' },
        { text: 'T of the full mask', why: 'That is the total of all items, one subset.' },
      ] },
    ],
    apply: { cell: [0, 7], misconceptions: [
      { answer: 7, feedback: '7 is T(110), the mask without its lowest item. Add that item’s weight, w0 = 3.' },
      { answer: 13, feedback: 'Remove only the lowest item: T(110) = 7, plus w0 = 3.' },
    ] },
  },

  'subset-enumeration': {
    problem: 'Values are given for every mask. For each mask, add up the values of all its submasks (the masks whose bits lie inside it).',
    tryFirst: {
      prompt: 'values = [1, 2, 3, 4] for masks 00, 01, 10, 11. What is the sum over the submasks of 11?',
      args: [[1, 2, 3, 4]], answer: 10,
      misconceptions: [
        { answer: 4, feedback: '4 is just the value of 11 itself. Its submasks are 00, 01, 10 and 11.' },
        { answer: 9, feedback: '9 forgets the empty submask 00, whose value is 1.' },
      ],
      explain: '1 + 2 + 3 + 4 = 10: every mask is inside 11.',
    },
    steps: [
      { kind: 'state', ask: 'Which masks count for mask m?', options: [
        { text: 'Every s with s & ~m = 0: no bit outside m', right: true, why: 'Those are exactly the submasks, from 0 up to m.' },
        { text: 'Every s smaller than m', why: '01 is smaller than 10 but not inside it.' },
      ] },
      { kind: 'split', ask: 'How do you step from one submask to the next smaller one?', options: [
        { text: 's = (s − 1) & m', right: true, why: 'Subtracting 1 changes the lowest set bit and everything below; & m drops the bits outside m.' },
        { text: 's = s − 1', why: 'That visits numbers that aren’t submasks of m.' },
      ] },
      { kind: 'recurrence', ask: 'How is f(m) computed?', options: [
        { text: 'Walk s from m down through every submask, adding values[s]', right: true, why: 'Each submask is visited once.' },
        { text: 'f(m) = f(m − 1) + values[m]', why: 'f(m − 1) sums the submasks of a different mask.' },
      ] },
      { kind: 'base', ask: 'How does the walk end?', options: [
        { text: 'Add values[0] when s reaches 0, then stop', right: true, why: '0 is a submask of every mask; one more step would wrap back to m.' },
        { text: 'Stop as soon as s is 0, before adding', why: 'That skips the empty submask.' },
      ] },
      { kind: 'order', ask: 'How much work is this over all masks?', options: [
        { text: '3ⁿ steps: each bit is outside m, in m only, or in both m and s', right: true, why: 'Much less than 4ⁿ pairs, though more than the 2ⁿ · n of sum-over-subsets.' },
        { text: '4ⁿ: every pair of masks', why: 'Only pairs with s inside m are visited.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'One sum per mask: the whole list', right: true, why: 'The question asks for every mask.' },
        { text: 'Only the full mask’s sum', why: 'That is one entry; every mask needs its own.' },
      ] },
    ],
    apply: { cell: [1, 5], misconceptions: [
      { answer: 3, feedback: '3 skips the empty submask 000, worth 3.' },
      { answer: 9, feedback: '9 is just v(101). Its submasks are 101, 100, 001 and 000.' },
    ] },
  },

  'assignment': {
    problem: 'cost[w][j] is the cost of giving job j to worker w. Give each worker a different job as cheaply as possible.',
    tryFirst: {
      prompt: 'cost = [[3, 1], [2, 6]]. What is the cheapest assignment?',
      args: [[[3, 1], [2, 6]]], answer: 3,
      misconceptions: [
        { answer: 9, feedback: '9 gives each worker the job with its own number, 3 + 6. Swapping them costs 1 + 2.' },
        { answer: 1, feedback: '1 serves only one worker; both need a job.' },
      ],
      explain: 'Worker 0 takes job 1 (1), worker 1 takes job 0 (2): 3.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(mask) hold?', options: [
        { text: 'The cheapest way to give the jobs in mask to the first popcount(mask) workers', right: true, why: 'The set of used jobs is all that matters for the rest; the number of workers served follows from it.' },
        { text: 'The cheapest way to serve worker number mask', why: 'mask is a set of jobs, not a worker.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Which job the last served worker took', right: true, why: 'Removing it leaves a smaller set for the workers before.' },
        { text: 'Which worker took job 0', why: 'Any job can be last; the last worker is fixed by the count.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(mask)?', options: [
        { text: 'min over j in mask of D(mask − j) + cost[popcount(mask) − 1][j]', right: true, why: 'Worker popcount(mask) − 1 is the last served.' },
        { text: 'min over j of D(mask − j) + cost[j][j]', why: 'Worker j isn’t necessarily the one that took job j.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 0', right: true, why: 'No jobs handed out yet, so nothing is paid.' },
        { text: 'D(mask) = 0 for every single job', why: 'Even one job costs something.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer, and how much work is it?', options: [
        { text: 'D(all jobs), after 2ⁿ · n steps instead of n! orders', right: true, why: 'For 12 workers that is about 49 000 steps against 479 million orders.' },
        { text: 'The smallest D anywhere', why: 'D(0) is 0; every worker must be served.' },
      ] },
    ],
    apply: { cell: [0, 5], misconceptions: [
      { answer: 12, feedback: '12 gives job 0 to worker 1 after job 2 went first. Giving job 2 last costs 4 + 7 = 11.' },
      { answer: 7, feedback: 'Two workers are served: D(001) + c(1,2) = 4 + 7.' },
    ] },
  },

  'held-karp': {
    problem: 'Find the cheapest tour that starts at city 0, visits every city exactly once, and returns to 0.',
    tryFirst: {
      prompt: 'dist = [[0, 2, 9], [2, 0, 4], [9, 4, 0]]. What is the cheapest tour?',
      args: [[[0, 2, 9], [2, 0, 4], [9, 4, 0]]], answer: 15,
      misconceptions: [
        { answer: 6, feedback: '6 is the path 0 → 1 → 2. A tour returns to 0: + 9.' },
      ],
      explain: '0 → 1 → 2 → 0: 2 + 4 + 9 = 15 (the other direction costs the same).',
    },
    steps: [
      { kind: 'state', ask: 'What should D(mask, v) hold?', options: [
        { text: 'The cheapest path from 0 that visits exactly the cities in mask and ends at v', right: true, why: 'The rest of the tour depends only on what is visited and where you are, not on the order.' },
        { text: 'The cheapest path from 0 that visits mask in increasing order', why: 'The order is what is being optimised.' },
      ] },
      { kind: 'split', ask: 'What is the last choice on a path ending at v?', options: [
        { text: 'The city u visited just before v', right: true, why: 'Removing v leaves a path through mask − v ending at u.' },
        { text: 'The first city after 0', why: 'Splitting by the last step needs no extra information.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(mask, v)?', options: [
        { text: 'min over u in mask − v of D(mask − v, u) + dist[u][v]', right: true, why: 'Try every previous city and keep the cheapest.' },
        { text: 'D(mask − v, v) + dist[v][v]', why: 'v isn’t in mask − v, and the step must come from another city.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D({0}, 0) = 0, everything else ∞', right: true, why: 'Every path starts at city 0.' },
        { text: 'D({v}, v) = 0 for every v', why: 'The tour must start at 0, not at every city.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min over v of D(all, v) + dist[v][0]', right: true, why: 'Every city visited, then back to 0.' },
        { text: 'min over v of D(all, v)', why: 'That leaves out the return to 0.' },
      ] },
    ],
    apply: { cell: [0, 8], misconceptions: [
      { answer: 65, feedback: '65 is the cheapest path through every city, ending at 2. Add the trip back: + d(2,0) = 15.' },
      { answer: 95, feedback: '95 ends at 3. Ending at 1 or 2 and returning costs 80.' },
    ] },
  },

  'hamiltonian': {
    problem: 'In a directed graph, count the paths that start at vertex 0 and visit every vertex exactly once.',
    tryFirst: {
      prompt: 'Three vertices with an edge in both directions between every pair. How many such paths start at 0?',
      args: [3, [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]]], answer: 2,
      misconceptions: [
        { answer: 6, feedback: '6 is every order of the three vertices; the start is fixed at 0.' },
      ],
      explain: '0 → 1 → 2 and 0 → 2 → 1.',
    },
    steps: [
      { kind: 'state', ask: 'What should C(mask, v) hold?', options: [
        { text: 'How many paths from 0 visit exactly mask and end at v', right: true, why: 'Like Held–Karp, but counting instead of minimising.' },
        { text: 'Whether some path visits mask', why: 'A yes/no can’t be added up into a count.' },
      ] },
      { kind: 'split', ask: 'How are the paths ending at v divided?', options: [
        { text: 'By the vertex u just before v, joined to v by an edge u → v', right: true, why: 'Each path has exactly one such u.' },
        { text: 'By their first edge', why: 'Splitting by the last step reads smaller masks directly.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(mask, v)?', options: [
        { text: 'The sum over edges u → v, u in mask − v, of C(mask − v, u)', right: true, why: 'The groups don’t overlap, so they add.' },
        { text: 'The largest C(mask − v, u)', why: 'Counting needs all the groups, not the biggest.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C({0}, 0) = 1', right: true, why: 'The path that is just vertex 0.' },
        { text: 'C({0}, 0) = 0', why: 'Then every count stays 0: nothing to extend.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of C(all, v) over every end v', right: true, why: 'The paths may end anywhere.' },
        { text: 'C(all, 0)', why: 'A path through every vertex can’t end back at its start.' },
      ] },
    ],
    apply: { cell: [3, 7], misconceptions: [
      { answer: 1, feedback: 'Two edges come into 3 from the set: from 2 and from 1, each with one path.' },
      { answer: 3, feedback: '3 is every path through all four vertices; this cell counts only those ending at 3.' },
    ] },
  },

  'subset-partition': {
    problem: 'Pack items into as few bins as possible, each bin’s total within a capacity.',
    tryFirst: {
      prompt: 'Items [4, 3, 3, 2], bins of 6. What is the fewest bins?',
      args: [[4, 3, 3, 2], 6], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 fills bins in the given order without going back (4, then 3 + 3, then 2). The 2 fits with the 4.' },
        { answer: 4, feedback: 'Bins can hold more than one item: 4 + 2 and 3 + 3.' },
      ],
      explain: 'Two bins: 4 + 2 and 3 + 3, both exactly full.',
    },
    steps: [
      { kind: 'state', ask: 'What should B(mask) hold?', options: [
        { text: 'The fewest bins for the items in mask', right: true, why: 'Removing one bin’s items leaves a smaller mask of the same kind.' },
        { text: 'The fewest bins for the first k items', why: 'Which items go together isn’t a prefix; the set matters.' },
      ] },
      { kind: 'split', ask: 'Which bin is chosen first, so each packing is built once?', options: [
        { text: 'The bin holding mask’s lowest item', right: true, why: 'Every packing has exactly one such bin, so no packing is counted in several orders.' },
        { text: 'The bin holding the heaviest item, filled greedily with whatever fits next', why: 'Greedy filling can strand space; the table must try every bin that holds the chosen item.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills B(mask)?', options: [
        { text: '1 + min B(mask − block) over blocks containing the lowest item with total ≤ cap', right: true, why: 'This bin, plus the best for the rest.' },
        { text: '1 + B(mask − lowest item)', why: 'That puts every item in its own bin.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'B(0) = 0, with each subset’s total worked out first', right: true, why: 'No items, no bins; totals tell which blocks fit.' },
        { text: 'B(0) = 1', why: 'No items need no bins at all.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'B(all items)', right: true, why: 'Every item packed: the full mask.' },
        { text: 'The total weight divided by the capacity', why: 'That is a lower bound, often not reachable.' },
      ] },
    ],
    apply: { cell: [1, 15], misconceptions: [
      { answer: 3, feedback: '3 is one way, 3 + 2 | 3 | 2, but 3 + 3 | 2 + 2 needs only 2.' },
      { answer: 4, feedback: 'Bins hold more than one item: 3 + 3 and 2 + 2.' },
    ] },
  },

  'subset-cover': {
    problem: 'Options cover sets of items at a cost. Buy options covering every item as cheaply as possible.',
    tryFirst: {
      prompt: 'Three items. Options: {0, 1} for 3, {1, 2} for 3, {2} for 1. What is the cheapest cover?',
      args: [3, [[[0, 1], 3], [[1, 2], 3], [[2], 1]]], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 buys the two pairs. {0, 1} with {2} covers everything for 4.' },
      ],
      explain: '{0, 1} for 3 and {2} for 1.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(mask) hold?', options: [
        { text: 'The cheapest purchase whose items together are exactly mask', right: true, why: 'The covered set is all that matters for what to buy next.' },
        { text: 'The cheapest purchase of the first k options', why: 'That needs the covered set too, to know if it is enough.' },
      ] },
      { kind: 'split', ask: 'What does buying option o do to the state?', options: [
        { text: 'mask becomes mask | o, and its cost is added', right: true, why: 'OR, because an item covered twice is still covered.' },
        { text: 'mask becomes mask ^ o', why: 'XOR would uncover items the option shares with mask.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills the table?', options: [
        { text: 'D(mask | o) ≤ D(mask) + cost(o), for every option o', right: true, why: 'Push each state along each option.' },
        { text: 'D(mask) = the cheapest single option covering mask', why: 'Covers can combine several options.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 0; everything else ∞', right: true, why: 'Nothing bought, nothing covered.' },
        { text: 'D(o) = cost(o) for every option, everything else 0', why: 'An unbought state can’t be free.' },
      ] },
      { kind: 'order', ask: 'Why does increasing numeric order work here?', options: [
        { text: 'mask | o is never smaller than mask, so every state is final before it is pushed', right: true, why: 'OR only adds bits, so the number never shrinks.' },
        { text: 'It doesn’t: a priority queue is needed', why: 'With positive costs and OR, increasing order is already right.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(all items), or −1 if it is still ∞', right: true, why: 'Every item covered: the full mask.' },
        { text: 'The cheapest D(mask) over all masks', why: 'D(0) = 0 is the smallest, and covers nothing.' },
      ] },
    ],
    apply: { cell: [0, 7], misconceptions: [
      { answer: 6, feedback: '6 buys the two pairs. Option 2 covers all three items for 4.' },
      { answer: 3, feedback: '3 covers only two items.' },
    ] },
  },

  'steiner-tree': {
    problem: 'Connect a set of terminal vertices in a weighted graph with the lightest possible tree (other vertices may be used).',
    tryFirst: {
      prompt: 'Edges 0–1 (2), 1–2 (2), 0–2 (5); terminals 0 and 2. What is the lightest connection?',
      args: [3, [[0, 1, 2], [1, 2, 2], [0, 2, 5]], [0, 2]], answer: 4,
      misconceptions: [
        { answer: 5, feedback: '5 uses the direct edge. Going through vertex 1, which isn’t a terminal, costs 4.' },
      ],
      explain: '0 – 1 – 2: 2 + 2 = 4.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(mask, v) hold?', options: [
        { text: 'The lightest tree joining the terminals in mask and the vertex v', right: true, why: 'v is where this tree attaches to the rest.' },
        { text: 'The lightest tree joining the terminals in mask', why: 'Merging two trees needs a shared vertex, so v must be in the state.' },
      ] },
      { kind: 'split', ask: 'How can such a tree look at v?', options: [
        { text: 'It branches at some vertex u into two parts with smaller terminal sets, then a path runs from u to v', right: true, why: 'Every tree with two or more terminals splits this way.' },
        { text: 'It is always a path', why: 'Three terminals around a centre need a branching tree.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(mask, v)?', options: [
        { text: 'min over u and splits A of D(A, u) + D(mask − A, u) + dist(u, v)', right: true, why: 'Branch at u, then reach v by a shortest path.' },
        { text: 'The sum of dist(t, v) over terminals t', why: 'That joins each terminal separately and pays for shared paths several times.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D({t}, v) = dist(t, v) for each terminal t', right: true, why: 'A single terminal joined to v by a shortest path.' },
        { text: 'D({t}, v) = 0', why: 'Joining t to another vertex costs the path between them.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By terminal set, smaller sets (numerically smaller masks) first', right: true, why: 'Each merge reads two smaller sets.' },
        { text: 'By vertex number', why: 'The dependency is on terminal sets, not on vertices.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The smallest D(all terminals, v) over every v', right: true, why: 'The extra vertex can be any vertex, for example a terminal itself.' },
        { text: 'D(all terminals, 0)', why: 'Vertex 0 may not be a good place; take the best over all.' },
      ] },
    ],
    apply: { cell: [6, 2], misconceptions: [
      { answer: 6, feedback: '6 joins each terminal to vertex 2 on its own. Terminals 0 and 1 share the path through 4.' },
      { answer: 3, feedback: '3 is D({0, 1}, 2) alone; terminal 3 is 2 away.' },
    ] },
  },

  'subset-topological': {
    problem: 'Count the orders of all the vertices that respect a set of “a before b” rules.',
    tryFirst: {
      prompt: 'Three vertices with one rule: 0 before 1. How many orders respect it?',
      args: [3, [[0, 1]]], answer: 3,
      misconceptions: [
        { answer: 6, feedback: '6 is every order; half of them put 1 before 0.' },
        { answer: 2, feedback: '2 fixes vertex 2 at one end. It can go first, between, or last: 3.' },
      ],
      explain: '2 0 1, 0 2 1 and 0 1 2.',
    },
    steps: [
      { kind: 'state', ask: 'What should C(mask) hold?', options: [
        { text: 'How many valid orders place exactly the vertices in mask first', right: true, why: 'Which vertices may come next depends only on which are placed, not their order.' },
        { text: 'How many orders end with vertex mask', why: 'mask is a set, not a vertex.' },
      ] },
      { kind: 'split', ask: 'How are those orders divided?', options: [
        { text: 'By the vertex placed last', right: true, why: 'Each order of mask has one last vertex.' },
        { text: 'By the vertex placed first', why: 'Splitting by the last reads the smaller set mask − v directly.' },
      ] },
      { kind: 'recurrence', ask: 'When may v be last in mask?', options: [
        { text: 'When all of v’s prerequisites are in mask − v', right: true, why: 'Everything that must come before v is already placed.' },
        { text: 'When at least one prerequisite is in mask − v', why: 'Every prerequisite must come before v, not just one.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'C(0) = 1', right: true, why: 'One way to have placed nothing.' },
        { text: 'C(0) = 0', why: 'Then nothing can be counted.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'C(all vertices)', right: true, why: 'Every vertex placed: the full mask.' },
        { text: 'The sum of C over all masks', why: 'That counts partial orders too.' },
      ] },
    ],
    apply: { cell: [0, 15], misconceptions: [
      { answer: 24, feedback: '24 is every order of four vertices. The rules allow only 3.' },
      { answer: 2, feedback: 'Vertex 2 may also be last: C(1011) = 1 adds a third order.' },
    ] },
  },

  'subset-matching': {
    problem: 'Count the perfect matchings of a graph: sets of edges using every vertex exactly once.',
    tryFirst: {
      prompt: 'A 4-cycle: edges 0–1, 1–2, 2–3, 3–0. How many perfect matchings?',
      args: [4, [[0, 1], [1, 2], [2, 3], [3, 0]]], answer: 2,
      misconceptions: [
        { answer: 4, feedback: '4 counts edges. A perfect matching uses two edges that don’t share a vertex.' },
        { answer: 1, feedback: '0–1 with 2–3, and 1–2 with 3–0: two.' },
      ],
      explain: '{0–1, 2–3} and {1–2, 3–0}.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(mask) hold?', options: [
        { text: 'The number of perfect matchings of the vertices in mask', right: true, why: 'Removing a matched pair leaves a smaller mask of the same kind.' },
        { text: 'The number of edges inside mask', why: 'Edges aren’t matchings; matchings are sets of edges.' },
      ] },
      { kind: 'split', ask: 'Which vertex is matched first, so each matching is counted once?', options: [
        { text: 'mask’s lowest vertex', right: true, why: 'It must be matched to someone, and fixing it avoids counting a matching once per order of its pairs.' },
        { text: 'Every vertex in turn', why: 'Then each matching of k pairs is counted k! times.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(mask)?', options: [
        { text: 'The sum over neighbours u of the lowest vertex v of D(mask − v − u)', right: true, why: 'Pair v with u, then match the rest.' },
        { text: 'The sum over neighbours u of D(mask − v)', why: 'u is used up too, so it must leave the set.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0) = 1', right: true, why: 'The empty set has one matching, with no edges.' },
        { text: 'D(0) = 0', why: 'Then nothing can be counted.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(all vertices)', right: true, why: 'Every vertex matched: the full mask.' },
        { text: 'The sum of D over all masks', why: 'That counts matchings of subsets too.' },
      ] },
    ],
    apply: { cell: [0, 15], misconceptions: [
      { answer: 3, feedback: '3 is the count for a complete graph; here 1–3 isn’t an edge, so pairing 0 with 2 leaves nothing.' },
      { answer: 1, feedback: 'Vertex 0 can pair with 1 (then 2–3) or with 3 (then 1–2).' },
    ] },
  },

  'subset-coloring': {
    problem: 'Find the fewest colours for the vertices of a graph so that neighbours differ.',
    tryFirst: {
      prompt: 'A star: centre 0 joined to 1, 2 and 3. How many colours are needed?',
      args: [4, [[0, 1], [0, 2], [0, 3]]], answer: 2,
      misconceptions: [
        { answer: 4, feedback: 'The leaves aren’t joined to each other, so they can share a colour.' },
        { answer: 3, feedback: 'All three leaves can share one colour: 2 in all.' },
      ],
      explain: 'One colour for the centre, another for every leaf.',
    },
    steps: [
      { kind: 'state', ask: 'What should χ(mask) hold?', options: [
        { text: 'The fewest colours for the vertices in mask', right: true, why: 'Removing one colour class leaves a smaller mask.' },
        { text: 'Whether mask can be coloured with 2 colours', why: 'The answer may need more than 2.' },
      ] },
      { kind: 'split', ask: 'What is a colour class?', options: [
        { text: 'An independent set: no edge between two of its vertices', right: true, why: 'Vertices of one colour must not be neighbours.' },
        { text: 'Any set of vertices', why: 'Two neighbours can’t share a colour.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills χ(mask)?', options: [
        { text: '1 + min χ(mask − I) over independent I ⊆ mask containing mask’s lowest vertex', right: true, why: 'One class holds that vertex; fixing it avoids trying classes in every order.' },
        { text: '1 + χ(mask − lowest vertex)', why: 'That gives every vertex its own colour.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'χ(0) = 0, with the independent masks worked out first', right: true, why: 'No vertices need no colours at all.' },
        { text: 'χ(0) = 1', why: 'An empty graph needs no colours.' },
      ] },
      increasing,
      { kind: 'answer', ask: 'How much work is this?', options: [
        { text: 'About 3ⁿ: every mask with every submask', right: true, why: 'Exponential, as expected: the chromatic number is NP-hard.' },
        { text: 'About n²', why: 'No polynomial method is known for general graphs.' },
      ] },
    ],
    apply: { cell: [1, 15], misconceptions: [
      { answer: 3, feedback: 'A cycle of 4 is even: alternate two colours around it.' },
      { answer: 4, feedback: 'Opposite vertices aren’t joined, so they share a colour: 2.' },
    ] },
  },

  'mask-language': {
    problem: 'XOR together the masks of several sets of bit positions, where positions go past 63, and return the result as a decimal string.',
    tryFirst: {
      prompt: 'Sets {0, 1} and {1, 2}. What number is the XOR of their masks?',
      args: [[[0, 1], [1, 2]]], answer: 5,
      misconceptions: [
        { answer: 7, feedback: '7 is the OR: bit 1 is in both sets, so XOR turns it off.' },
        { answer: 2, feedback: '2 is the AND, the shared bit. XOR keeps the bits in exactly one set.' },
      ],
      explain: '0b011 XOR 0b110 = 0b101 = 5.',
    },
    steps: [
      { kind: 'state', ask: 'What type holds a mask with bit 99?', options: [
        { text: 'A BigInt in JavaScript (an ordinary int in Python)', right: true, why: 'JavaScript’s bitwise operators on numbers work in 32 bits.' },
        { text: 'An ordinary JavaScript number', why: 'Bitwise operations on numbers keep only 32 bits.' },
      ] },
      { kind: 'split', ask: 'How is bit p set?', options: [
        { text: 'm |= 1n << BigInt(p)', right: true, why: 'Both sides of the shift are BigInt, so nothing wraps.' },
        { text: 'm |= BigInt(1 << p)', why: '1 << p is computed in 32 bits first: 1 << 40 is 256.' },
      ] },
      { kind: 'recurrence', ask: 'How are the sets combined?', options: [
        { text: 'x ^= m for each set’s mask', right: true, why: 'XOR keeps the bits that appear an odd number of times.' },
        { text: 'x |= m', why: 'That keeps every bit that appears at all.' },
      ] },
      { kind: 'base', ask: 'What does x start as?', options: [
        { text: '0n, the empty mask', right: true, why: 'XOR with 0 changes nothing.' },
        { text: '0, an ordinary number', why: 'Mixing a number with BigInts throws an error in JavaScript.' },
      ] },
      { kind: 'order', ask: 'Does the order of the sets matter?', options: [
        { text: 'No: XOR is associative and commutative', right: true, why: 'Any order gives the same bits.' },
        { text: 'Yes: later sets override earlier ones', why: 'XOR combines them symmetrically.' },
      ] },
      { kind: 'answer', ask: 'Why return a string?', options: [
        { text: 'JSON numbers can’t hold a 100-bit integer exactly', right: true, why: 'A decimal string carries every digit.' },
        { text: 'Strings are faster to compare', why: 'Exactness is the reason, not speed.' },
      ] },
    ],
    apply: { cell: [2, 0], misconceptions: [
      { answer: 135, feedback: '135 keeps bit 1, which is in both sets: that is the OR. XOR clears it.' },
      { answer: 130, feedback: '130 is 2¹ + 2⁷; the final row has bits 0, 2 and 7.' },
    ] },
  },
}
