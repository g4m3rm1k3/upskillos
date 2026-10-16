import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const ROSE = '#fb7185'

const RADIUS_KM = 6400
// Distance to the horizon in km from a height in metres, to the nearest kilometre.
const horizon = m => Math.round(Math.sqrt((2 * RADIUS_KM * m) / 1000 + (m / 1000) ** 2))

const HEIGHTS = [
  { m: 2, name: 'standing on the shore', px: 8 },
  { m: 8, name: 'a ship’s lookout', px: 22 },
  { m: 50, name: 'a lighthouse', px: 48 },
  { m: 200, name: 'a cliff', px: 90 },
]

// The Earth's curve drawn hugely exaggerated, with the line of sight just touching it.
function Curve({ px, triangle }) {
  const C = [70, 520]
  const R = 400
  const eye = [C[0], C[1] - R - px]
  const phi = Math.acos(R / (R + px))
  const touch = [C[0] + R * Math.sin(phi), C[1] - R * Math.cos(phi)]
  return (
    <svg viewBox="0 0 420 230" className="w-full" style={{ maxWidth: 480 }} role="img" aria-label="The line of sight touching the curve of the Earth">
      <circle cx={C[0]} cy={C[1]} r={R} fill="#0f2a44" stroke="#475569" strokeWidth="2" />
      <line x1={eye[0]} y1={eye[1]} x2={eye[0]} y2={C[1] - R} stroke={GREEN} strokeWidth="4" />
      <line x1={eye[0]} y1={eye[1]} x2={touch[0] + (touch[0] - eye[0]) * 0.3} y2={touch[1] + (touch[1] - eye[1]) * 0.3} stroke={AMBER} strokeWidth="2" strokeDasharray="5 4" />
      <line x1={eye[0]} y1={eye[1]} x2={touch[0]} y2={touch[1]} stroke={AMBER} strokeWidth="3" />
      <circle cx={touch[0]} cy={touch[1]} r="5" fill={ROSE} />
      <circle cx={eye[0]} cy={eye[1]} r="5" fill={SKY} />
      {triangle && (
        <>
          <line x1={C[0]} y1={C[1]} x2={touch[0]} y2={touch[1]} stroke={SKY} strokeWidth="2" />
          <text x={(C[0] + touch[0]) / 2 + 8} y={200} fill={SKY} fontSize="13">radius</text>
          <text x={eye[0] - 8} y={eye[1] + 16} fill={GREEN} fontSize="13" textAnchor="end">height</text>
          <line x1={C[0]} y1={C[1]} x2={C[0]} y2={C[1] - R} stroke={SKY} strokeWidth="2" strokeDasharray="5 4" />
          <text x={(eye[0] + touch[0]) / 2} y={(eye[1] + touch[1]) / 2 - 10} fill={AMBER} fontSize="13">line of sight</text>
        </>
      )}
      <text x={touch[0] + 8} y={touch[1] - 8} fill={ROSE} fontSize="12">horizon</text>
    </svg>
  )
}

