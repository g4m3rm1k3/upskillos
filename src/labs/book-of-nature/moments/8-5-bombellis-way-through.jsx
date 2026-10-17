import React, { useState } from 'react'
import { Stepper } from '../parts'

const SKY = '#38bdf8'

function Play({ state, setState }) {
  const { n, tried } = state
  const set = v => setState({ n: v, tried: tried.includes(v) ? tried : [...tried, v] })
  const cube = n * n * n
  const other = 15 * n + 4
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The <em>cube</em> of a number is three copies of it multiplied together: the cube of 2 is 2 × 2 × 2 = 8, the
        number of small blocks in a 2 × 2 × 2 cube. Bombelli&apos;s problem: a cube equals fifteen of its sides and
        four. Search for the side.
      </p>
      <Stepper label="side" value={n} min={1} max={6} onChange={set} />
      <p className="mt-3 rounded-lg bg-slate-950 p-3 text-lg" data-testid="cubic-search">
        Cube: {n} × {n} × {n} = <strong className="text-amber-300">{cube}</strong>. Fifteen sides and four: 15 × {n} + 4 ={' '}
        <strong style={{ color: SKY }}>{other}</strong>. {cube === other ? 'They match!' : cube < other ? 'The cube is smaller.' : 'The cube is bigger.'}
      </p>
    </div>
  )
}

const STEPS = [
  {
    button: 'Multiply it by itself',
    lines: ['Bombelli guessed that the cube root of 2 + √−121 might be 2 + √−1. To check, cube it by parts, with one rule: √−1 × √−1 = −1.'],
  },
  {
    button: 'Multiply by it again',
    lines: ['(2 + √−1) × (2 + √−1) = 4 + 2√−1 + 2√−1 + (−1) = 3 + 4√−1'],
  },
  {
    button: 'Add the two cube roots',
    lines: [
      '(3 + 4√−1) × (2 + √−1) = 6 + 3√−1 + 8√−1 + 4 × (−1) = 2 + 11√−1',
      'And 11√−1 is √−121, because 11√−1 × 11√−1 = 121 × (−1) = −121. So the cube of 2 + √−1 is 2 + √−121, as he guessed. In the same way, the cube of 2 − √−1 is 2 − √−121.',
    ],
  },
  {
    lines: ['The answer is (2 + √−1) + (2 − √−1) = 4. The impossible parts cancel, and the 4 you found is left.'],
  },
]

function Reveal() {
  const [step, setStep] = useState(0)
  return (
    <div>
      <div className="space-y-2 rounded-lg bg-slate-950 p-4 text-lg" data-testid="bombelli-steps">
        {STEPS.slice(0, step + 1).flatMap(s => s.lines).map(line => (
          <p key={line} className={/^[(]/.test(line) ? 'font-mono text-amber-300' : ''}>
            {line}
          </p>
        ))}
      </div>
      {STEPS[step].button && (
        <button type="button" onClick={() => setStep(step + 1)} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          {STEPS[step].button}
        </button>
      )}
      {step === STEPS.length - 1 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            The rule&apos;s answer was 4 all along, in disguise. To see it, Bombelli had to treat √−1 as a number,
            add and multiply it by the usual rules, and let the impossible parts cancel at the end.
          </p>
          <p className="text-slate-300">
            Cardano had set √−15 aside as useless. Here there was no way round: a plain answer, 4, could only be
            reached by going through the impossible numbers.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-bombellis-way-through',
  order: '8.5',
  episodeNumber: 8,
  episode: 'Duels over the cubic',
  title: "Bombelli's way through",
  threads: ['Number'],
  rigor: 2,
  move: 'pair-off',
  hook: (
    <p>
      Cardano&apos;s book also printed the secret rule for cubics, problems with three copies of an unknown
      multiplied together. Rafael Bombelli, an engineer from Bologna, tried it on a problem whose answer he already knew,
      and the rule gave nonsense. Or did it?
    </p>
  ),
  initialState: { n: 1, tried: [1] },
  Play,
  playReady: state => state.n === 4 && state.tried.length >= 3,
  playNotReady: 'Find the side that matches',
  predict: {
    question: (
      <p>
        For this problem the rule&apos;s answer is: the cube root of 2 + √−121, plus the cube root of 2 − √−121. (A{' '}
        <em>cube root</em> undoes a cube: the cube root of 64 is 4.) Is that a real answer?
      </p>
    ),
    choices: ['No, it is impossible', 'Yes, it is 4', 'It is some other answer'],
    response: guess => {
      if (guess === 'Yes, it is 4') return 'Yes, it is 4 in disguise. Here is how Bombelli unmasked it.'
      if (guess === 'No, it is impossible') return 'It looks impossible: √−121 is the square root of a debt. But follow the rules through, and it turns out to be 4.'
      return 'It looks like something new, but the problem has only one side that works, and the rule is right: it is 4 in disguise.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Multiply by parts, using √−1 × √−1 = −1: what is (3 + √−1) × (3 − √−1)?</p>,
    answer: 10,
    praise: '9 − 3√−1 + 3√−1 − (√−1 × √−1) = 9 − (−1) = 10. The impossible parts cancel again.',
    hint: v =>
      v === 8
        ? 'The last piece is √−1 × (−√−1) = −(−1), which is +1. Taking away a debt adds.'
        : v === 9
          ? 'The middle pieces cancel, but there is a fourth piece: √−1 × (−√−1).'
          : 'Four pieces: 3 × 3, 3 × (−√−1), √−1 × 3 and √−1 × (−√−1). Two of them cancel.',
    solution: 'The four pieces are 3 × 3 = 9, 3 × (−√−1) = −3√−1, √−1 × 3 = +3√−1, and √−1 × (−√−1) = −(−1) = +1. The middle two cancel, leaving 9 + 1 = 10.',
  },
  keep: 'An impossible number like √−1 can be used like any other, with √−1 × √−1 = −1. On the way to a real answer the impossible parts can cancel and leave it.',
  symbols: <p>(2 + √−1) × (2 + √−1) × (2 + √−1) = 2 + √−121</p>,
  story: (
    <>
      <p>
        Bombelli explained his rules for these numbers in his <em>L&apos;Algebra</em> (1572). He called √−1{' '}
        <em>più di meno</em>, &quot;plus of minus&quot;. At first, he wrote, the idea seemed to him more a trick than the
        truth.
      </p>
      <p className="mt-2">
        In 1637 Descartes called such numbers <em>imaginary</em>, and the name stuck. They turned out to be
        anything but useless: engineers now use them every day for electric currents and waves. They come back later in
        this series.
      </p>
    </>
  ),
}
