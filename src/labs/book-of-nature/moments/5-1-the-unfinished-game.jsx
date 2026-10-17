import React, { useState } from 'react'
import { random } from '../chance'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const TARGET = 3

// Play one game on from 2 to 1 until someone has 3 wins. Each round is a coin toss.
function playOut(i) {
  const next = random(1300 + i)
  let [a, s] = [2, 1]
  const rounds = []
  while (a < TARGET && s < TARGET) {
    const amber = next() < 0.5
    rounds.push(amber ? 'A' : 'S')
    if (amber) a++
    else s++
  }
  return { rounds, amber: a === TARGET }
}

function Chip({ who, faded }) {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-slate-950"
      style={{ background: who === 'A' ? AMBER : SKY, opacity: faded ? 0.35 : 1 }}
    >
      {who}
    </span>
  )
}

function Tally({ games }) {
  const amber = games.filter(g => g.amber).length
  return (
    <div>
      <div className="flex h-6 overflow-hidden rounded-full bg-slate-800">
        <div style={{ width: `${(100 * amber) / games.length}%`, background: AMBER }} />
        <div style={{ width: `${(100 * (games.length - amber)) / games.length}%`, background: SKY }} />
      </div>
      <p className="mt-2 text-lg" data-testid="tally">
        Amber won {amber} of {games.length} games. Sky won {games.length - amber}.
      </p>
    </div>
  )
}

function Play({ state, setState }) {
  const games = Array.from({ length: state.played }, (_, i) => playOut(i))
  const more = n => setState({ played: state.played + n })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Each round is won by tossing a fair coin: heads, Amber wins the round; tails, Sky does. Play the game on from
        2 to 1 and see who takes the pot. Then do it again, many times.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => more(1)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Play it out
        </button>
        <button type="button" onClick={() => more(10)} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Play it out 10 times
        </button>
      </div>
      {games.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-950 p-4">
          <ul className="mb-3 space-y-1">
            {games.slice(-5).map((g, k) => (
              <li key={games.length - 5 + k} className="flex items-center gap-2" data-testid="game">
                <span className="shrink-0 whitespace-nowrap text-slate-400">2 to 1, then</span>
                {g.rounds.map((r, j) => (
                  <Chip key={j} who={r} />
                ))}
                <span className="ml-2 font-semibold" style={{ color: g.amber ? AMBER : SKY }}>
                  {g.amber ? 'Amber' : 'Sky'} wins 3
                </span>
              </li>
            ))}
          </ul>
          <Tally games={games} />
        </div>
      )}
    </div>
  )
}

const ENDINGS = [
  ['A', 'A'],
  ['A', 'S'],
  ['S', 'A'],
  ['S', 'S'],
]

