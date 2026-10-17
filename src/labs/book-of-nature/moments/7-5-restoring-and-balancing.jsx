import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'

const weigh = (side, bag) => side.bags * bag + side.stones - side.short

// One pan's load: bags (blue, weight unknown), stones (amber) and the stones it is short of (rose, dashed).
function Load({ side, cx }) {
  const items = [
    ...Array(side.bags).fill('bag'),
    ...Array(side.stones).fill('stone'),
    ...Array(side.short).fill('short'),
  ]
  const per = 6
  return items.map((kind, i) => {
    const x = cx - 75 + (i % per) * 26 + 13
    const y = 96 - Math.floor(i / per) * 26
    if (kind === 'bag') {
      return (
        <g key={i}>
          <rect x={x - 11} y={y - 22} width="22" height="22" rx="7" fill={SKY} />
          <text x={x} y={y - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#020617">?</text>
        </g>
      )
    }
    return kind === 'stone' ? (
      <circle key={i} cx={x} cy={y - 10} r="10" fill={AMBER} />
    ) : (
      <circle key={i} cx={x} cy={y - 10} r="9" fill="none" stroke={ROSE} strokeWidth="2" strokeDasharray="3 2" />
    )
  })
}

// A balance that tips toward the heavier side. `bag` is the hidden weight of one bag, in stones.
function Scale({ left, right, bag }) {
  const diff = weigh(right, bag) - weigh(left, bag)
  const tilt = Math.max(-10, Math.min(10, diff * 3))
  return (
    <svg viewBox="0 0 440 160" style={{ width: 440, maxWidth: '100%' }} role="img" aria-label={diff === 0 ? 'The balance is level' : 'The balance tips'}>
      <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '220px 100px', transition: 'transform 0.5s' }}>
        <rect x="20" y="98" width="400" height="7" rx="3" fill="#94a3b8" />
        <Load side={left} cx={110} />
        <Load side={right} cx={330} />
      </g>
      <polygon points="220,105 204,150 236,150" fill="#475569" />
    </svg>
  )
}

const describe = s =>
  [
    s.bags && `${s.bags} ${s.bags === 1 ? 'bag' : 'bags'}`,
    s.stones && `${s.stones} ${s.stones === 1 ? 'stone' : 'stones'}`,
    s.short && `short of ${s.short}`,
  ]
    .filter(Boolean)
    .join(', ') || 'nothing'

const START = { left: { bags: 3, stones: 2, short: 0 }, right: { bags: 1, stones: 10, short: 0 } }
const BAG = 4

const Button = ({ onClick, disabled, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
    {children}
  </button>
)

function Play({ state, setState }) {
  const { left, right, shared } = state
  const take = (kind, sides) =>
    setState({
      ...state,
      left: sides.includes('left') ? { ...left, [kind]: left[kind] - 1 } : left,
      right: sides.includes('right') ? { ...right, [kind]: right[kind] - 1 } : right,
    })
  const level = weigh(left, BAG) === weigh(right, BAG)
  const ready = level && left.stones === 0 && right.bags === 0 && left.bags > 0
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Every bag weighs the same, but nobody knows how much. 3 bags and 2 stones balance 1 bag and 10 stones. Take
        things off until you can see what one bag weighs. Try taking something off one side only, too.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button onClick={() => take('stones', ['left', 'right'])} disabled={!left.stones || !right.stones}>Take a stone from each side</Button>
        <Button onClick={() => take('bags', ['left', 'right'])} disabled={!left.bags || !right.bags}>Take a bag from each side</Button>
        <Button onClick={() => take('stones', ['left'])} disabled={!left.stones}>Take a stone from the left only</Button>
        <Button onClick={() => setState({ ...START, shared: false })}>Start again</Button>
      </div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Scale left={left} right={right} bag={BAG} />
        <p className="text-lg" data-testid="scale-state">
          {describe(left)} | {describe(right)}: {level ? 'level' : 'it tips'}
        </p>
      </div>
      {ready && !shared && (
        <Button onClick={() => setState({ ...state, shared: true })}>Share out the stones</Button>
      )}
      {shared && (
        <p className="mt-2 text-lg font-semibold text-emerald-400" data-testid="bag-weight">
          {left.bags} bags balance {right.stones} stones, so each bag weighs {right.stones / left.bags} stones.
        </p>
      )}
    </div>
  )
}

