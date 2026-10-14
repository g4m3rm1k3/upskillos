// Figures for the paper walkthroughs: each one runs the paper's key equation from engine/maths.js.
import { useMemo, useState } from 'react'
import {
  dropoutLossSampled, dropoutLossMarginal, dropoutRidge, pairObjective, bestPairScore, toyElbo, logNormal, estimatorSpread, estimatorA, estimatorB,
  adamSteps, bnBackward, bnBackwardCompact, bnForward, gradientNorm, transformerLrate, gae, segmentAdvantage, tdErrors,
  linearBetas, alphaBars, lossWeight, loraTrain, DROP_X, DROP_Y, PPO_R, PPO_V, LORA_TARGET, LORA_INPUTS,
} from '../engine/maths.js'
import { Graph, Slider, Bars, Working, C, fmt } from './ui.jsx'

const log10 = v => Math.log10(Math.max(v, 1e-30))

const DROP_PS = Array.from({ length: 19 }, (_, i) => 0.1 + 0.05 * i)
export function DropoutRidgeFig() {
  const [p, setP] = useState(0.5)
  const curves = useMemo(() => DROP_PS.map(q => dropoutRidge(DROP_X, DROP_Y, q).map(w => q * w)), [])
  const w = dropoutRidge(DROP_X, DROP_Y, p), tilde = w.map(a => p * a), ls = dropoutRidge(DROP_X, DROP_Y, 1)
  const sampled = useMemo(() => dropoutLossSampled(DROP_X, DROP_Y, w, p, 2000, 1), [p])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="keep probability p" value={p} min={0.1} max={1} step={0.05} onChange={setP} /></div>
    <Graph x={[0, 1.05]} y={[-0.2, 2.4]} height={220} xlabel="p" ylabel="test-time weight w̃ = p·w"
      points={[...DROP_PS.flatMap((q, i) => [{ x: q, y: curves[i][0], color: C.teal, r: 3 }, { x: q, y: curves[i][1], color: C.violet, r: 3 }]),
        { x: p, y: tilde[0], color: C.teal, r: 6, label: 'w̃₁' }, { x: p, y: tilde[1], color: C.violet, r: 6, label: 'w̃₂' }]}
      segments={[{ x1: 0, y1: ls[0], x2: 1.05, y2: ls[0], color: C.teal, dash: true }, { x1: 0, y1: ls[1], x2: 1.05, y2: ls[1], color: C.violet, dash: true }]} />
    <Working rows={[
      ['weights trained with dropout', 'minimise the closed form', `w = (${fmt(w[0], 3)}, ${fmt(w[1], 3)})`],
      ['used at test time', 'W_test = pW', `w̃ = (${fmt(tilde[0], 3)}, ${fmt(tilde[1], 3)})`],
      ['ordinary least squares', 'p = 1 (dashed lines)', `(${fmt(ls[0], 3)}, ${fmt(ls[1], 3)})`],
      ['loss at w, averaged over 2000 masks', 'E‖y − (R∗X)w‖²', fmt(sampled, 3)],
      ['loss at w, closed form', '‖y − pXw‖² + p(1−p)‖Γw‖²', fmt(dropoutLossMarginal(DROP_X, DROP_Y, w, p), 3)],
      ['ridge strength on w̃', '(1 − p)/p', fmt((1 - p) / p, 3)],
    ]} />
  </div>
}

const W2V = { word: 1000, context: 2000, total: 1e6 }
export function Word2VecFig() {
  const [nPair, setNPair] = useState(50), [k, setK] = useState(5)
  const nNoise = k * W2V.word * W2V.context / W2V.total, best = bestPairScore(nPair, W2V.word, W2V.context, W2V.total, k)
  const pmi = Math.log(nPair * W2V.total / (W2V.word * W2V.context))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="times the pair occurs" value={nPair} min={1} max={100} step={1} onChange={setNPair} show={v => String(v)} /><Slider label="noise words per pair k" value={k} min={1} max={20} step={1} onChange={setK} show={v => String(v)} /></div>
    <Graph x={[-6, 6]} y={[-260, 0]} height={220} xlabel="score x = v′ᵀv" ylabel="the pair's share of the objective"
      fns={[{ f: x => pairObjective(x, nPair, nNoise), color: C.teal }]}
      points={[{ x: best, y: pairObjective(best, nPair, nNoise), color: C.orange, r: 6, label: 'peak' }]}
      segments={[{ x1: best, y1: -260, x2: best, y2: 0, color: C.orange, dash: true }]} />
    <Working rows={[
      ['word, context word, all pairs', 'counts', `${W2V.word}, ${W2V.context}, ${W2V.total.toExponential(0)}`],
      ['expected noise draws of this pair', 'k · #w · #c / |D|', fmt(nNoise, 3)],
      ['PMI', 'log(#(w,c)·|D| / (#w·#c))', fmt(pmi, 4)],
      ['best score', 'PMI − log k', fmt(best, 4)],
    ]} />
  </div>
}

