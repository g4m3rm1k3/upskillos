import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 22 practice ladder: momentum's velocity, Adam's bias correction, clipping, and fair comparisons.

export function adamUpdateOf(g, m, v, t, lr) {
  const m2 = 0.9 * m + 0.1 * g, v2 = 0.999 * v + 0.001 * g * g
  return [lr * (m2 / (1 - 0.9 ** t)) / (Math.sqrt(v2 / (1 - 0.999 ** t)) + 1e-8), m2, v2]
}
const adamRawOf = (g, m, v, t, lr) => { const m2 = 0.9 * m + 0.1 * g, v2 = 0.999 * v + 0.001 * g * g; return [lr * m2 / (Math.sqrt(v2) + 1e-8), m2, v2] }
export const clipOf = (g, c) => { const n = Math.hypot(...g); return g.map(x => x * Math.min(1, c / n)) }

const MOM_CASES = [[1, 0, 1, 0.1, 0.9], [0.5, 1.9, -1, 0.1, 0.9], [2, -3, 0.5, 0.01, 0.5], [0, 10, 0, 1, 0.99]]
  .map(([w, v, g, lr, beta]) => ({ w, v, g, lr, beta, expected: [w - lr * (beta * v + g), beta * v + g] }))
export const ADAM_CASES = [[2, 0, 0, 1, 0.1], [2, 0.2, 0.004, 2, 0.1], [-1, 0.5, 0.2, 10, 0.01], [0.3, -0.1, 0.05, 3, 0.05]]
  .map(([g, m, v, t, lr]) => ({ g, m, v, t, lr, expected: adamUpdateOf(g, m, v, t, lr) }))
