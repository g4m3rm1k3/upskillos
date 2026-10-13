// Part 5 figures: linear regression by hand and by gradient descent, ridge, logistic regression with
// per-example cross-entropy, softmax and its gradient, entropy/cross-entropy/KL, the tiny network
// forward and backward (checked numerically), gradient descent against Adam, and attention.
import { useMemo, useState } from 'react'
import { HOURS, SCORES, STUDY, PASSED, mse, fitLine, exactLine, ridgeLine, fitLogistic, bce, sigmoid, softmax, crossEntropy, entropy, kl, tinyNet, backprop, adam, attention, dot } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

export function RegressionFig({ train = false }) {
  const [w, setW] = useState(4), [b, setB] = useState(48), [step, setStep] = useState(0)
  const [ew, eb] = exactLine(HOURS, SCORES)
  const path = useMemo(() => { const p = [[0, 0]]; fitLine(HOURS, SCORES, 0.02, 2000, (s, a, c) => p.push([a, c])); return p }, [])
  const [lw, lb] = train ? path[step] : [w, b]
  const misses = HOURS.map((x, i) => lw * x + lb - SCORES[i])
  const marks = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]
  return <div className="qm-fig">
    <div className="qm-fig-controls">{train ? <Slider label="gradient-descent steps" value={marks.indexOf(step) >= 0 ? marks.indexOf(step) : 0} min={0} max={marks.length - 1} step={1} onChange={k => setStep(marks[k])} show={k => String(marks[k])} />
      : <><Slider label="w" value={w} min={0} max={8} step={0.1} onChange={setW} /><Slider label="b" value={b} min={30} max={60} step={0.5} onChange={setB} /></>}</div>
    <Graph x={[0, 7]} y={[40, 80]} fns={[{ f: x => lw * x + lb, label: 'ŷ = wx + b' }, { f: x => ew * x + eb, dash: true, color: C.grey }]} segments={HOURS.map((x, i) => ({ x1: x, y1: SCORES[i], x2: x, y2: SCORES[i] + misses[i], color: C.red }))} points={HOURS.map((x, i) => ({ x, y: SCORES[i], color: C.orange }))} xlabel="hours" ylabel="score" />
    <Working rows={[['line', 'w, b', `${fmt(lw, 3)}, ${fmt(lb, 3)}`], ['J (mean squared error)', '(1/n) Σ (ŷᵢ − yᵢ)²', fmt(mse(lw, lb, HOURS, SCORES), 4)], ['best possible (dashed)', 'normal equations', `w = ${fmt(ew, 3)}, b = ${fmt(eb, 3)}, J = ${fmt(mse(ew, eb, HOURS, SCORES), 4)}`]]} />
  </div>
}

export function RidgeFig() {
  const [lam, setLam] = useState(0)
  const [w, b] = ridgeLine(HOURS, SCORES, lam)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="λ" value={lam} min={0} max={30} step={0.5} onChange={setLam} /></div>
    <Graph x={[0, 7]} y={[40, 80]} fns={[{ f: x => w * x + b, label: `λ = ${fmt(lam)}` }, { f: () => SCORES.reduce((a, c) => a + c, 0) / SCORES.length, dash: true, color: C.grey, label: 'average score' }]} points={HOURS.map((x, i) => ({ x, y: SCORES[i], color: C.orange }))} />
    <Working rows={[['slope w', '', fmt(w, 4)], ['fit part J', 'mean squared error', fmt(mse(w, b, HOURS, SCORES), 4)], ['penalty λ w²', `${fmt(lam)} × ${fmt(w, 3)}²`, fmt(lam * w * w, 4)]]} />
  </div>
}

