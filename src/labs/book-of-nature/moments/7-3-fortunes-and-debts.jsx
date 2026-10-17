import React, { useState } from 'react'

const AMBER = '#fbbf24'
const ROSE = '#fb7185'
const MAX = 9

const worth = n => (n > 0 ? `a fortune of ${n}` : n < 0 ? `a debt of ${-n}` : 'nothing')

// Fortunes on the top row, debts underneath, so each fortune with a debt below it shows as a pair worth 0.
function Purse({ f, d }) {
  const S = 34
  const cols = Math.max(f, d, 1)
  const pairs = Math.min(f, d)
  return (
    <svg viewBox={`0 0 ${cols * S + 4} ${2 * S + 4}`} style={{ width: cols * S + 4, maxWidth: '100%' }} role="img" aria-label={`${f} fortunes and ${d} debts`}>
      {Array.from({ length: pairs }, (_, i) => (
        <rect key={`p${i}`} x={2 + i * S + 3} y="1" width={S - 6} height={2 * S + 2} rx="6" fill="none" stroke="#64748b" strokeDasharray="3 3" />
      ))}
      {Array.from({ length: f }, (_, i) => (
        <circle key={`f${i}`} cx={2 + i * S + S / 2} cy={2 + S / 2} r={S * 0.34} fill={AMBER} />
      ))}
      {Array.from({ length: d }, (_, i) => (
        <circle key={`d${i}`} cx={2 + i * S + S / 2} cy={2 + S * 1.5} r={S * 0.34} fill={ROSE} />
      ))}
    </svg>
  )
}

const Button = ({ onClick, disabled, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
    {children}
  </button>
)

function Play({ state, setState }) {
  const { f, d } = state
  const set = change => setState({ ...state, ...change })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        A purse holds fortunes (amber, a coin you own) and debts (rose, a coin you owe). Add and take away coins
        and watch what the purse is worth. Try adding a pair, a fortune and a debt together. Then take away a debt.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => set({ f: f + 1 })} disabled={f >= MAX}>Add a fortune</Button>
        <Button onClick={() => set({ d: d + 1 })} disabled={d >= MAX}>Add a debt</Button>
        <Button onClick={() => set({ f: f + 1, d: d + 1, paired: true })} disabled={f >= MAX || d >= MAX}>Add a pair</Button>
        <Button onClick={() => set({ f: f - 1 })} disabled={f === 0}>Take away a fortune</Button>
        <Button onClick={() => set({ d: d - 1, tookDebt: true })} disabled={d === 0}>Take away a debt</Button>
      </div>
      <div className="mt-3 rounded-lg bg-slate-950 p-4">
        <Purse f={f} d={d} />
      </div>
      <p className="mt-2 text-lg" data-testid="purse-worth">
        {f} fortunes and {d} debts: the purse is worth <strong className="text-amber-300">{worth(f - d)}</strong>.
      </p>
    </div>
  )
}

const STEPS = [
  { f: 2, d: 0, say: 'The purse holds 2 fortunes and no debts. There is no debt to take away.' },
  { f: 5, d: 3, say: 'Add 3 pairs. Each pair is worth nothing, so the purse is still worth a fortune of 2.' },
  { f: 5, d: 0, say: 'Now take away the 3 debts. A fortune of 5 is left.' },
]

function Reveal() {
  const [step, setStep] = useState(0)
  const { f, d, say } = STEPS[step]
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Purse f={f} d={d} />
        <p className="mt-2 text-lg" data-testid="reveal-step">{say}</p>
      </div>
      {step < 2 && (
        <button type="button" onClick={() => setStep(step + 1)} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          {step === 0 ? 'Add 3 pairs' : 'Take away 3 debts'}
        </button>
      )}
      {step === 2 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            A fortune and a debt cancel, so you can always add pairs without changing the worth. That lets you take
            away a debt you don&apos;t have, and taking it away leaves its fortune behind. Taking away a debt of 3 is
            the same as adding a fortune of 3.
          </p>
          <p>
            Write a debt with a minus sign: a debt of 3 is <strong>−3</strong>. Numbers below zero like this are
            called <strong>negative numbers</strong>. What you just did is 2 − (−3) = 5.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-fortunes-and-debts',
  order: '7.3',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'Fortunes and debts',
  threads: ['Number'],
  rigor: 2,
  move: 'pair-off',
  hook: (
    <p>
      Brahmagupta didn&apos;t stop at zero. Below zero, he said, are debts: owe 3 coins and you have less than nothing.
      Can you calculate with what you owe?
    </p>
  ),
  initialState: { f: 3, d: 1, paired: false, tookDebt: false },
  Play,
  playReady: state => state.paired && state.tookDebt,
  playNotReady: 'Add a pair, and take away a debt',
  predict: {
    question: <p>A purse holds 2 fortunes and no debts. Somehow, a debt of 3 is taken away. What is the purse worth now?</p>,
    choices: ["It can't be done", 'A debt of 1', 'A fortune of 5'],
    response: guess => {
      if (guess === 'A fortune of 5') return 'Yes, a fortune of 5. Taking away what you owe leaves you richer.'
      if (guess === 'A debt of 1') return 'A debt of 1 is what taking away a fortune of 3 would leave. Taking away a debt does the opposite.'
      return 'It looks impossible with no debts in the purse. But pairs are worth nothing, and you can add as many as you like.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>A purse is worth −2: a debt of 2. A debt of 5 is taken away: −2 − (−5). What is the purse worth now?</p>,
    answer: 3,
    praise: 'Add 3 pairs so there are 5 debts to take away. Taking them away leaves 3 fortunes: −2 − (−5) = 3.',
    hint: v =>
      v === -7
        ? 'A debt of 7 is what adding the debt would give. This debt is being taken away.'
        : v === 7
          ? 'Count the coins: the purse starts with 2 debts. Taking away 5 debts takes those 2, and 3 more that need pairs.'
          : v === -3
            ? 'Taking away a debt makes the purse richer, not poorer. Start at a debt of 2 and remove 5 debts.'
            : 'Start with 2 debts. To take away 5 debts, add pairs until there are 5. What is left?',
    solution: 'The purse has 2 debts. To take away 5 debts it needs 3 more, so add 3 pairs (worth nothing): now 3 fortunes and 5 debts. Take away the 5 debts and 3 fortunes are left: −2 − (−5) = 3.',
  },
  keep: 'A fortune and a debt cancel, so adding the pair changes nothing. That is how you take away a debt you don’t have: taking away a debt is the same as adding a fortune.',
  symbols: <p>−3 + 3 = 0 · 2 − (−3) = 2 + 3 = 5</p>,
  story: (
    <>
      <p>
        Brahmagupta gave rules for fortunes and debts in the same book as his rules for zero (628). One of them: when a
        debt is to be taken from a fortune, add them. Centuries before, Chinese counting boards already used red rods
        for gains and black rods for losses, in <em>The Nine Chapters on the Mathematical Art</em>.
      </p>
      <p className="mt-2">
        Europe was slower. As late as 1544 the German Michael Stifel called negative numbers <em>absurd</em>, and many
        mathematicians refused them until the 1600s.
      </p>
    </>
  ),
}
