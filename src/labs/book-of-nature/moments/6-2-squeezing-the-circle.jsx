import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const SIDES = [6, 12, 24, 48, 96]
const C = 130
const R = 110

// Perimeters of the polygons inside and outside a circle 100 units across, as whole numbers that
// still trap the true values: the inside one rounded down, the outside one rounded up.
const inside = n => Math.floor(100 * n * Math.sin(Math.PI / n) + 1e-9)
const outside = n => Math.ceil(100 * n * Math.tan(Math.PI / n) - 1e-9)

const corners = (n, radius, turn) =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + turn + (2 * Math.PI * i) / n
    return `${C + radius * Math.cos(a)},${C + radius * Math.sin(a)}`
  }).join(' ')

const thin = { vectorEffect: 'non-scaling-stroke' }

function Drawing({ n, viewBox, label, triangles, turn = 0, stretch }) {
  return (
    <svg viewBox={viewBox} className={stretch ? 'h-full w-full' : 'w-full'} preserveAspectRatio={stretch ? 'none' : undefined} role="img" aria-label={label}>
      <g transform={`rotate(${turn} ${C} ${C})`}>
        <polygon points={corners(n, R / Math.cos(Math.PI / n), Math.PI / n)} fill="none" stroke={ROSE} strokeWidth="2" style={thin} />
        <circle cx={C} cy={C} r={R} fill="none" stroke={AMBER} strokeWidth="2.5" style={thin} />
        <polygon points={corners(n, R, 0)} fill={triangles ? '#0c4a6e' : 'none'} stroke={SKY} strokeWidth="2" style={thin} />
        {triangles &&
          Array.from({ length: 6 }, (_, i) => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / 6
            return <line key={i} x1={C} y1={C} x2={C + R * Math.cos(a)} y2={C + R * Math.sin(a)} stroke={SKY} strokeWidth="2" />
          })}
      </g>
    </svg>
  )
}

// One side of each polygon, turned to the top and stretched tall so the gaps show at any number of sides.
function CloseUp({ n }) {
  const half = Math.PI / n
  const outer = R / Math.cos(half)
  const inner = R * Math.cos(half)
  const span = outer - inner
  const w = 2.4 * R * Math.sin(half)
  const box = `${C - w / 2} ${C - outer - 0.3 * span} ${w} ${1.6 * span}`
  return (
    <div style={{ width: 160 }}>
      <div className="h-28 rounded-lg border border-slate-700">
        <Drawing n={n} viewBox={box} label="Close-up of one side, stretched tall" turn={(-half * 180) / Math.PI} stretch />
      </div>
      <p className="mt-1 text-center text-xs text-slate-400">close-up of one side, stretched tall</p>
    </div>
  )
}

function Squeeze({ n, triangles }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div style={{ width: 260, maxWidth: '100%' }}>
        <Drawing n={n} viewBox="0 0 260 260" label={`A circle between two ${n}-sided shapes`} triangles={triangles} />
      </div>
      {!triangles && <CloseUp n={n} />}
    </div>
  )
}

