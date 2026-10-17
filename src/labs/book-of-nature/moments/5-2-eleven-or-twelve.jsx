import React, { useState } from 'react'
import { PAIRS, die, random } from '../chance'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// The totals of the first n throws of two dice, always the same for the same n.
function throws(n) {
  const next = random(52)
  return Array.from({ length: n }, () => die(next) + die(next))
}

function Play({ state, setState }) {
  const totals = throws(state.thrown)
  const count = t => totals.filter(x => x === t).length
  const top = Math.max(1, ...TOTALS.map(count))
  const more = n => setState({ thrown: state.thrown + n })
  return (
    <div>
      <p className="mb-3 text-slate-300">Throw two dice and add them. Do it many times and watch how often each total comes up.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => more(10)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Throw 10 times
        </button>
        <button type="button" onClick={() => more(100)} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Throw 100 times
        </button>
      </div>
      <div className="mt-4 rounded-lg bg-slate-950 p-4">
        <svg viewBox="0 0 330 170" className="w-full max-w-md" role="img" aria-label="How often each total came up">
          {TOTALS.map((t, i) => {
            const h = (120 * count(t)) / top
            const focus = t === 11 || t === 12
            return (
              <g key={t}>
                <rect x={i * 30 + 3} y={135 - h} width="24" height={h} rx="3" fill={focus ? AMBER : SKY} fillOpacity={focus ? 1 : 0.6} />
                <text x={i * 30 + 15} y="152" textAnchor="middle" fill="#cbd5e1" fontSize="12">{t}</text>
                <text x={i * 30 + 15} y={130 - h} textAnchor="middle" fill="#94a3b8" fontSize="10">{count(t) || ''}</text>
              </g>
            )
          })}
          <text x="165" y="167" textAnchor="middle" fill="#64748b" fontSize="10">total of the two dice</text>
        </svg>
        <p className="mt-2 text-lg" data-testid="dice-tally">
          {state.thrown} throws: 11 came up {count(11)} times, 12 came up {count(12)} times.
        </p>
      </div>
    </div>
  )
}

const MARKS = { 12: 'total 12', 11: 'total 11', 7: 'total 7' }

