import React, { useState } from 'react'
import { die, random } from '../chance'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const PRICE = 8
const FACES = [1, 2, 3, 4, 5, 6]
const prize = face => 2 * face

// The winnings of the first n games, always the same for the same n.
function winnings(n) {
  const next = random(57)
  return Array.from({ length: n }, () => prize(die(next)))
}

function Play({ state, setState }) {
  const won = winnings(state.played).reduce((s, w) => s + w, 0)
  const paid = PRICE * state.played
  const diff = won - paid
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Each go costs 8 coins. Throw the die and win double what it shows. Play many goes and keep an eye on your
        coins.
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {FACES.map(f => (
          <span key={f} className="rounded-lg bg-slate-800 px-2 py-1">
            throw {f}: win {prize(f)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setState({ played: state.played + 10 })} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Play 10 goes
        </button>
        <button type="button" onClick={() => setState({ played: state.played + 50 })} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Play 50 goes
        </button>
      </div>
      {state.played > 0 && (
        <div className="mt-4 rounded-lg bg-slate-950 p-4 text-lg" data-testid="purse">
          <p>
            {state.played} goes: paid {paid} coins, won {won} coins.
          </p>
          <p className="font-semibold" style={{ color: diff >= 0 ? '#34d399' : ROSE }}>
            {diff === 0 ? 'You are exactly even.' : diff > 0 ? `You are ${diff} coins up.` : `You are ${-diff} coins down.`}
          </p>
          <p className="text-slate-400">You win about {Math.round(won / state.played)} coins a go.</p>
        </div>
      )}
    </div>
  )
}

function Reveal() {
  const [level, setLevel] = useState(false)
  const W = 52
  const S = 11
  const fair = FACES.reduce((s, f) => s + prize(f), 0) / FACES.length
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Christiaan Huygens&apos;s idea: the six faces are equally likely, so imagine six goes, one landing on each face.
        Those six goes win 2 + 4 + 6 + 8 + 10 + 12 = 42 coins. Now share the winnings out evenly over the six goes.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox={`0 0 ${6 * W} ${14 * S + 30}`} className="w-full max-w-sm" role="img" aria-label="The winnings of six goes">
          {FACES.map((f, i) => {
            const h = (level ? fair : prize(f)) * S
            return (
              <g key={f}>
                <rect x={i * W + 6} y={14 * S - h} width={W - 12} height={h} rx="4" fill={level ? SKY : AMBER} style={{ transition: 'all 0.6s' }} />
                <text x={i * W + W / 2} y={14 * S + 18} textAnchor="middle" fill="#cbd5e1" fontSize="12">throw {f}</text>
                <text x={i * W + W / 2} y={14 * S - h + 16} textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="700">{level ? fair : prize(f)}</text>
              </g>
            )
          })}
          <line x1="0" x2={6 * W} y1={14 * S - PRICE * S} y2={14 * S - PRICE * S} stroke={ROSE} strokeDasharray="5 4" strokeWidth="2" />
          <text x={6 * W - 4} y={14 * S - PRICE * S - 6} textAnchor="end" fill={ROSE} fontSize="12">price 8</text>
        </svg>
      </div>
      {!level && (
        <button type="button" onClick={() => setLevel(true)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Level the winnings
        </button>
      )}
      {level && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="fair-price">
            Levelled out, 42 coins over 6 goes is <strong className="text-amber-300">7 coins a go</strong>. Levelling
            doesn&apos;t change the total, so 7 is what a go pays out on average. That is its fair price.
          </p>
          <p>
            The stall charges 8, so every go costs you 1 coin on average. One go might win 12. But over 100 goes you
            should expect to be about 100 coins down, as your play showed. A small edge, repeated, is how every
            casino pays its rent.
          </p>
          <p className="text-slate-300">
            This is the same idea as Pascal&apos;s halving in 5.3: two equally likely futures worth 64 and 32 make a
            position worth their average, 48.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-what-is-a-bet-worth',
  order: '5.7',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'What is a bet worth?',
  threads: ['Chance', 'Measurement'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      A stall at a fair: pay 8 coins, throw a die, and win double what it shows. A 6 wins 12 coins! A 1 wins only 2.
      Is 8 coins a fair price to play?
    </p>
  ),
  initialState: { played: 0 },
  Play,
  playReady: state => state.played >= 100,
  playNotReady: 'Play at least 100 goes',
  predict: {
    question: <p>What price per go would be fair, so that in the long run neither you nor the stall comes out ahead?</p>,
    response: guess => {
      if (guess === 7) return 'Yes, 7. Here is how to know it exactly without playing at all.'
      if (guess === 12) return '12 is the best a go can do, and it comes up only one time in six. Most goes win less.'
      if (guess === 6) return '6 is the middle prize on the list, but the prizes go up to 12. Level them all out.'
      if (guess === 8) return 'Your coins went down at 8 a go, so 8 is too much. Look at what a go wins on average.'
      return `Not ${guess}. Imagine one go for each face of the die, and share out what they win.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>A new stall: throw a 6 and win 18 coins, a 5 wins 6 coins, anything else wins nothing. What is a fair price for one go?</p>,
    answer: 4,
    praise: 'Six goes, one per face, win 18 + 6 = 24 coins. Shared over 6 goes: 4 coins a go.',
    hint: v =>
      v === 24
        ? '24 is what all six goes win together. What is that per go?'
        : v === 12
          ? 'That shares the prizes over two goes, but four of the six faces win nothing. Share over all six.'
          : v === 18
            ? '18 is the top prize, and only one face wins it.'
            : 'Imagine six goes, one landing on each face. What do they win in all? Share it over the six.',
    solution: 'One go per face: a 6 wins 18, a 5 wins 6, and 1, 2, 3, 4 win nothing. Total 24 over 6 goes is 4 a go.',
  },
  keep: 'A bet is worth what it pays on average: add up what it pays in each equally likely case, and share the total over the cases.',
  symbols: <p>fair price = (total won over all the equally likely cases) ÷ (number of cases). Today this is called the expected value.</p>,
  story: (
    <>
      <p>
        Christiaan Huygens, a young Dutch scientist, was in Paris in 1655 and heard about the problems Pascal and
        Fermat had solved, without meeting either of them. Back home he worked the ideas out for himself and wrote a
        short book, <em>On Reasoning in Games of Chance</em>, printed in 1657: the first printed book on the
        mathematics of chance. (Gerolamo Cardano had written one in the 1500s, but it wasn&apos;t printed until 1663.)
      </p>
      <p className="mt-2">
        It starts from one principle: having equal chances of getting a or b is worth (a + b) ÷ 2. The Latin
        translation called this value <em>expectatio</em>, and the name &quot;expected value&quot; comes from it.
      </p>
    </>
  ),
  deeper: {
    question: <p>A raffle sells 50 tickets, and one ticket wins 150 coins. What is one ticket worth?</p>,
    answer: 3,
    praise: 'Imagine buying all 50 tickets: you would win 150. Shared over 50 tickets, each is worth 3 coins.',
    hint: () => 'Each ticket is equally likely to win. If you held all 50, what would you win?',
    solution: 'All 50 tickets together win exactly 150 coins. Shared over the 50 equally likely tickets, that is 3 coins each.',
  },
}
