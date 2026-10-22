// "Design it yourself" for the game lessons (Specialist, games group). Format: designs.js. Lessons with a
// live table ask for one of its cells (a T/F cell is typed as T or F); transpositions (no table) asks a
// second hand-solved board. Every number was printed by specialist-oracles.js or the trace before it was typed.

export const GAME_DESIGNS = {
  'win-lose': {
    problem: 'A token moves up, left or diagonally up-left on a board with blocked squares; a player who can’t move loses. Count the squares that win for the player to move, on boards up to 400 × 400.',
    tryFirst: {
      prompt: 'A board of two free squares side by side. From how many of them does the player to move win?',
      args: [[[0, 0]]], answer: 1,
      misconceptions: [
        { answer: 2, feedback: 'From the left square there is no move at all, so the player to move there has already lost.' },
        { answer: 0, feedback: 'From the right square the player moves left, and the opponent, on a square with no move, loses.' },
      ],
      explain: 'The left square has no move: losing. The right square moves onto it and wins. One winning square.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'W(r, c): whether the player to move with the token on (r, c) can force a win', right: true, why: 'Who moved before doesn’t matter; the square and whose turn it is decide the rest.' },
        { text: 'How many moves are left before the token gets stuck', why: 'Different lines of play last different lengths, and the players choose between them.' },
        { text: 'Whether the first player wins from (r, c)', why: 'From one square it depends on whose turn it is, so the value must be for the player to move.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The move made from (r, c)', right: true, why: 'Each move hands the opponent a smaller position, with the roles swapped.' },
        { text: 'The square where the token finally gets stuck', why: 'The players choose that together, against each other; neither controls it alone.' },
      ] },
      { kind: 'recurrence', ask: 'When is W(r, c) true?', options: [
        { text: 'When some move reaches a square with W false', right: true, why: 'Take that move: the opponent is left on a losing square.' },
        { text: 'When some move reaches a square with W true', why: 'That square wins for the opponent, who moves next there.' },
        { text: 'When every move reaches a square with W false', why: 'One such move is enough; asking for all of them marks winning squares as losing.' },
      ] },
      { kind: 'base', ask: 'What holds on a square with no move?', options: [
        { text: 'W is false: the player to move has lost', right: true, why: 'A player who can’t move loses.' },
        { text: 'W is true: the game is over and the last mover is done', why: 'The player who can’t move is the one to move, and that player loses.' },
      ] },
      { kind: 'order', ask: 'In what order are the squares filled?', options: [
        { text: 'Reading order: row by row, left to right', right: true, why: 'Every move goes up or left, onto a square already filled.' },
        { text: 'From the bottom-right corner back to the top-left', why: 'A square would read the squares above and to its left before they are filled.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The number of free squares with W true', right: true, why: 'Each one is a square from which the player to move wins.' },
        { text: 'W of the bottom-right square', why: 'That is one square; the question asks how many squares win.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: true, feedback: 'T needs a move to an F square. From (2, 2) the moves reach (1, 2) and (2, 1), both T; the diagonal (1, 1) is blocked.' },
    ] },
  },

  'subtraction-games': {
    problem: 'A pile loses a number of stones from a fixed set each move; a player who can’t move loses. Count the losing piles up to N = 10¹², far too many to tabulate.',
    tryFirst: {
      prompt: 'Moves remove 1 or 2 stones. How many of the piles 0, 1, …, 6 are losing for the player to move?',
      args: [[1, 2], 6], answer: 3,
      misconceptions: [{ answer: 2, feedback: '2 forgets pile 0: with no stones there is no move, so it loses. The losing piles are 0, 3 and 6.' }],
      explain: 'Piles 0, 3 and 6 lose: from a multiple of 3 every move leaves 1 or 2 more than one, which the opponent brings back to a multiple of 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'W(i): whether the player to move with i stones can force a win', right: true, why: 'The pile size is all the position there is.' },
        { text: 'W(i) and the stones each player has taken', why: 'Taken stones don’t change what moves are left; only the pile size matters.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'How many stones the first move removes', right: true, why: 'Each move leaves a smaller pile for the opponent.' },
        { text: 'Who takes the last stone', why: 'That is the result of the game, not a choice either player makes alone.' },
      ] },
      { kind: 'recurrence', ask: 'How is W(i) found?', options: [
        { text: 'W(i) is true when some move s ≤ i leaves W(i − s) false', right: true, why: 'That move leaves the opponent on a losing pile.' },
        { text: 'W(i) is true when the move removing the most stones leaves W false', why: 'The best move need not be the largest; every move that fits must be tried.' },
      ] },
      { kind: 'base', ask: 'What holds when no move fits?', options: [
        { text: 'W is false: the player to move loses', right: true, why: 'A player who can’t move loses, and that includes pile 0.' },
        { text: 'Only pile 0 is losing; a small pile no move fits is winning', why: 'With moves {2, 3}, pile 1 has no move either, so it is losing too.' },
      ] },
      { kind: 'order', ask: 'How is N = 10¹² reached?', options: [
        { text: 'Fill upwards until the last m outcomes (m the largest move) repeat, then use the period', right: true, why: 'Those m outcomes decide everything after them, so a repeat of them means the outcomes repeat from there.' },
        { text: 'Fill upwards until any outcome pattern of length m − 1 repeats, then use the period', why: 'Fewer than m outcomes don’t decide the next one, so such a repeat can be a coincidence.' },
        { text: 'Fill all piles 0 … N', why: 'That is 10¹² cells, far too many.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The losing piles before the period, plus the losing piles in a period times the full periods, plus those in the last part', right: true, why: 'From the repeat on, the outcomes are the period over and over.' },
        { text: 'The losing piles in one period, times N divided by the period', why: 'The piles before the period starts don’t repeat, and the last period is usually partial.' },
      ] },
    ],
    apply: { cell: [0, 8], misconceptions: [
      { answer: true, feedback: 'T needs a move to a losing pile. Removing 1 leaves 7 and removing 3 leaves 5, both T.' },
    ] },
  },

  'score-difference': {
    problem: 'Players take 1, 2 or 3 stones from the front of a row and score their values. Find the first player’s total minus the second’s with best play, for up to 100 000 stones.',
    tryFirst: {
      prompt: 'Stones 1, 2, 3, 7. What is the first player’s total minus the second’s, with best play?',
      args: [[1, 2, 3, 7]], answer: -1,
      misconceptions: [
        { answer: -11, feedback: 'Taking only the 1 leaves 2, 3, 7, where the second player takes all three and leads by 12. Taking 1, 2, 3 does better.' },
        { answer: 13, feedback: 'No move takes all four stones: at most three at a time.' },
      ],
      explain: 'Take 1, 2, 3 (6); the second player takes the 7. 6 − 7 = −1. Every other first move does worse.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'D(i): the lead of the player to move, with stones i, i + 1, … left', right: true, why: 'One number serves both players: each wants their own lead as large as possible.' },
        { text: 'The first player’s best total with stones i, i + 1, … left', why: 'Who is to move at i depends on how the stones were taken before, so “first player” is not one value per i.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'How many stones, 1, 2 or 3, the player to move takes', right: true, why: 'Each choice scores its stones and hands a shorter row to the opponent.' },
        { text: 'Which stones the opponent will take next', why: 'The opponent chooses that, from their own best play; it is inside D of the shorter row.' },
      ] },
      { kind: 'recurrence', ask: 'How is D(i) found?', options: [
        { text: 'D(i) = max over t of (the t stones’ sum − D(i + t))', right: true, why: 'The opponent’s lead on the rest counts against the player to move.' },
        { text: 'D(i) = max over t of (the t stones’ sum + D(i + t))', why: 'D(i + t) is the opponent’s lead; adding it counts their stones as ours.' },
        { text: 'D(i) = the sum of the next 3 stones − D(i + 3)', why: 'Taking 3 is not always best: a negative stone among them may be better left.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'D(n) = 0: no stones, no lead', right: true, why: 'Nothing more to take, so neither player gains.' },
        { text: 'D(n − 1) = 0', why: 'With one stone left the player to move takes it: the lead is its value.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'i = n − 1 down to 0', right: true, why: 'D(i) reads D(i + 1), D(i + 2) and D(i + 3).' },
        { text: 'i = 0 up to n − 1', why: 'D(0) would read cells further along that are not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0)', right: true, why: 'All the stones are left and the first player is to move.' },
        { text: 'The largest D(i)', why: 'Only D(0) is the actual start; the others are positions later in the game.' },
      ] },
    ],
    apply: { cell: [0, 0], misconceptions: [
      { answer: -11, feedback: '−11 is only the first option, 1 − D(1). Compare it with 3 − D(2) = −7 and 6 − D(3) = −1.' },
      { answer: 13, feedback: '13 adds the opponent’s lead: 1 + D(1). Their lead counts against you: subtract it.' },
    ] },
  },

  'interval-games': {
    problem: 'Players take a number from either end of a row and score it. Find the first player’s total minus the second’s with best play, for rows of up to 1000 numbers.',
    tryFirst: {
      prompt: 'Row 1, 5, 233, 7. What is the first player’s total minus the second’s, with best play?',
      args: [[1, 5, 233, 7]], answer: 222,
      misconceptions: [{ answer: -222, feedback: 'Taking the larger end, 7, opens the 233 to the second player. Taking the 1 keeps it covered: the second player must open it.' }],
      explain: 'Take the 1. The second player takes 5 (exposing 233) or 7 (exposing nothing new, but then 5 and 233 remain): either way the first player gets 233. 1 + 233 − (5 + 7) = 222.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'D(l, r): the lead of the player to move on the piece a[l], …, a[r − 1]', right: true, why: 'What is left is always one piece of the row, and one lead serves both players.' },
        { text: 'D(k): the lead of the player to move with k numbers left', why: 'Pieces of the same length hold different numbers, with different leads.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Whether the player to move takes the left end or the right end', right: true, why: 'Those are the only moves, and each leaves a shorter piece.' },
        { text: 'Whether to take the larger end', why: 'That is a rule for choosing, and it loses: [1, 5, 233, 7] needs the smaller end.' },
      ] },
      { kind: 'recurrence', ask: 'How is D(l, r) found?', options: [
        { text: 'max(a[l] − D(l + 1, r), a[r − 1] − D(l, r − 1))', right: true, why: 'Take an end, then the opponent leads on the piece that is left.' },
        { text: 'max(a[l] − D(l + 1, r), a[r − 1] − D(l + 1, r))', why: 'Taking the right end leaves a[l:r − 1], not a[l + 1:r], which still holds the number just taken.' },
        { text: 'max(a[l] + D(l + 1, r), a[r − 1] + D(l, r − 1))', why: 'The opponent’s lead counts against the player to move; adding it is backwards.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'D(l, l) = 0: an empty piece', right: true, why: 'Nothing left to take, no lead.' },
        { text: 'D(l, l + 1) = 0: one number left', why: 'The player to move takes it: the lead is a[l].' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By length, shortest pieces first', right: true, why: 'A piece reads the two pieces one shorter.' },
        { text: 'By left end, l = 0 first', why: 'D(0, r) reads D(1, r), which would not be filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n)', right: true, why: 'The whole row, first player to move.' },
        { text: 'The largest D(l, r)', why: 'Only D(0, n) is the actual start of the game.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: -4, feedback: '−4 is taking the left end, 1 − D(1, 2). Taking the 5 is better: 5 − D(0, 1) = 4.' },
      { answer: 6, feedback: '6 is 1 + 5, both numbers. The opponent takes one of them: subtract their lead.' },
    ] },
  },

  'grundy': {
    problem: 'Kayles: knock down one pin or two neighbouring pins of a row, which may split it. Find the Grundy value of a row of up to 1000 pins.',
    tryFirst: {
      prompt: 'What is the Grundy value of a row of 2 pins?',
      args: [2], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'The moves reach 0 (knock both) and 1 (knock one, leaving one pin). The mex of {0, 1} is 2.' }],
      explain: 'Knocking both pins reaches value 0; knocking one leaves one pin, value 1. The smallest value not reached is 2.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'g(n): the Grundy value of one row of n pins', right: true, why: 'Any position is a set of rows, and its value comes from the rows’ values.' },
        { text: 'The most pins the player to move can knock down before the row is gone', why: 'That ignores the opponent’s replies, and says nothing about how two rows combine.' },
        { text: 'Whether a row of n pins is winning', why: 'Win or lose is not enough to combine two rows: 1 and 1 lose together, 1 and 2 don’t.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Which pin, or pair of neighbouring pins, is knocked down', right: true, why: 'Each choice leaves at most two shorter rows.' },
        { text: 'Which pins are left standing at the end', why: 'Every game ends with none standing; the order of play is what matters.' },
      ] },
      { kind: 'recurrence', ask: 'How is g(n) found?', options: [
        { text: 'The mex of g(left) ⊕ g(right) over every move', right: true, why: 'Two rows side by side are a sum, whose value is the XOR; the mex makes the row equal to a Nim heap.' },
        { text: 'The mex of g(left) + g(right) over every move', why: 'Values of a sum don’t add: two single pins are a lost position, 1 ⊕ 1 = 0, not 2.' },
        { text: 'The largest g(left) ⊕ g(right) over every move, plus one', why: 'The mex is the smallest value not reached; a gap below the largest is missed.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'g(0) = 0: no pins, no move', right: true, why: 'A position with no move has value 0, the mex of nothing.' },
        { text: 'g(1) = 0: one pin', why: 'One pin can be knocked down, reaching value 0, so its value is 1.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'n = 1, 2, 3, …', right: true, why: 'Every move leaves shorter rows.' },
        { text: 'From n down to 1', why: 'g(n) needs the shorter rows first.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'g(n)', right: true, why: 'The value of the row asked about.' },
        { text: 'g(n) ⊕ g(n − 1)', why: 'That is the value of two rows, of n and n − 1 pins, not one.' },
      ] },
    ],
    apply: { cell: [0, 6], misconceptions: [
      { answer: 5, feedback: '5 is the largest value reached plus one. The mex is the smallest value missing from {0, 1, 2, 4}.' },
      { answer: 4, feedback: '4 is in the set: some move reaches it. The smallest missing value is 3.' },
    ] },
  },

  'game-sums': {
    problem: 'Several piles, each a subtraction game with the same moves; a move changes one pile. Count the winning first moves, for up to 10 000 piles of up to 100 000 stones.',
    tryFirst: {
      prompt: 'One pile of 3; moves remove 1 or 2 stones. How many first moves win?',
      args: [[1, 2], [3]], answer: 0,
      misconceptions: [{ answer: 2, feedback: 'Both moves fit, but both lose: 2 or 1 stones left, the opponent takes them all.' }],
      explain: 'A pile of 3 is losing: removing 1 or 2 leaves 2 or 1, which the opponent clears. No first move wins.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed per pile?', options: [
        { text: 'g(x): the Grundy value of a pile of x, for every x up to the largest pile', right: true, why: 'Combined by XOR, these values say whether any set of piles is won or lost.' },
        { text: 'Whether each pile alone is winning', why: 'Two winning piles together can lose (1 and 1 under the move 1), so win or lose is not enough.' },
        { text: 'The value of the largest pile only', why: 'The other piles change who wins: two equal piles together are lost for the player to move.' },
      ] },
      { kind: 'split', ask: 'What is a move in the whole game?', options: [
        { text: 'A move in exactly one pile, the others unchanged', right: true, why: 'That is what makes it a sum of games.' },
        { text: 'A move in every pile at once', why: 'The rules change one pile per turn; a move in every pile is a different game.' },
      ] },
      { kind: 'recurrence', ask: 'When does a move on pile p, leaving p − s, win?', options: [
        { text: 'When g(p − s) = G ⊕ g(p), where G is the XOR of all the piles’ values', right: true, why: 'Then the new XOR is 0: a lost position for the opponent.' },
        { text: 'When g(p − s) = 0', why: 'That empties this pile’s value, but the XOR of the other piles may still be non-zero.' },
      ] },
      { kind: 'base', ask: 'What is the base case for g?', options: [
        { text: 'g(x) = 0 when no move fits, including x = 0', right: true, why: 'No move: the mex of nothing is 0.' },
        { text: 'g(0) = 1', why: 'An empty pile has no move, so its value is 0.' },
      ] },
      { kind: 'order', ask: 'In what order are things computed?', options: [
        { text: 'g for every size first, then G, then each pile’s moves', right: true, why: 'Each move test needs G, which needs every pile’s g.' },
        { text: 'Test each pile’s moves as its g is found, before G is known', why: 'Whether a move wins depends on the other piles through G.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The number of (pile, move) pairs that pass the test', right: true, why: 'Each is a different winning first move.' },
        { text: 'Whether G is non-zero', why: 'That says whether a winning move exists, not how many there are.' },
      ] },
    ],
    apply: { cell: [2, 0], misconceptions: [
      { answer: 6, feedback: '6 counts every move that fits. Only moves that make the XOR 0 win: 4 → 2 and 2 → 1.' },
    ] },
  },

  'stochastic-games': {
    problem: 'Two players race to square n; each turn, step one square or roll a fair die and move that far. Find the first player’s chance of winning with best play, exactly.',
    tryFirst: {
      prompt: 'Race to 2 with a 2-sided die. What is the first player’s chance of winning with best play? Type a fraction.',
      args: [2, 2], answer: 3 / 4,
      misconceptions: [{ answer: 0.5, feedback: 'Rolling reaches 2 at once half the time; when it doesn’t, the second player still has to get there first.' }],
      explain: 'Roll: a 2 wins at once (1/2). A 1 puts the first player on 1; the second player rolls and wins only with a 2 (1/2), else the first player steps home. 1/2 + 1/2 · 1/2 = 3/4.',
    },
    steps: [
      { kind: 'state', ask: 'What does a cell hold?', options: [
        { text: 'V(a, b): the chance that the player to move, on a, wins against the other on b', right: true, why: 'Both positions and whose turn it is decide the rest; the mover’s view makes one table serve both players.' },
        { text: 'V(a): the chance of winning from square a', why: 'Whether a is good depends on how close the other player is.' },
      ] },
      { kind: 'split', ask: 'What happens at a turn?', options: [
        { text: 'A choice (step or roll), then, for a roll, a chance outcome', right: true, why: 'The player controls the choice; nobody controls the face.' },
        { text: 'A choice of step or roll, then a choice of the face', why: 'The face is chance, not anyone’s choice: it must be averaged.' },
      ] },
      { kind: 'recurrence', ask: 'How is V(a, b) found?', options: [
        { text: 'max(step, roll), where a move to a′ is worth 1 − V(b, a′), or 1 at n, and roll averages the faces', right: true, why: 'Max over the player’s own choice, average over chance, and 1 − V for the opponent’s turn.' },
        { text: 'max(step, the best face), each move worth 1 − V(b, a′)', why: 'The best face can’t be chosen: a roll averages over all faces.' },
        { text: 'min(step, roll)', why: 'The player to move chooses, so V takes the better choice, not the worse.' },
      ] },
      { kind: 'base', ask: 'What is the base case?', options: [
        { text: 'A move that reaches or passes n is worth 1', right: true, why: 'Reaching n first wins the race outright.' },
        { text: 'V(n, b) = 0 for every b', why: 'A player on n has already won, and is never the player to move.' },
      ] },
      { kind: 'order', ask: 'In what order are the cells filled?', options: [
        { text: 'By a + b, largest first', right: true, why: 'Every move increases a + b, so V(a, b) reads cells with a larger sum.' },
        { text: 'By a, largest first, then b', why: 'V(a, b) reads V(b, a′), with b possibly smaller than a: not filled yet.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'V(0, 0)', right: true, why: 'Both start on 0, first player to move.' },
        { text: '1 − V(0, 0)', why: 'That is the second player’s chance.' },
      ] },
    ],
    apply: { cell: [1, 1], misconceptions: [
      { answer: 0.5, feedback: '1/2 is the step. Rolling is better here: (1 − V(1,2) + 1) / 2 = 3/4.' },
      { answer: 0.25, feedback: '1/4 averages V(1,2) and 0, the opponent’s chances. After a move, our chance is 1 − V.' },
    ] },
  },

  'transpositions': {
    problem: 'Find the value of a k-in-a-row game from a given board on up to 12 squares, where the orders of moves are far too many to search one by one.',
    tryFirst: {
      prompt: 'A 2 × 2 board, two in a row wins. X has the top-left square and O the top-right; X is to move. Who wins: 1 for X, 0 a draw, −1 for O?',
      args: [['XO', '..'], 2], answer: 1,
      misconceptions: [{ answer: 0, feedback: 'X takes either bottom square: below its X makes a column, the other a diagonal.' }],
      explain: 'Both empty squares complete a line for X: straight down or diagonally. X wins at once: 1.',
    },
    steps: [
      { kind: 'state', ask: 'What is the key of the table?', options: [
        { text: 'The whole board: which squares hold X and which O', right: true, why: 'That decides every future, and here also whose turn it is.' },
        { text: 'Which squares are filled', why: 'The same filled squares with different owners have different futures.' },
        { text: 'The number of marks on the board', why: 'Boards with the same number of marks in different places have different futures.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'Which empty square the player to move marks', right: true, why: 'Each choice leaves a board with one more mark.' },
        { text: 'Which line will be completed', why: 'That is decided by both players’ later moves.' },
      ] },
      { kind: 'recurrence', ask: 'What is a board’s value?', options: [
        { text: 'The best for the player to move over its moves: max for X, min for O', right: true, why: 'Minimax: each player picks what is best for them.' },
        { text: 'The average over its moves', why: 'Players choose their moves; nothing here is chance.' },
      ] },
      { kind: 'base', ask: 'What are the base cases?', options: [
        { text: 'A completed line: 1 or −1; a full board without one: 0', right: true, why: 'The game ends there, with no more moves.' },
        { text: 'Only a full board ends the game', why: 'A completed line wins at once, even with squares left.' },
      ] },
      { kind: 'order', ask: 'When may a stored value be reused?', options: [
        { text: 'Whenever the same board comes up, because each stored value is exact', right: true, why: 'A full search gives the true value of the board, whatever order reached it.' },
        { text: 'Always, even a bound stored by an alpha-beta search that was cut off', why: 'A cutoff proves only a bound, such as “at least 1”; it is exact only after a full search.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The value of the starting board', right: true, why: 'The search starts from the board given.' },
        { text: 'The most common value in the table', why: 'The table holds values of many boards; only the start is asked about.' },
      ] },
    ],
    apply: {
      prompt: 'A 3 × 3 board, three in a row wins. X has the top-middle square and O is to move. What is the value: 1, 0 or −1?',
      args: [['.X.', '...', '...'], 3], answer: 0,
      misconceptions: [{ answer: 1, feedback: 'X moved first, but tic-tac-toe is a draw with best play from any first move, the edge included.' }],
      explain: 'With best play from both sides, a game of tic-tac-toe opened on an edge square is still a draw: 0.',
    },
  },
}
