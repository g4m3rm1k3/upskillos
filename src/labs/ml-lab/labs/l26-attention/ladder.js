import { rng, r3, needVars } from '../../kit/ladder.js'

// Lab 26 practice ladder: attention by hand, the √d scaling, a causal mask, and scaled dot-product attention.

const sm = z => { const f = z.filter(Number.isFinite), m = Math.max(...f), e = z.map(v => (Number.isFinite(v) ? Math.exp(v - m) : 0)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }
const mm = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((t, v, k) => t + v * B[k][j], 0)))
const T = A => A[0].map((_, j) => A.map(row => row[j]))
export function attentionOf(Q, K, V, { scale = true, causal = false, wrongSide = false } = {}) {
  const s = scale ? Math.sqrt(Q[0].length) : 1
  const S = mm(Q, T(K)).map((row, i) => row.map((v, j) => ((causal && (wrongSide ? j < i : j > i)) ? -Infinity : v / s)))
  return mm(S.map(sm), V)
}
export const scoresOf = (Q, K) => mm(Q, T(K)).map(row => row.map(v => v / Math.sqrt(Q[0].length)))

const Q1 = [[1, 0], [0, 1], [1, 1]], K1 = [[1, 0], [0, 1], [1, -1]], V1 = [[1, 2], [3, 4], [5, 6]]
const SCORE_CASES = [
  { Q: Q1, K: K1 },
  { Q: [[2, 0, 0, 0]], K: [[1, 1, 1, 1], [2, 0, 0, 0]] },
  { Q: [[1, 2, 3, 4]], K: [[0, 0, 0, 1]] },
  { Q: [[0.5], [-1]], K: [[2], [4], [-2]] },
].map(c => ({ ...c, expected: scoresOf(c.Q, c.K) }))
export const CAUSAL_CASES = [
  { Q: Q1, K: K1, V: V1 },
  { Q: [[1, 0], [1, 0]], K: [[1, 0], [0, 1]], V: [[10], [20]] },
  { Q: [[0, 1], [1, 1], [2, 0], [0, 0]], K: [[1, 1], [0, 2], [1, 0], [3, 1]], V: [[1, 0], [0, 1], [1, 1], [2, 2]] },
  { Q: [[1]], K: [[5]], V: [[7, 8]] },
].map(c => ({ ...c, expected: attentionOf(c.Q, c.K, c.V, { causal: true }) }))
export const ATT_CASES = [
  { Q: Q1, K: K1, V: V1 },
  { Q: [[1, 0, 0, 0]], K: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]], V: [[10], [20], [30]] },
  { Q: [[2, 1], [0, -1]], K: [[1, 1], [-1, 2]], V: [[1, 0, 1], [0, 2, 0]] },
  { Q: [[0, 0]], K: [[3, 1], [1, 3]], V: [[4], [8]] },
].map(c => ({ ...c, expected: attentionOf(c.Q, c.K, c.V) }))

const near = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => (Array.isArray(b[i]) ? near(v, b[i]) : v != null && Math.abs(v - b[i]) < 1e-9))
export function diagnoseScores(c, got) {
  if (near(got.value, mm(c.Q, T(c.K))) && c.Q[0].length > 1) return 'Unscaled: divide the dot products by √d, where d is the width of q and k.'
  if (near(got.value, mm(c.Q, T(c.K)).map(row => row.map(v => v / c.Q[0].length))) && c.Q[0].length > 1) return 'That divides by d. The scaling is by √d.'
  return null
}
export function diagnoseCausal(c, got) {
  const wrong = attentionOf(c.Q, c.K, c.V, { causal: true, wrongSide: true })
  if (near(got.value, wrong) && !near(wrong, c.expected)) return 'The mask hides the earlier tokens and keeps the later ones: it must hide j > i, the entries above the diagonal (np.triu with k = 1).'
  const none = attentionOf(c.Q, c.K, c.V)
  if (near(got.value, none) && !near(none, c.expected)) return 'Nothing is masked: every token still reads the tokens after it.'
  return null
}
export function diagnoseAttention(c, got) {
  const unscaled = attentionOf(c.Q, c.K, c.V, { scale: false })
  if (near(got.value, unscaled) && !near(unscaled, c.expected)) return 'Divide the scores by √d before the softmax.'
  const colSoft = (() => { const S = scoresOf(c.Q, c.K), W = T(T(S).map(sm)); return mm(W, c.V) })()
  if (near(got.value, colSoft) && !near(colSoft, c.expected)) return 'The softmax ran down each column. Each query’s row of weights must sum to 1: softmax along axis 1.'
  return null
}
export function evaluateScale(vars) {
  const miss = needVars(vars, ['scaled', 'entropy', 'largest'])
  if (miss) return { passed: false, message: miss }
  const H = Number(vars.entropy.value)
  if (!Number(vars.scaled.value)) return { passed: false, message: `Unscaled at d = 256: mean row entropy ${r3(H)} against ${r3(Math.log(16))} for uniform weights, and the largest weight averages ${r3(vars.largest.value)}. Each row has collapsed onto one token. Set \`scaled = True\` and run again.` }
  return { passed: true, message: `Scaled: entropy ${r3(H)}, largest weight ${r3(vars.largest.value)}. The rows are spread again, so gradients reach every token.` }
}

