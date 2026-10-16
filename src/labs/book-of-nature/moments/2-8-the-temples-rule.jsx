import React, { useState } from 'react'
import { Field, Label, Shape } from '../field'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const ROSE = '#fb7185'

// Four-sided fields 12 tall. Slants of 5 make sides of 13 (5, 12, 13 is a right triangle).
// Each field: corners, the four sides (top, bottom, left, right), and the true area.
const FIELDS = {
  rectangle: { name: 'Rectangle', corners: [[5, 0], [15, 0], [15, 12], [5, 12]], top: 10, bottom: 10, left: 12, right: 12, area: 120, how: 'It is already a 10 × 12 rectangle.' },
  slanted: { name: 'Slanted', corners: [[5, 0], [15, 0], [10, 12], [0, 12]], top: 10, bottom: 10, left: 13, right: 13, area: 120, how: 'Cut and move: a 10 × 12 rectangle.' },
  narrowing: { name: 'Narrowing', corners: [[5, 0], [15, 0], [20, 12], [0, 12]], top: 10, bottom: 20, left: 13, right: 13, area: 180, how: 'A flipped copy beside it makes a slanted field 30 × 12: 360. Half is 180.' },
  pointed: { name: 'Pointed', corners: [[10, 0], [10, 0], [15, 12], [5, 12]], top: 0, bottom: 10, left: 13, right: 13, area: 60, how: 'A triangle: half of 10 × 12.' },
}
const rule = f => ((f.top + f.bottom) / 2) * ((f.left + f.right) / 2)

function FieldPicture({ f, unit = 20 }) {
  const [a, b, c, d] = f.corners
  return (
    <Field w={20} h={12} unit={unit} label={`${f.name} field`}>
      <Shape points={f.corners} fill={GREEN} />
      {f.top > 0 && <Label x={(a[0] + b[0]) / 2} y={-0.1 + 0.8} size={0.9} fill={AMBER}>{f.top}</Label>}
      <Label x={(c[0] + d[0]) / 2} y={11.2} size={0.9} fill={AMBER}>{f.bottom}</Label>
      <Label x={(a[0] + d[0]) / 2 + 1} y={6} size={0.9} fill={SKY}>{f.left}</Label>
      <Label x={(b[0] + c[0]) / 2 - 1} y={6} size={0.9} fill={SKY}>{f.right}</Label>
    </Field>
  )
}

