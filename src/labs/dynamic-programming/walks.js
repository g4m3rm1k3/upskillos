// "Walk back the answer": on a finished live table, which choice made each cell. Starting at the answer,
// each step names the choice that produced the cell's value and moves to the cell it came from, until a
// base case. The choices, read forwards, are the actual solution: the subsequence, the items, the path.
//
// WALKS[id] = { result, join?, forwards?, total?, back(trace, at) }. forwards: the pieces are already in
// reading order (a walk from the top of a triangle down). total(trace): what the gains add up to, when that
// is not the answer cell's value. back returns every option that produces the value at
// `at` (several when there is a tie), each { from, says, gain, adds? }:
//   from   the cell the value came from, or null when the walk ends here
//   says   the choice, in words
//   gain   what this step adds to the objective (walk.test.js checks the gains add up to the answer)
//   adds   a piece of the solution (a letter, an item), collected backwards and shown forwards
// No options means the cell is where the walk stops. The options are worked out from the finished values,
// so they are right for any input the learner types.

// Two strings: rows are prefixes of a, columns prefixes of b.
const lcsBack = ({ table: t, args: [a, b] }, [i, j]) => {
  if (!i || !j) return []
  if (a[i - 1] === b[j - 1]) return [{ from: [i - 1, j - 1], says: `“${a[i - 1]}” = “${b[j - 1]}”: it is in the subsequence`, gain: 1, adds: a[i - 1] }]
  const v = t.get(i, j)
  return [
    ...(t.get(i - 1, j) === v ? [{ from: [i - 1, j], says: `drop a’s “${a[i - 1]}”: D(${i - 1},${j}) has the same length`, gain: 0 }] : []),
    ...(t.get(i, j - 1) === v ? [{ from: [i, j - 1], says: `drop b’s “${b[j - 1]}”: D(${i},${j - 1}) has the same length`, gain: 0 }] : []),
  ]
}

