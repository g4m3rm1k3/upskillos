import React from 'react'

const U = 28 // spacing between pebble centres
const COLORS = ['#fbbf24', '#38bdf8'] // layers alternate amber / sky

// Where pebble j of layer k (the k-th odd number, 2k+1 pebbles) sits.
// Rows: layer k is row k. Square: layer k is an L wrapping the k-by-k square,
// k+1 pebbles down column k and k along row k.
function spot(k, j, layout) {
  if (layout === 'rows') return [j, k]
  return j <= k ? [k, j] : [j - k - 1, k]
}

function Pebbles({ n, layout, cols }) {
  const pebbles = []
  for (let k = 0; k < n; k++) {
    for (let j = 0; j <= 2 * k; j++) {
      const [x, y] = spot(k, j, layout)
      pebbles.push(
        <circle
          key={`${k}-${j}`}
          r={U * 0.4}
          fill={COLORS[k % 2]}
          style={{
            transform: `translate(${x * U + U / 2}px, ${y * U + U / 2}px)`,
            transition: 'transform 700ms ease-in-out',
          }}
        />,
      )
    }
  }
  return (
    <svg
      viewBox={`0 0 ${cols * U} ${n * U}`}
      className="w-full"
      style={{ maxHeight: 320 }}
      role="img"
      aria-label={`${n * n} pebbles in ${layout === 'rows' ? 'rows' : 'a square'}`}
    >
      {pebbles}
    </svg>
  )
}

const odds = n => Array.from({ length: n }, (_, k) => 2 * k + 1)

function Stepper({ n, max, onChange, addLabel }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={n >= max}
        onClick={() => onChange(n + 1)}
        className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600 disabled:opacity-40"
      >
        {addLabel(n)}
      </button>
      <button
        type="button"
        disabled={n <= 1}
        onClick={() => onChange(n - 1)}
        className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800 disabled:opacity-40"
      >
        Take one away
      </button>
    </div>
  )
}

const PLAY_MAX = 6

function Play({ state, setState }) {
  const { n } = state
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Each row is the next odd number of pebbles. Add rows and watch the running total.
      </p>
      <Pebbles n={n} layout="rows" cols={2 * PLAY_MAX - 1} />
      <Stepper
        n={n}
        max={PLAY_MAX}
        onChange={v => setState({ ...state, n: v })}
        addLabel={k => `Add the next odd number (${2 * k + 1})`}
      />
      <table className="mt-4 font-mono text-lg">
        <tbody>
          {odds(n).map((_, i) => (
            <tr key={i}>
              <td className="pr-3 text-right text-slate-400">{odds(i + 1).join(' + ')}</td>
              <td className="px-2 text-slate-500">=</td>
              <td className="font-bold text-amber-300" data-testid="total">{(i + 1) * (i + 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Reveal({ state, setState }) {
  const { n, layout } = state
  const square = layout === 'square'
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Here are the same pebbles. Don't add any or take any away. Just move them.
      </p>
      <Pebbles n={n} layout={layout} cols={2 * n - 1} />
      <button
        type="button"
        onClick={() => setState({ ...state, layout: square ? 'rows' : 'square' })}
        className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
      >
        {square ? 'Back to rows' : 'Rearrange the pebbles'}
      </button>
      {square && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Each odd number bends into an <strong className="text-amber-300">L</strong> that wraps around the square before it.
          </p>
          {n >= 2 && (
            <p className="text-slate-300">
              The last one, <strong>{2 * n - 1}</strong>, is {n - 1} along the bottom, {n - 1} down the side and 1 in
              the corner. That turns the {n - 1} × {n - 1} square into a {n} × {n} square.
            </p>
          )}
          <p className="text-slate-300">
            Every odd number is two equal legs plus a corner, so it always fits exactly. The pattern can never break,
            however far you go. Grow it and check:
          </p>
          <Stepper n={n} max={10} onChange={v => setState({ ...state, n: v })} addLabel={k => `Wrap on ${2 * k + 1}`} />
          <p className="font-mono text-amber-300">
            {odds(n).join(' + ')} = {n} × {n} = {n * n}
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-odd-squares',
  order: '1.3',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'Odd numbers make squares',
  threads: ['Number', 'Shape'],
  rigor: 2,
  move: 'draw-picture',
  hook: (
    <p>
      Add up the odd numbers, starting from 1. First just 1, then 1 + 3, then 1 + 3 + 5, and so on. Do the
      totals have anything in common? Let's build them out of pebbles and look.
    </p>
  ),
  initialState: { n: 1, layout: 'rows' },
  Play,
  playReady: state => state.n >= 4,
  playNotReady: 'Add a few more rows first',
  predict: {
    question: (
      <p>
        Now, without adding them up one by one: what do the first ten odd numbers make?
        <span className="mt-2 block font-mono text-amber-300">1 + 3 + 5 + 7 + 9 + 11 + 13 + 15 + 17 + 19 = ?</span>
      </p>
    ),
    response: guess => {
      if (guess === 100)
        return 'You predicted 100, and you were right. The totals 1, 4, 9, 16 are 1 × 1, 2 × 2, 3 × 3, 4 × 4. Spotting a pattern is the first step. The picture is the second: it shows the pattern must hold for every number, not just the ones you tried.'
      if (guess === 19)
        return '19 is the last number in the list, not the total. The total is 100: ten odd numbers build a 10 × 10 square.'
      return `The total is 100, not ${guess}. Look back at the totals: 1, 4, 9, 16 are 1 × 1, 2 × 2, 3 × 3, 4 × 4. Ten odd numbers build a 10 × 10 square.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        What is <span className="font-mono text-amber-300">1 + 3 + 5 + … + 99</span>? That's every odd number from 1
        up to 99.
      </p>
    ),
    answer: 2500,
    praise: 'There are 50 odd numbers from 1 to 99, so they build a 50 × 50 square: 2,500.',
    hint: v =>
      v === 9801
        ? "99 is the last odd number, but it isn't the side of the square. The side is how many odd numbers you add."
        : 'The side of the square is how many odd numbers you add. How many odd numbers are there from 1 to 99?',
    solution:
      'Half of the numbers from 1 to 100 are odd, so there are 50 odd numbers from 1 to 99. Fifty layers build a 50 × 50 square: 2,500 pebbles.',
  },
  keep: 'Add the odd numbers in order and you build squares. Each odd number is an L-shaped layer that wraps the square before it.',
  symbols: (
    <p>
      In symbols, which you just worked out for yourself: the first <em>n</em> odd numbers add up to{' '}
      <em>n</em> × <em>n</em>.
    </p>
  ),
  story: (
    <>
      <p>
        Greek mathematicians counted with pebbles and studied the shapes pebbles make: square numbers, triangular
        numbers, oblong numbers. The L-shaped piece you just used was called a <em>gnomon</em>, the same word as the
        upright stick of a sundial. Aristotle mentions the Pythagoreans placing gnomons around the one, exactly as you
        did here.
      </p>
      <p className="mt-2">
        Our word <em>calculate</em> comes from the Latin <em>calculus</em>: a small pebble.
      </p>
    </>
  ),
  deeper: {
    question: <p>Which odd number turns a 12 × 12 square into a 13 × 13 square?</p>,
    answer: 25,
    praise: '12 along the bottom, 12 down the side, 1 in the corner: 25.',
    hint: () => 'Picture the L: how many pebbles along the bottom, how many down the side, and the corner?',
    solution: '12 along the bottom, 12 down the side and 1 in the corner make 25. Check: 13 × 13 − 12 × 12 = 169 − 144 = 25.',
  },
}
