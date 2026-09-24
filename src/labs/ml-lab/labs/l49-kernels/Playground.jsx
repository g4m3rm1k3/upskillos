import React, { useMemo, useState } from 'react'
import { KERNELS, regData, target, krr, explicitPolyRidge, kfoldError, GAMMAS, LAMBDAS, gram, eigenvalues, circles, kernelPCA, thresholdAccuracy } from './engine.js'
import { Plot, Path, Heatmap, Bars } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend } from '../../kit/ui.jsx'
import { fmt, pct } from '../../kit/math.js'

const XS = Array.from({ length: 161 }, (_, i) => -2.2 + 4.4 * i / 160)

function KrrView() {
  const [key, setKey] = useState('rbf'), [gi, setGi] = useState(5), [deg, setDeg] = useState(5), [li, setLi] = useState(2), [explicit, setExplicit] = useState(true)
  const data = useMemo(() => regData(), []), h = { gamma: GAMMAS[gi], degree: deg }, lambda = LAMBDAS[li]
  const m = krr(data, key, h, lambda), ex = key === 'poly' && explicit ? explicitPolyRidge(data, deg, lambda) : null
  const cv = useMemo(() => GAMMAS.map(g => LAMBDAS.map(l => kfoldError(data, 'rbf', { gamma: g }, l))), [data])
  const best = cv.flatMap((r, i) => r.map((v, j) => [v, i, j])).reduce((b, c) => c[0] < b[0] ? c : b)
  const clip = v => Math.max(-3, Math.min(4, v))
  return <>
    <Controls>
      <Choice label="Kernel" value={key} onChange={setKey} options={['linear', 'poly', 'rbf', 'laplace'].map(k => [k, KERNELS[k].name])} />
      {key === 'poly' ? <Slider label="Degree d" value={deg} min={1} max={9} onChange={setDeg} /> : (key === 'rbf' || key === 'laplace') && <Slider label="γ (inverse width)" value={gi} min={0} max={GAMMAS.length - 1} onChange={setGi} format={i => GAMMAS[i]} />}
      <Slider label="Ridge λ" value={li} min={0} max={LAMBDAS.length - 1} onChange={setLi} format={i => LAMBDAS[i]} />
      {key === 'poly' && <Toggle label="Overlay ridge regression on the explicit features" checked={explicit} onChange={setExplicit} />}
    </Controls>
    <Plot x={[-2.2, 2.2]} y={[-3, 4]} height={280} xLabel="x" yLabel="y" label="Kernel ridge regression">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={XS.map(x => [x, target(x)])} stroke="var(--text)" width={1.5} dash="6 4" />
      <Path X={X} Y={Y} points={XS.map(x => [x, clip(m.predict(x))])} stroke="var(--chart-model)" width={3} />
      {ex && <Path X={X} Y={Y} points={XS.map(x => [x, clip(ex.predict(x))])} stroke="var(--chart-val)" width={1.5} dash="3 3" />}
      {data.map((d, i) => <circle key={i} cx={X(d.x)} cy={Y(d.y)} r={3 + Math.min(6, 20 * Math.abs(m.alpha[i]) / Math.max(...m.alpha.map(Math.abs)))} fill="var(--chart-train)" opacity="0.7" />)}
    </>}</Plot>
    <Legend items={[['━', 'kernel ridge prediction f(x) = Σ αᵢ k(xᵢ, x)', 'var(--chart-model)'], ...(ex ? [['┄', `ridge on ${deg + 1} explicit features — identical`, 'var(--chart-val)']] : []), ['●', 'data (size = |αᵢ|)', 'var(--chart-train)'], ['┄', 'true function', 'var(--text)']]} />
    <Metrics items={[['5-fold CV error (this setting)', fmt(kfoldError(data, key, h, lambda), 4)], ['Best RBF setting by CV', `γ = ${GAMMAS[best[1]]}, λ = ${LAMBDAS[best[2]]}`], ['Its CV error', fmt(best[0], 4)], ['Coefficients αᵢ learned', String(data.length)]]} />
    <Heatmap matrix={cv} rowLabels={GAMMAS.map(g => `γ ${g}`)} colLabels={LAMBDAS.map(l => `λ ${l}`)} max={0.6} digits={3} label="5-fold cross-validation error of RBF kernel ridge" cell={52} />
    <Insight title="What to notice">Whatever the kernel, the fitted function is a weighted sum of kernel bumps centred on the training points — the **representer theorem**. With the polynomial kernel, ridge regression on explicitly expanded features draws exactly the same curve, but the kernel version never builds the features. The RBF kernel corresponds to infinitely many features, which no explicit method could build. γ and λ trade off like any bias–variance knob: pick them by cross-validation (the heatmap).</Insight>
  </>
}

