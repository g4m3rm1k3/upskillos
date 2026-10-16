// Lesson order for Lab 42: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l42-functions': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 18, 40 and 41", body: [
      "Lab 41: Bayesian linear regression keeps a Gaussian posterior over the weights, with mean m and covariance S, and its predictions carry an uncertainty that grows away from the data.",
      "A multivariate Gaussian N(μ, Σ) is described by a mean vector and a covariance matrix; entry (i, j) of Σ is how much coordinates i and j vary together (Labs 18 and 40)."
    ] } }, { p: 1 },
    { predict: { prompt: 'f(x) = w·x with w ~ N(0, 1/α) and α = 2. What is Var[f(3)] = k(3, 3)?', answer: 4.5, explain: '3 × 3 / 2 = 4.5: the linear kernel’s variance grows with |x| — lines fan out from the origin.' } },
    { cell: 0 },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l42-kernels': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'RBF kernel with ℓ = 0.2. What is the correlation between f(0) and f(0.4)? (Three decimals.)', answer: 0.135, tolerance: 0.001, explain: 'Distance 0.4 = 2ℓ: exp(−4/2) = e^(−2) ≈ 0.135.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l42-regression': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'GpPosterior', caption: 'The GP posterior mean and ±2 sd with the playground’s observations (none between 0.45 and 0.7). Add observations and change the noise.' },
    { cell: 0 },
    { predict: { prompt: 'One observation with σn² = 1 and kernel value k = 0.5 to x* (prior variance 1). What is the posterior variance at x*?', answer: 0.875, tolerance: 0.001, explain: '1 − 0.5²/(1 + 1) = 1 − 0.125 = 0.875: one noisy, weakly related observation explains little.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l42-hyper': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'LmlScan', caption: 'Log marginal likelihood over the length-scale grid for the playground’s data. Change the noise level.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l42-uses': [
    { p: 0 },
    { predict: { prompt: 'At a candidate point the GP mean is 0.4 and the sd 0.3. What is the upper confidence bound μ + 2σ?', answer: 1, tolerance: 0.001, explain: '0.4 + 2 × 0.3 = 1.0: a point with modest mean but large uncertainty can beat a well-known good one.' } },
    { p: 1 }, { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'gp' },
  ],
}
