import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import Cart, { fmt } from './Cart.jsx'
import Plot from './Plot.jsx'
import { LineView, WeightsView } from './pictures.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { gradients, loss, predict, XS, YS, scoresOf, softmax, trainLinear } from '../engine/linear.js'
import { CartPole, SYMBOLS, ARROWS } from '../engine/cartpole.js'
import measured from '../engine/measured.json'

// Gradient descent on one neuron, a step at a time, with the slopes written out.
export function NeuronFig() {
  const [rate, setRate] = useState(0.05)
  const [wb, setWb] = useState([0, 0]), [history, setHistory] = useState([loss(0, 0)])
  const [w, b] = wb
  const [gw, gb] = gradients(w, b)
  const step = n => {
    let [x, y] = wb; const h = []
    for (let i = 0; i < n; i++) { const [a, c] = gradients(x, y); x = x - rate * a; y = y - rate * c; h.push(loss(x, y)) }
    setWb([x, y]); setHistory(old => [...old, ...h].slice(-400))
  }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="rate" value={rate} min={0.005} max={0.3} step={0.005} onChange={setRate} />
      <button onClick={() => step(1)}>One step</button><button onClick={() => step(10)}>10 steps</button><button onClick={() => { setWb([0, 0]); setHistory([loss(0, 0)]) }}>↺ Start again</button></div>
    <div className="cp-row">
      <LineView w={w} b={b} />
      <div>
        <div className="cp-work">{`points: ${XS.map((x, i) => `(${x}, ${YS[i]})`).join(' ')}
errors:  ${XS.map((x, i) => fmt(predict(w, b, x) - YS[i], 3)).join(', ')}
loss    = mean(error²)      = `}<b>{fmt(loss(w, b), 4)}</b>{`
grad_w  = mean(2·error·x)   = ${fmt(gw, 4)}
grad_b  = mean(2·error)     = ${fmt(gb, 4)}
next w  = ${fmt(w, 4)} − ${fmt(rate)} × ${fmt(gw, 4)} = ${fmt(w - rate * gw, 4)}
next b  = ${fmt(b, 4)} − ${fmt(rate)} × ${fmt(gb, 4)} = ${fmt(b - rate * gb, 4)}`}</div>
        <Plot series={[{ values: history, color: '#1f6f68' }]} window={1} x="step" from={0} label="loss" height={120} />
      </div>
    </div>
    <p className="qm-hint">{rate > 0.14 ? 'With a rate this big the steps overshoot: watch the loss grow instead of shrink.' : 'Each step moves w and b against their slopes; the loss falls fast at first, then slowly.'}</p>
  </div>
}

// Two scores into two probabilities.
export function SoftmaxFig() {
  const [z, setZ] = useState([1.0, 0.0])
  const p = softmax(z)
  return <div className="qm-fig">
    {z.map((v, a) => <div key={a} className="cp-slider-row"><span>score {a} ({a ? 'right' : 'left'})</span><input type="range" min={-5} max={5} step={0.05} value={v} onChange={e => setZ(old => old.map((x, k) => k === a ? Number(e.target.value) : x))} aria-label={`score ${a}`} /><b className="mono">{fmt(v, 2)}</b><span /></div>)}
    <div className="cp-bars">{p.map((q, a) => [<span key={`l${a}`}>π({a ? 'right' : 'left'})</span>, <span key={`b${a}`}><span className="cp-bar" style={{ display: 'block', width: `${q * 100}%` }} /></span>, <b key={`v${a}`} className="mono">{fmt(q, 4)}</b>])}</div>
    <p className="mono">e^{fmt(z[0], 2)} = {fmt(Math.exp(z[0]), 4)}, e^{fmt(z[1], 2)} = {fmt(Math.exp(z[1]), 4)}; total {fmt(Math.exp(z[0]) + Math.exp(z[1]), 4)}</p>
    <div className="qm-buttons"><button onClick={() => setZ(old => old.map(x => x + 1))}>add 1 to both scores</button><span className="qm-hint">Only the difference of the scores matters: π(right) = 1 / (1 + e^(score 0 − score 1)) = {fmt(1 / (1 + Math.exp(z[0] - z[1])), 4)}.</span></div>
  </div>
}

// One policy-gradient step on one move: the slopes, every weight's change, and π before and after.
export function PolicyGradientFig() {
  const [weights] = useState([[0.0, 0.1, -0.3, -0.5], [0.0, -0.1, 0.3, 0.5]])
  const state = [0.05, 0.2, 0.03, 0.4]
  const [action, setAction] = useState(1), [advantage, setAdvantage] = useState(5), [rate, setRate] = useState(0.1)
  const probs = softmax(scoresOf(weights, state))
  const slopes = probs.map((p, a) => (a === action ? 1 : 0) - p)
  const after = weights.map((row, a) => row.map((w, i) => w + rate * advantage * slopes[a] * state[i]))
  const probsAfter = softmax(scoresOf(after, state))
  return <div className="qm-fig">
    <p className="mono">state s = ({state.join(', ')}) · weights: left [{weights[0].join(', ')}], right [{weights[1].join(', ')}]</p>
    <div className="qm-fig-controls">
      <label>action taken <select value={action} onChange={e => setAction(Number(e.target.value))}><option value={0}>0 (left)</option><option value={1}>1 (right)</option></select></label>
      <Slider label="advantage A" value={advantage} min={-10} max={10} step={0.5} onChange={setAdvantage} />
      <Slider label="rate" value={rate} min={0} max={0.5} step={0.01} onChange={setRate} />
    </div>
    <div className="cp-work">{`scores  = [${scoresOf(weights, state).map(x => fmt(x, 4)).join(', ')}]   π = [${probs.map(x => fmt(x, 4)).join(', ')}]
slope   = 1[a = k] − π_k  = [${slopes.map(x => fmt(x, 4)).join(', ')}]      (∂ log π(a|s) / ∂ score_k)
change  = rate · A · slope_k · s_i:
`}{after.map((row, a) => `  ${a ? 'right' : 'left '}: ${row.map((w, i) => fmt(w - weights[a][i], 4)).join(', ')}\n`)}{`π after = [${probsAfter.map(x => fmt(x, 4)).join(', ')}]`}</div>
    <p>π(action {action}) went from <b>{fmt(probs[action], 4)}</b> to <b>{fmt(probsAfter[action], 4)}</b>: {advantage > 0 ? 'a better-than-usual move becomes likelier' : advantage < 0 ? 'a worse-than-usual move becomes less likely' : 'an ordinary move: no change'}. The two rows change by equal and opposite amounts, because the two slopes always add up to 0.</p>
  </div>
}

