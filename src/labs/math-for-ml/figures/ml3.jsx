// Figures for the sequence, generative and reinforcement-learning lessons.
import { useMemo, useState } from 'react'
import { PyRandom, pyGauss, bptt, sinusoidalPosition, infoNce, klToStandardNormal, normal1, ganValue, optimalDiscriminator, alphaBar, ppoClip } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

export function BPTTFig() {
  const [w, setW] = useState(0.7)
  const xs = [1, 0.5, -0.3, 0.8, 0, 0.2, -0.5, 0.1, 0.4, -0.2, 0.3, 0], [, , reach] = bptt(w, 0.5, xs, 0.9)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="recurrent weight w" value={w} min={0.2} max={3} step={0.1} onChange={setW} /></div>
    <Bars rows={reach.map((r, i) => ({ label: `step ${i + 1}`, value: r, color: C.teal }))} digits={4} />
    <Working rows={[['gradient reaching step 1', 'vs step 12', `${fmt(reach[0], 4)} vs ${fmt(reach.at(-1), 4)}`], ['ratio', 'a product of 11 factors w(1 − h²)', reach.at(-1) ? fmt(reach[0] / reach.at(-1), 4) : '—']]} />
  </div>
}

export function TransformerBlockFig() {
  const [d, setD] = useState(16)
  const rows = 24, codes = Array.from({ length: rows }, (_, pos) => sinusoidalPosition(pos, d)), cell = Math.max(6, Math.floor(320 / d))
  return <div className="qm-fig">
    <svg viewBox="0 0 320 210" className="mm-graph" style={{ maxWidth: 380 }} role="img" aria-label="a pre-norm Transformer block">
      {[['x (residual stream)', 190], ['+ MLP(LN(x))', 120], ['+ Attention(LN(x))', 50]].map(([t, y]) => <g key={t}><rect x={90} y={y - 14} width={150} height={26} rx={5} fill="#1f6f6822" stroke={C.teal} /><text x={165} y={y + 3} textAnchor="middle" fontSize="11">{t}</text></g>)}
      <line x1={60} y1={205} x2={60} y2={10} stroke={C.orange} strokeWidth={3} /><text x={48} y={110} fontSize="10" textAnchor="middle" fill={C.orange} transform="rotate(-90 48 110)">identity path</text>
      <line x1={165} y1={176} x2={165} y2={133} stroke={C.grey} /><line x1={165} y1={106} x2={165} y2={63} stroke={C.grey} />
    </svg>
    <div className="qm-fig-controls"><Slider label="model width d" value={d} min={8} max={64} step={8} onChange={setD} show={v => String(v)} /></div>
    <svg viewBox={`0 0 ${d * cell} ${rows * 8}`} className="mm-graph" style={{ maxWidth: 420 }} role="img" aria-label="sinusoidal position codes">
      {codes.flatMap((row, pos) => row.map((v, i) => <rect key={`${pos}-${i}`} x={i * cell} y={pos * 8} width={cell} height={8} fill={v >= 0 ? C.teal : C.orange} opacity={Math.abs(v)} />))}
    </svg>
    <Working rows={[['parameters per block', '12 d²', String(12 * d * d)], ['position code rows', 'one per position, fast waves on the left', `${rows} × ${d}`]]} />
  </div>
}

export function ContrastiveFig() {
  const [step, setStep] = useState(0), [tau, setTau] = useState(0.2)
  const N = 6, S = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => { const base = 0.3 + 0.2 * Math.sin(i * 1.7 + j * 2.3); return i === j ? Math.min(1, base + 0.06 * step) : Math.max(-1, base - 0.04 * step) }))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><div className="qm-buttons"><button disabled={step >= 15} onClick={() => setStep(step + 1)}>Train a step →</button><button onClick={() => setStep(0)}>Reset</button></div><Slider label="temperature τ" value={tau} min={0.05} max={1} step={0.05} onChange={setTau} /></div>
    <table className="mm-dice mm-truth"><tbody>{S.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} style={{ background: `rgba(31,111,104,${Math.max(0, v)})`, color: v > 0.6 ? '#fff' : undefined }}>{fmt(v, 2)}</td>)}</tr>)}</tbody></table>
    <Working rows={[['InfoNCE', `τ = ${fmt(tau, 2)}`, fmt(infoNce(S, tau), 4)], ['chance level', 'log N', fmt(Math.log(N), 4)]]} />
  </div>
}

