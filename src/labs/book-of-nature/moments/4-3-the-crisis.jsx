import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'

const PAIRS = [
  [3, 2],
  [7, 5],
  [17, 12],
  [41, 29],
]

// A big square of side d with two squares of side s in opposite corners.
function Corners({ d, s, size = 220, label }) {
  const o = d - s
  return (
    <svg viewBox={`-0.5 -0.5 ${d + 1} ${d + 1}`} style={{ width: size, maxWidth: '100%' }} role="img" aria-label={label}>
      <rect x="0" y="0" width={d} height={d} fill="#0f172a" stroke="#94a3b8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x="0" y="0" width={s} height={s} fill={SKY} fillOpacity="0.45" stroke={SKY} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x={o} y={o} width={s} height={s} fill={AMBER} fillOpacity="0.45" stroke={AMBER} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x={s} y="0" width={o} height={o} fill={ROSE} fillOpacity="0.55" stroke={ROSE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x="0" y={s} width={o} height={o} fill={ROSE} fillOpacity="0.55" stroke={ROSE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Play({ state, setState }) {
  const { k, seen } = state
  const [d, s] = PAIRS[k]
  const over = 2 * s - d
  const gap = d - s
  const pick = i => setState({ k: i, seen: seen.includes(i) ? seen : [...seen, i] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Take a near miss: a big square of side {d} (the diagonal) and two squares of side {s} (the side). Put the two
        small squares in opposite corners of the big one. They overlap in the middle (counted twice) and leave
        two corners uncovered (red).
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Near miss">
        {PAIRS.map(([x, y], i) => (
          <button
            key={x}
            type="button"
            onClick={() => pick(i)}
            className={`rounded-lg border px-3 py-1 font-semibold ${i === k ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {x} and {y}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Corners d={d} s={s} label={`A square of ${d} with two squares of ${s} in its corners`} />
        </div>
        <div className="space-y-1 font-mono text-lg">
          <p>
            big square: {d} × {d} = {d * d}
          </p>
          <p>
            two small: 2 × {s} × {s} = {2 * s * s}
          </p>
          <p className="text-emerald-400">
            overlap: {over} × {over} = {over * over}
          </p>
          <p className="text-rose-300">
            corners: 2 × {gap} × {gap} = {2 * gap * gap}
          </p>
          <p className="pt-2 font-sans text-slate-300" data-testid="corner-pair">
            Overlap side {over}, corner side {gap}: another near miss, smaller.
          </p>
        </div>
      </div>
    </div>
  )
}

function Reveal() {
  const [depth, setDepth] = useState(1)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Now suppose someone found a perfect pair: a whole-number diagonal whose big square is <em>exactly</em> two
        small squares. Lay it out the same way. The two small squares cover the big one exactly once over, except
        that the middle is covered twice and the corners not at all. So the overlap must exactly equal the two
        corners together: a smaller perfect pair, also whole numbers.
      </p>
      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-slate-950 p-3">
        {Array.from({ length: depth }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Corners d={17} s={12} size={200 * 0.62 ** i} label={`Perfect pair, step ${i + 1}`} />
            <span className="text-sm text-slate-400">{i === 0 ? 'a perfect pair' : 'a smaller one'}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-slate-400">A sketch: no perfect pair can really be drawn, but one would look almost exactly like this.</p>
      {depth < 4 ? (
        <button type="button" onClick={() => setDepth(depth + 1)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Do it again
        </button>
      ) : (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="crisis-result">
            Each perfect pair makes a smaller perfect pair, and that one a smaller one, forever. But whole numbers
            can&apos;t get smaller forever: count down and you hit 1. So the first perfect pair can&apos;t exist.
            No square has a whole-number side and diagonal, whatever unit you choose.
          </p>
          <p>
            So the side and diagonal of a square have <strong>no common measure</strong>: no unit, however small,
            fits a whole number of times into both. Their comparison is not a ratio of whole numbers. The belief that
            everything is number was false, and the near misses could never have shown it. Only the argument could.
          </p>
          <p className="text-slate-300">
            An argument like this, which settles every case at once, even the ones nobody can try, is called a{' '}
            <strong>proof</strong>. After this, Greek mathematicians stopped trusting what looked obvious and began
            proving things.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-crisis',
  order: '4.3',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'The crisis',
  threads: ['Number', 'Structure'],
  rigor: 3,
  move: 'draw-picture',
  hook: (
    <p>
      The side and diagonal numbers always miss by 1. Maybe a perfect pair is out there among numbers too big to
      try. Searching will never settle it: there are always bigger numbers. Is there any way to know for certain?
    </p>
  ),
  initialState: { k: 2, seen: [2] },
  Play,
  playReady: state => state.seen.length >= 3,
  playNotReady: 'Look at three near misses',
  predict: {
    question: <p>Suppose a perfect pair existed: a big square exactly equal to two small squares. What would the overlap and the uncovered corners have to do?</p>,
    choices: ['The overlap would exactly equal the two corners', 'The picture would stop working', 'Nothing special would happen'],
    response: guess => {
      if (guess === 'The overlap would exactly equal the two corners')
        return 'Yes. And that makes a smaller perfect pair. See where that leads.'
      if (guess === 'The picture would stop working')
        return 'The picture works for any two whole numbers. With a perfect pair, the overlap would exactly equal the corners, and that is a smaller perfect pair.'
      return 'Something very special happens: the overlap would exactly equal the two corners, which is a smaller perfect pair.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Run the picture on the near miss 99 (diagonal) and 70 (side). What is the side of each uncovered corner square?</p>,
    answer: 29,
    praise: '99 − 70 = 29. The overlap has side 2 × 70 − 99 = 41, and 41 and 29 is the near miss before.',
    hint: v =>
      v === 41
        ? '41 is the overlap in the middle. The corners are what the small square leaves of the big one’s side.'
        : 'Each corner square fills the part of the big square’s side that one small square doesn’t reach.',
    solution: 'The small squares have side 70 in a big square of side 99. Each leaves 99 − 70 = 29 uncovered along a side, so the corner squares have side 29. (The overlap is 70 + 70 − 99 = 41.)',
  },
  keep: 'If a square’s side and diagonal were whole numbers, the corner picture would make smaller and smaller whole numbers forever, which is impossible. So no common measure exists, and an argument, not a search, is what showed it.',
  symbols: (
    <p>
      Another proof uses odd and even. Take the smallest pair with d × d = 2 × s × s. Then d × d is even, so d is
      even (odd × odd is odd). Then s × s is even too, so s is even. Halve both, and you have a smaller pair, which
      can&apos;t be.
    </p>
  ),
  story: (
    <>
      <p>
        Who first proved it is unknown. A later story says a Pythagorean named Hippasus revealed the secret and was
        drowned at sea for it. That is a legend, told centuries afterwards. Plato, around 370 BC, writes that
        Theodorus proved the same for the sides of squares of area 3, 5 and so on up to 17, case by case.
      </p>
      <p className="mt-2">
        The corner picture you used is modern: it was found by the American mathematician Stanley Tennenbaum in the
        1950s. The odd-and-even argument goes back to the Greeks.
      </p>
    </>
  ),
  deeper: {
    question: <p>For the near miss 99 and 70, what is the side of the overlap square in the middle?</p>,
    answer: 41,
    praise: '70 + 70 − 99 = 41. So 99 and 70 shrink to 41 and 29, then 17 and 12, then 7 and 5.',
    hint: () => 'The two small squares, side 70 each, laid along a side of 99: how much do they overlap?',
    solution: 'Along one side of the big square, the two small squares cover 70 + 70 = 140, but the side is only 99. They overlap by 140 − 99 = 41, so the middle square has side 41.',
  },
}
