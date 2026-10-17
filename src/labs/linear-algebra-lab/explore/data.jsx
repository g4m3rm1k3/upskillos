// Data: least-squares fitting, principal directions, gradient descent and Bellman updates.
import { useRef, useState } from 'react'
import { clamp, eigen2, fmt, Handle, Notes, Plane, Readout, Slider, Stat, toSvg } from './parts.jsx'

// Least squares with an intercept (or through the origin), from the normal equations.
export function fitLine(points, intercept = true) {
  const n = points.length
  const sx = points.reduce((s, p) => s + p[0], 0), sy = points.reduce((s, p) => s + p[1], 0)
  const sxx = points.reduce((s, p) => s + p[0] * p[0], 0), sxy = points.reduce((s, p) => s + p[0] * p[1], 0)
  if (!intercept) return { slope: sxx ? sxy / sxx : 0, offset: 0 }
  const det = n * sxx - sx * sx
  if (Math.abs(det) < 1e-12) return { slope: 0, offset: sy / n }
  return { slope: (n * sxy - sx * sy) / det, offset: (sxx * sy - sx * sxy) / det }
}
export const sse = (points, slope, offset) => points.reduce((s, [x, y]) => s + (y - slope * x - offset) ** 2, 0)

export function Fit() {
  const plane = useRef(null)
  const [points, setPoints] = useState([[-4, -2.2], [-2.5, -0.6], [-1, -1], [0.5, 0.8], [2, 1.2], [3.5, 2.9]])
  const [intercept, setIntercept] = useState(true)
  const [manual, setManual] = useState(false)
  const [m, setM] = useState(0.3), [c, setC] = useState(0)
  const best = fitLine(points, intercept)
  const [slope, offset] = manual ? [m, intercept ? c : 0] : [best.slope, best.offset]
  const error = sse(points, slope, offset), bestError = sse(points, best.slope, best.offset)
  const ends = [-6.5, 6.5].map(x => toSvg([x, slope * x + offset]))
  const meaning = `Line y = ${fmt(slope)}x + ${fmt(offset)}. Sum of squared residuals ${fmt(error)}${manual ? ` (best possible ${fmt(bestError)})` : ''}.`
  return <>
    <div className="la-presets" role="group" aria-label="Fitting options">
      <button type="button" aria-pressed={!manual} onClick={() => setManual(false)}>Least-squares line</button>
      <button type="button" aria-pressed={manual} onClick={() => { setManual(true); setM(0.3); setC(0) }}>Fit it by hand</button>
      <button type="button" aria-pressed={!intercept} onClick={() => setIntercept(!intercept)}>Force through origin</button>
    </div>
    <Plane plane={plane} label={`Coordinate plane: data points, a fitted line and the vertical residuals. ${meaning}`}>
      {points.map(([x, y], i) => { const [px, py] = toSvg([x, y]), [, qy] = toSvg([x, slope * x + offset]); return <g key={i}><line className="la-residual" x1={px} y1={py} x2={px} y2={qy} /><rect className="la-square" x={px} y={Math.min(py, qy)} width={Math.abs(py - qy)} height={Math.abs(py - qy)} /></g> })}
      <line className="la-fitline" x1={ends[0][0]} y1={ends[0][1]} x2={ends[1][0]} y2={ends[1][1]} />
      {points.map((p, i) => <Handle key={i} plane={plane} at={p} tone="v" name={`point ${i + 1}`} r={7} onMove={q => setPoints(ps => ps.map((old, j) => j === i ? q : old))} />)}
    </Plane>
    {manual && <div className="la-controls"><Slider label="Slope" tone="out" value={m} onChange={setM} min={-2} max={2} step={0.05} />{intercept && <Slider label="Intercept" tone="out" value={c} onChange={setC} min={-3} max={3} step={0.1} />}</div>}
    <div className="la-matrix-row">
      <Stat label="Your error" value={fmt(error)} tone={manual && error - bestError > 0.01 ? 'err' : 'j'} note="sum of the pink squares" />
      <Stat label="Least squares" value={fmt(bestError)} tone="j" note={`slope ${fmt(best.slope)}, intercept ${fmt(best.offset)}`} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Fit it by hand and try to make the pink squares as small as possible. Then drag one point far away: one outlier pulls the whole line." truth="The least-squares line makes the residual vector perpendicular to the columns of the design matrix, so no slope or intercept change can reduce the total." trap="Least squares minimises squared vertical distances, not perpendicular distances to the line. That choice treats x as exact."
      code={`x = [${points.map(p => fmt(p[0])).join('; ')}];\ny = [${points.map(p => fmt(p[1])).join('; ')}];\nX = ${intercept ? '[ones(6,1) x]' : 'x'};\nw = X\\y;\ndisp(w)\nr = y - X*w;\ndisp(X'*r)`} />
  </>
}

