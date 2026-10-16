import React, { useState } from 'react'

const COLOURS = ['#fbbf24', '#38bdf8', '#34d399', '#fb7185', '#a78bfa', '#fb923c', '#a3e635', '#f472b6', '#2dd4bf', '#818cf8']
const CUTS = [1, 2, 3, 4, 5, 6, 10, 12]
// Shares are worked out in sixtieths of a loaf: every cut above divides 60 exactly.
const WHOLE = 60

const frac = n => (n === 1 ? '1' : `1/${n}`)

// Deal the pieces out, biggest first, each one to whoever has least so far.
function deal(cuts, people) {
  const pieces = cuts.flatMap((n, loaf) => Array.from({ length: n }, (_, i) => ({ loaf, i, n }))).sort((a, b) => a.n - b.n)
  const plates = Array.from({ length: people }, () => ({ pieces: [], total: 0 }))
  const owner = {}
  for (const p of pieces) {
    let who = 0
    plates.forEach((pl, k) => {
      if (pl.total < plates[who].total) who = k
    })
    plates[who].pieces.push(p.n)
    plates[who].total += WHOLE / p.n
    owner[`${p.loaf}-${p.i}`] = who
  }
  const fair = plates.every(pl => pl.total === plates[0].total)
  return { plates, owner, fair }
}

const shareText = pieces => pieces.map(frac).join(' + ') || 'nothing'

