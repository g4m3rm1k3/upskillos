import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const GREEN = '#34d399'
const GREY = '#94a3b8'

// Times of day, and how long a shadow is for each unit of height at that time.
const TIMES = [
  { name: 'Early morning', per: 3 },
  { name: 'Mid-morning', per: 2 },
  { name: 'Late morning', per: 1 },
  { name: 'Near noon', per: 0.5 },
]
const STICK = 2
const TREE = 8
const U = 9

// A thing standing on the ground at x, its shadow, and the sun's ray over its top. Grid units.
function Upright({ x, h, per, colour, label, hidden }) {
  const ground = 10
  return (
    <g>
      <line x1={x * U} y1={(ground - h) * U} x2={(x + h * per) * U} y2={ground * U} stroke={AMBER} strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1={x * U} y1={ground * U} x2={(x + h * per) * U} y2={ground * U} stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
      <line x1={x * U} y1={ground * U} x2={x * U} y2={(ground - h) * U} stroke={colour} strokeWidth={label === 'tree' ? 6 : 3} strokeLinecap="round" />
      <text x={x * U} y={(ground - h) * U - 6} fill={GREY} fontSize="11" textAnchor="middle">
        {hidden ? '?' : `${label} ${h}`}
      </text>
    </g>
  )
}

function Scene({ per, hideTree }) {
  return (
    <svg viewBox={`0 0 ${46 * U} ${11 * U}`} className="w-full" role="img" aria-label="A tree and a stick with their shadows">
      <line x1="0" y1={10 * U} x2={46 * U} y2={10 * U} stroke="#475569" strokeWidth="2" />
      <Upright x={2} h={TREE} per={per} colour={GREEN} label="tree" hidden={hideTree} />
      <Upright x={36} h={STICK} per={per} colour={SKY} label="stick" />
    </svg>
  )
}

