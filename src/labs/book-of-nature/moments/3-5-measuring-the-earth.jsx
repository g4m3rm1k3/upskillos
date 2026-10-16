import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const ROSE = '#fb7185'
const C = [190, 210]
const R = 150

const rad = d => (d * Math.PI) / 180
// A point on the Earth `deg` degrees round from Syene (straight up), going left.
const on = (deg, r = R) => [C[0] - r * Math.sin(rad(deg)), C[1] - r * Math.cos(rad(deg))]

function Earth({ deg, slices, label = `${deg}°` }) {
  const syene = on(0)
  const alex = on(deg)
  const tip = on(deg, R + 40)
  const arcR = 34
  return (
    <svg viewBox="0 0 380 380" className="w-full" style={{ maxWidth: 400 }} role="img" aria-label={`Alexandria ${deg} degrees round from Syene`}>
      {[-120, -80, -40, 0, 40, 80].map(dx => (
        <line key={dx} x1={C[0] + dx} y1="0" x2={C[0] + dx} y2="380" stroke={AMBER} strokeOpacity="0.35" strokeWidth="1.5" />
      ))}
      <line x1={tip[0]} y1="0" x2={tip[0]} y2={tip[1]} stroke={AMBER} strokeWidth="2.5" />
      <circle cx={C[0]} cy={C[1]} r={R} fill="#0f2a44" stroke="#475569" strokeWidth="2" />
      {slices &&
        Array.from({ length: 50 }, (_, i) => {
          const p = on(i * 7.2)
          return <line key={i} x1={C[0]} y1={C[1]} x2={p[0]} y2={p[1]} stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="1" />
        })}
      <line x1={C[0]} y1={C[1]} x2={syene[0]} y2={syene[1]} stroke={SKY} strokeWidth="2" />
      <line x1={C[0]} y1={C[1]} x2={tip[0]} y2={tip[1]} stroke={SKY} strokeWidth="2" strokeDasharray="5 4" />
      <line x1={alex[0]} y1={alex[1]} x2={tip[0]} y2={tip[1]} stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
      <path d={`M${C[0]},${C[1] - arcR}A${arcR},${arcR} 0 0,0 ${C[0] - arcR * Math.sin(rad(deg))},${C[1] - arcR * Math.cos(rad(deg))}`} fill="none" stroke={ROSE} strokeWidth="3" />
      <path
        d={`M${tip[0]},${tip[1] + 24}A24,24 0 0,0 ${tip[0] + 24 * Math.sin(rad(deg))},${tip[1] + 24 * Math.cos(rad(deg))}`}
        fill="none"
        stroke={ROSE}
        strokeWidth="3"
      />
      <path d={`M${syene[0]},${syene[1]}A${R},${R} 0 0,0 ${alex[0]},${alex[1]}`} fill="none" stroke={AMBER} strokeWidth="5" />
      <text x={syene[0] + 6} y={syene[1] - 6} fill="#e2e8f0" fontSize="12">Syene</text>
      <text x={alex[0] - 8} y={alex[1] + 14} fill="#e2e8f0" fontSize="12" textAnchor="end">Alexandria</text>
      <text x={C[0] - 4} y={C[1] - arcR - 8} fill={ROSE} fontSize="13" textAnchor="end">{label}</text>
      <text x={tip[0] - 8} y={tip[1] + 30} fill={ROSE} fontSize="13" textAnchor="end">{label}</text>
    </svg>
  )
}

