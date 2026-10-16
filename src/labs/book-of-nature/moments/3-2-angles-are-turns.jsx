import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const SLICES = [2, 3, 4, 6, 8, 12]
const C = 110
const R = 90

const at = (turn, r = R) => [C + r * Math.sin(turn * 2 * Math.PI), C - r * Math.cos(turn * 2 * Math.PI)]

// The wedge from straight up, turning clockwise by `turn` of a full turn.
function wedge(turn, r = R) {
  if (turn <= 0) return ''
  if (turn >= 1) return `M${C - r},${C}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`
  const [x, y] = at(turn, r)
  return `M${C},${C}L${C},${C - r}A${r},${r} 0 ${turn > 0.5 ? 1 : 0},1 ${x},${y}Z`
}

function Dial({ k, steps, ticks }) {
  const turn = steps / k
  const [x, y] = at(turn % 1)
  return (
    <svg viewBox="0 0 220 220" style={{ width: 240, maxWidth: '100%' }} role="img" aria-label={`${steps} of ${k} slices turned`}>
      <circle cx={C} cy={C} r={R} fill="#0f172a" stroke="#475569" strokeWidth="2" />
      <path d={wedge(Math.min(turn, 1))} fill={AMBER} fillOpacity="0.3" />
      {Array.from({ length: ticks ?? k }, (_, i) => {
        const [x1, y1] = at(i / (ticks ?? k), R - 6)
        const [x2, y2] = at(i / (ticks ?? k), R)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={ticks ? 0.6 : 2} />
      })}
      <line x1={C} y1={C} x2={C} y2={C - R} stroke="#475569" strokeWidth="2" strokeDasharray="4 3" />
      <line x1={C} y1={C} x2={x} y2={y} stroke={SKY} strokeWidth="4" strokeLinecap="round" style={{ transition: 'all 400ms' }} />
      <circle cx={C} cy={C} r="5" fill={SKY} />
    </svg>
  )
}

