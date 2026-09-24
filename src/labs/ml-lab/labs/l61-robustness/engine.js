// Robustness and distribution shift: adversarial examples (FGSM, PGD) and
// adversarial training on small digit images; covariate shift and importance
// weighting; label shift and prior correction (BBSE); and domain adaptation by
// aligning feature statistics (CORAL).
import { random, normal, range, mean, sigmoid } from '../../kit/math.js'
import { Dense, ReLU, Sequential, softmaxCE, Adam } from '../../kit/nn.js'
import { digitData } from '../l56-fewlabels/engine.js'
import { D as PIX } from '../l53-vae/engine.js'
export { PIX }

// ---------- Adversarial examples on digits ----------
export const DTRAIN = digitData(1000, 611), DTEST = digitData(400, 612)
const softmax = z => { const m = Math.max(...z), e = Array.from(z, v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
const clip01 = v => Math.min(1, Math.max(0, v))

// Gradient of the cross-entropy loss with respect to the input pixels.
export function inputGrad(net, xs, labels) {
  net.zeroGrad()
  const r = softmaxCE(net.forward(xs), labels)
  return net.backward(r.grad)
}
// FGSM: one step of size ε in the direction of the gradient's sign (an L∞ attack).
export function fgsm(net, xs, labels, eps) {
  const g = inputGrad(net, xs, labels)
  return xs.map((x, i) => Float64Array.from(x, (v, j) => clip01(v + eps * Math.sign(g[i][j]))))
}
// PGD: several smaller signed steps, each projected back into the ε-box around x and into [0, 1].
export function pgd(net, xs, labels, eps, { steps = 10, step = eps / 4, seed = 1 } = {}) {
  const rng = random(seed)
  let adv = xs.map(x => Float64Array.from(x, v => clip01(v + eps * (2 * rng() - 1))))
  for (let s = 0; s < steps; s++) {
    const g = inputGrad(net, adv, labels)
    adv = adv.map((a, i) => Float64Array.from(a, (v, j) => clip01(Math.min(xs[i][j] + eps, Math.max(xs[i][j] - eps, v + step * Math.sign(g[i][j]))))))
  }
  return adv
}
// Random ±ε noise of the same size, for comparison.
export function randomSign(xs, eps, seed = 2) { const rng = random(seed); return xs.map(x => Float64Array.from(x, v => clip01(v + eps * (rng() < 0.5 ? -1 : 1)))) }

export function trainDigits({ epochs = 25, advEps = 0, seed = 1, batch = 50, attack = 'fgsm' } = {}) {
  const rng = random(seed), net = new Sequential([new Dense(PIX, 48, rng), ReLU(), new Dense(48, 10, rng, { init: 'xavier' })]), opt = new Adam(net.params(), { lr: 0.005 })
  for (let e = 0; e < epochs; e++) {
    const order = range(DTRAIN.length).sort(() => rng() - 0.5)
    for (let b = 0; b + batch <= order.length; b += batch) {
      const rows = order.slice(b, b + batch).map(i => DTRAIN[i]), xs = rows.map(r => r.x), ys = rows.map(r => r.d)
      // Adversarial training: replace the batch by worst-case versions of itself (Madry et al.), made against the current weights.
      const inputs = advEps ? (attack === 'pgd' ? pgd(net, xs, ys, advEps, { steps: 5, seed: e * 1000 + b }) : fgsm(net, xs, ys, advEps)) : xs
      net.zeroGrad()
      const r = softmaxCE(net.forward(inputs), ys); net.backward(r.grad); opt.step()
    }
  }
  return net
}
export const predictDigit = (net, x) => softmax(net.forward([x])[0])
export function accuracyUnder(net, attack, eps, data = DTEST) {
  const xs = data.map(r => r.x), ys = data.map(r => r.d)
  const adv = eps === 0 ? xs : attack === 'fgsm' ? fgsm(net, xs, ys, eps) : attack === 'pgd' ? pgd(net, xs, ys, eps) : randomSign(xs, eps)
  const out = net.forward(adv)
  return mean(out.map((z, i) => (z.indexOf(Math.max(...z)) === ys[i] ? 1 : 0)))
}

// ---------- Covariate shift and importance weighting ----------
export const f1 = x => Math.sin(1.5 * x) + 0.5 * x
export function shiftData({ n = 200, mean: m = 0, sd = 1, seed = 1, noise = 0.2 } = {}) {
  const rng = random(seed)
  return range(n).map(() => { const x = m + sd * normal(rng); return { x, y: f1(x) + noise * normal(rng) } })
}
const gaussPdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))
export const TRAIN_DIST = { mean: 0, sd: 1 }
export const trueWeight = (x, test) => gaussPdf(x, test.mean, test.sd) / gaussPdf(x, TRAIN_DIST.mean, TRAIN_DIST.sd)
// Weighted least squares for y ≈ a + b·x (a deliberately misspecified straight line).
export function wls(rows, w = rows.map(() => 1)) {
  let S = 0, Sx = 0, Sy = 0, Sxx = 0, Sxy = 0
  rows.forEach((r, i) => { const v = w[i]; S += v; Sx += v * r.x; Sy += v * r.y; Sxx += v * r.x * r.x; Sxy += v * r.x * r.y })
  const b = (S * Sxy - Sx * Sy) / (S * Sxx - Sx * Sx), a = (Sy - b * Sx) / S
  return { a, b, predict: x => a + b * x }
}
// Estimate p_test(x)/p_train(x) with a domain classifier: logistic regression on (1, x, x²)
// separating unlabeled test inputs from training inputs; w = P(test|x)/P(train|x) · n_train/n_test.
export function domainWeights(trainRows, testXs, { steps = 3000, lr = 0.5 } = {}) {
  const pts = [...trainRows.map(r => [r.x, 0]), ...testXs.map(x => [x, 1])], feat = x => [1, x, x * x]
  let th = [0, 0, 0]
  for (let s = 0; s < steps; s++) {
    const g = [0, 0, 0]
    pts.forEach(([x, t]) => { const f = feat(x), p = sigmoid(f.reduce((a, v, k) => a + v * th[k], 0)); f.forEach((v, k) => { g[k] += (p - t) * v / pts.length }) })
    th = th.map((v, k) => v - lr * g[k])
  }
  const odds = x => Math.exp(feat(x).reduce((a, v, k) => a + v * th[k], 0))
  const ratio = trainRows.length / testXs.length
  const auc = (() => { const sc = pts.map(([x, t]) => [odds(x), t]), pos = sc.filter(s => s[1]), neg = sc.filter(s => !s[1]); let c = 0; pos.forEach(p => neg.forEach(q => { c += p[0] > q[0] ? 1 : p[0] === q[0] ? 0.5 : 0 })); return c / (pos.length * neg.length) })()
  return { weight: x => odds(x) * ratio, auc }
}
export const ess = w => { const s = w.reduce((a, b) => a + b, 0); return (s * s) / w.reduce((a, b) => a + b * b, 0) }
export function covariateExperiment({ testMean = 1.5, testSd = 0.5, lambda = 1, seed = 1 } = {}) {
  const train = shiftData({ n: 200, ...TRAIN_DIST, seed }), test = shiftData({ n: 1000, mean: testMean, sd: testSd, seed: seed + 100 })
  const T = { mean: testMean, sd: testSd }, wTrue = train.map(r => trueWeight(r.x, T) ** lambda)
  const dom = domainWeights(train, test.slice(0, 200).map(r => r.x)), wEst = train.map(r => dom.weight(r.x) ** lambda)
  const fits = { plain: wls(train), trueW: wls(train, wTrue), estW: wls(train, wEst) }
  const mseOn = (m, rows) => mean(rows.map(r => (m.predict(r.x) - r.y) ** 2))
  return { train, test, fits, wTrue, wEst, auc: dom.auc, weightFn: dom.weight, testMse: Object.fromEntries(Object.entries(fits).map(([k, m]) => [k, mseOn(m, test)])), ess: { trueW: ess(wTrue), estW: ess(wEst) } }
}

