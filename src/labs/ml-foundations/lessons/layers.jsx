import React, { useMemo, useState } from 'react'
import Stepper from '../Stepper.jsx'
import { traceBackprop } from '../traces-part4.js'
import { PIECES } from '../python/pieces.js'
import { makeRng } from '../world.js'
import { forward, gradients, fitStep, meanSquaredError, randomNet, stepNet, slope } from '../world-part4.js'
import { norm } from '../runtime/checks.js'

const r4 = x => Number(x.toFixed(4))
export const HILL = Array.from({ length: 13 }, (_, i) => { const x = i / 12; return [r4(x), r4(1 - 4 * (x - 0.5) ** 2)] })
export const NET = { w1: [1, -2], b1: [0, 0.5], w2: [0.8, 0.4], b2: 0.1 }
const netMse = (p, data) => data.reduce((s, [x, t]) => s + (forward(p, x)[1] - t) ** 2, 0) / data.length
export function trainNet(H, seed, steps = 3000, lr = 0.3) { let p = randomNet(H, makeRng(seed)); for (let k = 0; k < steps; k++) p = stepNet(p, HILL, lr); return p }
export const LINE = (() => { let w = 0, b = 0; for (let k = 0; k < 3000; k++) [w, b] = fitStep(w, b, HILL, 0.3); return [w, b] })()

// ---------------------------------------------------------------- pictures
export function NetPicture({ frame }) {
  const { params, x, hidden, y, stage, g, target } = frame.pic
  const W = 380, H = 190
  const pos = { x: [40, 95], h: params.w1.map((_, i) => [190, 50 + i * 90]), y: [330, 95] }
  const show = s => ['hidden', 'output', 'dy', 'w2', 'dz', 'w1'].indexOf(stage) >= ['hidden', 'output', 'dy', 'w2', 'dz', 'w1'].indexOf(s)
  return (
    <svg className="mlf-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The network: input, two hidden units, output">
      {pos.h.map(([hx, hy], i) => <g key={`a${i}`}><line x1={pos.x[0]} y1={pos.x[1]} x2={hx} y2={hy} stroke={show('w1') ? '#f87171' : '#35505e'} strokeWidth="2" /><text x={(pos.x[0] + hx) / 2} y={(pos.x[1] + hy) / 2 - 4} className="mlf-chart-label" textAnchor="middle">w1={r4(params.w1[i])}{show('w1') ? ` ∂=${r4(g.w1[i])}` : ''}</text></g>)}
      {pos.h.map(([hx, hy], i) => <g key={`b${i}`}><line x1={hx} y1={hy} x2={pos.y[0]} y2={pos.y[1]} stroke={show('w2') ? '#f87171' : '#35505e'} strokeWidth="2" /><text x={(hx + pos.y[0]) / 2} y={(hy + pos.y[1]) / 2 - 4} className="mlf-chart-label" textAnchor="middle">w2={r4(params.w2[i])}{show('w2') ? ` ∂=${r4(g.w2[i])}` : ''}</text></g>)}
      <circle cx={pos.x[0]} cy={pos.x[1]} r={20} fill="#15222a" stroke="#7dd3fc" /><text x={pos.x[0]} y={pos.x[1] + 4} textAnchor="middle" className="mlf-chart-label">x={x}</text>
      {pos.h.map(([hx, hy], i) => <g key={`h${i}`}><circle cx={hx} cy={hy} r={24} fill="#15222a" stroke={show('dz') ? '#f87171' : '#34d399'} /><text x={hx} y={hy - 2} textAnchor="middle" className="mlf-chart-label">tanh</text><text x={hx} y={hy + 11} textAnchor="middle" className="mlf-chart-label">{hidden ? r4(hidden[i]) : '?'}</text></g>)}
      <circle cx={pos.y[0]} cy={pos.y[1]} r={24} fill="#15222a" stroke={show('dy') ? '#f87171' : '#fbbf24'} /><text x={pos.y[0]} y={pos.y[1] - 2} textAnchor="middle" className="mlf-chart-label">y</text><text x={pos.y[0]} y={pos.y[1] + 11} textAnchor="middle" className="mlf-chart-label">{show('output') ? r4(y) : '?'}</text>
      <text x={pos.y[0]} y={pos.y[1] + 42} textAnchor="middle" className="mlf-chart-label">target {target}{show('dy') ? ` · dy=${r4(g.b2)}` : ''}</text>
    </svg>
  )
}

