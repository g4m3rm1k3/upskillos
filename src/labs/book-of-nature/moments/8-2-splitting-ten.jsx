import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const ROSE = '#fb7185'
const S = 22

const cells = (x0, y0, w, h, fill, key) =>
  Array.from({ length: w * h }, (_, i) => (
    <rect key={`${key}${i}`} x={2 + (x0 + (i % w)) * S + 1} y={2 + (y0 + Math.floor(i / w)) * S + 1} width={S - 2} height={S - 2} rx="2" fill={fill} fillOpacity="0.85" />
  ))

function Play({ state, setState }) {
  const { a, tried } = state
  const b = 10 - a
  const set = v => setState({ a: v, tried: tried.includes(v * (10 - v)) ? tried : [...tried, v * (10 - v)].sort((x, y) => x - y) })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Split 10 into two parts and multiply them. The product is a rectangle, one part across and the other down.
        Which split makes the biggest rectangle?
      </p>
      <Stepper label="first part" value={a} min={1} max={9} onChange={set} />
      <div className="mt-3 rounded-lg bg-slate-950 p-4">
        <svg viewBox={`0 0 ${9 * S + 4} ${9 * S + 4}`} style={{ width: 9 * S + 4, maxWidth: '100%' }} role="img" aria-label={`a ${a} by ${b} rectangle`}>
          {cells(0, 0, a, b, AMBER, 'r')}
        </svg>
        <p className="mt-2 text-lg" data-testid="split-product">
          {a} + {b} = 10, and {a} × {b} = <strong className="text-amber-300">{a * b}</strong>
        </p>
      </div>
      <p className="mt-2 text-slate-400" data-testid="products">
        Products found: {tried.join(', ')}
      </p>
    </div>
  )
}

// The rectangle (5 + d) by (5 − d): cut off the strip d wide and lay it along the bottom.
function Reveal() {
  const [d, setD] = useState(2)
  const [moved, setMoved] = useState(false)
  const h = 5 - d
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Write each split as 5 + something and 5 − something: 7 and 3 are 5 + 2 and 5 − 2. Cut the strip that sticks
        out past 5, and move it.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Stepper label="something" value={d} min={1} max={4} onChange={v => { setD(v); setMoved(false) }} />
        <button type="button" onClick={() => setMoved(!moved)} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600">
          {moved ? 'Put the strip back' : 'Move the strip'}
        </button>
      </div>
      <div className="mt-3 rounded-lg bg-slate-950 p-4">
        <svg viewBox={`0 0 ${9 * S + 4} ${5 * S + 8}`} style={{ width: 9 * S + 4, maxWidth: '100%' }} role="img" aria-label={moved ? 'a square with a corner missing' : `a ${5 + d} by ${h} rectangle`}>
          {cells(0, 0, 5, h, AMBER, 'a')}
          {moved ? cells(0, h, h, d, ROSE, 's') : cells(5, 0, d, h, ROSE, 's')}
          {moved && <rect x={2 + h * S} y={2 + h * S} width={d * S} height={d * S} fill="none" stroke="#e2e8f0" strokeDasharray="4 4" />}
        </svg>
        <p className="mt-2 text-lg" data-testid="split-picture">
          {5 + d} × {h} = {(5 + d) * h}
          {moved && ` = 5 × 5 − ${d} × ${d} = 25 − ${d * d}`}
        </p>
      </div>
      {moved && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Moved, the strip turns the rectangle into the 5 × 5 square with a corner missing, and the corner is
            something × something. So the product of 5 + something and 5 − something is always 25 − something ×
            something.
          </p>
          <p>
            The missing corner is never smaller than nothing, so no split beats 25, not even with fractions: 4 1/2 ×
            5 1/2 is 25 − 1/4. The biggest product comes from the even split, 5 and 5.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-splitting-ten',
  order: '8.2',
  episodeNumber: 8,
  episode: 'Duels over the cubic',
  title: 'Splitting ten',
  threads: ['Number', 'Shape'],
  rigor: 2,
  move: 'draw-picture',
  hook: (
    <p>
      Italian merchants loved puzzles that split a number into parts: &quot;divide 10 into two parts so that …&quot;.
      Here is the simplest one. Split 10 into two parts and multiply them. How big can the answer be?
    </p>
  ),
  initialState: { a: 1, tried: [9] },
  Play,
  playReady: state => state.tried.length >= 4 && state.tried.includes(25),
  playNotReady: 'Try at least four splits, including the even one',
  predict: {
    question: <p>Fractions are allowed now: 4 1/2 and 5 1/2, or 4 3/4 and 5 1/4. Can any split of 10 beat 25?</p>,
    choices: ['Yes, some split beats 25', 'No, 25 is the most', 'Can’t tell without trying them all'],
    response: guess => {
      if (guess === 'No, 25 is the most') return 'Yes, 25 is the most. And you can be sure without trying every split.'
      if (guess === 'Yes, some split beats 25') return 'The split next to 5 and 5 gets close, but none beats it. The picture shows why.'
      return 'There are endlessly many splits, too many to try. But one picture covers all of them.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Split 20 into two parts that multiply to 96. What is the bigger part?</p>,
    answer: 12,
    praise: '10 × 10 = 100, and 96 is 4 short: the missing corner is 2 × 2. So the parts are 10 + 2 and 10 − 2: 12 and 8.',
    hint: v =>
      v === 8
        ? '8 is the smaller part. What is the other?'
        : v === 10
          ? '10 and 10 multiply to 100, not 96. How far are the parts from 10?'
          : 'Write the parts as 10 + something and 10 − something. They multiply to 100 − something × something. What corner makes 96?',
    solution: 'The parts are 10 + something and 10 − something, and they multiply to 100 − something × something. For 96 the corner is 4 = 2 × 2, so the parts are 12 and 8. Check: 12 × 8 = 96.',
  },
  keep: 'Two parts the same distance either side of half multiply to half × half with a corner missing: 7 × 3 is 5 × 5 less a 2 × 2 corner. So the even split gives the biggest product.',
  symbols: <p>(5 + d) × (5 − d) = 5 × 5 − d × d</p>,
  story: (
    <p>
      Euclid proved this with the same picture, in Book II of the <em>Elements</em>: the rectangle on two unequal parts,
      together with the square on the difference from the middle, makes the square on half the line. Merchant
      arithmetic books in Italy were full of puzzles that it unlocks.
    </p>
  ),
}
