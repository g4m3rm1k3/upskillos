// "Walk back the answer": on a finished live table, which choice made each cell. Starting at the answer,
// each step names the choice that produced the cell's value and moves to the cell it came from, until a
// base case. The choices, read forwards, are the actual solution: the subsequence, the items, the path.
//
// WALKS[id] = { result, join?, forwards?, total?, yes?, spell?, back(trace, at) }. yes: a yes/no table, walked only
// when the answer is yes. spell(steps): the solution, when it is not just the pieces in order. forwards: the pieces are already in
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

const isPal = w => w === [...w].reverse().join('')
const list = a => `[${a.join(', ')}]`

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
  'min-cost-stairs': {
    result: 'Positions stepped on', join: ', ',
    back: ({ table: t, args: [costs] }, [, c]) => (c
      ? [c - 1, c - 2].filter(p => p >= 0 && t.get(0, p) + costs[c - 1] === t.get(0, c)).map(p => ({ from: [0, p], says: `step onto position ${c - 1} (cost ${costs[c - 1]}) from ${p ? `position ${p - 1}` : 'the start'}`, gain: costs[c - 1], adds: String(c - 1) }))
      : []),
  },
  'max-subarray': {
    result: 'The best run', join: ', ',
    back: ({ table: t, args: [a] }, [r, i]) => {
      if (r === 1) return [...(i && t.get(1, i - 1) === t.get(1, i) ? [{ from: [1, i - 1], says: `the best run ends before ${i}`, gain: 0 }] : []), ...(t.get(0, i) === t.get(1, i) ? [{ from: [0, i], says: `the best run ends at ${i}`, gain: 0 }] : [])]
      return [...(i && t.get(0, i - 1) + a[i] === t.get(0, i) ? [{ from: [0, i - 1], says: `${a[i]} extends the run ending at ${i - 1}`, gain: a[i], adds: String(a[i]) }] : []), ...(a[i] === t.get(0, i) ? [{ from: null, says: `the run starts at ${i}, with ${a[i]}`, gain: a[i], adds: String(a[i]) }] : [])]
    },
  },
  'word-break': {
    result: 'The words', join: ' ', yes: true,
    back: ({ table: t, args: [s, words] }, [, i]) => (i ? words.filter(w => w.length <= i && s.slice(i - w.length, i) === w && t.get(0, i - w.length)).map(w => ({ from: [0, i - w.length], says: `the last word is “${w}”`, gain: 0, adds: w })) : []),
  },
  'subset-sum': {
    result: 'Values used', join: ' + ', yes: true,
    back: ({ table: t, args: [a] }, [i, s]) => (i
      ? [...(t.get(i - 1, s) ? [{ from: [i - 1, s], says: `leave ${a[i - 1]} out`, gain: 0 }] : []), ...(s >= a[i - 1] && t.get(i - 1, s - a[i - 1]) ? [{ from: [i - 1, s - a[i - 1]], says: `use ${a[i - 1]}`, gain: 0, adds: String(a[i - 1]) }] : [])]
      : []),
  },
  'bounded-knapsack': {
    result: 'Items packed', join: ', ',
    back: ({ table: t, args: [w, v, k] }, [i, c]) => (i
      ? Array.from({ length: Math.min(k[i - 1], Math.floor(c / w[i - 1])) + 1 }, (_, q) => q).filter(q => q * v[i - 1] + t.get(i - 1, c - q * w[i - 1]) === t.get(i, c))
        .map(q => ({ from: [i - 1, c - q * w[i - 1]], says: q ? `pack ${q} cop${q === 1 ? 'y' : 'ies'} of item ${i}` : `leave item ${i} out`, gain: q * v[i - 1], adds: q ? `item ${i} ×${q}` : undefined }))
      : []),
  },
  'exact-capacity': {
    result: 'Items that fill it exactly', join: ', ',
    back: ({ table: t, args: [w, v] }, [i, c]) => (i
      ? [...(t.get(i - 1, c) === t.get(i, c) ? [{ from: [i - 1, c], says: `leave item ${i} out`, gain: 0 }] : []), ...(w[i - 1] <= c && v[i - 1] + t.get(i - 1, c - w[i - 1]) === t.get(i, c) ? [{ from: [i - 1, c - w[i - 1]], says: `pack item ${i} (weight ${w[i - 1]})`, gain: v[i - 1], adds: `item ${i}` }] : [])]
      : []),
  },
  'value-knapsack': {
    result: 'Items packed', join: ', ',
    back: ({ table: t, args: [w, v] }, [i, x]) => {
      const n = w.length
      if (i === n + 1) return [{ from: [n, x], says: `value ${x} is the largest whose least weight fits`, gain: 0 }]
      if (!i) return []
      return [...(t.get(i - 1, x) === t.get(i, x) ? [{ from: [i - 1, x], says: `leave item ${i} out`, gain: 0 }] : []), ...(v[i - 1] <= x && w[i - 1] + t.get(i - 1, x - v[i - 1]) === t.get(i, x) ? [{ from: [i - 1, x - v[i - 1]], says: `pack item ${i} (weight ${w[i - 1]}, value ${v[i - 1]})`, gain: v[i - 1], adds: `item ${i}` }] : [])]
    },
  },
  'multidimensional-knapsack': {
    result: 'Items packed', join: ', ',
    back: ({ table: t, args: [items, W] }, [x, u]) => {
      const i = Math.floor(x / (W + 1)), w = x % (W + 1), row = (k, ww) => k * (W + 1) + ww
      if (!i) return []
      const [wi, ui, vi] = items[i - 1]
      return [...(t.get(row(i - 1, w), u) === t.get(x, u) ? [{ from: [row(i - 1, w), u], says: `leave item ${i} out`, gain: 0 }] : []), ...(wi <= w && ui <= u && vi + t.get(row(i - 1, w - wi), u - ui) === t.get(x, u) ? [{ from: [row(i - 1, w - wi), u - ui], says: `pack item ${i} (weight ${wi}, volume ${ui}, value ${vi})`, gain: vi, adds: `item ${i}` }] : [])]
    },
  },
  'group-knapsack': {
    result: 'Options taken', join: ', ',
    back: ({ table: t, args: [groups] }, [g, c]) => (g
      ? [...(t.get(g - 1, c) === t.get(g, c) ? [{ from: [g - 1, c], says: `nothing from group ${g}`, gain: 0 }] : []), ...groups[g - 1].filter(([w, v]) => w <= c && v + t.get(g - 1, c - w) === t.get(g, c)).map(([w, v]) => ({ from: [g - 1, c - w], says: `from group ${g}, the option weighing ${w} worth ${v}`, gain: v, adds: `${g}:${w}/${v}` }))]
      : []),
  },
  'palindrome-cuts': {
    result: 'The pieces', join: ' | ',
    back: ({ table: t, args: [s] }, [, i]) => (i
      ? Array.from({ length: i }, (_, j) => j).filter(j => isPal(s.slice(j, i)) && t.get(0, j) + 1 === t.get(0, i)).map(j => ({ from: [0, j], says: `the last piece is “${s.slice(j, i)}”, a palindrome`, gain: 1, adds: s.slice(j, i) }))
      : []),
  },
  'text-justification': {
    result: 'The lines (word numbers)', join: ' | ',
    back: ({ table: t, args: [w, width] }, [, c]) => {
      const n = w.length, len = (j, i) => w.slice(j, i).reduce((s, x) => s + x, 0) + (i - j - 1)
      if (c === n + 1) return Array.from({ length: n }, (_, j) => j).filter(j => len(j, n) <= width && t.get(0, j) === t.get(0, n + 1)).map(j => ({ from: [0, j], says: `the free last line is words ${j + 1}–${n}`, gain: 0, adds: `${j + 1}–${n}` }))
      if (!c) return []
      return Array.from({ length: c }, (_, j) => j).filter(j => len(j, c) <= width && t.get(0, j) + (width - len(j, c)) ** 2 === t.get(0, c)).map(j => ({ from: [0, j], says: `a line of words ${j + 1}–${c}, ${len(j, c)} wide, costing ${(width - len(j, c)) ** 2}`, gain: (width - len(j, c)) ** 2, adds: `${j + 1}–${c}` }))
    },
  },
  'batch-scheduling': {
    result: 'The batches (job numbers)', join: ' | ',
    back: ({ table: t, args: [a, setup] }, [, i]) => (i
      ? Array.from({ length: i }, (_, j) => j).filter(j => t.get(0, j) + setup + a.slice(j, i).reduce((s, x) => s + x, 0) ** 2 === t.get(0, i)).map(j => { const cost = setup + a.slice(j, i).reduce((s, x) => s + x, 0) ** 2; return { from: [0, j], says: `the last batch is jobs ${j + 1}–${i}, costing ${cost}`, gain: cost, adds: `${j + 1}–${i}` } })
      : []),
  },
  'k-partitions': {
    result: 'The segments', join: ' | ',
    back: ({ table: t, args: [a] }, [g, i]) => (g
      ? Array.from({ length: i }, (_, j) => j).filter(j => t.get(g - 1, j) + a.slice(j, i).reduce((s, x) => s + x, 0) ** 2 === t.get(g, i)).map(j => { const s = a.slice(j, i).reduce((x, y) => x + y, 0); return { from: [g - 1, j], says: `segment ${g} is items ${j + 1}–${i}, sum ${s}, costing ${s * s}`, gain: s * s, adds: list(a.slice(j, i)) } })
      : []),
  },
  'partition-max': {
    result: 'The segments', join: ' | ', total: () => 0,
    back: ({ table: t, args: [a] }, [g, i]) => (g
      ? Array.from({ length: i }, (_, j) => j).filter(j => Math.max(t.get(g - 1, j), a.slice(j, i).reduce((s, x) => s + x, 0)) === t.get(g, i)).map(j => ({ from: [g - 1, j], says: `segment ${g} is items ${j + 1}–${i}, sum ${a.slice(j, i).reduce((s, x) => s + x, 0)}`, gain: 0, adds: list(a.slice(j, i)) }))
      : []),
  },
  'common-substring': {
    result: 'The common substring', join: '',
    back: ({ table: t, args: [a] }, [i, j]) => (i && j && t.get(i, j) > 0 ? [{ from: [i - 1, j - 1], says: `“${a[i - 1]}” matches, so the run goes on diagonally`, gain: 1, adds: a[i - 1] }] : []),
  },
  'weighted-edit': {
    result: 'The letters written, which spell the target', join: '',
    back: ({ table: t, args: [a, b, ins, del, sub] }, [i, j]) => {
      const v = t.get(i, j), out = []
      if (i && j && a[i - 1] === b[j - 1] && t.get(i - 1, j - 1) === v) out.push({ from: [i - 1, j - 1], says: `keep “${a[i - 1]}”: it already matches`, gain: 0, adds: b[j - 1] })
      if (i && j && a[i - 1] !== b[j - 1] && t.get(i - 1, j - 1) + sub === v) out.push({ from: [i - 1, j - 1], says: `substitute “${a[i - 1]}” with “${b[j - 1]}” (${sub})`, gain: sub, adds: b[j - 1] })
      if (i && t.get(i - 1, j) + del === v) out.push({ from: [i - 1, j], says: `delete “${a[i - 1]}” (${del})`, gain: del, adds: '' })
      if (j && t.get(i, j - 1) + ins === v) out.push({ from: [i, j - 1], says: `insert “${b[j - 1]}” (${ins})`, gain: ins, adds: b[j - 1] })
      return out
    },
  },
  'stock-states': {
    result: 'Trades', join: ', ',
    back: ({ table: t, args: [p] }, [r, d]) => {
      if (!d) return []
      const x = p[d - 1], v = t.get(r, d)
      if (!r) return [...(t.get(0, d - 1) === v ? [{ from: [0, d - 1], says: `day ${d}: no share, wait`, gain: 0 }] : []), ...(t.get(1, d - 1) + x === v ? [{ from: [1, d - 1], says: `day ${d}: sell at ${x}`, gain: x, adds: `sell day ${d}` }] : [])]
      return [...(t.get(1, d - 1) === v ? [{ from: [1, d - 1], says: `day ${d}: keep the share`, gain: 0 }] : []), ...(t.get(0, d - 1) - x === v ? [{ from: [0, d - 1], says: `day ${d}: buy at ${x}`, gain: -x, adds: `buy day ${d}` }] : [])]
    },
  },
  'stock-k': {
    result: 'Trades', join: ', ',
    back: ({ table: t, args: [p] }, [r, d]) => {
      if (!d) return []
      const x = p[d - 1], v = t.get(r, d), k = r >> 1
      if (r % 2 === 0) return [...(t.get(r, d - 1) === v ? [{ from: [r, d - 1], says: `day ${d}: no share, wait`, gain: 0 }] : []), ...(k && t.get(r - 1, d - 1) + x === v ? [{ from: [r - 1, d - 1], says: `day ${d}: sell at ${x}, completing trade ${k}`, gain: x, adds: `sell day ${d}` }] : [])]
      return [...(t.get(r, d - 1) === v ? [{ from: [r, d - 1], says: `day ${d}: keep the share`, gain: 0 }] : []), ...(t.get(r - 1, d - 1) - x === v ? [{ from: [r - 1, d - 1], says: `day ${d}: buy at ${x}`, gain: -x, adds: `buy day ${d}` }] : [])]
    },
  },
  'stock-cooldown': {
    result: 'Trades', join: ', ',
    back: ({ table: t, args: [p, , fee] }, [r, d]) => {
      if (!d) return []
      const x = p[d - 1], v = t.get(r, d)
      if (r === 0) return [...(t.get(0, d - 1) === v ? [{ from: [0, d - 1], says: `day ${d}: keep the share`, gain: 0 }] : []), ...(t.get(2, d - 1) - x === v ? [{ from: [2, d - 1], says: `day ${d}: buy at ${x}, from resting`, gain: -x, adds: `buy day ${d}` }] : [])]
      if (r === 1) return [{ from: [0, d - 1], says: `day ${d}: sell at ${x}${fee ? `, paying the fee ${fee}` : ''}`, gain: x - fee, adds: `sell day ${d}` }]
      return [...(t.get(2, d - 1) === v ? [{ from: [2, d - 1], says: `day ${d}: keep resting`, gain: 0 }] : []), ...(t.get(1, d - 1) === v ? [{ from: [1, d - 1], says: `day ${d}: cooling down after yesterday’s sale`, gain: 0 }] : [])]
    },
  },
  'deadline-scheduling': {
    result: 'Jobs run, in deadline order', join: ', ',
    back: ({ table: t, args: [jobs] }, [i, x]) => {
      if (!i) return []
      const [d, r, dl] = [...jobs].sort((a, b) => a[2] - b[2])[i - 1], v = t.get(i, x)
      return [...(t.get(i - 1, x) === v ? [{ from: [i - 1, x], says: `skip job ${i}`, gain: 0 }] : []), ...(x >= d && x <= dl && r + t.get(i - 1, x - d) === v ? [{ from: [i - 1, x - d], says: `run job ${i} last, finishing at ${x} (deadline ${dl})`, gain: r, adds: `job ${i}` }] : [])]
    },
  },
  'grid-direction': {
    result: 'The path (row, column)', join: ' → ',
    back: ({ table: t, args: [g, turn] }, [x, c]) => {
      const R = g.length, C = g[0].length, row = (d, r) => 2 * r + d
      if (x === 2 * R) return [0, 1].filter(d => t.get(row(d, R - 1), C - 1) === t.get(x, c)).map(d => ({ from: [row(d, R - 1), C - 1], says: `the best arrives ${d ? 'moving down' : 'moving right'}`, gain: 0 }))
      const r = x >> 1, d = x % 2, [pr, pc] = d ? [r - 1, c] : [r, c - 1], v = t.get(x, c)
      if (!pr && !pc) return [{ from: null, says: `the first move, ${d ? 'down' : 'right'} from the start, pays ${g[r][c]}`, gain: g[r][c], adds: `(0,0) → (${r},${c})` }]
      return [[d, 0], [1 - d, turn]].filter(([pd, fee]) => g[r][c] + t.get(row(pd, pr), pc) + fee === v).map(([pd, fee]) => ({ from: [row(pd, pr), pc], says: `${fee ? `turn (fee ${turn})` : 'go straight'} into (${r},${c}), paying ${g[r][c]}`, gain: g[r][c] + fee, adds: `(${r},${c})` }))
    },
  },
  'palindrome-subsequence': {
    result: 'A longest palindromic subsequence',
    // The pairs are found from the outside in; the palindrome is the pairs, the middle, then the pairs backwards.
    spell: steps => { const pairs = steps.filter(s => s.option.gain === 2).map(s => s.option.adds), mid = steps.find(s => s.option.gain === 1)?.option.adds ?? ''; return pairs.join('') + mid + [...pairs].reverse().join('') },
    back: ({ table: t, args: [s] }, [i, j]) => {
      if (i === j) return [{ from: null, says: `“${s[i]}” in the middle`, gain: 1, adds: s[i] }]
      if (s[i] === s[j]) return [{ from: j - i > 1 ? [i + 1, j - 1] : null, says: `the ends “${s[i]}” and “${s[j]}” match: a pair`, gain: 2, adds: s[i] }]
      const v = t.get(i, j)
      return [...(t.get(i + 1, j) === v ? [{ from: [i + 1, j], says: `drop “${s[i]}” at ${i}`, gain: 0 }] : []), ...(t.get(i, j - 1) === v ? [{ from: [i, j - 1], says: `drop “${s[j]}” at ${j}`, gain: 0 }] : [])]
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
  if (WALKS[id].spell) return WALKS[id].spell(steps)
  const pieces = steps.map(s => s.option.adds).filter(x => x !== undefined)
  return (WALKS[id].forwards ? pieces : pieces.reverse()).join(WALKS[id].join ?? '')
}
