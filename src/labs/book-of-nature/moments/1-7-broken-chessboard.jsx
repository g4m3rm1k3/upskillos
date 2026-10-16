import React, { useState } from 'react'

const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const PLAIN = '#64748b'
const DARK = '#7c2d12'
const LIGHT = '#fed7aa'

const key = (r, c) => `${r},${c}`
const parse = k => k.split(',').map(Number)
const isDark = k => {
  const [r, c] = parse(k)
  return (r + c) % 2 === 0
}
const squares = (n, cut) => {
  const out = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!cut.includes(key(r, c))) out.push(key(r, c))
  return out
}
const sideBySide = (a, b) => {
  const [ar, ac] = parse(a)
  const [br, bc] = parse(b)
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1
}
const colours = list => ({ dark: list.filter(isDark).length, light: list.filter(k => !isDark(k)).length })

// How many squares are left if no more dominoes fit, or 0 if one still fits somewhere.
function stuckLeft(n, cut, dominoes) {
  const covered = new Set(dominoes.flat())
  const open = squares(n, cut).filter(k => !covered.has(k))
  const fits = open.some(a => open.some(b => sideBySide(a, b)))
  return open.length > 0 && !fits ? open.length : 0
}

function Board({ n, cut, dominoes = [], painted, selected, onSquare, unit = 44, label }) {
  return (
    <svg viewBox={`0 0 ${n * unit} ${n * unit}`} className="w-full" style={{ maxWidth: n * unit }} role="img" aria-label={label}>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n)
        const c = i % n
        const k = key(r, c)
        if (cut.includes(k))
          return <rect key={k} x={c * unit + 2} y={r * unit + 2} width={unit - 4} height={unit - 4} fill="none" stroke="#475569" strokeDasharray="4 4" />
        const tap = onSquare && {
          role: 'button',
          tabIndex: 0,
          'aria-label': `row ${r + 1}, column ${c + 1}`,
          onClick: () => onSquare(k),
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSquare(k)
            }
          },
          style: { cursor: 'pointer' },
        }
        return (
          <rect
            key={k}
            x={c * unit}
            y={r * unit}
            width={unit}
            height={unit}
            fill={painted ? (isDark(k) ? DARK : LIGHT) : PLAIN}
            stroke={selected === k ? AMBER : '#0f172a'}
            strokeWidth={selected === k ? 4 : 1}
            style={{ transition: 'fill 600ms' }}
            {...tap}
          />
        )
      })}
      {dominoes.map(([a, b]) => {
        const [ar, ac] = parse(a)
        const [br, bc] = parse(b)
        const inset = unit * 0.12
        return (
          <rect
            key={`${a}-${b}`}
            x={Math.min(ac, bc) * unit + inset}
            y={Math.min(ar, br) * unit + inset}
            width={(ac === bc ? 1 : 2) * unit - 2 * inset}
            height={(ar === br ? 1 : 2) * unit - 2 * inset}
            rx={unit * 0.18}
            fill={SKY}
            fillOpacity={painted ? 0.45 : 0.85}
            stroke={SKY}
            strokeWidth="2"
            pointerEvents="none"
          />
        )
      })}
    </svg>
  )
}

const N = 4
const CUT = [key(0, 0), key(3, 3)]