const CLIP_CASES = [[[6, 8], 5], [[30, -40], 100], [[1, 1, 1, 1], 1], [[0.3, -0.4], 0.5]].map(([g, c]) => ({ g, c, expected: clipOf(g, c) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
export function diagnoseMomentum(c, got) {
  const noBeta = [c.w - c.lr * (c.v + c.g), c.v + c.g]
  if (near(got.value, noBeta) && c.beta !== 1 && c.v !== 0) return 'The old velocity must be multiplied by β before the gradient is added: v = βv + g.'
  const gd = [c.w - c.lr * c.g, c.beta * c.v + c.g]
  if (near(got.value, gd) && c.v !== 0) return 'w stepped along the latest gradient. Momentum steps along the new velocity: w − α·v.'
  return null
}
export function diagnoseAdam(c, got) {
  if (near(got.value, adamRawOf(c.g, c.m, c.v, c.t, c.lr))) return 'The step uses m and v directly. Early on both are biased toward 0: divide m by 1 − 0.9ᵗ and v by 1 − 0.999ᵗ before taking the step.'
  const onlyV = [c.lr * (0.9 * c.m + 0.1 * c.g) / (Math.sqrt((0.999 * c.v + 0.001 * c.g * c.g) / (1 - 0.999 ** c.t)) + 1e-8), 0.9 * c.m + 0.1 * c.g, 0.999 * c.v + 0.001 * c.g * c.g]
  if (near(got.value, onlyV)) return 'v is corrected but m is not: divide m by 1 − 0.9ᵗ as well.'
  return null
}
export function diagnoseClip(c, got) {
  const capped = c.g.map(x => Math.max(-c.c, Math.min(c.c, x)))
  if (near(got.value, capped) && !near(capped, c.expected)) return 'That caps each component at ±c. Clipping rescales the whole vector so its length is at most c, keeping its direction.'
  const always = c.g.map(x => x * c.c / Math.hypot(...c.g))
  if (near(got.value, always) && !near(always, c.expected)) return 'A gradient already shorter than c must be left alone: scale by min(1, c/‖g‖).'
  return null
}
export function evaluateSeeds(vars) {
  const miss = needVars(vars, ['n_seeds', 'mom_min', 'mom_max', 'adam_mean'])
  if (miss) return { passed: false, message: miss }
  const n = Number(vars.n_seeds.value)
  if (n < 8) return { passed: false, message: `${n} seed${n === 1 ? '' : 's'}: momentum ends at ${r3(vars.mom_min.value)}. One run says nothing about how much another run would differ. Set \`seeds = range(8)\` and run again.` }
  return { passed: true, message: `Over ${n} seeds momentum ends anywhere from ${r3(vars.mom_min.value)} to ${r3(vars.mom_max.value)}; Adam averages ${r3(vars.adam_mean.value)}. Run-to-run spread can be as large as the differences you are trying to measure: compare optimizers with the same budget over several seeds.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['velocity', 'cosine', 'epoch']
export function generate(template, seed) {
  const g = rng(seed * 523 + TEMPLATES.indexOf(template) * 6011 + 61)
  if (template === 'velocity') {
    const beta = g.pick([0.5, 0.8, 0.9, 0.95, 0.99]), grad = g.pick([0.5, 1, 2, 3]), answer = grad / (1 - beta)
    return { template, seed, beta, grad, answer, misconceptions: [{ answer: grad * beta, feedback: 'That is one step’s carry-over. The velocity keeps accumulating until βv + g = v: v = g/(1 − β).' }, { answer: grad / beta, feedback: 'Divide by 1 − β, not by β.' }].filter(m => Math.abs(m.answer - answer) > 0.006) }
  }
  if (template === 'cosine') {
    const a0 = g.pick([0.1, 0.2, 0.05, 0.3]), frac = g.pick([0.25, 0.5, 0.75]), answer = a0 * 0.5 * (1 + Math.cos(Math.PI * frac))
    return { template, seed, a0, frac, answer, misconceptions: [{ answer: a0 * (1 - frac), feedback: 'That is a straight-line decay. Cosine decay follows ½(1 + cos(πt/T)).' }].filter(m => Math.abs(m.answer - answer) > 0.00006) }
  }
  const n = g.pick([1000, 1024, 5000, 60000, 256]), B = g.pick([16, 32, 64, 128]), answer = Math.ceil(n / B)
  return { template, seed, n, B, answer, misconceptions: [{ answer: n * B, feedback: 'An epoch is n examples in batches of B: n/B updates.' }, ...(n % B ? [{ answer: Math.floor(n / B), feedback: 'The last, smaller batch is still an update (unless it is dropped on purpose).' }] : [])] }
}
export function view(p) {
  if (p.template === 'velocity') return { intro: `Momentum with β = ${p.beta}, and the gradient stays at g = ${p.grad} step after step.`, questions: [{ id: 'v', type: 'number', label: 'What velocity does it settle at? (Two decimals.)', answer: p.answer, tolerance: 0.006, misconceptions: p.misconceptions }] }
  if (p.template === 'cosine') return { intro: `Cosine decay from α₀ = ${p.a0} over T steps, with no warm-up.`, questions: [{ id: 'a', type: 'number', label: `What is the learning rate at t = ${p.frac}·T? (Four decimals.)`, answer: p.answer, tolerance: 0.00006, misconceptions: p.misconceptions }] }
  return { intro: `${p.n.toLocaleString('en')} training examples, batch size ${p.B}, every batch used.`, questions: [{ id: 'u', type: 'number', label: 'How many parameter updates are in one epoch?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'velocity') return `v settles where v = βv + g: v = g/(1 − β) = ${p.grad}/(1 − ${p.beta}) = **${Math.round(p.answer * 100) / 100}**.`
  if (p.template === 'cosine') return `${p.a0} × ½(1 + cos(π × ${p.frac})) = ${p.a0} × ½ × (1 + ${r3(Math.cos(Math.PI * p.frac))}) = **${Math.round(p.answer * 10000) / 10000}**.`
  return `⌈${p.n}/${p.B}⌉ = **${p.answer}**.`
}

export const optim = {
  title: 'Optimizers, their state, and fair comparisons',
  version: 1,
  templates: TEMPLATES,
  templateNames: { velocity: 'Momentum’s velocity', cosine: 'Cosine decay', epoch: 'Updates per epoch' },
  generate, view, workedSolution,
  intro: 'Seven steps: optimizer arithmetic by hand, comparing optimizers over seeds, and writing momentum, Adam’s bias correction and clipping. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Optimizer arithmetic by hand',
      prompt: 'Momentum with β = 0.9 from v = 0, with gradients 1, 1 and −1 on the first three steps. Then: Adam with α = 0.01 and a first gradient of 5; cosine decay from α₀ = 0.2 at t = T/2; and 1,024 examples in batches of 32.',
      fields: [
        { label: 'Momentum velocity after step 2', answer: 1.9, tolerance: 1e-9 },
        { label: 'Momentum velocity after step 3', answer: 0.71, tolerance: 1e-9 },
        { label: 'Adam’s bias-corrected first step', answer: 0.01, tolerance: 1e-6 },
        { label: 'Cosine learning rate at t = T/2', answer: 0.1, tolerance: 1e-9 },
        { label: 'Updates per epoch', answer: 32 },
      ],
      explain: 'v = 1, then 0.9 + 1 = 1.9, then 0.9 × 1.9 − 1 = 0.71: the opposite gradient only partly cancels the built-up velocity. Adam: m̂ = 5 and √v̂ = 5, so the step is α = 0.01. Cosine: 0.2 × ½(1 + cos(π/2)) = 0.1. And 1,024/32 = 32 updates.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Compare over seeds',
      prompt: 'Momentum and Adam on the noisy valley, the same 200 steps each. Run it with one seed, then **set `seeds = range(8)`** and run again. Predict first: how much does momentum’s result vary from seed to seed?',
      starter: `import numpy as np
def grad(p, k=25): return np.array([p[0], k * p[1]])
def f(p, k=25): return 0.5 * (p[0] ** 2 + k * p[1] ** 2)

def run(name, lr, seed, steps=200, noise=2.0):
    rng = np.random.default_rng(seed)
    p, m, v = np.array([-4.5, 2.0]), np.zeros(2), np.zeros(2)
    for t in range(1, steps + 1):
        g = grad(p) + noise * rng.normal(size=2)
        if name == "momentum":
            m = 0.9 * m + g; p = p - lr * m
        else:
            m = 0.9 * m + 0.1 * g; v = 0.999 * v + 0.001 * g ** 2
            p = p - lr * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)
    return f(p)

seeds = [0]
mom = [run("momentum", 0.03, s) for s in seeds]
adam = [run("adam", 0.1, s) for s in seeds]
n_seeds, mom_min, mom_max, adam_mean = len(mom), min(mom), max(mom), float(np.mean(adam))
print(f"{n_seeds} seed(s): momentum {mom_min:.3f} to {mom_max:.3f}; Adam mean {adam_mean:.3f}")`,
      probe: ['n_seeds', 'mom_min', 'mom_max', 'adam_mean'],
      evaluate: evaluateSeeds,
      done: 'Report a comparison with its spread over seeds, and give every contender the same budget and the same noise.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in momentum',
      prompt: 'Replace `___` with momentum’s velocity update.',
      starter: `import numpy as np

def momentum_step(w, v, g, lr, beta):
    """One momentum update. Return np.array([new w, new v])."""
    v = ___
    return np.array([w - lr * v, v])`,
      hint: 'The old velocity decays by β, then the new gradient is added.',
      solution: 'v = beta * v + g',
      check: { fn: 'momentum_step', args: ['w', 'v', 'g', 'lr', 'beta'], cases: MOM_CASES, describe: c => `w = ${c.w}, v = ${c.v}, g = ${c.g}, α = ${c.lr}, β = ${c.beta}`, diagnose: diagnoseMomentum },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'At step t = 1 with g = 2 and α = 0.1, this returns a step of **0.3162**. With bias correction it should be 0.1, the learning rate. Fix it.',
      starter: `import numpy as np

def adam_update(g, m, v, t, lr):
    """One Adam update for one parameter (beta1 = 0.9, beta2 = 0.999, eps = 1e-8).
    Return np.array([step, new m, new v]); the parameter then moves by -step."""
    m = 0.9 * m + 0.1 * g
    v = 0.999 * v + 0.001 * g ** 2
    step = lr * m / (np.sqrt(v) + 1e-8)
    return np.array([step, m, v])`,
      hint: 'm and v start at 0, so for small t they are too small. Divide each by 1 − βᵗ before taking the step (and keep the uncorrected m and v as the state).',
      solution: 'm_hat, v_hat = m / (1 - 0.9 ** t), v / (1 - 0.999 ** t)\nstep = lr * m_hat / (np.sqrt(v_hat) + 1e-8)',
      check: { fn: 'adam_update', args: ['g', 'm', 'v', 't', 'lr'], ints: ['t'], cases: ADAM_CASES, describe: c => `g = ${c.g}, m = ${c.m}, v = ${c.v}, t = ${c.t}, α = ${c.lr}`, diagnose: diagnoseAdam },
      explainChoice: {
        prompt: 'The uncorrected first step was 3.16 times the learning rate, not smaller. Why too large?',
        options: [
          { text: 'Both averages start at zero, but v enters under a square root: m is 10× too small, √v only √1000 ≈ 31.6× too small, so their ratio is about 3.16× too large.', correct: true },
          { text: 'Because g = 2 is larger than 1.', feedback: 'The ratio m/√v does not depend on the size of g; the same 3.16 appears for any g.' },
          { text: 'Because ε = 1e-8 is too small.', feedback: 'ε only matters when √v is near 1e-8.' },
          { text: 'Because the learning rate was not decayed yet.', feedback: 'Schedules are separate; this is about the averages’ start at zero.' },
        ],
        rightFeedback: 'Correct both, and the first step is exactly α — whatever the gradient’s size.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write gradient clipping',
      prompt: 'Write `clip_by_norm` from its contract.',
      starter: `import numpy as np

def clip_by_norm(g, c):
    """If the gradient's length exceeds c, rescale it to length c; otherwise return it unchanged.
    The direction never changes.

    Example: clip_by_norm(np.array([6., 8.]), 5.0)  ->  array([3., 4.])
    """
    pass   # replace with your code`,
      hint: 'Compute ‖g‖ with np.linalg.norm, then multiply g by min(1, c/‖g‖).',
      solution: 'return g * min(1.0, c / np.linalg.norm(g))',
      check: { fn: 'clip_by_norm', args: ['g', 'c'], cases: CLIP_CASES, describe: c => `g = [${c.g.join(', ')}], c = ${c.c}`, diagnose: diagnoseClip },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New optimizer settings. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
