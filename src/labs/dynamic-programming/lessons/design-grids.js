// "Design it yourself" for the grid and path lessons (Core, grids group). Format: designs.js.
// tryFirst.oracle names a different brute-force oracle when the lesson's own challenge asks a
// variant (grid-paths' challenge allows diagonal moves; its design is the two-move version).

export const GRID_DESIGNS = {
  'grid-paths': {
    problem: 'Count the paths from the top-left cell of a grid to the bottom-right cell, where every move goes one cell right or one cell down. (The coding challenge adds a third move, diagonally down-right; once this design is done, that is one more term.)',
    tryFirst: {
      prompt: 'Draw them on a 3 × 3 grid. How many right/down paths go from the top-left corner to the bottom-right corner?',
      oracle: 'obstacle-paths', args: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], answer: 6,
      misconceptions: [
        { answer: 9, feedback: '9 is the number of cells, not paths. A path is a sequence of moves: list them as R and D letters.' },
        { answer: 16, feedback: 'That counts every sequence of four moves, but a path needs exactly two Rs and two Ds: RRDD, RDRD, RDDR, DRRD, DRDR and DDRR.' },
      ],
      explain: 'RRDD, RDRD, RDDR, DRRD, DRDR, DDRR. Look at the corner: three of them arrive from above and three from the left, and each group is the paths to that neighbour.',
    },
    steps: [
      { kind: 'state', ask: 'What should P(r, c) mean?', options: [
        { text: 'Whether cell (r, c) can be reached', why: 'Every cell of an open grid can be, so this is true everywhere and says nothing about how many paths there are.' },
        { text: 'The number of right/down paths from the start to cell (r, c)', right: true, why: 'The same question with a nearer corner. The bottom-right cell’s value is the question asked.' },
        { text: 'The number of cells on a path to (r, c)', why: 'Every right/down path to (r, c) has r + c + 1 cells, so this is one fixed length, not a count of paths.' },
      ] },
      { kind: 'split', ask: 'How do you split the paths into a cell so that no path is counted twice?', options: [
        { text: 'By the row where the path turns', why: 'A path can turn many times, so there is no single turning row to group by.' },
        { text: 'By the last move: from the cell above, or from the cell to the left', right: true, why: 'Every path arrives by exactly one of those two moves, so the two groups never overlap and together hold every path.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills P(r, c)?', options: [
        { text: 'P(r, c) = P(r − 1, c) · P(r, c − 1)', why: 'Multiplying pairs a path into one neighbour with a path into the other, but a path arrives through only one of them.' },
        { text: 'P(r, c) = max(P(r − 1, c), P(r, c − 1)) + 1', why: 'That is the shape of an optimisation. Counting adds the two groups, because each holds different paths.' },
        { text: 'P(r, c) = P(r − 1, c) + P(r, c − 1)', right: true, why: 'The two groups added. A neighbour outside the grid contributes nothing.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'P(0, 0) = 1, and anything outside the grid counts as 0', right: true, why: 'The empty path reaches the start. Then the top row gets 1 from its left, and the left column 1 from above, from the rule itself.' },
        { text: 'P(0, 0) = 0, since no moves have been made', why: 'Then every cell is 0: all paths start at (0, 0), so zero paths there means zero everywhere.' },
        { text: 'The top row and the left column are all 0', why: 'Each edge cell has exactly one path, straight along the edge, so they are 1, not 0.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Row by row from the top, left to right in each row', right: true, why: 'Each cell reads the cell above and the cell to its left, and both are earlier in this order.' },
        { text: 'Column by column from the right', why: 'A cell reads its left neighbour, which would still be empty.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The sum of the last row', why: 'That counts paths that end anywhere in the last row, not at the corner.' },
        { text: 'P(rows, cols)', why: 'Off by one: with indexes from 0, the bottom-right cell is (rows − 1, cols − 1).' },
        { text: 'P(rows − 1, cols − 1)', right: true, why: 'P counts paths to a cell, and the question is the bottom-right cell.' },
      ] },
    ],
    apply: { cell: [2, 2] },
  },

  'obstacle-paths': {
    problem: 'A grid of open cells (0) and blocked cells (1). Count the right/down paths from the top-left cell to the bottom-right cell that never enter a blocked cell.',
    tryFirst: {
      prompt: 'A 3 × 4 grid has one blocked cell, at row 1, column 1 (counting from 0). How many paths avoid it?',
      args: [[[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]], answer: 4,
      misconceptions: [
        { answer: 10, feedback: '10 is the open grid’s count. The paths through the blocked cell have to go: there are 2 ways into it and 3 ways out of it.' },
        { answer: 6, feedback: '6 is the number of paths through the blocked cell, the ones to remove. How many are left?' },
      ],
      explain: '10 paths in the open grid, of which 2 · 3 = 6 pass through the wall, leaving 4. With more walls those overlaps get messy; the table handles any number of walls at once.',
    },
    steps: [
      { kind: 'state', ask: 'What should P(r, c) mean?', options: [
        { text: '0 if (r, c) is blocked, otherwise the open-grid count for (r, c)', why: 'A wall changes the counts after it, not just its own cell: behind a blocked centre, the 3 × 3 corner has 2 paths, not 6.' },
        { text: 'The number of paths from the start to (r, c) that never enter a blocked cell', right: true, why: 'The question itself, with a nearer corner.' },
      ] },
      { kind: 'split', ask: 'How do the paths into an open cell split?', options: [
        { text: 'By the last move, from above or from the left; a blocked neighbour simply has no paths to give', right: true, why: 'The same split as the open grid. The walls are handled by their own cells holding 0.' },
        { text: 'If either neighbour is blocked, the cell gets no paths', why: 'One blocked neighbour removes only its own paths. The other neighbour’s paths still come in.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills P(r, c)?', options: [
        { text: 'P(r, c) = P(r − 1, c) + P(r, c − 1) everywhere, then set the blocked cells to 0 at the end', why: 'By the end, the wall’s paths have already flowed past it into the cells after it.' },
        { text: 'P(r, c) = P(r − 1, c) + P(r, c − 1), with a blocked cell stored as −1', why: 'A −1 would subtract from its neighbours instead of contributing nothing.' },
        { text: 'P(r, c) = 0 for a blocked cell, otherwise P(r − 1, c) + P(r, c − 1)', right: true, why: 'Nothing enters a wall, so nothing leaves it; every other cell adds its two neighbours as before.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'The top row and the left column are all 1', why: 'A wall on an edge cuts off everything after it on that edge: a top row 0, 1, 0 gives 1, 0, 0. This is the classic bug.' },
        { text: 'P(0, 0) = 1 if the start is open, otherwise 0; outside the grid counts 0', right: true, why: 'Then the edges come from the rule like every other cell, so a wall on an edge blocks what follows it.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Open cells first, then the blocked ones', why: 'An open cell next to a wall would read the wall before it is written.' },
        { text: 'Row by row, left to right, as in the open grid', right: true, why: 'The reads have not changed: above and left. Walls are 0 whenever they are reached.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P of the bottom-right cell, which is 0 if that cell is blocked', right: true, why: 'P counts paths to a cell; a blocked end has none.' },
        { text: 'The sum of every open cell', why: 'That counts paths to everywhere, not to the corner.' },
      ] },
    ],
    apply: { cell: [2, 2] },
  },

  'min-grid-path': {
    problem: 'Move from the top-left cell to the bottom-right cell, right or down. A path’s cost is the sum of every cell it visits, both ends included. Find the lowest cost. (The challenge also asks how many paths have it: a second table that adds the counts of the neighbours that tie.)',
    tryFirst: {
      prompt: 'Costs are [1, 3, 1], [1, 5, 1], [4, 2, 1] (three rows). What is the lowest cost of a path?',
      args: [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], answer: 7,
      misconceptions: [
        { answer: 9, feedback: 'That is the cheaper-next-cell route: down to 1, down to 4, then right. The first step to 3 looks worse but leads to the 1s along the top and right edge.' },
      ],
      explain: '1 → 3 → 1 → 1 → 1 costs 7. Picking the cheaper next cell each time gives 9, so the method has to compare whole routes, not single cells.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(r, c) mean?', options: [
        { text: 'The cheaper of the two cells next to (r, c)', why: 'That is the greedy rule, which gives 9 for the example. One cell says nothing about the route that leads to it.' },
        { text: 'The cost of cell (r, c)', why: 'That is the input. A cell must summarise every route to it.' },
        { text: 'The lowest cost of a path from the start to (r, c), with (r, c) included', right: true, why: 'The same question with a nearer corner; the bottom-right cell answers it.' },
      ] },
      { kind: 'split', ask: 'What does the last move into (r, c) tell you?', options: [
        { text: 'The route came from above or from the left: compare the cheapest whole route to each', right: true, why: 'The rest of the route is the cheapest route to that neighbour, so its D is all you need.' },
        { text: 'Which neighbour cell costs less', why: 'Comparing single cells is the greedy mistake again: the cheap neighbour can sit at the end of an expensive route.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(r, c)?', options: [
        { text: 'D(r, c) = min(D(r − 1, c), D(r, c − 1))', why: 'It never pays for cell (r, c), so the table only ever holds the start’s cost.' },
        { text: 'D(r, c) = cost(r, c) + min(D(r − 1, c), D(r, c − 1))', right: true, why: 'Pay for this cell, plus the cheaper of the two whole routes that can arrive here.' },
        { text: 'D(r, c) = cost(r, c) + min(cost(r − 1, c), cost(r, c − 1))', why: 'This compares the neighbours’ own costs, not the routes to them.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = cost(0, 0), and outside the grid counts as infinity', right: true, why: 'The start is paid. Infinity outside means an edge cell can only take its one real neighbour.' },
        { text: 'D(0, 0) = cost(0, 0), and outside the grid counts as 0', why: 'Then the top row would take the free outside instead of the real route, and skip paying for every cell before it.' },
        { text: 'D(0, 0) = 0', why: 'The start is visited, so it is paid: a grid of one cell, [3], costs 3.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Row by row, left to right', right: true, why: 'Moves only go right and down, so this order has every cell’s two neighbours ready, even with negative costs.' },
        { text: 'Cheapest cells first, as in Dijkstra’s algorithm', why: 'Dijkstra is for graphs with cycles and needs non-negative costs. Here there are no cycles, and row order works with any costs.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The smallest value in the last row', why: 'Every path must end at the bottom-right corner, not anywhere in the last row.' },
        { text: 'D of the bottom-right cell', right: true, why: 'D is the cheapest route to a cell, and the route must end at the corner.' },
      ] },
    ],
    apply: { cell: [1, 1] },
  },

  'triangle-path': {
    problem: 'Row r of a triangle holds r + 1 numbers. From a number you step to one of the two numbers below it (same position, or one to the right). Find the smallest sum of a path from the top to the bottom row.',
    tryFirst: {
      prompt: 'The triangle is [1], [2, 3], [9, 9, 1]. What is the smallest top-to-bottom sum?',
      args: [[[1], [2, 3], [9, 9, 1]]], answer: 5,
      misconceptions: [
        { answer: 12, feedback: 'That steps to the smaller number each time: 1, then 2, then a 9. The 3 looks worse, but it is the only way to reach the 1 at the bottom.' },
      ],
      explain: '1 + 3 + 1 = 5. The smaller step now led to two 9s; you only see that by looking from the bottom up.',
    },
    steps: [
      { kind: 'state', ask: 'Working from the bottom up, what should M(r, c) mean?', options: [
        { text: 'The smaller of the two numbers below (r, c)', why: 'That is the greedy step from the try-first question, which gives 12 instead of 5.' },
        { text: 'The sum of row r', why: 'A path takes one number per row, not the whole row.' },
        { text: 'The smallest sum of a path from (r, c) down to the bottom row', right: true, why: 'The same question started lower down. The top number’s cell is the question asked.' },
      ] },
      { kind: 'split', ask: 'A path from (r, c) down to the bottom: what is its one choice?', options: [
        { text: 'Which of the two numbers below it is the next step', right: true, why: 'After that step, the rest is a path from that number to the bottom, which is M of that cell.' },
        { text: 'Which of the two numbers above it it came from', why: 'That is the choice for paths from the top. With M meaning “from here down”, the choice is the next step down.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills M(r, c)?', options: [
        { text: 'M(r, c) = t(r, c) + min(M(r + 1, c), M(r + 1, c + 1))', right: true, why: 'This number, plus the cheaper of the two paths that continue below it.' },
        { text: 'M(r, c) = t(r, c) + min(t(r + 1, c), t(r + 1, c + 1))', why: 'This compares the next numbers, not the paths that continue from them.' },
        { text: 'M(r, c) = t(r, c) + min(M(r + 1, c − 1), M(r + 1, c), M(r + 1, c + 1))', why: 'That is the falling path in a square grid. In this triangle you can only step to c and c + 1.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'The bottom row: M(bottom, c) is the bottom number itself', right: true, why: 'A path that starts on the bottom row is just that number.' },
        { text: 'M(bottom, c) = 0', why: 'The bottom number is on the path, so leaving it out drops one number from every sum.' },
        { text: 'M(0, 0) = the top number', why: 'That is where the answer ends up, not where the table starts. Bottom-up starts at the bottom.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'From the top row down', why: 'M(r, c) reads row r + 1, which would still be empty.' },
        { text: 'From the bottom row up', right: true, why: 'Each cell reads the row below it, so going up has it ready.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The smallest number in the bottom row', why: 'Those are the starting values. The cheapest bottom number may only be reachable through expensive ones.' },
        { text: 'M(0, 0)', right: true, why: 'M(0, 0) is the cheapest path from the top number down, which is the question.' },
      ] },
    ],
    apply: { cell: [1, 0] },
  },

  'grid-resources': {
    problem: 'A grid holds free cells (0) and toll cells (1). Count the right/down paths from the top-left to the bottom-right cell that pay at most a given number of tolls. Every toll cell on the path costs 1, the start and the end included.',
    tryFirst: {
      prompt: 'The grid is [0, 1, 0], [0, 0, 1], [1, 0, 0] and the budget is 0 tolls. How many paths pay no toll at all?',
      args: [[[0, 1, 0], [0, 0, 1], [1, 0, 0]], 0], answer: 1,
      misconceptions: [
        { answer: 6, feedback: '6 is every right/down path in a 3 × 3 grid. With a budget of 0, any path through a toll cell is out.' },
        { answer: 2, feedback: 'Check down, right, right, down: its third move enters the toll at row 1, column 2.' },
      ],
      explain: 'Only down, right, down, right avoids every toll. With a budget of 1, more paths join, and to count them a cell has to know how many tolls each path has paid so far.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'N(r, c) = the number of paths to (r, c) that are still within budget', why: 'Two paths into the same cell with different tolls paid have different futures: one can afford the next toll, the other cannot. Merging them loses that.' },
        { text: 'N(r, c, b) = the number of paths to (r, c) that have paid exactly b tolls', right: true, why: 'The tolls paid so far are exactly what the rest of the path needs to know, so they become a third index.' },
        { text: 'T(r, c) = the fewest tolls a path to (r, c) can pay', why: 'A minimum describes one path. The question counts all the paths within budget.' },
      ] },
      { kind: 'split', ask: 'A path that reaches (r, c) having paid b tolls: what came before?', options: [
        { text: 'A path to the cell above or to the left that had paid b − t, where t is this cell’s toll (1 or 0)', right: true, why: 'Entering (r, c) adds its toll, so before it the path had paid b − t.' },
        { text: 'A path to the cell above or to the left that had paid b', why: 'That forgets that entering a toll cell pays 1.' },
      ] },
      { kind: 'recurrence', ask: 'With t the toll of (r, c), which rule fills N(r, c, b)?', options: [
        { text: 'N(r − 1, c, b − 1) + N(r, c − 1, b − 1)', why: 'This charges a toll for every cell, free or not.' },
        { text: 'N(r − 1, c, b) + N(r, c − 1, b)', why: 'This never charges, so tolls are ignored.' },
        { text: 'N(r − 1, c, b − t) + N(r, c − 1, b − t)', right: true, why: 'The paths from above and from the left that had paid exactly the right amount before entering.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'N(0, 0, t) = 1, where t is the start’s own toll; the start’s other budgets are 0', right: true, why: 'The start is on every path and is paid like any other cell.' },
        { text: 'N(0, 0, 0) = 1, always', why: 'A toll on the start has to be paid too: the grid [1] with budget 0 has no path.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Row by row, left to right; at each cell, every b', right: true, why: 'Every value reads only the cell above and the cell to the left, so cell order is what matters, and any b order works within a cell.' },
        { text: 'Cells in any order, as long as b increases', why: 'b does not decide what is ready. A cell still needs the cells above and to its left first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'N(end, budget)', why: 'That counts paths paying exactly the budget. Paths paying fewer tolls are within budget too.' },
        { text: 'The sum of N(end, b) for b = 0 to the budget', right: true, why: 'Every path that paid at most the budget, each counted once, by the tolls it actually paid.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on the same grid with a budget of 1 toll. How many paths are within budget?',
      args: [[[0, 1, 0], [0, 0, 1], [1, 0, 0]], 1], answer: 4,
      misconceptions: [
        { answer: 3, feedback: 'That is the paths paying exactly 1 toll. The path that pays none is within a budget of 1 too.' },
        { answer: 6, feedback: 'That is every path. Two of them pass both tolls on the upper right.' },
      ],
      explain: '1 path pays no toll and 3 pay exactly one: 1 + 3 = 4. Right, right, down, down and right, down, right, down each pay 2.',
    },
  },

  'grid-direction': {
    problem: 'Move from the top-left cell to the bottom-right cell, right or down. Each cell you enter costs its value (the start costs nothing), and every change of direction costs a turn fee. Find the lowest total.',
    tryFirst: {
      prompt: 'A 2 × 3 grid of zeros, with a turn fee of 4. What is the lowest total?',
      args: [[[0, 0, 0], [0, 0, 0]], 4], answer: 4,
      misconceptions: [
        { answer: 0, feedback: 'The cells are free, but a path to the bottom-right has to move both right and down, so it turns at least once.' },
        { answer: 8, feedback: 'Right, down, right turns twice. Doing both rights together, then down, turns only once.' },
      ],
      explain: 'Right, right, down (or down, right, right) turns once: 4. Cheapest arrival at a cell is not enough here; how you arrived decides whether the next move pays a fee.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(r, c) = the cheapest cost to reach (r, c)', why: 'A cheaper arrival heading down can cost more later, if the next move is right. The direction decides the next fee, so it must be in the state.' },
        { text: 'The number of turns made to reach (r, c)', why: 'This ignores the cell costs, and a path with more turns can still be cheaper.' },
        { text: 'D(r, c, d) = the cheapest cost to reach (r, c) with the last move in direction d (right or down)', right: true, why: 'Two values per cell: arriving moving right, and arriving moving down. Each one knows whether the next move turns.' },
      ] },
      { kind: 'split', ask: 'A path arrives at (r, c) moving right. What was its move before that?', options: [
        { text: 'Right again (no fee) or down (a turn), arriving at the cell to the left', right: true, why: 'Moving right into (r, c) means it came from (r, c − 1); how it arrived there decides the fee.' },
        { text: 'Anything, arriving at the cell above', why: 'Arriving moving right means you came from the left, not from above.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(r, c, right)? (D(r, c, down) is the same, from the cell above.)', options: [
        { text: 'g(r, c) + min(D(r, c − 1, right), D(r, c − 1, down) + turn)', right: true, why: 'Enter the cell; going straight costs nothing extra, and switching from down to right pays the fee.' },
        { text: 'g(r, c) + min(D(r, c − 1, right), D(r, c − 1, down)) + turn', why: 'This charges a turn even when the path goes straight.' },
        { text: 'g(r, c) + min(D(r − 1, c, right), D(r − 1, c, down) + turn)', why: 'This reads the cell above, but a path arriving moving right came from the left.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Treat the start as if the path had been moving right', why: 'Then a first move down pays a fee: the grid [0], [0] with a fee of 4 would cost 4 instead of 0.' },
        { text: 'The start has no direction yet: its first move pays no fee', right: true, why: 'Seed the start’s neighbours directly: one step right is D(0, 1, right) = g(0, 1), and one step down is D(1, 0, down) = g(1, 0).' },
        { text: 'D(0, 0) = g(0, 0)', why: 'The start costs nothing in this problem.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'All the “right” values for the whole grid, then all the “down” values', why: 'D(r, c, right) reads D(r, c − 1, down), which would not be filled yet.' },
        { text: 'Row by row, left to right, both directions at each cell', right: true, why: 'Both values at a cell read only the cell to the left or the cell above.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'min(D(end, right), D(end, down)); 0 for a grid of one cell', right: true, why: 'The best path may arrive in either direction.' },
        { text: 'D(end, down)', why: 'The best path may end moving right, as right, right after a down does.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: costs [0, 1, 1], [3, 0, 0] and a turn fee of 2. What is the lowest total?',
      args: [[[0, 1, 1], [3, 0, 0]], 2], answer: 4,
      misconceptions: [
        { answer: 2, feedback: 'That leaves out the turn fee: right, right, down still turns once.' },
        { answer: 1, feedback: 'Right, down, right enters 1 + 0 + 0 but turns twice, paying 4 in fees.' },
      ],
      explain: 'Right, right, down: 1 + 1 + 0 plus one turn, 2, is 4. Right, down, right is 1 + 4 = 5, and down, right, right is 3 + 2 = 5.',
    },
  },

  'max-square': {
    problem: 'A grid holds 0s and 1s. Find the side length of the largest square made only of 1s.',
    tryFirst: {
      prompt: 'The grid is [1, 1, 1], [1, 1, 1], [1, 1, 0]. What is the side of the largest all-1 square?',
      args: [[[1, 1, 1], [1, 1, 1], [1, 1, 0]]], answer: 2,
      misconceptions: [
        { answer: 3, feedback: 'The whole grid is not a square of 1s: its bottom-right cell is 0.' },
        { answer: 4, feedback: '4 is the area of the 2 × 2 square. The question asks for its side.' },
        { answer: 8, feedback: '8 is how many 1s there are, not the size of a square.' },
      ],
      explain: 'Side 2: there are three 2 × 2 squares of 1s, and the 0 rules out side 3. Each square was decided by its bottom-right corner and the squares next to it.',
    },
    steps: [
      { kind: 'state', ask: 'What should S(r, c) mean?', options: [
        { text: 'The side of the largest all-1 square anywhere in the grid up to (r, c)', why: 'It cannot be grown: to build a square at (r, c) you need the squares that end right next to it, and this one may be far away.' },
        { text: 'The number of 1s from (0, 0) to (r, c)', why: 'That counts cells, not shapes; scattered 1s add up without forming a square.' },
        { text: 'The side of the largest all-1 square whose bottom-right corner is (r, c)', right: true, why: 'Pinning the corner makes the cell extendable, like a run ending at i in max subarray.' },
      ] },
      { kind: 'split', ask: 'A square of side k + 1 with its corner at (r, c): what has to be true next to it?', options: [
        { text: 'The squares ending above, to the left, and diagonally up-left each reach at least side k', right: true, why: 'Those three overlapping squares cover the big square, minus its corner cell.' },
        { text: 'The squares ending above and to the left reach side k', why: 'That is an L shape: in [0, 1], [1, 1] the cells above and left of the corner are 1, but the diagonal 0 breaks the square.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills S(r, c) when the cell is 1?', options: [
        { text: '1 + min(S(above), S(left), S(diagonal))', right: true, why: 'The weakest of the three limits how far the square can grow.' },
        { text: '1 + max(S(above), S(left), S(diagonal))', why: 'The strongest neighbour cannot vouch for the gaps the weaker ones leave.' },
        { text: '1 + min(S(above), S(left))', why: 'This ignores the diagonal, so [0, 1], [1, 1] would give 2.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A 0 cell is 0; a 1 on the top row or left column is 1', right: true, why: 'A square ending on the edge cannot extend up or left, so a 1 there is a 1 × 1 square.' },
        { text: 'Every edge cell is 0', why: 'A 1 on the edge is a square of side 1.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'Row by row, left to right', right: true, why: 'Above, left and up-left are all earlier in this order.' },
        { text: 'All the 1s first, then the 0s', why: 'A 1 reads its neighbours, which may be 0s not yet written.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'S of the bottom-right cell', why: 'The largest square can end anywhere; in the lesson’s grid the last cell is a 0.' },
        { text: 'The largest S anywhere, squared', why: 'That is the area. The question asks for the side.' },
        { text: 'The largest S anywhere', right: true, why: 'Every square ends at some corner, and S holds the best for each corner.' },
      ] },
    ],
    apply: { cell: [2, 3] },
  },

  'grid-multiagent': {
    problem: 'Two robots start in the top row, one in the leftmost cell and one in the rightmost. Each step, both move down one row, each to the cell straight below or diagonally left or right. Each collects every cell it visits; a cell visited by both counts once. Find the largest total once both reach the bottom row.',
    tryFirst: {
      prompt: 'The grid is [1, 0, 1], [2, 9, 3]. What is the largest total?',
      args: [[[1, 0, 1], [2, 9, 3]]], answer: 14,
      misconceptions: [
        { answer: 20, feedback: 'Both robots on the 9 collect it once, not twice.' },
        { answer: 11, feedback: 'Both on the 9 gives 1 + 1 + 9 = 11. Splitting up does better: one takes the 9, the other the 3.' },
      ],
      explain: '1 + 1 at the top, then one robot takes the 9 and the other the 3: 14. What one robot should do depends on where the other one is.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'Two tables, one per robot, added at the end', why: 'Solving each robot alone lets both take the same best cells, and adding counts those cells twice.' },
        { text: 'D(r, a, b) = the best total from row r down, with one robot in column a and the other in column b', right: true, why: 'Both robots are always on the same row, so one row index and two columns describe the whole situation.' },
        { text: 'The first robot’s best path, then the second robot’s best on what is left', why: 'That is greedy: the first robot’s best path can spoil a much better pair.' },
      ] },
      { kind: 'split', ask: 'From (r, a, b), what is the choice?', options: [
        { text: 'Where each robot steps next: 3 moves each, so 9 pairs (fewer at the edges)', right: true, why: 'After that pair of moves, the rest is the same question one row down, D(r + 1, a′, b′).' },
        { text: 'Which robot moves first', why: 'They move together, one row per step; the order within a step changes nothing.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(r, a, b)?', options: [
        { text: 'v(r, a) + v(r, b) + the best D(r + 1, a′, b′) over the move pairs', why: 'When a = b, this counts the shared cell twice.' },
        { text: 'v(r, a) + (v(r, b) if b ≠ a) + the best D(r + 1, a′, b′) over the move pairs', right: true, why: 'Collect this row once per occupied cell, then continue with the best pair of moves.' },
        { text: 'v(r, a) + v(r, b) + the best D(r + 1, a′, a′)', why: 'This forces the robots onto the same cell on every later row.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'The bottom row: D = v(a) + v(b), or v(a) once when a = b', right: true, why: 'On the last row there are no more moves, only what the two cells hold.' },
        { text: 'The bottom row is all 0', why: 'The bottom row is visited, so its values are collected.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        { text: 'One robot all the way down, then the other', why: 'They share cells, so they have to be decided together, row by row.' },
        { text: 'From the bottom row up; in each row, the (a, b) pairs in any order', right: true, why: 'Each value reads only the row below.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The best D(0, a, b) over every a and b', why: 'The robots start at the two corners, not anywhere on the top row.' },
        { text: 'D(0, 0, last column)', right: true, why: 'That is the start, both corners of the top row.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [2, 0, 2], [1, 5, 1], [9, 1, 9]. What is the largest total?',
      args: [[[2, 0, 2], [1, 5, 1], [9, 1, 9]]], answer: 28,
      misconceptions: [
        { answer: 32, feedback: 'Both robots on the middle 5 collect it once, not twice.' },
        { answer: 27, feedback: 'Both on the 5 collects it only once. If one takes the 5 and the other a 1, both can still reach a 9.' },
      ],
      explain: '2 + 2 on the top row; one robot takes the 5 and the other a 1; from there both reach a corner 9. 4 + 6 + 18 = 28.',
    },
  },
}
