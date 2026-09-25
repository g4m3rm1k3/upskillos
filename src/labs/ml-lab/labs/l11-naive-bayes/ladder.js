import { rng, r3, nearArr, needVars } from '../../kit/ladder.js'

// Lab 11 practice ladder: Laplace-smoothed word probabilities, sums of logs instead of products, and a
// document's log-odds. Expected values computed by hand and with NumPy; tests recompute them.

export const smoothOf = (c, a) => { const t = c.reduce((s, v) => s + v, 0); return c.map(v => (v + a) / (t + a * c.length)) }
export const logOddsOf = (x, c1, c0, prior, a) => { const p1 = smoothOf(c1, a), p0 = smoothOf(c0, a); return Math.log(prior / (1 - prior)) + x.reduce((s, xi, j) => s + xi * (Math.log(p1[j]) - Math.log(p0[j])), 0) }

const SMOOTH_CASES = [{ c: [8, 0, 2], a: 1 }, { c: [0, 0], a: 1 }, { c: [5, 5, 0, 10], a: 0.5 }].map(k => ({ ...k, expected: smoothOf(k.c, k.a) }))
const LO_CASES = [
  { x: [1, 0, 2], c1: [5, 1, 4], c0: [1, 6, 3], prior: 0.5, a: 1 },
  { x: [0, 0], c1: [2, 2], c0: [1, 3], prior: 0.25, a: 1 },                 // no known words: only the prior speaks
  { x: [3, 1], c1: [0, 4], c0: [4, 0], prior: 0.5, a: 0.5 },
  { x: [1, 1, 1, 1], c1: [10, 0, 0, 0], c0: [0, 0, 0, 10], prior: 0.9, a: 1 },
].map(c => ({ ...c, expected: logOddsOf(c.x, c.c1, c.c0, c.prior, c.a) }))

export function diagnoseSmooth(c, got) {
  const v = got.value, t = c.c.reduce((s, x) => s + x, 0)
  if (v && v.some(x => x == null)) return 'Division by zero: with no counts at all, the denominator must still be positive. It is total + α·V.'
  if (v && nearArr(v, c.c.map(x => (x + c.a) / t))) return 'The probabilities no longer sum to 1: α was added to every count, so α·V must be added to the total too.'
  if (v && nearArr(v, c.c.map(x => x / t))) return 'Unsmoothed: a word never seen gets probability 0. Add α to every count.'
  return null
}
export function diagnoseLogOdds(c, got) {
  const v = got.value, noPrior = c.expected - Math.log(c.prior / (1 - c.prior))
  if (Math.abs(v - noPrior) < 1e-9 && Math.abs(noPrior - c.expected) > 1e-9) return 'The prior term log(P(1)/P(0)) is missing.'
  if (Math.abs(v + c.expected) < 1e-9 && c.expected !== 0) return 'Right size, wrong sign: log-odds of class 1 are log P(·|1) − log P(·|0).'
  const unweighted = Math.log(c.prior / (1 - c.prior)) + c.x.reduce((s, xi, j) => s + (xi > 0 ? 1 : 0) * (Math.log(smoothOf(c.c1, c.a)[j]) - Math.log(smoothOf(c.c0, c.a)[j])), 0)
  if (Math.abs(v - unweighted) < 1e-9 && Math.abs(unweighted - c.expected) > 1e-9) return 'Each word counts once per occurrence: multiply its log-ratio by its count x_j.'
  return null
}
export function evaluateLogs(vars) {
  const miss = needVars(vars, ['p', 'score'])
  if (miss) return { passed: false, message: miss }
  const p = vars.p.value, s = Number(vars.score.value), want = p.reduce((a, x) => a + Math.log(x), 0)
  if (s === 0 || vars.score.value == null) return { passed: false, message: 'The product of 300 probabilities of about 0.001 is around 10⁻⁹⁰⁰: it rounds to exactly 0 for every class. Compute `score = np.log(p).sum()` instead.' }
  if (Math.abs(s - want) > 1e-6 * Math.abs(want)) return { passed: false, message: `The log score should be Σ log p ≈ ${r3(want)}.` }
  return { passed: true, message: `Σ log p ≈ ${r3(want)}: an ordinary number. Comparing classes by their log scores gives the same decision as comparing the products — without underflow.` }
}

