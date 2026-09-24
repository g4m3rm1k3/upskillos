import React, { useMemo, useState } from 'react'
import { kkt, objectiveF, svmData, smo, lassoProblem, ista, subgradient } from './engine.js'
import { Plot, Path, Contour, equalAspect } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt } from '../../kit/math.js'

const R = equalAspect([-1.5, 3.5], [-1.5, 3], 560, 320)

function KKTView() {
  const [a1, setA1] = useState(2), [a2, setA2] = useState(1), [b, setB] = useState(1)
  const a = [a1, a2], s = kkt(a, b), sb = kkt(a, b + 0.1)
  const [x0, x1] = R[0], [y0, y1] = R[1]
  return <>
    <Controls>
      <Slider label="Target point a₁" value={a1} min={-1} max={3} step={0.25} onChange={setA1} />
      <Slider label="Target point a₂" value={a2} min={-1} max={2.5} step={0.25} onChange={setA2} />
      <Slider label="Constraint x₁ + x₂ ≤ b" value={b} min={-1} max={4} step={0.25} onChange={setB} />
    </Controls>
    <Plot x={R[0]} y={R[1]} height={320} tickFormat={v => v.toFixed(1)} xLabel="x₁" yLabel="x₂" label="Constrained minimization">{({ X, Y }) => <>
      <path d={`M ${X(x0)} ${Y(b - x0)} L ${X(x1)} ${Y(b - x1)} L ${X(x1)} ${Y(y0 - 5)} L ${X(x0)} ${Y(y0 - 5)} Z`} fill="var(--chart-model)" opacity="0.1" />
      {[0.25, 1, 2, 4, 7].map(l => <Contour key={l} X={X} Y={Y} x0={x0} x1={x1} y0={y0} y1={y1} f={(p, q) => objectiveF([p, q], a)} level={l} stroke="var(--muted)" width={1} cells={60} />)}
      <Path X={X} Y={Y} points={[[x0, b - x0], [x1, b - x1]]} stroke="var(--chart-model)" width={2.5} />
      <circle cx={X(a1)} cy={Y(a2)} r="5" fill="var(--text)" />
      <circle cx={X(s.x[0])} cy={Y(s.x[1])} r="7" fill="var(--chart-val)" />
      {s.active && <Path X={X} Y={Y} points={[s.x, [s.x[0] + 0.5, s.x[1] + 0.5]]} stroke="var(--chart-val)" width={2.5} />}
    </>}</Plot>
    <Legend items={[['■', 'feasible region x₁ + x₂ ≤ b', 'var(--chart-model)'], ['─', 'contours of f(x) = ‖x − a‖²', 'var(--muted)'], ['●', 'unconstrained minimum a', 'var(--text)'], ['●', 'constrained minimum x*', 'var(--chart-val)'], ...(s.active ? [['━', 'constraint normal (1, 1) — parallel to −∇f at x*', 'var(--chart-val)']] : [])]} />
    <Metrics items={[['x*', `(${fmt(s.x[0], 2)}, ${fmt(s.x[1], 2)})`], ['Multiplier λ', fmt(s.lambda, 3)], ['Constraint', s.active ? 'active (λ > 0)' : 'inactive (λ = 0)'], ['f* at b + 0.1 (predicted f* − 0.1λ)', `${fmt(sb.fStar, 3)} (${fmt(s.fStar - 0.1 * s.lambda, 3)})`]]} />
    <Insight title="What to notice">At the constrained optimum the objective’s gradient points straight into the constraint: −∇f = λ·(1, 1). λ measures how hard the constraint pushes back, and it is the **shadow price**: relaxing b by a little lowers the optimum by about λ per unit. Move a into the feasible region: the constraint goes slack and λ becomes 0 — **complementary slackness**: either the constraint is tight or its multiplier is zero.</Insight>
  </>
}

const CS = [0.01, 0.05, 0.2, 1, 5, 50]
function SVMView() {
  const [ci, setCi] = useState(3), [kernel, setKernel] = useState('linear'), [overlap, setOverlap] = useState(0.6)
  const data = useMemo(() => svmData(48, 40, overlap), [overlap]), C = CS[ci]
  const m = useMemo(() => smo(data, C, kernel), [data, C, kernel])
  const sv = m.alpha.map(a => a > 1e-6), atC = m.alpha.map(a => a > C - 1e-6)
  const B = [[-3.5, 3.5], [-3, 3]]
  return <>
    <Controls>
      <Slider label="Soft-margin penalty C" value={ci} min={0} max={CS.length - 1} onChange={setCi} format={i => CS[i]} />
      <Choice label="Kernel" value={kernel} onChange={setKernel} options={[['linear', 'Linear'], ['rbf', 'RBF (Gaussian)']]} />
      <Slider label="Class overlap" value={overlap} min={0.3} max={1.2} step={0.1} onChange={setOverlap} />
    </Controls>
    <Plot x={B[0]} y={B[1]} height={320} xLabel="x₁" yLabel="x₂" label="SVM trained by solving its dual">{({ X, Y }) => <>
      {[[-1, '5 4'], [0, undefined], [1, '5 4']].map(([l, dash]) => <Contour key={l} X={X} Y={Y} x0={B[0][0]} x1={B[0][1]} y0={B[1][0]} y1={B[1][1]} f={(p, q) => m.decision([p, q])} level={l} stroke={l ? 'var(--muted)' : 'var(--text)'} width={l ? 1.5 : 2.5} dash={dash} cells={60} />)}
      {data.map((d, i) => <circle key={i} cx={X(d.x[0])} cy={Y(d.x[1])} r={sv[i] ? 6 : 3.5} fill={d.y > 0 ? 'var(--chart-val)' : 'var(--chart-train)'} stroke={sv[i] ? (atC[i] ? '#ef4444' : 'var(--text)') : 'none'} strokeWidth="2" />)}
    </>}</Plot>
    <Legend items={[['━', 'decision boundary f(x) = 0', 'var(--text)'], ['┄', 'margins f(x) = ±1', 'var(--muted)'], ['○', 'support vector on the margin (0 < α < C)', 'var(--text)'], ['○', 'support vector at the bound (α = C: inside the margin or misclassified)', '#ef4444']]} />
    <Metrics items={[['Support vectors (α > 0)', `${sv.filter(Boolean).length} of ${data.length}`], ['…of which at α = C', String(atC.filter(Boolean).length)], ['Primal objective', fmt(m.primal, 4)], ['Dual objective (≤ primal)', fmt(m.dual, 4)]]} />
    <Caption>{`Duality gap ${fmt(m.primal - m.dual, 5)}: the dual value is a lower bound on the primal, and the two meet at the solution (strong duality) — the remaining gap is SMO’s stopping tolerance. SMO needed ${m.history.length} sweeps.`}</Caption>
    <Insight title="What to notice">The dual has one αᵢ per training example, and complementary slackness decides which are non-zero: points strictly outside the margin get α = 0 and do not affect the classifier at all. Only the **support vectors** matter. Small C tolerates margin violations (many α = C, wide margin); large C tries to classify every point. The dual touches the data only through inner products k(xᵢ, xⱼ) — swap in the RBF kernel and the same solver draws curved boundaries.</Insight>
  </>
}

