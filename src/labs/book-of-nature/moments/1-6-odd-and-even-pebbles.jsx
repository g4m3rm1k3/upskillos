import React, { useState } from 'react'

const U = 26
const AMBER = '#fbbf24'
const SKY = '#38bdf8'
const ROSE = '#fb7185'
const GREEN = '#34d399'

const parity = n => (n % 2 === 0 ? 'even' : 'odd')

// A pile laid out in pairs: two rows, with any lonely pebble sticking out at the end.
function Pile({ n, fill }) {
  const cols = Math.ceil(n / 2)
  return (
    <svg viewBox={`0 0 ${Math.max(cols, 1) * U} ${2 * U}`} style={{ height: 2 * U }} role="img" aria-label={`${n} pebbles`}>
      {Array.from({ length: n }, (_, i) => {
        const lonely = n % 2 === 1 && i === n - 1
        return <circle key={i} cx={Math.floor(i / 2) * U + U / 2} cy={(i % 2) * U + U / 2} r={U * 0.4} fill={lonely ? ROSE : fill} />
      })}
    </svg>
  )
}

function Stepper({ label, n, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-slate-400">{label}</span>
      <button type="button" aria-label={`fewer in ${label}`} disabled={n <= 1} onClick={() => onChange(n - 1)} className="h-8 w-8 rounded-lg border border-slate-700 font-bold hover:bg-slate-800 disabled:opacity-40">−</button>
      <strong className="w-6 text-center text-xl text-amber-300">{n}</strong>
      <button type="button" aria-label={`more in ${label}`} disabled={n >= 15} onClick={() => onChange(n + 1)} className="h-8 w-8 rounded-lg border border-slate-700 font-bold hover:bg-slate-800 disabled:opacity-40">+</button>
    </div>
  )
}

const bothOdd = ([a, b]) => a % 2 === 1 && b % 2 === 1

