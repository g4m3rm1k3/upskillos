import React, { useMemo, useState } from 'react'
import { DTEST, fgsm, pgd, inputGrad, trainDigits, predictDigit, accuracyUnder, f1, covariateExperiment, trueWeight, labelExperiment, adjust, adaptExperiment } from './engine.js'
import { W, H } from '../l53-vae/engine.js'
import { Plot, Path, Bars, Contour } from '../../kit/Plot.jsx'
import { PanelHeading, Slider, Choice, Toggle, Controls, Metrics, Insight, Caption, Legend, Table } from '../../kit/ui.jsx'
import { fmt, pct, linspace } from '../../kit/math.js'

const memo = {}
const once = (key, fn) => memo[key] ?? (memo[key] = fn())
const MODELS = { std: { name: 'Standard training', opts: {} }, fgsm: { name: 'Adversarial training (FGSM, ε = 0.15)', opts: { advEps: 0.15 } }, pgd: { name: 'Adversarial training (PGD, ε = 0.15)', opts: { advEps: 0.15, attack: 'pgd' } } }
const model = k => once(`m-${k}`, () => trainDigits(MODELS[k].opts))
const EPS = linspace(0, 0.3, 13)
const gradL1 = k => once(`g-${k}`, () => DTEST.slice(0, 100).reduce((t, r) => t + inputGrad(model(k), [r.x], [r.d])[0].reduce((a, b) => a + Math.abs(b), 0), 0) / 100)
const curve = (k, attack) => once(`c-${k}-${attack}`, () => EPS.map(e => accuracyUnder(model(k), attack, e)))

function Pixels({ img, size = 14, label, signed = false }) {
  return <figure style={{ margin: 0, textAlign: 'center', flex: '0 0 auto', width: W * size + 60 }}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W * size} height={H * size} style={{ width: W * size, height: H * size, background: 'var(--surface, white)', border: '1px solid var(--border)', borderRadius: 3 }} role="img" aria-label={label}>
      {Array.from(img).map((v, i) => <rect key={i} x={i % W} y={Math.floor(i / W)} width="1.02" height="1.02" fill={signed ? (v > 0 ? '#ef4444' : 'var(--chart-train)') : 'var(--text)'} opacity={signed ? Math.min(1, Math.abs(v)) : Math.max(0, Math.min(1, v))} />)}
    </svg>
    <figcaption className="ml-caption">{label}</figcaption>
  </figure>
}
const Row = ({ children }) => <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', margin: '8px 0' }}>{children}</div>
const argmax = p => p.indexOf(Math.max(...p))

