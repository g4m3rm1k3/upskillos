import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const ROSE = '#fb7185'
const TRUE = 250000

const fmt = n => n.toLocaleString('en-US')

function Play({ state, setState }) {
  const { dist, slices, tried } = state
  const total = dist * slices
  const set = patch => {
    const next = { ...state, ...patch }
    const key = `${next.dist}/${next.slices}`
    setState({ ...next, tried: tried.includes(key) ? tried : [...tried, key] })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Measuring 5,000 stadia by pacing it out, and an angle by a shadow, both leave room for error. Nudge each
        measurement and watch what happens to the size of the Earth.
      </p>
      <div className="flex flex-wrap gap-4">
        <Stepper label="stadia to Syene" value={dist} min={4500} max={5500} step={250} onChange={v => set({ dist: v })} />
        <Stepper label="slices in a turn" value={slices} min={45} max={55} onChange={v => set({ slices: v })} />
      </div>
      <div className="mt-4 rounded-lg bg-slate-950 p-4">
        <p className="text-lg">
          {slices} × {fmt(dist)} = <strong className="text-amber-300" data-testid="earth-size">{fmt(total)}</strong> stadia
        </p>
        <div className="mt-3 h-4 rounded bg-slate-800">
          <div className="h-4 rounded bg-amber-400" style={{ width: `${(total / 310000) * 100}%`, transition: 'width 300ms' }} />
        </div>
        <p className="mt-2 text-slate-400">
          {total === TRUE ? "That's Eratosthenes' answer." : `${fmt(Math.abs(total - TRUE))} stadia ${total > TRUE ? 'more' : 'less'} than Eratosthenes' answer.`}
        </p>
      </div>
    </div>
  )
}

function Reveal() {
  const [extra, setExtra] = useState(250)
  const C = 120
  const R = 95
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Say the pacing was {fmt(extra)} stadia short, so the true distance is {fmt(5000 + extra)}. That extra bit is
        in every one of the 50 slices.
      </p>
      <Stepper label="extra stadia per slice" value={extra} min={0} max={500} step={50} onChange={setExtra} />
      <div className="mt-3 flex flex-wrap items-center gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <svg viewBox="0 0 240 240" style={{ width: 240 }} role="img" aria-label="The extra distance in all 50 slices">
            <circle cx={C} cy={C} r={R} fill="#0f2a44" stroke="#475569" strokeWidth="2" />
            {Array.from({ length: 50 }, (_, i) => {
              const a = (i / 50) * 2 * Math.PI
              const b = a + (extra / 5250) * (2 * Math.PI) / 50 * 4
              return (
                <path
                  key={i}
                  d={`M${C + R * Math.sin(a)},${C - R * Math.cos(a)}A${R},${R} 0 0,1 ${C + R * Math.sin(b)},${C - R * Math.cos(b)}`}
                  stroke={ROSE}
                  strokeWidth="7"
                  fill="none"
                />
              )
            })}
          </svg>
        </div>
        <p className="text-xl" data-testid="error-total">
          50 × {fmt(extra)} = <strong className="text-amber-300">{fmt(50 * extra)}</strong> stadia off
        </p>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          The answer is 50 copies of the distance, so it holds 50 copies of any error in the distance too. A small
          slip in a measurement you multiply comes out as a big slip in the answer.
        </p>
        <p className="text-slate-300">
          That tells you where to spend your care: on the measurement that gets multiplied. And it tells you how
          far to trust the answer: never more closely than the errors you put in.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-how-sure-can-you-be',
  order: '3.6',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'How sure can you be?',
  threads: ['Measurement'],
  rigor: 1,
  move: 'simplify',
  hook: (
    <p>
      5,000 stadia is a suspiciously round number, and so is 1/50 of a turn. Real measurements are never exact.
      If Eratosthenes was a little off, how far off was his Earth?
    </p>
  ),
  initialState: { dist: 5000, slices: 50, tried: [] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try three different pairs of measurements',
  predict: {
    question: <p>Suppose the true distance to Syene was 5,250 stadia, not 5,000, and the angle really was 1/50 of a turn. How many more stadia round would the Earth be?</p>,
    response: guess => {
      if (guess === 12500) return 'Yes, 12,500. The 250 is copied into all 50 slices.'
      if (guess === 250) return '250 is the error in one slice. The Earth is 50 slices round, and every one is 250 longer.'
      return `It's 12,500: 250 extra in each of the 50 slices.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>Keep the distance at 5,000 stadia, but suppose the shadow angle was really 1/48 of a turn, not 1/50. How many stadia smaller would the Earth come out?</p>,
    answer: 10000,
    praise: '48 × 5,000 = 240,000, against 50 × 5,000 = 250,000: 10,000 smaller.',
    hint: v =>
      v === 240000
        ? "That's the new size. The question asks how much smaller than 250,000 it is."
        : 'With 1/48 of a turn, 48 slices go round, each 5,000 long. Compare with 50 slices.',
    solution: 'If the angle is 1/48 of a turn, 48 slices of 5,000 stadia go round: 240,000. Eratosthenes’ 50 slices gave 250,000. The difference is 2 slices: 10,000 stadia.',
  },
  keep: 'An error in a measurement gets multiplied along with it: 250 stadia wrong in 1/50 of the way round is 12,500 wrong all the way round. Trust an answer only as far as its measurements.',
  symbols: <p>error in the answer = error in the measurement × the multiplier.</p>,
  story: (
    <>
      <p>
        Around 100 BC, Posidonius tried again with a star instead of the Sun. The bright star Canopus just grazed
        the horizon at Rhodes, and stood 1/48 of a turn higher at Alexandria. With 5,000 stadia between them he got
        240,000 stadia. Later, the geographer Strabo reported a figure of 180,000 based on a shorter distance.
      </p>
      <p className="mt-2">
        Ptolemy used the small figure, and his geography was copied for 1,300 years. Christopher Columbus, reading
        small estimates like it, believed Asia lay only a few thousand miles west of Spain. The Earth was much
        bigger than he thought. He survived only because the Americas were in the way.
      </p>
    </>
  ),
  deeper: {
    question: <p>The smaller figure: an angle of 1/48 of a turn and a distance of 3,750 stadia. How far round is the Earth then?</p>,
    answer: 180000,
    praise: '48 × 3,750 = 180,000 stadia: Ptolemy’s Earth, about a quarter too small.',
    hint: () => '48 slices, each 3,750 long.',
    solution: '48 × 3,750 = 180,000. With the angle at 1/48 of a turn, 48 slices of 3,750 stadia make the full circle.',
  },
}
