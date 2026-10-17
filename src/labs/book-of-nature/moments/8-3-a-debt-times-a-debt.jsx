import React from 'react'

const AMBER = '#fbbf24'
const ROSE = '#fb7185'
const EMERALD = '#34d399'
const S = 20

// A 10 × 10 square. Taken-away rows (bottom 3) and columns (right 3) turn rose; the corner taken twice is darker.
// With `putBack`, the corner is green: it is added back once.
function Square({ rows, cols, putBack }) {
  return (
    <svg viewBox={`0 0 ${10 * S + 4} ${10 * S + 4}`} style={{ width: 10 * S + 4, maxWidth: '100%' }} role="img" aria-label="a 10 by 10 square">
      {Array.from({ length: 100 }, (_, i) => {
        const c = i % 10
        const r = Math.floor(i / 10)
        const times = (rows && r >= 7 ? 1 : 0) + (cols && c >= 7 ? 1 : 0)
        const fill = times === 0 ? AMBER : times === 2 && putBack ? EMERALD : ROSE
        return (
          <rect key={i} x={2 + c * S + 1} y={2 + r * S + 1} width={S - 2} height={S - 2} rx="2" fill={fill} fillOpacity={times === 1 ? 0.35 : 0.9} stroke={times === 2 ? '#f8fafc' : 'none'} strokeWidth="1.5" />
        )
      })}
    </svg>
  )
}

function Play({ state, setState }) {
  const { rows, cols } = state
  const taken = (rows ? 30 : 0) + (cols ? 30 : 0)
  return (
    <div>
      <p className="mb-3 text-slate-300">
        7 × 7 is 10 × 10 with some taken away. Start from the 10 × 10 square and take away 3 rows and 3 columns, 30
        squares each time. Then count what is left.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" disabled={rows} onClick={() => setState({ ...state, rows: true })} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
          Take away 3 rows
        </button>
        <button type="button" disabled={cols} onClick={() => setState({ ...state, cols: true })} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
          Take away 3 columns
        </button>
      </div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Square rows={rows} cols={cols} />
        <p className="mt-2 text-lg" data-testid="debt-count">
          100 − {taken} = {100 - taken}
          {rows && cols && <> by the sum, but count the amber squares: <strong className="text-amber-300">49</strong>.</>}
        </p>
      </div>
    </div>
  )
}

function Reveal() {
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Square rows cols putBack />
        <p className="mt-2 text-lg" data-testid="put-back">
          100 − 30 − 30 + <span style={{ color: EMERALD }}>9</span> = 49
        </p>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          The corner 3 × 3 is in the rows <em>and</em> in the columns, so it was taken away twice. It has to be put
          back once: + 9.
        </p>
        <p>
          By parts, that corner is the piece (−3) × (−3). For multiplying by parts to keep working with debts, it
          must be +9. <strong>A debt times a debt is a fortune.</strong> A fortune times a debt, like 10 × (−3), is a
          debt: the −30 strips.
        </p>
        <p className="text-slate-300">
          So any number times itself is never below zero: 3 × 3 = 9, (−3) × (−3) = 9, and 0 × 0 = 0. No number at
          all, fortune or debt, has a square that is a debt.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-a-debt-times-a-debt',
  order: '8.3',
  episodeNumber: 8,
  episode: 'Duels over the cubic',
  title: 'A debt times a debt',
  threads: ['Number'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      Brahmagupta&apos;s rules included this one: a debt times a debt is a fortune. For centuries students learned it
      without a reason, and many found it strange. Owing times owing makes owning? Why should that be?
    </p>
  ),
  initialState: { rows: false, cols: false },
  Play,
  playReady: state => state.rows && state.cols,
  playNotReady: 'Take away the rows and the columns',
  predict: {
    question: (
      <p>
        Multiplying by parts (7.4): (10 − 3) × (10 − 3) = 10 × 10 + 10 × (−3) + (−3) × 10 + (−3) × (−3) = 100 − 30
        − 30 + (−3) × (−3). The answer must be 49. So what is (−3) × (−3)?
      </p>
    ),
    choices: ['−9', '0', '9'],
    response: guess => {
      if (guess === '9') return 'Yes, 9. The picture shows where the 9 is.'
      if (guess === '−9') return 'Then the total would be 100 − 30 − 30 − 9 = 31, not 49. Look at the corner.'
      return 'Then the total would be 40. You counted 49: there are 9 more.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>By parts, with debts: (10 − 2) × (10 − 4) = 100 − 40 − 20 + ? What is 8 × 6, worked out this way?</p>,
    answer: 48,
    praise: '100 − 40 − 20 + 8 = 48: the corner (−2) × (−4) = 8 is put back. And 8 × 6 is 48.',
    hint: v =>
      v === 40
        ? 'That leaves out the corner, (−2) × (−4). It was taken away twice: put it back.'
        : v === 32
          ? 'The corner is a debt times a debt, so it is a fortune: + 8, not − 8.'
          : 'The four pieces are 10 × 10, 10 × (−4), (−2) × 10 and (−2) × (−4). Add them up.',
    solution: '10 × 10 = 100, 10 × (−4) = −40, (−2) × 10 = −20, and (−2) × (−4) = +8, the corner taken twice and put back. 100 − 40 − 20 + 8 = 48, which is 8 × 6.',
  },
  keep: 'A debt times a debt is a fortune: (−3) × (−3) = 9, the corner that was taken away twice and must be put back. So no number times itself is ever below zero.',
  symbols: <p>(−3) × (−3) = 9 · 10 × (−3) = −30</p>,
  story: (
    <p>
      Brahmagupta stated the rule in 628, and it has never changed. Yet even in the 1700s, books argued about why it
      was true. The reason you found is the one mathematicians give today: the rules for multiplying, like
      multiplying by parts, keep working only if a debt times a debt is a fortune.
    </p>
  ),
}
