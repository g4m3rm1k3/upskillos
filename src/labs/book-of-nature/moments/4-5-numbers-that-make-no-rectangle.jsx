import React, { useState } from 'react'

const N = 60
const SIEVE = [2, 3, 5, 7]

function Play({ state, setState }) {
  const { used } = state
  const crossed = new Set()
  for (const p of used) for (let m = 2 * p; m <= N; m += p) crossed.add(m)
  const tap = n => !crossed.has(n) && !used.includes(n) && setState({ used: [...used, n].sort((a, b) => a - b) })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        12 pebbles make a rectangle of 3 rows of 4. 7 pebbles make no rectangle at all, except one long row. Numbers
        like 7, bigger than 1 and making only one row, are called <strong>primes</strong>. To find them: tap a
        number, and every bigger number made of rows of that size is crossed out. Start with 2.
      </p>
      <div className="grid grid-cols-10 gap-1 rounded-lg bg-slate-950 p-3 font-mono" style={{ maxWidth: 440 }}>
        {Array.from({ length: N }, (_, i) => i + 1).map(n => {
          const out = n === 1 || crossed.has(n)
          const picked = used.includes(n)
          return (
            <button
              key={n}
              type="button"
              aria-label={`number ${n}`}
              onClick={() => n > 1 && tap(n)}
              className={`rounded py-1 text-center ${picked ? 'bg-amber-500 font-bold text-slate-950' : out ? 'text-slate-600 line-through' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-slate-300" data-testid="sieve-left">
        Not crossed out: {Array.from({ length: N - 1 }, (_, i) => i + 2).filter(n => !crossed.has(n)).length} numbers
      </p>
    </div>
  )
}

const isPrime = n => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every(d => n % d)

// Split a number into its smallest prime and what is left, again and again.
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

const NUMBERS = [60, 84, 91, 97, 100]

function Reveal() {
  const [n, setN] = useState(60)
  const [shown, setShown] = useState(1)
  const parts = split(n)
  const steps = parts.length - 1
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        A number that is not prime makes a rectangle: rows × columns. Each of those can be split again, until only
        primes are left.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Number to split">
        {NUMBERS.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setN(v)
              setShown(1)
            }}
            className={`w-12 rounded-lg border py-1 font-semibold ${v === n ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-4 font-mono text-xl">
        <p className="text-slate-500">{n}</p>
        {Array.from({ length: Math.min(shown, steps) }, (_, j) => {
          const i = j + 1
          const rest = parts.slice(i).reduce((s, p) => s * p, 1)
          return (
            <p key={i} className={j === shown - 1 ? 'text-amber-200' : 'text-slate-500'}>
              = {[...parts.slice(0, i), rest].join(' × ')}
            </p>
          )
        })}
      </div>
      {shown < steps ? (
        <button type="button" onClick={() => setShown(shown + 1)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Split again
        </button>
      ) : (
        <p className="mt-3 text-lg" data-testid="prime-split">
          {isPrime(n) ? `${n} is prime: it can't be split.` : `${n} = ${parts.join(' × ')}: all primes.`}
        </p>
      )}
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Every whole number bigger than 1 is either prime or splits into primes. Primes are the building blocks
          that all the other numbers are made from, the way molecules are made of atoms.
        </p>
        <p className="text-slate-300">
          91 fools almost everyone: it looks prime, but it is 7 × 13.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-numbers-that-make-no-rectangle',
  order: '4.5',
  episodeNumber: 4,
  episode: 'The crisis of the diagonal',
  title: 'Numbers that make no rectangle',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'group-it',
  hook: (
    <p>
      Sixty pebbles make twelve different rectangles. Some numbers of pebbles make none at all, only a single row.
      Which numbers are they, and what are they good for?
    </p>
  ),
  initialState: { used: [] },
  Play,
  playReady: state => SIEVE.every(p => state.used.includes(p)),
  playNotReady: 'Tap 2, 3, 5 and 7',
  predict: {
    question: <p>Is 91 prime?</p>,
    choices: ['Yes, 91 is prime', 'No, 91 makes a rectangle'],
    response: guess =>
      guess === 'No, 91 makes a rectangle'
        ? 'Right: 7 rows of 13. It’s past the end of your grid, but splitting finds it.'
        : 'It looks prime, but it makes 7 rows of 13. Splitting shows it.',
  },
  Reveal,
  tryIt: {
    question: <p>Split 1,001 into primes. What is the biggest prime in the split?</p>,
    answer: 13,
    praise: '1,001 = 7 × 11 × 13.',
    hint: v =>
      v === 143 || v === 77 || v === 91
        ? `${v} isn’t prime: split it again.`
        : 'Try dividing 1,001 by small primes: 2, 3, 5, 7, … Which is the first that fits exactly?',
    solution: '1,001 is not even and doesn’t divide by 3 or 5, but 1,001 = 7 × 143. Then 143 = 11 × 13. So 1,001 = 7 × 11 × 13, and the biggest prime is 13.',
  },
  keep: 'A prime is a number bigger than 1 whose pebbles make only one row. Every other whole number splits into primes: they are the building blocks of all numbers.',
  symbols: <p>60 = 2 × 2 × 3 × 5. The primes up to 30: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29.</p>,
  story: (
    <>
      <p>
        The crossing-out method is called the sieve of Eratosthenes, after the same Eratosthenes who measured the
        Earth. The earliest surviving description, by Nicomachus around AD 100, gives him the credit.
      </p>
      <p className="mt-2">
        The numbers in Fermat&apos;s story in Episode 1, the ones that could not be laid out as a rectangle, were
        primes. Fermat guessed every number in his list was prime, and Euler found one that splits: 641 rows of
        6,700,417.
      </p>
    </>
  ),
  deeper: {
    question: <p>How many primes are there between 60 and 100?</p>,
    answer: 8,
    praise: '61, 67, 71, 73, 79, 83, 89 and 97.',
    hint: () => 'Cross out the even numbers, then multiples of 3, 5 and 7. For numbers below 100, that is enough. Why?',
    solution: 'Cross out multiples of 2, 3, 5 and 7 between 60 and 100. Left: 61, 67, 71, 73, 79, 83, 89, 97. Any number below 100 that splits has a piece of 7 or less (two pieces of 11 or more make at least 121), so those 8 are prime.',
  },
}