// A fixed, correlated point cloud (deterministic, so every learner sees the same data).
const CLOUD = (() => {
  let s = 7
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand())
  return Array.from({ length: 28 }, () => { const a = gauss() * 1.9, b = gauss() * 0.55; return [a * 0.87 - b * 0.5, a * 0.5 + b * 0.87] })
})()

export function covariance(points) {
  const n = points.length, mx = points.reduce((s, p) => s + p[0], 0) / n, my = points.reduce((s, p) => s + p[1], 0) / n
  let xx = 0, xy = 0, yy = 0
  for (const [x, y] of points) { xx += (x - mx) ** 2; xy += (x - mx) * (y - my); yy += (y - my) ** 2 }
  return { mean: [mx, my], C: [[xx / (n - 1), xy / (n - 1)], [xy / (n - 1), yy / (n - 1)]] }
}

export function Pca() {
  const plane = useRef(null)
  const [angle, setAngle] = useState(90)
  const [show, setShow] = useState(false)
  const { mean, C } = covariance(CLOUD)
  const d = [Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180)]
  const variance = d[0] * (C[0][0] * d[0] + C[0][1] * d[1]) + d[1] * (C[1][0] * d[0] + C[1][1] * d[1])
  const e = eigen2(C)
  const top = e.vectors[0], unit = v => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n] }
  const u1 = unit(top), u2 = [-u1[1], u1[0]]
  const along = p => (p[0] - mean[0]) * d[0] + (p[1] - mean[1]) * d[1]
  const line = (dir, len, cls, key) => { const [x1, y1] = toSvg([mean[0] - dir[0] * len, mean[1] - dir[1] * len]), [x2, y2] = toSvg([mean[0] + dir[0] * len, mean[1] + dir[1] * len]); return <line key={key} className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const ellipse = Array.from({ length: 73 }, (_, i) => { const t = i / 72 * 2 * Math.PI, a = 2 * Math.sqrt(e.values[0]) * Math.cos(t), b = 2 * Math.sqrt(e.values[1]) * Math.sin(t); return toSvg([mean[0] + a * u1[0] + b * u2[0], mean[1] + a * u1[1] + b * u2[1]]).join(',') }).join(' ')
  const share = variance / (e.values[0] + e.values[1])
  const meaning = `Variance along your direction: ${fmt(variance)} (${(share * 100).toFixed(0)}% of the total ${fmt(e.values[0] + e.values[1])}). The largest possible is λ₁ = ${fmt(e.values[0])}.`
  return <>
    <Plane plane={plane} label={`Coordinate plane: a point cloud, a chosen direction and each point's projection onto it. ${meaning}`}>
      {show && <polygon className="la-fill" style={{ '--tone': 'var(--c-out)' }} points={ellipse} />}
      {show && <>{line(u1, 6, 'la-pc1', 'a')}{line(u2, 6, 'la-pc2', 'b')}</>}
      {line(d, 7, 'la-pcdir', 'd')}
      {CLOUD.map((p, i) => { const t = along(p), q = [mean[0] + t * d[0], mean[1] + t * d[1]], [px, py] = toSvg(p), [qx, qy] = toSvg(q); return <g key={i}><line className="la-proj" x1={px} y1={py} x2={qx} y2={qy} /><circle className="la-dot" cx={px} cy={py} r="3.6" /><circle className="la-tick" cx={qx} cy={qy} r="2.6" /></g> })}
    </Plane>
    <div className="la-controls"><Slider label="Direction angle (degrees)" tone="dir" value={angle} onChange={setAngle} min={0} max={180} step={1} /></div>
    <div className="la-matrix-row">
      <Stat label="Your variance" value={fmt(variance)} tone="dir" note={`${(share * 100).toFixed(0)}% of total`} />
      <Stat label="λ₁, λ₂ of covariance" value={`${fmt(e.values[0])}, ${fmt(e.values[1])}`} tone="out" note="most and least spread" />
      <label className="la-toggle"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} /> Show principal axes</label>
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Turn the direction until the projected dots spread as wide as possible. Then reveal the principal axes and compare." truth="The variance along a unit direction d is dᵀCd. It is largest along the top eigenvector of the covariance matrix and smallest along the other." trap="PCA finds directions of spread, not directions that predict a target. A tiny-variance direction can still matter for prediction."
      code={`X = [${CLOUD.slice(0, 4).map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('; ')}];  % first rows of the cloud\nmu = [mean(X(:,1)) mean(X(:,2))];\nXc = X - repmat(mu,4,1);\nC = Xc'*Xc/(size(X,1)-1);\n[V,D] = eig(C);\ndisp(D)`} />
  </>
}

export function descentTrace(rate, iterations = 12) {
  let weight = -1
  const trace = [weight]
  for (let k = 0; k < iterations; k++) { weight -= rate * 2 * (weight - 2); trace.push(weight) }
  return trace
}

