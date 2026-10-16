// Lesson order for Lab 43: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l43-mixtures': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 17, 40 and 41", body: [
      "Lab 17: k-means assigns each point to its nearest centre, then moves each centre to the mean of its points, and repeats.",
      "Lab 40: one class's data can be modelled as a Gaussian fitted by maximum likelihood (the mean and covariance of its points), and Bayes' rule turns class densities into P(class | x)."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'Two components with weights 0.5 and 0.5. At a point, the component densities are 0.3 and 0.1. What is the responsibility of the first? (Two decimals.)', answer: 0.75, tolerance: 0.005, explain: '0.5 × 0.3 / (0.5 × 0.3 + 0.5 × 0.1) = 0.15/0.2 = 0.75.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l43-em': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'EmSteps', caption: 'EM step by step: points coloured by their most likely component, unsure points drawn small, means drawn large. Move the iteration.' },
    { predict: { prompt: 'A component has responsibilities 1, 0.5 and 0.5 for points 0, 4 and 10. What is its updated mean?', answer: 3.5, tolerance: 0.001, explain: '(1 × 0 + 0.5 × 4 + 0.5 × 10)/(1 + 0.5 + 0.5) = 7/2 = 3.5.' } },
    { p: 3 }, { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l43-why': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { figure: 'RestartCurves', caption: 'The log-likelihood of five EM starts on the playground’s parallel clusters.' },
    { predict: { prompt: 'log p(x) = −250 and the ELBO for some q is −262. What is KL(q ‖ posterior)?', answer: 12, explain: '−250 − (−262) = 12: the gap between the log-likelihood and the bound is exactly the KL divergence.' } },
    { p: 4 },
    { math: true },
  ],
  'l43-kmeans': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { p: 2 },
    { predict: { prompt: 'A one-dimensional component sits exactly on a data point with σ = 0.01. What is its density at that point, 1/√(2πσ²)? (Nearest whole number.)', answer: 40, tolerance: 0.5, explain: '1/(0.01 × √(2π)) = 1/0.02507 ≈ 39.9: shrink σ tenfold and the density grows tenfold, without limit.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l43-choose': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A full-covariance mixture in d = 2 dimensions with K = 3 components. How many parameters?', answer: 17, explain: '(3 − 1) + 3 × 2 + 3 × 3 = 2 + 6 + 9 = 17.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'em' },
  ],
}
