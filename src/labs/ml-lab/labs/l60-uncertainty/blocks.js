// Lesson order for Lab 60: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l60-kinds': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 05, 13, 21, 41 and 42", body: [
      "Lab 05: maximum likelihood with Gaussian noise is least squares. Labs 41–42: Bayesian linear regression and Gaussian processes give a predictive variance as well as a mean.",
      "Lab 13: bagging trains many models on bootstrap resamples and averages them; where they disagree is a sign of uncertainty. Lab 21: the networks used as ensemble members here."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 }, { p: 4 },
    { predict: { prompt: 'Two ensemble members predict means 1 and 3 with variances 0.2 and 0.3. What is the mixture’s total variance?', answer: 1.25, tolerance: 1e-9, explain: 'Aleatoric: (0.2 + 0.3)/2 = 0.25. Epistemic: the variance of 1 and 3 about their mean 2 is 1. Total 1.25.' } },
    { cell: 0 },
    { p: 5 },
    { math: true },
  ],
  'l60-quantile': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'With τ = 0.9, a point lies 2 units above the predicted quantile. What is its pinball loss?', answer: 1.8, tolerance: 1e-9, explain: 'τ × 2 = 1.8, nine times the 0.2 charged for a point 2 units below: the curve is pushed up.' } },
    { figure: 'PinballFig', caption: 'The mean pinball loss of 400 standard-normal points as a constant prediction q moves.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l60-conformal': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'With 99 calibration scores and α = 0.2, which rank (counting from the smallest) is the conformal quantile?', answer: 80, explain: '⌈(99 + 1) × 0.8⌉ = 80.' , misconceptions: [{ answer: 79, feedback: 'Use n + 1 = 100, not n = 99: ⌈100 × 0.8⌉ = 80.' }] } },
    { figure: 'RankFig', caption: 'The coverage guarantee of split conformal prediction as the calibration set grows.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
  ],
  'l60-adaptive': [
    { p: 0 },
    { figure: 'BinCoverage', caption: 'Coverage of the playground’s 90% conformal intervals in each range of x, for three scores.' },
    { p: 1 },
    { predict: { prompt: 'With a normalized score, μ(x) = 5, σ(x) = 0.5 and q = 1.6. What is the upper end of the interval?', answer: 5.8, tolerance: 1e-9, explain: 'μ + q·σ = 5 + 1.6 × 0.5 = 5.8.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
  ],
  'l60-sets': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'With q = 0.6, how many labels are in the set for class probabilities (0.45, 0.4, 0.15)?', answer: 2, explain: 'Keep every class with p ≥ 1 − q = 0.4: the first two.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
    { ladder: 'uncertainty' },
  ],
}