function Play({ state, setState }) {
  const { dominoes, selected, note, attempts } = state
  const left = stuckLeft(N, CUT, dominoes)

  const pick = k => {
    const holder = dominoes.find(d => d.includes(k))
    if (holder) return setState({ ...state, dominoes: dominoes.filter(d => d !== holder), selected: null, note: '' })
    if (selected === null) return setState({ ...state, selected: k, note: '' })
    if (selected === k) return setState({ ...state, selected: null })
    if (sideBySide(selected, k)) return setState({ ...state, dominoes: [...dominoes, [selected, k]], selected: null, note: '' })
    setState({ ...state, selected: k, note: 'A domino covers two squares that share a side. Tap a square next to the highlighted one.' })
  }

  const startAgain = () => setState({ dominoes: [], selected: null, note: '', attempts: attempts + (left ? 1 : 0) })

  return (
    <div>
      <p className="mb-3 text-slate-300">
        The full board is too big to try by hand, so start small: a 4 × 4 board with two opposite corners cut off.
        That leaves 14 squares, enough for exactly 7 dominoes. Tap two squares that share a side to lay a domino.
        Tap a domino to pick it up again.
      </p>
      <div className="rounded-lg bg-slate-950 p-4">
        <Board n={N} cut={CUT} dominoes={dominoes} selected={selected} onSquare={pick} unit={56} label="A 4 by 4 board with two opposite corners cut off" />
      </div>
      <p className="mt-3 text-lg">
        Dominoes laid: <strong className="text-amber-300" data-testid="domino-count">{dominoes.length}</strong> of 7
      </p>
      {note && <p className="mt-2 text-rose-300">{note}</p>}
      {left > 0 && (
        <p className="mt-2 text-rose-300" data-testid="stuck">
          Stuck. {left} squares are left, and no two of them share a side.
        </p>
      )}
      <button type="button" onClick={startAgain} className="mt-3 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
        Start again
      </button>
      {attempts > 0 && <p className="mt-2 text-sm text-slate-400">Tries that got stuck: {attempts + (left ? 1 : 0)}</p>}
    </div>
  )
}

function Reveal({ state }) {
  const [painted, setPainted] = useState(false)
  const [big, setBig] = useState(false)
  const small = colours(squares(N, CUT))
  const covered = new Set(state.dominoes.flat())
  const open = colours(squares(N, CUT).filter(k => !covered.has(k)))
  const BIG_CUT = [key(0, 0), key(7, 7)]
  const full = colours(squares(8, BIG_CUT))
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">Here is your board, just as you left it. Now paint it like a chessboard.</p>
      <div className="rounded-lg bg-slate-950 p-4">
        <Board n={N} cut={CUT} dominoes={state.dominoes} painted={painted} unit={56} label="Your 4 by 4 board" />
      </div>
      {!painted && (
        <button type="button" onClick={() => setPainted(true)} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Paint it like a chessboard
        </button>
      )}
      {painted && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="small-count">
            {small.dark} dark squares, {small.light} light squares. Both cut corners were dark.
          </p>
          <p>
            Look at any domino you laid. It covers one dark square and one light square. It has to: two squares that
            share a side are always different colours. So whatever you do, your dominoes cover exactly as many dark
            squares as light ones. That never changes, however you place them.
          </p>
          {state.dominoes.length > 0 && (
            <p className="text-slate-300">
              On your board, the squares still uncovered: {open.dark} dark, {open.light} light.
            </p>
          )}
          <p>
            7 dominoes would need 7 dark squares and 7 light ones. The board has only {small.dark} dark squares. No
            arrangement can work, and it was never your fault.
          </p>
          {!big && (
            <button type="button" onClick={() => setBig(true)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
              Now the full chessboard
            </button>
          )}
        </div>
      )}
      {big && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <div className="rounded-lg bg-slate-950 p-4">
            <Board n={8} cut={BIG_CUT} painted unit={32} label="An 8 by 8 chessboard with two opposite corners cut off" />
          </div>
          <p data-testid="big-count">
            {full.dark} dark squares, {full.light} light squares.
          </p>
          <p>
            31 dominoes would need 31 dark squares. There are only {full.dark}. You know the answer without trying a
            single arrangement, and there are far too many arrangements to try them all.
          </p>
        </div>
      )}
    </div>
  )
}

const TRY_CUT = [key(0, 0), key(7, 7), key(0, 6), key(6, 0)]

