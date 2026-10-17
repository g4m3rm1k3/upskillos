import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const R = 10
const S = 9

// Side view: the ball inside its cylinder, and a double cone with its tip at the centre. A slice at height h.
function Side({ h }) {
  const cx = 110
  const cy = 110
  const ball = Math.sqrt(R * R - h * h)
  const y = cy - h * S
  return (
    <svg viewBox="0 0 220 220" style={{ width: 220, maxWidth: '100%' }} role="img" aria-label={`A slice at height ${h}`}>
      <rect x={cx - R * S} y={cy - R * S} width={2 * R * S} height={2 * R * S} fill="none" stroke={SKY} strokeWidth="2" />
      <circle cx={cx} cy={cy} r={R * S} fill={AMBER} fillOpacity="0.12" stroke={AMBER} strokeWidth="2" />
      <polygon points={`${cx - R * S},${cy - R * S} ${cx + R * S},${cy - R * S} ${cx},${cy} ${cx - R * S},${cy + R * S} ${cx + R * S},${cy + R * S} ${cx},${cy}`} fill={ROSE} fillOpacity="0.12" stroke={ROSE} strokeWidth="1.5" />
      <line x1={cx - R * S - 6} x2={cx + R * S + 6} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 3" />
      <line x1={cx} y1={cy} x2={cx + ball * S} y2={y} stroke="#e2e8f0" strokeWidth="1.5" />
      <line x1={cx} y1={cy} x2={cx} y2={y} stroke="#e2e8f0" strokeWidth="1.5" />
      <line x1={cx} y1={y} x2={cx + ball * S} y2={y} stroke={AMBER} strokeWidth="3" />
      <line x1={cx - h * S} y1={y} x2={cx} y2={y} stroke={ROSE} strokeWidth="3" />
      <text x={cx - 4} y={(cy + y) / 2 + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">{h > 1 ? `height ${h}` : ''}</text>
      <text x={cx + (ball * S) / 2 + 8} y={(cy + y) / 2 + 12} fontSize="10" fill="#cbd5e1">10</text>
    </svg>
  )
}

function Discs({ h }) {
  const discs = [
    { name: 'ball', sq: R * R - h * h, colour: AMBER },
    { name: 'cone', sq: h * h, colour: ROSE },
    { name: 'cylinder', sq: R * R, colour: SKY },
  ]
  return (
    <div className="flex flex-wrap items-end gap-4">
      {discs.map(d => (
        <div key={d.name} className="flex flex-col items-center">
          <svg viewBox="0 0 64 64" style={{ width: 64 }} role="img" aria-label={`${d.name} slice`}>
            <circle cx="32" cy="32" r={Math.max(0.5, Math.sqrt(d.sq) * 3)} fill={d.colour} fillOpacity="0.8" />
          </svg>
          <span className="text-sm text-slate-300">{d.name} slice</span>
          <span className="font-mono text-amber-200">{d.sq}</span>
        </div>
      ))}
    </div>
  )
}

function Play({ state, setState }) {
  const { h, tried } = state
  const pick = v => setState({ h: v, tried: tried.includes(v) ? tried : [...tried, v] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A ball fits exactly inside a <strong>cylinder</strong> (a can). Inside the same can, two <strong>cones</strong>{' '}
        meet tip to tip at the centre. The ball&apos;s radius is 10. Slice all three across at the same height and
        compare the round slices. Each slice&apos;s area is π × radius × radius (6.3), so compare radius × radius.
      </p>
      <Stepper label="height" value={h} min={0} max={10} onChange={pick} />
      <div className="mt-3 flex flex-wrap items-center gap-6 rounded-lg bg-slate-950 p-3">
        <Side h={h} />
        <Discs h={h} />
      </div>
      <p className="mt-2 text-lg" data-testid="slice-sum">
        Radius × radius: ball {R * R - h * h} + cone {h * h} = {R * R}, the cylinder&apos;s.
      </p>
      <p className="text-slate-400">
        The ball&apos;s slice comes from the right triangle (2.7): its sides are the height, the slice&apos;s radius, and
        the ball&apos;s radius, 10. So slice × slice = 100 − height × height.
      </p>
    </div>
  )
}

function Reveal() {
  const [stacked, setStacked] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        At every height, the ball&apos;s slice plus the cone&apos;s slice exactly equals the cylinder&apos;s slice. Stack up
        all the slices of the top half: the top half of the ball and the top cone, together, fill the top half of
        the cylinder exactly.
      </p>
      {!stacked && (
        <button type="button" onClick={() => setStacked(true)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Stack the slices
        </button>
      )}
      {stacked && (
        <>
          <div className="rounded-lg bg-slate-950 p-4">
            <p className="mb-2 text-slate-400">The top half of the cylinder, in 3 equal parts:</p>
            <div className="flex h-10 overflow-hidden rounded-lg text-sm font-semibold text-slate-950">
              <div className="flex flex-1 items-center justify-center" style={{ background: ROSE }}>cone</div>
              <div className="flex flex-[2] items-center justify-center border-l-2 border-slate-950" style={{ background: AMBER }}>
                half the ball
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-lg leading-relaxed">
            <p>
              The cone takes 1 of the 3 parts, so half the ball takes the other 2. The same goes for the bottom half.
              So <strong className="text-amber-300" data-testid="sphere-result">the ball fills 2/3 of its cylinder</strong>.
            </p>
            <p className="text-slate-300">
              You never had to measure a curved surface. Slicing turned a hard solid into flat circles, and the right
              triangle of 2.7 did the rest.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-sphere-in-the-cylinder',
  order: '6.5',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'The sphere in the cylinder',
  threads: ['Shape', 'Measurement'],
  rigor: 2,
  move: 'slice-up',
  hook: (
    <p>
      A solid&apos;s <strong>volume</strong> is how much space it fills, counted in small cubes or in cups of water, as
      area counts squares. Archimedes asked for one picture on his tomb: a ball, called a <strong>sphere</strong>,
      inside the cylinder it just fits. Why was that the discovery he was proudest of?
    </p>
  ),
  initialState: { h: 6, tried: [6] },
  Play,
  playReady: state => state.tried.length >= 4,
  playNotReady: 'Try at least four heights',
  predict: {
    question: (
      <p>
        One more fact, known since Democritus and proved by Eudoxus: a cone fills exactly 1/3 of the cylinder it fits
        in. What fraction of the cylinder does the ball fill?
      </p>
    ),
    choices: ['1/2', '2/3', '3/4'],
    response: guess => {
      if (guess === '2/3') return 'Yes, 2/3. Here is how the slices prove it.'
      if (guess === '1/2') return 'The ball fills more than half: it bulges out to touch the can all the way round its middle.'
      return '3/4 is too much: the ball leaves room at the top and bottom corners of the can.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>A can holds exactly 36 cups of water. A ball that just fits is put inside. How many cups of water still fit in the can around it?</p>,
    answer: 12,
    praise: 'The ball fills 2/3 of 36, which is 24 cups, leaving 12. Around the ball there is exactly as much room as the cone would fill.',
    hint: v =>
      v === 24
        ? 'That is how much the ball fills. The question asks what is left around it.'
        : v === 18
          ? 'The ball fills more than half the can: 2/3 of it.'
          : 'The ball fills 2/3 of the can. How much is 2/3 of 36, and what is left?',
    solution: '1/3 of 36 is 12, so 2/3 is 24 cups for the ball. 36 − 24 = 12 cups of water fit around it.',
  },
  keep: 'Slice a ball, a cone and a cylinder at the same height: ball + cone = cylinder, slice by slice. So the ball fills 2/3 of the cylinder it fits in.',
  symbols: <p>(slice of ball) + (slice of cone) = (slice of cylinder), because (10 × 10 − h × h) + h × h = 10 × 10.</p>,
  story: (
    <>
      <p>
        Plutarch says Archimedes asked for a sphere in a cylinder on his tomb. In 75 BC the Roman Cicero, serving in
        Sicily, went looking for it and found it overgrown with brambles, recognising it by that carving.
      </p>
      <p className="mt-2">
        How did Archimedes find the 2/3? In a book called <em>The Method</em>, he explains that he first weighed the
        slices against each other on an imaginary lever (6.4), then proved the result properly by squeezing. The book
        was lost for centuries. In 1906 it turned up underneath a prayer book: in 1229 a scribe had scraped the old
        pages and written over them.
      </p>
    </>
  ),
  deeper: {
    question: <p>A ball holds 20 cups. How many cups does a cone of the same width and height hold?</p>,
    answer: 10,
    praise: 'The ball is 2 parts of 3 and the cone 1 part, so the cone holds half as much as the ball: 10. The cylinder holds 30.',
    hint: () => 'In the cylinder, the cone is 1 part and the ball 2 parts. If 2 parts are 20 cups, what is 1 part?',
    solution: 'The cylinder splits into 3 equal parts: 2 for the ball and 1 for the cone. 2 parts are 20 cups, so 1 part is 10: the cone holds 10.',
  },
}
