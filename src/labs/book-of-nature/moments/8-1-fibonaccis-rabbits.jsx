import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'

// Grown pairs and baby pairs in each month, starting from one baby pair in month 1.
const months = n => {
  const out = [{ grown: 0, babies: 1 }]
  while (out.length < n) {
    const last = out[out.length - 1]
    out.push({ grown: last.grown + last.babies, babies: last.grown })
  }
  return out
}
const total = m => m.grown + m.babies
const pairs = n => `${n} ${n === 1 ? 'pair' : 'pairs'}`

// A pair is two circles: big amber for grown, small blue for babies.
function Hutch({ grown, babies }) {
  const list = [...Array(grown).fill(true), ...Array(babies).fill(false)]
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((big, i) => (
        <svg key={i} viewBox="0 0 40 24" style={{ width: 40 }} role="img" aria-label={big ? 'a grown pair' : 'a baby pair'}>
          <circle cx="12" cy="12" r={big ? 9 : 5.5} fill={big ? AMBER : SKY} />
          <circle cx="28" cy="12" r={big ? 9 : 5.5} fill={big ? AMBER : SKY} />
        </svg>
      ))}
    </div>
  )
}

function Play({ state, setState }) {
  const { month } = state
  const all = months(month)
  const now = all[month - 1]
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A baby pair of rabbits takes a month to grow up. From then on, every grown pair has one new baby pair each
        month. No rabbit dies. Start with one baby pair and step through the months.
      </p>
      <Stepper label="month" value={month} min={1} max={7} onChange={m => setState({ month: m, reached: Math.max(state.reached, m) })} />
      <div className="mt-3 min-h-[70px] rounded-lg bg-slate-950 p-4">
        <Hutch {...now} />
      </div>
      <p className="mt-2 text-lg" data-testid="month-readout">
        Month {month}: <span className="text-amber-300">{pairs(now.grown)} grown</span> and <span style={{ color: SKY }}>{pairs(now.babies)} of babies</span>: {pairs(total(now))} in all
      </p>
      <p className="font-mono text-lg text-slate-400" data-testid="month-list">
        {months(state.reached).map(total).join(', ')}
      </p>
    </div>
  )
}

function Reveal() {
  const [shown, setShown] = useState(7)
  const all = months(shown)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        This month&apos;s pairs come in two kinds. The <span className="text-amber-300">grown</span> pairs are all the
        pairs alive last month, babies included. The <span style={{ color: SKY }}>babies</span> were born to last
        month&apos;s grown pairs, and those were all the pairs alive the month before that.
      </p>
      <table className="font-mono text-lg">
        <tbody>
          {all.map((m, i) => (
            <tr key={i}>
              <td className="pr-3 text-slate-500">month {i + 1}</td>
              <td className="pr-2 text-right">{i >= 2 ? total(all[i - 1]) : ''}</td>
              <td className="px-1 text-slate-500">{i >= 2 ? '+' : ''}</td>
              <td className="pr-2 text-right">{i >= 2 ? total(all[i - 2]) : ''}</td>
              <td className="px-1 text-slate-500">{i >= 2 ? '=' : ''}</td>
              <td className="font-bold text-amber-300" data-testid="pairs">{total(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown < 12 && (
        <button type="button" onClick={() => setShown(shown + 1)} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Next month
        </button>
      )}
      <p className="mt-4 text-lg leading-relaxed">
        So each month&apos;s count is the two counts before it added together: last month&apos;s pairs, plus the month
        before&apos;s. You don&apos;t need to draw a single rabbit to go on: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144.
        These are the <strong>Fibonacci numbers</strong>.
      </p>
    </div>
  )
}

export default {
  id: 'bon-fibonaccis-rabbits',
  order: '8.1',
  episodeNumber: 8,
  episode: 'Duels over the cubic',
  title: "Fibonacci's rabbits",
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'generalize',
  hook: (
    <p>
      In 1202, Leonardo of Pisa wrote a book to teach Italian merchants the new Indian numerals (7.4). Among its
      problems on prices and money is one about rabbits: start with one pair, and how many pairs will there be in a
      year?
    </p>
  ),
  initialState: { month: 1, reached: 1 },
  Play,
  playReady: state => state.reached >= 6,
  playNotReady: 'Step on to month 6',
  predict: {
    question: <p>How many pairs will there be in month 10?</p>,
    response: guess => {
      if (guess === 55) return 'Yes, 55. Here is the rule that gets you there without drawing.'
      if (guess === 34) return '34 is month 9. One more month: 34 + 21 = 55.'
      if (guess === 64 || guess === 128) return 'The pairs don’t double each month, because the newest babies must wait a month before they breed. There are 55.'
      return `Not ${guess}. Look at the list: how does each number come from the ones before it?`
    },
  },
  Reveal,
  tryIt: {
    question: <p>The 20th Fibonacci number is 6,765 and the 21st is 10,946. What is the 19th?</p>,
    answer: 4181,
    praise: 'The 21st is the 19th plus the 20th, so the 19th is 10,946 − 6,765 = 4,181.',
    hint: v =>
      v === 17711
        ? '17,711 is the 22nd: the next one. Go back a step instead.'
        : 'The 21st is made from the 19th and the 20th added together. Work backwards: what plus 6,765 makes 10,946?',
    solution: 'Each number is the two before it added together: 19th + 20th = 21st. So 19th + 6,765 = 10,946, and the 19th is 10,946 − 6,765 = 4,181.',
  },
  keep: 'When each month builds on the last two, so does the count: in the Fibonacci numbers 1, 1, 2, 3, 5, 8, 13 … each number is the two before it added together.',
  story: (
    <>
      <p>
        Leonardo grew up partly in Bugia, on the coast of North Africa, where his father worked for Pisan merchants.
        There he learned the Indian numerals and the methods of the Islamic world. His book, the <em>Liber Abaci</em>,
        spread them through Italy. The name Fibonacci, &quot;son of Bonacci&quot;, was given to him centuries later.
      </p>
      <p className="mt-2">
        In his version the first pair is already grown, so his count runs 2, 3, 5, 8 … and reaches 377 pairs after a
        year. Indian scholars of poetry had met the same numbers earlier, counting the rhythms that can be made from
        long and short beats.
      </p>
    </>
  ),
}
