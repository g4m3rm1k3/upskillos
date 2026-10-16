// Lesson order for Lab 45: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l45-bn': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Lab 04 and Labs 40–44", body: [
      "Conditional probability (Lab 04): P(A | B) = P(A ∩ B) / P(B). Rearranged, P(A ∩ B) = P(A | B) P(B), and it chains: p(a, b, c) = p(a) p(b | a) p(c | a, b).",
      "Independence means P(A ∩ B) = P(A) P(B). This lab draws which variables depend on which as a graph."
    ] } }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A network over 5 binary variables: one root, and four nodes each with one binary parent. How many table entries does it need?', answer: 9, explain: '1 + 4 × 2 = 9, against 2⁵ − 1 = 31 for the full joint.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l45-dsep': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { figure: 'ExplainAway', caption: 'Exact posteriors of the two causes in the CI network. Tick the evidence you have.' },
    { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l45-hmm': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Brute force sums over Kᵀ state sequences. For K = 3 states and T = 20 minutes, how many is that? (Enter it rounded to the nearest billion, in billions.)', answer: 3, tolerance: 0.5, explain: '3²⁰ ≈ 3.49 billion sequences, against T·K² = 180 steps for the forward algorithm.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l45-decode': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'HmmStrip', caption: 'P(Down) for the playground’s server over 100 minutes: filtered as it happens, smoothed afterwards. Change how strongly states persist.' },
    { cell: 0 },
    { predict: { prompt: 'Filtering gets 251 of 300 states right and smoothing 262. By how many percentage points is smoothing better? (One decimal.)', answer: 3.7, tolerance: 0.05, explain: '(262 − 251)/300 = 11/300 = 3.7 points — the value of hindsight on this run.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l45-learn': [
    { p: 0 },
    { predict: { prompt: 'An incident log shows state Degraded 50 times (not counting the last minute), followed by Degraded 44 times. With no pseudo-counts, what is A(Degraded → Degraded)?', answer: 0.88, tolerance: 0.001, explain: '44/50 = 0.88: maximum likelihood by counting.' } },
    { p: 1 }, { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'hmm' },
  ],
}
