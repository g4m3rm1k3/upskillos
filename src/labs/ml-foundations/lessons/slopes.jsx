import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { traceDescend } from '../traces-part4.js'
import { PIECES } from '../python/pieces.js'
import { makeRng } from '../world.js'
import { slope, descend, fitStep, meanSquaredError } from '../world-part4.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
const f3 = x => (x - 3) * (x - 3)
export const DATA = [[0, 1.42], [0.57, 1.29], [1.14, 1.64], [1.71, 1.95], [2.29, 2.56], [2.86, 3.29], [3.43, 3.32], [4, 4.67]]

// ---------------------------------------------------------------- pictures
export function Parabola({ xs, tangent, lo = -2, hi = 8 }) {
  const W = 380, H = 170
  const yMax = Math.max(25, ...xs.map(f3))
  const X = v => 20 + ((v - lo) / (hi - lo)) * (W - 30), Y = v => 10 + (1 - Math.min(v, yMax) / yMax) * (H - 30)
  const curve = Array.from({ length: 81 }, (_, i) => lo + (i / 80) * (hi - lo)).map(v => `${X(v)},${Y(f3(v))}`).join(' ')
  const shown = xs.filter(v => v >= lo && v <= hi)
  return (
    <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The curve f(x) = (x − 3)², with each step of the descent">
      <polyline points={curve} fill="none" stroke="#35505e" strokeWidth="2" />
      <polyline points={shown.map(v => `${X(v)},${Y(f3(v))}`).join(' ')} fill="none" stroke="#fbbf24" strokeDasharray="3 3" />
      {shown.map((v, i) => <circle key={i} cx={X(v)} cy={Y(f3(v))} r={i === shown.length - 1 ? 5 : 3} fill={i === shown.length - 1 ? '#34d399' : '#7dd3fc'} />)}
      {tangent && <line x1={X(tangent.x - 1)} y1={Y(f3(tangent.x) - tangent.s)} x2={X(tangent.x + 1)} y2={Y(f3(tangent.x) + tangent.s)} stroke="#f87171" strokeWidth="2" />}
      <text x={X(3)} y={H - 4} textAnchor="middle" className="mlf-chart-label">x = 3 (the bottom)</text>
      {xs.some(v => v < lo || v > hi) && <text x={W - 6} y={14} textAnchor="end" className="mlf-chart-label" fill="#f87171">some steps went off the chart</text>}
    </svg>
  )
}
const ParabolaPicture = ({ frame }) => <Parabola xs={frame.pic.xs} tangent={frame.pic.tangent} />

export function StepSizes() {
  const [lr, setLr] = useState(0.1)
  const xs = descend(f3, 0, lr, 12)
  return (
    <div className="mlf-explorer">
      <label className="mlf-knob"><span>step size <code>lr</code> = <strong>{lr}</strong></span><input type="range" min={0.02} max={1.2} step={0.02} value={lr} onChange={e => setLr(Number(e.target.value))} aria-label="learning rate" /><small>12 steps of descend on f(x) = (x − 3)², from x = 0</small></label>
      <Parabola xs={xs} />
      <p className="mlf-total">x after each step: {xs.slice(1).map(v => r4(v)).join(', ')}</p>
      <p className="mlf-muted">Try 0.1, 0.5, 0.9, 1.0 and 1.1.</p>
    </div>
  )
}

