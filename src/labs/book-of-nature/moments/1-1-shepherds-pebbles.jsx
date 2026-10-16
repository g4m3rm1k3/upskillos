import React, { useState } from 'react'

const SHEEP = 9
const PEBBLES = 10 // one sheep did not come home

// Scatter n items over a jittered grid inside [x0, x0 + w] so they are hard to
// count at a glance but never overlap. Seeded, so the picture is always the same.
function scatter(n, x0, seed) {
  let s = seed
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  const cells = []
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cells.push([c, r])
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells.slice(0, n).map(([c, r]) => [x0 + c * 84 + 22 + rand() * 40, 50 + r * 70 + rand() * 30])
}

const SHEEP_AT = scatter(SHEEP, 10, 7)
const PEBBLES_AT = scatter(PEBBLES, 330, 11)

function Play({ state, setState }) {
  const { pairs, sheep, pebble } = state
  const pairedSheep = new Set(pairs.map(p => p[0]))
  const pairedPebbles = new Set(pairs.map(p => p[1]))
  const allPaired = pairedSheep.size === SHEEP

  const pick = (kind, i) => {
    const next = { ...state, [kind]: i }
    if (next.sheep !== null && next.pebble !== null) {
      setState({ pairs: [...pairs, [next.sheep, next.pebble]], sheep: null, pebble: null })
    } else setState(next)
  }
  const keyPick = (kind, i) => e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(kind, i)
    }
  }

  return (
    <div>
      <p className="mb-3 text-slate-300">
        Evening. The sheep that came home are on the left. On the right are the pebbles the shepherd put in a bag
        this morning, one for each sheep that went out. Tap a sheep, then a pebble, to tie them together.
      </p>
      <svg viewBox="0 0 600 340" className="w-full select-none" style={{ maxHeight: 380 }}>
        <text x="140" y="22" textAnchor="middle" fill="#94a3b8" fontSize="15">Sheep that came home</text>
        <text x="460" y="22" textAnchor="middle" fill="#94a3b8" fontSize="15">Pebbles in the bag</text>
        <line x1="300" y1="35" x2="300" y2="330" stroke="#334155" strokeDasharray="4 6" />
        {pairs.map(([s, p]) => (
          <line
            key={`${s}-${p}`}
            x1={SHEEP_AT[s][0]}
            y1={SHEEP_AT[s][1]}
            x2={PEBBLES_AT[p][0]}
            y2={PEBBLES_AT[p][1]}
            stroke="#fbbf24"
            strokeOpacity="0.6"
            strokeWidth="2"
          />
        ))}
        {SHEEP_AT.map(([x, y], i) => {
          const done = pairedSheep.has(i)
          return (
            <g
              key={i}
              role="button"
              tabIndex={done ? -1 : 0}
              aria-label={`sheep ${i + 1}`}
              onClick={() => !done && pick('sheep', i)}
              onKeyDown={done ? undefined : keyPick('sheep', i)}
              style={{ cursor: done ? 'default' : 'pointer', opacity: done ? 0.45 : 1 }}
            >
              <circle cx={x} cy={y} r="24" fill={sheep === i ? '#fbbf2455' : 'transparent'} stroke={sheep === i ? '#fbbf24' : 'none'} />
              <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="central" fontSize="32">🐑</text>
            </g>
          )
        })}
        {PEBBLES_AT.map(([x, y], i) => {
          const done = pairedPebbles.has(i)
          const leftover = allPaired && !done
          return (
            <g
              key={i}
              role="button"
              tabIndex={done || allPaired ? -1 : 0}
              aria-label={`pebble ${i + 1}`}
              onClick={() => !done && !allPaired && pick('pebble', i)}
              onKeyDown={done || allPaired ? undefined : keyPick('pebble', i)}
              style={{ cursor: done || allPaired ? 'default' : 'pointer', opacity: done ? 0.45 : 1 }}
            >
              <ellipse
                cx={x}
                cy={y}
                rx="15"
                ry="11"
                fill={leftover ? '#fb7185' : '#a8a29e'}
                stroke={pebble === i ? '#fbbf24' : leftover ? '#fecdd3' : '#57534e'}
                strokeWidth={pebble === i || leftover ? 3 : 1.5}
              />
            </g>
          )
        })}
      </svg>
      {allPaired ? (
        <p className="mt-3 text-lg font-semibold text-rose-300">
          Every sheep is tied to a pebble, and one pebble is left with no sheep.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setState({ pairs: [], sheep: null, pebble: null })}
          className="mt-3 rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800"
        >
          Untie them all
        </button>
      )}
    </div>
  )
}

