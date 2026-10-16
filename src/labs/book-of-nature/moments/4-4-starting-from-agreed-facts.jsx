import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'

const rad = d => (d * Math.PI) / 180

// A triangle with angles a (bottom left) and b (bottom right), fitted into a 360 × 170 box.
function corners(a, b) {
  const L = 1
  const ac = (L * Math.sin(rad(b))) / Math.sin(rad(a + b))
  const apex = [ac * Math.cos(rad(a)), ac * Math.sin(rad(a))]
  const xs = [0, L, apex[0]]
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const k = Math.min(320 / (maxX - minX), 140 / apex[1])
  const tx = x => 20 + (x - minX) * k
  const ty = y => 165 - y * k
  return { A: [tx(0), ty(0)], B: [tx(L), ty(0)], C: [tx(apex[0]), ty(apex[1])] }
}

// An angle mark at P, from direction `from` turning `deg` counterclockwise (screen y down).
function Mark({ P, from, deg, colour, label, r = 22 }) {
  const p = [P[0] + r * Math.cos(rad(from)), P[1] - r * Math.sin(rad(from))]
  const q = [P[0] + r * Math.cos(rad(from + deg)), P[1] - r * Math.sin(rad(from + deg))]
  const m = rad(from + deg / 2)
  return (
    <g>
      <path d={`M${P[0]},${P[1]}L${p[0]},${p[1]}A${r},${r} 0 ${deg > 180 ? 1 : 0},0 ${q[0]},${q[1]}Z`} fill={colour} fillOpacity="0.4" stroke={colour} strokeWidth="1.5" />
      <text x={P[0] + (r + 14) * Math.cos(m)} y={P[1] - (r + 14) * Math.sin(m)} fill={colour} fontSize="12" fontWeight="700" textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  )
}

function Triangle({ a, b, children, labels = true }) {
  const { A, B, C } = corners(a, b)
  const c = 180 - a - b
  const toB = 0
  const toA = 180
  const dirCA = (Math.atan2(-(A[1] - C[1]), A[0] - C[0]) * 180) / Math.PI
  return (
    <svg viewBox="0 0 360 180" className="w-full" style={{ maxWidth: 420 }} role="img" aria-label={`A triangle with angles ${a}, ${b} and ${c}`}>
      <polygon points={[A, B, C].map(p => p.join(',')).join(' ')} fill="#0f2a44" stroke="#cbd5e1" strokeWidth="2" />
      <Mark P={A} from={toB} deg={a} colour={SKY} label={labels ? `${a}°` : ''} />
      <Mark P={B} from={toA - b} deg={b} colour={AMBER} label={labels ? `${b}°` : ''} />
      <Mark P={C} from={(dirCA + 360) % 360} deg={c} colour={ROSE} label={labels ? `${c}°` : ''} />
      {children?.({ A, B, C, dirCA })}
    </svg>
  )
}

const SHAPES = [
  [60, 60],
  [45, 45],
  [30, 60],
  [20, 40],
  [100, 30],
  [15, 10],
]

