import React, { useState } from 'react'

const PEOPLE = [
  { id: 'A', colour: '#fbbf24' },
  { id: 'B', colour: '#38bdf8' },
  { id: 'C', colour: '#34d399' },
  { id: 'D', colour: '#fb7185' },
]
const colourOf = id => PEOPLE.find(p => p.id === id).colour

function Chip({ id, small }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-slate-950 ${small ? 'h-6 w-6 text-xs' : 'h-9 w-9'}`}
      style={{ background: colourOf(id) }}
    >
      {id}
    </span>
  )
}

const THREE = PEOPLE.slice(0, 3).map(p => p.id)

function Play({ state, setState }) {
  const { row, found } = state
  const [note, setNote] = useState(null)
  const place = id => {
    if (row.includes(id)) return
    const next = [...row, id]
    if (next.length < THREE.length) {
      setState({ ...state, row: next })
      return
    }
    const word = next.join('')
    const isNew = !found.includes(word)
    setNote(isNew ? `${word}: a new order.` : `${word}: you already have that one.`)
    setState({ row: [], found: isNew ? [...found, word] : found })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Three friends, A, B and C, line up for a picture. Tap them in the order they stand, left to right. Find
        every different order.
      </p>
      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-slate-950 p-4">
        <div className="flex gap-2" role="group" aria-label="Friends">
          {THREE.map(id => (
            <button
              key={id}
              type="button"
              aria-label={`friend ${id}`}
              disabled={row.includes(id)}
              onClick={() => place(id)}
              className="rounded-full disabled:opacity-25"
            >
              <Chip id={id} />
            </button>
          ))}
        </div>
        <div className="flex gap-2" aria-label="The line">
          {THREE.map((_, k) => (
            <span key={k} className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-dashed border-slate-600">
              {row[k] && <Chip id={row[k]} />}
            </span>
          ))}
        </div>
      </div>
      {note && <p className="mt-2 text-slate-300">{note}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        {found.map(w => (
          <span key={w} className="flex gap-1 rounded-lg bg-slate-900 p-1">
            {[...w].map((id, k) => (
              <Chip key={k} id={id} small />
            ))}
          </span>
        ))}
      </div>
      <p className="mt-2 text-lg" data-testid="orders-found">
        Orders found: {found.length}
      </p>
    </div>
  )
}

// All orders of the given people, grouped by who stands first.
function orders(ids) {
  if (ids.length <= 1) return [ids]
  return ids.flatMap(first => orders(ids.filter(x => x !== first)).map(rest => [first, ...rest]))
}

const FOUR = PEOPLE.map(p => p.id)
const STEPS = [
  { text: 'Who stands first? Any of the 4.', count: '4' },
  { text: 'Whoever is first, 3 people are left for second place.', count: '4 × 3 = 12' },
  { text: 'Then 2 are left for third place.', count: '4 × 3 × 2 = 24' },
  { text: 'And the last person has only 1 place to go.', count: '4 × 3 × 2 × 1 = 24' },
]

function Reveal() {
  const [step, setStep] = useState(0)
  const all = orders(FOUR)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Add a fourth friend, D. Group the orders by who stands first. Each group is just the 6 orders of the other
        three, with one person put in front.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOUR.map(first => (
          <div key={first} className="rounded-lg bg-slate-950 p-2" data-testid="order-group">
            {all
              .filter(o => o[0] === first)
              .map(o => (
                <div key={o.join('')} className="mb-1 flex gap-1">
                  {o.map((id, k) => (
                    <span key={k} style={{ opacity: k === 0 ? 1 : 0.75 }}>
                      <Chip id={id} small />
                    </span>
                  ))}
                </div>
              ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-lg">4 groups of 6: <strong className="text-amber-300">24 orders</strong>.</p>
      <div className="mt-4 rounded-lg bg-slate-950 p-4">
        <ul className="space-y-2 text-lg">
          {STEPS.slice(0, step).map(s => (
            <li key={s.count} className="flex flex-wrap justify-between gap-2">
              <span>{s.text}</span>
              <span className="font-mono text-amber-300" data-testid="order-count">{s.count}</span>
            </li>
          ))}
        </ul>
        {step < STEPS.length && (
          <button type="button" onClick={() => setStep(step + 1)} className="mt-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
            Fill the next place
          </button>
        )}
      </div>
      {step === STEPS.length && (
        <p className="mt-4 text-lg leading-relaxed">
          Each place has one fewer choice than the place before, and every choice leads to the same number of ways
          to finish. So the choices multiply. For 3 friends that is 3 × 2 × 1 = 6, the six orders you found.
        </p>
      )}
    </div>
  )
}

export default {
  id: 'bon-how-many-orders',
  order: '5.4',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'How many orders?',
  threads: ['Chance', 'Structure'],
  rigor: 2,
  move: 'group-it',
  hook: (
    <p>
      Counting chances means counting cases, and some cases are orders: who comes first, second, third. A host
      seats the same guests in a row every night, never twice in the same order. How long can that go on?
    </p>
  ),
  initialState: { row: [], found: [] },
  Play,
  playReady: state => state.found.length === 6,
  playNotReady: 'Find every order',
  predict: {
    question: <p>Three friends can line up in 6 orders. How many orders are there for four friends?</p>,
    response: guess => {
      if (guess === 24) return 'Yes, 24. Here is a way to see it without listing them.'
      if (guess === 12) return 'Doubling 6 is a natural guess, but the fourth friend can go in more places than two. It is 24.'
      if (guess === 8 || guess === 9 || guess === 10) return 'It grows much faster than that. Each new friend multiplies the count.'
      return `Not ${guess}. Group the orders by who stands first, and count the groups.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>The host has 5 guests. How many nights can the host seat them in a row without ever repeating an order?</p>,
    answer: 120,
    praise: '5 choices for the first seat, then 4, 3, 2 and 1: 5 × 4 × 3 × 2 × 1 = 120 nights, about four months.',
    hint: v =>
      v === 25
        ? 'Five choices for every seat would let a guest sit in two seats at once. Once someone is seated, how many are left?'
        : v === 20
          ? 'That covers the first two seats. Keep going to the fifth.'
          : v === 48
            ? 'Add a fifth guest to the 24 orders of four: there are 5 groups, one for each guest who sits first.'
            : 'Group the orders by who sits first: 5 groups, each holding all the orders of the other 4 guests.',
    solution: 'Who sits first? 5 choices. For each, the other 4 guests can sit in 24 orders. 5 groups of 24 is 120. That is 5 × 4 × 3 × 2 × 1.',
  },
  keep: 'To count orders, multiply the choices for each place, one fewer each time: 4 people stand in 4 × 3 × 2 × 1 = 24 orders.',
  symbols: <p>4 × 3 × 2 × 1 is written 4! and read &quot;4 factorial&quot;. 3! = 6, 4! = 24, 5! = 120.</p>,
  story: (
    <>
      <p>
        An old Hebrew book of letter mysticism, the <em>Sefer Yetzirah</em> (its date is uncertain, somewhere in the
        first centuries AD), counts the words that letters can build: &quot;two stones build two houses, three
        stones build six houses, four stones build twenty-four houses, five stones build one hundred and twenty
        houses.&quot;
      </p>
      <p className="mt-2">
        In India, Bhaskara&apos;s <em>Lilavati</em> (1150) asks how many ways the god Vishnu can hold his club, discus,
        lotus and conch in his four hands (24), and the god Shiva his ten emblems in ten hands: 3,628,800.
      </p>
    </>
  ),
  deeper: {
    question: <p>How many orders are there for 6 people?</p>,
    answer: 720,
    praise: '6 groups of 120: 720. Each extra person multiplies the count by the new number of people.',
    hint: () => 'You know 5 people have 120 orders. Group the orders of 6 by who stands first.',
    solution: 'Who stands first? 6 choices. Behind them, the other 5 stand in 120 orders. 6 × 120 = 720.',
  },
}