export function Descent() {
  const [rate, setRate] = useState(0.2)
  const trace = descentTrace(rate)
  const losses = trace.map(w => (w - 2) ** 2)
  const curve = Array.from({ length: 61 }, (_, i) => -4 + i * 0.2)
  const px = w => 40 + (w + 4) * 33.3, py = l => 250 - Math.min(l, 40) * 5.5
  return <>
    <p>The loss <code>L(w) = (w − 2)²</code> is a bowl with its lowest point at w = 2. Its slope is <code>2(w − 2)</code>. Start at w = −1, and each step subtracts the learning rate times the slope.</p>
    <svg className="la-chart" viewBox="0 0 480 280" role="img" aria-label={`Gradient descent steps on a bowl at learning rate ${fmt(rate)}. Final loss ${fmt(losses.at(-1))}.`}>
      <polyline className="la-curve" points={curve.map(w => `${px(w)},${py((w - 2) ** 2)}`).join(' ')} />
      <polyline className="la-trail" points={trace.map(w => `${px(clamp(w, 4))},${py((w - 2) ** 2)}`).join(' ')} />
      {trace.map((w, i) => <circle key={i} cx={px(clamp(w, 4))} cy={py((w - 2) ** 2)} r={i ? 4 : 6} className="la-step" style={{ opacity: 0.35 + 0.65 * (i / trace.length) }} />)}
      <line x1={px(2)} x2={px(2)} y1="30" y2="252" className="la-guide" /><text x={px(2) + 6} y="42">minimum w = 2</text>
    </svg>
    <div className="la-controls"><Slider label="Learning rate" tone="out" value={rate} onChange={setRate} min={0.05} max={1.1} step={0.05} /></div>
    <Readout>Final w = {fmt(trace.at(-1))}; loss = {fmt(losses.at(-1))}. {rate < 1 ? 'The error shrinks.' : rate === 1 ? 'The error oscillates without shrinking.' : 'The error grows.'}</Readout>
    <Notes try="Compare rates 0.2, 0.5, 1.0 and 1.1. At 0.5 one step lands exactly on the minimum. Why?" truth="The minimum stays at w = 2 whatever the rate. For this bowl, steps converge only when 0 < rate < 1." trap="A bigger step is not always faster. Past the limit, each step overshoots further than the last." />
  </>
}

export function bellmanTrace(gamma, steps) {
  let values = [0, 0, 0]
  const history = [values]
  for (let k = 0; k < steps; k++) {
    values = [Math.max(1 + gamma * values[0], gamma * values[1]), Math.max(2, gamma * values[0]), 0]
    history.push(values)
  }
  return history
}

export function Bellman() {
  const [gamma, setGamma] = useState(0.8), [steps, setSteps] = useState(5)
  const history = bellmanTrace(gamma, steps), values = history.at(-1)
  const scale = Math.max(...values, 2)
  const next = bellmanTrace(gamma, steps + 1).at(-1)
  const residual = Math.max(...values.map((v, i) => Math.abs(v - next[i])))
  return <>
    <p>State A: stay for reward 1, or move to B for reward 0. State B: finish for reward 2, or return to A for reward 0. Terminal state T has value 0. All moves are deterministic.</p>
    <svg className="la-chart" viewBox="0 0 480 280" role="img" aria-label={`State values after ${steps} Bellman updates: A ${fmt(values[0])}, B ${fmt(values[1])}, terminal zero.`}>
      {values.map((v, i) => <g key={i} style={{ '--tone': `var(--c-${['dir', 'out', 'muted'][i]})` }}><rect className="la-bar" x={65 + i * 135} y={225 - 170 * v / scale} width="75" height={Math.max(2, 170 * v / scale)} rx="6" /><text x={95 + i * 135} y="250">{['A', 'B', 'T'][i]}</text><text x={80 + i * 135} y={214 - 170 * v / scale}>{fmt(v)}</text></g>)}
    </svg>
    <div className="la-controls"><Slider label="Discount γ" tone="dir" value={gamma} onChange={setGamma} min={0} max={0.95} step={0.05} /><Slider label="Bellman updates" tone="out" value={steps} onChange={setSteps} min={0} max={40} step={1} /></div>
    <Readout>Bellman residual = {fmt(residual)}. Greedy action at A: {1 + gamma * values[0] >= gamma * values[1] ? 'stay' : 'move to B'}; at B: {2 >= gamma * values[0] ? 'finish' : 'return to A'}.</Readout>
    <Notes try="Start with γ = 0, then use 0.8 and increase the updates. Larger discounts make distant rewards matter more." truth="T stays at zero. Each sweep uses the previous vector for every state." trap="Mixing old and new entries within one sweep gives a different iteration."
      code={`V = [0; 0; 0];\ngamma = ${gamma};\nfor k = 1:${steps}\n  old = V;\n  V(1) = max(1 + gamma*old(1), gamma*old(2));\n  V(2) = max(2, gamma*old(1));\n  V(3) = 0;\nend\ndisp(V);`} />
  </>
}
