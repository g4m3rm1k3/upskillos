// Simulates the standard PyTorch training loop on a small linear model with
// input dropout and momentum SGD, so each line's purpose can be switched off
// and its real consequence observed.
import { random, normal, mean, range } from '../../kit/math.js'

export function makeData(seed = 4) {
  const rng = random(seed), w = [1.5, -2, 0.5, 3, -1]
  const gen = n => range(n).map(() => { const x = w.map(() => normal(rng)); return { x, y: x.reduce((t, v, j) => t + v * w[j], 0.5) + 0.3 * normal(rng) } })
  return { train: gen(200), val: gen(200) }
}
const forward = (p, x, mask) => p.b + x.reduce((t, v, j) => t + (mask ? mask[j] : 1) * v * p.w[j], 0)

export function simulate({ zeroGrad = true, evalMode = true, noGrad = true, saveOptimizer = true, steps = 80, lr = 0.02, p = 0.2, seed = 4, resumeAt = 40 } = {}) {
  const { train, val } = makeData(seed)
  const run = ({ zeroGrad, evalMode, noGrad, saveOptimizer }) => {
    const rng = random(seed + 7), evalRng = random(seed + 99)
    let prm = { w: Array(5).fill(0), b: 0 }, grad = { w: Array(5).fill(0), b: 0 }, vel = { w: Array(5).fill(0), b: 0 }, retained = 0
    const log = []
    for (let t = 1; t <= steps; t++) {
      if (t === resumeAt + 1 && !saveOptimizer) vel = { w: Array(5).fill(0), b: 0 } // optimizer state lost at restart
      if (zeroGrad) grad = { w: Array(5).fill(0), b: 0 }
      // forward with dropout (training mode): drop inputs with prob p, scale survivors by 1/(1−p)
      const batch = range(32).map(() => train[Math.floor(rng() * train.length)])
      batch.forEach(r => {
        const mask = r.x.map(() => (rng() < p ? 0 : 1 / (1 - p))), e = forward(prm, r.x, mask) - r.y
        r.x.forEach((v, j) => { grad.w[j] += 2 * e * mask[j] * v / batch.length }); grad.b += 2 * e / batch.length
      })
      vel = { w: vel.w.map((v, j) => 0.9 * v + grad.w[j]), b: 0.9 * vel.b + grad.b }
      prm = { w: prm.w.map((w, j) => w - lr * vel.w[j]), b: prm.b - lr * vel.b }
      if (t % 2 === 0) {
        const vl = mean(val.map(r => { const mask = evalMode ? null : r.x.map(() => (evalRng() < p ? 0 : 1 / (1 - p))); return (forward(prm, r.x, mask) - r.y) ** 2 }))
        if (!noGrad) retained += val.length * 12 // graph nodes kept alive when evaluation builds an autograd graph
        const tl = mean(train.map(r => (forward(prm, r.x, null) - r.y) ** 2))
        log.push({ t, train: Number.isFinite(tl) ? Math.min(tl, 1e6) : 1e6, val: Number.isFinite(vl) ? Math.min(vl, 1e6) : 1e6, retained, params: [...prm.w, prm.b] })
      }
    }
    return log
  }
  const log = run({ zeroGrad, evalMode, noGrad, saveOptimizer }), reference = run({ zeroGrad: true, evalMode: true, noGrad: true, saveOptimizer: true })
  const diffs = log.flatMap((l, i) => l.params.map((v, j) => Math.abs(v - reference[i].params[j]))), drift = diffs.every(Number.isFinite) ? Math.max(...diffs) : Infinity
  return { log, reference, drift }
}

export const LOOP = [
  { key: 'model', code: 'model = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(5, 1))', note: 'nn.Module holds parameters (tensors with requires_grad=True) and defines forward().' },
  { key: 'opt', code: 'opt = torch.optim.SGD(model.parameters(), lr=0.02, momentum=0.9)', note: 'The optimizer keeps references to the parameters plus its own state (momentum buffers).' },
  { key: 'loop', code: 'for x, y in loader:                     # mini-batches', note: 'A DataLoader shuffles and batches a Dataset.' },
  { key: 'train', code: '    model.train()', note: 'Training mode: dropout active, batch-norm uses batch statistics.' },
  { key: 'zeroGrad', code: '    opt.zero_grad()', toggle: true, note: 'Gradients accumulate by default (+=, Lab 20). Without this line every step adds to all previous gradients.' },
  { key: 'forward', code: '    loss = F.mse_loss(model(x), y)', note: 'Forward pass: autograd records the computation graph.' },
  { key: 'backward', code: '    loss.backward()', note: 'Reverse-mode autodiff fills p.grad for every parameter.' },
  { key: 'step', code: '    opt.step()', note: 'Applies the update using p.grad and the optimizer state.' },
  { key: 'evalMode', code: 'model.eval()', toggle: true, note: 'Evaluation mode: dropout off, batch-norm uses running statistics.' },
  { key: 'noGrad', code: 'with torch.no_grad(): val = F.mse_loss(model(xv), yv)', toggle: true, note: 'No graph is recorded: less memory, faster, and no accidental gradients.' },
  { key: 'saveOptimizer', code: "torch.save({'model': model.state_dict(), 'opt': opt.state_dict()}, 'ckpt.pt')", toggle: true, note: 'A checkpoint must include optimizer state to resume training identically.' },
]
