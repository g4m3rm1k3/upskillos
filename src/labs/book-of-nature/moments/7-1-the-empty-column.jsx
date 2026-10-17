import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const NAMES = ['hundreds', 'tens', 'ones']

// How a scribe with no mark for an empty column writes a board: just the counts that aren't empty.
const bare = cols => cols.filter(c => c > 0).join(' ')
const value = cols => cols.reduce((v, c) => v * 10 + c, 0)

// One column of a counting board, with its counters in a 3 × 3 block.
function Column({ count, name, small }) {
  const S = small ? 8 : 16
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${3 * S + 8} ${3 * S + 8}`} style={{ width: 3 * S + 8 }} className="rounded border border-slate-700" role="img" aria-label={`${count} in the ${name} column`}>
        {Array.from({ length: count }, (_, i) => (
          <circle key={i} cx={4 + S / 2 + (i % 3) * S} cy={4 + S / 2 + Math.floor(i / 3) * S} r={S * 0.36} fill={AMBER} />
        ))}
      </svg>
      {!small && <span className="text-xs text-slate-400">{name}</span>}
    </div>
  )
}

function Play({ state, setState }) {
  const { cols, found } = state
  const set = (k, v) => {
    const next = cols.map((c, j) => (j === k ? v : c))
    const n = value(next)
    setState({ cols: next, found: bare(next) === '3 4' && !found.includes(n) ? [...found, n] : found })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A counting board has a column for each size of bundle, as in 1.2. The board shows 34. A scribe copying a
        board writes down each column&apos;s count, but has no mark for an empty column. Find other boards the scribe
        would write as &quot;3 4&quot;.
      </p>
      <div className="flex flex-wrap gap-4">
        {NAMES.map((name, k) => (
          <Stepper key={name} label={name} value={cols[k]} min={0} max={9} onChange={v => set(k, v)} />
        ))}
      </div>
      <div className="mt-3 flex items-end gap-3 rounded-lg bg-slate-950 p-4">
        {NAMES.map((name, k) => (
          <Column key={name} count={cols[k]} name={name} />
        ))}
        <div className="ml-4 text-lg">
          <p className="text-slate-400">This board is {value(cols)}.</p>
          <p data-testid="scribe">
            The scribe writes: <strong className="font-mono text-2xl text-amber-300">{bare(cols) || '(nothing)'}</strong>
          </p>
        </div>
      </div>
      <p className="mt-2 text-slate-400" data-testid="found">
        Boards written &quot;3 4&quot;: {found.join(', ')}
      </p>
    </div>
  )
}

// The six ways to place a 3 and then a 4 in four columns, with the rest empty.
const FOUR = []
for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) FOUR.push([0, 1, 2, 3].map(k => (k === a ? 3 : k === b ? 4 : 0)))

function Reveal() {
  const [zeros, setZeros] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        With four columns, the 3 and the 4 can sit in any two of them, in that order. Choosing 2 of 4 columns can be
        done 6 ways, as choosing a team did in 5.5. All six boards, and what the scribe writes:
      </p>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-950 p-4 sm:grid-cols-3">
        {FOUR.map(cols => (
          <div key={cols.join('')} className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {cols.map((c, k) => (
                <Column key={k} count={c} name={['thousands', ...NAMES][k]} small />
              ))}
            </div>
            <span className="font-mono text-xl text-amber-300" data-testid="written">
              {zeros ? String(value(cols)) : bare(cols)}
            </span>
          </div>
        ))}
      </div>
      {!zeros && (
        <button type="button" onClick={() => setZeros(true)} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Give each empty column a mark
        </button>
      )}
      {zeros && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Put a mark in every empty column, and the six boards get six different writings. That mark is{' '}
            <strong>zero</strong>. It doesn&apos;t count anything. It holds the place, so every digit stays in its own
            column and keeps its worth.
          </p>
          <p className="text-slate-300">
            A zero at the front is never needed: 0034 is just 34. The zeros that matter sit between digits or after
            them.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-empty-column',
  order: '7.1',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'The empty column',
  threads: ['Number'],
  rigor: 1,
  move: 'group-it',
  hook: (
    <p>
      For more than a thousand years, scribes in Babylon wrote numbers by place, the way we do, but had no mark for
      an empty place. A reader often had to guess which number was meant. How bad could that be?
    </p>
  ),
  initialState: { cols: [0, 3, 4], found: [34] },
  Play,
  playReady: state => state.found.length >= 3,
  playNotReady: 'Find every board written "3 4"',
  predict: {
    question: <p>Add a fourth column, for thousands. Now how many different boards would the scribe write as &quot;3 4&quot;?</p>,
    response: guess => {
      if (guess === 6) return 'Yes, 6. The 3 and the 4 can go in any two of the four columns.'
      if (guess === 4) return 'One more column gives more than one more board: the new column can hold the 3, the 4 or nothing. There are 6.'
      if (guess === 3) return 'The three boards you found are still there, and the thousands column makes more. There are 6.'
      return `Not ${guess}. The 3 and the 4 can sit in any two of the four columns: count the ways.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        On an old tablet with four columns, the scribe wrote &quot;2 5 1&quot;, with no marks for empty columns. How
        many different numbers could it be?
      </p>
    ),
    answer: 4,
    praise: 'Three digits fill three of the four columns, so exactly one column is empty: 2051, 2501, 2510 or 251.',
    hint: v =>
      v === 6
        ? 'Six was for two digits in four columns. Now three columns are full. How many are empty?'
        : v === 1
          ? '251 is one of them, but the empty column could be somewhere else. Where can it go?'
          : 'Three of the four columns hold 2, 5 and 1, in that order. Only one column is empty: which one could it be?',
    solution: 'Three digits in four columns leave exactly one column empty, and it can be any of the four: 2051, 2501, 2510 or 0251 (which is 251). That is 4 numbers.',
  },
  keep: 'In place value a digit’s worth comes from its column, so an empty column needs a mark of its own. That mark is zero: 304 is 3 hundreds, no tens and 4 ones.',
  story: (
    <>
      <p>
        Babylonian scribes counted in sixties (2.5) and wrote by place, but for a long time they left only a gap for an
        empty place, and nothing at all at the end of a number. From around 300 BC they used a sign of two slanted
        wedges for an empty place inside a number, though still never at the end.
      </p>
      <p className="mt-2">
        The Maya of Central America invented a zero of their own, for counting the days of their calendar. The zero we
        use came from India. One of the oldest dated examples is carved on a temple wall at Gwalior in 876, where the
        size of a garden is written 270.
      </p>
    </>
  ),
}