function Loaves({ cuts, people, onCut, plates = true }) {
  const { plates: dealt, owner, fair } = deal(cuts, people)
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {cuts.map((n, loaf) => (
          <div key={loaf} className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 100 34" style={{ width: 110 }} role="img" aria-label={`loaf ${loaf + 1} in ${n} pieces`}>
              {Array.from({ length: n }, (_, i) => (
                <rect
                  key={i}
                  x={(i * 100) / n + 0.8}
                  y="2"
                  width={100 / n - 1.6}
                  height="30"
                  rx="5"
                  fill={COLOURS[owner[`${loaf}-${i}`]]}
                  fillOpacity="0.8"
                />
              ))}
            </svg>
            {onCut && (
              <select
                aria-label={`loaf ${loaf + 1} cut`}
                value={n}
                onChange={e => onCut(loaf, Number(e.target.value))}
                className="rounded border border-slate-700 bg-slate-900 px-1 text-sm"
              >
                {CUTS.map(c => (
                  <option key={c} value={c}>
                    {c === 1 ? 'whole' : `${c} pieces`}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      {plates && (
        <ul className="mt-3 space-y-1">
          {dealt.map((pl, k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOURS[k] }} />
              <span className="text-slate-400">Person {k + 1}:</span>
              <span className="font-mono text-slate-100" data-testid="plate">{shareText(pl.pieces)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-2 font-semibold ${fair ? 'text-emerald-400' : 'text-rose-300'}`} data-testid="fairness">
        {fair ? 'Fair: everyone gets the same amount.' : 'Not fair yet: some plates hold more than others.'}
      </p>
    </div>
  )
}

const JOBS = [
  { loaves: 3, people: 4 },
  { loaves: 2, people: 3 },
]

function Play({ state, setState }) {
  const { job, cuts } = state
  const { loaves, people } = JOBS[job]
  const setCut = (loaf, n) => setState({ ...state, cuts: cuts.map((c, j) => (j === job ? c.map((m, i) => (i === loaf ? n : m)) : c)) })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Cut each loaf into equal pieces, and the pieces are dealt out, biggest first. A loaf cut into 4 equal pieces
        gives quarters, written <strong>1/4</strong>: one of 4 equal parts. Numbers like this are called{' '}
        <strong>fractions</strong>. Make both shares fair.
      </p>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Sharing job">
        {JOBS.map((j, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setState({ ...state, job: k })}
            className={`rounded-lg border px-3 py-1 font-semibold ${k === job ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-slate-700 hover:bg-slate-800'}`}
          >
            {j.loaves} loaves, {j.people} people{deal(cuts[k], j.people).fair ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <div className="rounded-lg bg-slate-950 p-4">
        <p className="mb-2 text-slate-400">
          {loaves} loaves for {people} people
        </p>
        <Loaves cuts={cuts[job]} people={people} onCut={setCut} />
      </div>
    </div>
  )
}

const TENTHS = Array(6).fill(10)
const AHMES = [2, 2, 2, 2, 2, 10]

function Reveal() {
  const [cuts, setCuts] = useState(null)
  const pieces = cuts ? cuts.reduce((s, n) => s + n, 0) : 0
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">Here are the 6 loaves and 10 workers. Try two ways to cut them.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCuts(TENTHS)} className="rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Cut every loaf into tenths
        </button>
        <button type="button" onClick={() => setCuts(AHMES)} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          Ahmes&apos;s way
        </button>
      </div>
      {cuts && (
        <div className="mt-4 rounded-lg bg-slate-950 p-4">
          <Loaves cuts={cuts} people={10} plates={false} />
          <p className="mt-2 text-lg" data-testid="share-readout">
            Each worker gets {shareText(deal(cuts, 10).plates[0].pieces)}: {pieces} pieces cut in all.
          </p>
        </div>
      )}
      {cuts && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p>
            Both ways are fair, and both give each worker the same amount: 6 loaves shared by 10 is six tenths of a
            loaf each, written <strong>6/10</strong>. Sharing is what a fraction means: 6/10 is 6 shared into 10.
          </p>
          <p className="text-slate-300">
            Ahmes&apos;s way uses big pieces first. Five loaves cut in half give every worker a half. The one loaf
            left is cut into tenths, one each. The share is 1/2 + 1/10, made of 20 pieces instead of 60, and every
            worker can see they got the same.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-sharing-loaves',
  order: '2.3',
  episodeNumber: 2,
  episode: 'Measuring the land',
  title: 'Sharing loaves',
  threads: ['Number'],
  rigor: 1,
  move: 'match-up',
  hook: (
    <p>
      Egyptian workers were paid in bread and beer. Ten workers have earned 6 loaves between them. Six loaves
      won&apos;t go round ten people whole. How do you share them so that everyone gets exactly the same?
    </p>
  ),
  initialState: { job: 0, cuts: [[1, 1, 1], [1, 1]] },
  Play,
  playReady: state => JOBS.every((j, k) => deal(state.cuts[k], j.people).fair),
  playNotReady: 'Make both shares fair',
  predict: {
    question: (
      <p>
        The scribe Ahmes shared 6 loaves among 10 workers so that each got a half loaf and one smaller piece. The
        smaller piece is 1/? of a loaf.
      </p>
    ),
    response: guess => {
      if (guess === 10) return 'Yes: a half and a tenth. Watch how the loaves get cut.'
      if (guess === 5) return 'A half and a fifth would be too much: 10 halves and 10 fifths need 7 loaves. The piece is 1/10.'
      if (guess === 6) return '1/6 is close, but sixths of a loaf can’t go round 10 workers evenly. The piece is 1/10.'
      return `The piece is 1/10, not 1/${guess}. See how Ahmes cut the loaves.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Share 2 loaves among 3 people the Egyptian way: each gets a half loaf, plus one smaller piece. The smaller
        piece is 1/? of a loaf.
      </p>
    ),
    answer: 6,
    praise: 'Two loaves give four halves. Three people take one each, and the last half is cut in three: each piece is 1/6 of a loaf.',
    hint: v =>
      v === 3
        ? '1/3 of a whole loaf would be too much. After everyone has a half, how much bread is left, and how many people share it?'
        : 'Cut both loaves in half. Give everyone a half. What is left over, and how do you share it among 3?',
    solution:
      'Cut both loaves in half: 4 halves. Each of the 3 people takes one, and 1 half is left. Cut that half into 3 equal pieces. A half cut in 3 is a sixth of a loaf (6 such pieces make a whole loaf), so each share is 1/2 + 1/6.',
  },
  keep: 'A fraction is a fair share: 6 loaves shared by 10 is 6/10 of a loaf each. The Egyptians built every share from pieces like 1/2 and 1/10, biggest first.',
  symbols: <p>1/n is one of n equal parts. 6/10 is six of them: 6 shared into 10.</p>,
  story: (
    <>
      <p>
        The Rhind papyrus opens with exactly this: problems 1 to 6 share 1, 2, 6, 7, 8 and 9 loaves among 10 men.
        For 6 loaves, Ahmes gives each man 1/2 + 1/10.
      </p>
      <p className="mt-2">
        Egyptian scribes wrote shares as sums of different pieces like these: 1/2, 1/3, 1/4 and so on, with one
        special sign for 2/3. A long table at the start of the papyrus lists ready-made answers for sharing 2 loaves
        among any odd number of people up to 101.
      </p>
    </>
  ),
  deeper: {
    question: <p>Share 7 loaves among 10 workers: each gets a half and one smaller piece. The smaller piece is 1/?</p>,
    answer: 5,
    praise: '1/2 + 1/5. Ahmes himself wrote 2/3 + 1/30, using the special sign for 2/3.',
    hint: () => 'Five loaves give everyone a half. Two loaves are left for 10 workers. What does each get?',
    solution: 'Five loaves cut in half give 10 halves, one each. Two loaves are left: cut each into 5 pieces and there are 10 fifths, one each. Each share is 1/2 + 1/5.',
  },
}
