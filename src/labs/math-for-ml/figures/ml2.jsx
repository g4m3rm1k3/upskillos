// Figures for the classical-learner and deep-learning-building-block lessons.
import { useMemo, useState } from 'react'
import { PyRandom, pyGauss, fitPoly, polyValue, trainNaiveBayes, kmeans, emGmm, normal1, hingeLoss, svmSgd, gini, labelEntropy, activationSpread, layerNorm, conv1d, dot } from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

const truth = x => x * x - x
export function BiasVarianceFitFig() {
  const [degree, setDegree] = useState(1)
  const fits = useMemo(() => { const rng = new PyRandom(2); return Array.from({ length: 20 }, () => { const xs = Array.from({ length: 12 }, () => -1 + 2 * rng.random()), ys = xs.map(x => truth(x) + pyGauss(rng, 0, 0.3)); return fitPoly(xs, ys, degree) }) }, [degree])
  const avg = x => fits.reduce((s, c) => s + polyValue(c, x), 0) / fits.length
  const tests = Array.from({ length: 21 }, (_, i) => -1 + i / 10)
  const bias2 = tests.reduce((s, t) => s + (avg(t) - truth(t)) ** 2, 0) / tests.length
  const variance = tests.reduce((s, t) => s + fits.reduce((u, c) => u + (polyValue(c, t) - avg(t)) ** 2, 0) / fits.length, 0) / tests.length
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="polynomial degree" value={degree} min={0} max={8} step={1} onChange={setDegree} show={v => String(v)} /></div>
    <Graph x={[-1, 1]} y={[-1, 3]} height={250} fns={[...fits.map(c => ({ f: x => polyValue(c, x), color: '#1f6f6833', width: 1 })), { f: avg, color: C.teal, width: 3, label: 'average fit' }, { f: truth, color: C.grey, dash: true, label: 'truth', labelAt: -0.6 }]} />
    <Working rows={[['bias²', 'average fit vs truth', fmt(bias2, 4)], ['variance', 'fits vs their average', fmt(variance, 4)], ['noise', 'σ² (irreducible)', fmt(0.09, 4)]]} />
  </div>
}

const DOCS = [['free', 'money'], ['meeting', 'today'], ['free', 'offer'], ['project', 'today'], ['money', 'offer', 'now'], ['meeting', 'project', 'notes']], LABELS = ['spam', 'ham', 'spam', 'ham', 'spam', 'ham']
export function NaiveBayesFig() {
  const [prior, like] = useMemo(() => trainNaiveBayes(DOCS, LABELS), []), vocab = Object.keys(like.spam)
  const [doc, setDoc] = useState(['free', 'offer', 'today'])
  const toggle = w => setDoc(d => (d.includes(w) ? d.filter(x => x !== w) : [...d, w]))
  const contrib = doc.map(w => [w, Math.log(like.spam[w]) - Math.log(like.ham[w])]), start = Math.log(prior.spam) - Math.log(prior.ham), total = start + contrib.reduce((s, [, v]) => s + v, 0)
  return <div className="qm-fig">
    <div className="qm-buttons">{vocab.map(w => <button key={w} className={doc.includes(w) ? 'qm-primary' : ''} aria-pressed={doc.includes(w)} onClick={() => toggle(w)}>{w}</button>)}</div>
    <Bars rows={[{ label: 'prior log ratio', value: start, color: C.grey }, ...contrib.map(([w, v]) => ({ label: w, value: v, color: v > 0 ? C.orange : C.teal }))]} digits={3} max={2} />
    <Working rows={[['log P(spam | words) − log P(ham | words)', 'prior + Σ word ratios', fmt(total, 4)], ['decision', total > 0 ? 'positive' : total < 0 ? 'negative' : 'exactly 0: a tie', total > 0 ? 'spam' : total < 0 ? 'ham' : 'either'], ['P(spam | words)', 'from the log ratio', fmt(1 / (1 + Math.exp(-total)), 4)]]} />
  </div>
}