function Play({ state, setState }) {
  const { t, seen } = state
  const { per, name } = TIMES[t]
  const set = k => setState({ t: k, seen: seen.includes(k) ? seen : [...seen, k] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Nobody can climb this tree to measure it. But you can measure shadows on the ground, and you have a stick 2
        cubits tall. Watch both shadows through the morning.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Time of day">
        {TIMES.map((tm, k) => (
          <button
            key={tm.name}
            type="button"
            onClick={() => set(k)}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === t ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {tm.name}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-3">
        <Scene per={per} hideTree />
      </div>
      <table className="mt-3 font-mono text-lg">
        <thead>
          <tr className="text-sm text-slate-400">
            <th className="pr-4 text-left">time</th>
            <th className="pr-4 text-left">stick&apos;s shadow</th>
            <th className="text-left">tree&apos;s shadow</th>
          </tr>
        </thead>
        <tbody>
          {seen.map(k => (
            <tr key={k} data-testid="shadow-row" className={k === t ? 'text-amber-200' : ''}>
              <td className="pr-4">{TIMES[k].name}</td>
              <td className="pr-4">{STICK * TIMES[k].per}</td>
              <td>{TREE * TIMES[k].per}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-slate-400">Now: {name}.</p>
    </div>
  )
}

function Reveal() {
  const [grown, setGrown] = useState(false)
  const per = 2
  const k = grown ? TREE / STICK : 1
  // The stick's triangle, drawn at the tree's foot, then blown up 4 times.
  const tri = `0,0 0,${-STICK * U} ${STICK * per * U},0`
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        At mid-morning the stick&apos;s shadow is 4 and the tree&apos;s is 16. Each one, with its shadow and the
        sun&apos;s ray, makes a triangle. Copy the stick&apos;s triangle to the foot of the tree, then blow it up.
      </p>
      <div className="rounded-lg bg-slate-950 p-3">
        <svg viewBox={`0 0 ${46 * U} ${11 * U}`} className="w-full" role="img" aria-label="The stick's triangle blown up over the tree's">
          <line x1="0" y1={10 * U} x2={46 * U} y2={10 * U} stroke="#475569" strokeWidth="2" />
          <Upright x={2} h={TREE} per={per} colour={GREEN} label="tree" />
          <Upright x={36} h={STICK} per={per} colour={SKY} label="stick" />
          <g style={{ transform: `translate(${2 * U}px, ${10 * U}px) scale(${k})`, transition: 'transform 1000ms ease-in-out' }}>
            <polygon points={tri} fill={SKY} fillOpacity="0.3" stroke={SKY} strokeWidth={2 / k} />
          </g>
        </svg>
      </div>
      <button type="button" onClick={() => setGrown(!grown)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
        {grown ? 'Shrink it back' : 'Blow it up 4 times'}
      </button>
      {grown && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="blow-up">
            Blown up 4 times, the stick&apos;s triangle fits the tree&apos;s exactly: its shadow becomes 16 and its
            height becomes 8. The tree is 8 cubits tall.
          </p>
          <p className="text-slate-300">
            The sun&apos;s rays come in at the same slant on everything at the same moment, so every upright thing
            makes a triangle of the same shape. Bigger things just make bigger copies. Whatever the shadow is
            compared with the stick&apos;s, the height is too.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-the-pyramids-shadow',
  order: '3.1',
  episodeNumber: 3,
  episode: 'A stick, a shadow and the size of the Earth',
  title: "The pyramid's shadow",
  threads: ['Shape', 'Measurement'],
  rigor: 1,
  move: 'small-case',
  hook: (
    <p>
      The story goes that Thales, a Greek merchant and thinker, visited Egypt around 600 BC and was asked how tall
      the Great Pyramid was. Nobody could climb it with a measuring rope. He needed nothing but a stick and the sun.
      How?
    </p>
  ),
  initialState: { t: 0, seen: [0] },
  Play,
  playReady: state => state.seen.length >= 3,
  playNotReady: 'Watch the shadows at three times of day',
  predict: {
    question: <p>How tall is the tree?</p>,
    response: guess => {
      if (guess === 8) return 'Yes, 8 cubits. Here is why the shadows can tell you.'
      if (guess === 16) return '16 is the tree’s shadow at mid-morning, not its height. Its height is to its shadow as the stick’s is to the stick’s shadow: the tree is 8.'
      return `It's 8 cubits, not ${guess}. The tree's shadow is always 4 times the stick's.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>A pole 4 cubits tall casts a shadow 6 cubits long. At the same moment, a temple casts a shadow 45 cubits long. How tall is the temple?</p>,
    answer: 30,
    praise: '45 is 7 and a half times 6, so the temple is 7 and a half times 4: 30. Or: every 3 of shadow means 2 of height, and 45 is fifteen 3s, so fifteen 2s: 30.',
    hint: v =>
      v === 43
        ? 'The shadows don’t differ from the heights by a fixed amount. They grow in step: how many times the pole’s shadow is the temple’s?'
        : v === 67
          ? 'That has it upside down: the shadow is longer than the height here, so the temple must be shorter than 45.'
          : 'The temple’s triangle is a blown-up copy of the pole’s. For every 6 of shadow there are 4 of height. How many 6s in 45?',
    solution: 'For every 6 of shadow there are 4 of height, so for every 3 of shadow there are 2 of height. 45 is fifteen 3s, so the temple is fifteen 2s: 30 cubits.',
  },
  keep: 'At any one moment, every upright thing and its shadow make the same-shaped triangle. A stick you can measure is a small copy of a pyramid you can’t.',
  symbols: <p>height of the tall thing ÷ its shadow = height of the stick ÷ its shadow. Forget it? Blow up the stick&apos;s triangle.</p>,
  story: (
    <>
      <p>
        Thales lived around 600 BC, but no writing of his survives. The pyramid story comes from writers centuries
        later. Diogenes Laertius, around AD 250, quotes an earlier author: Thales measured the pyramids by their
        shadows, &quot;at the hour when our shadow is the same length as ourselves&quot;. Plutarch, around AD 100,
        tells a version with a stick set at the tip of the shadow, as you did here.
      </p>
      <p className="mt-2">
        Whether Thales really did it, nobody can say. The method works either way, and people used it to measure
        trees, towers and cliffs for the next two thousand years.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        The catch with a pyramid: its shadow starts at its centre, hidden inside it. The Great Pyramid&apos;s base
        is 230 metres wide. At the moment when a stick&apos;s shadow is as long as the stick, the pyramid&apos;s
        shadow sticks out 31 metres beyond the base. How tall is the pyramid?
      </p>
    ),
    answer: 146,
    praise: 'Half the base, 115, plus 31 is 146: the shadow measured from the centre. The real pyramid was about 146 metres tall when it was built.',
    hint: () => 'The height is under the centre of the pyramid. How far is the centre from the edge of the base?',
    solution: 'The pyramid’s top is above the centre of its base, 230 ÷ 2 = 115 in from the edge. So its whole shadow, from the centre, is 115 + 31 = 146. At this moment shadows equal heights, so the pyramid is 146 tall.',
  },
}
