// "Check yourself" for the game lessons (Specialist, games group). Format and checks: checks.js and
// checks.test.js; the numbers come from specialist-oracles.js.

export const GAME_CHECKS = {
  'win-lose': [
    {
      know: 'A square wins when some move reaches a losing square; a square with no move loses. Moves go up, left or diagonally up-left.',
      ask: 'An open board 2 rows by 3 columns. From how many of its 6 squares does the player to move win?',
      args: [[[0, 0, 0], [0, 0, 0]]], answer: 4,
      misconceptions: [{ answer: 2, feedback: '2 counts the losing squares, the top-left corner and the top-right one. The other 4 win.' }],
      explain: 'The top-left square has no move: losing. The top-right square can only move left onto a winning square: losing. Every other square can reach one of those two: 4 winning squares.',
    },
    {
      know: 'Win and lose are from the point of view of the player to move.',
      ask: 'Why is one table enough for both players?',
      options: [
        { text: 'The game is the same for both: only the square matters, so W says who wins from the mover’s side', right: true, why: 'Both players have the same moves from the same square; the roles just swap each turn.' },
        { text: 'Because the first player always wins', why: 'Not so: from a losing square the first player loses with best play.' },
        { text: 'Because the board is filled in reading order', why: 'The order only makes the cells ready in time; it says nothing about the two players.' },
      ],
    },
    {
      know: 'Each square looks at up to three moves, each to a square already decided.',
      ask: 'About how much work does the table take for an h × w board?',
      options: [
        { text: 'About h · w steps', right: true, why: 'Each square is decided once, from three squares already decided.' },
        { text: 'About 3^(h + w) steps', why: 'That is searching every line of play; the table decides each square once.' },
        { text: 'About (h · w)² steps', why: 'A square reads three neighbours, not every other square.' },
      ],
    },
  ],

  'subtraction-games': [
    {
      know: 'A pile loses when every move that fits leaves a winning pile; pile 0 has no move and loses.',
      ask: 'Moves remove 1 or 2 stones. How many of the piles 0, 1, …, 10 are losing?',
      args: [[1, 2], 10], answer: 4,
      misconceptions: [{ answer: 3, feedback: '3 forgets pile 0. The losing piles are 0, 3, 6 and 9.' }],
      explain: 'The multiples of 3 lose: 0, 3, 6, 9. From any other pile, removing 1 or 2 reaches a multiple of 3.',
    },
    {
      know: 'The outcome of pile i depends only on the outcomes of the m piles before it, where m is the largest move.',
      ask: 'Why must the outcomes repeat once m of them in a row repeat?',
      options: [
        { text: 'The next outcome is a fixed function of the last m, so the same m give the same future, step by step', right: true, why: 'By induction every later outcome matches the one a period earlier.' },
        { text: 'Because every subtraction game has period m', why: 'The period can be longer than m, and a part before it may not repeat at all.' },
        { text: 'Because the outcomes are random', why: 'Nothing is random: each outcome follows from the earlier ones.' },
      ],
    },
    {
      know: 'There are only 2ᵐ possible windows of m outcomes.',
      ask: 'At most how far must the table be filled before a window repeats?',
      options: [
        { text: 'About 2ᵐ piles past the first m', right: true, why: 'There are only 2ᵐ different windows, so one must repeat by then.' },
        { text: 'Up to N, always', why: 'A window repeats within 2ᵐ steps, so N can be far larger than the table.' },
        { text: 'm piles', why: 'The first repeat can take much longer than m piles.' },
      ],
    },
  ],

  'score-difference': [
    {
      know: 'D(i) = max over t of (the t stones’ sum − D(i + t)), with D(n) = 0.',
      ask: 'Stones 5, −10, 3. What is the first player’s total minus the second’s, with best play?',
      args: [[5, -10, 3]], answer: 12,
      misconceptions: [{ answer: -2, feedback: '−2 takes all three stones. Taking just the 5 leaves the −10 to the second player.' }],
      explain: 'D(2) = 3. D(1) = max(−10 − 3, −7 − 0) = −7. D(0) = max(5 − (−7), −5 − 3, −2) = 12: take the 5, and the second player must take the −10.',
    },
    {
      know: 'D is the lead of the player to move, whoever that is.',
      ask: 'Why is the opponent’s D subtracted, not added?',
      options: [
        { text: 'D(i + t) is the opponent’s lead over us, so it lowers our lead', right: true, why: 'A lead for them is the same amount behind for us.' },
        { text: 'Because the stones can be negative', why: 'The sign of the stones doesn’t matter; it is whose lead D measures.' },
        { text: 'It should be added; subtracting is a shortcut', why: 'Adding would count the opponent’s stones as ours.' },
      ],
    },
    {
      know: 'Each position reads at most three later positions.',
      ask: 'About how much work does it take for n stones?',
      options: [
        { text: 'About n steps', right: true, why: 'n positions, at most three moves each.' },
        { text: 'About 3ⁿ steps', why: 'That is the game tree; the table solves each position once.' },
        { text: 'About n² steps', why: 'Each position reads three others, not all later ones.' },
      ],
    },
  ],

  'interval-games': [
    {
      know: 'D(l, r) = max(a[l] − D(l + 1, r), a[r − 1] − D(l, r − 1)), with D(l, l) = 0.',
      ask: 'Row 3, 9, 1, 2. What is the first player’s total minus the second’s, with best play?',
      args: [[3, 9, 1, 2]], answer: 7,
      misconceptions: [{ answer: -5, feedback: '−5 is greedy play, taking the larger end: 3, then the second player gets the 9. Taking the 2 first keeps the 9 covered.' }],
      explain: 'Take the 2. Either end the second player takes then (3 or 1) uncovers the 9 for the first player. 2 + 9 − (3 + 1) = 7.',
    },
    {
      know: 'What is left after any number of moves is one piece of the original row.',
      ask: 'How many different pieces can there be in a row of n numbers?',
      options: [
        { text: 'About n² / 2', right: true, why: 'A piece is fixed by its two ends, l and r.' },
        { text: '2ⁿ, one per subset of numbers', why: 'Only the two ends are ever taken, so what is left is always one piece, not any subset.' },
        { text: 'n', why: 'Pieces of the same length can start in different places.' },
      ],
    },
    {
      know: 'Taking the larger end is a tempting rule.',
      ask: 'Why does greedy play fail here?',
      options: [
        { text: 'Taking an end can uncover a large number for the opponent', right: true, why: 'The value of a move is what it scores minus what it gives away; D counts both.' },
        { text: 'It doesn’t: the larger end is always best', why: 'In 1, 5, 233, 7 the larger end, 7, uncovers the 233.' },
        { text: 'Because the numbers can repeat', why: 'Repeats don’t matter; uncovering numbers does.' },
      ],
    },
  ],

  'grundy': [
    {
      know: 'g(n) is the mex of g(left) ⊕ g(right) over every move on a row of n pins.',
      ask: 'What is the Grundy value of a row of 5 pins?',
      args: [5], answer: 4,
      misconceptions: [{ answer: 0, feedback: 'Knocking the middle pin leaves rows of 2 and 2, worth 0, so 0 is reached; the moves reach 0, 1, 2 and 3, and the mex is 4.' }],
      explain: 'With g = 0, 1, 2, 3, 1 for 0 … 4 pins, the moves reach 1, 2, 3 and 0 (2 ⊕ 2, 1 ⊕ 1), so the mex is 4.',
    },
    {
      know: 'A row of n pins is lost for the player to move exactly when g(n) = 0.',
      ask: 'Why compute g(n) instead of just win or lose?',
      options: [
        { text: 'Moves split rows, and only Grundy values combine: two rows are worth their XOR', right: true, why: 'Win and lose don’t combine: two winning rows can make a losing position.' },
        { text: 'Win or lose would give a different answer for one row', why: 'For one row, g(n) = 0 exactly when it loses; the extra values are needed for split rows.' },
        { text: 'Because Kayles has no losing rows', why: 'Rows with value 0 lose for the player to move; g is 0 for n = 0, for example.' },
      ],
    },
    {
      know: 'A row of n pins has about 2n moves, each looked up in the table.',
      ask: 'About how much work does the table take up to n pins?',
      options: [
        { text: 'About n² steps', right: true, why: 'n rows, each with about 2n moves.' },
        { text: 'About 2ⁿ steps', why: 'That is listing sets of standing pins; the XOR rule avoids it.' },
        { text: 'About n steps', why: 'Each row has about 2n moves, not one.' },
      ],
    },
  ],

  'game-sums': [
    {
      know: 'A move on pile p wins when it brings g(p) to G ⊕ g(p), where G is the XOR of all the piles’ values.',
      ask: 'Moves remove 1 or 2 stones; piles of 1, 2 and 4. How many first moves win?',
      args: [[1, 2], [1, 2, 4]], answer: 1,
      misconceptions: [{ answer: 0, feedback: 'G = 1 ⊕ 2 ⊕ 1 = 2 is not 0, so a winning move exists: take both stones from the pile of 2.' }],
      explain: 'g(x) = x mod 3: values 1, 2, 1, so G = 2. Only the pile of 2 can reach G ⊕ 2 = 0, by removing 2. One winning move.',
    },
    {
      know: 'The XOR of the piles’ values is 0 exactly when the player to move loses.',
      ask: 'Why does a move from G = 0 always give G ≠ 0?',
      options: [
        { text: 'A move changes one pile’s value, and changing one XOR term changes the XOR', right: true, why: 'A move never keeps a pile’s value (the mex is never reached by a move), so G changes from 0.' },
        { text: 'Because every move removes stones', why: 'Removing stones can keep or change many things; it is the value of the pile that must change.' },
        { text: 'It doesn’t: a move can keep G at 0', why: 'No move reaches the same Grundy value, so G can’t stay 0.' },
      ],
    },
    {
      know: 'One Grundy table up to the largest pile serves every pile.',
      ask: 'About how much work does it take for P piles of up to X stones and k moves?',
      options: [
        { text: 'About (X + P) · k steps', right: true, why: 'X table entries with k moves each, then k tests per pile.' },
        { text: 'About X^P steps', why: 'That is searching combinations of pile sizes; the XOR rule avoids it.' },
        { text: 'About P · X · k steps', why: 'The table is shared by all the piles, not rebuilt for each.' },
      ],
    },
  ],

  'stochastic-games': [
    {
      know: 'V(a, b) = max(step, roll); a move to a′ is worth 1 − V(b, a′), or 1 at n; a roll averages the faces.',
      ask: 'Race to 3 with a 2-sided die. What is the first player’s chance of winning with best play? Type a fraction.',
      args: [3, 2], answer: 13 / 16,
      misconceptions: [{ answer: 0.5, feedback: 'Moving first is an advantage: the first player is always a move ahead.' }],
      explain: 'Filling V from the far squares back, V(0, 0) = max(step 1 − V(0, 1), roll (1 − V(0, 1) + 1 − V(0, 2))/2) = max(5/8, 13/16) = 13/16: roll.',
    },
    {
      know: 'A chance node is not anyone’s choice: the die decides it.',
      ask: 'Why is a roll averaged, while step-or-roll is maximised?',
      options: [
        { text: 'The player chooses step or roll, but nobody chooses the face', right: true, why: 'Choices are optimised; chance outcomes are weighted by their probabilities.' },
        { text: 'Because the opponent chooses the face', why: 'The die is fair and nobody controls it; the opponent’s choices come at their own turn.' },
        { text: 'Maximising the face would give the same answer', why: 'It would let the player pick the best face, which a die doesn’t allow.' },
      ],
    },
    {
      know: 'V(a, b) is the mover’s chance; after a move the other player is the mover.',
      ask: 'Why is a move worth 1 − V(b, a′)?',
      options: [
        { text: 'V(b, a′) is the opponent’s chance as the new mover, and one of the two wins', right: true, why: 'There are no draws, so our chance is one minus theirs.' },
        { text: 'Because the die has two faces', why: 'It holds for any die: it comes from the turn passing to the opponent.' },
        { text: 'It should be V(b, a′)', why: 'V(b, a′) is the chance of the player on b, the opponent, not ours.' },
      ],
    },
  ],

  'transpositions': [
    {
      know: 'Minimax over boards, X maximising and O minimising, with each board’s value stored once found.',
      ask: 'A 3 × 3 board: X has the top-left corner and O the top-middle square; X is to move. What is the value: 1, 0 or −1?',
      args: [['XO.', '...', '...'], 3], answer: 1,
      misconceptions: [{ answer: 0, feedback: 'Tic-tac-toe is a draw with best play, but this O move is not best: X can force a win.' }],
      explain: 'X takes the centre, threatening the diagonal; O must block, and X then makes two threats at once. X wins: 1.',
    },
    {
      know: 'An alpha-beta search stops looking at a position’s moves once one is good enough to cut off.',
      ask: 'A cutoff stored “at least 7” for a board. Can a later search use 7 as the board’s exact value?',
      options: [
        { text: 'No: it proves only a lower bound, and the true value may be higher', right: true, why: 'The moves that were not searched may be better; only a full search gives the exact value.' },
        { text: 'Yes: the value found is the value', why: 'The search stopped early; 7 is the best of the moves it looked at, not of all moves.' },
        { text: 'Yes, if the board is the same', why: 'The board being the same is needed, but the stored entry is still only a bound.' },
      ],
    },
    {
      know: 'A table key must hold everything that decides a position’s future.',
      ask: 'Why can the key here leave out whose turn it is?',
      options: [
        { text: 'The counts of X and O on the board decide whose turn it is', right: true, why: 'X is to move when the counts are equal, so the board alone says it.' },
        { text: 'Because the turn never matters in minimax', why: 'It matters a great deal: X maximises and O minimises.' },
        { text: 'Because the table stores only finished boards', why: 'It stores every board searched, finished or not.' },
      ],
    },
  ],
}
