import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { traceRunningMeans } from '../traces-part3.js'
import { PIECES } from '../python/pieces.js'
import { makeRng } from '../world.js'
import { updateMean, runningMeans, weightsOnSamples } from '../world-part3.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))

// ---------------------------------------------------------------- pictures
export function RunningChart({ xs, guesses, upto = xs.length - 1, truth, lines = [] }) {
  const W = 380, H = 150
  const all = [...xs, ...guesses, ...lines.flatMap(l => l.ys), ...(truth ? truth : [])]
  const lo = Math.min(0, ...all), hi = Math.max(1, ...all)
  const x = i => 24 + (i / Math.max(1, xs.length - 1)) * (W - 36)
  const y = v => 8 + (1 - (v - lo) / (hi - lo)) * (H - 30)
  const path = ys => ys.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Samples as dots, the guess as a line">
      {truth && <polyline points={path(truth)} fill="none" stroke="#fbbf24" strokeDasharray="4 3" />}
      {xs.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === upto ? 4.5 : 3} fill={i <= upto ? '#7dd3fc' : '#35505e'} />)}
      {guesses.length > 0 && <polyline points={path(guesses)} fill="none" stroke="#34d399" strokeWidth="2" />}
      {lines.map((l, k) => <polyline key={k} points={path(l.ys)} fill="none" stroke={l.color} strokeWidth="2" />)}
      <text x={4} y={y(hi) + 4} className="mlf-chart-label">{r4(hi)}</text><text x={4} y={y(lo)} className="mlf-chart-label">{r4(lo)}</text>
      <text x={W - 4} y={H - 4} textAnchor="end" className="mlf-chart-label">blue: samples · green: the guess{truth ? ' · amber: the truth' : ''}</text>
    </svg>
  )
}
const ChartPicture = ({ frame }) => <RunningChart xs={frame.pic.xs} guesses={frame.pic.guesses} upto={frame.pic.upto} />

// The world changes halfway: 1/n against a fixed alpha.
export function ChangingWorld({ onDone }) {
  const [alpha, setAlpha] = useState(0.1)
  const data = useMemo(() => {
    const rng = makeRng(5)
    const truth = Array.from({ length: 200 }, (_, i) => (i < 100 ? 1 : 3))
    const xs = truth.map(t => t + 2 * (rng.random() - 0.5) * 1.5)
    return { truth, xs }
  }, [])
  const exact = runningMeans(data.xs)
  const fixed = runningMeans(data.xs, alpha)
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span>fixed <code>alpha</code> = <strong>{alpha}</strong></span><input type="range" min={0.01} max={0.5} step={0.01} value={alpha} onChange={e => { setAlpha(Number(e.target.value)); onDone?.() }} aria-label="alpha" /><small>purple: alpha = 1/n (the exact average) · green: this fixed alpha</small></label>
      <RunningChart xs={data.xs} guesses={[]} truth={data.truth} lines={[{ ys: exact, color: '#a78bfa' }, { ys: fixed, color: '#34d399' }]} />
      <p className="mlf-total">after 200 samples (truth now 3): 1/n says <strong>{r4(exact.at(-1))}</strong> · alpha {alpha} says <strong>{r4(fixed.at(-1))}</strong></p>
    </div>
  )
}