// ---------- Fresh problems ----------
export const TEMPLATES = ['weights2', 'masked', 'scale']
export function generate(template, seed) {
  const g = rng(seed * 397 + TEMPLATES.indexOf(template) * 2029 + 79)
  if (template === 'weights2') {
    const s1 = g.int(-3, 3), s2 = g.int(-3, 3)
    if (s1 === s2) return generate(template, seed + 1000)
    const answer = sm([s1, s2])[0]
    return { template, seed, s1, s2, answer, misconceptions: [{ answer: 1 - answer, feedback: 'That is the second key’s weight.' }, { answer: Math.abs(s1) / (Math.abs(s1) + Math.abs(s2)), feedback: 'Softmax divides exponentials, not the scores themselves.' }].filter(m => Number.isFinite(m.answer) && Math.abs(m.answer - answer) > 0.0006) }
  }
  if (template === 'masked') {
    const n = g.int(3, 12), answer = (n * (n - 1)) / 2
    return { template, seed, n, answer, misconceptions: [{ answer: (n * (n + 1)) / 2, feedback: 'The diagonal is not masked: a token may attend to itself.' }, { answer: n * n - n, feedback: 'Only the entries above the diagonal: half of the off-diagonal ones.' }].filter(m => m.answer !== answer) }
  }
  const d = g.pick([4, 9, 16, 36, 64, 100, 144, 256]), answer = Math.sqrt(d)
  return { template, seed, d, answer, misconceptions: [{ answer: d, feedback: 'Scaled attention divides by √d, not d.' }] }
}
export function view(p) {
  if (p.template === 'weights2') return { intro: `A query scores ${p.s1} against key 1 and ${p.s2} against key 2.`, questions: [{ id: 'w', type: 'number', label: 'What attention weight does key 1 get? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  if (p.template === 'masked') return { intro: `A causal mask over a sequence of ${p.n} tokens.`, questions: [{ id: 'm', type: 'number', label: `How many of the ${p.n * p.n} scores are set to −∞?`, answer: p.answer, misconceptions: p.misconceptions }] }
  return { intro: `Queries and keys have width d = ${p.d}.`, questions: [{ id: 's', type: 'number', label: 'By what number does scaled dot-product attention divide the raw scores?', answer: p.answer, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'weights2') return `e^${p.s1} / (e^${p.s1} + e^${p.s2}) = 1/(1 + e^(${p.s2} − ${p.s1})) = **${r3(p.answer)}**.`
  if (p.template === 'masked') return `Entries above the diagonal: ${p.n}(${p.n} − 1)/2 = **${p.answer}**.`
  return `√${p.d} = **${p.answer}**.`
}

export const attn = {
  title: 'Attention by hand and in code',
  version: 1,
  templates: TEMPLATES,
  templateNames: { weights2: 'Weights for two keys', masked: 'A causal mask', scale: 'The √d scale' },
  generate, view, workedSolution,
  intro: 'Seven steps: attention by hand, why the scores are scaled, and writing the scaled scores, a causal mask and full attention. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'Attention by hand',
      prompt: 'A query q = (1, 0), keys (1, 0) and (0, 1), values 4 and 8, no scaling. Then: the same scores divided by 2 (what scaling does when d = 4), a causal mask over 5 tokens, and d = 384 split into 6 heads.',
      fields: [
        { label: 'Weight on the first key (three decimals)', answer: Math.exp(1) / (Math.exp(1) + 1), tolerance: 0.0006 },
        { label: 'Output (three decimals)', answer: 4 + 4 / (Math.exp(1) + 1), tolerance: 0.0006 },
        { label: 'Weight on the first key when the scores are divided by 2 (three decimals)', answer: 1 / (1 + Math.exp(-0.5)), tolerance: 0.0006 },
        { label: 'Masked entries in a 5-token causal mask', answer: 10 },
        { label: 'Width of each head', answer: 64 },
      ],
      explain: 'Scores q·k = (1, 0); softmax gives e/(e + 1) = 0.731 and 0.269; output 0.731 × 4 + 0.269 × 8 = 5.076. Divided by 2 the scores are (0.5, 0): the weights soften to 0.622 and 0.378. The mask hides 4 + 3 + 2 + 1 = 10 entries. 384/6 = 64.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Scale the scores',
      prompt: 'Random queries and keys of width d = 256 for 16 tokens. Run it unscaled, then **set `scaled = True`** and run again. Predict first: how spread out are the weights in each case?',
      starter: `import numpy as np
rng = np.random.default_rng(0)
T, d = 16, 256
Q, K = rng.normal(size=(T, d)), rng.normal(size=(T, d))
scaled = False
S = Q @ K.T / (np.sqrt(d) if scaled else 1.0)
W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
entropy = float(np.mean(-np.sum(W * np.log(W + 1e-30), axis=1)))
largest = float(W.max(axis=1).mean())
print(f"scaled = {scaled}: mean row entropy {entropy:.2f} (uniform: {np.log(T):.2f}), average largest weight {largest:.2f}")`,
      probe: ['scaled', 'entropy', 'largest'],
      evaluate: evaluateScale,
      done: 'The same reason initial weights are scaled by fan-in (Lab 21): keep sums of many products near unit size.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the scaled scores',
      prompt: 'Replace `___` with the scaled dot-product scores.',
      starter: `import numpy as np

def scaled_scores(Q, K):
    """Q: (T_q, d), K: (T_k, d). Return the (T_q, T_k) scores before the softmax."""
    d = Q.shape[1]
    return ___`,
      hint: 'Every query against every key is Q @ K.T; then divide by √d.',
      solution: 'return Q @ K.T / np.sqrt(d)',
      check: { fn: 'scaled_scores', args: ['Q', 'K'], cases: SCORE_CASES, describe: c => `Q ${c.Q.length}×${c.Q[0].length}, K ${c.K.length}×${c.K[0].length}`, diagnose: diagnoseScores },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'This “causal” attention lets the first token read the tokens after it and hides the ones before. Fix it.',
      starter: `import numpy as np

def causal_attention(Q, K, V):
    """softmax(Q K^T / sqrt(d)) V, where token i may attend only to tokens 0..i."""
    T, d = Q.shape
    S = Q @ K.T / np.sqrt(d)
    S[np.tril(np.ones((T, T), bool), k=-1)] = -np.inf
    W = np.exp(S - S.max(axis=1, keepdims=True)); W /= W.sum(axis=1, keepdims=True)
    return W @ V`,
      hint: 'The positions to hide are the later ones, j > i: above the diagonal.',
      solution: 'S[np.triu(np.ones((T, T), bool), k=1)] = -np.inf',
      check: { fn: 'causal_attention', args: ['Q', 'K', 'V'], cases: CAUSAL_CASES, describe: c => `${c.Q.length} tokens`, diagnose: diagnoseCausal },
      explainChoice: {
        prompt: 'How could a test catch this bug without knowing the right outputs?',
        options: [
          { text: 'Change only the last token and check that every earlier output is unchanged. With the bug, the first token’s output moves.', correct: true },
          { text: 'Check that every row of weights sums to 1.', feedback: 'The buggy version’s rows also sum to 1; the wrong entries are masked.' },
          { text: 'Check the output shape.', feedback: 'The shape is the same either way.' },
          { text: 'Check that the loss goes down during training.', feedback: 'A model that can see the future trains very well — that is the danger.' },
        ],
        rightFeedback: 'A property test like this needs no reference answer, and it catches leaks of the future in any sequence model.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write scaled dot-product attention',
      prompt: 'Write `attention` from its contract.',
      starter: `import numpy as np

def attention(Q, K, V):
    """softmax(Q K^T / sqrt(d)) V, with the softmax over each query's row. Q: (T_q, d), K: (T_k, d), V: (T_k, d_v).

    Example: attention(np.array([[0., 0.]]), np.array([[3., 1.], [1., 3.]]), np.array([[4.], [8.]]))  ->  array([[6.]])
    """
    pass   # replace with your code`,
      hint: 'Scores as in step 3; subtract each row’s maximum, exponentiate, divide by the row sum; multiply by V.',
      solution: 'S = Q @ K.T / np.sqrt(Q.shape[1])\nW = np.exp(S - S.max(axis=1, keepdims=True))\nW /= W.sum(axis=1, keepdims=True)\nreturn W @ V',
      check: { fn: 'attention', args: ['Q', 'K', 'V'], cases: ATT_CASES, describe: c => `${c.Q.length} queries, ${c.K.length} keys`, diagnose: diagnoseAttention },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New scores, masks and widths. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
