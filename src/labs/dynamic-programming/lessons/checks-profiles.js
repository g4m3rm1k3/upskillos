// "Check yourself" for the profile and decomposition lessons (Specialist, profiles group). Format and
// checks: checks.js and checks.test.js; the numbers come from specialist-oracles.js.

export const PROFILE_CHECKS = {
  'broken-profile': [
    {
      know: 'Scanning down each column, a mask of h bits says which rows’ next cells are already covered. A covered cell clears its bit; a free one lays a domino right or down.',
      ask: 'How many domino tilings does a 2 × 5 board have?',
      args: [2, 5], answer: 8,
      misconceptions: [{ answer: 5, feedback: '5 is the 2 × 4 board. A 2 × 5 board ends in a vertical domino (2 × 4 before it: 5 ways) or two horizontal ones (2 × 3: 3 ways): 8.' }],
      explain: 'The last column is a vertical domino after a 2 × 4 board (5) or two horizontal dominoes after a 2 × 3 board (3): 8.',
    },
    {
      know: 'Each state is a mask with one bit per row of the board.',
      ask: 'How many different masks can a board h rows high have?',
      options: [
        { text: '2ʰ', right: true, why: 'Each of the h rows’ next cells is either covered or not.' },
        { text: '2ʷ, one bit per column', why: 'The mask describes one boundary, crossing each row once; the number of columns does not enter it.' },
        { text: 'h + 1, the number of covered cells', why: 'Which rows are covered matters, not just how many, so there are 2ʰ masks.' },
      ],
    },
    {
      know: 'Every cell is visited once, and at each one every mask is looked at once.',
      ask: 'About how much work does the count take for an h × w board?',
      options: [
        { text: 'About h · w · 2ʰ steps', right: true, why: 'h · w cells, each looking at 2ʰ masks with at most two moves from each.' },
        { text: 'About 2^(h · w) steps, one per way of covering the cells', why: 'That is listing the tilings, which the mask avoids by merging boundaries that look alike.' },
        { text: 'About (h · w)² steps', why: 'The work grows exponentially in h, through the 2ʰ masks; it is linear in w.' },
      ],
    },
  ],

  'domino-tiling': [
    {
      know: 'Pieces are dominoes and L-trominoes, each turned any way; the first free cell of a column is covered by every piece that fits.',
      ask: 'How many tilings by dominoes and L-trominoes does a 2 × 4 board have?',
      args: [2, 4], answer: 11,
      misconceptions: [{ answer: 5, feedback: '5 counts the domino tilings only. Tilings with L-trominoes add six more.' }],
      explain: '5 by dominoes; 4 with an interlocking tromino pair filling three columns and a vertical domino in the fourth (the pair at either end, either way up); 2 with a tromino at each end joined by a horizontal domino: 11.',
    },
    {
      know: 'Between two columns, the state says which cells of the next column are already covered.',
      ask: 'Why is a mask of the next column enough?',
      options: [
        { text: 'No piece starting in a column reaches more than one column past it', right: true, why: 'Dominoes and L-trominoes span at most two columns, so earlier columns can only stick into the next one.' },
        { text: 'Because the pieces are all the same size', why: 'Dominoes cover two cells and trominoes three; what matters is how far a piece reaches, not its size.' },
        { text: 'It isn’t: two columns are needed for trominoes', why: 'An L-tromino spans two columns: the one it starts in and the next, which the mask covers.' },
      ],
    },
    {
      know: 'One column is a fixed matrix T of transitions between masks, the same for every column.',
      ask: 'The board is 6 rows high and 10¹⁸ columns wide. How can it be counted in time?',
      options: [
        { text: 'Raise T to the power w by repeated squaring, about 60 squarings', right: true, why: 'Every column applies the same T, so w columns are Tʷ, and squaring reaches it in log₂ w steps.' },
        { text: 'Fill the columns one at a time, as before', why: 'That is 10¹⁸ steps, far too many.' },
        { text: 'Use a mask of two columns to skip ahead two at a time', why: 'That halves 10¹⁸ steps, which is still far too many; squaring T gets there in about 60.' },
      ],
    },
  ],

  'profile-obstacles': [
    {
      know: 'Blocked cells take no domino; the scan still visits them, passing the mask on if no domino landed on them.',
      ask: 'Board 0000; 0000; 1001 (the bottom corners blocked). How many domino tilings?',
      args: [[[0, 0, 0, 0], [0, 0, 0, 0], [1, 0, 0, 1]]], answer: 6,
      misconceptions: [{ answer: 5, feedback: '5 counts only the tilings with a horizontal domino on the bottom row. Two vertical dominoes there leave one more tiling of the rest.' }],
      explain: 'A horizontal domino on the two free bottom cells leaves a 2 × 4 board: 5 tilings. Two vertical dominoes there leave one more: 6.',
    },
    {
      know: 'Two opposite corners of an 8 × 8 board are blocked, leaving 62 free cells. The DP finds no tiling at all.',
      ask: 'Why are there no tilings of that board?',
      options: [
        { text: 'Colour it like a chessboard: both corners are one colour, leaving 32 of one and 30 of the other, but every domino covers one of each', right: true, why: 'Any tiling would cover equal numbers of each colour, and 32 is not 30.' },
        { text: 'Because 62 free cells is an odd number', why: '62 is even; the trouble is the colours, not the number of cells.' },
        { text: 'Because the DP has too many masks to finish', why: 'It has 2⁸ masks and finishes at once; the answer 0 is real.' },
      ],
    },
    {
      know: 'The scan checks a blocked cell twice over: no domino may be laid onto it, and a cell that is covered when the scan reaches it must not be blocked.',
      ask: 'If the check that no domino is laid to the right onto a blocked cell is removed, what changes?',
      options: [
        { text: 'Nothing: a domino laid onto a blocked cell makes the mask covered there, and the blocked cell drops it', right: true, why: 'Each check alone catches the domino, so removing one leaves the answer the same; it only saves work.' },
        { text: 'Tilings that cover blocked cells are counted', why: 'The blocked cell itself rejects a mask that says it is covered.' },
        { text: 'Every count becomes 0', why: 'Only the masks with a domino on a blocked cell are dropped, and they are dropped anyway.' },
      ],
    },
  ],

  'plug-dp': [
    {
      know: 'Each free cell has two lines; with no plug coming in, it starts a corner, sending lines down and right.',
      ask: 'A board 2 high and 6 wide, all free. How many ways to cover it with loops?',
      args: [[[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]]], answer: 5,
      misconceptions: [
        { answer: 1, feedback: '1 is only the loop round the edge. The board can also split into loops 2 + 4, 4 + 2, 3 + 3 and 2 + 2 + 2 columns wide.' },
        { answer: 4, feedback: 'Loops 2 and 4 columns wide can go in either order: 2 + 4 and 4 + 2 are different covers.' },
      ],
      explain: 'Each loop in a 2-high board is a rectangle at least 2 wide. Splitting 6 columns: 6, 2 + 4, 4 + 2, 3 + 3, 2 + 2 + 2: 5.',
    },
    {
      know: 'Here every free cell is covered by some loop, and any number of loops is allowed.',
      ask: 'Why do plugs need no labels for this problem?',
      options: [
        { text: 'Two ends meeting may always close a loop, so it never matters which ends belong together', right: true, why: 'Labels exist to forbid closing too early; with many loops allowed, every closing is fine.' },
        { text: 'Because the board is narrow', why: 'Narrowness keeps the plugs few, but labels are about which plugs are joined, which narrowness doesn’t settle.' },
        { text: 'They do need labels, or the count is wrong', why: 'A closed loop is always allowed here, so the only thing labels tell, which ends are joined, never changes a choice.' },
      ],
    },
    {
      know: 'Between processed and unprocessed cells, w + 1 places can have a line crossing.',
      ask: 'How many plug patterns can a state be, on a board w columns wide?',
      options: [
        { text: '2^(w + 1)', right: true, why: 'w downward places and one sideways place, each with a line or not.' },
        { text: '2ʷ', why: 'Besides the w downward lines, the line going right from the current cell crosses too.' },
        { text: 'w + 1', why: 'Each of the w + 1 places has a line or not, independently: 2^(w + 1) patterns.' },
      ],
    },
  ],

  'hamiltonian-grid': [
    {
      know: 'Plugs carry labels so that a loop closes only at the last free cell, with no other path open.',
      ask: 'Board 0000; 0110; 0000 (two middle cells blocked). How many single loops visit every free cell?',
      args: [[[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]]], answer: 1,
      misconceptions: [{ answer: 2, feedback: '2 counts the ring round the block twice, once in each direction. Walked either way, it is the same loop.' }],
      explain: 'The free cells form a ring round the two blocked cells; the only loop is that ring: 1.',
    },
    {
      know: 'After each step, labels are renamed in order of first appearance: 3 0 3 5 5 becomes 1 0 1 2 2.',
      ask: 'Why rename the labels?',
      options: [
        { text: 'So that states pairing the same ends get one name and their counts are added', right: true, why: 'The numbers only say which plugs are joined; renaming makes equal states equal, so the table stays small.' },
        { text: 'So that a loop closes at the right cell', why: 'Where a loop may close is decided by the last-cell rule, whatever the labels are called.' },
        { text: 'Because the counts depend on which numbers the labels use', why: 'Only which plugs share a label matters; renaming changes no count.' },
      ],
    },
    {
      know: 'Two plugs with the same label are the two ends of one path.',
      ask: 'They meet at a cell that is not the last free cell. What happens?',
      options: [
        { text: 'The state is dropped: closing there would leave free cells outside the loop', right: true, why: 'A closed loop can’t take in more cells, and the rest still need visiting.' },
        { text: 'The loop is counted', why: 'Cells still to come would be outside it, so it is not a loop through every free cell.' },
        { text: 'The cell sends both ends on, down and right', why: 'That gives the cell four lines; a cell on the loop has two.' },
      ],
    },
  ],

  'connectivity-canonical': [
    {
      know: 'A set of cells is connected when every chosen cell reaches every other through chosen side-by-side neighbours.',
      ask: 'A board 3 high and 2 wide, all free. How many non-empty connected sets of cells?',
      args: [[[0, 0], [0, 0], [0, 0]]], answer: 40,
      misconceptions: [{ answer: 63, feedback: '63 counts every non-empty set. Many, like two diagonal cells, touch only at corners or not at all.' }],
      explain: 'Of the 63 non-empty sets of the six cells, 40 are connected through side-by-side neighbours.',
    },
    {
      know: 'Labels are renamed in order of first appearance, 0 staying 0 for a cell left out.',
      ask: 'Which state is the same as 3 3 0 5?',
      options: [
        { text: '1 1 0 2', right: true, why: '3 is seen first and becomes 1; 5 next becomes 2.' },
        { text: '2 2 0 1', why: 'Renaming goes by first appearance, left to right, not by size or by count.' },
        { text: '1 2 0 3', why: 'The first two cells share a piece; giving them different labels makes a different state.' },
      ],
    },
    {
      know: 'A piece whose last frontier cell leaves can never grow again.',
      ask: 'If it was the only piece, why is the set finished at once, and not carried on?',
      options: [
        { text: 'Any cell chosen later would start a second piece that can never reach it', right: true, why: 'So the set can only stay as it is; it is counted, and the state stops.' },
        { text: 'Because the board ends there', why: 'The board may go on for many rows; the set ends because nothing can join it.' },
        { text: 'It isn’t: the state carries on with the frontier empty', why: 'The empty frontier also means “nothing chosen yet”, so later cells would start a new set and be counted with this one.' },
      ],
    },
  ],

  'treewidth': [
    {
      know: 'best(b, S) is the heaviest set below bag b meeting the bag in exactly S, with no edge inside.',
      ask: 'Triangle 0, 1, 2 with weights 3, 3, 4, and vertex 3 (weight 2) joined to 2. Bags {0, 1, 2}, {2, 3}. What is the heaviest independent set?',
      args: [[3, 3, 4, 2], [[0, 1], [1, 2], [0, 2], [2, 3]], [[0, 1, 2], [2, 3]], [[0, 1]]], answer: 5,
      misconceptions: [{ answer: 4, feedback: '4 takes the heaviest vertex, 2, which rules out all the others. Vertex 0 (or 1) with vertex 3 weighs 5.' }],
      explain: 'At most one triangle vertex; taking 0 or 1 leaves 3 free: 3 + 2 = 5.',
    },
    {
      know: 'The width of a decomposition is its largest bag size minus one; each bag has a table over its subsets.',
      ask: 'Bags hold at most 4 vertices. How big is each bag’s table, and what is the width?',
      options: [
        { text: 'At most 2⁴ = 16 subsets; width 3', right: true, why: 'Each of a bag’s 4 vertices is in S or not, and the width is defined as the largest bag minus one.' },
        { text: 'At most 2⁶⁰ subsets; width 4', why: 'A table covers one bag’s vertices, not the whole graph’s, and the width is the bag size minus one.' },
        { text: 'At most 4 entries; width 4', why: 'S is any subset of the bag, so there are 2⁴ of them.' },
      ],
    },
    {
      know: 'In a tree decomposition, the bags holding any one vertex must form a connected part of the tree.',
      ask: 'Vertex v is in bags 2 and 5, but not in bag 4, which lies between them. What goes wrong?',
      options: [
        { text: 'The DP may take v on one side and leave it out on the other: nothing makes the two copies agree', right: true, why: 'Agreement is passed only between neighbouring bags that both hold v, and bag 4 does not.' },
        { text: 'Nothing: each bag checks v’s edges anyway', why: 'Each bag checks edges, but the choice of v made in bag 2 never reaches bag 5.' },
        { text: 'v is counted twice', why: 'The weight is subtracted only between neighbouring bags sharing v; worse, v can be in the set on one side and out on the other.' },
      ],
    },
  ],

  'pathwidth': [
    {
      know: 'For each colouring of the current bag, the number of colourings of everything seen so far; forgotten vertices add their counts.',
      ask: 'The 5-cycle 0 – 1 – 2 – 3 – 4 – 0 with 3 colours. How many colourings give neighbours different colours?',
      args: [3, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]]], answer: 30,
      misconceptions: [
        { answer: 48, feedback: '48 is the path 0 – 1 – 2 – 3 – 4: 3 · 2⁴. The edge 4 – 0 closes the cycle and removes some.' },
        { answer: 32, feedback: '32 is 2⁵. A cycle of n vertices has 2ⁿ + 2 colourings when n is even and 2ⁿ − 2 when it is odd.' },
      ],
      explain: 'A cycle of 5 vertices with 3 colours has 2⁵ − 2 = 30 colourings.',
    },
    {
      know: 'A bag has at most b vertices, and each state is a colouring of the bag with k colours.',
      ask: 'About how much work does the count take with B bags?',
      options: [
        { text: 'About B · kᵇ colourings, each checked against the bag’s edges', right: true, why: 'Each bag has at most kᵇ colourings, and each is reached from merged states of the bag before.' },
        { text: 'About kⁿ, one step per colouring of the graph', why: 'That is listing every colouring, which the bags avoid.' },
        { text: 'About B · k steps', why: 'A bag of b vertices has up to kᵇ colourings, not k.' },
      ],
    },
    {
      know: 'Moving to the next bag, vertices that leave are forgotten.',
      ask: 'Why are the counts of colourings that merge added?',
      options: [
        { text: 'They differ on a forgotten vertex, so they are different colourings of the graph so far', right: true, why: 'Each one is a separate way, and every one of them can be continued the same way.' },
        { text: 'Because only one of them is valid', why: 'All of them passed their bags’ edge checks; they are all valid.' },
        { text: 'They aren’t added: the largest is kept', why: 'That counts one colouring among several and loses the rest.' },
      ],
    },
  ],

  'nice-tree-decomp': [
    {
      know: 'Each bag vertex is in D, out and covered, or out and not yet covered; a forgotten vertex must be covered.',
      ask: 'The path 0 – 1 – 2 – 3. How many sets D have every vertex in D or next to a vertex in D?',
      args: [4, [[0, 1], [1, 2], [2, 3]], [['leaf'], ['introduce', 0, 2], ['introduce', 1, 3], ['forget', 2, 3], ['introduce', 3, 1], ['forget', 4, 2], ['introduce', 5, 0], ['forget', 6, 0], ['forget', 7, 1]]], answer: 9,
      misconceptions: [{ answer: 8, feedback: '8 counts the sets holding a middle vertex. {0, 3} also works: each end covers its neighbour.' }],
      explain: 'Four pairs ({1, 2}, {0, 2}, {1, 3}, {0, 3}), four triples and the whole path: 9.',
    },
    {
      know: 'An out vertex may be covered by a neighbour that is introduced later, while it is still in the bag.',
      ask: 'Why do out vertices need two states, not one?',
      options: [
        { text: 'An uncovered vertex can still be covered later, but must not be forgotten uncovered', right: true, why: 'Covered and not-yet-covered have different futures, so they are different states.' },
        { text: 'They don’t: an out vertex is always covered by the time it is introduced', why: 'Its neighbours may be introduced after it.' },
        { text: 'To count each set twice and halve the answer', why: 'No set is counted twice; the two states have different futures.' },
      ],
    },
    {
      know: 'A join node has two children with the same bag, covering different parts of the graph below it.',
      ask: 'Why do the counts of the two sides multiply?',
      options: [
        { text: 'Below the bag, the two sides share no vertex, so any choice on one side goes with any choice on the other', right: true, why: 'Independent choices multiply, as long as they agree on the bag itself.' },
        { text: 'Because each side’s count is a probability', why: 'They are counts of sets; they multiply because the choices are independent.' },
        { text: 'They should be added: a set comes from one side or the other', why: 'Every set has a part on each side, so it is a pair of choices.' },
      ],
    },
  ],
}
