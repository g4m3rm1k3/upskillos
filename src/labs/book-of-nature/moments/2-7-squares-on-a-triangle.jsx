import React, { useState } from 'react'
import { Field, Label, Shape } from '../field'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const ROSE = '#fb7185'

const avg = list => [list.reduce((s, p) => s + p[0], 0) / list.length, list.reduce((s, p) => s + p[1], 0) / list.length]

// A triangle with its square corner at O, one short side across and one up, and a square on each side.
// Grid y runs down, so "up" is minus.
function Triangle({ a, b }) {
  const O = [b, a + b]
  const A = [b + a, a + b]
  const B = [b, a]
  const sqA = [O, A, [b + a, 2 * a + b], [b, 2 * a + b]]
  const sqB = [O, B, [0, a], [0, a + b]]
  const sqC = [A, B, [b + b, 0], [b + a + b, b]]
  return (
    <Field w={a + 2 * b} h={2 * a + b} unit={Math.min(22, 300 / (2 * a + b))} label={`A right triangle with short sides ${a} and ${b}`}>
      <Shape points={sqA} fill={AMBER} />
      <Shape points={sqB} fill={SKY} />
      <Shape points={sqC} fill={GREEN} />
      <Shape points={[O, A, B]} fill={ROSE} opacity={0.8} />
      <Label x={avg(sqA)[0]} y={avg(sqA)[1]} size={0.9}>{a * a}</Label>
      <Label x={avg(sqB)[0]} y={avg(sqB)[1]} size={0.9}>{b * b}</Label>
      <Label x={avg(sqC)[0]} y={avg(sqC)[1]} size={0.9}>{a * a + b * b}</Label>
    </Field>
  )
}

