import { useMemo, useState } from 'react'
import { fmt } from './Cart.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { frozenGames, gameGradient, summarise } from '../engine/linear.js'

// 4.5: REINFORCE's gradient from single games of one frozen policy (gradient_noise.py): each dot is
// what one game alone says the gradient is, for the θ and θ̇ weights of the right push. Grey: no
// baseline. Teal: the baseline chosen with the slider. The same 2,000 games for both.
export function GradientNoiseFig({ trainingGames = 20 }) {
  const [baseline, setBaseline] = useState(25)
  const [ready, setReady] = useState(false)
  const data = useMemo(() => ready ? frozenGames({ trainingGames, games: 2000 }) : null, [ready, trainingGames])
  const plain = useMemo(() => data && data.games.map(g => gameGradient(g, 0)), [data])
  const based = useMemo(() => data && data.games.map(g => gameGradient(g, baseline)), [data, baseline])
  if (!data) return <div className="qm-fig"><div className="qm-buttons"><button className="qm-primary" onClick={() => setReady(true)}>Play 2,000 games with the frozen policy</button><span className="qm-hint">The policy after {trainingGames} games of training (seed 0). Takes a second.</span></div></div>
  const A = summarise(plain), B = summarise(based)
  const lengths = data.games.map(g => g.states.length)
  const W = 420, H = 300, lim = [25, 110]   // the θ and θ̇ parts, in plot units
  const X = v => W / 2 + Math.max(-1, Math.min(1, v / lim[0])) * (W / 2 - 8), Y = v => H / 2 - Math.max(-1, Math.min(1, v / lim[1])) * (H / 2 - 8)
  const row = (label, s, color) => <tr><td style={{ color }}><b>{label}</b></td><td>{fmt(s.mean[2], 2)}, {fmt(s.mean[3], 2)}</td><td>{fmt(s.spread[2], 2)}, {fmt(s.spread[3], 2)}</td><td><b>{Math.round(s.agree * 100)}%</b></td></tr>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="baseline b" value={baseline} min={0} max={80} step={1} onChange={setBaseline} /><span className="qm-hint">2,000 games: lengths {Math.min(...lengths)} to {Math.max(...lengths)}, average {fmt(lengths.reduce((a, b) => a + b, 0) / lengths.length, 1)}</span></div>
    <div className="qm-fig-row">
      <svg viewBox={`0 0 ${W} ${H}`} className="qm-plot" style={{ maxWidth: W }} role="img" aria-label="single-game gradients">
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#eee5d6" /><line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="#eee5d6" />
        {plain.map((g, k) => <circle key={`a${k}`} cx={X(g[2])} cy={Y(g[3])} r={1.6} fill="#999" opacity={0.35} />)}
        {based.map((g, k) => <circle key={`b${k}`} cx={X(g[2])} cy={Y(g[3])} r={1.6} fill="#1f6f68" opacity={0.35} />)}
        <circle cx={X(A.mean[2])} cy={Y(A.mean[3])} r={6} fill="none" stroke="#c26a12" strokeWidth={2.5} />
        <text x={W - 6} y={H / 2 - 4} className="qm-tick" textAnchor="end">θ part →</text><text x={W / 2 + 4} y={12} className="qm-tick">↑ θ̇ part</text>
      </svg>
      <div className="qm-fig-side">
        <table className="qm-log mono"><thead><tr><th></th><th>average (θ, θ̇)</th><th>spread</th><th>points the average's way</th></tr></thead>
          <tbody>{row('no baseline', A, '#777')}{row(`b = ${baseline}`, B, '#1f6f68')}</tbody></table>
        <p className="qm-small">Each dot is one game's whole estimate of the gradient (the orange ring is the average of all 2,000). Points outside the box are drawn on its edge. Move the slider: the cloud tightens or spreads, but its centre barely moves.</p>
      </div>
    </div>
  </div>
}
