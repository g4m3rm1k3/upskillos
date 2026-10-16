// Lesson order for Lab 44: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l44-mc': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 04 and 41–43", body: [
      "Lab 41: a posterior is p(θ | D) ∝ p(D | θ) p(θ). Its normaliser, the evidence p(D), is an integral that usually can't be computed. Lab 43's ELBO is a lower bound on log p(D).",
      "Lab 04: an average of S independent draws has variance σ²/S, so its error shrinks like 1/√S."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'A Monte Carlo estimate has standard error 0.2 with 400 samples. How many samples give standard error 0.05?', answer: 6400, explain: 'The error scales as 1/√S: a quarter of the error needs 16 times the samples, 400 × 16 = 6,400.' } },
    { p: 4 },
    { math: true },
  ],
  'l44-importance': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Four samples have normalized weights 0.7, 0.1, 0.1 and 0.1. What is the ESS, 1/Σw²? (Two decimals.)', answer: 1.92, tolerance: 0.005, explain: '1/(0.49 + 0.01 + 0.01 + 0.01) = 1/0.52 = 1.92: four samples, worth about two.' } },
    { p: 2 },
    { figure: 'ImportanceFig', caption: 'The two-mode target and a Gaussian proposal, with the importance-sampling estimate from 1,000 draws. Move the proposal.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l44-mcmc': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'The current log-density is −2.0 and the proposal’s is −2.7. What is the acceptance probability? (Three decimals.)', answer: 0.497, tolerance: 0.001, explain: 'min(1, e^(−2.7 + 2.0)) = e^(−0.7) = 0.497.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l44-diagnostics': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A chain of 3,000 draws has autocorrelations summing to 7. What is its effective sample size?', answer: 200, explain: '3,000 / (1 + 2 × 7) = 3,000/15 = 200.' } },
    { p: 3 },
    { figure: 'TraceFig', caption: 'Traces of four Metropolis chains from dispersed starts, with R̂ and each chain’s ESS. Change the target and the step size.' },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l44-vi': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Mean-field VI on a bivariate normal with unit variances and correlation 0.8. What variance does each factor get?', answer: 0.36, tolerance: 0.001, explain: '1 − 0.8² = 0.36: a standard deviation of 0.6 where the truth is 1 — VI is confidently narrow.' } },
    { p: 4 },
    { math: true },
    { ladder: 'sampling' },
  ],
}
