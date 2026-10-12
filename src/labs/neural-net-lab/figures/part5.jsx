import { useEffect, useMemo, useState } from 'react'
import XYPlot from './XYPlot.jsx'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { fmt } from '../../python-steps/format.js'
import { valley, valleyGradient, race, BEST_RATES, noisyPoints } from '../engine/part5.js'
import { makeCurve } from '../engine/part1.js'
import { makeMLP, makeOptimizer, trainSteps, predictOne, lossAndGradients } from '../engine/mlp.js'
import { PyRandom } from '../../qmaze-lab/engine/mt.js'

const COLORS = { sgd: '#7a3fb0', momentum: '#1f6f68', adam: '#c26a12' }
const LABELS = { sgd: 'plain gradient descent', momentum: 'momentum', adam: 'Adam' }

// Three optimisers down the same narrow valley, and each one's arithmetic at any step.
export function ValleyRace() {
  const [rates, setRates] = useState(BEST_RATES), [t, setT] = useState(60), [focus, setFocus] = useState('adam')
  const runs = useMemo(() => Object.fromEntries(Object.keys(rates).map(k => [k, race(k, rates[k])])), [rates])
  const W = 460, H = 210, X = w => 20 + (w + 10) / 13 * (W - 40), Y = w => H / 2 - w * 60
  const levels = [1, 4, 16, 50, 150]
  const r = runs[focus], w = r.path[Math.max(0, t - 1)], g = valleyGradient(w), st = r.states[t] ?? {}, next = r.path[t]
  return <div className="qm-fig">
    <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot" role="img" aria-label="three optimisers down a narrow valley">
      <rect width={W} height={H} fill="#fffdf8" />
      {levels.map(L => <ellipse key={L} cx={X(0)} cy={Y(0)} rx={Math.sqrt(2 * L) / 13 * (W - 40)} ry={Math.sqrt(2 * L / 100) * 60} fill="none" stroke="#e2dacb" />)}
      <circle cx={X(0)} cy={Y(0)} r="4" fill="#2c241b" /><text x={X(0) + 6} y={Y(0) - 6} className="qm-tick">lowest point</text>
      {Object.entries(runs).map(([k, run]) => <g key={k}><polyline points={run.path.slice(0, t + 1).map(([a, b]) => `${X(a)},${Y(Math.max(-1.7, Math.min(1.7, b)))}`).join(' ')} fill="none" stroke={COLORS[k]} strokeWidth={k === focus ? 2.2 : 1.3} />
        <circle cx={X(run.path[t][0])} cy={Y(Math.max(-1.7, Math.min(1.7, run.path[t][1])))} r="4.5" fill={COLORS[k]} /></g>)}
      <circle cx={X(-9)} cy={Y(1.5)} r="5" fill="none" stroke="#2c241b" /><text x={X(-9)} y={Y(1.5) - 9} className="qm-tick">start</text>
      <text x={W - 6} y={H - 6} textAnchor="end" className="qm-tick">w₁ (the flat direction) →</text><text x="6" y="14" className="qm-tick">↑ w₂ (100× steeper)</text>
    </svg>
    <div className="qm-fig-controls"><Slider label="step" value={t} min={1} max={60} step={1} onChange={setT} />
      {Object.keys(rates).map(k => <Slider key={k} label={`${LABELS[k]} rate`} value={rates[k]} min={k === 'adam' ? 0.05 : 0.001} max={k === 'adam' ? 2 : 0.025} step={k === 'adam' ? 0.05 : 0.001} onChange={v => setRates(o => ({ ...o, [k]: v }))} />)}</div>
    <table className="qm-log"><tbody>{Object.entries(runs).map(([k, run]) => <tr key={k}><th style={{ textAlign: 'left', color: COLORS[k] }}><label><input type="radio" checked={focus === k} onChange={() => setFocus(k)} /> {LABELS[k]}</label></th><td>rate {rates[k]}</td><td>error after step {t}: <b>{fmt(valley(run.path[t]), 4)}</b></td></tr>)}</tbody></table>
    <div className="nn-work">{`step ${t} of ${LABELS[focus]}, from w = (${fmt(w[0], 4)}, ${fmt(w[1], 4)})
slope:       g = (w₁, 100·w₂) = (${fmt(g[0], 4)}, ${fmt(g[1], 4)})
` + (focus === 'sgd' ? `step:        w − rate·g = (${fmt(next[0], 4)}, ${fmt(next[1], 4)})`
      : focus === 'momentum' ? `velocity:    v ← 0.9·v + g = (${fmt(st.velocity?.[0], 4)}, ${fmt(st.velocity?.[1], 4)})
step:        w − rate·v = (${fmt(next[0], 4)}, ${fmt(next[1], 4)})`
        : `m ← 0.9·m + 0.1·g        = (${fmt(st.m?.[0], 4)}, ${fmt(st.m?.[1], 4)})      average slope
v ← 0.999·v + 0.001·g²   = (${fmt(st.v?.[0], 4)}, ${fmt(st.v?.[1], 4)})      average squared slope
m̂ = m/(1 − 0.9^${t}),  v̂ = v/(1 − 0.999^${t})
step size per weight = rate·m̂/√v̂ = (${fmt(w[0] - next[0], 4)}, ${fmt(w[1] - next[1], 4)})
new w = (${fmt(next[0], 4)}, ${fmt(next[1], 4)})`)}</div>
    <p className="qm-hint">Plain gradient descent's rate is capped by the steep direction (above about 0.02 it bounces out of the valley), so along the flat direction it crawls. Momentum builds up speed along the valley floor; Adam divides each weight's step by the size of its own slopes, so both directions move at a similar pace.</p>
  </div>
}

