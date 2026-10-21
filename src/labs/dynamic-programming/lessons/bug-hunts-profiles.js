// Bug hunts for the profile and decomposition lessons (Specialist, profiles group). Format: bug-hunts.js.
// Each symptom is the smallest input a search found where the buggy code and specialist-oracles.js
// disagree. nice-tree-decomp's bug passed its challenge, so its symptom became a case.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const PROFILE_HUNTS = {
  'broken-profile': {
    know: 'Bit r of the mask says whether row r’s next cell is already covered. When the scan reaches a covered cell, nothing is placed there, and its bit must be cleared: the cell after it, in the next column, is not covered by that domino.',
    swap: pair(['                    nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M', '                    nxt[mask] = (nxt[mask] + n) % M'], ['        if (mask & bit) { nxt[mask ^ bit] = (nxt[mask ^ bit] + n) % M; continue }', '        if (mask & bit) { nxt[mask] = (nxt[mask] + n) % M; continue }']),
    symptom: { args: [2, 1], expected: 1, buggy: 0 },
    bug: 'A covered cell keeps its bit',
    why: 'A cell already covered passes its mask on unchanged, so its bit stays set and the next column’s cell in that row looks covered too. The one vertical domino leaves a bit set at the end, so the empty mask is never reached: {call} returned {got} instead of {want}.',
    fix: 'Clear the bit of a covered cell before moving on: nxt[mask ^ bit] += n.',
    clues: ['A 2 × 1 board has one tiling, a vertical domino. Which bits does it set?', 'After the second cell, which mask should the tiling have?', 'What happens to a covered cell’s bit?'],
    decoys: [[['if c + 1 < w:', 'if (c + 1 < w)'], 'A domino to the right only where a next column exists. Right.'], [['if r + 1 < h and not mask & (bit << 1):', 'if (r + 1 < h && !(mask & (bit << 1)))'], 'A domino downwards needs a free cell below. Right.'], [['return ways[0]', 'return ways[0]'], 'Nothing may stick out past the last column. Right.']],
  },

  'domino-tiling': {
    know: 'The scan fills a column’s first free cell (r, c). Every piece that can cover it must be tried: its other cells lie lower in this column or anywhere in the next one. One L-tromino covers (r, c) and reaches up to (r − 1, c + 1) in the next column.',
    swap: pair(['              [(0, 0), (0, 1), (1, 1)], [(0, 0), (-1, 1), (0, 1)]]', '              [(0, 0), (0, 1), (1, 1)]]'], ['    [[0, 0], [0, 1], [1, 1]], [[0, 0], [-1, 1], [0, 1]]]', '    [[0, 0], [0, 1], [1, 1]]]']),
    symptom: { args: [2, 3], expected: 5, buggy: 4 },
    bug: 'The tromino that reaches upwards is missing',
    why: 'Only five ways to cover the first free cell are tried. The L-tromino whose next-column cells are the cell’s own row and the row above is never placed, so every tiling that needs it is lost: {call} returned {got} instead of {want}.',
    fix: 'Add the sixth piece, [(0, 0), (-1, 1), (0, 1)]: the cell, the cell to its right, and the one above that.',
    clues: ['Draw the five tilings of a 2 × 3 board. Which pieces cover the bottom-left cell when the top-left one is already covered?', 'List the cells of each piece in the list relative to the free cell.', 'Can a piece covering (r, c) also cover a cell in row r − 1?'],
    decoys: [[['if cur >> r & 1:', 'if ((cur >> r) & 1)'], 'A covered cell is skipped. Right.'], [['if not 0 <= r + dr < h:', 'if (r + dr < 0 || r + dr >= h)'], 'Pieces must stay on the board. Right.'], [['nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M', 'nxt[t] = (nxt[t] + T[s][t] * ways[s]) % M'], 'Each column multiplies by T. Right.']],
  },

  'profile-obstacles': {
    know: 'A blocked cell is full already, so nothing is placed on it, but its bit says something else: whether the next cell of its row, in the next column, is covered. Blocking this cell covers nothing there, so the mask passes on unchanged.',
    swap: pair(['                        nxt[mask] = (nxt[mask] + n) % M', '                        nxt[mask | bit] = (nxt[mask | bit] + n) % M'], ['          if (!(mask & bit)) nxt[mask] = (nxt[mask] + n) % M', '          if (!(mask & bit)) nxt[mask | bit] = (nxt[mask | bit] + n) % M']),
    symptom: { args: [[[0, 1], [0, 1]]], expected: 1, buggy: 0 },
    bug: 'A blocked cell marks the next cell covered',
    why: 'Treating the blocked cell as occupied sets its bit, which means “the next cell of this row is covered”. In the last column that is a cell off the board, so the mask is never empty at the end: {call} returned {got} instead of {want}.',
    fix: 'Pass the mask on unchanged at a blocked cell: nxt[mask] += n, with the bit left clear.',
    clues: ['The board 01; 01 has one tiling. Where is the domino?', 'What does bit r mean at the moment a cell is processed, and what does it mean afterwards?', 'After the blocked cells, which mask should the tiling have?'],
    decoys: [[['if c + 1 < w and not grid[r][c + 1]:', 'if (c + 1 < w && !grid[r][c + 1])'], 'No domino to the right onto a blocked cell. Right, though the blocked cell would also reject it.'], [['if mask & bit:', 'if (mask & bit) {'], 'A free cell covered from the left: clear its bit. Right.'], [['return ways[0]', 'return ways[0]'], 'Nothing may stick out past the last column. Right.']],
  },

  'plug-dp': {
    know: 'At cell (r, c), bit c is the line coming in from the left and bit c + 1 the line coming down from above. The cell writes its line down into bit c, so after a row, column c’s downward line sits at bit c. The next row reads it at bit c + 1, which is why every mask is shifted one place at the end of a row.',
    swap: pair(['        ways = {mask << 1: n for mask, n in ways.items()}', '        ways = {mask: n for mask, n in ways.items()}'], ['    ways = new Map([...ways].map(([mask, n]) => [mask << 1, n]))', '    ways = new Map([...ways].map(([mask, n]) => [mask, n]))']),
    symptom: { args: [[[0, 0], [0, 0]]], expected: 1, buggy: 0 },
    bug: 'The plugs are not shifted at the end of a row',
    why: 'Without the shift, the line going down from column c is read in the next row as the line coming in from the left of column c, and the line from column c − 1 as the line from above. Every line lands one column off: {call} returned {got} instead of {want}.',
    fix: 'Shift every mask one place at the end of a row: ways = {mask << 1: n for …}, so bit c + 1 is the line from above column c again.',
    clues: ['The 2 × 2 square has one loop. Which lines go down from the first row?', 'At the start of the second row, which bit holds the line going down from column 0?', 'Which bit does cell (1, 0) read as its line from above?'],
    decoys: [[['rest = mask & ~(3 << c)', 'rest = mask & ~(3 << c)'], 'Both of the cell’s plugs are cleared before its outgoing ones are written. Right.'], [['if left and up:', 'if (left && up) outs.push(rest)'], 'Two lines in: nothing goes out. Right.'], [['elif down_ok and right_ok:', '} else if (downOk && rightOk)'], 'A corner needs room both down and right. Right.']],
  },

  'hamiltonian-grid': {
    know: 'When the two plugs reaching a cell have the same label, they are the two ends of one path, and joining them closes it into a loop. That loop is the answer only if it is closed at the last free cell, with no other path open; anywhere earlier, cells are left outside it.',
    swap: pair(['                        if (r, c) == last and not any(others):', '                        if not any(others):'], ['            if (r * w + c === last && !others.some(x => x)) total += n', '            if (!others.some(x => x)) total += n']),
    symptom: { args: [[[0, 0, 1], [0, 0, 0]]], expected: 0, buggy: 1 },
    bug: 'A loop may close before the last cell',
    why: 'A loop is counted whenever it closes with no other path open, even if free cells are still to come. The 2 × 2 square closes at its fourth cell and is counted, though the cell at the end of the bottom row is never visited: {call} returned {got} instead of {want}.',
    fix: 'Count a closing only at the last free cell: if (r, c) == last and no other plug is open.',
    clues: ['Can any single loop visit all five free cells of 001; 000?', 'Which loop does the code count, and where does it close?', 'What else must be true when a loop closes?'],
    decoys: [[['def canon(labels):', 'const canon = labels => {'], 'Renaming labels changes no count, only merges equal states. Right.'], [['s = [left if x == up else x for x in state]', 'const s = state.map(x => (x === up ? left : x))'], 'Joining two paths relabels the far end. Right.'], [['s[c] = s[c + 1] = w + 2', 's[c] = s[c + 1] = w + 2'], 'A new path with a fresh label. Right.']],
  },

  'connectivity-canonical': {
    know: 'Leaving a cell out removes the cell above from the frontier. If no other frontier cell shares its label, that piece can never grow: the set is finished if it was the only piece, impossible otherwise. The test must look at the frontier after the cell above has left it.',
    swap: pair(['                if up and up not in s:', '                if up and up not in state:'], ['        if (up && !s.includes(up)) {', '        if (up && !state.includes(up)) {']),
    symptom: { args: [[[0], [0]]], expected: 3, buggy: 2 },
    bug: 'The old frontier still holds the piece',
    why: 'The test looks for up in the frontier before the cell above was removed, where it always is. So a piece that leaves is never noticed: the top cell alone is never counted as a finished set, and pieces cut off for good are not dropped: {call} returned {got} instead of {want}.',
    fix: 'Test the new frontier, after s[c] = 0: if up and up not in s.',
    clues: ['A column of two cells has three connected sets. Which one is missing?', 'When the bottom cell is left out, where is the top cell’s label still found?', 'Which list has already lost the cell above, state or s?'],
    decoys: [[['if not any(s):', 'if (!s.some(x => x)) done = (done + n) % M'], 'A finished piece counts only if no other piece is open. Right.'], [['if left and up and left != up:', 'if (left && up && left !== up)'], 'Taking the cell joins its neighbours’ pieces. Right.'], [['s[c] = left or up or w + 1', 's[c] = left || up || w + 1'], 'A chosen cell takes its neighbours’ label. Right.']],
  },

  'treewidth': {
    know: 'A vertex can sit in several bags. best[b][S] counts the weight of S, the chosen vertices of bag b, so when a child’s best value is added, the child’s chosen vertices that are also in b have been counted twice, and their weight is taken off once.',
    swap: pair(['                        gain = v2 - sum(weights[v] for v in picked if v in bag)', '                        gain = v2'], ['            const gain = v2 - picked.filter(v => bag.includes(v)).reduce((t, v) => t + weights[v], 0)', '            const gain = v2']),
    symptom: { args: [[1], [], [[0], [0]], [[0, 1]]], expected: 1, buggy: 2 },
    bug: 'Shared vertices counted twice',
    why: 'The child’s value already includes the weight of the vertices it shares with its parent, and the parent counts them again in S. One vertex in two bags is worth double: {call} returned {got} instead of {want}.',
    fix: 'Subtract the shared vertices’ weight from the child’s value: gain = v2 − (weight of picked ∩ bag).',
    clues: ['One vertex of weight 1, in two bags. What is the answer?', 'Which bags count that vertex’s weight?', 'What should a child add for a vertex its parent already holds?'],
    decoys: [[['if any((u, v) in adj for u in chosen for v in chosen):', "if (chosen.some(u => chosen.some(v => adj.has(u + ',' + v)))) continue"], 'S may have no edge inside it. Right.'], [['value = sum(weights[v] for v in chosen)', 'let value = chosen.reduce((t, v) => t + weights[v], 0)'], 'The weight of S, counted once here. Right.'], [['if all((v in picked) == (v in chosen) for v in bags[ch] if v in bag):', 'if (bags[ch].every(v => !bag.includes(v) || picked.includes(v) === chosen.includes(v)))'], 'The child agrees with S on their shared vertices. Right.']],
  },

  'pathwidth': {
    know: 'Moving to the next bag forgets the vertices that leave. Colourings that differed only on those vertices now agree on everything still in view, so they become one state, and its count is the sum of theirs: each of those ways is still a different colouring.',
    swap: pair(['            merged[key] = (merged.get(key, 0) + count) % M', '            merged[key] = count'], ['      merged.set(key, ((merged.get(key) ?? 0) + count) % M)', '      merged.set(key, count)']),
    symptom: { args: [2, [], [[0], [1]]], expected: 4, buggy: 2 },
    bug: 'Forgetting overwrites instead of adding',
    why: 'When two colourings of the old bag look the same after forgetting, the second replaces the first instead of adding to it. Vertex 0’s two colours become one: {call} returned {got} instead of {want}.',
    fix: 'Add the counts of colourings that merge: merged[key] = merged.get(key, 0) + count.',
    clues: ['Two separate vertices and two colours: how many colourings?', 'Moving to the bag [1], vertex 0 is forgotten. How many old colourings share the empty key?', 'What should their merged count be?'],
    decoys: [[['kept = [v for v in bag if v in prev]', 'const kept = bag.filter(v => prev.includes(v))'], 'Vertices in both bags keep their colour. Right.'], [['inside = [(u, v) for u, v in edges if u in bag and v in bag]', 'const inside = edges.filter(([u, v]) => bag.includes(u) && bag.includes(v))'], 'The edges this bag can check. Right.'], [['prev = bag', 'prev = bag'], 'The next bag is compared with this one. Right.']],
  },

  'nice-tree-decomp': {
    know: 'At a join, the two children cover different parts of the graph below the same bag. A bag vertex outside D is dominated if a chosen neighbour was found on either side, because its neighbours below the join lie in one side or the other.',
    swap: pair(['                        t = tuple(IN if x == IN else SEEN if SEEN in (x, y) else NEED for x, y in pairs)', '                        t = tuple(IN if x == IN else SEEN if x == SEEN and y == SEEN else NEED for x, y in pairs)'], ['            add(pairs.map(([x, y]) => (x === IN ? IN : x === SEEN || y === SEEN ? SEEN : NEED)), mul(ca, cb))', '            add(pairs.map(([x, y]) => (x === IN ? IN : x === SEEN && y === SEEN ? SEEN : NEED)), mul(ca, cb))']),
    symptom: { args: [2, [[0, 1]], [['leaf'], ['introduce', 0, 0], ['introduce', 1, 1], ['forget', 2, 1], ['leaf'], ['introduce', 4, 0], ['join', 3, 5], ['forget', 6, 0]]], expected: 3, buggy: 2 },
    bug: 'A join needs both sides to dominate',
    why: 'A vertex is marked dominated only if both children dominated it. Vertex 0’s neighbour 1 is in one branch only, so with D = {1} the other branch says “not yet”, and the set is dropped when 0 is forgotten: {call} returned {got} instead of {want}.',
    fix: 'A vertex is dominated if either side dominated it: SEEN if SEEN in (x, y).',
    clues: ['The edge 0 – 1 has three dominating sets. Which one is lost?', 'In which branch of the join is vertex 1?', 'With D = {1}, what does the other branch say about vertex 0?'],
    decoys: [[['mark = SEEN if any(states[i] == IN for i in near) else NEED', 'const mark = near.some(i => states[i] === IN) ? SEEN : NEED'], 'A new vertex outside D is covered by a chosen neighbour in the bag. Right.'], [['if states[i] != NEED:', 'if (states[i] !== NEED)'], 'A forgotten vertex must already be covered. Right.'], [['if all((x == IN) == (y == IN) for x, y in pairs):', 'if (pairs.every(([x, y]) => (x === IN) === (y === IN))) {'], 'Both sides agree on which bag vertices are in D. Right.']],
  },
}