export function VAEEstimatorFig() {
  const [mu, setMu] = useState(0.3), [sigma, setSigma] = useState(0.9)
  const x = 1, logp = logNormal(x, 0, 2), elbo = toyElbo(x, mu, sigma)
  const [ma, va] = useMemo(() => estimatorSpread(estimatorA, x, mu, sigma, 1000, 3), [mu, sigma])
  const [mb, vb] = useMemo(() => estimatorSpread(estimatorB, x, mu, sigma, 1000, 3), [mu, sigma])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="q's mean μ" value={mu} min={-1} max={2} step={0.05} onChange={setMu} /><Slider label="q's spread σ" value={sigma} min={0.2} max={1.5} step={0.05} onChange={setSigma} /></div>
    <Graph x={[-1, 2]} y={[-4, -1.2]} height={200} xlabel="μ" ylabel="ELBO"
      fns={[{ f: m => toyElbo(x, m, sigma), color: C.teal, label: 'ELBO at this σ', labelAt: 1.9 }, { f: () => logp, color: C.grey, dash: true, label: 'log p(x)', labelAt: -0.3 }]}
      points={[{ x: mu, y: elbo, color: C.orange, r: 6 }, { x: 0.5, y: logp, color: C.violet, r: 4, label: 'true posterior' }]} />
    <Bars rows={[{ label: 'variance of A, eq. (6)', value: va, color: C.violet }, { label: 'variance of B, eq. (7)', value: vb, color: C.teal }]} digits={4} />
    <Working rows={[
      ['log p(x)', 'log N(1; 0, 2)', fmt(logp, 4)], ['exact ELBO', 'eq. (3)', fmt(elbo, 4)], ['gap', 'KL(q ‖ true posterior)', fmt(logp - elbo, 4)],
      ['estimator A', 'mean of 1000', fmt(ma, 4)], ['estimator B', 'mean of 1000', fmt(mb, 4)],
    ]} />
    <p className="qm-hint">The true posterior is N(0.5, 0.5): set μ = 0.5 and σ ≈ 0.71 and A's variance drops to zero.</p>
  </div>
}

