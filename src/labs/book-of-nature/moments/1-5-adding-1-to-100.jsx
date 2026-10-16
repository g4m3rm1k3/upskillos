import React, { useState } from 'react'

const TILES = 10
const PAIR_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#a78bfa']

function Play({ state, setState }) {
  const { pairs, picked } = state
  const pairOf = t => pairs.findIndex(p => p.includes(t))
  const allPaired = pairs.length === TILES / 2
  const sums = pairs.map(([a, b]) => a + b)
  const allSame = allPaired && sums.every(s => s === sums[0])

  const tap = t => {
    if (pairOf(t) !== -1) return
    if (picked === null) return setState({ ...state, picked: t })
    if (picked === t) return setState({ ...state, picked: null })
    setState({ pairs: [...pairs, [picked, t]], picked: null })
  }

  return (
    <div>
      <p className="mb-3 text-slate-300">
        Start smaller: 1 to 10. Tap two numbers to pair them up. Can you pair all ten so that every pair adds up to
        the same total?
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: TILES }, (_, i) => i + 1).map(t => {
          const p = pairOf(t)
          const color = p === -1 ? null : PAIR_COLORS[p]
          return (
            <button
              key={t}
              type="button"
              aria-label={`number ${t}`}
              onClick={() => tap(t)}
              className={`h-12 w-12 rounded-lg border-2 text-xl font-bold ${
                picked === t ? 'border-amber-400 bg-amber-500/30' : 'border-slate-700 hover:bg-slate-800'
              }`}
              style={color ? { borderColor: color, color } : undefined}
            >
              {t}
            </button>
          )
        })}
      </div>
      {pairs.length > 0 && (
        <ul className="mt-4 space-y-1 font-mono text-lg">
          {pairs.map(([a, b], i) => (
            <li key={`${a}-${b}`} style={{ color: PAIR_COLORS[i] }} data-testid="pair-sum">
              {a} + {b} = {a + b}
            </li>
          ))}
        </ul>
      )}
      {allPaired && !allSame && (
        <p className="mt-3 text-rose-300">All paired, but the totals aren't all the same. Try again.</p>
      )}
      {allSame && (
        <p className="mt-3 text-lg font-semibold text-emerald-400">
          Five pairs, each making {sums[0]}. So 1 + 2 + … + 10 = 5 × {sums[0]} = {5 * sums[0]}, with no long adding.
        </p>
      )}
      {pairs.length > 0 && (
        <button
          type="button"
          onClick={() => setState({ pairs: [], picked: null })}
          className="mt-3 rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800"
        >
          Unpair them all
        </button>
      )}
    </div>
  )
}

const U = 22

// A staircase of n columns (1, 2, …, n pebbles) in amber. With `doubled`, a flipped copy
// (n, n − 1, …, 1 pebbles) in sky slides down on top, filling an n by n + 1 rectangle.
function Staircase({ n, doubled }) {
  const pebbles = []
  for (let c = 0; c < n; c++) {
    const h = c + 1
    for (let r = 0; r < h; r++)
      pebbles.push({ key: `a-${c}-${r}`, x: c, y: n - r, fill: '#fbbf24', shown: true })
    for (let r = 0; r < n - c; r++)
      pebbles.push({ key: `b-${c}-${r}`, x: c, y: doubled ? r : r - n - 1, fill: '#38bdf8', shown: doubled })
  }
  return (
    <svg
      viewBox={`0 0 ${n * U} ${(n + 1) * U}`}
      className="w-full overflow-hidden"
      style={{ maxHeight: 320 }}
      role="img"
      aria-label={doubled ? `a ${n} by ${n + 1} rectangle of pebbles` : `a staircase of ${(n * (n + 1)) / 2} pebbles`}
    >
      {pebbles.map(p => (
        <circle
          key={p.key}
          r={U * 0.4}
          fill={p.fill}
          style={{
            transform: `translate(${p.x * U + U / 2}px, ${p.y * U + U / 2}px)`,
            opacity: p.shown ? 1 : 0,
            transition: 'transform 700ms ease-in-out, opacity 700ms',
          }}
        />
      ))}
    </svg>
  )
}

