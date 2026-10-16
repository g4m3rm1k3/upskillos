import React, { useState } from 'react'
import { Field, Label, Shape } from '../field'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const ROSE = '#fb7185'

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
const key = (r, c) => `${Math.min(r, c)}x${Math.max(r, c)}`

function Play({ state, setState }) {
  const { rows, cols, found } = state
  const area = rows * cols
  const record = (r, c) => {
    const next = { ...state, rows: r, cols: c }
    if (r * c === 24 && !found.includes(key(r, c))) next.found = [...found, key(r, c)]
    setState(next)
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Fields were measured in squares of land. Stretch this field with the buttons and watch how many squares it
        holds. Can you make three differently shaped fields that each hold exactly 24 squares?
      </p>
      <div className="flex flex-wrap gap-4">
        <Stepper label="rows" value={rows} onChange={r => record(r, cols)} />
        <Stepper label="columns" value={cols} onChange={c => record(rows, c)} />
      </div>
      <div className="mt-3 rounded-lg bg-slate-950 p-3">
        <Field w={13} h={12} unit={26} label={`A field of ${rows} rows and ${cols} columns`}>
          <Shape points={rect(0, 0, cols, rows)} fill={GREEN} />
          {Array.from({ length: rows }, (_, r) => (
            <Label key={r} x={cols + 0.6} y={r + 0.5} size={0.55} fill={AMBER}>
              {cols}
            </Label>
          ))}
        </Field>
      </div>
      <p className="mt-2 text-lg">
        Squares of land: <strong className="text-amber-300" data-testid="field-area">{area}</strong>
      </p>
      {found.length > 0 && (
        <p className="mt-1 text-slate-300" data-testid="found-24">
          Fields of 24 found: {found.map(k => k.replace('x', ' × ')).join(', ')}
        </p>
      )}
    </div>
  )
}

// The field after the flood: 10 wide, 7 tall, with a 4 by 3 corner washed away.
const FIELD = [[0, 0], [6, 0], [6, 3], [10, 3], [10, 7], [0, 7]]

function Reveal() {
  const [way, setWay] = useState(null)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        The field isn&apos;t a rectangle any more, but it is made of rectangles. There are two ways to see them.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Field w={10} h={7} unit={34} label="The field after the flood">
          {way === null && <Shape points={FIELD} fill={GREEN} />}
          {way === 'split' && (
            <>
              <Shape points={rect(0, 0, 6, 7)} fill={AMBER} />
              <Shape points={rect(6, 3, 4, 4)} fill={SKY} />
              <Label x={3} y={3.5}>6 × 7 = 42</Label>
              <Label x={8} y={5}>4 × 4 = 16</Label>
            </>
          )}
          {way === 'whole' && (
            <>
              <Shape points={rect(0, 0, 10, 7)} fill={GREEN} />
              <Shape points={rect(6, 0, 4, 3)} fill={ROSE} opacity={0.6} dash="0.2 0.15" />
              <Label x={3} y={4}>10 × 7 = 70</Label>
              <Label x={8} y={1.5}>− 4 × 3</Label>
            </>
          )}
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setWay('split')} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Split it into two rectangles
        </button>
        <button type="button" onClick={() => setWay('whole')} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Whole field minus the bite
        </button>
      </div>
      {way && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="flood-way">
            {way === 'split'
              ? '42 + 16 = 58 squares. Each rectangle is rows of equal length, so it is rows × columns.'
              : '70 − 12 = 58 squares. The whole field was 10 × 7, and the flood took a 4 × 3 corner.'}
          </p>
          <p className="text-slate-300">
            Both ways give 58, because area is just a count of squares. A rectangle is rows of equal length, so
            you count one row and multiply by the number of rows. Any field with square corners can be split into
            rectangles, or seen as a big rectangle with pieces missing.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-after-the-flood',
  order: '2.1',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'After the flood',
  threads: ['Shape', 'Measurement'],
  rigor: 1,
  move: 'group-it',
  hook: (
    <p>
      Every summer the Nile flooded, spreading rich mud over the fields of Egypt and washing away the stones that
      marked where one farmer&apos;s land ended and the next began. Each farmer paid tax according to the size of
      their land. When the water went down, how could anyone say how much land a farmer had, or had lost?
    </p>
  ),
  initialState: { rows: 3, cols: 4, found: [] },
  Play,
  playReady: state => state.found.length >= 3,
  playNotReady: 'Find three different fields of 24 squares',
  predict: {
    question: (
      <div>
        <p>
          This field was 10 squares wide and 7 tall. The flood washed away a corner 4 wide and 3 tall. How many
          squares of land are left?
        </p>
        <div className="mt-3 rounded-lg bg-slate-950 p-3">
          <Field w={10} h={7} unit={26} label="A field with a corner washed away">
            <Shape points={FIELD} fill={GREEN} />
            <Shape points={rect(6, 0, 4, 3)} fill="none" stroke="#475569" dash="0.2 0.15" />
          </Field>
        </div>
      </div>
    ),
    response: guess => {
      if (guess === 58) return 'Yes, 58. Now see the two ways to get there.'
      if (guess === 70) return '70 is the whole field before the flood. The washed-away corner has to come off.'
      if (guess === 12) return '12 is the land that was lost: the 4 × 3 corner. The question was how much is left.'
      return `It's 58, not ${guess}. The field is made of rectangles, and each rectangle is rows × columns.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A square field is 9 squares wide and 9 squares long. In the middle is a square pond, 3 wide and 3 long. How
        many squares of farmland are there?
      </p>
    ),
    answer: 72,
    praise: 'The whole field is 9 × 9 = 81 squares, the pond is 3 × 3 = 9, and 81 − 9 = 72.',
    hint: v =>
      v === 81
        ? "That's the whole field, pond and all. The pond isn't farmland."
        : v === 9
          ? "That's the pond. How much is left around it?"
          : 'See it as a whole field with a piece missing: count the whole square, then take away the pond.',
    solution: 'Whole field: 9 rows of 9 is 81 squares. Pond: 3 rows of 3 is 9 squares. Farmland: 81 − 9 = 72.',
  },
  keep: 'Area is a count of squares. A rectangle is rows of equal length, so its area is rows × columns, and other square-cornered shapes split into rectangles.',
  symbols: <p>Area of a rectangle = width × length. Forget it? Picture the rows.</p>,
  story: (
    <>
      <p>
        The Greek historian Herodotus, writing around 440 BC, says the king of Egypt gave every farmer an equal
        square plot and taxed each one yearly. If the river carried part of a plot away, the owner reported it, and
        surveyors came to measure how much smaller it had become. To his thinking, Herodotus adds, this is how the
        Greeks learnt the art of measuring land. It is his guess, but the word fits:{' '}
        <em>geometry</em> means &quot;earth measuring&quot;.
      </p>
      <p className="mt-2">
        A painting in the tomb of Menna, a scribe of the fields at Thebes around 1400 BC, shows officials measuring
        a field of grain with a long knotted rope.
      </p>
    </>
  ),
  deeper: {
    question: <p>The Egyptian unit of land, the setat, was a square 100 cubits on each side. How many squares of one cubit is that?</p>,
    answer: 10000,
    praise: '100 rows of 100 square cubits: 10,000.',
    hint: () => 'Picture it as rows: how many rows, and how many square cubits in each row?',
    solution: 'A square 100 cubits on each side is 100 rows of 100 squares, one cubit each: 100 × 100 = 10,000.',
  },
}
