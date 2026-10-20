// "Check yourself" for the grid lessons (Core, grids group). Format and checks: checks.js and
// checks.test.js. Every typed number was printed by the brute-force oracles before it was typed.
// The grid-paths lesson teaches right/down moves, so its right/down count uses the obstacle-paths
// oracle on an open grid; the challenge adds a diagonal move, and grid-paths' own oracle counts that.

export const GRID_CHECKS = {
  'grid-paths': [
    {
      know: 'Moving only right or down, P(r, c) = P(r − 1, c) + P(r, c − 1), and every cell in the top row or the left column has exactly one path.',
      ask: 'On a 3 × 3 grid, moving only right or down, how many paths go from the top-left to the bottom-right?',
      args: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], oracle: 'obstacle-paths', answer: 6,
      misconceptions: [
        { answer: 9, feedback: '9 is the number of cells, not of paths.' },
        { answer: 13, feedback: '13 counts the diagonal move too, which is the challenge’s version. Here only right and down are allowed.' },
        { answer: 4, feedback: '4 is 2 × 2, as if the two right moves and the two down moves were chosen separately. A path is an order of all four moves: which two of the four are the right moves.' },
      ],
      explain: 'The table is 1 1 1 / 1 2 3 / 1 3 6. Every path is 2 rights and 2 downs in some order, and there are C(4, 2) = 6 orders.',
    },
    {
      know: 'Every right/down path across an r × c grid makes c − 1 right moves and r − 1 down moves, in some order.',
      ask: 'Which formula gives the same count as the table?',
      options: [
        { text: 'r · c', why: 'That counts cells. A 3 × 3 grid has 9 cells and 6 paths.' },
        { text: 'C(r + c − 2, r − 1): choose which of the moves are the downs', right: true, why: 'A path is fixed once you know which of its r + c − 2 moves go down. The table’s additions build exactly Pascal’s triangle, turned on its side.' },
        { text: '2^(r + c − 2): each move is right or down', why: 'That counts every string of moves, including ones that walk off the grid. A path must make exactly r − 1 downs.' },
      ],
    },
    {
      know: 'The challenge allows a third move, one cell diagonally down-right. A path’s last move then came from above, from the left, or from the upper-left.',
      ask: 'With the diagonal move allowed, how many paths cross a 2 × 2 grid?',
      args: [2, 2], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 is the right/down count: right then down, down then right. The diagonal adds a third path, one move long.' },
        { answer: 4, feedback: '4 counts a path twice. List them: right-down, down-right, diagonal.' },
      ],
      explain: 'Right then down, down then right, and the single diagonal. The new recurrence adds a third term, P(r − 1, c − 1).',
    },
  ],

  'obstacle-paths': [
    {
      know: 'A blocked cell holds 0 paths; every other cell adds the counts from above and from the left.',
      ask: 'grid = [[0, 0, 0], [0, 1, 0], [0, 0, 0]]: the centre is blocked. How many right/down paths cross it?',
      args: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], answer: 2,
      misconceptions: [
        { answer: 6, feedback: '6 is the count with no block. The block’s 0 has to be used.' },
        { answer: 5, feedback: '5 removes one path, but four of the six paths go through the centre: every path except along the edges.' },
      ],
      explain: 'Only the two edge paths avoid the centre: right, right, down, down and down, down, right, right. The table is 1 1 1 / 1 0 1 / 1 1 2.',
    },
    {
      know: 'The start cell is set to 1 path before the loops run, unless it is blocked.',
      ask: 'What if the start cell itself is blocked?',
      options: [
        { text: 'There are 0 paths, whatever the rest of the grid holds', right: true, why: 'Every path begins on the start cell, so a blocked start leaves nothing to count. The code must give it 0, not 1.' },
        { text: 'The paths start from the next open cell instead', why: 'The problem fixes the start. No path can begin anywhere else.' },
        { text: 'It doesn’t matter: a path only enters cells after the start', why: 'The path visits the start too. A blocked start means no path exists.' },
      ],
    },
    {
      know: 'Each row of the table reads only the row above it and the cell to its left.',
      ask: 'How much of the table must be kept?',
      options: [
        { text: 'All of it, because a block can affect cells far away', why: 'A block affects later cells only through the counts it passes on, and those are in the row above.' },
        { text: 'One row: update it in place, left to right', right: true, why: 'Before p[c] is updated it still holds the row above (from above), and p[c − 1] already holds this row (from the left). A block sets p[c] = 0.' },
        { text: 'One column', why: 'A column works if you fill by columns. With the row-by-row loops, the row above is what is read.' },
      ],
    },
  ],

  'min-grid-path': [
    {
      know: 'Each cell keeps the lowest cost to reach it and how many paths have that cost; the count adds the counts of the neighbours that are cheapest.',
      ask: 'grid = [[1, 1, 1], [1, 1, 1]]. How many paths have the lowest cost?',
      args: [[[1, 1, 1], [1, 1, 1]]], part: 1, answer: 3,
      misconceptions: [
        { answer: 1, feedback: 'When several paths share the lowest cost, all of them count. Here every path costs 4.' },
        { answer: 4, feedback: '4 is the lowest cost, not the number of paths that have it.' },
      ],
      explain: 'Every path visits 4 cells worth 1, so all three paths tie: right-right-down, right-down-right, down-right-right.',
    },
    {
      know: 'grid = [[1, 3, 1], [1, 5, 1], [4, 2, 1]] is the lesson’s example; its cheapest path costs 7.',
      ask: 'Where do you read the cheapest cost in the table?',
      options: [
        { text: 'The bottom-right cell', right: true, why: 'A cell holds the cheapest way to reach it, and the path must end at the bottom-right.' },
        { text: 'The smallest cell in the last row', why: 'The path must end at the bottom-right cell, not anywhere on the bottom row.' },
        { text: 'The sum of the smallest cell in each row', why: 'Those cells needn’t lie on one path. The table compares whole paths.' },
      ],
    },
    {
      know: 'A general shortest-path search such as Dijkstra’s handles any graph. Here every move goes right or down.',
      ask: 'Why is filling the table row by row enough?',
      options: [
        { text: 'Moves go only right or down, so every cell’s neighbours are final before it is filled', right: true, why: 'No path ever comes back up or left, so there are no cycles, and row order is a valid order. Dijkstra’s search is for graphs where it isn’t.' },
        { text: 'The costs are small whole numbers', why: 'The table works for any costs, even negative ones, because of the order, not the values.' },
        { text: 'It isn’t; a search is needed for the exact answer', why: 'The table is exact: every path to a cell arrives from above or from the left, and both are already final.' },
      ],
    },
  ],

  'max-square': [
    {
      know: 'side[r][c] is the side of the largest square of 1s whose bottom-right corner is (r, c): 1 + the smallest of the cells above, left and above-left.',
      ask: 'grid = [[1, 1, 0], [1, 1, 1], [0, 1, 1]]. What is the side of the largest square of 1s?',
      args: [[[1, 1, 0], [1, 1, 1], [0, 1, 1]]], answer: 2,
      misconceptions: [
        { answer: 3, feedback: 'The diagonal of 1s runs three cells, but a 3 × 3 square needs all nine cells, and two corners are 0.' },
        { answer: 7, feedback: '7 counts the 1s. The question is the side of a square made only of 1s.' },
      ],
      explain: 'Two 2 × 2 squares: the top-left and the bottom-right. The table is 1 1 0 / 1 2 1 / 0 1 2.',
    },
    {
      know: 'A square of side k at corner (r, c) needs a square of side k − 1 ending above it, one to its left and one above-left.',
      ask: 'Why is the smallest of the three neighbours what limits the square?',
      options: [
        { text: 'Each neighbour vouches for part of the square, and the weakest part decides', right: true, why: 'The square of side k is covered by the three (k − 1)-squares plus the corner. If any one is smaller, part of the bigger square isn’t all 1s.' },
        { text: 'The smallest neighbour is the most recently filled', why: 'Filling order doesn’t decide the value. The three neighbours are all filled before the corner.' },
        { text: 'Taking the largest would also work', why: 'The largest would claim a square whose other parts may contain a 0, as in the check above.' },
      ],
    },
    {
      know: 'The same table idea is tempting for the largest rectangle of 1s.',
      ask: 'Does “1 + the smallest of three neighbours” find the largest rectangle?',
      options: [
        { text: 'Yes, with the same three cells', why: 'A rectangle has two side lengths, and one number per cell can’t hold both. A 1 × 5 bar would get side 1.' },
        { text: 'No: a rectangle needs a different state, such as the height of 1s above each cell in a row', right: true, why: 'The square’s single number works because both sides are equal. Rectangles are usually solved row by row with column heights.' },
        { text: 'Yes, if the table is filled from the bottom-right instead', why: 'The order doesn’t add the missing information: a rectangle has two sizes, and the cell holds one.' },
      ],
    },
  ],

  'triangle-path': [
    {
      know: 'Working up from the bottom row, each number adds the smaller of the two numbers it can step to.',
      ask: 'triangle = [[1], [2, 9], [9, 9, 1]]. What is the smallest path sum?',
      args: [[[1], [2, 9], [9, 9, 1]]], answer: 11,
      misconceptions: [
        { answer: 12, feedback: '12 is the greedy path: from the top, always step to the smaller number below. It takes the 2 and then has only 9s to choose from.' },
        { answer: 4, feedback: '4 adds the smallest number of each row, 1 + 2 + 1, but the 1 at the bottom right isn’t below the 2.' },
      ],
      explain: '1 → 9 → 1 = 11. Bottom-up, the second row becomes [2 + 9, 9 + 1] = [11, 10], and the top 1 + 10 = 11.',
    },
    {
      know: 'Filled from the bottom up, the top cell holds the answer; filled from the top down, each cell holds the best path from the top to it.',
      ask: 'If you fill it top-down instead, where is the answer?',
      options: [
        { text: 'The smallest cell of the bottom row', right: true, why: 'Top-down, each bottom cell is the best path ending there, and the path may end anywhere on the bottom row.' },
        { text: 'The top cell, as before', why: 'Top-down, the top cell is just its own number: it is where every path starts.' },
        { text: 'The last cell of the bottom row', why: 'A path may end at any bottom position, so all of them must be compared.' },
      ],
    },
    {
      know: 'Each row of the bottom-up table is computed from the row below it, and then the row below is no longer read.',
      ask: 'How much memory does the bottom-up method need for a triangle of n rows?',
      options: [
        { text: 'One row of n numbers', right: true, why: 'below is replaced by the new row each time; nothing older is needed.' },
        { text: 'The whole triangle, about n²/2 numbers', why: 'That works too, but each row reads only the one below it.' },
        { text: 'Two numbers', why: 'A row needs every position of the row below, not just two.' },
      ],
    },
  ],

  'grid-resources': [
    {
      know: 'ways[r][c][b] counts the paths to (r, c) that have paid exactly b tolls; the answer adds the last cell over every b up to the budget.',
      ask: 'grid = [[0, 1, 0], [1, 0, 1], [0, 1, 0]] and budget = 1. How many paths pay at most one toll?',
      args: [[[0, 1, 0], [1, 0, 1], [0, 1, 0]], 1], answer: 0,
      misconceptions: [
        { answer: 6, feedback: '6 is every path. Each one passes two toll cells: one of the 1s next to the start and one of the 1s next to the end.' },
      ],
      explain: 'Every path leaves the start through a toll cell and enters the end through another, so every path pays 2. With budget 2 all 6 paths count.',
    },
    {
      know: 'Two paths can reach the same cell having paid different numbers of tolls.',
      ask: 'Why does the state need b, the tolls paid so far?',
      options: [
        { text: 'Paths that reach a cell with different tolls paid have different futures: one may still afford a toll the other can’t', right: true, why: 'Which continuations stay within budget depends on what has been spent. Keeping one count per b keeps them apart.' },
        { text: 'To print the tolls at the end', why: 'The extra index is needed for the count itself, not for printing.' },
        { text: 'It doesn’t: count all paths and subtract the ones over budget', why: 'Counting the ones over budget needs the same per-toll counts. The index is the work.' },
      ],
    },
    {
      know: 'The table has rows × cols × (budget + 1) cells, each filled from two neighbours.',
      ask: 'How does the work grow with the budget?',
      options: [
        { text: 'In proportion to budget + 1, for a fixed grid', right: true, why: 'Each extra unit of budget adds a layer of rows × cols cells.' },
        { text: 'Exponentially, like the number of paths', why: 'The table never lists paths, only counts per cell and toll count.' },
        { text: 'Not at all: the budget only changes the last step', why: 'Every cell keeps one count per toll value, so the table grows with the budget.' },
      ],
    },
  ],

  'grid-direction': [
    {
      know: 'Each cell keeps two costs: arriving with a move down and arriving with a move right. Arriving the other way from the last move costs turn extra.',
      ask: 'A 3 × 3 grid of zeros, turn = 5. What is the lowest total?',
      args: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]], 5], answer: 5,
      misconceptions: [
        { answer: 0, feedback: 'The cells are free, but you can’t reach the corner without changing direction at least once.' },
        { answer: 10, feedback: '10 makes two turns, as a zigzag does. Go all the way right, then all the way down: one turn.' },
      ],
      explain: 'Right, right, down, down: one turn, cost 5. Every path needs at least one turn, because it must go both right and down.',
    },
    {
      know: 'The plain min-cost path keeps one number per cell.',
      ask: 'Why does this one keep two numbers per cell?',
      options: [
        { text: 'The cost of the next move depends on the direction of the last one', right: true, why: 'Whether the next move is a turn depends on how you arrived. Two paths with the same cost but different last moves have different futures.' },
        { text: 'One for the cheapest path and one for the second cheapest', why: 'The second cheapest doesn’t help. What matters is the direction you arrived in.' },
        { text: 'To be able to walk back the path', why: 'Walking back reads the table; the two values are needed to compute the costs at all.' },
      ],
    },
    {
      know: 'grid = [[0, 1, 1], [1, 1, 1]]: each cell you enter costs 1, and the shortest paths make one or two turns.',
      ask: 'With turn = 0, what is the lowest total?',
      args: [[[0, 1, 1], [1, 1, 1]], 0], answer: 3,
      misconceptions: [
        { answer: 6, feedback: '6 is the answer with turn = 3. With free turns, only the three cells entered count.' },
      ],
      explain: 'Every path enters three cells worth 1. With turn = 0 the extra state changes nothing, and the answer is the plain min-cost path.',
    },
  ],

  'grid-multiagent': [
    {
      know: 'Both robots move down a row together; a cell they share is collected once.',
      ask: 'grid = [[1, 0, 1], [0, 9, 0]]. What is the largest total?',
      args: [[[1, 0, 1], [0, 9, 0]]], answer: 11,
      misconceptions: [
        { answer: 20, feedback: '20 collects the 9 twice, once per robot. A shared cell counts once.' },
        { answer: 2, feedback: '2 keeps the robots apart. Both may step onto the 9; it counts once, and 1 + 1 + 9 is more.' },
      ],
      explain: 'Each robot collects its 1, then both step diagonally onto the 9, collected once: 1 + 1 + 9 = 11.',
    },
    {
      know: 'One robot alone is a single-path problem; the two robots share the grid.',
      ask: 'Why not solve each robot separately and add the results?',
      options: [
        { text: 'Both would take the same best cells, and a shared cell must count once', right: true, why: 'Separate solutions ignore each other. The joint state (row, a, b) knows when they stand on the same cell.' },
        { text: 'Separately is too slow', why: 'Separately is faster; it is wrong, not slow.' },
        { text: 'It works if you subtract the shared cells afterwards', why: 'Subtracting doesn’t give the best total: with the overlap known, a different pair of paths might have been better.' },
      ],
    },
    {
      know: 'The state is (row, a, b): the row and both robots’ columns. Each step tries 3 × 3 moves.',
      ask: 'How much work is it for a grid of R rows and C columns?',
      options: [
        { text: 'About R · C² · 9', right: true, why: 'R rows, C² pairs of columns, and nine pairs of moves for each.' },
        { text: 'About R · C', why: 'That is one robot. Two robots need a pair of columns per state.' },
        { text: 'About 9^R, every pair of move sequences', why: 'That is the number of joint paths, which the table never lists.' },
      ],
    },
  ],
}