const TREE_X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], TREE_Y = [0, 0, 0, 1, 0, 0, 1, 1, 1, 1]
export function TreeSplitFig() {
  const [t, setT] = useState(5.5)
  const left = TREE_Y.filter((_, i) => TREE_X[i] <= t), right = TREE_Y.filter((_, i) => TREE_X[i] > t)
  const gain = th => { const l = TREE_Y.filter((_, i) => TREE_X[i] <= th), r = TREE_Y.filter((_, i) => TREE_X[i] > th); if (!l.length || !r.length) return 0; return labelEntropy(TREE_Y) - (l.length * labelEntropy(l) + r.length * labelEntropy(r)) / TREE_Y.length }
  const giniDrop = th => { const l = TREE_Y.filter((_, i) => TREE_X[i] <= th), r = TREE_Y.filter((_, i) => TREE_X[i] > th); if (!l.length || !r.length) return 0; return gini(TREE_Y) - (l.length * gini(l) + r.length * gini(r)) / TREE_Y.length }
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="threshold" value={t} min={1.5} max={9.5} step={1} onChange={setT} /></div>
    <Graph x={[0.5, 10.5]} y={[-0.2, 1.1]} height={220} points={TREE_X.map((x, i) => ({ x, y: TREE_Y[i] ? 1 : 0, color: TREE_Y[i] ? C.orange : C.teal }))}
      fns={[{ f: th => gain(Math.floor(th) + 0.5), color: C.violet, label: 'information gain', labelAt: 3.2 }, { f: th => giniDrop(Math.floor(th) + 0.5), color: C.blue, dash: true, label: 'Gini decrease', labelAt: 8 }]} segments={[{ x1: t, y1: -0.2, x2: t, y2: 1.1, color: C.grey, dash: true }]} />
    <Working rows={[['left labels', left.join(' '), `H = ${fmt(left.length ? labelEntropy(left) : 0, 3)}`], ['right labels', right.join(' '), `H = ${fmt(right.length ? labelEntropy(right) : 0, 3)}`], ['information gain', 'H(parent) − weighted H(children)', fmt(gain(t), 4)]]} />
  </div>
}

const CLOUD = (() => { const r = new PyRandom(11), pts = []; for (const [cx, cy] of [[1, 1], [4, 1.5], [2.5, 4]]) for (let i = 0; i < 25; i++) pts.push([cx + pyGauss(r, 0, 0.55), cy + pyGauss(r, 0, 0.55)]); return pts })()
export function KMeansFig() {
  const [seed, setSeed] = useState(1), [steps, setSteps] = useState(1)
  const [centres, labels, history] = kmeans(CLOUD, 3, steps, seed), colours = [C.teal, C.orange, C.violet]
  return <div className="qm-fig">
    <div className="qm-buttons"><button disabled={steps >= 10} onClick={() => setSteps(steps + 1)}>One more round →</button><button onClick={() => setSteps(1)}>Restart</button><button onClick={() => { setSeed(seed + 1); setSteps(1) }}>Re-seed</button></div>
    <Graph x={[-1, 6]} y={[-1, 6]} equal height={260} points={[...CLOUD.map((p, i) => ({ x: p[0], y: p[1], r: 3, color: colours[labels[i]] })), ...centres.map((c, j) => ({ x: c[0], y: c[1], r: 8, color: colours[j], label: `μ${j + 1}` }))]} />
    <Bars rows={history.map((j, i) => ({ label: `round ${i + 1}`, value: j, color: C.teal }))} digits={2} />
  </div>
}

const MIX = [-1.8, -1.2, -1.5, -0.7, -2.2, -1.0, 2.1, 2.6, 1.7, 2.4, 3.0, 2.2, 1.9, 0.2]
export function GMMFig() {
  const [iters, setIters] = useState(1)
  const [mus, vars, weights, history] = emGmm(MIX, [-0.5, 0.5], iters)
  const resp = MIX.map(x => { const p = mus.map((m, j) => weights[j] * normal1(x, m, vars[j])), s = p[0] + p[1]; return p[0] / s })
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="EM steps" value={iters} min={1} max={25} step={1} onChange={setIters} show={v => String(v)} /></div>
    <Graph x={[-4, 5]} y={[-0.05, 0.3]} height={230} fns={[{ f: x => weights[0] * normal1(x, mus[0], vars[0]), color: C.teal }, { f: x => weights[1] * normal1(x, mus[1], vars[1]), color: C.orange }, { f: x => weights[0] * normal1(x, mus[0], vars[0]) + weights[1] * normal1(x, mus[1], vars[1]), color: C.grey, dash: true, label: 'mixture' }]}
      points={MIX.map((x, i) => ({ x, y: 0.02, r: 4, color: resp[i] > 0.5 ? C.teal : C.orange }))} />
    <Working rows={[['means', '', mus.map(m => fmt(m, 3)).join(', ')], ['weights', '', weights.map(w => fmt(w, 3)).join(', ')], ['log-likelihood', `after ${iters} step${iters > 1 ? 's' : ''}`, fmt(history.at(-1), 4)]]} />
  </div>
}

