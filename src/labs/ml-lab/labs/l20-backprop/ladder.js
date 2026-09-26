import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 20 practice ladder: local derivatives in reverse order, accumulation, and a neuron's gradients.

export function chainOf(a, b, c) {
  const e = a * b + c
  return { d: a * b, e, L: e * e, gE: 2 * e, gA: 2 * e * b, gB: 2 * e * a, gC: 2 * e }
}
export function neuronGradsOf(w, x, b, t) {
  const y = Math.tanh(w.reduce((s, wi, i) => s + wi * x[i], 0) + b), gz = 2 * (y - t) * (1 - y * y)
  return [...x.map(xi => gz * xi), gz]
}

const TANH_CASES = [[0.5, 1], [0.706, 2], [-0.9, 1], [0, 3]].map(([y, upstream]) => ({ y, upstream, expected: upstream * (1 - y * y) }))
const MUL_CASES = [[2, -3, 8], [3, 4, 1], [-1, 5, 2], [0.5, 2, -4]].map(([a, b, upstream]) => ({ a, b, upstream, expected: [upstream * b, upstream * a] }))
export const NEURON_CASES = [
  { w: [-3, 1], x: [2, 0], b: 6.88, t: 0 },
  { w: [0.5, -0.5], x: [1, 2], b: 0, t: 1 },
  { w: [1], x: [0.3], b: -0.1, t: -1 },
  { w: [0.2, 0.1, -0.4], x: [1, -2, 0.5], b: 0.3, t: 0.5 },
].map(c => ({ ...c, expected: neuronGradsOf(c.w, c.x, c.b, c.t) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9)
export function diagnoseTanh(c, got) {
  if (Math.abs(got.value - (1 - c.y * c.y)) < 1e-9 && c.upstream !== 1) return 'That is the local derivative alone. Multiply it by the upstream gradient that arrived at the node.'
  if (Math.abs(got.value - c.upstream * (1 - c.y)) < 1e-9 && c.y !== 0) return 'The slope of tanh is 1 − y², not 1 − y.'
  if (Math.abs(got.value - c.upstream * (1 - Math.tanh(c.y) ** 2)) < 1e-9) return 'y is already tanh(z): use 1 − y² directly, without applying tanh again.'
  return null
}
export function diagnoseMul(c, got) {
  if (near(got.value, [c.upstream * c.a, c.upstream * c.b]) && c.a !== c.b) return 'The gradients are swapped: in d = a·b, a’s local derivative is b, so a receives upstream × b.'
  if (near(got.value, [c.b, c.a]) && c.upstream !== 1) return 'The upstream gradient is missing: each local derivative must be multiplied by it.'
  return null
}
export function diagnoseNeuron(c, got) {
  const z = c.w.reduce((s, wi, i) => s + wi * c.x[i], 0) + c.b, y = Math.tanh(z)
  const noTanh = [...c.x.map(xi => 2 * (y - c.t) * xi), 2 * (y - c.t)]
  if (near(got.value, noTanh)) return 'The tanh node is missing from the backward pass: multiply by its local derivative 1 − y².'
  if (near(got.value, c.expected.map(v => v / 2))) return 'Half the right size: the square’s local derivative is 2(y − t).'
  if (near(got.value, c.expected.map(v => -v))) return 'The sign is flipped: the loss is (y − t)², so its derivative is 2(y − t), not 2(t − y).'
  if (got.value?.length === c.x.length) return `Return one gradient per weight and one for b: ${c.x.length + 1} numbers.`
  return null
}
export function evaluateAccumulate(vars) {
  const miss = needVars(vars, ['grad_x', 'numeric'])
  if (miss) return { passed: false, message: miss }
  const g = Number(vars.grad_x.value), n = Number(vars.numeric.value)
  if (Math.abs(g - n) > 1e-4) return { passed: false, message: `Backprop says ${r3(g)}; the finite difference says ${r3(n)}. The second assignment overwrote the first: change it to \`grad_x += grad_f * 1\`.` }
  return { passed: true, message: `Both give ${r3(g)}: 4 through the product plus 1 through the sum. A value used twice must collect both contributions.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['chain', 'shared', 'tanh']
export function generate(template, seed) {
  const g = rng(seed * 613 + TEMPLATES.indexOf(template) * 4007 + 53)
  if (template === 'chain') {
    const a = g.int(-4, 4), b = g.int(-4, 4), c = g.int(-6, 6), ch = chainOf(a, b, c)
    if (ch.e === 0 || b === 0 || a === b) return generate(template, seed + 1000)
    return { template, seed, a, b, c, answer: ch.gA, misconceptions: [{ answer: ch.gB, feedback: 'That is ∂L/∂b, which uses a. For a, multiply by the other input, b.' }, { answer: ch.e * b, feedback: 'The square’s local derivative is 2e, not e.' }, { answer: 2 * ch.e, feedback: 'That is the gradient arriving at the product. Multiply by the product’s local derivative for a, which is b.' }].filter(m => m.answer !== ch.gA) }
  }
  if (template === 'shared') {
    const x = g.int(1, 6), y = g.int(-5, 6), z = g.int(-5, 6)
    if (y + z === y || y + z === z) return generate(template, seed + 1000)
    return { template, seed, x, y, z, answer: y + z, misconceptions: [{ answer: z, feedback: 'That is only the second contribution: the first one was overwritten. Add both.' }, { answer: y, feedback: 'That is only the first contribution. x is used twice; add both.' }].filter(m => m.answer !== y + z) }
  }
  const y = g.pick([0.1, 0.3, 0.5, 0.6, 0.8, 0.9, 0.95, -0.4, -0.7]), answer = 1 - y * y
  return { template, seed, y, answer, misconceptions: [{ answer: 1 - y, feedback: 'tanh’s slope is 1 − y², not 1 − y.' }, { answer: y * y, feedback: 'That is y². The slope is 1 minus it.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
}
export function view(p) {
  if (p.template === 'chain') return { intro: `L = (a·b + c)² with a = ${p.a}, b = ${p.b}, c = ${p.c}.`, questions: [{ id: 'g', type: 'number', label: 'What is ∂L/∂a?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'shared') return { intro: `f = x·y + x·z with x = ${p.x}, y = ${p.y}, z = ${p.z}. The input x feeds two products.`, questions: [{ id: 'g', type: 'number', label: 'What is ∂f/∂x?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A tanh node outputs y = ${p.y}.`, questions: [{ id: 'g', type: 'number', label: 'What is its local derivative, the share of the upstream gradient it passes back? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'chain') { const ch = chainOf(p.a, p.b, p.c); return `Forward: e = ${p.a}·${p.b} + ${p.c} = ${ch.e}. Backward: ∂L/∂e = 2e = ${ch.gE}; the sum passes it on unchanged; the product gives a the other input, b: ${ch.gE} × ${p.b} = **${ch.gA}**.` }
  if (p.template === 'shared') return `Through x·y: y = ${p.y}. Through x·z: z = ${p.z}. x is used twice, so they add: **${p.answer}**.`
  return `1 − y² = 1 − ${p.y}² = **${r3(p.answer)}**.`
}

export const backprop = {
  title: 'Gradients backwards through a graph',
  version: 1,
  templates: TEMPLATES,
  templateNames: { chain: 'Chain rule through a graph', shared: 'A value used twice', tanh: 'tanh’s local derivative' },
  generate, view, workedSolution,
  intro: 'Seven steps: a backward pass by hand, the accumulation bug, and writing the gradients of a neuron. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'A backward pass by hand',
      prompt: 'L = (a·b + c)² with a = 1, b = 2, c = −4. Forward first, then backward from ∂L/∂L = 1.',
      fields: [
        { label: 'e = a·b + c', answer: -2 },
        { label: 'L', answer: 4 },
        { label: '∂L/∂e', answer: -4 },
        { label: '∂L/∂a', answer: -8 },
        { label: '∂L/∂c', answer: -4 },
      ],
      explain: 'Forward: a·b = 2, e = 2 − 4 = −2, L = 4. Backward: the square passes 2e = −4 to e; the sum passes −4 unchanged to both a·b and c; the product gives a the other input: −4 × b = −8.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Make backprop agree with the finite difference',
      prompt: 'Backward by hand for f = x·y + x. Run it: the two numbers disagree. **Change one character** so that they agree, and run again.',
      starter: `x, y = 3.0, 4.0
p = x * y
f = p + x                       # forward

grad_f = 1.0
grad_p = grad_f * 1             # f = p + x  ->  df/dp = 1
grad_x = grad_p * y             # x's contribution through the product
grad_x = grad_f * 1             # x's contribution through the sum

eps = 1e-6
numeric = (((x + eps) * y + (x + eps)) - ((x - eps) * y + (x - eps))) / (2 * eps)
print("backprop:", grad_x, "  finite difference:", round(numeric, 6))`,
      probe: ['grad_x', 'numeric'],
      evaluate: evaluateAccumulate,
      done: 'This is why every backward function in an engine writes `+=`, and why gradients must be zeroed before each pass.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in tanh’s backward step',
      prompt: 'Replace `___` with the gradient that a tanh node passes back to its input.',
      starter: `def tanh_backward(y, upstream):
    """y = tanh(z) is the node's output; upstream is dL/dy. Return dL/dz."""
    return ___`,
      hint: 'Upstream gradient times the local derivative, which tanh can compute from its own output.',
      solution: 'return upstream * (1 - y ** 2)',
      check: { fn: 'tanh_backward', args: ['y', 'upstream'], cases: TANH_CASES, describe: c => `y = ${c.y}, upstream = ${c.upstream}`, diagnose: diagnoseTanh },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For d = a·b with a = 2, b = −3 and upstream gradient 8, this returns **[16, −24]**. The right answer is [−24, 16] (as in Lesson 20.2). Fix it.',
      starter: `import numpy as np

def mul_backward(a, b, upstream):
    """d = a * b. Return [dL/da, dL/db] given upstream = dL/dd."""
    return np.array([upstream * a, upstream * b])`,
      hint: 'Change a a little: d changes by b times as much.',
      solution: 'return np.array([upstream * b, upstream * a])',
      check: { fn: 'mul_backward', args: ['a', 'b', 'upstream'], cases: MUL_CASES, describe: c => `a = ${c.a}, b = ${c.b}, upstream = ${c.upstream}`, diagnose: diagnoseMul },
      explainChoice: {
        prompt: 'Why would a gradient check catch this bug on the lesson’s numbers but might miss it on others?',
        options: [
          { text: 'When a = b the swapped version gives the same numbers, so a check at such a point cannot see the bug. Check at points where the inputs differ.', correct: true },
          { text: 'Finite differences never catch bugs in products.', feedback: 'They catch this one whenever a ≠ b: here −24 against 16.' },
          { text: 'The bug only matters for negative numbers.', feedback: 'It matters whenever a ≠ b, whatever the signs.' },
          { text: 'Gradient checks only test the forward pass.', feedback: 'They compare the backward pass with an independent estimate from the forward pass.' },
        ],
        rightFeedback: 'Test gradients at unremarkable points: different inputs, away from 0 and away from kinks.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a neuron’s gradients',
      prompt: 'Write `neuron_grads` from its contract, doing by hand what the engine would do.',
      starter: `import numpy as np

def neuron_grads(w, x, b, t):
    """y = tanh(w . x + b); L = (y - t)^2. Return [dL/dw_1, ..., dL/dw_n, dL/db].

    Example: neuron_grads(np.array([0.5, -0.5]), np.array([1.0, 2.0]), 0.0, 1.0)
             ->  array([-2.29976, -4.59952, -2.29976])   (rounded)
    """
    pass   # replace with your code`,
      hint: 'Forward: z, y. Backward: dL/dy = 2(y − t); dL/dz = dL/dy · (1 − y²); dL/dwᵢ = dL/dz · xᵢ; dL/db = dL/dz.',
      solution: 'y = np.tanh(w @ x + b)\ng_z = 2 * (y - t) * (1 - y ** 2)\nreturn np.append(g_z * x, g_z)',
      check: { fn: 'neuron_grads', args: ['w', 'x', 'b', 't'], cases: NEURON_CASES, describe: c => `w = [${c.w.join(', ')}], x = [${c.x.join(', ')}], b = ${c.b}, t = ${c.t}`, diagnose: diagnoseNeuron },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New graphs and values. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