export function NetFit() {
  const [H, setH] = useState(2)
  const [steps, setSteps] = useState(3000)
  const p = useMemo(() => trainNet(H, 1, steps), [H, steps])
  const W = 380, Hh = 160, X = v => 20 + v * (W - 40), Y = v => 10 + (1 - (v + 0.2) / 1.4) * (Hh - 25)
  const xs = Array.from({ length: 61 }, (_, i) => i / 60)
  return (
    <div className="mlf-explorer">
      <div className="mlf-controls">
        <div><span className="mlf-eyebrow">hidden units</span><div className="mlf-chips">{[1, 2, 3, 6].map(v => <button key={v} type="button" className={`mlf-chip${v === H ? ' on' : ''}`} aria-pressed={v === H} onClick={() => setH(v)}>{v}</button>)}</div></div>
        <div><span className="mlf-eyebrow">training steps</span><div className="mlf-chips">{[100, 1000, 3000].map(v => <button key={v} type="button" className={`mlf-chip${v === steps ? ' on' : ''}`} aria-pressed={v === steps} onClick={() => setSteps(v)}>{v}</button>)}</div></div>
      </div>
      <svg className="mlf-chart" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label="The hill, the best straight line, and the network">
        {HILL.map(([x, y], i) => <circle key={i} cx={X(x)} cy={Y(y)} r={4} fill="#7dd3fc" />)}
        <line x1={X(0)} y1={Y(LINE[1])} x2={X(1)} y2={Y(LINE[0] + LINE[1])} stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 3" />
        <polyline points={xs.map(x => `${X(x)},${Y(forward(p, x)[1])}`).join(' ')} fill="none" stroke="#34d399" strokeWidth="2" />
        <text x={W - 6} y={Hh - 4} textAnchor="end" className="mlf-chart-label">blue: data · purple: best line · green: network</text>
      </svg>
      <p className="mlf-total">mean squared error: best line <strong>{r4(meanSquaredError(LINE[0], LINE[1], HILL))}</strong> · network with {H} hidden unit{H > 1 ? 's' : ''} <strong>{r4(netMse(p, HILL))}</strong></p>
    </div>
  )
}

// ---------------------------------------------------------------- Try it first
const [NH, NY] = forward(NET, 0.5)
export const TRY_LAYERS = {
  lead: 'A formula w·features is a weighted sum: a straight line, or a flat slope in more dimensions. Real worths are hills and valleys. This lesson bends the formula: a **neural network** is weighted sums with a bend in between, stacked in layers.',
  steps: [
    { choice: {
      id: 'layers-try-line',
      teach: 'A straight line y = w·x + b goes in **one direction** for ever: always up, always down, or flat. The data below rises, then falls: a hill.',
      prompt: 'Can any straight line fit a hill well?',
      options: [
        { text: 'Yes, with the right w and b', why: 'Whatever w and b are, the line rises everywhere or falls everywhere; it can\'t do both. The best line through a symmetric hill is nearly flat, through the middle.' },
        { text: 'No: it can\'t change direction. Something has to bend.', why: `The best straight line has a mean squared error of ${r4(meanSquaredError(LINE[0], LINE[1], HILL))} on this hill. Bending units do far better (below).` },
      ],
      answer: 1,
    } },
    { predict: {
      id: 'layers-try-tanh',
      teach: '**A hidden unit** computes w·x + b, then bends it with **tanh**, which squashes any number into the range (−1, 1): tanh(0) = 0, tanh(0.5) ≈ 0.4621, tanh(−0.5) ≈ −0.4621, tanh of a big number ≈ 1.',
      prompt: 'A unit with w = 1, b = 0 gets x = 0.5. What is its value?',
      answer: 0.4621, tolerance: 1e-3,
      misconceptions: [{ answer: 0.5, tolerance: 1e-6, feedback: '0.5 is w·x + b, before the bend. The unit\'s value is tanh of that.' }],
      explain: 'w·x + b = 1 × 0.5 + 0 = 0.5, and tanh(0.5) ≈ 0.4621. Close to the straight value near 0; very different far from 0, where tanh flattens out.',
    } },
    { predict: {
      id: 'layers-try-output',
      teach: `**The output** is a weighted sum of the hidden values, plus a bias: y = w2[0]·h[0] + w2[1]·h[1] + b2. Here the two hidden values are h = [${r4(NH[0])}, ${r4(NH[1])}], the weights are w2 = [0.8, 0.4], and b2 = 0.1.`,
      prompt: 'What is y?',
      answer: r4(NY), tolerance: 2e-3,
      explain: `0.8 × ${r4(NH[0])} + 0.4 × (${r4(NH[1])}) + 0.1 = ${r4(NY)}. That is the whole forward pass: weighted sums, a bend, weighted sums again.`,
    } },
    { choice: {
      id: 'layers-try-backprop',
      teach: `To learn, every weight needs its slope (lesson 13). One way: lesson 13's \`slope\`, nudging one weight at a time, which costs two forward passes **per weight**. A network with a million weights would need two million passes per step. The other way: the **chain rule**. If the loss depends on y, and y on h, and h on w, the slopes multiply: ∂loss/∂w = ∂loss/∂y × ∂y/∂h × ∂h/∂w.`,
      prompt: 'Using the chain rule, where do you start?',
      options: [
        { text: 'At the input, working forwards', why: 'The input\'s slope depends on everything after it, so it would have to wait for all of that.' },
        { text: 'At the loss, working **backwards**: the output\'s slope first, then the layer before it, reusing each result for the layer before that.', why: 'One backward pass gives every weight its slope, about as cheap as one forward pass. This is **backpropagation**, and it is what makes training big networks possible.' },
        { text: 'Anywhere: the order doesn\'t matter', why: 'Each layer\'s slope needs the slope of the layer after it, so the order is forced: backwards.' },
      ],
      answer: 1,
    } },
    { md: 'Now train networks on the hill. Try 1 hidden unit, then 2.' },
    { figure: NetFit },
    { choice: {
      id: 'layers-try-two',
      teach: 'One tanh unit is an S-shaped step: it rises (or falls) once. The output can add several of them, each with its own weight, position (b) and steepness (w).',
      prompt: 'Why does 1 hidden unit fail on the hill, while 2 fit it almost perfectly?',
      options: [
        { text: 'Two units have more weights, and more is always better.', why: 'Try 6: it fits worse than 2 after the same number of steps. More units can represent more shapes, but take longer to train.' },
        { text: 'One S-shape only goes up (or only down) once. A rising S plus a falling S, added together, make a bump: exactly a hill.', why: 'Networks build complicated shapes out of simple bends. With enough units they can approximate almost any curve (the *universal approximation* result).' },
        { text: 'Luck in the starting weights', why: 'Different starting weights give the same story: about 0.08 with one unit, near 0 with two.' },
      ],
      answer: 1,
    } },
  ],
}