const LAMS = [0.01, 0.03, 0.1, 0.3, 1]
function LassoView() {
  const [li, setLi] = useState(2), P = useMemo(() => lassoProblem(), []), lam = LAMS[li]
  const runs = useMemo(() => ({ ista: ista(P, lam, 200), fista: ista(P, lam, 200, true), sub: subgradient(P, lam, 200) }), [P, lam])
  const fstar = Math.min(...runs.fista.hist, ...runs.ista.hist) - 1e-15, lg = v => Math.log10(Math.max(v - fstar, 1e-16))
  const cols = { ista: 'var(--chart-model)', fista: 'var(--chart-val)', sub: '#10b981' }
  return <>
    <Controls><Slider label="Penalty λ" value={li} min={0} max={LAMS.length - 1} onChange={setLi} format={i => LAMS[i]} /></Controls>
    <Caption>{`Lasso: minimize (1/2n)‖y − Xw‖² + λ‖w‖₁ with n = ${P.n} and ${P.d} features, only the first 3 of which matter. The ‖w‖₁ term is not differentiable at 0.`}</Caption>
    <Plot x={[0, 200]} y={[-16, 1]} height={230} xLabel="iteration" yLabel="log₁₀(objective − minimum)" label="Convergence of three methods">{({ X, Y }) => Object.entries(runs).map(([k, r]) => <Path key={k} X={X} Y={Y} points={r.hist.map((v, i) => [i, lg(v)])} stroke={cols[k]} width={2.3} />)}</Plot>
    <Legend items={[['━', 'proximal gradient (ISTA)', cols.ista], ['━', 'accelerated (FISTA)', cols.fista], ['━', 'subgradient descent', cols.sub]]} />
    <Plot x={[-0.5, P.d - 0.5]} y={[-2.5, 3.5]} height={180} xLabel="feature" yLabel="coefficient" label="Coefficients after 200 iterations">{({ X, Y }) => <>
      {runs.ista.w.map((v, j) => <rect key={`i${j}`} x={X(j) - 5} y={Y(Math.max(v, 0))} width={5} height={Math.abs(Y(v) - Y(0))} fill={cols.ista} />)}
      {runs.sub.w.map((v, j) => <rect key={`s${j}`} x={X(j)} y={Y(Math.max(v, 0))} width={5} height={Math.abs(Y(v) - Y(0))} fill={cols.sub} />)}
      {P.beta.map((v, j) => v ? <circle key={j} cx={X(j)} cy={Y(v)} r="4" fill="var(--text)" /> : null)}
    </>}</Plot>
    <Metrics items={[['Exact zeros · proximal gradient', `${runs.ista.w.filter(v => v === 0).length} of ${P.d}`], ['Exact zeros · subgradient', `${runs.sub.w.filter(v => Math.abs(v) < 1e-12).length} of ${P.d}`], ['Gap after 200 steps · ISTA', (runs.ista.hist[200] - fstar).toExponential(1)], ['Gap after 200 steps · subgradient', (runs.sub.hist[200] - fstar).toExponential(1)]]} />
    <Insight title="What to notice">Subgradient descent treats |w| like any other term, needs shrinking steps, converges slowly and never lands exactly on 0. Proximal gradient splits the objective: a gradient step on the smooth part, then the **proximal operator** of λ‖w‖₁ — soft-thresholding — which sets small coefficients exactly to 0. It converges as fast as gradient descent on a smooth problem; FISTA’s momentum speeds it further. Larger λ gives sparser solutions.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('kkt')
  return <>
    <PanelHeading title="Constraints, multipliers and the problem behind the problem." pill="convex optimization" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['kkt', 'Lagrange multipliers and KKT'], ['svm', 'The SVM dual, solved by SMO'], ['lasso', 'Proximal gradient for the lasso']]} /></Controls>
    {view === 'kkt' ? <KKTView /> : view === 'svm' ? <SVMView /> : <LassoView />}
  </>
}
