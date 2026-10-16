import React from 'react'

const MARKS = 37

// A single tally mark. Jumbled marks get a little tilt so the pile looks hand-cut.
function Mark({ tilt = 0, tall = 28 }) {
  return (
    <span
      className="inline-block w-[3px] rounded bg-amber-200"
      style={{ height: tall, transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    />
  )
}

function Jumble({ n }) {
  return (
    <div className="flex flex-wrap items-end gap-[7px]">
      {Array.from({ length: n }, (_, i) => (
        <Mark key={i} tilt={((i * 37) % 13) - 6} tall={22 + ((i * 17) % 11)} />
      ))}
    </div>
  )
}

function Bundled({ n, size }) {
  const bundles = Math.floor(n / size)
  const loose = n % size
  return (
    <div className="flex flex-wrap items-end gap-3">
      {Array.from({ length: bundles }, (_, b) => (
        <div key={b} className="flex gap-[4px] rounded-md border border-amber-500/70 bg-amber-500/10 px-2 py-1">
          {Array.from({ length: size }, (_, i) => <Mark key={i} />)}
        </div>
      ))}
      {loose > 0 && (
        <div className="flex gap-[4px] px-2 py-1">
          {Array.from({ length: loose }, (_, i) => <Mark key={i} />)}
        </div>
      )}
    </div>
  )
}

const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10]

function Play({ state, setState }) {
  const { size, tried } = state
  const choose = s => setState({ size: s, tried: tried.includes(s) || s === null ? tried : [...tried, s] })
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Here are {MARKS} marks cut into a bone. Tie them into bundles of the same size and see what you can read.
      </p>
      <div className="min-h-[96px] rounded-lg bg-slate-950 p-4">
        {size ? <Bundled n={MARKS} size={size} /> : <Jumble n={MARKS} />}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Bundle size">
        <span className="text-slate-400">Bundles of</span>
        {SIZES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => choose(s)}
            className={`w-10 rounded-lg border px-2 py-1 font-semibold ${
              size === s ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'
            }`}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose(null)}
          className="rounded-lg border border-slate-700 px-3 py-1 hover:bg-slate-800"
        >
          Untie
        </button>
      </div>
      {size && (
        <p className="mt-3 text-lg" data-testid="bundle-readout">
          <strong className="text-amber-300">{Math.floor(MARKS / size)}</strong> bundles of {size}, and{' '}
          <strong className="text-amber-300">{MARKS % size}</strong> loose.
        </p>
      )}
    </div>
  )
}

// Place-value picture: big bundles (a square of bundles), bundles (a bar), loose marks.
const BASES = { 10: 'ten', 5: 'five', 2: 'two' }

function Cell({ px }) {
  return <span className="inline-block rounded-[1px] bg-amber-300" style={{ width: px, height: px }} />
}

function BigBundle({ base, px }) {
  return (
    <div className="grid gap-[1px] rounded border border-amber-500/70 p-[2px]" style={{ gridTemplateColumns: `repeat(${base}, ${px}px)` }}>
      {Array.from({ length: base * base }, (_, i) => <Cell key={i} px={px} />)}
    </div>
  )
}

function Bar({ base, px }) {
  return (
    <div className="flex flex-col gap-[1px] rounded border border-sky-500/70 p-[2px]">
      {Array.from({ length: base }, (_, i) => <Cell key={i} px={px} />)}
    </div>
  )
}

function Column({ label, digit, children }) {
  return (
    <div className="flex min-w-[90px] flex-col items-center gap-2">
      <div className="flex min-h-[60px] flex-wrap items-end justify-center gap-1">{children}</div>
      <span className="text-4xl font-bold text-amber-300">{digit}</span>
      <span className="text-center text-xs text-slate-400">{label}</span>
    </div>
  )
}