export function LogisticFig() {
  const [[w, b]] = useState(() => fitLogistic(STUDY, PASSED)), [tw, setTw] = useState(null)
  const lw = tw ?? w
  const losses = STUDY.map((x, i) => bce(sigmoid(lw * x + b), PASSED[i]))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="w (try changing it)" value={lw} min={0} max={4} step={0.05} onChange={setTw} /><button onClick={() => setTw(null)}>Back to the trained w</button></div>
    <Graph x={[0, 5.5]} y={[-0.1, 1.1]} height={230} fns={[{ f: x => sigmoid(lw * x + b), label: 'p = σ(wx + b)', labelAt: 1.6 }]} points={STUDY.map((x, i) => ({ x, y: PASSED[i], color: PASSED[i] ? C.teal : C.orange }))} xlabel="hours studied" ylabel="P(pass)" />
    <Bars digits={3} rows={STUDY.map((x, i) => ({ label: `${x} h, ${PASSED[i] ? 'passed' : 'failed'}: p = ${fmt(sigmoid(lw * x + b), 2)}`, value: losses[i], color: PASSED[i] ? C.teal : C.orange }))} />
    <Working rows={[['average cross-entropy', '(1/n) Σ −[y log p + (1 − y) log(1 − p)]', fmt(losses.reduce((a, c) => a + c, 0) / losses.length, 4)]]} />
  </div>
}