function Play({ state, setState }) {
  const { k, steps, full } = state
  const turnOne = () => {
    const next = steps + 1
    const done = next % k === 0 && !full.includes(k) ? [...full, k] : full
    setState({ ...state, steps: next, full: done })
  }
  const whole = Math.floor(steps / k)
  const part = steps % k
  return (
    <div>
      <p className="mb-3 text-slate-300">
        An <strong>angle</strong> is an amount of turning. Split a full turn into equal slices, then turn the arrow
        one slice at a time. How many slices bring it back to where it started?
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Slices">
        <span className="text-slate-400">Slices in a full turn:</span>
        {SLICES.map(s => (
          <button
            key={s}
            type="button"
            aria-label={`${s} slices`}
            onClick={() => setState({ ...state, k: s, steps: 0 })}
            className={`w-10 rounded-lg border py-1 font-semibold ${s === k ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Dial k={k} steps={steps} />
        </div>
        <div className="text-lg">
          <button type="button" onClick={turnOne} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
            Turn one slice
          </button>
          <p className="mt-3" data-testid="turned">
            Turned: {steps} {steps === 1 ? 'slice' : 'slices'} of 1/{k}
            {whole > 0 ? `: ${whole} full ${whole === 1 ? 'turn' : 'turns'}${part ? ` and ${part}/${k}` : ''}` : ''}
          </p>
          {full.length > 0 && <p className="mt-1 text-slate-400">Back to the start with: {full.map(s => `${s} slices`).join(', ')}</p>}
        </div>
      </div>
    </div>
  )
}

const MARKS = [
  { name: 'a half turn', parts: 2 },
  { name: 'a third', parts: 3 },
  { name: 'a quarter', parts: 4 },
  { name: 'a fifth', parts: 5 },
  { name: 'a sixth', parts: 6 },
  { name: 'an eighth', parts: 8 },
  { name: 'a twelfth', parts: 12 },
]

function Reveal() {
  const [i, setI] = useState(2)
  const { name, parts } = MARKS[i]
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here is a full turn split into 360 equal small turns, called <strong>degrees</strong>. Pick a slice.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Fraction of a turn">
        {MARKS.map((m, k) => (
          <button
            key={m.parts}
            type="button"
            onClick={() => setI(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === i ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Dial k={parts} steps={1} ticks={360} />
        </div>
        <p className="text-2xl" data-testid="degrees">
          1/{parts} of a turn = <strong className="text-amber-300">{360 / parts}°</strong>
        </p>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          A right angle, the square corner, is a quarter turn: 90°. A half turn, which makes a straight line, is
          180°. Every slice here comes out as a whole number of degrees.
        </p>
        <p className="text-slate-300">
          That is no accident. Like sixty, 360 shares evenly in a great many ways: into 2, 3, 4, 5, 6, 8, 9, 10, 12
          and more. It is sixty times six, and it came from the same Babylonian scribes.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-angles-are-turns',
  order: '3.2',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: 'Angles are turns',
  threads: ['Shape', 'Measurement'],
  rigor: 1,
  move: 'draw-picture',
  hook: (
    <p>
      The sun climbs the sky in the morning and sinks in the evening. A shadow swings round as it does. To measure
      the Earth with shadows you need a way to say how far something has turned. How do you measure a turn?
    </p>
  ),
  initialState: { k: 4, steps: 0, full: [] },
  Play,
  playReady: state => state.full.length >= 2,
  playNotReady: 'Turn all the way round with two different slicings',
  predict: {
    question: <p>Babylonian astronomers split a full turn into 360 equal parts, called degrees. How many degrees is a square corner?</p>,
    response: guess => {
      if (guess === 90) return 'Yes: a square corner is a quarter turn, and a quarter of 360 is 90.'
      if (guess === 360) return '360 is the whole turn. A square corner is only a quarter of it: 90.'
      if (guess === 180) return '180 is half a turn: a straight line. A square corner is a quarter turn: 90.'
      return `It's 90. A square corner is a quarter turn, and a quarter of 360 is 90.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>How many degrees does the minute hand of a clock turn in 20 minutes?</p>,
    answer: 120,
    praise: '20 minutes is a third of an hour, so a third of a turn: 120°.',
    hint: v =>
      v === 20
        ? 'The hand turns 360° in a whole hour. What fraction of an hour is 20 minutes?'
        : 'A full turn of the minute hand takes 60 minutes. What fraction of a turn is 20 minutes?',
    solution: 'The minute hand goes all the way round, 360°, in 60 minutes. 20 minutes is a third of that, so it turns a third of 360°: 120°.',
  },
  keep: 'An angle is an amount of turning. A full turn is 360 degrees, a square corner is 90 and a straight line is 180, and 360 shares evenly into many slices.',
  symbols: <p>The little circle in 90° means degrees.</p>,
  story: (
    <>
      <p>
        Babylonian astronomers tracked the Sun, Moon and planets against twelve star groups, the signs of the
        zodiac, and by around 400 BC they split each sign into 30 parts: 360 in all. Greek astronomers, Hipparchus
        around 150 BC and then Ptolemy, took over the 360 parts, and so did everyone after them.
      </p>
      <p className="mt-2">
        Why 360? It shares evenly in many ways, it fits their base of sixty, and it is close to the number of days
        in a year, so the Sun moves about one degree a day along the zodiac. Which reason came first is a guess.
      </p>
    </>
  ),
  deeper: {
    question: <p>A wheel has 9 equally spaced spokes. How many degrees are there between one spoke and the next?</p>,
    answer: 40,
    praise: '360 ÷ 9 = 40°.',
    hint: () => 'The 9 gaps between spokes go once all the way round. How much of a full turn is each gap?',
    solution: 'Going round the wheel, the 9 gaps make one full turn of 360°. Each is a ninth: 360 ÷ 9 = 40°.',
  },
}