const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

function Reveal() {
  const [said, setSaid] = useState(0)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        You knew a sheep was missing without counting anything. Now count the sheep that came home, out loud, and
        watch what you are really doing.
      </p>
      <div className="flex flex-wrap gap-3">
        {WORDS.map((w, i) => (
          <div key={w} className="flex w-14 flex-col items-center">
            <span className="text-3xl">🐑</span>
            <span className={`mt-1 h-6 font-semibold ${i < said ? 'text-amber-300' : 'text-transparent'}`}>{w}</span>
          </div>
        ))}
      </div>
      {said < WORDS.length ? (
        <button
          type="button"
          onClick={() => setSaid(said + 1)}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
        >
          Say the next word
        </button>
      ) : (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Counting <strong className="text-amber-300">is</strong> pairing. You tied each sheep to a word, the same
            way the shepherd tied each sheep to a pebble. The words just come in a fixed order, so the last one you
            need, <em>nine</em>, tells you the size of the whole flock.
          </p>
          <p className="text-slate-300">
            "How many" existed before any number words did. Two groups are the same size exactly when they can be
            paired off with nothing left over. Numbers are names for those sizes.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-shepherds-pebbles',
  order: '1.1',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: "The shepherd's pebbles",
  threads: ['Number', 'Structure'],
  rigor: 0,
  move: 'match-up',
  hook: (
    <p>
      A shepherd has no words for numbers. Every morning the flock goes out to graze, and every evening it comes
      home. How can the shepherd tell whether a sheep has gone missing, without counting?
    </p>
  ),
  initialState: { pairs: [], sheep: null, pebble: null },
  Play,
  playReady: state => state.pairs.length === SHEEP,
  playNotReady: 'Tie every sheep to a pebble first',
  predict: {
    question: (
      <p>
        A different place now. In a cinema every seat has someone in it, and nobody is standing. Without counting
        anyone: are there more people or more seats?
      </p>
    ),
    choices: ['More people', 'More seats', 'The same', "Can't tell without counting"],
    response: guess => {
      if (guess === 'The same')
        return 'Right: the same. Each person is paired with a seat and nothing is left over on either side, just like sheep and pebbles. You knew without a single number.'
      if (guess === "Can't tell without counting")
        return "You can tell, and you just saw why. Each person is paired with one seat, with no empty seats and nobody standing. Nothing left over on either side means the same number, without counting."
      return 'They are the same. Every person has a seat and every seat has a person, so nothing is left over on either side. That pairing is all you need.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        At a dance, 23 couples are dancing, each one a boy and a girl. 4 girls are sitting this one out, and there
        is no one else in the room. How many more girls are there than boys?
      </p>
    ),
    answer: 4,
    praise: 'Every boy is paired with a girl. The girls left over are the difference.',
    hint: () => 'Each couple pairs one boy with one girl. Who is left without a partner?',
    solution:
      'The 23 couples pair every boy with a girl, so the boys are all used up. The 4 girls sitting out are the ones left over, so there are 4 more girls than boys. The 23 never mattered.',
  },
  keep: 'Two groups are the same size exactly when you can pair them off with nothing left over. Counting itself is pairing things with the words one, two, three.',
  story: (
    <>
      <p>
        This is more than a story. At Nuzi, in ancient Mesopotamia, archaeologists found a hollow clay ball from
        around 1500 BC holding small counters. Writing on the outside listed the 48 sheep and goats of a flock in a
        herder's care. Anyone could break it open and check the flock by pairing animals with counters.
      </p>
      <p className="mt-2">
        Thousands of years later, mathematicians made this idea the definition of "the same size". It is how they
        compare infinite collections too, where counting is impossible.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        What is the smallest number of people you need in a room to be <em>certain</em> that two of them were born
        in the same month?
      </p>
    ),
    answer: 13,
    praise: 'Twelve people can all have different months. The thirteenth has no empty month to pair with.',
    hint: () => 'Pair people with months. How many people can you have while every month is used at most once?',
    solution:
      "Twelve people could each have a different month, one person per month. A thirteenth person has no month left to themselves, so two people must share. That's 13.",
  },
}
