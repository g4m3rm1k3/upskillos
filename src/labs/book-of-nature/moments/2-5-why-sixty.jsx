import React, { useState } from 'react'

const POTS = [10, 12, 60, 100]
const GROUPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const evenly = (pot, g) => pot % g === 0
const ways = n => Array.from({ length: n }, (_, i) => i + 1).filter(r => n % r === 0)

function Play({ state, setState }) {
  const { pot, tried } = state
  const count = GROUPS.filter(g => evenly(pot, g)).length
  const choose = p => setState({ pot: p, tried: tried.includes(p) ? tried : [...tried, p] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A pot of grain is shared among a group of people, in whole measures. Pick a pot size and see which groups
        get a share with nothing left over.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Pot size">
        <span className="text-slate-400">Pot of</span>
        {POTS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => choose(p)}
            className={`w-14 rounded-lg border px-2 py-1 font-semibold ${p === pot ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="grid gap-1 rounded-lg bg-slate-950 p-3 font-mono sm:grid-cols-2">
        {GROUPS.map(g => (
          <p key={g} className={evenly(pot, g) ? 'text-emerald-400' : 'text-slate-500'}>
            {pot} among {g}: {Math.floor(pot / g)} each{evenly(pot, g) ? ' ✓' : `, ${pot % g} left over`}
          </p>
        ))}
      </div>
      <p className="mt-2 text-lg" data-testid="even-count">
        A pot of {pot} shares evenly among {count} of these {GROUPS.length} groups.
      </p>
    </div>
  )
}

const SIXTY = ways(60)

function Reveal() {
  const [i, setI] = useState(5)
  const rows = SIXTY[i]
  const cols = 60 / rows
  const U = Math.min(12, 300 / Math.max(rows, cols))
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Sharing 60 among a group evenly is the same as laying 60 pebbles out in full rows, one row per person. So
        count the rectangles 60 pebbles can make.
      </p>
      <div className="rounded-lg bg-slate-950 p-4">
        <svg viewBox={`0 0 ${cols * U} ${rows * U}`} style={{ width: cols * U, maxWidth: '100%' }} role="img" aria-label={`${rows} rows of ${cols}`}>
          {Array.from({ length: 60 }, (_, k) => (
            <circle key={k} cx={(k % cols) * U + U / 2} cy={Math.floor(k / cols) * U + U / 2} r={U * 0.4} fill="#fbbf24" />
          ))}
        </svg>
        <p className="mt-2 text-lg" data-testid="rect-readout">
          {rows} {rows === 1 ? 'row' : 'rows'} of {cols}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Rows">
        {SIXTY.map((r, k) => (
          <button
            key={r}
            type="button"
            aria-label={`${r} rows`}
            onClick={() => setI(k)}
            className={`w-10 rounded-lg border py-1 font-semibold ${k === i ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          <strong className="text-amber-300">12 rectangles.</strong> 60 pebbles fit into 1, 2, 3, 4, 5, 6, 10, 12,
          15, 20, 30 or 60 full rows. Ten pebbles manage only 4: 1, 2, 5 or 10 rows.
        </p>
        <p className="text-slate-300">
          So with 60 as the bundle, a half, a third, a quarter, a fifth and a sixth are all whole numbers: 30, 20,
          15, 12 and 10. For people who shared grain, land and silver every day, that made the arithmetic easy.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-why-sixty',
  order: '2.5',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'Why sixty?',
  threads: ['Number', 'Measurement'],
  rigor: 1,
  move: 'draw-picture',
  hook: (
    <p>
      We bundle in tens. The scribes of Babylon bundled in sixties, and their sixties are still on every clock: 60
      seconds in a minute, 60 minutes in an hour. Sixty is a big, awkward bundle. Why would anyone choose it?
    </p>
  ),
  initialState: { pot: 10, tried: [10] },
  Play,
  playReady: state => state.tried.length >= 3 && state.tried.includes(60),
  playNotReady: 'Try at least three pot sizes, including 60',
  predict: {
    question: (
      <p>
        How many different rectangles can 60 pebbles make, with every row full? Count 1 row of 60 and 60 rows of 1
        as two different ones, and 3 rows of 20 and 20 rows of 3 as two more.
      </p>
    ),
    response: guess => {
      if (guess === 12) return 'Yes, 12. Step through them.'
      if (guess === 6) return 'You may have counted each pair once: 3 rows of 20 and 20 rows of 3 count as two. There are 12.'
      if (guess === 7) return 'That matches the groups from 2 to 12 that share evenly. But 15, 20, 30, 60 rows and 1 row count too: there are 12.'
      return `There are 12, not ${guess}. Step through them.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A day has 24 hours. In how many different ways can a day be split into equal shifts of whole hours? Count 1
        shift of 24 hours and 24 shifts of 1 hour.
      </p>
    ),
    answer: 8,
    praise: '1, 2, 3, 4, 6, 8, 12 or 24 shifts: 8 ways. 24 shares nearly as well as 60.',
    hint: v =>
      v === 4
        ? 'You may have counted each pair once. 3 shifts of 8 hours and 8 shifts of 3 hours are different ways.'
        : 'Lay 24 pebbles out in full rows. How many different numbers of rows work?',
    solution: '24 pebbles fit into 1, 2, 3, 4, 6, 8, 12 or 24 full rows (1 × 24, 2 × 12, 3 × 8, 4 × 6 and the other way round). That is 8 ways to split the day.',
  },
  keep: 'Sixty can be shared evenly in 12 ways, because 60 pebbles make 12 full rectangles. That made it a good bundle for people who shared things every day.',
  symbols: <p>1/2, 1/3, 1/4, 1/5 and 1/6 of 60 are 30, 20, 15, 12 and 10: all whole.</p>,
  story: (
    <>
      <p>
        The Sumerians of southern Mesopotamia were counting in sixties by about 3000 BC, and the Babylonians who
        came after them wrote every number that way on clay. Why sixty? Nobody knows. Easy sharing is one guess.
        Another is that two older counting systems merged. Treat any confident answer as a guess.
      </p>
      <p className="mt-2">
        Greek astronomers took over the Babylonian sixtieths for their star tables, and Ptolemy used them around
        AD 150. In Latin, the first small part of a sixty split was the <em>pars minuta prima</em> and the second
        split the <em>pars minuta secunda</em>. That is where our minutes and seconds come from.
      </p>
    </>
  ),
  deeper: {
    question: <p>In how many different ways can 100 be shared evenly, counting 1 group of 100 and 100 groups of 1?</p>,
    answer: 9,
    praise: '1, 2, 4, 5, 10, 20, 25, 50 or 100: 9 ways. Bigger than 60, but fewer ways.',
    hint: () => 'Find every number of full rows 100 pebbles can make. Pair them up: 1 and 100, 2 and 50, …',
    solution: '100 pebbles fit into 1, 2, 4, 5, 10, 20, 25, 50 or 100 full rows. 10 rows of 10 pairs with itself, so it counts once. That is 9 ways.',
  },
}