function GramView() {
  const [key, setKey] = useState('rbf'), [gamma, setGamma] = useState(1)
  const data = useMemo(() => regData(12, 7), []), X = data.map(d => d.x).sort((a, b) => a - b), h = { gamma, degree: 3 }
  const K = gram(X, key, h), ev = eigenvalues(K), minEv = Math.min(...ev)
  return <>
    <Controls>
      <Choice label="Kernel (or impostor)" value={key} onChange={setKey} options={Object.entries(KERNELS).map(([k, v]) => [k, v.name])} />
      {(key === 'rbf' || key === 'laplace') && <Slider label="γ" value={gamma} min={0.1} max={5} step={0.1} onChange={setGamma} />}
    </Controls>
    <Heatmap matrix={K} rowLabels={X.map(x => fmt(x, 2))} colLabels={X.map(x => fmt(x, 2))} max={Math.max(...K.flat().map(Math.abs))} digits={2} label="Gram matrix Kᵢⱼ = k(xᵢ, xⱼ) for 12 sorted points" cell={34} />
    <Bars label="Eigenvalues of the Gram matrix" format={v => v.toFixed(3)} items={ev.map((v, i) => ({ label: `λ${i + 1}`, value: v }))} />
    <Metrics items={[['Smallest eigenvalue', fmt(minEv, 4)], ['Positive semidefinite?', minEv > -1e-8 ? 'yes — a valid kernel' : 'NO — not a valid kernel'], ['Largest eigenvalue', fmt(ev[0], 3)]]} />
    <Insight title="What to notice">A valid kernel is an inner product in some feature space, so every Gram matrix must be positive semidefinite: no negative eigenvalues. The RBF, Laplacian, linear and polynomial kernels pass for any points. The tanh “kernel” (once popular as the “sigmoid kernel”) fails here with a clearly negative eigenvalue — it implies a negative squared length, and algorithms that rely on convexity (SVMs, kernel ridge) lose their guarantees. Notice also how quickly the eigenvalues decay for the RBF kernel: most of its infinite feature space carries almost no weight.</Insight>
  </>
}

function KpcaView() {
  const [key, setKey] = useState('rbf'), [gamma, setGamma] = useState(2)
  const pts = useMemo(() => circles(), []), r = useMemo(() => kernelPCA(pts, key, { gamma, degree: 2 }, 2), [pts, key, gamma])
  const labels = pts.map(p => p.ring), accs = [0, 1].map(c => thresholdAccuracy(r.proj.map(p => p[c]), labels))
  const bx = Math.max(...r.proj.map(p => Math.abs(p[0]))) * 1.1 || 1, by = Math.max(...r.proj.map(p => Math.abs(p[1]))) * 1.1 || 1
  return <>
    <Controls>
      <Choice label="Kernel" value={key} onChange={setKey} options={[['linear', 'Linear (ordinary PCA)'], ['poly', 'Polynomial, degree 2'], ['rbf', 'RBF']]} />
      {key === 'rbf' && <Slider label="γ" value={gamma} min={0.1} max={5} step={0.1} onChange={setGamma} />}
    </Controls>
    <div className="ml-grid-2">
      <div><p className="ml-caption"><strong>Original data</strong></p><Plot x={[-3, 3]} y={[-3, 3]} height={260} width={400} xLabel="x₁" yLabel="x₂" label="Two concentric rings">{({ X, Y }) => pts.map((p, i) => <circle key={i} cx={X(p.x[0])} cy={Y(p.x[1])} r="3" fill={p.ring ? 'var(--chart-val)' : 'var(--chart-train)'} />)}</Plot></div>
      <div><p className="ml-caption"><strong>First two kernel principal components</strong></p><Plot x={[-bx, bx]} y={[-by, by]} height={260} width={400} xLabel="component 1" yLabel="component 2" tickFormat={v => v.toFixed(1)} label="Kernel PCA projection">{({ X, Y }) => r.proj.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r="3" fill={pts[i].ring ? 'var(--chart-val)' : 'var(--chart-train)'} />)}</Plot></div>
    </div>
    <Metrics items={[['Best single-threshold accuracy · component 1', pct(accs[0])], ['… · component 2', pct(accs[1])], ['Top eigenvalues', r.vals.map(v => fmt(v, 2)).join(', ')]]} />
    <Insight title="What to notice">Ordinary PCA can only rotate the plane: the rings stay nested and no single direction separates them. Kernel PCA does PCA in the feature space of the kernel, using only the (centred) Gram matrix. With an RBF kernel of suitable width, one of the leading components pulls the inner ring apart from the outer one — a threshold on it separates them perfectly. Too small a γ behaves almost linearly; too large a γ makes every point its own island.</Insight>
  </>
}

export default function Playground() {
  const [view, setView] = useState('krr')
  return <>
    <PanelHeading title="Work in huge feature spaces without ever building them." pill="kernel methods" />
    <Controls><Choice label="View" value={view} onChange={setView} options={[['krr', 'Kernel ridge regression and the representer theorem'], ['gram', 'Gram matrices: what makes a valid kernel'], ['kpca', 'Kernel PCA: untangling rings']]} /></Controls>
    {view === 'krr' ? <KrrView /> : view === 'gram' ? <GramView /> : <KpcaView />}
  </>
}