function Play({ state, setState }) {
  const { deg, tried } = state
  const set = d => setState({ deg: d, tried: tried.includes(d) ? tried : [...tried, d] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        At noon on midsummer&apos;s day, the Sun is straight over Syene, in the south of Egypt: an upright stick
        there casts no shadow. Alexandria lies to the north. Move it round the Earth and compare the angle of the
        stick&apos;s shadow there (the angle between the stick and the sun&apos;s ray) with the angle at the
        Earth&apos;s centre.
      </p>
      <Stepper label="degrees round" value={deg} min={5} max={40} step={5} onChange={set} />
      <div className="mt-3 rounded-lg bg-slate-950 p-3">
        <Earth deg={deg} />
      </div>
      <p className="mt-2 text-lg" data-testid="earth-angles">
        Shadow angle at Alexandria: {deg}°. Angle at the Earth&apos;s centre: {deg}°.
      </p>
    </div>
  )
}

function Reveal() {
  const [slices, setSlices] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        The sun&apos;s ray at Alexandria and the line from Syene to the centre are parallel. The stick points
        straight out from the centre, so it is a line crossing both: the two marked angles are the Z from parallel
        rays, and they are equal.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Earth deg={7.2} slices={slices} label="1/50 turn" />
      </div>
      {!slices && (
        <button type="button" onClick={() => setSlices(true)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Slice the whole Earth the same way
        </button>
      )}
      {slices && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="earth-result">
            Eratosthenes&apos; shadow angle was 1/50 of a full turn, so the angle at the centre is 1/50 of a turn too.
            Fifty slices like that go all the way round, and each one is as long as Alexandria to Syene: 5,000
            stadia. 50 × 5,000 = 250,000 stadia.
          </p>
          <p className="text-slate-300">
            The distance all the way round a circle is its <strong>circumference</strong>. Eratosthenes found the
            Earth&apos;s with one shadow, one distance and the Z between parallel lines, without leaving Egypt.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-measuring-the-earth',
  order: '3.5',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'Measuring the Earth',
  threads: ['Shape', 'Measurement'],
  rigor: 2,
  move: 'simplify',
  hook: (
    <p>
      Around 240 BC, Eratosthenes ran the great library of Alexandria. Educated Greeks already knew the Earth was
      a ball. Eratosthenes wanted to know how big. He never travelled round it. He measured one shadow.
    </p>
  ),
  initialState: { deg: 20, tried: [] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try three positions for Alexandria',
  predict: {
    question: (
      <p>
        At Alexandria, at noon on midsummer&apos;s day, Eratosthenes found the shadow angle was 1/50 of a full turn.
        Alexandria is 5,000 stadia from Syene (a stadion was a Greek unit of distance, about the length of a
        running track). How far is it all the way round the Earth, in stadia?
      </p>
    ),
    response: guess => {
      if (guess === 250000) return 'Yes, 250,000 stadia. Here is why one shadow is enough.'
      if (guess === 5000) return 'That is just Alexandria to Syene. That stretch is only 1/50 of the way round.'
      return `It's 250,000 stadia. The stretch from Alexandria to Syene is 1/50 of the way round.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Two towns lie 1,000 kilometres apart, one due north of the other. At noon on the same day, their shadow
        angles differ by 9°. How far is it round the Earth?
      </p>
    ),
    answer: 40000,
    praise: '9° is 1/40 of 360°, so 1,000 km is 1/40 of the way round: 40,000 km. That is the real figure, near enough.',
    hint: v =>
      v === 9000
        ? 'That multiplies by 9. How many 9° slices make a full turn of 360°?'
        : 'What fraction of a full turn is 9°? The 1,000 km is that fraction of the way round.',
    solution: 'A full turn is 360°, and 360 ÷ 9 = 40, so 9° is 1/40 of a turn. The 1,000 km between the towns is 1/40 of the way round, so the whole way round is 40 × 1,000 = 40,000 km.',
  },
  keep: 'A shadow angle at one town equals the angle at the Earth’s centre between two towns. If it is 1/50 of a turn, the distance between them is 1/50 of the way round.',
  symbols: <p>circumference = distance × (360 ÷ angle in degrees). Forget it? Count how many slices make a full turn.</p>,
  story: (
    <>
      <p>
        No writing of Eratosthenes on this survives. The account comes from Cleomedes, an astronomy teacher writing
        a few centuries later, who gives the round numbers used here: 1/50 of a circle and 5,000 stadia.
      </p>
      <p className="mt-2">
        How good was the answer? Nobody knows exactly how long Eratosthenes&apos; stadion was, and estimates of his
        accuracy range from within 2 percent to about 16 percent too big. What is certain is the idea: a stick,
        a shadow and a few parallel lines can measure a planet.
      </p>
    </>
  ),
  deeper: {
    question: <p>One guess for Eratosthenes&apos; stadion is 157 and a half metres. With that, how many kilometres is 250,000 stadia?</p>,
    answer: 39375,
    praise: '250,000 × 157 and a half metres = 39,375,000 metres = 39,375 km. The real distance round the poles is about 40,008 km.',
    hint: () => 'Multiply 250,000 by 157, add half of 250,000, then divide by 1,000 for kilometres.',
    solution: '250,000 × 157 = 39,250,000, and 250,000 × a half = 125,000. Together 39,375,000 metres, which is 39,375 kilometres.',
  },
}