export function VAEFig() {
  const [mu, setMu] = useState(1), [logvar, setLogvar] = useState(-0.8)
  const sigma = Math.exp(0.5 * logvar), samples = useMemo(() => { const r = new PyRandom(3); return Array.from({ length: 40 }, () => pyGauss(r)) }, [])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="μ" value={mu} min={-3} max={3} step={0.1} onChange={setMu} /><Slider label="ln σ²" value={logvar} min={-3} max={2} step={0.1} onChange={setLogvar} /></div>
    <Graph x={[-5, 5]} y={[-0.08, Math.max(0.5, normal1(mu, mu, sigma * sigma) * 1.1)]} height={220} fns={[{ f: z => normal1(z, 0, 1), color: C.grey, label: 'prior N(0, 1)', labelAt: -3 }, { f: z => normal1(z, mu, sigma * sigma), color: C.teal, label: 'q(z | x)', labelAt: mu + 1.5 * sigma }]}
      points={samples.map(e => ({ x: mu + sigma * e, y: -0.04, r: 2.5, color: C.orange }))} />
    <Working rows={[['KL(q ‖ prior)', '½(σ² + μ² − 1 − ln σ²)', fmt(klToStandardNormal(mu, logvar), 4)], ['samples (orange)', 'z = μ + σ ε, ε fixed', `σ = ${fmt(sigma, 3)}`]]} />
  </div>
}

const DATA = [0.1, 0.3, 0.4, 0.2]
export function GANFig() {
  const [g, setG] = useState([0.4, 0.1, 0.1, 0.4])
  const total = g.reduce((s, v) => s + v, 0), pg = g.map(v => v / total), dStar = optimalDiscriminator(DATA, pg)
  return <div className="qm-fig">
    <div className="qm-fig-controls">{g.map((v, i) => <Slider key={i} label={`generator weight ${i + 1}`} value={v} min={0.01} max={1} step={0.01} onChange={x => setG(gs => gs.map((y, j) => (j === i ? x : y)))} />)}</div>
    <Graph x={[-0.5, 3.5]} y={[0, 1.1]} height={220} rects={[...DATA.map((p, i) => ({ x: i - 0.35, y: 0, w: 0.3, h: p, color: C.teal, opacity: 0.8 })), ...pg.map((q, i) => ({ x: i + 0.05, y: 0, w: 0.3, h: q, color: C.orange, opacity: 0.8 }))]}
      points={dStar.map((d, i) => ({ x: i, y: d, color: C.violet, label: `D* ${fmt(d, 2)}` }))} />
    <p className="qm-hint">Teal: the data's probabilities. Orange: the generator's (its weights, rescaled to add to 1). Violet: the best discriminator D* = p_data / (p_data + p_g) at each point.</p>
    <Working rows={[['V(D*, G)', 'E_data log D* + E_g log(1 − D*)', fmt(ganValue(dStar, DATA, pg), 4)], ['its minimum', '−log 4, when p_g = p_data', fmt(-Math.log(4), 4)]]} />
  </div>
}

export function DiffusionFig() {
  const [t, setT] = useState(0), betas = Array(100).fill(0.03)
  const pts = useMemo(() => { const r = new PyRandom(5); return Array.from({ length: 160 }, (_, i) => { const a = 2 * Math.PI * i / 160; return [[2 * Math.cos(a), 2 * Math.sin(a)], [pyGauss(r), pyGauss(r)]] }) }, [])
  const ab = alphaBar(betas, t), s = Math.sqrt(ab), n = Math.sqrt(1 - ab)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="step t" value={t} min={0} max={100} step={1} onChange={setT} show={v => String(v)} /></div>
    <Graph x={[-4, 4]} y={[-4, 4]} equal height={260} points={pts.map(([x0, e]) => ({ x: s * x0[0] + n * e[0], y: s * x0[1] + n * e[1], r: 2.5, color: C.teal }))} />
    <Bars rows={[{ label: '√ᾱₜ (signal)', value: s, color: C.teal }, { label: '√(1 − ᾱₜ) (noise)', value: n, color: C.orange }]} digits={3} max={1} />
  </div>
}

