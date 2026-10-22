// Bug hunts for the game lessons (Specialist, games group). Format: bug-hunts.js. Each symptom is the
// smallest input a search found where the buggy code and specialist-oracles.js disagree; each is also a
// case of its lesson's challenge.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const GAME_HUNTS = {
  'win-lose': {
    know: 'A square is winning when some move reaches a square that is losing for the opponent, and losing when every move reaches a winning one. A square with no move at all is losing.',
    swap: pair(['                if y >= 0 and x >= 0 and not grid[y][x] and not win[y][x]:', '                if y >= 0 and x >= 0 and not grid[y][x] and win[y][x]:'], ['        if (y >= 0 && x >= 0 && !grid[y][x] && !win[y][x]) {', '        if (y >= 0 && x >= 0 && !grid[y][x] && win[y][x]) {']),
    symptom: { args: [[[0, 0]]], expected: 1, buggy: 0 },
    bug: 'A move to a winning square counts as a win',
    why: 'The test is turned round: a square is marked winning when it can move to a square that wins for the opponent. On a board of two squares, the right one can move left onto a square with no move, and wins; but the left square is losing, so the move never counts: {call} returned {got} instead of {want}.',
    fix: 'Win by moving to a losing square: and not win[y][x].',
    clues: ['On the board [0, 0], who wins from each square?', 'After the move, whose turn is it, and on which square?', 'What should be true of the square a winning move reaches?'],
    decoys: [[['win = [[False] * w for _ in range(h)]', 'const win = Array.from({ length: h }, () => new Array(w).fill(false))'], 'A square starts as losing; one with no move stays that way. Right.'], [['for dr, dc in ((-1, 0), (0, -1), (-1, -1)):', 'for (const [dr, dc] of [[-1, 0], [0, -1], [-1, -1]]) {'], 'Up, left and diagonally up-left. Right.'], [['count += 1', 'count++'], 'Count the winning squares. Right.']],
  },

  'subtraction-games': {
    know: 'Pile i’s outcome is decided by piles i − s for the moves s, all within the last m outcomes (m the largest move). Only when those m outcomes repeat must everything after them repeat.',
    swap: pair(['            window = tuple(lose[i - m:])', '            window = tuple(lose[i - m + 1:])'], ["      const window = lose.slice(i - m).map(Number).join('')", "      const window = lose.slice(i - m + 1).map(Number).join('')"]),
    symptom: { args: [[1], 2], expected: 2, buggy: 1 },
    bug: 'The window is one outcome short',
    why: 'With the move 1, m = 1 and the window should hold the one outcome before pile i. One shorter, it is empty, so it “repeats” at the very next pile, and pile 1 alone is taken as the period: every pile from 1 on would win. Piles 0 and 2 lose and pile 1 wins, but {call} returned {got} instead of {want}.',
    fix: 'Keep all m outcomes in the window: lose[i - m:].',
    clues: ['With the move 1 only, which piles lose?', 'How many outcomes does the next one depend on?', 'How long is the window, and when does it first repeat?'],
    decoys: [[['m = max(moves)', 'const m = Math.max(...moves)'], 'No move reaches back further than m. Right.'], [['if window in seen:', 'if (seen.has(window)) {'], 'A repeated window means a period. Right.'], [['lose.append(all(s > i or not lose[i - s] for s in moves))', 'lose.push(moves.every(s => s > i || !lose[i - s]))'], 'A pile loses when every move that fits leaves a winning pile. Right.']],
  },

  'score-difference': {
    know: 'D(i) is the lead of the player to move. After taking stones worth take, the other player is to move, and their lead D(i + t) is a lead over us: it counts against us.',
    swap: pair(['            lead = take - D[i + t]', '            lead = take + D[i + t]'], ['      const lead = take - D[i + t]', '      const lead = take + D[i + t]']),
    symptom: { args: [[0, -1]], expected: 1, buggy: -1 },
    bug: 'The opponent’s lead is added',
    why: 'Adding D(i + t) treats the other player’s lead as ours. With stones 0 and −1, taking both scores −1, but taking the 0 alone leaves the −1 to the other player, a lead of 1 for us. {call} returned {got} instead of {want}.',
    fix: 'Subtract the other player’s lead: lead = take - D[i + t].',
    clues: ['Stones [0, −1]: what are the first player’s two sensible moves?', 'After taking the 0, what is the other player’s lead?', 'Is that lead good or bad for the first player?'],
    decoys: [[['D = [0] * (n + 1)', 'D = new Array(n + 1).fill(0)'], 'No stones left, no lead. Right.'], [['take += a[i + t - 1]', 'take += a[i + t - 1]'], 'Taking t stones scores their sum. Right.'], [['if best is None or lead > best:', 'if (best === null || lead > best) best = lead'], 'The best lead, starting from none. Right.']],
  },

  'interval-games': {
    know: 'Taking the left end of a[l:r] leaves a[l + 1:r]; taking the right end leaves a[l:r − 1]. Each term subtracts the other player’s lead on the piece that is left.',
    swap: pair(['            D[l][r] = max(a[l] - D[l + 1][r], a[r - 1] - D[l][r - 1])', '            D[l][r] = max(a[l] - D[l + 1][r], a[r - 1] - D[l + 1][r])'], ['      D[l][r] = Math.max(a[l] - D[l + 1][r], a[r - 1] - D[l][r - 1])', '      D[l][r] = Math.max(a[l] - D[l + 1][r], a[r - 1] - D[l + 1][r])']),
    symptom: { args: [[0, 1]], expected: 1, buggy: 0 },
    bug: 'The right end leaves the wrong piece',
    why: 'Taking the right end subtracts the lead on a[l + 1:r], the piece left by taking the left end, which still contains the number just taken. With [0, 1], taking the 1 leaves the 0, a lead of 1, but the code subtracts the lead on [1] and gets 0: {call} returned {got} instead of {want}.',
    fix: 'After taking a[r − 1] the piece a[l:r − 1] is left: subtract D[l][r - 1].',
    clues: ['Row [0, 1]: which end should the first player take?', 'What is left after taking the right end?', 'Which cell does the right-end term read?'],
    decoys: [[['for length in range(1, n + 1):', 'for (let length = 1; length <= n; length++) {'], 'Shorter pieces first. Right.'], [['r = l + length', 'const r = l + length'], 'The piece runs from l up to, not including, r. Right.'], [['return D[0][n]', 'return D[0][n]'], 'The whole row. Right.']],
  },

  'grundy': {
    know: 'A move that splits a row leaves two separate rows, a sum of two games. The value of a sum is the XOR of the parts’ values, not their ordinary sum.',
    swap: pair(['                seen.add(g[left] ^ g[size - take - left])', '                seen.add(g[left] + g[size - take - left])'], ['      for (let left = 0; left + take <= size; left++) seen.add(g[left] ^ g[size - take - left])', '      for (let left = 0; left + take <= size; left++) seen.add(g[left] + g[size - take - left])']),
    symptom: { args: [3], expected: 3, buggy: 0 },
    bug: 'Two rows’ values are added, not XORed',
    why: 'Knocking down the middle pin of three leaves two single pins, worth 1 each. Together they are a lost position (the opponent copies every move), value 1 ⊕ 1 = 0, but 1 + 1 = 2. The move to 0 is missed: {call} returned {got} instead of {want}.',
    fix: 'Combine the two rows with XOR: g[left] ^ g[size - take - left].',
    clues: ['Three pins: what does knocking down the middle one leave?', 'Two single pins: who wins with the move?', 'What value does the code give that position?'],
    decoys: [[['g = [0] * (n + 1)', 'const g = new Array(n + 1).fill(0)'], 'No pins: no move, value 0. Right.'], [['for take in (1, 2):', 'for (const take of [1, 2]) {'], 'One pin or two neighbouring pins. Right.'], [['while mex in seen:', 'while (seen.has(mex)) mex++'], 'The smallest value no move reaches. Right.']],
  },

  'game-sums': {
    know: 'A winning move leaves the XOR of all the piles’ values at 0. Changing pile p alone, it must change g(p) to (the XOR of all values) ⊕ g(p), not to 0.',
    swap: pair(['        want = total ^ g[p]', '        want = 0'], ['    const want = total ^ g[p]', '    const want = 0']),
    symptom: { args: [[1], [1, 1]], expected: 0, buggy: 2 },
    bug: 'A winning move must make one pile 0',
    why: 'Reducing one pile to value 0 leaves the other piles’ XOR, which need not be 0. Two piles of one stone are lost for the player to move: either move leaves one stone, which the opponent takes. Yet both moves make a pile 0: {call} returned {got} instead of {want}.',
    fix: 'Aim for the value that makes the total XOR 0: want = total ^ g[p].',
    clues: ['Two piles of 1, moves {1}: who wins?', 'After a move, what is the XOR of the piles’ values?', 'What should the pile being changed be worth after the move?'],
    decoys: [[['while mex in seen:', 'while (seen.has(mex)) mex++'], 'Each pile size’s Grundy value is a mex. Right.'], [['total ^= g[p]', 'for (const p of piles) total ^= g[p]'], 'The position’s value is the XOR. Right.'], [['if s <= p and g[p - s] == want:', 'if (s <= p && g[p - s] === want) count++'], 'A move that fits and reaches the wanted value. Right.']],
  },

  'stochastic-games': {
    know: 'At the player’s own turn the player chooses, so V is the larger of “step” and “roll”. The opponent’s choices are already inside V(b, …), seen from the opponent’s side.',
    swap: pair(['            V[a][b] = max(step, roll)', '            V[a][b] = min(step, roll)'], ['      V[a][b] = step[0] * roll[1] >= roll[0] * step[1] ? step : roll', '      V[a][b] = step[0] * roll[1] >= roll[0] * step[1] ? roll : step']),
    symptom: { args: [2, 2], expected: '3/4', buggy: '1/1' },
    bug: 'The player to move takes the worse choice',
    why: 'Taking the minimum treats the player’s own choice as the opponent’s. Each player then plays as badly as possible, which changes who wins: the race to 2 with a 2-sided die is won by the first player with chance 3/4 under best play, but {call} returned {got} instead of {want}.',
    fix: 'The player to move takes the better choice: max(step, roll).',
    clues: ['Race to 2 with a 2-sided die: what should the first player do?', 'Whose chance is V[a][b], and who chooses at that turn?', 'Where are the opponent’s choices taken into account?'],
    decoys: [[['step = 1 if a + 1 >= n else 1 - V[b][a + 1]', 'const step = a + 1 >= n ? F(1n) : lose(V[b][a + 1])'], 'Step: win at n, or hand the turn over. Right.'], [['for total in range(2 * n - 2, -1, -1):', 'for (let total = 2 * n - 2; total >= 0; total--) {'], 'Positions further along first. Right.'], [['V = [[Fraction(0)] * n for _ in range(n)]', 'const V = Array.from({ length: n }, () => new Array(n).fill(F(0n)))'], 'One chance per pair of squares. Right.']],
  },

  'transpositions': {
    know: 'A transposition table may reuse a value only for a position that has the same future. Two boards with the same filled squares but different owners have different futures.',
    swap: pair(['        key = state', '        key = state.replace("O", "X")'], ['    const key = state', "    const key = state.replaceAll('O', 'X')"]),
    symptom: { args: [['...'], 2], expected: 1, buggy: 0 },
    bug: 'The key forgets whose marks are whose',
    why: 'Keyed by which squares are filled, a board where O holds a square shares its entry with the board where X holds it, so a value is reused for a position with a different future. On a 1 × 3 board with 2 in a row, X takes the middle and wins next turn, but {call} returned {got} instead of {want}.',
    fix: 'Key the table by the whole board: key = state.',
    clues: ['1 × 3, two in a row: what is X’s best first move?', 'Which boards get the same key?', 'Do those boards have the same value?'],
    decoys: [[['memo = {}', 'const memo = new Map()'], 'One table for the whole search. Right.'], [['result = 0', 'result = 0'], 'A full board with no line is a draw. Right.'], [['mover = "X" if state.count("X") == state.count("O") else "O"', "const mover = xs === os ? 'X' : 'O'"], 'X moves when the counts are equal. Right.']],
  },
}