// ---------- 61.1 FGSM ----------
function FgsmView() {
  const [i, setI] = useState(0), [eps, setEps] = useState(0.1), [attack, setAttack] = useState('fgsm')
  const net = model('std'), r = DTEST[i]
  const adv = attack === 'fgsm' ? fgsm(net, [r.x], [r.d], eps)[0] : pgd(net, [r.x], [r.d], eps)[0]
  const p0 = predictDigit(net, r.x), p1 = predictDigit(net, adv), delta = adv.map((v, j) => (eps ? (v - r.x[j]) / eps : 0))
  const curves = { fgsm: curve('std', 'fgsm'), pgd: curve('std', 'pgd'), random: curve('std', 'random') }
  return <>
    <Controls>
      <Slider label="Test image" value={i + 1} min={1} max={40} onChange={v => setI(v - 1)} />
      <Slider label="Perturbation budget ε (per pixel)" value={eps} min={0} max={0.3} step={0.01} onChange={setEps} format={v => v.toFixed(2)} />
      <Choice label="Attack" value={attack} onChange={setAttack} options={[['fgsm', 'FGSM: one signed-gradient step'], ['pgd', 'PGD: 10 projected steps']]} />
    </Controls>
    <Caption>A small network classifies 5 × 7 digit images (pixel values 0 to 1). The attack may change every pixel by at most ε, choosing the direction that increases the network’s loss.</Caption>
    <Row>
      <Pixels img={r.x} label={`original: a ${r.d}`} />
      <Pixels img={delta} signed label="change (red up, blue down)" />
      <Pixels img={adv} label={`attacked, ε = ${eps.toFixed(2)}`} />
    </Row>
    <Metrics items={[['prediction before', `${argmax(p0)} (${pct(Math.max(...p0))})`], ['prediction after', `${argmax(p1)} (${pct(Math.max(...p1))})`], ['largest pixel change', fmt(Math.max(...adv.map((v, j) => Math.abs(v - r.x[j]))), 3)]]} />
    <Bars label="Probabilities after the attack" items={p1.map((v, k) => ({ label: `digit ${k}`, value: v, color: k === r.d ? '#10b981' : k === argmax(p1) ? '#ef4444' : undefined }))} max={1} format={v => pct(v)} />
    <Plot x={[0, 0.3]} y={[0, 1]} height={220} xLabel="ε" yLabel="test accuracy" yFormat={v => `${(100 * v).toFixed(0)}%`} label="Accuracy under attack">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={EPS.map((e, k) => [e, curves.random[k]])} stroke="var(--muted)" dash="5 4" />
      <Path X={X} Y={Y} points={EPS.map((e, k) => [e, curves.fgsm[k]])} stroke="var(--chart-val)" />
      <Path X={X} Y={Y} points={EPS.map((e, k) => [e, curves.pgd[k]])} stroke="#ef4444" />
      <line x1={X(eps)} x2={X(eps)} y1={Y(0)} y2={Y(1)} stroke="var(--text)" strokeDasharray="3 3" />
    </>}</Plot>
    <Legend items={[['┅', 'random ±ε noise', 'var(--muted)'], ['━', 'FGSM', 'var(--chart-val)'], ['━', 'PGD', '#ef4444']]} />
    <Insight title="What to notice">Random noise of size 0.1 barely matters (accuracy stays near 89%), but the same budget aimed along the gradient drops accuracy to roughly a quarter to a third. At ε = 0.15 almost every image is misclassified, while the attacked image still looks like the same digit. The network’s decision depends on a weighted sum of all 35 pixels, and nudging every pixel a little in the worst direction adds up. PGD, which takes several small steps, is always at least as strong as FGSM — evaluate robustness with the strongest attack you can run.</Insight>
  </>
}

// ---------- 61.2 Adversarial training ----------
function AdvTrainView() {
  const [i, setI] = useState(0), [k, setK] = useState('pgd')
  const r = DTEST[i], grads = Object.fromEntries(['std', k].map(m => { const g = inputGrad(model(m), [r.x], [r.d])[0], s = Math.max(...g.map(Math.abs)) || 1; return [m, g.map(v => v / s)] }))
  const rows = Object.keys(MODELS).map(m => [MODELS[m].name, pct(curve(m, 'pgd')[0]), pct(curve(m, 'pgd')[4]), pct(curve(m, 'pgd')[6]), pct(curve(m, 'pgd')[8])])
  const COL = { std: 'var(--chart-train)', fgsm: 'var(--chart-val)', pgd: '#10b981' }
  return <>
    <Controls>
      <Choice label="Compare the standard model with" value={k} onChange={setK} options={[['fgsm', MODELS.fgsm.name], ['pgd', MODELS.pgd.name]]} />
      <Slider label="Image for the gradient maps" value={i + 1} min={1} max={40} onChange={v => setI(v - 1)} />
    </Controls>
    <Caption>Adversarial training replaces each training batch by attacked versions of itself, made against the current weights: it minimizes the worst-case loss inside the ε-box. All three models are evaluated with a 10-step PGD attack.</Caption>
    <Plot x={[0, 0.3]} y={[0, 1]} height={240} xLabel="attack budget ε" yLabel="accuracy under PGD" yFormat={v => `${(100 * v).toFixed(0)}%`} label="Robust accuracy">{({ X, Y }) => Object.keys(MODELS).map(m => <Path key={m} X={X} Y={Y} points={EPS.map((e, j) => [e, curve(m, 'pgd')[j]])} stroke={COL[m]} width={m === 'std' || m === k ? 2.6 : 1.2} opacity={m === 'std' || m === k ? 1 : 0.4} />)}</Plot>
    <Legend items={Object.keys(MODELS).map(m => ['━', MODELS[m].name, COL[m]])} />
    <Table head={['model', 'clean', 'ε = 0.1', 'ε = 0.15', 'ε = 0.2']} rows={rows} caption="Accuracy on 400 test images under a 10-step PGD attack." />
    <Row>
      <Pixels img={r.x} label={`image: a ${r.d}`} />
      <Pixels img={grads.std} signed label="loss gradient, standard" />
      <Pixels img={grads[k]} signed label="loss gradient, adversarially trained" />
    </Row>
    <Metrics items={[['average ‖∇ₓ loss‖₁, standard', fmt(gradL1('std'), 2)], ['average ‖∇ₓ loss‖₁, adversarially trained', fmt(gradL1(k), 2)]]} />
    <Insight title="What to notice">Adversarial training buys a lot of robustness: at ε = 0.15 the PGD-trained model still classifies about a third of the images correctly, against almost none for the standard model. It is not free — training costs several times more, robustness still collapses beyond the ε it was trained for, and training on FGSM examples costs a few points of clean accuracy here. The mechanism shows in the gradient: to first order, an ε-step raises the loss by ε·‖∇ₓ loss‖₁, and adversarial training cuts that norm by more than half. The maps are scaled to their own maximum, so compare their patterns there and their sizes in the numbers.</Insight>
  </>
}