const GRID = 5, GOAL = [4, 4], WALLS = new Set(['1,1', '2,3', '3,1'])
export function ValueIterationFig() {
  const [sweeps, setSweeps] = useState(4), gamma = 0.9
  const states = []; for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!WALLS.has(`${r},${c}`)) states.push([r, c])
  const key = (r, c) => `${r},${c}`, moves = [[0, 1], [1, 0], [0, -1], [-1, 0]], arrows = ['→', '↓', '←', '↑']
  const next = (r, c, [dr, dc]) => { const nr = r + dr, nc = c + dc; return nr < 0 || nc < 0 || nr >= GRID || nc >= GRID || WALLS.has(key(nr, nc)) ? [r, c] : [nr, nc] }
  const reward = (r, c) => (r === GOAL[0] && c === GOAL[1] ? 0 : -1)
  let V = Object.fromEntries(states.map(([r, c]) => [key(r, c), 0]))
  for (let s = 0; s < sweeps; s++) { const nv = {}; for (const [r, c] of states) nv[key(r, c)] = r === GOAL[0] && c === GOAL[1] ? 0 : Math.max(...moves.map(m => { const [nr, nc] = next(r, c, m); return reward(r, c) + gamma * V[key(nr, nc)] })); V = nv }
  const best = (r, c) => { let bi = 0, bv = -Infinity; moves.forEach((m, i) => { const [nr, nc] = next(r, c, m), v = V[key(nr, nc)]; if (v > bv) { bv = v; bi = i } }); return arrows[bi] }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="sweeps" value={sweeps} min={1} max={15} step={1} onChange={setSweeps} show={v => String(v)} /></div>
    <table className="mm-dice mm-truth"><tbody>{Array.from({ length: GRID }, (_, r) => <tr key={r}>{Array.from({ length: GRID }, (_, c) => { const k = key(r, c); if (WALLS.has(k)) return <td key={c} style={{ background: '#444' }} />; const v = V[k], goal = r === GOAL[0] && c === GOAL[1]; return <td key={c} style={{ background: `rgba(31,111,104,${1 + v / 10})`, color: '#fff', minWidth: 46 }}>{goal ? 'goal' : `${best(r, c)} ${fmt(v, 1)}`}</td> })}</tr>)}</tbody></table>
    <p className="qm-hint">Reward −1 per step until the goal; γ = 0.9. Each sweep applies V(s) ← maxₐ [R + γ V(s′)] everywhere.</p>
  </div>
}

export function PolicyGradientFig() {
  const [n, setN] = useState(50), [baseline, setBaseline] = useState(false)
  const theta = [0, 0, 0], rewards = [1, 3, -2], pi = [1 / 3, 1 / 3, 1 / 3], J = 2 / 3, exact = pi.map((p, k) => p * (rewards[k] - J))
  const samples = useMemo(() => { const r = new PyRandom(9); return Array.from({ length: 2000 }, () => { const u = r.random(); return u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2 }) }, [])
  const b = baseline ? J : 0
  const per = samples.map(a => theta.map((_, k) => (rewards[a] - b) * ((k === a ? 1 : 0) - pi[k])))
  const est = theta.map((_, k) => per.slice(0, n).reduce((s, g) => s + g[k], 0) / n)
  const spread = Math.sqrt(per.slice(0, n).reduce((s, g) => s + (g[1] - exact[1]) ** 2, 0) / n)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="samples" value={n} min={5} max={2000} step={5} onChange={setN} show={v => String(v)} /><label><input type="checkbox" checked={baseline} onChange={e => setBaseline(e.target.checked)} /> subtract a baseline b = J</label></div>
    <Bars rows={est.flatMap((e, k) => [{ label: `action ${k + 1} estimate`, value: e, color: C.teal }, { label: `action ${k + 1} exact`, value: exact[k], color: C.orange }])} digits={3} max={1.2} />
    <Working rows={[['spread of single-sample gradients', baseline ? 'with baseline' : 'no baseline', fmt(spread, 3)]]} />
  </div>
}

export function PPOFig() {
  const [eps, setEps] = useState(0.2)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="ε" value={eps} min={0.05} max={0.5} step={0.05} onChange={setEps} /></div>
    <Graph x={[0, 2.5]} y={[-2.6, 2.6]} height={250} fns={[{ f: r => ppoClip(r, 1, eps), color: C.teal, label: 'A = +1', labelAt: 2.1 }, { f: r => ppoClip(r, -1, eps), color: C.orange, label: 'A = −1', labelAt: 2.1 }, { f: r => r, color: C.grey, dash: true }, { f: r => -r, color: C.grey, dash: true }]}
      segments={[{ x1: 1 - eps, y1: -2.6, x2: 1 - eps, y2: 2.6, color: C.violet, dash: true }, { x1: 1 + eps, y1: -2.6, x2: 1 + eps, y2: 2.6, color: C.violet, dash: true }]} />
    <p className="qm-hint">Across: the ratio r = π_new / π_old. Up: the per-sample objective. Dashed grey: the unclipped rA.</p>
    <Working rows={[['A > 0', `flat beyond r = ${fmt(1 + eps, 2)}`, 'no push past the clip'], ['A < 0', `flat below r = ${fmt(1 - eps, 2)}`, 'full penalty above 1']]} />
  </div>
}