export default {
  id: 'bon-broken-chessboard',
  order: '1.7',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'The broken chessboard',
  threads: ['Structure', 'Shape'],
  rigor: 2,
  move: 'invariant',
  hook: (
    <p>
      Take a chessboard, 8 squares by 8, and saw off two opposite corners. You have a pile of dominoes, each exactly
      the size of two squares. Can you lay them flat so they cover the whole board, with no overlaps and nothing
      hanging off the edge?
    </p>
  ),
  initialState: { dominoes: [], selected: null, note: '', attempts: 0 },
  Play,
  playReady: state => state.attempts + (stuckLeft(N, CUT, state.dominoes) ? 1 : 0) >= 2,
  playNotReady: 'Try to cover the board at least twice',
  predict: {
    question: (
      <p>
        Back to the full chessboard. With two opposite corners gone, 62 squares are left: enough for exactly 31
        dominoes. Is there some clever way to lay them that covers it?
      </p>
    ),
    choices: ['Yes: 62 squares, 31 dominoes', 'No, never', "Can't know without trying every way"],
    response: guess => {
      if (guess === 'No, never')
        return 'No, never. And now you can say why without trying a single arrangement: there are 2 more light squares than dark ones, and every domino needs one of each.'
      if (guess === 'Yes: 62 squares, 31 dominoes')
        return 'The number of squares is right, which is why the puzzle fools people. But the squares have to be the right colours too, and two light squares are always left over.'
      return 'There are far too many ways to try them all. You don’t need to: one thing stays the same however the dominoes go, and that settles it.'
    },
  },
  Reveal,
  tryIt: {
    question: (
      <div>
        <p>
          Four dark squares are cut out of this chessboard, leaving 60. Lay dominoes as cleverly as you like. What is
          the fewest squares you could leave uncovered?
        </p>
        <div className="mt-3 rounded-lg bg-slate-950 p-3">
          <Board n={8} cut={TRY_CUT} painted unit={26} label="A chessboard with four dark squares cut out" />
        </div>
      </div>
    ),
    answer: 4,
    praise: '28 dark squares and 32 light ones. Each domino needs one dark square, so 28 dominoes at most, and 4 light squares are always left.',
    hint: v =>
      v === 0
        ? '60 is even, so the size isn’t the problem. Count the colours: every domino needs one dark square and one light one.'
        : v === 2
          ? 'Two were left on the cut-corner board because two dark squares were missing. How many dark squares are missing here?'
          : 'Each domino covers one dark square. How many dark squares are left? That is the most dominoes you can lay.',
    solution:
      'The full board has 32 dark and 32 light squares. With four dark ones cut out, 28 dark and 32 light are left. Every domino covers one dark square, so at most 28 dominoes fit, covering 56 squares. At least 4 light squares are always left uncovered, and 28 dominoes really do fit, so 4 is the answer.',
  },
  keep: "Every domino covers one dark and one light square, so the count of each colour covered always stays equal. Look for what doesn't change, and you can rule out every arrangement without trying one.",
  symbols: (
    <p>
      Something that stays the same whatever moves you make is called an <strong>invariant</strong>. Here it is: dark
      squares covered − light squares covered = 0, after every domino.
    </p>
  ),
  story: (
    <>
      <p>
        The philosopher Max Black set this puzzle in his 1946 book <em>Critical Thinking</em>, and Martin Gardner
        spread it far and wide through his puzzle column in <em>Scientific American</em>.
      </p>
      <p className="mt-2">
        In 1964 John McCarthy, who had coined the term &quot;artificial intelligence&quot;, called it a &quot;tough
        nut&quot; for computer proof programs. A program that tries arrangements one by one faces an enormous number
        of them. A person who thinks of the colours needs one line.
      </p>
      <p className="mt-2">
        The mathematician Ralph Gomory later showed the other side: cut out any one dark square and any one light
        square, anywhere on the board, and the dominoes can always cover what is left.
      </p>
    </>
  ),
  deeper: {
    question: (
      <p>
        A 7 × 7 board has 49 squares, with dark corners. You cover all but one square with 24 dominoes. How many of
        the 49 squares could be the one left over?
      </p>
    ),
    answer: 25,
    praise: 'Only dark squares can be left over, and it turns out every one of the 25 dark squares works.',
    hint: v =>
      v === 49
        ? 'Could the leftover square be light? Count dark and light squares, and remember what the 24 dominoes cover.'
        : 'Count the dark and light squares on a 7 × 7 board. The 24 dominoes cover 24 of each colour. What colour is the leftover?',
    solution:
      'A 7 × 7 board with dark corners has 25 dark squares and 24 light ones. The 24 dominoes cover 24 dark and 24 light squares, so the leftover must be dark. Any of the 25 dark squares can be the one left over (you can check a few by hand), so the answer is 25.',
  },
}