function Play({ state, setState }) {
  const { a, b, tried } = state
  const record = () => {
    if (!tried.some(([x, y]) => x === a && y === b)) setState({ ...state, tried: [...tried, [a, b]] })
  }
  return (
    <div>
      <p className="mb-3 text-slate-300">
        Lay a pile out in pairs. If every pebble has a partner, the number is <strong>even</strong>. If one pebble is
        left on its own, the number is <strong>odd</strong>. Make two odd piles, put them together, and see what you
        get. Do it a few times.
      </p>
      <div className="space-y-3 rounded-lg bg-slate-950 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Stepper label="Pile 1" n={a} onChange={v => setState({ ...state, a: v })} />
          <Pile n={a} fill={AMBER} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Stepper label="Pile 2" n={b} onChange={v => setState({ ...state, b: v })} />
          <Pile n={b} fill={SKY} />
        </div>
      </div>
      <button type="button" onClick={record} className="mt-4 rounded-lg bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
        Put them together
      </button>
      {tried.length > 0 && (
        <table className="mt-4 font-mono text-lg">
          <tbody>
            {tried.map(([x, y]) => (
              <tr key={`${x}-${y}`}>
                <td className="pr-2 text-right">{x} + {y}</td>
                <td className="px-2 text-slate-500">=</td>
                <td className="pr-3 font-bold text-amber-300">{x + y}</td>
                <td className="text-slate-400" data-testid="together-parity">
                  {parity(x)} + {parity(y)} = {parity(x + y)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Where every pebble of both piles sits, apart or pushed together. Keys stay the same
// in both layouts so each pebble slides to its new spot.
function layout(a, b, together) {
  const pa = Math.floor(a / 2)
  const pb = Math.floor(b / 2)
  const la = a % 2
  const lb = b % 2
  const out = []
  for (let i = 0; i < pa; i++) for (let r = 0; r < 2; r++) out.push({ key: `a${i}-${r}`, x: i, y: r, fill: AMBER })
  const meet = together && la && lb
  if (la) out.push({ key: 'a-lonely', x: together && !lb ? pa + pb : pa, y: 0, fill: meet ? GREEN : ROSE })
  const bStart = together ? pa + (meet ? 1 : 0) : pa + la + 1
  const bPairs = together ? bStart : bStart + lb
  for (let i = 0; i < pb; i++) for (let r = 0; r < 2; r++) out.push({ key: `b${i}-${r}`, x: bPairs + i, y: r, fill: SKY })
  if (lb) out.push({ key: 'b-lonely', x: meet ? pa : together ? pa + pb : bStart, y: meet ? 1 : 0, fill: meet ? GREEN : ROSE })
  return out
}

function Reveal() {
  const [a, setA] = useState(7)
  const [b, setB] = useState(5)
  const [together, setTogether] = useState(false)
  const odd = a % 2 === 1 && b % 2 === 1
  return (
    <div>
      <p className="mb-3 text-lg leading-relaxed">
        Here are two odd piles, laid out in pairs. Each has one lonely pebble. Push them together and watch the
        lonely ones.
      </p>
      <div className="rounded-lg bg-slate-950 p-4">
        <svg viewBox={`0 0 ${17 * U} ${2 * U}`} className="w-full" role="img" aria-label={`${a} and ${b} pebbles`}>
          {layout(a, b, together).map(p => (
            <circle
              key={p.key}
              r={U * 0.4}
              fill={p.fill}
              style={{
                transform: `translate(${p.x * U + U / 2}px, ${p.y * U + U / 2}px)`,
                transition: 'transform 700ms ease-in-out, fill 700ms',
              }}
            />
          ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setTogether(!together)}
          className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400"
        >
          {together ? 'Pull them apart' : 'Push the piles together'}
        </button>
        <Stepper label="Pile 1" n={a} onChange={setA} />
        <Stepper label="Pile 2" n={b} onChange={setB} />
      </div>
      {together && (
        <div className="mt-4 space-y-3 text-lg leading-relaxed">
          <p data-testid="push-result">
            {odd
              ? `The two lonely pebbles pair up with each other. Nothing is left over, so ${a} + ${b} = ${a + b} is even.`
              : `${a} is ${parity(a)} and ${b} is ${parity(b)}, so ${a} + ${b} = ${a + b} is ${parity(a + b)}. Make both piles odd to see the lonely pebbles meet.`}
          </p>
          <p className="text-slate-300">
            Every odd pile looks like this: some pairs, plus one lonely pebble. How many pairs doesn't matter. Push
            any two odd piles together and the two lonely pebbles always pair up. So odd + odd is even for every pair
            of odd numbers, including the ones nobody will ever write down.
          </p>
          <p>
            Notice what settled it. Not more examples: a reason, and a reason covers every case at once. The odd
            squares and the staircase worked the same way. A hunch says it has always happened so far. A reason lets
            you <strong className="text-amber-300">know</strong> it must happen, every time.
          </p>
        </div>
      )}
    </div>
  )
}

export default {
  id: 'bon-odd-and-even-pebbles',
  order: '1.6',
  episodeNumber: 1,
  episode: 'What is mathematics?',
  title: 'Odd and even pebbles',
  threads: ['Number', 'Structure'],
  rigor: 2,
  move: 'pair-off',
  hook: (
    <p>
      3 + 5 = 8. 7 + 9 = 16. 11 + 13 = 24. Add two odd numbers and you seem to get an even one. But there are
      endless odd numbers, and nobody can try them all. Could there be two odd numbers, somewhere out there, that
      add up to an odd number?
    </p>
  ),
  initialState: { a: 3, b: 5, tried: [] },
  Play,
  playReady: state => state.tried.filter(bothOdd).length >= 3,
  playNotReady: 'Put three pairs of odd piles together',
  predict: {
    question: <p>Is there any pair of odd numbers, however big, that adds up to an odd number?</p>,
    choices: ['Yes, somewhere', 'No, never', "Can't know without checking them all"],
    response: guess => {
      if (guess === 'No, never')
        return "No, never, and now you can say why, not just that it hasn't happened yet. The lonely pebbles always pair up."
      if (guess === 'Yes, somewhere')
        return 'It can never happen. However big the two odd piles are, each has exactly one lonely pebble, and the two lonely pebbles always pair up.'
      return "That was the honest answer before the picture. But you can know, without checking a single extra case: the reason works the same for every pair of odd piles."
    },
  },
  Reveal,
  tryIt: {
    question: (
      <div>
        <p>How many of these totals are odd? You shouldn't need to add anything up.</p>
        <ul className="mt-2 space-y-1 font-mono text-amber-300">
          <li>3,517 + 2,249</li>
          <li>4,000 + 1,001</li>
          <li>777 + 777 + 777</li>
          <li>12,345 + 67,891</li>
          <li>2,468 + 1,357</li>
        </ul>
      </div>
    ),
    answer: 3,
    praise: 'The odd totals are 4,000 + 1,001, 777 + 777 + 777 and 2,468 + 1,357.',
    hint: v =>
      v === 2
        ? 'Look again at 777 + 777 + 777. The first two make an even pile. Then one more odd pile joins it.'
        : 'Is each number odd or even? Only the last digit matters: tens, hundreds and thousands are all bundles of ten, and ten pebbles always pair off.',
    solution:
      'Only the last digit decides odd or even, because every bundle of ten pairs off. 3,517 + 2,249 is odd + odd: even. 4,000 + 1,001 is even + odd: odd. 777 + 777 is even, and one more 777 makes it odd. 12,345 + 67,891 is odd + odd: even. 2,468 + 1,357 is even + odd: odd. That is 3 odd totals.',
  },
  keep: 'Odd + odd is always even: each odd pile has one lonely pebble, and the two lonely pebbles pair up. A reason covers every case, even the ones nobody will ever check.',
  symbols: (
    <p>
      even + even = even, even + odd = odd, odd + odd = even. You don't need to memorise these: lay out the pebbles
      in pairs and look for lonely ones.
    </p>
  ),
  story: (
    <>
      <p>
        The Pythagoreans thought odd and even were among the first principles of everything. Aristotle records their
        list of ten basic pairs of opposites: limited and unlimited, odd and even, one and many, and so on.
      </p>
      <p className="mt-2">
        Around 300 BC, Euclid's <em>Elements</em> gave odd and even a run of short proofs in Book IX. One says that
        if you add up an even count of odd numbers, the total is even; the next, that an odd count of odd numbers
        makes an odd total. You just used both in the last problem.
      </p>
    </>
  ),
  deeper: {
    question: (
      <div>
        <p>Now multiply. How many of these products are even?</p>
        <p className="mt-2 font-mono text-amber-300">3 × 5, 4 × 7, 9 × 9, 11 × 6, 13 × 15</p>
      </div>
    ),
    answer: 2,
    praise: '4 × 7 and 11 × 6 are even. Odd × odd is always odd.',
    hint: () =>
      'Picture 3 × 5 as 3 rows of 5 pebbles. Pair off inside each row: each row leaves one lonely pebble. How many lonely pebbles is that, and can they all pair up?',
    solution:
      'An even factor makes the product even: 4 rows always pair off, and rows of 6 pair off. For odd × odd, like 3 rows of 5, each row has one lonely pebble, so there is an odd number of lonely pebbles and one is always left over: odd. So only 4 × 7 and 11 × 6 are even.',
  },
}
