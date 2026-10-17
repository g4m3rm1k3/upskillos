import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const COUNTS = [4, 8, 16, 32]
const R = 60

// A wedge `angle` wide with its tip at (x, y): pointing up (curved end below) or down (curved end above).
function wedge(x, y, angle, up) {
  const s = up ? 1 : -1
  const pts = [[x, y]]
  for (let i = 0; i <= 12; i++) {
    const p = -angle / 2 + (angle * i) / 12
    pts.push([x + s * R * Math.sin(p), y + s * R * Math.cos(p)])
  }
  return pts.map(p => p.join(',')).join(' ')
}

function Circle({ n }) {
  const angle = (2 * Math.PI) / n
  return (
    <svg viewBox="0 0 140 140" style={{ width: 140 }} role="img" aria-label={`A circle cut into ${n} wedges`}>
      {Array.from({ length: n }, (_, k) => {
        const pts = [[70, 70]]
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI + k * angle + (angle * i) / 12
          pts.push([70 + R * Math.cos(a), 70 + R * Math.sin(a)])
        }
        return <polygon key={k} points={pts.map(p => p.join(',')).join(' ')} fill={k < n / 2 ? AMBER : SKY} fillOpacity="0.85" stroke="#0f172a" strokeWidth="1" />
      })}
    </svg>
  )
}

// The wedges laid head to tail: the top half pointing down, the bottom half pointing up, in between.
function Strip({ n, outline, zoom = 1 }) {
  const angle = (2 * Math.PI) / n
  const chord = 2 * R * Math.sin(angle / 2)
  const sag = R * (1 - Math.cos(angle / 2))
  const half = n / 2
  const len = Math.PI * R
  const width = Math.max(half * chord + chord / 2, len) + 20
  const top = 10 + sag
  return (
    <svg viewBox={`0 0 ${width} ${R + 2 * sag + 20}`} style={{ width: width * zoom, maxWidth: '100%' }} role="img" aria-label="The wedges laid side by side">
      {Array.from({ length: half }, (_, k) => (
        <g key={k}>
          <polygon points={wedge(10 + chord * (k + 0.5), top + R, angle, false)} fill={AMBER} fillOpacity="0.85" stroke="#0f172a" strokeWidth="1" />
          <polygon points={wedge(10 + chord * (k + 1), top, angle, true)} fill={SKY} fillOpacity="0.85" stroke="#0f172a" strokeWidth="1" />
        </g>
      ))}
      {outline && <rect x="10" y={top} width={len} height={R} fill="none" stroke="#e2e8f0" strokeDasharray="5 4" strokeWidth="1.5" />}
    </svg>
  )
}