export function WeightsChart() {
  const [alpha, setAlpha] = useState(0.2)
  const n = 20
  const fixed = weightsOnSamples(n, alpha), exact = weightsOnSamples(n, null)
  const W = 380, H = 120, bw = (W - 40) / n
  const y = v => 10 + (1 - v / Math.max(...fixed, ...exact)) * (H - 34)
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span><code>alpha</code> = <strong>{alpha}</strong></span><input type="range" min={0.05} max={0.9} step={0.05} value={alpha} onChange={e => setAlpha(Number(e.target.value))} aria-label="alpha for the weights" /><small>how much each of the last 20 samples counts in the final guess</small></label>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The weight of each sample in the final guess">
        {fixed.map((w, i) => <rect key={i} x={20 + i * bw} y={y(w)} width={bw * 0.45} height={H - 24 - y(w)} fill="#34d399" />)}
        {exact.map((w, i) => <rect key={`e${i}`} x={20 + i * bw + bw * 0.5} y={y(w)} width={bw * 0.35} height={H - 24 - y(w)} fill="#a78bfa" />)}
        <text x={20} y={H - 8} className="mlf-chart-label">oldest</text><text x={W - 10} y={H - 8} textAnchor="end" className="mlf-chart-label">newest</text>
      </svg>
      <p className="mlf-muted">Green: fixed alpha, each older sample counts (1 − alpha) times as much as the next. Purple: 1/n, every sample counts 1/20. Green weights add up to {r4(fixed.reduce((a, b) => a + b, 0))}; the rest ({r4(1 - fixed.reduce((a, b) => a + b, 0))}) is still on the starting guess of 0.</p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_RUNNING = {
  lead: 'Lesson 8 averaged n samples by adding them all up. A learner can\'t do that: it gets one sample at a time, forever, and can\'t store them all. It needs a way to **update** its guess with each new sample.',
  steps: [
    { predict: {
      id: 'running-try-one-more',
      teach: '**Updating an average.** The new average is the old one, moved toward the new number by **1/n** of the gap, where n counts the new number too: new = old + (x − old) / n. Worked example: 4 numbers average 5, and a fifth number, 10, arrives: 5 + (10 − 5) / 5 = 6. Check: the four added up to 20, plus 10 is 30, and 30 / 5 = 6.',
      prompt: '9 numbers average 2. A tenth number arrives: **12**. What is the new average?',
      answer: 3, tolerance: 1e-9,
      misconceptions: [{ answer: 7, feedback: '7 is half way between 2 and 12, as if the new number weighed as much as all nine old ones together. It is one number in ten, so it moves the average a tenth of the gap.' }],
      explain: '2 + (12 − 2) / 10 = 2 + 1 = 3. Check: the nine added up to 18, plus 12 is 30, and 30 / 10 = 3. The update needed only the old average and the count, not the nine numbers.',
    } },
    { choice: {
      id: 'running-try-surprise',
      teach: 'In `old + step × (x − old)`, the bracket compares the new sample with the current guess.',
      prompt: 'What does the bracket, `x − old`, measure?',
      options: [
        { text: 'The new sample\'s size', why: 'Its size is x. The bracket is about how x compares with what was expected.' },
        { text: 'The **surprise**: how far the sample is from what the guess predicted. Positive means better than expected, negative worse.', why: 'The guess moves in the direction of the surprise, by a fraction of it. Every learning rule in this lab has this shape.' },
        { text: 'The error in the old samples', why: 'The old samples are gone; only the guess is kept.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'running-try-alpha',
      teach: 'Instead of 1/n, the step can be a **fixed** number alpha: guess = guess + alpha × (x − guess). With alpha = 0.5 the guess moves **half way** to each new sample.',
      prompt: 'The guess starts at 0, alpha = 0.5, and two samples arrive: 4, then 4. What is the guess after both?',
      answer: 3, tolerance: 1e-9,
      misconceptions: [{ answer: 4, feedback: 'Half way each time: 0 → 2 (half way to 4), then 2 → 3 (half way to 4). It approaches 4 but never quite reaches it.' }, { answer: 2, feedback: 'That is after the first sample. The second moves it half way again, from 2 toward 4.' }],
      explain: '0 + 0.5 × (4 − 0) = 2, then 2 + 0.5 × (4 − 2) = 3. Each step halves the remaining gap.',
    } },
    { md: 'Halfway through these samples the world changes: the true average (amber) jumps from 1 to 3. Move the fixed alpha and compare it with 1/n.' },
    { figure: ChangingWorld },
    { choice: {
      id: 'running-try-change',
      teach: 'With 1/n, sample number 1 still counts exactly as much as sample number 200: every sample, forever, has the same weight. With a fixed alpha, each older sample counts a little less than the one after it.',
      prompt: 'Which one follows the change?',
      options: [
        { text: '1/n: it is the exact average, so it is always best', why: 'It is the exact average of **all** the samples, including the 100 from before the change. After 200 samples it is still near 2, half way between the old and the new truth.' },
        { text: 'The fixed alpha: old samples fade, so it forgets the old world and settles near the new truth.', why: 'The price: it never stops wobbling, because it always weighs the last few samples heavily. A small alpha wobbles less but follows changes more slowly.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
const SETS = {
  steady: [2, 4, 3, 5, 1, 3, 4, 2],
  jump: [1, 1, 2, 1, 4, 5, 4, 4, 5, 4],
}
function WatchRunning() {
  const [which, setWhich] = useState('steady')
  const [alpha, setAlpha] = useState(null)
  const { frames } = useMemo(() => traceRunningMeans(SETS[which], alpha), [which, alpha])
  return (
    <div className="mlf-watch">
      <h3>running_means: one sample at a time</h3>
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">samples</span><div className="mlf-chips">{[['steady', 'around 3'], ['jump', 'a jump from 1 to 4']].map(([k, l]) => <button key={k} type="button" className={`mlf-chip${k === which ? ' on' : ''}`} aria-pressed={k === which} onClick={() => setWhich(k)}>{l}</button>)}</div></div>
        <div><span className="mlf-eyebrow">step</span><div className="mlf-chips">{[[null, '1/n'], [0.5, 'alpha 0.5'], [0.2, 'alpha 0.2']].map(([v, l]) => <button key={l} type="button" className={`mlf-chip${v === alpha ? ' on' : ''}`} aria-pressed={v === alpha} onClick={() => setAlpha(v)}>{l}</button>)}</div></div>
      </div>
      <Stepper code={`${PIECES.update_mean.code}\n\n${PIECES.running_means.code}`} frames={frames} Picture={ChartPicture} title="Step through running_means" />
    </div>
  )
}

function WatchWeights() {
  return (
    <div className="mlf-watch">
      <h3>How much each sample counts</h3>
      <p>Unroll the update and every past sample turns out to have a weight in the final guess. Slide alpha: big alpha means a short memory.</p>
      <WeightsChart />
      <h3>When the world changes</h3>
      <ChangingWorld />
    </div>
  )
}

export const WATCH_RUNNING = [WatchRunning, WatchWeights]

// ---------------------------------------------------------------- Understand
const W3 = r4(0.5 * 0.5 ** 2)
export const UNDERSTAND_RUNNING = [
  { h: 'Where the update comes from' },
  { md: `The average of n samples is $m_n = \\frac{1}{n}\\sum_{i=1}^n x_i$. Multiply out: $n\\,m_n = (n-1)\\,m_{n-1} + x_n$. Divide by n and rearrange:

$$m_n = m_{n-1} + \\frac{1}{n}\\big(x_n - m_{n-1}\\big)$$

That is the exact average, updated one sample at a time with nothing stored but $m$ and $n$. Replace $\\frac1n$ by a fixed $\\alpha$ and you get the **exponentially weighted average**. Unroll it, and the weight on the sample $k$ steps back is $\\alpha(1-\\alpha)^k$:

$$m_n = \\alpha x_n + \\alpha(1-\\alpha)\\,x_{n-1} + \\alpha(1-\\alpha)^2 x_{n-2} + \\dots$$

Recent samples count most, and older ones fade geometrically (lesson 6's series again).` },
  { code: { piece: 'update_mean', notes: [
    ['return old + alpha * (x - old)', 'Old guess + step size × surprise. `alpha = 1` jumps straight to the sample; `alpha = 0` never moves.'],
  ] } },
  { code: { piece: 'running_means', notes: [
    ['for n, x in enumerate(xs, 1):', '`enumerate(xs, 1)` counts from **1**, so `n` is how many samples have arrived including this one. Counting from 0 would make the first step `1 / 0`.'],
    ['guess = update_mean(guess, x, 1 / n if alpha is None else alpha)', 'A conditional expression: `a if condition else b`. `None` means "use 1/n, the exact average"; a number means a fixed step.'],
  ] } },
  { mathCode: [
    ['m_n', 'guess', 'the estimate after n samples'],
    ['x_n - m_{n-1}', 'x - old', 'the surprise'],
    ['\\frac{1}{n}', '1 / n', 'the exact-average step'],
    ['\\alpha', 'alpha', 'a fixed step: the learning rate'],
    ['\\alpha(1-\\alpha)^k', 'alpha * (1 - alpha) ** k', 'the weight of the sample k steps back'],
  ] },
  { predict: {
    id: 'running-u-weight',
    teach: 'With a fixed alpha, the sample k steps back has weight $\\alpha(1-\\alpha)^k$. The newest sample is k = 0, the one before it k = 1, and so on.',
    prompt: 'With alpha = 0.5, how much does the sample **2 steps back** count in the guess?',
    answer: W3, tolerance: 1e-6,
    misconceptions: [{ answer: 0.5, tolerance: 1e-9, feedback: '0.5 is the newest sample\'s weight (k = 0). Each step back multiplies by (1 − 0.5) again.' }],
    explain: `0.5 × 0.5² = ${W3}. The newest counts 0.5, the one before 0.25, then ${W3}: each older sample counts half as much.`,
  } },
  { choice: {
    id: 'running-u-q-line',
    teach: 'Lesson 0\'s learning line is `q[state][action] += alpha * (target - q[state][action])`, where `target` is what the move turned out to be worth this time.',
    prompt: 'Which piece of this lesson is that line?',
    options: [
      { text: 'update_mean, with the guess q[state][action] and the sample x = target', why: 'It is the running average with a fixed alpha: every time the move is tried, its guess moves part of the way toward what it just turned out to be worth. Lesson 10 says where the target comes from.' },
      { text: 'running_means', why: 'running_means keeps a whole list of guesses. The learner keeps just one per square and move, updated in place.' },
      { text: 'None: it is something new', why: 'Compare the shapes: old + alpha × (sample − old).' },
    ],
    answer: 0,
  } },
  { note: 'α is called the **learning rate** or **step size**. The same "old + α × error" shape is used by gradient descent in neural networks (Part 4). A step size like 1/n that shrinks just fast enough makes estimates settle exactly on the truth. That is the **Robbins–Monro** condition. A fixed α keeps tracking a world that changes, which is called **non-stationary**.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const umCase = (o, x, a) => ({ call: `update_mean(${o}, ${x}, ${a})`, expected: norm(updateMean(o, x, a)) })
const rmCase = (xs, a, why) => ({ call: `running_means(${JSON.stringify(xs)}${a === null ? '' : `, ${a}`})`, expected: norm(runningMeans(xs, a)), why })
const RAND = (() => { const rng = makeRng(8); return Array.from({ length: 15 }, () => Math.round((rng.random() * 10 - 3) * 100) / 100) })()

export const CHALLENGES_RUNNING = [
  {
    id: 'running-update', piece: 'update_mean', title: 'Write update_mean', kind: 'write', uses: [],
    prompt: '`update_mean(old, x, alpha)` returns the old guess moved toward the sample x by the fraction alpha of the surprise.',
    starter: `def update_mean(old, x, alpha):
    surprise = x - old
    return old
`,
    solution: PIECES.update_mean.code,
    runCalls: ['update_mean(2, 12, 1 / 10)', 'update_mean(0, 4, 0.5)'],
    cases: [umCase(2, 12, 0.1), umCase(0, 4, 0.5), umCase(5, 5, 0.3), umCase(1, -3, 1), umCase(-0.2, 0.84, 0.05)],
    hints: ['The surprise is already computed for you: `x - old`.', 'Return the old guess plus alpha times the surprise: `old + alpha * surprise`.'],
  },
  {
    id: 'running-means', piece: 'running_means', title: 'Write running_means', kind: 'write', uses: ['update_mean'],
    prompt: '`running_means(xs, alpha=None)` starts the guess at 0, updates it with each sample in turn, and returns the list of guesses after each one. With `alpha=None` the step for the n-th sample is `1 / n` (counting from 1), which gives the exact average so far; otherwise it is `alpha`.',
    starter: `def running_means(xs, alpha=None):
    guess, out = 0.0, []
    # update the guess with every sample; record it after each one
    return out
`,
    solution: PIECES.running_means.code,
    runCalls: ['running_means([2, 4, 3, 5])', 'running_means([4, 4, 4, 4], 0.5)'],
    cases: [rmCase([2, 4, 3, 5], null), rmCase([4, 4, 4, 4], 0.5), rmCase(SETS.jump, 0.2), rmCase(RAND, null, 'random samples'), rmCase(RAND, 0.1, 'random samples, fixed alpha'), rmCase([], null, 'no samples')],
    hints: ['`for n, x in enumerate(xs, 1):` counts from 1.', '`guess = update_mean(guess, x, 1 / n if alpha is None else alpha)`, then `out.append(guess)`.'],
  },
  {
    id: 'running-fix-zero', piece: null, title: 'Bug hunt: the first sample that broke it', kind: 'fix', uses: ['update_mean'],
    prompt: 'This `running_means` works with a fixed alpha but crashes with the default. Run the first preset and read the error.',
    starter: PIECES.running_means.code.replace('enumerate(xs, 1)', 'enumerate(xs)') + '\n',
    solution: PIECES.running_means.code,
    compare: '`enumerate(xs)` counts from 0, so the very first step is `1 / 0`: `ZeroDivisionError`. With a fixed alpha the count is never used, which is why the bug hides. `enumerate(xs, 1)` makes n the number of samples seen so far, which is what the formula needs.',
    runCalls: ['running_means([2, 4, 3, 5])', 'running_means([2, 4, 3, 5], 0.5)'],
    cases: [rmCase([2, 4, 3, 5], null), rmCase(RAND, null), rmCase([4, 4, 4], 0.5)],
    hints: ['Which line divides, and by what, on the very first sample?', '`enumerate` takes a second argument: the number to start counting from.'],
  },
]

export const KEEP_RUNNING = {
  pieces: ['update_mean', 'running_means'],
  card: `**update_mean(old, x, alpha)** → old + alpha × (x − old): move the guess part of the way toward the sample.

**running_means(xs, alpha)** → the guess after each sample: 1/n gives the exact average, a fixed alpha a fading memory.`,
  remember: [
    'An average can be updated one sample at a time: old + (x − old) / n, with nothing stored but the guess and the count.',
    'x − old is the surprise; the guess moves toward it by the step size.',
    'A fixed alpha weights the sample k steps back by α(1 − α)^k: recent samples count most.',
    '1/n settles exactly but can\'t follow a change; a fixed alpha follows changes but keeps wobbling.',
  ],
  ml: [['alpha', 'learning rate, $\\alpha$', 'how big each correction is'], ['x − old', 'error, or TD error later', 'the surprise the update corrects'], ['a fixed alpha', 'exponential moving average', 'recent samples count most']],
  next: 'Lesson 10: the learner\'s target isn\'t a measured result. Part of it is its own guess about the next square. Can you really correct a guess with a guess?',
}