function Reveal({ state }) {
  const [shown, setShown] = useState(0)
  const games = Array.from({ length: state.played }, (_, i) => playOut(i))
  const amberGames = games.filter(g => g.amber).length
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Pierre de Fermat had a trick. The game is over in at most two more rounds, so pretend two more rounds are
        always played, even when the first one settles it. Two coin tosses can come out four ways.
      </p>
      <ul className="space-y-2 rounded-lg bg-slate-950 p-4">
        {ENDINGS.slice(0, shown).map((e, k) => {
          const amberWins = e[0] === 'A' || e[1] === 'A'
          return (
            <li key={k} className="flex items-center gap-2" data-testid="ending">
              <span className="shrink-0 whitespace-nowrap text-slate-400">2 to 1, then</span>
              <Chip who={e[0]} />
              <Chip who={e[1]} faded={e[0] === 'A'} />
              <span className="ml-2 font-semibold" style={{ color: amberWins ? AMBER : SKY }}>
                {amberWins ? 'Amber' : 'Sky'} wins
                {e[0] === 'A' && <span className="font-normal text-slate-400"> (the second toss changes nothing)</span>}
              </span>
            </li>
          )
        })}
        {shown < 4 && (
          <li>
            <button type="button" onClick={() => setShown(shown + 1)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
              Show the next ending
            </button>
          </li>
        )}
      </ul>
      {shown === 4 && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            A fair coin is as likely to land heads as tails, so all four endings are{' '}
            <strong>equally likely</strong>. Amber wins in 3 of them and Sky in 1. Amber has 3 <strong>chances</strong>{' '}
            in 4.
          </p>
          <p>
            So the fair split gives Amber 3 of every 4 coins: 64 shared into 4 is 16, and Amber takes three 16s,{' '}
            <strong className="text-amber-300">48 coins</strong>. Sky takes 16.
          </p>
          {games.length > 0 && (
            <p className="text-slate-300" data-testid="compare">
              Your games: Amber won {amberGames} of {games.length}. Exactly 3 of every 4 would be about{' '}
              {Math.round((3 * games.length) / 4)}. Chance wobbles, but over more and more games, Amber&apos;s wins
              settle closer to 3 in every 4.
            </p>
          )}
          <p className="text-slate-300">
            Splitting by points won, 2 to 1, would give Amber twice Sky&apos;s share. That counts the past. A fair split
            counts the future: what could still happen, and how often it goes each way.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-unfinished-game',
  order: '5.1',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'The unfinished game',
  threads: ['Chance'],
  rigor: 2,
  move: 'simplify',
  hook: (
    <p>
      Amber and Sky each put 32 coins in a pot: 64 in all. They play rounds, and the first to win 3 rounds takes the
      whole pot. The score is Amber 2, Sky 1, when the game has to stop. How should they split the 64 coins fairly?
    </p>
  ),
  initialState: { played: 0 },
  Play,
  playReady: state => state.played >= 20,
  playNotReady: 'Play at least 20 games',
  predict: {
    question: <p>How many of the 64 coins should Amber get?</p>,
    response: guess => {
      if (guess === 48) return 'Yes, 48. Here is why it has to be 48 exactly.'
      if (guess === 42 || guess === 43)
        return 'That splits by points won, 2 to 1. Luca Pacioli printed that rule in 1494, and it is wrong: it counts the past, not what could still happen.'
      if (guess === 64) return 'Amber hasn’t won yet. Sky could still win two rounds in a row, so Sky deserves something.'
      if (guess === 32) return 'An even split ignores that Amber is ahead: Sky needs two wins in a row, Amber only one.'
      return `Not ${guess}. Your games showed Amber winning about 3 of every 4. Watch Fermat count it exactly.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Same game, first to 3, but this time it stops at Amber 2, Sky 0. How many of the 64 coins should Amber get?
      </p>
    ),
    answer: 56,
    praise: 'Sky needs 3 wins, so play 3 more rounds: 8 endings, and Sky wins only in one of them, three tails. Amber has 7 chances in 8: seven 8s is 56.',
    hint: v =>
      v === 48
        ? 'Two more rounds isn’t enough here: Sky needs 3 wins. How many rounds could the game still last?'
        : v === 64
          ? 'Sky could still win, by winning three rounds in a row.'
          : 'The game could last 3 more rounds. List all the ways 3 tosses can come out (there are 8). In how many does Amber win?',
    solution:
      'Sky needs 3 wins, so pretend 3 more rounds are played. Three tosses come out 8 ways (AAA, AAS, ASA, ASS, SAA, SAS, SSA, SSS), all equally likely. Sky wins only with SSS. Amber wins 7 of 8: 64 shared into 8 is 8, and 7 eights is 56.',
  },
  keep: 'Split the stakes by what could still happen, not by what has: list every equally likely ending, and count how many each player wins.',
  story: (
    <>
      <p>
        This is the &quot;problem of points&quot;. Luca Pacioli printed it in 1494 and split by points won. Tartaglia
        objected in 1556 that this couldn&apos;t be right, but had no better rule.
      </p>
      <p className="mt-2">
        In 1654 Blaise Pascal, in Paris, and Pierre de Fermat, a lawyer in Toulouse, solved it in an exchange of
        letters. The question is said to have reached Pascal from the Chevalier de Méré, a writer and keen gambler. Their letters are
        usually taken as the start of the mathematics of chance. Fermat&apos;s rule of playing out every round, even
        unneeded ones, drew an objection from another mathematician, Roberval. Pascal defended it: the extra rounds
        never change who wins, so they can&apos;t change the split.
      </p>
    </>
  ),
  deeper: {
    question: <p>First to 3 again, stopped at Amber 1, Sky 0. Amber needs 2 more wins, Sky 3, so pretend 4 more rounds. Amber wins in how many of the 16 endings?</p>,
    answer: 11,
    praise: 'Amber wins whenever she takes at least 2 of the 4 rounds: 11 of the 16 endings. Her share is 11 × 4 = 44 coins, the number Pascal gave.',
    hint: () => 'Amber wins if she takes 2, 3 or 4 of the 4 rounds. Count the endings where she takes 0 or 1, and take them from 16.',
    solution: 'Amber takes no rounds in 1 ending (SSSS) and exactly 1 round in 4 endings (ASSS, SASS, SSAS, SSSA). That is 5 endings for Sky, so Amber wins 16 − 5 = 11.',
  },
}
