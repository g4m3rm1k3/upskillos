// Figures placed between the paragraphs of Lab 15 (15.1–15.5).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, MiniPlot, Path, Dots, curve, Table, ProbabilityField, ClassDots, Contour, r } from '../../kit/fig.jsx'
import { hinge, logistic, rbfMap, maps, trainSVM, score, analyse } from './engine.js'
import { initial, step } from '../l08-logistic/engine.js'
import { classification } from '../../kit/datasets.js'
import { sigmoid } from '../../kit/math.js'

const BLOBS = classification('blobs', { n: 80, seed: 15 }), OVERLAP = classification('overlap', { n: 160, seed: 16 })
const BOX = { x0: -3.2, x1: 3.2, y0: -3, y1: 3 }
function SvmPlot({ points, w, fmap, a, showField = false, width = 460, height = 280, box = BOX }) {
  const f = score(w, fmap)
  return <MiniPlot width={width} height={height} x={[box.x0, box.x1]} y={[box.y0, box.y1]} xLabel="x₁" yLabel="x₂" label="SVM boundary and margin">{({ X, Y }) => <>
    {showField && <ProbabilityField X={X} Y={Y} {...box} cells={30} p={(u, v) => sigmoid(2 * f(u, v))} />}
    <Contour X={X} Y={Y} {...box} f={f} level={0} />
    <Contour X={X} Y={Y} {...box} f={f} level={1} dash="5 4" width={1.2} stroke="var(--muted)" />
    <Contour X={X} Y={Y} {...box} f={f} level={-1} dash="5 4" width={1.2} stroke="var(--muted)" />
    <ClassDots X={X} Y={Y} points={points} r={3} />
    {a && points.map((p, i) => a.supportVectors.has(i) && <circle key={i} cx={X(p.x1)} cy={Y(p.x2)} r={7} fill="none" stroke="var(--text)" strokeWidth="1.5" />)}
  </>}</MiniPlot>
}

// ---------- 15.1 ----------
export function PickABoundary() {
  const [angle, setAngle] = useState(120), [offset, setOffset] = useState(0), t = angle * Math.PI / 180, n = [Math.cos(t), Math.sin(t)]
  const d = BLOBS.map(p => n[0] * p.x1 + n[1] * p.x2 - offset), sign = mean2(BLOBS.map((p, i) => (p.label ? 1 : -1) * d[i])) >= 0 ? 1 : -1
  const signed = d.map((v, i) => sign * (BLOBS[i].label ? 1 : -1) * v), separates = signed.every(v => v > 0), margin = Math.min(...signed)
  const w = [-sign * offset, sign * n[0], sign * n[1]]
  return <div>
    <Controls><Slider label="direction of the boundary (degrees)" value={angle} min={0} max={180} step={1} onChange={setAngle} digits={0} /><Slider label="offset" value={offset} min={-2} max={2} step={0.05} onChange={setOffset} /></Controls>
    <SvmPlot points={BLOBS} w={w} fmap={maps.linear()} width={460} height={270} />
    <Readout>{separates ? <>This line separates the classes; its margin (distance to the closest point) is <strong>{r(margin, 3)}</strong>. Try to make it as large as you can.</> : <strong>This line misclassifies {signed.filter(v => v <= 0).length} points.</strong>} The dashed lines are 1 unit either side.</Readout>
  </div>
}
function mean2(v) { return v.reduce((a, b) => a + b, 0) / v.length }

export function PointDistance() {
  const [w1, setW1] = useState(3), [w2, setW2] = useState(4), [b, setB] = useState(-5), [px, setPx] = useState(3), [py, setPy] = useState(4)
  const f = w1 * px + w2 * py + b, norm = Math.hypot(w1, w2)
  return <div>
    <Controls><Slider label="w₁" value={w1} min={-5} max={5} step={1} onChange={setW1} digits={0} /><Slider label="w₂" value={w2} min={-5} max={5} step={1} onChange={setW2} digits={0} /><Slider label="b" value={b} min={-10} max={10} step={1} onChange={setB} digits={0} /><Slider label="point x" value={px} min={-5} max={5} step={0.5} onChange={setPx} digits={1} /><Slider label="point y" value={py} min={-5} max={5} step={0.5} onChange={setPy} digits={1} /></Controls>
    <Readout>f(x) = {w1}·{px} + {w2}·{py} + ({b}) = {r(f, 3)}; ‖w‖ = √({w1}² + {w2}²) = {r(norm, 3)}; distance = |f|/‖w‖ = <strong>{r(Math.abs(f) / (norm || 1), 4)}</strong>, on the {f >= 0 ? 'positive' : 'negative'} side.</Readout>
  </div>
}

