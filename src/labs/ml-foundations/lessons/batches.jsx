import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { traceReplay } from '../traces-part4.js'
import { PIECES } from '../python/pieces.js'
import { makeRng, dice } from '../world.js'
import { Replay, batchNudge, forward, randomNet, stepNet } from '../world-part4.js'
import { HILL } from './layers.jsx'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const LEFT = HILL.filter(([x]) => x < 0.5), RIGHT = HILL.filter(([x]) => x >= 0.5)
const mse = (p, d) => d.reduce((s, [x, t]) => s + (forward(p, x)[1] - t) ** 2, 0) / d.length

// Learn the left half, then the right half: one example at a time in that order, or through a replay memory.
export function forgetting(seed, replay, steps = 2000) {
  const rng = makeRng(seed)
  let p = randomNet(3, makeRng(seed))
  const snaps = []
  const mem = new Replay(1000)
  for (let k = 0; k < 2 * steps; k++) {
    const src = k < steps ? LEFT : RIGHT
    const ex = src[Math.floor(rng.random() * src.length)]
    if (replay) { mem.add(ex); p = stepNet(p, mem.sample(8, rng), 0.2) } else p = stepNet(p, [ex], 0.2)
    if (k === steps - 1) snaps.push({ ...p })
  }
  return { afterLeft: snaps[0], end: p, leftAfterLeft: mse(snaps[0], LEFT), left: mse(p, LEFT), right: mse(p, RIGHT) }
}
export const FORGET = [1, 2, 3].map(s => ({ inOrder: forgetting(s, false), replay: forgetting(s, true) }))

// ---------------------------------------------------------------- pictures
function MemoryPicture({ frame }) {
  const { mem, capacity, dropped, picked } = frame.pic
  return (
    <div className="mlf-stack">
      <div className="mlf-memory" aria-label="The memory">
        {Array.from({ length: capacity }, (_, i) => <span key={i} className={`mlf-slot${i < mem.length ? ' full' : ''}${picked === i ? ' picked' : ''}`}>{i < mem.length ? mem[i] : ''}</span>)}
      </div>
      <p className="mlf-muted">position 0 (oldest) on the left · capacity {capacity}{dropped !== undefined ? ` · just dropped: ${dropped}` : ''}</p>
    </div>
  )
}

export function ForgettingDemo() {
  const [seed, setSeed] = useState(2)
  const [replay, setReplay] = useState(false)
  const run = useMemo(() => forgetting(seed, replay), [seed, replay])
  const W = 380, H = 160, X = v => 20 + v * (W - 40), Y = v => 10 + (1 - (v + 0.4) / 1.6) * (H - 25)
  const xs = Array.from({ length: 61 }, (_, i) => i / 60)
  const curve = p => xs.map(x => `${X(x)},${Y(forward(p, x)[1])}`).join(' ')
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <label className="mlf-toggle"><input type="checkbox" checked={replay} onChange={e => setReplay(e.target.checked)} /> learn through a replay memory (random batches of 8)</label>
        <div className="mlf-chips">{[1, 2, 3].map(v => <button key={v} type="button" className={`mlf-chip${v === seed ? ' on' : ''}`} aria-pressed={v === seed} onClick={() => setSeed(v)}>seed {v}</button>)}</div>
      </div>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The network after learning the left half, and after learning the right half">
        {HILL.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r={4} fill={x < 0.5 ? '#7dd3fc' : '#fbbf24'} />)}
        <polyline points={curve(run.afterLeft)} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 3" />
        <polyline points={curve(run.end)} fill="none" stroke="#34d399" strokeWidth="2" />
        <text x={W - 6} y={H - 4} textAnchor="end" className="mlf-chart-label">blue: left half · amber: right half · purple: after the left · green: after the right</text>
      </svg>
      <p className="mlf-total">error on the left half: <strong>{r4(run.leftAfterLeft)}</strong> after learning it → <strong>{r4(run.left)}</strong> after learning the right half · error on the right half: <strong>{r4(run.right)}</strong></p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
