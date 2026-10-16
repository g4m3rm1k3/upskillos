import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const TARGET = 48

function Play({ state, setState }) {
  const { guess, tried } = state
  const add = () => !tried.includes(guess) && setState({ ...state, tried: [...tried, guess].sort((a, b) => a - b) })
  const found = tried.some(g => g + g / 7 === TARGET)
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Ahmes&apos;s puzzle: &quot;A quantity and its seventh, added together, make {TARGET}. What is the
        quantity?&quot; Don&apos;t solve it. Guess, and see what your guess makes. Guesses that 7 goes into exactly
        keep the seventh whole.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Stepper label="guess" value={guess} min={7} max={70} step={7} onChange={g => setState({ ...state, guess: g })} />
        <button type="button" onClick={add} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Try this guess
        </button>
      </div>
      {tried.length > 0 && (
        <table className="mt-4 font-mono text-lg">
          <tbody>
            {tried.map(g => (
              <tr key={g} data-testid="guess-row">
                <td className="pr-2 text-right">{g}</td>
                <td className="px-2 text-slate-500">+ its seventh</td>
                <td className="pr-2">{g / 7}</td>
                <td className="px-2 text-slate-500">=</td>
                <td className={`font-bold ${g + g / 7 === TARGET ? 'text-emerald-400' : 'text-amber-300'}`}>{g + g / 7}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {found && <p className="mt-2 font-semibold text-emerald-400">That&apos;s the one: the quantity is 42.</p>}
    </div>
  )
}

// k copies of the guess 7, each with its seventh: k blocks of 7 make k blocks of 8.
function Blocks({ k }) {
  const U = 9
  return (
    <svg viewBox={`0 0 ${8 * U + 4} ${k * (U + 3)}`} style={{ width: 8 * U * 2.4, maxWidth: '100%' }} role="img" aria-label={`${k} blocks of 7 and their sevenths`}>
      {Array.from({ length: k }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => (
          <rect key={`${r}-${c}`} x={c * U + (c === 7 ? 4 : 0)} y={r * (U + 3)} width={U - 1.5} height={U - 1.5} rx="2" fill={c === 7 ? SKY : AMBER} />
        )),
      )}
    </svg>
  )
}

function Reveal() {
  const [k, setK] = useState(1)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        A guess of 7 is the easy one: 7 and its seventh, 1, make 8. Stack up more copies of that guess.
      </p>
      <Stepper label="copies of 7" value={k} min={1} max={10} onChange={setK} />
      <div className="mt-3 rounded-lg bg-slate-950 p-4">
        <Blocks k={k} />
        <p className="mt-2 text-lg" data-testid="blocks-readout">
          {k} × 7 = {7 * k}, and with its seventh it makes {k} × 8 = {8 * k}.
        </p>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every 7 in the quantity brings one more with it, so every 7 becomes an 8. The answer grows in step with
          the guess: twice the guess makes twice the total, ten times the guess makes ten times the total.
        </p>
        <p className="text-slate-300">
          So start from where you want to end up. 400 is 50 eights, so the quantity must be 50 sevens: 350. That is
          false position: make an easy guess, see what it gives, and scale it to what you wanted.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-the-false-guess',
  order: '2.4',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'The false guess',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'work-backwards',
  hook: (
    <p>
      Problem 24 of the Rhind papyrus: &quot;A quantity and its seventh, added together, make 19. What is the
      quantity?&quot; There is no algebra yet, no <em>x</em>, no equations. How would a scribe 3,500 years ago
      find it?
    </p>
  ),
  initialState: { guess: 7, tried: [] },
  Play,
  playReady: state => state.tried.length >= 3 && state.tried.some(g => g + g / 7 === TARGET),
  playNotReady: `Try three guesses, and find the one that makes ${TARGET}`,
  predict: {
    question: <p>A quantity and its seventh make 400. What is the quantity?</p>,
    response: guess => {
      if (guess === 350) return 'Yes, 350. Here is why the guesses behave so neatly.'
      if (guess === 393) return '393 takes 7 off the total, but the seventh of the quantity isn’t 7 here. The answer is 350.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>A quantity and its quarter, added together, make 15. What is the quantity?</p>,
    answer: 12,
    praise: 'Guess 4: 4 and its quarter make 5. 15 is three 5s, so the quantity is three 4s: 12.',
    hint: v =>
      v === 11
        ? 'Taking 4 off 15 assumes the quarter is 4. Try the easy guess instead: what do 4 and its quarter make?'
        : v === 60
          ? "That's 15 × 4. Check it: 60 and its quarter make 75. Start with an easy guess, like 4."
          : 'Guess 4, which has an easy quarter. What does 4 and its quarter make? How many of those make 15?',
    solution: 'Guess 4. Its quarter is 1, and 4 + 1 = 5. But we want 15, which is 3 times as much, so the quantity is 3 times the guess: 12. Check: 12 and its quarter, 3, make 15.',
  },
  keep: 'When the total grows in step with the guess, a wrong guess is still useful: see what an easy guess makes, then scale it to the total you want.',
  symbols: (
    <p>
      In later notation: <em>x</em> + <em>x</em>/7 = 19. You don&apos;t need it here. Guess 7, get 8, and scale
      by however many 8s make 19.
    </p>
  ),
  story: (
    <>
      <p>
        Ahmes did exactly this for problem 24. He guessed 7, found that 7 and its seventh make 8, and then worked
        out how many times 8 goes into 19. His answer, in Egyptian fractions, is 16 + 1/2 + 1/8. He checks it by
        adding a seventh, the way you checked yours.
      </p>
      <p className="mt-2">
        The method lasted for thousands of years. Leonardo of Pisa, known as Fibonacci, taught it to European
        merchants in his <em>Liber Abaci</em> of 1202, and arithmetic books still used it in the 1600s, long after
        algebra had arrived.
      </p>
    </>
  ),
  deeper: {
    question: <p>A quantity, its half and its third, added together, make 33. What is the quantity?</p>,
    answer: 18,
    praise: 'Guess 6: 6 + 3 + 2 = 11. 33 is three 11s, so the quantity is three 6s: 18.',
    hint: () => 'Pick a guess with an easy half and an easy third. 6 works. What does it make?',
    solution: 'Guess 6: its half is 3 and its third is 2, so 6 + 3 + 2 = 11. 33 is 3 times 11, so the quantity is 3 times 6: 18. Check: 18 + 9 + 6 = 33.',
  },
}
