import React, { useState } from 'react'
import { Stepper } from '../parts'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const U = 18

// A square of side s with two strips 5 × s on its right and below: "a square and ten roots".
// The 5 × 5 corner is dashed, or filled when `corner` is set.
function Shape({ s, corner }) {
  const W = (s + 5) * U + 4
  const cells = (x0, y0, w, h, fill) =>
    Array.from({ length: w * h }, (_, i) => (
      <rect key={`${x0},${y0},${i}`} x={2 + (x0 + (i % w)) * U + 1} y={2 + (y0 + Math.floor(i / w)) * U + 1} width={U - 2} height={U - 2} rx="2" fill={fill} fillOpacity="0.85" />
    ))
  return (
    <svg viewBox={`0 0 ${W} ${W}`} style={{ width: W, maxWidth: '100%' }} role="img" aria-label={`a square of side ${s} and ten roots`}>
      {cells(0, 0, s, s, AMBER)}
      {cells(s, 0, 5, s, SKY)}
      {cells(0, s, s, 5, SKY)}
      {corner ? cells(s, s, 5, 5, ROSE) : <rect x={2 + s * U} y={2 + s * U} width={5 * U} height={5 * U} fill="none" stroke="#64748b" strokeDasharray="4 4" />}
    </svg>
  )
}

const make = s => s * s + 10 * s

function Play({ state, setState }) {
  const { s, tried } = state
  const set = v => setState({ s: v, tried: tried.includes(v) ? tried : [...tried, v] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        The <em>root</em> is the side of the square. Ten roots are two strips, each 5 wide and a root long. Change the
        root until the square and the two strips make 39 small squares.
      </p>
      <Stepper label="root" value={s} min={1} max={6} onChange={set} />
      <div className="mt-3 rounded-lg bg-slate-950 p-4">
        <Shape s={s} />
        <p className="mt-2 text-lg" data-testid="shape-total">
          <span className="text-amber-300">{s} × {s} = {s * s}</span> and <span style={{ color: SKY }}>ten roots, 10 × {s} = {10 * s}</span>: together{' '}
          <strong className={make(s) === 39 ? 'text-emerald-400' : ''}>{make(s)}</strong>
        </p>
      </div>
    </div>
  )
}

function Reveal() {
  const [filled, setFilled] = useState(false)
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Al-Khwarizmi didn&apos;t search. He looked at the empty corner. The square and the two strips are an L shape,
        and the corner that would finish it is 5 by 5.
      </p>
      <div className="rounded-lg bg-slate-950 p-4">
        <Shape s={3} corner={filled} />
        {filled && (
          <p className="mt-2 text-lg" data-testid="completed">
            39 + <span className="text-rose-300">25</span> = 64 = 8 × 8. The big square&apos;s side is 8, so the root is 8 − 5 = 3.
          </p>
        )}
      </div>
      {!filled && (
        <button type="button" onClick={() => setFilled(true)} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Fill the corner
        </button>
      )}
      {filled && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Filling the corner <strong>completes the square</strong>: any square and ten roots, plus 25, is a whole
            square whose side is the root + 5. For 144: 144 + 25 = 169 = 13 × 13, so the root is 13 − 5 = 8.
          </p>
          <p>
            The side of a square of area 64 is called the <strong>square root</strong> of 64, written √64 = 8.
          </p>
          <p className="text-slate-300">
            Al-Khwarizmi gave the method as a recipe in words: halve the number of roots, multiply the half by itself,
            add it to the number, take the square root, and take away the half. Steps that always work, followed one by
            one, are now called an <strong>algorithm</strong>, after his name.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-completing-the-square',
  order: '7.6',
  episodeNumber: 7,
  episode: 'Zero, place value and the balance',
  title: 'Completing the square',
  threads: ['Number', 'Shape'],
  rigor: 2,
  move: 'draw-picture',
  hook: (
    <p>
      Al-Khwarizmi&apos;s most famous problem: &quot;A square and ten of its roots make thirty-nine. What is the
      root?&quot; Restoring and balancing can&apos;t solve it, because the square and the roots won&apos;t cancel each
      other. He solved it with a picture.
    </p>
  ),
  initialState: { s: 1, tried: [1] },
  Play,
  playReady: state => state.s === 3 && state.tried.length >= 3,
  playNotReady: 'Find the root that makes 39',
  predict: {
    question: <p>Now: a square and ten roots make 144. What is the root?</p>,
    response: guess => {
      if (guess === 8) return 'Yes, 8: 64 + 80 = 144. Here is how to get it without searching.'
      if (guess === 12) return '12 × 12 is 144 on its own, with no room for the ten roots. The root is smaller: 8.'
      if (guess === 7) return 'Check it: 49 + 70 = 119, short of 144. The root is 8.'
      if (guess === 9) return 'Check it: 81 + 90 = 171, too much. The root is 8.'
      return `Not ${guess}. Check it: ${guess} × ${guess} + 10 × ${guess} = ${make(guess)}. The root is 8.`
    },
  },
  Reveal,
  tryIt: {
    question: <p>A square and six roots make 40. What is the root? (Six roots make two strips, each 3 wide.)</p>,
    answer: 4,
    praise: 'The corner is 3 × 3 = 9. 40 + 9 = 49 = 7 × 7, so the root is 7 − 3 = 4. Check: 16 + 24 = 40.',
    hint: v =>
      v === 7
        ? '7 is the side of the completed square. The root is shorter by the width of a strip.'
        : v === 2
          ? 'Check it: 4 + 12 = 16, not 40. The strips are 3 wide, so the corner is 3 × 3.'
          : 'The strips are 3 wide, so the missing corner is 3 × 3 = 9. Add it to 40 and find the side of the square you get.',
    solution: 'Halve the 6 roots: 3. The corner is 3 × 3 = 9. 40 + 9 = 49, which is 7 × 7. The side 7 is the root plus 3, so the root is 4.',
  },
  keep: 'A square and some roots is a square with a corner missing. Fill in the corner and it is a whole square, whose side you can find: that is completing the square.',
  symbols: <p>root × root + 10 × root = 39 → (root + 5) × (root + 5) = 64 → root + 5 = √64 = 8</p>,
  story: (
    <>
      <p>
        This is al-Khwarizmi&apos;s own example, and he drew this picture to show why his recipe works. He also gave
        a second picture, with four strips 2 1/2 wide and four small corners. Both complete a square.
      </p>
      <p className="mt-2">
        His book on Indian numerals (7.4) reached Europe in Latin as <em>Algoritmi de numero Indorum</em>, &quot;al-Khwarizmi
        on the Indian numbers&quot;. His name, turned into <em>algorism</em> and then <em>algorithm</em>, came to mean a
        way of calculating by fixed steps.
      </p>
    </>
  ),
}
