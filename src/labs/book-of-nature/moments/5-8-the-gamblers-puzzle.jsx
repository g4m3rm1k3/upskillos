import React, { useState } from 'react'
import { PAIRS } from '../chance'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const EMERALD = '#34d399'
const U = 40

// All 36 throws of a die thrown twice. `paint(a, b)` gives each square its colour.
function Grid({ paint, label }) {
  return (
    <svg viewBox={`0 0 ${7 * U} ${7 * U}`} style={{ width: 7 * U, maxWidth: '100%' }} role="img" aria-label={label}>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <g key={n}>
          <text x={n * U + U / 2} y={U / 2 + 12} textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="700">{n}</text>
          <text x={U / 2} y={n * U + U / 2 + 5} textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="700">{n}</text>
        </g>
      ))}
      <text x={4 * U} y={10} textAnchor="middle" fill="#64748b" fontSize="10">second throw</text>
      <text x={9} y={4 * U} textAnchor="middle" fill="#64748b" fontSize="10" transform={`rotate(-90 9 ${4 * U})`}>first throw</text>
      {PAIRS.map(([a, b]) => (
        <rect key={`${a}-${b}`} x={b * U + 2} y={a * U + 2} width={U - 4} height={U - 4} rx="5" fill={paint(a, b) || '#1e293b'} />
      ))}
      <text x={6 * U + U / 2} y={6 * U + U / 2 + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">6,6</text>
    </svg>
  )
}

const hasSix = (a, b) => a === 6 || b === 6

function Play({ state, setState }) {
  const { first, second } = state
  const counted = (first ? 6 : 0) + (second ? 6 : 0)
  const squares = PAIRS.filter(([a, b]) => (first && a === 6) || (second && b === 6)).length
  const paint = (a, b) => {
    const f = first && a === 6
    const s = second && b === 6
    return f && s ? ROSE : f ? AMBER : s ? SKY : null
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Start with a smaller bet: a six in <strong>two</strong> throws. De Méré&apos;s way says 1 chance in 6 for each
        throw, so 2 chances in 6: that would be 12 of the 36 equally likely pairs of throws. Shade them and see.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setState({ ...state, first: true })} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Shade: first throw is a six
        </button>
        <button type="button" onClick={() => setState({ ...state, second: true })} className="rounded-lg px-4 py-2 font-semibold text-slate-950 hover:opacity-90" style={{ background: SKY }}>
          Shade: second throw is a six
        </button>
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Grid paint={paint} label="Every pair of throws, first throw down the side" />
      </div>
      <p className="mt-2 text-lg" data-testid="six-count">
        Counted as sixes: {counted}. Squares shaded: {squares}.
      </p>
      {first && second && (
        <p className="mt-1 text-rose-300">The double six got shaded twice, once for each throw.</p>
      )}
    </div>
  )
}

