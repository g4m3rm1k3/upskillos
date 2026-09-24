// Generative models on 2D data: a GAN (generator versus discriminator) and a
// denoising diffusion model (DDPM), compared on a ring of eight Gaussians.
import { random, normal, range, mean } from '../../kit/math.js'
import { Dense, ReLU, Tanh, LeakyReLU, Sequential, bceLogits, mse, Adam } from '../../kit/nn.js'

export const TARGETS = {
  ring: { name: 'Ring of 8 Gaussians', modes: range(8).map(k => [2 * Math.cos(2 * Math.PI * k / 8), 2 * Math.sin(2 * Math.PI * k / 8)]), sd: 0.12 },
  moons: { name: 'Two moons', modes: null },
}
export function sampleTarget(key, n, rng) {
  if (key === 'ring') { const T = TARGETS.ring; return range(n).map(() => { const m = T.modes[Math.floor(rng() * 8)]; return Float64Array.of(m[0] + T.sd * normal(rng), m[1] + T.sd * normal(rng)) }) }
  return range(n).map(() => { const t = Math.PI * rng(), up = rng() < 0.5; return Float64Array.of((up ? Math.cos(t) : 1 - Math.cos(t)) * 1.3 - 0.6 + 0.08 * normal(rng), (up ? Math.sin(t) : -Math.sin(t) + 0.5) * 1.3 - 0.3 + 0.08 * normal(rng)) })
}
export const GAN_PRESETS = {
  balanced: { name: 'Balanced: one generator step per discriminator step (lr 0.002)', opts: {} },
  greedy: { name: 'Generator-heavy: five generator steps per discriminator step (lr 0.005)', opts: { gSteps: 5, steps: 800, lr: 5e-3 } },
}
export const modeShares = s => TARGETS.ring.modes.map(m => s.filter(p => Math.hypot(p[0] - m[0], p[1] - m[1]) < 0.54).length / s.length)
// Modes covered: a mode counts if at least 2% of samples fall within 0.54 of it.
export function modeCoverage(samples, key = 'ring') {
  const T = TARGETS[key]; if (!T.modes) return null
  const counts = T.modes.map(m => samples.filter(s => Math.hypot(s[0] - m[0], s[1] - m[1]) < 3 * T.sd * 1.5).length)
  return { covered: counts.filter(c => c >= 0.02 * samples.length).length, quality: counts.reduce((a, b) => a + b, 0) / samples.length }
}

function net(sizes, rng, act = () => LeakyReLU(0.2)) { const L = []; sizes.slice(1).forEach((s, i) => { L.push(new Dense(sizes[i], s, rng)); if (i < sizes.length - 2) L.push(act()) }); return new Sequential(L) }

// ---------- GAN ----------
export function trainGAN({ key = 'ring', steps = 1500, batch = 64, lr = 2e-3, hidden = 24, saturating = false, seed = 1, snapshots = 6, gSteps = 1 } = {}) {
  const rng = random(seed), G = net([2, hidden, hidden, 2], rng), D = net([2, hidden, hidden, 1], rng)
  const optG = new Adam(G.params(), { lr, b1: 0.5 }), optD = new Adam(D.params(), { lr, b1: 0.5 })
  const noise = n => range(n).map(() => Float64Array.of(normal(rng), normal(rng)))
  const fixed = noise(400), snaps = [], log = []
  for (let s = 0; s <= steps; s++) {
    if (s % Math.floor(steps / (snapshots - 1)) === 0) snaps.push({ step: s, samples: G.forward(fixed) })
    if (s === steps) break
    // Discriminator: real → 1, fake → 0.
    const real = sampleTarget(key, batch, rng), fake = G.forward(noise(batch))
    D.zeroGrad()
    const rr = bceLogits(D.forward(real), real.map(() => [1])); D.backward(rr.grad)
    const rf = bceLogits(D.forward(fake), fake.map(() => [0])); D.backward(rf.grad)
    optD.step()
    // Generator: non-saturating (fool D: fake → 1) or the original minimax loss (minimize log(1 − D)).
    for (let g = 0; g < gSteps; g++) {
      G.zeroGrad(); D.zeroGrad()
      const z = noise(batch), gx = G.forward(z), logits = D.forward(gx)
      let gradLogits
      if (saturating) gradLogits = logits.map(l => Float64Array.of(-(1 / (1 + Math.exp(-l[0]))) / batch))
      else gradLogits = bceLogits(logits, logits.map(() => [1])).grad
      G.backward(D.backward(gradLogits)); optG.step()
    }
    log.push({ d: (rr.loss + rf.loss) / 2 })
  }
  const finalD = (x, y) => 1 / (1 + Math.exp(-D.forward([Float64Array.of(x, y)])[0][0]))
  return { G, D, snaps, log, finalD, sample: n => G.forward(noise(n)) }
}