export function SoftmaxFig() {
  const [z, setZ] = useState([2, 1, 0]), [target, setTarget] = useState(1), [temp, setTemp] = useState(1)
  const p = softmax(z.map(v => v / temp))
  return <div className="qm-fig">
    <div className="qm-fig-controls">{z.map((v, i) => <Slider key={i} label={`score z${i + 1}`} value={v} min={-4} max={6} step={0.25} onChange={x => setZ(zs => zs.map((q, k) => k === i ? x : q))} />)}<Slider label="temperature" value={temp} min={0.2} max={5} step={0.1} onChange={setTemp} />
      <label>True class <select value={target} onChange={e => setTarget(Number(e.target.value))}>{z.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label></div>
    <Working rows={[['e^(z/T)', z.map(v => fmt(Math.exp(v / temp), 3)).join(', '), ''], ['÷ their sum', fmt(z.reduce((a, v) => a + Math.exp(v / temp), 0), 3), p.map(x => fmt(x, 3)).join(', ')], ['cross-entropy', `−log p${target + 1}`, fmt(crossEntropy(p, target), 4)], ['gradient p − y', '', p.map((x, i) => fmt(x - (i === target ? 1 : 0), 3)).join(', ')]]} />
    <Bars max={1} digits={3} rows={p.map((x, i) => ({ label: `class ${i + 1}${i === target ? ' (true)' : ''}`, value: x, mark: i === target }))} />
    <p className="qm-hint">Temperature divides the scores before softmax: low makes it sharper (nearly argmax), high makes it flatter. Language models use it to control randomness.</p>
  </div>
}

export function EntropyFig() {
  const [pa, setPa] = useState(0.7), [qa, setQa] = useState(0.5)
  const p = [pa, 1 - pa], q = [qa, 1 - qa], H = entropy(p), CE = -(p[0] * Math.log(q[0]) + p[1] * Math.log(q[1]))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="truth p(heads)" value={pa} min={0.01} max={0.99} step={0.01} onChange={setPa} /><Slider label="belief q(heads)" value={qa} min={0.01} max={0.99} step={0.01} onChange={setQa} /></div>
    <Bars digits={4} max={Math.max(1, CE)} rows={[{ label: 'entropy H(p)', value: H, color: C.teal }, { label: 'KL(p ‖ q)', value: kl(p, q), color: C.orange }, { label: 'cross-entropy H(p, q)', value: CE, color: C.violet }]} />
    <Graph x={[0, 1]} y={[0, 3]} height={180} fns={[{ f: x => -(pa * Math.log(x) + (1 - pa) * Math.log(1 - x)), label: 'H(p, q) as q varies' }, { f: () => H, dash: true, color: C.teal, label: 'H(p)' }]} points={[{ x: qa, y: CE, color: C.violet }]} xlabel="q(heads)" />
    <p className="qm-hint">H(p, q) = H(p) + KL(p ‖ q). The lowest cross-entropy is at q = p, where KL is 0.</p>
  </div>
}

const NET = [[[0.5, -0.3], [0.2, 0.8]], [0.1, -0.1], [1, -1], 0.2]
export function NetworkFig({ backward = false }) {
  const [x, setX] = useState([1, 2]), [y] = useState(1)
  const [yhat, h] = tinyNet(NET, x), [gW1, gb1, gw2, gb2] = backprop(NET, x, y)
  const loss = p => (tinyNet(p, x)[0] - y) ** 2, eps = 1e-6
  const numeric = (() => { const q = JSON.parse(JSON.stringify(NET)); q[0][0][1] += eps; return (loss(q) - loss(NET)) / eps })()
  const W = 460, H = 230, node = (cx, cy, label, val, color) => <g key={label}><circle cx={cx} cy={cy} r="24" fill="#fff" stroke={color} strokeWidth="2" /><text x={cx} y={cy - 2} textAnchor="middle" className="mm-node">{label}</text><text x={cx} y={cy + 12} textAnchor="middle" className="mm-nodeval">{fmt(val, 3)}</text></g>
  const edge = (x1, y1, x2, y2, w, g, k) => <g key={k}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={w >= 0 ? C.teal : C.red} strokeWidth={1 + 2 * Math.abs(w)} opacity="0.7" /><text x={x1 + (x2 - x1) * (y1 === y2 ? 0.5 : 0.28)} y={y1 + (y2 - y1) * (y1 === y2 ? 0.5 : 0.28) - 5} textAnchor="middle" className="mm-edge">{backward ? `∂ ${fmt(g, 3)}` : `w ${fmt(w, 2)}`}</text></g>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="x₁" value={x[0]} min={-2} max={3} step={0.25} onChange={v => setX([v, x[1]])} /><Slider label="x₂" value={x[1]} min={-2} max={3} step={0.25} onChange={v => setX([x[0], v])} /></div>
    <svg viewBox={`0 0 ${W} ${H}`} className="mm-graph" role="img" aria-label="Network diagram">
      {[0, 1].map(j => [0, 1].map(k => edge(70, 70 + 90 * j, 230, 70 + 90 * k, NET[0][k][j], gW1[k][j], `a${j}${k}`)))}
      {[0, 1].map(k => edge(230, 70 + 90 * k, 390, 115, NET[2][k], gw2[k], `b${k}`))}
      {node(70, 70, 'x₁', x[0], C.grey)}{node(70, 160, 'x₂', x[1], C.grey)}
      {node(230, 70, 'h₁', h[0], C.teal)}{node(230, 160, 'h₂', h[1], C.teal)}{node(390, 115, 'ŷ', yhat, C.violet)}
    </svg>
    <Working rows={backward ? [['δ_y = 2(ŷ − y)', `2(${fmt(yhat, 4)} − 1)`, fmt(gb2, 4)], ['δ for h₁, h₂', 'δ_y · w₂ · h(1 − h)', `${fmt(gb1[0], 4)}, ${fmt(gb1[1], 4)}`], ['∂L/∂W₁,₁₂ by backprop', 'δ₁ × x₂', fmt(gW1[0][1], 6)], ['∂L/∂W₁,₁₂ measured', '(L(w + ε) − L(w)) / ε', fmt(numeric, 6)]]
      : [['z = W₁x + b₁', `(${fmt(0.5 * x[0] - 0.3 * x[1] + 0.1, 3)}, ${fmt(0.2 * x[0] + 0.8 * x[1] - 0.1, 3)})`, ''], ['h = σ(z)', '', `(${fmt(h[0], 4)}, ${fmt(h[1], 4)})`], ['ŷ = w₂·h + b₂', `${fmt(h[0], 3)} − ${fmt(h[1], 3)} + 0.2`, fmt(yhat, 4)], ['loss (ŷ − 1)²', '', fmt((yhat - 1) ** 2, 4)]]} />
  </div>
}

// A long narrow valley: f(x, y) = 0.05 x² + 2 y², lowest at (0, 0).
const valley = (x, y) => [0.1 * x, 4 * y]
export function OptimiserFig() {
  const [eta, setEta] = useState(0.4), [alpha, setAlpha] = useState(0.3), [steps, setSteps] = useState(30)
  const gd = [[-8, 1.5]]
  for (let i = 0; i < steps; i++) { const [x, y] = gd.at(-1), [gx, gy] = valley(x, y); gd.push([x - eta * gx, y - eta * gy]) }
  const ad = [[-8, 1.5]]
  adam(valley, -8, 1.5, alpha, steps, 0.9, 0.999, 1e-8, (t, th) => ad.push(th))
  const contours = ({ X, Y }) => [0.5, 2, 4, 8].map(c => <ellipse key={c} cx={X(0)} cy={Y(0)} rx={X(Math.sqrt(c / 0.05)) - X(0)} ry={Y(0) - Y(Math.sqrt(c / 2))} fill="none" stroke="#c9b28a" />)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="gradient descent η" value={eta} min={0.05} max={0.52} step={0.01} onChange={setEta} /><Slider label="Adam α" value={alpha} min={0.05} max={1} step={0.05} onChange={setAlpha} /><Slider label="steps" value={steps} min={5} max={80} step={1} onChange={setSteps} /></div>
    <Graph x={[-10, 3]} y={[-2.5, 2.5]} equal segments={[...gd.slice(1).map((p, i) => ({ x1: gd[i][0], y1: gd[i][1], x2: p[0], y2: p[1], color: C.orange })), ...ad.slice(1).map((p, i) => ({ x1: ad[i][0], y1: ad[i][1], x2: p[0], y2: p[1], color: C.violet }))]} points={[{ x: 0, y: 0, color: C.grey, label: 'bottom' }]}>{contours}</Graph>
    <p className="tt-legend"><span style={{ color: C.orange }}>■ gradient descent: ({fmt(gd.at(-1)[0], 2)}, {fmt(gd.at(-1)[1], 2)})</span> <span style={{ color: C.violet }}>■ Adam, α = {fmt(alpha, 2)}: ({fmt(ad.at(-1)[0], 2)}, {fmt(ad.at(-1)[1], 2)})</span></p>
    <p className="qm-hint">The valley is 20× steeper across than along. One η can’t suit both directions for plain descent; Adam scales each coordinate by its own typical gradient.</p>
  </div>
}

const KEYS = [[2, 0], [0, 2], [-1.5, -1.5]], VALUES = [[10, 0], [0, 10], [5, 5]]
export function AttentionFig() {
  const [q, setQ] = useState([1.5, 0.5]), [scale, setScale] = useState(true)
  const d = 2, scores = KEYS.map(k => dot(q, k) / (scale ? Math.sqrt(d) : 1)), weights = softmax(scores)
  const out = scale ? attention([q], KEYS, VALUES)[0] : VALUES[0].map((_, j) => weights.reduce((s, w, i) => s + w * VALUES[i][j], 0))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label><input type="checkbox" checked={scale} onChange={e => setScale(e.target.checked)} /> divide by √d</label></div>
    <Graph x={[-3, 3]} y={[-3, 3]} equal onDrag={(i, x, y) => { if (i === 0) setQ([x, y]) }} arrows={[{ x1: 0, y1: 0, x2: q[0], y2: q[1], label: 'query', color: C.violet }, ...KEYS.map((k, i) => ({ x1: 0, y1: 0, x2: k[0], y2: k[1], label: `key ${i + 1}`, color: C.teal, width: 1 + 4 * weights[i] }))]} points={[{ x: q[0], y: q[1], drag: true, color: C.violet }]} />
    <Bars max={1} digits={3} rows={weights.map((w, i) => ({ label: `key ${i + 1}: score ${fmt(scores[i], 2)}`, value: w }))} />
    <Working rows={[['values', VALUES.map(v => `(${v.join(', ')})`).join(', '), ''], ['output = Σ weightᵢ valueᵢ', '', `(${fmt(out[0], 3)}, ${fmt(out[1], 3)})`]]} />
  </div>
}