// ---------- 15.2 ----------
export function SvmStreet() {
  const [drop, setDrop] = useState(false), fmap = maps.linear(), lambda = 0.01
  const w = useMemo(() => trainSVM(BLOBS, fmap, { lambda, iterations: 3000 }), []), a = analyse(w, fmap, BLOBS, lambda) // eslint-disable-line react-hooks/exhaustive-deps
  const kept = BLOBS.filter((_, i) => !drop || a.supportVectors.has(i) || i % 2 === 0)
  const w2 = useMemo(() => trainSVM(kept, fmap, { lambda, iterations: 3000 }), [drop]), a2 = analyse(w2, fmap, kept, lambda) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Check label="delete half of the points that are not support vectors, and retrain" checked={drop} onChange={setDrop} /></Controls>
    <SvmPlot points={kept} w={drop ? w2 : w} fmap={fmap} a={drop ? a2 : a} />
    <Readout>{(drop ? a2 : a).supportVectors.size} support vectors (circled) on or inside the street edges (dashed). Street width 2/‖w‖ = <strong>{r((drop ? a2 : a).width, 3)}</strong>. {drop ? `With ${BLOBS.length - kept.length} non-support points removed, the street changes only a little (width was ${r(a.width, 3)}). The exact optimum would not move at all; this solver (stochastic subgradient descent) is approximate.` : 'Only the circled points hold the street in place.'}</Readout>
  </div>
}

// ---------- 15.3 ----------
export function HingeVersusLog() {
  const [m, setM] = useState(0.4)
  return <div>
    <Controls><Slider label="margin m = y·f(x)" value={m} min={-2} max={3} step={0.05} onChange={setM} /></Controls>
    <MiniPlot x={[-2, 3]} y={[0, 3.2]} xLabel="margin m" yLabel="loss" label={`Hinge ${r(hinge(m), 3)}, log loss ${r(logistic(m), 3)}`}>{({ X, Y }) => <>
      <Path X={X} Y={Y} points={curve(hinge, -2, 3)} />
      <Path X={X} Y={Y} points={curve(logistic, -2, 3)} stroke="var(--chart-val)" />
      <Dots X={X} Y={Y} points={[[m, hinge(m)], [m, logistic(m), 4, 'var(--chart-val)']]} rad={4.5} />
    </>}</MiniPlot>
    <Readout>hinge max(0, 1 − m) = <strong>{r(hinge(m), 3)}</strong> (purple); log loss in bits = {r(logistic(m), 3)} (orange). {m >= 1 ? 'Beyond the margin the hinge is exactly 0 — this point no longer affects the SVM.' : m > 0 ? 'Correct side, but inside the street: charged.' : 'Misclassified: charged more than 1.'}</Readout>
  </div>
}

export function LambdaStreet() {
  const [p, setP] = useState(-2), lambda = 10 ** p, fmap = maps.linear(), w = useMemo(() => trainSVM(OVERLAP, fmap, { lambda, iterations: 1500 }), [lambda]), a = analyse(w, fmap, OVERLAP, lambda) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Slider label="log₁₀ λ" value={p} min={-3} max={0.5} step={0.25} onChange={setP} /></Controls>
    <SvmPlot points={OVERLAP} w={w} fmap={fmap} a={a} />
    <Readout>λ = {lambda.toPrecision(2)} (C ∝ 1/λ): street width <strong>{r(a.width, 3)}</strong>, {a.supportVectors.size} points on or inside the margin, training accuracy {r(a.accuracy * 100, 1)}%. Larger λ buys a wider street at the price of more violations.</Readout>
  </div>
}