function Reveal() {
  const [step, setStep] = useState(0)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Adding chances counts a throw with two sixes twice. The trick is to count the opposite instead: the throws
        with <em>no</em> six. Those are easy, because each throw has 5 ways to miss, and the ways multiply, just as the
        choices for each place did in 5.4.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Grid paint={(a, b) => (step >= 1 && !hasSix(a, b) ? EMERALD : hasSix(a, b) ? AMBER : null)} label="Pairs of throws with and without a six" />
      </div>
      {step >= 1 && (
        <p className="mt-2 text-lg" data-testid="no-six">
          No six: a 5 × 5 square, 25 pairs. So 36 − 25 = 11 have a six.
        </p>
      )}
      {step >= 2 && (
        <div className="mt-3 rounded-lg bg-slate-950 p-4 font-mono text-lg" data-testid="four-throws">
          <p>Four throws: 6 × 6 × 6 × 6 = 1,296 equally likely sets</p>
          <p>No six: 5 × 5 × 5 × 5 = 625</p>
          <p className="text-amber-300">At least one six: 1,296 − 625 = 671</p>
          <p className="text-slate-400">Half of 1,296 is 648.</p>
        </div>
      )}
      {step < 2 && (
        <button type="button" onClick={() => setStep(step + 1)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          {step === 0 ? 'Count the pairs with no six' : 'Now count four throws'}
        </button>
      )}
      {step === 2 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            De Méré wins in 671 of 1,296 cases: just over half. That is why the bet made him money, slowly. But not
            for his reason: his count said 864.
          </p>
          <p>
            You can see his reasoning has to fail. With 6 throws it would say 6 chances in 6: a six for certain. Yet
            anyone can throw a die 6 times without a six. The plausible argument gives the wrong answer, and only
            careful counting gives the right one.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-gamblers-puzzle',
  order: '5.8',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: "The gambler's puzzle",
  threads: ['Chance', 'Number'],
  rigor: 3,
  move: 'small-case',
  hook: (
    <p>
      The Chevalier de Méré liked to bet that he would throw at least one six in four throws of a die. His reasoning:
      one throw has 1 chance in 6 of a six, so four throws have 4 chances in 6. That is more than half, so the bet
      is good. Is his reasoning right?
    </p>
  ),
  initialState: { first: false, second: false },
  Play,
  playReady: state => state.first && state.second,
  playNotReady: 'Shade both kinds of six',
  predict: {
    question: <p>Four throws of a die can come out 6 × 6 × 6 × 6 = 1,296 equally likely ways. In how many is there at least one six?</p>,
    choices: ['864, as de Méré reasoned', 'More than half, but fewer than 864', 'Fewer than half'],
    response: guess => {
      if (guess === 'More than half, but fewer than 864') return 'Yes. Two throws gave 11, not 12, and four throws fall even further short. Here is the exact count.'
      if (guess === 'Fewer than half') return 'It is close to half, but just over. Here is the exact count.'
      return 'That is 4/6 of 1,296. But two throws already gave 11, not 12: adding chances overcounts.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Three throws of a die can come out 6 × 6 × 6 = 216 ways. In how many is there at least one six?</p>,
    answer: 91,
    praise: 'No six: 5 × 5 × 5 = 125. So 216 − 125 = 91 have a six. That is less than half of 216, so a six in three throws is a bad bet.',
    hint: v =>
      v === 108
        ? 'That is de Méré’s reasoning, 3 chances in 6. It counts throws with two or three sixes more than once.'
        : v === 125
          ? '125 counts the throws with no six. The question asks for the rest.'
          : 'Count the opposite: how many of the 216 have no six at all? Each throw has 5 ways to miss.',
    solution: 'Each throw misses the six in 5 ways, so 5 × 5 × 5 = 125 sets of three throws have no six. The other 216 − 125 = 91 have at least one.',
  },
  keep: 'Adding chances overcounts the cases where two things happen at once. Count the opposite instead: no six in four throws is 625 of 1,296, so a six turns up in 671.',
  symbols: <p>chance of at least one = all cases − cases with none</p>,
  story: (
    <>
      <p>
        Pascal described this puzzle in his letter to Fermat of 29 July 1654. De Méré had a second bet: at least one
        double six in 24 throws of two dice. By the same reasoning, 24 chances in 36 is again 4 in 6. But that bet
        loses, just barely, and de Méré could not see why the two were different. Counting the opposite settles it: a
        throw of two dice misses the double six in 35 of its 36 ways, and 35 × 35 × … (24 of them) is a little more
        than half of 36 × 36 × … (24 of them). So no double six is slightly more likely than a double six.
      </p>
      <p className="mt-2">
        Pascal wrote that de Méré &quot;has a very good mind, but he is not a geometer; that, as you know, is a great
        defect.&quot;
      </p>
    </>
  ),
  deeper: {
    question: <p>How many throws of a die do you need before a six is more likely than not?</p>,
    answer: 4,
    praise: 'Three throws give a six in 91 of 216, less than half. Four give 671 of 1,296, more than half. So 4: de Méré picked the smallest number of throws that wins.',
    hint: () => 'You have counted three throws (91 of 216) and four throws (671 of 1,296). Which is the first to pass half?',
    solution: 'Three throws: 91 of 216, and half of 216 is 108, so less than half. Four throws: 671 of 1,296, and half is 648, so more than half. The answer is 4.',
  },
}