// ---------------------------------------------------------------- Watch it run
function WatchBackprop() {
  const [target, setTarget] = useState(1)
  const { frames } = useMemo(() => traceBackprop(NET, 0.5, target), [target])
  return (
    <div className="mlf-watch">
      <h3>forward and gradients: a network, one example</h3>
      <p>Forward: values flow left to right. Backward: slopes (red, ∂) flow right to left, each one built from the one after it.</p>
      <div className="mlf-chips">{[1, 0, -0.5].map(v => <button key={v} type="button" className={`mlf-chip${v === target ? ' on' : ''}`} aria-pressed={v === target} onClick={() => setTarget(v)}>target {v}</button>)}</div>
      <Stepper code={`${PIECES.forward.code}\n\n${PIECES.gradients.code}`} frames={frames} Picture={NetPicture} title="Step through forward and gradients" />
    </div>
  )
}

function WatchNet() {
  return (
    <div className="mlf-watch">
      <h3>A network learns a hill</h3>
      <p>Every training step: forward on all 13 points, gradients by backpropagation, then a step downhill on every weight (lesson 13).</p>
      <NetFit />
    </div>
  )
}

export const WATCH_LAYERS = [WatchBackprop, WatchNet]

// ---------------------------------------------------------------- Understand
const G = gradients(NET, 0.5, 1)
// The loss as a function of w2[0] alone, and its numerical slope there.
const NUM = slope(w => (forward({ ...NET, w2: [w, NET.w2[1]] }, 0.5)[1] - 1) ** 2, NET.w2[0])
export const UNDERSTAND_LAYERS = [
  { h: 'The network, written out' },
  { md: `One input $x$, a hidden layer of $H$ units, one output:

$$z_i = w^{(1)}_i x + b^{(1)}_i, \\qquad h_i = \\tanh(z_i), \\qquad y = \\sum_i w^{(2)}_i h_i + b^{(2)}$$

Loss for one example: $L = (y - t)^2$. Each step of the chain rule is one line of \`gradients\`:

- $\\frac{\\partial L}{\\partial y} = 2(y - t)$ (lesson 13's "slope of $u^2$ is $2u$").
- $y$ uses $w^{(2)}_i$ times $h_i$, so $\\frac{\\partial L}{\\partial w^{(2)}_i} = \\frac{\\partial L}{\\partial y}\\, h_i$ and $\\frac{\\partial L}{\\partial b^{(2)}} = \\frac{\\partial L}{\\partial y}$.
- $y$ uses $h_i$ times $w^{(2)}_i$, and the slope of tanh is $1 - \\tanh^2$, so $\\frac{\\partial L}{\\partial z_i} = \\frac{\\partial L}{\\partial y}\\, w^{(2)}_i\\, (1 - h_i^2)$.
- $z_i$ uses $w^{(1)}_i$ times $x$, so $\\frac{\\partial L}{\\partial w^{(1)}_i} = \\frac{\\partial L}{\\partial z_i}\\, x$ and $\\frac{\\partial L}{\\partial b^{(1)}_i} = \\frac{\\partial L}{\\partial z_i}$.` },
  { code: { piece: 'forward', notes: [
    ['hidden = [math.tanh(w * x + b) for w, b in zip(params["w1"], params["b1"])]', 'Every hidden unit at once: a weighted input plus a bias, bent by tanh.'],
    ['y = sum(v * h for v, h in zip(params["w2"], hidden)) + params["b2"]', 'Lesson 12\'s `predict`, with the hidden values as the features: the network **learns its own features**.'],
  ] } },
  { code: { piece: 'gradients', notes: [
    ['dy = 2 * (y - target)', 'Start at the loss.'],
    ['dz = [dy * v * (1 - h * h)', 'Back through the output weight, then through tanh. `h * h` is tanh², because h already is tanh(z): the forward pass\'s values are reused.'],
    ['return {"w1": [d * x for d in dz], "b1": dz,', 'The first layer\'s slopes reuse `dz`: computed once, used twice. That reuse is what makes backpropagation cheap.'],
  ] } },
  { mathCode: [
    ['h_i = \\tanh(w^{(1)}_i x + b^{(1)}_i)', 'hidden[i]', 'a hidden unit: a bent weighted input'],
    ['\\partial L / \\partial y', 'dy', 'the slope of the loss at the output'],
    ['\\partial L / \\partial z_i', 'dz[i]', 'the slope arriving at hidden unit i, after the bend'],
    ['1 - \\tanh^2', '1 - h * h', 'the slope of tanh'],
  ] },
  { predict: {
    id: 'layers-u-check',
    teach: `**Gradient checking.** A backprop slope can be checked with lesson 13's numerical \`slope\`: nudge one weight a tiny bit either side and see how the loss changes. For this network (x = 0.5, target 1), \`gradients\` says ∂L/∂w2[0] = ${r4(G.w2[0])}.`,
    prompt: 'If backprop is right, what should the numerical slope of the loss with respect to w2[0] be, to 3 decimal places?',
    answer: r4(G.w2[0]), tolerance: 2e-3,
    explain: `Measured with \`slope\`: ${r4(NUM)}, the same as backprop's ${r4(G.w2[0])}. Comparing the two is the standard test for a hand-written backward pass. The bug hunt below fails it.`,
  } },
  { note: 'This is a **multi-layer perceptron** with one hidden layer, trained by **backpropagation** and gradient descent. Libraries like PyTorch build the backward pass for you (**automatic differentiation**), but it is exactly these chain-rule steps. **DQN** puts a network like this, only bigger, in place of the Q-table: the input is the state, there is one output per action, and it is trained toward the same target as lesson 10.', kind: 'ml' },
]

