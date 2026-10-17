import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const U = 30
const LEFT = { blocks: 3, at: 4 }

// A beam on a pivot with blocks stacked at whole-number distances. It tips toward the heavier turn.
function Beam({ left, right }) {
  const mid = 7 * U
  const turnL = left.blocks * left.at
  const turnR = right.blocks * right.at
  const tilt = turnL === turnR ? 0 : Math.max(-12, Math.min(12, (turnR - turnL) * 1.5))
  const stack = (side, { blocks, at }, colour) =>
    Array.from({ length: blocks }, (_, i) => (
      <rect key={`${side}${i}`} x={mid + side * at * U - 11} y={98 - (i + 1) * 20} width="22" height="18" rx="3" fill={colour} />
    ))
  return (
    <svg viewBox={`0 0 ${14 * U} 170`} style={{ width: 14 * U, maxWidth: '100%' }} role="img" aria-label={turnL === turnR ? 'The beam balances' : 'The beam tips'}>
      <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${mid}px 100px`, transition: 'transform 0.5s' }}>
        <rect x={U * 0.5} y="98" width={13 * U} height="8" rx="3" fill="#94a3b8" />
        {Array.from({ length: 13 }, (_, k) => k - 6).map(d => (
          <g key={d}>
            <line x1={mid + d * U} x2={mid + d * U} y1="106" y2="112" stroke="#64748b" />
            {d !== 0 && (
              <text x={mid + d * U} y="124" textAnchor="middle" fontSize="10" fill="#64748b">
                {Math.abs(d)}
              </text>
            )}
          </g>
        ))}
        {stack(-1, left, SKY)}
        {stack(1, right, AMBER)}
      </g>
      <polygon points={`${mid},106 ${mid - 14},150 ${mid + 14},150`} fill="#475569" />
    </svg>
  )
}

const balanced = r => r.blocks * r.at === LEFT.blocks * LEFT.at

function Play({ state, setState }) {
  const { right, found } = state
  const set = change => {
    const next = { ...right, ...change }
    const key = `${next.blocks}@${next.at}`
    setState({ right: next, found: balanced(next) && !found.includes(key) ? [...found, key] : found })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The blue side has 3 blocks, 4 steps from the middle. Choose how many amber blocks to use and how far out to
        put them. Find every way to make the beam balance.
      </p>
      <div className="mb-3 flex flex-wrap gap-4">
        <Stepper label="blocks" value={right.blocks} min={1} max={6} onChange={v => set({ blocks: v })} />
        <Stepper label="distance" value={right.at} min={1} max={6} onChange={v => set({ at: v })} />
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Beam left={LEFT} right={right} />
      </div>
      <p className={`mt-2 text-lg ${balanced(right) ? 'text-emerald-400' : 'text-slate-300'}`} data-testid="beam-state">
        {balanced(right) ? 'It balances!' : right.blocks * right.at > 12 ? 'The amber side goes down.' : 'The blue side goes down.'}
      </p>
      <p className="text-slate-400" data-testid="balances">
        Balances found: {found.map(k => k.replace('@', ' blocks at ')).join('; ') || 'none yet'}
      </p>
    </div>
  )
}

const SHAPES = [
  [2, 6],
  [4, 3],
  [6, 2],
  [1, 12],
]

function Rect({ blocks, at, colour, label }) {
  const S = 14
  return (
    <div className="flex flex-col items-start gap-1">
      <svg viewBox={`0 0 ${at * S + 2} ${blocks * S + 2}`} style={{ width: at * S + 2 }} role="img" aria-label={label}>
        {Array.from({ length: blocks * at }, (_, i) => (
          <rect key={i} x={1 + (i % at) * S} y={1 + Math.floor(i / at) * S} width={S - 2} height={S - 2} rx="2" fill={colour} fillOpacity="0.85" />
        ))}
      </svg>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  )
}

function Reveal() {
  const [shape, setShape] = useState(0)
  const [b, a] = SHAPES[shape]
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Draw each side as a rectangle: one row for each block, as long as its distance. The blue side is 3 rows of 4.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {SHAPES.map(([bl, d], k) => (
          <button
            key={k}
            type="button"
            onClick={() => setShape(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === shape ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {bl} at {d}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-8 rounded-lg bg-slate-950 p-4">
        <Rect blocks={3} at={4} colour={SKY} label="3 blocks × 4 steps = 12" />
        <Rect blocks={b} at={a} colour={AMBER} label={`${b} ${b === 1 ? 'block' : 'blocks'} × ${a} steps = ${b * a}`} />
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every balance is a different rectangle with the same number of squares, 12, like the rectangles of 60
          pebbles in 2.5. That is the <strong>law of the lever</strong>: the beam balances when weight × distance is
          the same on both sides.
        </p>
        <p>
          Half the weight balances at twice the distance. One block balances the three at 12 steps: off the end of
          this beam, but not off a longer one. A long enough lever lets a small weight balance, or lift, any weight
          at all.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-the-lever',
  order: '6.4',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'The lever',
  threads: ['Measurement', 'Number'],
  rigor: 1,
  move: 'draw-picture',
  hook: (
    <p>
      A child can balance an adult on a seesaw, if the child sits far enough out. Builders move stones with a long
      bar no one could lift by hand. How far out do you need to be?
    </p>
  ),
  initialState: { right: { blocks: 1, at: 1 }, found: [] },
  Play,
  playReady: state => state.found.length >= 3,
  playNotReady: 'Find three ways to balance',
  predict: {
    question: <p>The blue side still has 3 blocks at 4 steps. You have only 1 amber block. How many steps out must it go to balance?</p>,
    response: guess => {
      if (guess === 12) return 'Yes, 12: off the end of this beam. Here is the rule behind every balance.'
      if (guess === 4) return 'At 4 steps, one block balances only one of the three. It must go further.'
      if (guess === 7) return 'Adding 3 and 4 doesn’t match your balances: 2 blocks balanced at 6, and 2 + 6 isn’t 7 either. Look at the rectangles.'
      if (guess === 6) return '6 steps balanced 2 blocks. One block, half as heavy, must go further.'
      return `Not ${guess}. Look at your balances: what is the same about all of them?`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A crowbar rests on a stone. The rock to be moved pushes down with a weight of 600, 1 hand-width from the
        stone. You can push down with a weight of 50. How many hand-widths from the stone must you push?
      </p>
    ),
    answer: 12,
    praise: '600 × 1 = 600, and 50 × 12 = 600. Push 12 hand-widths out and you balance the rock; push a little harder and it moves.',
    hint: v =>
      v === 550
        ? 'Weights and distances multiply on each side; they don’t subtract. 50 × what = 600 × 1?'
        : 'The rock side is 600 × 1. Your side is 50 × (distance). Make them equal.',
    solution: 'The rock side is weight × distance = 600 × 1 = 600. Your side is 50 × distance. 50 × 12 = 600, so push 12 hand-widths from the stone.',
  },
  keep: 'A lever balances when weight × distance is the same on both sides: half the weight balances at twice the distance.',
  symbols: <p>weight × distance (left) = weight × distance (right)</p>,
  story: (
    <>
      <p>
        Archimedes proved the law of the lever in <em>On the Equilibrium of Planes</em>, starting from a few agreed
        facts, the way Euclid did (4.4). &quot;Give me a place to stand, and I will move the Earth&quot; is how a
        writer named Pappus reported his boast, more than 500 years later.
      </p>
      <p className="mt-2">
        When Rome attacked Syracuse in 213 BC, Archimedes built war machines for its defence: cranes that lifted ships
        out of the water, according to the historian Polybius. He was killed when the city fell in 212 BC. The story
        that his last words were &quot;Don&apos;t disturb my circles&quot; is a legend.
      </p>
    </>
  ),
  deeper: {
    question: <p>On a seesaw, a child weighing 30 sits 4 steps from the middle. Where must a child weighing 40 sit to balance?</p>,
    answer: 3,
    praise: '30 × 4 = 120 and 40 × 3 = 120. The heavier child sits closer in.',
    hint: () => 'The first side is 30 × 4. What times 40 gives the same?',
    solution: '30 × 4 = 120. The other child needs 40 × distance = 120, so the distance is 3.',
  },
}