export function LineFit() {
  const [lr, setLr] = useState(0.05)
  const [steps, setSteps] = useState(0)
  const path = useMemo(() => { const out = [[0, 0]]; let w = 0, b = 0; for (let k = 0; k < 300; k++) { [w, b] = fitStep(w, b, DATA, lr); out.push([w, b]) } return out }, [lr])
  const [w, b] = path[Math.min(steps, path.length - 1)]
  const W = 380, H = 170, X = v => 25 + (v / 4.2) * (W - 40), Y = v => 10 + (1 - v / 5.5) * (H - 30)
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <label className="mlf-knob"><span><code>lr</code> = <strong>{lr}</strong></span><input type="range" min={0.01} max={0.12} step={0.01} value={lr} onChange={e => setLr(Number(e.target.value))} aria-label="learning rate for the line fit" /><small>fit_step on 8 points</small></label>
        <label className="mlf-scrub"><span>steps</span><input type="range" min={0} max={300} value={steps} onChange={e => setSteps(Number(e.target.value))} aria-label="steps" /><strong>{steps}</strong></label>
      </div>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The data and the fitted line">
        {DATA.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r={4} fill="#7dd3fc" />)}
        <line x1={X(0)} y1={Y(b)} x2={X(4.2)} y2={Y(w * 4.2 + b)} stroke="#34d399" strokeWidth="2" />
      </svg>
      <p className="mlf-total">w = <strong>{r4(w)}</strong>, b = <strong>{r4(b)}</strong> · mean squared error <strong>{Number.isFinite(meanSquaredError(w, b, DATA)) ? r4(meanSquaredError(w, b, DATA)) : '∞'}</strong></p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