// ---------- Label shift ----------
// Two classes with Gaussian features; training prior 50/50, deployment prior π.
export function labelData(n, prior1, seed) {
  const rng = random(seed)
  return range(n).map(() => { const y = rng() < prior1 ? 1 : 0; return { x: [(y ? 1 : -1) + normal(rng), (y ? 0.6 : -0.6) + normal(rng)], y } })
}
export function trainLogistic(rows, { steps = 800, lr = 0.5 } = {}) {
  let w = [0, 0, 0]
  for (let s = 0; s < steps; s++) {
    const g = [0, 0, 0]
    rows.forEach(r => { const f = [1, ...r.x], p = sigmoid(f.reduce((a, v, k) => a + v * w[k], 0)); f.forEach((v, k) => { g[k] += (p - r.y) * v / rows.length }) })
    w = w.map((v, k) => v - lr * g[k])
  }
  return x => sigmoid(w[0] + w[1] * x[0] + w[2] * x[1])
}
// Re-weight predicted probabilities for a new prior: p'(1|x) ∝ p(1|x)·π'/π.
export const adjust = (p, piTrain, piNew) => { const a = p * piNew / piTrain, b = (1 - p) * (1 - piNew) / (1 - piTrain); return a / (a + b) }
// Black-box shift estimation (Lipton et al. 2018): confusion matrix C[i][j] = P(ŷ = i | y = j) on validation data,
// predicted-label rates μ on unlabeled deployment data; solve C·π' = μ for the deployment prior.
export function bbse(model, val, deployXs) {
  const pred = x => (model(x) >= 0.5 ? 1 : 0)
  const C = [[0, 0], [0, 0]], cnt = [0, 0]
  val.forEach(r => { C[pred(r.x)][r.y] += 1; cnt[r.y] += 1 })
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) C[i][j] /= cnt[j]
  const mu1 = mean(deployXs.map(x => pred(x)))
  // Two classes: μ₁ = C[1][0](1 − π₁) + C[1][1]π₁  ⇒  π₁ = (μ₁ − C[1][0]) / (C[1][1] − C[1][0]).
  return { C, mu1, pi1: Math.min(1, Math.max(0, (mu1 - C[1][0]) / (C[1][1] - C[1][0]))) }
}
export function labelExperiment(pi1, { seed = 1 } = {}) {
  const train = labelData(600, 0.5, seed), val = labelData(600, 0.5, seed + 1), deploy = labelData(3000, pi1, seed + 2)
  const model = trainLogistic(train), est = bbse(model, val, deploy.map(r => r.x))
  const score = piNew => { const ps = deploy.map(r => (piNew === null ? model(r.x) : adjust(model(r.x), 0.5, piNew))); return { acc: mean(ps.map((p, i) => ((p >= 0.5 ? 1 : 0) === deploy[i].y ? 1 : 0))), logLoss: mean(ps.map((p, i) => -Math.log(Math.max(1e-12, deploy[i].y ? p : 1 - p)))) } }
  return { est, none: score(null), oracle: score(pi1), estimated: score(est.pi1), deploy, model }
}

