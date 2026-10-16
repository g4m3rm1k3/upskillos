import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'

const ANGLES = [10, 20, 30, 40, 45, 50, 60, 70, 80]
// Shadow of a stick 100 tall, for the sun at each height in the sky (to the nearest whole number).
const shadow = deg => Math.round(100 / Math.tan((deg * Math.PI) / 180))

// A stick and its shadow, with the sun's ray at `deg` above the ground.
function Sun({ deg, h = 100, label }) {
  const s = h / Math.tan((deg * Math.PI) / 180)
  const W = 620
  const k = 0.5
  const x0 = 20
  const H = h * k + 30
  const y0 = H - 10
  const arc = Math.min(26, Math.max(10, s * k * 0.7))
  const ax = x0 + Math.min(s, W / k) * k
  return (
    <svg viewBox={`0 0 ${W * k + 40} ${H}`} className="w-full" role="img" aria-label={label}>
      <line x1="0" y1={y0} x2={W * k + 40} y2={y0} stroke="#475569" strokeWidth="2" />
      <line x1={x0} y1={y0} x2={x0 + s * k} y2={y0} stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
      <line x1={x0} y1={y0 - h * k} x2={x0 + s * k} y2={y0} stroke={AMBER} strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1={x0} y1={y0} x2={x0} y2={y0 - h * k} stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
      <path
        d={`M${ax - arc},${y0} A${arc},${arc} 0 0,1 ${ax - arc * Math.cos((deg * Math.PI) / 180)},${y0 - arc * Math.sin((deg * Math.PI) / 180)}`}
        fill="none"
        stroke={SKY}
        strokeWidth="2"
      />
      <text x={ax + 6} y={y0 - 8} fill={SKY} fontSize="13">{deg}°</text>
    </svg>
  )
}

function Play({ state, setState }) {
  const { deg, table } = state
  const record = () => !table.includes(deg) && setState({ ...state, table: [...table, deg].sort((a, b) => a - b) })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A stick 100 fingers tall stands in the sun. As the sun climbs, its angle above the ground grows and the
        shadow shrinks. Record the shadow for a few sun angles to make a table.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Sun angle">
        {ANGLES.map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setState({ ...state, deg: a })}
            className={`w-12 rounded-lg border py-1 font-semibold ${a === deg ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {a}°
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Sun deg={deg} label={`The sun at ${deg} degrees`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <p className="text-lg">
          Shadow: <strong className="text-amber-300">{shadow(deg)}</strong> fingers
        </p>
        <button type="button" onClick={record} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Add to the table
        </button>
      </div>
      {table.length > 0 && (
        <table className="mt-3 font-mono text-lg">
          <thead>
            <tr className="text-sm text-slate-400">
              <th className="pr-6 text-left">sun angle</th>
              <th className="text-left">shadow of 100</th>
            </tr>
          </thead>
          <tbody>
            {table.map(a => (
              <tr key={a} data-testid="table-row">
                <td className="pr-6">{a}°</td>
                <td className="text-amber-300">{shadow(a)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Reveal() {
  const [h, setH] = useState(100)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        At 45° the sun&apos;s ray, the stick and the shadow make half a square: the shadow equals the height. Now keep
        the sun at 30° and change what stands in it.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Height">
        {[50, 100, 200].map(v => (
          <button
            key={v}
            type="button"
            aria-label={`height ${v}`}
            onClick={() => setH(v)}
            className={`rounded-lg border px-3 py-1 font-semibold ${v === h ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {v} tall
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Sun deg={30} h={h} label={`Something ${h} tall with the sun at 30 degrees`} />
      </div>
      <p className="mt-3 text-lg" data-testid="table-scale">
        {h} tall at 30°: shadow {Math.round((h * 173) / 100)}. For every 100 up, 173 along, whatever the size.
      </p>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          The sun&apos;s angle fixes the shape of the triangle, and the shape fixes the comparison: at 30°, every 100
          of height throws 173 of shadow, for a stick, a tree or a pyramid. So the table works for everything. Read
          off the sun&apos;s angle, measure a shadow, and the table gives you the height. No stick needed.
        </p>
        <p className="text-slate-300">
          A table that turns angles into comparisons of sides is the beginning of <em>trigonometry</em>, which means
          &quot;triangle measuring&quot;.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-the-shadow-table',
  order: '3.3',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'The shadow table',
  threads: ['Shape', 'Measurement'],
  rigor: 1,
  move: 'match-up',
  hook: (
    <p>
      Thales needed his stick and the pyramid&apos;s shadow at the same moment. Could you skip the stick? If you
      knew only how high the sun stood in the sky, could a shadow alone tell you a height?
    </p>
  ),
  initialState: { deg: 30, table: [] },
  Play,
  playReady: state => state.table.length >= 4,
  playNotReady: 'Add four sun angles to the table',
  predict: {
    question: <p>At what sun angle is a stick&apos;s shadow exactly as long as the stick?</p>,
    response: guess => {
      if (guess === 45) return 'Yes, 45°: halfway between flat and straight up. Ray, stick and shadow make half a square.'
      if (guess === 90) return 'At 90° the sun is straight overhead and there is no shadow at all. Shadow equals height at 45°.'
      return `It's 45°. There the ray, the stick and the shadow make half a square.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>The sun stands at 60°. A wall throws a shadow 29 fingers long. How tall is the wall? Use the table: at 60°, a stick of 100 throws 58.</p>,
    answer: 50,
    praise: '29 is half of 58, so the wall is half of 100: 50.',
    hint: v =>
      v === 17
        ? 'That treats the table backwards. At 60° the shadow is shorter than the height, so the wall is taller than 29.'
        : 'At 60°, every 100 of height throws 58 of shadow. How much of 58 is 29?',
    solution: 'The table says 100 of height throws 58 of shadow at 60°. The wall’s shadow, 29, is half of 58, so its height is half of 100: 50 fingers.',
  },
  keep: 'The sun’s angle fixes the shape of the shadow triangle. One table of shadows for each angle measures the height of anything, no stick needed: the seed of trigonometry.',
  symbols: <p>At 30°: shadow = height × 173 ÷ 100. Forget it? Look up the angle in the table, and scale.</p>,
  story: (
    <>
      <p>
        The upright stick of a sundial was called a gnomon, the same word as the L-shaped pebble layers of the odd
        squares. Astronomers kept tables of noon shadow lengths through the year.
      </p>
      <p className="mt-2">
        Around AD 150, Ptolemy built a table of lengths for every half degree, made for measuring the sky. In India,
        Aryabhata&apos;s book of AD 499 gave a table of what we now call sines. Our trigonometry grew from tables
        like these, and one of its numbers, the tangent, is your shadow table turned upside down.
      </p>
    </>
  ),
  deeper: {
    question: <p>The sun stands at 20°, where a stick of 100 throws a shadow of 275. A tree&apos;s shadow is 55 long. How tall is the tree?</p>,
    answer: 20,
    praise: '55 is a fifth of 275, so the tree is a fifth of 100: 20.',
    hint: () => 'How many times does 55 go into 275?',
    solution: '275 ÷ 55 = 5, so the tree’s shadow is a fifth of the stick’s. Its height is a fifth of 100: 20.',
  },
}