const B1 = 0.9, B2 = 0.999, PAPER_BOUND = (1 - B1) / Math.sqrt(1 - B2)
const QUIET = 3000
const PATTERNS = {
  constant: ['the same gradient every step', () => Array(QUIET + 100).fill(1)],
  scaled: ['the same, a thousand times bigger', () => Array(QUIET + 100).fill(1000)],
  noisy: ['random signs, mean 0.2', () => { let s = 7; return Array.from({ length: QUIET + 100 }, () => { s = (s * 16807) % 2147483647; return (s / 2147483647 < 0.6 ? 1 : -1) }) }],
  spike: ['zero, then one spike', () => [...Array(QUIET + 99).fill(0), 1]],
  growing: ['zero, then growing 11% a step', () => [...Array(QUIET + 40).fill(0), ...Array.from({ length: 60 }, (_, i) => (B2 / B1) ** i)]],
}
export function AdamStepFig() {
  const [pattern, setPattern] = useState('growing')
  const steps = useMemo(() => adamSteps(PATTERNS[pattern][1](), 1, B1, B2, 1e-8).slice(QUIET).map(Math.abs), [pattern])
  const top = Math.max(...steps)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Gradients <select value={pattern} onChange={e => setPattern(e.target.value)}>{Object.entries(PATTERNS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    <Graph x={[0, 100]} y={[0, 8]} height={210} xlabel="the last 100 of 3100 steps" ylabel="|Δ| / α"
      points={steps.map((s, i) => ({ x: i, y: s, color: C.teal, r: 2.5 }))}
      segments={[{ x1: 0, y1: 1, x2: 100, y2: 1, color: C.grey, dash: true }, { x1: 0, y1: PAPER_BOUND, x2: 100, y2: PAPER_BOUND, color: C.orange, dash: true }]} />
    <Working rows={[['largest step', 'in units of α', fmt(top, 3)], ['the paper\'s first bound', '(1 − β₁)/√(1 − β₂) (orange)', fmt(PAPER_BOUND, 3)], ['the typical size', 'α (grey)', '1']]} />
  </div>
}

const BN_D = [0.5, -1, 2, 0.1], BN_G = 1.5
export function BatchNormGradFig() {
  const [x4, setX4] = useState(7)
  const xs = [1, 2, 4, x4], [dx] = bnBackward(xs, BN_D, BN_G), compact = bnBackwardCompact(xs, BN_D, BN_G)
  const xHat = bnForward(xs, 1, 0), h = 1e-6, loss = v => bnForward(v, BN_G, 0).reduce((s, y, i) => s + BN_D[i] * y, 0)
  const numeric = (loss([1 + h, 2, 4, x4]) - loss([1 - h, 2, 4, x4])) / (2 * h)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="fourth value in the batch" value={x4} min={-3} max={12} step={0.5} onChange={setX4} /></div>
    <Bars rows={dx.map((d, i) => ({ label: `∂ℓ/∂x${i + 1} (x = ${fmt(xs[i], 2)})`, value: d, color: C.teal }))} digits={4} />
    <Working rows={[
      ['∂ℓ/∂x₁, the paper\'s equations', 'six steps', fmt(dx[0], 6)], ['∂ℓ/∂x₁, compact form', 'one line', fmt(compact[0], 6)], ['∂ℓ/∂x₁, measured', 'nudge x₁ by ±10⁻⁶', fmt(numeric, 6)],
      ['Σ ∂ℓ/∂xᵢ', 'always 0', fmt(dx.reduce((s, d) => s + d, 0), 6)], ['Σ x̂ᵢ ∂ℓ/∂xᵢ', '0 when ε = 0; tiny here', fmt(dx.reduce((s, d, i) => s + d * xHat[i], 0), 6)],
    ]} />
  </div>
}

const DEPTHS = Array.from({ length: 40 }, (_, i) => i + 1)
export function ResNetGradFig() {
  const [scale, setScale] = useState(0.3), [depth, setDepth] = useState(30)
  const runs = useMemo(() => DEPTHS.map(d => [gradientNorm(d, 8, scale, false, 5), gradientNorm(d, 8, scale, true, 5)]), [scale])
  const [plain, res] = runs[depth - 1]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="weight scale s" value={scale} min={0.1} max={1} step={0.05} onChange={setScale} /><Slider label="depth" value={depth} min={1} max={40} step={1} onChange={setDepth} show={v => String(v)} /></div>
    <Graph x={[0, 41]} y={[-12, 6]} height={230} xlabel="layers" ylabel="log₁₀ ‖∂E/∂x₀‖"
      fns={[{ f: L => L * log10(scale), color: C.orange, dash: true, label: 'plain: sᴸ', labelAt: 38 }, { f: L => L / 2 * log10(1 + scale * scale), color: C.violet, dash: true, label: 'residual: (1 + s²)^(L/2)', labelAt: 38 }]}
      points={runs.flatMap(([p, r], i) => [[p, C.orange], [r, C.violet]].filter(([v]) => log10(v) >= -12 && log10(v) <= 6).map(([v, color]) => ({ x: i + 1, y: log10(v), color, r: i + 1 === depth ? 5 : 2.5 })))} />
    <Working rows={[['plain stack', `x ← Wx, ${depth} layers`, plain.toExponential(3)], ['residual stack', `x ← x + Wx, ${depth} layers`, fmt(res, 6)]]} />
  </div>
}

export function TransformerScheduleFig() {
  const [warmup, setWarmup] = useState(4000), [dModel, setDModel] = useState(512)
  const peak = transformerLrate(warmup, dModel, warmup)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="warmup_steps" value={warmup} min={500} max={10000} step={500} onChange={setWarmup} show={v => String(v)} />
      <label>d_model <select value={dModel} onChange={e => setDModel(Number(e.target.value))}>{[256, 512, 1024].map(d => <option key={d} value={d}>{d}</option>)}</select></label></div>
    <Graph x={[0, 100]} y={[0, 1.6]} height={210} xlabel="step (thousands)" ylabel="lrate × 1000"
      fns={[{ f: k => 1000 * transformerLrate(Math.max(1, k * 1000), dModel, warmup), color: C.teal }]}
      points={[{ x: warmup / 1000, y: 1000 * peak, color: C.orange, r: 6, label: 'peak' }]} />
    <Working rows={[['peak', `step = warmup_steps = ${warmup}`, fmt(peak, 7)], ['peak, by formula', '(d_model · warmup_steps)^(−1/2)', fmt(1 / Math.sqrt(dModel * warmup), 7)], ['at step 100,000', 'd_model^(−1/2) · step^(−1/2)', fmt(transformerLrate(100000, dModel, warmup), 7)]]} />
  </div>
}

export function GAEFig() {
  const [lam, setLam] = useState(0.95)
  const adv = gae(PPO_R, PPO_V, 0.99, lam), deltas = tdErrors(PPO_R, PPO_V, 0.99)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="λ" value={lam} min={0} max={1} step={0.05} onChange={setLam} /></div>
    <Bars rows={adv.map((a, t) => ({ label: `Â${t} (r = ${PPO_R[t]}, δ = ${fmt(deltas[t], 3)})`, value: a, color: C.teal }))} digits={4} />
    <Working rows={[['Â₀ with λ = 0', 'δ₀ alone', fmt(deltas[0], 4)], [`Â₀ with λ = ${fmt(lam, 2)}`, 'eq. (11)', fmt(adv[0], 4)], ['Â₀ with λ = 1', 'eq. (10)', fmt(segmentAdvantage(PPO_R, PPO_V, 0.99, 0), 4)], ['weight on δ₅ in Â₀', '(γλ)⁵', fmt((0.99 * lam) ** 5, 4)]]} />
  </div>
}

const BETAS = linearBetas()
export function DDPMWeightFig() {
  const [variance, setVariance] = useState('beta'), [t, setT] = useState(10)
  const ab = useMemo(() => alphaBars(BETAS), [])
  const sigma2 = s => (variance === 'beta' ? BETAS[s - 1] : (1 - ab[s - 2]) / (1 - ab[s - 1]) * BETAS[s - 1])
  const weights = useMemo(() => Array.from({ length: 999 }, (_, i) => lossWeight(i + 2, BETAS, sigma2(i + 2))), [variance])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>σ_t² <select value={variance} onChange={e => setVariance(e.target.value)}><option value="beta">β_t</option><option value="tilde">β̃_t</option></select></label><Slider label="t" value={t} min={2} max={1000} step={1} onChange={setT} show={v => String(v)} /></div>
    <Graph x={[0, 1030]} y={[-2.6, 0.2]} height={200} xlabel="t" ylabel="log₁₀ weight"
      points={weights.filter((_, i) => i % 10 === 0).map((w, j) => ({ x: 2 + 10 * j, y: log10(w), color: C.teal, r: 2 }))}
      segments={[{ x1: 0, y1: 0, x2: 1030, y2: 0, color: C.orange, dash: true }]}>
      {({ X, Y }) => <circle cx={X(t)} cy={Y(log10(weights[t - 2]))} r="6" fill={C.violet} />}
    </Graph>
    <Working rows={[['β_t', 'the schedule', fmt(BETAS[t - 1], 6)], ['ᾱ_t', 'Π(1 − β_s)', fmt(ab[t - 1], 6)], ['true-bound weight', 'β_t²/(2σ_t²α_t(1 − ᾱ_t))', fmt(weights[t - 2], 6)], ['L_simple\'s weight', 'orange line', '1']]} />
  </div>
}

export function LoRAFig() {
  const [r, setR] = useState(1)
  const curves = useMemo(() => [1, 2, 3, 4].map(q => loraTrain(LORA_TARGET, LORA_INPUTS, q, 0.5, 200, 1)), [])
  const losses = curves[r - 1]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="rank r" value={r} min={1} max={4} step={1} onChange={setR} show={v => String(v)} /></div>
    <Graph x={[0, 200]} y={[-8, 0]} height={210} xlabel="step" ylabel="log₁₀ loss"
      points={curves.flatMap((c, q) => c.map((l, i) => ({ x: i, y: log10(l), color: q + 1 === r ? C.teal : C.grey, r: q + 1 === r ? 3 : 1.5 })).filter((pt, i) => i % 4 === 0 && pt.y >= -8))}
      segments={[{ x1: 0, y1: log10(0.0625), x2: 200, y2: log10(0.0625), color: C.orange, dash: true }]} />
    <Working rows={[['loss before training', 'B = 0, so BA = 0', fmt(losses[0], 4)], ['loss after 200 steps', `rank ${r}`, fmt(losses.at(-1), 6)], ['best possible at rank 1', 'σ₂²/4 (orange)', '0.0625'], ['trainable numbers here', 'r(d + k), d = k = 4', String(r * 8)]]} />
  </div>
}