const STEPS = [
  { left: { bags: 2, stones: 0, short: 3 }, right: { bags: 1, stones: 4, short: 0 }, say: '2 bags short of 3 stones balance 1 bag and 4 stones.' },
  { left: { bags: 2, stones: 0, short: 0 }, right: { bags: 1, stones: 7, short: 0 }, say: 'Restore: give the left its 3 missing stones, and give the right 3 stones too. 2 bags balance 1 bag and 7 stones.' },
  { left: { bags: 1, stones: 0, short: 0 }, right: { bags: 0, stones: 7, short: 0 }, say: 'Balance: take a bag from each side. 1 bag balances 7 stones.' },
]

function Reveal() {
  const [step, setStep] = useState(0)
  const { left, right, say } = STEPS[step]
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Scale left={left} right={right} bag={7} />
        <p className="text-lg" data-testid="restore-step">{say}</p>
      </div>
      {step < 2 && (
        <Button onClick={() => setStep(step + 1)}>{step === 0 ? 'Restore' : 'Balance'}</Button>
      )}
      {step === 2 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Two moves, and both keep the balance level, because they do the same to both sides. <strong>Restoring</strong>{' '}
            puts back what a side is short of, on both sides. <strong>Balancing</strong> takes the same thing away from
            both sides. Taking from one side only tips it, as you saw.
          </p>
          <p className="text-slate-300">
            Restore first, then balance, then share out: that solves every problem of this kind. The bag is an unknown
            number. You found it without guessing.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-restoring-and-balancing',
  order: '7.5',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'Restoring and balancing',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'balance',
  hook: (
    <p>
      In Baghdad around 820, al-Khwarizmi wrote a book for people with real problems to solve: dividing an
      inheritance, measuring land, sharing a trade. Each problem had an unknown amount in it. Could there be a method
      that finds the unknown every time, with no guessing?
    </p>
  ),
  initialState: { ...START, shared: false },
  Play,
  playReady: state => state.shared,
  playNotReady: 'Find what one bag weighs',
  predict: {
    question: (
      <p>
        A harder one. 2 bags, short of 3 stones, balance 1 bag and 4 stones. (Picture 3 stones missing from the
        left.) How many stones does one bag weigh?
      </p>
    ),
    response: guess => {
      if (guess === 7) return 'Yes, 7. Here are the two moves that get there.'
      if (guess === 4) return '4 leaves out the 3 stones the left side is short of. Those must be put back first.'
      if (guess === 1) return '4 − 3 takes the missing stones away a second time. The left is short, so they need to be put back, on both sides.'
      return `Not ${guess}. Put back what the left is short of, on both sides, then take the same from both.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>5 bags, short of 4 stones, balance 2 bags and 11 stones. How many stones does one bag weigh?</p>,
    answer: 5,
    praise: 'Restore 4 to both sides: 5 bags balance 2 bags and 15 stones. Take 2 bags from each: 3 bags balance 15 stones, so a bag is 5. Check: 25 − 4 = 21 = 10 + 11.',
    hint: v =>
      v === 15
        ? '15 stones balance 3 bags, not one. Share them out.'
        : v === 3
          ? 'It looks as though the 4 was taken away instead of put back. The left is short of 4: restore it, on both sides.'
          : 'Restore first: put the 4 missing stones back on both sides. Then take the same number of bags from both. Then share out.',
    solution: 'Restore: add 4 stones to both sides, so 5 bags balance 2 bags and 15 stones. Balance: take 2 bags from each side, so 3 bags balance 15 stones. Share out: each bag weighs 15 ÷ 3 = 5 stones.',
  },
  keep: 'Do the same to both sides and a balance stays level. Restore what is missing, take away what both sides share, and the unknown is left on its own.',
  symbols: <p>2 × ? − 3 = ? + 4 → 2 × ? = ? + 7 → ? = 7</p>,
  story: (
    <>
      <p>
        Al-Khwarizmi&apos;s book was called <em>The Compendious Book on Calculation by al-jabr and al-muqabala</em>.{' '}
        <em>Al-jabr</em> means restoring, the same word used for setting a broken bone. <em>Al-muqabala</em> means
        balancing, setting one side against the other. Europe borrowed the first word: <strong>algebra</strong>.
      </p>
      <p className="mt-2">
        He wrote everything in words, with no symbols at all. The unknown he called <em>the thing</em>. Letters for
        unknowns came nearly 800 years later.
      </p>
    </>
  ),
}