function Reveal({ state, setState }) {
  const base = state.base ?? 10
  const max = base * base * base - 1
  const n = Math.min(state.n ?? 246, max)
  const big = Math.floor(n / (base * base))
  const mid = Math.floor(n / base) % base
  const ones = n % base
  const px = base === 10 ? 4 : 9
  const set = patch => setState({ ...state, base, n, ...patch })
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Look at how you write the number 246. The <strong>2</strong>, the <strong>4</strong> and the{' '}
        <strong>6</strong> are bundle counts.
      </p>
      <div className="flex flex-wrap justify-center gap-6 rounded-lg bg-slate-950 p-4">
        <Column label={`big bundles (${base * base} each)`} digit={big}>
          {Array.from({ length: big }, (_, i) => <BigBundle key={i} base={base} px={px} />)}
        </Column>
        <Column label={`bundles (${base} each)`} digit={mid}>
          {Array.from({ length: mid }, (_, i) => <Bar key={i} base={base} px={px} />)}
        </Column>
        <Column label="loose" digit={ones}>
          {Array.from({ length: ones }, (_, i) => <Cell key={i} px={px} />)}
        </Column>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-slate-300">
          Marks: <strong className="w-10 text-amber-300">{n}</strong>
          <input
            type="range"
            min="1"
            max={max}
            value={n}
            aria-label="Number of marks"
            onChange={e => set({ n: Number(e.target.value) })}
            className="accent-amber-400"
          />
        </label>
        <span className="text-slate-400">Bundle in</span>
        {Object.entries(BASES).map(([b, word]) => (
          <button
            key={b}
            type="button"
            onClick={() => set({ base: Number(b) })}
            className={`rounded-lg border px-3 py-1 font-semibold ${
              base === Number(b) ? 'border-amber-400 bg-amber-500 text-slate-950' : 'border-slate-700 hover:bg-slate-800'
            }`}
          >
            {word}s
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3 text-lg leading-relaxed">
        <p>
          Bundle in tens, then tie every ten bundles into a big bundle. The digits you write are just how many of
          each you have. That is why each place is worth ten of the place to its right: ten of anything gets tied
          into the next bundle up.
        </p>
        <p className="text-slate-300">
          Ten is not special. Switch to fives and the same pile gets different digits. We bundle in tens because we
          have ten fingers.
        </p>
      </div>
    </div>
  )
}

export default {
  id: 'bon-notches-on-a-bone',
  order: '1.2',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'Notches on a bone',
  threads: ['Number', 'Measurement'],
  rigor: 1,
  move: 'group-it',
  hook: (
    <div>
      <p>Both rows hold the same number of marks. Which one can you read at a glance? Why?</p>
      <div className="mt-4 space-y-4 rounded-lg bg-slate-950 p-4">
        <Jumble n={23} />
        <Bundled n={23} size={5} />
      </div>
    </div>
  ),
  initialState: { size: null, tried: [] },
  Play,
  playReady: state => state.tried.length >= 2 && state.tried.includes(10),
  playNotReady: 'Try bundles of 10, and one other size',
  predict: {
    question: (
      <p>
        Bundles can be bundled too. Bundle marks in tens, then tie every ten bundles into one big bundle. A pile
        turns out to be <strong>2 big bundles, 4 bundles and 6 loose marks</strong>. How many marks is that?
      </p>
    ),
    response: guess => {
      if (guess === 246)
        return 'Yes, 246, and you can read it straight off the bundles: 2, 4, 6. Our way of writing numbers is a record of bundles.'
      if (guess === 12)
        return "12 adds the counts, but they count different things: a big bundle holds 100 marks, a bundle 10, a loose mark 1. That's 200 + 40 + 6 = 246, and look at the digits: 2, 4, 6."
      return `It's 246: two big bundles of 100, four bundles of 10 and six loose marks. And look at the digits of 246: 2, 4, 6.`
    },
  },
  Reveal,
  tryIt: {
    question: (
      <p>
        Someone bundles in <strong>fives</strong> instead, tying every five bundles into a big bundle. Their pile is
        1 big bundle, 3 bundles and 2 loose marks. How many marks is that?
      </p>
    ),
    answer: 42,
    praise: 'A big bundle of fives is 5 bundles of 5 = 25. So 25 + 15 + 2 = 42.',
    hint: v =>
      v === 132
        ? '132 is how it would read in tens. In fives, how many marks are in one big bundle?'
        : v === 6
          ? "That adds the counts, but a big bundle, a bundle and a loose mark aren't the same size. How many marks in each?"
          : 'Work out how many marks one bundle holds, then one big bundle (five bundles of five).',
    solution:
      'One bundle is 5 marks. One big bundle is five bundles: 25 marks. So 1 big bundle (25) + 3 bundles (15) + 2 loose (2) = 42. Bundling in fives, 42 is written 132.',
  },
  keep: 'Grouping makes big amounts readable. Our numerals are bundle counts: in 246, the 2 counts big bundles of a hundred, the 4 counts bundles of ten, and the 6 counts single marks.',
  symbols: <p>Each place is worth ten times the place to its right, because ten of anything get tied into the next bundle.</p>,
  story: (
    <>
      <p>
        People were cutting tally marks into bone long before writing. The Lebombo bone from southern Africa, about
        43,000 years old, has 29 notches. The Ishango bone from central Africa, around 20,000 years old, has notches
        in clusters. People still argue about what those clusters mean, so treat any confident story about them as a
        guess.
      </p>
      <p className="mt-2">
        Most cultures bundled by tens, from fingers. The Maya bundled by twenties (fingers and toes), and the
        Babylonians by sixties. Their sixties survive in every clock: 60 seconds in a minute, 60 minutes in an hour.
      </p>
    </>
  ),
  deeper: {
    question: <p>The Babylonians bundled in sixties, and we still do for time. How many seconds are in 1 hour, 2 minutes and 3 seconds?</p>,
    answer: 3723,
    praise: 'An hour is 60 bundles of 60 seconds: 3600. Then 2 × 60 = 120, plus 3: 3723.',
    hint: () => 'A minute is a bundle of 60 seconds. An hour is a bundle of 60 minutes. How many seconds in an hour?',
    solution: 'One hour = 60 minutes = 60 × 60 = 3600 seconds. Two minutes = 120 seconds. 3600 + 120 + 3 = 3723.',
  },
}