// ---------- 15.4 ----------
const CIRCLES = classification('circles', { n: 160, seed: 17 })
export function LiftTheRing() {
  const [t, setT] = useState(1.4), rsq = CIRCLES.map(p => p.x1 * p.x1 + p.x2 * p.x2)
  return <div>
    <Controls><Slider label="threshold on x₁² + x₂²" value={t} min={0} max={6} step={0.05} onChange={setT} /></Controls>
    <MiniPlot height={150} x={[0, 7]} y={[0, 1]} yTicks={2} grid={false} xLabel="new feature x₁² + x₂²" label="Points along the new feature">{({ X, Y }) => <>
      {CIRCLES.map((p, i) => <circle key={i} cx={X(rsq[i])} cy={Y(p.label ? 0.65 : 0.35)} r={3} fill={p.label ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.7" />)}
      <line x1={X(t)} x2={X(t)} y1={Y(0)} y2={Y(1)} stroke="var(--text)" strokeWidth="2" />
    </>}</MiniPlot>
    <Readout>On the single feature x₁² + x₂², the inner class (orange) and the ring (blue) separate with one threshold: {r(CIRCLES.filter((p, i) => (rsq[i] < t ? 1 : 0) === p.label).length / CIRCLES.length * 100, 1)}% correct at {r(t, 2)}. In the original plane that threshold is a circle of radius {r(Math.sqrt(t), 2)}.</Readout>
  </div>
}

export function KernelTrick() {
  const [a1, setA1] = useState(1), [a2, setA2] = useState(2), [b1, setB1] = useState(3), [b2, setB2] = useState(1)
  const phi = (u, v) => [u * u, v * v, Math.SQRT2 * u * v], pa = phi(a1, a2), pb = phi(b1, b2), dot = a1 * b1 + a2 * b2
  return <div>
    <Controls><Slider label="x₁" value={a1} min={-3} max={3} step={1} onChange={setA1} digits={0} /><Slider label="x₂" value={a2} min={-3} max={3} step={1} onChange={setA2} digits={0} /><Slider label="x′₁" value={b1} min={-3} max={3} step={1} onChange={setB1} digits={0} /><Slider label="x′₂" value={b2} min={-3} max={3} step={1} onChange={setB2} digits={0} /></Controls>
    <Table head={['route', 'computation', 'result']} rows={[['kernel in 2D', `(x·x′)² = (${dot})²`, dot * dot], ['explicit features', `φ(x)·φ(x′) with φ = (x₁², x₂², √2·x₁x₂): [${pa.map(v => r(v, 2)).join(', ')}] · [${pb.map(v => r(v, 2)).join(', ')}]`, r(pa.reduce((s, v, i) => s + v * pb[i], 0), 6)]]} label="Kernel versus explicit feature map" />
    <Readout>Same number both ways. The kernel never built the feature vectors — with the RBF kernel they would be infinitely long.</Readout>
  </div>
}

const MOONS = classification('moons', { n: 160, noise: 0.25, seed: 18 })
export function RbfGamma() {
  const [pg, setPg] = useState(0), gamma = 10 ** pg, fmap = useMemo(() => rbfMap(gamma), [gamma]), w = useMemo(() => trainSVM(MOONS, fmap, { lambda: 0.003, iterations: 800 }), [fmap]), a = analyse(w, fmap, MOONS, 0.003)
  return <div>
    <Controls><Slider label="log₁₀ γ" value={pg} min={-1.5} max={1.5} step={0.25} onChange={setPg} /></Controls>
    <SvmPlot points={MOONS} w={w} fmap={fmap} a={null} showField box={{ x0: -2.6, x1: 2.6, y0: -1.9, y1: 1.9 }} />
    <Readout>γ = {gamma.toPrecision(2)}: training accuracy {r(a.accuracy * 100, 1)}%. Small γ: each point’s similarity reaches far, the boundary is smooth. Large γ: similarity is very local, the boundary bends around individual points.</Readout>
  </div>
}

// ---------- 15.5 ----------
export function SvmVersusLogistic() {
  const [outlier, setOutlier] = useState(false), pts = outlier ? [...BLOBS, { x1: 2.8, x2: -2.6, label: 0 }] : BLOBS, fmap = maps.linear()
  const w = useMemo(() => trainSVM(pts, fmap, { lambda: 0.01, iterations: 3000 }), [outlier]) // eslint-disable-line react-hooks/exhaustive-deps
  const lg = useMemo(() => { let m = initial('linear'); for (let k = 0; k < 3000; k++) m = step(m, pts, 'linear', 0.5, 0.005); return m }, [outlier]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div>
    <Controls><Check label="add one mislabelled point far on the wrong side" checked={outlier} onChange={setOutlier} /></Controls>
    <MiniPlot x={[BOX.x0, BOX.x1]} y={[BOX.y0, BOX.y1]} xLabel="x₁" yLabel="x₂" label="SVM and logistic regression boundaries">{({ X, Y }) => <>
      <Contour X={X} Y={Y} {...BOX} f={score(w, fmap)} level={0} />
      <Contour X={X} Y={Y} {...BOX} f={(u, v) => lg.b + lg.w[0] * u + lg.w[1] * v} level={0} stroke="var(--chart-val)" dash="6 4" />
      <ClassDots X={X} Y={Y} points={pts} r={3} />
    </>}</MiniPlot>
    <Readout>Solid: SVM. Dashed orange: L2-regularized logistic regression. On clean blobs they nearly agree. {outlier ? 'The mislabelled point pulls on both — each loss grows linearly for badly misclassified points — so both lines tilt toward it.' : 'Add the outlier and compare how each line moves.'}</Readout>
  </div>
}
