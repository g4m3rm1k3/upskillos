import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 23 practice ladder, in NumPy with PyTorch's conventions: nn.Linear's (out, in) weight, gradient
// accumulation and zero_grad, dropout's train/eval modes, and checkpoints that include the optimizer's state.
// The real PyTorch versions are in the lessons' fold-outs and in verify_pytorch.py (run locally).

export const linearOf = (x, W, b) => x.map(row => W.map((w, j) => w.reduce((t, v, k) => t + v * row[k], b[j])))
export function trainOf(x, y, steps, lr, reset = true) {
  let w = 0, b = 0, gw = 0, gb = 0
  for (let s = 0; s < steps; s++) {
    if (reset) { gw = 0; gb = 0 }
    const e = x.map((xi, i) => w * xi + b - y[i])
    gw += 2 * e.reduce((t, v, i) => t + v * x[i], 0) / x.length; gb += 2 * e.reduce((t, v) => t + v, 0) / x.length
    w -= lr * gw; b -= lr * gb
  }
  return [w, b]
}
export const dropoutOf = (a, mask, p, training) => (training ? a.map((v, i) => (v * mask[i]) / (1 - p)) : [...a])

const LINEAR_CASES = [
  { x: [[1, 2, 3]], weight: [[1, 0, -1], [2, 1, 0]], bias: [0.5, -1] },
  { x: [[1, 0], [0, 1], [2, 2]], weight: [[3, 4]], bias: [1] },
  { x: [[0.5, -1]], weight: [[1, 1], [1, -1], [0, 2]], bias: [0, 0, 0] },
  { x: [[1, 2], [3, 4]], weight: [[1, 0], [0, 1]], bias: [10, 20] },
].map(c => ({ ...c, expected: linearOf(c.x, c.weight, c.bias) }))
export const TRAIN_CASES = [
  { x: [-1, 0, 1, 2], y: [-4, -1, 2, 5], steps: 50, lr: 0.05 },
  { x: [0, 1, 2], y: [1, 1, 1], steps: 30, lr: 0.1 },
  { x: [-2, -1, 1, 2], y: [1, 0, 0, -1], steps: 40, lr: 0.02 },
  { x: [1, 2, 3], y: [2, 4, 6], steps: 25, lr: 0.03 },
].map(c => ({ ...c, expected: trainOf(c.x, c.y, c.steps, c.lr) }))
const DROP_CASES = [
  { a: [1, 2, 3, 4], mask: [1, 0, 1, 1], p: 0.25, training: 1 },
  { a: [1, 2, 3, 4], mask: [1, 0, 1, 1], p: 0.25, training: 0 },
  { a: [0.5, -0.5], mask: [0, 1], p: 0.5, training: 1 },
  { a: [2, 2, 2], mask: [1, 1, 0], p: 0.1, training: 1 },
].map(c => ({ ...c, expected: dropoutOf(c.a, c.mask, c.p, c.training) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseLinear(c, got) {
  if (near(got.value, c.x.map(row => c.weight.map((w, j) => w.reduce((t, v, k) => t + v * row[k], 0))))) return 'The bias is missing: add it after the product.'
  return null
}
export function diagnoseTrain(c, got) {
  if (near(got.value, trainOf(c.x, c.y, c.steps, c.lr, false))) return 'The gradients from earlier steps are still in gw and gb: every step uses their running sum. Reset them to 0 at the start of each step (zero_grad).'
  return null
}
export function diagnoseDropout(c, got) {
  if (c.training && near(got.value, c.a.map((v, i) => v * c.mask[i]))) return 'Survivors must be scaled by 1/(1 − p), or the layer’s output is smaller on average in training than in evaluation.'
  if (!c.training && near(got.value, c.a.map((v, i) => (v * c.mask[i]) / (1 - c.p)))) return 'In eval mode nothing is dropped and nothing is scaled: return the input unchanged.'
  return null
}
export function evaluateResume(vars) {
  const miss = needVars(vars, ['save_optimizer', 'drift'])
  if (miss) return { passed: false, message: miss }
  const d = Number(vars.drift.value)
  if (d > 1e-12) return { passed: false, message: `The resumed run ends ${r3(d)} away from the uninterrupted one: the velocity restarted at zero. Set \`save_optimizer = True\` so the checkpoint keeps it, and run again.` }
  return { passed: true, message: 'The resumed run is identical to the uninterrupted one. A checkpoint needs the optimizer’s state as well as the weights.' }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['linear', 'accumulate', 'adamstate']
export function generate(template, seed) {
  const g = rng(seed * 821 + TEMPLATES.indexOf(template) * 5009 + 67)
  if (template === 'linear') {
    const din = g.int(2, 64), dout = g.int(1, 16), answer = din * dout + dout
    return { template, seed, din, dout, answer, misconceptions: [{ answer: din * dout, feedback: 'Add one bias per output.' }, { answer: din + dout, feedback: 'The weight has d_in × d_out entries, not d_in + d_out.' }].filter(m => m.answer !== answer) }
  }
  if (template === 'accumulate') {
    const k = g.int(2, 9), grad = g.pick([0.5, 1, 2, 3, -1]), answer = k * grad
    return { template, seed, k, grad, answer, misconceptions: [{ answer: grad, feedback: 'That is what zero_grad would give. Without it, .grad holds the sum of every step’s gradient.' }].filter(m => m.answer !== answer) }
  }
  const din = g.int(2, 32), dout = g.int(1, 8), params = din * dout + dout, answer = 2 * params
  return { template, seed, din, dout, params, answer, misconceptions: [{ answer: params, feedback: 'That is the model’s size. Adam keeps two numbers per parameter.' }, { answer: 2 * din * dout, feedback: 'The biases have Adam state too.' }].filter(m => m.answer !== answer) }
}
export function view(p) {
  if (p.template === 'linear') return { intro: `A layer nn.Linear(${p.din}, ${p.dout}).`, questions: [{ id: 'n', type: 'number', label: 'How many parameters does it have?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'accumulate') return { intro: `A loop forgets optimizer.zero_grad(). Every step, backward() computes the same gradient ${p.grad} for a weight.`, questions: [{ id: 'g', type: 'number', label: `What does the weight’s .grad hold when optimizer.step() runs at step ${p.k}?`, answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `nn.Linear(${p.din}, ${p.dout}) is trained with Adam.`, questions: [{ id: 's', type: 'number', label: 'How many numbers are in the optimizer’s state, not counting step counters?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'linear') return `${p.din} × ${p.dout} weights + ${p.dout} biases = **${p.answer}**.`
  if (p.template === 'accumulate') return `${p.k} backward passes each add ${p.grad}: ${p.k} × ${p.grad} = **${p.answer}**.`
  return `The layer has ${p.din} × ${p.dout} + ${p.dout} = ${p.params} parameters; Adam keeps m and v for each: **${p.answer}**.`
}

export const torch = {
  title: 'Framework conventions, checked in NumPy',
  version: 1,
  templates: TEMPLATES,
  templateNames: { linear: 'Parameters of nn.Linear', accumulate: 'A forgotten zero_grad', adamstate: 'Adam’s state' },
  generate, view, workedSolution,
  intro: 'Seven steps in NumPy that follow PyTorch’s conventions: shapes and state by hand, a faithful resume, nn.Linear’s forward pass, the zero_grad bug and dropout. The real PyTorch versions are in the fold-outs above and in verify_pytorch.py.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Shapes and state by hand',
      prompt: 'A layer nn.Linear(3, 2), trained with Adam. A loop that forgets zero_grad sees the same gradient 2 at every step. Dropout with p = 0.25 in training mode.',
      fields: [
        { label: 'Rows of the layer’s weight', answer: 2 },
        { label: 'The layer’s parameters', answer: 8 },
        { label: 'Numbers in Adam’s state', answer: 16 },
        { label: '.grad at step 4 without zero_grad', answer: 8 },
        { label: 'What a surviving value of 1 becomes under dropout (three decimals)', answer: 4 / 3, tolerance: 0.0006 },
      ],
      explain: 'nn.Linear(3, 2) stores its weight as (out, in) = (2, 3): 6 weights and 2 biases, 8 parameters. Adam keeps m and v for each: 16. Without zero_grad, .grad sums 2 four times: 8. Dropout scales survivors by 1/(1 − 0.25) = 1.333.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Resume exactly',
      prompt: 'Momentum SGD, interrupted after 20 steps and resumed from a checkpoint for 20 more. Run it as given: the resumed run differs from an uninterrupted one. **Set `save_optimizer = True`** and run again.',
      starter: `import numpy as np, io
x = np.linspace(-2, 2, 64); y = 3 * x - 1
def train(w, b, vw, vb, steps):
    for _ in range(steps):
        e = w * x + b - y
        vw = 0.9 * vw + 2 * np.mean(e * x); vb = 0.9 * vb + 2 * np.mean(e)
        w -= 0.02 * vw; b -= 0.02 * vb
    return w, b, vw, vb

save_optimizer = False
full = train(0.0, 0.0, 0.0, 0.0, 40)                    # the uninterrupted run
w, b, vw, vb = train(0.0, 0.0, 0.0, 0.0, 20)            # stop after 20 steps and save
buffer = io.BytesIO()
if save_optimizer:
    np.savez(buffer, w=w, b=b, vw=vw, vb=vb)
else:
    np.savez(buffer, w=w, b=b)
buffer.seek(0); ckpt = np.load(buffer)
vw0, vb0 = (float(ckpt["vw"]), float(ckpt["vb"])) if save_optimizer else (0.0, 0.0)
resumed = train(float(ckpt["w"]), float(ckpt["b"]), vw0, vb0, 20)
drift = abs(resumed[0] - full[0]) + abs(resumed[1] - full[1])
print(f"save_optimizer = {save_optimizer}: the resumed weights differ by {drift:.3g}")`,
      probe: ['save_optimizer', 'drift'],
      evaluate: evaluateResume,
      done: 'In PyTorch: torch.save({"model": model.state_dict(), "opt": opt.state_dict(), ...}) and load both.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in nn.Linear’s forward pass',
      prompt: 'Replace `___` so the layer computes what nn.Linear computes, with its weight stored as (out, in).',
      starter: `import numpy as np

def linear_forward(x, weight, bias):
    """x: (n, in). weight: (out, in), as nn.Linear stores it. bias: (out,). Return (n, out)."""
    return ___`,
      hint: 'x has in columns; weight has in columns too. Transpose the weight so the inner sizes match.',
      solution: 'return x @ weight.T + bias',
      check: { fn: 'linear_forward', args: ['x', 'weight', 'bias'], cases: LINEAR_CASES, describe: c => `x ${c.x.length}×${c.x[0].length}, weight ${c.weight.length}×${c.weight[0].length}`, diagnose: diagnoseLinear },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'Fitting y = 3x − 1 on x = [−1, 0, 1, 2] for 50 steps at rate 0.05, this ends at **(3.714, 1.554)**. With the gradient reset every step it ends at (2.964, −0.943), close to the true (3, −1). Fix it.',
      starter: `import numpy as np

def train_steps(x, y, steps, lr):
    """Gradient descent on the MSE of w*x + b. Return np.array([w, b]) after the given steps."""
    w = b = 0.0
    gw = gb = 0.0
    for _ in range(steps):
        e = w * x + b - y
        gw += 2 * np.mean(e * x)          # backward() adds into the stored gradient
        gb += 2 * np.mean(e)
        w -= lr * gw
        b -= lr * gb
    return np.array([w, b])`,
      hint: 'Which line of the PyTorch loop is missing?',
      solution: 'at the start of the loop body:  gw = gb = 0.0',
      check: { fn: 'train_steps', args: ['x', 'y', 'steps', 'lr'], ints: ['steps'], cases: TRAIN_CASES, describe: c => `x = [${c.x.join(', ')}], ${c.steps} steps at ${c.lr}`, diagnose: diagnoseTrain },
      explainChoice: {
        prompt: 'PyTorch accumulates into .grad on purpose. When is that useful?',
        options: [
          { text: 'To sum gradients over several small batches before one step, when a large batch does not fit in memory (gradient accumulation) — zeroing only after the step.', correct: true },
          { text: 'It is never useful; it is a design mistake.', feedback: 'It is deliberate: it lets one step use gradients from several backward passes.' },
          { text: 'To make training converge faster in general.', feedback: 'Unintended accumulation makes training diverge, as the repair showed.' },
          { text: 'To save memory by keeping fewer gradients.', feedback: 'It keeps the same number of gradients either way.' },
        ],
        rightFeedback: 'Accumulate on purpose, then step and zero; forgetting to zero is the bug.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write dropout',
      prompt: 'Write `dropout_forward` from its contract. The random mask is given, so the check is repeatable.',
      starter: `import numpy as np

def dropout_forward(a, mask, p, training):
    """mask[i] is 1 to keep a[i], 0 to drop it (drawn with drop probability p).
    training = 1: drop and scale the survivors by 1/(1 - p). training = 0 (eval): return a unchanged.

    Example: dropout_forward(np.array([1., 2., 3., 4.]), np.array([1., 0., 1., 1.]), 0.25, 1)
             ->  array([1.3333, 0., 4., 5.3333])   (rounded)
    """
    pass   # replace with your code`,
      hint: 'if training: return a * mask / (1 - p); otherwise return a.',
      solution: 'if training:\n    return a * mask / (1 - p)\nreturn a',
      check: { fn: 'dropout_forward', args: ['a', 'mask', 'p', 'training'], ints: ['training'], cases: DROP_CASES, describe: c => `p = ${c.p}, ${c.training ? 'training' : 'eval'}`, diagnose: diagnoseDropout },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New layers and loops. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