// ---------- 61.3 Covariate shift ----------
function CovariateView() {
  const [m, setM] = useState(1.5), [sd, setSd] = useState(0.5), [lambda, setLambda] = useState(1)
  const ex = useMemo(() => covariateExperiment({ testMean: m, testSd: sd, lambda }), [m, sd, lambda])
  const xs = linspace(-4, 4, 161), T = { mean: m, sd }, wMax = Math.max(...xs.map(x => trueWeight(x, T) ** lambda))
  const COL = { plain: '#ef4444', trueW: '#10b981', estW: 'var(--chart-model)' }, NAME = { plain: 'unweighted fit', trueW: 'weighted by true p_test/p_train', estW: 'weighted by estimated ratio' }
  return <>
    <Controls>
      <Slider label="Test inputs: mean" value={m} min={0} max={2.5} step={0.1} onChange={setM} format={v => v.toFixed(1)} />
      <Slider label="Test inputs: standard deviation" value={sd} min={0.3} max={1} step={0.05} onChange={setSd} format={v => v.toFixed(2)} />
      <Slider label="Flattening exponent λ (weights^λ)" value={lambda} min={0} max={1} step={0.1} onChange={setLambda} format={v => v.toFixed(1)} />
    </Controls>
    <Caption>{`Training inputs come from N(0, 1), test inputs from N(${m.toFixed(1)}, ${sd.toFixed(2)}²). The relationship y = f(x) is the same in both; only where x falls changes. The model is a straight line, so it cannot fit f everywhere and must choose where to be accurate.`}</Caption>
    <Plot x={[-4, 4]} y={[-4, 4]} height={280} xLabel="x" yLabel="y" label="Covariate shift">{({ X, Y }) => <>
      {ex.train.map((r, i) => <circle key={`a${i}`} cx={X(r.x)} cy={Y(r.y)} r="2.3" fill="var(--chart-train)" opacity="0.5" />)}
      {ex.test.slice(0, 200).map((r, i) => <circle key={`b${i}`} cx={X(r.x)} cy={Y(r.y)} r="2.3" fill="var(--chart-val)" opacity="0.5" />)}
      <Path X={X} Y={Y} points={xs.map(x => [x, f1(x)])} stroke="var(--text)" width={1.4} dash="5 4" />
      {Object.entries(ex.fits).map(([k, fit]) => <Path key={k} X={X} Y={Y} points={[[-4, fit.predict(-4)], [4, fit.predict(4)]]} stroke={COL[k]} width={2.4} />)}
    </>}</Plot>
    <Legend items={[['●', 'training data', 'var(--chart-train)'], ['●', 'test data', 'var(--chart-val)'], ['┅', 'true f(x)', 'var(--text)'], ...Object.keys(NAME).map(k => ['━', NAME[k], COL[k]])]} />
    <Plot x={[-4, 4]} y={[0, 4 * Math.ceil(Math.min(40, wMax * 1.1) / 4)]} height={180} xLabel="x" yLabel="importance weight" label="Importance weights">{({ X, Y }) => <>
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.min(40, trueWeight(x, T) ** lambda)])} stroke="#10b981" />
      <Path X={X} Y={Y} points={xs.map(x => [x, Math.min(40, ex.weightFn(x) ** lambda)])} stroke="var(--chart-model)" dash="5 4" />
    </>}</Plot>
    <Legend items={[['━', 'true weight', '#10b981'], ['┅', 'estimated by a domain classifier', 'var(--chart-model)']]} />
    <Metrics items={[['test MSE, unweighted', fmt(ex.testMse.plain, 3)], ['test MSE, true weights', fmt(ex.testMse.trueW, 3)], ['test MSE, estimated weights', fmt(ex.testMse.estW, 3)], ['effective sample size (of 200)', fmt(ex.ess.estW, 0)], ['domain classifier AUC', fmt(ex.auc, 2)]]} />
    <Insight title="What to notice">The unweighted line is the best line for the training inputs, not for the test inputs. Weighting each training point by p_test(x)/p_train(x) makes the training loss an unbiased estimate of the test loss, and the fitted line moves to where the test data are — test error falls from about 0.54 to 0.10 at mean 1.5. The weights can be estimated from unlabeled test inputs alone, by a classifier that tells training from test; its AUC doubles as a shift detector. The price is variance: as the shift grows, a few training points get huge weights and the effective sample size collapses. Flattening the weights (λ &lt; 1) trades some bias for lower variance.</Insight>
  </>
}

