// Lesson order for Lab 41: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l41-update': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 04, 05, 39 and 40", body: [
      "Bayes' rule (Lab 04): posterior ∝ likelihood × prior. Maximum likelihood (Lab 05) keeps only the single parameter that makes the data most probable: 7 heads in 10 flips gives p̂ = 0.7.",
      "This lab keeps the whole posterior instead of one number."
    ] } }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Prior Beta(3, 1); you observe 2 heads and 4 tails. The posterior is Beta(A, B). What is A + B?', answer: 10, explain: 'Beta(3 + 2, 1 + 4) = Beta(5, 5): A + B = 10, and the posterior mean is exactly 0.5.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l41-summaries': [
    { p: 0 }, { p: 1 },
    { figure: 'BetaUpdate', caption: 'Prior and posterior for a coin with P(heads) = 0.8. Change the prior and the number of flips seen.' },
    { p: 2 }, { p: 3 },
    { predict: { prompt: 'Uniform prior; 0 successes in 4 trials. What is the posterior-predictive probability that the next trial succeeds? (Three decimals.)', answer: 0.167, tolerance: 0.001, explain: '(0 + 1)/(4 + 2) = 1/6 ≈ 0.167 — not the 0 that maximum likelihood gives.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l41-map': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Noise standard deviation 1, prior standard deviation 0.5. What ridge λ = σ²/τ² does this prior correspond to?', answer: 4, explain: '1 / 0.25 = 4: a prior that expects weights small compared with the noise gives a strong penalty.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l41-blr': [
    { p: 0 }, { p: 1 },
    { figure: 'PredictiveBand', caption: 'Predictive mean and ±2 standard deviations for the sine data with Gaussian basis functions. Add observations one by one.' },
    { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Noise standard deviation 0.25; at some input the weight uncertainty adds variance 0.09. What is the predictive standard deviation? (Three decimals.)', answer: 0.391, tolerance: 0.001, explain: 'Add variances, not standard deviations: √(0.25² + 0.09) = √0.1525 = 0.391.', misconceptions: [{ answer: 0.55, feedback: 'Standard deviations do not add. Add the variances (0.0625 + 0.09), then take the square root.' }] } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l41-evidence': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: '8 heads in 8 flips. Evidence under a fair coin is 1/256; under a uniform prior on the bias it is 1/9. What is the Bayes factor for a biased coin? (One decimal.)', answer: 28.4, tolerance: 0.05, explain: '(1/9)/(1/256) = 256/9 = 28.4: strong evidence, though less than the 93.1 of 10 heads in 10.' } },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'bayes' },
  ],
}
