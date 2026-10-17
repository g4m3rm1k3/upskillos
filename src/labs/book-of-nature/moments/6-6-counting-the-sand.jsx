import React, { useState } from 'react'

const NAMES = [
  { name: 'ten', zeros: 1 },
  { name: 'a hundred', zeros: 2 },
  { name: 'a thousand', zeros: 3 },
  { name: 'a myriad', zeros: 4 },
]

const write = zeros => (10n ** BigInt(zeros)).toLocaleString('en-US')

function Pick({ label, value, onPick }) {
  return (
    <div>
      <p className="mb-1 text-sm text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {NAMES.map((n, k) => (
          <button
            key={n.name}
            type="button"
            onClick={() => onPick(k)}
            className={`rounded-lg border px-3 py-1 text-sm font-semibold ${k === value ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {n.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function Play({ state, setState }) {
  const { a, b, tried } = state
  const set = change => {
    const next = { a, b, ...change }
    const key = [next.a, next.b].sort().join('')
    setState({ ...next, tried: tried.includes(key) ? tried : [...tried, key] })
  }
  const x = NAMES[a]
  const y = NAMES[b]
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Greek had names for numbers up to ten thousand, called a <strong>myriad</strong>, and no further. Multiply two
        of these numbers and count the zeros in the answer. (A myriad times a myriad was as far as the Greek names
        went: &quot;a myriad myriads&quot;.)
      </p>
      <div className="space-y-3">
        <Pick label="First number" value={a} onPick={k => set({ a: k })} />
        <Pick label="Second number" value={b} onPick={k => set({ b: k })} />
      </div>
      <div className="mt-4 rounded-lg bg-slate-950 p-4 font-mono text-lg">
        <p>
          {write(x.zeros)} × {write(y.zeros)}
        </p>
        <p className="text-amber-300" data-testid="product">= {write(x.zeros + y.zeros)}</p>
        <p className="font-sans text-slate-400" data-testid="zero-count">
          zeros: {x.zeros} and {y.zeros} make {x.zeros + y.zeros}
        </p>
      </div>
    </div>
  )
}

function Tens({ n, colour }) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="rounded px-1.5 py-0.5 font-mono text-sm font-semibold text-slate-950" style={{ background: colour }}>
          ×10
        </span>
      ))}
    </span>
  )
}

function Reveal() {
  const [shown, setShown] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        A hundred is 10 × 10: one 1 multiplied by ten twice, so two zeros. A thousand is ten three times. Write each
        number as its tens.
      </p>
      {!shown && (
        <button type="button" onClick={() => setShown(true)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Write them as tens
        </button>
      )}
      {shown && (
        <>
          <div className="space-y-2 rounded-lg bg-slate-950 p-4 text-lg">
            <p className="flex flex-wrap items-center gap-2">
              <span className="w-28 whitespace-nowrap">100</span> = 1 <Tens n={2} colour="#38bdf8" />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="w-28 whitespace-nowrap">1,000</span> = 1 <Tens n={3} colour="#fbbf24" />
            </p>
            <p className="flex flex-wrap items-center gap-2" data-testid="tens-product">
              <span className="w-28 whitespace-nowrap">100 × 1,000</span> = 1 <Tens n={2} colour="#38bdf8" />
              <Tens n={3} colour="#fbbf24" /> = 100,000
            </p>
          </div>
          <div className="mt-4 space-y-3 text-lg leading-relaxed">
            <p>
              Multiplying just puts the two rows of tens together, so the zeros add: 2 + 3 = 5. A myriad myriads has 4 +
              4 = 8 zeros, and a myriad myriads times itself has 8 + 8 = 16.
            </p>
            <p>
              That is how Archimedes could name numbers bigger than anyone had needed. He called a myriad myriads the
              unit of a new &quot;order&quot; of numbers, then counted in those units, and built orders on orders: bundles of bundles, as in 1.2. Counting
              grains of sand only needs enough zeros, and adding zeros is easy.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default {
  id: 'bon-counting-the-sand',
  order: '6.6',
  episodeNumber: 6,
  episode: 'Trapping π',
  title: 'Counting the sand',
  threads: ['Number'],
  rigor: 1,
  move: 'group-it',
  hook: (
    <p>
      &quot;There are some, King Gelon, who think the number of the sand is infinite.&quot; So Archimedes began a letter
      to the king of Syracuse. He meant to count the grains of sand it would take to fill the whole universe. But
      first he needed names for numbers far bigger than any anyone had named.
    </p>
  ),
  initialState: { a: 1, b: 2, tried: ['12'] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try three different pairs',
  predict: {
    question: <p>A myriad myriads is 100,000,000. Multiply it by itself. How many zeros does the answer have?</p>,
    response: guess => {
      if (guess === 16) return 'Yes, 16. Here is why the zeros simply add.'
      if (guess === 64) return '8 × 8 multiplies the counts of zeros. Your products showed something simpler happening to the zeros.'
      if (guess === 9) return 'Count again: 100,000,000 has 8 zeros, and so does the other one.'
      return `Not ${guess}. Look at what happened to the zeros in each of your products.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>A cube-shaped box is 1,000 grains long, 1,000 grains wide and 1,000 grains tall. It holds 1,000 × 1,000 × 1,000 grains. How many zeros does that number have?</p>,
    answer: 9,
    praise: '3 + 3 + 3 = 9 zeros: 1,000,000,000 grains, a thousand million.',
    hint: v =>
      v === 27
        ? 'That multiplies the zeros. When numbers like these multiply, their zeros add.'
        : v === 6
          ? 'That is 1,000 × 1,000. There is a third 1,000: the box is tall as well.'
          : 'Each 1,000 has 3 zeros. Multiplying puts their tens together.',
    solution: 'Each 1,000 is 1 with three ×10s. Three of them multiplied together give nine ×10s: 1,000,000,000, with 9 zeros.',
  },
  keep: 'Multiplying 1 followed by zeros adds the zeros: 100 × 1,000 = 100,000. So even the biggest counts can be named, by counting their zeros.',
  symbols: <p>10 × 10 × 10 is written 10³ (&quot;ten to the third&quot;). 10² × 10³ = 10⁵: the small numbers add.</p>,
  story: (
    <>
      <p>
        <em>The Sand Reckoner</em> estimates grains of sand per poppy seed, poppy seeds per finger-width, and so on up
        to the size of the universe, always rounding up. To make the universe as big as possible he used the largest
        one anyone had proposed, Aristarchus&apos;s, with the Sun at the centre. It is the oldest surviving mention of
        that idea.
      </p>
      <p className="mt-2">
        His answer: fewer than a 1 followed by 63 zeros. The point was not the number. It was that the sand is not
        infinite: any amount, however big, can be counted, if you have names for big enough numbers.
      </p>
    </>
  ),
  deeper: {
    question: <p>How many digits does a myriad myriads (100,000,000) have when you write it out?</p>,
    answer: 9,
    praise: 'Eight zeros and the 1 in front: 9 digits.',
    hint: () => 'Count the zeros, then don’t forget the 1 at the start.',
    solution: '100,000,000 is a 1 followed by 8 zeros, so it has 9 digits.',
  },
}