export const WALKS = {
  lcs: { result: 'A longest common subsequence', join: '', back: lcsBack },
  'lcs-reconstruct': {
    result: 'One longest common subsequence', join: '',
    total: ({ table: t, args: [a, b] }) => t.get(a.length, b.length),
    back: (trace, at) => (at[0] === trace.args[0].length + 1 ? [{ from: [trace.args[0].length, trace.args[1].length], says: 'start from the full length table’s last cell', gain: 0 }] : lcsBack(trace, at)),
  },
  'edit-distance': {
    result: 'The letters written, which spell the target', join: '',
    back: ({ table: t, args: [a, b] }, [i, j]) => {
      const v = t.get(i, j), out = []
      if (i && j && a[i - 1] === b[j - 1] && t.get(i - 1, j - 1) === v) out.push({ from: [i - 1, j - 1], says: `keep “${a[i - 1]}”: it already matches`, gain: 0, adds: b[j - 1] })
      if (i && j && a[i - 1] !== b[j - 1] && t.get(i - 1, j - 1) + 1 === v) out.push({ from: [i - 1, j - 1], says: `substitute “${a[i - 1]}” with “${b[j - 1]}”`, gain: 1, adds: b[j - 1] })
      if (i && t.get(i - 1, j) + 1 === v) out.push({ from: [i - 1, j], says: `delete “${a[i - 1]}”`, gain: 1, adds: '' })
      if (j && t.get(i, j - 1) + 1 === v) out.push({ from: [i, j - 1], says: `insert “${b[j - 1]}”`, gain: 1, adds: b[j - 1] })
      return out
    },
  },
  'shortest-supersequence': {
    result: 'A shortest common supersequence', join: '',
    back: ({ table: t, args: [a, b] }, [i, j]) => {
      if (!i && !j) return []
      if (i && j && a[i - 1] === b[j - 1]) return [{ from: [i - 1, j - 1], says: `write “${a[i - 1]}” once for both`, gain: 1, adds: a[i - 1] }]
      const v = t.get(i, j)
      return [
        ...(i && t.get(i - 1, j) + 1 === v ? [{ from: [i - 1, j], says: `write a’s “${a[i - 1]}”`, gain: 1, adds: a[i - 1] }] : []),
        ...(j && t.get(i, j - 1) + 1 === v ? [{ from: [i, j - 1], says: `write b’s “${b[j - 1]}”`, gain: 1, adds: b[j - 1] }] : []),
      ]
    },
  },
  'zero-one-knapsack': {
    result: 'Items packed', join: ', ',
    back: ({ table: t, args: [w, v] }, [i, c]) => {
      if (!i) return []
      const out = []
      if (t.get(i - 1, c) === t.get(i, c)) out.push({ from: [i - 1, c], says: `leave item ${i} out`, gain: 0 })
      if (w[i - 1] <= c && v[i - 1] + t.get(i - 1, c - w[i - 1]) === t.get(i, c)) out.push({ from: [i - 1, c - w[i - 1]], says: `pack item ${i} (weight ${w[i - 1]}, value ${v[i - 1]})`, gain: v[i - 1], adds: `item ${i}` })
      return out
    },
  },
  'unbounded-knapsack': {
    result: 'Items packed', join: ', ',
    back: ({ table: t, args: [w, v] }, [, c]) => {
      if (!c) return []
      const out = w.flatMap((x, k) => (x <= c && v[k] + t.get(0, c - x) === t.get(0, c) ? [{ from: [0, c - x], says: `pack item ${k + 1} (weight ${x}, value ${v[k]})`, gain: v[k], adds: `item ${k + 1}` }] : []))
      if (t.get(0, c - 1) === t.get(0, c)) out.push({ from: [0, c - 1], says: 'leave one unit of room unused', gain: 0 })
      return out
    },
  },
  'coin-min': {
    result: 'Coins used', join: ' + ',
    back: ({ table: t, args: [coins] }, [, x]) => (x && Number.isFinite(t.get(0, x))
      ? coins.filter(c => c <= x && t.get(0, x - c) + 1 === t.get(0, x)).map(c => ({ from: [0, x - c], says: `the last coin is ${c}`, gain: 1, adds: String(c) }))
      : []),
  },
  'rod-cutting': {
    result: 'Pieces cut', join: ' + ',
    back: ({ table: t, args: [prices] }, [, len]) => (len
      ? Array.from({ length: Math.min(len, prices.length) }, (_, k) => k + 1).filter(k => prices[k - 1] + t.get(0, len - k) === t.get(0, len)).map(k => ({ from: [0, len - k], says: `cut a piece of length ${k}, sold for ${prices[k - 1]}`, gain: prices[k - 1], adds: String(k) }))
      : []),
  },
  'house-robber': {
    result: 'Houses taken (by number)', join: ', ',
    back: ({ table: t, args: [a] }, [, i]) => {
      if (!i) return []
      const out = []
      if (t.get(0, i - 1) === t.get(0, i)) out.push({ from: [0, i - 1], says: `skip house ${i}`, gain: 0 })
      if (a[i - 1] + (i >= 2 ? t.get(0, i - 2) : 0) === t.get(0, i)) out.push({ from: i >= 2 ? [0, i - 2] : null, says: `take house ${i} (${a[i - 1]}), so house ${i - 1} is skipped`, gain: a[i - 1], adds: String(i) })
      return out
    },
  },
  'min-grid-path': {
    result: 'The path (row, column)', join: ' → ',
    back: ({ table: t, args: [g] }, [r, c]) => {
      if (!r && !c) return [{ from: null, says: `the start, paying ${g[0][0]}`, gain: g[0][0], adds: '(0,0)' }]
      const rest = t.get(r, c) - g[r][c]
      return [...(r ? [[r - 1, c, 'down']] : []), ...(c ? [[r, c - 1, 'right']] : [])].filter(([pr, pc]) => t.get(pr, pc) === rest)
        .map(([pr, pc, dir]) => ({ from: [pr, pc], says: `came ${dir} from (${pr},${pc}), paying ${g[r][c]} here`, gain: g[r][c], adds: `(${r},${c})` }))
    },
  },
  'triangle-path': {
    result: 'The numbers on the path, top to bottom', join: ' → ', forwards: true,
    back: ({ table: t, args: [tri] }, [r, c]) => {
      if (r === tri.length - 1) return [{ from: null, says: `${tri[r][c]} on the bottom row`, gain: tri[r][c], adds: String(tri[r][c]) }]
      const rest = t.get(r, c) - tri[r][c]
      return [[r + 1, c], [r + 1, c + 1]].filter(([nr, nc]) => t.get(nr, nc) === rest).map(([nr, nc]) => ({ from: [nr, nc], says: `${tri[r][c]}, then down to ${tri[nr][nc]} (${nc === c ? 'left' : 'right'})`, gain: tri[r][c], adds: String(tri[r][c]) }))
    },
  },
  lis: {
    result: 'An increasing subsequence', join: ', ',
    back: ({ table: t, args: [a] }, [, i]) => {
      const L = t.get(0, i)
      if (L === 1) return [{ from: null, says: `${a[i]} starts the subsequence`, gain: 1, adds: String(a[i]) }]
      return Array.from({ length: i }, (_, j) => j).filter(j => a[j] < a[i] && t.get(0, j) === L - 1).map(j => ({ from: [0, j], says: `${a[i]} extends the one ending at ${a[j]} (position ${j})`, gain: 1, adds: String(a[i]) }))
    },
  },
  'weighted-intervals': {
    result: 'Jobs taken [start, end)', join: ', ',
    back: ({ table: t, args: [jobs] }, [, i]) => {
      if (!i) return []
      const js = [...jobs].sort((x, y) => x[1] - y[1]), [s, e, v] = js[i - 1], p = js.slice(0, i - 1).filter(x => x[1] <= s).length, out = []
      if (t.get(0, i - 1) === t.get(0, i)) out.push({ from: [0, i - 1], says: `skip job ${i}`, gain: 0 })
      if (v + t.get(0, p) === t.get(0, i)) out.push({ from: [0, p], says: `take job ${i}, [${s},${e}), worth ${v}; before it only jobs ending by ${s}`, gain: v, adds: `[${s},${e})` })
      return out
    },
  },
}

// Walk from `at` taking the first option each time. Returns the steps [{ at, option }] and where it stopped.
export function walkFrom(id, trace, at) {
  const steps = []
  let here = at
  for (let guard = 0; here && guard < 500; guard++) {
    const options = WALKS[id].back(trace, here)
    if (!options.length) return { steps, end: here }
    steps.push({ at: here, option: options[0] })
    here = options[0].from
  }
  return { steps, end: null }
}

// The solution read forwards: the pieces were collected walking backwards.
export function spell(id, steps) {
  const pieces = steps.map(s => s.option.adds).filter(x => x !== undefined)
  return (WALKS[id].forwards ? pieces : pieces.reverse()).join(WALKS[id].join ?? '')
}
