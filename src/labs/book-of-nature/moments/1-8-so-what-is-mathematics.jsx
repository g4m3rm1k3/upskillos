import React, { useState } from 'react'
import { ANGLES, EVEN_SIX, centroid, chords, cross, pieces, points } from '../circle'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'

const PIECES = Object.fromEntries([2, 3, 4, 5, 6].map(n => [n, pieces(ANGLES[n])]))
const path = poly => `M${poly.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L')}Z`

// Points on a circle with the chords joining them. Pieces can be tapped, tinted or left plain.
function Circle({ angles, drawn, hot, regions, marked = [], onPiece, tint, label }) {
  const pts = points(angles)
  const all = chords(angles.length)
  const shown = drawn === undefined ? all : all.slice(0, drawn)
  return (
    <svg viewBox="0 0 260 260" className="w-full" style={{ maxWidth: 300 }} role="img" aria-label={label}>
      <circle cx="130" cy="130" r="120" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
      {regions?.map((poly, i) => {
        const on = marked.includes(i)
        const tap = onPiece && {
          role: 'button',
          tabIndex: 0,
          'aria-label': `piece ${i + 1}`,
          onClick: () => onPiece(i),
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPiece(i)
            }
          },
          style: { cursor: 'pointer' },
        }
        const fill = tint ? `hsl(${(i * 47) % 360} 70% 60% / 0.4)` : on ? 'rgba(251, 191, 36, 0.3)' : 'rgba(0, 0, 0, 0)'
        return <path key={i} d={path(poly)} fill={fill} {...tap} />
      })}
      {shown.map(([a, b], i) => (
        <line
          key={`${a}-${b}`}
          x1={pts[a][0]}
          y1={pts[a][1]}
          x2={pts[b][0]}
          y2={pts[b][1]}
          stroke={i === hot ? AMBER : '#cbd5e1'}
          strokeWidth={i === hot ? 3.5 : 1.5}
          pointerEvents="none"
        />
      ))}
      {marked.map(i => {
        const [x, y] = centroid(regions[i])
        return <circle key={`m${i}`} cx={x} cy={y} r="6" fill={AMBER} pointerEvents="none" />
      })}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill={SKY} stroke="#0f172a" strokeWidth="2" pointerEvents="none" />
      ))}
    </svg>
  )
}

const SIZES = [2, 3, 4, 5]
const complete = (state, n) => (state.marks[n] || []).length === PIECES[n].length

