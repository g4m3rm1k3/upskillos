import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'

const PAIRS = [
  [12, 8],
  [21, 15],
  [10, 4],
]

// Take the shorter rod from the longer, as long as they differ.
const step = ([a, b]) => (a > b ? [a - b, b] : [a, b - a])

function Rods({ a, b, unit, scale }) {
  const W = Math.max(a, b) * scale
  return (
    <svg viewBox={`0 0 ${W + 10} 64`} className="w-full" style={{ maxWidth: W + 10 }} role="img" aria-label={`Rods of ${a} and ${b}`}>
      <rect x="2" y="6" width={a * scale} height="18" rx="4" fill={AMBER} fillOpacity="0.8" />
      <rect x="2" y="38" width={b * scale} height="18" rx="4" fill={SKY} fillOpacity="0.8" />
      {unit &&
        [a, b].map((len, row) =>
          Array.from({ length: len / unit + 1 }, (_, i) => (
            <line key={`${row}-${i}`} x1={2 + i * unit * scale} y1={row ? 34 : 2} x2={2 + i * unit * scale} y2={row ? 60 : 28} stroke={GREEN} strokeWidth="2" />
          )),
        )}
    </svg>
  )
}

function Play({ state, setState }) {
  const { pair, rods, done, history } = state
  const [a, b] = rods
  const finished = a === b
  const cut = () => {
    const next = step(rods)
    const end = next[0] === next[1]
    setState({ ...state, rods: next, history: [...history, next], done: end && !done.includes(pair) ? [...done, pair] : done })
  }
  const pick = k => setState({ ...state, pair: k, rods: PAIRS[k], history: [PAIRS[k]] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Two rods. Is there a small unit length that fits a whole number of times into both? Here is an old way to
        find the biggest one: lay the shorter rod along the longer one and cut that much off. Repeat until the two
        rods are equal.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Rods">
        {PAIRS.map(([x, y], k) => (
          <button
            key={k}
            type="button"
            onClick={() => pick(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === pair ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {x} and {y}
            {done.includes(k) ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Rods a={a} b={b} scale={14} unit={finished ? a : null} />
      </div>
      <button type="button" onClick={cut} disabled={finished} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600 disabled:opacity-40">
        Cut the shorter from the longer
      </button>
      <p className="mt-2 font-mono text-lg" data-testid="cut-history">
        {history.map(([x, y]) => `${x} and ${y}`).join(' → ')}
      </p>
      {finished && (
        <p className="mt-1 text-lg text-emerald-400" data-testid="measure">
          Both rods are {a}: a unit of {a} fits {PAIRS[pair][0] / a} times into {PAIRS[pair][0]} and {PAIRS[pair][1] / a} times into{' '}
          {PAIRS[pair][1]}.
        </p>
      )}
    </div>
  )
}

const BIG = [91, 35]

function Reveal() {
  const [rods, setRods] = useState(BIG)
  const [a, b] = rods
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here are 91 and 35, marked in units of 7. Keep cutting and watch the marks.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Rods a={a} b={b} scale={4.4} unit={7} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRods(step(rods))} disabled={a === b} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40">
          Cut the shorter from the longer
        </button>
        <span className="font-mono text-lg" data-testid="big-rods">
          {a} and {b}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every cut takes off a whole number of 7s, so what is left is still a whole number of 7s. A unit that
          measures both rods always measures what is left after a cut. Cutting never changes which units fit both.
          So when the rods end up equal, that length is the biggest unit that fits both of the starting rods.
        </p>
        <p className="text-slate-300">
          91 is 13 sevens and 35 is 5 sevens, so 91 and 35 compare as 13 to 5. A comparison of two whole numbers
          like this is called a <strong>ratio</strong>, written 13 : 5.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-a-common-measure',
  order: '4.1',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'A common measure',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      The followers of Pythagoras, around 500 BC, believed that everything is number. Any two lengths, they
      thought, could be measured by some small unit that fits a whole number of times into each. Is that true? And
      how would you find such a unit?
    </p>
  ),
  initialState: { pair: 0, rods: PAIRS[0], done: [], history: [PAIRS[0]] },
  Play,
  playReady: state => state.done.length >= 2,
  playNotReady: 'Cut two pairs of rods down to equal',
  predict: {
    question: <p>Rods of 91 and 35. What is the biggest unit that fits a whole number of times into both?</p>,
    response: guess => {
      if (guess === 7) return 'Yes, 7. And here is why the cutting always finds it.'
      if (guess === 5) return '5 fits into 35, but not into 91. The cutting finds 7.'
      if (guess === 1) return '1 fits both, but it isn’t the biggest. The cutting finds 7.'
      return `It's 7: 91 is 13 sevens and 35 is 5 sevens.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>What is the biggest unit that fits a whole number of times into both 48 and 18?</p>,
    answer: 6,
    praise: '48 and 18 → 30 and 18 → 12 and 18 → 12 and 6 → 6 and 6. 48 is 8 sixes and 18 is 3 sixes.',
    hint: v =>
      v === 3 || v === 2
        ? `${v} fits both, but a bigger unit does too. Keep cutting until the rods are equal.`
        : 'Cut the shorter from the longer: 48 and 18 becomes 30 and 18. Keep going until they are equal.',
    solution: '48 and 18 → 30 and 18 → 12 and 18 → 12 and 6 → 6 and 6. The rods end at 6, so 6 is the biggest unit that fits both: 48 is 8 sixes, 18 is 3 sixes.',
  },
  keep: 'Cut the shorter length from the longer again and again. A unit that fits both always fits what is left, so the rods end at the biggest unit that fits both.',
  symbols: <p>48 : 18 = 8 : 3, because 6 fits 8 times into 48 and 3 times into 18.</p>,
  story: (
    <>
      <p>
        This is Euclid&apos;s algorithm, from Book VII of his <em>Elements</em>, around 300 BC. Euclid wrote it
        for numbers, cutting the smaller from the larger &quot;continually&quot;. It is one of the oldest step-by-step
        methods still in use: computers use it today, for example in the arithmetic behind internet security.
      </p>
      <p className="mt-2">
        The word <em>algorithm</em> comes much later, from the name of a ninth-century mathematician you will meet
        in another episode.
      </p>
    </>
  ),
  deeper: {
    question: <p>What is the biggest unit that fits a whole number of times into both 1,001 and 143?</p>,
    answer: 143,
    praise: '143 fits into 1,001 exactly 7 times, so the cutting ends at 143 itself.',
    hint: () => 'Start cutting 143 from 1,001 and count how many cuts until the rods are equal.',
    solution: '1,001 − 143 = 858, then 715, 572, 429, 286, 143. Now both rods are 143, so 143 fits both: 7 times into 1,001 and once into 143.',
  },
}
