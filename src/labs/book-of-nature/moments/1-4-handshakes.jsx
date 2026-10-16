import React, { useState } from 'react'

const NAMES = 'ABCDEFGHIJ'
const ROOM = 10
const handshakes = n => (n * (n - 1)) / 2

// Where seat i of n sits on a circle in a 260 × 260 picture.
function seat(i, n) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  return [130 + 100 * Math.cos(a), 130 + 100 * Math.sin(a)]
}

// People round a circle, with a line for every handshake. Lines marked hot are drawn in amber.
// Seats from `present` onwards are empty and drawn as dashed outlines.
function Room({ seats, present = seats, lines, picked = null, onPick }) {
  return (
    <svg viewBox="0 0 260 260" className="w-full select-none" style={{ maxHeight: 300 }}>
      {lines.map(([i, j, hot]) => {
        const [x1, y1] = seat(i, seats)
        const [x2, y2] = seat(j, seats)
        return (
          <line
            key={`${i}-${j}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={hot ? '#fbbf24' : '#64748b'}
            strokeWidth={hot ? 3 : 1.5}
          />
        )
      })}
      {Array.from({ length: seats }, (_, i) => {
        const [x, y] = seat(i, seats)
        if (i >= present) return <circle key={i} cx={x} cy={y} r="14" fill="none" stroke="#334155" strokeDasharray="3 3" />
        const tap = onPick && {
          role: 'button',
          tabIndex: 0,
          'aria-label': `person ${NAMES[i]}`,
          onClick: () => onPick(i),
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPick(i)
            }
          },
          style: { cursor: 'pointer' },
        }
        return (
          <g key={i} {...tap}>
            <circle cx={x} cy={y} r="16" fill={picked === i ? '#fbbf24' : '#38bdf8'} stroke="#0f172a" strokeWidth="2" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#0f172a">
              {NAMES[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const SIZES = [2, 3, 4, 5, 6]

function Play({ state, setState }) {
  const { n, shakes, picked, done, note } = state
  const complete = shakes.length === handshakes(n)

  const pick = i => {
    if (complete) return
    if (picked === null) return setState({ ...state, picked: i, note: '' })
    if (picked === i) return setState({ ...state, picked: null })
    const pair = [Math.min(picked, i), Math.max(picked, i)]
    if (shakes.some(([a, b]) => a === pair[0] && b === pair[1]))
      return setState({ ...state, picked: null, note: `${NAMES[pair[0]]} and ${NAMES[pair[1]]} have already shaken hands.` })
    const next = [...shakes, pair]
    setState({
      ...state,
      shakes: next,
      picked: null,
      note: '',
      done: next.length === handshakes(n) ? { ...done, [n]: next.length } : done,
    })
  }

  return (
    <div>
      <p className="mb-3 text-slate-300">
        Everyone shakes hands with everyone else, once. Ten people is a lot to keep track of, so start with a tiny
        room. Tap one person, then another, to make them shake hands.
      </p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Number of people">
        <span className="text-slate-400">People in the room:</span>
        {SIZES.map(k => (
          <button
            key={k}
            type="button"
            aria-label={`${k} people`}
            onClick={() => setState({ ...state, n: k, shakes: [], picked: null, note: '' })}
            className={`w-10 rounded-lg border px-2 py-1 font-semibold ${
              n === k ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-3 grid items-start gap-4 sm:grid-cols-2">
        <Room seats={n} lines={shakes.map(([a, b]) => [a, b, false])} picked={picked} onPick={pick} />
        <div>
          <p className="text-lg">
            <strong className="text-amber-300">{shakes.length}</strong> {shakes.length === 1 ? 'handshake' : 'handshakes'} so far.
          </p>
          {note && <p className="mt-2 text-rose-300">{note}</p>}
          {complete && <p className="mt-2 font-semibold text-emerald-400">Everyone has shaken hands with everyone else.</p>}
          {Object.keys(done).length > 0 && (
            <table className="mt-4 font-mono text-lg">
              <thead>
                <tr className="text-sm text-slate-400">
                  <th className="pr-4 text-left font-normal">People</th>
                  <th className="text-left font-normal">Handshakes</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(done).map(([people, count]) => (
                  <tr key={people}>
                    <td className="pr-4">{people}</td>
                    <td className="font-bold text-amber-300" data-testid="handshake-count">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const U = 24

// The handshakes as pebbles: one row per person who arrived, one pebble per new handshake.
function Staircase({ rows }) {
  const pebbles = []
  for (let r = 1; r <= rows; r++)
    for (let c = 0; c < r; c++)
      pebbles.push(<circle key={`${r}-${c}`} cx={c * U + U / 2} cy={(r - 1) * U + U / 2} r={U * 0.4} fill={r === rows ? '#fbbf24' : '#38bdf8'} />)
  return (
    <svg viewBox={`0 0 ${(ROOM - 1) * U} ${(ROOM - 1) * U}`} className="w-full" style={{ maxHeight: 260 }} role="img" aria-label={`${handshakes(rows + 1)} pebbles in a triangle`}>
      {pebbles}
    </svg>
  )
}

function Reveal() {
  const [k, setK] = useState(1)
  const lines = []
  for (let j = 1; j < k; j++) for (let i = 0; i < j; i++) lines.push([i, j, j === k - 1])
  const terms = Array.from({ length: k }, (_, i) => i)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Don't try to see all ten at once. Let the guests arrive one at a time. Each newcomer shakes hands with
        everyone already in the room.
      </p>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Room seats={ROOM} present={k} lines={lines} />
        <div>
          <p className="mb-2 text-sm text-slate-400">One row of pebbles per newcomer, one pebble per new handshake</p>
          <Staircase rows={k - 1} />
        </div>
      </div>
      <p className="mt-3 text-lg">
        {k === 1 ? (
          <>A arrives. Nobody to greet yet: <strong className="text-amber-300">0</strong> handshakes.</>
        ) : (
          <>
            {NAMES[k - 1]} arrives and shakes <strong className="text-amber-300">{k - 1}</strong> new{' '}
            {k - 1 === 1 ? 'hand' : 'hands'}.
          </>
        )}
      </p>
      <p className="mt-1 font-mono text-amber-300" data-testid="arrivals-sum">
        {terms.join(' + ')} = {handshakes(k)}
      </p>
      {k < ROOM ? (
        <button
          type="button"
          onClick={() => setK(k + 1)}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
        >
          Next person arrives
        </button>
      ) : (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Every handshake gets counted exactly once: at the moment the second of the two people walks in. Nothing
            is missed and nothing is counted twice.
          </p>
          <p className="text-slate-300">
            And the pebbles stack into a triangle. That is why 1, 3, 6, 10, 15, … are called{' '}
            <strong className="text-amber-300">triangular numbers</strong>.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-handshakes',
  order: '1.4',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'Handshakes',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'small-case',
  hook: (
    <p>
      Ten people meet, and everyone shakes hands with everyone else, once. How many handshakes is that? Ten people
      is too many to picture at once. So don't. Start smaller.
    </p>
  ),
  initialState: { n: 2, shakes: [], picked: null, done: {}, note: '' },
  Play,
  playReady: state => Object.keys(state.done).length >= 3,
  playNotReady: 'Finish three different room sizes first',
  predict: {
    question: <p>Now the real question: how many handshakes when there are ten people in the room?</p>,
    response: guess => {
      if (guess === 45)
        return 'Yes, 45. The small rooms gave 1, 3, 6, 10, and each new person adds one more handshake than the last. The arrivals picture shows why that has to keep happening.'
      if (guess === 90)
        return "90 counts every handshake twice. Each person shakes 9 hands, and 10 × 9 = 90, but A shaking B's hand and B shaking A's hand is the same handshake. The answer is 45."
      if (guess === 100)
        return '10 × 10 has everyone shaking their own hand, and counts each real handshake twice. The answer is 45.'
      return `It's 45, not ${guess}. Watch the arrivals: each newcomer adds one more handshake than the person before.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        At another party there were <strong>21</strong> handshakes, everyone with everyone else, once. How many
        people were there?
      </p>
    ),
    answer: 7,
    praise: '0 + 1 + 2 + 3 + 4 + 5 + 6 = 21, so the seventh person to arrive brought the total to 21.',
    hint: v =>
      v === 6
        ? '6 is how many hands the last person to arrive shook. How many people does that make, counting the last one?'
        : 'Let people arrive one at a time and keep a running total: 0, then 0 + 1, then 0 + 1 + 2, … until you reach 21.',
    solution:
      'Running totals as people arrive: 0, 1, 3, 6, 10, 15, 21. The total reaches 21 when the seventh person arrives, so there were 7 people.',
  },
  keep: 'Let people arrive one at a time: each newcomer shakes hands with everyone already there. So the handshakes go 1 + 2 + 3 + …, and they stack into a triangle.',
  symbols: (
    <p>
      With <em>n</em> people there are 1 + 2 + … + (<em>n</em> − 1) handshakes. The totals 1, 3, 6, 10, 15, … are
      the triangular numbers.
    </p>
  ),
  story: (
    <>
      <p>
        The Pythagoreans set out pebbles in triangles too. Their favourite was the <em>tetractys</em>: rows of 1, 2,
        3 and 4 making 10, which they treated as sacred and swore oaths by.
      </p>
      <p className="mt-2">
        Two thousand years later, on 10 July 1796, the eighteen-year-old Carl Friedrich Gauss wrote in his diary
        "ΕΥΡΗΚΑ! num = Δ + Δ + Δ". He had proved that every whole number is the sum of at most three triangular
        numbers. You'll meet Gauss again in the next moment.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        A league has 12 teams. Every team plays every other team twice, once at home and once away. How many games
        are played in the season?
      </p>
    ),
    answer: 132,
    praise: 'Once each would be 0 + 1 + … + 11 = 66 games. Twice each is 132.',
    hint: () => 'First count the games if every pair of teams met just once: that is handshakes for 12. Then double it.',
    solution:
      'If every pair met once, it would be like handshakes among 12: 0 + 1 + 2 + … + 11 = 66. Each pair meets twice, so 132. Another way: each team has 11 home games, and 12 × 11 = 132.',
  },
}