function Play({ state, setState }) {
  const { n, marks } = state
  const marked = marks[n] || []
  const toggle = i =>
    setState({ ...state, marks: { ...marks, [n]: marked.includes(i) ? marked.filter(j => j !== i) : [...marked, i] } })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Put some points on a circle and join every pair with a straight line. A straight line across a circle is
        called a <strong>chord</strong>. The chords cut the circle into pieces.
        Tap each piece to drop a pebble in it, and count the pieces for 2, 3, 4 and 5 points.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Number of points">
        {SIZES.map(k => (
          <button
            key={k}
            type="button"
            aria-label={`${k} points`}
            onClick={() => setState({ ...state, n: k })}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === n ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {k} points{complete(state, k) ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Circle angles={ANGLES[n]} regions={PIECES[n]} marked={marked} onPiece={toggle} label={`${n} points joined by chords`} />
        </div>
        <div className="text-lg">
          <p>
            Pebbles: <strong className="text-amber-300">{marked.length}</strong>
          </p>
          {complete(state, n) && <p className="mt-1 text-emerald-400">Every piece has a pebble.</p>}
          <table className="mt-4 font-mono">
            <tbody>
              {SIZES.filter(k => complete(state, k)).map(k => (
                <tr key={k} data-testid="pieces-row">
                  <td className="pr-3">{k} points</td>
                  <td className="font-bold text-amber-300">{PIECES[k].length} pieces</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const SIX = chords(6)
const added = SIX.map((c, i) => 1 + SIX.slice(0, i).filter(d => cross(c, d)).length)

function Reveal() {
  const [k, setK] = useState(0)
  const total = 1 + added.slice(0, k).reduce((s, v) => s + v, 0)
  const done = k === SIX.length
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Start with the whole circle: 1 piece. Now draw the 6-point chords one at a time. Each new chord slices through
        some pieces, and every piece it passes through becomes two. Watch how many it crosses.
      </p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="rounded-lg bg-slate-950 p-3">
          <Circle angles={ANGLES[6]} drawn={k} hot={done ? -1 : k - 1} regions={done ? PIECES[6] : null} tint={done} label="6 points, chords drawn one at a time" />
        </div>
        <div className="min-w-[14rem] flex-1 text-lg">
          <p className="text-2xl">
            Pieces: <strong className="text-amber-300" data-testid="pieces-total">{total}</strong>
          </p>
          {k > 0 && !done && (
            <p className="mt-2 text-slate-300" data-testid="chord-step">
              Chord {k} crosses {added[k - 1] - 1} earlier {added[k - 1] === 2 ? 'chord' : 'chords'}, so it passes
              through {added[k - 1]} {added[k - 1] === 1 ? 'piece' : 'pieces'}: +{added[k - 1]}
            </p>
          )}
          {!done && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setK(k + 1)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
                Draw the next chord
              </button>
              <button type="button" onClick={() => setK(SIX.length)} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
                Draw them all
              </button>
            </div>
          )}
        </div>
      </div>
      {done && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            <strong className="text-amber-300">31, not 32.</strong> Each chord adds 1 piece, plus 1 more for every
            chord it crosses. So the count is 1 to start, plus 1 for each of the 15 chords (they are the handshakes
            between 6 points), plus 1 for each of the 15 crossings: 1 + 15 + 15 = 31.
          </p>
          <p className="text-slate-300">
            Check 5 points the same way: 1 + 10 chords + 5 crossings = 16. The doubling was never the reason. It was a
            coincidence, and it ran out.
          </p>
          <p>
            So what is mathematics? It starts with seeing a pattern, but a pattern can fool you for as long as it
            likes. Odd numbers make squares, the handshakes stack into a triangle, odd + odd is even, the broken board
            is short of dark squares: each of those came with a reason, a picture that shows it must be so.{' '}
            <strong className="text-amber-300">Mathematics is patterns that must hold, and the reasons why.</strong>
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-so-what-is-mathematics',
  order: '1.8',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'So what is mathematics?',
  threads: ['Structure', 'Shape'],
  rigor: 2,
  move: 'small-case',
  hook: (
    <p>
      You've found a lot of patterns in this episode, and every one of them held. So here's a question: if a pattern
      works every time you try it, is that enough? Here is a pattern to test.
    </p>
  ),
  initialState: { n: 2, marks: {} },
  Play,
  playReady: state => SIZES.every(k => complete(state, k)),
  playNotReady: 'Count the pieces for 2, 3, 4 and 5 points',
  predict: {
    question: <p>2 points: 2 pieces. 3 points: 4. 4 points: 8. 5 points: 16. How many pieces with 6 points?</p>,
    response: guess => {
      if (guess === 32)
        return '32 is what the doubling says: 2, 4, 8, 16, 32. Every case so far fitted. The circle says otherwise.'
      if (guess === 31) return '31. Either you know this puzzle or you stopped trusting the doubling. Now you can see the reason.'
      return 'The doubling pattern says 32. The circle says 31, and the chords show why.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Now 7 points on a circle, still placed so no three chords meet at one point. The chords cross each other at
        35 points. How many pieces?
      </p>
    ),
    answer: 57,
    praise: '21 chords (the handshakes between 7 points), so 1 + 21 + 35 = 57. The doubling would have said 64.',
    hint: v =>
      v === 64
        ? 'That is the doubling again. Use the reason instead: 1 to start, plus 1 for every chord, plus 1 for every crossing.'
        : v === 56
          ? "Don't forget the piece you start with: the whole circle."
          : 'Add up three things: 1 to start, 1 for each chord, 1 for each crossing. The chords are the handshakes between 7 points.',
    solution:
      'The chords join every pair of points, like handshakes between 7 people: 0 + 1 + 2 + 3 + 4 + 5 + 6 = 21 chords. Then 1 piece to start, plus 21 for the chords, plus 35 for the crossings: 57 pieces.',
  },
  keep: 'A pattern that fits every case you have tried can still break. A reason is what makes it certain. Mathematics is patterns that must hold, and the reasons why.',
  symbols: (
    <p>
      pieces = 1 + chords + crossings, as long as no three chords meet at one point. Don't memorise it: draw the
      chords one at a time and watch each one cut pieces in two.
    </p>
  ),
  story: (
    <>
      <p>
        The circle puzzle is known as Moser's circle problem, after the mathematician Leo Moser. It is a favourite
        warning because the doubling looks so convincing.
      </p>
      <p className="mt-2">
        Great mathematicians have been fooled the same way. Pierre de Fermat noticed that 3, 5, 17, 257 and 65,537
        can't be laid out as a rectangle of pebbles, except as a single row. In 1640 he wrote that he believed every
        number in his list would behave the same way. In 1732 Leonhard Euler showed that the next one, 4,294,967,297,
        is 641 rows of 6,700,417.
      </p>
      <p className="mt-2">
        In 1988 the mathematician Richard Guy collected dozens of patterns like these in a paper called &quot;The
        Strong Law of Small Numbers&quot;. His law: &quot;There aren't enough small numbers to meet the many demands
        made of them.&quot;
      </p>
    </>
  ),
  deeper: {
    question: (
      <div>
        <p>
          Space 6 points evenly around the circle, and the three longest chords all meet at the centre. How many
          pieces now?
        </p>
        <div className="mt-3 rounded-lg bg-slate-950 p-3">
          <Circle angles={EVEN_SIX} label="6 evenly spaced points joined by chords" />
        </div>
      </div>
    ),
    answer: 30,
    praise: 'One fewer than 31, because three chords share one crossing point.',
    hint: () =>
      'Draw the chords one at a time in your head. When the third long chord reaches the centre, the other two already cross there. Normally it would cross them at two different points. How many does it cross them at now?',
    solution:
      'With uneven spacing, the third long chord crosses the other two at two different points. With even spacing it crosses both at the same point, the centre, so it passes through one fewer piece and cuts one fewer in two. Every other chord behaves as before: 31 − 1 = 30.',
  },
}