function Play({ state, setState }) {
  const { i, seen } = state
  const { m, name, px } = HEIGHTS[i]
  const set = k => setState({ i: k, seen: seen.includes(k) ? seen : [...seen, k] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Because the Earth curves, you can only see so far: the horizon is where your line of sight just touches the
        curve. Climb higher and see how far the horizon moves.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Height">
        {HEIGHTS.map((h, k) => (
          <button
            key={h.m}
            type="button"
            onClick={() => set(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === i ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {h.m} m
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Curve px={px} />
      </div>
      <p className="mt-2 text-slate-400">The curve is drawn far more bent than it really is.</p>
      <table className="mt-3 font-mono text-lg">
        <thead>
          <tr className="text-sm text-slate-400">
            <th className="pr-6 text-left">eyes this high</th>
            <th className="text-left">horizon about</th>
          </tr>
        </thead>
        <tbody>
          {seen
            .slice()
            .sort((a, b) => a - b)
            .map(k => (
              <tr key={k} data-testid="horizon-row">
                <td className="pr-6">{HEIGHTS[k].m} m</td>
                <td className="text-amber-300">{horizon(HEIGHTS[k].m)} km</td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="mt-2 text-slate-400">Now: {name}.</p>
    </div>
  )
}

function Reveal() {
  const [squares, setSquares] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Draw the radius to the horizon. A line that just touches a circle meets the radius there at a right angle,
        so the radius, the line of sight and the radius plus your height make a right triangle.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Curve px={70} triangle />
      </div>
      {!squares && (
        <button type="button" onClick={() => setSquares(true)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Compare the squares
        </button>
      )}
      {squares && (
        <div className="mt-4 flex flex-wrap items-start gap-6">
          <div className="rounded-lg bg-slate-950 p-3">
            <svg viewBox="0 0 200 200" style={{ width: 200 }} role="img" aria-label="The big square minus the small square leaves an L">
              <rect x="10" y="10" width="180" height="180" fill={ROSE} fillOpacity="0.5" stroke={ROSE} strokeWidth="2" />
              <rect x="10" y="30" width="160" height="160" fill={SKY} fillOpacity="0.5" stroke={SKY} strokeWidth="2" />
              <text x="90" y="115" fill="#e2e8f0" fontSize="13" textAnchor="middle">radius square</text>
              <text x="182" y="110" fill="#e2e8f0" fontSize="11" textAnchor="middle" transform="rotate(90 182 110)">height</text>
            </svg>
          </div>
          <div className="min-w-[16rem] flex-1 space-y-3 text-lg leading-relaxed">
            <p data-testid="gnomon-result">
              The square on (radius + height) minus the square on the radius is the line of sight&apos;s square. That
              difference is an L-shaped layer, a gnomon, as in the odd squares: two long strips as wide as your height,
              plus a tiny corner.
            </p>
            <p className="text-slate-300">
              Each strip is 6,400 km long and as wide as your height. Climb 4 times as high and the strips get 4 times
              wider, so the line of sight&apos;s square gets 4 times bigger. A square 4 times bigger has a side only
              twice as long: you see twice as far, not 4 times.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-how-far-is-the-horizon',
  order: '3.7',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'How far is the horizon?',
  threads: ['Shape', 'Measurement'],
  rigor: 2,
  move: 'draw-picture',
  hook: (
    <p>
      Sailors put a lookout at the top of the mast, because from up there a ship&apos;s sails come over the horizon
      sooner. Now that you know how big the Earth is, roughly 6,400 km from the surface to the centre (its
      <strong>radius</strong>), can you work
      out how far you can see?
    </p>
  ),
  initialState: { i: 0, seen: [0] },
  Play,
  playReady: state => state.seen.length >= 3,
  playNotReady: 'Try three heights',
  predict: {
    question: <p>From the top of a mountain 800 metres high, about how far away is the horizon, in kilometres?</p>,
    response: guess => {
      if (guess >= 95 && guess <= 110) return `Yes, about 101 km. 800 m is 4 times the cliff, and the cliff saw about 50 km.`
      if (guess >= 190 && guess <= 210) return 'Climbing 4 times higher doesn’t let you see 4 times as far. The cliff (200 m) saw about 50 km; 800 m sees about 101 km.'
      return 'About 101 km. Look at the table: 8 m is 4 times 2 m, and it sees twice as far. 800 m is 4 times the cliff.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>To see twice as far to the horizon, how many times higher do you have to climb?</p>,
    answer: 4,
    praise: 'A line of sight twice as long has a square 4 times as big, so the strips must be 4 times as wide: 4 times the height.',
    hint: v =>
      v === 2
        ? 'Twice as high gives strips twice as wide, so a square twice as big. A square twice as big doesn’t have a side twice as long.'
        : 'A side twice as long makes a square 4 times as big. How much wider must the strips be?',
    solution: 'Seeing twice as far means a line of sight twice as long, and a square on it 4 times as big. That square is the L of strips, whose width is your height. To make it 4 times bigger, climb 4 times higher.',
  },
  keep: 'Your line of sight, the Earth’s radius and the radius plus your height make a right triangle. The gap between the two big squares is an L of strips as wide as your height, so 4 times higher sees twice as far.',
  symbols: <p>line of sight × line of sight = 2 × radius × height, nearly. Forget it? Draw the L.</p>,
  story: (
    <>
      <p>
        Around AD 1020, the scholar al-Biruni turned this around to measure the Earth. He measured the height of a
        mountain near Nandana, in what is now Pakistan, then the tiny angle by which the horizon dipped below level
        when seen from its top. From the right triangle he worked out the Earth&apos;s radius, and his answer was
        within about 1 percent of the modern value.
      </p>
      <p className="mt-2">
        Eratosthenes needed two towns and a long walk. Al-Biruni needed one mountain.
      </p>
    </>
  ),
  deeper: {
    question: <p>An airliner flies 5 km up. How far away is the horizon, to the nearest kilometre? (The Earth&apos;s radius is 6,400 km.)</p>,
    answer: 253,
    praise: 'Two strips of 6,400 × 5 = 32,000 each, plus the corner of 25: 64,025. And 253 × 253 = 64,009, so about 253 km.',
    hint: () => 'The L is two strips, each 6,400 long and 5 wide, plus a 5 by 5 corner. Then find the number that times itself gives that.',
    solution: 'Two strips of 6,400 × 5 = 32,000 square km, plus a corner of 25: 64,025. The line of sight is the number whose square is 64,025. 253 × 253 = 64,009, very close, so the horizon is about 253 km away.',
  },
}