// REINFORCE with a linear policy, in the browser, with Python's random numbers.
export function LinearTrainer() {
  const [settings, setSettings] = useState({ episodes: 300, rate: 0.1, gamma: 0.99, seed: 0 })
  const run = useRef(null), [, redraw] = useReducer(x => x + 1, 0)
  const key = JSON.stringify(settings)
  if (!run.current || run.current.key !== key) run.current = { key, gen: trainLinear(settings), last: null, done: false }
  const advance = all => {
    const r = run.current
    for (let i = 0; i < (all ? 1e6 : 1); i++) { const step = r.gen.next(); if (step.done) { r.done = true; break } r.last = step.value }
    redraw()
  }
  const r = run.current, u = r.last
  const game = useMemo(() => {
    if (!u) return null
    const env = new CartPole(), W = u.weights.map(row => [...row])
    let [st] = env.reset(2000); const trail = [st]; let res
    do { const p = softmax(scoresOf(W, st)); res = env.step(p[1] > p[0] ? 1 : 0); st = res[0]; trail.push(st) } while (!res[2] && !res[3])
    return trail
  }, [u?.episode])
  const [t, setT] = useState(0), [playing, setPlaying] = useState(false)
  useEffect(() => { setT(0) }, [game])
  useEffect(() => {
    if (!playing || !game) return undefined
    const id = setInterval(() => setT(i => { if (i + 1 >= game.length) { setPlaying(false); return i } return i + 1 }), 20)
    return () => clearInterval(id)
  }, [playing, game])
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <Slider label="rate" value={settings.rate} min={0.01} max={0.5} step={0.01} onChange={v => setSettings(o => ({ ...o, rate: v }))} />
      <label>Seed <input type="number" value={settings.seed} onChange={e => setSettings(o => ({ ...o, seed: Number(e.target.value) || 0 }))} style={{ width: 56 }} /></label>
      <button onClick={() => advance(false)} disabled={r.done}>One game</button>
      <button className="qm-primary" onClick={() => advance(true)} disabled={r.done}>Train all 300 games</button>
      <button onClick={() => { run.current = null; redraw() }}>↺ Start again</button>
    </div>
    {u ? <div className="cp-row">
      <div>
        <p>Game {u.episode + 1} lasted <b>{u.length}</b> steps. Baseline (its average return) {fmt(u.baseline, 2)}. The update moved the weights:</p>
        <WeightsView weights={u.weights} before={u.before} />
        <Plot series={[{ values: u.lengths, color: '#b5650d' }]} x="game" label="game lengths" />
      </div>
      <div>
        {game && <><Cart state={game[t]} height={150} label={`greedy policy now, a new game: step ${t} of ${game.length - 1}`} fallen={t === game.length - 1 && game.length < 501} />
          <div className="qm-buttons"><button onClick={() => setPlaying(p => !p)}>{playing ? '⏸' : '▶ Watch the policy play'}</button></div></>}
      </div>
    </div> : <p className="qm-hint">All 8 weights start at 0: π = ½ for each push, a coin toss. Press <b>One game</b>.</p>}
  </div>
}

// Learning curves measured in Python (tools/measure.py): one line per seed.
const COLORS = ['#b5650d', '#1f6f68', '#7a3fb0']
export function Measured({ method = 'reinforce', window = 20 }) {
  const runs = measured[method] ?? []
  if (!runs.length) return <p className="qm-hint">No measurements recorded for {method}.</p>
  const greedy = runs.map(r => r.greedy.reduce((a, b) => a + b, 0) / r.greedy.length)
  return <div className="qm-fig">
    <Plot series={runs.map((r, i) => ({ values: r.lengths, color: COLORS[i % 3], label: `seed ${r.seed}` }))} window={window} x="game" label={`${method} learning curves`} />
    <p className="qm-hint">Game lengths while training (moving average of {window}), measured in Python with <span className="mono">tools/measure.py</span>. Greedy play afterwards, 20 new games: {runs.map((r, i) => `seed ${r.seed}: ${fmt(greedy[i], 1)}`).join(' · ')}. Training took {runs.map(r => `${r.seconds} s`).join(', ')} ({runs.map(r => r.steps.toLocaleString()).join(', ')} steps).</p>
  </div>
}

export { ARROWS, SYMBOLS }
