import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'

// The number of paths from the top peg to peg k of row n.
const paths = (n, k) => (k < 0 || k > n ? 0 : k === 0 || k === n ? 1 : paths(n - 1, k - 1) + paths(n - 1, k))

// Every path to peg k of row n, as steps L and R.
function routes(n, k) {
  if (n === 0) return ['']
  const out = []
  if (k > 0) out.push(...routes(n - 1, k - 1).map(r => r + 'R'))
  if (k < n) out.push(...routes(n - 1, k).map(r => r + 'L'))
  return out.sort()
}

const U = 54
function Triangle({ rows, shown, onTap, mark }) {
  const width = (rows + 1) * U
  const at = (n, k) => [width / 2 + (k - n / 2) * U, 30 + n * U * 0.86]
  return (
    <svg viewBox={`0 0 ${width} ${30 + rows * U * 0.86 + 32}`} style={{ width, maxWidth: '100%' }} role="img" aria-label="A triangle of pegs">
      {Array.from({ length: rows }, (_, n) =>
        Array.from({ length: n + 1 }, (_, k) => {
          const [x1, y1] = at(n, k)
          return [k, k + 1].map(j => {
            const [x2, y2] = at(n + 1, j)
            return <line key={`${n}-${k}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="2" />
          })
        }),
      )}
      {Array.from({ length: rows + 1 }, (_, n) =>
        Array.from({ length: n + 1 }, (_, k) => {
          const [x, y] = at(n, k)
          const isShown = shown(n, k)
          const colour = mark?.(n, k)
          return (
            <g key={`${n}-${k}`} aria-label={`peg ${n}-${k}`} role="button" onClick={() => onTap?.(n, k)} style={{ cursor: onTap ? 'pointer' : 'default' }}>
              <circle cx={x} cy={y} r="19" fill={colour || (isShown ? '#1e293b' : '#0f172a')} stroke={isShown ? AMBER : '#475569'} strokeWidth="2" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={colour ? '#0f172a' : isShown ? AMBER : '#475569'}>
                {isShown ? paths(n, k) : ''}
              </text>
            </g>
          )
        }),
      )}
    </svg>
  )
}

function Play({ state, setState }) {
  const { tapped, last } = state
  const tap = (n, k) => {
    const id = `${n}-${k}`
    setState({ tapped: tapped.includes(id) ? tapped : [...tapped, id], last: [n, k] })
  }
  const list = last ? routes(...last) : []
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A ball starts at the top peg and drops down, going left (L) or right (R) at each peg. Tap any peg to see
        every path that ends there, and how many there are. Call the top peg row 0; the row below it is row 1, and
        so on.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Triangle rows={4} shown={(n, k) => tapped.includes(`${n}-${k}`)} onTap={tap} mark={(n, k) => (last && last[0] === n && last[1] === k ? AMBER : null)} />
      </div>
      {last && (
        <p className="mt-2 text-lg" data-testid="route-list">
          {list.length} {list.length === 1 ? 'path' : 'paths'}: <span className="font-mono">{list.join(', ') || '(the start)'}</span>
        </p>
      )}
    </div>
  )
}

function Reveal() {
  const [rows, setRows] = useState(4)
  const [show, setShow] = useState(null)
  const marks = {
    rule: (n, k) => (n === 4 && k === 2 ? AMBER : n === 3 && (k === 1 || k === 2) ? SKY : null),
    handshakes: (n, k) => (k === 2 && n >= 2 ? AMBER : null),
    choose: (n, k) => (n === 5 && (k === 2 || k === 3) ? AMBER : null),
  }
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Every path to a peg arrives from one of the two pegs just above it. So the paths to a peg are the paths to
        the peg above-left plus the paths to the peg above-right. Each number is the sum of the two above it.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShow('rule')} className="rounded-lg border border-slate-700 px-3 py-1 font-semibold hover:bg-slate-800">
          3 + 3 = 6
        </button>
        <button type="button" onClick={() => setShow('handshakes')} className="rounded-lg border border-slate-700 px-3 py-1 font-semibold hover:bg-slate-800">
          Find the handshakes
        </button>
        <button type="button" onClick={() => setShow('choose')} className="rounded-lg border border-slate-700 px-3 py-1 font-semibold hover:bg-slate-800">
          Find 2 from 5
        </button>
        {rows < 6 && (
          <button type="button" onClick={() => setRows(rows + 1)} className="rounded-lg bg-amber-500 px-4 py-1 font-semibold text-slate-950 hover:bg-amber-400">
            Add a row
          </button>
        )}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Triangle rows={rows} shown={() => true} mark={show ? marks[show] : null} />
      </div>
      <p className="mt-2 text-lg" data-testid="triangle-row">
        Bottom row: {Array.from({ length: rows + 1 }, (_, k) => paths(rows, k)).join(' ')}
      </p>
      {rows === 6 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            The middle of the bottom row is 10 + 10 = <strong className="text-amber-300">20</strong>, built from the row
            above without listing a single path.
          </p>
          <p>
            And the triangle holds the earlier counts. Its third slanted line is 1, 3, 6, 10, 15: the handshakes of
            1.4. A path down 5 rows chooses which 2 of its 5 steps go right, so the 10 in row 5 is the 10 ways to
            choose 2 from 5 in 5.5. Every count of choices is in here.
          </p>
          <p className="text-slate-300">
            That is what generalizing does: instead of answering one question, find the rule that answers all of
            them.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-pascals-triangle',
  order: '5.6',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: "Pascal's triangle",
  threads: ['Chance', 'Number', 'Structure'],
  rigor: 2,
  move: 'generalize',
  hook: (
    <p>
      Fermat&apos;s endings, the orders, the teams in the boat, the handshakes: each count so far needed its own
      reasoning. Is there one table that holds all of these numbers, and a single rule that builds it?
    </p>
  ),
  initialState: { tapped: [], last: null },
  Play,
  playReady: state => state.tapped.filter(id => Number(id[0]) >= 3).length >= 3,
  playNotReady: 'Tap at least three pegs in the bottom two rows',
  predict: {
    question: <p>The triangle grows two more rows, to row 6. How many paths reach the middle peg of row 6?</p>,
    response: guess => {
      if (guess === 20) return 'Yes, 20. Here is how to get it without listing any paths.'
      if (guess === 12 || guess === 9) return 'The counts grow faster than that toward the middle. Look at how each number is built from the row above.'
      if (guess === 64) return '64 is every path down 6 rows, to all the pegs together. Only some of them end in the middle.'
      return `Not ${guess}. Look at how each number in your triangle comes from the two above it.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>Using the triangle: how many ways are there to choose 3 things from 7?</p>,
    answer: 35,
    praise: 'Row 6 is 1 6 15 20 15 6 1, so row 7 is 1 7 21 35 35 21 7 1. Choosing 3 from 7 is 15 + 20 = 35.',
    hint: v =>
      v === 210
        ? 'That counts the choices in order. Each team of 3 is drawn in 6 orders.'
        : v === 21
          ? '21 is choosing 2 from 7. A path down 7 rows that goes right 3 times is one more peg along.'
          : v === 20
            ? '20 is 3 from 6. Build the next row, row 7.'
            : 'Build row 7 from row 6 (1 6 15 20 15 6 1) by adding neighbours. Then count along: the first number is choosing 0, the next choosing 1, and so on.',
    solution: 'Row 7 comes from row 6 by adding neighbours: 1, 1+6 = 7, 6+15 = 21, 15+20 = 35, … Choosing 3 from 7 is the fourth number (choose 0, 1, 2, 3): 35. Check: 7 × 6 × 5 = 210 in order, ÷ 6 = 35.',
  },
  keep: 'In Pascal’s triangle each number is the sum of the two above. It counts paths, and so it counts every choice: row 5 holds the ways to choose from 5.',
  story: (
    <>
      <p>
        Pascal wrote his <em>Treatise on the Arithmetical Triangle</em> in 1654, the year of the letters to Fermat,
        and used it to split the stakes in any unfinished game. It was printed in 1665, after his death.
      </p>
      <p className="mt-2">
        He was far from the first. Al-Karaji in Baghdad described it around 1000 (his book is lost, but a later writer quotes it); in China it is Yang Hui&apos;s
        triangle, after his book of 1261, and Zhu Shijie drew it in 1303 with rows down to 8. In India, a commentary
        by Halayudha (in the 900s) on Pingala&apos;s metres describes it. In the West it kept Pascal&apos;s name.
      </p>
    </>
  ),
  deeper: {
    question: <p>Add up all the numbers in row 10 of the triangle.</p>,
    answer: 1024,
    praise: 'Every path splits in two at each peg, so each row adds up to twice the row before: 2, 4, 8, … 1,024.',
    hint: () => 'Add up rows 1, 2, 3 and 4. What happens each time? Why?',
    solution: 'Row 1 adds to 2, row 2 to 4, row 3 to 8: each row is double the one before, because every path to row n splits into two paths to row n + 1. Ten doublings: 1,024.',
  },
}