export const TRY_SLOPES = {
  lead: 'Lesson 12\'s nudge moved each weight by alpha × error × feature. Why that? Because it is the quickest way to make the error **smaller**: a step downhill. This lesson is about walking downhill on any curve, which is how every neural network learns.',
  steps: [
    { predict: {
      id: 'slopes-try-slope',
      teach: '**The slope** of a curve at a point is how fast it rises: the change in height divided by the change in x, over a very short distance. Worked example: f(x) = x² at x = 1. Take x = 0.99 and x = 1.01: f is 0.9801 and 1.0201, a rise of 0.04 over a run of 0.02, so the slope is 0.04 / 0.02 = **2**.',
      prompt: 'f(x) = x² at x = 3, using x = 2.99 and x = 3.01. What is the slope?',
      answer: 6, tolerance: 0.01,
      misconceptions: [{ answer: 9, tolerance: 0.01, feedback: '9 is the height f(3), not how fast it rises.' }, { answer: 0.12, tolerance: 0.001, feedback: '0.12 is the rise (9.0601 − 8.9401). Divide by the run, 0.02.' }],
      explain: '(9.0601 − 8.9401) / 0.02 = 0.12 / 0.02 = 6. (The exact slope of x² is 2x, and 2 × 3 = 6.)',
    } },
    { choice: {
      id: 'slopes-try-direction',
      teach: 'A positive slope means the curve goes **up** as x increases. A negative slope means it goes down as x increases.',
      prompt: 'At x = 3 the slope of x² is +6. To make f(x) smaller, which way should x move?',
      options: [
        { text: 'Increase x', why: 'The slope is positive: increasing x goes uphill, so f gets bigger.' },
        { text: 'Decrease x: against the slope', why: 'Downhill is the opposite direction to the slope. So a step is **x − lr × slope**, and steeper slopes give bigger steps.' },
        { text: 'It doesn\'t matter', why: 'One way goes up, the other down, and the slope tells you which.' },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'slopes-try-step',
      teach: '**Gradient descent:** x_new = x − lr × slope, where lr (the learning rate) is a small number. For f(x) = (x − 3)², the slope at x is 2 (x − 3).',
      prompt: 'x = 5, lr = 0.1. What is the next x?',
      answer: r4(5 - 0.1 * 2 * (5 - 3)), tolerance: 1e-6,
      misconceptions: [{ answer: 5.4, tolerance: 1e-6, feedback: 'That adds the step: uphill. Subtract it.' }],
      explain: 'The slope is 2 × (5 − 3) = 4, so x becomes 5 − 0.1 × 4 = 4.6, a little closer to the bottom at 3.',
    } },
    { md: 'Now try different step sizes on the same curve, starting from x = 0.' },
    { figure: StepSizes },
    { choice: {
      id: 'slopes-try-toobig',
      teach: 'For this curve, a step does x − 3 → (1 − 2 lr)(x − 3): the distance to the bottom is multiplied by (1 − 2 lr) every step. With lr = 1.1 that factor is −1.2.',
      prompt: 'What happens with lr = 1.1?',
      options: [
        { text: 'It gets to the bottom faster.', why: 'Each step overshoots the bottom by more than it started away: the distance is multiplied by 1.2 (and flips side).' },
        { text: 'It jumps from side to side, further away every time: it diverges.', why: 'Any factor bigger than 1 in size makes the distance grow. Here it converges only for 0 < lr < 1. lr = 0.5 is perfect (factor 0: one step), lr = 1 bounces forever between 0 and 6. Too big a learning rate is the most common reason training blows up.' },
        { text: 'It stops at the first step.', why: 'It keeps stepping, and each step makes it worse.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchDescend() {
  const [lr, setLr] = useState(0.1)
  const { frames } = useMemo(() => traceDescend(f3, 0, lr, 6), [lr])
  return (
    <div className="mlf-watch">
      <h3>descend: slope, step, repeat</h3>
      <div className="mlf-chips">{[0.1, 0.4, 0.9, 1.1].map(v => <button key={v} type="button" className={`mlf-chip${v === lr ? ' on' : ''}`} aria-pressed={v === lr} onClick={() => setLr(v)}>lr {v}</button>)}</div>
      <Stepper code={`${PIECES.slope.code}\n\n${PIECES.descend.code}`} frames={frames} Picture={ParabolaPicture} title="Step through descend" />
    </div>
  )
}

function WatchFit() {
  return (
    <div className="mlf-watch">
      <h3>Fitting a line by walking downhill</h3>
      <p>The line y = w·x + b has two numbers. Their "curve" is the mean squared error over the data, and fit_step walks downhill in both at once. Drag the steps, and try a learning rate that is too big.</p>
      <LineFit />
      <h3>Different step sizes</h3>
      <StepSizes />
    </div>
  )
}

export const WATCH_SLOPES = [WatchDescend, WatchFit]

// ---------------------------------------------------------------- Understand
const FIT = (() => { let w = 0, b = 0; for (let k = 0; k < 300; k++) [w, b] = fitStep(w, b, DATA, 0.05); return [w, b] })()
export const UNDERSTAND_SLOPES = [
  { h: 'Slope, derivative, gradient' },
  { md: `The slope of $f$ at $x$ is the **derivative** $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x-h)}{2h}$. \`slope\` uses a tiny $h$ instead of the limit: a **numerical derivative**. Using a point on each side (a *central* difference) cancels most of the error that a one-sided difference makes.

With several numbers to adjust ($w$ and $b$, or all the weights of a network), each one has its own slope. Together they form the **gradient** $\\nabla f$: the direction of steepest climb. **Gradient descent** steps against it:

$$\\theta \\leftarrow \\theta - \\text{lr}\\,\\nabla f(\\theta)$$` },
  { code: { piece: 'slope', notes: [
    ['return (f(x + h) - f(x - h)) / (2 * h)', 'Rise over run, a tiny step either side of x. h = 1e-5 is small enough to be accurate, and big enough that rounding errors don\'t swamp it.'],
  ] } },
  { code: { piece: 'descend', notes: [
    ['x = x - lr * slope(f, x)', 'Minus: against the slope, downhill. Where the slope is steep the steps are big; near the bottom, where it flattens, they shrink, so it slows down as it arrives.'],
  ] } },
  { h: 'Why the nudge is gradient descent' },
  { md: `Fit a line $\\hat y = w x + b$ to data by making the **mean squared error** small: $L = \\frac1n\\sum (w x + b - y)^2$. The chain rule (the slope of $u^2$ is $2u$ times the slope of $u$) gives

$$\\frac{\\partial L}{\\partial w} = \\frac1n\\sum 2(wx + b - y)\\,x, \\qquad \\frac{\\partial L}{\\partial b} = \\frac1n\\sum 2(wx + b - y)$$

That is \`fit_step\`. Now take **one** data point and lesson 12's formula $\\hat y = w\\cdot\\phi$: the slope of $(w\\cdot\\phi - y)^2$ with respect to $w_i$ is $-2\\,(y - w\\cdot\\phi)\\,\\phi_i = -2 \\times \\text{error} \\times \\phi_i$. A step downhill adds $\\text{lr}\\times 2 \\times \\text{error}\\times\\phi_i$: **the nudge**, with $\\alpha = 2\\,\\text{lr}$. The delta rule *is* gradient descent on the squared error, one example at a time.` },
  { code: { piece: 'fit_step', notes: [
    ['dw = sum(2 * (w * x + b - y) * x for x, y in data) / n', 'The slope of the mean squared error with respect to w, averaged over the data.'],
    ['return w - lr * dw, b - lr * db', 'Both numbers step downhill at once, using slopes computed **before** either one changed.'],
  ] } },
  { mathCode: [
    ["f'(x)", 'slope(f, x)', 'the derivative, estimated'],
    ['x - \\text{lr}\\,f\'(x)', 'x - lr * slope(f, x)', 'one gradient-descent step'],
    ['L = \\frac1n\\sum(wx+b-y)^2', 'mean squared error', 'how badly the line fits'],
    ['\\partial L / \\partial w', 'dw', 'which way, and how hard, to change w'],
  ] },
  { predict: {
    id: 'slopes-u-fit',
    teach: 'Start the line at w = 0, b = 0. Every prediction is 0, so each error term (w·x + b − y) is just −y. Then db = average of 2 × (−y) over the data.',
    prompt: `The data's y values are ${DATA.map(d => d[1]).join(', ')}. What is db for the very first fit_step?`,
    answer: r4(DATA.reduce((s, [, y]) => s - 2 * y, 0) / DATA.length), tolerance: 2e-3,
    explain: `−2 × (the average y) = −2 × ${r4(DATA.reduce((s, [, y]) => s + y, 0) / DATA.length)} = ${r4(DATA.reduce((s, [, y]) => s - 2 * y, 0) / DATA.length)}. Negative: raising b would lower the error, so the step (b − lr × db) raises b.`,
  } },
  { note: `This is **gradient descent**, the engine of almost all of machine learning. After 300 steps with lr 0.05 the line settles at w ≈ ${r4(FIT[0])}, b ≈ ${r4(FIT[1])}: the **least-squares** fit. Real systems use **stochastic** gradient descent (one example or a small batch per step, lesson 15) and smarter step sizes (momentum, Adam), but the idea is this one line.`, kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const SQ = 'lambda x: (x - 3) * (x - 3)'
const sCase = (fn, js, x, why) => ({ call: `slope(${fn}, ${x})`, expected: norm(slope(js, x)), why })
const dCase = (lr, steps, x0 = 0, why) => ({ call: `descend(${SQ}, ${x0}, ${lr}, ${steps})`, expected: norm(descend(f3, x0, lr, steps)), why })
const fCase = (w, b, data, lr, why) => ({ call: `fit_step(${w}, ${b}, ${JSON.stringify(data)}, ${lr})`, expected: norm(fitStep(w, b, data, lr)), why })
const rng = makeRng(13)
const RD = Array.from({ length: 6 }, () => [r4(rng.random() * 5), r4(rng.random() * 4 - 1)])

export const CHALLENGES_SLOPES = [
  {
    id: 'slopes-slope', piece: 'slope', title: 'Write slope', kind: 'write', uses: [],
    prompt: '`slope(f, x, h=1e-5)` estimates the slope of the function `f` at `x`: (f(x + h) − f(x − h)) / (2h).',
    starter: `def slope(f, x, h=1e-5):
    return 0.0
`,
    solution: PIECES.slope.code,
    runCalls: [`slope(${SQ}, 5)`, 'slope(lambda x: x * x, 3)'],
    cases: [sCase(SQ, f3, 5), sCase('lambda x: x * x', x => x * x, 3), sCase('lambda x: 4 * x + 1', x => 4 * x + 1, -2, 'a straight line'), sCase('lambda x: math.tanh(x)', Math.tanh, 0.5, 'tanh')],
    hints: ['`f` is a function: call it with `f(x + h)`.', '`(f(x + h) - f(x - h)) / (2 * h)`.'],
  },
  {
    id: 'slopes-descend', piece: 'descend', title: 'Write descend', kind: 'write', uses: ['slope'],
    prompt: '`descend(f, x, lr, steps)` takes `steps` steps of gradient descent from `x` (each one `x = x - lr * slope(f, x)`) and returns the list of every x, the start included.',
    starter: `def descend(f, x, lr, steps):
    xs = [x]
    return xs
`,
    solution: PIECES.descend.code,
    runCalls: [`descend(${SQ}, 0, 0.1, 5)`, `descend(${SQ}, 0, 1.1, 5)`],
    cases: [dCase(0.1, 5), dCase(0.5, 3, 0, 'one step to the bottom'), dCase(0.9, 6, 0, 'zig-zag'), dCase(0.2, 4, 10)],
    hints: ['Each step uses your `slope` at the current x.', '`for _ in range(steps):` then `x = x - lr * slope(f, x)` and `xs.append(x)`.'],
  },
  {
    id: 'slopes-fit', piece: 'fit_step', title: 'Write fit_step', kind: 'write', uses: [],
    prompt: '`fit_step(w, b, data, lr)` takes one gradient-descent step on the mean squared error of the line y = w·x + b over `data` (a list of `(x, y)` pairs), and returns the new `(w, b)`. Compute both slopes **before** changing either number.',
    starter: `def fit_step(w, b, data, lr):
    n = len(data)
    # dw and db: the slopes of the mean squared error
    return w, b
`,
    solution: PIECES.fit_step.code,
    runCalls: [`fit_step(0, 0, ${JSON.stringify(DATA)}, 0.05)`],
    cases: [fCase(0, 0, DATA, 0.05), fCase(0.5, 0.5, DATA, 0.05), fCase(1, -1, RD, 0.1, 'random data'), fCase(0, 0, [[1, 2]], 0.5, 'one point')],
    hints: ['`dw = sum(2 * (w * x + b - y) * x for x, y in data) / n`.', '`db` is the same without the `* x`; then return `w - lr * dw, b - lr * db`.'],
  },
  {
    id: 'slopes-fix-uphill', piece: null, title: 'Bug hunt: the walk that went uphill', kind: 'fix', uses: ['slope'],
    prompt: 'This `descend` heads off to infinity even with a tiny learning rate. Run the preset and watch the numbers.',
    starter: PIECES.descend.code.replace('x = x - lr * slope(f, x)', 'x = x + lr * slope(f, x)') + '\n',
    solution: PIECES.descend.code,
    compare: 'The slope points uphill, so adding it climbs: this is gradient **ascent**. Every step makes f bigger, so x runs away from the bottom. One sign flips the whole algorithm, which is why a loss that grows from the very first step usually means a sign error.',
    runCalls: [`descend(${SQ}, 0, 0.1, 5)`],
    cases: [dCase(0.1, 5), dCase(0.5, 3), dCase(0.2, 4, 10)],
    hints: ['Does f get smaller or bigger after each step?', 'Downhill is against the slope.'],
  },
]

export const KEEP_SLOPES = {
  pieces: ['slope', 'descend', 'fit_step'],
  card: `**slope(f, x, h)** → (f(x + h) − f(x − h)) / 2h: how fast f rises at x.

**descend(f, x, lr, steps)** → every x of gradient descent: x − lr × slope, repeated.

**fit_step(w, b, data, lr)** → one downhill step for a straight-line fit on the mean squared error.`,
  remember: [
    'Downhill is against the slope: x − lr × slope.',
    'The learning rate matters: too small crawls, too big zig-zags or blows up (here: anything at or above 1).',
    'Many numbers to adjust? Each has its own slope: together, the gradient.',
    'The nudge of lesson 12 is gradient descent on the squared error of one example.',
  ],
  ml: [['the slope', 'derivative / gradient, $\\nabla$', 'which way is uphill'], ['descend', 'gradient descent', 'how models learn'], ['lr', 'learning rate', 'step size'], ['the mean squared error', 'loss function', 'what learning makes small']],
  next: 'Lesson 14: a straight line can\'t bend. Stack bent units into a layer, a neural network, and find every slope with the chain rule: backpropagation.',
}