// The same network trained at four learning rates.
export function LearningRateFig() {
  const [curves, setCurves] = useState(null)
  useEffect(() => {
    const [xs, ys] = makeCurve(40, 0), X = xs.map(x => [x]), Y = ys.map(y => [y])
    setCurves([[0.003, '#9aa7b0'], [0.03, '#1f6f68'], [0.3, '#c26a12'], [1.5, '#a8402f']].map(([rate, color]) => {
      const net = makeMLP(1, [{ units: 16, activation: 'relu' }, { units: 1 }], 0), opt = makeOptimizer(net, { kind: 'sgd', rate }), values = []
      for (let s = 0; s < 300; s++) { const l = trainSteps(net, opt, X, Y, 1); values.push(Number.isFinite(l) ? Math.min(l, 2) : 2) }
      return { values, color, label: `rate ${rate}` }
    }))
  }, [])
  if (!curves) return <div className="qm-fig"><p className="qm-hint">Training…</p></div>
  return <div className="qm-fig"><Plot series={curves} window={1} x="step" label="loss for four learning rates" height={190} />
    <p className="qm-hint">The same 1 → 16 → 1 network and data (lesson 1.7's curve), plain gradient descent. 0.003: barely moves. 0.03: steady. 0.3: fast. 1.5: the loss leaps about and blows up (drawn at the top). Rates are tried by factors (×3, ×10), not by small nudges.</p></div>
}

// Two experiments about the starting weights.
function gauss(rng) { return Math.sqrt(-2 * Math.log(1 - rng.random())) * Math.cos(2 * Math.PI * rng.random()) }
export function InitFig() {
  const [scale, setScale] = useState(1)
  const spreads = useMemo(() => {
    const rng = new PyRandom(0), width = 64
    let h = Array.from({ length: 128 }, () => Array.from({ length: width }, () => gauss(rng)))
    const out = []
    for (let layer = 0; layer < 8; layer++) {
      const W = Array.from({ length: width }, () => Array.from({ length: width }, () => gauss(rng) * scale / Math.sqrt(width)))
      h = h.map(row => W[0].map((_, k) => Math.tanh(row.reduce((s, v, j) => s + v * W[j][k], 0))))
      const all = h.flat(), mean = all.reduce((a, b) => a + b, 0) / all.length
      out.push(Math.sqrt(all.reduce((s, v) => s + (v - mean) ** 2, 0) / all.length))
    }
    return out
  }, [scale])
  const same = useMemo(() => {
    const net = makeMLP(1, [{ units: 4, activation: 'tanh' }, { units: 1 }], 0)
    net.layers.forEach(l => { l.W.forEach(r => r.fill(0.5)); l.b.fill(0.5) })
    const xs = Array.from({ length: 20 }, (_, i) => -2 + 4 * i / 19), opt = makeOptimizer(net, { rate: 0.1 })
    trainSteps(net, opt, xs.map(x => [x]), xs.map(x => [Math.sin(x)]), 200)
    return net.layers[0].W.map(r => r[0])
  }, [])
  return <div className="qm-fig">
    <h4 className="qm-small-h">1. Every weight starting at 0.5</h4>
    <p className="mono">hidden weights after 200 steps: [{same.map(w => fmt(w, 4)).join(', ')}]</p>
    <p className="qm-hint">All four hidden neurons start the same, so they get the same gradient, so they stay the same: four neurons doing the work of one. Random starting weights break the tie.</p>
    <h4 className="qm-small-h">2. How big should random weights be?</h4>
    <Slider label="weight size (× 1/√64)" value={scale} min={0.25} max={4} step={0.25} onChange={setScale} />
    <div className="cp-bars">{spreads.map((s, i) => [<span key={`l${i}`}>after layer {i + 1}</span>, <span key={`b${i}`}><span className="cp-bar" style={{ display: 'block', width: `${Math.min(1, s) * 100}%`, background: s < 0.1 ? '#9aa7b0' : s > 0.8 ? '#a8402f' : '#1f6f68' }} /></span>, <b key={`v${i}`} className="mono">{fmt(s, 3)}</b>])}</div>
    <p className="qm-hint">The typical size of the numbers after each of 8 tanh layers. Too small and they shrink towards 0 layer after layer (grey: the signal dies); too big and every tanh is pushed to ±1 (red: saturated, its slope near 0, so gradients die). Around 1/√(inputs) keeps it alive: that is why PyTorch draws starting weights in ±1/√(inputs).</p>
  </div>
}

// A big network on 30 noisy points: watch it overfit, and try the cures.
export function OverfitFig() {
  const [settings, setSettings] = useState({ weightDecay: 0, dropout: 0 })
  const [run, setRun] = useState(null), [busy, setBusy] = useState(false)
  const data = useMemo(() => { const [xs, ys] = noisyPoints(30, 0, 0.3), [tx, ty] = noisyPoints(200, 100, 0); return { X: xs.map(x => [x]), Y: ys.map(y => [y]), TX: tx.map(x => [x]), TY: ty.map(y => [y]), xs, ys } }, [])
  const train = () => {
    setBusy(true)
    const net = makeMLP(1, [{ units: 64, activation: 'relu' }, { units: 64, activation: 'relu' }, { units: 1 }], 0)
    const opt = makeOptimizer(net, { kind: 'adam', rate: 0.01, weightDecay: settings.weightDecay }), rng = new PyRandom(0)
    const tr = [], te = []
    let done = 0, best = { error: Infinity, step: 0, snapshot: null }
    const tick = () => {
      for (let i = 0; i < 50; i++) {
        trainSteps(net, opt, data.X, data.Y, 1, 'mse', { dropout: settings.dropout, rng })
        done++
        if (done % 10 === 0) {
          tr.push(lossAndGradients(net, data.X, data.Y).loss); const e = lossAndGradients(net, data.TX, data.TY).loss; te.push(e)
          if (e < best.error) best = { error: e, step: done, snapshot: JSON.parse(JSON.stringify(net)) }
        }
      }
      setRun({ net: JSON.parse(JSON.stringify(net)), tr: [...tr], te: [...te], best, done, settings })
      if (done < 3000) setTimeout(tick, 0); else setBusy(false)
    }
    tick()
  }
  const set = (k, v) => setSettings(o => ({ ...o, [k]: v }))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>weight decay <select value={settings.weightDecay} onChange={e => set('weightDecay', Number(e.target.value))}>{[0, 0.001, 0.01].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label>dropout <select value={settings.dropout} onChange={e => set('dropout', Number(e.target.value))}>{[0, 0.2, 0.5].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <button className="qm-primary" onClick={train} disabled={busy}>{busy ? `Training… step ${run?.done ?? 0} of 3,000` : 'Train 1 → 64 → 64 → 1 for 3,000 steps'}</button>
    </div>
    <div className="nn-row">
      <XYPlot points={data.xs.map((x, i) => [x, data.ys[i]])} x={[-3, 3]} y={[-2, 2]} curves={[{ f: Math.sin, color: '#9aa7b0', dash: '4 4', width: 1.2 }, ...(run ? [{ f: x => predictOne(run.net, [x])[0], width: 2.4 }, { f: x => predictOne(run.best.snapshot, [x])[0], color: '#c26a12', width: 1.4, dash: '6 3' }] : [])]} />
      <div>{run ? <><Plot series={[{ values: run.tr, color: '#1f6f68', label: 'training points' }, { values: run.te, color: '#c26a12', label: 'the true curve' }]} window={1} x="10 steps" label="error on the training points and on the true curve" height={160} />
        <p className="mono">now (step {run.done}): training {fmt(run.tr.at(-1), 4)}, true curve {fmt(run.te.at(-1), 4)} · best on the true curve {fmt(run.best.error, 4)} at step {run.best.step}</p></> : <p className="qm-hint">Train it, then try weight decay and dropout.</p>}</div>
    </div>
    <p className="qm-hint">Teal line: the network now. Dashed orange: the network at its best moment (early stopping would keep that one). Grey dashes: the true sin(x) the noisy points came from. A network with 4,353 weights and 30 points can bend through every point, noise and all.</p>
  </div>
}