function Reveal() {
  const [n, setN] = useState(10)
  const [doubled, setDoubled] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here is 1 + 2 + … + {n} as a staircase of pebbles: a column of 1, a column of 2, and so on up to {n}.
      </p>
      <Staircase n={n} doubled={doubled} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDoubled(!doubled)}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
        >
          {doubled ? 'Take the copy away' : 'Add a flipped copy'}
        </button>
        <label className="flex items-center gap-2 text-slate-300">
          Columns: <strong className="w-6 text-amber-300">{n}</strong>
          <input
            type="range"
            min="3"
            max="14"
            value={n}
            aria-label="Number of columns"
            onChange={e => setN(Number(e.target.value))}
            className="accent-amber-400"
          />
        </label>
      </div>
      {doubled && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Every column is now a pair: the first and the last, the second and the second-to-last. Each one holds{' '}
            <strong className="text-amber-300">{n + 1}</strong> pebbles. Together they make a {n} × {n + 1}{' '}
            rectangle, and the staircase is exactly half of it.
          </p>
          <p className="font-mono text-amber-300" data-testid="staircase-sum">
            1 + 2 + … + {n} = {n} × {n + 1} ÷ 2 = {(n * (n + 1)) / 2}
          </p>
          <p className="text-slate-300">
            A staircase of 100 columns works the same way: 100 × 101 ÷ 2 = 5,050. And look at the shape. It's the
            triangle of handshakes from the last moment, so this shortcut counts handshakes too.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-adding-1-to-100',
  order: '1.5',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'Adding 1 to 100',
  threads: ['Number'],
  rigor: 2,
  move: 'pair-off',
  hook: (
    <p>
      A teacher wants a quiet hour, so the class gets a long job: add up every whole number from 1 to 100. That's
      99 additions, one after another. Is there a quicker way?
    </p>
  ),
  initialState: { pairs: [], picked: null },
  Play,
  playReady: state => state.pairs.length === TILES / 2 && state.pairs.every(([a, b]) => a + b === TILES + 1),
  playNotReady: 'Pair all ten so every pair has the same total',
  predict: {
    question: (
      <p>
        Now the teacher's job. Without adding them one by one:
        <span className="mt-2 block font-mono text-amber-300">1 + 2 + 3 + … + 100 = ?</span>
      </p>
    ),
    response: guess => {
      if (guess === 5050)
        return 'Yes, 5,050: fifty pairs, each making 101. The staircase shows why the pairs always come out equal.'
      if (guess === 10100)
        return '100 numbers make 50 pairs, not 100. Fifty pairs of 101 is 5,050.'
      if (guess === 5000)
        return 'Close. Each pair makes 101, not 100: 1 + 100, 2 + 99, and so on. Fifty pairs of 101 is 5,050.'
      return `It's 5,050, not ${guess}. Pair 1 with 100, 2 with 99, and so on: fifty pairs, each making 101.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Back to the handshakes. How many handshakes are there when <strong>20</strong> people all shake hands with
        each other, once?
      </p>
    ),
    answer: 190,
    praise: 'The handshakes are 1 + 2 + … + 19. That staircase is half of a 19 × 20 rectangle: 190.',
    hint: v =>
      v === 380
        ? "380 is the whole rectangle, staircase and flipped copy together. The staircase is only half of it."
        : v === 210
          ? "210 is 1 + 2 + … + 20. But with 20 people, the last to arrive shakes 19 hands, not 20."
          : 'With 20 people the handshakes are 1 + 2 + … + 19. Picture that staircase and its flipped copy.',
    solution:
      'The last person to arrive shakes 19 hands, so the total is 1 + 2 + … + 19. That staircase has 19 columns. With its flipped copy it makes a 19 × 20 rectangle of 380 pebbles, and the staircase is half: 190.',
  },
  keep: 'To add a run of numbers, pair the first with the last and the second with the second-to-last. Every pair has the same total, so one multiplication does the job.',
  symbols: (
    <p>
      1 + 2 + … + <em>n</em> = <em>n</em> × (<em>n</em> + 1) ÷ 2. If you forget it, draw the staircase and its
      flipped copy.
    </p>
  ),
  story: (
    <>
      <p>
        The famous version: young Carl Friedrich Gauss, at school in Brunswick, Germany, in the 1780s, was set this sum
        and handed in the answer almost at once. The story comes from a memoir written after Gauss died, based on
        what he told friends in old age. That memoir doesn't say which numbers were added. "1 to 100" and most of the
        drama were added by later retellings, so treat the details as legend.
      </p>
      <p className="mt-2">
        The trick itself is much older. A puzzle collection from about 800 AD, usually credited to Alcuin of York,
        asks how many pigeons sit on a ladder of 100 rungs with 1 on the first, 2 on the second, and so on. Its
        answer pairs the rungs from both ends: 5,050.
      </p>
    </>
  ),
  deeper: {
    question: <p>What is 51 + 52 + 53 + … + 100?</p>,
    answer: 3775,
    praise: '50 numbers make 25 pairs, each 51 + 100 = 151. 25 × 151 = 3,775.',
    hint: () => 'How many numbers are there from 51 to 100? What do the first and the last add up to?',
    solution:
      'There are 50 numbers, so 25 pairs. Each pair adds to 151 (51 + 100, 52 + 99, …). 25 × 151 = 3,775. Check another way: 1 to 100 is 5,050, and 1 to 50 is 50 × 51 ÷ 2 = 1,275. 5,050 − 1,275 = 3,775.',
  },
}