function Play({ state, setState }) {
  const { a, b, rows } = state
  const record = () => !rows.some(r => r[0] === a && r[1] === b) && setState({ ...state, rows: [...rows, [a, b]] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        This triangle has a square corner, like the corner of a page. A square corner is called a{' '}
        <strong>right angle</strong>. A square is built on each of its three sides, and each square shows how many
        squares of land it holds. Change the two short sides and record a few triangles.
      </p>
      <div className="flex flex-wrap gap-4">
        <Stepper label="across" value={a} min={1} max={6} onChange={v => setState({ ...state, a: v })} />
        <Stepper label="up" value={b} min={1} max={6} onChange={v => setState({ ...state, b: v })} />
        <button type="button" onClick={record} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Record this triangle
        </button>
      </div>
      <div className="mt-3 rounded-lg bg-slate-950 p-3">
        <Triangle a={a} b={b} />
      </div>
      {rows.length > 0 && (
        <table className="mt-3 font-mono text-lg">
          <thead>
            <tr className="text-sm text-slate-400">
              <th className="pr-4 text-left">square across</th>
              <th className="pr-4 text-left">square up</th>
              <th className="text-left">square on the long side</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([x, y]) => (
              <tr key={`${x}-${y}`} data-testid="square-row">
                <td style={{ color: AMBER }}>{x * x}</td>
                <td style={{ color: SKY }}>{y * y}</td>
                <td style={{ color: GREEN }}>{x * x + y * y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// The big square of side a + b, holding four copies of the triangle two ways.
const A3 = 3
const B4 = 4
const N = A3 + B4
const WAY_ONE = [
  [[0, 0], [A3, 0], [0, B4]],
  [[A3, 0], [N, 0], [N, A3]],
  [[N, A3], [N, N], [B4, N]],
  [[B4, N], [0, N], [0, B4]],
]
const WAY_TWO = [
  [[A3, 0], [N, 0], [N, A3]],
  [[A3, 0], [A3, A3], [N, A3]],
  [[0, A3], [A3, A3], [A3, N]],
  [[0, A3], [0, N], [A3, N]],
]

function Reveal() {
  const [out, setOut] = useState(false)
  const fade = { opacity: out ? 0.08 : 1, transition: 'opacity 800ms' }
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Two equal big squares, each holding four copies of the same triangle, arranged two different ways. Take the
        triangles out and look at what is left.
      </p>
      <div className="flex flex-wrap gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Field w={N} h={N} unit={30} label="Four triangles leaving a tilted square">
            <Shape points={[[A3, 0], [N, A3], [B4, N], [0, B4]]} fill={GREEN} />
            <g style={fade}>{WAY_ONE.map((t, k) => <Shape key={k} points={t} fill={ROSE} opacity={0.85} />)}</g>
            {out && <Label x={N / 2} y={N / 2} size={0.45}>long-side square</Label>}
          </Field>
        </div>
        <div className="rounded-lg bg-slate-950 p-3">
          <Field w={N} h={N} unit={30} label="Four triangles leaving two squares">
            <Shape points={[[0, 0], [A3, 0], [A3, A3], [0, A3]]} fill={AMBER} />
            <Shape points={[[A3, A3], [N, A3], [N, N], [A3, N]]} fill={SKY} />
            <g style={fade}>{WAY_TWO.map((t, k) => <Shape key={k} points={t} fill={ROSE} opacity={0.85} />)}</g>
          </Field>
        </div>
      </div>
      <button type="button" onClick={() => setOut(!out)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
        {out ? 'Put the triangles back' : 'Take the triangles out'}
      </button>
      {out && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="proof-result">
            Same big square, same four triangles, so what is left must be the same amount of land. On the left, the
            square on the long side. On the right, the two squares on the short sides.
          </p>
          <p className="text-slate-300">
            Nothing here depends on the sides being 3 and 4. Any triangle with a right angle fits into this picture,
            so for every one of them the two small squares together hold exactly as much as the big one.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-squares-on-a-triangle',
  order: '2.7',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'Squares on a triangle',
  threads: ['Shape', 'Number'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      Doubling a square, you built a square on a slanted line. Builders and surveyors met slanted lines all the
      time: a ramp, a roof, the long side of a corner of a field. Is there a way to know how big the square on a
      slanted line is, without counting?
    </p>
  ),
  initialState: { a: 3, b: 4, rows: [] },
  Play,
  playReady: state => state.rows.length >= 3,
  playNotReady: 'Record three different triangles',
  predict: {
    question: <p>A triangle with a right angle has short sides 5 and 12. How many squares of land does the square on its long side hold?</p>,
    response: guess => {
      if (guess === 169) return 'Yes: 25 + 144 = 169. Now see why it always works.'
      if (guess === 289) return '289 is 17 × 17: it adds the sides first. It’s the squares that add: 25 + 144 = 169.'
      if (guess === 60) return '60 is 5 × 12, the rectangle on the two short sides. The square on the long side is 25 + 144 = 169.'
      return `It's 169: the square on 5 holds 25, the square on 12 holds 144, and 25 + 144 = 169.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A problem from a Babylonian tablet: a beam 30 long stands upright against a wall. Its top slides 6 down the
        wall. How far is its foot from the wall now?
      </p>
    ),
    answer: 18,
    praise: 'The beam is the long side: 30 × 30 = 900. The top is now 24 up: 24 × 24 = 576. 900 − 576 = 324, and 18 × 18 = 324.',
    hint: v =>
      v === 6
        ? 'The foot moves further than the top slides. The beam, the wall and the ground make a triangle with a right angle: the beam is the long side.'
        : v === 24
          ? '24 is how high the top is now. The question asks how far the foot is from the wall.'
          : 'The beam is the long side of a right triangle, and its top is 24 up the wall. Square 30 and square 24: the difference is the square on the ground side.',
    solution:
      'The beam leans against the wall, so beam, wall and ground make a triangle with a right angle at the foot of the wall. The top is 30 − 6 = 24 up. Square on the beam: 900. Square on the wall side: 576. The square on the ground side is the difference, 324, and 18 × 18 = 324. The foot is 18 from the wall.',
  },
  keep: 'In a triangle with a right angle, the squares on the two short sides together hold exactly as much as the square on the long side. Four triangles in a big square show why.',
  symbols: (
    <p>
      With short sides <em>a</em> and <em>b</em> and long side <em>c</em>: <em>a</em> × <em>a</em> + <em>b</em> ×{' '}
      <em>b</em> = <em>c</em> × <em>c</em>. Forget it? Take four triangles out of a big square.
    </p>
  ),
  story: (
    <>
      <p>
        This fact is named after Pythagoras, but the Babylonians knew it more than a thousand years before
        Pythagoras was born, around 570 BC. A tablet called Plimpton 322, written around 1800 BC and now at Columbia
        University, lists pairs of numbers for fifteen such triangles. Its first row has a short side of 119 and a
        long side of 169. What the tablet was for is still argued about.
      </p>
      <p className="mt-2">
        The beam problem is on a Babylonian tablet in the British Museum. A popular story says Egyptian surveyors
        made right angles with a rope knotted into 12 equal lengths, stretched into a 3-4-5 triangle. It&apos;s a
        lovely idea, but there is no ancient evidence for it.
      </p>
    </>
  ),
  deeper: {
    question: <p>The first row of Plimpton 322: a triangle with a right angle, short side 119, long side 169. How long is the other short side?</p>,
    answer: 120,
    praise: '169 × 169 = 28,561 and 119 × 119 = 14,161. The difference is 14,400, and 120 × 120 = 14,400.',
    hint: () => 'Square both numbers. The difference is the square on the missing side. Then find what number times itself makes it.',
    solution: 'The square on the long side holds 28,561. The square on the short side holds 14,161. The missing square holds the difference, 14,400, which is 120 × 120. So the other side is 120.',
  },
}