function Play({ state, setState }) {
  const { k, seen } = state
  const [a, b] = SHAPES[k]
  const c = 180 - a - b
  const pick = i => setState({ k: i, seen: seen.includes(i) ? seen : [...seen, i] })
  return (
    <div>
      <p className="mb-3 text-slate-300">Here are triangles of very different shapes, with their three angles measured. Add up the angles of each.</p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Triangle">
        {SHAPES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`triangle ${i + 1}`}
            onClick={() => pick(i)}
            className={`w-10 rounded-lg border py-1 font-semibold ${i === k ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Triangle a={a} b={b} />
      </div>
      <p className="mt-2 font-mono text-lg" data-testid="angle-sum">
        {a}° + {b}° + {c}° = {a + b + c}°
      </p>
    </div>
  )
}

function Reveal() {
  const [step, setStep] = useState(0)
  const a = 50
  const b = 60
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Measuring more triangles can never cover them all. So use two facts you already have: angles in a Z between
        parallel lines are equal (3.4), and a straight line is half a turn, 180° (3.2).
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Triangle a={a} b={b}>
          {({ C }) => (
            <>
              {step >= 1 && <line x1={C[0] - 170} y1={C[1]} x2={C[0] + 170} y2={C[1]} stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4" />}
              {step >= 2 && (
                <>
                  <Mark P={C} from={180} deg={a} colour={SKY} label={`${a}°`} r={30} />
                  <Mark P={C} from={360 - b} deg={b} colour={AMBER} label={`${b}°`} r={30} />
                </>
              )}
            </>
          )}
        </Triangle>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {step === 0 && (
          <button type="button" onClick={() => setStep(1)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
            Draw a line through the top, parallel to the bottom
          </button>
        )}
        {step === 1 && (
          <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
            Copy the bottom angles up
          </button>
        )}
      </div>
      {step >= 2 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="angle-proof">
            Each side of the triangle crosses the two parallel lines, so each bottom angle has a Z partner at the top.
            Now the top holds all three angles side by side, and together they fill the straight line: 180°. That
            works for every triangle, because the argument never used the sizes of the angles.
          </p>
          <p className="text-slate-300">
            That is how a proof is built: start from facts already agreed, and chain them, each step forced by the one
            before. Euclid built his whole geometry this way from a handful of starting facts.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-starting-from-agreed-facts',
  order: '4.4',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'Starting from agreed facts',
  threads: ['Shape', 'Structure'],
  rigor: 3,
  move: 'draw-picture',
  hook: (
    <p>
      After the diagonal, Greek mathematicians wanted every claim proved. But a proof has to start somewhere. If
      every fact needs an earlier fact to prove it, where does the chain begin?
    </p>
  ),
  initialState: { k: 0, seen: [0] },
  Play,
  playReady: state => state.seen.length >= 3,
  playNotReady: 'Look at three triangles',
  predict: {
    question: <p>Picture a very long, flat triangle with bottom angles of just 1° and 2°. What do its three angles add up to?</p>,
    choices: ['Still 180°', 'Less than 180°', 'More than 180°'],
    response: guess => {
      if (guess === 'Still 180°') return 'Still 180°: the top angle is 177°. Here is the proof that it can’t be anything else.'
      if (guess === 'Less than 180°') return 'The bottom angles are tiny, but the top one opens up to 177° to make up the difference. Always 180°, and here is why.'
      return 'It’s always exactly 180°. The flatter the triangle, the wider the top angle. Here is why it can’t be anything else.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>What do the four angles of any four-sided shape add up to? Hint: one straight cut from corner to corner.</p>,
    answer: 360,
    praise: 'A cut from corner to corner makes two triangles, and their angles together are the four corners’ angles: 2 × 180° = 360°.',
    hint: v =>
      v === 180
        ? 'A four-sided shape cut corner to corner makes two triangles, not one.'
        : 'Cut from one corner to the opposite corner. How many triangles do you get, and what does each one’s angles add to?',
    solution: 'A cut from corner to corner splits the shape into two triangles. Their angles together make up exactly the four angles of the shape, so the total is 180° + 180° = 360°.',
  },
  keep: 'A triangle’s angles always add up to 180°, proved by drawing a parallel line through the top and copying the bottom angles up. A proof chains agreed facts until the conclusion is forced.',
  symbols: <p>angle A + angle B + angle C = 180° in every triangle.</p>,
  story: (
    <>
      <p>
        Euclid&apos;s <em>Elements</em>, written in Alexandria around 300 BC, opens with definitions and a few
        starting facts he asks the reader to accept, such as that a straight line can be drawn between any two
        points. Everything else, hundreds of results in thirteen books, is proved from them. The triangle&apos;s
        180° is Book I, Proposition 32. It became one of the most copied and studied books in history.
      </p>
      <p className="mt-2">
        One of Euclid&apos;s starting facts, about parallel lines, was longer and less obvious than the others.
        Mathematicians tried for two thousand years to prove it from the rest, and failed. Why they failed is a
        story for much later in the series.
      </p>
    </>
  ),
  deeper: {
    question: <p>What do the five angles of any five-sided shape add up to?</p>,
    answer: 540,
    praise: 'Cuts from one corner make three triangles: 3 × 180° = 540°.',
    hint: () => 'From one corner, cut to every corner that isn’t next to it. How many triangles?',
    solution: 'From one corner of a five-sided shape you can cut to the two corners not next to it, making three triangles. Their angles make up the five corners: 3 × 180° = 540°.',
  },
}
