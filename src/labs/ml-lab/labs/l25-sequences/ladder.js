import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 25 practice ladder: an RNN step by hand, masking, and writing the recurrence and a masked RNN.

const mv = (v, M) => M[0].map((_, j) => v.reduce((t, x, k) => t + x * M[k][j], 0))
export function rnnStatesOf(ids, E, Wx, Wh, useState = true) {
  let h = Array(Wh.length).fill(0)
  return ids.map(t => { const a = mv(E[t], Wx), b = useState ? mv(h, Wh) : a.map(() => 0); h = a.map((v, j) => Math.tanh(v + b[j])); return h })
}
export function maskedFinalOf(ids, E, Wx, Wh, skip = true) {
  let h = Array(Wh.length).fill(0)
  for (const t of ids) { if (skip && t === 0) continue; const a = mv(E[t], Wx), b = mv(h, Wh); h = a.map((v, j) => Math.tanh(v + b[j])) }
  return h
}
export const maskedMeanOf = (ids, E) => { const real = ids.filter(t => t !== 0); return E[0].map((_, j) => real.reduce((s, t) => s + E[t][j], 0) / real.length) }

const EMB = [[0, 0], [1, 0], [0, 1], [0.5, 0.5], [-1, 1]]
const MEAN_CASES = [[1, 2, 0, 0], [3, 0, 0, 0, 0], [1, 1, 2, 4], [4, 2, 0]].map(ids => ({ ids, E: EMB, expected: maskedMeanOf(ids, EMB) }))
const WX = [[0.5, -0.3], [0.2, 0.8]], WH = [[0.6, -0.4], [0.3, 0.5]]
const STATE_CASES = [[1, 2, 3], [2, 2], [4, 1, 0, 3], [3]].map(ids => ({ ids, E: EMB, W_x: WX, W_h: WH, expected: rnnStatesOf(ids, EMB, WX, WH) }))
export const MASK_CASES = [[1, 2, 0, 0, 0], [2, 1], [3, 0, 0], [4, 4, 1, 0]].map(ids => ({ ids, E: EMB, W_x: WX, W_h: WH, expected: maskedFinalOf(ids, EMB, WX, WH) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : Math.abs(v - b[i]) < 1e-9))
export function diagnoseMean(c, got) {
  const all = c.E[0].map((_, j) => c.ids.reduce((s, t) => s + c.E[t][j], 0) / c.ids.length)
  if (near(got.value, all) && !near(all, c.expected)) return 'The pads are in the denominator: divide by the number of real tokens, mask.sum(), not by the padded length.'
  return null
}
export function diagnoseStates(c, got) {
  if (near(got.value, rnnStatesOf(c.ids, c.E, c.W_x, c.W_h, false)) && c.ids.length > 1) return 'Each step ignores the previous state, so the network has no memory: add h @ W_h inside the tanh.'
  return null
}
export function diagnoseMasked(c, got) {
  const unmasked = maskedFinalOf(c.ids, c.E, c.W_x, c.W_h, false)
  if (near(got.value, unmasked) && !near(unmasked, c.expected)) return 'The pads were processed as tokens: each one changed the state. Skip positions whose id is 0 and keep the state as it is.'
  return null
}
export function evaluateMask(vars) {
  const miss = needVars(vars, ['masked', 'change'])
  if (miss) return { passed: false, message: miss }
  const c = Number(vars.change.value)
  if (c > 1e-12) return { passed: false, message: `Padding the same sequence to 16 instead of 8 moves its final state by ${r3(c)}: the result depends on its batch. Set \`masked = True\` and run again.` }
  return { passed: true, message: 'With the mask, the extra padding changes nothing: the final state is the same at any padded length.' }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['embparams', 'rnnparams', 'pads']
export function generate(template, seed) {
  const g = rng(seed * 257 + TEMPLATES.indexOf(template) * 3037 + 73)
  if (template === 'embparams') {
    const V = g.pick([100, 500, 1000, 5000, 20000, 50000]), d = g.pick([8, 16, 32, 64, 128]), answer = V * d
    return { template, seed, V, d, answer, misconceptions: [{ answer: V + d, feedback: 'One row of d numbers for each of the V tokens: V × d.' }] }
  }
  if (template === 'rnnparams') {
    const d = g.pick([4, 8, 16, 32]), h = g.pick([8, 16, 32, 64]), answer = d * h + h * h + h
    return { template, seed, d, h, answer, misconceptions: [{ answer: d * h + h, feedback: 'W_h, the state-to-state matrix, adds h × h more.' }, { answer: d * h + h * h, feedback: 'Add the bias: h more.' }].filter(m => m.answer !== answer) }
  }
  const lens = Array.from({ length: g.int(3, 5) }, () => g.int(2, 12)), top = Math.max(...lens), answer = lens.reduce((s, L) => s + top - L, 0)
  if (answer === 0) return generate(template, seed + 1000)
  return { template, seed, lens, answer, misconceptions: [{ answer: top * lens.length, feedback: 'That counts every position. Count only the added pads: (longest − length) for each sequence.' }] }
}
export function view(p) {
  if (p.template === 'embparams') return { intro: `A vocabulary of ${p.V.toLocaleString('en')} tokens, embedded with d = ${p.d}.`, questions: [{ id: 'n', type: 'number', label: 'How many parameters does the embedding table have?', answer: p.answer, misconceptions: p.misconceptions }] }
  if (p.template === 'rnnparams') return { intro: `An RNN with embedding size ${p.d} and hidden size ${p.h}.`, questions: [{ id: 'n', type: 'number', label: 'How many parameters are in W_x, W_h and b together?', answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `A batch of sequences with lengths ${p.lens.join(', ')}, padded to the longest.`, questions: [{ id: 'n', type: 'number', label: 'How many padding tokens does the batch contain?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'embparams') return `${p.V} × ${p.d} = **${p.answer}**.`
  if (p.template === 'rnnparams') return `W_x ${p.d} × ${p.h} + W_h ${p.h} × ${p.h} + b ${p.h} = **${p.answer}**.`
  const top = Math.max(...p.lens); return `Longest ${top}: ${p.lens.map(L => `(${top} − ${L})`).join(' + ')} = **${p.answer}**.`
}

export const rnn = {
  title: 'Embeddings, recurrence and masks',
  version: 1,
  templates: TEMPLATES,
  templateNames: { embparams: 'Embedding table size', rnnparams: 'RNN parameters', pads: 'Counting pads' },
  generate, view, workedSolution,
  intro: 'Seven steps: a recurrence by hand, why padding needs a mask, and writing a masked mean, the recurrence and a masked RNN. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'A recurrence by hand',
      prompt: 'A one-number RNN: h_t = tanh(1·x_t + 0.5·h_{t−1}), h_0 = 0, inputs 1, 0, 2. Separately: 10 tokens embedded with d = 4, and sequences of lengths 2, 6 and 6 padded to 6.',
      fields: [
        { label: 'h₁ (three decimals)', answer: Math.tanh(1), tolerance: 0.0006 },
        { label: 'h₂ (three decimals)', answer: Math.tanh(0.5 * Math.tanh(1)), tolerance: 0.0006 },
        { label: 'h₃ (three decimals)', answer: Math.tanh(2 + 0.5 * Math.tanh(0.5 * Math.tanh(1))), tolerance: 0.0006 },
        { label: 'Parameters in the embedding table', answer: 40 },
        { label: 'Padding tokens in the batch', answer: 4 },
      ],
      explain: 'h₁ = tanh(1) = 0.762. h₂ = tanh(0 + 0.5 × 0.762) = tanh(0.381) = 0.363: with no input, the state decays. h₃ = tanh(2 + 0.5 × 0.363) = tanh(2.182) = 0.975. The table is 10 × 4 = 40. Pads: (6 − 2) + 0 + 0 = 4.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Make padding harmless',
      prompt: 'An RNN reads the same sequence padded to 8 and to 16. Run it as given: the final states differ. **Set `masked = True`** and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(0)
E = rng.normal(0, 0.5, (10, 4)); E[0] = 0.0          # id 0 is <pad>; it embeds to zeros
W_x, W_h = rng.normal(0, 0.5, (4, 8)), rng.normal(0, 0.5, (8, 8))

masked = False
def final_state(ids):
    h = np.zeros(8)
    for t in ids:
        if masked and t == 0:
            continue                                 # keep the state on a pad
        h = np.tanh(E[t] @ W_x + h @ W_h)
    return h

seq = [6, 1, 2]                                      # login, deploy, error
change = float(np.abs(final_state(seq + [0] * 5) - final_state(seq + [0] * 13)).max())
print(f"masked = {masked}: the final state moves by {change:.3f} when padded to 16 instead of 8")`,
      probe: ['masked', 'change'],
      evaluate: evaluateMask,
      done: 'A quick test for any sequence model: its prediction for a sequence must not change when you pad it more.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in a masked mean',
      prompt: 'Replace `___` with the mean of the real tokens’ embeddings (id 0 is padding).',
      starter: `import numpy as np

def masked_mean(ids, E):
    """Mean embedding of the tokens in ids, ignoring padding (id 0). E: (V, d) table."""
    ids = ids.astype(int)
    mask = (ids != 0).astype(float)
    return ___`,
      hint: 'Zero out the padded rows with the mask, add up, and divide by the number of real tokens.',
      solution: 'return (E[ids] * mask[:, None]).sum(axis=0) / mask.sum()',
      check: { fn: 'masked_mean', args: ['ids', 'E'], cases: MEAN_CASES, describe: c => `ids = [${c.ids.join(', ')}]`, diagnose: diagnoseMean },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For ids [2, 2] (“error, error”) this returns two identical states: the second step forgot the first. Fix it.',
      starter: `import numpy as np

def rnn_states(ids, E, W_x, W_h):
    """Return the hidden state after each token, shape (T, hidden), starting from h = 0."""
    h = np.zeros(W_h.shape[0])
    states = []
    for t in ids.astype(int):
        h = np.tanh(E[t] @ W_x)
        states.append(h)
    return np.array(states)`,
      hint: 'The recurrence adds the previous state, multiplied by W_h, inside the tanh.',
      solution: 'h = np.tanh(E[t] @ W_x + h @ W_h)',
      check: { fn: 'rnn_states', args: ['ids', 'E', 'W_x', 'W_h'], cases: STATE_CASES, describe: c => `ids = [${c.ids.join(', ')}]`, diagnose: diagnoseStates },
      explainChoice: {
        prompt: 'The same W_x, W_h and b are used at every step. What does that buy?',
        options: [
          { text: 'A fixed number of parameters for any sequence length, and a pattern learned at one position can be recognized at any other — weight sharing across time, as convolutions share across space.', correct: true },
          { text: 'Faster training, because the steps run in parallel.', feedback: 'An RNN’s steps are sequential: step t needs h_{t−1}. That is one reason attention (Lab 26) replaced it.' },
          { text: 'It prevents vanishing gradients.', feedback: 'The opposite: multiplying by the same W_h at every step is what makes gradients vanish or explode.' },
          { text: 'Nothing; it is only a simplification.', feedback: 'Without sharing, the parameter count would grow with the sequence length.' },
        ],
        rightFeedback: 'The same sharing is why the gradient is multiplied by W_h once per step — the source of vanishing and exploding gradients.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a masked RNN',
      prompt: 'Write `masked_rnn` from its contract.',
      starter: `import numpy as np

def masked_rnn(ids, E, W_x, W_h):
    """Run h = tanh(E[t] @ W_x + h @ W_h) over ids from h = 0, but keep h unchanged where ids is 0 (padding).
    Return the final state.

    Example: masked_rnn(np.array([3, 0, 0]), E, W_x, W_h) equals masked_rnn(np.array([3]), E, W_x, W_h):
    the two pads change nothing.
    """
    pass   # replace with your code`,
      hint: 'Loop over ids; continue when t == 0; otherwise update h.',
      solution: 'h = np.zeros(W_h.shape[0])\nfor t in ids.astype(int):\n    if t == 0:\n        continue\n    h = np.tanh(E[t] @ W_x + h @ W_h)\nreturn h',
      check: { fn: 'masked_rnn', args: ['ids', 'E', 'W_x', 'W_h'], cases: MASK_CASES, describe: c => `ids = [${c.ids.join(', ')}]`, diagnose: diagnoseMasked },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New vocabularies, networks and batches. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
