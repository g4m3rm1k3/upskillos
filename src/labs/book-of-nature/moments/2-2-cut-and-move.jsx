import React, { useState } from 'react'
import { Field, Label, Shape } from '../field'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'

const W = 6
const H = 4

function Play({ state, setState }) {
  const { slant, cut, tried } = state
  // The field leans: its top edge is shifted right by `slant` squares.
  const triangle = [[0, H], [slant, H], [slant, 0]]
  const rest = [[slant, H], [W, H], [W + slant, 0], [slant, 0]]
  const doCut = () => setState({ ...state, cut: true, tried: tried.includes(slant) ? tried : [...tried, slant] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        This field leans over: its ends slant, so you can&apos;t count it in rows. Cut off the slanted end and move
        it to the other side. Then change the slant and do it again.
      </p>
      <Stepper label="slant" value={slant} min={1} max={5} onChange={s => setState({ ...state, slant: s, cut: false })} />
      <div className="mt-3 rounded-lg bg-slate-950 p-3">
        <Field w={W + 5} h={H} unit={36} label={`A slanted field, slant ${slant}`}>
          <Shape points={rest} fill={GREEN} />
          <g style={{ transform: `translateX(${cut ? W : 0}px)`, transition: 'transform 900ms ease-in-out' }}>
            <Shape points={triangle} fill={AMBER} />
          </g>
        </Field>
      </div>
      <button type="button" onClick={doCut} disabled={cut} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600 disabled:opacity-40">
        Cut and move
      </button>
      {cut && (
        <p className="mt-2 text-lg" data-testid="cut-result">
          Now it&apos;s a rectangle: {H} rows of {W}, so {W * H} squares.
        </p>
      )}
      {tried.length > 0 && <p className="mt-1 text-slate-400">Slants you have cut: {tried.join(', ')}</p>}
    </div>
  )
}

// A triangle field and the flipped copy that turns it into a slanted field.
const TRI = [[0, 4], [6, 4], [2, 0]]
const COPY = [[8, 0], [2, 0], [6, 4]]

function Reveal() {
  const [copy, setCopy] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        A triangle won&apos;t cut into a rectangle so easily. So use the trick from the staircase of pebbles: add a
        flipped copy.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Field w={8} h={4} unit={40} label="A triangle field">
          <Shape points={TRI} fill={AMBER} />
          {copy && <Shape points={COPY} fill={SKY} />}
          {!copy && <Label x={2.7} y={2.9}>?</Label>}
        </Field>
      </div>
      {!copy && (
        <button type="button" onClick={() => setCopy(true)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Add a flipped copy
        </button>
      )}
      {copy && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="triangle-result">
            The two triangles make a slanted field 6 wide and 4 tall. Cut and move it, and it&apos;s a 6 × 4
            rectangle: 24 squares. The triangle is half of that: 12.
          </p>
          <p className="text-slate-300">
            Cutting a field up and moving the pieces never changes how much land there is. That one fact turns
            slanted fields into rectangles, and two copies of any triangle make a slanted field. So a triangle is
            half of a rectangle as wide as its base and as tall as its height.
          </p>
        </div>
      )}
    </div>
  )
}

function House() {
  return (
    <Field w={6} h={7} unit={26} label="A house-shaped field">
      <Shape points={[[0, 3], [6, 3], [6, 7], [0, 7]]} fill={GREEN} />
      <Shape points={[[0, 3], [6, 3], [3, 0]]} fill={AMBER} />
    </Field>
  )
}

export default {
  id: 'bon-cut-and-move',
  order: '2.2',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'Cut and move',
  threads: ['Shape', 'Measurement'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      Fields along a winding river are rarely rectangles. Their ends slant, and some come to a point. Rows of
      squares don&apos;t fit them. How do you measure a field that won&apos;t line up with your squares?
    </p>
  ),
  initialState: { slant: 3, cut: false, tried: [] },
  Play,
  playReady: state => state.tried.length >= 2,
  playNotReady: 'Cut and move with two different slants',
  predict: {
    question: (
      <div>
        <p>This triangle field is 6 squares along the bottom and 4 squares tall. How many squares of land is it?</p>
        <div className="mt-3 rounded-lg bg-slate-950 p-3">
          <Field w={6} h={4} unit={30} label="A triangle field 6 wide and 4 tall">
            <Shape points={TRI} fill={AMBER} />
          </Field>
        </div>
      </div>
    ),
    response: guess => {
      if (guess === 12) return 'Yes, 12. Here is a way to be sure, without counting broken squares.'
      if (guess === 24) return '24 is the whole 6 × 4 rectangle around it. The triangle is only part of that.'
      if (guess === 10) return '10 adds the width and the height. Area counts squares, so it multiplies.'
      return `It's 12, not ${guess}. A flipped copy shows why.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <div>
        <p>
          A field is shaped like a house: a rectangle 6 wide and 4 tall, with a triangle roof 6 wide and 3 tall on
          top. How many squares of land?
        </p>
        <div className="mt-3 rounded-lg bg-slate-950 p-3">
          <House />
        </div>
      </div>
    ),
    answer: 33,
    praise: 'Rectangle 6 × 4 = 24, roof half of 6 × 3 = 9. 24 + 9 = 33.',
    hint: v =>
      v === 42
        ? 'That counts the roof as a full 6 × 3 rectangle. The roof is a triangle: half of that.'
        : v === 24
          ? "That's just the rectangle. Don't forget the roof."
          : 'Split it into the rectangle and the roof. The roof is a triangle: half of a 6 × 3 rectangle.',
    solution: 'The rectangle is 4 rows of 6: 24. Two copies of the roof make a 6 × 3 field of 18, so the roof is 9. Total 24 + 9 = 33.',
  },
  keep: 'Cutting a field up and moving the pieces never changes its area. Two copies of a triangle make a slanted field, so a triangle is half of width × height.',
  symbols: <p>Area of a triangle = half of base × height. Forget it? Add a flipped copy.</p>,
  story: (
    <>
      <p>
        The Rhind papyrus, copied by the scribe Ahmes around 1550 BC from an older text, is a book of worked
        problems for scribes. It is now in the British Museum. Problem 51 asks for the area of a triangle of land 10
        khet tall with a base of 4 khet.
      </p>
      <p className="mt-2">
        Ahmes takes half of 4 to make a rectangle, and multiplies by 10: 20 setat. Half
        the base times the height is the same as half of base × height, and his words show he was thinking of a
        rectangle too.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        A field has a top side 5 squares long and a bottom side 9 squares long, 4 squares apart. Its two ends
        slant. How many squares of land?
      </p>
    ),
    answer: 28,
    praise: 'Two copies make a slanted field 14 wide and 4 tall: 56. Half is 28.',
    hint: () => 'Add a flipped copy, upside down, beside it. How wide is the slanted field the two copies make?',
    solution:
      'Turn a copy upside down and put it beside the field: the 5 side lines up with the 9 side, so the two together make a slanted field 5 + 9 = 14 wide and 4 tall. Cut and move: 14 × 4 = 56. The field is half: 28.',
  },
}
