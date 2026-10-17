import React from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const U = 34
const PAD = 14

// A wheel of the given diameter (in units) rolling once along the ground.
function Roll({ d, rolled }) {
  const r = (d * U) / 2
  const ground = 2 * r + 24
  const dist = Math.PI * d * U
  const width = PAD * 2 + 3 * Math.PI * U + 2 * r
  const marks = Math.floor(dist / (d * U)) + 1
  const move = { transition: 'transform 1.6s ease-in-out', transform: `translateX(${rolled ? dist : 0}px)` }
  const spin = {
    transition: 'transform 1.6s ease-in-out',
    transform: `rotate(${rolled ? 360 : 0}deg)`,
    transformOrigin: `${PAD + r}px ${ground - r}px`,
  }
  return (
    <svg viewBox={`0 0 ${width} ${ground + 40}`} style={{ width, maxWidth: '100%' }} role="img" aria-label={`A wheel ${d} across rolling once`}>
      <line x1="0" x2={width} y1={ground} y2={ground} stroke="#475569" strokeWidth="2" />
      {Array.from({ length: marks + 1 }, (_, k) => (
        <g key={k}>
          <rect x={PAD + k * d * U} y={ground + 4} width={d * U} height="8" fill={k % 2 ? SKY : '#1e3a5f'} opacity={k < marks ? 0.9 : 0} />
          {k > 0 && k <= marks && (
            <text x={PAD + k * d * U} y={ground + 28} textAnchor="middle" fill="#94a3b8" fontSize="11">
              {k}
            </text>
          )}
        </g>
      ))}
      <rect x={PAD} y={ground - 3} height="6" fill={AMBER} style={{ width: rolled ? dist : 0, transition: 'width 1.6s ease-in-out' }} />
      <g style={move}>
        <g style={spin}>
          <circle cx={PAD + r} cy={ground - r} r={r} fill="#0f172a" stroke={AMBER} strokeWidth="3" />
          <line x1={PAD} x2={PAD + 2 * r} y1={ground - r} y2={ground - r} stroke={SKY} strokeWidth="2" />
          <circle cx={PAD + r} cy={ground} r="4" fill="#fb7185" />
        </g>
      </g>
    </svg>
  )
}

const SIZES = [1, 2, 3]

function Play({ state, setState }) {
  const { d, rolled } = state
  const isRolled = rolled.includes(d)
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The blue line across the wheel, through its centre, is its <strong>diameter</strong>. The blue marks on the
        ground are each one diameter long. Roll the wheel exactly once round (the red dot comes back to the ground)
        and see how many diameters it covers. Try every size.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <Stepper label="diameter" value={d} min={1} max={3} onChange={v => setState({ ...state, d: v })} />
        <button
          type="button"
          disabled={isRolled}
          onClick={() => setState({ ...state, rolled: [...rolled, d] })}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          Roll once
        </button>
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Roll key={d} d={d} rolled={isRolled} />
      </div>
      <p className="mt-2 text-lg" data-testid="roll-readout">
        {isRolled
          ? `A wheel ${d} across rolls ${(3 * d).toLocaleString()} units and a bit more: 3 of its diameters, and about a seventh of a diameter more.`
          : `A wheel ${d} across. Roll it once.`}
      </p>
      <p className="mt-1 text-slate-400">Sizes rolled: {SIZES.filter(s => rolled.includes(s)).join(', ') || 'none yet'}</p>
    </div>
  )
}