function Play({ state, setState }) {
  const { field, seen } = state
  const f = FIELDS[field]
  const pick = k => setState({ field: k, seen: seen.includes(k) ? seen : [...seen, k] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The temple scribes&apos; rule for a four-sided field: average the top and bottom sides (add them and
        halve), average the left and right sides the same way, and multiply. Pick a field and compare the rule with the land that is really there.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Field">
        {Object.entries(FIELDS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === field ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {v.name}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <FieldPicture f={f} />
      </div>
      <div className="mt-3 space-y-1 text-lg">
        <p data-testid="rule-area">
          The rule: ({f.top} + {f.bottom}) ÷ 2 × ({f.left} + {f.right}) ÷ 2 ={' '}
          <strong className="text-amber-300">{rule(f)}</strong>
        </p>
        <p data-testid="true-area">
          The real land: <strong className="text-emerald-400">{f.area}</strong>. {f.how}
        </p>
      </div>
    </div>
  )
}

// A slanted field 10 wide and 12 tall, leaning by different amounts. Each lean gives whole sides:
// 5 over 12 up makes 13, 9 over makes 15, 16 over makes 20.
const LEANS = [
  { lean: 0, side: 12 },
  { lean: 5, side: 13 },
  { lean: 9, side: 15 },
  { lean: 16, side: 20 },
]

function Reveal() {
  const [i, setI] = useState(1)
  const { lean, side } = LEANS[i]
  const ruled = 10 * side
  const corners = [[lean, 0], [lean + 10, 0], [10, 12], [0, 12]]
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Take one field, 10 wide and 12 tall, and lean it further and further over.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Lean">
        {LEANS.map((l, k) => (
          <button
            key={l.lean}
            type="button"
            aria-label={`lean ${l.lean}`}
            onClick={() => setI(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === i ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            lean {l.lean}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Field w={26} h={12} unit={14} label={`A field leaning ${lean}`}>
          <Shape points={corners} fill={GREEN} />
          <line x1={lean} y1={0} x2={lean} y2={12} stroke={ROSE} strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <Label x={lean + 1.2} y={6} size={1} fill={ROSE}>12</Label>
          {lean > 0 && <Label x={lean / 2 - 0.9} y={5} size={1} fill={SKY}>{side}</Label>}
        </Field>
      </div>
      <div className="mt-3 space-y-2 text-lg">
        <div className="flex items-center gap-3">
          <span className="w-28 text-slate-400">real land</span>
          <span className="h-5 rounded bg-emerald-400" style={{ width: `${(120 / 200) * 60}%` }} />
          <strong>120</strong>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 text-slate-400">the rule</span>
          <span className="h-5 rounded bg-amber-400" style={{ width: `${(ruled / 200) * 60}%`, transition: 'width 500ms' }} />
          <strong data-testid="lean-rule">{ruled}</strong>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Leaning never changes the land: cut and move, and it is always 10 × 12 = 120. But the slanted sides get
          longer, and the rule uses them as if they were the height. The rule multiplies by {side} where the field
          is only 12 tall.
        </p>
        <p className="text-slate-300">
          A slanted side is the long side of a triangle with a right angle, with the height as one short side. Its
          square is the height&apos;s square plus another square, so it is always longer than the height unless the
          field doesn&apos;t lean at all. So the rule is never too small, and it is exactly right only for
          rectangles.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-the-temples-rule',
  order: '2.8',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: "The temple's rule",
  threads: ['Shape', 'Measurement'],
  rigor: 2,
  move: 'small-case',
  hook: (
    <p>
      Carved on the walls of the temple of Horus at Edfu are long lists of fields given to the temple, around 100
      BC. For every four-sided field, the scribes used one simple rule for its area. Is a simple rule that everyone
      uses a rule you can trust?
    </p>
  ),
  initialState: { field: 'rectangle', seen: ['rectangle'] },
  Play,
  playReady: state => state.seen.length >= 3,
  playNotReady: 'Look at three of the fields',
  predict: {
    question: <p>Can the temple&apos;s rule ever give less land than is really there?</p>,
    choices: ['Yes, sometimes', 'No, never', 'It is always exactly right'],
    response: guess => {
      if (guess === 'No, never') return 'Never too small, and here is the reason, not just the cases you tried.'
      if (guess === 'It is always exactly right') return 'It was right for the rectangle, but not for the slanted fields. It is right only when nothing slants.'
      return 'It never gives too little. Every field you tried came out too big or exactly right, and the reason shows it has to.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <div>
        <p>
          A field has a top side of 6 and a bottom side of 16, 12 apart, and two slanted sides of 13. How many more
          squares of land does the temple&apos;s rule record than the field really has?
        </p>
      </div>
    ),
    answer: 11,
    praise: 'The rule: 11 × 13 = 143. The real land: a flipped copy makes 22 × 12 = 264, so the field is 132. 143 − 132 = 11.',
    hint: v =>
      v === 143
        ? "143 is what the rule records. Now find the real land and take it away."
        : v === 132
          ? "132 is the real land. How much does the rule record?"
          : 'Work out both. The rule: average the top and bottom, average the two slanted sides, multiply. The real land: add a flipped copy to make a slanted field.',
    solution:
      'The rule: (6 + 16) ÷ 2 = 11 and (13 + 13) ÷ 2 = 13, so 11 × 13 = 143. The real land: a flipped copy beside the field makes a slanted field 6 + 16 = 22 wide and 12 tall, 264 squares, and the field is half: 132. The rule records 143 − 132 = 11 squares too many.',
  },
  keep: "A rule that works on rectangles can fail on other shapes. Test a rule on a case you can check, and look for the reason it works, or doesn't.",
  story: (
    <>
      <p>
        The temple of Horus at Edfu was built between 237 and 57 BC, when Greek kings ruled Egypt. Its donation
        texts record hundreds of fields. The scribes even treated three-sided fields as four-sided ones with a side
        of 0, just like the pointed field you tried.
      </p>
      <p className="mt-2">
        The rule is far older than the temple: Babylonian surveyors used it too. For fields that were nearly
        rectangles it was close enough, and a rule that is easy to apply and hard to argue with has its uses. It
        just isn&apos;t the truth, and now you know exactly when and why it fails.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        A field has four sides of 10. It is squashed into a diamond, so that its corner-to-corner lines are 16 and
        12 long and cross at right angles in the middle. The rule says 100. How much land is really there?
      </p>
    ),
    answer: 96,
    praise: 'The diagonals cut it into 4 triangles, each half of 8 × 6 = 24. 4 × 24 = 96.',
    hint: () => 'The two corner-to-corner lines cut the diamond into 4 triangles with a right angle in the middle. How big is each one?',
    solution: 'The lines cross in the middle, cutting each other in half: 8 and 6. They split the diamond into 4 triangles with short sides 8 and 6 (and long side 10, since 64 + 36 = 100). Each triangle is half of 8 × 6 = 24, so the diamond is 4 × 24 = 96, not the 100 the rule gives.',
  },
}
