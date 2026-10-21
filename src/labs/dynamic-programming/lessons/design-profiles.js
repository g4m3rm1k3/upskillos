// "Design it yourself" for the profile and decomposition lessons (Specialist, profiles group). Format:
// designs.js. Lessons with a live table ask for one of its cells; nice-tree-decomp (no table) asks a
// second hand-solved case. Every number was printed by specialist-oracles.js or the trace before it was typed.

export const PROFILE_DESIGNS = {
  'broken-profile': {
    problem: 'Count the domino tilings of an h × w board, for boards up to 8 rows by 200 columns, where listing the tilings is hopeless.',
    tryFirst: {
      prompt: 'A board 3 cells high and 2 wide. How many ways are there to tile it with dominoes?',
      args: [3, 2], answer: 3,
      misconceptions: [{ answer: 2, feedback: '2 misses one: three horizontal dominoes; or one horizontal at the top and two vertical ones below; or two vertical ones at the top and one horizontal below.' }],
      explain: 'Three: three horizontal dominoes, or one horizontal domino at the top or at the bottom with a vertical pair filling the rest.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold after some cells are filled?', options: [
        { text: 'The cell reached, and a mask saying which rows’ next cells are already covered', right: true, why: 'Everything before the cell is finished; the rest of the board only needs to know which cells a domino already reaches.' },
        { text: 'The cell reached, and how many dominoes are placed so far', why: 'The count doesn’t say which cells are covered, so boundaries that need different futures are merged.' },
        { text: 'Only the cell reached', why: 'Without the mask, a cell covered from the left looks the same as a free one.' },
      ] },
      { kind: 'split', ask: 'At a free cell, what is the last choice?', options: [
        { text: 'Which way the domino covering it lies: to the right or downwards', right: true, why: 'The cells above and to the left are done, so the domino covering this one must reach right or down.' },
        { text: 'Which way the domino lies: right, left, up or down', why: 'A domino reaching left or up covers a finished cell; it was placed already, and placing it again counts the tiling twice.' },
      ] },
      { kind: 'recurrence', ask: 'From mask s at cell (r, c), where can a tiling go?', options: [
        { text: 'Covered: clear bit r. Free: set bit r (domino right), or set bit r + 1 if the cell below is free (domino down)', right: true, why: 'These are the only ways the cell is covered, and each leaves the mask the next cell needs.' },
        { text: 'Covered: keep bit r set. Free: set bit r, or bit r + 1 if the cell below is free', why: 'A covered cell’s bit must be cleared, or the next column’s cell in that row looks covered too.' },
      ] },
      { kind: 'base', ask: 'What is the state before the first cell?', options: [
        { text: 'One way with the empty mask, none with any other', right: true, why: 'Nothing is placed yet, so nothing can be covered.' },
        { text: 'One way for every mask', why: 'A mask with a 1 would be a domino reaching into the first column from nowhere.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells processed?', options: [
        { text: 'Down each column, then on to the next column', right: true, why: 'Then the bits of the rows above the cell describe the next column and the rest this one, so h bits describe the whole boundary.' },
        { text: 'Any order, as long as every cell is visited once', why: 'The mask describes the boundary of one fixed scan. Jumping about leaves holes it can’t describe.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The empty mask after the last cell', right: true, why: 'Every cell is covered and nothing sticks out past the board.' },
        { text: 'The mask with every bit 1 after the last cell', why: 'Every bit 1 would mean a domino hanging past the board in every row; the full board leaves the empty mask.' },
      ] },
    ],
    apply: { cell: [5, 2], misconceptions: [
      { answer: 2, feedback: '2 is only the domino ↓ term. Mask 01 is also reached from 11, where this cell was already covered: + 1.' },
      { answer: 1, feedback: '1 is only the already-covered term. A free cell with mask 00 laying a domino ↓ reaches 01 too: + 2.' },
    ] },
  },

  'domino-tiling': {
    problem: 'Count the tilings of an h × w board by dominoes and L-shaped trominoes, each turned any way, for boards up to 6 rows by 300 columns.',
    tryFirst: {
      prompt: 'A board 2 cells high and 3 wide. How many tilings by dominoes and L-trominoes?',
      args: [2, 3], answer: 5,
      misconceptions: [
        { answer: 3, feedback: '3 counts the domino tilings only. Two L-trominoes can also interlock to fill the board, in two ways.' },
        { answer: 4, feedback: 'The interlocking pair of trominoes can be flipped top to bottom: two tilings, not one.' },
      ],
      explain: 'Three tilings by dominoes, and two by a pair of interlocking L-trominoes: 5.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold between two columns?', options: [
        { text: 'Which cells of the next column are already covered by pieces from earlier columns', right: true, why: 'No piece reaches more than one column ahead, so that mask is everything the rest of the board needs.' },
        { text: 'How many cells of the next column are covered', why: 'The count loses which rows they are, and the next pieces need particular cells free.' },
      ] },
      { kind: 'split', ask: 'How are the ways to fill one column found?', options: [
        { text: 'Cover the first free cell with every piece that fits, then repeat until the column is full', right: true, why: 'Every filling has exactly one piece on the first free cell, so each filling is found once.' },
        { text: 'Place pieces on any free cell, in any order, until the column is full', why: 'The same filling is reached once for each order its pieces could be placed in, and counted that many times.' },
        { text: 'Cover the first free cell with each piece that lies wholly in this column', why: 'Pieces reaching into the next column are left out, so no horizontal domino or tromino is ever placed.' },
      ] },
      { kind: 'recurrence', ask: 'How does one column change the counts?', options: [
        { text: 'W(c, t) = Σ over s of T(s, t) · W(c − 1, s)', right: true, why: 'Every way to arrive with mask s, times every way to fill the column from s to t.' },
        { text: 'W(c, t) = Σ over s of T(s, t) + W(c − 1, s)', why: 'An arrival and a filling happen one after the other, so their counts multiply; adding treats them as alternatives.' },
      ] },
      { kind: 'base', ask: 'What are the counts before the first column?', options: [
        { text: 'W(0, empty) = 1, every other mask 0', right: true, why: 'Nothing can stick into the first column.' },
        { text: 'W(0, s) = 1 for every s', why: 'A mask with 1s would be cells covered by pieces from a column that does not exist.' },
      ] },
      { kind: 'order', ask: 'How is the column table T found?', options: [
        { text: 'Once, from every starting mask, before the first column; each column reuses it', right: true, why: 'T depends only on the height and the pieces, not on which column it is.' },
        { text: 'Once, from the empty starting mask only', why: 'A column whose cells are partly covered already needs its own row of T, or such columns can never be filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'W(w, empty)', right: true, why: 'All w columns filled, and nothing sticking out past the last one.' },
        { text: 'W(w − 1, empty)', why: 'That leaves the last column unfilled.' },
      ] },
    ],
    apply: { cell: [3, 0], misconceptions: [
      { answer: 2, feedback: '2 is only the term from the empty mask. Arriving with the whole column covered, W(2,11) = 3, adds 1 · 3.' },
      { answer: 3, feedback: '3 is only the term from mask 11. Arriving with nothing covered and filling the column with a vertical domino adds 1 · 2.' },
    ] },
  },

  'profile-obstacles': {
    problem: 'Count the domino tilings of a board with blocked cells, up to 8 rows by 200 columns, where no domino may lie on a blocked cell.',
    tryFirst: {
      prompt: 'Board 0000; 1001 (1 = blocked): the bottom corners are blocked. How many domino tilings?',
      args: [[[0, 0, 0, 0], [1, 0, 0, 1]]], answer: 1,
      misconceptions: [{ answer: 2, feedback: 'Two vertical dominoes in the middle strand both top corners, which then have no free neighbour. Only the horizontal one at the bottom works.' }],
      explain: 'The two free bottom cells must share a horizontal domino; the top row is then two horizontal dominoes. One tiling.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold?', options: [
        { text: 'The cell reached and the mask of next cells already covered, as on an open board', right: true, why: 'Blocked cells are fixed by the input, so the mask still says everything the future needs.' },
        { text: 'The cell reached, and a mask of which next cells are blocked', why: 'Blocks are fixed by the input. The mask must say which next cells dominoes cover, which differs from one partial tiling to another.' },
        { text: 'The cell reached and the number of free cells left', why: 'That number is the same for every state at a cell, so it can’t tell boundaries apart.' },
      ] },
      { kind: 'split', ask: 'What happens at a blocked cell?', options: [
        { text: 'Nothing is placed; the mask passes on unchanged if no domino landed on it, and is dropped if one did', right: true, why: 'A blocked cell is full already, but a domino from the left reaching it would overlap it.' },
        { text: 'Nothing is placed, and its bit is set, because the cell is occupied', why: 'The bit describes the next cell of the row, which the block does not cover.' },
      ] },
      { kind: 'recurrence', ask: 'At a free cell, which dominoes may be laid?', options: [
        { text: 'Right if the next cell of the row is free; down if the cell below is free and not covered', right: true, why: 'A domino must lie on two free cells, and the one below must not already be taken.' },
        { text: 'Right if the next cell of the row is free; never down', why: 'A vertical domino is laid within one column; without it, a board one column wide has no tiling.' },
      ] },
      { kind: 'base', ask: 'What is the state before the first cell?', options: [
        { text: 'One way with the empty mask', right: true, why: 'Nothing is covered before anything is placed.' },
        { text: 'One way with the mask of the first column’s blocked cells', why: 'The mask says which next cells dominoes cover; blocks are checked at their own cells.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells processed?', options: [
        { text: 'Down each column, then the next column, blocked cells included', right: true, why: 'Visiting blocked cells keeps the scan and the meaning of each bit the same as on an open board.' },
        { text: 'All the free cells first, then the blocked ones', why: 'The free cells are then not in scan order, and the mask can’t describe the holes left between them.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The empty mask after the last cell', right: true, why: 'Every free cell covered, and nothing sticking out.' },
        { text: 'The empty mask after the last cell of the first column', why: 'That counts the ways to fill the first column only.' },
      ] },
    ],
    apply: { cell: [8, 4], misconceptions: [
      { answer: 1, feedback: 'Two masks lead to 001: a domino ↓ from 000, and the already-covered cell from 011. Add both: 1 + 1.' },
    ] },
  },

  'plug-dp': {
    problem: 'Count the ways to cover every free cell of a board with disjoint closed loops through neighbouring cells, up to 200 rows by 8 columns.',
    tryFirst: {
      prompt: 'A board 2 high and 4 wide, all free. How many ways to cover every cell with loops?',
      args: [[[0, 0, 0, 0], [0, 0, 0, 0]]], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'The big loop round the edge is one way. Two separate 2 × 2 loops, side by side, are another.' }],
      explain: 'One loop round the whole board, or two square loops side by side: 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold between processed and unprocessed cells?', options: [
        { text: 'For each of the w + 1 places where a line can cross the frontier, whether one does', right: true, why: 'Each finished cell already has its two lines; only the lines reaching into the rest matter.' },
        { text: 'How many lines cross the frontier', why: 'The count doesn’t say where they cross, and a line must continue into a particular cell.' },
        { text: 'Which cells have been visited by a loop', why: 'Every finished cell is visited; the open question is where unfinished lines go next.' },
      ] },
      { kind: 'split', ask: 'At a free cell, what decides its choices?', options: [
        { text: 'How many lines come in, from the left and from above', right: true, why: 'The cell needs exactly two lines; those coming in fix how many must go out, down or right.' },
        { text: 'Whether the cell above is free', why: 'What matters is whether a line comes down from it, which the plug says.' },
      ] },
      { kind: 'recurrence', ask: 'With one line coming in, what can the cell do?', options: [
        { text: 'Send one line out, down or right, wherever the next cell is free', right: true, why: 'One in and one out makes two, and the line must go to a free cell.' },
        { text: 'Send lines out both down and right', why: 'That gives the cell three lines; each cell on a loop has two.' },
        { text: 'Send no line out', why: 'The cell would have one line, the end of a path that never closes.' },
      ] },
      { kind: 'base', ask: 'What is the state before the first cell?', options: [
        { text: 'One way with no plugs', right: true, why: 'No line can cross into the board from outside.' },
        { text: 'One way with a plug from above in every column', why: 'Those lines would come from a row above the board.' },
      ] },
      { kind: 'order', ask: 'What happens at the end of a row?', options: [
        { text: 'Every plug moves one place, so that the line going down from column c is read as the line from above column c', right: true, why: 'Before cell (r, c) the line from above sits at bit c + 1, and the last cell left it at bit c.' },
        { text: 'Nothing: the next row starts with the same plugs', why: 'Each downward line would be read one column to the left of where it is.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The state with no plugs after the last cell', right: true, why: 'Every line is closed into a loop, and none hangs off the board.' },
        { text: 'The state with every plug set after the last cell', why: 'Every plug set would be lines hanging off the bottom; finished loops leave no plug at all.' },
      ] },
    ],
    apply: { cell: [9, 10], misconceptions: [
      { answer: 2, feedback: '2 is only the term from 1010. The pattern 1001 also sends its line down and, after the shift, reaches 0101: + 1.' },
    ] },
  },

  'hamiltonian-grid': {
    problem: 'Count the single closed loops that visit every free cell of a board exactly once, for boards up to 8 by 8, which have millions of them.',
    tryFirst: {
      prompt: 'A board 2 high and 4 wide, all free. How many single loops visit every cell?',
      args: [[[0, 0, 0, 0], [0, 0, 0, 0]]], answer: 1,
      misconceptions: [{ answer: 2, feedback: 'Two squares side by side cover every cell, but they are two loops, not one.' }],
      explain: 'Only the loop round the edge of the board: 1.',
    },
    steps: [
      { kind: 'state', ask: 'What must a state add to the plugs of loop covering?', options: [
        { text: 'A label for each plug, so that the two ends of one path share a label', right: true, why: 'Joining two ends closes a loop if they belong to one path and merges two paths if not; only the labels say which.' },
        { text: 'Nothing: the plugs are enough', why: 'Then two ends meeting can’t tell a finished loop from a join, so loops that close too early are counted.' },
        { text: 'The plugs and the number of loops closed so far', why: 'Without labels, two plugs meeting can’t tell a loop closing from two paths joining, so that count can’t be kept.' },
      ] },
      { kind: 'split', ask: 'Two plugs meet at a cell. When may the loop close?', options: [
        { text: 'Only if they share a label, at the last free cell, with no other plug open', right: true, why: 'Then the loop has visited every free cell and nothing else is unfinished.' },
        { text: 'Whenever they share a label', why: 'A loop closed earlier leaves cells still to come outside it.' },
      ] },
      { kind: 'recurrence', ask: 'Two plugs with different labels meet. What happens?', options: [
        { text: 'The two paths join: the far end of one is relabelled to the other’s label', right: true, why: 'They are now one path, whose ends are the two far ends.' },
        { text: 'The state is dropped', why: 'Joining two paths is how every loop of more than one path segment forms.' },
      ] },
      { kind: 'base', ask: 'What is the state before the first cell?', options: [
        { text: 'One way with no plugs', right: true, why: 'No path has started, so no line crosses the frontier.' },
        { text: 'One way with a single path open', why: 'A path needs a cell to start in.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells processed?', options: [
        { text: 'Row by row, cell by cell, shifting the plugs at the end of each row', right: true, why: 'Then w + 1 plugs describe every edge between finished and unfinished cells.' },
        { text: 'Column by column, keeping the same w + 1 plugs', why: 'Going down columns, h + 1 edges cross the boundary, not w + 1; the plugs would describe the wrong edges.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The total of the closings at the last free cell', right: true, why: 'Every valid loop closes there exactly once.' },
        { text: 'The state with no plugs after the last cell', why: 'The one valid closing is counted as it happens, at the last free cell; no state carries it on.' },
      ] },
    ],
    apply: { cell: [9, 2], misconceptions: [
      { answer: 1, feedback: 'Two states send their path down and reach 0101 after the shift: 1010 and 1001. Add both.' },
    ] },
  },

  'connectivity-canonical': {
    problem: 'Count the non-empty connected sets of free cells on a board up to 100 rows by 6 columns, where there are far too many sets to list.',
    tryFirst: {
      prompt: 'A 2 × 2 board, all free. How many non-empty sets of its cells are connected?',
      args: [[[0, 0], [0, 0]]], answer: 13,
      misconceptions: [{ answer: 15, feedback: '15 counts every non-empty set. The two diagonal pairs touch only at a corner, so they are not connected.' }],
      explain: '4 single cells, 4 side-by-side pairs, 4 sets of three and the whole square: 13.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold?', options: [
        { text: 'For each of the last w cells, 0 if left out, or a label naming its piece', right: true, why: 'Later cells touch only these, and they need to know which chosen cells are already joined.' },
        { text: 'For each of the last w cells, whether it was chosen', why: 'Two chosen cells may or may not be joined further back; a later cell bridging them matters only if they are not.' },
        { text: 'The number of pieces the chosen cells form', why: 'It doesn’t say which frontier cells belong to which piece, so a later cell can’t tell what it joins.' },
      ] },
      { kind: 'split', ask: 'A cell is taken next to two chosen cells with different labels. What happens?', options: [
        { text: 'Their pieces join: every cell with one label is relabelled with the other, and so is this cell', right: true, why: 'The two pieces are now connected through this cell, and the labels must say so.' },
        { text: 'The cell takes the left neighbour’s label, and the cell above keeps its own', why: 'The two pieces are connected now, but the labels still say they are apart, so a connected set is later thrown away.' },
      ] },
      { kind: 'recurrence', ask: 'A cell is left out, and the cell above was its piece’s last frontier cell. What then?', options: [
        { text: 'If it was the only piece, the set is finished and counted; if not, the state is dropped', right: true, why: 'Nothing later can touch that piece. Alone, it is a connected set; with others open, it can never join them.' },
        { text: 'The state carries on with that piece forgotten', why: 'A later cell could then start a second piece, and the two would be counted as one connected set.' },
        { text: 'The state is dropped either way', why: 'A connected set that ends above the bottom of the board is then never counted.' },
      ] },
      { kind: 'base', ask: 'What is the state before the first cell?', options: [
        { text: 'One way with every entry 0', right: true, why: 'Nothing is chosen yet, so every entry is left out.' },
        { text: 'One way for each choice of the first row', why: 'The first row’s cells are chosen as they are reached, by the same steps as every other cell.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells processed?', options: [
        { text: 'Row by row, cell by cell, so the frontier is always the last w cells', right: true, why: 'The next cell touches only its left neighbour and the cell above, both among the last w.' },
        { text: 'Row by row, keeping only the current row’s cells on the frontier', why: 'The cells of the row above not yet passed still touch the next cells; dropping them loses which pieces those cells join.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sets finished along the way, plus the final states with exactly one piece', right: true, why: 'Every connected set ends once: early, when its last frontier cell leaves, or at the bottom of the board.' },
        { text: 'The final states with exactly one piece', why: 'Sets whose last row is above the bottom were finished and counted earlier.' },
      ] },
    ],
    apply: { cell: [5, 5], misconceptions: [
      { answer: 2, feedback: 'Two states reach 100 at the blocked cell: 100 and 110. Add both: 2 + 1.' },
      { answer: 1, feedback: 'The state 100 itself also passes the blocked cell unchanged: 2 + 1.' },
    ] },
  },

  'treewidth': {
    problem: 'Find the heaviest set of vertices with no edge between them, in a graph of up to 60 vertices given with a tree decomposition whose bags hold at most 4.',
    tryFirst: {
      prompt: 'The path 0 – 1 – 2 with weights 2, 3, 2, and bags {0, 1}, {1, 2}. What is the heaviest set with no edge inside it?',
      args: [[2, 3, 2], [[0, 1], [1, 2]], [[0, 1], [1, 2]], [[0, 1]]], answer: 4,
      misconceptions: [{ answer: 3, feedback: 'Taking the heaviest vertex, 1, rules out both others. Vertices 0 and 2 together weigh 4.' }],
      explain: 'Vertices 0 and 2: 2 + 2 = 4.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell mean?', options: [
        { text: 'best(b, S): the heaviest set below bag b whose vertices in bag b are exactly S', right: true, why: 'The bag is the only way the rest of the graph meets what is below it, so S is all the rest needs to know.' },
        { text: 'best(b): the heaviest set below bag b', why: 'Without S, the parent can’t tell whether a shared vertex was taken, and may take a neighbour of it.' },
      ] },
      { kind: 'split', ask: 'Which S are allowed in bag b?', options: [
        { text: 'Every subset of the bag with no edge inside it', right: true, why: 'Any edge between two chosen vertices breaks independence, and every edge lies in some bag.' },
        { text: 'Every subset of the bag', why: 'A subset with an edge inside is never independent, however the rest is chosen.' },
      ] },
      { kind: 'recurrence', ask: 'How does a child c add to best(b, S)?', options: [
        { text: 'Its best agreeing choice S′, minus the weight of the vertices it shares with b', right: true, why: 'Shared vertices are counted in S already; subtracting them counts each vertex once.' },
        { text: 'Its best agreeing choice S′', why: 'A vertex in both bags is then counted in S and again in the child.' },
        { text: 'Its best choice S′, whether it agrees with S or not', why: 'A shared vertex could then be taken on one side and not the other.' },
      ] },
      { kind: 'base', ask: 'What is best(b, S) for a leaf bag?', options: [
        { text: 'The weight of S', right: true, why: 'Below a leaf there is only the bag itself.' },
        { text: '0', why: 'The vertices of S are chosen, so their weight counts.' },
      ] },
      { kind: 'order', ask: 'In what order are the bags filled?', options: [
        { text: 'Children before parents, rooted at any bag', right: true, why: 'Each bag reads its children’s tables.' },
        { text: 'Bag 0 first, then the bags in index order', why: 'A bag can come before its children in index order and read tables that are not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The largest best(root, S)', right: true, why: 'The root sees the whole graph, and any S of it is allowed.' },
        { text: 'best(root, ∅)', why: 'That forbids every vertex of the root bag.' },
      ] },
    ],
    apply: { cell: [13, 0], misconceptions: [
      { answer: 9, feedback: '9 is the child’s best part only. S = {0} adds vertex 0’s own weight, 3.' },
    ] },
  },

  'pathwidth': {
    problem: 'Count the colourings of a graph with k colours where no edge joins two equal colours, given a path decomposition with up to 60 bags of at most 4 vertices.',
    tryFirst: {
      prompt: 'The path 0 – 1 – 2, three colours. How many colourings give neighbours different colours?',
      args: [3, [[0, 1], [1, 2]], [[0, 1], [1, 2]]], answer: 12,
      misconceptions: [
        { answer: 27, feedback: '27 colours each vertex freely. Vertex 1 must differ from 0 and vertex 2 from 1: 3 · 2 · 2.' },
        { answer: 18, feedback: '18 checks only one edge: 3 · 2 · 3. Both edges count: 3 · 2 · 2.' },
      ],
      explain: '3 colours for vertex 0, then 2 for vertex 1 and 2 for vertex 2: 12.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state hold at bag i?', options: [
        { text: 'A colouring χ of bag i, with the number of ways to colour every vertex seen so far that agree with it', right: true, why: 'Later edges touch only bag vertices, so their colours are all the future needs.' },
        { text: 'The number of colourings of the vertices seen so far', why: 'The next bag’s edges need the colours of the vertices still in view.' },
      ] },
      { kind: 'split', ask: 'Moving to bag i + 1, what happens to a vertex that leaves?', options: [
        { text: 'It is forgotten: colourings differing only on it become one state, adding their counts', right: true, why: 'No later edge touches it, and each of those colourings is still a different colouring.' },
        { text: 'It is forgotten, keeping the count of one of the colourings that merge', why: 'The others are different colourings too; keeping one loses them.' },
      ] },
      { kind: 'recurrence', ask: 'And a vertex that arrives?', options: [
        { text: 'Every colour is tried, keeping colourings where no edge inside the bag joins equal colours', right: true, why: 'Its edges to earlier vertices all lie in bags it shares with them, and this is the first.' },
        { text: 'Every colour is tried, checking only its edges to vertices that already left', why: 'A vertex that left is never in a bag with a later one, so they share no edge; the edges inside this bag are the ones to check.' },
      ] },
      { kind: 'base', ask: 'What is there before the first bag?', options: [
        { text: 'One way to colour nothing', right: true, why: 'Then the first bag tries every colour for each of its vertices.' },
        { text: 'k ways', why: 'No vertex has been coloured yet.' },
      ] },
      { kind: 'order', ask: 'In what order are the bags processed?', options: [
        { text: 'Along the path, first to last', right: true, why: 'Each bag reads the bag before it, and a vertex keeps its colour while it stays in view.' },
        { text: 'The largest bag first, then the others', why: 'A bag would read a neighbour not filled yet, and a vertex could be forgotten and seen again with a new colour.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum over every colouring of the last bag', right: true, why: 'Each colouring of the whole graph ends in exactly one of them.' },
        { text: 'The largest count among the last bag’s colourings', why: 'The colourings are different ways, so they add.' },
      ] },
    ],
    apply: { cell: [21, 0], misconceptions: [
      { answer: 1, feedback: 'Two colourings of the bag before agree on vertices 0 and 2: 010 and 020. Vertex 1 is forgotten, so their counts add: 1 + 1.' },
    ] },
  },

  'nice-tree-decomp': {
    problem: 'Count the dominating sets of a graph with up to 60 vertices, given a nice tree decomposition: leaf, introduce, forget and join nodes, at most 4 vertices in a bag.',
    tryFirst: {
      prompt: 'The path 0 – 1 – 2. How many sets D have every vertex in D or next to a vertex in D?',
      args: [3, [[0, 1], [1, 2]], [['leaf'], ['introduce', 0, 1], ['introduce', 1, 2], ['forget', 2, 2], ['introduce', 3, 0], ['forget', 4, 0], ['forget', 5, 1]]], answer: 5,
      misconceptions: [{ answer: 4, feedback: '4 counts only the sets holding the middle vertex. {0, 2} dominates 1 from both sides.' }],
      explain: '{1}, {0, 1}, {1, 2}, {0, 1, 2} and {0, 2}: 5.',
    },
    steps: [
      { kind: 'state', ask: 'What does a state give each bag vertex?', options: [
        { text: 'One of three states: in D; out but next to a vertex of D; out and not yet', right: true, why: 'An out vertex may still be covered by a neighbour introduced later, so “not yet” must be told apart from “covered”.' },
        { text: 'One of two states: in D or out', why: 'An out vertex might be uncovered, and nothing records whether it still needs a neighbour.' },
      ] },
      { kind: 'split', ask: 'Introducing v, which edges are seen?', options: [
        { text: 'v’s edges to the vertices in the bag', right: true, why: 'Every neighbour of v shares a bag with it; those still to come meet it later, while v is in their bag.' },
        { text: 'All of v’s edges', why: 'A neighbour not in the bag has no state here, and if it was forgotten it was never next to v.' },
      ] },
      { kind: 'recurrence', ask: 'At a join, how are a left state and a right state combined?', options: [
        { text: 'They must agree on who is in D; a vertex is covered if either side covered it; the counts multiply', right: true, why: 'The two sides hold different vertices below the bag, chosen independently, and a neighbour on either side covers.' },
        { text: 'They must agree on who is in D; a vertex is covered only if both sides covered it', why: 'A vertex’s neighbour below the join is on one side only.' },
        { text: 'They must agree on every state; the counts multiply', why: 'A vertex covered on one side and not yet on the other is still covered, and that pair is dropped.' },
      ] },
      { kind: 'base', ask: 'What is a leaf’s table?', options: [
        { text: 'One way, with an empty bag', right: true, why: 'Nothing below it has been chosen.' },
        { text: 'Zero ways', why: 'Then every product above it is 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the nodes processed?', options: [
        { text: 'As listed: children before parents, ending at the root', right: true, why: 'Each node’s table is built from its children’s tables.' },
        { text: 'From the root down to the leaves', why: 'Each node needs its children’s tables, which would not exist yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The root’s one state, with its empty bag', right: true, why: 'Every vertex has been forgotten covered, so every dominating set is counted there once.' },
        { text: 'The sum over the root’s child’s states', why: 'States whose last vertex is still uncovered would be counted.' },
      ] },
    ],
    apply: {
      prompt: 'The star with centre 0 and leaves 1, 2, 3. How many dominating sets?',
      args: [4, [[0, 1], [0, 2], [0, 3]], [['leaf'], ['introduce', 0, 0], ['introduce', 1, 2], ['forget', 2, 2], ['introduce', 3, 1], ['leaf'], ['introduce', 5, 0], ['introduce', 6, 3], ['forget', 7, 3], ['introduce', 8, 1], ['join', 4, 9], ['forget', 10, 0], ['forget', 11, 1]]], answer: 9,
      misconceptions: [{ answer: 8, feedback: '8 counts the sets with the centre. Without it, every leaf must be in D: one more set, {1, 2, 3}.' }],
      explain: 'With the centre: any set of leaves, 2³ = 8. Without it: all three leaves. 9.',
    },
  },
}