function Reveal() {
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox="0 0 330 120" className="w-full max-w-md" role="img" aria-label="Three circles, each a scaled copy of the others">
          {SIZES.map((d, i) => {
            const r = d * 16
            const cx = [30, 100, 220][i]
            return (
              <g key={d}>
                <circle cx={cx} cy={110 - r} r={r} fill="none" stroke={AMBER} strokeWidth="2.5" />
                <line x1={cx - r} x2={cx + r} y1={110 - r} y2={110 - r} stroke={SKY} strokeWidth="2" />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every circle is a scaled copy of every other, the way the stick&apos;s shadow triangle was a copy of the
          pyramid&apos;s in 3.1. Make a circle twice as wide and its rim grows twice as long too. So the rim is always
          the same number of diameters, whatever the size.
        </p>
        <p>
          That number is a little more than 3. It is so important that it has its own name: <strong>π</strong>, the
          Greek letter pi. The rim of any circle is π diameters long.
        </p>
        <p className="text-slate-300">
          How much is &quot;a little more&quot;? Scribes in Babylon used 3 1/8. A list of measurements in the Bible
          describes a round bowl 10 cubits across with a line of 30 cubits round it, which makes π just 3. Pinning it
          down took Archimedes, next.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-round-the-wheel',
  order: '6.1',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'Round the wheel',
  threads: ['Shape', 'Measurement'],
  rigor: 1,
  move: 'invariant',
  hook: (
    <p>
      A cart wheel turns round once. How far has the cart moved? You can measure straight across a wheel with a
      ruler, but you can&apos;t lay a ruler round its curved rim. Is there a way to know one from the other?
    </p>
  ),
  initialState: { d: 1, rolled: [] },
  Play,
  playReady: state => state.rolled.length === SIZES.length,
  playNotReady: 'Roll every size of wheel',
  predict: {
    question: <p>A wheel 10 times as wide is rolled once. How many of <em>its own</em> diameters does it cover?</p>,
    choices: ['More than 3 and a bit', 'The same: 3 and a bit', 'Fewer than 3 and a bit'],
    response: guess => {
      if (guess === 'The same: 3 and a bit') return 'Yes, the same. Here is why it can’t be anything else.'
      if (guess === 'More than 3 and a bit') return 'The big wheel does cover more ground, but its diameter is bigger too, by the same amount. In its own diameters, it is the same.'
      return 'A bigger wheel’s rim and diameter both grow by the same amount, so the count of diameters doesn’t change.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>A cart wheel is 2 units across. The cart travels 60 units. How many whole turns does the wheel make?</p>,
    answer: 9,
    praise: 'Each turn covers a bit more than 6 units (3 and a bit diameters of 2), so 60 units is a bit fewer than 10 turns: 9 whole turns, and part of the tenth.',
    hint: v =>
      v === 10
        ? 'Each turn covers 3 diameters and a bit: a bit more than 6 units. So 10 turns would take you past 60.'
        : v === 30
          ? 'One turn covers the rim, not just the diameter: about 3 diameters.'
          : v === 20
            ? 'One turn covers about 3 diameters, and this wheel’s diameter is 2 units.'
            : 'How far does one turn go? The rim is a bit more than 3 diameters, and the diameter is 2.',
    solution: 'One turn rolls out the rim: a bit more than 3 × 2 = 6 units. Ten turns would go a bit more than 60, too far. So the wheel makes 9 whole turns (and a bit over half of the tenth).',
  },
  keep: 'Every circle’s rim is the same number of its own diameters, a little more than 3. That number is π.',
  symbols: <p>rim = π × diameter</p>,
  story: (
    <>
      <p>
        A clay tablet found at Susa, in Iran, uses 3 1/8. The Rhind papyrus finds a circle&apos;s area in a way that
        amounts to about 3 1/6. The bowl in the Bible (1 Kings 7:23) gives 3.
      </p>
      <p className="mt-2">
        The symbol π came much later. William Jones used it in 1706, and Leonhard Euler made it popular. It is the
        first letter of the Greek word for the distance round.
      </p>
    </>
  ),
  deeper: {
    question: <p>The Bible&apos;s bowl was 10 cubits across. Taking π as about 3 1/7, how many whole cubits would the line round it really need?</p>,
    answer: 31,
    praise: '10 × 3 1/7 = 31 3/7, so a line of 31 whole cubits and a bit more. The 30 in the text is a round number.',
    hint: () => '3 1/7 diameters of 10 cubits: 30 cubits, plus 10 sevenths of a cubit.',
    solution: '10 × 3 = 30, and 10 × 1/7 = 10/7, which is 1 and 3/7. So the rim is about 31 3/7 cubits: 31 whole cubits and a bit.',
  },
}
