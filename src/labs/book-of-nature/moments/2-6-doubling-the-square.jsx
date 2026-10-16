import React, { useState } from 'react'
import { Field, Label, Shape } from '../field'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'

const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]
const TARGET = 32

function Play({ state, setState }) {
  const { side, tried } = state
  const area = side * side
  const set = s => setState({ side: s, tried: tried.includes(s) ? tried : [...tried, s] })
  const note =
    area === 16
      ? 'This is the old field: 16 squares.'
      : area < TARGET
        ? `${area} squares: too small.`
        : area === 64
          ? '64 squares. Twice the side makes four times the land, not twice.'
          : `${area} squares: too big.`
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The old field is a square 4 on each side: 16 squares of land. The owner wants a square field of exactly{' '}
        {TARGET}. Change the side of the new square and look for it.
      </p>
      <Stepper label="side" value={side} min={1} max={8} onChange={set} />
      <div className="mt-3 rounded-lg bg-slate-950 p-3">
        <Field w={8} h={8} unit={30} label={`A square field with side ${side}`}>
          <Shape points={square(0, 0, side)} fill={GREEN} />
          <Shape points={square(0, 0, 4)} fill="none" stroke={AMBER} dash="0.2 0.15" />
        </Field>
      </div>
      <p className="mt-2 text-lg" data-testid="square-note">
        {note}
      </p>
    </div>
  )
}

// Plato's picture: four 4 × 4 squares, and the tilted square across their diagonals.
const TILTED = [[4, 0], [8, 4], [4, 8], [0, 4]]
const HALVES = [
  [[0, 0], [4, 0], [0, 4]],
  [[4, 0], [4, 4], [0, 4]],
]
const INNER = [
  [[4, 0], [4, 4], [0, 4]],
  [[4, 0], [8, 4], [4, 4]],
  [[8, 4], [4, 8], [4, 4]],
  [[4, 8], [0, 4], [4, 4]],
]

function Reveal() {
  const [step, setStep] = useState(0)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here is the old field, top left, with three copies of it. Now draw a line from corner to corner across the
        old field: its <strong>diagonal</strong>.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Field w={8} h={8} unit={36} label="Four squares and a tilted square">
          {[0, 4].map(x => [0, 4].map(y => <Shape key={`${x}${y}`} points={square(x, y, 4)} fill="none" stroke="#475569" />))}
          {step === 0 && <Shape points={square(0, 0, 4)} fill={AMBER} />}
          {step >= 1 && HALVES.map((t, k) => <Shape key={k} points={t} fill={AMBER} opacity={k === 0 ? 0.25 : 0.55} />)}
          {step >= 2 && INNER.map((t, k) => <Shape key={`i${k}`} points={t} fill={SKY} opacity={0.35} />)}
          {step >= 2 && <Shape points={TILTED} fill="none" stroke={SKY} />}
          {step >= 1 && <line x1="0" y1="4" x2="4" y2="0" stroke={AMBER} strokeWidth="3" vectorEffect="non-scaling-stroke" />}
          {step >= 2 && <Label x={4} y={4.6}>32</Label>}
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {step === 0 && (
          <button type="button" onClick={() => setStep(1)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
            Draw the diagonal
          </button>
        )}
        {step === 1 && (
          <button type="button" onClick={() => setStep(2)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
            Build a square on the diagonal
          </button>
        )}
      </div>
      {step >= 1 && (
        <p className="mt-4 text-lg leading-relaxed" data-testid="diagonal-step">
          {step === 1
            ? 'The diagonal cuts the old field into two equal triangles, half a field each.'
            : 'The square on the diagonal is made of 4 of those triangles. The old field is made of 2. So the tilted square holds exactly twice as much land: 32 squares.'}
        </p>
      )}
      {step >= 2 && (
        <p className="mt-3 text-lg leading-relaxed text-slate-300">
          No upright square on the grid has 32 squares, because no whole number times itself makes 32. But the
          square built on the diagonal does it exactly, for a square field of any size.
        </p>
      )}
    </div>
  )
}

export default {
  id: 'bon-doubling-the-square',
  order: '2.6',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'Doubling the square',
  threads: ['Shape', 'Number'],
  rigor: 2,
  move: 'draw-picture',
  hook: (
    <p>
      A farmer has a square field and wants a new square field exactly twice as big. Double the side? Try it and
      see.
    </p>
  ),
  initialState: { side: 4, tried: [] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try at least three sides',
  predict: {
    question: <p>Is there any square on this grid with exactly 32 squares of land?</p>,
    choices: ['No: no upright side works', 'Yes, a tilted square', 'Only with a side between 5 and 6'],
    response: guess => {
      if (guess === 'Yes, a tilted square') return 'Yes. Tilt it, and its corners can still sit on the grid.'
      if (guess === 'No: no upright side works')
        return 'No upright square works, true. But squares don’t have to sit upright, and a tilted one does it exactly.'
      return 'The side is between 5 and 6, that much is true. But you can draw that square exactly on the grid, tilted.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A square courtyard has a path from one corner to the opposite corner. A square built on that path holds 72
        squares of land. How long is each side of the courtyard?
      </p>
    ),
    answer: 6,
    praise: 'The square on the diagonal is twice the courtyard, so the courtyard is 36 squares: 6 by 6.',
    hint: v =>
      v === 36
        ? "36 is the courtyard's area. The question asks for the length of its side."
        : 'The square on the diagonal is twice the courtyard. How big is the courtyard, and what side gives a square that size?',
    solution: 'The square on the diagonal holds twice the land of the courtyard, so the courtyard holds 72 ÷ 2 = 36 squares. A square of 36 is 6 by 6, so each side is 6.',
  },
  keep: 'The square on a square’s diagonal is exactly twice the square: the diagonal cuts the square into 2 triangles, and the square on it is made of 4.',
  symbols: <p>Doubling the side makes 4 times the area. Doubling the area takes the diagonal.</p>,
  story: (
    <>
      <p>
        In Plato&apos;s dialogue <em>Meno</em>, written around 380 BC, Socrates draws this very picture in the sand
        for a boy who has never studied geometry. The boy first says to double the side, sees it gives four times
        the area, and is led, step by step, to the square on the diagonal.
      </p>
      <p className="mt-2">
        Over a thousand years earlier, a Babylonian student pressed a small round clay tablet, now called YBC 7289
        and kept at Yale. It shows a square with its diagonals, and numbers in base 60 giving the length of the
        diagonal of a square with side 30. The value is wrong by less than one part in a million. How long is the
        diagonal exactly? That question turns into a crisis, and it is waiting in Episode 4.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        A square field has sides of 10. Build a square on its diagonal. Then build another square on the diagonal of
        that one. How long is the side of the last square?
      </p>
    ),
    answer: 20,
    praise: 'Each step doubles the land: 100, 200, 400. A square of 400 has side 20.',
    hint: () => 'Each square on a diagonal holds twice the land. Follow the land, not the sides: 100, then …',
    solution: 'The first field holds 100. The square on its diagonal holds 200, and the square on that one’s diagonal holds 400. A square of 400 is 20 by 20, so the side is 20: twice the original side, as you found in the play.',
  },
}