function Play({ state, setState }) {
  const { n, tried } = state
  const pick = k => setState({ n: k, tried: tried.includes(k) ? tried : [...tried, k] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Cut the circle into wedges, like a pizza. Lay the top half&apos;s wedges (amber) pointing down and the bottom
        half&apos;s (blue) pointing up, fitted in between. Cut thinner and thinner wedges and watch the shape.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Number of wedges">
        {COUNTS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === n ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {k} wedges
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-950 p-3">
        <Circle n={n} />
        <Strip n={n} />
      </div>
      <p className="mt-2 text-slate-400" data-testid="wedges-tried">Tried: {COUNTS.filter(k => tried.includes(k)).join(', ')} wedges</p>
    </div>
  )
}

function Reveal() {
  const [step, setStep] = useState(0)
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Strip n={32} outline zoom={2.2} />
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          The thinner the wedges, the closer the strip comes to the dashed rectangle. Its height is a wedge&apos;s
          length: one <strong>radius</strong>. Its top edge is made of the amber wedges&apos; curved ends: half the
          rim. The bottom edge is the other half.
        </p>
        <p data-testid="pizza-area">
          So the circle&apos;s area is a rectangle <strong className="text-amber-300">half the rim long and one radius tall</strong>:
          area = half the rim × the radius.
        </p>
      </div>
      {step >= 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-slate-950 p-3">
          <svg viewBox="0 0 140 140" style={{ width: 140 }} role="img" aria-label="A circle and four squares on its radius">
            {[0, 1].map(i =>
              [0, 1].map(j => <rect key={`${i}${j}`} x={10 + i * R} y={10 + j * R} width={R} height={R} fill="#1e293b" stroke="#64748b" />),
            )}
            <circle cx="70" cy="70" r={R} fill={AMBER} fillOpacity="0.55" stroke={AMBER} strokeWidth="2" />
          </svg>
          <p className="max-w-sm text-lg leading-relaxed">
            The rim is π diameters, so half the rim is π radii. The area is π radii × one radius: π squares on the
            radius. Four such squares cover the circle with corners to spare; the circle fills a little more than 3 of
            them.
          </p>
        </div>
      )}
      {step < 1 && (
        <button type="button" onClick={() => setStep(1)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Compare with squares on the radius
        </button>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-pizza',
  order: '6.3',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'The pizza',
  threads: ['Shape', 'Measurement', 'Change'],
  rigor: 2,
  move: 'slice-up',
  hook: (
    <p>
      Area is a count of squares (2.1), and straight-sided fields can be cut into rectangles. But a circle has no
      straight sides at all. How many squares does a round field hold?
    </p>
  ),
  initialState: { n: 4, tried: [4] },
  Play,
  playReady: state => state.tried.includes(32) && state.tried.length >= 3,
  playNotReady: 'Try at least three cuts, up to 32 wedges',
  predict: {
    question: <p>With very thin wedges, the strip becomes a rectangle one radius tall. How long is it?</p>,
    choices: ['As long as the whole rim', 'Half as long as the rim', 'As long as the diameter'],
    response: guess => {
      if (guess === 'Half as long as the rim') return 'Yes: half the rim runs along the top and the other half along the bottom.'
      if (guess === 'As long as the whole rim') return 'The rim is all there, but it is split: half along the top edge and half along the bottom. The strip is only half the rim long.'
      return 'It is longer than that: the wedges’ curved ends make up its edges, and they add up to half the rim, about π radii.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A round pond is 14 units across. Taking π as 3 1/7, its rim is 44 units. How many square units does the pond
        cover?
      </p>
    ),
    answer: 154,
    praise: 'Half the rim is 22, the radius is 7: a rectangle 22 by 7 holds 154 squares.',
    hint: v =>
      v === 308
        ? 'That uses the whole rim. Half the rim runs along the top of the rectangle; the other half is along the bottom.'
        : v === 616 || v === 196
          ? 'The rectangle is one radius tall, not one diameter. What is the radius of a pond 14 across?'
          : 'Make the rectangle: half the rim long, one radius tall. Then count its squares, rows × columns.',
    solution: 'Half the rim is 44 ÷ 2 = 22. The radius is 14 ÷ 2 = 7. The rectangle is 22 by 7, so its area is 154 square units.',
  },
  keep: 'Slice a circle into thin wedges and lay them head to tail: a rectangle half the rim long and one radius tall. Area = half the rim × the radius.',
  symbols: <p>area = (π × radius) × radius, written π r² where r is the radius and r² means r × r.</p>,
  story: (
    <>
      <p>
        Archimedes put it this way in <em>Measurement of a Circle</em>: a circle has the same area as a right triangle
        whose two short sides are the radius and the rim. (That triangle is half the rectangle above.) He proved it
        with a squeeze: the area can&apos;t be more than the triangle&apos;s, and can&apos;t be less.
      </p>
      <p className="mt-2">
        Johannes Kepler, measuring wine barrels in 1615, did it the wedge way: he treated a circle as made of
        infinitely many thin triangles, all with their tips at the centre. It gave right answers long before anyone
        could say exactly what &quot;infinitely thin&quot; meant.
      </p>
    </>
  ),
  deeper: {
    question: <p>A pond twice as wide, 28 units across, has a rim of 88. How many square units does it cover?</p>,
    answer: 616,
    praise: '44 × 14 = 616: four times the 154. Twice as wide means twice as long and twice as tall, so four times the area.',
    hint: () => 'Half the rim is 44, the radius is 14.',
    solution: 'Half the rim is 88 ÷ 2 = 44 and the radius is 28 ÷ 2 = 14. The rectangle is 44 by 14: 616 square units, four times the smaller pond.',
  },
}
