import React, { useState } from 'react'

const NAMES = ['A', 'B', 'C', 'D', 'E']
const COLOURS = { A: '#fbbf24', B: '#38bdf8', C: '#34d399', D: '#fb7185', E: '#a78bfa' }

function Chip({ id, small }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-slate-950 ${small ? 'h-6 w-6 text-xs' : 'h-9 w-9'}`}
      style={{ background: COLOURS[id] }}
    >
      {id}
    </span>
  )
}

const pairOf = draw => [...draw].sort().join('')

function Play({ state, setState }) {
  const { first, draws } = state
  const pairs = [...new Set(draws.map(pairOf))]
  const pick = id => {
    if (!first) return setState({ ...state, first: id })
    if (id === first) return
    const draw = first + id
    setState({ first: null, draws: draws.includes(draw) ? draws : [...draws, draw] })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Five names go into a hat, and two are drawn, one after the other, to row the boat. Tap the first name drawn,
        then the second. Find every pair that could end up in the boat.
      </p>
      <div className="flex gap-2 rounded-lg bg-slate-950 p-4" role="group" aria-label="Names in the hat">
        {NAMES.map(id => (
          <button
            key={id}
            type="button"
            aria-label={`name ${id}`}
            onClick={() => pick(id)}
            className={`rounded-full ${first === id ? 'ring-4 ring-amber-200' : ''}`}
          >
            <Chip id={id} />
          </button>
        ))}
        {first && <span className="ml-3 self-center text-slate-400">drawn first: {first}. Now the second.</span>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-slate-400">Draws (first, then second)</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {draws.map(d => (
              <span key={d} className="rounded bg-slate-800 px-2 font-mono text-slate-200">
                {d[0]} then {d[1]}
              </span>
            ))}
          </div>
          <p className="mt-1 text-lg" data-testid="draw-count">Draws: {draws.length}</p>
        </div>
        <div>
          <p className="text-slate-400">Pairs in the boat</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {pairs.map(p => (
              <span key={p} className="flex gap-1 rounded-lg bg-slate-900 p-1">
                <Chip id={p[0]} small />
                <Chip id={p[1]} small />
              </span>
            ))}
          </div>
          <p className="mt-1 text-lg" data-testid="pair-count">Pairs: {pairs.length}</p>
        </div>
      </div>
    </div>
  )
}

function Reveal() {
  const [folded, setFolded] = useState(false)
  const U = 40
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Lay out every draw in a grid: the first name drawn picks the row, the second picks the column. Nobody is
        drawn twice, so the diagonal is empty. That leaves 5 × 4 = 20 draws.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox={`0 0 ${6 * U} ${6 * U}`} style={{ width: 6 * U, maxWidth: '100%' }} role="img" aria-label="Every draw of two names">
          {NAMES.map((n, i) => (
            <g key={n}>
              <text x={(i + 1) * U + U / 2} y={U / 2 + 5} textAnchor="middle" fill={COLOURS[n]} fontWeight="700">{n}</text>
              <text x={U / 2} y={(i + 1) * U + U / 2 + 5} textAnchor="middle" fill={COLOURS[n]} fontWeight="700">{n}</text>
            </g>
          ))}
          {NAMES.flatMap((a, i) =>
            NAMES.map((b, j) => {
              if (i === j) return null
              const mirror = j < i
              const hidden = folded && mirror
              return (
                <g key={a + b} style={{ opacity: hidden ? 0.12 : 1, transition: 'opacity 0.4s' }}>
                  <rect x={(j + 1) * U + 2} y={(i + 1) * U + 2} width={U - 4} height={U - 4} rx="5" fill="#1e293b" stroke={mirror ? '#475569' : '#fbbf24'} />
                  <text x={(j + 1) * U + U / 2} y={(i + 1) * U + U / 2 + 5} textAnchor="middle" fontSize="13" fill="#e2e8f0">
                    {a}{b}
                  </text>
                </g>
              )
            }),
          )}
        </svg>
      </div>
      {!folded && (
        <button type="button" onClick={() => setFolded(true)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Fold the grid along the diagonal
        </button>
      )}
      {folded && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="fold">
            Every pair sits in the grid twice, once each way round: AB and BA, mirror images across the diagonal.
            Fold them together and 20 draws become <strong className="text-amber-300">10 pairs</strong>. The triangle
            that is left is the handshake triangle of 1.4: a handshake is a pair chosen from the room.
          </p>
          <p>
            Choosing 3 from 5 works the same way. Draw 3 in order: 5 × 4 × 3 = 60 draws. But every team of 3 was
            drawn in 3 × 2 × 1 = 6 orders (5.4), so there are 60 ÷ 6 = <strong className="text-amber-300">10 teams</strong>.
            Count in order, then divide out the orders.
          </p>
          <p className="text-slate-300">
            Check it another way: choosing 3 to row is the same as choosing the 2 who stay on the bank. So 3 from 5
            has to match 2 from 5: 10.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-choosing-a-team',
  order: '5.5',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'Choosing a team',
  threads: ['Chance', 'Structure'],
  rigor: 2,
  move: 'pair-off',
  hook: (
    <p>
      Sometimes order matters: a race has a winner and a runner-up. Sometimes it doesn&apos;t: two people drawn to row
      a boat are just a pair, whichever was drawn first. How do you count when order doesn&apos;t matter?
    </p>
  ),
  initialState: { first: null, draws: [] },
  Play,
  playReady: state => new Set(state.draws.map(pairOf)).size === 10,
  playNotReady: 'Find every pair',
  predict: {
    question: <p>A bigger boat takes 3 of the 5. How many different teams of 3 could be in the boat?</p>,
    response: guess => {
      if (guess === 10) return 'Yes, 10: as many teams of 3 as pairs. Here is the count, and a reason they had to match.'
      if (guess === 60) return '60 counts draws in order: ABC and CBA are counted as different. In the boat they are the same team.'
      if (guess === 20) return '20 counts the pairs in order, AB and BA separately. A team of 3 needs another step.'
      if (guess === 15 || guess === 30) return 'Close in spirit. Count the draws in order first, then see how often each team got counted.'
      return `Not ${guess}. Count the draws in order, then divide out the orders.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>Six names go in the hat and 3 are drawn for the boat. How many different teams of 3 are possible?</p>,
    answer: 20,
    praise: '6 × 5 × 4 = 120 draws in order, and each team of 3 is drawn in 6 orders: 120 ÷ 6 = 20.',
    hint: v =>
      v === 120
        ? 'That counts draws in order. A team drawn as ABC is the same team as CBA. How many orders does each team of 3 have?'
        : v === 40
          ? 'Three people can be drawn in more than 3 orders. Count them: 3 × 2 × 1.'
          : v === 15
            ? '15 is the number of pairs from 6. The boat takes 3.'
            : 'Count the draws in order: 6 × 5 × 4. Then divide by the number of orders a team of 3 can be drawn in.',
    solution: 'In order, there are 6 choices for the first name, 5 for the second and 4 for the third: 120 draws. Each team of 3 shows up in 3 × 2 × 1 = 6 of those draws. 120 ÷ 6 = 20 teams.',
  },
  keep: 'To choose without order, count in order and divide out the orders: 2 from 5 is 20 ÷ 2 = 10, and 3 from 5 is 60 ÷ 6 = 10.',
  story: (
    <>
      <p>
        Indian writers counted choices long ago. Pingala&apos;s work on poetry metres, more than 2,000 years old,
        counted patterns of long and short syllables, and the medical book of Sushruta counts the ways six tastes
        can be mixed: 6 alone, 15 in pairs, 20 in threes, and so on.
      </p>
      <p className="mt-2">
        These numbers, how many ways to choose some things from many, are everywhere in chance. A lottery that draws 6
        balls from 49 has 13,983,816 possible tickets, and only one wins.
      </p>
    </>
  ),
  deeper: {
    question: <p>In the room of 10 from 1.4, how many handshakes are there? Count the draws in order and divide.</p>,
    answer: 45,
    praise: '10 × 9 = 90 ordered pairs, and each handshake is counted twice: 45, the same as 0 + 1 + … + 9 from the arrivals.',
    hint: () => 'The first person in a handshake can be any of 10, the second any of the other 9. How many times is each handshake counted?',
    solution: 'In order: 10 × 9 = 90. Each handshake appears twice (A with B, and B with A), so there are 90 ÷ 2 = 45.',
  },
}