// ---- Fresh problems ---------------------------------------------------------------------------------
export const TEMPLATES = ['smooth', 'logodds', 'repeat']
const WORDS = ['timeout', 'error', 'deployed', 'backup', 'latency', 'restarted']
export function generate(template, seed) {
  const g = rng(seed * 887 + TEMPLATES.indexOf(template) * 6007 + 17)
  const word = g.pick(WORDS)
  if (template === 'smooth') {
    const count = g.int(0, 12), total = g.pick([100, 150, 200, 250]), V = g.pick([50, 80, 100]), a = g.pick([0.5, 1])
    const answer = (count + a) / (total + a * V)
    return { template, seed, word, count, total, V, a, answer, misconceptions: [{ answer: count / total, feedback: 'Unsmoothed. Add α to the count and α·V to the total.' }, { answer: (count + a) / total, feedback: 'α was added to the count but α·V not to the total, so the probabilities would not sum to 1.' }].filter(m => Math.abs(m.answer - answer) > 1e-5) }
  }
  const prior = g.pick([-0.5, 0, 0.3]), terms = [g.pick([1.2, 0.8, -0.4, 2.0]), g.pick([-1.1, 0.6, 1.5]), g.pick([0.9, -0.3, 0.2])]
  if (template === 'logodds') {
    const z = prior + terms.reduce((s, v) => s + v, 0), answer = 1 / (1 + Math.exp(-z))
    return { template, seed, prior, terms, z, answer, misconceptions: [{ answer: z, feedback: 'That is the log-odds. The probability is σ(log-odds) = 1/(1 + e^(−z)).' }, { answer: 1 / (1 + Math.exp(-(z - prior))), feedback: 'Include the prior term too.' }].filter(m => Math.abs(m.answer - answer) > 0.0006) }
  }
  const k = g.pick([2, 3, 5]), answer = prior + k * terms[0]
  return { template, seed, word, prior, terms, k, answer, misconceptions: [{ answer: prior + terms[0], feedback: `Every copy adds the word’s weight again: ${k} copies add ${k} times ${terms[0]}.` }] }
}
export function view(p) {
  if (p.template === 'smooth') return { intro: `In incident messages “${p.word}” appears ${p.count} times among ${p.total} tokens; the vocabulary has V = ${p.V} words and α = ${p.a}.`, questions: [{ id: 'p', type: 'number', label: `What is the smoothed P(${p.word} | incident)? (Five decimals.)`, answer: p.answer, tolerance: 0.000006, misconceptions: p.misconceptions }] }
  if (p.template === 'logodds') return { intro: `A message’s prior log-odds term is ${p.prior}; its three words contribute ${p.terms.join(', ')}.`, questions: [{ id: 'p', type: 'number', label: 'What is P(incident | words)? (Three decimals.)', answer: p.answer, tolerance: 0.0006, misconceptions: p.misconceptions }] }
  return { intro: `The prior log-odds term is ${p.prior}. The word “${p.word}” contributes ${p.terms[0]} each time it appears.`, questions: [{ id: 'z', type: 'number', label: `What are the log-odds of the message “${Array(p.k).fill(p.word).join(' ')}”?`, answer: p.answer, tolerance: 1e-6, misconceptions: p.misconceptions }] }
}
export function workedSolution(p) {
  if (p.template === 'smooth') return `(${p.count} + ${p.a}) / (${p.total} + ${p.a}×${p.V}) = ${p.count + p.a}/${p.total + p.a * p.V} = **${p.answer.toFixed(5)}**.`
  if (p.template === 'logodds') return `log-odds = ${p.prior} + ${p.terms.join(' + ')} = ${r3(p.z)}; σ(${r3(p.z)}) = **${r3(p.answer)}**.`
  return `${p.prior} + ${p.k} × ${p.terms[0]} = **${r3(p.answer)}**: repeated words are counted as independent evidence every time.`
}

