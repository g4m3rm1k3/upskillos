import React, { useState } from 'react'

const AMBER = '#fbbf24'
const ROSE = '#fb7185'
const PRIMES = [2, 3, 5, 7, 11, 13]

function split(n) {
  const out = []
  let m = n
  for (let d = 2; m > 1; ) {
    if (m % d === 0) {
      out.push(d)
      m /= d
    } else d++
  }
  return out
}

const fmt = n => n.toLocaleString('en-US')

function Play({ state, setState }) {
  const { list, tried } = state
  const product = list.reduce((s, p) => s * p, 1)
  const n = product + 1
  const parts = list.length ? split(n) : []
  const fresh = [...new Set(parts)].filter(p => !list.includes(p))
  const toggle = p => {
    const next = list.includes(p) ? list.filter(q => q !== p) : [...list, p].sort((a, b) => a - b)
    const key = next.join(',')
    setState({ list: next, tried: next.length && !tried.includes(key) ? [...tried, key] : tried })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Make a list of primes. Multiply them all together and add 1. Then split the answer into primes, and look
        for primes that were not on your list.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Your list">
        {PRIMES.map(p => (
          <button
            key={p}
            type="button"
            aria-label={`prime ${p}`}
            aria-pressed={list.includes(p)}
            onClick={() => toggle(p)}
            className={`w-12 rounded-lg border py-1 font-semibold ${list.includes(p) ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {p}
          </button>
        ))}
      </div>
      {list.length > 0 ? (
        <div className="rounded-lg bg-slate-950 p-4 font-mono text-lg">
          <p>
            {list.join(' × ')} + 1 = <span className="text-amber-300">{fmt(n)}</span>
          </p>
          <p>
            {fmt(n)} = {parts.map(fmt).join(' × ')}
          </p>
          <p className="font-sans text-emerald-400" data-testid="fresh">
            New primes, not on your list: {fresh.map(fmt).join(', ')}
          </p>
        </div>
      ) : (
        <p className="text-slate-400">Pick some primes for your list.</p>
      )}
    </div>
  )
}

const LIST = [2, 3, 5]
const BIG = 31

function Reveal() {
  const [p, setP] = useState(2)
  const rows = Math.floor(BIG / p)
  const U = 14
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Take the list 2, 3, 5: 2 × 3 × 5 + 1 = 31. Lay the 31 pebbles out in rows the size of each prime on the list.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Row size">
        {LIST.map(q => (
          <button
            key={q}
            type="button"
            aria-label={`rows of ${q}`}
            onClick={() => setP(q)}
            className={`rounded-lg border px-3 py-1 font-semibold ${q === p ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            rows of {q}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox={`0 0 ${p * U} ${(rows + 1) * U}`} style={{ width: p * U, maxWidth: '100%' }} role="img" aria-label={`31 pebbles in rows of ${p}`}>
          {Array.from({ length: BIG }, (_, i) => {
            const lonely = i === BIG - 1
            const col = lonely ? 0 : i % p
            const row = lonely ? rows : Math.floor(i / p)
            return <circle key={i} cx={col * U + U / 2} cy={row * U + U / 2} r={U * 0.38} fill={lonely ? ROSE : AMBER} />
          })}
        </svg>
      </div>
      <p className="mt-2 text-lg" data-testid="leftover">
        {rows} rows of {p}, and 1 left over.
      </p>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          2 × 3 × 5 lays out exactly in rows of 2, of 3 and of 5. The extra 1 can never fit. So none of the primes
          on the list goes into 31 exactly, and the primes that 31 splits into, here just 31 itself, are all
          missing from the list.
        </p>
        <p>
          That works for any list of primes, however long. Multiply them all and add 1: the result leaves 1 over
          for every prime on the list, so its primes are new. No list of primes is ever complete.{' '}
          <strong className="text-amber-300">There is no biggest prime.</strong>
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-primes-never-run-out',
  order: '4.6',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'Primes never run out',
  threads: ['Number', 'Structure'],
  rigor: 3,
  move: 'small-case',
  hook: (
    <p>
      Primes thin out as numbers grow: 4 in the first ten numbers, but only 1 between 90 and 100. Maybe they stop
      altogether somewhere, and there is a biggest prime. Nobody can check every number. Can anyone know?
    </p>
  ),
  initialState: { list: [], tried: [] },
  Play,
  playReady: state => state.tried.length >= 3,
  playNotReady: 'Try three different lists',
  predict: {
    question: <p>Is there a biggest prime?</p>,
    choices: ['Yes, the primes run out somewhere', 'No, they never run out', 'Nobody can know'],
    response: guess => {
      if (guess === 'No, they never run out') return 'They never run out, and here is a proof that covers every list anyone could make.'
      if (guess === 'Nobody can know')
        return 'That was a fair worry before Euclid. But you can know without checking every number: the leftover 1 settles it.'
      return 'They never run out. Your lists always produced a new prime, and the reason is the leftover 1.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Take the list 2 and 7. Multiply and add 1. What is the smallest prime that is not on the list?</p>,
    answer: 3,
    praise: '2 × 7 + 1 = 15 = 3 × 5. Both 3 and 5 are new, and 3 is the smaller.',
    hint: v =>
      v === 15
        ? '15 isn’t prime. Split it.'
        : '2 × 7 + 1 = 15. Split 15 into primes.',
    solution: '2 × 7 + 1 = 15, and 15 = 3 × 5. Neither 3 nor 5 is on the list, as the argument promised. The smaller is 3.',
  },
  keep: 'Multiply any list of primes and add 1: the result leaves 1 over for every prime on the list, so it is built from primes the list missed. There is no biggest prime.',
  symbols: <p>For any primes p, q, …, r, the number p × q × … × r + 1 has a prime that is none of them.</p>,
  story: (
    <>
      <p>
        This is Book IX, Proposition 20 of Euclid&apos;s <em>Elements</em>: &quot;Prime numbers are more than any
        assigned multitude of prime numbers.&quot; Euclid showed it with a list of three primes and an argument that
        works for any list.
      </p>
      <p className="mt-2">
        People still hunt for big primes. The biggest known in 2024 has more than 41 million digits, found by a
        computer search. Euclid told us 2,300 years ago that there is always a bigger one.
      </p>
    </>
  ),
  deeper: {
    question: <p>2 × 3 × 5 × 7 × 11 × 13 + 1 = 30,031, and it is not prime. Its smallest prime is 59. What is 30,031 ÷ 59?</p>,
    answer: 509,
    praise: '30,031 = 59 × 509, and 509 is prime too. Two new primes, as promised: the result doesn’t have to be prime itself.',
    hint: () => '59 × 500 = 29,500. How many more 59s make 30,031?',
    solution: '59 × 500 = 29,500, leaving 531, and 531 = 59 × 9. So 30,031 = 59 × 509. Neither 59 nor 509 is on the list.',
  },
}