const SVM_X = [[1, 2], [2, 3], [2.5, 1.5], [3, 2.8], [-1, -1], [-2, -1], [-1.5, 0.5], [-0.5, -2]], SVM_Y = [1, 1, 1, 1, -1, -1, -1, -1]
export function SVMFig() {
  const [angle, setAngle] = useState(40), [offset, setOffset] = useState(0), [trained, setTrained] = useState(false)
  const t = angle * Math.PI / 180, scale = 1.2
  const [w, b] = trained ? svmSgd(SVM_X, SVM_Y, 0.05, 200, 1) : [[scale * Math.cos(t), scale * Math.sin(t)], offset]
  const nw = Math.hypot(...w), line = c => (w[1] !== 0 ? x => (c - b - w[0] * x) / w[1] : () => NaN)
  const margins = SVM_X.map((x, i) => SVM_Y[i] * (dot(w, x) + b))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="boundary angle" value={angle} min={0} max={180} step={5} onChange={v => { setAngle(v); setTrained(false) }} show={v => `${v}°`} /><Slider label="offset b" value={offset} min={-2} max={2} step={0.1} onChange={v => { setOffset(v); setTrained(false) }} /><div className="qm-buttons"><button onClick={() => setTrained(true)}>Train (hinge loss)</button></div></div>
    <Graph x={[-3, 4]} y={[-3, 4]} equal height={260} fns={[{ f: line(0), color: C.grey }, { f: line(1), color: C.grey, dash: true }, { f: line(-1), color: C.grey, dash: true }]}
      points={SVM_X.map((x, i) => ({ x: x[0], y: x[1], r: margins[i] <= 1.0001 ? 7 : 4, color: SVM_Y[i] > 0 ? C.teal : C.orange }))} />
    <Working rows={[['margin', '1 / ‖w‖', fmt(1 / nw, 3)], ['points in or past the street', 'enlarged', String(margins.filter(m => m < 1).length)], ['objective', 'λ/2‖w‖² + mean hinge (λ = 0.05)', fmt(hingeLoss(w, b, SVM_X, SVM_Y, 0.05), 4)]]} />
  </div>
}

export function InitFig() {
  const [scale, setScale] = useState(1.4)
  const spreads = useMemo(() => activationSpread(30, 64, scale, 3), [scale])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="weight scale (√2 ≈ 1.41 is He)" value={scale} min={0.8} max={2} step={0.05} onChange={setScale} /></div>
    <Graph x={[0.5, 30.5]} y={[-8, 8]} height={220} rects={spreads.map((s, i) => ({ x: i + 0.6, y: 0, w: 0.8, h: Math.log10(Math.max(s, 1e-8)), color: C.teal, opacity: 0.7 }))} xlabel="layer" ylabel="log₁₀ of output spread" />
    <Working rows={[['spread after 30 layers', `scale ${fmt(scale, 2)}`, spreads.at(-1).toExponential(2)], ['per-layer factor (theory)', 'scale² / 2', fmt(scale * scale / 2, 3)]]} />
  </div>
}