export const nb = {
  title: 'Smoothing and log-odds',
  version: 1,
  templates: TEMPLATES,
  templateNames: { smooth: 'Smoothed probability', logodds: 'Log-odds to probability', repeat: 'Repeated words' },
  generate, view, workedSolution,
  intro: 'Seven steps: smoothed probabilities and a log-odds by hand, logs instead of products, and a document’s log-odds from counts. Nothing here locks the rest of the lab.',
  steps: [
    {
      id: 'trace', kind: 'trace', title: 'One word by hand',
      prompt: '“timeout” appears 8 times among 200 incident tokens and 2 times among 300 routine tokens. V = 100, α = 1, and the two classes are equally common.',
      fields: [
        { label: 'P(timeout | incident) = (8 + 1)/(200 + 100)', answer: 0.03, tolerance: 1e-6 },
        { label: 'P(timeout | routine) = (2 + 1)/(300 + 100)', answer: 0.0075, tolerance: 1e-6 },
        { label: 'Its log-likelihood ratio ln(0.03/0.0075), three decimals', answer: 1.386, tolerance: 0.0006 },
        { label: 'P(incident | “timeout”), three decimals', answer: 0.8, tolerance: 0.0006 },
      ],
      explain: 'The ratio is 4, so its log is ln 4 ≈ 1.386. With equal priors that is the whole log-odds, and σ(1.386) = 4/5 = 0.8.',
    },
    {
      id: 'agree', kind: 'probe', title: 'Logs instead of products',
      prompt: '300 word probabilities of about 0.001. Run it: the product is 0. Then **replace the score line with a sum of logs**, `score = np.log(p).sum()`, and run again.',
      starter: `import numpy as np
rng = np.random.default_rng(0)
p = rng.uniform(0.0005, 0.002, 300)       # one probability per word of a long message
score = np.prod(p)
print("score:", score)`,
      probe: ['p', 'score'],
      evaluate: evaluateLogs,
      done: 'Every Naive Bayes implementation works in log space for this reason; the same trick reappears in softmax and attention.',
    },
    {
      id: 'fill', kind: 'function', title: 'Fill in the smoothing',
      prompt: 'Replace `___` with the Laplace-smoothed probabilities of every vocabulary word.',
      starter: `import numpy as np

def smoothed(counts, alpha):
    """P(word | class) for every word: counts holds each vocabulary word's count in the class."""
    return ___`,
      hint: 'Add α to every count, and α·V (V = number of words) to the total.',
      solution: 'return (counts + alpha) / (counts.sum() + alpha * len(counts))',
      check: { fn: 'smoothed', args: ['c', 'a'], cases: SMOOTH_CASES, describe: c => `counts [${c.c.join(', ')}], α = ${c.a}`, diagnose: diagnoseSmooth },
    },
    {
      id: 'repair', kind: 'function', title: 'Repair a planted bug',
      prompt: 'For counts [8, 0, 2] with α = 1 this returns [0.9, 0.1, 0.3] — which sums to 1.3. Fix it.',
      starter: `import numpy as np

def smoothed(counts, alpha):
    """P(word | class) for every word: counts holds each vocabulary word's count in the class."""
    return (counts + alpha) / counts.sum()`,
      hint: 'α was added to each of the V counts. What must be added to the total?',
      solution: 'return (counts + alpha) / (counts.sum() + alpha * len(counts))',
      check: { fn: 'smoothed', args: ['c', 'a'], cases: SMOOTH_CASES, describe: c => `counts [${c.c.join(', ')}], α = ${c.a}`, diagnose: diagnoseSmooth },
      explainChoice: {
        prompt: 'What else goes wrong without α·V?',
        options: [
          { text: 'The “probabilities” sum to more than 1, and a class with no tokens at all divides by zero — so the model’s scores stop being comparable between classes.', correct: true },
          { text: 'Nothing: only the ranking matters.', feedback: 'Classes with different totals get inflated by different amounts, which changes the ranking too.' },
          { text: 'Unseen words get probability 0.', feedback: 'Adding α to each count already fixes that; the problem is the normalization.' },
          { text: 'α should be subtracted.', feedback: 'α is added to make zero counts positive.' },
        ],
        rightFeedback: 'Adding α to V counts adds α·V to their total: the probabilities sum to 1 again.',
      },
    },
    {
      id: 'implement', kind: 'function', title: 'Write a document’s log-odds',
      prompt: 'Write `log_odds` from its contract.',
      starter: `import numpy as np

def log_odds(x, c1, c0, prior1, alpha):
    """Naive Bayes log-odds of class 1 for a document with word counts x (one entry per vocabulary word).
    c1, c0: each word's count in class-1 and class-0 training text; prior1 = P(class 1); alpha: smoothing.
    Returns log(prior1/(1 − prior1)) + Σ_j x_j·[log P(j | 1) − log P(j | 0)].

    Example: log_odds(np.zeros(2), np.array([2., 2.]), np.array([1., 3.]), 0.25, 1.0)  ->  about −1.0986
    """
    pass   # replace with your code`,
      hint: 'Smooth both classes’ counts, take logs, subtract, weight by x, add the prior term.',
      solution: 'V = len(c1)\np1 = (c1 + alpha) / (c1.sum() + alpha * V)\np0 = (c0 + alpha) / (c0.sum() + alpha * V)\nreturn np.log(prior1 / (1 - prior1)) + np.sum(x * (np.log(p1) - np.log(p0)))',
      check: { fn: 'log_odds', args: ['x', 'c1', 'c0', 'prior', 'a'], cases: LO_CASES, describe: c => `x [${c.x.join(', ')}], prior ${c.prior}, α ${c.a}`, diagnose: diagnoseLogOdds },
    },
    { id: 'transfer', kind: 'transfer', title: 'Solve new problems', prompt: 'New words and messages. Solve one of each kind without opening the worked answer.' },
    { id: 'review', kind: 'review', title: 'Come back later', prompt: 'A fresh problem after a gap. The first return is suggested a day after you finish step 6; “Do it now” is always there and is recorded as early.' },
  ],
}