function Play({ state, setState }) {
  const { n, tried } = state
  const pick = k => setState({ n: k, tried: tried.includes(k) ? tried : [...tried, k] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A shape with straight sides is a <strong>polygon</strong>; one with 6 sides is a <strong>hexagon</strong>. The
        distance round a polygon is its <strong>perimeter</strong>, and that you <em>can</em> measure with a ruler.
        Draw a polygon inside the circle (blue) and one outside it (red), and give them more and more sides. The
        circle is 100 units across.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Number of sides">
        {SIDES.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === n ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {k} sides
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Squeeze n={n} />
      </div>
      <p className="mt-2 text-lg" data-testid="squeeze-readout">
        Inside perimeter: more than <span style={{ color: SKY }}>{inside(n)}</span>. Outside perimeter: less than{' '}
        <span style={{ color: ROSE }}>{outside(n)}</span>.
      </p>
      <p className="text-slate-400">The rim of the circle is somewhere in between.</p>
    </div>
  )
}

function Reveal() {
  const [step, setStep] = useState(0)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Each side of the blue polygon cuts straight across a piece of the rim, and a straight line is the shortest way
        between two points. So the blue perimeter is always a little shorter than the rim. The red polygon&apos;s
        corners stick out past the rim, so its perimeter is always a little longer. The rim is trapped between them,
        and they never meet.
      </p>
      {step >= 1 && (
        <div className="rounded-lg bg-slate-950 p-3">
          <Squeeze n={6} triangles />
          <p className="mt-2 text-lg" data-testid="hexagon">
            The hexagon is 6 triangles. Each has a 60° corner at the centre (360 ÷ 6) between two radii of the same
            length, so its other two corners share 180° − 60° = 120° equally: 60° each. All three corners match, so
            all three sides match: each side of the hexagon is one radius. Its perimeter is 6 radii, which is exactly
            3 diameters. So π is more than 3, for certain.
          </p>
        </div>
      )}
      {step >= 2 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Archimedes started from the hexagons and doubled the sides: 12, 24, 48, 96. Each time he worked out the
            new sides from the old ones, using the squares on a right triangle (2.7), and the gap shrank. At 96 sides
            he had trapped π:
          </p>
          <p className="text-center text-2xl font-bold text-amber-300" data-testid="archimedes-bounds">
            3 10/71 &lt; π &lt; 3 1/7
          </p>
          <p className="text-slate-300">
            (The sign &lt; means &quot;is less than&quot;.) The two ends differ by just 1/497. And the squeeze can
            go on: more sides, a tighter trap, for as long as anyone has the patience.
          </p>
        </div>
      )}
      {step < 2 && (
        <button type="button" onClick={() => setStep(step + 1)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          {step === 0 ? 'Look closely at the hexagon' : 'Keep doubling'}
        </button>
      )}
    </div>
  )
}

export default {
  id: 'bon-squeezing-the-circle',
  order: '6.2',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'Squeezing the circle',
  threads: ['Shape', 'Measurement', 'Change'],
  rigor: 2,
  move: 'squeeze',
  hook: (
    <p>
      &quot;A little more than 3&quot; isn&apos;t good enough for an astronomer or an engineer. But you can&apos;t lay a
      straight ruler along a curve. Around 250 BC, Archimedes of Syracuse found a way to pin π down using nothing but
      straight lines.
    </p>
  ),
  initialState: { n: 6, tried: [6] },
  Play,
  playReady: state => state.tried.includes(96) && state.tried.length >= 3,
  playNotReady: 'Try at least three sizes, up to 96 sides',
  predict: {
    question: <p>If you keep adding sides, will the inside and outside polygons ever have the same perimeter?</p>,
    choices: ['Yes, once there are enough sides', 'No, but the gap keeps shrinking', 'No, and the gap stops shrinking'],
    response: guess => {
      if (guess === 'No, but the gap keeps shrinking') return 'Yes: they never meet, but they close in on the rim from both sides. That is the trap.'
      if (guess === 'Yes, once there are enough sides')
        return 'At 96 sides they look the same, but the close-up still shows a gap. However many sides, the inside one cuts corners and the outside one sticks out.'
      return 'The gap never stops shrinking: every doubling of the sides closes it further.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>A circle is 20 units across. A square is drawn outside it, touching it on all four sides. What is the perimeter of the square?</p>,
    answer: 80,
    praise: 'Each side of the square is as long as the diameter, 20. Perimeter 80, so the rim is less than 4 diameters: the crudest squeeze, π < 4.',
    hint: v =>
      v === 40
        ? 'The square touches the circle on opposite sides, so each side is the full width of the circle, not the radius.'
        : v === 20
          ? 'That is one side. The perimeter goes all the way round.'
          : 'How long is each side of the square, compared with the width of the circle? Then go all the way round.',
    solution: 'The square touches the circle top and bottom, so its height is the diameter, 20, and so is each side. The perimeter is 4 × 20 = 80. The rim inside is shorter: less than 4 diameters.',
  },
  keep: 'Trap what you can’t measure: a polygon inside the circle is shorter than its rim, one outside is longer. More sides squeeze π: 3 10/71 < π < 3 1/7.',
  story: (
    <>
      <p>
        This is from Archimedes&apos; short book <em>Measurement of a Circle</em>. At every doubling he had to work out the
        new side lengths by hand, never exactly, so he always rounded the inside perimeter down and the outside one
        up. That kept the trap honest.
      </p>
      <p className="mt-2">
        People kept squeezing. Zu Chongzhi in China, around 480, trapped π far more tightly and gave the fraction
        355/113, closer to π than any other fraction with a bottom number under 16,000. Around 1600 Ludolph van
        Ceulen spent years on polygons with more than four billion billion sides; in Germany π was long called the
        Ludolphine number.
      </p>
    </>
  ),
  deeper: {
    question: <p>The same circle, 20 units across, with a hexagon inside it. What is the hexagon&apos;s perimeter?</p>,
    answer: 60,
    praise: 'Each side is one radius, 10, and there are 6: 60. So the rim is between 60 and 80, and π is between 3 and 4.',
    hint: () => 'Each side of the inside hexagon is as long as the radius. What is the radius of a circle 20 across?',
    solution: 'The radius is half of 20: 10. Each of the 6 sides is one radius, so the perimeter is 60.',
  },
}