const BATCH = [[1, 10, 0.2], [2, 20, 0.5], [6, 30, 0.1], [3, 15, 0.9]]
export function LayerNormFig() {
  const [mode, setMode] = useState('batch')
  const out = mode === 'batch' ? (() => { const cols = BATCH[0].map((_, j) => layerNorm(BATCH.map(r => r[j]))); return BATCH.map((_, i) => cols.map(c => c[i])) })() : BATCH.map(r => layerNorm(r))
  const mean = v => v.reduce((s, a) => s + a, 0) / v.length
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Normalise <select value={mode} onChange={e => setMode(e.target.value)}><option value="batch">per feature, over the batch (batch norm)</option><option value="layer">per example, over features (layer norm)</option></select></label></div>
    <div className="mm-matrix-row"><table className="mm-dice mm-truth"><tbody>{BATCH.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table><span>→</span>
      <table className="mm-dice mm-truth"><tbody>{out.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{fmt(v, 2)}</td>)}</tr>)}</tbody></table></div>
    <Working rows={mode === 'batch' ? out[0].map((_, j) => [`feature ${j + 1}`, 'column mean', fmt(mean(out.map(r => r[j])), 6)]) : out.map((r, i) => [`example ${i + 1}`, 'row mean', fmt(mean(r), 6)])} />
  </div>
}

export function DropoutFig() {
  const [p, setP] = useState(0.5), [draws, setDraws] = useState(1)
  const x = [0.8, 1.5, -0.4, 1.1, 0.6, -0.9], w = [0.5, -0.3, 0.8, 0.4, -0.6, 0.2], full = dot(w, x)
  const outs = useMemo(() => { const rng = new PyRandom(4), o = []; for (let i = 0; i < 2000; i++) o.push(dot(w, x.map(a => (rng.random() < p ? 0 : a / (1 - p))))); return o }, [p])
  const lastMask = useMemo(() => { const rng = new PyRandom(100 + draws); return x.map(() => rng.random() >= p) }, [draws, p])
  const avg = outs.slice(0, draws * 20).reduce((s, v) => s + v, 0) / (draws * 20)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="drop probability p" value={p} min={0.1} max={0.8} step={0.05} onChange={setP} /><div className="qm-buttons"><button onClick={() => setDraws(d => Math.min(100, d + 1))}>Draw 20 more masks</button><button onClick={() => setDraws(1)}>Reset</button></div></div>
    <div className="mm-chips">{x.map((a, i) => <span key={i} className={`mm-chip${lastMask[i] ? ' mm-chosen' : ''}`} style={{ width: 'auto', padding: '0 6px' }}>{lastMask[i] ? fmt(a / (1 - p), 2) : '0'}</span>)}</div>
    <Working rows={[['full network output', 'w · x', fmt(full, 4)], [`average over ${draws * 20} masks`, draws * 20 < 200 ? 'still noisy: draw more' : 'close to w · x: the expectation is preserved', fmt(avg, 4)]]} />
  </div>
}

const SIGNAL = [0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0]
const KERNELS = { edge: ['edge (1, 0, −1)', [1, 0, -1]], blur: ['blur (⅓, ⅓, ⅓)', [1 / 3, 1 / 3, 1 / 3]], spike: ['identity (0, 1, 0)', [0, 1, 0]] }
export function ConvolutionSlideFig() {
  const [which, setWhich] = useState('edge'), [pos, setPos] = useState(2), [shift, setShift] = useState(0)
  const k = KERNELS[which][1], x = SIGNAL.map((_, i) => SIGNAL[(i - shift + SIGNAL.length) % SIGNAL.length]), y = conv1d(x, k)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Kernel <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(KERNELS).map(([key, [n]]) => <option key={key} value={key}>{n}</option>)}</select></label><Slider label="window position" value={pos} min={0} max={y.length - 1} step={1} onChange={setPos} show={v => String(v)} /><Slider label="shift the input" value={shift} min={0} max={4} step={1} onChange={setShift} show={v => String(v)} /></div>
    <Graph x={[-0.5, 11.5]} y={[-3.5, 3.5]} height={220} rects={[{ x: pos - 0.5, y: -3.5, w: 3, h: 7, color: C.violet, opacity: 0.12 }]}
      points={[...x.map((v, i) => ({ x: i, y: v, r: 4, color: C.grey })), ...y.map((v, i) => ({ x: i + 1, y: v, r: 4, color: i === pos ? C.orange : C.teal }))]} xlabel="grey: input · teal: output (placed at the window's centre)" />
    <Working rows={[['output at the window', k.map((kj, j) => `${fmt(kj, 2)}×${fmt(x[pos + j], 2)}`).join(' + '), fmt(y[pos], 3)]]} />
  </div>
}
