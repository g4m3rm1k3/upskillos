import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'

// k groups of n pebbles, each group in its own box. An empty box is still drawn, so 3 groups of 0 shows three empty boxes.
function Groups({ k, n }) {
  if (k === 0) return <p className="py-6 text-center text-slate-500">No groups at all</p>
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: k }, (_, g) => (
        <svg key={g} viewBox="0 0 60 44" style={{ width: 60 }} className="rounded border border-amber-500/60" role="img" aria-label={`a group of ${n}`}>
          {Array.from({ length: n }, (_, i) => (
            <circle key={i} cx={10 + (i % 3) * 20} cy={12 + Math.floor(i / 3) * 20} r="7" fill={AMBER} />
          ))}
        </svg>
      ))}
    </div>
  )
}

function Play({ state, setState }) {
  const { k, n } = state
  const set = change => {
    const next = { ...state, ...change }
    setState({ ...next, noGroups: state.noGroups || next.k === 0, emptyGroups: state.emptyGroups || (next.n === 0 && next.k > 0) })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        3 × 4 means 3 groups of 4. What does × do when one of the numbers is 0? Try no groups at all, and try groups
        with nothing in them.
      </p>
      <div className="flex flex-wrap gap-4">
        <Stepper label="groups" value={k} min={0} max={4} onChange={v => set({ k: v })} />
        <Stepper label="in each" value={n} min={0} max={6} onChange={v => set({ n: v })} />
      </div>
      <div className="mt-3 min-h-[80px] rounded-lg bg-slate-950 p-4">
        <Groups k={k} n={n} />
      </div>
      <p className="mt-2 text-lg" data-testid="groups-readout">
        {k} groups of {n}: {k} × {n} = <strong className="text-amber-300">{k * n}</strong>
      </p>
    </div>
  )
}

function Reveal() {
  const [size, setSize] = useState(1)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Division undoes multiplication: 12 ÷ 3 = 4 because 3 groups of 4 make 12. So 6 ÷ 0 asks: 0 groups of what
        size make 6? Search for it.
      </p>
      <Stepper label="size" value={size} min={0} max={9} onChange={setSize} />
      <p className="mt-3 rounded-lg bg-slate-950 p-3 text-lg" data-testid="search">
        0 groups of {size} make <strong className="text-rose-300">0</strong>, not 6.
      </p>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          With no groups there is nothing, whatever size the groups would have been, so no number works. 6 ÷ 0 isn&apos;t 0 and it isn&apos;t 6: it
          has <strong>no answer</strong>. The same goes for any number other than 0, divided by 0.
        </p>
        <p className="text-slate-300">
          0 ÷ 0 fails the other way: 0 groups of any size make 0, so every number would do, and a division must give
          one answer. So 0 ÷ 0 has no answer either.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-nothing-at-all',
  order: '7.2',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'Nothing at all',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'work-backwards',
  hook: (
    <p>
      Zero began as a mark for an empty column. In 628, the Indian astronomer Brahmagupta did something bolder: he
      treated zero as a number in its own right, to add, take away, multiply and divide. What rules must it follow?
    </p>
  ),
  initialState: { k: 3, n: 4, noGroups: false, emptyGroups: false },
  Play,
  playReady: state => state.noGroups && state.emptyGroups,
  playNotReady: 'Try 0 groups, and groups of 0',
  predict: {
    question: <p>Taking a number from itself leaves 0, and anything × 0 is 0. So what is 6 ÷ 0?</p>,
    choices: ['0', '6', 'No number works'],
    response: guess => {
      if (guess === 'No number works') return 'Yes. Here is how to see that no number works, whatever you try.'
      if (guess === '0') return 'If 6 ÷ 0 were 0, then 0 groups of 0 would make 6. They make 0.'
      return 'If 6 ÷ 0 were 6, then 0 groups of 6 would make 6. They make 0.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>12 ÷ 4 = 3, and you can check it: 4 groups of 3 make 12. Check the same way: what is 0 ÷ 5?</p>,
    answer: 0,
    praise: '5 groups of 0 make 0, so 0 ÷ 5 = 0. It is dividing by 0 that has no answer, not dividing 0.',
    hint: v =>
      v === 5
        ? 'Check it: 5 groups of 5 make 25, not 0. Which size of group makes 0?'
        : 'Ask: 5 groups of what size make 0?',
    solution: '0 ÷ 5 asks: 5 groups of what size make 0? Groups of 0. So 0 ÷ 5 = 0. Sharing nothing among 5 people gives each of them nothing.',
  },
  keep: 'Zero is a number with rules: a number take away itself is 0, and anything × 0 is 0. Dividing by 0 has no answer, because no number × 0 makes anything but 0.',
  symbols: <p>6 − 6 = 0 · 6 + 0 = 6 · 6 × 0 = 0 · 0 ÷ 6 = 0 · 6 ÷ 0: no answer</p>,
  story: (
    <>
      <p>
        Brahmagupta wrote his rules for zero, in verse, in a book on astronomy, the <em>Brahmasphutasiddhanta</em>{' '}
        (628). They are the oldest known rules for calculating with zero as a number.
      </p>
      <p className="mt-2">
        He got one wrong: he said 0 ÷ 0 = 0. Later Indian mathematicians argued about dividing by zero for centuries.
        Today the rule is the one you found: division by zero has no answer.
      </p>
    </>
  ),
}
