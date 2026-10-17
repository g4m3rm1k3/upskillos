import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const POT = 64

// Amber's fair share at a score, for a game won by the first to `target` rounds.
function share(a, s, target, pot = POT) {
  if (a === target) return pot
  if (s === target) return 0
  return (share(a + 1, s, target, pot) + share(a, s + 1, target, pot)) / 2
}

// Every score the game can reach, as [amber, sky]. Nobody reaches the target together.
const scores = target =>
  Array.from({ length: (target + 1) ** 2 }, (_, i) => [Math.floor(i / (target + 1)), i % (target + 1)]).filter(
    ([a, s]) => !(a === target && s === target),
  )

const done = ([a, s], target) => a === target || s === target
const key = ([a, s]) => `${a}-${s}`

// The game as a tree: each score splits into "Amber wins the round" (down left) and "Sky wins" (down right).
function Tree({ target, known, onTap, focus }) {
  const W = 64
  const H = 62
  const depth = 2 * target - 1
  const width = (depth + 1) * W
  const at = ([a, s]) => [width / 2 + (s - a) * (W / 2), 34 + (a + s) * H]
  const live = scores(target)
  return (
    <svg viewBox={`0 0 ${width} ${34 + depth * H + 34}`} style={{ width, maxWidth: '100%' }} role="img" aria-label={`Every score in a game to ${target}`}>
      {live
        .filter(n => !done(n, target))
        .flatMap(([a, s]) => [
          [[a, s], [a + 1, s], AMBER],
          [[a, s], [a, s + 1], SKY],
        ])
        .map(([p, q, colour]) => {
          const [x1, y1] = at(p)
          const [x2, y2] = at(q)
          return <line key={`${key(p)}>${key(q)}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colour} strokeOpacity="0.5" strokeWidth="3" />
        })}
      {live.map(n => {
        const [x, y] = at(n)
        const isKnown = known.includes(key(n))
        const end = done(n, target)
        return (
          <g key={key(n)} aria-label={`score ${n[0]} to ${n[1]}`} role="button" onClick={() => onTap?.(n)} style={{ cursor: onTap ? 'pointer' : 'default' }}>
            <rect
              x={x - 27}
              y={y - 22}
              width="54"
              height="44"
              rx="10"
              fill={focus === key(n) ? '#78350f' : end ? '#0f172a' : '#1e293b'}
              stroke={isKnown ? AMBER : '#475569'}
              strokeWidth="2"
            />
            <text x={x} y={y - 6} textAnchor="middle" fontSize="12" fill="#cbd5e1">
              {n[0]} to {n[1]}
            </text>
            <text x={x} y={y + 13} textAnchor="middle" fontSize="15" fontWeight="700" fill={isKnown ? AMBER : '#64748b'}>
              {isKnown ? share(n[0], n[1], target) : '?'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const endKeys = target =>
  Array.from({ length: target }, (_, k) => [key([target, k]), key([k, target])]).flat()

function Play({ state, setState }) {
  const target = 2
  const [note, setNote] = useState(null)
  const tap = n => {
    if (state.known.includes(key(n))) return
    const win = key([n[0] + 1, n[1]])
    const lose = key([n[0], n[1] + 1])
    if (!state.known.includes(win) || !state.known.includes(lose)) {
      setNote({ ok: false, text: `Not yet: from ${n[0]} to ${n[1]} the game goes to ${n[0] + 1} to ${n[1]} or ${n[0]} to ${n[1] + 1}. Work those out first.` })
      return
    }
    const hi = share(n[0] + 1, n[1], target)
    const lo = share(n[0], n[1] + 1, target)
    setNote({ ok: true, text: `At ${n[0]} to ${n[1]}, Amber is sure of ${lo}. The other ${hi - lo} rides on one fair toss, so it splits in half: ${lo} + ${(hi - lo) / 2} = ${share(n[0], n[1], target)}.` })
    setState({ known: [...state.known, key(n)] })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Start smaller: a game won by the first to <strong>2</strong> rounds, with 64 coins in the pot. The finished
        games are filled in: Amber gets all 64 or nothing. Tap a score to work out Amber&apos;s fair share there. Amber
        winning the round goes down to the left, Sky winning goes down to the right.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Tree target={target} known={state.known} onTap={tap} />
      </div>
      {note && (
        <p className={`mt-2 text-lg ${note.ok ? 'text-emerald-400' : 'text-rose-300'}`} data-testid="tree-note">
          {note.text}
        </p>
      )}
    </div>
  )
}

function Reveal() {
  const target = 3
  const ends = endKeys(target)
  const [step, setStep] = useState(0)
  // Fill in whole rows of the tree, from the bottom up.
  const rows = [4, 3, 2, 1, 0]
  const known = [
    ...ends,
    ...rows.slice(0, step).flatMap(d =>
      Array.from({ length: d + 1 }, (_, a) => [a, d - a]).filter(([a, s]) => a < target && s < target).map(key),
    ),
  ]
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        This is how Blaise Pascal split the stakes in the game to 3. He started where the answer is obvious and
        worked backwards. At 2 to 2 the next round decides everything, and either player is as likely to win it: 32
        each.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <Tree target={target} known={known} focus={step >= 2 ? '2-1' : null} />
      </div>
      {step < rows.length && (
        <button type="button" onClick={() => setStep(step + 1)} className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Work back one round
        </button>
      )}
      {step >= 2 && (
        <p className="mt-3 text-lg" data-testid="pascal-21">
          2 to 1 becomes 3 to 1 (64) or 2 to 2 (32): halfway is <strong className="text-amber-300">48</strong>, the same as
          Fermat&apos;s count of endings.
        </p>
      )}
      {step === rows.length && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Every score is worth exactly halfway between the two scores it can turn into, because both are equally
            likely. Halfway is the average of 2.8: add the two and halve. So once the last round is known, the round
            before it is known, and the one before that, all the way back to the start.
          </p>
          <p>
            1 to 0 is halfway between 56 and 32: <strong className="text-amber-300">44</strong>. Fermat needed 16 endings
            to get that. Pascal needed two halvings.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-working-back-from-a-draw',
  order: '5.3',
  episodeNumber: 5,
  episode: 'Chance and fair play',
  title: 'Working back from a draw',
  threads: ['Chance', 'Structure'],
  rigor: 2,
  move: 'work-backwards',
  hook: (
    <p>
      Fermat&apos;s way of splitting the stakes lists every ending, and the list doubles with every extra round. A game
      to 10 stopped at 1 to 0 could last 18 more rounds: eighteen 2s multiplied together, 262,144 endings. Pascal found a way that
      needs no list at all.
    </p>
  ),
  initialState: { known: endKeys(2) },
  Play,
  playReady: state => state.known.includes('0-0'),
  playNotReady: 'Work back to the start of the game, 0 to 0',
  predict: {
    question: <p>Back to the game to 3, with 64 coins. It stops at Amber 1, Sky 0. How many coins should Amber get?</p>,
    response: guess => {
      if (guess === 44) return 'Yes, 44. Watch Pascal get there, a round at a time.'
      if (guess === 48) return '48 is the share at 2 to 1, where Amber needs just one more win. At 1 to 0 she still needs two.'
      if (guess === 32) return 'Amber is a round ahead, so she deserves more than half. How much more? Work back from the end.'
      return `Not ${guess}. Work back from the end of the game and it comes out exactly.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        A game to 3 again, but with <strong>80</strong> coins in the pot. It stops at Amber 2, Sky 0. Work back from
        2 to 2. How many coins should Amber get?
      </p>
    ),
    answer: 70,
    praise: '2 to 2 is 40. 2 to 1 is halfway between 80 and 40: 60. 2 to 0 is halfway between 80 and 60: 70.',
    hint: v =>
      v === 60
        ? '60 is the share at 2 to 1. Go back one more round: 2 to 0 becomes 3 to 0 or 2 to 1.'
        : v === 56
          ? 'That is the answer for a pot of 64. This pot holds 80: start again from 2 to 2.'
          : 'At 2 to 2 each gets half of 80. Then 2 to 1 is halfway between 80 and that. Then 2 to 0.',
    solution: 'At 2 to 2 the pot splits 40 and 40. At 2 to 1, Amber goes to 80 or to 40: halfway is 60. At 2 to 0, Amber goes to 80 or to 60: halfway is 70.',
  },
  keep: 'A score is worth halfway between the two scores it can turn into. Start from the end, where the answer is obvious, and work backwards.',
  symbols: <p>share(score) = (share if Amber wins the next round + share if Sky wins it) ÷ 2</p>,
  story: (
    <>
      <p>
        Pascal set out this method in his letter to Fermat of 29 July 1654, with exactly these numbers: two players
        stake 32 pistoles each, in a game to 3. At 2 to 1 the leader should take 48, at 2 to 0 he should take 56,
        and at 1 to 0, 44.
      </p>
      <p className="mt-2">
        Fermat&apos;s listing and Pascal&apos;s working back always agree. Pascal was delighted: &quot;I see that the
        truth is the same in Toulouse and in Paris.&quot;
      </p>
    </>
  ),
  deeper: {
    question: <p>A game to 4 with 64 coins, stopped at Amber 2, Sky 1. How many coins should Amber get?</p>,
    answer: 44,
    praise: 'Amber needs 2 more wins and Sky needs 3, exactly as at 1 to 0 in the game to 3. Only the wins still needed matter, so the share is the same: 44.',
    hint: () => 'How many more wins does each player need? Have you met a score where they needed the same?',
    solution: 'In a game to 4 at 2 to 1, Amber needs 2 more wins and Sky 3. That is the same race as 1 to 0 in a game to 3, so the share is the same, 44.',
  },
}
