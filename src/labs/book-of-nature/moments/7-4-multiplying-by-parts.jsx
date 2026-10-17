import React from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const W = 23
const H = 14
const S = 12

// A W × H rectangle of unit squares. Cuts after the tens leave gaps; `colour` decides each piece's colour.
function Grid({ across, down, colour = () => AMBER, labels }) {
  const gx = c => c * S + (across && c >= 20 ? 6 : 0)
  const gy = r => r * S + (down && r >= 10 ? 6 : 0)
  const pieces = [
    [0, 0, 20, 10],
    [20, 0, 3, 10],
    [0, 10, 20, 4],
    [20, 10, 3, 4],
  ]
  return (
    <svg viewBox={`0 0 ${W * S + 8} ${H * S + 8}`} style={{ width: W * S + 8, maxWidth: '100%' }} role="img" aria-label={`a ${W} by ${H} rectangle`}>
      {Array.from({ length: W * H }, (_, i) => {
        const c = i % W
        const r = Math.floor(i / W)
        return <rect key={i} x={gx(c) + 1} y={gy(r) + 1} width={S - 2} height={S - 2} rx="1.5" fill={colour(c >= 20, r >= 10)} fillOpacity="0.8" />
      })}
      {labels &&
        pieces.map(([x, y, w, h]) => (
          <g key={`${x}${y}`}>
            <rect x={gx(x) + (w * S) / 2 - 17} y={gy(y) + (h * S) / 2 - 11} width="34" height="22" rx="5" fill="#020617" fillOpacity="0.85" />
            <text x={gx(x) + (w * S) / 2} y={gy(y) + (h * S) / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f8fafc">
              {w * h}
            </text>
          </g>
        ))}
    </svg>
  )
}

function Play({ state, setState }) {
  const { across, down } = state
  const sizes = [
    across ? '20 + 3 across' : '23 across',
    down ? '10 + 4 down' : '14 down',
  ]
  return (
    <div>
      <p className="mb-3 text-slate-300">
        23 × 14 is the number of squares in a rectangle 23 across and 14 down (2.1). Counting 23 rows of 14 is slow.
        Cut the rectangle where the tens end, both ways, and look at the pieces.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" disabled={across} onClick={() => setState({ ...state, across: true })} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
          Cut 23 into 20 and 3
        </button>
        <button type="button" disabled={down} onClick={() => setState({ ...state, down: true })} className="rounded-lg bg-slate-700 px-3 py-1 font-semibold hover:bg-slate-600 disabled:opacity-40">
          Cut 14 into 10 and 4
        </button>
      </div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Grid across={across} down={down} />
      </div>
      <p className="mt-2 text-lg" data-testid="cut-sizes">
        {sizes.join(', ')}: {across && down ? 'four pieces' : across || down ? 'two pieces' : 'one piece'}
      </p>
    </div>
  )
}

const piece = (right, bottom) => (right === bottom ? (right ? ROSE : AMBER) : SKY)

function Reveal() {
  return (
    <div>
      <div className="rounded-lg bg-slate-950 p-4">
        <Grid across down colour={piece} labels />
        <p className="mt-2 text-lg" data-testid="pieces-sum">
          <span className="text-amber-300">20 × 10 = 200</span> · <span style={{ color: SKY }}>3 × 10 = 30</span> ·{' '}
          <span style={{ color: SKY }}>20 × 4 = 80</span> · <span className="text-rose-300">3 × 4 = 12</span> · total{' '}
          <strong>322</strong>
        </p>
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Cutting both ways makes <strong>four</strong> pieces, not two. Tens × tens and ones × ones are only the
          corners. The two blue pieces, tens × ones and ones × tens, are just as much part of the rectangle. Multiply
          every part by every part, then add: 200 + 30 + 80 + 12 = 322.
        </p>
        <p className="text-slate-300">
          Every piece is a small product: one digit times another, with zeros for the columns. That is what place value
          buys you. However big the numbers, multiplying them comes down to the times table and adding. With Roman
          numerals, XXIII × XIV has no columns to cut along.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-multiplying-by-parts',
  order: '7.4',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'Multiplying by parts',
  threads: ['Number', 'Shape'],
  rigor: 2,
  move: 'slice-up',
  hook: (
    <p>
      Indian numerals reached Baghdad in the 700s, and from there, centuries later, Europe. What made the new numerals
      win wasn&apos;t how they looked. It was how easily you could calculate with them. How do you multiply 23 by 14
      with only the times table?
    </p>
  ),
  initialState: { across: false, down: false },
  Play,
  playReady: state => state.across && state.down,
  playNotReady: 'Make both cuts',
  predict: {
    question: (
      <p>
        A shortcut: multiply the tens, 20 × 10 = 200, multiply the ones, 3 × 4 = 12, and add them: 212. Is 23 × 14
        really 212?
      </p>
    ),
    choices: ['Yes, 212', 'No, it is more', 'No, it is less'],
    response: guess => {
      if (guess === 'No, it is more') return 'Yes, more: 322. The shortcut leaves two of the four pieces out.'
      if (guess === 'Yes, 212') return 'It looks neat, but 212 counts only two of the four pieces. 23 × 14 is 322.'
      return 'Every piece adds squares; none takes any away. 212 is too small: 23 × 14 is 322.'
    },
  },
  Reveal,
  tryIt: {
    question: <p>Use the four pieces: what is 32 × 21?</p>,
    answer: 672,
    praise: '30 × 20 = 600, 2 × 20 = 40, 30 × 1 = 30 and 2 × 1 = 2: 600 + 40 + 30 + 2 = 672.',
    hint: v =>
      v === 602
        ? 'That is tens × tens and ones × ones only. What about the two other pieces, 2 × 20 and 30 × 1?'
        : v === 632 || v === 642
          ? 'Close. Check that you have all four pieces: 30 × 20, 2 × 20, 30 × 1 and 2 × 1.'
          : 'Cut 32 into 30 and 2, and 21 into 20 and 1. Multiply each part of one by each part of the other.',
    solution: 'The four pieces are 30 × 20 = 600, 2 × 20 = 40, 30 × 1 = 30 and 2 × 1 = 2. Together: 672.',
  },
  keep: 'To multiply, cut each number into its place-value parts and multiply every part by every part: 23 × 14 = 200 + 30 + 80 + 12.',
  symbols: <p>(20 + 3) × (10 + 4) = 20 × 10 + 3 × 10 + 20 × 4 + 3 × 4</p>,
  story: (
    <>
      <p>
        Around 825, al-Khwarizmi, a scholar at the House of Wisdom in Baghdad, wrote a book on calculating with the
        Indian numerals. Its Latin translation helped carry them into Europe, and in 1202 Leonardo of Pisa taught them to
        Italian merchants in his <em>Liber Abaci</em> (2.4).
      </p>
      <p className="mt-2">
        Arabic and later Italian books wrote multiplication on a grid of boxes, one box for each pair of digits. The
        Italians called it <em>gelosia</em>, after the lattice screens in windows. Your four pieces are its four
        boxes.
      </p>
    </>
  ),
}