// ---------- 61.4 Label shift ----------
function LabelView() {
  const [pi, setPi] = useState(0.1)
  const ex = useMemo(() => labelExperiment(pi), [pi])
  return <>
    <Controls><Slider label="Share of class 1 at deployment" value={pi} min={0.02} max={0.5} step={0.01} onChange={setPi} format={v => pct(v)} /></Controls>
    <Caption>{`A logistic classifier is trained with 50% of each class. At deployment only ${pct(pi)} are class 1, but each class looks the same as before: p(x | y) is unchanged, only p(y) moved. Black-box shift estimation (BBSE) estimates the new share from unlabeled deployment data, and the probabilities are then re-weighted by π′(y)/π(y).`}</Caption>
    <Plot x={[-4, 4]} y={[-4, 4]} height={280} xLabel="x₁" yLabel="x₂" label="Label shift">{({ X, Y }) => <>
      {ex.deploy.slice(0, 500).map((r, i) => <circle key={i} cx={X(r.x[0])} cy={Y(r.x[1])} r="2.4" fill={r.y ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.6" />)}
      <Contour X={X} Y={Y} x0={-4} x1={4} y0={-4} y1={4} f={(a, b) => ex.model([a, b])} level={0.5} stroke="var(--muted)" dash="5 4" />
      <Contour X={X} Y={Y} x0={-4} x1={4} y0={-4} y1={4} f={(a, b) => adjust(ex.model([a, b]), 0.5, ex.est.pi1)} level={0.5} stroke="var(--chart-model)" />
    </>}</Plot>
    <Legend items={[['●', 'class 0', 'var(--chart-train)'], ['●', 'class 1', 'var(--chart-val)'], ['┅', 'boundary as trained', 'var(--muted)'], ['━', 'boundary after BBSE correction', 'var(--chart-model)']]} />
    <Table head={['probabilities', 'accuracy', 'log loss']} rows={[['As trained (assumes 50%)', pct(ex.none.acc), fmt(ex.none.logLoss, 3)], [`Corrected with the estimated share (${pct(ex.est.pi1)})`, pct(ex.estimated.acc), fmt(ex.estimated.logLoss, 3)], [`Corrected with the true share (${pct(pi)})`, pct(ex.oracle.acc), fmt(ex.oracle.logLoss, 3)]]} caption="Accuracy and log loss on 3,000 deployment points." />
    <Metrics items={[['share predicted as class 1', pct(ex.est.mu1)], ['BBSE estimate of the true share', pct(ex.est.pi1)], ['true share', pct(pi)], ['validation confusion P(ŷ=1 | y=0), P(ŷ=1 | y=1)', `${fmt(ex.est.C[1][0], 3)}, ${fmt(ex.est.C[1][1], 3)}`]]} />
    <Insight title="What to notice">The classifier still predicts class 1 for many points, because it assumes half the data are class 1. The fraction it predicts is itself evidence: every predicted rate is a known mix of the true rates, through the confusion matrix measured on validation data, so the true share can be solved for. Re-weighting moves the boundary toward the rare class, and accuracy and log loss approach what you would get knowing the true share. When the classes are rarer still, the estimate becomes noisy: a handful of errors in the confusion matrix matter more.</Insight>
  </>
}

// ---------- 61.5 Domain adaptation ----------
function AdaptView() {
  const [angle, setAngle] = useState(0.5), [showAligned, setShowAligned] = useState(true)
  const ex = useMemo(() => adaptExperiment({ angle }), [angle])
  const box = { x0: -5, x1: 7, y0: -5, y1: 3 }
  return <>
    <Controls>
      <Slider label="Target rotation (radians)" value={angle} min={0} max={1.4} step={0.1} onChange={setAngle} format={v => v.toFixed(1)} />
      <Toggle label="Show the CORAL-aligned source data" checked={showAligned} onChange={setShowAligned} />
    </Controls>
    <Caption>Labelled source data (hollow) and unlabeled target data (filled), which is the source after a stretch, an offset and a rotation. CORAL aligns the source’s mean and covariance with the target’s, then trains on the aligned labelled source; the target labels are never used (the oracle uses them, for comparison).</Caption>
    <Plot x={[box.x0, box.x1]} y={[box.y0, box.y1]} height={300} xLabel="x₁" yLabel="x₂" label="Domain adaptation">{({ X, Y }) => <>
      {ex.src.slice(0, 250).map((r, i) => <circle key={`s${i}`} cx={X(r.x[0])} cy={Y(r.x[1])} r="2.6" fill="none" stroke={r.y ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.5" />)}
      {showAligned && ex.aligned.slice(0, 250).map((r, i) => <rect key={`a${i}`} x={X(r.x[0]) - 2} y={Y(r.x[1]) - 2} width="4" height="4" fill={r.y ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.35" />)}
      {ex.tgt.slice(0, 300).map((r, i) => <circle key={`t${i}`} cx={X(r.x[0])} cy={Y(r.x[1])} r="2.6" fill={r.y ? 'var(--chart-val)' : 'var(--chart-train)'} opacity="0.8" />)}
      <Contour X={X} Y={Y} {...box} f={(a, b) => ex.models.sourceOnly([a, b])} level={0.5} stroke="var(--muted)" dash="5 4" />
      <Contour X={X} Y={Y} {...box} f={(a, b) => ex.models.coral([a, b])} level={0.5} stroke="var(--chart-model)" />
      <Contour X={X} Y={Y} {...box} f={(a, b) => ex.models.oracle([a, b])} level={0.5} stroke="#10b981" dash="2 3" />
    </>}</Plot>
    <Legend items={[['○', 'source (labelled)', 'var(--muted)'], ['■', 'source after CORAL', 'var(--muted)'], ['●', 'target (colour = hidden label)', 'var(--text)'], ['┅', 'source-only boundary', 'var(--muted)'], ['━', 'CORAL boundary', 'var(--chart-model)'], ['┅', 'target oracle', '#10b981']]} />
    <Metrics items={[['source model on source', pct(ex.acc.sourceOnSource)], ['source model on target', pct(ex.acc.sourceOnly)], ['CORAL on target', pct(ex.acc.coral)], ['oracle on target', pct(ex.acc.oracle)]]} />
    <Insight title="What to notice">With no rotation, the target is only stretched and offset, and aligning means and covariances recovers almost all of the lost accuracy. As the rotation grows, CORAL helps less: matching the overall mean and spread cannot tell which direction the classes were separated in, because the unlabeled target data do not say. Every adaptation method rests on an assumption about what stayed the same. When that assumption fails, a few labelled target examples are usually worth more than any clever alignment.</Insight>
  </>
}

const VIEWS = { 'l61-adversarial': FgsmView, 'l61-advtrain': AdvTrainView, 'l61-covariate': CovariateView, 'l61-label': LabelView, 'l61-adapt': AdaptView }
const TITLES = { 'l61-adversarial': 'Fool a classifier with a tiny, targeted change.', 'l61-advtrain': 'Defend by training on attacks.', 'l61-covariate': 'Correct a shifted input distribution by reweighting.', 'l61-label': 'Detect and correct a change in class balance.', 'l61-adapt': 'Adapt to a new domain without its labels.' }
export default function Playground({ lesson }) {
  const id = VIEWS[lesson?.id] ? lesson.id : 'l61-adversarial', View = VIEWS[id]
  return <>
    <PanelHeading title={TITLES[id]} pill="robustness · shift" />
    <View />
  </>
}
