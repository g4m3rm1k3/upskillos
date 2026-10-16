import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const TOP = 70
const X = 200
const r = 26

const rad = d => (d * Math.PI) / 180

// Where the crossing line, through (X, TOP) at `deg` above the rightward direction, meets the line at height y.
const meet = (deg, y) => [X - (y - TOP) / Math.tan(rad(deg)), y]

// The arc of an angle at (x, y), from the direction `from` (degrees, 0 = right, counterclockwise) through `deg` more.
function Arc({ x, y, from, deg, colour, label }) {
  const a = rad(from)
  const b = rad(from + deg)
  const p = [x + r * Math.cos(a), y - r * Math.sin(a)]
  const q = [x + r * Math.cos(b), y - r * Math.sin(b)]
  const mid = rad(from + deg / 2)
  return (
    <g>
      <path d={`M${x},${y}L${p[0]},${p[1]}A${r},${r} 0 0,0 ${q[0]},${q[1]}Z`} fill={colour} fillOpacity="0.35" stroke={colour} strokeWidth="2" />
      {label && (
        <text x={x + (r + 16) * Math.cos(mid)} y={y - (r + 16) * Math.sin(mid)} fill={colour} fontSize="13" fontWeight="700" textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
      )}
    </g>
  )
}

function Lines({ deg, bottom, children }) {
  const far = 400
  const [x1, y1] = [X - far * Math.cos(rad(deg)), TOP + far * Math.sin(rad(deg))]
  const [x2, y2] = [X + far * Math.cos(rad(deg)), TOP - far * Math.sin(rad(deg))]
  return (
    <svg viewBox="0 0 400 230" className="w-full" style={{ maxWidth: 480 }} role="img" aria-label={`A line crossing two parallel lines at ${deg} degrees`}>
      <line x1="0" y1={TOP} x2="400" y2={TOP} stroke={AMBER} strokeWidth="2.5" />
      <line x1="0" y1={bottom} x2="400" y2={bottom} stroke={AMBER} strokeWidth="2.5" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="2" />
      {children}
    </svg>
  )
}

const DEGS = [30, 45, 60, 75, 105, 120, 135]

