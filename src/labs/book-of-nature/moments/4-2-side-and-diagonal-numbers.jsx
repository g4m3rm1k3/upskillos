import React, { useState } from 'react'
import { Stepper } from '../parts'

const fmt = n => n.toLocaleString('en-US')

// For a square of side s, the whole-number diagonal that comes closest, and by how much it misses.
function best(s) {
  const target = 2 * s * s
  const d = Math.round(Math.sqrt(target))
  return { d, target, miss: d * d - target }
}

function Play({ state, setState }) {
  const { s, found } = state
  const { d, target, miss } = best(s)
  const set = v => {
    const m = best(v).miss
    setState({ s: v, found: Math.abs(m) === 1 && v > 1 && !found.includes(v) ? [...found, v].sort((x, y) => x - y) : found })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The square on a diagonal is twice the square (2.6). So a whole-number diagonal <em>d</em> for a whole-number
        side <em>s</em> would need d × d to equal 2 × s × s exactly. Try sides and see how close the best diagonal
        comes.
      </p>
      <Stepper label="side" value={s} min={1} max={30} onChange={set} />
      <div className="mt-3 rounded-lg bg-slate-950 p-4 font-mono text-lg">
        <p>
          2 × {s} × {s} = <span style={{ color: '#38bdf8' }}>{fmt(target)}</span>
        </p>
        <p>
          best diagonal {d}: {d} × {d} = <span className="text-amber-300">{fmt(d * d)}</span>
        </p>
        <p data-testid="miss" className={Math.abs(miss) === 1 ? 'text-emerald-400' : 'text-slate-400'}>
          misses by {Math.abs(miss)}
        </p>
      </div>
      {found.length > 0 && <p className="mt-2 text-slate-300" data-testid="near-misses">Sides that miss by just 1: {found.join(', ')}</p>}
    </div>
  )
}

const PAIRS = [[1, 1]]
for (let i = 0; i < 6; i++) {
  const [s, d] = PAIRS[PAIRS.length - 1]
  PAIRS.push([s + d, 2 * s + d])
}

function Reveal() {
  const [n, setN] = useState(4)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        The rule: the next side is side + diagonal, and the next diagonal is 2 × side + diagonal. From 12 and 17 you
        get 29 and 41. Keep going.
      </p>
      <table className="font-mono text-lg">
        <thead>
          <tr className="text-sm text-slate-400">
            <th className="pr-4 text-left">side</th>
            <th className="pr-4 text-left">diagonal</th>
            <th className="pr-4 text-left">2 × s × s</th>
            <th className="pr-4 text-left">d × d</th>
            <th className="text-left">miss</th>
          </tr>
        </thead>
        <tbody>
          {PAIRS.slice(0, n).map(([s, d]) => (
            <tr key={s} data-testid="pair-row">
              <td className="pr-4">{s}</td>
              <td className="pr-4">{d}</td>
              <td className="pr-4" style={{ color: '#38bdf8' }}>{fmt(2 * s * s)}</td>
              <td className="pr-4 text-amber-300">{fmt(d * d)}</td>
              <td className="text-emerald-400">{d * d > 2 * s * s ? '+1' : '−1'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {n < PAIRS.length && (
        <button type="button" onClick={() => setN(n + 1)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Next pair
        </button>
      )}
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every pair misses by exactly 1, too big and too small in turn. The numbers grow fast, so a miss of 1 matters
          less and less: 9,801 against 9,800 is closer than a hair. These pairs make better and better measurements
          of a square&apos;s diagonal.
        </p>
        <p className="text-slate-300">
          But not one of them is exact. The miss never shrinks to 0. Is that just because nobody has gone far
          enough, or can the miss never reach 0? That is the next moment.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-side-and-diagonal-numbers',
  order: '4.2',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'Side and diagonal numbers',
  threads: ['Number', 'Shape'],
  rigor: 1,
  move: 'small-case',
  hook: (
    <p>
      If everything is number, then a square&apos;s side and its diagonal must have a common measure: some unit
      fitting a whole number of times into each. Then with that unit, both would be whole numbers. Can you find a
      square whose side and diagonal are both whole numbers?
    </p>
  ),
  initialState: { s: 1, found: [] },
  Play,
  playReady: state => state.found.length >= 2,
  playNotReady: 'Find two sides (bigger than 1) whose best diagonal misses by just 1',
  predict: {
    question: (
      <p>
        Sides that miss by 1 go 2, 5, 12, with diagonals 3, 7, 17. Each pair comes from the one before. What is the
        next side after 12?
      </p>
    ),
    response: guess => {
      if (guess === 29) return 'Yes, 29: 12 + 17. Its diagonal is 2 × 12 + 17 = 41.'
      return `It's 29: the next side is side + diagonal, 12 + 17.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>After side 70 and diagonal 99, the next side is 169. What is its diagonal?</p>,
    answer: 239,
    praise: '2 × 70 + 99 = 239. Check: 239 × 239 = 57,121 and 2 × 169 × 169 = 57,122. A miss of 1.',
    hint: v =>
      v === 268
        ? 'That adds 169 and 99. The rule for the diagonal is 2 × the old side + the old diagonal.'
        : 'Next diagonal = 2 × side + diagonal, using the old pair 70 and 99.',
    solution: 'The next diagonal is 2 × 70 + 99 = 239. And 239 × 239 = 57,121, against 2 × 169 × 169 = 57,122: still a miss of exactly 1.',
  },
  keep: 'Whole-number sides and diagonals can come astonishingly close, 99 against a side of 70, but every pair misses by exactly 1.',
  symbols: <p>From side s and diagonal d: next side s + d, next diagonal 2 × s + d. And always d × d − 2 × s × s = 1 or −1.</p>,
  story: (
    <>
      <p>
        Theon of Smyrna, around AD 100, described these &quot;side and diagonal numbers&quot; and the rule that makes
        them. Much earlier, Plato&apos;s <em>Republic</em> mentions the &quot;rational diameter of five&quot;: 7, the
        whole-number stand-in for the diagonal of a square of side 5.
      </p>
      <p className="mt-2">
        The Babylonian tablet YBC 7289 from Episode 2 shows how close people could get. But close, the Greeks
        wanted to know, or exact?
      </p>
    </>
  ),
  deeper: {
    question: <p>How far is 239 × 239 from 2 × 169 × 169?</p>,
    answer: 1,
    praise: '57,121 against 57,122: a miss of 1, as always.',
    hint: () => 'Work out both products and subtract.',
    solution: '239 × 239 = 57,121 and 2 × 169 × 169 = 2 × 28,561 = 57,122. They differ by 1.',
  },
}