// ---------- Diffusion (DDPM) ----------
export const T_STEPS = 40
export function schedule(T = T_STEPS, b0 = 1e-3, b1 = 0.25) {
  const betas = range(T).map(t => b0 + (b1 - b0) * t / (T - 1)), alphas = betas.map(b => 1 - b), abar = []
  alphas.reduce((p, a, i) => (abar[i] = p * a), 1)
  return { betas, alphas, abar }
}
const timeFeatures = t => { const f = [t / T_STEPS]; for (let k = 1; k <= 4; k++) { f.push(Math.sin(k * Math.PI * t / T_STEPS), Math.cos(k * Math.PI * t / T_STEPS)) } return f }
export function noiseTo(x0, t, eps, S) { const a = Math.sqrt(S.abar[t]), s = Math.sqrt(1 - S.abar[t]); return Float64Array.of(a * x0[0] + s * eps[0], a * x0[1] + s * eps[1]) }
export function trainDiffusion({ key = 'ring', steps = 4000, batch = 32, lr = 3e-3, hidden = 64, seed = 1 } = {}) {
  const rng = random(seed), S = schedule(), model = net([2 + 9, hidden, hidden, 2], rng, ReLU), opt = new Adam(model.params(), { lr }), log = []
  for (let s = 0; s < steps; s++) {
    const x0 = sampleTarget(key, batch, rng), ts = x0.map(() => Math.floor(rng() * T_STEPS)), eps = x0.map(() => Float64Array.of(normal(rng), normal(rng)))
    const inp = x0.map((x, i) => Float64Array.from([...noiseTo(x, ts[i], eps[i], S), ...timeFeatures(ts[i])]))
    model.zeroGrad()
    const r = mse(model.forward(inp), eps); model.backward(r.grad); opt.step()
    if (s % 50 === 0) log.push(r.loss)
    if (s === Math.floor(steps * 0.6)) opt.lr = lr / 3
  }
  // Ancestral sampling: x_{t−1} = (x_t − β_t/√(1−ᾱ_t)·ε̂)/√α_t + √β_t·z.
  const sample = (n, sseed = 2, keepEvery = 8) => {
    const r2 = random(sseed)
    let x = range(n).map(() => Float64Array.of(normal(r2), normal(r2)))
    const frames = [{ t: T_STEPS, x }]
    for (let t = T_STEPS - 1; t >= 0; t--) {
      const e = model.forward(x.map(p => Float64Array.from([...p, ...timeFeatures(t)])))
      x = x.map((p, i) => { const c = S.betas[t] / Math.sqrt(1 - S.abar[t]), z = t > 0 ? Math.sqrt(S.betas[t]) : 0; return Float64Array.of((p[0] - c * e[i][0]) / Math.sqrt(S.alphas[t]) + z * normal(r2), (p[1] - c * e[i][1]) / Math.sqrt(S.alphas[t]) + z * normal(r2)) })
      if (t % keepEvery === 0) frames.push({ t, x })
    }
    return { x, frames }
  }
  return { model, log, sample, S }
}
export function forwardFrames(key = 'ring', n = 400, seed = 3) {
  const rng = random(seed), S = schedule(), x0 = sampleTarget(key, n, rng), eps = x0.map(() => Float64Array.of(normal(rng), normal(rng)))
  return [0, 5, 10, 20, 30, T_STEPS - 1].map(t => ({ t, x: x0.map((x, i) => noiseTo(x, t, eps[i], S)), signal: Math.sqrt(S.abar[t]) }))
}