function Reveal() {
  const [mark, setMark] = useState(null)
  const hit = ([a, b]) => mark !== null && a + b === mark
  const ways = mark === null ? 0 : PAIRS.filter(hit).length
  const U = 40
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Paint one die amber and the other sky blue, so you can always tell them apart. Now every throw is a square
        in this grid: the amber die picks the row, the sky die picks the column. 6 rows of 6 make 36 throws, and
        each one is as likely as any other.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[12, 11, 7].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setMark(t)}
            className={`rounded-lg border px-3 py-1 font-semibold ${mark === t ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            Show {MARKS[t]}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox={`0 0 ${7 * U} ${7 * U}`} style={{ width: 7 * U, maxWidth: '100%' }} role="img" aria-label="All 36 throws of two dice">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <g key={n}>
              <text x={n * U + U / 2} y={U / 2 + 5} textAnchor="middle" fill={SKY} fontSize="16" fontWeight="700">{n}</text>
              <text x={U / 2} y={n * U + U / 2 + 5} textAnchor="middle" fill={AMBER} fontSize="16" fontWeight="700">{n}</text>
            </g>
          ))}
          {PAIRS.map(([a, b]) => (
            <g key={`${a}-${b}`}>
              <rect x={b * U + 2} y={a * U + 2} width={U - 4} height={U - 4} rx="5" fill={hit([a, b]) ? AMBER : '#1e293b'} />
              <text x={b * U + U / 2} y={a * U + U / 2 + 5} textAnchor="middle" fontSize="13" fill={hit([a, b]) ? '#0f172a' : '#94a3b8'}>
                {a}+{b}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {mark !== null && (
        <p className="mt-2 text-lg" data-testid="ways">
          {MARKS[mark]}: {ways} of the 36 throws.
        </p>
      )}
      {mark !== null && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            12 needs both dice to show 6: one square. But 11 is amber 5 with sky 6, <em>or</em> amber 6 with sky 5:
            two different squares. Ordinary dice look alike, but they are still two dice, and the throw happens two
            ways. So 11 comes up about twice as often as 12, just as your throws showed.
          </p>
          <p>
            Leibniz counted <em>results</em> (&quot;a 5 and a 6&quot;). The cases to count are the ones that are{' '}
            <strong>equally likely</strong>: the 36 squares. 11 has 2 chances in 36, written 2/36. A number like that,
            the chances out of all the equally likely cases, is called a <strong>probability</strong>.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-eleven-or-twelve',
  order: '5.2',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'Eleven or twelve?',
  threads: ['Chance'],
  rigor: 3,
  move: 'draw-picture',
  hook: (
    <p>
      Gottfried Leibniz was one of the cleverest people of the 1600s. He wrote that with two dice, a total of 11 is
      just as easy to throw as 12, because each can be made only one way: 11 is a 5 and a 6, and 12 is a 6 and a 6.
      Was he right?
    </p>
  ),
  initialState: { thrown: 0 },
  Play,
  playReady: state => state.thrown >= 200,
  playNotReady: 'Throw at least 200 times',
  predict: {
    question: <p>Which total comes up more often with two dice?</p>,
    choices: ['11 comes up more often', '12 comes up more often', 'About the same'],
    response: guess => {
      if (guess === '11 comes up more often') return 'Yes, and about twice as often. Here is where the extra chance hides.'
      if (guess === 'About the same')
        return 'That was Leibniz’s answer, and it is wrong. Your throws disagreed with him, and the grid shows why.'
      return '12 is the rarest total of all. Here is why.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>In how many of the 36 equally likely throws of two dice is the total 10?</p>,
    answer: 3,
    praise: 'Amber 4 with sky 6, amber 6 with sky 4, and amber 5 with sky 5. The double 5 happens only one way, so it counts once.',
    hint: v =>
      v === 2
        ? 'You have the results “4 and 6” and “5 and 5”. One of them can happen two ways. Which?'
        : v === 4
          ? 'Amber 5 with sky 5 is a single square, not two: swapping the dice gives the same throw.'
          : 'List the throws as (amber, sky): which pairs add to 10? Remember (4, 6) and (6, 4) are different throws.',
    solution: 'The throws adding to 10 are (4, 6), (5, 5) and (6, 4). That is 3 of the 36. Swapping a double gives the same throw, so (5, 5) counts once.',
  },
  keep: 'Count equally likely cases, not results. Two dice give 36 equally likely throws: 11 is two of them and 12 only one.',
  symbols: <p>probability = (number of cases that give it) / (number of equally likely cases). 11 with two dice: 2/36.</p>,
  story: (
    <>
      <p>
        Leibniz&apos;s slip survives in his papers. He was not alone: getting the cases right is
        the hard part of chance, and very good mathematicians have tripped on it.
      </p>
      <p className="mt-2">
        Galileo got it right decades earlier. Someone had asked him why, with three dice, 10 comes up more often than
        9, when each can be made from six sets of numbers. In a short note written around 1620 he counted all 216
        throws of three dice and found 10 in 27 of them and 9 in only 25.
      </p>
    </>
  ),
  deeper: {
    question: <p>Galileo&apos;s puzzle: in how many of the 216 throws of three dice is the total 10?</p>,
    answer: 27,
    praise: 'Galileo’s count: 27. The sets 1, 3, 6 and 1, 4, 5 and 2, 3, 5 each happen 6 ways; 2, 2, 6 and 2, 4, 4 and 3, 3, 4 each happen 3 ways.',
    hint: () => 'The sets of three numbers adding to 10 are 1-3-6, 1-4-5, 2-2-6, 2-3-5, 2-4-4 and 3-3-4. Three different numbers can be ordered 6 ways; a set with a repeat only 3 ways.',
    solution: 'Three different numbers: 1-3-6, 1-4-5, 2-3-5, each in 6 orders: 18. A repeat: 2-2-6, 2-4-4, 3-3-4, each in 3 orders: 9. Total 27.',
  },
}