// ---------------------------------------------------------------- Write it
const lit = p => `{"w1": ${JSON.stringify(p.w1)}, "b1": ${JSON.stringify(p.b1)}, "w2": ${JSON.stringify(p.w2)}, "b2": ${p.b2}}`
const R = (() => { const rng = makeRng(71); const r = () => r4(rng.random() * 2 - 1); return { w1: [r(), r(), r()], b1: [r(), r(), r()], w2: [r(), r(), r()], b2: r() } })()
const fwCase = (p, x, why) => ({ call: `forward(${lit(p)}, ${x})`, expected: norm(forward(p, x)), why })
const grCase = (p, x, t, why) => ({ call: `gradients(${lit(p)}, ${x}, ${t})`, expected: norm(gradients(p, x, t)), why })

export const CHALLENGES_LAYERS = [
  {
    id: 'layers-forward', piece: 'forward', title: 'Write forward', kind: 'write', uses: [],
    prompt: '`forward(params, x)` returns `(hidden, y)`. `params` is a dict with lists `"w1"`, `"b1"`, `"w2"` (one entry per hidden unit) and a number `"b2"`. Hidden unit i is `math.tanh(w1[i] * x + b1[i])`; the output is the sum of `w2[i] * hidden[i]`, plus `b2`.',
    starter: `def forward(params, x):
    hidden = []
    y = 0.0
    return hidden, y
`,
    solution: PIECES.forward.code,
    runCalls: [`forward(${lit(NET)}, 0.5)`],
    cases: [fwCase(NET, 0.5), fwCase(NET, -1), fwCase(R, 0.3, 'three hidden units'), fwCase({ w1: [0], b1: [0], w2: [1], b2: 2 }, 5, 'a flat unit')],
    hints: ['`zip(params["w1"], params["b1"])` pairs each unit\'s weight and bias.', 'Then lesson 12\'s dot product of `w2` with `hidden`, plus `b2`.'],
  },
  {
    id: 'layers-gradients', piece: 'gradients', title: 'Write gradients', kind: 'write', uses: ['forward'],
    prompt: '`gradients(params, x, target)` returns a dict of slopes of the loss (y − target)², with the same keys as `params`: run `forward`, then `dy = 2 * (y - target)`; `w2` gets `dy * h` for each hidden value and `b2` gets `dy`; then `dz = dy * w2[i] * (1 - h * h)` for each unit, `w1` gets `dz * x` and `b1` gets `dz`.',
    starter: `def gradients(params, x, target):
    hidden, y = forward(params, x)
    dy = 2 * (y - target)
    return {"w1": [], "b1": [], "w2": [], "b2": dy}
`,
    solution: PIECES.gradients.code,
    runCalls: [`gradients(${lit(NET)}, 0.5, 1)`],
    cases: [grCase(NET, 0.5, 1), grCase(NET, 0.5, -0.5), grCase(R, 0.3, 0.7, 'three hidden units'), grCase(R, -1.2, 0)],
    hints: ['Work backwards: `dy` first, then the `w2` slopes (`dy * h`).', '`dz = [dy * v * (1 - h * h) for v, h in zip(params["w2"], hidden)]`.', 'Then `[d * x for d in dz]` for `w1`, and `dz` itself for `b1`.'],
  },
  {
    id: 'layers-fix-bend', piece: null, title: 'Bug hunt: the slope that forgot the bend', kind: 'fix', uses: ['forward', 'slope'],
    prompt: 'This `gradients` gives the right slopes for `w2` and `b2` but wrong ones for `w1` and `b1`. Check it: the second preset is the numerical slope of the loss with respect to w1[0]. Compare it with the first preset\'s `w1[0]`.',
    starter: PIECES.gradients.code.replace('dz = [dy * v * (1 - h * h) for v, h in zip(params["w2"], hidden)]', 'dz = [dy * v for v, h in zip(params["w2"], hidden)]') + '\n',
    solution: PIECES.gradients.code,
    compare: 'The chain rule goes through **every** step between the weight and the loss, and tanh is one of them: its slope is 1 − tanh². Leaving it out treats the unit as if it didn\'t bend. The output-layer slopes are still right (they come after the bend), which is why the bug only shows in the first layer. A numerical gradient check catches it at once.',
    runCalls: [`gradients(${lit(NET)}, 0.5, 1)`, `slope(lambda w: (forward({"w1": [w, -2], "b1": [0, 0.5], "w2": [0.8, 0.4], "b2": 0.1}, 0.5)[1] - 1) ** 2, 1)`],
    cases: [grCase(NET, 0.5, 1), grCase(R, 0.3, 0.7), grCase(NET, -1, 0.2)],
    hints: ['Between `w1[i]` and the loss there are three steps: the weighted input, tanh, and the output weight.', 'The slope of tanh at a unit whose value is h is `1 - h * h`.'],
  },
]

export const KEEP_LAYERS = {
  pieces: ['forward', 'gradients'],
  card: `**forward(params, x)** → \`(hidden, y)\`: tanh units, then a weighted sum.

**gradients(params, x, target)** → every weight's slope of (y − target)², by the chain rule, backwards from the loss.`,
  remember: [
    'A straight line can\'t bend; tanh units can, and a few of them added together make hills and valleys.',
    'The chain rule multiplies slopes along the path from a weight to the loss.',
    'Backpropagation runs it backwards, reusing each layer\'s slope for the layer before: one pass for every weight.',
    'Check a hand-written backward pass against numerical slopes.',
  ],
  ml: [['hidden units', 'neurons, a hidden layer', 'learned features'], ['tanh', 'activation function', 'the bend'], ['gradients()', 'backpropagation', 'the chain rule, run backwards'], ['comparing with slope()', 'gradient checking', 'the standard test']],
  next: 'Lesson 15: learning one move at a time, in order, is noisy and forgetful. A memory of past moves and small random batches fix both.',
}