function Play({ state, setState }) {
  const { deg, bottom, tried } = state
  const [bx, by] = meet(deg, bottom)
  const set = d => setState({ ...state, deg: d, tried: tried.includes(d) ? tried : [...tried, d] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Lines that run side by side and never meet are called <strong>parallel</strong>, like two sun rays. A
        straight line crosses two parallel lines. Change its angle, and the gap between the parallels, and compare
        the two marked angles.
      </p>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Crossing angle">
        {DEGS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => set(d)}
            className={`w-14 rounded-lg border py-1 font-semibold ${d === deg ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {d}°
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Gap">
        {[
          ['narrow gap', 140],
          ['wide gap', 200],
        ].map(([name, y]) => (
          <button key={name} type="button" onClick={() => setState({ ...state, bottom: y })} className={`rounded-lg border px-3 py-1 ${y === bottom ? 'border-amber-400 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}>
            {name}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Lines deg={deg} bottom={bottom}>
          <Arc x={X} y={TOP} from={0} deg={deg} colour={SKY} label={`${deg}°`} />
          <Arc x={bx} y={by} from={0} deg={deg} colour={SKY} label={`${deg}°`} />
        </Lines>
      </div>
      {tried.length > 0 && <p className="mt-2 text-slate-400">Angles tried: {tried.map(d => `${d}°`).join(', ')}</p>}
    </div>
  )
}

const DEG = 50
const BOTTOM = 180

function Reveal() {
  const [slid, setSlid] = useState(false)
  const [turned, setTurned] = useState(false)
  const [bx, by] = meet(DEG, BOTTOM)
  const move = { transform: slid ? `translate(${X - bx}px, ${TOP - by}px)` : 'none', transition: 'transform 1000ms ease-in-out' }
  const spin = { transformBox: 'view-box', transformOrigin: `${X}px ${TOP}px`, transform: turned ? 'rotate(180deg)' : 'none', transition: 'transform 1000ms ease-in-out' }
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here the crossing line meets the parallels at {DEG}°. Slide the lower parallel up along the crossing line,
        keeping it parallel.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Lines deg={DEG} bottom={BOTTOM}>
          <Arc x={X} y={TOP} from={0} deg={DEG} colour={SKY} label="A" />
          <g style={move}>
            <line x1={-400} y1={BOTTOM} x2={800} y2={BOTTOM} stroke={AMBER} strokeWidth="2.5" strokeDasharray={slid ? '6 4' : undefined} />
            <Arc x={bx} y={by} from={0} deg={DEG} colour={SKY} label="B" />
          </g>
          {turned && <Arc x={X} y={TOP} from={180} deg={DEG} colour={ROSE} label="C" />}
          <g style={spin}>
            <Arc x={X} y={TOP} from={0} deg={DEG} colour={SKY} />
          </g>
        </Lines>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setSlid(!slid)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          {slid ? 'Slide it back' : 'Slide the lower line up'}
        </button>
        <button type="button" onClick={() => setTurned(!turned)} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          {turned ? 'Turn it back' : 'Turn angle A half a turn'}
        </button>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        {slid && (
          <p data-testid="slide-result">
            The lower line lands exactly on the upper one, and angle B lands exactly on angle A. Sliding changes
            where the crossing is, not how the lines meet. So A and B are equal, however far apart the parallels are.
          </p>
        )}
        {turned && (
          <p data-testid="turn-result">
            Turned half a turn about the crossing point, angle A lands on angle C, on the other side of both lines.
            So C equals A, and therefore C equals B too. The pair B and C make a Z shape: remember the Z.
          </p>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'bon-parallel-rays',
  order: '3.4',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'Parallel rays',
  threads: ['Shape'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      The Sun is so far away that its rays reach the Earth running side by side, like the lanes of a long, straight
      road. Measuring the Earth depends on one fact about lines like that. What happens where another line crosses
      them?
    </p>
  ),
  initialState: { deg: 60, bottom: 140, tried: [] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try three crossing angles',
  predict: {
    question: <p>If the crossing line meets the upper parallel at 40°, what about the matching angle at the lower parallel?</p>,
    choices: ['The same, 40°', 'Bigger, because it is further down', 'It depends how far apart the parallels are'],
    response: guess => {
      if (guess === 'The same, 40°') return 'The same, always. Now see why it has to be.'
      if (guess === 'Bigger, because it is further down')
        return 'Further down doesn’t change the angle. It’s 40° at both, and sliding one line onto the other shows why.'
      return 'The gap makes no difference: it’s 40° at both, for any gap. Sliding one line onto the other shows why.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A line crosses two parallels. At the upper one, the angle above the parallel on the right is 35°. At the lower
        one, what is the angle above the parallel on the <em>left</em>?
      </p>
    ),
    answer: 145,
    praise: 'The angle on the right is 35° at the lower parallel too. Left and right together make a straight line, 180°, so the left one is 145°.',
    hint: v =>
      v === 35
        ? '35° is the angle on the right. The one on the left is the rest of the straight line.'
        : 'The right-hand angle at the lower parallel is 35°, as at the upper one. The two angles above the parallel make a straight line: how many degrees is that?',
    solution: 'Sliding one parallel onto the other shows the right-hand angle at the lower line is 35° too. The angles on the left and right above the line together make a half turn, 180°. So the left one is 180° − 35° = 145°.',
  },
  keep: 'A line crossing two parallel lines crosses both at the same angle, because sliding one onto the other changes nothing. A half turn adds the Z: angles on opposite sides are equal too.',
  symbols: <p>The angles in a Z between parallel lines are equal. Forget it? Slide one line onto the other, then turn half a turn.</p>,
  story: (
    <>
      <p>
        Greek writers credit Thales with noticing that two crossing lines make equal opposite angles, the half-turn
        fact you just used. The sources are late, as always with Thales.
      </p>
      <p className="mt-2">
        Euclid, around 300 BC, put the facts about parallel lines near the start of his geometry, because so much
        rests on them. The Sun is about 150 million kilometres away, so two of its rays striking towns hundreds of
        kilometres apart differ in direction by far less than a hundredth of a degree. For measuring the Earth,
        they are parallel.
      </p>
    </>
  ),
  deeper: {
    question: <p>A line crossing two parallels makes 8 angles: 4 at each crossing. If one of them is 40°, how many of the 8 are 40°?</p>,
    answer: 4,
    praise: 'At each crossing, two opposite angles are 40° and the other two are 140°. That is 4 angles of 40° in all.',
    hint: () => 'Start at one crossing: which of its 4 angles match by a half turn? Then slide to the other crossing.',
    solution: 'At one crossing, the 40° angle and its opposite (a half turn away) are both 40°; the other two are 180° − 40° = 140°. Sliding to the other crossing copies all four. So 4 of the 8 angles are 40°.',
  },
}