const AVG = (k, s) => r4(FORGET.reduce((a, f) => a + f[k][s], 0) / FORGET.length)
export const TRY_BATCHES = {
  lead: 'Your learner updates after every move, using that move only, in the order the moves happen. With a table that is fine. With a formula or a network, whose weights are **shared** by every square, it causes two problems. This lesson finds both and fixes them with a memory.',
  steps: [
    { choice: {
      id: 'batches-try-correlated',
      teach: 'In a game, one move\'s square is right next to the last one\'s: the examples arrive in long runs of very similar squares. A shared weight is pushed by every one of them.',
      prompt: 'A network learns one move at a time, in order, while the mouse spends 50 moves in the left part of a maze. What happens to what it knew about the right part?',
      options: [
        { text: 'Nothing: those squares weren\'t updated.', why: 'With a table, yes. But a network\'s weights are shared, and 50 updates all pushing toward the left part\'s values drag the shared weights away from what the right part needed.' },
        { text: 'It can be overwritten: the shared weights drift toward fitting the recent squares, and the old knowledge is lost.', why: 'This is **catastrophic forgetting**. Measured in Watch it run: after learning the left half of a hill and then only the right half, the error on the left half goes from almost 0 to about 0.3.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'batches-try-capacity',
      teach: '**A replay memory** keeps the most recent experiences, up to a fixed **capacity**. When a new one arrives and the memory is full, the **oldest** is dropped.',
      prompt: 'A memory of capacity 5 receives the experiences numbered 0, 1, 2, 3, 4, 5, 6, in that order. Which number is now the oldest one it holds?',
      answer: 2, tolerance: 1e-9,
      misconceptions: [{ answer: 0, tolerance: 1e-9, feedback: '0 was the first to arrive, so it was the first to be dropped when 5 arrived. Then 1 was dropped when 6 arrived.' }],
      explain: 'Seven experiences, room for five: the two oldest (0 and 1) were dropped. It holds 2, 3, 4, 5, 6, and 2 is the oldest.',
    } },
    { choice: {
      id: 'batches-try-random',
      teach: '**Learning from the memory:** instead of the latest move only, pick a few experiences **at random** from the memory (a batch), and average their corrections.',
      prompt: 'Why does that reduce forgetting?',
      options: [
        { text: 'It learns faster.', why: 'Speed isn\'t the main point (it may even be slower per move).' },
        { text: 'A random batch mixes old and new experience, from many parts of the maze. Every update keeps reminding the shared weights of everything it has seen, not just the last few squares.', why: `Measured over three seeds: the left-half error after learning the right half averages ${AVG('inOrder', 'left')} in order, and ${AVG('replay', 'left')} with replay. Averaging a batch also smooths out the noise of single examples.` },
        { text: 'The memory stores the right answers.', why: 'It stores experience: (state, action, reward, next state). The targets are still computed from the current guesses.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchReplay() {
  const { frames } = useMemo(() => traceReplay(4, ['A', 'B', 'C', 'D', 'E', 'F'], [0.1, 0.6, 0.85]), [])
  return (
    <div className="mlf-watch">
      <h3>Replay: add, drop the oldest, sample at random</h3>
      <Stepper code={PIECES.Replay.code} frames={frames} Picture={MemoryPicture} title="Step through Replay" />
    </div>
  )
}

function WatchForget() {
  return (
    <div className="mlf-watch">
      <h3>Forgetting, and the cure</h3>
      <p>A network (3 hidden units, lesson 14) learns the left half of the hill (blue points) for 2000 steps, then only the right half (amber) for 2000 more. Purple is the curve after the left half, green after the right half. Then turn on the replay memory.</p>
      <ForgettingDemo />
    </div>
  )
}

export const WATCH_BATCHES = [WatchReplay, WatchForget]

// ---------------------------------------------------------------- Understand
export const UNDERSTAND_BATCHES = [
  { h: 'Two problems with learning in order' },
  { md: `1. **Correlation.** Gradient descent assumes each example is a fair, independent sample of everything to be learned (lesson 8). Consecutive moves are not: they are long runs from one part of the world. Shared weights chase the latest run and **forget** the rest.
2. **Noise.** One example's gradient points in a direction that suits that example. An average over $B$ random examples points much closer to the true downhill direction, with lesson 8's $1/\\sqrt{B}$ less wobble.

A **replay memory** fixes both: store experience as it happens, and learn from random **mini-batches** drawn from it. Each experience can be learned from many times, too.` },
  { code: { piece: 'Replay', notes: [
    ['class Replay:', 'A **class** bundles data (`self.items`, `self.capacity`) with the functions that use it (`add`, `sample`). `self` is the particular memory being used.'],
    ['self.items.pop(0)', 'Over capacity: drop the oldest. (A real implementation would use `collections.deque(maxlen=capacity)`, which does this without shifting the whole list.)'],
    ['return [self.items[int(rng.random() * len(self.items))] for _ in range(n)]', 'n positions, each equally likely. Sampling **with** replacement: an item can be picked twice in one batch.'],
  ] } },
  { code: { piece: 'batch_nudge', notes: [
    ['total[i] += error * f', 'Add up every example\'s correction for weight i.'],
    ['return [wi + alpha * t / len(batch) for wi, t in zip(w, total)]', 'Then move by the **average** correction. With a batch of one, this is exactly lesson 12\'s `nudge`.'],
  ] } },
  { mathCode: [
    ['\\mathcal{D}', 'Replay(capacity)', 'the memory of experience'],
    ['B \\sim \\mathcal{D}', 'memory.sample(n, rng)', 'a random mini-batch'],
    ['w_i + \\frac{\\alpha}{|B|}\\sum_{(\\phi, y) \\in B} (y - w\\cdot\\phi)\\,\\phi_i', 'batch_nudge(w, batch, alpha)', 'the average correction over the batch'],
  ] },
  { predict: {
    id: 'batches-u-avg',
    teach: 'batch_nudge adds up error × feature for each example, then moves each weight by alpha × (that total ÷ the batch size).',
    prompt: 'w = [0, 0]; batch = [([1, 0], 1.0), ([0, 1], 2.0)]; alpha = 0.5. What does w[1] become?',
    answer: r4(batchNudge([0, 0], [[[1, 0], 1], [[0, 1], 2]], 0.5)[1]), tolerance: 1e-6,
    misconceptions: [{ answer: 1, tolerance: 1e-6, feedback: 'That is a full nudge from the second example alone (0 + 0.5 × 2 × 1). The batch averages over its 2 examples, so each counts half.' }],
    explain: 'The first example has feature 0 for w[1], so it adds nothing; the second adds (2 − 0) × 1 = 2. The total for w[1] is 2, averaged over 2 examples: 1, times alpha 0.5: w[1] = 0.5.',
  } },
  { note: 'An **experience replay** buffer is half of what made **DQN** (DeepMind, 2015) work: the other half is a **target network**, a slowly updated copy of the network used to compute targets, so the target doesn\'t move every step. **Mini-batch stochastic gradient descent** is how almost every network is trained, on GPUs that process a whole batch at once.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const memCase = (cap, adds, why) => {
  const m = new Replay(cap); adds.forEach(a => m.add(a))
  return { call: `(lambda m: ([m.add(i) for i in ${JSON.stringify(adds)}], m.items)[1])(Replay(${cap}))`, expected: norm(m.items), why }
}
const sampleCase = (cap, adds, n, us) => {
  const m = new Replay(cap); adds.forEach(a => m.add(a))
  return { call: `(lambda m: ([m.add(i) for i in ${JSON.stringify(adds)}], m.sample(${n}, Dice(${JSON.stringify(us)})))[1])(Replay(${cap}))`, expected: norm(m.sample(n, dice([...us]))), why: 'sampling' }
}
const B1 = [[[1, 0], 1], [[0, 1], 2]]
const B2 = [[[0.5, 0.75, 1], 0.6], [[0.25, 0.25, 1], -0.2], [[1, 0, 1], 0.9]]

export const CHALLENGES_BATCHES = [
  {
    id: 'batches-replay', piece: 'Replay', title: 'Write Replay', kind: 'write', uses: [],
    prompt: 'Write the class `Replay(capacity)`: `items` starts as an empty list. `add(item)` appends it and, if there are now more than `capacity` items, removes the **oldest**. `sample(n, rng)` returns a list of n items, each at position `int(rng.random() * len(self.items))`.',
    starter: `class Replay:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = []
    def add(self, item):
        pass
    def sample(self, n, rng):
        return []
`,
    solution: PIECES.Replay.code,
    runCalls: ['(lambda m: ([m.add(i) for i in range(7)], m.items)[1])(Replay(5))', '(lambda m: ([m.add(c) for c in "abcde"], m.sample(3, Dice([0.1, 0.5, 0.95])))[1])(Replay(10))'],
    cases: [memCase(5, [0, 1, 2, 3, 4, 5, 6], 'two too many'), memCase(3, [1, 2], 'not full'), memCase(1, ['x', 'y', 'z'], 'capacity 1'), sampleCase(10, ['a', 'b', 'c', 'd', 'e'], 3, [0.1, 0.5, 0.95]), sampleCase(4, [1, 2, 3, 4, 5, 6], 4, [0, 0.3, 0.6, 0.99])],
    hints: ['In `add`: `self.items.append(item)`, then `if len(self.items) > self.capacity: self.items.pop(0)`.', 'In `sample`: a list comprehension over `range(n)`.'],
  },
  {
    id: 'batches-nudge', piece: 'batch_nudge', title: 'Write batch_nudge', kind: 'write', uses: ['predict'],
    prompt: '`batch_nudge(w, batch, alpha)` takes a list of `(features, target)` pairs. For each one, error = target − predict(w, features); add error × feature to a running total for each weight. Then move each weight by alpha × total / len(batch). All the errors use the **original** w.',
    starter: `def batch_nudge(w, batch, alpha):
    total = [0.0] * len(w)
    # add up error * feature for each example, using the original w
    return list(w)
`,
    solution: PIECES.batch_nudge.code,
    runCalls: ['batch_nudge([0, 0], [([1, 0], 1.0), ([0, 1], 2.0)], 0.5)'],
    cases: [
      { call: 'batch_nudge([0, 0], [([1, 0], 1.0), ([0, 1], 2.0)], 0.5)', expected: norm(batchNudge([0, 0], B1, 0.5)) },
      { call: 'batch_nudge([0.4, 0.3, -0.2], [([0.5, 0.75, 1], 0.6), ([0.25, 0.25, 1], -0.2), ([1, 0, 1], 0.9)], 0.3)', expected: norm(batchNudge([0.4, 0.3, -0.2], B2, 0.3)) },
      { call: 'batch_nudge([0.4, 0.3, -0.2], [([0.5, 0.75, 1], 0.6)], 0.5)', expected: norm(batchNudge([0.4, 0.3, -0.2], [B2[0]], 0.5)), why: 'a batch of one is a nudge' },
    ],
    hints: ['`for features, target in batch:` then `error = target - predict(w, features)`.', '`for i, f in enumerate(features): total[i] += error * f`.', 'Finally `[wi + alpha * t / len(batch) for wi, t in zip(w, total)]`.'],
  },
  {
    id: 'batches-fix-newest', piece: null, title: 'Bug hunt: the memory that forgot the present', kind: 'fix', uses: [],
    prompt: 'This `Replay` stays the right size, but after a while it holds only old experience. Run the preset: which items survive?',
    starter: PIECES.Replay.code.replace('self.items.pop(0)', 'self.items.pop()') + '\n',
    solution: PIECES.Replay.code,
    compare: '`pop()` removes the **last** item, the one just added. Once the memory is full, every new experience is thrown away immediately, so the learner keeps training on its earliest, worst-informed moves for ever. `pop(0)` drops the oldest instead (the same first-in-first-out as lesson 5\'s queue).',
    runCalls: ['(lambda m: ([m.add(i) for i in range(10)], m.items)[1])(Replay(3))'],
    cases: [memCase(3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), memCase(5, [0, 1, 2, 3, 4, 5, 6]), memCase(2, ['a', 'b', 'c'])],
    hints: ['Which item does `pop()` remove, and which one was just added?', 'Over capacity, drop position 0: the oldest.'],
  },
]

export const KEEP_BATCHES = {
  pieces: ['Replay', 'batch_nudge'],
  card: `**Replay(capacity)** with \`add(item)\` (oldest dropped when full) and \`sample(n, rng)\` (n random items).

**batch_nudge(w, batch, alpha)** → weights moved by the **average** correction over a batch.`,
  remember: [
    'Shared weights learning in order chase the latest experience and forget the rest: catastrophic forgetting.',
    'A replay memory plus random mini-batches mixes old and new experience in every update.',
    'Averaging a batch smooths the noise of single examples (1/√B).',
    'Full memory: drop the oldest, keep the present.',
  ],
  ml: [['the memory', 'experience replay buffer', 'half of what made DQN work'], ['a random handful', 'mini-batch', 'what SGD learns from'], ['forgetting the left half', 'catastrophic forgetting', 'shared weights overwritten']],
  next: 'The final assembly: your Q-learner with a formula instead of the table, learning through replay. Where it works, where it breaks, and what that means for deep RL.',
}
