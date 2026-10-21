// "Design it yourself" for the tree lessons (Advanced, trees group). Format: designs.js. Trees are rooted
// at 0. Challenges that return one value per vertex are asked about vertex 1 (PICK in designs.test.js).
// apply asks for a cell of each lesson's live table; every other number was printed by
// advanced-oracles.js before it was typed.

const leafBase = (what, value) => ({ kind: 'base', ask: 'What does a leaf hold?', options: [
  { text: what, right: true, why: `A leaf has no children to combine, so its value is ${value} directly.` },
  { text: 'Nothing: leaves are skipped', why: 'Every vertex needs a value, and the leaves are where the combining starts.' },
] })
const childrenFirst = { kind: 'order', ask: 'In what order are the vertices filled?', options: [
  { text: 'Children before parents: a depth-first post-order, or a breadth-first order reversed', right: true, why: 'Every value is built from its children’s, so they must be finished first.' },
  { text: 'In order of vertex number', why: 'Numbers say nothing about the tree: a parent may have a larger number than its child.' },
] }

export const TREE_DESIGNS = {
  'tree-basics': {
    problem: 'Root a tree at vertex 0 and find the size of every vertex’s subtree: the vertex and everything below it.',
    tryFirst: {
      prompt: 'Edges 0–1, 1–2, 1–3, rooted at 0. How big is vertex 1’s subtree?',
      args: [4, [[0, 1], [1, 2], [1, 3]]], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 counts vertex 1’s children. Its subtree includes vertex 1 itself.' },
        { answer: 4, feedback: '4 is the whole tree, vertex 0’s subtree. Vertex 0 is above vertex 1.' },
      ],
      explain: 'Vertex 1 and its two children, 2 and 3.',
    },
    steps: [
      { kind: 'state', ask: 'What should size(v) hold?', options: [
        { text: 'The number of vertices in v’s subtree, v included', right: true, why: 'That is the answer for v, and it is built from the same thing for v’s children.' },
        { text: 'The number of v’s neighbours', why: 'That counts the parent too, and says nothing about the vertices further down.' },
      ] },
      { kind: 'split', ask: 'How does v’s subtree divide?', options: [
        { text: 'Into v itself and one subtree for each child, none overlapping', right: true, why: 'Each vertex below v hangs from exactly one of v’s children.' },
        { text: 'Into a left half and a right half', why: 'A vertex can have any number of children; it isn’t a binary split.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills size(v)?', options: [
        { text: 'size(v) = 1 + the sum of its children’s sizes', right: true, why: 'Disjoint pieces add, and the 1 counts v.' },
        { text: 'size(v) = 1 + the largest child’s size', why: 'Every child’s subtree is part of v’s, not just the largest.' },
      ] },
      leafBase('size = 1', '1'),
      childrenFirst,
      { kind: 'answer', ask: 'Where are the answers?', options: [
        { text: 'size(v) for every vertex, each final once its children are added', right: true, why: 'The challenge asks for every subtree, and each cell is one of them.' },
        { text: 'size(root) alone', why: 'That is the whole tree, n. The question asks for every vertex’s subtree.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 6, feedback: '6 adds the two children’s sizes but forgets vertex 0 itself.' },
      { answer: 3, feedback: '3 is one child’s subtree. Vertex 0 has two children.' },
    ] },
  },

  'tree-independent': {
    problem: 'Vertices of a tree have weights. Choose vertices, no two joined by an edge, to make the total weight as large as possible.',
    tryFirst: {
      prompt: 'A path 0–1–2 with weights 4, 5, 4. What is the largest total?',
      args: [[4, 5, 4], [[0, 1], [1, 2]]], answer: 8,
      misconceptions: [
        { answer: 5, feedback: '5 takes the heaviest vertex, which blocks both others. The two ends together weigh 8.' },
        { answer: 13, feedback: '13 takes all three, but neighbours can’t both be chosen.' },
      ],
      explain: 'Vertices 0 and 2: 4 + 4 = 8.',
    },
    steps: [
      { kind: 'state', ask: 'What should be kept for each vertex?', options: [
        { text: 'One number: the best total in v’s subtree', why: 'The parent needs to know whether v was taken: if so, the parent can’t be.' },
        { text: 'Two numbers: the best in v’s subtree with v taken, and with v skipped', right: true, why: 'Whether v is taken decides what its parent may do, so both are kept.' },
      ] },
      { kind: 'split', ask: 'What is the choice at v?', options: [
        { text: 'Take v or skip it', right: true, why: 'Once that is fixed, each child’s subtree can be solved on its own.' },
        { text: 'Which child to take', why: 'Several children can be taken together; they aren’t neighbours of each other.' },
      ] },
      { kind: 'recurrence', ask: 'Which pair of rules is right?', options: [
        { text: 'Take(v) = w(v) + Σ Skip(c); Skip(v) = Σ max(Take(c), Skip(c))', right: true, why: 'A taken vertex forces its children skipped; a skipped one leaves them free.' },
        { text: 'Take(v) = w(v) + Σ max(Take(c), Skip(c)); Skip(v) = Σ Skip(c)', why: 'That lets a taken vertex sit next to a taken child, and stops a skipped vertex’s children being taken.' },
      ] },
      leafBase('Take = its weight, Skip = 0', 'its weight if taken and 0 if skipped'),
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'max(Take(root), Skip(root))', right: true, why: 'The root may go either way.' },
        { text: 'Take(root)', why: 'The best choice may leave the root out.' },
      ] },
    ],
    apply: { cell: [1, 6], misconceptions: [
      { answer: 16, feedback: '16 skips both children, but a skipped root leaves them free: take(1) = 9 beats skip(1) = 6.' },
      { answer: 10, feedback: '10 takes both children, but skip(2) = 10 is better than take(2) = 1.' },
    ] },
  },

  'tree-cover': {
    problem: 'Choose as few vertices as possible so that every edge of the tree has at least one chosen end.',
    tryFirst: {
      prompt: 'A path of 5 vertices, 0–1–2–3–4. What is the fewest vertices that touch every edge?',
      args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 takes every other vertex starting at an end: 0, 2, 4. Vertices 1 and 3 touch all four edges.' },
        { answer: 4, feedback: 'Each vertex in the middle touches two edges, so fewer are needed.' },
      ],
      explain: 'Vertices 1 and 3: each covers the two edges beside it.',
    },
    steps: [
      { kind: 'state', ask: 'What should be kept for each vertex?', options: [
        { text: 'The smallest cover of v’s subtree with v chosen, and with v not chosen', right: true, why: 'The edge to the parent is covered by one of the two, so the parent needs both.' },
        { text: 'The smallest cover of v’s subtree', why: 'Whether that cover includes v decides whether the parent must cover the edge between them.' },
      ] },
      { kind: 'split', ask: 'What does each edge to a child require?', options: [
        { text: 'v or the child (or both) must be chosen', right: true, why: 'That is the covering rule for that edge.' },
        { text: 'Exactly one of them must be chosen', why: 'Both may be chosen; the rule only forbids neither.' },
      ] },
      { kind: 'recurrence', ask: 'Which pair of rules is right?', options: [
        { text: 'S(v) = 1 + Σ min(S(c), U(c)); U(v) = Σ S(c)', right: true, why: 'A chosen v covers its child edges, so children go either way; an unchosen v forces every child to be chosen.' },
        { text: 'S(v) = 1 + Σ S(c); U(v) = Σ min(S(c), U(c))', why: 'That is backwards: an unchosen v would leave an edge with no chosen end.' },
      ] },
      leafBase('S = 1, U = 0', '1 if chosen and 0 if not'),
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min(S(root), U(root))', right: true, why: 'The root has no edge above it, so it may go either way.' },
        { text: 'S(root)', why: 'The root need not be chosen.' },
      ] },
    ],
    apply: { cell: [1, 6], misconceptions: [
      { answer: 4, feedback: 'With vertex 0 unchosen, each child must be chosen: S(2) + S(1), not U.' },
      { answer: 1, feedback: 'Both edges at vertex 0 need a chosen child: two children, S(2) + S(1).' },
    ] },
  },

  'tree-matching': {
    problem: 'Choose as many edges of the tree as possible so that no two chosen edges share a vertex.',
    tryFirst: {
      prompt: 'A star: centre 0 with leaves 1, 2, 3, 4. What is the largest matching?',
      args: [5, [[0, 1], [0, 2], [0, 3], [0, 4]]], answer: 1,
      misconceptions: [
        { answer: 4, feedback: 'Every edge touches the centre, so any two chosen edges would share it.' },
        { answer: 2, feedback: 'Two edges would both use vertex 0.' },
      ],
      explain: 'Any one edge; every edge uses the centre.',
    },
    steps: [
      { kind: 'state', ask: 'What should be kept for each vertex?', options: [
        { text: 'The best matching in v’s subtree with v unmatched, and the best overall', right: true, why: 'The parent can match to v only if v is unmatched below.' },
        { text: 'Only the best matching in v’s subtree', why: 'If that matching uses v, the parent can’t match to v.' },
      ] },
      { kind: 'split', ask: 'What is the choice at v?', options: [
        { text: 'Leave v unmatched, or match it to exactly one child', right: true, why: 'A vertex is in at most one chosen edge.' },
        { text: 'Match v to every child', why: 'Those edges would all share v.' },
      ] },
      { kind: 'recurrence', ask: 'What does matching v to child c add?', options: [
        { text: '1 for the edge, and c’s subtree must use free(c) instead of best(c)', right: true, why: 'c is now taken, so it can’t also be matched below.' },
        { text: 'Just 1 for the edge', why: 'c might already be matched to one of its own children.' },
      ] },
      leafBase('free = best = 0', '0: nothing to match'),
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'best(root)', right: true, why: 'The root may be matched or not.' },
        { text: 'free(root)', why: 'That forbids matching the root.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 2, feedback: '2 matches vertex 1 to both of its children, but those edges share vertex 1.' },
      { answer: 0, feedback: '0 leaves vertex 1 unmatched, but matching it to a child adds an edge.' },
    ] },
  },

  'tree-diameter': {
    problem: 'Edges of a tree have positive lengths. Find the length of the longest path between any two vertices.',
    tryFirst: {
      prompt: 'Centre 0 with edges to 1 (length 5), 2 (3) and 3 (4). What is the longest path?',
      args: [4, [[0, 1, 5], [0, 2, 3], [0, 3, 4]]], answer: 9,
      misconceptions: [
        { answer: 12, feedback: '12 adds every edge, but a path can’t branch: it uses two of them.' },
        { answer: 5, feedback: '5 is one edge. A path can run from leaf 1 through the centre to leaf 3.' },
      ],
      explain: 'From 1 through 0 to 3: 5 + 4 = 9.',
    },
    steps: [
      { kind: 'state', ask: 'What should down(v) hold?', options: [
        { text: 'The longest path from v down into its subtree', right: true, why: 'A longest path through v as its top joins two of these branches.' },
        { text: 'The longest path anywhere in v’s subtree', why: 'That is useful as a record, but the parent needs a path that ends at v to extend.' },
      ] },
      { kind: 'split', ask: 'Where does every path have a special vertex?', options: [
        { text: 'Its highest vertex: the path goes down into at most two of its branches', right: true, why: 'So trying every vertex as the top tries every path.' },
        { text: 'Its middle vertex', why: 'The middle is hard to find; the top is easy, because the path only goes down from it.' },
      ] },
      { kind: 'recurrence', ask: 'How is the best path through v as its top found?', options: [
        { text: 'Add v’s two longest branches, each down(c) + the edge to c', right: true, why: 'They must be different branches, or the path would go down and back up the same edge.' },
        { text: 'Twice v’s longest branch', why: 'That uses the same branch twice: not a path.' },
      ] },
      leafBase('down = 0', '0: no path goes below it'),
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest “two longest branches” over every vertex', right: true, why: 'The longest path’s top can be anywhere.' },
        { text: 'down(root)', why: 'That path starts at the root; the longest path may not touch it.' },
      ] },
    ],
    apply: { cell: [1, 6], misconceptions: [
      { answer: 10, feedback: '10 is vertex 0’s longest branch alone. The path continues down a second branch: + 9.' },
      { answer: 20, feedback: '20 joins the longest branch with itself. The second branch is down(1) + 4 = 9.' },
    ] },
  },

  'tree-reroot': {
    problem: 'For every vertex of a tree, find the distance (in edges) to the vertex farthest from it.',
    tryFirst: {
      prompt: 'Edges 0–1, 1–2, 0–3. How far is the farthest vertex from vertex 1?',
      args: [4, [[0, 1], [1, 2], [0, 3]]], answer: 2,
      misconceptions: [
        { answer: 1, feedback: '1 only looks down from vertex 1, to 2. Up through 0, vertex 3 is 2 away.' },
        { answer: 3, feedback: '3 is the longest path in the tree, from 2 to 3. From vertex 1 both ends are closer.' },
      ],
      explain: 'From 1: vertex 2 is 1 away, 0 is 1, and 3 is 2 (through 0).',
    },
    steps: [
      { kind: 'state', ask: 'What two directions can the farthest vertex lie in?', options: [
        { text: 'Down into v’s subtree, or up through v’s parent', right: true, why: 'So keep down(v) and up(v), and the answer is the larger.' },
        { text: 'Left or right of v', why: 'A tree vertex can have many children; the useful split is below versus above.' },
      ] },
      { kind: 'split', ask: 'Where does up(v) go after reaching the parent p?', options: [
        { text: 'Further up (up(p)), or down one of p’s other branches', right: true, why: 'It must not come back down through v.' },
        { text: 'Down p’s deepest branch', why: 'p’s deepest branch may be v’s own.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills up(v)?', options: [
        { text: '1 + max(up(p), p’s deepest branch that isn’t v’s)', right: true, why: 'So each vertex keeps its two deepest branches: if v gives the deepest, the second is used.' },
        { text: '1 + max(up(p), down(p))', why: 'down(p) may run through v, counting a path that goes back on itself.' },
      ] },
      { kind: 'base', ask: 'What starts each pass?', options: [
        { text: 'Leaves have down = 0; the root has up = 0', right: true, why: 'Nothing lies below a leaf or above the root.' },
        { text: 'Every up starts at down', why: 'up looks in the other direction; it is computed from the parent.' },
      ] },
      { kind: 'order', ask: 'In what order are the two passes made?', options: [
        { text: 'down children first, then up parents first', right: true, why: 'up(v) reads the parent’s up and its branches, which must be ready.' },
        { text: 'Both children first', why: 'up(v) needs up(parent), which a children-first pass hasn’t computed yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer for v?', options: [
        { text: 'max(down(v), up(v))', right: true, why: 'The farthest vertex is below or above.' },
        { text: 'down(v) + up(v)', why: 'That joins two directions into a path through v, not a distance from v.' },
      ] },
    ],
    apply: { cell: [2, 2], input: { n: 4, edges: [[0, 1], [1, 2], [0, 3]] }, misconceptions: [
      { answer: 3, feedback: '3 uses down(0) = 2, but vertex 0’s deepest branch is vertex 1’s own. Use second(0) = 1.' },
      { answer: 1, feedback: 'up(1) goes up to 0 and on: 1 + the better of up(0) and second(0).' },
    ] },
  },

  'reroot-prefix': {
    problem: 'For every vertex of a tree, count the connected sets of vertices that contain it (modulo a prime, so no division).',
    tryFirst: {
      prompt: 'A path 0–1–2. How many connected sets contain vertex 1?',
      args: [3, [[0, 1], [1, 2]]], answer: 4,
      misconceptions: [
        { answer: 6, feedback: '6 counts every connected set of the tree. Two of them, {0} and {2}, don’t contain 1.' },
        { answer: 3, feedback: 'List them: {1}, {0, 1}, {1, 2} and {0, 1, 2}.' },
      ],
      explain: '{1}, {0, 1}, {1, 2} and {0, 1, 2}: from each neighbour, take it or not.',
    },
    steps: [
      { kind: 'state', ask: 'What two counts does each vertex need?', options: [
        { text: 'down(v): sets with top v in its subtree; up(v): sets above v containing its parent but not v', right: true, why: 'A set through v is a set below v joined, or not, to one above.' },
        { text: 'The number of vertices below and above v', why: 'Sizes don’t count connected sets.' },
      ] },
      { kind: 'split', ask: 'What does each child contribute to down(v)?', options: [
        { text: 'Nothing, or a set through the child: 1 + down(child) choices', right: true, why: 'The children choose independently, so the choices multiply.' },
        { text: 'down(child) choices', why: 'That forgets the choice of not entering the child.' },
      ] },
      { kind: 'recurrence', ask: 'How is “every sibling’s factor but v’s” found under a modulus?', options: [
        { text: 'The product of the factors before v times the product after it (prefix · suffix)', right: true, why: 'No division is needed, which matters because a factor can be 0 modulo the prime.' },
        { text: 'Divide the full product by v’s factor', why: 'Division modulo a prime needs an inverse, and a factor that is 0 mod p has none.' },
      ] },
      { kind: 'base', ask: 'What starts the counts?', options: [
        { text: 'A leaf has down = 1 ({v}); the root has up = 0', right: true, why: 'Nothing lies below a leaf or above the root.' },
        { text: 'Every down starts at 0', why: 'Every vertex has at least the set {v}.' },
      ] },
      { kind: 'order', ask: 'In what order are the counts filled?', options: [
        { text: 'down children first, then up parents first', right: true, why: 'up(c) reads up(parent) and its siblings’ down values.' },
        { text: 'up first, then down', why: 'up needs the siblings’ down values.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer for v?', options: [
        { text: 'down(v) · (1 + up(v))', right: true, why: 'A set below v, joined to nothing above or to one of up(v) sets.' },
        { text: 'down(v) + up(v)', why: 'The two parts combine freely, so their counts multiply.' },
      ] },
    ],
    apply: { cell: [1, 3], misconceptions: [
      { answer: 24, feedback: '24 includes vertex 5’s own factor (1 + down(5)). The sets above 5 must not come back down through it.' },
      { answer: 6, feedback: '6 is 1 + up(2) alone. Vertex 5’s sibling 6 adds a factor too: (1 + down(6)) = 2.' },
    ] },
  },

  'tree-distances': {
    problem: 'For every vertex of a tree, find the sum of its distances (in edges) to all the other vertices.',
    tryFirst: {
      prompt: 'A star: centre 0 with leaves 1, 2, 3. What is the sum of distances from vertex 1?',
      args: [4, [[0, 1], [0, 2], [0, 3]]], answer: 5,
      misconceptions: [
        { answer: 3, feedback: '3 is the sum from the centre. From leaf 1, the other leaves are 2 edges away.' },
      ],
      explain: '1 to the centre, then 2 to each other leaf: 1 + 2 + 2 = 5.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed once, and what from it?', options: [
        { text: 'The root’s sum directly, then every other vertex’s sum from its parent’s', right: true, why: 'Moving one edge changes every distance by exactly 1, which is easy to count.' },
        { text: 'Every vertex’s sum by its own search', why: 'That is n searches; one search and one adjustment per edge is enough.' },
      ] },
      { kind: 'split', ask: 'Moving from parent p to child v, which distances change?', options: [
        { text: 'The size(v) vertices in v’s subtree get 1 closer; the other n − size(v) get 1 farther', right: true, why: 'Every vertex is on one side of the edge p–v.' },
        { text: 'Only v’s distance changes', why: 'Every distance changes, since every path from the new start begins differently.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills S(v)?', options: [
        { text: 'S(v) = S(p) + n − 2·size(v)', right: true, why: '− size(v) for those closer, + (n − size(v)) for those farther.' },
        { text: 'S(v) = S(p) + 2·size(v) − n', why: 'That has the sign the wrong way: the subtree gets closer, not farther.' },
      ] },
      { kind: 'base', ask: 'How is the root’s sum found?', options: [
        { text: 'Add every vertex’s depth (equivalently, every non-root subtree size)', right: true, why: 'Each edge is crossed by the paths from the root to the vertices below it.' },
        { text: 'It is n − 1', why: 'That would be true only if every vertex were next to the root.' },
      ] },
      { kind: 'order', ask: 'In what order are the passes made?', options: [
        { text: 'Sizes children first; sums parents first', right: true, why: 'S(v) reads S(parent) and size(v).' },
        { text: 'Both parents first', why: 'size(v) needs its children’s sizes first.' },
      ] },
      { kind: 'answer', ask: 'Where are the answers?', options: [
        { text: 'S(v) for every vertex, after the second pass', right: true, why: 'Each vertex’s sum is filled from its parent’s, so the whole row is the answer.' },
        { text: 'S(root) alone', why: 'That is only the root’s sum; every vertex needs its own.' },
      ] },
    ],
    apply: { cell: [1, 4], misconceptions: [
      { answer: 15, feedback: '15 flips the sign: S(0) + 2·size(1) − n. Vertex 1’s five-vertex subtree gets closer.' },
      { answer: 12, feedback: 'Subtract size(1) twice: the subtree gets closer (−5) and the rest farther (+1).' },
    ] },
  },

  'tree-knapsack': {
    problem: 'Vertices have values and costs. Choose vertices hanging from the root (each chosen vertex’s parent chosen too) with total cost within a budget, to make the value as large as possible.',
    tryFirst: {
      prompt: 'Root 0 (value 3, cost 1) with children 1 (value 5, cost 2) and 2 (value 4, cost 2). Budget 3. What is the best value?',
      args: [[3, 5, 4], [1, 2, 2], [[0, 1], [0, 2]], 3], answer: 8,
      misconceptions: [
        { answer: 12, feedback: 'All three cost 5, more than the budget.' },
        { answer: 9, feedback: '9 takes both children, but without the root they can’t be chosen, and with it they cost 5.' },
      ],
      explain: 'The root and child 1: cost 3, value 3 + 5 = 8.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(v, b) hold?', options: [
        { text: 'The best value from v’s subtree with v chosen and cost at most b', right: true, why: 'Choosing v is what allows its children; the budget is the resource.' },
        { text: 'The best value from any vertices of v’s subtree within cost b', why: 'That lets a vertex be chosen without its parent, which the rule forbids: a deep, valuable vertex would be taken on its own.' },
      ] },
      { kind: 'split', ask: 'How are several children combined?', options: [
        { text: 'One at a time, trying every way to split the budget between what is merged so far and the next child', right: true, why: 'A knapsack over children, where each child offers a whole table of options.' },
        { text: 'Give every child the whole budget', why: 'The budget is shared; the children together must fit.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule merges a child c?', options: [
        { text: 'new(b) = max over x of current(b − x) + D(c, x), or current(b) without c', right: true, why: 'x is what the child’s subtree spends.' },
        { text: 'new(b) = current(b) + D(c, b)', why: 'That spends the same budget twice.' },
      ] },
      { kind: 'base', ask: 'What starts D(v, ·) before any child is merged?', options: [
        { text: 'value(v) where b ≥ cost(v), else impossible', right: true, why: 'v alone is possible exactly when its cost fits in b.' },
        { text: 'value(v) for every b', why: 'A budget below v’s cost can’t choose v.' },
      ] },
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'max(0, D(root, budget))', right: true, why: 'Choose the root and its best, or nothing.' },
        { text: 'The best D(v, budget) over every vertex', why: 'A vertex can only be chosen with its parent, all the way up.' },
      ] },
    ],
    apply: { cell: [4, 4], misconceptions: [
      { answer: 9, feedback: '9 adds only child 3. With budget 4 the root (cost 1) and child 3 (cost 2) leave 1 for child 2: + D(2,1) = 1.' },
      { answer: 15, feedback: '15 also takes vertex 1, but vertex 1 hangs from vertex 3 and the budget is used up.' },
    ] },
  },

  'tree-coloring': {
    problem: 'Each vertex may take one of its allowed colours. Count the colourings in which the two ends of every edge differ.',
    tryFirst: {
      prompt: 'Centre 0 with leaves 1 and 2; every vertex may be colour 1 or 2. How many proper colourings are there?',
      args: [[[0, 1], [0, 2]], [[1, 2], [1, 2], [1, 2]]], answer: 2,
      misconceptions: [
        { answer: 8, feedback: '8 is every colouring, 2³. Each leaf must differ from the centre.' },
        { answer: 4, feedback: 'Once the centre is coloured, both leaves are forced to the other colour.' },
      ],
      explain: 'Choose the centre’s colour (2 ways); each leaf takes the other.',
    },
    steps: [
      { kind: 'state', ask: 'What should be kept for each vertex?', options: [
        { text: 'W(v, c): colourings of v’s subtree with v coloured c, for each colour', right: true, why: 'The parent’s colour decides which of the child’s colourings are allowed.' },
        { text: 'The number of colourings of v’s subtree', why: 'The parent needs to exclude the colourings where the child matches it.' },
      ] },
      { kind: 'split', ask: 'How do the children combine?', options: [
        { text: 'Independently: their counts multiply', right: true, why: 'With v’s colour fixed, one child’s colouring doesn’t affect another’s.' },
        { text: 'Their counts add', why: 'Each child’s colouring is combined with every other’s, so they multiply.' },
      ] },
      { kind: 'recurrence', ask: 'What does a child contribute when v is coloured c?', options: [
        { text: 'All its colourings minus those where it is c', right: true, why: 'Only the child’s own colour must differ from v’s.' },
        { text: 'All its colourings', why: 'Some of them colour the child c, the same as v.' },
      ] },
      { kind: 'base', ask: 'What does a leaf hold?', options: [
        { text: '1 for each allowed colour, 0 for the rest', right: true, why: 'A leaf alone has one colouring per allowed colour.' },
        { text: '1 for every colour', why: 'A colour not allowed at the leaf gives no colouring.' },
      ] },
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of the root’s W over its colours', right: true, why: 'The root may take any allowed colour.' },
        { text: 'The root’s largest W', why: 'Every colour of the root gives different colourings, so they add.' },
      ] },
    ],
    apply: { cell: [0, 4], misconceptions: [
      { answer: 12, feedback: '12 multiplies the children’s totals, 3 · 4, without leaving out the colourings where a child is colour 1.' },
      { answer: 6, feedback: 'The children are independent, so multiply: (3 − 1) · (4 − 0).' },
    ] },
  },

  'tree-path-count': {
    problem: 'Count the unordered pairs of vertices at distance exactly k in a tree.',
    tryFirst: {
      prompt: 'A path of 5 vertices, 0–1–2–3–4, and k = 2. How many pairs are 2 edges apart?',
      args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]], 2], answer: 3,
      misconceptions: [
        { answer: 4, feedback: '4 is the number of pairs at distance 1 (the edges).' },
        { answer: 6, feedback: '6 counts each pair twice, once from each end.' },
      ],
      explain: '(0, 2), (1, 3) and (2, 4).',
    },
    steps: [
      { kind: 'state', ask: 'What should be kept for each vertex?', options: [
        { text: 'cnt(v, d): how many vertices are d edges below v, for d up to k', right: true, why: 'A path through v joins depths from two branches.' },
        { text: 'The number of pairs in v’s subtree', why: 'The parent can’t extend a count of pairs; it needs depths.' },
      ] },
      { kind: 'split', ask: 'Where is each path counted once?', options: [
        { text: 'At its highest vertex', right: true, why: 'Each path has exactly one, and from there it goes down one branch or two.' },
        { text: 'At both of its ends', why: 'That counts every pair twice.' },
      ] },
      { kind: 'recurrence', ask: 'How are paths through two branches of v counted?', options: [
        { text: 'Before merging a child, pair its depths with the branches already merged so the lengths add to k', right: true, why: 'Pairing first keeps the two ends in different branches.' },
        { text: 'Merge every child, then pair cnt(v) with itself', why: 'That pairs a branch with itself and counts paths that aren’t paths.' },
      ] },
      { kind: 'base', ask: 'What does a vertex start with?', options: [
        { text: 'cnt(v, 0) = 1 (itself), everything else 0', right: true, why: 'Paths straight down from v pair with depth 0.' },
        { text: 'cnt(v, 1) = 1', why: 'v is at depth 0 below itself.' },
      ] },
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The total, over every vertex, of the paths whose highest vertex it is', right: true, why: 'Each path is counted once, at its top, so the totals add up to every pair.' },
        { text: 'cnt(root, k)', why: 'That counts only the paths that start at the root and go straight down.' },
      ] },
    ],
    apply: { cell: [4, 6], misconceptions: [
      { answer: 0, feedback: '0 counts only the paths straight down from vertex 0. Paths of length 3 also join depth 0 in one branch to depth 1 in the other.' },
      { answer: 8, feedback: '8 counts each pair twice. Each child pair (a, b) is counted once.' },
    ] },
  },

  'tree-connected': {
    problem: 'Count the non-empty sets of vertices that are connected in the tree.',
    tryFirst: {
      prompt: 'A path 0–1–2. How many non-empty connected sets are there?',
      args: [3, [[0, 1], [1, 2]]], answer: 6,
      misconceptions: [
        { answer: 7, feedback: '7 is every non-empty set. {0, 2} isn’t connected: vertex 1 is missing.' },
        { answer: 3, feedback: 'Larger sets count too: {0, 1}, {1, 2}, {0, 1, 2}.' },
      ],
      explain: 'Three single vertices, two edges, and the whole path.',
    },
    steps: [
      { kind: 'state', ask: 'How is each connected set counted once?', options: [
        { text: 'By its highest vertex: C(v) counts the sets whose top is v', right: true, why: 'Every connected set has exactly one vertex closest to the root.' },
        { text: 'By its size', why: 'Sizes don’t split the problem into subtrees.' },
      ] },
      { kind: 'split', ask: 'For a set with top v, what does each child contribute?', options: [
        { text: 'Nothing, or a connected set with top that child', right: true, why: 'A part below a child must reach the child to stay connected to v.' },
        { text: 'Any subset of the child’s subtree', why: 'A part that doesn’t include the child is cut off from v.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills C(v)?', options: [
        { text: 'C(v) = Π over children of (1 + C(c))', right: true, why: 'Each child independently: nothing (1) or one of C(c) sets.' },
        { text: 'C(v) = 1 + Σ C(c)', why: 'That allows only one child at a time; several children can join v together.' },
      ] },
      leafBase('C = 1, the set {v}', '1'),
      childrenFirst,
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of C(v) over every vertex', right: true, why: 'Every set has one top, so each is counted once.' },
        { text: 'C(root)', why: 'That counts only the sets that contain the root.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 16, feedback: '16 multiplies C(2) · C(1) and forgets the option of taking nothing from a child: (1 + 4) · (1 + 4).' },
      { answer: 10, feedback: 'The children choose independently, so multiply: 5 · 5.' },
    ] },
  },

  'tree-small-large': {
    problem: 'Each vertex has a colour. For every vertex, count the different colours in its subtree.',
    tryFirst: {
      prompt: 'Colours [1, 2, 2, 1]; edges 0–1, 1–2, 1–3. How many different colours are in vertex 1’s subtree?',
      args: [[1, 2, 2, 1], [[0, 1], [1, 2], [1, 3]]], answer: 2,
      misconceptions: [
        { answer: 3, feedback: '3 counts vertices. Two of them share colour 2.' },
        { answer: 1, feedback: 'Vertex 3 has colour 1 and vertices 1 and 2 colour 2: two colours.' },
      ],
      explain: 'Vertices 1, 2, 3 have colours 2, 2, 1: two different colours.',
    },
    steps: [
      { kind: 'state', ask: 'What should each vertex hold?', options: [
        { text: 'The set of colours in its subtree', right: true, why: 'A count alone can’t be combined: shared colours would be counted twice.' },
        { text: 'The number of colours in its subtree', why: 'Two children with 2 colours each may share one, so counts don’t add.' },
      ] },
      { kind: 'split', ask: 'How is v’s set made?', options: [
        { text: 'Its own colour joined with its children’s sets', right: true, why: 'A set keeps each colour once.' },
        { text: 'Its own colour plus the sizes of its children’s sets', why: 'That counts shared colours several times.' },
      ] },
      { kind: 'recurrence', ask: 'How are two sets joined cheaply?', options: [
        { text: 'Pour the smaller into the larger', right: true, why: 'An element that moves lands in a set at least twice as big, so it moves at most log₂ n times: O(n log n) in all.' },
        { text: 'Copy both into a new set', why: 'Copying the big set again at every level can cost n² on a path.' },
      ] },
      { kind: 'base', ask: 'What does each vertex start with?', options: [
        { text: 'The set of its own colour', right: true, why: 'Every subtree contains its root.' },
        { text: 'An empty set', why: 'Then the vertex’s own colour is never counted.' },
      ] },
      childrenFirst,
      { kind: 'answer', ask: 'When is a vertex’s answer read?', options: [
        { text: 'As soon as all its children are merged in, before its set is handed upward', right: true, why: 'Its set may be reused by the parent and grow, so reading it later gives too many.' },
        { text: 'At the very end, from all the sets', why: 'Reused sets have grown by then.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 7, feedback: '7 counts every vertex. Colours 1, 2 and 4 each appear more than once.' },
      { answer: 6, feedback: '6 adds the children’s counts, 3 + 3, but they share colours 1 and 2.' },
    ] },
  },
}