// ---------- Domain adaptation with CORAL ----------
// Source: two classes in 2D. Target: the same classes after a rotation, stretch and offset (unlabeled at training time).
const rot = (a, [x, y]) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y]
export function domainData(n, seed, target = false, angle = 0.9) {
  const rng = random(seed)
  return range(n).map(() => {
    const y = rng() < 0.5 ? 1 : 0, p = [(y ? 1.2 : -1.2) + 0.7 * normal(rng), 0.9 * normal(rng)]
    if (!target) return { x: p, y }
    const r = rot(angle, p); return { x: [1.6 * r[0] + 1.5, 0.7 * r[1] - 1], y }
  })
}
const meanCov = X => { const m = [mean(X.map(x => x[0])), mean(X.map(x => x[1]))], c = [[0, 0], [0, 0]]; X.forEach(x => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) c[i][j] += (x[i] - m[i]) * (x[j] - m[j]) / X.length }); return { m, c } }
// Symmetric 2×2 matrix power via its eigen-decomposition.
function matPow(c, p) {
  const [a, b, d] = [c[0][0], c[0][1], c[1][1]], tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc, l2 = tr / 2 - disc
  const v1 = Math.abs(b) > 1e-12 ? [l1 - d, b] : a >= d ? [1, 0] : [0, 1], n1 = Math.hypot(...v1), u = [v1[0] / n1, v1[1] / n1], v = [-u[1], u[0]]
  const s1 = Math.pow(l1, p), s2 = Math.pow(l2, p)
  return [[s1 * u[0] * u[0] + s2 * v[0] * v[0], s1 * u[0] * u[1] + s2 * v[0] * v[1]], [s1 * u[0] * u[1] + s2 * v[0] * v[1], s1 * u[1] * u[1] + s2 * v[1] * v[1]]]
}
const mv = (M, x) => [M[0][0] * x[0] + M[0][1] * x[1], M[1][0] * x[0] + M[1][1] * x[1]]
// CORAL (Sun et al. 2016), with mean alignment: whiten the source features, then re-colour them with the target's covariance and mean.
export function coral(source, targetXs) {
  const S = meanCov(source.map(r => r.x)), T = meanCov(targetXs), A = matPow(S.c, -0.5), B = matPow(T.c, 0.5)
  return source.map(r => { const z = mv(A, [r.x[0] - S.m[0], r.x[1] - S.m[1]]), t = mv(B, z); return { x: [t[0] + T.m[0], t[1] + T.m[1]], y: r.y } })
}
export function adaptExperiment({ angle = 0.9, seed = 1 } = {}) {
  const src = domainData(400, seed), tgt = domainData(400, seed + 1, true, angle), tgtTest = domainData(1000, seed + 2, true, angle)
  const accOn = (m, rows) => mean(rows.map(r => ((m(r.x) >= 0.5 ? 1 : 0) === r.y ? 1 : 0)))
  const sourceOnly = trainLogistic(src), aligned = coral(src, tgt.map(r => r.x)), coralModel = trainLogistic(aligned), oracle = trainLogistic(tgt)
  return { src, tgt: tgtTest, aligned, models: { sourceOnly, coral: coralModel, oracle }, acc: { sourceOnSource: accOn(sourceOnly, domainData(1000, seed + 3)), sourceOnly: accOn(sourceOnly, tgtTest), coral: accOn(coralModel, tgtTest), oracle: accOn(oracle, tgtTest) } }
}
